import {CLOUD_ENDPOINT,CloudHistory,mergeCloudRecords} from '../cloud-history.js?v=0.15.0';
import {emptyState,mergeStates,validateState} from '../core.js?v=0.15.0';
import {renderAnswerDrawing} from '../drawing.js?v=0.15.0';
import {VERIFY_TOPICS,validRun,verificationStates,equalData,stateDigest} from './sample-data.js';
const $=id=>document.getElementById(id),clients=new Map(),loaded=new Map();
let tokenClient,busy=false,activeRun='',authorization=null;
const receipt={format:'learning-cloud-verification-v1',browser:navigator.userAgent,startedAt:new Date().toISOString(),steps:[],productionReadbacks:[]};
$('run').value=new URLSearchParams(location.search).get('run')||'';
function show(message){$('status').textContent=message;}
function output(){ $('results').textContent=JSON.stringify(receipt,null,2); }
function controls(){const connected=!!authorization;for(const id of ['write','restore','return','baseline','disconnect'])$(id).disabled=busy||!connected;$('connect').disabled=busy||!tokenClient;$('run').disabled=busy||connected;$('snapshot').disabled=busy||!loaded.has($('topic').value);}
function assert(condition,message){if(!condition)throw Error(message);}
function client(topic,test=true){
 const key=topic+':'+test;if(clients.has(key))return clients.get(key);
 const fetcher=(url,options)=>{const u=new URL(url);if(test)u.searchParams.set('space','verification');return fetch(u,options);};
 const c=new CloudHistory({endpoint:CLOUD_ENDPOINT,topicId:topic,fetcher});
 if(authorization)c.setToken(authorization.token,Math.max(0,(authorization.expires-Date.now())/1000));clients.set(key,c);return c;
}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function listAll(c){const files=[];let cursor;do{const page=await c.list(cursor);files.push(...page.files);cursor=page.nextPageToken;assert(files.length<=500,'驗證最多讀取 500 份版本，請先縮小範圍。');}while(cursor);return files;}
async function productionReadback(label){
 const rows=[];for(const topic of VERIFY_TOPICS){const c=client(topic,false);for(const f of await listAll(c)){const state=await c.read(f.id);rows.push({topic,id:f.id,records:state.records.length,drafts:Object.keys(state.drafts).length,sha256:await stateDigest(state)});}}
 rows.sort((a,b)=>a.id.localeCompare(b.id));receipt.productionReadbacks.push({label,at:new Date().toISOString(),files:rows});output();return rows;
}
async function versions(topic){
 const c=client(topic),expected=verificationStates(topic,activeRun),hashes=await Promise.all(expected.map(stateDigest)),found=new Map();
 for(const f of await listAll(c)){if(f.recordCount<1||f.recordCount>3)continue;const state=await c.read(f.id),hash=await stateDigest(state),index=hashes.indexOf(hash);if(index>=0)found.set(index,{id:f.id,state,sha256:hash});}
 return {c,expected,found};
}
function note(name,topic,data={}){receipt.steps.push({name,topic,pass:true,at:new Date().toISOString(),...data});output();}
function preview(){const topic=$('topic').value,state=loaded.get(topic);$('preview').replaceChildren();if(state)$('preview').append(renderAnswerDrawing(state.records[1].drawing));$('sandbox').href='../?sandbox=1&topic='+topic+'&v=0.15.0#backup';controls();}
async function action(name,job){
 if(busy)return;busy=true;controls();show('正在'+name+'，請保持本頁開啟…');
 try{assert(validRun(activeRun),'請先填寫有效批次並連接 Google。');await job();show(name+'完成；詳細結果見下方收據。');}
 catch(e){receipt.steps.push({name,pass:false,at:new Date().toISOString(),error:e.message});output();show('未通過：'+e.message);}
 finally{busy=false;controls();}
}
$('write').onclick=()=>action('A 寫入兩版',async()=>{
 const before=await productionReadback('A-before');
 for(const topic of VERIFY_TOPICS){const c=client(topic),[first,second]=verificationStates(topic,activeRun),a=await c.backup(first),b=await c.backup(second),again=await c.backup(second);assert(a.id!==b.id,'不同版本意外合併');assert(again.duplicate&&again.id===b.id,'相同備份未去重');const old=await c.read(a.id),newer=await c.read(b.id);assert(equalData(old,first)&&equalData(newer,second),'寫入後讀回內容不一致');loaded.set(topic,newer);note('A-write-read-deduplicate',topic,{firstId:a.id,secondId:b.id,firstHash:await stateDigest(old),secondHash:await stateDigest(newer),records:newer.records.length,draftCount:Object.keys(newer.drafts).length,shapeCount:newer.records[1].drawing.sheets.workspace.length});}
 assert(equalData(before,await productionReadback('A-after')),'正式歷史在驗證期間有變更，需人工核對');preview();
});
$('restore').onclick=()=>action('B 還原並回存',async()=>{
 const before=await productionReadback('B-before');
 for(const topic of VERIFY_TOPICS){const {c,expected,found}=await versions(topic);assert(found.has(0)&&found.has(1),'尚未找到 A 的兩份版本：'+topic);const second=found.get(1).state;assert(equalData(found.get(0).state,expected[0])&&equalData(second,expected[1]),'歷史或新版內容不一致');
  const local=emptyState(topic);local.drafts['2']={...structuredClone(expected[0].drafts['2']),reasoning:'B 端原有草稿，必須保留'};
  const merged=mergeCloudRecords(local,second);assert(equalData(merged.drafts,local.drafts)&&equalData(merged.records,second.records),'合併改動目的端草稿或作答');
  const full=mergeStates(emptyState(topic),second);assert(equalData(full,second)&&equalData(mergeStates(full,second),full),'完整還原或重複匯入不一致');
  const bad=structuredClone(second);bad.records[0].reasoning+='衝突';let refused=false;try{mergeStates(full,bad);}catch{refused=true;}assert(refused&&equalData(full,second),'歷史衝突未阻擋');
  const wrongDraft=structuredClone(second);wrongDraft.drafts['2'].reasoning+='衝突';refused=false;try{mergeStates(full,wrongDraft);}catch{refused=true;}assert(refused,'草稿衝突未阻擋');
  const back=await c.backup(expected[2]);assert(equalData(await c.read(back.id),expected[2]),'B 端回存不一致');
  let isolated=false;try{await client(topic,false).read(found.get(1).id);}catch(e){isolated=e.message.includes('不是本帳戶');}assert(isolated,'正式空間意外讀到測試版本');
  loaded.set(topic,second);note('B-restore-return',topic,{firstId:found.get(0).id,secondId:found.get(1).id,returnId:back.id,sha256:await stateDigest(second),checks:['全部欄位相同','舊版仍保留','非空圖解','數值首答與提示','多選及排序','完整草稿還原','合併保留目的端草稿','重複匯入去重','歷史衝突拒絕','草稿衝突拒絕','正式空間隔離']});
 }
 assert(equalData(before,await productionReadback('B-after')),'正式歷史在驗證期間有變更，需人工核對');preview();
});
$('return').onclick=()=>action('A 回讀第三版',async()=>{for(const topic of VERIFY_TOPICS){const {expected,found}=await versions(topic);assert(found.has(2)&&equalData(found.get(2).state,expected[2]),'尚未找到 B 回存內容：'+topic);assert(found.has(0)&&found.has(1),'舊版本遺失');loaded.set(topic,found.get(1).state);note('A-return-read',topic,{id:found.get(2).id,sha256:found.get(2).sha256,historyVersions:3});}await productionReadback('A-final');preview();});
$('baseline').onclick=()=>action('正式歷史唯讀核對',async()=>{await productionReadback('manual');});
$('receipt').onclick=()=>download({...receipt,run:activeRun||$('run').value,exportedAt:new Date().toISOString()},'cloud-verification-'+(activeRun||'unconnected')+'.json');
$('snapshot').onclick=()=>{const topic=$('topic').value,state=loaded.get(topic);if(state)download(state,'verification-'+activeRun+'-'+topic+'.json');};
$('topic').onchange=preview;
$('compare').onchange=async e=>{try{const file=e.target.files[0];assert(file&&file.size<=4*1024*1024,'請選擇最多 4 MB 的驗證匯出檔');const topic=$('topic').value,state=validateState(JSON.parse(await file.text()),topic),expected=loaded.get(topic);assert(expected,'請先完成本批次讀回');const originalRecords=expected.records;for(const r of originalRecords)assert(equalData(state.records.find(x=>x.id===r.id),r),'平台再次匯出後原始作答不同');for(const [day,d] of Object.entries(expected.drafts))assert(equalData(state.drafts[day],d),'平台再次匯出後原始草稿不同');note('platform-export-match',topic,{file:file.name,sourceHash:await stateDigest(expected),recordsMatched:originalRecords.length});$('compare-result').textContent='通過：原始作答、圖解、提示與草稿全部一致。';}catch(e){$('compare-result').textContent='未通過：'+e.message;}};
$('disconnect').onclick=()=>{for(const c of clients.values())c.disconnect();clients.clear();authorization=null;controls();show('已中斷本頁連線，雲端驗證版本保留。');};
$('connect').onclick=()=>{if(!validRun($('run').value)){show('批次請使用 6～36 個英文字母、數字或連字號。');return;}activeRun=$('run').value;receipt.run=activeRun;tokenClient.requestAccessToken({prompt:'select_account'});};
async function init(){
 const r=await fetch(CLOUD_ENDPOINT+'/config?space=verification',{cache:'no-store',credentials:'omit'});const config=await r.json();assert(r.ok&&config.ready&&config.verificationSpace===true&&config.storageSpace==='verification','服務尚未支援隔離驗證；已停止，不會寫入正式空間');
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>reject(Error('Google 登入元件未載入'));document.head.append(script);});
 tokenClient=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:'openid email https://www.googleapis.com/auth/drive.file',include_granted_scopes:false,error_callback:()=>show('Google 登入視窗未完成，請重試。'),callback:async response=>{
  if(response.error){show('Google 授權未完成。');return;}authorization={token:response.access_token,expires:Date.now()+response.expires_in*1000};clients.clear();
  try{const session=await client(VERIFY_TOPICS[0]).session();assert(/^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]+$/.test(session.folderUrl),'資料夾網址無效');$('folder').href=session.folderUrl;$('folder').hidden=false;receipt.folderUrl=session.folderUrl;show('私人驗證空間已連接，可開始測試。');}catch(e){authorization=null;show('無法連接：'+e.message);}controls();
 }});controls();show('隔離服務已就緒，請連接 Google。');
}
preview();init().catch(e=>show(e.message));


import {CLOUD_ENDPOINT,CloudHistory,mergeCloudRecords} from '../cloud-history.js?v=0.15.0';
import {emptyState,mergeStates,validateState} from '../core.js?v=0.15.0';
import {renderAnswerDrawing} from '../drawing.js?v=0.15.0';
import {VERIFY_TOPICS,verificationStates,equalData,stateDigest} from './sample-data.js';
import {newReceipt,validateReceipt,receiptProgress,validRun,RECEIPT_DEVICES} from './receipt-model.js?v=20261020-2';
const $=id=>document.getElementById(id),clients=new Map(),loaded=new Map();
const names={'structural-analysis':'結構學','reinforced-concrete':'鋼筋混凝土','steel-structures':'鋼結構','structural-dynamics':'耐震設計及結構動力','soil-foundations':'土壤力學及大地工程'};
const query=new URLSearchParams(location.search);
$('run').value=query.get('run')||'';
$('device').value=RECEIPT_DEVICES.includes(query.get('device'))?query.get('device'):'desktop';
let receipt=null,tokenClient,busy=false,activeRun='',authorization=null,currentAction=null,currentTopic=null;
let sessionReady=false;
let syncState='pending',lastSaved='',lastReceiptId='',saveQueue=Promise.resolve(),pendingSaves=0,localWarning='';
const now=()=>new Date().toISOString(),uid=()=>crypto.randomUUID();
const safeError=e=>String(e.message||e).replace(/Bearer\s+\S+|(?:access|refresh)_token\S*|[A-Z]:[\\/][^\s]*/gi,'（憑證或路徑已隱去）').replace(/[\u0000-\u001f]/g,' ').slice(0,800);
const key=()=>`learning-lab:verification:${$('run').value}:${$('device').value}:receipt:v2`;
const assert=(ok,message)=>{if(!ok)throw Error(message);};
function show(message){$('status').textContent=message;}
function persist(){if(!receipt)return;receipt.updatedAt=now();try{localStorage.setItem(key(),JSON.stringify(validateReceipt(receipt)));localWarning='';}catch{localWarning='本機暫存未完成，請保持本頁開啟並確認收據已雲存。';}}
function restoreLocal(){
 receipt=null;lastSaved='';lastReceiptId='';syncState='pending';loaded.clear();
 if(validRun($('run').value)){try{const raw=localStorage.getItem(key());if(raw){const r=validateReceipt(JSON.parse(raw));assert(r.run===$('run').value&&r.device===$('device').value,'暫存批次不符');receipt=r;for(const a of receipt.actions)if(a.status==='running'){a.status='interrupted';a.finishedAt=now();a.error='上次分頁中斷，尚未完成，請重試此階段。';}}}catch{localWarning='上次暫存無法讀取，請保留下載收據並使用新批次。';}}
 output();
}
function controls(){
 const connected=!!authorization&&sessionReady&&Date.now()<authorization.expires,locked=busy||pendingSaves>0;
 for(const id of ['write','restore','return','baseline','disconnect','receipt-list'])$(id).disabled=locked||!connected;
 $('connect').disabled=locked||!tokenClient;$('run').disabled=locked||connected;$('device').disabled=locked||connected;
 $('snapshot').disabled=locked||!loaded.has($('topic').value);$('compare').disabled=locked||!connected||!loaded.has($('topic').value);
 $('receipt-retry').disabled=locked||!connected||!receipt;
}
function output(){
 const progress=receipt?receiptProgress(receipt):{restored:[],compared:[],restoreComplete:false,compareComplete:false,deviceComplete:false};
 $('results').textContent=receipt?JSON.stringify(receipt,null,2):'尚未連接；進度會在連接後自動存入私人 Drive。';
 $('stage-connect').textContent=authorization&&Date.now()>=authorization.expires?'Google 連線已過期，請重新連接':sessionReady?'已連接 Google':authorization?'正在確認私人空間':'待連接 Google';
 $('stage-restore').textContent=progress.restoreComplete?'完成：五科已還原並回存':`尚未完成：雲端回存 ${progress.restored.length}/5 科`;
 $('stage-compare').textContent=progress.compareComplete?'完成：五科匯入及再匯出一致':`尚未完成：平台匯入核對 ${progress.compared.length}/5 科`;
 const current=receipt?JSON.stringify(receipt):'';
 const saved=syncState==='saved'&&lastSaved===current;
 $('stage-receipt').textContent=saved?'收據已保存至私人 Drive':syncState==='saving'?'正在保存收據…':syncState==='failed'?'尚未雲存成功：請按「重試保存收據」':'收據有進度待保存';
 $('completion').textContent=!authorization&&receipt?'已恢復本機測試進度；請重新連接 Google 確認雲端收據。':progress.deviceComplete&&saved?'本裝置操作完成，收據已雲存；待教練從電腦回讀驗收。':progress.deviceComplete?'五科核對完成，但收據尚未雲存，請補存後再離開。':progress.restoreComplete?'雲端回存完成；請繼續逐科匯入核對，尚未全部完成。':'請依序完成連接、雲端回存及五科匯入核對。';
 $('completion').className=progress.deviceComplete&&saved?'success':'notice';
 $('local-status').textContent=localWarning;
 $('receipt-link').hidden=!lastReceiptId;if(lastReceiptId)$('receipt-link').href='https://drive.google.com/file/d/'+lastReceiptId+'/view';
 $('topic-progress').replaceChildren();
 for(const topic of VERIFY_TOPICS){const li=document.createElement('li');li.textContent=names[topic]+'：雲端回存 '+(progress.restored.includes(topic)?'已完成':'待完成')+'；匯入核對 '+(progress.compared.includes(topic)?'已完成':'待完成');$('topic-progress').append(li);}
 controls();
}
function client(topic,test=true){const k=topic+':'+test;if(clients.has(k))return clients.get(k);const fetcher=(url,options)=>{const u=new URL(url);if(test)u.searchParams.set('space','verification');return fetch(u,options);};const c=new CloudHistory({endpoint:CLOUD_ENDPOINT,topicId:topic,fetcher});if(authorization)c.setToken(authorization.token,Math.max(0,(authorization.expires-Date.now())/1000));clients.set(k,c);return c;}
async function saveReceipt(){
 if(!receipt||!authorization){syncState='pending';output();return false;}
 const snapshot=structuredClone(validateReceipt(receipt)),serialized=JSON.stringify(snapshot);
 if(serialized===lastSaved){syncState='saved';output();return true;}
 pendingSaves++;syncState='saving';output();
 const job=saveQueue.catch(()=>{}).then(async()=>{try{
  const c=client(VERIFY_TOPICS[0]),path='/verification-receipts?run='+encodeURIComponent(snapshot.run);
  const saved=await c.request(path,{method:'POST',data:snapshot});
  assert(saved.sha256===await stateDigest(snapshot),'收據保存雜湊不一致');
  const back=await c.request('/verification-receipts/'+saved.id+'?run='+encodeURIComponent(snapshot.run));
  assert(equalData(validateReceipt(back),snapshot),'收據保存後讀回不一致');
  lastSaved=serialized;lastReceiptId=saved.id;$('sync-error').textContent='';syncState=JSON.stringify(receipt)===serialized?'saved':'pending';return true;
 }catch(e){syncState='failed';if(receipt.syncErrors.length<50)receipt.syncErrors.push({at:now(),error:safeError(e)});else localWarning='已保留前 50 次保存失敗，請另存本機收據並使用新批次。';persist();$('sync-error').textContent='收據尚未雲存成功：'+safeError(e);return false;}finally{pendingSaves--;output();}});
 saveQueue=job;return job;
}
async function checkpoint(){persist();output();return saveReceipt();}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function listAll(c){const files=[];let cursor;do{const page=await c.list(cursor);files.push(...page.files);cursor=page.nextPageToken;assert(files.length<=500,'驗證最多讀取 500 份版本，請先縮小範圍。');}while(cursor);return files;}
async function productionReadback(label){const rows=[];for(const topic of VERIFY_TOPICS){const c=client(topic,false);for(const f of await listAll(c)){const state=await c.read(f.id);rows.push({topic,id:f.id,records:state.records.length,drafts:Object.keys(state.drafts).length,sha256:await stateDigest(state)});}}rows.sort((a,b)=>a.id.localeCompare(b.id));receipt.productionReadbacks.push({label,at:now(),files:rows});persist();output();return rows;}
async function versions(topic){const c=client(topic),expected=verificationStates(topic,activeRun),hashes=await Promise.all(expected.map(stateDigest)),found=new Map();for(const f of await listAll(c)){if(f.recordCount<1||f.recordCount>3)continue;const state=await c.read(f.id),hash=await stateDigest(state),index=hashes.indexOf(hash);if(index>=0)found.set(index,{id:f.id,state,sha256:hash});}return {c,expected,found};}
async function note(name,topic,data={}){receipt.steps.push({eventId:uid(),name,topic,pass:true,at:now(),...(currentAction?{actionId:currentAction.id}:{}),...data});await checkpoint();}
function preview(){const topic=$('topic').value,state=loaded.get(topic);$('preview').replaceChildren();if(state)$('preview').append(renderAnswerDrawing(state.records[1].drawing));$('sandbox').href='../?sandbox=1&topic='+topic+'&v=0.15.0#backup';controls();}
async function action(name,label,job){
 if(busy||!authorization||!receipt)return;busy=true;currentTopic=null;currentAction={id:uid(),name,status:'running',startedAt:now()};receipt.actions.push(currentAction);show('正在'+label+'，請保持分頁開啟…');await checkpoint();
 try{assert(validRun(activeRun),'批次無效');await job();currentAction.status='completed';show(label+'完成。請查看各階段狀態，確認收據已雲存。');}
 catch(e){currentAction.status='failed';currentAction.error=safeError(e);const step={write:'A-write-read-deduplicate',restore:'B-restore-return',return:'A-return-read'}[name];if(step&&currentTopic)receipt.steps.push({eventId:uid(),name:step,topic:currentTopic,pass:false,at:now(),actionId:currentAction.id,error:safeError(e)});show('此階段尚未完成：'+safeError(e));}
 finally{currentAction.finishedAt=now();currentAction=null;currentTopic=null;await checkpoint();busy=false;preview();output();}
}
$('write').onclick=()=>action('write','準備兩份測試版本',async()=>{
 const before=await productionReadback('A-before');
 for(const topic of VERIFY_TOPICS){currentTopic=topic;const c=client(topic),[first,second]=verificationStates(topic,activeRun),a=await c.backup(first),b=await c.backup(second),again=await c.backup(second);assert(a.id!==b.id,'不同版本意外合併');assert(again.duplicate&&again.id===b.id,'相同備份未去重');const old=await c.read(a.id),newer=await c.read(b.id);assert(equalData(old,first)&&equalData(newer,second),'寫入後讀回不一致');loaded.set(topic,newer);await note('A-write-read-deduplicate',topic,{firstId:a.id,secondId:b.id,firstHash:await stateDigest(old),secondHash:await stateDigest(newer),records:newer.records.length,draftCount:Object.keys(newer.drafts).length,shapeCount:newer.records[1].drawing.sheets.workspace.length});}
 assert(equalData(before,await productionReadback('A-after')),'正式歷史在驗證期間有變更，需人工核對');
});
$('restore').onclick=()=>action('restore','雲端還原並回存',async()=>{
 const before=await productionReadback('B-before');
 for(const topic of VERIFY_TOPICS){currentTopic=topic;show('正在核對'+names[topic]+'並回存…');const {c,expected,found}=await versions(topic);assert(found.has(0)&&found.has(1),'尚未找到電腦準備的兩份版本：'+names[topic]);const second=found.get(1).state;assert(equalData(found.get(0).state,expected[0])&&equalData(second,expected[1]),'歷史或新版內容不一致');
  const local=emptyState(topic);local.drafts['2']={...structuredClone(expected[0].drafts['2']),reasoning:'B 端原有草稿，必須保留'};
  const merged=mergeCloudRecords(local,second);assert(equalData(merged.drafts,local.drafts)&&equalData(merged.records,second.records),'合併改動目的端草稿或作答');
  const full=mergeStates(emptyState(topic),second);assert(equalData(full,second)&&equalData(mergeStates(full,second),full),'完整還原或重複匯入不一致');
  const bad=structuredClone(second);bad.records[0].reasoning+='衝突';let refused=false;try{mergeStates(full,bad);}catch{refused=true;}assert(refused&&equalData(full,second),'歷史衝突未阻擋');
  const wrongDraft=structuredClone(second);wrongDraft.drafts['2'].reasoning+='衝突';refused=false;try{mergeStates(full,wrongDraft);}catch{refused=true;}assert(refused,'草稿衝突未阻擋');
  const back=await c.backup(expected[2]);assert(equalData(await c.read(back.id),expected[2]),'回存不一致');
  let isolated=false;try{await client(topic,false).read(found.get(1).id);}catch(e){isolated=e.message.includes('不是本帳戶');}assert(isolated,'正式空間意外讀到測試版本');
  loaded.set(topic,second);await note('B-restore-return',topic,{firstId:found.get(0).id,secondId:found.get(1).id,returnId:back.id,sha256:await stateDigest(second),checks:['全部欄位相同','舊版仍保留','非空圖解','數值首答與提示','多選及排序','完整草稿還原','合併保留目的端草稿','重複匯入去重','歷史衝突拒絕','草稿衝突拒絕','正式空間隔離']});
 }
 assert(equalData(before,await productionReadback('B-after')),'正式歷史在驗證期間有變更，需人工核對');
});
$('return').onclick=()=>action('return','電腦回讀第三版',async()=>{for(const topic of VERIFY_TOPICS){currentTopic=topic;const {expected,found}=await versions(topic);assert(found.has(2)&&equalData(found.get(2).state,expected[2]),'尚未找到裝置回存內容：'+names[topic]);assert(found.has(0)&&found.has(1),'舊版本遺失');loaded.set(topic,found.get(1).state);await note('A-return-read',topic,{fileId:found.get(2).id,sha256:found.get(2).sha256,historyVersions:3});}await productionReadback('A-final');});
$('baseline').onclick=()=>action('baseline','正式歷史唯讀核對',()=>productionReadback('manual'));
$('receipt').onclick=()=>{if(receipt)download({...receipt,exportedAt:now()},'cloud-verification-'+receipt.run+'.json');};
$('receipt-retry').onclick=()=>saveReceipt();
$('receipt-list').onclick=async()=>{try{const data=await client(VERIFY_TOPICS[0]).request('/verification-receipts?run='+activeRun);$('receipt-history').replaceChildren();for(const f of data.files){const p=document.createElement('p'),a=document.createElement('a');a.href='https://drive.google.com/file/d/'+f.id+'/view';a.target='_blank';a.rel='noopener';a.textContent=`${f.createdTime} · ${f.device} · 回存 ${f.restored}/5 · 匯入核對 ${f.compared}/5`;p.append(a);$('receipt-history').append(p);}if(!data.files.length)$('receipt-history').textContent='這個批次尚無雲端收據。';}catch(e){$('receipt-history').textContent=safeError(e);}};
$('snapshot').onclick=()=>{const topic=$('topic').value,state=loaded.get(topic);if(state)download(state,'verification-'+activeRun+'-'+topic+'.json');};
$('topic').onchange=preview;
$('compare').onchange=async e=>{
 if(busy||!receipt)return;busy=true;output();const topic=$('topic').value;
 try{const file=e.target.files[0];assert(file&&file.size<=4*1024*1024,'請選擇最多 4 MB 的驗證匯出檔');const state=validateState(JSON.parse(await file.text()),topic),expected=loaded.get(topic);assert(expected,'請先完成本批次讀回');for(const r of expected.records)assert(equalData(state.records.find(x=>x.id===r.id),r),'平台再次匯出後原始作答不同');for(const [day,d] of Object.entries(expected.drafts))assert(equalData(state.drafts[day],d),'平台再次匯出後原始草稿不同');await note('platform-export-match',topic,{sourceHash:await stateDigest(expected),recordsMatched:expected.records.length});$('compare-result').textContent='通過：原始作答、圖解、提示與草稿全部一致。';}
 catch(err){receipt.steps.push({eventId:uid(),name:'platform-export-match',topic,pass:false,at:now(),error:safeError(err)});$('compare-result').textContent='此科尚未通過：'+safeError(err);await checkpoint();}
 finally{e.target.value='';busy=false;output();}
};
$('disconnect').onclick=()=>{for(const c of clients.values())c.disconnect();clients.clear();authorization=null;sessionReady=false;show('已中斷連線；進度及雲端收據保留。');output();};
$('run').onchange=restoreLocal;$('device').onchange=restoreLocal;
$('connect').onclick=()=>{if(!validRun($('run').value)){show('批次請使用 6～36 個英文字母、數字或連字號。');return;}activeRun=$('run').value;if(!receipt)receipt=newReceipt({run:activeRun,device:$('device').value,browser:navigator.userAgent.slice(0,1000),sessionId:uid(),now:now()});tokenClient.requestAccessToken({prompt:'select_account'});};
async function init(){
 const r=await fetch(CLOUD_ENDPOINT+'/config?space=verification',{cache:'no-store',credentials:'omit'}),config=await r.json();assert(r.ok&&config.ready&&config.verificationSpace===true&&config.storageSpace==='verification'&&config.receiptVersions?.includes(2),'服務尚未支援新版私人收據；已停止，請稍後重新開啟');
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>reject(Error('Google 登入元件未載入'));document.head.append(script);});
 tokenClient=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:'openid email https://www.googleapis.com/auth/drive.file',include_granted_scopes:false,error_callback:()=>show('Google 登入視窗未完成，請重試。'),callback:async response=>{
  if(response.error){show('Google 授權未完成。');return;}busy=true;sessionReady=false;authorization={token:response.access_token,expires:Date.now()+response.expires_in*1000};clients.clear();output();
  try{const session=await client(VERIFY_TOPICS[0]).session();assert(/^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]+$/.test(session.folderUrl),'資料夾網址無效');$('folder').href=session.folderUrl;$('folder').hidden=false;sessionReady=true;
   const p=receiptProgress(receipt);if(p.restoreComplete){const action=[...receipt.actions].reverse().find(a=>a.name==='restore');for(const topic of VERIFY_TOPICS){const s=receipt.steps.find(s=>s.name==='B-restore-return'&&s.topic===topic&&s.actionId===action.id&&s.pass);const data=await client(topic).read(s.secondId);assert(await stateDigest(data)===s.sha256,'上次讀回版本已不同');loaded.set(topic,data);}}
   await checkpoint();show('Google 已連接；請依各階段提示繼續。');
  }catch(e){show('連接或接續尚未完成：'+safeError(e));}finally{busy=false;preview();output();}
 }});output();show('私人收據服務已就緒，請連接 Google。');
}
restoreLocal();preview();init().catch(e=>show(safeError(e)));

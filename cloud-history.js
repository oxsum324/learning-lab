import {validateState,mergeStates} from './core.js?v=0.11.0';

// Public service address only. Access tokens never enter localStorage or exports.
export const CLOUD_ENDPOINT='https://learning-lab-history.oxsum324-learning.workers.dev';
export function mergeCloudRecords(local,remote){
 validateState(remote,local.topicId);
 return mergeStates(local,{schemaVersion:1,topicId:remote.topicId,records:remote.records,drafts:{}});
}
export class CloudHistory {
 constructor({endpoint,topicId,fetcher=(...args)=>fetch(...args)}){this.endpoint=endpoint;this.topicId=topicId;this.fetcher=fetcher;this.token=null;this.expires=0;this.generation=0;this.queue=Promise.resolve();}
 connected(){return !!this.token&&Date.now()<this.expires;}
 setToken(token,seconds){this.generation++;this.token=token;this.expires=Date.now()+Math.max(0,Number(seconds)-60)*1000;}
 disconnect(){this.generation++;this.token=null;this.expires=0;}
 async request(path,{method='GET',data}={}){
  if(!this.connected()){this.disconnect();throw Error('Google 尚未連線或授權已過期，請重新連接；紀錄仍在本機。');}
  const generation=this.generation;
  const response=await this.fetcher(this.endpoint+path,{method,headers:{Authorization:'Bearer '+this.token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(60000)});
  const result=await response.json();
  if(generation!==this.generation)throw Error('Google 連線已變更，請重試。');
  if(!response.ok){if(response.status===401)this.disconnect();throw Error(result.error||'雲端存取失敗，請稍後重試。');}return result;
 }
 async session(){return this.request('/session',{method:'POST'});}
 backup(state){
  const snapshot=structuredClone(validateState(state,this.topicId)),generation=this.generation;
  const job=this.queue.catch(()=>{}).then(async()=>{
   if(generation!==this.generation)throw Error('連線已中斷；請重新連接後備份本機紀錄。');
   if(new TextEncoder().encode(JSON.stringify(snapshot)).length>4*1024*1024)throw Error('雲端單份備份上限 4 MB，請先匯出完整 JSON。');
   return this.request('/snapshots?topic='+this.topicId,{method:'POST',data:snapshot});
  });
  this.queue=job;return job;
 }
 list(cursor){return this.request('/snapshots?topic='+this.topicId+(cursor?'&cursor='+encodeURIComponent(cursor):''));}
 async read(id){if(!/^[A-Za-z0-9_-]{1,200}$/.test(id))throw Error('備份編號無效。');return validateState(await this.request('/snapshots/'+id+'?topic='+this.topicId),this.topicId);}
}

export function mountCloudHistory({topicId,sandbox,getState,onMerge,download}){
 const $=id=>document.getElementById(id),client=new CloudHistory({endpoint:CLOUD_ENDPOINT,topicId});
 let tokenClient,folderUrl='',cursor=null,latestState='',pending=0,revision=0;
 const status=(text,bad=false)=>{for(const id of ['cloud-status','cloud-indicator']){$(id).textContent=text;$(id).classList.toggle('warning',bad);}};
 const controls=()=>{const connected=client.connected();$('cloud-backup').disabled=!connected;$('cloud-list').disabled=!connected;$('cloud-disconnect').hidden=!client.token;$('cloud-connect').disabled=!tokenClient;$('cloud-connect').textContent=client.token?'重新連接 Google':'連接 Google';};
 function error(e){status(e instanceof TypeError||e.name==='TimeoutError'?'雲端連線失敗，請稍後重試；本機紀錄仍保留。':e.message||'雲端連線失敗，請稍後重試；本機紀錄仍保留。',true);controls();}
 async function backup(){
  const snapshot=structuredClone(getState()),savedRevision=revision;pending++;status('雲端備份中，請保持本頁開啟…');
  try{await client.backup(snapshot);latestState=JSON.stringify(snapshot);status('雲端歷史已保存 · '+new Date().toLocaleTimeString('zh-TW')+(savedRevision!==revision?'；其後的本機變更尚未備份。':''));}
  catch(e){error(e);}finally{pending--;controls();}
 }
 async function history(append=false){
  try{const page=await client.list(append?cursor:null);if(!append)$('cloud-history-list').replaceChildren();
   for(const file of page.files){
    const row=document.createElement('article');row.className='cloud-history-item';const label=document.createElement('p');label.textContent=`${new Date(file.createdTime).toLocaleString('zh-TW')} · ${file.recordCount} 筆作答 · ${file.draftCount} 份草稿`;
    const merge=document.createElement('button');merge.className='secondary';merge.textContent='合併作答';merge.onclick=async()=>{merge.disabled=true;try{const remote=await client.read(file.id);await onMerge(remote);status('已合併雲端作答；目前草稿保留不變。');}catch(e){error(e);}finally{merge.disabled=false;}};
    const save=document.createElement('button');save.className='secondary';save.textContent='下載完整版本';save.onclick=async()=>{save.disabled=true;try{const remote=await client.read(file.id);download(JSON.stringify(remote,null,2),`learning-lab-${topicId}-${file.id}.json`);status('完整版本已交給瀏覽器下載，包含當時草稿。');}catch(e){error(e);}finally{save.disabled=false;}};
    row.append(label,merge,save);$('cloud-history-list').append(row);
   }
   cursor=page.nextPageToken;$('cloud-more').hidden=!cursor;if(!append&&!page.files.length)$('cloud-history-list').textContent='這一科尚無雲端歷史。';
  }catch(e){error(e);}
 }
 $('cloud-backup').onclick=backup;$('cloud-list').onclick=()=>history();$('cloud-more').onclick=()=>history(true);
 $('cloud-disconnect').onclick=()=>{client.disconnect();folderUrl='';$('cloud-folder').hidden=true;$('cloud-history-list').replaceChildren();$('cloud-more').hidden=true;controls();status('已中斷本頁連線；雲端歷史保留，後續作答只存本機。');};
 $('cloud-connect').onclick=()=>tokenClient?.requestAccessToken({prompt:'select_account'});
 window.addEventListener('beforeunload',e=>{if(pending){e.preventDefault();e.returnValue='';}});
 if(sandbox){status('功能測試空間不連接私人雲端。');$('cloud-connect').disabled=true;return {changed(){},submitted(){}};}
 async function init(){
  if(!CLOUD_ENDPOINT){status('雲端功能設定中；目前紀錄仍只存瀏覽器。');return;}
  const response=await fetch(CLOUD_ENDPOINT+'/config',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('雲端服務暫時無法連接。');
  const config=await response.json();if(!config.ready){status('後端已連接，尚待 Google 登入設定；紀錄仍只存瀏覽器。');return;}
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=()=>reject(Error('Google 登入元件未載入，請重新整理。'));document.head.append(script);});
  tokenClient=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:'openid email https://www.googleapis.com/auth/drive.file',include_granted_scopes:false,error_callback:()=>status('Google 登入視窗未完成，請重試。',true),callback:async response=>{
   if(response.error){status('未完成 Google 授權，紀錄仍在本機。',true);return;}
   client.setToken(response.access_token,response.expires_in);controls();status('正在確認私人資料夾…');
   try{const session=await client.session();folderUrl=session.folderUrl;if(!/^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]+$/.test(folderUrl))throw Error('雲端資料夾網址無效。');$('cloud-folder').href=folderUrl;$('cloud-folder').hidden=false;controls();status('私人雲端已連接。按「備份目前紀錄」上傳既有資料；之後提交作答會自動備份。');await history();}catch(e){client.disconnect();error(e);}
  }});controls();status('尚未連接 Google，紀錄仍只存瀏覽器。');
 }
 init().catch(error);
 return {
  changed(){revision++;if(client.token&&!pending&&JSON.stringify(getState())!==latestState)status(client.connected()?'本機有新變更；提交作答時自動備份，也可立即手動備份。':'Google 授權已過期；本機新變更尚未備份，請重新連接。');controls();},
  submitted(){if(client.connected())void backup();else status('本次作答已留在本機；連接 Google 後可備份全部紀錄。');}
 };
}

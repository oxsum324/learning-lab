import {validateState} from '../site/core.js';
import {TOPICS} from '../site/topics.js';

const DRIVE='https://www.googleapis.com/drive/v3';
export const MAX_BYTES=4*1024*1024;
const APP='learning-lab-history-v1';
class Failure extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new Failure(status,message);};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function limitedText(response,limit=MAX_BYTES){
 if(Number(response.headers.get('content-length'))>limit)fail(413,'雲端單份備份上限為 4 MB，請先匯出本機 JSON。');
 const reader=response.body?.getReader();if(!reader)return '';
 const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();fail(413,'雲端單份備份上限為 4 MB，請先匯出本機 JSON。');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return new TextDecoder().decode(bytes);
}
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
const prop=(key,value)=>`appProperties has { key='${key}' and value='${value}' }`;
export function assertPrivate(file){
 if(file.trashed||!file.ownedByMe||!Array.isArray(file.permissions)||file.permissions.length!==1||file.permissions[0].type!=='user'||file.permissions[0].role!=='owner')fail(409,'雲端資料夾或檔案已有分享權限，已停止存取。請在 Google Drive 改回限制存取。');
}

export function createWorker(net=fetch){
 async function auth(request,env){
  if(!env.GOOGLE_CLIENT_ID||!env.ALLOWED_EMAIL)fail(503,'Google 登入尚待管理者設定，紀錄仍保留於本機。');
  const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9._~-]{10,4096})$/)?.[1];
  if(!token)fail(401,'請先連接 Google。');
  // Google's endpoint validates expiry, audience and scope. Never log this URL or token.
  const r=await net('https://oauth2.googleapis.com/tokeninfo?access_token='+encodeURIComponent(token),{signal:AbortSignal.timeout(15000)});
  if(!r.ok)fail(401,'Google 授權已失效，請重新連接。');
  const info=await r.json();
  if(info.aud!==env.GOOGLE_CLIENT_ID||Number(info.expires_in)<=0||!/^\d{1,100}$/.test(info.sub??''))fail(401,'Google 授權無效，請重新連接。');
  if(![true,'true'].includes(info.email_verified)||info.email?.toLowerCase()!==env.ALLOWED_EMAIL.toLowerCase())fail(403,'請使用管理者設定的 Google 帳戶。');
  if(!info.scope?.split(' ').includes('https://www.googleapis.com/auth/drive.file'))fail(403,'尚未授權學習紀錄的檔案存取。');
  return {token,sub:info.sub};
 }
 async function api(user,path,options={}){
  const r=await net(DRIVE+path,{...options,headers:{...options.headers,Authorization:'Bearer '+user.token},signal:AbortSignal.timeout(25000)});
  if(!r.ok){if(r.status===401)fail(401,'Google 授權已失效，請重新連接。');if(r.status===403)fail(403,'Google Drive 拒絕存取，請確認 Drive API 已啟用、授權與儲存空間。');if(r.status===404)fail(404,'找不到雲端檔案，可能已移動或刪除。');fail(502,'Google Drive 暫時無法完成，請稍後重試；本機紀錄仍保留。');}
  return r;
 }
 async function list(user,q,fields,pageToken,orderBy){
  const p=new URLSearchParams({q,spaces:'drive',pageSize:'100',fields:'nextPageToken,files('+fields+')'});
  if(pageToken)p.set('pageToken',pageToken);if(orderBy)p.set('orderBy',orderBy);
  return (await api(user,'/files?'+p)).json();
 }
 async function metadata(user,id){return (await api(user,'/files/'+id+'?fields=id,name,mimeType,parents,ownedByMe,trashed,permissions(type,role),appProperties,size,createdTime')).json();}
 async function folders(user,create=false){
  const q=`trashed=false and 'me' in owners and mimeType='application/vnd.google-apps.folder' and ${prop('app',APP)} and ${prop('owner',user.sub)}`;
  const found=await list(user,q,'id',null,'createdTime');
  if(found.nextPageToken||found.files.length>10)fail(409,'學習資料夾數量異常，請由管理者檢查。');
  let items=await Promise.all(found.files.map(f=>metadata(user,f.id)));
  if(!items.length&&create){
   // No parents: create under My Drive, never inside the publicly shared folder.
   const f=await (await api(user,'/files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Learning Lab 私人學習歷史',mimeType:'application/vnd.google-apps.folder',appProperties:{app:APP,owner:user.sub}})})).json();
   items=[await metadata(user,f.id)];
  }
  for(const f of items)assertPrivate(f);return items;
 }
 const topic=url=>{const id=url.searchParams.get('topic');if(!Object.hasOwn(TOPICS,id??''))fail(400,'學習主題無效。');return id;};
 function belongs(file,user,folderIds,topicId){
  assertPrivate(file);
  if(file.mimeType!=='application/json'||file.appProperties?.app!==APP||file.appProperties?.owner!==user.sub||file.appProperties?.topic!==topicId||!file.parents?.some(p=>folderIds.includes(p)))fail(403,'這不是本帳戶與主題的學習備份。');
 }
 async function handle(request,env){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/config')return json({ready:!!(env.GOOGLE_CLIENT_ID&&env.ALLOWED_EMAIL),clientId:env.GOOGLE_CLIENT_ID||'',maxBytes:MAX_BYTES});
  if(!['GET','POST'].includes(request.method))fail(405,'不支援此操作。');
  const user=await auth(request,env);
  if(url.pathname==='/session'&&request.method==='POST'){
   const fs=await folders(user,true);return json({folderUrl:'https://drive.google.com/drive/folders/'+fs[0].id});
  }
  if(url.pathname==='/snapshots'){
   const topicId=topic(url),fs=await folders(user,request.method==='POST'),folderIds=fs.map(f=>f.id);
   if(!fs.length)return json({files:[],nextPageToken:null});
   const parentQuery='('+folderIds.map(id=>`'${id}' in parents`).join(' or ')+')';
   const q=`trashed=false and 'me' in owners and ${parentQuery} and ${prop('app',APP)} and ${prop('owner',user.sub)} and ${prop('topic',topicId)}`;
   if(request.method==='GET'){
    const cursor=url.searchParams.get('cursor');if(cursor&&cursor.length>2048)fail(400,'分頁參數無效。');
    const data=await list(user,q,'id,name,createdTime,size,appProperties',cursor,'createdTime desc');
    return json({files:data.files.map(f=>({id:f.id,createdTime:f.createdTime,recordCount:Number(f.appProperties?.recordCount)||0,draftCount:Number(f.appProperties?.draftCount)||0})),nextPageToken:data.nextPageToken??null});
   }
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'請使用 JSON 備份。');
   let state;try{state=JSON.parse(await limitedText(request));validateState(state,topicId);}catch(e){if(e instanceof Failure)throw e;fail(400,'備份格式或作答內容無效。');}
   const content=JSON.stringify({schemaVersion:1,topicId,records:state.records,drafts:state.drafts}),hash=await digest(content);
   const existing=await list(user,q+' and '+prop('sha256',hash),'id');
   if(existing.files.length){const f=await metadata(user,existing.files[0].id);belongs(f,user,folderIds,topicId);const saved=await limitedText(await api(user,'/files/'+f.id+'?alt=media'));if(await digest(saved)!==hash)fail(409,'既有雲端版本已被修改，未視為備份成功；請保留原檔供檢查。');return json({id:f.id,duplicate:true});}
   const file={name:`${topicId}-${new Date().toISOString().replaceAll(':','-')}.json`,mimeType:'application/json',parents:[fs[0].id],appProperties:{app:APP,owner:user.sub,topic:topicId,sha256:hash,recordCount:String(state.records.length),draftCount:String(Object.keys(state.drafts).length)}};
   const boundary='learning_'+crypto.randomUUID();
   const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(file)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
   const r=await net('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'multipart/related; boundary='+boundary},body,signal:AbortSignal.timeout(30000)});
   if(!r.ok)fail(r.status===401?401:502,'雲端備份尚未確認成功，請重新連接或重試；本機紀錄仍保留。');
   const result=await r.json();const meta=await metadata(user,result.id);belongs(meta,user,folderIds,topicId);
   return json({id:result.id,duplicate:false},201);
  }
  const match=url.pathname.match(/^\/snapshots\/([a-zA-Z0-9_-]{1,200})$/);
  if(match&&request.method==='GET'){
   const topicId=topic(url),fs=await folders(user),file=await metadata(user,match[1]);belongs(file,user,fs.map(f=>f.id),topicId);
   if(Number(file.size)>MAX_BYTES)fail(413,'這份雲端備份超過上限，請從 Google Drive 下載。');
   const content=await limitedText(await api(user,'/files/'+match[1]+'?alt=media'));
   if(await digest(content)!==file.appProperties.sha256)fail(409,'雲端檔案已被修改，未載入；請保留原檔供檢查。');
   let state;try{state=validateState(JSON.parse(content),topicId);}catch{fail(409,'雲端備份內容無效，未載入。');}return json(state);
  }
  fail(404,'找不到此功能。');
 }
 return {async fetch(request,env){
  const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'https://oxsum324.github.io').split(',');
  if(origin&&!allowed.includes(origin))return json({error:'不允許的網站來源。'},403);
  let response;
  try{response=request.method==='OPTIONS'?new Response(null,{status:204}):await handle(request,env);}catch(e){response=json({error:e instanceof Failure?e.message:'連線暫時失敗，請稍後重試；本機紀錄仍保留。'},e instanceof Failure?e.status:502);}
  if(origin){response.headers.set('Access-Control-Allow-Origin',origin);response.headers.set('Vary','Origin');}
  response.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');response.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');return response;
 }};
}
export default createWorker();

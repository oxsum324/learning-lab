export const RECEIPT_FORMAT='learning-cloud-verification-v2';
export const RECEIPT_MAX_BYTES=256*1024;
export const RECEIPT_TOPICS=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
export const RECEIPT_DEVICES=['iphone-safari','ipad-safari','desktop','other'];
export const validRun=run=>typeof run==='string'&&/^[A-Za-z0-9-]{6,36}$/.test(run);
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(id);
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const date=value=>typeof value==='string'&&value.length<=32&&Number.isFinite(Date.parse(value));
const text=(v,max=1000)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]|Bearer\s|access_token|refresh_token|[A-Z]:[\\/]/i.test(v);
const count=(v,max=100000)=>Number.isInteger(v)&&v>=0&&v<=max;
function keys(value,allowed,required=[]){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(value,k));}
const check=(ok,message='測試收據格式無效。')=>{if(!ok)throw Error(message);};
export function validateReceipt(r){
 check(keys(r,['format','run','sessionId','device','browser','startedAt','updatedAt','steps','actions','productionReadbacks','syncErrors'],['format','run','sessionId','device','browser','startedAt','updatedAt','steps','actions','productionReadbacks','syncErrors']));
 check(r.format===RECEIPT_FORMAT&&validRun(r.run)&&validId(r.sessionId)&&r.sessionId.length>=8&&RECEIPT_DEVICES.includes(r.device)&&text(r.browser)&&date(r.startedAt)&&date(r.updatedAt));
 check(Array.isArray(r.actions)&&r.actions.length<=100&&r.actions.every(a=>keys(a,['id','name','status','startedAt','finishedAt','error'],['id','name','status','startedAt'])&&validId(a.id)&&['write','restore','return','baseline'].includes(a.name)&&['running','completed','failed','interrupted'].includes(a.status)&&date(a.startedAt)&&(a.finishedAt===undefined||date(a.finishedAt))&&(a.error===undefined||text(a.error))));
 check(new Set(r.actions.map(a=>a.id)).size===r.actions.length);
 const names=['A-write-read-deduplicate','B-restore-return','A-return-read','platform-export-match'];
 const fields=['eventId','name','topic','pass','at','actionId','firstId','secondId','returnId','fileId','firstHash','secondHash','sha256','sourceHash','records','draftCount','shapeCount','recordsMatched','historyVersions','checks','error'];
 check(Array.isArray(r.steps)&&r.steps.length<=500&&r.steps.every(s=>keys(s,fields,['eventId','name','topic','pass','at'])&&validId(s.eventId)&&names.includes(s.name)&&RECEIPT_TOPICS.includes(s.topic)&&typeof s.pass==='boolean'&&date(s.at)&&(s.actionId===undefined||r.actions.some(a=>a.id===s.actionId))&&['firstId','secondId','returnId','fileId'].every(k=>s[k]===undefined||validId(s[k]))&&['firstHash','secondHash','sha256','sourceHash'].every(k=>s[k]===undefined||hash(s[k]))&&['records','draftCount','shapeCount','recordsMatched','historyVersions'].every(k=>s[k]===undefined||count(s[k]))&&(s.checks===undefined||Array.isArray(s.checks)&&s.checks.length<=20&&s.checks.every(c=>text(c,120)))&&(s.error===undefined||text(s.error))));
 check(new Set(r.steps.map(s=>s.eventId)).size===r.steps.length);
 for(const s of r.steps.filter(s=>s.pass)){
  if(s.name==='A-write-read-deduplicate')check(s.actionId&&s.firstId&&s.secondId&&hash(s.firstHash)&&hash(s.secondHash));
  if(s.name==='B-restore-return')check(s.actionId&&s.firstId&&s.secondId&&s.returnId&&hash(s.sha256));
  if(s.name==='A-return-read')check(s.actionId&&s.fileId&&hash(s.sha256)&&s.historyVersions===3);
  if(s.name==='platform-export-match')check(hash(s.sourceHash)&&count(s.recordsMatched)&&s.recordsMatched>=2);
 }
 check(Array.isArray(r.productionReadbacks)&&r.productionReadbacks.length<=40&&r.productionReadbacks.every(p=>keys(p,['label','at','files'],['label','at','files'])&&['A-before','A-after','B-before','B-after','A-final','manual'].includes(p.label)&&date(p.at)&&Array.isArray(p.files)&&p.files.length<=500&&p.files.every(f=>keys(f,['topic','id','records','drafts','sha256'],['topic','id','records','drafts','sha256'])&&RECEIPT_TOPICS.includes(f.topic)&&validId(f.id)&&count(f.records)&&count(f.drafts)&&hash(f.sha256))));
 check(Array.isArray(r.syncErrors)&&r.syncErrors.length<=50&&r.syncErrors.every(e=>keys(e,['at','error'],['at','error'])&&date(e.at)&&text(e.error)));
 check(new TextEncoder().encode(JSON.stringify(r)).length<=RECEIPT_MAX_BYTES,'測試收據超過 256 KB，請下載留存並使用新批次。');
 return r;
}
export function newReceipt({run,device,browser,sessionId,now}){return validateReceipt({format:RECEIPT_FORMAT,run,sessionId,device,browser,startedAt:now,updatedAt:now,steps:[],actions:[],productionReadbacks:[],syncErrors:[]});}
export function receiptProgress(r){
 validateReceipt(r);
 const action=[...r.actions].reverse().find(a=>a.name==='restore');
 const restoreSteps=action?r.steps.filter(s=>s.name==='B-restore-return'&&s.actionId===action.id):[];
 const restored=RECEIPT_TOPICS.filter(topic=>restoreSteps.some(s=>s.topic===topic&&s.pass));
 const source=new Map(restoreSteps.filter(s=>s.pass).map(s=>[s.topic,s.sha256]));
 const compared=RECEIPT_TOPICS.filter(topic=>{const last=[...r.steps].reverse().find(s=>s.name==='platform-export-match'&&s.topic===topic);return last?.pass&&last.sourceHash===source.get(topic);});
 return {restored,compared,restoreComplete:action?.status==='completed'&&restored.length===5,compareComplete:compared.length===5,deviceComplete:action?.status==='completed'&&restored.length===5&&compared.length===5};
}

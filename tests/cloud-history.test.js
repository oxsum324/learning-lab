import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker,MAX_BYTES} from '../backend/worker.js';
import {CloudHistory,mergeCloudRecords} from '../site/cloud-history.js';
import {emptyState,assess} from '../site/core.js';
import {newReceipt,RECEIPT_MAX_BYTES} from '../site/verification/receipt-model.js';

const topic='structural-analysis',origin='https://oxsum324.github.io';
const env={GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com',ALLOWED_EMAIL:'learner@example.test',ALLOWED_ORIGINS:origin};
const attempt=()=>({id:'attempt-cloud',day:1,activeMs:60000,reasoning:'test only',explanation:'',mistake:'',hint:0,errorType:'未判定',values:{},startedAt:'',updatedAt:'',submittedAt:'2026-09-18T00:00:00Z',curriculumVersion:'v1',assessment:assess([],{}),drawing:undefined});
function fixture(){
 const files=new Map(),calls=[],info={aud:env.GOOGLE_CLIENT_ID,sub:'12345',email:env.ALLOWED_EMAIL,email_verified:true,expires_in:3600,scope:'openid email https://www.googleapis.com/auth/drive.file'};let counter=0;
 const response=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json'}});
 const net=async(url,options={})=>{
  const u=new URL(url);calls.push({u,options});
  if(u.hostname==='oauth2.googleapis.com')return response(info);
  assert.equal(options.headers.Authorization,'Bearer token-for-unit-tests');
  if(u.pathname==='/upload/drive/v3/files'){
   const parts=options.body.split('\r\n\r\n');const metadata=JSON.parse(parts[1].split('\r\n--')[0]),content=parts[2].split('\r\n--')[0];
   const id='snapshot_'+(++counter);files.set(id,{...metadata,id,ownedByMe:true,permissions:[{type:'user',role:'owner'}],content,size:String(new TextEncoder().encode(content).length),createdTime:new Date().toISOString()});return response({id});
  }
  if(u.pathname==='/drive/v3/files'&&options.method==='POST'){
   const data=JSON.parse(options.body);assert.equal(data.parents,undefined,'private folder must be created at root');const id='folder_'+(++counter);files.set(id,{...data,id,ownedByMe:true,permissions:[{type:'user',role:'owner'}]});return response({id});
  }
  if(u.pathname==='/drive/v3/files'){
   const q=u.searchParams.get('q');let selected=[...files.values()].filter(f=>!f.trashed&&f.ownedByMe);
   for(const [,key,value] of q.matchAll(/key='([^']+)' and value='([^']+)'/g))selected=selected.filter(f=>f.appProperties?.[key]===value);
   if(q.includes("mimeType='application/vnd.google-apps.folder'"))selected=selected.filter(f=>f.mimeType==='application/vnd.google-apps.folder');
   const parents=[...q.matchAll(/'([^']+)' in parents/g)].map(x=>x[1]);if(parents.length)selected=selected.filter(f=>f.parents?.some(p=>parents.includes(p)));
   return response({files:selected});
  }
  const f=files.get(u.pathname.split('/').at(-1));if(!f)return response({},404);return u.searchParams.get('alt')==='media'?new Response(f.content):response(f);
 };
 const worker=createWorker(net);
 const call=(path,method='GET',body,options={})=>worker.fetch(new Request('https://backend.example'+path,{method,headers:{Origin:origin,Authorization:'Bearer token-for-unit-tests',...(body?{'Content-Type':'application/json'}:{}),...options.headers},body:body?JSON.stringify(body):undefined}),options.env||env);
 return {files,info,calls,call};
}
test('cloud backend rejects missing setup, wrong origin, missing/foreign/expired token and missing file scope',async()=>{
 const f=fixture();assert.equal((await f.call('/session','POST',null,{env:{}})).status,503);
 assert.equal((await f.call('/session','POST',null,{headers:{Origin:'https://evil.test'}})).status,403);
 assert.equal((await f.call('/session','POST',null,{headers:{Authorization:''}})).status,401);
 f.info.aud='other';assert.equal((await f.call('/session','POST')).status,401);f.info.aud=env.GOOGLE_CLIENT_ID;
 f.info.expires_in=0;assert.equal((await f.call('/session','POST')).status,401);f.info.expires_in=3600;
 f.info.email='other@example.test';assert.equal((await f.call('/session','POST')).status,403);f.info.email=env.ALLOWED_EMAIL;
 f.info.scope='email';assert.equal((await f.call('/session','POST')).status,403);assert.equal(f.files.size,0);
});
test('cloud session creates a private root folder and refuses shared folders without changing permissions',async()=>{
 const f=fixture();assert.equal((await f.call('/session','POST')).status,200);const folder=[...f.files.values()][0];
 assert.match((await (await f.call('/session','POST')).json()).folderUrl,/folder_1$/);assert.equal(f.files.size,1);
 for(const permission of [{type:'anyone',role:'writer'},{type:'domain',role:'reader'},{type:'user',role:'writer'}]){
  folder.permissions.push(permission);assert.equal((await f.call('/session','POST')).status,409);folder.permissions.pop();
 }
 folder.permissions=undefined;assert.equal((await f.call('/session','POST')).status,409);
});
test('cloud saves immutable versions, retries deduplicate, lists by subject and restores exact original',async()=>{
 const f=fixture(),state=emptyState();state.records.push(attempt());const path='/snapshots?topic='+topic;
 const first=await f.call(path,'POST',state);assert.equal(first.status,201);const {id}=await first.json();
 assert.equal((await (await f.call(path,'POST',state)).json()).duplicate,true);
 const list=await (await f.call(path)).json();assert.equal(list.files.length,1);assert.equal(list.files[0].recordCount,1);
 assert.deepEqual(await (await f.call('/snapshots/'+id+'?topic='+topic)).json(),JSON.parse(JSON.stringify(state)));
 const second=structuredClone(state);second.records.push({...attempt(),id:'second'});assert.equal((await f.call(path,'POST',second)).status,201);
 assert.equal((await (await f.call(path)).json()).files.length,2);
 assert.equal((await (await f.call('/snapshots?topic=steel-structures')).json()).files.length,0);
});
test('cloud denies other subjects, shared files, moved files, other owners, oversized data and tampering',async()=>{
 const f=fixture(),state=emptyState();state.records.push(attempt());
 const {id}=await (await f.call('/snapshots?topic='+topic,'POST',state)).json(),file=f.files.get(id),path='/snapshots/'+id+'?topic='+topic;
 assert.equal((await f.call('/snapshots/'+id+'?topic=reinforced-concrete')).status,403);
 file.permissions.push({type:'anyone',role:'reader'});assert.equal((await f.call(path)).status,409);file.permissions.pop();
 const parents=file.parents;file.parents=['unrelated'];assert.equal((await f.call(path)).status,403);file.parents=parents;
 file.appProperties.owner='54321';assert.equal((await f.call(path)).status,403);file.appProperties.owner='12345';
 file.size=MAX_BYTES+1;assert.equal((await f.call(path)).status,413);file.size=100;
 file.content=file.content.replace('test only','tampered!');assert.equal((await f.call(path)).status,409);
 assert.equal((await f.call('/snapshots?topic='+topic,'POST',state)).status,409,'tampered duplicate must not be acknowledged as saved');
 assert.equal((await f.call('/snapshots?topic='+topic,'POST',{...state,topicId:'reinforced-concrete'})).status,400);
 assert.equal((await f.call('/snapshots?topic='+topic,'POST',{...state,extra:'x'.repeat(MAX_BYTES)})).status,413);
});
test('cloud errors redact upstream body and apply no-store / restricted CORS headers',async()=>{
 const worker=createWorker(async()=>{throw Error('secret backend exception');});
 const r=await worker.fetch(new Request('https://backend.example/session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer token-for-unit-tests'}}),env);
 assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/secret/);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
});
test('cloud client serializes immutable submissions and stops queued work after disconnect',async()=>{
 const sent=[];let release;const gate=new Promise(r=>release=r);
 const client=new CloudHistory({endpoint:'https://backend.example',topicId:topic,fetcher:async(url,options)=>{sent.push(JSON.parse(options.body));await gate;return new Response('{}');}});
 client.setToken('temporary-memory-token',3600);const state=emptyState();state.records.push(attempt());
 const first=client.backup(state);const firstError=first.catch(e=>e);await new Promise(r=>setTimeout(r,0));state.records.push({...attempt(),id:'second'});const second=client.backup(state);const secondError=second.catch(e=>e);
 client.disconnect();release();assert.match((await firstError).message,/變更/);assert.match((await secondError).message,/中斷/);assert.equal(sent.length,1);assert.equal(sent[0].records.length,1);
});
test('cloud merging preserves active drafts and rejects conflicting historical records without mutation',()=>{
 const local=emptyState();local.drafts['1']=attempt();const remote=emptyState();remote.records.push(attempt());remote.drafts['1']={...attempt(),reasoning:'different'};
 const result=mergeCloudRecords(local,remote);assert.equal(result.records.length,1);assert.deepEqual(result.drafts,local.drafts);assert.equal(local.records.length,0);
 const bad=structuredClone(remote);bad.records[0].reasoning='conflict';assert.throws(()=>mergeCloudRecords(result,bad),/衝突/);assert.equal(result.records[0].reasoning,'test only');
});

test('verification namespace isolates folders, lists, writes and direct reads in both directions',async()=>{
 const f=fixture(),state=emptyState();state.records.push(attempt());
 const learning=await (await f.call('/snapshots?topic='+topic,'POST',state)).json();
 const verifying=await (await f.call('/snapshots?topic='+topic+'&space=verification','POST',state)).json();
 assert.notEqual(learning.id,verifying.id);
 assert.deepEqual((await (await f.call('/snapshots?topic='+topic)).json()).files.map(x=>x.id),[learning.id]);
 assert.deepEqual((await (await f.call('/snapshots?topic='+topic+'&space=verification')).json()).files.map(x=>x.id),[verifying.id]);
 assert.equal((await f.call('/snapshots/'+verifying.id+'?topic='+topic)).status,403);
 assert.equal((await f.call('/snapshots/'+learning.id+'?topic='+topic+'&space=verification')).status,403);
 assert.deepEqual(await (await f.call('/snapshots/'+verifying.id+'?topic='+topic+'&space=verification')).json(),JSON.parse(JSON.stringify(state)));
 const folders=[...f.files.values()].filter(x=>x.mimeType==='application/vnd.google-apps.folder');
 assert.deepEqual(folders.map(x=>x.name),['Learning Lab 私人學習歷史','Learning Lab 私人雲端驗證']);
 assert.equal(new Set(folders.map(x=>x.appProperties.app)).size,2);
 for(const path of ['/config?space=other','/session?space=','/config?space=verification&space=verification'])assert.equal((await f.call(path)).status,400);
 const c=await (await f.call('/config?space=verification')).json();assert.equal(c.storageSpace,'verification');assert.equal(c.verificationSpace,true);
});

const receipt=()=>newReceipt({run:'receipt-test01',device:'desktop',browser:'Unit test',sessionId:'session-receipt-01',now:'2026-10-20T00:00:00.000Z'});
test('private verification receipts append checkpoints, deduplicate retries, read back and stay out of learning snapshots',async()=>{
 const f=fixture(),data=receipt(),p='/verification-receipts?space=verification&run='+data.run;
 assert.equal((await f.call('/verification-receipts?run='+data.run,'POST',data)).status,403);
 const saved=await f.call(p,'POST',data);assert.equal(saved.status,201);const a=await saved.json();assert.equal(a.duplicate,false);
 assert.deepEqual(await (await f.call('/verification-receipts/'+a.id+'?space=verification&run='+data.run)).json(),data);
 const again=await (await f.call(p,'POST',data)).json();assert.equal(again.id,a.id);assert.equal(again.duplicate,true);
 const next=structuredClone(data);next.updatedAt='2026-10-20T00:01:00.000Z';const b=await (await f.call(p,'POST',next)).json();assert.notEqual(a.id,b.id);
 const list=await (await f.call(p)).json();assert.equal(list.files.length,2);assert.equal(list.files[0].device,'desktop');
 assert.equal((await (await f.call('/snapshots?topic='+topic+'&space=verification')).json()).files.length,0);
 assert.equal((await (await f.call('/snapshots?topic='+topic)).json()).files.length,0);
 assert.equal((await f.call('/verification-receipts/'+a.id+'?space=verification&run=other-test01')).status,403);
 assert.equal((await f.call('/verification-receipts/'+a.id+'?run='+data.run)).status,403);
 assert.equal((await f.call('/snapshots/'+a.id+'?topic='+topic+'&space=verification')).status,403);
 assert.equal((await f.call('/verification-receipts/'+a.id+'?space=verification&run='+data.run,'POST',next)).status,405);
});
test('receipt schema rejects credentials, arbitrary answer payloads, oversized bodies and mismatched batches',async()=>{
 const f=fixture(),data=receipt(),p='/verification-receipts?space=verification&run='+data.run;
 for(const bad of [{...data,token:'a-secret'},{...data,records:[]},{...data,syncErrors:[{at:data.startedAt,error:'Bearer test-secret'}]},{...data,run:'different-run'}])assert.equal((await f.call(p,'POST',bad)).status,400);
 assert.equal((await f.call(p,'POST',{...data,extra:'x'.repeat(RECEIPT_MAX_BYTES)})).status,413);
 assert.equal((await f.call('/verification-receipts?space=verification&run=x','POST',data)).status,400);
 assert.equal((await f.call(p+'&run='+data.run,'POST',data)).status,400);
 assert.equal((await f.call(p,'POST',data,{headers:{'Content-Type':'text/plain'}})).status,415);
});
test('receipt reads and duplicate acknowledgments refuse sharing, moving, foreign owners and content tampering',async()=>{
 const f=fixture(),data=receipt(),p='/verification-receipts?space=verification&run='+data.run;
 const {id}=await (await f.call(p,'POST',data)).json(),file=f.files.get(id),read='/verification-receipts/'+id+'?space=verification&run='+data.run;
 file.permissions.push({type:'anyone',role:'reader'});assert.equal((await f.call(read)).status,409);file.permissions.pop();
 const parents=file.parents;file.parents=['elsewhere'];assert.equal((await f.call(read)).status,403);file.parents=parents;
 file.appProperties.owner='foreign';assert.equal((await f.call(read)).status,403);file.appProperties.owner='12345';
 file.content=file.content.replace('Unit test','Tampered');assert.equal((await f.call(read)).status,409);assert.equal((await f.call(p,'POST',data)).status,409);
});

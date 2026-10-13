import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker,MAX_BYTES} from '../backend/worker.js';
import {CloudHistory,mergeCloudRecords} from '../site/cloud-history.js';
import {emptyState} from '../site/core.js';
import {createPractice,selectQuestion,recordResponse} from '../site/graded-practice.js';
import {newReview} from '../site/review-state.js';

const topic='structural-analysis',now='2026-10-13T13:00:00.000Z';
const env={GOOGLE_CLIENT_ID:'test-client',ALLOWED_EMAIL:'example@example.test',ALLOWED_ORIGINS:'https://client.example'};
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json'}});
function backendFixture(){
 const files=new Map();let counter=0;const calls=[];
 const net=async(url,options={})=>{
  const u=new URL(url);calls.push({pathname:u.pathname,method:options.method??'GET'});
  if(u.hostname==='oauth2.googleapis.com')return json({aud:env.GOOGLE_CLIENT_ID,sub:'123',email:env.ALLOWED_EMAIL,email_verified:true,expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'});
  if(u.pathname==='/upload/drive/v3/files'){
   const parts=options.body.split('\r\n\r\n'),meta=JSON.parse(parts[1].split('\r\n--')[0]),content=parts[2].split('\r\n--')[0];
   const id='file_'+(++counter);files.set(id,{...meta,id,content,size:String(new TextEncoder().encode(content).length),ownedByMe:true,permissions:[{type:'user',role:'owner'}],createdTime:now});return json({id});
  }
  if(u.pathname==='/drive/v3/files'&&options.method==='POST'){
   const id='folder_'+(++counter);files.set(id,{...JSON.parse(options.body),id,ownedByMe:true,permissions:[{type:'user',role:'owner'}]});return json({id});
  }
  if(u.pathname==='/drive/v3/files'){
   const q=u.searchParams.get('q');let matches=[...files.values()];
   for(const [,key,value] of q.matchAll(/key='([^']+)' and value='([^']+)'/g))matches=matches.filter(f=>f.appProperties?.[key]===value);
   if(q.includes("mimeType='application/vnd.google-apps.folder'"))matches=matches.filter(f=>f.mimeType==='application/vnd.google-apps.folder');
   const parents=[...q.matchAll(/'([^']+)' in parents/g)].map(x=>x[1]);if(parents.length)matches=matches.filter(f=>f.parents?.some(p=>parents.includes(p)));
   return json({files:matches});
  }
  const f=files.get(u.pathname.split('/').at(-1));if(!f)return json({},404);
  return u.searchParams.get('alt')==='media'?new Response(f.content):json(f);
 };
 const worker=createWorker(net);
 const fetcher=(url,options={})=>worker.fetch(new Request(url,{...options,headers:{...options.headers,Origin:'https://client.example'}}),env);
 const client=()=>{const c=new CloudHistory({endpoint:'https://worker.example',topicId:topic,fetcher});c.setToken('unit-test-token-only',3600);return c;};
 return {files,calls,client,fetcher};
}
function stateFixture(){
 const p=createPractice('A',{topic,day:2,sessionId:'cloud-session',now});
 const options=['a','b','c','d'].map(id=>({id,text:id,reason:'教材核對'}));
 const base={id:'multi-fixture',version:1,topic,day:2,level:2,type:'multi',skill:'模型',model:'平衡',prompt:'核對條件',assistance:1,source:{kind:'principle',label:'教材原理',locator:'本機測試'},explanation:'核對說明',options,answer:['a','c']};
 selectQuestion([base],p,{level:2,now});recordResponse(p,['a','b'],{now,activeMs:1000});
 const order={...base,id:'order-fixture',level:3,type:'order',answer:['a','b','c','d']};
 selectQuestion([order],p,{level:3,now});recordResponse(p,['a','b','c','d'],{now,activeMs:2000});
 const state=emptyState(topic);state.records=[{id:'graded-record',day:2,activeMs:2000,reasoning:'原始推導',explanation:'',mistake:'',hint:1,errorType:'未判定',values:{},startedAt:now,updatedAt:now,submittedAt:now,curriculumVersion:'0.15.0',assessment:{text:'本機測試'},progressive:p}];
 return state;
}

test('worker capability advertises old/new formats without private identity or token',async()=>{
 const f=backendFixture(),r=await f.fetcher('https://worker.example/config'),config=await r.json();
 assert.deepEqual(config.reviewVersions,[1,2]);assert.deepEqual(config.schemaVersions,[1]);assert.equal(config.draftResume,false);assert.equal(config.maxBytes,MAX_BYTES);
 assert.doesNotMatch(JSON.stringify(config),/example@example|token/);assert.equal(f.calls.length,0);
});

test('two independent clients write/read exact v2 multi/order and preserve earlier legacy payload',async()=>{
 const f=backendFixture(),one=f.client(),two=f.client(),state=stateFixture(),original=JSON.stringify(state);
 const legacy=structuredClone(state);legacy.records[0].id='legacy-record';legacy.records[0].progressive=newReview();
 const a=await one.backup(legacy),b=await one.backup(state);
 assert.deepEqual(await two.read(a.id),legacy);const restored=await two.read(b.id);assert.deepEqual(restored,state);
 assert.deepEqual(restored.records[0].progressive.attempts[0].answer,['a','b']);
 assert.equal((await one.backup(state)).duplicate,true);
 const merged=mergeCloudRecords(legacy,restored);assert.equal(merged.records.length,2);assert.equal(JSON.stringify(state),original);
 const conflict=structuredClone(restored);conflict.records[0].reasoning='裝置二改稿';assert.throws(()=>mergeCloudRecords(restored,conflict),/衝突/);assert.equal(JSON.stringify(state),original);
});

test('new frontend refuses old backend before upload and keeps original JSON',async()=>{
 const state=stateFixture(),original=JSON.stringify(state),calls=[];
 const client=new CloudHistory({endpoint:'https://old.example',topicId:topic,fetcher:async(url)=>{calls.push(url);return json({ready:true});}});client.setToken('test-token',3600);
 await assert.rejects(client.backup(state),/尚未支援/);assert.equal(calls.length,1);assert.match(calls[0],/\/config$/);assert.equal(JSON.stringify(state),original);
});

test('network failure, expired authorization and oversize never mutate or claim uploaded data',async()=>{
 const state=stateFixture(),original=JSON.stringify(state);let calls=0;
 const offline=new CloudHistory({endpoint:'https://offline.example',topicId:topic,fetcher:async()=>{calls++;throw new TypeError('offline');}});offline.setToken('test-token',3600);
 await assert.rejects(offline.backup(state),/offline/);assert.equal(calls,1);assert.equal(JSON.stringify(state),original);
 const unauthorized=new CloudHistory({endpoint:'https://auth.example',topicId:topic,fetcher:async url=>url.endsWith('/config')?json({reviewVersions:[1,2]}):json({error:'授權已過期'},401)});unauthorized.setToken('test-token',3600);
 await assert.rejects(unauthorized.backup(state),/過期/);assert.equal(unauthorized.connected(),false);assert.equal(JSON.stringify(state),original);
 const large=structuredClone(state);large.records=Array.from({length:400},(_,i)=>({...large.records[0],id:'large-'+i,reasoning:'x'.repeat(12000)}));
 const before=calls;await assert.rejects(offline.backup(large),/4 MB/);assert.equal(calls,before);
});

test('unknown new metadata is refused for merge while raw downloaded payload remains accessible',async()=>{
 const future=stateFixture();future.records[0].progressive.version=99;future.records[0].progressive.futureAnswer=['do','not','drop'];const original=JSON.stringify(future);
 const client=new CloudHistory({endpoint:'https://future.example',topicId:topic,fetcher:async()=>json(future)});client.setToken('test-token',3600);
 await assert.rejects(client.read('future-id'),/原始雲端檔案未更動/);assert.deepEqual(await client.readRaw('future-id'),future);assert.equal(JSON.stringify(future),original);
 const f=backendFixture(),response=await f.fetcher('https://worker.example/snapshots?topic='+topic,{method:'POST',headers:{Authorization:'Bearer unit-test-token-only','Content-Type':'application/json'},body:original});
 assert.equal(response.status,400);assert.equal([...f.files.values()].filter(x=>x.mimeType==='application/json').length,0);
});

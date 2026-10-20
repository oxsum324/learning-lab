import test from 'node:test';
import assert from 'node:assert/strict';
import {newReceipt,validateReceipt,receiptProgress,RECEIPT_TOPICS} from '../site/verification/receipt-model.js';
const at='2026-10-20T00:00:00.000Z',sha='a'.repeat(64);
const fresh=()=>newReceipt({run:'receipt-progress01',device:'iphone-safari',browser:'Safari test',sessionId:'receipt-session-01',now:at});
function complete(){const r=fresh();r.actions.push({id:'action-restore',name:'restore',status:'completed',startedAt:at,finishedAt:at});for(const [i,topic] of RECEIPT_TOPICS.entries()){r.steps.push({eventId:'restore-'+i,name:'B-restore-return',topic,pass:true,at,actionId:'action-restore',firstId:'first-'+i,secondId:'second-'+i,returnId:'third-'+i,sha256:sha});r.steps.push({eventId:'compare-'+i,name:'platform-export-match',topic,pass:true,at,sourceHash:sha,recordsMatched:2});}return r;}
test('connection alone and partial or interrupted restore cannot report full device completion',()=>{
 const r=fresh();assert.equal(receiptProgress(r).deviceComplete,false);
 const done=complete();done.actions[0].status='running';assert.equal(receiptProgress(done).restoreComplete,false);assert.equal(receiptProgress(done).deviceComplete,false);
 done.actions[0].status='interrupted';assert.equal(receiptProgress(done).deviceComplete,false);
 done.actions[0].status='completed';done.steps=done.steps.filter(s=>s.topic!==RECEIPT_TOPICS[4]);assert.equal(receiptProgress(done).restored.length,4);assert.equal(receiptProgress(done).deviceComplete,false);
});
test('all five actual export matches are required; later failure revokes a pass and retry preserves history',()=>{
 const r=complete();assert.equal(receiptProgress(r).deviceComplete,true);
 r.steps.push({eventId:'bad-compare',name:'platform-export-match',topic:RECEIPT_TOPICS[0],pass:false,at,error:'原始草稿不同'});assert.equal(receiptProgress(r).compared.length,4);assert.equal(receiptProgress(r).deviceComplete,false);
 r.steps.push({eventId:'retry-compare',name:'platform-export-match',topic:RECEIPT_TOPICS[0],pass:true,at,sourceHash:sha,recordsMatched:2});assert.equal(receiptProgress(r).deviceComplete,true);assert.equal(r.steps.filter(s=>!s.pass).length,1);
});
test('a new failed restore cannot inherit the previous completed round and export hash must match source',()=>{
 const r=complete();r.actions.push({id:'retry-restore',name:'restore',status:'failed',startedAt:at,finishedAt:at,error:'中斷'});assert.equal(receiptProgress(r).restoreComplete,false);assert.equal(receiptProgress(r).compared.length,0);
 const changed=complete();changed.steps.find(s=>s.name==='platform-export-match').sourceHash='b'.repeat(64);assert.equal(receiptProgress(changed).compared.length,4);
});
test('receipts preserve failure evidence while rejecting unknown fields, answer content and secrets',()=>{
 const r=complete();r.syncErrors.push({at,error:'暫時離線，待補存'});assert.deepEqual(validateReceipt(JSON.parse(JSON.stringify(r))),r);
 for(const bad of [{...r,password:'hidden'},{...r,steps:[{...r.steps[0],answer:'12.34'}]},{...r,syncErrors:[{at,error:'access_token=hidden'}]}])assert.throws(()=>validateReceipt(bad),/收據/);
});

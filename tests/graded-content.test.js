import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_BANK,getQuestions} from '../site/graded-bank.js';
import {TOPICS} from '../site/topics.js';

test('five D02 pilot lessons contain distinct 3/3/2 authored questions and seven types',()=>{
 for(const topic of Object.keys(TOPICS)) {
  assert.equal(getQuestions(topic,2).length,8,topic);
  for(const [level,count] of [[1,3],[2,3],[3,2]]) assert.equal(getQuestions(topic,2,level).length,count,`${topic} L${level}`);
 }
 assert.equal(new Set(QUESTION_BANK.map(q=>q.id)).size,QUESTION_BANK.length);
 assert.deepEqual([...new Set(QUESTION_BANK.map(q=>q.type))].sort(),['boolean','error','fill','match','multi','order','single']);
});

test('authored answer references, explanations and source boundaries are valid',()=>{
 for(const q of QUESTION_BANK) {
  assert.equal(q.version,1); assert.ok(q.prompt && q.skill && q.model && q.explanation,q.id);
  assert.ok(['principle','specified-model','verified-code'].includes(q.source.kind),q.id);
  assert.ok(q.source.label && q.source.locator,q.id);
  const checkOptions=options=>{assert.equal(new Set(options.map(o=>o.id)).size,options.length,q.id);for(const o of options) assert.ok(o.text && o.reason,q.id);};
  if(q.options) checkOptions(q.options);
  if(q.fields) {
   assert.equal(new Set(q.fields.map(f=>f.id)).size,q.fields.length,q.id);
   for(const f of q.fields) {checkOptions(f.options);assert.ok(f.options.some(o=>o.id===q.answer[f.id]),q.id);}
  } else if(q.type==='boolean') {
   checkOptions(q.reasonOptions);
   assert.ok(q.options.some(o=>o.id===q.answer.choice),q.id);
   assert.ok(q.reasonOptions.some(o=>o.id===q.answer.reason),q.id);
  } else {
   for(const a of Array.isArray(q.answer)?q.answer:[q.answer]) assert.ok(q.options.some(o=>o.id===a),q.id);
  }
  if(q.type==='multi') {
   assert.ok(q.options.length>=4 && q.options.length<=6,q.id);
   assert.ok(q.answer.length>=2 && q.answer.length<=4 && q.answer.length<q.options.length,q.id);
   assert.equal(new Set(q.answer).size,q.answer.length,q.id);
  }
  if(q.type==='order') {
   assert.equal(q.answer.length,q.options.length,q.id);
   assert.equal(new Set(q.answer).size,q.answer.length,q.id);
   for(const [before,after] of q.precedences||[]) assert.ok(q.answer.indexOf(before)<q.answer.indexOf(after),q.id);
  }
  assert.doesNotMatch(JSON.stringify(q),/以上皆[是否非]|[对称载单应续来题图为级边]/u,q.id);
 }
});

test('D02 pilots avoid numerical answer candidates and admit independent calculation order',()=>{
 assert.equal(QUESTION_BANK.filter(q=>q.numeric).length,0,'numeric templates belong to separate guarded source');
 const partialOrders=QUESTION_BANK.filter(q=>q.precedences);
 assert.ok(partialOrders.length>=3);
 for(const q of partialOrders) {
  const alternate=[q.answer[0],q.answer[2],q.answer[1],q.answer[3]];
  for(const [a,b] of q.precedences) assert.ok(alternate.indexOf(a)<alternate.indexOf(b),q.id);
 }
});

test('all five first weeks contain exactly 310 questions and meet diagnostic and remedial quotas',()=>{
 assert.equal(QUESTION_BANK.length,310);
 assert.equal(new Set(QUESTION_BANK.map(q=>`${q.topic}:${q.day}`)).size,35);
 for(const topic of Object.keys(TOPICS)) {
  const all=QUESTION_BANK.filter(q=>q.topic===topic);
  assert.equal(all.length,62,topic);
  const diagnostic=getQuestions(topic,1);
  assert.equal(diagnostic.length,10,topic);
  assert.ok(diagnostic.every(q=>q.diagnostic===true),topic);
  assert.equal(diagnostic.filter(q=>q.type==='single').length,6,topic);
  assert.equal(diagnostic.filter(q=>q.type==='multi').length,4,topic);
  assert.equal(getQuestions(topic,1,1).length,6,topic);
  assert.equal(getQuestions(topic,1,2).length,4,topic);
  assert.equal(getQuestions(topic,1,3).length,0,topic);
  for(let day=2;day<=7;day++) {
   for(const [level,count] of day===7?[[1,3],[2,5],[3,4]]:[[1,3],[2,3],[3,2]]) {
    assert.equal(getQuestions(topic,day,level).length,count,`${topic} D${day} L${level}`);
   }
   assert.ok(getQuestions(topic,day).every(q=>!q.diagnostic),`${topic} D${day}`);
  }
 }
});

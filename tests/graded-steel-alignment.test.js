import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_BANK,getQuestions} from '../site/graded-bank.js';
import {questions as reserved} from '../site/graded-content/future/steel-d11.js';
import {createPractice,selectQuestion,gradeQuestion,recordResponse,validPractice} from '../site/graded-practice.js';

const replaced=['l1-net-section','l2-column-conditions','l3-column-capacity-order','l3-tension-factor-error'];
const moved=['l1-ltb-range','l2-ltb-endpoints','l3-ltb-order','l3-ltb-error'];

test('steel D07 covers first-week tension and compression without beam content',()=>{
 const week=getQuestions('steel-structures',7);
 assert.equal(week.length,12);
 for(const [level,count] of [[1,3],[2,5],[3,4]]) assert.equal(week.filter(q=>q.level===level).length,count);
 for(const q of week) assert.doesNotMatch(JSON.stringify(q),/Lb|Lp|Lr|側扭|插值/i,q.id);
 for(const q of week) assert.doesNotMatch(q.source.locator,/ST_C07/,'beam source stays with D11');
 for(const suffix of moved) assert.equal(QUESTION_BANK.some(q=>q.id===`st-d07-${suffix}`),false,suffix);
 for(const suffix of replaced) assert.ok(week.some(q=>q.id===`st-d07-${suffix}`),suffix);
 assert.match(week.find(q=>q.id==='st-d07-l2-design-scope').prompt,/受拉與受壓/);
});

test('reserved D11 beam questions remain outside the active 310-question bank',()=>{
 assert.equal(QUESTION_BANK.length,310);
 assert.equal(QUESTION_BANK.filter(q=>q.topic==='steel-structures').length,62);
 assert.deepEqual(getQuestions('steel-structures',11),[]);
 assert.equal(reserved.length,4);
 assert.deepEqual(reserved.map(q=>q.id),moved.map(id=>`st-d11-${id}`));
 assert.deepEqual(reserved.map(q=>q.level),[1,2,3,3]);
 for(const q of reserved){
  assert.equal(q.day,11);
  assert.match(q.source.locator,/D11/);
  assert.match(q.source.locator,/ST_C07/,'retain the existing source identifier after moving its lesson day');
  assert.equal(q.source.kind,'specified-model');
  assert.equal(QUESTION_BANK.some(active=>active.id===q.id),false,q.id);
  assert.equal(gradeQuestion(q,q.answer).correct,true,q.id);
 }
});

test('replacement questions preserve supported snapshots and typed original answers',()=>{
 for(const suffix of replaced){
  const q=getQuestions('steel-structures',7).find(row=>row.id===`st-d07-${suffix}`);
  const p=createPractice('A',{topic:q.topic,day:q.day,sessionId:`steel-review-${suffix}`});
  const snapshot=selectQuestion([q],p,{level:q.level});
  assert.equal(validPractice(p),true,`${q.id} selected`);
  assert.equal(gradeQuestion(snapshot,q.answer).correct,true,q.id);
  recordResponse(p,q.answer);
  assert.equal(validPractice(p),true,`${q.id} recorded`);
  assert.deepEqual(JSON.parse(JSON.stringify(p)).attempts[0].answer,q.answer,q.id);
 }
 const order=getQuestions('steel-structures',7).find(q=>q.id==='st-d07-l3-column-capacity-order');
 assert.equal(gradeQuestion(order,['a','b','c','d']).correct,true);
 assert.equal(gradeQuestion(order,['a','c','b','d']).correct,true,'axis calculations may swap');
 assert.equal(gradeQuestion(order,['a','b','d','c']).correct,false,'comparison requires both axes');
});

test('moving old questions out of the active bank does not invalidate saved D07 snapshots',()=>{
 for(const archived of reserved){
  const original={...archived,id:archived.id.replace('-d11-','-d07-'),day:7,model:'第一週交卷後補強：受拉、壓桿與梁',source:{...archived.source,locator:'鋼結構題庫 ST_C07／ST_W07A／ST_W07B；D07'}};
  const p=createPractice('A',{topic:original.topic,day:7,sessionId:`previous-${original.id}`});
  selectQuestion([original],p,{level:original.level});
  recordResponse(p,original.answer);
  const restored=JSON.parse(JSON.stringify(p));
  assert.equal(validPractice(restored),true,original.id);
  assert.deepEqual(restored.attempts[0].question.prompt,original.prompt);
  assert.deepEqual(restored.attempts[0].answer,original.answer);
 }
});

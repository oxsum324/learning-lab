import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUESTION_BANK} from '../site/graded-bank.js';
import {createPractice,selectQuestion,gradeQuestion,recordResponse,recordNumericInitial,validPractice} from '../site/graded-practice.js';
import {numericQuestion} from '../site/graded-numeric.js';
const forbidden=/[设无侧论两额双时画会为强脚产稳静弹关条对总开较务墙离题独装称]/;
const topics=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
function prose(q){return [q.prompt,q.skill,q.model,q.explanation,q.source?.label,q.source?.locator,...(q.options??[]).flatMap(o=>[o.text,o.reason]),...(q.reasonOptions??[]).flatMap(o=>[o.text,o.reason]),...(q.fields??[]).flatMap(f=>[f.label,...f.options.flatMap(o=>[o.text,o.reason])])].filter(Boolean).join('\n');}
test('all graded questions and numeric variants have bounded valid snapshots and keyed answers',()=>{
 for(const q of [...QUESTION_BANK,...topics.map(t=>numericQuestion(t,'qa'))]){
  assert.equal(q.source.kind==='pending',false,q.id);
  const p=createPractice('A',{topic:q.topic,day:q.day});const snapshot=selectQuestion([q],p,{level:q.level});
  if(q.numeric)recordNumericInitial(p,'0');
  assert.equal(validPractice(p),true,q.id+' snapshot');
  const result=gradeQuestion(snapshot,q.answer);assert.equal(result.complete,true,q.id);assert.equal(result.correct,true,q.id);
  recordResponse(p,q.answer);assert.equal(validPractice(p),true,q.id+' answered');
  assert.deepEqual(JSON.parse(JSON.stringify(p)).attempts[0].answer,q.answer,q.id+' roundtrip');
 }
});
test('graded authored prose has Traditional Chinese, traceable sources and standalone daily tasks',()=>{
 for(const q of [...QUESTION_BANK,...topics.map(t=>numericQuestion(t,'qa'))]){
  assert.doesNotMatch(prose(q),forbidden,q.id);
  assert.doesNotMatch(prose(q),/以上皆是|以上皆非|留到 D|留待 D|下週再學|查不到.*簡化/,q.id);
  assert.ok(q.source.locator?.length>3,q.id);assert.ok(q.explanation?.length>8,q.id);
  for(const o of [...(q.options??[]),...(q.reasonOptions??[]),...(q.fields??[]).flatMap(f=>f.options)])assert.ok(o.reason?.trim(),q.id+':'+o.id+' explanation');
 }
 for(const f of ['graded-practice.js','graded-ui.js','graded-numeric.js'])assert.doesNotMatch(readFileSync(new URL('../site/'+f,import.meta.url),'utf8'),forbidden,f);
});
test('stable option shuffle spans positions instead of exposing a fixed correct index',()=>{
 const counts=[0,0,0,0,0,0];let n=0;
 for(const q of QUESTION_BANK.filter(q=>q.type==='single')){
  const p=createPractice('A',{topic:q.topic,day:q.day,sessionId:'qa-'+q.id});const a=selectQuestion([q],p,{level:q.level});
  const order=a.options.map(o=>o.id);assert.deepEqual(selectQuestion([q],p,{level:q.level}).options.map(o=>o.id),order);
  counts[order.indexOf(q.answer)]++;n++;
 }
 assert.ok(counts.filter(Boolean).length>=3,'correct choices must span at least three positions');
 assert.ok(Math.max(...counts)/n<=.55,JSON.stringify({n,counts}));
});
test('single and multiple-choice keys do not systematically give away answers through longer wording',()=>{
 for(const type of ['single','multi']){
  const rows=QUESTION_BANK.filter(q=>q.type===type);let correct=0,wrong=0,longest=0;
  for(const q of rows){const ids=Array.isArray(q.answer)?q.answer:[q.answer],yes=q.options.filter(o=>ids.includes(o.id)),no=q.options.filter(o=>!ids.includes(o.id));
   correct+=yes.reduce((n,o)=>n+o.text.length,0)/yes.length;wrong+=no.reduce((n,o)=>n+o.text.length,0)/no.length;
   if(type==='single'&&yes[0].text.length>Math.max(...no.map(o=>o.text.length)))longest++;
  }
  assert.ok(correct/wrong<=1.25,`${type} answer-to-distractor length ratio ${correct/wrong}`);
  if(type==='single')assert.ok(longest/rows.length<=.5,`${longest}/${rows.length} single keys are uniquely longest`);
 }
});

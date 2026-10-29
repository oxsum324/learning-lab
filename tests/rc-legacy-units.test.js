import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {curriculumHash} from '../scripts/curriculum-hash.mjs';
import {rcLegacyCourse,rcDisplay,rcCanonical,rcText} from '../site/rc-units.js';
import {numericModel,numericParameterSets,numericQuestionFromParameters} from '../site/graded-numeric.js';
import {createPractice,selectQuestion,recordNumericInitial,recordResponse,validPractice} from '../site/graded-practice.js';
import {emptyState,validateState,mergeStates,assess} from '../site/core.js';
const topic='reinforced-concrete',params={b:300,d:500,As:1500,fc:28,fy:420,Es:200000};
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),a+' != '+b);
const raw=fs.readFileSync(new URL('../site/rc-curriculum.json',import.meta.url)),course=JSON.parse(raw);

test('all 30 original RC lessons keep their locked content across checkout line endings while runtime fields convert',()=>{
 const baseline=JSON.parse(fs.readFileSync(new URL('../docs/studio-content-canonical-baseline.json',import.meta.url)));
 assert.equal(curriculumHash(raw),baseline['rc-curriculum.json']);
 const source=JSON.stringify(course),converted=rcLegacyCourse(course);assert.equal(JSON.stringify(course),source);assert.equal(converted.days.length,30);
 for(const [i,l]of converted.days.entries())for(const [j,f]of l.fields.entries()){const old=course.days[i].fields[j];near(rcCanonical(f.value,old.unit),old.value);if(['MPa','kN','kN·m','kPa'].includes(old.unit))assert.notEqual(f.unit,old.unit);}
 const l=converted.days[1],a=l.fields.find(f=>f.unit==='mm');assert.ok(a);const values=Object.fromEntries(l.fields.map(f=>[f.id,String(f.value)]));assert.equal(assess(l.fields,values).correct,l.fields.length);
 assert.doesNotMatch(l.problem,/MPa|kN/);assert.match(l.problem,/kgf\/cm²/);
});

test('all 24 RC numeric variants use tf·m answers and conventional-unit arithmetic while internal parameters remain SI',()=>{
 for(const [i,p]of numericParameterSets(topic).entries()){
  const before=structuredClone(p),q=numericQuestionFromParameters(topic,p,'unit-review-'+i),si=numericModel(topic,p);assert.deepEqual(p,before);assert.deepEqual(q.numericMeta.parameters,p);
  assert.equal(q.version,3);assert.equal(q.numericMeta.unit,'tf·m');assert.doesNotMatch(q.prompt+' '+q.explanation+' '+q.options.map(o=>o.text).join(' '),/MPa|kN/);
  const fc=Number(/f'c=([\d.]+) kgf/.exec(q.prompt)[1]),fy=Number(/fy=([\d.]+) kgf/.exec(q.prompt)[1]);
  const a=p.As*fy/(.85*fc*p.b),t=p.As/100*fy,tfm=t*(p.d-a/2)/1e6;
  near(q.numericMeta.correct,tfm);near(rcCanonical(q.numericMeta.correct,'kN·m'),si.value);
  assert.match(q.explanation,/T=As fy\/100 kgf/);assert.match(q.explanation,/10⁸/);
  assert.equal(q.numericMeta.tolerance,Math.max(1e-6,.01*Math.abs(q.numericMeta.correct)));
  for(const o of q.options){assert.match(o.text,/ tf·m$/);const v=Number(o.text.split(' ')[0]);if(o.id===q.answer)near(v,q.numericMeta.correct,1e-6);else assert.ok(Math.abs(v-q.numericMeta.correct)>q.numericMeta.tolerance);}
 }
});

test('SI legacy numeric mode retains its original calculation, version and displayed unit',()=>{
 const si=numericModel(topic,params),old=numericQuestionFromParameters(topic,params,'old-unit',{rcUnits:'si'}),modern=numericQuestionFromParameters(topic,params,'old-unit');
 assert.equal(old.version,2);assert.equal(old.numericMeta.unit,'kN·m');assert.match(old.prompt,/28 MPa/);near(old.numericMeta.correct,si.value);
 assert.notEqual(old.id,modern.id);near(modern.numericMeta.correct*9.80665,old.numericMeta.correct);
});

test('version 2 SI question snapshots, first numeric answers and graded results survive modern-question restoration unchanged',()=>{
 const now='2026-10-29T00:00:00.000Z',old=numericQuestionFromParameters(topic,params,'si-history',{rcUnits:'si'}),modern=numericQuestionFromParameters(topic,params,'si-history');
 const p=createPractice('B',{topic,day:2,sessionId:'si-rc-history',now});selectQuestion([old],p,{level:3,now});assert.ok(recordNumericInitial(p,'123.45',{now}));
 const frozen=JSON.stringify(p),restored=JSON.parse(frozen);selectQuestion([modern],restored,{level:3,now});assert.equal(JSON.stringify(restored),frozen);
 const answer=recordResponse(restored,'b',{now,activeMs:1000});assert.ok(answer);assert.ok(validPractice(restored));const submitted=JSON.stringify(restored.attempts);
 selectQuestion([modern],restored,{level:3,now});assert.equal(JSON.stringify(restored.attempts),submitted);assert.equal(restored.current.numericMeta.unit,'tf·m');assert.ok(validPractice(restored));
 assert.equal(restored.attempts[0].question.numericMeta.unit,'kN·m');assert.equal(restored.attempts[0].question.numericInitial.value,'123.45');
 assert.match(restored.attempts[0].question.prompt,/28 MPa/);assert.equal(restored.attempts[0].question.version,2);
});

test('new conventional legacy drafts and unmodified old SI drafts can be backed up without relabeling original numeric submissions',()=>{
 const old=emptyState(topic),d={activeMs:0,reasoning:'舊 SI 推導',explanation:'',mistake:'',values:{mn:'287.205882'},hint:0,errorType:'未判定',startedAt:'',updatedAt:'2026-10-29T00:00:00.000Z'};old.drafts[2]=d;validateState(old,topic);const frozen=JSON.stringify(old);
 const roundtrip=mergeStates(emptyState(topic),JSON.parse(frozen));assert.equal(JSON.stringify(roundtrip),frozen);assert.equal(roundtrip.drafts[2].rcUnitSystem,undefined);
 const newer=emptyState(topic);newer.drafts[3]={...structuredClone(d),rcUnitSystem:'kgf-tf-v1',values:{mn:String(rcDisplay(287.205882,'kN·m'))}};validateState(newer,topic);const joined=mergeStates(roundtrip,newer);assert.deepEqual(joined.drafts[2],d);assert.equal(joined.drafts[3].rcUnitSystem,'kgf-tf-v1');
 assert.equal(rcText('混凝土 28 MPa，彎矩 100 kN·m').includes('MPa'),false);
});

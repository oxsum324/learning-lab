import test from 'node:test';
import assert from 'node:assert/strict';
import {createPractice,selectQuestion,gradeQuestion,recordResponse,recordNumericInitial,revealSupport,setPracticeLevel,canRetry,practiceOutcome,validPractice,PRACTICE_LIMITS} from '../site/graded-practice.js';
import {validReview,newReview} from '../site/review-state.js';
import {emptyState,validateState,mergeStates,safeSave} from '../site/core.js';
import {numericQuestion} from '../site/graded-numeric.js';

const now='2026-10-13T12:00:00.000Z',topic='structural-analysis';
const option=id=>({id,text:'選項 '+id,reason:'核對 '+id});
const base={id:'fixture-single',version:1,topic,day:2,level:1,type:'single',skill:'模型',model:'簡支梁',prompt:'選出正確模型',assistance:1,source:{kind:'principle',label:'教材原理',locator:'測試題'},explanation:'以平衡核對模型。',options:['a','b','c','d'].map(option),answer:'a'};
const fixtures=[base,
 {...base,id:'fixture-boolean',type:'boolean',options:['true','false'].map(option),reasonOptions:['r1','r2'].map(option),answer:{choice:'true',reason:'r1'}},
 {...base,id:'fixture-multi',level:2,type:'multi',answer:['a','c']},
 {...base,id:'fixture-match',level:2,type:'match',fields:[{id:'f1',label:'甲',options:['a','b'].map(option)},{id:'f2',label:'乙',options:['a','b'].map(option)}],answer:{f1:'a',f2:'a'}},
 {...base,id:'fixture-order',level:3,type:'order',answer:['a','b','c','d'],precedences:[['a','c'],['b','c'],['c','d']]},
 {...base,id:'fixture-error',level:3,type:'error',answer:'b'},
 {...base,id:'fixture-fill',level:3,type:'fill',fields:[{id:'f1',label:'甲',options:['a','b'].map(option)}],answer:{f1:'b'}}];
const practice=()=>createPractice('A',{topic,day:2,sessionId:'test-session',now});

test('seven answer types: correct, incorrect, incomplete and explicit unknown',()=>{
 const wrong=['b',{choice:'false',reason:'r2'},['a','b'],{f1:'b',f2:'a'},['d','c','b','a'],'a',{f1:'a'}];
 for(const [i,q] of fixtures.entries()){
  assert.equal(gradeQuestion(q,q.answer).correct,true,q.type);
  assert.equal(gradeQuestion(q,wrong[i]).correct,false,q.type);
  assert.equal(gradeQuestion(q,undefined).complete,false,q.type);
  assert.deepEqual(gradeQuestion(q,{unknown:true}).complete,true);
 }
 assert.equal(gradeQuestion(fixtures[2],['c','a']).correct,true,'multi is a set');
 assert.equal(gradeQuestion(fixtures[2],['a','a','c']).complete,false,'duplicate choices invalid');
 assert.match(gradeQuestion(fixtures[2],['a','b']).feedback.join(' '),/漏選/);
 assert.match(gradeQuestion(fixtures[2],['a','b']).feedback.join(' '),/誤選/);
 assert.equal(gradeQuestion(fixtures[4],['b','a','c','d']).correct,true,'legal alternative precedence');
 assert.equal(gradeQuestion({...fixtures[4],precedences:undefined},['b','a','c','d']).correct,false);
 assert.match(gradeQuestion({...fixtures[4],precedences:undefined},['b','a','c','d']).feedback[0],/第 1 步/);
 assert.equal(gradeQuestion(fixtures[3],{f1:'a',f2:'a'}).correct,true,'many-to-one matching');
});

test('frozen parameters/options restore without reroll and responses never overwrite history',()=>{
 const p=practice(),q=selectQuestion(fixtures,p,{level:1,now}),restored=JSON.parse(JSON.stringify(p));
 assert.deepEqual(selectQuestion(fixtures,restored,{level:1,now:'2026-10-20'}),q);
 const original=structuredClone(q.answer),attempt=recordResponse(p,original,{now,activeMs:1000});
 assert.equal(recordResponse(p,'b',{now,activeMs:2000}),null);
 if(typeof original==='object')original.changed='external';
 assert.equal(p.attempts.length,1);assert.equal(attempt.result.correct,true);
 q.prompt='改過的題幹';assert.equal(attempt.question.prompt,base.prompt);assert.equal(validPractice(p),false,'graded current must match its frozen historical question');q.prompt=attempt.question.prompt;
 assert.equal(validPractice(p),true);
});

test('all seven typed snapshots and partial drafts validate; unknown versions fail closed',()=>{
 for(const q of fixtures){const p=practice();selectQuestion([q],p,{level:q.level,now});assert.equal(validPractice(p),true,q.type);recordResponse(p,q.answer,{now,activeMs:1000});assert.equal(validPractice(p),true,q.type);}
 const p=practice();selectQuestion([fixtures[3]],p,{level:2,now});p.current.response={f1:'a'};assert.equal(validPractice(p),true);p.current.response={injected:'a'};assert.equal(validPractice(p),false);
 assert.equal(validPractice({...practice(),version:99}),false);assert.equal(validReview({...practice(),version:99}),false);
 const old=newReview();const saved=JSON.stringify(old);assert.equal(validReview(old),true);assert.equal(JSON.stringify(old),saved);assert.equal(validReview(undefined),true);
 const oversized=practice();oversized.events=Array.from({length:121},()=>({level:1,kind:'hint',at:now,questionId:null}));assert.equal(validPractice(oversized),false);
});

test('unseen preferred; exhaustion and retry limits have finite exits',()=>{
 const p=practice(),pool=[base,{...base,id:'fixture-second'}];
 const first=selectQuestion(pool,p,{level:1,now});recordResponse(p,'b',{now,activeMs:1000});
 const next=selectQuestion(pool,p,{level:1,now});assert.notEqual(next.id,first.id);recordResponse(p,'b',{now,activeMs:2000});
 assert.equal(canRetry(p,{activeMs:2000}),false);assert.equal(selectQuestion(pool,p,{level:1,now}),null);
 assert.notEqual(selectQuestion(pool,p,{level:1,now,allowRepeat:true}).id,next.id);
 assert.equal(canRetry(practice(),{activeMs:300000}),false);
 const p2=createPractice('A',{topic,day:2,sessionId:'new-session',now,exposures:[{id:base.id,seenAt:now}]});assert.equal(selectQuestion(pool,p2,{level:1,now}).id,'fixture-second');
 const p3=createPractice('A',{topic,day:2,sessionId:'full-history',now,exposures:Array.from({length:120},(_,i)=>({id:'old-'+i,seenAt:now}))});
 selectQuestion(pool,p3,{level:1,now});recordResponse(p3,'a',{now,activeMs:1000});selectQuestion(pool,p3,{level:1,now});recordResponse(p3,'a',{now,activeMs:2000});assert.equal(validPractice(p3),true);assert.notEqual(p3.attempts[0].id,p3.attempts[1].id);assert.equal(p3.exposures.length,120);
});

test('support cannot drop when changing layer, hiding help or restoring; no mastery claim',()=>{
 const p=practice();selectQuestion([base],p,{level:1,now});revealSupport(p,3,'answer',{now});revealSupport(p,1,'hint',{now});setPracticeLevel(p,5);
 assert.equal(p.assistance,3);assert.equal(validPractice(p),true);assert.equal(practiceOutcome(p).kind,'support-used');
 recordResponse(p,'a',{now,activeMs:1000});assert.equal(practiceOutcome(p).kind,'supported-reconstruction');assert.doesNotMatch(practiceOutcome(p).text,/已掌握/);
 const forged=structuredClone(p);forged.assistance=0;assert.equal(validPractice(forged),false);
 for(let i=0;i<150;i++)revealSupport(p,1,'hint',{now});assert.equal(p.events.length,PRACTICE_LIMITS.events);assert.equal(p.assistance,3);
});

test('numeric initial value or explicit unknown required, persisted once and roundtrips',()=>{
 for(const unknown of [false,true]){
  const p=practice(),q=selectQuestion([numericQuestion(topic,'seed')],p,{level:3,now});
  assert.equal(recordResponse(p,q.answer,{now}),null);
  assert.equal(recordNumericInitial(p,'123',{unknown}),true);assert.equal(recordNumericInitial(p,'456'),false);
  assert.deepEqual(q.numericInitial,unknown?{status:'unknown',value:''}:{status:'submitted',value:'123'});
  const a=recordResponse(p,q.answer,{now,activeMs:1000});assert.equal(a.result.correct,true);assert.equal(validPractice(p),true);
  assert.deepEqual(JSON.parse(JSON.stringify(p)),p);
 }
});

test('v2 state validates, first answers survive merge and conflicting snapshots remain untouched',()=>{
 const p=practice();selectQuestion([fixtures[2]],p,{level:2,now});recordResponse(p,['a','b'],{now,activeMs:1000});
 const s=emptyState(topic);s.records=[{id:'record1',day:2,activeMs:1000,reasoning:'原始推導',explanation:'',mistake:'',hint:1,errorType:'未判定',values:{},startedAt:now,updatedAt:now,submittedAt:now,curriculumVersion:'0.15.0',assessment:{text:'測試'},progressive:p}];
 assert.equal(validateState(s,topic),s);const original=JSON.stringify(s);
 assert.deepEqual(mergeStates(emptyState(topic),s),s);
 const conflict=structuredClone(s);conflict.records[0].progressive.attempts[0].answer=['a','c'];conflict.records[0].progressive.current.response=['a','c'];assert.throws(()=>mergeStates(s,conflict),/衝突/);assert.equal(JSON.stringify(s),original);
 const storage={getItem:()=>'{"other":"tab"}',setItem:()=>assert.fail('should not write')};assert.throws(()=>safeSave(storage,s,null),/另一個分頁/);
});

test('unknown answers with additional data and nonfinite timings do not produce corrupt attempts',()=>{
 const p=practice();selectQuestion([base],p,{level:1,now});const before=JSON.stringify(p);
 assert.equal(gradeQuestion(base,{unknown:true,answer:'a'}).complete,false);
 assert.equal(recordResponse(p,{unknown:true,answer:'a'},{now,activeMs:0}),null);
 for(const activeMs of [-1,Infinity,NaN,86400001]){assert.equal(recordResponse(p,'a',{now,activeMs}),null);assert.equal(canRetry(p,{activeMs}),false);}
 assert.equal(JSON.stringify(p),before);
 assert.equal(recordResponse(p,{unknown:true},{now,activeMs:100}).result.correct,false);assert.equal(validPractice(p),true);
});

test('numeric prompting alone does not count revealed candidates and first numeric input is bounded',()=>{
 const p=practice();selectQuestion([numericQuestion(topic,'bounds')],p,{level:3,now});
 assert.equal(p.assistance,0);assert.equal(p.events.length,0);
 for(const input of ['', 'abc', 'Infinity', 'NaN', '0x10', '1e999', '9'.repeat(101)])assert.equal(recordNumericInitial(p,input),false,input);
 assert.equal(p.current.numericInitial,undefined);assert.equal(recordNumericInitial(p,'-1.25e2',{now}),true);
 assert.equal(p.assistance,p.current.assistance);assert.deepEqual(p.current.numericInitial,{status:'submitted',value:'-1.25e2'});
 assert.equal(recordNumericInitial(p,'99'),false);assert.equal(validPractice(p),true);
});

test('time budget is cumulative per level across switching and unfinished numerical input survives',()=>{
 const p=practice(),q=selectQuestion([numericQuestion(topic,'parking')],p,{level:3,now});recordNumericInitial(p,'123',{now});q.response='b';const frozen=structuredClone(q);
 p.activeMs=180000;setPracticeLevel(p,1);selectQuestion([base],p,{level:1,now});p.current.response='c';
 p.activeMs=240000;setPracticeLevel(p,3);assert.deepEqual(selectQuestion([numericQuestion(topic,'parking')],p,{level:3,now}),frozen);
 assert.equal(canRetry(p,{activeMs:359999}),true);assert.equal(canRetry(p,{activeMs:360000}),false);
 assert.equal(p.levelSpentMs[3],180000);assert.equal(validPractice(p),true);
 setPracticeLevel(p,5);const original=structuredClone(p.current);selectQuestion([numericQuestion(topic,'parking')],p,{level:3,now});assert.equal(p.level,3);assert.deepEqual(p.current,original);p.current.response='a';assert.equal(validPractice(p),true);
});

test('v2 only accepts known bounded fields and prevents altered graded snapshot duplication',()=>{
 const p=practice();selectQuestion([base],p,{level:1,now});recordResponse(p,'a',{now,activeMs:10});
 const changes=[x=>x.extra='hidden',x=>x.events[0].extra={},x=>x.current.options[0].extra='unknown',x=>x.attempts[0].result.extra='unknown',x=>x.exposures[0].extra='unknown',x=>x.current.prompt='x'.repeat(8001),x=>x.current.result.correct=false,x=>x.attempts[0].id='different-id',x=>x.current.graded=false,x=>x.current.source.extra='unknown'];
 for(const change of changes){const mutated=structuredClone(p);change(mutated);assert.equal(validPractice(mutated),false);}
 assert.equal(validPractice(p),true);
 const duplicated=structuredClone(p);duplicated.current.graded=false;assert.equal(recordResponse(duplicated,'a',{now,activeMs:20}),null);assert.equal(duplicated.attempts.length,1);
});

test('bounded attempt count stops creation while retaining complete prior history',()=>{
 const p=practice();for(let i=0;i<60;i++){const q={...base,id:'limit-'+i};selectQuestion([q],p,{level:1,now});assert.ok(recordResponse(p,'a',{now,activeMs:i}));}
 assert.equal(p.attempts.length,60);assert.equal(selectQuestion([{...base,id:'overflow'}],p,{level:1,now}),null);assert.equal(canRetry(p),false);assert.equal(validPractice(p),true);
 const tooMany=structuredClone(p);tooMany.attempts.push(structuredClone(p.attempts[0]));assert.equal(validPractice(tooMany),false);
});

test('unsubmitted numeric draft roundtrips separately from immutable first numeric submission',()=>{
 const p=practice(),source=numericQuestion(topic,'numeric-draft');selectQuestion([source],p,{level:3,now});p.current.numericDraft=' 12.3e';
 assert.equal(validPractice(p),true,'unfinished numeric text is a draft, not yet a finite submitted number');
 const restored=JSON.parse(JSON.stringify(p));assert.equal(restored.current.numericDraft,' 12.3e');assert.equal(restored.current.numericInitial,undefined);assert.equal(restored.assistance,0);
 setPracticeLevel(restored,1);selectQuestion([base],restored,{level:1,now});setPracticeLevel(restored,3);selectQuestion([source],restored,{level:3,now});assert.equal(restored.current.numericDraft,' 12.3e');
 restored.current.numericDraft=' 12.3e2 ';assert.equal(recordNumericInitial(restored,restored.current.numericDraft,{now}),true);
 assert.deepEqual(restored.current.numericInitial,{status:'submitted',value:'12.3e2'});assert.equal(recordNumericInitial(restored,'9'),false);
 recordResponse(restored,restored.current.answer,{now,activeMs:1000});assert.equal(restored.attempts[0].question.numericDraft,' 12.3e2 ');assert.equal(restored.attempts[0].question.numericInitial.value,'12.3e2');assert.equal(validPractice(restored),true);
 const oversized=JSON.parse(JSON.stringify(p));oversized.current.numericDraft='1'.repeat(101);assert.equal(validPractice(oversized),false);
 const nonnumeric=practice();selectQuestion([base],nonnumeric,{level:1,now});nonnumeric.current.numericDraft='1';assert.equal(validPractice(nonnumeric),false);
});

test('parked numeric variant restores through the normal lesson bank without losing first input',()=>{
 for(const submitted of [false,true]){
  const p=practice(),numeric=numericQuestion(topic,'external-variant');selectQuestion([numeric],p,{level:3,now});p.current.numericDraft=' 73.25 ';
  if(submitted)recordNumericInitial(p,p.current.numericDraft,{now});
  const original=structuredClone(p.current);setPracticeLevel(p,1);selectQuestion(fixtures,p,{level:1,now});p.current.response=p.current.answer;
  setPracticeLevel(p,3);assert.deepEqual(selectQuestion(fixtures,p,{level:3,now}),original,'ordinary lesson bank deliberately does not contain the generated numeric id');
  assert.equal(p.current.numericDraft,' 73.25 ');assert.deepEqual(p.current.numericInitial,submitted?{status:'submitted',value:'73.25'}:undefined);assert.equal(validPractice(p),true);
 }
});


test('v2 import rejects a valid practice embedded under another subject or day without touching source',()=>{
 const p=practice(),q=selectQuestion(fixtures,p,{level:1,now});recordResponse(p,q.answer,{now,activeMs:1000});
 const r={id:'context-check',day:2,activeMs:1000,reasoning:'',explanation:'',mistake:'',hint:1,errorType:'未判定',values:{},startedAt:now,updatedAt:now,submittedAt:now,curriculumVersion:'0.15.0',assessment:{text:'測試'},progressive:p};
 const state=emptyState(topic);state.records=[r];assert.equal(validateState(state,topic),state);
 const before=JSON.stringify(state),other=structuredClone(state);other.topicId='reinforced-concrete';assert.throws(()=>validateState(other,other.topicId),/無效/);
 const wrongDay=structuredClone(state);wrongDay.records[0].day=3;assert.throws(()=>validateState(wrongDay,topic),/無效/);
 const draft=emptyState(topic);draft.drafts[3]=structuredClone(r);assert.throws(()=>validateState(draft,topic),/無效/);
 assert.equal(JSON.stringify(state),before);
});

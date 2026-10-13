import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStarts,startPreference,diagnosticRecommendation,moveOrder,priorCoreAssistance} from '../site/graded-ui.js';
import {meaningfulDraft,coachSummary,gradedAnswerText} from '../site/learning-flow.js';

test('subject starts remain isolated; existing learners default to C without repeated onboarding',()=>{
 const input={'structural-analysis':{startLevel:'A',configured:true},'steel-structures':{startLevel:'B',configured:true},unknown:{startLevel:'A'},'soil-foundations':{startLevel:'X'}};
 const p=normalizeStarts(input);assert.deepEqual(Object.keys(p),['structural-analysis','steel-structures']);
 assert.deepEqual(startPreference(p,'reinforced-concrete',true),{startLevel:'C',configured:true});
 assert.deepEqual(startPreference(p,'reinforced-concrete',false),{startLevel:'C',configured:false});
 assert.equal(startPreference(p,'steel-structures').startLevel,'B');assert.equal(input.unknown.startLevel,'A');
});

test('diagnostic recommendation uses each original answer once and does not overwrite mistakes with corrections',()=>{
 const rows=Array.from({length:10},(_,i)=>({question:{id:'d'+i,diagnostic:true},result:{correct:i<4}}));
 rows.push({question:{id:'d9',diagnostic:true},result:{correct:true}},{question:{id:'practice',diagnostic:false},result:{correct:true}});
 const result=diagnosticRecommendation(rows);assert.deepEqual(result,{complete:true,startLevel:'A',answered:10});
 assert.equal(diagnosticRecommendation(rows.slice(0,4)).complete,false);
});

test('keyboard and touch reorder moves only the chosen row and protects end boundaries',()=>{
 const first=['load','equilibrium','check'];assert.deepEqual(moveOrder(first,'equilibrium',-1),['equilibrium','load','check']);
 assert.deepEqual(moveOrder(first,'load',-1),first);assert.deepEqual(moveOrder(first,'check',1),first);
 assert.deepEqual(first,['load','equilibrium','check']);
});

test('a submitted recognition response counts as a draft and its original numeric answer appears in coach export',()=>{
 assert.equal(meaningfulDraft({values:{},progressive:{version:2,attempts:[{}]}}),true);
 const progressive={version:2,sessionId:'test-session',startLevel:'A',assistance:3,attempts:[{question:{id:'numeric-original',version:1,prompt:'求有效應力',numericInitial:{status:'submitted',value:'73.0'}},answer:'wrong',result:{correct:false},assistance:1}]};
 const record={id:'original',day:2,submittedAt:'2026-10-13T12:00:00.000Z',activeMs:1000,reasoning:'原始推導',explanation:'',mistake:'',hint:3,errorType:'未判定',values:{},assessment:{text:'待核對'},progressive};
 const before=structuredClone(record),text=coachSummary({records:[record],drafts:{}},'土壤力學');
 assert.match(text,/73\.0/);assert.match(text,/wrong/);assert.match(text,/原始推導/);assert.deepEqual(record,before);
});

test('weekly practice opens only after the original paper is submitted, including A/B and prior hints',async()=>{
 const {gradedAccess,D02_STARTERS}=await import('../site/graded-ui.js');
 for(const startLevel of ['A','B','C'])for(const inWork of [false,true]){
  assert.deepEqual(gradedAccess({day:7,startLevel,inWork,assistance:3}),{weeklyLocked:true,allowed:false});
  assert.deepEqual(gradedAccess({day:7,startLevel,inWork,submitted:true}),{weeklyLocked:false,allowed:true});
 }
 assert.equal(gradedAccess({day:2,startLevel:'A'}).allowed,true);
 assert.equal(gradedAccess({day:2,startLevel:'B'}).allowed,true);
 assert.equal(gradedAccess({day:2,startLevel:'C'}).allowed,false);
 assert.equal(gradedAccess({day:2,startLevel:'C',inWork:true}).allowed,true);
 assert.equal(Object.keys(D02_STARTERS).length,5);
 assert.match(D02_STARTERS['structural-dynamics'],/x = u − u_g/);
 assert.doesNotMatch(D02_STARTERS['structural-analysis'],/R_B=4|R_A=8/);
});


test('coach and history answers use frozen labels for typed responses, preserving order and units',()=>{
 const options=[{id:'a',text:'先畫受力圖'},{id:'b',text:'再列平衡式'}];
 assert.equal(gradedAnswerText({type:'multi',options},['b','a']),'再列平衡式；先畫受力圖');
 assert.equal(gradedAnswerText({type:'order',options},['b','a']),'1. 再列平衡式 → 2. 先畫受力圖');
 assert.equal(gradedAnswerText({type:'fill',fields:[{id:'f',label:'我的起式',options}]},{f:'a'}),'我的起式：先畫受力圖');
 assert.equal(gradedAnswerText({type:'single',options},{unknown:true}),'目前不知道');
});


test('same-day assistance uses all merged records and never becomes a permanent preference',()=>{
 const at=new Date(2026,9,13,15),stamp=new Date(2026,9,13,10).toISOString(),old=new Date(2026,9,12,10).toISOString();
 const record=(day,submittedAt,assistance)=>({day,submittedAt,progressive:{version:2,assistance}});
 const rows=[record(2,stamp,3),record(2,old,0),record(2,stamp,1),record(3,stamp,3)];
 assert.equal(priorCoreAssistance([{day:2,submittedAt:stamp,hint:3}],2,at),3);assert.equal(priorCoreAssistance([{day:2,submittedAt:stamp,progressive:{version:1,assistance:2}}],2,at),2);assert.equal(priorCoreAssistance([{day:2,submittedAt:stamp,answerViewed:true}],2,at),3);assert.equal(priorCoreAssistance(rows,2,at),3);assert.equal(priorCoreAssistance(rows,1,at),0);assert.equal(priorCoreAssistance(rows,2,new Date(2026,9,14,10)),0);
});

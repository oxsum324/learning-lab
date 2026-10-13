import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_BANK} from '../site/graded-bank.js';
import {createPractice,selectQuestion,setPracticeLevel,recordResponse,validPractice} from '../site/graded-practice.js';
test('changing assistance level preserves each unfinished question, option order and partial input',()=>{
 const bank=QUESTION_BANK.filter(q=>q.topic==='structural-analysis'&&q.day===2),p=createPractice('A',{topic:'structural-analysis',day:2});
 const q1=selectQuestion(bank,p,{level:1});q1.response=q1.options[0].id;const first=structuredClone(q1);
 setPracticeLevel(p,2);const q2=selectQuestion(bank,p,{level:2});q2.response=q2.type==='multi'?[q2.options[0].id]:{};
 const second=structuredClone(q2);setPracticeLevel(p,4);setPracticeLevel(p,1);
 assert.deepEqual(selectQuestion(bank,p,{level:1}),first);
 assert.equal(validPractice(p),true);const restored=JSON.parse(JSON.stringify(p));
 setPracticeLevel(restored,2);assert.deepEqual(selectQuestion(bank,restored,{level:2}),second);
 recordResponse(restored,second.answer);setPracticeLevel(restored,1);assert.deepEqual(selectQuestion(bank,restored,{level:1}),first);
 assert.equal(validPractice(restored),true);
 assert.equal(validPractice({...restored,parked:{4:first}}),false);
});

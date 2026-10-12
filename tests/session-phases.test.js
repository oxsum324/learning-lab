import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOPICS} from '../site/topics.js';
import {sessionKind,sessionPhases,phaseAt,referenceLocked,referenceAccess,recordHint} from '../site/session-phases.js';
import {normalizeNotes,mergeNotes,pendingReview,reviewDate,notesMarkdown} from '../site/practice-notes.js';
import {normalizePrefs} from '../site/learning-flow.js';
import {emptyState} from '../site/core.js';

test('all 450 session schedules sum to their targets with continuous boundaries and unchanged exam limits',()=>{
 for(const topic of Object.keys(TOPICS))for(let day=1;day<=30;day++)for(const target of [30,45,60]){
  const phases=sessionPhases(target,day,topic);assert.equal(phases.reduce((sum,p)=>sum+p.minutes,0),target);
  assert.equal(phases[0].startMs,0);phases.forEach((p,i)=>{assert.equal(p.endMs-p.startMs,p.minutes*60000);if(i)assert.equal(p.startMs,phases[i-1].endMs);});
  const kind=sessionKind(day,topic);if(kind!=='ordinary'){assert.equal(phases[1].endMs,30*60000);if(target>30)assert.equal(phases[2].id,'correction');}
 }
 assert.deepEqual(sessionPhases(30,1,'structural-analysis').map(p=>p.minutes),[3,5,15,4,3]);
 assert.deepEqual(sessionPhases(30,1,'reinforced-concrete').map(p=>p.minutes),[3,5,17,5]);
 assert.equal(sessionKind(24,'structural-analysis'),'ordinary','structural day 24 is not an original-exam session');
});
test('structural weekly sessions include the existing D23 mixed test and keep 25 plus 5 at every preference',()=>{
 const topic='structural-analysis';
 assert.deepEqual(Array.from({length:30},(_,i)=>i+1).filter(d=>sessionKind(d,topic)==='weekly'),[7,14,21,23,28,29]);
 for(const day of [7,14,21,23,28,29])for(const minutes of [30,45,60]){
  const phases=sessionPhases(minutes,day,topic);
  assert.deepEqual(phases.slice(0,2).map(p=>p.minutes),[25,5]);
  assert.equal(referenceLocked(phases,1499999),true);assert.equal(referenceLocked(phases,1500000),false);
  if(minutes>30)assert.deepEqual([phases[2].id,phases[2].minutes],['correction',minutes-30]);
 }
 const d23=JSON.parse(readFileSync(new URL('../site/curriculum.json',import.meta.url),'utf8')).days[22];
 assert.match(d23.task,/J／W3.*週測/);assert.match(d23.problem,/J｜/);assert.match(d23.problem,/W3｜/);
 for(const day of [22,24,25,26,27])assert.equal(sessionKind(day,topic),'ordinary');
});
test('structural D30 is a 20 plus 10 delayed retest; other subjects retain weekly and original-exam limits',()=>{
 for(const minutes of [30,45,60]){
  assert.equal(sessionKind(30,'structural-analysis'),'final');
  const final=sessionPhases(minutes,30,'structural-analysis');
  assert.deepEqual(final.slice(0,2).map(p=>[p.label,p.minutes]),[['閉卷重做',20],['結案整理',10]]);
  assert.equal(referenceLocked(final,1199999),true);assert.equal(referenceLocked(final,1200000),false);
  for(const topic of Object.keys(TOPICS).filter(t=>t!=='structural-analysis')){
   assert.deepEqual(sessionPhases(minutes,7,topic).slice(0,2).map(p=>p.minutes),[20,10]);
   for(const day of [24,25,26,27])assert.deepEqual(sessionPhases(minutes,day,topic).slice(0,2).map(p=>p.minutes),[25,5]);
   assert.equal(sessionKind(30,topic),'ordinary');
  }
 }
});
test('phase boundaries and reference locks use active time, with submission unlocking immediately',()=>{
 const phases=sessionPhases(30,1,'structural-analysis');assert.equal(phaseAt(phases,179999),0);assert.equal(phaseAt(phases,180000),1);assert.equal(phaseAt(phases,1800000),-1);
 assert.equal(referenceLocked(phases,1379999),true);assert.equal(referenceLocked(phases,1380000),false);assert.equal(referenceLocked(phases,0,true),false);
 assert.equal(referenceLocked(sessionPhases(45,1,'structural-analysis'),1380000),true);
});
test('hint recording is monotonic, full answers imply level 3 and unsupported levels cannot unlock',()=>{
 const d={hint:0,answerViewed:false};recordHint(d,1);assert.equal(d.hint,1);assert.equal(d.answerViewed,false);recordHint(d,2);recordHint(d,1);assert.equal(d.hint,2);recordHint(d,3);recordHint(d,1);assert.equal(d.hint,3);assert.equal(d.answerViewed,true);assert.throws(()=>recordHint(d,0));
 assert.equal(recordHint({hint:0,answerViewed:true},2).hint,3);
});
test('concept preparation is free, work requires a default level 1 choice, and answer gates are unchanged',()=>{
 for(const topic of Object.keys(TOPICS)){
  const phases=sessionPhases(30,1,topic),draft={hint:0,answerViewed:false};
  for(const ms of [0,120000,180000,479999]){
   const access=referenceAccess('concept-details',phases,ms);
   assert.deepEqual(access,{locked:false,hint:0});if(access.hint)recordHint(draft,access.hint);
  }
  assert.equal(draft.hint,0,'reading the scheduled concepts must not add a hint');assert.equal(draft.answerViewed,false);
  const working=referenceAccess('concept-details',phases,480000,{started:true});
  assert.deepEqual(working,{locked:true,hint:1});assert.equal(draft.hint,0,'opening or cancelling the selection must not itself record a hint');recordHint(draft,working.hint);assert.equal(draft.hint,1);
  assert.deepEqual(referenceAccess('concept-details',phases,phases.at(-1).endMs),{locked:true,hint:1});
  assert.deepEqual(referenceAccess('concept-details',phases,480000,{submitted:true}),{locked:false,hint:0});
  for(const id of ['guide-details','answer-details']){
   assert.deepEqual(referenceAccess(id,phases,0),{locked:true,hint:3});
   assert.deepEqual(referenceAccess(id,phases,phases.find(p=>p.id==='work').endMs),{locked:false,hint:3});
   assert.deepEqual(referenceAccess(id,phases,0,{submitted:true}),{locked:false,hint:0});
  }
 }
 const weekly=sessionPhases(30,7,'structural-analysis');assert.equal(referenceAccess('concept-details',weekly,0,{started:false}).locked,false);assert.equal(referenceAccess('concept-details',weekly,0,{started:true}).locked,true);
});
test('local review reminders use calendar days, resolve on a later submission and preserve the original attempt',()=>{
 const s=emptyState();s.records=[{id:'original',day:1,submittedAt:'2026-10-11T01:00:00Z',mistake:'原稿'}];const before=structuredClone(s),n=normalizeNotes();n.reviews[1]={due:'2026-10-13',scheduledAt:'2026-10-11T02:00:00Z'};
 assert.equal(reviewDate(new Date(2026,11,31,23)),'2027-01-02');assert.ok(pendingReview(n,s,1));assert.deepEqual(s,before);
 s.records.push({id:'redo',day:1,submittedAt:'2026-10-14T00:00:00Z'});assert.equal(pendingReview(n,s,1),null);
});
test('notes round-trip separately, merge edits and cannot alter immutable records or cloud state',()=>{
 const n=normalizeNotes({feedback:'手機工具',mistakes:{original:{mistake:'補充錯因',updatedAt:'2026-10-11T00:00:00Z'}},reviews:{1:{due:'2026-10-13',scheduledAt:'2026-10-11T00:00:00Z'},99:{due:'2026-10-13',scheduledAt:'2026-10-11T00:00:00Z'}}});
 const s=emptyState();s.records=[{id:'original',day:1,mistake:'原稿'}];const before=structuredClone(s),exported=JSON.parse(JSON.stringify({...s,localPracticeNotes:n}));assert.deepEqual(normalizeNotes(exported.localPracticeNotes),n);assert.equal(n.reviews[99],undefined);assert.match(notesMarkdown(n,s.records),/補充錯因/);assert.deepEqual(s,before);assert.equal(s.localPracticeNotes,undefined);
 const merged=mergeNotes(n,{feedback:'平板操作',mistakes:{original:{mistake:'新補充',updatedAt:'2026-10-12T00:00:00Z'}}});assert.match(merged.feedback,/手機工具[\s\S]*平板操作/);assert.equal(merged.mistakes.original.mistake,'新補充');assert.equal(mergeNotes(merged,n).mistakes.original.mistake,'新補充');
 assert.equal(normalizeNotes({feedback:'a'.repeat(9000)}).feedback.length,8000);
});
test('start-in-practice preference defaults on and respects an explicit opt out',()=>{
 assert.equal(normalizePrefs().startToday,true);assert.equal(normalizePrefs({startToday:false}).startToday,false);
});
test('decorative eyebrows contain no four-letter uppercase English words and only the brand retains English decoration',()=>{
 for(const file of ['index.html','app.js','learning-flow.js']){
  const source=readFileSync(new URL('../site/'+file,import.meta.url),'utf8');
  for(const match of source.matchAll(/class="eyebrow"[^>]*>([^<]*)</g))assert.doesNotMatch(match[1],/[A-Z]{4,}/,file);
  assert.doesNotMatch(source,/YOUR DAILY PRACTICE|PICK UP WHERE YOU LEFT OFF|REVISIT & UNDERSTAND|RECORD & REFLECT|KEEP YOUR PROGRESS|MAKE ROOM FOR LEARNING|THE ART OF UNDERSTANDING/);
 }
});

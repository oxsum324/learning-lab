import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOPICS} from '../site/topics.js';
import {sessionKind,sessionPhases,phaseAt,referenceLocked,recordHint} from '../site/session-phases.js';
import {normalizeNotes,mergeNotes,pendingReview,reviewDate,notesMarkdown} from '../site/practice-notes.js';
import {normalizePrefs} from '../site/learning-flow.js';
import {emptyState} from '../site/core.js';

test('all 450 session schedules sum to their targets with continuous boundaries and unchanged exam limits',()=>{
 for(const topic of Object.keys(TOPICS))for(let day=1;day<=30;day++)for(const target of [30,45,60]){
  const phases=sessionPhases(target,day,topic);assert.equal(phases.reduce((sum,p)=>sum+p.minutes,0),target);
  assert.equal(phases[0].startMs,0);phases.forEach((p,i)=>{assert.equal(p.endMs-p.startMs,p.minutes*60000);if(i)assert.equal(p.startMs,phases[i-1].endMs);});
  const kind=sessionKind(day,topic);if(kind!=='ordinary'){assert.equal(phases[0].minutes,kind==='exam'?25:20);assert.equal(phases[1].endMs,30*60000);if(target>30)assert.equal(phases[2].id,'correction');}
 }
 assert.deepEqual(sessionPhases(30,1,'structural-analysis').map(p=>p.minutes),[3,5,15,4,3]);
 assert.deepEqual(sessionPhases(30,1,'reinforced-concrete').map(p=>p.minutes),[3,5,17,5]);
 assert.equal(sessionKind(24,'structural-analysis'),'ordinary','structural day 24 is not an original-exam session');
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

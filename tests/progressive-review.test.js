import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOPICS} from '../site/topics.js';
import {GUIDES} from '../site/teaching-guides.js';
import {STAGES,newReview,validReview,reviewMaterial,markSupport,recognitionResult,reviewOutcome,recommendedStage} from '../site/progressive-review.js';
import {emptyState,validateState,mergeStates,assess} from '../site/core.js';
import {needsReview,meaningfulDraft,nextLesson,normalizePrefs} from '../site/learning-flow.js';

test('all 150 lessons provide unselected text candidates and partial derivation from their own guide',()=>{
 for(const [topic,t] of Object.entries(TOPICS)){
  const course=JSON.parse(readFileSync(new URL('../site/'+t.curriculum,import.meta.url),'utf8'));
  for(const lesson of course.days){
   const guide=lesson.guide??GUIDES[lesson.day],m=reviewMaterial(lesson,topic,guide),p=newReview();
   assert.equal(recognitionResult(m,p).complete,false);assert.equal(recognitionResult(m,p).passed,false);
   assert.equal(m.starter,guide.worked[0]);assert.ok(m.complete.includes(lesson.check));assert.equal(m.draw,guide.draw.map(line=>line.replace(/[-−+]?\d+(?:\.\d+)?/g,'＿＿')).join('\n'));
   for(const q of m.questions){assert.equal(new Set(q.options.map(o=>o.text)).size,3);assert.equal(q.options.filter(o=>o.id===q.correct).length,1);p.selections[q.id]=q.correct;}
   assert.equal(reviewOutcome(p,m).kind,'recognized');assert.match(reviewOutcome(p,m).text,/不等於獨立掌握/);
   for(const stage of Object.keys(STAGES)){p.stage=stage;assert.ok(validReview(p));assert.ok(reviewOutcome(p,m).text);}
  }
 }
});
test('wrong or incomplete recognition cannot promote; hints and switching cannot masquerade as independence',()=>{
 const m={questions:[{id:'model',correct:'0',prompt:'模型',options:[{id:'0',text:'平衡'},{id:'1',text:'忽略平衡'}]}]},p=newReview();
 assert.equal(reviewOutcome(p,m).kind,'retry');p.selections.model='1';assert.equal(recognitionResult(m,p).passed,false);
 markSupport(p,1);p.stage='guided';markSupport(p,2);markSupport(p,1);assert.equal(p.assistance,2);
 p.stage='independent';p.mode='advanced';assert.equal(reviewOutcome(p,m).assistance,2);assert.match(reviewOutcome(p,m).text,/含候選或提示/);
 const fresh=newReview('independent');assert.match(reviewOutcome(fresh,m).text,/仍待教練審閱/);assert.equal(reviewOutcome(fresh,m,1).assistance,1);assert.equal(reviewOutcome(fresh,m,0,true).assistance,3);
 assert.equal(recommendedStage([{day:1,progressive:newReview(),assessment:{review:{kind:'retry'}}}],1),'recognize');
 assert.equal(recommendedStage([{day:1,progressive:newReview(),assessment:{review:{kind:'recognized'}}}],1),'guided');
 assert.equal(recommendedStage([{day:1,progressive:newReview('guided')}],1),'independent');
});
test('old and progressive records/drafts retain schema, raw answers, grades and conflict protections',()=>{
 for(const topic of Object.keys(TOPICS)){
  const s=emptyState(topic),raw={activeMs:0,reasoning:'原稿',explanation:'',mistake:'',hint:0,errorType:'未判定',values:{},updatedAt:'2026-10-12T00:00:00Z'};
  const old={...raw,id:'old',day:1,submittedAt:raw.updatedAt,curriculumVersion:'v1',assessment:assess([],{})};
  s.records=[old,{...structuredClone(old),id:'new',progressive:newReview('guided')}];s.drafts[2]={...raw,progressive:newReview()};
  const before=structuredClone(s);assert.deepEqual(validateState(JSON.parse(JSON.stringify(s)),topic),before);assert.deepEqual(mergeStates(s,s),before);
  assert.equal(needsReview(s.records[1]),true);assert.equal(meaningfulDraft(s.drafts[2]),true);const fresh={...raw,reasoning:'',progressive:newReview('independent')};assert.equal(meaningfulDraft(fresh),false);fresh.progressive.selectedStage=true;assert.equal(meaningfulDraft(fresh),true);
  const b=structuredClone(s);b.drafts[2].progressive.stage='independent';assert.throws(()=>mergeStates(s,b),/衝突/);assert.deepEqual(s,before);
  for(const p of [null,{}, {...newReview(),stage:'mastered'},{...newReview(),assistance:99},{...newReview(),selections:{model:'<script>'}}]){const bad=structuredClone(s);bad.drafts[2].progressive=p;assert.throws(()=>validateState(bad,topic));}
 }
});
test('advanced preference survives normalization and an empty next independent attempt does not trap resume',()=>{
 assert.equal(normalizePrefs({reviewMode:'advanced'}).reviewMode,'advanced');assert.equal(normalizePrefs({reviewMode:'invalid'}).reviewMode,'progressive');
 const s=emptyState();s.records=[{id:'done',day:1,progressive:newReview('independent'),submittedAt:'2026-10-12T00:00:00Z'}];
 s.drafts[1]={activeMs:0,hint:0,errorType:'未判定',values:{},reasoning:'',explanation:'',mistake:'',progressive:newReview('independent')};
 assert.equal(nextLesson(s).day,2);s.drafts[1].progressive.selectedStage=true;assert.equal(nextLesson(s).day,1);
 const attempts=[{id:'recent',day:1,submittedAt:'2026-10-12T00:00:00Z',progressive:newReview('guided')},{id:'older',day:1,submittedAt:'2026-10-01T00:00:00Z',progressive:newReview(),assessment:{review:{kind:'retry'}}}];
 assert.equal(recommendedStage(attempts,1),'independent');assert.equal(attempts[0].id,'recent');
});

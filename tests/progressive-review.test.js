import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REVIEW_CONTENT,diagramDrawing} from '../site/review-content.js';
import {validDrawing} from '../site/drawing-model.js';
import {TOPICS} from '../site/topics.js';
import {GUIDES} from '../site/teaching-guides.js';
import {STAGES,newReview,validReview,reviewMaterial,markSupport,recognitionResult,reviewOutcome,recommendedStage} from '../site/progressive-review.js';
import {emptyState,validateState,mergeStates,assess} from '../site/core.js';
import {needsReview,meaningfulDraft,nextLesson,normalizePrefs} from '../site/learning-flow.js';

test('all 150 lessons honestly distinguish authored recognition from guided-only coverage',()=>{
 for(const [topic,t] of Object.entries(TOPICS)){
  const course=JSON.parse(readFileSync(new URL('../site/'+t.curriculum,import.meta.url),'utf8'));
  for(const lesson of course.days){
   const guide=lesson.guide??GUIDES[lesson.day],m=reviewMaterial(lesson,topic,guide),p=newReview();
   assert.equal(recognitionResult(m,p).complete,false);assert.equal(recognitionResult(m,p).passed,false);
   assert.equal(m.starter,guide.worked[0]);assert.ok(m.complete.includes(lesson.check));assert.equal(m.draw,guide.draw.map(line=>line.replace(/[-−+]?\d+(?:\.\d+)?/g,'＿＿')).join('\n'));
   for(const q of m.questions){assert.equal(new Set(q.options.map(o=>o.text)).size,3);assert.equal(q.options.filter(o=>o.id===q.correct).length,1);p.selections[q.id]=q.correct;}
   if(m.questions.length){assert.equal(reviewOutcome(p,m).kind,'recognized');assert.match(reviewOutcome(p,m).text,/不等於獨立掌握/);}else{assert.equal(m.coverage,'guided-only');assert.equal(recognitionResult(m,p).passed,false);assert.equal(reviewOutcome(p,m).kind,'unsupported');}
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

test('every registered diagram has three distinguishable valid candidates and an incomplete editable scaffold',()=>{
 let count=0;for(const [topic,t] of Object.entries(TOPICS)){const course=JSON.parse(readFileSync(new URL('../site/'+t.curriculum,import.meta.url),'utf8'));assert.ok(REVIEW_CONTENT[topic][2].visual,'all five D02 have physical models');for(const lesson of course.days){const m=reviewMaterial(lesson,topic,lesson.guide??GUIDES[lesson.day]);if(!m.scaffold)continue;count++;assert.ok(validDrawing(m.scaffold.drawing));const q=m.questions.find(q=>q.id==='diagram');assert.equal(q.options.length,3);assert.equal(new Set(q.options.map(o=>JSON.stringify(o.drawing))).size,3);for(const o of q.options){assert.ok(validDrawing(o.drawing));assert.ok(o.alt.length>=6);assert.ok(!/正確|錯誤/.test(o.alt),'alt text describes content without answer flags');}assert.notDeepEqual(m.scaffold.drawing,q.options.find(o=>o.id==='0').drawing);assert.ok(m.scaffold.task.includes('補'));}}assert.equal(count,22);
});
test('quantity distractors use exercise-specific error sources, and legacy IDs cannot fill new questions',()=>{
 const expected={'structural-analysis':[6,4],'reinforced-concrete':[75,103.806],'steel-structures':[6000,4008],'structural-dynamics':[400,3.1831],'soil-foundations':[19.064,25.9965]};for(const [topic,t] of Object.entries(TOPICS)){const c=JSON.parse(readFileSync(new URL('../site/'+t.curriculum,import.meta.url),'utf8')),d=c.days[1],m=reviewMaterial(d,topic,d.guide??GUIDES[2]);const q=m.questions.find(q=>q.id==='quantity');assert.ok(q);assert.deepEqual(REVIEW_CONTENT[topic][2].quantity.wrong,expected[topic]);assert.equal(q.options.find(o=>o.id==='0').text.split(' ')[0],String(Number(d.fields.find(f=>f.id===REVIEW_CONTENT[topic][2].quantity.field).value.toPrecision(7))));for(const o of q.options.filter(o=>o.id!=='0'))assert.ok(o.reason.length>=6);const old=newReview();old.selections={model:'0',number:'0'};old.checked=true;assert.equal(validReview(old),true);assert.equal(recognitionResult(m,old).complete,false);assert.deepEqual(old.selections,{model:'0',number:'0'});}
});
test('primary five diagrams and candidate quantities agree with independently calculated exercise physics',()=>{
 const quantities={
  'structural-analysis':12*(6-2)/6,
  'reinforced-concrete':1500*420/(.85*28*300),
  'steel-structures':2*150*12+8*(300-2*12),
  'structural-dynamics':Math.sqrt(400000/1000),
  'soil-foundations':2.65*9.81/(1+.5)
 };
 for(const [topic,expected] of Object.entries(quantities)){
  const c=JSON.parse(readFileSync(new URL('../site/'+TOPICS[topic].curriculum,import.meta.url),'utf8')),lesson=c.days[1],spec=REVIEW_CONTENT[topic][2],field=lesson.fields.find(f=>f.id===spec.quantity.field);
  assert.ok(Math.abs(field.value-expected)<Math.max(expected*.00001,.00001),topic+' uses actual exercise quantity');
  for(const wrong of spec.quantity.wrong)assert.ok(Math.abs(wrong-expected)>expected*.01,topic+' wrong candidates cannot pass numeric tolerance');
 }
 const beam=diagramDrawing(REVIEW_CONTENT['structural-analysis'][2].visual),load=beam.sheets.workspace.find(s=>s.type==='arrow');assert.equal(load.x1,380);assert.ok(load.y2>load.y1);assert.deepEqual(beam.sheets.workspace.filter(s=>['pin','roller'].includes(s.type)).map(s=>s.type),['pin','roller']);
 const rc=reviewMaterial(JSON.parse(readFileSync(new URL('../site/rc-curriculum.json',import.meta.url))).days[1],'reinforced-concrete',{worked:['起式'],draw:['圖解']});assert.equal(rc.scaffold.drawing.sheets.workspace.filter(s=>s.type==='rect').length,1,'compression block is left for completion');
 const phase=diagramDrawing(REVIEW_CONTENT['soil-foundations'][2].visual);assert.ok(phase.sheets.workspace.some(s=>s.type==='line'&&s.x1===650&&s.y1===60&&s.y2===260),'void bracket includes air and water, not solids');
});

test('option order is stable on restoration without a common five-subject correct-position shortcut',()=>{
 const positions=new Set();for(const [topic,t] of Object.entries(TOPICS)){const d=JSON.parse(readFileSync(new URL('../site/'+t.curriculum,import.meta.url),'utf8')).days[1],g=d.guide??GUIDES[2],a=reviewMaterial(d,topic,g),b=reviewMaterial(d,topic,g);assert.deepEqual(a.questions,b.questions);positions.add(a.questions.find(q=>q.id==='diagram').options.findIndex(o=>o.id==='0'));}assert.ok(positions.size>1);
});

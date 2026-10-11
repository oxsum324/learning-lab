import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyState,assess} from '../site/core.js';
import {TOPICS} from '../site/topics.js';
import {emptyWorkspace,shape} from '../site/drawing-model.js';
import {meaningfulDraft,needsReview,dayStatus,nextLesson,lessonMode,practiceBudget,normalizePrefs,coachSummary} from '../site/learning-flow.js';
import {validateMedia} from '../scripts/approved-media.mjs';

const record=(day,id,extra={})=>({id,day,activeMs:60000,reasoning:'我的推導',explanation:'白話',mistake:'',hint:0,errorType:'無明顯錯誤',values:{},submittedAt:'2026-10-10T00:00:00Z',assessment:assess([],{}),...extra});
test('resume prioritizes meaningful drafts, ignores visited empty lessons and then chooses the next unsubmitted day',()=>{
 const s=emptyState();s.drafts[9]={values:{},reasoning:' ',drawing:emptyWorkspace('beam-full')};assert.equal(meaningfulDraft(s.drafts[9]),false);assert.equal(nextLesson(s).day,1);
 s.records.push(record(1,'one'));assert.equal(nextLesson(s).day,2);
 s.drafts[8]={explanation:'重新理解',updatedAt:'2026-10-09T00:00:00Z'};s.drafts[3]={hint:3,answerViewed:true,updatedAt:'2026-10-10T00:00:00Z'};assert.equal(nextLesson(s).day,3);
 s.drafts[4]={drawing:emptyWorkspace('beam-full')};s.drafts[4].drawing.sheets.workspace=[shape('line')];assert.equal(meaningfulDraft(s.drafts[4]),true);
});
test('review follows the latest attempt and never interprets an ungraded response as failure or mastery',()=>{
 const s=emptyState(),bad=record(2,'old',{assessment:{total:2,correct:1},submittedAt:'2026-10-09T00:00:00Z'});s.records.push(bad);assert.equal(dayStatus(s,2).review,true);
 const corrected=record(2,'new',{assessment:{total:2,correct:2}});s.records.push(corrected);assert.equal(dayStatus(s,2).review,false);assert.equal(dayStatus(s,2).label,'已提交');
 assert.equal(needsReview(record(3,'pending',{errorType:'未判定'})),false);
 for(const extra of [{hint:2},{answerViewed:true},{errorType:'受力模型'},{mistake:'單位需訂正'}])assert.equal(needsReview(record(3,'review',extra)),true);
 assert.equal(s.records[0],bad,'status queries must not reorder original history');
});
test('after all days are submitted the oldest unresolved review comes first',()=>{
 const s=emptyState();for(let d=1;d<=30;d++)s.records.push(record(d,String(d)));
 assert.equal(nextLesson(s).day,30);s.records[5].hint=2;assert.equal(nextLesson(s).day,6);
});
test('preferences accept only supported values and safe per-subject days',()=>{
 const p=normalizePrefs({minutes:999,largeText:'yes',reduceMotion:true,lastDays:{'structural-analysis':30,'soil-foundations':31,'steel-structures':1,unknown:9}});
 assert.deepEqual(p,{minutes:30,largeText:false,reduceMotion:true,startToday:true,lastDays:{'structural-analysis':30,'steel-structures':1}});
 assert.equal(normalizePrefs({minutes:45}).minutes,45);assert.equal(normalizePrefs(null).minutes,30);
});
test('all 150 lessons have an honest task mode and schedules matching duration and real test days',()=>{
 for(const[id,t]of Object.entries(TOPICS)){
  const course=JSON.parse(readFileSync(new URL('../site/'+t.curriculum,import.meta.url),'utf8'));
  for(const d of course.days){assert.ok(lessonMode(d,id).label);for(const n of [30,45,60]){const b=practiceBudget(n,d.day,id),parts=[...b.text.matchAll(/(\d+) 分/g)].map(m=>Number(m[1]));assert.equal(parts.reduce((a,b)=>a+b,0),n);}}
  if(id!=='structural-analysis')for(const d of course.days.slice(23,27))assert.equal(lessonMode(d,id).label,'官方原卷練習');
 }
 assert.match(practiceBudget(30,21,'structural-analysis').text,/閉卷作答/);assert.match(practiceBudget(30,23,'soil-foundations').text,/閱讀/);
 const rc=JSON.parse(readFileSync(new URL('../site/rc-curriculum.json',import.meta.url),'utf8'));assert.match(rc.days[0].guide.draw.join(''),/同一張畫布/);assert.doesNotMatch(rc.days[0].guide.draw.join(''),/受力圖頁|內力圖頁|變形圖頁/);
});
test('coach summary preserves original notes and does not mutate or regrade history',()=>{
 const s=emptyState();s.records=[record(2,'two'),record(1,'one',{mistake:'應補力矩平衡',hint:3,values:{ra:'30'}})];const before=structuredClone(s),summary=coachSummary(s,'結構學');assert.match(summary,/ra = 30/);
 assert.ok(summary.indexOf('D01')<summary.indexOf('D02'));assert.match(summary,/應補力矩平衡/);assert.match(summary,/提示：3/);assert.match(summary,/完整圖形/);assert.deepEqual(s,before);
});
test('approved illustration is size-limited and any replacement or unknown binary requires new visual review',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../scripts/public-media.json',import.meta.url))),path='site/assets/study-atelier-v1.jpg',bytes=readFileSync(new URL('../'+path,import.meta.url));
 validateMedia(path,bytes,manifest);assert.throws(()=>validateMedia('site/unreviewed.jpg',bytes,manifest),/Unapproved/);
 const changed=Buffer.from(bytes);changed[50]^=1;assert.throws(()=>validateMedia(path,changed,manifest),/changed/);assert.throws(()=>validateMedia(path,Buffer.alloc(400000),manifest),/invalid/);
});

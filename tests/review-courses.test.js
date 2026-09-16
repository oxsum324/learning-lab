import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOPICS,resolveTopic,storageKey,dayKey} from '../site/topics.js';
import {emptyState,validateState,mergeStates,safeSave} from '../site/core.js';
import {emptyDrawing,shape} from '../site/drawing-model.js';
const ids=Object.keys(TOPICS),added=ids.slice(2),version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
test('five topics keep ten disjoint production and sandbox keys with legacy compatibility',()=>{
 assert.equal(ids.length,5);assert.equal(storageKey(ids[0]),'learning-lab:v1');assert.equal(storageKey(ids[1]),'learning-lab:reinforced-concrete:v1');
 assert.equal(new Set(ids.flatMap(id=>[storageKey(id),storageKey(id,true)])).size,10);
 assert.equal(new Set(ids.flatMap(id=>[dayKey(id),dayKey(id,true)])).size,10);
 ids.forEach(id=>assert.equal(resolveTopic('?topic='+id),id));
});
test('all new topics preserve drawings, timer, drafts and attempts; all cross-topic imports reject',()=>{
 const db=new Map(),storage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)};
 for(const id of ids){
  const s=emptyState(id),drawing=emptyDrawing();drawing.sheets.force=[shape('arrow')];
  const draft={activeMs:45000,reasoning:id,explanation:'模型說明',mistake:'',hint:3,answerViewed:true,errorType:'方法選擇',values:{},startedAt:'2026-09-16T00:00:00Z',updatedAt:'2026-09-16T00:00:45Z',drawing};
  s.drafts[2]=draft;s.records.push({...draft,day:1,id:id+'-attempt',submittedAt:draft.updatedAt,curriculumVersion:'test',assessment:{text:'待審閱'}});
  safeSave(storage,s,null);const restored=validateState(JSON.parse(db.get(storageKey(id))),id);assert.deepEqual(restored,s);assert.deepEqual(mergeStates(s,restored),s);
  for(const other of ids.filter(t=>t!==id)){assert.throws(()=>validateState(s,other),/主題不同/);assert.throws(()=>mergeStates(emptyState(other),s),/主題不同/);}
 }
 assert.equal(db.size,5);
});
test('90 review tasks contain hints and diagnostics never reveal answers before reference opens',()=>{
 for(const id of added){const c=JSON.parse(readFileSync(new URL('../site/'+TOPICS[id].curriculum,import.meta.url)));
  assert.equal(c.topicId,id);assert.equal(c.days.length,30);assert.match(c.answers,/尚未提供30份逐題數值詳解/);
  c.days.forEach((d,i)=>{assert.equal(d.day,i+1);for(const key of ['read','task','check','problem'])assert.ok(d[key]);assert.ok(d.guide.worked.length>=3);assert.ok(d.guide.plain.length>20);assert.ok(d.guide.draw.length>=2);});
  assert.match(c.days[0].problem,/診斷|閉卷|作答/);assert.ok(c.sources.some(s=>s.url.includes('code=114180')));
  if(id==='structural-dynamics'){assert.doesNotMatch(c.days[0].problem,/0\.628|0\.06/);assert.match(c.days[0].guide.worked.join(' '),/0\.628/);}
  if(id==='soil-foundations'){assert.doesNotMatch(c.days[0].problem,/66\.57|29\.43/);assert.match(c.days[0].guide.worked.join(' '),/66\.57/);}
 }
});
test('all five curricula expose only approved seed checks on D01-D07, D14 and D23',()=>{
 const seeded=new Set([1,2,3,4,5,6,7,14,23]);
 for(const id of ids){
  const c=JSON.parse(readFileSync(new URL('../site/'+TOPICS[id].curriculum,import.meta.url)));
  c.days.forEach(day=>{
   if(!seeded.has(day.day))assert.deepEqual(day.fields,[],`${id} D${day.day}`);
   else assert.ok(day.fields.length>0,`${id} D${day.day}`);
   assert.equal(new Set(day.fields.map(field=>field.id)).size,day.fields.length,`${id} D${day.day}`);
   day.fields.forEach(field=>{assert.match(field.id,/^[a-z][a-z0-9_]*$/);assert.ok(field.label);assert.ok(Number.isFinite(field.value));assert.ok(field.unit);});
  });
 }
});
test('independent blind-solve corrections override only the affected public checks',()=>{
 const read=id=>JSON.parse(readFileSync(new URL('../site/'+TOPICS[id].curriculum,import.meta.url)));
 const value=(course,day,id)=>course.days[day-1].fields.find(field=>field.id===id)?.value;
 assert.equal(value(read('structural-analysis'),7,'r_b'),12.1519);assert.equal(value(read('structural-analysis'),7,'m_a'),-31.3924);
 assert.equal(value(read('reinforced-concrete'),7,'as_req'),1256.959);assert.equal(value(read('reinforced-concrete'),7,'a'),73.939);
 assert.equal(value(read('structural-dynamics'),5,'dy_c05_base_shear'),117.6);
});
test('runtime modules use the package release version so cached legacy code cannot reject new topics',()=>{
 for(const file of ['app.js','core.js','drawing.js']){const code=readFileSync(new URL('../site/'+file,import.meta.url),'utf8');for(const match of code.matchAll(/from ['"]([^'"]+)['"]/g))assert.equal(match[1].split('?v=')[1],version);}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOPICS} from '../site/topics.js';
import {reviewedQuestion} from '../scripts/course-editorial.mjs';
import {GUIDES} from '../site/teaching-guides.js';
const courses=Object.fromEntries(Object.entries(TOPICS).map(([id,t])=>[id,JSON.parse(readFileSync(new URL('../site/'+t.curriculum,import.meta.url),'utf8'))]));
const day=(topic,n)=>courses[topic].days[n-1];
const value=(topic,n,id)=>day(topic,n).fields.find(f=>f.id===id)?.value;
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<0.001,`${actual} vs ${expected}`);

test('all published lessons carry final editorial review and standalone daily instructions',()=>{
 for(const [id,c] of Object.entries(courses)){
  assert.equal(c.version,id+'-2026-09-v4','Run inject-seed-fields after curriculum generation');
  for(const d of c.days){
   assert.ok(d.activity);
   const prose=[d.activity,d.check,d.problem,...(d.guide?.worked??[]),d.guide?.plain??''].join('\n');
   assert.doesNotMatch(prose,/留到|留待|下週|下一輪|先選定教材或筆記/);
   assert.doesNotMatch(d.problem,/規範係數對照表\.md|骨架來源：|來源骨架：|^## /m);
   for(const match of d.problem.matchAll(/^D(\d{2})-[A-Z]｜/gm))assert.equal(Number(match[1]),d.day);
   for(const f of d.fields)for(const match of f.label.matchAll(/D(\d{2})/g))assert.equal(Number(match[1]),d.day);
   if(d.fields.length&&id!=='structural-analysis'){
    assert.match(d.problem,/依下列條件作答/);
    assert.doesNotMatch(d.problem,/本課為教材自選題|先選一題/);
   }
  }
 }
 assert.throws(()=>reviewedQuestion('steel-structures','missing',undefined),/Missing question/);
});

test('steel weekly tasks assess current member and connection topics with corresponding values',()=>{
 const t='steel-structures';
 assert.doesNotMatch(day(t,7).problem,/ST_C07|側扭屈曲/);
 for(const n of [11,14]){
  assert.match(day(t,n).problem,/梁側扭屈曲簡化插值/);
  near(value(t,n,'st_c07_mn'),200-(200-100)*(5-3)/(9-3));
  near(value(t,n,'st_c07_design_strength'),150);
 }
 assert.match(day(t,14).problem,/梁柱軸力與彎矩互制/);
 near(value(t,14,'st_w23b_interaction'),350/700+60/160);
 assert.match(day(t,23).problem,/螺栓群題設強度/);
 near(value(t,23,'st_w14b_strength'),0.75*2*120);
 assert.match(day(t,16).guide.plain,/摩阻|摩擦/);
 assert.match(day(t,18).guide.plain,/偏心|轉動/);
});

test('soil weekly CU and consolidation checks have full conditions and correct dimensions',()=>{
 const t='soil-foundations',d=day(t,14);
 assert.match(d.problem,/σ3=100 kPa/);assert.match(d.problem,/150 kPa/);assert.match(d.problem,/u=40 kPa/);
 near(value(t,14,'so_review_cu_sigma1'),100+150);
 near(value(t,14,'so_review_cu_sigma1_eff'),100+150-40);
 near(value(t,14,'so_review_cu_sigma3_eff'),100-40);
 near(value(t,14,'so_w23b_time_ratio'),0.8/0.2);
 near(value(t,14,'so_w23b_time_t2'),5*0.8/0.2);
 assert.equal(day(t,5).fields.find(f=>f.id==='so_c05_discharge').unit,'m³/s/m');
 assert.deepEqual(day(t,23).fields,[]);assert.doesNotMatch(day(t,23).problem,/SO_W23A|SO_W23B/);
});

test('dynamics checks distinguish input from response and keep damping dimensionless',()=>{
 const t='structural-dynamics';
 assert.match(day(t,6).problem,/初始位移與速度皆為零/);
 assert.match(day(t,7).problem,/不能僅由此決定瞬時相對位移方向/);
 assert.equal(day(t,4).fields.find(f=>f.id==='dy_c04_damping_ratio').unit,'無因次');
 assert.equal(day(t,23).fields.filter(f=>f.id==='r'||f.id==='dy_w23a_frequency_ratio').length,1);
 for(const topic of [t,'soil-foundations']){
  const problem=day(topic,30).problem;
  assert.equal([...problem.matchAll(/^[1-8]\. /gm)].length,8);
 }
});

test('RC specified-stress balance is not represented as a verified strain-compatible section',()=>{
 const t='reinforced-concrete';
 for(const n of [4,7]){
  assert.match(day(t,n).problem,/未由應變相容求得/);
  assert.doesNotMatch(day(t,n).problem,/同D04|沿用D|採D01/);
  const concrete=0.85*28*400*170/1000;
  const moment=concrete*0.115+2*1200*420/1000*0.15;
  near(value(t,n,'pn'),concrete);near(value(t,n,'mn'),moment);
  near(value(t,n,'phi_pn'),concrete*0.65);near(value(t,n,'phi_mn'),moment*0.65);
 }
});

test('structural reference answers match scoped partial exercises and both weekly questions',()=>{
 assert.doesNotMatch(GUIDES[15].worked.join(' '),/R_B=9|R_A=15|截面M\(x\)/);
 assert.doesNotMatch(GUIDES[16].worked.join(' '),/ΣFy|相容式.*得到R_B/);
 assert.match(GUIDES[14].worked.join(' '),/W2b.*P=12/);
 assert.match(GUIDES[23].worked.join(' '),/W3.*L=3/);
 assert.doesNotMatch(GUIDES[30].worked.join(' '),/下週|下一輪/);
});

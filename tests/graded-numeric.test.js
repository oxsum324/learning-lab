import test from 'node:test';
import assert from 'node:assert/strict';
import {numericModel,numericQuestion} from '../site/graded-numeric.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('numeric variants match independently written fixed hand-calculation references',()=>{
 near(numericModel('structural-analysis',{L:6,a:2,P:12}).value,8);
 near(numericModel('reinforced-concrete',{b:300,d:500,As:1500,fc:28,fy:420,beta:.85,Es:200000}).value,287.20588235294116);
 const s=numericModel('steel-structures',{H:300,bf:150,tw:8,tf:12});near(s.value,Math.sqrt(88709184/5808));
 near(numericModel('structural-dynamics',{m:1000,k:400000}).value,Math.PI/10);
 near(numericModel('soil-foundations',{Gs:2.65,e:.5,w:.1,gw:9.81}).value,17.331);
});
test('numeric templates reject physical and ambiguous-option boundaries',()=>{
 assert.throws(()=>numericModel('structural-analysis',{L:6,a:6,P:12}));
 assert.throws(()=>numericModel('structural-analysis',{L:6,a:3,P:12}));
 assert.throws(()=>numericModel('reinforced-concrete',{b:300,d:500,As:6000,fc:28,fy:420,beta:.85,Es:200000}));
 assert.throws(()=>numericModel('steel-structures',{H:20,bf:10,tw:8,tf:12}));
 assert.throws(()=>numericModel('structural-dynamics',{m:0,k:400000}));
 assert.throws(()=>numericModel('soil-foundations',{Gs:2.65,e:.5,w:.5,gw:9.81}));
});
test('five numeric families stay deterministic and physically consistent over 500 seeds',()=>{
 for(const topic of ['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'])for(let i=0;i<100;i++){
  const q=numericQuestion(topic,i);assert.deepEqual(q,numericQuestion(topic,i));
  assert.equal(q.options.length,3);assert.equal(new Set(q.options.map(o=>o.text)).size,3);
  const p=q.numericMeta.parameters,v=q.numericMeta.correct;
  if(topic==='structural-analysis'){const rb=p.P*p.a/p.L;near(v+rb,p.P);near(v*p.L,p.P*(p.L-p.a));}
  if(topic==='structural-dynamics')near(p.k*(v/(2*Math.PI))**2,p.m);
  if(topic==='soil-foundations'){near(v*(1+p.e),p.Gs*p.gw);assert.ok(p.w*p.Gs/p.e<=1);}
 }
});

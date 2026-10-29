import test from 'node:test';
import assert from 'node:assert/strict';
import {concreteBeta1,numericModel,numericQuestion,numericParameterSets,numericQuestionFromParameters} from '../site/graded-numeric.js';
import {createPractice,selectQuestion,recordNumericInitial,recordResponse,validPractice} from '../site/graded-practice.js';
import {rcCanonical,rcDisplay} from '../site/rc-units.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const topics=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
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
test('beta1 follows the Taiwan MPa intervals, bounds and intermediate strengths',()=>{
 for(const [fc,beta] of [[17,.85],[27.999,.85],[28,.85],[28.001,.85-.05*.001/7],[31.5,.825],[35,.80],[42,.75],[49,.70],[55.999,.65+.05*.001/7],[56,.65],[56.001,.65],[70,.65]])near(concreteBeta1(fc),beta);
 for(const fc of [16.999,0,-1,NaN,Infinity,'35'])assert.throws(()=>concreteBeta1(fc));
 assert.throws(()=>numericModel('reinforced-concrete',{b:300,d:500,As:1200,fc:35,fy:420,beta:.85,Es:200000}),/β1/);
 // With a=155 mm, using the stale .85 would admit this section; the corrected
 // .80 gives epsilonT < .005 and must fail the existing lesson-model guard.
 assert.throws(()=>numericModel('reinforced-concrete',{b:300,d:500,As:3293.75,fc:35,fy:420,beta:.80,Es:200000}),/延性假設/);
 assert.match(numericModel('reinforced-concrete',{b:300,d:500,As:1200,fc:31.5,fy:420,Es:200000}).prompt,/β1=0\.825/);
});
test('all 139 unique finite parameter combinations pass independent physics checks and visible output checks',()=>{
 const counts=[36,24,36,16,27];let total=0,fc35=0;
 for(const [index,topic] of topics.entries()){
  const sets=numericParameterSets(topic);assert.equal(sets.length,counts[index]);assert.equal(new Set(sets.map(p=>JSON.stringify(p))).size,sets.length);
  for(const [i,parameters] of sets.entries()){
  const before=structuredClone(parameters),q=numericQuestionFromParameters(topic,parameters,'complete-'+i);assert.deepEqual(parameters,before);
  assert.equal(q.options.length,3);assert.equal(new Set(q.options.map(o=>o.text)).size,3);
  const p=q.numericMeta.parameters,shown=q.numericMeta.correct,v=topic==='reinforced-concrete'?rcCanonical(shown,'kN·m'):shown;
  const result=numericModel(topic,p);near(result.value,result.check);
  assert.equal(q.numericMeta.tolerance,Math.max(1e-6,.01*Math.abs(shown)),'learner tolerance remains 1% of the displayed quantity; it is not the calculation verification tolerance');
  assert.ok(q.numericMeta.tolerance>1e-8*Math.max(1,Math.abs(shown)));
  for(const other of result.values.slice(1)){const candidate=topic==='reinforced-concrete'?rcDisplay(other,'kN·m'):other;assert.ok(Math.abs(candidate-shown)>q.numericMeta.tolerance,'distractor outside learner tolerance');}
  if(topic==='structural-analysis'){const rb=p.P*p.a/p.L;near(v+rb,p.P);near(v*p.L,p.P*(p.L-p.a));}
  if(topic==='reinforced-concrete'){
   // An independent equilibrium-first calculation: solve neutral-axis depth from C=T,
   // then integrate compression stress about the tensile reinforcement.
   const expectedBeta=p.fc===28?.85:.80,T=p.As*p.fy,stress=.85*p.fc;
   const c=T/(stress*p.b*expectedBeta),a=expectedBeta*c,strain=.003*(p.d/c-1);
   const integral=stress*p.b*(p.d*a-a*a/2)/1e6;
   near(v,integral);near(p.beta,expectedBeta);assert.ok(a<p.d);assert.ok(strain>p.fy/p.Es);assert.ok(strain>=.005);
   assert.match(q.prompt,new RegExp('β1='+expectedBeta.toFixed(2).replace('.','\\.')));assert.ok(q.explanation.includes('c=a/β1='+c.toFixed(4)));
   assert.ok(q.explanation.includes('εt=0.003(d−c)/c='+strain.toFixed(6)));assert.doesNotMatch(q.prompt,/0\.7999/);assert.equal(q.version,3);
   if(p.fc===35)fc35++;
  }
  if(topic==='steel-structures'){
   const webHeight=p.H-2*p.tf,area=2*p.bf*p.tf+p.tw*webHeight;
   const eachFlange=p.bf*p.tf**3/12+p.bf*p.tf*((p.H-p.tf)/2)**2;
   near(v**2*area,2*eachFlange+p.tw*webHeight**3/12);assert.ok(p.H>2*p.tf&&p.bf>p.tw);
  }
  if(topic==='structural-dynamics')near(p.k*(v/(2*Math.PI))**2,p.m);
  if(topic==='soil-foundations'){near(v*(1+p.e),p.Gs*p.gw);assert.ok(p.w*p.Gs/p.e<=1);}
  if(topic!=='reinforced-concrete')assert.equal(q.version,1);
  total++;
  }
 }
 assert.equal(total,139);assert.equal(fc35,12);
});
test('seeded questions stay deterministic and inside the fully enumerated parameter domains',()=>{
 const canonical=p=>JSON.stringify(Object.entries(p).sort(([a],[b])=>a.localeCompare(b)));
 for(const topic of topics){
  const domain=new Set(numericParameterSets(topic).map(canonical));
  for(const seed of ['seed','bounds','parking','blind-0150',0,1,42,999]){
   const q=numericQuestion(topic,seed);assert.deepEqual(q,numericQuestion(topic,seed));assert.ok(domain.has(canonical(q.numericMeta.parameters)));
  }
 }
 const a=numericParameterSets('reinforced-concrete');a[0].b=99999;assert.equal(numericParameterSets('reinforced-concrete')[0].b,300);
});
test('legacy RC version 1 snapshots keep their original beta, wording and first response after restoration',()=>{
 const topic='reinforced-concrete',now='2026-10-14T00:00:00.000Z';
 const current=numericQuestionFromParameters(topic,{b:300,d:500,As:1200,fc:35,fy:420,Es:200000},'legacy-rc',{rcUnits:'si'});
 const old=structuredClone(current);old.version=1;old.numericMeta.parameters.beta=.85;
 old.prompt="矩形梁 f'c=35 MPa；題設 β1=0.85，求名義彎矩 Mn。";old.explanation='原版本題設與推導保留。';
 const practice=createPractice('A',{topic,day:2,sessionId:'legacy-rc-snapshot',now});selectQuestion([old],practice,{level:3,now});
 assert.equal(recordNumericInitial(practice,'123.45',{now}),true);const original=JSON.stringify(practice);
 const restored=JSON.parse(original);selectQuestion([current],restored,{level:3,now});assert.equal(JSON.stringify(restored),original);
 const answer=recordResponse(restored,'b',{now,activeMs:1000});assert.ok(answer);assert.equal(validPractice(restored),true);
 assert.equal(answer.question.version,1);assert.equal(answer.question.numericMeta.parameters.beta,.85);assert.equal(answer.question.prompt,old.prompt);assert.equal(answer.question.numericInitial.value,'123.45');
});

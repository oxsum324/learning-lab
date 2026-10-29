import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questions as gradedRC} from '../site/graded-content/reinforced-concrete.js';
import {numericModel,numericParameterSets,numericQuestionFromParameters} from '../site/graded-numeric.js';
import {emptyState,validateState,mergeStates} from '../site/core.js';
import {verificationStates} from '../site/verification/sample-data.js';
import {rcLegacyCourse,rcLegacyDay,rcDisplay,rcCanonical,rcUnit} from '../site/rc-units.js';

const topic='reinforced-concrete';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const classic=read('site/rc-curriculum.json');
const studio=read('site/studio/content/reinforced-concrete.json');
const near=(a,b,note='',tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${note}: ${a} != ${b}`);
const forbidden=/MPa|kPa|kN\/m[²2]/;
const stressToSI=(value,unit)=>{
  assert.equal(unit,'kgf/cm²','目前RC應力輸入、核對欄位採 kgf/cm²');
  return value*.0980665;
};

test('RC display boundary uses exact standard gravity and reverses stress, force and area-load conversions',()=>{
  for(const [siUnit,unit,value,expected] of [
    ['MPa','kgf/cm²',28,28/.0980665],
    ['kN','tf',9.80665,1],
    ['kN·m','tf·m',19.6133,2],
    ['kN/m²','tf/m²',9.80665,1],
    ['kPa','tf/m²',100,100/9.80665]
  ]){
    assert.equal(rcUnit(siUnit),unit);
    near(rcDisplay(value,siUnit),expected,siUnit);
    near(rcCanonical(rcDisplay(value,siUnit),siUnit),value,siUnit+' roundtrip');
  }
});

test('all current RC classic lessons and graded recognition material use Taiwan display units',()=>{
  assert.equal(classic.days.length,30);
  const displayed=rcLegacyCourse(classic);
  assert.doesNotMatch(JSON.stringify(displayed),forbidden,'舊版入口仍會顯示課文、參考與欄位，不能只改studio');
  assert.doesNotMatch(JSON.stringify(gradedRC),forbidden,'包含選項理由與詳解，不能留下原SI單位辨識題');
  assert.match(JSON.stringify(displayed),/kgf\/cm²/);
  assert.match(JSON.stringify(displayed),/tf\/m²/);
});

test('classic display conversion is idempotent and preserves the SI source and rounded answer physics',()=>{
  const source=structuredClone(classic),displayed=rcLegacyCourse(classic);
  assert.deepEqual(classic,source);
  assert.deepEqual(rcLegacyCourse(displayed),displayed);
  const day14=displayed.days[13],vc=day14.fields.find(f=>f.id==='vc');
  assert.equal(vc.unit,'tf');
  near(vc.value*9.80665,.33*Math.sqrt(28)*1800*200/1000,'舊穿孔題原始核對值保留',1e-6);
  assert.doesNotMatch(day14.problem,/Vc=0\.33√f['′]c\s*b0d[。；\n]/,'fc換重力單位後根號式係數也須換算');
});

test('150 studio RC cases, original-task panels, solutions and all 90 warmup slots contain no SI stress labels',()=>{
  assert.equal(studio.lessons.length,30);
  assert.equal(studio.lessons.flatMap(l=>l.cases).length,150);
  assert.equal(studio.lessons.flatMap(l=>l.warmups).length,90);
  for(const l of studio.lessons){
    // The preserved SI source lesson has a separate display boundary; its source remains intact.
    const displayed={...l,original:rcLegacyDay(l.original)};
    assert.doesNotMatch(JSON.stringify(displayed),forbidden,`RC D${l.day}: 題面、詳解、原課文及暖身選項一致`);
  }
});

test('all dynamic D02 RC parameter combinations render kgf/cm² without changing the section physics',()=>{
  const parameters=numericParameterSets(topic);
  assert.ok(parameters.length>=24);
  for(const p of parameters){
    const question=numericQuestionFromParameters(topic,p,'unit-audit');
    const result=numericModel(topic,p);
    assert.doesNotMatch(JSON.stringify(question),forbidden);
    assert.match(question.prompt,/kgf\/cm²/);
    const stress=question.prompt.match(/f['′]c\s*[=＝]\s*([\d.]+)\s*kgf\/cm²/);
    assert.ok(stress,'題面列出混凝土強度與kgf/cm²');
    near(Number(stress[1])*.0980665,p.fc,'混凝土強度物理值保持',1e-6);
    assert.ok(Number.isFinite(result.value));
    const a=p.As*p.fy/(.85*p.fc*p.b),expected=p.As*p.fy*(p.d-a/2)/1e6;
    assert.equal(result.unit,'kN·m','內部解題函式保留SI，不受顯示單位影響');
    near(result.value,expected,'內部名義彎矩獨立核算');
    assert.equal(question.numericMeta.unit,'tf·m','公開題目與數值輸入使用傳統單位');
    near(question.numericMeta.correct*9.80665,expected,'公開題目名義彎矩換算');
  }
});

test('studio prestress and punching stress answers preserve their physical values after conversion',()=>{
  for(const l of studio.lessons)for(const c of l.cases){
    if(c.index===3)continue;
    const p={...c.params};
    if(p.P!==undefined)p.P*=9.80665;
    if(p.Vu!==undefined)p.Vu*=9.80665;
    if(c.model==='prestress'){
      const axial=p.P*1000/p.A,bending=p.P*1000*p.e/p.Z*(c.condition?-1:1);
      near(stressToSI(c.fields[0].value,c.fields[0].unit),axial+bending,c.id+' bottom');
      near(stressToSI(c.fields[1].value,c.fields[1].unit),axial-bending,c.id+' top');
    }
    if(c.model==='punch')near(stressToSI(c.fields[0].value,c.fields[0].unit),p.Vu*1000/(p.bo*p.d*(c.condition?1.2:1)),c.id);
    if(c.model==='prestress-range')near(stressToSI(c.fields[1].value,c.fields[1].unit),p.P*1000/p.A,c.id);
  }
});

test('inverse slab area-load questions convert their expected numerical input to tf/m²',()=>{
  const inverse=studio.lessons.find(l=>l.cases[0].model==='slab').cases[3];
  assert.equal(inverse.unknown,'q');
  assert.equal(inverse.fields[0].unit,'tf/m²');
  near(inverse.fields[0].value,inverse.params.q,inverse.id);
  const p=inverse.params,base=studio.lessons.find(l=>l.cases[0].model==='slab').cases[0];
  near(base.fields[0].value*9.80665,p.q*9.80665*p.L**2/8,'面載重與每公尺帶彎矩採同一力單位');
});

test('displayed torsion and T-beam gravity-unit formulas reproduce their answer values',()=>{
  for(const c of studio.lessons.flatMap(l=>l.cases)){
    const p=c.params;
    if(c.model==='torsion'){
      const area=p.Ao*(c.condition?.75:1),flow=p.T*1e7/(2*area),steelArea=10*flow*p.s/p.fy;
      assert.match(c.steps.join('\n'),/q=T×10⁷\/\(2Ao\)/,c.id+' 剪流公式');
      assert.match(c.steps.join('\n'),/At=10 q s\/fy/,c.id+' 箍筋mm²公式');
      if(c.index===3)near(c.target.value,flow,c.id+' inverse q');
      else{near(c.fields[0].value,flow,c.id+' kgf/cm');near(c.fields[1].value,steelArea,c.id+' mm²');}
    }
    if(c.model==='tbeam'){
      const hf=p.hf*(c.condition?.5:1),pressure=.85*p.fc,T=p.As*p.fy/100;
      const aFlange=100*T/(pressure*p.bf);
      const a=aFlange<=hf?aFlange:hf+(100*T-pressure*p.bf*hf)/(pressure*p.bw);
      const flange=pressure*p.bf*Math.min(a,hf)/100,web=pressure*p.bw*Math.max(a-hf,0)/100;
      near(flange+web,T,c.id+' kgf 內力平衡');
      const moment=(flange*(p.d-Math.min(a,hf)/2)+web*(p.d-(a+hf)/2))/1e6;
      assert.match(c.steps.join('\n'),/Mn=\(T d−Cw a\/2−Cf hf\/2\)\/10⁶；T、Cw、Cf 採 kgf/,c.id+' kgf·mm轉tf·m');
      near(c.index===3?c.target.value:c.fields[0].value,moment,c.id+' tf·m');
    }
  }
});

test('a full restore retains legacy RC wording and numerical originals without applying display conversions to history',()=>{
  const original=verificationStates(topic,'20261029-rc-unit-history')[1];
  assert.ok(original.records.length>0);
  original.records[0].reasoning='舊稿原文：f′c=28 MPa；fy=420 MPa；應保留原稿及當時單位。';
  original.records[0].values={...original.records[0].values,legacy_stress:'10.25'};
  const before=structuredClone(original);
  validateState(original,topic);
  const restored=mergeStates(emptyState(topic),JSON.parse(JSON.stringify(original)));
  assert.deepEqual(restored,before);
  assert.deepEqual(original,before);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STEEL_STRESS,steelUnit,steelDisplay,steelCanonical,steelText,steelLegacyDay,steelLegacyCourse} from '../site/steel-units.js';
import {rcLegacyCourse,rcLegacyDay,rcText} from '../site/rc-units.js';
import {QUESTION_BANK,getQuestions} from '../site/graded-bank.js';
import {numericParameterSets,numericQuestionFromParameters} from '../site/graded-numeric.js';
import {MODELS,evaluate} from '../site/studio/models.js';
import {emptyState,validateState,mergeStates,assess} from '../site/core.js';
import {verificationStates} from '../site/verification/sample-data.js';
import {curriculumHash} from '../scripts/curriculum-hash.mjs';
import {TOPICS} from '../site/topics.js';

const topic='steel-structures';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const raw=fs.readFileSync(new URL('../site/steel-curriculum.json',import.meta.url)),classic=JSON.parse(raw);
const studio=read('site/studio/content/steel-structures.json');
const near=(a,b,note='',tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${note}: ${a} != ${b}`);
// SI force/stress labels that current gravity-unit subjects must not show; the flange-thickness symbol tf is not a unit.
const SI=/MPa|GPa|N\/mm[²2]|kPa|kN(?![A-Za-z])/;
const GRAVITY=/kgf|tf\/cm²|tf·m|tf\/m²|\d\s*tf(?![A-Za-z])/;

test('steel unit boundary uses exact standard gravity for stress, force, moment and stiffness products',()=>{
 near(STEEL_STRESS,98.0665);
 for(const [si,unit,value,expected] of [['MPa','tf/cm²',98.0665,1],['N/mm²','tf/cm²',245.16625,2.5],['GPa','tf/cm²',.0980665,1],['kN','tf',9.80665,1],['kN·m','tf·m',19.6133,2],['kN-m','tf·m',9.80665,1],['kN/m','tf/m',9.80665,1],['N·mm²','tf·cm²',980665,1],['N·mm⁴','tf·cm⁴',9.80665e7,1],['N·mm','tf·cm',980665,1],['kPa','tf/m²',9.80665,1]]){
  assert.equal(steelUnit(si),unit);near(steelDisplay(value,si),expected,si);near(steelCanonical(expected,si),value,si+' canonical');near(steelCanonical(steelDisplay(-2.5,si),si),-2.5,si+' sign');
 }
 for(const unit of ['mm','mm²','mm³','mm⁴','m','deg','','ratio']){assert.equal(steelUnit(unit),unit);assert.equal(steelDisplay(71,unit),71);}
 assert.throws(()=>steelDisplay(NaN,'MPa'),/有限/);assert.throws(()=>steelCanonical('2.5','kN'),/有限/);
});

test('steel text conversion rounds displayed givens to six significant digits, keeps symbols and is idempotent',()=>{
 assert.equal(steelText('Fy=250 MPa、Fu=400 MPa、Pu=300 kN、M=120 kN-m'),'Fy=2.54929 tf/cm²、Fu=4.07886 tf/cm²、Pu=30.5915 tf、M=12.2366 tf·m');
 assert.equal(steelText('E=200000 MPa；GJ=80000000000 N·mm²'),'E=2039.43 tf/cm²；GJ=81577.3 tf·cm²');
 assert.equal(steelText('翼板厚 tf=12 mm、tw=8 mm；λc=(KL/r)/π×sqrt(Fy/E)'),'翼板厚 tf=12 mm、tw=8 mm；λc=(KL/r)/π×sqrt(Fy/E)');
 assert.equal(steelText('單位：kN、kN-m 與 MPa'),'單位：tf、tf·m 與 tf/cm²');
 const once=steelText('Fy=250 MPa、Pu=300 kN、Ag=1,600 mm²');assert.equal(steelText(once),once);assert.match(once,/Ag=1,600 mm²/);
});

test('classic steel course stays locked at its SI source while the displayed copy uses tf and tf/cm² everywhere',()=>{
 assert.equal(curriculumHash(raw),read('docs/studio-content-canonical-baseline.json')['steel-curriculum.json']);
 const before=JSON.stringify(classic),view=steelLegacyCourse(classic);
 assert.equal(JSON.stringify(classic),before);assert.equal(view.days.length,30);
 assert.doesNotMatch(JSON.stringify(view),SI,'課文、參考、欄位與來源標籤不得殘留 SI 力與應力單位');
 assert.match(JSON.stringify(view),/tf\/cm²/);
 for(const [i,day] of view.days.entries()){
  assert.match(day.problem,/傳統制代入約定/);
  for(const [j,field] of day.fields.entries()){const original=classic.days[i].fields[j];assert.equal(field.id,original.id);assert.equal(field.unit,steelUnit(original.unit));near(steelCanonical(field.value,original.unit),original.value,field.id);}
  if(day.fields.length){const values=Object.fromEntries(day.fields.map(f=>[f.id,String(f.value)]));assert.equal(assess(day.fields,values).correct,day.fields.length,'D'+(i+1));}
 }
 assert.match(view.days[2].problem,/Fy=2\.54929 tf\/cm²、Pu=30\.5915 tf、Pa=19\.3746 tf/);
 assert.equal(view.days[2].fields[0].unit,'tf');near(view.days[2].fields[0].value*9.80665,360,'D03 φRn');
 assert.match(view.days[10].problem,/Mp=20\.3943 tf·m、Mr=10\.1972 tf·m/);near(view.days[10].fields[0].value*9.80665,classic.days[10].fields[0].value,'D11 Mn');
 assert.deepEqual(steelLegacyCourse(view),view);assert.equal(steelLegacyDay(view.days[5]).problem,view.days[5].problem);
});

test('all 62 steel recognition questions are authored in exam units and the dimensional question moved to a new id',()=>{
 const steel=QUESTION_BANK.filter(q=>q.topic===topic);
 assert.equal(steel.length,62);
 for(const q of steel)assert.doesNotMatch(JSON.stringify(q),SI,q.id);
 assert.equal(steel.some(q=>q.id==='st-d01-diag-unit'),false);
 const unit=steel.find(q=>q.id==='st-d01-diag-unit-tf');
 assert.ok(unit);assert.equal(unit.day,1);assert.equal(unit.type,'multi');assert.deepEqual(unit.answer,['b','c']);
 assert.match(unit.prompt,/tf\/cm²/);assert.match(unit.explanation,/除以100/);
 assert.equal(getQuestions(topic,1).some(q=>q.id==='st-d01-diag-unit-tf'),true);
});

test('all 36 steel D02 numeric variants stay geometric (mm) with no SI force or stress wording',()=>{
 const sets=numericParameterSets(topic);assert.equal(sets.length,36);
 for(const [i,p] of sets.entries()){const q=numericQuestionFromParameters(topic,p,'steel-unit-'+i);assert.equal(q.numericMeta.unit,'mm');assert.equal(q.version,1);assert.doesNotMatch(JSON.stringify(q),SI,q.id);}
});

test('studio steel models default to the exam-paper material values while shared SI models stay untouched',()=>{
 const vars=id=>Object.fromEntries(MODELS[id].vars.map(v=>[v.symbol,v]));
 assert.equal(vars('steel-tension').Fy.value,2.5);assert.equal(vars('steel-tension').Fy.unit,'tf/cm²');assert.equal(vars('steel-tension').Fu.value,4.1);
 assert.equal(vars('buckling').E.value,2040);assert.equal(vars('buckling').E.unit,'tf/cm²');
 assert.equal(vars('ltb').GJ.unit,'tf·cm²');assert.equal(vars('torsional').ECw.unit,'tf·cm⁴');
 assert.equal(vars('steel-capacity').M.unit,'tf·m');assert.equal(vars('steel-interaction').Pu.unit,'tf');
 for(const id of ['capacity','interaction'])for(const v of MODELS[id].vars)assert.doesNotMatch(v.unit,GRAVITY,id+' 仍供動力科使用');
 for(const id of ['asdlrfd','h-section','steel-tension','block','buckling','torsional','classification','steel-bending','ltb','steel-shear','steel-interaction','bolt','weld','eccentric','plastic','fatigue','steel-capacity']){
  assert.equal(MODELS[id].unitSystem,'taiwan-gravity',id);
  for(const text of [MODELS[id].formula,MODELS[id].assumptions,MODELS[id].change,MODELS[id].pitfall])assert.doesNotMatch(text,SI,id);
 }
 const tension=evaluate('steel-tension',{Ag:3000,An:2400,Fy:2.5,Fu:4.1});near(tension[0].value,67.5,'0.90×2.5×3000/100');near(tension[1].value,67.5);
 near(evaluate('steel-bending',{Fy:2.5,S:600000,Z:680000})[0].value,2.5*680000/1e5,'Mp=Fy Z/10⁵');
 near(evaluate('weld',{w:6,L:200,F:1.4})[0].value,.707*6*200*1.4/100,'角銲 tf');
 near(evaluate('fatigue',{dF:10,A:2500,allow:.6})[0].value,100*10/2500,'應力範圍 tf/cm²');
 near(evaluate('buckling',{L:3000,E:2040,I:8e6,K:1})[0].value,Math.PI**2*2040*8e6/(100*3000**2),'Euler tf');
 near(evaluate('ltb',{Lb:3000,E:2040,Iy:4e6,GJ:80000})[0].value,Math.PI/3000*Math.sqrt(2040*4e6*80000)/1000,'Mcr tf·m');
 near(evaluate('torsional',{GJ:80000,ECw:2e8,L:3000,r0:100})[0].value,100*(80000+100*Math.PI**2*2e8/3000**2)/100**2,'純扭轉 tf');
});

test('150 studio steel cases, 90 warmup slots and converted source panels carry revision 3 without SI labels',()=>{
 assert.equal(studio.lessons.length,30);
 const cases=studio.lessons.flatMap(l=>l.cases);assert.equal(cases.length,150);assert.equal(studio.lessons.flatMap(l=>l.warmups).length,90);
 for(const l of studio.lessons){
  const displayed={...l,original:steelLegacyDay(l.original)};
  assert.doesNotMatch(JSON.stringify(displayed),SI,`steel D${l.day}`);
  const unitWarmup=l.warmups.find(w=>w.id==='unit');assert.equal(unitWarmup.answer,l.cases[0].fields[0].unit||'無因次');
  for(const option of unitWarmup.options)assert.doesNotMatch(option,SI,`D${l.day} 暖身干擾單位`);
  for(const c of l.cases){assert.equal(c.contentRevision,3,c.id);assert.equal(c.unitSystem,'taiwan-gravity',c.id);assert.match(c.model,/^(steel-|h-section|asdlrfd|block|buckling|torsional|classification|ltb|bolt|weld|eccentric|plastic|fatigue)/,c.id);}
 }
 assert.ok(cases.some(c=>c.fields.some(f=>f.unit==='tf/cm²')));assert.ok(cases.some(c=>c.fields.some(f=>f.unit==='tf·m')));
});

test('each subject bans the unit family it does not use across lessons, recognition bank, numeric variants and studio',()=>{
 // The RC bank is converted at display time by the classic page; the steel bank is authored in exam units.
 const deep=(value,fn)=>typeof value==='string'?fn(value):Array.isArray(value)?value.map(v=>deep(v,fn)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,deep(v,fn)])):value;
 const gravity={'reinforced-concrete':[rcLegacyCourse,rcLegacyDay,rcText],'steel-structures':[steelLegacyCourse,steelLegacyDay,x=>x]};
 for(const [id,t] of Object.entries(TOPICS)){
  const course=read('site/'+t.curriculum),bundle=read('site/studio/content/'+id+'.json'),[convertCourse,convertDay,convertBank]=gravity[id]??[x=>x,x=>x,x=>x];
  const texts=[JSON.stringify(convertCourse(course)),JSON.stringify(deep(QUESTION_BANK.filter(q=>q.topic===id),convertBank)),JSON.stringify(numericParameterSets(id).map((p,i)=>numericQuestionFromParameters(id,p,'ban-'+i))),JSON.stringify(bundle.lessons.map(l=>({...l,original:convertDay(l.original)})))];
  for(const [index,text] of texts.entries()){
   if(gravity[id])assert.doesNotMatch(text,SI,`${id} 不得使用 SI 力與應力單位（來源 ${index}）`);
   else assert.doesNotMatch(text,GRAVITY,`${id} 不得混入重力單位（來源 ${index}）`);
  }
 }
});

test('old SI steel drafts and records restore unchanged while new drafts carry the tf-cm2-v1 marker',()=>{
 const original=verificationStates(topic,'20261104-steel-units')[1];
 original.records[0].reasoning='舊稿原文：Fy=250 MPa、Pu=300 kN；保留原稿與當時單位。';
 const before=structuredClone(original);validateState(original,topic);
 const restored=mergeStates(emptyState(topic),JSON.parse(JSON.stringify(original)));
 assert.deepEqual(restored,before);assert.equal(restored.drafts['2'].steelUnitSystem,undefined);
 const newer=emptyState(topic);newer.drafts[3]={activeMs:0,reasoning:'新稿：Fy=2.5 tf/cm²',explanation:'',mistake:'',hint:0,errorType:'未判定',values:{st_c03_lrfd_strength:String(360/9.80665)},startedAt:'',updatedAt:'2026-11-04T00:00:00.000Z',steelUnitSystem:'tf-cm2-v1'};
 validateState(newer,topic);const joined=mergeStates(restored,newer);
 assert.equal(joined.drafts[3].steelUnitSystem,'tf-cm2-v1');assert.deepEqual(joined.records,before.records);
 const view=steelLegacyCourse(classic);assert.equal(assess(view.days[2].fields,{st_c03_lrfd_strength:String(360/9.80665),st_c03_asd_strength:String(240/9.80665)}).correct,2);
});

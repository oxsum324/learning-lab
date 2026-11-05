import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STEEL_STRESS,steelUnit,steelDisplay,steelCanonical,steelText,steelLegacyDay,steelLegacyCourse,steelExamUnit,steelExamDisplay,steelExamCanonical} from '../site/steel-units.js';
import {rcLegacyCourse,rcLegacyDay,rcText} from '../site/rc-units.js';
import {QUESTION_BANK,getQuestions} from '../site/graded-bank.js';
import {numericParameterSets,numericQuestionFromParameters} from '../site/graded-numeric.js';
import {MODELS,evaluate} from '../site/studio/models.js';
import {emptyState,validateState,mergeStates,assess} from '../site/core.js';
import {verificationStates} from '../site/verification/sample-data.js';
import {reviewMaterial} from '../site/progressive-review.js';
import {curriculumHash} from '../scripts/curriculum-hash.mjs';
import {buildSteelExamCourse,STEEL_EXAM_VERSION} from '../scripts/steel-exam-course.mjs';
import {TOPICS} from '../site/topics.js';

const topic='steel-structures';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const raw=fs.readFileSync(new URL('../site/steel-curriculum.json',import.meta.url)),classic=JSON.parse(raw);
const studio=read('site/studio/content/steel-structures.json'),exam=read('site/steel-exam-curriculum.json');
const near=(a,b,note='',tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${note}: ${a} != ${b}`);
// SI force/stress labels that current gravity-unit subjects must not show; the flange-thickness symbol tf is not a unit.
const SI=/MPa|GPa|N\/mm[²2]|kPa|kN(?![A-Za-z])/;
const GRAVITY=/kgf|tf\/cm²|tf·m|tf\/m²|\d\s*tf(?![A-Za-z])/;
const MM=/\d\s*mm|mm[²³⁴]/;

test('steel unit boundary uses exact standard gravity for stress, force, moment and stiffness products',()=>{
 near(STEEL_STRESS,98.0665);
 for(const [si,unit,value,expected] of [['MPa','tf/cm²',98.0665,1],['N/mm²','tf/cm²',245.16625,2.5],['GPa','tf/cm²',.0980665,1],['kN','tf',9.80665,1],['kN·m','tf·m',19.6133,2],['kN-m','tf·m',9.80665,1],['kN/m','tf/m',9.80665,1],['N·mm²','tf·cm²',980665,1],['N·mm⁴','tf·cm⁴',9.80665e7,1],['N·mm','tf·cm',980665,1],['kPa','tf/m²',9.80665,1]]){
  assert.equal(steelUnit(si),unit);near(steelDisplay(value,si),expected,si);near(steelCanonical(expected,si),value,si+' canonical');near(steelCanonical(steelDisplay(-2.5,si),si),-2.5,si+' sign');
 }
 for(const unit of ['mm','mm²','mm³','mm⁴','m','deg','','ratio']){assert.equal(steelUnit(unit),unit);assert.equal(steelDisplay(71,unit),71);}
 assert.throws(()=>steelDisplay(NaN,'MPa'),/有限/);assert.throws(()=>steelCanonical('2.5','kN'),/有限/);
 // Exam papers: section properties and member lengths in cm; force and stress follow the same gravity table.
 for(const [si,unit,value,expected] of [['mm','cm',3600,360],['mm²','cm²',5808,58.08],['mm³','cm³',680000,680],['mm⁴','cm⁴',8e6,800],['MPa','tf/cm²',245.16625,2.5],['kN','tf',9.80665,1]]){
  assert.equal(steelExamUnit(si),unit);near(steelExamDisplay(value,si),expected,si);near(steelExamCanonical(expected,si),value,si+' canonical');
 }
 for(const unit of ['mm','mm²']){assert.equal(steelExamUnit(unit,true),unit,'型鋼尺寸與銲道沿原卷 mm');assert.equal(steelExamDisplay(8,unit,true),8);}
});

test('steel text conversion for v0.16.2 drafts rounds givens to six significant digits, keeps symbols and is idempotent',()=>{
 assert.equal(steelText('Fy=250 MPa、Fu=400 MPa、Pu=300 kN、M=120 kN-m'),'Fy=2.54929 tf/cm²、Fu=4.07886 tf/cm²、Pu=30.5915 tf、M=12.2366 tf·m');
 assert.equal(steelText('E=200000 MPa；GJ=80000000000 N·mm²'),'E=2039.43 tf/cm²；GJ=81577.3 tf·cm²');
 assert.equal(steelText('翼板厚 tf=12 mm、tw=8 mm；λc=(KL/r)/π×sqrt(Fy/E)'),'翼板厚 tf=12 mm、tw=8 mm；λc=(KL/r)/π×sqrt(Fy/E)');
 assert.equal(steelText('單位：kN、kN-m 與 MPa'),'單位：tf、tf·m 與 tf/cm²');
 const once=steelText('Fy=250 MPa、Pu=300 kN、Ag=1,600 mm²');assert.equal(steelText(once),once);assert.match(once,/Ag=1,600 mm²/);
});

test('classic steel SI source stays locked and its v0.16.2 converted copy remains available for earlier drafts',()=>{
 assert.equal(curriculumHash(raw),read('docs/studio-content-canonical-baseline.json')['steel-curriculum.json']);
 const before=JSON.stringify(classic),view=steelLegacyCourse(classic);
 assert.equal(JSON.stringify(classic),before);assert.equal(view.days.length,30);
 assert.doesNotMatch(JSON.stringify(view),SI,'課文、參考、欄位與來源標籤不得殘留 SI 力與應力單位');
 for(const [i,day] of view.days.entries()){
  assert.match(day.problem,/傳統制代入約定/);
  for(const [j,field] of day.fields.entries()){const original=classic.days[i].fields[j];assert.equal(field.id,original.id);assert.equal(field.unit,steelUnit(original.unit));near(steelCanonical(field.value,original.unit),original.value,field.id);}
  if(day.fields.length){const values=Object.fromEntries(day.fields.map(f=>[f.id,String(f.value)]));assert.equal(assess(day.fields,values).correct,day.fields.length,'D'+(i+1));}
 }
 assert.match(view.days[2].problem,/Fy=2\.54929 tf\/cm²、Pu=30\.5915 tf、Pa=19\.3746 tf/);
 assert.deepEqual(steelLegacyCourse(view),view);assert.equal(steelLegacyDay(view.days[5]).problem,view.days[5].problem);
});

test('the exam-unit course is rebuilt from the locked SI source with integer exam givens and cm section properties',()=>{
 assert.deepEqual(buildSteelExamCourse(structuredClone(classic)),exam,'site/steel-exam-curriculum.json 須由產生器重建');
 assert.equal(exam.version,STEEL_EXAM_VERSION);assert.notEqual(exam.version,classic.version);assert.equal(exam.topicId,topic);
 assert.equal(TOPICS[topic].examCurriculum,'steel-exam-curriculum.json');
 assert.doesNotMatch(JSON.stringify(exam),SI);
 for(const [i,day] of exam.days.entries()){
  const source=classic.days[i];assert.deepEqual(day.fields.map(f=>f.id),source.fields.map(f=>f.id),'D'+day.day);
  if(!source.fields.length){assert.deepEqual(day,source,'非數值課次不變');continue;}
  assert.match(day.problem,/原卷單位：/);
  const short=day.problem.split('本日核對短題')[1].replace(/H\d+×\d+×\d+×\d+（mm），即 H=\d+ mm、bf=\d+ mm、tw=\d+ mm、tf=\d+ mm/,'');
  assert.doesNotMatch(short,MM,'D'+day.day+' 斷面性質與長度用 cm；只有型鋼標稱尺寸用 mm');
  const values=Object.fromEntries(day.fields.map(f=>[f.id,String(f.value)]));assert.equal(assess(day.fields,values).correct,day.fields.length);
 }
 // Independent recomputation from the stated exam givens, without the generator's helper functions.
 const f=day=>Object.fromEntries(exam.days[day-1].fields.map(x=>[x.id,x]));
 const lc=ratio=>ratio/Math.PI*Math.sqrt(2.5/2040),pn=(A,ratio)=>.9*A*.658**(lc(ratio)**2)*2.5;
 const Ix=(15*30**3-14.2*27.6**3)/12,An=1*(20-2*2.2+4**2/(4*6));
 const checks={
  st_c02_area:[2*15*1.2+.8*27.6,'cm²'],st_c02_rx:[Math.sqrt(Ix/58.08),'cm'],st_c02_sx:[Ix/15,'cm³'],
  st_c03_lrfd_strength:[36,'tf'],st_c03_asd_strength:[24,'tf'],
  st_c04_an:[An,'cm²'],st_c04_ae:[.85*An,'cm²'],st_c04_yield_strength:[45,'tf'],st_c04_fracture_strength:[.75*4.1*.85*An,'tf'],
  st_c05_path_a_strength:[.75*Math.min(.6*2.5*18+4.1*4,.6*4.1*15+2.5*4.5),'tf'],st_c05_path_b_strength:[.75*Math.min(.6*2.5*15+4.1*5.5,.6*4.1*12+2.5*6),'tf'],
  st_c06_slenderness_x:[360/5.5,'—'],st_c06_slenderness_y:[360/3.5,'—'],st_c06_strength_x:[pn(60,360/5.5),'tf'],st_c06_strength_y:[pn(60,360/3.5),'tf'],
  st_w07a_slenderness_y:[120,'—'],st_w07a_strength_y:[pn(60,120),'tf'],st_w07b_yield_strength:[40.5,'tf'],st_w07b_fracture_strength:[.75*4.1*.85*14.5,'tf'],
  st_c07_mn:[20-10*2/6,'tf·m'],st_c07_design_strength:[15,'tf·m'],st_w23b_axial_ratio:[.5,'—'],st_w23b_moment_ratio:[.375,'—'],st_w23b_interaction:[.875,'—'],
  st_w23a_nominal_strength:[18,'tf·m'],st_w23a_strength:[16.2,'tf·m'],st_w14b_nominal_strength:[24,'tf'],st_w14b_strength:[18,'tf']
 };
 for(const day of [2,3,4,5,6,7,11,14,23])for(const field of Object.values(f(day))){const [value,unit]=checks[field.id];assert.equal(field.unit,unit,field.id);near(field.value,value,`D${day} ${field.id}`,1e-6);}
 assert.match(exam.days[2].problem,/Ag=16 cm²、Fy=2\.5 tf\/cm²（SM400）、Pu=30 tf、Pa=19 tf/);
 assert.match(exam.days[3].problem,/b=20 cm、t=1 cm、兩孔 dh=2\.2 cm/);
 assert.match(exam.days[5].problem,/A=60 cm²、KL=360 cm、rx=5\.5 cm、ry=3\.5 cm、Fy=2\.5 tf\/cm²、E=2040 tf\/cm²/);
 assert.match(exam.days[10].problem,/Mp=20 tf·m、Mr=10 tf·m/);assert.match(exam.days[22].problem,/Rn=12 tf/);
 // Governing modes match the SI source: D04 and D07-B fracture, D05 path A, D06 y axis.
 assert.ok(f(4).st_c04_fracture_strength.value<f(4).st_c04_yield_strength.value);assert.ok(f(7).st_w07b_fracture_strength.value<f(7).st_w07b_yield_strength.value);
 assert.ok(f(5).st_c05_path_a_strength.value<f(5).st_c05_path_b_strength.value);assert.ok(f(6).st_c06_strength_y.value<f(6).st_c06_strength_x.value);
 for(const ratio of [360/5.5,360/3.5,120])assert.ok(lc(ratio)<=1.5,'λc 位於題設非彈性式範圍');
});

test('classic recognition candidates follow the draft wording: cm for current lessons, mm for earlier drafts',()=>{
 const current=reviewMaterial(exam.days[1],topic,exam.days[1].guide,{exam:true}),earlier=reviewMaterial(classic.days[1],topic,classic.days[1].guide);
 const quantity=m=>m.questions.find(q=>q.id==='quantity');
 assert.deepEqual(quantity(current).options.map(o=>o.text).sort(),['40.08 cm²','58.08 cm²','60 cm²']);
 assert.deepEqual(quantity(earlier).options.map(o=>o.text).sort(),['4008 mm²','5808 mm²','6000 mm²']);
 assert.equal(quantity(current).options.find(o=>o.id===quantity(current).correct).text,'58.08 cm²');
 const column=reviewMaterial(exam.days[5],topic,exam.days[5].guide,{exam:true}).questions.find(q=>q.id==='diagram');
 assert.match(column.prompt,/rx=5\.5 cm、ry=3\.5 cm/);assert.match(JSON.stringify(column.options),/KL=360 cm/);assert.doesNotMatch(JSON.stringify(column.options),/\d mm/);
 assert.match(JSON.stringify(reviewMaterial(classic.days[5],topic,classic.days[5].guide).questions),/KL=3600 mm/);
});

test('steel recognition questions use exam units and retired length-unit wordings moved to new ids',()=>{
 const steel=QUESTION_BANK.filter(q=>q.topic===topic);
 assert.equal(steel.length,62);
 for(const q of steel)assert.doesNotMatch(JSON.stringify(q),SI,q.id);
 assert.equal(steel.some(q=>q.id==='st-d01-diag-unit'),false);
 const unit=steel.find(q=>q.id==='st-d01-diag-unit-tf');
 assert.ok(unit);assert.equal(unit.day,1);assert.equal(unit.type,'multi');assert.deepEqual(unit.answer,['b','c']);
 assert.match(unit.prompt,/tf\/cm²/);assert.match(unit.explanation,/除以100/);
 assert.equal(getQuestions(topic,1).some(q=>q.id==='st-d01-diag-unit-tf'),true);
 for(const [old,id,day] of [['st-d02-l2-units','st-d02-l2-units-cm',2],['st-d06-l3-error','st-d06-l3-error-cm',6]]){
  assert.equal(steel.some(q=>q.id===old),false,old);const q=steel.find(q=>q.id===id);assert.ok(q,id);assert.equal(q.day,day);
  assert.match(JSON.stringify(q),/cm/);assert.doesNotMatch(JSON.stringify(q).replace('型鋼標稱尺寸以 mm 標示時',''),/\bmm\b|mm[²³⁴]/,id);
  assert.equal(getQuestions(topic,day).some(x=>x.id===id),true,id);
 }
 assert.deepEqual(steel.find(q=>q.id==='st-d02-l2-units-cm').answer,['b','c','d']);
});

test('all 36 steel D02 numeric variants report rx in cm for current drafts and keep the mm version for earlier drafts',()=>{
 const sets=numericParameterSets(topic);assert.equal(sets.length,36);
 for(const [i,p] of sets.entries()){
  const old=numericQuestionFromParameters(topic,p,'steel-unit-'+i),q=numericQuestionFromParameters(topic,p,'steel-unit-'+i,{steelUnits:'cm'});
  assert.equal(old.numericMeta.unit,'mm');assert.equal(old.version,1);assert.doesNotMatch(old.id,/-cm$/);
  assert.equal(q.numericMeta.unit,'cm');assert.equal(q.version,2);assert.equal(q.id,old.id+'-cm');
  const h=p.H-2*p.tf,A=2*p.bf*p.tf+p.tw*h,I=(p.bf*p.H**3-(p.bf-p.tw)*h**3)/12;near(q.numericMeta.correct,Math.sqrt(I/A)/10,q.id,1e-12);
  assert.ok(q.prompt.includes(`H${p.H}×${p.bf}×${p.tw}×${p.tf}（mm）`),q.id);assert.match(q.prompt,/rx（cm）/);assert.match(q.explanation,/cm⁴/);
  assert.deepEqual(q.options.map(o=>o.text),old.numericMeta&&old.options.map(o=>`${Number((Number(o.text.split(' ')[0])/10).toPrecision(7))} cm`));
  for(const x of [old,q])assert.doesNotMatch(JSON.stringify(x),SI,x.id);
 }
});

test('studio steel models use exam material values with cm section properties while shared SI models stay untouched',()=>{
 const vars=id=>Object.fromEntries(MODELS[id].vars.map(v=>[v.symbol,v]));
 assert.equal(vars('steel-tension').Fy.value,2.5);assert.equal(vars('steel-tension').Fy.unit,'tf/cm²');assert.equal(vars('steel-tension').Fu.value,4.1);
 assert.equal(vars('steel-tension').Ag.unit,'cm²');assert.equal(vars('steel-tension').Ag.value,30);
 assert.equal(vars('buckling').E.value,2040);assert.equal(vars('buckling').E.unit,'tf/cm²');assert.equal(vars('buckling').I.unit,'cm⁴');assert.equal(vars('buckling').L.unit,'cm');
 assert.equal(vars('steel-bending').Z.unit,'cm³');assert.deepEqual(MODELS['steel-bending'].vars.map(v=>v.symbol),['Z','S','Fy']);assert.deepEqual(MODELS['steel-bending'].scaleWith,['S']);
 assert.equal(vars('ltb').GJ.unit,'tf·cm²');assert.equal(vars('ltb').Lb.unit,'cm');assert.equal(vars('torsional').ECw.unit,'tf·cm⁴');assert.equal(vars('torsional').r0.unit,'cm');
 assert.equal(vars('eccentric').e.unit,'cm');assert.equal(vars('fatigue').A.unit,'cm²');assert.equal(vars('steel-shear').Aw.unit,'cm²');
 for(const [id,symbols] of [['h-section',['h','b','tw','tf']],['classification',['b','t']],['weld',['w','L']]])for(const s of symbols)assert.equal(vars(id)[s].unit,'mm',`${id} ${s} 沿原卷以 mm 標示`);
 assert.equal(vars('steel-capacity').M.unit,'tf·m');assert.equal(vars('steel-interaction').Pu.unit,'tf');
 for(const id of ['capacity','interaction'])for(const v of MODELS[id].vars)assert.doesNotMatch(v.unit,GRAVITY,id+' 仍供動力科使用');
 for(const id of ['asdlrfd','h-section','steel-tension','block','buckling','torsional','classification','steel-bending','ltb','steel-shear','steel-interaction','bolt','weld','eccentric','plastic','fatigue','steel-capacity']){
  assert.equal(MODELS[id].unitSystem,'taiwan-gravity',id);
  for(const text of [MODELS[id].formula,MODELS[id].assumptions,MODELS[id].change,MODELS[id].pitfall])assert.doesNotMatch(text,SI,id);
 }
 // Exam formulas: tf/cm² × cm² is tf directly; only tf·cm results divide by 100 for tf·m.
 const tension=evaluate('steel-tension',{Ag:30,An:24,Fy:2.5,Fu:4.1});near(tension[0].value,67.5,'0.90×2.5×30');near(tension[1].value,67.5);
 near(evaluate('steel-bending',{Fy:2.5,S:600,Z:680})[0].value,2.5*680/100,'Mp=Fy Z/100');
 near(evaluate('block',{Av:20,At:8,Fu:4.1})[0].value,.6*4.1*20+4.1*8,'塊狀剪斷 tf');
 near(evaluate('steel-shear',{Aw:30,Fy:2.5,Cv:1})[0].value,.6*2.5*30,'Vn tf');
 near(evaluate('weld',{w:6,L:200,F:1.4})[0].value,.707*6*200*1.4/100,'角銲 tf');assert.equal(evaluate('weld',{w:6,L:200,F:1.4})[1].unit,'mm');
 near(evaluate('fatigue',{dF:10,A:25,allow:.6})[0].value,10/25,'應力範圍 tf/cm²');
 near(evaluate('buckling',{L:300,E:2040,I:800,K:1})[0].value,Math.PI**2*2040*800/300**2,'Euler tf');
 near(evaluate('ltb',{Lb:300,E:2040,Iy:400,GJ:80000})[0].value,Math.PI/300*Math.sqrt(2040*400*80000)/100,'Mcr tf·m');
 near(evaluate('torsional',{GJ:80000,ECw:2e8,L:300,r0:10})[0].value,(80000+Math.PI**2*2e8/300**2)/10**2,'純扭轉 tf');
 const ecc=evaluate('eccentric',{V:10,e:12,a:6,b:8});near(ecc[0].value,Math.hypot(120*8/400,2.5+120*6/400),'偏心栓 tf');near(ecc[1].value,400);assert.equal(ecc[1].unit,'cm²');
 const h=evaluate('h-section',{h:300,b:150,tw:8,tf:12});near(h[1].value,58.08,'A cm²');assert.deepEqual(h.map(r=>r.unit),['cm⁴','cm²','cm³']);
});

test('150 studio steel cases carry revision 4 with the exam-unit lesson beside them and S below Z',()=>{
 assert.equal(studio.lessons.length,30);
 const cases=studio.lessons.flatMap(l=>l.cases);assert.equal(cases.length,150);assert.equal(studio.lessons.flatMap(l=>l.warmups).length,90);
 for(const l of studio.lessons){
  assert.deepEqual(l.examOriginal,exam.days[l.day-1],`D${l.day} 原卷單位課文`);assert.deepEqual(l.original,classic.days[l.day-1],`D${l.day} 舊快照仍對應 SI 原課文`);
  const {original,...current}=l;
  assert.doesNotMatch(JSON.stringify(current),SI,`steel D${l.day}`);
  assert.doesNotMatch(JSON.stringify(steelLegacyDay(original)),SI,`steel D${l.day} 修訂 3 題組的換算原課文`);
  const unitWarmup=l.warmups.find(w=>w.id==='unit');assert.equal(unitWarmup.answer,l.cases[0].fields[0].unit||'無因次');
  for(const option of unitWarmup.options)assert.doesNotMatch(option,SI,`D${l.day} 暖身干擾單位`);
  for(const c of l.cases){
   assert.equal(c.contentRevision,4,c.id);assert.equal(c.unitSystem,'taiwan-gravity',c.id);assert.match(c.model,/^(steel-|h-section|asdlrfd|block|buckling|torsional|classification|ltb|bolt|weld|eccentric|plastic|fatigue)/,c.id);
   if(!['h-section','classification','weld'].includes(c.model))assert.doesNotMatch(c.prompt,MM,`${c.id} 斷面性質與長度應為 cm`);
   if(c.model==='steel-bending')assert.ok(c.params.S<c.params.Z,`${c.id} S<Z（My<Mp）`);
  }
 }
 assert.ok(cases.some(c=>c.fields.some(f=>f.unit==='tf/cm²')));assert.ok(cases.some(c=>c.fields.some(f=>f.unit==='tf·m')));assert.ok(cases.some(c=>c.fields.some(f=>f.unit==='cm²')));
});

test('each subject bans the unit family it does not use across lessons, recognition bank, numeric variants and studio',()=>{
 // The RC bank is converted at display time by the classic page; the steel bank is authored in exam units.
 const deep=(value,fn)=>typeof value==='string'?fn(value):Array.isArray(value)?value.map(v=>deep(v,fn)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,deep(v,fn)])):value;
 const gravity={'reinforced-concrete':[rcLegacyCourse,rcLegacyDay,rcText],'steel-structures':[steelLegacyCourse,steelLegacyDay,x=>x]};
 for(const [id,t] of Object.entries(TOPICS)){
  const course=read('site/'+t.curriculum),bundle=read('site/studio/content/'+id+'.json'),[convertCourse,convertDay,convertBank]=gravity[id]??[x=>x,x=>x,x=>x];
  const texts=[JSON.stringify(convertCourse(course)),...(t.examCurriculum?[JSON.stringify(read('site/'+t.examCurriculum))]:[]),JSON.stringify(deep(QUESTION_BANK.filter(q=>q.topic===id),convertBank)),JSON.stringify(numericParameterSets(id).flatMap((p,i)=>[numericQuestionFromParameters(id,p,'ban-'+i),numericQuestionFromParameters(id,p,'ban-'+i,{steelUnits:'cm'})])),JSON.stringify(bundle.lessons.map(l=>({...l,original:convertDay(l.original)})))];
  for(const [index,text] of texts.entries()){
   if(gravity[id])assert.doesNotMatch(text,SI,`${id} 不得使用 SI 力與應力單位（來源 ${index}）`);
   else assert.doesNotMatch(text,GRAVITY,`${id} 不得混入重力單位（來源 ${index}）`);
  }
 }
});

test('old SI and v0.16.2 steel drafts restore unchanged beside new exam-cm-v2 drafts',()=>{
 const original=verificationStates(topic,'20261104-steel-units')[1];
 original.records[0].reasoning='舊稿原文：Fy=250 MPa、Pu=300 kN；保留原稿與當時單位。';
 const before=structuredClone(original);validateState(original,topic);
 const restored=mergeStates(emptyState(topic),JSON.parse(JSON.stringify(original)));
 assert.deepEqual(restored,before);assert.equal(restored.drafts['2'].steelUnitSystem,undefined);
 const newer=emptyState(topic);newer.drafts[3]={activeMs:0,reasoning:'v0.16.2 稿：Fy=2.54929 tf/cm²',explanation:'',mistake:'',hint:0,errorType:'未判定',values:{st_c03_lrfd_strength:String(360/9.80665)},startedAt:'',updatedAt:'2026-11-04T00:00:00.000Z',steelUnitSystem:'tf-cm2-v1'};
 validateState(newer,topic);const joined=mergeStates(restored,newer);
 assert.equal(joined.drafts[3].steelUnitSystem,'tf-cm2-v1');assert.deepEqual(joined.records,before.records);
 const current=emptyState(topic);current.drafts[4]={activeMs:0,reasoning:'原卷新稿',explanation:'',mistake:'',hint:0,errorType:'未判定',values:{st_c04_an:'16.26667'},startedAt:'',updatedAt:'2026-11-05T00:00:00.000Z',steelUnitSystem:'exam-cm-v2'};
 validateState(current,topic);const all=mergeStates(joined,current);
 assert.equal(all.drafts[3].steelUnitSystem,'tf-cm2-v1');assert.equal(all.drafts[4].steelUnitSystem,'exam-cm-v2');assert.equal(all.drafts['2'].steelUnitSystem,undefined);
 // Same field ids, three wordings: each draft is checked against the course its marker names.
 const view=steelLegacyCourse(classic);
 assert.equal(assess(view.days[2].fields,{st_c03_lrfd_strength:String(360/9.80665),st_c03_asd_strength:String(240/9.80665)}).correct,2);
 assert.equal(assess(exam.days[2].fields,{st_c03_lrfd_strength:'36',st_c03_asd_strength:'24'}).correct,2);
 assert.equal(assess(view.days[2].fields,{st_c03_lrfd_strength:'36',st_c03_asd_strength:'24'}).correct,0);
 assert.equal(assess(classic.days[2].fields,{st_c03_lrfd_strength:'360',st_c03_asd_strength:'240'}).correct,2);
});

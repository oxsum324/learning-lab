import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Independent audit of the steel studio bundle: display units are mapped back to SI with explicit factors and every
// case is recomputed without importing the production models or solvers.
const course=JSON.parse(fs.readFileSync(new URL('../site/studio/content/steel-structures.json',import.meta.url),'utf8'));
const cases=course.lessons.flatMap(l=>l.cases);
const near=(a,b,note='',tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${note}: ${a} != ${b}`);
const G=9.80665,STRESS=98.0665;
const stressKeys={'steel-tension':['Fy','Fu'],block:['Fu'],buckling:['E'],'steel-bending':['Fy'],ltb:['E'],'steel-shear':['Fy'],weld:['F'],fatigue:['allow']};
const forceKeys={'steel-interaction':['Pu','Pc'],bolt:['V','Rn'],eccentric:['V'],fatigue:['dF'],asdlrfd:['Rn'],'steel-capacity':['M','q'],plastic:['Mp']};
const stiffnessKeys={ltb:{GJ:980665},torsional:{GJ:980665,ECw:9.80665e7}};
// Exam papers give section properties and member lengths in cm; shape sizes, plate b/t and welds stay mm.
const geometryKeys={'steel-tension':{Ag:100,An:100},block:{Av:100,At:100},buckling:{L:10,I:1e4},torsional:{L:10,r0:10},'steel-bending':{S:1e3,Z:1e3},ltb:{Lb:10,Iy:1e4},'steel-shear':{Aw:100},eccentric:{e:10,a:10,b:10},fatigue:{A:100}};
const fieldFactor={tf:G,'tf·m':G,'tf/m':G,'tf/cm²':STRESS,'tf·cm²':980665,'tf·cm⁴':9.80665e7,cm:10,'cm²':100,'cm³':1e3,'cm⁴':1e4};
function canonicalParams(c){
 const p={...c.params};
 for(const key of stressKeys[c.model]??[])p[key]*=STRESS;
 for(const key of forceKeys[c.model]??[])p[key]*=G;
 for(const [key,factor] of Object.entries(stiffnessKeys[c.model]??{}))p[key]*=factor;
 for(const [key,factor] of Object.entries(geometryKeys[c.model]??{}))p[key]*=factor;
 return p;
}
const canonicalField=f=>f.value*(fieldFactor[f.unit]??1);
function independent(c){
 const p=canonicalParams(c),m=c.condition,pi=Math.PI;
 switch(c.model){
  case 'asdlrfd':return [p.Rn*p.phi*(m?.8:1),p.Rn/p.Omega];
  case 'h-section':{const tw=p.tw*(m?2:1),I=(p.b*p.h**3-(p.b-tw)*(p.h-2*p.tf)**3)/12;return [I,2*p.b*p.tf+(p.h-2*p.tf)*tw,2*I/p.h];}
  case 'steel-tension':return [Math.min(.9*p.Ag*p.Fy,.75*(m?.8:1)*p.An*p.Fu)/1000,.9*p.Ag*p.Fy/1000];
  case 'block':return [(.6*p.Fu*p.Av+p.Fu*p.At*(m?.5:1))/1000,.6*p.Fu*p.Av/1000];
  case 'buckling':{const Le=p.K*p.L*(m?2:1);return [pi*pi*p.E*p.I/Le**2/1000,Le];}
  case 'torsional':{const Lt=p.L*(m?2:1),warp=pi*pi*p.ECw/Lt**2;return [(p.GJ+warp)/p.r0**2/1000,warp/p.r0**2/1000];}
  case 'classification':{const t=p.t*(m?.5:1);return [p.b/(t*p.limit),p.b/t];}
  case 'steel-bending':return [p.Fy*(m?p.S:p.Z)/1e6,p.Fy*p.S/1e6];
  case 'ltb':{const Lb=p.Lb*(m?2:1);return [pi/Lb*Math.sqrt(p.E*p.Iy*p.GJ)/1e6,Lb];}
  case 'steel-shear':return [.6*p.Fy*p.Aw*p.Cv*(m?.8:1)/1000,.6*p.Fy*p.Aw/1000];
  case 'steel-interaction':return [p.Pu/p.Pc+p.Mr*(m?1.5:1),1-p.Pu/p.Pc];
  case 'bolt':return [p.V/(p.n*(m?2:1)),p.n*p.Rn*(m?2:1)];
  case 'weld':return [.707*p.w*p.L*p.F*(m?2:1)/1000,.707*p.w];
  case 'eccentric':{const M=p.V*p.e*(m?-1:1),j=4*(p.a*p.a+p.b*p.b);return [Math.hypot(M*p.b/j,p.V/4+M*p.a/j),j];}
  case 'plastic':return [p.Mp/p.L*(m?8:4),m?3:1];
  case 'fatigue':{const A=p.A*(m?.8:1);return [p.dF*1000/A,p.dF*1000/(A*p.allow)];}
  case 'steel-capacity':return [2*p.M/p.L+(m?-1:1)*p.q*p.L/2,2*p.M/p.L];
  default:throw Error('未覆核模型 '+c.model);
 }
}

test('independent SI recomputation matches all 150 steel cases and 30 inverse targets after unit conversion',()=>{
 assert.equal(cases.length,150);
 for(const c of cases){
  const expected=independent(c);
  if(c.index===3){near(c.fields[0].value,c.params[c.unknown],c.id);near(canonicalField(c.target),expected[0],c.id+' inverse target');}
  else{assert.equal(c.fields.length,expected.length,c.id);for(let i=0;i<expected.length;i++)near(canonicalField(c.fields[i]),expected[i],`${c.id} field ${i}`);}
 }
});

test('exam-unit formulas quoted in the steps reproduce the stored answers when applied literally',()=>{
 for(const c of cases){
  if(c.index===3)continue;
  const p=c.params,steps=c.steps.join('\n'),v=c.fields.map(f=>f.value);
  if(c.model==='steel-tension'){assert.match(steps,/φPn=min\(0\.90Fy Ag,0\.75Fu U An\) →/);near(v[0],Math.min(.9*p.Fy*p.Ag,.75*(c.condition?.8:1)*p.Fu*p.An),c.id);}
  if(c.model==='block'){assert.match(steps,/Rn=0\.6Fu Anv\+Fu Ant →/);near(v[0],.6*p.Fu*p.Av+p.Fu*p.At*(c.condition?.5:1),c.id);}
  if(c.model==='buckling'){assert.match(steps,/Pcr=π²E I\/\(KL\)² →/);near(v[0],Math.PI**2*p.E*p.I/(p.K*p.L*(c.condition?2:1))**2,c.id);}
  if(c.model==='steel-bending'){assert.match(steps,/Fy [SZ]\/100 →/);near(v[0],p.Fy*(c.condition?p.S:p.Z)/100,c.id);}
  if(c.model==='ltb'){assert.match(steps,/Mcr=\(π\/Lb\)√\(E Iy GJ\)\/100/);near(v[0],Math.PI/(p.Lb*(c.condition?2:1))*Math.sqrt(p.E*p.Iy*p.GJ)/100,c.id);}
  if(c.model==='torsional'){assert.match(steps,/Pcr,t=\[GJ\+π²ECw\/Lt²\]\/r0²/);const Lt=p.L*(c.condition?2:1);near(v[0],(p.GJ+Math.PI**2*p.ECw/Lt**2)/p.r0**2,c.id);near(v[1],Math.PI**2*p.ECw/(Lt**2*p.r0**2),c.id+' warp');}
  if(c.model==='steel-shear'){assert.match(steps,/Vn=0\.6Fy Aw Cv →/);near(v[0],.6*p.Fy*p.Aw*p.Cv*(c.condition?.8:1),c.id);}
  if(c.model==='weld'){assert.match(steps,/R=0\.707 w Le F\/100/);near(v[0],.707*p.w*p.L*p.F*(c.condition?2:1)/100,c.id);}
  if(c.model==='fatigue'){assert.match(steps,/Δσ=ΔF\/A →/);near(v[0],p.dF/(p.A*(c.condition?.8:1)),c.id);}
  if(c.model==='eccentric'){assert.match(steps,/M=V e（tf·cm）/);const M=p.V*p.e*(c.condition?-1:1),j=4*(p.a**2+p.b**2);near(v[0],Math.hypot(M*p.b/j,p.V/4+M*p.a/j),c.id);}
  if(c.model==='h-section'){const tw=p.tw*(c.condition?2:1)/10,h=p.h/10,b=p.b/10,tf=p.tf/10;near(v[1],2*b*tf+(h-2*tf)*tw,c.id+' A cm²');}
  if(c.model==='steel-capacity'){near(v[0],2*p.M/p.L+(c.condition?-1:1)*p.q*p.L/2,c.id);assert.match(c.fields[0].label,/指定端/);}
 }
});

test('steel material givens follow the exam-paper values and every stress field is tf/cm²',()=>{
 for(const c of cases){
  const given=c.prompt;
  if('Fy' in c.params)assert.match(given,/Fy＝2\.5 tf\/cm²/,c.id);
  if('Fu' in c.params)assert.match(given,/Fu＝4\.1 tf\/cm²/,c.id);
  if('E' in c.params)assert.match(given,/E＝2040 tf\/cm²/,c.id);
  for(const f of c.fields)if(/應力/.test(f.label)&&f.unit)assert.equal(f.unit,'tf/cm²',c.id+' '+f.label);
  for(const f of c.fields)assert.doesNotMatch(f.unit,/MPa|kN/,c.id);
  for(const f of c.fields)if(/面積|斷面模數|慣性矩/.test(f.label))assert.match(f.unit,/^cm[²³⁴]$/,c.id+' '+f.label);
 }
});

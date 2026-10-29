import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rcUnit,rcDisplay,rcCanonical,rcText,rcLegacyDay,rcLegacyCourse} from '../site/rc-units.js';
import {questions} from '../site/graded-content/reinforced-concrete.js';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const course=JSON.parse(fs.readFileSync(new URL('../site/rc-curriculum.json',import.meta.url)));
test('RC unit boundary retains physical values, sign and SI round trips',()=>{
 const rows=[['MPa','kgf/cm²',.0980665,1],['N/mm²','kgf/cm²',.0980665,1],['kPa','tf/m²',9.80665,1],['kN/m²','tf/m²',9.80665,1],['kN','tf',9.80665,1],['kN·m','tf·m',9.80665,1],['kN-m','tf·m',9.80665,1],['kN/m','tf/m',9.80665,1],['kN·m²','tf·m²',9.80665,1],['N/mm','kgf/cm',.980665,1],['N·mm','kgf·cm',98.0665,1]];
 for(const[unit,target,si,display]of rows){assert.equal(rcUnit(unit),target);near(rcDisplay(si,unit),display);near(rcCanonical(display,unit),si);near(rcCanonical(rcDisplay(-3.14159,unit),unit),-3.14159);}
 for(const unit of ['mm','mm²','mm2','ratio','']){assert.equal(rcUnit(unit),unit);assert.equal(rcDisplay(71,unit),71);}
 assert.throws(()=>rcDisplay(NaN,'MPa'),/有限/);
 assert.throws(()=>rcCanonical('','kN'),/有限/);
});
test('RC visible quantities convert their numbers with units, including grouped losses and signs',()=>{
 assert.equal(rcText('P=1,200 kN；−9.80665 kN；±9.80665 kN；+9.80665 kN'),'P=122.3659456 tf；−1 tf；±1 tf；+1 tf');
 assert.equal(rcText('90、80、70、60 kN'),'9.177445917、8.157729704、7.138013491、6.118297278 tf');
 assert.equal(rcText('9.80665，19.6133 kN/m²'),'1，2 tf/m²');
 assert.equal(rcText('fy=420 MPa，Ao=120,000 mm²'),'fy=4282.808095 kgf/cm²，Ao=120,000 mm²');
 assert.equal(rcText('1e−3 kN'),'0.0001019716213 tf');
 assert.equal(rcText('ΣN=0'),'ΣN=0');
 const text=rcText('28 MPa、9.80665 kN·m、9.80665 kN/m、9.80665 kN·m²');
 assert.equal(rcText(text),text);
});
test('RC legacy view deep clones, converts every field and keeps original course and identifiers intact',()=>{
 const before=JSON.stringify(course),view=rcLegacyCourse(course);
 assert.notEqual(view,course);assert.equal(JSON.stringify(course),before);
 assert.equal(view.days.length,30);
 for(let i=0;i<30;i++){
  assert.equal(view.days[i].day,course.days[i].day);
  assert.match(view.days[i].problem,/傳統制代入約定/);
  for(let j=0;j<course.days[i].fields.length;j++){
   const original=course.days[i].fields[j],field=view.days[i].fields[j];
   assert.equal(field.id,original.id);assert.equal(field.unit,rcUnit(original.unit));near(rcCanonical(field.value,original.unit),original.value);
  }
 }
 assert.match(view.days[3].problem,/−4282\.808095 kgf\/cm²/);
 assert.equal(rcLegacyDay(view.days[13]).problem,view.days[13].problem);
 assert.equal(JSON.stringify(rcLegacyCourse(view)),JSON.stringify(view));
});
test('RC millimetre geometry paired with traditional stresses reproduces bending and shear',()=>{
 const fy=rcDisplay(420,'MPa'),fc=rcDisplay(28,'MPa');
 const As=1500/100,b=300/10,d=500/10;
 const a=As*fy/(.85*fc*b),moment=As*fy*(d-a/2)/100000;
 near(a*10,1500*420/(.85*28*300));
 near(moment,rcDisplay(1500*420*(500-a*10/2)/1e6,'kN·m'));
 const Vs=(142/100)*fy*(500/150)/1000;
 near(Vs,rcDisplay(142*420*500/150/1000,'kN'));
});
test('D14 square-root coefficient is converted with stress and centimetre geometry, preserving punching and torsion',()=>{
 const day=rcLegacyDay(course.days[13]);
 assert.doesNotMatch(day.problem,/0\.33\s*√/);
 assert.match(day.problem,/1\.053788857√f'c/);
 assert.match(day.problem,/b0、d 用 cm，Vc 得 kgf/);
 assert.match(rcText('Vc=0.33√(f′c) b₀ d'),/Vc=1\.053788857√f′c/);
 const fc=rcDisplay(28,'MPa'),bo=1800/10,d=200/10;
 const traditional=1.053788857*Math.sqrt(fc)*bo*d/1000;
 const si=.33*Math.sqrt(28)*1800*200/1000;
 near(traditional,rcDisplay(si,'kN'));
 near(day.fields.find(f=>f.id==='vc').value,traditional,1e-6);
 const torsion=2*(120000/100)*(71/100)*rcDisplay(420,'MPa')/(150/10)/100000;
 near(torsion,rcDisplay(47.712,'kN-m'));
});
test('D23 pressure, loss list and footing steel area retain physical equivalence',()=>{
 const view=rcLegacyDay(course.days[22]),q=rcDisplay(100,'kPa'),l=1.3;
 assert.match(view.problem,/qu=10\.19716213 tf\/m²/);
 assert.match(view.problem,/9\.177445917、8\.157729704、7\.138013491、6\.118297278 tf/);
 const moment=q*l*l/2;
 near(moment,rcDisplay(84.5,'kN-m'));
 const fyTfM2=rcDisplay(420,'MPa')*10;
 const areaMm2=moment/(.9*fyTfM2*.9*.5)*1e6;
 near(areaMm2,84.5e6/(.9*420*.9*500));
});
test('RC traditional-unit conceptual questions keep their answer indices and explain mixed geometry explicitly',()=>{
 const find=s=>questions.find(q=>q.id.endsWith(s));
 const first=find('diag-stress'),shear=find('l2-units'),bending=find('l3-beam-error');
 for(const q of [first,shear,bending]){assert.ok(q);assert.doesNotMatch(JSON.stringify(q),/MPa|N\/mm²/);}
 assert.equal(first.answer,'a');
 assert.deepEqual(shear.answer,['a','d']);
 assert.match(JSON.stringify(shear),/除以100|\/100/);
 assert.equal(bending.answer,'c');
 assert.match(JSON.stringify(bending),/100000/);
});

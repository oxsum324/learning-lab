import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync(new URL('../site/studio/content/soil-foundations.json',import.meta.url)));
const gw=9.81, pi=Math.PI, rad=x=>x*pi/180;
const f={
 phase:(p,m)=>[(m?1:p.S)*p.e/p.Gs,gw*(p.Gs+(m?1:p.S)*p.e)/(1+p.e)],
 effective:(p,m)=>[p.gamma*p.z+p.q-(m?0:gw*p.z),m?0:gw*p.z],
 darcy:(p,m)=>[p.k*p.dh/p.L*p.A*(m?2:1),p.dh/p.L],
 seepage:(p,m)=>[(p.Gs-1)/(1+p.e)/(p.i*(m?1.5:1)),(p.Gs-1)/(1+p.e)],
 compaction:(p,m)=>[p.gamma*(m?.95:1)/(1+p.w)/p.gdmax,p.gamma*(m?.95:1)/(1+p.w)],
 'stress-increment':(p,m)=>{const R=Math.hypot(p.z,m?0:p.r);return[3*p.P*p.z**3/(2*pi*R**5),R]},
 'oc-consolidation':(p,m)=>{const sf=m?120:p.sf;const term=sf<=p.pc?p.Cr*Math.log10(sf/p.s0):p.Cr*Math.log10(p.pc/p.s0)+p.Cc*Math.log10(sf/p.pc);return[p.H*term/(1+p.e),p.pc/p.s0]},
 'consolidation-time':(p,m)=>[p.Tv*(m?p.H:p.H/2)**2/p.Cv,m?p.H:p.H/2],
 mohr:(p,m)=>[p.c+p.sn*(m?.5:1)*Math.tan(rad(p.phi)),p.sn*(m?.5:1)*Math.tan(rad(p.phi))],
 triaxial:(p,m)=>[p.s3+p.q-(m?0:p.u),p.s3-(m?0:p.u)],
 consolidation:(p,m)=>[p.H*p.Cc/(1+p.e0)*Math.log10((p.s0+p.ds*(m?.5:1))/p.s0),p.s0+p.ds*(m?.5:1)],
 bearing:(p,m)=>[.5*p.gamma*p.B*p.N/(p.FS*(m?1.5:1)),.5*p.gamma*p.B*p.N],
 'footing-eccentric':(p,m)=>[p.P/(p.B*p.L)*(1+6*p.e*(m?-1:1)/p.B),p.P/(p.B*p.L)*(1-6*p.e*(m?-1:1)/p.B)],
 pile:(p,m)=>[pi*p.D*p.D/4*p.qb+(m?-1:1)*pi*p.D*p.L*p.fs,pi*p.D*p.L*p.fs],
 'pile-group':(p,m)=>[p.Q*p.n*p.eta*(m?.75:1),p.Q*p.eta*(m?.75:1)],
 earth:(p,m)=>{const ka=(1-Math.sin(rad(p.phi)))/(1+Math.sin(rad(p.phi))),K=m?1/ka:ka;return[.5*K*p.gamma*p.H*p.H,K]},
 wall:(p,m)=>[p.W*p.mu/p.P*(m?.7:1),p.W*p.mu*(m?.7:1)],
 uplift:(p,m)=>[p.W/(gw*p.h*p.A*(m?1.5:1)),gw*p.h*p.A*(m?1.5:1)],
 slope:(p,m)=>[Math.tan(rad(p.phi))/Math.tan(rad(p.beta))*(m?.5:1),Math.tan(rad(p.beta))],
 liquefaction:(p,m)=>[p.CRR*p.MSF/(p.CSR*(m?1.25:1)),p.CRR*p.MSF],
 'elastic-settlement':(p,m)=>[p.q*p.B*(1-p.nu*p.nu)/p.E*p.I*(m?.8:1),p.q/p.E]
};

const near=(a,b,id)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)),id+' '+a+' != '+b);
test('independent soil formulas validate 150 exercises, 240 forward fields and 30 identifiable inverse cases',()=>{
 let forward=0,inverse=0,total=0;const models=new Set();
 for(const l of c.lessons)for(const e of l.cases){total++;models.add(e.model);const vals=f[e.model](e.params,e.condition);
  if(e.index===3){inverse++;const p={...e.params,[e.unknown]:e.fields[0].value};near(f[e.model](p,false)[0],e.target.value,e.id+' inverse substitution');
   const center=e.params[e.unknown];let previous,sign;
   for(let i=0;i<=100;i++){const got=f[e.model]({...e.params,[e.unknown]:center*(.5+i*.01)},false)[0];assert.ok(Number.isFinite(got),e.id+' finite inverse interval');if(previous!==undefined){const d=Math.sign(got-previous);assert.notEqual(d,0,e.id+' inverse unknown has a flat branch');if(sign!==undefined)assert.equal(d,sign,e.id+' inverse unknown changes direction');sign=d;}previous=got;}
  }else{assert.equal(vals.length,e.fields.length);vals.forEach((v,i)=>{forward++;near(v,e.fields[i].value,e.id+' field '+i);});}
 }
 assert.equal(total,150);assert.equal(forward,240);assert.equal(inverse,30);assert.equal(models.size,21);
});
test('negative pile resistance balance is identified as a deficit rather than a negative compression capacity',()=>{
 const cases=c.lessons.flatMap(l=>l.cases).filter(e=>e.model==='pile'&&e.condition);assert.ok(cases.length);
 for(const e of cases){const p=e.params,end=Math.PI*p.D*p.D/4*p.qb,drag=Math.PI*p.D*p.L*p.fs,balance=end-drag;near(e.fields[0].value,balance,e.id+' end resistance minus drag');
  if(balance<0){assert.match(e.fields[0].label,/有號|餘額|缺額|不足/);assert.match(e.steps.join(' '),/缺額|不足/);assert.doesNotMatch(e.fields[0].label,/極限壓力|可用承載力|容許承載力/);}
 }
});

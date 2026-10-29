import test from 'node:test';
import assert from 'node:assert/strict';
import {MODELS,evaluate} from '../site/studio/models.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const defaults=id=>Object.fromEntries(MODELS[id].vars.map(v=>[v.symbol,v.value]));

test('capacity reversal reports a signed same-end reaction, not the maximum absolute envelope',()=>{
 for(const p of [{M:250,L:5,q:20},{M:10,L:5,q:20}]){
  const forward=evaluate('capacity',p,false),reverse=evaluate('capacity',p,true);
  // The two signed values separate the gravity reaction and end-couple shear.
  near((forward[0].value+reverse[0].value)/2*p.L,2*p.M);
  near(forward[0].value-reverse[0].value,p.q*p.L);
  assert.match(reverse[0].label,/指定端.*剪力/);
  assert.doesNotMatch(reverse[0].label,/較大|絕對值/);
 }
 assert.ok(evaluate('capacity',{M:10,L:5,q:20},true)[0].value<0);
});

test('plastic collapse loads satisfy virtual work and count end hinges in the total',()=>{
 for(const fixed of [false,true])for(const L of [3,6,11]){
  const p={Mp:130,L},r=evaluate('plastic',p,fixed),delta=.01;
  const slope=delta/(L/2),middleRotation=2*slope;
  const endRotations=fixed?2*slope:0;
  near(r[0].value*delta,p.Mp*(middleRotation+endRotations));
  assert.equal(r[1].value,fixed?3:1);
  assert.doesNotMatch(r[1].label,/內部/);
 }
});

test('eccentric bolt vectors recover applied force and moment for both load sides',()=>{
 const p=defaults('eccentric'),positions=[[-p.a,-p.b],[-p.a,p.b],[p.a,-p.b],[p.a,p.b]];
 const J=positions.reduce((s,[x,y])=>s+x*x+y*y,0);
 for(const reversed of [false,true]){
  const M=p.V*p.e*(reversed?-1:1);
  const forces=positions.map(([x,y])=>[-M*y/J,p.V/4+M*x/J]);
  near(forces.reduce((s,f)=>s+f[0],0),0);
  near(forces.reduce((s,f)=>s+f[1],0),p.V);
  near(forces.reduce((s,f,i)=>s+positions[i][0]*f[1]-positions[i][1]*f[0],0),M);
  near(evaluate('eccentric',p,reversed)[0].value,Math.hypot(...forces[3]));
 }
});

test('Rayleigh coefficients reproduce both target damping ratios and Newmark obeys trapezoidal displacement',()=>{
 for(const changed of [false,true]){
  const p=defaults('rayleigh'),r=evaluate('rayleigh',p,changed),z=p.z*(changed?2:1);
  for(const w of [p.w1,p.w2])near(r[0].value/(2*w)+r[1].value*w/2,z);
  const n=defaults('newmark'),out=evaluate('newmark',n,changed),dt=n.dt*(changed?.5:1);
  near(out[0].value-n.v0,(n.a0+n.a1)*dt/2);
  near(out[1].value,(n.v0+out[0].value)*dt/2);
 }
});

test('torsional-column long-length limit preserves Saint-Venant resistance while warping decays quadratically',()=>{
 const p=defaults('torsional'),one=evaluate('torsional',p,false),twice=evaluate('torsional',p,true);
 near(one[1].value,4*twice[1].value);
 near(one[0].value-one[1].value,p.GJ/(p.r0*p.r0)/1000);
 near(twice[0].value-twice[1].value,p.GJ/(p.r0*p.r0)/1000);
});

test('one cantilever bridge column and two parallel columns retain their stiffness and period relationship',()=>{
 const p=defaults('bridge'),single=evaluate('bridge',p,false),pair=evaluate('bridge',p,true);
 // Unit-load virtual work: integral (L-x)^2/EI dx = L^3/(3EI).
 const flex=p.L**3/(3*p.EI);
 near(single[1].value*flex,1);
 near(pair[1].value,2*single[1].value);
 near(pair[0].value*Math.sqrt(2),single[0].value);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {curriculumHash} from '../scripts/curriculum-hash.mjs';
import {TOPICS} from '../site/topics.js';
import {MODELS,evaluate,invert} from '../site/studio/models.js';
import {validStudio,prepareStudio,prepareWork,recordWarmup,reveal,freezeInitial,sameDraftContent,revealDiagnostic,staleExercise,useCurrentExercise} from '../site/studio/state.js';
import {emptyState,validateState,mergeStates,safeSave,assess} from '../site/core.js';
import {verificationStates,verificationDrawing} from '../site/verification/sample-data.js';
import {CloudHistory} from '../site/cloud-history.js';
import {emptyWorkspace} from '../site/drawing-model.js';
import {meaningfulDraft} from '../site/learning-flow.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const courses=Object.keys(TOPICS).map(t=>read('site/studio/content/'+t+'.json'));
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('150 lessons each have five distinct fully specified cases; original curricula content is unchanged across checkout line endings',()=>{
 const baseline=read('docs/studio-content-canonical-baseline.json'),ids=new Set(),prompts=new Set();let n=0;
 for(const course of courses){const old=read('site/'+TOPICS[course.topic].curriculum);assert.equal(course.lessons.length,30);for(const l of course.lessons){assert.deepEqual(l.original,old.days[l.day-1]);assert.equal(l.cases.length,5);assert.equal(l.warmups.length,3);assert.ok(l.diagnostic.claim);for(const c of l.cases){assert.ok(!ids.has(c.id));ids.add(c.id);assert.ok(!prompts.has(c.prompt),'duplicate problem '+c.id);prompts.add(c.prompt);assert.ok(c.fields.length>=1);assert.ok(c.fields.every(f=>Number.isFinite(f.value)&&f.label&&typeof f.unit==='string'));assert.ok(c.steps.length>=5);assert.equal(c.source.kind,'authored-specified-model');assert.ok(c.drawing.kind);n++;}}}
 assert.equal(n,750);for(const[file,hash]of Object.entries(baseline))assert.equal(curriculumHash(fs.readFileSync(new URL('../site/'+file,import.meta.url))),hash);
});

test('curriculum locks accept only checkout CRLF differences while rejecting changed numbers and text',()=>{
 const original='{"load":12,"unit":"kN"}\n';assert.equal(curriculumHash(original),curriculumHash(original.replaceAll('\n','\r\n')));assert.notEqual(curriculumHash(original),curriculumHash(original.replace('12','13')));assert.notEqual(curriculumHash(original),curriculumHash(original.replace('kN','N')));
});
test('all 150 inverse cases use a locally identifiable unknown and return the stated target with rounding tolerance',()=>{
 for(const course of courses)for(const l of course.lessons){const c=l.cases[3],value=c.fields[0].value;near(value,c.params[c.unknown]);near(evaluate(c.model,{...c.params,[c.unknown]:value})[0].value,c.target.value);const p=c.params,key=c.unknown,down=evaluate(c.model,{...p,[key]:p[key]*.9999})[0].value,up=evaluate(c.model,{...p,[key]:p[key]*1.0001})[0].value;assert.notEqual(down,up,'unknown is on a flat governing branch');const model=MODELS[c.model];assert.ok(model.vars.some(v=>v.symbol===key));}
});
test('warmup options have a unique valid answer, no duplicate choices, and content never calls authored work an official solution',()=>{
 for(const course of courses)for(const l of course.lessons){for(const q of l.warmups){assert.equal(q.options.filter(o=>o===q.answer).length,1);assert.equal(new Set(q.options).size,q.options.length);assert.ok(q.explanation);}for(const c of l.cases){assert.match(c.source.label,/非官方原卷詳解/);assert.doesNotMatch(c.prompt,/留到\s*D\d|以後再|未來才/);}}
});
test('independent static equilibrium and virtual-work quadrature validate the structural models',()=>{
 for(const course of courses)for(const l of course.lessons)for(const c of l.cases){const p=c.params,r=evaluate(c.model,p,c.condition);if(c.model==='point'){near(r[0].value+r[1].value,p.P);const a=p.L*(c.condition?1-p.r:p.r);near(r[0].value*p.L,p.P*(p.L-a));near(r[2].value,r[0].value*a);}if(c.model==='udl'){near(r[1].value*(c.condition?1:2),p.q*p.L);near(r[0].value,(c.condition?.5:.125)*p.q*p.L*p.L);}if(c.model==='propped')near(r[1].value+r[0].value,p.q*p.L);
  if(['beam-deflection','point-deflection','cantilever'].includes(c.model)){let total=0;const count=2000,h=p.L/count,EI=p.EI*(c.condition?(c.model==='point-deflection'?.5:2):1);for(let i=0;i<=count;i++){const x=i*h;let M,m;if(c.model==='cantilever'){M=p.P*(p.L-x);m=p.L-x;}else{m=Math.min(x,p.L-x)/2;M=c.model==='point-deflection'?p.P*m:p.q*x*(p.L-x)/2;}total+=(i===0||i===count?1:i%2?4:2)*M*m/EI;}near(total*h/3,r[0].value,1e-7);}
 }
});
test('RC force equilibrium and T-beam pressure-block branch close independently',()=>{
 for(const course of courses)for(const l of course.lessons)for(const c of l.cases){const p=c.params,r=evaluate(c.model,p,c.condition);if(c.model==='rc-flexure'){const a=r[1].value,b=p.b*(c.condition?2:1);near(.85*p.fc*b*a,p.As*p.fy);near(r[0].value*(c.unitSystem==='taiwan-gravity'?1e8:1e6),p.As*p.fy*(p.d-a/2));assert.ok(a<p.d);}if(c.model==='tbeam'){const hf=p.hf*(c.condition?.5:1),a=r[1].value,area=a<=hf?p.bf*a:p.bw*a+(p.bf-p.bw)*hf;near(.85*p.fc*area,p.As*p.fy);assert.ok(a<p.d);}}
});
test('steel governing modes, bolt planes and weld throat retain demand/capacity units',()=>{
 for(const course of courses)for(const l of course.lessons)for(const c of l.cases){const p=c.params,r=evaluate(c.model,p,c.condition);if(c.model==='steel-tension'){assert.ok(r[0].value<=.9*p.Fy*p.Ag/1000+1e-8);assert.ok(r[0].value<=.75*p.Fu*p.An*(c.condition?.8:1)/1000+1e-8);}if(c.model==='bolt')near(r[0].value*p.n*(c.condition?2:1),p.V);if(c.model==='weld')near(r[0].value*1000,r[1].value*p.L*p.F*(c.condition?2:1));if(c.model==='buckling'){const critical=r[0].value*1000;near(critical*(p.K*p.L*(c.condition?2:1))**2,Math.PI**2*p.E*p.I);}}
});
test('dynamics eigenvalue residuals, harmonic force balance and modal mass bounds hold',()=>{
 for(const course of courses)for(const l of course.lessons)for(const c of l.cases){const p=c.params,r=evaluate(c.model,p,c.condition);if(c.model==='period')near(r[0].value**2*p.m*(c.condition?2:1),p.k);if(c.model==='two-dof'){const k=p.k*(c.condition?2:1);for(const w of r){const lambda=w.value**2*p.m/k;near(lambda*lambda-3*lambda+1,0,1e-7);}}if(c.model==='harmonic'){let ratio=c.condition?1:p.r;near(r[0].value*p.k*Math.hypot(1-ratio*ratio,2*p.z*ratio),p.F);}if(c.model==='base-shear')near(r[0].value+r[1].value,p.V);if(c.model==='modal'){assert.ok(r[0].value>=0&&r[0].value<=2*p.m+1e-8);}}
});
test('soil phase weights, effective-stress decomposition, seepage and drainage-length scaling agree',()=>{
 for(const course of courses)for(const l of course.lessons)for(const c of l.cases){const p=c.params,r=evaluate(c.model,p,c.condition);if(c.model==='phase'){const S=c.condition?1:p.S;near(r[0].value*p.Gs,S*p.e);near(r[1].value*(1+p.e),9.81*(p.Gs+S*p.e));}if(c.model==='effective')near(r[0].value+r[1].value,p.gamma*p.z+p.q);if(c.model==='darcy')near(r[0].value,p.k*r[1].value*p.A*(c.condition?2:1));if(c.model==='consolidation-time')near(r[0].value*p.Cv,p.Tv*r[1].value**2);if(c.model==='footing-eccentric')near((r[0].value+r[1].value)*p.B*p.L/2,p.P);}
});
test('warmup first responses and numeric initials survive correction and opening a reference',()=>{
 const c=courses[0].lessons[0].cases[0],s={version:1,selected:c.id,stage:'warmup',workspaces:{}},w=prepareWork(s,c,verificationDrawing('structural-analysis')),q=courses[0].lessons[0].warmups[0];recordWarmup(w,q,q.options.find(x=>x!==q.answer),'2026-10-28T00:00:00Z');recordWarmup(w,q,q.answer,'2026-10-28T00:00:01Z');w.values={s0:'-17.25'};freezeInitial(w);w.values.s0='45';reveal(w);assert.equal(w.warmups[0].correct,false);assert.equal(w.warmups[1].correct,true);assert.equal(w.firstValues.s0,'-17.25');assert.equal(w.values.s0,'45');assert.equal(w.hint,3);assert.ok(validStudio(s,'structural-analysis',1));
});
test('all five topic bundles roundtrip new drafts, old graded originals and every drawing through JSON and the cloud transport',async()=>{
 for(const course of courses){const topic=course.topic,old=verificationStates(topic,'20261028-studio')[1],s=structuredClone(old),l=course.lessons[1],d=s.drafts[2],studio=prepareStudio(d,l,topic);for(const c of l.cases){studio.selected=c.id;const w=prepareWork(studio,c,verificationDrawing(topic));w.reasoning='各組獨立原稿';w.values={s0:'-17.25'};freezeInitial(w);}validateState(s,topic);const restored=mergeStates(emptyState(topic),JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);assert.deepEqual(restored.records,old.records);for(const[k,v]of Object.entries(old.drafts[2]))assert.deepEqual(restored.drafts[2][k],v);const saved=structuredClone(s);const altered=structuredClone(s);altered.drafts[2].studio.workspaces[l.cases[0].id].reasoning='衝突';assert.throws(()=>mergeStates(s,altered),/衝突/);assert.deepEqual(s,saved);
  let body;const fetcher=async(url,options={})=>{if(url.includes('/config'))return new Response(JSON.stringify({reviewVersions:[2],studioVersions:[1]}));if(options.method==='POST'){body=JSON.parse(options.body);return new Response(JSON.stringify({id:'snapshot-one'}));}return new Response(JSON.stringify(body));};const client=new CloudHistory({endpoint:'https://example.test',topicId:topic,fetcher});client.setToken('test-only',3600);await client.backup(s);assert.deepEqual(await client.read('snapshot-one'),s);
 }
});
test('foreign topic/day, malformed new work and nonfinite fields are rejected before storage',()=>{
 const l=courses[0].lessons[0],s=emptyState('structural-analysis'),d={activeMs:0,reasoning:'',explanation:'',mistake:'',values:{},hint:0,errorType:'未判定',updatedAt:'2026-10-28T00:00:00Z'},studio=prepareStudio(d,l,s.topicId);prepareWork(studio,l.cases[0],verificationDrawing(s.topicId));s.drafts[1]=d;assert.ok(validateState(s));assert.equal(validStudio(studio,'reinforced-concrete',1),false);assert.equal(validStudio(studio,s.topicId,2),false);const bad=structuredClone(s);bad.drafts[1].studio.workspaces[l.cases[0].id].snapshot.fields[0].value=NaN;assert.throws(()=>validateState(bad),/草稿/);const stores=new Map(),storage={getItem:k=>stores.get(k)??null,setItem:(k,v)=>stores.set(k,v)};const before=safeSave(storage,s,null);stores.set('learning-lab:v1','different');assert.throws(()=>safeSave(storage,s,before),/另一個分頁/);
});
test('a fresh unanswered workspace does not block a full restore; any real new work remains a conflict',()=>{
 const l=courses[0].lessons[0],d={activeMs:0,hint:0,errorType:'未判定',reasoning:'',explanation:'',mistake:'',values:{}},s=prepareStudio(d,l,courses[0].topic),w=prepareWork(s,l.cases[0],verificationDrawing(courses[0].topic));w.drawing.sheets.workspace=[];assert.equal(meaningfulDraft(d),false);w.values.s0='0';assert.equal(meaningfulDraft(d),true);w.values={};w.warmups.push({id:'unit',prompt:'單位',choice:'kN',correct:false,at:'2026-10-28T00:00:00Z'});assert.equal(meaningfulDraft(d),true);const c=structuredClone(w.snapshot);delete w.snapshot.params;assert.equal(validStudio(s,courses[0].topic,1),false);w.snapshot=c;
});
test('duplicate restore may retain the local activity timestamp but never mask changes to actual drafts',()=>{
 const l=courses[0].lessons[0],d={activeMs:0,updatedAt:'2026-10-28T00:00:00Z'},s=prepareStudio(d,l,courses[0].topic);prepareWork(s,l.cases[0],verificationDrawing(courses[0].topic));const other=structuredClone(d);other.updatedAt='2026-10-28T01:00:00Z';assert.ok(sameDraftContent(d,other));other.studio.workspaces[l.cases[0].id].values.s0='1';assert.equal(sameDraftContent(d,other),false);
});
test('reaction counts and plastic hinge counts require integers rather than one-percent fractional answers',()=>{
 const f={id:'s0',label:'靜不定計數',value:2,unit:'',integer:true};assert.equal(assess([f],{s0:'2'}).correct,1);assert.equal(assess([f],{s0:'2.01'}).correct,0);
});
test('submitted work is retained for inspection but is not reported as an unfinished draft',()=>{
 const c=courses[0].lessons[0].cases[0],d={activeMs:0,hint:0},s=prepareStudio(d,courses[0].lessons[0],courses[0].topic),w=prepareWork(s,c,verificationDrawing(courses[0].topic));w.values.s0='45';assert.equal(meaningfulDraft(d),true);w.submittedId='saved-record';assert.equal(meaningfulDraft(d),false);delete w.submittedId;assert.equal(meaningfulDraft(d),true);
});


test('diagnostic guidance freezes unaided values and cannot lower existing assistance',()=>{
 const c=courses[0].lessons[0].cases[0],s={version:1,selected:c.id,stage:'solve',workspaces:{}},w=prepareWork(s,c,verificationDrawing('structural-analysis'));
 w.values={s0:'-17.25'};revealDiagnostic(w);w.values.s0='45';revealDiagnostic(w);assert.equal(w.firstValues.s0,'-17.25');assert.equal(w.hint,2);reveal(w);revealDiagnostic(w);assert.equal(w.hint,3);
});

test('corrected questions can replace blank or durably submitted snapshots without overwriting unfinished originals',()=>{
 const c=courses[0].lessons[0].cases[0],s={version:1,selected:c.id,stage:'solve',workspaces:{}},w=prepareWork(s,c,emptyWorkspace('beam-full'));const corrected=structuredClone(c);corrected.prompt+='修正版';
 assert.ok(staleExercise(w,corrected));assert.equal(useCurrentExercise(s,corrected,new Set()),true);const pending=prepareWork(s,c,emptyWorkspace('beam-full'));pending.values.s0='-17.25';const original=structuredClone(pending);
 assert.throws(()=>useCurrentExercise(s,corrected,new Set()),/未提交/);assert.deepEqual(s.workspaces[c.id],original);pending.submittedId='saved';assert.throws(()=>useCurrentExercise(s,corrected,new Set()),/未提交/);assert.equal(useCurrentExercise(s,corrected,new Set(['saved'])),true);
});

test('studio backups refuse an unadvertised backend without POST or data loss',async()=>{
 const c=courses[0],l=c.lessons[0],s=emptyState(c.topic),d={activeMs:0,hint:0,values:{},errorType:'未判定'};prepareWork(prepareStudio(d,l,c.topic),l.cases[0],verificationDrawing(c.topic));s.drafts[1]=d;const original=structuredClone(s),calls=[];
 const client=new CloudHistory({endpoint:'https://old.example',topicId:c.topic,fetcher:async(url,options={})=>{calls.push({url,method:options.method});return new Response(JSON.stringify({reviewVersions:[1,2]}));}});client.setToken('test-only',3600);
 await assert.rejects(client.backup(s),/尚未支援/);assert.equal(calls.length,1);assert.equal(calls[0].method,undefined);assert.deepEqual(s,original);
});

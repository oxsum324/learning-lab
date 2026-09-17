import test from 'node:test';
import assert from 'node:assert/strict';
import {LAYOUTS,LESSON_LAYOUTS,lessonLayout} from '../site/drawing-layouts.js';
import {emptyDrawing,emptyWorkspace,toWorkspace,changeLayout,validDrawing,shape,moveShape,makeTemplate} from '../site/drawing-model.js';
import {emptyState,validateState,mergeStates} from '../site/core.js';

test('150 lessons have explicit layouts, with aligned beam plots and task-specific subject diagrams',()=>{
 assert.equal(Object.keys(LESSON_LAYOUTS).length,5);
 for(const ids of Object.values(LESSON_LAYOUTS)){assert.equal(ids.length,30);ids.forEach(id=>assert.ok(Object.hasOwn(LAYOUTS,id)));}
 assert.equal(lessonLayout('structural-analysis',1),'beam-internal');
 assert.equal(lessonLayout('structural-analysis',9),'beam-full');
 assert.equal(lessonLayout('structural-analysis',5),'truss');
 assert.equal(lessonLayout('reinforced-concrete',2),'rc-section');
 assert.equal(lessonLayout('reinforced-concrete',4),'rc-balance');
 assert.equal(lessonLayout('reinforced-concrete',18),'rc-detail');
 assert.equal(lessonLayout('steel-structures',15),'steel-connection');
 assert.equal(lessonLayout('structural-dynamics',8),'dynamics-spectrum');
 assert.equal(lessonLayout('structural-dynamics',9),'dynamics-modal');
 assert.equal(lessonLayout('soil-foundations',3),'soil-stress');
 assert.deepEqual(LAYOUTS['beam-full'].zones.map(z=>z.label),['受力與載重','剪力 V','彎矩 M','變形']);
 assert.ok(LAYOUTS['beam-full'].zones.every(z=>z.x===0&&z.width===1000&&z.baseline-z.y===170));
 for(const l of Object.values(LAYOUTS))for(const z of l.zones){assert.ok(z.x>=0&&z.y>=0&&z.x+z.width<=1000&&z.y+z.height<=l.height);}
});

test('legacy drawings migrate losslessly to one tall canvas without changing source data',()=>{
 const old=emptyDrawing();
 for(const [i,key] of Object.keys(old.sheets).entries()){
  old.sheets[key]=Array.from({length:120},(_,j)=>({...shape(j%2?'pen':'roller',j,520),turn:90,points:j%2?[[j,0],[j,520]]:[],text:'舊圖'+i}));
 }
 const before=structuredClone(old),next=toWorkspace(old,'beam-full');
 assert.deepEqual(old,before);assert.equal(next.version,2);assert.equal(next.layout,'legacy');assert.equal(next.height,1800);
 assert.equal(next.sheets.workspace.length,360);assert.ok(validDrawing(next));
 Object.keys(old.sheets).forEach((key,i)=>old.sheets[key].forEach((s,j)=>{
  const n=next.sheets.workspace[i*120+j],dy=i*600+60;
  assert.deepEqual({...n,y1:n.y1-dy,y2:n.y2-dy,points:n.points.map(([x,y])=>[x,y-dy])},s);
 }));
 assert.deepEqual(toWorkspace(next),next);
});

test('empty old drawings use current lesson layout; existing modern layouts are retained',()=>{
 assert.equal(toWorkspace(undefined,'rc-section').layout,'rc-section');
 assert.equal(toWorkspace(emptyDrawing(),'beam-full').layout,'beam-full');
 assert.equal(toWorkspace(emptyWorkspace('soil-flow'),'rc-section').layout,'soil-flow');
});

test('changing guides and moving across regions never loses lower-canvas geometry',()=>{
 const d=emptyWorkspace('beam-full');d.sheets.workspace=[shape('pen',500,1150)];
 d.sheets.workspace[0].points=[[500,1100],[600,1250]];
 const before=structuredClone(d),free=changeLayout(d,'free');
 assert.deepEqual(d,before);assert.deepEqual(free.sheets,d.sheets);assert.equal(free.height,1280);assert.ok(validDrawing(free));
 const moved=moveShape(shape('arrow',200,100),0,1000,1280);
 assert.equal(moved.y1,1100);assert.ok(validDrawing({...free,sheets:{workspace:[moved]}}));
 assert.equal(changeLayout(emptyWorkspace('beam-full'),'free').height,960);
});

test('new workspace rejects bad layouts, unsafe sizes, excess objects and hostile geometry',()=>{
 const good=emptyWorkspace('free');good.sheets.workspace=[shape('line')];
 for(const patch of [{layout:'__proto__'},{layout:'unknown'},{height:Infinity},{height:2401},{height:10},{sheets:{workspace:[],other:[]}},{version:3}])assert.equal(validDrawing({...good,...patch}),false);
 for(const patch of [{type:'foreignObject'},{points:[[10,10000]]},{color:'url(https://example.org)'},{y1:961}]){
  const bad=structuredClone(good);Object.assign(bad.sheets.workspace[0],patch);assert.equal(validDrawing(bad),false);
 }
 good.sheets.workspace=Array.from({length:481},()=>shape('line'));assert.equal(validDrawing(good),false);
});

test('mixed legacy and current attempts survive backup/import with their original drawings and grades',()=>{
 const state=emptyState('reinforced-concrete');
 const base={day:2,activeMs:1000,reasoning:'原稿',explanation:'',mistake:'',hint:0,errorType:'未判定',values:{},startedAt:'',updatedAt:'2026-09-17T00:00:00Z',submittedAt:'2026-09-17T00:00:00Z',curriculumVersion:'test',assessment:{text:'原核對結果'}};
 const legacy=emptyDrawing();legacy.sheets.internal=[shape('curve')];
 const current=emptyWorkspace('rc-section');current.sheets.workspace=[shape('rect',300,100),shape('circle',400,200)];
 state.records=[{...base,id:'old',drawing:legacy},{...base,id:'new',drawing:current}];
 state.drafts[3]={...base,drawing:current};
 const copy=validateState(JSON.parse(JSON.stringify(state)),'reinforced-concrete');assert.deepEqual(copy,state);assert.deepEqual(mergeStates(state,copy),state);
});

test('subject base templates contain only editable geometry and no numerical answers',()=>{
 for(const id of ['section','hsection','layers','plot']){
  const d=emptyWorkspace('free');d.sheets.workspace=makeTemplate(id);
  assert.ok(d.sheets.workspace.length>0);assert.ok(validDrawing(d));assert.ok(d.sheets.workspace.every(s=>!s.text));
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {TOPICS} from '../site/topics.js';
import {REVIEW_CONTENT,diagramDrawing} from '../site/review-content.js';
import {GUIDES} from '../site/teaching-guides.js';
import {DEFAULT_PREFS,normalizePrefs,needsReview} from '../site/learning-flow.js';
import {newReview,reviewMaterial,availableMaterial,reviewOutcome,numericRecognitionNote,validReview} from '../site/progressive-review.js';
import {readSeedFields} from '../scripts/seed-fields.mjs';
const courses=Object.entries(TOPICS).map(([id,t])=>[id,JSON.parse(readFileSync(new URL('../site/'+t.curriculum,import.meta.url)))]);
test('new preferences start closed book and saved explicit preferences survive',()=>{
 assert.equal(DEFAULT_PREFS.reviewMode,'advanced');
 for(const input of [undefined,null,{}, {reviewMode:'invalid'}])assert.equal(normalizePrefs(input).reviewMode,'advanced');
 for(const reviewMode of ['advanced','progressive'])assert.equal(normalizePrefs({reviewMode}).reviewMode,reviewMode);
 const p=newReview('independent');p.mode='advanced';
 const record={progressive:p,hint:0,answerViewed:false,errorType:'無明顯錯誤',mistake:'',assessment:{total:3,correct:3,review:reviewOutcome(p,{questions:[]})}};
 assert.equal(needsReview(record),false);
 record.progressive.assistance=1;assert.equal(needsReview(record),true);
});
test('numeric choices require a saved numeric submission and exposure is never closed book',()=>{
 for(const [topic,c] of courses){
  const d=c.days[1],p=newReview(),m=reviewMaterial(d,topic,d.guide??GUIDES[2]);
  assert.equal(availableMaterial(m,p).questions.some(q=>q.id==='quantity'),false);
  assert.equal(numericRecognitionNote(p),'');
  p.numericSubmission=Object.fromEntries(d.fields.map(f=>[f.id,String(f.value)]));
  assert.equal(availableMaterial(m,p).questions.some(q=>q.id==='quantity'),true);assert.ok(validReview(p));
  p.quantitySeen=true;p.stage='independent';assert.match(numericRecognitionNote(p),/辨識後填入，不計閉卷/);
  assert.deepEqual(JSON.parse(JSON.stringify(p)).numericSubmission,p.numericSubmission);
  assert.equal(validReview({...p,numericSubmission:[]}),false);
  assert.equal(validReview({...p,numericSubmission:{x:123}}),false);
 }
 const legacy=newReview();legacy.selections.quantity='0';assert.match(numericRecognitionNote(legacy),/不計閉卷/);
});
test('loaded five-subject teaching text and actual diagram labels use Traditional Chinese',()=>{
 const forbidden=/[设无侧论两额双时画会为强脚产稳静弹关条对总开较务墙离题]/;
 function scan(value,where){if(typeof value==='string'){assert.doesNotMatch(value,forbidden,where+': '+value);assert.doesNotMatch(value,/水占/,where);}else if(value&&typeof value==='object')for(const [key,v]of Object.entries(value))scan(v,where+'.'+key);}
 scan(REVIEW_CONTENT,'REVIEW_CONTENT');scan(GUIDES,'GUIDES');
 for(const [topic,c]of courses){scan(c,topic);for(const d of c.days){const m=reviewMaterial(d,topic,d.guide??GUIDES[d.day]);scan(m,topic+'.D'+d.day);}}
 for(const registry of Object.values(REVIEW_CONTENT))for(const content of Object.values(registry))if(content.visual)for(let variant=0;variant<3;variant++)scan(diagramDrawing(content.visual,variant),'rendered diagram');
 for(const name of ['review-content','teaching-guides'])assert.doesNotMatch(readFileSync(new URL('../site/'+name+'.js',import.meta.url),'utf8'),/\.replace(?:All)?\(/);
});
test('all published numeric fields have descriptive physical labels from the source bank',()=>{
 for(const [topic,c]of courses)for(const d of c.days)for(const f of d.fields)assert.doesNotMatch(f.label,/[（(]第|第\s*[0-9０-９一二三四五六七八九十]+\s*項/,topic+' '+f.id);
 const expected={'steel-structures':['斷面積 A','強軸迴轉半徑 rx','強軸斷面模數 Sx'],'structural-dynamics':['自然圓頻率 ωn','自然週期 Tn','阻尼比 ζ'],'soil-foundations':['乾單位重 γd','濕單位重 γ','飽和度 S']};
 for(const [topic,labels]of Object.entries(expected))assert.deepEqual(courses.find(([id])=>id===topic)[1].days[1].fields.map(f=>f.label),labels);
 const dir=mkdtempSync(join(tmpdir(),'learning-label-'));
 try{const path=join(dir,'bank.md');writeFileSync(path,'### A｜幾何\n\n## 核對答案與驗算紀錄\n| A | `area` | 42 | mm² |\n\n## 平台欄位名稱\n| `area` | 斷面積 A |\n');assert.deepEqual(readSeedFields(path).get('a'),[{id:'area',label:'斷面積 A',value:42,unit:'mm²'}]);}finally{assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep+'learning-label-'));rmSync(dir,{recursive:true});}
});
test('repeat structural models skip recognition and retain editable completion scaffolds',()=>{
 const c=courses.find(([id])=>id==='structural-analysis')[1];
 for(const day of [4,9,10,28]){const m=reviewMaterial(c.days[day-1],'structural-analysis',GUIDES[day]);assert.equal(m.questions.length,0);assert.ok(m.scaffold.drawing.sheets.workspace.length);}
});

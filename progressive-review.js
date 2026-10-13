// Shared, lesson-specific scaffolding. No mastery score is inferred from recognition.
export const STAGES={recognize:'1 · 候選辨識',guided:'2 · 提示補完',independent:'3 · 獨立作答'};
import {REVIEW_CONTENT,diagramDrawing,lessonScaffold} from './review-content.js?v=0.15.0';
function options(texts,seed,reasons=[]){
 const out=texts.map((text,i)=>({id:String(i),text,reason:i?reasons[i-1]??text:'依本課題設與模型。'}));
 let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 for(let i=out.length-1;i>0;i--){h^=h<<13;h^=h>>>17;h^=h<<5;const j=(h>>>0)%(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;
}
export function reviewMaterial(lesson,topic,guide){
 if(!guide?.draw?.length||!guide?.worked?.length)throw Error('缺少本課補完教材');
 const content=REVIEW_CONTENT[topic]?.[lesson.day],questions=[];
 if(content&&!content.skipRecognition){
  questions.push({id:'concept',prompt:'依本課題設，哪個觀念／推導判斷成立？',correct:'0',options:options(content.texts,`${topic}:${lesson.day}:concept`)});
  if(content.visual){const v=content.visual;questions.push({id:'diagram',prompt:v.prompt,correct:'0',options:options(v.labels,`${topic}:${lesson.day}:diagram`).map(o=>({...o,drawing:diagramDrawing(v,Number(o.id)),alt:o.text}))});}
  if(content.quantity){const n=content.quantity,f=lesson.fields.find(f=>f.id===n.field);if(!f)throw Error('候選指定量與教材不一致');questions.push({id:'quantity',prompt:`${f.label}（${f.unit}）是哪個候選量？`,correct:'0',options:options([f.value,...n.wrong].map(v=>`${Number(v.toPrecision(7))} ${f.unit}`),`${topic}:${lesson.day}:quantity`,n.reasons)});}
 }
 const scaffold=lessonScaffold(topic,lesson.day,content);
 return {questions,scaffold,source:content?.source??'原課提示',coverage:content?.skipRecognition?'guided-only':content?.visual?'visual':content?'text':'guided-only',starter:guide.worked[0],complete:scaffold?scaffold.task+'\n本課核對方向：'+lesson.check:`依本課起式，補出模型／適用條件、下一個方程或檢核，並用自己的話說明。\n本課核對方向：${lesson.check}`,draw:guide.draw.map(line=>line.replace(/[-−+]?\d+(?:\.\d+)?/g,'＿＿')).join('\n'),scope:content?.skipRecognition?'本課為重練：跳過重複辨識；可獨立作答，卡住時使用半成品補完。':content?`${content.source}：${content.visual?'有圖像候選及可編輯半成品圖。':'有逐課編寫文字候選；未提供可靠半成品圖。'}只核對指定辨識項，圖形、推導與完整能力待審閱。`:'本課尚無可靠的辨識選項與半成品圖：使用起式補完或獨立作答；自選／原卷題請附完整題源與條件，不自動判完整解答。'};
}
// Numeric alternatives are withheld until this attempt has a saved numeric submission.
export function availableMaterial(material,p){return {...material,questions:material.questions.filter(q=>q.id!=='quantity'||p.numericSubmission!==undefined)};}
export function numericRecognitionNote(p){return p.quantitySeen===true||Object.hasOwn(p.selections,'quantity')?'辨識後填入，不計閉卷。':'';}
export {newReview,validReview,markSupport} from './review-state.js?v=0.15.0';
export function recognitionResult(material,p){const total=material.questions.length,correct=material.questions.filter(q=>p.selections[q.id]===q.correct).length;return {total,correct,complete:total>0&&material.questions.every(q=>Object.hasOwn(p.selections,q.id)),passed:total>0&&correct===total};}
export function reviewOutcome(p,material,hint=0,answerViewed=false){
 const assistance=Math.max(p.assistance,hint,answerViewed?3:0,p.stage==='recognize'?1:p.stage==='guided'?2:0);
 if(p.stage==='recognize'&&!material.questions.length)return {kind:'unsupported',assistance,text:'本課未備可靠候選，請選提示補完或獨立作答；不給辨識得分。'};
 if(p.stage==='recognize'){const r=recognitionResult(material,p);return {kind:r.passed?'recognized':'retry',assistance,checks:material.questions.map(q=>({prompt:q.prompt,selected:q.options.find(o=>o.id===p.selections[q.id])?.text??'未選',expected:q.options.find(o=>o.id===q.correct)?.text,ok:q.correct===p.selections[q.id],reason:q.options.find(o=>o.id===p.selections[q.id])?.reason??'未選'})),text:`候選辨識 ${r.correct}/${r.total}；${r.passed?'可進入提示補完':'請再辨識'}。辨識成果不等於獨立掌握。`};}
 return {kind:'pending',assistance,text:p.stage==='guided'?'提示補完已記錄；模型、圖形與推導待教練審閱，可試下一次獨立作答。':assistance?'本次含候選或提示協助；待審閱，請另次閉卷重做確認。':'閉卷獨立作答已記錄；完整掌握仍待教練審閱。'};
}
export function recommendedStage(records,day){const latest=records.filter(r=>r.day===day).sort((a,b)=>(a.submittedAt??'').localeCompare(b.submittedAt??'')||String(a.id??'').localeCompare(String(b.id??''))).at(-1);const p=latest?.progressive;if(!p)return 'recognize';if(p.stage==='recognize')return latest.assessment?.review?.kind==='recognized'?'guided':'recognize';return 'independent';}

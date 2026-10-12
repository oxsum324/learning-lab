// Shared, lesson-specific scaffolding. No mastery score is inferred from recognition.
export const STAGES={recognize:'1 · 候選辨識',guided:'2 · 提示補完',independent:'3 · 獨立作答'};
const misconceptions={
 'structural-analysis':['只數未知反力，不檢查結構是否穩定。','忽略支承與正負號，直接套用記得的公式。'],
 'reinforced-concrete':['先假定所有鋼筋都已降伏，不檢查應變。','忽略階段、單位與題設條件，只套一個強度公式。'],
 'steel-structures':['只檢查材料降伏，不考慮屈曲或接合傳力。','忽略支撐及斷面條件，所有構件用同一強度。'],
 'structural-dynamics':['不定義自由度、座標或輸入，直接套週期公式。','忽略質量、勁度與適用條件，所有振態直接相加。'],
 'soil-foundations':['不區分總應力與有效應力，忽略水位與排水條件。','不檢查土層與試驗条件，所有土都用同一強度參數。'.replace('条件','條件')]
};
function options(texts,seed){return texts.map((text,i)=>({id:String(i),text})).sort((a,b)=>((Number(a.id)+seed)%3)-((Number(b.id)+seed)%3));}
export function reviewMaterial(lesson,topic,guide){
 const wrong=misconceptions[topic];
 if(!wrong||!guide?.draw?.length||!guide?.worked?.length)throw Error('缺少本課漸進練習教材');
 const questions=[{id:'model',prompt:'依本課題設，哪個圖解／檢核方向適合先做？',correct:'0',options:options([guide.draw[0],...wrong],lesson.day)}];
 const f=lesson.fields[0];
 if(f){const alternatives=[f.value,f.value===0?1:f.value*2,f.value===0?-1:f.value/2];questions.push({id:'number',prompt:`先估算或回想：${f.label}（${f.unit}）是哪個候選值？`,correct:'0',options:options(alternatives.map(n=>`${Number(n.toPrecision(7))} ${f.unit}`),lesson.day+1)});}
 return {questions,starter:guide.worked[0],complete:`已給第一步。請接著補出模型／適用條件、下一個方程或檢核，並用自己的話說明。\n本課核對方向：${lesson.check}`,draw:guide.draw.map(line=>line.replace(/[-−+]?\d+(?:\.\d+)?/g,'＿＿')).join('\n'),scope:f?'有指定數值可核對；圖形與推導仍待審閱。':'本課為觀念／自選題／原卷任務：辨識只核對本課作答方向，完整解答由教練審閱。'};
}
export const newReview=(stage='recognize')=>({version:1,mode:'progressive',stage,assistance:0,selections:{},checked:false,starterSeen:false});
export function validReview(p){return p===undefined||!!p&&p.version===1&&['progressive','advanced'].includes(p.mode)&&Object.hasOwn(STAGES,p.stage)&&[0,1,2,3].includes(p.assistance)&&(p.selectedStage===undefined||typeof p.selectedStage==='boolean')&&typeof p.checked==='boolean'&&typeof p.starterSeen==='boolean'&&p.selections!==null&&typeof p.selections==='object'&&!Array.isArray(p.selections)&&Object.keys(p.selections).length<=2&&Object.entries(p.selections).every(([k,v])=>['model','number'].includes(k)&&['0','1','2'].includes(v));}
export function markSupport(p,level){p.assistance=Math.max(p.assistance,level);return p;}
export function recognitionResult(material,p){const total=material.questions.length,correct=material.questions.filter(q=>p.selections[q.id]===q.correct).length;return {total,correct,complete:material.questions.every(q=>Object.hasOwn(p.selections,q.id)),passed:correct===total};}
export function reviewOutcome(p,material,hint=0,answerViewed=false){
 const assistance=Math.max(p.assistance,hint,answerViewed?3:0,p.stage==='recognize'?1:p.stage==='guided'?2:0);
 if(p.stage==='recognize'){const r=recognitionResult(material,p);return {kind:r.passed?'recognized':'retry',assistance,checks:material.questions.map(q=>({prompt:q.prompt,selected:q.options.find(o=>o.id===p.selections[q.id])?.text??'未選',expected:q.options.find(o=>o.id===q.correct)?.text,ok:q.correct===p.selections[q.id]})),text:`候選辨識 ${r.correct}/${r.total}；${r.passed?'可進入提示補完':'請再辨識'}。辨識成果不等於獨立掌握。`};}
 return {kind:'pending',assistance,text:p.stage==='guided'?'提示補完已記錄；模型、圖形與推導待教練審閱，可試下一次獨立作答。':assistance?'本次含候選或提示協助；待審閱，請另次閉卷重做確認。':'閉卷獨立作答已記錄；完整掌握仍待教練審閱。'};
}
export function recommendedStage(records,day){const latest=records.filter(r=>r.day===day).sort((a,b)=>(a.submittedAt??'').localeCompare(b.submittedAt??'')||String(a.id??'').localeCompare(String(b.id??''))).at(-1);const p=latest?.progressive;if(!p)return 'recognize';if(p.stage==='recognize')return latest.assessment?.review?.kind==='recognized'?'guided':'recognize';return 'independent';}

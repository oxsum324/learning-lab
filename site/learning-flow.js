import {hasDrawing} from './drawing-model.js?v=0.14.0';
import {sessionPhases,sessionKind} from './session-phases.js?v=0.14.0';

export const PHASES={
 'structural-analysis':['平衡與靜定分析','位移與能量方法','力法與靜不定','影響線與整合演練'],
 'reinforced-concrete':['診斷與斷面強度','構件與構造細節','耐震與預力','歷屆題與弱項重練'],
 'steel-structures':['材料與軸力構材','梁與梁柱','接合與整體行為','歷屆題與弱項重練'],
 'structural-dynamics':['單自由度系統','多自由度與振態','耐震設計應用','歷屆題與弱項重練'],
 'soil-foundations':['土壤性質與水','應力、壓密與強度','基礎與穩定分析','歷屆題與弱項重練']
};
export const RANGES=[[1,7],[8,14],[15,23],[24,30]];
export const RECALL={
 'structural-analysis':'先不看公式：這個模型有哪些支承反力？平衡式足夠嗎？',
 'reinforced-concrete':'先不看公式：本題的受力、應變假設與控制機制是什麼？',
 'steel-structures':'先不看公式：可能控制的破壞模式有哪些？採哪一套設計法？',
 'structural-dynamics':'先不看公式：自由度、正方向與輸入量如何定義？',
 'soil-foundations':'先不看公式：水位、排水條件與應力種類如何決定？'
};
export function meaningfulDraft(d){return !!d&&(d.progressive?.selectedStage===true||d.activeMs>0||d.answerViewed===true||d.hint>0||!['','未判定'].includes(d.errorType??'')||['reasoning','explanation','mistake'].some(k=>d[k]?.trim())||Object.values(d.values??{}).some(v=>String(v).trim())||hasDrawing(d.drawing));}
export function needsReview(record){return !!record&&((record.progressive&&record.progressive.stage!=='independent')||record.progressive?.assistance>0||record.hint>=2||record.answerViewed===true||(record.assessment?.total>0&&record.assessment.correct<record.assessment.total)||!['','未判定','無明顯錯誤'].includes(record.errorType??'')||!!record.mistake?.trim());}
export function dayStatus(state,day){
 const records=state.records.filter(r=>r.day===day).sort((a,b)=>Date.parse(b.submittedAt)-Date.parse(a.submittedAt)||b.id.localeCompare(a.id));
 const latest=records[0],draft=meaningfulDraft(state.drafts[day]);
 return {latest,draft,count:records.length,review:needsReview(latest),label:draft?'有草稿':needsReview(latest)?'待重練':latest?'已提交':'未開始'};
}
export function nextLesson(state){
 const drafts=Object.entries(state.drafts).filter(([,d])=>meaningfulDraft(d)).sort((a,b)=>(Date.parse(b[1].updatedAt)||0)-(Date.parse(a[1].updatedAt)||0));
 if(drafts.length)return {day:Number(drafts[0][0]),reason:'接續未完成的草稿'};
 for(let day=1;day<=30;day++)if(!state.records.some(r=>r.day===day))return {day,reason:'依進度開始下一課'};
 const reviews=Array.from({length:30},(_,i)=>({day:i+1,...dayStatus(state,i+1)})).filter(d=>d.review).sort((a,b)=>Date.parse(a.latest.submittedAt)-Date.parse(b.latest.submittedAt));
 return reviews.length?{day:reviews[0].day,reason:'回看並重練弱項'}:{day:30,reason:'已提交全部課次，做一次整合回顧'};
}
export function lessonMode(lesson,topic){
 if(lesson.fields.length)return {label:'本頁數值題',note:'已列完整短題；數值可核對，圖解與推導仍需審閱。'};
 if(/官方原卷|官方原題連結|原卷完整|完整試卷/.test(lesson.problem)&&lesson.day>=24&&lesson.day<=27)return {label:'官方原卷練習',note:'先開啟題目來源，依完整原圖及條件作答；來源年份以連結標示為準。'};
 if(lesson.day===1&&topic!=='structural-analysis')return {label:'起點診斷',note:'先閉卷完成，再核對提示；診斷結果不等同計算能力已驗收。'};
 if(/教材自選題|選一題|教材短題|同主題教材|自己的已作答原稿/.test(lesson.problem))return {label:'自備題源',note:'先記下教材、頁碼、題號及完整條件；未完成數值練習時請明確註記。'};
 return {label:'圖解與推導',note:'依本頁要求留下圖形、方程或短答，再逐項核對驗收條件。'};
}
export function practiceBudget(minutes,day,topic){
 const phases=sessionPhases(minutes,day,topic),work=phases.find(p=>p.id==='work'),check=phases.find(p=>p.id==='check');
 return {text:phases.map(p=>`${p.id==='read'?'閱讀':p.label} ${p.minutes} 分`).join(' → '),read:sessionKind(day,topic)==='ordinary'?'看什麼 · 5 分鐘':'閉卷前確認題目完整',practice:`${work.label} · ${work.minutes} 分鐘`,check:`${check.label} · ${check.minutes} 分鐘`};
}
export const DEFAULT_PREFS={minutes:30,largeText:false,reduceMotion:false,startToday:true,reviewMode:'progressive',lastDays:{}};
export function normalizePrefs(input){
 const lastDays={};for(const [id,d] of Object.entries(input?.lastDays??{}))if(Object.hasOwn(PHASES,id)&&Number.isInteger(d)&&d>=1&&d<=30)lastDays[id]=d;
 return {minutes:[30,45,60].includes(input?.minutes)?input.minutes:30,largeText:input?.largeText===true,reduceMotion:input?.reduceMotion===true,startToday:input?.startToday!==false,reviewMode:input?.reviewMode==='advanced'?'advanced':'progressive',lastDays};
}
export function coachSummary(state,name){
 const lines=[`# ${name}｜學習回顧`,'','此摘要供教練閱讀；完整圖形及可還原資料請另附 JSON。',`已提交 ${state.records.length} 筆；另有 ${Object.values(state.drafts).filter(meaningfulDraft).length} 課未完成草稿，草稿內容請見 JSON。`,''];
 for(const r of [...state.records].sort((a,b)=>a.day-b.day||a.submittedAt.localeCompare(b.submittedAt))){lines.push(`## D${String(r.day).padStart(2,'0')}｜${r.submittedAt}`,`- 作答 ID：${r.id}`,`- 用時：${(r.activeMs/60000).toFixed(1)} 分鐘；提示：${r.hint}；錯因：${r.errorType}`,`- 填答數值（欄位代碼）：${Object.entries(r.values??{}).map(([key,value])=>key+' = '+value).join('；')||'未填'}`,`- 練習階段：${r.progressive?.stage??'舊版作答'}；候選 ${r.assessment.review?.checks?.map(c=>c.selected).join('；')??'無'}；最高協助 ${r.progressive?.assistance??r.hint}`,`- 數值核對：${r.assessment.text}`,`- 圖解：${hasDrawing(r.drawing)?'有，請見完整 JSON':'未提供'}`,'',`推導：\n${r.reasoning||'未填'}`,`\n白話解釋：\n${r.explanation||'未填'}`,`\n訂正／問題：\n${r.mistake||'未填'}`,'');}
 if(!state.records.length)lines.push('尚無已提交作答。');return lines.join('\n');
}

// Session time is active practice time; weekly/exam limits stay fixed.
export function sessionKind(day,topic){
 if(topic!=='structural-analysis'&&day>=24&&day<=27)return 'exam';
 if([7,14].includes(day)||(topic==='structural-analysis'&&[21,23,28,29].includes(day))||(['reinforced-concrete','steel-structures'].includes(topic)&&[23,29].includes(day)))return 'weekly';
 return 'ordinary';
}
const hints={recall:'先閉卷回想模型、假設與解題方向。',read:'確認題目條件、單位與所求。',work:'獨立畫圖、列式並完成計算。',check:'核對數值、符號與推導，找出差異。',record:'用一句話留下錯因與下次檢查方式。',correction:'重建卡住的步驟，補上訂正與白話說明。'};
export function sessionPhases(minutes,day,topic){
 const target=[30,45,60].includes(minutes)?minutes:30,kind=sessionKind(day,topic),extra=target-30;
 let rows=kind==='exam'?[['work','閉卷作答',25],['check','檢查',5]]:kind==='weekly'?[['work','閉卷作答',20],['check','核對',10]]:topic==='structural-analysis'?[['recall','回想',3],['read','讀題',5],['work','手算',15+extra],['check','驗收',4],['record','記錄',3]]:[['recall','回想',3],['read','讀題',5],['work','手算',17+extra],['check','驗收與記錄',5]];
 if(kind!=='ordinary'&&extra)rows.push(['correction','訂正補強',extra]);
 let start=0;return rows.map(([id,label,minutes])=>{const phase={id,label,minutes,startMs:start,endMs:start+minutes*60000,hint:hints[id]};start=phase.endMs;return phase;});
}
export function phaseAt(phases,ms){return phases.findIndex(p=>ms<p.endMs);}
export function referenceLocked(phases,ms,submitted=false){return !submitted&&ms<(phases.find(p=>p.id==='work')?.endMs??0);}
export function referenceAccess(id,phases,ms,{started=ms>0,submitted=false}={}){
 if(submitted)return {locked:false,hint:0};
 if(id==='concept-details'){
  // Scheduled preparation is not assistance; pausing a started work phase is.
  const preparation=!started||ms<(phases.find(p=>p.id==='work')?.startMs??0);
  return {locked:!preparation,hint:preparation?0:1};
 }
 return {locked:referenceLocked(phases,ms),hint:3};
}
export function recordHint(draft,level){
 if(![1,2,3].includes(level))throw Error('請選擇提示等級。');
 draft.hint=Math.max(draft.answerViewed?3:draft.hint||0,level);
 if(level===3)draft.answerViewed=true;
 return draft;
}

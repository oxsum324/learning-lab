export const TOPICS = {
  'structural-analysis': {name:'結構學',curriculum:'curriculum.json',description:'每天30分鐘。從受力圖開始，逐步恢復位移與一次靜不定的解題能力。',route:'靜定分析 → 位移 → 一次靜不定 → 整合驗收。課次依實際進度推進。'},
  'reinforced-concrete': {name:'鋼筋混凝土',curriculum:'rc-curriculum.json',description:'每天30～60分鐘。複習梁柱、剪扭、耐震與預力，完成結構技師考前演練。',route:'梁柱與剪力 → 扭力、樓板與耐震 → 預力 → 歷屆題與錯題重做。課次依實際進度推進。'}
};
export function resolveTopic(search=''){const id=new URLSearchParams(search).get('topic')||'structural-analysis';if(!Object.hasOwn(TOPICS,id))throw Error('不支援的學習主題');return id;}
export function storageKey(topicId,sandbox=false){if(!Object.hasOwn(TOPICS,topicId))throw Error('不支援的學習主題');return `learning-lab:${sandbox?'sandbox:':''}${topicId==='structural-analysis'?'':topicId+':'}v1`;}
export function dayKey(topicId,sandbox=false){return storageKey(topicId,sandbox).replace(/v1$/,'day');}

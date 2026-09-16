export const TOPICS = {
  'structural-analysis': {name:'結構學',curriculum:'curriculum.json',description:'每天30分鐘。從受力圖開始，逐步恢復位移與一次靜不定的解題能力。',route:'靜定分析 → 位移 → 一次靜不定 → 整合驗收。課次依實際進度推進。'},
  'reinforced-concrete': {name:'鋼筋混凝土',curriculum:'rc-curriculum.json',description:'每天30～60分鐘。複習梁柱、剪扭、耐震與預力，完成結構技師考前演練。',route:'梁柱與剪力 → 扭力、樓板與耐震 → 預力 → 歷屆題與錯題重做。課次依實際進度推進。'},
  'steel-structures': {name:'鋼結構',curriculum:'steel-curriculum.json',description:'每天30～60分鐘。複習構材、接合、塑性與耐震，練習ASD與LRFD考題。',route:'材料與受拉受壓 → 梁與梁柱 → 接合、塑性及施工 → 考題與弱項驗收。'},
  'structural-dynamics': {name:'耐震設計及結構動力',curriculum:'dynamics-curriculum.json',description:'每天30～60分鐘。複習動力分析、建築與橋梁耐震，以及隔減震原理。',route:'單自由度 → 多自由度與振態 → 耐震、橋梁與隔減震 → 考題與弱項驗收。'},
  'soil-foundations': {name:'土壤力學及大地工程',curriculum:'soil-curriculum.json',description:'每天30～60分鐘。依土壤力學與基礎設計考綱，練習應力、強度、基礎與穩定分析。',route:'土壤性質與水 → 應力、壓密與強度 → 基礎、擋土、邊坡與改良 → 考題與弱項驗收。'}
};
export function resolveTopic(search=''){const id=new URLSearchParams(search).get('topic')||'structural-analysis';if(!Object.hasOwn(TOPICS,id))throw Error('不支援的學習主題');return id;}
export function storageKey(topicId,sandbox=false){if(!Object.hasOwn(TOPICS,topicId))throw Error('不支援的學習主題');return `learning-lab:${sandbox?'sandbox:':''}${topicId==='structural-analysis'?'':topicId+':'}v1`;}
export function dayKey(topicId,sandbox=false){return storageKey(topicId,sandbox).replace(/v1$/,'day');}

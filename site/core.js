export const KEY='learning-lab:v1';
export const emptyState=()=>({schemaVersion:1,topicId:'structural-analysis',records:[],drafts:{}});
export function assess(fields,values,hint=0){
 const checks=fields.map(f=>{const raw=String(values[f.id]??'').trim();const n=raw===''?NaN:Number(raw);return {label:f.label,expected:f.value,actual:Number.isFinite(n)?n:null,unit:f.unit,ok:Number.isFinite(n)&&Math.abs(n-f.value)<=Math.max(Math.abs(f.value)*.01,.000001)};});
 const correct=checks.filter(c=>c.ok).length;
 const text=!checks.length?'已記錄，待教練審閱':`${correct}/${checks.length} 項關鍵數值符合`;
 return {checks,correct,total:checks.length,text:text+(hint>=2?'；已使用方程或答案，需另日閉卷重做':'；推導與受力模型尚待審閱'),status:'submitted'};
}
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=(v,max=12000)=>typeof v==='string'&&v.length<=max;
function draftOK(d){return isObj(d)&&Number.isFinite(d.activeMs)&&d.activeMs>=0&&d.activeMs<=86400000&&str(d.reasoning??'')&&str(d.explanation??'',8000)&&str(d.mistake??'',8000)&&[0,1,2,3].includes(d.hint??0)&&str(d.errorType??'',60)&&isObj(d.values??{})&&Object.keys(d.values??{}).length<=20&&Object.entries(d.values??{}).every(([k,v])=>/^[a-zA-Z0-9_]{1,40}$/.test(k)&&str(v,100))&&str(d.startedAt??'',50)&&str(d.updatedAt??'',50);}
export function validateState(s){
 if(!isObj(s)||s.schemaVersion!==1||s.topicId!=='structural-analysis'||!Array.isArray(s.records)||s.records.length>2000||!isObj(s.drafts))throw Error('備份格式或版本不支援。');
 const ids=new Set();
 for(const r of s.records){if(!isObj(r)||!str(r.id,100)||!r.id||ids.has(r.id)||!Number.isInteger(r.day)||r.day<1||r.day>30||!draftOK(r)||!str(r.submittedAt,50)||!Number.isFinite(Date.parse(r.submittedAt))||!str(r.curriculumVersion,40)||!isObj(r.assessment)||!str(r.assessment.text,500))throw Error('備份含無效或重複的作答紀錄。');ids.add(r.id);}
 if(Object.keys(s.drafts).length>30||Object.entries(s.drafts).some(([k,v])=>!/^([1-9]|[12][0-9]|30)$/.test(k)||!draftOK(v)))throw Error('備份草稿資料無效。');
 return s;
}
export function mergeStates(a,b){
 validateState(a);validateState(b);const result=structuredClone(a),ids=new Map(result.records.map(r=>[r.id,r]));
 for(const r of b.records){if(ids.has(r.id)){if(JSON.stringify(ids.get(r.id))!==JSON.stringify(r))throw Error('同一作答ID內容衝突，未匯入；請保留兩份備份交給教練。');}else{result.records.push(structuredClone(r));ids.set(r.id,r);}}
 for(const [day,d] of Object.entries(b.drafts)){const existing=result.drafts[day];if(!existing)result.drafts[day]=structuredClone(d);else if(JSON.stringify(existing)!==JSON.stringify(d))throw Error(`第${day}天草稿衝突，未匯入；請先送出目前草稿或保留兩份備份。`);}
 return validateState(result);
}
export function safeSave(storage,state,expected){const current=storage.getItem(KEY);if(current!==expected)throw Error('另一個分頁已變更紀錄。請先匯出目前資料，再重新整理合併。');const value=JSON.stringify(validateState(state));storage.setItem(KEY,value);return value;}

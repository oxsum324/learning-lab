// Authored rows keep the prompt, each option's reason, and the answer explicit.
const options = rows => rows.map(([text,reason],i)=>({id:String.fromCharCode(97+i),text,reason}));
export const S=(level,key,skill,prompt,rows,index,explanation)=>({level,key,skill,prompt,type:'single',options:options(rows),answer:String.fromCharCode(97+index),explanation});
export const M=(level,key,skill,prompt,rows,indices,explanation)=>({level,key,skill,prompt,type:'multi',options:options(rows),answer:indices.map(i=>String.fromCharCode(97+i)),explanation});
export const E=(key,skill,prompt,rows,index,explanation)=>({...S(3,key,skill,prompt,rows,index,explanation),type:'error'});
export const O=(key,skill,prompt,rows,explanation,precedences)=>({level:3,key,skill,prompt,type:'order',options:options(rows),answer:rows.map((_,i)=>String.fromCharCode(97+i)),explanation,...(precedences?{precedences}: {})});
export function lesson(topic,prefix,day,model,locator,rows,kind='principle') {
 return rows.map(({key,...row})=>({id:`${prefix}-d${String(day).padStart(2,'0')}-${key}`,version:1,topic,day,model,assistance:row.level===3?2:1,source:{kind,label:kind==='specified-model'?'明示題設模型':'教材原理',locator},...(day===1?{diagnostic:true}:{}),...row}));
}

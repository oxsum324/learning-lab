import {validDrawing,hasDrawing} from '../drawing-model.js?v=0.16.1';
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const str=(v,n=12000)=>typeof v==='string'&&v.length<=n;
const stamp=v=>str(v,40)&&Number.isFinite(Date.parse(v));
function snapshotOK(c,id){return obj(c)&&c.id===id&&c.version===1&&(c.unitSystem===undefined||c.unitSystem==='taiwan-gravity')&&Number.isInteger(c.index)&&c.index>=0&&c.index<=4&&id.endsWith('-v'+c.index)&&str(c.title,300)&&str(c.type,100)&&str(c.model,100)&&typeof c.condition==='boolean'&&str(c.prompt,12000)&&str(c.plain,8000)&&obj(c.params)&&Object.keys(c.params).length<=20&&Object.entries(c.params).every(([k,v])=>/^[A-Za-z][A-Za-z0-9]*$/.test(k)&&Number.isFinite(v))&&Array.isArray(c.fields)&&c.fields.length>=1&&c.fields.length<=10&&c.fields.every(f=>obj(f)&&/^s\d$/.test(f.id)&&str(f.label,200)&&str(f.unit,50)&&Number.isFinite(f.value))&&Array.isArray(c.steps)&&c.steps.length<=20&&c.steps.every(t=>str(t,4000))&&obj(c.drawing)&&['beam','frame','axial','truss','section','connection','dynamic','soil'].includes(c.drawing.kind)&&str(c.drawing.task,1200)&&Array.isArray(c.drawing.labels)&&c.drawing.labels.length<=20&&c.drawing.labels.every(v=>str(v,300))&&JSON.stringify(c).length<=30000;}
export const caseKey=(topic,day,index)=>`${topic}-d${String(day).padStart(2,'0')}-v${index}`;
export function validStudio(s,topic,day){
 if(s===undefined)return true;
 if(!obj(s)||s.version!==1||!['warmup','solve','reflect'].includes(s.stage)||!obj(s.workspaces)||Object.keys(s.workspaces).length>5||!str(s.selected,100))return false;
 const allowed=new Set(Array.from({length:5},(_,i)=>caseKey(topic,day,i)));
 if(!allowed.has(s.selected))return false;
 return Object.entries(s.workspaces).every(([id,w])=>allowed.has(id)&&obj(w)&&w.caseId===id&&str(w.reasoning)&&str(w.explanation,8000)&&str(w.diagnostic,8000)&&[0,1,2,3].includes(w.hint)&&typeof w.answerViewed==='boolean'&&Number.isFinite(w.activeMs)&&w.activeMs>=0&&w.activeMs<=86400000&&validDrawing(w.drawing)&&(w.startedAt===undefined||stamp(w.startedAt))&&(w.submittedId===undefined||str(w.submittedId,100))&&obj(w.values)&&Object.keys(w.values).length<=10&&Object.entries(w.values).every(([k,v])=>/^s\d$/.test(k)&&str(v,100))&&(w.firstValues===undefined||obj(w.firstValues)&&Object.keys(w.firstValues).length<=10&&Object.entries(w.firstValues).every(([k,v])=>/^s\d$/.test(k)&&str(v,100)))&&Array.isArray(w.warmups)&&w.warmups.length<=30&&w.warmups.every(a=>obj(a)&&str(a.id,100)&&str(a.prompt,2000)&&str(a.choice,2000)&&typeof a.correct==='boolean'&&stamp(a.at))&&snapshotOK(w.snapshot,id));
}
export function prepareStudio(d,lesson,topic){
 if(d.studio)return d.studio;
 const id=caseKey(topic,lesson.day,0);d.studio={version:1,selected:id,stage:'warmup',workspaces:{}};return d.studio;
}
export function prepareWork(studio,exercise,drawing){
 return studio.workspaces[exercise.id]??= {caseId:exercise.id,snapshot:structuredClone(exercise),reasoning:'',explanation:'',diagnostic:'',values:{},drawing,activeMs:0,hint:0,answerViewed:false,warmups:[]};
}
export function recordWarmup(work,q,choice,at){
 if(!q.options.includes(choice))throw Error('請先選擇答案。');
 if(work.warmups.length>=30)throw Error('本題暖身已保留 30 次作答，請先提交再重練。');
 if(Object.values(work.values).some(v=>v.trim()))freezeInitial(work);
 const a={id:q.id,prompt:q.prompt,choice,correct:choice===q.answer,at};work.warmups.push(a);work.hint=Math.max(work.hint,1);return a;
}
export function reveal(work){if(work.firstValues===undefined)work.firstValues=structuredClone(work.values);delete work.submittedId;work.hint=3;work.answerViewed=true;}
export function freezeInitial(work){if(work.firstValues===undefined)work.firstValues=structuredClone(work.values);}
export function revealDiagnostic(work){freezeInitial(work);delete work.submittedId;work.hint=Math.max(work.hint,2);}
export function staleExercise(work,current){return !!work&&JSON.stringify(work.snapshot)!==JSON.stringify(current);}
export function useCurrentExercise(studio,current,completedIds){
 const old=studio.workspaces[current.id];
 if(!old||!staleExercise(old,current))return false;
 const answered=old.activeMs>0||old.hint>0||old.answerViewed||old.warmups.length>0||old.reasoning.trim()||old.explanation.trim()||old.diagnostic.trim()||Object.values(old.values).some(v=>v.trim())||hasDrawing(old.drawing);
 if(answered&&!(old.submittedId&&completedIds.has(old.submittedId)))throw Error('舊題草稿仍有未提交內容，請先保留原題提交或匯出備份；未覆寫原稿。');
 delete studio.workspaces[current.id];return true;
}
export function hasStudioWork(s){return !!s&&Object.values(s.workspaces).some(w=>!w.submittedId&&(w.activeMs>0||w.hint>0||w.answerViewed||w.warmups.length>0||w.reasoning.trim()||w.explanation.trim()||w.diagnostic.trim()||Object.values(w.values).some(v=>v.trim())||hasDrawing(w.drawing)));}
export function sameDraftContent(a,b){return !!a?.studio&&!!b?.studio&&JSON.stringify({...a,updatedAt:undefined})===JSON.stringify({...b,updatedAt:undefined});}

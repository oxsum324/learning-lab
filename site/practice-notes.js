// Local annotations deliberately stay outside immutable records and cloud payloads.
export function normalizeNotes(value){
 const out={feedback:'',mistakes:{},reviews:{}};
 if(!value||typeof value!=='object')return out;
 if(typeof value.feedback==='string')out.feedback=value.feedback.slice(0,8000);
 for(const [id,note] of Object.entries(value.mistakes??{}).slice(0,2000))if(/^[\w-]{1,100}$/.test(id)&&typeof note?.mistake==='string'&&Number.isFinite(Date.parse(note.updatedAt)))Object.defineProperty(out.mistakes,id,{value:{mistake:note.mistake.slice(0,8000),updatedAt:note.updatedAt},enumerable:true,writable:true,configurable:true});
 for(const [day,item] of Object.entries(value.reviews??{}))if(/^([1-9]|[12][0-9]|30)$/.test(day)&&/^\d{4}-\d{2}-\d{2}$/.test(item?.due??'')&&Number.isFinite(Date.parse(item.scheduledAt)))out.reviews[day]={due:item.due,scheduledAt:item.scheduledAt};
 return out;
}
export function reviewDate(date=new Date()){const next=new Date(date);next.setDate(next.getDate()+2);return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;}
export function pendingReview(notes,state,day){const item=notes.reviews[day];return item&&!state.records.some(r=>r.day===day&&Date.parse(r.submittedAt)>Date.parse(item.scheduledAt))?item:null;}
export function mergeNotes(local,incoming){
 const a=normalizeNotes(local),b=normalizeNotes(incoming);
 // Keep differing feedback from both devices; annotations choose the latest edit.
 a.feedback=[...new Set([a.feedback,b.feedback].filter(Boolean))].join('\n\n').slice(0,8000);
 for(const [id,note] of Object.entries(b.mistakes))if(!Object.hasOwn(a.mistakes,id)||Date.parse(note.updatedAt)>Date.parse(a.mistakes[id].updatedAt))Object.defineProperty(a.mistakes,id,{value:note,enumerable:true,writable:true,configurable:true});
 for(const [day,item] of Object.entries(b.reviews))if(!a.reviews[day]||Date.parse(item.scheduledAt)>Date.parse(a.reviews[day].scheduledAt))a.reviews[day]=item;
 return a;
}
export function notesMarkdown(notes,records){return records.filter(r=>Object.hasOwn(notes.mistakes,r.id)).map(r=>`\n### D${String(r.day).padStart(2,'0')}｜提交後錯因卡\n作答 ID：${r.id}\n補充時間：${notes.mistakes[r.id].updatedAt}\n\n${notes.mistakes[r.id].mistake||'（已清空補充註記；原稿保留）'}\n`).join('');}

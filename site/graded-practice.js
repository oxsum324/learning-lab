// Versioned practice engine. No DOM, curriculum, storage or network dependencies.
export const PRACTICE_VERSION = 2;
export const PRACTICE_LIMITS = Object.freeze({attempts:60,events:120,exposures:120});
const copy=value=>structuredClone(value);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const onlyKeys=(value,keys)=>object(value)&&Object.keys(value).every(key=>keys.includes(key));
const string=(value,max=2000)=>typeof value==='string'&&value.length<=max;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value);
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const date=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
const stamp=now=>new Date(now??Date.now()).toISOString();
const keysEqual=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
const hash=value=>{let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const shuffled=(items,seed)=>{const result=copy(items);let n=hash(seed)||1;for(let i=result.length-1;i>0;i--){n^=n<<13;n^=n>>>17;n^=n<<5;const j=(n>>>0)%(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;};
const levelStage=level=>level<=3?'recognize':level===4?'guided':'independent';
const MAX_ACTIVE_MS=86400000;
const snapshotOf=question=>{const snapshot=copy(question);delete snapshot.response;delete snapshot.result;snapshot.graded=false;return snapshot;};
const sameValue=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function createPractice(startLevel='C',context={}){
 const start=['A','B','C'].includes(startLevel)?startLevel:'C',level={A:1,B:3,C:5}[start];
 return {version:2,contentVersion:'graded-practice-v1',mode:start==='C'?'advanced':'progressive',stage:levelStage(level),assistance:0,selections:{},checked:false,starterSeen:false,startLevel:start,level,topic:context.topic??'',day:context.day??1,sessionId:context.sessionId??globalThis.crypto.randomUUID(),createdAt:stamp(context.now),activeMs:0,levelStartedMs:0,levelSpentMs:{},selectionCount:0,attempts:[],events:[],exposures:copy((context.exposures??[]).slice(-PRACTICE_LIMITS.exposures)),current:null};
}

export function revealSupport(practice,level,kind='hint',{now}={}){
 if(!integer(level,0,3))throw Error('協助程度無效。');
 practice.assistance=Math.max(practice.assistance,level);
 if(practice.events.length<PRACTICE_LIMITS.events)practice.events.push({level,kind:String(kind).slice(0,80),at:stamp(now),questionId:practice.current?.id??null});
 return practice;
}

export function setPracticeLevel(practice,level){
 if(!integer(level,1,5))throw Error('練習層級無效。');
 if(practice.current&&!practice.current.graded&&practice.current.level!==level){practice.parked??={};practice.parked[practice.current.level]=copy(practice.current);}
 if(practice.level!==level){practice.levelSpentMs??={};practice.levelSpentMs[practice.level]=(practice.levelSpentMs[practice.level]??0)+Math.max(0,practice.activeMs-practice.levelStartedMs);practice.levelStartedMs=practice.activeMs;practice.level=level;}
 practice.stage=levelStage(level);practice.mode=level===5?'advanced':'progressive';practice.checked=false;
 return practice;
}

export function selectQuestion(bank,practice,{level=practice.level,now,allowRepeat=false}={}){
 if(practice.attempts.length>=PRACTICE_LIMITS.attempts||practice.selectionCount>=1000)return null;
 if(practice.current&&!practice.current.graded&&practice.current.level===level){setPracticeLevel(practice,level);if(practice.parked?.[level]?.selectionId===practice.current.selectionId)delete practice.parked[level];return practice.current;}
 if(practice.current&&!practice.current.graded){practice.parked??={};practice.parked[practice.current.level]=copy(practice.current);}
 const parked=practice.parked?.[level];
 if(parked&&validQuestion(parked)&&parked.topic===practice.topic&&parked.day===practice.day&&parked.level===level&&(parked.numeric||bank.some(q=>q.id===parked.id))){
  practice.current=copy(parked);delete practice.parked[level];setPracticeLevel(practice,level);return practice.current;
 }
 const pool=bank.filter(q=>q.topic===practice.topic&&q.day===practice.day&&q.level===level&&q.source?.kind!=='pending');
 const seen=new Set(practice.exposures.map(e=>e.id));
 let available=pool.filter(q=>!seen.has(q.id));
 if(!available.length&&allowRepeat)available=pool.filter(q=>q.id!==practice.current?.id);
 if(!available.length&&allowRepeat&&pool.length===1)available=pool;
 if(!available.length)return null;
 const seed=[practice.topic,practice.day,level,practice.selectionCount,practice.attempts.length].join(':');
 const question=copy(available[hash(seed)%available.length]);
 question.selectionId=practice.sessionId+'-'+practice.selectionCount++;question.seed=seed;question.selectedAt=stamp(now);question.graded=false;
 if(question.options&&question.type!=='error')question.options=shuffled(question.options,seed+':options');
 if(question.reasonOptions)question.reasonOptions=shuffled(question.reasonOptions,seed+':reasons');
 if(question.fields)for(const field of question.fields)field.options=shuffled(field.options,seed+':'+field.id);
 practice.current=question;setPracticeLevel(practice,level);
 if(practice.exposures.length>=PRACTICE_LIMITS.exposures)practice.exposures.shift();
 practice.exposures.push({id:question.id,seenAt:question.selectedAt});
 if(!question.numeric)revealSupport(practice,question.assistance??1,'question',{now});
 return question;
}

const optionIds=question=>(question.options??[]).map(o=>o.id);
function validAnswer(question,answer,partial=false){
 if(object(answer)&&answer.unknown===true&&Object.keys(answer).length===1)return true;
 if(partial&&(answer===undefined||answer===null||answer===''))return true;
 const ids=optionIds(question);
 if(['single','error'].includes(question.type))return typeof answer==='string'&&ids.includes(answer);
 if(['multi','order'].includes(question.type))return Array.isArray(answer)&&answer.length<=ids.length&&new Set(answer).size===answer.length&&answer.every(x=>ids.includes(x))&&(partial||question.type==='multi'||answer.length===ids.length);
 if(question.type==='boolean')return object(answer)&&Object.keys(answer).every(k=>['choice','reason'].includes(k))&&(partial?answer.choice===undefined||answer.choice===''||ids.includes(answer.choice):ids.includes(answer.choice))&&(partial?answer.reason===undefined||answer.reason===''||question.reasonOptions.some(x=>x.id===answer.reason):question.reasonOptions.some(x=>x.id===answer.reason));
 if(['match','fill'].includes(question.type))return object(answer)&&Object.keys(answer).every(k=>question.fields.some(f=>f.id===k))&&(partial||Object.keys(answer).length===question.fields.length)&&question.fields.every(f=>partial&&(answer[f.id]===undefined||answer[f.id]==='')||f.options.some(o=>o.id===answer[f.id]));
 return false;
}

export function gradeQuestion(question,answer){
 if(object(answer)&&answer.unknown===true&&Object.keys(answer).length===1)return {complete:true,correct:false,feedback:['已記錄「目前不知道」；可看短例題，或先保留待補項。']};
 if(!validAnswer(question,answer)||Array.isArray(answer)&&!answer.length)return {complete:false,correct:false,feedback:['請先完成本題作答，再核對。']};
 let correct=false,feedback=[];
 if(['single','error'].includes(question.type)){correct=answer===question.answer;feedback.push(question.options.find(o=>o.id===answer)?.reason??'');}
 if(question.type==='boolean'){correct=answer.choice===question.answer.choice&&answer.reason===question.answer.reason;feedback.push(answer.choice===question.answer.choice?'判斷正確。':'判斷需訂正。',question.reasonOptions.find(o=>o.id===answer.reason)?.reason??'理由需再核對。');}
 if(question.type==='multi'){
  correct=keysEqual(answer,question.answer);
  for(const o of question.options){const chosen=answer.includes(o.id),expected=question.answer.includes(o.id);feedback.push(`${o.text}：${chosen===expected?'核對正確':expected?'漏選':'誤選'}。${o.reason??''}`);}
 }
 if(['match','fill'].includes(question.type)){correct=question.fields.every(f=>answer[f.id]===question.answer[f.id]);for(const f of question.fields){const o=f.options.find(o=>o.id===answer[f.id]);feedback.push(`${f.label}：${answer[f.id]===question.answer[f.id]?'正確':'需訂正'}。${o?.reason??''}`);}}
 if(question.type==='order'){
  if(question.precedences?.length){const broken=question.precedences.filter(([a,b])=>answer.indexOf(a)>answer.indexOf(b));correct=!broken.length;if(!correct){const [a,b]=broken[0];feedback.push(`必要先後關係需調整：「${question.options.find(o=>o.id===a)?.text}」須在「${question.options.find(o=>o.id===b)?.text}」之前。`);}}
  else {const wrong=answer.findIndex((x,i)=>x!==question.answer[i]);correct=wrong===-1;if(!correct)feedback.push(`第一個錯位在第 ${wrong+1} 步，請核對此步的前提。`);}
 }
 if(correct)feedback.unshift('本題核對正確；仍須保留手算與圖解成果。');
 feedback.push(question.explanation??'');
 return {complete:true,correct,feedback:feedback.filter(Boolean)};
}

export function recordResponse(practice,answer,{now,activeMs=practice.activeMs}={}){
 const question=practice.current;
 if(!question||question.graded||practice.attempts.length>=PRACTICE_LIMITS.attempts)return null;
 if(!Number.isFinite(activeMs)||activeMs<0||activeMs>MAX_ACTIVE_MS||practice.attempts.some(a=>a.id===question.selectionId))return null;
 if(question.numeric&&!validNumericInitial(question.numericInitial))return null;
 const result=gradeQuestion(question,answer);if(!result.complete)return null;
 practice.activeMs=Math.max(practice.activeMs,Number.isFinite(activeMs)?Math.max(0,Math.round(activeMs)):0);
 const snapshot=snapshotOf(question);
 const attempt={id:question.selectionId,question:snapshot,answer:copy(answer),result:copy(result),at:stamp(now),activeMs:practice.activeMs,assistance:practice.assistance};
 practice.attempts.push(attempt);question.response=copy(answer);question.result=copy(result);question.graded=true;practice.checked=true;
 if(practice.parked?.[question.level]?.id===question.id)delete practice.parked[question.level];
 return attempt;
}

export function recordNumericInitial(practice,value,{unknown=false,now}={}){
 if(!practice.current?.numeric||practice.current.numericInitial!==undefined)return false;
 const initial={status:unknown?'unknown':'submitted',value:unknown?'':String(value??'').trim()};
 if(!validNumericInitial(initial))return false;
 practice.current.numericInitial=initial;revealSupport(practice,practice.current.assistance??1,'numeric-candidates',{now});return true;
}

export function canRetry(practice,{activeMs=practice.activeMs}={}){
 if(!Number.isFinite(activeMs)||activeMs<0||activeMs>MAX_ACTIVE_MS||practice.attempts.length>=PRACTICE_LIMITS.attempts||(practice.levelSpentMs?.[practice.level]??0)+Math.max(0,activeMs-practice.levelStartedMs)>=300000)return false;
 const q=practice.current;
 const same=practice.attempts.filter(a=>a.question.level===practice.level&&(!q||a.question.skill===q.skill));
 return !(same.length>=2&&same.slice(-2).every(a=>!a.result.correct));
}

export function practiceOutcome(practice){
 const assistance=Math.max(practice.assistance,...practice.events.map(e=>e.level));
 const kind=practice.attempts.length?(assistance>0?'supported-reconstruction':'unassisted-attempt'):assistance>0?'support-used':'not-started';
 return {kind,assistance,text:kind==='supported-reconstruction'?'已完成提示後重建；獨立能力仍待延遲重做核對。':kind==='unassisted-attempt'?'已留下無提示嘗試；未直接判定掌握。':kind==='support-used'?'已使用協助；尚未留下核對作答。':'尚未留下核對作答。'};
}

const validNumericInitial=value=>onlyKeys(value,['status','value'])&&['submitted','unknown'].includes(value.status)&&string(value.value,100)&&(value.status==='unknown'?value.value==='':/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.value.trim())&&Number.isFinite(Number(value.value)));
const validOption=o=>onlyKeys(o,['id','text','reason'])&&id(o.id)&&string(o.text,2000)&&(o.reason===undefined||string(o.reason,4000));
const validOptions=options=>Array.isArray(options)&&options.length>=2&&options.length<=24&&options.every(validOption)&&new Set(options.map(o=>o.id)).size===options.length;
const validResult=r=>onlyKeys(r,['complete','correct','feedback'])&&typeof r.complete==='boolean'&&typeof r.correct==='boolean'&&Array.isArray(r.feedback)&&r.feedback.length<=32&&r.feedback.every(x=>string(x,8000));
function validQuestion(q){
 if(!onlyKeys(q,['id','version','topic','day','level','type','skill','model','prompt','assistance','source','explanation','options','answer','reasonOptions','fields','precedences','numeric','numericMeta','numericInitial','numericDraft','response','result','bankGroup','diagnostic','selectionId','seed','selectedAt','graded']))return false;
 if(!object(q)||!id(q.id)||!integer(q.version,1,10000)||!string(q.topic,80)||!integer(q.day,1,30)||!integer(q.level,1,3)||!['single','boolean','multi','match','order','error','fill'].includes(q.type)||!string(q.skill,200)||!string(q.model,300)||!string(q.prompt,8000)||!integer(q.assistance,0,3)||!object(q.source)||!['principle','verified-code','specified-model','pending'].includes(q.source.kind)||!string(q.source.label,1000)||!string(q.source.locator,2000)||!string(q.explanation,8000))return false;
 if(!onlyKeys(q.source,['kind','label','locator']))return false;
 if(q.options!==undefined&&!validOptions(q.options)||q.reasonOptions!==undefined&&!validOptions(q.reasonOptions))return false;
 if(['match','fill'].includes(q.type)){if(!Array.isArray(q.fields)||!q.fields.length||q.fields.length>20||new Set(q.fields.map(f=>f.id)).size!==q.fields.length||!q.fields.every(f=>onlyKeys(f,['id','label','options'])&&id(f.id)&&string(f.label,2000)&&validOptions(f.options)))return false;}
 else if(!validOptions(q.options))return false;
 if(q.type==='boolean'&&!validOptions(q.reasonOptions))return false;
 if(!validAnswer(q,q.answer)||object(q.answer)&&q.answer.unknown===true)return false;
 if(q.type==='multi'&&(q.options.length<4||q.options.length>6||q.answer.length<2||q.answer.length>4||q.answer.length===q.options.length))return false;
 if(q.precedences!==undefined&&(!Array.isArray(q.precedences)||q.precedences.length>100||!q.precedences.every(e=>Array.isArray(e)&&e.length===2&&e[0]!==e[1]&&e.every(x=>optionIds(q).includes(x)))))return false;
 if(q.numeric!==undefined&&typeof q.numeric!=='boolean')return false;
 if(q.numericMeta!==undefined&&(!onlyKeys(q.numericMeta,['parameters','seed','unit','correct','tolerance','fieldLabel'])||!object(q.numericMeta.parameters)||Object.keys(q.numericMeta.parameters).length>20||!Object.entries(q.numericMeta.parameters).every(([k,v])=>id(k)&&typeof v==='number'&&Number.isFinite(v))||!Number.isFinite(q.numericMeta.correct)||!Number.isFinite(q.numericMeta.tolerance)||q.numericMeta.tolerance<0||!string(q.numericMeta.unit,100)||!string(q.numericMeta.fieldLabel,200)||(q.numericMeta.seed!==undefined&&!string(q.numericMeta.seed,300))))return false;
 if(q.numericInitial!==undefined&&!validNumericInitial(q.numericInitial))return false;
 if(q.numericDraft!==undefined&&(!q.numeric||!string(q.numericDraft,100)))return false;
 if(q.response!==undefined&&!validAnswer(q,q.response,true))return false;
 if(q.result!==undefined&&!validResult(q.result))return false;
 if(q.bankGroup!==undefined&&!['diagnostic','practice'].includes(q.bankGroup))return false;
 if(q.diagnostic!==undefined&&typeof q.diagnostic!=='boolean')return false;
 return id(q.selectionId)&&string(q.seed,300)&&date(q.selectedAt)&&typeof q.graded==='boolean'&&JSON.stringify(q).length<=60000;
}

export function validPractice(p){
 try{
  if(!onlyKeys(p,['version','contentVersion','mode','stage','assistance','selections','checked','starterSeen','startLevel','level','topic','day','sessionId','createdAt','activeMs','levelStartedMs','levelSpentMs','selectionCount','attempts','events','exposures','current','parked','numericSubmission','selectedStage','quantitySeen','scaffoldId']))return false;
  if(!object(p)||p.version!==2||!['progressive','advanced'].includes(p.mode)||!['recognize','guided','independent'].includes(p.stage)||!integer(p.assistance,0,3)||!object(p.selections)||Object.keys(p.selections).length>5||!Object.entries(p.selections).every(([k,v])=>['model','number','concept','quantity','diagram'].includes(k)&&['0','1','2'].includes(v))||typeof p.checked!=='boolean'||typeof p.starterSeen!=='boolean'||!['A','B','C'].includes(p.startLevel)||!integer(p.level,1,5)||!string(p.topic,80)||!integer(p.day,1,30)||!id(p.sessionId)||!date(p.createdAt)||!integer(p.activeMs,0,604800000)||!integer(p.levelStartedMs,0,p.activeMs)||!Array.isArray(p.attempts)||p.attempts.length>PRACTICE_LIMITS.attempts||!Array.isArray(p.events)||p.events.length>PRACTICE_LIMITS.events||!Array.isArray(p.exposures)||p.exposures.length>PRACTICE_LIMITS.exposures)return false;
  if(p.contentVersion!==undefined&&!string(p.contentVersion,60)||p.selectedStage!==undefined&&typeof p.selectedStage!=='boolean'||p.quantitySeen!==undefined&&typeof p.quantitySeen!=='boolean'||p.scaffoldId!==undefined&&!string(p.scaffoldId,80))return false;
  if(!integer(p.selectionCount,0,1000))return false;
  if(p.activeMs>MAX_ACTIVE_MS||!object(p.levelSpentMs)||Object.keys(p.levelSpentMs).length>5||!Object.entries(p.levelSpentMs).every(([k,v])=>['1','2','3','4','5'].includes(k)&&integer(v,0,p.activeMs)))return false;
  if(Object.values(p.levelSpentMs).reduce((sum,value)=>sum+value,0)>p.activeMs)return false;
  if(p.numericSubmission!==undefined&&(!object(p.numericSubmission)||!Object.keys(p.numericSubmission).length||Object.keys(p.numericSubmission).length>20||!Object.entries(p.numericSubmission).every(([k,v])=>/^[a-zA-Z0-9_]{1,40}$/.test(k)&&string(v,100))))return false;
  if(p.current!==null&&(!validQuestion(p.current)||p.current.topic!==p.topic||p.current.day!==p.day))return false;
  if(p.parked!==undefined&&(!object(p.parked)||Object.keys(p.parked).length>3||!Object.entries(p.parked).every(([level,q])=>['1','2','3'].includes(level)&&validQuestion(q)&&q.level===Number(level)&&q.topic===p.topic&&q.day===p.day&&!q.graded)))return false;
  if(!p.exposures.every(e=>onlyKeys(e,['id','seenAt'])&&id(e.id)&&date(e.seenAt)))return false;
  if(!p.events.every(e=>onlyKeys(e,['level','kind','at','questionId'])&&integer(e.level,0,p.assistance)&&string(e.kind,80)&&date(e.at)&&(e.questionId===null||id(e.questionId))))return false;
  if(!p.attempts.every(a=>onlyKeys(a,['id','question','answer','result','at','activeMs','assistance'])&&id(a.id)&&validQuestion(a.question)&&a.id===a.question.selectionId&&!a.question.graded&&a.question.topic===p.topic&&a.question.day===p.day&&validAnswer(a.question,a.answer)&&validResult(a.result)&&a.result.complete&&date(a.at)&&integer(a.activeMs,0,p.activeMs)&&integer(a.assistance,a.question.assistance,p.assistance)&&(!a.question.numeric||validNumericInitial(a.question.numericInitial))))return false;
  if(new Set(p.attempts.map(a=>a.id)).size!==p.attempts.length)return false;
  if(p.current?.graded){const saved=p.attempts.find(a=>a.id===p.current.selectionId);if(!saved||!sameValue(saved.answer,p.current.response)||!sameValue(saved.result,p.current.result)||!sameValue(saved.question,snapshotOf(p.current)))return false;}
  if(p.current&&!p.current.graded&&p.attempts.some(a=>a.id===p.current.selectionId))return false;
  if(new Set(Object.values(p.parked??{}).map(q=>q.selectionId)).size!==Object.keys(p.parked??{}).length)return false;
  for(const q of Object.values(p.parked??{}))if(p.attempts.some(a=>a.id===q.selectionId)||p.current?.selectionId===q.selectionId&&!sameValue(p.current,q))return false;
  return JSON.stringify(p).length<=1500000;
 }catch{return false;}
}

import {TOPICS} from './topics.js?v=0.13.0';
import {KEY,DAY_KEY,TOPIC_ID,SANDBOX,emptyState,assess,validateState,mergeStates,safeSave} from './core.js?v=0.13.0';
import {DrawingEditor,renderAnswerDrawing} from './drawing.js?v=0.13.0';
import {hasDrawing} from './drawing-model.js?v=0.13.0';
import {GUIDES} from './teaching-guides.js?v=0.13.0';
import {mountCloudHistory,mergeCloudRecords} from './cloud-history.js?v=0.13.0';
import {PHASES,RANGES,RECALL,meaningfulDraft,dayStatus,nextLesson,lessonMode,practiceBudget,normalizePrefs,coachSummary} from './learning-flow.js?v=0.13.0';
import {sessionPhases,phaseAt,referenceLocked,recordHint} from './session-phases.js?v=0.13.0';
import {normalizeNotes,mergeNotes,reviewDate,pendingReview,notesMarkdown} from './practice-notes.js?v=0.13.0';
let cloud;
const notesKey='learning-lab:'+(SANDBOX?'sandbox:':'')+TOPIC_ID+':practice-notes:v1';
let notes=normalizeNotes(),notesExpected=null,notesWritable=true,lastSubmitted=null,phaseKey='',activePhase=-2,pendingReference='';
const approvedReferences=new Set();
try{notesExpected=localStorage.getItem(notesKey);notes=normalizeNotes(JSON.parse(notesExpected||'null'));}catch{notesWritable=false;}
function saveNotes(){try{if(!notesWritable||localStorage.getItem(notesKey)!==notesExpected)throw Error('另一分頁已改動補充註記，請先匯出 JSON 再重新整理。');const value=JSON.stringify(notes);localStorage.setItem(notesKey,value);notesExpected=value;return true;}catch{notesWritable=false;return false;}}
function noteSaveMessage(){return saveNotes()?'已存於目前瀏覽器。':'補充註記未能存入瀏覽器，請立即匯出 JSON；保留另一分頁資料後再重新整理。';}

const prefsKey='learning-lab:'+ (SANDBOX?'sandbox:':'')+'preferences:v1';
let prefs=normalizePrefs();
try{prefs=normalizePrefs(JSON.parse(localStorage.getItem(prefsKey)||'null'));}catch{}
function applyPrefs(){document.documentElement.classList.toggle('large-text',prefs.largeText);document.documentElement.classList.toggle('reduce-motion',prefs.reduceMotion);$('pref-minutes').value=String(prefs.minutes);$('pref-large').checked=prefs.largeText;$('pref-motion').checked=prefs.reduceMotion;$('pref-today').checked=prefs.startToday;$('session-target').textContent='本次目標 '+prefs.minutes+' 分鐘';$('time-target').textContent='目標 '+prefs.minutes+' 分鐘';$('session-progress').max=prefs.minutes*60000;}
function savePrefs(announce=false){try{localStorage.setItem(prefsKey,JSON.stringify(prefs));if(announce)$('prefs-status').textContent='已保存於目前瀏覽器。';}catch{if(announce)$('prefs-status').textContent='偏好未能保存，本頁仍可使用；學習紀錄請另行備份。';}}
const labels={overview:'學習總覽',today:'今日練習',route:'30天路線',history:'紀錄與重練',backup:'備份與還原',settings:'學習設定'};
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const $=id=>document.getElementById(id);const now=()=>new Date().toISOString();
let state=emptyState(),expected=null,writable=true,currentDay=1,tickFrom=null,course,editor;
if(SANDBOX){document.querySelector('.notice').hidden=false;document.querySelector('.notice').textContent='功能測試空間：與正式學習紀錄分開保存，不連接私人雲端。';document.querySelector('.version').textContent+=' · 功能測試';}
function storageMessage(msg,bad=false){$('storage-status').textContent=msg;$('storage-status').className=bad?'warning':'';$('workspace-storage').textContent=bad?msg:'';$('workspace-storage').hidden=!bad;}
try{expected=localStorage.getItem(KEY);if(expected)state=validateState(JSON.parse(expected));storageMessage('本機儲存可用');}catch{writable=false;storageMessage('無法讀取原有儲存資料，已保留原資料並停止覆寫。新紀錄請立即匯出，勿清除瀏覽器資料。',true);}
function persist(){if(!writable)return false;try{expected=safeSave(localStorage,state,expected);storageMessage('已存至目前瀏覽器 · '+new Date().toLocaleTimeString('zh-TW'));cloud?.changed();return true;}catch(e){writable=false;storageMessage(e.message+' 儲存未完成，請先匯出本頁資料。',true);return false;}}
const blank=()=>({activeMs:0,reasoning:'',explanation:'',mistake:'',hint:0,answerViewed:false,errorType:'未判定',values:{},startedAt:'',updatedAt:now()});
function draft(){return state.drafts[currentDay]??=blank();}
function timeText(ms){const seconds=Math.floor(ms/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function elapsed(){return (state.drafts[currentDay]?.activeMs??0)+(tickFrom===null?0:Math.max(0,performance.now()-tickFrom));}
function bankTick(){if(tickFrom!==null){draft().activeMs+=Math.max(0,performance.now()-tickFrom);tickFrom=performance.now();draft().updatedAt=now();}}
function pause(){if(tickFrom===null)return;bankTick();tickFrom=null;$('timer-note').textContent='已暫停。按繼續計時才會累計時間。';$('start').disabled=false;$('pause').disabled=true;$('start').textContent='繼續計時';persist();paintStats();}
function capture(){const d=draft();for(const k of ['reasoning','explanation','mistake'])d[k]=$(k).value;d.hint=d.answerViewed?3:Number($('hint').value);$('hint').value=String(d.hint);d.errorType=$('error-type').value;document.querySelectorAll('[data-answer]').forEach(el=>d.values[el.dataset.answer]=el.value);d.drawing=editor?.get();d.updatedAt=now();return d;}
function textDoc(container,text){container.replaceChildren();for(const line of text.split('\n')){if(!line.trim())continue;let tag='p',value=line;const heading=line.match(/^#{1,4}\s+(.*)/);if(heading){tag='h3';value=heading[1];}else if(line.startsWith('---'))continue;const el=document.createElement(tag);el.textContent=value.replace(/\*\*/g,'');container.append(el);}}
function statusFor(day){const result=dayStatus(state,day),planned=pendingReview(notes,state,day),note=result.latest&&notes.mistakes[result.latest.id]?.mistake;return {...result,review:result.review||!!planned||!!note?.trim(),label:result.draft?'有草稿':planned?'待重練 · '+planned.due:(result.review||note?.trim())?'待重練':result.label};}
function refreshDayOptions(){if(!course)return;for(const option of $('day-select').options){const day=Number(option.value),status=statusFor(day),phase=RANGES.findIndex(([a,b])=>day>=a&&day<=b);option.textContent=`${status.draft?'✎':status.review?'↻':status.latest?'✓':'○'} D${String(day).padStart(2,'0')} · ${status.label} · ${PHASES[TOPIC_ID][phase]} · ${course.days[day-1].task.slice(0,30)}`;}}
function paintStats(){
 const days=new Set(state.records.map(r=>r.day)),statuses=Array.from({length:30},(_,i)=>statusFor(i+1));
 $('count').textContent=days.size;$('course-progress').value=days.size;
 const ms=state.records.reduce((n,r)=>n+r.activeMs,0)+Object.values(state.drafts).reduce((n,d)=>n+d.activeMs,0);
 $('minutes').textContent=(ms/60000).toFixed(1)+' 分鐘';$('draft-count').textContent=statuses.filter(d=>d.draft).length;$('review-count').textContent=statuses.filter(d=>d.review).length;
 if(!course)return;refreshDayOptions();const next=nextLesson(state);$('resume-title').textContent='D'+String(next.day).padStart(2,'0')+' · '+course.days[next.day-1].task;$('resume-reason').textContent=next.reason;$('resume').disabled=false;
 $('phase-overview').replaceChildren();RANGES.forEach(([a,b],index)=>{const card=el('article',undefined,'phase-card'),p=el('p','D'+String(a).padStart(2,'0')+'—D'+String(b).padStart(2,'0'),'eyebrow'),title=el('h3',PHASES[TOPIC_ID][index]),done=[...days].filter(d=>d>=a&&d<=b).length,progress=el('progress');progress.max=b-a+1;progress.value=done;progress.setAttribute('aria-label',PHASES[TOPIC_ID][index]+'已提交進度');card.append(p,title,progress,el('span',done+' / '+(b-a+1)+' 課已提交','muted'));$('phase-overview').append(card);});
}
function paintLessonMeta(){
 if(!course)return;const lesson=course.days[currentDay-1],mode=lessonMode(lesson,TOPIC_ID),budget=practiceBudget(prefs.minutes,currentDay,TOPIC_ID),phase=RANGES.findIndex(([a,b])=>currentDay>=a&&currentDay<=b);
 $('lesson-mode').textContent=mode.label;$('lesson-mode-note').textContent=mode.note;$('lesson-phase').textContent=PHASES[TOPIC_ID][phase];$('recall-prompt').textContent=RECALL[TOPIC_ID];$('step-read').textContent=budget.read;$('step-do').textContent=budget.practice;$('step-check').textContent=budget.check;$('rhythm-note').textContent=budget.text;
 $('prev-day').disabled=currentDay===1;$('next-day').disabled=currentDay===30;paintSession();
}
function switchDay(day){if(!course||day<1||day>30)return;pause();const d=capture();if(!meaningfulDraft(d))delete state.drafts[currentDay];if(!persist()){$('day-select').value=String(currentDay);return;}showDay(day);paintStats();}
function openLesson(day){switchDay(day);showTab('today');$('day-title').focus({preventScroll:true});}

function showDay(day){pause();lastSubmitted=null;$('submission-feedback').hidden=true;approvedReferences.clear();$('concept-details').open=false;phaseKey='';currentDay=day;localStorageSelection(day);$('day-select').value=String(day);const lesson=course.days[day-1],d=state.drafts[day]??blank();$('day-title').textContent=`D${String(day).padStart(2,'0')} · ${lesson.task}`;$('workspace-lesson').textContent=$('day-title').textContent;$('read-task').textContent=lesson.read;$('do-task').textContent=lesson.activity??lesson.task;$('check-task').textContent=lesson.check;textDoc($('problem'),lesson.problem);$('beam-diagram').hidden=TOPIC_ID!=='structural-analysis'||day!==1;$('answer-details').open=false;$('guide-details').open=false;const guide=lesson.guide??GUIDES[day];textDoc($('guide-worked'),guide.worked.join('\n'));$('guide-plain').textContent=guide.plain;textDoc($('guide-draw'),guide.draw.join('\n'));$('numeric-fields').replaceChildren();for(const f of lesson.fields){const label=document.createElement('label');label.textContent=f.label;const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.dataset.answer=f.id;input.setAttribute('aria-label',f.label);input.maxLength=100;input.value=d.values[f.id]??'';const unit=el('span',f.unit,'input-unit'),wrap=el('span',undefined,'numeric-input');wrap.append(input,unit);input.setAttribute('aria-label',f.label+'（'+f.unit+'）');label.append(wrap);$('numeric-fields').append(label);}
 $('numeric-note').textContent=lesson.fields.length?'關鍵數值採相對誤差 1% 核對；欄位單位固定如標示。數值符合不代表推導已驗收。':'今天以觀念與推導練習為主，提交後標記待教練審閱。';for(const k of ['reasoning','explanation','mistake'])$(k).value=d[k];$('hint').value=String(d.hint);$('error-type').value=d.errorType;$('timer').textContent=timeText(d.activeMs);$('start').textContent=d.activeMs?'繼續計時':'開始計時';$('result').textContent='';editor?.set(d.drawing,TOPIC_ID,day);paintLessonMeta();}
function localStorageSelection(day){try{sessionStorage.setItem(DAY_KEY,String(day));}catch{}prefs.lastDays[TOPIC_ID]=day;savePrefs();}
function showTab(name){
 if(!Object.hasOwn(labels,name))return;if(!course&&['today','route','history'].includes(name))return;
 document.querySelectorAll('.panel').forEach(n=>n.hidden=n.id!==name);document.querySelectorAll('[data-tab]').forEach(n=>{n.classList.toggle('active',n.dataset.tab===name);if(n.dataset.tab===name)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
 document.body.dataset.view=name;$('page-name').textContent=labels[name];if(name!=='today')pause();if(name==='history')renderHistory();if(name==='route')renderRoute();if(name==='overview')paintStats();
 history.replaceState(null,'','#'+name);window.scrollTo({top:0,behavior:'instant'});
}
function renderRoute(){
 const query=$('route-search').value.trim().toLowerCase(),filter=$('route-filter').value;let count=0;$('route-list').replaceChildren();
 RANGES.forEach(([first,last],index)=>{const section=el('section',undefined,'route-phase');section.append(el('h3',PHASES[TOPIC_ID][index]));
  for(const d of course.days.filter(d=>d.day>=first&&d.day<=last)){
   const status=statusFor(d.day);if(query&&!('D'+String(d.day).padStart(2,'0')+' '+d.task+' '+d.check).toLowerCase().includes(query))continue;
   if(filter==='new'&&status.latest||filter==='draft'&&!status.draft||filter==='review'&&!status.review)continue;
   count++;const row=el('article',undefined,'route-row'),number=el('span','D'+String(d.day).padStart(2,'0'),'day-number'),body=el('div',undefined,'route-body'),badge=el('span',status.label,'badge '+(status.review?'needs-review':''));
   body.append(el('strong',d.task),el('p',d.check),badge,el('span',lessonMode(d,TOPIC_ID).label,'source-label'));const button=el('button',status.draft?'接續草稿':status.latest?'再練一次':'開始','secondary');button.onclick=()=>openLesson(d.day);row.append(number,body,button);section.append(row);
  }if(section.children.length>1)$('route-list').append(section);
 });$('route-count').textContent='找到 '+count+' 課；已提交不代表完整驗收通過。';if(!count)$('route-list').append(el('p','沒有符合的課次，試試其他篩選條件。','empty'));
}
function renderHistory(){
 $('history-list').replaceChildren();const filter=$('history-filter').value,day=$('history-day').value;
 const records=[...state.records].filter(r=>(day==='all'||r.day===Number(day))&&(filter!=='review'||statusFor(r.day).review)).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
 $('history-count').textContent=records.length+' 筆作答 · 待重練依各課最近一次作答的提示、數值核對與錯因整理。';
 if(!records.length){$('history-list').append(el('div',state.records.length?'沒有符合的紀錄。':'尚未提交練習。從一題開始，留下你的第一份解題過程。','empty'));return;}
 for(const r of records){
  const card=el('article',undefined,'history-item'),head=el('div',undefined,'history-heading'),title=el('h3','D'+String(r.day).padStart(2,'0')+' · '+course.days[r.day-1].task),redo=el('button','重練這課','secondary');redo.onclick=()=>openLesson(r.day);head.append(title,redo);
  const info=el('p',new Date(r.submittedAt).toLocaleString('zh-TW')+' · '+(r.activeMs/60000).toFixed(1)+' 分鐘 · 提示 '+r.hint+' · '+r.errorType,'muted');const details=el('details'),summary=el('summary','查看原稿與圖解');details.append(summary);
  const pre=el('pre','數值：'+(Object.entries(r.values).map(([k,v])=>k+'='+v).join('，')||'未填')+'\n推導：'+(r.reasoning||'未填')+'\n白話解釋：'+(r.explanation||'未填')+'\n錯因／問題：'+(r.mistake||'未填'));details.append(pre);if(Object.hasOwn(notes.mistakes,r.id))details.append(el('p','提交後錯因卡：'+(notes.mistakes[r.id].mistake||'（已清空補充；原稿保留）'),'annotation-note'));
  // Render tall drawings only when their original record is opened.
  if(hasDrawing(r.drawing))details.addEventListener('toggle',()=>{if(details.open&&!details.dataset.rendered){details.append(renderAnswerDrawing(r.drawing));details.dataset.rendered='1';}});
  const remove=el('button','刪除此筆紀錄','text-button danger-text');remove.onclick=async()=>{const dialog=$('delete-dialog');dialog.returnValue='cancel';dialog.showModal();dialog.querySelector('button[value="cancel"]').focus();const value=await new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue),{once:true}));if(value!=='delete')return;state.records=state.records.filter(x=>x.id!==r.id);persist();paintStats();renderHistory();};
  card.append(head,info,el('p',r.assessment.text,'assessment-note'),details,remove);$('history-list').append(card);
 }
}


function beginNewAttempt(){if(!lastSubmitted)return;lastSubmitted=null;$('submission-feedback').hidden=true;approvedReferences.clear();for(const id of ['concept-details','guide-details','answer-details'])$(id).open=false;paintSession();}
function paintSession(){
 if(!course)return;
 const phases=sessionPhases(prefs.minutes,currentDay,TOPIC_ID),key=JSON.stringify(phases),ms=elapsed(),index=phaseAt(phases,ms);
 if(key!==phaseKey){phaseKey=key;activePhase=-2;$('phase-strip').replaceChildren();for(const p of phases){const part=el('div',undefined,'phase-segment phase-'+p.id);part.style.flexGrow=p.minutes;part.append(el('span',p.label),el('small',p.minutes+' 分'));$('phase-strip').append(part);}}
 [...$('phase-strip').children].forEach((part,i)=>{const p=phases[i],percent=Math.max(0,Math.min(100,(ms-p.startMs)/(p.endMs-p.startMs)*100));part.classList.toggle('is-current',i===index);part.classList.toggle('is-done',ms>=p.endMs);part.style.setProperty('--phase-progress',percent+'%');if(i===index)part.setAttribute('aria-current','step');else part.removeAttribute('aria-current');});
 if(index!==activePhase){activePhase=index;$('phase-hint').textContent=index<0?'本次時間已完成，請核對並留下紀錄。':phases[index].label+'｜'+phases[index].hint;}
 const locked=referenceLocked(phases,ms,!!lastSubmitted);$('answer-references').classList.toggle('is-locked',locked);$('reference-status').textContent=lastSubmitted?'本次已提交，可自由核對參考。':locked?'閉卷練習中 · 查看參考前會先記錄提示等級。':'已進入核對階段 · 查看完整參考仍會如實記錄已看答案。';
 $('mobile-timer').textContent=tickFrom===null?'▶ 計時':'Ⅱ 暫停';
 for(const b of document.querySelectorAll('[data-mobile-action]'))b.disabled=!editor?.[b.dataset.mobileAction==='undo'?'past':'future'].length;
}
function openReference(id,level){
 if(!lastSubmitted){recordHint(draft(),level);$('hint').value=String(draft().hint);capture();persist();refreshDayOptions();}
 approvedReferences.add(id);$(id).open=true;
}
function requestReference(id){
 if(!course)return;
 if(lastSubmitted){openReference(id,3);return;}
 if(referenceLocked(sessionPhases(prefs.minutes,currentDay,TOPIC_ID),elapsed())){pendingReference=id;$('hint-preview').textContent='';$('hint-dialog').showModal();$('hint-dialog').querySelector('button').focus();return;}
 openReference(id,id==='concept-details'?2:3);
}
for(const id of ['concept-details','guide-details','answer-details']){
 $(id).querySelector('summary').addEventListener('click',e=>{e.preventDefault();if($(id).open){$(id).open=false;return;}requestReference(id);});
 $(id).addEventListener('toggle',()=>{if($(id).open&&!approvedReferences.has(id)){$(id).open=false;requestReference(id);}});
}
for(const b of document.querySelectorAll('[data-hint-level]'))b.onclick=()=>{
 const level=Number(b.dataset.hintLevel);recordHint(draft(),level);$('hint').value=String(draft().hint);capture();persist();refreshDayOptions();
 if(level===1){$('hint-preview').textContent=RECALL[TOPIC_ID]+'（已記錄方向提示；可返回作答。）';return;}
 $('hint-dialog').close();openReference(level===2?'concept-details':pendingReference,level);$(level===2?'concept-details':pendingReference).scrollIntoView({block:'start'});
};
$('hint-close').onclick=()=>$('hint-dialog').close();
function showFeedback(record){
 lastSubmitted=record;$('submission-feedback').hidden=false;$('feedback-title').textContent='D'+String(record.day).padStart(2,'0')+' · 本次練習已提交';
 $('feedback-metrics').textContent=(record.assessment.total?'數值符合 '+record.assessment.correct+'／'+record.assessment.total:'數值尚未核對，待教練審閱')+' · 提示等級 '+record.hint+' · 錯因：'+record.errorType;
 $('feedback-mistake').value=notes.mistakes[record.id]?.mistake??record.mistake;$('feedback-status').textContent='';$('feedback-next').disabled=record.day===30;paintSession();$('submission-feedback').scrollIntoView({block:'start'});$('feedback-title').focus({preventScroll:true});
}
$('feedback-mistake').addEventListener('input',()=>{if(!lastSubmitted)return;notes.mistakes[lastSubmitted.id]={mistake:$('feedback-mistake').value,updatedAt:now()};$('feedback-status').textContent=noteSaveMessage();paintStats();});
$('feedback-export').onclick=()=>{if(lastSubmitted)download(coachSummary({...state,records:[lastSubmitted],drafts:{}},TOPICS[TOPIC_ID].name)+notesMarkdown(notes,[lastSubmitted]),`learning-review-${TOPIC_ID}-D${String(lastSubmitted.day).padStart(2,'0')}.md`);};
$('feedback-review').onclick=()=>{if(!lastSubmitted)return;const due=reviewDate();notes.reviews[lastSubmitted.day]={due,scheduledAt:now()};$('feedback-status').textContent='已排 '+due+' 重做（本機待重練清單；無推播）。'+noteSaveMessage();paintStats();};
$('feedback-next').onclick=()=>{if(lastSubmitted)openLesson(lastSubmitted.day+1);};
$('usage-feedback').value=notes.feedback;
$('usage-feedback').addEventListener('input',()=>{notes.feedback=$('usage-feedback').value;$('usage-feedback-status').textContent=noteSaveMessage();});
$('mobile-timer').onclick=()=>{if(tickFrom===null)$('start').click();else $('pause').click();};
$('mobile-submit').onclick=()=>{if(course)$('practice-form').requestSubmit();};
$('mobile-focus').onclick=()=>$('focus-drawing').click();
for(const b of document.querySelectorAll('[data-mobile-jump]'))b.onclick=()=>$(b.dataset.mobileJump).scrollIntoView({block:'start',behavior:prefs.reduceMotion?'instant':'smooth'});
for(const b of document.querySelectorAll('[data-mobile-action]'))b.onclick=()=>editor?.action(b.dataset.mobileAction);
$('numeric-fields').addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const fields=[...document.querySelectorAll('[data-answer]')],next=fields[fields.indexOf(e.target)+1];(next??$('reasoning')).focus();});
new ResizeObserver(()=>document.documentElement.style.setProperty('--session-clock-height',Math.ceil($('session-clock').getBoundingClientRect().height)+'px')).observe($('session-clock'));

$('start').onclick=()=>{if(!course)return;beginNewAttempt();const d=draft();if(!d.startedAt)d.startedAt=now();tickFrom=performance.now();$('start').disabled=true;$('pause').disabled=false;$('timer-note').textContent='計時中 · 離開分頁會自動暫停。';persist();};$('pause').onclick=pause;
$('practice-form').addEventListener('input',()=>{beginNewAttempt();capture();persist();});$('practice-form').addEventListener('change',e=>{if(e.target.closest('#written-answer'))beginNewAttempt();capture();persist();});
$('practice-form').onsubmit=e=>{e.preventDefault();pause();const d=capture();if(!d.reasoning.trim()&&!d.explanation.trim()&&!Object.values(d.values).some(v=>v.trim())&&!hasDrawing(d.drawing)){$('result').textContent='請先畫圖或填寫答案、推導、白話解釋，再儲存作答。';return;}const hasNumeric=Object.values(d.values).some(v=>v.trim());const assessment=assess(hasNumeric?course.days[currentDay-1].fields:[],d.values,d.hint);if(hasDrawing(d.drawing))assessment.text='圖解已保留；'+assessment.text;const record={...structuredClone(d),id:crypto.randomUUID(),day:currentDay,submittedAt:now(),curriculumVersion:course.version,assessment};state.records.push(record);delete state.drafts[currentDay];const saved=persist();showDay(currentDay);$('result').textContent=(saved?'本次作答已存至瀏覽器。':'作答保留於本頁記憶體，請立即匯出備份。')+assessment.text;paintStats();showFeedback(record);cloud?.submitted();};
document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>showTab(el.dataset.tab));$('day-select').onchange=e=>switchDay(Number(e.target.value));
$('prev-day').onclick=()=>switchDay(currentDay-1);$('next-day').onclick=()=>switchDay(currentDay+1);
$('resume').onclick=()=>openLesson(nextLesson(state).day);$('open-review').onclick=()=>{$('route-filter').value='review';$('route-search').value='';showTab('route');};
for(const id of ['route-filter','route-search'])$(id).addEventListener('input',renderRoute);for(const id of ['history-filter','history-day'])$(id).addEventListener('change',renderHistory);
for(let d=1;d<=30;d++){const o=el('option','D'+String(d).padStart(2,'0'));o.value=d;$('history-day').append(o);}
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>showTab(b.dataset.open));document.querySelector('.brand').onclick=e=>{e.preventDefault();showTab('overview');};
document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{$(b.dataset.jump).scrollIntoView({block:'start',behavior:prefs.reduceMotion?'instant':'smooth'});});
for(const id of ['pref-minutes','pref-large','pref-motion','pref-today'])$(id).onchange=()=>{prefs.minutes=Number($('pref-minutes').value);prefs.largeText=$('pref-large').checked;prefs.reduceMotion=$('pref-motion').checked;prefs.startToday=$('pref-today').checked;applyPrefs();savePrefs(true);paintLessonMeta();};applyPrefs();
function download(value,name){const blob=new Blob([value],{type:name.endsWith('.md')?'text/markdown;charset=utf-8':'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const exportSummary=()=>{pause();download(coachSummary(state,TOPICS[TOPIC_ID].name)+notesMarkdown(notes,state.records),'learning-review-'+TOPIC_ID+'.md');$('export-status').textContent='已匯出教練回顧摘要；完整圖解請另附 JSON。';};$('export-summary').onclick=exportSummary;$('history-export').onclick=exportSummary;
$('export').onclick=()=>{pause();const data={...state,exportedAt:now(),source:'learning-lab-browser-v0.13.0',localPracticeNotes:notes};download(JSON.stringify(data,null,2),`learning-lab-${TOPIC_ID}-${new Date().toISOString().slice(0,10)}.json`);$('export-status').textContent='已交給瀏覽器下載，請確認檔案確實保存。雲端保存狀態請見雲端歷史區。';};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('檔案超過20MB。');pause();const {localPracticeNotes,...raw}=JSON.parse(await file.text());const incoming=validateState(raw);const merged=mergeStates(state,incoming);state=merged;const saved=persist();notes=mergeNotes(notes,localPracticeNotes);const notesSaved=saveNotes();$('usage-feedback').value=notes.feedback;showDay(currentDay);paintStats();$('usage-feedback-status').textContent=notesSaved?'已合併本機補充註記。':'補充註記尚未保存，請匯出 JSON。';$('import-status').textContent=saved?`已合併，共${state.records.length}筆作答。`:'已載入本頁，瀏覽器儲存失敗，請匯出合併後備份。';}catch(err){$('import-status').textContent='未匯入：'+err.message;}e.target.value='';};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue!==expected){writable=false;pause();storageMessage('另一個分頁已更新紀錄，本頁已停止覆寫。請匯出本頁資料，再重新整理合併。',true);}});
setInterval(()=>{const ms=elapsed();$('timer').textContent=timeText(ms);$('session-progress').value=Math.min(ms,prefs.minutes*60000);$('time-target').textContent=ms>=prefs.minutes*60000?'已達本次目標，可核對並記錄':'目標 '+prefs.minutes+' 分鐘';paintSession();},250);setInterval(()=>{if(tickFrom!==null){bankTick();persist();paintStats();}},5000);

const topic=TOPICS[TOPIC_ID];
document.title='學習工作室｜'+topic.name;
$('topic-name').textContent=topic.name+' · 30天複習';
$('hero-description').textContent=topic.description;
$('route-description').textContent=topic.route;
$('backup-topic').textContent='目前主題：'+topic.name+'。匯出及還原僅處理這個主題；另一科請切換後另行備份。';
for(const [id,item] of Object.entries(TOPICS)){const option=document.createElement('option');option.value=id;option.textContent=item.name+(id==='reinforced-concrete'?'（含預力）':'');$('topic-select').append(option);}
$('topic-select').value=TOPIC_ID;
$('topic-select').onchange=e=>{const next=e.target.value;if(course){pause();const d=capture();if(!meaningfulDraft(d))delete state.drafts[currentDay];if(!persist()){$('topic-select').value=TOPIC_ID;storageMessage('尚有未保存資料，請先匯出備份，再切換主題。',true);return;}}const url=new URL(location.href);url.searchParams.set('topic',next);url.searchParams.set('v','0.13.0');url.hash='';location.assign(url.href);};
if(TOPIC_ID!=='structural-analysis'){
 $('step-do').textContent='02 / 做什麼 · 17分鐘';$('step-check').textContent='03 / 怎麼驗收 · 5分鐘';
 $('rhythm-note').textContent='另留3分鐘閉卷提取。可加量至60分鐘；週測20分鐘作答＋10分鐘核對，歷屆題25分鐘作答＋5分鐘檢查。';
 $('problem-note').textContent='本頁列出短題時直接依題設作答；標示自選教材或官方原卷時，請記錄題源與完整條件。係數依題設模型；條文查核需註明規範版本。完整作答由教練審閱。';
 $('guide-details').querySelector('summary').textContent='本課解題提示與白話參考（非逐題數值詳解；會記錄已看答案）';
 $('guide-worked').previousElementSibling.textContent='作答架構與檢核提示';
 $('answer-details').querySelector('summary').textContent='題源與核對方式';
 for(const label of ['排水條件','規範版本','參數選擇','時間分配']){const option=document.createElement('option');option.textContent=label;$('error-type').append(option);}
 $('reasoning').placeholder='記下教材／題號／規範版本、已知條件、受力或應變圖與推導。';
 $('explanation').placeholder='先用自己的話說明模型、適用條件與控制機制。';
 document.querySelector('footer p').textContent=topic.name+'考前複習；具體計算依題目條件及指定規範。提交不等於已通過驗收。';
 document.querySelectorAll('footer a').forEach(a=>a.remove());
}

// Move the same workspace into a native dialog so drawing state and focus are retained.
const workspace=$('answer-workspace'),focusDialog=$('drawing-focus'),focusButton=$('focus-drawing');
const workspaceAnchor=document.createComment('answer workspace');workspace.before(workspaceAnchor);
let questionWasOpen=true,focusScroll=0;
focusButton.onclick=()=>{
 if(focusDialog.open){focusDialog.close();return;}
 editor.cancelDrag();editor.closeMenus();questionWasOpen=$('question-panel').open;focusScroll=window.scrollY;
 if(matchMedia('(max-width: 959px)').matches)$('question-panel').open=false;
 focusDialog.append(workspace);focusButton.textContent='結束專注';focusButton.setAttribute('aria-pressed','true');
 document.body.classList.add('drawing-focused');focusDialog.showModal();focusButton.focus({preventScroll:true});
};
focusDialog.addEventListener('close',()=>{
 editor.cancelDrag();workspaceAnchor.after(workspace);$('question-panel').open=questionWasOpen;
 focusButton.textContent='專注畫圖';focusButton.setAttribute('aria-pressed','false');document.body.classList.remove('drawing-focused');
 window.scrollTo({top:focusScroll,behavior:'instant'});focusButton.focus({preventScroll:true});
});

editor=new DrawingEditor($('drawing-editor'),data=>{beginNewAttempt();const d=draft();d.drawing=data;d.updatedAt=now();persist();});
try{const response=await fetch(TOPICS[TOPIC_ID].curriculum+new URL(import.meta.url).search);if(!response.ok)throw Error('教材讀取失敗');course=await response.json();if(course.days.length!==30||course.days.some((d,i)=>d.day!==i+1)||course.topicId&&course.topicId!==TOPIC_ID)throw Error('教材主題或課次不正確');for(const d of course.days){const option=document.createElement('option');option.value=String(d.day);option.textContent=`D${String(d.day).padStart(2,'0')} · ${d.task.slice(0,30)}`;$('day-select').append(option);}if(course.sources){$('lesson-sources').replaceChildren();for(const source of course.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.label;a.target='_blank';a.rel='noopener';$('lesson-sources').append(a);}}textDoc($('reference'),course.reference);textDoc($('answers'),course.answers);let savedDay=prefs.startToday&&!location.hash?nextLesson(state).day:(prefs.lastDays[TOPIC_ID]||nextLesson(state).day);try{if(location.hash||!prefs.startToday)savedDay=Number(sessionStorage.getItem(DAY_KEY))||savedDay;}catch{}showDay(Number.isInteger(savedDay)&&savedDay>=1&&savedDay<=30?savedDay:1);$('day-select').disabled=false;$('practice-controls').disabled=false;$('start').disabled=false;paintStats();}catch(e){$('day-title').textContent='教材尚未載入，請重新整理。';storageMessage(e.message,true);$('start').disabled=true;}

cloud=mountCloudHistory({topicId:TOPIC_ID,sandbox:SANDBOX,getState:()=>state,download,onMerge:remote=>{
 if(!course)throw Error('請等待教材載入後再合併。');
 if(!writable)throw Error('本頁無法安全寫入，請先匯出紀錄並重新整理。');
 pause();const merged=mergeCloudRecords(state,remote);
 const next=safeSave(localStorage,merged,expected);state=merged;expected=next;showDay(currentDay);paintStats();
}});

showTab(Object.hasOwn(labels,location.hash.slice(1))?location.hash.slice(1):(prefs.startToday?'today':'overview'));

import {TOPICS} from './topics.js?v=0.8.1';
import {KEY,DAY_KEY,TOPIC_ID,SANDBOX,emptyState,assess,validateState,mergeStates,safeSave} from './core.js?v=0.8.1';
import {DrawingEditor,renderDrawing} from './drawing.js?v=0.8.1';
import {SHEETS,hasDrawing} from './drawing-model.js?v=0.8.1';
import {GUIDES} from './teaching-guides.js?v=0.8.1';
const $=id=>document.getElementById(id);const now=()=>new Date().toISOString();
let state=emptyState(),expected=null,writable=true,currentDay=1,tickFrom=null,course,editor;
if(SANDBOX){document.querySelector('.notice').textContent='功能測試空間：測試紀錄與正式學習紀錄分開儲存。';document.querySelector('.version').textContent+=' · 功能測試';}
function storageMessage(msg,bad=false){$('storage-status').textContent=msg;$('storage-status').className=bad?'warning':'';$('workspace-storage').textContent=bad?msg:'';$('workspace-storage').hidden=!bad;}
try{expected=localStorage.getItem(KEY);if(expected)state=validateState(JSON.parse(expected));storageMessage('目前瀏覽器可用；尚無雲端備份。');}catch{writable=false;storageMessage('無法讀取原有儲存資料，已保留原資料並停止覆寫。新紀錄請立即匯出，勿清除瀏覽器資料。',true);}
function persist(){if(!writable)return false;try{expected=safeSave(localStorage,state,expected);storageMessage('已存至目前瀏覽器 · '+new Date().toLocaleTimeString('zh-TW')+' · 尚未同步雲端');return true;}catch(e){writable=false;storageMessage(e.message+' 儲存未完成，請先匯出本頁資料。',true);return false;}}
const blank=()=>({activeMs:0,reasoning:'',explanation:'',mistake:'',hint:0,answerViewed:false,errorType:'未判定',values:{},startedAt:'',updatedAt:now()});
function draft(){return state.drafts[currentDay]??=blank();}
function timeText(ms){const seconds=Math.floor(ms/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function elapsed(){return (state.drafts[currentDay]?.activeMs??0)+(tickFrom===null?0:Math.max(0,performance.now()-tickFrom));}
function bankTick(){if(tickFrom!==null){draft().activeMs+=Math.max(0,performance.now()-tickFrom);tickFrom=performance.now();draft().updatedAt=now();}}
function pause(){if(tickFrom===null)return;bankTick();tickFrom=null;$('timer-note').textContent='已暫停。按繼續計時才會累計時間。';$('start').disabled=false;$('pause').disabled=true;$('start').textContent='繼續計時';persist();paintStats();}
function capture(){const d=draft();for(const k of ['reasoning','explanation','mistake'])d[k]=$(k).value;d.hint=d.answerViewed?3:Number($('hint').value);$('hint').value=String(d.hint);d.errorType=$('error-type').value;document.querySelectorAll('[data-answer]').forEach(el=>d.values[el.dataset.answer]=el.value);d.drawing=editor?.get();d.updatedAt=now();return d;}
function textDoc(container,text){container.replaceChildren();for(const line of text.split('\n')){if(!line.trim())continue;let tag='p',value=line;const heading=line.match(/^#{1,4}\s+(.*)/);if(heading){tag='h3';value=heading[1];}else if(line.startsWith('---'))continue;const el=document.createElement(tag);el.textContent=value.replace(/\*\*/g,'');container.append(el);}}
function paintStats(){const days=new Set(state.records.map(r=>r.day));$('count').textContent=days.size;const ms=state.records.reduce((n,r)=>n+r.activeMs,0)+Object.values(state.drafts).reduce((n,d)=>n+d.activeMs,0);$('minutes').textContent=`累積 ${(ms/60000).toFixed(1)} 分鐘`;}
function showDay(day){pause();currentDay=day;localStorageSelection(day);$('day-select').value=String(day);const lesson=course.days[day-1],d=state.drafts[day]??blank();$('day-title').textContent=`D${String(day).padStart(2,'0')} · ${lesson.task}`;$('workspace-lesson').textContent=$('day-title').textContent;$('read-task').textContent=lesson.read;$('do-task').textContent=lesson.activity??lesson.task;$('check-task').textContent=lesson.check;textDoc($('problem'),lesson.problem);$('beam-diagram').hidden=TOPIC_ID!=='structural-analysis'||day!==1;$('answer-details').open=false;$('guide-details').open=false;const guide=lesson.guide??GUIDES[day];textDoc($('guide-worked'),guide.worked.join('\n'));$('guide-plain').textContent=guide.plain;textDoc($('guide-draw'),guide.draw.join('\n'));$('numeric-fields').replaceChildren();for(const f of lesson.fields){const label=document.createElement('label');label.textContent=`${f.label}（${f.unit}）`;const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.dataset.answer=f.id;input.setAttribute('aria-label',f.label);input.maxLength=100;input.value=d.values[f.id]??'';label.append(input);$('numeric-fields').append(label);}
 $('numeric-note').textContent=lesson.fields.length?'關鍵數值採相對誤差 1% 核對；欄位單位固定如標示。數值符合不代表推導已驗收。':'今天以觀念與推導練習為主，提交後標記待教練審閱。';for(const k of ['reasoning','explanation','mistake'])$(k).value=d[k];$('hint').value=String(d.hint);$('error-type').value=d.errorType;$('timer').textContent=timeText(d.activeMs);$('start').textContent=d.activeMs?'繼續計時':'開始計時';$('result').textContent='';editor?.set(d.drawing);}
function localStorageSelection(day){try{sessionStorage.setItem(DAY_KEY,String(day));}catch{}}
function showTab(name){if(!course&&['today','route','history'].includes(name))return;document.querySelectorAll('.panel').forEach(el=>el.hidden=el.id!==name);document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===name));if(name!=='today')pause();if(name==='history')renderHistory();if(name==='route')renderRoute();}
function renderRoute(){$('route-list').replaceChildren();for(const d of course.days){const row=document.createElement('article');row.className='route-row';const box=document.createElement('div'),title=document.createElement('strong'),p=document.createElement('p'),badge=document.createElement('span');title.textContent=`D${String(d.day).padStart(2,'0')} · ${d.task}`;p.textContent=d.check;badge.className='badge';badge.textContent=state.records.some(r=>r.day===d.day)?'已提交練習 · 尚待完整驗收':'尚未提交';box.append(title,p,badge);const button=document.createElement('button');button.className='secondary';button.textContent='開始這課';button.onclick=()=>{showDay(d.day);showTab('today');window.scrollTo({top:0,behavior:'smooth'});};row.append(box,button);$('route-list').append(row);}}
function renderHistory(){$('history-list').replaceChildren();if(!state.records.length){$('history-list').textContent='尚未提交練習。先完成一課，再回來看自己的進步。';return;}for(const r of [...state.records].sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt))){const el=document.createElement('article');el.className='history-item';const h=document.createElement('h3');h.textContent=`D${String(r.day).padStart(2,'0')} · ${new Date(r.submittedAt).toLocaleString('zh-TW')}`;const info=document.createElement('p');info.textContent=`投入 ${(r.activeMs/60000).toFixed(1)} 分鐘 · 提示 ${r.hint} · ${r.errorType}`;const result=document.createElement('p');result.textContent=r.assessment.text;const pre=document.createElement('pre');pre.textContent=`數值：${Object.entries(r.values).map(([k,v])=>`${k}=${v}`).join('，')||'未填'}\n推導：${r.reasoning||'未填'}\n白話解釋：${r.explanation||'未填'}\n錯因／問題：${r.mistake||'未填'}`;const remove=document.createElement('button');remove.className='secondary';remove.textContent='刪除此筆紀錄';remove.onclick=()=>{if(!confirm('刪除這筆本機作答？建議先匯出備份；其他紀錄不受影響。'))return;state.records=state.records.filter(item=>item.id!==r.id);persist();paintStats();renderHistory();};el.append(h,info,result,pre);if(hasDrawing(r.drawing)){const note=document.createElement('p');note.textContent='圖解已保留；受力與變形圖尚待教練檢核。';el.append(note);for(const key of Object.keys(SHEETS)){if(!r.drawing.sheets[key].length)continue;const title=document.createElement('h4');title.textContent=SHEETS[key];el.append(title,renderDrawing(r.drawing,key));}}el.append(remove);$('history-list').append(el);}}
$('start').onclick=()=>{const d=draft();if(!d.startedAt)d.startedAt=now();tickFrom=performance.now();$('start').disabled=true;$('pause').disabled=false;$('timer-note').textContent='計時中。离開分頁會暫停；本次作答送出後結束這段計時。'.replace('离','離');persist();};$('pause').onclick=pause;
$('practice-form').addEventListener('input',()=>{capture();persist();});$('practice-form').addEventListener('change',()=>{capture();persist();});
for(const id of ['answer-details','guide-details'])$(id).addEventListener('toggle',()=>{if(course&&$(id).open&&!(TOPIC_ID!=='structural-analysis'&&id==='answer-details')){draft().answerViewed=true;$('hint').value='3';capture();persist();}});
$('practice-form').onsubmit=e=>{e.preventDefault();pause();const d=capture();if(!d.reasoning.trim()&&!d.explanation.trim()&&!Object.values(d.values).some(v=>v.trim())&&!hasDrawing(d.drawing)){$('result').textContent='請先畫圖或填寫答案、推導、白話解釋，再儲存作答。';return;}const hasNumeric=Object.values(d.values).some(v=>v.trim());const assessment=assess(hasNumeric?course.days[currentDay-1].fields:[],d.values,d.hint);if(hasDrawing(d.drawing))assessment.text='圖解已保留；'+assessment.text;const record={...structuredClone(d),id:crypto.randomUUID(),day:currentDay,submittedAt:now(),curriculumVersion:course.version,assessment};state.records.push(record);delete state.drafts[currentDay];const saved=persist();showDay(currentDay);$('result').textContent=(saved?'本次作答已存至瀏覽器。':'作答保留於本頁記憶體，請立即匯出備份。')+assessment.text;paintStats();};
document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>showTab(el.dataset.tab));$('day-select').onchange=e=>{capture();persist();showDay(Number(e.target.value));};
function download(value,name){const blob=new Blob([value],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>{pause();const data={...state,exportedAt:now(),source:'learning-lab-browser-v0.8.1'};download(JSON.stringify(data,null,2),`learning-lab-${TOPIC_ID}-${new Date().toISOString().slice(0,10)}.json`);$('export-status').textContent='已交給瀏覽器下載，請確認檔案確實保存。紀錄尚未同步雲端。';};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('檔案超過20MB。');pause();const incoming=validateState(JSON.parse(await file.text()));const merged=mergeStates(state,incoming);state=merged;const saved=persist();showDay(currentDay);paintStats();$('import-status').textContent=saved?`已合併，共${state.records.length}筆作答。`:'已載入本頁，瀏覽器儲存失敗，請匯出合併後備份。';}catch(err){$('import-status').textContent='未匯入：'+err.message;}e.target.value='';};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue!==expected){writable=false;pause();storageMessage('另一個分頁已更新紀錄，本頁已停止覆寫。請匯出本頁資料，再重新整理合併。',true);}});
setInterval(()=>{$('timer').textContent=timeText(elapsed());},250);setInterval(()=>{if(tickFrom!==null){bankTick();persist();paintStats();}},5000);

const topic=TOPICS[TOPIC_ID];
document.title='學習工作室｜'+topic.name;
$('topic-name').textContent=topic.name+' · 30天複習';
$('hero-description').textContent=topic.description;
$('route-description').textContent=topic.route;
$('backup-topic').textContent='目前主題：'+topic.name+'。匯出及還原僅處理這個主題；另一科請切換後另行備份。';
for(const [id,item] of Object.entries(TOPICS)){const option=document.createElement('option');option.value=id;option.textContent=item.name+(id==='reinforced-concrete'?'（含預力）':'');$('topic-select').append(option);}
$('topic-select').value=TOPIC_ID;
$('topic-select').onchange=e=>{const next=e.target.value;if(course){pause();capture();if(!persist()){$('topic-select').value=TOPIC_ID;storageMessage('尚有未保存資料，請先匯出備份，再切換主題。',true);return;}}const url=new URL(location.href);url.searchParams.set('topic',next);url.searchParams.set('v','0.8.1');url.hash='';location.assign(url.href);};
if(TOPIC_ID!=='structural-analysis'){
 $('step-do').textContent='02 / 做什麼 · 17分鐘';$('step-check').textContent='03 / 怎麼驗收 · 5分鐘';
 $('rhythm-note').textContent='另留3分鐘閉卷提取。可加量至60分鐘；週測20分鐘作答＋10分鐘核對，歷屆題25分鐘作答＋5分鐘檢查。';
 $('problem-note').textContent='本主題提供30天任務與解題提示；數值練習使用自選教材短題或指定官方原卷，請記錄題源、條件與規範版本。完整作答由教練審閱。';
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

editor=new DrawingEditor($('drawing-editor'),data=>{const d=draft();d.drawing=data;d.updatedAt=now();persist();});
try{const response=await fetch(TOPICS[TOPIC_ID].curriculum+new URL(import.meta.url).search);if(!response.ok)throw Error('教材讀取失敗');course=await response.json();if(course.days.length!==30||course.days.some((d,i)=>d.day!==i+1)||course.topicId&&course.topicId!==TOPIC_ID)throw Error('教材主題或課次不正確');for(const d of course.days){const option=document.createElement('option');option.value=String(d.day);option.textContent=`D${String(d.day).padStart(2,'0')} · ${d.task.slice(0,30)}`;$('day-select').append(option);}if(course.sources){$('lesson-sources').replaceChildren();for(const source of course.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.label;a.target='_blank';a.rel='noopener';$('lesson-sources').append(a);}}textDoc($('reference'),course.reference);textDoc($('answers'),course.answers);let savedDay=1;try{savedDay=Number(sessionStorage.getItem(DAY_KEY))||1;}catch{}showDay(Number.isInteger(savedDay)&&savedDay>=1&&savedDay<=30?savedDay:1);$('day-select').disabled=false;$('practice-controls').disabled=false;$('start').disabled=false;paintStats();}catch(e){$('day-title').textContent='教材尚未載入，請重新整理。';storageMessage(e.message,true);$('start').disabled=true;}

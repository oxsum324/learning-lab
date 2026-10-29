import {selectQuestion,recordResponse,revealSupport,setPracticeLevel,canRetry,recordNumericInitial} from './graded-practice.js?v=0.16.1';

export const START_LABELS={A:'A 重建 · 先喚起觀念',B:'B 喚醒 · 先整理步驟',C:'C 閉卷 · 先獨立作答'};
export const LEVEL_LABELS={1:'辨認條件',2:'分清觀念',3:'整理步驟',4:'補完圖解',5:'自己作答'};
export const D02_STARTERS={
 'structural-analysis':'先以 A 點取矩：R_B L − P a = 0，再用 R_A＋R_B − P = 0 核對垂直平衡。a 是集中力至 A 的距離；請自己代入題設數值，並將集中力兩側分段畫剪力與彎矩。',
 'reinforced-concrete':'依本題已指定的矩形壓力塊模型，先寫拉力 T = A_s f_y、壓力 C = 0.85 f′_c b a，令 C = T 求 a，再以 M_n = T(d − a/2) 計算名義彎矩。最後才套題設 φ；N·mm 換成 kN·m 時需除以 10⁶。',
 'steel-structures':'將對稱 H 形斷面分成兩片翼板與腹板。先寫 A = 2b_f t_f ＋ (H − 2t_f)t_w；以 I_x = Σ(I_xi ＋ A_i y_i²) 組合強軸慣性矩，y_i 為各部分重心至全斷面重心的距離，再由 r_x = √(I_x/A)、S_x = I_x/(H/2) 核對單位。',
 'structural-dynamics':'本題以 x = u − u_g 為相對位移。先把絕對加速度寫成 x¨＋u_g¨，力平衡起式為 m(x¨＋u_g¨)＋c x˙＋kx = 0；將地盤加速度項移至右側時，請保留符號。自然圓頻率、週期與阻尼比再由題設 m、k、c 求出。',
 'soil-foundations':'先用三相圖分清固體體積、孔隙體積與水體積；本題 w = 10% 應先換成 0.10。依題設先算 γ_d = G_s γ_w/(1＋e)，再算 γ = γ_d(1＋w)；最後用 S = wG_s/e，與 S = 1 的飽和條件比較。'
};
const PARTIAL_STARTERS={
 'structural-analysis:5':'先利用載重與幾何的對稱性判斷兩端垂直反力關係，再由整體垂直平衡求反力。從只有兩個未知桿力的節點入手，先定義拉力為正，依斜桿水平、垂直投影列兩個平衡式；不要先把桿力方向當成結論。',
 'structural-analysis:6':'先把整個懸臂剛架視為一個自由體，以 ΣF_x = 0、ΣF_y = 0、ΣM_A = 0 求固定端反力與反力矩。再分水平梁與立柱切面，逐段辨別軸力、剪力及彎矩；力矩臂取垂直距離。',
 'structural-dynamics:1':'先畫地盤與質塊，標明絕對位移、地盤位移及相對位移的正方向。彈簧與阻尼器的變形來自相對運動，慣性項則使用絕對加速度；先逐項列力，再整理運動方程。',
 'soil-foundations:1':'先依水位分層畫總應力與孔隙水壓。總應力由上覆各層厚度乘單位重累加；靜水壓由水面下深度求出，再用 σ′_v = σ_v − u 求有效應力。不要同時使用浮重又重複扣除孔隙水壓。'
};
export function starterFor(topic,day,fallback){return day===2?D02_STARTERS[topic]:(PARTIAL_STARTERS[`${topic}:${day}`]??fallback);}
export function gradedAccess({day,startLevel,submitted=false,inWork=false,assistance=0}){const weeklyLocked=day===7&&!submitted;return {weeklyLocked,allowed:day===7?submitted:startLevel!=='C'||inWork||assistance>0};}
export function normalizeStarts(value){const out={};for(const [topic,p] of Object.entries(value??{}))if(['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'].includes(topic)&&['A','B','C'].includes(p?.startLevel))out[topic]={startLevel:p.startLevel,configured:p.configured===true};return out;}
export function startPreference(preferences,topic,hasHistory=false){return preferences[topic]??{startLevel:'C',configured:hasHistory};}
export function priorCoreAssistance(records,day,at=Date.now()){const today=new Date(at).toDateString();return Math.max(0,...records.filter(r=>r.day===day&&new Date(r.submittedAt).toDateString()===today).map(r=>Math.max(r.progressive?.assistance??0,r.hint??0,r.answerViewed?3:0)));}
export function diagnosticRecommendation(attempts){const unique=new Map();for(const a of attempts??[]){const q=a.question??a.snapshot;if(q?.diagnostic&&!unique.has(q.id))unique.set(q.id,a);}const rows=[...unique.values()],correct=rows.filter(a=>a.result?.correct).length;return {complete:rows.length>=10,startLevel:correct>=8?'C':correct>=5?'B':'A',answered:rows.length};}
export function moveOrder(order,id,delta){const next=[...order],i=next.indexOf(id),j=i+delta;if(i>=0&&j>=0&&j<next.length)[next[i],next[j]]=[next[j],next[i]];return next;}
export function refreshGradedLimit(container,practice,activeMs){const message=container.querySelector('[data-graded-limit]');if(message)message.hidden=practice.day===1||canRetry(practice,{activeMs});}
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,action,cls='secondary')=>{const b=node('button',text,cls);b.type='button';b.onclick=action;return b;};
function hint(p,level,kind){if(p.assistance<level||!p.events.some(e=>e.kind===kind))revealSupport(p,level,kind);}

// One mounted question retains its frozen order and all partial answers in the draft.
export function renderGradedPractice(container,config){
 const {practice:p,questions,day,allowed,weeklyLocked,activeMs,onChange,onRender,onLevel,onCore,onScaffold,onStarter,onPreference,numericFactory,hasScaffold,starter,draw}=config;
 container.replaceChildren();
 const heading=node('div',undefined,'graded-heading');heading.append(node('h3',day===1?'先找起點，再完成本課任務':'需要時，補上卡住的一步'));
 const support=node('span',`已記協助 ${p.assistance} 級`,'graded-support');support.id='graded-support';heading.append(support);container.append(heading);
 if(weeklyLocked){container.append(node('p','本課為限時週測。先完成下方原題並提交，之後再開啟補強；既定計時維持不變。','graded-message'));return;}
 const summary=node('p',p.assistance?'同題已看過協助，接續作答記為提示後重建；原始答案保留。':'可直接在下方畫圖、列式。需要時再選協助，不必逐層完成。','graded-summary');container.append(summary);
 const details=node('details',undefined,'graded-tools');details.append(node('summary',`目前：${LEVEL_LABELS[p.level]} · 切換協助`));
 const tabs=node('div',undefined,'graded-levels');tabs.setAttribute('aria-label','本次練習方式');for(let level=1;level<=5;level++){const b=button(LEVEL_LABELS[level],()=>onLevel(level));b.dataset.gradedLevel=level;b.setAttribute('aria-pressed',String(p.level===level));b.disabled=level<5&&!allowed;tabs.append(b);}details.append(tabs);container.append(details);
 if(!allowed){container.append(node('p','C 閉卷起點：先回想與讀題，手算階段可開啟協助。','graded-message'));return;}
 if(day===1&&p.level>=4){container.append(button('開始 10 題起點診斷',()=>onLevel(1)));container.append(node('p','診斷約 10 分鐘，只建議起點；本課原有圖解與列式任務仍保留。','muted'));}
 if(p.level===5){container.append(button('前往本課圖解與推導',onCore));return;}
 if(p.level===4){
  const actions=node('div',undefined,'graded-actions');actions.append(button(p.starterSeen?'重看起式與圖解提示':'查看起式與圖解提示（協助 2）',onStarter));if(hasScaffold)actions.append(button(p.scaffoldId?'半成品已加入':'加入本課半成品（協助 2）',onScaffold));container.append(actions);
  if(p.starterSeen){container.append(node('p',starter,'graded-starter'),node('p',draw));}
  container.append(button('接著自己畫圖、列式',onCore));return;
 }
 const bank=questions.filter(q=>day!==1||q.diagnostic);
 let q=p.current;
 if(!q||q.level!==p.level){q=selectQuestion(bank,p,{level:p.level});if(q)onChange(false);}
 if(!q){
  const remaining=bank.filter(x=>!p.attempts.some(a=>(a.question??a.snapshot)?.id===x.id));
  if(day===1&&!remaining.length){const recommendation=diagnosticRecommendation(p.attempts);container.append(node('p',`10 題診斷已完成。建議從 ${START_LABELS[recommendation.startLevel]} 開始；這不是能力合格判定。`,'graded-message'));container.append(button('採用建議起點（僅本瀏覽器）',()=>onPreference(recommendation.startLevel)),button('回到本課圖解與列式',()=>onLevel(5)));return;}
  container.append(node('p','這一層的未見題已用完。可補完圖解、結束練習，或主動重做已見題。','graded-message'));
  container.append(button('補完本課圖解',()=>onLevel(4)),button('自己作答',()=>onLevel(5)),button('重做已見題',()=>{selectQuestion(bank,p,{level:p.level,allowRepeat:true});onChange();onRender();}));return;
 }
 if(!q.numeric||q.numericInitial)hint(p,q.assistance??1,'question:'+q.id);
 const card=node('section',undefined,'graded-question');card.dataset.questionId=q.id;card.dataset.questionType=q.type;card.setAttribute('aria-label','本次小題');
 card.append(node('p',`${LEVEL_LABELS[q.level]} · ${q.skill}`,'eyebrow'));const title=node('h4',q.prompt);title.id='graded-question-title';card.append(title);
 const source=node('details',undefined,'graded-source');source.append(node('summary','題目依據'),node('p',`${q.source.label}｜${q.source.locator}`));card.append(source);
 if(q.numeric&&!q.numericInitial){
  const label=node('label',`${q.numericMeta.fieldLabel}（${q.numericMeta.unit}）`),input=node('input');input.type='text';input.inputMode='decimal';input.maxLength=100;input.id='graded-numeric-input';input.value=q.numericDraft??'';input.oninput=()=>{q.numericDraft=input.value;onChange();};label.append(input);card.append(label);
  const submit=unknown=>{if(!unknown&&(!input.value.trim()||!Number.isFinite(Number(input.value)))){status.textContent='請填寫有限數值，或選擇目前不知道。';return;}if(!recordNumericInitial(p,input.value,{unknown})){status.textContent='請填寫十進位有限數值，或選擇目前不知道。';return;}hint(p,q.assistance??1,'numeric-candidates:'+q.id);onChange();onRender();};
  card.append(button('保留首次數值，再看選項',()=>submit(false)),button('目前不知道，記錄後看選項',()=>submit(true)));
  const status=node('p','數值候選尚未開啟；首次數值不會被之後訂正覆蓋。');status.id='graded-status';status.setAttribute('role','status');card.append(status);container.append(card);return;
 }
 if(q.numeric)card.append(node('p',q.numericInitial.status==='unknown'?'首次作答：目前不知道。':`首次數值：${q.numericInitial.value} ${q.numericMeta.unit}（原稿保留）`,'graded-first-answer'));
 const limit=node('p','已達此卡點的重試或時間上限，可選「回到核心圖解」或「先留下本次練習」。','graded-retreat');limit.dataset.gradedLimit='';limit.hidden=day===1||canRetry(p,{activeMs:activeMs()});card.append(limit);
 const controls=node('fieldset');controls.disabled=!!q.graded;controls.setAttribute('aria-labelledby','graded-question-title');
 function changed(value){q.response=value;onChange();}
 const choiceGroup=(options,name,current,change,multi=false)=>{const wrap=node('div',undefined,'graded-options');for(const o of options){const label=node('label',undefined,'graded-option'),input=node('input');input.type=multi?'checkbox':'radio';input.name=name;input.value=o.id;input.checked=multi?Array.isArray(current)&&current.includes(o.id):current===o.id;input.onchange=()=>change(multi?[...wrap.querySelectorAll('input:checked')].map(n=>n.value):o.id);label.append(input,node('span',o.text));wrap.append(label);}return wrap;};
 if(['single','multi','error'].includes(q.type))controls.append(choiceGroup(q.options,'graded-answer',q.response,changed,q.type==='multi'));
 if(q.type==='boolean'){
  controls.append(node('legend','判斷正誤並選理由'),choiceGroup(q.options,'graded-boolean',q.response?.choice,value=>changed({...q.response,choice:value})));const reasons=node('fieldset');reasons.append(node('legend','我的理由'),choiceGroup(q.reasonOptions,'graded-reason',q.response?.reason,value=>changed({...q.response,reason:value})));controls.append(reasons);
 }
 if(['match','fill'].includes(q.type))for(const f of q.fields){const label=node('label',f.label),select=node('select');select.dataset.gradedField=f.id;select.setAttribute('aria-label',f.label);const empty=node('option','請選擇');empty.value='';select.append(empty);for(const o of f.options){const option=node('option',o.text);option.value=o.id;select.append(option);}select.value=q.response?.[f.id]??'';select.onchange=()=>changed({...q.response,[f.id]:select.value});label.append(select);controls.append(label);}
 if(q.type==='order'){
  const order=Array.isArray(q.response)?q.response:q.options.map(o=>o.id);const list=node('ol',undefined,'graded-order');
  const move=(id,delta)=>{changed(moveOrder(order,id,delta));onRender();const moved=container.querySelector(`[data-order-item="${id}"] button`);moved?.focus({preventScroll:true});};
  for(const [i,id]of order.entries()){const item=node('li');item.dataset.orderItem=id;item.append(node('span',q.options.find(o=>o.id===id).text));const actions=node('span',undefined,'graded-order-actions');for(const [delta,label]of [[-1,'上移'],[1,'下移']]){const b=button(label,()=>move(id,delta));b.setAttribute('aria-label',`${label}第 ${i+1} 步`);b.disabled=!!q.graded||i+delta<0||i+delta>=order.length;b.onkeydown=e=>{if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(id,e.key==='ArrowUp'?-1:1);}};actions.append(b);}item.append(actions);list.append(item);}controls.append(list,node('p','可用上下按鈕，或在按鈕按 Alt＋方向鍵。','muted'));
 }
 card.append(controls);const status=node('div',undefined,'graded-status');status.id='graded-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const actions=node('div',undefined,'graded-actions');
 const check=unknown=>{const answer=unknown?{unknown:true}:q.type==='order'?(q.response??q.options.map(o=>o.id)):q.response;const result=recordResponse(p,answer,{activeMs:activeMs()});if(!result){status.textContent='請先完成每一項作答；也可選目前不知道。';return;}onChange();onRender();};
 if(!q.graded){actions.append(button('核對本題',()=>check(false),'primary'),button('目前不知道',()=>check(true)));}
 else{
  const r=q.result??p.attempts.at(-1)?.result;status.append(node('p',r?.correct?'這一題已核對，可接著嘗試。':'原答已保留，先看錯因再決定下一步。'));const feedback=node('details');feedback.append(node('summary',q.numeric?'查看數值完整解析（協助 3）':'查看逐項核對與錯因'));if(q.numeric)feedback.addEventListener('toggle',()=>{if(feedback.open){hint(p,3,'numeric-solution:'+q.id);support.textContent=`已記協助 ${p.assistance} 級`;onChange();}});for(const message of r?.feedback??[])feedback.append(node('p',message));status.append(feedback);
  const can=canRetry(p,{activeMs:activeMs()});
  if(day===1){actions.append(button('下一題診斷',()=>{const left=bank.filter(x=>!p.attempts.some(a=>(a.question??a.snapshot)?.id===x.id));if(left.length){setPracticeLevel(p,left[0].level);p.current=null;selectQuestion(bank,p,{level:left[0].level});}else p.current=null;onChange();onRender();}));}
  else if(r?.correct)actions.append(button(p.level===3?'接著補完圖解':'試下一種方式',()=>onLevel(Math.min(4,p.level+1))));
  else if(can)actions.append(button('換一題同層練習',()=>{p.current=null;selectQuestion(bank,p,{level:p.level});onChange();onRender();}));
  if(!can){status.append(node('p','已在此卡點練習兩次或達五分鐘；先補一個步驟，或留下待補項。','graded-retreat'));}
 }
 actions.append(button('回到核心圖解',()=>onLevel(4)),button('先留下本次練習',()=>config.onFinish()));card.append(status,actions);container.append(card);
 if(day!==1&&numericFactory){const numeric=button('另做一題數值變式',()=>{p.activeMs=Math.max(p.activeMs,Math.round(activeMs()));setPracticeLevel(p,3);p.current=null;selectQuestion([numericFactory(`${p.sessionId}:${p.attempts.length}`)],p,{level:3,allowRepeat:true});onChange();onRender();});numeric.disabled=(p.level===3&&!q.graded)||!!p.parked?.[3];if(numeric.disabled)numeric.title='請先回到「整理步驟」核對或記錄目前不知道，保留程序題原稿後再開變式。';container.append(numeric);}
 support.textContent=`已記協助 ${p.assistance} 級`;
 onChange(false);
}

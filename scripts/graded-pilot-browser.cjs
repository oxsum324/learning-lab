// Playwright CLI run-code: local, sandbox-only acceptance fixture.
async page=>{
 const base='http://127.0.0.1:4195/',topics=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
 const errors=[],results=[],seen=new Set();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const ok=(x,label)=>{if(!x)throw Error(label);};
 const state=()=>page.evaluate(()=>{const topic=new URL(location.href).searchParams.get('topic');return Object.values(localStorage).map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(v=>v?.schemaVersion===1&&v.topicId===topic);});
 const current=async()=>(await state()).drafts[2].progressive.current;
 const ready=async()=>{await page.locator('#day-select:not([disabled])').waitFor({state:'attached'});await page.locator('[data-tab="today"]').click();};
 const levels=async n=>{await page.locator('#graded-practice details.graded-tools').evaluate(e=>e.open=true);await page.locator(`[data-graded-level="${n}"]`).click();};
 async function answer(q){
  seen.add(q.type);
  if(['single','error'].includes(q.type))await page.locator(`[name="graded-answer"][value="${q.answer}"]`).check();
  if(q.type==='multi')for(const id of q.answer)await page.locator(`[name="graded-answer"][value="${id}"]`).check();
  if(q.type==='boolean'){await page.locator(`[name="graded-boolean"][value="${q.answer.choice}"]`).check();await page.locator(`[name="graded-reason"][value="${q.answer.reason}"]`).check();}
  if(['match','fill'].includes(q.type))for(const [id,value]of Object.entries(q.answer))await page.locator(`[data-graded-field="${id}"]`).selectOption(value);
  if(q.type==='order')for(let i=0;i<q.answer.length;i++){let ids=await page.locator('[data-order-item]').evaluateAll(es=>es.map(e=>e.dataset.orderItem));let j=ids.indexOf(q.answer[i]);while(j>i){await page.locator(`[data-order-item="${q.answer[i]}"]`).getByRole('button',{name:/上移/}).click();j--;}}
  await page.getByRole('button',{name:'核對本題',exact:true}).click();
  const p=(await state()).drafts[2].progressive;ok(p.attempts.at(-1)?.result.correct,q.id+' UI correct result');
 }
 await page.clock.install();
 for(const topic of topics)for(const start of ['A','B','C'])for(const width of [320,390,1440]){
  await page.goto(base+'?sandbox=1&topic='+topic+'#today');await ready();
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.includes('sandbox'))localStorage.removeItem(k);sessionStorage.clear();});
  await page.reload();await ready();await page.setViewportSize({width,height:900});await page.locator('#day-select').selectOption('2');
  await page.locator(`[data-start-level="${start}"]`).click();
  const initial=(await state()).drafts[2].progressive;ok(initial.level===({A:1,B:3,C:5}[start]),`${topic}/${start}/${width} start`);
  if(start==='C'){
   ok(await page.locator('[data-question-type]').count()===0,'C must not expose choices');
   await page.locator('#graded-practice details.graded-tools').evaluate(e=>e.open=true);ok(await page.locator('[data-graded-level="1"]').isDisabled(),'C support locked before work');
   await page.locator('#start').click();await page.clock.fastForward(480500);await page.locator('#pause').click();
  }
  for(const level of [1,2,3]){await levels(level);const q=await current();ok(q,topic+' question at '+level);await answer(q);}
  const before=(await state()).drafts[2].progressive;await page.reload();await ready();const after=(await state()).drafts[2].progressive;
  ok(JSON.stringify(before.attempts)===JSON.stringify(after.attempts),'reload answer preservation');
  await levels(4);await page.getByRole('button',{name:/查看起式與圖解提示|重看起式與圖解提示/}).click();
  await levels(5);ok((await state()).drafts[2].progressive.assistance>=2,'L5 retains assistance');
  await page.locator('#reasoning').fill('功能測試原稿：先辨認模型，再列平衡與必要條件。');
  await page.locator('#practice-form button[type="submit"]').click();
  const saved=await state();ok(saved.records.length===1,'submit one session, not one record per click');ok(saved.records[0].progressive.attempts.length===3,'three typed attempts preserved');
  ok(!saved.records[0].assessment.text.includes('閉卷獨立作答已記錄'),'assisted outcome is not closed book');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${topic}/${start}/${width} overflow`);
  if(start==='A'&&width===390){await page.locator('#graded-practice').screenshot({path:`output/playwright/graded-pilot-${topic}-390.png`});}
  results.push({topic,start,width,passed:true});
 }
 ok(errors.length===0,errors.join('\n'));
 console.log(JSON.stringify({phase:'five-D02-pilot',cases:results.length,results,types:[...seen],errors}));
 return {phase:'five-D02-pilot',passed:results.length,types:[...seen],errors};
}

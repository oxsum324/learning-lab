async page=>{
 const base='http://127.0.0.1:4195/',topics=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
 const errors=[],results=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const ok=(v,msg)=>{if(!v)throw Error(msg);};
 const ready=p=>p.locator('#day-select:not([disabled])').waitFor({state:'attached'});
 const state=p=>p.evaluate(()=>{const t=new URL(location.href).searchParams.get('topic');return Object.values(localStorage).map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(v=>v?.schemaVersion===1&&v.topicId===t);});
 const level=async n=>{await page.locator('.graded-tools').evaluate(e=>e.open=true);await page.locator(`[data-graded-level="${n}"]`).click();};
 async function answer(q,day){
  if(['single','error'].includes(q.type))await page.locator(`[name="graded-answer"][value="${q.answer}"]`).check();
  if(q.type==='multi')for(const id of q.answer)await page.locator(`[name="graded-answer"][value="${id}"]`).check();
  if(q.type==='boolean'){await page.locator(`[name="graded-boolean"][value="${q.answer.choice}"]`).check();await page.locator(`[name="graded-reason"][value="${q.answer.reason}"]`).check();}
  if(['match','fill'].includes(q.type))for(const [id,value]of Object.entries(q.answer))await page.locator(`[data-graded-field="${id}"]`).selectOption(value);
  if(q.type==='order')for(let i=0;i<q.answer.length;i++){const ids=await page.locator('[data-order-item]').evaluateAll(es=>es.map(e=>e.dataset.orderItem));for(let j=ids.indexOf(q.answer[i]);j>i;j--)await page.locator(`[data-order-item="${q.answer[i]}"]`).getByRole('button',{name:/上移/}).click();}
  await page.getByRole('button',{name:'核對本題',exact:true}).click();ok((await state(page)).drafts[day].progressive.attempts.at(-1)?.result.correct,'UI answer '+q.id);
 }
 async function restore(original,topic){
  await page.locator('[data-tab="backup"]').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
  const file=await download.path(),context=await page.context().browser().newContext({viewport:{width:768,height:1024},hasTouch:true});
  try{const other=await context.newPage();other.on('pageerror',e=>errors.push(String(e)));await other.goto(base+'?sandbox=1&topic='+topic+'#backup');await ready(other);await other.locator('#import').setInputFiles(file);await other.locator('#import-status').filter({hasText:/匯入|合併/}).waitFor();const restored=await state(other);ok(JSON.stringify(restored.records)===JSON.stringify(original.records),'all submitted fields restore '+topic);await other.locator('[data-tab="history"]').click();await other.locator('.history-item details').first().evaluate(e=>e.open=true);await other.locator('.history-item').first().screenshot({path:`output/playwright/graded-history-${topic}-768.png`});}
  finally{await context.close();}
  await page.locator('[data-tab="today"]').click();
 }
 for(const topic of topics){
  await page.goto(base+'?sandbox=1&topic='+topic+'#today');await ready(page);await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.includes('sandbox'))localStorage.removeItem(k);sessionStorage.clear();});await page.reload();await ready(page);await page.setViewportSize({width:390,height:844});await page.locator('[data-start-level="A"]').click();
  await page.locator('#day-select').selectOption('1');const core=await page.locator('#problem').innerText();
  for(let i=0;i<10;i++){const q=(await state(page)).drafts[1].progressive.current;ok(q?.diagnostic,'diagnostic '+topic+' '+i);await answer(q,1);await page.getByRole('button',{name:'下一題診斷',exact:true}).click();}
  ok((await page.locator('#graded-practice').innerText()).includes('10 題診斷已完成'),'diagnostic end');ok(await page.locator('#problem').innerText()===core,'D01 core retained');
  await page.getByRole('button',{name:'回到本課圖解與列式',exact:true}).click();await page.locator('#reasoning').fill('測試診斷後核心原稿。');await page.locator('#practice-form button[type="submit"]').click();
  await page.locator('#day-select').selectOption('2');
  for(const n of [1,2,3]){await level(n);await answer((await state(page)).drafts[2].progressive.current,2);}
  await page.getByRole('button',{name:'另做一題數值變式',exact:true}).click();await page.locator('#graded-numeric-input').fill('123.456');await page.getByRole('button',{name:'保留首次數值，再看選項',exact:true}).click();await answer((await state(page)).drafts[2].progressive.current,2);
  await page.getByText('查看數值完整解析（協助 3）',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('#graded-support')?.textContent.includes('3'));
  await page.locator('details.drawing-menu').filter({has:page.locator('[data-prop="template"]')}).evaluate(e=>e.open=true);await page.locator('[data-prop="template"]').selectOption('axes');await page.locator('[data-action="template"]').click();await level(5);await page.locator('#reasoning').fill('測試同份紀錄保留複選、步驟、首次數值、參數、圖解與協助。');await page.locator('#practice-form button[type="submit"]').click();let combined=(await state(page)).records.at(-1);ok(combined.progressive.attempts.length===4&&combined.progressive.attempts.at(-1).question.numericInitial.value==='123.456'&&combined.drawing.sheets.workspace.length>0,'combined submission');
  for(const day of [3,4,5,6]){
   await page.locator('#day-select').selectOption(String(day));await page.setViewportSize({width:day%2?320:768,height:900});
   for(const n of [1,2,3]){await level(n);const p=(await state(page)).drafts[day].progressive,q=p.current;ok(q,'question '+topic+'/'+day+'/'+n);if(n===1){await page.getByRole('button',{name:'核對本題',exact:true}).click();ok((await state(page)).drafts[day].progressive.attempts.length===0,'incomplete not recorded');}await answer(q,day);}
   await level(4);await page.getByRole('button',{name:/查看起式與圖解提示/}).click();
   const scaffold=page.getByRole('button',{name:'加入本課半成品（協助 2）',exact:true});if(await scaffold.count())await scaffold.click();
   await page.locator('details.drawing-menu').filter({has:page.locator('[data-prop="template"]')}).evaluate(e=>e.open=true);
   await page.locator('[data-prop="template"]').selectOption({'structural-analysis':'simple','reinforced-concrete':'section','steel-structures':'hsection','structural-dynamics':'plot','soil-foundations':'layers'}[topic]);await page.locator('[data-action="template"]').click();
   await level(5);await page.locator('#reasoning').fill('測試圖解與逐層回答原稿。');await page.locator('#practice-form button[type="submit"]').click();const r=(await state(page)).records.at(-1);ok(r.drawing.sheets.workspace.length>0,'drawing stored '+topic+'/'+day);ok(r.progressive.attempts.length===3,'typed answers stored');ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+topic+'/'+day);
  }
  await page.locator('#day-select').selectOption('7');ok((await page.locator('#graded-practice').innerText()).includes('先完成下方原題並提交'),'weekly locked');await page.locator('#reasoning').fill('測試週測無提示原稿：先獨立列式。');await page.locator('#practice-form button[type="submit"]').click();const weekly=(await state(page)).records.at(-1);ok(weekly.progressive.assistance===0,'weekly before support assistance zero');const first=JSON.stringify(weekly);await page.locator('#review-continue').click();for(const n of [1,2,3]){await level(n);await answer((await state(page)).drafts[7].progressive.current,7);}await page.locator('#reasoning').fill('測試週測交卷後補強原稿。');await page.locator('#practice-form button[type="submit"]').click();let saved=await state(page);ok(JSON.stringify(saved.records.find(r=>r.id===weekly.id))===first,'weekly original unchanged');await restore(saved,topic);
  for(const day of [8,23]){await page.locator('#day-select').selectOption(String(day));ok(await page.locator('#legacy-review').isVisible(),'legacy day '+day);if(topic==='structural-analysis'&&day===23)ok((await page.locator('#phase-strip').innerText()).includes('25 分'),'structure D23 25min');}
  results.push({topic,diagnostic:10,expansionLessons:4,weeklyOriginal:true,restoreDrawings:true,legacy:true});
 }
 ok(errors.length===0,errors.join('\n'));return {phase:'D01-D07-expansion',passed:results.length,results,errors};
}

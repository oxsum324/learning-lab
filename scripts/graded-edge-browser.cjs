async page=>{
 const base='http://127.0.0.1:4195/',topics=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
 const errors=[],results=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const ok=(v,msg)=>{if(!v)throw Error(msg);};
 const ready=p=>p.locator('#day-select:not([disabled])').waitFor({state:'attached'});
 const state=p=>p.evaluate(()=>{const t=new URL(location.href).searchParams.get('topic');return Object.values(localStorage).map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(v=>v?.schemaVersion===1&&v.topicId===t);});
 const level=async n=>{await page.locator('.graded-tools').evaluate(e=>e.open=true);await page.locator(`[data-graded-level="${n}"]`).click();};
 for(const topic of topics){
  await page.goto(base+'?sandbox=1&topic='+topic+'#today');await ready(page);
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.includes('sandbox'))localStorage.removeItem(k);sessionStorage.clear();});
  await page.reload();await ready(page);await page.setViewportSize({width:390,height:844});await page.locator('#day-select').selectOption('2');await page.locator('[data-start-level="A"]').click();
  await page.locator('#graded-practice input[type="radio"]').first().check();const first=(await state(page)).drafts[2].progressive.current;
  await level(2);await level(1);let returned=(await state(page)).drafts[2].progressive.current;
  ok(first.id===returned.id&&JSON.stringify(first.response)===JSON.stringify(returned.response),'switch preserves partial '+topic);
  await page.reload();await ready(page);returned=(await state(page)).drafts[2].progressive.current;ok(JSON.stringify(first.response)===JSON.stringify(returned.response),'reload partial '+topic);
  await page.locator('#graded-practice').screenshot({path:`output/playwright/graded-question-${topic}-390.png`});
  await page.getByRole('button',{name:'另做一題數值變式',exact:true}).click();
  ok(await page.locator('#graded-practice [name="graded-answer"]').count()===0,'numeric candidates withheld '+topic);
  await page.locator('#graded-numeric-input').fill('123.456');await page.getByRole('button',{name:'保留首次數值，再看選項',exact:true}).click();
  let q=(await state(page)).drafts[2].progressive.current;ok(q.numericInitial.value==='123.456','numeric first saved');
  await page.locator(`[name="graded-answer"][value="${q.answer}"]`).check();await page.getByRole('button',{name:'核對本題',exact:true}).click();
  await page.getByText('查看數值完整解析（協助 3）',{exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#graded-support')?.textContent.includes('3'));
  const withHelp=(await state(page)).drafts[2].progressive;ok(withHelp.assistance===3,'full numerical solution level3');
  await level(5);await page.locator('#reasoning').fill('隔離測試：這是提示後重建，保留首次錯誤數值。');await page.locator('#practice-form button[type="submit"]').click();
  const original=(await state(page)).records[0];ok(original.progressive.attempts[0].question.numericInitial.value==='123.456','submitted first numeric immutable');
  // Browser two has independent storage, exercising the actual import screen.
  await page.locator('[data-tab="backup"]').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
  const file=await download.path();const context=await page.context().browser().newContext({viewport:{width:320,height:812},hasTouch:true,isMobile:true});const other=await context.newPage();
  other.on('pageerror',e=>errors.push(String(e)));await other.goto(base+'?sandbox=1&topic='+topic+'#backup');await ready(other);await other.locator('[data-tab="backup"]').click();await other.locator('#import').setInputFiles(file);
  await other.locator('#import-status').filter({hasText:/匯入|合併/}).waitFor();
  const restored=await state(other);ok(JSON.stringify(restored.records[0])===JSON.stringify(original),'two-context full record roundtrip '+topic);
  await context.close();
  await page.locator('[data-tab="today"]').click();await page.locator('#day-select').selectOption('7');
  ok(await page.locator('#graded-practice').innerText().then(t=>t.includes('先完成下方原題並提交')),'weekly initially locked '+topic);
  ok(await page.locator('#graded-practice [data-question-type]').count()===0,'weekly no answer leakage');
  const phases=await page.locator('#phase-strip').innerText();ok(phases.includes(topic==='structural-analysis'?'25 分':'20 分'),'weekly duration '+topic);
  results.push({topic,partial:true,numeric:true,roundtrip:true,weekly:true});
 }
 ok(errors.length===0,errors.join('\n'));return {phase:'pilot-edge-and-restore',passed:results.length,results,errors};
}

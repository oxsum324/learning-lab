// Playwright CLI run-code input. Run against the local preview, using a fresh CLI session.
async (page) => {
 const topics=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
 const results=[],errors=[],base='http://127.0.0.1:4194/';
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const ok=(value,label)=>{if(!value)throw Error(label);};
 const load=async(topic)=>{await page.goto(base+'?sandbox=1&topic='+topic+'#today');await page.locator('#day-select:not([disabled])').waitFor();};
 const state=()=>page.evaluate(()=>Object.values(localStorage).map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(v=>v?.schemaVersion===1&&v.topicId===new URL(location.href).searchParams.get('topic')));
 const submit=()=>page.locator('#practice-form button[type="submit"]').click();
 await page.goto(base+'?sandbox=1');await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.includes('sandbox'))localStorage.removeItem(k);});
 for(const topic of topics){
  await page.setViewportSize({width:1440,height:1000});await load(topic);await page.locator('#review-mode').selectOption('progressive');await page.locator('#day-select').selectOption('2');
  ok(await page.locator('[data-review-question]:checked').count()===0,topic+' candidates must start unselected');
  await submit();ok((await state()).records.length===0,topic+' incomplete recognition must not submit');
  for(const q of ['model','number'])if(await page.locator(`[data-review-question="${q}"]`).count())await page.locator(`[data-review-question="${q}"][value="1"]`).check();
  await page.locator('#check-recognition').click();ok((await page.locator('#recognition-status').textContent()).includes('請再辨識'),topic+' wrong feedback');
  await submit();ok(await page.locator('#review-stage').inputValue()==='recognize',topic+' wrong remains recognition');
  await page.locator('#review-continue').click();
  for(const q of ['model','number'])if(await page.locator(`[data-review-question="${q}"]`).count())await page.locator(`[data-review-question="${q}"][value="0"]`).check();
  await page.locator('#check-recognition').click();ok((await page.locator('#recognition-status').textContent()).includes('可進入提示補完'),topic+' correct feedback');
  await page.locator('.progressive-review').scrollIntoViewIfNeeded();await page.locator('.progressive-review').screenshot({path:`output/playwright/${topic}-recognize-desktop.png`});
  await submit();ok(await page.locator('#review-stage').inputValue()==='guided',topic+' recognition promotes');await page.locator('#review-continue').click();
  await page.locator('#show-starter').click();ok(await page.locator('#hint').inputValue()==='2',topic+' guided hint');ok(await page.locator('#guided-starter').isVisible(),topic+' partial derivation');
  await page.locator('#reasoning').fill('隔離測試：從提示起式，補上下一個平衡方程與適用條件。');
  await page.locator('#explanation').fill('這是提示補完，仍需要教練審閱模型。');
  await page.locator('#review-stage').selectOption('independent');ok(await page.locator('#hint').inputValue()==='2',topic+' switching cannot erase hints');
  ok(await page.locator('#hint').isDisabled(),topic+' hint is read-only');ok(await page.locator('#hint').inputValue()==='2',topic+' hint floor');
  await page.locator('#review-stage').selectOption('guided');await page.locator('#day-select').selectOption('3');await page.locator('#day-select').selectOption('2');
  await page.reload();await page.locator('#day-select:not([disabled])').waitFor();
  ok(await page.locator('#review-stage').inputValue()==='guided',topic+' stage reload');ok((await page.locator('#reasoning').inputValue()).includes('補上下一個'),topic+' draft reload');
  await page.locator('[data-tab="overview"]').click();await page.locator('[data-tab="today"]').click();ok(await page.locator('#guided-starter').isVisible(),topic+' return retains scaffold');
  await page.setViewportSize({width:390,height:844});await page.locator('.progressive-review').scrollIntoViewIfNeeded();await page.locator('.progressive-review').screenshot({path:`output/playwright/${topic}-guided-mobile.png`});
  await submit();ok(await page.locator('#review-stage').inputValue()==='independent',topic+' guided recommends independent');await page.locator('#review-continue').click();
  const fields=await page.evaluate(async()=>{const map={'structural-analysis':'curriculum.json','reinforced-concrete':'rc-curriculum.json','steel-structures':'steel-curriculum.json','structural-dynamics':'dynamics-curriculum.json','soil-foundations':'soil-curriculum.json'};return (await(await fetch(map[new URL(location.href).searchParams.get('topic')])).json()).days[1].fields;});
  for(const f of fields)await page.locator(`[data-answer="${f.id}"]`).fill(String(f.value));
  await page.locator('#reasoning').fill('隔離測試：閉卷列式、計算與檢核，完整圖形待審閱。');await page.locator('#explanation').fill('模型由題設決定，不能只看數值。');
  // Add editable geometry via the existing drawing tools; check undo/redo and focus.
  await page.locator('.mobile-menu-trigger').nth(3).click();
  await page.locator('[data-prop="template"]').selectOption(topic==='structural-analysis'?'simple':topic==='reinforced-concrete'?'section':topic==='steel-structures'?'hsection':topic==='structural-dynamics'?'plot':'layers');
  await page.locator('[data-action="template"]').click();await page.locator('[data-mobile-action="undo"]').click();await page.locator('[data-mobile-action="redo"]').click();
  await page.locator('#mobile-focus').click();ok(await page.locator('#drawing-focus').evaluate(e=>e.open),topic+' existing focus');await page.locator('#focus-drawing').click();
  await submit();const submitted=(await state()).records.at(-1);ok(submitted.progressive.stage==='independent'&&submitted.assessment.review.assistance===0,topic+' separate independent record');ok(submitted.assessment.status==='submitted',topic+' no mastery claim');ok(submitted.drawing.sheets.workspace.length>0,topic+' drawing retained');
  await page.locator('#review-continue').click();await page.locator('#review-mode').selectOption('advanced');ok(!await page.locator('#recognition-panel').isVisible()&&!await page.locator('#guided-panel').isVisible(),topic+' advanced retains closed-book workspace');
  await page.locator('#reasoning').fill('隔離測試：進階模式提示記錄。');await page.locator('#guide-details>summary').click();await page.locator('[data-hint-level="3"]').click();
  ok(await page.locator('#hint').isDisabled(),topic+' hint is read-only');ok(await page.locator('#hint').inputValue()==='3',topic+' answer cannot be relabeled independent');await submit();ok((await state()).records.at(-1).assessment.review.assistance===3,topic+' aided independent distinguished');
  await page.locator('#review-continue').click();await page.reload();await page.locator('#day-select:not([disabled])').waitFor();
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,740],[844,390]]){
   await page.setViewportSize({width,height});ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),topic+' no overflow '+width);
   if(width===390){await page.locator('.progressive-review').scrollIntoViewIfNeeded();await page.screenshot({path:`output/playwright/${topic}-independent-mobile.png`});}
  }
  // Import old text-only history into the mixed new records, without rewriting the old record.
  const old={id:'legacy-'+topic,day:5,activeMs:1000,reasoning:'舊版原稿',explanation:'',mistake:'',hint:0,errorType:'未判定',values:{},submittedAt:'2026-10-01T00:00:00Z',curriculumVersion:'v0.12.0',assessment:{text:'舊版待審閱',status:'submitted',correct:0,total:0,checks:[]}};
  const before=(await state()).records.length;await page.locator('[data-tab="backup"]').click();await page.locator('#import').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:1,topicId:topic,records:[old],drafts:{}}))});
  ok((await state()).records.length===before+1,topic+' old history imported');ok(JSON.stringify((await state()).records.find(r=>r.id===old.id))===JSON.stringify(old),topic+' old history unchanged');
  await page.locator('#import').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:1,topicId:topic,records:[old],drafts:{}}))});ok((await state()).records.length===before+1,topic+' repeated import deduplicated');
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;await download.saveAs(`output/playwright/${topic}-sandbox-backup.json`);
  await page.locator('[data-tab="history"]').click();ok((await page.locator('#history-list').textContent()).includes('舊版作答'),topic+' old UI remains readable');
  results.push({topic,records:(await state()).records.length,stages:3,viewports:5,legacy:true,advanced:true});
 }
 ok(!errors.length,'browser errors: '+errors.join(';'));return {results,errors};
}

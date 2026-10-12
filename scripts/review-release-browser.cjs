async(page)=>{
 const base='http://127.0.0.1:4194/',topics=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'],results=[],errors=[];
 const ok=(v,m)=>{if(!v)throw Error(m);};
 for(const topic of topics){
  const ctx=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.clock.install();
  const state=()=>p.evaluate(()=>Object.values(localStorage).map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(v=>v?.schemaVersion===1&&v.topicId===new URL(location.href).searchParams.get('topic')));
  const submit=()=>p.locator('#practice-form button[type=submit]').click();
  const work=async()=>{await p.locator('#start').click();await p.clock.fastForward(8*60000+500);await p.locator('#pause').click();};
  try{
   await p.goto(base+'?sandbox=1&topic='+topic+'#today');await p.locator('#day-select:not([disabled])').waitFor();await p.locator('#day-select').selectOption('2');
   ok(await p.locator('#review-mode').inputValue()==='advanced',topic+' default mode');ok(await p.locator('#review-stage').inputValue()==='independent',topic+' default independent');
   ok(await p.locator('#recognition-questions input').count()===0,topic+' no candidate DOM before work');ok(await p.locator('#use-guided').isDisabled(),topic+' recall blocks completion');
   const fields=await p.evaluate(async()=>{const t=await import('./topics.js');return (await(await fetch(t.TOPICS[new URL(location.href).searchParams.get('topic')].curriculum)).json()).days[1].fields;});
   for(const f of fields)await p.locator(`[data-answer="${f.id}"]`).fill(String(f.value));
   await p.locator('#reasoning').fill('隔離驗證：首次閉卷原稿。');await submit();
   const first=(await state()).records[0];ok(first.progressive.stage==='independent'&&first.progressive.assistance===0&&first.hint===0,topic+' unaided first submission');
   ok(first.assessment.correct===fields.length,topic+' numeric checks');ok(await p.locator('#review-count').textContent()==='0',topic+' no automatic review flag');
   await p.locator('#review-continue').click();await work();await p.locator('#use-recognize').click();
   ok(await p.locator('[data-review-question=quantity]').count()===0,topic+' numeric choices hidden before numeric submission');
   await p.locator('#submit-numeric').click();ok(await p.locator('[data-review-question=quantity]').count()===0,topic+' empty numeric submission blocked');
   for(const f of fields)await p.locator(`[data-answer="${f.id}"]`).fill('999');
   await p.locator('#submit-numeric').click();ok(await p.locator('[data-review-question=quantity]').count()===3,topic+' quantity opens only after submission');
   ok(Object.values((await state()).drafts[2].progressive.numericSubmission).every(v=>v==='999'),topic+' original numeric snapshot');
   await p.reload();await p.locator('#day-select:not([disabled])').waitFor();ok(await p.locator('[data-review-question=quantity]').count()===3,topic+' quantity state restored');
   for(const f of fields)await p.locator(`[data-answer="${f.id}"]`).fill(String(f.value));
   for(const q of ['concept','diagram','quantity'])await p.locator(`[data-review-question="${q}"][value="0"]`).check();
   await p.locator('#review-stage').selectOption('independent');await submit();
   const aided=(await state()).records.at(-1);ok(aided.progressive.assistance>=1,topic+' recognition remains assistance');ok(aided.assessment.text.includes('辨識後填入，不計閉卷'),topic+' honest numeric assessment');
   ok(Object.values(aided.progressive.numericSubmission).every(v=>v==='999'),topic+' saved first numeric values immutable');ok(JSON.stringify((await state()).records[0])===JSON.stringify(first),topic+' first record unchanged');
   await p.locator('#review-continue').click();ok(await p.locator('#review-mode').inputValue()==='advanced',topic+' fallback does not change default');
   await work();await p.locator('#use-guided').click();ok(await p.locator('#hint').inputValue()==='2',topic+' guided assistance');await p.locator('#review-stage').selectOption('recognize');ok(await p.locator('#hint').inputValue()==='2',topic+' no assistance decrease');
   // Verify actual rendered text size and aligned enlargement buttons at each width.
   for(const width of [320,390,768,1440]){
    await p.setViewportSize({width,height:1000});
    ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),topic+' no page overflow '+width);
    const metrics=await p.locator('.candidate-diagram text').evaluateAll(es=>es.map(e=>parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a));if(!metrics.length||Math.min(...metrics)<12){await p.screenshot({path:'output/playwright/v0142-label-failure.png'});throw Error(topic+' diagram labels '+width+' '+JSON.stringify(await p.locator('.candidate-diagram text').evaluateAll(es=>es.map(e=>({text:e.textContent,size:getComputedStyle(e).fontSize,scale:e.getScreenCTM().a,svg:e.ownerSVGElement.getBoundingClientRect().width})))));}
    if(width===1440){const boxes=await p.locator('[data-zoom-diagram]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().bottom));ok(Math.max(...boxes)-Math.min(...boxes)<=1,topic+' aligned zoom buttons');}
   }
   await p.setViewportSize({width:390,height:844});await p.locator('.progressive-review').screenshot({path:'output/playwright/v0142-'+topic+'-release-mobile.png'});
   // Enter the check phase; assistance content closes and cannot be reopened via selectors.
   await p.locator('#start').click();await p.clock.fastForward(18*60000);await p.locator('#pause').click();
   ok(!await p.locator('#recognition-panel').isVisible()&&!await p.locator('#guided-panel').isVisible(),topic+' check phase closes assistance panels');
   await p.locator('[data-tab=settings]').click();await p.locator('#pref-review-mode').selectOption('progressive');await p.locator('[data-tab=today]').click();await p.locator('#day-select').selectOption('3');
   ok(await p.locator('#review-mode').inputValue()==='progressive',topic+' explicit saved preference');await p.reload();await p.locator('#day-select:not([disabled])').waitFor();ok(await p.locator('#review-mode').inputValue()==='progressive',topic+' explicit preference reload');
   ok(!await p.locator('#recognition-panel').isVisible()&&!await p.locator('#guided-panel').isVisible(),topic+' recall does not show assistance');
   await p.locator('#start').click();await p.clock.fastForward(3*60000+500);await p.locator('#pause').click();ok(!await p.locator('#recognition-panel').isVisible()&&!await p.locator('#guided-panel').isVisible(),topic+' read does not show assistance');
   results.push({topic,defaultClosedBook:true,noAutomaticReview:true,numericSnapshot:true,quantityGated:true,phases:true,viewports:4,legacyPreference:true});
  }finally{await ctx.close();}
 }
 ok(!errors.length,errors.join(';'));return {results,errors};
}

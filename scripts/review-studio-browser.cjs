async (page) => {
 const root='output/v0160-review',base=page.url().split('/studio/')[0],topics=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
 const result={base,cases:[],flows:[],responsive:[],errors:[]};
 const ok=(value,message)=>{if(!value)throw Error(message);};
 const browser=page.context().browser();
 const key=t=>t==='structural-analysis'?'learning-lab:sandbox:v1':'learning-lab:sandbox:'+t+':v1';
 const getState=(p,t)=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key(t));
 for(const topic of topics){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage();
  p.on('pageerror',e=>result.errors.push(topic+': '+e.message));
  p.on('console',e=>{if(e.type()==='error')result.errors.push(topic+': '+e.text());});
  try{
   await p.goto(base+'/studio/index.html?topic='+topic+'&sandbox=1');await p.locator('#lesson option').last().waitFor({state:'attached'});
   const course=await (await p.request.get(base+'/studio/content/'+topic+'.json')).json();
   for(const l of course.lessons){
    await p.locator('#lesson').selectOption(String(l.day));await p.locator('[data-stage=solve]').click();
    for(const c of l.cases){
     await p.locator('#case').selectOption(c.id);
     ok(await p.locator('#case-prompt').textContent()===c.prompt,'prompt '+c.id);
     ok(await p.locator('[data-field]').count()===c.fields.length,'fields '+c.id);
     await p.locator('#solution summary').click();
     await p.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('#solution-steps li')].map(e=>e.textContent))===JSON.stringify(expected),c.steps,{timeout:10000});
     ok(await p.locator('#problem-diagram svg').count()===1,'diagram '+c.id);
     result.cases.push(c.id);
    }
   }
   for(const width of [375,393,820,1440]){
    await p.setViewportSize({width,height:1000});
    const m=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    ok(m.scroll<=width+1,topic+' overflow '+width);result.responsive.push({topic,...m});
   }
   if(topic==='structural-analysis'){
    await p.setViewportSize({width:1440,height:1000});await p.locator('#lesson').selectOption('18');await p.locator('#case').selectOption(topic+'-d18-v2');
    ok(await p.locator('#problem-diagram').textContent().then(t=>t.includes('向上')),'settlement upwards');
    ok(await p.locator('#problem-diagram line[x1="530"][y1="170"]').count()===1,'settlement retains bilateral support');
    await p.screenshot({path:root+'/review-desktop.png',fullPage:false});
   }
   if(topic==='steel-structures'){
    await p.locator('#lesson').selectOption('20');await p.locator('#case').selectOption(topic+'-d20-v2');
    ok(await p.locator('#problem-diagram line[x1="90"][y1="100"]').count()===1,'plastic left fixed');
    ok(await p.locator('#problem-diagram line[x1="530"][y1="100"]').count()===1,'plastic right fixed');
    await p.locator('#lesson').selectOption('18');await p.locator('#case').selectOption(topic+'-d18-v2');
    ok(await p.locator('#problem-diagram line[x1="130"][y1="35"]').count()===1,'eccentric reversed side');
   }
   if(topic==='structural-dynamics'){
    await p.locator('#lesson').selectOption('22');await p.locator('#case').selectOption(topic+'-d22-v0');
    ok(await p.locator('#problem-diagram line[y1="200"][y2="96"]').count()===1,'one bridge column');
    await p.locator('#case').selectOption(topic+'-d22-v2');
    ok(await p.locator('#problem-diagram line[y1="200"][y2="96"]').count()===2,'two bridge columns');
   }
  } finally {await ctx.close();}
 }
 const ctx=await browser.newContext({viewport:{width:393,height:844}}),p=await ctx.newPage(),t=topics[0];
 try{
  await p.goto(base+'/studio/index.html?topic='+t+'&sandbox=1');await p.locator('#lesson option').last().waitFor({state:'attached'});await p.locator('#direct-solve').click();
  await p.locator('[data-field=s0]').fill('-17.25');await p.locator('[data-stage=reflect]').click();await p.locator('#diagnostic-answer summary').click();await p.locator('[data-stage=solve]').click();
  await p.locator('[data-field=s0]').fill('45');await p.locator('[data-field=s1]').fill('30');await p.locator('#reasoning').fill('隔離測試：首答、訂正及圖解保持分開。');
  await p.locator('#answer-form button[type=submit]').click();
  let s=await getState(p,t);ok(s.records.length===1,'submission saved');const r=s.records[0],w=r.studio.workspaces[r.studio.selected];
  ok(w.firstValues.s0==='-17.25'&&r.values.s0==='45'&&w.hint===2,'diagnostic freezes first answer');
  await p.locator('[data-view=history]').click();await p.locator('#history-list summary').click();
  const history=await p.locator('#history-list').textContent();ok(history.includes('首次數值')&&history.includes('-17.25')&&history.includes('本次提交數值')&&history.includes('45'),'history displays both');
  const noteKey='learning-lab:sandbox:'+t+':practice-notes:v1',notes={feedback:'跨版本補充註記',mistakes:{},reviews:{}};
  await p.evaluate(({k,n})=>localStorage.setItem(k,JSON.stringify(n)),{k:noteKey,n:notes});
  await p.locator('[data-view=backup]').click();const downloading=p.waitForEvent('download');await p.locator('#export').click();const download=await downloading;await download.saveAs(root+'/review-export.json');
  let exportText='';for await(const chunk of await download.createReadStream())exportText+=chunk.toString();const exported=JSON.parse(exportText);ok(exported.localPracticeNotes.feedback===notes.feedback,'canonical notes export');
  const restore=await browser.newContext(),q=await restore.newPage();
  try{
   await q.goto(base+'/studio/index.html?topic='+t+'&sandbox=1');await q.locator('#lesson option').last().waitFor({state:'attached'});await q.locator('[data-view=backup]').click();await q.locator('#import').setInputFiles(root+'/review-export.json');await q.locator('#backup-status').filter({hasText:'已合併'}).waitFor();
   const restored=await getState(q,t);ok(JSON.stringify(restored.records)===JSON.stringify(exported.records),'restored originals');ok(JSON.stringify(restored.drafts[1].studio)===JSON.stringify(exported.drafts[1].studio),'restored workspaces');
   ok(await q.evaluate(k=>JSON.parse(localStorage.getItem(k)).feedback,noteKey)===notes.feedback,'restored notes');
   await q.locator('#import').setInputFiles(root+'/review-export.json');await q.locator('#backup-status').filter({hasText:'已合併'}).waitFor();ok((await getState(q,t)).records.length===1,'dedup');
  }finally{await restore.close();}
  result.flows.push('diagnostic-first-values','history-first-and-final','notes-canonical-export','independent-browser-json-restore','duplicate-import');
  // A previous question snapshot remains intact until its completed original is preserved.
  s=await getState(p,t);const selected=s.drafts[1].studio.selected;s.drafts[1].studio.workspaces[selected].snapshot.prompt+='舊題測試';
  await p.evaluate(({k,s})=>localStorage.setItem(k,JSON.stringify(s)),{k:key(t),s});await p.reload();await p.locator('#lesson option').last().waitFor({state:'attached'});await p.locator('[data-stage=solve]').click();
  ok(await p.locator('#old-case-notice').isVisible(),'old snapshot warning');await p.locator('#use-latest-case').click();ok(!await p.locator('#old-case-notice').isVisible(),'current exercise opens');ok(JSON.stringify((await getState(p,t)).records[0])===JSON.stringify(r),'old record unchanged');result.flows.push('old-question-preservation');
  // Local quota failure must remain an explicit failure, without claiming durable submission.
  await p.locator('[data-field=s0]').fill('45');await p.locator('[data-field=s1]').fill('30');await p.locator('#reasoning').fill('儲存失敗測試');await p.locator('[data-view=backup]').click();await p.locator('[data-view=practice]').click();
  await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Test quota','QuotaExceededError');};});
  await p.locator('#answer-form button[type=submit]').click();ok((await p.locator('#answer-result').textContent()).includes('尚未存入瀏覽器'),'quota honest');ok((await getState(p,t)).records.length===1,'failed submission not persisted');result.flows.push('quota-failure-honesty');
  await p.screenshot({path:root+'/review-mobile.png',fullPage:false});
 }finally{await ctx.close();}
 ok(result.cases.length===750,'all 750');ok(result.errors.length===0,result.errors.join('\n'));
 return {...result,passed:true};
}

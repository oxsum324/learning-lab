async(page)=>{
 const base='http://127.0.0.1:4194/',days={'structural-analysis':[1,2,4,5,8,9,10,11,26,28],'reinforced-concrete':[2,3,6],'steel-structures':[2,6],'structural-dynamics':[2,3,4,6],'soil-foundations':[2,3,10]},topics=Object.keys(days),errors=[],visuals=[],touchResults=[];
 const ok=(v,msg)=>{if(!v)throw Error(msg);};
 page.on('pageerror',e=>errors.push(String(e)));
 for(const topic of topics){
  await page.goto(base+'?sandbox=1&topic='+topic+'#today');await page.locator('#day-select:not([disabled])').waitFor();await page.setViewportSize({width:1440,height:1000});
  for(const day of days[topic]){
   await page.locator('#day-select').selectOption(String(day));await page.locator('#review-stage').selectOption('recognize');
   ok(await page.locator('.image-question svg[role="img"]').count()===3,topic+' '+day+' three real figures');
   const alts=await page.locator('.image-question svg').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));ok(new Set(alts).size===3&&alts.every(t=>t.includes('不按比例')),topic+' '+day+' described diagrams');
   await page.locator('[data-review-question="diagram"]').first().focus();await page.keyboard.press('ArrowDown');ok(await page.locator('[data-review-question="diagram"]:checked').count()===1,topic+' '+day+' native keyboard radio');
   await page.locator('[data-zoom-diagram]').first().click();ok(await page.locator('#candidate-zoom').evaluate(e=>e.open),topic+' '+day+' zoom');await page.keyboard.press('Escape');ok(!await page.locator('#candidate-zoom').evaluate(e=>e.open),topic+' '+day+' zoom Escape');
   await page.locator('#review-stage').selectOption('guided');
   if(await page.locator('#load-scaffold').isEnabled())await page.locator('#load-scaffold').click();
   const geometry=await page.evaluate(topic=>Object.values(localStorage).map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(s=>s?.topicId===topic&&s.schemaVersion===1)?.drafts[Number(document.querySelector('#day-select').value)]?.drawing?.sheets.workspace.length,topic);
   ok(geometry>0,topic+' '+day+' editable geometry');visuals.push({topic,day,geometry});
  }
 }
 // A separate, genuinely touch-enabled context keeps test data isolated from prior workflows.
 const ctx=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const mobile=await ctx.newPage();mobile.on('pageerror',e=>errors.push(String(e)));
 const state=()=>mobile.evaluate(()=>Object.values(localStorage).map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(v=>v?.schemaVersion===1&&v.topicId===new URL(location.href).searchParams.get('topic')));
 try{
  await mobile.goto(base+'?sandbox=1&topic='+topics[0]+'#today');await mobile.locator('#day-select:not([disabled])').waitFor();
  for(const topic of topics){
   if(await mobile.locator('#topic-select').inputValue()!==topic){await mobile.locator('#topic-select').selectOption(topic);await mobile.waitForURL(u=>u.searchParams.get('topic')===topic);await mobile.locator('#day-select:not([disabled])').waitFor();}
   await mobile.locator('#day-select').selectOption('2');await mobile.locator('#review-stage').selectOption('recognize');
   ok(await mobile.locator('[data-review-question="diagram"]:checked').count()===0,topic+' fresh touch image not preselected');
   await mobile.locator('[data-zoom-diagram="diagram-0"]').tap();ok(await mobile.locator('#candidate-zoom').evaluate(e=>e.open),topic+' touch zoom');
   ok(await mobile.locator('[data-review-question="diagram"]:checked').count()===0,topic+' zoom does not select');
   ok(await mobile.locator('#candidate-zoom-content').evaluate(e=>e.scrollWidth>e.clientWidth),topic+' zoom scroll for legible labels');await mobile.locator('#candidate-zoom-close').tap();
   await mobile.locator('.image-option').filter({has:mobile.locator('[value="0"]')}).locator('svg').tap();ok(await mobile.locator('[data-review-question="diagram"][value="0"]').isChecked(),topic+' touch label selects image');
   await mobile.reload();await mobile.locator('#day-select:not([disabled])').waitFor();ok(await mobile.locator('[data-review-question="diagram"][value="0"]').isChecked(),topic+' image selection reload');
   await mobile.locator('#review-stage').selectOption('guided');await mobile.locator('#load-scaffold').tap();await mobile.locator('#reasoning').fill('觸控實測 '+topic+'：保留半成品及本人補完草稿。');
   await mobile.locator('#review-stage').selectOption('independent');ok(await mobile.locator('#hint').inputValue()==='2',topic+' touch assistance retained');await mobile.locator('#review-stage').selectOption('guided');
   const before=(await state()).drafts[2];await mobile.reload();await mobile.locator('#day-select:not([disabled])').waitFor();const after=(await state()).drafts[2];ok(JSON.stringify(before.drawing)===JSON.stringify(after.drawing),topic+' touch geometry reload');ok(after.progressive.scaffoldId===before.progressive.scaffoldId,topic+' scaffold provenance');
   await mobile.locator('[data-tab="overview"]').tap();await mobile.locator('[data-tab="today"]').tap();ok((await mobile.locator('#reasoning').inputValue()).includes(topic),topic+' touch return retains notes');
   await mobile.locator('#answer-workspace').screenshot({path:`output/playwright/v2-${topic}-scaffold-mobile.png`,style:'#session-clock,.mobile-actionbar{visibility:hidden!important}'});
   touchResults.push({topic,radio:true,zoom:true,reload:true,geometry:after.drawing.sheets.workspace.length});
  }
  // Return through the actual subject dropdown to each existing draft, then load old drawing + old draft.
  for(const topic of topics){
   await mobile.locator('#topic-select').selectOption(topic);await mobile.waitForURL(u=>u.searchParams.get('topic')===topic);await mobile.locator('#day-select:not([disabled])').waitFor();
   ok(await mobile.locator('#day-select').inputValue()==='2',topic+' dropdown resumes D02');ok((await mobile.locator('#reasoning').inputValue()).includes(topic),topic+' dropdown saves subject draft');ok(await mobile.locator('#hint').inputValue()==='2',topic+' dropdown retains hint');
   const shape={type:'line',color:'#173c36',x1:100,y1:100,x2:200,y2:100,text:'',bend:75,direction:1,points:[],turn:0},drawing={version:1,sheets:{force:[shape],internal:[],deformed:[]}};
   const raw={activeMs:0,hint:0,errorType:'未判定',values:{},reasoning:'舊圖形與舊草稿 '+topic,explanation:'',mistake:'',drawing};
   const record={...raw,id:'legacy-drawing-'+topic,day:6,submittedAt:'2026-10-01T00:00:00Z',curriculumVersion:'v0.12.0',assessment:{text:'舊圖形待審閱',correct:0,total:0,status:'submitted'}};
   await mobile.locator('[data-tab="backup"]').tap();const fixture={schemaVersion:1,topicId:topic,records:[record],drafts:{6:raw}};
   await mobile.locator('#import').setInputFiles({name:'old-drawing-and-draft.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});ok((await state()).records.some(r=>JSON.stringify(r)===JSON.stringify(record)),topic+' old drawing record unchanged');
   await mobile.locator('[data-tab="today"]').tap();await mobile.locator('#day-select').selectOption('6');ok((await mobile.locator('#reasoning').inputValue()).includes('舊圖形與舊草稿'),topic+' old draft loaded');
   await mobile.reload();await mobile.locator('#day-select:not([disabled])').waitFor();await mobile.locator('#day-select').selectOption('6');ok((await mobile.locator('#reasoning').inputValue()).includes(topic),topic+' old draft reload');
   await mobile.locator('[data-tab="history"]').tap();const card=mobile.locator('.history-item').filter({hasText:'舊圖形待審閱'});await card.locator('summary').tap();await card.locator('svg').waitFor({state:'visible'});ok(await card.locator('svg').count()===1,topic+' old drawing renders');
  }
 }finally{await ctx.close();}
 ok(!errors.length,'page errors '+errors.join(';'));return {visualLessons:visuals,touch:touchResults,dropdownRoundtrips:5,legacyDrawingDraftImports:5,errors};
}

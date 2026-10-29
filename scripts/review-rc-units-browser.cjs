async(page)=>{
 const base=page.url().split('/studio/')[0],topic='reinforced-concrete',key='learning-lab:sandbox:'+topic+':v1',browser=page.context().browser(),result={base,cases:0,flows:[],errors:[]};
 const ok=(v,m)=>{if(!v)throw Error(m);};
 const state=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage();
 p.on('pageerror',e=>result.errors.push(e.message));
 try{
  await p.goto(base+'/studio/index.html?topic='+topic+'&sandbox=1');await p.locator('#lesson option').last().waitFor({state:'attached'});
  const course=await(await p.request.get(base+'/studio/content/'+topic+'.json')).json();
  for(const l of course.lessons){
   await p.locator('#lesson').selectOption(String(l.day));await p.locator('[data-stage=solve]').click();
   ok(!/MPa|kPa/.test(await p.locator('#warmups').textContent()),'warmup units '+l.day);
   for(const c of l.cases){
    await p.locator('#case').selectOption(c.id);await p.locator('#solution summary').click();await p.waitForFunction(expected=>document.querySelectorAll('#solution-steps li').length===expected,c.steps.length);
    const text=await p.locator('#case-prompt,#answer-fields,#solution-steps,#original-problem').allTextContents();ok(!/MPa|kPa|kN/.test(text.join(' ')),'RC current units '+c.id);ok(c.unitSystem==='taiwan-gravity','case unit tag '+c.id);result.cases++;
   }
  }
 }finally{await ctx.close();}
 const fresh=await browser.newContext({viewport:{width:1440,height:1000}}),q=await fresh.newPage();
 try{
  await q.goto(base+'/studio/index.html?topic='+topic+'&sandbox=1');await q.locator('#lesson option').last().waitFor({state:'attached'});await q.locator('#direct-solve').click();
  const course=await(await q.request.get(base+'/studio/content/'+topic+'.json')).json(),c=course.lessons[0].cases[0];
  for(const f of c.fields)await q.locator('[data-field='+f.id+']').fill(String(f.value));
  await q.locator('#reasoning').fill('傳統單位：應力kgf/cm²，面積先換cm²，力矩回報tf·m。');
  await q.locator('#drawing-editor summary').filter({hasText:'更多工具'}).click();await q.locator('#drawing-editor [data-tool=rect]').click();
  const board=q.locator('#drawing-editor .drawing-board svg');await board.scrollIntoViewIfNeeded();const b=await board.boundingBox();await q.mouse.move(b.x+65,b.y+60);await q.mouse.down();await q.mouse.move(b.x+155,b.y+145,{steps:5});await q.mouse.up();
  await q.locator('#answer-form button[type=submit]').click();const before=await state(q),r=before.records[0],work=r.studio.workspaces[r.studio.selected];
  ok(r.assessment.correct===c.fields.length,'traditional numeric assessment');ok(work.snapshot.unitSystem==='taiwan-gravity','traditional snapshot');ok(work.drawing.sheets.workspace.some(s=>s.type==='rect'&&s.x1!==s.x2&&s.y1!==s.y2),'nonzero drawing');
  await q.locator('[data-view=backup]').click();const waiting=q.waitForEvent('download');await q.locator('#export').click();const download=await waiting;await download.saveAs('output/v0161-units/rc-unit-export.json');
  let raw='';for await(const chunk of await download.createReadStream())raw+=chunk.toString();const exported=JSON.parse(raw);
  const other=await browser.newContext(),a=await other.newPage();
  try{await a.goto(base+'/studio/index.html?topic='+topic+'&sandbox=1');await a.locator('#lesson option').last().waitFor({state:'attached'});await a.locator('[data-view=backup]').click();await a.locator('#import').setInputFiles('output/v0161-units/rc-unit-export.json');await a.locator('#backup-status').filter({hasText:'已合併'}).waitFor();const restored=await state(a);ok(JSON.stringify(restored.records)===JSON.stringify(exported.records),'record and nonzero drawing restore');ok(JSON.stringify(restored.drafts[1].studio)===JSON.stringify(exported.drafts[1].studio),'workspace restore');}finally{await other.close();}
  result.flows.push('traditional-numeric-submission','nonzero-rectangle','independent-restore-with-unit-snapshot');
  await q.locator('[data-view=practice]').click();await q.locator('#lesson').selectOption('13');await q.locator('[data-stage=solve]').click();await q.setViewportSize({width:393,height:844});await q.screenshot({path:'output/v0161-units/rc-mobile.png',fullPage:false});
 }finally{await fresh.close();}
 const classic=await browser.newContext(),a=await classic.newPage();
 try{
  await a.goto(base+'/?topic='+topic+'&sandbox=1#today');await a.locator('#day-select:not([disabled])').waitFor();await a.locator('#day-select').selectOption('2');
  const text=await a.locator('#problem').textContent();ok(text.includes('kgf/cm²')&&!/MPa|kN/.test(text),'classic fresh current units');ok((await a.locator('#numeric-fields').textContent()).includes('tf·m'),'classic field units');
  if(await a.locator('#skip-start-level').isVisible())await a.locator('#skip-start-level').click();
  const original=await(await a.request.get(base+'/rc-curriculum.json')).json(),l=original.days[1];
  for(const f of l.fields)await a.locator('[data-answer='+f.id+']').fill(String(f.unit==='kN-m'||f.unit==='kN·m'||f.unit==='kN'?f.value/9.80665:f.value));
  await a.locator('#reasoning').fill('傳統單位隔離驗證。');await a.locator('#practice-form button[type=submit]').click();
  const s=await state(a);ok(s.records.length===1,'classic submit');ok(s.records[0].rcUnitSystem==='kgf-tf-v1','classic unit marker');ok(s.records[0].assessment.correct===l.fields.length,'classic assessment uses matching units');result.flows.push('classic-current-fields-and-assessment');
 }finally{await classic.close();}
 const old={schemaVersion:1,topicId:topic,records:[],drafts:{2:{activeMs:0,reasoning:'舊單位原稿',explanation:'',mistake:'',hint:0,errorType:'未判定',values:{mn:'287.206'},startedAt:'',updatedAt:'2026-10-29T00:00:00.000Z'}}};
 const legacy=await browser.newContext();await legacy.addInitScript(({key,old})=>localStorage.setItem(key,JSON.stringify(old)),{key,old});const o=await legacy.newPage();
 try{await o.goto(base+'/?topic='+topic+'&sandbox=1#today');await o.locator('#day-select:not([disabled])').waitFor();await o.locator('#day-select').selectOption('2');ok((await o.locator('#numeric-note').textContent()).includes('既有草稿'),'legacy unit notice');ok((await o.locator('#problem').textContent()).includes('28 MPa'),'legacy original unit retained');ok(await o.locator('[data-answer=mn]').inputValue()==='287.206','legacy original value retained');result.flows.push('legacy-SI-draft-is-not-relabeled');}finally{await legacy.close();}
 ok(result.cases===150&&result.errors.length===0,'RC review completion');return {...result,passed:true};
}

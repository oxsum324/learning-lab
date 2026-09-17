import {readFileSync} from 'node:fs';
const edits=JSON.parse(readFileSync(new URL('./editorial-review-data.json',import.meta.url),'utf8'));
export function reviewedQuestion(topic,id,text){
 let s=edits.questions[topic]?.[id]??text;
 if(!s)throw Error(`Missing question ${topic}/${id}`);
 s=s.replace(/^.*(?:規範對照：|公式／係數：|骨架來源：).*$/gm,'');
 s=s.replace(/來源骨架：[^。]*。/g,'').replace(/`/g,'');
 if(id==='st_c07')s=s.replace('D07 週測：','');
 if(id==='st_w23b')s=s.replace('拉壓構材設計比','梁柱軸力與彎矩互制');
 if(id==='dy_c06')s=s.replace('無阻尼。','無阻尼，初始位移與速度皆為零。');
 if(id==='dy_c07')s=s.replace('列出 m x¨+c x˙+kx=-m ug¨','由平衡推導相對座標運動方程');
 if(id==='dy_c05')s=s.replace('是否位於精確共振點','是否等於自然頻率；說明有阻尼時位移幅值峰值與 ωn 不必完全重合');
 if(id==='so_c04')s=s.replace('並判斷水流方向','並說明水由高總水頭流向低總水頭；本題未標示實際方位');
 if(id==='so_c05')s=s.replace('Q=kH(Nf/Nd)','q=kH(Nf/Nd)（單位寬流量，m³/s/m）').replace('求 Q、ic、FS，並判斷有無題設砂湧風險','求 q、ic、FS，以 FS=1 比較理想臨界狀態；未提供規範容許門檻，不作合規判定');
 if(topic==='reinforced-concrete'){
  if(id==='rc_core_01')s=s.replace('b=300、d=500','b=300 mm、d=500 mm');
  if(id==='rc_core_02')s=s.replace('be=900、bw=300、hf=100、d=600','be=900 mm、bw=300 mm、hf=100 mm、d=600 mm');
  if(id==='rc_core_03')s=s.replace('d=500、s=150','d=500 mm、s=150 mm');
  if(id==='rc_core_05')s=s.replace('控制機制為 P-Δ 放大','控制機制為題設二階彎矩放大');
 }
 return s.replace(/\n{3,}/g,'\n\n').trim();
}
export function addReviewedFields(values,topic){
 if(topic==='soil-foundations')values.set('so_review_cu',[
  {id:'so_review_cu_sigma1',label:'CU 總大主應力',value:250,unit:'kPa'},
  {id:'so_review_cu_sigma1_eff',label:'CU 有效大主應力',value:210,unit:'kPa'},
  {id:'so_review_cu_sigma3_eff',label:'CU 有效小主應力',value:60,unit:'kPa'}
 ]);
}
export function applyEditorialReview(course,topic){
 for(const day of course.days){
  const change=edits.days[topic]?.[day.day]??{};
  const oldBase=day.problem.split('\n\n---\n\n本日核對短題（先完成，再填下方欄位）')[0];
  const originalActivity=oldBase.match(/^今日核心任務：([^\n]*)/)?.[1]?.replace(/。$/,'');
  const activity=change.activity??day.activity??originalActivity??day.task;
  day.activity=activity;day.check=change.check??day.check;
  if(change.task){day.task=change.task;day.read=change.task;}
  if(topic==='structural-analysis')continue;
  const marker='本日核對短題（先完成，再填下方欄位）';
  const seeds=day.problem.includes(marker)?day.problem.split(marker).slice(1).join(marker).trim():'';
  const exam=day.day>=24&&day.day<=27;
  const review=[28,29,30].includes(day.day);
  // Keep supplied questions, concept exercises, selected-source tasks and exam tasks explicit.
  if(change.problem)day.problem=change.problem;
  else if(day.day!==1){
   let source;
   if(seeds)source='依下列條件作答；公式及係數採題設模型。';
   else if(exam)source='題源：展開「題目備註與來源」中的114年官方原卷，按本課題號閱讀完整條件與原圖。25分鐘作答，5分鐘檢查。';
   else if(review)source='題源：選自己的已作答原稿，抄明題號與完整條件後閉卷重做；尚無紀錄時先選一題同主題教材題並記下來源。';
   else if(/算|求|讀值|代入|設計一|資料/.test(activity))source='題源：本課為教材自選題。先記錄教材、頁碼、題號與完整條件，再作答；資料不全時列出缺項，該項數值練習記為未完成。';
   else source='本日以圖解與短答為主；各項說明需對應模型、條件或具體機制。';
   day.problem=seeds?`${source}\n\n---\n\n${marker}\n\n${seeds}`:`今日任務：${activity}。\n驗收：${day.check}。\n${source}`;
  }
  if(day.guide){
   day.guide.draw=day.guide.draw.map(s=>s.replace('三張圖紙可自行加圖名，分別保存模型、分析過程與結果；使用文字、箭頭、曲線或自由筆作答。','在同頁畫布標示模型、分析過程與結果；依題型選分區，也可使用自由畫布。'));
   if(day.day!==1){
    day.guide.worked=[`作答入口：${activity}。`,seeds?'使用本頁明列的條件與題設模型；先畫圖、標單位及正方向，再列式。':exam?'由原卷完整條件起式；題型摘要不能代替原圖與載重。':'先抄明選定模型的完整條件；資料不足就列缺項，不自行補設有利條件。',`核對重點：${day.check}。`,day.fields.length?'數值欄位核對指定量；圖形、推導與適用條件需另行審閱。':'本課沒有固定數值核對；請用題源解答或教練審閱檢查完整作答。'];
    if(change.problem)day.guide.worked[1]='八項逐一留下公式、圖解或短答；計算題先抄明原題條件，避免以回憶的答案代替重算。';
    day.guide.draw=[`本課圖解：${activity}。`,'在圖上標示已知條件、單位與所求量；逐項對照本日驗收要求。'];
   }
   if(change.plain)day.guide.plain=change.plain;
   day.guide.plain=day.guide.plain.replace('還要隔天再試一次','本次仍須自行重建模型與方程').replace('還需要隔幾天再做一次','仍須有獨立作答證據').replace('卡住的地方正好指出下一輪該補什麼','卡住的地方就是本次需要記錄的弱項');
  }
  for(const field of day.fields){
   const labels={st_c07_mn:'梁名義彎矩強度 Mn',st_c07_design_strength:'梁設計彎矩強度 φbMn',st_w23b_axial_ratio:'梁柱軸力比',st_w23b_moment_ratio:'梁柱彎矩比',st_w23b_interaction:'梁柱題設互制比'};
   field.label=labels[field.id]??field.label;
   if(field.id==='dy_c04_damping_ratio'){field.unit='無因次';field.label='阻尼比 ζ';}
   if(field.id==='so_c05_discharge'){field.unit='m³/s/m';field.label='每單位寬度滲流量 q';}
  }
  if(topic==='structural-dynamics'&&day.day===23)day.fields=day.fields.filter(f=>f.id!=='r');
 }
 course.version=topic+'-2026-09-v4';
 return course;
}

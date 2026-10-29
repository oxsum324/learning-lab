import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {MODELS,evaluate,invert} from '../site/studio/models.js';
import {TOPICS} from '../site/topics.js';
import {curriculumHash} from './curriculum-hash.mjs';
import {rcUnit,rcText} from '../site/rc-units.js';
const map={
 'structural-analysis':['udl','point','stability','udl','truss','frame','udl','cantilever','beam-deflection','cantilever','point-deflection','truss-displacement','beam-deflection','point-deflection','propped','force-flexibility','propped','settlement','propped','propped','propped','joint','joint','influence','two-loads','axial','axial','beam-deflection','propped','joint'],
 'reinforced-concrete':['rc-flexure','rc-flexure','tbeam','rc-column','magnify','rc-shear','rc-flexure','torsion','development','development','service','slab','punch','punch','punch','capacity','rc-column','rc-shear','prestress','loss','prestress-range','rc-shear','prestress','punch','capacity','torsion','prestress-range','tbeam','magnify','prestress'],
 'steel-structures':['asdlrfd','h-section','asdlrfd','steel-tension','block','buckling','steel-tension','torsional','classification','steel-bending','ltb','steel-shear','interaction','buckling','bolt','bolt','weld','eccentric','weld','plastic','fatigue','capacity','interaction','steel-bending','steel-tension','ltb','plastic','classification','interaction','steel-tension'],
 'structural-dynamics':['period','period','free','damping','harmonic','impulse','free','spectrum','two-dof','two-dof','rayleigh','modal','srss','srss','newmark','spectrum','base-shear','drift','modal','capacity','interaction','bridge','isolation','base-shear','two-dof','rayleigh','capacity','bridge','damping','base-shear'],
 'soil-foundations':['phase','phase','effective','darcy','seepage','compaction','effective','stress-increment','oc-consolidation','consolidation-time','mohr','triaxial','triaxial','consolidation','bearing','footing-eccentric','pile','pile-group','earth','wall','uplift','slope','liquefaction','bearing','oc-consolidation','earth','stress-increment','elastic-settlement','seepage','pile-group']
};
const fmt=x=>Number(x.toPrecision(7)).toString();
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const names=['課題完整練習','改參數','改條件','反算／設計','判錯訂正'];
const source={kind:'authored-specified-model',label:'自編、明示題設模型；非官方原卷詳解',reference:'本題公式、邊界與題給係數均列於題設及核對步驟。'};
const lessonNotes=JSON.parse(fs.readFileSync(new URL('./studio-lesson-notes.json',import.meta.url),'utf8'));
const wrong={
 udl:'簡支梁最大彎矩為 qL²/4。',point:'A、B 的鉛直反力均為 P/2。',stability:'任何平面剛架只要算 r−3 就得到總靜不定次數。',truss:'每根斜桿各承擔 P/sinθ。',cantilever:'自由端位移為 PL³/(6EI)。','beam-deflection':'簡支梁跨中撓度為 qL⁴/(384EI)。',axial:'兩根相同桿並聯的總勁度是單桿的一半。',propped:'支承懸臂的 B 反力一律為 qL/2。',settlement:'B 支承向下沉陷一定增加向上反力。',joint:'節點外加力矩不需考慮右側桿勁度，全部由左桿承擔。',influence:'A 反力影響線在 x 位置的縱距是 x/L。','rc-flexure':'名義彎矩可直接用 As fy d，不必扣掉壓力合力作用點。','rc-column':'混凝土面積用 Ag，再加鋼筋面積 Ast 的受力。',magnify:'二階放大係數精確等於 1+P/Pcr。','rc-shear':'題給 Av 是雙肢有效面積，計算時仍應再除以二。',torsion:'扭矩 T 用 kN·m，面積 Ao 用 mm²，直接相除即得 N/mm。',development:'鋼筋均勻黏結平衡可用鋼筋面積乘埋入長度當黏結面積。',service:'服務撓度一律採未開裂毛斷面 EI，與題給有效勁度無關。',slab:'面載重 kN/m² 直接代線載重公式，不需要宣告板帶寬。',punch:'Vu 用 kN 除以 bo、d 的 mm²，結果數字就是 MPa。',capacity:'容量剪力只須計一端可能彎矩除以淨跨度。',prestress:'偏心預力造成上下緣應力都增加 Pe/Z。',loss:'後續損失以即時損失後為基準，仍可直接以 P0(1−ri−rl) 精確計算。','steel-tension':'毛斷面降伏通過就不必計淨斷面斷裂。',block:'拉斷面也應乘剪切係數 0.6。',buckling:'有效長度加倍時 Euler 臨界力也加倍。','steel-bending':'塑性彎矩為 Fy S，彈性降伏彎矩為 Fy Z。',ltb:'有無中間側向支撐都可用相同 Lb。','steel-shear':'腹板 Aw 用整個 H 斷面毛面積即可。',interaction:'Pu 與 Mu 可直接相加再和 Pc 比較。',bolt:'同一支栓由單剪改雙剪，可用剪力不變。',weld:'等腳角銲有效喉厚就是銲腳長 w。',eccentric:'兩個正交剪力分量的合力等於其絕對值直接相加。',plastic:'兩端固定梁只要跨中出現一個塑性鉸就已形成崩塌機構。',fatigue:'疲勞應力範圍永遠等於最大拉應力，不需要最小值。',period:'題給質量單位一致時，週期是 2π√(k/m)。',free:'初速度項不用除 ωn 就可當成位移振幅。',damping:'同方向峰值相隔兩週期時 δ=ln(x1/x2)。',harmonic:'穩態動位移振幅永遠等於靜位移 F0/k。',impulse:'脈衝量 I 的單位是 kN，可直接當靜力。',spectrum:'擬位移譜 Sd=Sa/ωn。','two-dof':'兩層等質量、等層勁度的兩個頻率都等於 √(k/m)。',rayleigh:'Rayleigh 的 α 與 β 均無因次。',modal:'有效振態質量一律等於兩層總質量。',srss:'SRSS 就是 R1+R2。',newmark:'平均加速度法位移增量中的加速度項只乘 Δt。','base-shear':'每層側力必定是 V/樓層數。',drift:'層間位移可直接取屋頂總位移。',isolation:'隔震位移處恢復力不需要知道有效勁度。',phase:'含水量等於 S e，不需除土粒比重。',effective:'有效應力等於總應力加孔隙水壓。',darcy:'水力坡降 i 就是水頭差 Δh，無需除以長度。','layer-k':'垂直串聯滲流也用透水係數的算術平均。',seepage:'砂湧安全係數為實際坡降除以臨界坡降。',compaction:'壓實度可用現地濕單位重直接除以最大乾單位重。','stress-increment':'Boussinesq 式分母 R 的次方可由五改成二。',consolidation:'Cc 以 e–log10 定義，公式仍可直接使用 ln 不作換算。','consolidation-time':'雙面排水的最長排水距離就是整個土層厚。',mohr:'有效強度參數應搭配總正應力，孔壓不影響強度。',triaxial:'只對 σ1 扣除 u，σ3 保持總應力即可。',bearing:'算出 qult 後就可以直接作為容許支承力。','footing-eccentric':'即使算得 qmin<0，土壤仍可以線性承受拉應力。',pile:'負摩擦可當向上抗力加到樁端容量。','pile-group':'群樁效率不影響群樁容量。',earth:'主動、被動土壓的係數相同。',wall:'有效法向力不須扣掉底面上舉力。',uplift:'上舉力等於水頭乘面積，不須乘水單位重。',slope:'順坡飽和滲流不會改變乾燥無凝聚力邊坡的安全係數。',liquefaction:'抗液化安全係數等於 CSR/(CRR·MSF)。','truss-displacement':'單位力法只用實際桿力 N，不需要單位荷重產生的 n。','point-deflection':'跨中單位力法積分只須算半跨，不需補另一半跨。','force-flexibility':'端點相容式可直接把柔度 f 改成勁度 k 而單位不變。',tbeam:'等值壓力塊超出翼板厚時仍可把整個深度都當成翼板寬。','prestress-range':'只要下緣壓應力小於限值，上緣是否受拉不必檢查。','h-section':'腹板面積可用 h tw，再加兩片完整翼板，不會重複。',asdlrfd:'LRFD 可用強度應用 Rn/φ。',classification:'寬厚比用 t/b，越大表示板越細長。',torsional:'純扭轉挫屈式可直接代替所有非對稱柱的彎扭耦合式。',bridge:'橋柱側向勁度等於 EA/L。','oc-consolidation':'即使跨先期壓密壓力，整段沉陷仍可一律用 Cc。','elastic-settlement':'土模數用 MPa 的數字可直接配合 kPa 淨壓力。'
};
wrong.frame='L 形折架的向下端力，對基底力矩應用豎桿高度 h 作力臂。';
wrong['two-loads']='兩個不同位置的集中力，對 A 反力的影響線縱距都取 1/2。';
wrong['rc-capacity']=wrong.capacity;
map['reinforced-concrete']=map['reinforced-concrete'].map(id=>id==='capacity'?'rc-capacity':id);
for(const id of map['reinforced-concrete'])wrong[id]=rcText(wrong[id]);
fs.mkdirSync('site/studio/content',{recursive:true});
const baseline={},coverage=[];
const lockedBaseline=JSON.parse(fs.readFileSync('docs/studio-content-canonical-baseline.json'));
for(const [topic,t] of Object.entries(TOPICS)){
 const raw=fs.readFileSync('site/'+t.curriculum),course=JSON.parse(raw);baseline[t.curriculum]=curriculumHash(raw);if(lockedBaseline[t.curriculum]!==baseline[t.curriculum])throw Error('原課表與鎖定基準不同，請先審查變更：'+t.curriculum);
 const lessons=course.days.map(day=>{
  const id=map[topic][day.day-1],model=MODELS[id];if(!model||!wrong[id])throw Error('缺模型或判錯題 '+id);
  const params=Object.fromEntries(model.vars.map(q=>[q.symbol,q.value]));
  // Per-day authored instances stay within the declared branch. Counts remain integers.
  if(id!=='stability')params[model.vars[0].symbol]*=1+(day.day-1)*.02;
  if(topic==='reinforced-concrete'&&day.day===28)params.As=5600;
  const base=evaluate(id,params),cases=names.map((type,index)=>{
   const p={...params};let condition=index===2;
   if(index===1)p[model.vars[0].symbol]=id==='stability'?p.r+1:p[model.vars[0].symbol]*(id==='buckling'?.9:1.15);
   const results=evaluate(id,p,condition);if(results.some(r=>!Number.isFinite(r.value)))throw Error('非有限答案 '+id);
   const inverse=index===3,target=results[0];
   const unknown=inverse?model.vars.find(v=>{const a=evaluate(id,{...p,[v.symbol]:p[v.symbol]*.9999})[0].value,b=evaluate(id,{...p,[v.symbol]:p[v.symbol]*1.0001})[0].value;return Math.abs(a-b)>1e-8*Math.max(1,Math.abs(target.value));}):model.vars[0];
   if(!unknown)throw Error('無法唯一反算 '+id);let wanted=results;
   const given=model.vars.filter(v=>!inverse||v.symbol!==unknown.symbol).map(v=>`${v.label} ${v.symbol}＝${fmt(p[v.symbol])} ${v.unit}`);
   let task=inverse?`已量得／指定 ${target.label}＝${fmt(target.value)} ${target.unit}，反算 ${unknown.label} ${unknown.symbol}，並回代驗證。`:`求 ${results.map(r=>r.label+'（'+r.unit+'）').join('、')}，保留模型、代入與單位。`;
   if(inverse){const solved=invert(id,p,target.value,false,unknown.symbol);if(Math.abs(solved-p[unknown.symbol])>1e-6*Math.max(1,p[unknown.symbol]))throw Error('反算驗證失敗 '+id);wanted=[{label:unknown.label,value:solved,unit:unknown.unit,formula:`由 ${target.formula} 反解 ${unknown.symbol}`}];}
   if(index===4)task=`某份解答寫道：「${wrong[id]}」請指出錯誤及原因，畫出正確模型，並重新完成以下計算：`+task;
   const mechanics=[];
   if(['rc-flexure','tbeam'].includes(id)){
    const a=results[1].value,c=a/p.beta1,es=p.ecu*(p.d-c)/c,ey=p.fy/p.Es;
    if(!(a>0&&a<p.d&&es>=ey))throw Error('受拉鋼筋降伏假設不成立 '+topic+' D'+day.day+' v'+index);
    mechanics.push(`應變相容驗核：c=a/β1＝${fmt(c)} mm；εs=εcu(d−c)/c＝${fmt(es)} ≥ εy=fy/Es＝${fmt(ey)}，本題可採鋼筋已降伏的假設。`);
   }
   if(id==='pile'&&condition)mechanics.push(results[0].value<0?'端承扣除負摩擦的有號餘額為負，表示抵抗缺額，無可加外壓力；不是負的承載容量。':'此值為端承扣除負摩擦後的有號餘額，尚未套用設計安全係數，不直接視為容許載重。');
   const steps=[`列出已知並統一單位：${given.join('；')}。`,...(condition?[`本組條件覆寫：${model.change}其餘已知維持題給值。`]:[]),model.formula,...results.map(r=>`${r.formula} → ${r.label}＝${fmt(r.value)} ${r.unit}。`),...mechanics,...(inverse?[`反解得 ${unknown.symbol}＝${fmt(wanted[0].value)} ${unknown.unit}；以原關係式回代，${target.label}＝${fmt(target.value)} ${target.unit}。`]:[]),...(index===4?[`錯因核對：${model.pitfall}`]:[]),'檢查量綱、邊界條件與受力方向；數值一致仍需審閱推導及圖解。'];
   const text=`${model.title}｜${type}\n${model.assumptions}\n${given.join('；')}。\n${condition?model.change+'\n':''}${task}`;
   return {id:`${topic}-d${String(day.day).padStart(2,'0')}-v${index}`,version:1,contentRevision:topic==='reinforced-concrete'?3:2,...(model.unitSystem?{unitSystem:model.unitSystem}:{}),type,index,model:id,condition,params:p,unknown:inverse?unknown.symbol:null,target:inverse?target:null,title:model.title,prompt:text,fields:wanted.map((r,i)=>({id:'s'+i,label:r.label,value:r.value,unit:r.unit,...(/靜不定計數|外部反力分量數|塑性鉸總數/.test(r.label)?{integer:true}:{})})),steps,plain:`先把「${model.title}」的已知與邊界說清楚，再用題設關係求 ${wanted[0].label}。${model.pitfall} 這裡只核對本題明示模型；完整工程設計還需其他檢核。`,drawing:{kind:model.kind,labels:given,task:'先畫題給幾何、受力方向及座標，再補內力、變形或應力分布；示意不按比例。'},source,digest:hash({id,p,condition,results})};
  });
  const cond=evaluate(id,params,true)[0].value,answerDirection=cond>base[0].value+1e-9?'增加':cond<base[0].value-1e-9?'減少':'不變';
  const unit=base[0].unit||'無因次';const units=[...new Set([unit,'kN','kN·m','m','MPa','無因次'].map(u=>topic==='reinforced-concrete'?rcUnit(u):u))].slice(0,4);
  const otherModels=Object.values(MODELS).filter(m=>m.id!==id).map(m=>m.solve(Object.fromEntries(m.vars.map(v=>[v.symbol,v.value])),false)[0].formula).filter(f=>f!==base[0].formula);
  const warmups=[{id:'unit',prompt:`「${base[0].label}」依本題應使用哪個單位？`,options:units,answer:unit,explanation:`依定義及一致單位，本題用 ${unit}；勿只看結果數字。`},{id:'relation',prompt:`求「${base[0].label}」應先採用哪條關係？`,options:[base[0].formula,...otherModels.slice(day.day%8,day.day%8+2)],answer:base[0].formula,explanation:model.formula},{id:'condition',prompt:`依題設「${model.change}」，主要結果的有號數值會如何變化？`,options:['增加','減少','不變'],answer:answerDirection,explanation:`原情境 ${fmt(base[0].value)} ${base[0].unit}；改變情境 ${fmt(cond)} ${base[0].unit}。${model.formula}`}];
  coverage.push({topic,day:day.day,model:id,cases:cases.length,warmups:3,originalHash:hash(day),focus:day.task});
  const note=lessonNotes[topic]?.[day.day];
  return {day:day.day,focus:day.task,original:day,cases,warmups,diagnostic:{claim:wrong[id],explanation:model.pitfall},...(note?{originalReference:note.reference}:{}),scope:'原課題全文及來源保留。新增題組為本課考點的明示模型演練；不等同官方原卷逐題詳解，也不涵蓋本課所有規範分支。'+(note?' '+note.scope:'')};
 });
 fs.writeFileSync(`site/studio/content/${topic}.json`,JSON.stringify({version:'studio-content-1',topic,name:t.name,references:course.sources??[],lessons})+'\n');
}
fs.writeFileSync('docs/studio-content-coverage.json',JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify({lessons:coverage.length,cases:coverage.reduce((n,r)=>n+r.cases,0),warmups:450,models:Object.keys(MODELS).length}));

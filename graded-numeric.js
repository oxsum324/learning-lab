// D02 variants use explicitly stated lesson models, not a design-code compliance check.
import {rcDisplay,rcUnit} from './rc-units.js?v=0.16.1';
const TOPICS=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
const PARAMETER_AXES={
 'structural-analysis':{L:[6,8,10],ratio:[.2,.3,.4],P:[10,12,15,20]},
 'reinforced-concrete':{b:[300,350],d:[500,550],As:[1000,1200,1500],fc:[28,35],fy:[420],Es:[200000]},
 'steel-structures':{H:[300,350,400],bf:[150,180,200],tw:[8,10],tf:[12,16]},
 'structural-dynamics':{m:[800,1000,1200,1600],k:[320000,400000,600000,800000]},
 'soil-foundations':{Gs:[2.6,2.65,2.7],e:[.5,.6,.7],w:[.1,.12,.15],gw:[9.81]}
};
// 112 年版（113 年勘誤）表 22.2.2.4.3，使用 MPa；不外推至 fc < 17。
export function concreteBeta1(fc){
 if(!Number.isFinite(fc)||fc<17)throw Error('混凝土強度須為至少 17 MPa 的有限數值');
 return fc<=28?.85:fc>=56?.65:.85-.05*(fc-28)/7;
}
const betaLabel=beta=>beta.toFixed(6).replace(/(\.\d{2}\d*?)0+$/,'$1');
function modelParameters(topic,p){
 const parameters={...p};
 if(topic==='structural-analysis'&&parameters.ratio!==undefined){parameters.a=parameters.L*parameters.ratio;delete parameters.ratio;}
 if(topic==='reinforced-concrete')parameters.beta=Number(concreteBeta1(parameters.fc).toPrecision(12));
 return parameters;
}
// Exhaustive finite domains for content audits; every call returns fresh objects.
export function numericParameterSets(topic){
 const axes=PARAMETER_AXES[topic];if(!axes)throw Error('未提供此科變式');
 return Object.entries(axes).reduce((sets,[key,values])=>sets.flatMap(p=>values.map(value=>({...p,[key]:value}))),[{}]).map(p=>modelParameters(topic,p));
}
function hash(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
function generator(seed){let x=hash(seed);return values=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return values[x%values.length];};}
const positive=p=>Object.values(p).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0);
export function numericModel(topic,p){
 if(!TOPICS.includes(topic)||!positive(p))throw Error('參數或科目無效');
 let value,wrong,unit,fieldLabel,prompt,model,worked,check;
 if(topic==='structural-analysis'){
  const {L,a,P}=p;if(!(a<L))throw Error('荷重點須在兩支承之間');
  value=P*(L-a)/L;wrong=[P*a/L,P/2];if(Math.abs(a-L/2)<1e-8)throw Error('本變式須為偏心荷重');
  unit='kN';fieldLabel='A 支承向上反力';model='偏心集中力簡支梁';
  prompt=`簡支梁 A 為鉸支承、B 為水平面滾支承；跨度 ${L} m，向下集中力 ${P} kN 距 A ${a} m。求 A 支承向上反力（kN）。`;
  worked=`對 B 點取矩：RA×${L}=${P}×(${L}−${a})，RA=${value.toFixed(4)} kN。`;
  check=P-P*a/L;
 }else if(topic==='reinforced-concrete'){
  const {b,d,As,fc,fy,Es}=p,beta=concreteBeta1(fc),a=As*fy/(.85*fc*b),c=a/beta,epsilonT=.003*(d-c)/c;
  if(p.beta!==undefined&&Math.abs(p.beta-beta)>1e-10)throw Error('題設 β1 與混凝土強度不一致');
  if(!(a<d&&epsilonT>fy/Es&&epsilonT>=.005))throw Error('參數超出本題拉力筋降伏及延性假設範圍');
  value=As*fy*(d-a/2)/1e6;wrong=[As*fy*d/1e6,As*fy*(d-a)/1e6];
  unit='kN·m';fieldLabel='名義彎矩 Mn';model='矩形梁題設壓力塊';
  prompt=`單筋矩形梁 b=${b} mm、d=${d} mm、As=${As} mm²、f'c=${fc} MPa、fy=${fy} MPa、Es=${Es} MPa。題設壓力塊應力 0.85f'c；依建築物混凝土結構設計規範表 22.2.2.4.3，β1=${betaLabel(beta)}。極限壓應變 0.003，拉力筋降伏；求名義彎矩 Mn（kN·m），不乘強度折減因數。`;
  worked=`a=As fy/(0.85f'c b)=${a.toFixed(4)} mm；β1=${betaLabel(beta)}，c=a/β1=${c.toFixed(4)} mm，εt=0.003(d−c)/c=${epsilonT.toFixed(6)}，大於降伏應變 fy/Es=${(fy/Es).toFixed(6)}，且符合本題 εt≥0.005 的參數篩選條件。Mn=As fy(d−a/2)/10⁶=${value.toFixed(4)} kN·m；此處僅計算題設斷面的名義彎矩。`;
  const q=.85*fc*b;check=q*(d*a-a*a/2)/1e6;
 }else if(topic==='steel-structures'){
  const {H,bf,tw,tf}=p;if(!(2*tf<H&&tw<bf))throw Error('斷面尺寸不成立');
  const h=H-2*tf,A=2*bf*tf+tw*h,I=(bf*H**3-(bf-tw)*h**3)/12;
  value=Math.sqrt(I/A);wrong=[Math.sqrt(I/(bf*H)),Math.sqrt(I/A)/Math.sqrt(2)];
  unit='mm';fieldLabel='強軸迴轉半徑 rx';model='對稱焊接 H 形幾何';
  prompt=`忽略銲道及圓角的對稱焊接 H 形斷面：總高 H=${H} mm、翼板寬 bf=${bf} mm、腹板厚 tw=${tw} mm、翼板厚 tf=${tf} mm。求通過斷面中心、平行翼板的強軸迴轉半徑 rx（mm）。`;
  worked=`A=${A} mm²；Ix=${I.toFixed(4)} mm⁴；rx=√(Ix/A)=${value.toFixed(4)} mm。`;
  const split=tw*h**3/12+2*(bf*tf**3/12+bf*tf*((H-tf)/2)**2);check=Math.sqrt(split/A);
 }else if(topic==='structural-dynamics'){
  const {m,k}=p;value=2*Math.PI*Math.sqrt(m/k);wrong=[Math.sqrt(m/k),2*Math.PI*Math.sqrt(k/m)];
  unit='s';fieldLabel='自然週期 Tn';model='線彈性單自由度無阻尼自然週期';
  prompt=`線彈性單自由度系統質量 m=${m} kg、勁度 k=${k} N/m。求無阻尼自然週期 Tn（s）；質量已用 kg 表示，不需再除重力加速度。`;
  worked=`ωn=√(k/m)=${Math.sqrt(k/m).toFixed(4)} rad/s；Tn=2π/ωn=${value.toFixed(6)} s。`;
  check=2*Math.PI/Math.sqrt(k/m);
 }else{
  const {Gs,e,w,gw}=p;if(w*Gs/e>1)throw Error('含水量與孔隙比使飽和度超過一');
  value=Gs*gw/(1+e);wrong=[Gs*gw, value*(1+w)];unit='kN/m³';fieldLabel='乾單位重 γd';model='土壤三相關係';
  prompt=`土粒比重 Gs=${Gs}、孔隙比 e=${e}、含水量 w=${(w*100).toFixed(0)}%、水單位重 γw=${gw} kN/m³。求乾單位重 γd（kN/m³）。`;
  worked=`取固體體積 1 m³，固體重 Gsγw=${(Gs*gw).toFixed(4)} kN，總體積 1+e=${1+e} m³；γd=${value.toFixed(4)} kN/m³。`;
  const Vs=2,Ws=Gs*gw*Vs,Vv=e*Vs;check=Ws/(Vs+Vv);
 }
 if(!Number.isFinite(value)||value<=0||Math.abs(value-check)>1e-9*Math.max(1,value))throw Error('模型交叉檢查不一致');
 const values=[value,...wrong].map(x=>Number(x.toPrecision(7)));
 if(values.some((x,i)=>i&&Math.abs(x-values[0])<=Math.max(1e-6,.01*Math.abs(values[0])))||new Set(values).size!==3)throw Error('候選數值發生碰撞');
 return {value,values,check,unit,fieldLabel,prompt,model,worked};
}
export function numericQuestion(topic,seed,options={}){
 const pick=generator(topic+':'+seed);let p;
 const axes=PARAMETER_AXES[topic];if(!axes)throw Error('未提供此科變式');
 // Constant axes consume no random draw, preserving the original seed mapping.
 p=modelParameters(topic,Object.fromEntries(Object.entries(axes).map(([key,values])=>[key,values.length===1?values[0]:pick(values)])));
 return numericQuestionFromParameters(topic,p,seed,options);
}
export function numericQuestionFromParameters(topic,parameters,seed='parameter-set',options={}){
 // Parameters stay SI; version 3 correct/options/tolerance use the stated display unit.
 const p=modelParameters(topic,parameters);
 const si=numericModel(topic,p),traditional=topic==='reinforced-concrete'&&options.rcUnits!=='si';
 let r=si;
 if(traditional){
  const {b,d,As,fc,fy,Es}=p,beta=concreteBeta1(fc),a=As*fy/(.85*fc*b),c=a/beta,epsilonT=.003*(d-c)/c;
  const display=value=>Number(value.toPrecision(10)),stress=value=>display(rcDisplay(value,'MPa'));
  r={...si,value:rcDisplay(si.value,'kN·m'),values:si.values.map(value=>Number(rcDisplay(value,'kN·m').toPrecision(7))),unit:rcUnit('kN·m'),
   prompt:`單筋矩形梁 b=${b} mm、d=${d} mm、As=${As} mm²、f'c=${stress(fc)} kgf/cm²、fy=${stress(fy)} kgf/cm²、Es=${stress(Es)} kgf/cm²。題設壓力塊應力 0.85f'c；依建築物混凝土結構設計規範表 22.2.2.4.3，β1=${betaLabel(beta)}。極限壓應變 0.003，拉力筋降伏；求名義彎矩 Mn（tf·m），不乘強度折減因數。面積及長度保留 mm 制，應力採 kgf/cm²；計算合力時面積需由 mm² 換成 cm²。`,
   worked:`a=As fy/(0.85f'c b)=${a.toFixed(4)} mm（壓、拉力的面積換算因子 1/100 相消）；β1=${betaLabel(beta)}，c=a/β1=${c.toFixed(4)} mm，εt=0.003(d−c)/c=${epsilonT.toFixed(6)}，大於降伏應變 fy/Es=${(fy/Es).toFixed(6)}，且符合本題 εt≥0.005 的參數篩選條件。以 fy 的 kgf/cm² 數值計，T=As fy/100 kgf；Mn=T(d−a/2)/10⁶=As fy(d−a/2)/10⁸=${rcDisplay(si.value,'kN·m').toFixed(6)} tf·m。β1 與應變篩選先按原強度的標準單位精確核算，顯示換算不改變內部參數；此處僅計算題設斷面的名義彎矩。`};
 }
 const labels={
  'structural-analysis':['滿足對 B 點力矩平衡。','把 A 與 B 的力臂顛倒。','偏心荷重不應把兩端反力直接平分。'],
  'reinforced-concrete':['採壓拉合力間的力臂。','漏掉壓力合力作用位置的 a/2。','將壓力合力錯置於壓力塊底部。'],
  'steel-structures':['使用實際面積及中心強軸慣性矩。','用外接矩形面積取代 H 形實際面積。','錯把慣性矩多除以二。'],
  'structural-dynamics':['週期為圓頻率的 2π 倍倒數。','漏乘 2π。','把週期與圓頻率的關係顛倒。'],
  'soil-foundations':['分母包含固體與孔隙體積。','漏計孔隙體積。','算成含水重量的濕單位重。']
 };
 return {id:`${topic}-d02-numeric-${hash(seed).toString(36)}${traditional?'-tf':''}`,version:topic==='reinforced-concrete'?(traditional?3:2):1,topic,day:2,level:3,type:'single',skill:'數值與單位',model:r.model,numeric:true,assistance:topic==='reinforced-concrete'?2:1,source:{kind:'specified-model',label:'本課明示題設模型',locator:topic==='reinforced-concrete'?'D02 變式；β1 依 112 年版建築物混凝土結構設計規範（113 年勘誤）表 22.2.2.4.3，第 22-3 頁；其餘模型假設見題幹'+(traditional?'；題面採 kgf/cm²、tf·m，內部參數仍為原標準單位':'；保留舊稿原單位'):'D02 變式；模型假設見題幹'},prompt:r.prompt,options:r.values.map((v,i)=>({id:['a','b','c'][i],text:`${v} ${r.unit}`,reason:labels[topic][i]})),answer:'a',explanation:r.worked,numericMeta:{parameters:p,seed:String(seed),unit:r.unit,correct:r.value,tolerance:Math.max(1e-6,.01*Math.abs(r.value)),fieldLabel:r.fieldLabel}};
}

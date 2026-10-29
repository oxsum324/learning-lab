// Original sources and mechanics stay SI; current RC answer fields use Taiwan gravity units.
const GRAVITY=9.80665;
const STRESS=0.0980665;
const units={
 MPa:['kgf/cm²',1/STRESS],
 'N/mm²':['kgf/cm²',1/STRESS],
 'N/mm2':['kgf/cm²',1/STRESS],
 kPa:['tf/m²',1/GRAVITY],
 'kN/m²':['tf/m²',1/GRAVITY],
 'kN/m2':['tf/m²',1/GRAVITY],
 kN:['tf',1/GRAVITY],
 'kN·m':['tf·m',1/GRAVITY],
 'kN-m':['tf·m',1/GRAVITY],
 'kN·m/m':['tf·m/m',1/GRAVITY],
 'kN-m/m':['tf·m/m',1/GRAVITY],
 'kN/m':['tf/m',1/GRAVITY],
 'kN·m²':['tf·m²',1/GRAVITY],
 'kN·m2':['tf·m²',1/GRAVITY],
 'kN-m²':['tf·m²',1/GRAVITY],
 'kN-m2':['tf·m²',1/GRAVITY],
 'N/mm':['kgf/cm',10/GRAVITY],
 'N·mm':['kgf·cm',1/(GRAVITY*10)],
 'N-mm':['kgf·cm',1/(GRAVITY*10)],
 N:['kgf',1/GRAVITY]
};
export function rcUnit(unit){return units[unit]?.[0]??unit;}
function finite(value){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError('單位換算需要有限數值');return value;}
export function rcDisplay(value,siUnit){return finite(value)*(units[siUnit]?.[1]??1);}
export function rcCanonical(value,siUnit){return finite(value)/(units[siUnit]?.[1]??1);}
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const unitPattern=Object.keys(units).sort((a,b)=>b.length-a.length).map(esc).join('|');
const number='[+＋−\\-±]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?(?:[eE][+−\\-]?\\d+)?';
const quantities=new RegExp(`(${number}(?:\\s*[、，]\\s*${number})*)\\s*(${unitPattern})(?![A-Za-z0-9/²³⁴·])`,'g');
const barePattern=Object.keys(units).filter(k=>k!=='N').sort((a,b)=>b.length-a.length).map(esc).join('|');
const bareUnits=new RegExp(`(^|[^A-Za-z])(${barePattern})(?![A-Za-z0-9/²³⁴·])`,'g');
const unitRule='傳統制代入約定：應力用 kgf/cm²；幾何仍以 mm、mm² 提供時，代入應力乘面積或力臂公式前先將 mm÷10→cm、mm²÷100→cm²。所得力為 kgf、力矩為 kgf·cm，分別÷1000→tf、÷100000→tf·m；若全程採 tf、m，應力應先換為 tf/m²（1 kgf/cm²＝10 tf/m²），再與 m 制幾何配套。計得面積若為 cm²，乘100回報 mm²；若為 m²，乘1000000回報 mm²。';
function convertedNumber(raw,unit){
 const prefix=/^[+＋−±]/.exec(raw)?.[0]??'';
 const value=Number(raw.replace(/,/g,'').replace(/^[+＋−±]/,'').replace(/−/g,'-'));
 const negative=prefix==='−'||raw.startsWith('-');
 const n=rcDisplay(value,unit);
 return (negative?'−':prefix==='±'?'±':prefix==='+'||prefix==='＋'?'+':'')+Number(Math.abs(n).toPrecision(10)).toString();
}
export function rcText(text){
 if(typeof text!=='string')return text;
 let result=text.replace(quantities,(_,numbers,unit)=>numbers.split(/([、，])/).map(part=>/[、，]/.test(part)?part:convertedNumber(part.trim(),unit)).join('')+' '+rcUnit(unit));
 // Unit labels without a directly preceding numeric value are also display labels.
 result=result.replace(bareUnits,(_,prefix,unit)=>prefix+rcUnit(unit));
 // This SI square-root coefficient is dimensional; changing fc alone is invalid.
 result=result.replace(/0\.33\s*√\s*(?:\(\s*)?(f[′']?c)(?:\s*\))?\s*(b[0o₀])\s*d/g,(_,fc,b)=>`1.053788857√${fc} ${b}d（本式 ${fc} 用 kgf/cm²，${b}、d 用 cm，Vc 得 kgf，再÷1000 得 tf）`);
 return result;
}
const identityKeys=new Set(['id','topic','topicId','url','href','curriculum','digest','kind','sourceFile']);
function visit(value,key=''){
 if(typeof value==='string')return identityKeys.has(key)?value:rcText(value);
 if(Array.isArray(value))return value.map(item=>visit(item,key));
 if(!value||typeof value!=='object')return value;
 const result={};
 const measured=typeof value.value==='number'&&typeof value.unit==='string';
 for(const[k,v]of Object.entries(value)){
  if(measured&&k==='value')result[k]=rcDisplay(v,value.unit);
  else if(k==='unit'&&typeof v==='string')result[k]=rcUnit(v);
  else result[k]=visit(v,k);
 }
 return result;
}
export function rcLegacyDay(day){
 const result=visit(day);
 if(typeof result.problem==='string'&&!result.problem.includes('傳統制代入約定：'))result.problem+='\n\n'+unitRule;
 return result;
}
export function rcLegacyCourse(course){
 const result=visit(course);
 if(Array.isArray(result.days))result.days=result.days.map(rcLegacyDay);
 return result;
}

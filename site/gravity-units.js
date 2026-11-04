// Shared display boundary for Taiwan gravity units. Sources and mechanics stay SI; each subject supplies its own table.
export const GRAVITY=9.80665;
export const STRESS=0.0980665;
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const number='[+＋−\\-±]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?(?:[eE][+−\\-]?\\d+)?';
const identityKeys=new Set(['id','topic','topicId','url','href','curriculum','digest','kind','sourceFile']);
const RULE_MARK='傳統制代入約定：';
function finite(value){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError('單位換算需要有限數值');return value;}
export function createGravityUnits({units,rule,digits=10,patches=[],bareExclude=['N']}){
 const unit=u=>units[u]?.[0]??u;
 const display=(value,siUnit)=>finite(value)*(units[siUnit]?.[1]??1);
 const canonical=(value,siUnit)=>finite(value)/(units[siUnit]?.[1]??1);
 const unitPattern=Object.keys(units).sort((a,b)=>b.length-a.length).map(esc).join('|');
 const quantities=new RegExp(`(${number}(?:\\s*[、，]\\s*${number})*)\\s*(${unitPattern})(?![A-Za-z0-9/²³⁴·])`,'g');
 const barePattern=Object.keys(units).filter(k=>!bareExclude.includes(k)).sort((a,b)=>b.length-a.length).map(esc).join('|');
 const bareUnits=new RegExp(`(^|[^A-Za-z])(${barePattern})(?![A-Za-z0-9/²³⁴·])`,'g');
 function convertedNumber(raw,u){
  const prefix=/^[+＋−±]/.exec(raw)?.[0]??'';
  const value=Number(raw.replace(/,/g,'').replace(/^[+＋−±]/,'').replace(/−/g,'-'));
  const negative=prefix==='−'||raw.startsWith('-');
  const n=display(value,u);
  return (negative?'−':prefix==='±'?'±':prefix==='+'||prefix==='＋'?'+':'')+Number(Math.abs(n).toPrecision(digits)).toString();
 }
 function text(value){
  if(typeof value!=='string')return value;
  let result=value.replace(quantities,(_,numbers,u)=>numbers.split(/([、，])/).map(part=>/[、，]/.test(part)?part:convertedNumber(part.trim(),u)).join('')+' '+unit(u));
  // Unit labels without a directly preceding numeric value are also display labels.
  result=result.replace(bareUnits,(_,prefix,u)=>prefix+unit(u));
  for(const [pattern,replacement] of patches)result=result.replace(pattern,replacement);
  return result;
 }
 function visit(value,key=''){
  if(typeof value==='string')return identityKeys.has(key)?value:text(value);
  if(Array.isArray(value))return value.map(item=>visit(item,key));
  if(!value||typeof value!=='object')return value;
  const result={};
  const measured=typeof value.value==='number'&&typeof value.unit==='string';
  for(const[k,v]of Object.entries(value)){
   if(measured&&k==='value')result[k]=display(v,value.unit);
   else if(k==='unit'&&typeof v==='string')result[k]=unit(v);
   else result[k]=visit(v,k);
  }
  return result;
 }
 function legacyDay(day){
  const result=visit(day);
  if(typeof result.problem==='string'&&!result.problem.includes(RULE_MARK))result.problem+='\n\n'+RULE_MARK+rule;
  return result;
 }
 function legacyCourse(course){
  const result=visit(course);
  if(Array.isArray(result.days))result.days=result.days.map(legacyDay);
  return result;
 }
 return {unit,display,canonical,text,legacyDay,legacyCourse};
}

// Original sources and mechanics stay SI; current RC answer fields use Taiwan gravity units.
import {createGravityUnits,GRAVITY,STRESS} from './gravity-units.js?v=0.16.2';
const rc=createGravityUnits({
 units:{
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
 },
 rule:'應力用 kgf/cm²；幾何仍以 mm、mm² 提供時，代入應力乘面積或力臂公式前先將 mm÷10→cm、mm²÷100→cm²。所得力為 kgf、力矩為 kgf·cm，分別÷1000→tf、÷100000→tf·m；若全程採 tf、m，應力應先換為 tf/m²（1 kgf/cm²＝10 tf/m²），再與 m 制幾何配套。計得面積若為 cm²，乘100回報 mm²；若為 m²，乘1000000回報 mm²。',
 // This SI square-root coefficient is dimensional; changing fc alone is invalid.
 patches:[[/0\.33\s*√\s*(?:\(\s*)?(f[′']?c)(?:\s*\))?\s*(b[0o₀])\s*d/g,(_,fc,b)=>`1.053788857√${fc} ${b}d（本式 ${fc} 用 kgf/cm²，${b}、d 用 cm，Vc 得 kgf，再÷1000 得 tf）`]]
});
export const rcUnit=rc.unit;
export const rcDisplay=rc.display;
export const rcCanonical=rc.canonical;
export const rcText=rc.text;
export const rcLegacyDay=rc.legacyDay;
export const rcLegacyCourse=rc.legacyCourse;

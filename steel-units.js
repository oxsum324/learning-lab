// Steel sources and mechanics stay SI. Drafts marked tf-cm2-v1 show tf, tf/cm² and tf·m with mm geometry (steelText);
// current lessons and studio cases follow the exam papers: tf, tf/cm², tf·m with section properties and member lengths in cm.
import {createGravityUnits,GRAVITY,STRESS} from './gravity-units.js?v=0.16.3';
export const STEEL_STRESS=STRESS*1000;// 1 tf/cm² = 98.0665 MPa
const TF_CM2=1/STEEL_STRESS,TF=1/GRAVITY;
const steel=createGravityUnits({
 units:{
  MPa:['tf/cm²',TF_CM2],
  'N/mm²':['tf/cm²',TF_CM2],
  'N/mm2':['tf/cm²',TF_CM2],
  GPa:['tf/cm²',1000*TF_CM2],
  kPa:['tf/m²',TF],
  'kN/m²':['tf/m²',TF],
  'kN/m2':['tf/m²',TF],
  kN:['tf',TF],
  'kN·m':['tf·m',TF],
  'kN-m':['tf·m',TF],
  'kN/m':['tf/m',TF],
  'kN·m²':['tf·m²',TF],
  'kN·m2':['tf·m²',TF],
  'kN-m²':['tf·m²',TF],
  'kN-m2':['tf·m²',TF],
  'N·mm²':['tf·cm²',TF/1e5],
  'N-mm²':['tf·cm²',TF/1e5],
  'N·mm2':['tf·cm²',TF/1e5],
  'N·mm⁴':['tf·cm⁴',TF/1e7],
  'N-mm⁴':['tf·cm⁴',TF/1e7],
  'N·mm4':['tf·cm⁴',TF/1e7],
  'N·mm':['tf·cm',TF/1e5],
  'N-mm':['tf·cm',TF/1e5],
  N:['kgf',TF]
 },
 digits:6,
 rule:'應力與彈性模數用 tf/cm²，力用 tf，彎矩用 tf·m（換算以標準重力 9.80665 為準）。幾何仍以 mm、mm² 提供時，應力乘面積前先將 mm²÷100→cm²，所得力即為 tf；力乘 mm 力臂得 tf·mm，÷1000→tf·m。Fy/E、KL/r、λc 等比值不因單位改變；慣性矩、斷面模數與迴轉半徑仍以 mm⁴、mm³、mm 回報。'
});
export const steelUnit=steel.unit;
export const steelDisplay=steel.display;
export const steelCanonical=steel.canonical;
export const steelText=steel.text;
export const steelLegacyDay=steel.legacyDay;
export const steelLegacyCourse=steel.legacyCourse;
// Exam papers tabulate A, I, S, Z, r and member lengths in cm; shape designations, plate thickness and weld legs stay mm.
const GEOMETRY={mm:['cm',.1],'mm²':['cm²',.01],mm2:['cm²',.01],'mm³':['cm³',1e-3],mm3:['cm³',1e-3],'mm⁴':['cm⁴',1e-4],mm4:['cm⁴',1e-4]};
export function steelExamUnit(unit,keepMm=false){return !keepMm&&GEOMETRY[unit]?GEOMETRY[unit][0]:steel.unit(unit);}
export function steelExamDisplay(value,unit,keepMm=false){return !keepMm&&GEOMETRY[unit]?value*GEOMETRY[unit][1]:steel.display(value,unit);}
export function steelExamCanonical(value,unit,keepMm=false){return !keepMm&&GEOMETRY[unit]?value/GEOMETRY[unit][1]:steel.canonical(value,unit);}

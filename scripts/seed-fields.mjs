import {existsSync,readFileSync} from 'node:fs';

const numeric=/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i;
const excludedFieldId=/(?:^|_)(?:score|pass|flag|mode|region)$/;
const answerSection=/^## .*核對(?:欄位與驗算紀錄|答案與驗算紀錄)\s*$/m;
function defaultField(id,value,unit,label){return {id,label:label||'數值核對',value:Number(value),unit:unit.trim()||'無因次'};}
function questionTitles(markdown){
 const titles=new Map();
 for(const match of markdown.matchAll(/^#{3,4}\s+([A-Z][A-Z0-9_]*)\s*[｜|]\s*(.+)$/gm))titles.set(match[1].toLowerCase(),match[2].trim());
 return titles;
}
function keepField(field){return !excludedFieldId.test(field.id);}
function answerTable(markdown){
 const start=markdown.search(answerSection);
 if(start<0)throw Error('Missing verification table.');
 const rest=markdown.slice(start+3),next=rest.search(/^## /m);
 return next<0?markdown.slice(start):markdown.slice(start,start+3+next);
}
function addFields(values,questionId,fields){
 const approved=fields.filter(keepField),all=[...(values.get(questionId)??[]),...approved];
 if(all.length>6)throw Error(`Too many numeric checks: ${questionId}`);
 if(all.length)values.set(questionId,all);
}
function parseTable(markdown){
 const values=new Map(),answer=answerTable(markdown);
 const titles=questionTitles(markdown);
 for(const row of answer.split(/\r?\n/).filter(line=>line.startsWith('|'))){
  const cells=row.split('|').map(cell=>cell.trim()),questionId=cells[1]?.toLowerCase();
  if(questionId==='id'||!/^[a-z][a-z0-9_]*$/.test(questionId??''))continue;
  const fields=[];
  const tableIds=[...(cells[2]??'').matchAll(/`([a-z][a-z0-9_]*)`/g)].map(match=>match[1]),tableValues=(cells[3]??'').split('；').map(value=>value.trim()),tableUnits=(cells[4]??'').split('；').map(unit=>unit.trim());
  if(tableIds.length){
   let ordinal=(values.get(questionId)?.length??0);
   tableIds.forEach((id,index)=>{
    const value=tableValues[index];
    if(!numeric.test(value??''))return;
    ordinal+=1;const title=titles.get(questionId)??'數值核對';
    fields.push(defaultField(id,value,tableUnits[index]??tableUnits[0]??'',`${title}（第${ordinal}項）`));
   });
  }
  for(const match of row.matchAll(/`([a-z][a-z0-9_]*)`／([^／|]+)／([-+]?\d+(?:\.\d+)?)／([^；|]+)/g))fields.push({id:match[1],label:match[2].trim(),value:Number(match[3]),unit:match[4].trim()});
  let ordinal=0;
  for(const match of row.matchAll(/`([a-z][a-z0-9_]*)\s*=\s*([^\s`;]+)\s*([^`;|\n]*)`/g))if(numeric.test(match[2])){
   ordinal+=1;const title=titles.get(questionId)??'數值核對';
   fields.push(defaultField(match[1],match[2],match[3],`${title}（第${ordinal}項）`));
  }
  addFields(values,questionId,fields);
 }
 return values;
}
function applyCorrections(values,markdown){
 const start=markdown.search(/^## 平台核對覆寫\s*$/m);
 if(start<0)throw Error('Missing correction table.');
 for(const row of markdown.slice(start).split(/\r?\n/).filter(line=>line.startsWith('|'))){
  const cells=row.split('|').map(cell=>cell.trim()),questionId=cells[1]?.toLowerCase();
  if(questionId==='id'||!/^[a-z][a-z0-9_]*$/.test(questionId??''))continue;
  const fields=[];
  for(const match of row.matchAll(/`([a-z][a-z0-9_]*)`／([^／|]+)／([-+]?\d+(?:\.\d+)?)／([^；|]+)/g))fields.push({id:match[1],label:match[2].trim(),value:Number(match[3]),unit:match[4].trim()});
  const approved=fields.filter(keepField);
  if(!approved.length||approved.length>6)throw Error(`Invalid correction: ${questionId}`);
  values.set(questionId,approved);
 }
 return values;
}
export function readSeedFields(bankPath,correctionPath){
 const values=parseTable(readFileSync(bankPath,'utf8'));
 if(correctionPath&&existsSync(correctionPath))applyCorrections(values,readFileSync(correctionPath,'utf8'));
 return values;
}
export function fieldsForIds(values,ids,context='seed checks'){
 const fields=ids.flatMap(id=>values.get(id)??[]);
 if(new Set(fields.map(field=>field.id)).size!==fields.length)throw Error(`${context} has duplicate numeric check IDs.`);
 return fields;
}
export function fieldsForDay(values,topicId,day){
 const n=String(day).padStart(2,'0');
 const prefixes={
  'structural-analysis':['st_core_','st_week_'],
  'reinforced-concrete':['rc_core_','rc_week_'],
  'steel-structures':['st_c','st_w'],
  'structural-dynamics':['dy_c','dy_w'],
  'soil-foundations':['so_c','so_w']
 }[topicId];
 if(!prefixes)throw Error('Unsupported topic: '+topicId);
 const ids=[prefixes[0]+n];if(day===7||day===14||day===23)ids.push(prefixes[1]+n+'a',prefixes[1]+n+'b');
 return fieldsForIds(values,ids,`${topicId} D${n}`);
}

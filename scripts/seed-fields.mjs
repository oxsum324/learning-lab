import {existsSync,readFileSync} from 'node:fs';

const numeric=/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i;
function defaultField(id,value,unit){return {id,label:`核對值：${id}`,value:Number(value),unit:unit.trim()||'無因次'};}
function parseTable(markdown){
 const values=new Map(),answerStart=markdown.search(/^## 核對(?:欄位與驗算紀錄|答案與驗算紀錄)\s*$/m);
 if(answerStart<0)throw Error('Missing verification table.');
 for(const row of markdown.slice(answerStart).split(/\r?\n/).filter(line=>line.startsWith('|'))){
  const cells=row.split('|').map(cell=>cell.trim()),questionId=cells[1]?.toLowerCase();
  if(questionId==='id'||!/^[a-z][a-z0-9_]*$/.test(questionId??''))continue;
  const fields=[];
  for(const match of row.matchAll(/`([a-z][a-z0-9_]*)`／([^／|]+)／([-+]?\d+(?:\.\d+)?)／([^；|]+)/g))fields.push({id:match[1],label:match[2].trim(),value:Number(match[3]),unit:match[4].trim()});
  for(const match of row.matchAll(/`([a-z][a-z0-9_]*)\s*=\s*([^\s`;]+)\s*([^`;|\n]*)`/g))if(numeric.test(match[2]))fields.push(defaultField(match[1],match[2],match[3]));
  if(fields.length>6)throw Error(`Too many numeric checks: ${questionId}`);
  if(fields.length)values.set(questionId,fields);
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
  if(!fields.length||fields.length>6)throw Error(`Invalid correction: ${questionId}`);
  values.set(questionId,fields);
 }
 return values;
}
export function readSeedFields(bankPath,correctionPath){
 const values=parseTable(readFileSync(bankPath,'utf8'));
 if(correctionPath&&existsSync(correctionPath))applyCorrections(values,readFileSync(correctionPath,'utf8'));
 return values;
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
 const fields=ids.flatMap(id=>values.get(id)??[]);
 if(new Set(fields.map(field=>field.id)).size!==fields.length)throw Error(`${topicId} D${n} has duplicate numeric check IDs.`);
 return fields;
}

import {readFileSync,writeFileSync} from 'node:fs';
import {fieldsForIds,readSeedFields} from './seed-fields.mjs';
import {seedDay} from './seed-day-map.mjs';
import {reviewedQuestion,addReviewedFields,applyEditorialReview} from './course-editorial.mjs';
import {structuralDailyProblem} from './structural-daily-questions.mjs';

// This local build step reads the approved Markdown banks.  The public JSON only
// receives numeric checks and scoped daily questions; reference answers remain separate.
const workspace=new URL('../../',import.meta.url);
const configs=[
 {topicId:'structural-analysis',bank:'結構學/題庫與核對答案.md',fieldBank:'結構學/平台啟用核對欄位.md',curriculum:'site/curriculum.json'},
 {topicId:'reinforced-concrete',bank:'鋼筋混凝土/題庫與核對答案.md',curriculum:'site/rc-curriculum.json'},
 {topicId:'steel-structures',bank:'鋼結構/題庫與核對答案.md',curriculum:'site/steel-curriculum.json'},
 {topicId:'structural-dynamics',bank:'耐震設計及結構動力/題庫與核對答案.md',curriculum:'site/dynamics-curriculum.json'},
 {topicId:'soil-foundations',bank:'土壤力學及大地工程/題庫與核對答案.md',curriculum:'site/soil-curriculum.json'}
];
const sourcePath=path=>new URL(path,workspace);
const publicPath=path=>new URL('../'+path,import.meta.url);
function parseQuestions(markdown){
 const questions=new Map(),end=markdown.search(/^## .*核對(?:欄位|答案).*$/m);
 if(end<0)throw Error('Missing question/answer boundary.');
 const questionPart=markdown.slice(0,end);
 for(const match of questionPart.matchAll(/^#{3,4}\s+([^\n]+)\n([\s\S]*?)(?=^#{1,4}\s|(?![\s\S]))/gm)){
  const id=(match[2].match(/ID：`([a-z][a-z0-9_]*)`/)?.[1]??match[1].match(/^\s*([A-Z][A-Z0-9_]*)\s*[｜|]/)?.[1])?.toLowerCase();
  if(!id)continue;
  const body=match[2].replace(/\s*核對欄位：[^\n]*(?:\n|$)/g,'\n').trim();
  if(body&&!questions.has(id))questions.set(id,`${match[1].trim()}\n${body}`);
 }
 for(const match of questionPart.matchAll(/^- \*\*(W\d+[a-z]?)\*\*：([^\n]+)/gmi)){
  const id=match[1].toLowerCase();if(!questions.has(id))questions.set(id,`**${match[1]}**：${match[2].trim()}`);
 }
 return questions;
}
for(const config of configs){
 const markdown=readFileSync(sourcePath(config.bank),'utf8');
 const values=readSeedFields(sourcePath(config.fieldBank??config.bank)),questions=parseQuestions(markdown),course=JSON.parse(readFileSync(publicPath(config.curriculum),'utf8'));
 if((course.topicId??config.topicId)!==config.topicId||course.days.length!==30)throw Error('Invalid curriculum: '+config.curriculum);
 addReviewedFields(values,config.topicId);
 course.days.forEach((day,index)=>{
  const mapping=seedDay(config.topicId,index+1),fields=fieldsForIds(values,mapping.fields,`${config.topicId} D${String(index+1).padStart(2,'0')}`);
  day.fields=fields;
  if(config.topicId==='structural-analysis'){day.problem=structuralDailyProblem(day.day,fields.length>0);return;}
  // Display today's exercise number; source IDs stay in the map and saved values.
  const seedQuestions=mapping.questions.map((id,i)=>reviewedQuestion(config.topicId,id,questions.get(id)).replace(/^[^\n]*[｜|]/,`D${String(day.day).padStart(2,'0')}-${String.fromCharCode(65+i)}｜`));
  day.problem=day.problem.split('\n\n---\n\n本日核對短題（先完成，再填下方欄位）')[0];
  if(seedQuestions.length)day.problem+=`\n\n---\n\n本日核對短題（先完成，再填下方欄位）\n\n${seedQuestions.join('\n\n')}`;
 });
 applyEditorialReview(course,config.topicId);
 writeFileSync(publicPath(config.curriculum),JSON.stringify(course,null,2)+'\n');
 console.log(`${config.topicId}: ${course.days.filter(day=>day.fields.length).length} days received numeric checks.`);
}

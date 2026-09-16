import {readFileSync,writeFileSync} from 'node:fs';
import {fieldsForDay,readSeedFields} from './seed-fields.mjs';

// This local build step reads the approved Markdown banks.  The public JSON only
// receives numeric checks; reference answers remain in the Markdown verification section.
const workspace=new URL('../../',import.meta.url);
const configs=[
 {topicId:'structural-analysis',bank:'結構學/題庫與核對答案_v2.md',correction:'結構學/題庫勘誤_2026-09-16.md',curriculum:'site/curriculum.json',core:'st_core_',week:'st_week_'},
 {topicId:'reinforced-concrete',bank:'鋼筋混凝土/題庫與核對答案.md',correction:'鋼筋混凝土/題庫勘誤_2026-09-16.md',curriculum:'site/rc-curriculum.json',core:'rc_core_',week:'rc_week_'},
 {topicId:'steel-structures',bank:'鋼結構/題庫與核對答案.md',curriculum:'site/steel-curriculum.json',core:'st_c',week:'st_w'},
 {topicId:'structural-dynamics',bank:'耐震設計及結構動力/題庫與核對答案.md',correction:'耐震設計及結構動力/題庫勘誤_2026-09-16.md',curriculum:'site/dynamics-curriculum.json',core:'dy_c',week:'dy_w'},
 {topicId:'soil-foundations',bank:'土壤力學及大地工程/題庫與核對答案.md',curriculum:'site/soil-curriculum.json',core:'so_c',week:'so_w'}
];
const sourcePath=path=>new URL(path,workspace);
const publicPath=path=>new URL('../'+path,import.meta.url);
function parseQuestions(markdown){
 const questions=new Map(),questionPart=markdown.slice(0,markdown.search(/^## 核對(?:欄位與驗算紀錄|答案與驗算紀錄)\s*$/m));
 for(const match of questionPart.matchAll(/^#{3,4}\s+([^\n]+)\n([\s\S]*?)(?=^#{3,4}\s|(?![\s\S]))/gm)){
  const id=(match[2].match(/ID：`([a-z][a-z0-9_]*)`/)?.[1]??match[2].match(/核對欄位：`([a-z][a-z0-9_]*)`/)?.[1])?.toLowerCase();
  if(!id)continue;
  const body=match[2].replace(/\s*核對欄位：[^\n]*(?:\n|$)/g,'\n').trim();
  if(body)questions.set(id,`${match[1].trim()}\n${body}`);
 }
 return questions;
}
function dayIds(config,day){
 const number=String(day).padStart(2,'0');
 const core=`${config.core}${number}`;
 const result=[core];
 if(day===7||day===14||day===23){result.push(`${config.week}${number}a`,`${config.week}${number}b`);}
 return result;
}
for(const config of configs){
 const markdown=readFileSync(sourcePath(config.bank),'utf8');
 const values=readSeedFields(sourcePath(config.bank),config.correction&&sourcePath(config.correction)),questions=parseQuestions(markdown),course=JSON.parse(readFileSync(publicPath(config.curriculum),'utf8'));
 if((course.topicId??config.topicId)!==config.topicId||course.days.length!==30)throw Error('Invalid curriculum: '+config.curriculum);
 course.days.forEach((day,index)=>{
  const ids=dayIds(config,index+1),fields=fieldsForDay(values,config.topicId,index+1);
  day.fields=fields;
  const seedQuestions=ids.map(id=>questions.get(id)).filter(Boolean);
  day.problem=day.problem.split('\n\n---\n\n本日核對短題（先完成，再填下方欄位）')[0];
  if(seedQuestions.length)day.problem+=`\n\n---\n\n本日核對短題（先完成，再填下方欄位）\n\n${seedQuestions.join('\n\n')}`;
 });
 writeFileSync(publicPath(config.curriculum),JSON.stringify(course,null,2)+'\n');
 console.log(`${config.topicId}: ${course.days.filter(day=>day.fields.length).length} days received numeric checks.`);
}

import {readFileSync,readdirSync} from 'node:fs';
import {join,extname,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parse} from 'acorn';
import {fixtureFile} from './generate-traditional-fixture.mjs';
import {QUESTION_BANK} from '../site/graded-bank.js';
import {GUIDES} from '../site/teaching-guides.js';
import {REVIEW_CONTENT} from '../site/review-content.js';
import {TOPICS} from '../site/topics.js';
import * as numeric from '../site/graded-numeric.js';

const fixture=JSON.parse(readFileSync(fixtureFile,'utf8'));
const flagged=new Set(fixture.flaggedCharacters);
// These are editorial decisions for this curriculum, not single-character bans.
export const phraseRules=[
 {from:'污染',to:'汙染',reason:'本教材採台灣編輯用字'},
 {from:'水占有',to:'水佔有',reason:'三相比例表示水所佔體積'},
 {from:'占有的比例',to:'佔有的比例',reason:'體積比例語境'},
];
export function scanTraditional(text,label='text'){
 const issues=[];let offset=0;
 for(const character of text){
  if(flagged.has(character))issues.push({label,offset,kind:'character',text:character});
  offset+=character.length;
 }
 for(const rule of phraseRules){
  let position=text.indexOf(rule.from);
  while(position>=0){issues.push({label,offset:position,kind:'phrase',text:rule.from,suggestion:rule.to});position=text.indexOf(rule.from,position+rule.from.length);}
 }
 return issues;
}
export function objectFragments(value,label){
 if(typeof value==='string')return [{label,text:value}];
 if(!value||typeof value!=='object')return [];
 return Object.entries(value).flatMap(([key,entry])=>objectFragments(entry,`${label}.${key}`));
}
export function javascriptFragments(source,label='script'){
 const root=parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true}),fragments=[];
 function visit(node){
  if(!node||typeof node!=='object')return;
  if(node.type==='Literal'&&typeof node.value==='string')fragments.push({label:`${label}:${node.loc.start.line}`,text:node.value});
  if(node.type==='TemplateElement')fragments.push({label:`${label}:${node.loc.start.line}`,text:node.value.cooked??node.value.raw});
  // Regex literals are AST Literal objects with a RegExp value, not prose.
  for(const [key,value] of Object.entries(node)){
   if(key==='loc'||key==='value'||key==='regex')continue;
   if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);
  }
 }
 visit(root);return fragments;
}
function decodeEntities(text){
 return text.replace(/&#(x[\da-f]+|\d+);/gi,(_,code)=>{
  const point=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);
  return point<=0x10ffff?String.fromCodePoint(point):'\uFFFD';
 }).replaceAll('&nbsp;',' ').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
}
export function htmlFragments(source,label='html'){
 const fragments=[];
 let markup=source.replace(/<!--[\s\S]*?-->/g,'');
 markup=markup.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(_,attributes,body)=>{
  if(body.trim())fragments.push(...(/type\s*=\s*["']application\/(?:ld\+)?json["']/i.test(attributes)?objectFragments(JSON.parse(body),label+':json'):javascriptFragments(body,label+':script')));
  return '';
 });
 markup=markup.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi,(_,body)=>{fragments.push(...cssFragments(body,label+':style'));return '';});
 // Include all attributes (alt/title/aria-label/placeholder/value/etc.) and text.
 // Scanning markup too keeps new accessibility attributes in scope by default.
 fragments.push({label,text:decodeEntities(markup)});
 return fragments;
}
export function cssFragments(source,label='css'){
 const text=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\\([\da-f]{1,6})\s?/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)));
 return [{label,text}];
}
export function collectPublishedText(){
 const siteRoot=fileURLToPath(new URL('../site/',import.meta.url)),fragments=[],files=[];
 function walk(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
   const path=join(directory,entry.name);if(entry.isDirectory()){walk(path);continue;}
   const extension=extname(path);if(!['.js','.json','.html','.svg','.css'].includes(extension))continue;
   const label='site/'+relative(siteRoot,path).replaceAll('\\','/'),source=readFileSync(path,'utf8');files.push(label);
   if(extension==='.js')fragments.push(...javascriptFragments(source,label));
   else if(extension==='.json')fragments.push(...objectFragments(JSON.parse(source),label));
   else if(extension==='.css')fragments.push(...cssFragments(source,label));
   else fragments.push(...htmlFragments(source,label));
  }
 }
 walk(siteRoot);
 fragments.push(...objectFragments(QUESTION_BANK,'QUESTION_BANK'),...objectFragments(GUIDES,'GUIDES'),...objectFragments(REVIEW_CONTENT,'REVIEW_CONTENT'));
 const numericCounts={};
 for(const topic of Object.keys(TOPICS)){
  const sets=numeric.numericParameterSets(topic);numericCounts[topic]=sets.length;
  sets.forEach((parameters,index)=>{
   fragments.push(...objectFragments(numeric.numericModel(topic,parameters),`${topic}.numericModel[${index}]`));
   fragments.push(...objectFragments(numeric.numericQuestionFromParameters(topic,parameters,'language-scan-'+index),`${topic}.numericQuestion[${index}]`));
  });
 }
 return {fragments,files,numericCounts};
}
export function auditPublishedTraditional(){
 const corpus=collectPublishedText();
 return {files:corpus.files,numericCounts:corpus.numericCounts,fragments:corpus.fragments.length,issues:corpus.fragments.flatMap(f=>scanTraditional(f.text,f.label))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=auditPublishedTraditional();console.log(JSON.stringify(result,null,2));
 if(result.issues.length)process.exitCode=1;
}

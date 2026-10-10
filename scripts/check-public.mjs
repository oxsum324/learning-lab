import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TOPICS} from '../site/topics.js';
import {validateMedia} from './approved-media.mjs';
const siteRoot=new URL('../site/',import.meta.url);const repoRoot=new URL('../',import.meta.url);const forbidden=[/[CGH]:[\\/](?:Users|我的雲端硬碟)/,/歐瀚文|弘一工程|最強大腦|my-work-tools-c7a5a/,/BEGIN (?:RSA |EC )?PRIVATE KEY/,/AIza[0-9A-Za-z_-]{30,}/,/gh[pousr]_[A-Za-z0-9]{20,}/];
const ignored=new Set(['.git','node_modules','output','.playwright-cli','private']);
const scannerFile=fileURLToPath(import.meta.url);
const media=JSON.parse(readFileSync(new URL('scripts/public-media.json',repoRoot),'utf8')),seen=new Set();
function walk(path){for(const item of readdirSync(path,{withFileTypes:true})){if(ignored.has(item.name))continue;const next=join(path,item.name);if(item.isDirectory())walk(next);else if(next!==scannerFile){const bytes=readFileSync(next),key=relative(fileURLToPath(repoRoot),next).replaceAll('\\','/');if(/\.(jpg|jpeg|png|webp|gif|avif|ico)$/i.test(extname(next))){validateMedia(key,bytes,media);seen.add(key);continue;}const text=bytes.toString('utf8');if(forbidden.some(re=>re.test(text)))throw Error('Unexpected private content: '+next);if(text.includes('\uFFFD')||text.includes('\u0000'))throw Error('Invalid encoding: '+next);}}}
walk(fileURLToPath(repoRoot));for(const key of Object.keys(media))if(!seen.has(key))throw Error('Approved media missing: '+key);for(const [id,topic] of Object.entries(TOPICS)){const data=JSON.parse(readFileSync(new URL(topic.curriculum,siteRoot),'utf8'));if((data.topicId&&data.topicId!==id)||data.days.length!==30||data.days.some((d,i)=>d.day!==i+1||!d.problem||!d.task||!d.check))throw Error('Invalid curriculum: '+topic.curriculum);}console.log(`Public content checked; ${Object.keys(TOPICS).length} topics, ${Object.keys(TOPICS).length*30} complete daily entries, ${seen.size} approved image.`);

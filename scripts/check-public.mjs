import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../site/',import.meta.url);const forbidden=[/[CGH]:[\\/]/,/歐瀚文|弘一工程|最強大腦|my-work-tools-c7a5a/,/BEGIN (?:RSA |EC )?PRIVATE KEY/,/AIza[0-9A-Za-z_-]{30,}/,/gh[pousr]_[A-Za-z0-9]{20,}/];
function walk(path){for(const item of readdirSync(path,{withFileTypes:true})){const next=join(path,item.name);if(item.isDirectory())walk(next);else{const text=readFileSync(next,'utf8');if(forbidden.some(re=>re.test(text)))throw Error('Unexpected private content: '+item.name);if(text.includes('\uFFFD'))throw Error('Invalid encoding: '+item.name);}}}
walk(fileURLToPath(root));for(const file of ['curriculum.json','rc-curriculum.json']){const data=JSON.parse(readFileSync(new URL(file,root),'utf8'));if(data.days.length!==30||data.days.some((d,i)=>d.day!==i+1||!d.problem||!d.task||!d.check))throw Error('Invalid curriculum: '+file);}console.log('Public content checked; 2 topics, 60 complete daily entries.');

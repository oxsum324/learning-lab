import {copyFileSync,existsSync,mkdirSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {TOPICS} from '../site/topics.js';
import {validateState} from '../site/core.js';

const roots=['G:\\','E:\\'];
const topicFolders={
 'structural-analysis':'結構學',
 'reinforced-concrete':'鋼筋混凝土',
 'steel-structures':'鋼結構',
 'structural-dynamics':'耐震設計及結構動力',
 'soil-foundations':'土壤力學及大地工程'
};
const filePattern=/^learning-lab-([a-z-]+)-\d{4}-\d{2}-\d{2}\.json$/;

function sha256(path){return createHash('sha256').update(readFileSync(path)).digest('hex');}
function folders(path){try{return readdirSync(path,{withFileTypes:true}).filter(item=>item.isDirectory()).map(item=>item.name);}catch{return [];}}
export function detectBackupRoot({driveRoots=roots,configured=process.env.LEARNING_LAB_BACKUP_ROOT}={}){
 if(configured){const target=resolve(configured);if(!existsSync(target))throw Error('設定的備份根目錄不存在。');return target;}
 const candidates=[];
 for(const drive of driveRoots){
  for(const parent of folders(drive))for(const child of folders(join(drive,parent))){
   const candidate=join(drive,parent,child);
   if(child.endsWith('_歷史備份')&&existsSync(join(candidate,'學習')))candidates.push(candidate);
  }
 }
 if(candidates.length!==1)throw Error(candidates.length?'偵測到多個備份根目錄，請設定 LEARNING_LAB_BACKUP_ROOT。':'未偵測到備份根目錄，請設定 LEARNING_LAB_BACKUP_ROOT。');
 return candidates[0];
}
export function parseBackup(path){
 const match=basename(path).match(filePattern);if(!match||!Object.hasOwn(TOPICS,match[1]))throw Error('檔名必須為 learning-lab-<topic>-YYYY-MM-DD.json。');
 const raw=JSON.parse(readFileSync(path,'utf8'));
 const state=validateState(raw,raw.topicId);
 if(state.topicId!==match[1])throw Error('檔名主題與JSON主題不同。');
 return state;
}
export function backupRecord(input,{root=detectBackupRoot()}={}){
 if(!existsSync(input)||!statSync(input).isFile())throw Error('找不到指定的JSON備份。');
 const state=parseBackup(input),folder=topicFolders[state.topicId];
 const destinationDir=join(root,'學習',folder,'records');
 const destination=join(destinationDir,basename(input));
 if(existsSync(destination))throw Error('同名備份已存在，未覆蓋。');
 mkdirSync(destinationDir,{recursive:true});
 copyFileSync(input,destination,0x1);
 const sourceHash=sha256(input),destinationHash=sha256(destination);
 if(sourceHash!==destinationHash)throw Error('複製後SHA-256不一致。');
 return {topicId:state.topicId,records:state.records.length,destination,sha256:destinationHash};
}
function newestDownload(downloads){
 let files=[];
 try{files=readdirSync(downloads,{withFileTypes:true}).filter(item=>item.isFile()&&filePattern.test(item.name)).map(item=>join(downloads,item.name));}catch{throw Error('無法讀取Downloads資料夾。');}
 if(!files.length)throw Error('Downloads找不到 learning-lab JSON備份。');
 return files.sort((a,b)=>statSync(b).mtimeMs-statSync(a).mtimeMs)[0];
}
function main(){
 const downloads=join(process.env.USERPROFILE??'', 'Downloads');
 const input=process.argv[2]?resolve(process.argv[2]):newestDownload(downloads);
 const result=backupRecord(input);
 console.log(`本機複製完成：${result.topicId}，${result.records}筆作答，SHA-256 ${result.sha256}。`);
 console.log('Google Drive遠端同步未驗證。');
}
if(process.argv[1]===fileURLToPath(import.meta.url))main();

import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {emptyState} from '../site/core.js';
import {backupRecord,detectBackupRoot,parseBackup} from '../scripts/backup-records.mjs';

const repo=new URL('../',import.meta.url);
const packageJson=JSON.parse(readFileSync(new URL('package.json',repo),'utf8'));
test('version injection derives public cache keys and visible release from package.json',()=>{
 const run=spawnSync(process.execPath,['scripts/sync-version.mjs'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);const version=packageJson.version;
 for(const file of ['index.html','app.js','core.js','drawing.js','drawing-model.js','teaching-guides.js','topics.js']){
  const content=readFileSync(new URL('../site/'+file,import.meta.url),'utf8');
  for(const found of content.matchAll(/\?v=(\d+\.\d+\.\d+)/g))assert.equal(found[1],version,file);
  for(const found of content.matchAll(/\bv(\d+\.\d+\.\d+)\b/g))assert.equal(found[1],version,file);
 }
});
test('favicon exists and is declared by the public document',()=>{
 assert.ok(existsSync(new URL('../site/favicon.svg',import.meta.url)));assert.match(readFileSync(new URL('../site/index.html',import.meta.url),'utf8'),/rel="icon" href="favicon\.svg"/);
});
test('CI verifies main without adding a deployment action',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 assert.match(workflow,/push:\s*[\s\S]*branches: \[main\]/);assert.match(workflow,/- run: npm test/);assert.match(workflow,/- run: npm run build/);
 assert.doesNotMatch(workflow,/gh-pages|deploy|pages/i);
});
test('backup validates topic, detects one local backup root, copies exclusively and hashes bytes',()=>{
 const temp=mkdtempSync(join(tmpdir(),'learning-lab-')),drive=join(temp,'G'),parent=join(drive,'cloud'),root=join(parent,'brain_歷史備份'),downloads=join(temp,'Downloads');
 try{
  mkdirSync(join(root,'學習'),{recursive:true});mkdirSync(downloads,{recursive:true});
  assert.equal(detectBackupRoot({driveRoots:[drive]}),root);
  const input=join(downloads,'learning-lab-soil-foundations-2026-09-16.json'),state=emptyState('soil-foundations');
  writeFileSync(input,JSON.stringify(state));assert.equal(parseBackup(input).topicId,'soil-foundations');
  const result=backupRecord(input,{root});assert.equal(result.records,0);assert.ok(existsSync(result.destination));
  assert.throws(()=>backupRecord(input,{root}),/同名備份已存在/);
  const mismatch=join(downloads,'learning-lab-steel-structures-2026-09-16.json');copyFileSync(input,mismatch);assert.throws(()=>parseBackup(mismatch),/檔名主題與JSON主題不同/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});

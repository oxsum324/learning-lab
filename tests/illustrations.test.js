import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TOPICS} from '../site/topics.js';
import {TOPIC_ART,PHASE_ART} from '../site/illustrations.js';
import {validateMedia} from '../scripts/approved-media.mjs';

test('five distinct subject scenes and four stage thumbnails are registered, reviewed and within their budgets',()=>{
 assert.deepEqual(Object.keys(TOPIC_ART),Object.keys(TOPICS));
 const names=[...Object.values(TOPIC_ART),...PHASE_ART];assert.equal(new Set(names).size,9);assert.equal(PHASE_ART.length,4);
 const manifest=JSON.parse(readFileSync(new URL('../scripts/public-media.json',import.meta.url),'utf8'));
 for(const name of names){
  const path='site/assets/'+name,bytes=readFileSync(new URL('../'+path,import.meta.url));
  assert.match(name,/^[a-z-]+-v1\.jpg$/);validateMedia(path,bytes,manifest);
  assert.ok(bytes.length<=(PHASE_ART.includes(name)?120000:350000),name);
  assert.ok(manifest[path].purpose.trim());
 }
});
test('small stage art cannot bypass its tighter size budget through a matching approval hash',()=>{
 const path='site/assets/phase-test.jpg',bytes=Buffer.alloc(120001);bytes[0]=0xff;bytes[1]=0xd8;bytes[2]=0xff;bytes[bytes.length-2]=0xff;bytes[bytes.length-1]=0xd9;
 const manifest={[path]:{type:'image/jpeg',purpose:'Decorative test',sha256:createHash('sha256').update(bytes).digest('hex')}};
 assert.throws(()=>validateMedia(path,bytes,manifest),/invalid/);
});

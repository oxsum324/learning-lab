import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const fixtureRoot=new URL('../tests/fixtures/opencc/',import.meta.url);
export const fixtureFile=new URL('traditional-scan.json',fixtureRoot);
const taiwanCommon=['台','托','准'];
export function readVerifiedDictionaries(){
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',fixtureRoot),'utf8'));
 for(const source of manifest.sources){
  const actual=createHash('sha256').update(readFileSync(new URL(source.file,fixtureRoot))).digest('hex');
  if(actual!==source.sha256)throw Error(`OpenCC source checksum mismatch: ${source.file}`);
 }
 const read=name=>new Map(readFileSync(new URL(name,fixtureRoot),'utf8').trim().split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{
  const [key,values]=line.split('\t');return [key,values.split(' ')];
 }));
 return {manifest,st:read('STCharacters.txt'),ts:read('TSCharacters.txt'),tw:read('TWVariants.txt')};
}
export function generateTraditionalFixture(){
 const {manifest,st,ts,tw}=readVerifiedDictionaries(),flagged=[],shared=[];
 const taiwanTargets=new Set([...tw.values()].flat());
 for(const [key,candidates] of st){
  const reasons=[];
  if(candidates.includes(key))reasons.push('source-is-traditional-candidate');
  if(ts.has(key))reasons.push('source-is-traditional-dictionary-key');
  if(taiwanTargets.has(key))reasons.push('source-is-taiwan-variant-target');
  if(taiwanCommon.includes(key))reasons.push('taiwan-common-character');
  if(reasons.length)shared.push({character:key,candidates,reasons});
  else flagged.push(key);
 }
 return {schemaVersion:1,upstreamVersion:manifest.version,algorithm:'ST source minus self-candidates, TS keys, Taiwan variant targets and explicit Taiwan common characters',sourceHashes:Object.fromEntries(manifest.sources.map(s=>[s.file,s.sha256])),flaggedCharacters:flagged.join(''),sharedCharacters:shared};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const generated=generateTraditionalFixture();
 writeFileSync(fixtureFile,JSON.stringify(generated,null,2)+'\n');
 console.log(`OpenCC fixture generated: ${[...generated.flaggedCharacters].length} flagged characters; ${generated.sharedCharacters.length} shared characters.`);
}

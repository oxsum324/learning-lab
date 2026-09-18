import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const packageJson=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
const version=packageJson.version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('package.json version must use x.y.z.');
const files=['site/index.html','site/app.js','site/core.js','site/drawing.js','site/drawing-model.js','site/drawing-layouts.js','site/teaching-guides.js','site/topics.js','site/cloud-history.js'];
let changes=0;
for(const file of files){
 const url=new URL(file,root),before=readFileSync(url,'utf8');
 const after=before
  .replaceAll(/\?v=\d+\.\d+\.\d+/g,`?v=${version}`)
  .replaceAll(/\bv\d+\.\d+\.\d+\b/g,`v${version}`)
  .replaceAll(/試用版\s+\d+\.\d+\.\d+/g,`試用版 ${version}`)
  .replaceAll(/'\d+\.\d+\.\d+'/g,`'${version}'`);
 if(after!==before){writeFileSync(url,after);changes++;}
}
console.log(`Version ${version} injected into ${files.length} public assets (${changes} changed).`);

export {files,version};

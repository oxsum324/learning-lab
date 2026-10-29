import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const packageJson=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
const version=packageJson.version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('package.json version must use x.y.z.');
const files=['site/index.html','site/app.js','site/core.js','site/drawing.js','site/drawing-model.js','site/drawing-layouts.js','site/teaching-guides.js','site/topics.js','site/cloud-history.js','site/learning-flow.js','site/session-phases.js','site/practice-notes.js','site/illustrations.js','site/progressive-review.js','site/review-content.js','site/review-state.js'];
for(const item of readdirSync(new URL('site/',root)))if(/^graded-.*\.js$/.test(item))files.push('site/'+item);
for(const item of readdirSync(new URL('site/graded-content/',root)))if(item.endsWith('.js'))files.push('site/graded-content/'+item);
for(const item of readdirSync(new URL('site/studio/',root)))if(/\.(js|html)$/.test(item))files.push('site/studio/'+item);
files.push('site/rc-units.js');
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

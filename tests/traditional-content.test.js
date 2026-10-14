import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixtureFile,generateTraditionalFixture,readVerifiedDictionaries} from '../scripts/generate-traditional-fixture.mjs';
import {auditPublishedTraditional,collectPublishedText,javascriptFragments,htmlFragments,cssFragments,objectFragments,scanTraditional} from '../scripts/check-traditional.mjs';

test('OpenCC dictionary sources match pinned checksums and generated fixture is reproducible',()=>{
 const {manifest,st,ts,tw}=readVerifiedDictionaries();
 assert.equal(manifest.version,'ver.1.1.9');assert.equal(manifest.license,'Apache-2.0');
 assert.equal(st.size,3980);assert.equal(ts.size,4113);assert.equal(tw.size,39);
 assert.deepEqual(generateTraditionalFixture(),JSON.parse(readFileSync(fixtureFile,'utf8')));
 const generated=generateTraditionalFixture();
 assert.equal([...generated.flaggedCharacters].length,3796);assert.equal(generated.sharedCharacters.length,184);
 assert.ok(generated.flaggedCharacters.includes('际'));
 for(const source of manifest.sources)assert.match(source.url,/^https:\/\/raw\.githubusercontent\.com\/BYVoid\/OpenCC\/ver\.1\.1\.9\//);
});

test('real simplified typo and curriculum-specific wording regressions are rejected',()=>{
 for(const text of ['實际位移峰值','幾何誤差會污染力分量','孔隙被水占有的比例'])assert.ok(scanTraditional(text).length,text);
 for(const text of ['實際位移峰值','幾何誤差會汙染力分量','孔隙被水佔有的比例'])assert.deepEqual(scanTraditional(text),[],text);
 for(const character of '设无构独续载图为级边际')assert.equal(scanTraditional(character)[0]?.text,character);
});

test('shared characters and Taiwan variant targets are not blanket-converted or rejected',()=>{
 const samples=['台灣操作平台','委托與托架','准予使用','干涉與乾單位重','皇后與後續','里程與裡面','系統與關係','峰值與螺栓群','占卜與佔有','公里與里長'];
 for(const text of samples)assert.deepEqual(scanTraditional(text),[],text);
 const rows=generateTraditionalFixture().sharedCharacters;
 for(const character of '台托准干后里系')assert.ok(rows.find(row=>row.character===character)?.reasons.includes('source-is-traditional-candidate'),character);
 for(const character of '峰群')assert.ok(rows.find(row=>row.character===character)?.reasons.includes('source-is-taiwan-variant-target'),character);
 // Shared characters still need phrase-level editorial review; no automatic substitute is claimed.
 assert.deepEqual(scanTraditional('干后里系'),[]);
});

test('AST extraction scans escaped and template UI text without treating comments or regexes as prose',()=>{
 const source=String.raw`// 实际 is a comment, not rendered.
 const pattern=/[实际]/u;
 const title='實\u9645';
 const message=\`實际：\${title}\`;
 `.replaceAll('\\`','`').replaceAll('\\${','${');
 const fragments=javascriptFragments(source,'fixture.js');
 assert.equal(fragments.length,3);
 assert.equal(fragments.flatMap(row=>scanTraditional(row.text)).length,2);
 assert.ok(fragments.every(row=>!row.text.includes('comment')));
 assert.deepEqual(javascriptFragments('const p=/实际/; /* 实际 */','pattern.js'),[]);
});

test('HTML accessibility, inline script, JSON and generated CSS content remain in scan scope',()=>{
 const markup='<p title="實&#x9645;">實際</p><input aria-label="實际" placeholder="實际"><script>const message="實际";</script><!-- 实际 -->';
 assert.equal(htmlFragments(markup).flatMap(row=>scanTraditional(row.text)).length,4);
 assert.equal(cssFragments(String.raw`.hint:before { content: "實\9645"; } /* 实际 */`).flatMap(row=>scanTraditional(row.text)).length,1);
 assert.equal(objectFragments({caption:'實际'},'json').flatMap(row=>scanTraditional(row.text)).length,1);
});

test('entire site, all question output, guides and all 139 numeric combinations pass the language scan',()=>{
 const result=auditPublishedTraditional();
 assert.deepEqual(result.numericCounts,{'structural-analysis':36,'reinforced-concrete':24,'steel-structures':36,'structural-dynamics':16,'soil-foundations':27});
 for(const file of ['site/index.html','site/privacy.html','site/app.js','site/graded-ui.js','site/teaching-guides.js','site/review-content.js','site/curriculum.json','site/rc-curriculum.json','site/steel-curriculum.json','site/dynamics-curriculum.json','site/soil-curriculum.json'])assert.ok(result.files.includes(file),file);
 assert.ok(result.files.every(file=>file.startsWith('site/')&&!file.includes('fixtures')));
 assert.deepEqual(result.issues,[],JSON.stringify(result.issues));
 const corpus=collectPublishedText();
 for(const prefix of ['QUESTION_BANK.','GUIDES.','REVIEW_CONTENT.'])assert.ok(corpus.fragments.some(row=>row.label.startsWith(prefix)),prefix);
 for(const topic of Object.keys(result.numericCounts))assert.ok(corpus.fragments.some(row=>row.label.startsWith(topic+'.numericQuestion[')),topic);
});

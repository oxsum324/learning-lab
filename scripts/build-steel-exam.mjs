import fs from 'node:fs';
import {curriculumHash} from './curriculum-hash.mjs';
import {buildSteelExamCourse} from './steel-exam-course.mjs';
// The SI source stays hash-locked for legacy drafts and records; the exam course is regenerated from it.
const raw=fs.readFileSync('site/steel-curriculum.json'),locked=JSON.parse(fs.readFileSync('docs/studio-content-canonical-baseline.json'))['steel-curriculum.json'];
if(curriculumHash(raw)!==locked)throw Error('鋼構原課表與鎖定基準不同，請先審查變更。');
const course=buildSteelExamCourse(JSON.parse(raw));
fs.writeFileSync('site/steel-exam-curriculum.json',JSON.stringify(course,null,2)+'\n');
console.log(`steel exam course ${course.version}: ${course.days.filter(d=>d.fields.length).length} numeric days.`);

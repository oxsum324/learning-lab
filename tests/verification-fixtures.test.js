import test from 'node:test';
import assert from 'node:assert/strict';
import {VERIFY_TOPICS,verificationStates} from '../site/verification/sample-data.js';
import {mergeStates,emptyState,validateState} from '../site/core.js';
import {mergeCloudRecords} from '../site/cloud-history.js';
test('live verification fixtures cover every subject with old and new drawings, first answers and drafts',()=>{
 for(const topic of VERIFY_TOPICS){const [old,modern,returned]=verificationStates(topic,'verification-test');
  for(const state of [old,modern,returned])assert.equal(validateState(state,topic),state);
  assert.deepEqual(modern.records[0],old.records[0]);assert.deepEqual(returned.records.slice(0,2),modern.records);
  const r=modern.records[1];assert.equal(r.drawing.sheets.workspace.length,12);assert.equal(r.progressive.attempts.length,3);
  assert.deepEqual(r.progressive.attempts[0].answer,['a','b']);assert.deepEqual(r.progressive.attempts[1].answer,['b','a','d','c']);
  assert.equal(r.progressive.attempts[2].question.numericInitial.value,'-17.25');assert.equal(r.progressive.attempts[2].answer,'a');
  assert.equal(modern.drafts['2'].progressive.current.numericDraft,'12.34');
  assert.deepEqual(mergeStates(emptyState(topic),modern),modern);
  assert.deepEqual(mergeStates(modern,modern),modern);
  const destination=structuredClone(old);assert.deepEqual(mergeCloudRecords(destination,modern).drafts,old.drafts);
 }
});


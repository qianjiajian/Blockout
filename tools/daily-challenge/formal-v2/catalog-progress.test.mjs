import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectedDailySlots, inspectReceipt } from './catalog-progress.mjs';
import { levelSha256, routeSha256 } from './contract.mjs';

const source={id:1,arbitrary:'source'},level={id:1,arbitrary:'candidate'},drags=[{blockId:'x',path:[],exitSide:'top'}];
const expected={formalId:'daily-mechanisms-color-exit-1-d3-01',stageKey:'mechanisms-color-exit-1',difficulty:3};
function receipt(){const h=levelSha256(level),t={tool:'abc'},th=levelSha256(t),r=routeSha256(drags);return{
  ...expected,sourceLevelId:1,level,drags,levelSha256:h,sourceLevelSha256:levelSha256(source),routeSha256:r,
  L:31,U:35,status:'SPATIAL_DIFFICULTY_VERIFIED_AWAITING_POINTER_TIME',accepted:true,
  staticAudit:{passed:true,levelSha256:h},toolchainBindings:t,toolchainSha256:th,
  route:{inputLevelSha256:h,routeSha256:r,canonicalReplay:{valid:true,complete:true,nonClearingDrags:35},independentReplay:{valid:true,complete:true,nonClearingDrags:35}},
  lowerBound:{inputLevelSha256:h,toolchainSha256:th,requiredFloor:31,result:{floor:31,status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'}},
};}
test('each stage has exactly three pools of ten stable slot IDs',()=>{
  const rows=expectedDailySlots([{id:'color-exit',unlockLevel:1},{id:'ice',unlockLevel:6}]);
  assert.equal(rows.length,60);assert.equal(new Set(rows.map(x=>x.formalId)).size,60);
  assert.equal(rows[29].formalId,'daily-mechanisms-color-exit-1-d3-10');
});
test('receipt inspection detects exact-object mutations despite PASS booleans',()=>{
  const report=receipt(); assert.deepEqual(inspectReceipt(report,source,expected),[]);
  report.level={...report.level,seams:[{offset:1}]};
  assert.ok(inspectReceipt(report,source,expected).includes('level-hash-mismatch'));
});
test('short complete route rejects an asserted lower bound and rewritten metadata',()=>{
  const report=receipt();report.U=15;report.level.parMoves=31;
  assert.ok(inspectReceipt(report,source,expected).includes('difficulty-band'));
});
test('budget exhaustion and stale route are never accepted as proof',()=>{
  const report=receipt();report.lowerBound.result.termination='max-states';report.drags=[];
  const reasons=inspectReceipt(report,source,expected);
  assert.ok(reasons.includes('lower-input-or-result-binding'));assert.ok(reasons.includes('route-hash-mismatch'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadRuntime,levelSha256} from '../formal-v2/contract.mjs';
import {mechanismInventory} from './mechanism-intensity.mjs';
import {capacityTargets,auditCapacityIntensity,addCapacitySupport} from './capacity-intensity-policy.mjs';

const root='deliverables/daily-formal-v3-20261008';
const base=JSON.parse(fs.readFileSync(`${root}/design/macro-opening-guarded8-02/candidate-006.json`));
const prior=JSON.parse(fs.readFileSync(`${root}/mechanisms/old450-baseline.json`)).rows
  .find(r=>r.formalId==='daily-mechanisms-axis-block-50-d3-01');
const runtime=await loadRuntime();
const primary=()=>{
  const l=structuredClone(base.level);
  l.blocks.find(b=>b.id==='v3-118-7652547-b18').movementAxis='vertical';
  return l;
};
const combined=()=>addCapacitySupport(runtime,primary(),base.drags,'axis-block',3,prior.inventory);

test('capacity policy retains total four and numerical thresholds, not four latest devices',()=>{
  const target=capacityTargets('axis-block',3);
  assert.equal(target.minimumTotalInstances,4);assert.equal(target.minimumLatestInstances,1);
  assert.throws(()=>capacityTargets('numeric-ice',3));
});
test('one real axis plus three staggered ice constraints preserve the complete actual witness',()=>{
  const before=levelSha256(base.level),r=combined();
  assert(r.ok,JSON.stringify(r.audit.issues));
  assert.equal(r.audit.priorComparison.currentTotal,4);
  assert.equal(r.audit.priorComparison.previousTotal,1);
  assert.equal(r.audit.inventory['axis-block'].length,1);
  assert(r.audit.rows.every(row=>row.allParticipate));
  assert(r.audit.releaseEvents.length>=2);
  assert.equal(r.audit.replay.nonClearingDrags,40);assert.equal(r.audit.replay.clearEvents,20);
  assert.equal(r.audit.formalReady,false);assert.equal(r.audit.difficultyProof,false);
  assert.equal(levelSha256(base.level),before);
  assert.equal(r.constructionSearchStates,0);
});
test('auxiliary-only objects cannot satisfy the latest-mechanism stage',()=>{
  const r=combined();delete r.level.blocks.find(b=>b.movementAxis).movementAxis;
  const audit=auditCapacityIntensity(runtime,r.level,base.drags,'axis-block',3,prior.inventory);
  assert.equal(audit.passed,false);assert(audit.issues.includes('missing-latest-mechanism'));
});
test('a merely present axis on an unmoved clear is rejected',()=>{
  const r=combined();delete r.level.blocks.find(b=>b.movementAxis).movementAxis;
  const first=base.drags[0];assert.equal(first.path.length,0);
  r.level.blocks.find(b=>b.id===first.blockId).movementAxis=['top','bottom'].includes(first.exitSide)?'vertical':'horizontal';
  const audit=auditCapacityIntensity(runtime,r.level,base.drags,'axis-block',3,prior.inventory);
  assert.equal(audit.passed,false);assert(audit.issues.includes('inactive-or-under-strength:axis-block'));
});
test('smaller auxiliary counters do not bypass the unchanged per-type strength target',()=>{
  const r=combined(),gate=r.level.gates.find(g=>g.frozen>0);assert(gate);
  gate.frozen=1;
  const audit=auditCapacityIntensity(runtime,r.level,base.drags,'axis-block',3,prior.inventory);
  assert.equal(audit.passed,false);assert(audit.issues.includes('inactive-or-under-strength:frozen-exit'));
});
test('the exact old total must increase and cannot be replaced by latest-only comparison',()=>{
  const r=combined(),same=mechanismInventory(r.level);
  const audit=auditCapacityIntensity(runtime,r.level,base.drags,'axis-block',3,same);
  assert.equal(audit.passed,false);assert(audit.issues.includes('not-increased-over-prior-total'));
  assert.throws(()=>auditCapacityIntensity(runtime,r.level,base.drags,'axis-block',3,{}));
});
test('removing one support device fails the total four requirement',()=>{
  const r=combined(),gate=r.level.gates.find(g=>g.frozen>0);delete gate.frozen;
  const audit=auditCapacityIntensity(runtime,r.level,base.drags,'axis-block',3,prior.inventory);
  assert.equal(audit.passed,false);assert(audit.issues.includes('too-few-total-instances'));
});

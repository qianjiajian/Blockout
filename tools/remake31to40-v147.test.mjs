import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,BASELINE,assertBaseline,auditCandidate,checkCandidate,TARGETS} from './remake31to40-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const read31=()=>JSON.parse(fs.readFileSync('deliverables/remake31-40-v141-20260924/agent31-34/final31-1790229621121.json'));

test('current lock and immutable campaign preserve all ten difficulty bands',()=>{
  assert.equal(ruleGate().activeVersion,'1.47.0');assertBaseline(baseline);
  assert.deepEqual(Object.values(TARGETS).map(t=>[t.difficulty,t.min,t.max]),[
    ['easy',5,10],['normal',11,15],['normal',11,15],['hard',16,20],['easy',5,10],
    ['easy',5,10],['normal',11,15],['hard',16,20],['easy',5,10],['normal',11,15]]);
  const changed=structuredClone(baseline);changed.levels[4].level.reward++;
  changed.levels[4].sha256=digest(changed.levels[4].level);
  changed.campaignSha256=digest(changed.levels.map(r=>r.level));
  assert.throws(()=>assertBaseline(changed),/Immutable pre-adoption/);
});

test('native sprites cover opening and hidden bodies; legacy rotations are rejected',()=>{
  assert(auditCandidate(read31(),baseline,api).allNativeOrientation);
  for(const id of [35,36,37]){
    const d=JSON.parse(fs.readFileSync(`deliverables/remake31-40-v141-20260924/agent35-37/final${id}.json`));
    assert.throws(()=>auditCandidate(d,baseline,api),/native-direction sprite/);
  }
});

test('source properties, counters and body bindings cannot be changed by an author flag',()=>{
  for(const mutate of [d=>d.level.blocks.find(b=>b.frozen).frozen++,d=>d.level.gates.find(g=>g.frozen).frozen++,d=>d.level.gates.pop(),d=>delete d.sourceAdaptation.blockMapping]){
    const d=read31();mutate(d);d.passed=true;assert.throws(()=>auditCandidate(d,baseline,api));
  }
});

test('preserved geometry and evaluation remain independent acceptance conditions',()=>{
  for(const mutate of [d=>d.level.width++,d=>d.level.reward++,d=>d.level.timeSeconds++,d=>d.level.name+='x',d=>d.level.difficulty='hard']){
    const d=read31();mutate(d);assert.throws(()=>auditCandidate(d,baseline,api));
  }
});

test('full route and newly executed lower bound cannot be substituted with saved proof metadata',()=>{
  const d=read31(),result=checkCandidate(d,baseline,api);
  assert.equal(result.ruleVersion,'1.47.0');assert.equal(result.lowerBound,5);assert.equal(result.upperBound,9);
  assert.equal(result.pointerValidated,false);assert(result.audit.allNativeOrientation);
  const incomplete=read31();incomplete.drags.pop();incomplete.proof={thresholdProven:true};
  assert.throws(()=>checkCandidate(incomplete,baseline,api));
  d.proof={thresholdProven:true};assert.throws(()=>checkCandidate(d,baseline,api,{maxStates:1,maxMilliseconds:1000}));
});

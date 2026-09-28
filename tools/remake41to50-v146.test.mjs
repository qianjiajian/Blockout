import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,BASELINE,assertBaseline,auditCandidate,checkCandidate,TARGETS} from './remake41to50-v146.mjs';
import {loadReviewedSourceCatalog,verifySourceCatalog} from './remake41to50-source-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const candidate=()=>JSON.parse(fs.readFileSync('deliverables/remake41-50-v146-20260924/agent41-43/final42-1790263157458.json'));
test('immutable baseline and actual continued cadence are enforced',()=>{
 assert.equal(ruleGate().activeVersion,'1.47.0');assertBaseline(baseline);
 assert.deepEqual(Object.values(TARGETS).map(t=>[t.difficulty,t.min,t.max]),[
  ['super',21,30],['easy',5,10],['normal',11,15],['normal',11,15],['hard',16,20],
  ['easy',5,10],['normal',11,15],['hard',16,20],['easy',5,10],['easy',5,10]]);
 const b=structuredClone(baseline);b.levels[41].level.reward++;b.levels[41].sha256=digest(b.levels[41].level);b.campaignSha256=digest(b.levels.map(r=>r.level));
 assert.throws(()=>assertBaseline(b),/Fixed start-of-task/);
});
test('self-rehashed source facts cannot replace bound video review',()=>{
 const c=loadReviewedSourceCatalog([42]);c.records[42].gates[0].frozen=1;c.sourceHash=digest(c.records);
 assert.throws(()=>verifySourceCatalog(c),/bound reviews/);
});
test('source pairing, geometry, evaluation, mechanism unlock and native art are independent conditions',()=>{
 assert(auditCandidate(candidate(),baseline,api).passed);
 const mutations=[d=>d.level.width++,d=>d.level.timeSeconds++,d=>d.level.reward++,d=>d.level.name+='x',d=>d.level.difficulty='hard',
  d=>d.level.preservedMoveTarget=1,d=>delete d.sourceAdaptation.blockMapping,d=>d.level.blocks[0].color='purple',d=>d.level.blocks[0].movementAxis='vertical',
  d=>d.level.blocks[0].frozen=3,d=>d.level.blocks[0].layers=['red','blue'],d=>d.level.gates.pop(),d=>d.level.blocks[0].shape=[[0,0],[1,0],[2,0],[2,1]]];
 for(const mutate of mutations){const d=candidate();mutate(d);d.passed=true;assert.throws(()=>auditCandidate(d,baseline,api));}
});
test('complete route and fresh bound cannot be replaced by author proof metadata',()=>{
 const r=checkCandidate(candidate(),baseline,api);assert.equal(r.lowerBound,5);assert.equal(r.upperBound,10);assert.equal(r.pointerValidated,false);
 const d=candidate();d.proof={thresholdProven:true};d.drags.pop();assert.throws(()=>checkCandidate(d,baseline,api));
 assert.throws(()=>checkCandidate(candidate(),baseline,api,{maxStates:1,maxMilliseconds:1000}));
});

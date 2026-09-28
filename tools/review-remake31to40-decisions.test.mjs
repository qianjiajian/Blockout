import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi,checkCandidate,BASELINE} from './remake31to40-rhythm.mjs';
import {verifyDecisions,verifyEarlyIceChoices,observeMechanismProcess} from './review-remake31to40-decisions.mjs';
const {api}=await loadApi();
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/rhythm-remake31-40.json'));
const manifest=JSON.parse(fs.readFileSync(fixture.manifestPath));
const read=id=>JSON.parse(fs.readFileSync(manifest.rows.find(r=>r.id===id).candidatePath));
test('an unused frozen gate with an unreachable high counter is not accepted as a meaningful mechanic',()=>{
  const d=read(38);d.level.gates.push({id:'unused-high-counter',color:'cyan',side:'bottom',offset:0,size:3,frozen:99});
  assert.throws(()=>checkCandidate(d,JSON.parse(fs.readFileSync(BASELINE)),api),/must actually thaw/);
});

for(const id of [31,32,33,34])test(`Lv${id} ice restriction is real at the exact unchanged prefix`,()=>{
  const d=read(id),r=verifyEarlyIceChoices(d,api);assert.equal(r.length,1);assert(r[0].samePrefixVerified);
  assert.equal(r[0].provesGlobalOrder,false);
  const bad=structuredClone(d),c=bad.earlyIceChoice??bad.earlyGateChoice;c.remainingIce++;
  assert.throws(()=>verifyEarlyIceChoices(bad,api));
});
test('invented or stale early-ice demonstrations fail closed',()=>{
  for(const mutate of [c=>c.beforeDrag=0,c=>c.cleared++,c=>c.relaxedMove.path=[]]){
    const d=read(31);mutate(d.earlyIceChoice);assert.throws(()=>verifyEarlyIceChoices(d,api));
  }
});
test('generator emission uses consumed queue heads, including in-drag fixed-footprint refills',()=>{
  for(const id of [35,36,37,38,39]){
    const d=read(id),r=observeMechanismProcess(d.level,d.drags,api);
    const queued=d.level.generators.flatMap(g=>g.queueBlockIds);
    assert(queued.length>0);assert.equal(r.generatorEvents.flatMap(e=>e.spawned).length,queued.length);
    assert.deepEqual([...r.generatorEvents.flatMap(e=>e.spawned)].sort(),[...queued].sort());
    assert(r.generatorEvents[0].step<d.drags.length/2,'Refill must be involved before the final cleanup');
    assert(r.generatorEvents.some(e=>e.remaining===0));assert.equal(r.provesAllSolutionsOrder,false);
  }
});
test('new multi-cell decision cases require genuine obstruction and full recovery',()=>{
  for(const id of [35,36,37,38,39,40]){
    const d=read(id),r=verifyDecisions(d,api);assert(r.cases.length>0);assert(r.cases.every(c=>c.area>1));
    assert.equal(r.humanBlindTested,false);
    const bad=structuredClone(d);bad.decisionCases[0].legalWrongParking.blockId='fabricated';
    assert.throws(()=>verifyDecisions(bad,api));
  }
});
test('strict mechanism comparisons retain stronger fresh proofs without pretending to be human difficulty scores',()=>{
  for(const [id,floor]of [[32,12],[34,16]]){
    const d=read(id),r=verifyDecisions(d,api),c=r.mechanismContrast;
    assert(c.strictBoundSeparation);assert(c.proof.thresholdProven);assert.equal(c.proof.floor,floor);
    assert.equal(c.worksUnchangedOnOriginal,false);assert.equal(c.officialLevel,false);
  }
});

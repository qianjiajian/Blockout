import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadRuntime, levelSha256 } from '../formal-v2/contract.mjs';
import { applyNativeDrag } from '../formal-v2/mechanism-decorate.mjs';
import { intensify, intensifyBatch, intensityTargets, findHeldExit, auditMechanismParticipation } from './mechanism-intensity.mjs';
import { generatorMountFixture } from './mechanism-intensity-fixtures.mjs';

const runtime=await loadRuntime();
const base=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/global-pilot-02/candidate-0030.json'));
test('implementation targets distinguish real counters from fuse relaxation and nonnumeric mechanisms',()=>{
 assert.equal(intensityTargets('numeric-ice',3).instances,4);
 assert.equal(intensityTargets('numeric-ice',3).minimumCounter,7);
 for(const m of ['bomb','star','layered-lift','axis-block','colored-grid'])assert.equal(intensityTargets(m,2).minimumCounter,null);
 assert.throws(()=>intensityTargets('star',2,{instances:1}));
});
test('higher ice counters actually thaw at different events and input stays immutable',async()=>{
 const before=levelSha256(base.level),r=await intensify(base.level,base.drags,'numeric-ice',{runtime,difficulty:1});
 assert(r.ok);assert.deepEqual(r.participation.details.map(x=>x.value),[13,14]);assert.equal(r.participation.distinctReleaseEvents,2);
 assert.equal(r.replay.nonClearingDrags,19);assert.equal(r.searchAccounting.fullBoardSolverInvocations,0);assert.equal(levelSha256(base.level),before);
});
test('shared key resources release distinct lock counters instead of one simultaneous marker',async()=>{
 const r=await intensify(base.level,base.drags,'key-lock',{runtime,difficulty:1});assert(r.ok);
 assert.deepEqual(r.participation.details.map(x=>x.value).sort(),[2,3]);assert.equal(r.participation.distinctReleaseEvents,2);
 for(const d of r.participation.details)assert(d.evidence.keyClearDrags.length>=d.value);
});
test('hidden inventory audit rejects a trace that omits actual hidden clear actions',async()=>{
 const r=await intensify(base.level,base.drags,'layered-lift',{runtime,difficulty:1});assert(r.ok);
 assert.equal(r.level.shutters.length,2);assert.equal(r.replay.finalSnapshot.blocks.length,0);
 const hidden=new Set(r.level.blocks.filter(b=>b.shutterId).map(b=>b.id));
 const tampered={...r.replay,trace:r.replay.trace.filter(t=>!hidden.has(t.blockId))};
 assert.equal(auditMechanismParticipation(r.level,r.drags,tampered,'layered-lift',r.targets).pass,false);
});
test('two rim machines release full alternating queues while original bodies remain',async()=>{
 const fixture=generatorMountFixture(),r=await intensify(fixture.level,fixture.drags,'generator',{runtime,difficulty:1});assert(r.ok);
 assert.equal(r.level.generators.length,2);assert.deepEqual(r.level.generators.map(g=>g.queueBlockIds.length),[3,3]);
 assert.equal(r.replay.finalSnapshot.queuedBlocks.length,0);assert.equal(r.replay.clearEvents,15);
 for(const d of r.participation.details)assert(d.evidence.baseBodiesRemainingAtCargoClear.every(n=>n>=2));
 assert.equal(r.replay.nonClearingDrags,0); // This is deliberately not a D1 difficulty fixture.
});
test('local held search stops before exceeding its declared discovery budget',()=>{
 const fixture=generatorMountFixture(),model=new runtime.PuzzleModel(fixture.level);model.startCountdown();
 applyNativeDrag(model,fixture.drags[0]);applyNativeDrag(model,fixture.drags[1]);
 const r=findHeldExit(model,'mount-b5',{maxReachable:1,maxTransitions:4});assert.equal(r.drag,null);
 assert.equal(r.stats.discovered,1);assert.equal(r.stats.expanded,1);assert.equal(r.stats.reason,'micro-reachable-budget');
 assert.equal(r.stats.fullBoardSearch,false);
});
test('every authored bomb is active: waiting for its fuse without clearing fails',async()=>{
 const r=await intensify(base.level,base.drags,'bomb',{runtime,difficulty:1});assert(r.ok);
 const model=new runtime.PuzzleModel(r.level);model.startCountdown();model.tick(Math.min(...r.participation.details.map(d=>d.seconds))+.01);
 assert(model.snapshot().failed);assert.equal(r.timeValidated,false);
});
test('finite batch reports per-input incompatibility and never treats fixtures as formal acceptance',async()=>{
 const observed=[];const batch=await intensifyBatch([{inputId:'ice',stage:'numeric-ice',level:base.level,drags:base.drags,difficulty:1},{inputId:'geometry',stage:'color-exit',level:base.level,drags:base.drags,difficulty:1,maxAttempts:1}],{runtime,onResult:r=>observed.push(r.inputId)});
 assert.deepEqual(observed,['ice','geometry']);assert.equal(batch.attempted,2);assert.equal(batch.mechanismCompatible,1);assert.equal(batch.formalAccepted,0);
});
test('complete but undersized FIFO queues do not satisfy the published per-machine capacity',async()=>{
 const fixture=generatorMountFixture(),r=await intensify(fixture.level,fixture.drags,'generator',{runtime,difficulty:1,targets:{queuePerGenerator:2}});
 assert(r.ok);assert(r.replay.complete);assert.deepEqual(r.level.generators.map(g=>g.queueBlockIds.length),[2,2]);
 const audited=auditMechanismParticipation(r.level,r.drags,r.replay,'generator',intensityTargets('generator',1));
 assert(audited.countPass&&audited.counterPass&&audited.allParticipate);assert.equal(audited.capacityPass,false);assert.equal(audited.pass,false);
});
test('actual lift area is checked even when every hidden body clears at distinct reveals',async()=>{
 const r=await intensify(base.level,base.drags,'layered-lift',{runtime,difficulty:1});assert(r.ok);
 const minimumLiftArea=1+Math.max(...r.level.shutters.map(s=>s.width*s.height));
 const audited=auditMechanismParticipation(r.level,r.drags,r.replay,'layered-lift',{...r.targets,minimumLiftArea});
 assert(audited.countPass&&audited.counterPass&&audited.allParticipate&&audited.staggerPass);assert.equal(audited.capacityPass,false);assert.equal(audited.pass,false);
});
test('one-cell real grids cannot claim a two-cell-per-instance capacity',async()=>{
 const r=await intensify(base.level,base.drags,'colored-grid',{runtime,difficulty:1});assert(r.ok);
 const audited=auditMechanismParticipation(r.level,r.drags,r.replay,'colored-grid',{...r.targets,gridCellsPerInstance:2});
 assert(audited.countPass&&audited.counterPass&&audited.allParticipate);assert.equal(audited.capacityPass,false);assert.equal(audited.pass,false);
});

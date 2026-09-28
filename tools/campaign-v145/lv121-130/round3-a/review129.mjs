import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {loadIsolatedApi} from '../round3-c/isolated-api.mjs';
import {check129Floor,verify129RouteProjection} from '../round3-c/check129.mjs';
import {compilePlainQueueLevel} from '../round3-c/generator-plain129.mjs';
import {mechanismInventory} from '../../../remake121to130-v172.mjs';
import {save} from './author.mjs';
const lock=verifyRulesLock();assert(lock.ok);const api=await loadIsolatedApi();
const candidateFile='deliverables/campaign121-130-v146-20260924/round3-c/candidate129-final-reviewed.json',qualificationFile='deliverables/campaign121-130-v146-20260924/round3-c/qualified129-1790472467431.json',d=JSON.parse(fs.readFileSync(candidateFile)),q=JSON.parse(fs.readFileSync(qualificationFile)),l=d.level;
assert.equal(digest(l),q.levelSha256);assert.equal(digest(d.drags),q.routeSha256);assert.equal(digest(l),q.proof.sourceLevelSha256);
for(const t of q.tools)assert.equal(digest(fs.readFileSync(t.path)),t.sha256,t.path);
for(const[p,h]of Object.entries(d.sourceReview.bindings))assert.equal(digest(fs.readFileSync(p)),h,p);
assert.deepEqual(mechanismInventory(l),d.sourceReview.expectedInventory);
const compiled=compilePlainQueueLevel(l,api),queueIds=l.generators.flatMap(g=>g.queueBlockIds),compiledQueueIds=compiled.generators.flatMap(g=>g.indices.map(i=>compiled.blocks[i].id));
assert.deepEqual(compiledQueueIds,queueIds);assert.equal(compiled.blocks.length,39);assert.equal(queueIds.length,9);assert(compiled.groups.every(g=>g.every(i=>!queueIds.includes(compiled.blocks[i].id))));
const replay=api.replayRevisedRoute(l,d.drags);assert(replay.valid&&replay.complete);const projection=verify129RouteProjection(l,d.drags,api);assert(projection.valid,projection.error);assert(projection.projectedNonClearingDrags<=replay.nonClearingDrags);
const budgetFailure=check129Floor(l,api,{floor:11,maxStates:1,maxMilliseconds:30000});assert.equal(budgetFailure.status,'unknown');assert.equal(budgetFailure.thresholdProven,false);
const invalidFloor=check129Floor(l,api,{floor:0,maxStates:10,maxMilliseconds:1});assert.equal(invalidFloor.status,'invalid');assert.equal(invalidFloor.thresholdProven,false);
const extraMutations=[
 ['queue-shell-preserving-total-shell-count',a=>{const original=a.blocks.find(b=>b.layers?.length>1),queued=a.blocks.find(b=>b.id===a.generators[0].queueBlockIds[0]);delete original.layers;queued.layers=[queued.color,queued.color==='red'?'blue':'red'];}],
 ['third-shell-layer',a=>a.blocks.find(b=>b.layers?.length>1).layers.push('cyan')],
 ['gate-star',a=>a.gates[0].star=true],
 ['authored-portal',a=>a.gates[0].portals=[{side:'top',offset:1,size:2}]],
 ['cover-trigger-blocks',a=>a.shutters[0].triggerBlockIds=[a.blocks[0].id]],
 ['duplicate-queue-identity',a=>a.generators[1].queueBlockIds[0]=a.generators[0].queueBlockIds[0]],
];
const extraNegative=extraMutations.map(([label,mutate])=>{const a=structuredClone(l);mutate(a);const r=check129Floor(a,api,{floor:11,maxStates:1,maxMilliseconds:1});assert.equal(r.status,'unsupported',label);return{label,status:r.status,reason:r.reason};});
const proof=check129Floor(l,api,{floor:11,maxStates:1000000,maxMilliseconds:30000});assert(proof.thresholdProven);
// Existing actual U14 disproves any lower bound15. A successful negative
// control must therefore return relaxed-shortcut, never threshold-proven.
const tooHighFloor=check129Floor(l,api,{floor:15,maxStates:500000,maxMilliseconds:20000});assert(!tooHighFloor.thresholdProven,'False certification above the known actual completion');
const dependencyFiles=['tools/remake21to30-mask-floor.mjs','tools/campaign-v145/lv051-060/campaign-axis-key-graph-v146.mjs','tools/campaign-v145/lv051-060/campaign-axis-key-floor-v146.mjs','src/core/PuzzleModel.ts'];
const report={passed:true,ruleVersion:lock.activeVersion,reviewType:'Independent read-only algorithm review plus fresh controls',candidateFile,qualificationFile,levelSha256:digest(l),routeSha256:digest(d.drags),bindings:{[candidateFile]:digest(fs.readFileSync(candidateFile)),[qualificationFile]:digest(fs.readFileSync(qualificationFile)),...Object.fromEntries(dependencyFiles.map(p=>[p,digest(fs.readFileSync(p))]))},inventory:{totalBodies:compiled.blocks.length,queuedBodies:queueIds.length,queueLengths:compiled.generators.map(g=>g.indices.length),sourceMatches:true,queueOrderRetained:true,queuedIdentitiesExcludedFromQuotient:true},routeProjection:{valid:projection.valid,realCost:replay.nonClearingDrags,relaxedCost:projection.projectedNonClearingDrags},proof,budgetFailure,invalidFloor,extraNegative,tooHighFloor,reasoning:[
 'The byte state retains every39body identity, including9future cargo.254means queued and255means removed; active pose/stage values fit below254 on this7×7 domain. Completion requires everybody removed.',
 'Optional spawn selects exactly the earliest still-queued index of each fixed FIFO list, requires its entire spawn footprint free, and costs0. Real auto arrivals can be postponed to the end of their held gesture because every new cargo remains stationary in that gesture; their final footprints remain free/disjoint. This enlarges the route graph without increasing reposition cost.',
 'Ordinary final-body normalization removes occupancy, advances counters and can delay everyfuture arrival. Ordinary countdown reveals replace already-forbidden whole regions with contained footprints. No lift,flip,key,axis,bomb,star orcolored-grid behavior is admitted. Shell peels retain a relocated body and are not normalized.',
 'Plain cargo normalization executes a real zero-cost spawn plus a reachable final-body clear atomically. It never forces spawnalone and rejects queued shells. The removed cargo contributes exactly itsactual layercount; no inventory or counter is fabricated.',
 'The only quotient exchanges nonqueued bodies with identical shape,layers,ice,revealphase/owner. Queue identities/order never enter equivalence groups.0/1search accepts only costsbelowfloor and returnsPASS only after frontier exhaustion; state/deadline exits remainUNKNOWN.',
 'Existing16negative mutations establish domain rejection, rather than alone proving graph semantics. This review adds six rejected boundarycases, budgetUNKNOWN/invalidfloor controls and a known-U14 overclaim control; constructive route replay and the above exchange argument supply the semantic justification.'
],findings:[],limitations:['This is a source-bound proof audit, not an exhaustive test of every possible future129layout. Existing qualification should not be transferred to a changedlevel or altered tool hashes.','Natural clock,Pointer and human difficulty remain outside this review.'],recommendation:'No false-PASS logic gap found for the exact bound candidate; retain the bound source/tool hashes and parent final-object validation.'};
console.log(JSON.stringify({file:save('review129',report),passed:true,proofStates:proof.exploredStates,tooHighFloor:tooHighFloor.status,tooHighCost:tooHighFloor.relaxedNonClearingDrags,extraNegative:extraNegative.length}));

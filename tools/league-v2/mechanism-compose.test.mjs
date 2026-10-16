import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadRuntime,levelSha256} from '../daily-challenge/formal-v2/contract.mjs';
import {composeLeagueMechanisms,auditAllLeagueMechanismParticipation} from './mechanism-compose.mjs';
import {auditLeagueMechanismStructure} from './mechanism-structure.mjs';
import {leagueMechanismPlan} from './mechanism-policy.mjs';
const runtime=await loadRuntime(),input=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/design/global-02/candidate-00254.json'));
const old=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/mechanisms/old-formal100-mechanisms.json'));

test('latest mechanism uses actual mainline 59/65/100 unlocks and foundation remains empty',()=>{
 assert.equal(leagueMechanismPlan(5).foundationOnly,true);assert.equal(leagueMechanismPlan(59).primary,'key-lock');
 assert.equal(leagueMechanismPlan(65).primary,'layered-lift');assert.equal(leagueMechanismPlan(100).primary,'star');
});

test('combined two-lock route is real, keeps U17 and raises count over the old same-index level',async()=>{
 const before=levelSha256(input.level),result=await composeLeagueMechanisms(input,{index:59,runtime,previousInventory:old.rows[58].inventory});
 assert(result.ok,result.reason);assert.equal(result.replay.nonClearingDrags,17);assert(result.replay.finalSnapshot.complete);
 assert.equal(result.comparison.current['key-lock'].instances,2);assert(result.comparison.totalIncreased);
 assert(result.participation.passed);assert(result.participation.rows.find(r=>r.mechanism==='key-lock').details.every(i=>i.evidence.keyClearDrags.length>=i.value));
 assert.equal(levelSha256(input.level),before);assert.equal(result.searchAccounting.fullBoardSolverInvocations,0);
});

test('lift participation requires full hidden inventory removal, and missing evidence fails',async()=>{
 const result=await composeLeagueMechanisms(input,{index:65,runtime,previousInventory:old.rows[64].inventory});
 assert(result.ok,result.reason);const lift=result.participation.rows.find(r=>r.mechanism==='layered-lift');
 assert.equal(lift.details.length,2);assert(lift.details.every(d=>d.evidence.hiddenClearDrags.length===d.hiddenBodies));
 const trace=structuredClone(result.replay);trace.trace=trace.trace.filter(t=>!String(t.blockId).includes('-hidden-'));
 assert.equal(auditAllLeagueMechanismParticipation(result.level,result.drags,trace).passed,false);
});

test('mechanism structure rejects frozen blocks before unlock instead of accepting a route-only candidate',async()=>{
 const level=structuredClone(input.level);level.blocks[0].frozen=2;
 const result=await auditLeagueMechanismStructure(runtime,level,9);
 assert.equal(result.passed,false);assert(result.issues.includes('mechanism-before-unlock:numeric-ice'));
});

test('generator FIFO is entirely removed between original bodies and support never freezes cargo',async()=>{
 const base=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/design/compact-global-01/candidate-00373.json'));
 const result=await composeLeagueMechanisms(base,{index:35,runtime,previousInventory:old.rows[34].inventory});
 assert(result.ok,result.reason);assert(result.replay.finalSnapshot.complete);assert.equal(result.replay.nonClearingDrags,17);
 const queued=new Set(result.level.generators.flatMap(g=>g.queueBlockIds));
 assert.equal(queued.size,6);assert(result.level.blocks.filter(b=>queued.has(b.id)).every(b=>!b.frozen&&!b.movementAxis));
 const generator=result.participation.rows.find(r=>r.mechanism==='generator');assert(generator.pass);assert.equal(generator.details.length,2);
 for(const item of generator.details){assert.equal(item.evidence.cargoClearDrags.length,3);const last=Math.max(...item.evidence.cargoClearDrags);assert(result.replay.trace.some(t=>t.drag>last&&t.clearDelta>0&&!queued.has(t.blockId)));}
 const incomplete=structuredClone(result.replay);incomplete.trace=incomplete.trace.filter(t=>!queued.has(t.blockId));
 assert.equal(auditAllLeagueMechanismParticipation(result.level,result.drags,incomplete).passed,false);
});

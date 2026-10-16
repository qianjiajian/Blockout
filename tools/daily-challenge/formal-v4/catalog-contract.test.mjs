import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadV4CatalogRuntime,inspectHistoricalCandidate,assertHistoricalSlotMigration,auditV4Diversity} from './catalog-contract.mjs';
import {historicalSelectionPlan,PROPOSAL} from './migrate-historical-selection.mjs';
const runtime=await loadV4CatalogRuntime();
const proposal=JSON.parse(await fs.readFile(PROPOSAL.path));
const plan=historicalSelectionPlan(runtime,proposal);

test('new selection has exactly 27 basic and 89 advanced; no canceled slots counted as completed',()=>{
 assert.equal(plan.length,116);assert.equal(runtime.slots.length,300);
 assert.equal(plan.filter(r=>r.slot.stageKey==='basic-combined').length,27);
 const counts=[1,2,3].map(d=>plan.filter(r=>r.slot.difficulty===d).length);assert.deepEqual(counts,[59,41,16]);
});
test('physical object and historical proof are preserved under merged identity',async()=>{
 const row=plan[0],old=JSON.parse(await fs.readFile(row.input));
 const next=await inspectHistoricalCandidate(runtime,row.input,row.inputSha256,row.slot);
 assert.deepEqual(next.level,old.level);assert.deepEqual(next.drags,old.drags);
 assert.equal(next.levelSha256,old.levelSha256);assert.equal(next.L,old.L);assert.equal(next.U,old.U);
 assert.equal(next.newestMechanism,null);assert.equal(next.staticAudit.passed,true);
 assert.equal(next.historicalProof.formalId,old.formalId);assert.equal(next.migration.newLowerSearchInvocations,0);
 assert.equal(next.formalReady,false);assert.equal(next.pointerValidated,false);
});
test('renamed difficulty, changed advanced stage, changed slot metadata and forged history are rejected',async()=>{
 const row=plan[0],old=JSON.parse(await fs.readFile(row.input));
 const anotherBand=runtime.slots.find(s=>s.stageKey==='basic-combined'&&s.difficulty===2);
 assert.throws(()=>assertHistoricalSlotMigration(runtime,old,anotherBand),/cross-band/);
 assert.throws(()=>assertHistoricalSlotMigration(runtime,old,{...row.slot,slot:9}),/metadata/);
 const advanced=plan.find(r=>r.slot.stageKey!=='basic-combined'),adv=JSON.parse(await fs.readFile(advanced.input));
 assert.throws(()=>assertHistoricalSlotMigration(runtime,adv,row.slot),/advanced stages/);
 await assert.rejects(inspectHistoricalCandidate(runtime,row.input,'0'.repeat(64),row.slot),/frozen accepted/);
});
test('a partial merged pool cannot pass the complete 300 diversity gate',async()=>{
 const row=plan[0],r=await inspectHistoricalCandidate(runtime,row.input,row.inputSha256,row.slot);
 const a=auditV4Diversity([r],runtime.slots,{expectFull:true});
 assert.equal(a.status,'DIVERSITY_REJECTED');assert(a.reasons.some(r=>r.kind==='incomplete-300'));
 const b=auditV4Diversity([r,{...r,formalId:'daily-not-a-real-slot'}],runtime.slots);
 assert(b.reasons.some(r=>r.kind==='unknown-or-mismatched-300-slot'));
 assert(b.reasons.some(r=>r.kind==='exact-partition-duplicate'));
});

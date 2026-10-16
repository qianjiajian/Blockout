import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {buildAxialIceCandidate,geometricDirectionAudit,firstClearAudit,analyzeFrozenParking} from './mechanism-axial-ice-pilot.mjs';

const runtime=await loadBoundedRuntime();
const source=runtime.LEVELS.find(l=>l.id===10);
let sample;
for(let i=0;i<8&&!sample;i++){
 const b=buildAxialIceCandidate(source,runtime,{seed:915900000+10*32+i});
 if(b.ok)sample=b;
}
assert(sample,'finite deterministic construction fixture exists');

test('four frozen exits are geometric, preserve full normal board, and start one real clear',()=>{
 assert(sample.staticAudit.valid);
 assert.equal(sample.staticAudit.covered,48);
 assert(sample.provenance.geometry.pass);
 assert.deepEqual(sample.level.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[7,8,9,10]);
 assert(sample.provenance.eventInventory.initialUnconstrainedBodies>=7);
 assert(sample.provenance.opening.pass);
 assert.equal(sample.provenance.opening.actualClearEvents,1);
 assert(sample.provenance.opening.frozenColourParkingCandidates.length>0);
 assert.equal(sample.provenance.opening.doesNotProveSevenClearPrefix,true);
 assert.equal(sample.provenance.opening.boardSearchInvocations,0);
});

test('ordinary widened exit invalidates geometric restriction instead of inventing axis rule',()=>{
 const l=structuredClone(sample.level),g=l.gates.find(g=>!g.frozen);g.size=12;
 const a=geometricDirectionAudit(l,sample.provenance.geometry.axis);
 assert.equal(a.pass,false);
 assert(a.primaryBars.some(b=>b.ordinaryExitCrossSections.some(x=>x.canFit)));
});

test('explicit movementAxis is rejected for this frozen-exit-only stage',()=>{
 const l=structuredClone(sample.level);l.blocks[0].movementAxis='horizontal';
 assert.equal(geometricDirectionAudit(l,sample.provenance.geometry.axis).pass,false);
});

test('blocking the prescribed opening does not pass the real first-clear check',()=>{
 const l=structuredClone(sample.level),d=sample.provenance.axisPaint.knownOpening;
 const b=l.blocks.find(b=>b.id===d.blockId);l.gates.find(g=>g.color===b.color).frozen=7;
 assert.equal(firstClearAudit(runtime,l,d).pass,false);
});

test('known complete four-ice route audits actual prefix and pre-thaw events without searching',()=>{
 const p='deliverables/daily-formal-v3-20261008/selection/symmetric-design134/daily-mechanisms-frozen-exit-6-d3-01.json';
 const b=JSON.parse(fs.readFileSync(p,'utf8')),a=analyzeFrozenParking(runtime,b.level,b.drags);
 assert(a.complete);
 assert(a.actualSevenClearPathVerified);
 assert.equal(a.firstSevenClears.length,7);
 assert.deepEqual(a.firstSevenClears.map(x=>x.clearsAfter),[1,2,3,4,5,6,7]);
 assert.equal(a.thaws.length,4);
 assert(a.frozenColourPreThawParkings.every(x=>x.remainingGateIce>0));
 assert.equal(a.boardSearchInvocations,0);
});

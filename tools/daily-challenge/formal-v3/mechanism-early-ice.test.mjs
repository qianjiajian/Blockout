import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {buildEarlyIceCandidate,clearInventoryCapacity,runEarlyIceBatch} from './mechanism-early-ice.mjs';

test('event capacity rejects four frozen gates without enough real unfrozen bodies',()=>{
 const gates=['red','blue','green','yellow'].map((color,i)=>({color,frozen:7+i})),blocks=gates.map(g=>({id:g.color,color:g.color}));
 assert.equal(clearInventoryCapacity({gates,blocks}).pass,false);
 for(let i=0;i<7;i++)blocks.push({id:`start${i}`,color:'pink'});
 const capacity=clearInventoryCapacity({gates:[...gates,{color:'pink'}],blocks});assert.equal(capacity.pass,true);assert.equal(capacity.initialUnconstrainedBodies,7);
});

test('all twelve fixed new inputs preserve four high counters and change a real opening choice',async()=>{
 const runtime=await loadBoundedRuntime();
 for(const id of[14,18,29,54,100,3]){
  let previous;
  for(const mechanism of['numeric-ice','frozen-exit']){
   const source=runtime.LEVELS.find(l=>l.id===id),seed=createHash('sha256').update(`early-ice-01:${id}:${mechanism}`).digest().readUInt32LE(0),built=buildEarlyIceCandidate(source,runtime,{seed,mechanism});
   assert.equal(built.ok,true,`${id}/${mechanism}`);assert.equal(built.staticAudit.valid,true);assert.equal(built.targets.instances,4);
   assert.deepEqual(built.provenance.placements.map(x=>x.count).sort((a,b)=>a-b),[7,8,9,10]);assert.equal(built.provenance.eventCapacity.pass,true);
   const choice=built.provenance.openingChoice;assert.equal(choice.actualBlockedPossibleSides.length,0);assert.ok(choice.unicedPossibleSides.length);assert.ok(choice.actualStartingPossibleSides.length);
   assert.equal(built.provenance.plainSearchInvocations,0);assert.equal(built.provenance.sourceShapeMultisetChanged,true);
   const fp=designFingerprints(built.level);if(previous){assert.notEqual(fp.shapeSha256,previous.shapeSha256);assert.notEqual(fp.colorSha256,previous.colorSha256);}previous=fp;
  }
 }
});

test('larger or repeated-source batches reject before any search',async()=>{
 await assert.rejects(runEarlyIceBatch({sources:[14,18,29,54,100,3,86]}),/six distinct/);
 await assert.rejects(runEarlyIceBatch({sources:[14,18,29,54,100,100]}),/six distinct/);
});

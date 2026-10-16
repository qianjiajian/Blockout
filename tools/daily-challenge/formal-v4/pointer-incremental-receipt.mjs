import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// A read-only harness view of existing evidence; this is not a proof producer.
export function incrementalPointerReceipt(q){
 assert.equal(q.schemaVersion,4,'Original schema4 receipt required');
 assert.equal(q.accepted,true);assert.notEqual(q.qualificationOnly,true);
 assert(/^daily-[a-z0-9-]+$/.test(q.formalId));assert.equal(typeof q.stageKey,'string');
 assert([1,2,3].includes(q.difficulty));assert(Number.isSafeInteger(q.sourceLevelId)&&q.sourceLevelId>0);
 assert.equal(q.level?.id,q.sourceLevelId);assert.equal(levelSha256(q.level),q.levelSha256);
 assert(Array.isArray(q.drags)&&q.drags.length>0);assert.equal(routeSha256(q.drags),q.routeSha256);
 const floor={1:16,2:21,3:31}[q.difficulty],upper={1:20,2:30,3:Infinity}[q.difficulty];
 assert(Number.isSafeInteger(q.L)&&Number.isSafeInteger(q.U)&&q.L>=floor&&q.L<=q.U&&q.U<=upper);
 const evidence=[['route.independentReplay',q.route?.independentReplay],['freshIndependentReplay',q.freshIndependentReplay]].filter(([,v])=>v!==undefined);
 assert(evidence.length,'Saved independent replay required');
 for(const [field,r]of evidence){
  assert.equal(r.valid,true,field);assert.equal(r.complete,true,field);assert.equal(r.failed,false,field);
  assert.equal(r.effectiveDrags,q.drags.length,field);assert.equal(r.nonClearingDrags,q.U,field);
  assert.equal(r.remainingBodies,0,field);assert.equal(r.remainingQueued,0,field);
  assert.equal(r.trace?.length,q.drags.length,field);
  for(const [i,t]of r.trace.entries()){
   assert.equal(t.index,i,field);assert.equal(t.blockId,q.drags[i].blockId,field);assert.equal(t.moves,i+1,field);
   assert(Number.isSafeInteger(t.clearDelta)&&t.clearDelta>=0,field);
  }
  assert.equal(r.trace.filter(t=>t.clearDelta===0).length,q.U,field);
 }
 if(evidence.length===2)assert.deepEqual(evidence[0][1].trace.map(t=>[t.blockId,t.clearDelta,t.moves]),evidence[1][1].trace.map(t=>[t.blockId,t.clearDelta,t.moves]),'Two saved independent traces must agree');
 return{receipt:q,independentReplay:evidence[0][1],independentReplayField:evidence[0][0],
  originalLevelUnchanged:true,originalDragsUnchanged:true,normalization:'read-only field selection; no original receipt mutation'};
}

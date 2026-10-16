import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';

// Metadata and byte checks only. No runtime load, model, search, projection,
// replay, ledger claim or formal-data writer is called by this module.
export const RAW_PLAIN_EVIDENCE_KIND='raw-plain-minimum-route-v3';
export const ORIGINAL_PLAIN_TOOLCHAIN_SHA256='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
export const ORIGINAL_PLAIN_TOOLCHAIN_ROOT='deliverables/daily-formal-v4-20261008/frozen-workspace-4588';
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts/';
export const RAW_PLAIN_HISTORICAL_RECEIPTS=Object.freeze({
 3:Object.freeze({sourceLevelId:3,originalRequestedFloor:16,L:24,U:24,
  receipt:Object.freeze({path:'deliverables/daily-formal-v3-20261008/design/nearband16-shared/candidate-0188.json',sha256:'8ffdbeccc0b288675acf88f0f1fc3a559869d417f6dd10500600b02f0dd4aeea'}),
  request:Object.freeze({path:ledger+'e317dac2f25783f952f31135675a25a787fbf89d331be45cf83a8cef75bc8039.request.json',sha256:'fd66efd01e54d7dc55bd4efc5e2ed7d0d29b780fe86b0d18e36ea9f91ec1546d'}),
  result:Object.freeze({path:ledger+'e317dac2f25783f952f31135675a25a787fbf89d331be45cf83a8cef75bc8039.result.json',sha256:'87b2f3841710eb44da125e0da86d54efda6e2360da116def5b2af194663d804c'})}),
});
const METHOD='plain-optional-gesture-monotone-clear-identical-body-quotient-v3';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=value=>assert(/^[a-f0-9]{64}$/.test(value??''),'Expected SHA256');
const positive=(value,label)=>assert(Number.isSafeInteger(value)&&value>0,label);
const nonnegative=(value,label)=>assert(Number.isSafeInteger(value)&&value>=0,label);

export function assertOriginalRawPlainSource3EvidenceV198(q,math,{original,request,result}){
 const pin=RAW_PLAIN_HISTORICAL_RECEIPTS[original.sourceLevelId];assert(pin,'Unreviewed raw receipt family');
 assert.equal(math.evidenceKind,RAW_PLAIN_EVIDENCE_KIND);
 assert.equal(original.difficulty,2,'The original object was already D2');
 assert.equal(Object.hasOwn(original,'formalId'),false);assert.equal(original.level.difficulty,'super');
 assert.equal(q.sourceLevelId,3);assert.equal(q.formalId,'daily-basic-combined-d2-06');
 assert.equal(q.stageKey,'basic-combined');assert.equal(q.difficulty,2);assert.equal(q.slot,6);
 assert.equal(original.levelSha256,'72d33cae9009c9335880d4ed94ba16c8b9d44b1ba8343b7bb107b31a0dc75543');
 assert.equal(routeSha256(original.drags),'382566a7a9b4ac2fe27ae1f71d2795584ca8a4e86df88cb6772cdd6ebcfdd9db');
 assert.equal(original.status,'EXPLORATORY_REFINED_SAME_OBJECT_LU_PENDING_V3_CONTRACT');
 assert.equal(original.accepted,true);assert.equal(original.formalReady,false);
 assert.equal(result.accepted,true);assert.equal(result.status,original.status);
 assertPlainProofDomain(original.level);
 const levelHash=levelSha256(original.level),routeHash=routeSha256(original.drags);
 for(const value of [original.levelSha256,q.levelSha256,request.levelSha256,result.levelSha256])assert.equal(value,levelHash);
 assert.deepEqual(q.level,original.level);assert.deepEqual(q.drags,original.drags);assert.equal(q.routeSha256,routeHash);
 assert.equal(q.sourceLevelId,original.sourceLevelId);assert.equal(original.level.id,original.sourceLevelId);
 assert.deepEqual(request,original.attempt,'The entire original request must be preserved');
 assert.equal(math.attemptId,request.id);hash(request.id);
 const fingerprints=designFingerprints(original.level);
 for(const key of ['shapeSha256','colorSha256','colorAssignments','designSha256'])assert.deepEqual(request[key],fingerprints[key],key);
 assert.equal(request.retryIdentitySha256,levelSha256({shapeSha256:fingerprints.shapeSha256,colorSha256:fingerprints.colorSha256}));
 const proof=original.proof;
 assert.deepEqual(result.lower,proof,'Original lower receipt differs from ledger');
 assert.deepEqual(result.upper,proof,'Original upper receipt differs from ledger');
 assert.equal(proof.abstraction,METHOD);assert.equal(proof.sourceLevelSha256,levelHash);
 assert.equal(proof.status,'threshold-proven');assert.equal(proof.thresholdProven,true);
 assert.equal(proof.termination,'below-threshold-exhausted');
 assert.equal(proof.routeTermination,'minimum-relaxed-route-found');
 positive(proof.floor,'Original requested floor');positive(proof.certifiedFloor,'Certified floor');positive(proof.cost,'Minimum relaxed cost');
 assert.equal(proof.floor,pin.originalRequestedFloor);assert.equal(original.L,pin.L);assert.equal(original.U,pin.U);
 assert.equal(proof.certifiedFloor,proof.cost);assert(proof.certifiedFloor>=proof.floor);
 // floor is the OLD search request, not the best certified lower. Keep it
 // unchanged; only a completed minimum-route result can supply this stronger L.
 for(const value of [original.L,q.L])assert.equal(value,proof.certifiedFloor);
 for(const value of [original.U,q.U])assert.equal(value,proof.cost);
 assert.deepEqual(proof.drags,original.drags);
 for(const [field,value]of Object.entries(proof))if(/(?:States|Transitions|Visits|Calls|Removals|Checks)$/.test(field))nonnegative(value,field);
 for(const field of ['rawFullBoardStates','rawExploredStates','discoveredStates','exploredStates','visitedStates'])nonnegative(proof[field],field);
 positive(proof.rawFullBoardStates,'Initial full board must be counted');
 assert.equal(proof.discoveredStates,proof.rawFullBoardStates);assert.equal(proof.visitedStates,proof.rawFullBoardStates);
 assert.equal(proof.exploredStates,proof.rawExploredStates);assert(proof.rawExploredStates<=proof.rawFullBoardStates);
 const caps={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000};
 assert.deepEqual(Object.keys(proof.budget).sort(),Object.keys(caps).sort());
 for(const [key,cap]of Object.entries(caps)){positive(proof.budget[key],key);assert(proof.budget[key]<=cap,key);}
 assert(proof.rawFullBoardStates<=proof.budget.maxStates);assert(proof.rawFullBoardStates+1<=10000,'Raw boards plus conservative terminal reserve exceed 10000');
 assert.equal(proof.guardAllowance,undefined);assert.equal(math.guardAllowance,undefined,'Do not retrofit an executed guard');
 assert.deepEqual(math.budgetReview,{source:'read-only successful old proof',proofGuardOriginallyPresent:false,originalGuardWrapperExecuted:false,
  raw:proof.rawFullBoardStates,conservativeFullBoardUpperBound:proof.rawFullBoardStates+1});

 const count=original.drags.length,bodyIds=new Set(original.level.blocks.map(b=>b.id));
 assert.equal(bodyIds.size,original.level.blocks.length);positive(count,'Complete route required');
 const canonical=original.replay,independent=original.independentReplay;
 for(const replay of [canonical,independent]){
  assert.equal(replay.valid,true);assert.equal(replay.complete,true);assert.equal(replay.effectiveDrags,count);
  assert.equal(replay.nonClearingDrags,original.U);assert.equal(replay.clearEvents,bodyIds.size);
 }
 assert.equal(independent.failed,false);assert.equal(independent.error,null);
 assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
 assert.equal(independent.animationPolicy,'complete-each-departure-before-next-gesture');
 assert.equal(independent.trace.length,count);
 let cleared=0,nonClearing=0;const removed=new Set();
 for(const [index,row]of independent.trace.entries()){
  assert.equal(row.index,index);assert.equal(row.moves,index+1);assert.equal(row.blockId,original.drags[index].blockId);
  assert(bodyIds.has(row.blockId)&&!removed.has(row.blockId),'Unknown or already removed route body');
  assert(row.clearDelta===0||row.clearDelta===1,'Plain body clears exactly once');
  assert.equal(!!original.drags[index].exitSide,row.clearDelta===1,'Trace clear must match original route exit');
  cleared+=row.clearDelta;nonClearing+=Number(row.clearDelta===0);if(row.clearDelta)removed.add(row.blockId);
  assert.equal(row.complete,index===count-1);hash(row.stateSha256);
 }
 assert.equal(cleared,bodyIds.size);assert.equal(nonClearing,original.U);assert.equal(removed.size,bodyIds.size);
 assert.equal(independent.trace.at(-1).stateSha256,independent.finalStateSha256);
 const final=JSON.parse(canonical.finalStateKey);
 assert.equal(final.levelId,original.level.id);assert.equal(final.width,original.level.width);assert.equal(final.height,original.level.height);
 assert.equal(final.complete,true);assert.equal(final.failed,false);assert.equal(final.cleared,bodyIds.size);
 assert.deepEqual(final.blocks,[]);assert.deepEqual(final.queuedBlocks,[]);
 // The two engines use different final-state encodings; never equate their
 // hashes or claim stored untimed replays as current Pointer/time acceptance.
 assert.equal(original.proofToolchainSha256,ORIGINAL_PLAIN_TOOLCHAIN_SHA256);
 assert.equal(levelSha256(original.proofToolchainBindings),original.proofToolchainSha256);
 assert.equal(Object.keys(original.proofToolchainBindings).length,36);
 for(const value of Object.values(original.proofToolchainBindings))hash(value);
 assert.equal(q.toolchainSha256??q.historicalProof?.proofToolchainSha256,original.proofToolchainSha256);
 assert.equal(math.originalToolchainRoot,ORIGINAL_PLAIN_TOOLCHAIN_ROOT);
 for(const [key,value]of Object.entries({originalRequestedFloor:proof.floor,certifiedFloor:proof.certifiedFloor,lowerStatus:proof.status,
  lowerTermination:proof.termination,routeTermination:proof.routeTermination,method:proof.abstraction,rawFullBoardStates:proof.rawFullBoardStates,
  proofInputLevelSha256:levelHash,projectedLevelSha256:null,lowerEvidenceSha256:levelSha256(proof),canonicalValidComplete:true,
  independentValidComplete:true,completeOriginalInventory:true}))assert.equal(math[key],value,key);
 return{evidenceKind:RAW_PLAIN_EVIDENCE_KIND,levelSha256:levelHash,routeSha256:routeHash,attemptId:request.id,
  originalRequestedFloor:proof.floor,certifiedFloor:proof.certifiedFloor,L:q.L,U:q.U,totalDrags:count,
  rawFullBoardStates:proof.rawFullBoardStates,conservativeFullBoardUpperBound:proof.rawFullBoardStates+1,
  originalGuard:false,originalProofFieldsUnchanged:true,storedDualReplayComplete:true,toolchainSha256:original.proofToolchainSha256};
}

export async function verifyOriginalRawPlainSource3EvidenceFilesV198(q,math){
 const fileBindings={};
 const read=async descriptor=>{assert(typeof descriptor?.path==='string');hash(descriptor.sha256);const bytes=await fs.readFile(descriptor.path);
  assert.equal(sha(bytes),descriptor.sha256,descriptor.path);fileBindings[descriptor.path]=descriptor.sha256;return JSON.parse(bytes);};
 assert(q.historicalProof,'An immutable historical raw receipt is required');
 const pin=RAW_PLAIN_HISTORICAL_RECEIPTS[q.sourceLevelId];assert(pin,'Unreviewed raw receipt family');
 assert.deepEqual(math.historicalReceipt,pin.receipt);assert.deepEqual(math.request,pin.request);assert.deepEqual(math.result,pin.result);
 assert.deepEqual(math.historicalReceipt,{path:q.historicalProof.path,sha256:q.historicalProof.sha256});
 const original=await read(math.historicalReceipt),request=await read(math.request),result=await read(math.result);
 assert.equal(path.basename(math.request.path),request.id+'.request.json');assert.equal(path.basename(math.result.path),request.id+'.result.json');
 const summary=assertOriginalRawPlainSource3EvidenceV198(q,math,{original,request,result});
 for(const [relative,expected]of Object.entries(original.proofToolchainBindings)){
  assert(!path.isAbsolute(relative));const root=path.resolve(ORIGINAL_PLAIN_TOOLCHAIN_ROOT),file=path.resolve(root,relative);
  assert(file.startsWith(root+path.sep),'Original closure must stay under frozen root');
  assert.equal(sha(await fs.readFile(file)),expected,'Original frozen toolchain drift: '+relative);fileBindings[file]=expected;
 }
 return{...summary,fileBindings,originalToolchainFilesChecked:36};
}

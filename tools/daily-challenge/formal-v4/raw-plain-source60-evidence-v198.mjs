import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';

// Metadata and byte checks only. No runtime load, model, search, projection,
// replay, ledger claim or formal-data writer is called by this module.
export const RAW_PLAIN_SOURCE60_EVIDENCE_KIND='raw-plain-below-request-minimum-source60-v3';
export const ORIGINAL_PLAIN_TOOLCHAIN_SHA256='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
export const ORIGINAL_PLAIN_TOOLCHAIN_ROOT='deliverables/daily-formal-v4-20261008/frozen-workspace-4588';
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts/';
export const RAW_PLAIN_SOURCE60_HISTORICAL_RECEIPTS=Object.freeze({
 60:Object.freeze({sourceLevelId:60,originalRequestedFloor:31,L:29,U:29,totalDrags:43,raw:7087,
 receipt:Object.freeze({path:'deliverables/daily-formal-v3-20261008/design/representative-beam-03/candidate-0109.json',sha256:'f6bc864ba20276a564bae82be5160abe382419df73f6ab517d4bec1684a96ac9'}),
 request:Object.freeze({path:ledger+'3872f78a31a608c26419a8179e9e9df5c5568a045c2839616fa1af72464b0042.request.json',sha256:'43bb0b0390282a8b8329b87f5b75451ae51a7b5cec5f92afc2aa0dad19529ae5'}),
 result:Object.freeze({path:ledger+'3872f78a31a608c26419a8179e9e9df5c5568a045c2839616fa1af72464b0042.result.json',sha256:'ddc94e0ce1503cbd53149cc4be432880f0be3155ec981c70752e3e16cd31c000'}),
 blocked:Object.freeze({path:ledger+'3872f78a31a608c26419a8179e9e9df5c5568a045c2839616fa1af72464b0042.blocked.json',sha256:'35d787f20d552d7b38dd83303239fd0e7c9168e36fe54c1cd82b3f79175de053'})}),
});
export const ORIGINAL_SOURCE60_GUARD=Object.freeze({path:'tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',sha256:'9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3'});
const METHOD='plain-optional-gesture-monotone-clear-identical-body-quotient-v3';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=value=>assert(/^[a-f0-9]{64}$/.test(value??''),'Expected SHA256');
const positive=(value,label)=>assert(Number.isSafeInteger(value)&&value>0,label);
const nonnegative=(value,label)=>assert(Number.isSafeInteger(value)&&value>=0,label);

export function assertOriginalRawPlainSource60EvidenceV198(q,math,{original,request,result,blocked}){
 const pin=RAW_PLAIN_SOURCE60_HISTORICAL_RECEIPTS[original.sourceLevelId];assert(pin,'Unreviewed raw receipt family');
 assert.equal(math.evidenceKind,RAW_PLAIN_SOURCE60_EVIDENCE_KIND);
 assert.equal(original.status,'NEW_BEAM_INPUT_NOT_D3');
 assert.equal(original.accepted,false);assert.equal(original.formalReady,false);
 assert.equal(result.accepted,false);assert.equal(result.status,original.status);
 assert.deepEqual(blocked,{attemptId:request.id,status:original.status},'Original failed identity remains blocked against new search');
 assert.equal(Object.hasOwn(original,'L'),false);assert.equal(Object.hasOwn(original,'U'),false);
 assert.equal(original.actualU,pin.U);assert.equal(q.L,pin.L);assert.equal(q.U,pin.U);
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
 assert.equal(proof.status,'relaxed-shortcut');assert.equal(proof.thresholdProven,false);
 assert.equal(proof.termination,'relaxed-completion');
 assert.equal(proof.routeTermination,'minimum-relaxed-route-found');
 positive(proof.floor,'Original requested floor');positive(proof.certifiedFloor,'Certified floor');positive(proof.cost,'Minimum relaxed cost');
 assert.equal(proof.floor,pin.originalRequestedFloor);assert.equal(proof.certifiedFloor,pin.L);assert.equal(proof.cost,pin.U);
 assert.equal(proof.certifiedFloor,proof.cost);assert(proof.certifiedFloor<proof.floor);
 // In frozen boundedPlainTask, every lower-cost BFS layer was exhausted before
 // this first complete route. certifiedFloor and cost are both 29. The false
 // threshold flag rejects requested 31, not the completed minimum proof of 29.
 // Never turn this branch into a generic acceptance of partial/UNKNOWN floors.
 assert.equal(q.L,proof.certifiedFloor);assert.equal(q.U,proof.cost);
 assert.deepEqual(proof.drags,original.drags);
 for(const [field,value]of Object.entries(proof))if(/(?:States|Transitions|Visits|Calls|Removals|Checks)$/.test(field))nonnegative(value,field);
 for(const field of ['rawFullBoardStates','rawExploredStates','discoveredStates','exploredStates','visitedStates'])nonnegative(proof[field],field);
 positive(proof.rawFullBoardStates,'Initial full board must be counted');
 assert.equal(proof.discoveredStates,proof.rawFullBoardStates);assert.equal(proof.visitedStates,proof.rawFullBoardStates);
 assert.equal(proof.exploredStates,proof.rawExploredStates);assert(proof.rawExploredStates<=proof.rawFullBoardStates);
 const caps={maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000};
 assert.deepEqual(Object.keys(proof.budget).sort(),Object.keys(caps).sort());
 for(const [key,cap]of Object.entries(caps)){positive(proof.budget[key],key);assert(proof.budget[key]<=cap,key);}
 assert(proof.rawFullBoardStates<=proof.budget.maxStates);assert(proof.rawFullBoardStates+1<=10000,'Raw boards plus conservative terminal reserve exceed 10000');
 assert.equal(proof.rawFullBoardStates,pin.raw);assert.equal(proof.budget.maxStates,9999);
 const guard={version:'raw-set-9999-plus-one-terminal-candidate-v1',wrapper:ORIGINAL_SOURCE60_GUARD,
  frozenProofToolchainSha256:ORIGINAL_PLAIN_TOOLCHAIN_SHA256,registeredRawSetStates:proof.rawFullBoardStates,
  registeredExpandedStates:proof.rawExploredStates,registeredSetBudget:9999,unregisteredTerminalWorldAllowance:1,
  conservativeFullBoardStateUpperBound:proof.rawFullBoardStates+1,hardWholeBoardLimit:10000,exactFullBoardVisitedCountClaimed:false,
  terminalBehavior:'first-unregistered-world-throws-and-immediately-returns-no-recovery-or-continuation'};
 assert.deepEqual(proof.guardAllowance,guard,'Keep the original executed guard receipt');assert.deepEqual(math.guardAllowance,guard);
 assert.deepEqual(math.budgetReview,{source:'read-only completed minimum below old requested floor',proofGuardOriginallyPresent:true,originalGuardWrapperExecuted:true,
  raw:proof.rawFullBoardStates,conservativeFullBoardUpperBound:proof.rawFullBoardStates+1});

 const count=original.drags.length,bodyIds=new Set(original.level.blocks.map(b=>b.id));
 assert.equal(bodyIds.size,original.level.blocks.length);positive(count,'Complete route required');assert.equal(count,pin.totalDrags);
 const canonical=original.replay,independent=original.independentReplay;
 for(const replay of [canonical,independent]){
  assert.equal(replay.valid,true);assert.equal(replay.complete,true);assert.equal(replay.effectiveDrags,count);
  assert.equal(replay.nonClearingDrags,original.actualU);assert.equal(replay.clearEvents,bodyIds.size);
 }
 assert.equal(independent.failed,false);assert.equal(independent.error,null);
 assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
 assert.equal(independent.animationPolicy,'complete-each-departure-before-next-gesture');
 assert.equal(independent.timeValidated,false,'Stored original replay is not natural-time acceptance');
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
 assert.equal(cleared,bodyIds.size);assert.equal(nonClearing,original.actualU);assert.equal(removed.size,bodyIds.size);
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
 for(const [key,value]of Object.entries({originalAccepted:false,originalStatus:original.status,originalThresholdProven:false,lowerBoundBasis:'completed-bfs-minimum-certifiedFloor',
  originalRequestedFloor:proof.floor,certifiedFloor:proof.certifiedFloor,lowerStatus:proof.status,
  lowerTermination:proof.termination,routeTermination:proof.routeTermination,method:proof.abstraction,rawFullBoardStates:proof.rawFullBoardStates,
  proofInputLevelSha256:levelHash,projectedLevelSha256:null,lowerEvidenceSha256:levelSha256(proof),canonicalValidComplete:true,
  independentValidComplete:true,completeOriginalInventory:true}))assert.equal(math[key],value,key);
 return{evidenceKind:RAW_PLAIN_SOURCE60_EVIDENCE_KIND,levelSha256:levelHash,routeSha256:routeHash,attemptId:request.id,
  originalRequestedFloor:proof.floor,certifiedFloor:proof.certifiedFloor,L:q.L,U:q.U,totalDrags:count,
  rawFullBoardStates:proof.rawFullBoardStates,conservativeFullBoardUpperBound:proof.rawFullBoardStates+1,
  originalGuard:true,originalAccepted:false,originalStatus:original.status,originalFailureRetained:true,originalThresholdProven:false,lowerBoundBasis:'completed-bfs-minimum-certifiedFloor',originalProofFieldsUnchanged:true,storedDualReplayComplete:true,toolchainSha256:original.proofToolchainSha256};
}

export async function verifyOriginalRawPlainSource60EvidenceFilesV198(q,math){
 const fileBindings={};
 const read=async descriptor=>{assert(typeof descriptor?.path==='string');hash(descriptor.sha256);const bytes=await fs.readFile(descriptor.path);
  assert.equal(sha(bytes),descriptor.sha256,descriptor.path);fileBindings[descriptor.path]=descriptor.sha256;return JSON.parse(bytes);};
 assert(q.historicalProof,'An immutable historical raw receipt is required');
 const pin=RAW_PLAIN_SOURCE60_HISTORICAL_RECEIPTS[q.sourceLevelId];assert(pin,'Unreviewed raw receipt family');
 assert.deepEqual(math.historicalReceipt,pin.receipt);assert.deepEqual(math.request,pin.request);assert.deepEqual(math.result,pin.result);assert.deepEqual(math.blocked,pin.blocked);
 assert.deepEqual(math.historicalReceipt,{path:q.historicalProof.path,sha256:q.historicalProof.sha256});
 const original=await read(math.historicalReceipt),request=await read(math.request),result=await read(math.result),blocked=await read(math.blocked);
 assert.equal(path.basename(math.request.path),request.id+'.request.json');assert.equal(path.basename(math.result.path),request.id+'.result.json');
 assert.equal(path.basename(math.blocked.path),request.id+'.blocked.json');
 const summary=assertOriginalRawPlainSource60EvidenceV198(q,math,{original,request,result,blocked});
 assert.equal(sha(await fs.readFile(ORIGINAL_SOURCE60_GUARD.path)),ORIGINAL_SOURCE60_GUARD.sha256,'Original guard wrapper drift');
 fileBindings[ORIGINAL_SOURCE60_GUARD.path]=ORIGINAL_SOURCE60_GUARD.sha256;
 for(const [relative,expected]of Object.entries(original.proofToolchainBindings)){
  assert(!path.isAbsolute(relative));const root=path.resolve(ORIGINAL_PLAIN_TOOLCHAIN_ROOT),file=path.resolve(root,relative);
  assert(file.startsWith(root+path.sep),'Original closure must stay under frozen root');
  assert.equal(sha(await fs.readFile(file)),expected,'Original frozen toolchain drift: '+relative);fileBindings[file]=expected;
 }
 return{...summary,fileBindings,originalToolchainFilesChecked:36};
}

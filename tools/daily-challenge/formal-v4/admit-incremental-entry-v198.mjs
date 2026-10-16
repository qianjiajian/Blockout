import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {levelSha256,routeSha256,mechanismsUsedByDailyCandidate} from '../formal-v2/contract.mjs';
import {loadDailyDifficultyPolicyV198} from './difficulty-policy-v198.mjs';

// One verified original object at a time. No generation, proof rewriting, or
// invented placeholder slots. Runtime acceptance must precede registration;
// formal-entry acceptance remains a separate, actual UI step.
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async(path,expected)=>{const b=await fs.readFile(path);if(expected)assert.equal(sha(b),expected,path);return{path,sha256:sha(b),value:JSON.parse(b)};};

/** Read-only admission check. Stored ledger outcomes, the actual lower input
 * and any projection must agree with the receipt, not merely its summary.
 * This never runs a model, projection builder, search or replay. */
export function assertOriginalMathematicalEvidenceV198(q,math,{original,request,result}){
 assert.equal(levelSha256(q.level),q.levelSha256);
 assert.equal(original.levelSha256,q.levelSha256);assert.equal(levelSha256(original.level),q.levelSha256);
 assert.equal(original.L,q.L);assert.equal(original.U,q.U);
 assert.equal(original.routeSha256,q.routeSha256);assert.equal(routeSha256(original.drags),q.routeSha256);
 assert.equal(original.accepted,true);assert.equal(result.accepted,true);
 assert.equal(request.levelSha256,q.levelSha256);assert.equal(result.levelSha256,q.levelSha256);
 assert.equal(request.id,original.attempt?.id,'Original attempt identity');
 if(math.attemptId!==undefined)assert.equal(math.attemptId,request.id);
 const lower=original.lowerBound,proof=result.lower;
 assert(lower&&proof,'Original lower evidence required');assert.deepEqual(lower.result,proof,'Ledger lower must exactly equal original receipt lower');
 assert.equal(lower.inputLevelSha256,q.levelSha256);assert.equal(lower.requiredFloor,q.L);
 assert.equal(proof.status,'threshold-proven');assert.equal(proof.thresholdProven,true);
 assert.equal(proof.termination,'below-threshold-exhausted');assert.equal(proof.floor,q.L);
 assert(Number.isSafeInteger(proof.certifiedFloor)&&proof.certifiedFloor>=q.L,'Certified floor cannot be partial');
 assert.equal(math.lowerStatus,proof.status);assert.equal(math.lowerTermination,proof.termination);
 assert.equal(math.method,lower.method);assert.equal(math.rawFullBoardStates,proof.rawFullBoardStates);
 if(math.lowerEvidenceSha256!==undefined)assert.equal(math.lowerEvidenceSha256,levelSha256(lower));
 const projection=lower.projection,projectedHash=lower.projectedLevelSha256??null;
 if(projection){
  assert.equal(projection.sourceLevelSha256,q.levelSha256);
  assert.equal(projection.projectedLevelSha256,projectedHash);assert.equal(levelSha256(projection.projectedLevel),projectedHash);
  assert.equal(projection.upperBoundTransfer,false,'A relaxed lower cannot replace the original upper');
  assert.equal(proof.sourceLevelSha256,projectedHash,'Proof must bind the actual projected object');
 }else{assert.equal(projectedHash,null);assert.equal(proof.sourceLevelSha256,q.levelSha256);}
 assert.equal(math.projectedLevelSha256??null,projectedHash);assert.equal(math.proofInputLevelSha256,proof.sourceLevelSha256);
 for(const name of ['rawFullBoardStates','rawExploredStates','discoveredStates','exploredStates','visitedStates']){
  assert(Number.isSafeInteger(proof[name])&&proof[name]>=0,`Invalid original state count: ${name}`);
 }
 for(const [name,value]of Object.entries(proof))if(/(?:States|Transitions|Visits|Calls|Removals|Checks)$/.test(name)){
  assert(Number.isSafeInteger(value)&&value>=0,`Invalid original accounting: ${name}`);
 }
 assert.equal(proof.discoveredStates,proof.rawFullBoardStates);assert.equal(proof.visitedStates,proof.rawFullBoardStates);
 assert.equal(proof.exploredStates,proof.rawExploredStates);assert(proof.rawExploredStates<=proof.rawFullBoardStates);
 assert(Number.isSafeInteger(proof.budget?.maxStates)&&proof.budget.maxStates>=1&&proof.budget.maxStates<=10000);
 assert(proof.rawFullBoardStates<=proof.budget.maxStates);
 assert.equal(math.canonicalValidComplete,true);assert.equal(math.independentValidComplete,true);assert.equal(math.completeOriginalInventory,true);
 const guard=proof.guardAllowance;
 if(guard){
  assert.deepEqual(math.guardAllowance,guard,'Summary cannot invent or replace a guard');
  assert.equal(guard.version,'raw-set-9999-plus-one-terminal-candidate-v1');
  assert.equal(guard.registeredRawSetStates,proof.rawFullBoardStates);assert.equal(guard.registeredExpandedStates,proof.rawExploredStates);
  assert.equal(guard.registeredSetBudget,proof.budget.maxStates);assert(guard.registeredSetBudget<=9999);
  assert.equal(guard.unregisteredTerminalWorldAllowance,1);assert.equal(guard.hardWholeBoardLimit,10000);
  assert.equal(guard.conservativeFullBoardStateUpperBound,proof.rawFullBoardStates+1);
  assert.equal(guard.exactFullBoardVisitedCountClaimed,false);
  assert(guard.conservativeFullBoardStateUpperBound<=10000);
 }else{
  assert.equal(math.guardAllowance,undefined,'Do not retroactively invent a guard');
  const budget=math.budgetReview;
  assert.equal(budget?.source,'read-only successful old proof');assert.equal(budget.proofGuardOriginallyPresent,false);
  assert.equal(budget.originalGuardWrapperExecuted,false);assert.equal(budget.raw,proof.rawFullBoardStates);
  assert.equal(budget.conservativeFullBoardUpperBound,proof.rawFullBoardStates+1);assert(budget.conservativeFullBoardUpperBound<=10000);
 }
 return{levelSha256:q.levelSha256,proofInputLevelSha256:proof.sourceLevelSha256,L:q.L,U:q.U,rawFullBoardStates:proof.rawFullBoardStates,originalGuard:!!guard};
}

export async function admitIncrementalEntryV198(args=process.argv.slice(2)){
const [candidateFile,designFile,runtimeFile,outputFile,qualificationFile]=args;
assert(candidateFile&&designFile&&runtimeFile&&outputFile&&qualificationFile,'candidate, root design disposition, dual runtime report, new registration receipt, checked mathematics qualification required');
const candidate=await read(candidateFile),design=await read(designFile),runtime=await read(runtimeFile),q=candidate.value;
assert.equal(q.schemaVersion,4);assert(q.accepted&&!q.qualificationOnly&&!q.formalReady);
assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
assert(q.staticAudit?.passed&&q.staticAudit.levelSha256===q.levelSha256);
const replay=q.route?.independentReplay??q.freshIndependentReplay;
assert(replay?.valid&&replay.complete&&replay.failed===false&&replay.trace.length===q.drags.length);
assert.equal(replay.remainingBodies,0);assert.equal(replay.remainingQueued,0);assert.equal(replay.nonClearingDrags,q.U);
assert([1,2,3].includes(q.difficulty)&&Number.isSafeInteger(q.L)&&Number.isSafeInteger(q.U));
const difficultyPolicy=await loadDailyDifficultyPolicyV198();
assert(difficultyPolicy.accepts(q.difficulty,q.L,q.U));
const decision=design.value.designAccepted?.find(d=>d.formalId===q.formalId);
assert(decision&&decision.status==='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION','Root same-object design acceptance required');
assert(!design.value.decisions?.some(d=>d.formalId===q.formalId&&d.formalAdoptionAllowed===false),'Held design cannot be admitted');
assert.equal(decision.levelSha256,q.levelSha256);assert.equal(decision.routeSha256,q.routeSha256);
assert.equal(decision.receipt.sha256,candidate.sha256);await read(decision.receipt.path,candidate.sha256);
await read(decision.review.path,decision.review.sha256);
const toolchain=q.toolchainSha256??q.historicalProof?.proofToolchainSha256;
assert(/^[a-f0-9]{64}$/.test(toolchain??''),'Original mathematical toolchain required');
const qualification=await read(qualificationFile),qualified=qualification.value.rows?.find(r=>r.formalId===q.formalId);
assert(qualified?.qualified===true);assert.deepEqual(qualification.value.errors,[]);
assert.equal(qualified.candidate.sha256,candidate.sha256);await read(qualified.candidate.path,candidate.sha256);
for(const key of ['levelSha256','routeSha256','L','U','sourceLevelId','stageKey','difficulty','slot'])assert.equal(qualified[key],q[key],key);
assert.equal(qualified.totalDrags,q.drags.length);assert.equal(qualified.toolchainSha256,toolchain);
assert.equal(qualified.designAcceptance.rootDisposition.sha256,design.sha256);
for(const[file,hash]of Object.entries(qualification.value.fileBindings))assert.equal(sha(await fs.readFile(file)),hash,file);
const math=qualified.mathematicalEvidence;
const request=await read(math.request.path,math.request.sha256),result=await read(math.result.path,math.result.sha256);
const original=q.lowerBound?q:(await read(q.historicalProof.path,q.historicalProof.sha256)).value;
if(math.historicalReceipt){const historical=await read(math.historicalReceipt.path,math.historicalReceipt.sha256);assert.deepEqual(historical.value,original);}
const originalMathematics=assertOriginalMathematicalEvidenceV198(q,math,{original,request:request.value,result:result.value});
assert.equal(runtime.value.status,'INCREMENTAL_CANDIDATES_CURRENT_POINTER_RUNS_PASS');
const rows=runtime.value.results.filter(r=>r.formalId===q.formalId);
assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.viewport).sort((a,b)=>a.width-b.width),[{width:320,height:568},{width:496,height:1078}]);
for(const [file,hash]of Object.entries(runtime.value.bindings))assert.equal(sha(await fs.readFile(file)),hash,file);
for(const row of rows){
 const {value:p}=await read(row.report.path,row.report.sha256);
 assert.equal(p.status,'CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS');assert.deepEqual(p.viewport,row.viewport);
 assert.equal(p.receipt.sha256,candidate.sha256);assert.equal(p.levelSha256,q.levelSha256);assert.equal(p.routeSha256,q.routeSha256);
 assert(p.pointerValidated&&p.timeValidated&&p.settlementValidated&&p.naturalClock&&!p.clockMocked);
 assert.equal(p.totalDrags,q.drags.length);assert.equal(p.U,q.U);
 assert(p.finalPuzzle.complete&&!p.finalPuzzle.failed&&!p.finalPuzzle.blocks&&!p.finalPuzzle.queuedBlocks);
 assert(p.drawAudit.calls>0&&!p.drawAudit.rotated&&!p.drawAudit.canvasRotationCalls);
 assert.deepEqual(p.errors,[]);assert.deepEqual(p.storageViolations,[]);
 for(const image of Object.values(p.screenshots))assert.equal(sha(await fs.readFile(image.path)),image.sha256);
}
const manifest=await read('docs/rules/manifest.json');
assert(manifest.value.versions.some(row=>row.version===difficultyPolicy.version),'Difficulty rule must be registered');
const admittedInRevision=levelSha256({difficultyPolicyVersion:difficultyPolicy.version,ruleVersion:manifest.value.activeVersion,formalId:q.formalId,layoutSha256:q.levelSha256,
 proof:candidate.sha256,design:design.sha256,runtime:runtime.sha256});
const entry={formalId:q.formalId,stageKey:q.stageKey,difficulty:q.difficulty,slot:q.slot,sourceLevelId:q.sourceLevelId,
 layoutSha256:q.levelSha256,admittedInRevision,dailyMechanisms:mechanismsUsedByDailyCandidate(q.level),level:q.level,
 proof:{levelSha256:q.levelSha256,sourceLevelId:q.sourceLevelId,lowerBound:q.L,upperBound:q.U,
  routeReplayComplete:true,reportSha256:candidate.sha256,routeSha256:q.routeSha256,toolchainSha256:toolchain},
 acceptance:{levelSha256:q.levelSha256,designReportSha256:design.sha256,runtimeReportSha256:runtime.sha256,
  dualScreenPointer:true,naturalTime:true,fullInventory:true,settlement:true}};
const dataFile='src/core/formalDailyChallenge300Data.ts',before=await fs.readFile(dataFile,'utf8');
const marker='export const FORMAL_DAILY_300_ENTRIES: readonly FormalDaily300Entry[] = Object.freeze(';
const start=before.indexOf(marker);assert(start>=0);const end=before.lastIndexOf(');');assert(end>start);
const entries=JSON.parse(before.slice(start+marker.length,end));
assert.equal(levelSha256(entries),before.match(/FORMAL_DAILY_300_REVISION = "([a-f0-9]{64})"/)[1]);
assert(entries.length<300&&!entries.some(e=>e.formalId===entry.formalId||e.layoutSha256===entry.layoutSha256));
const previousEntryHashes=entries.map(e=>({formalId:e.formalId,sha256:levelSha256(e)}));
entries.push(entry);const revision=levelSha256(entries);
const next=before.slice(0,start).replace(/FORMAL_DAILY_300_REVISION = "[a-f0-9]{64}"/,`FORMAL_DAILY_300_REVISION = "${revision}"`)
 +marker+JSON.stringify(entries,null,2)+before.slice(end);
// Reserve the evidence path before mutation; all earlier evidence is immutable.
await fs.writeFile(outputFile,JSON.stringify({status:'REGISTRATION_PREPARED',formalId:q.formalId},null,2)+'\n',{flag:'wx'});
assert.equal(await fs.readFile(dataFile,'utf8'),before,'Concurrent catalogue mutation');
await fs.writeFile(dataFile,next);
const report={status:'WRITTEN_AWAITING_FORMAL_ENTRY_VERIFICATION',ruleVersion:manifest.value.activeVersion,
 difficultyPolicyVersion:difficultyPolicy.version,difficultyBand:difficultyPolicy.bands[q.difficulty],difficultyPolicyBindings:difficultyPolicy.bindings,
 formalId:q.formalId,stageKey:q.stageKey,difficulty:q.difficulty,slot:q.slot,sourceLevelId:q.sourceLevelId,
 levelSha256:q.levelSha256,routeSha256:q.routeSha256,L:q.L,U:q.U,totalDrags:q.drags.length,
 admittedInRevision,catalogRevision:revision,registeredCount:entries.length,previousEntryHashes,
 inputs:[candidate,design,runtime,qualification].map(({path,sha256})=>({path,sha256})),
 data:{path:dataFile,sha256:sha(next)},dataBeforeSha256:sha(before),
 originalMathematics,
 formalEntryVerified:false,originalReceiptUnchanged:true,playerSaveTouched:false};
await fs.writeFile(outputFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({registration:outputFile,formalId:q.formalId,admittedInRevision,registeredCount:entries.length}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await admitIncrementalEntryV198();

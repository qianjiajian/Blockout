import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {levelSha256,routeSha256,mechanismsUsedByDailyCandidate} from '../formal-v2/contract.mjs';
import {loadDailyDifficultyPolicyV198} from './difficulty-policy-v198.mjs';
import {verifyOriginalRawPlainSource3EvidenceFilesV198} from './raw-plain-source3-evidence-v198.mjs';

// One verified original object at a time. No generation, proof rewriting, or
// invented placeholder slots. Runtime acceptance must precede registration;
// formal-entry acceptance remains a separate, actual UI step.
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async(path,expected)=>{const b=await fs.readFile(path);if(expected)assert.equal(sha(b),expected,path);return{path,sha256:sha(b),value:JSON.parse(b)};};

export async function admitIncrementalRawPlainSource3EntryV198(args=process.argv.slice(2)){
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
const originalMathematics=await verifyOriginalRawPlainSource3EvidenceFilesV198(q,math);
for(const[file,hash]of Object.entries(originalMathematics.fileBindings))assert.equal(qualification.value.fileBindings[file],hash,'Qualification must bind original raw evidence and frozen closure: '+file);
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
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await admitIncrementalRawPlainSource3EntryV198();

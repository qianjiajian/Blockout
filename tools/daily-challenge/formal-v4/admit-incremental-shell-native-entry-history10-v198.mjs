import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {levelSha256,routeSha256,mechanismsUsedByDailyCandidate} from '../formal-v2/contract.mjs';
import {loadDailyDifficultyPolicyV198} from './difficulty-policy-v198.mjs';
import {assertNewShellProvidedNativeReceiptV198,assertOriginalNativeMathematicalEvidenceV198,shellNativeLowerBindingReadPathV198} from './shell-native-execution-evidence-history10-v198.mjs';
export {assertOriginalNativeMathematicalEvidenceV198};

// SOURCE ONLY: enabling requires root's full review of the native proof,
// current-UI qualification and admission chain. No import starts admission.
export const NATIVE_ADMISSION_READY=false;
export const NATIVE_QUALIFICATION_VERSION='shell-provided-native-original-evidence-current-ui-qualification-v198-history10-catalog-copy-01';
export const NATIVE_QUALIFICATION_STATUS='SHELL_PROVIDED_NATIVE_V198_ORIGINAL_EVIDENCE_CURRENT_POINTER_QUALIFIED';

// One verified original object at a time. No generation, proof rewriting, or
// invented placeholder slots. Runtime acceptance must precede registration;
// formal-entry acceptance remains a separate, actual UI step.
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async(path,expected)=>{const b=await fs.readFile(path);if(expected)assert.equal(sha(b),expected,path);return{path,sha256:sha(b),value:JSON.parse(b)};};

/** Pure saved-metadata gate. It neither evaluates a game model nor treats a
 * native primitive's qualification-only flags as production acceptance. The
 * exact original mathematical envelope is checked by the shared native helper. */
export function assertNativeAdmissionQualificationV198(report,q,candidate,design,runtime){
 assert.equal(report.schemaVersion,1);assert.equal(report.version,NATIVE_QUALIFICATION_VERSION);
 assert.equal(report.status,NATIVE_QUALIFICATION_STATUS);assert.equal(report.activeRuleVersion,'1.198.0');
 assert.equal(report.proofKind,'native-full-layers');
 assert.deepEqual(report.errors,[]);assert(Array.isArray(report.rows)&&report.rows.length===1,'One native object per qualification');
 for(const k of ['formalReady','registrationPerformed','oldEvidenceChanged'])assert.equal(report[k],false,k);
 for(const k of ['newSearches','newModels','newReplays','newClaims'])assert.equal(report[k],0,k);
 assert.deepEqual(report.candidatePointer,runtime,'Qualification and admission must bind the same Pointer report');
 const row=report.rows[0];assert.equal(row.qualified,true);assert.deepEqual(row.candidate,candidate);
 for(const key of ['formalId','levelSha256','routeSha256','L','U','sourceLevelId','stageKey','difficulty','slot'])assert.equal(row[key],q[key],key);
 assert.equal(row.totalDrags,q.drags.length);assert.equal(row.toolchainSha256,q.toolchainSha256);
 assert.deepEqual(row.designAcceptance.rootDisposition,design);
 assert.equal(row.designAcceptance.status,'DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION');
 assert.equal(row.difficultyPolicy.version,'1.198.0');assert.equal(row.difficultyPolicy.actualProofValuesUnchanged,true);
 assert.deepEqual(row.difficultyPolicy.band,q.band);
 assert.equal(row.mathematicalEvidence.projectedLevelSha256,null,'Native qualification cannot use a projected lower');
 assert.equal(row.mathematicalEvidence.lowerTermination,'all-costs-below-floor-exhausted');
 assert.equal(row.mathematicalEvidence.proofInputLevelSha256,q.levelSha256);
 assert(report.fileBindings&&typeof report.fileBindings==='object'&&!Array.isArray(report.fileBindings));
 return row;
}

export async function admitIncrementalShellNativeEntryV198(args=process.argv.slice(2)){
assert.equal(NATIVE_ADMISSION_READY,true,'Native admission is not independently enabled');
assert.equal(args.length,5,'Exactly one candidate/design/runtime/output/qualification set required');
const [candidateFile,designFile,runtimeFile,outputFile,qualificationFile]=args;
assert(candidateFile&&designFile&&runtimeFile&&outputFile&&qualificationFile,'candidate, root design disposition, dual runtime report, new registration receipt, checked mathematics qualification required');
const candidate=await read(candidateFile),design=await read(designFile),runtime=await read(runtimeFile),q=candidate.value;
assert.equal(q.schemaVersion,4);assert(q.accepted&&!q.qualificationOnly&&!q.formalReady);
const nativeReceipt=assertNewShellProvidedNativeReceiptV198(q);
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
const toolchain=q.toolchainSha256;assert(!Object.hasOwn(q,'historicalProof'),'Native admission requires the new original receipt');
assert(/^[a-f0-9]{64}$/.test(toolchain??''),'Original mathematical toolchain required');
const qualification=await read(qualificationFile),descriptor=({path,sha256})=>({path,sha256});
const qualified=assertNativeAdmissionQualificationV198(qualification.value,q,descriptor(candidate),descriptor(design),descriptor(runtime));
assert(qualified?.qualified===true);assert.deepEqual(qualification.value.errors,[]);
assert.equal(qualified.candidate.sha256,candidate.sha256);await read(qualified.candidate.path,candidate.sha256);
for(const key of ['levelSha256','routeSha256','L','U','sourceLevelId','stageKey','difficulty','slot'])assert.equal(qualified[key],q[key],key);
assert.equal(qualified.totalDrags,q.drags.length);assert.equal(qualified.toolchainSha256,toolchain);
assert.equal(qualified.designAcceptance.rootDisposition.sha256,design.sha256);
for(const[file,hash]of Object.entries(qualification.value.fileBindings))assert.equal(sha(await fs.readFile(file)),hash,file);
const math=qualified.mathematicalEvidence;
const request=await read(math.request.path,math.request.sha256),result=await read(math.result.path,math.result.sha256);
const original=q;
if(math.historicalReceipt){const historical=await read(math.historicalReceipt.path,math.historicalReceipt.sha256);assert.deepEqual(historical.value,original);}
const originalMathematics=assertOriginalNativeMathematicalEvidenceV198(q,math,{original,request:request.value,result:result.value});
assert.deepEqual(qualification.value.originalMathematics,originalMathematics,'Qualification must retain the exact original native proof summary');
const frozenWorkspace=path.resolve('deliverables/daily-formal-v4-20261008/frozen-workspace-4588');
for(const[file,hash]of Object.entries(q.lowerBound.bindings)){
 const readPath=shellNativeLowerBindingReadPathV198(file,hash,q,frozenWorkspace);
 assert.equal(sha(await fs.readFile(readPath)),hash,readPath);
}
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
 originalMathematics,nativeReceipt,proofKind:'native-full-layers',
 formalEntryVerified:false,originalReceiptUnchanged:true,playerSaveTouched:false};
await fs.writeFile(outputFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({registration:outputFile,formalId:q.formalId,admittedInRevision,registeredCount:entries.length}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await admitIncrementalShellNativeEntryV198();

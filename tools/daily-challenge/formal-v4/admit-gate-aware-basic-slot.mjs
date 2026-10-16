import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {describeLayout} from '../formal-v3/diversity.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// A read-only mathematical/design admission. It never imports a search or
// attempt-claim API and never modifies the exploratory proof or old selection.
const own='tools/daily-challenge/formal-v4/admit-gate-aware-basic-slot.mjs';
const seed139={path:'deliverables/daily-formal-v4-20261008/selection/prefix-basic-139-01/index.json',
 sha256:'7675b4cea5915e905ee4d44d37ff6fced6458acb16a0535bd2c6c9a8010ae795'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(p,q)=>fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
const bindings={};
const readBound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const b=await fs.readFile(d.path);
 assert.equal(sha(b),d.sha256,d.path);bindings[d.path]=d.sha256;return JSON.parse(b);};
const read=async p=>{const b=await fs.readFile(p);bindings[p]=sha(b);return JSON.parse(b);};
const check=async m=>{for(const [p,h]of Object.entries(m)){assert.equal(sha(await fs.readFile(p)),h,p);
 if(bindings[p])assert.equal(bindings[p],h,`Dependency cannot be rebound: ${p}`);bindings[p]=h;}};
const [selectionPath,selectionSha,selectionAuditPath,selectionAuditSha,mathPath,mathSha,auditPath,auditSha,label]=process.argv.slice(2);
const selection={path:selectionPath,sha256:selectionSha},selectionAudit={path:selectionAuditPath,sha256:selectionAuditSha};
assert(/^[a-z0-9-]+$/.test(label??''));
const mathReceipt={path:mathPath,sha256:mathSha},mathAudit={path:auditPath,sha256:auditSha};
const proof=await readBound(mathReceipt),audit=await readBound(mathAudit),index=await readBound(selection),priorAudit=await readBound(selectionAudit);
assert.equal(priorAudit.status,'INDEPENDENT_CONSTRAINT_ACTUAL_BATCH_AUDIT_COMPLETE');
assert.deepEqual(priorAudit.selection,selection);assert.equal(priorAudit.combinedCandidates,index.files.length);
assert.equal(priorAudit.newSearches,0);assert.deepEqual(priorAudit.errors,[]);await check(priorAudit.inputBindings);
assert.equal(index.scope,300);assert(index.files.length>=140&&index.files.length<=146);
const seed=await readBound(seed139);assert.deepEqual(index.files.slice(0,139),seed.files);const previousCount=index.files.length;
assert.equal(audit.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(audit.errors,[]);assert.equal(audit.newSearches,0);
assert(audit.results.some(r=>r.file===mathPath&&r.sha256===mathSha&&r.accepted&&r.L===31&&r.U===proof.U));
await check(audit.fileBindings);const completion=await readBound(audit.completion);
assert.equal(completion.status,'FINITE_FIRST_PREFIX_TAIL_BATCH_FINISHED');
assert(completion.results.some(r=>r.file===mathPath&&r.sha256===mathSha&&r.accepted));
assert.equal(proof.status,'EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU');assert(proof.accepted&&proof.mathematicalEvidenceValidated);
assert.equal(proof.qualificationOnly,false);assert.equal(proof.catalogEligible,false);assert.equal(proof.formalReady,false);
assert.equal(proof.levelSha256,levelSha256(proof.level));assert.equal(proof.routeSha256,routeSha256(proof.drags));
assert.equal(proof.L,31);assert(Number.isSafeInteger(proof.U)&&proof.U>=31);
const runtime=await loadV4CatalogRuntime();assert.deepEqual(proof.toolchainBindings,runtime.toolchainBindings);
for(const field of ['policyRuleVersion','policyRuleSha256','mathRuleVersion','mathRuleSha256','toolchainSha256'])assert.equal(proof[field],runtime[field]);
await check(proof.designBindings);await check(runtime.designBindings);
const environment=prefixExecutionEnvironment(runtime,proof.executionEnvironment.descriptor);assert.deepEqual(environment,proof.executionEnvironment);
const currentSource=await currentMainlineSourceBinding(runtime,environment,proof.sourceLevelId);await check(currentSource.bindings);
assert.equal(currentSource.sourceLevelSha256,proof.plan.sourceLevelSha256);
const source=runtime.LEVELS.find(l=>l.id===proof.sourceLevelId);assert.equal(boardBaselineSha256(source),boardBaselineSha256(proof.level));
const request=await read(`${PUBLIC_ATTEMPT_LEDGER}/${proof.attempt.id}.request.json`);
const result=await read(`${PUBLIC_ATTEMPT_LEDGER}/${proof.attempt.id}.result.json`);
assert.deepEqual(request,proof.attempt);assert.equal(request.levelSha256,proof.levelSha256);
assert(result.accepted);assert.equal(result.status,proof.status);assert.equal(result.levelSha256,proof.levelSha256);
assert.deepEqual(result.lower,proof.lowerBound.result);assert.equal(result.upper,null);
const lower=proof.lowerBound.result;
assert.equal(lower.sourceLevelSha256,proof.levelSha256);assert.equal(proof.lowerBound.inputLevelSha256,proof.levelSha256);
assert.equal(lower.status,'threshold-proven');assert(lower.thresholdProven);assert.equal(lower.floor,31);
assert.equal(lower.termination,'below-threshold-exhausted');assert(lower.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
assert(proof.upperConstruction.valid&&proof.upperConstruction.complete);assert.equal(proof.upperConstruction.tailSearches,1);
assert(proof.upperAccounting.conservativeFullBoardStateUpperBound<=10000);assert.equal(proof.plan.tailSearchesMaximum,1);
assert.equal(proof.plan.failedInputContinuationAllowed,false);assert.equal(proof.route.search,null);
const canonical=runtime.replayRevisedRoute(proof.level,proof.drags),independent=independentReplay(runtime,proof.level,proof.drags);
for(const r of [canonical,independent])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===proof.U&&r.effectiveDrags===proof.drags.length);
assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
const selected=[];for(const file of index.files){const q=await read(file);assert(q.accepted);assert.equal(q.levelSha256,levelSha256(q.level));selected.push(q);}
assert(!selected.some(q=>q.levelSha256===proof.levelSha256));
const slot=runtime.slots.find(s=>s.stageKey==='basic-combined'&&s.difficulty===3&&!selected.some(q=>q.formalId===s.formalId));assert(slot);
const candidate={...slot,sourceLevelId:proof.sourceLevelId,level:proof.level};
const staticAudit=await auditV4StaticCandidate(runtime,candidate);assert(staticAudit.passed,JSON.stringify(staticAudit.issues));
const diversity=auditV4Diversity([...selected,candidate],runtime.slots);assert.deepEqual(diversity.reasons,[]);
const visual=await readBound(proof.visualReview);assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');await check(visual.fileBindings);
const preflight=await readBound(proof.preflightAudit);assert.equal(preflight.status,'INDEPENDENT_LATE_PREFIX_STATIC_PASS');assert.deepEqual(preflight.errors,[]);
const input=await readBound(proof.input);assert.equal(input.levelSha256,proof.levelSha256);assert.deepEqual(input.level,proof.level);
assert.equal(input.provenance.allExternalBodiesByteEquivalent,true);assert.equal(input.provenance.newShapeInventory,true);
assert(input.provenance.region.connected&&input.provenance.region.fraction>=.35);assert.equal(input.provenance.knownPrefixIsNotLowerBound,true);
const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),h=sha(await fs.readFile(p));
 if(bindings[p])assert.equal(bindings[p],h,`Compiled dependency changed: ${p}`);bindings[p]=h;}
const record={schemaVersion:4,catalogVersion:'daily-300-catalog-v1',admissionVersion:'gate-aware-basic-readonly-admission-v1',...slot,
 sourceLevelId:proof.sourceLevelId,level:proof.level,levelSha256:proof.levelSha256,drags:proof.drags,routeSha256:proof.routeSha256,L:proof.L,U:proof.U,
 accepted:true,catalogEligible:true,qualificationOnly:false,status:'BASIC_PREFIX_CANDIDATE_ADMITTED_AWAITING_FINAL_POINTER',
 mathematicalProof:mathReceipt,independentMathematicalAudit:mathAudit,inputSelection:selection,inputSelectionAudit:selectionAudit,
 policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
 toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,executionEnvironment:environment,currentSourceBinding:currentSource,
 currentRuntimeValidationClaimed:false,attempt:proof.attempt,lowerBound:proof.lowerBound,route:proof.route,
 freshCanonicalReplay:canonical,freshIndependentReplay:independent,staticAudit,diversity,layout:describeLayout(proof.level),
 designProvenance:input.provenance,visualReview:proof.visualReview,preflightAudit:proof.preflightAudit,
 strength:{kind:'foundation-geometry',newestMechanism:null,advancedPrimaryRequired:false,note:'Merged basic stage; difficulty proven on the entire real opening.'},
 mathematicalEvidenceValidated:true,mechanismStrengthValidated:true,designValidated:true,
 admissionBindings:bindings,admissionToolchainSha256:levelSha256(bindings),newSearches:0,newLedgerClaims:0,
 pointerValidated:false,timeValidated:false,formalReady:false,productionChanged:false};
await check(bindings);
const output=`deliverables/daily-formal-v4-20261008/selection/${label}`;await fs.mkdir(output,{recursive:false});
const file=`${output}/${slot.formalId}.json`;await write(file,record);
await write(`${output}/index.json`,{schemaVersion:4,scope:300,files:[...index.files,file],status:'PARTIAL_CANDIDATES_AWAITING_FINAL_ACCEPTANCE',
 candidateCount:previousCount+1,missing:299-previousCount,inputSelection:selection,priorIndex:selection.path,newAdmission:{path:file,sha256:sha(await fs.readFile(file))},formalReady:false,productionChanged:false});
await write(`${output}/completion.json`,{status:'READONLY_BASIC_PREFIX_SLOT_ADMISSION_COMPLETE',slot,mathReceipt,mathAudit,
 mathematicalProofUnchanged:true,previousSelectionUnchanged:true,previousCount,candidates:previousCount+1,missing:299-previousCount,newSearches:0,newLedgerClaims:0,formalReady:false});
console.log(JSON.stringify({output,formalId:slot.formalId,L:proof.L,U:proof.U,candidates:previousCount+1,formalReady:false}));

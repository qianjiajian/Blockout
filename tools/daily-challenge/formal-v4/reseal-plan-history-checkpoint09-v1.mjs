import fs from 'node:fs/promises';
import {writeHistoryPack,hashJsonStream} from './plan-history-pack-v1.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';

// Administrative-only successor. Importing this module performs no history IO.
// Real execution requires a separately reviewed exact configuration, the final
// CLOSED original execution, and immutable tool qualification. Never prune the
// bundle or merge comparison-only / unsealed construction stock into it.
const P='deliverables/daily-formal-v4-20261008/proof/',T='tools/daily-challenge/formal-v4/';
export const SELF=T+'reseal-plan-history-checkpoint09-v1.mjs';
export const REVIEWER=T+'review-plan-history-checkpoint09-v1.mjs';
export const TEST=T+'plan-history-checkpoint09-v1.test.mjs';
export const OUT=P+'plan-history-checkpoint-09';
export const VERSION='plan-history-checkpoint09-full-event-pack-v1';
export const ORIGINAL={path:P+'plan-history-checkpoint-08/pack/manifest.json',sha256:'812e163a36151a111f6964a1961ac1f2b2870dafa5b895a1cdcaf82c3b52cd27'};
export const ORIGINAL_REVIEW={path:P+'plan-history-checkpoint-08/independent-review.json',sha256:'7511d598c08c61c28e8facd448762b4094cc46c1a6ccd7ca97352d3689e42362'};
export const TOOLS={adapter:{path:T+'plan-history-adapter-v17.mjs',sha256:'3e32bca65ed10fcaefb3f863bc57356d950e1ea05b1a904f69eb8b39f3f3aad3'},pack:{path:T+'plan-history-pack-v1.mjs',sha256:'dc6f5a072859b57c5190ccaf014ecd1a2db79125c8eeca9f7988943b649d084a'},compiler:{path:T+'canonical-history-path-compiled.mjs',sha256:'8682bb896edd01d6204a3c3d6128fd600cc8313aedd44820816c4b494d1e6ed7'}};
export const BUDGET_CONTRACT={path:T+'shell-provided-search-budget-v198.mjs',sha256:'e8908fe72b168bf4879f27c0b506f90a4c4ec32661a8d02781ac5fb17c406117'};
export const ADAPTER_REVIEW={path:P+'plan-history-adapter-v17-independent-01/report.json',sha256:'2f92d87aa78fd73e1f355f52c45c58a6755472673f286244a2cffa79b816d366'};
export const ZERO={newSearches:0,newConstructions:0,newLedgerClaims:0,newModelCalls:0,newCspCalls:0,newReplayCalls:0};
export const MAX_BYTES=500000000; // Old single-JSON cap retained.
export const MAX_PACK_BYTES=2_000_000_000; // New full-value format, explicit aggregate limit.
export const CHUNK_BYTES=16*1024*1024;
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const descriptor=d=>{assert(d&&typeof d.path==='string'&&d.path.length,'Descriptor path required');assert(/^[a-f0-9]{64}$/.test(d.sha256??''),'Descriptor SHA required');};
export const exactKeys=(q,keys)=>assert.deepEqual(Object.keys(q).sort(),[...keys].sort(),'Unexpected schema');
// SOURCE ONLY: author and reviewer must be finalized before implementation review.
// Future report hashes live in an exact external config, avoiding a self-hash cycle.
export const READY=true;
const V='deliverables/daily-formal-v4-20261008';
export const SOURCE_DIRECTORY=V+'/design/shell-d1-09-source2-new-02-execution-01';
export const SOURCE_RUN=P+'shell-source2-d109-provided-new02-run-01';
export const SOURCE_VERSION='single-authored-shell-provided-input-once-v198-history08';
export const SOURCE_EXPERIMENT='shell-d1-09-source2-new-02';
export const SOURCE_RUNNER={path:T+'run-authored-shell-provided-once-v198-history08.mjs',sha256:'806f0bfe2cc245d94b7822329a0864776f6a79f4ab13ce83c6cbc3a868564116'};
export const SOURCE_CONFIG={path:SOURCE_RUN+'/config.json',sha256:'93f712cfa6fbce67c69bbf2fea635d7c1da22661f93eae72602975be58b45ad2'};
export const SOURCE_INPUT={path:V+'/design/shell-d1-09-source2-new-02/input.json',sha256:'723a46182fbb3daeb826a93de6a1e17a32918df9f290b0d40510145d0eeff433'};
export const MINIMUM_HISTORY={path:V+'/design/shell-d1-09-source2-new-01-execution-01/history-report.json',sha256:'45c00d5f8d8039797b5e4eaf5331997c633923b601a33b38174539eb81da2573'};
export const MINIMUM_HEAD='77eef784846322db78015f272eb1369a7537c976d22786c7a82894f7e3eb95ca';
export const FAILED_PARENT={path:V+'/design/shell-d1-09-source2-new-01-execution-01/candidate.json',sha256:'190b097d0cf61087f3f202e780a5d8f5801dc1b5f8bdcf56bf89c23290b68285'};
export const FAILED_PARENT_ID='026638d4da517c51a9352beabcc52ea642430015f41eb05b831ca68d0b023891';
export const SOURCE_REFERENCE={path:'deliverables/daily-formal-v2-20261007/final-qualified/daily-mechanisms-multilayer-shell-15-d1-10.json',sha256:'59cf33a91007ac20eb07d84a6c49be9c0c17a017d19f9e1018e9e0509ebbcb79'};
export const CONFIG_TEMPLATE={version:VERSION,
 latestHistoryReport:{path:SOURCE_DIRECTORY+'/history-report.json',sha256:'PENDING'},
 latestCompletion:{path:SOURCE_DIRECTORY+'/completion.json',sha256:'PENDING'},
 latestExecutionExit:{path:SOURCE_RUN+'/exit.json',sha256:'PENDING'},
 implementationReview:{path:P+'plan-history-checkpoint09-tools-independent-01/report.json',sha256:'PENDING'}};
export function assertCheckpoint09Ready(){assert.equal(READY,true,'Checkpoint09 is SOURCE ONLY; no IO, consumer, pack or output is authorized');}
export function assertConfiguration(c){
 exactKeys(c,Object.keys(CONFIG_TEMPLATE));assert.equal(c.version,VERSION);
 for(const k of ['latestHistoryReport','latestCompletion','latestExecutionExit','implementationReview']){
  descriptor(c[k]);assert.equal(c[k].path,CONFIG_TEMPLATE[k].path,'Only the separately reviewed final source and qualification may be sealed');
 }
 return c;
}
const canonicalValueHash=q=>hashJsonStream(q,{canonical:true}).sha256;
export function assertClosedSource(c,h,done,plan,prior){
 assertConfiguration(c);assert.equal(h.status,'AUTHORED_SHELL_HISTORY_DELTAS_EXPORTED');assert.deepEqual(h.errors,[]);
 assert.deepEqual(h.checkpoint,ORIGINAL);assert.deepEqual(h.checkpointReview,ORIGINAL_REVIEW);
 assert(h.historyScope&&h.historyScope.roots.length===7);assert.equal(h.oldLiveByteIntegrityClaimed,false);
 for(const k of ['newSearches','newConstructions','newLedgerClaims'])assert.equal(h[k],0,'Export metadata execution counter');
 assert.deepEqual(h.priorHistoryReport,MINIMUM_HISTORY);descriptor(h.previousUnsealedHistory);
 for(const k of ['provenance','review'])descriptor(h.comparisonEvidence?.[k]);
 assert(Array.isArray(h.priorHistoryDeltas));assert.equal(h.priorHistoryDeltas.length,24,'Exact pre-run prefix; no truncation or rollback');
 assert(Array.isArray(h.historyDeltas));assert.equal(h.historyDeltas.length,2,'Original construction and mathematical owners both required');
 const ordered=[...h.priorHistoryDeltas,...h.historyDeltas];assert.deepEqual(h.completeHistoryDeltas,ordered);
 assert.equal(new Set(ordered.map(x=>x.descriptor.path)).size,ordered.length,'Duplicate ordered delta');
 for(const x of ordered){descriptor(x.descriptor);descriptor(x.declaredOwner?.definition);assert(['construction','mathematical'].includes(x.declaredOwner.kind));assert(typeof x.declaredOwner.id==='string'&&x.declaredOwner.id.length);assert(typeof x.declaredOwner.namespace==='string'&&x.declaredOwner.namespace.length);}
 assert.equal(h.headSha256,ordered.at(-1).descriptor.sha256);
 assert.equal(prior.status,'AUTHORED_SHELL_HISTORY_DELTAS_EXPORTED');assert.deepEqual(prior.errors,[]);assert.deepEqual(prior.checkpoint,ORIGINAL);assert.deepEqual(prior.checkpointReview,ORIGINAL_REVIEW);
 assert.deepEqual(prior.historyScope,h.historyScope);assert.deepEqual(prior.completeHistoryDeltas,h.priorHistoryDeltas);
 assert.equal(prior.headSha256,MINIMUM_HEAD);assert.equal(prior.completeHistoryDeltas.at(-1).descriptor.sha256,MINIMUM_HEAD);
 assert.deepEqual(prior.comparisonEvidence,h.comparisonEvidence,'Comparison evidence cannot be substituted');
 assert.equal(done.status,'AUTHORED_SHELL_SINGLE_INPUT_CLOSED');assert.equal(done.closed,true);assert.equal(done.normalExportAllowed,true);
 assert.equal(done.restartAllowed,false);assert.equal(done.administrativeError,null);assert.equal(done.newConstructions,0);
 assert.equal(done.unpersistedOriginalMathematicalResult,null);assert.deepEqual(done.unpersistedInputs,[]);
 for(const k of ['consumedInputs','maximumInputs','formedFullWorlds'])assert.equal(done[k],1);
 assert.equal(done.version,SOURCE_VERSION);assert.equal(plan.version,SOURCE_VERSION);assert.equal(done.experimentId,SOURCE_EXPERIMENT);
 for(const k of ['config','plan','input','constructionOwner','mathOwner','receipt','searchAccountingReceipt'])descriptor(done[k]);
 assert.deepEqual(done.config,SOURCE_CONFIG);assert.deepEqual(done.input,SOURCE_INPUT);
 assert.equal(done.plan.path,SOURCE_DIRECTORY+'/plan.json');assert.equal(done.receipt.path,SOURCE_DIRECTORY+'/candidate.json');
 assert.equal(done.searchAccountingReceipt.path,SOURCE_DIRECTORY+'/search-accounting.json');
 assert.deepEqual(done.historyExport,c.latestHistoryReport);assert.deepEqual(done.persistedConstructionWorldFiles,[done.input]);
 assert.deepEqual(plan.config,done.config);assert.deepEqual(plan.input,done.input);assert.equal(plan.experimentId,done.experimentId);
 assert.deepEqual(plan.historyReport,MINIMUM_HISTORY);assert.equal(plan.historyHeadSha256,MINIMUM_HEAD);assert.deepEqual(plan.historyScope,h.historyScope);
 assert.deepEqual(plan.sourceReference,SOURCE_REFERENCE);assert.deepEqual(plan.failedParent.receipt,FAILED_PARENT);assert.equal(plan.failedParent.attemptId,FAILED_PARENT_ID);
 const limits={maximumInputs:1,newConstructions:0,upperCallsMaximum:0,lowerCallsMaximum:1,jointCallsMaximum:0,totalSearchCallsMaximum:1,registeredWorldsPerSearch:9999,terminalAllowancePerSearch:1,fullWorldsPerSearchMaximum:10000,combinedFullWorldsMaximum:10000,upperInternalCanonicalReplaysMaximum:0,finalCanonicalReplaysMaximum:1,finalIndependentReplaysMaximum:1,rawWholeBoardLimit:10000};
 for(const[k,v]of Object.entries(limits))assert.equal(plan[k],v,'Original provided-route accounting contract: '+k);
 for(const k of ['retryAllowed','rebandAllowed','fallbackAllowed'])assert.equal(plan[k],false);
 // Narrowly seals this completed provided-route/lower execution, never a
 // partial administrative failure, UNKNOWN call count or invented zero call.
 assert.equal(done.qualifierEntered,true);assert.equal(done.qualifierReturned,true);assert.equal(done.publicClaimsStarted,1);
 assert.equal(done.mathematicalReceiptPersisted,true);assert.equal(done.accepted,false);assert.equal(done.formalReady,false);
 assert.equal(typeof done.mathematicallyAccepted,'boolean');assert.equal(done.lowerProjectionWorlds,1);
 assert.equal(done.persistedLowerProjectionWorldFields.length,1);
 assert.deepEqual(done.persistedLowerProjectionWorldFields[0].descriptor,done.receipt);
 assert.equal(done.persistedLowerProjectionWorldFields[0].field,'lowerBound.projection.projectedLevel');
 const e=h.parentExecution;assert(e&&typeof e==='object');
 for(const k of ['qualifierEntered','qualifierReturned','publicClaimsStarted','receipt','searchAccounting','searchAccountingReceipt'])assert.deepEqual(e[k],done[k]);
 assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.definition),[done.constructionOwner,done.mathOwner]);
 assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.kind),['construction','mathematical']);
 assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.id),[SOURCE_EXPERIMENT,SOURCE_EXPERIMENT+'-math']);
 return ordered;
}
// Shared IO/schema contract only: author and reviewer each call this using
// separate readers, and independently reconstruct the entire history below.
export async function readClosedSourceEvidence(io,c){
 const h=await io.read(c.latestHistoryReport),done=await io.read(c.latestCompletion),plan=await io.read(done.plan),prior=await io.read(MINIMUM_HISTORY);
 const ordered=assertClosedSource(c,h,done,plan,prior);
 const exit=await io.read(c.latestExecutionExit),executionConfig=await io.read(SOURCE_CONFIG),input=await io.read(SOURCE_INPUT),receipt=await io.read(done.receipt),accounting=await io.read(done.searchAccountingReceipt),parent=await io.read(FAILED_PARENT);
 assert.deepEqual(exit.result,{code:0,signal:null});assert.equal(exit.spawnError,null);assert.equal(exit.restartAllowed,false);assert.deepEqual(exit.config,SOURCE_CONFIG);assert.deepEqual(exit.runner,SOURCE_RUNNER);
 assert(Number.isFinite(Date.parse(exit.startedAt))&&Number.isFinite(Date.parse(exit.endedAt))&&Date.parse(exit.endedAt)>=Date.parse(exit.startedAt));
 descriptor(exit.log);assert.equal(exit.log.path,SOURCE_RUN+'/execution.log');await io.pin(exit.log);await io.pin(SOURCE_RUNNER);await io.pin(SOURCE_REFERENCE);
 assert.equal(executionConfig.version,SOURCE_VERSION);assert.equal(executionConfig.experimentId,SOURCE_EXPERIMENT);assert.deepEqual(executionConfig.input,SOURCE_INPUT);assert.deepEqual(executionConfig.historyReport,MINIMUM_HISTORY);
 assert.deepEqual(executionConfig.failedParentReceipt,FAILED_PARENT);assert.deepEqual(executionConfig.sourceReference,SOURCE_REFERENCE);assert.equal(executionConfig.outputDirectory,SOURCE_DIRECTORY);
 assert.deepEqual(executionConfig.unsealedHistory,h.previousUnsealedHistory);await io.pin(h.previousUnsealedHistory);
 assert.equal(input.formalId,'daily-mechanisms-multilayer-shell-15-d1-09');assert.equal(input.sourceLevelId,2);
 assert.deepEqual(receipt.level,input.level);assert.deepEqual(receipt.drags,input.drags);assert.equal(receipt.levelSha256,canonicalValueHash(input.level));assert.equal(receipt.routeSha256,canonicalValueHash(input.drags));
 assert.equal(plan.providedRouteSha256,receipt.routeSha256);assert.equal(receipt.attempt.redesignOf,FAILED_PARENT_ID);
 assert.equal(parent.attempt.id,FAILED_PARENT_ID);assert.equal(parent.accepted,false);assert.equal(parent.sourceLevelId,2);
 assert.equal(receipt.sourceLevelId,2);assert.equal(receipt.formalId,input.formalId);assert.equal(receipt.accepted,done.mathematicallyAccepted);
 const projection=receipt.lowerBound.projection;assert.equal(projection.method,'opening-outer-bodies-inventory-erasure-v1');assert.equal(projection.upperBoundTransfer,false);
 assert.equal(projection.sourceLevelSha256,receipt.levelSha256);assert.equal(projection.projectedLevelSha256,canonicalValueHash(projection.projectedLevel));
 assert.deepEqual(done.persistedLowerProjectionWorldFields,[{descriptor:done.receipt,field:'lowerBound.projection.projectedLevel',sourceLevelSha256:receipt.levelSha256,levelSha256:projection.projectedLevelSha256}]);
 await io.pin(BUDGET_CONTRACT);
 const {accountShellProvidedSearchReceiptV198}=await import(pathToFileURL(path.resolve(BUDGET_CONTRACT.path)));
 const recomputed=accountShellProvidedSearchReceiptV198(receipt,{entered:true,returned:true,failedParentId:FAILED_PARENT_ID,providedRouteSha256:receipt.routeSha256});
 const {originalReceipt,...recordedAccounting}=accounting;assert.deepEqual(originalReceipt,done.receipt);
 assert.deepEqual(recordedAccounting,recomputed);assert.deepEqual(done.searchAccounting,recomputed);
 assert.equal(accounting.upper.calls,0);assert.equal(accounting.lower.calls,1);assert.equal(accounting.totalSearchCalls,1);assert.deepEqual(accounting.replayCalls,{canonical:1,independent:1});
 const sourceClosure={history:c.latestHistoryReport,completion:c.latestCompletion,executionExit:c.latestExecutionExit,executionConfig:SOURCE_CONFIG,input:SOURCE_INPUT,receipt:done.receipt,
  minimumHistory:MINIMUM_HISTORY,minimumHeadSha256:MINIMUM_HEAD,priorDeltaCount:24,sealedDeltaCount:ordered.length,sourceReference:SOURCE_REFERENCE,failedParent:FAILED_PARENT,failedParentAttemptId:FAILED_PARENT_ID,
  attemptId:receipt.attempt.id,accepted:receipt.accepted,receiptStatus:receipt.status,searchAccountingReceipt:done.searchAccountingReceipt,providedRouteSha256:receipt.routeSha256,
  recordedProof:{L:receipt.L,U:receipt.U,lowerStatus:receipt.lowerBound.result.status,lowerTermination:receipt.lowerBound.result.termination,
   thresholdProven:receipt.lowerBound.result.thresholdProven,certifiedFloor:receipt.lowerBound.result.certifiedFloor,rawFullBoardStates:receipt.lowerBound.result.rawFullBoardStates,
   conservativeFullWorlds:accounting.conservativeFullWorlds,costPresent:Object.hasOwn(receipt.lowerBound.result,'cost'),cost:Object.hasOwn(receipt.lowerBound.result,'cost')?receipt.lowerBound.result.cost:null},
  originalWorldSha256:receipt.levelSha256,projectedWorldSha256:projection.projectedLevelSha256,existingSearchAccountingOnly:true,noFreshMathematicalVerification:true};
 return{h,done,plan,prior,ordered,exit,executionConfig,input,receipt,accounting,sourceClosure};
}
// This compares archived terminal/world facts only. It does not reclassify a
// failed receipt as accepted or grant a future runner permission to reuse it.
export function assertSealedSourceContinuity(state,source,{priorOnly=false}={}){
 const b=state.bundle,worlds=Object.values(b.nearPools).flat();
 const hashes=new Set(worlds.filter(w=>w.sourceLevelId===2||w.level?.id===2).map(w=>canonicalValueHash(w.level)));
 const failed=b.terminalRecords.filter(r=>r.namespace===b.publicNamespace&&r.kind==='mathematical'&&r.result?.value.accepted===false&&hashes.has(r.request.value.levelSha256));
 assert(failed.length>0);for(const r of failed)assert(Number.isFinite(Date.parse(r.request.value.startedAt)));
 failed.sort((a,z)=>Date.parse(z.request.value.startedAt)-Date.parse(a.request.value.startedAt));
 assert(failed.length===1||Date.parse(failed[0].request.value.startedAt)>Date.parse(failed[1].request.value.startedAt),'Ambiguous source2 latest failure');
 const parent=b.terminalRecords.find(r=>r.namespace===b.publicNamespace&&r.kind==='mathematical'&&r.request.value.id===FAILED_PARENT_ID);
 assert(parent&&parent.result);assert.equal(parent.result.value.accepted,false);assert.equal(parent.blocked.length,2);assert.equal(parent.lock,null);
 assert(worlds.some(w=>w.descriptor.sha256===FAILED_PARENT.sha256&&w.field==='level'&&canonicalValueHash(w.level)===parent.request.value.levelSha256),'Original failed world may not be omitted');
 const expectedLatest=priorOnly||source.receipt.accepted?FAILED_PARENT_ID:source.receipt.attempt.id;
 assert.equal(failed[0].request.value.id,expectedLatest,'Seal must retain the actual latest failed identity');
 let originalWorld=null,projectedWorld=null,newTerminal=null;
 if(priorOnly){assert.equal(state.headSha256,MINIMUM_HEAD);}
 else{
  assert.equal(state.headSha256,source.h.headSha256);
  newTerminal=b.terminalRecords.find(r=>r.namespace===b.publicNamespace&&r.kind==='mathematical'&&r.request.value.id===source.receipt.attempt.id);
  assert(newTerminal&&newTerminal.result);assert.equal(newTerminal.result.value.accepted,source.receipt.accepted);assert.equal(newTerminal.request.value.redesignOf,FAILED_PARENT_ID);assert.equal(newTerminal.lock,null);
  assert.equal(newTerminal.blocked.length,source.receipt.accepted?0:2);
  const findWorld=field=>{const rows=worlds.filter(w=>w.descriptor.sha256===source.done.receipt.sha256&&w.field===field);assert.equal(rows.length,1,'Exact saved original/projection world required');assert.deepEqual(rows[0].descriptor,source.done.receipt);assert.deepEqual(rows[0].reference,SOURCE_REFERENCE);assert.equal(rows[0].sourceLevelId,2);return rows[0];};
  originalWorld=findWorld('level');projectedWorld=findWorld('lowerBound.projection.projectedLevel');
  assert.deepEqual(originalWorld.level,source.receipt.level);assert.deepEqual(projectedWorld.level,source.receipt.lowerBound.projection.projectedLevel);
  assert.equal(canonicalValueHash(originalWorld.level),newTerminal.request.value.levelSha256);
 }
 return{priorOnly,headSha256:state.headSha256,latestFailedAttemptId:failed[0].request.value.id,failedParentAttemptId:FAILED_PARENT_ID,
  failedParentRequest:parent.request.descriptor,failedParentResult:parent.result.descriptor,failedParentBlocked:parent.blocked.map(x=>x.descriptor),
  newTerminal:newTerminal?{request:newTerminal.request.descriptor,result:newTerminal.result.descriptor,blocked:newTerminal.blocked.map(x=>x.descriptor)}:null,
  originalWorld:originalWorld?{descriptor:originalWorld.descriptor,field:originalWorld.field,sha256:canonicalValueHash(originalWorld.level)}:null,
  projectedWorld:projectedWorld?{descriptor:projectedWorld.descriptor,field:projectedWorld.field,sha256:canonicalValueHash(projectedWorld.level)}:null,
  terminalRecordsSha256:canonicalValueHash(b.terminalRecords),allNearPoolsSha256:canonicalValueHash(b.nearPools),archivedBindingsSha256:canonicalValueHash(b.archivedBindings),
  newMathematicalRoleGranted:false,failedParentRolesMustBeAuthenticatedByConsumer:true};
}
export function membershipDigest(listing,canonical){
 return Object.fromEntries(Object.entries(listing).map(([id,names])=>[id,{count:names.length,canonicalNamesSha256:sha(JSON.stringify(names.map(canonical).sort()))}]));
}
export function assertBundleByteCount(n){assert(Number.isSafeInteger(n)&&n>=0&&n<=MAX_BYTES,'Existing single-JSON byte cap');return n;}
export function expectedPackFiles(manifest){
 assert(Array.isArray(manifest.chunks)&&manifest.chunks.length>0,'Missing pack chunks');
 const files=manifest.chunks.map((c,i)=>{const expected=`chunk-${String(i).padStart(6,'0')}.json`;assert.equal(c.file,expected,'Noncontiguous pack chunk');return expected;});
 return ['manifest.json',...files].sort();
}
export async function assertPackDirectory(directory,manifest){
 const root=await fs.lstat(directory);assert(root.isDirectory()&&!root.isSymbolicLink(),'Pack must be a real directory');
 const expected=expectedPackFiles(manifest),entries=await fs.readdir(directory,{withFileTypes:true});
 assert.deepEqual(entries.map(e=>e.name).sort(),expected,'Extra or missing pack member');
 for(const e of entries){const stat=await fs.lstat(path.join(directory,e.name));assert(e.isFile()&&stat.isFile()&&!stat.isSymbolicLink(),'Pack members must be regular files');}
 return expected;
}
// Deep equality alone ignores object key order; require the exact JSON field
// serialization as well. Release only the newly parsed comparison object.
export function compareEveryCheckpointField(candidate,reconstructed,{consume=false}={}){
 const keys=Object.keys(reconstructed);assert.deepEqual(Object.keys(candidate),keys,'Top-level field order/set changed');const compared=[];
 for(const field of keys){assert.deepEqual(candidate[field],reconstructed[field],'Bundle field changed: '+field);assert.deepEqual(hashJsonStream(candidate[field]),hashJsonStream(reconstructed[field]),'Nested field order or value changed: '+field);compared.push({field,arrayLength:Array.isArray(candidate[field])?candidate[field].length:null});if(consume)delete candidate[field];}
 return compared;
}
export function bridgeFields(c,h,checkpoint,provenance){
 for(const d of [checkpoint,provenance])descriptor(d);
 return{status:'REVIEWED_PLAN_HISTORY_CHECKPOINT09_BRIDGE',errors:[],checkpoint,historyScope:h.historyScope,completeHistoryDeltas:[],headSha256:checkpoint.sha256,comparisonEvidence:h.comparisonEvidence,
  priorHistoryReport:c.latestHistoryReport,priorCompletion:c.latestCompletion,provenance,previousLogicalHeadSha256:h.headSha256,
  originalCheckpoint:ORIGINAL,originalCheckpointReview:ORIGINAL_REVIEW,sourceOrderedDeltas:h.completeHistoryDeltas,minimumHistory:MINIMUM_HISTORY,minimumHeadSha256:MINIMUM_HEAD,minimumPrefixLength:24,sourceExecutionExit:c.latestExecutionExit,
  previousUnsealedHistory:h.previousUnsealedHistory,unsealedHistoryRequiresNewBinding:true,comparisonOnlyFactsMergedIntoSealedBase:false,
  failedParentRolesMustBeAuthenticatedByConsumer:true,oldLiveByteIntegrityClaimed:false,...ZERO};
}
export function makeIO(){
 const bindings={};
 async function bytes(p){const b=await fs.readFile(p),h=sha(b);if(bindings[p])assert.equal(bindings[p],h,'Used evidence drift: '+p);bindings[p]=h;return b;}
 async function read(d){descriptor(d);const b=await bytes(d.path);assert.equal(sha(b),d.sha256,'Descriptor drift: '+d.path);return JSON.parse(b);}
 async function pin(d){descriptor(d);assert.equal(sha(await bytes(d.path)),d.sha256,d.path);}
 async function finalBytes(){for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,'Final used evidence drift: '+p);}
 return{bindings,bytes,read,pin,finalBytes};
}
export async function authenticateTools(io,c,selfURL){
 assert.equal(path.basename(process.cwd()),'frozen-workspace-4588','Only reviewed frozen workspace execution');
 const actual=fileURLToPath(selfURL),self=actual.endsWith(path.basename(REVIEWER))?REVIEWER:SELF;
 assert.equal(await fs.realpath(self),await fs.realpath(actual));
 for(const d of [...Object.values(TOOLS),BUDGET_CONTRACT])await io.pin(d);
 const aq=await io.read(ADAPTER_REVIEW);assert.equal(aq.status,'INDEPENDENT_PLAN_HISTORY_ADAPTER_V17_PASS');assert.equal(aq.productionQualified,true);assert.deepEqual(aq.subject,TOOLS.adapter);
 for(const[p,sha256]of Object.entries(aq.toolBindings))await io.pin({path:p,sha256});
 const q=await io.read(c.implementationReview);assert.equal(q.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT09_TOOLS_PASS');assert.deepEqual(q.errors,[]);assert.equal(q.productionQualified,true);
 assert(q.toolBindings&&Object.keys(q.toolBindings).length>=3);
 for(const p of [SELF,REVIEWER,TEST,BUDGET_CONTRACT.path]){assert(q.toolBindings[p],'Missing independently pinned tool '+p);await io.pin({path:p,sha256:q.toolBindings[p]});}
 for(const[p,sha256]of Object.entries(q.toolBindings))await io.pin({path:p,sha256});
}
export async function listSevenRoots(scope){
 const out={};for(const root of scope.roots){const real=await fs.realpath(root.physicalPath);for(const alias of root.aliases)assert.equal(await fs.realpath(alias),real,'Alias retargeted');const stack=[root.physicalPath],names=[];
  while(stack.length){const dir=stack.pop();for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'Nested alias in historical inventory');const file=path.join(dir,e.name);if(e.isDirectory())stack.push(file);else{assert(e.isFile());names.push(file);}}}out[root.id]=names;}
 return out;
}
export function declaredMembers(state,delta,scope,canonical){
 const out=Object.fromEntries(scope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...state.bundle.files,...delta.files])if(f.rootId!==null){const key=canonical(f.path);assert(!seen.has(key),'Duplicate declared historical member');seen.add(key);assert(out[f.rootId]);out[f.rootId].push(f.path);}return out;
}
export async function writeExclusive(p,q){const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};}

export async function resealCheckpoint09(configDescriptor){
 assertCheckpoint09Ready(); // Fail before configuration IO, reservation or history load.
 const io=makeIO(),phases=[];const c=assertConfiguration(await io.read(configDescriptor));await authenticateTools(io,c,import.meta.url);
 await fs.mkdir(OUT); // Exclusive reservation; never reuse even an incomplete output.
 try{
  const source=await readClosedSourceEvidence(io,c),{h,done,ordered,sourceClosure}=source;
  const oldReview=await io.read(ORIGINAL_REVIEW);assert.equal(oldReview.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(oldReview.errors,[]);assert.equal(oldReview.fullMergedBundleEquality,true);assert.equal(oldReview.allFieldsPreserved,true);assert.equal(oldReview.unknownFieldsAndOrderPreserved,true);assert.deepEqual(oldReview.checkpoint,ORIGINAL);await io.pin(oldReview.provenance);await io.pin(oldReview.authorReport);
  const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,planHistorySummary}=await import(pathToFileURL(path.resolve(TOOLS.adapter.path)));
  const {compileCanonicalHistoryPath}=await import(pathToFileURL(path.resolve(TOOLS.compiler.path)));const canonical=compileCanonicalHistoryPath(h.historyScope).canonical;
  const before=await listSevenRoots(h.historyScope);let state=await consumePlanHistory({checkpoint:ORIGINAL,review:ORIGINAL_REVIEW,expectedScope:h.historyScope,readBytes:io.bytes});
  const keys=Object.keys(state.bundle),owners=[];let priorProtection=null;
  for(const[i,x]of ordered.entries()){
   const delta=await io.read(x.descriptor),definition=await io.read(x.declaredOwner.definition);assert.equal(delta.parentHeadSha256,state.headSha256);assert.deepEqual(delta.owner,x.declaredOwner);
   state=await mergePlanHistoryDelta(state,{...x,listing:declaredMembers(state,delta,h.historyScope,canonical),readBytes:io.bytes});owners.push({delta:x.descriptor,declaredOwner:x.declaredOwner,definition});
   if(i===23)priorProtection=assertSealedSourceContinuity(state,source,{priorOnly:true});
   const phase={phase:'CHECKPOINT09_AUTHOR_METADATA_MERGE',number:i+1,total:ordered.length,headSha256:state.headSha256};phases.push(phase);console.log(JSON.stringify(phase));
  }
  assert.equal(state.headSha256,h.headSha256);assert.deepEqual(Object.keys(state.bundle),keys);assertPlanHistoryMembers(state,before);
  assert(priorProtection);const sourceProtection={prior:priorProtection,final:assertSealedSourceContinuity(state,source)};
  const after=await listSevenRoots(h.historyScope);assertPlanHistoryMembers(state,after);const membership=membershipDigest(after,canonical);assert.deepEqual(membership,membershipDigest(before,canonical));
  const summary=planHistorySummary(state.bundle);for(const k of ['baselinePlan','baselineActual','scopeSha256'])assert.deepEqual(summary[k],oldReview.summary[k]);
  const pack=await writeHistoryPack(state.bundle,{directory:OUT+'/pack',chunkTargetBytes:CHUNK_BYTES,maxTotalBytes:MAX_PACK_BYTES});
  const checkpoint={...pack.descriptor,path:OUT+'/pack/manifest.json'};assert.equal(summary.projectionSha256,pack.manifest.canonicalProjectionSha256);
  const packDirectoryFiles=await assertPackDirectory(OUT+'/pack',pack.manifest);
  await io.pin(checkpoint);for(const chunk of pack.manifest.chunks)await io.pin({path:OUT+'/pack/'+chunk.file,sha256:chunk.sha256});
  const provenance={version:VERSION,configuration:configDescriptor,latestHistoryReport:c.latestHistoryReport,latestCompletion:c.latestCompletion,latestExecutionExit:c.latestExecutionExit,originalCheckpoint:ORIGINAL,originalReview:ORIGINAL_REVIEW,originalProvenance:oldReview.provenance,
   sourceClosure,sourceProtection,orderedDeltas:ordered,owners,tools:TOOLS,budgetContract:BUDGET_CONTRACT,adapterQualification:ADAPTER_REVIEW,implementationReview:c.implementationReview,membership,
   continuity:{mergedLogicalHeadSha256:h.headSha256,newCheckpointHeadSha256:checkpoint.sha256,newOrderedDeltas:[],consumerBridgeRequired:true,originalReportUnchanged:true},
   storage:{format:pack.manifest.version,manifest:checkpoint,aggregateLimitBytes:MAX_PACK_BYTES,chunkTargetBytes:CHUNK_BYTES,totalChunkBytes:pack.manifest.totalChunkBytes,logicalJsonBytes:pack.manifest.jsonUtf8Bytes},
   allBundleFieldsPreserved:true,unknownFieldsAndOrderPreserved:true,additionalFieldsOmitted:[],supplementalComparisonMerged:false,comparisonEvidence:h.comparisonEvidence,previousUnsealedHistory:h.previousUnsealedHistory,
   baselineMetadataUnchanged:true,oldLiveByteIntegrityClaimed:false,...ZERO};
  await io.finalBytes();const final=await listSevenRoots(h.historyScope);assertPlanHistoryMembers(state,final);assert.deepEqual(membershipDigest(final,canonical),membership);
  assert.deepEqual(await assertPackDirectory(OUT+'/pack',pack.manifest),packDirectoryFiles);
  const pd=await writeExclusive(OUT+'/reseal-provenance.json',provenance);
  const report={status:'PLAN_HISTORY_CHECKPOINT_RESEALED_AWAITING_INDEPENDENT_REVIEW',configuration:configDescriptor,checkpoint,provenance:pd,latestHistoryReport:c.latestHistoryReport,latestCompletion:c.latestCompletion,latestExecutionExit:c.latestExecutionExit,
   sourceClosure,sourceProtection,originalCheckpoint:ORIGINAL,originalReview:ORIGINAL_REVIEW,exportScript:{path:SELF,sha256:io.bindings[SELF]},orderedDeltas:ordered,mergedHeadSha256:h.headSha256,summary,membership,phases,errors:[],fileBindings:io.bindings,
   allFieldsPreserved:true,projectionSha256Recomputed:true,completeBeforeAfterMembersEqual:true,packDirectoryFiles,independentReviewRequired:true,oldLiveByteIntegrityClaimed:false,exportTimeAllOldRawBytesFullyChecked:false,usedArchiveAndDeltaBytesChecked:true,performanceImprovementMeasured:false,...ZERO};
  const rd=await writeExclusive(OUT+'/report.json',report);return{checkpoint,provenance:pd,report:rd,status:report.status};
 }catch(e){await writeExclusive(OUT+'/incomplete.json',{status:'PLAN_HISTORY_RESEAL_INCOMPLETE',configuration:configDescriptor,errors:[e.stack??String(e)],phases,fileBindings:io.bindings,...ZERO});throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,4,'Immutable configuration path and SHA');console.log(JSON.stringify(await resealCheckpoint09({path:process.argv[2],sha256:process.argv[3]})));}

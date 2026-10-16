import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {VERSION,SELF,PINS,assertAuthoredShellProvidedOnceConfigV198,assertShellHistoryReleaseV198,assertShellCheckpoint10BridgeV198,assertShellProvidedHistoryDescendantV198} from './run-authored-shell-provided-native-once-v198-history10.mjs';
import {SHELL_PROVIDED_NATIVE_SEARCH_LIMITS as SHELL_PROVIDED_SEARCH_LIMITS,SHELL_NATIVE_PROOF_VERSION,assertShellProvidedNativeDomainV198,assertSealedShellProvidedRouteV198,assertShellProvidedNativeMathOptionsV198 as assertShellProvidedMathOptionsV198,accountShellProvidedNativeSearchReceiptV198 as accountShellProvidedSearchReceiptV198} from './shell-provided-native-search-budget-v198.mjs';
import {assertShellOriginalRouteMetadataV198,assertRootShellMechanismReviewV198} from './shell-provided-qualification-metadata-v198.mjs';
export {assertShellOriginalRouteMetadataV198,assertRootShellMechanismReviewV198};
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

// Read-only metadata verification of an already completed, accepted execution.
// No runtime, model, projection, replay, solver, history consumer or claim is
// invoked. The caller's read/bind functions verify actual bytes and include
// every read in its qualification bindings. Old full-history plan.bindings
// are authenticated by the immutable plan and reviewed original execution;
// this module does not claim a second complete history consumption.
// Prepared only: pin the actual independently qualified10 runner before use.
export const NATIVE_EVIDENCE_READY=false;
const REVIEW={path:'deliverables/daily-formal-v4-20261008/proof/authored-shell-provided-native-once-v198-history10-independent-01/report.json',sha256:'a0a706987a0b8c1cacd252fceaa4ceb203c412bead333575f7c7f33c8fafd722'};
const RUNNER_SHA='cd22845c70020e193142856b6b5954556a8683538fbcd6a2b7a7c6e08fce7429';
const TOOLCHAIN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
const valueHash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const descriptor=d=>assert(d&&Object.keys(d).sort().join(',')==='path,sha256'&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact descriptor required');
const key=d=>{descriptor(d);return d.path+'\0'+d.sha256;};
const equalPath=(a,b)=>assert.equal(path.resolve(a).toLowerCase(),path.resolve(b).toLowerCase());

// Pure read-location selection: preserve the original binding key/hash. Only
// exact frozen-core keys are rooted at the historical workspace; native tool
// absolute descriptors remain unchanged. Never normalize an unknown alias into
// an accepted core key or silently read a current-runtime replacement.
export function shellNativeLowerBindingReadPathV198(file,expectedSha,q,frozenWorkspace){
 assert(typeof file==='string'&&file.length>0&&!file.includes('\0'));assert(/^[a-f0-9]{64}$/.test(expectedSha??''));
 assert(q.toolchainBindings&&valueHash(q.toolchainBindings)===TOOLCHAIN&&Object.keys(q.toolchainBindings).length===36,'Exact frozen core required');
 if(Object.hasOwn(q.toolchainBindings,file)){
  assert.equal(q.toolchainBindings[file],expectedSha,'Conflicting native/frozen core binding');
  assert(!path.isAbsolute(file)&&!path.win32.isAbsolute(file)&&!file.includes('\\')&&!file.split('/').some(p=>!p||p==='.'||p==='..'),'Canonical frozen core key required');
  assert(typeof frozenWorkspace==='string'&&path.isAbsolute(frozenWorkspace),'Absolute frozen workspace required');
  const base=path.resolve(frozenWorkspace),target=path.resolve(base,file),relative=path.relative(base,target);
  assert(relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative),'Frozen binding escaped workspace');
  return target;
 }
 assert(path.isAbsolute(file),'Unknown relative native binding');return file;
}

// Pure receipt and original-ledger validation. The inner primitive remains
// qualificationOnly=true; only the surrounding once/public-ledger orchestration
// may have accepted=true and qualificationOnly=false. No flag is rewritten.
export function assertNewShellProvidedNativeReceiptV198(q){
 assert.equal(q.schemaVersion,4);assert.equal(q.contractVersion,SHELL_NATIVE_PROOF_VERSION);assert.equal(q.difficultyPolicyVersion,'1.198.0');
 for(const k of ['accepted','catalogEligible'])assert.equal(q[k],true,k);for(const k of ['qualificationOnly','formalReady','redesignRequired'])assert.equal(q[k],false,k);
 assert.equal(q.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');assert.deepEqual(q.reasons,[]);
 const domain=assertShellProvidedNativeDomainV198(q);
 assert.equal(q.toolchainSha256,TOOLCHAIN);assert.equal(valueHash(q.toolchainBindings),TOOLCHAIN);assert.equal(Object.keys(q.toolchainBindings).length,36);
 assert.equal(q.policyToolchainSha256,valueHash(q.policyBindings));assert(q.policyBindings&&Object.keys(q.policyBindings).length>0);
 for(const h of [q.attempt?.id,q.attempt?.retryIdentitySha256,q.attemptPlan?.redesignOf])assert(/^[a-f0-9]{64}$/.test(h??''));
 assert.equal(q.attempt.identityOrigin,q.attempt.id);assert(!q.attempt.revalidates&&!q.attempt.lockFile);assert.equal(q.attempt.redesignOf,q.attemptPlan.redesignOf);
 assert.equal(q.attemptPlanSha256,valueHash(q.attemptPlan));assert.deepEqual(q.attemptPlan.band,q.band);
 const accounting=accountShellProvidedSearchReceiptV198(q,{entered:true,returned:true,failedParentId:q.attemptPlan.redesignOf,providedRouteSha256:q.routeSha256});
 assert.equal(accounting.totalSearchCalls,1);assert.equal(accounting.upper.calls,0);assert.equal(accounting.lower.calls,1);assert.equal(accounting.lower.accountingStatus,'RECORDED');assert.deepEqual(accounting.replayCalls,{canonical:1,independent:1});
 assert.deepEqual(q.searchAccounting,accounting,'Receipt must preserve the original search accounting');
 const proof=q.lowerBound.result,engine=proof.guardAllowance.engine,nativeBindings={...q.toolchainBindings,[engine.path]:engine.sha256};
 assert.deepEqual(proof.nativeToolchainBindings,nativeBindings);assert.equal(proof.nativeToolchainSha256,valueHash(nativeBindings));
 for(const[p,h]of Object.entries(nativeBindings))assert.equal(q.lowerBound.bindings[p],h,'Native primitive must retain every frozen runtime binding');
 const replay=assertShellOriginalRouteMetadataV198(q);assert.equal(replay.bodies,domain.bodies);assert.equal(replay.layerClearEvents,domain.layers);
 return{accounting,nativeLower:{method:q.lowerBound.method,inputLevelSha256:q.levelSha256,requiredFloor:q.L,retainedBodies:domain.bodies,retainedLayers:domain.layers,projection:null,projectedLevelSha256:null,primitiveQualificationOnly:true}};
}

export function assertOriginalNativeMathematicalEvidenceV198(q,math,{original,request,result}){
 const verified=assertNewShellProvidedNativeReceiptV198(original);
 for(const k of ['levelSha256','routeSha256','L','U','formalId','sourceLevelId','stageKey','difficulty','slot'])assert.equal(q[k],original[k],k);
 assert.equal(valueHash(q.level),q.levelSha256);assert.deepEqual(q.level,original.level);assert.deepEqual(q.drags,original.drags);assert.equal(valueHash(q.drags),q.routeSha256);
 assert.deepEqual(request,original.attempt,'Original public request must exactly match receipt attempt');assert.equal(result.accepted,true);assert.equal(result.status,original.status);assert.equal(result.levelSha256,q.levelSha256);assert.equal(request.levelSha256,q.levelSha256);
 const lower=original.lowerBound,proof=lower.result;assert.deepEqual(result.lower,proof,'Ledger lower must exactly equal unchanged native result');assert.equal(result.upper,null);assert.equal(original.route.search,null);
 assert.equal(lower.requiredFloor,q.L);assert.equal(proof.requiredFloor,q.L);assert.equal(proof.L,q.L);assert.equal(proof.certifiedFloor,q.L);assert.equal(proof.status,'threshold-proven');assert.equal(proof.termination,'all-costs-below-floor-exhausted');assert.equal(proof.inputLevelSha256,q.levelSha256);
 assert.equal(math.attemptId,request.id);assert.equal(math.method,lower.method);assert.equal(math.lowerStatus,proof.status);assert.equal(math.lowerTermination,proof.termination);assert.equal(math.lowerEvidenceSha256,valueHash(lower));
 assert.equal(math.rawFullBoardStates,proof.rawFullBoardStates);assert.equal(math.proofInputLevelSha256,proof.inputLevelSha256);assert.equal(math.projectedLevelSha256,null);assert.deepEqual(math.guardAllowance,proof.guardAllowance);
 for(const k of ['canonicalValidComplete','independentValidComplete','completeOriginalInventory','providedOriginalRoute','originalValuesUnchanged'])assert.equal(math[k],true,k);assert.equal(math.upperSearchCalls,0);assert.equal(math.mathematicalCalls,1);
 return{levelSha256:q.levelSha256,proofInputLevelSha256:proof.inputLevelSha256,projectedLevelSha256:null,L:q.L,U:q.U,rawFullBoardStates:proof.rawFullBoardStates,originalGuard:true,nativeFullLayers:true,conservativeFullWorlds:verified.accounting.conservativeFullWorlds};
}

export function assertShellProvidedNativeCompletionMetadataV198(done,candidateDescriptor){
 descriptor(candidateDescriptor);assert.equal(done.version,VERSION);assert.equal(done.status,'AUTHORED_SHELL_SINGLE_INPUT_CLOSED');
 for(const k of ['closed','normalExportAllowed','qualifierEntered','qualifierReturned','mathematicalReceiptPersisted','mathematicallyAccepted'])assert.equal(done[k],true,k);
 for(const k of ['restartAllowed','accepted','formalReady'])assert.equal(done[k],false,k);
 for(const k of ['consumedInputs','maximumInputs','formedFullWorlds','publicClaimsStarted'])assert.equal(done[k],1,k);
 assert.equal(done.lowerProjectionWorlds,0);assert.deepEqual(done.persistedLowerProjectionWorldFields,[]);
 assert.equal(done.newConstructions,0);assert.equal(done.administrativeError,null);assert.equal(done.unpersistedOriginalMathematicalResult,null);assert.deepEqual(done.unpersistedInputs,[]);assert.deepEqual(done.receipt,candidateDescriptor);
 return true;
}
export function assertShellProvidedNativeWorldMetadataV198(worlds,d,q,reference){
 descriptor(d);descriptor(reference);assert(Array.isArray(worlds)&&worlds.length===1,'Native owner records exactly one unchanged full-layer world');const w=worlds[0];
 assert.deepEqual(w.descriptor,d);assert.equal(w.field,'level');assert.deepEqual(w.level,q.level);assert.equal(w.sourceLevelId,q.sourceLevelId);assert.deepEqual(w.reference,reference);assert.equal(w.fingerprints.levelSha256,valueHash(q.level));
 for(const k of ['levelSha256','designSha256','shapeSha256','colorSha256','retryIdentitySha256','colorAssignments'])assert.deepEqual(w.fingerprints[k],q.attempt[k],k);
 return true;
}

export async function assertShellProvidedNativeExecutionEvidenceV198(q,candidateDescriptor,completionDescriptor,{read,bind}){
 assert.equal(NATIVE_EVIDENCE_READY,true,'Native history10 evidence is SOURCE ONLY: no evidence IO');
 assert(/^[a-f0-9]{64}$/.test(REVIEW.sha256)&&/^[a-f0-9]{64}$/.test(RUNNER_SHA),'Actual10 runner qualification required before evidence IO');
 assert.equal(typeof read,'function');assert.equal(typeof bind,'function');
 const get=async d=>{descriptor(d);return read(d);};
 const map=async m=>{assert(m&&typeof m==='object');for(const[p,h]of Object.entries(m))await bind(p,h);};
 descriptor(candidateDescriptor);descriptor(completionDescriptor);
 assertNewShellProvidedNativeReceiptV198(q);
 assert.deepEqual(await get(candidateDescriptor),q);assert.equal(valueHash(q.level),q.levelSha256);assertSealedShellProvidedRouteV198(q);
 const done=await get(completionDescriptor);
 assertShellProvidedNativeCompletionMetadataV198(done,candidateDescriptor);
 const c=assertAuthoredShellProvidedOnceConfigV198(await get(done.config)),plan=await get(done.plan),input=await get(c.input);
 assert.equal(done.experimentId,c.experimentId);assert.deepEqual(done.input,c.input);assert.deepEqual(done.persistedConstructionWorldFiles,[c.input]);
 equalPath(candidateDescriptor.path,c.outputDirectory+'/candidate.json');equalPath(completionDescriptor.path,c.outputDirectory+'/completion.json');equalPath(done.plan.path,c.outputDirectory+'/plan.json');
 assert.deepEqual(input.level,q.level);assert.deepEqual(input.drags,q.drags);assert.equal(input.routeSha256,q.routeSha256);assert.equal(input.levelSha256,q.levelSha256);assert.equal(input.sourceLevelSha256,q.sourceLevelSha256);
 for(const[k,v]of Object.entries(c.target))assert.equal(q[k],v);assert.equal(input.accepted,false);assert.equal(input.formalReady,false);assert.equal(input.L,null);assert.equal(input.U,null);
 assert.equal(plan.version,VERSION);assert.equal(plan.experimentId,c.experimentId);assert.deepEqual(plan.config,done.config);assert.deepEqual(plan.input,c.input);assert.deepEqual(plan.staticPreflight,c.staticPreflight);assert.deepEqual(plan.sourceReference,c.sourceReference);assert.deepEqual(plan.historyReport,c.historyReport);assert.deepEqual(plan.minimumHistory,PINS.minimumHistory);assert.equal(plan.providedRouteSha256,q.routeSha256);
 for(const[k,v]of Object.entries(SHELL_PROVIDED_SEARCH_LIMITS))assert.deepEqual(plan[k],v,k);assert.equal(plan.maximumInputs,1);assert.equal(plan.newConstructions,0);assert.equal(plan.rawWholeBoardLimit,10000);
 assert.deepEqual(c.runnerReview,REVIEW);const review=await get(REVIEW);
 assert.equal(review.status,'INDEPENDENT_AUTHORED_SHELL_PROVIDED_NATIVE_ONCE_V198_HISTORY10_RUNNER_PASS');assert.equal(review.productionQualified,true);assert.equal(review.executionAllowed,true);assert.deepEqual(review.errors,[]);assert.deepEqual(review.runner,{path:SELF,sha256:RUNNER_SHA});
 assert.deepEqual(review.historyRelease,c.historyRelease);const release=assertShellHistoryReleaseV198(await get(c.historyRelease));
 assert.deepEqual(plan.historyRelease,c.historyRelease);assert.deepEqual(plan.historyBridge,release.historyBridge);
 assert.equal(plan.orchestration.sha256,RUNNER_SHA);equalPath(plan.orchestration.path,path.join(plan.environment.executionWorkspace,SELF));assert.equal(path.basename(plan.environment.executionWorkspace),'frozen-workspace-4588');
 assert.equal(plan.environment.descriptor.sha256,'8d52d96c73b87b9c95207757164d0e95876e3f434f3540750eb605d18d7e2583');const environment=await get(plan.environment.descriptor);
 assert.equal(environment.status,'EXPLICIT_HISTORICAL_MATH_WORKSPACE');assert.equal(environment.currentRuntimeValidationClaimed,false);assert.equal(environment.frozenMath,q.toolchainSha256);equalPath(environment.workspace,plan.environment.executionWorkspace);equalPath(environment.sourceWorkspace,plan.environment.sourceWorkspace);
 assert.equal(plan.environment.mathematicalToolchainSha256,q.toolchainSha256);assert(review.toolBindings&&Object.keys(review.toolBindings).length>0);for(const p of [SELF,'tools/daily-challenge/formal-v4/run-authored-shell-provided-once-v198-history10.mjs','tools/daily-challenge/formal-v4/shell-provided-native-search-budget-v198.mjs','tools/daily-challenge/formal-v4/bounded-qualify-shell-native-v198.mjs','tools/daily-challenge/formal-v4/native-lower-v198.mjs','tools/daily-challenge/formal-v3/bounded-native-lower.mjs'])assert(/^[a-f0-9]{64}$/.test(review.toolBindings[p]??''),'Native control missing from independent review: '+p);assert.equal(review.toolBindings[SELF],RUNNER_SHA);
 for(const[p,h]of Object.entries(review.toolBindings)){assert(!path.isAbsolute(p)&&p.startsWith('tools/')&&!p.includes('..'));await bind(p,h);await bind(path.join(plan.environment.executionWorkspace,p),h);}
 await bind(plan.orchestration.path,plan.orchestration.sha256); // JavaScript bytes, not JSON.
 const prior=await get(c.historyReport),minimum=await get(PINS.minimumHistory),bridge=await get(release.historyBridge),checkpointReview=await get(release.checkpointReview);
 const sealedSourceReceipt=await get(checkpointReview.sourceClosure.receipt);
 assertShellCheckpoint10BridgeV198(release,minimum,checkpointReview,bridge,sealedSourceReceipt);assertShellProvidedHistoryDescendantV198(prior,c.historyReport,release,bridge);
 assert.deepEqual(plan.historyScope,prior.historyScope);assert.equal(plan.historyHeadSha256,prior.headSha256);assert.deepEqual(plan.policy,PINS.policy);await get(PINS.policy);
 const canonicalPath=compileCanonicalHistoryPath(prior.historyScope).canonical;
 const rootFor=p=>prior.historyScope.roots.find(r=>canonicalPath(p).startsWith(canonicalPath(r.physicalPath)+'/'))?.id??null;
 const ledgerNamespaces=['deliverables/daily-formal-v4-20261008/design/late-prefix-construction-ledger','deliverables/daily-formal-v3-20261008/proof/attempts'].map(canonicalPath);
 const preflight=await get(plan.historyPreflight);assert.equal(preflight.headSha256,prior.headSha256);assert.equal(preflight.fresh.freshIdentity,true);assert.equal(preflight.historicalNearIsDiagnosticOnly,true);assert.equal(preflight.sourceSimilarity.footprintSimilarity<=.55,true);
 assert(Array.isArray(preflight.selectedNear)&&preflight.selectedNear.length);for(const row of preflight.selectedNear)assert(Number.isFinite(row.footprintSimilarity)&&row.footprintSimilarity<=row.maximum+1e-12);
 assert.deepEqual(preflight.parent,plan.failedParent);assert.deepEqual(plan.failedParent.receipt,c.failedParentReceipt);assert.equal(plan.failedParent.blocked.length,2);
 assert.equal(plan.failedParent.namespace,ledgerNamespaces[1]);
 const parent=await get(c.failedParentReceipt),parentRequest=await get(plan.failedParent.request),parentResult=await get(plan.failedParent.result);
 assert.equal(parent.accepted,false);assert.equal(parent.sourceLevelId,q.sourceLevelId);assert.deepEqual(parent.attempt,parentRequest);assert.equal(parentRequest.id,plan.failedParent.attemptId);assert.equal(parentRequest.levelSha256,parent.levelSha256);assert.equal(parentResult.accepted,false);assert.equal(parentResult.levelSha256,parent.levelSha256);
 for(const d of plan.failedParent.blocked){const b=await get(d);assert.equal(b.attemptId,parentRequest.id);assert.equal(b.status,parentResult.status);}
 assert.equal(q.attempt.redesignOf,parentRequest.id);assertShellProvidedMathOptionsV198(plan.mathOptions,parentRequest.id);
 const accounting=accountShellProvidedSearchReceiptV198(q,{entered:true,returned:true,failedParentId:parentRequest.id,providedRouteSha256:input.routeSha256});
 assert.deepEqual(done.searchAccounting,accounting);const accountingFile=await get(done.searchAccountingReceipt);assert.deepEqual(accountingFile,{...accounting,originalReceipt:candidateDescriptor});
 assert.equal(accounting.upper.calls,0);assert.equal(accounting.lower.calls,1);assert.equal(accounting.totalSearchCalls,1);assert.deepEqual(accounting.replayCalls,{canonical:1,independent:1});assert(accounting.conservativeFullWorlds<=10000);
 const staticReport=await get(c.staticPreflight),staticIndependent=await get(c.staticIndependentReview),render=await get(c.staticVisualEvidence),visual=await get(c.rootVisualReview),reference=await get(c.sourceReference),reservation=await get(input.constructionReservation);
 assert.deepEqual(input.designBase,c.sourceReference);assert.deepEqual(reservation.designBase,c.sourceReference);assert.equal(reference.sourceLevelId,q.sourceLevelId);assert.equal(reservation.experimentId,c.experimentId);assert.equal(reservation.maximumFullWorldInputs,1);
 for(const r of [staticReport,staticIndependent,render,visual]){assert.deepEqual(r.input,c.input);assert.deepEqual(r.errors,[]);}
 assert.equal(staticReport.status,'AUTHORED_INPUT_STATIC_PASS_HISTORY_AND_MATH_PENDING');assert.equal(staticIndependent.status,'STATIC_INPUT_INDEPENDENT_PASS_HISTORY_AND_MATH_PENDING');assert.equal(staticIndependent.levelSha256,q.levelSha256);
 await map(staticReport.fileBindings);await map(staticIndependent.fileBindings);await map(render.sourceBindings);
 assert.deepEqual(render.staticPreflight,c.staticPreflight);assert.equal(render.levelSha256,q.levelSha256);assert.equal(render.renderedLevelSha256,q.levelSha256);assert.equal(render.actuallyRendered,true);assert.equal(render.currentCanvasRenderingClaimed,false);
 assert.equal(visual.status,'ROOT_ACTUAL_STATIC_VISUAL_REVIEW_PASS');assert.deepEqual(visual.renderEvidence,c.staticVisualEvidence);assert.deepEqual(visual.staticPreflight,c.staticPreflight);assert.equal(visual.levelSha256,q.levelSha256);assert.equal(visual.formalId,q.formalId);assert.equal(visual.image.method,'view_image');assert.equal(visual.image.actuallyViewed,true);assert.deepEqual(render.image,{path:visual.image.path,sha256:visual.image.sha256});await bind(visual.image.path,visual.image.sha256);
 const unsealed=await get(c.unsealedHistory),design=await get(c.designPool);assert.equal(unsealed.status,'ROOT_UNSEALED_HISTORY_STOCKS_REVIEWED');assert.equal(unsealed.complete,true);assert.deepEqual(unsealed.historyReport,c.historyReport);assert.deepEqual(unsealed.currentInput,c.input);assert.deepEqual(unsealed.errors,[]);assert.equal(design.status,'ROOT_RETAINED_DAILY_DESIGN_POOL');assert.equal(design.allRetainedRepresentativesEnumerated,true);assert.deepEqual(design.formalRegistry,c.formalRegistry);assert.deepEqual(design.errors,[]);await bind(c.formalRegistry.path,c.formalRegistry.sha256);
 const history=await get(done.historyExport);assert.equal(history.status,'AUTHORED_SHELL_HISTORY_DELTAS_EXPORTED');assert.deepEqual(history.errors,[]);assert.deepEqual(history.priorHistoryReport,c.historyReport);assert.deepEqual(history.priorHistoryDeltas,prior.completeHistoryDeltas);assert.equal(history.historyDeltas.length,2);
 assert.deepEqual(history.completeHistoryDeltas,[...prior.completeHistoryDeltas,...history.historyDeltas]);for(const k of ['checkpoint','checkpointReview','historyScope','comparisonEvidence'])assert.deepEqual(history[k],prior[k]);assert.deepEqual(history.previousUnsealedHistory,c.unsealedHistory);
 const p=history.parentExecution;assert.equal(p.qualifierEntered,true);assert.equal(p.qualifierReturned,true);assert.equal(p.publicClaimsStarted,1);assert.deepEqual(p.receipt,candidateDescriptor);assert.deepEqual(p.searchAccounting,accounting);assert.deepEqual(p.searchAccountingReceipt,done.searchAccountingReceipt);
 assert.equal(q.lowerBound.projection,null);assert.equal(q.lowerBound.projectedLevelSha256,null);assert.deepEqual(done.persistedLowerProjectionWorldFields,[]);
 const expectedOwners=[done.constructionOwner,done.mathOwner];let previousHead=prior.headSha256;const owners=[];
 for(const[i,entry]of history.historyDeltas.entries()){
  const owner=await get(expectedOwners[i]),delta=await get(entry.descriptor),kind=i?'mathematical':'construction';owners.push(owner);
  assert.equal(owner.version,'plan-history-owner-v1');assert.equal(owner.kind,kind);assert.equal(owner.id,c.experimentId+(i?'-math':''));assert.equal(owner.experimentId,c.experimentId);assert.deepEqual(owner.parentPlan,done.plan);
  assert.equal(owner.namespace,ledgerNamespaces[i]);
  assert.deepEqual(entry.declaredOwner,{id:owner.id,namespace:owner.namespace,kind,definition:expectedOwners[i]});assert.deepEqual(delta.owner,entry.declaredOwner);assert.equal(delta.parentHeadSha256,previousHead);previousHead=entry.descriptor.sha256;
  assert.equal(delta.version,'reviewed-plan-history-v2-legacy-private-failure');assert.deepEqual(delta.closedCampaigns,owner.closedCampaigns);
  assert.equal(owner.files.length,i?6:8);assert.equal(new Set(owner.files.map(key)).size,owner.files.length);assert.equal(delta.files.length,owner.files.length);
  assert.deepEqual(delta.files.map(d=>({path:d.path,sha256:d.sha256})),owner.files);const originals=new Map();for(const d of owner.files)originals.set(key(d),await get(d));
  for(const d of delta.files){assert.deepEqual(d.aliases,[d.path]);assert.equal(d.rootId,rootFor(d.path));}
  const has=d=>assert(originals.has(key(d)),'Owner omitted exact file '+d.path);
  const worlds=delta.fullWorlds;assertShellProvidedNativeWorldMetadataV198(worlds,i?candidateDescriptor:c.input,q,c.sourceReference);
  const expectedWorlds=[[i?candidateDescriptor:c.input,'level',q.level]];
  for(const[j,[d,field,level]]of expectedWorlds.entries()){has(d);const w=worlds[j];assert.deepEqual(w.descriptor,d);assert.equal(w.field,field);assert.deepEqual(w.level,level);assert.equal(w.sourceLevelId,q.sourceLevelId);assert.deepEqual(w.reference,c.sourceReference);assert.equal(w.fingerprints.levelSha256,valueHash(level));
   if(field==='level')for(const k of ['levelSha256','designSha256','shapeSha256','colorSha256','retryIdentitySha256','colorAssignments'])assert.deepEqual(w.fingerprints[k],q.attempt[k],k);
  }
  if(!i){
   assert.deepEqual(owner.attemptIds,[]);assert.deepEqual(delta.terminalRecords,[]);assert.equal(owner.closedCampaigns.length,1);const campaign=owner.closedCampaigns[0],closed=await get(campaign.descriptor);has(campaign.descriptor);assert.deepEqual(campaign.raw,closed);
   for(const k of ['closed'])assert.equal(campaign[k],true);assert.equal(campaign.restartAllowed,false);assert.equal(campaign.consumedInputs,1);assert.equal(campaign.maximumInputs,1);assert.equal(campaign.id,c.experimentId);
   assert.equal(closed.status,'AUTHORED_SHELL_CONSTRUCTION_CLOSED');assert.equal(closed.experimentId,c.experimentId);assert.equal(closed.closed,true);assert.equal(closed.restartAllowed,false);assert.equal(closed.consumedInputs,1);assert.equal(closed.maximumInputs,1);assert.equal(closed.administrativeError,null);assert.deepEqual(closed.plan,done.plan);assert.deepEqual(closed.receipts,[candidateDescriptor]);assert.deepEqual(closed.formedWorldFiles,[c.input]);
   for(const d of [c.input,c.staticPreflight,input.constructionReservation,done.plan,plan.historyPreflight])has(d);
   const claims=owner.files.filter(d=>d.path.endsWith('.claim.json')),starts=owner.files.filter(d=>d.path.endsWith('/execution-start.json'));assert.equal(claims.length,1);assert.equal(starts.length,1);
   const claim=originals.get(key(claims[0])),start=originals.get(key(starts[0]));assert.deepEqual(claim.plan,done.plan);assert.equal(claim.failedPlanContinuationAllowed,false);assert.equal(claim.qualificationOnly,false);assert.equal(start.version,VERSION);assert.deepEqual(start.config,done.config);assert.deepEqual(start.input,c.input);assert.equal(start.restartAllowed,false);
  }else{
   assert.deepEqual(owner.attemptIds,[q.attempt.id]);assert.deepEqual(owner.closedCampaigns,[]);assert.equal(delta.terminalRecords.length,1);const terminal=delta.terminalRecords[0];assert.equal(terminal.kind,'mathematical');assert.equal(terminal.namespace,owner.namespace);assert.deepEqual(terminal.blocked,[]);assert.equal(terminal.lock,null);
   has(candidateDescriptor);has(done.searchAccountingReceipt);has(terminal.request.descriptor);has(terminal.result.descriptor);
   assert.deepEqual(terminal.request.value,q.attempt);assert.deepEqual(originals.get(key(terminal.request.descriptor)),q.attempt);assert.deepEqual(originals.get(key(terminal.result.descriptor)),terminal.result.value);
   const r=terminal.result.value;assert.equal(r.accepted,true);assert.equal(r.status,q.status);assert.equal(r.levelSha256,q.levelSha256);assert.deepEqual(r.lower,q.lowerBound.result);assert.equal(r.upper,null);
   const plans=owner.files.filter(d=>d.path.endsWith(q.attempt.id+'.v4-plan.json')),identities=owner.files.filter(d=>d.path.replaceAll('\\','/').endsWith('/identities/'+q.attempt.retryIdentitySha256+'.json'));assert.equal(plans.length,1);assert.equal(identities.length,1);
   const storedPlan=originals.get(key(plans[0]));assert.deepEqual(storedPlan.attempt,q.attempt);assert.deepEqual(storedPlan.plan,q.attemptPlan);assert.deepEqual(storedPlan.policyBindings,q.policyBindings);assert.deepEqual(originals.get(key(identities[0])),{origin:q.attempt.identityOrigin});
  }
 }
 assert.equal(history.headSha256,previousHead);
 return{status:'SHELL_PROVIDED_NATIVE_ORIGINAL_EXECUTION_METADATA_VERIFIED',completion:completionDescriptor,config:done.config,plan:done.plan,preflight:plan.historyPreflight,input:c.input,receipt:candidateDescriptor,historyExport:done.historyExport,minimumHistory:PINS.minimumHistory,historyRelease:c.historyRelease,historyBridge:release.historyBridge,ownerCount:2,newDeltaCount:2,originalProvidedRouteSha256:q.routeSha256,searchAccounting:accounting,fullHistoryReconsumed:false,priorFullHistoryEvidence:'Reviewed10 runner complete consume/merge/member/fresh guards, exact immutable plan and successful owner closure; no new full consumption claimed',controlBindingsRechecked:Object.keys(review.toolBindings).length,originalFullLayerWorldsPreserved:true,lowerProjectionWorlds:0,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0};
}

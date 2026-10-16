import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {VERSION,SELF,PINS,assertAuthoredShellProvidedOnceConfigV198,assertShellProvidedHistoryDescendantV198} from './run-authored-shell-provided-once-v198-history08.mjs';
import {SHELL_PROVIDED_SEARCH_LIMITS,assertSealedShellProvidedRouteV198,assertShellProvidedMathOptionsV198,accountShellProvidedSearchReceiptV198} from './shell-provided-search-budget-v198.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

// Read-only metadata verification of an already completed, accepted execution.
// No runtime, model, projection, replay, solver, history consumer or claim is
// invoked. The caller's read/bind functions verify actual bytes and include
// every read in its qualification bindings. Old full-history plan.bindings
// are authenticated by the immutable plan and reviewed original execution;
// this module does not claim a second complete history consumption.
const REVIEW={path:'deliverables/daily-formal-v4-20261008/proof/authored-shell-provided-once-v198-independent-01/report.json',sha256:'e0c3ebb661658e77e09ae8a75cc7391dd62c73aaa77703b167e21044c0140b7d'};
const RUNNER_SHA='806f0bfe2cc245d94b7822329a0864776f6a79f4ab13ce83c6cbc3a868564116';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
const valueHash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const descriptor=d=>assert(d&&Object.keys(d).sort().join(',')==='path,sha256'&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact descriptor required');
const key=d=>{descriptor(d);return d.path+'\0'+d.sha256;};
const equalPath=(a,b)=>assert.equal(path.resolve(a).toLowerCase(),path.resolve(b).toLowerCase());

export async function assertShellProvidedExecutionEvidenceV198(q,candidateDescriptor,completionDescriptor,{read,bind}){
 assert.equal(typeof read,'function');assert.equal(typeof bind,'function');
 const get=async d=>{descriptor(d);return read(d);};
 const map=async m=>{assert(m&&typeof m==='object');for(const[p,h]of Object.entries(m))await bind(p,h);};
 descriptor(candidateDescriptor);descriptor(completionDescriptor);
 assert.equal(q.accepted,true);assert.equal(q.catalogEligible,true);assert.equal(q.qualificationOnly,false);assert.equal(q.formalReady,false);
 assert.equal(q.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');assert.equal(q.newestMechanism,'multilayer-shell');
 assert.deepEqual(await get(candidateDescriptor),q);assert.equal(valueHash(q.level),q.levelSha256);assertSealedShellProvidedRouteV198(q);
 const done=await get(completionDescriptor);
 assert.equal(done.version,VERSION);assert.equal(done.status,'AUTHORED_SHELL_SINGLE_INPUT_CLOSED');
 for(const k of ['closed','normalExportAllowed','qualifierEntered','qualifierReturned','mathematicalReceiptPersisted','mathematicallyAccepted'])assert.equal(done[k],true,k);
 for(const k of ['restartAllowed','accepted','formalReady'])assert.equal(done[k],false,k);
 for(const k of ['consumedInputs','maximumInputs','formedFullWorlds','lowerProjectionWorlds','publicClaimsStarted'])assert.equal(done[k],1,k);
 assert.equal(done.newConstructions,0);assert.equal(done.administrativeError,null);assert.equal(done.unpersistedOriginalMathematicalResult,null);assert.deepEqual(done.unpersistedInputs,[]);assert.deepEqual(done.receipt,candidateDescriptor);
 const c=assertAuthoredShellProvidedOnceConfigV198(await get(done.config)),plan=await get(done.plan),input=await get(c.input);
 assert.equal(done.experimentId,c.experimentId);assert.deepEqual(done.input,c.input);assert.deepEqual(done.persistedConstructionWorldFiles,[c.input]);
 equalPath(candidateDescriptor.path,c.outputDirectory+'/candidate.json');equalPath(completionDescriptor.path,c.outputDirectory+'/completion.json');equalPath(done.plan.path,c.outputDirectory+'/plan.json');
 assert.deepEqual(input.level,q.level);assert.deepEqual(input.drags,q.drags);assert.equal(input.routeSha256,q.routeSha256);assert.equal(input.levelSha256,q.levelSha256);assert.equal(input.sourceLevelSha256,q.sourceLevelSha256);
 for(const[k,v]of Object.entries(c.target))assert.equal(q[k],v);assert.equal(input.accepted,false);assert.equal(input.formalReady,false);assert.equal(input.L,null);assert.equal(input.U,null);
 assert.equal(plan.version,VERSION);assert.equal(plan.experimentId,c.experimentId);assert.deepEqual(plan.config,done.config);assert.deepEqual(plan.input,c.input);assert.deepEqual(plan.staticPreflight,c.staticPreflight);assert.deepEqual(plan.sourceReference,c.sourceReference);assert.deepEqual(plan.historyReport,c.historyReport);assert.deepEqual(plan.minimumHistory,PINS.minimumHistory);assert.equal(plan.providedRouteSha256,q.routeSha256);
 for(const[k,v]of Object.entries(SHELL_PROVIDED_SEARCH_LIMITS))assert.deepEqual(plan[k],v,k);assert.equal(plan.maximumInputs,1);assert.equal(plan.newConstructions,0);assert.equal(plan.rawWholeBoardLimit,10000);
 assert.deepEqual(c.runnerReview,REVIEW);const review=await get(REVIEW);
 assert.equal(review.status,'INDEPENDENT_AUTHORED_SHELL_PROVIDED_ONCE_V198_RUNNER_PASS');assert.equal(review.productionQualified,true);assert.equal(review.executionAllowed,true);assert.deepEqual(review.errors,[]);assert.deepEqual(review.runner,{path:SELF,sha256:RUNNER_SHA});
 assert.equal(plan.orchestration.sha256,RUNNER_SHA);equalPath(plan.orchestration.path,path.join(plan.environment.executionWorkspace,SELF));assert.equal(path.basename(plan.environment.executionWorkspace),'frozen-workspace-4588');
 assert.equal(plan.environment.descriptor.sha256,'8d52d96c73b87b9c95207757164d0e95876e3f434f3540750eb605d18d7e2583');const environment=await get(plan.environment.descriptor);
 assert.equal(environment.status,'EXPLICIT_HISTORICAL_MATH_WORKSPACE');assert.equal(environment.currentRuntimeValidationClaimed,false);assert.equal(environment.frozenMath,q.toolchainSha256);equalPath(environment.workspace,plan.environment.executionWorkspace);equalPath(environment.sourceWorkspace,plan.environment.sourceWorkspace);
 assert.equal(plan.environment.mathematicalToolchainSha256,q.toolchainSha256);assert.equal(Object.keys(review.toolBindings).length,78);
 for(const[p,h]of Object.entries(review.toolBindings)){assert(!path.isAbsolute(p)&&p.startsWith('tools/')&&!p.includes('..'));await bind(p,h);await bind(path.join(plan.environment.executionWorkspace,p),h);}
 await bind(plan.orchestration.path,plan.orchestration.sha256); // JavaScript bytes, not JSON.
 const prior=await get(c.historyReport),minimum=await get(PINS.minimumHistory);assertShellProvidedHistoryDescendantV198(prior,minimum);
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
 const projection=q.lowerBound.projection;assert(projection);assert.deepEqual(done.persistedLowerProjectionWorldFields,[{descriptor:candidateDescriptor,field:'lowerBound.projection.projectedLevel',sourceLevelSha256:q.levelSha256,levelSha256:q.lowerBound.projectedLevelSha256}]);
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
  const worlds=delta.fullWorlds;assert.equal(worlds.length,i?2:1);
  const expectedWorlds=i?[[candidateDescriptor,'level',q.level],[candidateDescriptor,'lowerBound.projection.projectedLevel',projection.projectedLevel]]:[[c.input,'level',q.level]];
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
 return{status:'SHELL_PROVIDED_ORIGINAL_EXECUTION_METADATA_VERIFIED',completion:completionDescriptor,config:done.config,plan:done.plan,preflight:plan.historyPreflight,input:c.input,receipt:candidateDescriptor,historyExport:done.historyExport,minimumHistory:PINS.minimumHistory,ownerCount:2,newDeltaCount:2,originalProvidedRouteSha256:q.routeSha256,searchAccounting:accounting,fullHistoryReconsumed:false,priorFullHistoryEvidence:'Reviewed original runner complete consume/merge/member/fresh guards, exact immutable plan and successful owner closure; no new full consumption claimed',controlBindingsRechecked:78,originalAndProjectedWorldsPreserved:true,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0};
}

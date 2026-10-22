import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sealedWorldIdentity,changedHistoryShapeAndColour} from './sealed-history-contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {assertCompactHistoryMembersV198,assertCompactShellFreshV198,appendCompactShellResultV198} from './compact-shell-execution-v198.mjs';
import {VERSION,SELF,NATIVE_PRODUCTION_REVIEW,assertCompactShellProvidedNativeAuthorityV198,assertCompactShellProvidedNativePreflightV198,assertCompactShellProvidedCycleAuditV198} from './compact-shell-provided-native-route-v198.mjs';
import {authoredShellProvidedNativeMathOptionsV198,accountShellProvidedNativeSearchReceiptV198} from './shell-provided-native-search-budget-v198.mjs';
import {LATE_PREFIX_CONSTRUCTION_LEDGER} from './late-prefix-plan-ledger.mjs';

import {assertNewShellProvidedNativeReceiptV198} from './shell-native-execution-evidence-history10-v198.mjs';
export const COMPACT_NATIVE_EVIDENCE_READY=false;
export const NATIVE_COMPACT_SOURCE_REVIEW=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/compact-shell-provided-native-source-independent-01/report.json',sha256:'d6ac7020c09a35abd273e5af169a290ead54e74babb8a0e0cd215dab46c12bc6'});

// Read existing compact execution evidence only. No model, route replay,
// projection builder, search, history-pack ingestion, claim or registration.
const FROZEN='deliverables/daily-formal-v4-20261008/frozen-workspace-4588';
const CYCLE='tools/daily-challenge/formal-v4/provided-route-cycle-audit-v198.mjs';
const descriptor=d=>assert(d&&Object.keys(d).sort().join(',')==='path,sha256'&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact descriptor required');
export function assertSameCompactDescriptorV198(a,b){
 descriptor(a);descriptor(b);assert.equal(path.resolve(a.path).toLowerCase(),path.resolve(b.path).toLowerCase(),'Descriptor path');assert.equal(a.sha256,b.sha256,'Descriptor SHA');
}
export function assertCompactNativeCompletionMetadataV198(q,done,candidate){
 assert.equal(q.lowerBound.projection,null);assert.equal(q.lowerBound.projectedLevelSha256,null);assert.equal(done.proofKind,'native-full-layers');assert.deepEqual(done.nativeProductionReview,NATIVE_PRODUCTION_REVIEW);
 assert.equal(q.accepted,true);assert.equal(q.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');
 assert.equal(done.version,VERSION);assertSameCompactDescriptorV198(done.receipt,candidate);
 for(const k of ['entered','returned','originalResultPreserved','indexUpdateRequired','nextExecutionBlockedUntilReviewedIndexRefresh'])assert.equal(done[k],true,k);
 assert.equal(done.error,null);assert.equal(done.restartAllowed,false);assert.equal(done.formalReady,false);assert.equal(done.registryWrites,0);
 assert.equal(done.providedRouteSha256,q.routeSha256);assert.equal(done.failedParentId,q.attemptPlan.redesignOf);
 const accounting=accountShellProvidedNativeSearchReceiptV198(q,{entered:true,returned:true,failedParentId:done.failedParentId,providedRouteSha256:q.routeSha256});
 assert.deepEqual(done.accounting,accounting);assert.equal(accounting.upper.calls,0);assert.equal(accounting.lower.calls,1);
 assert.deepEqual(accounting.replayCalls,{canonical:1,independent:1});return accounting;
}
// Pure metadata checks used by both the evidence reader and negative fixtures.
export function assertCompactNativeClosureMetadataV198(files,bindings,sourceReview){
 assert.equal(sourceReview.status,'INDEPENDENT_COMPACT_SHELL_PROVIDED_NATIVE_EXECUTION_SOURCE_PASS');
 assert.deepEqual(sourceReview.errors,[]);assert.equal(sourceReview.checks.completeEsbuildStaticAndDynamicClosure,54);
 assert.equal(files.length,54);assert.equal(new Set(files).size,54);
 assert.deepEqual([...files].sort(),Object.keys(sourceReview.toolBindings).sort());
 assert.deepEqual(bindings,sourceReview.toolBindings,'Exact independently reviewed 54-file native execution closure');
 return true;
}
export function assertCompactNativeSuccessorMetadataV198(parent,next,{input,sourceReference,receipt,completion,experimentId,parentIndex}){
 assert.equal(receipt.lowerBound.projection,null);assert.equal(receipt.lowerBound.projectedLevelSha256,null);
 assert.equal(next.worlds.length,parent.worlds.length+1,'Exactly one original world, no projection');
 assert.equal(next.records.length,parent.records.length+1,'Exactly one new public mathematical record');
 assert.deepEqual(next.files.slice(0,parent.files.length),parent.files,'Old file prefix unchanged');
 const addedRecord=next.records.at(-1);assert.equal(addedRecord.kind,'mathematical');assert.equal(addedRecord.namespace,parent.publicNamespace);
 assert.deepEqual(addedRecord.request.value,receipt.attempt);assert.deepEqual(addedRecord.result.value,{accepted:true,status:receipt.status,levelSha256:receipt.levelSha256});
 assert.deepEqual(addedRecord.blocked,[]);assert.equal(addedRecord.lock,null);assert.equal(addedRecord.legacyPrivateResultFailure,false);
 const extra=next.files.slice(parent.files.length),expected=appendCompactShellResultV198(parent,{input,sourceReference,result:receipt,files:extra,completion,experimentId});
 expected.records.push(addedRecord);expected.parentCompactIndex=parentIndex;
 assert.deepEqual(next,expected,'All old fields/prefixes and exact one-world native successor');
 return extra;
}
export function assertCompactNativeConstructionMetadataV198(claim,closed,preflight,input,candidate,experimentId){
 assertSameCompactDescriptorV198(claim.plan,preflight);assertSameCompactDescriptorV198(closed.plan,preflight);
 assert.equal(claim.qualificationOnly,false);assert.equal(claim.failedPlanContinuationAllowed,false);
 assert.equal(closed.status,'COMPACT_SHELL_PROVIDED_NATIVE_CONSTRUCTION_CLOSED');assert.equal(closed.experimentId,experimentId);
 assert.equal(closed.closed,true);assert.equal(closed.restartAllowed,false);assert.equal(closed.consumedInputs,1);assert.equal(closed.maximumInputs,1);
 assert.equal(closed.qualificationOnly,false);assert.equal(closed.catalogEligible,false);assert.equal(closed.formalReady,false);
 // The construction ledger never awards mathematical acceptance. The exact
 // candidate/public result and accounting are checked independently above.
 assert.equal(closed.mathematicalAcceptance,false);assert.equal(closed.formedWorldFiles.length,1);assertSameCompactDescriptorV198(closed.formedWorldFiles[0],input);assert.equal(closed.receipts.length,1);assertSameCompactDescriptorV198(closed.receipts[0],candidate);
}
export function assertCompactNativeUnsealedWorldV198(input,old){
 const current=sealedWorldIdentity(input.level),prior=sealedWorldIdentity(old.level);
 assert(prior.designSha256!==current.designSha256&&!(prior.shapeSha256===current.shapeSha256&&prior.colorSha256===current.colorSha256),'Unsealed physical/design identity');
 assert.notEqual(prior.partitionSha256,current.partitionSha256,'Unsealed partition');
 if((old.sourceLevelId??old.level.id)===input.sourceLevelId)assert(changedHistoryShapeAndColour(prior,current),'Unsealed same-source shape AND colour');
 return true;
}

export async function assertCompactShellProvidedNativeExecutionEvidenceV198(q,candidate,completion,successorDescriptor,successorReviewDescriptor,{read,bind}){
 assert.equal(COMPACT_NATIVE_EVIDENCE_READY,true,'Compact native evidence is SOURCE ONLY pending independent review');
 assertNewShellProvidedNativeReceiptV198(q);assert.deepEqual(await read(candidate),q);
 const done=await read(completion),accounting=assertCompactNativeCompletionMetadataV198(q,done,candidate);
 const p=await read(done.preflight),r=await read(done.review),start=await read(done.start),input=await read(p.input);
 assertCompactShellProvidedNativePreflightV198(p,r,done.preflight,p.outputDirectory);
 const authority=await read(NATIVE_PRODUCTION_REVIEW);assertCompactShellProvidedNativeAuthorityV198(authority);
 const reviewedSource=await read(NATIVE_COMPACT_SOURCE_REVIEW);
 assert.equal(p.version,VERSION);assert.equal(p.newInputs,1);assert.equal(p.newSearches,0);assert.equal(p.failedParentId,done.failedParentId);
 assert.deepEqual(p.mathOptions,authoredShellProvidedNativeMathOptionsV198(done.failedParentId));
 assert.equal(r.status,'INDEPENDENT_COMPACT_SHELL_PROVIDED_NATIVE_EXECUTION_PREFLIGHT_PASS');assertSameCompactDescriptorV198(r.preflight,done.preflight);assert.equal(r.executionAllowed,true);assert.deepEqual(r.errors,[]);
 assert.equal(start.version,VERSION);assertSameCompactDescriptorV198(start.preflight,done.preflight);assertSameCompactDescriptorV198(start.review,done.review);assert.deepEqual(start.input,p.input);assert.deepEqual(start.index,p.index);
 assert.equal(start.proofKind,'native-full-layers');assert.deepEqual(start.nativeProductionReview,NATIVE_PRODUCTION_REVIEW);
 assert.equal(start.providedRouteSha256,q.routeSha256);assert.equal(start.restartAllowed,false);assert.equal(start.formalReady,false);
 for(const [d,name]of [[candidate,'candidate.json'],[completion,'completion.json'],[done.start,'execution-start.json'],[successorDescriptor,'successor-index.json']])assert.equal(path.resolve(d.path).toLowerCase(),path.resolve(p.outputDirectory,name).toLowerCase());
 assert.deepEqual(input.level,q.level);assert.deepEqual(input.drags,q.drags);assert.equal(input.levelSha256,q.levelSha256);assert.equal(input.routeSha256,q.routeSha256);assert.equal(input.sourceLevelSha256,q.sourceLevelSha256);
 assert.equal(input.accepted,false);assert.equal(input.formalReady,false);for(const k of ['formalId','sourceLevelId','stageKey','difficulty','slot','newestMechanism'])assert.equal(input[k],q[k]);
 const controls=await build({entryPoints:[SELF],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 assertCompactNativeClosureMetadataV198(Object.keys(controls.metafile.inputs),r.toolBindings,reviewedSource);
 for(const file of Object.keys(controls.metafile.inputs)){assert(/^[a-f0-9]{64}$/.test(r.toolBindings[file]),'Execution dependency missing from independent review');await bind(file,r.toolBindings[file]);await bind(path.join(FROZEN,file),r.toolBindings[file]);}
 for(const [file,h]of Object.entries(p.bindings))await bind(file,h);await read(p.executionPolicy);
 const cycle=await read(p.closedGestureAudit);await bind(CYCLE,cycle.auditTool.sha256);
 assertCompactShellProvidedCycleAuditV198(input,cycle,{...p.input,path:path.resolve(p.input.path)},{path:path.resolve(CYCLE),sha256:cycle.auditTool.sha256});
 const statics={};for(const key of ['staticPreflight','staticIndependentReview','staticVisualEvidence','rootVisualReview']){
  const evidence=await read(p[key]);assert.deepEqual(evidence.input,p.input);assert.equal(evidence.levelSha256,q.levelSha256);assert.deepEqual(evidence.errors??[],[]);
  statics[key]=evidence;
  for(const bindings of [evidence.fileBindings??{},evidence.sourceBindings??{}])for(const [file,h]of Object.entries(bindings))await bind(file,h);
 }
 assert(['AUTHORED_INPUT_STATIC_PASS','AUTHORED_INPUT_STATIC_PASS_HISTORY_AND_MATH_PENDING'].includes(statics.staticPreflight.status));
 assert(['STATIC_INPUT_INDEPENDENT_PASS_HISTORY_AND_MATH_PENDING','INDEPENDENT_STATIC_REVIEW_PASS'].includes(statics.staticIndependentReview.status));
 const render=statics.staticVisualEvidence,visual=statics.rootVisualReview;
 assert.equal(render.status,'STATIC_AUTHORED_SHELL_OPENING_RENDERED');assert.deepEqual(render.staticPreflight,p.staticPreflight);assert.equal(render.renderedLevelSha256,q.levelSha256);
 assert.equal(render.actuallyRendered,true);assert.equal(render.method,'static-q0-native-sprite-composite');assert.deepEqual(render.missingWholeBlockIds,[]);assert.deepEqual(render.storageViolations,[]);assert.equal(render.playerSaveTouched,false);
 assert.equal(visual.status,'ROOT_ACTUAL_STATIC_VISUAL_REVIEW_PASS');assert.deepEqual(visual.renderEvidence,p.staticVisualEvidence);assert.deepEqual(visual.staticPreflight,p.staticPreflight);
 assert.equal(visual.image.actuallyViewed,true);assert.equal(visual.image.method,'view_image');assertSameCompactDescriptorV198({path:render.image.path,sha256:render.image.sha256},{path:visual.image.path,sha256:visual.image.sha256});await bind(render.image.path,render.image.sha256);
 const parentReview=await read(p.indexReview);assert.equal(parentReview.status,'INDEPENDENT_COMPACT_SHELL_HISTORY_INDEX_PASS');assertSameCompactDescriptorV198(parentReview.index,p.index);assert.equal(parentReview.historyHeadSha256,p.historyHeadSha256);assert.deepEqual(parentReview.errors,[]);const parentIndex=await read(p.index);
 assert.equal(parentIndex.headSha256,p.historyHeadSha256);assert.deepEqual(parentIndex.historyReport,p.historyReport);
 const fresh=assertCompactShellFreshV198(parentIndex,input,p.sourceReference,done.failedParentId);assert.equal(fresh.parent.blocked.length,2);
 for(const item of [fresh.parent.request,fresh.parent.result,...fresh.parent.blocked]){const actual=await read(item.descriptor);for(const[k,v]of Object.entries(item.value))assert.deepEqual(actual[k],v);}
 const old=await read(p.failedParentReceipt);assert.equal(old.accepted,false);assert.equal(old.attempt.id,done.failedParentId);assert.equal(q.attempt.redesignOf,old.attempt.id);
 assert.deepEqual(old.attempt,fresh.parent.request.value);assert.equal(old.sourceLevelId,q.sourceLevelId);
 const source=await read(p.sourceReference);assert.equal(source.sourceLevelId??source.level.id,q.sourceLevelId);assert.deepEqual(input.designBase,p.sourceReference);
 const pool=await read(p.designPool);assert.equal(pool.status,'ROOT_RETAINED_DAILY_DESIGN_POOL');assert.equal(pool.allRetainedRepresentativesEnumerated,true);assert(Array.isArray(pool.rows)&&pool.rows.length>0);assert.deepEqual(pool.errors,[]);assert.deepEqual(pool.formalRegistry,p.formalRegistry);await bind(p.formalRegistry.path,p.formalRegistry.sha256);
 for(const row of pool.rows){const old=await read(row.candidate),decision=await read(row.disposition);assert.equal(old.formalId,row.formalId);const matches=d=>d.formalId===old.formalId&&d.levelSha256===levelSha256(old.level);
  assert([...(decision.decisions??[]),...(decision.designAccepted??[])].some(d=>matches(d)&&[d.candidate,d.receipt].some(x=>x?.sha256===row.candidate.sha256)&&d.status==='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION'));
  assert(!(decision.decisions??[]).some(d=>matches(d)&&d.status!=='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION'));}
 const unsealed=await read(p.unsealedHistory);assert.equal(unsealed.status,'ROOT_UNSEALED_HISTORY_STOCKS_REVIEWED');assert.equal(unsealed.complete,true);assert.deepEqual(unsealed.errors,[]);assert.deepEqual(unsealed.currentInput,p.input);assert.deepEqual(unsealed.historyReport,p.historyReport);assert(Array.isArray(unsealed.stocks));
 for(const d of unsealed.stocks)assertCompactNativeUnsealedWorldV198(input,await read(d));
 assert(start.selection.sourceSimilarity.footprintSimilarity<=.55);assert(start.selection.comparisons.length>0);for(const c of start.selection.comparisons)assert(c.footprintSimilarity<=c.maximum+1e-12);
 const successor=await read(successorDescriptor),review=await read(successorReviewDescriptor);
 const addedFiles=assertCompactNativeSuccessorMetadataV198(parentIndex,successor,{input,sourceReference:p.sourceReference,receipt:q,completion,experimentId:p.experimentId,parentIndex:p.index});
 assert.equal(review.status,'INDEPENDENT_COMPACT_SHELL_HISTORY_INDEX_PASS');assertSameCompactDescriptorV198(review.index,successorDescriptor);assert.deepEqual(review.errors,[]);
 for(const [a,b]of [[review.parentIndex,p.index],[review.executionPreflight,done.preflight],[review.executionPreflightReview,done.review],[review.completion,completion],[review.receipt,candidate]])assertSameCompactDescriptorV198(a,b);
 for(const k of ['allParentIndexFieldsAndPrefixesPreserved','constructionClaimPrecedesMath','sevenRootCurrentMembership','accepted'])assert.equal(review.checks[k],true,k);
 for(const k of ['addedOriginalWorlds','addedClosedConstructions'])assert.equal(review.checks[k],1,k);assert.equal(review.checks.addedRelaxedProjectionWorlds,0);
 assert.equal(review.historyHeadSha256,completion.sha256);assert.equal(successor.headSha256,completion.sha256);assert.equal(successor.previousCompactHeadSha256,p.historyHeadSha256);
 assertSameCompactDescriptorV198(successor.parentCompactIndex,p.index);assertSameCompactDescriptorV198(successor.compactCompletion,completion);assert.deepEqual(successor.historyReport,p.historyReport);
 assert.equal(successor.semanticHistoryValidation,'base-v17-validated; compact-successor-metadata-append');assert(successor.closedExperimentIds.includes(p.experimentId));
 const norm=compileCanonicalHistoryPath(successor.scope).canonical,memberMap=new Map(successor.files.map(f=>[norm(f.path),f]));
 assert.equal(memberMap.size,successor.files.length,'Unique compact file membership');
 const member=async d=>{const f=memberMap.get(norm(d.path));assert(f,'Compact successor omitted original file');assert.equal(f.sha256,d.sha256);await bind(d.path,d.sha256);};
 for(const d of [candidate,completion,done.start,done.preflight,done.review,p.input,p.closedGestureAudit])await member(d);
 for(const level of [q.level]){const identity=sealedWorldIdentity(level),world=successor.worlds.find(w=>w.identity.levelSha256===identity.levelSha256&&w.sourceLevelId===q.sourceLevelId);assert(world,'Compact successor omitted original or projected world');assert.deepEqual(world.identity,Object.fromEntries(['levelSha256','designSha256','shapeSha256','colorSha256','colorAssignments','partitionSha256'].map(k=>[k,identity[k]])));assert.deepEqual(world.reference,p.sourceReference);}
 const terminal=successor.records.filter(t=>t.kind==='mathematical'&&t.namespace===successor.publicNamespace&&t.request.value.id===q.attempt.id);assert.equal(terminal.length,1);
 const record=terminal[0];assert.deepEqual(record.request.value,q.attempt);assert.deepEqual(record.blocked,[]);assert.equal(record.lock,null);assert.equal(record.legacyPrivateResultFailure,false);
 const request=await read(record.request.descriptor),result=await read(record.result.descriptor);assert.deepEqual(request,q.attempt);assert.equal(result.accepted,true);assert.equal(result.status,q.status);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,q.lowerBound.result);assert.equal(result.upper,null);
 assert.deepEqual(record.result.value,{accepted:true,status:q.status,levelSha256:q.levelSha256});await member(record.request.descriptor);await member(record.result.descriptor);
 const base=path.join(LATE_PREFIX_CONSTRUCTION_LEDGER,done.preflight.sha256),claimFile=base+'.claim.json',closedFile=base+'.result.json';
 const claimMember=memberMap.get(norm(claimFile)),closedMember=memberMap.get(norm(closedFile));assert(claimMember&&closedMember);
 const claimDescriptor={path:claimMember.path,sha256:claimMember.sha256},closedDescriptor={path:closedMember.path,sha256:closedMember.sha256};
 const claim=await read(claimDescriptor),closed=await read(closedDescriptor);assertCompactNativeConstructionMetadataV198(claim,closed,done.preflight,p.input,done.receipt,p.experimentId);
 const stem=path.join(successor.publicNamespace,q.attempt.id),planDescriptor=memberMap.get(norm(stem+'.v4-plan.json')),identityDescriptor=memberMap.get(norm(path.join(successor.publicNamespace,'identities',q.attempt.retryIdentitySha256+'.json')));assert(planDescriptor&&identityDescriptor);
 const plan=await read({path:planDescriptor.path,sha256:planDescriptor.sha256}),identity=await read({path:identityDescriptor.path,sha256:identityDescriptor.sha256});
 assert.deepEqual(plan,{attempt:q.attempt,plan:q.attemptPlan,policyBindings:q.policyBindings});assert.deepEqual(identity,{origin:q.attempt.identityOrigin});
 const expectedMembers=[candidate,completion,done.start,done.preflight,done.review,p.input,p.closedGestureAudit,record.request.descriptor,record.result.descriptor,claimDescriptor,closedDescriptor,planDescriptor,identityDescriptor];
 const oldMembers=new Set(parentIndex.files.map(f=>norm(f.path)));assert.deepEqual(addedFiles.map(f=>norm(f.path)).sort(),[...new Set(expectedMembers.map(f=>norm(f.path)))].filter(p=>!oldMembers.has(p)).sort(),'No unbound extra execution members');
 for(const d of expectedMembers)await member(d);
 assert.equal((await fs.realpath(claim.outputDirectory)).toLowerCase(),(await fs.realpath(p.outputDirectory)).toLowerCase());assert.equal(claim.outputDirectory,closed.outputDirectory);
 assert(Date.parse(claim.claimedAt)<=Date.parse(q.attempt.startedAt));assert(Date.parse(closed.finishedAt)>=Date.parse(q.attempt.startedAt));
 await assertCompactHistoryMembersV198(successor);
 return{status:'COMPACT_SHELL_PROVIDED_NATIVE_ORIGINAL_EXECUTION_METADATA_VERIFIED',completion,preflight:done.preflight,review:done.review,start:done.start,input:p.input,successor:successorDescriptor,successorReview:successorReviewDescriptor,constructionClaim:claimDescriptor,constructionClosure:closedDescriptor,
  searchAccounting:accounting,originalFullLayerWorldsPreserved:true,lowerProjectionWorlds:0,nativeExecutionClosureFiles:54,sourceReview:NATIVE_COMPACT_SOURCE_REVIEW,nativeProductionReview:NATIVE_PRODUCTION_REVIEW,fullHistoryReconsumed:false,oldLiveByteIntegrityClaimed:false,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0,
  finalizeMembership:()=>assertCompactHistoryMembersV198(successor)};
}

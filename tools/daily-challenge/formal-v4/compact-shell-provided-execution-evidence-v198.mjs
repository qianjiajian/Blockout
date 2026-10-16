import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {assertCompactHistoryMembersV198} from './compact-shell-execution-v198.mjs';
import {VERSION,SELF,assertCompactShellProvidedCycleAuditV198} from './compact-shell-provided-route-v198.mjs';
import {authoredShellProvidedMathOptionsV198,accountShellProvidedSearchReceiptV198} from './shell-provided-search-budget-v198.mjs';
import {LATE_PREFIX_CONSTRUCTION_LEDGER} from './late-prefix-plan-ledger.mjs';

// Read existing compact execution evidence only. No model, route replay,
// projection builder, search, history-pack ingestion, claim or registration.
const FROZEN='deliverables/daily-formal-v4-20261008/frozen-workspace-4588';
const CYCLE='tools/daily-challenge/formal-v4/provided-route-cycle-audit-v198.mjs';
const descriptor=d=>assert(d&&Object.keys(d).sort().join(',')==='path,sha256'&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact descriptor required');
export function assertSameCompactDescriptorV198(a,b){
 descriptor(a);descriptor(b);assert.equal(path.resolve(a.path).toLowerCase(),path.resolve(b.path).toLowerCase(),'Descriptor path');assert.equal(a.sha256,b.sha256,'Descriptor SHA');
}
export function assertCompactProvidedCompletionMetadataV198(q,done,candidate){
 assert.equal(q.accepted,true);assert.equal(q.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');
 assert.equal(done.version,VERSION);assertSameCompactDescriptorV198(done.receipt,candidate);
 for(const k of ['entered','returned','originalResultPreserved','indexUpdateRequired','nextExecutionBlockedUntilReviewedIndexRefresh'])assert.equal(done[k],true,k);
 assert.equal(done.error,null);assert.equal(done.restartAllowed,false);assert.equal(done.formalReady,false);assert.equal(done.registryWrites,0);
 assert.equal(done.providedRouteSha256,q.routeSha256);assert.equal(done.failedParentId,q.attemptPlan.redesignOf);
 const accounting=accountShellProvidedSearchReceiptV198(q,{entered:true,returned:true,failedParentId:done.failedParentId,providedRouteSha256:q.routeSha256});
 assert.deepEqual(done.accounting,accounting);assert.equal(accounting.upper.calls,0);assert.equal(accounting.lower.calls,1);
 assert.deepEqual(accounting.replayCalls,{canonical:1,independent:1});return accounting;
}
export function assertCompactProvidedConstructionMetadataV198(claim,closed,preflight,input,candidate,experimentId){
 assertSameCompactDescriptorV198(claim.plan,preflight);assertSameCompactDescriptorV198(closed.plan,preflight);
 assert.equal(claim.qualificationOnly,false);assert.equal(claim.failedPlanContinuationAllowed,false);
 assert.equal(closed.status,'COMPACT_SHELL_PROVIDED_CONSTRUCTION_CLOSED');assert.equal(closed.experimentId,experimentId);
 assert.equal(closed.closed,true);assert.equal(closed.restartAllowed,false);assert.equal(closed.consumedInputs,1);assert.equal(closed.maximumInputs,1);
 assert.equal(closed.qualificationOnly,false);assert.equal(closed.catalogEligible,false);assert.equal(closed.formalReady,false);
 // The construction ledger never awards mathematical acceptance. The exact
 // candidate/public result and accounting are checked independently above.
 assert.equal(closed.mathematicalAcceptance,false);assert.equal(closed.formedWorldFiles.length,1);assertSameCompactDescriptorV198(closed.formedWorldFiles[0],input);assert.equal(closed.receipts.length,1);assertSameCompactDescriptorV198(closed.receipts[0],candidate);
}

export async function assertCompactShellProvidedExecutionEvidenceV198(q,candidate,completion,successorDescriptor,successorReviewDescriptor,{read,bind}){
 const done=await read(completion),accounting=assertCompactProvidedCompletionMetadataV198(q,done,candidate);
 const p=await read(done.preflight),r=await read(done.review),start=await read(done.start),input=await read(p.input);
 assert.equal(p.version,VERSION);assert.equal(p.newInputs,1);assert.equal(p.newSearches,0);assert.equal(p.failedParentId,done.failedParentId);
 assert.deepEqual(p.mathOptions,authoredShellProvidedMathOptionsV198(done.failedParentId));
 assert.equal(r.status,'INDEPENDENT_COMPACT_SHELL_PROVIDED_EXECUTION_PREFLIGHT_PASS');assertSameCompactDescriptorV198(r.preflight,done.preflight);assert.equal(r.executionAllowed,true);assert.deepEqual(r.errors,[]);
 assert.equal(start.version,VERSION);assertSameCompactDescriptorV198(start.preflight,done.preflight);assertSameCompactDescriptorV198(start.review,done.review);assert.deepEqual(start.input,p.input);assert.deepEqual(start.index,p.index);
 assert.equal(start.providedRouteSha256,q.routeSha256);assert.equal(start.restartAllowed,false);assert.equal(start.formalReady,false);
 for(const [d,name]of [[candidate,'candidate.json'],[completion,'completion.json'],[done.start,'execution-start.json'],[successorDescriptor,'successor-index.json']])assert.equal(path.resolve(d.path).toLowerCase(),path.resolve(p.outputDirectory,name).toLowerCase());
 assert.deepEqual(input.level,q.level);assert.deepEqual(input.drags,q.drags);assert.equal(input.levelSha256,q.levelSha256);assert.equal(input.routeSha256,q.routeSha256);assert.equal(input.sourceLevelSha256,q.sourceLevelSha256);
 assert.equal(input.accepted,false);assert.equal(input.formalReady,false);for(const k of ['formalId','sourceLevelId','stageKey','difficulty','slot','newestMechanism'])assert.equal(input[k],q[k]);
 const controls=await build({entryPoints:[SELF],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 for(const file of Object.keys(controls.metafile.inputs)){assert(/^[a-f0-9]{64}$/.test(r.toolBindings[file]),'Execution dependency missing from independent review');await bind(file,r.toolBindings[file]);await bind(path.join(FROZEN,file),r.toolBindings[file]);}
 for(const [file,h]of Object.entries(p.bindings))await bind(file,h);await read(p.executionPolicy);
 const cycle=await read(p.closedGestureAudit);await bind(CYCLE,cycle.auditTool.sha256);
 assertCompactShellProvidedCycleAuditV198(input,cycle,{...p.input,path:path.resolve(p.input.path)},{path:path.resolve(CYCLE),sha256:cycle.auditTool.sha256});
 for(const key of ['staticPreflight','staticIndependentReview','staticVisualEvidence','rootVisualReview']){
  const evidence=await read(p[key]);assert.deepEqual(evidence.input,p.input);assert.equal(evidence.levelSha256,q.levelSha256);assert.deepEqual(evidence.errors??[],[]);
  for(const bindings of [evidence.fileBindings??{},evidence.sourceBindings??{}])for(const [file,h]of Object.entries(bindings))await bind(file,h);
 }
 const parentReview=await read(p.indexReview);assert.equal(parentReview.status,'INDEPENDENT_COMPACT_SHELL_HISTORY_INDEX_PASS');assertSameCompactDescriptorV198(parentReview.index,p.index);assert.equal(parentReview.historyHeadSha256,p.historyHeadSha256);assert.deepEqual(parentReview.errors,[]);await bind(p.index.path,p.index.sha256);
 const old=await read(p.failedParentReceipt);assert.equal(old.accepted,false);assert.equal(old.attempt.id,done.failedParentId);assert.equal(q.attempt.redesignOf,old.attempt.id);
 const source=await read(p.sourceReference);assert.equal(source.sourceLevelId??source.level.id,q.sourceLevelId);assert.deepEqual(input.designBase,p.sourceReference);
 const pool=await read(p.designPool);assert.equal(pool.allRetainedRepresentativesEnumerated,true);assert(Array.isArray(pool.rows)&&pool.rows.length>0);assert.deepEqual(pool.errors,[]);await bind(p.formalRegistry.path,p.formalRegistry.sha256);
 const unsealed=await read(p.unsealedHistory);assert.equal(unsealed.complete,true);assert.deepEqual(unsealed.errors,[]);assert.deepEqual(unsealed.currentInput,p.input);
 assert(start.selection.sourceSimilarity.footprintSimilarity<=.55);assert(start.selection.comparisons.length>0);for(const c of start.selection.comparisons)assert(c.footprintSimilarity<=c.maximum+1e-12);
 const successor=await read(successorDescriptor),review=await read(successorReviewDescriptor);
 assert.equal(review.status,'INDEPENDENT_COMPACT_SHELL_HISTORY_INDEX_PASS');assertSameCompactDescriptorV198(review.index,successorDescriptor);assert.deepEqual(review.errors,[]);
 for(const [a,b]of [[review.parentIndex,p.index],[review.executionPreflight,done.preflight],[review.executionPreflightReview,done.review],[review.completion,completion],[review.receipt,candidate]])assertSameCompactDescriptorV198(a,b);
 for(const k of ['allParentIndexFieldsAndPrefixesPreserved','constructionClaimPrecedesMath','sevenRootCurrentMembership','accepted'])assert.equal(review.checks[k],true,k);
 for(const k of ['addedOriginalWorlds','addedRelaxedProjectionWorlds','addedClosedConstructions'])assert.equal(review.checks[k],1,k);
 assert.equal(review.historyHeadSha256,completion.sha256);assert.equal(successor.headSha256,completion.sha256);assert.equal(successor.previousCompactHeadSha256,p.historyHeadSha256);
 assertSameCompactDescriptorV198(successor.parentCompactIndex,p.index);assertSameCompactDescriptorV198(successor.compactCompletion,completion);assert.deepEqual(successor.historyReport,p.historyReport);
 assert.equal(successor.semanticHistoryValidation,'base-v17-validated; compact-successor-metadata-append');assert(successor.closedExperimentIds.includes(p.experimentId));
 const norm=compileCanonicalHistoryPath(successor.scope).canonical,memberMap=new Map(successor.files.map(f=>[norm(f.path),f]));
 assert.equal(memberMap.size,successor.files.length,'Unique compact file membership');
 const member=async d=>{const f=memberMap.get(norm(d.path));assert(f,'Compact successor omitted original file');assert.equal(f.sha256,d.sha256);await bind(d.path,d.sha256);};
 for(const d of [candidate,completion,done.start,done.preflight,done.review,p.input,p.closedGestureAudit])await member(d);
 for(const level of [q.level,q.lowerBound.projection.projectedLevel]){const identity=sealedWorldIdentity(level),world=successor.worlds.find(w=>w.identity.levelSha256===identity.levelSha256&&w.sourceLevelId===q.sourceLevelId);assert(world,'Compact successor omitted original or projected world');assert.deepEqual(world.identity,Object.fromEntries(['levelSha256','designSha256','shapeSha256','colorSha256','colorAssignments','partitionSha256'].map(k=>[k,identity[k]])));assert.deepEqual(world.reference,p.sourceReference);}
 const terminal=successor.records.filter(t=>t.kind==='mathematical'&&t.namespace===successor.publicNamespace&&t.request.value.id===q.attempt.id);assert.equal(terminal.length,1);
 const record=terminal[0];assert.deepEqual(record.request.value,q.attempt);assert.deepEqual(record.blocked,[]);assert.equal(record.lock,null);assert.equal(record.legacyPrivateResultFailure,false);
 const request=await read(record.request.descriptor),result=await read(record.result.descriptor);assert.deepEqual(request,q.attempt);assert.equal(result.accepted,true);assert.equal(result.status,q.status);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,q.lowerBound.result);assert.equal(result.upper,null);
 assert.deepEqual(record.result.value,{accepted:true,status:q.status,levelSha256:q.levelSha256});await member(record.request.descriptor);await member(record.result.descriptor);
 const base=path.join(LATE_PREFIX_CONSTRUCTION_LEDGER,done.preflight.sha256),claimFile=base+'.claim.json',closedFile=base+'.result.json';
 const claimMember=memberMap.get(norm(claimFile)),closedMember=memberMap.get(norm(closedFile));assert(claimMember&&closedMember);
 const claimDescriptor={path:claimMember.path,sha256:claimMember.sha256},closedDescriptor={path:closedMember.path,sha256:closedMember.sha256};
 const claim=await read(claimDescriptor),closed=await read(closedDescriptor);assertCompactProvidedConstructionMetadataV198(claim,closed,done.preflight,p.input,done.receipt,p.experimentId);
 assert.equal((await fs.realpath(claim.outputDirectory)).toLowerCase(),(await fs.realpath(p.outputDirectory)).toLowerCase());assert.equal(claim.outputDirectory,closed.outputDirectory);
 assert(Date.parse(claim.claimedAt)<=Date.parse(q.attempt.startedAt));assert(Date.parse(closed.finishedAt)>=Date.parse(q.attempt.startedAt));
 await assertCompactHistoryMembersV198(successor);
 return{status:'COMPACT_SHELL_PROVIDED_ORIGINAL_EXECUTION_METADATA_VERIFIED',completion,preflight:done.preflight,review:done.review,start:done.start,input:p.input,successor:successorDescriptor,successorReview:successorReviewDescriptor,constructionClaim:claimDescriptor,constructionClosure:closedDescriptor,
  searchAccounting:accounting,originalAndProjectedWorldsPreserved:true,fullHistoryReconsumed:false,oldLiveByteIntegrityClaimed:false,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0,
  finalizeMembership:()=>assertCompactHistoryMembersV198(successor)};
}

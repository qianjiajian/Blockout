import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,mapHistoricalBindings157} from './prefix-execution-environment-157.mjs';
import {readLowTwenty153Admission} from './prepare-low-twenty-153.mjs';
import {assertReviewedLowBandQualification157} from './low-band-policy157-qualification.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {makeExplicitLowBandBatchRecipe} from './prepare-low-band-batch.mjs';
import {formedStockImages} from './prepare-early-prefix-four.mjs';
import {LOW_BAND_BATCH_VERSION,LOW_TWENTY_EXPERIMENT_ID,assertLowBandBatchPlan,descriptor} from './low-twenty-contract.mjs';
import {readBound,readFile,write,sha,exists,checkBindings,mergeBindings,PUBLIC_LEDGER,HISTORY_LEDGER_ROOTS,captureLedgerSnapshot,checkLedgerSnapshot,assertLowBandFailedParentResult} from './low-twenty-io.mjs';

const own='tools/daily-challenge/formal-v4/prepare-low-twenty-157.mjs';
const driver='tools/daily-challenge/formal-v4/construct-low-twenty-157.mjs',runner='tools/daily-challenge/formal-v4/run-low-twenty-157.mjs';
export const LOW_TWENTY_PROPOSAL_SHA='adc4fe74de6405b93da15b4449f190695408ec462d873aa554e7d2c6a3107267';
export function assertLowTwentyProposal(p){
 assert.equal(p.status,'READONLY_DIVERSE_LOW_BAND_TWENTY_PROPOSAL');assert.equal(p.executable,false);
 for(const k of ['newConstructions','newSearches','newLedgerClaims'])assert.equal(p[k],0);
 assert.equal(p.inputs.length,20);assert.equal(new Set(p.inputs.map(r=>r.sourceLevelId)).size,10);
 for(const r of p.inputs){assert.equal(r.quota,1);assert(Number.isSafeInteger(r.maximumStaticPartitionAttempts)&&r.maximumStaticPartitionAttempts>0&&r.maximumStaticPartitionAttempts<=500);
  assert.equal(r.gateAndStockDesign.preserveAllReferenceGatesInOriginalOrder,true);assert.equal(r.candidateAbsent,true);assert([1,2].includes(r.targetDifficulty));
  if(r.sourceLevelId===195)assert.equal(r.advancedIntent,'future-shell-star-bomb-requires-separate-qualification');}
 assert.equal(p.campaign.maximumCspInputsIncludingFailed,20);assert.equal(p.campaign.oldMacroQuotaExtended,false);return true;
}
export async function assertNoFailedDescendant(parentId,requests,readResult){
 const seen=new Set([parentId]),queue=[parentId];
 for(const id of queue)for(const child of requests.filter(r=>r.redesignOf===id)){
  assert(!seen.has(child.id),'Cyclic or duplicate public parent lineage');seen.add(child.id);queue.push(child.id);
  const result=await readResult(child.id);assert(result,'Unfinished descendant must not be bypassed');
  assert.notEqual(result.accepted,false,'Declared parent has a newer failed descendant; provide its exact receipt');
 }return{scope:'declared-source-branch-descendants-only',checked:seen.size-1,noSourceInferenceFromBodyIds:true};
}
export function assertLowTwentyParentAncestry(id,anchorId,requests){
 const byId=new Map(requests.map(r=>[r.id,r])),seen=new Set();let next=id;
 while(next!==anchorId){assert(next&&!seen.has(next),'Failed parent is not a descendant of the reviewed source branch');seen.add(next);const row=byId.get(next);assert(row,'Missing parent request');next=row.redesignOf;}
 return true;
}
export function assertLowTwentyFailedParent(q,result){
 // Historical early ice experiments saved only a terminal failure summary.
 // It binds the failed original object, and certifies no partial lower or U.
 if(q.contractVersion==='daily-formal-v3-board-budget-1'&&q.status==='UNKNOWN_ICE_JOINT'&&result.lower===undefined&&result.upper===undefined){
  assert.equal(q.accepted,false);assert.equal(q.L,null);assert.equal(q.U,null);assert.equal(result.accepted,false);
  assert.equal(result.status,q.status);assert.equal(result.levelSha256,q.levelSha256);
  assert.deepEqual(Object.keys(result).sort(),['accepted','finishedAt','levelSha256','status']);return true;
 }
 assertLowBandFailedParentResult(q,result);return true;
}
async function bindAudit(bound,bindHistorical,d){
 const q=await bound(d);assert.deepEqual(q.errors,[]);assert(['INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS','INDEPENDENT_EARLY_FROZEN_ACTUAL_PASS','INDEPENDENT_EARLY_PREFIX_ACTUAL_PASS'].includes(q.status),'Known completed mathematical audit schema required');
 assert.equal(q.newSearches??q.newGameplaySearches,0);assert.equal(q.newLedgerClaims??q.publicClaimsStarted,0);
 assert(q.fileBindings);bindHistorical(q.fileBindings);return q;
}

/** Returns metadata only. This never invokes a retile, colour CSP, solver or claim.
 * Context supplies the latest exact receipts; stale failed descendants reject.
 * Previous closed experiments are exclusions, never renewed quota. */
export async function prepareLowTwenty157(context){
 for(const k of ['proposal','proposalReview','constructorQualification','selection','selectionReview','historyCheckpoint','historyPlan','lowBandQualification'])descriptor(context[k]);
 assert.equal(context.proposal.sha256,LOW_TWENTY_PROPOSAL_SHA);assert.equal(context.failedParents.length,10);assert(context.additionalHistoryReviews?.length);
 const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
 const bindings={},historicalBindingResolutions=[],bound=d=>readBound(d,bindings),read=p=>readFile(p,bindings);
 const bindHistorical=map=>{const mapped=mapHistoricalBindings157(map,environment);mergeBindings(bindings,mapped.bindings);for(const r of mapped.resolutions)if(!historicalBindingResolutions.some(x=>x.oldPath===r.oldPath&&x.expectedSha256===r.expectedSha256))historicalBindingResolutions.push(r);};
 mergeBindings(bindings,environment.bindings,runtime.toolchainBindings);
 const proposal=await bound(context.proposal);assertLowTwentyProposal(proposal);
 const proposalReview=await bound(context.proposalReview);assert.equal(proposalReview.status,'INDEPENDENT_DIVERSE_LOW_BAND_TWENTY_PROPOSAL_PASS');assert.deepEqual(proposalReview.proposal,context.proposal);
 assert.deepEqual(proposalReview.errors,[]);assert.equal(proposalReview.newSearches,0);assert.equal(proposalReview.newConstructions,0);assert.equal(proposalReview.newLedgerClaims,0);
 bindHistorical(proposalReview.fileBindings);
 const qual=await bound(context.constructorQualification);assert.equal(qual.status,'INDEPENDENT_LOW_TWENTY_PRIVATE_PASS');assert.deepEqual(qual.errors,[]);
 for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(qual[k],0);
 bindHistorical(qual.fileBindings);
 const history=await bindAudit(bound,bindHistorical,context.historyCheckpoint),historyAudits=[history];assert.equal(history.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');
 for(const d of context.additionalHistoryReviews)historyAudits.push(await bindAudit(bound,bindHistorical,d));
 const historyCompletion=await bound(history.completion);assert.deepEqual(historyCompletion.batchPlan,context.historyPlan,'The inherited plan must be the actual completed checkpoint plan');
 const inherited=await bound(context.historyPlan),admission=await readLowTwenty153Admission(context.selection,context.selectionReview);
 const selectedIndex=admission.index,selectionReview=admission.review,selectionBindings=admission.bindings;
 bindHistorical(selectionBindings);
 const selected=[],records=[];
 for(const file of selectedIndex.files){const q=await read(file);assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
  assert.equal(selectionBindings[path.resolve(file)]??selectionBindings[file],bindings[file],'Every selection object must be independently bound');records.push(q);selected.push({path:file,sha256:bindings[file],levelSha256:q.levelSha256});}
 assert.deepEqual(auditV4Diversity(records,runtime.slots).reasons,[]);
 const inheritedKeys=['old450','previousMacro','comparisonOnly','staticPartitionBudget','colourBudget','sameInputBudget','geometry'];
 for(const k of ['old450','previousMacro','comparisonOnly'])for(const d of inherited[k])await bound(d);
 const requests=[],publicStocks=[];
 for(const name of (await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort()){
  const file=path.join(PUBLIC_LEDGER,name),r=await read(file);requests.push(r);publicStocks.push({path:file,sha256:bindings[file],id:r.id,shapeSha256:r.shapeSha256,colorSha256:r.colorSha256,
   designSha256:r.designSha256??r.id,retryIdentitySha256:r.retryIdentitySha256??levelSha256({shapeSha256:r.shapeSha256,colorSha256:r.colorSha256})});}
 const failedParents=[];
 for(const spec of context.failedParents){descriptor(spec.receipt);const q=await bound(spec.receipt),attempt=q.attempt??q.proof?.attempt;
  assert.equal(q.accepted,false);assert.equal(q.sourceLevelId??q.level?.id,spec.sourceLevelId);assert(attempt?.id);assert.equal(q.levelSha256,levelSha256(q.level));
  const requestFile=`${PUBLIC_LEDGER}/${attempt.id}.request.json`,resultFile=`${PUBLIC_LEDGER}/${attempt.id}.result.json`,request=await read(requestFile),result=await read(resultFile);
  assert.deepEqual(request,attempt);assert.equal(request.levelSha256,q.levelSha256);assertLowTwentyFailedParent(q,result);
  const blockedFile=`${PUBLIC_LEDGER}/${attempt.id}.blocked.json`,blocked=await read(blockedFile);assert.equal(blocked.attemptId,attempt.id);assert.equal(blocked.status,q.status);
  const identityBlockedFile=`${PUBLIC_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`,identityBlocked=await read(identityBlockedFile);assert.equal(identityBlocked.attemptId,attempt.id);
  const reference=proposal.references.find(r=>r.sourceLevelId===spec.sourceLevelId);assert(reference);
  assertLowTwentyParentAncestry(attempt.id,reference.knownSealedParent.attemptId,requests);
  const lineage=await assertNoFailedDescendant(attempt.id,requests,id=>read(`${PUBLIC_LEDGER}/${id}.result.json`));
  failedParents.push({source:spec.sourceLevelId,branchId:`low20-source-${spec.sourceLevelId}`,id:attempt.id,file:spec.receipt.path,sha256:spec.receipt.sha256,
   requestFile,requestSha256:bindings[requestFile],resultFile,resultSha256:bindings[resultFile],blockedFile,blockedSha256:bindings[blockedFile],identityBlockedFile,identityBlockedSha256:bindings[identityBlockedFile],lineage,fingerprints:designFingerprints(q.level)});
 }
 assert.equal(new Set(failedParents.map(r=>r.source)).size,10);
 const blueprints=[];
 for(const r of proposal.inputs){const ref=await bound(r.reference),recipe={recipeId:r.recipeId,sourceLevelId:r.sourceLevelId,targetDifficulty:r.targetDifficulty,branchId:`low20-source-${r.sourceLevelId}`,
  reference:r.reference,cut:r.cut,regionBodyIds:r.region.bodyIds,maximumStocks:1,maximumStaticPartitionAttempts:r.maximumStaticPartitionAttempts,seed:r.proposedSeed,bodyCountDelta:r.bodyCountDelta};
  const bp=makeExplicitLowBandBatchRecipe(runtime,ref,recipe);assert.deepEqual(bp.prefixDrags,r.prefixDrags);assert.equal(bp.prefixSha256,r.prefixSha256);
  bp.allReferenceGates=ref.level.gates;bp.advancedIntent=r.advancedIntent;bp.advancedMechanismValidated=false;
  bp.currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,bp.sourceLevelId,{qualificationOnly:false});mergeBindings(bindings,bp.currentSourceBinding.bindings);blueprints.push(bp);}
 const previousLateStocks=[],seenStocks=new Set(),add=(l,d,q={})=>{const h=levelSha256(l);if(seenStocks.has(h))return;seenStocks.add(h);previousLateStocks.push({...d,level:l,sourceLevelId:q.sourceLevelId??l.id,
  reference:q.plain?.provenance?.reference??q.provenance?.reference??q.branchProvenance?.reference??q.reference??null,fingerprints:designFingerprints(l)});};
 for(const q of inherited.previousLateStocks??[])add(q.level,{path:q.path,sha256:q.sha256},q);
 const ledgerSnapshot=await captureLedgerSnapshot(bindings),terminalHistory=[];
 for(const root of ledgerSnapshot.roots)for(const d of root.files){const q=await bound(d);for(const l of formedStockImages(q))add(l,d,q);
  if(d.path.endsWith('.claim.json')&&q.outputDirectory){const resultPath=d.path.replace(/\.claim\.json$/,'.result.json');
   if([HISTORY_LEDGER_ROOTS[1],HISTORY_LEDGER_ROOTS[5],HISTORY_LEDGER_ROOTS[6]].includes(root.directory))assert(await exists(resultPath),'An unfinished current constructor cannot be ignored');
   if(await exists(resultPath)){const result=await read(resultPath);if(result.constructionFiles){assert.deepEqual(result.plan,q.plan);
    const indexPath=path.join(q.outputDirectory,'index.json'),index=await read(indexPath);assert.deepEqual(index.plan,q.plan);
    terminalHistory.push({claim:d,result:{path:resultPath,sha256:bindings[resultPath]},index:{path:indexPath,sha256:bindings[indexPath]},actualCspInputs:index.fixedColourInputs,quotaNotReopened:true});
    for(const f of result.constructionFiles){const stock=await bound(f);for(const l of formedStockImages(stock))add(l,f,stock);}}}}
 }
 const lowQualification=await bound(context.lowBandQualification);await assertReviewedLowBandQualification157(lowQualification,bindings);
 const compiled=await build({entryPoints:[own,driver,runner],bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))mergeBindings(bindings,{[file.replaceAll('\\','/')]:sha(await fs.readFile(file))});
 const plan={...Object.fromEntries(inheritedKeys.map(k=>[k,inherited[k]])),schemaVersion:4,scope:300,version:LOW_BAND_BATCH_VERSION,experimentId:LOW_TWENTY_EXPERIMENT_ID,
  status:'FINITE_LOW_TWENTY_PREPARED_NO_CONSTRUCTION',qualificationOnly:false,proposal:context.proposal,proposalReview:context.proposalReview,constructorQualification:context.constructorQualification,
  selectedIndex:context.selection,selectionReview:context.selectionReview,selected,selectedCount:selected.length,historyCheckpoint:context.historyCheckpoint,additionalHistoryReviews:context.additionalHistoryReviews,
  lowBandQualification:context.lowBandQualification,closedCampaignsExtended:false,terminalHistory,blueprints,approvedRecipes:blueprints.map(b=>b.recipeId),failedParents,publicStocks,previousLateStocks,
  campaign:{key:context.proposal.sha256,experimentId:LOW_TWENTY_EXPERIMENT_ID,maximumInputs:20,previousActualInputs:0,userGlobalLimitClaimed:false},maximumAfterThisBatch:20,
  shapePolicy:'failed-parent-and-same-source-branch-only',globalShapeInventoryUniquenessRequired:false,gatePolicy:'all-reference-gates-byte-equivalent-in-original-order',
  maximumStaticPartitionAttempts:blueprints.reduce((n,b)=>n+b.maximumStaticPartitionAttempts,0),maximumFinalColourInputsIncludingRejected:20,maximumStocksEnteringColourCspIncludingFailed:20,
  staticSlots:{1:{formalId:'daily-basic-combined-d1-01',stageKey:'basic-combined',difficulty:1,slot:1,newestMechanism:null},2:{formalId:'daily-basic-combined-d2-01',stageKey:'basic-combined',difficulty:2,slot:1,newestMechanism:null}},
  similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,newBatch:.65,source:.55,old450:.75},
  futureStrategy:{tailStrategy:'plain-joint-low-band',originalLowerFloors:{1:16,2:21},originalUpperCeilings:{1:20,2:30},maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},
  futureUpperBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},futureLowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},
  historicalBindingResolutions,historicalDesignPolicy:environment.historicalDesignPolicy,currentActivePolicy:environment.currentActivePolicy,mathematicalContract:environment.mathematicalContract,futureInputsOnly:true,
  executionEnvironment:environment,mathematicalToolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  executionTool:driver,mathExecutionTool:runner,ledgerSnapshot,bindings,slotAssigned:false,candidatePoolOnly:true,noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,currentRuntimeValidationClaimed:false,formalReady:false};
 assertLowBandBatchPlan(plan);await checkBindings(bindings);await checkLedgerSnapshot(ledgerSnapshot);return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[c,h,out]=process.argv.slice(2);assert(c&&h&&out&&!(await exists(out)));
 const d={path:c,sha256:h},plan=await prepareLowTwenty157(await readBound(d));mergeBindings(plan.bindings,{[d.path]:d.sha256});await fs.mkdir(out,{recursive:false});await write(`${out}/plan.json`,plan);
 console.log(JSON.stringify({plan:{path:`${out}/plan.json`,sha256:sha(await fs.readFile(`${out}/plan.json`))},newConstructions:0,newSearches:0,newClaims:0}));}

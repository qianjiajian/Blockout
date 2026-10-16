import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,mapHistoricalBindingsTask} from './prefix-execution-environment-task.mjs';
import {readLowTwenty153Admission} from './prepare-low-twenty-153.mjs';
import {assertReviewedLowBandQualificationTask} from './low-band-task-qualification.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {assertNoFailedDescendant,assertLowTwentyParentAncestry,assertLowTwentyFailedParent} from './prepare-low-twenty-task.mjs';
import {readExactLow20FailedNearAllowance} from './exact-low20-failed-near-reader.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {formedStockImages} from './prepare-early-prefix-four.mjs';
import {LOW_BAND_BATCH_VERSION,LOCAL_REPAIR_EXPERIMENT_ID,LOCAL_REPAIR_PROPOSAL,LOCAL_REPAIR_FILES,LOCAL_REPAIR_QUALIFICATION_STATUS,assertLowBandBatchPlan,assertLocalRepairRecipe,descriptor} from './local-repair-eighteen-contract.mjs';
import {readBound,readFile,write,sha,exists,checkBindings,mergeBindings,PUBLIC_LEDGER,HISTORY_LEDGER_ROOTS,captureLedgerSnapshot,checkLedgerSnapshot,assertLowBandFailedParentResult} from './low-twenty-io.mjs';

const own='tools/daily-challenge/formal-v4/prepare-local-repair-eighteen.mjs';
const driver='tools/daily-challenge/formal-v4/construct-local-repair-eighteen.mjs',runner='tools/daily-challenge/formal-v4/run-local-repair-eighteen.mjs';
const staticAuditor='tools/daily-challenge/formal-v4/audit-local-repair-static-independent.mjs',actualAuditor='tools/daily-challenge/formal-v4/audit-local-repair-actual-independent.mjs';
export function assertLocalRepairQualification(q){
 assert.equal(q.status,LOCAL_REPAIR_QUALIFICATION_STATUS);assert.deepEqual(q.errors,[]);assert.deepEqual(q.proposal,LOCAL_REPAIR_PROPOSAL);
 for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(q[k],0);
 for(const p of LOCAL_REPAIR_FILES)assert(/^[a-f0-9]{64}$/.test(q.fileBindings?.[p]??''),'All six new files require the single independent qualification: '+p);
 return true;
}
export function makeLocalRepairBlueprint(family,repair,seedReceipt,originalReceipt,input){
 assert.equal(seedReceipt.accepted,false);assert.equal(seedReceipt.sourceLevelId,family.sourceLevelId);assert.equal(seedReceipt.levelSha256,levelSha256(seedReceipt.level));
 assert.equal(input.levelSha256,seedReceipt.levelSha256);assert.deepEqual(input.level,seedReceipt.level);assert.equal(input.targetDifficulty,family.targetDifficulty);
 assert.deepEqual(input.prefixDrags,family.prefix.drags);assert.equal(routeSha256(input.prefixDrags),family.prefix.sha256);
 assert.deepEqual(originalReceipt.drags.slice(0,input.prefixDrags.length),input.prefixDrags,'Fixed prefix is an exact original successful route slice');
 assert.equal(originalReceipt.accepted,true);assert.equal(originalReceipt.level.id,family.sourceLevelId);
 assert.deepEqual(input.level.gates,family.gatesPreservedExactly);assert.deepEqual(originalReceipt.level.gates,family.gatesPreservedExactly);
 const selected=new Set(repair.bodyIds),changedBodies=input.level.blocks.filter(b=>selected.has(b.id));
 assert.equal(changedBodies.length,repair.bodyIds.length);assert.deepEqual(changedBodies.toSorted((a,b)=>a.id.localeCompare(b.id)),repair.oldBodies.toSorted((a,b)=>a.id.localeCompare(b.id)));
 const cells=changedBodies.flatMap(absoluteCells),bp={recipeId:repair.recipeId,sourceLevelId:family.sourceLevelId,targetDifficulty:family.targetDifficulty,
  branchId:family.repairFamilyId,repairFamilyId:family.repairFamilyId,reference:family.geometricRepairSeed,geometricRepairSeed:family.geometricRepairSeed,
  originalReference:family.preservedOriginalReference,level:seedReceipt.level,referenceLevelSha256:seedReceipt.levelSha256,
  originalReferenceLevel:originalReceipt.level,originalReferenceLevelSha256:levelSha256(originalReceipt.level),originalLargeRegion:family.originalLargeRegion,
  changedBodies,fixedBlocks:input.level.blocks.filter(b=>!selected.has(b.id)),region:{bodyIds:changedBodies.map(b=>b.id),cells,area:cells.length,fraction:cells.length/boardCells(input.level).length,originalBodyCount:changedBodies.length,connected:true},
  prefixDrags:input.prefixDrags,prefixSha256:family.prefix.sha256,prefixFacts:{drags:input.prefixDrags.length,parking:family.prefix.parking,clears:family.prefix.clearEvents},
  allReferenceGates:input.level.gates,maximumStocks:1,maximumStaticPartitionAttempts:repair.maximumStaticPartitionAttempts,seed:repair.seed,bodyCountDelta:repair.bodyCountDelta,
  suggestedInventoryOnly:repair.suggestedNewQ0Inventory,mechanismStageAssigned:false};
 assertLocalRepairRecipe(bp);return bp;
}
async function bindAudit(bound,bindHistorical,d){
 const q=await bound(d);assert.deepEqual(q.errors,[]);assert(['INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS','INDEPENDENT_EARLY_FROZEN_ACTUAL_PASS','INDEPENDENT_EARLY_PREFIX_ACTUAL_PASS','INDEPENDENT_EARLY_SIX_ACTUAL_PASS'].includes(q.status),'Known completed mathematical audit schema required');
 assert.equal(q.newSearches??q.newGameplaySearches,0);assert.equal(q.newLedgerClaims??q.publicClaimsStarted,0);
 assert(q.fileBindings);bindHistorical(q.fileBindings);return q;
}

/** Returns metadata only. This never invokes a retile, colour CSP, solver or claim.
 * Context supplies the latest exact receipts; stale failed descendants reject.
 * Previous closed experiments are exclusions, never renewed quota. */
export async function prepareLocalRepairEighteen(context){
 for(const k of ['proposal','constructorQualification','selection','selectionReview','historyCheckpoint','historyPlan','lowBandQualification'])descriptor(context[k]);
 assert.deepEqual(context.proposal,LOCAL_REPAIR_PROPOSAL);assert.equal(context.failedParents.length,6);assert(context.additionalHistoryReviews?.length);
 const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
 const bindings={},historicalBindingResolutions=[],bound=d=>readBound(d,bindings),read=p=>readFile(p,bindings);
 const bindHistorical=map=>{const mapped=mapHistoricalBindingsTask(map,environment);mergeBindings(bindings,mapped.bindings);for(const r of mapped.resolutions)if(!historicalBindingResolutions.some(x=>x.oldPath===r.oldPath&&x.expectedSha256===r.expectedSha256))historicalBindingResolutions.push(r);};
 mergeBindings(bindings,environment.bindings,runtime.toolchainBindings);
 const proposal=await bound(context.proposal);assert.equal(proposal.status,'READ_ONLY_FINITE_FAILED_FAMILY_LOCAL_REPAIR_PROPOSAL');assert.equal(proposal.executable,false);
 assert.equal(proposal.families.length,6);assert.equal(proposal.recipeCount,18);bindHistorical(proposal.fileBindings);
 const qual=await bound(context.constructorQualification);assertLocalRepairQualification(qual);bindHistorical(qual.fileBindings);
 const nearAllowance=await readExactLow20FailedNearAllowance(bindings);
 const history=await bindAudit(bound,bindHistorical,context.historyCheckpoint),historyAudits=[history];
 for(const d of context.additionalHistoryReviews)historyAudits.push(await bindAudit(bound,bindHistorical,d));
 const historyCompletion=await bound(history.completion);assert.deepEqual(historyCompletion.batchPlan,context.historyPlan,'The inherited plan must be the actual completed checkpoint plan');
 const inherited=await bound(context.historyPlan),admission=await readLowTwenty153Admission(context.selection,context.selectionReview);
 const selectedIndex=admission.index,selectionReview=admission.review,selectionBindings=admission.bindings;
 bindHistorical(selectionBindings);
 const selected=[],records=[];
 for(const file of selectedIndex.files){const q=await read(file);assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
  assert.equal(selectionBindings[path.resolve(file)]??selectionBindings[file],bindings[file],'Every selection object must be independently bound');records.push(q);selected.push({path:file,sha256:bindings[file],levelSha256:q.levelSha256});}
 assert.deepEqual(auditV4Diversity(records,runtime.slots).reasons,[]);
 const inheritedKeys=['old450','previousMacro','comparisonOnly'];
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
  const family=proposal.families.find(r=>r.sourceLevelId===spec.sourceLevelId);assert(family);
  assertLowTwentyParentAncestry(attempt.id,family.latestDeclaredAttempt,requests);
  const lineage=await assertNoFailedDescendant(attempt.id,requests,async id=>{const r=await read(`${PUBLIC_LEDGER}/${id}.result.json`);assert.notEqual(r.accepted,true,'A family with a successful descendant is no longer available for repair');return r;});
  failedParents.push({source:spec.sourceLevelId,branchId:`low20-source-${spec.sourceLevelId}`,id:attempt.id,file:spec.receipt.path,sha256:spec.receipt.sha256,
   requestFile,requestSha256:bindings[requestFile],resultFile,resultSha256:bindings[resultFile],blockedFile,blockedSha256:bindings[blockedFile],identityBlockedFile,identityBlockedSha256:bindings[identityBlockedFile],lineage,fingerprints:designFingerprints(q.level)});
 }
 assert.equal(new Set(failedParents.map(r=>r.source)).size,6);
 const blueprints=[];
 for(const family of proposal.families){
  const seed=await bound(family.geometricRepairSeed),original=await bound(family.preservedOriginalReference),input=await bound(family.inputEvidence);
  assert(nearAllowance.rows.some(r=>r.receipt.path===family.geometricRepairSeed.path&&r.receipt.sha256===family.geometricRepairSeed.sha256),'Geometric seed must be one of exactly twelve sealed failures');
  for(const repair of family.repairs){const bp=makeLocalRepairBlueprint(family,repair,seed,original,input);
   bp.currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,bp.sourceLevelId,{qualificationOnly:false});mergeBindings(bindings,bp.currentSourceBinding.bindings);blueprints.push(bp);}
 }
 const previousLateStocks=[],seenStocks=new Set(),add=(l,d,q={})=>{const h=levelSha256(l),key=d.path+'|'+d.sha256+'|'+h;if(seenStocks.has(key))return;seenStocks.add(key);previousLateStocks.push({...d,level:l,accepted:q.accepted,protectedNear:q.accepted===true||q.reserve===true||q.visualRetired===true,sourceLevelId:q.sourceLevelId??l.id,
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
 const lowQualification=await bound(context.lowBandQualification);await assertReviewedLowBandQualificationTask(lowQualification,bindings);
 const compiled=await build({entryPoints:[own,driver,runner,staticAuditor,actualAuditor],bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))mergeBindings(bindings,{[file.replaceAll('\\','/')]:sha(await fs.readFile(file))});
 const plan={...Object.fromEntries(inheritedKeys.map(k=>[k,inherited[k]])),schemaVersion:4,scope:300,version:LOW_BAND_BATCH_VERSION,experimentId:LOCAL_REPAIR_EXPERIMENT_ID,
  status:'FINITE_LOCAL_REPAIR_EIGHTEEN_PREPARED_NO_CONSTRUCTION',qualificationOnly:false,proposal:context.proposal,proposalReview:context.constructorQualification,constructorQualification:context.constructorQualification,
  selectedIndex:context.selection,selectionReview:context.selectionReview,selected,selectedCount:selected.length,historyCheckpoint:context.historyCheckpoint,additionalHistoryReviews:context.additionalHistoryReviews,
  lowBandQualification:context.lowBandQualification,closedCampaignsExtended:false,terminalHistory,blueprints,approvedRecipes:blueprints.map(b=>b.recipeId),failedParents,publicStocks,previousLateStocks,
  campaign:{key:context.proposal.sha256,experimentId:LOCAL_REPAIR_EXPERIMENT_ID,maximumInputs:18,previousActualInputs:0,userGlobalLimitClaimed:false},maximumAfterThisBatch:18,
  nearAllowance,nearExclusionPolicy:'exact-twelve-low20-failures-and-bound-construction-aliases-only',maximumFinalRepresentativesPerRepairFamily:1,successStopsUnclaimedSiblings:true,allHistoryExactExclusionsRetained:true,preconstructedSiblingsAreIndependentAcceptedLayouts:false,
  shapePolicy:'failed-parent-and-same-source-branch-only',globalShapeInventoryUniquenessRequired:false,gatePolicy:'all-reference-gates-byte-equivalent-in-original-order',
  maximumStaticPartitionAttempts:blueprints.reduce((n,b)=>n+b.maximumStaticPartitionAttempts,0),maximumFinalColourInputsIncludingRejected:18,maximumStocksEnteringColourCspIncludingFailed:18,
  staticSlots:{1:{formalId:'daily-basic-combined-d1-01',stageKey:'basic-combined',difficulty:1,slot:1,newestMechanism:null},2:{formalId:'daily-basic-combined-d2-01',stageKey:'basic-combined',difficulty:2,slot:1,newestMechanism:null}},
  similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,newBatch:.65,source:.55,old450:.75},
  futureStrategy:{tailStrategy:'plain-joint-low-band',originalLowerFloors:{1:16,2:21},originalUpperCeilings:{1:20,2:30},maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},
  futureUpperBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},futureLowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},
  historicalBindingResolutions,historicalDesignPolicy:environment.historicalDesignPolicy,policyReviewedAtPreparation:environment.policyReviewedAtPreparation,mathematicalContract:environment.mathematicalContract,futureInputsOnly:true,
  executionEnvironment:environment,mathematicalToolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  futureToolBindings:Object.fromEntries(LOCAL_REPAIR_FILES.map(p=>[p,bindings[p]])),staticAuditTool:staticAuditor,actualAuditTool:actualAuditor,staticReviewRequired:'INDEPENDENT_LOCAL_REPAIR_EIGHTEEN_STATIC_PASS',executionTool:driver,mathExecutionTool:runner,ledgerSnapshot,bindings,slotAssigned:false,candidatePoolOnly:true,noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,currentRuntimeValidationClaimed:false,formalReady:false};
 assertLowBandBatchPlan(plan);await checkBindings(bindings);await checkLedgerSnapshot(ledgerSnapshot);return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[c,h,out]=process.argv.slice(2);assert(c&&h&&out&&!(await exists(out)));
 const d={path:c,sha256:h},plan=await prepareLocalRepairEighteen(await readBound(d));mergeBindings(plan.bindings,{[d.path]:d.sha256});await fs.mkdir(out,{recursive:false});await write(`${out}/plan.json`,plan);
 console.log(JSON.stringify({plan:{path:`${out}/plan.json`,sha256:sha(await fs.readFile(`${out}/plan.json`))},newConstructions:0,newSearches:0,newClaims:0}));}

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {LATE_REGION_VERSION} from './late-region-gate-aware-factory.mjs';
import {LOW_BAND_BATCH_VERSION,assertLowBandBatchPlan,assertLowBandBatchRecipe,deriveLowBandHistoryAccounting,descriptor,integer} from './low-band-batch-contract.mjs';
import {sha,write,exists,readBound,readFile,checkBindings,captureLedgerSnapshot,walkJson,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,HISTORY_LEDGER_ROOTS,LEGACY_HISTORY_LEDGER_ROOTS,ADDITIONAL_HISTORY_LEDGER,mergeBindings,assertReviewedLowBandQualification,assertLowBandFailedParentResult} from './low-band-batch-io.mjs';

const own='tools/daily-challenge/formal-v4/prepare-low-band-batch.mjs',driver='tools/daily-challenge/formal-v4/construct-low-band-batch.mjs',runner='tools/daily-challenge/formal-v4/run-low-band-batch.mjs';
export function nativeSelectionReviewBindings(review,index,selection){
 assert.deepEqual(review.selection,selection);assert.deepEqual(review.errors,[]);assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);
 if(review.status==='INDEPENDENT_150_MERGE_QUICK_CHECK_PASS'){
  assert.equal(index.scope,300);assert.equal(review.candidates,index.files.length);
  for(const key of ['old147ExactPrefixAndBytes','advancedOriginalReceiptBytes','nativePhysicalAndOriginalMathematicsUnchanged','nativeDraftStillUnaccepted'])assert.equal(review[key],true);
  assert.equal(review.scope,'Exact merge objects and original147 bytes, not a repeat of full historical proof searches or Pointer acceptance');
  assert(review.inputBindings);return review.inputBindings;
 }
 if(review.status==='INDEPENDENT_LOW_BAND_BATCH_SELECTION_PASS'){
  assert.equal(review.candidates,index.files.length);assert.equal(review.scope,300);assert(review.inputBindings);return review.inputBindings;
 }
 assert.equal(review.status,'READONLY_LOW_BAND_ADVANCED_NATIVE_MERGE_COMPLETE');assert.equal(review.combinedCandidates,index.files.length);assert(review.fileBindings);return review.fileBindings;
}
/** An explicit region/cut is accepted only after both complete reference
 * replays. No tiling, colouring or gameplay search occurs in preparation. */
export function makeExplicitLowBandBatchRecipe(runtime,reference,recipe){
 descriptor(recipe.reference);integer(recipe.cut,1,reference.drags.length);integer(recipe.maximumStocks,1,64);
 assert(reference.accepted&&reference.L>=(recipe.targetDifficulty===1?16:21)&&Number.isFinite(reference.U)&&reference.L<=reference.U&&reference.U<=(recipe.targetDifficulty===1?20:30));assert.equal(reference.levelSha256,levelSha256(reference.level));
 runtime.assertPlainProofDomain(reference.level);const level=reference.level,sourceLevelId=recipe.sourceLevelId;
 assert.equal(sourceLevelId,reference.sourceLevelId??level.id);assert.equal(level.id,sourceLevelId);
 for(const b of level.blocks){const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;
  assert.equal(b.shape.length,w*h,'Native120 batch currently admits solid rectangles only');const asset=runtime.matchFormalBlockShape(b.shape,'native-only');assert(asset&&asset.quarterTurns===0);assert(runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[asset.shapeId]);}
 const actual=replayDecorated(runtime,level,reference.drags),independent=independentReplay(runtime,level,reference.drags);
 for(const r of [actual,independent])assert(r.valid&&r.complete&&!r.failed);assert.equal(actual.nonClearingDrags,reference.U);assert.equal(independent.nonClearingDrags,reference.U);
 assert(Array.isArray(recipe.regionBodyIds)&&recipe.regionBodyIds.length);const ids=new Set(recipe.regionBodyIds);assert.equal(ids.size,recipe.regionBodyIds.length);
 const changedBodies=level.blocks.filter(b=>ids.has(b.id));assert.equal(changedBodies.length,ids.size);
 const prefixDrags=structuredClone(reference.drags.slice(0,recipe.cut));assert(prefixDrags.every(d=>!ids.has(d.blockId)),'Region body touched before cut');
 const cells=changedBodies.flatMap(absoluteCells),normalBoardArea=boardCells(level).length;
 const source=runtime.LEVELS.find(l=>l.id===sourceLevelId);assert(source);assert.equal(boardBaselineSha256(level),boardBaselineSha256(source));
 const bp={version:LATE_REGION_VERSION,recipeId:recipe.recipeId,maximumStocks:recipe.maximumStocks,targetDifficulty:recipe.targetDifficulty,branchId:recipe.branchId,seed:recipe.seed,bodyCountDelta:recipe.bodyCountDelta,maximumStaticPartitionAttempts:recipe.maximumStaticPartitionAttempts,
  reference:recipe.reference,referenceLevelSha256:reference.levelSha256,referenceRouteSha256:routeSha256(reference.drags),sourceLevelId,
  sourceLevelSha256:levelSha256(source),normalBoardArea,normalDimensions:[level.width,level.height],boardOutlineSha256:boardBaselineSha256(source),
  level:structuredClone(level),changedBodies:structuredClone(changedBodies),fixedBlocks:structuredClone(level.blocks.filter(b=>!ids.has(b.id))),
  region:{cells,bodyIds:changedBodies.map(b=>b.id),area:cells.length,fraction:cells.length/normalBoardArea,originalBodyCount:ids.size,connected:true},
  prefixDrags,prefixSha256:routeSha256(prefixDrags),prefixFacts:{drags:recipe.cut,parking:prefixDrags.filter(d=>!d.exitSide).length,clears:prefixDrags.filter(d=>d.exitSide).length},
  referenceL:reference.L,referenceU:reference.U,knownReferenceOnly:true,newCandidateRouteNotClaimed:true,searchPerformed:false,prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true};
 assertLowBandBatchRecipe(bp);
 let partial=structuredClone(level);const prefixAudits=[];for(const drag of prefixDrags){const a=auditPlainForwardDrag(runtime,partial,drag);assert(a.valid,a.error);
  if(prefixAudits.length)assert.equal(a.beforeBodiesSha256,prefixAudits.at(-1).afterBodiesSha256);prefixAudits.push(a);
  if(drag.exitSide)partial.blocks=partial.blocks.filter(b=>b.id!==drag.blockId);
  else if(drag.path.length){const b=partial.blocks.find(b=>b.id===drag.blockId);[b.x,b.y]=drag.path.at(-1);}}
 bp.referenceQualification={canonical:actual,independent,prefixAudits,searchPerformed:false};
 return bp;
}

/** Only returns a plan object. CLI writing is a separate explicit command. */
export async function prepareLowBandBatch(context){
 descriptor(context.selection);descriptor(context.selectionReview);descriptor(context.historyCheckpoint);descriptor(context.lowBandQualification);
 assert(context.recipes?.length&&context.failedParents?.length);integer(context.maximumStaticPartitionAttempts,1,10000);descriptor(context.proposal);
 const bindings={},bound=d=>readBound(d,bindings),read=p=>readFile(p,bindings);
 const proposal=await bound(context.proposal);assert.equal(proposal.status,'READ_ONLY_PROPOSAL_AWAITING_ROOT_REVIEW_NOT_EXECUTABLE');assert.equal(proposal.newSearches,0);assert.equal(proposal.newConstructions,0);assert.equal(proposal.ledgerWrites,0);
 assert.equal(context.recipes.length,proposal.inputs.length);for(const r of context.recipes){const i=proposal.inputs.find(x=>x.inputId===r.recipeId);assert(i);assert.equal(r.maximumStocks,1);assert.equal(r.sourceLevelId,i.sourceLevelId);assert.equal(r.targetDifficulty,i.targetDifficulty);assert.equal(r.cut,i.cut);assert.equal(r.seed,i.proposedSeed);assert.equal(r.maximumStaticPartitionAttempts,i.maximumStaticPartitionAttempts);assert.deepEqual(r.regionBodyIds,i.region.bodyIds);assert.deepEqual(r.reference,proposal.references.find(x=>x.referenceId===i.referenceId).reference);}
 const checkpoint=await bound(context.historyCheckpoint);assert.equal(checkpoint.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(checkpoint.errors,[]);
 assert.equal(checkpoint.newSearches,0);assert.equal(checkpoint.newConstructionCalls,0);assert.equal(checkpoint.newLedgerClaims,0);await checkBindings(checkpoint.fileBindings);mergeBindings(bindings,checkpoint.fileBindings);
 const additionalReviewBindings={};for(const d of context.additionalHistoryReviews??[]){const a=await bound(d);assert.deepEqual(a.errors,[]);assert(/PASS$/.test(a.status));
  if(a.status==='INDEPENDENT_EARLY_FROZEN_STATIC_PASS'){assert.equal(a.publicClaimsStarted,0);assert.equal(a.newGameplaySearches,0);}
  else{assert.equal(a.newSearches,0);assert.equal(a.newLedgerClaims,0);}
  await checkBindings(a.fileBindings);mergeBindings(bindings,a.fileBindings);mergeBindings(additionalReviewBindings,a.fileBindings);}
 const completion=await bound(checkpoint.completion),lastIndex=await bound(completion.descriptors.index),inherited=await bound(completion.batchPlan);
 assert.deepEqual(lastIndex.plan,completion.batchPlan);assert.equal(lastIndex.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');
 const selectedIndex=await bound(context.selection),selectionReview=await bound(context.selectionReview);
 assert.equal(selectedIndex.scope,300);const selectionBindings=nativeSelectionReviewBindings(selectionReview,selectedIndex,context.selection);
 await checkBindings(selectionBindings);mergeBindings(bindings,selectionBindings);
 const selected=[],records=[];for(const file of selectedIndex.files){const q=await read(file);assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
  assert.equal(selectionBindings[path.resolve(file)]??selectionBindings[file],bindings[file],'Selection audit must bind every actual receipt');records.push(q);selected.push({path:file,sha256:bindings[file],levelSha256:q.levelSha256});}
 const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);await checkBindings(environment.bindings);mergeBindings(bindings,environment.bindings,runtime.toolchainBindings);
 assert.deepEqual(auditV4Diversity(records,runtime.slots).reasons,[]);
 const macroRows=[],previousLateStocks=[];for(const name of await fs.readdir(LATE_PREFIX_CONSTRUCTION_LEDGER))if(name.endsWith('.claim.json')){
  const file=path.join(LATE_PREFIX_CONSTRUCTION_LEDGER,name),claim=await read(file);assert.equal(claim.qualificationOnly,false);
  const resultFile=file.replace(/\.claim\.json$/,'.result.json');assert(await exists(resultFile),'An unfinished construction is not free quota');const result=await read(resultFile),p=await bound(claim.plan);
  assert.equal(result.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.deepEqual(result.plan,claim.plan);
  const indexFile=path.join(claim.outputDirectory,'index.json'),index=await read(indexFile);assert.deepEqual(index.plan,claim.plan);
  assert.equal(index.fixedColourInputs,result.stocksEnteringColourCspIncludingFailed);assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
  macroRows.push({plan:claim.plan,claim:{path:file,sha256:bindings[file]},result:{path:resultFile,sha256:bindings[resultFile]},index:{path:indexFile,sha256:bindings[indexFile]},
   previous:p.campaign?.previousActualInputs??p.previousMacro64ActualInputs,actual:index.fixedColourInputs,after:index.totalActualInputsIncludingThis??index.macro64ActualInputsIncludingThis,quota:p.maximumStocksEnteringColourCspIncludingFailed,qualificationOnly:false,terminal:true});
  for(const d of result.constructionFiles??[]){const q=await bound(d);if(q.placeholderWorld){const level=q.level??q.placeholderWorld;previousLateStocks.push({...d,sourceLevelId:q.sourceLevelId??level.id,reference:q.provenance?.reference??null,shapeSha256:designFingerprints(level).shapeSha256,fingerprints:designFingerprints(level),level});}}
 }
 const macroHistory=deriveLowBandHistoryAccounting(macroRows);assert.equal(macroHistory.total,lastIndex.totalActualInputsIncludingThis??lastIndex.macro64ActualInputsIncludingThis,'Latest independently reviewed actual history required');
 assert.equal(macroRows.at(-1)?.terminal,true);assert(macroRows.some(r=>r.plan.sha256===completion.batchPlan.sha256));
 // The early-ice experiment shares physical identities but is not part of
 // the closed macro campaign. Its actual stocks and terminal bytes still
 // participate in exclusions and the new complete history snapshot.
 const separateConstructionHistory=[];
 for(const name of await exists(ADDITIONAL_HISTORY_LEDGER)?await fs.readdir(ADDITIONAL_HISTORY_LEDGER):[])if(name.endsWith('.claim.json')){
  const file=path.join(ADDITIONAL_HISTORY_LEDGER,name),claim=await read(file);assert.equal(claim.qualificationOnly,false);assert.equal(claim.closedMacroExperimentExtended,false);
  const resultFile=file.replace(/\.claim\.json$/,'.result.json');assert(await exists(resultFile),'Separate experiment still pending');const result=await read(resultFile);
  assert.deepEqual(result.plan,claim.plan);assert.equal(result.publicMathematicalClaims,0);assert(typeof result.finishedAt==='string');assert(Array.isArray(result.constructionFiles));
  const indexFile=path.join(claim.outputDirectory,'index.json'),index=await read(indexFile);assert.deepEqual(index.plan,claim.plan);
  assert.equal(index.status,'EARLY_FROZEN_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(result.status,index.status);
  assert.equal(index.closedMacroExperimentExtended,false);assert.equal(index.closedMacroActualInputs,macroHistory.total);
  assert.equal(index.fixedColourInputs,index.stocksEnteringColourCspIncludingFailed);assert.equal(result.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
  for(const f of [file,resultFile,indexFile])assert.equal(additionalReviewBindings[f]??additionalReviewBindings[path.resolve(f)],bindings[f],'Separate completed experiment requires exact independent history review');
  for(const d of result.constructionFiles){const q=await bound(d);assert.equal(additionalReviewBindings[d.path]??additionalReviewBindings[path.resolve(d.path)],d.sha256);
   const seen=new Set();for(const level of [q.placeholderWorld,q.plain?.level,q.level].filter(Boolean)){const hash=levelSha256(level);if(seen.has(hash))continue;seen.add(hash);
    previousLateStocks.push({...d,sourceLevelId:q.sourceLevelId??level.id,reference:q.provenance?.reference??q.plain?.provenance?.reference??null,shapeSha256:designFingerprints(level).shapeSha256,fingerprints:designFingerprints(level),level,separateExperiment:true});}}
  separateConstructionHistory.push({claim:{path:file,sha256:bindings[file]},result:{path:resultFile,sha256:bindings[resultFile]},index:{path:indexFile,sha256:bindings[indexFile]},includedInMacroCount:false});
 }
 const publicStocks=[];for(const name of await fs.readdir(PUBLIC_LEDGER))if(name.endsWith('.request.json')){const file=path.join(PUBLIC_LEDGER,name),r=await read(file);
  publicStocks.push({path:file,sha256:bindings[file],id:r.id,shapeSha256:r.shapeSha256,colorSha256:r.colorSha256,designSha256:r.designSha256??r.id,retryIdentitySha256:levelSha256({shapeSha256:r.shapeSha256,colorSha256:r.colorSha256})});}
 const failedParents=[];for(const spec of context.failedParents){const d=spec.receipt;assert(typeof spec.branchId==='string'&&spec.branchId);const q=await bound(d);assert.equal(q.accepted,false);assert(q.attempt?.id&&q.sourceLevelId);
  const requestFile=`${PUBLIC_LEDGER}/${q.attempt.id}.request.json`,resultFile=`${PUBLIC_LEDGER}/${q.attempt.id}.result.json`,request=await read(requestFile),result=await read(resultFile);
  assert.deepEqual(q.attempt,request);assert.equal(result.accepted,false);assert.equal(result.levelSha256,q.levelSha256);assert.equal(levelSha256(q.level),q.levelSha256);
  assertLowBandFailedParentResult(q,result);
  const blockedFile=`${PUBLIC_LEDGER}/${q.attempt.id}.blocked.json`,blocked=await read(blockedFile);assert.equal(blocked.attemptId,request.id);assert.equal(blocked.status,q.status);
  const identityBlockedFile=`${PUBLIC_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`;await read(identityBlockedFile);
  failedParents.push({branchId:spec.branchId,identityBlockedFile,identityBlockedSha256:bindings[identityBlockedFile],source:q.sourceLevelId,file:d.path,sha256:d.sha256,id:request.id,requestFile,requestSha256:bindings[requestFile],resultFile,resultSha256:bindings[resultFile],blockedFile,blockedSha256:bindings[blockedFile],fingerprints:designFingerprints(q.level)});}
 const blueprints=[];for(const recipe of context.recipes){const reference=await bound(recipe.reference);const bp=makeExplicitLowBandBatchRecipe(runtime,reference,recipe);
  bp.currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,bp.sourceLevelId,{qualificationOnly:false});await checkBindings(bp.currentSourceBinding.bindings);mergeBindings(bindings,bp.currentSourceBinding.bindings);blueprints.push(bp);}
 const qualification=await bound(context.lowBandQualification);await assertReviewedLowBandQualification(qualification,bindings);
 const inheritedKeys=['old450','sealedFailures','qualification','geometry','similarity','gatePolicy','staticPartitionBudget','colourBudget','sameInputBudget','previousMacro','comparisonOnly'];
 for(const key of ['old450','previousMacro','comparisonOnly'])for(const d of inherited[key])await bound(d);
 const compiled=await build({entryPoints:[own,driver,runner],bundle:true,packages:'external',write:false,outdir:'unused-native-batch',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs)){const h=sha(await fs.readFile(file));if(bindings[file])assert.equal(bindings[file],h);bindings[file]=h;}
 const oldInventory=inherited.ledgerSnapshot??await bound(inherited.ledgerInventory);
 const inheritedRoots=oldInventory.roots.map(r=>path.resolve(r.directory)).sort();assert([LEGACY_HISTORY_LEDGER_ROOTS,HISTORY_LEDGER_ROOTS].some(roots=>JSON.stringify(roots.map(r=>path.resolve(r)).sort())===JSON.stringify(inheritedRoots)),'All inherited identity ledgers are required');
 for(const root of oldInventory.roots)for(const d of root.files)await bound(d);
 const quota=blueprints.reduce((n,b)=>n+b.maximumStocks,0),ledgerSnapshot=await captureLedgerSnapshot(bindings);
 const plan={...Object.fromEntries(inheritedKeys.map(k=>[k,inherited[k]])),schemaVersion:4,scope:300,version:LOW_BAND_BATCH_VERSION,
  status:'FINITE_LOW_BAND_BATCH_PREPARED_NO_CONSTRUCTION',qualificationOnly:false,selectedIndex:context.selection,selectionReview:context.selectionReview,selected,selectedCount:selected.length,
  proposal:context.proposal,additionalHistoryReviews:context.additionalHistoryReviews??[],separateConstructionHistory,historyCheckpoint:context.historyCheckpoint,lowBandQualification:context.lowBandQualification,blueprints,approvedRecipes:blueprints.map(b=>b.recipeId),failedParents,publicStocks,previousLateStocks,history:macroHistory,
  campaign:{key:context.proposal.sha256,maximumInputs:quota,previousActualInputs:macroHistory.total,userGlobalLimitClaimed:false},maximumAfterThisBatch:macroHistory.total+quota,shapePolicy:'failed-parent-and-same-source-branch-only',globalShapeInventoryUniquenessRequired:false,
  maximumStaticPartitionAttempts:context.maximumStaticPartitionAttempts??2000,maximumFinalColourInputsIncludingRejected:quota,maximumStocksEnteringColourCspIncludingFailed:quota,
  staticSlots:{1:{formalId:'daily-basic-combined-d1-01',stageKey:'basic-combined',difficulty:1,slot:1,newestMechanism:null},2:{formalId:'daily-basic-combined-d2-01',stageKey:'basic-combined',difficulty:2,slot:1,newestMechanism:null}},futureStrategy:{tailStrategy:'plain-joint-low-band',originalLowerFloors:{1:16,2:21},originalUpperCeilings:{1:20,2:30},maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},
  futureUpperBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},
  futureLowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},
  executionEnvironment:environment,mathematicalToolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,executionTool:driver,mathExecutionTool:runner,
  ledgerSnapshot,bindings,slotAssigned:false,candidatePoolOnly:true,noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,currentRuntimeValidationClaimed:false,formalReady:false};
 assertLowBandBatchPlan(plan);await checkBindings(bindings);return plan;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [contextPath,contextSha,out]=process.argv.slice(2);assert(out&&!(await exists(out)));const d={path:contextPath,sha256:contextSha};
 const plan=await prepareLowBandBatch(await readBound(d));mergeBindings(plan.bindings,{[d.path]:d.sha256});
 await fs.mkdir(out,{recursive:false});const file=path.join(out,'plan.json');await write(file,plan);
 console.log(JSON.stringify({plan:{path:file,sha256:sha(await fs.readFile(file))},newConstructions:0,newSearches:0,newClaims:0}));
}

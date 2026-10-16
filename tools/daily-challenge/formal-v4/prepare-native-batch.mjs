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
import {NATIVE_BATCH_VERSION,assertNativeBatchPlan,assertNativeBatchRecipe,deriveNativeMacroAccounting,descriptor,integer} from './native-batch-contract.mjs';
import {sha,write,exists,readBound,readFile,checkBindings,captureLedgerSnapshot,walkJson,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,HISTORY_LEDGER_ROOTS,mergeBindings,assertReviewedNativeQualification} from './native-batch-io.mjs';

const own='tools/daily-challenge/formal-v4/prepare-native-batch.mjs',driver='tools/daily-challenge/formal-v4/construct-native-batch.mjs',runner='tools/daily-challenge/formal-v4/run-native-batch.mjs';
export function nativeSelectionReviewBindings(review,index,selection){
 assert.deepEqual(review.selection,selection);assert.deepEqual(review.errors,[]);assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);
 if(review.status==='INDEPENDENT_150_MERGE_QUICK_CHECK_PASS'){
  assert.equal(index.scope,300);assert.equal(review.candidates,index.files.length);
  for(const key of ['old147ExactPrefixAndBytes','advancedOriginalReceiptBytes','nativePhysicalAndOriginalMathematicsUnchanged','nativeDraftStillUnaccepted'])assert.equal(review[key],true);
  assert.equal(review.scope,'Exact merge objects and original147 bytes, not a repeat of full historical proof searches or Pointer acceptance');
  assert(review.inputBindings);return review.inputBindings;
 }
 if(review.status==='INDEPENDENT_NATIVE_BATCH_SELECTION_PASS'){
  assert.equal(review.candidates,index.files.length);assert.equal(review.scope,300);assert(review.inputBindings);return review.inputBindings;
 }
 assert.equal(review.status,'READONLY_LOW_BAND_ADVANCED_NATIVE_MERGE_COMPLETE');assert.equal(review.combinedCandidates,index.files.length);assert(review.fileBindings);return review.fileBindings;
}
/** An explicit region/cut is accepted only after both complete reference
 * replays. No tiling, colouring or gameplay search occurs in preparation. */
export function makeExplicitNativeBatchRecipe(runtime,reference,recipe){
 descriptor(recipe.reference);integer(recipe.cut,1,reference.drags.length);integer(recipe.maximumStocks,1,64);
 assert(reference.accepted&&reference.L>=31&&Number.isFinite(reference.U)&&reference.L<=reference.U);assert.equal(reference.levelSha256,levelSha256(reference.level));
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
 const bp={version:LATE_REGION_VERSION,recipeId:recipe.recipeId,maximumStocks:recipe.maximumStocks,targetDifficulty:3,
  reference:recipe.reference,referenceLevelSha256:reference.levelSha256,referenceRouteSha256:routeSha256(reference.drags),sourceLevelId,
  sourceLevelSha256:levelSha256(source),normalBoardArea,normalDimensions:[level.width,level.height],boardOutlineSha256:boardBaselineSha256(source),
  level:structuredClone(level),changedBodies:structuredClone(changedBodies),fixedBlocks:structuredClone(level.blocks.filter(b=>!ids.has(b.id))),
  region:{cells,bodyIds:changedBodies.map(b=>b.id),area:cells.length,fraction:cells.length/normalBoardArea,originalBodyCount:ids.size,connected:true},
  prefixDrags,prefixSha256:routeSha256(prefixDrags),prefixFacts:{drags:recipe.cut,parking:prefixDrags.filter(d=>!d.exitSide).length,clears:prefixDrags.filter(d=>d.exitSide).length},
  referenceL:reference.L,referenceU:reference.U,knownReferenceOnly:true,newCandidateRouteNotClaimed:true,searchPerformed:false,prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true};
 assertNativeBatchRecipe(bp);
 let partial=structuredClone(level);const prefixAudits=[];for(const drag of prefixDrags){const a=auditPlainForwardDrag(runtime,partial,drag);assert(a.valid,a.error);
  if(prefixAudits.length)assert.equal(a.beforeBodiesSha256,prefixAudits.at(-1).afterBodiesSha256);prefixAudits.push(a);
  if(drag.exitSide)partial.blocks=partial.blocks.filter(b=>b.id!==drag.blockId);
  else if(drag.path.length){const b=partial.blocks.find(b=>b.id===drag.blockId);[b.x,b.y]=drag.path.at(-1);}}
 bp.referenceQualification={canonical:actual,independent,prefixAudits,searchPerformed:false};
 return bp;
}

/** Only returns a plan object. CLI writing is a separate explicit command. */
export async function prepareNativeBatch(context){
 descriptor(context.selection);descriptor(context.selectionReview);descriptor(context.historyCheckpoint);descriptor(context.nativeQualification);
 assert(context.recipes?.length&&context.failedParents?.length);integer(context.maximumStaticPartitionAttempts??2000,1,2000);
 const bindings={},bound=d=>readBound(d,bindings),read=p=>readFile(p,bindings);
 const checkpoint=await bound(context.historyCheckpoint);assert.equal(checkpoint.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(checkpoint.errors,[]);
 assert.equal(checkpoint.newSearches,0);assert.equal(checkpoint.newConstructionCalls,0);assert.equal(checkpoint.newLedgerClaims,0);await checkBindings(checkpoint.fileBindings);mergeBindings(bindings,checkpoint.fileBindings);
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
   previous:p.previousMacro64ActualInputs,actual:index.fixedColourInputs,after:index.macro64ActualInputsIncludingThis,quota:p.maximumStocksEnteringColourCspIncludingFailed,qualificationOnly:false,terminal:true});
  for(const d of result.constructionFiles??[]){const q=await bound(d);if(q.placeholderWorld){const level=q.level??q.placeholderWorld;previousLateStocks.push({...d,shapeSha256:designFingerprints(level).shapeSha256,level});}}
 }
 const macroHistory=deriveNativeMacroAccounting(macroRows);assert.equal(macroHistory.total,lastIndex.macro64ActualInputsIncludingThis,'Latest independently reviewed actual history required');
 assert.equal(macroRows.at(-1)?.terminal,true);assert(macroRows.some(r=>r.plan.sha256===completion.batchPlan.sha256));
 const publicStocks=[];for(const name of await fs.readdir(PUBLIC_LEDGER))if(name.endsWith('.request.json')){const file=path.join(PUBLIC_LEDGER,name),r=await read(file);
  publicStocks.push({path:file,sha256:bindings[file],id:r.id,shapeSha256:r.shapeSha256,colorSha256:r.colorSha256,designSha256:r.designSha256??r.id,retryIdentitySha256:levelSha256({shapeSha256:r.shapeSha256,colorSha256:r.colorSha256})});}
 const failedParents=[];for(const d of context.failedParents){const q=await bound(d);assert.equal(q.accepted,false);assert(q.attempt?.id&&q.sourceLevelId);
  const requestFile=`${PUBLIC_LEDGER}/${q.attempt.id}.request.json`,resultFile=`${PUBLIC_LEDGER}/${q.attempt.id}.result.json`,request=await read(requestFile),result=await read(resultFile);
  assert.deepEqual(q.attempt,request);assert.equal(result.accepted,false);assert.equal(result.levelSha256,q.levelSha256);assert.equal(levelSha256(q.level),q.levelSha256);
  assert.equal(result.status,q.status);assert.deepEqual(result.lower,q.proof);assert.deepEqual(result.upper,q.route?.search);
  const blockedFile=`${PUBLIC_LEDGER}/${q.attempt.id}.blocked.json`,blocked=await read(blockedFile);assert.equal(blocked.attemptId,request.id);assert.equal(blocked.status,q.status);
  failedParents.push({source:q.sourceLevelId,file:d.path,sha256:d.sha256,id:request.id,requestFile,requestSha256:bindings[requestFile],resultFile,resultSha256:bindings[resultFile],blockedFile,blockedSha256:bindings[blockedFile],fingerprints:designFingerprints(q.level)});}
 const blueprints=[];for(const recipe of context.recipes){const reference=await bound(recipe.reference);const bp=makeExplicitNativeBatchRecipe(runtime,reference,recipe);
  bp.currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,bp.sourceLevelId,{qualificationOnly:false});await checkBindings(bp.currentSourceBinding.bindings);mergeBindings(bindings,bp.currentSourceBinding.bindings);blueprints.push(bp);}
 const qualification=await bound(context.nativeQualification);await assertReviewedNativeQualification(qualification,bindings);
 const inheritedKeys=['old450','sealedFailures','qualification','geometry','similarity','gatePolicy','staticPartitionBudget','colourBudget','sameInputBudget','staticSlot','previousMacro','comparisonOnly'];
 for(const key of ['old450','previousMacro','comparisonOnly'])for(const d of inherited[key])await bound(d);
 const compiled=await build({entryPoints:[own,driver,runner],bundle:true,packages:'external',write:false,outdir:'unused-native-batch',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs)){const h=sha(await fs.readFile(file));if(bindings[file])assert.equal(bindings[file],h);bindings[file]=h;}
 const oldInventory=inherited.ledgerSnapshot??await bound(inherited.ledgerInventory);
 assert.deepEqual(oldInventory.roots.map(r=>path.resolve(r.directory)).sort(),HISTORY_LEDGER_ROOTS.map(r=>path.resolve(r)).sort(),'All five historical identity ledgers are required');
 for(const root of oldInventory.roots)for(const d of root.files)await bound(d);
 const quota=blueprints.reduce((n,b)=>n+b.maximumStocks,0),ledgerSnapshot=await captureLedgerSnapshot(bindings);
 const plan={...Object.fromEntries(inheritedKeys.map(k=>[k,inherited[k]])),schemaVersion:4,scope:300,version:NATIVE_BATCH_VERSION,
  status:'FINITE_NATIVE120_BATCH_PREPARED_NO_CONSTRUCTION',qualificationOnly:false,selectedIndex:context.selection,selectionReview:context.selectionReview,selected,selectedCount:selected.length,
  historyCheckpoint:context.historyCheckpoint,nativeQualification:context.nativeQualification,blueprints,approvedRecipes:blueprints.map(b=>b.recipeId),failedParents,publicStocks,previousLateStocks,macroHistory,
  previousMacro64ActualInputs:macroHistory.total,maximumAfterThisBatch:macroHistory.total+quota,combinedMaximumInputs:64,
  maximumStaticPartitionAttempts:context.maximumStaticPartitionAttempts??2000,maximumFinalColourInputsIncludingRejected:quota,maximumStocksEnteringColourCspIncludingFailed:quota,
  sequence:structuredClone(context.sequence),futureStrategy:{tailStrategy:'native-120',originalLowerFloor:31,maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},
  futureUpperBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:120000},
  futureLowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},
  executionEnvironment:environment,mathematicalToolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,executionTool:driver,mathExecutionTool:runner,
  ledgerSnapshot,bindings,slotAssigned:false,candidatePoolOnly:true,noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,currentRuntimeValidationClaimed:false,formalReady:false};
 assertNativeBatchPlan(plan);await checkBindings(bindings);return plan;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [contextPath,contextSha,out]=process.argv.slice(2);assert(out&&!(await exists(out)));const d={path:contextPath,sha256:contextSha};
 const plan=await prepareNativeBatch(await readBound(d));mergeBindings(plan.bindings,{[d.path]:d.sha256});
 await fs.mkdir(out,{recursive:false});const file=path.join(out,'plan.json');await write(file,plan);
 console.log(JSON.stringify({plan:{path:file,sha256:sha(await fs.readFile(file))},newConstructions:0,newSearches:0,newClaims:0}));
}

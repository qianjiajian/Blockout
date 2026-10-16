import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

export const NEXT_NATIVE_PLAN_VERSION='late-prefix-native-reviewed-three-v2';
export const NEXT_NATIVE_PLAN_REVIEW_STATUS='INDEPENDENT_NEXT_NATIVE_FIXED_RECIPE_PLAN_PASS';
const descriptor=d=>assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Bound descriptor required');
const integer=(n,minimum,maximum)=>assert(Number.isSafeInteger(n)&&n>=minimum&&n<=maximum);
export function assertNextNativeRecipePlan(plan){
 assert.equal(plan.version,NEXT_NATIVE_PLAN_VERSION);assert.equal(plan.scope,300);
 assert.equal(plan.maximumFinalColourInputsIncludingRejected,3);assert.equal(plan.maximumStocksEnteringColourCspIncludingFailed,3);
 assert.equal(plan.maximumStaticPartitionAttempts,2000);assert.equal(plan.combinedMaximumInputs,64);
 integer(plan.previousMacro64ActualInputs,51,61);assert.equal(plan.maximumAfterThisBatch,plan.previousMacro64ActualInputs+3);
 assert.equal(plan.blueprints.length,3);assert.equal(new Set(plan.blueprints.map(b=>b.recipeId)).size,3);
 assert.equal(new Set(plan.blueprints.map(b=>b.sourceLevelId)).size,3);
 assert.equal(plan.approvedRecipes.length,3);assert.deepEqual(plan.blueprints.map(b=>b.recipeId),plan.approvedRecipes);
 descriptor(plan.proposal);descriptor(plan.proposalReview);descriptor(plan.selectedIndex);descriptor(plan.nativeQualification);
 assert.equal(plan.deferredRecipesExecutable,false);assert.equal(plan.selected.length,plan.selectedCount);
 integer(plan.selectedCount,148,150);assert.equal(plan.advancedOutcomes.length,2);
 for(const b of plan.blueprints){
  assert.equal(b.maximumStocks,1);assert.equal(b.targetDifficulty,3);descriptor(b.reference);
  assert.equal(b.referenceLevelSha256,levelSha256(b.level));assert.equal(b.prefixSha256,routeSha256(b.prefixDrags));
  assert.equal(b.prefixFacts.drags,b.prefixDrags.length);assert.equal(b.prefixFacts.parking+b.prefixFacts.clears,b.prefixDrags.length);
  assert(b.region.connected&&b.region.fraction>=.35);assert.equal(b.region.area,b.region.cells.length);
  assert.equal(new Set(b.region.cells.map(p=>p.join(','))).size,b.region.cells.length);
  const ids=new Set(b.changedBodies.map(x=>x.id));assert.deepEqual([...ids].sort(),[...b.region.bodyIds].sort());
  assert(b.prefixDrags.every(d=>!ids.has(d.blockId)));assert.deepEqual(b.fixedBlocks,b.level.blocks.filter(x=>!ids.has(x.id)));
  assert.equal(plan.failedParents.filter(p=>p.source===b.sourceLevelId).length,1);
 }
 assert.equal(plan.futureStrategy.tailStrategy,'native');assert.equal(plan.futureStrategy.originalLowerFloor,31);
 assert.equal(plan.futureStrategy.maximumTailCalls,1);assert.equal(plan.futureStrategy.maximumOriginalLowerCalls,1);
 assert.equal(plan.futureStrategy.fullUpperSearchAfterTailFailure,false);assert.equal(plan.futureStrategy.noOtherStrategyOnSameInput,true);
 for(const [budget,states]of [[plan.futureUpperBudget,10000],[plan.futureLowerBudget,9999]]){
  assert.equal(budget.maxStates,states);assert.equal(budget.maxTransitions,10000000);assert.equal(budget.maxMicroStates,3000000);
  assert.equal(budget.maxDragStates,10000);assert.equal(budget.maxMilliseconds,30000);
 }
 assert.equal(plan.staticSlot.stageKey,'basic-combined');assert.equal(plan.staticSlot.difficulty,3);assert.equal(plan.slotAssigned,false);
 integer(plan.sequence.baseSeed,1,2**32-1);integer(plan.sequence.step,1,100000);integer(plan.sequence.sourceFactor,1,100000);
 assert(plan.sequence.bodyCountDeltas.length&&plan.sequence.bodyCountDeltas.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=3));
 assert.equal(plan.similarity.reference,.65);assert.equal(plan.similarity.selectedPreFilter,.65);assert.equal(plan.similarity.old450,.75);
 assert.equal(plan.similarity.source,.55);assert.equal(plan.similarity.priorMacro,.65);assert.equal(plan.similarity.newBatch,.65);
 assert.equal(plan.noVisualOrPhysicalIndependenceClaimBeforeActualConstruction,true);
 return true;
}

/** Counts are actual CSP inputs, not the predeclared maximum of three. */
export function assertNextNativeConstructedIndex(index,plan){
 assertNextNativeRecipePlan(plan);
 assert.equal(index.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.scope,300);
 integer(index.fixedColourInputs,0,plan.maximumStocksEnteringColourCspIncludingFailed);
 assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
 integer(index.eligibleInputs,0,index.fixedColourInputs);assert.equal(index.candidates.length,index.eligibleInputs);
 assert.equal(index.macro64ActualInputsIncludingThis,plan.previousMacro64ActualInputs+index.fixedColourInputs);
 assert(index.macro64ActualInputsIncludingThis<=plan.maximumAfterThisBatch);
 const counts=index.perRecipeColourCspInputs;assert(counts&&typeof counts==='object'&&!Array.isArray(counts));
 for(const [id,n]of Object.entries(counts)){assert(plan.approvedRecipes.includes(id));integer(n,0,1);}
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),index.fixedColourInputs);
 const candidateRecipeIds=index.candidates.map(d=>d.recipeId);assert.equal(new Set(candidateRecipeIds).size,candidateRecipeIds.length);
 for(const d of index.candidates){descriptor(d);const b=plan.blueprints.find(r=>r.recipeId===d.recipeId);assert(b);assert.equal(d.sourceLevelId,b.sourceLevelId);assert.equal(counts[d.recipeId],1);}
 assert.equal(index.gameplaySearches,0);assert.equal(index.publicLedgerClaims,0);assert.equal(index.accepted,0);assert.equal(index.formalReady,false);
 return true;
}

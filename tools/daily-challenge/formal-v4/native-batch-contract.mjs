import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

export const NATIVE_BATCH_VERSION='finite-reviewed-native120-batch-v1';
export const NATIVE_BATCH_REVIEW_STATUS='INDEPENDENT_FINITE_NATIVE_BATCH_PLAN_PASS';
export const NATIVE_BATCH_STATIC_REVIEW_STATUS='INDEPENDENT_FINITE_NATIVE_BATCH_STATIC_PASS';
export const descriptor=d=>assert(d&&typeof d.path==='string'&&d.path.length&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact descriptor required');
export const integer=(n,min,max,label='integer')=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,label);
const sorted=ps=>ps.map(p=>{assert(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger));return p.join(',');}).sort();
const footprint=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]);
function connected(cells){const all=new Set(sorted(cells)),seen=new Set(),queue=[cells[0]];
 for(const p of queue){const k=p.join(',');if(seen.has(k))continue;seen.add(k);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dy];if(all.has(q.join(','))&&!seen.has(q.join(',')))queue.push(q);}}
 return seen.size===all.size;
}
export function assertNativeBatchRecipe(b){
 assert(typeof b.recipeId==='string'&&/^[a-z0-9-]+$/.test(b.recipeId));integer(b.sourceLevelId,1,200);integer(b.maximumStocks,1,64);descriptor(b.reference);
 assert.equal(b.targetDifficulty,3);assert.equal(b.referenceLevelSha256,levelSha256(b.level));
 assert.equal(b.level.id,b.sourceLevelId);integer(b.prefixFacts.drags,1,10000);
 assert.equal(b.prefixFacts.drags,b.prefixDrags.length);assert.equal(b.prefixSha256,routeSha256(b.prefixDrags));
 assert.equal(b.prefixFacts.parking,b.prefixDrags.filter(d=>!d.exitSide).length);assert.equal(b.prefixFacts.clears,b.prefixDrags.filter(d=>d.exitSide).length);
 const ids=new Set(b.changedBodies.map(x=>x.id));assert.equal(ids.size,b.changedBodies.length);assert(ids.size>0);
 assert.deepEqual([...ids].sort(),b.region.bodyIds.toSorted());
 assert.deepEqual(b.changedBodies,b.level.blocks.filter(x=>ids.has(x.id)));assert.deepEqual(b.fixedBlocks,b.level.blocks.filter(x=>!ids.has(x.id)));
 assert(b.prefixDrags.every(d=>!ids.has(d.blockId)&&b.fixedBlocks.some(x=>x.id===d.blockId)));
 const actual=b.changedBodies.flatMap(footprint),all=b.level.blocks.flatMap(footprint);
 assert.equal(new Set(sorted(all)).size,all.length,'Reference inventory overlaps');
 assert.deepEqual(sorted(actual),sorted(b.region.cells));assert.equal(new Set(sorted(actual)).size,actual.length);
 assert.equal(b.region.area,actual.length);assert.equal(b.normalBoardArea,all.length);assert.equal(b.region.fraction,actual.length/all.length);
 assert(b.region.fraction>=.35&&b.region.fraction<1&&b.region.connected&&connected(actual),'A real connected >=35% region is required');
 assert.equal(b.prefixIsNotLowerBound,true);assert.equal(b.oldSuffixIsNotNewU,true);
 return true;
}

/** Actual finished claims, including colour rejection, form a contiguous
 * historical chain. No maximum quota is substituted for actual input count. */
export function deriveNativeMacroAccounting(rows){
 assert(Array.isArray(rows)&&rows.length);const sortedRows=rows.toSorted((a,b)=>a.previous-b.previous||a.after-b.after||a.plan.sha256.localeCompare(b.plan.sha256));
 let total=sortedRows[0].previous;integer(total,0,64);const seen=new Set();
 for(const r of sortedRows){descriptor(r.plan);assert(!seen.has(r.plan.sha256),'Duplicate historical plan');seen.add(r.plan.sha256);
  assert.equal(r.qualificationOnly,false);assert.equal(r.terminal,true,'Unfinished batch cannot be omitted');
  integer(r.actual,0,64);integer(r.quota,1,64);assert(r.actual<=r.quota);assert.equal(r.previous,total,'Missing or overlapping macro history');
  assert.equal(r.after,r.previous+r.actual);total=r.after;integer(total,0,64);
 }
 return {initialBeforeSharedLedger:sortedRows[0].previous,actualCspInputs:sortedRows.reduce((n,r)=>n+r.actual,0),total,remaining:64-total,rows:sortedRows};
}
export function assertNativeBatchPlan(p){
 assert.equal(p.version,NATIVE_BATCH_VERSION);assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);assert.equal(p.qualificationOnly,false);
 descriptor(p.selectedIndex);descriptor(p.selectionReview);descriptor(p.historyCheckpoint);descriptor(p.nativeQualification);
 assert.equal(p.selected.length,p.selectedCount);integer(p.selectedCount,1,300);p.selected.forEach(descriptor);
 assert.equal(new Set(p.selected.map(d=>d.path)).size,p.selectedCount);assert.equal(p.combinedMaximumInputs,64);
 const accounting=deriveNativeMacroAccounting(p.macroHistory.rows);assert.equal(accounting.total,p.previousMacro64ActualInputs);
 assert.equal(accounting.remaining,p.macroHistory.remaining);assert.deepEqual(p.macroHistory,accounting);
 assert(Array.isArray(p.blueprints)&&p.blueprints.length);assert.equal(new Set(p.blueprints.map(b=>b.recipeId)).size,p.blueprints.length);
 p.blueprints.forEach(assertNativeBatchRecipe);assert.deepEqual(p.approvedRecipes,p.blueprints.map(b=>b.recipeId));
 const quota=p.blueprints.reduce((n,b)=>n+b.maximumStocks,0);integer(quota,1,accounting.remaining);
 assert.equal(p.maximumFinalColourInputsIncludingRejected,quota);assert.equal(p.maximumStocksEnteringColourCspIncludingFailed,quota);
 assert.equal(p.maximumAfterThisBatch,accounting.total+quota);integer(p.maximumStaticPartitionAttempts,1,2000);
 for(const source of new Set(p.blueprints.map(b=>b.sourceLevelId)))assert.equal(p.failedParents.filter(r=>r.source===source).length,1,'One exact failed parent per source');
 assert.equal(p.futureStrategy.tailStrategy,'native-120');assert.equal(p.futureStrategy.originalLowerFloor,31);
 assert.equal(p.futureStrategy.maximumTailCalls,1);assert.equal(p.futureStrategy.maximumOriginalLowerCalls,1);
 assert.equal(p.futureStrategy.fullUpperSearchAfterTailFailure,false);assert.equal(p.futureStrategy.noOtherStrategyOnSameInput,true);
 for(const [b,states,ms]of [[p.futureUpperBudget,10000,120000],[p.futureLowerBudget,9999,30000]]){
  assert.equal(b.maxStates,states);assert.equal(b.maxMilliseconds,ms);assert.equal(b.maxTransitions,10000000);assert.equal(b.maxMicroStates,3000000);assert.equal(b.maxDragStates,10000);
 }
 integer(p.sequence.baseSeed,1,2**32-1);integer(p.sequence.step,1,100000);integer(p.sequence.sourceFactor,1,100000);
 assert(p.sequence.bodyCountDeltas.length&&p.sequence.bodyCountDeltas.every(x=>Number.isSafeInteger(x)&&x>=-2&&x<=3));
 for(const key of ['reference','selectedPreFilter','priorMacro','newBatch'])assert.equal(p.similarity[key],.65);
 assert.equal(p.similarity.source,.55);assert.equal(p.similarity.old450,.75);
 assert.equal(p.staticSlot.stageKey,'basic-combined');assert.equal(p.staticSlot.difficulty,3);
 for(const k of ['slotAssigned','formalReady','currentRuntimeValidationClaimed'])assert.equal(p[k],false);
 assert.equal(p.noVisualOrPhysicalIndependenceClaimBeforeActualConstruction,true);
 assert(p.bindings&&Object.keys(p.bindings).length);assert(p.ledgerSnapshot?.roots?.length);
 return true;
}
export function assertNativeBatchIndex(index,plan){
 assertNativeBatchPlan(plan);assert.equal(index.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.scope,300);
 integer(index.fixedColourInputs,0,plan.maximumStocksEnteringColourCspIncludingFailed);
 assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
 integer(index.eligibleInputs,0,index.fixedColourInputs);assert.equal(index.candidates.length,index.eligibleInputs);
 assert.equal(index.macro64ActualInputsIncludingThis,plan.previousMacro64ActualInputs+index.fixedColourInputs);
 assert(index.macro64ActualInputsIncludingThis<=plan.maximumAfterThisBatch);
 const counts=index.perRecipeColourCspInputs;assert(counts&&typeof counts==='object');
 for(const [id,n]of Object.entries(counts)){const b=plan.blueprints.find(r=>r.recipeId===id);assert(b);integer(n,0,b.maximumStocks);}
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),index.fixedColourInputs);
 const actualCounts={};for(const a of index.attempts){const b=plan.blueprints.find(r=>r.recipeId===a.recipeId);assert(b,'Unknown attempt recipe');
  assert.equal(typeof a.enteredColourCsp,'boolean');if(a.enteredColourCsp){actualCounts[a.recipeId]=(actualCounts[a.recipeId]??0)+1;assert(actualCounts[a.recipeId]<=b.maximumStocks,'Actual recipe CSP quota exceeded');}}
 assert.deepEqual(actualCounts,Object.fromEntries(Object.entries(counts).filter(([,n])=>n>0)),'Per-recipe counts must equal actual attempts');
 assert.equal(index.attempts.filter(a=>a.enteredColourCsp).length,index.fixedColourInputs,'Rejected colour attempts consume quota');
 for(const d of index.candidates){descriptor(d);const b=plan.blueprints.find(r=>r.recipeId===d.recipeId);assert(b);assert.equal(d.sourceLevelId,b.sourceLevelId);}
 for(const k of ['gameplaySearches','publicLedgerClaims','accepted'])assert.equal(index[k],0);assert.equal(index.formalReady,false);
 return true;
}
export function recordNativeColourAttempt(counts,recipe,built){
 const entered=!!built.paint;if(entered){const next=(counts.get(recipe.recipeId)??0)+1;assert(next<=recipe.maximumStocks,'CSP recipe quota exhausted');counts.set(recipe.recipeId,next);}
 assert(!built.ok||entered,'Accepted colour stock must consume CSP quota');return entered;
}

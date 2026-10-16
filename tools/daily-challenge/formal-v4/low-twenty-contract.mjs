import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

export const LOW_BAND_BATCH_VERSION='separate-fixed-low-band-twenty-v1';
export const LOW_BAND_BATCH_REVIEW_STATUS='INDEPENDENT_LOW_TWENTY_PLAN_PASS';
export const LOW_BAND_BATCH_STATIC_REVIEW_STATUS='INDEPENDENT_LOW_TWENTY_STATIC_PASS';
export const LOW_TWENTY_EXPERIMENT_ID='diverse-low-band-twenty-20261008-v1';
export const descriptor=d=>assert(d&&typeof d.path==='string'&&d.path.length&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact descriptor required');
export const integer=(n,min,max,label='integer')=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,label);
const sorted=ps=>ps.map(p=>{assert(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger));return p.join(',');}).sort();
const footprint=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]);
function connected(cells){const all=new Set(sorted(cells)),seen=new Set(),queue=[cells[0]];
 for(const p of queue){const k=p.join(',');if(seen.has(k))continue;seen.add(k);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dy];if(all.has(q.join(','))&&!seen.has(q.join(',')))queue.push(q);}}
 return seen.size===all.size;
}
export function assertLowBandBatchRecipe(b){
 assert(typeof b.recipeId==='string'&&/^[a-z0-9-]+$/.test(b.recipeId));integer(b.sourceLevelId,1,200);integer(b.maximumStocks,1,64);descriptor(b.reference);
 assert([1,2].includes(b.targetDifficulty));assert.equal(typeof b.branchId,'string');integer(b.maximumStaticPartitionAttempts,1,500);integer(b.seed,1,2**32-1);integer(b.bodyCountDelta,-2,3);assert.equal(b.maximumStocks,1);assert.equal(b.referenceLevelSha256,levelSha256(b.level));
 assert.equal(b.level.id,b.sourceLevelId);integer(b.prefixFacts.drags,1,10000);
 assert.equal(b.prefixFacts.drags,b.prefixDrags.length);assert.equal(b.prefixSha256,routeSha256(b.prefixDrags));
 assert.equal(b.prefixFacts.parking,b.prefixDrags.filter(d=>!d.exitSide).length);assert(b.prefixFacts.parking<(b.targetDifficulty===1?20:30));assert.equal(b.prefixFacts.clears,b.prefixDrags.filter(d=>d.exitSide).length);
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
export function deriveLowBandHistoryAccounting(rows){
 assert(Array.isArray(rows)&&rows.length);const sortedRows=rows.toSorted((a,b)=>a.previous-b.previous||a.after-b.after||a.plan.sha256.localeCompare(b.plan.sha256));
 let total=sortedRows[0].previous;integer(total,0,Number.MAX_SAFE_INTEGER);const seen=new Set();
 for(const r of sortedRows){descriptor(r.plan);assert(!seen.has(r.plan.sha256),'Duplicate historical plan');seen.add(r.plan.sha256);
  assert.equal(r.qualificationOnly,false);assert.equal(r.terminal,true,'Unfinished batch cannot be omitted');
  integer(r.actual,0,Number.MAX_SAFE_INTEGER);integer(r.quota,1,Number.MAX_SAFE_INTEGER);assert(r.actual<=r.quota);assert.equal(r.previous,total,'Missing or overlapping macro history');
  assert.equal(r.after,r.previous+r.actual);total=r.after;integer(total,0,Number.MAX_SAFE_INTEGER);
 }
 return {initialBeforeSharedLedger:sortedRows[0].previous,actualCspInputs:sortedRows.reduce((n,r)=>n+r.actual,0),total,rows:sortedRows};
}
export function assertLowBandBatchPlan(p){
 assert.equal(p.version,LOW_BAND_BATCH_VERSION);assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);assert.equal(p.qualificationOnly,false);
 descriptor(p.selectedIndex);descriptor(p.selectionReview);descriptor(p.historyCheckpoint);descriptor(p.lowBandQualification);descriptor(p.proposal);
 assert.equal(p.selected.length,p.selectedCount);integer(p.selectedCount,1,300);p.selected.forEach(descriptor);
 assert.equal(new Set(p.selected.map(d=>d.path)).size,p.selectedCount);integer(p.campaign.maximumInputs,1,1000);assert.equal(p.campaign.key,p.proposal.sha256);assert.equal(p.campaign.userGlobalLimitClaimed,false);
 assert.equal(p.experimentId,LOW_TWENTY_EXPERIMENT_ID);assert.equal(p.campaign.experimentId,LOW_TWENTY_EXPERIMENT_ID);assert.equal(p.campaign.previousActualInputs,0);assert.equal(p.closedCampaignsExtended,false);assert.equal(p.maximumAfterThisBatch,20);
 const accounting={total:0};assert.equal(p.blueprints.length,20);assert.equal(new Set(p.blueprints.map(b=>b.sourceLevelId)).size,10);
 for(const source of new Set(p.blueprints.map(b=>b.sourceLevelId))){const rows=p.blueprints.filter(b=>b.sourceLevelId===source);assert.equal(rows.length,2);assert.notEqual(JSON.stringify(sorted(rows[0].region.cells)),JSON.stringify(sorted(rows[1].region.cells)),'Two distinct actual regions per source');}
 assert.equal(p.gatePolicy,'all-reference-gates-byte-equivalent-in-original-order');for(const b of p.blueprints)assert.deepEqual(b.allReferenceGates,b.level.gates);
 assert(Array.isArray(p.blueprints)&&p.blueprints.length);assert.equal(new Set(p.blueprints.map(b=>b.recipeId)).size,p.blueprints.length);
 p.blueprints.forEach(assertLowBandBatchRecipe);assert.deepEqual(p.approvedRecipes,p.blueprints.map(b=>b.recipeId));
 for(const source of new Set(p.blueprints.map(b=>b.sourceLevelId)))assert.equal(new Set(p.blueprints.filter(b=>b.sourceLevelId===source).map(b=>b.branchId)).size,1,'One explicit branch per source; recipe labels cannot evade redesign checks');
 const quota=p.blueprints.reduce((n,b)=>n+b.maximumStocks,0);integer(quota,1,p.campaign.maximumInputs);assert.equal(quota,p.campaign.maximumInputs);
 assert.equal(p.maximumFinalColourInputsIncludingRejected,quota);assert.equal(p.maximumStocksEnteringColourCspIncludingFailed,quota);
 assert.equal(p.maximumAfterThisBatch,accounting.total+quota);integer(p.maximumStaticPartitionAttempts,1,10000);assert.equal(p.maximumStaticPartitionAttempts,p.blueprints.reduce((n,b)=>n+b.maximumStaticPartitionAttempts,0));
 for(const b of p.blueprints)assert.equal(p.failedParents.filter(r=>r.source===b.sourceLevelId&&r.branchId===b.branchId).length,1,'One exact failed parent per source branch');
 assert.equal(p.futureStrategy.tailStrategy,'plain-joint-low-band');assert.deepEqual(p.futureStrategy.originalLowerFloors,{1:16,2:21});assert.deepEqual(p.futureStrategy.originalUpperCeilings,{1:20,2:30});
 assert.equal(p.futureStrategy.maximumTailCalls,1);assert.equal(p.futureStrategy.maximumOriginalLowerCalls,1);
 assert.equal(p.futureStrategy.fullUpperSearchAfterTailFailure,false);assert.equal(p.futureStrategy.noOtherStrategyOnSameInput,true);
 for(const [b,states,ms]of [[p.futureUpperBudget,10000,30000],[p.futureLowerBudget,9999,30000]]){
  assert.equal(b.maxStates,states);assert.equal(b.maxMilliseconds,ms);assert.equal(b.maxTransitions,10000000);assert.equal(b.maxMicroStates,3000000);assert.equal(b.maxDragStates,10000);
 }
 for(const key of ['reference','selectedPreFilter','priorMacro','newBatch'])assert.equal(p.similarity[key],.65);
 assert.equal(p.similarity.source,.55);assert.equal(p.similarity.old450,.75);
 for(const d of [1,2]){assert.deepEqual(p.staticSlots[d],{formalId:`daily-basic-combined-d${d}-01`,stageKey:'basic-combined',difficulty:d,slot:1,newestMechanism:null});}assert.equal(p.shapePolicy,'failed-parent-and-same-source-branch-only');assert.equal(p.globalShapeInventoryUniquenessRequired,false);
 for(const k of ['slotAssigned','formalReady','currentRuntimeValidationClaimed'])assert.equal(p[k],false);
 assert.equal(p.noVisualOrPhysicalIndependenceClaimBeforeActualConstruction,true);
 descriptor(p.constructorQualification);descriptor(p.proposalReview);assert.equal(p.closedCampaignsExtended,false);
 assert(p.bindings&&Object.keys(p.bindings).length);assert(p.ledgerSnapshot?.roots?.length);
 return true;
}
export function assertLowBandBatchIndex(index,plan){
 assertLowBandBatchPlan(plan);assert.equal(index.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.scope,300);
 integer(index.fixedColourInputs,0,plan.maximumStocksEnteringColourCspIncludingFailed);
 assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
 integer(index.eligibleInputs,0,index.fixedColourInputs);assert.equal(index.candidates.length,index.eligibleInputs);
 assert.equal(index.totalActualInputsIncludingThis,plan.campaign.previousActualInputs+index.fixedColourInputs);assert(index.totalActualInputsIncludingThis<=plan.maximumAfterThisBatch);assert.equal(index.campaignKey,plan.campaign.key);assert.equal(index.experimentId,LOW_TWENTY_EXPERIMENT_ID);assert.equal(index.closedCampaignsExtended,false);
 const counts=index.perRecipeColourCspInputs;assert(counts&&typeof counts==='object');
 for(const [id,n]of Object.entries(counts)){const b=plan.blueprints.find(r=>r.recipeId===id);assert(b);integer(n,0,b.maximumStocks);}
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),index.fixedColourInputs);
 const actualCounts={},staticCounts={};assert(index.attempts.length<=plan.maximumStaticPartitionAttempts);
 for(const a of index.attempts){const b=plan.blueprints.find(r=>r.recipeId===a.recipeId);assert(b,'Unknown attempt recipe');
  const prior=staticCounts[a.recipeId]??0;assert.equal(a.localAttempt,prior);staticCounts[a.recipeId]=prior+1;assert(staticCounts[a.recipeId]<=b.maximumStaticPartitionAttempts);
  assert.equal(typeof a.enteredColourCsp,'boolean');if(a.enteredColourCsp){actualCounts[a.recipeId]=(actualCounts[a.recipeId]??0)+1;assert(actualCounts[a.recipeId]<=b.maximumStocks,'Actual recipe CSP quota exceeded');}}
 assert.deepEqual(actualCounts,Object.fromEntries(Object.entries(counts).filter(([,n])=>n>0)),'Per-recipe counts must equal actual attempts');
 assert.deepEqual(staticCounts,index.perRecipeStaticAttempts,'Per-recipe static attempts must match actual records');
 assert.equal(index.attempts.filter(a=>a.enteredColourCsp).length,index.fixedColourInputs,'Rejected colour attempts consume quota');
 for(const d of index.candidates){descriptor(d);const b=plan.blueprints.find(r=>r.recipeId===d.recipeId);assert(b);assert.equal(d.sourceLevelId,b.sourceLevelId);assert.equal(d.targetDifficulty,b.targetDifficulty);}
 for(const k of ['gameplaySearches','publicLedgerClaims','accepted'])assert.equal(index[k],0);assert.equal(index.formalReady,false);
 return true;
}
export function recordLowBandColourAttempt(counts,recipe,built){
 const entered=!!built.paint;if(entered){const next=(counts.get(recipe.recipeId)??0)+1;assert(next<=recipe.maximumStocks,'CSP recipe quota exhausted');counts.set(recipe.recipeId,next);}
 assert(!built.ok||entered,'Accepted colour stock must consume CSP quota');return entered;
}

/** Shape-only rejection is scoped to the explicit failed ancestry, never unrelated sources. */
export function lowBandBranchKey(value){assert(Number.isSafeInteger(value.sourceLevelId??value.source));assert(typeof value.branchId==='string'&&value.branchId.length);return (value.sourceLevelId??value.source)+':'+value.branchId;}
export function lowBandShapeBan(recipe,parents,earlier){const key=lowBandBranchKey(recipe);const parent=parents.find(p=>lowBandBranchKey(p)===key);assert(parent);return new Set([parent.fingerprints.shapeSha256,...earlier.filter(p=>p.key===key&&p.fingerprints).map(p=>p.fingerprints.shapeSha256)]);}
export function assertLowBandInputDiversity(inputs){const designs=new Set();for(const x of inputs){assert(!designs.has(x.designSha256),'Repeated full physical design');designs.add(x.designSha256);}for(let i=0;i<inputs.length;i++)for(let j=0;j<i;j++)if(inputs[i].key===inputs[j].key){assert.notEqual(inputs[i].shapeSha256,inputs[j].shapeSha256,'Same branch shape must change');assert.notEqual(inputs[i].colorSha256,inputs[j].colorSha256,'Same branch colour must change');}return true;}

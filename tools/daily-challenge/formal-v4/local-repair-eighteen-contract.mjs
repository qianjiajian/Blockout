import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {bodyFootprint,absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {HISTORY_LEDGER_ROOTS,realPathWithSuffix,readBound,write,claimNativeBatchPlan,LATE_PREFIX_CONSTRUCTION_LEDGER} from './low-twenty-io.mjs';
export {descriptor,integer,recordLowBandColourAttempt,lowBandBranchKey,lowBandShapeBan,assertLowBandInputDiversity} from './low-twenty-contract.mjs';
import {descriptor,integer} from './low-twenty-contract.mjs';

export const LOW_BAND_BATCH_VERSION='finite-failed-family-local-eighteen-v1';
export const LOW_BAND_BATCH_REVIEW_STATUS='INDEPENDENT_LOCAL_REPAIR_EIGHTEEN_PLAN_PASS';
export const LOW_BAND_BATCH_STATIC_REVIEW_STATUS='INDEPENDENT_LOCAL_REPAIR_EIGHTEEN_STATIC_PASS';
export const LOCAL_REPAIR_QUALIFICATION_STATUS='INDEPENDENT_LOCAL_REPAIR_EIGHTEEN_PRIVATE_PASS';
export const LOCAL_REPAIR_EXPERIMENT_ID='low20-failed-family-local-eighteen-20261008-v1';
export const LOCAL_REPAIR_PROPOSAL={path:'deliverables/daily-formal-v4-20261008/design/failed-family-local-eighteen-proposal-01/proposal.json',sha256:'435e6e8819daf2cbb8f531236c9627ba7a5ba4bcb331418c5cc0f4e3d3ce502d'};
export const LOCAL_REPAIR_FILES=['local-repair-eighteen-contract.mjs','local-repair-region-factory.mjs','prepare-local-repair-eighteen.mjs','construct-local-repair-eighteen.mjs','run-local-repair-eighteen.mjs','exact-low20-failed-near-reader.mjs'].map(s=>'tools/daily-challenge/formal-v4/'+s);
const points=ps=>ps.map(p=>p.join(',')).sort();
const connected=ps=>{const all=new Set(points(ps)),seen=new Set(),q=[ps[0]];for(const p of q){const k=p.join(',');if(seen.has(k))continue;seen.add(k);for(const[d,e]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+d,p[1]+e];if(all.has(n.join(','))&&!seen.has(n.join(',')))q.push(n);}}return seen.size===all.size;};

/** Two baselines: a small failed-parent repair, and the immutable successful
 * reference against which the original large redesign is still measured. */
export function assertLocalRepairRecipe(b){
 descriptor(b.reference);descriptor(b.geometricRepairSeed);descriptor(b.originalReference);
 assert.equal(b.referenceLevelSha256,levelSha256(b.level));assert.equal(b.originalReferenceLevelSha256,levelSha256(b.originalReferenceLevel));
 assert.equal(b.sourceLevelId,b.level.id);assert.equal(b.sourceLevelId,b.originalReferenceLevel.id);
 assert([1,2].includes(b.targetDifficulty));assert.equal(b.maximumStocks,1);integer(b.maximumStaticPartitionAttempts,1,100);integer(b.seed,1,2**32-1);integer(b.bodyCountDelta,-2,3);
 assert.equal(b.branchId,'low20-source-'+b.sourceLevelId);assert.equal(b.repairFamilyId,b.branchId);
 const ids=new Set(b.changedBodies.map(x=>x.id));integer(ids.size,2,4);assert.equal(ids.size,b.changedBodies.length);
 assert.deepEqual(b.changedBodies,b.level.blocks.filter(x=>ids.has(x.id)));assert.deepEqual(b.fixedBlocks,b.level.blocks.filter(x=>!ids.has(x.id)));
 const cells=b.changedBodies.flatMap(absoluteCells);assert.equal(new Set(points(cells)).size,cells.length);assert(connected(cells));
 assert.deepEqual(points(cells),points(b.region.cells));assert.deepEqual([...ids].sort(),b.region.bodyIds.toSorted());assert.equal(b.region.area,cells.length);
 const large=new Set(points(b.originalLargeRegion.cells));assert(cells.every(p=>large.has(p.join(','))));assert(b.originalLargeRegion.fraction>=.35);
 assert.equal(b.prefixSha256,routeSha256(b.prefixDrags));assert.equal(b.prefixFacts.drags,b.prefixDrags.length);
 assert.equal(b.prefixFacts.parking,b.prefixDrags.filter(d=>!d.exitSide).length);assert.equal(b.prefixFacts.clears,b.prefixDrags.filter(d=>d.exitSide).length);
 assert(b.prefixFacts.parking<(b.targetDifficulty===1?20:30));assert(b.prefixDrags.every(d=>!ids.has(d.blockId)&&b.fixedBlocks.some(x=>x.id===d.blockId)));
 assert.deepEqual(b.allReferenceGates,b.level.gates);assert.deepEqual(b.level.gates,b.originalReferenceLevel.gates);
 return true;
}
export function auditLocalRepairDelta(level,b){
 const parent=new Set(b.level.blocks.map(bodyFootprint)),now=new Set(level.blocks.map(bodyFootprint)),original=new Set(b.originalReferenceLevel.blocks.map(bodyFootprint));
 const removed=b.level.blocks.filter(x=>!now.has(bodyFootprint(x))).flatMap(absoluteCells),added=level.blocks.filter(x=>!parent.has(bodyFootprint(x))).flatMap(absoluteCells);
 assert.deepEqual(points(removed),points(b.region.cells));assert.deepEqual(points(added),points(b.region.cells));
 const oldChanged=b.originalReferenceLevel.blocks.filter(x=>!now.has(bodyFootprint(x))).flatMap(absoluteCells),newChanged=level.blocks.filter(x=>!original.has(bodyFootprint(x))).flatMap(absoluteCells);
 assert.deepEqual(points(oldChanged),points(newChanged));assert(connected(oldChanged));const fraction=oldChanged.length/boardCells(level).length;
 assert(fraction>=.35,'Final real difference from original reference must remain >=35%');
 const similarity=compareLayouts(level,b.originalReferenceLevel).footprintSimilarity;assert(similarity<=.65+1e-12,'Final reference near gate unchanged');
 return{repairArea:removed.length,originalChangedArea:oldChanged.length,originalChangedFraction:fraction,originalFootprintSimilarity:similarity,localParentSimilarity:compareLayouts(level,b.level).footprintSimilarity};
}
export function assertLowBandBatchPlan(p){
 assert.equal(p.version,LOW_BAND_BATCH_VERSION);assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);assert.equal(p.qualificationOnly,false);
 assert.deepEqual(p.proposal,LOCAL_REPAIR_PROPOSAL);assert.equal(p.experimentId,LOCAL_REPAIR_EXPERIMENT_ID);assert.equal(p.campaign.experimentId,LOCAL_REPAIR_EXPERIMENT_ID);assert.equal(p.campaign.key,p.proposal.sha256);
 assert.equal(p.campaign.maximumInputs,18);assert.equal(p.campaign.previousActualInputs,0);assert.equal(p.maximumAfterThisBatch,18);assert.equal(p.closedCampaignsExtended,false);
 assert.equal(p.blueprints.length,18);assert.equal(new Set(p.blueprints.map(b=>b.recipeId)).size,18);assert.deepEqual([...new Set(p.blueprints.map(b=>b.sourceLevelId))].sort((a,b)=>a-b),[31,60,124,131,195,200]);
 for(const b of p.blueprints)assertLocalRepairRecipe(b);
 for(const id of new Set(p.blueprints.map(b=>b.branchId))){assert.equal(p.blueprints.filter(b=>b.branchId===id).length,3);assert.equal(p.failedParents.filter(b=>b.branchId===id).length,1);}
 assert.equal(p.maximumStocksEnteringColourCspIncludingFailed,18);assert.equal(p.maximumFinalColourInputsIncludingRejected,18);assert.equal(p.maximumStaticPartitionAttempts,1800);assert.equal(p.blueprints.reduce((n,b)=>n+b.maximumStaticPartitionAttempts,0),1800);
 assert.equal(p.selected.length,p.selectedCount);p.selected.forEach(descriptor);assert.equal(p.gatePolicy,'all-reference-gates-byte-equivalent-in-original-order');
 for(const k of ['selectedIndex','selectionReview','historyCheckpoint','lowBandQualification','constructorQualification','proposalReview'])descriptor(p[k]);
 assert.equal(p.nearExclusionPolicy,'exact-twelve-low20-failures-and-bound-construction-aliases-only');assert.equal(p.nearAllowance.rows.length,12);assert.equal(p.maximumFinalRepresentativesPerRepairFamily,1);assert.equal(p.successStopsUnclaimedSiblings,true);
 assert.equal(p.allHistoryExactExclusionsRetained,true);assert.equal(p.preconstructedSiblingsAreIndependentAcceptedLayouts,false);
 assert.deepEqual(p.futureStrategy,{tailStrategy:'plain-joint-low-band',originalLowerFloors:{1:16,2:21},originalUpperCeilings:{1:20,2:30},maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true});
 for(const[b,n]of[[p.futureUpperBudget,10000],[p.futureLowerBudget,9999]])assert.deepEqual(b,{maxStates:n,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
 assert.deepEqual(p.similarity,{reference:.65,selectedPreFilter:.65,priorMacro:.65,newBatch:.65,source:.55,old450:.75});assert(p.bindings&&p.ledgerSnapshot?.roots?.length===7);
 for(const k of ['formalReady','currentRuntimeValidationClaimed','slotAssigned'])assert.equal(p[k],false);return true;
}
export function assertLowBandBatchIndex(index,p){
 assertLowBandBatchPlan(p);assert.equal(index.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.experimentId,p.experimentId);assert.equal(index.scope,300);
 integer(index.fixedColourInputs,0,18);assert.equal(index.fixedColourInputs,index.stocksEnteringColourCspIncludingFailed);assert.equal(index.totalActualInputsIncludingThis,index.fixedColourInputs);
 assert.equal(index.campaignKey,p.proposal.sha256);assert.equal(index.closedCampaignsExtended,false);assert.equal(index.candidates.length,index.eligibleInputs);assert(index.eligibleInputs<=index.fixedColourInputs);
 const counts={},statics={};for(const a of index.attempts){const b=p.blueprints.find(x=>x.recipeId===a.recipeId);assert(b);assert.equal(a.localAttempt,statics[a.recipeId]??0);statics[a.recipeId]=(statics[a.recipeId]??0)+1;assert(statics[a.recipeId]<=100);assert.equal(typeof a.enteredColourCsp,'boolean');if(a.enteredColourCsp){counts[a.recipeId]=(counts[a.recipeId]??0)+1;assert.equal(counts[a.recipeId],1);}}
 assert.deepEqual(counts,Object.fromEntries(Object.entries(index.perRecipeColourCspInputs).filter(([,v])=>v)));assert.deepEqual(statics,index.perRecipeStaticAttempts);assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),index.fixedColourInputs);
 for(const d of index.candidates){descriptor(d);const b=p.blueprints.find(x=>x.recipeId===d.recipeId);assert(b);assert.equal(d.sourceLevelId,b.sourceLevelId);assert.equal(d.branchId,b.branchId);assert.equal(d.targetDifficulty,b.targetDifficulty);}
 for(const k of ['gameplaySearches','publicLedgerClaims','accepted'])assert.equal(index[k],0);assert.equal(index.formalReady,false);return true;
}
export function unclaimedFamilyDisposition(candidate,successes){
 const same=successes.find(s=>s.branchId===candidate.branchId);if(same)return{status:'SKIPPED_FAMILY_ALREADY_SUCCEEDED',successfulInput:same.input,publicClaimsStarted:0,newGameplaySearches:0,accepted:false,failure:false};
 const near=successes.find(s=>compareLayouts(candidate.level,s.level).footprintSimilarity>.65+1e-12);if(near)return{status:'SKIPPED_NEAR_NEW_FAMILY_SUCCESS',successfulInput:near.input,publicClaimsStarted:0,newGameplaySearches:0,accepted:false,failure:false};return null;
}
export function localRepairConstructionFiles(plan,proposalSha,dir=LATE_PREFIX_CONSTRUCTION_LEDGER){return[`${plan.sha256}.claim.json`,`${plan.sha256}.result.json`,`experiment-${levelSha256({experimentId:LOCAL_REPAIR_EXPERIMENT_ID})}.execution.json`].map(n=>path.join(dir,n));}
export async function claimLocalRepairCampaign(d,out,{qualificationOnly=false,ledgerDirectory=LATE_PREFIX_CONSTRUCTION_LEDGER}={}){
 assert.equal(typeof qualificationOnly,'boolean');const actual=await realPathWithSuffix(ledgerDirectory);if(qualificationOnly){for(const r of HISTORY_LEDGER_ROOTS){const p=await realPathWithSuffix(r);assert(actual!==p&&!actual.startsWith(p+path.sep),'Private repair ledger aliases shared history');}}else assert.equal(actual,await realPathWithSuffix(LATE_PREFIX_CONSTRUCTION_LEDGER));
 const p=await readBound(d);assert.equal(p.experimentId,LOCAL_REPAIR_EXPERIMENT_ID);assert.deepEqual(p.proposal,LOCAL_REPAIR_PROPOSAL);await readBound(p.proposal);await fs.mkdir(ledgerDirectory,{recursive:true});
 const campaignFile=localRepairConstructionFiles(d,p.proposal.sha256,ledgerDirectory)[2];await write(campaignFile,{plan:d,proposal:p.proposal,experimentId:p.experimentId,outputDirectory:path.resolve(out),qualificationOnly,restartAllowed:false});
 return{...await claimNativeBatchPlan(d,out,{qualificationOnly,ledgerDirectory}),campaignFile};
}

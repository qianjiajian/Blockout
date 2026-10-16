import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding,mapHistoricalBindingsTask} from './prefix-execution-environment-task.mjs';
import {LOW_TWENTY_153_INPUTS,readLowTwenty153Admission} from './prepare-low-twenty-153.mjs';
import {assertOriginalFinalMath,VERSION as STAR_BATCH_VERSION} from './star-donor-batch-task.mjs';
import {assertAxisFinalMath,assertAxisIcedDelta,VERSION as AXIS_VERSION,INPUTS as AXIS_INPUTS,SLOT as AXIS_SLOT,CONFIGURATION as AXIS_CONFIGURATION} from './axis-iced-task.mjs';
import {makeExplicitLowBandBatchRecipe} from './prepare-low-band-batch.mjs';
import {assertLowBandBatchRecipe} from './low-band-batch-contract.mjs';
import {constructLowTwentyRegionStock} from './low-twenty-region-factory.mjs';
import {makeLowBandPrefixTailPlan,exploreLowBandPrefixTail,LOW_BAND_PREFIX_TAIL_VERSION} from './prefix-tail-low-band-task.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {assertLowBandRecordedUpperAccounting} from './audit-low-twenty-actual-task.mjs';
import {readSeparated161SelectionEvidence} from './selection-ui-evidence-separation.mjs';
import {descriptor,integer} from './native-batch-contract.mjs';
import {formedStockImages} from './prepare-early-prefix-four.mjs';
import {assertLowTwentyFailedParent,assertNoFailedDescendant} from './prepare-low-twenty-task.mjs';
import {constructEarlyPrefixStock} from './early-six-task-factory.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {makeEarlyFrozenPrefixTailPlan,exploreEarlyFrozenPrefixTail,auditThawedPrefixBridge,EARLY_PREFIX_TAIL_BINDING} from './early-frozen-prefix-tail-task.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertLongPrefixStockHistory,auditLongPrefixExecutionObservation} from './audit-long-prefix-task.mjs';
import {assertEarlyPrefixReceiptAccounting} from './audit-early-six-actual-task.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {bodyFootprint,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {readBound,readFile,write,sha,exists,mergeBindings,realPathWithSuffix,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,
 HISTORY_LEDGER_ROOTS,captureLedgerSnapshot,checkLedgerSnapshot,claimNativeBatchPlan,claimNativeBatchMath,finishLatePrefixPlan,walkJson} from './low-twenty-io.mjs';

export const MIXED_SHORT_PREFIX_BATCH_VERSION='finite-mixed-short-prefix-reference-band2-task-v1';
export const SELF='tools/daily-challenge/formal-v4/mixed-short-prefix-batch-task.mjs';
export const MATH_ENTRY='tools/daily-challenge/formal-v4/early-frozen-prefix-tail-task.mjs';
export const LOW_MATH_ENTRY='tools/daily-challenge/formal-v4/prefix-tail-low-band-task.mjs';
export const UPPER_BUDGET=Object.freeze({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
export const LOWER_BUDGET=Object.freeze({...UPPER_BUDGET,maxStates:9999});
export const STATIC_SLOT=Object.freeze({formalId:'daily-basic-combined-d3-01',stageKey:'basic-combined',difficulty:3,slot:1,newestMechanism:null});
export const TARGETS=Object.freeze({2:{floor:21,upper:30,iceCount:0,entry:LOW_MATH_ENTRY},3:{floor:31,upper:null,iceCount:2,entry:MATH_ENTRY}});
const staticSlot=band=>({...STATIC_SLOT,formalId:`daily-basic-combined-d${band}-01`,difficulty:band});
export function assertTargetOrder(recipes){
 assert(recipes.length>0&&recipes.length%2===0);const seen=new Set();
 for(let i=0;i<recipes.length;i+=2){const a=recipes[i],b=recipes[i+1];assert(!seen.has(a.sourceLevelId));seen.add(a.sourceLevelId);
  assert.equal(a.sourceLevelId,b.sourceLevelId);assert.equal(a.branchId,b.branchId);assert.deepEqual([a.finalTargetDifficulty,b.finalTargetDifficulty],[3,2]);
  assert.equal(a.referenceBand,2);assert.equal(b.referenceBand,2);assert.equal(a.iceCount,2);assert.equal(b.iceCount,0);
  assert.notEqual(a.seed,b.seed);assert.notEqual(a.colourSeed,b.colourSeed);assert.notEqual(a.bodyCountDelta,b.bodyCountDelta);}
 return true;
}
export function constructTargetStock(runtime,b,options){assert([2,3].includes(b.finalTargetDifficulty));assert.equal(b.iceCount,TARGETS[b.finalTargetDifficulty].iceCount);return b.finalTargetDifficulty===3?constructEarlyPrefixStock(runtime,b,options):constructLowTwentyRegionStock(runtime,b,options);}
export function makeTargetPlan(runtime,q,p,{qualificationOnly=false}={}){
 assert([2,3].includes(q.finalTargetDifficulty));assert.equal(q.targetDifficulty,q.finalTargetDifficulty);
 assert.equal(typeof qualificationOnly,'boolean');const options={upperBudget:p.futureUpperBudget,lowerBudget:p.futureLowerBudget,qualificationOnly};
 return q.finalTargetDifficulty===3?makeEarlyFrozenPrefixTailPlan(runtime,q,options):makeLowBandPrefixTailPlan(runtime,q,{...options,targetDifficulty:2});
}
const exploreTarget=(rt,q,options)=>q.finalTargetDifficulty===3?exploreEarlyFrozenPrefixTail(rt,q,options):exploreLowBandPrefixTail(rt,q,options);
export function assertTargetInput(q,b){
 assert.equal(q.finalTargetDifficulty,b.finalTargetDifficulty);assert.equal(q.targetDifficulty,b.finalTargetDifficulty);assert.equal(q.referenceBand,2);
 if(b.finalTargetDifficulty===3){assert.equal(q.iceDeclaration.count,2);assert.deepEqual(q.iceDeclaration.regionBlockIds,q.level.blocks.filter(x=>!b.fixedBlocks.some(f=>f.id===x.id)).map(x=>x.id));}
 else{assert.equal(b.finalTargetDifficulty,2);assert.equal(q.iceDeclaration,undefined);assert(q.level.blocks.every(x=>x.frozen===undefined));}
 return true;
}
export function assertTargetConstructionAccounting(built,band){
 const c=built.constructionAccounting;assert([2,3].includes(band));
 for(const k of ['completeWorldReservations','transitions','microStates','elapsedMilliseconds'])integer(c[k],0,Number.MAX_SAFE_INTEGER);
 assert(c.completeWorldReservations<=9998);assert(c.transitions<=UPPER_BUDGET.maxTransitions&&c.microStates<=UPPER_BUDGET.maxMicroStates);
 if(band===3||c.placeholderWorldReservations!==undefined){
  for(const k of ['placeholderWorldReservations','completedColourWorldReservations','icedWorldReservations'])integer(c[k],0,Number.MAX_SAFE_INTEGER);
  assert.equal(c.completeWorldReservations,c.placeholderWorldReservations+c.completedColourWorldReservations+c.icedWorldReservations);
  if(band===2)assert.equal(c.icedWorldReservations,0);
 }else assert.equal(c.version,'late-region-static-construction-v1');
 if(built.paint){
  assert.equal(c.completeWorldReservations,1+built.paint.accounting.completeWorldReservations+(band===3?c.icedWorldReservations:0));
  assert.equal(c.transitions,(built.partition.transitions??0)+built.paint.accounting.transitions);assert.equal(c.microStates,built.paint.accounting.microStates);
 }
 return true;
}
export function assertTargetReceiptAccounting(q,input){
 assert.equal(q.finalTargetDifficulty,input.finalTargetDifficulty);const band=TARGETS[input.finalTargetDifficulty];assert(band);
 assert.equal(q.plan.floor,band.floor);assert.equal(q.levelSha256,levelSha256(input.level));assert.deepEqual(q.level,input.level);
 assert.deepEqual(q.plan.fullUpperBudget,UPPER_BUDGET);assert.deepEqual(q.plan.lowerBudget,LOWER_BUDGET);
 if(input.finalTargetDifficulty===3)return assertEarlyPrefixReceiptAccounting(q,input);
 assert.equal(q.version,LOW_BAND_PREFIX_TAIL_VERSION);assert.equal(q.targetDifficulty,2);assert.deepEqual(q.plan.band,{floor:21,upper:30});
 assert.deepEqual(q.plan.constructionAccounting,input.constructionAccounting);assert.equal(q.plan.bandChangeAfterClaimAllowed,false);assert.equal(q.plan.failedInputContinuationAllowed,false);
 if(q.upperConstruction){assert(q.upperAccounting);assertLowBandRecordedUpperAccounting(q,input.prefixDrags);}
 if(q.route){assert(q.upperConstruction?.valid);assert.equal(q.route.search,null);assert.deepEqual(q.drags,q.upperConstruction.drags);assert.equal(q.routeSha256,routeSha256(q.drags));assert.equal(q.U,q.upperConstruction.U);}
 if(q.proof){const p=q.proof;assert.deepEqual(q.lowerBound.result,p);assert.equal(q.lowerBound.method,'v3-plain');assert.equal(q.lowerBound.requiredFloor,21);
  assert.equal(q.lowerBound.inputLevelSha256,q.levelSha256);assert.equal(p.sourceLevelSha256,q.levelSha256);assert.equal(p.floor,21);assert.deepEqual(p.budget,LOWER_BUDGET);assert.deepEqual(p.guardAllowance,guardAllowanceFor(p));
  integer(p.rawFullBoardStates,0,9999);assert.equal(p.rawFullBoardStates,p.discoveredStates);assert.equal(p.rawFullBoardStates,p.visitedStates);assert.equal(p.rawExploredStates,p.exploredStates);
  integer(p.rawExploredStates,0,p.rawFullBoardStates);integer(p.attemptedTransitions,0,LOWER_BUDGET.maxTransitions);integer(p.microDiscoveredStates,0,LOWER_BUDGET.maxMicroStates);integer(p.microExploredStates,0,p.microDiscoveredStates);
  assert(p.guardAllowance.conservativeFullBoardStateUpperBound<=10000);assert(q.U>=21&&q.U<=30);}
 if(q.accepted){assert(q.route&&q.proof&&q.mathematicalEvidenceValidated);assert.equal(q.L,21);assert.equal(q.difficulty,2);assert.equal(q.status,'EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU');
  assert.equal(q.proof.status,'threshold-proven');assert.equal(q.proof.termination,'below-threshold-exhausted');assert.equal(q.proof.thresholdProven,true);assert.equal(q.proof.certifiedFloor,21);}
 else assert.equal(q.L,null);
 return true;
}
const partition=l=>levelSha256(l.blocks.map(bodyFootprint).sort());
const physical=f=>levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
const branch=b=>`${b.sourceLevelId??b.source}:${b.branchId}`;
const nearest=(level,rows)=>rows.reduce((n,q)=>Math.max(n,compareLayouts(level,q.level).footprintSimilarity),0);
const fileDescriptor=async p=>({path:p,sha256:sha(await fs.readFile(p))});
async function checkAll(bindings){for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);}
function unique(xs){return new Set(xs).size===xs.length;}

export function assertSameUniqueCells(a,b){
 const normalize=xs=>{assert(Array.isArray(xs));assert(xs.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)));
  const keys=xs.map(p=>p.join(','));assert(unique(keys),'Duplicate region cell');return keys.sort();};
 assert.deepEqual(normalize(a),normalize(b),'Region cells differ');return true;
}
export function assertRecipeIceCapacity(ref,r){
 assert([2,3].includes(r.finalTargetDifficulty));assert.equal(r.referenceBand,2);assert.equal(r.iceCount,TARGETS[r.finalTargetDifficulty].iceCount);
 assert(ref.prefix.drags.filter(d=>d.exitSide).length>=r.iceCount,'Prefix cannot thaw declared ice');
 assert(ref.originalLevel.blocks.every(b=>b.frozen===undefined));assert(ref.fixedGates.every(g=>g.frozen===undefined));
 const bodies=ref.changedBodies.length+r.bodyCountDelta;
 assert(bodies>0&&bodies<=ref.region.cells.length&&bodies*6>=ref.region.cells.length,'No original-orientation stock can cover this region with the declared body count');
 assertSameUniqueCells(ref.region.cells,ref.changedBodies.flatMap(absoluteCells));return true;
}
export function assertSelectedAppendEnvelope(index,review,context,anchorFiles){
 assert.deepEqual(review.selection,context.selection);assert.deepEqual(review.errors,[]);assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);
 assert(/^INDEPENDENT_.*_PASS$/.test(review.status));assert.equal(review.candidates,index.files.length);
 integer(index.files.length,anchorFiles.length,300);assert.equal(index.files.length,context.selectedCount);
 assert.deepEqual(index.files.slice(0,anchorFiles.length),anchorFiles);assert(unique(index.files));return true;
}
export const AXIS_ADMISSION=Object.freeze({
 receipt:{path:'deliverables/daily-formal-v4-20261008/selection/axis-iced-source18-01/candidate.json',sha256:'bbe686b985107c38806ccc899eb750f0da0116962836bb633a17af16d2bca2d9'},
 actual:{path:'deliverables/daily-formal-v4-20261008/proof/axis-iced-source18-actual-independent-01/report.json',sha256:'b7f2560c1e7baacf503494269154ff33042b9dac07dc31a33fb0c79e1fdc03c6'},
});
const selectedSha=(q,p)=>q.inputBindings?.[p]??q.inputBindings?.[path.resolve(p)];
/** This branch only consumes the exact160 plus the one independently reviewed
 * axis receipt. A raw mathematical pool receipt alone is not a selection. */
export function assertAxisSelectedEnvelope(index,review,context,original){
 assertSelectedAppendEnvelope(index,review,context,original.files);assert.equal(original.files.length,160);
 assert.equal(index.files.length,161);assert.equal(review.status,'INDEPENDENT_161_MERGE_QUICK_CHECK_PASS');
 assert.equal(index.files[160],AXIS_ADMISSION.receipt.path);assert.equal(selectedSha(review,AXIS_ADMISSION.receipt.path),AXIS_ADMISSION.receipt.sha256);
 assert.equal(selectedSha(review,AXIS_ADMISSION.actual.path),AXIS_ADMISSION.actual.sha256);
 for(const file of original.files){assert.equal(selectedSha(review,file),original.fileBindings[file]);assert.equal(index.fileBindings[file],original.fileBindings[file]);}
 assert.equal(index.fileBindings[AXIS_ADMISSION.receipt.path],AXIS_ADMISSION.receipt.sha256);return true;
}
export function assertReviewedAxisAppend(q,base,actual){
 assert.equal(q.version,AXIS_VERSION);assert.equal(q.accepted,true);assert.equal(q.qualificationOnly,false);assert.equal(q.terminalBlocked,false);
 for(const k of ['finalProofStarted','mathematicalEvidenceValidated','designValidated','mechanismStrengthValidated'])assert.equal(q[k],true);
 assert(q.mathematicalProof?.accepted&&q.attempt,'Accepted axis requires its full original mathematical receipt');
 assert.deepEqual(Object.fromEntries(Object.keys(AXIS_SLOT).map(k=>[k,q[k]])),AXIS_SLOT);assert.equal(q.sourceLevelId,18);
 assert.deepEqual(q.baseReceipt,AXIS_INPUTS.base);assert.deepEqual(q.baseActualAudit,AXIS_INPUTS.actual);assert.deepEqual(q.inputSelection,AXIS_INPUTS.selection);
 assert.deepEqual(q.configuration,AXIS_CONFIGURATION);assert.equal(q.baseLevelSha256,levelSha256(base.level));assert.equal(q.baseRouteSha256,routeSha256(base.drags));
 assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
 assertAxisIcedDelta(base.level,q.level,q.drags,base.drags);assertAxisFinalMath(q.mathematicalProof,q.level,q.drags);
 for(const k of ['attempt','lowerBound','route','L','U','attemptPlan','attemptPlanSha256'])assert.deepEqual(q[k],q.mathematicalProof[k]);
 assert.equal(actual.status,'INDEPENDENT_AXIS_ICED_TASK_ACTUAL_PASS');assert.deepEqual(actual.receipt,AXIS_ADMISSION.receipt);assert.deepEqual(actual.errors,[]);
 for(const k of ['newSearches','newLedgerClaims','newConstructions'])assert.equal(actual[k],0);
 assert.equal(actual.accepted,true);assert.equal(actual.L,q.L);assert.equal(actual.U,q.U);
 for(const k of ['enforced','fullMathematicalProofAndAttemptRequired','finalLevelAndRouteHashesExact','finalProofAndValidationFlagsChecked','originalLowerRetainsEnhancedIce','optionalMathAuditBranchNotSoleBasis'])assert.equal(actual.mandatoryAcceptedReceiptChecks[k],true);
 return true;
}
async function readReviewedAxisAppend(q,c){
 const base=await c.bound(AXIS_INPUTS.base),actual=await c.bound(AXIS_ADMISSION.actual);assertReviewedAxisAppend(q,base,actual);
 const m=q.mathematicalProof,mp=await c.read(`${PUBLIC_LEDGER}/${q.attempt.id}.v4-plan.json`);
 assert.deepEqual(mp.attempt,q.attempt);assert.deepEqual(mp.plan,m.attemptPlan);assert.deepEqual(mp.policyBindings,m.policyBindings);
 const a=m.acceptedBaseAdaptation;assert.deepEqual(a.baseReceipt,AXIS_INPUTS.base);assert.equal(a.baseAttemptId,base.attempt.id);
 assert.equal(a.baseLevelSha256,base.levelSha256);assert.equal(a.finalLevelSha256,q.levelSha256);assert.equal(q.attempt.revalidates,base.attempt.id);
 assert.deepEqual(await c.read(`${PUBLIC_LEDGER}/v4-mechanism-inputs/${a.finalMechanismInputIdentity}.json`),a);
}
/** Historical153 and genuine stars are unchanged; the sole new schema branch
 * consumes a completed axis admission without claiming or replaying it. */
async function readEarlyPrefixSelection(context,c){
 const anchor=await readLowTwenty153Admission(LOW_TWENTY_153_INPUTS.selection,LOW_TWENTY_153_INPUTS.review);c.historical(anchor.bindings);
 const index=await c.bound(context.selection),review=await c.bound(context.selectionReview);assertSelectedAppendEnvelope(index,review,context,anchor.index.files);
 assertAxisSelectedEnvelope(index,review,context,await c.bound(AXIS_INPUTS.selection));
 const separated=await readSeparated161SelectionEvidence(context.selectionReview,{bindings:c.bindings});c.historical(separated.historicalBindings);const records=[];
 for(const [i,file]of index.files.entries()){
  const h=review.inputBindings[file]??review.inputBindings[path.resolve(file)];assert(h,'Selected receipt must be byte-bound by the supplied independent review');
  const q=await c.bound({path:file,sha256:h});assert(q.accepted&&!q.qualificationOnly);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
  if(i>=anchor.index.files.length){
   if(i===160)await readReviewedAxisAppend(q,c);
   else{assert(['exact-regional-reserve195-star-task-once-v1',STAR_BATCH_VERSION].includes(q.version),'Only genuine reviewed star appends are supported');
    assertOriginalFinalMath(q.mathematicalProof,q.level,q.drags,q.U,q.difficulty);assert(q.mathematicalProof.accepted);}
   const request=await c.read(`${PUBLIC_LEDGER}/${q.attempt.id}.request.json`),result=await c.read(`${PUBLIC_LEDGER}/${q.attempt.id}.result.json`);
   assert.deepEqual(request,q.attempt);assert.equal(result.accepted,true);assert.equal(result.status,q.mathematicalProof.status);assert.equal(result.levelSha256,q.levelSha256);
   assert.deepEqual(result.lower,q.lowerBound.result);assert.deepEqual(result.upper,q.route.search);assert.deepEqual(await c.read(q.entryResultFile),q);
   assert.deepEqual(await c.bound(q.constructionSidecar),q.construction);await c.bound(q.constructionPlan);
   assert(q.construction.ok&&q.construction.accepted&&!q.construction.mathematicalAcceptance);assert(q.construction.constructionAccounting.conservativeFullBoardStateUpperBound<=10000);
  }
  records.push(q);
 }
 return{index,records,uiEvidenceSeparation:separated};
}

export function changedShapeAndColour(a,b){
 const shared=b.colorAssignments.filter(x=>a.colorAssignments.some(y=>y.id===x.id));
 const changed=shared.length?shared.some(x=>a.colorAssignments.some(y=>y.id===x.id&&JSON.stringify(x.colors)!==JSON.stringify(y.colors))):
  levelSha256(a.colorAssignments.map(x=>x.colors).sort())!==levelSha256(b.colorAssignments.map(x=>x.colors).sort());
 return a.shapeSha256!==b.shapeSha256&&a.colorSha256!==b.colorSha256&&changed;
}
export function mixedShortPrefixBatchDisposition(candidate,successes){
 const same=successes.find(q=>branch(q)===branch(candidate));
 const near=same??successes.find(q=>compareLayouts(q.level,candidate.level).footprintSimilarity>.65+1e-12);
 return near?{status:same?'SKIPPED_FAMILY_ALREADY_SUCCEEDED':'SKIPPED_NEAR_NEW_FAMILY_SUCCESS',successfulInput:near.input,
  accepted:false,failure:false,publicClaimsStarted:0,newGameplaySearches:0}:null;
}
export function assertMixedShortPrefixBatchProposal(p){
 assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);assert.equal(p.status,'READONLY_MIXED_SHORT_PREFIX_BATCH_PROPOSAL_NOT_EXECUTABLE');assert.equal(p.executable,false);
 descriptor(p.failureLineageReport);
 for(const k of ['newConstructions','newGameplaySearches','newColourCspInputs','publicClaimsStarted'])assert.equal(p[k],0);
 integer(p.recipes.length,2,64);assertTargetOrder(p.recipes);assert.equal(p.recipeCount,p.recipes.length);assert(unique(p.recipes.map(r=>r.recipeId)));
 assert.equal(p.referenceCount,p.references.length);assert(unique(p.references.map(r=>r.referenceId)));
 let cap=0;for(const r of p.recipes){const ref=p.references.find(x=>x.referenceId===r.referenceId);assert(ref);descriptor(ref.reference);
  assert.equal(ref.sourceLevelId,r.sourceLevelId);integer(r.seed,1,2**32-1);integer(r.colourSeed,1,2**32-1);integer(r.bodyCountDelta,-2,3);
  integer(r.maximumStaticPartitionAttempts,1,200);cap+=r.maximumStaticPartitionAttempts;assert.equal(r.maximumColourCspInputsIncludingFailure,1);
  for(const k of ['quotaConsumedIfColourFails','firstSameBranchMathematicalPassStopsUnclaimedSibling'])assert.equal(r[k],true);
  assert.equal(r.failedInputFallbackAllowed,false);assert.equal(typeof r.branchId,'string');assert(r.branchId.length);
  assert.equal(r.prefixCut,ref.prefix.cut);assert.equal(r.prefixSha256,ref.prefix.prefixSha256);assert.equal(r.regionSha256,levelSha256(ref.region.cells));
  assert.equal(ref.preserveAllReferenceGatesInOriginalOrder,true);assert.equal(ref.prefix.isLowerBound,false);
  assertRecipeIceCapacity(ref,r);
 }
 for(const s of new Set(p.recipes.map(r=>r.sourceLevelId)))assert.equal(new Set(p.recipes.filter(r=>r.sourceLevelId===s).map(r=>r.branchId)).size,1);
 const c=p.finiteExperiment;assert.equal(c.maximumColourCspInputsIncludingFailed,p.recipes.length);assert.equal(c.maximumStaticPartitionAttempts,cap);integer(cap,1,2000);
 assert.equal(c.maximumFinalRepresentativesPerFamily,1);assert.equal(c.independentExperiment,true);assert.equal(c.extendsClosedCampaigns,false);
 assert.deepEqual(p.futureMathematics.targets,TARGETS);assert.equal(p.futureMathematics.upperWorldsIncludingConstructionPrefixTailAndTerminalMaximum,10000);
 assert.equal(p.futureMathematics.originalLowerWorldsIncludingTerminalMaximum,10000);assert.equal(p.futureMathematics.failedInputRebandAllowed,false);return true;
}
export function assertMixedShortPrefixBatchPlan(p){
 assert.equal(p.version,MIXED_SHORT_PREFIX_BATCH_VERSION);assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);assert.equal(p.qualificationOnly,false);
 assert(/^[a-z0-9-]+$/.test(p.experimentId));assert.equal(p.closedCampaignsExtended,false);assert.equal(p.previousExperimentInputs,0);
 assert(Array.isArray(p.closedExperimentIds));assert(!p.closedExperimentIds.includes(p.experimentId),'A closed experiment must not receive a new namespace');
 for(const k of ['proposal','proposalReview','qualification','mathQualification','selectedIndex','selectionReview','historyPlan','failureLineageReport'])descriptor(p[k]);
 integer(p.blueprints.length,2,64);assertTargetOrder(p.blueprints);assert(unique(p.blueprints.map(b=>b.recipeId)));assert.equal(p.maximumInputs,p.blueprints.length);
 assert.equal(p.maximumStaticPartitionAttempts,p.blueprints.reduce((n,b)=>n+b.maximumStaticPartitionAttempts,0));integer(p.maximumStaticPartitionAttempts,1,2000);
 for(const b of p.blueprints){assertLowBandBatchRecipe(b);assert.equal(b.targetDifficulty,2);assert.equal(b.maximumStocks,1);integer(b.maximumStaticPartitionAttempts,1,200);
  integer(b.seed,1,2**32-1);integer(b.colourSeed,1,2**32-1);integer(b.bodyCountDelta,-2,3);assert.deepEqual(b.allReferenceGates,b.level.gates);
  assertRecipeIceCapacity({originalLevel:b.level,fixedGates:b.level.gates,changedBodies:b.changedBodies,region:b.region,prefix:{drags:b.prefixDrags}},b);
  assert.equal(p.failedParents.filter(x=>branch(x)===branch(b)).length,1);}
 for(const s of new Set(p.blueprints.map(b=>b.sourceLevelId)))assert.equal(new Set(p.blueprints.filter(b=>b.sourceLevelId===s).map(b=>b.branchId)).size,1);
 assert.equal(p.selected.length,p.selectedCount);p.selected.forEach(descriptor);assert(unique(p.selected.map(x=>x.path)));
 assert.deepEqual(p.futureUpperBudget,UPPER_BUDGET);assert.deepEqual(p.futureLowerBudget,LOWER_BUDGET);assert.deepEqual(p.staticSlots,{2:staticSlot(2),3:staticSlot(3)});
 assert.deepEqual(p.strategy,{targets:TARGETS,maximumTailCalls:1,maximumOriginalLowerCalls:1,fallback:false,failedInputRebandAllowed:false});
 assert.equal(p.gatePolicy,'all-reference-gates-byte-equivalent-in-original-order');assert.equal(p.successStopsUnclaimedSiblings,true);
 assert.equal(p.globalShapeInventoryUniquenessRequired,false);assert.equal(p.exactHistoryExclusionsRetained,true);assert.equal(p.nearExemptionsAllowed,false);
 assert.equal(p.ledgerSnapshot.roots.length,7);assert(p.bindings[SELF]&&p.bindings[MATH_ENTRY]&&p.bindings[LOW_MATH_ENTRY]);
 for(const k of ['accepted','catalogEligible','formalReady','slotAssigned'])assert.equal(p[k],false);return true;
}
export function assertMixedShortPrefixBatchIndex(index,p){
 assertMixedShortPrefixBatchPlan(p);assert.equal(index.status,'MIXED_SHORT_PREFIX_BATCH_STATIC_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.experimentId,p.experimentId);
 const counts={},statics={};for(const a of index.attempts){const b=p.blueprints.find(x=>x.recipeId===a.recipeId);assert(b);
  assert.equal(a.finalTargetDifficulty,b.finalTargetDifficulty);assert.equal(a.localAttempt,statics[a.recipeId]??0);statics[a.recipeId]=(statics[a.recipeId]??0)+1;assert(statics[a.recipeId]<=b.maximumStaticPartitionAttempts);
  assert.equal(typeof a.enteredColourCsp,'boolean');if(a.enteredColourCsp){counts[a.recipeId]=(counts[a.recipeId]??0)+1;assert.equal(counts[a.recipeId],1);}}
 assert.deepEqual(counts,index.perRecipeColourCspInputs);assert.deepEqual(statics,index.perRecipeStaticAttempts);
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),index.fixedColourInputs);assert(index.fixedColourInputs<=p.maximumInputs);
 assert.equal(index.candidates.length,index.eligibleInputs);assert(index.eligibleInputs<=index.fixedColourInputs);
 for(const d of index.candidates){descriptor(d);const b=p.blueprints.find(x=>x.recipeId===d.recipeId);assert(b);assert.equal(d.sourceLevelId,b.sourceLevelId);assert.equal(d.branchId,b.branchId);assert.equal(d.finalTargetDifficulty,b.finalTargetDifficulty);}
 for(const k of ['gameplaySearches','publicLedgerClaims','accepted'])assert.equal(index[k],0);assert.equal(index.formalReady,false);return true;
}

export function mixedShortPrefixBatchConstructionFiles(d,p,dir=LATE_PREFIX_CONSTRUCTION_LEDGER){return[
 `${d.sha256}.claim.json`,`${d.sha256}.result.json`,`early-prefix-batch-experiment-${levelSha256(p.experimentId)}.json`,`early-prefix-batch-proposal-${p.proposal.sha256}.json`].map(n=>path.join(dir,n));}
export async function claimMixedShortPrefixBatchCampaign(d,out,{qualificationOnly=false,ledgerDirectory=LATE_PREFIX_CONSTRUCTION_LEDGER}={}){
 assert.equal(typeof qualificationOnly,'boolean');const target=await realPathWithSuffix(ledgerDirectory);
 if(qualificationOnly){for(const r of HISTORY_LEDGER_ROOTS){const real=await realPathWithSuffix(r);assert(target!==real&&!target.startsWith(real+path.sep),'Private early-prefix batch ledger aliases shared history');}}
 else assert.equal(target,await realPathWithSuffix(LATE_PREFIX_CONSTRUCTION_LEDGER));
 const p=await readBound(d);assertMixedShortPrefixBatchPlan(p);await readBound(p.proposal);await fs.mkdir(ledgerDirectory,{recursive:true});
 const files=mixedShortPrefixBatchConstructionFiles(d,p,ledgerDirectory),entry={plan:d,proposal:p.proposal,experimentId:p.experimentId,outputDirectory:path.resolve(out),qualificationOnly,restartAllowed:false};
 await write(files[2],entry);await write(files[3],entry);return{...await claimNativeBatchPlan(d,out,{qualificationOnly,ledgerDirectory}),campaignFiles:files.slice(2)};
}
async function checkQualification(d,kind,bindings){
 const q=await readBound(d,bindings);assert.equal(q.status,kind);assert.deepEqual(q.errors,[]);
 for(const k of ['newRealCandidateSearches','newRealCandidateConstructions'])assert.equal(q[k],0);assert.equal(q.publicLedgerClaims??q.newPublicClaims,0);
 assert.equal(q.searchAlgorithmChanged,false);assert.equal(q.failedOriginalRetryAllowed,false);assert(q.toolBindings?.[MATH_ENTRY]);
 if(kind==='INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_TASK_PASS')assert(q.toolBindings[SELF]&&q.toolBindings[LOW_MATH_ENTRY]);
 await checkAll(q.toolBindings);mergeBindings(bindings,q.toolBindings);return q;
}
async function readContext(context){
 const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime),bindings={},cache=new Map(),historicalBindingResolutions=[];
 const read=async p=>{const key=path.resolve(p).toLowerCase();if(cache.has(key)){const q=cache.get(key);mergeBindings(bindings,{[p]:q.sha256});return q.value;}
  const bytes=await fs.readFile(p),q={sha256:sha(bytes),value:JSON.parse(bytes)};cache.set(key,q);mergeBindings(bindings,{[p]:q.sha256});return q.value;};
 const bound=async d=>{descriptor(d);const q=await read(d.path);assert.equal(bindings[d.path],d.sha256,d.path);return q;};
 const historical=map=>{const pending={};for(const[p,h]of Object.entries(map)){if(bindings[p])assert.equal(bindings[p],h);else pending[p]=h;}
  if(!Object.keys(pending).length)return;const m=mapHistoricalBindingsTask(pending,environment);mergeBindings(bindings,m.bindings);historicalBindingResolutions.push(...m.resolutions);};
 mergeBindings(bindings,runtime.toolchainBindings,environment.bindings);return{runtime,environment,bindings,read,bound,historical,historicalBindingResolutions};
}
export function assertExternalHistoricalStock(node,q,request,result,sourceLevelId){
 assert.equal(q.sourceLevelId,sourceLevelId);assert.equal(q.level.id,sourceLevelId);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.levelSha256,node.levelSha256);
 assert.deepEqual(q.proof.attempt,request);assert.deepEqual(q.proof,result);assert.equal(request.id,node.id);assert.equal(request.levelSha256,q.levelSha256);
 assert.equal(q.accepted,node.accepted);assert.equal(result.accepted,node.accepted);assert.equal(result.status,node.status);
 const f=designFingerprints(q.level);for(const k of ['shapeSha256','colorSha256']){assert.equal(request[k],f[k]);assert.equal(node[k],f[k]);}
 return true;
}
async function readExternalHistory(reader,descriptor){
 const report=await reader.bound(descriptor);assert.equal(report.status,'READONLY_FIVE_SOURCE_FAILURE_LINEAGE_PASS');assert.deepEqual(report.errors,[]);
 for(const k of ['newSearches','newConstructions','newLedgerClaims','newReplayCalls'])assert.equal(report[k],0);const stocks=[];
 for(const row of report.rows){const chain=row.externalHistoricalReferenceChain;if(!chain)continue;assert.equal(chain.pending,0);assert.equal(chain.nodeCount,chain.nodes.length);
  for(const node of chain.nodes){const q=await reader.bound(node.packet),request=await reader.bound(node.request),result=await reader.bound(node.result);assertExternalHistoricalStock(node,q,request,result,row.sourceLevelId);
   stocks.push({...node.packet,sourceLevelId:row.sourceLevelId,level:q.level,reference:null,fingerprints:designFingerprints(q.level),historicalNamespace:chain.ledgerRoot,accepted:node.accepted});}}
 return{report,stocks};
}
/** Read-only preparation. Explicit reviewed proposal and current terminal history,
 * not a source/cut hardcoded loop, define the sole future finite experiment. */
export async function prepareMixedShortPrefixBatch(context){
 assert(/^[a-z0-9-]+$/.test(context.experimentId));const c=await readContext(context),{runtime,environment,bindings,read,bound,historical}=c;
 const proposal=await bound(context.proposal);assertMixedShortPrefixBatchProposal(proposal);assert.equal(context.experimentId,proposal.finiteExperiment.experimentId);const reviewed=await bound(context.proposalReview);
 const externalHistory=await readExternalHistory(c,proposal.failureLineageReport);
 assert.equal(reviewed.status,'INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_PROPOSAL_PASS');assert.deepEqual(reviewed.proposal,context.proposal);assert.deepEqual(reviewed.errors,[]);
 assert.equal(reviewed.newSearches,0);assert.equal(reviewed.newConstructions,0);historical(reviewed.fileBindings);historical(proposal.fileBindings);
 await checkQualification(context.mathQualification,'INDEPENDENT_EARLY_SIX_TASK_PASS',bindings);await checkQualification(context.qualification,'INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_TASK_PASS',bindings);
 const inherited=await bound(context.historyPlan);assert(context.historyReviews?.length);const reviews=[];
 for(const d of context.historyReviews){const q=await bound(d);assert(q.status.startsWith('INDEPENDENT_')&&q.status.endsWith('_PASS'));assert.deepEqual(q.errors,[]);assert.equal(q.newSearches,0);assert.equal(q.newLedgerClaims,0);historical(q.fileBindings);reviews.push(q);}
 assert(reviews.some(q=>q.completion),'A finished actual mathematical history review is required');
 assert(reviews.some(q=>q.fileBindings[context.historyPlan.path]===context.historyPlan.sha256||q.fileBindings[path.resolve(context.historyPlan.path)]===context.historyPlan.sha256),'Inherited history plan must be bound by an actual review');
 const admission=await readEarlyPrefixSelection(context,c);
 assert.deepEqual(auditV4Diversity(admission.records,runtime.slots).reasons,[]);const selected=admission.index.files.map(p=>({path:p,sha256:bindings[path.resolve(p)]??bindings[p],levelSha256:admission.records[admission.index.files.indexOf(p)].levelSha256}));selected.forEach(descriptor);
 const old450=inherited.old450,previousMacro=inherited.previousMacro,comparisonOnly=inherited.comparisonOnly;assert(old450?.length&&previousMacro&&comparisonOnly);
 for(const d of [...old450,...previousMacro,...comparisonOnly])await bound(d);
 const requests=[],publicStocks=[];for(const n of (await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort()){
  const p=path.join(PUBLIC_LEDGER,n),q=await read(p);requests.push(q);publicStocks.push({...q,path:p,sha256:bindings[p]});}
 const failedParents=[];for(const spec of context.failedParents){const q=await bound(spec.receipt),a=q.attempt??q.proof?.attempt;assert(a?.id);assert.equal(q.accepted,false);
  assert.equal(q.sourceLevelId??q.level.id,spec.sourceLevelId);assert.equal(q.levelSha256,levelSha256(q.level));
  const requestFile=`${PUBLIC_LEDGER}/${a.id}.request.json`,resultFile=`${PUBLIC_LEDGER}/${a.id}.result.json`,r=await read(requestFile),result=await read(resultFile);assert.deepEqual(r,a);assertLowTwentyFailedParent(q,result);
  const blockedFile=`${PUBLIC_LEDGER}/${a.id}.blocked.json`,identityBlockedFile=`${PUBLIC_LEDGER}/identities/${r.retryIdentitySha256}.blocked.json`;
  assert.equal((await read(blockedFile)).attemptId,a.id);const ib=await read(identityBlockedFile);assert(ib.attemptId===a.id||ib.attemptIds?.includes(a.id));
  const descendants=await assertNoFailedDescendant(a.id,requests,id=>read(`${PUBLIC_LEDGER}/${id}.result.json`));
  failedParents.push({source:spec.sourceLevelId,branchId:spec.branchId,id:a.id,receipt:spec.receipt,requestFile,resultFile,blockedFile,identityBlockedFile,
   descendants,parentMeaning:'same-source-failure-guard-not-reference-ancestry',fingerprints:designFingerprints(q.level)});}
 const blueprints=[];for(const r of proposal.recipes){const ref=proposal.references.find(x=>x.referenceId===r.referenceId),q=await bound(ref.reference);
  assert.equal(levelSha256(q.level),ref.referenceLevelSha256);assert.equal(routeSha256(q.drags),ref.referenceRouteSha256);assert.deepEqual(q.level,ref.originalLevel);assert.deepEqual(q.drags,ref.completeReferenceDrags);
  const b=makeExplicitLowBandBatchRecipe(runtime,q,{...r,targetDifficulty:2,reference:ref.reference,cut:r.prefixCut,regionBodyIds:ref.changedBodyIds,maximumStocks:1});
  assert.deepEqual(b.prefixDrags,ref.prefix.drags);assertSameUniqueCells(b.region.cells,ref.region.cells);assert.deepEqual(q.level.gates,ref.fixedGates);assert.deepEqual(b.fixedBlocks,ref.fixedBlocks);
  Object.assign(b,{referenceBand:2,finalTargetDifficulty:r.finalTargetDifficulty,branchId:r.branchId,seed:r.seed,colourSeed:r.colourSeed,bodyCountDelta:r.bodyCountDelta,iceCount:r.iceCount,maximumStaticPartitionAttempts:r.maximumStaticPartitionAttempts,allReferenceGates:q.level.gates});
  b.currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,b.sourceLevelId);mergeBindings(bindings,b.currentSourceBinding.bindings);blueprints.push(b);}
 const previousLateStocks=[],seen=new Set(),add=(l,d,q)=>{const h=levelSha256(l);if(seen.has(h))return;seen.add(h);previousLateStocks.push({...d,level:l,sourceLevelId:q.sourceLevelId??l.id,reference:q.plain?.provenance?.reference??q.provenance?.reference??q.branchProvenance?.reference??q.reference??null,fingerprints:designFingerprints(l)});};
 for(const q of inherited.previousLateStocks??[])add(q.level,{path:q.path,sha256:q.sha256},q);
 for(const q of externalHistory.stocks)add(q.level,{path:q.path,sha256:q.sha256},q);
 const ledgerSnapshot=await captureLedgerSnapshot(bindings),terminalHistory=[],closedExperimentIds=new Set([inherited.experimentId].filter(Boolean));
 for(const root of ledgerSnapshot.roots)for(const d of root.files){const q=await bound(d);for(const l of formedStockImages(q))add(l,d,q);
  if(q.experimentId)closedExperimentIds.add(q.experimentId);
  if(d.path.endsWith('.claim.json')&&q.outputDirectory){const resultPath=d.path.replace(/\.claim\.json$/,'.result.json');
   if(q.plan?.path){const previousPlan=await bound(q.plan);if(previousPlan.experimentId)closedExperimentIds.add(previousPlan.experimentId);}
   if([HISTORY_LEDGER_ROOTS[1],HISTORY_LEDGER_ROOTS[5],HISTORY_LEDGER_ROOTS[6]].includes(root.directory))assert(await exists(resultPath),'Unfinished construction blocks a new batch');
   if(await exists(resultPath)){const result=await read(resultPath);if(result.constructionFiles){assert.deepEqual(result.plan,q.plan);const indexPath=path.join(q.outputDirectory,'index.json'),index=await read(indexPath);assert.deepEqual(index.plan,q.plan);
    terminalHistory.push({claim:d,result:{path:resultPath,sha256:bindings[resultPath]},index:{path:indexPath,sha256:bindings[indexPath]}});
    for(const f of result.constructionFiles){const stock=await bound(f);for(const l of formedStockImages(stock))add(l,f,stock);}}}}
 }
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))mergeBindings(bindings,{[file.replaceAll('\\','/')]:sha(await fs.readFile(file))});
 const plan={schemaVersion:4,scope:300,version:MIXED_SHORT_PREFIX_BATCH_VERSION,status:'MIXED_SHORT_PREFIX_BATCH_PREPARED_NO_CONSTRUCTION',experimentId:context.experimentId,qualificationOnly:false,
  proposal:context.proposal,proposalReview:context.proposalReview,qualification:context.qualification,mathQualification:context.mathQualification,historyPlan:context.historyPlan,historyReviews:context.historyReviews,failureLineageReport:proposal.failureLineageReport,
  selectedIndex:context.selection,selectionReview:context.selectionReview,selected,selectedCount:selected.length,blueprints,failedParents,old450,previousMacro,comparisonOnly,previousLateStocks,publicStocks,terminalHistory,
  maximumInputs:blueprints.length,maximumStaticPartitionAttempts:blueprints.reduce((n,b)=>n+b.maximumStaticPartitionAttempts,0),previousExperimentInputs:0,closedCampaignsExtended:false,closedExperimentIds:[...closedExperimentIds].sort(),
  gatePolicy:'all-reference-gates-byte-equivalent-in-original-order',globalShapeInventoryUniquenessRequired:false,exactHistoryExclusionsRetained:true,nearExemptionsAllowed:false,successStopsUnclaimedSiblings:true,
  futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,staticSlots:{2:staticSlot(2),3:staticSlot(3)},strategy:{targets:TARGETS,maximumTailCalls:1,maximumOriginalLowerCalls:1,fallback:false,failedInputRebandAllowed:false},
  selectionUiEvidenceSeparation:admission.uiEvidenceSeparation,
  ledgerSnapshot,bindings,historicalBindingResolutions:c.historicalBindingResolutions,executionEnvironment:environment,policyReviewedAtPreparation:environment.policyReviewedAtPreparation,
  historicalDesignPolicy:environment.historicalDesignPolicy,mathematicalContract:environment.mathematicalContract,proofToolchainSha256:runtime.toolchainSha256,executionPolicyObservation:observeExecutionPolicy(environment),
  accepted:false,catalogEligible:false,formalReady:false,slotAssigned:false,currentRuntimeValidationClaimed:false};
 assertMixedShortPrefixBatchPlan(plan);for(const f of mixedShortPrefixBatchConstructionFiles({sha256:'0'.repeat(64)},plan).slice(2))assert(!(await exists(f)),'A closed early-prefix batch experiment/proposal cannot be renewed');
 await checkAll(bindings);await checkLedgerSnapshot(ledgerSnapshot);return plan;
}

async function boundPlan(d){const p=await readBound(d);assertMixedShortPrefixBatchPlan(p);await checkAll(p.bindings);assert.equal(p.bindings[SELF],sha(await fs.readFile(SELF)));return p;}
async function reviewGate(d,status,subjectKey,subject){const q=await readBound(d);assert.equal(q.status,status);assert.deepEqual(q[subjectKey],subject);assert.deepEqual(q.errors,[]);
 assert.equal(q.newSearches??q.newGameplaySearches,0);assert(q.fileBindings?.[SELF]);await checkAll(q.fileBindings);return q;}
async function pools(p){return{selected:await Promise.all(p.selected.map(d=>readBound(d))),old450:await Promise.all(p.old450.map(d=>readBound(d))),
  history:[...await Promise.all(p.previousMacro.map(async d=>({path:d.path,...await readBound(d)}))),...p.previousLateStocks,...await Promise.all(p.comparisonOnly.map(async d=>({path:d.path,...await readBound(d)})))]};}
function similarity(level,b,source,pool,eligible){return{reference:compareLayouts(level,b.level).footprintSimilarity,source:compareLayouts(level,source).footprintSimilarity,
 selected:nearest(level,pool.selected),old450:nearest(level,pool.old450),history:nearest(level,pool.history),newBatch:nearest(level,eligible.filter(q=>branch(q)!==branch(b)))};}
const similarPass=s=>Object.entries(s).every(([k,v])=>v<=(k==='source'?.55:k==='old450'?.75:.65)+1e-12);
export function recordMixedShortPrefixBatchStock(state,b,built){
 const key=branch(b),prior=[...(state.formed.get(key)??[])];if(built.stockFingerprints)state.shapes.push({key,f:built.stockFingerprints});
 const formed=built.plain?.level??(built.paint?.ok?built.level:null);if(formed)state.formed.set(key,[...prior,designFingerprints(formed)]);
 const duplicate=formed?state.partitions.has(partition(formed)):false;for(const l of formedStockImages(built))state.partitions.add(partition(l));
 return{prior,duplicate};
}
/** One stock has one placeholder and one colour attempt, whose every complete
 * assignment is charged by the unchanged factory. Failed CSPs close a recipe. */
export async function constructMixedShortPrefixBatch(d,out,review){
 assert(!(await exists(out)));const p=await boundPlan(d);await reviewGate(review,'INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_PLAN_PASS','plan',d);
 await checkQualification(p.qualification,'INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_TASK_PASS',{});await checkQualification(p.mathQualification,'INDEPENDENT_EARLY_SIX_TASK_PASS',{});
 const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime),p.executionEnvironment);const pool=await pools(p);
 const state={partitions:new Set([...pool.history,...pool.selected].map(q=>partition(q.level))),formed:new Map(),shapes:[]};
 for(const q of p.previousLateStocks)for(const b of p.blueprints)if(q.sourceLevelId===b.sourceLevelId&&q.reference?.path===b.reference.path){
  const key=branch(b);state.shapes.push({key,f:q.fingerprints});state.formed.set(key,[...(state.formed.get(key)??[]),q.fingerprints]);}
 const retries=new Set(p.publicStocks.map(q=>q.retryIdentitySha256??physical(q))),designs=new Set(p.publicStocks.map(q=>q.designSha256??q.id));
 const attempts=[],eligible=[],counts={},statics={},rejections={};let status='MIXED_SHORT_PREFIX_BATCH_CONSTRUCTION_INTERRUPTED',failureReason=null;
 await checkLedgerSnapshot(p.ledgerSnapshot);const executionPolicyObservation=observeExecutionPolicy(),claim=await claimMixedShortPrefixBatchCampaign(d,out);
 try{await fs.mkdir(out,{recursive:false});await write(`${out}/execution-start.json`,{plan:d,claim,executionPolicyObservation});
  for(const b of p.blueprints)for(let local=0;local<b.maximumStaticPartitionAttempts&&!counts[b.recipeId];local++){
   const seed=b.seed+7919*local,colourSeed=b.colourSeed+7919*local,key=branch(b),parent=p.failedParents.find(x=>branch(x)===key),source=runtime.LEVELS.find(l=>l.id===b.sourceLevelId);
   const filter=level=>({passed:!state.partitions.has(partition(level))&&similarPass(similarity(level,b,source,pool,eligible)),gameplaySearches:0});
   const built=constructTargetStock(runtime,b,{seed,colourSeed,bodyCountDelta:b.bodyCountDelta,forbiddenShapeHashes:[parent.fingerprints.shapeSha256,...state.shapes.filter(q=>q.key===key).map(q=>q.f.shapeSha256)],geometryFilter:filter});
   const a={recipeId:b.recipeId,branchId:b.branchId,sourceLevelId:b.sourceLevelId,finalTargetDifficulty:b.finalTargetDifficulty,localAttempt:local,seed,colourSeed,enteredColourCsp:!!built.paint,status:built.status};statics[b.recipeId]=local+1;
   if(a.enteredColourCsp)counts[b.recipeId]=1;assert(!built.ok||a.enteredColourCsp);
   if(built.plain){const plainFile=`${out}/plain-construction-${String(attempts.length).padStart(4,'0')}.json`;await write(plainFile,{...built.plain,plan:d,recipeId:b.recipeId,branchId:b.branchId,executionPolicyObservation});a.plainConstructionEvidence=await fileDescriptor(plainFile);}
   const file=`${out}/construction-${String(attempts.length).padStart(4,'0')}.json`;await write(file,{...built,plainConstructionEvidence:a.plainConstructionEvidence??null,plan:d,recipeReview:review,recipeId:b.recipeId,branchId:b.branchId,executionEnvironment:p.executionEnvironment,executionPolicyObservation});a.constructionEvidence=await fileDescriptor(file);attempts.push(a);
   const previous=recordMixedShortPrefixBatchStock(state,b,built);const reject=reason=>{a.rejection=reason;rejections[reason]=(rejections[reason]??0)+1;};
   if(!built.ok){reject(built.status);continue;}const f=designFingerprints(built.level);
   if(previous.duplicate||retries.has(physical(f))||designs.has(f.designSha256)){reject('existing-exact-physical-input');continue;}
   if(![parent.fingerprints,designFingerprints(b.level),...previous.prior].every(old=>changedShapeAndColour(old,f))){reject('branch-shape-and-real-colour-change-required');continue;}
   if(await exists(`${PUBLIC_LEDGER}/identities/${physical(f)}.json`)||await exists(`${PUBLIC_LEDGER}/${f.designSha256}.request.json`)){reject('public-input-already-attempted');continue;}
   assert.deepEqual(built.level.gates,b.level.gates);assert.equal(boardBaselineSha256(built.level),boardBaselineSha256(source));
   const comparisons=similarity(built.level,b,source,pool,eligible);if(!similarPass(comparisons)){reject('layout-near');continue;}
   const audit=await auditV4StaticCandidate(runtime,{...staticSlot(b.finalTargetDifficulty),sourceLevelId:b.sourceLevelId,level:built.level});a.staticAudit=audit;if(!audit.passed){reject('static-structure');continue;}
   const candidate={...built,status:'MIXED_SHORT_PREFIX_BATCH_NEW_INPUT_AWAITING_FIRST_CLAIM',sourceLevelId:b.sourceLevelId,recipeId:b.recipeId,branchId:b.branchId,referenceBand:2,targetDifficulty:b.finalTargetDifficulty,finalTargetDifficulty:b.finalTargetDifficulty,
    executionEnvironment:p.executionEnvironment.descriptor,constructionEvidence:a.constructionEvidence,plainConstructionEvidence:a.plainConstructionEvidence,batchPlan:d,redesignOf:parent.id,inputStaticAudit:audit,similarity:comparisons,
    accepted:false,catalogEligible:false,formalReady:false,gameplaySearches:0,fullOriginalUValidated:false};
   try{candidate.predeclaredMathematics=makeTargetPlan(runtime,candidate,p);}catch(error){reject('no-tail-budget-reserve:'+error.message);continue;}
   const cf=`${out}/candidate-${String(eligible.length).padStart(3,'0')}.json`;await write(cf,candidate);a.candidate={...await fileDescriptor(cf),recipeId:b.recipeId,sourceLevelId:b.sourceLevelId,branchId:b.branchId,finalTargetDifficulty:b.finalTargetDifficulty,levelSha256:built.levelSha256,prefixSha256:routeSha256(built.prefixDrags)};eligible.push(candidate);
  }
  await checkAll(p.bindings);await checkLedgerSnapshot(p.ledgerSnapshot,{allowedNewFiles:mixedShortPrefixBatchConstructionFiles(d,p).filter(f=>!f.endsWith('.result.json'))});
  const index={status:'MIXED_SHORT_PREFIX_BATCH_STATIC_COMPLETE_NO_GAMEPLAY_SEARCH',scope:300,plan:d,recipeReview:review,experimentId:p.experimentId,executionEnvironment:p.executionEnvironment,executionPolicyObservation,
   attempts,candidates:attempts.flatMap(a=>a.candidate?[a.candidate]:[]),fixedColourInputs:Object.values(counts).reduce((a,b)=>a+b,0),eligibleInputs:eligible.length,perRecipeColourCspInputs:counts,perRecipeStaticAttempts:statics,rejections,
   closedCampaignsExtended:false,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};assertMixedShortPrefixBatchIndex(index,p);await write(`${out}/index.json`,index);status=index.status;return index;
 }catch(e){failureReason=e.message;throw e;}finally{await finishLatePrefixPlan(claim,{status,failureReason,experimentId:p.experimentId,constructionFiles:attempts.map(a=>a.constructionEvidence),stocksEnteringColourCspIncludingFailed:Object.values(counts).reduce((a,b)=>a+b,0),gameplaySearches:0,publicLedgerClaims:0});}
}

/** Static and root visual receipts are required before the only batch math
 * claim. Success protects unclaimed siblings immediately; failures never retry. */
export async function runMixedShortPrefixBatch({index:indexDescriptor,audit,visual,output}){
 assert(!(await exists(output)));const index=await readBound(indexDescriptor),p=await boundPlan(index.plan);assertMixedShortPrefixBatchIndex(index,p);
 const reviewed=await reviewGate(audit,'INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_STATIC_PASS','index',indexDescriptor);assert.equal(reviewed.verifiedCandidates,index.candidates.length);
 const view=await readBound(visual);assert.equal(view.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(view.index,indexDescriptor);assert.equal(view.viewedCandidates,index.candidates.length);await checkAll(view.fileBindings);
 const bindings=mergeBindings({},p.bindings,reviewed.fileBindings,view.fileBindings);for(const d of [indexDescriptor,audit,visual,index.plan])mergeBindings(bindings,{[d.path]:d.sha256});
 await checkQualification(p.mathQualification,'INDEPENDENT_EARLY_SIX_TASK_PASS',bindings);await checkLedgerSnapshot(p.ledgerSnapshot,{allowedNewFiles:mixedShortPrefixBatchConstructionFiles(index.plan,p)});
 const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime),p.executionEnvironment);const inputs=[];
 for(const d of index.candidates){const q=await readBound(d,bindings),b=p.blueprints.find(b=>b.recipeId===q.recipeId);assert(b);assert.equal(q.status,'MIXED_SHORT_PREFIX_BATCH_NEW_INPUT_AWAITING_FIRST_CLAIM');assert.equal(q.levelSha256,levelSha256(q.level));
  assert.deepEqual(q.batchPlan,index.plan);assert.deepEqual(q.prefixDrags,b.prefixDrags);assert.deepEqual(q.level.gates,b.level.gates);assert.equal(q.branchId,b.branchId);assert.equal(q.sourceLevelId,b.sourceLevelId);
  assertTargetInput(q,b);
  const plan=makeTargetPlan(runtime,q,p);assert.deepEqual(q.predeclaredMathematics,plan);inputs.push({descriptor:d,candidate:q,plan});}
 for(let i=0;i<inputs.length;i++)for(let j=0;j<i;j++){const a=inputs[i].candidate,b=inputs[j].candidate;assert.notEqual(physical(designFingerprints(a.level)),physical(designFingerprints(b.level)));if(branch(a)===branch(b))assert(changedShapeAndColour(designFingerprints(a.level),designFingerprints(b.level)));}
 const executionPolicyObservation=observeExecutionPolicy(),mathExecutionClaim=await claimNativeBatchMath(index.plan,output);await fs.mkdir(output,{recursive:false});
 await write(`${output}/plan.json`,{status:'MIXED_SHORT_PREFIX_BATCH_FIRST_MATH_DECLARED',index:indexDescriptor,audit,visual,batchPlan:index.plan,inputs:inputs.map(({descriptor,plan})=>({descriptor,plan})),bindings,mathExecutionClaim,executionPolicyObservation});
 const latest=new Map(p.failedParents.map(q=>[branch(q),q.id])),results=[],successes=[];
 for(const [i,{descriptor:d,candidate:q,plan}]of inputs.entries()){
  await checkAll(bindings);const disposition=mixedShortPrefixBatchDisposition(q,successes),file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;let record;
  if(disposition)record={...disposition,input:d,batchPlan:index.plan,sourceLevelId:q.sourceLevelId,branchId:q.branchId,finalTargetDifficulty:q.finalTargetDifficulty,L:null,U:null,attempt:null};
  else{const result=await exploreTarget(runtime,q,{plan,redesignOf:latest.get(branch(q))});assert(result.attempt?.id);assert.equal(result.catalogEligible,false);
   record={...result,finalTargetDifficulty:q.finalTargetDifficulty,input:d,batchPlan:index.plan,batchExecutionPlan:`${output}/plan.json`,preflightAudit:audit,visualReview:visual,selectionIndexUnchanged:true};
   if(!result.accepted)latest.set(branch(q),result.attempt.id);}
  await write(file,record);const fd=await fileDescriptor(file);if(record.accepted)successes.push({...q,input:fd});
  results.push({...fd,input:d,sourceLevelId:q.sourceLevelId,branchId:q.branchId,finalTargetDifficulty:q.finalTargetDifficulty,status:record.status,accepted:record.accepted,L:record.L,U:record.U,attemptId:record.attempt?.id??null});
  await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:results.length,total:inputs.length,results,accepted:successes.length},null,2)+'\n');
 }
 await checkAll(bindings);const completion={status:'MIXED_SHORT_PREFIX_BATCH_FIRST_MATH_BATCH_FINISHED',batchPlan:index.plan,index:indexDescriptor,audit,visual,mathExecutionClaim,executionPolicyObservation,
  results,accepted:successes.length,publicClaimsStarted:results.filter(r=>r.attemptId).length,unclaimedSkipped:results.filter(r=>!r.attemptId).length,selectionIndexUnchanged:true,formalReady:false};
 await write(`${output}/completion.json`,completion);return completion;
}

// Read-only consumers share the established pure observation/ice-accounting
// checks. They never invoke the three mutation entrypoints above.
const norm=f=>path.resolve(f).toLowerCase();
function auditReader(){const bindings={},verified=new Map();
 const bytes=async(f,h)=>{const b=await fs.readFile(f),actual=sha(b),key=norm(f);if(h)assert.equal(actual,h,f);if(verified.has(key))assert.equal(actual,verified.get(key).sha256,f);verified.set(key,{path:path.resolve(f),sha256:actual});mergeBindings(bindings,{[f]:actual,[path.resolve(f)]:actual});return b;};
 const map=async m=>{for(const[f,h]of Object.entries(m)){if(verified.has(norm(f)))assert.equal(verified.get(norm(f)).sha256,h,f);else await bytes(f,h);mergeBindings(bindings,{[f]:h});}};
 return{bindings,bytes,map,read:async f=>JSON.parse(await bytes(f)),bound:async d=>{descriptor(d);return JSON.parse(await bytes(d.path,d.sha256));},finish:async()=>{for(const d of verified.values())assert.equal(sha(await fs.readFile(d.path)),d.sha256,d.path);}};
}
export function assertEarlyPrefixProposalBinding(p,proposal,review){
 assertMixedShortPrefixBatchProposal(proposal);assertMixedShortPrefixBatchPlan(p);assert.equal(p.experimentId,proposal.finiteExperiment.experimentId);assert.deepEqual(p.failureLineageReport,proposal.failureLineageReport);
 assert.equal(review.status,'INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_PROPOSAL_PASS');assert.deepEqual(review.proposal,p.proposal);assert.deepEqual(review.errors,[]);assert.equal(review.newSearches,0);assert.equal(review.newConstructions,0);
 assert.equal(p.maximumInputs,proposal.finiteExperiment.maximumColourCspInputsIncludingFailed);assert.equal(p.maximumStaticPartitionAttempts,proposal.finiteExperiment.maximumStaticPartitionAttempts);
 assert.deepEqual(p.blueprints.map(b=>b.recipeId),proposal.recipes.map(r=>r.recipeId));
 for(const[i,b]of p.blueprints.entries()){const s=proposal.recipes[i],ref=proposal.references.find(x=>x.referenceId===s.referenceId);
  for(const k of ['recipeId','sourceLevelId','branchId','referenceBand','finalTargetDifficulty','seed','colourSeed','bodyCountDelta','iceCount','maximumStaticPartitionAttempts'])assert.deepEqual(b[k],s[k]);
  assert.deepEqual(b.reference,ref.reference);assert.deepEqual(b.level,ref.originalLevel);assert.equal(b.referenceLevelSha256,ref.referenceLevelSha256);assert.equal(b.referenceRouteSha256,ref.referenceRouteSha256);
  assert.deepEqual(b.prefixDrags,ref.completeReferenceDrags.slice(0,s.prefixCut));assert.deepEqual(b.prefixDrags,ref.prefix.drags);assert.equal(b.prefixSha256,s.prefixSha256);
  assertSameUniqueCells(b.region.cells,ref.region.cells);assert.deepEqual(b.changedBodies,ref.changedBodies);assert.deepEqual(b.fixedBlocks,ref.fixedBlocks);assert.deepEqual(b.allReferenceGates,ref.fixedGates);}
 return true;
}
async function auditReview(r,d,status,key,subject){const q=await r.bound(d);assert.equal(q.status,status);assert.deepEqual(q.errors,[]);assert.deepEqual(q[key],subject);assert.equal(q.newSearches??q.newGameplaySearches,0);await r.map(q.fileBindings);return q;}
async function auditBatchPlan(r,rt,d,replay){const p=await r.bound(d);assertMixedShortPrefixBatchPlan(p);await r.map(p.bindings);assert.deepEqual(prefixExecutionEnvironment(rt),p.executionEnvironment);
 const external=await readExternalHistory(r,p.failureLineageReport);for(const q of external.stocks)assert(p.previousLateStocks.some(x=>levelSha256(x.level)===levelSha256(q.level)),'External historical stock omitted');
 const proposal=await r.bound(p.proposal),review=await r.bound(p.proposalReview);assertEarlyPrefixProposalBinding(p,proposal,review);await r.map(review.fileBindings);
 for(const[k,s]of [['qualification','INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_TASK_PASS'],['mathQualification','INDEPENDENT_EARLY_SIX_TASK_PASS']]){const q=await r.bound(p[k]);assert.equal(q.status,s);assert.deepEqual(q.errors,[]);assert.equal(q.newRealCandidateSearches,0);assert.equal(q.newRealCandidateConstructions,0);assert.equal(q.publicLedgerClaims??q.newPublicClaims,0);assert(q.toolBindings[MATH_ENTRY]);await r.map(q.toolBindings);}
 await auditLongPrefixExecutionObservation(r,p.executionPolicyObservation,p.executionEnvironment);
 const selection=await r.bound(p.selectedIndex),sr=await r.bound(p.selectionReview);assert.deepEqual(sr.selection,p.selectedIndex);assert.deepEqual(selection.files,p.selected.map(x=>x.path));assert.equal(sr.candidates,p.selectedCount);assert.deepEqual(sr.errors,[]);
 assertAxisSelectedEnvelope(selection,sr,{selection:p.selectedIndex,selectedCount:p.selectedCount},await r.bound(AXIS_INPUTS.selection));
 const separated=await readSeparated161SelectionEvidence(p.selectionReview);assert.deepEqual(separated,p.selectionUiEvidenceSeparation);await r.map(separated.evidenceBindings);
 await readReviewedAxisAppend(await r.bound(AXIS_ADMISSION.receipt),r);
 for(const sd of p.selected){assert.equal(sr.inputBindings[sd.path]??sr.inputBindings[path.resolve(sd.path)],sd.sha256);const q=await r.bound(sd);assert(q.accepted);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));}
 for(const parent of p.failedParents){const q=await r.bound(parent.receipt),request=await r.read(parent.requestFile),result=await r.read(parent.resultFile);assert.deepEqual(request,q.attempt??q.proof?.attempt);assertLowTwentyFailedParent(q,result);assert.equal(request.id,parent.id);assert.deepEqual(parent.fingerprints,designFingerprints(q.level));
  for(const f of [parent.blockedFile,parent.identityBlockedFile]){const x=await r.read(f);assert(x.attemptId===parent.id||x.attemptIds?.includes(parent.id));}}
 if(replay){const checked=new Map();for(const b of p.blueprints){const key=b.reference.sha256+':'+b.prefixDrags.length;let fresh=checked.get(key);if(!fresh){fresh=makeExplicitLowBandBatchRecipe(rt,await r.bound(b.reference),{...b,targetDifficulty:2,cut:b.prefixDrags.length,regionBodyIds:b.region.bodyIds});checked.set(key,fresh);}
   for(const k of ['level','changedBodies','fixedBlocks','prefixDrags','prefixSha256','referenceLevelSha256','referenceRouteSha256'])assert.deepEqual(b[k],fresh[k]);assertSameUniqueCells(b.region.cells,fresh.region.cells);}}
 return p;
}
async function auditSnapshot(r,p,allowed){const permits=new Set(allowed.map(norm));assert.deepEqual(p.ledgerSnapshot.roots.map(x=>norm(x.directory)).sort(),HISTORY_LEDGER_ROOTS.map(norm).sort());
 for(const root of p.ledgerSnapshot.roots){const old=new Set(root.files.map(d=>norm(d.path)));assert.equal(old.size,root.files.length);for(const d of root.files){assert(norm(d.path).startsWith(norm(root.directory)+path.sep));await r.map({[d.path]:d.sha256});}
  for(const f of await exists(root.directory)?await walkJson(root.directory):[])assert(old.has(norm(f))||permits.has(norm(f)),`Unreviewed shared history ${f}`);}}
async function auditConstructionRecord(r,index,p,d){const files=mixedShortPrefixBatchConstructionFiles(d,p),claim=await r.read(files[0]),result=await r.read(files[1]);
 for(const q of [claim,result]){assert.deepEqual(q.plan,d);assert.equal(q.qualificationOnly,false);assert.equal(q.outputDirectory,path.resolve(path.dirname(index.__file)));}
 assert.equal(result.status,index.status);assert.equal(result.failureReason,null);assert.deepEqual(result.constructionFiles,index.attempts.map(a=>a.constructionEvidence));assert.equal(result.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
 for(const f of files.slice(2)){const q=await r.read(f);assert.deepEqual(q.plan,d);assert.deepEqual(q.proposal,p.proposal);assert.equal(q.experimentId,p.experimentId);assert.equal(q.restartAllowed,false);}return files;
}
async function auditBatchStatic(r,rt,d){const index=await r.bound(d),p=await auditBatchPlan(r,rt,index.plan,false);assertMixedShortPrefixBatchIndex(index,p);await auditReview(r,index.recipeReview,'INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_PLAN_PASS','plan',index.plan);
 assert.deepEqual(index.executionEnvironment,p.executionEnvironment);await auditLongPrefixExecutionObservation(r,index.executionPolicyObservation,p.executionEnvironment);const allowed=await auditConstructionRecord(r,{...index,__file:d.path},p,index.plan);
 const pool={selected:await Promise.all(p.selected.map(x=>r.bound(x))),old450:await Promise.all(p.old450.map(x=>r.bound(x))),history:[...await Promise.all(p.previousMacro.map(x=>r.bound(x))),...p.previousLateStocks,...await Promise.all(p.comparisonOnly.map(x=>r.bound(x)))]};
 const state={partitions:new Set([...pool.history,...pool.selected].map(q=>partition(q.level))),formed:new Map(),shapes:[]},rows=[];
 for(const q of p.previousLateStocks)for(const b of p.blueprints)if(q.sourceLevelId===b.sourceLevelId&&q.reference?.path===b.reference.path){const key=branch(b);state.shapes.push({key,f:q.fingerprints});state.formed.set(key,[...(state.formed.get(key)??[]),q.fingerprints]);}
 for(const a of index.attempts){const b=p.blueprints.find(x=>x.recipeId===a.recipeId),built=await r.bound(a.constructionEvidence),key=branch(b),parent=p.failedParents.find(x=>branch(x)===key);
  assert.equal(a.seed,b.seed+7919*a.localAttempt);assert.equal(a.colourSeed,b.colourSeed+7919*a.localAttempt);assert.equal(a.enteredColourCsp,!!built.paint);if(built.enteredColourCsp!==undefined)assert.equal(built.enteredColourCsp,!!built.paint);assert.equal(a.status,built.status);assert.deepEqual(built.plan,index.plan);assert.deepEqual(built.executionPolicyObservation,index.executionPolicyObservation);
  assertLongPrefixStockHistory(built,{parent:parent.fingerprints,reference:designFingerprints(b.level),previousShapes:state.shapes.filter(x=>x.key===key).map(x=>x.f.shapeSha256)});const previous=recordMixedShortPrefixBatchStock(state,b,built),c=built.constructionAccounting;
  assertTargetConstructionAccounting(built,b.finalTargetDifficulty);
  if(built.plain){assert.deepEqual(built.plainConstructionEvidence,a.plainConstructionEvidence);const plain=await r.bound(a.plainConstructionEvidence);for(const[k,v]of Object.entries(built.plain))assert.deepEqual(plain[k],v);await r.map(plain.assetBindings);}
  if(!a.candidate)continue;assert(built.ok&&!previous.duplicate);const q=await r.bound(a.candidate),f=designFingerprints(q.level);assert.deepEqual(q.level,built.level);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.status,'MIXED_SHORT_PREFIX_BATCH_NEW_INPUT_AWAITING_FIRST_CLAIM');
  for(const k of ['recipeId','branchId','sourceLevelId'])assert.equal(q[k],b[k]);assert.deepEqual(q.batchPlan,index.plan);assert.deepEqual(q.constructionEvidence,a.constructionEvidence);assert.deepEqual(q.plainConstructionEvidence,a.plainConstructionEvidence);assert.deepEqual(q.constructionAccounting,c);
  assert.deepEqual(q.prefixDrags,b.prefixDrags);assert.deepEqual(q.level.gates,b.level.gates);assert.equal(q.level.blocks.length,b.level.blocks.length+b.bodyCountDelta);for(const fixed of b.fixedBlocks)assert.deepEqual(q.level.blocks.find(x=>x.id===fixed.id),fixed);
  assertSameUniqueCells(q.level.blocks.filter(x=>!b.fixedBlocks.some(y=>y.id===x.id)).flatMap(absoluteCells),b.region.cells);assertTargetInput(q,b);assert.equal(q.redesignOf,parent.id);
  for(const old of [parent.fingerprints,designFingerprints(b.level),...previous.prior])assert(changedShapeAndColour(old,f));assert(!p.publicStocks.some(x=>(x.retryIdentitySha256??physical(x))===physical(f)||(x.designSha256??x.id)===f.designSha256));
  assert(!(await exists(`${PUBLIC_LEDGER}/identities/${physical(f)}.json`)));const source=rt.LEVELS.find(x=>x.id===b.sourceLevelId);assert.equal(boardBaselineSha256(source),boardBaselineSha256(q.level));
  const compared=similarity(q.level,b,source,pool,rows);assert.deepEqual(compared,q.similarity);assert(similarPass(compared));const staticAudit=await auditV4StaticCandidate(rt,{...staticSlot(b.finalTargetDifficulty),sourceLevelId:b.sourceLevelId,level:q.level});assert(staticAudit.passed,staticAudit.issues.join(';'));await r.map(staticAudit.policyBindings);
  const planned=makeTargetPlan(rt,q,p);assert.deepEqual(q.predeclaredMathematics,planned);const bridge=b.finalTargetDifficulty===3?auditThawedPrefixBridge(rt,q.level,built.plain.level,q.prefixDrags,q.iceDeclaration):null;if(bridge)assert.deepEqual(bridge,q.thawedPrefixBridge);
  for(const k of ['accepted','catalogEligible','formalReady','fullOriginalUValidated'])assert.equal(q[k],false);assert.equal(q.gameplaySearches,0);
  rows.push({candidate:a.candidate,recipeId:b.recipeId,branchId:b.branchId,sourceLevelId:b.sourceLevelId,finalTargetDifficulty:b.finalTargetDifficulty,level:q.level,levelSha256:q.levelSha256,iceCount:b.iceCount,bridge,staticAudit,similarity:compared,constructionEvidence:a.constructionEvidence});}
 assert.deepEqual(rows.map(x=>x.candidate),index.candidates);return{index,p,rows,allowed};
}
export function assertEarlyPrefixActualEnvelope(c,index,p){assertMixedShortPrefixBatchIndex(index,p);assert.equal(c.status,'MIXED_SHORT_PREFIX_BATCH_FIRST_MATH_BATCH_FINISHED');assert.deepEqual(c.batchPlan,index.plan);assert.equal(c.selectionIndexUnchanged,true);assert.equal(c.formalReady,false);
 assert.deepEqual(c.results.map(x=>x.input),index.candidates);assert.equal(c.publicClaimsStarted,c.results.filter(x=>x.attemptId).length);assert.equal(c.unclaimedSkipped,c.results.filter(x=>!x.attemptId).length);assert.equal(c.accepted,c.results.filter(x=>x.accepted).length);assert(unique(c.results.map(x=>x.path)));return true;}
async function auditBatchActual(r,rt,d){const completion=await r.bound(d),index=await r.bound(completion.index),p=await auditBatchPlan(r,rt,completion.batchPlan,false);assertEarlyPrefixActualEnvelope(completion,index,p);
 const st=await auditReview(r,completion.audit,'INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_STATIC_PASS','index',completion.index);assert.equal(st.verifiedCandidates,index.candidates.length);assert.deepEqual(st.plan,completion.batchPlan);
 const visual=await r.bound(completion.visual);assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(visual.index,completion.index);assert.equal(visual.viewedCandidates,index.candidates.length);await r.map(visual.fileBindings);
 await auditLongPrefixExecutionObservation(r,completion.executionPolicyObservation,p.executionEnvironment);const execution=await r.read(path.join(path.dirname(d.path),'plan.json'));assert.equal(execution.status,'MIXED_SHORT_PREFIX_BATCH_FIRST_MATH_DECLARED');assert.deepEqual(execution.batchPlan,completion.batchPlan);assert.deepEqual(execution.executionPolicyObservation,completion.executionPolicyObservation);await r.map(execution.bindings);
 for(const k of ['index','audit','visual','mathExecutionClaim'])assert.deepEqual(execution[k],completion[k]);const lockFile=path.join(LATE_PREFIX_CONSTRUCTION_LEDGER,completion.batchPlan.sha256+'.math-execution.json');assert.equal(norm(completion.mathExecutionClaim.file),norm(lockFile));const lock=await r.bound({path:lockFile,sha256:completion.mathExecutionClaim.sha256});assert.deepEqual(lock.plan,completion.batchPlan);assert.equal(lock.retryAllowed,false);assert.equal(lock.outputDirectory,path.resolve(path.dirname(d.path)));
 const allowed=[...await auditConstructionRecord(r,{...index,__file:completion.index.path},p,completion.batchPlan),lockFile],latest=new Map(p.failedParents.map(x=>[branch(x),x.id])),successes=[],rows=[],requests=[];
 for(const n of (await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort())requests.push(await r.read(path.join(PUBLIC_LEDGER,n)));
 for(const[i,row]of completion.results.entries()){const q=await r.bound(row),input=await r.bound(row.input);assert.deepEqual(q.input,row.input);assert.deepEqual(q.batchPlan,completion.batchPlan);assert.deepEqual(execution.inputs[i].descriptor,row.input);for(const k of ['accepted','status','L','U','sourceLevelId','finalTargetDifficulty'])assert.equal(q[k],row[k]);assert.equal(row.branchId,input.branchId);assert.equal(row.finalTargetDifficulty,input.finalTargetDifficulty);assertTargetInput(input,p.blueprints.find(b=>b.recipeId===input.recipeId));
  const disposition=mixedShortPrefixBatchDisposition(input,successes);if(!row.attemptId){assert(disposition);for(const[k,v]of Object.entries(disposition))assert.deepEqual(q[k],v);assert.equal(q.attempt,null);assert.equal(q.L,null);assert.equal(q.U,null);assert(!requests.some(x=>physical(x)===physical(designFingerprints(input.level))));rows.push({...row,skipped:true});continue;}
  assert.equal(disposition,null);assert.equal(q.attempt.id,row.attemptId);assert.deepEqual(q.level,input.level);assert.equal(q.levelSha256,levelSha256(q.level));assert.deepEqual(q.plan,execution.inputs[i].plan);assert.deepEqual(q.plan,input.predeclaredMathematics);
  assert.deepEqual(q.plan,makeTargetPlan(rt,input,p));if(input.finalTargetDifficulty===3)assert.deepEqual(q.entry,EARLY_PREFIX_TAIL_BINDING);else assert.equal(q.version,LOW_BAND_PREFIX_TAIL_VERSION);assert.equal(q.toolchainSha256,rt.toolchainSha256);assert.deepEqual(q.toolchainBindings,rt.toolchainBindings);await r.map(q.designBindings);assert.equal(q.designToolchainSha256,levelSha256(q.designBindings));
  for(const k of ['qualificationOnly','catalogEligible','formalReady','currentRuntimeValidationClaimed','productionChanged'])assert.equal(q[k],false);await auditLongPrefixExecutionObservation(r,q.executionPolicyObservation,p.executionEnvironment);assertTargetReceiptAccounting(q,input);
  const original=await r.bound(input.constructionEvidence),plain=await r.bound(input.plainConstructionEvidence);assert.deepEqual(original.level,q.level);assert.deepEqual(original.plainConstructionEvidence,input.plainConstructionEvidence);if(input.finalTargetDifficulty===3){const bridge=auditThawedPrefixBridge(rt,q.level,plain.level,input.prefixDrags,input.iceDeclaration);assert.deepEqual(bridge,input.thawedPrefixBridge);if(q.bridge)assert.deepEqual(q.bridge,bridge);}else assert.deepEqual(q.level,plain.level);
  const stem=path.join(PUBLIC_LEDGER,row.attemptId),suffix=input.finalTargetDifficulty===3?'.v4-thawed-prefix-task':'.v4-low-band-prefix-tail',planFile=stem+suffix+'-plan.json',sideFile=stem+suffix+'-result.json';assert.equal(norm(q.planEvidence.path),norm(planFile));assert.equal(norm(q.evidenceFile),norm(sideFile));const pe=await r.bound(q.planEvidence);assert.deepEqual(pe.attempt,q.attempt);assert.deepEqual(pe.plan,q.plan);assert.deepEqual(pe.bindings,q.designBindings);const side=await r.read(sideFile);for(const[k,v]of Object.entries(side))assert.deepEqual(q[k],v);
  const req=await r.read(stem+'.request.json'),res=await r.read(stem+'.result.json'),f=designFingerprints(q.level);assert.deepEqual(req,q.attempt);for(const[k,v]of Object.entries(f))assert.deepEqual(req[k],v);assert.equal(req.id,f.designSha256);assert.equal(req.levelSha256,q.levelSha256);assert.equal(req.retryIdentitySha256,physical(f));assert.equal(req.identityOrigin,req.id);assert.equal(req.revalidates,undefined);assert.equal(req.redesignOf,latest.get(branch(input)));assert.deepEqual(requests.filter(x=>physical(x)===physical(f)).map(x=>x.id),[req.id]);
  const parent=await r.read(`${PUBLIC_LEDGER}/${req.redesignOf}.request.json`),parentResult=await r.read(`${PUBLIC_LEDGER}/${req.redesignOf}.result.json`);assert.equal(parentResult.accepted,false);assert(changedShapeAndColour(parent,f));assert.equal(res.accepted,q.accepted);assert.equal(res.status,q.status);assert.equal(res.levelSha256,q.levelSha256);assert.deepEqual(res.lower,q.lowerBound?.result);assert.deepEqual(res.upper,q.route?.search);
  const alias=path.join(PUBLIC_LEDGER,'identities',physical(f)+'.json');assert.equal((await r.read(alias)).origin,req.id);allowed.push(stem+'.request.json',stem+'.result.json',planFile,sideFile,alias);
  if(q.proof&&input.finalTargetDifficulty===3){assert.equal(q.proof.iceProofSha256,rt.toolchainSha256);assert.deepEqual(q.proof.iceBindings,rt.toolchainBindings);}
  for(const [level,witness]of [[plain.level,q.upperConstruction?.valid?q.upperConstruction:null],[q.level,q.route?{drags:q.drags,U:q.U,canonical:q.route.canonicalReplay,independent:q.route.independentReplay}:null]])if(witness){const canonical=rt.replayRevisedRoute(level,witness.drags),independent=independentReplay(rt,level,witness.drags);assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed);assert.equal(canonical.nonClearingDrags,witness.U);assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);assert.deepEqual(canonical,witness.canonical);assert.deepEqual(independent,witness.independent);}
  if(q.accepted)successes.push({...input,input:{path:row.path,sha256:row.sha256}});else{for(const file of [stem+'.blocked.json',path.join(PUBLIC_LEDGER,'identities',physical(f)+'.blocked.json')]){const x=await r.read(file);assert.equal(x.attemptId,req.id);assert.equal(x.status,q.status);allowed.push(file);}latest.set(branch(input),req.id);}
  rows.push({...row,levelSha256:q.levelSha256,upperWorlds:q.upperAccounting?.conservativeFullBoardStateUpperBound??null,lowerWorlds:q.proof?.guardAllowance.conservativeFullBoardStateUpperBound??null,failureSealed:!q.accepted});}
 assert.equal(successes.length,completion.accepted);return{completion,index,p,rows,allowed};
}
async function auditMixedShortPrefixBatch(mode,d,output){descriptor(d);assert(!(await exists(output)));const r=auditReader(),errors=[];let data={},rt;const names=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),before=await names();
 try{rt=await loadV4Runtime();await r.map(rt.toolchainBindings);const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const f of Object.keys(compiled.metafile.inputs))await r.bytes(f);
  if(mode==='plan')data={p:await auditBatchPlan(r,rt,d,true),rows:[],allowed:[]};else data=await(mode==='static'?auditBatchStatic:auditBatchActual)(r,rt,d);
  await auditSnapshot(r,data.p,data.allowed);await r.finish();assert.deepEqual(await names(),before);
 }catch(e){errors.push(e.message,e.stack);}
 const report={status:`INDEPENDENT_MIXED_SHORT_PREFIX_BATCH_${mode.toUpperCase()}_${errors.length?'FAIL':'PASS'}`,errors,[mode==='plan'?'plan':mode==='static'?'index':'completion']:d,
  plan:mode==='plan'?d:data.index?.plan??null,index:mode==='static'?d:data.completion?.index??null,selection:data.p?.selectedIndex??null,environment:data.p?.executionEnvironment??null,executionPolicyObservation:data.completion?.executionPolicyObservation??data.index?.executionPolicyObservation??data.p?.executionPolicyObservation??null,
  rows:data.rows??[],results:mode==='actual'?data.rows:undefined,recipeCount:data.p?.blueprints.length??null,verifiedCandidates:data.index?.candidates.length??0,accepted:(data.rows??[]).filter(x=>x.accepted).length,fileBindings:r.bindings,
  newSearches:0,newGameplaySearches:0,newConstructions:0,newConstructionCalls:0,newLedgerClaims:0,publicClaimsStarted:0,publicRequestCountBefore:before.length,publicRequestCountAfter:(await names()).length,formalReady:false};
 await fs.mkdir(path.dirname(output),{recursive:true});await write(output,report);return report;
}
export const auditMixedShortPrefixBatchPlan=(d,out)=>auditMixedShortPrefixBatch('plan',d,out);
export const auditMixedShortPrefixBatchStatic=(d,out)=>auditMixedShortPrefixBatch('static',d,out);
export const auditMixedShortPrefixBatchActual=(d,out)=>auditMixedShortPrefixBatch('actual',d,out);

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const[mode,arg,digest,out,review,reviewSha]=process.argv.slice(2);assert(arg&&digest&&out);
 if(mode==='prepare'){assert(!(await exists(out)));const d={path:arg,sha256:digest},p=await prepareMixedShortPrefixBatch(await readBound(d));mergeBindings(p.bindings,{[d.path]:d.sha256});await fs.mkdir(out,{recursive:false});await write(`${out}/plan.json`,p);console.log(JSON.stringify(await fileDescriptor(`${out}/plan.json`)));}
 else if(mode==='construct')console.log(JSON.stringify({status:(await constructMixedShortPrefixBatch({path:arg,sha256:digest},out,{path:review,sha256:reviewSha})).status}));
 else if(mode==='run'){const options=await readBound({path:arg,sha256:digest});assert.equal(options.output,out);console.log(JSON.stringify(await runMixedShortPrefixBatch(options)));}
 else if(['audit-plan','audit-static','audit-actual'].includes(mode)){const result=await auditMixedShortPrefixBatch(mode.slice(6),{path:arg,sha256:digest},out);console.log(JSON.stringify({status:result.status,errors:result.errors,output:out}));if(result.errors.length)process.exitCode=1;}
 else throw Error('Use prepare context sha out | construct plan sha out review sha | run options sha out | audit-plan/static/actual input sha output');
}

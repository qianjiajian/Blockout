import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {realPathWithSuffix,readBound,write,sha} from './native-batch-io.mjs';
import {HISTORY_ROOTS,EARLY_CONSTRUCTION_LEDGER,captureEarlyPrefixHistory,checkEarlyPrefixHistory,assertPrivateEarlyPrefixLedger} from './early-prefix-four-contract.mjs';
export {HISTORY_ROOTS,EARLY_CONSTRUCTION_LEDGER,captureEarlyPrefixHistory,checkEarlyPrefixHistory,assertPrivateEarlyPrefixLedger};
export {physicalPartition,physicalRetry,realShapeColourChange,historyAllowsStock,recordEarlyColourAttempt} from './early-frozen-construction-contract.mjs';

export const EARLY_CONSTRUCTION_VERSION='separate-multisource-early-six-task-v1';
export const EARLY_EXPERIMENT_ID='multisource-early-frozen-prefix-tail-six-20261008-v1';
export const EARLY_PLAN_REVIEW_STATUS='INDEPENDENT_EARLY_SIX_TASK_FIXED_PLAN_PASS';
export const STATIC_SLOT=Object.freeze({formalId:'daily-basic-combined-d3-01',stageKey:'basic-combined',difficulty:3,slot:1,newestMechanism:null});
export const UPPER_BUDGET=Object.freeze({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
export const LOWER_BUDGET=Object.freeze({...UPPER_BUDGET,maxStates:9999});
export const PROPOSAL_SHA='3cd14aa77c49f2df80c1f00cfd165fb4cd5e3836b0ae34b044fc94bbf2f5369f';
export const RECIPES=Object.freeze([
 {recipeId:'early-154-south-and-east',sourceLevelId:154,cut:27,iceCount:4,seed:1261542701},
 {recipeId:'early-154-expanded-south-and-sides',sourceLevelId:154,cut:24,iceCount:2,seed:1261542401},
 {recipeId:'early-109-north-and-west',sourceLevelId:109,cut:20,iceCount:4,seed:1261092001},
 {recipeId:'early-109-north-and-upper-west',sourceLevelId:109,cut:23,iceCount:4,seed:1261092301},
 {recipeId:'early-86-upper-cap',sourceLevelId:86,cut:19,iceCount:4,seed:1260861901},
 {recipeId:'early-86-upper-cap-plus-yellow-row',sourceLevelId:86,cut:18,iceCount:2,seed:1260861801}
].map(r=>Object.freeze({...r,maximumStocks:1,maximumStaticPartitionAttempts:300})));
export const MATH_ENTRY_PATH='tools/daily-challenge/formal-v4/early-frozen-prefix-tail-task.mjs';
export const FUTURE_FILES=Object.freeze(['early-six-task-contract.mjs','early-six-task-factory.mjs','prepare-early-six-task.mjs','construct-early-six-task.mjs','run-early-six-task.mjs','early-frozen-prefix-tail-task.mjs'].map(f=>'tools/daily-challenge/formal-v4/'+f));
const finite=(n,min,max)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max);
export function assertEarlyConstructionPlan(p){
 assert.equal(p.version,EARLY_CONSTRUCTION_VERSION);assert.equal(p.experimentId,EARLY_EXPERIMENT_ID);assert.equal(p.qualificationOnly,false);
 assert.equal(p.proposal.sha256,PROPOSAL_SHA);assert.equal(p.maximumStocksEnteringColourCspIncludingFailed,6);assert.equal(p.maximumStaticPartitionAttempts,1800);
 finite(p.selectedCount,153,300);assert.equal(p.selected.length,p.selectedCount);assert.deepEqual(p.staticSlot,STATIC_SLOT);
 assert.equal(p.closedCampaignsExtended,false);assert.equal(p.accountingScope,'per-physical-stock');assert.equal(p.futureStrategy,'one-thawed-prefix-plain-tail-original-ice-lower');
 assert.deepEqual(p.futureUpperBudget,UPPER_BUDGET);assert.deepEqual(p.futureLowerBudget,LOWER_BUDGET);
 assert.equal(p.mathEntry.path,MATH_ENTRY_PATH);assert.equal(p.mathEntry.sha256,p.bindings[MATH_ENTRY_PATH]);
 for(const f of FUTURE_FILES)assert(/^[a-f0-9]{64}$/.test(p.bindings[f]??''),'Missing future byte binding: '+f);
 assert.equal(p.blueprints.length,6);assert.deepEqual(p.sequence,{step:3571,bodyCountDeltas:[0]});
 for(const [i,b]of p.blueprints.entries()){
  for(const [k,v]of Object.entries(RECIPES[i]))assert.deepEqual(b[k],v,`Fixed recipe ${k}`);
  assert.equal(b.prefixDrags.length,b.cut);assert(b.prefixFacts.clears>=b.iceCount);assert.equal(b.prefixFacts.clears,b.prefixDrags.filter(d=>d.exitSide).length);
  assert.deepEqual(b.allReferenceGates,b.level.gates);assert.equal(b.level.gates.length,8);
  assert(/^[a-f0-9]{64}$/.test(b.failedParent.attemptId));assert.equal(b.failedParent.sourceLevelId,b.sourceLevelId);
  assert(b.failedParent.lineage.noSourceInferenceFromBodyIds&&b.failedParent.lineage.scope==='declared-source-branch-descendants-only');
  assert(b.region.connected&&b.region.fraction>=.35);assert(b.prefixDrags.every(d=>b.fixedBlocks.some(x=>x.id===d.blockId)));
 }
 assert.equal(p.slotAssigned,false);assert.equal(p.formalReady,false);return true;
}
export function auditEarlyPrefixQuotas(plan,attempts){
 const staticCounts=Object.fromEntries(plan.blueprints.map(b=>[b.recipeId,0])),cspCounts={...staticCounts};
 for(const a of attempts){assert(Object.hasOwn(staticCounts,a.recipeId),'Unknown recipe');assert.equal(typeof a.enteredColourCsp,'boolean');
  staticCounts[a.recipeId]++;cspCounts[a.recipeId]+=Number(a.enteredColourCsp);
  const b=plan.blueprints.find(x=>x.recipeId===a.recipeId);assert(staticCounts[a.recipeId]<=b.maximumStaticPartitionAttempts,'Recipe static budget exceeded');assert(cspCounts[a.recipeId]<=b.maximumStocks,'Recipe CSP budget exceeded');}
 finite(attempts.length,0,1800);const total=Object.values(cspCounts).reduce((a,b)=>a+b,0);finite(total,0,6);return{staticCounts,cspCounts,total};
}
/** Same seventh history root, new experiment-wide lock; metadata cannot renew its six inputs. */
export async function claimEarlyConstruction(planDescriptor,outputDirectory,{qualificationOnly=false,ledgerDirectory=EARLY_CONSTRUCTION_LEDGER}={}){
 assert.equal(typeof qualificationOnly,'boolean');const p=await readBound(planDescriptor);assert.equal(p.experimentId,EARLY_EXPERIMENT_ID);
 if(qualificationOnly)await assertPrivateEarlyPrefixLedger(ledgerDirectory);
 else{assertEarlyConstructionPlan(p);assert.equal(await realPathWithSuffix(ledgerDirectory),await realPathWithSuffix(EARLY_CONSTRUCTION_LEDGER));}
 await fs.mkdir(ledgerDirectory,{recursive:true});const key=levelSha256({experimentId:EARLY_EXPERIMENT_ID});
 const claim={plan:planDescriptor,experimentId:EARLY_EXPERIMENT_ID,outputDirectory:path.resolve(outputDirectory),qualificationOnly,claimedAt:new Date().toISOString(),publicMathematicalClaim:false,closedCampaignsExtended:false,retryAllowed:false};
 const claimFile=path.join(ledgerDirectory,key+'.claim.json');await write(claimFile,claim);
 return{...claim,claimFile,claimSha256:sha(await fs.readFile(claimFile)),resultFile:path.join(ledgerDirectory,key+'.result.json')};
}
export async function finishEarlyConstruction(claim,result){await write(claim.resultFile,{...result,experimentId:claim.experimentId,plan:claim.plan,outputDirectory:claim.outputDirectory,
 qualificationOnly:claim.qualificationOnly,finishedAt:new Date().toISOString(),publicMathematicalClaims:0,formalReady:false});}

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {HISTORY_LEDGER_ROOTS as OLD_ROOTS,realPathWithSuffix,readBound,write,sha,walkJson,exists} from './native-batch-io.mjs';
import {EARLY_CONSTRUCTION_LEDGER as PREVIOUS_EARLY_LEDGER} from './early-frozen-construction-contract.mjs';
export {physicalPartition,physicalRetry,realShapeColourChange,historyAllowsStock,recordEarlyColourAttempt} from './early-frozen-construction-contract.mjs';

export const EARLY_CONSTRUCTION_VERSION='separate-early-prefix-four-static-v1';
export const EARLY_EXPERIMENT_ID='early-frozen-prefix-tail-four-20261008-v1';
export const EARLY_CONSTRUCTION_LEDGER='deliverables/daily-formal-v4-20261008/design/early-prefix-construction-ledger';
export const EARLY_PLAN_REVIEW_STATUS='INDEPENDENT_EARLY_PREFIX_FIXED_PLAN_PASS';
export const HISTORY_ROOTS=Object.freeze([...OLD_ROOTS,PREVIOUS_EARLY_LEDGER,EARLY_CONSTRUCTION_LEDGER]);
export const STATIC_SLOT=Object.freeze({formalId:'daily-basic-combined-d3-01',stageKey:'basic-combined',difficulty:3,slot:1,newestMechanism:null});
export const UPPER_BUDGET=Object.freeze({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
export const LOWER_BUDGET=Object.freeze({...UPPER_BUDGET,maxStates:9999});
export const RECIPES=Object.freeze([
 {recipeId:'early-prefix-18-a',sourceLevelId:18,cut:40,iceCount:2,seed:1208413001},
 {recipeId:'early-prefix-198-a',sourceLevelId:198,cut:43,iceCount:4,seed:1208517001},
 {recipeId:'early-prefix-18-b',sourceLevelId:18,cut:40,iceCount:2,seed:1208621001},
 {recipeId:'early-prefix-198-b',sourceLevelId:198,cut:43,iceCount:4,seed:1208725001}
].map(r=>Object.freeze({...r,maximumStocks:1,maximumStaticPartitionAttempts:500})));
export const MATH_ENTRY=Object.freeze({path:'tools/daily-challenge/formal-v4/early-frozen-prefix-tail.mjs',sha256:'a7aa6d78ca86f828e8e5d283b19fc70108282545c17a8b903681e337bbf1d86d'});
export const MATH_REVIEW=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/early-frozen-prefix-tail-independent-01/report.json',sha256:'4fb771d1bfa5f68dbaa3804b655989636144b81d947f950bbca63c45fae45ba8'});
export const FAILED_PARENTS=Object.freeze({18:'d997268d7726e178f032a463f2ac1a4f640fefe38a2456f1f57cd2d53361c6c8',198:'7de71da87562cec32bb96d9281992fcad6a5ea92d23c2192b0548c56ec0845df'});
const finite=(n,min,max)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max);
export function assertEarlyConstructionPlan(p){
 assert.equal(p.version,EARLY_CONSTRUCTION_VERSION);assert.equal(p.experimentId,EARLY_EXPERIMENT_ID);assert.equal(p.qualificationOnly,false);
 assert.equal(p.maximumStocksEnteringColourCspIncludingFailed,4);assert.equal(p.maximumStaticPartitionAttempts,2000);
 assert.equal(p.closedMacroHistory.actualInputs,58);assert.equal(p.closedMacroHistory.extended,false);assert.equal(p.previousEarlyExperiment.actualInputs,4);
 assert.equal(p.selectedCount,150);assert.equal(p.selected.length,150);assert.deepEqual(p.staticSlot,STATIC_SLOT);
 assert.equal(p.accountingScope,'per-physical-stock');assert.equal(p.futureStrategy,'one-thawed-prefix-plain-tail-original-ice-lower');
 assert.deepEqual(p.futureUpperBudget,UPPER_BUDGET);assert.deepEqual(p.futureLowerBudget,LOWER_BUDGET);assert.deepEqual(p.mathEntry,MATH_ENTRY);assert.deepEqual(p.mathEntryQualification,MATH_REVIEW);
 assert.equal(p.blueprints.length,4);assert.deepEqual(p.sequence,{step:3571,bodyCountDeltas:[-2,-1,1,2,3,0]});
 for(const [i,b]of p.blueprints.entries()){
  for(const [k,v]of Object.entries(RECIPES[i]))assert.deepEqual(b[k],v,`Fixed recipe ${k}`);
  assert.equal(b.prefixDrags.length,b.cut);assert.equal(b.prefixFacts.clears,b.iceCount);assert(b.prefixFacts.parking>=31);
  assert.deepEqual(b.allReferenceGates,b.level.gates);assert.equal(b.level.gates.length,8);
  assert.equal(b.failedParent.attemptId,FAILED_PARENTS[b.sourceLevelId]);
  assert(b.region.connected&&b.region.fraction>=.35);assert(b.prefixDrags.every(d=>b.fixedBlocks.some(x=>x.id===d.blockId)));
 }
 assert.equal(p.slotAssigned,false);assert.equal(p.formalReady,false);return true;
}
export function auditEarlyPrefixQuotas(plan,attempts){
 const staticCounts=Object.fromEntries(plan.blueprints.map(b=>[b.recipeId,0])),cspCounts={...staticCounts};
 for(const a of attempts){assert(Object.hasOwn(staticCounts,a.recipeId),'Unknown recipe');assert.equal(typeof a.enteredColourCsp,'boolean');
  staticCounts[a.recipeId]++;cspCounts[a.recipeId]+=Number(a.enteredColourCsp);
  const b=plan.blueprints.find(x=>x.recipeId===a.recipeId);assert(staticCounts[a.recipeId]<=b.maximumStaticPartitionAttempts,'Recipe static budget exceeded');assert(cspCounts[a.recipeId]<=b.maximumStocks,'Recipe CSP budget exceeded');}
 finite(attempts.length,0,2000);const total=Object.values(cspCounts).reduce((a,b)=>a+b,0);finite(total,0,4);return{staticCounts,cspCounts,total};
}
export async function assertPrivateEarlyPrefixLedger(directory){const actual=await realPathWithSuffix(directory);
 for(const root of HISTORY_ROOTS){const real=await realPathWithSuffix(root);assert(actual!==real&&!actual.startsWith(real+path.sep),'Private early-prefix ledger aliases shared history');}}
export async function captureEarlyPrefixHistory(bindings={}){const roots=[];for(const directory of HISTORY_ROOTS){const files=[];
 for(const file of await exists(directory)?await walkJson(directory):[]){const h=sha(await fs.readFile(file));if(bindings[file])assert.equal(bindings[file],h);bindings[file]=h;files.push({path:file,sha256:h});}
 roots.push({directory,files});}return{roots};}
export async function checkEarlyPrefixHistory(snapshot,{allowedNewFiles=[]}={}){
 const normalized=p=>path.resolve(p).toLowerCase();assert.deepEqual(snapshot.roots.map(r=>normalized(r.directory)).sort(),HISTORY_ROOTS.map(normalized).sort());
 const allowed=new Set(allowedNewFiles.map(normalized));
 for(const root of snapshot.roots){const expected=new Map(root.files.map(d=>[normalized(d.path),d]));assert.equal(expected.size,root.files.length);
  for(const d of root.files){assert(normalized(d.path).startsWith(normalized(root.directory)+path.sep));await readBound(d);}
  for(const f of await exists(root.directory)?await walkJson(root.directory):[])assert(expected.has(normalized(f))||allowed.has(normalized(f)),`Unreviewed shared history added: ${f}`);}
}
/** Experiment-wide wx lock: changing a plan hash, label or seed cannot restart the four-input allowance. */
export async function claimEarlyConstruction(planDescriptor,outputDirectory,{qualificationOnly=false,ledgerDirectory=EARLY_CONSTRUCTION_LEDGER}={}){
 assert.equal(typeof qualificationOnly,'boolean');const p=await readBound(planDescriptor);assert.equal(p.experimentId,EARLY_EXPERIMENT_ID);
 if(qualificationOnly)await assertPrivateEarlyPrefixLedger(ledgerDirectory);
 else{assertEarlyConstructionPlan(p);assert.equal(await realPathWithSuffix(ledgerDirectory),await realPathWithSuffix(EARLY_CONSTRUCTION_LEDGER));}
 await fs.mkdir(ledgerDirectory,{recursive:true});const key=levelSha256({experimentId:EARLY_EXPERIMENT_ID});
 const claim={plan:planDescriptor,experimentId:EARLY_EXPERIMENT_ID,outputDirectory:path.resolve(outputDirectory),qualificationOnly,claimedAt:new Date().toISOString(),publicMathematicalClaim:false,closedMacroExperimentExtended:false,retryAllowed:false};
 const claimFile=path.join(ledgerDirectory,key+'.claim.json');await write(claimFile,claim);
 return{...claim,claimFile,claimSha256:sha(await fs.readFile(claimFile)),resultFile:path.join(ledgerDirectory,key+'.result.json')};
}
export async function finishEarlyConstruction(claim,result){await write(claim.resultFile,{...result,experimentId:claim.experimentId,plan:claim.plan,outputDirectory:claim.outputDirectory,
 qualificationOnly:claim.qualificationOnly,finishedAt:new Date().toISOString(),publicMathematicalClaims:0,formalReady:false});}

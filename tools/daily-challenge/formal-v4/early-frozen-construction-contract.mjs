import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {bodyFootprint} from '../formal-v3/diversity-layout-factory.mjs';
import {HISTORY_LEDGER_ROOTS,realPathWithSuffix,readBound,write,sha} from './native-batch-io.mjs';

export const EARLY_CONSTRUCTION_VERSION='separate-early-frozen-four-static-v1';
export const EARLY_EXPERIMENT_ID='early-frozen-order-four-20261008-v1';
export const EARLY_CONSTRUCTION_LEDGER='deliverables/daily-formal-v4-20261008/design/early-frozen-construction-ledger';
export const EARLY_PROPOSAL={path:'deliverables/daily-formal-v4-20261008/design/early-frozen-order-four-proposal-02/proposal.json',sha256:'ed35685c495384b4f3c4121de956c81f5c32feada8fdc02f058a173f50e0dc48'};
export const EARLY_PLAN_REVIEW_STATUS='INDEPENDENT_EARLY_FROZEN_FIXED_PLAN_PASS';
export const physicalPartition=l=>levelSha256(l.blocks.map(bodyFootprint).sort());
export const physicalRetry=f=>levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
export function realShapeColourChange(a,b){
 const shared=b.colorAssignments.filter(x=>a.colorAssignments.some(y=>x.id===y.id));
 const colours=shared.length?shared.some(x=>a.colorAssignments.some(y=>x.id===y.id&&JSON.stringify(x.colors)!==JSON.stringify(y.colors))):
  levelSha256(a.colorAssignments.map(x=>x.colors).sort())!==levelSha256(b.colorAssignments.map(x=>x.colors).sort());
 return a.shapeSha256!==b.shapeSha256&&a.colorSha256!==b.colorSha256&&colours;
}
export function historyAllowsStock(level,f,{partitions=new Set(),retryIdentities=new Set(),designs=new Set(),sameSourceShapes=new Set()}={}){
 return!partitions.has(physicalPartition(level))&&!retryIdentities.has(physicalRetry(f))&&!designs.has(f.designSha256)&&!sameSourceShapes.has(f.shapeSha256);
}
export function recordEarlyColourAttempt(perRecipe,blueprint,built){
 const entered=Boolean(built.paint);assert.equal(built.enteredColourCsp,entered);
 if(entered){const count=(perRecipe.get(blueprint.recipeId)??0)+1;assert(count<=blueprint.maximumStocks);perRecipe.set(blueprint.recipeId,count);}return entered;
}
export function assertEarlyConstructionPlan(p){
 assert.equal(p.version,EARLY_CONSTRUCTION_VERSION);assert.equal(p.experimentId,EARLY_EXPERIMENT_ID);assert.deepEqual(p.proposal,EARLY_PROPOSAL);
 assert.equal(p.qualificationOnly,false);assert.equal(p.selectedCount,150);assert.equal(p.selected.length,150);
 assert.equal(p.maximumStocksEnteringColourCspIncludingFailed,4);assert.equal(p.maximumStaticPartitionAttempts,2000);
 assert.equal(p.closedMacroHistory.actualInputs,58);assert.equal(p.closedMacroHistory.extended,false);
 assert(!Object.hasOwn(p,'maximumAfterThisBatch')&&!Object.hasOwn(p,'previousMacro64ActualInputs'));
 assert.deepEqual(p.blueprints.map(b=>[b.sourceLevelId,b.cut,b.iceCount,b.maximumStocks]),[[18,40,2,2],[198,43,4,2]]);
 assert.equal(new Set(p.blueprints.map(b=>b.recipeId)).size,2);
 for(const b of p.blueprints){assert.equal(b.prefixDrags.length,b.cut);assert.equal(b.prefixFacts.clears,b.iceCount);assert(b.prefixFacts.parking>=31);
  assert.deepEqual(b.allReferenceGates,b.level.gates);assert.equal(b.region.connected,true);assert(b.region.fraction>=.35);
  assert(b.prefixDrags.every(d=>b.fixedBlocks.some(x=>x.id===d.blockId)));}
 assert.equal(p.futureStrategy,'one-original-full-ice-joint');assert.deepEqual(p.futureBudget,{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
 assert.equal(p.accountingScope,'per-physical-stock');assert.equal(p.formalReady,false);return true;
}

/** Stable experiment key, not output label/plan digest, prevents restarting
 * the same four-input authorization under another directory or metadata hash. */
export async function claimEarlyConstruction(planDescriptor,outputDirectory,{qualificationOnly=false,ledgerDirectory=EARLY_CONSTRUCTION_LEDGER}={}){
 assert.equal(typeof qualificationOnly,'boolean');const p=await readBound(planDescriptor);assert.equal(p.experimentId,EARLY_EXPERIMENT_ID);
 if(!qualificationOnly){assertEarlyConstructionPlan(p);assert.equal(await realPathWithSuffix(ledgerDirectory),await realPathWithSuffix(EARLY_CONSTRUCTION_LEDGER));}
 else{const actual=await realPathWithSuffix(ledgerDirectory);for(const root of [...HISTORY_LEDGER_ROOTS,EARLY_CONSTRUCTION_LEDGER]){
   const real=await realPathWithSuffix(root);assert(actual!==real&&!actual.startsWith(real+path.sep),'Private ledger aliases shared history');}}
 await fs.mkdir(ledgerDirectory,{recursive:true});const key=levelSha256({experimentId:EARLY_EXPERIMENT_ID});
 const claim={plan:planDescriptor,experimentId:EARLY_EXPERIMENT_ID,outputDirectory:path.resolve(outputDirectory),qualificationOnly,
  claimedAt:new Date().toISOString(),publicMathematicalClaim:false,closedMacroExperimentExtended:false,retryAllowed:false};
 const claimFile=path.join(ledgerDirectory,key+'.claim.json');await write(claimFile,claim);
 return{...claim,claimFile,claimSha256:sha(await fs.readFile(claimFile)),resultFile:path.join(ledgerDirectory,key+'.result.json')};
}
export async function finishEarlyConstruction(claim,result){await write(claim.resultFile,{...result,experimentId:claim.experimentId,plan:claim.plan,
 outputDirectory:claim.outputDirectory,qualificationOnly:claim.qualificationOnly,finishedAt:new Date().toISOString(),publicMathematicalClaims:0,formalReady:false});}

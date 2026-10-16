import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {EARLY_PLAN_REVIEW_STATUS,assertEarlyConstructionPlan,checkEarlyPrefixHistory,STATIC_SLOT} from './early-prefix-four-contract.mjs';
import {readBound,checkBindings,mergeBindings,write,sha} from './native-batch-io.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {loadV4StageContract} from './static-contract.mjs';

const [file,digest,output]=process.argv.slice(2),descriptor={path:file,sha256:digest};
const bindings={},p=await readBound(descriptor,bindings);assertEarlyConstructionPlan(p);
const proposal=await readBound(p.proposal,bindings),qualification=await readBound(p.constructorQualification,bindings);
assert.equal(qualification.status,'INDEPENDENT_EARLY_PREFIX_FOUR_PRIVATE_PASS');assert.deepEqual(qualification.errors,[]);
const low=await readBound(p.lowBandActualReview,bindings),old=await readBound(p.previousEarlyActualReview,bindings);
assert.equal(low.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.equal(low.accepted,3);assert.deepEqual(low.errors,[]);
assert.equal(old.status,'INDEPENDENT_EARLY_FROZEN_ACTUAL_PASS');assert.equal(old.accepted,0);assert.deepEqual(old.errors,[]);
assert.equal(p.publicRequestCount,14784);assert.deepEqual(p.selectedIndex,proposal.selectedIndex);
assert.deepEqual(p.similarity,proposal.similarity);assert.equal(p.blueprints.length,4);
assert.equal(p.maximumStocksEnteringColourCspIncludingFailed,4);assert.equal(p.maximumStaticPartitionAttempts,2000);
const rt=await loadV4Runtime(),stages=await loadV4StageContract();
const slot=stages.DAILY_CHALLENGE_V3_SLOTS.find(s=>s.id===STATIC_SLOT.formalId);assert(slot);
assert.deepEqual(STATIC_SLOT,{formalId:slot.id,stageKey:slot.stageKey,difficulty:slot.difficulty,slot:slot.slot,newestMechanism:slot.newestMechanism});
const rows=[];
for(const b of p.blueprints){
 const r=proposal.recipes.find(x=>x.recipeId===b.recipeId);assert(r);
 for(const[k,v]of Object.entries(r.fixed))assert.deepEqual(b[k],v,k);
 for(const k of ['reference','referenceLevelSha256','referenceRouteSha256','region','prefixDrags','prefixFacts','failedParent'])assert.deepEqual(b[k],r[k],k);
 assert.deepEqual(b.fixedBlocks,r.fixedOutsideBodies);assert.deepEqual(b.changedBodies,r.originalRegionBodies);
 assert.deepEqual(b.allReferenceGates,r.gatePolicy.preservedGates);assert.equal(b.iceCount,r.iceDeclaration.initialCount);
 const reference=await readBound(b.reference,bindings);assert.deepEqual(b.level,reference.level);
 assert.equal(levelSha256(reference.level),b.referenceLevelSha256);assert.equal(routeSha256(reference.drags),b.referenceRouteSha256);
 assert.deepEqual(reference.drags.slice(0,b.cut),b.prefixDrags);
 const canonical=rt.replayRevisedRoute(reference.level,reference.drags),independent=independentReplay(rt,reference.level,reference.drags);
 for(const replay of [canonical,independent]){assert(replay.valid&&replay.complete&&!replay.failed);assert.equal(replay.nonClearingDrags,reference.U);}
 const changedIds=new Set(b.changedBodies.map(x=>x.id));assert(b.prefixDrags.every(d=>!changedIds.has(d.blockId)));
 assert.equal(b.prefixDrags.filter(d=>d.exitSide).length,b.iceCount);
 rows.push({recipeId:b.recipeId,sourceLevelId:b.sourceLevelId,cut:b.cut,iceCount:b.iceCount,seed:b.seed,referenceL:reference.L,referenceU:reference.U,newUpperOrLowerClaimed:false});
}
mergeBindings(bindings,p.bindings,qualification.fileBindings,low.fileBindings,old.fileBindings);
await checkBindings(bindings);await checkEarlyPrefixHistory(p.ledgerSnapshot);
assert.deepEqual(prefixExecutionEnvironment(rt,p.executionEnvironment.descriptor),p.executionEnvironment);
const own='tools/daily-challenge/formal-v4/review-early-prefix-plan-root.mjs';bindings[own]=sha(await fs.readFile(own));
await write(output,{status:EARLY_PLAN_REVIEW_STATUS,plan:descriptor,constructorReview:p.constructorQualification,lowBandActualReview:p.lowBandActualReview,
 recipeCount:4,rows,errors:[],fileBindings:bindings,maximumCspInputs:4,staticPerRecipe:500,publicRequestCount:p.publicRequestCount,
 allEightReferenceGatesUnchanged:true,perPhysicalStockBudget:true,slotAssigned:false,newConstructions:0,newSearches:0,newPublicClaims:0,formalReady:false});
console.log(JSON.stringify({status:EARLY_PLAN_REVIEW_STATUS,path:output,sha256:sha(await fs.readFile(output))}));

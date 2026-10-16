import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {EARLY_PLAN_REVIEW_STATUS,assertEarlyConstructionPlan} from './early-frozen-construction-contract.mjs';
import {readBound,checkBindings,checkLedgerSnapshot,mergeBindings,write,sha} from './native-batch-io.mjs';

const [planPath,planSha,output]=process.argv.slice(2),planD={path:planPath,sha256:planSha};
const bindings={},p=await readBound(planD,bindings);assertEarlyConstructionPlan(p);
const proposal=await readBound(p.proposal,bindings),q=await readBound(p.constructorQualification,bindings);
assert.equal(q.status,'INDEPENDENT_EARLY_FROZEN_CONSTRUCTOR_PRIVATE_PASS');assert.deepEqual(q.errors,[]);
const proposalReviewD={path:'deliverables/daily-formal-v4-20261008/proof/early-frozen-proposal-independent-04/report.json',sha256:'f0ffe304ee2f8177da00bf1a19246d14f5df4911d50a95bc97e2a2d1fe151a06'};
const pr=await readBound(proposalReviewD,bindings);assert.equal(pr.status,'INDEPENDENT_EARLY_FROZEN_FOUR_PROPOSAL_PASS');assert.deepEqual(pr.proposal,p.proposal);assert.deepEqual(pr.errors,[]);
for(const report of [q,pr]){assert.equal(report.newSearches,0);assert.equal(report.formalReady,false);}
assert.deepEqual(p.sequence,proposal.constructionPolicy.sequence);assert.equal(p.publicRequestCount,14755);
assert.deepEqual(p.selectedIndex,proposal.selectedIndex);
for(const b of p.blueprints){
 const r=proposal.recipes.find(x=>x.recipeId===b.recipeId);assert(r);
 for(const key of ['sourceLevelId','cut','reference','referenceLevelSha256','referenceRouteSha256','region','prefixDrags','prefixFacts','failedParent'])assert.deepEqual(b[key],r[key],key);
 assert.deepEqual(b.fixedBlocks,r.fixedOutsideBodies);assert.deepEqual(b.changedBodies,r.originalRegionBodies);
 assert.equal(b.iceCount,r.iceDeclaration.initialCount);assert.deepEqual(b.allReferenceGates,r.gatePolicy.preservedGates);
 const original=await readBound(b.reference,bindings);assert.deepEqual(b.level,original.level);
}
mergeBindings(bindings,p.bindings,q.fileBindings,pr.fileBindings);await checkBindings(bindings);await checkLedgerSnapshot(p.ledgerSnapshot);
const rt=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(rt,p.executionEnvironment.descriptor),p.executionEnvironment);
const own='tools/daily-challenge/formal-v4/review-early-frozen-plan-root.mjs';bindings[own]=sha(await fs.readFile(own));
await write(output,{status:EARLY_PLAN_REVIEW_STATUS,plan:planD,proposalReview:proposalReviewD,constructorReview:p.constructorQualification,
 recipeCount:2,maximumCspInputs:4,allEightReferenceGatesUnchanged:true,perPhysicalStockBudget:true,oldMacroExperimentClosedAt:58,
 errors:[],fileBindings:bindings,newConstructions:0,newSearches:0,newPublicClaims:0,formalReady:false});
console.log(JSON.stringify({status:EARLY_PLAN_REVIEW_STATUS,path:output,sha256:sha(await fs.readFile(output))}));

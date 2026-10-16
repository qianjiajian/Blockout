import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {makeEarlyFrozenIcePlan,exploreEarlyFrozenIce} from './early-frozen-ice-joint.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {EARLY_CONSTRUCTION_LEDGER,EARLY_EXPERIMENT_ID,assertEarlyConstructionPlan} from './early-frozen-construction-contract.mjs';
import {readBound,write,sha,exists,checkBindings,checkLedgerSnapshot,mergeBindings} from './native-batch-io.mjs';
const own='tools/daily-challenge/formal-v4/run-early-frozen-four.mjs';
export const EARLY_STATIC_REVIEW_STATUS='INDEPENDENT_EARLY_FROZEN_STATIC_PASS';

/** Orchestration only. The frozen entry owns one original iced joint and the
 * unchanged shared physical ledger. No plain, tail, native or lower fallback. */
export async function runEarlyFrozenFour({index:inputIndex,audit:inputAudit,visual:inputVisual,label}){
 assert(/^[a-z0-9-]+$/.test(label??''));const output=`deliverables/daily-formal-v4-20261008/design/${label}`;assert(!(await exists(output)));
 const index=await readBound(inputIndex),audit=await readBound(inputAudit),visual=await readBound(inputVisual),fixed=await readBound(index.plan);
 assertEarlyConstructionPlan(fixed);assert.equal(index.status,'EARLY_FROZEN_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');
 assert.equal(index.closedMacroActualInputs,58);assert.equal(index.closedMacroExperimentExtended,false);
 assert(index.fixedColourInputs<=4);assert.equal(index.separateExperimentActualInputs,index.fixedColourInputs);
 assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);assert.equal(index.eligibleInputs,index.candidates.length);
 const counts=Object.fromEntries(fixed.blueprints.map(b=>[b.recipeId,0]));for(const a of index.attempts)if(a.enteredColourCsp){assert(Object.hasOwn(counts,a.recipeId));counts[a.recipeId]++;}
 for(const b of fixed.blueprints){assert(counts[b.recipeId]<=2);assert.equal(counts[b.recipeId],index.perRecipeColourCspInputs[b.recipeId]??0);}
 assert.equal(Object.values(counts).reduce((s,n)=>s+n,0),index.fixedColourInputs);
 assert.equal(audit.status,EARLY_STATIC_REVIEW_STATUS);assert.deepEqual(audit.index,inputIndex);assert.deepEqual(audit.plan,index.plan);assert.deepEqual(audit.errors,[]);
 assert.equal(audit.verifiedCandidates,index.candidates.length);assert.equal(audit.publicClaimsStarted,0);assert.equal(audit.newGameplaySearches,0);
 assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(visual.index,inputIndex);assert.equal(visual.viewedCandidates,index.candidates.length);assert.equal(visual.formalPointerValidation,false);
 const bindings=mergeBindings({},fixed.bindings,audit.fileBindings,visual.fileBindings);
 for(const d of [inputIndex,inputAudit,inputVisual,index.plan,...index.candidates])mergeBindings(bindings,{[d.path]:d.sha256});
 assert.equal(bindings[own],sha(await fs.readFile(own)));await checkBindings(bindings);await checkLedgerSnapshot(fixed.ledgerSnapshot);
 const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime,index.executionEnvironment.descriptor),index.executionEnvironment);
 const inputs=[];for(const d of index.candidates){const q=await readBound(d),bp=fixed.blueprints.find(b=>b.recipeId===d.recipeId);assert(bp);
  assert.equal(q.recipeId,bp.recipeId);assert.equal(q.sourceLevelId,bp.sourceLevelId);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.levelSha256,d.levelSha256);
  assert.deepEqual(q.fixedBatchPlan,index.plan);assert.deepEqual(q.prefixDrags,bp.prefixDrags);assert.equal(q.iceDeclaration.count,bp.iceCount);
  assert.equal(q.predeclaredUpperStrategy,'original-ice-joint');assert.equal(q.redesignOf,bp.failedParent.attemptId);assert(q.inputStaticAudit.passed&&q.prefixAudit.valid);
  assert.equal(q.status,'STATIC_EARLY_FROZEN_INPUT_AWAITING_FIRST_PUBLIC_CLAIM');assert.equal(q.accepted,false);assert.equal(q.gameplaySearches,0);
  const plan=makeEarlyFrozenIcePlan(runtime,q,{floor:31,searchUpper:128,budget:fixed.futureBudget});inputs.push({descriptor:d,candidate:q,plan});}
 const executionFile=path.join(EARLY_CONSTRUCTION_LEDGER,levelSha256({experimentId:EARLY_EXPERIMENT_ID})+'.math-execution.json');
 await write(executionFile,{plan:index.plan,index:inputIndex,outputDirectory:output,experimentId:EARLY_EXPERIMENT_ID,retryAllowed:false,startedAt:new Date().toISOString()});
 await fs.mkdir(output,{recursive:false});await write(`${output}/plan.json`,{status:'FIXED_ORIGINAL_ICE_JOINT_BATCH_BEFORE_CLAIMS',index:inputIndex,audit:inputAudit,visual:inputVisual,
  batchPlan:index.plan,inputs:inputs.map(x=>({descriptor:x.descriptor,plan:x.plan})),bindings,executionFile,formalReady:false});
 const latestFailure=new Map(fixed.blueprints.map(b=>[b.sourceLevelId,b.failedParent.attemptId])),results=[],accepted=[];
 for(const[i,{descriptor,candidate,plan}]of inputs.entries()){
  await checkBindings(bindings);const redesignOf=latestFailure.get(candidate.sourceLevelId),proof=await exploreEarlyFrozenIce(runtime,candidate,{plan,redesignOf});
  assert(proof.attempt?.id);assert.equal(proof.catalogEligible,false);assert.equal(proof.formalReady,false);if(!proof.accepted)latestFailure.set(candidate.sourceLevelId,proof.attempt.id);
  const file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;await write(file,{...proof,input:descriptor,batchPlan:index.plan,
   preflightAudit:inputAudit,visualReview:inputVisual,selectionIndexUnchanged:true,admissionStatus:'PURE_ICE_MATH_POOL_NOT_STAGE_OR_STRENGTH_ACCEPTANCE'});
  const row={input:descriptor,file,sha256:sha(await fs.readFile(file)),sourceLevelId:candidate.sourceLevelId,attemptId:proof.attempt.id,redesignOf,
   status:proof.status,accepted:proof.accepted,L:proof.L,U:proof.U,sharedWorlds:proof.sharedAccounting?.conservativeFullBoardStateUpperBound??null};
  results.push(row);if(row.accepted)accepted.push({path:file,sha256:row.sha256});
  await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:results.length,total:inputs.length,results,mathematicalPoolAccepted:accepted.length,formalReady:false},null,2)+'\n');console.log(JSON.stringify(row));
 }
 await checkBindings(bindings);const completion={status:'FINITE_EARLY_FROZEN_FIRST_JOINT_BATCH_FINISHED',index:inputIndex,audit:inputAudit,visual:inputVisual,batchPlan:index.plan,
  results,accepted,mathematicalPoolAccepted:accepted.length,selectedCandidatesAdded:0,selectionIndexUnchanged:true,oldMacroActualInputs:58,
  separateExperimentActualInputs:index.fixedColourInputs,catalogEligible:false,formalReady:false};await write(`${output}/completion.json`,completion);return completion;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[p,h,a,ah,v,vh,label]=process.argv.slice(2);await runEarlyFrozenFour({index:{path:p,sha256:h},audit:{path:a,sha256:ah},visual:{path:v,sha256:vh},label});}

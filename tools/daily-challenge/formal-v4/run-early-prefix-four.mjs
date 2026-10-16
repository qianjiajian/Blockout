import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {makeEarlyFrozenPrefixTailPlan,exploreEarlyFrozenPrefixTail} from './early-frozen-prefix-tail.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {EARLY_CONSTRUCTION_LEDGER,EARLY_EXPERIMENT_ID,assertEarlyConstructionPlan,auditEarlyPrefixQuotas,checkEarlyPrefixHistory} from './early-prefix-four-contract.mjs';
import {readBound,readFile,write,sha,exists,checkBindings,mergeBindings} from './native-batch-io.mjs';
const own='tools/daily-challenge/formal-v4/run-early-prefix-four.mjs';
export const EARLY_STATIC_REVIEW_STATUS='INDEPENDENT_EARLY_PREFIX_STATIC_PASS';

/** Orchestration only. One original iced identity owns one thaw bridge/plain
 * tail U and then at most one original ice floor-only L. No fallback. */
export async function runEarlyPrefixFour({index:inputIndex,audit:inputAudit,visual:inputVisual,label}){
 assert(/^[a-z0-9-]+$/.test(label??''));const output=`deliverables/daily-formal-v4-20261008/design/${label}`;assert(!(await exists(output)));
 const index=await readBound(inputIndex),audit=await readBound(inputAudit),visual=await readBound(inputVisual),fixed=await readBound(index.plan);
 assertEarlyConstructionPlan(fixed);assert.equal(index.status,'EARLY_PREFIX_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');
 assert.equal(index.closedMacroActualInputs,58);assert.equal(index.closedMacroExperimentExtended,false);
 assert(index.fixedColourInputs<=4);assert.equal(index.separateExperimentActualInputs,index.fixedColourInputs);
 assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);assert.equal(index.eligibleInputs,index.candidates.length);
 const quotas=auditEarlyPrefixQuotas(fixed,index.attempts);assert.deepEqual(quotas.cspCounts,index.perRecipeColourCspInputs);assert.deepEqual(quotas.staticCounts,index.perRecipeStaticAttempts);assert.equal(quotas.total,index.fixedColourInputs);
 assert.equal(audit.status,EARLY_STATIC_REVIEW_STATUS);assert.deepEqual(audit.index,inputIndex);assert.deepEqual(audit.plan,index.plan);assert.deepEqual(audit.errors,[]);
 assert.equal(audit.verifiedCandidates,index.candidates.length);assert.equal(audit.publicClaimsStarted,0);assert.equal(audit.newGameplaySearches,0);
 assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(visual.index,inputIndex);assert.equal(visual.viewedCandidates,index.candidates.length);assert.equal(visual.formalPointerValidation,false);
 const bindings=mergeBindings({},fixed.bindings,audit.fileBindings,visual.fileBindings);
 for(const d of [inputIndex,inputAudit,inputVisual,index.plan,...index.candidates])mergeBindings(bindings,{[d.path]:d.sha256});
 const key=levelSha256({experimentId:EARLY_EXPERIMENT_ID}),claimFile=path.join(EARLY_CONSTRUCTION_LEDGER,key+'.claim.json'),resultFile=path.join(EARLY_CONSTRUCTION_LEDGER,key+'.result.json');
 const claim=await readFile(claimFile,bindings),construction=await readFile(resultFile,bindings);
 assert.deepEqual(claim.plan,index.plan);assert.deepEqual(construction.plan,index.plan);assert.equal(claim.qualificationOnly,false);
 assert.equal(path.resolve(inputIndex.path),path.join(claim.outputDirectory,'index.json'));assert.equal(construction.status,index.status);
 assert.equal(construction.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);assert.deepEqual(construction.constructionFiles,index.attempts.map(a=>a.constructionEvidence));
 assert.equal(bindings[own],sha(await fs.readFile(own)));await checkBindings(bindings);await checkEarlyPrefixHistory(fixed.ledgerSnapshot,{allowedNewFiles:[claimFile,resultFile]});
 const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime,index.executionEnvironment.descriptor),index.executionEnvironment);
 const inputs=[];for(const d of index.candidates){const q=await readBound(d),bp=fixed.blueprints.find(b=>b.recipeId===d.recipeId);assert(bp);
  assert.equal(q.recipeId,bp.recipeId);assert.equal(q.sourceLevelId,bp.sourceLevelId);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.levelSha256,d.levelSha256);
  assert.deepEqual(q.fixedBatchPlan,index.plan);assert.deepEqual(q.prefixDrags,bp.prefixDrags);assert.equal(q.iceDeclaration.count,bp.iceCount);
  assert.equal(q.predeclaredUpperStrategy,'one-thawed-prefix-plain-tail-original-ice-lower');assert.equal(q.redesignOf,bp.failedParent.attemptId);assert(q.inputStaticAudit.passed&&q.prefixAudit.valid&&q.thawedPrefixBridge.valid);
  assert.equal(q.status,'STATIC_EARLY_PREFIX_INPUT_AWAITING_FIRST_PUBLIC_CLAIM');assert.equal(q.accepted,false);assert.equal(q.gameplaySearches,0);
  const plan=makeEarlyFrozenPrefixTailPlan(runtime,q,{floor:31,searchUpper:128,upperBudget:fixed.futureUpperBudget,lowerBudget:fixed.futureLowerBudget});assert.deepEqual(q.predeclaredMathematics,plan);inputs.push({descriptor:d,candidate:q,plan});}
 const executionFile=path.join(EARLY_CONSTRUCTION_LEDGER,levelSha256({experimentId:EARLY_EXPERIMENT_ID})+'.math-execution.json');
 await write(executionFile,{plan:index.plan,index:inputIndex,outputDirectory:output,experimentId:EARLY_EXPERIMENT_ID,retryAllowed:false,startedAt:new Date().toISOString()});
 await fs.mkdir(output,{recursive:false});await write(`${output}/plan.json`,{status:'FIXED_EARLY_PREFIX_TAIL_BATCH_BEFORE_CLAIMS',index:inputIndex,audit:inputAudit,visual:inputVisual,
  batchPlan:index.plan,inputs:inputs.map(x=>({descriptor:x.descriptor,plan:x.plan})),bindings,executionFile,formalReady:false});
 const latestFailure=new Map(fixed.blueprints.map(b=>[b.sourceLevelId,b.failedParent.attemptId])),results=[],accepted=[];
 for(const[i,{descriptor,candidate,plan}]of inputs.entries()){
  await checkBindings(bindings);const redesignOf=latestFailure.get(candidate.sourceLevelId),proof=await exploreEarlyFrozenPrefixTail(runtime,candidate,{plan,redesignOf});
  assert(proof.attempt?.id);assert.equal(proof.catalogEligible,false);assert.equal(proof.formalReady,false);if(!proof.accepted)latestFailure.set(candidate.sourceLevelId,proof.attempt.id);
  const file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;await write(file,{...proof,input:descriptor,batchPlan:index.plan,
   preflightAudit:inputAudit,visualReview:inputVisual,selectionIndexUnchanged:true,admissionStatus:'PURE_ICE_MATH_POOL_NOT_STAGE_OR_STRENGTH_ACCEPTANCE'});
  const row={input:descriptor,file,sha256:sha(await fs.readFile(file)),sourceLevelId:candidate.sourceLevelId,attemptId:proof.attempt.id,redesignOf,
   status:proof.status,accepted:proof.accepted,L:proof.L,U:proof.U,upperSharedWorlds:proof.upperAccounting?.conservativeFullBoardStateUpperBound??null,lowerWorlds:proof.proof?.guardAllowance?.conservativeFullBoardStateUpperBound??null};
  results.push(row);if(row.accepted)accepted.push({path:file,sha256:row.sha256});
  await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:results.length,total:inputs.length,results,mathematicalPoolAccepted:accepted.length,formalReady:false},null,2)+'\n');console.log(JSON.stringify(row));
 }
 await checkBindings(bindings);const completion={status:'FINITE_EARLY_PREFIX_TAIL_BATCH_FINISHED',index:inputIndex,audit:inputAudit,visual:inputVisual,batchPlan:index.plan,
  results,accepted,mathematicalPoolAccepted:accepted.length,selectedCandidatesAdded:0,selectionIndexUnchanged:true,oldMacroActualInputs:58,
  separateExperimentActualInputs:index.fixedColourInputs,catalogEligible:false,formalReady:false};await write(`${output}/completion.json`,completion);return completion;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[p,h,a,ah,v,vh,label]=process.argv.slice(2);await runEarlyPrefixFour({index:{path:p,sha256:h},audit:{path:a,sha256:ah},visual:{path:v,sha256:vh},label});}

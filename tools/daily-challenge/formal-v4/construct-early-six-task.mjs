import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {constructEarlyPrefixStock} from './early-six-task-factory.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {makeEarlyFrozenPrefixTailPlan} from './early-frozen-prefix-tail-task.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';
import {EARLY_PLAN_REVIEW_STATUS,assertEarlyConstructionPlan,recordEarlyColourAttempt,physicalPartition,physicalRetry,realShapeColourChange,
 claimEarlyConstruction,finishEarlyConstruction,auditEarlyPrefixQuotas,checkEarlyPrefixHistory} from './early-six-task-contract.mjs';
import {readBound,write,sha,exists,checkBindings,PUBLIC_LEDGER} from './native-batch-io.mjs';
const own='tools/daily-challenge/formal-v4/construct-early-six-task.mjs';

export function recordFormedEarlySourceInput(history,sourceLevelId,built){
 const previous=history.get(sourceLevelId)??[];
 // A complete plain assignment is real even when the subsequent ice or
 // provided-prefix check fails. Keep it in the next stock's colour history.
 if(built.plain?.level)history.set(sourceLevelId,[...previous,designFingerprints(built.plain.level)]);
 return previous;
}

export async function constructEarlySixTask(planDescriptor,outputDirectory,recipeReview){
 assert(!(await exists(outputDirectory)),'Never restart any partial/finished construction directory');
 const plan=await readBound(planDescriptor);assertEarlyConstructionPlan(plan);
 const reviewed=await readBound(recipeReview);assert.equal(reviewed.status,EARLY_PLAN_REVIEW_STATUS);assert.deepEqual(reviewed.plan,planDescriptor);assert.deepEqual(reviewed.errors,[]);
 assert.equal(reviewed.newConstructions,0);assert.equal(reviewed.newSearches,0);assert.equal(reviewed.fileBindings[own],plan.bindings[own]);
 await checkBindings(reviewed.fileBindings);await checkBindings(plan.bindings);assert.equal(plan.bindings[own],sha(await fs.readFile(own)));
 const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime,plan.executionEnvironment.descriptor),plan.executionEnvironment);
 const selected=await Promise.all(plan.selected.map(d=>readBound(d))),old450=await Promise.all(plan.old450.map(d=>readBound(d)));
 const history=[...await Promise.all([...plan.previousMacro,...plan.comparisonOnly].map(d=>readBound(d))),...plan.previousLateStocks];
 const partitions=new Set([...history,...selected].map(q=>physicalPartition(q.level))),publicRetries=new Set(plan.publicStocks.map(f=>f.retryIdentitySha256)),publicDesigns=new Set(plan.publicStocks.map(f=>f.designSha256));
 const perRecipe=new Map(),sourceShapes=new Map(),previousFullBySource=new Map();
 for(const bp of plan.blueprints){
  const prior=plan.previousLateStocks.filter(q=>q.sourceLevelId===bp.sourceLevelId&&q.reference?.path===bp.reference.path).map(q=>designFingerprints(q.level));
  sourceShapes.set(bp.sourceLevelId,new Set([bp.failedParent.fingerprints.shapeSha256,...prior.map(q=>q.shapeSha256)]));
  previousFullBySource.set(bp.sourceLevelId,prior);
 }
 const attempts=[],inputs=[],eligible=[],rejections={};const reject=(a,reason)=>{a.rejection=reason;rejections[reason]=(rejections[reason]??0)+1;};
 await checkEarlyPrefixHistory(plan.ledgerSnapshot);const executionPolicyObservation=observeExecutionPolicy(plan.executionEnvironment);const claim=await claimEarlyConstruction(planDescriptor,outputDirectory);
 let completionStatus='EARLY_PREFIX_CONSTRUCTION_INTERRUPTED',failureReason=null,currentAttempt=null;
 try{
  await fs.mkdir(outputDirectory,{recursive:false});await write(`${outputDirectory}/execution-start.json`,{plan:planDescriptor,recipeReview,claim,executionPolicyObservation,executionEnvironment:plan.executionEnvironment,formalReady:false});
  for(let i=0;i<plan.maximumStaticPartitionAttempts&&inputs.length<6;i++){
   if(plan.blueprints.every(b=>(perRecipe.get(b.recipeId)??0)>=b.maximumStocks))break;
   const bp=plan.blueprints[i%6],localAttempt=Math.floor(i/6);if((perRecipe.get(bp.recipeId)??0)>=bp.maximumStocks)continue;
   assert(localAttempt<bp.maximumStaticPartitionAttempts);
   const seed=bp.seed+localAttempt*plan.sequence.step;
   const source=runtime.LEVELS.find(l=>l.id===bp.sourceLevelId);
   const geometryFilter=level=>{
    const nearest=rows=>rows.reduce((m,q)=>Math.max(m,compareLayouts(level,q.level).footprintSimilarity),0);
    const similarity={reference:compareLayouts(level,bp.level).footprintSimilarity,source:compareLayouts(level,source).footprintSimilarity,
     selected:nearest(selected),priorMacro:nearest(history),old450:nearest(old450),batch:nearest(eligible)};
    return{similarity,previousPartition:partitions.has(physicalPartition(level)),passed:!partitions.has(physicalPartition(level))&&
     !Object.entries(similarity).some(([k,v])=>v>(k==='source'?.55:k==='old450'?.75:.65)+1e-12)};
   };
   const options={seed,colourSeed:seed,bodyCountDelta:plan.sequence.bodyCountDeltas[localAttempt%plan.sequence.bodyCountDeltas.length],
    forbiddenShapeHashes:[...sourceShapes.get(bp.sourceLevelId)],geometryFilter};
   const a={index:i,localAttempt,recipeId:bp.recipeId,sourceLevelId:bp.sourceLevelId,seed,bodyCountDelta:options.bodyCountDelta,enteredColourCsp:false};currentAttempt=a;
   const built=constructEarlyPrefixStock(runtime,bp,options);a.status=built.status;
   if(built.placeholderWorld){partitions.add(physicalPartition(built.placeholderWorld));sourceShapes.get(bp.sourceLevelId).add(designFingerprints(built.placeholderWorld).shapeSha256);}
   if(built.plain){const file=`${outputDirectory}/plain-construction-${String(i).padStart(4,'0')}.json`;await write(file,built.plain);built.plainConstructionEvidence={path:file,sha256:sha(await fs.readFile(file))};}
   const constructionFile=`${outputDirectory}/construction-${String(i).padStart(4,'0')}.json`;
   await write(constructionFile,{...built,plan:planDescriptor,recipeReview,executionPolicyObservation,options:{seed,colourSeed:seed,bodyCountDelta:options.bodyCountDelta},executionEnvironment:plan.executionEnvironment,currentRuntimeValidationClaimed:false});
   a.constructionEvidence={path:constructionFile,sha256:sha(await fs.readFile(constructionFile))};attempts.push(a);currentAttempt=null;
   a.enteredColourCsp=recordEarlyColourAttempt(perRecipe,bp,built);if(a.enteredColourCsp)inputs.push(a);
   const previous=recordFormedEarlySourceInput(previousFullBySource,bp.sourceLevelId,built);
   if(!built.ok){reject(a,built.status+':'+(built.reason??built.paint?.reason??built.partition?.reason??''));continue;}
   const level=built.level,f=designFingerprints(level);
   if(publicRetries.has(physicalRetry(f))||publicDesigns.has(f.designSha256)||await exists(`${PUBLIC_LEDGER}/identities/${physicalRetry(f)}.json`)||await exists(`${PUBLIC_LEDGER}/${f.designSha256}.request.json`)){reject(a,'previous-public-physical-identity');continue;}
   if(!realShapeColourChange(bp.failedParent.fingerprints,f)||previous.some(p=>!realShapeColourChange(p,f))){reject(a,'same-source-parent-shape-and-colour-not-both-new');continue;}
   assert.equal(boardBaselineSha256(source),boardBaselineSha256(level));assert.deepEqual(level.gates,bp.level.gates);
   const staticAudit=await auditV4StaticCandidate(runtime,{...plan.staticSlot,sourceLevelId:bp.sourceLevelId,level});a.staticAudit=staticAudit;
   if(!staticAudit.passed){reject(a,'full-static-original-ice');continue;}
   const count=built.constructionAccounting;if(count.completeWorldReservations>9998||count.transitions>=10000000||count.microStates>=3000000||count.elapsedMilliseconds>=30000){reject(a,'no-prefix-tail-budget');continue;}
   const packet={...built,recipeId:bp.recipeId,fixedBatchPlan:planDescriptor,constructionEvidence:a.constructionEvidence,sourceLevelSha256:levelSha256(source),
    executionPolicyObservation,executionEnvironment:plan.executionEnvironment.descriptor,inputStaticAudit:staticAudit,redesignOf:bp.failedParent.attemptId,
    branchProvenance:{reference:bp.reference,failedParent:bp.failedParent,previousNewFixedInputs:previous,changesFromAllPreviousSameSourceFixedInputs:true},
    predeclaredUpperStrategy:'one-thawed-prefix-plain-tail-original-ice-lower',gateGeometrySha256:describeLayout(level).gateGeometrySha256,
    status:'STATIC_EARLY_PREFIX_INPUT_AWAITING_FIRST_PUBLIC_CLAIM',accepted:false,catalogEligible:false,formalReady:false,mathematicalEvidenceValidated:false,
    mechanismStrengthValidated:false,designValidated:false,slotAssigned:false,currentRuntimeValidationClaimed:false,gameplaySearches:0};
   try{packet.predeclaredMathematics=makeEarlyFrozenPrefixTailPlan(runtime,packet,{floor:31,searchUpper:128,upperBudget:plan.futureUpperBudget,lowerBudget:plan.futureLowerBudget});}
   catch(e){reject(a,'no-shared-prefix-tail-budget:'+e.message);continue;}
   const file=`${outputDirectory}/candidate-${String(eligible.length).padStart(3,'0')}.json`;await write(file,packet);eligible.push(packet);
   a.candidate={path:file,sha256:sha(await fs.readFile(file)),recipeId:bp.recipeId,sourceLevelId:bp.sourceLevelId,levelSha256:built.levelSha256,prefixSha256:built.prefixSha256};
  }
  await checkBindings(plan.bindings);await checkEarlyPrefixHistory(plan.ledgerSnapshot,{allowedNewFiles:[claim.claimFile]});
  const quotas=auditEarlyPrefixQuotas(plan,attempts);assert.equal(quotas.total,inputs.length);
  const index={schemaVersion:4,status:'EARLY_SIX_TASK_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',plan:planDescriptor,recipeReview,executionPolicyObservation,executionEnvironment:plan.executionEnvironment,
   closedCampaignsExtended:false,separateExperimentActualInputs:inputs.length,maximumSeparateExperimentInputs:6,
   fixedColourInputs:inputs.length,stocksEnteringColourCspIncludingFailed:inputs.length,eligibleInputs:eligible.length,perRecipeColourCspInputs:quotas.cspCounts,perRecipeStaticAttempts:quotas.staticCounts,
   attempts,rejections,candidates:attempts.flatMap(a=>a.candidate?[a.candidate]:[]),gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
  await write(`${outputDirectory}/index.json`,index);completionStatus=index.status;return index;
 }catch(error){failureReason=error.message;if(currentAttempt)await write(`${outputDirectory}/unreturned-attempt-error.json`,{...currentAttempt,status:'STATIC_CALL_EXCEPTION_NO_RETRY',reason:failureReason});throw error;}
 finally{await finishEarlyConstruction(claim,{status:completionStatus,failureReason,executionPolicyObservation,staticAttempts:attempts.length,stocksEnteringColourCspIncludingFailed:inputs.length,
  eligibleInputs:eligible.length,constructionFiles:attempts.map(a=>a.constructionEvidence),gameplaySearches:0});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[out,p,h,r,rh]=process.argv.slice(2);assert(out&&p&&h&&r&&rh);const q=await constructEarlySixTask({path:p,sha256:h},out,{path:r,sha256:rh});console.log(JSON.stringify({status:q.status,inputs:q.fixedColourInputs,eligible:q.eligibleInputs,oldCampaignsExtended:false}));}

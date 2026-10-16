import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {constructEarlyFrozenRegionStock} from './early-frozen-region-factory.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';
import {EARLY_PLAN_REVIEW_STATUS,assertEarlyConstructionPlan,recordEarlyColourAttempt,physicalPartition,physicalRetry,realShapeColourChange,
 claimEarlyConstruction,finishEarlyConstruction} from './early-frozen-construction-contract.mjs';
import {readBound,write,sha,exists,checkBindings,checkLedgerSnapshot,PUBLIC_LEDGER} from './native-batch-io.mjs';
const own='tools/daily-challenge/formal-v4/construct-early-frozen-four.mjs';

export function recordFormedEarlySourceInput(history,sourceLevelId,built){
 const previous=history.get(sourceLevelId)??[];
 // A complete plain assignment is real even when the subsequent ice or
 // provided-prefix check fails. Keep it in the next stock's colour history.
 if(built.plain?.level)history.set(sourceLevelId,[...previous,designFingerprints(built.plain.level)]);
 return previous;
}

export async function constructEarlyFrozenFour(planDescriptor,outputDirectory,recipeReview){
 assert(!(await exists(outputDirectory)),'Never restart any partial/finished construction directory');
 const plan=await readBound(planDescriptor);assertEarlyConstructionPlan(plan);
 const reviewed=await readBound(recipeReview);assert.equal(reviewed.status,EARLY_PLAN_REVIEW_STATUS);assert.deepEqual(reviewed.plan,planDescriptor);assert.deepEqual(reviewed.errors,[]);
 assert.equal(reviewed.newConstructions,0);assert.equal(reviewed.newSearches,0);assert.equal(reviewed.fileBindings[own],plan.bindings[own]);
 await checkBindings(reviewed.fileBindings);await checkBindings(plan.bindings);assert.equal(plan.bindings[own],sha(await fs.readFile(own)));
 const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime,plan.executionEnvironment.descriptor),plan.executionEnvironment);
 const selected=await Promise.all(plan.selected.map(d=>readBound(d))),old450=await Promise.all(plan.old450.map(d=>readBound(d)));
 const history=[...await Promise.all([...plan.previousMacro,...plan.comparisonOnly].map(d=>readBound(d))),...plan.previousLateStocks];
 const partitions=new Set([...history,...selected].map(q=>physicalPartition(q.level))),publicRetries=new Set(plan.publicStocks.map(f=>f.retryIdentitySha256)),publicDesigns=new Set(plan.publicStocks.map(f=>f.designSha256));
 const perRecipe=new Map(),sourceShapes=new Map(plan.blueprints.map(b=>[b.sourceLevelId,new Set([b.failedParent.fingerprints.shapeSha256])])),previousFullBySource=new Map();
 const attempts=[],inputs=[],eligible=[],rejections={};const reject=(a,reason)=>{a.rejection=reason;rejections[reason]=(rejections[reason]??0)+1;};
 await checkLedgerSnapshot(plan.ledgerSnapshot);const claim=await claimEarlyConstruction(planDescriptor,outputDirectory);
 let completionStatus='EARLY_FROZEN_CONSTRUCTION_INTERRUPTED',failureReason=null,currentAttempt=null;
 try{
  await fs.mkdir(outputDirectory,{recursive:false});await write(`${outputDirectory}/execution-start.json`,{plan:planDescriptor,recipeReview,claim,executionEnvironment:plan.executionEnvironment,formalReady:false});
  for(let i=0;i<plan.maximumStaticPartitionAttempts&&inputs.length<4;i++){
   if(plan.blueprints.every(b=>(perRecipe.get(b.recipeId)??0)>=b.maximumStocks))break;
   const bp=plan.blueprints[i%2];if((perRecipe.get(bp.recipeId)??0)>=bp.maximumStocks)continue;
   const seed=plan.sequence.baseSeed+i*plan.sequence.step+bp.sourceLevelId*plan.sequence.sourceFactor;
   const source=runtime.LEVELS.find(l=>l.id===bp.sourceLevelId);
   const geometryFilter=level=>{
    const nearest=rows=>rows.reduce((m,q)=>Math.max(m,compareLayouts(level,q.level).footprintSimilarity),0);
    const similarity={reference:compareLayouts(level,bp.level).footprintSimilarity,source:compareLayouts(level,source).footprintSimilarity,
     selected:nearest(selected),priorMacro:nearest(history),old450:nearest(old450),batch:nearest(eligible)};
    return{similarity,previousPartition:partitions.has(physicalPartition(level)),passed:!partitions.has(physicalPartition(level))&&
     !Object.entries(similarity).some(([k,v])=>v>(k==='source'?.55:k==='old450'?.75:.65)+1e-12)};
   };
   const options={seed,colourSeed:seed,bodyCountDelta:plan.sequence.bodyCountDeltas[Math.floor(i/2)%plan.sequence.bodyCountDeltas.length],
    forbiddenShapeHashes:[...sourceShapes.get(bp.sourceLevelId)],geometryFilter};
   const a={index:i,recipeId:bp.recipeId,sourceLevelId:bp.sourceLevelId,seed,bodyCountDelta:options.bodyCountDelta,enteredColourCsp:false};currentAttempt=a;
   const built=constructEarlyFrozenRegionStock(runtime,bp,options);a.status=built.status;
   if(built.placeholderWorld){partitions.add(physicalPartition(built.placeholderWorld));sourceShapes.get(bp.sourceLevelId).add(designFingerprints(built.placeholderWorld).shapeSha256);}
   if(built.plain){const file=`${outputDirectory}/plain-construction-${String(i).padStart(4,'0')}.json`;await write(file,built.plain);built.plainConstructionEvidence={path:file,sha256:sha(await fs.readFile(file))};}
   const constructionFile=`${outputDirectory}/construction-${String(i).padStart(4,'0')}.json`;
   await write(constructionFile,{...built,plan:planDescriptor,recipeReview,options:{seed,colourSeed:seed,bodyCountDelta:options.bodyCountDelta},executionEnvironment:plan.executionEnvironment,currentRuntimeValidationClaimed:false});
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
   const count=built.constructionAccounting;if(count.completeWorldReservations>9998||count.transitions>=10000000||count.microStates>=3000000||count.elapsedMilliseconds>=30000){reject(a,'no-joint-budget');continue;}
   const packet={...built,recipeId:bp.recipeId,fixedBatchPlan:planDescriptor,constructionEvidence:a.constructionEvidence,sourceLevelSha256:levelSha256(source),
    executionEnvironment:plan.executionEnvironment.descriptor,inputStaticAudit:staticAudit,redesignOf:bp.failedParent.attemptId,
    branchProvenance:{reference:bp.reference,failedParent:bp.failedParent,previousNewFixedInputs:previous,changesFromAllPreviousSameSourceFixedInputs:true},
    predeclaredUpperStrategy:'original-ice-joint',gateGeometrySha256:describeLayout(level).gateGeometrySha256,
    status:'STATIC_EARLY_FROZEN_INPUT_AWAITING_FIRST_PUBLIC_CLAIM',accepted:false,catalogEligible:false,formalReady:false,mathematicalEvidenceValidated:false,
    mechanismStrengthValidated:false,designValidated:false,slotAssigned:false,currentRuntimeValidationClaimed:false,gameplaySearches:0};
   const file=`${outputDirectory}/candidate-${String(eligible.length).padStart(3,'0')}.json`;await write(file,packet);eligible.push(packet);
   a.candidate={path:file,sha256:sha(await fs.readFile(file)),recipeId:bp.recipeId,sourceLevelId:bp.sourceLevelId,levelSha256:built.levelSha256,prefixSha256:built.prefixSha256};
  }
  await checkBindings(plan.bindings);await checkLedgerSnapshot(plan.ledgerSnapshot);
  const index={schemaVersion:4,status:'EARLY_FROZEN_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',plan:planDescriptor,recipeReview,executionEnvironment:plan.executionEnvironment,
   closedMacroActualInputs:58,closedMacroExperimentExtended:false,separateExperimentActualInputs:inputs.length,maximumSeparateExperimentInputs:4,
   fixedColourInputs:inputs.length,stocksEnteringColourCspIncludingFailed:inputs.length,eligibleInputs:eligible.length,perRecipeColourCspInputs:Object.fromEntries(perRecipe),
   attempts,rejections,candidates:attempts.flatMap(a=>a.candidate?[a.candidate]:[]),gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
  await write(`${outputDirectory}/index.json`,index);completionStatus=index.status;return index;
 }catch(error){failureReason=error.message;if(currentAttempt)await write(`${outputDirectory}/unreturned-attempt-error.json`,{...currentAttempt,status:'STATIC_CALL_EXCEPTION_NO_RETRY',reason:failureReason});throw error;}
 finally{await finishEarlyConstruction(claim,{status:completionStatus,failureReason,staticAttempts:attempts.length,stocksEnteringColourCspIncludingFailed:inputs.length,
  eligibleInputs:eligible.length,constructionFiles:attempts.map(a=>a.constructionEvidence),gameplaySearches:0});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[out,p,h,r,rh]=process.argv.slice(2);assert(out&&p&&h&&r&&rh);const q=await constructEarlyFrozenFour({path:p,sha256:h},out,{path:r,sha256:rh});console.log(JSON.stringify({status:q.status,inputs:q.fixedColourInputs,eligible:q.eligibleInputs,oldMacro:58}));}

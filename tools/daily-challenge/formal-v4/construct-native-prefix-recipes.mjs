import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {constructLateRegionStock} from './late-region-gate-aware-factory.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';
import {bodyFootprint} from '../formal-v3/diversity-layout-factory.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {claimLatePrefixPlan,finishLatePrefixPlan} from './late-prefix-plan-ledger.mjs';

const own='tools/daily-challenge/formal-v4/construct-native-prefix-recipes.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=async(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const exists=async file=>fs.stat(file).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const stock=l=>levelSha256(l.blocks.map(bodyFootprint).sort());
const retry=f=>levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
const changed=(a,b)=>{
 const shared=b.colorAssignments.filter(x=>a.colorAssignments.some(y=>x.id===y.id));
 const colours=shared.length?shared.some(x=>a.colorAssignments.some(y=>x.id===y.id&&JSON.stringify(x.colors)!==JSON.stringify(y.colors))):
  levelSha256(a.colorAssignments.map(x=>x.colors).sort())!==levelSha256(b.colorAssignments.map(x=>x.colors).sort());
 return a.shapeSha256!==b.shapeSha256&&a.colorSha256!==b.colorSha256&&colours;
};

async function readBound(descriptor,bindings){
 const file=typeof descriptor==='string'?descriptor:descriptor.path,bytes=await fs.readFile(file),digest=sha(bytes);
 if(typeof descriptor!=='string')assert.equal(digest,descriptor.sha256,`Bound bytes changed: ${file}`);
 if(bindings)bindings[file]=digest;return JSON.parse(bytes);
}
async function assertBindings(bindings){for(const [file,digest]of Object.entries(bindings))assert.equal(sha(await fs.readFile(file)),digest,`Fixed plan changed: ${file}`);}


export function assertNativeRecipePlan(plan){
 assert.equal(plan.version,'late-prefix-native-three-v1');
 assert.equal(plan.maximumFinalColourInputsIncludingRejected,3);assert.equal(plan.maximumStocksEnteringColourCspIncludingFailed,3);
 assert.equal(plan.maximumStaticPartitionAttempts,2000);assert.equal(plan.previousMacro64ActualInputs,49);assert.equal(plan.maximumAfterThisBatch,52);assert.equal(plan.combinedMaximumInputs,64);
 assert.deepEqual(plan.blueprints.map(b=>[b.sourceLevelId,b.prefixDrags.length,b.maximumStocks]),[[198,65,1],[18,49,1],[100,43,1]]);
 assert.equal(new Set(plan.blueprints.map(b=>b.recipeId)).size,3);assert(plan.blueprints.every(b=>typeof b.recipeId==='string'&&b.recipeId.length));
 assert.equal(plan.futureStrategy.tailStrategy,'native');assert.equal(plan.futureStrategy.originalLowerFloor,31);
 assert.equal(plan.futureStrategy.maximumTailCalls,1);assert.equal(plan.futureStrategy.maximumOriginalLowerCalls,1);
 assert.equal(plan.futureStrategy.fullUpperSearchAfterTailFailure,false);
 assert.equal(plan.futureUpperBudget.maxStates,10000);assert.equal(plan.futureLowerBudget.maxStates,9999);
 assert.equal(plan.staticSlot.stageKey,'basic-combined');assert.equal(plan.staticSlot.difficulty,3);
 assert(plan.nativeQualification?.path&&/^[a-f0-9]{64}$/.test(plan.nativeQualification.sha256??''));
 assert.equal(plan.selected.length,147);
 return true;
}

/** Produce up to three new complete colour inputs. A static rejection never
 * gets a second colour pass; every instantiated placeholder and colour branch
 * is retained. No gameplay/model/claim calls occur in this constructor driver. */
export async function constructNativePrefixPlan(planDescriptor,outputDirectory,recipeReview){
 assert(planDescriptor?.path&&/^[a-f0-9]{64}$/.test(planDescriptor.sha256??''),'Fixed plan descriptor with SHA required');
 assert(!(await exists(outputDirectory)),'Never restart a partial or complete static construction batch');
 const plan=await readBound(planDescriptor);assert.equal(plan.version,'late-prefix-native-three-v1');assert.equal(plan.maximumFinalColourInputsIncludingRejected,3);
 assert(recipeReview?.path&&/^[a-f0-9]{64}$/.test(recipeReview.sha256??''),'Independent fixed-recipe review required');
 const reviewed=await readBound(recipeReview);assert.equal(reviewed.status,'INDEPENDENT_NATIVE_RECIPE_PLAN_PASS');
 assert.deepEqual(reviewed.plan,planDescriptor);assert.deepEqual(reviewed.errors,[]);assert.equal(reviewed.recipeCount,3);
 assert.equal(reviewed.newSearches,0);assert.equal(reviewed.newConstructions,0);assert(reviewed.fileBindings?.[own]);
 await assertBindings(reviewed.fileBindings);
 assert.equal(plan.bindings[own],sha(await fs.readFile(own)),'Exact constructor implementation must be fixed before claim');
 assert.equal(plan.maximumStaticPartitionAttempts,2000);assert.equal(plan.previousMacro64ActualInputs,49);
 assert.equal(plan.maximumAfterThisBatch,52);assert.equal(plan.combinedMaximumInputs,64);
 assert.equal(plan.blueprints.length,3);assert.equal(new Set(plan.blueprints.map(b=>b.recipeId)).size,3);
 for(const b of plan.blueprints){assert(b.recipeId);assert.equal(b.maximumStocks,1);}
 assertNativeRecipePlan(plan);
 const nativeQualification=await readBound(plan.nativeQualification);assert.equal(nativeQualification.status,'INDEPENDENT_NATIVE_PREFIX_TAIL_V4_PASS');
 assert.deepEqual(nativeQualification.errors,[]);await assertBindings(nativeQualification.toolBindings);
 assert(nativeQualification.toolBindings?.['tools/daily-challenge/formal-v4/prefix-tail-native-v4.mjs']);
 await assertBindings(plan.bindings);const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime,plan.executionEnvironment.descriptor),plan.executionEnvironment);
 const selected=await Promise.all(plan.selected.map(d=>readBound(d))),old450=await Promise.all(plan.old450.map(d=>readBound(d)));
 const previousMacro=[...await Promise.all(plan.previousMacro.map(async d=>({path:d.path,...await readBound(d)}))),...plan.previousLateStocks];
 const forbiddenShapes=new Set([...plan.sealedFailures.map(x=>x.fingerprints.shapeSha256),...plan.failedParents.map(x=>x.fingerprints.shapeSha256),...previousMacro.map(q=>designFingerprints(q.level).shapeSha256)]);
 // Public history forbids a physical pair/design, not an unrelated stock
 // merely sharing a shape multiset or colour grid. This batch's retained
 // placeholder stocks and the explicit failed-parent chain remain stricter.
 const publicRetries=new Set(plan.publicStocks.map(x=>x.retryIdentitySha256)),publicDesigns=new Set(plan.publicStocks.map(x=>x.designSha256));
 const seenPartitions=new Set([...previousMacro,...selected].map(q=>stock(q.level))),perRecipe=new Map(),previousFullBySource=new Map(),inputs=[],eligible=[],attempts=[],rejections={};
 const reject=(a,reason)=>{a.rejection=reason;rejections[reason]=(rejections[reason]??0)+1;};
 const executionClaim=await claimLatePrefixPlan(planDescriptor,outputDirectory);let completionStatus='CONSTRUCTION_INTERRUPTED_OR_FAILED',failureReason=null;
 try{
 await fs.mkdir(outputDirectory,{recursive:true});await write(`${outputDirectory}/execution-start.json`,{plan:planDescriptor,executionClaim,executionEnvironment:plan.executionEnvironment,startedAt:new Date().toISOString(),formalReady:false});
 for(let index=0;index<plan.maximumStaticPartitionAttempts&&inputs.length<3;index++){
  if(plan.blueprints.every(b=>(perRecipe.get(b.recipeId)??0)>=b.maximumStocks))break;
  const blueprint=plan.blueprints[index%plan.blueprints.length];if((perRecipe.get(blueprint.recipeId)??0)>=blueprint.maximumStocks)continue;
  const seed=plan.sequence.baseSeed+index*plan.sequence.step+blueprint.sourceLevelId*plan.sequence.sourceFactor;
  const geometryFilter=level=>{
   const nearest=rows=>rows.reduce((best,q)=>Math.max(best,compareLayouts(level,q.level).footprintSimilarity),0);
   const source=runtime.LEVELS.find(l=>l.id===blueprint.sourceLevelId);
   const similarity={reference:compareLayouts(level,blueprint.level).footprintSimilarity,source:compareLayouts(level,source).footprintSimilarity,
    selected:nearest(selected),priorMacro:nearest(previousMacro),old450:nearest(old450),newBatch:nearest(eligible)};
   return{similarity,passed:!Object.entries(similarity).some(([key,value])=>value>(key==='source'?.55:key==='old450'?.75:.65)+1e-12),gameplaySearches:0};
  };
  const options={seed,colourSeed:seed,bodyCountDelta:plan.sequence.bodyCountDeltas[Math.floor(index/plan.blueprints.length)%plan.sequence.bodyCountDeltas.length],forbiddenShapeHashes:[...forbiddenShapes],geometryFilter};
  const built=constructLateRegionStock(runtime,blueprint,options),a={index,recipeId:blueprint.recipeId,sourceLevelId:blueprint.sourceLevelId,seed,bodyCountDelta:options.bodyCountDelta,status:built.status};
  if(built.stockFingerprints)forbiddenShapes.add(built.stockFingerprints.shapeSha256);
  const constructionFile=`${outputDirectory}/construction-${String(index).padStart(4,'0')}.json`;
  await write(constructionFile,{...built,plan:planDescriptor,recipeReview,options:{...options,forbiddenShapeHashes:undefined,geometryFilter:undefined},executionEnvironment:plan.executionEnvironment,currentRuntimeValidationClaimed:false,qualificationOnly:false});
  a.constructionEvidence={path:constructionFile,sha256:sha(await fs.readFile(constructionFile))};attempts.push(a);
  if(built.paint){perRecipe.set(blueprint.recipeId,(perRecipe.get(blueprint.recipeId)??0)+1);inputs.push(a);}
  if(!built.ok){reject(a,built.status+':'+(built.paint?.reason??built.partition?.reason??''));continue;}
  assert(built.paint,'Every successful colour stock consumes its single CSP quota');
  const level=built.level,f=designFingerprints(level),previous=previousFullBySource.get(blueprint.sourceLevelId)??[],failedParent=plan.failedParents.find(p=>p.source===blueprint.sourceLevelId);
  previousFullBySource.set(blueprint.sourceLevelId,[...previous,f]);
  if(publicRetries.has(retry(f))||publicDesigns.has(f.designSha256)){reject(a,'previous-public-physical-identity-or-design');continue;}
  if(previous.some(p=>!changed(p,f))||!changed(failedParent.fingerprints,f)){reject(a,'shape-and-actual-colour-not-both-changed-from-prior-source-input');continue;}
  if(plan.sealedFailures.some(row=>row.fingerprints.shapeSha256===f.shapeSha256||row.fingerprints.colorSha256===f.colorSha256)){reject(a,'old-sealed-shape-or-colour-stock');continue;}
  const partition=stock(level);if(seenPartitions.has(partition)){reject(a,'existing-physical-partition');continue;}seenPartitions.add(partition);
  if(await exists(`${PUBLIC_ATTEMPT_LEDGER}/identities/${retry(f)}.json`)||await exists(`${PUBLIC_ATTEMPT_LEDGER}/${f.designSha256}.request.json`)){reject(a,'public-identity-already-attempted');continue;}
  const source=runtime.LEVELS.find(l=>l.id===built.sourceLevelId);assert.equal(boardBaselineSha256(source),boardBaselineSha256(level));
  const nearest=(rows)=>rows.reduce((best,q)=>Math.max(best,compareLayouts(level,q.level).footprintSimilarity),0);
  const similarity={reference:compareLayouts(level,blueprint.level).footprintSimilarity,source:compareLayouts(level,source).footprintSimilarity,
   selected:nearest(selected),priorMacro:nearest(previousMacro),old450:nearest(old450),newBatch:nearest(eligible)};
  a.similarity=similarity;
  if(Object.entries(similarity).some(([key,value])=>value>((key==='source')?.55:key==='old450'?.75:.65)+1e-12)){reject(a,'pairwise-layout-diversity');continue;}
  const staticAudit=await auditV4StaticCandidate(runtime,{...plan.staticSlot,sourceLevelId:built.sourceLevelId,level});a.staticAudit=staticAudit;
  if(!staticAudit.passed){reject(a,'full-static-native-structure');continue;}
  const count=built.constructionAccounting;
  if(count.completeWorldReservations+built.prefixDrags.length+2>=10000||count.microStates>=3000000||count.transitions>=10000000||count.elapsedMilliseconds>=30000){reject(a,'construction-budget-no-tail-reserve');continue;}
  const gateHash=describeLayout(level).gateGeometrySha256;
  const basicMatches=selected.filter(q=>q.stageKey==='basic-combined'&&q.difficulty===3&&describeLayout(q.level).gateGeometrySha256===gateHash).length;
  const packet={...built,recipeId:blueprint.recipeId,predeclaredUpperStrategy:'native',constructionEvidence:a.constructionEvidence,executionEnvironment:plan.executionEnvironment.descriptor,
   fixedBatchPlan:planDescriptor,sourceLevelSha256:levelSha256(source),inputStaticAudit:staticAudit,similarity,redesignOf:failedParent.id,
   branchProvenance:{kind:'new-whole-region-static-branch',reference:blueprint.reference,previousNewFixedInputs:previous,
    failedParent,changesFromAllPreviousSameSourceFixedInputs:true,firstSearchDriverUpdatesToMostRecentFailedInputWithinThisBranch:true,scope300:true},
   status:'STATIC_NEW_PREFIX_TAIL_INPUT_AWAITING_FIRST_PUBLIC_CLAIM',accepted:false,catalogEligible:false,formalReady:false,
   gateGeometry:{sha256:gateHash,currentBasicD3Count:basicMatches,maximumPerFinalGroup:2,basicEligibleBeforeOtherNewAdmissions:basicMatches<2,
    finalAdmissionMustRecountActualSelected:true,notAnAssignedStage:true},
   mathematicalEvidenceValidated:false,currentRuntimeValidationClaimed:false,gameplaySearches:0,fullOriginalUValidated:false};
  const file=`${outputDirectory}/candidate-${String(eligible.length).padStart(3,'0')}.json`;await write(file,packet);eligible.push(packet);
  a.candidate={path:file,sha256:sha(await fs.readFile(file)),recipeId:blueprint.recipeId,sourceLevelId:built.sourceLevelId,levelSha256:built.levelSha256,prefixSha256:routeSha256(built.prefixDrags)};
 }
 await assertBindings(plan.bindings);
 const result={schemaVersion:4,scope:300,status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',plan:planDescriptor,recipeReview,executionEnvironment:plan.executionEnvironment,
  currentRuntimeValidationClaimed:false,attempts,rejections,fixedColourInputs:inputs.length,stocksEnteringColourCspIncludingFailed:inputs.length,eligibleInputs:eligible.length,
  candidates:attempts.flatMap(a=>a.candidate?[a.candidate]:[]),macro64ActualInputsIncludingThis:49+inputs.length,perRecipeColourCspInputs:Object.fromEntries(perRecipe),
  gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
 await write(`${outputDirectory}/index.json`,result);completionStatus=result.status;return result;
 }catch(error){failureReason=error.message;throw error;}
 finally{await finishLatePrefixPlan(executionClaim,{status:completionStatus,failureReason,staticAttempts:attempts.length,stocksEnteringColourCspIncludingFailed:inputs.length,
  eligibleInputs:eligible.length,constructionFiles:attempts.map(a=>a.constructionEvidence),gameplaySearches:0,publicLedgerClaims:0});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [mode,out,planPath,planSha,reviewPath,reviewSha]=process.argv.slice(2);
 if(mode==='construct'){assert(planPath&&/^[a-f0-9]{64}$/.test(planSha??''));const q=await constructNativePrefixPlan({path:planPath,sha256:planSha},out,{path:reviewPath,sha256:reviewSha});console.log(JSON.stringify({status:q.status,inputs:q.fixedColourInputs,eligible:q.eligibleInputs,newSearches:0}));}
 else throw Error('Use construct <fresh-output-directory> <plan-path> <plan-sha> <review-path> <review-sha>. No gameplay search.');
}

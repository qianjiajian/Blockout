import {assertReviewedLowBandQualificationTask as assertReviewedLowBandQualification} from './low-band-task-qualification.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {makeLowBandPrefixTailPlan,exploreLowBandPrefixTail} from './prefix-tail-low-band-task.mjs';
import {assertLowBandBatchPlan as assertNextNativeRecipePlan,assertLowBandBatchIndex as assertNextNativeConstructedIndex,LOW_BAND_BATCH_VERSION as NEXT_NATIVE_PLAN_VERSION,LOW_BAND_BATCH_STATIC_REVIEW_STATUS,assertLowBandInputDiversity,lowBandBranchKey,unclaimedFamilyDisposition,localRepairConstructionFiles as lowBandConstructionFiles} from './local-repair-eighteen-contract.mjs';
import {checkLedgerSnapshot,claimNativeBatchMath,LATE_PREFIX_CONSTRUCTION_LEDGER,mergeBindings} from './low-twenty-io.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';

const own='tools/daily-challenge/formal-v4/run-local-repair-eighteen.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const readBound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));
 const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256,d.path);return JSON.parse(bytes);};
const checkBindings=async bindings=>{for(const [file,digest]of Object.entries(bindings))
 assert.equal(sha(await fs.readFile(file)),digest,`Bound input changed: ${file}`);};
/** Import-safe quota-driven finite batch wrapper. All physical solving remains in the
 * frozen single-candidate low-band API and its same public identity ledger. */
export async function runLocalRepairEighteen({index:inputIndex,audit:inputAudit,visual:inputVisual,label}){
assert(/^[a-z0-9-]+$/.test(label??''),'Unique output label required');
const descriptors={index:inputIndex,audit:inputAudit,visual:inputVisual};
const index=await readBound(descriptors.index),audit=await readBound(descriptors.audit),visual=await readBound(descriptors.visual);
assert.equal(index.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.scope,300);
assert.equal(index.gameplaySearches,0);assert.equal(index.publicLedgerClaims,0);
assert(index.fixedColourInputs>=0&&index.fixedColourInputs<=1000);assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
assert(index.candidates.length<=index.fixedColourInputs);assert.equal(index.eligibleInputs,index.candidates.length);

assert.equal(audit.status,LOW_BAND_BATCH_STATIC_REVIEW_STATUS);assert.deepEqual(audit.index,descriptors.index);
assert.deepEqual(audit.plan,index.plan);assert.deepEqual(audit.errors,[]);assert.equal(audit.verifiedCandidates,index.candidates.length);
assert.equal(audit.publicClaimsStarted,0);assert.equal(audit.newGameplaySearches,0);assert(audit.fileBindings);
assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(visual.index,descriptors.index);
assert.equal(visual.viewedCandidates,index.candidates.length);assert.equal(visual.formalPointerValidation,false);
await checkBindings(audit.fileBindings);await checkBindings(visual.fileBindings);
const fixed=await readBound(index.plan);assert.equal(fixed.version,NEXT_NATIVE_PLAN_VERSION);
assertNextNativeConstructedIndex(index,fixed);
assert.equal(fixed.mathExecutionTool,own);assert.equal(fixed.bindings[own],sha(await fs.readFile(own)),'Exact new batch runner must be bound before construction');
assert.equal(new Set(fixed.blueprints.map(b=>b.recipeId)).size,fixed.blueprints.length);
for(const b of fixed.blueprints){assert(b.maximumStocks>=1);assert((index.perRecipeColourCspInputs[b.recipeId]??0)<=b.maximumStocks);}
assert.equal(Object.values(index.perRecipeColourCspInputs).reduce((sum,n)=>sum+n,0),index.fixedColourInputs);
assert(Object.keys(index.perRecipeColourCspInputs).every(id=>fixed.blueprints.some(b=>b.recipeId===id)));
assert.equal(fixed.futureStrategy.maximumTailCalls,1);assert.equal(fixed.futureStrategy.maximumOriginalLowerCalls,1);
assert.equal(fixed.futureStrategy.fullUpperSearchAfterTailFailure,false);assert.deepEqual(fixed.futureStrategy.originalLowerFloors,{1:16,2:21});
assertNextNativeRecipePlan(fixed);
const qualification=await readBound(fixed.lowBandQualification);await assertReviewedLowBandQualification(qualification);
await checkBindings(fixed.bindings);
await checkLedgerSnapshot(fixed.ledgerSnapshot,{allowedNewFiles:lowBandConstructionFiles(index.plan,fixed.proposal.sha256)});
const runtime=await loadV4Runtime();
assert.deepEqual(prefixExecutionEnvironment(runtime,index.executionEnvironment.descriptor),index.executionEnvironment);
const inputs=[];
for(const descriptor of index.candidates){const candidate=await readBound(descriptor);
 assert.equal(candidate.status,'STATIC_NEW_PREFIX_TAIL_INPUT_AWAITING_FIRST_PUBLIC_CLAIM');
 assert.equal(candidate.levelSha256,levelSha256(candidate.level));assert.equal(candidate.prefixSha256,routeSha256(candidate.prefixDrags));
 assert.equal(candidate.levelSha256,descriptor.levelSha256);assert.equal(candidate.prefixSha256,descriptor.prefixSha256);
 assert.deepEqual(candidate.fixedBatchPlan,index.plan);assert(candidate.inputStaticAudit.passed);
 assert.equal(candidate.gameplaySearches,0);assert.equal(candidate.formalReady,false);
 assert(fixed.failedParents.some(p=>lowBandBranchKey(p)===lowBandBranchKey(candidate)&&p.id===candidate.redesignOf));
 const blueprint=fixed.blueprints.find(b=>b.recipeId===descriptor.recipeId);assert(blueprint);
 assert.equal(candidate.recipeId,blueprint.recipeId);assert.equal(candidate.sourceLevelId,blueprint.sourceLevelId);
 assert.equal(candidate.targetDifficulty,descriptor.targetDifficulty);assert.equal(candidate.targetDifficulty,blueprint.targetDifficulty);assert.equal(candidate.branchId,blueprint.branchId);assert.equal(candidate.predeclaredUpperStrategy,'plain-joint-low-band');assert.deepEqual(candidate.prefixDrags,blueprint.prefixDrags);assert.deepEqual(candidate.level.gates,blueprint.level.gates);
 const plan=makeLowBandPrefixTailPlan(runtime,candidate,{upperBudget:fixed.futureUpperBudget,lowerBudget:fixed.futureLowerBudget,targetDifficulty:candidate.targetDifficulty});
 assert.equal(plan.floor,candidate.targetDifficulty===1?16:21);assert.equal(plan.totalUpperLimit,candidate.targetDifficulty===1?20:30);assert.equal(plan.tailParkingLimit,plan.totalUpperLimit-candidate.prefixDrags.filter(d=>!d.exitSide).length);assert.equal(plan.fullUpperBudget.maxMilliseconds,30000);assert.equal(plan.lowerBudget.maxMilliseconds,30000);
 inputs.push({descriptor,candidate,plan});
}
assertLowBandInputDiversity(inputs.map(x=>({...designFingerprints(x.candidate.level),key:lowBandBranchKey(x.candidate)})));
const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const bindings=mergeBindings({},fixed.bindings,audit.fileBindings,visual.fileBindings,qualification.toolBindings);
for(const d of [...Object.values(descriptors),index.plan,fixed.lowBandQualification,...index.candidates])mergeBindings(bindings,{[d.path]:d.sha256});
for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),h=sha(await fs.readFile(file));
 if(bindings[p])assert.equal(bindings[p],h,`Compiled input changed: ${p}`);bindings[p]=h;}
const output=`deliverables/daily-formal-v4-20261008/design/${label}`;
const executionPolicyObservation=observeExecutionPolicy();
const mathExecutionClaim=await claimNativeBatchMath(index.plan,output);
await fs.mkdir(output,{recursive:false});
await write(`${output}/plan.json`,{status:'FIXED_FIRST_LOW_BAND_PREFIX_TAIL_BATCH_BEFORE_PUBLIC_CLAIMS',descriptors,batchPlan:index.plan,
 inputs:inputs.map(({descriptor,plan})=>({descriptor,plan})),bindings,mathExecutionClaim,executionPolicyObservation,executionEnvironment:index.executionEnvironment,
 budgetMeaning:'Prior complete construction worlds plus known prefix plus one tail and terminal reservation <=10000; original lower independently <=10000.',
 originalLowerOnlyAfterCompleteFullU:true,secondStrategyAllowed:false,secondBandAllowed:false,
 currentRuntimeValidationClaimed:false,catalogEligible:false,formalReady:false,productionChanged:false});
const latestFailure=new Map(fixed.failedParents.map(p=>[lowBandBranchKey(p),p.id])),results=[],accepted=[],familySuccesses=[];
for(const [i,{descriptor,candidate,plan}]of inputs.entries()){
 await checkBindings(bindings);
 const skip=unclaimedFamilyDisposition(candidate,familySuccesses);
 if(skip){
  const file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;
  await write(file,{...skip,input:descriptor,batchPlan:index.plan,levelSha256:candidate.levelSha256,sourceLevelId:candidate.sourceLevelId,targetDifficulty:candidate.targetDifficulty,branchId:candidate.branchId,L:null,U:null,attempt:null,formalReady:false,selectionIndexUnchanged:true});
  results.push({input:descriptor.path,file,sha256:sha(await fs.readFile(file)),sourceLevelId:candidate.sourceLevelId,targetDifficulty:candidate.targetDifficulty,branchId:candidate.branchId,...skip,L:null,U:null,attemptId:null});
  await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:results.length,total:inputs.length,results,mathematicalPoolAccepted:accepted.length,publicClaimsStarted:results.filter(r=>r.attemptId).length,formalReady:false},null,2)+'\n');continue;
 }
 const redesignOf=latestFailure.get(lowBandBranchKey(candidate));assert(redesignOf);
 const proof=await exploreLowBandPrefixTail(runtime,candidate,{plan,redesignOf});
 assert(proof.attempt?.id);assert.equal(proof.catalogEligible,false);assert.equal(proof.formalReady,false);
 if(!proof.accepted)latestFailure.set(lowBandBranchKey(candidate),proof.attempt.id);
 const record={...proof,input:descriptor,batchPlan:index.plan,batchExecutionPlan:`${output}/plan.json`,
  preflightAudit:descriptors.audit,visualReview:descriptors.visual,selectionIndexUnchanged:true,
  admissionStatus:'MATHEMATICAL_POOL_ONLY_REQUIRES_INDEPENDENT_DESIGN_AND_SLOT_ADMISSION'};
 const file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;await write(file,record);
 const row={input:descriptor.path,file,sha256:sha(await fs.readFile(file)),sourceLevelId:candidate.sourceLevelId,targetDifficulty:candidate.targetDifficulty,branchId:candidate.branchId,
  attemptId:proof.attempt.id,redesignOf,status:proof.status,accepted:proof.accepted,L:proof.L,U:proof.U,
  upperWorlds:proof.upperAccounting?.conservativeFullBoardStateUpperBound??null,
  lowerWorlds:proof.lowerBound?.result?.guardAllowance?.conservativeFullBoardStateUpperBound??null};
 results.push(row);if(proof.accepted){accepted.push({path:file,sha256:row.sha256});familySuccesses.push({branchId:candidate.branchId,level:candidate.level,input:{path:file,sha256:row.sha256}});}
 await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:results.length,total:inputs.length,results,
  mathematicalPoolAccepted:accepted.length,formalReady:false},null,2)+'\n');
 console.log(JSON.stringify(row));
}
await checkBindings(bindings);
await write(`${output}/completion.json`,{status:'FINITE_FIRST_PREFIX_TAIL_BATCH_FINISHED',descriptors,batchPlan:index.plan,results,
 accepted,mathematicalPoolAccepted:accepted.length,publicClaimsStarted:results.filter(r=>r.attemptId).length,unclaimedSkipped:results.filter(r=>!r.attemptId).length,selectedCandidatesAdded:0,selectionIndexUnchanged:true,
 currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false});
console.log(JSON.stringify({output,mathematicalPoolAccepted:accepted.length,selectedCandidatesAdded:0,formalReady:false}));

return {output,mathematicalPoolAccepted:accepted.length,selectedCandidatesAdded:0,formalReady:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [indexPath,indexSha,auditPath,auditSha,visualPath,visualSha,label]=process.argv.slice(2);
 await runLocalRepairEighteen({index:{path:indexPath,sha256:indexSha},audit:{path:auditPath,sha256:auditSha},visual:{path:visualPath,sha256:visualSha},label});
}

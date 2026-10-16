import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {makeNative120PrefixTailV4Plan as makeNativePrefixTailV4Plan,exploreNative120PrefixTailV4 as exploreNativePrefixTailV4} from './prefix-tail-native-120-v4-v2.mjs';
import {assertNativeBatchPlan as assertNextNativeRecipePlan,assertNativeBatchIndex as assertNextNativeConstructedIndex,NATIVE_BATCH_VERSION as NEXT_NATIVE_PLAN_VERSION,NATIVE_BATCH_STATIC_REVIEW_STATUS} from './native-batch-contract.mjs';
import {checkLedgerSnapshot,claimNativeBatchMath,LATE_PREFIX_CONSTRUCTION_LEDGER,mergeBindings,assertReviewedNativeQualification} from './native-batch-io.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';

const own='tools/daily-challenge/formal-v4/run-native-batch.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const readBound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));
 const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256,d.path);return JSON.parse(bytes);};
const checkBindings=async bindings=>{for(const [file,digest]of Object.entries(bindings))
 assert.equal(sha(await fs.readFile(file)),digest,`Bound input changed: ${file}`);};
/** Import-safe quota-driven finite batch wrapper. All physical solving remains in the
 * frozen single-candidate native API and its same public identity ledger. */
export async function runNativeBatch({index:inputIndex,audit:inputAudit,visual:inputVisual,label}){
assert(/^[a-z0-9-]+$/.test(label??''),'Unique output label required');
const descriptors={index:inputIndex,audit:inputAudit,visual:inputVisual};
const index=await readBound(descriptors.index),audit=await readBound(descriptors.audit),visual=await readBound(descriptors.visual);
assert.equal(index.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.scope,300);
assert.equal(index.gameplaySearches,0);assert.equal(index.publicLedgerClaims,0);
assert(index.fixedColourInputs>=0&&index.fixedColourInputs<=64);assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
assert(index.candidates.length<=index.fixedColourInputs);assert.equal(index.eligibleInputs,index.candidates.length);

assert.equal(audit.status,NATIVE_BATCH_STATIC_REVIEW_STATUS);assert.deepEqual(audit.index,descriptors.index);
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
assert.equal(fixed.futureStrategy.fullUpperSearchAfterTailFailure,false);assert.equal(fixed.futureStrategy.originalLowerFloor,31);
assertNextNativeRecipePlan(fixed);
const qualification=await readBound(fixed.nativeQualification);await assertReviewedNativeQualification(qualification);
await checkBindings(fixed.bindings);
await checkLedgerSnapshot(fixed.ledgerSnapshot,{allowedNewFiles:[`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${index.plan.sha256}.claim.json`,`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${index.plan.sha256}.result.json`]});
const runtime=await loadV4Runtime();
assert.deepEqual(prefixExecutionEnvironment(runtime,index.executionEnvironment.descriptor),index.executionEnvironment);
const inputs=[];
for(const descriptor of index.candidates){const candidate=await readBound(descriptor);
 assert.equal(candidate.status,'STATIC_NEW_PREFIX_TAIL_INPUT_AWAITING_FIRST_PUBLIC_CLAIM');
 assert.equal(candidate.levelSha256,levelSha256(candidate.level));assert.equal(candidate.prefixSha256,routeSha256(candidate.prefixDrags));
 assert.equal(candidate.levelSha256,descriptor.levelSha256);assert.equal(candidate.prefixSha256,descriptor.prefixSha256);
 assert.deepEqual(candidate.fixedBatchPlan,index.plan);assert(candidate.inputStaticAudit.passed);
 assert.equal(candidate.gameplaySearches,0);assert.equal(candidate.formalReady,false);
 assert(fixed.failedParents.some(p=>p.source===candidate.sourceLevelId&&p.id===candidate.redesignOf));
 const blueprint=fixed.blueprints.find(b=>b.recipeId===descriptor.recipeId);assert(blueprint);
 assert.equal(candidate.recipeId,blueprint.recipeId);assert.equal(candidate.sourceLevelId,blueprint.sourceLevelId);
 assert.equal(candidate.predeclaredUpperStrategy,'native-120');assert.deepEqual(candidate.prefixDrags,blueprint.prefixDrags);
 const plan=makeNativePrefixTailV4Plan(runtime,candidate,{upperBudget:fixed.futureUpperBudget,lowerBudget:fixed.futureLowerBudget,floor:31});
 assert.equal(plan.innerPlan.tailStrategy,'native');assert.equal(plan.floor,31);assert.equal(plan.fullUpperBudget.maxMilliseconds,120000);assert.equal(plan.lowerBudget.maxMilliseconds,30000);assert.equal(plan.lowerToolchainSha256,runtime.toolchainSha256);
 inputs.push({descriptor,candidate,plan});
}
for(const key of ['shapeSha256','colorSha256','designSha256'])
 assert.equal(new Set(inputs.map(x=>designFingerprints(x.candidate.level)[key])).size,inputs.length,`Distinct ${key}`);
const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const bindings=mergeBindings({},fixed.bindings,audit.fileBindings,visual.fileBindings,qualification.fileBindings);
for(const d of [...Object.values(descriptors),index.plan,fixed.nativeQualification,...index.candidates])mergeBindings(bindings,{[d.path]:d.sha256});
for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),h=sha(await fs.readFile(file));
 if(bindings[p])assert.equal(bindings[p],h,`Compiled input changed: ${p}`);bindings[p]=h;}
const output=`deliverables/daily-formal-v4-20261008/design/${label}`;
const mathExecutionClaim=await claimNativeBatchMath(index.plan,output);
await fs.mkdir(output,{recursive:false});
await write(`${output}/plan.json`,{status:'FIXED_FIRST_NATIVE_PREFIX_TAIL_BATCH_BEFORE_PUBLIC_CLAIMS',descriptors,batchPlan:index.plan,
 inputs:inputs.map(({descriptor,plan})=>({descriptor,plan})),bindings,mathExecutionClaim,executionEnvironment:index.executionEnvironment,
 budgetMeaning:'Prior complete construction worlds plus known prefix plus one tail and terminal reservation <=10000; original lower independently <=10000.',
 originalLowerOnlyAfterCompleteFullU:true,secondStrategyAllowed:false,secondBandAllowed:false,
 currentRuntimeValidationClaimed:false,catalogEligible:false,formalReady:false,productionChanged:false});
const latestFailure=new Map(fixed.failedParents.map(p=>[p.source,p.id])),results=[],accepted=[];
for(const [i,{descriptor,candidate,plan}]of inputs.entries()){
 await checkBindings(bindings);
 const redesignOf=latestFailure.get(candidate.sourceLevelId);assert(redesignOf);
 const proof=await exploreNativePrefixTailV4(runtime,candidate,{plan,redesignOf});
 assert(proof.attempt?.id);assert.equal(proof.catalogEligible,false);assert.equal(proof.formalReady,false);
 if(!proof.accepted)latestFailure.set(candidate.sourceLevelId,proof.attempt.id);
 const record={...proof,input:descriptor,batchPlan:index.plan,batchExecutionPlan:`${output}/plan.json`,
  preflightAudit:descriptors.audit,visualReview:descriptors.visual,selectionIndexUnchanged:true,
  admissionStatus:'MATHEMATICAL_POOL_ONLY_REQUIRES_INDEPENDENT_DESIGN_AND_SLOT_ADMISSION'};
 const file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;await write(file,record);
 const row={input:descriptor.path,file,sha256:sha(await fs.readFile(file)),sourceLevelId:candidate.sourceLevelId,
  attemptId:proof.attempt.id,redesignOf,status:proof.status,accepted:proof.accepted,L:proof.L,U:proof.U,
  upperWorlds:proof.upperAccounting?.conservativeFullBoardStateUpperBound??null,
  lowerWorlds:proof.lowerBound?.result?.guardAllowance?.conservativeFullBoardStateUpperBound??null};
 results.push(row);if(proof.accepted)accepted.push({path:file,sha256:row.sha256});
 await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:results.length,total:inputs.length,results,
  mathematicalPoolAccepted:accepted.length,formalReady:false},null,2)+'\n');
 console.log(JSON.stringify(row));
}
await checkBindings(bindings);
await write(`${output}/completion.json`,{status:'FINITE_FIRST_PREFIX_TAIL_BATCH_FINISHED',descriptors,batchPlan:index.plan,results,
 accepted,mathematicalPoolAccepted:accepted.length,selectedCandidatesAdded:0,selectionIndexUnchanged:true,
 currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false});
console.log(JSON.stringify({output,mathematicalPoolAccepted:accepted.length,selectedCandidatesAdded:0,formalReady:false}));

return {output,mathematicalPoolAccepted:accepted.length,selectedCandidatesAdded:0,formalReady:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [indexPath,indexSha,auditPath,auditSha,visualPath,visualSha,label]=process.argv.slice(2);
 await runNativeBatch({index:{path:indexPath,sha256:indexSha},audit:{path:auditPath,sha256:auditSha},visual:{path:visualPath,sha256:visualSha},label});
}

import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {makeLowBandPrefixTailPlan,exploreLowBandPrefixTail} from './prefix-tail-low-band.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';

const own='tools/daily-challenge/formal-v4/run-low-band-prefix-plan.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const readBound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));
 const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256,d.path);return JSON.parse(bytes);};
const checkBindings=async bindings=>{for(const [file,digest]of Object.entries(bindings))
 assert.equal(sha(await fs.readFile(file)),digest,`Bound input changed: ${file}`);};
const [indexPath,indexSha,auditPath,auditSha,visualPath,visualSha,qualificationPath,qualificationSha,label]=process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(label??''),'Unique output label required');
const descriptors={index:{path:indexPath,sha256:indexSha},audit:{path:auditPath,sha256:auditSha},visual:{path:visualPath,sha256:visualSha},qualification:{path:qualificationPath,sha256:qualificationSha}};
const qualification=await readBound(descriptors.qualification);
assert.equal(qualification.status,'INDEPENDENT_LOW_BAND_PREFIX_TAIL_PASS');assert.deepEqual(qualification.errors,[]);
assert(qualification.toolBindings?.['tools/daily-challenge/formal-v4/prefix-tail-low-band.mjs']);
await checkBindings(qualification.toolBindings);
const index=await readBound(descriptors.index),audit=await readBound(descriptors.audit),visual=await readBound(descriptors.visual);
assert.equal(index.status,'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.scope,300);
assert.equal(index.gameplaySearches,0);assert.equal(index.publicLedgerClaims,0);
assert(index.fixedColourInputs>=1&&index.fixedColourInputs<=16);assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
assert(index.candidates.length>=1&&index.candidates.length<=index.fixedColourInputs);assert.equal(index.eligibleInputs,index.candidates.length);
assert.equal(index.macro64ActualInputsIncludingThis,33+index.fixedColourInputs);
assert.equal(audit.status,'INDEPENDENT_LOW_BAND_PREFIX_STATIC_PASS');assert.deepEqual(audit.index,descriptors.index);
assert.deepEqual(audit.plan,index.plan);assert.deepEqual(audit.errors,[]);assert.equal(audit.verifiedCandidates,index.candidates.length);
assert.equal(audit.publicClaimsStarted,0);assert.equal(audit.newGameplaySearches,0);assert(audit.fileBindings);
assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(visual.index,descriptors.index);
assert.equal(visual.viewedCandidates,index.candidates.length);assert.equal(visual.formalPointerValidation,false);
await checkBindings(audit.fileBindings);await checkBindings(visual.fileBindings);
const fixed=await readBound(index.plan);assert.equal(fixed.version,'late-prefix-low-band-sixteen-v1');
assert.equal(fixed.maximumStocksEnteringColourCspIncludingFailed,16);assert.equal(fixed.previousMacro64ActualInputs,33);
assert.equal(fixed.maximumAfterThisBatch,49);assert.equal(fixed.blueprints.length,11);
assert.equal(new Set(fixed.blueprints.map(b=>b.recipeId)).size,11);
for(const b of fixed.blueprints){assert([1,2].includes(b.targetDifficulty));assert.equal(b.maximumStocks,b.targetDifficulty===1?1:2);
 assert((index.perRecipeColourCspInputs[b.recipeId]??0)<=b.maximumStocks);}
assert.equal(Object.values(index.perRecipeColourCspInputs).reduce((sum,n)=>sum+n,0),index.fixedColourInputs);
assert(Object.keys(index.perRecipeColourCspInputs).every(id=>fixed.blueprints.some(b=>b.recipeId===id)));
assert.equal(fixed.futureStrategy.maximumTailCalls,1);assert.equal(fixed.futureStrategy.maximumOriginalLowerCalls,1);
assert.equal(fixed.futureStrategy.fullUpperSearchAfterTailFailure,false);
await checkBindings(fixed.bindings);
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
 assert.equal(candidate.targetDifficulty,descriptor.targetDifficulty);assert.equal(candidate.targetDifficulty,blueprint.targetDifficulty);
 assert.equal(candidate.sourceLevelId,blueprint.sourceLevelId);assert.equal(candidate.recipeId,blueprint.recipeId);
 const plan=makeLowBandPrefixTailPlan(runtime,candidate,{upperBudget:fixed.futureUpperBudget,lowerBudget:fixed.futureLowerBudget,targetDifficulty:candidate.targetDifficulty});
 assert.equal(plan.floor,candidate.targetDifficulty===1?16:21);assert.equal(plan.totalUpperLimit,candidate.targetDifficulty===1?20:30);
 assert.equal(plan.tailParkingLimit,plan.totalUpperLimit-candidate.prefixDrags.filter(d=>!d.exitSide).length);
 inputs.push({descriptor,candidate,plan});
}
for(const key of ['shapeSha256','colorSha256','designSha256'])
 assert.equal(new Set(inputs.map(x=>designFingerprints(x.candidate.level)[key])).size,inputs.length,`Distinct ${key}`);
const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const bindings={...fixed.bindings,...audit.fileBindings,...visual.fileBindings,...qualification.toolBindings};
for(const d of [...Object.values(descriptors),index.plan,...index.candidates])bindings[d.path]=d.sha256;
for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),h=sha(await fs.readFile(file));
 if(bindings[p])assert.equal(bindings[p],h,`Compiled input changed: ${p}`);bindings[p]=h;}
const output=`deliverables/daily-formal-v4-20261008/design/${label}`;
await fs.mkdir(output,{recursive:false});
await write(`${output}/plan.json`,{status:'FIXED_FIRST_LOW_BAND_PREFIX_TAIL_BATCH_BEFORE_PUBLIC_CLAIMS',descriptors,batchPlan:index.plan,
 inputs:inputs.map(({descriptor,plan})=>({descriptor,plan})),bindings,executionEnvironment:index.executionEnvironment,
 budgetMeaning:'Prior complete construction worlds plus known prefix plus one tail and terminal reservation <=10000; original lower independently <=10000.',
 originalLowerOnlyAfterCompleteFullU:true,secondStrategyAllowed:false,secondBandAllowed:false,
 currentRuntimeValidationClaimed:false,catalogEligible:false,formalReady:false,productionChanged:false});
const latestFailure=new Map(fixed.failedParents.map(p=>[p.source,p.id])),results=[],accepted=[];
for(const [i,{descriptor,candidate,plan}]of inputs.entries()){
 await checkBindings(bindings);
 const redesignOf=latestFailure.get(candidate.sourceLevelId);assert(redesignOf);
 const proof=await exploreLowBandPrefixTail(runtime,candidate,{plan,redesignOf});
 assert(proof.attempt?.id);assert.equal(proof.catalogEligible,false);assert.equal(proof.formalReady,false);
 if(!proof.accepted)latestFailure.set(candidate.sourceLevelId,proof.attempt.id);
 const record={...proof,input:descriptor,batchPlan:index.plan,batchExecutionPlan:`${output}/plan.json`,
  preflightAudit:descriptors.audit,visualReview:descriptors.visual,selectionIndexUnchanged:true,
  admissionStatus:'MATHEMATICAL_POOL_ONLY_REQUIRES_INDEPENDENT_DESIGN_AND_SLOT_ADMISSION'};
 const file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;await write(file,record);
 const row={input:descriptor.path,file,sha256:sha(await fs.readFile(file)),sourceLevelId:candidate.sourceLevelId,targetDifficulty:candidate.targetDifficulty,
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

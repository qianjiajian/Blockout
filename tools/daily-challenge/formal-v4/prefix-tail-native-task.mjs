import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {createAttemptLedger,boundedBudget} from '../formal-v3/bounded-proof.mjs';
import {guardedPlainTask,reservedGuardBudget} from '../formal-v3/reserved-guard-budget.mjs';
import {prefixTailPlan,constructPrefixTailUpper} from '../formal-v3/design-prefix-tail-upper-v2.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';

export const NATIVE_PREFIX_TAIL_TASK_VERSION='new-rectangle-stock-fixed-prefix-one-native-tail-d2d3-task-v1';
const own='tools/daily-challenge/formal-v4/prefix-tail-native-task.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const DEFAULT_UPPER={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000};
const DEFAULT_LOWER={...DEFAULT_UPPER,maxStates:9999};
export const NATIVE_TARGET_BANDS=Object.freeze({2:Object.freeze({floor:21,upper:30}),3:Object.freeze({floor:31,upper:null})});
export function nativeTargetBand(targetDifficulty){
 assert(Number.isSafeInteger(targetDifficulty)&&Object.hasOwn(NATIVE_TARGET_BANDS,targetDifficulty),'Native production target must be D2 or D3');
 return NATIVE_TARGET_BANDS[targetDifficulty];
}
/** The first complete native witness is terminal if outside its fixed band.
 * A callback only dispatches the unchanged original lower primitive; no search
 * or continuation is hidden in this band gate. Qualification uses the same bands. */
export function nativeOriginalLowerStage(U,targetDifficulty,lowerTask){
 assert(Number.isSafeInteger(U)&&U>=0,'Complete U must be a finite parking count');const band=nativeTargetBand(targetDifficulty);
 if(U<band.floor)return{status:'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR',lower:null};
 if(band.upper!==null&&U>band.upper)return{status:'KNOWN_UPPER_ABOVE_PREDECLARED_CEILING',lower:null};
 assert.equal(typeof lowerTask,'function');return{status:'ORIGINAL_LOWER_REQUESTED',lower:lowerTask()};
}

function stockDomain(level){
 assertPlainProofDomain(level);
 for(const body of level.blocks){const w=Math.max(...body.shape.map(p=>p[0]))+1,h=Math.max(...body.shape.map(p=>p[1]))+1;
  assert.equal(new Set(body.shape.map(p=>p.join(','))).size,w*h,'Reviewed new tail stock uses solid original-orientation rectangles only');}
}

/** No search or model mutation. Reserve all pre-U full assignments, every
 * supplied prefix commit and the frozen engine's terminal candidate together.
 * The original lower task has its own independently declared <=10000 budget. */
export function makeNativeTaskPrefixTailPlan(runtime,candidate,{upperBudget={},lowerBudget={},targetDifficulty,qualificationOnly=false}={}){
 assertV4Runtime(runtime);assert.equal(typeof qualificationOnly,'boolean');
 const executionEnvironment=prefixExecutionEnvironment(runtime,candidate.executionEnvironment);
 const band=nativeTargetBand(targetDifficulty),floor=band.floor;
 const {level,prefixDrags,constructionAccounting}=candidate;stockDomain(level);
 assert(candidate.constructionEvidence?.path&&/^[a-f0-9]{64}$/.test(candidate.constructionEvidence.sha256??''),'Bound actual prior construction file required');
 assert(Array.isArray(prefixDrags)&&prefixDrags.length>0);assert(constructionAccounting?.version==='late-region-static-construction-v1');
 for(const key of ['completeWorldReservations','microStates','transitions','elapsedMilliseconds'])
  assert(Number.isSafeInteger(constructionAccounting[key])&&constructionAccounting[key]>=0,`Finite prior construction ${key}`);
 assert(constructionAccounting.completeWorldReservations>=1,'The full new coloured stock must be charged');
 const fullUpperBudget=boundedBudget({...DEFAULT_UPPER,...upperBudget}),lower=reservedGuardBudget({...DEFAULT_LOWER,...lowerBudget});
 const prior=constructionAccounting;
 const remaining={...fullUpperBudget,maxStates:fullUpperBudget.maxStates-prior.completeWorldReservations,
  maxMicroStates:fullUpperBudget.maxMicroStates-prior.microStates,maxTransitions:fullUpperBudget.maxTransitions-prior.transitions,
  maxMilliseconds:fullUpperBudget.maxMilliseconds-prior.elapsedMilliseconds};
 const innerPlan=prefixTailPlan(level,prefixDrags,{upperBudget:remaining,lowerBudget:lower,floor,tailStrategy:'native',searchUpper:128});
 return{schemaVersion:4,version:NATIVE_PREFIX_TAIL_TASK_VERSION,qualificationOnly,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags),
  sourceLevelId:candidate.sourceLevelId,targetDifficulty,band:{...band},floor,executionEnvironment,currentRuntimeValidationClaimed:false,
  policyReviewedAtPreparation:executionEnvironment.policyReviewedAtPreparation,historicalDesignPolicy:executionEnvironment.historicalDesignPolicy,mathematicalContract:executionEnvironment.mathematicalContract,
  sourceLevelSha256:qualificationOnly?null:levelSha256(runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId)),
  constructionAccounting:structuredClone(prior),constructionEvidence:structuredClone(candidate.constructionEvidence),fullUpperBudget,lowerBudget:lower,innerPlan,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,toolchainSha256:runtime.toolchainSha256,
  upperTask:'one-known-prefix-then-one-declared-native-tail-search',lowerTask:'one-original-full-level-threshold-after-valid-U',
  tailSearchesMaximum:1,alternativePrefixOrFullUpperSearchAllowed:false,failedInputContinuationAllowed:false,
  nativeTailHasNoParkingCeiling:true,completeOriginalUpperCeiling:band.upper,witnessOptimalityClaimed:false,bandChangeAfterClaimAllowed:false,formalReady:false};
}

/** New physical inputs only. One public claim binds the complete opening;
 * the smaller tail is never claimed and never supplies a lower certificate.
 * A failed U immediately seals that opening without trying its original L. */
export async function exploreNativeTaskPrefixTail(runtime,candidate,{plan,redesignOf,qualificationOnly=false,ledgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 assertV4Runtime(runtime);
 assert.equal(typeof qualificationOnly,'boolean');
 await assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,ledgerDirectory);
 if(!qualificationOnly)assert.equal(path.resolve(ledgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER),'Production uses shared public identity ledger');
 else{const target=path.resolve(ledgerDirectory).toLowerCase(),production=path.resolve(PUBLIC_ATTEMPT_LEDGER).toLowerCase();
  assert(target!==production&&!target.startsWith(production+path.sep),'Qualification must use an isolated private ledger outside public history');}
 assert(plan,'Exact plan must be fixed before first claim');assert.equal(plan.qualificationOnly,qualificationOnly);
 const expected=makeNativeTaskPrefixTailPlan(runtime,candidate,{upperBudget:plan.fullUpperBudget,lowerBudget:plan.lowerBudget,targetDifficulty:plan.targetDifficulty,qualificationOnly});
 assert.deepEqual(plan,expected,'Declared plan changed');
 const level=structuredClone(candidate.level),prefixDrags=structuredClone(candidate.prefixDrags);
 const priorBytes=await fs.readFile(plan.constructionEvidence.path);assert.equal(sha(priorBytes),plan.constructionEvidence.sha256,'Prior construction bytes changed');
 const prior=JSON.parse(priorBytes);assert.equal(prior.levelSha256,levelSha256(prior.level));assert.equal(prior.levelSha256,plan.levelSha256);
 assert.equal(routeSha256(prior.prefixDrags),plan.prefixSha256);assert.deepEqual(prior.constructionAccounting,plan.constructionAccounting);
 assert.equal(prior.sourceLevelId,plan.sourceLevelId);
 const currentSourceBinding=await currentMainlineSourceBinding(runtime,plan.executionEnvironment,candidate.sourceLevelId,{qualificationOnly});
 if(!qualificationOnly)assert.equal(currentSourceBinding.sourceLevelSha256,plan.sourceLevelSha256);
 if(!qualificationOnly){const source=runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId);assert(source,'Normal mainline source required');
  assert.equal(boardBaselineSha256(level),boardBaselineSha256(source),'Source normal mask must remain');}
 const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const bindings={...runtime.toolchainBindings,[runtime.policyRuntimeBinding.path]:runtime.policyRuntimeBinding.sha256,
  ...plan.executionEnvironment.bindings,...currentSourceBinding.bindings};
 for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),digest=sha(await fs.readFile(p));if(bindings[p])assert.equal(bindings[p],digest,'Conflicting compiled dependency: '+p);bindings[p]=digest;}
 for(const [file,digest]of Object.entries(runtime.toolchainBindings))assert.equal(sha(await fs.readFile(file)),digest);
 // Current scope authorizes this execution; mutable root policy is not a mathematical identity binding.
 const executionPolicyObservation=observeExecutionPolicy(plan.executionEnvironment);
 const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});
 const report={schemaVersion:4,version:NATIVE_PREFIX_TAIL_TASK_VERSION,exploratory:true,qualificationOnly,catalogEligible:false,
  accepted:false,status:'PREFIX_TAIL_PENDING',formalReady:false,productionChanged:false,sourceLevelId:candidate.sourceLevelId,
  level,levelSha256:levelSha256(level),plan,attempt,executionEnvironment:plan.executionEnvironment,currentSourceBinding,executionPolicyObservation,
  currentRuntimeValidationClaimed:false,toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,
  policyReviewedAtPreparation:plan.policyReviewedAtPreparation,historicalDesignPolicy:plan.historicalDesignPolicy,mathematicalContract:plan.mathematicalContract,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  designBindings:bindings,designToolchainSha256:levelSha256(bindings),upperConstruction:null,lowerBound:null,route:null,L:null,U:null,
  mathematicalEvidenceValidated:false,designValidated:false,pointerValidated:false,timeValidated:false,reasons:[]};
 try{
  const planFile=path.join(ledgerDirectory,`${attempt.id}.v4-native-prefix-tail-task-plan.json`);
  await fs.writeFile(planFile,JSON.stringify({attempt,plan,prefixDrags,bindings},null,2)+'\n',{flag:'wx'});
  report.planEvidence={path:planFile,sha256:sha(await fs.readFile(planFile))};
  const upper=constructPrefixTailUpper(runtime,level,prefixDrags,{plan:plan.innerPlan});report.upperConstruction=upper;
  report.upperAccounting={prior:plan.constructionAccounting,knownPrefix:upper.prefixCommittedWorldUpperBound,
   tailRegistered:upper.tailSearch?.rawFullBoardStates??0,terminalAllowance:upper.tailSearch?1:0,
   conservativeFullBoardStateUpperBound:plan.constructionAccounting.completeWorldReservations+upper.conservativeFullBoardStateUpperBound,
   maximum:plan.fullUpperBudget.maxStates,exactCountClaimed:false};
  assert(report.upperAccounting.conservativeFullBoardStateUpperBound<=plan.fullUpperBudget.maxStates,'Shared upper construction limit');
  if(!upper.valid){report.status='UNKNOWN_CONSTRUCTED_UPPER_TERMINAL';return report;}
  const canonical=runtime.replayRevisedRoute(level,upper.drags),independent=independentReplay(runtime,level,upper.drags);
  assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed,'Original full double replay');
  assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
  assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.effectiveDrags,upper.drags.length);
  assert.equal(independent.effectiveDrags,upper.drags.length);
  report.drags=upper.drags;report.routeSha256=routeSha256(upper.drags);report.U=independent.nonClearingDrags;
  report.route={search:null,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256,canonicalReplay:canonical,independentReplay:independent,
   witnessSource:'one-fixed-prefix-and-one-native-tail-under-shared-construction-budget'};
  const lowerStage=nativeOriginalLowerStage(report.U,plan.targetDifficulty,()=>guardedPlainTask(level,runtime,{floor:plan.floor,...plan.lowerBudget}));
  if(lowerStage.lower===null){report.status=lowerStage.status;return report;}const lower=lowerStage.lower;
  report.lowerBound={method:'v3-plain',inputLevelSha256:report.levelSha256,requiredFloor:plan.floor,result:lower};report.proof=lower;
  if(!(lower.thresholdProven===true&&lower.status==='threshold-proven'&&lower.floor===plan.floor&&lower.termination==='below-threshold-exhausted')){
   report.status='UNKNOWN_OR_SHORTCUT_ORIGINAL_LOWER_TERMINAL';return report;}
  assert(lower.guardAllowance.conservativeFullBoardStateUpperBound<=10000);assert.equal(lower.sourceLevelSha256,report.levelSha256);
  report.accepted=true;report.L=plan.floor;report.difficulty=qualificationOnly?null:plan.targetDifficulty;
  report.mathematicalEvidenceValidated=true;report.status='EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU';return report;
 }catch(error){report.status='PREFIX_TAIL_REJECTED';report.reasons.push(error.message);return report;}
 finally{
  if(levelSha256(level)!==plan.levelSha256){report.accepted=false;report.status='PREFIX_TAIL_INPUT_CHANGED';}
  for(const [file,digest]of Object.entries({...bindings,[plan.constructionEvidence.path]:plan.constructionEvidence.sha256}))if(await fs.readFile(file).then(sha).catch(()=>null)!==digest){report.accepted=false;report.status='PREFIX_TAIL_BINDING_CHANGED';report.reasons.push(file);}
  report.redesignRequired=!report.accepted;report.catalogEligible=false;report.formalReady=false;
  if(!report.accepted)report.mathematicalEvidenceValidated=false;
  const file=path.join(ledgerDirectory,`${attempt.id}.v4-native-prefix-tail-task-result.json`);report.evidenceFile=file;
  await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await ledger.finish(attempt,report);
 }
}

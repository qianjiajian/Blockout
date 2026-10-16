import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {guardedPlainTask,reservedGuardBudget} from '../formal-v3/reserved-guard-budget.mjs';
import {native120Budget,native120PrefixTailPlan,constructNative120PrefixTailUpper,NATIVE120_ENGINE_BINDING} from './native-120-upper.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';

export const NATIVE120_PREFIX_TAIL_V4_VERSION='new-rectangle-stock-fixed-prefix-one-native120-tail-original-lower-v2';
const own='tools/daily-challenge/formal-v4/prefix-tail-native-120-v4-v2.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const NATIVE120_WRAPPER_BINDING=Object.freeze({path:own,sha256:sha(readFileSync(own))});
const DEFAULT_UPPER={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:120000};
const DEFAULT_LOWER={...DEFAULT_UPPER,maxStates:9999,maxMilliseconds:30000};

function stockDomain(level){
 assertPlainProofDomain(level);
 for(const body of level.blocks){const w=Math.max(...body.shape.map(p=>p[0]))+1,h=Math.max(...body.shape.map(p=>p[1]))+1;
  assert.equal(new Set(body.shape.map(p=>p.join(','))).size,w*h,'Reviewed new tail stock uses solid original-orientation rectangles only');}
}

/** No search or model mutation. Reserve all pre-U full assignments, every
 * supplied prefix commit and the frozen engine's terminal candidate together.
 * The original lower task has its own independently declared <=10000 budget.
 * Native U prioritizes remaining inventory, then total gesture depth. It is
 * never an optimality proof. D3 has no imposed parking ceiling. */
export function makeNative120PrefixTailV4Plan(runtime,candidate,{upperBudget={},lowerBudget={},floor=31,qualificationOnly=false}={}){
 assertV4Runtime(runtime);assert.equal(typeof qualificationOnly,'boolean');
 const executionEnvironment=prefixExecutionEnvironment(runtime,candidate.executionEnvironment);
 assert(qualificationOnly?Number.isSafeInteger(floor)&&floor>=1&&floor<=31:floor===31,'Production plan proves original L31');
 const {level,prefixDrags,constructionAccounting}=candidate;stockDomain(level);
 assert(candidate.constructionEvidence?.path&&/^[a-f0-9]{64}$/.test(candidate.constructionEvidence.sha256??''),'Bound actual prior construction file required');
 assert(Array.isArray(prefixDrags)&&prefixDrags.length>0);assert(constructionAccounting?.version==='late-region-static-construction-v1');
 for(const key of ['completeWorldReservations','microStates','transitions','elapsedMilliseconds'])
  assert(Number.isSafeInteger(constructionAccounting[key])&&constructionAccounting[key]>=0,`Finite prior construction ${key}`);
 assert(constructionAccounting.completeWorldReservations>=1,'The full new coloured stock must be charged');
 const fullUpperBudget=native120Budget({...DEFAULT_UPPER,...upperBudget}),lower=reservedGuardBudget({...DEFAULT_LOWER,...lowerBudget});
 const prior=constructionAccounting;
 const remaining={...fullUpperBudget,maxStates:fullUpperBudget.maxStates-prior.completeWorldReservations,
  maxMicroStates:fullUpperBudget.maxMicroStates-prior.microStates,maxTransitions:fullUpperBudget.maxTransitions-prior.transitions,
  maxMilliseconds:fullUpperBudget.maxMilliseconds-prior.elapsedMilliseconds};
 const innerPlan=native120PrefixTailPlan(level,prefixDrags,{upperBudget:remaining,lowerBudget:lower,floor});
 return{schemaVersion:4,version:NATIVE120_PREFIX_TAIL_V4_VERSION,upperEngine:NATIVE120_ENGINE_BINDING,nativeWrapper:NATIVE120_WRAPPER_BINDING,lowerToolchainSha256:runtime.toolchainSha256,qualificationOnly,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags),
  sourceLevelId:candidate.sourceLevelId,floor,executionEnvironment,currentRuntimeValidationClaimed:false,
  sourceLevelSha256:qualificationOnly?null:levelSha256(runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId)),
  constructionAccounting:structuredClone(prior),constructionEvidence:structuredClone(candidate.constructionEvidence),fullUpperBudget,lowerBudget:lower,innerPlan,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,toolchainSha256:runtime.toolchainSha256,
  upperTask:'one-known-prefix-then-one-declared-native120-tail-search',lowerTask:'one-original-full-level-threshold-after-valid-U',
  tailSearchesMaximum:1,alternativePrefixOrFullUpperSearchAllowed:false,failedInputContinuationAllowed:false,
  nativeTailHasNoParkingCeiling:true,witnessOptimalityClaimed:false,formalReady:false};
}

/** New physical inputs only. One public claim binds the complete opening;
 * the smaller tail is never claimed and never supplies a lower certificate.
 * A failed U immediately seals that opening without trying its original L. */
export async function exploreNative120PrefixTailV4(runtime,candidate,{plan,redesignOf,qualificationOnly=false,ledgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 assertV4Runtime(runtime);
 assert.equal(typeof qualificationOnly,'boolean');
 await assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,ledgerDirectory);
 if(!qualificationOnly)assert.equal(path.resolve(ledgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER),'Production uses shared public identity ledger');
 else{const target=path.resolve(ledgerDirectory).toLowerCase(),production=path.resolve(PUBLIC_ATTEMPT_LEDGER).toLowerCase();
  assert(target!==production&&!target.startsWith(production+path.sep),'Qualification must use an isolated private ledger outside public history');}
 assert(plan,'Exact plan must be fixed before first claim');assert.equal(plan.qualificationOnly,qualificationOnly);
 const expected=makeNative120PrefixTailV4Plan(runtime,candidate,{upperBudget:plan.fullUpperBudget,lowerBudget:plan.lowerBudget,floor:plan.floor,qualificationOnly});
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
 for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/');const digest=sha(await fs.readFile(p));if(bindings[p])assert.equal(bindings[p],digest,`Conflicting compiled dependency: ${p}`);bindings[p]=digest;}
 for(const [file,digest]of Object.entries(runtime.toolchainBindings))assert.equal(sha(await fs.readFile(file)),digest);
 // Loaded code must be the same bytes that the new receipt will describe.
 assert.equal(bindings[NATIVE120_ENGINE_BINDING.tool.path],NATIVE120_ENGINE_BINDING.tool.sha256,'Native upper import-time code differs from compiled file binding');
 assert.equal(bindings[NATIVE120_WRAPPER_BINDING.path],NATIVE120_WRAPPER_BINDING.sha256,'Native wrapper import-time code differs from compiled file binding');
 const upperToolchainBindings={...bindings},upperToolchainSha256=levelSha256(upperToolchainBindings);
 const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});
 const report={schemaVersion:4,version:NATIVE120_PREFIX_TAIL_V4_VERSION,exploratory:true,qualificationOnly,catalogEligible:false,
  accepted:false,status:'PREFIX_TAIL_PENDING',formalReady:false,productionChanged:false,sourceLevelId:candidate.sourceLevelId,
  level,levelSha256:levelSha256(level),plan,attempt,upperEngine:NATIVE120_ENGINE_BINDING,nativeWrapper:NATIVE120_WRAPPER_BINDING,upperToolchainBindings,upperToolchainSha256,lowerToolchainSha256:runtime.toolchainSha256,executionEnvironment:plan.executionEnvironment,currentSourceBinding,
  currentRuntimeValidationClaimed:false,toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  designBindings:bindings,designToolchainSha256:levelSha256(bindings),upperConstruction:null,lowerBound:null,route:null,L:null,U:null,
  mathematicalEvidenceValidated:false,designValidated:false,pointerValidated:false,timeValidated:false,reasons:[]};
 try{
  const planFile=path.join(ledgerDirectory,`${attempt.id}.v4-native120-v2-prefix-tail-plan.json`);
  await fs.writeFile(planFile,JSON.stringify({attempt,plan,prefixDrags,bindings},null,2)+'\n',{flag:'wx'});
  report.planEvidence={path:planFile,sha256:sha(await fs.readFile(planFile))};
  const upperStarted=Date.now();
  const upper=constructNative120PrefixTailUpper(runtime,level,prefixDrags,{plan:plan.innerPlan});report.upperConstruction=upper;
  report.upperAccounting={prior:plan.constructionAccounting,knownPrefix:upper.prefixCommittedWorldUpperBound,
   tailRegistered:upper.tailSearch?.rawFullBoardStates??0,terminalAllowance:upper.tailSearch?1:0,
   conservativeFullBoardStateUpperBound:plan.constructionAccounting.completeWorldReservations+upper.conservativeFullBoardStateUpperBound,
   maximum:plan.fullUpperBudget.maxStates,exactCountClaimed:false,
   totalElapsedMilliseconds:plan.constructionAccounting.elapsedMilliseconds+Date.now()-upperStarted,maximumElapsedMilliseconds:plan.fullUpperBudget.maxMilliseconds};
  assert(report.upperAccounting.conservativeFullBoardStateUpperBound<=plan.fullUpperBudget.maxStates,'Shared upper construction limit');
  if(!upper.valid){report.status='UNKNOWN_CONSTRUCTED_UPPER_TERMINAL';return report;}
  const wallGuard=()=>{report.upperAccounting.totalElapsedMilliseconds=plan.constructionAccounting.elapsedMilliseconds+Date.now()-upperStarted;
   assert(report.upperAccounting.totalElapsedMilliseconds<plan.fullUpperBudget.maxMilliseconds,'shared-upper-deadline');};
  wallGuard();const canonical=runtime.replayRevisedRoute(level,upper.drags);wallGuard();
  const independent=independentReplay(runtime,level,upper.drags);wallGuard();
  assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed,'Original full double replay');
  assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
  assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.effectiveDrags,upper.drags.length);
  assert.equal(independent.effectiveDrags,upper.drags.length);
  report.drags=upper.drags;report.routeSha256=routeSha256(upper.drags);report.U=independent.nonClearingDrags;
  report.route={search:null,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256,canonicalReplay:canonical,independentReplay:independent,
   witnessSource:'one-fixed-prefix-and-one-native120-tail-under-shared-construction-budget'};
  if(report.U<plan.floor){report.status='KNOWN_UPPER_BELOW_PREDECLARED_FLOOR';return report;}
  const lower=guardedPlainTask(level,runtime,{floor:plan.floor,...plan.lowerBudget});
  report.lowerBound={method:'v3-plain',inputLevelSha256:report.levelSha256,requiredFloor:plan.floor,result:lower};report.proof=lower;
  if(!(lower.thresholdProven===true&&lower.status==='threshold-proven'&&lower.floor===plan.floor&&lower.termination==='below-threshold-exhausted')){
   report.status='UNKNOWN_OR_SHORTCUT_ORIGINAL_LOWER_TERMINAL';return report;}
  assert(lower.guardAllowance.conservativeFullBoardStateUpperBound<=10000);assert.equal(lower.sourceLevelSha256,report.levelSha256);
  report.accepted=true;report.L=plan.floor;report.difficulty=qualificationOnly?null:3;
  report.mathematicalEvidenceValidated=true;report.status='EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU';return report;
 }catch(error){report.status='PREFIX_TAIL_REJECTED';report.reasons.push(error.message);return report;}
 finally{
  if(levelSha256(level)!==plan.levelSha256){report.accepted=false;report.status='PREFIX_TAIL_INPUT_CHANGED';}
  for(const [file,digest]of Object.entries({...bindings,[plan.constructionEvidence.path]:plan.constructionEvidence.sha256}))if(await fs.readFile(file).then(sha).catch(()=>null)!==digest){report.accepted=false;report.status='PREFIX_TAIL_BINDING_CHANGED';report.reasons.push(file);}
  report.redesignRequired=!report.accepted;report.catalogEligible=false;report.formalReady=false;
  if(!report.accepted)report.mathematicalEvidenceValidated=false;
  const file=path.join(ledgerDirectory,`${attempt.id}.v4-native120-v2-prefix-tail-result.json`);report.evidenceFile=file;
  await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await ledger.finish(attempt,report);
 }
}

import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {createAttemptLedger,boundedBudget} from '../formal-v3/bounded-proof.mjs';
import {assertIceProofDomain} from '../formal-v3/bounded-ice-proof.mjs';
import {guardedIceTask,reservedGuardBudget} from '../formal-v3/reserved-guard-budget.mjs';
import {prefixTailPlan,constructPrefixTailUpper,PREFIX_TAIL_BINDINGS} from '../formal-v3/design-prefix-tail-upper-v2.mjs';
import {assertEarlyFrozenConstructionAccounting,EARLY_FROZEN_BINDING} from './early-frozen-ice-joint.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding} from './prefix-execution-environment-task.mjs';
import {realPathWithSuffix} from './native-batch-io.mjs';
import {HISTORY_ROOTS} from './early-prefix-four-contract.mjs';

export const EARLY_PREFIX_TAIL_VERSION='new-body-ice-thawed-prefix-one-plain-tail-original-ice-lower-task-v1';
const own='tools/daily-challenge/formal-v4/early-frozen-prefix-tail-task.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const EARLY_PREFIX_TAIL_BINDING=Object.freeze({path:own,sha256:sha(readFileSync(own))});
const LIMITS={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000};
const jsonCopy=x=>JSON.parse(JSON.stringify(x));
const integer=(v,name,min=0)=>assert(Number.isSafeInteger(v)&&v>=min,`Finite integer ${name}`);

// Planning validation copied from the frozen original joint entry; its search implementation remains imported nowhere.
function stockDomain(level,declaration,qualificationOnly){
 assertIceProofDomain(level);assert(declaration&&Array.isArray(declaration.regionBlockIds));
 assert((qualificationOnly?[1,2,4]:[2,4]).includes(declaration.count),'Production ice count is predeclared 2 or 4');
 const ids=new Set(declaration.regionBlockIds);assert(ids.size>0&&ids.size===declaration.regionBlockIds.length);
 assert([...ids].every(id=>level.blocks.some(b=>b.id===id)));
 for(const b of level.blocks){
  assert.equal(b.frozen,ids.has(b.id)?declaration.count:undefined,'Only declared new region bodies carry this ice');
  const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;
  assert.equal(new Set(b.shape.map(p=>p.join(','))).size,w*h,'This first experiment is solid original-orientation rectangles only');
 }
 assert(level.gates.every(g=>g.frozen===undefined),'First experiment has ordinary exits');
 assert(level.blocks.length-ids.size>=declaration.count,'Enough unfrozen clear inventory is necessary, not a solvability certificate');
}
function validateEarlyFrozenTaskInput(runtime,candidate,{budget={},floor=31,searchUpper=128,qualificationOnly=false}={}){
 assertV4Runtime(runtime);assert.equal(typeof qualificationOnly,'boolean');
 assert(qualificationOnly?Number.isSafeInteger(floor)&&floor>=1&&floor<=31:floor===31);
 assert(qualificationOnly?Number.isSafeInteger(searchUpper)&&searchUpper>=floor&&searchUpper<=128:searchUpper===128);
 assert(candidate.drags===undefined,'A provided route must not bypass the one declared joint task');
 stockDomain(candidate.level,candidate.iceDeclaration,qualificationOnly);assertEarlyFrozenConstructionAccounting(candidate.constructionAccounting);
 const fullBudget={...LIMITS,...budget};assert(Object.keys(fullBudget).every(k=>k in LIMITS));
 for(const [k,cap]of Object.entries(LIMITS)){integer(fullBudget[k],k,1);assert(fullBudget[k]<=cap,`Hard ${k} limit`);}
 const prior=candidate.constructionAccounting;
 const jointBudget=reservedGuardBudget({...fullBudget,maxStates:fullBudget.maxStates-prior.completeWorldReservations-1,
  maxTransitions:fullBudget.maxTransitions-prior.transitions,maxMicroStates:fullBudget.maxMicroStates-prior.microStates,
  maxMilliseconds:fullBudget.maxMilliseconds-prior.elapsedMilliseconds});
 assert(candidate.constructionEvidence?.path&&/^[a-f0-9]{64}$/.test(candidate.constructionEvidence.sha256??''));
 assert(candidate.plainConstructionEvidence?.path&&/^[a-f0-9]{64}$/.test(candidate.plainConstructionEvidence.sha256??''));
 const executionEnvironment=prefixExecutionEnvironment(runtime,candidate.executionEnvironment);
 return{schemaVersion:4,version:EARLY_PREFIX_TAIL_VERSION,entry:EARLY_FROZEN_BINDING,qualificationOnly,
  levelSha256:levelSha256(candidate.level),sourceLevelId:candidate.sourceLevelId,
  sourceLevelSha256:qualificationOnly?null:levelSha256(runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId)),
  iceDeclaration:structuredClone(candidate.iceDeclaration),constructionAccounting:structuredClone(prior),
  constructionEvidence:structuredClone(candidate.constructionEvidence),plainConstructionEvidence:structuredClone(candidate.plainConstructionEvidence),executionEnvironment,fullBudget,jointBudget,floor,searchUpper,
  strategy:'one-original-full-ice-joint',jointSearchesMaximum:1,alternativeSearchAllowed:false,failedInputContinuationAllowed:false,
  toolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,catalogEligible:false,formalReady:false};
}

function boundEvidence(candidate){
 const read=d=>{const b=readFileSync(d.path);assert.equal(sha(b),d.sha256,'Construction bytes changed');return JSON.parse(b);};
 const final=read(candidate.constructionEvidence),plain=read(candidate.plainConstructionEvidence);
 for(const x of [final,plain]){assert.equal(x.levelSha256,levelSha256(x.level));assert.equal(x.sourceLevelId,candidate.sourceLevelId);}
 assert.equal(final.levelSha256,levelSha256(candidate.level));
 assert.deepEqual(final.iceDeclaration,candidate.iceDeclaration);assert.deepEqual(final.constructionAccounting,candidate.constructionAccounting);
 assert.deepEqual(final.plainConstructionEvidence,candidate.plainConstructionEvidence);
 assertPlainProofDomain(plain.level);assert(plain.level.blocks.every(b=>b.frozen===undefined),'Bound constructor plain image has no ice fields');
 const stripped=structuredClone(candidate.level);
 for(const b of stripped.blocks)if(candidate.iceDeclaration.regionBlockIds.includes(b.id))delete b.frozen;
 assert.equal(levelSha256(stripped),plain.levelSha256,'Only the declared body ice may differ from the bound plain image');
 const p=plain.constructionAccounting,a=candidate.constructionAccounting;
 assert.equal(p?.version,'late-region-static-construction-v1');integer(plain.paint?.accounting?.completeWorldReservations,'completed colours',1);
 assert.equal(p.completeWorldReservations,1+plain.paint.accounting.completeWorldReservations);
 assert.equal(a.placeholderWorldReservations,1);assert.equal(a.completedColourWorldReservations,plain.paint.accounting.completeWorldReservations);
 assert.equal(a.icedWorldReservations,1);assert.equal(a.completeWorldReservations,p.completeWorldReservations+1);
 for(const k of ['microStates','transitions'])assert.equal(a[k],p[k]);integer(p.elapsedMilliseconds,'plain elapsed');assert(a.elapsedMilliseconds>=p.elapsedMilliseconds);
 for(const x of [final,plain]){assert.equal(routeSha256(x.prefixDrags),routeSha256(candidate.prefixDrags),'Bound fixed prefix differs');
  if(x.prefixSha256!==undefined)assert.equal(x.prefixSha256,routeSha256(candidate.prefixDrags));}
 return{final,plain};
}

/** Planning only. Two logical prefix images (iced and plain) are conservatively
 * reserved, even where their worlds coincide. No plain/tail public claim. */
export function makeEarlyFrozenPrefixTailPlan(runtime,candidate,{upperBudget={},lowerBudget={},floor=31,searchUpper=128,qualificationOnly=false}={}){
 const validated=validateEarlyFrozenTaskInput(runtime,candidate,{budget:upperBudget,floor,searchUpper:128,qualificationOnly});
 assert(qualificationOnly?Number.isSafeInteger(searchUpper)&&searchUpper>=1&&searchUpper<=128:searchUpper===128,'Fixed finite plain tail window');
 assert(Array.isArray(candidate.prefixDrags)&&candidate.prefixDrags.length>0,'A fixed nonempty prefix is required');
 const ids=new Set(candidate.iceDeclaration.regionBlockIds);
 for(const d of candidate.prefixDrags){assert(d&&Object.keys(d).every(k=>['blockId','path','exitSide'].includes(k))&&Array.isArray(d.path));
  assert(!ids.has(d.blockId),'Fixed prefix must not operate the newly iced region');
  for(const p of d.path)assert(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger),'Every prefix unit coordinate is required');}
 const {plain}=boundEvidence(candidate),C=validated.constructionAccounting,fullUpperBudget=boundedBudget({...LIMITS,...upperBudget});
 const bridgePrefixWorlds=candidate.prefixDrags.length+1;
 // Three actual interpreters check the bridge. These are route-validation
 // operations, not BFS; charging all of their operations is conservative.
 const bridgeTransitions=3*candidate.prefixDrags.reduce((n,d)=>n+d.path.length+1,0);
 const remaining={...fullUpperBudget,maxStates:fullUpperBudget.maxStates-C.completeWorldReservations-bridgePrefixWorlds,
  maxTransitions:fullUpperBudget.maxTransitions-C.transitions-bridgeTransitions,maxMicroStates:fullUpperBudget.maxMicroStates-C.microStates,
  maxMilliseconds:fullUpperBudget.maxMilliseconds-C.elapsedMilliseconds};
 const lower=reservedGuardBudget({...LIMITS,maxStates:9999,...lowerBudget});
 const innerPlan=prefixTailPlan(plain.level,candidate.prefixDrags,{upperBudget:remaining,lowerBudget:lower,floor,tailStrategy:'plain-joint',searchUpper});
 return{schemaVersion:4,version:EARLY_PREFIX_TAIL_VERSION,entry:EARLY_PREFIX_TAIL_BINDING,qualificationOnly,
  levelSha256:validated.levelSha256,plainLevelSha256:plain.levelSha256,prefixSha256:routeSha256(candidate.prefixDrags),
  sourceLevelId:validated.sourceLevelId,sourceLevelSha256:validated.sourceLevelSha256,executionEnvironment:validated.executionEnvironment,
  constructionEvidence:validated.constructionEvidence,plainConstructionEvidence:validated.plainConstructionEvidence,
  constructionAccounting:C,iceDeclaration:validated.iceDeclaration,bridgePrefixWorlds,bridgeTransitions,
  policyReviewedAtPreparation:validated.executionEnvironment.policyReviewedAtPreparation,
  historicalDesignPolicy:validated.executionEnvironment.historicalDesignPolicy,mathematicalContract:validated.executionEnvironment.mathematicalContract,
  fullUpperBudget,lowerBudget:lower,innerPlan,floor,searchUpper,
  upperTask:'fixed-iced-to-plain-cut-bridge-one-plain-tail-original-iced-double-replay',
  lowerTask:'original-full-iced-floor-only',tailSearchesMaximum:1,lowerSearchesMaximum:1,
  alternativeSearchAllowed:false,failedInputContinuationAllowed:false,providedCompleteRouteAllowed:false,
  tailBoundTransferAllowed:false,finiteTailWindowIsNotDifficultyUpperLimit:true,
  toolchainSha256:runtime.toolchainSha256,catalogEligible:false,formalReady:false};
}

function applyPrefixDrag(runtime,model,d,deferred,guard){
 assert(model.getBlock(d.blockId),'Missing prefix body');const before=model.snapshot();model.beginAction();
 let automatic=canonicalExit(runtime,model,d.blockId);
 assert(!automatic||d.path.length===0,'Pointer-down clear prevents a prefix path');
 for(const [i,p]of d.path.entries()){
  guard();
  const b=model.getBlock(d.blockId),from=[b.x,b.y];assert.equal(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y),1,'Prefix path must contain unit steps');
  assert(model.moveBlockStep(d.blockId,...p),'Original prefix move rejected');automatic=canonicalExit(runtime,model,d.blockId,from);
  assert(!automatic||i===d.path.length-1,'Prefix first contact occurs before the declared end');
 }
 assert.equal(automatic,d.exitSide,'Prefix canonical clear/parking differs');
 const exit=d.exitSide?model.tryExit(d.blockId,d.exitSide):null;if(exit)assert(exit.ok);
 assert(model.commitAction(),'Prefix gesture must be effective');
 if(deferred&&exit?.exitAnimationId)assert(model.completeExitAnimation(exit.exitAnimationId),'Prefix exit animation must finish');
 const after=model.snapshot();assert(!after.failed);assert.equal(after.moves,before.moves+1);assert.equal(after.cleared-before.cleared,Number(!!d.exitSide));
 return after;
}

/** Supplied-route validation only. The caller reserves both fixed prefix
 * images in advance. No suffix route or bound can be inferred from this cut. */
export function auditThawedPrefixBridge(runtime,iced,plain,prefixDrags,iceDeclaration,{guard=()=>{}}={}){
 assertIceProofDomain(iced);assertPlainProofDomain(plain);assert(iced.gates.every(g=>g.frozen===undefined),'Bridge has ordinary fixed gates');
 const image=structuredClone(iced),ids=new Set(iceDeclaration.regionBlockIds);
 assert(ids.size===iceDeclaration.regionBlockIds.length&&ids.size>0);assert(prefixDrags.every(d=>!ids.has(d.blockId)));
 for(const body of image.blocks){assert.equal(body.frozen,ids.has(body.id)?iceDeclaration.count:undefined);if(ids.has(body.id))delete body.frozen;}
 assert.equal(levelSha256(image),levelSha256(plain),'Bridge plain image must differ only by declared body ice');
 guard();const a=new runtime.PuzzleModel(iced),b=new runtime.PuzzleModel(iced,{deferExitCompletion:true}),c=new runtime.PuzzleModel(plain);
 for(const m of [a,b,c])m.startCountdown();const trace=[];
 for(const [i,d]of prefixDrags.entries()){
  guard();const left=applyPrefixDrag(runtime,a,d,false,guard);guard();const independent=applyPrefixDrag(runtime,b,d,true,guard);guard();
  const right=applyPrefixDrag(runtime,c,d,false,guard);guard();assert.deepEqual(jsonCopy(left),jsonCopy(independent),'Iced prefix interpreters disagree');
  trace.push({drag:i+1,clearEvents:left.cleared,icedStateSha256:levelSha256(left),plainStateSha256:levelSha256(right)});
 }
 const icedCut=a.snapshot(),plainCut=c.snapshot();
 assert(icedCut.blocks.every(b=>(b.frozen??0)===0)&&icedCut.gates.every(g=>(g.frozen??0)===0),'All surviving ice must be zero at the fixed cut');
 assert(icedCut.cleared>=iceDeclaration.count,'Fixed prefix must supply at least the declared ice clear events');
 assert(!icedCut.complete,'The fixed cut must leave an actual tail');
 assert.deepEqual(jsonCopy(icedCut),jsonCopy(plainCut),'Thawed iced and plain cut states differ');guard();
 return{valid:true,searchPerformed:false,lowerBoundClaimed:false,trace,icedCutSha256:levelSha256(icedCut),plainCutSha256:levelSha256(plainCut),
  cleared:icedCut.cleared,remainingBodies:icedCut.blocks.length,allSurvivingIceZero:true,
  snapshotComparison:'all snapshot fields after completed exit animations, no counters or inventory erased'};
}

/** NEW shape+colour stocks only. One iced identity owns U then L. Old failures
 * remain blocked even if this wrapper, label, prefix or budget is changed. */
export async function exploreEarlyFrozenPrefixTail(runtime,candidate,{plan,redesignOf,qualificationOnly=false,ledgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 assertV4Runtime(runtime);assert.equal(typeof qualificationOnly,'boolean');
 await assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,ledgerDirectory);
 if(qualificationOnly){const actual=await realPathWithSuffix(ledgerDirectory);for(const root of HISTORY_ROOTS){const p=await realPathWithSuffix(root);
  assert(actual!==p&&!actual.startsWith(p+path.sep),'Private thawed-prefix fixture aliases shared history');}}
 else assert.equal(path.resolve(ledgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER));
 assert(plan&&plan.qualificationOnly===qualificationOnly);
 assert.deepEqual(plan,makeEarlyFrozenPrefixTailPlan(runtime,candidate,{upperBudget:plan.fullUpperBudget,lowerBudget:plan.lowerBudget,floor:plan.floor,searchUpper:plan.searchUpper,qualificationOnly}),'Predeclared thawed-prefix plan changed');
 const {plain}=boundEvidence(candidate),sourceBinding=await currentMainlineSourceBinding(runtime,plan.executionEnvironment,candidate.sourceLevelId,{qualificationOnly});
 if(!qualificationOnly){assert.equal(sourceBinding.sourceLevelSha256,plan.sourceLevelSha256);
  assert.equal(boardBaselineSha256(candidate.level),boardBaselineSha256(runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId)));}
 runtime.validateLevel(candidate.level);runtime.validateLevel(plain.level);
 const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const bindings={...runtime.toolchainBindings,[runtime.policyRuntimeBinding.path]:runtime.policyRuntimeBinding.sha256,...plan.executionEnvironment.bindings,...sourceBinding.bindings};
 for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),h=sha(await fs.readFile(p));if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;}
 for(const [p,h]of Object.entries({...runtime.toolchainBindings,...PREFIX_TAIL_BINDINGS,[own]:EARLY_PREFIX_TAIL_BINDING.sha256,[EARLY_FROZEN_BINDING.path]:EARLY_FROZEN_BINDING.sha256}))
  assert.equal(bindings[p],h,`Loaded tool bytes differ: ${p}`);
 const level=structuredClone(candidate.level),prefix=structuredClone(candidate.prefixDrags);
 // Invocation authorization is observed immediately before the first ledger write; it is not a mathematical identity binding.
 const executionPolicyObservation=observeExecutionPolicy(plan.executionEnvironment);
 const ledger=await createAttemptLedger(ledgerDirectory);
 const attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});
 const report={schemaVersion:4,version:EARLY_PREFIX_TAIL_VERSION,entry:EARLY_PREFIX_TAIL_BINDING,qualificationOnly,exploratory:true,
  accepted:false,status:'THAWED_PREFIX_TAIL_PENDING',level,levelSha256:plan.levelSha256,sourceLevelId:candidate.sourceLevelId,plan,attempt,
  sourceBinding,executionEnvironment:plan.executionEnvironment,executionPolicyObservation,toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,
  designBindings:bindings,designToolchainSha256:levelSha256(bindings),bridge:null,upperConstruction:null,upperAccounting:null,
  lowerSearchCalls:0,proof:null,lowerBound:null,route:null,L:null,U:null,reasons:[],
  mathematicalEvidenceValidated:false,mechanismStrengthValidated:false,designValidated:false,pointerValidated:false,timeValidated:false,
  currentRuntimeValidationClaimed:false,catalogEligible:false,formalReady:false,productionChanged:false};
 let started,upperFinished=false;
 const elapsed=()=>plan.constructionAccounting.elapsedMilliseconds+(started===undefined?0:Date.now()-started);
 const wallGuard=()=>assert(elapsed()<plan.fullUpperBudget.maxMilliseconds,'shared-thawed-prefix-upper-deadline');
 try{
  const file=path.join(ledgerDirectory,`${attempt.id}.v4-thawed-prefix-task-plan.json`);await fs.writeFile(file,JSON.stringify({attempt,plan,bindings},null,2)+'\n',{flag:'wx'});
  report.planEvidence={path:file,sha256:sha(await fs.readFile(file))};started=Date.now();wallGuard();
  report.bridge=auditThawedPrefixBridge(runtime,level,plain.level,prefix,plan.iceDeclaration,{guard:wallGuard});wallGuard();
  const spentBridge=Date.now()-started,inner=prefixTailPlan(plain.level,prefix,{upperBudget:{...plan.innerPlan.fullUpperBudget,
   maxMilliseconds:plan.innerPlan.fullUpperBudget.maxMilliseconds-spentBridge},lowerBudget:plan.lowerBudget,floor:plan.floor,tailStrategy:'plain-joint',searchUpper:plan.searchUpper});
  report.actualInnerPlan=inner;
  const upper=constructPrefixTailUpper(runtime,plain.level,prefix,{plan:inner});report.upperConstruction=upper;wallGuard();
  report.upperAccounting={prior:plan.constructionAccounting,icedBridgePrefixWorlds:plan.bridgePrefixWorlds,
   plainHelperPrefixWorlds:upper.prefixCommittedWorldUpperBound,tailRegistered:upper.tailSearch?.rawFullBoardStates??0,terminalAllowance:upper.tailSearch?1:0,
   conservativeFullBoardStateUpperBound:plan.constructionAccounting.completeWorldReservations+plan.bridgePrefixWorlds+upper.conservativeFullBoardStateUpperBound,
   transitions:plan.constructionAccounting.transitions+plan.bridgeTransitions+(upper.prefixTransitions??0)+(upper.tailSearch?.attemptedTransitions??0),
   microStates:plan.constructionAccounting.microStates+(upper.tailSearch?.microDiscoveredStates??0),elapsedMilliseconds:elapsed(),maximum:plan.fullUpperBudget,
   exactWorldCountClaimed:false};
  assert(report.upperAccounting.conservativeFullBoardStateUpperBound<=plan.fullUpperBudget.maxStates);
  assert(report.upperAccounting.transitions<=plan.fullUpperBudget.maxTransitions&&report.upperAccounting.microStates<=plan.fullUpperBudget.maxMicroStates);
  if(!upper.valid){report.status='UNKNOWN_SINGLE_PLAIN_TAIL_TERMINAL';return report;}
  wallGuard();const canonical=runtime.replayRevisedRoute(level,upper.drags);wallGuard();
  const independent=independentReplay(runtime,level,upper.drags);wallGuard();
  assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed,'Original iced full double replay rejected');
  assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.effectiveDrags,upper.drags.length);assert.equal(independent.effectiveDrags,upper.drags.length);
  assert.equal(canonical.clearEvents,level.blocks.length);assert.equal(independent.clearEvents,level.blocks.length);assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
  report.drags=upper.drags;report.routeSha256=routeSha256(upper.drags);report.U=independent.nonClearingDrags;
  report.route={search:null,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256,canonicalReplay:canonical,independentReplay:independent,witnessSource:EARLY_PREFIX_TAIL_VERSION};
  report.upperAccounting.elapsedMilliseconds=elapsed();wallGuard();upperFinished=true;
  if(report.U<plan.floor){report.status='ORIGINAL_ICED_UPPER_BELOW_FLOOR';return report;}
  report.lowerSearchCalls=1;const lowerStarted=Date.now();
  const result=guardedIceTask(level,runtime,{floor:plan.floor,searchUpper:null,...plan.lowerBudget});report.proof=result;
  report.lowerBound={method:'v3-native-static-ice',inputLevelSha256:report.levelSha256,requiredFloor:plan.floor,result};
  assert(Date.now()-lowerStarted<plan.lowerBudget.maxMilliseconds,'original-ice-lower-deadline');
  assert.equal(result.sourceLevelSha256,report.levelSha256);assert(result.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
  if(!(result.thresholdProven===true&&result.status==='threshold-proven'&&result.floor===plan.floor&&result.termination==='below-threshold-exhausted')){
   report.status='UNKNOWN_OR_SHORTCUT_ORIGINAL_ICE_LOWER_TERMINAL';return report;}
  report.accepted=true;report.L=plan.floor;report.mathematicalEvidenceValidated=true;report.status='EXPLORATORY_THAWED_PREFIX_ORIGINAL_ICE_LU';return report;
 }catch(error){report.status='THAWED_PREFIX_TAIL_REJECTED';report.reasons.push(error.message);return report;}
 finally{
  if(report.upperAccounting&&!upperFinished)report.upperAccounting.elapsedMilliseconds=elapsed();
  if(levelSha256(level)!==plan.levelSha256){report.accepted=false;report.status='THAWED_PREFIX_INPUT_CHANGED';}
  for(const [p,h]of Object.entries({...bindings,[plan.constructionEvidence.path]:plan.constructionEvidence.sha256,[plan.plainConstructionEvidence.path]:plan.plainConstructionEvidence.sha256}))
   if(await fs.readFile(p).then(sha).catch(()=>null)!==h){report.accepted=false;report.status='THAWED_PREFIX_BINDING_CHANGED';report.reasons.push(p);}
  report.redesignRequired=!report.accepted;if(!report.accepted)report.mathematicalEvidenceValidated=false;
  report.catalogEligible=false;report.formalReady=false;
  report.evidenceFile=path.join(ledgerDirectory,`${attempt.id}.v4-thawed-prefix-task-result.json`);
  await fs.writeFile(report.evidenceFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await ledger.finish(attempt,report);
 }
}

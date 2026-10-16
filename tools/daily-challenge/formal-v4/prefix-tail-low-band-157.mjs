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
import {prefixTailPlan} from '../formal-v3/design-prefix-tail-upper-v2.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';
import {assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment-157.mjs';

export const LOW_BAND_PREFIX_TAIL_VERSION='low-band-fixed-prefix-one-capped-tail-original-lower-policy157-v1';
const own='tools/daily-challenge/formal-v4/prefix-tail-low-band-157.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const ownBinding={path:own,sha256:sha(await fs.readFile(own))};
const DEFAULT_UPPER={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000};
const DEFAULT_LOWER={...DEFAULT_UPPER,maxStates:9999};
export const LOW_BANDS=Object.freeze({1:Object.freeze({floor:16,upper:20}),2:Object.freeze({floor:21,upper:30})});

// The frozen plain search visits costs 0..searchUpper inclusive. A zero
// remainder is expressed as floor=1 without route search, which visits only
// cost zero. Never round that remainder up to one parking move.
function lowBandInnerPlan(level,prefixDrags,{upperBudget,lowerBudget,floor,tailParkingLimit}){
 assert(Number.isSafeInteger(tailParkingLimit)&&tailParkingLimit>=0&&tailParkingLimit<=30);
 const common=prefixTailPlan(level,prefixDrags,{upperBudget,lowerBudget,floor,tailStrategy:'plain-joint',searchUpper:Math.max(1,tailParkingLimit)});
 return{...common,version:'fixed-low-band-prefix-one-capped-tail-v1',tool:ownBinding,budgetPlanTool:common.tool,
  toolBindings:{...common.toolBindings,[own]:ownBinding.sha256},searchUpper:tailParkingLimit,
  tailSearchMode:tailParkingLimit===0?'zero-parking-closure-only':'inclusive-tail-parking-ceiling',
  finiteTailWindowIsDifficultyRemainder:true};
}

/** Constructive upper only. Its caller owns the full opening's single claim.
 * Known prefix commits are all reserved before replay; no alternative prefix
 * or tail search is selected if first-contact or complete replay fails. */
export function constructLowBandPrefixUpper(runtime,level,prefixDrags,{plan}){
 stockDomain(level);
 assert.equal(plan.levelSha256,levelSha256(level));assert.equal(plan.prefixSha256,routeSha256(prefixDrags));
 assert.deepEqual(plan,lowBandInnerPlan(level,prefixDrags,{upperBudget:plan.fullUpperBudget,lowerBudget:plan.lowerBudget,floor:plan.floor,tailParkingLimit:plan.searchUpper}));
 const started=Date.now(),report={valid:false,complete:false,levelSha256:plan.levelSha256,prefixSha256:plan.prefixSha256,plan,
  prefixAudits:[],prefixParking:0,prefixCommittedWorldUpperBound:1,conservativeFullBoardStateUpperBound:1,
  tailSearches:0,tailSearch:null,lowerBoundClaimed:false,drags:[],U:null};
 try{
  runtime.validateLevel(level);let current=structuredClone(level),prefixTransitions=0;
  for(const[index,drag]of prefixDrags.entries()){
   assert(Date.now()-started<plan.tailBudget.maxMilliseconds,'prefix-deadline');
   assert(drag&&Array.isArray(drag.path),'Invalid fixed prefix drag');
   prefixTransitions+=drag.path.length+1;assert(prefixTransitions<plan.tailBudget.maxTransitions,'prefix-transition-budget');
   // This entire known sequence was subtracted from tailBudget before claim.
   report.prefixCommittedWorldUpperBound=index+2;report.conservativeFullBoardStateUpperBound=index+2;
   const next=structuredClone(current),body=next.blocks.find(b=>b.id===drag.blockId);assert(body,'Missing prefix body');
   if(drag.path.length)Object.assign(body,{x:drag.path.at(-1)[0],y:drag.path.at(-1)[1]});
   if(drag.exitSide)next.blocks=next.blocks.filter(b=>b.id!==drag.blockId);
   const audit=auditPlainForwardDrag(runtime,current,drag,{expectedBodies:next.blocks});report.prefixAudits.push({index,...audit});
   assert(audit.valid,`prefix-replay:${audit.error}`);report.prefixParking+=Number(!drag.exitSide);current=next;
  }
  report.prefixTransitions=prefixTransitions;report.tailLevel=structuredClone(current);report.tailLevelSha256=levelSha256(current);
  let tailDrags=[];
  if(current.blocks.length){
   const remainingMs=plan.tailBudget.maxMilliseconds-(Date.now()-started);assert(remainingMs>=1,'prefix-deadline');
   const budget={...plan.tailBudget,maxTransitions:plan.tailBudget.maxTransitions-prefixTransitions,maxMilliseconds:remainingMs};
   report.tailSearches=1;
   const tail=guardedPlainTask(current,runtime,{floor:1,searchUpper:plan.searchUpper===0?null:plan.searchUpper,...budget});report.tailSearch=tail;
   report.conservativeFullBoardStateUpperBound=plan.prefixBoardCharge+tail.guardAllowance.conservativeFullBoardStateUpperBound;
   assert(report.conservativeFullBoardStateUpperBound<=plan.fullUpperBudget.maxStates);
   const full=['relaxed-shortcut','threshold-proven'].includes(tail.status)&&Number.isSafeInteger(tail.cost)&&tail.cost>=0&&Array.isArray(tail.drags)
    &&(tail.routeTermination==='minimum-relaxed-route-found'||tail.termination==='relaxed-completion');
   assert(full,'tail-'+tail.termination);assert(tail.cost<=plan.searchUpper,'Tail exceeded fixed parking remainder');tailDrags=tail.drags;
  }
  const drags=[...structuredClone(prefixDrags),...structuredClone(tailDrags)],canonical=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);
  report.canonical=canonical;report.independent=independent;
  assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed,'Original concatenated route failed actual double replay');
  assert.equal(canonical.clearEvents,level.blocks.length);assert.equal(independent.clearEvents,level.blocks.length);
  assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.effectiveDrags,independent.effectiveDrags);
  assert(independent.nonClearingDrags-report.prefixParking<=plan.searchUpper,'Actual tail exceeds fixed remainder');
  return{...report,status:'COMPLETE_ORIGINAL_UPPER_WITNESS',valid:true,complete:true,drags,routeSha256:routeSha256(drags),U:independent.nonClearingDrags,elapsedMilliseconds:Date.now()-started};
 }catch(error){return{...report,status:'UPPER_UNKNOWN',reason:error.message,elapsedMilliseconds:Date.now()-started};}
}

function stockDomain(level){
 assertPlainProofDomain(level);
 for(const body of level.blocks){const w=Math.max(...body.shape.map(p=>p[0]))+1,h=Math.max(...body.shape.map(p=>p[1]))+1;
  assert.equal(new Set(body.shape.map(p=>p.join(','))).size,w*h,'Reviewed new tail stock uses solid original-orientation rectangles only');}
}

/** No search or model mutation. Reserve all pre-U full assignments, every
 * supplied prefix commit and the frozen engine's terminal candidate together.
 * The original lower task has its own independently declared <=10000 budget. */
export function makeLowBandPrefixTailPlan(runtime,candidate,{upperBudget={},lowerBudget={},targetDifficulty,qualificationOnly=false,qualificationBand}={}){
 assertV4Runtime(runtime);assert.equal(typeof qualificationOnly,'boolean');
 const executionEnvironment=prefixExecutionEnvironment(runtime,candidate.executionEnvironment);
 assert(targetDifficulty===1||targetDifficulty===2,'Explicit targetDifficulty 1 or 2 required');
 if(candidate.targetDifficulty!==undefined)assert.equal(candidate.targetDifficulty,targetDifficulty,'Candidate target difficulty is fixed before claim');
 assert(qualificationOnly||qualificationBand===undefined,'Production bands cannot be overridden');
 const band=qualificationBand??LOW_BANDS[targetDifficulty];
 assert(Number.isSafeInteger(band.floor)&&Number.isSafeInteger(band.upper)&&band.floor>=1&&band.floor<=band.upper&&band.upper<=30,'Finite low qualification band');
 const floor=band.floor;
 const {level,prefixDrags,constructionAccounting}=candidate;stockDomain(level);
 assert(candidate.constructionEvidence?.path&&/^[a-f0-9]{64}$/.test(candidate.constructionEvidence.sha256??''),'Bound actual prior construction file required');
 assert(Array.isArray(prefixDrags)&&prefixDrags.length>0);assert(constructionAccounting?.version==='late-region-static-construction-v1');
 const prefixParking=prefixDrags.filter(d=>!d.exitSide).length,tailParkingLimit=band.upper-prefixParking;
 assert(tailParkingLimit>=0,'Fixed prefix already exceeds predeclared difficulty upper');
 for(const key of ['completeWorldReservations','microStates','transitions','elapsedMilliseconds'])
  assert(Number.isSafeInteger(constructionAccounting[key])&&constructionAccounting[key]>=0,`Finite prior construction ${key}`);
 assert(constructionAccounting.completeWorldReservations>=1,'The full new coloured stock must be charged');
 const fullUpperBudget=boundedBudget({...DEFAULT_UPPER,...upperBudget}),lower=reservedGuardBudget({...DEFAULT_LOWER,...lowerBudget});
 const prior=constructionAccounting;
 const remaining={...fullUpperBudget,maxStates:fullUpperBudget.maxStates-prior.completeWorldReservations,
  maxMicroStates:fullUpperBudget.maxMicroStates-prior.microStates,maxTransitions:fullUpperBudget.maxTransitions-prior.transitions,
  maxMilliseconds:fullUpperBudget.maxMilliseconds-prior.elapsedMilliseconds};
 const innerPlan=lowBandInnerPlan(level,prefixDrags,{upperBudget:remaining,lowerBudget:lower,floor,tailParkingLimit});
 return{schemaVersion:4,version:LOW_BAND_PREFIX_TAIL_VERSION,qualificationOnly,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags),
  sourceLevelId:candidate.sourceLevelId,targetDifficulty,band:structuredClone(band),qualificationBand:qualificationBand?structuredClone(qualificationBand):null,
  floor,prefixParking,tailParkingLimit,executionEnvironment,currentRuntimeValidationClaimed:false,
  activePolicy:executionEnvironment.currentActivePolicy,historicalDesignPolicy:executionEnvironment.historicalDesignPolicy,mathematicalContract:executionEnvironment.mathematicalContract,
  sourceLevelSha256:qualificationOnly?null:levelSha256(runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId)),
  constructionAccounting:structuredClone(prior),constructionEvidence:structuredClone(candidate.constructionEvidence),fullUpperBudget,lowerBudget:lower,innerPlan,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,toolchainSha256:runtime.toolchainSha256,
  upperTask:'one-known-prefix-then-one-declared-plain-tail-search',lowerTask:'one-original-full-level-threshold-after-valid-U',
  tailSearchesMaximum:1,alternativePrefixOrFullUpperSearchAllowed:false,failedInputContinuationAllowed:false,
  bandChangeAfterClaimAllowed:false,totalUpperLimit:band.upper,formalReady:false};
}

/** New physical inputs only. One public claim binds the complete opening;
 * the smaller tail is never claimed and never supplies a lower certificate.
 * A failed U immediately seals that opening without trying its original L. */
export async function exploreLowBandPrefixTail(runtime,candidate,{plan,redesignOf,qualificationOnly=false,ledgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 assertV4Runtime(runtime);
 assert.equal(typeof qualificationOnly,'boolean');
 await assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,ledgerDirectory);
 if(!qualificationOnly)assert.equal(path.resolve(ledgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER),'Production uses shared public identity ledger');
 else{const target=path.resolve(ledgerDirectory).toLowerCase(),production=path.resolve(PUBLIC_ATTEMPT_LEDGER).toLowerCase();
  assert(target!==production&&!target.startsWith(production+path.sep),'Qualification must use an isolated private ledger outside public history');}
 assert(plan,'Exact plan must be fixed before first claim');assert.equal(plan.qualificationOnly,qualificationOnly);
 const expected=makeLowBandPrefixTailPlan(runtime,candidate,{upperBudget:plan.fullUpperBudget,lowerBudget:plan.lowerBudget,targetDifficulty:plan.targetDifficulty,qualificationBand:plan.qualificationBand??undefined,qualificationOnly});
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
 for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/');bindings[p]=sha(await fs.readFile(p));}
 for(const [file,digest]of Object.entries(runtime.toolchainBindings))assert.equal(sha(await fs.readFile(file)),digest);
 const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});
 const report={schemaVersion:4,version:LOW_BAND_PREFIX_TAIL_VERSION,exploratory:true,qualificationOnly,catalogEligible:false,
  accepted:false,status:'PREFIX_TAIL_PENDING',formalReady:false,productionChanged:false,sourceLevelId:candidate.sourceLevelId,targetDifficulty:plan.targetDifficulty,
  level,levelSha256:levelSha256(level),plan,attempt,executionEnvironment:plan.executionEnvironment,currentSourceBinding,
  currentRuntimeValidationClaimed:false,toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,
  activePolicy:plan.activePolicy,historicalDesignPolicy:plan.historicalDesignPolicy,mathematicalContract:plan.mathematicalContract,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  designBindings:bindings,designToolchainSha256:levelSha256(bindings),upperConstruction:null,lowerBound:null,route:null,L:null,U:null,
  mathematicalEvidenceValidated:false,designValidated:false,pointerValidated:false,timeValidated:false,reasons:[]};
 try{
  const planFile=path.join(ledgerDirectory,`${attempt.id}.v4-low-band-prefix-tail-plan.json`);
  await fs.writeFile(planFile,JSON.stringify({attempt,plan,prefixDrags,bindings},null,2)+'\n',{flag:'wx'});
  report.planEvidence={path:planFile,sha256:sha(await fs.readFile(planFile))};
  const upper=constructLowBandPrefixUpper(runtime,level,prefixDrags,{plan:plan.innerPlan});report.upperConstruction=upper;
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
   witnessSource:'one-fixed-prefix-and-one-tail-under-shared-construction-budget'};
  if(report.U<plan.floor){report.status='KNOWN_UPPER_BELOW_PREDECLARED_FLOOR';return report;}
  if(report.U>plan.band.upper){report.status='KNOWN_UPPER_ABOVE_PREDECLARED_CEILING';return report;}
  const lower=guardedPlainTask(level,runtime,{floor:plan.floor,...plan.lowerBudget});
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
  const file=path.join(ledgerDirectory,`${attempt.id}.v4-low-band-prefix-tail-result.json`);report.evidenceFile=file;
  await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await ledger.finish(attempt,report);
 }
}

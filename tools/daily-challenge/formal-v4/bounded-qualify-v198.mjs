import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayScheduledRoute} from '../formal-v2/proof-scheduled-route.mjs';
import {createAttemptLedger,selectBoundedStrategy} from '../formal-v3/bounded-proof.mjs';
import {reservedGuardBudget,guardAllowanceFor,guardedPlainTask,guardedIceTask,guardedNativeUpper} from '../formal-v3/reserved-guard-budget.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {loadDailyDifficultyPolicyV198} from './difficulty-policy-v198.mjs';
import {boundedLowerTaskV198} from './bounded-lower-v198.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {prepareAcceptedMechanismClaim,validateFailedMechanismParent} from './accepted-base-adaptation.mjs';

export const V4_PROOF_VERSION='daily-300-frozen-math-first-attempt-tolerance-v198';
export const PUBLIC_ATTEMPT_LEDGER='deliverables/daily-formal-v3-20261008/proof/attempts';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const own='tools/daily-challenge/formal-v4/bounded-qualify-v198.mjs';
async function currentBindings(runtime,staticAudit,policy){
 const files=['tools/daily-challenge/formal-v4/runtime.mjs',own,'tools/daily-challenge/formal-v4/bounded-lower-v198.mjs','tools/daily-challenge/formal-v4/accepted-base-adaptation.mjs','tools/daily-challenge/formal-v3/reserved-guard-budget.mjs'];
 const bindings={...staticAudit.policyBindings,...policy.bindings};for(const file of files)bindings[file]=hash(await fs.readFile(file));
 return bindings;
}

/** New physical inputs only. Existing accepted receipts are preserved through
 * the separate zero-search catalogue migration, never re-solved just to rename
 * a slot. The ORIGINAL public ledger enforces every historical failure; no
 * stage, policy version, id or method change opens another attempt. */
export async function qualifyBoundedCandidateV198(runtime,candidate,{routeBudget={},lowerBudget={},redesignOf,
 routeStrategy='auto',searchUpper=128,ledgerDirectory=PUBLIC_ATTEMPT_LEDGER,qualificationOnly=false,mechanismBaseReceipt}={}){
 assertV4Runtime(runtime);
 if(path.resolve(ledgerDirectory)!==path.resolve(PUBLIC_ATTEMPT_LEDGER)&&!qualificationOnly)throw Error('Production must share the historical public attempt ledger');
 const policy=await loadDailyDifficultyPolicyV198();
 const level=structuredClone(candidate.level),band=policy.bands[candidate.difficulty];if(!band)throw Error('Unknown difficulty');
 const upperOptions=reservedGuardBudget(routeBudget),lowerOptions=reservedGuardBudget(lowerBudget);
 if(!Number.isSafeInteger(searchUpper)||searchUpper<band.lower||searchUpper>256)throw Error('Finite searchUpper required');
 const strategy=selectBoundedStrategy(level,{providedRoute:Array.isArray(candidate.drags),routeStrategy});
 const plan={difficultyPolicyVersion:policy.version,band,policyBindings:policy.bindings,strategy,upperBudget:upperOptions,lowerBudget:lowerOptions,searchUpper,
  inputLevelSha256:levelSha256(level),providedRouteSha256:Array.isArray(candidate.drags)?routeSha256(candidate.drags):null,
  formedBeforeClaim:true,sameExactObjectRevalidationAllowed:false,redesignOf:redesignOf??null,mechanismBaseReceipt:mechanismBaseReceipt??null,
  acceptedBaseMechanismAdaptationRequested:!!mechanismBaseReceipt,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256};
 const report={schemaVersion:4,difficultyPolicyVersion:policy.version,difficultyPolicyBindings:policy.bindings,contractVersion:V4_PROOF_VERSION,formalId:candidate.formalId,stageKey:candidate.stageKey,
  newestMechanism:candidate.newestMechanism,slot:candidate.slot,sourceLevelId:candidate.sourceLevelId,difficulty:candidate.difficulty,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  dailyBudgetRuleVersion:runtime.dailyBudgetRuleVersion,dailyBudgetRuleSha256:runtime.dailyBudgetRuleSha256,
  toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,
  level,levelSha256:levelSha256(level),band,attemptPlan:plan,attemptPlanSha256:levelSha256(plan),
  accepted:false,status:'BLOCKED_STATIC',L:null,U:null,qualificationOnly,
  formalReady:false,designValidated:false,mechanismStrengthValidated:false,pointerValidated:false,timeValidated:false,reasons:[]};
 let attempt,ledger;
 try{
  report.staticAudit=await auditV4StaticCandidate(runtime,{...candidate,level});
  report.sourceLevelSha256=report.staticAudit.sourceLevelSha256;
  report.policyBindings=await currentBindings(runtime,report.staticAudit,policy);
  report.policyToolchainSha256=levelSha256(report.policyBindings);
  if(!report.staticAudit.passed){report.reasons=report.staticAudit.issues;return report;}
  if(!report.staticAudit.support.supported){report.status='UNSUPPORTED_ROUTE_DOMAIN';report.reasons=report.staticAudit.support.reasons;return report;}
  // A custom directory exists solely for isolated synthetic qualification. It
  // cannot produce an eligible receipt and is never used by the production path.
  ledger=await createAttemptLedger(ledgerDirectory);
  if(mechanismBaseReceipt){
   if(redesignOf)throw Error('Failed redesign and accepted-base adaptation are different task boundaries');
   report.acceptedBaseAdaptation=await prepareAcceptedMechanismClaim(level,mechanismBaseReceipt,{ledgerDirectory});
  }
  let ledgerParent=redesignOf;
  if(redesignOf?.includes('-revalidation-')){
   report.failedMechanismParent=await validateFailedMechanismParent(level,redesignOf,{ledgerDirectory});ledgerParent=undefined;
  }
  attempt=await ledger.claim(level,{redesignOf:ledgerParent,allowRevalidation:!!report.acceptedBaseAdaptation});report.attempt=attempt;
  await fs.writeFile(path.join(ledgerDirectory,`${attempt.id}.v4-plan.json`),JSON.stringify({attempt,plan,policyBindings:report.policyBindings},null,2)+'\n',{flag:'wx'});
  let drags=candidate.drags,search=null;
  if(!drags){
   if(['plain-joint','ice-joint'].includes(strategy.route)){
    const budget=Object.fromEntries(Object.keys(lowerOptions).map(k=>[k,Math.min(lowerOptions[k],upperOptions[k])]));
    const ice=strategy.route==='ice-joint';
    search=(ice?guardedIceTask:guardedPlainTask)(level,runtime,{floor:band.lower,searchUpper:band.upper??searchUpper,...budget});
    report.lowerBound={method:ice?'v3-native-static-ice-joint-search':'v3-plain-joint-search',inputLevelSha256:report.levelSha256,
     projectedLevelSha256:null,projection:null,requiredFloor:band.lower,result:search};
    if(!search.drags||!['threshold-proven','relaxed-shortcut'].includes(search.status)){report.status='UNKNOWN_UPPER';report.route={search};return report;}
   }else{
    search=guardedNativeUpper(runtime,level,upperOptions);
    if(!search.witnessFound){report.status=search.status==='unsupported'?'UNSUPPORTED_UPPER':'UNKNOWN_UPPER';report.route={search};return report;}
   }
   drags=search.drags;
  }
  report.drags=structuredClone(drags);report.routeSha256=routeSha256(drags);
  if(candidate.routeSha256!==undefined&&candidate.routeSha256!==report.routeSha256)throw Error('Declared route hash mismatch');
  if(candidate.levelSha256!==undefined&&candidate.levelSha256!==report.levelSha256)throw Error('Declared level hash mismatch');
  const canonical=candidate.timeSchedule?replayScheduledRoute(runtime,level,drags,candidate.timeSchedule):runtime.replayRevisedRoute(level,drags);
  const independent=independentReplay(runtime,level,drags,{timeSchedule:candidate.timeSchedule});
  report.route={search,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256,canonicalReplay:canonical,independentReplay:independent,
   witnessValidation:{providedRoute:!search,searchPerformed:!!search,fullBoardSearchStates:search?.discoveredStates??0,
    drags:drags.length,unitSteps:drags.reduce((n,d)=>n+d.path.length,0)}};
  if(candidate.timeSchedule){report.timeSchedule=structuredClone(candidate.timeSchedule);report.timeScheduleSha256=levelSha256(candidate.timeSchedule);}
  if(!canonical.valid||!canonical.complete||canonical.failed||!independent.valid||!independent.complete||independent.failed
   ||independent.remainingBodies!==0||independent.remainingQueued!==0
   ||canonical.nonClearingDrags!==independent.nonClearingDrags||canonical.effectiveDrags!==drags.length
   ||independent.effectiveDrags!==drags.length||canonical.clearEvents!==independent.clearEvents){report.status='REJECTED_ORIGINAL_ROUTE';return report;}
  report.U=independent.nonClearingDrags;
  if(report.U<band.lower){report.status='COUNTEREXAMPLE_BELOW_BAND';return report;}
  if(band.upper!==null&&report.U>band.upper){report.status='UNKNOWN_UPPER_WITHIN_BAND';return report;}
  if(!report.lowerBound){
   report.lowerBound=boundedLowerTaskV198(runtime,level,candidate.difficulty,policy,lowerOptions);
   if(Number.isSafeInteger(report.lowerBound.result.rawFullBoardStates))report.lowerBound.result.guardAllowance=guardAllowanceFor(report.lowerBound.result);
  }
  const proof=report.lowerBound.result;
  if(proof.status!=='threshold-proven'||proof.thresholdProven!==true||proof.floor!==band.lower||proof.termination!=='below-threshold-exhausted'
   ||proof.guardAllowance?.conservativeFullBoardStateUpperBound>10000||!proof.guardAllowance){report.status=proof.status==='unsupported'?'UNSUPPORTED_LOWER':'UNKNOWN_LOWER';return report;}
  report.L=band.lower;if(!policy.accepts(candidate.difficulty,report.L,report.U))throw Error('Difficulty tolerance proof mismatch');report.accepted=true;report.status='FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER';return report;
 }catch(error){report.status='INVALID_ATTEMPT';report.reasons.push(error.message);return report;}
 finally{
  if(levelSha256(level)!==report.levelSha256){report.accepted=false;report.status='REJECTED_INPUT_MUTATION';}
  for(const [file,expected]of Object.entries({...runtime.toolchainBindings,...report.policyBindings})){
   if(await fs.readFile(file).then(hash).catch(()=>null)!==expected){report.accepted=false;report.status='REJECTED_CHANGED_TOOL';report.reasons.push(file);}
  }
  report.redesignRequired=!!attempt&&!report.accepted;
  report.catalogEligible=report.accepted&&!qualificationOnly;
  if(attempt)await ledger.finish(attempt,report);
 }
}

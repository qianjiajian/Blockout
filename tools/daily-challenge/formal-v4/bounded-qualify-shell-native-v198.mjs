import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {loadDailyDifficultyPolicyV198} from './difficulty-policy-v198.mjs';
import {boundedNativeLowerTaskV198} from './native-lower-v198.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {SHELL_NATIVE_PROOF_VERSION,SHELL_NATIVE_PRIMITIVE,assertShellProvidedNativeDomainV198,assertShellProvidedNativeMathOptionsV198,assertShellNativeLowerEnvelopeV198,accountShellProvidedNativeSearchReceiptV198} from './shell-provided-native-search-budget-v198.mjs';

// Final independent production review must precede enabling this new entry.
// The old selector/qualifier/native engine and all old receipts stay unchanged.
export const NATIVE_PRODUCTION_READY=true;
export const V4_PROOF_VERSION=SHELL_NATIVE_PROOF_VERSION;
export const PUBLIC_ATTEMPT_LEDGER='deliverables/daily-formal-v3-20261008/proof/attempts';
const own='tools/daily-challenge/formal-v4/bounded-qualify-shell-native-v198.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function currentBindings(runtime,staticAudit,policy){
 const files=[own,'tools/daily-challenge/formal-v4/runtime.mjs','tools/daily-challenge/formal-v4/static-contract.mjs','tools/daily-challenge/formal-v4/shell-provided-native-search-budget-v198.mjs','tools/daily-challenge/formal-v4/shell-provided-search-budget-v198.mjs',SHELL_NATIVE_PRIMITIVE.adapterPath,SHELL_NATIVE_PRIMITIVE.enginePath];
 const bindings={...staticAudit.policyBindings,...policy.bindings};for(const file of files)bindings[file]=hash(await fs.readFile(file));
 assert.equal(bindings[SHELL_NATIVE_PRIMITIVE.adapterPath],SHELL_NATIVE_PRIMITIVE.adapterSha256);assert.equal(bindings[SHELL_NATIVE_PRIMITIVE.enginePath],SHELL_NATIVE_PRIMITIVE.engineSha256);return bindings;
}

/** One NEW physical input only. The independently reviewed caller owns full
 * history/freshness/static-visual gates. Here: original public claim, original
 * canonical+independent replay once each, then one full-layer lower, no upper
 * search/fallback/revalidation. Primitive qualification flags remain false;
 * eligible production status describes this whole orchestration, not its
 * research subtask in isolation. It is not design/Pointer/formal acceptance. */
export async function qualifyShellProvidedNativeCandidateV198(runtime,candidate,options){
 assert.equal(NATIVE_PRODUCTION_READY,true,'Native production entry is not independently enabled');
 assertV4Runtime(runtime);assertShellProvidedNativeMathOptionsV198(options,options?.redesignOf);assertShellProvidedNativeDomainV198(candidate);options=structuredClone(options);
 const policy=await loadDailyDifficultyPolicyV198(),level=structuredClone(candidate.level),band=policy.bands[candidate.difficulty];assert(band);
 const plan={difficultyPolicyVersion:policy.version,band,policyBindings:policy.bindings,strategy:{route:'provided',lower:'native-full-layers'},upperBudget:options.routeBudget,lowerBudget:options.lowerBudget,searchUpper:options.searchUpper,
  inputLevelSha256:levelSha256(level),providedRouteSha256:candidate.routeSha256,formedBeforeClaim:true,sameExactObjectRevalidationAllowed:false,redesignOf:options.redesignOf,mechanismBaseReceipt:null,acceptedBaseMechanismAdaptationRequested:false,
  nativePrimitiveAdapter:{path:SHELL_NATIVE_PRIMITIVE.adapterPath,sha256:SHELL_NATIVE_PRIMITIVE.adapterSha256},policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256};
 const report={schemaVersion:4,difficultyPolicyVersion:policy.version,difficultyPolicyBindings:policy.bindings,contractVersion:V4_PROOF_VERSION,formalId:candidate.formalId,stageKey:candidate.stageKey,newestMechanism:candidate.newestMechanism,slot:candidate.slot,sourceLevelId:candidate.sourceLevelId,difficulty:candidate.difficulty,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,dailyBudgetRuleVersion:runtime.dailyBudgetRuleVersion,dailyBudgetRuleSha256:runtime.dailyBudgetRuleSha256,
  toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,level,levelSha256:levelSha256(level),band,attemptPlan:plan,attemptPlanSha256:levelSha256(plan),accepted:false,status:'BLOCKED_STATIC',L:null,U:null,qualificationOnly:false,
  formalReady:false,designValidated:false,mechanismStrengthValidated:false,pointerValidated:false,timeValidated:false,fullHistoryValidationPerformedHere:false,reasons:[],executionCalls:{canonicalReplay:0,independentReplay:0,lower:0,lowerReturned:false}};
 let attempt,ledger;
 try{
  report.staticAudit=await auditV4StaticCandidate(runtime,{...candidate,level});report.sourceLevelSha256=report.staticAudit.sourceLevelSha256;
  report.policyBindings=await currentBindings(runtime,report.staticAudit,policy);report.policyToolchainSha256=levelSha256(report.policyBindings);
  if(!report.staticAudit.passed){report.reasons=report.staticAudit.issues;return report;}
  if(!report.staticAudit.support.supported){report.status='UNSUPPORTED_ROUTE_DOMAIN';report.reasons=report.staticAudit.support.reasons;return report;}
  // No directory override, accepted-base claim, or allowRevalidation option.
  ledger=await createAttemptLedger(PUBLIC_ATTEMPT_LEDGER);attempt=await ledger.claim(level,{redesignOf:options.redesignOf});report.attempt=attempt;
  await fs.writeFile(path.join(PUBLIC_ATTEMPT_LEDGER,`${attempt.id}.v4-plan.json`),JSON.stringify({attempt,plan,policyBindings:report.policyBindings},null,2)+'\n',{flag:'wx'});
  const drags=structuredClone(candidate.drags);report.drags=drags;report.routeSha256=routeSha256(drags);assert.equal(report.routeSha256,candidate.routeSha256);assert.equal(report.levelSha256,candidate.levelSha256);
  report.route={search:null,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256,canonicalReplay:null,independentReplay:null,witnessValidation:{providedRoute:true,searchPerformed:false,fullBoardSearchStates:0,drags:drags.length,unitSteps:drags.reduce((n,d)=>n+d.path.length,0)}};
  report.executionCalls.canonicalReplay++;report.route.canonicalReplay=runtime.replayRevisedRoute(level,drags);
  report.executionCalls.independentReplay++;report.route.independentReplay=independentReplay(runtime,level,drags);
  const a=report.route.canonicalReplay,b=report.route.independentReplay;
  if(!a.valid||!a.complete||a.failed||!b.valid||!b.complete||b.failed||b.remainingBodies!==0||b.remainingQueued!==0||a.nonClearingDrags!==b.nonClearingDrags||a.effectiveDrags!==drags.length||b.effectiveDrags!==drags.length||a.clearEvents!==b.clearEvents){report.status='REJECTED_ORIGINAL_ROUTE';return report;}
  report.U=b.nonClearingDrags;if(report.U<band.lower){report.status='COUNTEREXAMPLE_BELOW_BAND';return report;}if(band.upper!==null&&report.U>band.upper){report.status='UNKNOWN_UPPER_WITHIN_BAND';return report;}
  report.executionCalls.lower++;report.lowerBound=boundedNativeLowerTaskV198(runtime,level,candidate.difficulty,policy,options.lowerBudget);report.executionCalls.lowerReturned=true;
  const accounting=assertShellNativeLowerEnvelopeV198(report.lowerBound,report.levelSha256,band.lower),proof=report.lowerBound.result;
  if(proof.status!=='threshold-proven'||proof.thresholdProven!==true||accounting.accountingStatus!=='RECORDED'){report.status=proof.status==='unsupported'?'UNSUPPORTED_LOWER':'UNKNOWN_LOWER';return report;}
  report.L=band.lower;assert(policy.accepts(candidate.difficulty,report.L,report.U));report.accepted=true;report.status='FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER';return report;
 }catch(error){report.accepted=false;report.status='INVALID_ATTEMPT';report.reasons.push(error.message);return report;}
 finally{
  try{
   if(levelSha256(level)!==report.levelSha256||levelSha256(candidate.level)!==report.levelSha256||routeSha256(candidate.drags)!==plan.providedRouteSha256){report.accepted=false;report.status='REJECTED_INPUT_MUTATION';}
   for(const[file,expected]of Object.entries({...runtime.toolchainBindings,...report.policyBindings,...report.lowerBound?.bindings}))if(await fs.readFile(file).then(hash).catch(()=>null)!==expected){report.accepted=false;report.status='REJECTED_CHANGED_TOOL';report.reasons.push(file);}
   report.searchAccounting=accountShellProvidedNativeSearchReceiptV198(report,{entered:true,returned:true,failedParentId:options.redesignOf,providedRouteSha256:plan.providedRouteSha256});
  }catch(error){report.accepted=false;report.status='INVALID_ATTEMPT';report.reasons.push('Final verification: '+error.message);report.searchAccounting=null;}
  finally{
   report.redesignRequired=!!attempt&&!report.accepted;report.catalogEligible=report.accepted;
   // An ambiguous finish throws to the owner: never silently return/reclaim.
   if(attempt)await ledger.finish(attempt,report);
  }
 }
}

/** Native static-ice adapter. Keeps the stable receipt schema and stable
 * proof-contract bytes unchanged; only new ice receipts bind this extension.
 * Never use it as a fallback after another solver exhausted this same object.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {
  loadLeagueProofRuntime,createLeagueAttemptLedger,auditLeagueStatic,auditLeagueScoring,
  boundedBudget,leagueBand,levelSha256,routeSha256,PROOF_VERSION,RULE_VERSION,
} from './proof-contract.mjs';
import {independentReplay} from '../daily-challenge/formal-v2/contract.mjs';
import {boundedIceTask,assertIceProofDomain,ICE_PROOF_VERSION,iceProofToolBindings} from './proof-ice-bounded.mjs';

export const ICE_CONTRACT_VERSION='league-v2-native-static-ice-contract-1';
export const ICE_LOWER_METHOD='league-native-static-ice-held-raw-v1';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const HISTORY_ROOT=path.join(ROOT,'deliverables/league-v2-20261008');
const DEFAULT_LEDGER='deliverables/league-v2-20261008/mechanisms/proof-attempts';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let runtimePromise;

export const loadLeagueIceProofRuntime=()=>runtimePromise??=(async()=>{
  const base=await loadLeagueProofRuntime(),ice=await iceProofToolBindings(base);
  const toolchainBindings={...ice.bindings,'tools/league-v2/proof-ice-contract.mjs':sha(await fs.readFile(fileURLToPath(import.meta.url)))};
  return{...base,toolchainBindings,toolchainSha256:levelSha256(toolchainBindings),iceContractVersion:ICE_CONTRACT_VERSION,iceProofVersion:ICE_PROOF_VERSION};
})();

const physicalAttemptId=level=>{
  const physics=structuredClone(level);
  for(const field of ['id','name','difficulty','reward','parMoves','preservedMoveTarget','designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation'])delete physics[field];
  return levelSha256(physics);
};
/** Exact cross-directory same-object guard in addition to the shared ledger's
 * per-lineage mandatory colour+shape redesign guard. Read-only: the caller may
 * not bypass an earlier attempt by selecting a fresh ledger directory. */
export async function findPriorIceInputAttempt(level,historyRoot=HISTORY_ROOT){
  const filename=physicalAttemptId(level)+'.request.json';
  let entries;try{entries=await fs.readdir(historyRoot,{recursive:true});}catch(e){if(e.code==='ENOENT')return null;throw e;}
  const prior=entries.find(file=>path.basename(file)===filename);
  return prior?path.join(historyRoot,prior).replaceAll('\\','/'):null;
}

export function inspectNativeIceLower(lower,level,band){
  const errors=[],r=lower?.result,hash=levelSha256(level),count=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000;
  if(lower?.method!==ICE_LOWER_METHOD||lower.inputLevelSha256!==hash||lower.requiredFloor!==band.lower||lower.projection!==null||lower.projectedLevelSha256!==null)errors.push('native-ice-lower-object-or-method');
  if(r?.contractVersion!==ICE_PROOF_VERSION||r.sourceLevelSha256!==hash||r.floor!==band.lower||r.status!=='threshold-proven'||r.thresholdProven!==true||r.termination!=='below-threshold-exhausted')errors.push('native-ice-lower-not-certified');
  if(!count(r?.rawFullBoardStates)||r.rawFullBoardStates<1||r.discoveredStates!==r.rawFullBoardStates||!count(r?.exploredStates)||!count(r?.quotientDiscoveredStates)||!Number.isSafeInteger(r?.budget?.maxStates)||r.budget.maxStates<1||r.budget.maxStates>10000||r.rawFullBoardStates>r.budget.maxStates)errors.push('native-ice-raw-state-budget');
  try{assertIceProofDomain(level);}catch(e){errors.push('native-ice-unsupported-domain: '+e.message);}
  return errors;
}

/** One native search per candidate: no drags => it constructs the minimum
 * optional-exit witness while proving L. Supplied drags => validate both actual
 * interpreters first, then only prove below the band floor. No second search,
 * no plain projection, no attempt reset, no upper retry after UNKNOWN.
 *
 * candidate: {index, sourceLevelId, level, drags?, specials?, requiredMechanisms?}
 * options: {budget?, ledgerDirectory?, attemptKey?, redesignOf?}
 */
export async function verifyLeagueIceCandidate(runtime,candidate,{budget={},ledgerDirectory=DEFAULT_LEDGER,attemptKey,redesignOf}={}){
  if(runtime.leagueRuleVersion!==RULE_VERSION||runtime.iceContractVersion!==ICE_CONTRACT_VERSION||runtime.iceProofVersion!==ICE_PROOF_VERSION||!runtime.toolchainBindings?.['tools/league-v2/proof-ice-contract.mjs']||levelSha256(runtime.toolchainBindings)!==runtime.toolchainSha256)throw Error('Use loadLeagueIceProofRuntime');
  const options=boundedBudget(budget),band=leagueBand(candidate.index),level=structuredClone(candidate.level);
  if(candidate.timeSchedule!==undefined)throw Error('Native static-ice domain has no timed schedule');
  const prior=await findPriorIceInputAttempt(level);if(prior)throw Error('INPUT_ALREADY_ATTEMPTED_ACROSS_LEAGUE_TOOLS: '+prior);
  const ledger=await createLeagueAttemptLedger(ledgerDirectory),attempt=await ledger.claim(level,{attemptKey:attemptKey??`league-${candidate.index}`,redesignOf});
  const report={contractVersion:PROOF_VERSION,ruleVersion:RULE_VERSION,index:candidate.index,sourceLevelId:candidate.sourceLevelId,level,levelSha256:levelSha256(level),band,attempt,
    accepted:false,formalReady:false,designValidated:false,mechanismStrengthValidated:false,pointerValidated:false,timeValidated:false,L:null,U:null,
    toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,reasons:[],
    proofExtension:{version:ICE_CONTRACT_VERSION,primitiveVersion:ICE_PROOF_VERSION,domain:'ordinary-static-single-layer-bodies-and-gates-with-only-ice-counters',searchInvocations:0,projectionUsed:false}};
  try{
    try{assertIceProofDomain(level);}catch(e){report.status='UNSUPPORTED_NATIVE_ICE';report.reasons.push(e.message);return report;}
    report.staticAudit=await auditLeagueStatic(runtime,{...candidate,level});report.sourceLevelSha256=report.staticAudit.sourceLevelSha256;
    if(!report.staticAudit.passed){report.status='REJECTED_STATIC';report.reasons=report.staticAudit.issues;return report;}
    if(!report.staticAudit.support.supported){report.status='UNSUPPORTED_ROUTE';report.reasons=report.staticAudit.support.reasons;return report;}
    let drags=candidate.drags?structuredClone(candidate.drags):null;
    const setRoute=()=>{
      report.drags=drags;report.routeSha256=routeSha256(drags);
      if(candidate.routeSha256&&candidate.routeSha256!==report.routeSha256)throw Error('Declared route hash mismatch');
      const canonical=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);
      report.route={search:null,canonicalReplay:canonical,independentReplay:independent,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256};
      const valid=canonical.valid&&canonical.complete&&independent.valid&&independent.complete&&!independent.failed&&independent.remainingBodies===0&&independent.remainingQueued===0&&canonical.effectiveDrags===drags.length&&independent.effectiveDrags===drags.length&&independent.trace?.length===drags.length&&canonical.nonClearingDrags===independent.nonClearingDrags&&canonical.clearEvents===level.blocks.length&&independent.clearEvents===level.blocks.length;
      if(!valid){report.status='REJECTED_ROUTE';return false;}
      report.U=independent.nonClearingDrags;
      if(report.U<band.lower||report.U>band.upper){report.status='ROUTE_OUTSIDE_BAND';return false;}
      return true;
    };
    if(drags&&!setRoute())return report;
    report.proofExtension.searchInvocations=1;
    const result=boundedIceTask(level,runtime,{floor:band.lower,searchUpper:drags?null:band.upper,...options});
    report.lowerBound={method:ICE_LOWER_METHOD,inputLevelSha256:report.levelSha256,projectedLevelSha256:null,projection:null,requiredFloor:band.lower,result};
    const lowerErrors=inspectNativeIceLower(report.lowerBound,level,band);
    if(lowerErrors.length){report.status=result.status==='relaxed-shortcut'?'BELOW_DIFFICULTY_BAND':'UNKNOWN_LOWER';report.reasons.push(...lowerErrors);return report;}
    if(!drags){
      if(!Array.isArray(result.drags)||!Number.isSafeInteger(result.cost)){report.status='UNKNOWN_UPPER';report.reasons.push('Single native search found no complete in-band witness');return report;}
      drags=structuredClone(result.drags);if(!setRoute())return report;
      report.route.search={...result,witnessFound:true,lowerBoundCertified:true,sharedSearchWithLower:true};
      if(report.U!==result.cost){report.status='REJECTED_ROUTE';report.reasons.push('Optional witness cost differs from both actual-model interpreters');return report;}
    }
    report.L=band.lower;
    report.scoring=auditLeagueScoring(runtime,level,drags,{index:candidate.index,specials:candidate.specials});report.specials=report.scoring.specials;
    report.accepted=true;report.status='LEAGUE_SPATIAL_SCORING_VERIFIED_AWAITING_DESIGN_POINTER';return report;
  }catch(e){report.status='INVALID';report.reasons.push(e.message);return report;}
  finally{
    if(levelSha256(level)!==report.levelSha256){report.accepted=false;report.status='INPUT_MUTATED';}
    // Bind exact extension/runtime/art bytes, and reject an in-flight edit.
    for(const [file,hash]of Object.entries(report.toolchainBindings)){
      if(await fs.readFile(path.resolve(ROOT,file)).then(sha).catch(()=>null)!==hash){report.accepted=false;report.status='STALE_TOOLCHAIN';report.reasons.push('Input changed: '+file);}
    }
    for(const [file,hash]of Object.entries(report.staticAudit?.assetBindings??{})){
      if(await fs.readFile(path.resolve(ROOT,'public',file)).then(sha).catch(()=>null)!==hash){report.accepted=false;report.status='STALE_TOOLCHAIN';report.reasons.push('Sprite changed: '+file);}
    }
    report.proofReceipt=await ledger.finish(attempt,report);
  }
}

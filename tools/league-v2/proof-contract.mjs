import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadRuntime,levelSha256,routeSha256,auditStaticCandidate,independentReplay} from '../daily-challenge/formal-v2/contract.mjs';
import {boundedBudget,boundedPlainTask,boundedLowerTask,boundedUpperSearch,designFingerprints} from './proof-bounded.mjs';
import {canonicalExit,replayScheduledRoute,validateTimeSchedule} from '../daily-challenge/formal-v2/proof-scheduled-route.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

export {levelSha256,routeSha256,boundedBudget,boundedPlainTask,boundedUpperSearch,designFingerprints};
export const PROOF_VERSION='league-v2-bounded-held-gesture-2-raw-committed';
export const RULE_VERSION='1.155.0';
export const PROOF_ROOT='deliverables/league-v2-20261008/proof';
export const leagueBand=index=>{if(!Number.isSafeInteger(index)||index<1||index>100)throw Error('League index must be 1–100');return index%5===3?{difficulty:2,lower:21,upper:30}:{difficulty:1,lower:16,upper:20};};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
let runtimePromise;
export const loadLeagueProofRuntime=()=>runtimePromise??=(async()=>{
  const lock=verifyRulesLock();if(!lock.ok||lock.activeVersion!==RULE_VERSION)throw Error(`Active ${RULE_VERSION} lock required`);
  const runtime=await loadRuntime(),entry=[
    'export {LeagueRun} from "./src/core/leagueRun.ts";',
    'export {createLeague,finishLeagueAttempt} from "./src/core/league.ts";',
  ].join('\n');
  const built=await build({stdin:{contents:entry,resolveDir:ROOT,loader:'ts'},bundle:true,metafile:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
  const league=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  const own=['tools/league-v2/proof-contract.mjs','tools/league-v2/proof-bounded.mjs',`docs/rules/mechanism-rules-v${RULE_VERSION}.md`];
  const bindings={...runtime.toolchainBindings};
  for(const file of [...own,...Object.keys(built.metafile.inputs).filter(file=>file!=='<stdin>')])bindings[file.replaceAll('\\','/')]=digest(await fs.readFile(path.resolve(ROOT,file)));
  return {...runtime,...league,toolchainBindings:bindings,toolchainSha256:levelSha256(bindings),leagueRuleVersion:RULE_VERSION};
})();

/** One persistent line of attempts per caller-owned candidate lineage. A failed
 * board cannot be restarted by changing metadata, changing tools or omitting
 * redesignOf. Colours AND shape inventory must differ before another search.
 * Exact prior successful reports may be replayed, never searched a second time.
 */
export async function createLeagueAttemptLedger(directory=path.join(PROOF_ROOT,'attempts')){
  await fs.mkdir(directory,{recursive:true});
  return {
    async claim(level,{attemptKey='pool',redesignOf,retryUnsearchedConfiguration=false}={}){
      if(!/^[a-zA-Z0-9_-]{1,100}$/.test(attemptKey))throw Error('Invalid attemptKey');
      const fingerprints=designFingerprints(level),full=levelSha256(level);
      const physics=structuredClone(level);for(const field of ['id','name','difficulty','reward','parMoves','preservedMoveTarget','designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation'])delete physics[field];
      const baseId=levelSha256(physics),slot=path.join(directory,`${attemptKey}.latest.json`);let id=baseId,configurationRetry=null;
      let prior;try{prior=JSON.parse(await fs.readFile(slot,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
      if(prior){
        let result;try{result=JSON.parse(await fs.readFile(path.join(directory,`${prior.id}.result.json`),'utf8'));}catch(error){if(error.code==='ENOENT')throw Error('ATTEMPT_STILL_OPEN: cannot restart uncompleted attempt');throw error;}
        const demonstrablyUnsearched=result.status==='INVALID'&&result.reasons?.length===1&&/^Invalid bounded budget /.test(result.reasons[0])&&!result.lowerBound&&!result.route?.search;
        if(retryUnsearchedConfiguration&&demonstrablyUnsearched&&prior.levelSha256===full){
          configurationRetry={priorAttemptId:prior.id,reason:result.reasons[0],upperSearchStates:0,lowerSearchStates:0};
          id=`${baseId}.configuration-retry`;
        }else if(!result.accepted){
          if(redesignOf!==undefined&&redesignOf!==prior.id)throw Error('Redesign parent must be latest failed attempt');
          const oldColors=new Map(prior.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)]));
          const shared=fingerprints.colorAssignments.filter(b=>oldColors.has(b.id));
          const colorChanged=shared.length?shared.some(b=>oldColors.get(b.id)!==JSON.stringify(b.colors)):
            levelSha256(prior.colorAssignments.map(b=>b.colors).sort())!==levelSha256(fingerprints.colorAssignments.map(b=>b.colors).sort());
          if(prior.shapeSha256===fingerprints.shapeSha256||prior.colorSha256===fingerprints.colorSha256||!colorChanged)throw Error('FAILED_INPUT_REQUIRES_BOTH_COLOUR_AND_SHAPE_CHANGE');
        }
      }else if(redesignOf)throw Error('Unknown redesign lineage');
      const request={id,attemptKey,levelSha256:full,...fingerprints,redesignOf:prior?.id??null,configurationRetry,startedAt:new Date().toISOString()};
      try{await fs.writeFile(path.join(directory,`${id}.request.json`),JSON.stringify(request,null,2)+'\n',{flag:'wx'});}
      catch(error){if(error.code==='EEXIST')throw Error('INPUT_ALREADY_ATTEMPTED: reuse evidence, do not repeat search');throw error;}
      await fs.writeFile(slot,JSON.stringify(request,null,2)+'\n');return request;
    },
    async finish(request,report){
      const receipt=path.join(directory,`${request.id}.result.json`).replaceAll('\\','/');
      await fs.writeFile(receipt,JSON.stringify({...report,proofReceipt:receipt},null,2)+'\n',{flag:'wx'});return receipt;
    },
  };
}

/** Candidate-pool primitive: a SINGLE lower search also emits a minimum
 * optional-exit witness when one is found. Canonical replay is independent;
 * optional exit paths are never silently accepted as actual player routes. */
export async function probePlainLeagueLevel(runtime,candidate,{ledgerDirectory=path.join(PROOF_ROOT,'plain-attempts'),floor=16,searchUpper=30,budget={},redesignOf}={}){
  const options=boundedBudget(budget),level=structuredClone(candidate.level),ledger=await createLeagueAttemptLedger(ledgerDirectory);
  const attempt=await ledger.claim(level,{attemptKey:candidate.attemptKey??'pool',redesignOf});
  const report={contractVersion:PROOF_VERSION,ruleVersion:RULE_VERSION,attempt,level,sourceLevelId:candidate.sourceLevelId,
    levelSha256:levelSha256(level),toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,accepted:false,formalReady:false,L:null,U:null};
  try{
    runtime.validateLevel(level);
    report.lower=boundedPlainTask(level,runtime,{floor,searchUpper,...options});
    report.status=report.lower.status;
    if(report.lower.status==='threshold-proven'&&report.lower.drags&&report.lower.cost>=floor){
      report.drags=report.lower.drags;report.routeSha256=routeSha256(report.drags);
      report.canonicalReplay=runtime.replayRevisedRoute(level,report.drags);report.independentReplay=independentReplay(runtime,level,report.drags);
      const a=report.canonicalReplay,b=report.independentReplay;
      if(a.valid&&a.complete&&b.valid&&b.complete&&a.nonClearingDrags===b.nonClearingDrags&&b.nonClearingDrags===report.lower.cost){
        report.L=report.U=b.nonClearingDrags;report.accepted=true;report.status='PLAIN_EXACT_BAND_EVIDENCE';
      }else report.status='OPTIONAL_ROUTE_NOT_CANONICAL';
    }
  }catch(error){report.status='INVALID';report.reason=error.message;}
  report.proofReceipt=await ledger.finish(attempt,report);return report;
}

export async function auditLeagueStatic(runtime,candidate){
  const band=leagueBand(candidate.index),stage=[...runtime.MECHANISM_GUIDE].filter(m=>m.unlockLevel<=candidate.index).at(-1);
  if(!stage)throw Error('No unlocked mechanism stage');
  // Reuse construction, coverage, real art-file and source-mask auditing. The
  // two daily-only id/time requirements are replaced explicitly below.
  const stageKey=`mechanisms-${stage.id}-${stage.unlockLevel}`;
  const audit=await auditStaticCandidate(runtime,{...candidate,difficulty:band.difficulty,stageKey,formalId:`daily-${stageKey}-d${band.difficulty}-league`});
  // League uses a separately audited 100-slot mechanism rotation plan; daily
  // requires the newest mechanism in every slot of a stage, league does not.
  const issues=audit.issues.filter(issue=>!['runtime-level-id-must-equal-source-id','mainline-time-limit-mismatch'].includes(issue)&&!issue.startsWith('missing-current-stage-mechanism:'));
  for(const mechanism of candidate.requiredMechanisms??[]){
    if(!runtime.MECHANISM_GUIDE.some(m=>m.id===mechanism))issues.push(`unknown-required-mechanism:${mechanism}`);
    else if(!audit.mechanisms.includes(mechanism))issues.push(`missing-plan-mechanism:${mechanism}`);
  }
  if(candidate.level.timeSeconds!==180)issues.push('league-time-limit-must-be-180');
  if(candidate.level.reward!==0)issues.push('league-single-level-reward-must-be-zero');
  if(candidate.level.difficulty!==(band.difficulty===2?'super':'hard'))issues.push('league-difficulty-cadence-mismatch');
  if(candidate.level.id!==900000+candidate.index)issues.push('league-formal-id-must-match-index');
  return {...audit,issues,passed:issues.length===0,leagueIndex:candidate.index,stageKey,band};
}

const rectangle=shape=>new Set(shape.map(p=>p.join(','))).size===(Math.max(...shape.map(p=>p[0]))-Math.min(...shape.map(p=>p[0]))+1)*(Math.max(...shape.map(p=>p[1]))-Math.min(...shape.map(p=>p[1]))+1);
/** All first-drag held positions, not just a straight initial ray. */
export function openingExitAudit(runtime,level,blockId){
  const model=new runtime.PuzzleModel(structuredClone(level)),body=model.getBlock(blockId);
  if(!body||!model.isBlockActive(body))return {canExit:false,heldStates:0,reason:'initially-unavailable'};
  const queue=[model],seen=new Set([levelSha256(model.snapshot())]);let explored=0;
  for(let i=0;i<queue.length;i++){
    if(++explored>10000)return {canExit:null,heldStates:seen.size,reason:'held-reachability-budget'};
    const current=queue[i],held=current.getBlock(blockId);
    if(current.possibleExitSides(held).length)return {canExit:true,heldStates:seen.size};
    for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
      const next=current.clone();next.beginAction();if(!next.moveBlockStep(blockId,held.x+dx,held.y+dy))continue;
      const key=levelSha256(next.snapshot());if(seen.has(key))continue;
      if(seen.size>=10000)return {canExit:null,heldStates:seen.size,reason:'held-reachability-budget'};
      seen.add(key);queue.push(next);
    }
  }return {canExit:false,heldStates:seen.size};
}

export function auditLeagueScoring(runtime,level,drags,{index=1,specials,timeSchedule}={}){
  const now=Date.UTC(2026,9,8),state=runtime.createLeague(now,1973,0),probe=new runtime.PuzzleModel(structuredClone(level),{deferExitCompletion:true});
  probe.startCountdown();const removals=[];
  const schedule=timeSchedule?validateTimeSchedule(timeSchedule,runtime):null;
  for(const [i,drag]of drags.entries()){
    if(schedule)probe.tick(schedule.secondsPerDrag);probe.beginAction();
    for(const p of drag.path){if(schedule)probe.tick(schedule.secondsPerUnitStep);if(!probe.moveBlockStep(drag.blockId,...p))throw Error('Scoring route move rejected');}
    const result=drag.exitSide?probe.tryExit(drag.blockId,drag.exitSide):null;
    if(!probe.commitAction()||result&&!result.ok)throw Error('Scoring route action rejected');
    if(result){if(schedule)probe.tick(schedule.secondsPerExitAnimation);if(result.exitAnimationId)probe.completeExitAnimation(result.exitAnimationId);}
    if(result?.ok&&!result.layerRemoved&&!probe.getBlock(drag.blockId))removals.push({blockId:drag.blockId,dragIndex:i+1});
  }
  if(!probe.snapshot().complete||probe.snapshot().queuedBlocks.length||probe.snapshot().failed)throw Error('Incomplete scoring route');
  const eligible=removals.filter(row=>row.dragIndex>drags.length/2).map(row=>({...row,block:level.blocks.find(b=>b.id===row.blockId)}))
    .filter(row=>row.block&&rectangle(row.block.shape)).map(row=>({...row,opening:openingExitAudit(runtime,level,row.blockId)})).filter(row=>row.opening.canExit===false);
  const ids=specials??eligible.slice(-Math.min(3,eligible.length)).map(row=>row.blockId);
  if(!Array.isArray(ids)||ids.length<1||ids.length>3||new Set(ids).size!==ids.length||ids.some(id=>!eligible.some(row=>row.blockId===id)))throw Error('Need 1–3 rectangular late-removal non-opening-exit scoring bodies');
  const run=new runtime.LeagueRun(state,index,structuredClone(level),ids,now);run.model.startCountdown();const events=[];
  for(const [i,drag]of drags.entries()){
    if(schedule)run.model.tick(schedule.secondsPerDrag);run.model.beginAction();
    for(const p of drag.path){if(schedule)run.model.tick(schedule.secondsPerUnitStep);if(!run.model.moveBlockStep(drag.blockId,...p))throw Error('LeagueRun route move rejected');}
    const exit=drag.exitSide?run.model.tryExit(drag.blockId,drag.exitSide):null;
    if(!run.model.commitAction()||exit&&!exit.ok)throw Error('LeagueRun action rejected');
    if(exit){if(schedule)run.model.tick(schedule.secondsPerExitAnimation);if(exit.exitAnimationId)run.model.completeExitAnimation(exit.exitAnimationId);run.recordRemoval(exit,now+(i+1)*1000);}
    events.push({dragIndex:i+1,blockId:drag.blockId,points:run.provisionalPoints,complete:run.successful});
  }
  const settled=runtime.finishLeagueAttempt(state,run.attempt,run.successful,run.completedMs??now),failed=runtime.finishLeagueAttempt(state,run.attempt,false,now+1000);
  const expected=ids.length*10;
  if(!run.successful||run.provisionalPoints!==expected||settled.points!==expected||settled.state.season.score!==expected||failed.state.season.score!==0)throw Error('Real league success/failure settlement mismatch');
  run.discard();if(run.provisionalPoints!==0)throw Error('Discard retained score');
  return {passed:true,specials:ids,expectedPoints:expected,successPoints:settled.points,failurePoints:failed.state.season.score,discardPoints:run.provisionalPoints,
    selected:eligible.filter(row=>ids.includes(row.blockId)).map(({block,...row})=>row),events};
}

export async function verifyLeagueCandidate(runtime,candidate,{ledgerDirectory=path.join(PROOF_ROOT,'final-attempts'),lowerBudget={},routeBudget={},redesignOf,attemptKey,retryUnsearchedConfiguration=false}={}){
  if(runtime.leagueRuleVersion!==RULE_VERSION)throw Error('Use loadLeagueProofRuntime');
  const lowerOptions=boundedBudget(lowerBudget),routeOptions=boundedBudget(routeBudget);
  const level=structuredClone(candidate.level),band=leagueBand(candidate.index),ledger=await createLeagueAttemptLedger(ledgerDirectory);
  const attempt=await ledger.claim(level,{attemptKey:attemptKey??`level-${candidate.index}`,redesignOf,retryUnsearchedConfiguration});
  const report={contractVersion:PROOF_VERSION,ruleVersion:RULE_VERSION,index:candidate.index,sourceLevelId:candidate.sourceLevelId,level,
    levelSha256:levelSha256(level),band,attempt,accepted:false,formalReady:false,designValidated:false,mechanismStrengthValidated:false,pointerValidated:false,timeValidated:false,L:null,U:null,
    toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,reasons:[]};
  try{
    report.staticAudit=await auditLeagueStatic(runtime,{...candidate,level});report.sourceLevelSha256=report.staticAudit.sourceLevelSha256;
    if(!report.staticAudit.passed){report.status='REJECTED_STATIC';report.reasons=report.staticAudit.issues;return report;}
    if(!report.staticAudit.support.supported){report.status='UNSUPPORTED_ROUTE';report.reasons=report.staticAudit.support.reasons;return report;}
    let drags=candidate.drags,search=null;
    if(!drags){search=boundedUpperSearch(runtime,level,routeOptions);if(!search.witnessFound){report.route={search};report.status='UNKNOWN_UPPER';return report;}drags=search.drags;}
    report.drags=structuredClone(drags);report.routeSha256=routeSha256(drags);
    if(candidate.routeSha256&&candidate.routeSha256!==report.routeSha256)throw Error('Declared route hash mismatch');
    if(candidate.timeSchedule)report.timeSchedule=structuredClone(candidate.timeSchedule);
    const canonical=candidate.timeSchedule?replayScheduledRoute(runtime,level,drags,candidate.timeSchedule):runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags,{timeSchedule:candidate.timeSchedule});
    report.route={search,canonicalReplay:canonical,independentReplay:independent,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256};
    if(!canonical.valid||!canonical.complete||!independent.valid||!independent.complete||canonical.nonClearingDrags!==independent.nonClearingDrags||canonical.effectiveDrags!==independent.effectiveDrags||canonical.clearEvents!==independent.clearEvents){report.status='REJECTED_ROUTE';return report;}
    report.U=independent.nonClearingDrags;if(report.U<band.lower||report.U>band.upper){report.status='ROUTE_OUTSIDE_BAND';return report;}
    report.lowerBound=boundedLowerTask(runtime,level,band.difficulty,lowerOptions);
    const lower=report.lowerBound.result;
    if(lower.status!=='threshold-proven'||lower.thresholdProven!==true||lower.floor!==band.lower||lower.termination!=='below-threshold-exhausted'){report.status='UNKNOWN_LOWER';return report;}
    report.L=band.lower;report.scoring=auditLeagueScoring(runtime,level,drags,{index:candidate.index,specials:candidate.specials,timeSchedule:candidate.timeSchedule});report.specials=report.scoring.specials;
    report.accepted=true;report.status='LEAGUE_SPATIAL_SCORING_VERIFIED_AWAITING_DESIGN_POINTER';return report;
  }catch(error){report.status='INVALID';report.reasons.push(error.message);return report;}
  finally{
    if(levelSha256(level)!==report.levelSha256){report.accepted=false;report.status='INPUT_MUTATED';}
    report.proofReceipt=await ledger.finish(attempt,report);
  }
}

/** Exactly one stricter raw-state audit for a previously SUCCESSFUL pre-raw
 * input. Old failures, partial floors and budget stops are never restartable.
 * Revalidation leaves the original report unchanged and claims the physical
 * input once in a dedicated fixed ledger. Exhaustion makes it UNKNOWN there.
 */
export async function revalidateSuccessfulReceipt(runtime,receiptPath){
  const old=JSON.parse(await fs.readFile(receiptPath,'utf8'));
  const prior=old.lower??old.lowerBound?.result;
  if(old.accepted!==true||!old.level||old.levelSha256!==levelSha256(old.level)||!prior||prior.status!=='threshold-proven'||prior.thresholdProven!==true||prior.termination!=='below-threshold-exhausted')throw Error('Only complete successful pre-raw evidence can be revalidated');
  if(prior.rawFullBoardStates!==undefined)throw Error('Already audited under raw full-board rule');
  if(!old.drags?.length||old.routeSha256!==routeSha256(old.drags))throw Error('Prior successful route binding mismatch');
  const valid=runtime.replayRevisedRoute(old.level,old.drags);
  if(!valid.valid||!valid.complete||valid.nonClearingDrags!==old.U)throw Error('Prior route no longer matches current runtime');
  const ledgerDirectory=path.join(PROOF_ROOT,'raw-success-revalidation');
  let report;
  if(old.index!==undefined){
    report=await verifyLeagueCandidate(runtime,{index:old.index,sourceLevelId:old.sourceLevelId,level:old.level,drags:old.drags,specials:old.specials,timeSchedule:old.timeSchedule},
      {ledgerDirectory,attemptKey:`prior-${old.attempt.id.slice(0,64)}`,lowerBudget:prior.budget});
  }else{
    report=await probePlainLeagueLevel(runtime,{level:old.level,sourceLevelId:old.sourceLevelId,attemptKey:`prior-${old.attempt.id.slice(0,64)}`},
      {ledgerDirectory,floor:prior.floor,searchUpper:Math.max(old.U,prior.floor),budget:prior.budget});
  }
  const link={previousReceipt:receiptPath,previousReceiptSha256:digest(await fs.readFile(receiptPath)),previousLevelSha256:old.levelSha256,
    nextReceipt:report.proofReceipt,nextStatus:report.status,accepted:report.accepted,rawFullBoardStates:(report.lower??report.lowerBound?.result)?.rawFullBoardStates};
  await fs.writeFile(`${report.proofReceipt}.revalidation-link.json`,JSON.stringify(link,null,2)+'\n',{flag:'wx'});
  return report;
}

/** League source contours are disclosed adaptations, not frozen daily masks.
 * This extension removes exactly the inherited fixed-mask issue, after a
 * separately bound exterior-cut audit. Stable proof-contract bytes stay intact.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadLeagueProofRuntime,createLeagueAttemptLedger,auditLeagueStatic,auditLeagueScoring,boundedBudget,
  levelSha256,routeSha256,leagueBand,PROOF_VERSION,RULE_VERSION} from './proof-contract.mjs';
import {boundedLowerTask} from './proof-bounded.mjs';
import {independentReplay} from '../daily-challenge/formal-v2/contract.mjs';

export const SOURCE_ADAPTATION_VERSION='league-mainline-exterior-cut-adaptation-1';
const ISSUE='mainline-board-baseline-mismatch';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DEFAULT_LEDGER='deliverables/league-v2-20261008/mechanisms/proof-attempts';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
let runtimePromise;
export const loadLeagueSourceAdaptationRuntime=()=>runtimePromise??=(async()=>{
  const base=await loadLeagueProofRuntime();
  const toolchainBindings={...base.toolchainBindings,'tools/league-v2/proof-source-adaptation.mjs':digest(await fs.readFile(fileURLToPath(import.meta.url)))};
  return{...base,toolchainBindings,toolchainSha256:levelSha256(toolchainBindings),sourceAdaptationVersion:SOURCE_ADAPTATION_VERSION};
})();
const cellKey=cell=>cell.join(',');
const sorted=cells=>cells.slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const mask=level=>sorted(level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]));
function flood(start,allowed){
  const seen=new Set(),queue=[];for(const p of start){const k=cellKey(p);if(allowed.has(k)&&!seen.has(k)){seen.add(k);queue.push(p);}}
  for(let i=0;i<queue.length;i++){const[x,y]=queue[i];for(const[dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const p=[x+dx,y+dy],k=cellKey(p);if(allowed.has(k)&&!seen.has(k)){seen.add(k);queue.push(p);}}}
  return seen;
}

/** Supported adaptation profile is deliberately narrow: same mainline bounding
 * dimensions, genuine exterior cuts only, no added cells/internal holes/walls.
 * Its capacity/geometry checks supplement every existing runtime/static audit.
 */
export function describeLeagueSourceAdaptation(source,level){
  const errors=[];
  if(!source||!level)return{passed:false,errors:['missing-source-or-level']};
  if(source.width!==level.width||source.height!==level.height)errors.push('adaptation-bounding-dimensions-changed');
  if(source.blocked?.length||source.seams?.length||level.blocked?.length||level.seams?.length)errors.push('adaptation-does-not-allow-internal-walls');
  const sourceCells=mask(source),targetCells=mask(level),a=new Set(sourceCells.map(cellKey)),b=new Set(targetCells.map(cellKey));
  if(a.size!==sourceCells.length||b.size!==targetCells.length)errors.push('duplicate-mask-cell');
  if(!targetCells.length||targetCells.some(([x,y])=>!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=level.width||y>=level.height))errors.push('invalid-target-mask');
  const cutCells=sourceCells.filter(p=>!b.has(cellKey(p))),addedCells=targetCells.filter(p=>!a.has(cellKey(p)));
  if(!cutCells.length)errors.push('adaptation-must-have-explicit-cut-cells');
  if(addedCells.length)errors.push('adaptation-added-cells-outside-template');
  if(flood(targetCells.slice(0,1),b).size!==b.size)errors.push('adaptation-disconnected-playable-space');
  const missing=[];
  for(let y=-1;y<=level.height;y++)for(let x=-1;x<=level.width;x++)if(!b.has(cellKey([x,y])))missing.push([x,y]);
  const exterior=flood([[-1,-1]],new Set(missing.map(cellKey)));
  if(cutCells.some(p=>!exterior.has(cellKey(p))))errors.push('adaptation-cut-created-interior-hole');
  const lr=targetCells.every(([x,y])=>b.has(cellKey([level.width-1-x,y]))),ud=targetCells.every(([x,y])=>b.has(cellKey([x,level.height-1-y])));
  if(!lr&&!ud)errors.push('adaptation-mask-has-no-axis-symmetry');
  return{version:SOURCE_ADAPTATION_VERSION,passed:errors.length===0,errors,profile:'same-size-mainline-template-with-authored-exterior-cut',
    sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),targetLevelSha256:levelSha256(level),
    sourceMask:{width:source.width,height:source.height,cells:sourceCells},targetMask:{width:level.width,height:level.height,cells:targetCells},
    sourceMaskSha256:levelSha256({width:source.width,height:source.height,cells:sourceCells}),targetMaskSha256:levelSha256({width:level.width,height:level.height,cells:targetCells}),
    cutCells,addedCells,sourceCellCount:a.size,targetCellCount:b.size,retainedCellFraction:b.size/a.size,
    connected:flood(targetCells.slice(0,1),b).size===b.size,allCutsExterior:cutCells.every(p=>exterior.has(cellKey(p))),leftRightSymmetric:lr,upDownSymmetric:ud,
    sourceFacts:'Original mainline board and level hash retained above; target cut cells are authored league adaptation, not exact source replication.',
    inheritedIssueRemoved:ISSUE};
}

export async function auditLeagueAdaptedSource(runtime,candidate){
  const original=await auditLeagueStatic(runtime,candidate),source=runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId),adaptation=describeLeagueSourceAdaptation(source,candidate.level);
  const issues=original.issues.filter(issue=>issue!==ISSUE||!adaptation.passed);
  if(!adaptation.passed)issues.push(...adaptation.errors);
  return{...original,inheritedIssues:[...original.issues],issues,passed:issues.length===0,sourceAdaptation:adaptation,
    removedInheritedIssues:adaptation.passed&&original.issues.includes(ISSUE)?[ISSUE]:[]};
}

export function inspectUnsearchedStaticRejection(previous,candidate,source){
  const errors=[],sameIssue=a=>Array.isArray(a)&&a.length===1&&a[0]===ISSUE;
  if(previous?.contractVersion!==PROOF_VERSION||previous?.ruleVersion!==RULE_VERSION||previous?.status!=='REJECTED_STATIC'||previous?.accepted!==false||previous?.formalReady!==false)errors.push('prior-not-unaccepted-static-rejection');
  if(!sameIssue(previous?.reasons)||!sameIssue(previous?.staticAudit?.issues)||previous?.staticAudit?.passed!==false)errors.push('prior-not-sole-inherited-mask-issue');
  if(previous?.lowerBound!==undefined||previous?.lower!==undefined||previous?.route!==undefined||previous?.drags!==undefined||previous?.L!==null||previous?.U!==null)errors.push('prior-has-route-or-search-evidence-not-zero-search');
  if(previous?.index!==candidate.index||previous?.sourceLevelId!==candidate.sourceLevelId||previous?.levelSha256!==levelSha256(candidate.level)||!previous?.level||levelSha256(previous.level)!==previous.levelSha256||previous?.attempt?.levelSha256!==previous.levelSha256)errors.push('prior-not-exact-same-candidate');
  if(!source||source.id!==candidate.sourceLevelId||previous?.sourceLevelSha256!==levelSha256(source))errors.push('prior-source-not-current-template');
  return errors;
}

/** Exclusive one-time repair only for a documented ZERO-search static reject.
 * Original request/result bytes are never changed. The new deterministic
 * suffixed request shares its original ledger lineage and cannot be reset. */
export async function claimStaticSourceRepair(runtime,candidate,{previousReceipt,previousReceiptSha256}){
  if(typeof previousReceiptSha256!=='string'||!/^[a-f0-9]{64}$/.test(previousReceiptSha256))throw Error('Explicit original rejection SHA required');
  const bytes=await fs.readFile(previousReceipt);if(digest(bytes)!==previousReceiptSha256)throw Error('Original rejection file changed');
  const previous=JSON.parse(bytes),source=runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId),errors=inspectUnsearchedStaticRejection(previous,candidate,source);
  if(errors.length)throw Error('STATIC_SOURCE_REPAIR_REFUSED: '+errors.join('; '));
  if(previous.toolchainBindings?.['tools/league-v2/proof-contract.mjs']!==runtime.toolchainBindings['tools/league-v2/proof-contract.mjs'])throw Error('Original static-only rejection came from different stable contract bytes');
  const directory=path.dirname(previousReceipt),old=previous.attempt;
  if(!/^[a-f0-9]{64}$/.test(old.id)||!/^[a-zA-Z0-9_-]{1,100}$/.test(old.attemptKey))throw Error('Invalid prior attempt identity');
  const originalRequest=JSON.parse(await fs.readFile(path.join(directory,old.id+'.request.json'),'utf8'));
  if(levelSha256(originalRequest)!==levelSha256(old))throw Error('Original request/receipt do not agree');
  const latestFile=path.join(directory,old.attemptKey+'.latest.json'),latest=JSON.parse(await fs.readFile(latestFile,'utf8'));
  if(latest.id!==old.id||latest.levelSha256!==old.levelSha256)throw Error('Static source repair already consumed or lineage advanced');
  const id=old.id+'.static-source-repair-v1',repair={previousReceipt:previousReceipt.replaceAll('\\','/'),previousReceiptSha256,
    upperSearchStates:0,lowerSearchStates:0,reason:'League exterior-cut source adaptation; remove inherited daily fixed-mask requirement only'};
  const request={...old,id,redesignOf:old.id,staticSourceRepair:repair,startedAt:new Date().toISOString()};
  await fs.writeFile(path.join(directory,id+'.request.json'),JSON.stringify(request,null,2)+'\n',{flag:'wx'});
  await fs.writeFile(latestFile,JSON.stringify(request,null,2)+'\n');
  return{ledger:await createLeagueAttemptLedger(directory),attempt:request,repair};
}

export async function verifyLeagueSourceAdaptedCandidate(runtime,candidate,{ledgerDirectory=DEFAULT_LEDGER,attemptKey,redesignOf,lowerBudget={},staticRepair}={}){
  if(runtime.sourceAdaptationVersion!==SOURCE_ADAPTATION_VERSION||runtime.leagueRuleVersion!==RULE_VERSION)throw Error('Use loadLeagueSourceAdaptationRuntime');
  const options=boundedBudget(lowerBudget),level=structuredClone(candidate.level),band=leagueBand(candidate.index);
  if(!Array.isArray(candidate.drags)||!candidate.drags.length||candidate.timeSchedule!==undefined)throw Error('This source adapter requires an existing untimed complete route; no upper search');
  const context=staticRepair?await claimStaticSourceRepair(runtime,{...candidate,level},staticRepair):await(async()=>{const ledger=await createLeagueAttemptLedger(ledgerDirectory);return{ledger,attempt:await ledger.claim(level,{attemptKey:attemptKey??`league-${candidate.index}`,redesignOf})};})();
  const{ledger,attempt,repair}=context;
  const report={contractVersion:PROOF_VERSION,ruleVersion:RULE_VERSION,index:candidate.index,sourceLevelId:candidate.sourceLevelId,level,levelSha256:levelSha256(level),band,attempt,
    accepted:false,formalReady:false,designValidated:false,mechanismStrengthValidated:false,pointerValidated:false,timeValidated:false,L:null,U:null,
    toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,reasons:[],sourceAdaptationVersion:SOURCE_ADAPTATION_VERSION,...(repair?{staticSourceRepair:repair}:{})};
  try{
    report.staticAudit=await auditLeagueAdaptedSource(runtime,{...candidate,level});report.sourceLevelSha256=report.staticAudit.sourceLevelSha256;report.sourceAdaptation=report.staticAudit.sourceAdaptation;
    if(!report.staticAudit.passed){report.status='REJECTED_STATIC';report.reasons=report.staticAudit.issues;return report;}
    if(!report.staticAudit.support.supported){report.status='UNSUPPORTED_ROUTE';report.reasons=report.staticAudit.support.reasons;return report;}
    const drags=structuredClone(candidate.drags);report.drags=drags;report.routeSha256=routeSha256(drags);
    if(candidate.routeSha256&&candidate.routeSha256!==report.routeSha256)throw Error('Declared route hash mismatch');
    const canonical=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);
    report.route={search:null,canonicalReplay:canonical,independentReplay:independent,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256};
    if(!canonical.valid||!canonical.complete||!independent.valid||!independent.complete||independent.failed||independent.remainingBodies!==0||independent.remainingQueued!==0||canonical.effectiveDrags!==drags.length||independent.effectiveDrags!==drags.length||canonical.nonClearingDrags!==independent.nonClearingDrags||canonical.clearEvents!==independent.clearEvents){report.status='REJECTED_ROUTE';return report;}
    report.U=independent.nonClearingDrags;if(report.U<band.lower||report.U>band.upper){report.status='ROUTE_OUTSIDE_BAND';return report;}
    report.lowerBound=boundedLowerTask(runtime,level,band.difficulty,options);const lower=report.lowerBound.result;
    if(lower.status!=='threshold-proven'||lower.thresholdProven!==true||lower.floor!==band.lower||lower.termination!=='below-threshold-exhausted'||!Number.isSafeInteger(lower.rawFullBoardStates)||lower.rawFullBoardStates<1||lower.rawFullBoardStates>10000||lower.rawFullBoardStates!==lower.discoveredStates){report.status='UNKNOWN_LOWER';return report;}
    report.L=band.lower;report.scoring=auditLeagueScoring(runtime,level,drags,{index:candidate.index,specials:candidate.specials});report.specials=report.scoring.specials;
    report.accepted=true;report.status='LEAGUE_SPATIAL_SCORING_VERIFIED_AWAITING_DESIGN_POINTER';return report;
  }catch(e){report.status='INVALID';report.reasons.push(e.message);return report;}
  finally{
    if(levelSha256(level)!==report.levelSha256){report.accepted=false;report.status='INPUT_MUTATED';}
    for(const[file,hash]of Object.entries(report.toolchainBindings))if(await fs.readFile(path.resolve(ROOT,file)).then(digest).catch(()=>null)!==hash){report.accepted=false;report.status='STALE_TOOLCHAIN';report.reasons.push('Input changed: '+file);}
    for(const[file,hash]of Object.entries(report.staticAudit?.assetBindings??{}))if(await fs.readFile(path.resolve(ROOT,'public',file)).then(digest).catch(()=>null)!==hash){report.accepted=false;report.status='STALE_TOOLCHAIN';report.reasons.push('Sprite changed: '+file);}
    if(repair&&await fs.readFile(repair.previousReceipt).then(digest)!==repair.previousReceiptSha256){report.accepted=false;report.status='ORIGINAL_REJECTION_CHANGED';}
    report.proofReceipt=await ledger.finish(attempt,report);
  }
}

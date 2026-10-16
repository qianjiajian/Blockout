import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {loadRuntime,levelSha256,routeSha256,auditStaticCandidate,independentReplay,BANDS} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {replayScheduledRoute} from '../formal-v2/proof-scheduled-route.mjs';
import {loadV4StageContract} from './static-contract.mjs';
import {FROZEN_BOUNDED_FILES,FROZEN_MATH_SHA} from './runtime.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

// This module does not call a frozen v4 loader, solver, construction or ledger API.
// Its current bindings remain current; the historical lower evidence is read only.
export const CURRENT_UI_COMPATIBILITY_VERSION='daily-current-scroll-ui-model-compatibility-v2';
const SELF='tools/daily-challenge/formal-v4/audit-current-ui-compatibility-v2.mjs';
const UI='src/game/ColorEscapeGame.ts';
const EXPECTED_UI='a79eb13437413cdab9a53c1487ff2808fd1cf2c2defca296cabeb45d3b9ba664';
const EXPECTED_CURRENT='660fd043dfcfbc811cd9340d1d3d2f5b06ad192743e12bbcbaedbac07113da75';
const BEFORE_UI='2a59877eab3b89e5d599d34eacf7dcf797b588be29cdd49b9832ac0ec691b90a';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const replacements=[
 ['const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();','const nowMs = monotonicGameTime();',2],
 ['this.leagueScroll.begin(point.id,point.x,point.y,performance.now())','this.leagueScroll.begin(point.id,point.x,point.y,monotonicGameTime())',1],
 ['this.leagueScroll.move(point.id,point.y,performance.now())','this.leagueScroll.move(point.id,point.y,monotonicGameTime())',1],
 ['this.leagueScroll.end(point.id,point.y,performance.now(),this.save.reducedMotion)','this.leagueScroll.end(point.id,point.y,monotonicGameTime(),this.save.reducedMotion)',1],
];

export function assertScrollClockOnlyChange(before,current){
 let expected=before;const changes=[];
 for(const [from,to,count]of replacements){assert.equal(expected.split(from).length-1,count,'Exact expected scroll replacement count');expected=expected.replaceAll(from,to);changes.push({from,to,count});}
 assert.equal(current,expected,'Only the five declared scroll timestamp replacements are allowed');
 const extract=s=>s.match(/const GATE_EXIT_INGEST_DURATION = (\d+(?:\.\d+)?);/)?.[0];
 assert(extract(before));assert.equal(extract(current),extract(before));
 return{changes,replacementCount:changes.reduce((n,c)=>n+c.count,0),gateConstant:extract(current)};
}

export function assertOnlyUiBindingChanged(historical,current){
 assert.deepEqual(Object.keys(current).sort(),Object.keys(historical).sort(),'Identical dependency set');
 assert.equal(levelSha256(historical),FROZEN_MATH_SHA);
 const changed=Object.keys(historical).filter(p=>historical[p]!==current[p]);assert.deepEqual(changed,[UI]);
 assert.equal(historical[UI],BEFORE_UI);assert.equal(current[UI],EXPECTED_UI);
 assert.equal(levelSha256(current),EXPECTED_CURRENT);return changed;
}

export function assertHistoricalIdentity(q,old,request,result,{requestPath,resultPath}){
 assert.equal(path.basename(requestPath),`${old.attempt.id}.request.json`);
 assert.equal(path.basename(resultPath),`${old.attempt.id}.result.json`);
 assert.equal(path.dirname(requestPath),path.dirname(resultPath));
 assert.equal(request.id,old.attempt.id);assert.deepEqual(request,old.attempt);
 assert.equal(request.levelSha256,q.levelSha256);assert.equal(result.levelSha256,q.levelSha256);
 // The immutable ledger result schema has no id field; its exact same-stem
 // request/result filenames authenticate the attempt without inventing one.
 if(result.id!==undefined)assert.equal(result.id,request.id);
 assert(result.accepted);assert.equal(result.status,old.status);
 assert.deepEqual(result.lower,old.lowerBound.result);assert.deepEqual(result.upper,old.route?.search);
 const band=BANDS[q.difficulty];assert(band);assert.equal(old.difficulty,q.difficulty);
 assert.equal(old.lowerBound.inputLevelSha256,q.levelSha256);
 assert.equal(old.L,q.L);assert.equal(old.L,band.lower);assert.equal(old.L,old.lowerBound.requiredFloor);
 assert.equal(old.L,old.lowerBound.result.floor);assert(old.lowerBound.result.thresholdProven);
 assert.equal(old.lowerBound.result.status,'threshold-proven');assert.equal(old.lowerBound.result.termination,'below-threshold-exhausted');
 assert.equal(old.U,q.U);assert(q.U>=q.L&&(band.upper===null||q.U<=band.upper));
}

// Same explicit policy filtering as static-contract.mjs, using its actual stage
// exports. The old-runtime assertion is intentionally not invoked or imitated.
export function currentStageStaticResult(generic,candidate,api){
 const slot=api.DAILY_CHALLENGE_V3_SLOTS.find(s=>s.id===candidate.formalId);
 const stage=slot&&api.getDailyChallengeStageV3(slot.stageKey),issues=[],filtered=[];
 if(!slot||!stage)issues.push('unknown-daily-300-slot');
 else{
  for(const[field,expected]of Object.entries({stageKey:slot.stageKey,difficulty:slot.difficulty,slot:slot.slot,newestMechanism:slot.newestMechanism}))
   if(candidate[field]!==expected)issues.push(`slot-mismatch:${field}`);
  if(candidate.unlockLevel!==undefined&&candidate.unlockLevel!==slot.stageUnlockLevel)issues.push('slot-mismatch:unlockLevel');
 }
 const basic=api.getDailyChallengeStageV3('basic-combined');assert.equal(basic.allowedMechanisms.length,6);const baseSet=new Set(basic.allowedMechanisms);
 for(const issue of generic.issues){
  const oldUnlock=issue.startsWith('mechanism-before-unlock:')?issue.slice('mechanism-before-unlock:'.length):null;
  const superseded=issues.length===0&&((issue==='stage-not-in-mechanism-guide'&&stage.key==='basic-combined')
   ||(oldUnlock&&baseSet.has(oldUnlock)&&stage.allowedMechanisms.includes(oldUnlock)));
  if(superseded)filtered.push(issue);else issues.push(issue);
 }
 if(stage){for(const used of generic.mechanisms??[])if(!stage.allowedMechanisms.includes(used))issues.push(`mechanism-outside-current-daily-stage:${used}`);
  if(stage.newestMechanism&&!(generic.mechanisms??[]).includes(stage.newestMechanism))issues.push(`missing-current-stage-mechanism:${stage.newestMechanism}`);}
 return{...generic,passed:issues.length===0,issues:[...new Set(issues)],stage,slot,legacyGenericAudit:generic,supersededStageFindings:filtered,
  filteringPolicy:'only-authenticated-basic-stage-and-explicit-six-mechanism-before-unlock-exceptions',policyBindings:api.bindings};
}

export async function verifyCurrentUiCompatibility({selectionPath,scopeEvidence,outputDirectory}){
 assert(selectionPath&&scopeEvidence?.path&&scopeEvidence.sha256&&outputDirectory);
 await fs.mkdir(outputDirectory,{recursive:false});
 const inputBindings={},rows=[],errors=[];let report;
 const bytes=async(p,expected)=>{const b=await fs.readFile(p),h=hash(b);if(expected)assert.equal(h,expected,`File SHA: ${p}`);
  if(inputBindings[p])assert.equal(h,inputBindings[p],`Changed during audit: ${p}`);inputBindings[p]=h;return b;};
 const read=async(p,expected)=>JSON.parse(await bytes(p,expected));
 const bindMap=async map=>{for(const[p,h]of Object.entries(map))await bytes(p,h);};
 try{
  const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.156.0');
  await bytes('docs/rules/manifest.json');await bytes('docs/rules/mechanism-rules-v1.156.0.md');
  const scope=await read(scopeEvidence.path,scopeEvidence.sha256);assert.equal(scope.status,'READ_ONLY_FIVE_SCROLL_TIMESTAMP_CHANGES_REVIEWED');
  const before=await bytes(scope.before.path,BEFORE_UI),current=await bytes(UI,EXPECTED_UI);
  const diff=assertScrollClockOnlyChange(before.toString('utf8'),current.toString('utf8'));await bindMap(scope.bindings);
  const clockPath='src/game/playableClockSlices.ts';
  const clock=await bytes(clockPath,scope.bindings[clockPath]);
  const frozenClock=await bytes('deliverables/daily-formal-v4-20261008/frozen-workspace-4588/src/game/playableClockSlices.ts',hash(clock));
  assert.deepEqual(clock,frozenClock);
  const helper=clock.toString('utf8').match(/export const monotonicGameTime = [\s\S]*?;/)?.[0];assert(helper);
  const bundled=await build({entryPoints:[SELF],bundle:true,packages:'external',metafile:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
  const importBindings={};for(const p of Object.keys(bundled.metafile.inputs).sort()){await bytes(p);importBindings[p]=inputBindings[p];}
  const api=await loadRuntime();await bindMap(api.toolchainBindings);await bindMap(FROZEN_BOUNDED_FILES);
  const currentBindings={...api.toolchainBindings,...FROZEN_BOUNDED_FILES},currentSha=levelSha256(currentBindings);
  assert.equal(currentSha,EXPECTED_CURRENT);assert.equal(api.animationTiming.normalGateSeconds,.26);
  const stage=await loadV4StageContract();await bindMap(stage.bindings);
  const index=await read(selectionPath);assert.equal(index.files.length,138);assert.equal(new Set(index.files).size,138);
  for(const [i,file]of index.files.entries()){
   const row={position:i+1,file,status:'UNKNOWN',issues:[]};
   try{
    const q=await read(file);row.receiptSha256=inputBindings[file];row.formalId=q.formalId;row.difficulty=q.difficulty;
    assert(q.accepted&&q.mathematicalEvidenceValidated);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
    const old=q.historicalProof?await read(q.historicalProof.path,q.historicalProof.sha256):q.mathematicalProof;
    assert(old?.accepted);assert.equal(levelSha256(old.level),q.levelSha256);assert.equal(routeSha256(old.drags),q.routeSha256);
    assert.equal(old.L,q.L);assert.equal(old.U,q.U);assert.equal(old.toolchainSha256,FROZEN_MATH_SHA);
    assertOnlyUiBindingChanged(old.toolchainBindings,currentBindings);
    const requestPath=q.historicalProof?.request.path??`deliverables/daily-formal-v3-20261008/proof/attempts/${old.attempt.id}.request.json`;
    const resultPath=q.historicalProof?.result.path??`deliverables/daily-formal-v3-20261008/proof/attempts/${old.attempt.id}.result.json`;
    const request=await read(requestPath,q.historicalProof?.request.sha256),result=await read(resultPath,q.historicalProof?.result.sha256);
    assertHistoricalIdentity(q,old,request,result,{requestPath,resultPath});
    if(q.historicalProof)assert.equal(levelSha256(old.lowerBound),q.historicalProof.lowerBoundSha256);
    row.historicalMath={closureSha256:FROZEN_MATH_SHA,L:q.L,lowerRecomputed:false,lowerEvidenceSha256:levelSha256(old.lowerBound),
     originalReceipt:q.historicalProof??{path:file,sha256:inputBindings[file],field:'mathematicalProof'},request:{path:requestPath,sha256:inputBindings[requestPath]},result:{path:resultPath,sha256:inputBindings[resultPath]}};
    if(q.timeScheduleSha256)assert.equal(levelSha256(q.timeSchedule),q.timeScheduleSha256);
    assert.deepEqual(q.timeSchedule??null,old.timeSchedule??null,'Original time schedule retained');
    const canonical=q.timeSchedule?replayScheduledRoute(api,q.level,q.drags,q.timeSchedule):replayDecorated(api,q.level,q.drags);
    const independent=independentReplay(api,q.level,q.drags,{timeSchedule:q.timeSchedule});
    for(const replay of [canonical,independent]){assert(replay.valid&&replay.complete&&!replay.failed,replay.error??'Incomplete full inventory');assert.equal(replay.nonClearingDrags,q.U);assert.equal(replay.effectiveDrags,q.drags.length);}
    assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);assert.equal(canonical.clearEvents,independent.clearEvents);
    if(q.timeSchedule){assert(canonical.simulationTimeValidated&&independent.simulationTimeValidated);assert.equal(canonical.elapsedSeconds,independent.elapsedSeconds);}
    const generic=await auditStaticCandidate(api,q),staticAudit=currentStageStaticResult(generic,q,stage);
    assert(staticAudit.passed,staticAudit.issues.join(';'));
    assert.equal(staticAudit.sourceLevelSha256,q.staticAudit.sourceLevelSha256);
    assert.deepEqual(staticAudit.assetBindings,q.staticAudit.assetBindings,'All original model-art bytes retained');
    for(const[p,h]of Object.entries(staticAudit.assetBindings))await bytes(path.posix.join('public',p),h);
    assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
    Object.assign(row,{status:'CURRENT_MODEL_COMPATIBLE',levelSha256:q.levelSha256,routeSha256:q.routeSha256,U:q.U,totalDrags:q.drags.length,
     schedule:q.timeSchedule??null,controlledScheduleValidated:Boolean(q.timeSchedule),naturalTimeValidated:false,pointerValidated:false,
     canonicalReplay:canonical,independentReplay:independent,staticAudit});
   }catch(error){row.issues.push(error.message);errors.push({file,message:error.message});}
   rows.push(row);
  }
  for(const[p,h]of Object.entries(inputBindings))assert.equal(hash(await fs.readFile(p)),h,`Changed after audit: ${p}`);
  report={version:CURRENT_UI_COMPATIBILITY_VERSION,status:errors.length?'CURRENT_MODEL_COMPATIBILITY_INCOMPLETE':'CURRENT_MODEL_COMPATIBLE_SCROLL_DIFF_REVIEWED',
   selection:{path:selectionPath,sha256:inputBindings[selectionPath]},scopeEvidence,diff,
   clock:{path:clockPath,sha256:hash(clock),monotonicFunctionSha256:hash(helper),unchangedAgainstFrozenCopy:true},
   currentRuntime:{closureSha256:currentSha,toolchainBindings:currentBindings,animationTiming:api.animationTiming,ui:{path:UI,sha256:EXPECTED_UI}},
   historicalMath:{closureSha256:FROZEN_MATH_SHA,uiSha256:BEFORE_UI,lowerCertificatesUnchanged:true,newLowerCertification:false},
   counts:{requested:138,compatible:rows.filter(r=>r.status==='CURRENT_MODEL_COMPATIBLE').length,unknown:errors.length,
    scheduled:rows.filter(r=>r.controlledScheduleValidated).length},rows,errors,inputBindings,importBindings,
   tool:{path:SELF,sha256:inputBindings[SELF]},solverInvocations:0,constructionInvocations:0,ledgerWrites:0,
   fullWitnessReplayInvocations:rows.filter(r=>r.status==='CURRENT_MODEL_COMPATIBLE').length*2,
   naturalTimeValidated:false,pointerValidated:false,canvasRendered:false,formalReady:false,productionChanged:false,
   limits:'Current model/full-witness and material compatibility only. The five scroll timestamp changes were scope-reviewed, but this is not a Canvas/Pointer/natural-clock test or a new lower certificate.'};
 }catch(error){report={version:CURRENT_UI_COMPATIBILITY_VERSION,status:'CURRENT_COMPATIBILITY_GUARD_REJECTED',error:error.message,rows,errors,inputBindings,
  solverInvocations:0,constructionInvocations:0,ledgerWrites:0,formalReady:false,productionChanged:false};}
 await fs.writeFile(path.join(outputDirectory,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await verifyCurrentUiCompatibility({selectionPath:'deliverables/daily-formal-v4-20261008/selection/capacity13-02/index.json',
  scopeEvidence:{path:'deliverables/daily-formal-v4-20261008/proof/scroll-clock-diff-independent-01/report.json',sha256:'cde97a6d523501b8996d97769a4234b4ca8b5b152f8d20a1406175c57b30bca9'},
  outputDirectory:process.argv[2]??'deliverables/daily-formal-v4-20261008/proof/current-ui-138-compatibility-02'});
 console.log(JSON.stringify({status:report.status,counts:report.counts,error:report.error,errors:report.errors}));
 if(report.status!=='CURRENT_MODEL_COMPATIBLE_SCROLL_DIFF_REVIEWED')process.exitCode=1;
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';

// Read-only candidate source/static/route mechanism diagnostics. No candidate
// search, lower-bound claim, production mutation, or implicit mechanism PASS.
const file=process.argv[2];assert(file,'Pass a specific candidate JSON');
const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,'1.95.0');
const root='deliverables/lv70-remake-20260927',baseFile=root+'/baseline.json';
const base=JSON.parse(fs.readFileSync(baseFile)),data=JSON.parse(fs.readFileSync(file)),level=data.level,designDrags=data.drags??data.route;
const routeFile=process.argv[3],routeData=routeFile?JSON.parse(fs.readFileSync(routeFile)):null;
const drags=routeData?(routeData.floor?.drags??routeData.drags??routeData.route):designDrags;
assert.equal(level?.id,70);assert(drags?.length);
const{api,inputs}=await loadApi(),old=base.level;
const report={createdAt:new Date().toISOString(),status:'RUNNING',ruleVersion:lock.activeVersion,candidate:file,candidateFileSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(drags),
 routeOverride:routeFile??null,fullMechanismDifficultyApproved:false,lowerBoundRerun:false,pointerValidated:false,timeValidated:false,generatedCandidate:false,productionModified:false,playerSaveTouched:false,published:false};
try{
 assert.deepEqual(geometry(level),geometry(old));assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');assert.equal(level.difficulty,'normal');
 for(const k of ['id','name','timeSeconds','reward','parMoves'])assert.deepEqual(level[k],old[k]);
 assert.equal(level.timeSeconds,180);assert.equal(level.reward,185);assert.equal(level.parMoves,23);
 assert.equal(api.levelStarTargets(level).timeTargetSeconds,129);assert.equal(api.levelStarTargets(level).moveTarget,designDrags.length);
 assert.equal(level.generators?.length,2);assert(level.generators.every(g=>g.queueBlockIds.length>0));
 const owner=new Map();for(const g of level.generators)for(const id of g.queueBlockIds){assert(!owner.has(id));owner.set(id,g.id);}
 const oldQueue=new Set(old.generators.flatMap(g=>g.queueBlockIds));
 const sig=b=>b.color+'|'+b.shape.map(p=>p.join(',')).sort().join(';');
 const inventory=(l,q,queued)=>l.blocks.filter(b=>q.has(b.id)===queued).map(sig).sort();
 assert.equal(level.blocks.length,36);assert.equal(owner.size,17);assert.deepEqual(inventory(level,owner,false),inventory(old,oldQueue,false));assert.deepEqual(inventory(level,owner,true),inventory(old,oldQueue,true));
 for(const b of level.blocks)assert(Object.keys(b).every(k=>['id','x','y','shape','color','generatorId'].includes(k)),`No added property ${b.id}`);
 for(const k of ['shutters','flipDoors','coloredGrids','elevators','conveyors'])assert(!(level[k]?.length));
 assert.equal(level.gates.length,4);assert.deepEqual(level.gates.map(g=>g.color).sort(),['blue','green','pink','yellow']);
 const designedIceCounts=Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0]));
 assert.equal(designedIceCounts.blue,0);for(const color of ['green','pink','yellow'])assert(Number.isSafeInteger(designedIceCounts[color])&&designedIceCounts[color]>=1);
 report.iceCountProvenance={source:{blue:0,green:1,pink:1,yellow:1},authored:designedIceCounts,authorization:'v1.93 permits higher existing ice counters; authored values are not competitor facts'};
 api.validateLevel(level);
 const native=level.blocks.map(b=>({id:b.id,queued:owner.has(b.id),match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(native.every(x=>x.match?.quarterTurns===0));
 const rawHidden=auditHiddenCoverage(level);
 assert(!(level.shutters?.length)&&!(level.elevators?.length)&&level.blocks.every(b=>b.shutterId===undefined));
 report.static={geometryPreserved:true,openingBodies:19,queuedBodies:17,fullBodies:36,sourceShapeColorInventoryPreserved:true,native,
  opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:{passed:true,status:'NOT_APPLICABLE_NO_HIDDEN_REGIONS',rawHistoricalTool:rawHidden,explanation:'Explicit empty shutters/elevators and no block shutterId checked independently. Historical tool does not know v1.5; neither its profile nor candidate profile is changed.'},spans:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),queueColors:auditGeneratorQueueColors(level)};
 assert(rawHidden.issues.every(x=>x.code==='unknown-mechanism-profile'),JSON.stringify(rawHidden));
 for(const k of ['opening','hidden','spans','art','queueColors'])assert(report.static[k].passed,JSON.stringify(report.static[k]));
 const omitted=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const audit=api.auditRevisedCandidate(level,undefined);report.static.rawAudit=audit;assert.deepEqual(audit.issues.filter(x=>!omitted.has(x.code)),[]);
 const initial=new api.PuzzleModel(level).snapshot(),occupied=new Map();for(const b of initial.blocks)for(const[dx,dy]of b.shape){const k=`${b.x+dx},${b.y+dy}`;assert(!occupied.has(k));occupied.set(k,b);}
 for(const[k,b]of occupied){const[x,y]=k.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const o=occupied.get(p.join(','));if(o&&o.id!==b.id)assert.notEqual(o.color,b.color,`Opening same-color adjacency ${b.id}/${o.id}`);}}
 report.replay=api.replayRevisedRoute(level,drags);assert(report.replay.valid&&report.replay.complete);assert.equal(report.replay.clearEvents,36);
 report.routeBand={normalLower:11,normalUpper:15,routeU:report.replay.nonClearingDrags,belowBandCounterexample:report.replay.nonClearingDrags<11,routeWithinBand:report.replay.nonClearingDrags>=11&&report.replay.nonClearingDrags<=15,lowerBoundCertified:false};
 report.steps=[];report.births=[];
 const m=new api.PuzzleModel(level);m.startCountdown();const snapshots=[];
 const activeQueueCounts=s=>Object.fromEntries(level.generators.map(g=>[g.id,s.blocks.filter(b=>owner.get(b.id)===g.id).length]));
 function births(before,after,drag,phase,moving){for(const b of after.blocks.filter(b=>!before.blocks.some(o=>o.id===b.id))){assert(owner.has(b.id));report.births.push({drag,phase,moving,body:b.id,generator:owner.get(b.id),area:b.shape.length,color:b.color,anchor:[b.x,b.y],cleared:after.cleared,remainingOpening:after.blocks.filter(b=>!owner.has(b.id)).length,activeQueueCounts:activeQueueCounts(after)});}}
 for(const[index,d]of drags.entries()){
  snapshots.push(m.clone());const before=m.snapshot(),b=m.getBlock(d.blockId);assert(b);m.beginAction();
  for(const[j,p]of d.path.entries()){const prior=m.snapshot();assert(m.moveBlockStep(d.blockId,...p));births(prior,m.snapshot(),index+1,`unit-${j+1}`,d.blockId);}
  if(d.exitSide){const prior=m.snapshot();assert(m.tryExit(d.blockId,d.exitSide).ok);births(prior,m.snapshot(),index+1,'exit',d.blockId);}
  const prior=m.snapshot();assert(m.commitAction());const after=m.snapshot();births(prior,after,index+1,'commit',d.blockId);
  report.steps.push({drag:index+1,blockId:d.blockId,generator:owner.get(d.blockId)??null,area:b.shape.length,color:b.color,path:d.path,exitSide:d.exitSide??null,nonClearing:before.cleared===after.cleared,cleared:after.cleared,remainingOpening:after.blocks.filter(b=>!owner.has(b.id)).length,activeQueueCounts:activeQueueCounts(after),gatesBefore:Object.fromEntries(before.gates.map(g=>[g.color,g.frozen??0])),gatesAfter:Object.fromEntries(after.gates.map(g=>[g.color,g.frozen??0]))});
 }
 assert(m.snapshot().complete);assert.equal(report.births.length,17);assert.equal(new Set(report.births.map(b=>b.body)).size,17);
 const lastOpening=Math.max(...report.steps.filter(s=>!s.generator&&!s.nonClearing).map(s=>s.drag));
 report.machineMetrics=level.generators.map(g=>{const births=report.births.filter(b=>b.generator===g.id),actions=report.steps.filter(s=>s.generator===g.id),parks=actions.filter(s=>s.nonClearing);return{id:g.id,queueLength:g.queueBlockIds.length,firstBirth:births[0],lastBirth:births.at(-1),allSpawned:births.length===g.queueBlockIds.length,queueActions:actions.length,queueRepositions:parks.length,multiCellQueueRepositions:parks.filter(s=>s.area>1).length,multiCellQueueParkingWithOpeningStillPresent:parks.filter(s=>s.area>1&&s.remainingOpening>0).length,parkingSteps:parks.map(s=>s.drag)};});
 let terminalClearSuffix=0;for(const s of [...report.steps].reverse()){if(s.generator&&!s.nonClearing)terminalClearSuffix++;else break;}
 report.routeMetrics={lastOpeningRemovalDrag:lastOpening,queueRepositions:report.steps.filter(s=>s.generator&&s.nonClearing).length,multiCellQueueRepositions:report.steps.filter(s=>s.generator&&s.nonClearing&&s.area>1).length,
  twoMachinesLiveAtOnceSteps:report.steps.filter(s=>Object.values(s.activeQueueCounts).every(n=>n>0)).map(s=>s.drag),terminalConsecutiveQueueClearSuffix:terminalClearSuffix,
  queueClearsAfterAllOpeningGone:report.steps.filter(s=>s.drag>lastOpening&&s.generator&&!s.nonClearing).length,
  oldSingleGenerator:{firstBirthDrag:33,firstBirthCleared:17,lastOpeningRemovalDrag:34,queueRepositions:0,terminalConsecutiveQueueClearSuffix:17}};
 // For every real multi-cell queued parking action, omit exactly that action
 // and find the first subsequent failure. These are local route dependencies,
 // not global necessity or an optimality certificate.
 report.parkingOmissionCases=[];
 for(const s of report.steps.filter(s=>s.generator&&s.nonClearing&&s.area>1)){
  const omittedIndex=s.drag-1,alternative=drags.filter((_,i)=>i!==omittedIndex);let failed=null;
  for(let n=omittedIndex+1;n<=alternative.length;n++){const r=api.replayRevisedRoute(level,alternative.slice(0,n));if(!r.valid){const originalIndex=n-1>=omittedIndex?n:n-1,blocked=drags[originalIndex];failed={firstAlternativeDrag:n,originalDrag:originalIndex+1,blockId:blocked.blockId,generator:owner.get(blocked.blockId)??null,error:r.error};break;}}
  const successfulWithoutParking=api.replayRevisedRoute(level,alternative);
  let delayedRecovery=null;
  if(failed){const j=failed.originalDrag-1;const repaired=[...drags.slice(0,omittedIndex),...drags.slice(omittedIndex+1,j),drags[omittedIndex],...drags.slice(j)];const r=api.replayRevisedRoute(level,repaired);delayedRecovery={valid:r.valid,complete:r.complete,error:r.error??null,totalDrags:r.effectiveDrags,scope:'Delay omitted parking until immediately before first failed action; no search for other recovery'};}
  report.parkingOmissionCases.push({parkingDrag:s.drag,body:s.blockId,generator:s.generator,firstFailure:failed,completeIfOmitted:successfulWithoutParking.valid&&successfulWithoutParking.complete,crossMachineNextFailure:!!failed?.generator&&failed.generator!==s.generator,delayedRecovery,scope:'Specific route-local omission; no global mandatory-move claim'});
 }
 report.qualitativeReviewNeeded={bothMachinesStartBeforeOpeningCleared:report.machineMetrics.every(g=>g.firstBirth.remainingOpening>0),bothHaveMultiCellQueueParking:report.machineMetrics.every(g=>g.multiCellQueueRepositions>0),bothHaveMidOpeningMultiCellQueueParking:report.machineMetrics.every(g=>g.multiCellQueueParkingWithOpeningStillPresent>0),haveSimultaneousLiveCargo:report.routeMetrics.twoMachinesLiveAtOnceSteps.length>0,haveCrossMachineRouteDependency:report.parkingOmissionCases.some(x=>x.crossMachineNextFailure),haveStrictlyShorterTailThanOld:terminalClearSuffix<17,
  warning:'These are descriptive diagnostics, not newly invented mandatory quotas. Need independent reasoning about late-release bypass, common workspace and recovery. Merely reverse-rejected spawn or two instances cannot earn mechanism difficulty PASS.'};
 report.status=report.routeBand.belowBandCounterexample?'REJECT_NORMAL_DIFFICULTY_CURRENT_MODEL_SHORTCUT':'PASS_SOURCE_STATIC_AND_FULL_ROUTE_MECHANISM_METRICS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
report.bindings=Object.fromEntries([file,...(routeFile?[routeFile]:[]),baseFile,'tools/lv70-remake-20260927/source-candidate-audit.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.91.0.md','docs/rules/mechanism-rules-v1.93.0.md','docs/rules/mechanism-rules-v1.95.0.md',...inputs].map(p=>[p,digest(fs.readFileSync(p))]));
const out=root+'/source-candidate-audit-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,status:report.status,machineMetrics:report.machineMetrics,routeMetrics:report.routeMetrics,review:report.qualitativeReviewNeeded,error:report.error}));

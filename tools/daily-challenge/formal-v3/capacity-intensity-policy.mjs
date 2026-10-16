import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {applyNativeDrag,replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {STAGES,intensityTargets,mechanismInventory,auditMechanismParticipation} from './mechanism-intensity.mjs';

// An additional, explicit design policy. The original uniform policy and its
// historical receipts remain unchanged. This does not certify a difficulty.
export const CAPACITY_INTENSITY_VERSION='daily-capacity-intensity-v1.1';
export const CAPACITY_STAGES=Object.freeze(['generator','axis-block','layered-lift','colored-grid']);
const numericRelease={
  'frozen-exit':'thawDrag','numeric-ice':'thawDrag','key-lock':'unlockDrag',
  shutter:'revealDrag','layered-lift':'revealDrag',
};
const total=inventory=>Object.values(inventory).reduce((sum,rows)=>sum+rows.length,0);

// Capture the actual physical portal chosen by the model, including an inner
// shell colour and the flip phase at that precise exit. Authored colour/side
// is insufficient when an ordinary portal and a star portal share a colour.
function observeExit(model,drag,options={}){
  const nativeTry=model.tryExit,events=[];
  model.tryExit=function(id,side){
    const before=this.snapshot(),result=nativeTry.call(this,id,side);
    if(result.ok){
      const gate=before.gates.find(g=>g.id===result.gateId),flip=before.flipDoors.find(g=>g.id===result.gateId);
      assert(gate||flip,'Actual exit must identify an existing physical portal');
      events.push({...result,blockId:id,clearedBefore:before.cleared,
        frozenBefore:(gate??flip).frozen,openBeforeExit:flip?.open??null,gateKind:flip?'flipDoor':'gate',
        remainingBodyIdsAfter:this.snapshot().blocks.map(b=>b.id)});
    }
    return result;
  };
  try{applyNativeDrag(model,drag,options);}finally{model.tryExit=nativeTry;}
  assert.equal(events.length,drag.exitSide?1:0);return events;
}

export function capacityTargets(mechanism,difficulty){
  assert(CAPACITY_STAGES.includes(mechanism),'Capacity policy is restricted to reviewed spatial mechanisms');
  assert([1,2,3].includes(difficulty));
  return {version:CAPACITY_INTENSITY_VERSION,mechanism,difficulty,
    minimumLatestInstances:1,minimumTotalInstances:difficulty+1,
    strictIncreaseOverPriorTotal:true,allPresentMechanismsParticipate:true,
    minimumDistinctReleaseEvents:2,applicableNumericCapacityTargets:'unchanged daily intensity v3.3 targets for every present mechanism',
    source:'v1.154 capacity-aware implementation; these counts are not user-fixed quotas'};
}

/** Replays the exact combined object and audits every mechanism, including
 * auxiliary devices. No model search, lower proof, or formal acceptance. */
export function auditCapacityIntensity(runtime,level,drags,mechanism,difficulty,priorInventory,{timeSchedule}={}){
  const targets=capacityTargets(mechanism,difficulty),inventory=mechanismInventory(level);
  assert(priorInventory&&Object.keys(inventory).every(key=>Array.isArray(priorInventory[key])), 'Full exact prior-slot inventory is required');
  runtime.validateLevel(level);
  const replay=replayDecorated(runtime,level,drags,timeSchedule),model=new runtime.PuzzleModel(level);
  model.startCountdown();
  const exitEvents=[];
  for(const [i,d]of drags.entries()){
    exitEvents.push(...observeExit(model,d,{timeSchedule,dragIndex:i}).map(event=>({...event,drag:i+1})));
  }
  const rows=[],issues=[],releaseEvents=new Set();
  for(const [m,instances]of Object.entries(inventory)){
    if(!instances.length)continue;
    if(STAGES[m]>STAGES[mechanism])issues.push(`not-unlocked:${m}`);
    const perType={...intensityTargets(m,difficulty),instances:instances.length};
    const row=auditMechanismParticipation(level,drags,replay,m,perType);
    // Shells can leave through two different colours. Bind actual runtime
    // colours rather than mistaking the authored outer colour for both exits.
    if(m==='frozen-exit')for(const item of row.details){
      const uses=exitEvents.filter(e=>e.gateId===item.id&&e.gateKind==='gate');
      item.evidence.realExitDrags=uses.map(e=>e.drag);
      item.evidence.actualPortalExits=uses;
      item.active=Number.isSafeInteger(item.evidence.thawDrag)&&uses.length>0&&uses.every(e=>e.frozenBefore===0);
    }
    if(m==='flip-door')for(const item of row.details){
      const uses=exitEvents.filter(e=>e.gateId===item.id&&e.gateKind==='flipDoor');
      item.evidence.realExitDrags=uses.map(e=>e.drag);
      item.evidence.actualPortalExits=uses;
      item.evidence.exitPhases=uses.map(e=>({drag:e.drag,openBeforeExit:e.openBeforeExit}));
      item.active=item.evidence.toggles>=2&&uses.length>0&&uses.every(e=>e.openBeforeExit&&e.frozenBefore===0);
    }
    if(m==='generator')for(const item of row.details){
      const allCargo=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds));
      const cargo=exitEvents.filter(e=>item.blockIds.includes(e.blockId)&&!e.layerRemoved);
      const remaining=cargo.map(e=>new Set(e.remainingBodyIdsAfter.filter(id=>!allCargo.has(id))).size);
      item.evidence.cargoClearDrags=cargo.map(e=>e.drag);
      item.evidence.baseBodiesRemainingAtCargoClear=remaining;
      item.active=cargo.length===item.queue&&new Set(cargo.map(e=>e.blockId)).size===item.queue&&remaining.every(n=>n>=2);
    }
    if(m==='shutter'||m==='layered-lift')for(const item of row.details){
      const hidden=level.blocks.filter(b=>b.shutterId===item.id);
      const removed=exitEvents.filter(e=>hidden.some(b=>b.id===e.blockId)&&!e.layerRemoved);
      item.evidence.hiddenClearDrags=removed.map(e=>e.drag);
      item.active=Number.isSafeInteger(item.evidence.revealDrag)&&hidden.length>0
        &&removed.length===hidden.length&&new Set(removed.map(e=>e.blockId)).size===hidden.length;
    }
    row.allParticipate=row.details.every(item=>item.active);
    row.capacityPolicyPass=row.countPass&&row.counterPass&&row.capacityPass&&row.allParticipate;
    if(!row.capacityPolicyPass)issues.push(`inactive-or-under-strength:${m}`);
    const event=numericRelease[m];
    if(event)for(const item of row.details){
      if(Number.isSafeInteger(item.evidence[event]))releaseEvents.add(item.evidence[event]);
    }
    rows.push(row);
  }
  const previousTotal=total(priorInventory),currentTotal=total(inventory);
  if(inventory[mechanism].length<targets.minimumLatestInstances)issues.push('missing-latest-mechanism');
  if(currentTotal<targets.minimumTotalInstances)issues.push('too-few-total-instances');
  if(currentTotal<=previousTotal)issues.push('not-increased-over-prior-total');
  // One primary spatial device must not be counted as several by adding
  // multiple cells/cargo. Each real device is still one inventory instance.
  if(inventory[mechanism].length<(priorInventory[mechanism]?.length??0))issues.push('latest-instance-regression');
  const releases=rows.filter(r=>numericRelease[r.mechanism]).reduce((n,r)=>n+r.instanceCount,0);
  if(releases>0&&releaseEvents.size<targets.minimumDistinctReleaseEvents)issues.push('unstaggered-combined-release-events');
  const result={version:CAPACITY_INTENSITY_VERSION,targets,passed:issues.length===0,issues,
    levelSha256:levelSha256(level),routeSha256:routeSha256(drags),inventory,rows,exitEvents,
    priorComparison:{priorInventory,currentInventory:inventory,previousTotal,currentTotal,
      instanceIncrease:currentTotal-previousTotal},
    releaseEvents:[...releaseEvents].sort((a,b)=>a-b),
    replay:{valid:replay.valid,complete:replay.complete,nonClearingDrags:replay.nonClearingDrags,
      clearEvents:replay.clearEvents,emptyBlocks:replay.finalSnapshot.blocks.length===0,
      emptyQueue:replay.finalSnapshot.queuedBlocks.length===0},
    searchAccounting:{fullBoardSolverInvocations:0,providedWitnessOnly:true},
    difficultyProof:false,formalReady:false,pointerValidated:false};
  return result;
}

/** Deterministic support on an already complete witness. No alternate world
 * search and no route repair: the final original model must accept every drag. */
export function addCapacitySupport(runtime,input,drags,mechanism,difficulty,priorInventory,{constructionBudget}={}){
  constructionBudget?.reserve(1,'support-input');
  const targets=capacityTargets(mechanism,difficulty),level=structuredClone(input);
  const inventory=mechanismInventory(level),needed=Math.max(targets.minimumTotalInstances,total(priorInventory)+1)-total(inventory);
  const model=new runtime.PuzzleModel(level);model.startCountdown();
  const firstAction=new Map(),firstExit=new Map(),releaseDragForCount=new Map();
  for(const [index,d]of drags.entries()){
    const b=model.getBlock(d.blockId),cleared=model.snapshot().cleared;
    if(!firstAction.has(b.id))firstAction.set(b.id,cleared);
    for(const event of observeExit(model,d))if(!firstExit.has(event.gateId))firstExit.set(event.gateId,cleared);
    for(let count=cleared+1;count<=model.snapshot().cleared;count++)releaseDragForCount.set(count,index+1);
  }
  assert(model.snapshot().complete);
  const options=[],changes=[],minimumCounter=intensityTargets('frozen-exit',difficulty).minimumCounter;
  if(STAGES[mechanism]>=STAGES['frozen-exit'])for(const gate of level.gates??[]){
    const count=firstExit.get(gate.id)??0;
    if(!gate.star&&!gate.frozen&&count>=minimumCounter)options.push({mechanism:'frozen-exit',id:gate.id,value:count});
  }
  if(STAGES[mechanism]>=STAGES['numeric-ice'])for(const b of level.blocks){
    const count=firstAction.get(b.id)??0;
    if(!b.frozen&&!b.shutterId&&!b.lockedBy&&!b.keyId&&!(b.layers?.length>1)
      &&!(level.generators??[]).some(g=>g.queueBlockIds.includes(b.id))&&count>=minimumCounter)
      options.push({mechanism:'numeric-ice',id:b.id,value:count});
  }
  options.sort((a,b)=>b.value-a.value||a.mechanism.localeCompare(b.mechanism)||a.id.localeCompare(b.id));
  const selected=[];
  // Prefer distinct event counters; adding a second batch with the same
  // count is legal only when the combined audit still has staggered release.
  for(const unique of [true,false])for(const option of options){
    if(selected.length>=needed)break;
    if(selected.includes(option)||unique&&selected.some(p=>p.value===option.value))continue;
    selected.push(option);
  }
  // A mixed design containing a release-type device needs two actual release
  // events. Support may exceed the minimum total; a missing second event is
  // never waived just because the instance count is already large enough.
  const existing=auditCapacityIntensity(runtime,input,drags,mechanism,difficulty,priorInventory);
  const currentRelease=new Set(existing.releaseEvents);
  for(const option of selected)currentRelease.add(releaseDragForCount.get(option.value));
  const existingReleaseDevices=existing.rows.filter(r=>numericRelease[r.mechanism]).reduce((n,r)=>n+r.instanceCount,0);
  if(existingReleaseDevices||selected.length)for(const option of options){
    if(currentRelease.size>=targets.minimumDistinctReleaseEvents)break;
    const releaseDrag=releaseDragForCount.get(option.value);
    if(selected.includes(option)||currentRelease.has(releaseDrag))continue;
    selected.push(option);currentRelease.add(releaseDrag);
  }
  for(const option of selected){
    constructionBudget?.reserve(1,'support-constraint');
    const target=option.mechanism==='frozen-exit'?level.gates.find(g=>g.id===option.id):level.blocks.find(b=>b.id===option.id);
    target.frozen=option.value;changes.push(option);
  }
  const audit=auditCapacityIntensity(runtime,level,drags,mechanism,difficulty,priorInventory);
  return {ok:audit.passed,level,drags:structuredClone(drags),changes,audit,needed,
    constructionSearchStates:0,unappliedOptions:options.filter(x=>!selected.includes(x))};
}

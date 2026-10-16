import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadRuntime,levelSha256,routeSha256} from '../daily-challenge/formal-v2/contract.mjs';
import {applyNativeDrag,replayDecorated} from '../daily-challenge/formal-v2/mechanism-decorate.mjs';
import {intensify,auditMechanismParticipation,mechanismInventory} from './mechanism-intensity.mjs';
import {leagueMechanismPlan,summarizeInventory} from './mechanism-policy.mjs';
import {auditLeagueMechanismStructure} from './mechanism-structure.mjs';

const mechanismBindings=()=>Object.fromEntries(['tools/league-v2/mechanism-compose.mjs','tools/league-v2/mechanism-policy.mjs','tools/league-v2/mechanism-intensity.mjs','tools/league-v2/mechanism-structure.mjs','tools/league-v2/mechanism-generator-sites.mjs',
  'tools/daily-challenge/formal-v2/mechanism-decorate.mjs','docs/rules/mechanism-rules-v1.155.0.md'].map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));

function routeTiming(runtime,level,drags){
  const model=new runtime.PuzzleModel(level);model.startCountdown();
  const bodies=new Map(level.blocks.map(b=>[b.id,{block:b,firstDrag:null,clearsBeforeFirst:null,exitDrag:null,exitSide:null,positions:[[b.x,b.y]],steps:0}])),firstExit=new Map();
  for(const [i,d]of drags.entries()){
    const before=model.snapshot(),b=model.getBlock(d.blockId),info=bodies.get(d.blockId);assert(b&&info);
    if(info.firstDrag===null){info.firstDrag=i;info.clearsBeforeFirst=before.cleared;}
    info.positions.push(...d.path);info.steps+=d.path.length;
    if(d.exitSide){const color=b.layers[0];if(!firstExit.has(color))firstExit.set(color,before.cleared);info.exitDrag=i;info.exitSide=d.exitSide;}
    applyNativeDrag(model,d);
  }
  assert(model.snapshot().complete);return {bodies:[...bodies.values()],firstExit};
}

/** Adds already-unlocked constraints to the primary mechanism's actual route.
 * No full-board search runs here. Counts are taken from the real sequence,
 * including layer-removal events, and the final combined model is replayed. */
function addConstraintSupport(runtime,level,drags,plan){
  const a=routeTiming(runtime,level,drags),changes=[],queued=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds));
  for(const target of plan.secondary){
    if(target.mechanism==='frozen-exit'){
      const gates=level.gates.filter(g=>!g.frozen&&!g.star&&(a.firstExit.get(g.color)??0)>=target.minimumCounter).sort((x,y)=>a.firstExit.get(y.color)-a.firstExit.get(x.color));
      for(const g of gates.slice(0,target.instances)){g.frozen=a.firstExit.get(g.color);changes.push({mechanism:target.mechanism,id:g.id,value:g.frozen});}
    }else if(target.mechanism==='numeric-ice'){
      const candidates=a.bodies.filter(x=>!queued.has(x.block.id)&&!x.block.frozen&&!x.block.shutterId&&!x.block.lockedBy&&!(x.block.layers?.length>1)&&x.clearsBeforeFirst>=target.minimumCounter).sort((x,y)=>y.clearsBeforeFirst-x.clearsBeforeFirst);
      const selected=[];for(const b of candidates){if(selected.length===target.instances)break;selected.push(b);}
      for(const info of selected){const b=level.blocks.find(b=>b.id===info.block.id);b.frozen=info.clearsBeforeFirst;changes.push({mechanism:target.mechanism,id:b.id,value:b.frozen});}
    }else if(target.mechanism==='axis-block'){
      const candidates=a.bodies.filter(x=>!queued.has(x.block.id)&&!x.block.movementAxis&&x.steps>0&&(x.positions.every(p=>p[0]===x.positions[0][0])&&['top','bottom'].includes(x.exitSide)||x.positions.every(p=>p[1]===x.positions[0][1])&&['left','right'].includes(x.exitSide)));
      for(const info of candidates.slice(0,target.instances)){const b=level.blocks.find(b=>b.id===info.block.id);b.movementAxis=['top','bottom'].includes(info.exitSide)?'vertical':'horizontal';changes.push({mechanism:target.mechanism,id:b.id,axis:b.movementAxis});}
    }
  }
  return changes;
}

export function auditAllLeagueMechanismParticipation(level,drags,replay){
  const inventory=mechanismInventory(level),rows=[];
  for(const [mechanism,instances]of Object.entries(inventory))if(instances.length){
    const targets={instances:instances.length,minimumCounter:null};
    const row=auditMechanismParticipation(level,drags,replay,mechanism,targets);
    if(mechanism==='frozen-exit'){
      for(const item of row.details){
        const used=replay.trace.filter(t=>t.clearDelta>0&&t.exitColor===item.color);
        item.evidence.realExitDrags=used.map(t=>t.drag);
        item.active=item.evidence.thawDrag!==undefined&&used.length>0;
      }
      row.allParticipate=row.details.every(x=>x.active);
    }
    // Stagger is a primary-stage intensity target, not a claim that every
    // older supporting counter type must have a second release event.
    row.pass=row.countPass&&row.counterPass&&row.allParticipate;rows.push(row);
  }
  return {passed:rows.every(r=>r.pass),rows,difficultyProof:false};
}

/** Independent read-only revalidation of the final supplied object. Does not
 * reconstruct a design, alter historical evidence, or perform lower search. */
export async function auditExistingLeagueMechanisms(input,{runtime,previousInventory}={}){
  runtime??=await loadRuntime();
  const {index,level,drags}=input,before=levelSha256(level),beforeRoute=routeSha256(drags);
  if(!previousInventory){const baseline=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/mechanisms/old-formal100-mechanisms.json'));previousInventory=baseline.rows[index-1].inventory;}
  const plan=input.plan??leagueMechanismPlan(index,{blockCount:level.blocks.length}),structure=await auditLeagueMechanismStructure(runtime,level,index);
  const issues=[...structure.issues];let replay,participation,primary;
  try{
    replay=replayDecorated(runtime,level,drags);
    const model=new runtime.PuzzleModel(level);model.startCountdown();for(const [i,d]of drags.entries()){if(d.exitSide)replay.trace[i].exitColor=model.getBlock(d.blockId).layers[0];applyNativeDrag(model,d);}
    participation=auditAllLeagueMechanismParticipation(level,drags,replay);
    if(!participation.passed)issues.push('mechanism-participation-failed');
    if(!plan.foundationOnly){primary=auditMechanismParticipation(level,drags,replay,plan.primary,plan.primaryTargets);if(!primary.pass)issues.push('primary-intensity-or-stagger-failed');}
  }catch(e){issues.push(`real-route-replay:${e.message}`);}
  const current=summarizeInventory(level),previousTotal=Object.values(previousInventory).reduce((n,x)=>n+x.instances,0),currentTotal=Object.values(current).reduce((n,x)=>n+x.instances,0);
  const comparison={previous:previousInventory,current,previousTotal,currentTotal,instanceIncrease:currentTotal-previousTotal,totalIncreased:currentTotal>previousTotal,
    counters:Object.fromEntries(Object.entries(current).map(([m,v])=>{const old=previousInventory[m]?.values??[],now=v.values??[];return [m,{oldValues:old,newValues:now,oldSum:old.reduce((a,b)=>a+b,0),newSum:now.reduce((a,b)=>a+b,0)}];}))};
  if(index>=6&&index<10&&previousTotal>=7){const oldValues=previousInventory['frozen-exit'].values,newValues=current['frozen-exit'].values;
    comparison.capacityException={reason:'eight-colours-require-one-initially-open-exit-before-other-devices-unlock',maximumPositiveIceGates:7,requiredOpenGates:1,oldInstances:previousTotal,newInstances:currentTotal,oldValues,newValues,
      oldCounterSum:oldValues.reduce((a,b)=>a+b,0),newCounterSum:newValues.reduce((a,b)=>a+b,0),valid:currentTotal===7&&newValues.reduce((a,b)=>a+b,0)>oldValues.reduce((a,b)=>a+b,0)};}
  if(!plan.foundationOnly&&!comparison.totalIncreased&&comparison.capacityException?.valid!==true)issues.push('old-same-index-instance-strength-not-improved');
  if(before!==levelSha256(level)||beforeRoute!==routeSha256(drags))issues.push('input-mutated');
  const mechanismToolchainBindings=mechanismBindings();
  return {ok:issues.length===0,status:issues.length?'MECHANISM_REVALIDATION_REJECTED':'FINAL_OBJECT_MECHANISMS_REPLAY_VERIFIED',index,sourceLevelId:input.sourceLevelId,
    level,drags,levelSha256:before,routeSha256:beforeRoute,plan,structure,replay,participation,primary,comparison,issues,
    mechanismToolchainBindings,mechanismToolchainSha256:levelSha256(mechanismToolchainBindings),
    searchAccounting:{fullBoardSolverInvocations:0,independentExactObjectReplay:true,lowerBoundSearch:false},formalEligibility:false,pointerValidated:false,timeValidated:false};
}

export async function composeLeagueMechanisms(input,{index,sourceLevelId,runtime,variant=0,maxAttempts=4,previousInventory}={}){
  runtime??=await loadRuntime();sourceLevelId??=input.sourceLevelId;
  const base=structuredClone(input.level),inputHash=levelSha256(base),drags=input.drags;
  const plan=leagueMechanismPlan(index,{blockCount:base.blocks.length});
  if(index===13){
    const ice=plan.secondary.find(t=>t.mechanism==='numeric-ice');
    if(ice){ice.instances=5;ice.minimumCounter=3;}
    plan.capacityBasis='At slot13, digital ice is already unlocked. Five actual numeric-ice supports with event-derived counters of at least3 may accompany frozen exits, rather than demanding more than7 positive gates from8 colours. The true combined instance count must exceed the old7.';
  }
  const previousCount=previousInventory?Object.values(previousInventory).reduce((n,x)=>n+x.instances,0):null;
  if(index>=6&&index<10&&previousCount!==null){
    // Before numeric ice, 8 colours allow at most 7 positive ice gates: an
    // eighth would lock every exit and no clear/peel could thaw any gate.
    plan.primaryTargets.instances=Math.min(7,previousCount+1);
    if(previousCount>=7){
      plan.primaryTargets.minimumCounter=2;
      plan.capacityLimited={reason:'eight-colours-require-one-initially-open-exit-before-other-devices-unlock',maximumPositiveIceGates:7,requiredOpenGates:1};
    }
  }
  if(plan.primaryTargets.instances>12)return {ok:false,reason:'old primary intensity exceeds supported capacity; redesign required',plan,formalEligibility:false};
  let primary;
  if(plan.foundationOnly)primary={ok:true,level:base,drags:structuredClone(drags),searchAccounting:{fullBoardSolverInvocations:0,knownRouteReplay:true,localHeldReachability:[]}};
  else primary=await intensify(base,drags,plan.primary,{runtime,index,difficulty:index%5===3?2:1,sourceLevelId,variant,maxAttempts,targets:plan.primaryTargets,idPrefix:`league-${index}-v2`,microBudget:{maxReachable:256,maxTransitions:4096}});
  if(!primary.ok&&plan.primary==='generator'&&index>=38){
    plan.capacityAdaptation={attemptedInstances:2,appliedInstances:1,reason:'Finite two-device route construction failed. After the introductory35–37 slots, one real mid-board FIFO device may cooperate with other unlocked constraints; total actual instances must still exceed the old same-index count.',doubleDeviceConstructionFailures:primary.failedAttempts.map(a=>({attempt:a.attempt,error:a.error})),fullBoardSearches:0};
    plan.primaryTargets.instances=1;plan.primaryTargets.queuePerGenerator=index%5===3?5:4;
    primary=await intensify(base,drags,plan.primary,{runtime,index,difficulty:index%5===3?2:1,sourceLevelId,variant,maxAttempts,targets:plan.primaryTargets,idPrefix:`league-${index}-v2`,microBudget:{maxReachable:256,maxTransitions:4096}});
  }
  if(!primary.ok&&[78,88,96,98].includes(index)){
    const applied=[88,96].includes(index)?1:2,extraSupport=plan.primaryTargets.instances-applied;
    plan.capacityAdaptation={attemptedInstances:plan.primaryTargets.instances,appliedInstances:applied,reason:'This later rotation has finite route capacity for fewer primary devices. Introductory stages remain unchanged; an extra already-unlocked numeric-ice support target compensates, total true instances must still exceed the old same-index level, and every configured instance must participate.',originalConstructionFailures:primary.failedAttempts.map(a=>({attempt:a.attempt,error:a.error})),fullBoardSearches:0};
    plan.primaryTargets.instances=applied;
    const ice=plan.secondary.find(t=>t.mechanism==='numeric-ice');if(ice)ice.instances+=extraSupport;
    primary=await intensify(base,drags,plan.primary,{runtime,index,difficulty:index%5===3?2:1,sourceLevelId,variant,maxAttempts,targets:plan.primaryTargets,idPrefix:`league-${index}-v2`,microBudget:{maxReachable:256,maxTransitions:4096}});
  }
  if(!primary.ok)return {...primary,index,sourceLevelId,plan};
  try{
    const level=structuredClone(primary.level),route=primary.drags;
    level.id=900000+index;level.name=`荣耀联赛${index}·重制`;level.timeSeconds=180;level.reward=0;level.difficulty=index%5===3?'super':'hard';
    const secondaryChanges=addConstraintSupport(runtime,level,route,plan);
    if(previousCount!==null&&!plan.foundationOnly){
      const expandable=[...plan.secondary];
      if(['numeric-ice','frozen-exit','axis-block'].includes(plan.primary))expandable.push({mechanism:plan.primary,minimumCounter:plan.primaryTargets.minimumCounter});
      for(const target of expandable){
        const count=Object.values(mechanismInventory(level)).reduce((n,items)=>n+items.length,0),needed=previousCount+1-count;
        if(needed<=0)break;
        secondaryChanges.push(...addConstraintSupport(runtime,level,route,{secondary:[{...target,instances:needed}]}));
      }
    }
    const structure=await auditLeagueMechanismStructure(runtime,level,index);assert(structure.passed,structure.issues.join(';'));
    const replay=replayDecorated(runtime,level,route);
    const colorModel=new runtime.PuzzleModel(level);colorModel.startCountdown();
    for(const [i,d]of route.entries()){if(d.exitSide)replay.trace[i].exitColor=colorModel.getBlock(d.blockId).layers[0];applyNativeDrag(colorModel,d);}
    const participation=auditAllLeagueMechanismParticipation(level,route,replay);assert(participation.passed,'combined mechanism participation failed');
    const inventory=summarizeInventory(level),totalInstances=Object.values(inventory).reduce((n,x)=>n+x.instances,0);
    const comparison={previous:previousInventory??null,current:inventory,previousTotal:previousCount,currentTotal:totalInstances,
      instanceIncrease:previousCount===null?null:totalInstances-previousCount,
      totalIncreased:previousCount===null?null:totalInstances>previousCount};
    if(plan.capacityLimited){
      const oldValues=previousInventory['frozen-exit'].values,newValues=inventory['frozen-exit'].values;
      comparison.capacityException={...plan.capacityLimited,oldInstances:previousCount,newInstances:totalInstances,oldValues,newValues,
        oldCounterSum:oldValues.reduce((a,b)=>a+b,0),newCounterSum:newValues.reduce((a,b)=>a+b,0),
        valid:totalInstances===7&&newValues.reduce((a,b)=>a+b,0)>oldValues.reduce((a,b)=>a+b,0)};
    }
    if(!plan.foundationOnly&&previousCount!==null)assert(totalInstances>previousCount||comparison.capacityException?.valid===true,'combined mechanism instances did not increase over old same-index level');
    assert.equal(levelSha256(input.level),inputHash,'input mutated');
    const mechanismToolchainBindings=mechanismBindings();
    return {ok:true,status:'MECHANISMS_COMPLETE_ROUTE_PENDING_LOWER_DIVERSITY_POINTER',index,sourceLevelId,
      level,drags:route,levelSha256:levelSha256(level),routeSha256:routeSha256(route),plan,
      primary:plan.foundationOnly?null:auditMechanismParticipation(level,route,replay,plan.primary,plan.primaryTargets),secondaryChanges,structure,replay,participation,comparison,
      searchAccounting:primary.searchAccounting,inputLevelSha256:inputHash,mechanismToolchainBindings,
      mechanismToolchainSha256:levelSha256(mechanismToolchainBindings),formalEligibility:false,pointerValidated:false,timeValidated:false};
  }catch(e){return {ok:false,status:'MECHANISM_COMBINATION_REJECTED',index,sourceLevelId,plan,reason:e.message,
    primaryStatus:primary.ok,formalEligibility:false};}
}

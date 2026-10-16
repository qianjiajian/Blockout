import assert from 'node:assert/strict';
import { loadRuntime, levelSha256, routeSha256, auditStaticCandidate } from '../formal-v2/contract.mjs';
import { applyNativeDrag, replayDecorated } from '../formal-v2/mechanism-decorate.mjs';

export const INTENSITY_VERSION = 'daily-mechanism-intensity-v3.3';
export const STAGES = Object.freeze({ 'color-exit': 1, 'irregular-block': 5, 'frozen-exit': 6, 'irregular-board': 8,
  'numeric-ice': 10, 'multilayer-shell': 15, shutter: 20, generator: 35, 'axis-block': 50,
  'key-lock': 59, 'layered-lift': 65, star: 100, bomb: 120, 'flip-door': 150, 'colored-grid': 200 });
const clone = structuredClone;
const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
const cells = b => b.shape.map(([x,y]) => `${b.x+x},${b.y+y}`);
const rectangle = b => b.shape.length === (Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1);
const rotate = (list,n) => list.length ? [...list.slice(n%list.length),...list.slice(0,n%list.length)] : [];
const stageId = stage => typeof stage === 'object' ? stage.newestMechanism ?? stage.id
  : Object.keys(STAGES).find(m => stage===m || stage===`mechanisms-${m}-${STAGES[m]}`);

/** These are disclosed implementation targets, not user-confirmed quotas or difficulty proofs. */
export function intensityTargets(stage,difficulty=1,overrides={}) {
  const mechanism=stageId(stage); assert(mechanism && [1,2,3].includes(difficulty));
  const numeric=['frozen-exit','numeric-ice','shutter','key-lock'].includes(mechanism);
  const result={mechanism,difficulty,instances:difficulty+1,minimumCounter:numeric ? (mechanism==='key-lock'?difficulty+1:2*difficulty+1) : null,
    queuePerGenerator:mechanism==='generator'?difficulty+2:null,minimumLiftArea:mechanism==='layered-lift'?2:null,
    gridCellsPerInstance:mechanism==='colored-grid'?1:null,policy:'design target; incompatible inputs rejected, never relabelled as satisfied',...overrides};
  assert(Number.isSafeInteger(result.instances)&&result.instances>=2&&result.instances<=12);
  if(result.minimumCounter!==null)assert(Number.isSafeInteger(result.minimumCounter)&&result.minimumCounter>=2);
  return result;
}

export function mechanismInventory(level) {
  const blocks=level.blocks,shutters=level.shutters??[],gates=level.gates??[];
  return {
    'frozen-exit':gates.filter(g=>g.frozen>0).map(g=>({id:g.id,value:g.frozen,color:g.color})),
    'numeric-ice':blocks.filter(b=>b.frozen>0).map(b=>({id:b.id,value:b.frozen})),
    'multilayer-shell':blocks.filter(b=>b.layers?.length>1).map(b=>({id:b.id,layers:b.layers.length})),
    shutter:shutters.filter(s=>s.skin!=='lift').map(s=>({id:s.id,value:s.count,area:s.width*s.height})),
    generator:(level.generators??[]).map(g=>({id:g.id,queue:g.queueBlockIds.length,blockIds:g.queueBlockIds})),
    'axis-block':blocks.filter(b=>b.movementAxis).map(b=>({id:b.id,axis:b.movementAxis})),
    'key-lock':blocks.filter(b=>b.lockedBy).map(b=>({id:b.id,value:b.lockCount??1,keyGroup:b.lockedBy,keys:blocks.filter(k=>k.keyId===b.lockedBy).map(k=>k.id)})),
    'layered-lift':shutters.filter(s=>s.skin==='lift').map(s=>({id:s.id,area:s.width*s.height,hiddenBodies:blocks.filter(b=>b.shutterId===s.id).length,numericCounterNotUsedByLift:true})),
    star:blocks.filter(b=>b.star).map(b=>({id:b.id,color:b.color})),
    bomb:blocks.filter(b=>b.timedBombSeconds>0).map(b=>({id:b.id,seconds:b.timedBombSeconds,timeIncreaseIsRelaxation:true})),
    'flip-door':(level.flipDoors??[]).map(g=>({id:g.id,color:g.color,initiallyOpen:g.initiallyOpen})),
    'colored-grid':(level.coloredGrids??[]).map(g=>({id:g.id,color:g.color,cells:g.cells.length})),
  };
}

function analyze(runtime,level,drags) {
  const model=new runtime.PuzzleModel(level); model.startCountdown();
  const bodies=new Map(level.blocks.map(b=>[b.id,{block:b,firstDrag:null,clearsBeforeFirst:null,exitIndex:null,exitSide:null,clearsBeforeExit:null,poses:[[b.x,b.y]],unitSteps:0}]));
  const visits=new Map(),entries=new Map(),departures=new Map(),firstExit=new Map(),parities=new Map();
  const visit=(b,pos)=>{for(const [x,y] of b.shape){const k=`${pos[0]+x},${pos[1]+y}`;if(!visits.has(k))visits.set(k,new Set());visits.get(k).add(b.color);}};
  for(const b of level.blocks)visit(b,[b.x,b.y]);
  for(const [i,d] of drags.entries()) {
    const before=model.snapshot(),info=bodies.get(d.blockId);assert(info,'base route must refer to an opening body');
    if(info.firstDrag===null){info.firstDrag=i;info.clearsBeforeFirst=before.cleared;}
    let previous=cells(model.getBlock(d.blockId));
    for(const pos of d.path){const next=cells({...info.block,x:pos[0],y:pos[1]});for(const k of next)if(!previous.includes(k))entries.set(k,(entries.get(k)??0)+1);for(const k of previous)if(!next.includes(k))departures.set(k,(departures.get(k)??0)+1);previous=next;visit(info.block,pos);info.poses.push(pos);info.unitSteps++;}
    applyNativeDrag(model,d);
    if(d.exitSide){const color=info.block.color;info.exitIndex=i;info.exitSide=d.exitSide;info.clearsBeforeExit=before.cleared;if(!firstExit.has(color))firstExit.set(color,before.cleared);if(!parities.has(color))parities.set(color,new Set());parities.get(color).add(before.cleared%2);}
  }
  assert(model.snapshot().complete,'base route must really complete');
  return {bodies:[...bodies.values()],visits,entries,departures,firstExit,parities};
}

/** Bounded one-held-body reachability; counts are separate from full-board solver states. */
export function findHeldExit(model,blockId,budget={}) {
  const maxReachable=budget.maxReachable??512,maxTransitions=budget.maxTransitions??4096;
  assert(Number.isSafeInteger(maxReachable)&&maxReachable>0&&maxReachable<=10000);
  assert(Number.isSafeInteger(maxTransitions)&&maxTransitions>0&&maxTransitions<=100000);
  const start=model.getBlock(blockId),stats={kind:'single-held-body-reachability',discovered:0,expanded:0,transitions:0,maxReachable,maxTransitions,fullBoardSearch:false};
  if(!start||!model.isBlockActive(start))return {drag:null,stats:{...stats,reason:'inactive'}};
  const queue=[{model:model.clone(),path:[]}],seen=new Set();stats.discovered=1;
  const key=m=>{const s=m.snapshot();return JSON.stringify([s.blocks,s.queuedBlocks,s.shutters,s.generators]);};seen.add(key(model));
  for(let i=0;i<queue.length;i++){
    stats.expanded++;const node=queue[i],b=node.model.getBlock(blockId),sides=node.model.possibleExitSides(b);
    if(sides.length===1)return {drag:{blockId,path:node.path,exitSide:sides[0]},stats:{...stats,reason:'route-found'}};
    if(sides.length>1)continue;
    for(const [dx,dy]of DIRS){if(stats.transitions>=maxTransitions)return {drag:null,stats:{...stats,reason:'micro-transition-budget'}};stats.transitions++;
      const next=node.model.clone();next.beginAction();const pos=[b.x+dx,b.y+dy];if(!next.moveBlockStep(blockId,...pos))continue;const k=key(next);if(seen.has(k))continue;
      if(stats.discovered>=maxReachable)return {drag:null,stats:{...stats,reason:'micro-reachable-budget'}};seen.add(k);stats.discovered++;queue.push({model:next,path:[...node.path,pos]});
    }
  }
  return {drag:null,stats:{...stats,reason:'micro-exhausted'}};
}

function art(runtime,b,color,kind='solid'){const s=runtime.matchFormalBlockShape(b.shape,'native-only');return !!(s&&s.quarterTurns===0&&runtime.GAME_ART.gameplay.formalBlocks[color]?.[kind]?.[s.shapeId]);}
function mounts(level,b){const out=[],w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;if(w>3||h>3)return out;
  for(const side of ['left','right','top','bottom']){if(side==='left'&&b.x!==0||side==='right'&&b.x+w!==level.width||side==='top'&&b.y!==0||side==='bottom'&&b.y+h!==level.height)continue;
    const vertical=['left','right'].includes(side),length=vertical?level.height:level.width,first=vertical?b.y:b.x,last=first+(vertical?h:w)-1;
    for(let offset=Math.max(1,first);offset<=Math.min(length-2,last);offset++){if(first<offset-1||last>offset+1)continue;if(level.gates.some(g=>g.side===side&&g.offset<offset+2&&offset-1<g.offset+g.size))continue;out.push({side,offset,rimSpan:3,rimMount:'rim',spawn:[b.x,b.y]});}
  }return out;
}

function adaptInventoryRoute(runtime,level,baseDrags,extraIds,shellIds,flipRepair,searches,microBudget){
  const model=new runtime.PuzzleModel(level);model.startCountdown();const route=[];
  const commit=d=>{applyNativeDrag(model,d);route.push(d);};
  const find=id=>{const r=findHeldExit(model,id,microBudget);searches.push({blockId:id,...r.stats});return r.drag;};
  for(const original of baseDrags){if(!model.getBlock(original.blockId))continue;let succeeded=false;
    for(let repair=0;repair<=level.blocks.length;repair++){
      const probe=model.clone();try{applyNativeDrag(probe,original);commit(clone(original));succeeded=true;break;}catch(e){if(!flipRepair)throw e;}
      let extra=null;for(const b of model.snapshot().blocks){if(b.id===original.blockId)continue;extra=find(b.id);if(extra)break;}assert(extra,'flip route repair has no free legal clear');commit(extra);
    }assert(succeeded,'finite flip repair exhausted');
    for(let guard=0;guard<level.blocks.length;guard++){
      let extra=null;for(const b of model.snapshot().blocks){if(extraIds.has(b.id)||shellIds.has(b.id)&&b.layers.length===1){extra=find(b.id);if(extra)break;}}
      if(!extra)break;commit(extra);
    }
  }
  assert(model.snapshot().complete&&!model.snapshot().queuedBlocks.length,'all added inventory must clear with the adapted real route');return route;
}

/** Audit actual participation; no difficulty or optimality assertion is made here. */
export function auditMechanismParticipation(level,drags,replay,stage,targets){
  const m=stageId(stage),inventory=mechanismInventory(level),instances=inventory[m]??[],trace=replay.trace,byBlock=id=>trace.filter(t=>t.blockId===id),exits=id=>byBlock(id).filter(t=>t.clearDelta>0),details=[];
  for(const item of instances){let active=false,evidence={};
    if(m==='frozen-exit'){const thaw=trace.find(t=>t.gateCounts.find(g=>g.id===item.id)?.frozen===0),users=level.blocks.filter(b=>b.color===item.color).flatMap(b=>exits(b.id));active=!!thaw&&users.length>0;evidence={thawDrag:thaw?.drag,realExitDrags:users.map(t=>t.drag)};}
    if(m==='numeric-ice'){const thaw=trace.find(t=>t.thawed.includes(item.id));active=!!thaw&&byBlock(item.id).length>0;evidence={thawDrag:thaw?.drag,firstAction:byBlock(item.id)[0]?.drag};}
    if(m==='key-lock'){const unlock=trace.find(t=>t.unlocked.includes(item.id)),keyEvents=item.keys.flatMap(exits);active=!!unlock&&keyEvents.length>=item.value&&byBlock(item.id).length>0;evidence={unlockDrag:unlock?.drag,keyClearDrags:keyEvents.map(t=>t.drag),firstAction:byBlock(item.id)[0]?.drag};}
    if(m==='multilayer-shell'){const peels=trace.filter(t=>t.peeled.includes(item.id));active=peels.length>0&&exits(item.id).length===2;evidence={peelDrags:peels.map(t=>t.drag),allRemovalDrags:exits(item.id).map(t=>t.drag)};}
    if(m==='axis-block'||m==='star'){const ds=drags.filter(d=>d.blockId===item.id);active=ds.some(d=>d.path.length)&&ds.some(d=>d.exitSide);evidence={unitSteps:ds.reduce((n,d)=>n+d.path.length,0),exitDrags:exits(item.id).map(t=>t.drag)};}
    if(m==='shutter'||m==='layered-lift'){const reveal=trace.find(t=>t.shutters.find(s=>s.id===item.id)?.revealed),hidden=level.blocks.filter(b=>b.shutterId===item.id),removed=hidden.flatMap(b=>exits(b.id));active=!!reveal&&removed.length===hidden.length;evidence={revealDrag:reveal?.drag,hiddenBodies:hidden.map(b=>b.id),hiddenClearDrags:removed.map(t=>t.drag)};}
    if(m==='generator'){const cargo=item.blockIds.flatMap(exits),allQueuedIds=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds));const baseBodiesRemainingAtCargoClear=cargo.map(t=>trace.slice(trace.indexOf(t)+1).filter(later=>!allQueuedIds.has(later.blockId)&&later.clearDelta>0).length);active=cargo.length===item.queue&&baseBodiesRemainingAtCargoClear.every(n=>n>=2);evidence={cargoClearDrags:cargo.map(t=>t.drag),fullFIFOInventory:item.blockIds,baseBodiesRemainingAtCargoClear};}
    if(m==='flip-door'){let prior=!!item.initiallyOpen,toggles=0;for(const t of trace){const next=t.flipDoors.find(g=>g.id===item.id)?.open;if(next!==prior)toggles++;prior=next;}const users=level.blocks.filter(b=>b.color===item.color).flatMap(b=>exits(b.id));const exitPhases=users.map(t=>({drag:t.drag,openBeforeExit:t.drag===1?!!item.initiallyOpen:trace[t.drag-2].flipDoors.find(g=>g.id===item.id)?.open}));active=toggles>=2&&users.length>0&&exitPhases.every(p=>p.openBeforeExit);evidence={toggles,realExitDrags:users.map(t=>t.drag),exitPhases};}
    if(m==='bomb'){const removed=exits(item.id),s=replay.timeSchedule;const elapsed=removed.length&&s?drags.slice(0,removed[0].drag).reduce((sum,d)=>sum+s.secondsPerDrag+d.path.length*s.secondsPerUnitStep+(d.exitSide?s.secondsPerExitAnimation:0),0):null;active=removed.length>0&&s!==null&&elapsed<item.seconds;evidence={removalDrag:removed[0]?.drag,controlledSchedule:s,scheduledElapsedIncludingRemovalAnimation:elapsed,conservativeDeadlineMargin:elapsed===null?null:item.seconds-elapsed,largerSecondsNotClaimedAsMoreDifficulty:true,naturalTimeValidated:false};}
    if(m==='colored-grid'){const grid=level.coloredGrids.find(g=>g.id===item.id),positions=new Map(level.blocks.map(b=>[b.id,[b.x,b.y]]));let interactions=0;for(const d of drags){const b=level.blocks.find(b=>b.id===d.blockId),poses=[positions.get(d.blockId),...d.path].filter(Boolean);if(b?.color===grid.color&&(d.path.length||d.exitSide)&&poses.some(pos=>grid.cells.some(([x,y])=>b.shape.some(([dx,dy])=>pos[0]+dx===x&&pos[1]+dy===y))))interactions++;if(d.path.length)positions.set(d.blockId,d.path.at(-1));if(d.exitSide)positions.delete(d.blockId);}active=interactions>0;evidence={movingSameColorInteractions:interactions};}
    details.push({...item,active,evidence});
  }
  const countPass=instances.length>=targets.instances,counterPass=targets.minimumCounter===null||instances.every(i=>i.value>=targets.minimumCounter);
  const capacityPass=m==='generator'?Number.isSafeInteger(targets.queuePerGenerator)&&targets.queuePerGenerator>0&&instances.every(i=>i.queue>=targets.queuePerGenerator)
    :m==='layered-lift'?Number.isSafeInteger(targets.minimumLiftArea)&&targets.minimumLiftArea>0&&instances.every(i=>i.area>=targets.minimumLiftArea)
    :m==='colored-grid'?Number.isSafeInteger(targets.gridCellsPerInstance)&&targets.gridCellsPerInstance>0&&instances.every(i=>i.cells>=targets.gridCellsPerInstance):true;
  const eventKey=m==='frozen-exit'?'thawDrag':m==='numeric-ice'?'thawDrag':m==='key-lock'?'unlockDrag':m==='shutter'||m==='layered-lift'?'revealDrag':null;
  const distinctReleaseEvents=eventKey?new Set(details.map(d=>d.evidence[eventKey])).size:null;
  const staggerPass=eventKey===null||distinctReleaseEvents>=2;
  return {mechanism:m,targets,instanceCount:instances.length,countPass,counterPass,capacityPass,allParticipate:details.every(x=>x.active),distinctReleaseEvents,staggerPass,details,pass:countPass&&counterPass&&capacityPass&&staggerPass&&details.every(x=>x.active),difficultyProof:false};
}

/** Uses a known route plus bounded local held-body searches. Never launches a full-board solver. */
export async function intensify(inputLevel,inputDrags,stage,options={}){
  const runtime=options.runtime??await loadRuntime(),mechanism=stageId(stage),difficulty=options.difficulty??1;
  assert(mechanism,'unknown mechanism');runtime.assertPlainProofDomain(inputLevel);
  const targets=intensityTargets(mechanism,difficulty,options.targets),a=analyze(runtime,inputLevel,inputDrags),n=targets.instances;
  const failedAttempts=[],maxAttempts=Math.min(24,options.maxAttempts??12),inputLevelSha256=levelSha256(inputLevel),inputRouteSha256=routeSha256(inputDrags);
  for(let attempt=0;attempt<maxAttempts;attempt++){const searches=[];let participation;try{
    const level=clone(inputLevel),id=options.idPrefix??`intense-${mechanism}`,order=rotate(a.bodies,options.variant??0),extraIds=new Set(),shellIds=new Set();let route=clone(inputDrags),timeSchedule;
    const select=(list,count=n)=>{assert(list.length>=count,`only ${list.length} compatible instances for target ${count}`);return rotate(list,attempt).slice(0,count);};
    if(mechanism==='frozen-exit')for(const g of select(level.gates.filter(g=>(a.firstExit.get(g.color)??0)>=targets.minimumCounter)))g.frozen=a.firstExit.get(g.color);
    else if(mechanism==='numeric-ice')for(const b of select(order.filter(b=>b.clearsBeforeFirst>=targets.minimumCounter)))level.blocks.find(x=>x.id===b.block.id).frozen=b.clearsBeforeFirst;
    else if(mechanism==='axis-block')for(const b of select(order.filter(b=>b.unitSteps>0&&(b.poses.every(p=>p[0]===b.poses[0][0])&&['top','bottom'].includes(b.exitSide)||b.poses.every(p=>p[1]===b.poses[0][1])&&['left','right'].includes(b.exitSide)))))level.blocks.find(x=>x.id===b.block.id).movementAxis=['top','bottom'].includes(b.exitSide)?'vertical':'horizontal';
    else if(mechanism==='key-lock'){
      const keys=a.bodies.toSorted((x,y)=>x.exitIndex-y.exitIndex).slice(0,targets.minimumCounter+n-1),keyIds=new Set(keys.map(b=>b.block.id));
      const locks=select(order.filter(b=>!keyIds.has(b.block.id)&&keys.filter(k=>k.exitIndex<b.firstDrag).length>=targets.minimumCounter));
      const counts=locks.map(b=>keys.filter(k=>k.exitIndex<b.firstDrag).length),usedKeyCount=Math.max(...counts);
      for(const k of keys.slice(0,usedKeyCount))level.blocks.find(b=>b.id===k.block.id).keyId=id+'-shared-key';
      for(const [i,b]of locks.entries())Object.assign(level.blocks.find(x=>x.id===b.block.id),{lockedBy:id+'-shared-key',lockCount:counts[i]});
    } else if(mechanism==='star'){
      const distinct=[...new Map(order.filter(b=>b.unitSteps>0).map(b=>[b.block.color,b])).values()];const chosen=select(distinct);for(const b of chosen){level.blocks.find(x=>x.id===b.block.id).star=true;level.gates.find(g=>g.color===b.block.color).star=true;}
    } else if(mechanism==='shutter'){
      level.shutters=[];for(const [i,b]of select(order.filter(b=>rectangle(b.block)&&b.clearsBeforeFirst>=targets.minimumCounter)).entries()){const sid=id+'-cover-'+i;level.blocks.find(x=>x.id===b.block.id).shutterId=sid;level.shutters.push({id:sid,x:b.block.x,y:b.block.y,width:Math.max(...b.block.shape.map(p=>p[0]))+1,height:Math.max(...b.block.shape.map(p=>p[1]))+1,count:b.clearsBeforeFirst});}
    } else if(mechanism==='colored-grid'){
      const eligible=[...a.visits].filter(([k,v])=>v.size===1&&((a.entries.get(k)??0)>0||(a.departures.get(k)??0)>0)),groups=new Map();for(const [k,colors]of eligible){const color=[...colors][0];if(!groups.has(color))groups.set(color,[]);groups.get(color).push(k.split(',').map(Number));}
      level.coloredGrids=select([...groups].filter(([,cs])=>cs.length>=targets.gridCellsPerInstance)).map(([color,cs],i)=>({id:id+'-grid-'+i,color,cells:cs.slice(0,targets.gridCellsPerInstance)}));
    } else if(mechanism==='flip-door'){
      const stable=level.gates.filter(g=>a.parities.get(g.color)?.size===1),others=level.gates.filter(g=>!stable.includes(g));const chosen=select([...stable,...others]);level.flipDoors=chosen.map(g=>({...g,initiallyOpen:(a.firstExit.get(g.color)??0)%2===0}));level.gates=level.gates.filter(g=>!chosen.includes(g));
      route=adaptInventoryRoute(runtime,level,route,extraIds,shellIds,true,searches,options.microBudget);
    } else if(mechanism==='bomb'){
      timeSchedule={kind:'per-drag-and-unit-step-v1',secondsPerDrag:.4,secondsPerUnitStep:.25,secondsPerExitAnimation:.4};let elapsed=0;const clearTimes=new Map();for(const d of route){elapsed+=.4+d.path.length*.25+(d.exitSide ? .4 : 0);if(d.exitSide)clearTimes.set(d.blockId,elapsed);}
      for(const b of select(a.bodies.toSorted((x,y)=>x.exitIndex-y.exitIndex).slice(0,Math.max(n,n+attempt)))){const seconds=Math.max(15,Math.ceil(clearTimes.get(b.block.id)+5));assert(seconds<level.timeSeconds,'bomb deadline must precede level deadline');level.blocks.find(x=>x.id===b.block.id).timedBombSeconds=seconds;}
    } else if(mechanism==='multilayer-shell'){
      const chosen=select(order.filter(b=>art(runtime,b.block,b.block.color,'shell')).toSorted((x,y)=>y.exitIndex-x.exitIndex));for(const b of chosen){const colors=level.gates.map(g=>g.color).filter(c=>c!==b.block.color&&art(runtime,b.block,c));assert(colors.length,'inner layer lacks native material');level.blocks.find(x=>x.id===b.block.id).layers=[b.block.color,colors[(attempt+shellIds.size)%colors.length]];shellIds.add(b.block.id);}
      route=adaptInventoryRoute(runtime,level,route,extraIds,shellIds,false,searches,options.microBudget);
    } else if(mechanism==='layered-lift'){
      level.shutters=[];for(const [i,b]of select(order.filter(b=>rectangle(b.block)&&b.block.shape.length>=targets.minimumLiftArea&&b.firstDrag===b.exitIndex&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<level.blocks.length-2)).entries()){
        const sid=id+'-lift-'+i,hidden={...clone(b.block),id:id+'-hidden-'+i,shutterId:sid};level.blocks.push(hidden);extraIds.add(hidden.id);level.shutters.push({id:sid,x:b.block.x,y:b.block.y,width:Math.max(...b.block.shape.map(p=>p[0]))+1,height:Math.max(...b.block.shape.map(p=>p[1]))+1,count:1,skin:'lift'});
      }route=adaptInventoryRoute(runtime,level,route,extraIds,shellIds,false,searches,options.microBudget);
    } else if(mechanism==='generator'){
      const possible=order.filter(b=>rectangle(b.block)&&b.firstDrag===b.exitIndex&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<inputLevel.blocks.length-2).flatMap(b=>mounts(level,b.block).map(mount=>({b,mount}))),chosen=[];
      for(const p of rotate(possible,attempt)){if(chosen.some(q=>q.b.block.id===p.b.block.id||q.mount.side===p.mount.side&&Math.abs(q.mount.offset-p.mount.offset)<3))continue;chosen.push(p);if(chosen.length===n)break;}assert(chosen.length===n,`only ${chosen.length} real disjoint generator mounts for ${n}`);level.generators=[];
      for(const [i,{b,mount}]of chosen.entries()){const colors=level.gates.map(g=>g.color).filter(c=>c!==b.block.color&&art(runtime,b.block,c));assert(colors.length,'cargo needs a second native color');const queue=[];for(let j=0;j<targets.queuePerGenerator;j++){const cargo={...clone(b.block),id:id+'-cargo-'+i+'-'+j,color:j%2?colors[(attempt+i)%colors.length]:b.block.color};level.blocks.push(cargo);queue.push(cargo.id);extraIds.add(cargo.id);}level.generators.push({id:id+'-machine-'+i,...mount,queueBlockIds:queue});}
      route=adaptInventoryRoute(runtime,level,route,extraIds,shellIds,false,searches,options.microBudget);
    } else throw Error('foundation geometry belongs to the global layout factory; no synthetic intensity metric');
    runtime.validateLevel(level);const formalId=options.formalId??`daily-mechanisms-${mechanism}-${STAGES[mechanism]}-d${difficulty}-fixture`,stageKey=`mechanisms-${mechanism}-${STAGES[mechanism]}`;
    const staticAudit=await auditStaticCandidate(runtime,{formalId,stageKey,difficulty,sourceLevelId:options.sourceLevelId??level.id,level});assert(staticAudit.passed,staticAudit.issues.join(';'));
    const replay=replayDecorated(runtime,level,route,timeSchedule);participation=auditMechanismParticipation(level,route,replay,mechanism,targets);assert(participation.pass,'not all target mechanisms actually participate');
    assert.equal(levelSha256(inputLevel),inputLevelSha256);assert.equal(routeSha256(inputDrags),inputRouteSha256);
    const prior=options.priorLevel?mechanismInventory(options.priorLevel)[mechanism]:null;
    const priorComparison=prior?{scope:'exact prior slot object',priorLevelSha256:levelSha256(options.priorLevel),priorInstances:prior,
      currentInstances:mechanismInventory(level)[mechanism],instanceIncrease:participation.instanceCount-prior.length}:null;
    return {ok:true,version:INTENSITY_VERSION,formalId,stageKey,difficulty,sourceLevelId:options.sourceLevelId??level.id,level,drags:route,timeSchedule,levelSha256:levelSha256(level),routeSha256:routeSha256(route),targets,staticAudit,replay,participation,
      priorComparison,searchAccounting:{fullBoardSolverInvocations:0,knownRouteReplay:true,localHeldReachability:searches,noOptimalityClaim:true},provenance:{inputLevelSha256,inputRouteSha256,attemptsUsed:attempt+1,maxAttempts,policyNotUserFixedQuota:true},failedAttempts,formalEligibility:false,pointerValidated:false,timeValidated:false};
  }catch(error){failedAttempts.push({attempt:attempt+1,error:error.message,participation,localHeldReachability:searches});}}
  return {ok:false,version:INTENSITY_VERSION,mechanism,targets,inputLevelSha256,inputRouteSha256,reason:'finite mechanism adaptation exhausted; change layout/shape/color rather than inflate search budget',failedAttempts,formalEligibility:false};
}

/** Finite deterministic adapter batch. Allocation, diversity and bounded proofs remain caller-owned. */
export async function intensifyBatch(inputs,options={}){
  const maxCandidates=options.maxCandidates??450;
  assert(Array.isArray(inputs)&&Number.isSafeInteger(maxCandidates)&&maxCandidates>0&&maxCandidates<=450&&inputs.length<=maxCandidates);
  const runtime=options.runtime??await loadRuntime(),results=[];
  for(const [index,input]of inputs.entries()){
    let result;try{result=await intensify(input.level,input.drags,input.stage??input.stageKey,{...options,...input,runtime});}
    catch(error){result={ok:false,version:INTENSITY_VERSION,reason:error.message,inputLevelSha256:input.level?levelSha256(input.level):null,formalEligibility:false};}
    const entry={index,inputId:input.inputId??input.formalId??null,basePath:input.basePath??null,result};results.push(entry);
    if(options.onResult)await options.onResult(entry);
  }
  return {version:INTENSITY_VERSION,attempted:results.length,mechanismCompatible:results.filter(x=>x.result.ok).length,formalAccepted:0,results};
}

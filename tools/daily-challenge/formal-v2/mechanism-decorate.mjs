import assert from 'node:assert/strict';
import { loadRuntime, levelSha256, routeSha256, auditStaticCandidate } from './contract.mjs';

export const DECORATOR_VERSION='daily-route-aware-decoration-v2.6';
const DIRECTIONS=[[0,-1],[1,0],[0,1],[-1,0]];
const STAGES={'color-exit':1,'irregular-block':5,'frozen-exit':6,'irregular-board':8,'numeric-ice':10,'multilayer-shell':15,shutter:20,generator:35,'axis-block':50,'key-lock':59,'layered-lift':65,star:100,bomb:120,'flip-door':150,'colored-grid':200};
const cells=b=>b.shape.map(([dx,dy])=>`${b.x+dx},${b.y+dy}`);
const rectangle=b=>new Set(cells(b)).size===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])));
const clone=v=>structuredClone(v);
const rotate=(a,n)=>a.length?[...a.slice(n%a.length),...a.slice(0,n%a.length)]:[];
const cleanReplay=r=>({...r,finalStateKey:undefined});

export function applyNativeDrag(model,drag,{timeSchedule,events,dragIndex=0}={}){
 const tick=seconds=>{if(seconds>0){model.tick(seconds);assert(!model.snapshot().failed,'controlled deadline failed');}};
 tick(timeSchedule?.secondsPerDrag??0);model.beginAction();let sides=model.possibleExitSides(model.getBlock(drag.blockId));
 assert(sides.length<=1,'decorator requires unique physical exit per active color');assert(!sides.length||!drag.path.length,'first contact must end a drag');
 for(const [step,p]of drag.path.entries()){
  tick(timeSchedule?.secondsPerUnitStep??0);const before=model.snapshot();assert(model.moveBlockStep(drag.blockId,...p),`rejected move ${drag.blockId} ${p}`);const after=model.snapshot();
  if(events&&(after.queuedBlocks.length!==before.queuedBlocks.length||after.shutters.some((c,j)=>c.revealed!==before.shutters[j]?.revealed)))events.push({drag:dragIndex+1,unitStep:step+1,type:'spawn-or-reveal-during-held-drag',queuedBefore:before.queuedBlocks.map(b=>b.id),queuedAfter:after.queuedBlocks.map(b=>b.id),shuttersBefore:before.shutters,shuttersAfter:after.shutters});
  sides=model.possibleExitSides(model.getBlock(drag.blockId));assert(sides.length<=1);assert(!sides.length||step===drag.path.length-1,'first contact must end held path');
 }
 assert.deepEqual(sides,drag.exitSide?[drag.exitSide]:[],'unique canonical exit mismatch');
 if(drag.exitSide){assert(model.tryExit(drag.blockId,drag.exitSide).ok);tick(timeSchedule?.secondsPerExitAnimation??0);}
 assert(model.commitAction(),'gesture must be effective');assert(!model.snapshot().failed);
}

export function replayDecorated(runtime,level,drags,timeSchedule){
 const model=new runtime.PuzzleModel(level);model.startCountdown();const trace=[],events=[];let nonClearingDrags=0,clearEvents=0;
 const initial=model.snapshot();
 for(const [index,drag]of drags.entries()){
  const before=model.snapshot();applyNativeDrag(model,drag,{timeSchedule,events,dragIndex:index});const after=model.snapshot(),clearDelta=after.cleared-before.cleared;
  assert.equal(after.moves,before.moves+1);nonClearingDrags+=Number(clearDelta===0);clearEvents+=clearDelta;
  const peeled=before.blocks.filter(b=>{const a=after.blocks.find(a=>a.id===b.id);return a&&a.layers.length<b.layers.length;}).map(b=>b.id);
  const thawed=before.blocks.filter(b=>b.frozen>0&&(after.blocks.find(a=>a.id===b.id)?.frozen??0)===0).map(b=>b.id);
  const unlocked=before.blocks.filter(b=>b.lockedBy&&!after.blocks.find(a=>a.id===b.id)?.lockedBy).map(b=>b.id);
  trace.push({drag:index+1,blockId:drag.blockId,clearDelta,nonClearing:clearDelta===0,peeled,thawed,unlocked,gateCounts:after.gates.map(g=>({id:g.id,frozen:g.frozen})),flipDoors:after.flipDoors.map(g=>({id:g.id,open:g.open})),shutters:after.shutters.map(c=>({id:c.id,revealed:c.revealed,count:c.count})),queuedCount:after.queuedBlocks.length,stateSha256:levelSha256(after)});
 }
 const final=model.snapshot();assert(final.complete&&!final.failed&&!final.blocks.length&&!final.queuedBlocks.length,'full real inventory must be removed');
 return {valid:true,complete:true,effectiveDrags:drags.length,nonClearingDrags,clearEvents,initialSnapshot:initial,finalSnapshot:final,trace,events,controlledElapsedSeconds:level.timeSeconds-final.remainingSeconds,timeSchedule:timeSchedule??null,simulation:true,naturalTimeValidated:false,pointerValidated:false};
}

// A bounded one-held-body BFS. It ends at the first legal automatic exit and
// never crosses a prior exit contact. The unmodified native model handles
// every reveal/spawn during each unit step; no inventory is removed here.
export function findNativeClearDrag(model,blockId,maxStates=512){
 const start=model.getBlock(blockId);if(!start||!model.isBlockActive(start))return null;
 const queue=[{model:model.clone(),path:[]}],seen=new Set();
 for(let qi=0;qi<queue.length&&qi<maxStates;qi++){
  const node=queue[qi],b=node.model.getBlock(blockId);if(!b)continue;const sides=node.model.possibleExitSides(b);if(sides.length===1)return {blockId,path:node.path,exitSide:sides[0]};if(sides.length>1)return null;
  for(const [dx,dy]of DIRECTIONS){const next=node.model.clone();next.beginAction();const p=[b.x+dx,b.y+dy];if(!next.moveBlockStep(blockId,...p))continue;
   const snapshot=next.snapshot();const key=JSON.stringify({blocks:snapshot.blocks,queued:snapshot.queuedBlocks,shutters:snapshot.shutters,generators:snapshot.generators});if(seen.has(key))continue;seen.add(key);queue.push({model:next,path:[...node.path,p]});if(queue.length>=maxStates)break;
  }
 }
 return null;
}

function findNativeTargetDrag(model,blockId,target,maxStates=512){
 const start=model.getBlock(blockId);if(!start||!model.isBlockActive(start))return null;
 const queue=[{model:model.clone(),path:[]}],seen=new Set([`${start.x},${start.y}`]);
 for(let qi=0;qi<queue.length&&qi<maxStates;qi++){
  const node=queue[qi],b=node.model.getBlock(blockId),exits=node.model.possibleExitSides(b);
  if(!exits.length&&b.x===target[0]&&b.y===target[1]&&node.path.length)return {blockId,path:node.path};
  if(exits.length)continue;
  for(const [dx,dy]of DIRECTIONS){const p=[b.x+dx,b.y+dy],key=p.join(',');if(seen.has(key))continue;
   const next=node.model.clone();next.beginAction();if(!next.moveBlockStep(blockId,...p))continue;
   seen.add(key);queue.push({model:next,path:[...node.path,p]});if(queue.length>=maxStates)break;
  }
 }
 return null;
}

function adaptGridPaths(runtime,level,drags){
 const model=new runtime.PuzzleModel(level);model.startCountdown();const route=[],reroutedDrags=[];
 for(const [index,d]of drags.entries()){
  const probe=model.clone();let chosen=d;
  try{applyNativeDrag(probe,d);}catch(error){
   chosen=d.exitSide?findNativeClearDrag(model,d.blockId):findNativeTargetDrag(model,d.blockId,d.path.at(-1));
   assert(chosen,'colored grid has no finite equal-cost held path');
   reroutedDrags.push({drag:index+1,originalDrag:d,replacementDrag:chosen,originalRejection:error.message});
  }
  applyNativeDrag(model,chosen);route.push(chosen);
 }
 assert(model.snapshot().complete);assert(reroutedDrags.length,'grid fallback must actually change a previously blocked trajectory');
 return {drags:route,gridRouteAdaptation:{method:'same-drag-endpoints-native-held-path-reroute',reroutedDrags}};
}

function analyze(runtime,level,drags){
 const model=new runtime.PuzzleModel(level);model.startCountdown();const byId=new Map(level.blocks.map(b=>[b.id,{block:b,firstDrag:null,clearsBeforeFirst:null,poses:[[b.x,b.y]],unitSteps:0,exitIndex:null,clearsBeforeExit:null,exitSide:null}]));
 const cellColors=new Map(),cellEntries=new Map(),cellExits=new Map(),firstVacated=new Map(),vacancyStates=[],gateFirstClear=new Map(),gateParities=new Map();let clear=0;
 const occupy=()=>{for(const b of model.snapshot().blocks)for(const k of cells(b)){if(!cellColors.has(k))cellColors.set(k,new Set());cellColors.get(k).add(b.layers[0]);}};
 occupy();
 for(const [i,d]of drags.entries()){
  const info=byId.get(d.blockId);if(info.firstDrag===null){info.firstDrag=i;info.clearsBeforeFirst=clear;}
  model.beginAction();for(const p of d.path){const b=model.getBlock(d.blockId),before=new Set(cells(b));assert(model.moveBlockStep(d.blockId,...p));const after=model.getBlock(d.blockId),afterCells=new Set(cells(after));info.poses.push(p);info.unitSteps++;for(const k of afterCells)if(!before.has(k))cellEntries.set(k,(cellEntries.get(k)??0)+1);for(const k of before)if(!afterCells.has(k)){cellExits.set(k,(cellExits.get(k)??0)+1);if(!firstVacated.has(k))firstVacated.set(k,{drag:i,cleared:clear});}occupy();vacancyStates.push({drag:i,cleared:clear,occupied:new Set(model.snapshot().blocks.flatMap(cells))});}
  if(d.exitSide){const b=model.getBlock(d.blockId),color=b.layers[0],oldCells=cells(b);if(!gateFirstClear.has(color))gateFirstClear.set(color,clear);if(!gateParities.has(color))gateParities.set(color,new Set());gateParities.get(color).add(clear%2);info.exitIndex=i;info.clearsBeforeExit=clear;info.exitSide=d.exitSide;assert(model.tryExit(d.blockId,d.exitSide).ok);clear++;for(const k of oldCells)if(!firstVacated.has(k))firstVacated.set(k,{drag:i,cleared:clear});vacancyStates.push({drag:i,cleared:clear,occupied:new Set(model.snapshot().blocks.flatMap(cells))});}assert(model.commitAction());
 }
 assert(model.snapshot().complete);return {bodies:[...byId.values()],cellColors,cellEntries,cellExits,firstVacated,vacancyStates,gateFirstClear,gateParities};
}

function artColor(runtime,block,color,kind='solid'){
 const shape=runtime.matchFormalBlockShape(block.shape,'native-only');return Boolean(shape&&shape.quarterTurns===0&&runtime.GAME_ART.gameplay.formalBlocks[color]?.[kind]?.[shape.shapeId]);
}
function plainZeroCostClosure(runtime,level){
 const model=new runtime.PuzzleModel(level);model.startCountdown();const drags=[];
 for(;;){let next=null;
  for(const b of model.snapshot().blocks){next=findNativeClearDrag(model,b.id);if(next)break;}
  if(!next)break;applyNativeDrag(model,next);drags.push(next);
 }
 return drags;
}
function mountCandidates(level,b){
 const bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1])),out=[];
 for(const side of ['left','right','top','bottom']){
  if(side==='left'&&b.x!==0||side==='right'&&b.x+bw!==level.width||side==='top'&&b.y!==0||side==='bottom'&&b.y+bh!==level.height)continue;
  const vertical=['left','right'].includes(side),length=vertical?level.height:level.width;if(length<3||bw>3||bh>3)continue;
  // Generator offset is the CENTER rail, unlike a gate's first rail. The
  // fixed cargo footprint must include its mouth cell and fit the 3x3 tray.
  const first=vertical?b.y:b.x,last=first+(vertical?bh:bw)-1;
  for(let offset=Math.max(1,first);offset<=Math.min(length-2,last);offset++){
   if(first<offset-1||last>offset+1)continue;
   if(level.gates.some(g=>g.side===side&&g.offset<offset+2&&offset-1<g.offset+g.size))continue;
   out.push({side,offset,rimSpan:3,rimMount:'rim',spawn:[b.x,b.y]});
  }
 }
 return out;
}

/** Pure finite decorator; does not certify lower bounds or write any files.
 * Input must already be a complete plain baseline with a real complete route.
 * The caller allocates globally unique partitions and re-runs the full contract.
 */
export async function decorate(inputLevel,inputDrags,stage,options={}){
 const runtime=options.runtime??await loadRuntime();const mechanism=typeof stage==='string'?(stage.startsWith('mechanisms-')?Object.keys(STAGES).find(m=>stage===`mechanisms-${m}-${STAGES[m]}`):stage):stage.newestMechanism??stage.id;
 if(!STAGES[mechanism])throw Error(`unknown mechanism stage ${String(stage)}`);
 const level=clone(inputLevel),drags=clone(inputDrags),inputHash=levelSha256(inputLevel),inputRouteHash=routeSha256(inputDrags);runtime.assertPlainProofDomain(level);
 const analysis=analyze(runtime,level,drags),variant=options.variant??0,maxAttempts=Math.min(24,Math.max(1,options.maxAttempts??12));const attempts=[],plans=[];const id=options.idPrefix??`daily-decoration-${mechanism}-${variant}`;
 const basic=(label,edit,timeSchedule)=>plans.push({label,make:()=>{const l=clone(level);edit(l);return {level:l,drags:clone(drags),timeSchedule};}});
 const bodyPlans=analysis.bodies;
 if(mechanism==='color-exit')basic('plain-baseline',()=>{});
 else if(mechanism==='frozen-exit')for(const gate of rotate(level.gates.filter(g=>(analysis.gateFirstClear.get(g.color)??0)>0),variant))basic(`ice-${gate.id}`,l=>{l.gates.find(g=>g.id===gate.id).frozen=Math.min(3,analysis.gateFirstClear.get(gate.color));});
 else if(mechanism==='numeric-ice')for(const b of rotate(bodyPlans.filter(b=>b.clearsBeforeFirst>0).sort((a,b)=>a.clearsBeforeFirst-b.clearsBeforeFirst),variant))basic(`body-ice-${b.block.id}`,l=>{l.blocks.find(x=>x.id===b.block.id).frozen=Math.min(3,b.clearsBeforeFirst);});
 else if(mechanism==='axis-block')for(const b of rotate(bodyPlans.filter(b=>b.unitSteps>0&&(b.poses.every(p=>p[0]===b.poses[0][0])&&['top','bottom'].includes(b.exitSide)||b.poses.every(p=>p[1]===b.poses[0][1])&&['left','right'].includes(b.exitSide))).sort((a,b)=>b.unitSteps-a.unitSteps),variant))basic(`axis-${b.block.id}`,l=>{l.blocks.find(x=>x.id===b.block.id).movementAxis=['top','bottom'].includes(b.exitSide)?'vertical':'horizontal';});
 else if(mechanism==='key-lock')for(const b of rotate(bodyPlans.filter(b=>b.clearsBeforeFirst>0),variant)){const key=bodyPlans.filter(k=>k.exitIndex<b.firstDrag&&k.block.id!==b.block.id).sort((a,b)=>b.exitIndex-a.exitIndex)[0];if(key)basic(`key-${key.block.id}-lock-${b.block.id}`,l=>{l.blocks.find(x=>x.id===key.block.id).keyId=`${id}-key`;Object.assign(l.blocks.find(x=>x.id===b.block.id),{lockedBy:`${id}-key`,lockCount:1});});}
 else if(mechanism==='star')for(const b of rotate(bodyPlans.filter(b=>b.unitSteps>0),variant))basic(`star-${b.block.id}`,l=>{l.blocks.find(x=>x.id===b.block.id).star=true;l.gates.find(g=>g.color===b.block.color).star=true;});
 else if(mechanism==='colored-grid'){
  for(const [key,colors]of rotate([...analysis.cellColors].filter(([k,c])=>c.size===1&&((analysis.cellEntries.get(k)??0)>0||(analysis.cellExits.get(k)??0)>0)),variant))basic(`grid-${key}`,l=>{l.coloredGrids=[{id:`${id}-grid`,color:[...colors][0],cells:[key.split(',').map(Number)]}];});
  for(const b of rotate(level.blocks,variant))for(const key of cells(b))plans.push({label:`grid-reroute-${key}`,make(){const l=clone(level);l.coloredGrids=[{id:`${id}-grid`,color:b.color,cells:[key.split(',').map(Number)]}];return {level:l,...adaptGridPaths(runtime,l,drags)};}});
 }
 else if(mechanism==='flip-door')for(const g of rotate(level.gates.filter(g=>analysis.gateParities.get(g.color)?.size===1),variant))basic(`flip-${g.id}`,l=>{const original=l.gates.find(x=>x.id===g.id);l.gates=l.gates.filter(x=>x.id!==g.id);l.flipDoors=[{...original,initiallyOpen:[...analysis.gateParities.get(g.color)][0]===0}];});
 else if(mechanism==='bomb')for(const b of rotate(bodyPlans.filter(b=>b.exitIndex!==null&&b.clearsBeforeExit<=2).sort((a,b)=>a.exitIndex-b.exitIndex),variant))basic(`bomb-${b.block.id}`,l=>{l.blocks.find(x=>x.id===b.block.id).timedBombSeconds=Math.min(15,Math.max(1,l.timeSeconds-1));},{kind:'per-drag-and-unit-step-v1',secondsPerDrag:0.2,secondsPerUnitStep:0.2,secondsPerExitAnimation:0.4});
 else if(mechanism==='multilayer-shell'){
  for(const last of rotate(bodyPlans.filter(b=>b.exitIndex!==null&&artColor(runtime,b.block,b.block.color,'shell')).sort((a,b)=>b.exitIndex-a.exitIndex),variant))for(const color of rotate(level.gates.map(g=>g.color).filter(c=>c!==last.block.color&&artColor(runtime,last.block,c)),variant))plans.push({label:`shell-${last.block.id}-${color}`,make(){const l=clone(level);l.blocks.find(b=>b.id===last.block.id).layers=[last.block.color,color];const model=new runtime.PuzzleModel(l);model.startCountdown();const prefix=drags.slice(0,last.exitIndex+1);for(const d of prefix)applyNativeDrag(model,d);const continuation=findNativeClearDrag(model,last.block.id);assert(continuation,'no finite one-drag inner-layer exit');return {level:l,drags:[...clone(prefix),continuation,...clone(drags.slice(last.exitIndex+1))]};}});
 } else if(mechanism==='shutter'){
  const closure=plainZeroCostClosure(runtime,level),zeroCostIds=new Set(closure.map(d=>d.blockId));
  const preferred=bodyPlans.filter(b=>rectangle(b.block)&&zeroCostIds.has(b.block.id));
  const cover=(l,b,count)=>{l.blocks.find(x=>x.id===b.block.id).shutterId=`${id}-cover`;l.shutters=[{id:`${id}-cover`,x:b.block.x,y:b.block.y,width:1+Math.max(...b.block.shape.map(p=>p[0])),height:1+Math.max(...b.block.shape.map(p=>p[1])),count}];};
  for(const b of rotate(preferred.sort((a,b)=>Number(a.clearsBeforeFirst===0)-Number(b.clearsBeforeFirst===0)),variant))plans.push({label:`shutter-free-closure-${b.block.id}`,make(){
   const l=clone(level);cover(l,b,1);let route=clone(drags),firstClear=null;
   if(b.clearsBeforeFirst===0){
    const initial=new runtime.PuzzleModel(l);initial.startCountdown();
    for(const other of level.blocks)if(other.id!==b.block.id){firstClear=findNativeClearDrag(initial,other.id);if(firstClear)break;}
    assert(firstClear,'count-one cover requires another real initially clearable body');
    route=[firstClear,...route.filter(d=>d.blockId!==firstClear.blockId)];
   }
   return {level:l,drags:route,mechanismActivity:{kind:'shutter',hiddenBodyId:b.block.id,triggerCount:1,plainZeroCostClosure:closure,initialOtherClear:firstClear,projectionRationale:'Only an opening body in the plain zero-cost clear closure is hidden; the fresh projected lower checker still decides acceptance.'}};
  }});
  for(const b of rotate(bodyPlans.filter(b=>rectangle(b.block)&&b.clearsBeforeFirst>0&&!zeroCostIds.has(b.block.id)).sort((a,b)=>a.clearsBeforeFirst-b.clearsBeforeFirst),variant))basic(`shutter-${b.block.id}`,l=>cover(l,b,Math.min(3,b.clearsBeforeFirst)));
 } else if(mechanism==='layered-lift'){
  for(const b of rotate(bodyPlans.filter(b=>rectangle(b.block)&&b.firstDrag===b.exitIndex&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<level.blocks.length-2&&b.unitSteps>0),variant))plans.push({label:`lift-${b.block.id}`,make(){const l=clone(level),hidden={...clone(b.block),id:`${id}-hidden`,shutterId:`${id}-lift`};l.blocks.push(hidden);l.shutters=[{id:`${id}-lift`,x:b.block.x,y:b.block.y,width:1+Math.max(...b.block.shape.map(p=>p[0])),height:1+Math.max(...b.block.shape.map(p=>p[1])),count:1,skin:'lift'}];const model=new runtime.PuzzleModel(l);model.startCountdown();const prefix=drags.slice(0,b.exitIndex+1);for(const d of prefix)applyNativeDrag(model,d);const extra=findNativeClearDrag(model,hidden.id);assert(extra,'new lift layer cannot be fully cleared by a single legal held route');return {level:l,drags:[...clone(prefix),extra,...clone(drags.slice(b.exitIndex+1))]};}});
 } else if(mechanism==='generator'){
  for(const b of rotate(bodyPlans.filter(b=>rectangle(b.block)&&b.firstDrag===b.exitIndex&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<level.blocks.length-2&&b.unitSteps>0),variant))for(const mount of mountCandidates(level,b.block))for(const color of rotate(level.gates.map(g=>g.color).filter(c=>c!==b.block.color&&artColor(runtime,b.block,c)),variant))plans.push({label:`generator-${b.block.id}-${mount.side}-${color}`,make(){const l=clone(level),first={...clone(b.block),id:`${id}-cargo1`},second={...clone(b.block),id:`${id}-cargo2`,color};l.blocks.push(first,second);l.generators=[{id:`${id}-machine`,...mount,queueBlockIds:[first.id,second.id]}];const model=new runtime.PuzzleModel(l);model.startCountdown();const prefix=drags.slice(0,b.exitIndex+1);for(const d of prefix)applyNativeDrag(model,d);const a=findNativeClearDrag(model,first.id);assert(a,'first actual FIFO cargo has no immediate legal route');applyNativeDrag(model,a);const z=findNativeClearDrag(model,second.id);assert(z,'second actual FIFO cargo has no immediate legal route');return {level:l,drags:[...clone(prefix),a,z,...clone(drags.slice(b.exitIndex+1))]};}});
  // Small native cargo can occupy a strict subset of the opening block's
  // footprint. Its first vacancy is measured on the actual base trajectory;
  // only middle-game vacancies qualify, and every spawn is replayed in situ.
  const smallPlans=[];
  const cargoShapes=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]]];
  for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)for(const shape of cargoShapes){
   const small={x,y,shape};
   for(const mount of mountCandidates(level,small)){
    const footprint=cells(small),vacancy=analysis.vacancyStates.find(s=>footprint.every(k=>!s.occupied.has(k)));
    if(!vacancy||vacancy.cleared<2||vacancy.cleared>=level.blocks.length-2)continue;
    const distance=g=>Math.abs(x-(g.side==='left'?0:g.side==='right'?level.width-1:g.offset+(g.size-1)/2))+Math.abs(y-(g.side==='top'?0:g.side==='bottom'?level.height-1:g.offset+(g.size-1)/2));
    const colors=level.gates.filter(g=>artColor(runtime,small,g.color)).map(g=>({color:g.color,distance:distance(g)}));
    for(const a of colors)for(const z of colors)if(a.color!==z.color)smallPlans.push({priority:a.distance+z.distance+shape.length/10,mount,vacancy,small,firstColor:a.color,secondColor:z.color});
   }
  }
  for(const p of rotate(smallPlans.sort((a,b)=>a.priority-b.priority),variant))plans.push({label:`generator-small-${p.mount.side}-${p.mount.offset}-${p.small.shape.length}-${p.firstColor}-${p.secondColor}`,make(){
   const l=clone(level),first={...clone(p.small),id:`${id}-cargo1`,color:p.firstColor},second={...clone(p.small),id:`${id}-cargo2`,color:p.secondColor};
   l.blocks.push(first,second);l.generators=[{id:`${id}-machine`,...p.mount,queueBlockIds:[first.id,second.id]}];
   const model=new runtime.PuzzleModel(l);model.startCountdown();const route=[],cargoClearEvents=[];
   for(const [i,d]of drags.entries()){
    applyNativeDrag(model,d);route.push(clone(d));
    for(const cargo of [first,second]){const block=model.getBlock(cargo.id);if(!block||!model.isBlockActive(block))continue;
     const extra=findNativeClearDrag(model,cargo.id);if(!extra)continue;
     applyNativeDrag(model,extra);route.push(extra);cargoClearEvents.push({blockId:cargo.id,afterBaseDrag:i+1,remainingBaseBodies:model.snapshot().blocks.filter(b=>b.id!==first.id&&b.id!==second.id).length});
    }
   }
   assert(cargoClearEvents.length===2,'both authored cargo bodies require complete real routes');
   assert(cargoClearEvents.every(e=>e.remainingBaseBodies>=2),'cargo must participate before the final two base bodies');
   assert(model.snapshot().complete&&!model.snapshot().queuedBlocks.length);
   return {level:l,drags:route,mechanismActivity:{kind:'generator',authoredCargoShape:p.small.shape,firstSpawnBaseDrag:p.vacancy.drag+1,baseClearsBeforeFirstSpawn:p.vacancy.cleared,baseBodiesRemainingAtFirstSpawn:level.blocks.length-p.vacancy.cleared,queueColors:[p.firstColor,p.secondColor],cargoClearEvents}};
  }});
 } else return {ok:false,mechanism,reason:'this decorator does not invent irregular geometry',attempts:[]};
 for(const plan of plans.slice(0,maxAttempts)){
  try{const candidate=plan.make();runtime.validateLevel(candidate.level);const stageKey=`mechanisms-${mechanism}-${STAGES[mechanism]}`,formalId=options.formalId??`daily-${stageKey}-d${options.difficulty??3}-decorator`;
   const staticAudit=await auditStaticCandidate(runtime,{formalId,stageKey,difficulty:options.difficulty??3,sourceLevelId:options.sourceLevelId??level.id,level:candidate.level});assert(staticAudit.passed,staticAudit.issues.join(';'));
   const replay=replayDecorated(runtime,candidate.level,candidate.drags,candidate.timeSchedule);const canonicalReplay=candidate.timeSchedule?null:runtime.replayRevisedRoute(candidate.level,candidate.drags);assert(!canonicalReplay||canonicalReplay.valid&&canonicalReplay.complete,canonicalReplay?.error??'canonical replay failed');
   if(mechanism==='colored-grid'){
    const actual=analyze(runtime,candidate.level,candidate.drags);
    candidate.mechanismActivity={kind:'colored-grid',cells:candidate.level.coloredGrids.flatMap(g=>g.cells.map(cell=>({gridId:g.id,cell,color:g.color,initialBodyId:level.blocks.find(b=>cells(b).includes(cell.join(',')))?.id,enteredByMovement:actual.cellEntries.get(cell.join(','))??0,vacatedByMovement:actual.cellExits.get(cell.join(','))??0,visitedColors:[...(actual.cellColors.get(cell.join(','))??[])]}))),note:'Real colored cells constrain occupancy throughout play. Entry or departure is recorded; this does not claim a stronger minimum route than the fresh lower proof.'};
   }
   assert.equal(levelSha256(inputLevel),inputHash);assert.equal(routeSha256(inputDrags),inputRouteHash);
   return {ok:true,mechanism,formalId,stageKey,difficulty:options.difficulty??3,sourceLevelId:options.sourceLevelId??level.id,...candidate,levelSha256:levelSha256(candidate.level),routeSha256:routeSha256(candidate.drags),replay,canonicalReplay:canonicalReplay?cleanReplay(canonicalReplay):null,staticAudit,provenance:{method:DECORATOR_VERSION,plan:plan.label,inputLevelSha256:inputHash,inputRouteSha256:inputRouteHash,variant,maxAttempts,attemptsUsed:attempts.length+1,globalUniqueBaseRequired:true},failedAttempts:attempts,formalEligibility:false,pointerValidated:false,timeValidated:false};
  }catch(error){attempts.push({plan:plan.label,error:error.message});}
 }
 return {ok:false,mechanism,attempts,reason:plans.length?'finite compatible-plan budget exhausted':'no route-compatible active mechanism plan',inputLevelSha256:inputHash,inputRouteSha256:inputRouteHash};
}

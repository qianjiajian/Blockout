import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {levelSha256,auditStaticCandidate} from '../formal-v2/contract.mjs';
import {applyNativeDrag,replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {loadBoundedRuntime,verifyBoundedCandidate,designFingerprints,boundedBudget} from './bounded-proof.mjs';
import {buildGlobalCandidate,boardCells,absoluteCells,FACTORY_VERSION} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';
import {intensify,intensityTargets,auditMechanismParticipation,findHeldExit,STAGES} from './mechanism-intensity.mjs';

export const MECHANISM_DESIGNER_VERSION='mechanism-directed-whole-board-v3.1';
const ROOT='deliverables/daily-formal-v3-20261008';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const cellKey=p=>p.join(',');
const rect=b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])));
const extent=b=>({w:1+Math.max(...b.shape.map(p=>p[0])),h:1+Math.max(...b.shape.map(p=>p[1]))});
const pipelineFiles=['mechanism-base-designer.mjs','diversity-layout-factory.mjs','mechanism-intensity.mjs'];

/** Diagnose a known route without another whole-board search. The counts are
 * actual first actions/exits, not a promise that another route cannot be easier. */
export function routeCapacity(runtime,level,drags){
 const model=new runtime.PuzzleModel(level);model.startCountdown();
 const first=new Map(),firstColorExit=new Map();
 for(const[index,drag]of drags.entries()){
  const before=model.snapshot(),body=model.getBlock(drag.blockId);
  if(!first.has(drag.blockId))first.set(drag.blockId,{blockId:drag.blockId,drag:index+1,clears:before.cleared});
  applyNativeDrag(model,drag);
  if(drag.exitSide&&!firstColorExit.has(body.color))firstColorExit.set(body.color,{color:body.color,drag:index+1,clears:before.cleared});
 }
 if(!model.snapshot().complete)throw Error('Capacity requires an actual complete route');
 return{firstAction:[...first.values()],firstColorExit:[...firstColorExit.values()],
  numericIceD3Compatible:[...first.values()].filter(r=>r.clears>=7).length,
  frozenExitD3Compatible:[...firstColorExit.values()].filter(r=>r.clears>=7).length,
  fullBoardSearchInvocations:0};
}

/** Four distinct native three-rail mounts must exist before searching any
 * generator puzzle. A clearable colour by itself does not supply a berth. */
export function generatorBerthOwners(level,berths){
 const chosen=[];
 for(const berth of berths){
  const center=berth.offset+1,vertical=['left','right'].includes(berth.side);
  const owners=level.blocks.filter(b=>{
   const{w,h}=extent(b);if(!rect(b)||w>3||h>3||b.shape.length<2)return false;
   if(berth.side==='left'&&b.x!==0||berth.side==='right'&&b.x+w!==level.width||berth.side==='top'&&b.y!==0||berth.side==='bottom'&&b.y+h!==level.height)return false;
   const start=vertical?b.y:b.x,span=vertical?h:w;
   return start>=center-1&&start+span<=center+2&&start<=center&&center<start+span;
  }).sort((a,b)=>b.shape.length-a.shape.length||a.id.localeCompare(b.id));
  const owner=owners.find(b=>!chosen.some(p=>p.owner.id===b.id));
  if(!owner)return{ok:false,reason:'reserved-rail-has-no-full-native-owner-footprint',berth,chosen};
  chosen.push({owner,mount:{side:berth.side,offset:center,rimSpan:3,rimMount:'rim',spawn:[owner.x,owner.y]}});
 }
 return{ok:true,chosen};
}

function allBerths(level){
 const legal=new Set(boardCells(level).map(cellKey)),out=[];
 for(const side of ['left','right','top','bottom']){
  const vertical=['left','right'].includes(side),length=vertical?level.height:level.width;
  for(let offset=0;offset+3<=length;offset++){
   if(level.gates.some(g=>g.side===side&&g.offset<offset+3&&offset<g.offset+g.size))continue;
   const cells=Array.from({length:3},(_,i)=>side==='left'?[0,offset+i]:side==='right'?[level.width-1,offset+i]:side==='top'?[offset+i,0]:[offset+i,level.height-1]);
   if(cells.every(p=>legal.has(cellKey(p))))out.push({side,offset,size:3});
  }
 }
 return out;
}

/** Unlike the conservative frozen adapter, the owner may move repeatedly.
 * The native generator itself decides when its fixed footprint is vacant.
 * Only real FIFO bodies are drained, with bounded held-body searches. */
export async function adaptGeneratorAtVacancy(runtime,inputLevel,inputDrags,{difficulty=3,maxAttempts=24}={}){
 if(!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>24)throw Error('At most 24 finite route adaptations');
 const targets=intensityTargets('generator',difficulty),possibilities=allBerths(inputLevel).flatMap(berth=>{
  // Ask each body separately; multiple owners at one rail remain alternatives.
  return inputLevel.blocks.flatMap(owner=>{
   const found=generatorBerthOwners({...inputLevel,blocks:[owner]},[berth]);
   return found.ok?found.chosen:[];
  });
 }),failures=[];
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const rotated=[...possibilities.slice(attempt%Math.max(1,possibilities.length)),...possibilities.slice(0,attempt%Math.max(1,possibilities.length))],chosen=[];
  for(const p of rotated){if(chosen.some(q=>q.owner.id===p.owner.id||q.mount.side===p.mount.side&&Math.abs(q.mount.offset-p.mount.offset)<3))continue;chosen.push(p);if(chosen.length===targets.instances)break;}
  if(chosen.length<targets.instances){failures.push({attempt,reason:`only ${chosen.length} physical mounts for ${targets.instances}`});continue;}
  const level=structuredClone(inputLevel),extra=new Set(),route=[],searches=[];level.generators=[];
  try{
   for(const[i,{owner,mount}]of chosen.entries()){
    const spawn=mount.side==='left'?[0,mount.offset]:mount.side==='right'?[level.width-1,mount.offset]:mount.side==='top'?[mount.offset,0]:[mount.offset,level.height-1];
    const cargoTemplate={shape:[[0,0]],x:spawn[0],y:spawn[1]};
    const colors=nativeColours(runtime,level,cargoTemplate).filter(c=>c!==owner.color);if(!colors.length)throw Error('No second native cargo colour');
    const queue=[];for(let j=0;j<targets.queuePerGenerator;j++){
     const cargo={id:`vacancy-${attempt}-${i}-${j}`,...structuredClone(cargoTemplate),color:j%2?colors[(attempt+i)%colors.length]:owner.color};
     level.blocks.push(cargo);queue.push(cargo.id);extra.add(cargo.id);
    }level.generators.push({id:`vacancy-machine-${i}`,...mount,spawn,queueBlockIds:queue});
   }
   runtime.validateLevel(level);const model=new runtime.PuzzleModel(level);model.startCountdown();
   const commit=drag=>{applyNativeDrag(model,drag);route.push(structuredClone(drag));};
   for(const drag of inputDrags){
    commit(drag);
    for(let guard=0;guard<extra.size;guard++){
     let next;for(const b of model.snapshot().blocks)if(extra.has(b.id)){
      const found=findHeldExit(model,b.id,{maxReachable:512,maxTransitions:4096});searches.push({blockId:b.id,...found.stats});
      if(found.drag){next=found.drag;break;}
     }if(!next)break;commit(next);
    }
   }
   if(!model.snapshot().complete||model.snapshot().queuedBlocks.length)throw Error('FIFO or original inventory remains');
   let originalClears=0;const firstCargo=[];
   for(const d of route)if(d.exitSide){if(extra.has(d.blockId))firstCargo.push(originalClears);else originalClears++;}
   if(firstCargo.some(n=>n<2))throw Error('Cargo cleared before two original removals; no real midgame entry');
   const formalId=`daily-mechanisms-generator-35-d${difficulty}-vacancy-fixture`,stageKey='mechanisms-generator-35';
   const staticAudit=await auditStaticCandidate(runtime,{formalId,stageKey,difficulty,sourceLevelId:level.id,level});
   if(!staticAudit.passed)throw Error(staticAudit.issues.join(';'));
   const replay=replayDecorated(runtime,level,route),participation=auditMechanismParticipation(level,route,replay,'generator',targets);
   if(!participation.pass)throw Error('Full FIFO or midgame participation failed');
   return{ok:true,level,drags:route,levelSha256:levelSha256(level),targets,staticAudit,replay,participation,
    mechanismFirst:true,stageKey,difficulty,sourceLevelId:level.id,searchAccounting:{fullBoardSolverInvocations:0,localHeldReachability:searches},
    ownerPolicy:'First complete vacancy is handled by the actual generator; owners need not exit in one drag.',
    originalClearsBeforeEachCargo:firstCargo,formalReady:false,failures};
  }catch(e){failures.push({attempt,reason:e.message,localHeldReachability:searches});}
 }
 return{ok:false,targets,failures,fullBoardSolverInvocations:0,formalReady:false};
}

function nativeColours(runtime,level,body){
 const match=runtime.matchFormalBlockShape(body.shape,'native-only');
 if(match?.quarterTurns!==0)return[];
 return level.gates.filter(g=>{
  const{w,h}=extent(body),span=['top','bottom'].includes(g.side)?w:h;
  return g.size>=span&&runtime.GAME_ART.gameplay.formalBlocks[g.color]?.solid?.[match.shapeId];
 }).map(g=>g.color);
}

/** Global geometry and colouring are constructed before mechanism assignment.
 * This is a direct actual puzzle, not a plain success decorated after proof. */
export function buildMechanismCandidate(source,runtime,{seed,mechanism='numeric-ice',difficulty=3,bodyCount}={}){
 if(!['frozen-exit','numeric-ice','generator'].includes(mechanism))throw Error('Unsupported directed mechanism');
 const targets=intensityTargets(mechanism,difficulty),area=boardCells(source).length;
 const count=bodyCount??Math.min(area,Math.max(targets.instances+(targets.minimumCounter??7)+3,Math.round(area/2.4)));
 const constructed=buildGlobalCandidate(source,runtime,{seed,maxNodes:10000,maxTransitions:10000,irregular:false,
  bodyCount:count,paletteSize:mechanism==='generator'?6:8,reservedGeneratorBerths:mechanism==='generator'?targets.instances:0});
 if(!constructed.ok)return{...constructed,mechanism,targets};
 const level=structuredClone(constructed.level),model=new runtime.PuzzleModel(level),initiallyClearable=new Set();
 for(const b of level.blocks)if(model.possibleExitSides(model.getBlock(b.id)).length)initiallyClearable.add(b.id);
 const counters=Array.from({length:targets.instances},(_,i)=>(targets.minimumCounter??7)+i);
 let devicePlan;
 if(mechanism==='numeric-ice'){
  // Rim bodies leave the interior available for the first seven removals.
  const candidates=level.blocks.filter(b=>!initiallyClearable.has(b.id)&&b.shape.length>=2).map(b=>{
   const{w,h}=extent(b),rim=Number(b.x===0)+Number(b.y===0)+Number(b.x+w===level.width)+Number(b.y+h===level.height);
   return{b,score:rim*8+b.shape.length};
  }).sort((a,b)=>b.score-a.score||a.b.id.localeCompare(b.b.id));
  if(candidates.length<targets.instances)return{ok:false,phase:'mechanism-plan',reason:'insufficient-deferred-body-reservoir',targets};
  devicePlan=candidates.slice(0,targets.instances).map(({b},i)=>{b.frozen=counters[i];return{id:b.id,count:b.frozen,openingFootprint:absoluteCells(b)};});
 }else if(mechanism==='frozen-exit'){
  const openingColors=new Set(level.blocks.filter(b=>initiallyClearable.has(b.id)).map(b=>b.color));
  const candidates=level.gates.filter(g=>!openingColors.has(g.color)&&level.blocks.some(b=>b.color===g.color))
   .sort((a,b)=>level.blocks.filter(x=>x.color===a.color).length-level.blocks.filter(x=>x.color===b.color).length||a.id.localeCompare(b.id));
  if(candidates.length<targets.instances)return{ok:false,phase:'mechanism-plan',reason:'insufficient-distinct-late-colour-reservoir',targets};
  devicePlan=candidates.slice(0,targets.instances).map((g,i)=>{g.frozen=counters[i];return{id:g.id,count:g.frozen,color:g.color};});
 }else{
  const owners=generatorBerthOwners(level,constructed.construction.reservedGeneratorBerths);
  if(!owners.ok)return{ok:false,phase:'mechanism-plan',reason:owners.reason,targets,berthAudit:owners};
  if(owners.chosen.some(p=>initiallyClearable.has(p.owner.id)))return{ok:false,phase:'mechanism-plan',reason:'machine-starts-with-opening-exit-owner',targets};
  devicePlan=[];level.generators=[];
  for(const[i,{owner,mount}]of owners.chosen.entries()){
   const colors=nativeColours(runtime,level,owner).filter(c=>c!==owner.color);
   if(!colors.length)return{ok:false,phase:'mechanism-plan',reason:'fifo-owner-has-no-second-native-exit-colour',targets};
   // Ice delays the first displacement; all counts are real, staged resources.
   owner.frozen=7+i;
   const queue=[];
   for(let j=0;j<targets.queuePerGenerator;j++){
    const cargo={id:`${owner.id}-fifo-${j}`,x:owner.x,y:owner.y,shape:structuredClone(owner.shape),color:j%2?colors[(seed+i)%colors.length]:owner.color};
    level.blocks.push(cargo);queue.push(cargo.id);
   }
   const device={id:`mechanism-${seed}-generator-${i}`,...mount,queueBlockIds:queue};level.generators.push(device);
   devicePlan.push({id:device.id,mount,ownerId:owner.id,ownerInitialIce:owner.frozen,queueBlockIds:queue});
  }
 }
 const queued=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds));
 const unrestrained=level.blocks.filter(b=>!queued.has(b.id)&&!b.frozen&&!level.gates.some(g=>g.color===b.color&&g.frozen));
 if(unrestrained.length<Math.min(...counters))return{ok:false,phase:'mechanism-plan',reason:'not-enough-unrestrained-opening-events-for-first-counter',targets};
 try{runtime.validateLevel(level);}catch(e){return{ok:false,phase:'mechanism-static',reason:e.message,targets,level};}
 const active=new runtime.PuzzleModel(level);
 if(!active.snapshot().blocks.some(b=>active.possibleExitSides(active.getBlock(b.id)).length))return{ok:false,phase:'mechanism-plan',reason:'all-opening-removals-locked',targets};
 return{ok:true,level,levelSha256:levelSha256(level),targets,mechanism,difficulty,sourceLevelId:source.id,
  construction:{...constructed.construction,version:MECHANISM_DESIGNER_VERSION,upstreamFactory:FACTORY_VERSION,
   directMechanismSearch:true,latestDevicePlan:devicePlan,counterPolicy:'Distinct 7/8/9/10 at D3; implementation policy, never a difficulty certificate.',
   unrestrainedOpeningBodies:unrestrained.length,initiallyClearableBodyIds:[...initiallyClearable],
   fullBoardSolverInvocationsDuringConstruction:0},formalReady:false};
}

export async function probeKnownGeneratorBases(runtime,paths,outputDirectory,{vacancy=false}={}){
 await fs.mkdir(outputDirectory,{recursive:false});const rows=[];
 for(const[fileIndex,file]of paths.entries()){
  const base=JSON.parse(await fs.readFile(file,'utf8'));
  const result=vacancy?await adaptGeneratorAtVacancy(runtime,base.level,base.drags,{difficulty:base.difficulty,maxAttempts:24})
   :await intensify(base.level,base.drags,'generator',{runtime,difficulty:base.difficulty,sourceLevelId:base.sourceLevelId,maxAttempts:24});
  const output=path.join(outputDirectory,`route-probe-${fileIndex}.json`);
  await fs.writeFile(output,JSON.stringify({inputFile:file,inputSha256:sha(await fs.readFile(file)),result},null,2)+'\n',{flag:'wx'});
  rows.push({file,output,compatible:result.ok,U:result.replay?.nonClearingDrags,reason:result.failedAttempts?.[0]?.error??result.failures?.[0]?.reason??result.reason,
   complete:result.replay?.complete,fullBoardSearchInvocations:0});
 }
 await fs.writeFile(path.join(outputDirectory,'summary.json'),JSON.stringify({version:MECHANISM_DESIGNER_VERSION,rows,formalAccepted:0},null,2)+'\n',{flag:'wx'});
 return rows;
}

/** The proof helper owns one native upper + one projected lower, each capped at
 * 10000 boards. A failed physical candidate is never resumed by this driver. */
export async function runDirectedBatch({label='directed-high-01',maxSearches=10,maxConstructions=500,sources=[31,52,118,187,196,100]}={}){
 if(!Number.isSafeInteger(maxSearches)||maxSearches<1||maxSearches>10||!Number.isSafeInteger(maxConstructions)||maxConstructions<1||maxConstructions>2000)throw Error('Finite pilot limits required');
 const runtime=await loadBoundedRuntime(),baseline=JSON.parse(await fs.readFile(`${ROOT}/design/mainline-baseline-catalog.json`,'utf8'));
 const directory=`${ROOT}/mechanisms/${label}`;await fs.mkdir(directory,{recursive:false});
 const files=Object.fromEntries(await Promise.all(pipelineFiles.map(async name=>{
  const file=`tools/daily-challenge/formal-v3/${name}`,bytes=await fs.readFile(file);await fs.writeFile(`${directory}/${name}.snapshot`,bytes,{flag:'wx'});return[file,sha(bytes)];
 })));
 const failed=new Map(),rows=[],accepted=[],budget=boundedBudget({maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:10000});
 let searches=0;
 const write=async status=>fs.writeFile(`${directory}/report.json`,JSON.stringify({version:MECHANISM_DESIGNER_VERSION,status,formalAccepted:0,
  maxSearches,maxConstructions,searches,sources,budget,proofToolchainSha256:runtime.toolchainSha256,bindings:files,rows,accepted},null,2)+'\n');
 for(let serial=0;serial<maxConstructions&&searches<maxSearches;serial++){
  const sourceId=sources[Math.floor(serial/3)%sources.length],mechanism=['numeric-ice','frozen-exit','generator'][serial%3];
  const source=baseline.rows.find(r=>r.sourceLevelId===sourceId&&r.plainGlobalFactoryEligible)?.level;
  if(!source||levelSha256(source)!==levelSha256(runtime.LEVELS.find(l=>l.id===sourceId)))throw Error('Unbound or unsupported mainline source');
  const seed=(0xa168374b+serial*7919+[...label].reduce((n,c)=>n+Math.imul(c.charCodeAt(0),107),0))>>>0;
  const built=buildMechanismCandidate(source,runtime,{seed,mechanism,difficulty:3});
  const row={serial,sourceId,mechanism,seed,status:built.ok?'BUILT':'REJECTED_CONSTRUCTION',reason:built.reason,phase:built.phase};rows.push(row);
  if(!built.ok){await write('RUNNING_FINITE_DIRECTED_BATCH');continue;}
  const resemblance=compareLayouts(source,built.level).footprintSimilarity;
  if(resemblance>.55){Object.assign(row,{status:'REJECTED_SOURCE_SIMILARITY',resemblance});await write('RUNNING_FINITE_DIRECTED_BATCH');continue;}
  const fingerprints=designFingerprints(built.level),prior=failed.get(sourceId);
  if(prior&&(prior.shapeSha256===fingerprints.shapeSha256||prior.colorSha256===fingerprints.colorSha256)){
   row.status='REJECTED_MISSING_COLOR_AND_SHAPE_REDESIGN';await write('RUNNING_FINITE_DIRECTED_BATCH');continue;
  }
  const candidate={formalId:`daily-mechanisms-${mechanism}-${STAGES[mechanism]}-d3-directed-${serial}`,stageKey:`mechanisms-${mechanism}-${STAGES[mechanism]}`,
   difficulty:3,sourceLevelId:sourceId,level:built.level};
  const staticAudit=await auditStaticCandidate(runtime,candidate);
  if(!staticAudit.passed){Object.assign(row,{status:'REJECTED_STATIC',issues:staticAudit.issues});await write('RUNNING_FINITE_DIRECTED_BATCH');continue;}
  const report=await verifyBoundedCandidate(runtime,candidate,{ledgerDirectory:`${ROOT}/proof/attempts`,allowRevalidation:false,
   ...(prior?{redesignOf:prior.designSha256}:{}),routeStrategy:'native',routeBudget:budget,lowerBudget:budget});
  if(report.attempt)searches++;
  const output=`${directory}/candidate-${String(serial).padStart(4,'0')}.json`;
  let participation=null;
  if(report.drags&&report.route?.independentReplay.complete){const replay=replayDecorated(runtime,report.level,report.drags,report.timeSchedule);
   participation=auditMechanismParticipation(report.level,report.drags,replay,mechanism,built.targets);}
  const packet={...report,mechanismFirst:true,designerVersion:MECHANISM_DESIGNER_VERSION,targets:built.targets,construction:built.construction,participation,
   fullDesignAccepted:report.accepted&&participation?.pass===true,formalReady:false,productionChanged:false};
  await fs.writeFile(output,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  Object.assign(row,{status:report.status,path:output,L:report.L,U:report.U,participation:participation?.pass??false,
   upper:report.route?.search?{states:report.route.search.discoveredStates,expanded:report.route.search.exploredStates,termination:report.route.search.termination}:null,
   lower:report.lowerBound?.result?{states:report.lowerBound.result.discoveredStates,expanded:report.lowerBound.result.exploredStates,termination:report.lowerBound.result.termination}:null});
  if(report.attempt&&!report.accepted)failed.set(sourceId,fingerprints);
  if(packet.fullDesignAccepted)accepted.push({path:output,sourceId,mechanism,L:report.L,U:report.U});
  await write('RUNNING_FINITE_DIRECTED_BATCH');console.log(JSON.stringify({label,serial,searches,sourceId,mechanism,status:row.status,L:row.L,U:row.U,upper:row.upper,lower:row.lower}));
 }
 await write('FINITE_DIRECTED_BATCH_FINISHED');return{directory,searches,constructed:rows.length,accepted};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 if(['known-generator','known-generator-vacancy'].includes(process.argv[2])){
  const runtime=await loadBoundedRuntime(),base=`${ROOT}/design/generator-berths-05`;
  console.log(JSON.stringify(await probeKnownGeneratorBases(runtime,['0057','0150','0196','0220'].map(id=>`${base}/candidate-${id}.json`),`${ROOT}/mechanisms/${process.argv[2]}-${process.argv[3]??'01'}`,{vacancy:process.argv[2]==='known-generator-vacancy'})));
 }else console.log(JSON.stringify(await runDirectedBatch({label:process.argv[2]??'directed-high-01',maxConstructions:Number(process.env.MECHANISM_CONSTRUCTIONS??500)})));
}

import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,auditStaticCandidate,independentReplay,BANDS} from '../formal-v2/contract.mjs';
import {applyNativeDrag,replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {loadBoundedRuntime,boundedBudget,boundedLowerTask,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {intensityTargets,auditMechanismParticipation} from './mechanism-intensity.mjs';

export const SMALL_CARGO_VERSION='small-cargo-guided-world-budget-v1.6';
const ROOT='deliverables/daily-formal-v3-20261008',clone=structuredClone;
const key=model=>{const{moves,...s}=model.snapshot();return JSON.stringify(s);};
const cells=b=>b.shape.map(([dx,dy])=>`${b.x+dx},${b.y+dy}`);
const mouth=(level,g)=>g.side==='left'?[0,g.offset+1]:g.side==='right'?[level.width-1,g.offset+1]:g.side==='top'?[g.offset+1,0]:[g.offset+1,level.height-1];

/** A conservative board budget: EVERY explored model pose, including mere
 * held-coordinate changes, consumes this shared limit before it is admitted.
 * Queue spawns and other world changes can therefore never be micro-only. */
export function sharedWorldBudget(requested={}){
 const budget=boundedBudget(requested),started=Date.now(),counts={discoveredStates:0,exploredStates:0,attemptedTransitions:0,microDiscoveredStates:0,microExploredStates:0};
 const stop=reason=>{const e=Error(reason);e.budgetStop=true;throw e;};
 const guard=()=>{if(Date.now()-started>=budget.maxMilliseconds)stop('deadline');};
 const guardDiscover=(micro=false)=>{guard();if(counts.discoveredStates>=budget.maxStates)stop('max-states');
  if(micro&&counts.microDiscoveredStates>=budget.maxMicroStates)stop('max-micro-states');};
 return{budget,counts,guard,guardDiscover,discover(micro=false){guardDiscover(micro);counts.discoveredStates++;if(micro)counts.microDiscoveredStates++;},
  expand(micro=false){guard();if(counts.exploredStates>=budget.maxStates)stop('max-expanded-states');counts.exploredStates++;if(micro)counts.microExploredStates++;},
  transition(){guard();if(counts.attemptedTransitions>=budget.maxTransitions)stop('max-transitions');counts.attemptedTransitions++;},
  report(termination){return{budget,...counts,visitedStates:counts.discoveredStates,rawFullBoardStates:counts.discoveredStates,
   rawExploredStates:counts.exploredStates,elapsedMilliseconds:Date.now()-started,termination,
   fullBoardStateDefinition:'Conservative accounting: every held model pose and every committed model; all local searches share one pre-increment counter.',
   microStatesAlsoChargedToFullBoardBudget:true};}};
}

export function makeSmallCargoCandidate(runtime,base,{variant=0}={}){
 const level=clone(base.level),targets=intensityTargets('generator',base.difficulty),berths=clone(base.provenance.reservedGeneratorBerths);
 const model=new runtime.PuzzleModel(level);model.startCountdown();const routeSnapshots=[];
 for(const g of berths)g.mouth=mouth(level,g);
 for(const[index,drag]of base.drags.entries()){
  applyNativeDrag(model,drag);const s=model.snapshot(),occupied=new Set(s.blocks.flatMap(cells));routeSnapshots.push({drag:index+1,cleared:s.cleared,occupied});
  for(const g of berths)if(g.firstVacancy===undefined&&!occupied.has(g.mouth.join(',')))g.firstVacancy={drag:index+1,cleared:s.cleared};
 }
 const n=level.blocks.length;
 if(variant>=16){
  const playable=new Set((level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]))
   .filter(p=>!(level.blocked??[]).some(b=>b[0]===p[0]&&b[1]===p[1])).map(p=>p.join(',')));
  for(const g of berths){
   const plans=[];
   for(const[w,h]of [[1,1],[2,1],[1,2],[3,1],[1,3],[2,2]])for(let ox=variant>=24?1-w:0;ox<=0;ox++)for(let oy=variant>=24?1-h:0;oy<=0;oy++){
    // Translate a native rectangle around the authored center mouth. This
    // changes its actual spawn footprint; it never rotates the artwork.
    const shape=Array.from({length:w*h},(_,i)=>[i%w+ox,Math.floor(i/w)+oy]),footprint=shape.map(([x,y])=>`${g.mouth[0]+x},${g.mouth[1]+y}`);
    if(footprint.some(p=>!playable.has(p)))continue;
    const match=runtime.matchFormalBlockShape(shape,'native-only');
    const colors=level.gates.filter(exit=>runtime.GAME_ART.gameplay.formalBlocks[exit.color]?.solid?.[match?.shapeId]
      &&exit.size>=(['top','bottom'].includes(exit.side)?w:h)).map(exit=>exit.color);
    if(colors.length<2)continue;
    const free=routeSnapshots.find(s=>footprint.every(p=>!s.occupied.has(p)));if(!free)continue;
    plans.push({shape,colors,firstVacancy:{drag:free.drag,cleared:free.cleared},area:w*h});
   }
   plans.sort((a,b)=>Number(!(a.firstVacancy.cleared>=2&&a.firstVacancy.cleared<=n-2))-Number(!(b.firstVacancy.cleared>=2&&b.firstVacancy.cleared<=n-2))
     ||b.firstVacancy.cleared-a.firstVacancy.cleared||a.area-b.area);
   const first=plans[0],shapeKey=s=>{const xs=s.map(p=>p[0]),ys=s.map(p=>p[1]);return s.map(([x,y])=>[x-Math.min(...xs),y-Math.min(...ys)]).sort().toString();};
   g.plan=variant>=48?plans.find(p=>shapeKey(p.shape)!==shapeKey(first?.shape??[]))??first:first;
   if(g.plan)g.firstVacancy=g.plan.firstVacancy;
  }
 }
 berths.sort((a,b)=>Number(!(a.firstVacancy?.cleared>=2&&a.firstVacancy.cleared<=n-2))-Number(!(b.firstVacancy?.cleared>=2&&b.firstVacancy.cleared<=n-2))
  ||(variant>=24?-1:1)*((a.firstVacancy?.cleared??999)-(b.firstVacancy?.cleared??999)));
 if(berths.length<targets.instances)throw Error('Insufficient distinct native three-rail berths');
 const chosen=berths.slice(0,targets.instances);level.generators=[];
 for(const[i,g]of chosen.entries()){
  // A new variant really changes cargo shape inventory, not just IDs/colour.
  const mixed=variant>=8;
  const size=mixed?(['left','top'].includes(g.side)?2+(variant-8)%2:2):variant===0?1:1+Number(variant<=3?i<Math.min(targets.instances,variant):Boolean(variant&(1<<i)));
  const horizontal=mixed?['left','bottom'].includes(g.side):['left','right'].includes(g.side),shape=g.plan?.shape??Array.from({length:size},(_,j)=>horizontal?[j,0]:[0,j]);
  const spawn=[...g.mouth];if(!mixed&&g.side==='right')spawn[0]-=size-1;if(!mixed&&g.side==='bottom')spawn[1]-=size-1;
  const match=runtime.matchFormalBlockShape(shape,'native-only');
  const colors=g.plan?.colors??level.gates.filter(exit=>runtime.GAME_ART.gameplay.formalBlocks[exit.color]?.solid?.[match?.shapeId]
   &&exit.size>=(['top','bottom'].includes(exit.side)?(horizontal?size:1):(horizontal?1:size))).map(exit=>exit.color);
  if(colors.length<2)throw Error('Small cargo lacks two native matching exit colours');
  const queue=[];
  for(let j=0;j<targets.queuePerGenerator;j++){
   const id=`small-cargo-${i}-${j}`,color=colors[(i+variant+j%2)%colors.length];
   level.blocks.push({id,color,x:spawn[0],y:spawn[1],shape:mixed&&j>=(variant>=40?4:variant>=32?3:variant>=25?2:1)?[[0,0]]:clone(shape)});queue.push(id);
  }
  level.generators.push({id:`small-machine-${i}`,side:g.side,offset:g.offset+1,rimSpan:3,rimMount:'rim',spawn,queueBlockIds:queue});
 }
 runtime.validateLevel(level);
 return{level,targets,chosen,variant,mechanismFirst:true,stageKey:'mechanisms-generator-35',difficulty:base.difficulty,sourceLevelId:base.sourceLevelId,
  levelSha256:levelSha256(level),baseLevelSha256:base.levelSha256,baseDrags:clone(base.drags)};
}

/** A single bounded constructive search follows the already validated plain
 * route. Active FIFO cargo is cleared/parked; optionally an original body may
 * clear early, then its remaining guide actions are omitted. Version 1.6 may
 * also park an original body and repair the next guide endpoint. No
 * retry, resume or per-obstruction budget reset is performed. */
export function repairCargoRoute(runtime,candidate,requested={}){
 const meter=sharedWorldBudget(requested),level=candidate.level,baseDrags=candidate.baseDrags,
  queued=new Set(level.generators.flatMap(g=>g.queueBlockIds)),originalIds=new Set(level.blocks.filter(b=>!queued.has(b.id)).map(b=>b.id));
 const remainingOriginal=model=>model.snapshot().blocks.filter(b=>originalIds.has(b.id)).length;
 const cargoLeft=model=>{const s=model.snapshot();return[...s.blocks,...s.queuedBlocks].filter(b=>queued.has(b.id)).length;};
 const maxCost=BANDS[candidate.difficulty].upper??256;
 const suffixCost=(model,index)=>baseDrags.slice(index).reduce((sum,d)=>sum+Number(!d.exitSide&&Boolean(model.getBlock(d.blockId))),0);
 const finish=(status,termination,extra={})=>({status,witnessFound:status==='witness',...meter.report(termination),sourceLevelSha256:levelSha256(level),...extra});
 try{
  const initial=new runtime.PuzzleModel(level);initial.startCountdown();meter.discover();
  const nodes=[{model:initial,index:0,offset:0,drags:[],cost:0}],open=[0],seen=new Set([`0/0:${key(initial)}`]);
  const push=(model,index,drags,cost,offset=0)=>{
   if(cost+suffixCost(model,index)>maxCost)return;const k=`${index}/${offset}:${key(model)}`;if(seen.has(k))return;
   meter.discover();seen.add(k);nodes.push({model,index,offset,drags,cost});open.push(nodes.length-1);
  };
  const perform=(source,drag,allowPartial=false)=>{
   const model=source.clone(),done=[];model.beginAction();
   const commit=()=>{meter.guardDiscover();if(!model.commitAction())return false;meter.discover();meter.expand();return true;};
   const partial=()=>allowPartial&&done.length&&commit()?{model,completed:false,drag:{blockId:drag.blockId,path:done}}:null;
   for(const pos of drag.path){meter.transition();meter.guardDiscover();if(!model.moveBlockStep(drag.blockId,...pos))return partial();done.push(pos);meter.discover();meter.expand();}
   if(drag.exitSide){meter.transition();meter.guardDiscover();if(!model.tryExit(drag.blockId,drag.exitSide).ok)return partial();meter.discover();meter.expand();}
   if(!commit())return null;return{model,completed:true,drag};
  };
  while(open.length){
   meter.guard();open.sort((a,b)=>cargoLeft(nodes[b].model)-cargoLeft(nodes[a].model)||nodes[a].index-nodes[b].index||nodes[a].offset-nodes[b].offset||nodes[b].cost-nodes[a].cost);
   const node=nodes[open.pop()];meter.expand();
   if(node.model.snapshot().complete){const replay=runtime.replayRevisedRoute(level,node.drags);
    return replay.valid&&replay.complete?finish('witness','witness',{drags:node.drags,replay}):finish('invalid','canonical-replay-failed',{replay});}
   while(baseDrags[node.index]&&!node.model.getBlock(baseDrags[node.index].blockId)){node.index++;node.offset=0;}
   const sourceDrag=baseDrags[node.index],original=sourceDrag?{...sourceDrag,path:sourceDrag.path.slice(node.offset)}:null;
   let originalAdvanced=false;
   if(original&&!(original.exitSide&&remainingOriginal(node.model)<=2&&cargoLeft(node.model)>0)){
    const advanced=perform(node.model,original,true);
    if(advanced){push(advanced.model,node.index+Number(advanced.completed),[...node.drags,advanced.drag],node.cost+Number(!advanced.drag.exitSide),advanced.completed?0:node.offset+advanced.drag.path.length);originalAdvanced=true;}
   }
   // Safely park outside the next original body's swept cells. This limits
   // branching, but failure remains UNKNOWN rather than an impossibility claim.
   const forbidden=new Set();if(original){const b=node.model.getBlock(original.blockId);
    if(b)for(const[x,y]of [[b.x,b.y],...original.path])for(const[dx,dy]of b.shape)forbidden.add(`${x+dx},${y+dy}`);}
   const active=node.model.snapshot().blocks.filter(b=>queued.has(b.id));
   active.sort((a,b)=>Number(cells(b).some(c=>forbidden.has(c)))-Number(cells(a).some(c=>forbidden.has(c))));
   if(candidate.variant>=32&&!originalAdvanced&&active.length&&remainingOriginal(node.model)>2)
    active.push(...node.model.snapshot().blocks.filter(b=>originalIds.has(b.id)));
   for(const selected of active){
    const inner=[{model:node.model,path:[]}],innerSeen=new Set([key(node.model)]),parking=[];meter.discover(true);
    let clearAdded=false;
    for(let cursor=0;cursor<inner.length;cursor++){
     meter.expand(true);const current=inner[cursor],held=current.model.getBlock(selected.id);if(!held)continue;
     const previous=current.path.length>1?current.path.at(-2):current.path.length?[selected.x,selected.y]:undefined;
     meter.transition();const exit=canonicalExit(runtime,current.model,selected.id,previous);
     if(exit){
      const drag={blockId:selected.id,path:current.path,exitSide:exit},next=perform(node.model,drag);
      if(next){push(next.model,node.index,[...node.drags,drag],node.cost,node.offset);clearAdded=true;}break;
     }
     if(candidate.variant>=40&&selected.id===original?.blockId&&!original.exitSide&&current.path.length){
      const target=original.path.at(-1);
      if(target&&held.x===target[0]&&held.y===target[1]){
       const drag={blockId:selected.id,path:current.path},next=perform(node.model,drag);
       if(next){push(next.model,node.index+1,[...node.drags,drag],node.cost+1,0);clearAdded=true;}break;
      }
     }
     if(current.path.length&&(!cells(held).some(c=>forbidden.has(c))||candidate.variant>=40&&originalIds.has(selected.id)))parking.push({path:current.path,
      score:Math.abs(held.x-selected.x)+Math.abs(held.y-selected.y)});
     for(const[dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
      meter.transition();meter.guardDiscover(true);const model=current.model.clone();model.beginAction();const target=[held.x+dx,held.y+dy];
      if(!model.moveBlockStep(selected.id,...target))continue;const k=key(model);if(innerSeen.has(k))continue;
      if(innerSeen.size>=meter.budget.maxDragStates)throw Object.assign(Error('max-drag-states'),{budgetStop:true});
      meter.discover(true);innerSeen.add(k);inner.push({model,path:[...current.path,target]});
     }
    }
    if((queued.has(selected.id)||candidate.variant>=40)&&!clearAdded&&!originalAdvanced)for(const p of parking.sort((a,b)=>b.score-a.score||a.path.length-b.path.length).slice(0,3)){
     const drag={blockId:selected.id,path:p.path},next=perform(node.model,drag);if(next)push(next.model,node.index,[...node.drags,drag],node.cost+1,node.offset);
    }
   }
  }return finish('unknown','guided-space-exhausted');
 }catch(e){return finish(e.budgetStop?'unknown':'invalid',e.message,{reason:e.message});}
}

export async function qualifySmallCargo(baseFile,{label='small-cargo-01',variant=0,redesignOf}={}){
 const runtime=await loadBoundedRuntime(),base=JSON.parse(await fs.readFile(baseFile,'utf8')),candidate=makeSmallCargoCandidate(runtime,base,{variant}),
  formalId=`daily-mechanisms-generator-35-d${base.difficulty}-${label}`,directory=`${ROOT}/mechanisms/${label}`;
 await fs.mkdir(directory,{recursive:false});
 const constructorBytes=await fs.readFile(new URL(import.meta.url));await fs.writeFile(`${directory}/generator-small-cargo.snapshot.mjs`,constructorBytes,{flag:'wx'});
 const level=candidate.level,staticAudit=await auditStaticCandidate(runtime,{...candidate,formalId});
 const report={schemaVersion:3,version:SMALL_CARGO_VERSION,formalId,mechanismFirst:true,stageKey:candidate.stageKey,difficulty:base.difficulty,
  sourceLevelId:base.sourceLevelId,sourceLevelSha256:base.sourceLevelSha256,level,levelSha256:levelSha256(level),targets:candidate.targets,
  baseFile,baseLevelSha256:base.levelSha256,chosen:candidate.chosen,staticAudit,accepted:false,formalReady:false,productionChanged:false,L:null,U:null,
  ruleVersion:runtime.boundedRuleVersion,dailyBudgetRuleVersion:runtime.dailyBudgetRuleVersion,toolchainSha256:runtime.toolchainSha256,
  constructorSha256:createHash('sha256').update(constructorBytes).digest('hex'),constructorSnapshot:`${directory}/generator-small-cargo.snapshot.mjs`,
  variant,designPlanning:{kind:'read-only-known-route-footprint-vacancy',fullBoardSearchInvocations:0}};
 if(!staticAudit.passed){report.status='REJECTED_STATIC';await fs.writeFile(`${directory}/candidate.json`,JSON.stringify(report,null,2)+'\n');return report;}
 const ledger=await createAttemptLedger(`${ROOT}/proof/attempts`);let attempt;
 try{attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});report.attempt=attempt;}
 catch(error){report.status='REJECTED_ATTEMPT_LEDGER';report.reason=error.message;await fs.writeFile(`${directory}/candidate.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;}
 try{
  const budget=boundedBudget({maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:30000});
  report.upperSearch=repairCargoRoute(runtime,candidate,budget);report.route={search:report.upperSearch};
  if(!report.upperSearch.witnessFound){report.status='UNKNOWN_SMALL_CARGO_UPPER';return report;}
  report.drags=report.upperSearch.drags;report.routeSha256=routeSha256(report.drags);
  report.canonicalReplay=runtime.replayRevisedRoute(level,report.drags);report.independentReplay=independentReplay(runtime,level,report.drags,{});
  report.replay=replayDecorated(runtime,level,report.drags);report.participation=auditMechanismParticipation(level,report.drags,report.replay,'generator',report.targets);
  report.U=report.independentReplay.nonClearingDrags;
  if(!report.canonicalReplay.valid||!report.canonicalReplay.complete||!report.independentReplay.valid||!report.independentReplay.complete||!report.participation.pass){report.status='REJECTED_ACTUAL_FIFO_ROUTE';return report;}
  const band=BANDS[base.difficulty];if(report.U<band.lower||band.upper!==null&&report.U>band.upper){report.status='UPPER_OUTSIDE_BAND';return report;}
  report.lowerBound=boundedLowerTask(runtime,level,base.difficulty,budget);
  const lower=report.lowerBound.result;
  if(lower.status!=='threshold-proven'||!lower.thresholdProven||lower.termination!=='below-threshold-exhausted'){report.status='UNKNOWN_SMALL_CARGO_LOWER';return report;}
  report.L=band.lower;report.accepted=true;report.status='SMALL_CARGO_SPATIAL_AND_FIFO_VERIFIED_AWAITING_CATALOG_POINTER';return report;
 }catch(e){report.status='INVALID_SMALL_CARGO_ATTEMPT';report.reason=e.message;return report;}
 finally{
  report.redesignRequired=!report.accepted;await ledger.finish(attempt,report);
  await fs.writeFile(`${directory}/candidate.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  if(report.accepted)await fs.writeFile(`${directory}/index.json`,JSON.stringify({records:[{path:`${directory}/candidate.json`,fileSha256:createHash('sha256').update(await fs.readFile(`${directory}/candidate.json`)).digest('hex')}]},null,2)+'\n',{flag:'wx'});
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const result=await qualifySmallCargo(process.argv[2],{label:process.argv[3],variant:Number(process.argv[4]??0),redesignOf:process.argv[5]});
 console.log(JSON.stringify({accepted:result.accepted,status:result.status,L:result.L,U:result.U,attempt:result.attempt?.id,
  upper:result.upperSearch?{states:result.upperSearch.discoveredStates,expanded:result.upperSearch.exploredStates,termination:result.upperSearch.termination}:null,
  lower:result.lowerBound?.result?{states:result.lowerBound.result.discoveredStates,expanded:result.lowerBound.result.exploredStates,termination:result.lowerBound.result.termination}:null,
  participation:result.participation?.pass,reason:result.reason,staticIssues:result.staticAudit?.issues}));
}

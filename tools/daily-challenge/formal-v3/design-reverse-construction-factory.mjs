import {buildGlobalCandidate,boardCells,absoluteCells,bodyFootprint,digest,random,inventorySummary,orbitFootprintArea} from './diversity-layout-factory.mjs';
import {independentReplay} from '../formal-v2/contract.mjs';
import {inverseParkingAudit,inverseInsertionAudit} from './reverse-route-audit.mjs';
import {reconstructReverseBlueprint} from './design-reverse-blueprint.mjs';
import {runReverseInterleavedGraph} from './design-reverse-interleaved.mjs';
import {recolourKnownPlainWitness} from './design-route-compatible-colouring.mjs';

export const REVERSE_FACTORY_VERSION='normal-mask-reverse-interleaved-fill-first-v7';
const directions=[[0,-1],[1,0],[0,1],[-1,0]],key=p=>p.join(',');
const shuffle=(xs,r)=>xs.map(x=>({x,k:r()})).sort((a,b)=>a.k-b.k).map(x=>x.x);
const width=b=>1+Math.max(...b.shape.map(p=>p[0])),height=b=>1+Math.max(...b.shape.map(p=>p[1]));
function atGate(b,g,l){
 const horizontal=['top','bottom'].includes(g.side),offset=horizontal?b.x:b.y,span=horizontal?width(b):height(b);
 return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+height(b)===l.height:g.side==='left'?b.x===0:b.x+width(b)===l.width);
}
function adjacencyViolations(blocks){
 let n=0;for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++)if(blocks[i].color===blocks[j].color&&absoluteCells(blocks[i]).some(([x,y])=>absoluteCells(blocks[j]).some(([a,b])=>Math.abs(a-x)+Math.abs(b-y)===1)))n++;
 return n;
}
function inversePath(start,reversePath){return reversePath.length?[start,...reversePath.slice(0,-1)].reverse():[];}

export function createReverseConstructionTemplate(source,runtime,options={}){
 return buildGlobalCandidate(source,runtime,{seed:options.seed??1,maxNodes:10000,maxTransitions:10000,
   shapeProfile:options.shapeProfile??'bar-mix',paletteSize:options.paletteSize??8,irregular:false});
}

/** Construction and proof are separate. Every partial committed world proposed
 * by insertion or parking is charged to one shared raw budget for the whole
 * builder; no reset per body, fill branch or vacancy walk. Held-coordinate BFS
 * has an independent finite micro budget. No difficulty is claimed here.
 */
export function buildReverseConstructedCandidate(source,runtime,options={}){
 const {seed=1,maxStates=10000,maxMicroStates=1000000,maxTransitions=3000000,maxMilliseconds=30000,
   minimumScrambleDrags=36,maxScrambleDrags=96,maximumFinalBodyArea=4}=options;
 if(!Number.isSafeInteger(maxStates)||maxStates<1||maxStates>10000)throw Error('Reverse construction raw budget must be 1..10000');
 for(const[value,maximum,label]of [[maxMicroStates,3000000,'micro'],[maxTransitions,10000000,'transitions'],[maxMilliseconds,30000,'milliseconds']])
   if(!Number.isSafeInteger(value)||value<1||value>maximum)throw Error('Invalid finite construction '+label+' budget');
 if(!Number.isSafeInteger(minimumScrambleDrags)||minimumScrambleDrags<0||!Number.isSafeInteger(maxScrambleDrags)||maxScrambleDrags<minimumScrambleDrags||maxScrambleDrags>256)throw Error('Invalid finite scramble range');
 if(!Number.isSafeInteger(maximumFinalBodyArea)||maximumFinalBodyArea<1||maximumFinalBodyArea>6)throw Error('Invalid small vacancy area');
 const started=Date.now(),r=random(seed^0x571bf123),raw=new Set(),expanded=new Set(),deadFill=new Set();
 const stats={rawDiscoveredStates:0,rawExpandedStates:0,fullBoardExpansionVisits:0,microDiscoveredStates:0,microExpandedStates:0,
   attemptedTransitions:0,insertionCandidates:0,parkingCandidates:0,localActualAudits:0,fillCalls:0,vacancyWalks:0,maximumFilledCells:0,maximumBodies:0,blockedFuturePortals:0,
   finalAdjacencyRejected:0,referenceSimilarityRejected:0,insertionCallsWithoutPortal:0,vacancyDepthLimitHits:0,maximumVacancyDepth:0,
   colourCspAttempts:0,colourCspUnsatisfied:0,colourCspNodes:0,poolSimilarityRejected:0};
 const colourCspStats={nodes:0},colourCspReports=[];
 const operations=[];let lastPartial=null,template=null,lastColourCspInput=null;
 const guard=()=>{if(Date.now()-started>=maxMilliseconds)throw Error('construction-deadline');};
 const transition=()=>{guard();if(stats.attemptedTransitions>=maxTransitions)throw Error('construction-max-transitions');stats.attemptedTransitions++;};
 const micro=()=>{guard();if(stats.microDiscoveredStates>=maxMicroStates)throw Error('construction-max-micro-states');stats.microDiscoveredStates++;};
 const worldKey=level=>digest(level.blocks.map(b=>({id:b.id,color:b.color,shape:b.shape,x:b.x,y:b.y})).sort((a,b)=>a.id.localeCompare(b.id)));
 const charge=(level,expand=false)=>{guard();const k=worldKey(level);if(!raw.has(k)){if(raw.size>=maxStates)throw Error('construction-max-raw-board-states');raw.add(k);stats.rawDiscoveredStates=raw.size;}
   if(level!==template){stats.maximumFilledCells=Math.max(stats.maximumFilledCells,level.blocks.reduce((n,b)=>n+b.shape.length,0));stats.maximumBodies=Math.max(stats.maximumBodies,level.blocks.length);}
   if(expand){stats.fullBoardExpansionVisits++;expanded.add(k);stats.rawExpandedStates=expanded.size;}lastPartial=level;return k;};
 const result=(status,extra={})=>({ok:false,status,factoryVersion:REVERSE_FACTORY_VERSION,sourceLevelId:source.id,lastColourCspInput,
   sourceLevelSha256:digest(source),constructionTemplateLevel:template?structuredClone(template):null,construction:{...stats,budget:{maxStates,maxMicroStates,maxTransitions,maxMilliseconds},
     elapsedMilliseconds:Date.now()-started,rawStateDefinition:'Distinct labelled whole partial/complete committed worlds; every considered insertion/parking result is charged before rejection or deduplication.',
     rawWorldSha256s:[...raw],expandedWorldSha256s:[...expanded],heldCoordinateBfsSeparate:true,
     templateLayoutUse:options.blueprintPacket?'A successful full route supplies a legal inverse blueprint; a new vacancy walk must change at least 35% of reference whole-body footprint area before final completion.':'Only one initial portal vacancy uses a template footprint; all other old body positions are discarded and the vacancy may travel during reverse parking.',templateLevelSha256:template?digest(template):null,
     sourceInventory:inventorySummary(source,runtime),fullBoardDifficultySearchInvocations:0},...extra});
 try{
  const built=options.constructionTemplatePacket??createReverseConstructionTemplate(source,runtime,options);
  if(!built.ok)return result('REJECTED_INVENTORY_TEMPLATE',{reason:built.reason});
  template=structuredClone(built.level);runtime.validateLevel(template);
  if(options.blueprintPacket&&digest(options.blueprintPacket.level)!==digest(template))throw Error('Blueprint and claimed construction stock must be the same full object');
  if(template.width!==source.width||template.height!==source.height||digest(boardCells(template).map(key).sort())!==digest(boardCells(source).map(key).sort()))throw Error('Construction template changed normal source mask');
  const inventoryInfo=inventorySummary(template,runtime);
  if(inventoryInfo.nonNativeOrMissingArtIds.length||inventoryInfo.hiddenCount||inventoryInfo.queuedCount||inventoryInfo.shellCount||inventoryInfo.mechanisms.some(m=>!['color-exit','irregular-board','irregular-block'].includes(m)))throw Error('Reverse template must use ordinary native visible bodies');
  if(template.blocks.reduce((n,b)=>n+b.shape.length,0)!==boardCells(template).length)throw Error('Template inventory must cover exactly one source board');
  charge(template);
  const allowed=new Set(boardCells(template).map(key));
  const empty={...structuredClone(template),name:`每日逆构造 ${source.id}-${seed}`,blocks:[]};
  charge(empty,true);
  const inventory=structuredClone(template.blocks);
  // The final inserted body creates the first forward clear and its small hole.
  const lastCandidates=shuffle(inventory.filter(b=>b.shape.length<=maximumFinalBodyArea&&atGate(b,template.gates.find(g=>g.color===b.color),template)),r);
  if(!lastCandidates.length)return result('REJECTED_NO_SMALL_FINAL_INSERTION');
  const blueprint=options.blueprintPacket?reconstructReverseBlueprint(runtime,options.blueprintPacket,{charge,micro,transition,
   prefixClearCount:options.blueprintPrefixClearCount??null,maximumPrefixArea:options.blueprintMaximumPrefixArea??8,allowLargePrefix:options.blueprintAllowLargePrefix??false}):null;
  if(blueprint){stats.localActualAudits+=blueprint.reverseOperations.length;stats.blueprintInverseGestures=blueprint.reverseOperations.length;stats.blueprintInitialVacancyArea=blueprint.initialVacancyArea;}
  const finalBodies=blueprint?.finalBodies??[lastCandidates[0]],finalIds=new Set(finalBodies.map(b=>b.id));
  const finalBody=finalBodies[0],remaining=inventory.filter(b=>!finalIds.has(b.id));
  const reservedHole=new Set(blueprint?[]:absoluteCells(finalBody).map(key));
  function isValidPose(level,body,x,y){
   const occupied=new Set(level.blocks.filter(b=>b.id!==body.id).flatMap(absoluteCells).map(key));
   return body.shape.every(([dx,dy])=>allowed.has(key([x+dx,y+dy]))&&!occupied.has(key([x+dx,y+dy])));
  }
  function heldReach(level,body,start,{insertion=false}={}){
   const gate=level.gates.find(g=>g.color===body.color),queue=[start],parents=new Map([[key(start),null]]);micro();
   for(let at=0;at<queue.length;at++){
    guard();stats.microExpandedStates++;const p=queue[at];
    for(const[dx,dy]of directions){transition();const next=[p[0]+dx,p[1]+dy],k=key(next);
     if(parents.has(k)||!isValidPose(level,body,...next))continue;
     // Matching portal contact in the middle of the reversed forward gesture
     // would clear early. The actual audit independently verifies this rule.
     if(atGate({...body,x:next[0],y:next[1]},gate,level))continue;
     micro();parents.set(k,p);queue.push(next);
    }
   }
   const pathTo=p=>{const out=[];while(parents.get(key(p))){out.push(p);p=parents.get(key(p));}return out.reverse();};
   return{positions:queue,pathTo};
  }
  function insertionOptions(level,body,limit=8){
   const gate=level.gates.find(g=>g.color===body.color),starts=[];
   for(let y=0;y<=level.height-height(body);y++)for(let x=0;x<=level.width-width(body);x++)if(atGate({...body,x,y},gate,level)&&isValidPose(level,body,x,y))starts.push([x,y]);
   if(!starts.length)stats.insertionCallsWithoutPortal++;
   const candidates=[];
   for(const start of shuffle(starts,r)){
    charge({...level,blocks:[...level.blocks,{...body,x:start[0],y:start[1]}]},true);
    const reach=heldReach(level,body,start,{insertion:true});
    // Reserved final-hole cells are a known construction constraint on target
    // anchors only; the held insertion path may still travel through the hole.
    const positions=reach.positions.filter(p=>finalIds.has(body.id)||!absoluteCells({...body,x:p[0],y:p[1]}).some(q=>reservedHole.has(key(q))))
      .map(p=>({p,score:Math.abs(p[0]-start[0])+Math.abs(p[1]-start[1])+r()*2})).sort((a,b)=>b.score-a.score).slice(0,limit);
    for(const{p}of positions){
     const proposed={...level,blocks:[...level.blocks,{...body,x:p[0],y:p[1]}]};stats.insertionCandidates++;charge(proposed);
     const penalty=adjacencyViolations(proposed.blocks);
     if(proposed.blocks.length===inventory.length&&penalty&&!options.routeCompatibleColouring){stats.finalAdjacencyRejected++;continue;}
     const path=reach.pathTo(p),atPortal={...body,x:start[0],y:start[1]};stats.localActualAudits++;
     const audit=inverseInsertionAudit(runtime,level,atPortal,path,gate.side);
     if(!audit.valid)continue;
     candidates.push({level:proposed,penalty,operation:{kind:'insertion',body:atPortal,reversePath:path,exitSide:gate.side,
       forwardDrag:{blockId:body.id,path:inversePath(start,path),exitSide:gate.side},beforeSha256:worldKey(level),afterSha256:worldKey(proposed)}});
    }
   }
   return candidates.map(x=>({x,score:r()-x.penalty*.8})).sort((a,b)=>b.score-a.score).map(x=>x.x);
  }
  function parkingOptions(level){
   const candidates=[];
   for(const body of shuffle(level.blocks,r)){
    const gate=level.gates.find(g=>g.color===body.color);
    if(atGate(body,gate,level))continue;
    const start=[body.x,body.y],reach=heldReach(level,body,start);
    for(const p of shuffle(reach.positions.slice(1),r)){
     const proposed={...level,blocks:level.blocks.map(b=>b.id===body.id?{...b,x:p[0],y:p[1]}:b)};
     stats.parkingCandidates++;const k=charge(proposed),path=reach.pathTo(p);stats.localActualAudits++;
     const audit=inverseParkingAudit(runtime,level,body.id,path);
     if(!audit.valid)continue;
     candidates.push({level:proposed,k,penalty:adjacencyViolations(proposed.blocks),operation:{kind:'parking',blockId:body.id,reversePath:path,
       forwardDrag:{blockId:body.id,path:inversePath(start,path)},beforeSha256:worldKey(level),afterSha256:k}});
    }
   }
   return candidates;
  }
  function completeAt(level,ops,todo=finalBodies){
   if(todo.length){for(const b of todo)for(const choice of insertionOptions(level,b,16)){
     const complete=completeAt(choice.level,[...ops,choice.operation],todo.filter(x=>x.id!==b.id));if(complete)return complete;
    }return null;}
    if(level.blocks.reduce((n,b)=>n+b.shape.length,0)!==allowed.size)return null;
    if(blueprint&&orbitFootprintArea(template,level)>.65){stats.referenceSimilarityRejected++;return null;}
    if(options.finalGeometryAdmissible&&!options.finalGeometryAdmissible(level)){stats.poolSimilarityRejected++;guard();return null;}
    const all=ops,drags=all.map(x=>x.forwardDrag).reverse();
    if(options.routeCompatibleColouring){
     stats.colourCspAttempts++;
     lastColourCspInput={level:structuredClone(level),drags:structuredClone(drags),levelSha256:digest(level),rawBefore:stats.rawDiscoveredStates};
     const coloured=recolourKnownPlainWitness(runtime,level,drags,{charge,micro,transition,cspStats:colourCspStats,maxCspNodes:10000,preserveColourCounts:true});
     stats.colourCspNodes=colourCspStats.nodes;
     colourCspReports.push({inputLevelSha256:digest(level),ok:coloured.ok,reason:coloured.reason??null,domains:coloured.domains,
      cspNodesTotal:coloured.cspNodesTotal??colourCspStats.nodes,statistics:coloured.statistics,assetBindings:coloured.assetBindings});
     if(!coloured.ok){stats.colourCspUnsatisfied++;return null;}
     return{level:coloured.level,drags:coloured.drags,replay:coloured.replay,independentReplay:coloured.independentReplay,
      reverseOperations:all,routeColouring:coloured,preColourGeometricLevel:level,preColourGeometricDrags:drags,
      reverseOperationsAreBeforeColouring:true};
    }
    runtime.validateLevel(level);
    const replay=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);
    if(!replay.valid||!replay.complete||!independent.valid||!independent.complete||independent.failed||replay.nonClearingDrags!==independent.nonClearingDrags)return null;
    return{level,drags,replay,independentReplay:independent,reverseOperations:all};
  }
  function walkVacancy(level,ops){
   if(blueprint){
    stats.vacancyWalks++;const trail=new Set(),dead=new Set();
    function visit(current,walk){
     stats.maximumVacancyDepth=Math.max(stats.maximumVacancyDepth,walk.length);
     const k=charge(current,true);if(trail.has(k)||dead.has(k))return null;trail.add(k);
     if(walk.length>=minimumScrambleDrags){const complete=completeAt(current,[...ops,...walk]);if(complete)return complete;}
     if(walk.length<maxScrambleDrags){
      const choices=parkingOptions(current).filter(x=>!trail.has(x.k)&&!dead.has(x.k));
      const ranked=choices.map(x=>({x,score:r()-x.penalty*.2-orbitFootprintArea(template,x.level)*2})).sort((a,b)=>b.score-a.score);
      for(const{x}of ranked){const solved=visit(x.level,[...walk,x.operation]);if(solved)return solved;}
     }else stats.vacancyDepthLimitHits++;
     trail.delete(k);dead.add(k);return null;
    }
    return visit(level,[]);
   }
   stats.vacancyWalks++;let current=level;const trail=new Set([worldKey(current)]),walk=[];
   for(let step=0;step<=maxScrambleDrags;step++){
    charge(current,true);
    if(step>=minimumScrambleDrags){const complete=completeAt(current,[...ops,...walk]);if(complete)return complete;}
    if(step===maxScrambleDrags)break;
    const choices=parkingOptions(current).filter(x=>!trail.has(x.k));
    if(!choices.length)break;
    const chosen=choices.map(x=>({x,score:r()-x.penalty*.2-(blueprint?orbitFootprintArea(template,x.level)*2:0)})).sort((a,b)=>b.score-a.score)[0].x;
    current=chosen.level;trail.add(chosen.k);walk.push(chosen.operation);
   }
   return null;
  }
  function fill(level,todo,ops){
   stats.fillCalls++;const k=charge(level,true);if(deadFill.has(k))return null;
   if(!todo.length){const solved=walkVacancy(level,ops);if(solved)return solved;deadFill.add(k);return null;}
   // During this insertion-only phase occupancy only grows. A remaining body
   // whose complete portal footprint is already blocked can never be inserted
   // later. Reject it now rather than spending the raw budget on doomed orders.
   if(level.blocks.length){const checkedClasses=new Set();for(const b of todo){
    const type=digest({shape:b.shape,color:b.color});if(checkedClasses.has(type))continue;checkedClasses.add(type);
    const gate=level.gates.find(g=>g.color===b.color);let open=false;
    for(let y=0;y<=level.height-height(b)&&!open;y++)for(let x=0;x<=level.width-width(b)&&!open;x++){
     transition();if(atGate({...b,x,y},gate,level)&&isValidPose(level,b,x,y)){
      charge({...level,blocks:[...level.blocks,{...b,x,y}]});open=true;
     }
    }
    if(!open){stats.blockedFuturePortals++;deadFill.add(k);return null;}
   }}
   const classes=new Set(),possible=shuffle(todo,r).sort((a,b)=>b.shape.length-a.shape.length).filter(b=>{const k=digest({shape:b.shape,color:b.color});if(classes.has(k))return false;classes.add(k);return true;}).slice(0,6);
   for(const b of possible)for(const choice of insertionOptions(level,b,6)){
    const solved=fill(choice.level,todo.filter(x=>x.id!==b.id),[...ops,choice.operation]);if(solved)return solved;
   }
   deadFill.add(k);return null;
  }
  const solved=blueprint?runReverseInterleavedGraph({initialLevel:blueprint.level,initialOperations:blueprint.reverseOperations,inventory,
   worldKey,charge,queuePolicy:options.queuePolicy??'minimum-parking',layoutScore:level=>orbitFootprintArea(template,level)+adjacencyViolations(level.blocks)*.01,
   insertionOptions:(level,body)=>insertionOptions(level,body,16),parkingOptions,
   goal:(level,ops)=>completeAt(level,ops,[]),maxParkingDrags:maxScrambleDrags,stats}):fill(empty,remaining,operations);
  if(!solved)return result('REVERSE_CONSTRUCTION_EXHAUSTED',{lastPartialLevel:lastPartial,colourCspReports});
  const report=result('REVERSE_COMPLETE_WITNESS_NO_LOWER',{ok:true,...solved,levelSha256:digest(solved.level),U:solved.replay.nonClearingDrags,formalReady:false,
   colourCspReports,provenance:{...built.construction,sourceFootprintAreaRetained:orbitFootprintArea(source,solved.level),
    referenceBlueprint:blueprint?{referenceLevelSha256:blueprint.referenceLevelSha256,referenceRouteSha256:blueprint.referenceRouteSha256,
      initialPrefixClearCount:blueprint.initialPrefixClearCount,prefixDragCount:blueprint.prefixDragCount,withheldOriginalParkingCount:blueprint.withheldOriginalParkingCount,
      initialVacancyArea:blueprint.initialVacancyArea,referenceU:blueprint.referenceU,
      retainedFootprintArea:orbitFootprintArea(template,solved.level),shapeInventoryRetained:true}:null,
    reverseConstruction:{minimumScrambleDrags,maxScrambleDrags,finalInsertedShapes:finalBodies.map(b=>b.shape),
    reverseInsertionCount:solved.reverseOperations.filter(x=>x.kind==='insertion').length,reverseParkingCount:solved.reverseOperations.filter(x=>x.kind==='parking').length,
    fullSourceMaskRetained:true,allOtherTemplatePositionsDiscarded:!blueprint,templateUsedAsSuccessfulInverseBlueprint:Boolean(blueprint),temporaryInitialVacancyFootprintFromTemplate:blueprint?.temporaryInitialVacancy??[...reservedHole],
    forwardCompleteWitnessValidated:true,lowerBoundClaimed:false}}});
  return report;
 }catch(error){stats.colourCspNodes=colourCspStats.nodes;return result('REVERSE_CONSTRUCTION_STOPPED',{reason:error.message,lastPartialLevel:lastPartial,colourCspReports});}
}

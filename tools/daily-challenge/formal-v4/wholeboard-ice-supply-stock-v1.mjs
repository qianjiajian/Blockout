import assert from 'node:assert/strict';
import {retileWholeBoard,boardCells,absoluteCells,bodyFootprint,digest,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {colourAndPlaceIceExitsFirstFull,SELF as COLOUR} from './wholeboard-ice-first-full-colour-v1.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';

export const SELF='tools/daily-challenge/formal-v4/wholeboard-ice-supply-stock-v1.mjs';
export const VERSION='wholeboard-ice-supply-first-full-v1';
export const COLOUR_TOOL=COLOUR;
export const LIMITS=Object.freeze({maxPartialNodes:10000,maxDfsTransitions:10000,maxMilliseconds:30000,maxFullWorldReservations:1});
const integer=(n,a,b)=>assert(Number.isSafeInteger(n)&&n>=a&&n<=b);
const sortedCells=ps=>ps.map(p=>p.join(',')).sort();
export function assertIceSupplyRecipe(r,{qualificationOnly=false}={}) {
 assert(r&&typeof r.recipeId==='string'&&/^[a-z0-9-]+$/.test(r.recipeId));
 integer(r.sourceLevelId,qualificationOnly?990000:1,qualificationOnly?999999:200);
 for(const k of ['seed','colourSeed'])integer(r[k],1,2**32-1);
 integer(r.bodyCount,qualificationOnly?3:12,qualificationOnly?8:23);
 assert(['axial-bars','bar-mix','balanced'].includes(r.shapeProfile));
 integer(r.primaryExitQuota,2,4);integer(r.paletteSize,qualificationOnly?3:8,8);
 assert.equal(r.reservedGeneratorBerths,0);assert.equal(r.irregular,false);assert.equal(r.minimumIrregular,0);
 assert.deepEqual(r.fixedBlocks,[]);assert.equal(r.targetDifficulty,3);
 for(const k of ['maximumPartitions','maximumColourCsp','maximumFirstFullInputs','maximumJointCalls'])assert.equal(r[k],1);
 assert.equal(r.searchFloor,31);assert.equal(r.searchUpper,128);assert.equal(r.failedSameRecipeContinuationAllowed,false);
 assert.equal(r.gateIceCounts.length,2);if(qualificationOnly){integer(r.gateIceCounts[0],1,6);integer(r.gateIceCounts[1],r.gateIceCounts[0]+1,7);}else assert.deepEqual(r.gateIceCounts,[7,10]);
 assert.equal(r.formalId,undefined);assert.equal(r.targetFormalId,undefined);
 if(!qualificationOnly){assert(r.source&&/^[a-f0-9]{64}$/.test(r.source.levelSha256));assert(/^[a-f0-9]{64}$/.test(r.source.boardBaselineSha256));integer(r.source.playableCells,24,63);integer(r.source.width,1,10);integer(r.source.height,1,10);assert.equal(r.source.seamCount,0);}
 return true;
}

export function inspectWholeboardIceSupply(level,source,runtime,{qualificationOnly=false}={}) {
 const actual=level.blocks.flatMap(absoluteCells),board=boardCells(source);
 assert.equal(level.width,source.width);assert.equal(level.height,source.height);
 assert.equal((source.seams??[]).length,0,'Source seams are unsupported, never silently dropped');
 assert.equal((level.seams??[]).length,0);assert.equal(boardBaselineSha256(level),boardBaselineSha256(source));
 assert.deepEqual(sortedCells(boardCells(level)),sortedCells(board));
 assert.deepEqual(sortedCells(actual),sortedCells(board),'Complete, nonoverlapping original playable mask');
 const used=new Map(),ids=new Set();
 for(const b of level.blocks){
  assert(!ids.has(b.id));ids.add(b.id);assert(typeof b.color==='string');
  assert.deepEqual(Object.keys(b).sort(),['color','id','shape','x','y']);
  const match=runtime.matchFormalBlockShape(b.shape,'native-only');assert.equal(match?.quarterTurns,0);
  assert(runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId]);
  assert(b.shape.length<=6);
  for(const p of absoluteCells(b))used.set(p.join(','),b);
 }
 for(const [p,b]of used){const [x,y]=p.split(',').map(Number);for(const q of [[x+1,y],[x,y+1]]){
  const other=used.get(q.join(','));if(other&&other.id!==b.id)assert.notEqual(other.color,b.color,'Adjacent different bodies must differ in colour');
 }}
 assert.equal(new Set(level.gates.map(g=>g.color)).size,level.gates.length);
 const rim=new Set();for(const g of level.gates){assert.deepEqual(Object.keys(g).sort(),g.frozen?['color','frozen','id','offset','side','size']:['color','id','offset','side','size']);
  integer(g.offset,0,Math.max(level.width,level.height)-1);integer(g.size,1,3);
  for(let t=g.offset;t<g.offset+g.size;t++){
   const p=g.side==='top'?[t,0]:g.side==='bottom'?[t,level.height-1]:g.side==='left'?[0,t]:g.side==='right'?[level.width-1,t]:null;
   assert(p&&used.has(p.join(',')),'Actual rim cells');const k=g.side+':'+t;assert(!rim.has(k));rim.add(k);
  }
 }
 for(const b of level.blocks)assert(level.gates.some(g=>g.color===b.color));
 const ice=level.gates.filter(g=>g.frozen).sort((a,b)=>a.frozen-b.frozen);assert.equal(ice.length,2);
 if(!qualificationOnly)assert.deepEqual(ice.map(g=>g.frozen),[7,10]);else assert(ice[0].frozen>0&&ice[1].frozen>ice[0].frozen);
 assert(ice.every(g=>level.blocks.some(b=>b.color===g.color)),'Each ice gate has a real body');
 const ordinary=level.blocks.filter(b=>!ice.some(g=>g.color===b.color)).length,low=level.blocks.filter(b=>b.color===ice[0].color).length;
 assert(ordinary>=ice[0].frozen&&ordinary+low>=ice[1].frozen,'Necessary optimistic clear-event capacity, not spatial solvability');
 const queued=new Set((source.generators??[]).flatMap(g=>g.queueBlockIds));
 const original=source.blocks.filter(b=>!b.shutterId&&!queued.has(b.id)),now=new Set(level.blocks.map(bodyFootprint));
 const removed=original.filter(b=>!now.has(bodyFootprint(b))),retained=original.filter(b=>now.has(bodyFootprint(b)));
 const retainedCells=new Set(retained.flatMap(absoluteCells).map(p=>p.join(','))),changedArea=board.length-retainedCells.size;
 if(!qualificationOnly){assert(changedArea/board.length>=.6,'At least60% genuine source opening footprint change');assert(removed.length>=6,'At least6 original opening bodies genuinely replaced');}
 return{gateIceCounts:ice.map(g=>g.frozen),bodyMechanicsAbsent:true,optimisticOrdinaryClearCapacity:ordinary,optimisticCapacityIsNotRoute:true,q0:true,fullCoverage:true,adjacentDifferentColors:true,oneGatePerColor:true,
  originalOpeningBodies:original.length,removedOriginalOpeningBodies:removed.length,retainedOpeningArea:retainedCells.size,
  changedPlayableArea:changedArea,changedFraction:changedArea/board.length,qualificationOnly,
  note:'Area includes source cells originally behind real mechanisms; source inventory is separately disclosed. Wholeboard all-eight similarity and failed-parent shape/colour checks are required by the batch.'};
}

/** One old tiler invocation, one narrow first-full colour invocation. This
 * emits an exploratory GATE-ICE base only. No models, replay, claim or solver.
 * Original source mechanisms/inventory are disclosed, not falsely retained.
 * DFS counters retain their original meaning, NOT all coordinate inspections.
 * Deterministic domain compilation is finite but not part of those DFS counts.
 */
export function constructWholeboardIceSupply(source,runtime,recipe,{qualificationOnly=false,now=Date.now,onFullWorld=()=>{}}={}) {
 assertIceSupplyRecipe(recipe,{qualificationOnly});
 if(qualificationOnly)assert(source.id>=990000&&boardCells(source).length<=16&&recipe.bodyCount<=8);
 else{assert.equal(boardCells(source).length,source.width*source.height,'Normal full rectangular source');assert.equal(now,Date.now);assert.equal(digest(source),recipe.source.levelSha256);}
 assert.equal(source.id,recipe.sourceLevelId);
 assert.equal((source.seams??[]).length,0,'Source seams are unsupported');
 if(!qualificationOnly){assert.equal(source.width,recipe.source.width);assert.equal(source.height,recipe.source.height);assert.equal(boardCells(source).length,recipe.source.playableCells);assert.equal(boardBaselineSha256(source),recipe.source.boardBaselineSha256);}
 const start=now(),guard=()=>assert(now()-start<LIMITS.maxMilliseconds,'Construction deadline');
 let partition=null,paint=null,level=null,fullReservations=0,firstFullFacts=null,reason=null;
 const constructionCalls={retile:0,colour:0};
 const account=()=>({version:VERSION,qualificationOnly,limits:LIMITS,
  elapsedMilliseconds:now()-start,fullWorldReservations:fullReservations,fullWorlds:level?1:0,
  partialColourSupportChecks:paint?.supportChecks??0,partialColourSupportPrunes:paint?.supportPrunes??0,partialColourSupportCheckLimit:1000000,
  partialNodes:(partition?.nodes??0)+(paint?.nodes??paint?.fullFacts?.nodes??0),
  dfsTransitions:(partition?.transitions??0)+(paint?.transitions??paint?.fullFacts?.transitions??0),
  counterMeaning:'Original tiler/colour DFS nodes and branches only; deterministic domain and adjacency scans are not mislabeled as counted transitions.',
  domainWorkBoundedBy:{boardDimensions:[source.width,source.height],playableCells:boardCells(source).length,bodyCount:recipe.bodyCount,shapeAreaMaximum:6,gateCount:recipe.paletteSize},
  completeUncolouredFrames:0,uncolouredFrameIsNotPlayableWorld:true,firstFullTerminal:true,newModels:0,newSearches:0,newReplays:0,newClaims:0});
 let staticFacts=null;
 try{
  guard();constructionCalls.retile++;partition=retileWholeBoard(source,runtime,{seed:recipe.seed,maxNodes:LIMITS.maxPartialNodes,maxTransitions:LIMITS.maxDfsTransitions,
   bodyCount:recipe.bodyCount,irregular:false,minimumIrregular:0,shapeProfile:recipe.shapeProfile,fixedBlocks:[],
   forbiddenFootprints:source.blocks.map(bodyFootprint)});guard();
  if(!partition.ok)throw Error('PARTITION:'+partition.reason);
  const maxNodes=LIMITS.maxPartialNodes-partition.nodes,maxTransitions=LIMITS.maxDfsTransitions-partition.transitions;
  assert(maxNodes>0&&maxTransitions>0,'Construction DFS budget');
  // No colors and no gates yet: an exact-cover/domain frame, not a full world.
  const frame={id:source.id,name:`每日挑战整盘冰门新布局 ${recipe.recipeId}`,difficulty:'super',reward:0,
   width:source.width,height:source.height,...(source.playable?{playable:source.playable}:{}),...(source.blocked?{blocked:source.blocked}:{}),
   timeSeconds:source.timeSeconds,parMoves:source.parMoves,mechanismRules:'revised-2026-09-27-v1.5',blocks:partition.blocks,gates:[]};
  constructionCalls.colour++;paint=colourAndPlaceIceExitsFirstFull(frame,runtime,{seed:recipe.colourSeed,maxNodes,maxTransitions,
   paletteSize:recipe.paletteSize,reservedGeneratorBerths:0,shapeProfile:recipe.shapeProfile,primaryExitQuota:recipe.primaryExitQuota,
   gateIceCounts:recipe.gateIceCounts,qualificationOnly,reserveFullWorld(){guard();assert.equal(fullReservations,0);fullReservations++;},
   onFullWorld(world,facts){assert.equal(level,null);level=world;firstFullFacts=facts;onFullWorld(world,facts);guard();}});
  // Preserve the object received by observer even when any later predicate fails.
  if(paint.level)assert.equal(paint.level,level);
  guard();if(!paint.ok)throw Error('COLOUR:'+paint.reason);
  assert(level);staticFacts=inspectWholeboardIceSupply(level,source,runtime,{qualificationOnly});guard();
 }catch(e){reason=e.message;}
 return{version:VERSION,recipeSha256:digest(recipe),sourceLevelSha256:digest(source),sourceLevelId:source.id,
  found:!!level,ok:!!level&&!reason,status:!reason?'WHOLEBOARD_ICE_FIRST_FULL_READY':level?'WHOLEBOARD_ICE_FIRST_FULL_REJECTED':'WHOLEBOARD_ICE_NO_FULL_TERMINAL',
  reason,level,levelSha256:level?digest(level):null,partition,paint,firstFullFacts,staticFacts,accounting:account(),
  sourceInventory:inventorySummary(source,runtime),sourceTemplateCopied:false,sourceMechanismsRetained:false,
  sourceInventoryPolicy:'Only exact normal source geometry is retained; all opening bodies and exits are freshly authored. Source hidden, queue and shell inventory is disclosed, never claimed as preserved.',
  constructionCalls,accepted:false,catalogEligible:false,formalReady:false};
}

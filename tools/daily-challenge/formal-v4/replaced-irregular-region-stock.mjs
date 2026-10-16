import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {retileWholeBoard,boardCells,bodyFootprint,absoluteCells,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {mappedLatePrefix} from './late-region-gate-aware-factory.mjs';
import {colourLatePrefixGateAware} from './late-prefix-gate-aware-colouring.mjs';
import {createEarlyStockMeter,auditEarlyFrozenPrefix} from './early-six-task-factory.mjs';
import {reserveEarlyFrozenAssignment} from './early-frozen-ice-joint.mjs';
import {auditThawedPrefixBridge} from './early-frozen-prefix-tail-task.mjs';

export const FIXED_GATE_REGION_VERSION='fully-replaced-q0-irregular-source-rectangular-stock-v1';
const points=ps=>JSON.stringify(ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const key=p=>p.join(',');
const sha=b=>createHash('sha256').update(b).digest('hex');

/** A colour-domain view, never an artwork substitute or gameplay runtime. */
export function fixedGateColourRuntime(runtime,gates){
 const colours=gates.map(g=>g.color);assert(colours.length>=1&&colours.length<=8);
 assert.equal(new Set(colours).size,colours.length,'One preserved gate per colour');
 const original=runtime.GAME_ART.gameplay.formalBlocks;
 for(const c of colours)assert(original[c],`No real artwork colour: ${c}`);
 const formalBlocks=Object.freeze(Object.fromEntries(colours.map(c=>[c,original[c]])));
 return Object.freeze({...runtime,GAME_ART:Object.freeze({...runtime.GAME_ART,
  gameplay:Object.freeze({...runtime.GAME_ART.gameplay,formalBlocks})})});
}

/** Validate the original complete board; only its declared region is tiled. */
export function assertFixedGateRegionBlueprint(runtime,bp){
 const source=bp.level;runtime.assertPlainProofDomain(source);
 assert(bp.changedBodies.length&&bp.fixedBlocks.length&&Array.isArray(bp.prefixDrags));
 const ids=new Set(source.blocks.map(b=>b.id));assert.equal(ids.size,source.blocks.length);
 const listed=[...bp.fixedBlocks,...bp.changedBodies];
 assert.equal(listed.length,source.blocks.length);assert.equal(new Set(listed.map(b=>b.id)).size,ids.size);
 for(const b of listed){
  assert.deepEqual(b,source.blocks.find(x=>x.id===b.id),'Exact original fixed/changed body');
  const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));
  assert.equal(new Set(b.shape.map(key)).size,b.shape.length,'Original shape cells must be unique');
  if(bp.fixedBlocks.some(x=>x.id===b.id))assert.equal(b.shape.length,w*h,'Retained bodies must remain solid rectangles');
  assert(b.shape.every(([x,y])=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0));
  const match=runtime.matchFormalBlockShape(b.shape,'native-only');assert.equal(match?.quarterTurns,0);
  assert(runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId],`Missing real fixed/source art: ${b.id}`);
 }
 assert.equal(points(source.blocks.flatMap(absoluteCells)),points(boardCells(source)),'Original complete unique occupancy');
 const cells=bp.region.cells;assert.equal(new Set(cells.map(key)).size,cells.length);
 assert.equal(points(bp.changedBodies.flatMap(absoluteCells)),points(cells),'Region is exact complete-body union');
 assert(cells.length/boardCells(source).length>=.35,'At least 35% actual playable area');
 const set=new Set(cells.map(key)),seen=new Set([key(cells[0])]),queue=[cells[0]];
 for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(set.has(key(p))&&!seen.has(key(p))){seen.add(key(p));queue.push(p);}
 assert.equal(seen.size,cells.length,'One connected replacement region');
 const fixedIds=new Set(bp.fixedBlocks.map(b=>b.id));
 assert(bp.prefixDrags.every(d=>fixedIds.has(d.blockId)),'Prefix only operates retained bodies');
 fixedGateColourRuntime(runtime,source.gates);
 return true;
}

/** Future inputs only. One geometry enumeration and at most one colour CSP.
 * The region problem is an uncoloured exact-cover domain, not a puzzle level.
 * All complete original-board colour worlds and final ice use the old meter.
 * No ledger, search, retry, target-band fallback or candidate admission here. */
export function constructFixedGateRegionStock(runtime,blueprint,{seed,colourSeed=seed,bodyCountDelta=0,shapeProfile,
 forbiddenShapeHashes=[],geometryFilter=null,qualificationOnly=false,meterLimits={}}={}){
 assert(Number.isSafeInteger(seed)&&Number.isSafeInteger(colourSeed));
 assert(['balanced','bar-mix','axial-bars'].includes(shapeProfile),'Explicit supported shape profile required');
 assert(Number.isSafeInteger(bodyCountDelta)&&bodyCountDelta>=-2&&bodyCountDelta<=3);
 assert.equal(typeof qualificationOnly,'boolean');assertFixedGateRegionBlueprint(runtime,blueprint);
 const count=blueprint.iceCount??0;assert((qualificationOnly?[0,1,2,4]:[0,2,4]).includes(count));
 const meter=createEarlyStockMeter(meterLimits),source=blueprint.level;
 const bodyCount=blueprint.changedBodies.length+bodyCountDelta;assert(bodyCount>0);
 // Tiling receives only the new-region geometry and original region inventory.
 // The complete source mask/gates are restored before any colour world exists.
 const geometryProblem={...source,playable:blueprint.region.cells,blocked:[],blocks:blueprint.changedBodies};
 const partition=retileWholeBoard(geometryProblem,runtime,{seed,maxNodes:4000,maxTransitions:8000,bodyCount,
  irregular:false,minimumIrregular:0,shapeProfile,fixedBlocks:[],forbiddenFootprints:blueprint.changedBodies.map(bodyFootprint)});
 meter.partitionTransitions(partition.transitions??0);
 const partitionScope={kind:'uncoloured-region-exact-cover-only',notGameplayLevel:true,shapeProfile,
  cells:blueprint.region.cells,regionBodyCount:bodyCount,retainedBodies:blueprint.fixedBlocks.length,
  finalBodyCount:blueprint.fixedBlocks.length+bodyCount,originalBoardMaskUnchanged:true};
 if(!partition.ok)return{ok:false,status:'STATIC_PARTITION_REJECTED',partition,partitionScope,
  constructionAccounting:meter.snapshot(),enteredColourCsp:false,searchPerformed:false};
 assert.equal(partition.blocks.length,bodyCount);assert.equal(points(partition.blocks.flatMap(absoluteCells)),points(blueprint.region.cells));
 let paint=null,plain=null,finalLevel=null,placeholderWorld;
 const plainAccounting=()=>{const a=meter.snapshot();return{version:'late-region-static-construction-v1',
  completeWorldReservations:a.placeholderWorldReservations+a.completedColourWorldReservations,
  transitions:a.transitions,microStates:a.microStates,elapsedMilliseconds:a.elapsedMilliseconds};};
 const accounting=()=>count?meter.snapshot():plainAccounting();
 const rejected=(status,extra={})=>({ok:false,status,partition,partitionScope,placeholderWorld,paint,plain,level:finalLevel,
  stockFingerprints:placeholderWorld?designFingerprints(placeholderWorld):null,enteredColourCsp:paint!==null,
  constructionAccounting:accounting(),searchPerformed:false,...extra});
 try{
  meter.reserveWorld('placeholderWorldReservations');
  const usedIds=new Set(source.blocks.map(b=>b.id));
  let serial=0;const newId=()=>{let id;do{id=`region-${seed}-${++serial}`;}while(usedIds.has(id));usedIds.add(id);return id;};
  let level={...structuredClone(source),blocks:[...structuredClone(blueprint.fixedBlocks),...partition.blocks.map((b,i)=>
   ({...b,id:blueprint.changedBodies[i]?.id??newId(),color:'red'}))]};
  placeholderWorld=level;const oldF=designFingerprints(source),f=designFingerprints(level);
  if(f.shapeSha256===oldF.shapeSha256)return rejected('STATIC_SHAPE_INVENTORY_UNCHANGED');
  if(forbiddenShapeHashes.includes(f.shapeSha256))return rejected('STATIC_SAME_SOURCE_BRANCH_SHAPE_REJECTED');
  const oldFootprints=new Set(source.blocks.map(bodyFootprint)),newFootprints=new Set(level.blocks.map(bodyFootprint));
  assert.equal(points(source.blocks.filter(b=>!newFootprints.has(bodyFootprint(b))).flatMap(absoluteCells)),points(blueprint.region.cells));
  assert.equal(points(level.blocks.filter(b=>!oldFootprints.has(bodyFootprint(b))).flatMap(absoluteCells)),points(blueprint.region.cells));
  assert.equal(points(level.blocks.flatMap(absoluteCells)),points(boardCells(source)),'Assembled complete occupancy');
  if(compareLayouts(level,source).footprintSimilarity>.65)return rejected('STATIC_PARENT_NEAR');
  const geometryAudit=geometryFilter?.(level)??null;
  if(geometryAudit&&!geometryAudit.passed)return rejected('STATIC_GEOMETRY_FILTER',{geometryAudit});
  const view=fixedGateColourRuntime(runtime,source.gates),mapped={...mappedLatePrefix(blueprint),preservedGates:structuredClone(source.gates)};
  paint=colourLatePrefixGateAware(level,view,{seed:colourSeed,...meter.paintLimits(),paletteSize:source.gates.length,mappedPrefix:mapped,
   fixedBodyColours:Object.fromEntries(blueprint.fixedBlocks.map(b=>[b.id,b.color])),
   forbiddenBodyColours:{[blueprint.changedBodies[0].id]:[blueprint.changedBodies[0].color]}});
  meter.importPaint(paint);meter.guard();
  if(!paint.ok)return rejected('STATIC_COLOUR_REJECTED');
  assert.equal(paint.gates.length,source.gates.length);
  for(const g of source.gates)assert.deepEqual(paint.gates.find(x=>x.color===g.color),g);
  paint.gates=structuredClone(source.gates);
  level={...level,blocks:paint.blocks,gates:paint.gates};finalLevel=level;
  for(const b of blueprint.fixedBlocks)assert.deepEqual(level.blocks.find(x=>x.id===b.id),b);
  assert.deepEqual(level.gates,source.gates);assert.equal(points(boardCells(level)),points(boardCells(source)));
  assert.equal(points(level.blocks.flatMap(absoluteCells)),points(boardCells(source)));
  for(const b of level.blocks)assert.equal(b.shape.length,(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1]))),'Final mathematical input remains all rectangles');
  const finalF=designFingerprints(level);assert.notEqual(finalF.shapeSha256,oldF.shapeSha256);assert.notEqual(finalF.colorSha256,oldF.colorSha256);
  const recoloured=level.blocks.find(b=>b.id===blueprint.changedBodies[0].id);assert(recoloured.color!==blueprint.changedBodies[0].color);
  const inventory=inventorySummary(level,runtime);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);
  const assetBindings={};for(const b of level.blocks){const match=runtime.matchFormalBlockShape(b.shape,'native-only');assert.equal(match?.quarterTurns,0);
   const relative=runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId];assert(relative);
   const file='public/'+relative.replace(/^\//,'');assetBindings[file]=sha(readFileSync(file));}
  plain={ok:true,status:'NEW_ALL_GATES_FIXED_PLAIN_CONSTRUCTION_NOT_SEARCHED',level,levelSha256:levelSha256(level),sourceLevelId:blueprint.sourceLevelId,
   placeholderWorld,partition,partitionScope,paint,constructionAccounting:plainAccounting(),assetBindings,inventory,
   prefixDrags:blueprint.prefixDrags,prefixSha256:routeSha256(blueprint.prefixDrags),
   provenance:{version:FIXED_GATE_REGION_VERSION,reference:blueprint.reference,referenceLevelSha256:blueprint.referenceLevelSha256,region:blueprint.region,
    seed,colourSeed,bodyCountDelta,shapeProfile,allExternalBodiesByteEquivalent:true,allReferenceGatesByteEquivalentIncludingArrayOrder:true,sourceMaskRetained:true,
    newShapeInventory:true,realSharedBodyRecoloured:recoloured.id,knownPrefixIsNotLowerBound:true,
    tilerRegionOnly:true,paletteColours:source.gates.map(g=>g.color),realArtValuesUnmodified:true},stockFingerprints:finalF,geometryAudit,searchPerformed:false};
  const regionBlockIds=level.blocks.filter(b=>!blueprint.fixedBlocks.some(x=>x.id===b.id)).map(b=>b.id);
  let iceDeclaration,thawedPrefixBridge;
  if(count){iceDeclaration={regionBlockIds,count};finalLevel=reserveEarlyFrozenAssignment(level,iceDeclaration,meter);}
  // Existing supplied-route audits are validation only, not a tail search.
  const prefixAudit=auditEarlyFrozenPrefix(runtime,finalLevel,blueprint.prefixDrags,
   iceDeclaration??{regionBlockIds:[],count:blueprint.prefixDrags.filter(d=>d.exitSide).length});meter.guard();
  if(count){thawedPrefixBridge=auditThawedPrefixBridge(runtime,finalLevel,level,blueprint.prefixDrags,iceDeclaration,{guard:meter.guard});meter.guard();}
  return{...plain,ok:true,status:count?'NEW_EARLY_FROZEN_STOCK_PREFIX_ONLY':'NEW_STATIC_LATE_REGION_INPUT_NO_U_OR_L',level:finalLevel,
   levelSha256:levelSha256(finalLevel),plain,iceDeclaration,thawedPrefixBridge,prefixAudit,constructionAccounting:accounting(),
   stockFingerprints:designFingerprints(finalLevel),enteredColourCsp:true,newSearches:0,L:null,U:null,accepted:false,catalogEligible:false,formalReady:false};
 }catch(error){return rejected('STATIC_FIXED_GATE_REGION_REJECTED',{reason:error.message});}
}

export const constructPlainFixedGateRegionStock=(rt,bp,options)=>{assert.equal(bp.iceCount??0,0);return constructFixedGateRegionStock(rt,bp,options);};
export const constructIcedFixedGateRegionStock=(rt,bp,options)=>{assert((bp.iceCount??0)>0);return constructFixedGateRegionStock(rt,bp,options);};

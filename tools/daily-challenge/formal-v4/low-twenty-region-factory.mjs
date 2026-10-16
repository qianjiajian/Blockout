import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {retileWholeBoard,boardCells,bodyFootprint,absoluteCells,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {mappedLatePrefix} from './late-region-gate-aware-factory.mjs';
import {colourLatePrefixGateAware} from './late-prefix-gate-aware-colouring.mjs';
import {colourWithAllReferenceGates,createEarlyStockMeter,auditEarlyFrozenPrefix} from './early-frozen-region-factory.mjs';

export const EARLY_REGION_VERSION='low-twenty-all-gates-fixed-plain-region-v1';
const points=ps=>JSON.stringify(ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const sha=b=>createHash('sha256').update(b).digest('hex');

/** New independent file, derived from the frozen late-region factory. One
 * finite retile and at most one colour CSP. No gameplay solver or claim. */
export function constructLowTwentyRegionStock(runtime,blueprint,{seed,colourSeed=seed,bodyCountDelta=0,forbiddenShapeHashes=[],geometryFilter=null,qualificationOnly=false,meterLimits={}}={}){
 assert(Number.isSafeInteger(seed)&&Number.isSafeInteger(colourSeed));assert(Number.isSafeInteger(bodyCountDelta)&&bodyCountDelta>=-2&&bodyCountDelta<=3);
 assert.equal(typeof qualificationOnly,'boolean');
 runtime.assertPlainProofDomain(blueprint.level);
 const meter=createEarlyStockMeter(meterLimits),source=blueprint.level;
 const partition=retileWholeBoard(source,runtime,{seed,maxNodes:4000,maxTransitions:8000,bodyCount:source.blocks.length+bodyCountDelta,
  irregular:false,minimumIrregular:0,fixedBlocks:blueprint.fixedBlocks,forbiddenFootprints:blueprint.changedBodies.map(bodyFootprint)});
 meter.partitionTransitions(partition.transitions??0);
 if(!partition.ok)return{ok:false,status:'STATIC_PARTITION_REJECTED',partition,constructionAccounting:meter.snapshot(),enteredColourCsp:false,searchPerformed:false};
 const fixed=new Map(blueprint.fixedBlocks.map(b=>[bodyFootprint(b),b]));let changedIndex=0,paint=null,plain=null,finalLevel=null,placeholderWorld;
 const plainAccounting=()=>{const a=meter.snapshot();return{version:'late-region-static-construction-v1',completeWorldReservations:a.placeholderWorldReservations+a.completedColourWorldReservations,
  transitions:a.transitions,microStates:a.microStates,elapsedMilliseconds:a.elapsedMilliseconds};};
 const rejected=(status,extra={})=>({ok:false,status,partition,placeholderWorld,paint,plain,level:finalLevel,stockFingerprints:placeholderWorld?designFingerprints(placeholderWorld):null,
  enteredColourCsp:paint!==null,constructionAccounting:plainAccounting(),searchPerformed:false,...extra});
 try{
  meter.reserveWorld('placeholderWorldReservations');
  let level={...structuredClone(source),blocks:partition.blocks.map(b=>fixed.has(bodyFootprint(b))?structuredClone(fixed.get(bodyFootprint(b))):
   {...b,id:blueprint.changedBodies[changedIndex++]?.id??`low20-${seed}-${changedIndex}`,color:'red'})};
  placeholderWorld=structuredClone(level);const oldF=designFingerprints(source),f=designFingerprints(level);
  if(f.shapeSha256===oldF.shapeSha256)return rejected('STATIC_SHAPE_INVENTORY_UNCHANGED');
  if(forbiddenShapeHashes.includes(f.shapeSha256))return rejected('STATIC_SAME_SOURCE_BRANCH_SHAPE_REJECTED');
  const oldFootprints=new Set(source.blocks.map(bodyFootprint)),newFootprints=new Set(level.blocks.map(bodyFootprint));
  assert.equal(points(source.blocks.filter(b=>!newFootprints.has(bodyFootprint(b))).flatMap(absoluteCells)),points(blueprint.region.cells));
  assert.equal(points(level.blocks.filter(b=>!oldFootprints.has(bodyFootprint(b))).flatMap(absoluteCells)),points(blueprint.region.cells));
  if(compareLayouts(level,source).footprintSimilarity>.65)return rejected('STATIC_PARENT_NEAR');
  const geometryAudit=geometryFilter?.(level)??null;if(geometryAudit&&!geometryAudit.passed)return rejected('STATIC_GEOMETRY_FILTER',{geometryAudit});
  paint=colourWithAllReferenceGates(level,runtime,blueprint,{seed:colourSeed,...meter.paintLimits()});meter.importPaint(paint);
  if(paint.ok)finalLevel={...level,blocks:paint.blocks,gates:paint.gates};meter.guard();
  if(!paint.ok)return rejected('STATIC_COLOUR_REJECTED');
  level=finalLevel;
  for(const block of blueprint.fixedBlocks)assert.deepEqual(level.blocks.find(b=>b.id===block.id),block);
  assert.deepEqual(level.gates,source.gates);const finalF=designFingerprints(level);
  assert.notEqual(finalF.shapeSha256,oldF.shapeSha256);assert.notEqual(finalF.colorSha256,oldF.colorSha256);
  const changed=level.blocks.find(b=>b.id===blueprint.changedBodies[0].id);assert(changed&&changed.color!==blueprint.changedBodies[0].color);
  const inventory=inventorySummary(level,runtime);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);
  const assetBindings={};for(const b of level.blocks){const match=runtime.matchFormalBlockShape(b.shape,'native-only');assert.equal(match?.quarterTurns,0);
   const relative=runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId];assert(relative);const file='public/'+relative.replace(/^\//,'');assetBindings[file]=sha(readFileSync(file));}
  assert.equal(points(level.blocks.flatMap(absoluteCells)),points(boardCells(level)),'Full opening occupancy without overlap');
  plain={ok:true,status:'NEW_ALL_GATES_FIXED_PLAIN_CONSTRUCTION_NOT_SEARCHED',level,levelSha256:levelSha256(level),sourceLevelId:blueprint.sourceLevelId,
   placeholderWorld,partition,paint,constructionAccounting:plainAccounting(),assetBindings,inventory,prefixDrags:blueprint.prefixDrags,prefixSha256:routeSha256(blueprint.prefixDrags),
   provenance:{version:EARLY_REGION_VERSION,reference:blueprint.reference,referenceLevelSha256:blueprint.referenceLevelSha256,region:blueprint.region,
    seed,colourSeed,bodyCountDelta,allExternalBodiesByteEquivalent:true,allReferenceGatesByteEquivalentIncludingArrayOrder:true,sourceMaskRetained:true,
    newShapeInventory:true,realSharedBodyRecoloured:changed.id,knownPrefixIsNotLowerBound:true},stockFingerprints:finalF,geometryAudit,searchPerformed:false};
  finalLevel=level;
  const prefixAudit=auditEarlyFrozenPrefix(runtime,level,blueprint.prefixDrags,{regionBlockIds:[],count:blueprint.prefixDrags.filter(d=>d.exitSide).length});meter.guard();
  return{...plain,ok:true,status:'NEW_STATIC_LATE_REGION_INPUT_NO_U_OR_L',plain,prefixAudit,constructionAccounting:plainAccounting(),
   partition,paint,placeholderWorld,stockFingerprints:finalF,enteredColourCsp:true,L:null,U:null,accepted:false,catalogEligible:false,formalReady:false,searchPerformed:false};
 }catch(error){return rejected('STATIC_LOW_TWENTY_REJECTED',{reason:error.message});}
}

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
import {auditThawedPrefixBridge} from './early-frozen-prefix-tail-task.mjs';
import {reserveEarlyFrozenAssignment,EARLY_FROZEN_ACCOUNTING} from './early-frozen-ice-joint.mjs';

export const EARLY_REGION_VERSION='new-stock-all-gates-fixed-early-six-task-v1';
const points=ps=>JSON.stringify(ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const sha=b=>createHash('sha256').update(b).digest('hex');

/** The frozen helper already supports a complete preserved gate set. Retain
 * its domain/parking checks, then restore the exact reference array order. */
export function colourWithAllReferenceGates(level,runtime,blueprint,options={}){
 const mapped={...mappedLatePrefix(blueprint),preservedGates:structuredClone(blueprint.level.gates)};
 const paint=colourLatePrefixGateAware(level,runtime,{...options,paletteSize:blueprint.level.gates.length,mappedPrefix:mapped,
  fixedBodyColours:Object.fromEntries(blueprint.fixedBlocks.map(b=>[b.id,b.color])),
  forbiddenBodyColours:{[blueprint.changedBodies[0].id]:[blueprint.changedBodies[0].color]}});
 if(paint.ok){
  assert.equal(paint.gates.length,blueprint.level.gates.length);
  for(const gate of blueprint.level.gates)assert.deepEqual(paint.gates.find(g=>g.color===gate.color),gate,'All reference gates must be byte-equivalent');
  paint.gates=structuredClone(blueprint.level.gates);
 }
 return paint;
}

/** Each stock owns one meter; unrelated partition attempts never debit it. */
export function createEarlyStockMeter({maxWorlds=9998,maxTransitions=10000000,maxMicroStates=3000000,maxMilliseconds=30000}={}){
 for(const [n,v,cap]of [['worlds',maxWorlds,9998],['transitions',maxTransitions,10000000],['micro',maxMicroStates,3000000],['milliseconds',maxMilliseconds,30000]])
  assert(Number.isSafeInteger(v)&&v>0&&v<=cap,`Invalid finite stock ${n}`);
 const began=Date.now(),a={version:EARLY_FROZEN_ACCOUNTING,placeholderWorldReservations:0,completedColourWorldReservations:0,icedWorldReservations:0,
  completeWorldReservations:0,transitions:0,microStates:0,elapsedMilliseconds:0};
 const guard=()=>{assert(Date.now()-began<maxMilliseconds,'early-stock-deadline');};
 return{guard,
  reserveWorld(kind){guard();assert(['placeholderWorldReservations','completedColourWorldReservations','icedWorldReservations'].includes(kind));
   assert(a.completeWorldReservations<maxWorlds,'early-stock-complete-world-limit');a[kind]++;a.completeWorldReservations++;},
  partitionTransitions(n){assert(Number.isSafeInteger(n)&&n>=0);assert(a.transitions+n<=maxTransitions);a.transitions+=n;guard();},
  paintLimits(){guard();const worlds=Math.min(3000,maxWorlds-a.completeWorldReservations-1),remainingTransitions=maxTransitions-a.transitions;
   assert(worlds>0&&remainingTransitions>=2,'No colour and final ice budget');
   return{maxNodes:3000,maxTransitions:Math.min(6000,Math.floor(remainingTransitions/2)),maxMicroTransitions:Math.min(400000,Math.floor(remainingTransitions/2)),
    maxMicroStates:Math.min(100000,maxMicroStates-a.microStates),maxMilliseconds:Math.min(2000,maxMilliseconds-(Date.now()-began)),maxCompleteWorldReservations:worlds};},
  importPaint(p){const q=p.accounting;for(const k of ['completeWorldReservations','transitions','microStates'])assert(Number.isSafeInteger(q[k])&&q[k]>=0);
   // The helper pre-reserved each assignment against the passed remaining cap.
   assert(a.completeWorldReservations+q.completeWorldReservations+1<=maxWorlds);
   assert(a.transitions+q.transitions<=maxTransitions&&a.microStates+q.microStates<=maxMicroStates);
   a.completedColourWorldReservations+=q.completeWorldReservations;a.completeWorldReservations+=q.completeWorldReservations;
   a.transitions+=q.transitions;a.microStates+=q.microStates;},
  snapshot(){return{...a,elapsedMilliseconds:Date.now()-began};}
 };
}

export function auditEarlyFrozenPrefix(runtime,level,drags,iceDeclaration){
 const model=new runtime.PuzzleModel(structuredClone(level)),direct=new runtime.PuzzleModel(structuredClone(level),{deferExitCompletion:true});
 model.startCountdown();direct.startCountdown();const trace=[];let parking=0,clears=0;
 const ids=new Set(iceDeclaration.regionBlockIds);assert(drags.every(d=>!ids.has(d.blockId)),'Prefix must never operate a new region body');
 for(const[i,d]of drags.entries()){
  const before=model.snapshot();applyNativeDrag(model,d);const after=model.snapshot();
  const otherBefore=direct.snapshot();direct.beginAction();for(const p of d.path)assert(direct.moveBlockStep(d.blockId,...p));
  const departure=d.exitSide?direct.tryExit(d.blockId,d.exitSide):null;if(departure)assert(departure.ok);
  assert(direct.commitAction());if(departure?.exitAnimationId)assert(direct.completeExitAnimation(departure.exitAnimationId));
  const other=direct.snapshot(),delta=after.cleared-before.cleared;
  assert(!after.failed&&!other.failed);assert.equal(delta,other.cleared-otherBefore.cleared);assert.equal(delta,d.exitSide?1:0);
  assert.equal(after.moves,before.moves+1);assert.equal(other.moves,otherBefore.moves+1);parking+=Number(delta===0);clears+=delta;
  const physical=s=>s.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color,frozen:b.frozen})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(physical(after),physical(other));
  for(const id of ids){const original=level.blocks.find(b=>b.id===id),actual=after.blocks.find(b=>b.id===id);assert(actual);
   assert.equal(actual.x,original.x);assert.equal(actual.y,original.y);assert.equal(actual.frozen??0,Math.max(0,iceDeclaration.count-clears));}
  trace.push({drag:i+1,clearDelta:delta,clears,canonicalStateSha256:levelSha256(after),independentStateSha256:levelSha256(other)});
 }
 assert(clears>=iceDeclaration.count,'Prefix supplies fewer clears than initial ice');
 assert(model.snapshot().blocks.every(b=>(b.frozen??0)===0),'All surviving ice must thaw');assert(!model.snapshot().complete);
 return{valid:true,providedPrefixOnly:true,isLowerBound:false,fullUValidated:false,drags:drags.length,nonClearingDrags:parking,clearEvents:clears,trace};
}

/** New independent file, derived from the frozen late-region factory. One
 * finite retile and at most one colour CSP. No gameplay solver or claim. */
export function constructEarlyFrozenRegionStock(runtime,blueprint,{seed,colourSeed=seed,bodyCountDelta=0,forbiddenShapeHashes=[],geometryFilter=null,qualificationOnly=false,meterLimits={}}={}){
 assert(Number.isSafeInteger(seed)&&Number.isSafeInteger(colourSeed));assert(Number.isSafeInteger(bodyCountDelta)&&bodyCountDelta>=-2&&bodyCountDelta<=3);
 const count=blueprint.iceCount;assert((qualificationOnly?[1,2,4]:[2,4]).includes(count));
 runtime.assertPlainProofDomain(blueprint.level);
 const meter=createEarlyStockMeter(meterLimits),source=blueprint.level;
 const partition=retileWholeBoard(source,runtime,{seed,maxNodes:4000,maxTransitions:8000,bodyCount:source.blocks.length+bodyCountDelta,
  irregular:false,minimumIrregular:0,fixedBlocks:blueprint.fixedBlocks,forbiddenFootprints:blueprint.changedBodies.map(bodyFootprint)});
 meter.partitionTransitions(partition.transitions??0);
 if(!partition.ok)return{ok:false,status:'STATIC_PARTITION_REJECTED',partition,constructionAccounting:meter.snapshot(),enteredColourCsp:false,searchPerformed:false};
 const fixed=new Map(blueprint.fixedBlocks.map(b=>[bodyFootprint(b),b]));let changedIndex=0,paint=null,plain=null,iced=null,placeholderWorld;
 const plainAccounting=()=>{const a=meter.snapshot();return{version:'late-region-static-construction-v1',completeWorldReservations:a.placeholderWorldReservations+a.completedColourWorldReservations,
  transitions:a.transitions,microStates:a.microStates,elapsedMilliseconds:a.elapsedMilliseconds};};
 const rejected=(status,extra={})=>({ok:false,status,partition,placeholderWorld,paint,plain,level:iced,stockFingerprints:placeholderWorld?designFingerprints(placeholderWorld):null,
  enteredColourCsp:paint!==null,constructionAccounting:meter.snapshot(),searchPerformed:false,...extra});
 try{
  meter.reserveWorld('placeholderWorldReservations');
  let level={...structuredClone(source),blocks:partition.blocks.map(b=>fixed.has(bodyFootprint(b))?structuredClone(fixed.get(bodyFootprint(b))):
   {...b,id:blueprint.changedBodies[changedIndex++]?.id??`early-${seed}-${changedIndex}`,color:'red'})};
  placeholderWorld=structuredClone(level);const oldF=designFingerprints(source),f=designFingerprints(level);
  if(f.shapeSha256===oldF.shapeSha256)return rejected('STATIC_SHAPE_INVENTORY_UNCHANGED');
  if(forbiddenShapeHashes.includes(f.shapeSha256))return rejected('STATIC_SAME_SOURCE_BRANCH_SHAPE_REJECTED');
  const oldFootprints=new Set(source.blocks.map(bodyFootprint)),newFootprints=new Set(level.blocks.map(bodyFootprint));
  assert.equal(points(source.blocks.filter(b=>!newFootprints.has(bodyFootprint(b))).flatMap(absoluteCells)),points(blueprint.region.cells));
  assert.equal(points(level.blocks.filter(b=>!oldFootprints.has(bodyFootprint(b))).flatMap(absoluteCells)),points(blueprint.region.cells));
  if(compareLayouts(level,source).footprintSimilarity>.65)return rejected('STATIC_PARENT_NEAR');
  const geometryAudit=geometryFilter?.(level)??null;if(geometryAudit&&!geometryAudit.passed)return rejected('STATIC_GEOMETRY_FILTER',{geometryAudit});
  paint=colourWithAllReferenceGates(level,runtime,blueprint,{seed:colourSeed,...meter.paintLimits()});meter.importPaint(paint);meter.guard();
  if(!paint.ok)return rejected('STATIC_COLOUR_REJECTED');
  level={...level,blocks:paint.blocks,gates:paint.gates};
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
  const iceDeclaration={regionBlockIds:level.blocks.filter(b=>!blueprint.fixedBlocks.some(x=>x.id===b.id)).map(b=>b.id),count};
  iced=reserveEarlyFrozenAssignment(level,iceDeclaration,meter);meter.guard();
  
  // Provided-route validation has no branching and is reported separately.
  const prefixAudit=auditEarlyFrozenPrefix(runtime,iced,blueprint.prefixDrags,iceDeclaration);meter.guard();
  const thawedPrefixBridge=auditThawedPrefixBridge(runtime,iced,level,blueprint.prefixDrags,iceDeclaration,{guard:meter.guard});meter.guard();
  const frozenAccounting=meter.snapshot();
  return{ok:true,status:'NEW_EARLY_FROZEN_STOCK_PREFIX_ONLY',level:iced,levelSha256:levelSha256(iced),sourceLevelId:blueprint.sourceLevelId,
   plain,iceDeclaration,constructionAccounting:frozenAccounting,prefixAudit,thawedPrefixBridge,newSearches:0,prefixDrags:blueprint.prefixDrags,prefixSha256:routeSha256(blueprint.prefixDrags),
   partition,paint,placeholderWorld,stockFingerprints:designFingerprints(iced),enteredColourCsp:true,L:null,U:null,accepted:false,catalogEligible:false,formalReady:false,searchPerformed:false};
 }catch(error){return rejected('STATIC_EARLY_FROZEN_REJECTED',{reason:error.message});}
}

export const constructEarlyPrefixStock=constructEarlyFrozenRegionStock;

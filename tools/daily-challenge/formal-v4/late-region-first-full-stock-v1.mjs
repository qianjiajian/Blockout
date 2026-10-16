import assert from 'node:assert/strict';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {retileWholeBoard,boardCells,bodyFootprint,absoluteCells,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {colourLatePrefixGateAware as colourLatePrefix} from './late-prefix-gate-aware-colouring-first-full-v1.mjs';

export const LATE_REGION_VERSION='whole-connected-late-region-first-full-v1';
const key=p=>p.join(',');
const sortedCells=ps=>JSON.stringify(ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
function isConnected(cells){const all=new Set(cells.map(key)),seen=new Set([key(cells[0])]),queue=[cells[0]];
 for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(all.has(key(p))&&!seen.has(key(p))){seen.add(key(p));queue.push(p);}
 return seen.size===all.size;}

/** Reads/replays only a complete accepted reference. It does not claim or
 * search that reference or create a new puzzle. All changed bodies belong to
 * one connected footprint union untouched by the declared reference prefix. */
export function makeLateRegionBlueprint(runtime,reference,descriptor,{parkingTarget=31,minimumChangedFraction=.35}={}){
 assert(reference.accepted&&reference.levelSha256===levelSha256(reference.level));runtime.assertPlainProofDomain(reference.level);
 assert(descriptor?.path&&/^[a-f0-9]{64}$/.test(descriptor.sha256??''));
 assert.equal(parkingTarget,31);assert(minimumChangedFraction>=.35&&minimumChangedFraction<=.65);
 const actual=replayDecorated(runtime,reference.level,reference.drags),independent=independentReplay(runtime,reference.level,reference.drags);
 assert(actual.valid&&actual.complete&&!actual.failed&&independent.valid&&independent.complete&&!independent.failed);
 assert.equal(actual.nonClearingDrags,independent.nonClearingDrags);
 let parking=0,initialCut=0;const touched=new Set();
 for(const drag of reference.drags){touched.add(drag.blockId);initialCut++;if(!drag.exitSide)parking++;if(parking===parkingTarget)break;}
 assert.equal(parking,31);const changedBodies=reference.level.blocks.filter(b=>!touched.has(b.id));
 const cells=changedBodies.flatMap(absoluteCells),fraction=cells.length/boardCells(reference.level).length;
 assert(changedBodies.length>=5&&fraction>=minimumChangedFraction&&isConnected(cells),'A connected genuinely large untouched region is required');
 const ids=new Set(changedBodies.map(b=>b.id)),cut=reference.drags.findIndex(d=>ids.has(d.blockId));
 assert(cut>=initialCut);const prefixDrags=structuredClone(reference.drags.slice(0,cut));
 const fixedBlocks=reference.level.blocks.filter(b=>!ids.has(b.id));assert(prefixDrags.every(d=>fixedBlocks.some(b=>b.id===d.blockId)));
 const cleared=prefixDrags.filter(d=>d.exitSide).map(d=>reference.level.blocks.find(b=>b.id===d.blockId));
 return{version:LATE_REGION_VERSION,reference:structuredClone(descriptor),referenceLevelSha256:reference.levelSha256,
  referenceRouteSha256:routeSha256(reference.drags),sourceLevelId:reference.sourceLevelId??reference.level.id,
  level:structuredClone(reference.level),fixedBlocks:structuredClone(fixedBlocks),changedBodies:structuredClone(changedBodies),
  region:{cells,bodyIds:[...ids],fraction,area:cells.length,originalBodyCount:changedBodies.length,connected:true},prefixDrags,
  prefixFacts:{drags:cut,parking:prefixDrags.filter(d=>!d.exitSide).length,clears:cleared.length,
   releasedArea:cleared.reduce((n,b)=>n+b.shape.length,0),remainingBodies:reference.level.blocks.length-cleared.length,
   originalSuffixParking:reference.drags.slice(cut).filter(d=>!d.exitSide).length},
  knownReferenceOnly:true,newCandidateRouteNotClaimed:true,searchPerformed:false};
}

export function mappedLatePrefix(blueprint){
 const level=blueprint.level,positions=new Map(level.blocks.map(b=>[b.id,[b.x,b.y]])),parkingPoses={},openingColours={},preservedGates=new Map();
 for(const drag of blueprint.prefixDrags){const b=level.blocks.find(b=>b.id===drag.blockId);assert(b);
  if(drag.exitSide){openingColours[b.id]=b.color;
   const gate=level.gates.find(g=>g.color===b.color&&g.side===drag.exitSide);assert(gate);preservedGates.set(gate.id,gate);}
  else{parkingPoses[b.id]??=[];parkingPoses[b.id].push(positions.get(b.id),...drag.path);}
  if(drag.path.length)positions.set(b.id,drag.path.at(-1));
 }
 return{ok:true,drags:blueprint.prefixDrags,openingColours,parkingPoses,preservedGates:[...preservedGates.values()],
  note:'All supplied prefix drags are fixed; intermediate clears are permitted; these are not an L proof.'};
}

/** Only static exact-cover and colour CSP; no full-board gameplay search.
 * Each call has a new seed AND must produce a new shape inventory before its
 * sole colour CSP. Region external bodies retain every original field. */
export function constructLateRegionStock(runtime,blueprint,{seed,bodyCountDelta=0,colourSeed=seed,forbiddenShapeHashes=[],geometryFilter=null}={}){
 assert(Number.isSafeInteger(seed)&&Number.isSafeInteger(colourSeed));assert(Number.isSafeInteger(bodyCountDelta)&&bodyCountDelta>=-2&&bodyCountDelta<=3);
 const begin=Date.now(),source=blueprint.level,partition=retileWholeBoard(source,runtime,{seed,maxNodes:4000,maxTransitions:8000,
  bodyCount:source.blocks.length+bodyCountDelta,irregular:false,minimumIrregular:0,fixedBlocks:blueprint.fixedBlocks,
  forbiddenFootprints:blueprint.changedBodies.map(bodyFootprint)});
 if(!partition.ok)return{ok:false,status:'STATIC_PARTITION_REJECTED',partition,completeInput:false,searchPerformed:false};
 const fixed=new Map(blueprint.fixedBlocks.map(b=>[bodyFootprint(b),b]));let changedIndex=0;
 // This is a partial geometry frame: changed colours and all gates are absent.
 // It is never a red placeholder puzzle. The first actual full world is paid
 // inside colourLatePrefix immediately before its final physical assignment.
 const accounting=(paint=null)=>({version:'late-region-static-construction-v1',completeWorldReservations:paint?.accounting.completeWorldReservations??0,
  microStates:paint?.accounting.microStates??0,transitions:partition.transitions+(paint?.accounting.transitions??0),elapsedMilliseconds:Date.now()-begin});
 let level={...structuredClone(source),gates:[],blocks:partition.blocks.map(b=>fixed.has(bodyFootprint(b))?structuredClone(fixed.get(bodyFootprint(b))):
  {...b,id:blueprint.changedBodies[changedIndex++]?.id??`late-${seed}-${changedIndex}`})};
 assert(level.blocks.some(b=>b.color===undefined));
 const oldF=designFingerprints(source),newF={shapeSha256:designFingerprints(level).shapeSha256};
 const partialStock=structuredClone(level),stockFingerprints=newF;
 const rejected=(status,details={})=>({ok:false,status,partition,partialStock,stockFingerprints,constructionAccounting:accounting(details.paint),completeInput:false,searchPerformed:false,...details});
 let paint=null;
 try{
 if(oldF.shapeSha256===newF.shapeSha256)return rejected('STATIC_SHAPE_INVENTORY_UNCHANGED');
 if(forbiddenShapeHashes.includes(newF.shapeSha256))return rejected('STATIC_PREVIOUS_STOCK_SHAPE_REJECTED');
 const oldFootprints=new Set(source.blocks.map(bodyFootprint)),newFootprints=new Set(level.blocks.map(bodyFootprint));
 const changedOld=source.blocks.filter(b=>!newFootprints.has(bodyFootprint(b))),changedNew=level.blocks.filter(b=>!oldFootprints.has(bodyFootprint(b)));
 assert.equal(sortedCells(changedOld.flatMap(absoluteCells)),sortedCells(blueprint.region.cells));
 assert.equal(sortedCells(changedNew.flatMap(absoluteCells)),sortedCells(blueprint.region.cells));
 const parentSimilarity=compareLayouts(level,source).footprintSimilarity;
 if(parentSimilarity>.65)return rejected('STATIC_PARENT_NEAR',{parentSimilarity});
 const geometryAudit=geometryFilter?.(level)??null;
 if(geometryAudit&&!geometryAudit.passed)return rejected('STATIC_GEOMETRY_FILTER',{geometryAudit});
 paint=colourLatePrefix(level,runtime,{seed:colourSeed,maxNodes:3000,maxTransitions:6000,maxMicroStates:100000,maxMicroTransitions:400000,maxMilliseconds:2000,
  paletteSize:8,mappedPrefix:mappedLatePrefix(blueprint),fixedBodyColours:Object.fromEntries(blueprint.fixedBlocks.map(b=>[b.id,b.color])),
  forbiddenBodyColours:{[blueprint.changedBodies[0].id]:[blueprint.changedBodies[0].color]}});
 const actualFull=paint.firstFullWorld?{...level,blocks:paint.firstFullWorld.blocks,gates:paint.firstFullWorld.gates}:null;
 const fullFields=actualFull?{level:actualFull,levelSha256:levelSha256(actualFull),sourceLevelId:blueprint.sourceLevelId,
  prefixDrags:blueprint.prefixDrags,prefixSha256:routeSha256(blueprint.prefixDrags),formedFirstActualFull:true,firstFullIsTerminal:true}:{};
 if(!paint.ok)return rejected('STATIC_COLOUR_REJECTED',{paint,...fullFields});
 assert(actualFull,'Successful paint must have a retained first complete gate/shape/colour assignment');
 level=actualFull;
 try{
 for(const block of blueprint.fixedBlocks)assert.deepEqual(level.blocks.find(b=>b.id===block.id),block,'Every external body field preserved');
 const f=designFingerprints(level);assert.notEqual(f.shapeSha256,oldF.shapeSha256);assert.notEqual(f.colorSha256,oldF.colorSha256);
 const sharedNew=level.blocks.find(b=>b.id===blueprint.changedBodies[0].id);assert(sharedNew&&sharedNew.color!==blueprint.changedBodies[0].color);
 const inventory=inventorySummary(level,runtime);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);
 return{ok:true,completeInput:true,status:'NEW_STATIC_LATE_REGION_INPUT_NO_U_OR_L',formedFirstActualFull:true,firstFullIsTerminal:true,level,levelSha256:levelSha256(level),
  sourceLevelId:blueprint.sourceLevelId,prefixDrags:blueprint.prefixDrags,prefixSha256:routeSha256(blueprint.prefixDrags),inventory,
  constructionAccounting:accounting(paint),
  provenance:{version:LATE_REGION_VERSION,reference:blueprint.reference,referenceLevelSha256:blueprint.referenceLevelSha256,
   referenceRouteSha256:blueprint.referenceRouteSha256,region:blueprint.region,seed,colourSeed,bodyCountDelta,
   allExternalBodiesByteEquivalent:true,newShapeInventory:true,realSharedBodyRecoloured:sharedNew.id,sourceMaskRetained:true,
   prefixFacts:blueprint.prefixFacts,knownPrefixIsNotLowerBound:true,originalSuffixNotReusedAsNewWitness:true},
  partition,paint,partialStock,stockFingerprints:f,parentSimilarity,geometryAudit,L:null,U:null,accepted:false,formalReady:false,searchPerformed:false};
 }catch(error){return rejected('STATIC_FIRST_FULL_POSTCHECK_TERMINAL',{paint,...fullFields,reason:error.message});}
 }catch(error){const full=paint?.firstFullWorld?{...partialStock,blocks:paint.firstFullWorld.blocks,gates:paint.firstFullWorld.gates}:null;
  return rejected('STATIC_POST_PARTIAL_OR_FIRST_FULL_TERMINAL',{paint,reason:error.message,...full?{level:full,levelSha256:levelSha256(full),sourceLevelId:blueprint.sourceLevelId,
   prefixDrags:blueprint.prefixDrags,prefixSha256:routeSha256(blueprint.prefixDrags),formedFirstActualFull:true,firstFullIsTerminal:true}:{}});}
}

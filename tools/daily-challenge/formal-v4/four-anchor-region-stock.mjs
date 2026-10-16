import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {retileWholeBoard,boardCells,bodyFootprint,absoluteCells,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {fixedGateColourRuntime,assertFixedGateRegionBlueprint} from './first-clear-plain-stock.mjs';
import {mappedLatePrefix} from './late-region-gate-aware-factory.mjs';
import {colourLatePrefixGateAware,gateAwareExitPose} from './late-prefix-gate-aware-colouring.mjs';
import {createEarlyStockMeter} from './early-six-task-factory.mjs';

export const FOUR_ANCHOR_REGION_VERSION='source10-four-anchor-sparse-opening-chain-plain-stock-v1';
export const SPARSE_DECLARATION=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/source10-four-anchor-opening-readonly-01.json',sha256:'315f7338ebc781f692777d6dd5f9214590b67006fe4ebf93331b687d8d9f2f25'});
const key=p=>p.join(','),copy=structuredClone,sha=b=>createHash('sha256').update(b).digest('hex');
const points=ps=>JSON.stringify(ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const body=b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color});
function connected(cells){const all=new Set(cells.map(key)),seen=new Set([key(cells[0])]),queue=[cells[0]];
 for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(all.has(key(p))&&!seen.has(key(p))){seen.add(key(p));queue.push(p);}return seen.size===all.size;}

/** Sparse occupancy arithmetic only. Unspecified cells stay occupied; this
 * does not create a complete candidate, run a PuzzleModel, or certify U/L. */
export function assertFourAnchorOpeningChain(rt,bp,{anchorBlocks,authoredOpeningChain,qualificationOnly=false}){
 assert.equal(typeof qualificationOnly,'boolean');assertFixedGateRegionBlueprint(rt,bp);assert.equal(bp.iceCount??0,0);
 assert(Array.isArray(anchorBlocks)&&anchorBlocks.length===4);
 assert(Array.isArray(authoredOpeningChain)&&authoredOpeningChain.length===4);
 assert.deepEqual(authoredOpeningChain.map(d=>Boolean(d.exitSide)),[true,false,false,true]);
 assert.equal(bp.prefixDrags.length,1);const first=bp.prefixDrags[0];assert(first.exitSide&&first.path.length===0);
 const source=bp.level,firstBody=bp.fixedBlocks.find(b=>b.id===first.blockId);assert(firstBody);
 assert(source.gates.some(g=>g.color===firstBody.color&&g.side===first.exitSide&&gateAwareExitPose(firstBody,g,source)));
 let declarationBinding=null;
 if(!qualificationOnly){assert.equal(bp.sourceLevelId,10,'Only the declared source 10 motif is open');
  const bytes=readFileSync(SPARSE_DECLARATION.path);assert.equal(sha(bytes),SPARSE_DECLARATION.sha256);const row=JSON.parse(bytes);
  assert.equal(row.sourceLevelId,bp.sourceLevelId);assert.deepEqual(bp.reference,row.reference);
  const referenceBytes=readFileSync(row.reference.path);assert.equal(sha(referenceBytes),row.reference.sha256);
  const reference=JSON.parse(referenceBytes);assert.equal(levelSha256(source),levelSha256(reference.level));
  assert.equal(bp.referenceLevelSha256,levelSha256(source));assert.deepEqual(bp.fixedBlocks,row.fixedBlocks);assert.deepEqual(source.gates,row.fixedGates);
  assert.deepEqual(bp.changedBodies.map(b=>b.id),row.changedBodyIds);assert.deepEqual(bp.prefixDrags,row.referencePrefix);
  assert.equal(points(bp.region.cells),points(row.region.cells));assert.deepEqual(anchorBlocks,row.anchorBlocks.map(body));
  assert.deepEqual(authoredOpeningChain,row.authoredOpeningChain);declarationBinding=SPARSE_DECLARATION;}
 const board=new Set(boardCells(source).map(key)),region=new Set(bp.region.cells.map(key)),old=new Set(source.blocks.map(bodyFootprint));
 const ids=new Set(source.blocks.map(b=>b.id)),anchorCells=new Set();
 for(const a of anchorBlocks){assert.deepEqual(Object.keys(a).sort(),['color','id','shape','x','y']);assert(!ids.has(a.id));ids.add(a.id);
  assert(Number.isSafeInteger(a.x)&&Number.isSafeInteger(a.y));const w=1+Math.max(...a.shape.map(p=>p[0])),h=1+Math.max(...a.shape.map(p=>p[1]));
  assert(a.shape.length<=6&&a.shape.length===w*h&&new Set(a.shape.map(key)).size===w*h);
  assert(a.shape.every(p=>p.length===2&&p.every(Number.isSafeInteger)&&p.every(n=>n>=0)));
  const m=rt.matchFormalBlockShape(a.shape,'native-only');assert.equal(m?.quarterTurns,0);assert(rt.GAME_ART.gameplay.formalBlocks[a.color]?.solid?.[m.shapeId]);
  assert(Object.values(rt.GAME_ART.gameplay.formalBlocks).filter(c=>c.solid?.[m.shapeId]).length>=4);
  assert(!old.has(bodyFootprint(a)),'A new anchor cannot copy an original footprint');
  for(const p of absoluteCells(a)){assert(region.has(key(p))&&!anchorCells.has(key(p)));anchorCells.add(key(p));}
  assert(!source.gates.some(g=>g.color===a.color&&gateAwareExitPose(a,g,source)),'No anchor may clear before the reference prefix');}
 const known=[...bp.fixedBlocks,...anchorBlocks];for(let i=0;i<known.length;i++)for(let j=i+1;j<known.length;j++)if(known[i].color===known[j].color)
  assert(!absoluteCells(known[i]).some(([x,y])=>absoluteCells(known[j]).some(([xx,yy])=>Math.abs(x-xx)+Math.abs(y-yy)===1)),'Known same-colour neighbours');
 const empty=new Set(absoluteCells(firstBody).map(key)),positions=new Map(anchorBlocks.map(a=>[a.id,{x:a.x,y:a.y}])),parkingPoses={},openingColours={},trace=[];
 let clears=0,parking=0,transitions=0;
 for(const [di,d]of authoredOpeningChain.entries()){assert.deepEqual(Object.keys(d).sort(),(d.exitSide?['blockId','exitSide','path']:['blockId','path']).sort());
  const a=anchorBlocks.find(a=>a.id===d.blockId);assert(a&&positions.has(a.id));assert(Array.isArray(d.path)&&d.path.length>0);
  let p=positions.get(a.id);(parkingPoses[a.id]??=[]).push([p.x,p.y]);
  for(const [i,next]of d.path.entries()){assert(next.length===2&&next.every(Number.isSafeInteger));assert.equal(Math.abs(next[0]-p.x)+Math.abs(next[1]-p.y),1);
   const previous=absoluteCells({...a,...p}),target=absoluteCells({...a,x:next[0],y:next[1]}),available=new Set([...empty,...previous.map(key)]);
   assert(target.every(c=>board.has(key(c))&&available.has(key(c))),'Sparse chain needs an occupied, unspecified cell');
   previous.forEach(c=>empty.add(key(c)));target.forEach(c=>empty.delete(key(c)));p={x:next[0],y:next[1]};positions.set(a.id,p);transitions++;
   const gates=source.gates.filter(g=>g.color===a.color&&gateAwareExitPose({...a,...p},g,source)),exit=Boolean(d.exitSide)&&i===d.path.length-1;
   assert.equal(gates.length,Number(exit),'Unexpected early or absent matching exit');if(exit)assert.equal(gates[0].side,d.exitSide);else parkingPoses[a.id].push(next);}
  if(d.exitSide){assert(di===0||di===authoredOpeningChain.length-1);absoluteCells({...a,...p}).forEach(c=>empty.add(key(c)));positions.delete(a.id);openingColours[a.id]=a.color;clears++;}else parking++;
  trace.push({drag:copy(d),emptyCells:[...empty].map(s=>s.split(',').map(Number))});}
 assert.equal(clears,2);assert.equal(parking,2);const cells=[...empty].map(s=>s.split(',').map(Number));assert(connected(cells));
 assert(cells.length>=7&&cells.some(([x,y])=>[[x+1,y],[x,y+1],[x+1,y+1]].every(p=>empty.has(key(p)))),'Third clear must expose a real 2x2 space');
 const remaining=bp.region.cells.filter(p=>!anchorCells.has(key(p)));assert(remaining.length&&connected(remaining));
 return{valid:true,metadataOnly:true,modelReplayPerformed:false,fullUValidated:false,isLowerBound:false,declarationBinding,
  referencePrefixDrags:copy(bp.prefixDrags),authoredOpeningChain:copy(authoredOpeningChain),prefixDrags:[...copy(bp.prefixDrags),...copy(authoredOpeningChain)],
  anchorBlocks:copy(anchorBlocks),parkingPoses,openingColours,trace,clearEvents:3,nonClearingDrags:parking,coordinateTransitions:transitions,remainingRegionCells:remaining};
}

/** Only uncoloured region enumeration and one old colour CSP. Complete
 * assignment reservations use the frozen meter; no model validation is run
 * here. The sole later U task must validate the authored combined prefix. */
export function constructFourAnchorRegionStock(rt,bp,{anchorBlocks,authoredOpeningChain,seed,colourSeed=seed,bodyCountDelta=0,shapeProfile,
 forbiddenShapeHashes=[],geometryFilter=null,qualificationOnly=false,meterLimits={}}={}){
 assert(Number.isSafeInteger(seed)&&Number.isSafeInteger(colourSeed));assert(Number.isSafeInteger(bodyCountDelta)&&bodyCountDelta>=-2&&bodyCountDelta<=3);
 assert(['balanced','bar-mix','axial-bars'].includes(shapeProfile));const meter=createEarlyStockMeter(meterLimits);
 const openingChain=assertFourAnchorOpeningChain(rt,bp,{anchorBlocks,authoredOpeningChain,qualificationOnly});meter.partitionTransitions(openingChain.coordinateTransitions);
 const source=bp.level,bodyCount=bp.changedBodies.length+bodyCountDelta;assert(bodyCount>anchorBlocks.length);
 const geometryProblem={...source,playable:bp.region.cells,blocked:[],blocks:bp.changedBodies};
 const partition=retileWholeBoard(geometryProblem,rt,{seed,maxNodes:4000,maxTransitions:8000,bodyCount,irregular:false,minimumIrregular:0,
  shapeProfile,fixedBlocks:anchorBlocks,forbiddenFootprints:bp.changedBodies.map(bodyFootprint)});meter.partitionTransitions(partition.transitions??0);
 const partitionScope={kind:'uncoloured-region-exact-cover-only',notGameplayLevel:true,shapeProfile,cells:bp.region.cells,regionBodyCount:bodyCount,
  retainedBodies:bp.fixedBlocks.length,newAnchorBodies:anchorBlocks.length,finalBodyCount:bp.fixedBlocks.length+bodyCount,originalBoardMaskUnchanged:true};
 const accounting=()=>{const a=meter.snapshot();return{version:'late-region-static-construction-v1',completeWorldReservations:a.completeWorldReservations,
  transitions:a.transitions,microStates:a.microStates,elapsedMilliseconds:a.elapsedMilliseconds};};
 let paint=null,level=null,placeholderWorld=null;
 const rejected=(status,extra={})=>({ok:false,status,qualificationOnly,partition,partitionScope,openingChain,placeholderWorld,paint,level,
  stockFingerprints:placeholderWorld?designFingerprints(placeholderWorld):null,enteredColourCsp:paint!==null,constructionAccounting:accounting(),searchPerformed:false,...extra});
 if(!partition.ok)return rejected('STATIC_PARTITION_REJECTED');
 try{assert.equal(partition.blocks.length,bodyCount);assert.equal(points(partition.blocks.flatMap(absoluteCells)),points(bp.region.cells));
  meter.reserveWorld('placeholderWorldReservations');const anchors=new Map(anchorBlocks.map(b=>[bodyFootprint(b),b]));
  const used=new Set([...source.blocks,...anchorBlocks].map(b=>b.id));let serial=0,ordinary=0;
  const newId=()=>{let id;do{id=`opening-${seed}-${++serial}`;}while(used.has(id));used.add(id);return id;};
  // This remains one charged placeholder world, with declared anchor colours.
  level={...copy(source),blocks:[...copy(bp.fixedBlocks),...partition.blocks.map(b=>anchors.has(bodyFootprint(b))?copy(anchors.get(bodyFootprint(b))):
   {...b,id:bp.changedBodies[ordinary++]?.id??newId(),color:'red'})]};placeholderWorld=level;
  const oldF=designFingerprints(source),f=designFingerprints(level);if(f.shapeSha256===oldF.shapeSha256)return rejected('STATIC_SHAPE_INVENTORY_UNCHANGED');
  if(forbiddenShapeHashes.includes(f.shapeSha256))return rejected('STATIC_SAME_SOURCE_BRANCH_SHAPE_REJECTED');
  const oldFootprints=new Set(source.blocks.map(bodyFootprint)),newFootprints=new Set(level.blocks.map(bodyFootprint));
  assert.equal(points(source.blocks.filter(b=>!newFootprints.has(bodyFootprint(b))).flatMap(absoluteCells)),points(bp.region.cells));
  assert.equal(points(level.blocks.filter(b=>!oldFootprints.has(bodyFootprint(b))).flatMap(absoluteCells)),points(bp.region.cells));
  assert.equal(points(level.blocks.flatMap(absoluteCells)),points(boardCells(source)));
  if(compareLayouts(level,source).footprintSimilarity>.65)return rejected('STATIC_PARENT_NEAR');
  const geometryAudit=geometryFilter?.(level)??null;if(geometryAudit&&!geometryAudit.passed)return rejected('STATIC_GEOMETRY_FILTER',{geometryAudit});
  const refMap=mappedLatePrefix(bp),mapped={...refMap,openingColours:{...refMap.openingColours,...openingChain.openingColours},
   parkingPoses:{...refMap.parkingPoses,...openingChain.parkingPoses},preservedGates:copy(source.gates)};
  paint=colourLatePrefixGateAware(level,fixedGateColourRuntime(rt,source.gates),{seed:colourSeed,...meter.paintLimits(),paletteSize:source.gates.length,mappedPrefix:mapped,
   fixedBodyColours:Object.fromEntries([...bp.fixedBlocks,...anchorBlocks].map(b=>[b.id,b.color])),
   forbiddenBodyColours:{[bp.changedBodies[0].id]:[bp.changedBodies[0].color]}});meter.importPaint(paint);meter.guard();
  if(!paint.ok)return rejected('STATIC_COLOUR_REJECTED');
  assert.equal(paint.gates.length,source.gates.length);for(const g of source.gates)assert.deepEqual(paint.gates.find(x=>x.color===g.color),g);
  paint.gates=copy(source.gates);level={...level,blocks:paint.blocks,gates:paint.gates};
  for(const b of [...bp.fixedBlocks,...anchorBlocks])assert.deepEqual(level.blocks.find(x=>x.id===b.id),b);
  assert.equal(points(boardCells(level)),points(boardCells(source)));assert.equal(points(level.blocks.flatMap(absoluteCells)),points(boardCells(source)));
  for(let i=0;i<level.blocks.length;i++)for(let j=i+1;j<level.blocks.length;j++)if(level.blocks[i].color===level.blocks[j].color)
   assert(!absoluteCells(level.blocks[i]).some(([x,y])=>absoluteCells(level.blocks[j]).some(([xx,yy])=>Math.abs(x-xx)+Math.abs(y-yy)===1)));
  const finalF=designFingerprints(level);assert.notEqual(finalF.shapeSha256,oldF.shapeSha256);assert.notEqual(finalF.colorSha256,oldF.colorSha256);
  const recoloured=level.blocks.find(b=>b.id===bp.changedBodies[0].id);assert(recoloured&&recoloured.color!==bp.changedBodies[0].color);
  const inventory=inventorySummary(level,rt);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);const assetBindings={};
  for(const b of level.blocks){const m=rt.matchFormalBlockShape(b.shape,'native-only');assert.equal(m?.quarterTurns,0);
   const f='public/'+rt.GAME_ART.gameplay.formalBlocks[b.color].solid[m.shapeId].replace(/^\//,'');assetBindings[f]=sha(readFileSync(f));}
  meter.guard();return{ok:true,status:'NEW_FOUR_ANCHOR_PLAIN_INPUT_NO_U_OR_L',qualificationOnly,level,levelSha256:levelSha256(level),sourceLevelId:bp.sourceLevelId,
   placeholderWorld,partition,partitionScope,paint,openingChain,inventory,assetBindings,geometryAudit,constructionAccounting:accounting(),
   referencePrefixDrags:copy(bp.prefixDrags),authoredOpeningChain:copy(authoredOpeningChain),prefixDrags:openingChain.prefixDrags,prefixSha256:routeSha256(openingChain.prefixDrags),
   provenance:{version:FOUR_ANCHOR_REGION_VERSION,reference:bp.reference,referenceLevelSha256:bp.referenceLevelSha256,region:bp.region,
    seed,colourSeed,bodyCountDelta,shapeProfile,anchorBlocks:copy(anchorBlocks),sourceMaskRetained:true,allExternalBodiesByteEquivalent:true,
    allReferenceGatesByteEquivalentIncludingArrayOrder:true,newShapeInventory:true,realSharedBodyRecoloured:recoloured.id,
    referencePrefixUnchanged:true,authoredChainIsNotReferenceEvidence:true,knownPrefixIsNotLowerBound:true,modelValidationDeferredToSoleUpperTask:true},
   stockFingerprints:finalF,enteredColourCsp:true,searchPerformed:false,newSearches:0,newModelCalls:0,L:null,U:null,accepted:false,catalogEligible:false,formalReady:false};
 }catch(error){return rejected('STATIC_OPENING_CHAIN_REJECTED',{reason:error.message});}
}

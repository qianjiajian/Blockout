import assert from 'node:assert/strict';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';
import {assertNativeBatchRecipe,descriptor,integer} from './native-batch-contract.mjs';
import {assertLowBandBatchRecipe} from './low-band-batch-contract.mjs';

export const REPLACED_IRREGULAR_BLUEPRINT_VERSION='early-clear-fully-replaced-q0-irregular-reference-v1';
export const PLAIN_TARGET_ENTRIES=Object.freeze({
 2:Object.freeze({path:'tools/daily-challenge/formal-v4/prefix-tail-low-band-task.mjs',floor:21,upper:30}),
 3:Object.freeze({path:'tools/daily-challenge/formal-v4/prefix-tail-explore-task.mjs',floor:31,upper:null})
});
const cellsKey=cells=>cells.map(p=>{assert(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger));return p.join(',');}).sort();

/** Pure metadata: no file reads, runtime/model replay, stock, CSP or ledger.
 * The caller must verify the reference descriptor bytes, its original proof,
 * complete route and prefix in both models before any actual construction.
 * referenceBand describes that original receipt; the new target is independent.
 */
export function makeReplacedIrregularBlueprint(runtime,reference,recipe){
 descriptor(recipe.reference);integer(recipe.sourceLevelId,1,200);
 assert([2,3].includes(recipe.referenceBand));assert([2,3].includes(recipe.finalTargetDifficulty));
 assert.equal(reference.accepted,true);integer(reference.L,1,Number.MAX_SAFE_INTEGER);integer(reference.U,reference.L,Number.MAX_SAFE_INTEGER);
 if(recipe.referenceBand===2)assert(reference.L>=21&&reference.U<=30,'Reference is not a D2 certificate');
 else assert(reference.L>=31,'Reference is not a D3 certificate');
 const original=reference.level,drags=reference.drags;
 assert.equal(recipe.sourceLevelId,reference.sourceLevelId??original.id);assert.equal(original.id,recipe.sourceLevelId);
 assert.equal(reference.levelSha256,levelSha256(original));assert.equal(recipe.referenceLevelSha256,reference.levelSha256);
 assert(Array.isArray(drags)&&drags.length>0);assert.equal(recipe.referenceRouteSha256,routeSha256(drags));
 const ids=new Set(original.blocks.map(b=>b.id));assert.equal(ids.size,original.blocks.length);
 for(const d of drags){assert(ids.has(d.blockId));assert(Array.isArray(d.path));cellsKey(d.path);if(d.exitSide)assert(['top','bottom','left','right'].includes(d.exitSide));}
 assert.equal(drags.filter(d=>!d.exitSide).length,reference.U,'Provided route parking metadata must equal reference U');
 const cut=recipe.cut;integer(cut,1,drags.length);integer(recipe.clearCount,1,5);
 assert(drags[cut-1].exitSide,'Cut must end exactly on a clear');
 const clearCount=drags.slice(0,cut).filter(d=>d.exitSide).length;assert.equal(clearCount,recipe.clearCount,'Cut must end on its declared first-to-fifth clear');
 integer(recipe.seed,1,2**32-1);integer(recipe.colourSeed,1,2**32-1);integer(recipe.bodyCountDelta,-2,3);
 assert.equal(recipe.maximumStocks,1);integer(recipe.maximumStaticPartitionAttempts,1,2000);
 assert(typeof recipe.branchId==='string'&&recipe.branchId.length>0);assert(typeof recipe.recipeId==='string'&&/^[a-z0-9-]+$/.test(recipe.recipeId));
 assertPlainProofDomain(original);
 const source=runtime.LEVELS.find(x=>x.id===recipe.sourceLevelId);assert(source,'A real mainline source object is required');
 assert.equal(boardBaselineSha256(original),boardBaselineSha256(source),'Reference must retain the normal source board');
 const all=original.blocks.flatMap(absoluteCells),board=boardCells(original);
 assert.deepEqual(cellsKey(all),cellsKey(board),'Full original playable mask must be covered');assert.equal(new Set(cellsKey(all)).size,all.length);
 assert(Array.isArray(recipe.regionBodyIds)&&recipe.regionBodyIds.length);const declaredChanged=new Set(recipe.regionBodyIds);
 const nativeAssetPaths=[],irregularBodyIds=[];
 for(const b of original.blocks){
  const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));
  assert.equal(new Set(cellsKey(b.shape)).size,b.shape.length,'Original shape cells must be unique');
  if(b.shape.length!==w*h){assert(declaredChanged.has(b.id),'Every original irregular body must be wholly replaced');irregularBodyIds.push(b.id);}
  const match=runtime.matchFormalBlockShape(b.shape,'native-only');assert(match&&match.quarterTurns===0);
  const asset=runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId];assert(typeof asset==='string'&&asset.length,'Real native artwork mapping required');
  nativeAssetPaths.push(asset);
 }
 assert.equal(new Set(original.gates.map(g=>g.color)).size,original.gates.length,'Fixed-gate factory needs one preserved gate per colour');
 assert(Array.isArray(recipe.regionBodyIds)&&recipe.regionBodyIds.length);const changedIds=new Set(recipe.regionBodyIds);assert.equal(changedIds.size,recipe.regionBodyIds.length);
 const changedBodies=original.blocks.filter(b=>changedIds.has(b.id));assert.equal(changedBodies.length,changedIds.size,'Unknown region body');
 const fixedBlocks=original.blocks.filter(b=>!changedIds.has(b.id)),prefixDrags=drags.slice(0,cut),cells=changedBodies.flatMap(absoluteCells);
 const newBodyCount=changedBodies.length+recipe.bodyCountDelta;assert(newBodyCount>0&&newBodyCount<=cells.length&&newBodyCount*6>=cells.length,'Declared new region inventory cannot cover its area');
 if(recipe.regionCells!==undefined)assert.deepEqual(cellsKey(recipe.regionCells),cellsKey(cells),'Declared region must equal complete original bodies');
 const blueprint={version:REPLACED_IRREGULAR_BLUEPRINT_VERSION,recipeId:recipe.recipeId,branchId:recipe.branchId,sourceLevelId:recipe.sourceLevelId,
  reference:structuredClone(recipe.reference),referenceBand:recipe.referenceBand,referenceL:reference.L,referenceU:reference.U,
  referenceLevelSha256:reference.levelSha256,referenceRouteSha256:recipe.referenceRouteSha256,sourceLevelSha256:levelSha256(source),
  targetDifficulty:recipe.finalTargetDifficulty,finalTargetDifficulty:recipe.finalTargetDifficulty,iceCount:0,cut,clearCount,
  seed:recipe.seed,colourSeed:recipe.colourSeed,bodyCountDelta:recipe.bodyCountDelta,maximumStocks:1,maximumStaticPartitionAttempts:recipe.maximumStaticPartitionAttempts,
  level:structuredClone(original),changedBodies:structuredClone(changedBodies),fixedBlocks:structuredClone(fixedBlocks),allReferenceGates:structuredClone(original.gates),
  normalBoardArea:board.length,normalDimensions:[original.width,original.height],boardOutlineSha256:boardBaselineSha256(source),
  region:{cells,bodyIds:changedBodies.map(b=>b.id),area:cells.length,fraction:cells.length/board.length,originalBodyCount:changedBodies.length,connected:true},
  prefixDrags:structuredClone(prefixDrags),prefixSha256:routeSha256(prefixDrags),prefixFacts:{drags:cut,parking:prefixDrags.filter(d=>!d.exitSide).length,clears:clearCount},
  endsAtDeclaredClear:true,allowedClearCountRange:[1,5],preserveAllReferenceGatesInOriginalOrder:true,futureMathematics:{...PLAIN_TARGET_ENTRIES[recipe.finalTargetDifficulty]},
  referenceGeometryDomain:{changedMayBeNativeIrregular:true,retainedRectanglesOnly:true,finalRectanglesOnly:true,irregularBodyIds},
  metadataOnly:true,referenceDescriptorBytesVerified:false,referenceReplayRequiredBeforeConstruction:true,referencePrefixReplayRequiredBeforeConstruction:true,
  nativeAssetPaths:[...new Set(nativeAssetPaths)],assetBytesVerified:false,sourceBindingRequiredBeforeConstruction:true,
  knownReferenceOnly:true,referenceMathematicsTransferred:false,newCandidateRouteNotClaimed:true,prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true,
  newShapeAndColourRequired:true,latestHistoryAndDiversityRequiredBeforeConstruction:true,searchPerformed:false,accepted:false,catalogEligible:false,formalReady:false};
 // Existing validators check complete-body union, unique occupancy, prefix
 // untouched bodies and real >=35% connectivity, independent of reference L.
 (recipe.finalTargetDifficulty===2?assertLowBandBatchRecipe:assertNativeBatchRecipe)(blueprint);
 return blueprint;
}

/** Same complete canonical/deferred witness and unit-prefix audit as the
 * frozen explicit recipe builders; only the original changed-body domain differs.
 * This validates an already provided reference route, never searches for one.
 */
export function qualifyReplacedIrregularReference(runtime,reference,recipe){
 const bp=makeReplacedIrregularBlueprint(runtime,reference,recipe),level=reference.level;
 const actual=replayDecorated(runtime,level,reference.drags),independent=independentReplay(runtime,level,reference.drags);
 for(const r of [actual,independent])assert(r.valid&&r.complete&&!r.failed);
 assert.equal(actual.nonClearingDrags,reference.U);assert.equal(independent.nonClearingDrags,reference.U);
 let partial=structuredClone(level);const prefixAudits=[];
 for(const drag of bp.prefixDrags){const a=auditPlainForwardDrag(runtime,partial,drag);assert(a.valid,a.error);
  if(prefixAudits.length)assert.equal(a.beforeBodiesSha256,prefixAudits.at(-1).afterBodiesSha256);prefixAudits.push(a);
  if(drag.exitSide)partial.blocks=partial.blocks.filter(b=>b.id!==drag.blockId);
  else if(drag.path.length){const b=partial.blocks.find(b=>b.id===drag.blockId);[b.x,b.y]=drag.path.at(-1);}}
 bp.referenceQualification={canonical:actual,independent,prefixAudits,searchPerformed:false};
 return bp;
}

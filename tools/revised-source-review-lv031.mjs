import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { digest } from './revised-preview-validation-v160.mjs';

export const REVIEW31='.codex-temp/strict-alignment-v180/source-readiness-31-200/source-review-lv031.json';
export const REVIEW31_SHA='901e62bb826a131c8294122d97a9b2a45c4d641e8d049b5f6c0da4e119f3c5c8';

/** Explicitly reviewed Lv31 only. Missing families cannot be assumed absent. */
export async function loadReviewed31Source(root=process.cwd()) {
  const bytes=await readFile(path.resolve(root,REVIEW31));assert.equal(digest(bytes),REVIEW31_SHA,'Lv31 source review drift');
  const review=JSON.parse(bytes),bindings={[REVIEW31]:{sha256:REVIEW31_SHA}};
  assert.equal(review.levelId,31);assert.equal(review.ruleVersion,'1.8.0');
  for(const [p,sha256] of Object.entries(review.bindings)) {
    assert.equal(digest(await readFile(path.resolve(root,p))),sha256,`Lv31 evidence drift: ${p}`);bindings[p]={sha256};
  }
  assert.equal(Object.keys(review.sourceInventory).length,15,'Explicit 15 mechanism observations');
  for(const family of Object.values(review.sourceInventory)) {
    assert(Number.isInteger(family.count)&&family.reason&&family.evidencePaths.length,'Explicit observed count required');
    for(const p of family.evidencePaths)assert(bindings[p],'Observation evidence must be bound');
  }
  for(const family of ['generators','axisBlocks','keyLocks','starBlocks','flipDoors','coloredGrids','bombs','covers','lifts','irregularBlocks','irregularBoard','shells'])
    assert.equal(review.sourceInventory[family].count,0,`Positive/unknown ${family} requires a reviewed adapter`);
  const facts=review.sourceNormalizedFacts,m=facts.mechanisms;
  assert.equal(m.numericIce.postMeltShellCount,0);
  const sourceContract={levelId:31,referenceId:REVIEW31,sha256:REVIEW31_SHA,seed:'reviewed-lv031-exit-repair-v180',
    width:facts.width,height:facts.height,openingBlockCount:facts.opening,fullBlockCount:facts.full,originalMask:review.sourceBoard.cells,
    mechanisms:{generatorQueueLengths:[],axisHorizontalBlocks:0,axisVerticalBlocks:0,keyGroups:[],starBlocks:0,flipDoorInitialOpen:[],
      coloredGridCellCounts:[],bombSeconds:[],shutterClearCounts:[],shutterHiddenBatchCounts:[],liftCount:0,liftHiddenBatchCounts:[],
      numericIceValues:m.numericIce.values,shellBlocks:0,
      exits:[...Array.from({length:m.exits.ordinaryCount},()=>({kind:'ordinary',frozen:0,star:false})),
        ...m.exits.frozenValues.map(frozen=>({kind:'ordinary',frozen,star:false}))]}};
  return{bindings,source:{levelId:31,facts,sourceContract,board:review.sourceBoard,
    sourceFacts:{numericIce:{items:m.numericIce.values.map(value=>({value,post_melt_shell:false}))}},
    sourceFrames:review.evidence,sourceFrame:review.evidence[0].path}};
}

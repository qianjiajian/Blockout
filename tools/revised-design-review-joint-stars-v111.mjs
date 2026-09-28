import assert from 'node:assert/strict';
import {auditJointStarSource as auditJointCurtainSource} from './revised-joint-star-cohorts-v111.mjs';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {digest,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditStrictMechanismAlignment} from './strict-mechanism-alignment-v190.mjs';
import {countIrregularBlockShapes} from './strict-mechanism-alignment-v170.mjs';
import {auditStrictBoardAlignment} from './strict-board-alignment-v170.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {verifyExitOnlyRepair,EXIT_REPAIR_BASELINE,EXIT_REPAIR_BASELINE_SHA} from './revised-exit-repair-review.mjs';

/** Explicit independent-source loader for spatially overlapping source reveal cohorts.
 * The source's individual batch counts stay null; design allocation is separate. */
export async function loadReviewedDesignSource(reviewPath,expectedSha,root=process.cwd()){
 assert.match(expectedSha,/^[a-f0-9]{64}$/i,'Independent review hash required');
 const bytes=await readFile(path.resolve(root,reviewPath));assert.equal(digest(bytes),expectedSha.toLowerCase(),'Source review drift');
 const review=JSON.parse(bytes);auditJointCurtainSource(review);for(const k of ['unresolved','unsupported','blockingIssues','evidenceGaps']){const v=review[k];assert(v==null||(Array.isArray(v)?v.length===0:typeof v==='object'?Object.keys(v).length===0:v===false),`Unresolved source review ${k}`);}const bindings={[reviewPath]:{sha256:expectedSha.toLowerCase()}};
 for(const[p,b]of Object.entries(review.bindings??{})){const sha=typeof b==='string'?b:b.sha256;assert.equal(digest(await readFile(path.resolve(root,p))),sha.toLowerCase(),`Source evidence drift ${p}`);bindings[p]={sha256:sha.toLowerCase()};}
 const f=review.sourceNormalizedFacts,m=f?.mechanisms;
 const names=['generators','axisBlocks','keyLocks','starBlocks','flipDoors','coloredGrids','bombs','covers','lifts','ordinaryExits','irregularBlocks','irregularBoard','frozenExits','numericIce','shells'];
 const sourceInventory=Object.fromEntries(names.map((name,i)=>{
  const id=`M${String(i+1).padStart(2,'0')}`,named=review.sourceInventory?.[name],numbered=review.sourceInventory?.[id];
  assert(!(named&&numbered),'Duplicate mechanism observation aliases');
  const row=named??numbered;if(row?.mechanismId)assert.equal(row.mechanismId,id,'Observation mechanism identity');
  return [name,row];
 }));
 assert(f&&m&&review.levelId>=21&&review.levelId<=200,'Source identity');
 assert.equal(Object.keys(review.sourceInventory??{}).length,15,'Explicit fifteen mechanism observations');
 for(const family of Object.values(sourceInventory)){
  assert(Number.isSafeInteger(family.count)&&family.count>=0&&family.reason&&family.evidencePaths?.length,'Explicit observations, not omitted=>zero');
  for(const p of family.evidencePaths)assert(bindings[p],`Unbound observation ${p}`);
 }
 const observations={generators:m.generators.count,axisBlocks:m.axisBlocks.count,keyLocks:m.keysLocks.keyCount+m.keysLocks.lockCount,
  starBlocks:m.starBlocks.count,flipDoors:m.flipDoors.count,coloredGrids:m.coloredGrid.regionCount,bombs:m.bombs.count,
  covers:m.covers.count,lifts:m.elevators.count,ordinaryExits:m.exits.ordinaryCount,irregularBlocks:m.irregularBlocks.fullCount,
  irregularBoard:review.sourceBoard.kind==='irregular'?1:0,frozenExits:m.exits.frozenCount+m.exits.starFrozenCount,numericIce:m.numericIce.count,shells:m.shells.count};
 for(const[k,n]of Object.entries(observations))assert.equal(sourceInventory[k]?.count,n,`Observation/facts mismatch ${k}`);
 for(const family of ['coloredGrids','bombs','lifts'])assert.equal(sourceInventory[family].count,0,`Positive ${family} needs a reviewed adapter`);
 assert(m.exits.starCount>0);assert.equal(m.exits.starFrozenCount,0);
 assert(!m.exits.overlappingAttributes,'Ice/flip overlap needs explicit physical inventory adapter');
 const sortedNumbers=a=>[...a].sort((a,b)=>a-b);
 const queueLengths=m.generators.queueLengths;
 assert(Array.isArray(queueLengths)&&queueLengths.every(n=>Number.isSafeInteger(n)&&n>0),'Invalid reviewed generator queue lengths');
 assert.equal(queueLengths.length,m.generators.count,'Generator count/queue length mismatch');
 if(sourceInventory.generators.queue_lengths!==undefined)assert.deepEqual(sortedNumbers(sourceInventory.generators.queue_lengths),sortedNumbers(queueLengths),'Generator observation/queue mismatch');
 const groups=m.keysLocks.groups??(m.keysLocks.keyCount===0&&m.keysLocks.lockCount===0?[]:null);
 assert(Array.isArray(groups),'Positive key/lock inventory needs reviewed group associations');
 assert(groups.every(g=>Number.isSafeInteger(g.keyCount)&&g.keyCount>=0&&Array.isArray(g.lockValues)&&g.lockValues.every(n=>Number.isSafeInteger(n)&&n>0)),'Invalid reviewed key group');
 assert.equal(groups.reduce((n,g)=>n+g.keyCount,0),m.keysLocks.keyCount);
 assert.equal(groups.reduce((n,g)=>n+g.lockValues.length,0),m.keysLocks.lockCount);
 assert(Array.isArray(m.keysLocks.lockValues),'Reviewed lock values required');
 assert.deepEqual(sortedNumbers(groups.flatMap(g=>g.lockValues)),sortedNumbers(m.keysLocks.lockValues),'Key groups/lock values mismatch');
 const canonicalGroups=gs=>gs.map(g=>({keyCount:g.keyCount,lockValues:sortedNumbers(g.lockValues)})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const keyObservation=sourceInventory.keyLocks;
 for(const [key,actual]of [['key_count',m.keysLocks.keyCount],['lock_count',m.keysLocks.lockCount]])if(keyObservation[key]!==undefined)assert.equal(keyObservation[key],actual,'Key/lock observation count mismatch');
 if(keyObservation.lock_values!==undefined)assert.deepEqual(sortedNumbers(keyObservation.lock_values),sortedNumbers(m.keysLocks.lockValues),'Lock observation/values mismatch');
 if(keyObservation.groups!==undefined)assert.deepEqual(canonicalGroups(keyObservation.groups),canonicalGroups(groups),'Key observation/group association mismatch');
 const sourceContract={levelId:review.levelId,referenceId:reviewPath,sha256:expectedSha,seed:`source-reviewed-v190-${review.levelId}`,
  width:f.width,height:f.height,openingBlockCount:f.opening,fullBlockCount:f.full,originalMask:review.sourceBoard.cells,
  mechanisms:{generatorQueueLengths:m.generators.queueLengths,axisHorizontalBlocks:m.axisBlocks.axes.filter(a=>a==='horizontal').length,axisVerticalBlocks:m.axisBlocks.axes.filter(a=>a==='vertical').length,
   keyGroups:groups.map(g=>({keyCount:g.keyCount,lockCounts:g.lockValues})),starBlocks:m.starBlocks.count,flipDoorInitialOpen:m.flipDoors.initialStates.map(s=>s==='open'),coloredGridCellCounts:[],bombSeconds:[],
   shutterClearCounts:m.covers.values,shutterHiddenBatchCounts:m.covers.hiddenBatchCounts,liftCount:0,liftHiddenBatchCounts:[],
   numericIceValues:m.numericIce.values,shellBlocks:m.shells.count,
   exits:[...Array.from({length:m.exits.ordinaryCount},()=>({kind:'ordinary',frozen:0,star:false})),
    ...m.exits.frozenValues.map(frozen=>({kind:'ordinary',frozen,star:false})),
    ...Array.from({length:m.exits.starCount},()=>({kind:'ordinary',frozen:0,star:true})),
    ...Array.from({length:m.exits.flipCount},()=>({kind:'flip',frozen:0,star:false}))]}};
 let iceItems=review.sourceFacts?.numericIce?.items??review.numericIceItems;
 if(!iceItems&&m.numericIce.postMeltShellCount===0)iceItems=m.numericIce.values.map(value=>({value,post_melt_shell:false}));
 assert(Array.isArray(iceItems)&&iceItems.length===m.numericIce.count&&iceItems.every(i=>typeof i.post_melt_shell==='boolean'),'Observed ice/shell pairing required');
 const evidence=review.evidence??[];assert(evidence.length&&evidence.every(e=>bindings[e.path]),'Bound reviewed frames');
 for(const e of evidence)assert.equal(e.sha256?.toLowerCase(),bindings[e.path].sha256,'Declared frame hash differs from bound bytes');
 const openingPath=review.stableOpeningEvidence??evidence[0].path;
 assert(evidence.some(e=>e.path===openingPath),'Stable opening frame must be in bound reviewed evidence');
 const baselineBytes=await readFile(path.resolve(root,EXIT_REPAIR_BASELINE));assert.equal(digest(baselineBytes),EXIT_REPAIR_BASELINE_SHA);
 bindings[EXIT_REPAIR_BASELINE]={sha256:EXIT_REPAIR_BASELINE_SHA};
 const existing=JSON.parse(baselineBytes).rows.find(r=>r.levelId===review.levelId);
 return{bindings,source:{levelId:review.levelId,facts:f,sourceContract,board:{...review.sourceBoard,evidence:review.sourceBoard.evidence??expectedSha},
  sourceFacts:{numericIce:{items:iceItems},elevators:{count:0,hiddenBatchCounts:[],items:[]}},jointCurtainSource:review,sourceFrames:evidence,sourceFrame:openingPath,
  preservedIrregular:existing?{...existing.level,evidence:EXIT_REPAIR_BASELINE_SHA}:undefined,
  corrections:review.corrections??[],sourceReviewPath:reviewPath,sourceReviewSha256:expectedSha}};
}

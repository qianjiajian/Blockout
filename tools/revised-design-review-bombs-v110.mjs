import assert from 'node:assert/strict';
import {replayTimedRoute} from './revised-timed-route-v110.mjs';
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

/** Positive-bomb companion. The archived spatial adapter remains unchanged.
 * Every bomb retains observed carrier attributes and a positive-time model witness.
 * This does not certify real Pointer timing, human feasibility, stars or difficulty.
 */
export async function loadReviewedDesignSource(reviewPath,expectedSha,root=process.cwd()){
 assert.match(expectedSha,/^[a-f0-9]{64}$/i,'Independent review hash required');
 const bytes=await readFile(path.resolve(root,reviewPath));assert.equal(digest(bytes),expectedSha.toLowerCase(),'Source review drift');
 const review=JSON.parse(bytes);for(const k of ['unresolved','unsupported','blockingIssues','evidenceGaps']){const v=review[k];assert(v==null||(Array.isArray(v)?v.length===0:typeof v==='object'?Object.keys(v).length===0:v===false),`Unresolved source review ${k}`);}const bindings={[reviewPath]:{sha256:expectedSha.toLowerCase()}};
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
 for(const family of ['starBlocks','coloredGrids','lifts'])assert.equal(sourceInventory[family].count,0,`Positive ${family} needs a reviewed adapter`);
 const bombItems=auditBombSourceMetadata(review,bindings);
 assert.equal(m.exits.starCount,0);assert.equal(m.exits.starFrozenCount,0);
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
   keyGroups:groups.map(g=>({keyCount:g.keyCount,lockCounts:g.lockValues})),starBlocks:0,flipDoorInitialOpen:m.flipDoors.initialStates.map(s=>s==='open'),coloredGridCellCounts:[],bombSeconds:[...m.bombs.values],
   shutterClearCounts:m.covers.values,shutterHiddenBatchCounts:m.covers.hiddenBatchCounts,liftCount:0,liftHiddenBatchCounts:[],
   numericIceValues:m.numericIce.values,shellBlocks:m.shells.count,
   exits:[...Array.from({length:m.exits.ordinaryCount},()=>({kind:'ordinary',frozen:0,star:false})),
    ...m.exits.frozenValues.map(frozen=>({kind:'ordinary',frozen,star:false})),
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
  sourceFacts:{numericIce:{items:iceItems},bombs:{items:bombItems}},sourceFrames:evidence,sourceFrame:openingPath,
  preservedIrregular:existing?{...existing.level,evidence:EXIT_REPAIR_BASELINE_SHA}:undefined,
  corrections:review.corrections??[],sourceReviewPath:reviewPath,sourceReviewSha256:expectedSha}};
}

export function verifyExitOnlyDesign(raw,baseline,api){
 const checked=verifyExitOnlyRepair(raw,baseline,api);
 return {...checked,ruleVersion:'1.9.0',ordinaryReconfigurationApplied:false,
  note:'Fresh v1.9 spatial/exit/replay checks only; original source discrepancies retained.'};
}

export function verifyReviewedDesign(raw,source,api){
 const level=raw.level,drags=raw.drags??raw.result?.drags;
 assert.equal(level?.id,source.levelId);assert(level.id>=21&&level.id<=200);assert.equal(level.mechanismRules,'revised-2026-09-21-v1.2');
 assert(Array.isArray(drags)&&drags.length);assert(raw.timedRoute,'Positive-time route required');
 const bombCarriers=auditBombCarriers(level,source);
 assert(source.sourceFrames?.length&&source.sourceFrame,'Independent source evidence required');
 assert(!(level.flipDoors??[]).some(d=>d.frozen>0||d.star),'Reviewed physical ice/flip/star inventory adapter required');
 const model=new api.PuzzleModel(level);model.start();const opening=model.snapshot();
 const facts=measureDesignFacts(level,api),visible=opening.blocks.filter(b=>!b.shutterId||opening.shutters.find(s=>s.id===b.shutterId)?.revealed);
 if(source.facts.mechanisms.keysLocks.groups){facts.mechanisms.keysLocks.groups=api.measureRevisedMechanismInventory(level).keyGroups.map(g=>({keyCount:g.keyCount,lockValues:g.lockCounts}));}
 facts.opening=visible.length;facts.mechanisms.irregularBlocks={openingCount:countIrregularBlockShapes(visible),fullCount:countIrregularBlockShapes(level.blocks)};
 for(const k of ['width','height','opening','full']){assert(Number.isSafeInteger(source.facts?.[k]),`Unknown source ${k}`);assert.equal(source.facts[k],facts[k],`Source ${k}`);}
 const mechanismAlignment=auditStrictMechanismAlignment({levelId:level.id,facts:source.facts},facts);
 assert(mechanismAlignment.sourceAligned,`Source alignment ${JSON.stringify(mechanismAlignment)}`);
 let boardAlignment;
 if(source.board.kind==='irregular'&&!source.preservedIrregular){
  // v1.7 permits a new original mask only when no approved preview exists.
  // Independently prove absence; do NOT pass the new candidate as its own old baseline.
  const baselineBytes=readFileSync(EXIT_REPAIR_BASELINE);assert.equal(digest(baselineBytes),EXIT_REPAIR_BASELINE_SHA);
  assert(!JSON.parse(baselineBytes).rows.some(r=>r.levelId===level.id),'Existing irregular mask must be preserved');
  assert(source.board.evidence&&source.board.cells?.length,'Reviewed original irregular source mask required');
  assert.equal(source.board.width,level.width);assert.equal(source.board.height,level.height);
  assert(!level.blocked?.length&&!level.seams?.length,'New connected original outline cannot contain internal barriers');
  const geometry=api.auditRevisedCandidate(level,source.sourceContract);
  assert(geometry.measurements.leftRightSymmetric||geometry.measurements.upDownSymmetric,'Original outline symmetry');
  assert.deepEqual(geometry.issues.filter(i=>i.category==='layout'||i.category==='construction'||i.code==='source-mask-reused'),[],'Original outline topology');
  boardAlignment={ruleVersion:'1.9.0',outlineAligned:true,mode:'new-original-irregular',preservedBaselineAbsent:true,
   baselineSha256:EXIT_REPAIR_BASELINE_SHA,sourcePlayable:source.board.cells.length,designPlayable:level.playable.length,
   sameDimensions:true,sourceShapeCopied:false,blockedIssues:[],unresolved:[],gameplayValidated:false,releaseApproved:false};
 }else boardAlignment=auditStrictBoardAlignment({source:source.board,candidate:level,preservedIrregular:source.preservedIrregular});
 assert(boardAlignment.outlineAligned,`Board alignment ${JSON.stringify(boardAlignment)}`);
 // Keep the original independent contract in the report. Apply only the
 // authorized plain-port reduction to a separately labelled design contract.
 const effectiveContract=structuredClone(source.sourceContract);
 if(mechanismAlignment.ordinaryExitPolicy.allowed){
  const p=mechanismAlignment.ordinaryExitPolicy,plain=e=>e.kind==='ordinary'&&!e.frozen&&!e.star;
  assert.equal(effectiveContract.mechanisms.exits.filter(plain).length,p.originalOrdinary);
  let retained=0;effectiveContract.mechanisms.exits=effectiveContract.mechanisms.exits.filter(e=>!plain(e)||retained++<p.designOrdinary);
 }
 const inventoryAudit=api.auditRevisedCandidate(level,effectiveContract);
 const issues=inventoryAudit.issues.filter(i=>!(source.board.kind==='normal'&&i.code==='source-mask-reused'));
 assert.deepEqual(issues,[],'All independent effective inventory/spatial rules');
 const expectedIce=source.sourceFacts.numericIce.items;assert(expectedIce.every(i=>typeof i.post_melt_shell==='boolean'));
 assert.deepEqual(level.blocks.filter(b=>b.frozen>0).map(b=>`${b.frozen}:${(b.layers?.length??0)>1}`).sort(),expectedIce.map(i=>`${i.value}:${i.post_melt_shell}`).sort(),'Ice/shell colocation');
 const gateSpanAudit=auditGateSpanLimits(level),coverage=auditOpeningCoverage(opening),art=api.auditCandidateBlockArt(level),replay=replayTimedRoute(level,raw.timedRoute,api,{expectedDrags:drags});
 assert(gateSpanAudit.passed,'Physical exit span');assert(coverage.passed,'Stable opening full coverage');assert(art.passed,'Formal shape art');assert(replay.valid&&replay.complete,'Fresh complete replay');
 for(const g of [...level.gates,...(level.flipDoors??[])])assert(level.blocks.some(b=>(b.layers??[b.color]).includes(g.color)),`Unused physical gate ${g.id}`);
 return{ruleVersion:'1.10.0',levelId:level.id,title:level.name,level,drags,candidateSha256:digest(level),
  scope:'reviewed-source-layout',sourceAligned:true,outlineAligned:true,qualifiedPreview:true,sourceNormalizedFacts:source.facts,
  sourceContract:source.sourceContract,effectiveDesignContract:effectiveContract,sourceBoard:source.board,sourceFrame:source.sourceFrame,sourceFrames:source.sourceFrames,
  sourceReviewPath:source.sourceReviewPath,sourceReviewSha256:source.sourceReviewSha256,sourceCorrections:source.corrections,
  timedRoute:raw.timedRoute,bombCarriers,timedModelValidated:true,
  mechanismAlignment,boardAlignment,proposedFacts:facts,inventoryAudit:{...inventoryAudit,issues,passed:true},gateSpanAudit,coverage,art,replay,
  exitSubtaskPassed:true,pointerReplayValidated:false,renderVerified:false,sourceFirstIntroductionCertified:false,lowerBoundCertified:false,timeValidated:false,releaseApproved:false};
}



const bombTuple=i=>({seconds:i.seconds,shell:i.shell,frozen:i.frozen,axis:i.axis});
const canonicalBombs=items=>items.map(bombTuple).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
export function auditBombSourceMetadata(review,bindings){
 const m=review.sourceNormalizedFacts.mechanisms,items=review.sourceFacts?.bombs?.items;
 assert(Number.isSafeInteger(m.bombs.count)&&m.bombs.count>0,'Positive observed bomb inventory required');
 assert(Array.isArray(m.bombs.values)&&m.bombs.values.length===m.bombs.count&&m.bombs.values.every(n=>Number.isFinite(n)&&n>0),'Known positive bomb initial seconds required');
 assert(Array.isArray(items)&&items.length===m.bombs.count,'Every bomb requires observed carrier metadata');
 assert(new Set(items.map(i=>i.sourceId)).size===items.length,'Unique source bomb identities required');
 for(const item of items){
  assert(typeof item.sourceId==='string'&&item.sourceId&&typeof item.shell==='boolean','Known bomb shell association required');
  assert(Number.isFinite(item.seconds)&&item.seconds>0&&Number.isSafeInteger(item.frozen)&&item.frozen>=0,'Known bomb initial seconds and ice association required');
  assert(item.axis===null||item.axis==='horizontal'||item.axis==='vertical','Known bomb axis association required');
  assert(item.keyGroup===null&&item.lockGroup===null&&item.star===false,'Key/lock/star bomb intersections need their own reviewed joint adapter');
  assert(item.reason&&Array.isArray(item.evidencePaths)&&item.evidencePaths.length,'Bomb initial/carrier evidence required');
  for(const p of item.evidencePaths)assert(bindings[p],`Unbound bomb carrier evidence ${p}`);
 }
 assert.deepEqual(items.map(i=>i.seconds).sort((a,b)=>a-b),[...m.bombs.values].sort((a,b)=>a-b),'Bomb item/facts values mismatch');
 const observation=review.sourceInventory.M07??review.sourceInventory.bombs;
 assert(Array.isArray(observation.values),'Explicit bomb observation values required');
 assert.deepEqual([...observation.values].sort((a,b)=>a-b),[...m.bombs.values].sort((a,b)=>a-b),'Bomb observation/facts mismatch');
 assert(!(m.keysLocks.groups??[]).some(g=>g.frozenKeyValues?.length||g.frozenLockValues?.length),'Mixed keyed ice requires joint adapter');
 return structuredClone(items);
}
export function auditBombCarriers(level,source){
 const items=source.sourceFacts?.bombs?.items;assert(Array.isArray(items)&&items.length,'Bound bomb carriers required');
 const bombs=level.blocks.filter(b=>b.timedBombSeconds!==undefined);
 assert(bombs.every(b=>!b.keyId&&!b.lockedBy&&!b.star),'Unreviewed key/lock/star bomb association');
 const actual=bombs.map(b=>({seconds:b.timedBombSeconds,shell:(b.layers?.length??0)>1,frozen:b.frozen??0,axis:b.movementAxis??null}));
 assert.deepEqual(canonicalBombs(actual),canonicalBombs(items),'Bomb carrier association mismatch');
 return{passed:true,items:canonicalBombs(actual),scope:'All authored carriers including hidden and queued; stage may be rearranged'};
}

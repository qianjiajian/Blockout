import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,BANDS} from '../formal-v2/contract.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {createReferenceLineageReader} from '../formal-v3/reference-lineage.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {historicalPromotedFamilies} from '../formal-v3/family-promotion-history.mjs';
import {CAPACITY_SEED_BINDINGS,prepareCapacityDesignContext} from './capacity-design-context.mjs';
import {CONSTRUCTION_LEDGER,inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {assertLowBandAdvancedBatchPlan,LOW_BAND_ADVANCED_ANCHOR,LOW_BAND_ADVANCED_ANCHOR_REVIEW,LOW_BAND_ADVANCED_BATCH_SLOT_VERSION} from './low-band-advanced-batch-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),normal=p=>path.resolve(p);
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const partition=level=>levelSha256(level.blocks.map(cells).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const shapeInventory=bs=>levelSha256(bs.map(b=>b.shape.map(p=>p.join(',')).sort().join(';')).sort());
export function inspectSubstantialRegionRedraft(baseDescriptor,base,input,reference,independentMathematicsAudit){
 assert.equal(levelSha256(input.level),base.levelSha256);assert.equal(input.provenance?.version,'whole-connected-late-region-gate-aware-v1');
 const p=input.provenance,r=p.region;assert.equal(levelSha256(reference.level),p.referenceLevelSha256);
 assert.equal(routeSha256(reference.drags),p.referenceRouteSha256);
 const region=new Set(r.cells.map(c=>c.join(',')));assert.equal(region.size,r.cells.length);assert.equal(r.area,region.size);
 const board=base.level.playable??Array.from({length:base.level.width*base.level.height},(_,i)=>[i%base.level.width,Math.floor(i/base.level.width)]);
 for(const k of ['width','height','playable','blocked','seams'])assert.deepEqual(base.level[k],reference.level[k],`Normal source mask changed: ${k}`);
 const blocked=new Set((base.level.blocked??[]).map(c=>c.join(','))),actualArea=board.filter(c=>!blocked.has(c.join(','))).length;
 assert(region.size/actualArea>=.35,'Substantial connected redraft must cover at least 35% of the actual board');
 assert.equal(r.fraction,region.size/actualArea);assert.equal(r.connected,true);
 const seen=new Set(),queue=[r.cells[0]];for(let i=0;i<queue.length;i++){const [x,y]=queue[i],key=[x,y].join(',');if(seen.has(key))continue;seen.add(key);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const k=[x+dx,y+dy].join(',');if(region.has(k)&&!seen.has(k))queue.push([x+dx,y+dy]);}}
 assert.equal(seen.size,region.size,'Disconnected redraft');
 const oldRegion=reference.level.blocks.filter(b=>r.bodyIds.includes(b.id));assert.equal(oldRegion.length,r.bodyIds.length);
 assert.equal(r.originalBodyCount,oldRegion.length);
 const covered=oldRegion.flatMap(cells).map(c=>c.join(',')).sort();assert.deepEqual(covered,[...region].sort(),'Region must contain whole old bodies exactly');
 const newRegion=input.level.blocks.filter(b=>cells(b).some(c=>region.has(c.join(','))));
 assert(newRegion.every(b=>cells(b).every(c=>region.has(c.join(',')))),'New region straddles its boundary');
 assert.deepEqual(newRegion.flatMap(cells).map(c=>c.join(',')).sort(),[...region].sort(),'New bodies must exactly tile the old connected region');
 const oldOutside=reference.level.blocks.filter(b=>!r.bodyIds.includes(b.id));
 assert.deepEqual(input.level.blocks.filter(b=>!newRegion.includes(b)),oldOutside,'Outside bodies must remain the actual reference objects');
 assert.notEqual(shapeInventory(oldRegion),shapeInventory(newRegion),'Actual native shape inventory must change');
 assert.notEqual(partition(input.level),partition(reference.level),'Same partition is not a new redraft');
 const changed=newRegion.filter(b=>{const old=oldRegion.find(o=>o.id===b.id);return old&&levelSha256(old.layers??[old.color])!==levelSha256(b.layers??[b.color]);});
 const shared=newRegion.filter(b=>oldRegion.some(o=>o.id===b.id));
 if(shared.length)assert(changed.length&&changed.some(b=>b.id===p.realSharedBodyRecoloured),'Actual shared body colour must change');
 else assert.notEqual(levelSha256(oldRegion.map(b=>b.layers??[b.color]).sort()),levelSha256(newRegion.map(b=>b.layers??[b.color]).sort()),'No shared IDs still requires actual colour inventory change');
 assert.equal(p.newShapeInventory,true);assert.equal(p.sourceMaskRetained,true);assert.equal(p.allExternalBodiesByteEquivalent,true);
 const forbidden=new Set(r.bodyIds);assert(input.prefixDrags.every(d=>!forbidden.has(d.blockId)),'Reference prefix operated on the rebuilt region');
 return{sourceType:'SUBSTANTIAL_CONNECTED_REGION_REDRAFT',directWholeBoard:false,originalReference:p.reference,
  sharedOriginalAncestryDisclosed:true,regionArea:region.size,boardArea:actualArea,regionFraction:region.size/actualArea,
  actualPartitionSha256:partition(input.level),referencePartitionSha256:partition(reference.level),
  actualChangedSharedIds:changed.map(b=>b.id),independentMathematicsAudit,
  scope:'One plan-bound independently audited substantial region redraft; visual and selected-family decisions remain separately required'};
}

// An append is verified from its immutable construction sidecar and original
// public mathematical result, not from an accepted flag in a new index.
export async function verifyLowBandBatchAppend(runtime,q,read,{publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 assert.equal(q.lowBandAdvancedSlotVersion,LOW_BAND_ADVANCED_BATCH_SLOT_VERSION);
 assert(q.accepted&&q.catalogEligible&&!q.qualificationOnly&&!q.formalReady);
 const p=await read(q.declaredBatchPlan);assertLowBandAdvancedBatchPlan(p,runtime.slots);
 const row=p.rows.find(r=>r.slot.formalId===q.formalId);assert(row);assert.deepEqual(q.baseReceipt.path,row.base.path);assert.equal(q.baseReceipt.sha256,row.base.sha256);
 assert.equal(q.baseLevelSha256,row.baseLevelSha256);assert.equal(q.baseRouteSha256,row.baseRouteSha256);
 assert.equal(q.sourceLevelId,row.sourceLevelId);assert.deepEqual(Object.fromEntries(Object.keys(row.slot).map(k=>[k,q[k]])),row.slot);
 assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
 assert(q.constructionAttemptStarted&&q.finalProofStarted&&q.mechanismStrengthValidated&&q.designValidated&&q.mathematicalEvidenceValidated);
 assert(q.strength?.passed&&q.strength.participation?.passed);assert.equal(q.strength.mechanism,row.slot.newestMechanism);
 const c=await read(q.constructionSidecar);assert.deepEqual(c,q.construction);assert(c.ok&&c.accepted&&!c.mathematicalAcceptance);
 assert.equal(c.inputLevelSha256,q.baseLevelSha256);assert.equal(c.inputRouteSha256,q.baseRouteSha256);
 assert.equal(c.levelSha256,q.levelSha256);assert.equal(c.routeSha256,q.routeSha256);
 assert.deepEqual(inspectConstructionAccounting(c.constructionAccounting),[]);
 const cp=await read(q.constructionPlan);assert.equal(levelSha256(cp),q.constructionPlan.canonicalSha256);assert.deepEqual(cp.slot,row.slot);
 const persisted=await read({path:q.entryResultFile,sha256:q.entryResultSha256??sha(await fs.readFile(q.entryResultFile))});
 assert.equal(levelSha256(persisted),levelSha256(q),'Selected append must equal its immutable stored slot result');
 const math=q.mathematicalProof,band=BANDS[q.difficulty];assert(math.accepted&&math.catalogEligible&&!math.qualificationOnly);
 for(const key of ['formalId','stageKey','difficulty','sourceLevelId','levelSha256','routeSha256','L','U'])assert.equal(math[key],q[key]);
 assert.deepEqual(math.level,q.level);assert.deepEqual(math.drags,q.drags);assert.deepEqual(math.attempt,q.attempt);
 assert.deepEqual(math.lowerBound,q.lowerBound);assert.deepEqual(math.route,q.route);assert.deepEqual(math.toolchainBindings,runtime.toolchainBindings);
 assert.equal(q.L,band.lower);assert(q.U>=band.lower&&q.U<=band.upper);
 const lower=math.lowerBound.result;assert(lower.thresholdProven&&lower.status==='threshold-proven'&&lower.floor===band.lower&&lower.termination==='below-threshold-exhausted');
 assert(lower.guardAllowance?.conservativeFullBoardStateUpperBound<=10000);
 for(const replay of [math.route.canonicalReplay,math.route.independentReplay])assert(replay.valid&&replay.complete&&!replay.failed&&replay.nonClearingDrags===q.U);
 const request=await read({path:path.join(publicLedgerDirectory,`${q.attempt.id}.request.json`)}),result=await read({path:path.join(publicLedgerDirectory,`${q.attempt.id}.result.json`)});
 assert.deepEqual(request,q.attempt);assert.equal(result.levelSha256,q.levelSha256);assert(result.accepted&&result.status===math.status);
 assert.deepEqual(result.lower,math.lowerBound.result);assert.deepEqual(result.upper,math.route.search);
 for(const d of [q.baseReceipt,q.baseReceipt.request,q.baseReceipt.result,q.priorBaseline])await read(d);
 assert.equal(levelSha256(q.designBindings),q.designToolchainSha256);
 for(const [file,h]of Object.entries({...q.toolchainBindings,...q.designBindings,...q.designInputBindings,...q.assetBindings}))await read({path:file,sha256:h},false);
 return row;
}

export async function prepareLowBandBatchContext(runtime,baseReceipt,base,slot,selected,selectionContext,{planDescriptor,plan,row,
 qualificationOnly=false,constructionLedgerDirectory=CONSTRUCTION_LEDGER,publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 if(qualificationOnly&&!selectionContext)return prepareCapacityDesignContext(runtime,baseReceipt,base,slot,selected,null,
  {qualificationOnly,constructionLedgerDirectory,publicLedgerDirectory});
 const bindings={},read=async(d,json=true)=>{assert(d?.path);const bytes=await fs.readFile(d.path),h=sha(bytes);
  if(d.sha256)assert.equal(h,d.sha256,`Changed batch context: ${d.path}`);if(bindings[d.path])assert.equal(bindings[d.path],h);bindings[d.path]=h;
  return json?JSON.parse(bytes):bytes;};
 assertLowBandAdvancedBatchPlan(plan,runtime.slots);assert.deepEqual(await read(planDescriptor),plan);
 const anchor=await read(LOW_BAND_ADVANCED_ANCHOR),anchorAudit=await read(LOW_BAND_ADVANCED_ANCHOR_REVIEW);
 assert.equal(anchorAudit.status,'INDEPENDENT_150_MERGE_QUICK_CHECK_PASS');assert.deepEqual(anchorAudit.errors,[]);
 assert.deepEqual(anchorAudit.selection,LOW_BAND_ADVANCED_ANCHOR);assert.equal(anchorAudit.newSearches,0);assert.equal(anchorAudit.newLedgerClaims,0);
 const input=await read(plan.inputSelection),context=await read(selectionContext);
 for(const s of [input,context]){assert.equal(s.schemaVersion,4);assert.equal(s.scope,300);assert(Array.isArray(s.files));assert.equal(new Set(s.files).size,s.files.length);}
 assert.equal(input.files.length,plan.inputSelectionCount);assert.deepEqual(input.files.slice(0,anchor.files.length),anchor.files);
 assert.deepEqual(context.files.slice(0,input.files.length),input.files);assert.equal(selected.length,context.files.length);
 assert.deepEqual(Object.keys(context.fileBindings).sort(),[...context.files].sort());
 const actual=[];
 for(const [i,p]of context.files.entries()){
  const q=await read({path:p,sha256:context.fileBindings[p]});assert.equal(levelSha256(q),levelSha256(selected[i]));
  assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
  if(i<anchor.files.length)assert.equal(context.fileBindings[p],anchorAudit.inputBindings[p],'Exact historical150 receipt bytes');
  else{const appendedRow=await verifyLowBandBatchAppend(runtime,q,read,{publicLedgerDirectory});
   if(i>=input.files.length){assert.deepEqual(q.declaredBatchPlan,planDescriptor);assert(appendedRow.index<row.index,'Only earlier declared rows may append');}}
  actual.push(q);
 }
 assert.equal(new Set(actual.map(q=>q.formalId)).size,actual.length);assert(!actual.some(q=>q.formalId===slot.formalId));
 const visual=await read(plan.visualReview);assert.equal(visual.status,'INDEPENDENT_ACTUAL_OPENINGS_VISUAL_REVIEW_WITH_SIMILARITY_WARNINGS');
 assert.equal(visual.newGameplaySearches??visual.newSearches??0,0);
 const inputPacket=await read(base.input),reference=await read(inputPacket.provenance.reference);
 const opening=visual.rows.find(r=>normal(r.candidate?.path??'')===normal(base.input.path)&&r.candidate.sha256===base.input.sha256);
 assert(opening?.actualOriginalImageOpened&&opening.levelSha256===base.levelSha256,'Actual visual review must include this exact original base');
 assert(!opening.visibleMissingSprites&&!opening.visibleClippedBlocksOrExits&&!opening.visibleTextureStretch&&!opening.abnormallyThinBoard);
 await read(opening.image,false);
 const classification=inspectSubstantialRegionRedraft(baseReceipt,base,inputPacket,reference,plan.independentActualAudit);
 const lineage=createReferenceLineageReader(),ancestry=lineage.inspect(base.input.path);
 assert.equal(ancestry.roots.length,1);assert.deepEqual(ancestry.unknownReasons,[]);classification.actualAncestry=ancestry;
 for(const f of [base.input.path,...ancestry.ancestors,...ancestry.roots])await read({path:f});
 const seed=await read(CAPACITY_SEED_BINDINGS),live=[];
 for(const q of actual){const original=q.historicalProof?await read(q.historicalProof):q;
  live.push({...original,baseInputFile:original.baseInputFile??original.baseReceipt?.path??original.mathematicalProof?.path??original.input?.path});}
 const retired=await historicalPromotedFamilies(seed.historicalSelection.path,live);assert(!ancestry.roots.some(r=>retired.has(r)),'Retired promoted family');
 const source=runtime.LEVELS.find(l=>l.id===base.sourceLevelId);assert(source);
 const old=[];assert.equal(runtime.priorDailySlots.size,450);for(const prior of runtime.priorDailySlots.values()){
  const q=await read({path:prior.sourceReport,sha256:prior.sourceReportSha256});assert.equal(levelSha256(q.level),prior.levelSha256);old.push({formalId:q.formalId,level:q.level});}
 const rejected=[],skeletons=[],exclusions=await read({path:'deliverables/daily-formal-v3-20261008/proof/preselection-visual-exclusions.json'});
 for(const item of exclusions.records){const r=await read({path:item.reviewFile,sha256:item.reviewSha256});assert(r.rootActuallyViewed&&r.decision==='REJECT_REPEATED_VISUAL_FAMILY');
  const q=await read(r.candidate);await read(r.actualImage,false);rejected.push(designFingerprints(q.level).designSha256);}
 let file=seed.historicalSelection.path;const seen=new Set();while(file){assert(!seen.has(file));seen.add(file);const h=await read({path:file});
  for(const r of h.visualCuration?.removed??[]){const q=await read({path:r.file}),b=await read({path:q.baseInputFile,sha256:q.baseInputFileSha256});rejected.push(designFingerprints(b.level).designSha256);}
  if(h.visualCuration?.reviewFile){const r=await read({path:h.visualCuration.reviewFile,sha256:h.visualCuration.reviewSha256});
   for(const f of r.families??[])if(f.decision==='KEEP_ONE_REPRESENTATIVE'&&f.exactSharedVisibleGeometryAndOuterColour?.anchors?.length&&f.gateTopologyAndColourEvidence?.allMembersExactlyEqual)skeletons.push(f);}
  file=h.priorIndex;}
 const anchorKey=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:cells(b)}),gateKey=gs=>JSON.stringify(gs.map(g=>({side:g.side,offset:g.offset,size:g.size,color:g.color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
 const family={sourceClassification:classification,visualDisposition:row.visual,retiredPromotedFamily:false};
 const selectionBinding={...selectionContext,inputSelection:plan.inputSelection,count:actual.length,fileBindings:context.fileBindings,sourceClassification:classification,visualDisposition:row.visual};
 return{bindings,family,selectionBinding,inspect(level){
  const issues=[],sourceComparison=compareLayouts(level,source);if(sourceComparison.footprintSimilarity>.55+1e-12)issues.push('source-footprint-over-.55');
  let nearestOld={similarity:0};for(const q of old){const s=compareLayouts(level,q.level).footprintSimilarity;if(s>nearestOld.similarity)nearestOld={formalId:q.formalId,similarity:s};}
  if(nearestOld.similarity>.75+1e-12)issues.push('old450-footprint-over-.75');
  const selectedComparisons=actual.map(q=>({formalId:q.formalId,sameGroup:q.stageKey===slot.stageKey&&q.difficulty===slot.difficulty,similarity:compareLayouts(level,q.level).footprintSimilarity}));
  for(const q of selectedComparisons)if(q.similarity>(q.sameGroup?.65:.75)+1e-12)issues.push(`selected-near:${q.formalId}`);
  if(rejected.includes(designFingerprints(base.level).designSha256))issues.push('actual-visual-rejection');
  const anchors=new Set(level.blocks.map(anchorKey)),gates=gateKey([...(level.gates??[]),...(level.flipDoors??[])]);
  if(skeletons.some(f=>gateKey(f.gateTopologyAndColourEvidence.canonicalTopology)===gates&&f.exactSharedVisibleGeometryAndOuterColour.anchors.every(b=>anchors.has(anchorKey(b)))))issues.push('retired-visual-skeleton');
  return{passed:!issues.length,issues,sourceComparison,nearestOld,selectedComparisons,family,selectionBinding,sourceClassification:classification,completeSelectedCount:actual.length,
   policy:{sourceMaximum:.55,old450Maximum:.75,sameGroupMaximum:.65,globalMaximum:.75},newSearches:0};
 }};
}


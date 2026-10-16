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
import {LOW_BAND_ADVANCED_ANCHOR,LOW_BAND_ADVANCED_ANCHOR_REVIEW} from './low-band-advanced-batch-contract.mjs';
import {verifyLowBandBatchAppend} from './low-band-advanced-batch-context.mjs';
import {ICED_FLIP_BASE_AUDIT} from './fixed-iced-flip-construction.mjs';
export const ICED_FLIP_SELECTION_ANCHOR={path:'deliverables/daily-formal-v4-20261008/selection/completed-basic-and-advanced-152-01/index.json',sha256:'a6f14c0e32297bb02c081efc10f9c79775f8e54d7d375aa44685edd4cafd50a8'};
export const ICED_FLIP_SELECTION_REVIEW={path:'deliverables/daily-formal-v4-20261008/proof/completed152-quick-independent-01.json',sha256:'aa4382392ea500b722e84aabbc5436de53cf3b6db8fbffdbc6ecedf401841752'};
const sha=b=>createHash('sha256').update(b).digest('hex'),normal=p=>path.resolve(p);
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const partition=level=>levelSha256(level.blocks.map(cells).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const shapeInventory=bs=>levelSha256(bs.map(b=>b.shape.map(p=>p.join(',')).sort().join(';')).sort());
export function inspectIcedRegionRedraft(baseDescriptor,base,input,reference,independentMathematicsAudit){
 assert.equal(levelSha256(input.level),base.plan.plainLevelSha256);assert.equal(input.provenance?.version,'new-stock-all-gates-fixed-early-frozen-region-v1');
 const p=input.provenance,r=p.region;assert.equal(levelSha256(reference.level),p.referenceLevelSha256);
 assert.deepEqual(input.level.gates,reference.level.gates,'All original gates are preserved');
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


export async function prepareIcedFlipContext(runtime,baseReceipt,base,slot,selected,selectionContext,{selectionAudit,qualificationOnly=false,constructionLedgerDirectory=CONSTRUCTION_LEDGER,publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 if(qualificationOnly&&!selectionContext)return prepareCapacityDesignContext(runtime,baseReceipt,base,slot,selected,null,{qualificationOnly,constructionLedgerDirectory,publicLedgerDirectory});
 const bindings={},read=async(d,json=true)=>{assert(d?.path);const bytes=await fs.readFile(d.path),h=sha(bytes);if(d.sha256)assert.equal(h,d.sha256,'Context file changed: '+d.path);if(bindings[d.path])assert.equal(bindings[d.path],h);bindings[d.path]=h;return json?JSON.parse(bytes):bytes;};
 const anchor=await read(LOW_BAND_ADVANCED_ANCHOR),anchorAudit=await read(LOW_BAND_ADVANCED_ANCHOR_REVIEW),context=await read(selectionContext);
 const latest=await read(ICED_FLIP_SELECTION_ANCHOR),latestAudit=await read(ICED_FLIP_SELECTION_REVIEW);
 assert.equal(latestAudit.status,'INDEPENDENT_152_MERGE_QUICK_CHECK_PASS');assert.deepEqual(latestAudit.selection,ICED_FLIP_SELECTION_ANCHOR);assert.deepEqual(latestAudit.errors,[]);
 assert.equal(latestAudit.newSearches,0);assert.equal(latestAudit.newLedgerClaims,0);
 assert.deepEqual(context.files.slice(0,latest.files.length),latest.files,'The current independently admitted selection prefix cannot be omitted or reordered');
 assert.equal(anchorAudit.status,'INDEPENDENT_150_MERGE_QUICK_CHECK_PASS');assert.deepEqual(anchorAudit.errors,[]);assert.deepEqual(anchorAudit.selection,LOW_BAND_ADVANCED_ANCHOR);
 assert.equal(context.schemaVersion,4);assert.equal(context.scope,300);assert.deepEqual(context.files.slice(0,anchor.files.length),anchor.files);assert.equal(context.files.length,selected.length);
 assert.equal(new Set(context.files).size,context.files.length);
 let actualAudit;if(context.files.length>anchor.files.length){if(selectionAudit)assert.deepEqual(selectionAudit,context.independentActualAudit??selectionAudit);actualAudit=await read(selectionAudit??context.independentActualAudit);assert.equal(actualAudit.status,'INDEPENDENT_LOW_BAND_ADVANCED_BATCH_ACTUAL_PASS');assert.deepEqual(actualAudit.errors,[]);assert.equal(actualAudit.newSearches,0);assert.equal(actualAudit.newLedgerClaims,0);const auditedIndex=await read(actualAudit.index);assert.deepEqual(auditedIndex.files,context.files);if(path.resolve(actualAudit.index.path)!==path.resolve(selectionContext.path)){assert.deepEqual(context.acceptedBatchIndex,actualAudit.index);const merged=await read(context.mergeAudit);assert.equal(merged.status,'ROOT_REVIEWED_152_SELECTION_ADMISSION_PASS');assert.deepEqual(merged.input,actualAudit.index);assert.deepEqual(merged.prior,LOW_BAND_ADVANCED_ANCHOR);assert.deepEqual(merged.independentActual,context.independentActualAudit);assert(merged.original150FilesAndOrderPreserved&&merged.receiptsModified===false);assert.equal(merged.candidateCount,context.files.length);assert.equal(merged.newSearches,0);assert.equal(merged.newLedgerClaims,0);}}
 const receiptBindings=Object.fromEntries(context.files.map((p,i)=>{const h=i<anchor.files.length?anchorAudit.inputBindings[p]:actualAudit.results.find(r=>path.resolve(r.file)===path.resolve(p)&&r.accepted)?.sha256;assert(/^[a-f0-9]{64}$/.test(h??''),'Selected receipt must be independently byte-bound');return[p,h];}));
 if(context.fileBindings)assert.deepEqual(context.fileBindings,receiptBindings,'Selection receipt bindings differ');
 const actual=[];
 for(const [i,p]of context.files.entries()){const q=await read({path:p,sha256:receiptBindings[p]});assert.equal(levelSha256(q),levelSha256(selected[i]));assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
  if(i<anchor.files.length)assert.equal(receiptBindings[p],anchorAudit.inputBindings[p]);else{await verifyLowBandBatchAppend(runtime,q,read,{publicLedgerDirectory});assert(actualAudit.results.some(r=>path.resolve(r.file)===path.resolve(p)&&r.sha256===receiptBindings[p]&&r.accepted));}actual.push(q);}
 assert.equal(new Set(actual.map(q=>q.formalId)).size,actual.length);assert(!actual.some(q=>q.formalId===slot.formalId));
 const inputPacket=await read(base.input),plain=await read(base.plan.plainConstructionEvidence),reference=await read(plain.provenance.reference);
 assert.deepEqual(plain,inputPacket.plain);assert.deepEqual(inputPacket.constructionEvidence,base.plan.constructionEvidence);assert.equal(levelSha256(inputPacket.level),base.levelSha256);
 const classification=inspectIcedRegionRedraft(baseReceipt,base,{...plain,prefixDrags:inputPacket.prefixDrags},reference,ICED_FLIP_BASE_AUDIT);
 const lineage=createReferenceLineageReader(),ancestors=new Set(),roots=new Set(),visited=new Set();
 async function follow(d){assert(!visited.has(path.resolve(d.path)),'Cyclic bound ancestry');visited.add(path.resolve(d.path));ancestors.add(d.path);const q=await read(d);
  if(lineage.isDirectWholeBoard(q)){roots.add(d.path);return;}
  if(q.input?.path){const input=await read(q.input);assert.equal(levelSha256(input.level),q.levelSha256??levelSha256(q.level),'Math receipt input ancestry changed');await follow(q.input);return;}
  const provenance=q.provenance??q.plain?.provenance;
  if(provenance?.reference){const ref=typeof provenance.reference==='string'?{path:provenance.reference,sha256:provenance.referenceFileSha256}:provenance.reference;const parent=await read(ref);
   if(provenance.referenceLevelSha256)assert.equal(levelSha256(parent.level),provenance.referenceLevelSha256);if(provenance.referenceRouteSha256)assert.equal(routeSha256(parent.drags),provenance.referenceRouteSha256);await follow(ref);return;}
  const old=lineage.inspect(d.path);assert.deepEqual(old.unknownReasons,[],'Unresolved actual ancestry');assert(old.roots.length);for(const f of [...old.ancestors,...old.roots]){await read({path:f});ancestors.add(f);}for(const f of old.roots)roots.add(f);
 }
 await follow(plain.provenance.reference);assert.equal(roots.size,1);const ancestry={roots:[...roots],ancestors:[...ancestors],unknownReasons:[],directWholeBoard:false};classification.actualAncestry={...ancestry,originalIcedInput:base.input,plainConstruction:base.plan.plainConstructionEvidence};
 const visual=await read(base.visualReview);assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');for(const [p,h]of Object.entries(visual.fileBindings))await read({path:p,sha256:h},false);assert(visual.viewedImages.length===visual.viewedCandidates&&visual.viewedCandidates>0);for(const d of visual.viewedImages)await read(d,false);
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
 const family={sourceClassification:classification,visualDisposition:{review:base.visualReview,specificNewRegion:true},retiredPromotedFamily:false};
 const selectionBinding={...selectionContext,inputSelection:selectionContext,count:actual.length,fileBindings:receiptBindings,sourceClassification:classification,visualDisposition:{review:base.visualReview,specificNewRegion:true}};
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


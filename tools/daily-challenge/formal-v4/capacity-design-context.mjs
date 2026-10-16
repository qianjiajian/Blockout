import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,BANDS} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {createReferenceLineageReader} from '../formal-v3/reference-lineage.mjs';
import {historicalPromotedFamilies} from '../formal-v3/family-promotion-history.mjs';
import {CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

export const CAPACITY_SEED_BINDINGS={path:'deliverables/daily-formal-v4-20261008/proof/capacity-seed116-bindings-v1.json',
 sha256:'9b21c4d0101872593d69a83f2878219bab7e213b3c6e39b9ce597d1a7b503c69'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const equalSets=(a,b)=>a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
const root='deliverables/daily-formal-v3-20261008';

/** Read-only design admission before any construction reservation. Production
 * has an immutable 116-record floor plus exactly the preceding accepted batch
 * files. A caller cannot silently omit selected geometry or its file bytes. */
export async function prepareCapacityDesignContext(runtime,baseReceipt,base,slot,selected,selectionContext,{
 qualificationOnly=false,constructionLedgerDirectory=CONSTRUCTION_LEDGER,publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 const bindings={},read=async(p,expected)=>{const bytes=await fs.readFile(p),h=sha(bytes);if(expected)assert.equal(h,expected,`Design input changed: ${p}`);bindings[p]=h;return JSON.parse(bytes);};
 assert(Array.isArray(selected),'Actual selected receipt list required');
 let selectionBinding=null;
 if(!qualificationOnly||selectionContext){
  assert(selectionContext?.path&&/^[a-f0-9]{64}$/.test(selectionContext.sha256??''),'Production selectionContext path/SHA required');
  const context=await read(selectionContext.path,selectionContext.sha256),seed=await read(CAPACITY_SEED_BINDINGS.path,CAPACITY_SEED_BINDINGS.sha256);
  assert.equal(context.schemaVersion,4);assert.equal(context.scope,300);assert.deepEqual(context.seedIndex,seed.seedIndex,'Fixed original116 seed identity');
  const seedIndex=await read(seed.seedIndex.path,seed.seedIndex.sha256);assert.equal(seedIndex.files.length,116);assert(equalSets(seedIndex.files,seed.files));
  assert(Array.isArray(context.files)&&equalSets(context.files,Object.keys(context.fileBindings??{})),'Every unique selected file must have its complete byte SHA');
  assert.equal(context.files.length,selected.length,'No omitted or additional selected records');
  assert(seed.files.every(p=>context.files.includes(p)),'Original116 cannot be removed');
  for(const [i,file]of context.files.entries()){
   if(seed.fileBindings[file])assert.equal(context.fileBindings[file],seed.fileBindings[file],'Original116 receipt bytes are immutable');
   const q=await read(file,context.fileBindings[file]);assert.equal(levelSha256(q),levelSha256(selected[i]),'Actual selected object must equal the bound report');
   assert(q.accepted===true&&q.qualificationOnly!==true,'Only accepted nonqualification selected receipts');
   assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
  }
  const stored=[];
  const names=await fs.readdir(constructionLedgerDirectory).catch(error=>{if(error.code==='ENOENT')return[];throw error;});
  for(const name of names.filter(n=>n.endsWith('.slot-result.json')).sort()){
   const receipt=await read(path.join(constructionLedgerDirectory,name));if(!receipt.accepted)continue;
   assert(receipt.catalogEligible===true&&receipt.qualificationOnly===false&&receipt.formalReady===false,'Stored accepted capacity receipt flags');
   assert.equal(name,`${receipt.construction.constructionAttempt.id}.slot-result.json`,'Stored construction identity');
   assert.deepEqual(runtime.slots.find(s=>s.formalId===receipt.formalId),Object.fromEntries(Object.keys(slot).map(k=>[k,receipt[k]])),'Stored new slot metadata');
   assert.equal(receipt.levelSha256,levelSha256(receipt.level));assert.equal(receipt.routeSha256,routeSha256(receipt.drags));
   const math=receipt.mathematicalProof;assert(math.accepted&&math.catalogEligible&&!math.qualificationOnly,'Stored actual bounded acceptance');
   assert.deepEqual(receipt.toolchainBindings,runtime.toolchainBindings,'Stored full mathematical bindings');
   assert.deepEqual(math.toolchainBindings,runtime.toolchainBindings,'Stored inner full mathematical bindings');
   assert.equal(levelSha256(receipt.designBindings),receipt.designToolchainSha256,'Stored complete design binding digest');
   for(const [file,digest]of Object.entries(runtime.designBindings))assert.equal(receipt.designBindings[file],digest,'Stored catalog design binding missing');
   for(const file of ['tools/daily-challenge/formal-v4/qualify-capacity-slot.mjs','tools/daily-challenge/formal-v4/capacity-design-context.mjs'])
    assert(/^[a-f0-9]{64}$/.test(receipt.designBindings[file]??''),'Stored entry design dependency missing');
   for(const key of ['policyRuleVersion','policyRuleSha256','mathRuleVersion','mathRuleSha256','toolchainSha256'])assert.equal(receipt[key],runtime[key],`Stored runtime ${key}`);
   for(const key of ['formalId','stageKey','newestMechanism','slot','difficulty','sourceLevelId','policyRuleVersion','policyRuleSha256','mathRuleVersion','mathRuleSha256','toolchainSha256'])assert.equal(math[key],receipt[key],`Stored mathematical ${key}`);
   assert.equal(math.levelSha256,receipt.levelSha256);assert.equal(math.routeSha256,receipt.routeSha256);
   assert.equal(levelSha256(math.level),receipt.levelSha256);assert.equal(routeSha256(math.drags),receipt.routeSha256);
   assert.equal(math.L,receipt.L);assert.equal(math.U,receipt.U);assert.deepEqual(math.attempt,receipt.attempt);
   assert.deepEqual(math.lowerBound,receipt.lowerBound);assert.deepEqual(math.route,receipt.route);
   const band=BANDS[receipt.difficulty],lower=math.lowerBound.result;
   assert.equal(receipt.L,band.lower);assert(receipt.U>=band.lower&&(band.upper===null||receipt.U<=band.upper));
   assert(lower.status==='threshold-proven'&&lower.thresholdProven===true&&lower.floor===band.lower&&lower.termination==='below-threshold-exhausted');
   assert(lower.guardAllowance?.conservativeFullBoardStateUpperBound<=10000,'Stored guarded lower accounting');
   for(const replay of [math.route.canonicalReplay,math.route.independentReplay])assert(replay.valid&&replay.complete&&!replay.failed&&replay.nonClearingDrags===receipt.U);
   const request=await read(path.join(publicLedgerDirectory,`${math.attempt.id}.request.json`));assert.deepEqual(request,math.attempt,'Stored complete mathematical request');
   const result=await read(path.join(publicLedgerDirectory,`${math.attempt.id}.result.json`));assert(result.accepted);assert.equal(result.status,math.status);
   assert.equal(result.levelSha256,receipt.levelSha256);assert.deepEqual(result.lower,math.lowerBound.result);assert.deepEqual(result.upper,math.route.search);
   const construction=await read(receipt.constructionSidecar.path,receipt.constructionSidecar.sha256);assert.deepEqual(construction,receipt.construction,'Stored immutable construction result');
   assert(construction.accepted&&construction.ok&&!construction.mathematicalAcceptance&&construction.levelSha256===receipt.levelSha256&&construction.routeSha256===receipt.routeSha256);
   assert.equal(construction.inputLevelSha256,receipt.baseLevelSha256);assert.equal(construction.inputRouteSha256,receipt.baseRouteSha256);
   assert.equal(construction.provenance.inputLevelSha256,receipt.baseLevelSha256);assert.equal(construction.provenance.inputRouteSha256,receipt.baseRouteSha256);
   assert.equal(construction.provenance.outputLevelSha256,receipt.levelSha256);assert.equal(construction.provenance.outputRouteSha256,receipt.routeSha256);
   assert.equal(levelSha256(construction.level),receipt.levelSha256);assert.equal(routeSha256(construction.drags),receipt.routeSha256);
   const plan=await read(receipt.constructionPlan.path,receipt.constructionPlan.sha256);assert.equal(levelSha256(plan),receipt.constructionPlan.canonicalSha256);
   assert.deepEqual(plan.slot,runtime.slots.find(s=>s.formalId===receipt.formalId));
   for(const descriptor of [receipt.baseReceipt,receipt.baseReceipt.request,receipt.baseReceipt.result,receipt.priorBaseline])await read(descriptor.path,descriptor.sha256);
   const parent=await read(receipt.baseReceipt.path,receipt.baseReceipt.sha256);assert.equal(levelSha256(parent.level),receipt.baseLevelSha256);assert.equal(routeSha256(parent.drags),receipt.baseRouteSha256);
   for(const [file,digest]of Object.entries({...receipt.toolchainBindings,...receipt.designBindings,...receipt.designInputBindings,...receipt.assetBindings})){
    const bytes=await fs.readFile(file);assert.equal(sha(bytes),digest,`Stored dependency changed: ${file}`);bindings[file]=digest;
   }
   assert(selected.some(q=>levelSha256(q)===levelSha256(receipt)),'Preceding accepted capacity result cannot be omitted or changed');stored.push(receipt);
  }
  for(const [i,file]of context.files.entries())if(!seed.files.includes(file))
   assert(stored.some(q=>levelSha256(q)===levelSha256(selected[i])),'New selected report requires an intact accepted entry sidecar');
  selectionBinding={...selectionContext,seedIndex:seed.seedIndex,count:context.files.length,fileBindings:context.fileBindings};
 }
 const source=runtime.LEVELS.find(l=>l.id===base.sourceLevelId);assert(source);
 const old=[];if(!qualificationOnly)assert.equal(runtime.priorDailySlots.size,450,'Complete original450 design baseline required');
 for(const prior of runtime.priorDailySlots.values()){
  const q=await read(prior.sourceReport,prior.sourceReportSha256);assert.equal(levelSha256(q.level),prior.levelSha256,'Old450 actual object');
  old.push({formalId:prior.formalId??q.formalId,level:q.level});
 }
 const family={qualificationOnly,issues:[],ancestors:[],liveRoots:[],visualSkeletonMatches:[]};
 if(!qualificationOnly){
  const seed=await read(CAPACITY_SEED_BINDINGS.path,CAPACITY_SEED_BINDINGS.sha256),lineages=createReferenceLineageReader();
  const history=await read(seed.historicalSelection.path,seed.historicalSelection.sha256);assert.equal(history.files.length,150);
  const unpack=async q=>q.historicalProof?read(q.historicalProof.path,q.historicalProof.sha256):q;
  const live=[];for(const q of selected)live.push(await unpack(q));
  const compatible=live.map(q=>({...q,baseInputFile:q.baseInputFile??q.baseReceipt?.path}));
  assert(compatible.every(q=>q.baseInputFile),'Selected family provenance missing');
  const retired=await historicalPromotedFamilies(seed.historicalSelection.path,compatible),ancestry=lineages.inspect(baseReceipt.path);
  for(const promotion of retired.values()){
   await read(promotion.retired.receipt,promotion.retired.receiptSha256);
   await read(promotion.proposal.path,promotion.proposal.sha256);
   await read(promotion.sourceIndex.path,promotion.sourceIndex.sha256);
   for(const input of [promotion.retired.baseInputFile,promotion.proposal.path]){
    const a=lineages.inspect(input);for(const p of [input,...a.ancestors,...a.roots])await read(p);
   }
  }
  family.ancestry=ancestry;
  if(ancestry.unknownReasons.length||ancestry.roots.length!==1)family.issues.push('unresolved-base-family');
  if(ancestry.roots.some(r=>retired.has(r)))family.issues.push('retired-promoted-family');
  for(const q of compatible){const a=lineages.inspect(q.baseInputFile);
   await read(q.baseInputFile,q.baseInputFileSha256??q.baseReceipt?.sha256);
   for(const p of [...a.ancestors,...a.roots])await read(p);
   const shared=ancestry.roots.filter(r=>a.roots.includes(r));if(shared.length)family.liveRoots.push({formalId:q.formalId,roots:shared});
  }
  if(family.liveRoots.length)family.issues.push('already-live-local-family');
  for(const p of [baseReceipt.path,...ancestry.ancestors,...ancestry.roots]){await read(p);family.ancestors.push({path:p,sha256:bindings[p]});}
  const excluded=new Set(),skeletons=[];const exclusions=await read(`${root}/proof/preselection-visual-exclusions.json`);
  for(const item of exclusions.records){const review=await read(item.reviewFile,item.reviewSha256);assert(review.rootActuallyViewed&&review.decision==='REJECT_REPEATED_VISUAL_FAMILY');
   const q=await read(review.candidate.path,review.candidate.sha256);const image=await fs.readFile(review.actualImage.path);assert.equal(sha(image),review.actualImage.sha256);bindings[review.actualImage.path]=review.actualImage.sha256;
   excluded.add(designFingerprints(q.level).designSha256);
  }
  let file=seed.historicalSelection.path;const seen=new Set();
  while(file){assert(!seen.has(file));seen.add(file);const h=await read(file);
   for(const r of h.visualCuration?.removed??[]){const q=await read(r.file),b=await read(q.baseInputFile,q.baseInputFileSha256);excluded.add(designFingerprints(b.level).designSha256);}
   if(h.visualCuration?.reviewFile){const q=await read(h.visualCuration.reviewFile,h.visualCuration.reviewSha256);
    for(const f of q.families??[])if(f.decision==='KEEP_ONE_REPRESENTATIVE'&&f.exactSharedVisibleGeometryAndOuterColour?.anchors?.length&&f.gateTopologyAndColourEvidence?.allMembersExactlyEqual)skeletons.push({...f,reviewFile:h.visualCuration.reviewFile});}
   file=h.priorIndex;
  }
  if(excluded.has(designFingerprints(base.level).designSha256))family.issues.push('actual-visual-rejection');
  const anchor=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
  const gateKey=gs=>JSON.stringify(gs.map(g=>({side:g.side,offset:g.offset,size:g.size,color:g.color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  const anchors=new Set(base.level.blocks.map(anchor)),gates=gateKey([...(base.level.gates??[]),...(base.level.flipDoors??[])]);
  family.visualSkeletonMatches=skeletons.filter(f=>gateKey(f.gateTopologyAndColourEvidence.canonicalTopology)===gates&&f.exactSharedVisibleGeometryAndOuterColour.anchors.every(b=>anchors.has(anchor(b)))).map(f=>({source:f.source,reviewFile:f.reviewFile}));
  if(family.visualSkeletonMatches.length)family.issues.push('retired-visual-skeleton');
 }
 return{bindings,selectionBinding,family,inspect(level){
  const sourceComparison=compareLayouts(level,source),issues=[...family.issues];if(sourceComparison.footprintSimilarity>.55+1e-12)issues.push('source-footprint-over-.55');
  let nearestOld={similarity:0};for(const q of old){const similarity=compareLayouts(level,q.level).footprintSimilarity;if(similarity>nearestOld.similarity)nearestOld={formalId:q.formalId,similarity};}
  if(nearestOld.similarity>.75+1e-12)issues.push('old450-footprint-over-.75');
  const comparisons=selected.map(q=>({formalId:q.formalId,sameGroup:q.stageKey===slot.stageKey&&q.difficulty===slot.difficulty,
   similarity:compareLayouts(level,q.level).footprintSimilarity}));
  for(const q of comparisons)if(q.similarity>(q.sameGroup?.65:.75)+1e-12)issues.push(`selected-near:${q.formalId}`);
  return{passed:issues.length===0,issues,sourceComparison,nearestOld,selectedComparisons:comparisons,family,selectionBinding,
   policy:{sourceMaximum:.55,old450Maximum:.75,sameGroupMaximum:.65,globalMaximum:.75},newSearches:0};
 }};
}

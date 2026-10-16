import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {createReferenceLineageReader} from '../formal-v3/reference-lineage.mjs';
import {prepareConstraintDesignContext,CONSTRAINT_SEED139} from './constraint-design-context.mjs';
import {ACCEPTED_LOW_BAND_BASES,LOW_BAND_BASE_AUDIT} from './accepted-low-band-base.mjs';
import {CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

export const LOW_BAND_SEED147=Object.freeze({path:'deliverables/daily-formal-v4-20261008/selection/gate-aware-basic-147-01/index.json',
 sha256:'049a2cea87672b4fbf54afdb06ae01d8b3c964af85a0e9447c23b5ec3e1f39dd'});
export const LOW_BAND_TWO_PROPOSAL=Object.freeze({path:'deliverables/daily-formal-v4-20261008/design/low-band-two-advanced-plan-01/plan.json',
 sha256:'c979477f2ca6d41cf201a5919b65007d6741e89bd41f8afd4d345f846c71d02d'});
const sha=b=>createHash('sha256').update(b).digest('hex'),normal=p=>path.resolve(p);
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const partition=level=>levelSha256(level.blocks.map(cells).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const shapeInventory=bs=>levelSha256(bs.map(b=>b.shape.map(p=>p.join(',')).sort().join(';')).sort());

/** Extra new-entry checks before the inherited complete persisted-sidecar,
 * public-math and construction verifier. This predicate alone grants nothing. */
export function assertLowBandAdvancedAppend(q,row,entrySha){
 assert.equal(q.lowBandAdvancedSlotVersion,'daily300-two-audited-low-band-advanced-once-v1');
 assert.equal(q.status,'LOW_BAND_ADVANCED_300_CANDIDATE_VERIFIED_AWAITING_POINTER');
 assert(q.accepted===true&&q.catalogEligible===true&&q.qualificationOnly===false&&q.formalReady===false);
 assert.deepEqual(Object.fromEntries(Object.keys(row.slot).map(k=>[k,q[k]])),row.slot);
 assert.equal(q.baseReceipt.path,row.base.path);assert.equal(q.baseReceipt.sha256,row.base.sha256);
 assert.equal(q.sourceLevelId,row.sourceLevelId);assert.equal(q.baseLevelSha256,row.baseLevelSha256);assert.equal(q.baseRouteSha256,row.baseRouteSha256);
 assert.deepEqual(q.declaredTwoSlotPlan,LOW_BAND_TWO_PROPOSAL);
 assert.equal(q.acceptedBaseReadiness?.status,'AUDITED_LOW_BAND_BASE_READY_FOR_ONE_MECHANISM_CONSTRUCTION');
 assert.deepEqual(q.acceptedBaseReadiness.baseReceipt,row.base);assert.deepEqual(q.acceptedBaseReadiness.independentMathematicsAudit,LOW_BAND_BASE_AUDIT);
 assert.equal(q.acceptedBaseReadiness.base.levelSha256,row.baseLevelSha256);
 assert.equal(q.acceptedBaseReadiness.base.routeSha256,row.baseRouteSha256);
 assert.equal(q.designBindings['tools/daily-challenge/formal-v4/qualify-low-band-advanced-slot.mjs'],entrySha);
 assert(q.constructionAttemptStarted&&q.finalProofStarted&&q.mathematicalEvidenceValidated&&q.mechanismStrengthValidated&&q.designValidated);
 assert.equal(q.mathematicalProof?.accepted,true);assert.equal(q.mathematicalProof.levelSha256,q.levelSha256);
 assert.notEqual(q.levelSha256,q.baseLevelSha256,'Mechanism admission needs an actually changed final object');
 assert(q.strength?.passed&&q.strength.participation?.passed);assert.equal(q.strength.mechanism,row.slot.newestMechanism);
 assert.deepEqual(inspectConstructionAccounting(q.construction?.constructionAccounting),[]);
 const source=q.selectionContext?.sourceClassification;assert.equal(source?.sourceType,'SUBSTANTIAL_CONNECTED_REGION_REDRAFT');assert.equal(source.directWholeBoard,false);
 assert.equal(source.independentMathematicsAudit.sha256,LOW_BAND_BASE_AUDIT.sha256);
 if(row.slot.newestMechanism==='key-lock')assert.deepEqual(q.configuration,{keyBlockIds:row.construction.keys.map(k=>k.blockId),locks:row.construction.locks.map(({id,count})=>({id,count}))});
}

/** This is a provenance classification of exactly two reviewed large-region
 * redrafts, not a claim that their entire boards were generated independently. */
export function inspectSubstantialRegionRedraft(baseDescriptor,base,input,reference){
 const known=ACCEPTED_LOW_BAND_BASES.find(d=>normal(d.path)===normal(baseDescriptor.path)&&d.sha256===baseDescriptor.sha256);
 assert(known,'No arbitrary third packet may acquire the two-base redraft classification');
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
 assert(changed.length&&changed.some(b=>b.id===p.realSharedBodyRecoloured),'Actual shared body colour must change');
 assert.equal(p.newShapeInventory,true);assert.equal(p.sourceMaskRetained,true);assert.equal(p.allExternalBodiesByteEquivalent,true);
 const forbidden=new Set(r.bodyIds);assert(input.prefixDrags.every(d=>!forbidden.has(d.blockId)),'Reference prefix operated on the rebuilt region');
 return{sourceType:'SUBSTANTIAL_CONNECTED_REGION_REDRAFT',directWholeBoard:false,originalReference:p.reference,
  sharedOriginalAncestryDisclosed:true,regionArea:region.size,boardArea:actualArea,regionFraction:region.size/actualArea,
  actualPartitionSha256:partition(input.level),referencePartitionSha256:partition(reference.level),
  actualChangedSharedIds:changed.map(b=>b.id),independentMathematicsAudit:LOW_BAND_BASE_AUDIT,
  scope:'Only these two exact original packets; the historical local-variant family policy is unchanged for all other inputs'};
}

export async function prepareLowBandAdvancedContext(runtime,baseReceipt,base,slot,selected,selectionContext,{
 qualificationOnly=false,constructionLedgerDirectory=CONSTRUCTION_LEDGER,publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 if(qualificationOnly&&!selectionContext)return prepareConstraintDesignContext(runtime,baseReceipt,base,slot,selected,null,
  {qualificationOnly,constructionLedgerDirectory,publicLedgerDirectory});
 const bindings={},read=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const b=await fs.readFile(d.path);
  assert.equal(sha(b),d.sha256,`Changed advanced context input: ${d.path}`);bindings[d.path]=d.sha256;return JSON.parse(b);};
 const context=await read(selectionContext),seed=await read(LOW_BAND_SEED147),proposal=await read(LOW_BAND_TWO_PROPOSAL);
 assert.equal(context.schemaVersion,4);assert.equal(context.scope,300);assert.deepEqual(context.seedIndex,LOW_BAND_SEED147);
 assert.equal(seed.files.length,147);assert.deepEqual(context.files.slice(0,147),seed.files,'Exact147 prefix cannot be omitted or reordered');
 assert(context.files.length<=149&&selected.length===context.files.length);assert.equal(new Set(context.files).size,context.files.length);
 assert.deepEqual(Object.keys(context.fileBindings).sort(),[...context.files].sort());
 const actual=[];for(const [i,p]of context.files.entries()){const q=await read({path:p,sha256:context.fileBindings[p]});
  assert.deepEqual(q,selected[i]);assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));actual.push(q);}
 assert.equal(new Set(actual.map(q=>q.formalId)).size,actual.length);
 const row=proposal.rows.find(r=>r.base.path===baseReceipt.path&&r.base.sha256===baseReceipt.sha256);assert(row,'Fixed two-row base descriptor');
 assert.deepEqual(slot,row.slot,'No alternative advanced stage for this base');
 const entryPath='tools/daily-challenge/formal-v4/qualify-low-band-advanced-slot.mjs',entrySha=sha(await fs.readFile(entryPath));bindings[entryPath]=entrySha;
 for(const q of actual.slice(147)){
  const declared=proposal.rows.find(r=>r.slot.formalId===q.formalId&&r.base.path===q.baseReceipt?.path&&r.base.sha256===q.baseReceipt?.sha256);
  assert(declared,'Unplanned appended receipt');assertLowBandAdvancedAppend(q,declared,entrySha);
 }
 const basic=await read(seed.newAdmission);assert.equal(seed.files[146],seed.newAdmission.path);assert.deepEqual(basic,actual[146]);
 assert.equal(basic.admissionVersion,'gate-aware-basic-readonly-admission-v1');assert(basic.catalogEligible&&basic.accepted&&!basic.qualificationOnly);
 assert.equal(basic.newSearches,0);assert.equal(basic.newLedgerClaims,0);assert.equal(basic.formalReady,false);
 assert.deepEqual(basic.inputSelection,seed.inputSelection);const previous=await read(seed.inputSelection);assert.deepEqual(previous.files,seed.files.slice(0,146));
 assert.equal(levelSha256(basic.admissionBindings),basic.admissionToolchainSha256);
 for(const [p,h]of Object.entries(basic.admissionBindings)){assert.equal(sha(await fs.readFile(p)),h,`Actual147 admission dependency changed: ${p}`);bindings[p]=h;}
 for(const p of seed.files.slice(0,146))assert.equal(context.fileBindings[p],basic.admissionBindings[p]??basic.admissionBindings[normal(p)],'Immutable146 bytes changed');
 const math=await read(basic.mathematicalProof),audit=await read(basic.independentMathematicalAudit);
 assert.equal(audit.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(audit.errors,[]);assert.equal(audit.newSearches,0);
 assert(audit.results.some(r=>r.file===basic.mathematicalProof.path&&r.sha256===basic.mathematicalProof.sha256&&r.accepted&&r.L===basic.L&&r.U===basic.U));
 assert(math.accepted&&!math.qualificationOnly&&math.mathematicalEvidenceValidated);
 for(const k of ['levelSha256','routeSha256','L','U','sourceLevelId'])assert.equal(math[k],basic[k]);
 for(const k of ['level','drags','attempt','lowerBound','route'])assert.deepEqual(math[k],basic[k]);
 const requestPath=path.join(publicLedgerDirectory,`${math.attempt.id}.request.json`),resultPath=path.join(publicLedgerDirectory,`${math.attempt.id}.result.json`);
 const requestBytes=await fs.readFile(requestPath),resultBytes=await fs.readFile(resultPath),request=JSON.parse(requestBytes),result=JSON.parse(resultBytes);
 bindings[requestPath]=sha(requestBytes);bindings[resultPath]=sha(resultBytes);assert.deepEqual(request,math.attempt);
 assert(result.accepted&&result.status===math.status&&result.levelSha256===basic.levelSha256);assert.deepEqual(result.lower,math.lowerBound.result);assert.equal(result.upper,null);
 assert(math.lowerBound.result.thresholdProven&&math.lowerBound.result.floor===31&&math.lowerBound.result.termination==='below-threshold-exhausted');
 assert(math.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound<=10000&&math.upperAccounting.conservativeFullBoardStateUpperBound<=10000);
 assert.deepEqual(basic.toolchainBindings,runtime.toolchainBindings);
 for(const replay of [basic.freshCanonicalReplay,basic.freshIndependentReplay])assert(replay.valid&&replay.complete&&!replay.failed&&replay.nonClearingDrags===basic.U);
 const input=await read(base.input),reference=await read(input.provenance.reference),classification=inspectSubstantialRegionRedraft(baseReceipt,base,input,reference);
 const ancestry=createReferenceLineageReader().inspect(base.input.path);assert.equal(ancestry.roots.length,1);assert.deepEqual(ancestry.unknownReasons,[]);
 classification.actualAncestry=ancestry;
 const subFiles=context.files.filter((p,i)=>i!==146),subSelected=actual.filter((q,i)=>i!==146),subcontext={schemaVersion:4,scope:300,seedIndex:CONSTRAINT_SEED139,
  files:subFiles,fileBindings:Object.fromEntries(subFiles.map(p=>[p,context.fileBindings[p]])),fullSelectionContext:selectionContext,
  auditScope:'genuine139-and-constraint-capacity-sidecars; separately-bound-basic147',formalReady:false};
 const data=JSON.stringify(subcontext,null,2)+'\n',directory=path.join(constructionLedgerDirectory,'low-band-contexts');await fs.mkdir(directory,{recursive:true});
 const p=path.join(directory,`${sha(data)}.json`);try{await fs.writeFile(p,data,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;assert.equal(await fs.readFile(p,'utf8'),data);}
 // The inherited reader receives the REAL construction input solely as its
 // design-family reference. Mathematical admission keeps the original receipt.
 const inherited=await prepareConstraintDesignContext(runtime,base.input,base,slot,subSelected,{path:p,sha256:sha(data)},
  {qualificationOnly,constructionLedgerDirectory,publicLedgerDirectory});Object.assign(bindings,inherited.bindings);
 const replacedLocalRules=new Set(['already-live-local-family','already-live-basic-reference-family']);
 const selectionBinding={...selectionContext,seedIndex:LOW_BAND_SEED147,count:actual.length,fileBindings:context.fileBindings,
  inheritedSubset:inherited.selectionBinding,independentBasic147:seed.newAdmission,sourceClassification:classification,currentRuntimeValidationClaimed:false};
 return{bindings,selectionBinding,family:{...inherited.family,sourceClassification:classification},inspect(level){
  const original=inherited.inspect(level),issues=original.issues.filter(x=>!replacedLocalRules.has(x));
  const s=compareLayouts(level,basic.level).footprintSimilarity,sameGroup=slot.stageKey===basic.stageKey&&slot.difficulty===basic.difficulty;
  if(s>(sameGroup?.65:.75)+1e-12)issues.push(`selected-near:${basic.formalId}`);
  return{...original,passed:issues.length===0,issues,sourceClassification:classification,
   supersededLocalVariantDiagnostics:original.issues.filter(x=>replacedLocalRules.has(x)),
   retainedRejectionPolicies:['retired-promoted-family','actual-visual-rejection','retired-visual-skeleton','all-source-old450-selected-nearness'],
   selectedComparisons:[...original.selectedComparisons,{formalId:basic.formalId,sameGroup,similarity:s}],selectionBinding,completeSelectedCount:actual.length};
 }};
}

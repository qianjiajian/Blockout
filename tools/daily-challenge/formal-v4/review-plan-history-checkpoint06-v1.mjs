import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';

// A separate reconstruction from05 plus all original ordered deltas. The
// author's merged state, summary or payload is never used to reconstruct it.
const V='deliverables/daily-formal-v4-20261008/',P=V+'proof/',T='tools/daily-challenge/formal-v4/';
export const SELF=T+'review-plan-history-checkpoint06-v1.mjs';
const BASE=P+'plan-history-checkpoint-06',OUT=BASE+'/independent-review.json';
const ORIGINAL={path:P+'plan-history-checkpoint-05/checkpoint.json',sha256:'c643bcc0990aeca4d6fde3be2d883068bbb9744bdd6512cb3c7754244a04af1d'};
const REVIEW={path:P+'plan-history-checkpoint-05/independent-review.json',sha256:'a0ce8b0b892776bc5801e8a15b2d11125660d1fba63e1e718229bda1607e33d1'};
export const AUTHOR_SCRIPT={path:T+'reseal-plan-history-checkpoint06-v1.mjs',sha256:'ed8cc5562dd9de1644741e2e4a80dfe97952caf965310bb4b759d6294254a896'};
const pins={adapter:{path:T+'plan-history-adapter-v7.mjs',sha256:'c0172b125bbf34bd4be2d39c66c0b209a4230828909b85baf1622830efda99dc'},compiler:{path:T+'canonical-history-path-compiled.mjs',sha256:'8682bb896edd01d6204a3c3d6128fd600cc8313aedd44820816c4b494d1e6ed7'}};
const ADAPTER_QUALIFICATION={path:P+'plan-history-adapter-v7-independent-01/report.json',sha256:'ab112fb5fb25cca3aeea43695c430b00bca26fa1034400103756e155fac74ba2'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Actual descriptor required');

/** Compared one top-level field at a time; no pruning in either object.
 * consume=true releases only the newly parsed candidate AFTER its field passed,
 * never changes the reconstructed bundle or the saved checkpoint bytes. */
export function compareEveryCheckpointField(candidate,reconstructed,{consume=false}={}){
 const keys=Object.keys(reconstructed);assert.deepEqual(Object.keys(candidate),keys,'No added, removed, renamed or reordered top-level field');const compared=[];
 for(const field of keys){assert.deepEqual(candidate[field],reconstructed[field],'Reseal differs at '+field);compared.push({field,arrayLength:Array.isArray(candidate[field])?candidate[field].length:null});if(consume)delete candidate[field];}
 if(consume)assert.equal(Object.keys(candidate).length,0);return compared;
}

export async function reviewCheckpoint06(supplied){
 const paths={checkpoint:BASE+'/checkpoint.json',authorReport:BASE+'/report.json',provenance:BASE+'/reseal-provenance.json'};
 assert.deepEqual(Object.keys(supplied).sort(),[...Object.keys(paths),'latestHistoryReport'].sort());for(const[k,p]of Object.entries(paths)){descriptor(supplied[k]);assert.equal(supplied[k].path,p);}descriptor(supplied.latestHistoryReport);
 assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');await fs.lstat(OUT).then(()=>{throw Error('Immutable review exists');},e=>{if(e.code!=='ENOENT')throw e;});
 const bindings={},phases=[],errors=[];let result={};
 async function bytes(p){const b=await fs.readFile(p),h=sha(b);if(bindings[p])assert.equal(bindings[p],h,'Evidence drift '+p);bindings[p]=h;return b;}
 async function read(d){descriptor(d);const b=await bytes(d.path);assert.equal(sha(b),d.sha256,d.path);return JSON.parse(b);}
 async function pin(d){descriptor(d);assert.equal(sha(await bytes(d.path)),d.sha256,d.path);}
 try{
  for(const d of Object.values(pins))await pin(d);await pin(AUTHOR_SCRIPT);assert.equal(await fs.realpath(SELF),await fs.realpath(fileURLToPath(import.meta.url)));await bytes(SELF);
  const qualification=await read(ADAPTER_QUALIFICATION);assert.equal(qualification.status,'INDEPENDENT_PLAN_HISTORY_ADAPTER_V7_PASS');assert.deepEqual(qualification.errors,[]);assert.deepEqual(qualification.adapter,pins.adapter);for(const[p,sha256]of Object.entries(qualification.toolBindings))await pin({path:p,sha256});
  const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,planHistorySummary}=await import(pathToFileURL(path.resolve(pins.adapter.path)));
  const {compileCanonicalHistoryPath}=await import(pathToFileURL(path.resolve(pins.compiler.path)));
  const author=await read(supplied.authorReport),provenance=await read(supplied.provenance),h=await read(supplied.latestHistoryReport),oldReview=await read(REVIEW);
  assert.equal(author.status,'PLAN_HISTORY_CHECKPOINT_RESEALED_AWAITING_INDEPENDENT_REVIEW');assert.deepEqual(author.errors,[]);assert.deepEqual(author.exportScript,AUTHOR_SCRIPT);assert.equal(provenance.version,'plan-history-reseal-provenance-v2');
  for(const[k,d]of Object.entries({checkpoint:supplied.checkpoint,provenance:supplied.provenance,latestHistoryReport:supplied.latestHistoryReport,originalCheckpoint:ORIGINAL,originalReview:REVIEW}))assert.deepEqual(author[k],d);
  for(const[k,d]of Object.entries({originalCheckpoint:ORIGINAL,originalReview:REVIEW,latestHistoryReport:supplied.latestHistoryReport,originalProvenance:oldReview.provenance}))assert.deepEqual(provenance[k],d);
  assert.equal(h.status,'ACCEPTED_ICE20_BOMB_HISTORY_DELTAS_EXPORTED_AND_V7_VALIDATED');assert.deepEqual(h.errors,[]);assert.deepEqual(h.checkpoint,ORIGINAL);assert.deepEqual(h.checkpointReview,REVIEW);
  assert(Array.isArray(h.priorHistoryDeltas)&&h.priorHistoryDeltas.length>0);assert.equal(h.historyDeltas.length,2);assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.kind),['construction','mathematical']);
  const ordered=[...h.priorHistoryDeltas,...h.historyDeltas];assert.deepEqual(h.completeHistoryDeltas,ordered);assert.equal(new Set(ordered.map(x=>x.descriptor.path)).size,ordered.length);for(const x of ordered){descriptor(x.descriptor);descriptor(x.declaredOwner.definition);}
  assert.equal(h.previousHeadSha256,h.priorHistoryDeltas.at(-1).descriptor.sha256);assert.equal(h.headSha256,ordered.at(-1).descriptor.sha256);assert.deepEqual(author.orderedDeltas,ordered);assert.deepEqual(provenance.orderedDeltas,ordered);assert.equal(author.mergedHeadSha256,h.headSha256);assert.equal(provenance.previousHeadSha256,h.headSha256);
  assert.deepEqual(provenance.tools,pins);assert.deepEqual(provenance.adapterQualification,ADAPTER_QUALIFICATION);assert.deepEqual(provenance.originalCompactRule,{preserved:true,fields:['designInputBindings','designBindings','history','construction'],additionalFieldsOmitted:[]});
  for(const q of[author,provenance,h]){assert.equal(q.oldLiveByteIntegrityClaimed,false);for(const k of['newSearches','newConstructions','newLedgerClaims','newCspCalls','newReplayCalls'])assert.equal(q[k],0);}for(const q of[author,provenance])assert.equal(q.newModelCalls,0);
  assert.equal(h.oldFilesChanged,false);assert.equal(h.checkpointReexported,false);assert.equal(h.comparisonOnlyFactsMergedIntoSealedBase,false);assert.equal(provenance.allBundleFieldsPreserved,true);assert.equal(author.allFieldsPreserved,true);assert.equal(author.projectionSha256Recomputed,true);assert.equal(provenance.baselineMetadataUnchanged,true);assert.equal(provenance.supplementalComparisonMerged,false);
  for(const k of ['comparisonEvidence','selection','designDisposition'])assert.deepEqual(provenance[k],h[k]);
  const context=await read(h.context),plan=await read(h.plan),actual=await read(h.actualAudit),done=await read(h.completion),candidate=await read(done.receipt);await pin(h.planAudit);await pin(h.selection);await pin(h.designDisposition);const prior=await read(h.priorHistoryReport);assert.deepEqual(prior.completeHistoryDeltas,h.priorHistoryDeltas);assert.equal(prior.headSha256,h.previousHeadSha256);assert.deepEqual(prior.checkpoint,ORIGINAL);assert.deepEqual(prior.checkpointReview,REVIEW);await pin(h.qualification);
  assert.equal(context.version,'accepted-ice20-one-final-bomb-d3-v1');assert.equal(plan.version,context.version);assert.equal(done.version,context.version);assert.deepEqual(plan.contextDescriptor,h.context);assert.deepEqual(done.plan,h.plan);assert.equal(context.acceptedBaseAdaptation,true);assert.equal(context.targetSlot,'daily-mechanisms-bomb-120-d3-03');
  assert.deepEqual(context.history,ORIGINAL);assert.deepEqual(context.historyReview,REVIEW);assert.deepEqual(context.historyDeltas,h.priorHistoryDeltas);assert.equal(context.historyHeadSha256,h.previousHeadSha256);assert.equal(plan.historyHeadSha256,h.previousHeadSha256);assert.deepEqual(context.historyScope,h.historyScope);assert.equal(h.historyScope.roots.length,7);assert.deepEqual(context.selection,h.selection);assert.deepEqual(context.designDisposition,h.designDisposition);
  assert.equal(done.status,'ACCEPTED_ICE20_BOMB_TASK_CLOSED');assert.equal(done.closed,true);assert.equal(done.restartAllowed,false);assert.equal(done.finalizationError,null);assert.deepEqual(done.unpersistedInputs,[]);for(const k of ['maximumInputs','consumedInputs','formedFullWorlds'])assert.equal(done[k],1);
  assert.equal(candidate.version,context.version);assert.equal(candidate.sourceLevelId,118);assert(candidate.level&&candidate.levelSha256);assert.deepEqual(candidate.plan,h.plan);assert.equal(done.publicClaimsStarted,Number(!!candidate.attempt));assert.equal(done.accepted,Number(candidate.accepted));
  assert.equal(actual.status,'INDEPENDENT_ACCEPTED_ICE20_BOMB_ACTUAL_PASS');assert.equal(actual.mode,'actual');assert.deepEqual(actual.errors,[]);assert.deepEqual(actual.completion,h.completion);assert.deepEqual(actual.plan,h.plan);assert.deepEqual(actual.candidate,done.receipt);assert.equal(actual.accepted,done.accepted);
  assert.deepEqual(h.candidates,[done.receipt]);assert.deepEqual(h.constructorOwner,done.constructionOwner);assert.deepEqual(h.mathOwner,done.mathOwner);assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.definition),[done.constructionOwner,done.mathOwner]);
  assert.deepEqual(h.unpersistedInputs,[]);assert.equal(h.persistedConstructionWorldFiles.length,1);assert.deepEqual(h.persistedConstructionWorldFiles,done.persistedConstructionWorldFiles);assert.equal(h.summary.consumedInputs,1);assert.equal(h.summary.maximumInputs,1);assert.equal(h.summary.closedCampaigns,h.before.closedCampaigns+1);assert.equal(h.candidateStatuses.length,1);assert.equal(h.candidateStatuses[0].sourceLevelId,118);assert.equal(h.candidateStatuses[0].levelSha256,candidate.levelSha256);assert.equal(h.candidateStatuses[0].accepted,candidate.accepted);
  assert.deepEqual(provenance.actualBatch,{context:h.context,plan:h.plan,completion:h.completion,actualAudit:h.actualAudit,constructorOwner:done.constructionOwner,mathOwner:done.mathOwner});
  assert.deepEqual(provenance.continuity,{originalReportUnchanged:true,mergedLogicalHeadSha256:h.headSha256,newCheckpointHeadSha256:supplied.checkpoint.sha256,consumerBridgeRequired:true,newOrderedDeltas:[],exportedParentSummaryCopiedIntoCheckpoint:false,failedParentRolesMustBeAuthenticatedByConsumer:true});
  assert.equal(oldReview.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(oldReview.errors,[]);assert.equal(oldReview.allFieldsPreserved,true);assert.equal(oldReview.fullMergedBundleEquality,true);assert.deepEqual(oldReview.checkpoint,ORIGINAL);await pin(oldReview.provenance);await pin(oldReview.authorReport);
  const canonical=compileCanonicalHistoryPath(h.historyScope).canonical;
  async function listing(){const out={};for(const root of h.historyScope.roots){const stack=[root.physicalPath],names=[];while(stack.length){const dir=stack.pop();for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'Nested alias');const file=path.join(dir,e.name);if(e.isDirectory())stack.push(file);else{assert(e.isFile());names.push(file);}}}out[root.id]=names;}return out;}
  const digest=o=>Object.fromEntries(Object.entries(o).map(([id,n])=>[id,{count:n.length,canonicalNamesSha256:sha(JSON.stringify(n.map(canonical).sort()))}]));
  const before=await listing();let state=await consumePlanHistory({checkpoint:ORIGINAL,review:REVIEW,expectedScope:h.historyScope,readBytes:bytes});assert.equal(state.reviewedProjectionSha256,oldReview.summary.projectionSha256);
  const originalSelected=state.bundle.nearPools.selected,original450=state.bundle.nearPools.old450,originalExternal=state.bundle.externalPrivate,originalLegacy=state.bundle.terminalRecords.filter(x=>x.legacyPrivateResultFailure),owners=[];
  for(const[i,x]of ordered.entries()){
   const delta=await read(x.descriptor),definition=await read(x.declaredOwner.definition);assert.equal(delta.parentHeadSha256,state.headSha256);assert.deepEqual(delta.owner,x.declaredOwner);for(const key of ['id','namespace','kind'])assert.equal(definition[key],x.declaredOwner[key]);
   const declared=Object.fromEntries(h.historyScope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...state.bundle.files,...delta.files])if(f.rootId!==null){const key=canonical(f.path);assert(!seen.has(key));seen.add(key);declared[f.rootId].push(f.path);}
   state=await mergePlanHistoryDelta(state,{...x,listing:declared,readBytes:bytes});owners.push({delta:x.descriptor,declaredOwner:x.declaredOwner,definition});phases.push({delta:i+1,of:ordered.length,headSha256:state.headSha256,files:state.bundle.files.length});console.log(JSON.stringify(phases.at(-1)));
  }
  assert.equal(state.headSha256,h.headSha256);assert.deepEqual(provenance.owners,owners);assertPlanHistoryMembers(state,before);
  const checkpoint=await read(supplied.checkpoint),compared=compareEveryCheckpointField(checkpoint,state.bundle,{consume:true});
  assert.deepEqual(state.bundle.nearPools.selected,originalSelected);assert.deepEqual(state.bundle.nearPools.old450,original450);assert.deepEqual(state.bundle.externalPrivate,originalExternal);assert.deepEqual(state.bundle.terminalRecords.filter(x=>x.legacyPrivateResultFailure),originalLegacy);assert.equal(state.bundle.oldLiveByteIntegrityClaimed,false);
  for(const[k,n]of Object.entries({publicStocks:state.publicStocks.length,historyWorlds:state.nearPools.history.length,terminalRecords:state.bundle.terminalRecords.length,closedCampaigns:state.closedCampaigns.length}))assert.equal(h.summary[k],n);
  const summary=planHistorySummary(state.bundle);assert.deepEqual(summary,author.summary);for(const key of ['baselinePlan','baselineActual','scopeSha256'])assert.deepEqual(summary[key],oldReview.summary[key]);
  const after=await listing();assertPlanHistoryMembers(state,after);const membership=digest(after);assert.deepEqual(membership,digest(before));assert.deepEqual(membership,author.membership);assert.deepEqual(membership,provenance.membership);assert.deepEqual(Object.fromEntries(Object.entries(after).map(([id,n])=>[id,n.length])),h.sevenRootMemberCounts);
  for(const[p,hash]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),hash,'Final used evidence drift '+p);const final=await listing();assertPlanHistoryMembers(state,final);assert.deepEqual(digest(final),membership);
  result={summary,projectionSha256Recomputed:true,originalCheckpointProjectionSha256Recomputed:false,completeCheckpointBytesAuthenticated:true,fullMergedBundleEquality:true,allFieldsPreserved:true,comparedTopLevelFields:compared,orderedDeltas:ordered,mergedHeadSha256:state.headSha256,membership,completeBeforeAfterMembersEqual:true,externalPrivatePreserved:originalExternal.length,legacyPrivateFailuresPreserved:originalLegacy.length,baselineMetadataUnchanged:true,ownerProvenanceVerified:owners.length,consumerBridgeRequired:true};
 }catch(e){errors.push(e.stack??String(e));}
 const report={status:errors.length?'PLAN_HISTORY_CHECKPOINT_RESEAL_INDEPENDENT_REVIEW_FAILED':'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS',checkpoint:supplied.checkpoint,authorReport:supplied.authorReport,provenance:supplied.provenance,latestHistoryReport:supplied.latestHistoryReport,originalCheckpoint:ORIGINAL,originalReview:REVIEW,...result,phases,errors,fileBindings:bindings,oldLiveByteIntegrityClaimed:false,newSearches:0,newConstructions:0,newLedgerClaims:0,newModelCalls:0,newCspCalls:0,newReplayCalls:0,oldFilesChanged:false,limits:'Complete06 equals independently rebuilt05 plus the real post-n20 ordered owner deltas, preserving all fields and array order. Seven-root membership includes non-JSON locks. Used archive/delta/evidence bytes are authenticated; old raw/source/assets are not all rehashed. No new mathematics, acceptance or measured performance claim.'};
 const bytesOut=JSON.stringify(report,null,2)+'\n';await fs.writeFile(OUT,bytesOut,{flag:'wx'});const resultDescriptor={path:OUT,sha256:sha(bytesOut)};console.log(JSON.stringify({...resultDescriptor,status:report.status,errors:errors.length}));assert.equal(errors.length,0,errors.join('\n'));return resultDescriptor;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,4,'Immutable review configuration path and SHA256');const raw=await fs.readFile(process.argv[2]);assert.equal(sha(raw),process.argv[3]);await reviewCheckpoint06(JSON.parse(raw));}

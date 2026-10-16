import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';

// Metadata-only full-bundle reseal. No candidate, math, replay or ledger writer.
// Invocation requires the real sealed post-n20 report; no future head is pinned.
const V='deliverables/daily-formal-v4-20261008/',P=V+'proof/',T='tools/daily-challenge/formal-v4/';
export const SELF=T+'reseal-plan-history-checkpoint06-v1.mjs';
export const OUT=P+'plan-history-checkpoint-06';
export const ORIGINAL={path:P+'plan-history-checkpoint-05/checkpoint.json',sha256:'c643bcc0990aeca4d6fde3be2d883068bbb9744bdd6512cb3c7754244a04af1d'};
export const REVIEW={path:P+'plan-history-checkpoint-05/independent-review.json',sha256:'a0ce8b0b892776bc5801e8a15b2d11125660d1fba63e1e718229bda1607e33d1'};
export const TOOLS={adapter:{path:T+'plan-history-adapter-v7.mjs',sha256:'c0172b125bbf34bd4be2d39c66c0b209a4230828909b85baf1622830efda99dc'},compiler:{path:T+'canonical-history-path-compiled.mjs',sha256:'8682bb896edd01d6204a3c3d6128fd600cc8313aedd44820816c4b494d1e6ed7'}};
export const ADAPTER_QUALIFICATION={path:P+'plan-history-adapter-v7-independent-01/report.json',sha256:'ab112fb5fb25cca3aeea43695c430b00bca26fa1034400103756e155fac74ba2'};
export const PREDECESSOR={path:P+'plan-history-checkpoint-05/reseal-once.mjs',sha256:'817797155972c0306e9e7ba4e1f19849fc20cc8e1c606411332b3636f6463742'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Real exact descriptor required');
const zero={newSearches:0,newConstructions:0,newLedgerClaims:0,newCspCalls:0,newModelCalls:0,newReplayCalls:0};

/** Only declarations here. Original owner bytes and full membership are still
 * authenticated by the unchanged v7 consume/merge below. */
export function assertPostN20ResealInput(h,context,plan,done,actual,candidate){
 assert.equal(h.status,'ACCEPTED_ICE20_BOMB_HISTORY_DELTAS_EXPORTED_AND_V7_VALIDATED');assert.deepEqual(h.errors,[]);
 assert.deepEqual(h.checkpoint,ORIGINAL);assert.deepEqual(h.checkpointReview,REVIEW);
 for(const k of ['context','plan','completion','actualAudit','planAudit','priorHistoryReport','constructorOwner','mathOwner','selection','designDisposition'])descriptor(h[k]);
 assert(Array.isArray(h.priorHistoryDeltas)&&h.priorHistoryDeltas.length>0);assert.equal(h.historyDeltas.length,2);
 assert.deepEqual(h.completeHistoryDeltas,[...h.priorHistoryDeltas,...h.historyDeltas]);
 assert.equal(h.previousHeadSha256,h.priorHistoryDeltas.at(-1).descriptor.sha256);assert.equal(h.headSha256,h.completeHistoryDeltas.at(-1).descriptor.sha256);
 const seen=new Set();for(const x of h.completeHistoryDeltas){descriptor(x.descriptor);descriptor(x.declaredOwner?.definition);assert(!seen.has(x.descriptor.path));seen.add(x.descriptor.path);assert(['construction','mathematical'].includes(x.declaredOwner.kind));}
 assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.kind),['construction','mathematical']);
 assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.definition),[h.constructorOwner,h.mathOwner]);
 assert.equal(h.checkpointReexported,false);assert.equal(h.oldFilesChanged,false);assert.equal(h.oldLiveByteIntegrityClaimed,false);assert.equal(h.comparisonOnlyFactsMergedIntoSealedBase,false);
 for(const k of ['newSearches','newConstructions','newLedgerClaims','newCspCalls','newReplayCalls'])assert.equal(h[k],0);
 assert.equal(context.version,'accepted-ice20-one-final-bomb-d3-v1');assert.equal(plan.version,context.version);assert.equal(done.version,context.version);
 assert.deepEqual(plan.contextDescriptor,h.context);assert.deepEqual(done.plan,h.plan);assert.deepEqual(context.history,ORIGINAL);assert.deepEqual(context.historyReview,REVIEW);
 assert.deepEqual(context.historyDeltas,h.priorHistoryDeltas);assert.equal(context.historyHeadSha256,h.previousHeadSha256);assert.equal(plan.historyHeadSha256,h.previousHeadSha256);
 assert.deepEqual(context.historyScope,h.historyScope);assert.equal(h.historyScope.roots.length,7);assert.deepEqual(context.selection,h.selection);assert.deepEqual(context.designDisposition,h.designDisposition);
 assert.equal(context.targetSlot,'daily-mechanisms-bomb-120-d3-03');assert.equal(context.acceptedBaseAdaptation,true);
 assert.equal(done.status,'ACCEPTED_ICE20_BOMB_TASK_CLOSED');assert.equal(done.closed,true);assert.equal(done.restartAllowed,false);assert.equal(done.finalizationError,null);assert.deepEqual(done.unpersistedInputs,[]);
 for(const k of ['maximumInputs','consumedInputs','formedFullWorlds'])assert.equal(done[k],1);
 assert.deepEqual(done.constructionOwner,h.constructorOwner);assert.deepEqual(done.mathOwner,h.mathOwner);assert.deepEqual(h.candidates,[done.receipt]);
 assert.deepEqual(done.persistedConstructionWorldFiles,h.persistedConstructionWorldFiles);assert.equal(h.persistedConstructionWorldFiles.length,1);
 assert.equal(actual.status,'INDEPENDENT_ACCEPTED_ICE20_BOMB_ACTUAL_PASS');assert.equal(actual.mode,'actual');assert.deepEqual(actual.errors,[]);assert.deepEqual(actual.completion,h.completion);assert.deepEqual(actual.plan,h.plan);assert.deepEqual(actual.candidate,done.receipt);
 assert.equal(candidate.version,context.version);assert.deepEqual(candidate.plan,h.plan);assert(candidate.level&&candidate.levelSha256);assert.equal(candidate.sourceLevelId,118);
 assert.equal(done.publicClaimsStarted,Number(!!candidate.attempt));assert.equal(done.accepted,Number(candidate.accepted));assert.equal(actual.accepted,done.accepted);
 assert.equal(h.summary.maximumInputs,1);assert.equal(h.summary.consumedInputs,1);assert.equal(h.summary.closedCampaigns,h.before.closedCampaigns+1);
 assert.equal(h.candidateStatuses.length,1);assert.equal(h.candidateStatuses[0].sourceLevelId,118);assert.equal(h.candidateStatuses[0].levelSha256,candidate.levelSha256);assert.equal(h.candidateStatuses[0].accepted,candidate.accepted);
 assert.deepEqual(h.unpersistedInputs,[]);return h.completeHistoryDeltas;
}

export function membershipDigest(listing,canonical){return Object.fromEntries(Object.entries(listing).map(([id,names])=>[id,{count:names.length,canonicalNamesSha256:sha(JSON.stringify(names.map(canonical).sort()))}]));}
export function assertMergedCounts(state,h){for(const[k,n]of Object.entries({publicStocks:state.publicStocks.length,historyWorlds:state.nearPools.history.length,terminalRecords:state.bundle.terminalRecords.length,closedCampaigns:state.closedCampaigns.length}))assert.equal(h.summary[k],n,k);}

export async function resealCheckpoint06(supplied){
 assert.deepEqual(Object.keys(supplied),['latestHistoryReport']);descriptor(supplied.latestHistoryReport);assert(supplied.latestHistoryReport.path.replaceAll('\\','/').startsWith(P));
 assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');
 await fs.lstat(OUT).then(()=>{throw Error('Immutable output exists: '+OUT);},e=>{if(e.code!=='ENOENT')throw e;});await fs.mkdir(OUT);
 const bindings={},phases=[];async function bytes(p){const b=await fs.readFile(p),h=sha(b);if(bindings[p])assert.equal(bindings[p],h,'Evidence drift '+p);bindings[p]=h;return b;}
 async function read(d){descriptor(d);const b=await bytes(d.path);assert.equal(sha(b),d.sha256,d.path);return JSON.parse(b);}
 async function pin(d){descriptor(d);assert.equal(sha(await bytes(d.path)),d.sha256,d.path);}
 try{
  assert.equal(await fs.realpath(SELF),await fs.realpath(fileURLToPath(import.meta.url)));await bytes(SELF);await pin(PREDECESSOR);for(const d of Object.values(TOOLS))await pin(d);
  const qualification=await read(ADAPTER_QUALIFICATION);assert.equal(qualification.status,'INDEPENDENT_PLAN_HISTORY_ADAPTER_V7_PASS');assert.deepEqual(qualification.errors,[]);assert.deepEqual(qualification.adapter,TOOLS.adapter);for(const[p,sha256]of Object.entries(qualification.toolBindings))await pin({path:p,sha256});
  const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,planHistorySummary}=await import(pathToFileURL(path.resolve(TOOLS.adapter.path)));
  const {compileCanonicalHistoryPath}=await import(pathToFileURL(path.resolve(TOOLS.compiler.path)));
  const h=await read(supplied.latestHistoryReport),context=await read(h.context),plan=await read(h.plan),done=await read(h.completion),actual=await read(h.actualAudit),candidate=await read(done.receipt),oldReview=await read(REVIEW);
  const ordered=assertPostN20ResealInput(h,context,plan,done,actual,candidate);await pin(h.planAudit);await pin(h.selection);await pin(h.designDisposition);const prior=await read(h.priorHistoryReport);assert.deepEqual(prior.completeHistoryDeltas,h.priorHistoryDeltas);assert.equal(prior.headSha256,h.previousHeadSha256);assert.deepEqual(prior.checkpoint,ORIGINAL);assert.deepEqual(prior.checkpointReview,REVIEW);await pin(h.qualification);
  assert.equal(oldReview.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(oldReview.errors,[]);assert.deepEqual(oldReview.checkpoint,ORIGINAL);assert.equal(oldReview.fullMergedBundleEquality,true);assert.equal(oldReview.allFieldsPreserved,true);await pin(oldReview.provenance);await pin(oldReview.authorReport);
  const canonical=compileCanonicalHistoryPath(h.historyScope).canonical;
  async function listing(){const out={};for(const root of h.historyScope.roots){const names=[],stack=[root.physicalPath];while(stack.length){const dir=stack.pop();for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'Nested alias');const f=path.join(dir,e.name);if(e.isDirectory())stack.push(f);else{assert(e.isFile());names.push(f);}}}out[root.id]=names;}return out;}
  const before=await listing();let state=await consumePlanHistory({checkpoint:ORIGINAL,review:REVIEW,expectedScope:h.historyScope,readBytes:bytes});
  const keys=Object.keys(state.bundle),selected=state.bundle.nearPools.selected,old450=state.bundle.nearPools.old450,externalPrivate=state.bundle.externalPrivate,legacy=state.bundle.terminalRecords.filter(x=>x.legacyPrivateResultFailure),owners=[];
  for(const[i,x]of ordered.entries()){
   const delta=await read(x.descriptor),definition=await read(x.declaredOwner.definition);assert.equal(delta.parentHeadSha256,state.headSha256);assert.deepEqual(delta.owner,x.declaredOwner);for(const k of ['id','kind','namespace'])assert.equal(definition[k],x.declaredOwner[k]);
   const declared=Object.fromEntries(h.historyScope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...state.bundle.files,...delta.files])if(f.rootId!==null){const key=canonical(f.path);assert(!seen.has(key));seen.add(key);declared[f.rootId].push(f.path);}
   state=await mergePlanHistoryDelta(state,{...x,listing:declared,readBytes:bytes});owners.push({delta:x.descriptor,declaredOwner:x.declaredOwner,definition});const phase={phase:'metadata-merge',number:i+1,of:ordered.length,headSha256:state.headSha256};phases.push(phase);console.log(JSON.stringify(phase));
  }
  assert.equal(state.headSha256,h.headSha256);assertPlanHistoryMembers(state,before);assert.deepEqual(Object.keys(state.bundle),keys);assertMergedCounts(state,h);
  assert.deepEqual(state.bundle.nearPools.selected,selected);assert.deepEqual(state.bundle.nearPools.old450,old450);assert.deepEqual(state.bundle.externalPrivate,externalPrivate);assert.deepEqual(state.bundle.terminalRecords.filter(x=>x.legacyPrivateResultFailure),legacy);assert.equal(state.bundle.oldLiveByteIntegrityClaimed,false);
  const after=await listing();assertPlanHistoryMembers(state,after);const membership=membershipDigest(after,canonical);assert.deepEqual(membership,membershipDigest(before,canonical));assert.deepEqual(Object.fromEntries(Object.entries(after).map(([id,files])=>[id,files.length])),h.sevenRootMemberCounts);
  const summary=planHistorySummary(state.bundle);for(const key of ['baselinePlan','baselineActual','scopeSha256'])assert.deepEqual(summary[key],oldReview.summary[key]);
  const encoded=JSON.stringify(state.bundle)+'\n';assert(Buffer.byteLength(encoded)<=500000000,'Existing single-JSON byte cap');const checkpoint={path:OUT+'/checkpoint.json',sha256:sha(encoded)},exportScript={path:SELF,sha256:bindings[SELF]};
  const provenance={version:'plan-history-reseal-provenance-v2',originalCheckpoint:ORIGINAL,originalReview:REVIEW,originalProvenance:oldReview.provenance,latestHistoryReport:supplied.latestHistoryReport,orderedDeltas:ordered,owners,previousHeadSha256:state.headSha256,
   actualBatch:{context:h.context,plan:h.plan,completion:h.completion,actualAudit:h.actualAudit,constructorOwner:done.constructionOwner,mathOwner:done.mathOwner},tools:TOOLS,adapterQualification:ADAPTER_QUALIFICATION,
   originalCompactRule:{preserved:true,fields:['designInputBindings','designBindings','history','construction'],additionalFieldsOmitted:[]},membership,allBundleFieldsPreserved:true,baselineMetadataUnchanged:true,supplementalComparisonMerged:false,comparisonEvidence:h.comparisonEvidence,selection:h.selection,designDisposition:h.designDisposition,
   continuity:{originalReportUnchanged:true,mergedLogicalHeadSha256:h.headSha256,newCheckpointHeadSha256:checkpoint.sha256,consumerBridgeRequired:true,newOrderedDeltas:[],exportedParentSummaryCopiedIntoCheckpoint:false,failedParentRolesMustBeAuthenticatedByConsumer:true},oldLiveByteIntegrityClaimed:false,...zero};
  const provenanceBytes=JSON.stringify(provenance,null,2)+'\n',pd={path:OUT+'/reseal-provenance.json',sha256:sha(provenanceBytes)};
  for(const[p,hash]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),hash,'Final used evidence drift '+p);const final=await listing();assertPlanHistoryMembers(state,final);assert.deepEqual(membershipDigest(final,canonical),membership);
  const report={status:'PLAN_HISTORY_CHECKPOINT_RESEALED_AWAITING_INDEPENDENT_REVIEW',checkpoint,provenance:pd,exportScript,latestHistoryReport:supplied.latestHistoryReport,originalCheckpoint:ORIGINAL,originalReview:REVIEW,orderedDeltas:ordered,summary,mergedHeadSha256:state.headSha256,membership,fileBindings:bindings,errors:[],phases,
   allFieldsPreserved:true,projectionSha256Recomputed:true,oldLiveByteIntegrityClaimed:false,exportTimeAllOldRawBytesFullyChecked:false,usedArchiveAndDeltaBytesChecked:true,completeBeforeAfterMembersEqual:true,independentReviewRequired:true,performanceImprovementMeasured:false,...zero};
  await fs.writeFile(checkpoint.path,encoded,{flag:'wx'});await fs.writeFile(pd.path,provenanceBytes,{flag:'wx'});const b=JSON.stringify(report,null,2)+'\n';await fs.writeFile(OUT+'/report.json',b,{flag:'wx'});return{checkpoint,provenance:pd,report:{path:OUT+'/report.json',sha256:sha(b)},status:report.status};
 }catch(e){await fs.writeFile(OUT+'/incomplete.json',JSON.stringify({status:'PLAN_HISTORY_RESEAL_INCOMPLETE',latestHistoryReport:supplied.latestHistoryReport,errors:[e.stack??String(e)],phases,fileBindings:bindings,oldLiveByteIntegrityClaimed:false,...zero},null,2)+'\n',{flag:'wx'});throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,4,'Latest original report path and exact SHA256');console.log(JSON.stringify(await resealCheckpoint06({latestHistoryReport:{path:process.argv[2],sha256:process.argv[3]}})));}

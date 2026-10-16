import fs from 'node:fs/promises';
import {readHistoryPack,PACK_VERSION} from './plan-history-pack-v1.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {SELF as AUTHOR,REVIEWER as SELF,OUT,VERSION,ORIGINAL,ORIGINAL_REVIEW,TOOLS,BUDGET_CONTRACT,ADAPTER_REVIEW,ZERO,
 sha,descriptor,exactKeys,assertConfiguration,assertCheckpoint09Ready,readClosedSourceEvidence,assertSealedSourceContinuity,membershipDigest,MAX_PACK_BYTES,CHUNK_BYTES,compareEveryCheckpointField,bridgeFields,
 makeIO,authenticateTools,listSevenRoots,declaredMembers,writeExclusive,assertPackDirectory} from './reseal-plan-history-checkpoint09-v1.mjs';

// Independently reconstruct from the immutable08 full-value pack + ORIGINAL ordered
// deltas. Neither author.bundle, author.summary nor candidate checkpoint is a
// reconstruction input. Shared imports are IO/pure contracts, not a rebuild.
// SOURCE ONLY: enable only after root authorizes the exact reviewed tool bytes.
// Future artifact hashes belong to the separately authenticated configuration,
// not this tool's own bytes (which its implementation review must itself pin).
export const REVIEW_EXECUTION_READY=true;
export const PREPARED_REVIEW_CONFIGURATION=Object.freeze({
 version:'plan-history-checkpoint09-full-event-pack-v1',
 configuration:{path:'deliverables/daily-formal-v4-20261008/proof/plan-history-checkpoint09-execution-01/config.json',sha256:'PENDING'},
 checkpoint:{path:OUT+'/pack/manifest.json',sha256:'PENDING'},
 provenance:{path:OUT+'/reseal-provenance.json',sha256:'PENDING'},
 authorReport:{path:OUT+'/report.json',sha256:'PENDING'}
});
const EXPECTED_ORIGINAL_08={path:'deliverables/daily-formal-v4-20261008/proof/plan-history-checkpoint-08/pack/manifest.json',sha256:'812e163a36151a111f6964a1961ac1f2b2870dafa5b895a1cdcaf82c3b52cd27'};
const EXPECTED_ORIGINAL_REVIEW_08={path:'deliverables/daily-formal-v4-20261008/proof/plan-history-checkpoint-08/independent-review.json',sha256:'7511d598c08c61c28e8facd448762b4094cc46c1a6ccd7ca97352d3689e42362'};
export async function reviewCheckpoint09(reviewConfiguration){
 assert.equal(REVIEW_EXECUTION_READY,true,'Prepared source only: checkpoint09 review execution is not authorized');
 assertCheckpoint09Ready();
 descriptor(reviewConfiguration); // Actual configuration SHA required before IO.
 assert.equal(VERSION,'plan-history-checkpoint09-full-event-pack-v1');
 assert.equal(OUT,'deliverables/daily-formal-v4-20261008/proof/plan-history-checkpoint-09');
 assert.deepEqual(ORIGINAL,EXPECTED_ORIGINAL_08);assert.deepEqual(ORIGINAL_REVIEW,EXPECTED_ORIGINAL_REVIEW_08);
 const io=makeIO(),phases=[],errors=[];let result={},expectedBridge=null;
 const cfg=await io.read(reviewConfiguration);exactKeys(cfg,['version','configuration','checkpoint','provenance','authorReport']);assert.equal(cfg.version,VERSION);
 for(const k of ['configuration','checkpoint','provenance','authorReport'])descriptor(cfg[k]);
 for(const[k,file]of Object.entries({checkpoint:'pack/manifest.json',provenance:'reseal-provenance.json',authorReport:'report.json'}))assert.equal(cfg[k].path,OUT+'/'+file);
 const c=assertConfiguration(await io.read(cfg.configuration));await authenticateTools(io,c,import.meta.url);
 for(const file of ['independent-review.json','history-bridge.json'])await fs.lstat(OUT+'/'+file).then(()=>{throw Error('Immutable output exists: '+file);},e=>{if(e.code!=='ENOENT')throw e;});
 try{
  const author=await io.read(cfg.authorReport),provenance=await io.read(cfg.provenance);
  assert.equal(author.status,'PLAN_HISTORY_CHECKPOINT_RESEALED_AWAITING_INDEPENDENT_REVIEW');assert.deepEqual(author.errors,[]);
  assert.deepEqual(author.configuration,cfg.configuration);assert.deepEqual(author.checkpoint,cfg.checkpoint);assert.deepEqual(author.provenance,cfg.provenance);
  assert.deepEqual(author.exportScript,{path:AUTHOR,sha256:io.bindings[AUTHOR]});
  for(const q of [author,provenance]){for(const[k,v]of Object.entries(ZERO))assert.equal(q[k],v);assert.equal(q.oldLiveByteIntegrityClaimed,false);assert.deepEqual(q.latestHistoryReport,c.latestHistoryReport);assert.deepEqual(q.latestCompletion,c.latestCompletion);assert.deepEqual(q.latestExecutionExit,c.latestExecutionExit);assert.deepEqual(q.originalCheckpoint,ORIGINAL);assert.deepEqual(q.originalReview,ORIGINAL_REVIEW);}
  assert.equal(provenance.version,VERSION);assert.deepEqual(provenance.configuration,cfg.configuration);assert.deepEqual(provenance.tools,TOOLS);assert.deepEqual(provenance.budgetContract,BUDGET_CONTRACT);assert.deepEqual(provenance.adapterQualification,ADAPTER_REVIEW);assert.deepEqual(provenance.implementationReview,c.implementationReview);
  assert.equal(provenance.allBundleFieldsPreserved,true);assert.equal(provenance.unknownFieldsAndOrderPreserved,true);assert.deepEqual(provenance.additionalFieldsOmitted,[]);assert.equal(provenance.supplementalComparisonMerged,false);assert.equal(provenance.baselineMetadataUnchanged,true);
  assert.equal(author.allFieldsPreserved,true);assert.equal(author.projectionSha256Recomputed,true);assert.equal(author.completeBeforeAfterMembersEqual,true);assert.equal(author.independentReviewRequired,true);assert.equal(author.exportTimeAllOldRawBytesFullyChecked,false);assert.equal(author.usedArchiveAndDeltaBytesChecked,true);
  const source=await readClosedSourceEvidence(io,c),{h,done,plan,prior,ordered}=source;
  assert.deepEqual(author.sourceClosure,source.sourceClosure);assert.deepEqual(provenance.sourceClosure,source.sourceClosure);
  assert.deepEqual(author.orderedDeltas,ordered);assert.deepEqual(provenance.orderedDeltas,ordered);assert.equal(author.mergedHeadSha256,h.headSha256);
  assert.deepEqual(provenance.comparisonEvidence,h.comparisonEvidence);assert.deepEqual(provenance.previousUnsealedHistory,h.previousUnsealedHistory);
  assert.deepEqual(provenance.continuity,{mergedLogicalHeadSha256:h.headSha256,newCheckpointHeadSha256:cfg.checkpoint.sha256,newOrderedDeltas:[],consumerBridgeRequired:true,originalReportUnchanged:true});
  const oldReview=await io.read(ORIGINAL_REVIEW);assert.equal(oldReview.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(oldReview.errors,[]);assert.equal(oldReview.fullMergedBundleEquality,true);assert.equal(oldReview.allFieldsPreserved,true);assert.equal(oldReview.unknownFieldsAndOrderPreserved,true);assert.deepEqual(oldReview.checkpoint,ORIGINAL);await io.pin(oldReview.provenance);await io.pin(oldReview.authorReport);assert.deepEqual(provenance.originalProvenance,oldReview.provenance);
  const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,planHistorySummary}=await import(pathToFileURL(path.resolve(TOOLS.adapter.path)));
  const {compileCanonicalHistoryPath}=await import(pathToFileURL(path.resolve(TOOLS.compiler.path)));const canonical=compileCanonicalHistoryPath(h.historyScope).canonical;
  const before=await listSevenRoots(h.historyScope);let state=await consumePlanHistory({checkpoint:ORIGINAL,review:ORIGINAL_REVIEW,expectedScope:h.historyScope,readBytes:io.bytes});
  const originalKeys=Object.keys(state.bundle),owners=[];let priorProtection=null;
  assert.equal(prior.completeHistoryDeltas.length,24);assert.equal(ordered.length,26);
  for(const[i,x]of ordered.entries()){
   const delta=await io.read(x.descriptor),definition=await io.read(x.declaredOwner.definition);assert.equal(delta.parentHeadSha256,state.headSha256);assert.deepEqual(delta.owner,x.declaredOwner);
   state=await mergePlanHistoryDelta(state,{...x,listing:declaredMembers(state,delta,h.historyScope,canonical),readBytes:io.bytes});
   if(i+1===prior.completeHistoryDeltas.length)priorProtection=assertSealedSourceContinuity(state,source,{priorOnly:true});
   owners.push({delta:x.descriptor,declaredOwner:x.declaredOwner,definition});const phase={phase:'CHECKPOINT09_INDEPENDENT_METADATA_MERGE',number:i+1,total:ordered.length,headSha256:state.headSha256};phases.push(phase);console.log(JSON.stringify(phase));
  }
  assert(priorProtection,'Original24 failed-parent guard was not independently checked');
  const sourceProtection={prior:priorProtection,final:assertSealedSourceContinuity(state,source,{priorOnly:false})};
  assert.deepEqual(author.sourceProtection,sourceProtection);assert.deepEqual(provenance.sourceProtection,sourceProtection);
  assert.equal(state.headSha256,h.headSha256);assert.deepEqual(Object.keys(state.bundle),originalKeys);assert.deepEqual(provenance.owners,owners);assertPlanHistoryMembers(state,before);
  // The saved checkpoint is read ONLY after independent reconstruction.
  const candidate=await readHistoryPack(cfg.checkpoint,{readBytes:io.bytes,maxTotalBytes:MAX_PACK_BYTES});
  assert.equal(candidate.manifest.chunkTargetBytes,CHUNK_BYTES);assert.equal(candidate.manifest.maxTotalBytes,MAX_PACK_BYTES);
  const packDirectoryFiles=await assertPackDirectory(OUT+'/pack',candidate.manifest);assert.deepEqual(author.packDirectoryFiles,packDirectoryFiles);
  assert.deepEqual(provenance.storage,{format:PACK_VERSION,manifest:cfg.checkpoint,aggregateLimitBytes:MAX_PACK_BYTES,chunkTargetBytes:CHUNK_BYTES,totalChunkBytes:candidate.manifest.totalChunkBytes,logicalJsonBytes:candidate.manifest.jsonUtf8Bytes});
  const compared=compareEveryCheckpointField(candidate.value,state.bundle,{consume:true});
  const summary=planHistorySummary(state.bundle);assert.deepEqual(summary,author.summary);for(const k of ['baselinePlan','baselineActual','scopeSha256'])assert.deepEqual(summary[k],oldReview.summary[k]);
  assert.equal(summary.projectionSha256,candidate.manifest.canonicalProjectionSha256);
  const after=await listSevenRoots(h.historyScope);assertPlanHistoryMembers(state,after);const membership=membershipDigest(after,canonical);assert.deepEqual(membership,membershipDigest(before,canonical));assert.deepEqual(membership,author.membership);assert.deepEqual(membership,provenance.membership);
  await io.finalBytes();const final=await listSevenRoots(h.historyScope);assertPlanHistoryMembers(state,final);assert.deepEqual(membershipDigest(final,canonical),membership);
  assert.deepEqual(await assertPackDirectory(OUT+'/pack',candidate.manifest),packDirectoryFiles);
  expectedBridge=bridgeFields(c,h,cfg.checkpoint,cfg.provenance);
  result={summary,projectionSha256Recomputed:true,completeCheckpointBytesAuthenticated:true,fullMergedBundleEquality:true,allFieldsPreserved:true,unknownFieldsAndOrderPreserved:true,comparedTopLevelFields:compared,
   orderedDeltas:ordered,mergedHeadSha256:state.headSha256,membership,completeBeforeAfterMembersEqual:true,packDirectoryFiles,ownerProvenanceVerified:owners.length,baselineMetadataUnchanged:true,consumerBridgeRequired:true,expectedBridgeFields:expectedBridge,
   sourceClosure:source.sourceClosure,sourceProtection};
 }catch(e){errors.push(e.stack??String(e));}
 const report={status:errors.length?'PLAN_HISTORY_CHECKPOINT_RESEAL_INDEPENDENT_REVIEW_FAILED':'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS',checkpoint:cfg.checkpoint,authorReport:cfg.authorReport,provenance:cfg.provenance,
  configuration:cfg.configuration,reviewConfiguration,latestHistoryReport:c.latestHistoryReport,latestCompletion:c.latestCompletion,latestExecutionExit:c.latestExecutionExit,originalCheckpoint:ORIGINAL,originalReview:ORIGINAL_REVIEW,implementationReview:c.implementationReview,
  ...result,phases,errors,fileBindings:io.bindings,oldLiveByteIntegrityClaimed:false,oldFilesChanged:false,...ZERO,
  limits:'Complete09 full-value pack equals separately reconstructed08 full-value pack plus every original ordered owner delta; every field and JSON key/array order retained. Full entries, raw values, aliases, pending/failed guards and unknown metadata stay in the checkpoint. Seven-root membership includes non-JSON locks; used bytes are authenticated, not a fresh hash sweep of every archived old live file. No mathematics, acceptance, history pruning or measured performance claim.'};
 const rd=await writeExclusive(OUT+'/independent-review.json',report);assert.equal(errors.length,0,errors.join('\n'));
 const bridge=await writeExclusive(OUT+'/history-bridge.json',{...expectedBridge,checkpointReview:rd});
 return{review:rd,bridge,status:report.status};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,4,'Immutable review configuration path and SHA');console.log(JSON.stringify(await reviewCheckpoint09({path:process.argv[2],sha256:process.argv[3]})));}

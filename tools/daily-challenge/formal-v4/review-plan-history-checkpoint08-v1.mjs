import fs from 'node:fs/promises';
import {readHistoryPack,PACK_VERSION} from './plan-history-pack-v1.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {SELF as AUTHOR,REVIEWER as SELF,OUT,VERSION,ORIGINAL,ORIGINAL_REVIEW,TOOLS,ADAPTER_REVIEW,ZERO,
 sha,descriptor,exactKeys,assertConfiguration,assertClosedSource,membershipDigest,MAX_PACK_BYTES,CHUNK_BYTES,compareEveryCheckpointField,bridgeFields,
 makeIO,authenticateTools,listSevenRoots,declaredMembers,writeExclusive,assertPackDirectory} from './reseal-plan-history-checkpoint08-v1.mjs';

// Independently reconstruct from the immutable06 bytes + ORIGINAL ordered
// deltas. Neither author.bundle, author.summary nor candidate checkpoint is a
// reconstruction input. Shared imports are IO/pure contracts, not a rebuild.
export async function reviewCheckpoint08(reviewConfiguration){
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
  for(const q of [author,provenance]){for(const[k,v]of Object.entries(ZERO))assert.equal(q[k],v);assert.equal(q.oldLiveByteIntegrityClaimed,false);assert.deepEqual(q.latestHistoryReport,c.latestHistoryReport);assert.deepEqual(q.latestCompletion,c.latestCompletion);assert.deepEqual(q.originalCheckpoint,ORIGINAL);assert.deepEqual(q.originalReview,ORIGINAL_REVIEW);}
  assert.equal(provenance.version,VERSION);assert.deepEqual(provenance.configuration,cfg.configuration);assert.deepEqual(provenance.tools,TOOLS);assert.deepEqual(provenance.adapterQualification,ADAPTER_REVIEW);assert.deepEqual(provenance.implementationReview,c.implementationReview);
  assert.equal(provenance.allBundleFieldsPreserved,true);assert.equal(provenance.unknownFieldsAndOrderPreserved,true);assert.deepEqual(provenance.additionalFieldsOmitted,[]);assert.equal(provenance.supplementalComparisonMerged,false);assert.equal(provenance.baselineMetadataUnchanged,true);
  assert.equal(author.allFieldsPreserved,true);assert.equal(author.projectionSha256Recomputed,true);assert.equal(author.completeBeforeAfterMembersEqual,true);assert.equal(author.independentReviewRequired,true);assert.equal(author.exportTimeAllOldRawBytesFullyChecked,false);assert.equal(author.usedArchiveAndDeltaBytesChecked,true);
  const h=await io.read(c.latestHistoryReport),done=await io.read(c.latestCompletion),plan=await io.read(done.plan),prior=await io.read(h.priorHistoryReport);
  const ordered=assertClosedSource(c,h,done,plan,prior);await io.pin(done.config);await io.pin(done.input);if(done.receipt)await io.pin(done.receipt);
  assert.deepEqual(author.orderedDeltas,ordered);assert.deepEqual(provenance.orderedDeltas,ordered);assert.equal(author.mergedHeadSha256,h.headSha256);
  assert.deepEqual(provenance.comparisonEvidence,h.comparisonEvidence);assert.deepEqual(provenance.previousUnsealedHistory,h.previousUnsealedHistory);
  assert.deepEqual(provenance.continuity,{mergedLogicalHeadSha256:h.headSha256,newCheckpointHeadSha256:cfg.checkpoint.sha256,newOrderedDeltas:[],consumerBridgeRequired:true,originalReportUnchanged:true});
  const oldReview=await io.read(ORIGINAL_REVIEW);assert.equal(oldReview.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(oldReview.errors,[]);assert.equal(oldReview.fullMergedBundleEquality,true);assert.equal(oldReview.allFieldsPreserved,true);assert.deepEqual(oldReview.checkpoint,ORIGINAL);await io.pin(oldReview.provenance);await io.pin(oldReview.authorReport);assert.deepEqual(provenance.originalProvenance,oldReview.provenance);
  const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,planHistorySummary}=await import(pathToFileURL(path.resolve(TOOLS.adapter.path)));
  const {compileCanonicalHistoryPath}=await import(pathToFileURL(path.resolve(TOOLS.compiler.path)));const canonical=compileCanonicalHistoryPath(h.historyScope).canonical;
  const before=await listSevenRoots(h.historyScope);let state=await consumePlanHistory({checkpoint:ORIGINAL,review:ORIGINAL_REVIEW,expectedScope:h.historyScope,readBytes:io.bytes});
  const originalKeys=Object.keys(state.bundle),owners=[];
  for(const[i,x]of ordered.entries()){
   const delta=await io.read(x.descriptor),definition=await io.read(x.declaredOwner.definition);assert.equal(delta.parentHeadSha256,state.headSha256);assert.deepEqual(delta.owner,x.declaredOwner);
   state=await mergePlanHistoryDelta(state,{...x,listing:declaredMembers(state,delta,h.historyScope,canonical),readBytes:io.bytes});
   owners.push({delta:x.descriptor,declaredOwner:x.declaredOwner,definition});const phase={phase:'CHECKPOINT08_INDEPENDENT_METADATA_MERGE',number:i+1,total:ordered.length,headSha256:state.headSha256};phases.push(phase);console.log(JSON.stringify(phase));
  }
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
   orderedDeltas:ordered,mergedHeadSha256:state.headSha256,membership,completeBeforeAfterMembersEqual:true,packDirectoryFiles,ownerProvenanceVerified:owners.length,baselineMetadataUnchanged:true,consumerBridgeRequired:true,expectedBridgeFields:expectedBridge};
 }catch(e){errors.push(e.stack??String(e));}
 const report={status:errors.length?'PLAN_HISTORY_CHECKPOINT_RESEAL_INDEPENDENT_REVIEW_FAILED':'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS',checkpoint:cfg.checkpoint,authorReport:cfg.authorReport,provenance:cfg.provenance,
  configuration:cfg.configuration,reviewConfiguration,latestHistoryReport:c.latestHistoryReport,latestCompletion:c.latestCompletion,originalCheckpoint:ORIGINAL,originalReview:ORIGINAL_REVIEW,implementationReview:c.implementationReview,
  ...result,phases,errors,fileBindings:io.bindings,oldLiveByteIntegrityClaimed:false,oldFilesChanged:false,...ZERO,
  limits:'Complete08 full-value pack equals separately reconstructed06 plus every original ordered owner delta; every field and JSON key/array order retained. Full entries, raw values, aliases, pending/failed guards and unknown metadata stay in the checkpoint. Seven-root membership includes non-JSON locks; used bytes are authenticated, not a fresh hash sweep of every archived old live file. No mathematics, acceptance, history pruning or measured performance claim.'};
 const rd=await writeExclusive(OUT+'/independent-review.json',report);assert.equal(errors.length,0,errors.join('\n'));
 const bridge=await writeExclusive(OUT+'/history-bridge.json',{...expectedBridge,checkpointReview:rd});
 return{review:rd,bridge,status:report.status};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,4,'Immutable review configuration path and SHA');console.log(JSON.stringify(await reviewCheckpoint08({path:process.argv[2],sha256:process.argv[3]})));}

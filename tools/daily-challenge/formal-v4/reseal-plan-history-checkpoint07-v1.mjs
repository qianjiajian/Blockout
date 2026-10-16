import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';

// Administrative-only successor. Importing this module performs no history IO.
// Real execution requires a separately reviewed exact configuration, the final
// CLOSED original execution, and immutable tool qualification. Never prune the
// bundle or merge comparison-only / unsealed construction stock into it.
const P='deliverables/daily-formal-v4-20261008/proof/',T='tools/daily-challenge/formal-v4/';
export const SELF=T+'reseal-plan-history-checkpoint07-v1.mjs';
export const REVIEWER=T+'review-plan-history-checkpoint07-v1.mjs';
export const TEST=T+'plan-history-checkpoint07-v1.test.mjs';
export const OUT=P+'plan-history-checkpoint-07';
export const VERSION='plan-history-checkpoint07-full-bundle-v1';
export const ORIGINAL={path:P+'plan-history-checkpoint-06/checkpoint.json',sha256:'1208682b8fda75c9572e29c09eff39b20d6232fad328571fed6e096737cb83d3'};
export const ORIGINAL_REVIEW={path:P+'plan-history-checkpoint-06/independent-review.json',sha256:'511776220a3d13ad926b1d1610e5195d11e4324188c5239fa42a002af81678c3'};
export const TOOLS={adapter:{path:T+'plan-history-adapter-v16.mjs',sha256:'fd05219f45b8d10364c36aee1b1824b0b56b9439e9a03bcaef2646529c4a28ef'},compiler:{path:T+'canonical-history-path-compiled.mjs',sha256:'8682bb896edd01d6204a3c3d6128fd600cc8313aedd44820816c4b494d1e6ed7'}};
export const ADAPTER_REVIEW={path:P+'plan-history-adapter-v16-independent-01/report.json',sha256:'80ca5608db339934e9462db1c88d367549cdeca13b7a5cd36019020671cf53c9'};
export const ZERO={newSearches:0,newConstructions:0,newLedgerClaims:0,newModelCalls:0,newCspCalls:0,newReplayCalls:0};
export const MAX_BYTES=500000000;
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const descriptor=d=>{assert(d&&typeof d.path==='string'&&d.path.length,'Descriptor path required');assert(/^[a-f0-9]{64}$/.test(d.sha256??''),'Descriptor SHA required');};
export const exactKeys=(q,keys)=>assert.deepEqual(Object.keys(q).sort(),[...keys].sort(),'Unexpected schema');
export function assertConfiguration(c){
 exactKeys(c,['version','latestHistoryReport','latestCompletion','implementationReview']);assert.equal(c.version,VERSION);
 for(const k of ['latestHistoryReport','latestCompletion','implementationReview'])descriptor(c[k]);return c;
}
export function assertClosedSource(c,h,done,plan,prior){
 assertConfiguration(c);assert.equal(h.status,'AUTHORED_BASIC_HISTORY_DELTAS_EXPORTED');assert.deepEqual(h.errors,[]);
 assert.deepEqual(h.checkpoint,ORIGINAL);assert.deepEqual(h.checkpointReview,ORIGINAL_REVIEW);
 assert(h.historyScope&&h.historyScope.roots.length===7);assert.equal(h.oldLiveByteIntegrityClaimed,false);
 for(const k of ['newSearches','newConstructions','newLedgerClaims'])assert.equal(h[k],0,'Export metadata execution counter');
 for(const k of ['priorHistoryReport','previousUnsealedHistory'])descriptor(h[k]);
 for(const k of ['provenance','review'])descriptor(h.comparisonEvidence?.[k]);
 assert(Array.isArray(h.priorHistoryDeltas));assert(Array.isArray(h.historyDeltas)&&h.historyDeltas.length>0);
 const ordered=[...h.priorHistoryDeltas,...h.historyDeltas];assert.deepEqual(h.completeHistoryDeltas,ordered);
 assert.equal(new Set(ordered.map(x=>x.descriptor.path)).size,ordered.length,'Duplicate ordered delta');
 for(const x of ordered){descriptor(x.descriptor);descriptor(x.declaredOwner?.definition);assert(['construction','mathematical'].includes(x.declaredOwner.kind));assert(typeof x.declaredOwner.id==='string'&&x.declaredOwner.id.length);assert(typeof x.declaredOwner.namespace==='string'&&x.declaredOwner.namespace.length);}
 assert.equal(h.headSha256,ordered.at(-1).descriptor.sha256);
 assert.deepEqual(prior.errors,[]);assert.deepEqual(prior.checkpoint,ORIGINAL);assert.deepEqual(prior.checkpointReview,ORIGINAL_REVIEW);
 assert.deepEqual(prior.historyScope,h.historyScope);assert.deepEqual(prior.completeHistoryDeltas,h.priorHistoryDeltas);
 assert.equal(prior.headSha256,prior.completeHistoryDeltas.at(-1)?.descriptor.sha256??ORIGINAL.sha256);
 assert.deepEqual(prior.comparisonEvidence,h.comparisonEvidence,'Comparison evidence cannot be substituted');
 assert.equal(done.status,'AUTHORED_BASIC_SINGLE_INPUT_CLOSED');assert.equal(done.closed,true);assert.equal(done.normalExportAllowed,true);
 assert.equal(done.restartAllowed,false);assert.equal(done.administrativeError,null);assert.equal(done.newConstructions,0);
 assert.equal(done.unpersistedOriginalMathematicalResult,null);assert.deepEqual(done.unpersistedInputs,[]);
 for(const k of ['consumedInputs','maximumInputs','formedFullWorlds'])assert.equal(done[k],1);
 assert.equal(typeof done.version,'string');assert(done.version.length);assert.equal(plan.version,done.version);
 for(const k of ['config','plan','input','constructionOwner'])descriptor(done[k]);
 assert.deepEqual(done.historyExport,c.latestHistoryReport);assert.deepEqual(done.persistedConstructionWorldFiles,[done.input]);
 assert.deepEqual(plan.config,done.config);assert.deepEqual(plan.input,done.input);assert.equal(plan.experimentId,done.experimentId);
 assert.deepEqual(plan.historyReport,h.priorHistoryReport);assert.equal(plan.historyHeadSha256,prior.headSha256);assert.deepEqual(plan.historyScope,h.historyScope);
 for(const k of ['maximumInputs','jointCallsMaximum'])assert.equal(plan[k],1);
 assert.equal(plan.rawWholeBoardLimit,10000);for(const k of ['retryAllowed','rebandAllowed','fallbackAllowed'])assert.equal(plan[k],false);
 assert.equal(typeof done.qualifierEntered,'boolean');assert.equal(typeof done.qualifierReturned,'boolean');assert(!done.qualifierReturned||done.qualifierEntered);
 assert([0,1].includes(done.publicClaimsStarted),'Unknown claim cannot seal a closed head');
 const e=h.parentExecution;assert(e&&typeof e==='object');for(const k of ['qualifierEntered','qualifierReturned','publicClaimsStarted','receipt'])assert.deepEqual(e[k],done[k]);
 if(done.receipt===null){assert.equal(done.mathematicalReceiptPersisted,false);assert.equal(done.publicClaimsStarted,0);assert.equal(done.qualifierEntered,false);assert.equal(done.mathOwner,null);assert.equal(e.jointMathematicalCalls,0);}
 else{descriptor(done.receipt);assert.equal(done.mathematicalReceiptPersisted,true);assert.equal(done.qualifierReturned,true);assert([0,1,null].includes(e.jointMathematicalCalls));if(e.jointMathematicalCalls===null){assert.equal(done.publicClaimsStarted,1);assert(typeof e.nullCallCountMeaning==='string'&&e.nullCallCountMeaning.length,'Preserve original unknown call-count meaning');}}
 const owners=[done.constructionOwner];if(done.mathOwner!==null){descriptor(done.mathOwner);owners.push(done.mathOwner);}
 assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.definition),owners);
 assert.deepEqual(h.historyDeltas.map(x=>x.declaredOwner.kind),owners.length===2?['construction','mathematical']:['construction']);
 return ordered;
}
export function membershipDigest(listing,canonical){
 return Object.fromEntries(Object.entries(listing).map(([id,names])=>[id,{count:names.length,canonicalNamesSha256:sha(JSON.stringify(names.map(canonical).sort()))}]));
}
export function assertBundleByteCount(n){assert(Number.isSafeInteger(n)&&n>=0&&n<=MAX_BYTES,'Existing single-JSON byte cap');return n;}
// Deep equality alone ignores object key order; require the exact JSON field
// serialization as well. Release only the newly parsed comparison object.
export function compareEveryCheckpointField(candidate,reconstructed,{consume=false}={}){
 const keys=Object.keys(reconstructed);assert.deepEqual(Object.keys(candidate),keys,'Top-level field order/set changed');const compared=[];
 for(const field of keys){assert.deepEqual(candidate[field],reconstructed[field],'Bundle field changed: '+field);assert.equal(JSON.stringify(candidate[field]),JSON.stringify(reconstructed[field]),'Nested field order changed: '+field);compared.push({field,arrayLength:Array.isArray(candidate[field])?candidate[field].length:null});if(consume)delete candidate[field];}
 return compared;
}
export function bridgeFields(c,h,checkpoint,provenance){
 for(const d of [checkpoint,provenance])descriptor(d);
 return{status:'REVIEWED_PLAN_HISTORY_CHECKPOINT07_BRIDGE',errors:[],checkpoint,historyScope:h.historyScope,completeHistoryDeltas:[],headSha256:checkpoint.sha256,comparisonEvidence:h.comparisonEvidence,
  priorHistoryReport:c.latestHistoryReport,priorCompletion:c.latestCompletion,provenance,previousLogicalHeadSha256:h.headSha256,
  originalCheckpoint:ORIGINAL,originalCheckpointReview:ORIGINAL_REVIEW,sourceOrderedDeltas:h.completeHistoryDeltas,
  previousUnsealedHistory:h.previousUnsealedHistory,unsealedHistoryRequiresNewBinding:true,comparisonOnlyFactsMergedIntoSealedBase:false,
  failedParentRolesMustBeAuthenticatedByConsumer:true,oldLiveByteIntegrityClaimed:false,...ZERO};
}
export function makeIO(){
 const bindings={};
 async function bytes(p){const b=await fs.readFile(p),h=sha(b);if(bindings[p])assert.equal(bindings[p],h,'Used evidence drift: '+p);bindings[p]=h;return b;}
 async function read(d){descriptor(d);const b=await bytes(d.path);assert.equal(sha(b),d.sha256,'Descriptor drift: '+d.path);return JSON.parse(b);}
 async function pin(d){descriptor(d);assert.equal(sha(await bytes(d.path)),d.sha256,d.path);}
 async function finalBytes(){for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,'Final used evidence drift: '+p);}
 return{bindings,bytes,read,pin,finalBytes};
}
export async function authenticateTools(io,c,selfURL){
 assert.equal(path.basename(process.cwd()),'frozen-workspace-4588','Only reviewed frozen workspace execution');
 const actual=fileURLToPath(selfURL),self=actual.endsWith(path.basename(REVIEWER))?REVIEWER:SELF;
 assert.equal(await fs.realpath(self),await fs.realpath(actual));
 for(const d of Object.values(TOOLS))await io.pin(d);
 const aq=await io.read(ADAPTER_REVIEW);assert.equal(aq.status,'INDEPENDENT_PLAN_HISTORY_ADAPTER_V16_PASS');assert.equal(aq.productionQualified,true);assert.deepEqual(aq.subject,TOOLS.adapter);
 for(const[p,sha256]of Object.entries(aq.toolBindings))await io.pin({path:p,sha256});
 const q=await io.read(c.implementationReview);assert.equal(q.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT07_TOOLS_PASS');assert.deepEqual(q.errors,[]);assert.equal(q.productionQualified,true);
 assert(q.toolBindings&&Object.keys(q.toolBindings).length>=3);
 for(const p of [SELF,REVIEWER,TEST]){assert(q.toolBindings[p],'Missing independently pinned tool '+p);await io.pin({path:p,sha256:q.toolBindings[p]});}
 for(const[p,sha256]of Object.entries(q.toolBindings))await io.pin({path:p,sha256});
}
export async function listSevenRoots(scope){
 const out={};for(const root of scope.roots){const real=await fs.realpath(root.physicalPath);for(const alias of root.aliases)assert.equal(await fs.realpath(alias),real,'Alias retargeted');const stack=[root.physicalPath],names=[];
  while(stack.length){const dir=stack.pop();for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'Nested alias in historical inventory');const file=path.join(dir,e.name);if(e.isDirectory())stack.push(file);else{assert(e.isFile());names.push(file);}}}out[root.id]=names;}
 return out;
}
export function declaredMembers(state,delta,scope,canonical){
 const out=Object.fromEntries(scope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...state.bundle.files,...delta.files])if(f.rootId!==null){const key=canonical(f.path);assert(!seen.has(key),'Duplicate declared historical member');seen.add(key);assert(out[f.rootId]);out[f.rootId].push(f.path);}return out;
}
export async function writeExclusive(p,q){const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};}

export async function resealCheckpoint07(configDescriptor){
 const io=makeIO(),phases=[];const c=assertConfiguration(await io.read(configDescriptor));await authenticateTools(io,c,import.meta.url);
 await fs.mkdir(OUT); // Exclusive reservation; never reuse even an incomplete output.
 try{
  const h=await io.read(c.latestHistoryReport),done=await io.read(c.latestCompletion),plan=await io.read(done.plan),prior=await io.read(h.priorHistoryReport);
  const ordered=assertClosedSource(c,h,done,plan,prior);await io.pin(done.config);await io.pin(done.input);if(done.receipt)await io.pin(done.receipt);
  const oldReview=await io.read(ORIGINAL_REVIEW);assert.equal(oldReview.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(oldReview.errors,[]);assert.equal(oldReview.fullMergedBundleEquality,true);assert.equal(oldReview.allFieldsPreserved,true);assert.deepEqual(oldReview.checkpoint,ORIGINAL);await io.pin(oldReview.provenance);await io.pin(oldReview.authorReport);
  const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,planHistorySummary}=await import(pathToFileURL(path.resolve(TOOLS.adapter.path)));
  const {compileCanonicalHistoryPath}=await import(pathToFileURL(path.resolve(TOOLS.compiler.path)));const canonical=compileCanonicalHistoryPath(h.historyScope).canonical;
  const before=await listSevenRoots(h.historyScope);let state=await consumePlanHistory({checkpoint:ORIGINAL,review:ORIGINAL_REVIEW,expectedScope:h.historyScope,readBytes:io.bytes});
  const keys=Object.keys(state.bundle),owners=[];
  for(const[i,x]of ordered.entries()){
   const delta=await io.read(x.descriptor),definition=await io.read(x.declaredOwner.definition);assert.equal(delta.parentHeadSha256,state.headSha256);assert.deepEqual(delta.owner,x.declaredOwner);
   state=await mergePlanHistoryDelta(state,{...x,listing:declaredMembers(state,delta,h.historyScope,canonical),readBytes:io.bytes});owners.push({delta:x.descriptor,declaredOwner:x.declaredOwner,definition});
   const phase={phase:'CHECKPOINT07_AUTHOR_METADATA_MERGE',number:i+1,total:ordered.length,headSha256:state.headSha256};phases.push(phase);console.log(JSON.stringify(phase));
  }
  assert.equal(state.headSha256,h.headSha256);assert.deepEqual(Object.keys(state.bundle),keys);assertPlanHistoryMembers(state,before);
  const after=await listSevenRoots(h.historyScope);assertPlanHistoryMembers(state,after);const membership=membershipDigest(after,canonical);assert.deepEqual(membership,membershipDigest(before,canonical));
  const summary=planHistorySummary(state.bundle);for(const k of ['baselinePlan','baselineActual','scopeSha256'])assert.deepEqual(summary[k],oldReview.summary[k]);
  const encoded=JSON.stringify(state.bundle)+'\n';assertBundleByteCount(Buffer.byteLength(encoded));const checkpoint={path:OUT+'/checkpoint.json',sha256:sha(encoded)};
  const provenance={version:VERSION,configuration:configDescriptor,latestHistoryReport:c.latestHistoryReport,latestCompletion:c.latestCompletion,originalCheckpoint:ORIGINAL,originalReview:ORIGINAL_REVIEW,originalProvenance:oldReview.provenance,
   orderedDeltas:ordered,owners,tools:TOOLS,adapterQualification:ADAPTER_REVIEW,implementationReview:c.implementationReview,membership,
   continuity:{mergedLogicalHeadSha256:h.headSha256,newCheckpointHeadSha256:checkpoint.sha256,newOrderedDeltas:[],consumerBridgeRequired:true,originalReportUnchanged:true},
   allBundleFieldsPreserved:true,unknownFieldsAndOrderPreserved:true,additionalFieldsOmitted:[],supplementalComparisonMerged:false,comparisonEvidence:h.comparisonEvidence,previousUnsealedHistory:h.previousUnsealedHistory,
   baselineMetadataUnchanged:true,oldLiveByteIntegrityClaimed:false,...ZERO};
  await io.finalBytes();const final=await listSevenRoots(h.historyScope);assertPlanHistoryMembers(state,final);assert.deepEqual(membershipDigest(final,canonical),membership);
  await fs.writeFile(checkpoint.path,encoded,{flag:'wx'});const pd=await writeExclusive(OUT+'/reseal-provenance.json',provenance);
  const report={status:'PLAN_HISTORY_CHECKPOINT_RESEALED_AWAITING_INDEPENDENT_REVIEW',configuration:configDescriptor,checkpoint,provenance:pd,latestHistoryReport:c.latestHistoryReport,latestCompletion:c.latestCompletion,
   originalCheckpoint:ORIGINAL,originalReview:ORIGINAL_REVIEW,exportScript:{path:SELF,sha256:io.bindings[SELF]},orderedDeltas:ordered,mergedHeadSha256:h.headSha256,summary,membership,phases,errors:[],fileBindings:io.bindings,
   allFieldsPreserved:true,projectionSha256Recomputed:true,completeBeforeAfterMembersEqual:true,independentReviewRequired:true,oldLiveByteIntegrityClaimed:false,exportTimeAllOldRawBytesFullyChecked:false,usedArchiveAndDeltaBytesChecked:true,performanceImprovementMeasured:false,...ZERO};
  const rd=await writeExclusive(OUT+'/report.json',report);return{checkpoint,provenance:pd,report:rd,status:report.status};
 }catch(e){await writeExclusive(OUT+'/incomplete.json',{status:'PLAN_HISTORY_RESEAL_INCOMPLETE',configuration:configDescriptor,errors:[e.stack??String(e)],phases,fileBindings:io.bindings,...ZERO});throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,4,'Immutable configuration path and SHA');console.log(JSON.stringify(await resealCheckpoint07({path:process.argv[2],sha256:process.argv[3]})));}

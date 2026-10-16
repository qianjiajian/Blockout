import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Metadata only. No runtime, static audit, model, replay, solver or history adapter imports.
export const SELF='tools/daily-challenge/formal-v4/admit-reviewed-n20-selection-162.mjs';
export const VERSION='selected161-plus-accepted-n20-v1';
export const REVIEW_STATUS='INDEPENDENT_SELECTION_162_METADATA_PASS';
const V='deliverables/daily-formal-v4-20261008';
const d=(p,sha256)=>({path:V+'/'+p,sha256});
export const PINS=Object.freeze({
 baseSelection:d('selection/completed-basic-and-advanced-161-01/index.json','faf2a840869b3ed1ae971df301e82a495981449bb6207a3e186c2961af2965d1'),
 baseReview:d('proof/completed161-quick-independent-01.json','91ced2f2d9d6db570fb0b149add08c437506c3218a5145eefa896c5a07443d82'),
 candidate:d('design/accepted-ice20-bomb-actual-01/candidate.json','4237b2e6815f84b22853227493ed6129d066ab771aeb01c797ac81e3e5b516c4'),
 baseCandidate:d('design/wholeboard-ice-d3-supply-twentyfour-actual-01/candidate-20.json','6ac2cd808d38979c4881133da3d838730b10e8759f58688a816c31e961a31e2e'),
 actualAudit:d('proof/accepted-ice20-bomb-actual-independent-01.json','2944a7977d667d4a20a4b5c923208fff8d6caa9f0354db1c6bffa0009132c560'),
 designReview:d('proof/accepted-ice20-bomb-current80-design-readonly-01/report.json','c452dc99581b0917f9dbfffd4ca91796e1830193423d02d8150619bd91697233'),
 rootDesignApproval:d('proof/accepted-ice20-bomb-root-design-01.json','5ddd00e7f6ba9e10446d1355286484bd7eb17d74f9f75c503116e996ee79b346'),
 priorDisposition:d('proof/selected161-root-design-disposition-10.json','8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff'),
 completion:d('design/accepted-ice20-bomb-actual-01/completion.json','00c969311a367514bcc2773dd7b3ac08dd8f64d0edce33fd5749ebd52d00ead1'),
 n20Export:d('proof/accepted-ice20-bomb-history-delta-01/report.json','df0cef2c7cdfacf2318e3f8dfb0fb6babe96897c644cba0b88b9d718501a92d9'),
 constructionDelta:d('proof/accepted-ice20-bomb-history-delta-01/construction.delta.json','26927a28dc10dc54bfb1910f864c5e8ef2e22b5194880d9d157e2d47acc8c5cf'),
 mathematicalDelta:d('proof/accepted-ice20-bomb-history-delta-01/mathematical.delta.json','34b378c8f72f40a865b659a5dd60d2f3821e114bf64399a1ae228d5c53c6164d'),
 checkpointReview:d('proof/plan-history-checkpoint-06/independent-review.json','511776220a3d13ad926b1d1610e5195d11e4324188c5239fa42a002af81678c3'),
 checkpointProvenance:d('proof/plan-history-checkpoint-06/reseal-provenance.json','4b87ab638ee803b1063d2a16d2834639c2ef1532390863f80050f36bb7ccd223'),
 latestHistoryReport:d('proof/star-source200-dual-exit-pilot-history-delta-05/report.json','43f92c5c080f6fc8f65ff452ad0421712e4555d43181af7f9ca1aa575b49e9aa'),
});
const LEVEL_SHA='a59513a65aadff290b76ffe2c9c34710eb133f10ba1f474409bac21d93ae2b07';
const BASE_LEVEL_SHA='465c7311e356580d7737aea4e95ba8bfdae40c8018dc43cc8ba96b1503762b92';
const ROUTE_SHA='47df7edba28a6408df777fad2a1084de4e0439998e1e7232cf83156bd39fde14';
const FORMAL_ID='daily-mechanisms-bomb-120-d3-03';
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,canonical(x[k])])):x;
export const objectSha256=x=>sha(JSON.stringify(canonical(x)));
const desc=x=>({path:x.path,sha256:x.sha256});
const has=(list,target)=>list.some(x=>{const t=x.descriptor??x;return t.path===target.path&&t.sha256===target.sha256;});
function descriptor(x){assert(x&&typeof x.path==='string'&&x.path.length&&/^[a-f0-9]{64}$/.test(x.sha256??''),'Invalid descriptor');}
function reader({readBytes=p=>fs.readFile(p),bindings={}}={}){
 const bytes=new Map();
 async function read(x,json=true){descriptor(x);assert(!x.path.replaceAll('\\','/').endsWith('/checkpoint.json'),'No checkpoint load in selection metadata admission');
  const b=await readBytes(x.path);assert.equal(sha(b),x.sha256,'Changed bound bytes: '+x.path);
  if(bindings[x.path])assert.equal(bindings[x.path],x.sha256);bindings[x.path]=x.sha256;bytes.set(x.path,b);return json?JSON.parse(b):b;}
 return{read,bindings,bytes,async recheck(){for(const[p,b]of bytes)assert.equal(sha(await readBytes(p)),sha(b),'Bytes changed during preflight: '+p);}};
}
export function selectionEvidenceBridge(){return{version:VERSION,baseSelection:PINS.baseSelection,baseReview:PINS.baseReview,appendedReceipts:[PINS.candidate],actualAudit:PINS.actualAudit,designReview:PINS.designReview,rootDesignApproval:PINS.rootDesignApproval,priorDisposition:PINS.priorDisposition,
 historyEvidence:{n20Export:PINS.n20Export,constructionDelta:PINS.constructionDelta,mathematicalDelta:PINS.mathematicalDelta,checkpointReview:PINS.checkpointReview,checkpointProvenance:PINS.checkpointProvenance,latestHistoryReport:PINS.latestHistoryReport},
 appendedReceiptFlagsPreserved:true,pointerValidated:false,timeValidated:false,formalReady:false,historyRoleAuthorizationGranted:false};}

export function assertOriginalN20(q){
 assert.equal(q.version,'accepted-ice20-one-final-bomb-d3-v1');assert.equal(q.formalId,FORMAL_ID);assert.equal(q.stageKey,'mechanisms-bomb-120');assert.equal(q.newestMechanism,'bomb');assert.equal(q.unlockLevel,120);assert.equal(q.difficulty,3);assert.equal(q.slot,3);assert.equal(q.sourceLevelId,118);
 assert.equal(q.status,'ACCEPTED_ICE20_FINAL_BOMB_LU_VERIFIED');assert.equal(q.accepted,true);assert.equal(q.mathematicalEvidenceValidated,true);assert.equal(q.mechanismStrengthValidated,true);
 for(const k of ['designValidated','catalogEligible','formalReady'])assert.equal(q[k],false,'Original false flag changed: '+k);
 assert.equal(q.levelSha256,LEVEL_SHA);assert.equal(objectSha256(q.level),LEVEL_SHA);assert.equal(q.routeSha256,ROUTE_SHA);assert.equal(objectSha256(q.drags),ROUTE_SHA);assert.equal(q.drags.length,55);assert.equal(q.L,31);assert.equal(q.U,35);assert.deepEqual(q.errors,[]);assert.deepEqual(q.base,PINS.baseCandidate);
 assert.equal(q.lowerBound.inputLevelSha256,LEVEL_SHA);assert.equal(q.lowerBound.projectedLevelSha256,BASE_LEVEL_SHA);assert.equal(q.lowerBound.requiredFloor,31);assert.deepEqual(q.proof,q.lowerBound.result);assert.equal(q.proof.status,'threshold-proven');assert.equal(q.proof.certifiedFloor,31);
 assert.equal(q.route.inputLevelSha256,LEVEL_SHA);assert.equal(q.route.routeSha256,ROUTE_SHA);
 for(const replay of [q.route.canonicalReplay,q.route.independentReplay]){assert.equal(replay.valid,true);assert.equal(replay.complete,true);assert.equal(replay.effectiveDrags,55);assert.equal(replay.nonClearingDrags,35);assert.equal(replay.clearEvents,20);assert.equal(replay.remainingBodies,0);assert.equal(replay.remainingQueued,0);assert.equal(replay.simulationTimeValidated,true);assert.equal(replay.naturalTimeValidated,false);assert.equal(replay.timeValidated,false);}
 return true;
}
export function assertSelectionPrefix(base,receipts,q){
 assert.equal(base.schemaVersion,4);assert.equal(base.files.length,161);assert.equal(base.candidateCount,161);assert.equal(receipts.length,161);assert.deepEqual(Object.keys(base.fileBindings).sort(),[...base.files].sort());
 const ids=new Set(),levels=new Set();for(let i=0;i<161;i++){const r=receipts[i];assert.equal(r.path,base.files[i]);assert.equal(r.sha256,base.fileBindings[r.path]);assert(!ids.has(r.value.formalId),'Duplicate original formal slot');ids.add(r.value.formalId);assert(r.value.levelSha256);levels.add(r.value.levelSha256);}
 assert(!ids.has(q.formalId),'N20 slot already occupied');assert(!levels.has(LEVEL_SHA),'N20 exact object already selected');assert(!levels.has(BASE_LEVEL_SHA),'Unmodified accepted base must not occupy another slot');assert(!base.files.includes(PINS.baseCandidate.path));assert(!base.files.includes(PINS.candidate.path));return true;
}
export function assertSelection162Bridge(index,base,q){
 assertOriginalN20(q);assert.equal(index.schemaVersion,4);assert.equal(index.scope,300);assert.equal(index.status,'PARTIAL_CANDIDATES_AWAITING_FINAL_ACCEPTANCE');
 assert.deepEqual(index.files,[...base.files,PINS.candidate.path]);assert.deepEqual(index.fileBindings,{...base.fileBindings,[PINS.candidate.path]:PINS.candidate.sha256});assert.deepEqual(index.priorIndex,PINS.baseSelection);assert.deepEqual(index.priorIndependentAudit,PINS.baseReview);
 assert.deepEqual(index.acceptedReceipts,[PINS.candidate]);assert.deepEqual(index.independentActualAudit,PINS.actualAudit);assert.deepEqual(index.rootDesignApproval,PINS.rootDesignApproval);assert.deepEqual(index.selectionEvidenceBridge,selectionEvidenceBridge());
 assert.equal(index.candidateCount,162);assert.equal(index.missing,138);assert.deepEqual(index.bands,{1:84,2:56,3:22});const groups=structuredClone(base.groups);groups['mechanisms-bomb-120'][3]++;assert.deepEqual(index.groups,groups);
 assert.deepEqual(index.designSummary,{accepted:81,held:73,pending:8,formalAccepted:0});
 for(const k of ['candidatePointerValidatedForNewEntries','pointerValidated','timeValidated','catalogEligible','formal300Acceptance','formalReady','productionChanged'])assert.equal(index[k],false,k);
 assert.equal(index.currentCandidatePointer,null);assert.equal(index.actualImageReview,null);return true;
}

async function validateEvidence(r){
 const x={};for(const[k,p]of Object.entries(PINS))x[k]=await r.read(p);
 const q=x.candidate,base=x.baseSelection;assertOriginalN20(q);const receipts=[];
 for(const p of base.files){const s={path:p,sha256:base.fileBindings[p]};receipts.push({...s,value:await r.read(s)});}assertSelectionPrefix(base,receipts,q);
 assert.equal(x.baseReview.status,'INDEPENDENT_161_MERGE_QUICK_CHECK_PASS');assert.deepEqual(x.baseReview.selection,PINS.baseSelection);assert.deepEqual(x.baseReview.errors,[]);
 assert.equal(x.actualAudit.status,'INDEPENDENT_ACCEPTED_ICE20_BOMB_ACTUAL_PASS');assert.deepEqual(x.actualAudit.candidate,PINS.candidate);assert.deepEqual(x.actualAudit.completion,PINS.completion);assert.equal(x.actualAudit.accepted,1);assert.deepEqual(x.actualAudit.errors,[]);
 const a=x.rootDesignApproval;assert.equal(a.status,'ROOT_DESIGN_ACCEPTED_FOR_NEXT_CANDIDATE_SELECTION');for(const[k,p]of [['candidate',PINS.candidate],['actualAudit',PINS.actualAudit],['designReview',PINS.designReview],['comparisonSelection',PINS.baseSelection],['priorDisposition',PINS.priorDisposition],['base',PINS.baseCandidate]])assert.deepEqual(a[k],p);
 assert.equal(a.targetFormalId,FORMAL_ID);assert.equal(a.levelSha256,LEVEL_SHA);assert.equal(a.routeSha256,ROUTE_SHA);assert.equal(a.unselectedBaseMayNotOccupyAnotherIndependentSlot,true);assert.equal(a.formalAcceptedCount,0);assert.equal(a.pointerValidated,false);assert.equal(a.timeValidated,false);assert.equal(a.formalReady,false);assert.deepEqual(a.errors,[]);
 assert.equal(x.designReview.status,'READONLY_N20_BOMB_SUPPORTS_NEXT_CANDIDATE_SELECTION');assert.deepEqual(x.designReview.candidate,PINS.candidate);assert.deepEqual(x.designReview.selection,PINS.baseSelection);assert.deepEqual(x.designReview.errors,[]);
 assert.deepEqual(x.priorDisposition.selection,PINS.baseSelection);assert.equal(x.priorDisposition.designAcceptedWithinCurrentSelectionCount,80);assert.equal(x.priorDisposition.heldCandidateCount,73);assert.equal(x.priorDisposition.remainingUnheldWithoutJointDesignAcceptance,8);assert.equal(x.priorDisposition.formalAcceptedCount,0);
 assert.equal(x.baseCandidate.levelSha256,BASE_LEVEL_SHA);assert.equal(objectSha256(x.baseCandidate.level),BASE_LEVEL_SHA);
 const done=x.completion;assert.equal(done.status,'ACCEPTED_ICE20_BOMB_TASK_CLOSED');assert.deepEqual(done.receipt,PINS.candidate);assert.deepEqual(done.plan,q.plan);assert.equal(done.accepted,1);assert.equal(done.maximumInputs,1);assert.equal(done.consumedInputs,1);assert.equal(done.formedFullWorlds,1);assert.equal(done.closed,true);assert.equal(done.restartAllowed,false);assert.equal(done.finalizationError,null);assert.deepEqual(done.unpersistedInputs,[]);
 const plan=await r.read(q.plan),ctor=await r.read(done.constructionOwner),math=await r.read(done.mathOwner);assert.deepEqual(ctor.parentPlan,q.plan);assert.deepEqual(math.parentPlan,q.plan);assert.equal(ctor.kind,'construction');assert.equal(math.kind,'mathematical');assert.equal(ctor.files.length,6);assert.equal(math.files.length,7);assert.equal(ctor.closedCampaigns.length,1);assert.deepEqual(math.attemptIds,[q.attempt.id]);
 const packets=new Map();for(const owner of [ctor,math])for(const file of owner.files)packets.set(file.path,await r.read(file));
 const closure=ctor.closedCampaigns[0];assert.deepEqual(await r.read(closure.descriptor),closure.raw);assert.equal(closure.raw.closed,true);assert.equal(closure.raw.restartAllowed,false);assert.deepEqual(closure.raw.plan,q.plan);assert.deepEqual(closure.raw.receipts,[PINS.candidate]);assert.deepEqual(closure.raw.formedWorldFiles,[q.constructionEvidence]);assert.equal(closure.raw.experimentId,plan.experimentId);
 const cd=x.constructionDelta,md=x.mathematicalDelta;assert.deepEqual(cd.owner.definition,done.constructionOwner);assert.deepEqual(md.owner.definition,done.mathOwner);assert.deepEqual(cd.closedCampaigns,ctor.closedCampaigns);assert.equal(cd.terminalRecords.length,0);assert.equal(md.terminalRecords.length,1);assert.deepEqual(md.closedCampaigns,[]);assert.equal(md.parentHeadSha256,PINS.constructionDelta.sha256);
 for(const [owner,delta]of [[ctor,cd],[math,md]]){assert.equal(delta.files.length,owner.files.length);for(const f of owner.files)assert(has(delta.files,f),'Original owner file absent from original delta');for(const w of delta.fullWorlds){assert(has(owner.files,w.descriptor));assert.equal(w.field,'level');const packet=packets.get(w.descriptor.path)??await r.read(w.descriptor);assert.deepEqual(w.level,packet.level);}}
 assert.equal(cd.fullWorlds.length,1);assert.equal(md.fullWorlds.length,3);assert(has(md.fullWorlds,PINS.candidate));assert.deepEqual(cd.fullWorlds[0].descriptor,q.constructionEvidence);assert.deepEqual(cd.fullWorlds[0].level,q.level);
 const t=md.terminalRecords[0];assert.deepEqual(await r.read(t.request.descriptor),t.request.value);assert.deepEqual(await r.read(t.result.descriptor),t.result.value);assert.deepEqual(t.request.value,q.attempt);assert.equal(t.result.value.accepted,true);assert.equal(t.result.value.status,q.status);assert.equal(t.result.value.levelSha256,q.levelSha256);assert.deepEqual(t.result.value.lower,q.lowerBound.result);
 const e=x.n20Export;assert.equal(e.status,'ACCEPTED_ICE20_BOMB_HISTORY_DELTAS_EXPORTED_AND_V7_VALIDATED');assert.deepEqual(e.actualAudit,PINS.actualAudit);assert.deepEqual(e.completion,PINS.completion);assert.deepEqual(e.constructorOwner,done.constructionOwner);assert.deepEqual(e.mathOwner,done.mathOwner);assert.deepEqual(e.errors,[]);assert.equal(e.headSha256,PINS.mathematicalDelta.sha256);
 const cp=x.checkpointReview,p=x.checkpointProvenance,h=x.latestHistoryReport;assert.equal(cp.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(cp.latestHistoryReport,PINS.n20Export);assert.deepEqual(cp.provenance,PINS.checkpointProvenance);assert.equal(cp.fullMergedBundleEquality,true);assert.equal(cp.allFieldsPreserved,true);assert.deepEqual(cp.errors,[]);assert.deepEqual(p.latestHistoryReport,PINS.n20Export);assert.equal(p.allBundleFieldsPreserved,true);
 assert.deepEqual(p.orderedDeltas.slice(-2).map(v=>v.descriptor),[PINS.constructionDelta,PINS.mathematicalDelta]);assert.deepEqual(h.checkpoint,cp.checkpoint);assert.deepEqual(h.checkpointReview,PINS.checkpointReview);assert.deepEqual(h.priorHistoryDeltas.concat(h.historyDeltas),h.completeHistoryDeltas);assert.equal(h.completeHistoryDeltas.length,15);assert.equal(h.completeHistoryDeltas.at(-1).sha256??h.completeHistoryDeltas.at(-1).descriptor?.sha256,h.headSha256);assert.deepEqual(h.errors,[]);
 // This verifies saved inclusion evidence, not current live membership. A future
 // consumer must authenticate the original full-world role in its consumed history.
 await r.recheck();return{x,receipts,reader:r};
}
export async function preflightSelection162(options={}){return validateEvidence(reader(options));}

export function buildSelection162Metadata({x,receipts},mergeAuditDescriptor){
 descriptor(mergeAuditDescriptor);assertSelectionPrefix(x.baseSelection,receipts,x.candidate);const base=x.baseSelection,groups=structuredClone(base.groups);groups['mechanisms-bomb-120'][3]++;
 const index={schemaVersion:4,scope:300,status:'PARTIAL_CANDIDATES_AWAITING_FINAL_ACCEPTANCE',files:[...base.files,PINS.candidate.path],fileBindings:{...base.fileBindings,[PINS.candidate.path]:PINS.candidate.sha256},priorIndex:PINS.baseSelection,priorIndependentAudit:PINS.baseReview,acceptedReceipts:[PINS.candidate],independentActualAudit:PINS.actualAudit,rootDesignApproval:PINS.rootDesignApproval,mergeAudit:mergeAuditDescriptor,selectionEvidenceBridge:selectionEvidenceBridge(),candidateCount:162,missing:138,bands:{1:84,2:56,3:22},groups,designSummary:{accepted:81,held:73,pending:8,formalAccepted:0},candidatePointerValidatedForNewEntries:false,currentCandidatePointer:null,actualImageReview:null,pointerValidated:false,timeValidated:false,catalogEligible:false,formal300Acceptance:false,formalReady:false,productionChanged:false};
 assertSelection162Bridge(index,base,x.candidate);return index;
}

/** Future consumer bridge; caller binds an independently reviewed actual index.
 * This does not consume history or grant reference/failed-parent authority. */
export async function readApproved162SelectionEvidence(selectionDescriptor,selectionReviewDescriptor,options={}){
 const r=reader(options),index=await r.read(selectionDescriptor),review=await r.read(selectionReviewDescriptor);assert.equal(review.status,REVIEW_STATUS);assert.deepEqual(review.errors,[]);assert.deepEqual(review.selection,selectionDescriptor);assert.equal(review.formalReady,false);
 const evidence=await validateEvidence(r);assertSelection162Bridge(index,evidence.x.baseSelection,evidence.x.candidate);const merge=await r.read(index.mergeAudit);assert.equal(merge.status,'ROOT_DESIGN_APPROVED_N20_APPENDED_METADATA_ONLY');assert.deepEqual(merge.bridge,selectionEvidenceBridge());assert.equal(merge.receiptsModified,false);await r.recheck();
 return{version:VERSION,selection:selectionDescriptor,indexReview:selectionReviewDescriptor,baseSelection:PINS.baseSelection,baseReview:PINS.baseReview,appendedReceipts:[{descriptor:PINS.candidate,receipt:evidence.x.candidate}],bridge:index.selectionEvidenceBridge,pointerValidated:false,timeValidated:false,formalReady:false,historyRoleAuthorizationGranted:false,fileBindings:r.bindings};
}
export const ZERO_ACTIONS={newModels:0,newConstructions:0,newSearches:0,newReplayCalls:0,newHistoryLoads:0,newHistoryMerges:0,newClaims:0,oldFilesChanged:false,formalReady:false};
async function writeJsonOnce(p,value){const b=Buffer.from(JSON.stringify(value,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});return{path:p.replaceAll('\\','/'),sha256:sha(b)};}
export async function admitSelection162(outputDirectory){
 const out=path.resolve(outputDirectory),allowed=path.resolve(V,'selection');assert(out.startsWith(allowed+path.sep),'New selection directory required');
 const e=await preflightSelection162();const source={path:SELF,sha256:sha(await fs.readFile(SELF))};
 await fs.mkdir(out,{recursive:false});
 const audit={schemaVersion:4,status:'ROOT_DESIGN_APPROVED_N20_APPENDED_METADATA_ONLY',bridge:selectionEvidenceBridge(),source,original161FilesAndOrderPreserved:true,receiptsModified:false,sourceReceiptFlagsUnmodified:true,candidateCount:162,missing:138,bands:{1:84,2:56,3:22},designSummary:{accepted:81,held:73,pending:8,formalAccepted:0},candidatePointerValidatedForNewEntries:false,formal300Acceptance:false,productionChanged:false,historyRoleAuthorizationGranted:false,sourceBindingScope:'Exact originals and saved independent evidence; no live checkpoint/member scan or mathematical revalidation',...ZERO_ACTIONS,fileBindings:{...e.reader.bindings,[SELF]:source.sha256}};
 const auditDescriptor=await writeJsonOnce(path.join(out,'merge-audit.json'),audit);const index=buildSelection162Metadata(e,auditDescriptor);await e.reader.recheck();const selection=await writeJsonOnce(path.join(out,'index.json'),index);return{selection,mergeAudit:auditDescriptor,candidateCount:162,missing:138,...ZERO_ACTIONS};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const[mode,out]=process.argv.slice(2);assert.equal(mode,'admit','Usage: node '+SELF+' admit <new-selection-directory>');assert(out);console.log(JSON.stringify(await admitSelection162(out)));
}

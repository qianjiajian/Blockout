import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {ORIGINAL_FAILED_PACKETS,SUPPLEMENT_VERSION,SUPPLEMENT_REVIEW_STATUS} from './supplemental-failed-parent-evidence.mjs';

// Immutable old failures are comparison facts, never current parent/reference
// authorization. No role-reader, descendant filtering, history merger or model.
export const COMPARISON_VERSION='supplemental-comparison-only-view-v1';
export const COMPARISON_REVIEW_STATUS='INDEPENDENT_SUPPLEMENTAL_COMPARISON_EVIDENCE_PASS';
const clone=x=>structuredClone(x);
const descriptor=d=>assert(d&&typeof d.path==='string'&&d.path.length&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact descriptor required');
const zero=q=>{for(const k of ['newSearches','newConstructions','newLedgerClaims'])assert.equal(q[k],0,k);};
const fact=r=>({sourceLevelId:r.sourceLevelId,namespace:r.namespace,attemptId:r.attemptId,receipt:r.receipt,levelSha256:r.fingerprints.levelSha256,fingerprints:r.fingerprints});

/** Caller retains its authenticated v5 state and seven-root member checks.
 * Return is a separate comparisonView, NOT a new state or sealed checkpoint.
 * Review authenticates the archived facts; every call checks them against the
 * current original terminal rows. Later descendants are deliberately untouched.
 */
export async function readSupplementalComparisonEvidence(state,{
 provenance,review,readBytes,qualificationOnly=false,role='comparison-only'
}){
 assert.equal(role,'comparison-only','Comparison only: no parent/reference role');
 assert.equal(typeof qualificationOnly,'boolean');assert.equal(typeof readBytes,'function');
 assert.equal(state.completeCheckpointBytesAuthenticated,true,'Authenticated current v5 state required');
 assert(!state.comparisonOnly&&!state.supplementalComparisonEvidence&&!state.supplementalFailedParentEvidence,'Do not apply to an existing supplemental view');
 const canonical=compileCanonicalHistoryPath(state.bundle.scope).canonical,fileBindings={};
 const read=async d=>{descriptor(d);const bytes=await readBytes(d.path);assert.equal(sha256(bytes),d.sha256,'Comparison evidence digest mismatch');
  if(fileBindings[d.path])assert.equal(fileBindings[d.path],d.sha256);fileBindings[d.path]=d.sha256;return JSON.parse(bytes);};
 const approved=await read(review);assert.equal(approved.status,COMPARISON_REVIEW_STATUS);assert.deepEqual(approved.errors,[]);assert.equal(approved.qualificationOnly,qualificationOnly);
 assert.deepEqual(approved.allowedRoles,['comparison-only']);assert.equal(approved.failedParentAuthorization,false);assert.equal(approved.referenceAuthorization,false);assert.deepEqual(approved.provenance,provenance);zero(approved);
 const archived=await read(provenance);assert.equal(archived.version,'prebatch-supplemental-failed-parent-provenance-v1');assert.equal(archived.role,'failed-parent-at-sealed-prebatch-head-only');
 for(const k of ['postBatchLatestParentClaimed','referenceUseAllowed','mathematicalProofRevalidated','oldLiveByteIntegrityClaimed','mergedIntoDeltaFiles','mergedIntoSealedComparisonPools'])assert.equal(archived[k],false,k);
 assert.equal(archived.newFullWorlds,0);assert.equal(archived.newClaims,0);zero(archived);assert.equal(archived.futureComparisonOnlyConsumerRequired,true);
 assert(Array.isArray(archived.rows)&&archived.rows.length>0&&archived.rows.length<=3);assert.deepEqual(approved.facts,archived.rows.map(fact));assert.deepEqual(approved.supplementalReview,archived.review);
 const evidence=archived.supplementalHistoryEvidence;assert.equal(evidence.version,SUPPLEMENT_VERSION);assert.equal(evidence.qualificationOnly,qualificationOnly);assert.deepEqual(evidence.allowedRoles,['failed-parent']);zero(evidence);
 assert.equal(evidence.baseHeadSha256,archived.sealedPreBatchHeadSha256);assert.deepEqual(evidence.review,archived.review);assert.deepEqual(evidence.supplements,archived.rows.map(r=>r.supplement));
 assert.equal(evidence.viewSha256,levelSha256({head:evidence.baseHeadSha256,supplements:evidence.supplements,review:evidence.review}));assert.equal(evidence.addedHistoricalFullWorlds,archived.rows.length);
 // Retain the original 03 -> 04 metadata chain without renewing its old role.
 const oldReview=await read(archived.review);assert.equal(oldReview.status,SUPPLEMENT_REVIEW_STATUS);assert.deepEqual(oldReview.errors,[]);assert.equal(oldReview.qualificationOnly,qualificationOnly);zero(oldReview);
 assert.deepEqual(oldReview.allowedRoles,['failed-parent']);assert.deepEqual(oldReview.checkpoint,archived.checkpoint);assert.deepEqual(oldReview.supplements,evidence.supplements);
 const originReview=await read(oldReview.originalReview);assert.equal(originReview.status,SUPPLEMENT_REVIEW_STATUS);assert.deepEqual(originReview.errors,[]);assert.equal(originReview.qualificationOnly,qualificationOnly);zero(originReview);
 assert.deepEqual(originReview.allowedRoles,['failed-parent']);assert.equal(originReview.supplements.length,archived.rows.length);
 const known=new Map(state.bundle.files.map(f=>[canonical(f.path),f])),externalEvidenceFiles=[],worlds=[],sources=new Set(),receiptPaths=new Set();
 const boundRead=async d=>{const q=await read(d),previous=known.get(canonical(d.path));if(previous)assert.equal(previous.sha256,d.sha256,'Archived evidence cannot be overwritten');return q;};
 for(const row of archived.rows){
  assert(!sources.has(row.sourceLevelId),'Duplicate supplemental source');sources.add(row.sourceLevelId);const receiptPath=canonical(row.receipt.path);assert(!receiptPaths.has(receiptPath),'Duplicate receipt alias');receiptPaths.add(receiptPath);
  if(!qualificationOnly){const pin=ORIGINAL_FAILED_PACKETS.find(x=>x.sourceLevelId===row.sourceLevelId);assert(pin,'Source outside exact historical comparison allowlist');assert.deepEqual(row.receipt,{path:pin.path,sha256:pin.sha256});}
  const s=await boundRead(row.supplement);assert.equal(s.version,SUPPLEMENT_VERSION);assert.equal(s.role,'failed-parent');assert.equal(s.qualificationOnly,qualificationOnly);zero(s);assert.deepEqual(s.checkpoint,archived.checkpoint);
  for(const k of ['sourceLevelId','namespace','attemptId','receipt','creation'])assert.deepEqual(row[k],s[k]);assert.equal(canonical(s.namespace),state.bundle.publicNamespace);
  const originalRows=await Promise.all(originReview.supplements.map(boundRead)),original=originalRows.find(x=>x.sourceLevelId===s.sourceLevelId);assert(original,'Missing original supplement');
  const {checkpoint:oldCheckpoint,sealedHeadSha256:oldHead,...oldRest}=original,{checkpoint:newCheckpoint,sealedHeadSha256:newHead,...newRest}=s;
  assert.deepEqual(oldCheckpoint,originReview.checkpoint);assert.equal(oldHead,originReview.reviewedHeadSha256);assert.equal(newHead,oldReview.reviewedHeadSha256);assert.deepEqual(oldRest,newRest,'Only checkpoint/head were rebound');
  const terminal=state.terminalByAttempt[canonical(s.namespace)+'|'+s.attemptId];assert(terminal,'Original terminal absent from current authenticated state');
  assert.deepEqual(state.bundle.terminalRecords.find(x=>x.namespace===terminal.namespace&&x.request.value.id===s.attemptId),terminal,'Current terminal index mismatch');
  assert.equal(terminal.kind,'mathematical');assert(!terminal.legacyPrivateResultFailure);assert.equal(terminal.lock,null);assert.equal(terminal.result?.value.accepted,false,'Original fact must remain FAILED');
  assert.equal(canonical(row.namespace),terminal.namespace);assert.deepEqual(row.request,terminal.request);assert.deepEqual(row.result,terminal.result);assert.deepEqual(row.blocked,terminal.blocked);
  for(const k of ['request','result'])assert.deepEqual(s[k],terminal[k].descriptor);assert.deepEqual(s.blocked,terminal.blocked.map(b=>b.descriptor));assert.equal(s.blocked.length,2);
  const request=await boundRead(s.request),result=await boundRead(s.result);assert.deepEqual(request,terminal.request.value);assert.deepEqual(result,terminal.result.value);
  const identity=levelSha256({shapeSha256:request.shapeSha256,colorSha256:request.colorSha256});
  const blockedPaths=[canonical(s.namespace)+'/'+(request.identityOrigin??request.revalidates??request.id)+'.blocked.json',canonical(s.namespace)+'/identities/'+identity+'.blocked.json'];assert.deepEqual(s.blocked.map(d=>canonical(d.path)).sort(),blockedPaths.sort());
  for(const b of terminal.blocked){const raw=await boundRead(b.descriptor);assert.deepEqual(raw,b.value);assert((raw.attemptIds??[raw.attemptId]).includes(request.id));assert.equal(raw.status,result.status);}
  const q=await boundRead(s.receipt);assert.equal(q.accepted,false);assert.equal(q.sourceLevelId,s.sourceLevelId);assert.equal(q.level.id,s.sourceLevelId);assert.equal(q.status,result.status);
  assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.levelSha256,request.levelSha256);assert(q.attempt||q.proof?.attempt);if(q.attempt)assert.deepEqual(q.attempt,request);if(q.proof?.attempt)assert.deepEqual(q.proof.attempt,request);
  assert(q.proof&&result.lower);assert.deepEqual(q.proof,result.lower);const f=sealedWorldIdentity(q.level);for(const k of ['levelSha256','shapeSha256','colorSha256','colorAssignments','designSha256'])assert.deepEqual(f[k],request[k]);if(request.retryIdentitySha256)assert.equal(f.retryIdentitySha256,request.retryIdentitySha256);
  assert.deepEqual(row.level,q.level);assert.deepEqual(row.fingerprints,f);assert.deepEqual(row.originalReceiptProvenance,q.provenance);
  // Preserve every creation-chain check from 06b; this is provenance, not a new U/L.
  const creation=s.creation,report=await boundRead(creation.batchReport),seed=await boundRead(creation.seed),index=await boundRead(creation.seedIndex),originalCandidate=await boundRead(creation.originalCandidate),inspection=await boundRead(creation.inspection);
  assert.equal(report.status,'FINITE_NEARBAND_BATCH_FINISHED');const listed=report.rows.filter(r=>canonical(r.path)===receiptPath);assert.equal(listed.length,1);assert.equal(listed[0].sourceLevelId,s.sourceLevelId);assert.equal(listed[0].accepted,false);
  assert.deepEqual({path:q.provenance.input,sha256:q.provenance.inputFileSha256},creation.seed);assert.equal(q.provenance.inputLevelSha256,levelSha256(seed.level));assert.equal(seed.sourceLevelId,s.sourceLevelId);assert.equal(seed.levelSha256,levelSha256(seed.level));assert.equal(q.provenance.importedReference,creation.seedIndex.path);
  assert(index.files.some(p=>canonical(p)===canonical(creation.seed.path)));assert.deepEqual(seed.provenance,q.provenance.priorWholeBoardConstruction);assert.deepEqual(seed.provenance.originalCandidate,creation.originalCandidate);assert.deepEqual(seed.provenance.inspection,creation.inspection);
  assert.deepEqual(originalCandidate.level,seed.level);assert.equal(originalCandidate.levelSha256,seed.levelSha256);assert.deepEqual(originalCandidate.provenance,seed.provenance.originalProvenance);
  assert(inspection.selected.some(r=>canonical(r.path)===canonical(creation.originalCandidate.path)&&r.sha256===creation.originalCandidate.sha256&&r.sourceLevelId===s.sourceLevelId&&r.levelSha256===seed.levelSha256));assert.deepEqual(row.reference,creation.seed);assert.equal(row.origin,'reviewed-supplemental-original-failed-packet');
  for(const pool of Object.values(state.nearPools))for(const w of pool)if(canonical(w.descriptor.path)===receiptPath){assert.equal(w.descriptor.sha256,s.receipt.sha256,'Same receipt has conflicting bytes');assert.deepEqual(sealedWorldIdentity(w.level),f,'Same receipt has conflicting physical facts');throw Error('Comparison receipt already present: duplicate application');}
  assert(!state.bundle.scope.roots.some(r=>receiptPath===canonical(r.physicalPath)||receiptPath.startsWith(canonical(r.physicalPath)+'/')),'Comparison evidence cannot add a ledger member');
  if(!known.has(receiptPath))externalEvidenceFiles.push({...clone(s.receipt),rootId:null,aliases:[s.receipt.path]});
  worlds.push({descriptor:clone(s.receipt),field:'level',level:clone(q.level),sourceLevelId:s.sourceLevelId,reference:clone(creation.seed),fingerprints:f,origin:'reviewed-supplemental-comparison-only',attemptId:request.id,accepted:false,comparisonOnly:true});
 }
 if(!qualificationOnly)assert.deepEqual([...sources].sort((a,b)=>a-b),[7,11,50]);
 for(const[p,h]of Object.entries(fileBindings)){assert.equal(sha256(await readBytes(p)),h,'Comparison evidence changed while reading');if(state.fileBindings[p])assert.equal(state.fileBindings[p],h,'Existing binding conflict');}
 const nearPools={...state.nearPools,history:[...state.nearPools.history,...worlds]};
 const comparisonEvidence={version:COMPARISON_VERSION,provenance:clone(provenance),review:clone(review),authenticatedCurrentCheckpoint:clone(state.historyDescriptor),authenticatedCurrentHeadSha256:state.headSha256,archivedPreBatchHeadSha256:archived.sealedPreBatchHeadSha256,
  comparisonOnly:true,allowedRoles:['comparison-only'],failedParentAuthorization:false,referenceAuthorization:false,latestParentClaimed:false,descendantsFiltered:false,qualificationOnly,addedHistoricalComparisonWorlds:worlds.length,addedExternalEvidenceFiles:externalEvidenceFiles.length,newOwnerFiles:false,newFullWorlds:0,newClaims:0,newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false};
 return{comparisonOnly:true,comparisonView:{comparisonOnly:true,nearPools,fullWorlds:Object.values(nearPools).flat(),externalEvidenceFiles,comparisonEvidence},fileBindings,comparisonEvidence};
}

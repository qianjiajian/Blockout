import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {readDirectHistoryRole} from './plan-history-adapter-v4.mjs';

// Read-only evidence supplement, not an owner delta, checkpoint or new proof.
// No filesystem walker, model, replay, constructor or ledger writer lives here.
export const SUPPLEMENT_VERSION='supplemental-sealed-failed-parent-evidence-v1';
export const SUPPLEMENT_REVIEW_STATUS='INDEPENDENT_SUPPLEMENTAL_FAILED_PARENT_EVIDENCE_PASS';
export const ORIGINAL_FAILED_PACKETS=Object.freeze([
 {sourceLevelId:11,path:'deliverables/daily-formal-v3-20261008/design/nearband21-short-references/candidate-0177.json',sha256:'68e01ee49e9534103f3c55ca8be7dbc3f8527b6308635fa95560add1e29386e7'},
 {sourceLevelId:7,path:'deliverables/daily-formal-v3-20261008/design/nearband21-short-references/candidate-0165.json',sha256:'6d5e20123e3268a6b4c49d093ba1b5d8e7246c3bae92de266b096ff5c6edf6a5'},
 {sourceLevelId:50,path:'deliverables/daily-formal-v3-20261008/design/nearband21-short-references/candidate-0035.json',sha256:'9c9da742ee7a6561ef519c7de79cb871f15edfd3e9a40afa9a21af26bb0f0b89'}
]);
const clone=x=>structuredClone(x);
const descriptor=d=>assert(d&&typeof d.path==='string'&&d.path.length&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact descriptor required');
const flags=q=>{for(const k of ['newSearches','newConstructions','newLedgerClaims'])assert.equal(q[k],0,k);};

/** The caller supplies an already authenticated, current checkpoint+delta state.
 * Every invocation re-reads the explicit small evidence set. The caller retains
 * its complete seven-root membership check and pins BOTH head and supplement.
 * Synthetic qualification never authorizes production or changes the allowlist.
 */
export async function readSupplementalFailedParentEvidence(state,{
 supplements,review,role='failed-parent',readBytes,qualificationOnly=false
}){
 assert.equal(role,'failed-parent','Supplement is failed-parent only');
 assert.equal(typeof qualificationOnly,'boolean');assert.equal(typeof readBytes,'function');
 assert.equal(state.completeCheckpointBytesAuthenticated,true,'Consume the reviewed checkpoint first');
 assert(!state.supplementalFailedParentEvidence,'Apply once to a fresh baseline+delta view');
 assert(Array.isArray(supplements)&&supplements.length>0&&supplements.length<=3);
 const compiler=compileCanonicalHistoryPath(state.bundle.scope),canonical=p=>compiler.canonical(p),fileBindings={};
 const read=async d=>{descriptor(d);const bytes=await readBytes(d.path);assert.equal(sha256(bytes),d.sha256,'Supplement descriptor bytes differ');
  if(fileBindings[d.path])assert.equal(fileBindings[d.path],d.sha256,'Conflicting supplement binding');fileBindings[d.path]=d.sha256;return JSON.parse(bytes);};
 const reviewed=await read(review);assert.equal(reviewed.status,SUPPLEMENT_REVIEW_STATUS);assert.deepEqual(reviewed.errors,[]);
 assert.equal(reviewed.qualificationOnly,qualificationOnly);assert.deepEqual(reviewed.allowedRoles,['failed-parent']);flags(reviewed);
 assert.deepEqual(reviewed.checkpoint,state.historyDescriptor);assert.deepEqual(reviewed.supplements,supplements);
 const heads=new Set([state.historyDescriptor.sha256,...(state.deltaDescriptors??[]).map(d=>d.sha256),state.headSha256]);
 assert(heads.has(reviewed.reviewedHeadSha256),'Review does not belong to this history chain');
 const known=new Map(state.bundle.files.map(f=>[canonical(f.path),f])),additions=[],worlds=[],rows=[],sources=new Set();
 const bindOriginal=async d=>{const q=await read(d),p=canonical(d.path),old=known.get(p);
  if(old)assert.equal(old.sha256,d.sha256,'Cannot overwrite an archived file');
  else {assert(!state.bundle.scope.roots.some(r=>p.startsWith(canonical(r.physicalPath)+'/')),'Supplement cannot introduce a ledger member');
   const f={...clone(d),rootId:null,aliases:[d.path]};known.set(p,f);additions.push(f);}
  return q;};
 for(const d of supplements){
  const s=await read(d);assert.equal(s.version,SUPPLEMENT_VERSION);assert.equal(s.role,'failed-parent');assert.equal(s.qualificationOnly,qualificationOnly);flags(s);
  assert.deepEqual(s.checkpoint,state.historyDescriptor);assert(heads.has(s.sealedHeadSha256));assert(!sources.has(s.sourceLevelId));sources.add(s.sourceLevelId);
  if(!qualificationOnly){const pin=ORIGINAL_FAILED_PACKETS.find(x=>x.sourceLevelId===s.sourceLevelId);assert(pin,'Source outside exact historical supplement');
   assert.deepEqual(s.receipt,{path:pin.path,sha256:pin.sha256});}
  assert.equal(canonical(s.namespace),state.bundle.publicNamespace,'Only original public failure evidence');
  const terminal=state.terminalByAttempt[canonical(s.namespace)+'|'+s.attemptId];assert(terminal,'Unknown sealed attempt');
  assert.equal(terminal.kind,'mathematical');assert(!terminal.legacyPrivateResultFailure);assert.equal(terminal.lock,null);
  assert.equal(terminal.result?.value.accepted,false,'Accepted or pending is not a failed parent');
  for(const k of ['request','result'])assert.deepEqual(s[k],terminal[k].descriptor);
  assert.deepEqual(s.blocked,terminal.blocked.map(b=>b.descriptor));assert.equal(s.blocked.length,2,'Both original seals required');
  const request=await read(s.request),result=await read(s.result);assert.deepEqual(request,terminal.request.value);assert.deepEqual(result,terminal.result.value);
  const identity=levelSha256({shapeSha256:request.shapeSha256,colorSha256:request.colorSha256});
  const blockedPaths=[canonical(s.namespace)+'/'+(request.identityOrigin??request.revalidates??request.id)+'.blocked.json',canonical(s.namespace)+'/identities/'+identity+'.blocked.json'];
  assert.deepEqual(s.blocked.map(d=>canonical(d.path)).sort(),blockedPaths.sort());
  for(const b of terminal.blocked){const raw=await read(b.descriptor);assert.deepEqual(raw,b.value);
   assert((raw.attemptIds??[raw.attemptId]).includes(request.id),'Seal must cover this actual failed attempt');assert.equal(raw.status,result.status);}
  const q=await bindOriginal(s.receipt);assert.equal(q.accepted,false);assert.equal(q.sourceLevelId,s.sourceLevelId);assert.equal(q.level.id,s.sourceLevelId);
  assert.equal(q.status,result.status);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.levelSha256,request.levelSha256);
  assert(q.attempt||q.proof?.attempt,'No invented or missing attempt fallback');if(q.attempt)assert.deepEqual(q.attempt,request);if(q.proof?.attempt)assert.deepEqual(q.proof.attempt,request);
  assert(q.proof&&result.lower,'Original failed proof record required');assert.deepEqual(q.proof,result.lower);
  const f=sealedWorldIdentity(q.level);for(const k of ['levelSha256','shapeSha256','colorSha256','colorAssignments','designSha256'])assert.deepEqual(f[k],request[k],'Original physical identity mismatch');
  if(request.retryIdentitySha256)assert.equal(f.retryIdentitySha256,request.retryIdentitySha256);
  // Source-chain files are current, directly bound evidence, not additional
  // sealed comparison-world entries or a re-export of their historical batch.
  const provenance=async d=>{const q=await read(d),old=known.get(canonical(d.path));if(old)assert.equal(old.sha256,d.sha256,'Archived provenance mismatch');return q;};
  const creation=s.creation,report=await provenance(creation.batchReport),seed=await provenance(creation.seed),index=await provenance(creation.seedIndex),
   original=await provenance(creation.originalCandidate),inspection=await provenance(creation.inspection);
  assert.equal(report.status,'FINITE_NEARBAND_BATCH_FINISHED');const listed=report.rows.filter(r=>canonical(r.path)===canonical(s.receipt.path));assert.equal(listed.length,1);
  assert.equal(listed[0].sourceLevelId,s.sourceLevelId);assert.equal(listed[0].accepted,false);
  assert.deepEqual({path:q.provenance.input,sha256:q.provenance.inputFileSha256},creation.seed);
  assert.equal(q.provenance.inputLevelSha256,levelSha256(seed.level));assert.equal(seed.sourceLevelId,s.sourceLevelId);
  assert.equal(seed.levelSha256,levelSha256(seed.level));assert.equal(q.provenance.importedReference,creation.seedIndex.path);
  assert(index.files.some(p=>canonical(p)===canonical(creation.seed.path)));
  assert.deepEqual(seed.provenance,q.provenance.priorWholeBoardConstruction);
  assert.deepEqual(seed.provenance.originalCandidate,creation.originalCandidate);assert.deepEqual(seed.provenance.inspection,creation.inspection);
  assert.deepEqual(original.level,seed.level);assert.equal(original.levelSha256,seed.levelSha256);
  assert.deepEqual(original.provenance,seed.provenance.originalProvenance);
  assert(inspection.selected.some(r=>canonical(r.path)===canonical(creation.originalCandidate.path)&&r.sha256===creation.originalCandidate.sha256&&r.sourceLevelId===s.sourceLevelId&&r.levelSha256===seed.levelSha256));
  // Ancestry bytes are consumed as provenance only. The one newly supplied
  // comparison world per row is the ORIGINAL failed packet, never a new input.
  worlds.push({descriptor:clone(s.receipt),field:'level',level:clone(q.level),sourceLevelId:s.sourceLevelId,reference:clone(creation.seed),fingerprints:f,
   origin:'reviewed-supplemental-original-failed-packet',attemptId:request.id,accepted:false});
  rows.push({sourceLevelId:s.sourceLevelId,namespace:canonical(s.namespace),attemptId:request.id,receipt:clone(s.receipt),supplement:clone(d)});
 }
 if(!qualificationOnly)assert.deepEqual([...sources].sort((a,b)=>a-b),[7,11,50]);
 // Preserve sealed objects/arrays exactly; never mutate or re-label the baseline.
 const nearPools={...state.nearPools,history:[...state.nearPools.history,...worlds]},archivedBindings={...state.bundle.archivedBindings};
 for(const f of additions)archivedBindings[f.path]=f.sha256;
 const bundle={...state.bundle,files:[...state.bundle.files,...additions],archivedBindings,nearPools};
 const supplementalEvidence={version:SUPPLEMENT_VERSION,supplements:clone(supplements),review:clone(review),baseHeadSha256:state.headSha256,
  viewSha256:levelSha256({head:state.headSha256,supplements,review}),allowedRoles:['failed-parent'],qualificationOnly,addedHistoricalFullWorlds:worlds.length,
  addedHistoricalEvidenceFiles:additions.length,newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false,reviewedProjectionExcludesSupplement:true};
 const overlay={...state,bundle,nearPools,fullWorlds:Object.values(nearPools).flat(),supplementalFailedParentEvidence:supplementalEvidence,
  fileBindings:{...state.fileBindings,...fileBindings}};
 const parents=[];for(const row of rows){const value=await readDirectHistoryRole(overlay,{...row,role:'failed-parent',readBytes});
  Object.assign(fileBindings,value.fileBindings);parents.push({...row,...value});}
 // readDirectHistoryRole applies existing latest-descendant/pending guards on
 // the full CURRENT terminal set, including all already consumed owner deltas.
 for(const [p,h]of Object.entries(fileBindings))assert.equal(sha256(await readBytes(p)),h,'Evidence changed during supplement read');
 for(const [p,h]of Object.entries(fileBindings))if(state.fileBindings[p])assert.equal(state.fileBindings[p],h,'Current binding conflict');
 overlay.fileBindings={...state.fileBindings,...fileBindings};
 return{state:overlay,parents,fileBindings,supplementalEvidence,mathematicalProofRevalidated:false};
}

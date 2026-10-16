import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {physicalPartition,physicalRetry} from './early-frozen-construction-contract.mjs';

export const EXACT_LOW20_FAILED_NEAR_VERSION='exact-audited-low20-twelve-failed-near-only-v1';
export const EXACT_LOW20_FAILED_AUDIT=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/low-band-diverse-twenty-actual-task-independent-01/report.json',sha256:'c96f6afedfe0264a6cc01d10368a05109d0f9e0247cf73d8eca3611a9b7fde3b'});
const PUBLIC='deliverables/daily-formal-v3-20261008/proof/attempts';
const hash=b=>createHash('sha256').update(b).digest('hex');
const norm=f=>path.resolve(f).replaceAll('\\','/').toLowerCase();
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact descriptor required');
const allowedStatuses=new Set(['UNKNOWN_CONSTRUCTED_UPPER_TERMINAL','KNOWN_UPPER_BELOW_PREDECLARED_FLOOR']);

/** Pure chain check for the two actual terminal schemas in the pinned audit.
 * This grants no retry, mathematical acceptance or exemption from exact identity. */
export function assertExactLow20FailedChain({auditRow,receipt,request,result,blocked,identityBlocked}){
 const q=receipt,r=auditRow;assert.equal(r.accepted,false);assert.equal(r.failureSealed,true);
 assert.equal(q.accepted,false);assert.equal(q.qualificationOnly,false);assert.equal(q.catalogEligible,false);assert.equal(q.formalReady,false);
 assert.equal(q.version,'low-band-fixed-prefix-one-capped-tail-original-lower-task-v1');assert(allowedStatuses.has(q.status),'Only exact audited low20 terminal failures allowed');
 assert.equal(q.L,null);assert.equal(q.lowerBound,null);assert.equal(q.mathematicalEvidenceValidated,false);
 assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(r.levelSha256,q.levelSha256);assert.equal(r.sourceLevelId,q.sourceLevelId);assert.equal(r.attemptId,q.attempt.id);
 assert.deepEqual(request,q.attempt);assert.equal(request.levelSha256,q.levelSha256);assert.equal(request.id,r.attemptId);
 const f=designFingerprints(q.level);assert.equal(request.id,f.designSha256);assert.equal(request.shapeSha256,f.shapeSha256);assert.equal(request.colorSha256,f.colorSha256);assert.equal(request.retryIdentitySha256,physicalRetry(f));
 assert.equal(result.accepted,false);assert.equal(result.status,q.status);assert.equal(result.levelSha256,q.levelSha256);assert.equal(result.lower,undefined);
 assert.equal(blocked.attemptId,request.id);assert.equal(identityBlocked.attemptId,request.id);assert.equal(blocked.status,q.status);assert.equal(identityBlocked.status,q.status);
 if(q.status==='UNKNOWN_CONSTRUCTED_UPPER_TERMINAL'){assert.equal(q.U,null);assert.equal(q.route,null);assert.equal(result.upper,undefined);}
 else{assert(Number.isSafeInteger(q.U)&&q.U>=0&&q.U<q.plan.floor);assert.equal(q.route.search,null);assert.equal(result.upper,null);}
 assert.equal(r.L,q.L);assert.equal(r.U,q.U);return true;
}

/** The public result is the same audited failure before the batch runner adds
 * these seven provenance fields. Require the entire original packet, not just
 * a matching partition or accepted:false, before adding its origin alias. */
export function assertExactLow20FailedPublicSidecar(receipt,sidecar,sidecarDescriptor){
 descriptor(sidecarDescriptor);
 const expected=`${PUBLIC}/${receipt.attempt.id}.v4-low-band-prefix-tail-result.json`;
 assert.equal(norm(sidecarDescriptor.path),norm(expected),'Unexpected public failure sidecar path');
 assert.equal(norm(receipt.evidenceFile),norm(expected),'Receipt does not name this public sidecar');
 const runnerFields=new Set(['input','batchPlan','batchExecutionPlan','preflightAudit','visualReview','selectionIndexUnchanged','admissionStatus']);
 assert.deepEqual(sidecar,Object.fromEntries(Object.entries(receipt).filter(([k])=>!runnerFields.has(k))),'Public failure sidecar differs from audited original packet');
 assert.equal(sidecar.accepted,false);assert(allowedStatuses.has(sidecar.status));
 assert.equal(levelSha256(sidecar.level),receipt.levelSha256);
 assert.deepEqual(sidecar.level,receipt.level);assert.deepEqual(sidecar.attempt,receipt.attempt);
 return true;
}

/** Only the proven origin file + bytes + full level can be omitted from a
 * failed-sketch near-comparison set. Do not apply this to source/reference,
 * selected, successful/reserve or visual-retired sets. Partition hashes below
 * are diagnostics, never an exclusion predicate. No filesystem writes occur. */
export function isExactFailedNearAlias(historyRow,allowance){
 if(!historyRow?.level||allowance?.version!==EXACT_LOW20_FAILED_NEAR_VERSION||allowance.exactIdentityExclusionUnchanged!==true)return false;
 if(historyRow.accepted===true||historyRow.catalogEligible===true||historyRow.formalReady===true||historyRow.mathematicalEvidenceValidated===true||historyRow.qualificationOnly===true||historyRow.reserve===true||historyRow.visualRetired===true||historyRow.protectedNear===true)return false;
 if(/(?:ACCEPTED|VERIFIED|PASS|RESERVE|RETIRED)/i.test(historyRow.status??''))return false;
 const origin=historyRow.origin??historyRow.descriptor??historyRow;
 if(typeof origin.path!=='string'||!/^[a-f0-9]{64}$/.test(origin.sha256??''))return false;
 const levelHash=levelSha256(historyRow.level);if(historyRow.levelSha256&&historyRow.levelSha256!==levelHash)return false;
 return allowance.aliases.some(a=>a.levelSha256===levelHash&&a.sha256===origin.sha256&&(a.originPaths??[a.path]).some(p=>norm(p)===norm(origin.path)));
}

/** Fixed allowlist only: no caller-supplied replacement audit, directory scan,
 * broad accepted:false classification, source inference or gameplay call. */
export async function readExactLow20FailedNearAllowance(bindings={}){
 const fileBindings={},cache=new Map();
 const read=async d=>{descriptor(d);const b=await fs.readFile(d.path),s=hash(b);assert.equal(s,d.sha256,'Changed exact failed-near evidence: '+d.path);
  for(const p of [d.path,path.resolve(d.path)]){if(bindings[p])assert.equal(bindings[p],s,'Conflicting caller binding');if(fileBindings[p])assert.equal(fileBindings[p],s);bindings[p]=s;fileBindings[p]=s;}
  const k=norm(d.path);if(!cache.has(k))cache.set(k,JSON.parse(b));return cache.get(k);};
 const audit=await read(EXACT_LOW20_FAILED_AUDIT);assert.equal(audit.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(audit.errors,[]);assert.equal(audit.accepted,0);assert.equal(audit.newSearches,0);assert.equal(audit.newLedgerClaims,0);assert.equal(audit.results.length,12);
 const reviewedBindings=new Map();for(const [f,h]of Object.entries(audit.fileBindings)){const k=norm(f);if(reviewedBindings.has(k))assert.equal(reviewedBindings.get(k),h);reviewedBindings.set(k,h);}
 const reviewed=d=>{descriptor(d);const candidates=[norm(d.path),norm(path.resolve(audit.executionWorkspace,d.path))];assert(candidates.some(k=>reviewedBindings.get(k)===d.sha256),'Not bound by exact c96 audit: '+d.path);return d;};
 const descriptorFor=f=>{const h=reviewedBindings.get(norm(f))??reviewedBindings.get(norm(path.resolve(audit.executionWorkspace,f)));assert(h,'Missing exact audited file '+f);return{path:f,sha256:h};};
 const completion=await read(reviewed(audit.completion));assert.equal(completion.status,'FINITE_FIRST_PREFIX_TAIL_BATCH_FINISHED');assert.equal(completion.results.length,12);assert.deepEqual(completion.accepted,[]);assert.equal(completion.mathematicalPoolAccepted,0);
 const indexDescriptor=reviewed(completion.descriptors.index),index=await read(indexDescriptor);assert.equal(index.candidates.length,12);assert.deepEqual(index.plan,completion.batchPlan);
 const terminalDescriptor=descriptorFor('deliverables/daily-formal-v4-20261008/design/late-prefix-construction-ledger/'+completion.batchPlan.sha256+'.result.json');
 const terminal=await read(terminalDescriptor);assert.deepEqual(terminal.plan,index.plan);assert(Array.isArray(terminal.constructionFiles));
 const rows=[],aliases=[],seenAttempts=new Set();
 const addAlias=async(d,level,kind,attemptId)=>{descriptor(d);const levelHash=levelSha256(level),partitionSha256=physicalPartition(level);const originPaths=[...new Set([d.path,path.resolve(d.path),await fs.realpath(d.path)])];
  if(!aliases.some(a=>norm(a.path)===norm(d.path)&&a.levelSha256===levelHash))aliases.push({...d,originPaths,levelSha256:levelHash,partitionSha256,kind,terminalAttemptId:attemptId,nearOnly:true});};
 for(const [i,r]of audit.results.entries()){
  const row=completion.results[i];assert.equal(row.file,r.file);assert.equal(row.sha256,r.sha256);assert.equal(row.accepted,false);
  const receiptDescriptor=reviewed({path:r.file,sha256:r.sha256}),q=await read(receiptDescriptor),a=q.attempt;assert(!seenAttempts.has(a.id));seenAttempts.add(a.id);assert.equal(row.attemptId,a.id);assert.equal(row.status,q.status);assert.equal(row.sourceLevelId,q.sourceLevelId);
  const request=descriptorFor(`${PUBLIC}/${a.id}.request.json`),result=descriptorFor(`${PUBLIC}/${a.id}.result.json`),blocked=descriptorFor(`${PUBLIC}/${a.id}.blocked.json`),identityBlocked=descriptorFor(`${PUBLIC}/identities/${a.retryIdentitySha256}.blocked.json`);
  assertExactLow20FailedChain({auditRow:r,receipt:q,request:await read(request),result:await read(result),blocked:await read(blocked),identityBlocked:await read(identityBlocked)});
  const publicSidecar=descriptorFor(`${PUBLIC}/${a.id}.v4-low-band-prefix-tail-result.json`),publicPacket=await read(publicSidecar);
  assertExactLow20FailedPublicSidecar(q,publicPacket,publicSidecar);
  const inputDescriptor=reviewed(q.input),input=await read(inputDescriptor);assert.equal(row.input,q.input.path);assert.equal(input.accepted,false);assert.equal(input.levelSha256,q.levelSha256);assert.deepEqual(input.level,q.level);assert.deepEqual(input.fixedBatchPlan,completion.batchPlan);
  const idx=index.candidates.find(x=>x.path===q.input.path);assert(idx);assert.equal(idx.sha256,q.input.sha256);assert.equal(idx.levelSha256,q.levelSha256);
  const construction=reviewed(input.constructionEvidence),built=await read(construction);assert.deepEqual(construction,q.plan.constructionEvidence);assert.deepEqual(built.plan,completion.batchPlan);assert.deepEqual(built.level,q.level);assert.equal(built.levelSha256,q.levelSha256);assert.equal(built.accepted,false);
  const staticAttempt=index.attempts.find(x=>x.candidate?.path===q.input.path);assert(staticAttempt);assert.deepEqual(staticAttempt.constructionEvidence,construction);assert(terminal.constructionFiles.some(d=>d.path===construction.path&&d.sha256===construction.sha256),'Missing terminal construction membership');
  await addAlias(receiptDescriptor,q.level,'failed-mathematical-receipt',a.id);
  await addAlias(publicSidecar,publicPacket.level,'exact-public-failed-result-sidecar',a.id);
  for(const [d,packet,kind]of [[inputDescriptor,input,'fixed-physical-input'],[construction,built,'terminal-construction']]){
   for(const [field,level]of [['level',packet.level],['placeholderWorld',packet.placeholderWorld],['plain.level',packet.plain?.level],['plain.placeholderWorld',packet.plain?.placeholderWorld]]){
    if(!level)continue;assert.equal(physicalPartition(level),physicalPartition(q.level),'Alias not same constructed partition');assert.equal(level.id,q.level.id);assert.deepEqual(level.gates,q.level.gates);assert.equal(level.width,q.level.width);assert.equal(level.height,q.level.height);
    await addAlias(d,level,kind+':'+field,a.id);
   }
  }
  rows.push({sourceLevelId:q.sourceLevelId,attemptId:a.id,status:q.status,receipt:receiptDescriptor,publicSidecar,input:inputDescriptor,construction,request,result,blocked,identityBlocked,levelSha256:q.levelSha256,partitionSha256:physicalPartition(q.level)});
 }
 assert.equal(rows.length,12);assert.equal(seenAttempts.size,12);
 // Re-read the bounded allowlist at return; no whole history scan is performed.
 for(const [f,h]of Object.entries(fileBindings))assert.equal(hash(await fs.readFile(f)),h,'Evidence changed during read '+f);
 return{version:EXACT_LOW20_FAILED_NEAR_VERSION,actualAudit:EXACT_LOW20_FAILED_AUDIT,completion:audit.completion,index:indexDescriptor,constructionTerminal:terminalDescriptor,rows,aliases,
  nearExcludedLevelSha256s:[...new Set(aliases.map(a=>a.levelSha256))],nearExcludedPartitionSha256s:[...new Set(aliases.map(a=>a.partitionSha256))],
  exactIdentityExclusionUnchanged:true,partitionListsAreDiagnosticsOnly:true,successfulReserveRetiredRemainProtected:true,newSearches:0,newConstructions:0,newLedgerClaims:0,fileBindings};
}

import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertNativeBasicOriginalEvidence,assertCompleteBasicDraftPool,NATIVE_BASIC_DRAFT_INPUTS,NATIVE_BASIC_SLOT} from './prepare-native-basic-admission.mjs';

// Immutable real receipts, cloned solely in memory. No runtime load, solver,
// claim, finish, selection modification or public test namespace is involved.
const read=p=>JSON.parse(fs.readFileSync(p));
const proof=read(NATIVE_BASIC_DRAFT_INPUTS.math.path),ledger='deliverables/daily-formal-v3-20261008/proof/attempts/';
const request=read(ledger+proof.attempt.id+'.request.json');
const evidence={proof,input:read(proof.input.path),request,result:read(ledger+request.id+'.result.json'),saved:read(proof.evidenceFile),
 planEvidence:read(proof.planEvidence.path),parent:read(ledger+request.redesignOf+'.request.json'),parentResult:read(ledger+request.redesignOf+'.result.json'),slot:NATIVE_BASIC_SLOT};
const clone=()=>structuredClone(evidence);
function rebindSaved(q){for(const k of Object.keys(q.saved))q.saved[k]=structuredClone(q.proof[k]);}

test('exact original full-level native evidence is accepted as a draft source',()=>{
 const r=assertNativeBasicOriginalEvidence(clone());assert.equal(r.L,31);assert.equal(r.U,40);assert.equal(r.upperWorlds,569);assert.equal(r.lowerWorlds,5056);
});
test('tail source cannot replace original full opening lower',()=>{
 const q=clone();q.proof.lowerBound.result.sourceLevelSha256=q.proof.upperConstruction.tailLevelSha256;
 q.proof.proof=structuredClone(q.proof.lowerBound.result);q.result.lower=structuredClone(q.proof.lowerBound.result);rebindSaved(q);
 assert.throws(()=>assertNativeBasicOriginalEvidence(q));
});
test('partial floor or failed public result cannot pass',()=>{
 for(const edit of [q=>q.result.accepted=false,q=>{q.proof.lowerBound.result.certifiedFloor=30;q.proof.proof=structuredClone(q.proof.lowerBound.result);q.result.lower=structuredClone(q.proof.proof);rebindSaved(q);}]){
  const q=clone();edit(q);assert.throws(()=>assertNativeBasicOriginalEvidence(q));}
});
test('shared budget includes construction, prefix and guard with no off-by-one discount',()=>{
 for(const n of [568,570,10001]){const q=clone();q.proof.upperAccounting.conservativeFullBoardStateUpperBound=n;rebindSaved(q);assert.throws(()=>assertNativeBasicOriginalEvidence(q));}
 const q=clone();q.proof.upperConstruction.tailSearch.budget.maxStates++;q.proof.upperConstruction.tailSearch.guardAllowance.registeredSetBudget++;
 rebindSaved(q);assert.throws(()=>assertNativeBasicOriginalEvidence(q));
});
test('native saved result and public request must describe the same full object',()=>{
 for(const edit of [q=>q.request.levelSha256='0'.repeat(64),q=>q.saved.U--,q=>q.result.levelSha256='0'.repeat(64),q=>q.planEvidence.plan.floor=30]){
  const q=clone();edit(q);assert.throws(()=>assertNativeBasicOriginalEvidence(q));}
});
test('old failure must have actual different shape and colour fingerprints',()=>{
 for(const field of ['shapeSha256','colorSha256']){const q=clone();q.parent[field]=q.request[field];assert.throws(()=>assertNativeBasicOriginalEvidence(q));}
 const q=clone();q.parentResult.accepted=true;assert.throws(()=>assertNativeBasicOriginalEvidence(q));
});
test('truncated full witness or another slot cannot be admitted',()=>{
 const q=clone();q.proof.drags.pop();assert.throws(()=>assertNativeBasicOriginalEvidence(q));
 const p=clone();p.slot.slot=9;assert.throws(()=>assertNativeBasicOriginalEvidence(p));
});
test('exact basic three-by-ten slot identities are required, with one unoccupied target',()=>{
 const selected=read(NATIVE_BASIC_DRAFT_INPUTS.selection.path).files.map(read);
 const slots=[...selected.filter(q=>q.stageKey==='basic-combined').map(q=>Object.fromEntries(Object.keys(NATIVE_BASIC_SLOT).map(k=>[k,q[k]]))),NATIVE_BASIC_SLOT];
 assert.equal(assertCompleteBasicDraftPool(selected,NATIVE_BASIC_SLOT,slots).basicCandidates,30);
 const missing=structuredClone(selected);missing[0].formalId='other';assert.throws(()=>assertCompleteBasicDraftPool(missing,NATIVE_BASIC_SLOT,slots));
 const wrong=structuredClone(selected);wrong[0].difficulty=2;assert.throws(()=>assertCompleteBasicDraftPool(wrong,NATIVE_BASIC_SLOT,slots));
 const occupied=structuredClone(selected);occupied[0]={...NATIVE_BASIC_SLOT};assert.throws(()=>assertCompleteBasicDraftPool(occupied,NATIVE_BASIC_SLOT,slots));
});
test('only the fixed descriptors are exposed; no generic accepted or merge API',async()=>{
 assert(Object.isFrozen(NATIVE_BASIC_DRAFT_INPUTS));for(const d of Object.values(NATIVE_BASIC_DRAFT_INPUTS))assert(Object.isFrozen(d));
 const api=await import('./prepare-native-basic-admission.mjs');assert.equal(api.admit,undefined);assert.equal(api.merge,undefined);
 assert.throws(()=>NATIVE_BASIC_DRAFT_INPUTS.math.sha256='0'.repeat(64));
});

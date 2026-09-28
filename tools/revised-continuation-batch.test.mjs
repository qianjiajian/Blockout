import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from './revised-preview-validation-v160.mjs';
import {continuationApi, checkContinuationCandidate, checkCarrierRelations, checkHistoricalCandidateInputs, verifyContinuationBatch, reviewedSourceAdapter} from './revised-continuation-batch.mjs';

const ARCHIVE='.codex-temp/remaining161-v110/adoption-cumulative63/adoption-typed.json';
const SHA='8b52e5870280fcdd77666812c0954b6b3493a544bfe6a91e2391ce9656878fd1';
const archive=JSON.parse(fs.readFileSync(ARCHIVE));

test('new formal batch preserves all 137 other levels and the old time/star/reward targets', async()=>{
  assert.equal(digest(fs.readFileSync(ARCHIVE)),SHA);
  const r=await verifyContinuationBatch(ARCHIVE,SHA);
  assert.deepEqual(r.rows.map(row=>row.levelId),[37,38,40,41,42,45,47,49,51,53,54,55,56,57,61,62,65,66,67,69,74,76,77,80,81,82,85,86,87,88,91,95,96,100,116,120,124,126,127,133,138,140,149,155,157,158,164,165,166,168,169,170,174,175,178,179,180,183,192,193,195,197,198]);
  assert.equal(r.unchanged,137);
  assert.equal(r.formalIds.length,82);
  for(const row of r.rows){assert(row.replay.valid&&row.replay.complete);assert(row.coverage.passed);assert(row.gateSpanAudit.passed);}
  assert.equal(r.pointerValidated,false,'Model verification must not mint UI evidence');
  assert.equal(r.naturalClockValidated,false);
  assert.equal(r.lowerBoundCertified,false);
});

test('refuses a changed archive even when it parses',async()=>{
  await assert.rejects(verifyContinuationBatch(ARCHIVE,'0'.repeat(64)),/Evidence drift/);
});

test('rejects changed candidate/source bytes and wrong level identity',async()=>{
  const {api}=await continuationApi(),row=archive.rows[0];
  await assert.rejects(checkContinuationCandidate({...row,sha256:'0'.repeat(64)},api),/Evidence drift/);
  await assert.rejects(checkContinuationCandidate({...row,sourceReview:{...row.sourceReview,sha256:'0'.repeat(64)}},api),/(Source review|Evidence) drift/);
  await assert.rejects(checkContinuationCandidate({...row,levelId:39},api));
});

test('positive physical lifts select strict M09 adapter, never synthetic source fixtures',()=>{
  const plain=reviewedSourceAdapter({sourceNormalizedFacts:{mechanisms:{elevators:{count:0}}}});
  const lifts=reviewedSourceAdapter({sourceNormalizedFacts:{mechanisms:{elevators:{count:1}}}});
  assert.notEqual(lifts.verifyReviewedDesign,plain.verifyReviewedDesign);
  assert.equal(typeof lifts.auditLiftGeometry,'function');
  const stars=reviewedSourceAdapter({sourceNormalizedFacts:{mechanisms:{starBlocks:{count:7},exits:{starCount:2}}}});
  assert.equal(typeof stars.auditStarSourceMetadata,'function');
  assert.notEqual(stars.verifyReviewedDesign,plain.verifyReviewedDesign);
  assert.throws(()=>reviewedSourceAdapter({testFixtureOnly:true}),/Synthetic fixture/);
});

test('same lock and shell totals cannot hide a changed known carrier relationship',()=>{
  const review={carrierRelations:{lockedShellValues:[1],keyShellCount:0},carrierRelationsEvidence:{paths:['frame'],reason:'Lock1 reveals a shell'},bindings:{frame:'pinned-by-source-loader'}};
  const level={blocks:[{layers:['red','blue'],lockedBy:'key',lockCount:1},{keyId:'key'}]};
  checkCarrierRelations(level,review);
  const detached={blocks:[{layers:['red','blue']},{lockedBy:'key',lockCount:1},{keyId:'key'}]};
  assert.throws(()=>checkCarrierRelations(detached,review),/Locked shell carrier association/);
  assert.throws(()=>checkCarrierRelations({blocks:[...level.blocks,{keyId:'another',layers:['red','blue']}]},review),/Key shell carrier association/);
  const iceReview={...review,carrierRelations:{numericIceAxes:[{value:5,axis:'horizontal'}]}};
  checkCarrierRelations({blocks:[{frozen:5,movementAxis:'horizontal'}]},iceReview);
  assert.throws(()=>checkCarrierRelations({blocks:[{frozen:5},{movementAxis:'horizontal'}]},iceReview),/Numeric ice axis carrier association/);
});

test('only historical artManifest implementation drift is deferred to fresh validation',()=>{
  const result=checkHistoricalCandidateInputs({'src/game/artManifest.ts':'0'.repeat(64)});
  assert.equal(result.historicalNonSourceDrift.length,1);
  assert.equal(result.current['src/game/artManifest.ts'],digest(fs.readFileSync('src/game/artManifest.ts')));
  for(const p of ['src/core/PuzzleModel.ts','tools/revised-candidate-block-art.mjs',archive.rows[0].sourceReview.path]){
    assert.throws(()=>checkHistoricalCandidateInputs({[p]:'0'.repeat(64)}),/Candidate input changed/);
  }
});

test('current art must still pass after a historical manifest change',async()=>{
  const {api}=await continuationApi();
  await assert.rejects(checkContinuationCandidate(archive.rows[0],{...api,auditCandidateBlockArt:()=>({passed:false,issues:['missing current art']})}),/Formal shape art/);
});

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {loadPreviewCore,digest} from './revised-preview-validation-v160.mjs';
import {loadReviewedDesignSource,assertKeyedIceCarriers,verifyReviewedDesign} from './revised-design-review-keyed-ice-v110.mjs';
import {reviewedSourceAdapter,continuationApi} from './revised-continuation-batch.mjs';
const own='.codex-temp/remaining147-v110/late',reviewPath=path.join(own,'source-review-192.json');
const sourceSha='373574a0464f6c7764e9bd846fa842b3b19a30dd9207f181cd7326775a9ec9ce',candidateSha='6c5f6d4ff232935c80ea57cf80de51e5c67a9f1d780889e2bca826373cd14924';
assert.equal(digest(fs.readFileSync(reviewPath)),sourceSha,'Independently reviewed source must stay immutable');
const review=JSON.parse(fs.readFileSync(reviewPath)),{source}=await loadReviewedDesignSource(reviewPath,sourceSha),{api}=await loadPreviewCore();
const fixture=()=>({blocks:[{id:'a',keyId:'arbitrary-A',frozen:2},{id:'b',keyId:'arbitrary-A'},{id:'c',lockedBy:'arbitrary-A',lockCount:2},{id:'d',keyId:'other/B'},{id:'e',keyId:'other/B'},{id:'f',lockedBy:'other/B',lockCount:2},{id:'g',keyId:'one'},{id:'h',lockedBy:'one',lockCount:1},{id:'plain-ice',frozen:2}]});
async function negative(mutate){const copy=structuredClone(review);copy.status='synthetic-negative-not-certification';mutate(copy);const dir=fs.mkdtempSync(path.join(own,'keyed-ice-negative-')),p=path.join(dir,'review.json');fs.writeFileSync(p,JSON.stringify(copy));return loadReviewedDesignSource(p,digest(fs.readFileSync(p)));}
test('independent source binds exact two-key frozen association and all original evidence',()=>{assert.equal(source.keyedIceGroups.length,3);assert.deepEqual(source.keyedIceGroups.map(g=>g.keyCount).sort(),[1,2,2]);assert.equal(source.keyedIceGroups.flatMap(g=>g.frozenKeyValues).length,1);});
test('arbitrary group names and input order preserve canonical associations including hidden cargo',()=>{const l=fixture();l.blocks[0].shutterId='real-hidden';l.blocks[1].generatorId='queued';l.blocks.reverse();assert.equal(assertKeyedIceCarriers(l,source).passed,true);});
test('move ice from key to plain block cannot pass same numeric-ice count',()=>{const l=fixture();delete l.blocks[0].frozen;l.blocks.push({id:'other-ice',frozen:2});assert.throws(()=>assertKeyedIceCarriers(l,source),/per-group/);});
test('move ice to one-key group cannot pass total frozen-key count',()=>{const l=fixture();delete l.blocks[0].frozen;l.blocks[6].frozen=2;assert.throws(()=>assertKeyedIceCarriers(l,source),/per-group/);});
test('key ice initial value cannot change',()=>{const l=fixture();l.blocks[0].frozen=3;assert.throws(()=>assertKeyedIceCarriers(l,source),/per-group/);});
test('lock cannot acquire ice instead of key',()=>{const l=fixture();delete l.blocks[0].frozen;l.blocks[2].frozen=2;assert.throws(()=>assertKeyedIceCarriers(l,source),/per-group/);});
test('key cannot acquire unobserved shell or lock',()=>{const l=fixture();l.blocks[0].layers=['red','blue'];assert.throws(()=>assertKeyedIceCarriers(l,source),/intersection/);delete l.blocks[0].layers;l.blocks[0].lockedBy='one';assert.throws(()=>assertKeyedIceCarriers(l,source),/intersection/);});
test('unknown frozen-key metadata is rejected rather than assumed empty',async()=>{await assert.rejects(negative(r=>delete r.sourceNormalizedFacts.mechanisms.keysLocks.groups[0].frozenKeyValues),/Explicit frozen-key/);});
test('independent M03 observation must agree with source facts',async()=>{await assert.rejects(negative(r=>r.sourceInventory.M03.groups[0].frozenKeyValues=[]),/observation\/facts/);});
test('numeric-ice item must reference a known source group',async()=>{await assert.rejects(negative(r=>r.sourceFacts.numericIce.items[0].keyGroup='unknown'),/known key association/);});
test('per-group numeric items cannot contradict frozen-key values',async()=>{await assert.rejects(negative(r=>r.sourceFacts.numericIce.items[0].keyGroup='green'),/item\/key-group/);});
test('all ice item values agree with normalized source, including plain ice',async()=>{await assert.rejects(negative(r=>r.sourceFacts.numericIce.items[1].value=3),/item\/facts/);});
test('numeric ice observation cannot change keyed total',async()=>{await assert.rejects(negative(r=>r.sourceInventory.M14.keyedCount=2),/Keyed numeric-ice count/);});
test('source identities must distinguish independently observed groups',async()=>{await assert.rejects(negative(r=>r.sourceNormalizedFacts.mechanisms.keysLocks.groups[1].sourceGroup='red'),/Duplicate source group/);});
test('source evidence hash drift is still rejected by base loader',async()=>{await assert.rejects(negative(r=>r.bindings[r.evidence[0].path].sha256='0'.repeat(64)),/evidence drift/);});
test('source incomplete metadata remains fail-closed',async()=>{await assert.rejects(negative(r=>r.unresolved=['missing frame']),/Unresolved/);});
test('whole192 candidate freshly replays when present',()=>{const p=path.join(own,'candidate-192.json');assert(fs.existsSync(p),'Qualified candidate must exist before passing the suite');assert.equal(digest(fs.readFileSync(p)),candidateSha,'Pinned original candidate must stay immutable');const raw=JSON.parse(fs.readFileSync(p)),v=verifyReviewedDesign(raw,source,api);assert(v.replay.complete&&v.art.passed&&v.coverage.passed&&v.keyedIce.passed);});


test('continuation dispatch cannot bypass positive keyed-ice carrier audit',()=>{assert.equal(reviewedSourceAdapter(review).verifyReviewedDesign,verifyReviewedDesign);for(const select of [
 r=>{r.sourceNormalizedFacts.mechanisms.keysLocks.groups.forEach(g=>delete g.frozenKeyValues);},
 r=>{delete r.sourceInventory.M14.keyedCount;r.sourceFacts.numericIce.items.forEach(i=>i.keyGroup=null);},
 r=>{r.sourceNormalizedFacts.mechanisms.keysLocks.groups.forEach(g=>delete g.frozenKeyValues);delete r.sourceInventory.M14.keyedCount;r.sourceFacts.numericIce.items.forEach(i=>i.keyGroup=null);r.carrierRelations={keyFrozenCount:1};}
]){const r=structuredClone(review);select(r);assert.equal(reviewedSourceAdapter(r).verifyReviewedDesign,verifyReviewedDesign);}});
test('synthetic source is never eligible for continuation adoption',()=>{assert.throws(()=>reviewedSourceAdapter({...review,testFixtureOnly:true}),/Synthetic/);});
test('joint keyed-ice and lift cannot silently select a partial-family validator',async()=>{await assert.rejects(negative(r=>{r.sourceNormalizedFacts.mechanisms.elevators={count:1,hiddenBatchCounts:[[1]]};r.sourceInventory.M09.count=1;}),/Positive lifts/);});
test('current continuation dependency fingerprint includes keyed-ice validator and base',async()=>{const {inputs}=await continuationApi();assert(inputs.includes('tools/revised-design-review-keyed-ice-v110.mjs'));assert(inputs.includes('tools/revised-design-review-expanded-v190.mjs'));});

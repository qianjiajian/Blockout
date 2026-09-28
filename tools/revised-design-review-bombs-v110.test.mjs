import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {digest,loadPreviewCore} from './revised-preview-validation-v160.mjs';
import {loadReviewedDesignSource,verifyReviewedDesign,auditBombSourceMetadata,auditBombCarriers} from './revised-design-review-bombs-v110.mjs';

const {api}=await loadPreviewCore();
const original=JSON.parse(await fs.readFile('.codex-temp/remaining147-v110/early/candidate-49.json'));
const originalReview=JSON.parse(await fs.readFile('.codex-temp/remaining147-v110/early/source-review-49.json'));
// Synthetic mutation fixtures only. They never become competitor-source records.
function fixture(){
 const raw=structuredClone(original),review=structuredClone(originalReview),frame=review.evidence[0];
 raw.level.name='Synthetic timed adapter test, not a campaign design';
 const b=raw.level.blocks.find(b=>b.id===raw.drags[0].blockId);b.timedBombSeconds=100;
 review.testFixtureOnly=true;review.status='synthetic-not-source-certification';
 review.bindings={[frame.path]:frame.sha256};review.evidence=[frame];review.stableOpeningEvidence=frame.path;
 for(const item of Object.values(review.sourceInventory))item.evidencePaths=[frame.path];
 review.sourceNormalizedFacts.mechanisms.bombs={count:1,values:[100]};
 const obs=review.sourceInventory.M07??review.sourceInventory.bombs;obs.count=1;obs.values=[100];
 review.sourceFacts.bombs={items:[{sourceId:'synthetic-bomb',seconds:100,shell:false,frozen:0,axis:null,keyGroup:null,lockGroup:null,star:false,reason:'Synthetic test only',evidencePaths:[frame.path]}]};
 let at=0;const events=[],push=(type,dtSeconds,data={})=>events.push({type,dtSeconds,atSeconds:at+=dtSeconds,...data});
 for(const d of raw.drags){push('down',.2,{blockId:d.blockId});for(const anchor of d.path)push('move',.08,{anchor});push('up',.4);}
 raw.timedRoute={schemaVersion:1,levelSha256:digest(raw.level),clockOrigin:'first-playable-stable-state',pointerPolicy:'first-shape-cell-center-and-unit-steps',durationSeconds:at,events};
 return{raw,review};
}
async function load(t,mutate=()=>{}){
 const f=fixture();mutate(f);const dir=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-bomb-adapter-test-'));
 t.after(async()=>{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));assert(path.basename(dir).startsWith('blockout-bomb-adapter-test-'));await fs.rm(dir,{recursive:true,force:true});});
 const p=path.join(dir,'synthetic-review.json'),bytes=JSON.stringify(f.review);await fs.writeFile(p,bytes);
 return{...f,...await loadReviewedDesignSource(p,digest(bytes))};
}
test('synthetic positive bomb source retains original inventory and timed complete replay',async t=>{
 const f=await load(t),v=verifyReviewedDesign(f.raw,f.source,api);
 assert(v.replay.valid&&v.replay.complete&&v.timedModelValidated);
 assert.deepEqual(v.sourceContract.mechanisms.bombSeconds,[100]);
 assert.deepEqual(v.proposedFacts.mechanisms.bombs,{count:1,values:[100]});
 assert.equal(v.pointerReplayValidated,false);assert.equal(v.timeValidated,false);assert.equal(v.releaseApproved,false);
 assert.equal(v.replay.effectiveDrags,f.raw.drags.length);
});
for(const [name,mutate]of [
 ['missing initial value',r=>{r.sourceNormalizedFacts.mechanisms.bombs.values=[null];}],
 ['missing carriers',r=>{delete r.sourceFacts.bombs;}],
 ['unknown shell',r=>{delete r.sourceFacts.bombs.items[0].shell;}],
 ['unknown ice',r=>{delete r.sourceFacts.bombs.items[0].frozen;}],
 ['unknown axis',r=>{delete r.sourceFacts.bombs.items[0].axis;}],
 ['unbound evidence',r=>{r.sourceFacts.bombs.items[0].evidencePaths=['unbound'];}],
 ['mismatching observation',r=>{(r.sourceInventory.M07??r.sourceInventory.bombs).values=[50];}],
 ['mismatching item',r=>{r.sourceFacts.bombs.items[0].seconds=50;}],
 ['unreviewed keyed bomb',r=>{r.sourceFacts.bombs.items[0].keyGroup='red';}],
 ['unreviewed locked bomb',r=>{r.sourceFacts.bombs.items[0].lockGroup='red';}],
 ['unknown starred status',r=>{delete r.sourceFacts.bombs.items[0].star;}],
 ['unreviewed keyed ice family',r=>{r.sourceNormalizedFacts.mechanisms.keysLocks.groups=[{keyCount:0,lockValues:[],frozenKeyValues:[2]}];}],
 ])test(`source loader rejects ${name}`,async t=>{await assert.rejects(load(t,f=>mutate(f.review)));});
test('same total shells cannot detach a bomb from its observed shell',()=>{
 const {review}=fixture(),source={sourceFacts:review.sourceFacts};
 const items=review.sourceFacts.bombs.items;items[0].shell=true;
 assert.throws(()=>auditBombCarriers({blocks:[{timedBombSeconds:100},{layers:['red','blue']}]},source),/association/);
 assert(auditBombCarriers({blocks:[{timedBombSeconds:100,layers:['red','blue']}]},source).passed);
});
test('duplicate source identity is rejected even when count and timer bags match',()=>{
 const {review}=fixture(),m=review.sourceNormalizedFacts.mechanisms;m.bombs={count:2,values:[100,100]};
 review.sourceFacts.bombs.items.push(structuredClone(review.sourceFacts.bombs.items[0]));
 assert.throws(()=>auditBombSourceMetadata(review,review.bindings),/Unique/);
});
test('route and positive clock are required; a spatial route cannot certify a bomb',async t=>{
 const f=await load(t);delete f.raw.timedRoute;
 assert.throws(()=>verifyReviewedDesign(f.raw,f.source,api),/Positive-time route/);
});
test('changing source bomb seconds or removing it cannot pass',async t=>{
 const f=await load(t),b=f.raw.level.blocks.find(b=>b.timedBombSeconds!==undefined);
 b.timedBombSeconds=120;assert.throws(()=>verifyReviewedDesign(f.raw,f.source,api),/carrier association/);
 delete b.timedBombSeconds;assert.throws(()=>verifyReviewedDesign(f.raw,f.source,api),/carrier association/);
});
test('original level time cannot be silently replaced under a preview timing hash',async t=>{
 const f=await load(t);f.raw.level.timeSeconds=1;
 assert.throws(()=>verifyReviewedDesign(f.raw,f.source,api),/Fresh complete replay/);
 f.raw.timedRoute.levelSha256=digest(f.raw.level);
 assert.throws(()=>verifyReviewedDesign(f.raw,f.source,api),/Fresh complete replay/);
});

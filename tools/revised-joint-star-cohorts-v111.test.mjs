import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditJointStarSource} from './revised-joint-star-cohorts-v111.mjs';
import {loadReviewedDesignSource,deriveDesignPolicy} from './revised-design-policy-joint-stars-v111.mjs';
const sourcePath='.codex-temp/remaining98-v111/late/new171/source-review-171-joint-stars.json';
const sourceSha='8d305d842cd417f5bf4220f3486d71f381f33a64b9baa9330044aa038c4f7829';
const original=JSON.parse(fs.readFileSync(sourcePath));assert.equal(digest(fs.readFileSync(sourcePath)),sourceSha);
const clone=()=>structuredClone(original),bodies=r=>Object.values(r.sourceCohorts).flat();
const guardPaths=[sourcePath,'tools/revised-joint-curtain-cohorts-v111.mjs','tools/revised-design-policy-joint-curtains-v111.mjs','tools/revised-design-review-joint-curtains-v111.mjs'];
const hashes=()=>Object.fromEntries(guardPaths.map(p=>[p,digest(fs.readFileSync(p))]));const before=hashes();after(()=>assert.deepEqual(hashes(),before));
test('real source preserves all21 bodies,9 stars,14 mouths and6 observed closed flip states',()=>{
 const saved=clone(),r=auditJointStarSource(original);assert.equal(r.allBodies.length,21);assert.equal(r.starBodies.length,9);assert.equal(r.physicalSourceExits.length,14);assert.equal(r.joint.length,1);assert.equal(r.groups[0].hiddenCount,9);assert.deepEqual(original,saved);assert(r.starBodies.every(b=>b.star===true));
});
test('source loader retains original star inventory and source null partition',async()=>{
 const {source}=await loadReviewedDesignSource(sourcePath,sourceSha);assert.deepEqual(source.facts,original.sourceNormalizedFacts);assert.equal(source.sourceContract.mechanisms.starBlocks,9);assert.equal(source.sourceContract.mechanisms.exits.filter(g=>g.star).length,7);assert.deepEqual(source.sourceContract.mechanisms.flipDoorInitialOpen,Array(6).fill(false));assert.equal(source.sourceContract.mechanisms.shutterHiddenBatchCounts,null);assert.deepEqual(source.sourceFacts.elevators,{count:0,hiddenBatchCounts:[],items:[]});
});
const rejects=(name,change)=>test(name,()=>{const r=clone();change(r);assert.throws(()=>auditJointStarSource(r));});
rejects('missing one observed star marker rejects',r=>delete bodies(r).find(b=>b.star).star);
rejects('fake extra opening star rejects',r=>r.sourceCohorts.opening[0].star=true);
rejects('string boolean is not a star count',r=>bodies(r).find(b=>b.star).star='true');
rejects('a shell cannot be smuggled into the complete source body ledger',r=>r.sourceCohorts.opening[0].innerColor='pink');
rejects('an extra axis cannot be ignored by geometric star projection',r=>r.sourceCohorts.opening[0].movementAxis='horizontal');
rejects('unknown body key is not discarded',r=>r.sourceCohorts.opening[0].frozen=3);
rejects('star total cannot disagree with ledger',r=>r.sourceNormalizedFacts.mechanisms.starBlocks.count=8);
rejects('missing physical star mouth rejects',r=>r.sourceExits.pop());
rejects('duplicating physical mouth identity rejects',r=>r.sourceExits[1].id=r.sourceExits[0].id);
rejects('source mouth geometry cannot lie outside tangential board limits',r=>r.sourceExits[0].offset=100);
rejects('unknown initial flip state cannot be inferred from count',r=>delete r.sourceExits.find(g=>g.kind==='flip').initiallyOpen);
rejects('an opened flip disagrees with observed closed inventory',r=>r.sourceExits.find(g=>g.kind==='flip').initiallyOpen=true);
rejects('plain mouth cannot hide an extra flip flag',r=>r.sourceExits.find(g=>g.kind==='ordinary').initiallyOpen=false);
rejects('latent frozen source mouth needs another adapter',r=>r.sourceExits[0].frozen=3);
rejects('positive ice inventory is not implicitly enabled',r=>{r.sourceNormalizedFacts.mechanisms.exits.frozenCount=1;r.sourceNormalizedFacts.mechanisms.exits.frozenValues=[3];});
rejects('flip plus star is not silently counted in two families',r=>r.sourceExits.find(g=>g.kind==='flip').star=true);
rejects('physical source star color needs matching observed body',r=>r.sourceExits.find(g=>g.star).color='blue');
rejects('individual source allocations remain undefined, not invented',r=>r.sourceNormalizedFacts.mechanisms.covers.hiddenBatchCounts=[1,2,3,2,1]);
rejects('source joint count cannot borrow extra body',r=>r.sourceRevealGroups[0].hiddenCount++);
rejects('source joint source counter cannot be lowered',r=>r.sourceCoverRegions[0].value=11);
rejects('extra positive source bombs cannot project into plain bodies',r=>{r.sourceNormalizedFacts.mechanisms.bombs.count=1;r.sourceNormalizedFacts.mechanisms.bombs.values=[30];});
rejects('unresolved source remains blocking',r=>r.unresolved=['unknown carrier']);
const design=()=>{const d=structuredClone(original.sourceNormalizedFacts);d.mechanisms.covers={count:5,values:Array(5).fill(12),hiddenBatchCounts:[1,2,3,2,1]};return d;};
test('design projection preserves all star and flip facts, labels only the source-undefined partition',()=>{
 const p=deriveDesignPolicy(original.sourceNormalizedFacts,design(),171);assert.equal(p.sourceFactsSha256,digest(original.sourceNormalizedFacts));assert.equal(p.differences.length,1);assert.equal(p.differences[0].field,'mechanisms.covers.individualPartition');assert.equal(p.differences[0].sourceValue,null);assert.equal(p.exactMatch,false);assert.equal(p.effectiveFacts.mechanisms.starBlocks.count,9);assert.equal(p.effectiveFacts.mechanisms.exits.starCount,7);
});
for(const[name,change]of[
 ['star bodies',d=>d.mechanisms.starBlocks.count--],['star mouths',d=>d.mechanisms.exits.starCount--],
 ['flip mouths',d=>d.mechanisms.exits.flipCount--],['flip initial state',d=>d.mechanisms.flipDoors.initialStates[0]='open'],
 ['ordinary mouth',d=>d.mechanisms.exits.ordinaryCount++],['whole body count',d=>d.full++],
 ['hidden body quantity',d=>d.mechanisms.covers.hiddenBatchCounts[0]++]])test(`joint projection cannot waive changed ${name}`,()=>{const d=design();change(d);assert.throws(()=>deriveDesignPolicy(original.sourceNormalizedFacts,d,171));});
test('nonstar source194 still dispatches to its frozen joint adapter',async()=>{
 const {source}=await loadReviewedDesignSource('.codex-temp/remaining98-v111/late/new194/source-review-194-joint-v2.json','666b9d92c734ff14f8298ef8389944a9d9202e5495b2e737a68ce6df197caf31');assert.equal(source.levelId,194);assert.equal(source.facts.mechanisms.starBlocks.count,0);assert.equal(source.facts.mechanisms.covers.hiddenBatchCounts,null);
});

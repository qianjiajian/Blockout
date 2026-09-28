import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest,loadPreviewCore} from './revised-preview-validation-v160.mjs';
import {auditJointKeySource,verifyJointKeyCarriers} from './revised-joint-key-cohorts-v111.mjs';
import {loadReviewedDesignSource,deriveDesignPolicy,measurePolicyFacts,verifyReviewedDesign} from './revised-design-policy-joint-keys-v111.mjs';
const sourcePath='.codex-temp/remaining98-v111/middle/lv109/source-review-109-joint-keys-v2.json';
const sourceSha='fd4edb9e50eef9e7b0f594de9e54ce94410d63b52bc714c40c195390a7e30f44';
const rawPath='.codex-temp/remaining98-v111/middle/lv109/raw-candidate-109-v2.json';
const rawSha='c13b838d2850ce94efeab02afada4d00bf4e11f527ad466cc276fc1dee153fac';
for(const[p,h]of [[sourcePath,sourceSha],[rawPath,rawSha]])assert.equal(digest(fs.readFileSync(p)),h);
const original=JSON.parse(fs.readFileSync(sourcePath)),raw=JSON.parse(fs.readFileSync(rawPath));
const clone=()=>structuredClone(original),bodies=r=>Object.values(r.sourceCohorts).flat();
const guards=[sourcePath,rawPath,'tools/revised-joint-curtain-cohorts-v111.mjs','tools/revised-design-policy-colored-grids-v111.mjs','src/core/revisedContinuationLayouts.generated.ts'];
const hashes=()=>Object.fromEntries(guards.map(p=>[p,digest(fs.readFileSync(p))]));const before=hashes();after(()=>assert.deepEqual(hashes(),before));
test('complete source109 retains27 bodies,7 keys,3 locks,3 shells and7 physical mouths',()=>{
 const saved=clone(),r=auditJointKeySource(original);assert.equal(r.allBodies.length,27);assert.equal(r.physicalSourceExits.length,7);assert.equal(r.keyCarrierSignature.length,3);
 assert.deepEqual(r.keyCarrierSignature.map(g=>g.keyCount).sort(),[1,3,3]);assert.equal(r.keyCarrierSignature.reduce((n,g)=>n+g.keyShellCount,0),1);
 assert.deepEqual(r.keyCarrierSignature.flatMap(g=>g.lockedShellValues),[1]);assert.deepEqual(original,saved);
});
const rejects=(name,mutate)=>test(name,()=>{const r=clone();mutate(r);assert.throws(()=>auditJointKeySource(r));});
rejects('missing actual key cannot inherit inventory',r=>delete bodies(r).find(b=>b.keyId).keyId);
rejects('missing actual lock cannot inherit inventory',r=>delete bodies(r).find(b=>b.lockedBy).lockedBy);
rejects('implicit lock1 cannot replace observed count',r=>delete bodies(r).find(b=>b.lockedBy).lockCount);
rejects('lock3 cannot be simplified to1',r=>bodies(r).find(b=>b.lockCount===3).lockCount=1);
rejects('key groups cannot silently merge',r=>{for(const b of bodies(r))if(b.keyId==='red')b.keyId='blue';});
rejects('empty key namespace rejects',r=>bodies(r).find(b=>b.keyId).keyId='');
rejects('orphan lock namespace rejects',r=>bodies(r).find(b=>b.lockedBy).lockedBy='orphan');
rejects('orphan lock count rejects',r=>bodies(r).find(b=>!b.lockedBy).lockCount=2);
rejects('cross-group locked-key dependency cannot hide behind group count signatures',r=>{const b=bodies(r).find(b=>b.lockedBy);b.keyId='red';});
rejects('positive key/axis associations need a new explicit source adapter',r=>r.sourceNormalizedFacts.mechanisms.axisBlocks.count=1);
rejects('undeclared star carrier rejects',r=>bodies(r)[0].star=true);
rejects('undeclared ice carrier rejects',r=>bodies(r)[0].frozen=1);
rejects('extra physical mouth rejects',r=>r.sourceExits.push({...r.sourceExits[0],id:'extra'}));
rejects('missing source mouth rejects',r=>r.sourceExits.pop());
rejects('duplicate physical mouth identity rejects',r=>r.sourceExits[1].id=r.sourceExits[0].id);
rejects('known source ice value cannot change',r=>r.sourceExits.find(g=>g.frozen).frozen++);
rejects('latent flip state cannot hide on a plain mouth',r=>r.sourceExits[0].initiallyOpen=false);
rejects('unknown source star cannot pass as a plain mouth',r=>r.sourceExits[0].star=true);
rejects('source physical width cannot leave board',r=>r.sourceExits[0].size=100);
rejects('source separate batches cannot be invented',r=>r.sourceNormalizedFacts.mechanisms.covers.hiddenBatchCounts=[4,3,4]);
rejects('joint total cannot borrow an extra body',r=>r.sourceRevealGroups[0].hiddenCount++);
rejects('source key groups cannot omit a group',r=>r.sourceNormalizedFacts.mechanisms.keysLocks.groups.pop());
rejects('unresolved source remains blocking',r=>r.evidenceGaps=['unknown']);
const {api}=await loadPreviewCore(),{source}=await loadReviewedDesignSource(sourcePath,sourceSha);
raw.designPolicy={ruleVersion:'1.11.0',differences:deriveDesignPolicy(source.facts,measurePolicyFacts(raw.level,api),109).differences};
test('loader and design preserve original null source partition without rewriting facts',()=>{
 assert.deepEqual(source.facts,original.sourceNormalizedFacts);assert.equal(source.facts.mechanisms.covers.hiddenBatchCounts,null);
 assert.equal(raw.designPolicy.differences.length,1);assert.equal(raw.designPolicy.differences[0].sourceValue,null);
 assert.equal(raw.designPolicy.differences[0].field,'mechanisms.covers.individualPartition');
});
test('real109 fresh32-drag completion verifies every inventory,whole-body reveal andgroup-local shell attachment',()=>{
 const saved=structuredClone(source),r=verifyReviewedDesign(raw,source,api);assert(r.replay.complete&&r.replay.valid&&r.coverage.passed&&r.art.passed);
 assert.equal(r.replay.effectiveDrags,32);assert.equal(r.replay.clearEvents,30);assert(r.jointRevealReplay.complete&&r.keyCarrierAudit.passed);
 assert(!r.pointerReplayValidated&&!r.formalTimeValidated&&!r.lowerBoundCertified);assert.deepEqual(source,saved);
});
test('source key group names are independent of candidate exit colors',()=>{
 const level=structuredClone(raw.level);for(const b of level.blocks)for(const k of ['keyId','lockedBy'])if(b[k])b[k]='namespace-'+b[k];
 assert(verifyJointKeyCarriers(level,original).passed);
});
test('moving lock1 from its shell onto another body rejects despite unchanged global lock and shell totals',()=>{
 const level=structuredClone(raw.level),locked=level.blocks.find(b=>b.lockedBy&&b.lockCount===1),plain=level.blocks.find(b=>!b.keyId&&!b.lockedBy&&!b.layers);
 assert(locked&&plain);plain.lockedBy=locked.lockedBy;plain.lockCount=locked.lockCount;delete locked.lockedBy;delete locked.lockCount;
 assert.throws(()=>verifyJointKeyCarriers(level,original));
});
test('moving key-shell association between unequal key groups rejects despite unchanged global counts',()=>{
 const level=structuredClone(raw.level),shellKey=level.blocks.find(b=>b.keyId&&b.layers),one=level.blocks.find(b=>b.keyId&&b.keyId!==shellKey.keyId&&level.blocks.filter(x=>x.keyId===b.keyId).length===1);
 assert(shellKey&&one);[shellKey.keyId,one.keyId]=[one.keyId,shellKey.keyId];assert.throws(()=>verifyJointKeyCarriers(level,original));
});
for(const[name,mutate]of[
 ['partial path',r=>r.drags.pop()],['removed lock count',r=>delete r.level.blocks.find(b=>b.lockedBy).lockCount],
 ['duplicate same-color exit',r=>r.level.gates[1].color=r.level.gates[0].color],
 ['false partition delta',r=>r.designPolicy.differences[0].sourceValue=[4,3,4]],
 ['missing key',r=>delete r.level.blocks.find(b=>b.keyId).keyId],
 ['changed curtain count',r=>r.level.shutters[0].count--]
])test(`full verification rejects ${name}`,()=>{const r=structuredClone(raw);mutate(r);assert.throws(()=>verifyReviewedDesign(r,source,api));});

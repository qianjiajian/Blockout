import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {digest} from './revised-preview-validation-v160.mjs';
import {loadReviewedDesignSource as loadBase,verifyReviewedDesign as verifyBase} from './revised-design-review-expanded-v190.mjs';
const positive=n=>Number.isSafeInteger(n)&&n>0,sort=a=>[...a].sort((a,b)=>a-b);
const canonical=gs=>gs.map(g=>({keyCount:g.keyCount,lockValues:sort(g.lockValues),frozenKeyValues:sort(g.frozenKeyValues),frozenLockValues:sort(g.frozenLockValues)})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
// Group names are authoring identities, not colors. Canonicalize the complete
// joint tuple so equal totals cannot move ice into a different lock-demand group.
// This bounded adapter adds key+ice only; other positive families stay fail-closed.
export async function loadReviewedDesignSource(reviewPath,expectedSha,root=process.cwd()){
 const base=await loadBase(reviewPath,expectedSha,root),bytes=fs.readFileSync(path.resolve(root,reviewPath));assert.equal(digest(bytes),expectedSha.toLowerCase(),'Source changed between base and carrier validation');
 const review=JSON.parse(bytes),groups=review.sourceNormalizedFacts.mechanisms.keysLocks.groups,items=review.sourceFacts?.numericIce?.items;
 assert(Array.isArray(groups)&&groups.length>0,'Explicit keyed-ice groups required');
 assert(groups.every(g=>typeof g.sourceGroup==='string'&&g.sourceGroup&&Array.isArray(g.frozenKeyValues)&&Array.isArray(g.frozenLockValues)&&g.frozenKeyValues.every(positive)&&g.frozenLockValues.every(positive)&&g.frozenKeyValues.length<=g.keyCount&&g.frozenLockValues.length<=g.lockValues.length),'Explicit frozen-key/lock associations required');
 assert.equal(new Set(groups.map(g=>g.sourceGroup)).size,groups.length,'Duplicate source group');
 const keyObservation=review.sourceInventory.M03??review.sourceInventory.keyLocks;
 const iceObservation=review.sourceInventory.M14??review.sourceInventory.numericIce;
 assert.deepEqual(canonical(keyObservation.groups),canonical(groups),'Keyed-ice observation/facts mismatch');
 assert(Array.isArray(items)&&items.every(i=>i.keyGroup===null||groups.some(g=>g.sourceGroup===i.keyGroup)),'Each ice carrier needs known key association');
 assert(items.every(i=>positive(i.value)&&typeof i.post_melt_shell==='boolean'),'Explicit positive numeric-ice items required');
 assert.deepEqual(sort(items.map(i=>i.value)),sort(base.source.facts.mechanisms.numericIce.values),'Numeric-ice item/facts values mismatch');
 assert(items.every(i=>!i.post_melt_shell),'This adapter does not certify simultaneous keyed shells');
 assert(groups.every(g=>g.frozenLockValues.length===0),'Frozen locks require separate carrier evidence');
 for(const group of groups)assert.deepEqual(sort(items.filter(i=>i.keyGroup===group.sourceGroup).map(i=>i.value)),sort(group.frozenKeyValues),'Numeric-ice item/key-group association mismatch');
 assert.equal(iceObservation.keyedCount,items.filter(i=>i.keyGroup!==null).length,'Keyed numeric-ice count mismatch');
 assert(items.some(i=>i.keyGroup!==null),'Positive ice-key carrier required');
 return {...base,source:{...base.source,keyedIceGroups:canonical(groups),sourceAdapter:'keyed-ice-v110'}};
}
export function assertKeyedIceCarriers(level,source){
 assert(Array.isArray(source.keyedIceGroups),'Bound keyed-ice source required');
 const blocks=level.blocks,ids=[...new Set(blocks.flatMap(b=>[b.keyId,b.lockedBy].filter(Boolean)))];
 const actual=ids.map(id=>{const keys=blocks.filter(b=>b.keyId===id),locks=blocks.filter(b=>b.lockedBy===id);return{keyCount:keys.length,lockValues:locks.map(b=>b.lockCount??1),frozenKeyValues:keys.filter(b=>(b.frozen??0)>0).map(b=>b.frozen),frozenLockValues:locks.filter(b=>(b.frozen??0)>0).map(b=>b.frozen)};});
 assert(blocks.filter(b=>b.keyId||b.lockedBy).every(b=>!(b.keyId&&b.lockedBy)&&!b.layers?.length&&!b.star&&!b.movementAxis&&!b.timedBombSeconds),'Unobserved key/lock carrier intersection');
 assert.deepEqual(canonical(actual),source.keyedIceGroups,'Keyed-ice per-group carrier association mismatch');
 return {passed:true,groups:canonical(actual),scope:'Authored carriers including hidden/queued, not only visible snapshot'};
}
export function verifyReviewedDesign(raw,source,api){const keyedIce=assertKeyedIceCarriers(raw.level,source);const verified=verifyBase(raw,source,api);return{...verified,ruleVersion:'1.10.0',keyedIce};}

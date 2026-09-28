import assert from 'node:assert/strict';
import {auditJointCurtainSource} from './revised-joint-curtain-cohorts-v111.mjs';
const sorted=a=>[...a].sort((a,b)=>a-b);
const colors=new Set(['red','orange','yellow','green','cyan','blue','purple','pink']);
const positive=n=>Number.isSafeInteger(n)&&n>0;
function keyCarrierSignature(bodies,shell){
 const ids=new Set();for(const b of bodies){
  for(const k of ['keyId','lockedBy'])if(Object.hasOwn(b,k)){assert(typeof b[k]==='string'&&b[k].trim().length,'Explicit key group identity');ids.add(b[k]);}
  if(Object.hasOwn(b,'lockCount'))assert(b.lockedBy&&positive(b.lockCount),'Explicit positive lock count with a group');
  if(b.lockedBy)assert(positive(b.lockCount),'No implicit default lock count in reviewed joint source/design');
 }
 return[...ids].map(id=>{
  const keys=bodies.filter(b=>b.keyId===id),locks=bodies.filter(b=>b.lockedBy===id);
  assert(keys.length&&locks.length,'Every observed key group needs both keys and locks');
  return{keyCount:keys.length,lockValues:sorted(locks.map(b=>b.lockCount)),keyShellCount:keys.filter(shell).length,
   lockedShellValues:sorted(locks.filter(shell).map(b=>b.lockCount)),
   keyAndLockValues:sorted(keys.filter(b=>b.lockedBy).map(b=>b.lockCount))};
 }).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

/** Source keys remain attached to their complete carriers. Only a private
 * geometry projection removes key metadata before calling the immutable
 * no-key source geometry audit; no source file or accepted design is changed. */
export function auditJointKeySource(review){
 const f=review.sourceNormalizedFacts,m=f.mechanisms,bodies=Object.values(review.sourceCohorts).flat();
 assert(m.keysLocks.keyCount>0&&m.keysLocks.lockCount>0,'Positive independently observed key groups required');
 assert(!bodies.some(b=>b.keyId&&b.lockedBy),'Cross-group key/lock dependency carriers need a graph-aware source adapter');
 assert.equal(m.axisBlocks.count,0,'Key/axis co-carriers need a separate reviewed association adapter');
 for(const key of ['starBlocks','flipDoors'])assert.equal(m[key].count,0,'Joint key extension does not authorize unreviewed star/flip carriers');
 assert.equal(m.exits.starCount,0);assert.equal(m.exits.starFrozenCount,0);assert.equal(m.exits.flipCount,0);
 assert.deepEqual(m.exits.starFrozenValues,[]);assert(!m.exits.overlappingAttributes);
 const signature=keyCarrierSignature(bodies,b=>!!b.innerColor);
 assert.equal(bodies.filter(b=>b.keyId).length,m.keysLocks.keyCount,'Every source key marker counted');
 assert.equal(bodies.filter(b=>b.lockedBy).length,m.keysLocks.lockCount,'Every source lock carrier counted');
 assert.deepEqual(sorted(bodies.filter(b=>b.lockedBy).map(b=>b.lockCount)),sorted(m.keysLocks.lockValues));
 const bag=groups=>groups.map(g=>JSON.stringify({keyCount:g.keyCount,lockValues:sorted(g.lockValues)})).sort();
 assert.deepEqual(bag(signature),bag(m.keysLocks.groups),'Source group quantities and lock requirements');
 const gates=review.sourceExits;assert.equal(gates.length,m.exits.ordinaryCount+m.exits.frozenCount);
 assert.equal(new Set(gates.map(g=>g.id)).size,gates.length,'Complete distinct source mouth IDs');
 for(const g of gates){
  assert(g.id&&colors.has(g.color)&&g.kind==='ordinary'&&!g.star&&g.initiallyOpen===undefined,'Explicit nonstar plain/ice source mouths');
  assert(['top','bottom','left','right'].includes(g.side)&&Number.isSafeInteger(g.offset)&&g.offset>=0&&positive(g.size));
  assert(g.offset+g.size<=(['top','bottom'].includes(g.side)?f.width:f.height));
  assert(g.frozen===undefined||g.frozen===0||positive(g.frozen));
 }
 assert.equal(gates.filter(g=>!g.frozen).length,m.exits.ordinaryCount);
 assert.deepEqual(sorted(gates.filter(g=>g.frozen).map(g=>g.frozen)),sorted(m.exits.frozenValues),'All known source ice-mouth values');
 const projection=structuredClone(review);projection.sourceNormalizedFacts.mechanisms.keysLocks={keyCount:0,lockCount:0,lockValues:[],groups:[]};
 for(const cohort of Object.values(projection.sourceCohorts))for(const b of cohort){delete b.keyId;delete b.lockedBy;delete b.lockCount;}
 const geometry=auditJointCurtainSource(projection);
 return{...geometry,allBodies:bodies,keyCarrierSignature:signature,physicalSourceExits:gates};
}

export function verifyJointKeyCarriers(level,review){
 const source=auditJointKeySource(review);
 const actual=keyCarrierSignature(level.blocks,b=>(b.layers?.length??0)>1);
 assert.deepEqual(actual,source.keyCarrierSignature,'Preserve key/shell and lock/shell associations within their groups, not merely global sums');
 return{passed:true,groupSignatures:actual,sourceCarrierCount:source.allBodies.length};
}

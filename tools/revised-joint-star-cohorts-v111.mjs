import assert from 'node:assert/strict';
import {auditJointCurtainSource} from './revised-joint-curtain-cohorts-v111.mjs';
import {auditStarSourceMetadata} from './revised-design-review-stars-v110.mjs';

/** A separate, explicit extension of the frozen no-star joint ledger.
 * Geometric projection is private; original observations and all returned
 * bodies retain their stars. Positive mixed ice/flip and other carriers are
 * not implicitly enabled by this extension. */
export function auditJointStarSource(review){
 const f=review.sourceNormalizedFacts,m=f?.mechanisms;
 auditStarSourceMetadata(m);
 assert(m.starBlocks.count>0&&m.exits.starCount>0,'Positive observed star bodies and mouths required');
 assert.equal(m.exits.frozenCount,0,'Joint-star ice inventory requires a separate physical adapter');
 assert.equal(m.exits.starFrozenCount,0);assert.deepEqual(m.exits.frozenValues,[]);
 assert(!m.exits.overlappingAttributes,'No unreviewed overlapping door attributes');
 const bodies=Object.values(review.sourceCohorts).flat();
 for(const b of bodies)if(Object.hasOwn(b,'star'))assert.equal(typeof b.star,'boolean','Explicit boolean star marker');
 assert.equal(bodies.filter(b=>b.star===true).length,m.starBlocks.count,'Source star carrier count');
 const gates=review.sourceExits;
 assert(Array.isArray(gates)&&gates.length===m.exits.ordinaryCount+m.exits.starCount+m.exits.flipCount,'Complete physical source mouths');
 assert.equal(new Set(gates.map(g=>g.id)).size,gates.length,'Unique source physical mouth identities');
 const colors=new Set(['red','orange','yellow','green','cyan','blue','purple','pink']);
 for(const g of gates){
  assert(g.id&&colors.has(g.color)&&['top','bottom','left','right'].includes(g.side),'Known physical source mouth');
  assert(Number.isSafeInteger(g.offset)&&g.offset>=0&&Number.isSafeInteger(g.size)&&g.size>0,'Known physical source span');
  assert(g.offset+g.size<=(['top','bottom'].includes(g.side)?f.width:f.height),'Source mouth span inside board dimensions');
  if(Object.hasOwn(g,'star'))assert.equal(typeof g.star,'boolean');
  assert(g.frozen===undefined||g.frozen===0,'No hidden frozen source mouth');
  assert(g.kind===undefined||['ordinary','flip'].includes(g.kind),'Reviewed source mouth kind');
  if(g.kind==='flip'){assert(!g.star,'Mixed flip/star not covered');assert.equal(typeof g.initiallyOpen,'boolean','Observed flip initial state required');}
  else assert(g.initiallyOpen===undefined,'Plain/star source mouth cannot carry unreviewed flip state');
  if(g.star)assert(bodies.some(b=>b.star&&(b.color===g.color||b.innerColor===g.color)),'Observed source star mouth needs a matching real star body');
 }
 assert.equal(gates.filter(g=>g.star).length,m.exits.starCount);
 const flips=gates.filter(g=>g.kind==='flip');assert.equal(flips.length,m.exits.flipCount);assert.equal(flips.length,m.flipDoors.count);
 assert.deepEqual(flips.map(g=>g.initiallyOpen?'open':'closed').sort(),[...m.flipDoors.initialStates].sort(),'Source physical flip initial states');
 assert.equal(gates.filter(g=>!g.star&&g.kind!=='flip').length,m.exits.ordinaryCount);
 const geometryOnly=structuredClone(review);
 geometryOnly.sourceNormalizedFacts.mechanisms.starBlocks.count=0;
 for(const cohort of Object.values(geometryOnly.sourceCohorts))for(const b of cohort)delete b.star;
 const geometry=auditJointCurtainSource(geometryOnly);
 return{...geometry,allBodies:bodies,starBodies:bodies.filter(b=>b.star),physicalSourceExits:gates};
}

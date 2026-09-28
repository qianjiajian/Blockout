import assert from 'node:assert/strict';
import {auditJointCurtainSource as auditGeometry} from './revised-joint-curtain-cohorts-v111.mjs';
export {projectJointCurtainFacts,verifyJointRevealReplay} from './revised-joint-curtain-cohorts-v111.mjs';
const sorted=xs=>[...xs].sort((a,b)=>a-b);
const irregular=b=>b.shape.length!==(Math.max(...b.shape.map(p=>p[0]))-Math.min(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))-Math.min(...b.shape.map(p=>p[1]))+1);
const colors=new Set(['red','orange','yellow','green','cyan','blue','purple','pink']);
/** Extend the source ledger with separately observed ordered cargo and explicit
 * ice/shell carriers. The geometry projection below is internal validation only:
 * no projected zero inventories are returned or written as source facts. */
export function auditJointCurtainSource(review){
 const f=review.sourceNormalizedFacts,m=f?.mechanisms;
 assert(m&&Array.isArray(review.sourceGeneratorQueues),'Explicit ordered source queues required');
 const queues=review.sourceGeneratorQueues;
 assert.equal(queues.length,m.generators.count,'Physical generator ledger count');
 assert.deepEqual(queues.map(q=>q.length),m.generators.queueLengths,'Ordered source queue lengths');
 assert(queues.every(q=>q.length>0),'Empty/unknown queue cannot imply zero');
 const initial=Object.values(review.sourceCohorts??{}).flat(),cargo=queues.flat(),all=[...initial,...cargo];
 assert.equal(all.length,f.full,'Whole source bodies include all cargo exactly once');
 const baseFields=['shape','color','innerColor','movementAxis','frozen'];
 for(const [b,isCargo] of [...initial.map(b=>[b,false]),...cargo.map(b=>[b,true])]){
  const allowed=new Set([...baseFields,...(isCargo?[]:['x','y','sourceCoverIds'])]);
  assert(Object.keys(b).every(k=>allowed.has(k)),'Unreviewed mixed source carrier property');
  assert(colors.has(b.color),'Known source color');
  if(Object.hasOwn(b,'innerColor'))assert(colors.has(b.innerColor)&&b.innerColor!==b.color,'Distinct known shell/core colors');
  if(Object.hasOwn(b,'movementAxis'))assert(['horizontal','vertical'].includes(b.movementAxis),'Known axis');
  if(Object.hasOwn(b,'frozen'))assert(Number.isSafeInteger(b.frozen)&&b.frozen>0,'Explicit positive ice value');
  assert(!(isCargo&&b.frozen),'Generated cargo cannot be ice');
  assert(Array.isArray(b.shape)&&b.shape.length&&b.shape.every(p=>p.length===2&&p.every(Number.isInteger)),'Known integer full shape');
  const cells=new Set(b.shape.map(p=>p.join(',')));assert.equal(cells.size,b.shape.length,'Unique source shape cells');
  const reached=new Set([cells.values().next().value]);for(let old=-1;old!==reached.size;){old=reached.size;for(const k of cells){const [x,y]=k.split(',').map(Number);if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>reached.has(p.join(','))))reached.add(k);}}
  assert.equal(reached.size,cells.size,'Connected full cargo/body shape');
 }
 const ice=all.filter(b=>b.frozen),items=review.sourceFacts?.numericIce?.items;
 assert.equal(ice.length,m.numericIce.count,'All ice carriers observed');
 assert.deepEqual(sorted(ice.map(b=>b.frozen)),sorted(m.numericIce.values),'Actual carrier ice values');
 assert.equal(ice.filter(b=>b.innerColor).length,m.numericIce.postMeltShellCount,'Actual ice/shell association count');
 assert(Array.isArray(items)&&items.every(i=>typeof i.post_melt_shell==='boolean'),'Explicit ice/shell observations');
 assert.deepEqual(items.map(i=>`${i.value}:${i.post_melt_shell}`).sort(),ice.map(b=>`${b.frozen}:${!!b.innerColor}`).sort(),'Observed ice value/shell associations');
 assert.equal(all.filter(b=>b.innerColor).length,m.shells.count,'Full shell carrier ledger');
 assert.equal(all.filter(irregular).length,m.irregularBlocks.fullCount,'Full M11 includes cargo');
 assert.deepEqual(all.filter(b=>b.movementAxis).map(b=>b.movementAxis).sort(),[...m.axisBlocks.axes].sort(),'Full axis carrier ledger');
 assert.equal(all.filter(b=>b.movementAxis).length,m.axisBlocks.count);
 // Reuse the independently tested physical union/geometry audit with cargo
 // excluded (its source spawn locations occur at later times), and strip only
 // attributes which were fully validated above. Input review is never mutated.
 const geometry=structuredClone(review),gm=geometry.sourceNormalizedFacts.mechanisms;
 geometry.sourceNormalizedFacts.full-=cargo.length;
 gm.generators={count:0,queueLengths:[]};gm.numericIce={count:0,values:[],postMeltShellCount:0};
 gm.irregularBlocks.fullCount-=cargo.filter(irregular).length;
 gm.shells.count-=cargo.filter(b=>b.innerColor).length;
 gm.axisBlocks.axes=initial.filter(b=>b.movementAxis).map(b=>b.movementAxis);gm.axisBlocks.count=gm.axisBlocks.axes.length;
 for(const b of Object.values(geometry.sourceCohorts).flat())delete b.frozen;
 const checked=auditGeometry(geometry);
 return {...checked,allBodies:all,orderedGeneratorQueues:queues,numericIceCarriers:ice};
}

const normalizedShape=shape=>{const x=Math.min(...shape.map(p=>p[0])),y=Math.min(...shape.map(p=>p[1]));return shape.map(p=>[p[0]-x,p[1]-y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);};
/** Preserve the independently observed ordered cargo and its carrier attributes.
 * Template offsets may differ; translating a shape is not changing its shape. */
export function verifyMixedCurtainCarriers(level,review){
 const audited=auditJointCurtainSource(review);
 const signature=b=>({color:b.color,shape:normalizedShape(b.shape),layers:b.layers??(b.innerColor?[b.color,b.innerColor]:[b.color]),axis:b.movementAxis??null,frozen:b.frozen??0});
 const actual=(level.generators??[]).map(g=>g.queueBlockIds.map(id=>{const b=level.blocks.find(b=>b.id===id);assert(b,'Every cargo ID must resolve');return signature(b);}));
 const expected=audited.orderedGeneratorQueues.map(q=>q.map(signature));
 assert.deepEqual(actual,expected,'Observed ordered generator cargo shape/color/carrier association');
 assert.deepEqual(level.blocks.filter(b=>b.frozen>0).map(b=>`${b.frozen}:${(b.layers?.length??0)>1}`).sort(),audited.numericIceCarriers.map(b=>`${b.frozen}:${!!b.innerColor}`).sort(),'Observed ice/shell carrier association');
 return {passed:true,generatorCount:actual.length,cargoCount:actual.flat().length,numericIceCount:audited.numericIceCarriers.length};
}

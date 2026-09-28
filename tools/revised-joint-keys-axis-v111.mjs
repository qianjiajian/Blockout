import assert from 'node:assert/strict';
import {auditJointKeySource,verifyJointKeyCarriers} from './revised-joint-key-cohorts-v111.mjs';
const directions=new Set(['horizontal','vertical']);
const signature=bs=>bs.filter(b=>b.movementAxis).map(b=>({axis:b.movementAxis,shell:!!b.innerColor})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
function independent(bs){for(const b of bs)if(b.movementAxis){assert(directions.has(b.movementAxis),'Known axis direction required');assert(!b.keyId&&!b.lockedBy&&!b.lockCount,'Axis/key-lock co-carrier is not supported by independent-axis adapter');}}
function project(review){
 const copy=structuredClone(review),bodies=Object.values(copy.sourceCohorts).flat();independent(bodies);
 const axes=bodies.filter(b=>b.movementAxis).map(b=>b.movementAxis).sort(),m=copy.sourceNormalizedFacts.mechanisms;
 assert.equal(axes.length,m.axisBlocks.count,'Complete independent source axis carriers');assert.deepEqual(axes,[...m.axisBlocks.axes].sort(),'Source axis directions');
 for(const b of bodies)delete b.movementAxis;m.axisBlocks={count:0,axes:[]};return copy;
}
export function auditJointKeyAxisSource(review){const projected=project(review),base=auditJointKeySource(projected);return{...base,axisSignature:signature(Object.values(review.sourceCohorts).flat())};}
export function verifyJointKeyAxisCarriers(level,review){
 const audit=auditJointKeyAxisSource(review);independent(level.blocks);
 const actual=level.blocks.map(b=>({...b,innerColor:(b.layers?.length??0)>1?b.layers[1]:undefined}));
 assert.deepEqual(signature(actual),audit.axisSignature,'Preserve independent axis direction and shell association');
 const keys=verifyJointKeyCarriers(level,project(review));return{...keys,axisSignature:audit.axisSignature};
}

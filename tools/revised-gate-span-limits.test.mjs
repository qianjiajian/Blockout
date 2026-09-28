import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { auditGateSpanLimits } from './revised-gate-span-limits.mjs';
const block = (w,h,extra={}) => ({ id:'b',color:'red',shape:Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),...extra });
const level = (size,side,blocks=[block(1,1)],extra={}) => ({blocks,gates:[{id:'g',color:'red',side,offset:0,size,...extra}]});

for (const side of ['left','right','top','bottom']) {
  test(`${side}: ordinary exits up to 3, not 4`,()=>{
    for(const n of [1,2,3]) assert(auditGateSpanLimits(level(n,side)).passed);
    assert(!auditGateSpanLimits(level(4,side)).passed);
  });
  test(`${side}: 2x2 area four is not a wide-block exception`,()=>{
    assert(!auditGateSpanLimits(level(4,side,[block(2,2)])).passed);
  });
  test(`${side}: use transverse width, not area or longitudinal length`,()=>{
    const horizontal=['left','right'].includes(side), wide=block(horizontal?1:4,horizontal?4:1);
    const narrow=block(horizontal?4:1,horizontal?1:4);
    assert(auditGateSpanLimits(level(4,side,[wide])).passed);
    assert(!auditGateSpanLimits(level(5,side,[wide])).passed);
    assert(!auditGateSpanLimits(level(4,side,[narrow])).passed);
  });
}
test('whole footprint, including sparse and negative local coordinates',()=>{
  const l=level(4,'top',[block(1,1,{shape:[[-1,0],[0,0],[0,1],[2,0]]})]);
  assert.equal(auditGateSpanLimits(l).portals[0].requiredSpan,4);
  assert(auditGateSpanLimits(l).passed);
});
test('hidden/queued inner colors participate, unrelated colors do not',()=>{
  assert(auditGateSpanLimits(level(5,'top',[block(5,1,{color:'blue',layers:['blue','red'],shutterId:'s',generatorId:'q'})])).passed);
  assert(!auditGateSpanLimits(level(5,'top',[block(5,1,{color:'blue'})])).passed);
});
test('axis and star eligibility cannot manufacture a wide exception',()=>{
  assert(!auditGateSpanLimits(level(4,'top',[block(4,1,{movementAxis:'horizontal'})])).passed);
  assert(!auditGateSpanLimits(level(4,'top',[block(4,1,{star:true})])).passed);
  assert(auditGateSpanLimits(level(4,'top',[block(4,1,{star:true})],{star:true})).passed);
});
test('ice, flip doors and each explicit portal have the same cap',()=>{
  assert(!auditGateSpanLimits(level(4,'left',[block(1,1)],{frozen:12})).passed);
  const l=level(3,'left');l.flipDoors=[{...l.gates[0],id:'flip',size:4,open:true}];
  assert(!auditGateSpanLimits(l).passed);
  l.flipDoors=[];l.gates[0].portals=[{side:'top',origin:[0,0],size:3},{side:'right',origin:[4,0],size:4}];
  const a=auditGateSpanLimits(l);assert.equal(a.portals.length,2);assert.equal(a.issues.length,1);
});
test('reject invalid sizes and do not mutate the candidate',()=>{
  for(const n of [0,-1,1.5,NaN,Infinity]) assert(!auditGateSpanLimits(level(n,'top')).passed);
  const l=level(3,'bottom'),before=JSON.stringify(l);auditGateSpanLimits(l);assert.equal(JSON.stringify(l),before);
});
test('old long-gate batch is rejected: only Lv26 satisfies the new cap',()=>{
  const config=JSON.parse(readFileSync('.codex-temp/strict-alignment-v170/batch-21-30.json','utf8'));
  const passed=config.items.map(p=>JSON.parse(readFileSync(p,'utf8')).level).filter(l=>auditGateSpanLimits(l).passed).map(l=>l.id);
  assert.deepEqual(passed,[26]);
});

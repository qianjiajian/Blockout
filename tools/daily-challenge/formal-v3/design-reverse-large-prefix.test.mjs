import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {reconstructReverseBlueprint} from './design-reverse-blueprint.mjs';
import {auditKnownInterleavedBlueprint} from './design-reverse-interleaved.mjs';
import {digest} from './diversity-layout-factory.mjs';
const runtime=await loadBoundedRuntime();
const screen=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/reverse-large-prefix-screen-01.json'));
const packet=i=>JSON.parse(fs.readFileSync(screen.records[i].path));
test('large prefix returns all seven withheld identities and restores the complete source52 known world',()=>{
 const p=packet(0),before=digest(p),row=screen.records[0];assert.equal(row.sourceLevelId,52);
 const result=auditKnownInterleavedBlueprint(runtime,p,{prefixClearCount:7,maximumPrefixArea:19,allowLargePrefix:true});
 assert.equal(result.initialPrefixClearCount,7);assert.equal(result.initialVacancyArea,17);
 assert.deepEqual(result.restoredInventoryIds,result.originalInventoryIds);
 assert.equal(result.U,p.U);assert.equal(result.completeActualDoubleReplay,true);
 assert.equal(result.newConstructionSearch,false);assert.equal(digest(p),before);
});
test('six withheld source100 bodies retain real interleaved parking in the known inverse witness',()=>{
 const p=packet(1),r=auditKnownInterleavedBlueprint(runtime,p,{prefixClearCount:6,maximumPrefixArea:19,allowLargePrefix:true});
 assert.equal(r.initialPrefixClearCount,6);assert.equal(r.initialVacancyArea,17);
 assert(r.interleavedOperations.some(x=>x.kind==='parking'));
 assert.equal(r.interleavedOperations.filter(x=>x.kind==='insertion').length,6);
 assert.equal(r.originalWorldRestored,true);assert.equal(r.U,p.U);
});
test('large-prefix limits are explicit, integral and bounded by actual board and complete inventory',()=>{
 const p=packet(0),area=p.level.blocks.reduce((n,b)=>n+b.shape.length,0);
 assert.throws(()=>reconstructReverseBlueprint(runtime,p,{prefixClearCount:7,maximumPrefixArea:19}),/prefix/);
 for(const maximumPrefixArea of [0,area+1,NaN,Infinity])assert.throws(()=>reconstructReverseBlueprint(runtime,p,{allowLargePrefix:true,prefixClearCount:7,maximumPrefixArea}),/prefix/);
 for(const prefixClearCount of [0,p.level.blocks.length,NaN,Infinity])assert.throws(()=>reconstructReverseBlueprint(runtime,p,{allowLargePrefix:true,prefixClearCount,maximumPrefixArea:area}),/prefix/);
 assert.throws(()=>reconstructReverseBlueprint(runtime,p,{allowLargePrefix:'true'}),/boolean/);
});
test('large-prefix reconstruction charges the inserted portal before held coordinates and never resets raw by inventory count',()=>{
 const p=packet(0),raw=new Set();let micro=0;
 assert.throws(()=>reconstructReverseBlueprint(runtime,p,{allowLargePrefix:true,prefixClearCount:7,maximumPrefixArea:19,
  charge:l=>{const k=digest(l.blocks);if(!raw.has(k)&&raw.size>=1)throw Error('shared-raw-stop');raw.add(k);},micro:()=>micro++}),/shared-raw-stop/);
 assert.equal(raw.size,1);assert.equal(micro,0);
});

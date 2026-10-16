import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {mapReferenceMacroPrefix,probeMappedMacroPrefix} from './design-macro-prefix-probe.mjs';
const runtime=await loadBoundedRuntime(),q=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/macro-opening-guarded8-02/candidate-006.json'));
test('actual supplied first clear and five distinct-world parking commits, immutable input',()=>{
 const before=JSON.stringify(q),m=mapReferenceMacroPrefix(q.level,q.drags,q.level),p=probeMappedMacroPrefix(runtime,q.level,m);
 assert(m.ok&&p.valid);assert.equal(p.initialClears,1);assert.equal(p.consecutiveParking,5);assert.equal(p.fullWorlds,7);assert(p.parkingBodies.length>=3);assert.equal(p.U,null);assert.equal(p.L,null);assert.equal(p.afterPrefixLevel.blocks.length,q.level.blocks.length-1);assert.equal(JSON.stringify(q),before);
});
test('one shared world cap fails before fourth world and never resets per gesture',()=>{
 const m=mapReferenceMacroPrefix(q.level,q.drags,q.level),p=probeMappedMacroPrefix(runtime,q.level,m,{maxFullWorlds:3});assert.equal(p.valid,false);assert.equal(p.reason,'prefix-raw-limit');assert.equal(p.fullWorlds,3);assert.equal(p.audits.length,2);
});
test('retiled moving identity cannot inherit original gesture',()=>{
 const level=structuredClone(q.level),b=level.blocks.find(x=>x.id===q.drags[1].blockId);b.shape=[[0,0]];const m=mapReferenceMacroPrefix(q.level,q.drags,level);assert.equal(m.ok,false);assert.match(m.reason,/moving-body-was-retiled/);
});
test('wrong path and extra premature exit cannot be claimed as parking',()=>{
 const m=mapReferenceMacroPrefix(q.level,q.drags,q.level);m.drags[1].path=[[0,0]];const p=probeMappedMacroPrefix(runtime,q.level,m);assert.equal(p.valid,false);assert.match(p.reason,/unit step|unit|rejected/i);
});
test('finite validation and short reference rejected without solver',()=>{
 assert.throws(()=>mapReferenceMacroPrefix(q.level,q.drags,q.level,{minimumParking:4}));assert.throws(()=>probeMappedMacroPrefix(runtime,q.level,{}, {maxFullWorlds:10001}));assert.throws(()=>probeMappedMacroPrefix(runtime,q.level,{}, {maxFullWorlds:NaN}));
 const m=mapReferenceMacroPrefix(q.level,q.drags.slice(0,3),q.level);assert.equal(m.ok,false);assert.equal(m.reason,'reference-initial-chain-too-short');
});

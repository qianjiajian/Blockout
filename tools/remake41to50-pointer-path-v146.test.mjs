import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {pointerCorners,verifyObservedUnitPaths} from './remake41to50-pointer-path-v146.mjs';
test('collinear samples collapse, turns and reversals do not',()=>{
 assert.deepEqual(pointerCorners([0,0],[[1,0],[2,0],[3,0],[3,1],[3,2],[3,1],[2,1]]),[[3,0],[3,2],[3,1],[2,1]]);
 assert.deepEqual(pointerCorners([0,0],[]),[]);assert.throws(()=>pointerCorners([0,0],[[2,0]]));
});
test('existing actual Pointer log matches all 198 units, dropped/altered units reject',()=>{
 const d=JSON.parse(fs.readFileSync('deliverables/remake41-50-v146-20260924/agent44-46/final44.json')),log=JSON.parse(fs.readFileSync('deliverables/remake41-50-v146-20260924/pointer-1790269433112/lv44-observed-timing.json'));
 assert.equal(verifyObservedUnitPaths(d.drags,log).unitSteps,198);
 const bad=structuredClone(log);bad.events.splice(bad.events.findIndex(e=>e.method==='moveBlockStep'),1);assert.throws(()=>verifyObservedUnitPaths(d.drags,bad));
});

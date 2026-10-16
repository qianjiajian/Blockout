import test from 'node:test';
import assert from 'node:assert/strict';
import {geometryStockFingerprint,graphMicroCounts} from './design-vacancy-independent-pool.mjs';
import {singleVacancyGraph} from './design-single-vacancy.mjs';
const source={width:2,height:2},blocks=[{id:'opening',x:0,y:0,shape:[[0,0],[1,0]]},{id:'b',x:0,y:1,shape:[[0,0],[1,0]]}];
test('Geometry retry identity ignores ID, order and colours but retains exact partition',()=>{
 const a=geometryStockFingerprint(source,blocks),renamed=blocks.toReversed().map((b,i)=>({...b,id:`new-${i}`,color:'green'}));
 assert.deepEqual(a,geometryStockFingerprint(source,renamed));
 const vertical=[{id:'a',x:0,y:0,shape:[[0,0],[0,1]]},{id:'b',x:1,y:0,shape:[[0,0],[0,1]]}];
 assert.notEqual(a.stockSha256,geometryStockFingerprint(source,vertical).stockSha256);
 assert.notEqual(a.shapeInventorySha256,geometryStockFingerprint(source,vertical).shapeInventorySha256);
});
test('Held BFS micro count is distinct from complete boards and guarded cap does not exceed input',()=>{
 const full=singleVacancyGraph(source,blocks,{maxStates:20,maxDepth:45}),micro=graphMicroCounts(full);
 assert.equal(full.rawGeometricStates,2);assert.equal(micro.microDiscoveredStates,4);assert.equal(micro.microNeighbourChecks,16);
 const capped=singleVacancyGraph(source,blocks,{maxStates:1,maxDepth:45});assert.equal(capped.rawGeometricStates,1);assert.equal(capped.expanded,1);assert.equal(graphMicroCounts(capped).microDiscoveredStates,2);
 assert.throws(()=>graphMicroCounts({attempted:3}));
});

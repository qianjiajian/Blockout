import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {auditKnownInterleavedBlueprint,runReverseInterleavedGraph} from './design-reverse-interleaved.mjs';
const runtime=await loadBoundedRuntime();
const root='deliverables/daily-formal-v3-20261008/design';
for(const[source,file,count]of [[54,'nearband14-third/candidate-0073.json',2],[100,'hard-region-03/candidate-0040.json',3],[80,'unused-shared-01/candidate-0004.json',2]])test(`source ${source}: fixed known inverse inserts a body, parks it, then inserts the remaining stock`,()=>{
 const bytes=fs.readFileSync(`${root}/${file}`),packet=JSON.parse(bytes),result=auditKnownInterleavedBlueprint(runtime,packet,{prefixClearCount:count});
 assert(result.valid);assert.equal(result.U,packet.U);assert.equal(result.initialPrefixClearCount,count);
 assert(result.stats.interleavedInsertedBodyParkingEdges>0);assert.equal(result.portalRecords.length,count);
 assert.deepEqual(result.originalInventoryIds,result.restoredInventoryIds);assert(result.rawDiscoveredStates<=10000);
 assert(result.rawExpandedStates<=result.rawDiscoveredStates);assert.equal(result.searchPerformed,false);
 assert.deepEqual(fs.readFileSync(`${root}/${file}`),bytes);
});
test('raw cap spans reconstruction and insertion, not a fresh allocation for each stock layer',()=>{
 const packet=JSON.parse(fs.readFileSync(`${root}/hard-region-03/candidate-0040.json`));
 const complete=auditKnownInterleavedBlueprint(runtime,packet,{prefixClearCount:3});
 assert.throws(()=>auditKnownInterleavedBlueprint(runtime,packet,{prefixClearCount:3,maxStates:complete.rawDiscoveredStates-1}),/max-raw/);
});
test('one graph refuses altered stock semantics and invalid unbounded parking horizons',()=>{
 const body={id:'b',color:'red',shape:[[0,0]],x:0,y:0},level={blocks:[{...body,color:'blue'}]};
 const args={initialLevel:level,initialOperations:[],inventory:[body],charge:()=>'',worldKey:()=>'',insertionOptions:()=>[],parkingOptions:()=>[],goal:()=>null};
 assert.throws(()=>runReverseInterleavedGraph(args),/semantics/);
 for(const n of [NaN,Infinity,-1,257])assert.throws(()=>runReverseInterleavedGraph({...args,maxParkingDrags:n}),/finite/);
});

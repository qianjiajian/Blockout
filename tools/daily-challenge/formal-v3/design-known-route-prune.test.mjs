import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {pruneKnownPlainWitness} from './design-known-route-prune.mjs';
import {pruneEquivalentKnownPlainWitness} from './design-known-route-equivalent-prune.mjs';

const runtime=await loadBoundedRuntime();
const fixture=(twoReds=false)=>({id:998001,name:'known-route identity pruning qualification',width:3,height:2,timeSeconds:180,difficulty:'super',reward:0,
 mechanismRules:'revised-2026-09-27-v1.5',blocks:['red','blue','green','yellow','purple',twoReds?'red':'orange'].map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
 gates:[{id:'red',color:'red',side:'left',offset:1,size:1},{id:'blue',color:'blue',side:'top',offset:1,size:1},
  {id:'green',color:'green',side:'top',offset:2,size:1},{id:'yellow',color:'yellow',side:'bottom',offset:0,size:1},
  {id:'purple',color:'purple',side:'bottom',offset:1,size:1},...(twoReds?[]:[{id:'orange',color:'orange',side:'bottom',offset:2,size:1}])]});
const prefix=twoReds=>[1,2,3,4,...(twoReds?[]:[5])].map(i=>({blockId:`b${i}`,path:[],exitSide:i<3?'top':'bottom'}));

test('literal full-world cycle deletion and adjacent holds preserve the original complete route',()=>{
 const level=fixture(),drags=[...prefix(false),{blockId:'b0',path:[[1,0]]},{blockId:'b0',path:[[2,0]]},{blockId:'b0',path:[[1,0]]},
  {blockId:'b0',path:[[1,1],[0,1]],exitSide:'left'}];
 const bytes=JSON.stringify({level,drags}),p=pruneKnownPlainWitness(runtime,level,drags);
 assert.equal(p.U,0);assert.equal(p.removedCycleDrags,2);assert.equal(p.mergedHolds,1);assert.equal(p.drags.length,6);
 assert(p.replay.valid&&p.replay.complete&&p.independentReplay.valid&&p.independentReplay.complete);assert.equal(p.searchPerformed,false);
 assert.equal(JSON.stringify({level,drags}),bytes);
});

test('known semantic-world ID swap is deleted with an explicit bijection and existing suffix renamed',()=>{
 const level=fixture(true),drags=[...prefix(true),{blockId:'b0',path:[[1,0],[1,1]]},
  {blockId:'b5',path:[[2,0],[1,0],[0,0]]},{blockId:'b0',path:[[2,1]]},
  {blockId:'b5',path:[[0,1]],exitSide:'left'},{blockId:'b0',path:[[1,1],[0,1]],exitSide:'left'}];
 const bytes=JSON.stringify({level,drags}),p=pruneEquivalentKnownPlainWitness(runtime,level,drags);
 assert.equal(p.U,0);assert.equal(p.semanticCycleDragsRemoved,3);assert.equal(p.erasures.length,1);
 assert.deepEqual(p.erasures[0].identityMap.map(x=>[x.from,x.to]).sort(),[['b0','b5'],['b5','b0']]);
 assert.deepEqual(p.drags.slice(-2).map(x=>x.blockId),['b0','b5']);assert.equal(p.drags.length,6);
 assert(p.replay.valid&&p.replay.complete&&p.independentReplay.valid&&p.independentReplay.complete);
 assert.equal(p.lowerSearches,0);assert.equal(p.upperSearches,0);assert.equal(JSON.stringify({level,drags}),bytes);
});

test('static plain rewrite rejects ice or an incomplete source witness before any identity simplification',()=>{
 const level=fixture(true);level.blocks[0].frozen=1;
 assert.throws(()=>pruneEquivalentKnownPlainWitness(runtime,level,[]));
 assert.throws(()=>pruneEquivalentKnownPlainWitness(runtime,fixture(),prefix(false)));
});

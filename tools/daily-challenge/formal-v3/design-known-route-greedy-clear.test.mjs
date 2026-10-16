import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {greedyClearKnownPlainWitness} from './design-known-route-greedy-clear.mjs';
const runtime=await loadBoundedRuntime(),evidence=[];
function fixture(){
 const level={id:998002,name:'greedy supplied-route qualification',width:3,height:2,timeSeconds:180,difficulty:'super',reward:0,mechanismRules:'revised-2026-09-27-v1.5',
  blocks:['red','blue','green','yellow','purple','orange'].map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[{id:'red',color:'red',side:'left',offset:1,size:1},...['blue','green'].map((color,i)=>({id:color,color,side:'top',offset:i+1,size:1})),
   ...['yellow','purple','orange'].map((color,i)=>({id:color,color,side:'bottom',offset:i,size:1}))]};
 const drags=[...[1,2,3,4,5].map(i=>({blockId:`b${i}`,path:[],exitSide:i<3?'top':'bottom'})),{blockId:'b0',path:[[1,0]]},{blockId:'b0',path:[[2,0]]},
  {blockId:'b0',path:[[1,0]]},{blockId:'b0',path:[[1,1],[0,1]],exitSide:'left'}];
 return{level,drags};
}
test('fixed-priority immediate clears remove supplied detours with actual complete double replay',()=>{
 const{level,drags}=fixture(),bytes=JSON.stringify({level,drags}),r=greedyClearKnownPlainWitness(runtime,level,drags,{priorConstructionRaw:679});
 assert(r.ok,JSON.stringify(r));assert.equal(r.U,0);assert.equal(r.drags.length,6);assert.equal(r.statistics.rawDiscoveredStates,7);
 assert.equal(r.statistics.cumulativeRawStates,686);assert.equal(r.statistics.committedWorldBranches,1);assert.equal(r.upperFullBoardSearches,0);
 assert(r.replay.valid&&r.replay.complete&&r.independentReplay.valid&&r.independentReplay.complete);assert.equal(JSON.stringify({level,drags}),bytes);evidence.push(r);
});
test('prior raw plus initial world reaches the ceiling before any extra commit',()=>{
 const{level,drags}=fixture(),r=greedyClearKnownPlainWitness(runtime,level,drags,{priorConstructionRaw:9999});
 assert.equal(r.ok,false);assert.equal(r.reason,'greedy-cumulative-max-raw-states');assert.equal(r.statistics.cumulativeRawStates,10000);
 assert.equal(r.events.length,0);assert.equal(r.statistics.rawDiscoveredStates,1);evidence.push(r);
});
test('held reachability consumes its separate finite micro budget without accepting a partial route',()=>{
 const{level,drags}=fixture(),r=greedyClearKnownPlainWitness(runtime,level,drags,{maxMicroStates:1});
 assert.equal(r.ok,false);assert.equal(r.reason,'greedy-max-micro-states');assert.equal(r.statistics.microDiscoveredStates,1);evidence.push(r);
});
test('ice, layered bodies, partial input and nonfinite budgets are rejected',()=>{
 const{level,drags}=fixture();for(const change of [l=>l.blocks[0].frozen=1,l=>l.blocks[0].layers=['red','green']]){
  const bad=structuredClone(level);change(bad);const r=greedyClearKnownPlainWitness(runtime,bad,drags);assert.equal(r.ok,false);assert.equal(r.events.length,0);
 }
 assert.equal(greedyClearKnownPlainWitness(runtime,level,drags.slice(0,-1)).ok,false);
 for(const args of [{maxStates:10001},{priorConstructionRaw:Infinity},{maxMilliseconds:NaN},{maxMicroStates:0}])assert.throws(()=>greedyClearKnownPlainWitness(runtime,level,drags,args));
});
test.after(()=>{if(process.env.GREEDY_ROUTE_QUALIFICATION_OUT){const path=process.env.GREEDY_ROUTE_QUALIFICATION_OUT;
 fs.writeFileSync(path,JSON.stringify({status:'FOUR_TINY_FIXED_TRACE_QUALIFICATIONS_PASS',actualCandidateOptimizations:0,proofFrozenUnchanged:true,
  toolchainSha256:runtime.toolchainSha256,evidence},null,2)+'\n',{flag:'wx'});}});

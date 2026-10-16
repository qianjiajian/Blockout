import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {routeFirstUse,lateRegionMetadata,checkLateMutationPrefix} from './design-late-route-region.mjs';
import {digest} from './diversity-layout-factory.mjs';
const runtime=await loadBoundedRuntime();
function fixture(){const level={id:998008,name:'late-region-prefix',width:3,height:2,timeSeconds:180,difficulty:'super',reward:0,mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',color:'red',x:0,y:0,shape:[[0,0],[1,0]]},{id:'b',color:'blue',x:2,y:0,shape:[[0,0],[0,1]]},{id:'g',color:'green',x:0,y:1,shape:[[0,0],[1,0]]}],
 gates:[{id:'gr',color:'red',side:'left',offset:0,size:1},{id:'gb',color:'blue',side:'top',offset:2,size:1},{id:'gg',color:'green',side:'right',offset:0,size:1}]};
 const drags=[{blockId:'r',path:[],exitSide:'left'},{blockId:'g',path:[[0,0]]},{blockId:'b',path:[],exitSide:'top'},{blockId:'g',path:[[1,0]],exitSide:'right'}];
 const candidate=structuredClone(level);Object.assign(candidate.blocks[1],{color:'green',shape:[[0,0]]});Object.assign(candidate.blocks[2],{color:'blue',shape:[[0,0],[1,0],[2,0]]});
 return{level,candidate,drags};}
test('first-use metadata ranks actual supplied non-clearing prefix, not total drag count',()=>{
 const{level,drags}=fixture(),u=routeFirstUse(level,drags),m=lateRegionMetadata(level,['b','g'],u);
 assert.equal(u.nonclear,1);assert.equal(u.first.b.nonclearBefore,1);assert.equal(u.first.g.nonclearBefore,0);
 assert(m.connected);assert.equal(m.regionArea,4);assert.equal(m.prefixLength,1);assert.equal(m.preservedPrefixNonclear,0);
});
test('changed shape and colour exact-union region preserves one canonical original prefix without claiming a full U',()=>{
 const p=fixture(),before=digest(p),r=checkLateMutationPrefix(runtime,p.level,p.candidate,['b','g'],p.drags);
 assert(r.valid,r.error);assert.equal(r.actionAudits.length,1);assert.equal(r.rawWorldsInspected,2);
 assert.equal(r.searchPerformed,false);assert.equal(r.completeUpperWitness,false);assert.equal(r.lowerBoundClaimed,false);
 assert.equal(digest(p),before);
});
test('changed gates, outside bodies, changed occupancy and special mechanics cannot use the prefix invariant',()=>{
 const p=fixture();for(const mutate of [l=>l.gates[0].size=2,l=>l.blocks[0].color='yellow',l=>l.blocks[1].x=1,l=>l.blocks[1].frozen=2]){
  const level=structuredClone(p.candidate);mutate(level);assert.equal(checkLateMutationPrefix(runtime,p.level,level,['b','g'],p.drags).valid,false);
 }
});
test('canonical pointer-down first contact is checked despite exact-union static compatibility',()=>{
 const p=fixture();p.drags[0].path=[[1,0]];
 const r=checkLateMutationPrefix(runtime,p.level,p.candidate,['b','g'],p.drags);
 assert.equal(r.valid,false);assert.match(r.error,/Pointer-down/);
});
test('deterministic verification has an explicit raw cap and rejects invalid finite bounds',()=>{
 const p=fixture(),r=checkLateMutationPrefix(runtime,p.level,p.candidate,['b','g'],p.drags,{maxRawWorlds:1});
 assert.equal(r.valid,false);assert.equal(r.rawWorldsInspected,1);assert.equal(r.actionAudits.length,0);
 for(const cap of [0,10001,NaN,Infinity])assert.throws(()=>checkLateMutationPrefix(runtime,p.level,p.candidate,['b','g'],p.drags,{maxRawWorlds:cap}));
});

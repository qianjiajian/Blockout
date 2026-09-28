import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadSpatialApi,key,NONE} from './remake111to120-spatial-floor-v147.mjs';
import {compileStatic,eachStatic,normalizeStatic} from './remake111to120-static-floor-v147.mjs';
import {compileFastStatic,checkFastStaticFloor} from './remake111to120-fast-static-floor-v147.mjs';
import {forEachGesture} from './remake21to30-mask-floor.mjs';
import {normalizeMonotoneClears} from './remake21to30-symmetry-floor-v139.mjs';
const api=await loadSpatialApi(),toByte=s=>Uint8Array.from(s,v=>v===NONE?255:v);
const fixture=()=>({id:118,name:'byte graph qualification',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'normal',width:4,height:2,timeSeconds:60,reward:20,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'rs',color:'red',side:'right',offset:0,size:2,star:true},{id:'b',color:'blue',side:'top',offset:0,size:4,frozen:1}],
 blocks:[{id:'s',color:'red',star:true,x:1,y:0,shape:[[0,0],[1,0]]},{id:'plain',color:'red',x:1,y:1,shape:[[0,0]]},{id:'shell',color:'red',layers:['red','blue'],x:3,y:1,shape:[[0,0]],movementAxis:'vertical'}]});
test('byte encoding has the exact same full gesture graph and normalized state for all finite states',t=>{
 const l=fixture(),a=compileStatic(l,api),b=compileFastStatic(l,api),nodes=[a.initial],seen=new Set([key(a.initial)]);let edges=0;
 for(let at=0;at<nodes.length;at++){
  assert(nodes.length<15000);const s=nodes[at],expected=new Set(),actual=new Set();
  eachStatic(a,s,(next,cost)=>{expected.add(key(toByte(next))+'/'+cost);const k=key(next);if(!seen.has(k)){seen.add(k);nodes.push(next);}edges++;});
  const bs=toByte(s);forEachGesture(b,bs,(i,v,cost)=>{const next=bs.slice();next[i]=v;actual.add(key(next)+'/'+cost);});assert.deepEqual(actual,expected);
  assert.deepEqual(normalizeMonotoneClears(b,bs).state,toByte(normalizeStatic(a,s)));
 }t.diagnostic(`${nodes.length} states / ${edges} edges preserve encoding and normalization`);
});
test('118 actual poses preserve all multi-cell star/axis exits; unsupported domains fail closed',()=>{
 const d=JSON.parse(fs.readFileSync('deliverables/remake111-120-v146-20260924/agent115-118/candidate118-enriched-1790268814645.json'));
 const a=compileStatic(d.level,api),b=compileFastStatic(d.level,api);assert.equal(a.N,b.blocks.length);
 for(let i=0;i<a.N;i++)for(let p=0;p<a.blocks[i].poses.length;p++)if(a.blocks[i].poses[p]){
  assert.deepEqual(a.blocks[i].poses[p].neighbors,b.blocks[i].poses[p].neighbors);
  assert.deepEqual(a.blocks[i].poses[p].exits.map(es=>es.map(e=>e.side)),b.blocks[i].poses[p].exits.map(e=>e?[e.side]:[]));
 }
 const l=fixture();l.blocks[0].keyId='k';assert.equal(checkFastStaticFloor(l,api,{floor:5}).status,'unsupported');
 const r=checkFastStaticFloor(fixture(),api,{floor:5,maxStates:1,monotoneSuffix:false});assert.equal(r.status,'unknown');assert(!r.thresholdProven);
});

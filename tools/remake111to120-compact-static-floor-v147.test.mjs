import test from 'node:test';import assert from 'node:assert/strict';
import {loadSpatialApi,key} from './remake111to120-spatial-floor-v147.mjs';
import {compileFastStatic} from './remake111to120-fast-static-floor-v147.mjs';
import {forEachGesture,clearCount} from './remake21to30-mask-floor.mjs';
import {normalizeMonotoneClears} from './remake21to30-symmetry-floor-v139.mjs';
import {compactNormalize,searchCompactStatic,checkCompactStaticFloor} from './remake111to120-compact-static-floor-v147.mjs';
const api=await loadSpatialApi();
const fixture=()=>({id:118,name:'compact static qualification',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'normal',width:3,height:2,timeSeconds:60,reward:20,
 gates:[{id:'gr',color:'red',side:'left',offset:0,size:2},{id:'gb',color:'blue',side:'top',offset:2,size:1,frozen:1}],
 blocks:[{id:'a',color:'red',x:1,y:0,shape:[[0,0]]},{id:'b',color:'blue',x:0,y:0,shape:[[0,0]]},{id:'c',color:'blue',x:1,y:1,shape:[[0,0]]}]});
test('all finite start states have the same optimum under compact canonical buckets',t=>{
 const c=compileFastStatic(fixture(),api),states=[c.initial],indices=new Map([[key(c.initial),0]]),edges=[];let total=0;
 for(let at=0;at<states.length;at++){assert(states.length<5000);edges[at]=[];const s=states[at];assert.deepEqual(compactNormalize(c,s),normalizeMonotoneClears(c,s).state);
  forEachGesture(c,s,(i,v,cost)=>{const next=s.slice();next[i]=v;const nk=key(next);if(!indices.has(nk)){indices.set(nk,states.length);states.push(next);}edges[at].push([indices.get(nk),cost]);total++;});}
 const d=states.map(s=>clearCount(c,s)===c.totalClears?0:Infinity);for(let change=true;change;){change=false;for(let i=0;i<states.length;i++)for(const[j,cost]of edges[i])if(d[i]>cost+d[j]){d[i]=cost+d[j];change=true;}}
 let finite=0,positive=0;for(let i=0;i<states.length;i++)if(Number.isFinite(d[i])){finite++;positive+=Number(d[i]>0);if(d[i]>0)assert(searchCompactStatic(c,{start:states[i],floor:d[i]}).thresholdProven);const r=searchCompactStatic(c,{start:states[i],floor:d[i]+1});assert.equal(r.status,'relaxed-shortcut');assert.equal(r.cost,d[i]);}
 assert(positive>0);t.diagnostic(`${states.length} states / ${total} edges / ${finite} finite / ${positive} positive-cost starts`);
});
test('unsupported and exhausted budgets never pass',()=>{const l=fixture();assert.equal(checkCompactStaticFloor(l,api,{floor:5,maxStates:1}).status,'unknown');assert.equal(checkCompactStaticFloor(l,api,{floor:0}).status,'invalid');l.blocks[0].timedBombSeconds=1;assert.equal(checkCompactStaticFloor(l,api,{floor:2}).status,'unsupported');});

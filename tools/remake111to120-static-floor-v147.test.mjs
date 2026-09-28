import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSpatialApi,each,key,cleared} from './remake111to120-spatial-floor-v147.mjs';
import {compileStatic,eachStatic,normalizeStatic,staticKey,checkStaticFloor} from './remake111to120-static-floor-v147.mjs';
const api=await loadSpatialApi();
const fixture=()=>({id:118,name:'static mixed qualification',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'normal',width:3,height:2,timeSeconds:60,reward:20,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'rs',color:'red',side:'top',offset:0,size:3,star:true},{id:'b',color:'blue',side:'right',offset:0,size:2,frozen:1},{id:'y',color:'yellow',side:'bottom',offset:0,size:3}],
 blocks:[{id:'star',color:'red',star:true,x:2,y:0,shape:[[0,0]]},{id:'plain',color:'red',x:0,y:1,shape:[[0,0]]},
 {id:'shell',color:'red',layers:['red','blue'],x:1,y:0,shape:[[0,0]],keyId:'a'},
 {id:'locked',color:'yellow',lockedBy:'a',lockCount:1,movementAxis:'vertical',frozen:1,x:1,y:1,shape:[[0,0]]}]});
test('static closures, final-body normalization and identity quotient preserve exhaustive graph costs',t=>{
 let total=0,edges=0;
 for(const duplicate of [false,true]){
  const l=fixture();if(duplicate){l.blocks[2]={id:'twin',color:'red',x:1,y:0,shape:[[0,0]]};l.blocks[3]={id:'axis',color:'yellow',movementAxis:'vertical',x:1,y:1,shape:[[0,0]]};}
  const c=compileStatic(l,api),nodes=[c.initial],index=new Map([[key(c.initial),0]]),reverse=[],outgoing=[];
  for(let at=0;at<nodes.length;at++){
   assert(nodes.length<15000);const s=nodes[at],expected=new Set(),actual=new Set();
   each(c,s,(next,cost)=>expected.add(key(next)+'/'+cost));
   eachStatic(c,s,(next,cost)=>{const k=key(next);actual.add(k+'/'+cost);let j=index.get(k);if(j===undefined){j=nodes.length;index.set(k,j);nodes.push(next);}reverse[j]??=[];reverse[j].push([at,cost]);edges++;});
   assert.deepEqual(actual,expected);outgoing[at]=actual;
  }
  const distance=Array(nodes.length).fill(Infinity),queue=[];
  nodes.forEach((s,i)=>{if(cleared(c,s)===c.totalClears){distance[i]=0;queue.push(i);}});
  for(let at=0;at<queue.length;at++){const j=queue[at];for(const [i,cost]of reverse[j]??[])if(distance[i]>distance[j]+cost){distance[i]=distance[j]+cost;queue.push(i);}}
  const identities=new Map();
  nodes.forEach((s,i)=>{
   assert.equal(distance[i],distance[index.get(key(normalizeStatic(c,s)))],'Early body removal must not alter the optimal remaining cost');
   const canonical=staticKey(c,s),prior=identities.get(canonical);if(prior!==undefined)assert.equal(distance[i],distance[prior],'Equivalent body labels cannot change remaining cost');else identities.set(canonical,i);
  });total+=nodes.length;
 }
 assert(total>100);t.diagnostic(`${total} states / ${edges} edges, all remaining optimum costs compared`);
});
test('stars are never merged with ordinary twins and budget/unsupported cannot certify',()=>{
 const l=fixture(),c=compileStatic(l,api);assert(!c.groups.some(g=>g.includes(0)&&g.includes(1)));
 const bomb=structuredClone(l);bomb.blocks[0].timedBombSeconds=10;assert.equal(checkStaticFloor(bomb,api,{floor:11}).status,'unsupported');
 const cover=structuredClone(l);cover.shutters=[{id:'x'}];assert.equal(checkStaticFloor(cover,api,{floor:11}).status,'unsupported');
 const r=checkStaticFloor(l,api,{floor:11,maxStates:1,normalize:false});assert.equal(r.status,'unknown');assert(!r.thresholdProven);
});

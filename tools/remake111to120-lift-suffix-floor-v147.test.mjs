import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSpatialApi,each,key,cleared,NONE} from './remake111to120-spatial-floor-v147.mjs';
import {compileLiftSuffix,normalizeLiftSuffix,liftSuffixKey,checkLiftSuffixFloor} from './remake111to120-lift-suffix-floor-v147.mjs';
const api=await loadSpatialApi();
const fixture=()=>({id:113,name:'lift suffix qualification',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'easy',width:3,height:2,timeSeconds:60,reward:20,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'rs',color:'red',side:'top',offset:0,size:3,star:true},{id:'b',color:'blue',side:'right',offset:0,size:2,frozen:1},{id:'y',color:'yellow',side:'bottom',offset:0,size:3}],
 shutters:[{id:'lift',skin:'lift',count:0,x:1,y:1,width:1,height:1},{id:'cover',count:2,x:2,y:1,width:1,height:1}],
 blocks:[{id:'top',color:'red',layers:['red','blue'],x:1,y:1,shape:[[0,0]],keyId:'a'},{id:'hidden',color:'red',star:true,x:1,y:1,shape:[[0,0]],frozen:1,shutterId:'lift'},
 {id:'covered',color:'blue',x:2,y:1,shape:[[0,0]],shutterId:'cover'},
 {id:'locked',color:'yellow',movementAxis:'vertical',lockedBy:'a',lockCount:1,x:0,y:0,shape:[[0,0]]}]});
test('entire mixed lift graph preserves optimal cost at every suffix-normalized state',t=>{
 const c=compileLiftSuffix(fixture(),api),nodes=[c.initial],index=new Map([[key(c.initial),0]]),reverse=[];let edges=0,guarded=0,changed=0;
 for(let at=0;at<nodes.length;at++){
  assert(nodes.length<20000);each(c,nodes[at],(next,cost)=>{const k=key(next);let j=index.get(k);if(j===undefined){j=nodes.length;index.set(k,j);nodes.push(next);}reverse[j]??=[];reverse[j].push([at,cost]);edges++;});
 }
 const d=Array(nodes.length).fill(Infinity),queue=[];nodes.forEach((s,i)=>{if(cleared(c,s)===c.totalClears){d[i]=0;queue.push(i);}});
 for(let at=0;at<queue.length;at++){const j=queue[at];for(const [i,cost]of reverse[j]??[])if(d[i]>d[j]+cost){d[i]=d[j]+cost;queue.push(i);}}
 const equivalents=new Map();
 nodes.forEach((s,i)=>{
  const normalized=normalizeLiftSuffix(c,s),j=index.get(key(normalized));assert(j!==undefined);assert.equal(d[i],d[j]);
  if(s[c.covers.find(x=>x.skin==='lift').stateIndex]===NONE){assert.equal(normalized,s);guarded++;}else if(key(s)!==key(normalized))changed++;
  const k=liftSuffixKey(c,s),prior=equivalents.get(k);if(prior!==undefined)assert.equal(d[i],d[prior]);else equivalents.set(k,i);
 });assert(guarded&&changed);t.diagnostic(`${nodes.length} states / ${edges} edges / ${guarded} unnormalized lift prefixes / ${changed} normalized suffixes`);
});
test('budgets and unsupported arrivals/timers never pass',()=>{
 const l=fixture();let r=checkLiftSuffixFloor(l,api,{floor:11,maxStates:1});assert.equal(r.status,'unknown');assert(!r.thresholdProven);
 const timer=structuredClone(l);timer.blocks[0].timedBombSeconds=10;assert.equal(checkLiftSuffixFloor(timer,api,{floor:5}).status,'unsupported');
});

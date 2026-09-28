import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi} from './remake131to140-v172.mjs';
import {compile,each,key,stateOf,clearCount,normalize,checkAxisFloor} from './remake131to140-axis-floor-v172.mjs';
const {api}=await loadApi();
Error.stackTraceLimit=3;
const fixture=(hidden,shell)=>({id:135,name:'axis qualification',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:2,
 gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:3},{id:'gate-b',color:'blue',side:'top',offset:0,size:3},{id:'gate-g',color:'green',side:'right',offset:0,size:2,frozen:1}],
 shutters:hidden?[{id:'cover',x:0,y:0,width:2,height:1,count:1}]:[],
 blocks:[{id:'a',color:'red',x:0,y:0,shape:[[0,0]],movementAxis:'vertical',...(hidden?{shutterId:'cover',frozen:1}:{})},
 {id:'b',color:'blue',x:1,y:0,shape:[[0,0]],movementAxis:'vertical',...(hidden?{shutterId:'cover'}:{})},
 {id:'c',color:'green',x:0,y:1,shape:[[0,0],[1,0]],...(shell?{layers:['green','blue']}:{})},
 {id:'d',color:'red',x:2,y:1,shape:[[0,0]],frozen:1}]});
test('all axis/countdown/shell/ice gestures and every model unit agree, and normalization preserves every state optimum',t=>{
 let totalStates=0,totalEdges=0,unitProbes=0;
 for(const hidden of [false,true])for(const shell of [false,true]){
  const l=fixture(hidden,shell),c=compile(l,api),m=new api.PuzzleModel(l);m.startCountdown();
  const nodes=[{s:c.initial,m}],index=new Map([[key(c.initial),0]]),reverse=[[]];assert.deepEqual(stateOf(c,m.snapshot()),c.initial);
  for(let at=0;at<nodes.length;at++){
   assert(nodes.length<20000);const {s,m}=nodes[at],edges=new Set();assert.deepEqual(stateOf(c,m.snapshot()),s);
   each(c,s,(i,v,cost,get)=>{const d=get(),n=m.clone(),before=n.snapshot();n.beginAction();for(const p of d.path)assert(n.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(n.tryExit(d.blockId,d.exitSide).ok);assert(n.commitAction());
    const next=s.slice();next[i]=v;assert.deepEqual(stateOf(c,n.snapshot()),next);assert.equal(cost,Number(before.cleared===n.snapshot().cleared));const k=key(next);edges.add(k);if(!index.has(k)){index.set(k,nodes.length);nodes.push({s:next,m:n});reverse.push([]);}reverse[index.get(k)].push([at,cost]);totalEdges++;
   });
   for(const b of m.snapshot().blocks){for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=m.clone();n.beginAction();if(n.moveBlockStep(b.id,b.x+dx,b.y+dy))assert(edges.has(key(stateOf(c,n.snapshot()))),'Every allowed model unit belongs to the graph');unitProbes++;}for(const side of ['top','bottom','left','right']){const n=m.clone();n.beginAction();if(n.tryExit(b.id,side).ok)assert(edges.has(key(stateOf(c,n.snapshot()))));}}
  }
  const dist=nodes.map(()=>Infinity),pending=[];nodes.forEach((n,i)=>{if(clearCount(c,n.s)===c.total){dist[i]=0;pending.push(i);}});
  while(pending.length){const i=pending.shift();for(const [j,cost]of reverse[i])if(dist[j]>dist[i]+cost){dist[j]=dist[i]+cost;pending.push(j);}}
  nodes.forEach(({s},i)=>assert.equal(dist[index.get(key(normalize(c,s).s))],dist[i],'Normalized optimum'));
  const r=checkAxisFloor(l,api,{floor:4,maxStates:20000,maxMilliseconds:10000});assert.notEqual(r.status,'unknown');if(dist[0]<4){assert.equal(r.cost,dist[0]);assert(api.replayRevisedRoute(l,r.drags).complete);}else assert(r.thresholdProven);
  totalStates+=nodes.length;
 }
 assert(totalStates>100&&totalEdges>500);t.diagnostic(`${totalStates} states / ${totalEdges} gestures / ${unitProbes} unit probes`);
});
test('unsupported mechanics and state limits never produce certificates',()=>{
 const l=fixture(false,true);l.blocks[0].star=true;assert.equal(checkAxisFloor(l,api).status,'unsupported');
 const r=checkAxisFloor(fixture(false,true),api,{floor:4,maxStates:1,maxMilliseconds:1000});assert(!r.thresholdProven);
});

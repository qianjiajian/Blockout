import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModelApi} from './remake131to140-model-api.mjs';
import {compile,each,stateOf,clearCount,checkAutomaticGeneratorFloor,normalizeExhausted} from './remake131to140-generator-floor-v172.mjs';
const api=await loadModelApi();Error.stackTraceLimit=0;const key=s=>s.join(',');
function fixture(count){const base={id:132,name:'FIFO qualification',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4'};
 if(count===2)return{...base,width:3,height:4,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'b',color:'blue',side:'right',offset:2,size:2},{id:'g',color:'green',side:'left',offset:2,size:2},{id:'y',color:'yellow',side:'right',offset:0,size:2}],
 generators:[{id:'g0',side:'top',offset:1,rimSpan:3,rimMount:'rim',spawn:[0,0],queueBlockIds:['a0','b0']},{id:'g1',side:'bottom',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,3],queueBlockIds:['a1','b1']}],
 blocks:[['a0',0,0,'red'],['b0',0,0,'green'],['a1',1,3,'blue'],['b1',1,3,'yellow']].map(([id,x,y,color])=>({id,x,y,color,shape:[[0,0],[1,0]]}))};
 const poses=[[0,0],[4,0],[4,4],[0,4]],sides=['top','right','bottom','left'],colors=['yellow','red','blue','green'];return{...base,width:7,height:7,
 playable:poses.flatMap(([x,y])=>Array.from({length:9},(_,i)=>[x+i%3,y+Math.floor(i/3)])),
 gates:[{id:'r',color:'red',side:'top',offset:4,size:3},{id:'b',color:'blue',side:'right',offset:4,size:3},{id:'g',color:'green',side:'bottom',offset:0,size:3},{id:'y',color:'yellow',side:'left',offset:0,size:3}],
 generators:poses.map((spawn,i)=>({id:'gen'+i,side:sides[i],offset:i<2?1:5,rimSpan:3,rimMount:'rim',spawn,queueBlockIds:['a'+i]})),
 blocks:poses.map(([x,y],i)=>({id:'a'+i,x,y,color:colors[i],shape:Array.from({length:9},(_,j)=>[j%3,Math.floor(j/3)])}))};}
test('two and four automatic generators: entire graphs match real gestures and all legal units',t=>{
 let states=0,edges=0,units=0,arrivals=0;
 for(const count of [2,4]){const l=fixture(count),c=compile(l,api),m=new api.PuzzleModel(l);m.startCountdown();const nodes=[{s:c.initial,m}],seen=new Set([key(c.initial)]),indices=new Map([[key(c.initial),0]]),reverse=[[]];
  for(let at=0;at<nodes.length;at++){assert(nodes.length<50000);const {s,m}=nodes[at],keys=new Set();assert.deepEqual(stateOf(c,m.snapshot()),s);assert.equal(clearCount(c,s),m.snapshot().cleared);
   each(c,s,(next,cost,get)=>{const d=get(),n=m.clone(),before=n.snapshot();n.beginAction();for(const p of d.path)assert(n.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(n.tryExit(d.blockId,d.exitSide).ok);assert(n.commitAction());assert.deepEqual(stateOf(c,n.snapshot()),next);assert.equal(cost,Number(n.snapshot().cleared===before.cleared));arrivals+=before.queuedBlocks.length-n.snapshot().queuedBlocks.length;const k=key(next);keys.add(k);edges++;if(!seen.has(k)){seen.add(k);indices.set(k,nodes.length);nodes.push({s:next,m:n});reverse.push([]);}reverse[indices.get(k)].push([at,cost]);});
   for(const b of m.snapshot().blocks){for(const[dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const n=m.clone();n.beginAction();if(n.moveBlockStep(b.id,b.x+dx,b.y+dy))assert(keys.has(key(stateOf(c,n.snapshot()))));units++;}for(const side of ['top','right','bottom','left']){const n=m.clone();n.beginAction();if(n.tryExit(b.id,side).ok)assert(keys.has(key(stateOf(c,n.snapshot()))));}}
  }
  const dist=nodes.map(()=>Infinity),pending=[];nodes.forEach((n,i)=>{if(clearCount(c,n.s)===c.total){dist[i]=0;pending.push(i);}});while(pending.length){const i=pending.shift();for(const [j,cost]of reverse[i])if(dist[j]>dist[i]+cost){dist[j]=dist[i]+cost;pending.push(j);}}
  nodes.forEach(({s},i)=>assert.equal(dist[indices.get(key(normalizeExhausted(c,s).s))],dist[i],'Every-state normalization preserves optimum'));
  states+=nodes.length;
 }
 assert(states>100&&edges>1000&&arrivals>0);t.diagnostic(`${states} states / ${edges} gestures / ${units} units / ${arrivals} arrivals`);
});
test('unsupported mechanics and finite limits fail closed',()=>{
 const l=fixture(2);l.blocks[0].frozen=1;assert.equal(checkAutomaticGeneratorFloor(l,api).status,'unsupported');
 const limited=checkAutomaticGeneratorFloor(fixture(2),api,{floor:11,maxStates:1,maxMilliseconds:1000});assert.equal(limited.status,'unknown');assert(!limited.thresholdProven);
});

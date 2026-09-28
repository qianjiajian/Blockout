import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadSpatialApi,replayDomain,searchSpatial} from '../../../../remake111to120-spatial-floor-v147.mjs';
import {digest} from '../../../../revised-preview-validation-v160.mjs';
import {compile,cleared,NONE,normalizeClears,each,key,canonical,stateText,checkNativeStars,SOURCE,WRAPPER,OUT} from './native-stars.mjs';
const api=await loadSpatialApi(),base={id:146,name:'star native qualification',difficulty:'super',mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,timeSeconds:100,reward:0};
const fixtures=[
 {...base,gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:3},{id:'gate-r-star',color:'red',star:true,side:'top',offset:0,size:2,frozen:1},{id:'gate-b',color:'blue',side:'right',offset:0,size:3}],blocks:[{id:'a',color:'red',star:true,x:0,y:1,shape:[[0,0],[1,0]]},{id:'b',color:'red',x:1,y:0,shape:[[0,0]],layers:['red','blue']},{id:'c',color:'blue',x:2,y:2,shape:[[0,0]],frozen:1}]},
 {...base,gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:1},{id:'gate-r-star',color:'red',star:true,side:'bottom',offset:0,size:2,frozen:1},{id:'gate-b',color:'blue',side:'right',offset:1,size:2,frozen:2}],blocks:[{id:'a',color:'red',star:true,x:0,y:1,shape:[[0,0],[1,0]]},{id:'b',color:'red',x:0,y:0,shape:[[0,0]]},{id:'c',color:'blue',x:2,y:0,shape:[[0,0]],shutterId:'cover-c'}],shutters:[{id:'cover-c',x:2,y:0,width:1,height:1,count:1}]},
 {...base,gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:1},{id:'gate-r-star',color:'red',star:true,side:'right',offset:0,size:2,frozen:1},{id:'gate-b',color:'blue',side:'left',offset:0,size:1}],blocks:[{id:'a',color:'red',star:true,x:0,y:1,shape:[[0,0]],layers:['red','blue']},{id:'b',color:'red',x:1,y:1,shape:[[0,0]]},{id:'c',color:'red',star:true,x:2,y:2,shape:[[0,0]],shutterId:'cover-c'},{id:'d',color:'blue',x:1,y:0,shape:[[0,0]],shutterId:'cover-d'}],shutters:[{id:'cover-c',x:2,y:2,width:1,height:1,count:1},{id:'cover-d',x:1,y:0,width:1,height:1,count:2}]}
];
const high=structuredClone(fixtures[1]);high.width=8;high.height=12;high.playable=Array.from({length:9},(_,i)=>[5+i%3,9+Math.floor(i/3)]);for(const b of high.blocks){b.x+=5;b.y+=9;}for(const s of high.shutters){s.x+=5;s.y+=9;}for(const g of high.gates)g.offset+=['top','bottom'].includes(g.side)?5:9;high.gates[0].side='right';fixtures.push(high);
const rows=[];
for(const [fixture,l]of fixtures.entries()){
 const c=compile(l,api),states=[c.initial],index=new Map([[key(c.initial),0]]),edges=[];let transitions=0;
 for(let i=0;i<states.length;i++){assert(states.length<15000,'finite qualification cap');const out=[];each(c,states[i],(s,cost,get)=>{const k=key(s);let j=index.get(k);if(j===undefined){j=states.length;index.set(k,j);states.push(s);}out.push([j,cost]);transitions++;});edges.push(out);}
 const native=checkNativeStars(l,api,{successorsOnly:true,states,maxStates:50000,maxMilliseconds:10000});assert(native.rows);assert.equal(native.rows.length,states.length);
 for(const[i,s]of states.entries()){const n=normalizeClears(c,s).s,row=native.rows[i],next=new Set();each(c,s,(t,cost)=>next.add(cost+':'+stateText(c,canonical(c,normalizeClears(c,t).s))));assert.equal(row.state,stateText(c,s));assert.equal(row.normalized,stateText(c,n));assert.equal(row.canonical,stateText(c,canonical(c,n)));assert.deepEqual(row.successors.sort(),[...next].sort());}
 const distance=states.map(s=>cleared(c,s)===c.totalClears?0:Infinity);let changed=true;while(changed){changed=false;for(let i=0;i<states.length;i++)for(const[j,cost]of edges[i])if(distance[j]+cost<distance[i]){distance[i]=distance[j]+cost;changed=true;}}
 for(let i=0;i<states.length;i++)assert.equal(distance[i],distance[index.get(key(normalizeClears(c,states[i]).s))]);
 const checks=[];for(let floor=1;floor<=4;floor++){const p=checkNativeStars(l,api,{floor,maxStates:50000,maxMilliseconds:10000});assert.equal(p.thresholdProven,distance[0]>=floor);assert.notEqual(p.status,'unknown');if(!p.thresholdProven)assert.equal(p.relaxedNonClearingDrags,distance[0]);checks.push({floor,status:p.status});}
 rows.push({fixture,states:states.length,transitions,optimum:Number.isFinite(distance[0])?distance[0]:null,everySuccessorMatches:true,normalizationPreservesEveryOptimum:true,checks,input:native.input,output:native.output});
}
const negative=[];
for(const [label,mutate]of [['hidden-ice',l=>l.blocks.at(-1).frozen=1],['lift',l=>l.shutters[0].skin='lift'],['key',l=>l.blocks[0].keyId='k'],['oversized',l=>l.width=40]]){const l=structuredClone(fixtures[1]);mutate(l);const p=checkNativeStars(l,api);assert.equal(p.status,'unsupported');negative.push(label);}
const budget=checkNativeStars(fixtures[0],api,{floor:4,maxStates:1,maxMilliseconds:10000});assert.equal(budget.status,'unknown');assert(!budget.thresholdProven);
const files=[SOURCE,WRAPPER,import.meta.filename,'tools/remake111to120-spatial-floor-v147.mjs','src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts'];
const report={passed:true,rows,negative,budgetUnknownNotPass:true,bindings:Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))]))},file=OUT+`/qualification-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({file,passed:true,rows}));

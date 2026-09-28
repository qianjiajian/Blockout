import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadModelApi} from '../../../remake131to140-model-api.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {clearCount,checkAxisFloor} from '../../../remake131to140-axis-floor-v172.mjs';
import {compile,each,key,normalize,canonical,stateText,checkNativePrunedFloor,SOURCE,WRAPPER,OUT} from './native-axis-pruned.mjs';
Error.stackTraceLimit=2;const api=await loadModelApi();
const base={id:140,name:'native qualification',difficulty:'hard',mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,timeSeconds:100,reward:0};
const fixtures=[
 {...base,gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:3},{id:'gate-b',color:'blue',side:'right',offset:0,size:3,frozen:1}],blocks:[{id:'a',x:0,y:0,shape:[[0,0],[0,1]],color:'red',movementAxis:'vertical'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},{id:'c',x:2,y:2,shape:[[0,0]],color:'blue',frozen:1,shutterId:'cover-c'}],shutters:[{id:'cover-c',x:2,y:2,width:1,height:1,count:1}]},
 {...base,gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:3},{id:'gate-b',color:'blue',side:'right',offset:0,size:3,frozen:1}],blocks:[{id:'a',x:0,y:0,shape:[[0,0],[1,0]],color:'blue',layers:['blue','red'],movementAxis:'horizontal'},{id:'b',x:1,y:1,shape:[[0,0]],color:'red'},{id:'c',x:1,y:2,shape:[[0,0],[1,0]],color:'blue',frozen:1}]},
 {...base,gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:1},{id:'gate-b',color:'blue',side:'bottom',offset:0,size:1}],blocks:[{id:'a',x:0,y:1,shape:[[0,0],[1,0]],color:'red'},{id:'b',x:2,y:0,shape:[[0,0],[0,1]],color:'blue'},{id:'c',x:0,y:0,shape:[[0,0]],color:'blue'}]}
];
const lower=structuredClone(fixtures[0]);lower.width=5;lower.height=12;lower.playable=Array.from({length:9},(_,i)=>[2+i%3,9+Math.floor(i/3)]);for(const b of lower.blocks){b.x+=2;b.y+=9;}lower.shutters[0].x+=2;lower.shutters[0].y+=9;lower.gates[0].offset=2;lower.gates[1].offset=9;fixtures.push(lower);
const padded={...base,width:8,height:8,playable:[...Array.from({length:28},(_,i)=>[i%4,1+Math.floor(i/4)]),...Array.from({length:8},(_,i)=>[4+i%4,Math.floor(i/4)])],gates:[{id:'gate-r',color:'red',side:'top',offset:4,size:4},{id:'gate-b',color:'blue',side:'right',offset:0,size:2}],blocks:[...Array.from({length:28},(_,i)=>({id:'padding'+i,x:i%4,y:1+Math.floor(i/4),shape:[[0,0]],color:'red',frozen:90})),{id:'live28',x:4,y:0,shape:[[0,0]],color:'blue',layers:['blue','red']},{id:'live29',x:5,y:0,shape:[[0,0]],color:'red',movementAxis:'vertical'},{id:'live30',x:6,y:0,shape:[[0,0]],color:'red',movementAxis:'vertical'},{id:'live31',x:7,y:0,shape:[[0,0]],color:'blue',movementAxis:'horizontal'}]};fixtures.push(padded);
const rows=[];let nativeExeHash;
for(const [fixture,l]of fixtures.entries()){
 const c=compile(l,api),states=[c.initial],index=new Map([[key(c.initial),0]]),edges=[];let transitions=0;
 for(let i=0;i<states.length;i++){assert(states.length<20000,'Qualification graph cap');const s=states[i],out=[];each(c,s,(bi,v,cost)=>{const t=s.slice();t[bi]=v;const k=key(t);let j=index.get(k);if(j===undefined){j=states.length;index.set(k,j);states.push(t);}out.push([j,cost]);transitions++;});edges.push(out);}
 const native=checkNativePrunedFloor(l,api,{successorsOnly:true,states,maxMilliseconds:10000,maxStates:50000});assert(native.rows);assert.equal(native.rows.length,states.length);nativeExeHash=native.exeHash;
 for(const [i,s]of states.entries()){
  const n=normalize(c,s).s,row=native.rows[i],successors=new Set();each(c,s,(bi,v,cost)=>{const t=s.slice();t[bi]=v;successors.add(cost+':'+stateText(canonical(c,normalize(c,t).s)));});
  assert.equal(row.state,stateText(s));assert.equal(row.normalized,stateText(n));assert.equal(row.canonical,stateText(canonical(c,n)));assert.deepEqual([...row.successors].sort(),[...successors].sort(),`fixture${fixture} state${i} successor mismatch`);
 }
 const distance=states.map(s=>clearCount(c,s)===c.total?0:Infinity);let changed=true;while(changed){changed=false;for(let i=0;i<states.length;i++)for(const[j,cost]of edges[i])if(distance[j]+cost<distance[i]){distance[i]=distance[j]+cost;changed=true;}}
 for(let i=0;i<states.length;i++)assert.equal(distance[i],distance[index.get(key(normalize(c,states[i]).s))]);
 const floor=Number.isFinite(distance[0])?distance[0]+1:2,js=checkAxisFloor(l,api,{floor,maxStates:50000,maxMilliseconds:10000}),proof=checkNativePrunedFloor(l,api,{floor,maxStates:50000,maxMilliseconds:10000});assert.equal(proof.status,js.status);assert.equal(proof.thresholdProven,js.thresholdProven);if(Number.isFinite(distance[0]))assert.equal(proof.relaxedNonClearingDrags,distance[0]);
 const thresholdChecks=[];for(let threshold=1;threshold<=4;threshold++){const expected=distance[0]>=threshold,p=checkNativePrunedFloor(l,api,{floor:threshold,maxStates:50000,maxMilliseconds:10000});assert.equal(p.thresholdProven,expected);assert.notEqual(p.status,'unknown');if(!expected)assert.equal(p.relaxedNonClearingDrags,distance[0]);thresholdChecks.push({threshold,thresholdProven:p.thresholdProven});}
 rows.push({fixture,cells:l.width*l.height,bodies:l.blocks.length,states:states.length,transitions,everyNormalizedSuccessorMatches:true,everyNormalizationAndCanonicalKeyMatches:true,everyStateOptimumPreserved:true,optimum:Number.isFinite(distance[0])?distance[0]:null,thresholdChecks,nativeInput:native.input,nativeOutput:native.output});
}
const limited=checkNativePrunedFloor(fixtures[2],api,{floor:2,maxStates:1,maxMilliseconds:1000});assert.equal(limited.status,'unknown');assert(!limited.thresholdProven);
const large=structuredClone(fixtures[0]);large.width=9;large.height=9;assert.equal(checkNativePrunedFloor(large,api).status,'unsupported');
const files=[SOURCE,WRAPPER,import.meta.filename,'tools/remake131to140-axis-floor-v172.mjs','deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs'];
const report={passed:true,scope:'Exact native implementation of the independently qualified JS optional-exit axis/countdown graph; only≤64cells/≤32bodies',rows,nativeExeHash,budgetExhaustionNeverProven:true,unsupportedNeverProven:true,bindings:Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))]))};const file=`${OUT}/qualification-pruned-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:true,rows:rows.map(({nativeInput,nativeOutput,...r})=>r)}));

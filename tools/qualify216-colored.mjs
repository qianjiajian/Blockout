import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadSpatialApi,compileSpatial,each,key,assertStateMatches,replayDomain,searchSpatial} from './continuation211-colored-witness.mjs';
import {proveSymmetric} from './continuation211-colored-proof.mjs';
const api=await loadSpatialApi(),results=[];
for(let mode=0;mode<12;mode++){
 const level={id:93216+mode,name:'static-color-floor-qualification',mechanismRules:'revised-2026-09-27-v1.5',difficulty:'normal',width:3,height:3,timeSeconds:120,reward:20,gates:[{id:'gate-r',side:'top',offset:0,size:3,color:'red',...(mode&1?{frozen:1}:{})},{id:'gate-b',side:'bottom',offset:0,size:3,color:'blue'}],coloredGrids:[{id:'grid',color:mode&2?'red':'blue',cells:[[1,1]]}],blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'blue'},{id:'b',x:2,y:0,shape:[[0,0],[0,1]],color:'red'},{id:'c',x:1,y:2,shape:[[0,0]],color:'red'},{id:'h',x:0,y:1,shape:[[0,0]],color:'blue',...(mode&4?{shutterId:'s'}:{})}],...(mode&4?{shutters:[{id:'s',x:0,y:1,width:1,height:1,count:1}]}:{})};
 const c=compileSpatial(level,api),states=[{s:c.initial,drags:[]}],seen=new Set([key(c.initial)]);let transitions=0;
 for(let i=0;i<states.length;i++){
  const row=states[i];replayDomain(c,row.drags,api);
  each(c,row.s,(s,cost,get)=>{transitions++;const sk=key(s);if(!seen.has(sk)){seen.add(sk);states.push({s,drags:[...row.drags,get()]});}});assert(states.length<20000);
 }
 for(let floor=1;floor<=3;floor++){
  const raw=searchSpatial(level,api,{floor,prove:true,maxMilliseconds:6000,maxStates:50000}),normalized=proveSymmetric(level,api,{floor,maxMilliseconds:6000,maxStates:50000,normalizeMonotone:true});
  assert(['threshold-proven','relaxed-shortcut'].includes(raw.status));assert.equal(normalized.status,raw.status);if(raw.cost!==undefined)assert.equal(normalized.cost,raw.cost);
 }
 results.push({mode,states:states.length,transitions,status:'PASS'});
}
const report={status:'PASS',domain:'Immutable colored floor restricts legal poses; all blocks have one color stage; otherwise the qualified ordinary-cover monotone domain.',theorem:'Colored-grid legality depends solely on each fixed-color body pose. Full-body removals do not change any grid or another body color. The ordinary-cover exchange argument is unchanged. Compile enumerates exactly all permitted footprints; every reachable tiny-graph transition is cross-checked with PuzzleModel.',results,codeSha256:Object.fromEntries(['tools/continuation211-colored-witness.mjs','tools/continuation211-colored-proof.mjs','tools/qualify216-colored.mjs'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))};
fs.writeFileSync('deliverables/continue211-220-20260930/design216-new/colored-qualification.json',JSON.stringify(report,null,2));console.log({status:report.status,cases:results.length,states:results.reduce((n,r)=>n+r.states,0)});


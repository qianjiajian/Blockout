import test from 'node:test';import assert from 'node:assert/strict';
import {loadApi} from './remake111to120-v146.mjs';
import {compile114,each114} from '../deliverables/remake111-120-v146-20260924/agent119-120/114/domain114.mjs';
const {api}=await loadApi(),key=s=>String.fromCharCode(...s);
const state=(c,m)=>{const a=m.snapshot();return Uint16Array.from(c.blocks.map(b=>{const v=a.blocks.find(x=>x.id===b.id);return v?(v.y*c.W+v.x)|((b.layers.length-v.layers.length)<<7):a.queuedBlocks.some(x=>x.id===b.id)?510:511;}));};
// Independent closure enumerates every real unit step and all four real exits,
// including holding past a matching contact. It never calls the compiled edges.
function actualGestures(c,model){const out=new Map();for(const b of model.snapshot().blocks){const first=model.clone();first.beginAction();const nodes=[{m:first,path:[]}],seen=new Set([key(state(c,first))]);
 const restore=path=>{const n=model.clone();n.beginAction();for(const p of path)assert(n.moveBlockStep(b.id,...p));return n;};
 for(let at=0;at<nodes.length;at++){const {m,path}=nodes[at],a=m.snapshot().blocks.find(x=>x.id===b.id);if(!a)continue;
  for(const side of ['top','right','bottom','left']){const n=restore(path);if(n.tryExit(b.id,side).ok){assert(n.commitAction());out.set(key(state(c,n))+'/0',n);}}
  if(at){const n=restore(path);if(n.commitAction())out.set(key(state(c,n))+'/1',n);}
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=m.clone(),p=[a.x+dx,a.y+dy];n.beginAction();if(!n.moveBlockStep(b.id,...p))continue;const k=key(state(c,n));if(!seen.has(k)){seen.add(k);nodes.push({m:n,path:[...path,p]});}}
 }}return out;}
test('complete real held-gesture successor sets equal compiled mixed FIFO sets',t=>{
 const l={id:114,name:'independent full mixed inventory',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'normal',width:3,height:3,timeSeconds:90,reward:20,
 gates:[{id:'gr',color:'red',side:'left',offset:0,size:2},{id:'gb',color:'blue',side:'right',offset:0,size:2},{id:'gs',color:'blue',side:'top',offset:1,size:1,star:true,frozen:1}],
 generators:[{id:'gen',side:'bottom',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,2],queueBlockIds:['cargo']}],
 blocks:[{id:'carrier',x:1,y:2,color:'red',shape:[[0,0]],keyId:'key'},{id:'lock',x:0,y:0,color:'blue',shape:[[0,0]],lockedBy:'key',lockCount:1},{id:'cargo',x:1,y:2,color:'blue',shape:[[0,0]],star:true}]};
 const c=compile114(l,api),initial=new api.PuzzleModel(l);initial.startCountdown();const nodes=[initial],seen=new Set([key(state(c,initial))]);let edges=0;
 for(let at=0;at<nodes.length;at++){assert(nodes.length<10000);const actual=actualGestures(c,nodes[at]),compiled=new Set();each114(c,state(c,nodes[at]),(s,cost)=>compiled.add(key(s)+'/'+cost),0,true);assert.deepEqual(compiled,new Set(actual.keys()));edges+=actual.size;
  for(const m of actual.values()){const k=key(state(c,m));if(!seen.has(k)){seen.add(k);nodes.push(m);}}
 }t.diagnostic(`${nodes.length} full real states / ${edges} complete real successors`);
});

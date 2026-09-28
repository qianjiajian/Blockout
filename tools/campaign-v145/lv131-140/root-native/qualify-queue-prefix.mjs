import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadModelApi} from '../../../remake131to140-model-api.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {projectQueueFreePrefix} from '../agent139-140/queue-prefix.mjs';
Error.stackTraceLimit=0;
const api=await loadModelApi(),steps=[[1,0],[-1,0],[0,1],[0,-1]],sides=['top','right','bottom','left'];
function fixture(K,shell=false,axis=false){return {id:139,name:'queue prefix qualification',difficulty:'normal',width:3,height:2,timeSeconds:100,reward:0,mechanismRules:'revised-2026-09-23-v1.4',
 gates:[{id:'red',color:'red',side:'left',offset:0,size:1},{id:'yellow',color:'yellow',side:'bottom',offset:2,size:1},{id:'blue',color:'blue',side:'right',offset:0,size:2,frozen:K},{id:'green',color:'green',side:'bottom',offset:0,size:2,frozen:K}],
 shutters:[{id:'cover',x:0,y:1,width:2,height:1,count:K}],
 generators:[{id:'gen',side:'top',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,0],queueBlockIds:['q0','q1']}],
 blocks:[{id:'a',x:0,y:0,shape:[[0,0],[1,0]],color:'red',...(shell?{layers:['red','yellow']}:{})},{id:'b',x:2,y:0,shape:[[0,0]],color:'yellow',...(axis?{movementAxis:'vertical'}:{})},{id:'c',x:0,y:1,shape:[[0,0],[1,0]],color:'green',shutterId:'cover',frozen:2},{id:'d',x:2,y:1,shape:[[0,0]],color:'yellow'},{id:'q0',x:1,y:0,shape:[[0,0]],color:'blue'},{id:'q1',x:1,y:0,shape:[[0,0]],color:'green'}]};}
const world=m=>{const s=m.snapshot();return JSON.stringify([s.blocks,s.queuedBlocks,s.gates,s.shutters,s.generators,s.cleared,s.complete]);};
function apply(m,d){const n=m.clone();n.beginAction();for(const p of d.path)assert(n.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(n.tryExit(d.blockId,d.exitSide).ok);assert(n.commitAction());return n;}
function gestures(m,visit){for(const b of m.snapshot().blocks){if(!m.isBlockActive(m.getBlock(b.id)))continue;const nodes=[{m,path:[]}],seen=new Set([world(m)]);for(let at=0;at<nodes.length;at++){const n=nodes[at];if(at>0)visit({blockId:b.id,path:n.path});for(const side of sides){const k=n.m.clone();k.beginAction();if(k.tryExit(b.id,side).ok)visit({blockId:b.id,path:n.path,exitSide:side});}const pos=n.m.getBlock(b.id);for(const [dx,dy]of steps){const k=n.m.clone();k.beginAction();const p=[pos.x+dx,pos.y+dy];if(!k.moveBlockStep(b.id,...p))continue;const key=world(k);if(seen.has(key))continue;seen.add(key);nodes.push({m:k,path:[...n.path,p]});}}}}
function aligned(a,b,queue){a=a.snapshot();b=b.snapshot();assert.equal(a.cleared,b.cleared);const retained=s=>s.blocks.filter(x=>!queue.has(x.id)).map(x=>[x.id,x.x,x.y,x.layers,x.frozen,x.hidden]).sort((x,y)=>x[0].localeCompare(y[0]));assert.deepEqual(retained(a),retained(b));assert.deepEqual(a.gates,b.gates);assert.deepEqual(a.shutters,b.shutters);}
const rows=[];
for(const [K,shell,axis]of [[1,false,false],[2,false,false],[2,true,false],[2,false,true]]){
 const l=fixture(K,shell,axis),p=projectQueueFreePrefix(l,api,K),queue=new Set(p.removedQueueIds),a=new api.PuzzleModel(l),b=new api.PuzzleModel(p.level);a.startCountdown();b.startCountdown();const nodes=[{a,b}],seen=new Set([world(a)]);let edges=0,stutters=0,unitSteps=0,goals=0;
 for(let at=0;at<nodes.length;at++){assert(nodes.length<20000,'Fixture exceeds finite full-graph cap');const {a,b}=nodes[at];aligned(a,b,queue);if(a.snapshot().cleared===K){goals++;continue;}
  gestures(a,d=>{const queued=queue.has(d.blockId),ar=apply(a,d),br=queued?b:apply(b,d);assert(ar.snapshot().cleared<=K);if(queued){assert(!d.exitSide,'No queue can clear before prefix goal');stutters++;}aligned(ar,br,queue);assert(Number(br.snapshot().cleared===b.snapshot().cleared&&!queued)<=Number(ar.snapshot().cleared===a.snapshot().cleared));
   const au=a.clone(),bu=b.clone();au.beginAction();if(!queued)bu.beginAction();for(const step of d.path){assert(au.moveBlockStep(d.blockId,...step));if(!queued)assert(bu.moveBlockStep(d.blockId,...step));aligned(au,bu,queue);unitSteps++;}edges++;const k=world(ar);if(!seen.has(k)){seen.add(k);nodes.push({a:ar,b:br});}
  });
 }assert(goals>0,JSON.stringify({K,shell,axis,states:seen.size}));rows.push({K,shell,axis,states:seen.size,edges,stutters,unitSteps,goals,exhausted:true});
}
const rejected=[];for(const [name,mutate]of [['early-queue-gate',l=>{l.gates[2].frozen=1;}],['queue-shell',l=>{l.blocks[4].layers=['blue','green'];}],['queue-outer-color-mismatch',l=>{l.blocks[4].layers=['yellow'];}],['queue-star',l=>{l.blocks[4].star=true;}],['timed-machine',l=>{l.generators[0].trigger='time';}],['flip-gate',l=>{l.gates[2].flip=true;}]] ){
 const l=fixture(2);mutate(l);assert.throws(()=>projectQueueFreePrefix(l,api,2),name);rejected.push(name);
}
assert(rows.some(r=>r.stutters>0));
const modelInputs=Object.keys((await build({entryPoints:['src/core/PuzzleModel.ts'],bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'})).metafile.inputs);
const files=[import.meta.filename,'tools/campaign-v145/lv131-140/agent139-140/queue-prefix.mjs','tools/campaign-v145/lv131-140/agent136-138/prepaid-queue-floor.mjs',...modelInputs];const report={passed:true,scope:'All pre-goal real-model gestures and unit steps map with unchanged retained state and no greater cost; stop at K exactly',rows,rejected,bindings:Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))]))};const file='deliverables/remake131-140-v146-20260924/root-native/qualification-queue-prefix-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,...report}));

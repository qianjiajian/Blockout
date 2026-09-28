import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadModelApi} from '../../../remake131to140-model-api.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {checkDisjointStationaryCuts} from './stationary-disjoint-cuts.mjs';
const api=await loadModelApi(),dirs=[[1,0],[-1,0],[0,1],[0,-1]],sides=['top','right','bottom','left'];
const base={id:139,name:'disjoint cut qualification',difficulty:'normal',mechanismRules:'revised-2026-09-23-v1.4',width:2,height:3,timeSeconds:100,reward:0,gates:[{id:'p',side:'top',offset:0,size:2,color:'purple'},{id:'r',side:'bottom',offset:0,size:2,color:'red',frozen:2}],blocks:[{id:'target',x:0,y:2,shape:[[0,0]],color:'purple'},{id:'a',x:0,y:1,shape:[[0,0]],color:'red'},{id:'b',x:1,y:1,shape:[[0,0]],color:'red'},{id:'q',x:1,y:2,shape:[[0,0]],color:'purple'}],generators:[{id:'gen',side:'right',offset:2,rimSpan:3,rimMount:'rim',spawn:[1,2],queueBlockIds:['q']}]};
base.generators[0].offset=1;base.generators[0].spawn=[1,1];
const pair=[{targetId:'target',blockerIds:['a','b']}];
const axis=structuredClone(base);axis.blocks[1].movementAxis='vertical';
const double=structuredClone(base);delete double.generators;double.height=4;double.gates[1].frozen=1;double.blocks=double.blocks.filter(b=>b.id!=='q');double.blocks[0].y=3;double.blocks.push({id:'c',x:0,y:2,shape:[[0,0]],color:'red'},{id:'d',x:1,y:2,shape:[[0,0]],color:'red'});
const dual=structuredClone(base);delete dual.generators;dual.blocks[3].id='target2';
const cases=[['true FIFO',base,pair],['axis',axis,pair],['two disjoint cuts',double,[...pair,{targetId:'target',blockerIds:['c','d']}]],['two targets',dual,pair]];
const world=m=>{const s=m.snapshot();return JSON.stringify([s.blocks,s.queuedBlocks,s.gates,s.shutters,s.generators,s.cleared,s.complete]);};
function apply(m,d){const n=m.clone();n.beginAction();for(const p of d.path)assert(n.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(n.tryExit(d.blockId,d.exitSide).ok);assert(n.commitAction());return n;}
function gestures(m,visit){for(const b of m.snapshot().blocks){if(!m.isBlockActive(m.getBlock(b.id)))continue;const nodes=[{m,path:[]}],seen=new Set([world(m)]);for(let at=0;at<nodes.length;at++){const n=nodes[at];if(at>0)visit({blockId:b.id,path:n.path});for(const side of sides){const k=n.m.clone();k.beginAction();if(k.tryExit(b.id,side).ok)visit({blockId:b.id,path:n.path,exitSide:side});}const pos=n.m.getBlock(b.id);for(const [dx,dy]of dirs){const k=n.m.clone();k.beginAction();const p=[pos.x+dx,pos.y+dy];if(!k.moveBlockStep(b.id,...p))continue;const key=world(k);if(seen.has(key))continue;seen.add(key);nodes.push({m:k,path:[...n.path,p]});}}}}
const rows=[];
for(const [name,level,cuts]of cases){
 const proof=checkDisjointStationaryCuts(level,api,{floor:cuts.length,cuts});assert(proof.thresholdProven,JSON.stringify(proof));
 const m=new api.PuzzleModel(level);m.startCountdown();const nodes=[m],seen=new Map([[world(m),0]]),edges=[],began=Date.now();let transitions=0;
 for(let i=0;i<nodes.length;i++){
  assert(nodes.length<30000&&Date.now()-began<60000,'Finite qualification budget; incomplete is not PASS');
  const s=nodes[i].snapshot(),out=[];if(s.cleared<proof.contract.goalClears)gestures(nodes[i],d=>{const n=apply(nodes[i],d),key=world(n),cost=Number(n.snapshot().cleared===s.cleared);let j=seen.get(key);if(j===undefined){j=nodes.length;seen.set(key,j);nodes.push(n);}out.push([j,cost,d.blockId]);transitions++;});edges.push(out);
 }
 const distance=nodes.map(m=>m.snapshot().cleared>=proof.contract.goalClears?0:Infinity);let changed=true;while(changed){changed=false;for(let i=0;i<nodes.length;i++)for(const [j,cost]of edges[i])if(distance[j]+cost<distance[i]){distance[i]=distance[j]+cost;changed=true;}}
 assert(Number.isFinite(distance[0]));assert(proof.provedObligations<=distance[0]);
 const cutChecks=[];for(const cut of cuts){const q=[0],visited=new Set(q);for(let i=0;i<q.length;i++)for(const [j,,id]of edges[q[i]])if(!cut.blockerIds.includes(id)&&!visited.has(j)){assert(nodes[j].snapshot().cleared<proof.contract.goalClears);visited.add(j);q.push(j);}cutChecks.push({cut,reachedStates:q.length,goalUnreachable:true});}
 rows.push({name,level,proof,states:nodes.length,transitions,exhausted:true,exactMinimumPrefixCost:distance[0],cutChecks});console.log(JSON.stringify({name,states:nodes.length,transitions,L:proof.provedObligations,exact:distance[0]}));
}
const rejected=[];
for(const [name,cuts]of [['overlap',[...pair,{targetId:'target',blockerIds:['a']}]],['duplicate in set',[{targetId:'target',blockerIds:['a','a']}]],['ordinary as blocker',[{targetId:'target',blockerIds:['q']}]],['queue as target',[{targetId:'q',blockerIds:['a','b']}]],['empty',[{targetId:'target',blockerIds:[]}]]]){assert.throws(()=>checkDisjointStationaryCuts(base,api,{floor:1,cuts}));rejected.push(name);}
const early=structuredClone(base);early.gates[1].frozen=1;assert.equal(checkDisjointStationaryCuts(early,api,{cuts:pair}).status,'unsupported');rejected.push('early frozen gate');
const reachable=checkDisjointStationaryCuts(base,api,{floor:1,cuts:[{targetId:'target',blockerIds:['a']}]});assert(!reachable.thresholdProven);rejected.push('insufficient singleton');
const inputs=Object.keys((await build({entryPoints:['src/core/PuzzleModel.ts'],bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'})).metafile.inputs);
const bindings=Object.fromEntries([import.meta.filename,'tools/campaign-v145/lv131-140/root-native/stationary-disjoint-cuts.mjs','tools/campaign-v145/lv131-140/root-native/stationary-queue-obligations.mjs',...inputs].map(p=>[p,digest(fs.readFileSync(p))]));
const file='deliverables/remake131-140-v146-20260924/root-native/qualification-disjoint-cuts-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({passed:true,scope:'Disjoint fixed obstacle sets with counted ordinary FIFO; complete real-model graphs and forbid-all-members reachability. Not a candidate acceptance.',rows,rejected,bindings},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:true,states:rows.reduce((n,r)=>n+r.states,0),transitions:rows.reduce((n,r)=>n+r.transitions,0)}));

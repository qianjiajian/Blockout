import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadModelApi} from '../../../remake131to140-model-api.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {checkStationaryObligations,validateObligationPrefix} from './stationary-obligations.mjs';
Error.stackTraceLimit=0;
const api=await loadModelApi(),dirs=[[1,0],[-1,0],[0,1],[0,-1]],sides=['top','right','bottom','left'];
const base={id:139,name:'stationary qualification',difficulty:'normal',mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,timeSeconds:100,reward:0,gates:[{id:'p',side:'left',offset:0,size:2,color:'purple'},{id:'r',side:'bottom',offset:0,size:3,color:'red',frozen:1}],blocks:[{id:'target',x:1,y:1,shape:[[0,0],[1,0],[0,1],[1,1]],color:'purple'},{id:'blocker',x:0,y:0,shape:[[0,0]],color:'red'}]};
const two=structuredClone(base);two.blocks.push({id:'blocker2',x:1,y:0,shape:[[0,0]],color:'red'});
const axis=structuredClone(base);axis.blocks[1].movementAxis='horizontal';
const zero=structuredClone(base);zero.blocks[0].shape=[[0,0]];zero.blocks[0].x=2;zero.blocks[0].y=0;zero.blocks[1].y=2;
const hidden=structuredClone(base);hidden.width=4;hidden.gates[1].size=3;hidden.shutters=[{id:'cover',x:3,y:0,width:1,height:3,count:1}];hidden.blocks.push({id:'hidden',x:3,y:0,shape:[[0,0],[0,1],[0,2]],color:'red',shutterId:'cover',frozen:2});
const queue=structuredClone(base);queue.height=4;queue.generators=[{id:'gen',side:'right',offset:1,rimSpan:3,rimMount:'rim',spawn:[2,1],queueBlockIds:['q0']}];queue.blocks.push({id:'q0',color:'red',x:2,y:1,shape:[[0,0]]});
const world=m=>{const s=m.snapshot();return JSON.stringify([s.blocks,s.queuedBlocks,s.gates,s.shutters,s.generators,s.cleared,s.complete]);};
function apply(m,d){const n=m.clone();n.beginAction();for(const p of d.path)assert(n.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(n.tryExit(d.blockId,d.exitSide).ok);assert(n.commitAction());return n;}
function gestures(m,visit){for(const b of m.snapshot().blocks){if(!m.isBlockActive(m.getBlock(b.id)))continue;const nodes=[{m,path:[]}],seen=new Set([world(m)]);for(let at=0;at<nodes.length;at++){const n=nodes[at];if(at>0)visit({blockId:b.id,path:n.path});for(const side of sides){const k=n.m.clone();k.beginAction();if(k.tryExit(b.id,side).ok)visit({blockId:b.id,path:n.path,exitSide:side});}const pos=n.m.getBlock(b.id);for(const [dx,dy]of dirs){const k=n.m.clone();k.beginAction();const p=[pos.x+dx,pos.y+dy];if(!k.moveBlockStep(b.id,...p))continue;const key=world(k);if(seen.has(key))continue;seen.add(key);nodes.push({m:k,path:[...n.path,p]});}}}}
const rows=[];
for(const [fixture,l]of [base,two,axis,zero,hidden,queue].entries()){
 const contract=validateObligationPrefix(l,api),proof=checkStationaryObligations(l,api,{floor:1}),m=new api.PuzzleModel(l);m.startCountdown();const nodes=[m],seen=new Map([[world(m),0]]),edges=[];let transitionCount=0;
 for(let i=0;i<nodes.length;i++){assert(nodes.length<20000,'Finite complete-graph qualification cap');const m=nodes[i],out=[];if(m.snapshot().cleared<contract.goalClears)gestures(m,d=>{const n=apply(m,d),key=world(n),cost=Number(n.snapshot().cleared===m.snapshot().cleared);let j=seen.get(key);if(j===undefined){j=nodes.length;seen.set(key,j);nodes.push(n);}out.push([j,cost]);transitionCount++;});edges.push(out);}
 const distance=nodes.map(m=>m.snapshot().cleared>=contract.goalClears?0:Infinity);let change=true;while(change){change=false;for(let i=0;i<nodes.length;i++)for(const [j,cost]of edges[i])if(distance[j]+cost<distance[i]){distance[i]=distance[j]+cost;change=true;}}
 assert(Number.isFinite(distance[0]));assert(proof.provedObligations<=distance[0]);if(fixture===0)assert.equal(proof.provedObligations,1);if(fixture===1)assert.equal(proof.provedObligations,2);if(fixture===3)assert.equal(proof.provedObligations,0);
 rows.push({fixture,states:nodes.length,transitions:transitionCount,exactMinimumPrefixCost:distance[0],provedObligations:proof.provedObligations,exhausted:true,proof});
}
const rejected=[];for(const [name,mutate]of [['early-other-color',l=>{delete l.gates[1].frozen;}],['shell',l=>{l.blocks[1].layers=['red','purple'];}],['single-layer-color-mismatch',l=>{l.blocks[1].layers=['purple'];}],['star',l=>{l.blocks[0].star=true;}],['more-opening-targets-than-gate-count',l=>{l.blocks.push({id:'target2',x:2,y:0,shape:[[0,0]],color:'purple'});}]] ){
 const l=structuredClone(base);mutate(l);assert.equal(checkStationaryObligations(l,api).status,'unsupported');rejected.push(name);
}
const earlyQueue=structuredClone(queue);earlyQueue.blocks.at(-1).color='purple';assert.equal(checkStationaryObligations(earlyQueue,api).status,'unsupported');rejected.push('early-ordinary-queue');
const modelInputs=Object.keys((await build({entryPoints:['src/core/PuzzleModel.ts'],bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'})).metafile.inputs);
const files=[import.meta.filename,'tools/campaign-v145/lv131-140/root-native/stationary-obligations.mjs',...modelInputs];const report={passed:true,scope:'Stationary-body theorem versus exact full real-model prefix graphs, including square exit footprints, multiple obligations, rectangular axis, hidden ice and automatic queue',rows,rejected,bindings:Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))]))};const file='deliverables/remake131-140-v146-20260924/root-native/qualification-stationary-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:true,rows:rows.map(({proof,...r})=>r),rejected}));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadModelApi} from '../../../remake131to140-model-api.mjs';
import {checkQueueStationaryObligations,validateQueueObligationPrefix} from '../root-native/stationary-queue-obligations.mjs';
Error.stackTraceLimit=0;
const api=await loadModelApi();
const S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],V3=[[0,0],[0,1],[0,2]];
const base={id:139,name:'Independent counted FIFO graph audit',difficulty:'normal',mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,timeSeconds:100,reward:0,gates:[{id:'p',side:'left',offset:0,size:1,color:'purple'},{id:'r',side:'right',offset:0,size:3,color:'red',frozen:3}],blocks:[{id:'target',x:1,y:2,shape:H2,color:'purple'},{id:'blocker',x:0,y:0,shape:S,color:'red'},{id:'qa',x:1,y:2,shape:S,color:'purple'},{id:'qb',x:1,y:0,shape:S,color:'purple'}],generators:[{id:'ga',side:'bottom',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,2],queueBlockIds:['qa']},{id:'gb',side:'top',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,0],queueBlockIds:['qb']}]};
const twoTargets=structuredClone(base);twoTargets.generators.pop();twoTargets.blocks=twoTargets.blocks.filter(b=>b.id!=='qb');twoTargets.blocks.push({id:'target2',x:0,y:2,shape:S,color:'purple'});twoTargets.blocks[1].movementAxis='horizontal';
const hidden={...structuredClone(base),gates:[{id:'p',side:'left',offset:0,size:2,color:'purple'},{id:'r',side:'bottom',offset:0,size:2,color:'red',frozen:2}],blocks:[{id:'target',x:1,y:1,shape:V2,color:'purple',frozen:1},{id:'blocker',x:0,y:0,shape:S,color:'red'},{id:'qa',x:1,y:0,shape:S,color:'purple'},{id:'hidden',x:2,y:0,shape:V3,color:'red',frozen:2,shutterId:'c'}],generators:[{id:'ga',side:'top',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,0],queueBlockIds:['qa']}],shutters:[{id:'c',x:2,y:0,width:1,height:3,count:2}]};
const key=m=>{const s=m.snapshot();return JSON.stringify({blocks:s.blocks,queued:s.queuedBlocks,gates:s.gates,shutters:s.shutters,generators:s.generators,cleared:s.cleared,complete:s.complete});};
const xy=[[1,0],[-1,0],[0,1],[0,-1]],sides=['left','right','top','bottom'];
function allGestures(m){
 const out=[];
 for(const body of m.snapshot().blocks){if(!m.isBlockActive(m.getBlock(body.id)))continue;
  const pending=[m.clone()],seen=new Set([key(m)]);
  for(let i=0;i<pending.length;i++){const p=pending[i];
   for(const side of sides){const n=p.clone();n.beginAction();if(n.tryExit(body.id,side).ok){assert(n.commitAction());out.push({model:n,body:body.id});}}
   const current=p.getBlock(body.id);
   for(const [dx,dy] of xy){const n=p.clone();n.beginAction();if(!n.moveBlockStep(body.id,current.x+dx,current.y+dy))continue;assert(n.commitAction());const k=key(n);if(seen.has(k))continue;seen.add(k);pending.push(n);out.push({model:n,body:body.id});}
  }
 }
 return out;
}
const rows=[];
for(const [name,level] of [['two independent machines / immediate queue',base],['two opening targets / additive blocker de-dup / axis',twoTargets],['frozen target / exactly K curtain / hidden ice',hidden]]){
 const contract=validateQueueObligationPrefix(level,api),proof=checkQueueStationaryObligations(level,api,{floor:1}),initial=new api.PuzzleModel(level);initial.startCountdown();
 const models=[initial],ids=new Map([[key(initial),0]]),edges=[],start=Date.now();let totalEdges=0;
 for(let at=0;at<models.length;at++){assert(models.length<30000,'state cap');assert(Date.now()-start<60000,'time cap');const current=models[at],s=current.snapshot(),out=[];
  if(s.cleared<contract.goalClears){const live=new Set([...s.blocks,...s.queuedBlocks].map(b=>b.id));assert(level.blocks.filter(b=>b.color!=='purple').every(b=>live.has(b.id)));assert(s.shutters.every(c=>!c.revealed));
   for(const {model:n,body} of allGestures(current)){const k=key(n);let next=ids.get(k);if(next===undefined){next=models.length;ids.set(k,next);models.push(n);}out.push([next,Number(n.snapshot().cleared===s.cleared),body]);totalEdges++;}
  }edges.push(out);
 }
 // Independent reverse relaxation computes exact minimum nonclearing gestures to K.
 const dist=models.map(m=>m.snapshot().cleared>=contract.goalClears?0:Infinity);let changed=true;
 while(changed){changed=false;for(let i=0;i<edges.length;i++)for(const [j,cost]of edges[i])if(dist[j]+cost<dist[i]){dist[i]=dist[j]+cost;changed=true;}}
 assert(Number.isFinite(dist[0]));assert(proof.provedObligations>=1);assert(dist[0]>=proof.provedObligations);
 const frozenChecks=[];
 for(const ob of proof.obligations){const seen=new Set([0]),pending=[0];for(let at=0;at<pending.length;at++){assert(models[pending[at]].snapshot().cleared<contract.goalClears);for(const [j,,body]of edges[pending[at]])if(body!==ob.blockerId&&!seen.has(j)){seen.add(j);pending.push(j);}}frozenChecks.push({blocker:ob.blockerId,reachedStates:pending.length,goalUnreachable:true});}
 const row={name,level,states:models.length,edges:totalEdges,goal:contract.goalClears,minimum:dist[0],obligations:proof.provedObligations,exhausted:true,elapsedMs:Date.now()-start,frozenChecks,proof};rows.push(row);console.log(JSON.stringify({name,states:row.states,edges:row.edges,K:row.goal,optimum:row.minimum,L:row.obligations}));
}
const rejects=[];
for(const [name,change]of [['queue actual-layer mismatch',l=>l.blocks[2].layers=['red']],['time-driven queue',l=>{l.generators[0].trigger='time';l.generators[0].intervalSeconds=1;}],['unaccounted shell event',l=>l.blocks[0].layers=['purple','purple']],['nonordinary release at K-1',l=>l.gates[1].frozen=2]]){const l=structuredClone(base);change(l);assert.equal(checkQueueStationaryObligations(l,api).status,'unsupported');rejects.push(name);}
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const proofFile='tools/campaign-v145/lv131-140/root-native/stationary-queue-obligations.mjs';
const report={passed:true,scope:'Independent actual PuzzleModel complete prefix graphs and per-claimed-body fixed-gesture counterexample search, not a level solution or Pointer validation.',rows,rejects,bindings:{[proofFile]:hash(proofFile),[import.meta.filename]:hash(import.meta.filename),'src/core/PuzzleModel.ts':hash('src/core/PuzzleModel.ts')}};
const file='deliverables/remake131-140-v146-20260924/agent139-140/independent-counted-fifo-audit139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:true,states:rows.reduce((n,r)=>n+r.states,0),edges:rows.reduce((n,r)=>n+r.edges,0)}));

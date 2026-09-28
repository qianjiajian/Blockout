import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT as OUTPUT,ruleGate,loadApi} from './common.mjs';
const {api}=await loadApi();
const projection=l=>l;ruleGate();
import {digest} from '../revised-preview-validation-v160.mjs';
Error.stackTraceLimit=2;
for(const input of process.argv.slice(2)){
 const d=JSON.parse(fs.readFileSync(input)),level=projection(d.level),drags=d.drags,cases=[];
 function apply(m,r){m.beginAction();for(const p of r.path)assert(m.moveBlockStep(r.blockId,...p));if(r.exitSide)assert(m.tryExit(r.blockId,r.exitSide).ok);assert(m.commitAction());}
 function model(route,l=level){const m=new api.PuzzleModel(l);m.startCountdown();for(const r of route)apply(m,r);return m;}
 const m=model([]);
 for(let i=0;i<drags.length&&cases.length<2;i++){
  const correct=drags[i],prefix=drags.slice(0,i),before=m.snapshot(),pr=api.replayRevisedRoute(level,prefix);
  outer:for(const b of before.blocks.filter(b=>b.id!==correct.blockId&&b.shape.length>1))for(const[dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){
   if(!correct.path.length)continue;
   const wrong={blockId:b.id,path:[[b.x+dx,b.y+dy]]},r=api.replayRevisedRoute(level,[...prefix,wrong]);if(!r.valid||r.clearEvents!==pr.clearEvents)continue;
   const rs=JSON.parse(r.finalStateKey),ps=JSON.parse(pr.finalStateKey),rb=rs.blocks.find(x=>x.id===b.id);rb.x=b.x;rb.y=b.y;if(JSON.stringify(rs)!==JSON.stringify(ps))continue;
   const fork=model([...prefix,wrong]);let collision;fork.beginAction();
   for(const[unit,to]of correct.path.entries()){const a=fork.getBlock(correct.blockId),from=[a.x,a.y];if(!fork.moveBlockStep(a.id,...to)){const parked=fork.getBlock(b.id),occupied=new Set(parked.shape.map(([x,y])=>[parked.x+x,parked.y+y].join(','))),overlap=a.shape.map(([x,y])=>[to[0]+x,to[1]+y]).filter(p=>occupied.has(p.join(',')));if(overlap.length)collision={unit,from,to,overlap};break;}}
   if(!collision)continue;const clean=model(prefix);clean.beginAction();for(const p of correct.path.slice(0,collision.unit+1))assert(clean.moveBlockStep(correct.blockId,...p));
   const restore={blockId:b.id,path:[[b.x,b.y]]},recovered=api.replayRevisedRoute(level,[...prefix,wrong,restore]);if(!recovered.valid||recovered.finalStateKey!==pr.finalStateKey)continue;
   const full=[...prefix,wrong,restore,...drags.slice(i)],complete=api.replayRevisedRoute(level,full);if(!complete.valid||!complete.complete)continue;
   const timed=new api.PuzzleModel(d.level);timed.startCountdown();let seconds=0;const tick=t=>{timed.tick(t);seconds+=t;};for(const r of full){tick(.35);timed.beginAction();for(const p of r.path){tick(.06);assert(timed.moveBlockStep(r.blockId,...p));}if(r.exitSide)assert(timed.tryExit(r.blockId,r.exitSide).ok);assert(timed.commitAction());tick(.45);}assert(timed.snapshot().complete&&!timed.snapshot().failed);
   cases.push({beforeDrag:i+1,wrongParking:wrong,wrongBlockArea:b.shape.length,blockedOtherBlock:correct.blockId,physicalCollision:collision,recovery:restore,restoresExactSpatialState:true,completeRecoveredRoute:full,positiveTimedModelSeconds:seconds,naturalClockEvidence:false});break outer;
  }
  apply(m,correct);
 }
 assert(cases.length>=1,`No physical parking consequence found for ${d.level.id}`);
 const out=OUTPUT+'/decisions'+d.level.id+'-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify({passed:true,input,levelSha256:digest(d.level),routeSha256:digest(drags),cases,humanBlindTested:false,globalDeadEndProven:false},null,2),{flag:'wx'});console.log(JSON.stringify({out,id:d.level.id,cases:cases.length}));
}

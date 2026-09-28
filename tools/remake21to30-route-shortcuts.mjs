// Witness optimization only. Never a minimum-move certificate or timer test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,BASELINE,checkCandidate} from './remake21to30-v120.mjs';
const directions=[[0,-1],[1,0],[0,1],[-1,0]],key=p=>p.join(',');

export function shortenRoute(level,original,api){
  assert(api.replayRevisedRoute(level,original).complete,'Input must have a complete checked witness');
  for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors','seams'])assert(!level[k]?.length,'Static gesture domain only');
  assert(level.blocks.every(b=>!b.movementAxis&&!b.star&&!b.lockedBy&&!b.keyId&&b.timedBombSeconds===undefined));
  const model=new api.PuzzleModel(level);model.startCountdown();
  let goals=original.map(d=>{
    const b=model.getBlock(d.blockId),goal=d.path.at(-1)??[b.x,b.y];
    model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());
    return {blockId:d.blockId,goal,...(d.exitSide?{exitSide:d.exitSide}:{})};
  });
  function rebuild(plan){
    const m=new api.PuzzleModel(level);m.startCountdown();const route=[];
    for(const target of plan){
      const b=m.getBlock(target.blockId);if(!b)return null;
      if(!target.exitSide&&b.x===target.goal[0]&&b.y===target.goal[1])continue;
      if(!m.isBlockActive(b))return null;
      const snap=m.snapshot(),start=[b.x,b.y],startKey=key(start),parent=new Map([[startKey,null]]),positions=new Map([[startKey,start]]),queue=[start];
      const auto=(at,previous)=>{
        const p={...b,x:at[0],y:at[1]},foot=p.shape.map(([dx,dy])=>[p.x+dx,p.y+dy]);
        const sides=snap.gates.filter(g=>g.color===p.layers[0]&&!g.frozen&&api.matchingPortalForExitFrontier(snap,foot,g)).map(g=>g.side);
        const candidates=api.matchingContinuousExitPortals(snap,p,sides),[gx,gy]=p.shape[0];
        const inferred=previous?(p.x<previous[0]?'left':p.x>previous[0]?'right':p.y<previous[1]?'top':p.y>previous[1]?'bottom':undefined):undefined;
        return api.choosePortalReleaseCandidate(candidates,{x:p.x+gx+.5,y:p.y+gy+.5},{innerX:0,innerY:0,innerWidth:snap.width,innerHeight:snap.height,cell:1},inferred)?.portal.side;
      };
      let found;
      for(let i=0;i<queue.length;i++){
        const at=queue[i],k=key(at),previous=positions.get(parent.get(k)),exit=auto(at,previous);
        if(k===key(target.goal)&&exit===target.exitSide){found=k;break;}
        if(exit)continue;
        for(const [dx,dy]of directions){const next=[at[0]+dx,at[1]+dy],nk=key(next);if(parent.has(nk)||!m.canPlace(b,...next))continue;parent.set(nk,k);positions.set(nk,next);queue.push(next);}
      }
      if(found===undefined)return null;
      const points=[];for(let k=found;k!==startKey;k=parent.get(k))points.push(positions.get(k));points.reverse();
      const drag={blockId:b.id,path:points,...(target.exitSide?{exitSide:target.exitSide}:{})};
      m.beginAction();for(const p of points)if(!m.moveBlockStep(b.id,...p))return null;
      if(drag.exitSide&&!m.tryExit(b.id,drag.exitSide).ok)return null;
      if(!m.commitAction())return null;route.push(drag);
    }
    if(!m.snapshot().complete)return null;
    const checked=api.replayRevisedRoute(level,route);return checked.valid&&checked.complete?route:null;
  }
  let route=rebuild(goals)??original,changed=true,attempts=0;
  while(changed){changed=false;for(let i=0;i<goals.length;i++){
    if(goals[i].exitSide)continue;attempts++;
    const next=goals.filter((_,n)=>n!==i),candidate=rebuild(next);
    if(candidate&&candidate.length<route.length){goals=next;route=candidate;changed=true;break;}
  }}
  const replay=api.replayRevisedRoute(level,route);assert(replay.valid&&replay.complete);
  return {drags:route,replay,optimization:{method:'remove-waypoint-and-rebuild-continuous-input-goals',attempts,originalDrags:original.length,finalDrags:route.length,optimalityClaimed:false}};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
  for(const input of process.argv.slice(2)){
    const data=JSON.parse(fs.readFileSync(input));checkCandidate(data,baseline,api);
    const optimized=shortenRoute(data.level,data.drags,api),output=`.codex-temp/remake21-30-v120/root-optimized/lv${data.level.id}-${Date.now()}.json`;
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({...data,...optimized,optimizedFrom:input},null,2));
    console.log(JSON.stringify({id:data.level.id,output,...optimized.optimization,nonClearingDrags:optimized.replay.nonClearingDrags}));
  }
}

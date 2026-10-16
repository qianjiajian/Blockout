import {occupied,active,settle,NONE} from './continuation211-optional-lift-domain.mjs';
// The optional-lift domain has no movement-triggered automatic changes.
// During one held drag all other occupancy and ice therefore stay constant.
// This is the same final-body-removal closure, using a pose BFS instead of
// cloning the entire world at every intermediate cell. Never peels shells.
export function normalizeFast(c,start){
 let s=start;const drags=[];
 for(;;){let selected=false;
  for(let i=0;i<c.N;i++){
   const b=c.blocks[i],stage=s[i]>>>7;if(!active(c,s,i)||stage!==b.layers.length-1)continue;
   const occ=occupied(c,s,i),count=c.blocks.reduce((n,b,j)=>n+(s[j]===NONE?b.layers.length:s[j]>>>7),0),initial=s[i]&127;
   const queue=[initial],parents=new Int16Array(128).fill(-2);parents[initial]=-1;let end,side;
   for(let j=0;j<queue.length;j++){
    const p=queue[j],pose=b.poses[p],exit=pose.exits[stage].find(ex=>count>=(ex.gate.frozen??0));
    if(exit){end=p;side=exit.side;break;}
    for(const q of pose.neighbors){if(parents[q]!==-2||b.poses[q].mask.some((v,k)=>v&occ[k]))continue;parents[q]=p;queue.push(q);}
   }
   if(end===undefined)continue;
   const path=[];for(let p=end;parents[p]>=0;p=parents[p])path.push([p%c.W,Math.floor(p/c.W)]);
   const next=s.slice();next[i]=NONE;settle(c,next);s=next;drags.push({blockId:b.id,path:path.reverse(),exitSide:side});selected=true;break;
  }
  if(!selected)return{s,drags};
 }
}

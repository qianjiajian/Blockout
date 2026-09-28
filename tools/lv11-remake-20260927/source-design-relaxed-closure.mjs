import {compileLevel} from '../remake21to30-mask-floor.mjs';
// Candidate triage only, never a gameplay or lower-bound certificate. Ignore
// every thawed body's occupancy, while keeping all still-frozen initial masks.
export function relaxedClearClosure(level){
 const c=compileLevel(level);if(c.covers.length||c.blocks.some(b=>b.layers.length!==1))return{supported:false};
 const removed=new Set(),order=[];let count=0;
 for(;;){let changed=false;
  for(const[i,b]of c.blocks.entries()){
   if(removed.has(i)||b.ice>count)continue;
   const occupied=[0,0,0];for(const other of c.blocks)if(other.ice>count){const mask=other.poses[other.initial].mask;occupied[0]|=mask[0];occupied[1]|=mask[1];occupied[2]|=mask[2];}
   const queue=[b.initial],seen=new Set(queue);let canExit=false;
   for(let at=0;at<queue.length;at++){
    const p=b.poses[queue[at]],g=p.exits[0];if(g&&g.frozen<=count){canExit=true;break;}
    for(const q of p.neighbors){const m=b.poses[q].mask;if(!seen.has(q)&&!(m[0]&occupied[0])&&!(m[1]&occupied[1])&&!(m[2]&occupied[2])){seen.add(q);queue.push(q);}}
   }
   if(canExit){removed.add(i);order.push(b.id);count++;changed=true;}
  }
  if(!changed)break;
 }
 return{supported:true,optimisticClears:count,all:count===c.blocks.length,order,notACertificate:true};
}

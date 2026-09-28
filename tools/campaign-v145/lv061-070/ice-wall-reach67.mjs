import {clearCount} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
const overlap=(a,b)=>(a[0]&b[0])||(a[1]&b[1])||(a[2]&b[2]);
// Witness heuristic only. Before the next clear, existing iced bodies cannot
// move/thaw, and ordinary closed curtains cannot lose count. Ignore every other
// body; permit hidden free bodies to appear whenever their region has no such
// immovable occupant. Failure even under this optimism rules out a next clear.
export function makeNextClearOptimism(c){
 const caches=new Map();return s=>{
  const clears=clearCount(c,s),sig=[clears,...c.covers.map(co=>s[2*c.N+co.j]),...c.blocks.flatMap((b,i)=>s[i]<510&&s[c.N+i]?[i,s[i]]:[])].join(',');let cache=caches.get(sig);
  if(!cache){const walls=[0,0,0];for(const co of c.covers)if(co.skin!=='lift'&&!s[2*c.N+co.j])for(let k=0;k<3;k++)walls[k]|=co.mask[k];for(let i=0;i<c.N;i++)if(s[i]<510&&s[c.N+i])for(let k=0;k<3;k++)walls[k]|=c.blocks[i].poses[s[i]&127].mask[k];
   const hiddenAllowed=new Set(c.covers.filter(co=>co.skin==='lift'&&!overlap(co.mask,walls)).flatMap(co=>co.members)),reachable=c.blocks.map(b=>{const seen=new Uint8Array(128),queue=[];for(let p=0;p<b.poses.length;p++){const pose=b.poses[p],gate=pose?.exits[0];if(pose&&gate&&clears>=(gate.frozen??0)&&!overlap(pose.mask,walls)){seen[p]=1;queue.push(p);}}for(let at=0;at<queue.length;at++)for(const p of b.poses[queue[at]].neighbors)if(!seen[p]&&!overlap(b.poses[p].mask,walls)){seen[p]=1;queue.push(p);}return seen;});cache={hiddenAllowed,reachable};if(caches.size>10000)caches.clear();caches.set(sig,cache);
  }
  for(let i=0;i<c.N;i++)if(!s[c.N+i]&&(s[i]<510&&cache.reachable[i][s[i]&127]||s[i]===510&&cache.hiddenAllowed.has(i)&&cache.reachable[i][c.blocks[i].initial]))return true;
  return clears===c.total;
 };
}

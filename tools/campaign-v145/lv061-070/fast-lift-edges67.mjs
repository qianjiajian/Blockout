import {each as fullEach,clearCount} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
const overlap=(a,b)=>(a[0]&b[0])||(a[1]&b[1])||(a[2]&b[2]);
function occupied(c,s,excluded=-1,excludedCover=-1){const occ=[0,0,0];for(const co of c.covers)if(co.j!==excludedCover&&!s[2*c.N+co.j]&&co.skin!=='lift')for(let k=0;k<3;k++)occ[k]|=co.mask[k];for(let i=0;i<c.N;i++)if(i!==excluded&&s[i]<510){const mask=c.blocks[i].poses[s[i]&127].mask;for(let k=0;k<3;k++)occ[k]|=mask[k];}return occ;}
function settle(c,s){let changed=true;while(changed){changed=false;for(const co of c.covers){if(s[c.N*2+co.j])continue;const occ=occupied(c,s,-1,co.j);if(co.skin==='lift'){if(overlap(co.mask,occ))continue;}else if(clearCount(c,s)<co.count)continue;if(co.members.some(i=>overlap(c.blocks[i].poses[c.blocks[i].initial].mask,occ)))continue;s[c.N*2+co.j]=1;for(const i of co.members)s[i]=c.blocks[i].initial;changed=true;}}return s;}
/** During a held translation only body i changes pose. If every ready unrevealed
 * batch is blocked by another fixed body/cover, no reveal can happen anywhere
 * on that held path. Then the full state is determined by i's anchor and all
 * other occupancy is constant: anchor BFS is exactly the full-state BFS.
 * Otherwise enumerate that body's gestures with the original full-state graph.
 * Exit events always perform full visible-ice update and repeated reveal settle.
 */
export function eachFast67(c,s,visit,{optionalExit=false,orderSeed=0}={}){
 const cleared=clearCount(c,s);
 for(let ii=0;ii<c.N;ii++){
  const i=(ii+orderSeed)%c.N,b=c.blocks[i],v=s[i];if(v>=510||s[c.N+i]>0)continue;
  const stable=c.covers.every(co=>s[2*c.N+co.j]||(co.skin!=='lift'&&cleared<co.count)||overlap(co.mask,occupied(c,s,i,co.j)));
  if(!stable){let stopped=false;fullEach(c,s,(next,cost,get)=>{const d=get();if(d.blockId!==b.id)return false;if(visit(next,cost,()=>d)===false){stopped=true;return false;}},{optionalExit,orderSeed:i});if(stopped)return;continue;}
  const stage=v>>>7,occ=occupied(c,s,i),anchors=[v&127],parents=[-1],seen=new Uint8Array(128);seen[v&127]=1;
  const drag=(ni,side)=>{const path=[];while(parents[ni]>=0){const p=anchors[ni];path.push([p%c.W,Math.floor(p/c.W)]);ni=parents[ni];}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let ni=0;ni<anchors.length;ni++){
   const p=anchors[ni],pose=b.poses[p],gate=pose.exits[stage],exit=gate&&cleared>=(gate.frozen??0);
   if(exit){const next=s.slice();for(let j=0;j<c.N;j++)if(j!==i&&s[j]<510&&next[c.N+j])next[c.N+j]--;next[i]=stage+1<b.layers.length?p|((stage+1)<<7):511;settle(c,next);if(visit(next,0,()=>drag(ni,gate.side))===false)return;if(!optionalExit)continue;}
   if(ni>0){const next=s.slice();next[i]=p|(stage<<7);if(visit(next,1,()=>drag(ni))===false)return;}
   for(const to of pose.neighbors)if(!seen[to]&&!overlap(b.poses[to].mask,occ)){seen[to]=1;anchors.push(to);parents.push(ni);}
  }
 }
}

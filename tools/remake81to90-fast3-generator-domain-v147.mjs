/** Exact held-gesture representation: other existing poses are fixed. Every
 * inner state is determined by the held normalized pose and the two exact FIFO
 * head indices. Arrivals have fixed poses, so no other hidden degree of freedom
 * is dropped. This changes only BFS storage and avoids repeated queue scans.
 */
import assert from 'node:assert/strict';
import {occupied,QUEUED,NONE,key,compileImmediate,eachImmediateOptional} from './remake81to90-immediate-generator-floor-v146.mjs';
import {generatorClearCount,generatorStateFromSnapshot} from './remake81to90-generator-floor-v146.mjs';
const overlaps=(a,b)=>a.some((v,i)=>v&b[i]);
function settleMasked(c,s,full,other,heads){let changed;do{changed=false;for(let g=0;g<2;g++){const machine=c.generators[g],h=heads[g];if(h>=machine.indices.length)continue;const i=machine.indices[h],b=c.blocks[i],mask=b.poses[b.initial].mask;assert.equal(s[i],QUEUED);if(overlaps(mask,full))continue;s[i]=b.initial;heads[g]++;for(let k=0;k<3;k++){full[k]|=mask[k];if(other)other[k]|=mask[k];}changed=true;}}while(changed);}
export function eachImmediateFast(c,s,visit,{optionalExit=true,orderSeed=0}={}){
 assert.equal(c.generators.length,2);const cleared=generatorClearCount(c,s),initialOccupied=occupied(c,s),heads=c.generators.map(g=>{const h=g.indices.findIndex(i=>s[i]===QUEUED);return h<0?g.indices.length:h;}),radix=c.generators[0].indices.length+1;
 const poseKey=(p,h)=>p+128*(h[0]+radix*h[1]);
 for(let ii=0;ii<s.length;ii++){const i=(ii+orderSeed)%s.length,b=c.blocks[i],v=s[i];if(v===NONE||v===QUEUED||cleared<b.ice)continue;const stage=v>>>7,nodes=[{s,parent:-1,heads,occ:initialOccupied.map((word,k)=>word&~b.poses[v&127].mask[k])}],seen=new Set([poseKey(v&127,heads)]);
  const drag=(n,side)=>{const path=[];while(nodes[n].parent>=0){const p=nodes[n].s[i]&127;path.push([p%c.W-b.anchorOffset[0],Math.floor(p/c.W)-b.anchorOffset[1]]);n=nodes[n].parent;}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let n=0;n<nodes.length;n++){const node=nodes[n],cur=node.s,p=cur[i]&127,pose=b.poses[p],gate=pose.exits[stage],exit=gate&&cleared>=(gate.frozen??0);
   if(exit){const next=cur.slice(),peel=stage+1<b.layers.length;next[i]=peel?p|((stage+1)<<7):NONE;const full=node.occ.map((v,k)=>peel?v|pose.mask[k]:v);settleMasked(c,next,full,undefined,node.heads.slice());if(visit(next,0,()=>drag(n,gate.side))===false)return;if(!optionalExit)continue;}
   if(n>0&&visit(cur,1,()=>drag(n))===false)return;
   for(const to of pose.neighbors){const mask=b.poses[to].mask;if(overlaps(mask,node.occ))continue;const next=cur.slice();next[i]=to|(stage<<7);const occ=node.occ.slice(),full=occ.map((v,k)=>v|mask[k]),nextHeads=node.heads.slice();settleMasked(c,next,full,occ,nextHeads);const k=poseKey(to,nextHeads);if(seen.has(k))continue;seen.add(k);nodes.push({s:next,parent:n,occ,heads:nextHeads});}
  }
 }
}
export function verifyFastSuccessors(level,drags,api){
 const c=compileImmediate(level,api),m=new api.PuzzleModel(structuredClone(level));m.startCountdown();let compared=0,edges=0;
 for(const d of drags){const s=generatorStateFromSnapshot(c,m.snapshot()),slow=new Set(),fast=new Set();eachImmediateOptional(c,s,(t,cost)=>slow.add(cost+':'+key(t)));eachImmediateFast(c,s,(t,cost)=>fast.add(cost+':'+key(t)));assert.deepEqual(fast,slow);compared++;edges+=fast.size;
  const clears=m.snapshot().cleared;m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());const cost=m.snapshot().cleared>clears?0:1;assert(fast.has(cost+':'+key(generatorStateFromSnapshot(c,m.snapshot()))));
 }assert(m.snapshot().complete);return{passed:true,allSuccessorSetsAndCostsEqual:true,compared,edges};
}

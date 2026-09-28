import assert from 'node:assert/strict';
import {compileLevel,clearCount} from '../../remake21to30-mask-floor.mjs';
import {compileSpatial} from '../../remake111to120-spatial-floor-v147.mjs';
import {canonicalStateKey} from '../../remake21to30-symmetry-floor-v139.mjs';
import {compile as compileStar} from '../../remake161-170/author161-163/star-domain.mjs';

// Lower graphs project every flip door to a permanently open normal door.
// Optional immediate phase and token pruning are witness-only restrictions;
// delayed/interleaved GUI completion callbacks are not modeled by that phase.
export function compile(level,{witness=false,prefix=false,alternatingTokens=false,tokenBlockIds}={}){
 assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');
 if(witness||prefix){assert.equal(level.blocks.filter(b=>!b.shutterId).length,12);assert(level.blocks.every(b=>!b.layers||b.layers.length===1));assert(level.blocks.every(b=>b.shutterId?b.star:!b.star));assert.equal(level.shutters.length,5);assert(level.shutters.every(c=>c.count===12));assert((level.flipDoors??[]).every(g=>!g.star&&!g.frozen));}
 const projected={...level,flipDoors:[],gates:[...level.gates,...(level.flipDoors??[]).map(({initiallyOpen,...g})=>g)],mechanismRules:'revised-2026-09-23-v1.4'};
 const raw=compileStar(projected),flips=new Map((level.flipDoors??[]).map(g=>[g.id,g]));
 let c={...raw,witness,prefix,alternatingTokens,tokenIds:new Set(tokenBlockIds??raw.blocks.filter(b=>b.color==='purple'||b.y>=8).map(b=>b.id)),flips,totalClears:prefix?12:raw.total,initial:Uint8Array.from(raw.initial),blocks:raw.blocks.map(b=>({...b,revealAt:b.reveal,poses:b.poses.map((p,at)=>{if(!p)return null;const x=at%raw.W,y=Math.floor(at/raw.W),bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1]));return{...p,exits:b.layers.map(col=>projected.gates.filter(g=>g.color===col&&(!b.star||g.star)).filter(g=>{const hor=['top','bottom'].includes(g.side);return(g.side==='left'?x===0:g.side==='right'?x+bw===raw.W:g.side==='top'?y===0:y+bh===raw.H)&&(hor?x:y)>=g.offset&&(hor?x+bw:y+bh)<=g.offset+g.size;}).map(g=>({...g,frozen:g.frozen??0})))}})}))};
 const groups=new Map();for(const[i,b]of c.blocks.entries()){const signature=JSON.stringify({shape:b.shape,layers:b.layers,ice:b.ice,cover:b.cover?.id,star:b.star});if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(i);}
 c.groups=[...groups.values()].filter(g=>g.length>1);
 // Exact swept in-board cells for boundary departure. Includes trailing arms.
 for(const b of c.blocks)for(let p=0;p<b.poses.length;p++){const pose=b.poses[p];if(!pose)continue;for(const exits of pose.exits)for(const g of exits){const cells=new Set();for(const[dx,dy]of b.shape){let x=p%c.W+dx,y=Math.floor(p/c.W)+dy;while(x>=0&&x<c.W&&y>=0&&y<c.H){cells.add(y*c.W+x);if(g.side==='top')y--;else if(g.side==='bottom')y++;else if(g.side==='left')x--;else x++;}}g.sweep=[0,0,0];for(const v of cells)g.sweep[v>>>5]|=1<<(v&31);}}
 return c;
}
export function each(c,s,visit){const count=clearCount(c,s);let occ=[0,0,0];for(const co of c.covers)if(count<co.count)occ=occ.map((v,i)=>v|co.mask[i]);for(let i=0;i<c.blocks.length;i++)if(s[i]!==255&&count>=c.blocks[i].revealAt)occ=occ.map((v,j)=>v|c.blocks[i].poses[s[i]&127].mask[j]);
 for(let i=0;i<c.blocks.length;i++){const b=c.blocks[i],value=s[i];if(value===255||count<b.revealAt||b.ice>count-b.revealAt)continue;const start=value&127,stage=value>>>7,obstacle=occ.map((v,j)=>v^b.poses[start].mask[j]),parents=new Int16Array(c.W*c.H).fill(-1),queue=[start];parents[start]=start;
 const drag=(p,side)=>{const path=[];while(p!==start){path.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
 for(let n=0;n<queue.length;n++){const p=queue[n],pose=b.poses[p];for(const g of pose.exits[stage])if(!(c.witness&&c.alternatingTokens&&count<12&&count%2===1&&c.tokenIds.has(b.id))&&count>=g.frozen&&(!c.witness||!c.flips.has(g.id)||Boolean(c.flips.get(g.id).initiallyOpen)!==((Math.max(0,count-g.frozen))%2===1))&&!g.sweep.some((v,j)=>v&obstacle[j])){if(visit(i,stage+1<b.layers.length?p|((stage+1)<<7):255,0,()=>drag(p,g.side))===false)return;}
 if(p!==start&&visit(i,p|(stage<<7),1,()=>drag(p))===false)return;for(const to of pose.neighbors)if(parents[to]===-1&&!b.poses[to].mask.some((v,j)=>v&obstacle[j])){parents[to]=p;queue.push(to);}}
 }}
export function normalize(c,input){let state=input;const drags=[];if(c.witness&&clearCount(c,state)<12)return{state,drags};for(;;){if(c.prefix&&clearCount(c,state)>=12)return{state,drags};let choice;each(c,state,(i,v,k,get)=>{if(!k&&v===255){choice={i,v,d:get()};return false;}});if(!choice)return{state,drags};state=state.slice();state[choice.i]=choice.v;drags.push(choice.d);}}
export function search(c,{floor=Infinity,maxStates=100000,maxMilliseconds=800,weight=1000,prove=false}={}){
 const began=Date.now(),key=s=>canonicalStateKey(s,c.groups),initial=normalize(c,c.initial),nodes=[{s:initial.state,cost:0,parent:-1,clears:clearCount(c,initial.state),drags:initial.drags}],seen=new Map([[key(initial.state),0]]),open=[0];let explored=0,stop,best=0;
 const score=i=>prove?-nodes[i].cost:nodes[i].clears*weight-nodes[i].cost;
 const push=i=>{open.push(i);for(let a=open.length-1;a;){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}};
 const pop=()=>{const r=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return r;};
 const route=i=>{const segs=[];while(i>=0){segs.push(nodes[i].drags);i=nodes[i].parent;}return segs.reverse().flat();};
 while(open.length){if(Date.now()-began>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;if(n.clears>nodes[best].clears||(n.clears===nodes[best].clears&&n.cost<nodes[best].cost))best=ni;if(n.clears===c.totalClears)return{status:prove?'relaxed-shortcut':'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,ms:Date.now()-began};
 each(c,n.s,(i,v,cost,get)=>{const nc=n.cost+cost;if(nc>=floor)return;const s=n.s.slice();s[i]=v;const normalized=normalize(c,s),k=key(normalized.state),prior=seen.get(k);if(prior!==undefined&&prior<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}if(Date.now()-began>=maxMilliseconds){stop='deadline';return false;}seen.set(k,nc);nodes.push({s:normalized.state,cost:nc,parent:ni,clears:clearCount(c,normalized.state),drags:[get(),...normalized.drags]});push(nodes.length-1);});if(stop)break;}
 return{status:stop?'unknown':prove?'threshold-proven':'exhausted',thresholdProven:!stop&&prove,stop,states:seen.size,explored,ms:Date.now()-began,maxClears:nodes[best].clears,partialCost:nodes[best].cost,partialRoute:route(best)};
}

// New isolated128-bit extension; old96-bit graph unchanged.
import assert from 'node:assert/strict';
const COLORS=['red','blue','green','yellow','purple','orange','pink','cyan'];
const SIDES=['top','right','bottom','left'];
const NONE=511;
const overlap=(a,b)=>(a[0]&b[0])||(a[1]&b[1])||(a[2]&b[2])||(a[3]&b[3]);
function mask(cells,W){const m=[0,0,0,0];for(const [x,y] of cells){let p=y*W+x;m[p>>>5]|=1<<(p&31);}return m;}
export const key=s=>String.fromCharCode(...s);
export function compile(level){
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 const W=level.width,H=level.height;assert(Number.isInteger(W)&&Number.isInteger(H)&&W>1&&H>1&&W*H<=128);
 for(const k of ['blocked','seams','generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,k);
 const cells=level.playable??Array.from({length:W*H},(_,p)=>[p%W,Math.floor(p/W)]),legal=new Set(cells.map(([x,y])=>y*W+x));
 assert.equal(legal.size,cells.length);assert(cells.every(([x,y])=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<W&&y>=0&&y<H));
 const byColor=new Map(),rails=new Set(),ids=new Set();const id=v=>{assert(typeof v==='string'&&!ids.has(v));ids.add(v);};
 for(const g of level.gates){id(g.id);assert(COLORS.includes(g.color)&&!byColor.has(g.color));assert(SIDES.includes(g.side));assert(!g.star&&!g.portals);assert(Number.isInteger(g.offset)&&Number.isInteger(g.size)&&g.size>0&&g.offset>=0&&g.offset+g.size<=(g.side==='top'||g.side==='bottom'?W:H));assert(g.frozen===undefined||Number.isInteger(g.frozen)&&g.frozen>0);for(let t=g.offset;t<g.offset+g.size;t++){const k=g.side+':'+t;assert(!rails.has(k));rails.add(k);assert(legal.has(g.side==='top'?t:g.side==='bottom'?(H-1)*W+t:g.side==='left'?t*W:t*W+W-1),'Only true outer rectangle gates supported');}byColor.set(g.color,g);}
 const covers=(level.shutters??[]).map(s=>{id(s.id);assert(!s.triggerBlockIds&&(!s.skin||s.skin==='shutter'));assert([s.x,s.y,s.width,s.height,s.count].every(Number.isInteger)&&s.count>0&&s.width>0&&s.height>0);const sc=Array.from({length:s.width*s.height},(_,p)=>[s.x+p%s.width,s.y+Math.floor(p/s.width)]);assert(sc.every(([x,y])=>x>=0&&y>=0&&x<W&&y<H&&legal.has(y*W+x)));return {...s,mask:mask(sc,W),members:[]};});
 for(let i=0;i<covers.length;i++)for(let j=0;j<i;j++)assert(!overlap(covers[i].mask,covers[j].mask));
 const blocks=level.blocks.map((b,i)=>{id(b.id);for(const k of ['keyId','lockedBy','lockCount','timedBombSeconds'])assert(b[k]===undefined);assert(!b.star&&!b.rotationBadge);assert(b.frozen===undefined||Number.isInteger(b.frozen)&&b.frozen>0);assert(b.movementAxis===undefined||['horizontal','vertical'].includes(b.movementAxis));const layers=b.layers??[b.color];assert(layers.length>=1&&layers.length<=2&&layers.every(c=>COLORS.includes(c)&&byColor.has(c)));assert(layers.length===1||layers[0]!==layers[1]);assert(b.shape.length&&new Set(b.shape.map(p=>p.join(','))).size===b.shape.length);assert(b.shape.every(p=>p.length===2&&p.every(n=>Number.isInteger(n)&&n>=0)));const bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1]));assert(b.shape.some(p=>p[0]===0)&&b.shape.some(p=>p[1]===0));
  const poses=Array(W*H).fill(null);
  for(let y=0;y+bh<=H;y++)for(let x=0;x+bw<=W;x++){const c=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(!c.every(([cx,cy])=>legal.has(cy*W+cx)))continue;const exits=layers.map(color=>{const g=byColor.get(color),hor=g.side==='top'||g.side==='bottom';const edge=g.side==='left'?x===0:g.side==='right'?x+bw===W:g.side==='top'?y===0:y+bh===H;return (!b.movementAxis||(b.movementAxis==='horizontal'?!hor:hor))&&edge&&(hor?x:y)>=g.offset&&(hor?x+bw:y+bh)<=g.offset+g.size?g:null;});poses[y*W+x]={mask:mask(c,W),exits,neighbors:[]};}
  for(let p=0;p<poses.length;p++)if(poses[p])for(const q of [p-W,p+1,p+W,p-1])if(poses[q]&&(q===p-W||q===p+W||Math.floor(q/W)===Math.floor(p/W))){if(b.movementAxis==='horizontal'&&Math.floor(q/W)!==Math.floor(p/W))continue;if(b.movementAxis==='vertical'&&q%W!==p%W)continue;poses[p].neighbors.push(q);}
  const initial=b.y*W+b.x;assert(Number.isInteger(b.x)&&Number.isInteger(b.y)&&b.x>=0&&b.x<W&&poses[initial]);const cover=covers.find(c=>c.id===b.shutterId);assert(!b.shutterId||cover);if(cover){assert(b.shape.every(([dx,dy])=>b.x+dx>=cover.x&&b.x+dx<cover.x+cover.width&&b.y+dy>=cover.y&&b.y+dy<cover.y+cover.height));cover.members.push(i);}else for(const c of covers)assert(!overlap(c.mask,poses[initial].mask));return {...b,layers,poses,initial,reveal:cover?.count??0,ice:b.frozen??0,cover};});
 assert(covers.every(c=>c.members.length));for(let i=0;i<blocks.length;i++)for(let j=0;j<i;j++)if(blocks[i].cover===blocks[j].cover)assert(!overlap(blocks[i].poses[blocks[i].initial].mask,blocks[j].poses[blocks[j].initial].mask));
 return {W,H,blocks,covers,initial:Uint16Array.from(blocks.map(b=>b.initial)),total:blocks.reduce((n,b)=>n+b.layers.length,0)};
}
export function clearCount(c,s){let n=0;for(let i=0;i<s.length;i++)n+=s[i]===NONE?c.blocks[i].layers.length:s[i]>>>7;return n;}
export function each(c,s,visit,{optionalExit=true,orderSeed=0}={}){
 const cleared=clearCount(c,s),occ=[0,0,0,0];for(const co of c.covers)if(cleared<co.count)for(let m=0;m<4;m++)occ[m]|=co.mask[m];for(let i=0;i<s.length;i++)if(s[i]!==NONE&&cleared>=c.blocks[i].reveal){const m=c.blocks[i].poses[s[i]&127].mask;for(let t=0;t<4;t++)occ[t]|=m[t];}
 for(let ii=0;ii<s.length;ii++){const i=(ii+orderSeed)%s.length,b=c.blocks[i],v=s[i];if(v===NONE||cleared<b.reveal+b.ice)continue;const start=v&127,stage=v>>>7,m=b.poses[start].mask,occupied=occ.map((v,i)=>v^m[i]);const parents=new Int16Array(c.W*c.H).fill(-1),q=[start];parents[start]=start;
  const drag=(p,side)=>{const path=[];while(p!==start){path.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return {blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let h=0;h<q.length;h++){const p=q[h],pose=b.poses[p],g=pose.exits[stage],ex=g&&cleared>=(g.frozen??0);if(p!==start&&(optionalExit||!ex))if(visit(i,p|(stage<<7),1,()=>drag(p))===false)return;if(ex){if(visit(i,stage+1<b.layers.length?p|((stage+1)<<7):NONE,0,()=>drag(p,g.side))===false)return;if(!optionalExit)continue;}
   for(const next of pose.neighbors)if(parents[next]===-1&&!overlap(b.poses[next].mask,occupied)){parents[next]=p;q.push(next);}
  }
 }
}
export function search(level,{floor=Infinity,maxStates=150000,maxMilliseconds=3000,weight=1000,orderSeed=0,prove=false,goalClears=Infinity}={}){
 const c=compile(level),start=Date.now(),nodes=[{s:c.initial,cost:0,parent:-1,clears:0}],seen=new Map([[key(c.initial),0]]),open=[0];let explored=0,transitions=0,stop,maxClears=0;
 const score=i=>prove?-nodes[i].cost:nodes[i].clears*weight-nodes[i].cost;
 function push(i){open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}}
 function pop(){const a=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return a;}
 function route(i){const r=[];while(nodes[i].parent>=0){r.push(nodes[i].drag);i=nodes[i].parent;}return r.reverse();}
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;maxClears=Math.max(maxClears,n.clears);if(n.clears===c.total||n.clears>=goalClears)return {status:prove?'shortcut':'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,transitions,partial:n.clears<c.total,ms:Date.now()-start};
  each(c,n.s,(i,value,cost,getDrag)=>{transitions++;const nc=n.cost+cost;if(nc>=floor)return;const s=n.s.slice();s[i]=value;const k=key(s),prev=seen.get(k);if(prev!==undefined&&prev<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);nodes.push({s,cost:nc,parent:ni,clears:clearCount(c,s),drag:getDrag()});push(nodes.length-1);},{optionalExit:prove,orderSeed});if(stop)break;
 }
 return {status:stop?'unknown':prove?'threshold-proven':'exhausted',thresholdProven:prove&&!stop,floor,states:seen.size,explored,transitions,maxClears,ms:Date.now()-start,stop};
}

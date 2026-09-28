import assert from 'node:assert/strict';
const COLORS=['red','blue','green','yellow','purple','orange','pink','cyan'];
const SIDES=['top','right','bottom','left'];
const NONE=511;
const overlap=(a,b)=>(a[0]&b[0])||(a[1]&b[1])||(a[2]&b[2]);
function mask(cells,W){const m=[0,0,0];for(const [x,y] of cells){let p=y*W+x;m[p>>>5]|=1<<(p&31);}return m;}
export const key=s=>String.fromCharCode(...s);
export function compile(level){
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 const W=level.width,H=level.height;assert(Number.isInteger(W)&&Number.isInteger(H)&&W>1&&H>1&&W*H<=96);
 for(const k of ['blocked','seams','generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,k);
 const cells=level.playable??Array.from({length:W*H},(_,p)=>[p%W,Math.floor(p/W)]),legal=new Set(cells.map(([x,y])=>y*W+x));
 assert.equal(legal.size,cells.length);assert(cells.every(([x,y])=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<W&&y>=0&&y<H));
 const byColor=new Map(),rails=new Set(),ids=new Set();const id=v=>{assert(typeof v==='string'&&!ids.has(v));ids.add(v);};
 for(const g of level.gates){id(g.id);assert(COLORS.includes(g.color)&&!byColor.has(g.color+":"+Boolean(g.star)));assert(SIDES.includes(g.side));assert(!g.portals);assert(Number.isInteger(g.offset)&&Number.isInteger(g.size)&&g.size>0&&g.offset>=0&&g.offset+g.size<=(g.side==='top'||g.side==='bottom'?W:H));assert(g.frozen===undefined||Number.isInteger(g.frozen)&&g.frozen>0);for(let t=g.offset;t<g.offset+g.size;t++){const k=g.side+':'+t;assert(!rails.has(k));rails.add(k);assert(legal.has(g.side==='top'?t:g.side==='bottom'?(H-1)*W+t:g.side==='left'?t*W:t*W+W-1),'Only true outer rectangle gates supported');}byColor.set(g.color+":"+Boolean(g.star),g);}
 const covers=(level.shutters??[]).map(s=>{id(s.id);assert(!s.triggerBlockIds&&(!s.skin||s.skin==='shutter'));assert([s.x,s.y,s.width,s.height,s.count].every(Number.isInteger)&&s.count>0&&s.width>0&&s.height>0);const sc=Array.from({length:s.width*s.height},(_,p)=>[s.x+p%s.width,s.y+Math.floor(p/s.width)]);assert(sc.every(([x,y])=>x>=0&&y>=0&&x<W&&y<H&&legal.has(y*W+x)));return {...s,mask:mask(sc,W),members:[]};});
 for(let i=0;i<covers.length;i++)for(let j=0;j<i;j++)assert(!overlap(covers[i].mask,covers[j].mask));
 const blocks=level.blocks.map((b,i)=>{id(b.id);for(const k of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'])assert(b[k]===undefined);assert(!b.rotationBadge);assert(b.frozen===undefined||Number.isInteger(b.frozen)&&b.frozen>0);const layers=b.layers??[b.color];assert(layers.length>=1&&layers.length<=2&&layers.every(c=>COLORS.includes(c)&&byColor.has(c+":"+Boolean(b.star))));assert(layers.length===1||layers[0]!==layers[1]);assert(b.shape.length&&new Set(b.shape.map(p=>p.join(','))).size===b.shape.length);assert(b.shape.every(p=>p.length===2&&p.every(n=>Number.isInteger(n)&&n>=0)));const bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1]));assert(b.shape.some(p=>p[0]===0)&&b.shape.some(p=>p[1]===0));
  const poses=Array(W*H).fill(null);
  for(let y=0;y+bh<=H;y++)for(let x=0;x+bw<=W;x++){const c=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(!c.every(([cx,cy])=>legal.has(cy*W+cx)))continue;const exits=layers.map(color=>{const g=byColor.get(color+":"+Boolean(b.star)),hor=g.side==='top'||g.side==='bottom';const edge=g.side==='left'?x===0:g.side==='right'?x+bw===W:g.side==='top'?y===0:y+bh===H;return edge&&(hor?x:y)>=g.offset&&(hor?x+bw:y+bh)<=g.offset+g.size?g:null;});poses[y*W+x]={mask:mask(c,W),exits,neighbors:[]};}
  for(let p=0;p<poses.length;p++)if(poses[p])for(const q of [p-W,p+1,p+W,p-1])if(poses[q]&&(q===p-W||q===p+W||Math.floor(q/W)===Math.floor(p/W)))poses[p].neighbors.push(q);
  const initial=b.y*W+b.x;assert(Number.isInteger(b.x)&&Number.isInteger(b.y)&&b.x>=0&&b.x<W&&poses[initial]);const cover=covers.find(c=>c.id===b.shutterId);assert(!b.shutterId||cover);if(cover){assert(b.shape.every(([dx,dy])=>b.x+dx>=cover.x&&b.x+dx<cover.x+cover.width&&b.y+dy>=cover.y&&b.y+dy<cover.y+cover.height));cover.members.push(i);}else for(const c of covers)assert(!overlap(c.mask,poses[initial].mask));return {...b,layers,poses,initial,reveal:cover?.count??0,ice:b.frozen??0,cover};});
 assert(covers.every(c=>c.members.length));for(let i=0;i<blocks.length;i++)for(let j=0;j<i;j++)if(blocks[i].cover===blocks[j].cover)assert(!overlap(blocks[i].poses[blocks[i].initial].mask,blocks[j].poses[blocks[j].initial].mask));
 return {W,H,blocks,covers,initial:Uint16Array.from(blocks.map(b=>b.initial)),total:blocks.reduce((n,b)=>n+b.layers.length,0)};
}
export function clearCount(c,s){let n=0;for(let i=0;i<s.length;i++)n+=s[i]===NONE?c.blocks[i].layers.length:s[i]>>>7;return n;}

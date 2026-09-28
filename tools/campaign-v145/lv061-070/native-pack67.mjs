// Native-shape exact cover for authoring only. Includes already fixed colored
// neighbors and symmetry reduction of physically identical remaining inventory.
export function packNative67(spec,cells,rng,shapes,{maxNodes=5000,forced=[]}={}){
 const coords=cells.map(p=>p.join(',')),index=new Map(coords.map((p,i)=>[p,i])),allowed=new Set(coords),full=(1n<<BigInt(cells.length))-1n,placed=[],items=rng.shuffle(spec.map((b,i)=>({...b,item:i})));let nodes=0;
 const candidates=items.map(b=>{const ps=[];for(const shape of shapes[b.kind])for(const [px,py]of cells)for(const [ax,ay]of shape){const x=px-ax,y=py-ay,foot=shape.map(([dx,dy])=>[x+dx,y+dy].join(','));if(foot.some(p=>!allowed.has(p)))continue;const neighbors=new Set(shape.flatMap(([dx,dy])=>[[x+dx+1,y+dy],[x+dx-1,y+dy],[x+dx,y+dy+1],[x+dx,y+dy-1]]).map(p=>p.join(',')));if(!b.color.startsWith('unassigned')&&forced.some(f=>f.color===b.color&&f.shape.some(([dx,dy])=>neighbors.has([f.x+dx,f.y+dy].join(',')))))continue;const mask=foot.reduce((m,p)=>m|(1n<<BigInt(index.get(p))),0n),neighborMask=[...neighbors].filter(p=>index.has(p)).reduce((m,p)=>m|(1n<<BigInt(index.get(p))),0n);if(!ps.some(p=>p.mask===mask))ps.push({...b,x,y,shape,mask,neighborMask});}return rng.shuffle(ps);});
 const byCell=cells.map((_,cell)=>candidates.flatMap((ps,item)=>ps.filter(p=>(p.mask&(1n<<BigInt(cell)))!==0n).map(p=>({item,p})))),remaining=new Set(items.map((_,i)=>i));
 function go(used){if(++nodes>maxNodes)return false;if(!remaining.size)return used===full;const unique=new Set(),active=new Set();for(const i of remaining){const b=items[i],sig=JSON.stringify([b.kind,b.color.startsWith('unassigned')?'?':b.color,b.frozen,b.layers]);if(!unique.has(sig)){unique.add(sig);active.add(i);}}
  let best;for(let cell=0;cell<cells.length;cell++){if(used&(1n<<BigInt(cell)))continue;const opts=byCell[cell].filter(({item,p})=>active.has(item)&&!(p.mask&used)&&(p.color.startsWith('unassigned')||!placed.some(q=>q.color===p.color&&(q.mask&p.neighborMask))));if(!opts.length)return false;if(!best||opts.length<best.length)best=opts;if(best.length===1)break;}
  for(const{item,p}of best){remaining.delete(item);placed.push(p);if(go(used|p.mask))return true;placed.pop();remaining.add(item);}return false;
 }
 return go(0n)?placed.map(({mask,neighborMask,item,...b})=>b):null;
}

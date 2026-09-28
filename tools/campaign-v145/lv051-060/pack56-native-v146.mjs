// Native shape packing: memoized geometry first, then assign original identities.
// This changes candidate construction only; all candidates still pass real audits.
export function packNative(spec,cells,rng,shapes,fixed=[],limit=15000){
 const idx=new Map(cells.map((p,i)=>[p.join(','),i])),full=(1n<<BigInt(cells.length))-1n;
 const kinds=[...new Set(spec.map(b=>b.kind))],counts=kinds.map(k=>spec.filter(b=>b.kind===k).length);
 const placements=kinds.map(k=>{const out=[],seen=new Set();for(const shape of shapes[k])for(const cell of cells)for(const anchor of shape){const x=cell[0]-anchor[0],y=cell[1]-anchor[1],points=shape.map(([dx,dy])=>[dx+x,dy+y]);if(points.some(p=>!idx.has(p.join(','))))continue;const mask=points.reduce((m,p)=>m|(1n<<BigInt(idx.get(p.join(',')))),0n),key=mask.toString();if(seen.has(key))continue;seen.add(key);out.push({kind:k,x,y,shape,points,mask});}return rng.shuffle(out);});
 const covering=cells.map((_,i)=>placements.map(ps=>ps.filter(p=>(p.mask&(1n<<BigInt(i)))!==0n)));
 let tries=0;const placed=[],memo=new Set();
 function assign(){
  const remaining=rng.shuffle([...spec]),result=[...fixed];
  const ordered=[...placed].sort((a,b)=>spec.filter(v=>v.kind===a.kind).length-spec.filter(v=>v.kind===b.kind).length);
  function step(n){if(n===ordered.length)return result.slice(fixed.length);const p=ordered[n],neighbors=new Set(p.points.flatMap(([x,y])=>[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]).map(v=>v.join(',')));const tried=new Set();for(let j=0;j<remaining.length;j++){const b=remaining[j];if(b.kind!==p.kind||tried.has(b.color))continue;tried.add(b.color);if(result.some(v=>v.color===b.color&&v.shape.some(([dx,dy])=>neighbors.has([v.x+dx,v.y+dy].join(',')))))continue;remaining.splice(j,1);result.push({...b,x:p.x,y:p.y,shape:p.shape});const done=step(n+1);if(done)return done;result.pop();remaining.splice(j,0,b);}return null;}return step(0);
 }
 function go(used){if(++tries>limit)return null;if(used===full)return assign();const key=used.toString()+':'+counts.join(',');if(memo.has(key))return null;let options;
  for(let i=0;i<cells.length;i++){if(used&(1n<<BigInt(i)))continue;const opts=[];for(let k=0;k<kinds.length;k++)if(counts[k])for(const p of covering[i][k])if(!(p.mask&used))opts.push([k,p]);if(!opts.length){memo.add(key);return null;}if(!options||opts.length<options.length)options=opts;if(options.length===1)break;}
  for(const [k,p]of rng.shuffle(options)){counts[k]--;placed.push(p);const found=go(used|p.mask);if(found)return found;placed.pop();counts[k]++;}
  // A geometry whose shape inventory matches may fail color assignment only.
  // Do not memoize such branches: prior placement partition affects adjacency.
  return null;
 }return go(0n);
}

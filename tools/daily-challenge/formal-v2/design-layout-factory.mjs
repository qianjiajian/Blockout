import {independentPartitionSha256} from './geometry.mjs';

// Native orientations copied from FORMAL_BLOCK_SHAPES; every produced body is
// independently checked by matchFormalBlockShape(native-only) and asset lookup.
export const nativeShapes=[
 [[0,0]],[[0,0],[0,1]],[[0,0],[0,1],[0,2]],[[0,0],[0,1],[1,1]],
 [[0,0],[1,0],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]],
 [[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0]],[[0,0],[1,0],[2,0]],
 [[0,0],[1,0],[2,0],[0,1]],[[1,0],[2,0],[0,1],[1,1]],
 [[1,0],[0,1],[1,1],[2,1],[1,2]],
 [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
 [[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[1,1],[2,1],[0,2]],
 [[3,0],[0,1],[1,1],[2,1],[3,1]],[[0,0],[0,1],[1,1],[2,1],[0,2],[0,3]],
 [[0,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],
];
const key=p=>p.join(',');
export const cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]);
export const rectangular=s=>s.length===(1+Math.max(...s.map(p=>p[0])))*(1+Math.max(...s.map(p=>p[1])));
const normalized=points=>{const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));return{x,y,shape:points.map(p=>[p[0]-x,p[1]-y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])};};
const shapeKey=s=>JSON.stringify(normalized(s).shape);
export const random=seed=>()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;

/** Retile the exact union of two existing bodies. Never modify the board mask. */
export function localRetiles(level,{irregular=false,maxUnion=12}={}){
 const shapes=nativeShapes.filter(s=>irregular||rectangular(s)),legal=new Set(shapes.map(shapeKey));
 const variants=[],seen=new Set([independentPartitionSha256(level)]);
 for(let i=0;i<level.blocks.length;i++)for(let j=i+1;j<level.blocks.length;j++){
  const aa=level.blocks[i],bb=level.blocks[j],union=[...cells(aa),...cells(bb)],total=new Set(union.map(key));
  if(union.length>maxUnion||union.length<3||total.size!==union.length)continue;
  const minX=Math.min(...union.map(p=>p[0])),maxX=Math.max(...union.map(p=>p[0])),minY=Math.min(...union.map(p=>p[1])),maxY=Math.max(...union.map(p=>p[1]));
  for(const shape of shapes)if(shape.length<union.length)for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
   const first=shape.map(([dx,dy])=>[x+dx,y+dy]);if(!first.every(p=>total.has(key(p))))continue;
   const used=new Set(first.map(key)),second=normalized(union.filter(p=>!used.has(key(p))));
   if(!legal.has(shapeKey(second.shape)))continue;
   const candidate=structuredClone(level);Object.assign(candidate.blocks[i],{x,y,shape:structuredClone(shape)});Object.assign(candidate.blocks[j],second);
   const partition=independentPartitionSha256(candidate);if(seen.has(partition))continue;seen.add(partition);
   variants.push({level:candidate,changedIds:[aa.id,bb.id],partition});
  }
 }
 return variants;
}

/** Deterministic graph colouring filtered by real native art and exit span. */
export function fixColors(level,ids,seed,runtime,{keepProbability=.7}={}){
 const r=random(seed),palette=[...new Set(level.gates.map(g=>g.color))],targets=ids.map(id=>level.blocks.find(b=>b.id===id));
 const adjacent=(a,b)=>cells(a).some(p=>cells(b).some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1));
 const targetIds=new Set(ids),neighbors=new Map(targets.map(b=>[b.id,level.blocks.filter(other=>other.id!==b.id&&adjacent(b,other))]));
 const domains=new Map();
 for(const target of targets){
  const excluded=new Set(neighbors.get(target.id).filter(b=>!targetIds.has(b.id)).map(b=>b.color));
  const width=1+Math.max(...target.shape.map(p=>p[0])),height=1+Math.max(...target.shape.map(p=>p[1]));
  const art=runtime.matchFormalBlockShape(target.shape,'native-only');
  const choices=palette.filter(c=>!excluded.has(c)&&art?.quarterTurns===0&&runtime.GAME_ART.gameplay.formalBlocks[c]?.solid?.[art.shapeId]
   &&level.gates.some(g=>g.color===c&&(g.side==='top'||g.side==='bottom'?width:height)<=g.size));
  if(!choices.length)return false;
  const preferOriginal=r()<keepProbability;
  domains.set(target.id,choices.map(color=>({color,order:preferOriginal&&color===target.color?-1:r()})).sort((a,b)=>a.order-b.order).map(x=>x.color));
 }
 const ordered=[...targets].sort((a,b)=>domains.get(a.id).length-domains.get(b.id).length||neighbors.get(b.id).length-neighbors.get(a.id).length);
 const assigned=new Map();let coloringStates=0;
 const assign=index=>{if(++coloringStates>10000)return false;if(index===ordered.length)return true;const b=ordered[index],excluded=new Set(neighbors.get(b.id).map(n=>targetIds.has(n.id)?assigned.get(n.id):n.color));for(const color of domains.get(b.id)){if(excluded.has(color))continue;assigned.set(b.id,color);if(assign(index+1))return true;assigned.delete(b.id);}return false;};
 if(!assign(0))return false;
 for(const target of targets)target.color=assigned.get(target.id);
 return !level.blocks.some((a,i)=>level.blocks.slice(i+1).some(b=>a.color===b.color&&adjacent(a,b)));
}

export function neighborhood(level,{irregular=false,secondOrderSeeds=16,secondOrderPerSeed=20,maxUnion=12}={}){
 const first=localRetiles(level,{irregular,maxUnion}),pool=first.map(x=>({...x,generation:1}));
 for(const seed of first.slice(0,secondOrderSeeds))for(const x of localRetiles(seed.level,{irregular,maxUnion}).slice(0,secondOrderPerSeed))
  pool.push({...x,changedIds:[...new Set([...seed.changedIds,...x.changedIds])],generation:2});
 const seen=new Set();return pool.map((x,i)=>({...x,order:Math.imul(i+17,2654435761)>>>0})).sort((a,b)=>a.order-b.order).filter(x=>!seen.has(x.partition)&&seen.add(x.partition));
}

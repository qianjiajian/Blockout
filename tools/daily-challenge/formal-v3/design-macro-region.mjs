import assert from 'node:assert/strict';
import {boardCells,absoluteCells} from './diversity-layout-factory.mjs';
const key=p=>p.join(',');
const normalize=points=>{const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));return points.map(p=>[p[0]-x,p[1]-y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);};
const connected=points=>{const left=new Set(points.map(key)),todo=[points[0]];left.delete(key(todo[0]));while(todo.length){const [x,y]=todo.pop();for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(left.delete(key(p)))todo.push(p);}return !left.size;};

/** Static whole-body cuts only. A clipped rectangle may describe a concave
 * connected footprint; paired masks must be exactly congruent by translation.
 * Neither block orientation nor board topology changes. No action search. */
export function enumerateMacroSwaps(level,{minimumAreaFraction=.35,minimumBodies=8,minimumQuadrants=3}={}){
 const playable=boardCells(level),groups=new Map(),seen=new Set(),allBodies=level.blocks.map(b=>({id:b.id,cells:absoluteCells(b)}));
 const width=level.width,height=level.height;let cuts=0,cutBodies=0;
 for(let x0=0;x0<width;x0++)for(let x1=x0+1;x1<=width;x1++)for(let y0=0;y0<height;y0++)for(let y1=y0+1;y1<=height;y1++){
  cuts++;const points=playable.filter(([x,y])=>x>=x0&&x<x1&&y>=y0&&y<y1);
  if(points.length*2<minimumAreaFraction*playable.length||points.length*2>playable.length||!connected(points))continue;
  const inside=p=>p[0]>=x0&&p[0]<x1&&p[1]>=y0&&p[1]<y1,intersect=allBodies.filter(b=>b.cells.some(inside));
  if(intersect.some(b=>!b.cells.every(inside))){cutBodies++;continue;}
  const ids=intersect.map(b=>b.id).sort(),idkey=JSON.stringify(ids);if(seen.has(idkey))continue;seen.add(idkey);
  const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1])),shape=normalize(points),signature=JSON.stringify(shape);
  const region={x,y,width:Math.max(...shape.map(p=>p[0]))+1,height:Math.max(...shape.map(p=>p[1]))+1,points,ids,area:points.length,rectangle:points.length===(x1-x0)*(y1-y0),cut:{x0,x1,y0,y1}};
  if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(region);
 }
 const pairs=[];
 for(const list of groups.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
  const a=list[i],b=list[j];if(a.ids.some(id=>b.ids.includes(id))||a.ids.length+b.ids.length<minimumBodies)continue;
  const points=[...a.points,...b.points],quadrants=[...new Set(points.map(([x,y])=>`${x<width/2?'L':'R'}${y<height/2?'T':'B'}`))].sort();
  if(quadrants.length<minimumQuadrants)continue;
  const levelAfter=structuredClone(level),setA=new Set(a.ids),setB=new Set(b.ids),dx=b.x-a.x,dy=b.y-a.y;
  for(const body of levelAfter.blocks){if(setA.has(body.id)){body.x+=dx;body.y+=dy;}else if(setB.has(body.id)){body.x-=dx;body.y-=dy;}}
  const beforeFootprints=new Set(allBodies.map(b=>JSON.stringify([...b.cells].sort((p,q)=>p[1]-q[1]||p[0]-q[0]))));
  const changed=levelAfter.blocks.filter(b=>!beforeFootprints.has(JSON.stringify(absoluteCells(b).sort((p,q)=>p[1]-q[1]||p[0]-q[0]))));
  if(!changed.length)continue; // Swapping only identical shapes is not a new partition.
  const assignment=Object.fromEntries(level.blocks.map(b=>[b.id,setA.has(b.id)?'A':setB.has(b.id)?'B':'outside']));
  pairs.push({level:levelAfter,a,b,quadrants,assignment,area:points.length,areaFraction:points.length/playable.length,bodyCount:a.ids.length+b.ids.length,translation:[dx,dy],changedFootprintArea:changed.reduce((n,b)=>n+b.shape.length,0),kind:a.rectangle&&b.rectangle?'whole-rectangle-translation-swap':'connected-congruent-footprint-translation-swap'});
 }
 pairs.sort((a,b)=>b.changedFootprintArea-a.changedFootprintArea||b.area-a.area);
 return {pairs,diagnostic:{cutsTested:cuts,cutsCrossingBodies:cutBodies,wholeBodyRegions:seen.size,translationPairs:pairs.length,rectanglePairs:pairs.filter(p=>p.kind.startsWith('whole')).length,connectedCongruentPairs:pairs.filter(p=>p.kind.startsWith('connected')).length,boardArea:playable.length}};
}

export function boundaryRetileAllowed(swap,ids){
 assert.equal(ids.length,2);const [a,b]=ids.map(id=>swap.assignment[id]);
 if(a===b)return false;
 const blocks=ids.map(id=>swap.level.blocks.find(b=>b.id===id));
 return absoluteCells(blocks[0]).some(p=>absoluteCells(blocks[1]).some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1));
}

/** Translation-closure fallback: both sides must be unions of complete bodies.
 * Adding a cell on A forces its translated cell on B and every cell of the
 * owning body, then forces the inverse translation back. Static components
 * may be joined when their A footprints touch; no game states are explored. */
export function enumerateConnectedMacroSwaps(level,{minimumAreaFraction=.35,minimumBodies=8,minimumQuadrants=3,maxStaticUnions=4000}={}){
 const playable=boardCells(level),bodies=level.blocks,byId=new Map(bodies.map(b=>[b.id,b])),owner=new Map(bodies.flatMap(b=>absoluteCells(b).map(p=>[key(p),b.id]))),pairs=[],seenPairs=new Set();
 let closureAttempts=0,closureRejected=0,staticUnions=0;
 for(let dy=0;dy<level.height;dy++)for(let dx=-(level.width-1);dx<level.width;dx++){
  if(dy===0&&dx<=0)continue;
  const components=[],seen=new Set();
  for(const seed of bodies){
   closureAttempts++;const sets=[new Set(),new Set()],queue=[[0,seed.id]];let bad=false;
   while(queue.length&&!bad){const [side,id]=queue.pop();if(sets[side].has(id))continue;if(sets[1-side].has(id)){bad=true;break;}sets[side].add(id);
    for(const [x,y]of absoluteCells(byId.get(id))){const other=owner.get(key([x+(side===0?dx:-dx),y+(side===0?dy:-dy)]));if(other===undefined){bad=true;break;}queue.push([1-side,other]);}}
   if(bad){closureRejected++;continue;}
   const signature=JSON.stringify(sets.map(s=>[...s].sort()));if(seen.has(signature))continue;seen.add(signature);components.push(sets);
  }
  const unions=[...components],known=new Set(components.map(s=>JSON.stringify(s.map(x=>[...x].sort()))));
  for(let ui=0;ui<unions.length&&staticUnions<maxStaticUnions;ui++){
   staticUnions++;const sets=unions[ui],aPoints=[...sets[0]].flatMap(id=>absoluteCells(byId.get(id))),bPoints=[...sets[1]].flatMap(id=>absoluteCells(byId.get(id)));
   if(aPoints.length*2>=minimumAreaFraction*playable.length&&sets[0].size+sets[1].size>=minimumBodies&&connected(aPoints)){
    const quadrants=[...new Set([...aPoints,...bPoints].map(([x,y])=>`${x<level.width/2?'L':'R'}${y<level.height/2?'T':'B'}`))].sort();
    const signature=JSON.stringify(sets.map(s=>[...s].sort()));
    if(quadrants.length>=minimumQuadrants&&!seenPairs.has(signature)){
     seenPairs.add(signature);const after=structuredClone(level),assignment={};for(const b of after.blocks){const side=sets[0].has(b.id)?0:sets[1].has(b.id)?1:-1;assignment[b.id]=side===0?'A':side===1?'B':'outside';if(side>=0){b.x+=side===0?dx:-dx;b.y+=side===0?dy:-dy;}}
     const footprint=pts=>JSON.stringify([...pts].sort((p,q)=>p[1]-q[1]||p[0]-q[0])),old=new Set(bodies.map(b=>footprint(absoluteCells(b))));
     const changed=after.blocks.filter(b=>!old.has(footprint(absoluteCells(b))));
     if(changed.length)pairs.push({level:after,a:{points:aPoints,ids:[...sets[0]],area:aPoints.length},b:{points:bPoints,ids:[...sets[1]],area:bPoints.length},quadrants,assignment,area:2*aPoints.length,areaFraction:2*aPoints.length/playable.length,bodyCount:sets[0].size+sets[1].size,translation:[dx,dy],changedFootprintArea:changed.reduce((n,b)=>n+b.shape.length,0),kind:'connected-congruent-footprint-translation-closure-swap'});
    }
   }
   for(const c of components){if([...c[0]].some(id=>sets[1].has(id))||[...c[1]].some(id=>sets[0].has(id)))continue;
    const combined=[new Set([...sets[0],...c[0]]),new Set([...sets[1],...c[1]])],signature=JSON.stringify(combined.map(s=>[...s].sort()));
    if(!known.has(signature)&&unions.length<maxStaticUnions){known.add(signature);unions.push(combined);}}
  }
 }
 pairs.sort((a,b)=>b.changedFootprintArea-a.changedFootprintArea||b.area-a.area);
 return {pairs,diagnostic:{closureAttempts,closureRejected,staticUnions,staticUnionLimit:maxStaticUnions,translationPairs:pairs.length}};
}

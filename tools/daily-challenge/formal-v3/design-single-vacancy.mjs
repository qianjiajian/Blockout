import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {boardCells,random,absoluteCells} from './diversity-layout-factory.mjs';

// Geometry research only. The starting colourless stock contains one border
// singleton and otherwise 2/3-cell bars. Its removal leaves exactly one cell.
// The parking graph is explicitly bounded, and is NOT a puzzle certificate.
export function tileSingleVacancy(source,{seed=1,maxNodes=10000,openingArea=1}={}){
 assert(Number.isInteger(maxNodes)&&maxNodes>0&&maxNodes<=10000);
 assert([1,2].includes(openingArea));
 const r=random(seed),cells=boardCells(source),keys=new Set(cells.map(p=>p.join(','))),occupied=new Set();
 const rim=cells.filter(([x,y])=>x===0||y===0||x===source.width-1||y===source.height-1);
 if(!rim.length)return{ok:false,reason:'no-border'};
 const eligible=rim.flatMap(([x,y])=>(openingArea===1?[[[0,0]]]:[[[0,0],[1,0]],[[0,0],[0,1]]]).filter(shape=>shape.every(([dx,dy])=>keys.has(`${x+dx},${y+dy}`))).map(shape=>({id:'opening',x,y,shape})));
 const first=eligible[Math.floor(r()*eligible.length)],opening=[first.x,first.y],chosen=[first];
 absoluteCells(first).forEach(p=>occupied.add(p.join(',')));
 const shapes=[[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]]];
 let nodes=0,exhausted=false;
 const placements=cells.map(([x,y])=>shapes.map(shape=>({x,y,shape,points:shape.map(([dx,dy])=>`${x+dx},${y+dy}`),order:r()})).filter(b=>b.points.every(k=>keys.has(k)))).flat();
 const byCell=new Map(cells.map(p=>[p.join(','),placements.filter(b=>b.points.includes(p.join(',')))]));
 function dfs(left){
  if(nodes>=maxNodes){exhausted=true;return false;}nodes++;
  if(!left)return true;
  let possible=null;
  for(const p of cells){const k=p.join(',');if(occupied.has(k))continue;const options=byCell.get(k).filter(b=>b.points.every(q=>!occupied.has(q)));
   if(!options.length)return false;if(!possible||options.length<possible.length)possible=options;
  }
  possible.sort((a,b)=>a.order-b.order);
  for(const b of possible){b.points.forEach(k=>occupied.add(k));chosen.push({id:`bar-${chosen.length}`,x:b.x,y:b.y,shape:b.shape});
   if(dfs(left-b.shape.length))return true;
   chosen.pop();b.points.forEach(k=>occupied.delete(k));if(exhausted)return false;
  }return false;
 }
 return dfs(cells.length-openingArea)?{ok:true,blocks:chosen,opening,nodes,openingArea}:{ok:false,nodes,exhausted,reason:exhausted?'tiling-budget':'no-cover'};
}

export function singleVacancyGraph(source,blocks,{maxStates=10000,maxDepth=45}={}){
 assert(Number.isInteger(maxStates)&&maxStates>0&&maxStates<=10000);
 assert(blocks[0].id==='opening'&&[1,2].includes(blocks[0].shape.length));
 const vacancyArea=blocks[0].shape.length;
 const bodies=blocks.slice(1),cells=boardCells(source),legal=new Set(cells.map(p=>p.join(',')));
 const initial=bodies.map(b=>[b.x,b.y]),stateKey=ps=>ps.flat().join(','),seen=new Set([stateKey(initial)]);
 const queue=[{positions:initial,depth:0,parent:-1,move:null}],earliest=[];
 // All native rim apertures. This measures geometric pose availability, not
 // a legal colour assignment, an exit sweep or a complete clearing route.
 const apertures=[];
 for(const side of ['top','right','bottom','left']){const n=['top','bottom'].includes(side)?source.width:source.height;
  for(let size=1;size<=3;size++)for(let offset=0;offset+size<=n;offset++){
   const points=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,source.height-1]:side==='left'?[0,offset+i]:[source.width-1,offset+i]);
   if(points.every(p=>legal.has(p.join(','))))apertures.push({side,size,offset});
  }
 }
 for(const b of bodies)earliest.push(apertures.map(()=>null));
 let cursor=0,attempted=0,termination='complete',maxReached=0,peakBranching=0;
 while(cursor<queue.length){
  const currentIndex=cursor++,node=queue[currentIndex];maxReached=Math.max(maxReached,node.depth);
  const occupied=new Map();bodies.forEach((b,i)=>b.shape.forEach(([dx,dy])=>occupied.set(`${node.positions[i][0]+dx},${node.positions[i][1]+dy}`,i)));
  assert.equal(cells.length-occupied.size,vacancyArea,'Vacancy area must remain fixed');
  let branches=0;
  for(let i=0;i<bodies.length;i++){
   const b=bodies[i],[x,y]=node.positions[i],w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));
   apertures.forEach((g,j)=>{const horizontal=['top','bottom'].includes(g.side),o=horizontal?x:y,span=horizontal?w:h;
    if(o>=g.offset&&o+span<=g.offset+g.size&&(g.side==='top'?y===0:g.side==='bottom'?y+h===source.height:g.side==='left'?x===0:x+w===source.width))earliest[i][j]??=node.depth;
   });
   if(node.depth>=maxDepth)continue;
   const held=[[x,y]],heldSeen=new Set([`${x},${y}`]);
   for(let hIndex=0;hIndex<held.length;hIndex++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    attempted++;const at=[held[hIndex][0]+dx,held[hIndex][1]+dy],atKey=at.join(',');
    if(heldSeen.has(atKey)||!b.shape.every(([sx,sy])=>{const k=`${at[0]+sx},${at[1]+sy}`;return legal.has(k)&&(!occupied.has(k)||occupied.get(k)===i);}))continue;
    heldSeen.add(atKey);held.push(at);
   }
   for(const at of held.slice(1)){
    branches++;
    // Conservatively stop before constructing a possibly-new committed board.
    if(seen.size>=maxStates){termination='construction-state-budget';return finish();}
    const next=node.positions.map((p,j)=>j===i?at:p),key=stateKey(next);
    if(seen.has(key))continue;
    seen.add(key);queue.push({positions:next,depth:node.depth+1,parent:currentIndex,move:{blockId:b.id,from:[x,y],to:next[i]}});
   }
  }peakBranching=Math.max(peakBranching,branches);
 }
 if(queue.some(n=>n.depth===maxDepth))termination='construction-depth-limit';
 return finish();
 function finish(){return{geometryOnly:true,puzzleProof:false,rawGeometricStates:seen.size,expanded:cursor,attempted,termination,maxReached,peakBranching,
  apertures,earliest,bodies:bodies.map(b=>b.id),latePairs:earliest.reduce((n,ds)=>n+ds.filter(d=>d>=31).length,0),
  bodiesWithLatePose:earliest.filter(ds=>ds.some(d=>d>=31)).length,queue};}
}

async function main(){
 const [label,perText='4',areaText='1']=process.argv.slice(2),per=Number(perText),openingArea=Number(areaText);assert(/^[a-z0-9-]+$/.test(label??'')&&per>0&&per<=16);
 const output=`deliverables/daily-formal-v3-20261008/design/${label}`;assert(!fs.existsSync(output));fs.mkdirSync(output);
 const runtime=await loadBoundedRuntime(),rows=[],sources=[2,11,13,18,29,35,42,52,55,60,100,149,151,187,198];
 for(const id of sources)for(let i=0;i<per;i++){
  const source=runtime.LEVELS.find(l=>l.id===id),seed=518492+i*714731+id*71719,built=tileSingleVacancy(source,{seed,openingArea});
  let result=null;
  if(built.ok){result=singleVacancyGraph(source,built.blocks);const file=`${output}/geometry-${id}-${i}.json`;
   fs.writeFileSync(file,JSON.stringify({sourceLevelId:id,sourceBoard:{width:source.width,height:source.height,cells:boardCells(source)},seed,built,result},null,2)+'\n');
  }
  const row={sourceLevelId:id,index:i,ok:built.ok,reason:built.reason,tilingNodes:built.nodes,states:result?.rawGeometricStates,maxDepth:result?.maxReached,latePairs:result?.latePairs,lateBodies:result?.bodiesWithLatePose,termination:result?.termination};rows.push(row);console.log(JSON.stringify(row));
 }
 fs.writeFileSync(`${output}/report.json`,JSON.stringify({status:'GEOMETRY_RESEARCH_ONLY',accepted:0,formalReady:false,proofSearches:0,productionChanged:false,rows},null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

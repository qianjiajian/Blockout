import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const file='deliverables/daily-formal-v3-20261008/design/macro-prefix64-04/untouched-prefix31-capacity.json';
const runtime=await loadV4Runtime(),rows=[],key=p=>p.join(',');
for(const ref of read(file).rows.filter(r=>r.source!==118&&r.areaFraction>=.35)){
 const p=read(ref.file),level=p.level,route=p.drags;let replay;
 try{runtime.assertPlainProofDomain(level);replay=replayDecorated(runtime,level,route);}catch(e){rows.push({reference:ref.file,source:ref.source,skipped:String(e)});continue;}
 let parking=0,cut=0;while(cut<replay.trace.length&&parking<31){parking+=Number(replay.trace[cut].nonClearing);cut++;}
 const prefix=route.slice(0,cut),touched=new Set(prefix.map(d=>d.blockId)),untouched=level.blocks.filter(b=>!touched.has(b.id));
 const componentBodies=[],todo=new Set(untouched.map(b=>b.id));
 while(todo.size){const ids=[todo.values().next().value];todo.delete(ids[0]);for(let i=0;i<ids.length;i++){
  const cells=absoluteCells(untouched.find(b=>b.id===ids[i]));for(const id of [...todo])if(absoluteCells(untouched.find(b=>b.id===id)).some(([x,y])=>cells.some(([a,b])=>Math.abs(a-x)+Math.abs(b-y)===1))){todo.delete(id);ids.push(id);}}
  componentBodies.push(ids.map(id=>untouched.find(b=>b.id===id)));
 }
 const components=componentBodies.map(bs=>{const cells=bs.flatMap(absoluteCells);return{bodyIds:bs.map(b=>b.id),area:cells.length,fraction:cells.length/boardCells(level).length,
  quadrants:[...new Set(cells.map(([x,y])=>(x<level.width/2?'L':'R')+(y<level.height/2?'T':'B')))],cells};});
 rows.push({reference:ref.file,referenceSha256:sha(ref.file),source:ref.source,width:level.width,height:level.height,area:boardCells(level).length,
  fullReferenceReplay:{complete:replay.complete,U:replay.nonClearingDrags,totalDrags:route.length},prefixDrags:cut,cumulativeParking:parking,
  clearEvents:replay.trace.slice(0,cut).filter(t=>t.clearDelta).map(t=>({drag:t.drag,blockId:t.blockId,clearDelta:t.clearDelta,gateSide:route[t.drag-1].exitSide})),
  untouchedBodies:untouched.length,untouchedArea:untouched.reduce((n,b)=>n+b.shape.length,0),components,
  qualifyingConnectedComponents:components.filter(c=>c.fraction>=.35&&c.bodyIds.length>=8&&c.quadrants.length>=2),
  comments:'Only known route replay and static component enumeration; cumulative parking is not a lower bound or a complete route for any redesigned level.'});
}
const out='deliverables/daily-formal-v4-20261008/design/alternative-prefix-readonly-01.json';
fs.writeFileSync(out,JSON.stringify({status:'READ_ONLY_KNOWN_REFERENCE_CAPACITY',newLevels:0,newClaims:0,newSearches:0,source:{path:file,sha256:sha(file)},rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows.map(({reference,source,prefixDrags,clearEvents,untouchedBodies,untouchedArea,components,qualifyingConnectedComponents,skipped})=>({reference,source,prefixDrags,clearEvents,untouchedBodies,untouchedArea,components:components?.map(c=>({bodies:c.bodyIds.length,area:c.area,fraction:c.fraction})),qualified:qualifyingConnectedComponents?.length,skipped}))));

import fs from 'node:fs';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { loadSpatialApi, searchSpatial, compileSpatial, each } from '../../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../../continuation211-runtime.mjs';
import { plainMonotoneProof } from '../../league-regeneration/plain-monotone-proof.mjs';

const OUT = 'deliverables/daily-formal-v2-20261007/design-lab';
fs.mkdirSync(OUT, { recursive: true });
const bundle = await build({ stdin: { contents: `export { LEVELS } from './src/core/levels.ts';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' });
const { LEVELS } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const spatial = await loadSpatialApi(), runtime = await loadContinuationRuntime();
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const random = n => () => (n = (Math.imul(n,1664525)+1013904223) >>> 0) / 4294967296;
const cells = b => b.shape.map(([x,y]) => [x+b.x,y+b.y]);
const cellKey = p => p.join(',');
const shapeKey = shape => JSON.stringify([...shape].sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const rectangular = shape => shape.length === (1+Math.max(...shape.map(p=>p[0])))*(1+Math.max(...shape.map(p=>p[1])));
function strip(source) {
  return { id: 880000+source.id, name: `每日基础空间实验·主线${source.id}`, difficulty:'super', reward:0,
    width: source.width, height: source.height, timeSeconds: source.timeSeconds, parMoves: source.parMoves,
    mechanismRules:'revised-2026-09-27-v1.5',
    playable: structuredClone(source.playable), blocked: structuredClone(source.blocked),
    blocks: source.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:structuredClone(b.shape),color:b.color})),
    gates: source.gates.filter(g=>!g.star).map(g=>({id:g.id,color:g.color,side:g.side,offset:g.offset,size:g.size,...(g.portals?{portals:structuredClone(g.portals)}:{})})) };
}
function retile(level, r) {
  const threes=level.blocks.filter(b=>b.shape.length===3&&rectangular(b.shape));
  const combos=[];
  for(let i=0;i<threes.length;i++)for(let j=i+1;j<threes.length;j++)for(let k=j+1;k<threes.length;k++){
    const ids=[threes[i],threes[j],threes[k]], all=ids.flatMap(cells);
    const minX=Math.min(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxX=Math.max(...all.map(p=>p[0])),maxY=Math.max(...all.map(p=>p[1]));
    if(maxX-minX===2&&maxY-minY===2&&new Set(all.map(cellKey)).size===9)combos.push({ids,minX,minY});
  }
  if(!combos.length)return {changed:false};
  const {ids,minX,minY}=combos[Math.floor(r()*combos.length)];
  const wasH=ids[0].shape.every(p=>p[1]===0);
  ids.forEach((b,i)=>Object.assign(b,{x:minX+(wasH?i:0),y:minY+(wasH?0:i),shape:wasH?[[0,0],[0,1],[0,2]]:[[0,0],[1,0],[2,0]]}));
  return {changed:true,blockIds:ids.map(b=>b.id),from:wasH?'3 H3':'3 V3',to:wasH?'3 V3':'3 H3'};
}
function recolor(level,r) {
  const colors=[...new Set(level.gates.map(g=>g.color))];
  const neighbors=new Map(level.blocks.map(b=>[b.id,new Set()]));
  for(let i=0;i<level.blocks.length;i++)for(let j=i+1;j<level.blocks.length;j++){
    const a=level.blocks[i],b=level.blocks[j];
    if(cells(a).some(p=>cells(b).some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1))){
      neighbors.get(a.id).add(b.id);neighbors.get(b.id).add(a.id);
    }
  }
  // First retain a real boundary exit as the full-board opening. Remaining
  // colors are independently assigned with adjacency, never a global rename.
  const c=compileSpatial(level,spatial), openings=[];
  for(let i=0;i<c.N;i++)for(const ex of c.blocks[i].poses[c.blocks[i].initial].exits[0])openings.push({block:level.blocks[i],color:ex.gate.color});
  const anchor=openings.length?openings[Math.floor(r()*openings.length)]:null;
  const assigned=new Map(anchor?[[anchor.block.id,anchor.color]]:[]);
  const order=[...level.blocks].filter(b=>!assigned.has(b.id)).sort((a,b)=>neighbors.get(b.id).size-neighbors.get(a.id).size||a.id.localeCompare(b.id));
  const choose=idx=>{if(idx===order.length)return true;const b=order[idx],seen=new Set([...neighbors.get(b.id)].map(id=>assigned.get(id)));const options=colors.map(color=>({color,k:r()})).sort((a,b)=>a.k-b.k);for(const {color} of options){if(seen.has(color))continue;assigned.set(b.id,color);if(choose(idx+1))return true;assigned.delete(b.id);}return false;};
  if(!choose(0))return false;
  for(const b of level.blocks)b.color=assigned.get(b.id);
  return true;
}
const rows=[];
for(const sourceId of [198,4,3,2])for(let attempt=0;attempt<8;attempt++){
  const source=LEVELS[sourceId-1],r=random(sourceId*7919+attempt*65537+17),level=strip(source);
  const row={sourceLevelId:sourceId,attempt,finiteBudget:{routeMs:1500,routeStates:120000,routeTransitions:600000,proofMs:2000,proofStates:60000,proofTransitions:350000},status:'BLOCKED'};
  try{
    row.shapeMutation=attempt?retile(level,r):{changed:false,baseline:true};
    if(attempt&&!recolor(level,r)){row.reason='adjacency-coloring-failed';rows.push(row);continue;}
    if(level.blocks.some(b=>!rectangular(b.shape)))throw Error('not a stage1 rectangle');
    spatial.validateLevel(level);row.levelSha256=hash(level);
    const route=searchSpatial(level,spatial,{floor:100,normalize:true,maxStates:120000,maxTransitions:600000,maxMilliseconds:1500,orderSeed:attempt});
    row.route={status:route.status,U:route.cost??null,termination:route.termination??null,exploredStates:route.exploredStates,transitions:route.attemptedTransitions};
    if(route.status!=='witness'){row.reason='route-not-complete';rows.push(row);console.log(JSON.stringify({sourceId,attempt,...row.route}));continue;}
    const replay=runtime.replayRevisedRoute(level,route.drags);
    row.replay={valid:replay.valid,complete:replay.complete,U:replay.nonClearingDrags,totalDrags:replay.effectiveDrags};
    if(!replay.valid||!replay.complete){row.reason='runtime-replay-failed';rows.push(row);continue;}
    row.reason=replay.nonClearingDrags<16?'hard-lower-refuted-by-witness':'lower-unproven';
    const candidatePath=`${OUT}/plain-${sourceId}-${attempt}.json`;
    fs.writeFileSync(candidatePath,JSON.stringify({sourceLevelId:sourceId,level,drags:route.drags,replay,levelSha256:hash(level),routeSha256:hash(route.drags),eligibility:false},null,2)+'\n');
    row.candidatePath=candidatePath;
    if(replay.nonClearingDrags>=16){
      const floor=replay.nonClearingDrags>=31?31:replay.nonClearingDrags>=21?21:16;
      row.lower=plainMonotoneProof(level,spatial,{floor,maxStates:60000,maxTransitions:350000,maxMilliseconds:2000});
      if(row.lower.thresholdProven){row.status='STATIC_BOUND_AND_ROUTE_READY';row.reason='exact-plain-threshold-proven';}
    }
    rows.push(row);console.log(JSON.stringify({sourceId,attempt,...row.replay,lower:row.lower?.status,cost:row.lower?.cost,status:row.status}));
  }catch(e){row.reason=String(e);rows.push(row);console.log(JSON.stringify({sourceId,attempt,error:String(e)}));}
}
const summary={status:'FINITE_EARLY_DESIGN_PROBE',productionChanged:false,scope:'normal rectangular mainline geometry, all unavailable mechanisms removed; finite local 3x3 rectilinear retile + relational recolor',maxCandidates:32,rows,accepted:rows.filter(r=>r.status==='STATIC_BOUND_AND_ROUTE_READY').map(r=>r.candidatePath)};
fs.writeFileSync(`${OUT}/plain-probe.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({accepted:summary.accepted,attempts:rows.length,witnesses:rows.filter(r=>r.replay?.complete).length,maxWitnessU:Math.max(...rows.map(r=>r.replay?.U??0))}));

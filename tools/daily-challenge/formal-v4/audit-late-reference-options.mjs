import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';

// Read-only reference replay and finite footprint-component analysis. No new
// coloured stock, candidate, solver call, construction attempt or claim.
const out='deliverables/daily-formal-v4-20261008/design/remaining-d2d3-readonly-01/reference-options.json';
assert(!fs.existsSync(out));
const runtime=await loadV4CatalogRuntime(),bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>{const bytes=fs.readFileSync(p);bindings[p]=sha(bytes);return JSON.parse(bytes);};
const prior='deliverables/daily-formal-v3-20261008/design/macro-prefix64-04/untouched-prefix31-capacity.json';
const files=read(prior).rows.map(r=>r.file);
files.push('deliverables/daily-formal-v4-20261008/design/late-prefix-first-math-01/candidate-000.json','deliverables/daily-formal-v4-20261008/design/late-prefix-gate-aware-math-01/candidate-002.json');
function components(blocks){
 const coords=new Map(blocks.flatMap(b=>absoluteCells(b).map(p=>[p.join(','),p]))),remain=new Set(coords.keys()),result=[];
 while(remain.size){const first=remain.values().next().value,queue=[coords.get(first)];remain.delete(first);
  for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(remain.delete(p.join(',')))queue.push(p);
  const keys=new Set(queue.map(p=>p.join(',')));result.push({cells:queue.sort((a,b)=>a[1]-b[1]||a[0]-b[0]),area:queue.length,bodyIds:blocks.filter(b=>absoluteCells(b).some(p=>keys.has(p.join(',')))).map(b=>b.id)});
 }return result.sort((a,b)=>b.area-a.area);
}
const rows=[];
for(const file of files){const q=read(file),level=q.level;try{
 runtime.assertPlainProofDomain(level);const real=replayDecorated(runtime,level,q.drags),independent=independentReplay(runtime,level,q.drags);
 assert(real.valid&&real.complete&&independent.valid&&independent.complete&&real.nonClearingDrags===independent.nonClearingDrags);
 const total=boardCells(level).length,touched=new Set(),options=[];let parking=0;
 for(const frame of real.trace){touched.add(frame.blockId);parking+=Number(frame.nonClearing);
  if(parking<16)continue;
  const untouched=level.blocks.filter(b=>!touched.has(b.id)),cc=components(untouched);
  if(!cc.length)continue;
  const groups=[cc[0],{cells:cc.flatMap(c=>c.cells),bodyIds:cc.flatMap(c=>c.bodyIds),area:cc.reduce((n,c)=>n+c.area,0)}];
  for(const [i,group]of groups.entries()){
   if(group.area/total<.35)continue;if(i===1&&cc.length===1)continue;
   const ids=new Set(group.bodyIds),first=q.drags.findIndex(d=>ids.has(d.blockId));assert(first>=frame.drag);
   const prefix=q.drags.slice(0,first),prefixFrames=real.trace.slice(0,first),clearIds=prefixFrames.filter(f=>f.clearDelta).map(f=>f.blockId);
   const signature=group.bodyIds.slice().sort().join('|');
   if(options.some(o=>o.signature===signature))continue;
   options.push({signature,mode:i===0?'single-connected-region':'complete-multiple-regions',componentAreas:i===0?[group.area]:cc.map(c=>c.area),region:group,
    fraction:group.area/total,initialCut:frame.drag,prefixDrags:first,prefixParking:prefixFrames.filter(f=>f.nonClearing).length,prefixClears:clearIds.length,
    prefixReleasedArea:level.blocks.filter(b=>clearIds.includes(b.id)).reduce((n,b)=>n+b.shape.length,0),
    originalTailParking:real.trace.slice(first).filter(f=>f.nonClearing).length,remainingOriginalBodies:level.blocks.length-clearIds.length,
    prefixSha256:routeSha256(prefix),firstRegionAction:q.drags[first]?.blockId});
  }
 }
 options.sort((a,b)=>b.prefixParking-a.prefixParking||a.fraction-b.fraction||b.prefixDrags-a.prefixDrags);
 rows.push({file,sha256:bindings[file],sourceLevelId:q.sourceLevelId??level.id,levelSha256:levelSha256(level),routeSha256:routeSha256(q.drags),
  width:level.width,height:level.height,boardArea:total,originalBodies:level.blocks.length,fullU:real.nonClearingDrags,fullDrags:q.drags.length,
  fullCanonicalReplay:true,fullIndependentReplay:true,solidRectangles:level.blocks.every(b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])))),
  options:options.map(({signature,...o})=>o)});
 }catch(error){rows.push({file,sha256:bindings[file],error:error.message});}}
const report={status:'READ_ONLY_REFERENCE_ROUTE_AND_LATE_REGION_OPTIONS',rows,inputBindings:bindings,executionEnvironment:prefixExecutionEnvironment(runtime),
 fullBoardSearches:0,newPhysicalInputs:0,ledgerWrites:0,newLowerClaims:0,prefixCostIsNotALowerBound:true,currentRuntimeValidationClaimed:false,formalReady:false};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,rows:rows.map(r=>({...r,options:r.options?.slice(0,3).map(o=>({...o,region:{area:o.region.area,bodyCount:o.region.bodyIds.length}}))}))},null,2));

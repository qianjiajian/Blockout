import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';

// Complete accepted-reference replay only. No newly coloured board is built,
// no attempt helper is imported, and no U/L or construction search is invoked.
const V4='deliverables/daily-formal-v4-20261008',out=`${V4}/design/native-tail-eight-proposal-01`;
assert(!fs.existsSync(out));
const bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>{const b=fs.readFileSync(p);bindings[p]=sha(b);return JSON.parse(b);};
const desc=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const prior=read(`${V4}/design/remaining-d2d3-readonly-01/reference-options.json`);
const low=read(`${V4}/design/low-band-late-options-readonly-01/report.json`);
const supply=read(`${V4}/design/remaining-d2d3-readonly-01/report.json`);
const forbidden=new Set(read(`${V4}/design/remaining-d2d3-readonly-01/supply-conclusion.json`).excludedHistoricalConstructionInputs.map(r=>r.base.path));
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
const references=[...prior.rows.filter(r=>!r.error).map(r=>({path:r.file,sha256:r.sha256})),...low.rows.filter(r=>!r.error&&r.U>=26).map(r=>r.reference)];
const unique=references.filter((r,i,a)=>a.findIndex(x=>x.path===r.path)===i);
function components(blocks){const map=new Map(blocks.flatMap(b=>absoluteCells(b).map(p=>[p.join(','),p]))),todo=new Set(map.keys()),groups=[];
 while(todo.size){const first=todo.values().next().value,queue=[map.get(first)];todo.delete(first);
  for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(todo.delete(p.join(',')))queue.push(p);
  const set=new Set(queue.map(p=>p.join(',')));groups.push({cells:queue.sort((a,b)=>a[1]-b[1]||a[0]-b[0]),bodyIds:blocks.filter(b=>absoluteCells(b).some(p=>set.has(p.join(',')))).map(b=>b.id)});
 }return groups;}
const rectangle=b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])));
const rows=[];
for(const ref of unique){const row={reference:ref,options:[]};rows.push(row);
 const h=supply.rows.find(r=>r.path===ref.path);
 if(forbidden.has(ref.path)||h?.issues.some(x=>['retired-visual-skeleton','family-history-unknown'].includes(x))){row.excluded='historical-failure-or-visual-retirement';continue;}
 try{const q=read(ref.path);assert.equal(bindings[ref.path],ref.sha256);assert(q.accepted);
  const level=q.level;runtime.assertPlainProofDomain(level);
  const actual=replayDecorated(runtime,level,q.drags),independent=independentReplay(runtime,level,q.drags);
  assert(actual.complete&&independent.complete&&actual.nonClearingDrags===independent.nonClearingDrags);
  Object.assign(row,{sourceLevelId:q.sourceLevelId??level.id,levelSha256:levelSha256(level),routeSha256:routeSha256(q.drags),fullU:actual.nonClearingDrags,fullDrags:q.drags.length,
   width:level.width,height:level.height,boardArea:boardCells(level).length,bodies:level.blocks.length,nonrectangleIds:level.blocks.filter(b=>!rectangle(b)).map(b=>b.id),fullCanonicalReplay:true,fullIndependentReplay:true});
  const touched=new Set(),seen=new Set();
  for(const frame of actual.trace){touched.add(frame.blockId);
   for(const region of components(level.blocks.filter(b=>!touched.has(b.id)))){
    if(region.cells.length/row.boardArea<.35)continue;
    const key=levelSha256(region.cells);if(seen.has(key))continue;seen.add(key);
    const ids=new Set(region.bodyIds),fixed=level.blocks.filter(b=>!ids.has(b.id));
    const first=q.drags.findIndex(d=>ids.has(d.blockId));assert(first>=frame.drag);
    const prefix=q.drags.slice(0,first),frames=actual.trace.slice(0,first),cleared=new Set(frames.filter(f=>f.clearDelta).map(f=>f.blockId));
    if(!cleared.size)continue;
    row.options.push({region:{...region,area:region.cells.length,fraction:region.cells.length/row.boardArea,sha256:key,originalBodyCount:region.bodyIds.length,connected:true},
     prefixDrags:first,prefixParking:frames.filter(f=>f.nonClearing).length,prefixClears:cleared.size,prefixReleasedArea:level.blocks.filter(b=>cleared.has(b.id)).reduce((n,b)=>n+b.shape.length,0),
     originalTailParking:actual.trace.slice(first).filter(f=>f.nonClearing).length,remainingOriginalBodies:level.blocks.length-cleared.size,
     prefixSha256:routeSha256(prefix),prefixIsNotLowerBound:true,originalTailNotNewStockWitness:true,
     newRectangleInventoryCompatible:fixed.every(rectangle),retainedNonrectangleIds:fixed.filter(b=>!rectangle(b)).map(b=>b.id)});
   }
  }
  row.options.sort((a,b)=>Number(b.newRectangleInventoryCompatible)-Number(a.newRectangleInventoryCompatible)||b.prefixParking-a.prefixParking||a.remainingOriginalBodies-b.remainingOriginalBodies||a.region.area-b.region.area);
 }catch(e){row.error=e.message;}
}
const report={status:'READ_ONLY_NATIVE_TAIL_REFERENCE_OPTIONS',rows,selection:low.selection,executionEnvironment:environment,currentRuntimeValidationClaimed:false,
 newPhysicalInputs:0,newConstructions:0,newSearches:0,ledgerWrites:0,formalReady:false,bindings};
fs.mkdirSync(out);fs.writeFileSync(`${out}/reference-options.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:desc(`${out}/reference-options.json`),rows:rows.map(r=>({...r,options:r.options.slice(0,2).map(o=>({...o,region:{area:o.region.area,bodies:o.region.originalBodyCount,fraction:o.region.fraction}}))}))},null,2));

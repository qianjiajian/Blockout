import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';

const V4='deliverables/daily-formal-v4-20261008',output=`${V4}/design/next-native-six-readonly-01`;
assert(!fs.existsSync(output));
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
const read=(p,h)=>{const b=fs.readFileSync(p);bindings[p]=sha(b);if(h)assert.equal(bindings[p],h);return JSON.parse(b);};
const descriptor=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const oldOptions=read(`${V4}/design/native-tail-eight-proposal-01/reference-options.json`);
const nativeCompletion=read(`${V4}/design/native-prefix-three-math-01/completion.json`);
const nativeConstruction=read(nativeCompletion.descriptors.index.path,nativeCompletion.descriptors.index.sha256);
assert.equal(nativeConstruction.macro64ActualInputsIncludingThis,51);
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
const references=[...nativeCompletion.accepted,...oldOptions.rows.filter(r=>!r.error&&!r.excluded&&r.fullU>=31&&r.nonrectangleIds.length===0).map(r=>r.reference)]
 .filter((r,i,a)=>a.findIndex(t=>t.path===r.path)===i);
const rectangle=b=>b.shape.length===(Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1);
function components(blocks){const points=new Map(blocks.flatMap(b=>absoluteCells(b).map(p=>[p.join(','),p]))),remaining=new Set(points.keys()),out=[];
 while(remaining.size){const queue=[points.get(remaining.values().next().value)];remaining.delete(queue[0].join(','));
  for(const[x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(remaining.delete(p.join(',')))queue.push(p);
  const cells=queue.sort((a,b)=>a[1]-b[1]||a[0]-b[0]),set=new Set(cells.map(p=>p.join(',')));
  out.push({cells,bodyIds:blocks.filter(b=>absoluteCells(b).every(p=>set.has(p.join(',')))).map(b=>b.id)});
 }return out;
}
const rows=[];
for(const reference of references){const q=read(reference.path,reference.sha256),row={reference,options:[]};rows.push(row);
 try{assert(q.accepted,'Only an already successful reference can be read');runtime.assertPlainProofDomain(q.level);assert(q.level.blocks.every(rectangle));
  const source=q.sourceLevelId??q.level.id,canonical=replayDecorated(runtime,q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
  assert(canonical.complete&&independent.complete&&canonical.nonClearingDrags===independent.nonClearingDrags);
  const nativeSource=runtime.LEVELS.find(l=>l.id===source);assert(nativeSource);assert.equal(boardBaselineSha256(q.level),boardBaselineSha256(nativeSource));
  Object.assign(row,{sourceLevelId:source,sourceLevelSha256:levelSha256(nativeSource),levelSha256:levelSha256(q.level),routeSha256:routeSha256(q.drags),
   L:q.L??q.proof?.certifiedFloor??q.proof?.floor??null,U:canonical.nonClearingDrags,fullDrags:q.drags.length,
   boardArea:boardCells(q.level).length,width:q.level.width,height:q.level.height,boardOutlineSha256:boardBaselineSha256(q.level),
   bodies:q.level.blocks.length,allOriginalBodiesSolidRectangles:true,canonicalComplete:true,independentComplete:true});
  const touched=new Set(),seen=new Set();
  for(const frame of canonical.trace){touched.add(frame.blockId);
   for(const region of components(q.level.blocks.filter(b=>!touched.has(b.id)))){
    if(region.cells.length/row.boardArea<.35)continue;
    const hash=levelSha256(region.cells);if(seen.has(hash))continue;seen.add(hash);
    const ids=new Set(region.bodyIds),cut=q.drags.findIndex(d=>ids.has(d.blockId));assert(cut>=frame.drag);
    const prefix=q.drags.slice(0,cut),trace=canonical.trace.slice(0,cut),exits=trace.filter(t=>t.clearDelta),clearIds=new Set(exits.map(t=>t.blockId));
    if(!clearIds.size)continue;
    const regionBodies=q.level.blocks.filter(b=>ids.has(b.id));assert.equal(regionBodies.flatMap(absoluteCells).length,region.cells.length);
    row.options.push({region:{...region,area:region.cells.length,fraction:region.cells.length/row.boardArea,originalBodyCount:region.bodyIds.length,sha256:hash,connected:true},
     cut,prefixParking:trace.filter(t=>t.nonClearing).length,prefixClears:exits.length,
     prefixReleasedArea:q.level.blocks.filter(b=>clearIds.has(b.id)).reduce((n,b)=>n+b.shape.length,0),
     originalSuffixParking:canonical.trace.slice(cut).filter(t=>t.nonClearing).length,remainingBodies:q.level.blocks.length-clearIds.size,
     prefixSha256:routeSha256(prefix),fixedSkeletonSha256:levelSha256(q.level.blocks.filter(b=>!ids.has(b.id))),
     prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true});
   }
  }
  row.options.sort((a,b)=>b.prefixParking-a.prefixParking||a.originalSuffixParking-b.originalSuffixParking||a.region.area-b.region.area);
 }catch(error){row.error=error.message;}
}
const report={status:'READ_ONLY_NEXT_NATIVE_REFERENCE_REGIONS',rows,currentMacroInputs:51,maximumCombinedInputs:64,
 referenceScope:'All referenced inputs are existing accepted objects; replay reads the existing full routes and does not construct or search any new stock.',
 knownReferencesReplayed:rows.filter(r=>!r.error).length,newPhysicalInputs:0,newConstructions:0,newSearches:0,ledgerWrites:0,
 nativeCompletion:descriptor(`${V4}/design/native-prefix-three-math-01/completion.json`),nativeConstruction:nativeCompletion.descriptors.index,
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,formalReady:false,bindings};
fs.mkdirSync(output);const file=`${output}/reference-regions.json`;fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:descriptor(file),rows:rows.map(r=>({source:r.sourceLevelId,path:r.reference.path,error:r.error,L:r.L,U:r.U,
 options:r.options.slice(0,4).map(o=>({area:o.region.area,cut:o.cut,parking:o.prefixParking,clears:o.prefixClears,tail:o.originalSuffixParking,bodies:o.region.originalBodyCount}))}))},null,2));

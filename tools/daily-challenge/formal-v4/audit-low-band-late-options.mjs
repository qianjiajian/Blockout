import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardCells,absoluteCells,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';

// Only complete successful original routes are replayed. No new input, CSP,
// gameplay search, constructor call, claim or ledger migration is performed.
const V3='deliverables/daily-formal-v3-20261008',V4='deliverables/daily-formal-v4-20261008';
const out=`${V4}/design/low-band-late-options-readonly-01`;assert(!fs.existsSync(out));
const bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>{const bytes=fs.readFileSync(p);bindings[p]=sha(bytes);return JSON.parse(bytes);};
const desc=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
const selectionPath=`${V4}/selection/gate-aware-basic-147-01/index.json`,selection=read(selectionPath);assert.equal(selection.files.length,147);
const selected=selection.files.map(p=>{const q=read(p);assert(q.accepted);return{...desc(p),formalId:q.formalId,sourceLevelId:q.sourceLevelId,difficulty:q.difficulty};});
const supplyPath=`${V4}/design/remaining-d2d3-readonly-01/report.json`,supply=read(supplyPath);
const excluded=new Set(read(`${V4}/design/remaining-d2d3-readonly-01/supply-conclusion.json`).excludedHistoricalConstructionInputs.map(r=>r.base.path));
const refs=supply.rows.filter(r=>[1,2].includes(r.difficulty)&&r.plain&&r.acceptedPublicReceiptBound&&r.liveFamilyRoots.length&&!r.journal.issues.length&&!excluded.has(r.path));
function components(blocks){const cells=new Map(blocks.flatMap(b=>absoluteCells(b).map(p=>[p.join(','),p]))),remaining=new Set(cells.keys()),result=[];
 while(remaining.size){const key=remaining.values().next().value,queue=[cells.get(key)];remaining.delete(key);
  for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(remaining.delete(p.join(',')))queue.push(p);
  const set=new Set(queue.map(p=>p.join(',')));result.push({cells:queue.sort((a,b)=>a[1]-b[1]||a[0]-b[0]),bodyIds:blocks.filter(b=>absoluteCells(b).some(p=>set.has(p.join(',')))).map(b=>b.id)});
 }return result.sort((a,b)=>b.cells.length-a.cells.length);}
const rectangle=b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])));
const rows=[];
for(const ref of refs){const q=read(ref.path),level=q.level,row={reference:desc(ref.path),sourceLevelId:ref.sourceLevelId,difficulty:ref.difficulty,L:ref.L,U:ref.U,
 occupiedFamilies:ref.liveFamilyRoots,options:[]};try{
 assert(q.accepted&&q.levelSha256===levelSha256(level));runtime.assertPlainProofDomain(level);
 const ledger=`${V3}/proof/attempts`,request=read(`${ledger}/${q.attempt.id}.request.json`),result=read(`${ledger}/${q.attempt.id}.result.json`);
 assert.deepEqual(request,q.attempt);assert.equal(result.accepted,true);assert.equal(result.levelSha256,q.levelSha256);
 assert(!fs.existsSync(`${ledger}/${q.attempt.id}.blocked.json`));assert(!fs.existsSync(`${ledger}/identities/${request.retryIdentitySha256}.blocked.json`));
 const actual=replayDecorated(runtime,level,q.drags),independent=independentReplay(runtime,level,q.drags);assert(actual.complete&&independent.complete&&actual.nonClearingDrags===independent.nonClearingDrags);
 assert.equal(actual.nonClearingDrags,ref.U);const bandMax=ref.difficulty===1?20:30,minPrefix=ref.difficulty===1?12:17;
 const source=runtime.LEVELS.find(l=>l.id===ref.sourceLevelId);assert(source);assert.equal(boardBaselineSha256(source),boardBaselineSha256(level));
 row.boardArea=boardCells(level).length;row.width=level.width;row.height=level.height;row.bodyCount=level.blocks.length;row.fullRouteSha256=routeSha256(q.drags);
 row.fullActualReplay={canonical:true,independent:true,U:actual.nonClearingDrags,drags:q.drags.length};row.allOriginalShapesRectangle=level.blocks.every(rectangle);
 const inventory=inventorySummary(level,runtime);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);row.normalSourceAndNativeAssets=true;
 const touched=new Set();let parking=0;
 for(const f of actual.trace){touched.add(f.blockId);parking+=Number(f.nonClearing);if(parking<minPrefix)continue;
  for(const region of components(level.blocks.filter(b=>!touched.has(b.id)))){
   const fraction=region.cells.length/row.boardArea;if(fraction<.35)continue;
   const ids=new Set(region.bodyIds),cut=q.drags.findIndex(d=>ids.has(d.blockId));assert(cut>=f.drag);
   const fixed=level.blocks.filter(b=>!ids.has(b.id));if(!fixed.every(rectangle))continue;
   const regionKey=levelSha256(region.cells);if(row.options.some(o=>o.regionSha256===regionKey))continue;
   const prefixFrames=actual.trace.slice(0,cut),prefixParking=prefixFrames.filter(t=>t.nonClearing).length;
   if(prefixParking>bandMax)continue;
   const clears=new Set(prefixFrames.filter(t=>t.clearDelta).map(t=>t.blockId)),releasedArea=level.blocks.filter(b=>clears.has(b.id)).reduce((n,b)=>n+b.shape.length,0);
   row.options.push({region,regionSha256:regionKey,area:region.cells.length,fraction,oldBodies:ids.size,connected:true,
    prefixDrags:cut,prefixParking,prefixClears:clears.size,prefixReleasedArea:releasedArea,remainingOriginalBodies:level.blocks.length-clears.size,
    originalTailParking:actual.nonClearingDrags-prefixParking,newTailParkingAllowance:bandMax-prefixParking,
    prefixSha256:routeSha256(q.drags.slice(0,cut)),unchangedOuterShapesAllRectangle:true,prefixIsNotALowerBound:true});
  }
 }
 row.options.sort((a,b)=>b.prefixParking-a.prefixParking||a.originalTailParking-b.originalTailParking||b.prefixClears-a.prefixClears||a.fraction-b.fraction);
 }catch(error){row.error=error.message;}rows.push(row);
}
const report={status:'READ_ONLY_LOW_BAND_COMPLETE_REFERENCE_REGION_OPTIONS',selection:desc(selectionPath),selected,sourceAudit:desc(supplyPath),rows,
 thresholdsAreSelectionHeuristics:{minimumPrefixParkingD1:12,minimumPrefixParkingD2:17,minimumChangedRegionFraction:.35},
 counts:{references:rows.length,withRegions:rows.filter(r=>r.options.length).length,byBand:[1,2].map(d=>rows.filter(r=>r.difficulty===d&&r.options.length).length)},
 noNewCandidateDifficultyClaim:true,completeReferenceRouteIsNotNewStockU:true,executionEnvironment:environment,currentRuntimeValidationClaimed:false,
 newConstructions:0,newSearches:0,ledgerWrites:0,formalReady:false,inputBindings:bindings};
fs.mkdirSync(out);fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,counts:report.counts,rows:rows.filter(r=>r.options.length).map(r=>({...r,occupiedFamilies:undefined,options:r.options.slice(0,2).map(o=>({...o,region:undefined}))}))},null,2));

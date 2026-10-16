import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {tileSingleVacancy,singleVacancyGraph} from './design-single-vacancy.mjs';
import {colourDelayedVacancy} from './design-vacancy-colouring.mjs';
import {layerCoverage,targetGeometryChain} from './design-vacancy-retile-candidates.mjs';
import {boardCells,absoluteCells,inventorySummary} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';

export const VERSION='independent-single-vacancy-fixed-seeds-v1';
export const SOURCES=[2,11,13,18,29,35,42,52,55,60,100,149,151,187,198];
const ROOT='deliverables/daily-formal-v3-20261008',DESIGN=`${ROOT}/design`;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bind=p=>({path:p,sha256:sha(p)});
const write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const normalized=s=>{const x=Math.min(...s.map(p=>p[0])),y=Math.min(...s.map(p=>p[1]));return s.map(p=>[p[0]-x,p[1]-y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);};

/** Conservative geometry identity: colours, names and IDs cannot reset a stock. */
export function geometryStockFingerprint(source,blocks){
 const board={width:source.width,height:source.height,cells:boardCells(source).map(p=>p.join(',')).sort()},
  footprints=blocks.map(b=>absoluteCells(b).map(p=>p.join(',')).sort()).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
  shapes=blocks.map(b=>normalized(b.shape)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return{stockSha256:levelSha256({board,footprints,shapes}),footprintsSha256:levelSha256({board,footprints}),shapeInventorySha256:levelSha256(shapes)};
}

/** Current graph completes each held BFS before any board-budget return. */
export function graphMicroCounts(result){
 assert(Number.isSafeInteger(result.attempted)&&result.attempted>=0&&result.attempted%4===0);
 return{microDiscoveredStates:result.attempted/4,microExpandedStates:result.attempted/4,microNeighbourChecks:result.attempted,
  measurement:'Exact derived count: each completely processed held-BFS state visits four directions; all held BFS queues exhaust before committed-board pre-guard.'};
}

function priorStockCensus(runtime){
 const records=[],seen=new Map();
 const files=fs.readdirSync(DESIGN,{recursive:true}).map(p=>String(p).replaceAll('\\','/')).filter(p=>/^geometry[^/]*\.json$/.test(p.split('/').at(-1))).sort();
 for(const file of files){
  const path=`${DESIGN}/${file}`,x=read(path);if(!x.built?.ok||!x.built.blocks||!x.sourceLevelId)continue;
  const source=runtime.LEVELS.find(s=>s.id===x.sourceLevelId);assert(source);
  const fingerprint=geometryStockFingerprint(source,x.built.blocks),record={...bind(path),sourceLevelId:x.sourceLevelId,...fingerprint,
   priorTermination:x.result?.termination??null,priorRawStates:x.result?.rawGeometricStates??null};
  records.push(record);seen.set(fingerprint.stockSha256,record);
 }
 // Failed inventories in this runner are kept in the immutable plan even
 // though only qualified graphs retain their large parent/position queue.
 for(const name of fs.readdirSync(DESIGN).filter(x=>x.startsWith('single-vacancy-independent-'))){
  const path=`${DESIGN}/${name}/plan.json`;if(!fs.existsSync(path))continue;
  const p=read(path);for(const x of p.inputs??[])if(x.built?.ok){
   const source=runtime.LEVELS.find(s=>s.id===x.sourceLevelId),fingerprint=geometryStockFingerprint(source,x.built.blocks),record={...bind(path),inputIndex:x.index,sourceLevelId:x.sourceLevelId,...fingerprint,priorTermination:'previous-stock-reservation'};
   records.push(record);seen.set(fingerprint.stockSha256,record);
  }
 }
 return{records,seen};
}

function nearest(level,rows,limit){let maximum=0,path=null;for(const row of rows){const v=compareLayouts(level,row.level).footprintSimilarity;if(v>maximum){maximum=v;path=row.path;}}return{pass:maximum<=limit,maximum,path,limit};}

async function main(){
 const[label='single-vacancy-independent-03']=process.argv.slice(2);assert(/^single-vacancy-independent-[a-z0-9-]+$/.test(label));
 const output=`${DESIGN}/${label}`;assert(!fs.existsSync(output),'Previous stock batches cannot restart');
 const runtime=await loadBoundedRuntime(),history=priorStockCensus(runtime),inputs=[];
 const colourTool='tools/daily-challenge/formal-v3/design-vacancy-colouring.mjs';
 assert.equal(sha(colourTool),'0f23ec15ca9ffc714683a5be7e74d0451ef86f0b5233706df97c1cab5e8534af');
 const selectedPath=`ROOT/selection/nearband21-selected/index.json`.replace('ROOT',ROOT),selected=read(selectedPath).files.map(path=>({path,level:read(path).level}));
 const oldPath='deliverables/daily-formal-v2-20261007/final-qualified/index.json',old=read(oldPath).entries.map(x=>({path:x.path,level:read(x.path).level}));
 // Enumerate i round-robin to favor different normal masks before using a
 // second seed of the same source. Every seed is the original formula.
 for(let i=4;i<=11;i++)for(const sourceLevelId of SOURCES){
  const source=runtime.LEVELS.find(s=>s.id===sourceLevelId),seed=518492+i*714731+sourceLevelId*71719,
   built=tileSingleVacancy(source,{seed,maxNodes:10000,openingArea:2}),fingerprint=built.ok?geometryStockFingerprint(source,built.blocks):null,
   duplicate=fingerprint?history.seen.get(fingerprint.stockSha256):null;
  const input={index:inputs.length,sourceLevelId,sourceLevelSha256:levelSha256(source),sourceBoard:{width:source.width,height:source.height,cells:boardCells(source)},i,seed,built,fingerprint,
   duplicate:duplicate??null};inputs.push(input);
  if(fingerprint&&!duplicate)history.seen.set(fingerprint.stockSha256,{batch:label,inputIndex:input.index,sourceLevelId,stockSha256:fingerprint.stockSha256});
 }
 assert.equal(inputs.length,120);
 fs.mkdirSync(output,{recursive:true});fs.mkdirSync(`${output}/snapshots`);
 const tools=['tools/daily-challenge/formal-v3/design-vacancy-independent-pool.mjs','tools/daily-challenge/formal-v3/design-single-vacancy.mjs',colourTool,
  'tools/daily-challenge/formal-v3/design-vacancy-retile-candidates.mjs','tools/daily-challenge/formal-v3/diversity.mjs'].map((p,i)=>{
   const snapshot=`${output}/snapshots/${i}-${p.split('/').at(-1)}`;fs.copyFileSync(p,snapshot,fs.constants.COPYFILE_EXCL);return{...bind(p),snapshot,snapshotSha256:sha(snapshot)};});
 write(`${output}/prior-stock-census.json`,{status:'READ_ONLY_OLD_GEOMETRY_AND_RETILE_INPUT_CENSUS',count:history.records.length,records:history.records});
 const plan={version:VERSION,accepted:0,formalReady:false,proofSearches:0,maximumGeometryCalls:120,maximumNewIndependentFamilies:6,
  sources:SOURCES,seedIndices:[4,5,6,7,8,9,10,11],seedFormula:'518492 + i * 714731 + sourceLevelId * 71719',openingArea:2,
  geometryBudget:{maxStates:9999,maxDepth:45},tilingBudget:{maxNodes:10000},colourBudget:{floor:31,minimumPoseDepth:32,maxLayouts:200,maxColourNodes:10000},
  priorStockCensus:bind(`${output}/prior-stock-census.json`),selected:bind(selectedPath),old450:bind(oldPath),tools,inputs};
 write(`${output}/plan.json`,plan);
 const rows=[],records=[];let geometryCalls=0;
 for(const input of inputs){
  if(records.length>=6)break;
  const row={index:input.index,sourceLevelId:input.sourceLevelId,i:input.i,seed:input.seed,tilingNodes:input.built.nodes,fingerprint:input.fingerprint};
  if(!input.built.ok)row.status='TILING_NOT_BUILT';
  else if(input.duplicate){row.status='OLD_OR_RESERVED_STOCK_REJECTED_BEFORE_GEOMETRY';row.duplicate=input.duplicate;}
  else{
   const source=runtime.LEVELS.find(s=>s.id===input.sourceLevelId),start=performance.now(),result=singleVacancyGraph(source,input.built.blocks,plan.geometryBudget);geometryCalls++;
   assert(result.rawGeometricStates<=9999&&result.expanded<=9999);
   const latePairs32=result.earliest.reduce((n,x)=>n+x.filter(d=>d>=32).length,0),coverage=layerCoverage(result),micro=graphMicroCounts(result);
   Object.assign(row,{status:'NO_QUALIFIED_COLOUR_CONSTRUCTION',rawGeometricStates:result.rawGeometricStates,expanded:result.expanded,maxReached:result.maxReached,
    termination:result.termination,latePairs32,layerCoverage:coverage,micro,geometryElapsedMilliseconds:performance.now()-start});
   if(latePairs32>0&&coverage.complete&&result.termination!=='construction-state-budget'){
    const geometry={sourceLevelId:source.id,sourceBoard:input.sourceBoard,seed:input.seed,i:input.i,built:input.built,result,
     geometryOnly:true,puzzleProof:false,stockFingerprint:input.fingerprint,layerCoverage:coverage,budget:plan.geometryBudget,micro};
    const made=colourDelayedVacancy(geometry,source,runtime,{floor:31,seed:4919383+input.index*92173,maxLayouts:200,maxColourNodes:10000});
    row.colouring={ok:made.ok,reason:made.reason,layouts:made.layouts,nodes:made.totalNodes};
    if(made.ok){
     const inv=inventorySummary(made.level,runtime);assert.equal(inv.nonNativeOrMissingArtIds.length,0);
     const comparisons={selected:nearest(made.level,selected,.65),old450:nearest(made.level,old,.75),source:nearest(made.level,[{path:`mainline:${source.id}`,level:source}],.55),
      batchFamilies:nearest(made.level,records.map(r=>({path:r.path,level:read(r.path).level})),.65)};
     row.comparisons=comparisons;row.colouredLevelSha256=levelSha256(made.level);row.colouredDesignFingerprints=designFingerprints(made.level);
     if(Object.values(comparisons).every(c=>c.pass)){
      const suffix=String(input.index).padStart(4,'0'),geometryPath=`${output}/geometry-${suffix}.json`;write(geometryPath,geometry);
      const packet={...made,accepted:false,formalReady:false,status:'NEW_INDEPENDENT_COLOURED_STOCK_PENDING_FIRST_PROOF',proofSearches:0,
       levelSha256:levelSha256(made.level),sourceLevelId:source.id,sourceLevelSha256:input.sourceLevelSha256,sourceGeometry:bind(geometryPath),
       geometryChain:targetGeometryChain(geometry,made.geometryTarget),stockFingerprint:input.fingerprint,fingerprints:designFingerprints(made.level),comparisons,
       familyRoot:{batch:label,inputIndex:input.index,stockSha256:input.fingerprint.stockSha256},familyMaximumAccepted:1,
       provenance:{strategy:VERSION,independentWholeBoardConstruction:true,sourceTemplateCopied:false,sourceBoardExactlyRetained:true,
        sourceBodyCount:source.blocks.length,candidateBodyCount:made.level.blocks.length,sourceInventoryAdapted:true,
        seed:input.seed,seedIndex:input.i,tilingNodes:input.built.nodes,inputPlan:bind(`${output}/plan.json`),toolBindings:tools,geometryNotDifficultyProof:true}};
      const candidatePath=`${output}/candidate-${suffix}.json`;write(candidatePath,packet);
      records.push({path:candidatePath,fileSha256:sha(candidatePath),sourceLevelId:source.id,levelSha256:packet.levelSha256,geometry:packet.sourceGeometry,
       stockFingerprint:input.fingerprint,geometryTarget:made.geometryTarget,accepted:false,pendingFirstProof:true,independentWholeBoardFamily:true,familyMaximumAccepted:1});
      row.status='NEW_INDEPENDENT_COLOURED_STOCK_PENDING_FIRST_PROOF';row.candidate=bind(candidatePath);
     }
    }
   }
  }
  rows.push(row);fs.appendFileSync(`${output}/rows.jsonl`,JSON.stringify(row)+'\n');
  console.log(JSON.stringify({index:row.index,source:row.sourceLevelId,i:row.i,status:row.status,raw:row.rawGeometricStates,depth:row.maxReached,latePairs32:row.latePairs32,geometryCalls,kept:records.length}));
 }
 const report={version:VERSION,status:'BOUNDED_GEOMETRY_CONSTRUCTION_BATCH_FINISHED',accepted:0,formalReady:false,proofSearches:0,geometryCalls,
  maximumRawGeometricStates:Math.max(0,...rows.map(r=>r.rawGeometricStates??0)),maximumMicroStates:Math.max(0,...rows.map(r=>r.micro?.microDiscoveredStates??0)),
  independentFamilies:records.length,sourceCount:new Set(records.map(r=>r.sourceLevelId)).size,inputsPlanned:inputs.length,inputsProcessed:rows.length,
  plan:bind(`${output}/plan.json`),records,rows,scope:'Geometry and static colouring only; all complete-route, lower-bound, final-art, mechanism and Pointer acceptance remain pending.'};
 write(`${output}/report.json`,report);write(`${output}/index.json`,{accepted:0,formalReady:false,proofSearches:0,report:bind(`${output}/report.json`),records});
 console.log(JSON.stringify({output,geometryCalls,independentFamilies:records.length,sourceCount:report.sourceCount,proofSearches:0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

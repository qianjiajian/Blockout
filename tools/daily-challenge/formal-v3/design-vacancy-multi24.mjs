import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardCells} from './diversity-layout-factory.mjs';
import {tileSingleVacancy,singleVacancyGraph} from './design-single-vacancy.mjs';
import {geometryStockFingerprint} from './design-vacancy-independent-pool.mjs';
import {layerCoverage} from './design-vacancy-retile-candidates.mjs';
import {constructVacancyRouteColouringMulti} from './design-vacancy-route-colouring-multi.mjs';
import {compareLayouts} from './diversity.mjs';

const ROOT='deliverables/daily-formal-v3-20261008',DESIGN=`${ROOT}/design`,label=process.argv[2]??'vacancy-multi24-03',out=`${DESIGN}/${label}`;
assert(/^vacancy-multi24-[a-z0-9-]+$/.test(label));assert(!fs.existsSync(out),'No batch may overwrite or resume');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,sha256:sha(p)}),read=p=>JSON.parse(fs.readFileSync(p,'utf8')),
 write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const helper='tools/daily-challenge/formal-v3/design-vacancy-route-colouring-multi.mjs';
assert.equal(sha(helper),'9619104dfd83ca8a59795ad2dafb41747fd86e547c579af20aef9245325491f7');
const qualificationPath=`${ROOT}/proof/vacancy-multi-independent-v1/report.json`,qualification=read(qualificationPath);
assert.equal(qualification.status,'INDEPENDENT_MULTI_CONSTRUCTOR_QUALIFICATION_COMPLETE');assert.equal(qualification.toolBindings[helper],sha(helper));
assert(qualification.evidence.length>0&&qualification.evidence.every(x=>x.passed));
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const selectedPath=`${ROOT}/selection/macro-fixed64-03-selected/index.json`,selected=read(selectedPath).files.map(path=>({path,level:read(path).level})),
 oldPath='deliverables/daily-formal-v2-20261007/final-qualified/index.json',old=read(oldPath).entries.map(x=>({path:x.path,level:read(x.path).level}));
const nearest=(level,rows,limit)=>{let maximum=0,path=null;for(const r of rows){const v=compareLayouts(level,r.level).footprintSimilarity;if(v>maximum){maximum=v;path=r.path;}}return{maximum,path,limit,pass:maximum<=limit};};
const maskKey=s=>levelSha256({width:s.width,height:s.height,cells:boardCells(s)}),historical=new Map(),inventories=new Set();
const remember=(s,b,binding)=>{const f=geometryStockFingerprint(s,b);historical.set(f.stockSha256,binding);inventories.add(`${maskKey(s)}:${f.shapeInventorySha256}`);};
for(const rel of fs.readdirSync(DESIGN,{recursive:true}).map(x=>String(x).replaceAll('\\','/')).filter(p=>/^geometry[^/]*\.json$/.test(p.split('/').at(-1)))){
 const p=`${DESIGN}/${rel}`,g=read(p);if(g.built?.ok&&g.sourceLevelId)remember(runtime.LEVELS.find(s=>s.id===g.sourceLevelId),g.built.blocks,bind(p));
}
for(const name of fs.readdirSync(DESIGN).filter(n=>n.startsWith('single-vacancy-independent-')||n.startsWith('vacancy-multi24-'))){const path=`${DESIGN}/${name}/plan.json`;if(!fs.existsSync(path))continue;
 for(const x of read(path).inputs??[])if(x.built?.ok)remember(runtime.LEVELS.find(s=>s.id===x.sourceLevelId),x.built.blocks,{...bind(path),index:x.index});}
const sources=[198,149,118,100,60,29,35,18,115,80,124,151],inputs=[],tilingTrials=[];
// At most five static exact-cover seeds per declared slot. These are tiling
// search nodes, not held-action or whole-board puzzle search. Stop at the first
// genuinely new shape inventory and partition; no geometry is run here.
for(let round=0;round<2;round++)for(const[sourceIndex,sourceLevelId]of sources.entries()){
 const source=runtime.LEVELS.find(s=>s.id===sourceLevelId),slot=round*sources.length+sourceIndex;
 for(let trial=0;trial<5;trial++){
  const seed=7921309+slot*391621+sourceLevelId*71719+trial*911921,built=tileSingleVacancy(source,{seed,maxNodes:10000,openingArea:2}),
   fingerprint=built.ok?geometryStockFingerprint(source,built.blocks):null,preview=built.ok?{...source,blocks:built.blocks.map(b=>({...b,color:'red'})),gates:[]}:null;
  let rejection=built.ok?null:built.reason;
  if(fingerprint&&historical.has(fingerprint.stockSha256))rejection='old-geometry-stock';
  if(fingerprint&&inventories.has(`${maskKey(source)}:${fingerprint.shapeInventorySha256}`))rejection='old-shape-inventory-on-same-mask';
  if(preview&&designFingerprints(preview).shapeSha256===designFingerprints(source).shapeSha256)rejection='source-shape-inventory-unchanged';
  const comparisons=preview?{selected:nearest(preview,selected,.65),old450:nearest(preview,old,.75),source:nearest(preview,[{path:`mainline:${sourceLevelId}`,level:source}],.55)}:null;
  if(comparisons&&!Object.values(comparisons).every(x=>x.pass))rejection='static-similarity';
  tilingTrials.push({slot,trial,sourceLevelId,seed,built,fingerprint,comparisons,rejection,geometryCalls:0});
  if(rejection)continue;
  inputs.push({index:slot,sourceLevelId,sourceLevelSha256:levelSha256(source),sourceBoard:{width:source.width,height:source.height,cells:boardCells(source)},
   seed,built,fingerprint,comparisons,tilingTrialIndex:tilingTrials.length-1,wholeBoardFamily:fingerprint.stockSha256});
  remember(source,built.blocks,{batch:label,index:slot});break;
 }
}
assert(inputs.length<=24&&new Set(inputs.map(x=>x.fingerprint.stockSha256)).size===inputs.length);
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(`${out}/snapshots`);
const toolPaths=['tools/daily-challenge/formal-v3/design-vacancy-multi24.mjs',helper,'tools/daily-challenge/formal-v3/design-single-vacancy.mjs',
 'tools/daily-challenge/formal-v3/design-vacancy-independent-pool.mjs','tools/daily-challenge/formal-v3/design-vacancy-retile-candidates.mjs',
 'tools/daily-challenge/formal-v3/diversity-layout-factory.mjs','tools/daily-challenge/formal-v3/diversity.mjs'];
const tools=toolPaths.map((p,i)=>{const snapshot=`${out}/snapshots/${i}-${p.split('/').at(-1)}`;fs.copyFileSync(p,snapshot,fs.constants.COPYFILE_EXCL);return{...bind(p),snapshot,snapshotSha256:sha(snapshot)};});
const plan={status:'FIXED_NEW_GLOBAL_TILING_STOCKS_MAXIMUM_24',accepted:false,formalReady:false,proofSearches:0,maximumGeometryCalls:24,
 actualPlannedInputs:inputs.length,sourceIds:sources,maximumStaticTilingTrials:120,tilingTrials,inputs,
 sharedConstructionBudget:{maxStates:10000,maxMicroStates:3000000,maxTransitions:10000000,maxMilliseconds:30000},
 geometryBudget:{maxStates:9999,maxDepth:45},multiOptions:{paletteSizes:[4,5,6,7,8],maxTargets:3},familyMaximumAccepted:1,
 constructorQualification:bind(qualificationPath),proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
 selected:bind(selectedPath),old450:bind(oldPath),rule:bind('docs/rules/mechanism-rules-v1.154.0.md'),tools};
write(`${out}/plan.json`,plan);
const ledger=`${DESIGN}/vacancy-joint-construction-attempts`;fs.mkdirSync(ledger,{recursive:true});
const rows=[],records=[];let geometryCalls=0,constructorCalls=0;
for(const input of inputs){
 const source=runtime.LEVELS.find(s=>s.id===input.sourceLevelId),stock=input.fingerprint.stockSha256,requestPath=`${ledger}/${stock}.request.json`;
 assert(!fs.existsSync(requestPath),'Old construction input cannot restart');
 const request={stock,startedAt:new Date().toISOString(),inputPlan:bind(`${out}/plan.json`),index:input.index,seed:input.seed,
  shapeInventorySha256:input.fingerprint.shapeInventorySha256,independentWholeBoardFamily:stock,budget:plan.sharedConstructionBudget,multiOptions:plan.multiOptions};write(requestPath,request);
 const row={index:input.index,sourceLevelId:input.sourceLevelId,stock,request:bind(requestPath),accepted:false,status:'CLAIMED'};
 try{
  const started=performance.now();geometryCalls++;const result=singleVacancyGraph(source,input.built.blocks,plan.geometryBudget),
   geometry={sourceLevelId:source.id,sourceBoard:input.sourceBoard,built:input.built,result,elapsedMilliseconds:performance.now()-started,stockFingerprint:input.fingerprint};
  const suffix=String(input.index).padStart(4,'0'),geometryPath=`${out}/geometry-${suffix}.json`;write(geometryPath,geometry);
  Object.assign(row,{geometry:bind(geometryPath),rawGeometry:result.rawGeometricStates,geometryAccounting:{rawFullBoardStates:result.rawGeometricStates,rawExploredStates:result.expanded,
   microDiscoveredStates:result.attempted/4,microExpandedStates:result.attempted/4,attemptedTransitions:result.attempted,elapsedMilliseconds:geometry.elapsedMilliseconds},
   maxReached:result.maxReached,termination:result.termination,latePairs32:result.earliest.reduce((n,ds)=>n+ds.filter(d=>d>=32).length,0),status:'NO_QUALIFIED_LATE_GEOMETRY'});
  if(row.latePairs32&&layerCoverage(result,31).complete&&result.termination!=='construction-state-budget'){
   constructorCalls++;const made=constructVacancyRouteColouringMulti(runtime,source,geometry,{seed:input.seed,budget:plan.sharedConstructionBudget,...plan.multiOptions}),constructionPath=`${out}/construction-${suffix}.json`;
   write(constructionPath,made);Object.assign(row,{construction:bind(constructionPath),status:made.status,reason:made.reason??null,accounting:made.accounting,
    targetCount:made.targets.length,targetSummary:made.targets.map(t=>({target:t.target,reason:t.reason??null,thirdClearBodies:t.secondClearEarlyEligible?.map(x=>x.bodyId)??[],
     palettes:t.palettes.map(p=>({paletteSize:p.paletteSize,reason:p.reason??null,tail:p.tail??null,fixedDomainSha256:p.fixedDomainSha256??null}))}))});
   if(made.status==='COMPLETE_U_CONSTRUCTED_LOWER_PENDING'){
    const fp=designFingerprints(made.level);assert.notEqual(fp.shapeSha256,designFingerprints(source).shapeSha256);assert.notEqual(fp.colorSha256,designFingerprints(source).colorSha256);
    const finalComparisons={selected:nearest(made.level,selected,.65),old450:nearest(made.level,old,.75),source:nearest(made.level,[{path:`mainline:${source.id}`,level:source}],.55)};
    assert(Object.values(finalComparisons).every(x=>x.pass));
    const packet={accepted:false,formalReady:false,status:made.status,sourceLevelId:source.id,sourceLevelSha256:input.sourceLevelSha256,level:made.level,levelSha256:levelSha256(made.level),
     fingerprints:fp,drags:made.drags,U:made.U,L:null,replay:made.replay,independentReplay:made.independentReplay,actualArt:made.actualArt,
     sourceGeometry:bind(geometryPath),constructionWitness:{...bind(constructionPath),accounting:made.accounting,U:made.U},comparisons:finalComparisons,
     wholeBoardFamily:stock,familyMaximumAccepted:1,provenance:{strategy:'new-global-bars-shared-multitarget-joint-tail',independentWholeBoardConstruction:true,
      sourceTemplateCopied:false,sourceBoardExactlyRetained:true,sourceShapeMultisetChanged:true,sourceBodyCount:source.blocks.length,candidateBodyCount:made.level.blocks.length,
      seed:input.seed,tilingNodes:input.built.nodes,inputPlan:bind(`${out}/plan.json`),inputIndex:input.index,toolBindings:tools,proofSearches:0}};
    const candidatePath=`${out}/candidate-${suffix}.json`;write(candidatePath,packet);row.candidate=bind(candidatePath);records.push({path:candidatePath,fileSha256:sha(candidatePath),
     sourceLevelId:source.id,levelSha256:packet.levelSha256,U:made.U,accepted:false,pendingFirstLower:true,wholeBoardFamily:stock});
   }
  }
 }catch(error){row.status='CONSTRUCTION_EXCEPTION_SEALED';row.reason=error.message;row.stack=error.stack;}
 finally{const resultPath=`${ledger}/${stock}.result.json`;write(resultPath,{...row,finishedAt:new Date().toISOString(),routeFound:!!row.candidate,proofSearches:0});
  if(!row.candidate)write(`${ledger}/${stock}.blocked.json`,{stock,status:row.status,reason:row.reason??null,continuedSearchForbidden:true,result:bind(resultPath)});rows.push(row);
  console.log(JSON.stringify({index:row.index,source:row.sourceLevelId,raw:row.rawGeometry,status:row.status,reason:row.reason,late:row.latePairs32,U:row.candidate??null}));}
}
const report={status:'FINITE_MULTI24_CONSTRUCTION_FINISHED_STOP_NO_EXPANSION',accepted:0,formalReady:false,proofSearches:0,actualPlanned:inputs.length,geometryCalls,constructorCalls,
 completeU:records.length,plan:bind(`${out}/plan.json`),rows,records};write(`${out}/report.json`,report);write(`${out}/index.json`,{accepted:0,formalReady:false,proofSearches:0,records,report:bind(`${out}/report.json`)});
console.log(JSON.stringify({output:out,actualPlanned:inputs.length,geometryCalls,constructorCalls,completeU:records.length,proofSearches:0}));

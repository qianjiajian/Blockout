import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {boardCells} from './diversity-layout-factory.mjs';
import {singleVacancyGraph} from './design-single-vacancy.mjs';
import {geometryStockFingerprint} from './design-vacancy-independent-pool.mjs';
import {auditRetile,layerCoverage} from './design-vacancy-retile-candidates.mjs';
import {constructVacancyRouteColouring} from './design-vacancy-route-colouring.mjs';
import {compareLayouts} from './diversity.mjs';

const ROOT='deliverables/daily-formal-v3-20261008',DESIGN=`${ROOT}/design`,label=process.argv[2]??'vacancy-joint-remaining-02',out=`${DESIGN}/${label}`;
assert(/^vacancy-joint-remaining-[a-z0-9-]+$/.test(label));assert(!fs.existsSync(out));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,sha256:sha(p)}),
 write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const helper='tools/daily-challenge/formal-v3/design-vacancy-route-colouring.mjs';
assert.equal(sha(helper),'e5f60dca7c86b72c48c5f8d933e78e9bc96945ccd721bb8220aa20d431a0a967','Qualified helper bytes must be frozen');
const qualificationPath=`${ROOT}/proof/vacancy-joint-independent-v4/report.json`,qualification=read(qualificationPath);
assert.equal(qualification.status,'INDEPENDENT_CONSTRUCTOR_QUALIFICATION_COMPLETE');
assert.equal(qualification.toolBindings[helper],sha(helper));assert(qualification.evidence.every(r=>r.passed));
const runtime=await loadBoundedRuntime(),parentPath=`${DESIGN}/independent-vacancy-plain-tail-01/candidate-0000.json`,parent=read(parentPath),
 familyPath=`${DESIGN}/single-vacancy-independent-03/candidate-0074.json`,family=read(familyPath),source=runtime.LEVELS.find(l=>l.id===family.sourceLevelId);
assert.equal(parent.accepted,false);assert.equal(levelSha256(parent.level),levelSha256(family.level));
const publicBlocked=`${ROOT}/proof/attempts/${parent.attempt.id}.blocked.json`;assert(fs.existsSync(publicBlocked));
const originalPlanPath=`${DESIGN}/vacancy-joint-pilot-01/plan.json`,originalPlan=read(originalPlanPath),
 previousReportPath=`${DESIGN}/vacancy-joint-pilot-01/report.json`,previousReport=read(previousReportPath);
assert.equal(originalPlan.parentAttemptId,parent.attempt.id);assert.equal(originalPlan.inputs.length,5);
assert.equal(previousReport.rows.length,1);assert.equal(previousReport.rows[0].index,0);assert.equal(previousReport.records.length,0);
assert.equal(previousReport.plan.sha256,sha(originalPlanPath),'The original planned stocks cannot drift');
assert.equal(originalPlan.tools.find(t=>t.path===helper).sha256,sha(helper));
const selectedPath=`${ROOT}/selection/macro-opening02-selected/index.json`,selected=read(selectedPath).files.map(path=>({path,level:read(path).level})),
 oldPath='deliverables/daily-formal-v2-20261007/final-qualified/index.json',old=read(oldPath).entries.map(r=>({path:r.path,level:read(r.path).level}));
function nearest(level,rows,limit){let maximum=0,path=null;for(const r of rows){const value=compareLayouts(level,r.level).footprintSimilarity;if(value>maximum){maximum=value;path=r.path;}}return{pass:maximum<=limit,maximum,path,limit};}
const historical=new Map();
for(const rel of fs.readdirSync(DESIGN,{recursive:true}).map(p=>String(p).replaceAll('\\','/')).filter(p=>/^geometry[^/]*\.json$/.test(p.split('/').at(-1)))){
 const file=`${DESIGN}/${rel}`,g=read(file);if(g.built?.ok&&g.sourceLevelId){const s=runtime.LEVELS.find(l=>l.id===g.sourceLevelId),f=geometryStockFingerprint(s,g.built.blocks);historical.set(f.stockSha256,bind(file));}
}
for(const name of fs.readdirSync(DESIGN).filter(n=>n.startsWith('single-vacancy-independent-'))){const file=`${DESIGN}/${name}/plan.json`;if(!fs.existsSync(file))continue;
 for(const input of read(file).inputs??[])if(input.built?.ok)historical.set(input.fingerprint.stockSha256,{...bind(file),index:input.index});}
const variants=originalPlan.inputs.filter(v=>v.index!==0);
assert.equal(variants.length,4);const seen=new Set();
for(const v of variants){assert(auditRetile(parent.level,v.level).pass);assert.deepEqual(geometryStockFingerprint(source,v.level.blocks),v.fingerprint);
 assert(!historical.has(v.fingerprint.stockSha256),'Previously executed geometry cannot continue');assert(!seen.has(v.fingerprint.stockSha256));seen.add(v.fingerprint.stockSha256);}
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(`${out}/snapshots`);
const tools=['tools/daily-challenge/formal-v3/design-vacancy-joint-remaining.mjs',helper,'tools/daily-challenge/formal-v3/design-single-vacancy.mjs',
 'tools/daily-challenge/formal-v2/design-layout-factory.mjs','tools/daily-challenge/formal-v3/design-vacancy-retile-candidates.mjs',
 'tools/daily-challenge/formal-v3/design-vacancy-independent-pool.mjs','tools/daily-challenge/formal-v3/diversity-layout-factory.mjs',
 'tools/daily-challenge/formal-v3/diversity.mjs'].map((p,i)=>{const snapshot=`${out}/snapshots/${i}-${p.split('/').at(-1)}`;fs.copyFileSync(p,snapshot,fs.constants.COPYFILE_EXCL);return{...bind(p),snapshot,snapshotSha256:sha(snapshot)};});
const plan={status:'NEW_SHAPE_STOCKS_ONLY_FIXED_DOMAIN_CONSTRUCTION',accepted:false,formalReady:false,proofSearches:0,parentFailed:bind(parentPath),parentAttemptId:parent.attempt.id,
 constructorQualification:bind(qualificationPath),
 originalStockPlan:bind(originalPlanPath),previousPilot:bind(previousReportPath),excludedPriorInputIndices:[0],
 priorCountCorrection:bind(`${DESIGN}/vacancy-joint-pilot-01/planned-stock-count-correction.json`),
 independentPilotAudit:bind(`${ROOT}/proof/vacancy-joint-pilot-independent-v1.json`),
 selected:bind(selectedPath),old450:bind(oldPath),
 publicFailureBlock:bind(publicBlocked),wholeBoardFamily:bind(familyPath),familyMaximumAccepted:1,sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),
 oldStockIdentities:historical.size,maximumNewGeometryStocks:variants.length,maximumJointTailSearches:variants.length,maximumJointTailSearchesPerStock:1,
 sharedBudget:{maxStates:10000,maxMicroStates:3000000,maxTransitions:10000000,maxMilliseconds:30000},
 geometryBudget:{maxStates:9999,maxDepth:45},productionFloor:31,tools,
 inputs:variants.map(v=>({...v,staticGeometry:auditRetile(parent.level,v.level)}))};
write(`${out}/plan.json`,plan);
const stockLedger=`${DESIGN}/vacancy-joint-construction-attempts`;fs.mkdirSync(stockLedger,{recursive:true});
const rows=[],records=[];let geometryCalls=0,jointTailSearches=0;
for(const input of plan.inputs){
 const comparisons={selected:nearest(input.level,selected,.65),old450:nearest(input.level,old,.75),source:nearest(input.level,[{path:`mainline:${source.id}`,level:source}],.55)};
 if(!Object.values(comparisons).every(r=>r.pass)){rows.push({index:input.index,status:'STATIC_SIMILARITY_REJECTED_NO_SEARCH',comparisons});continue;}
 const stock=input.fingerprint.stockSha256,requestPath=`${stockLedger}/${stock}.request.json`;
 if(fs.existsSync(requestPath)){rows.push({index:input.index,status:'PREVIOUS_STOCK_REJECTED',stock});continue;}
 const seed=6471391+input.index*81671,request={stock,startedAt:new Date().toISOString(),newShapeInventorySha256:designFingerprints(input.level).shapeSha256,
  parentAttemptId:parent.attempt.id,wholeBoardFamily:plan.wholeBoardFamily,inputPlan:bind(`${out}/plan.json`),index:input.index,seed,oneFixedDomain:true,budget:plan.sharedBudget};
 assert.notEqual(request.newShapeInventorySha256,parent.attempt.shapeSha256);write(requestPath,request);
 const row={index:input.index,stock,request:bind(requestPath),comparisons,status:'CLAIMED_NOT_CONSTRUCTED',accepted:false};
 let upper=null;
 try{
 const built={ok:true,blocks:input.level.blocks.map(({id,x,y,shape})=>({id,x,y,shape})),openingArea:2},started=performance.now();geometryCalls++;
 const result=singleVacancyGraph(source,built.blocks,plan.geometryBudget);
 const geometry={sourceLevelId:source.id,sourceBoard:{width:source.width,height:source.height,cells:boardCells(source)},built,result,elapsedMilliseconds:performance.now()-started,
  stockFingerprint:input.fingerprint,oldFailure:plan.parentFailed,newShapeInventorySha256:request.newShapeInventorySha256};
 const suffix=String(input.index).padStart(4,'0'),geometryPath=`${out}/geometry-${suffix}.json`;write(geometryPath,geometry);
 Object.assign(row,{geometry:bind(geometryPath),rawGeometry:result.rawGeometricStates,termination:result.termination,maxReached:result.maxReached,
  geometryAccounting:{rawFullBoardStates:result.rawGeometricStates,rawExploredStates:result.expanded,microDiscoveredStates:result.attempted/4,
   microExpandedStates:result.attempted/4,attemptedTransitions:result.attempted,elapsedMilliseconds:geometry.elapsedMilliseconds},
  latePairs32:result.earliest.reduce((n,ds)=>n+ds.filter(d=>d>=32).length,0),status:'NO_COMPLETE_EARLY_DOMAIN'});
 if(row.latePairs32>0&&layerCoverage(result).complete&&result.termination!=='construction-state-budget'){
  upper=constructVacancyRouteColouring(runtime,source,geometry,{seed,budget:plan.sharedBudget});
  if(upper.fixedDomainSha256)jointTailSearches++;
  row.status=upper.status;row.reason=upper.reason;row.accounting=upper.accounting;row.secondClearEarlyEligible=upper.secondClearEarlyEligible;
  row.fixedDomainSha256=upper.fixedDomainSha256??null;
  row.bottleneck={fixedTarget:upper.fixedTarget??null,secondClearEarlyEligible:upper.secondClearEarlyEligible??null,
   staticGateLayouts:upper.staticGateLayouts??null,selectedGates:upper.fixedDomain?.gates??null,
   perBodyColorDomains:upper.fixedDomain?.domains.map((d,i)=>({bodyId:built.blocks[i+1].id,colors:d.map(j=>upper.fixedDomain.gates[j].color)}))??null,
   tail:upper.tail??null,reason:upper.reason??null,
   limitation:'Only the selected target and fixed gate/colour domain were tried; no claim of general unsolvability or whole-puzzle lower bound.'};
  const upperPath=`${out}/construction-${suffix}.json`;write(upperPath,upper);row.construction=bind(upperPath);
  if(upper.status==='COMPLETE_U_CONSTRUCTED_LOWER_PENDING'){
   const fp=designFingerprints(upper.level),priorColors=new Map(parent.attempt.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),
    changedSharedIds=fp.colorAssignments.filter(b=>priorColors.has(b.id)&&JSON.stringify(b.colors)!==priorColors.get(b.id)).map(b=>b.id);
   assert.notEqual(fp.shapeSha256,parent.attempt.shapeSha256);assert.notEqual(fp.colorSha256,parent.attempt.colorSha256);assert(changedSharedIds.length);
   const packet={accepted:false,formalReady:false,level:upper.level,drags:upper.drags,U:upper.U,L:null,status:upper.status,sourceLevelId:source.id,sourceLevelSha256:plan.sourceLevelSha256,
    levelSha256:levelSha256(upper.level),fingerprints:fp,changedSharedIds,comparisons,replay:upper.replay,independentReplay:upper.independentReplay,actualArt:upper.actualArt,
    constructionWitness:{...bind(upperPath),U:upper.U,accounting:upper.accounting},sourceGeometry:bind(geometryPath),redesignOf:parent.attempt.id,
    provenance:{strategy:'joint-tail-clear-colouring-on-truly-retiled-stock',input:parentPath,inputFileSha256:sha(parentPath),originalWholeBoardRoot:familyPath,
     sourceBoardExactlyRetained:true,changedBodyIds:input.changedIds,wholeBoardFamily:plan.wholeBoardFamily,familyMaximumAccepted:1,newShapeAndActualColor:true,proofSearches:0},
    sourceSimilarity:compareLayouts(source,upper.level).footprintSimilarity};
   const candidatePath=`${out}/candidate-${suffix}.json`;write(candidatePath,packet);records.push({path:candidatePath,fileSha256:sha(candidatePath),sourceLevelId:source.id,U:upper.U,
    levelSha256:packet.levelSha256,redesignOf:parent.attempt.id,accepted:false,pendingFirstLower:true,familyMaximumAccepted:1});row.candidate=bind(candidatePath);
  }
 }
 }catch(error){row.status='CONSTRUCTION_EXCEPTION_SEALED';row.reason=error.message;row.stack=error.stack;}
 finally{
  const outcome={...row,routeFound:!!row.candidate,finishedAt:new Date().toISOString(),proofSearches:0};
  write(`${stockLedger}/${stock}.result.json`,outcome);
  if(!outcome.routeFound)write(`${stockLedger}/${stock}.blocked.json`,{stock,status:row.status,reason:row.reason??null,result:bind(`${stockLedger}/${stock}.result.json`),continuedSearchForbidden:true});
  rows.push(row);console.log(JSON.stringify(row));
 }
}
const report={status:'ALL_FOUR_ACTUAL_REMAINING_PREPLANNED_NEW_STOCKS_FINISHED',accepted:0,formalReady:false,proofSearches:0,geometryCalls,jointTailSearches,
 plan:bind(`${out}/plan.json`),records,rows,familyMaximumAccepted:1};write(`${out}/report.json`,report);write(`${out}/index.json`,{accepted:0,formalReady:false,proofSearches:0,records,report:bind(`${out}/report.json`)});
console.log(JSON.stringify({output:out,geometryCalls,jointTailSearches,completeU:records.length,proofSearches:0}));

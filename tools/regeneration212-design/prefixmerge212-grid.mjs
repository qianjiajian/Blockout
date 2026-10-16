import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {load217WitnessSearch} from './spatial217-witness.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source212-grid`,sourceFile=`${DIR}/scored-candidate212-0.json`,base=JSON.parse(fs.readFileSync(sourceFile));
const changes=[1,2,3,4,5,6];
const api0=await loadSpatialApi(),fast=await load217WitnessSearch({eagerClear:true,preferOpenGates:true}),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra},history=[];
for(const[index,extraChanges]of changes.entries()){
 const level=structuredClone(base.level),file=`${DIR}/prefixmerge212-${index}.json`;if(fs.existsSync(file))throw Error('Never repeatfailedobject');
 const change=[];
 const merge=(ids,id,color)=>{const bodies=level.blocks.filter(b=>ids.includes(b.id.slice(5))),pts=bodies.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y])),x=Math.min(...pts.map(p=>p[0])),y=Math.min(...pts.map(p=>p[1]));level.blocks=level.blocks.filter(b=>!bodies.includes(b));level.blocks.push({id:'l212-'+id,x,y,color,shape:pts.map(([u,v])=>[u-x,v-y])});change.push({ids,id,color});};
 merge(['fill-0','fill-6'],'late-yellow-v2','yellow');
 merge(['fill-1','fill-7'],'late-green-v3','green');
 if(index%3!==0)merge(['fill-9','fill-11'],'late-right-v2',index%3===2?'green':'red');
 if(index>=3){level.blocks.find(b=>b.id==='l212-fill-13').color='red';change.push(['fill-13','red']);}
 level.blocks.find(b=>b.id==='l212-fill-17').color='yellow';change.push(['fill-17','yellow']);
 delete level.mechanismAdaptation.sourceFactsFile;
 level.mechanismAdaptation.change='Targeted late ordinary merges: yellowV2 at0,2, greenV3 at1,2 and optional rightV2. Exact footprint unions preserve every cell; no mechanical body altered. Counts differ by source-authorized retiling. Source7x9/hourglass56 cells adaptedto59 cells: fillcentral internalhole andopenrow3outerends. Keepupper7x2curtain10 andsmall2x2curtain1, redH2ice11, hiddenblueH2bomb40, icegates19/16/11 andordinaryblue. v1.11item5 preserves2bluecoloredcells; bothshellattributes removedwhileordinarybodies arelegally retiled. Smallcurtain/floor movedtobottomx2,y7 withblueH2topyellowH2bottom toprovideactual spatialrelease, originalsourceposition staysrecorded. Nativeordinaryshapes/colors reauthored; firstblueQ2rightbottom. IceH2movedleftbottom, blue2widegate moveddownonecell. HiddenL3 yellow→red becausecoloredfloor blocks itslegal path tolowerleftyellowgate; redrawusesnativeq0existingL3, no removedmechanism. Currentcolorchanges '+JSON.stringify(change);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,change,parentSource:{file:sourceFile,levelSha256:base.levelSha256},formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);packet.search=fast.search(plan,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index,prefixDrags:base.drags.slice(0,20)});if(packet.search.status==='witness'){packet.search.drags=[...base.drags.slice(0,20),...packet.search.drags];try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}if(packet.replay.valid&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){const projection=structuredClone(plan);delete projection.coloredGrids;packet.lowerBound={status:'PROJECTION_DIAGNOSTIC_ONLY',projectionSha256:digest(projection),search:searchSpatial(projection,api,{floor:11,prove:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000})};}}}
 const row={index,levelSha256:packet.levelSha256,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/prefixmerge-history212.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));




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
const changes=[[],[['fill-10','red']],[['fill-10','green']],[['fill-8','red']],[['fill-8','green']],[['fill-0','green']],[['fill-10','red'],['fill-8','green']],[['fill-10','green'],['fill-8','red']]];
const api0=await loadSpatialApi(),fast=await load217WitnessSearch({eagerClear:true,preferOpenGates:true}),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra},history=[];
for(const[index,extraChanges]of changes.entries()){
 const level=structuredClone(base.level),file=`${DIR}/middleblue212-${index}.json`;if(fs.existsSync(file))throw Error('Never repeatfailedobject');
 Object.assign(level.gates.find(g=>g.color==='blue'),{offset:4,portals:[{side:'right',origin:[5,4],size:2}]});
 level.blocks=level.blocks.filter(b=>!['l212-blue-6','l212-blue-4','l212-fill-11','l212-fill-13'].includes(b.id));
 Object.assign(level.blocks.find(b=>b.id==='l212-blue-opening'),{x:4,y:4});
 level.blocks.push({id:'l212-bottom-red-q2',color:'red',x:5,y:7,shape:[[0,0],[1,0],[0,1],[1,1]]});
 delete level.mechanismAdaptation.sourceFactsFile;
 const change=[['fill-1','blue'],['fill-6','blue'],['fill-17','yellow'],['fill-20','blue'],['blue-3','green'],['blue-1','yellow'],['fill-18','green'],...extraChanges];for(const[id,color]of change)level.blocks.find(b=>b.id===`l212-${id}`).color=color;
 level.mechanismAdaptation.change='Source7x9 irregular56→authored59 (fill internalhole, open row3ends). Preserve two full curtains10/1, two blue floor cells, redH2ice11, hiddenblueH2bomb40, green19/red16/yellow11 ice gates and one ordinaryblue gate. Remove two shell properties by v1.11item5, ordinary native inventory retiled. Smallcurtain/floor moved2,7. This family relocates the single ordinary blue aperture to right neck mouth[5,4],span2 and initialblueQ2[4,4]; bottomordinaryQ2 is red. Source gate position and original block inventory are recorded separately, no extra portal or mechanic introduced. Colorchanges '+JSON.stringify(change);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,change,parentSource:{file:sourceFile,levelSha256:base.levelSha256},formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);packet.search=fast.search(plan,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}if(packet.replay.valid&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){const projection=structuredClone(plan);delete projection.coloredGrids;packet.lowerBound={status:'PROJECTION_DIAGNOSTIC_ONLY',projectionSha256:digest(projection),search:searchSpatial(projection,api,{floor:11,prove:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000})};}}}
 const row={index,levelSha256:packet.levelSha256,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/middleblue-history212.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));


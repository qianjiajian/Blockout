import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {nativeWitness64} from './native-witness212-guided.mjs';
import {prefixPayload,runPrefix} from './native-prefix212.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source212-grid`,sourceFile=`${DIR}/q3ice55prefix212-0.json`,base=JSON.parse(fs.readFileSync(sourceFile));
const changes=Array.from({length:8},(_,i)=>i);
const api0=await loadSpatialApi(),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra},history=[];
for(const[index,extraChanges]of changes.entries()){
 const level=structuredClone(base.level),file=`${DIR}/q6middle55prefix212-${index}.json`;if(fs.existsSync(file))throw Error('Never repeatfailedobject');
 delete level.mechanismAdaptation.sourceFactsFile;
 const get=id=>level.blocks.find(b=>b.id==='l212-'+id),change=[];
 level.blocks=level.blocks.filter(b=>b.shutterId||b.y<6&&b.id!=='l212-new-green-t4');
 level.blocks.push({id:'l212-middle-blue-q3',x:2,y:6,color:'blue',shape:Array.from({length:6},(_,i)=>[i%3,Math.floor(i/3)])},{id:'l212-right-red-l3',x:5,y:6,color:'red',shape:[[0,0],[0,1],[1,1]]},{id:'l212-first-blue-s',x:6,y:6,color:'blue',shape:[[0,0]]},{id:'l212-first-blue-h2',x:5,y:8,color:'blue',shape:[[0,0],[1,0]]},{id:'l212-left-red-s',x:0,y:6,color:'red',shape:[[0,0]]},{id:'l212-left-yellow-s',x:1,y:6,color:'yellow',shape:[[0,0]]},{id:'l212-toe-green-s',x:2,y:5,color:'green',shape:[[0,0]]});
 level.blocks.push({id:'l212-bottom-green-h3',x:2,y:8,color:'green',shape:[[0,0],[1,0],[2,0]]});get('left-red-s').color='blue';get('left-yellow-s').color='red';get('blue-3').color='red';
 const sh=level.shutters.find(c=>c.count===1);level.blocks=level.blocks.filter(b=>b.shutterId!==sh.id);level.blocks.push({id:'l212-small-yellow-h2',x:0,y:7,color:'yellow',shape:[[0,0],[1,0]],shutterId:sh.id},{id:'l212-small-red-h2',x:0,y:8,color:'red',shape:[[0,0],[1,0]],shutterId:sh.id});level.coloredGrids[0].cells=[[0,6],[6,0]];
 if(index&1)get('top-d-adapt').color='yellow';
 if(index&2){get('blue-3').color='green';get('toe-green-s').color='yellow';}
 if(index&4)get('fill-10').color='green';
 change.push({smallCurtain:'yellowH2top+redH2bottom',blueFloors:[[0,6],[6,0]],compensatingBlue:'left0,6',sourceInventory:'known small goldS+3empty adaptedfull4cells'});
 change.push({middleBlueQ3:[2,6],rightChamber:'redL3+blueS+blueH2',left:'2coldS',oldT4:'greenSat2,5+retiledbottom',coldColorBits:index});
 level.mechanismAdaptation.change='New 55-cell authored mask and central blue 3x2 rectangle delayed behind right red native L3; green H3 fills central bottom. Top14 and small4 hidden cells full; source two curtains10/1, red H2 ice11, blue H2 bomb40, ice gates19/16/11, two blue grids retained with explicit authored positions. Shell attrs removed for floor priority. Source ordinary shape/color inventory differs. '+JSON.stringify(change);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,change,parentSource:{file:sourceFile,levelSha256:base.levelSha256},formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);let prefix=[];const prefixReplay=replay(level,prefix,api,{timed:true,requirePointerCompatible:true});packet.prefix={length:prefix.length,U:prefixReplay.nonClearingDrags,clears:prefixReplay.clearEvents};packet.search=nativeWitness64(plan,api,{floor:16-prefixReplay.nonClearingDrags,normalize:true,maxMilliseconds:3000,maxStates:350000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index,prefixDrags:prefix});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});for(let n=1;n<=packet.search.drags.length;n++){const r=replay(level,packet.search.drags.slice(0,n),api,{timed:true,requirePointerCompatible:true});if(r.clearEvents>=11){packet.prefix11RouteCost=r.nonClearingDrags;break;}}if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15&&packet.prefix11RouteCost>=11){packet.prefixBound=runPrefix(prefixPayload(plan,api,{goalClears:11,floor:11,maxMilliseconds:6000,maxStates:500000}).p);}}catch(e){packet.replay={valid:false,error:e.message};}}}

 const row={index,levelSha256:packet.levelSha256,prefix:packet.prefix,prefix11:packet.prefix11RouteCost,bound:packet.prefixBound?.status,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/q6middle55prefix-history212.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));


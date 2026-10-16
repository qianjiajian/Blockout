import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {nativeWitness64} from '../continuation211-native-witness64.mjs';
import {prefixPayload,runPrefix} from './native-prefix212.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source212-grid`,sourceFile=`${DIR}/q3blue55prefix212-0.json`,base=JSON.parse(fs.readFileSync(sourceFile));
const changes=Array.from({length:8},(_,i)=>i);
const api0=await loadSpatialApi(),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra},history=[];
for(const[index,extraChanges]of changes.entries()){
 const level=structuredClone(base.level),file=`${DIR}/q3bar55prefix212-${index}.json`;if(fs.existsSync(file))throw Error('Never repeatfailedobject');
 delete level.mechanismAdaptation.sourceFactsFile;
 const get=id=>level.blocks.find(b=>b.id==='l212-'+id),change=[];
 level.blocks=level.blocks.filter(b=>!['l212-fill-4','l212-fill-9','l212-fill-11','l212-blue-4'].includes(b.id));
 level.blocks.push({id:'l212-new-blue-s',x:5,y:2,color:'blue',shape:[[0,0]]},{id:'l212-new-green-s',x:4,y:2,color:'green',shape:[[0,0]]},{id:'l212-new-green-v3',x:5,y:3,color:'green',shape:[[0,0],[0,1],[0,2]]});
 if(index&1){level.blocks=level.blocks.filter(b=>!['l212-fill-12','l212-fill-14','l212-fill-15'].includes(b.id));level.blocks.push({id:'l212-new-green-t4',x:1,y:5,color:'green',shape:[[1,0],[0,1],[1,1],[2,1]]});}
 if(index&2)get('fill-13').color='red';
 if(index&4)get('fill-10').color='red';
 change.push({splitBlueH2:'blueS5,2+greenS4,2',mergedRight:'greenV3',mergedBottomT4:Boolean(index&1),recolored13:Boolean(index&2),recolored10:Boolean(index&4)});
 level.mechanismAdaptation.change='Original55-cell blueQ3 family. Ordinary-blue source span2 adapted to3 for actualQ3 cross-section, keptallsourceice/shutter/bomb/gridcounts. Split ordinaryblueH2 into blueS+greenS; three right coldS mergednativegreenV3; optionalcenter4cells mergednativegreenT4; othercoldcolorschanged. Ordinaryretile andcolors explicit, no newlyadded mechanism kinds. '+JSON.stringify(change);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,change,parentSource:{file:sourceFile,levelSha256:base.levelSha256},formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);let prefix=[];const prefixReplay=replay(level,prefix,api,{timed:true,requirePointerCompatible:true});packet.prefix={length:prefix.length,U:prefixReplay.nonClearingDrags,clears:prefixReplay.clearEvents};packet.search=nativeWitness64(plan,api,{floor:16-prefixReplay.nonClearingDrags,normalize:true,maxMilliseconds:3000,maxStates:350000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index,prefixDrags:prefix});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});for(let n=1;n<=packet.search.drags.length;n++){const r=replay(level,packet.search.drags.slice(0,n),api,{timed:true,requirePointerCompatible:true});if(r.clearEvents>=11){packet.prefix11RouteCost=r.nonClearingDrags;break;}}if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15&&packet.prefix11RouteCost>=11){packet.prefixBound=runPrefix(prefixPayload(plan,api,{goalClears:11,floor:11,maxMilliseconds:6000,maxStates:500000}).p);}}catch(e){packet.replay={valid:false,error:e.message};}}}

 const row={index,levelSha256:packet.levelSha256,prefix:packet.prefix,prefix11:packet.prefix11RouteCost,bound:packet.prefixBound?.status,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/q3bar55prefix-history212.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));


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
const DIR=`${OUT}/source212-grid`,sourceFile=`${DIR}/q3diag55prefix212-1.json`,base=JSON.parse(fs.readFileSync(sourceFile));
const changes=Array.from({length:8},(_,i)=>i);
const api0=await loadSpatialApi(),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra},history=[];
for(const[index,extraChanges]of changes.entries()){
 const level=structuredClone(base.level),file=`${DIR}/q3ice55prefix212-${index}.json`;if(fs.existsSync(file))throw Error('Never repeatfailedobject');
 delete level.mechanismAdaptation.sourceFactsFile;
 const get=id=>level.blocks.find(b=>b.id==='l212-'+id),change=[];
 get('ice11').x=2;get('ice11').y=2;
 get('fill-2').x=2;get('fill-2').y=7;get('fill-2').shape=[[0,0],[1,0]];
 get('fill-3').x=2;get('fill-3').y=3;get('fill-3').color='green';get('fill-7').color='red';
 if(index&1)get('fill-2').color='yellow';
 if(index&2)get('fill-10').color='red';
 if(index&4){get('blue-0').color='yellow';get('small-diag-2').color='red';}
 change.push({numericRedIce11H2:[2,2],ordinaryRedV2:'H2at2,7',ordinaryYellowS:'greenSat2,3',yellowV2ToRed:true,coldColorBits:index});
 level.mechanismAdaptation.change='Source-grounded original55cell/blueQ3+greenV3/T4+fullsmall-diagonal-curtain family. Preserveall sourcecounts, 2bluefloors andbomb40. Move rednumericH2ice11 to2,2; ordinaryredV2 andyellowS retilled redH2at2,7 plusgreenSat2,3; yellowV2toRED becausebluefloor(1,7)blocksall yellowV2 leftgate6..7 approach. Ordinaryblue gate sourcewidth2 torequiredQ3span3 remains explicit. '+JSON.stringify(change);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,change,parentSource:{file:sourceFile,levelSha256:base.levelSha256},formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);let prefix=[];const prefixReplay=replay(level,prefix,api,{timed:true,requirePointerCompatible:true});packet.prefix={length:prefix.length,U:prefixReplay.nonClearingDrags,clears:prefixReplay.clearEvents};packet.search=nativeWitness64(plan,api,{floor:16-prefixReplay.nonClearingDrags,normalize:true,maxMilliseconds:3000,maxStates:350000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index,prefixDrags:prefix});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});for(let n=1;n<=packet.search.drags.length;n++){const r=replay(level,packet.search.drags.slice(0,n),api,{timed:true,requirePointerCompatible:true});if(r.clearEvents>=11){packet.prefix11RouteCost=r.nonClearingDrags;break;}}if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15&&packet.prefix11RouteCost>=11){packet.prefixBound=runPrefix(prefixPayload(plan,api,{goalClears:11,floor:11,maxMilliseconds:6000,maxStates:500000}).p);}}catch(e){packet.replay={valid:false,error:e.message};}}}

 const row={index,levelSha256:packet.levelSha256,prefix:packet.prefix,prefix11:packet.prefix11RouteCost,bound:packet.prefixBound?.status,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/q3ice55prefix-history212.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));


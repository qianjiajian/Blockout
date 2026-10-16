import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {nativeWitness64} from './native-witness212-guided.mjs';
import {emptyPoseExitAudit} from '../regeneration211-design/aux212/empty-pose-exit-audit.mjs';
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
 const level=structuredClone(base.level),file=`${DIR}/deepTop53prefix212-${index}.json`;if(fs.existsSync(file))throw Error('Never repeatfailedobject');
 delete level.mechanismAdaptation.sourceFactsFile;

 const get=id=>level.blocks.find(b=>b.id==='l212-'+id),change=[];
 const hidden=JSON.parse(fs.readFileSync(DIR+'/../top21-partition/hidden-0.json')).level;
 level.playable=structuredClone(hidden.playable);level.playable.push([1,5],[5,5]);level.coloredGrids=structuredClone(hidden.coloredGrids);const top=level.shutters.find(s=>s.count===10),small=level.shutters.find(s=>s.count===1);top.height=3;small.x=0;small.y=7;
 level.blocks=hidden.blocks.map(b=>({...b,shutterId:top.id,...(b.id==='l212-top-bomb40'?{timedBombSeconds:40}:{})}));
 const S=[[0,0]],H2=[[0,0],[1,0]],H3=[[0,0],[1,0],[2,0]],Q3=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]),add=(id,color,x,y,shape,extra={})=>level.blocks.push({id:'l212-'+id,color,x,y,shape,...extra});
 add('blue-q3','blue',4,6,Q3);add('bottom-green-h3','green',1,6,H3);add('ice11','red',2,7,H2,{frozen:11});add('blue-left-s','blue',0,6,S);add('blue-bottom-s','blue',2,8,S);add('bottom-cold-s',(index&1)?'yellow':'green',3,8,S);
 add('small-blue-a','blue',1,7,S,{shutterId:small.id});add('small-blue-b','blue',0,8,S,{shutterId:small.id});add('small-yellow-a','yellow',0,7,S,{shutterId:small.id});add('small-yellow-b','yellow',1,8,S,{shutterId:small.id});
 for(const[x,y]of[[3,3],[2,4],[4,4],[1,5],[3,5]])add('neck-blue-'+x+'-'+y,'blue',x,y,S);
 const cold=[[2,3],[4,3],[3,4],[2,5],[4,5],[5,5]],colors=['red','yellow','green'];let seed=1831+index*107;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};
 function paint(n){if(n===cold.length)return true;const[x,y]=cold[n],order=[...colors];for(let j=2;j>0;j--){const k=rnd(j+1);[order[j],order[k]]=[order[k],order[j]];}for(const color of order){const block={id:'l212-neck-cold-'+n,color,x,y,shape:S};if(adjacency([...level.blocks,block]).length)continue;level.blocks.push(block);if(paint(n+1))return true;level.blocks.pop();}return false;}if(!paint(0))throw Error('No color assignment');
 change.push({newHiddenRegion:[0,0,7,3],newMask:'53 cells top7x3/neck3,3,5/bottom7x3',sourceHidden:'7x2 count10 ->7x3 count10',sourceSmall:'2x2 count1 ->left0,7 full4',sourceFloors:'2 blue -> top5,0/6,0',sourceShells:'remove attributes retain role blocks',authoredOrdinaryColors:index});
 level.mechanismAdaptation.change='Source212 outer7x9 and all mechanism counts preserved; deep top curtain expands14 to21 real cells with native inventory adaptation, 53-cell original contour. Outside exactly8 blue bodies and small2 blue allow count10 release. Blue bomb H2 timed40, red H2 ice11 and gate19/16/11 retained. '+JSON.stringify(change);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 audit.emptyPoseExit=emptyPoseExitAudit(level,api);
 const passed=audit.emptyPoseExit.passed&&audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,change,parentSource:{file:sourceFile,levelSha256:base.levelSha256},formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);let prefix=[];const prefixReplay=replay(level,prefix,api,{timed:true,requirePointerCompatible:true});packet.prefix={length:prefix.length,U:prefixReplay.nonClearingDrags,clears:prefixReplay.clearEvents};packet.search=nativeWitness64(plan,api,{floor:16-prefixReplay.nonClearingDrags,normalize:true,maxMilliseconds:3000,maxStates:350000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index,prefixDrags:prefix});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});for(let n=1;n<=packet.search.drags.length;n++){const r=replay(level,packet.search.drags.slice(0,n),api,{timed:true,requirePointerCompatible:true});if(r.clearEvents>=10){packet.prefix11RouteCost=r.nonClearingDrags;break;}}if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15&&packet.prefix11RouteCost>=8){packet.prefixBound=runPrefix(prefixPayload(plan,api,{goalClears:10,floor:8,maxMilliseconds:6000,maxStates:500000}).p);}}catch(e){packet.replay={valid:false,error:e.message};}}}

 const row={index,levelSha256:packet.levelSha256,prefix:packet.prefix,prefix11:packet.prefix11RouteCost,bound:packet.prefixBound?.status,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/deepTop53prefix-history212.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));


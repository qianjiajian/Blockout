import fs from 'node:fs';
import {nativeWitness64} from './witness-cost60.mjs';
import {loadSpatialApi} from '../../continuation211-colored-witness.mjs';
import {staticDelayedLiftFloor} from '../native-static-lift214.mjs';
import {loadApi,replay} from '../../remake191-200/replay.mjs';
import {sha256} from '../../continuation211-runtime.mjs';
import {adjacency} from '../../regeneration212-design/design212.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {stationaryPayload,stationaryPrefix} from './stationary-prefix.mjs';
const OUT='deliverables/continue211-220-20260930/design-new/aux212/rectangle6-yellow-prefix-v1';fs.mkdirSync(OUT,{recursive:true});
const sourceFile='deliverables/continue211-220-20260930/design212-new/source212-grid/q3redVb55prefix212-6.json',base=JSON.parse(fs.readFileSync(sourceFile)),api=await loadSpatialApi(),strict=(await loadApi()).api,history=[];
for(let n=0;n<8;n++){
 const file=OUT+'/candidate-'+n+'.json';if(fs.existsSync(file))throw Error('Do not repeat candidate');
 const level=structuredClone(base.level),get=id=>level.blocks.find(b=>b.id==='l212-'+id),blue=get('blue-q3');blue.id='l212-blue-native-rectangle6';blue.y=6;blue.shape=[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]];
 level.blocks.push({id:'l212-cold-yellow-h3',color:'yellow',x:4,y:8,shape:[[0,0],[1,0]]});
 level.blocks.push({id:'l212-cold-bottom-s',color:n&4?'green':'red',x:6,y:8,shape:[[0,0]]});get('fill-2').color='red';get('fill-3').color='yellow';get('fill-7').color='green';get('top-f').color='green';get('fill-13').color=n&2?'yellow':'red';get('fill-10').color=n&1?'green':'red';
 const gate=level.gates.find(g=>g.color==='blue');gate.offset=6;gate.size=2;
 delete level.mechanismAdaptation.sourceFactsFile;
 level.mechanismAdaptation.change='Authored original55-cell source-derived geometry, actual Q3 blue9 footprint retiled native blue3x2 rectangle6 at4,6 plus yellowH2 at4,8 and coldS at6,8; blue ordinary gate right source offset6/span2 follows actual board boundary. Source two ordinary curtains10/1, blueH2bomb40, redH2ice11, bluegrid2, gateice19/16/11, M11 unchanged. Ordinary cold colors are finite layout adaptations. '+JSON.stringify({coldColorBits:n});
 const audit={opening:auditOpeningCoverage(new strict.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:adjacency(level.blocks),q0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)};
 if(!audit.opening.passed||!audit.hidden.passed||audit.adjacency.length||!audit.q0)throw Error('Structural issue '+JSON.stringify(audit));
 const plan=structuredClone(level);plan.blocks.forEach(b=>delete b.timedBombSeconds);
 const upper=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000,orderSeed:n}),packet={level,levelSha256:sha256(level),parentSourceFile:sourceFile,audit,upper,finiteBudget:{upperMilliseconds:3000,upperStates:350000,lowerMilliseconds:6000,lowerStates:2000000},formalAdopted:false};
 if(upper.drags){try{packet.drags=upper.drags;packet.replay=replay(level,upper.drags,strict,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}}
 if(packet.replay?.valid&&packet.replay.complete&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){level.preservedMoveTarget=packet.replay.effectiveDrags;plan.preservedMoveTarget=level.preservedMoveTarget;packet.levelSha256=sha256(level);packet.lower=staticDelayedLiftFloor(plan,api,{floor:11,maxMilliseconds:6000,maxStates:2000000});}
 packet.stationaryDiagnostic=stationaryPrefix(stationaryPayload(level,api),{floor:11,maxMilliseconds:1000});
 const row={n,bodies:level.blocks.length,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,max:upper.maxClearsSeen,remaining:upper.partialRemaining,L:packet.lower?.status,frontier:packet.lower?.frontierCost,stationaryMin:packet.stationaryDiagnostic.minimum};history.push(row);console.log(JSON.stringify(row));fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});fs.writeFileSync(OUT+'/history.json',JSON.stringify(history,null,2));if(packet.lower?.thresholdProven)break;
}




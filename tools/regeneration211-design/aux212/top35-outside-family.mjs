import fs from 'node:fs';
import {nativeWitness64} from './witness-cost60.mjs';
import {loadSpatialApi} from '../../continuation211-colored-witness.mjs';
import {loadApi,replay} from '../../remake191-200/replay.mjs';
import {sha256} from '../../continuation211-runtime.mjs';
import {adjacency} from '../../regeneration212-design/design212.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {emptyPoseExitAudit} from './empty-pose-exit-audit.mjs';
import {stationaryPayload,stationaryPrefix} from './stationary-prefix.mjs';
const OUT='deliverables/continue211-220-20260930/design-new/aux212/top35-outside-v1';fs.mkdirSync(OUT,{recursive:true});
const sourceFile='deliverables/continue211-220-20260930/root212-hidden35/hidden-8.json',base=JSON.parse(fs.readFileSync(sourceFile)),api=await loadSpatialApi(),strict=(await loadApi()).api,history=[];
const S=[[0,0]],H2=[[0,0],[1,0]],block=(id,color,x,y,shape,extra={})=>({id:'l212-out-'+id,color,x,y,shape,...extra});
for(let n=0;n<8;n++){
 const file=OUT+'/candidate-'+n+'.json';if(fs.existsSync(file))throw Error('Do not repeat candidate');
 const level=structuredClone(base.level);for(const b of level.blocks)b.shutterId='l212-cover10';level.blocks.find(b=>b.id==='l212-top-bomb40').timedBombSeconds=40;
 level.shutters=[{id:'l212-cover10',x:0,y:0,width:7,height:5,count:10,skin:'shutter'},{id:'l212-cover1',x:0,y:7,width:2,height:2,count:1,skin:'shutter'}];for(const g of level.gates)if(g.color!=='blue')g.frozen={green:19,red:16,yellow:11}[g.color];
 level.blocks.push(block('ice11','red',4,6,H2,{frozen:11}),block('small-blue','blue',0,8,H2,{shutterId:'l212-cover1'}),block('small-cold','yellow',0,7,H2,{shutterId:'l212-cover1'}));
 [[6,6],[6,8],[2,5],[4,5],[0,6],[3,6],[2,7],[4,7],[3,8]].forEach(([x,y],i)=>level.blocks.push(block('blue'+i,'blue',x,y,S)));
 [[3,5,n&1?'red':'yellow'],[3,7,'yellow'],[5,7,'green'],[2,8,'yellow'],[1,6,n&2?'green':'red'],[2,6,n&2?'red':'green'],[4,8,'yellow'],[5,8,'red'],[6,7,n&4?'yellow':'red']].forEach(([x,y,color],i)=>level.blocks.push(block('coldS'+i,color,x,y,S)));
 level.mechanismAdaptation.change='Authored59-cell symmetric top7x5/neck3x1/bottom7x3 geometry with real top curtain7x5/count10 versus source7x2, exact source counters retained and changed curtain footprint explicitly authored. All35 hidden cells/body inventory are certified root hidden35-8, and original projection floor cells0,8/1,8 remain under real small-curtain blueH2 with upperyellowH2. Opening9blueS,9coldS andredH2ice11 at4,6 fully tile remaining20cells. Ordinary bluegate span3 (source2) retained as source-based ordinary-exit spatial adaptation; allicegate counts19/16/11 andblueH2bomb40 preserved. '+JSON.stringify({colors:n});
 const audit={opening:auditOpeningCoverage(new strict.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:adjacency(level.blocks),q0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),necessary:emptyPoseExitAudit(level,api)};
 const packet={level,levelSha256:sha256(level),hiddenSourceFile:sourceFile,hiddenOriginalSha256:base.levelSha256,hiddenBound:base.bound,audit,formalAdopted:false,finiteBudget:{upperMilliseconds:3000,upperStates:350000,prefixMilliseconds:1000,prefixStates:2000000}};
 if(audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&audit.q0&&audit.necessary.passed){const p=stationaryPayload(level,api,{goalClears:10});packet.prefixBound={...stationaryPrefix(p,{floor:4,maxMilliseconds:1000}),goalClears:10,input:p};const plan=structuredClone(level);plan.blocks.forEach(b=>delete b.timedBombSeconds);packet.upper=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000});if(packet.upper.drags){try{packet.drags=packet.upper.drags;packet.replay=replay(level,packet.drags,strict,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}}}
 const row={n,bodies:level.blocks.length,adj:audit.adjacency.length,trap:audit.necessary.trappedBodyIds,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,max:packet.upper?.maxClearsSeen,partialCost:packet.upper?.partialCost,prefix:packet.prefixBound?.status,stationaryMin:packet.prefixBound?.minimum};history.push(row);console.log(JSON.stringify(row));fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});fs.writeFileSync(OUT+'/history.json',JSON.stringify(history,null,2));if(packet.prefixBound?.thresholdProven&&packet.replay?.valid&&packet.replay.complete)break;
}

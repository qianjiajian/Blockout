import fs from 'node:fs';
import {nativeWitness64} from './witness-cost60.mjs';
import {loadSpatialApi} from '../../continuation211-colored-witness.mjs';
import {loadApi,replay} from '../../remake191-200/replay.mjs';
import {sha256} from '../../continuation211-runtime.mjs';
import {adjacency} from '../../regeneration212-design/design212.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {emptyPoseExitAudit} from './empty-pose-exit-audit.mjs';
import {prefixPayload,runPrefix} from '../../regeneration212-design/native-prefix212.mjs';
const OUT='deliverables/continue211-220-20260930/design-new/aux212/top21-outside-v3-v1';fs.mkdirSync(OUT,{recursive:true});
const sourceFile='deliverables/continue211-220-20260930/design212-new/top21-partition/hidden-0.json',base=JSON.parse(fs.readFileSync(sourceFile)),api=await loadSpatialApi(),strict=(await loadApi()).api,history=[];
const S=[[0,0]],H2=[[0,0],[1,0]],V3=[[0,0],[0,1],[0,2]],Q2=[[0,0],[1,0],[0,1],[1,1]],block=(id,color,x,y,shape,extra={})=>({id:'l212-out-'+id,color,x,y,shape,...extra});
for(let n=0;n<8;n++){
 const file=OUT+'/candidate-'+n+'.json';if(fs.existsSync(file))throw Error('Do not repeat candidate');
 const level=structuredClone(base.level);for(const b of level.blocks)b.shutterId='l212-cover10';level.blocks.find(b=>b.id==='l212-top-bomb40').timedBombSeconds=40;
 level.shutters=[{id:'l212-cover10',x:0,y:0,width:7,height:3,count:10,skin:'shutter'},{id:'l212-cover1',x:0,y:7,width:2,height:2,count:1,skin:'shutter'}];for(const g of level.gates)if(g.color!=='blue')g.frozen={green:19,red:16,yellow:11}[g.color];
 level.blocks.push(block('ice11','red',0,6,H2,{frozen:11}),block('first','blue',6,6,V3),block('small','blue',0,7,Q2,{shutterId:'l212-cover1'}));
 [[2,3],[4,3],[3,4],[2,5],[4,5],[3,6],[4,7],[3,8]].forEach(([x,y],i)=>level.blocks.push(block('blue'+i,'blue',x,y,S)));
 [[3,3,n&1?'yellow':'green'],[2,4,n&2?'red':'yellow'],[4,4,n&4?'green':'red'],[3,5,'green'],[2,6,'green'],[5,7,'red'],[2,8,'green']].forEach(([x,y,color],i)=>level.blocks.push(block('coldS'+i,color,x,y,S)));
 [[4,6],[2,7],[4,8]].forEach(([x,y],i)=>level.blocks.push(block('coldH'+i,'yellow',x,y,H2)));
 level.mechanismAdaptation.change='Actual authored original51-cell symmetric mask and enlarged top shutter region7x3 versus source7x2, kept count10. Hidden21-cell q0 full inventory uses separately certified hidden-0, preserving its geometry/colors/bluegrid and native exits. Source small2x2count1 is one authored blueQ2, while visible9blue bodies are nativeV3+8S. Source redH2ice11 at0,6, source icegates19/16/11, bluebombH2timer40 and two bluefloor cells preserved. Ordinary shape/color/placement and curtain spatial adaptations are authored; source counts remain independently recorded. '+JSON.stringify({colors:n});
 const audit={opening:auditOpeningCoverage(new strict.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:adjacency(level.blocks),q0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),necessary:emptyPoseExitAudit(level,api)};
 const packet={level,levelSha256:sha256(level),hiddenSourceFile:sourceFile,hiddenOriginalSha256:base.levelSha256,hiddenBound:base.bound,audit,formalAdopted:false,finiteBudget:{upperMilliseconds:3000,upperStates:350000,prefixMilliseconds:6000,prefixStates:500000}};
 if(audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&audit.q0&&audit.necessary.passed){const plan=structuredClone(level);plan.blocks.forEach(b=>delete b.timedBombSeconds);packet.upper=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000});if(packet.upper.drags){try{packet.drags=packet.upper.drags;packet.replay=replay(level,packet.drags,strict,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}}if(packet.replay?.valid&&packet.replay.complete&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15)packet.prefixBound=runPrefix(prefixPayload(plan,api,{goalClears:10,floor:8,maxMilliseconds:6000,maxStates:500000}).p);}
 const row={n,bodies:level.blocks.length,adj:audit.adjacency.length,trap:audit.necessary.trappedBodyIds,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,max:packet.upper?.maxClearsSeen,prefix:packet.prefixBound?.status,frontier:packet.prefixBound?.frontierCost};history.push(row);console.log(JSON.stringify(row));fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});fs.writeFileSync(OUT+'/history.json',JSON.stringify(history,null,2));if(packet.prefixBound?.thresholdProven)break;
}

import fs from 'node:fs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {nativeWitness64} from '../continuation211-native-witness64-v2.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
const dir='deliverables/continue211-220-20260930/design220-new/aux212-neck47';fs.mkdirSync(dir,{recursive:true});
const parent='deliverables/continue211-220-20260930/design212-new/source212-grid/q3redVb55prefix212-6.json',base=JSON.parse(fs.readFileSync(parent)),core=await loadContinuationRuntime(),{api:replayer}=await loadApi(),api={...await loadSpatialApi(),...replayer},history=[];
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),point=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]),adj=blocks=>{const bad=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++)if(blocks[i].color===blocks[j].color&&point(blocks[i]).some(([x,y])=>point(blocks[j]).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1)))bad.push([blocks[i].id,blocks[j].id]);return bad;};
for(let n=0;n<16;n++){
 const level=structuredClone(base.level),file=dir+'/large-'+n+'.json';if(fs.existsSync(file))throw Error('Already attempted');
 level.playable=Array.from({length:63},(_,i)=>[i%7,Math.floor(i/7)]).filter(([x,y])=>y<2||y>=6||(x>=2&&x<=4));
 level.blocks=level.blocks.filter(b=>b.shutterId||b.frozen||b.id==='l212-blue-q3');
 level.coloredGrids[0].cells=[[2,0],[5,0]];
 const get=s=>level.blocks.find(b=>b.id==='l212-'+s);get('top-a').color=n&1?'green':'yellow';get('top-d-adapt').color=n&2?'yellow':'green';
 const specs=[['b1',2,2,'blue',1,1],['c1',3,2,n&4?'red':'yellow',1,1],['b2',4,2,'blue',1,1],['c2',2,3,'red',1,1],['b3',3,3,'blue',1,1],['c3',4,3,'yellow',1,1],['b4',2,4,'blue',1,1],['c4',3,4,'green',1,1],['b5',4,4,'blue',1,1],['c5',2,5,'green',1,1],['c6',3,5,'red',2,1],['c7',0,6,'red',2,1],['b6',2,6,'blue',1,1],['c8',3,6,'yellow',1,1],['b7',2,8,'blue',1,1],['c9',3,8,n&8?'yellow':'green',1,1]];
 for(const[id,x,y,color,w,h]of specs)level.blocks.push({id:'l212-auxlarge-'+id,x,y,color,shape:rect(w,h)});
 delete level.mechanismAdaptation.sourceFactsFile;level.mechanismAdaptation.change+=' Actual new47cellLRsymmetric originalcontour7x2top/3x4neck/7x3bottom. Source56vsdesign47; externalopeningretiled18bodies; redice11H2unchanged2,7, blueQ3 preserved; twobluefloorcellsrelocatedtotop2,0and5,0. Cold-color variant '+n+'. Ordinary-body split/merge under v1.125; source shape/color differences explicit.';
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:adj(level.blocks),mechanism:core.auditRevisedMechanismContract(level),native:level.blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)},passed=audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&!audit.mechanism.length&&audit.native;
 const packet={level,levelSha256:sha256(level),parent,staticPassed:passed,audit,budget:{witnessMilliseconds:3000,lowerMilliseconds:6000,lowerStates:2000000},formalAccepted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningSha256=sha256(plan);try{packet.search=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000,orderSeed:n,mergeCold:false});if(packet.search.drags){packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){packet.lower=runNativeLift(liftPayload(plan,api,{floor:11,maxMilliseconds:6000,maxStates:2000000}).p);}}}catch(e){packet.error=e.stack;}}
 fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});const row={n,bodies:level.blocks.length,static:passed,adj:audit.adjacency.length,search:packet.search?.status,maxClears:packet.search?.maxClearsSeen,U:packet.replay?.nonClearingDrags,lower:packet.lower?.status,frontier:packet.lower?.frontierCost,error:packet.error?.slice(0,250)};history.push(row);console.log(JSON.stringify(row));if(packet.lower?.thresholdProven)break;
}
fs.writeFileSync(dir+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});

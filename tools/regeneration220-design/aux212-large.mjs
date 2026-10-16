import fs from 'node:fs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {nativeWitness64} from '../continuation211-native-witness64-v2.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
const dir='deliverables/continue211-220-20260930/design220-new/aux212-large';fs.mkdirSync(dir,{recursive:true});
const parent='deliverables/continue211-220-20260930/design212-new/source212-grid/q3redVb55prefix212-6.json',base=JSON.parse(fs.readFileSync(parent)),core=await loadContinuationRuntime(),{api:replayer}=await loadApi(),api={...await loadSpatialApi(),...replayer},history=[];
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),point=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]),adj=blocks=>{const bad=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++)if(blocks[i].color===blocks[j].color&&point(blocks[i]).some(([x,y])=>point(blocks[j]).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1)))bad.push([blocks[i].id,blocks[j].id]);return bad;};
for(let n=0;n<16;n++){
 const level=structuredClone(base.level),file=dir+'/large-'+n+'.json';if(fs.existsSync(file))throw Error('Already attempted');
 level.blocks=level.blocks.filter(b=>b.shutterId||b.frozen||b.id==='l212-blue-q3'||['l212-blue-0','l212-blue-7','l212-fill-19'].includes(b.id));
 const get=s=>level.blocks.find(b=>b.id==='l212-'+s);get('blue-0').color='blue';get('top-e').color='blue';get('top-a').color=n&1?'red':'yellow';get('top-f').color=n&2?'green':'yellow';get('top-d-adapt').color=n&4?'yellow':'green';
 const specs=[['lv3',1,2,'green',1,3],['mq2',2,2,'blue',2,2],['rv3',4,2,'green',1,3],['ev3',5,2,'blue',1,3],['bq2',2,4,'red',2,2],['s1',1,5,'blue',1,1],['s2',4,5,'yellow',1,1],['s3',5,5,n&8?'red':'green',1,1],['bar',1,6,'yellow',3,1]];
 for(const[id,x,y,color,w,h]of specs)level.blocks.push({id:'l212-auxlarge-'+id,x,y,color,shape:rect(w,h)});
 delete level.mechanismAdaptation.sourceFactsFile;level.mechanismAdaptation.change+=' Actual new family: upper20 cells completely retiled as twoQ2/threeV3/threeS and lowerT4 replaced byH3. Blue stocks redistributed; cold-color variant '+n+'. Ordinary-body split/merge under v1.125; source shape/color differences explicit.';
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:adj(level.blocks),mechanism:core.auditRevisedMechanismContract(level),native:level.blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)},passed=audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&!audit.mechanism.length&&audit.native;
 const packet={level,levelSha256:sha256(level),parent,staticPassed:passed,audit,budget:{witnessMilliseconds:3000,lowerMilliseconds:6000,lowerStates:2000000},formalAccepted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningSha256=sha256(plan);try{packet.search=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000,orderSeed:n,mergeCold:false});if(packet.search.drags){packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){packet.lower=runNativeLift(liftPayload(plan,api,{floor:11,maxMilliseconds:6000,maxStates:2000000}).p);}}}catch(e){packet.error=e.stack;}}
 fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});const row={n,bodies:level.blocks.length,static:passed,adj:audit.adjacency.length,search:packet.search?.status,maxClears:packet.search?.maxClearsSeen,U:packet.replay?.nonClearingDrags,lower:packet.lower?.status,frontier:packet.lower?.frontierCost,error:packet.error?.slice(0,250)};history.push(row);console.log(JSON.stringify(row));if(packet.lower?.thresholdProven)break;
}
fs.writeFileSync(dir+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});

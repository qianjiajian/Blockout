import fs from 'node:fs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {nativeWitness64} from '../continuation211-native-witness64-v2.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
const dir='deliverables/continue211-220-20260930/design220-new/aux212-rect-neck-merged';fs.mkdirSync(dir,{recursive:true});
const parent='deliverables/continue211-220-20260930/design212-new/source212-grid/q3redVb55prefix212-6.json',base=JSON.parse(fs.readFileSync(parent)),core=await loadContinuationRuntime(),{api:replayer}=await loadApi(),api={...await loadSpatialApi(),...replayer},history=[];
const point=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]),adj=blocks=>{const bad=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++)if(blocks[i].color===blocks[j].color&&point(blocks[i]).some(([x,y])=>point(blocks[j]).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1)))bad.push([blocks[i].id,blocks[j].id]);return bad;};
for(let n=0;n<8;n++){
 const level=structuredClone(base.level),file=dir+'/redq3-'+n+'.json';if(fs.existsSync(file))throw Error('Already attempted');const get=s=>level.blocks.find(b=>b.id==='l212-'+s);
 get('top-a').color='green';get('top-d-adapt').color=n&1?'yellow':'green';get('fill-19').color=n&4?'yellow':'green';get('top-bomb40').y=n&2?0:1;get('top-f').y=n&2?1:0;level.coloredGrids[0].cells=[[5,0],[6,0]];
 get('blue-0').color='blue';get('fill-2').color='red';get('fill-7').color='yellow';
 const remove=new Set(['new-blue-s','new-green-s','new-green-v3','fill-8','blue-6','fill-13','new-green-t4','fill-3','blue-8','fill-10'].map(s=>'l212-'+s));level.blocks=level.blocks.filter(b=>!remove.has(b.id));
 const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
 for(const[id,x,y,color,w,h]of[['midcold',3,2,'green',1,3],['rect',4,2,'blue',2,3],['rightbar',4,5,'red',2,1],['t1',2,5,'green',1,1],['t2',1,6,'green',1,1],['t3',2,6,'blue',1,1],['t4',3,6,'green',1,1]])level.blocks.push({id:'l212-rectneck-'+id,x,y,color,shape:rect(w,h)});
 Object.assign(level.gates.find(g=>g.color==='blue'),{side:'right',offset:2,size:3,portals:[{side:'right',origin:[5,2],size:3}]});
 delete level.mechanismAdaptation.sourceFactsFile;level.mechanismAdaptation.change+=' Actual new29body rightneck blueR2x3 andgreenV3 middle family: center3,2..4 threecoldSmergedgreenV3, adjacentgreenV2redandredV2yellow; relocatedfloorsallowyellowV2exit; sourceandauthoredshape/color differences explicit. right2x4 neckretiledblue2x3andredH2; originalT4splitthreegreenS/oneblueS; blue0,6compensatesstock; center3,3coldyellow. Blueordinaryrightneckorigin5,2span3hasfirst6cellclear; originalice11remains2,7holdingQ3until11; sourceanddesignexplicit. blueordinary atbottom0or1 span3,Q3 blockedbyredice11 at2,7 until11; originalredgateunchangedleft0span2ice16; bluebombH2to2,1andtopfH2to2,0;two bluefloorcellsrelocatedto5,0/6,0. Q3 remains untilred16; redgate relocatedtoleftneck3-cell boundaryandexpanded2to3 onlyforQ3 crosssection; blueordinaryrestoresource2. Redice11H2 movedfromlower tochamber3,4 withtworeplacedS. Coldcolorsvariant '+n+'. Sourceandauthoredadaptationdistinct.';
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:adj(level.blocks),mechanism:core.auditRevisedMechanismContract(level),native:level.blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)},passed=audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&!audit.mechanism.length&&audit.native;
 const packet={level,levelSha256:sha256(level),parent,staticPassed:passed,audit,budget:{witnessMilliseconds:3000,lowerMilliseconds:6000,lowerStates:2000000},formalAccepted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningSha256=sha256(plan);try{packet.search=nativeWitness64(plan,api,{floor:21,maxMilliseconds:3000,maxStates:350000,orderSeed:n,mergeCold:false});if(packet.search.drags){packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15)packet.lower=runNativeLift(liftPayload(plan,api,{floor:11,maxMilliseconds:6000,maxStates:2000000}).p);}}catch(e){packet.error=e.stack;}}
 fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});const row={n,bodies:level.blocks.length,static:passed,adj:audit.adjacency,search:packet.search?.status,maxClears:packet.search?.maxClearsSeen,U:packet.replay?.nonClearingDrags,lower:packet.lower?.status,frontier:packet.lower?.frontierCost,error:packet.error?.slice(0,250)};history.push(row);console.log(JSON.stringify(row));if(packet.lower?.thresholdProven)break;
}
fs.writeFileSync(dir+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});

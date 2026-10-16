import fs from 'node:fs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {nativeWitness64} from '../continuation211-native-witness64-v2.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
const dir='deliverables/continue211-220-20260930/design220-new/aux212-redq3-neck';fs.mkdirSync(dir,{recursive:true});
const parent='deliverables/continue211-220-20260930/design212-new/source212-grid/q3redVb55prefix212-6.json',base=JSON.parse(fs.readFileSync(parent)),core=await loadContinuationRuntime(),{api:replayer}=await loadApi(),api={...await loadSpatialApi(),...replayer},history=[];
const point=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]),adj=blocks=>{const bad=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++)if(blocks[i].color===blocks[j].color&&point(blocks[i]).some(([x,y])=>point(blocks[j]).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1)))bad.push([blocks[i].id,blocks[j].id]);return bad;};
for(let n=0;n<16;n++){
 const level=structuredClone(base.level),file=dir+'/redq3-'+n+'.json';if(fs.existsSync(file))throw Error('Already attempted');const get=s=>level.blocks.find(b=>b.id==='l212-'+s);
 get('blue-q3').color='red';Object.assign(get('ice11'),{x:3,y:4});Object.assign(get('fill-10'),{x:2,y:7,color:'yellow'});Object.assign(get('blue-6'),{x:3,y:7});get('fill-13').color='yellow';
 get('top-d-adapt').color=n&1?'yellow':'green';get('top-a').color=n&2?'green':'yellow';get('fill-19').color=n&4?'yellow':'green';level.coloredGrids[0].cells=[[2,0],[5,0]];
 const red=level.gates.find(g=>g.color==='red');Object.assign(red,{side:'bottom',offset:4,size:3});delete red.portals;Object.assign(level.gates.find(g=>g.color==='blue'),{side:n&8?'right':'left',offset:2,size:2,portals:[{side:n&8?'right':'left',origin:[n&8?5:1,2],size:2}]});
 delete level.mechanismAdaptation.sourceFactsFile;level.mechanismAdaptation.change+=' Actual new redQ3 bottom-red and neck-blue family: red gate moves tobottom4 span3 count16, ordinaryblue mouth relocates totrue left/rightneck2 span2, bluefloor two cells relocated to original blue hidden bodies at2,0 and5,0; small curtain bodies remainfullandnoothermechanicsadded. Q3 remains untilred16; redgate relocatedtoleftneck3-cell boundaryandexpanded2to3 onlyforQ3 crosssection; blueordinaryrestoresource2. Redice11H2 movedfromlower tochamber3,4 withtworeplacedS. Coldcolorsvariant '+n+'. Sourceandauthoredadaptationdistinct.';
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:adj(level.blocks),mechanism:core.auditRevisedMechanismContract(level),native:level.blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)},passed=audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&!audit.mechanism.length&&audit.native;
 const packet={level,levelSha256:sha256(level),parent,staticPassed:passed,audit,budget:{witnessMilliseconds:3000,lowerMilliseconds:6000,lowerStates:2000000},formalAccepted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningSha256=sha256(plan);try{packet.search=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000,orderSeed:n,mergeCold:false});if(packet.search.drags){packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15)packet.lower=runNativeLift(liftPayload(plan,api,{floor:11,maxMilliseconds:6000,maxStates:2000000}).p);}}catch(e){packet.error=e.stack;}}
 fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});const row={n,bodies:level.blocks.length,static:passed,adj:audit.adjacency,search:packet.search?.status,maxClears:packet.search?.maxClearsSeen,U:packet.replay?.nonClearingDrags,lower:packet.lower?.status,frontier:packet.lower?.frontierCost,error:packet.error?.slice(0,250)};history.push(row);console.log(JSON.stringify(row));if(packet.lower?.thresholdProven)break;
}
fs.writeFileSync(dir+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});

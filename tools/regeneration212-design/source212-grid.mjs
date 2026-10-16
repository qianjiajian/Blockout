import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {load217WitnessSearch} from './spatial217-witness.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source212-grid`,S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],Q2=[[0,0],[1,0],[0,1],[1,1]],L3=[[0,0],[0,1],[1,1]],B=(id,color,x,y,shape=S,extra={})=>({id:`l212-${id}`,color,x,y,shape,...extra});
export function source212Grid(index=0){
 const level={id:212,name:'彩格双帘·212',difficulty:'normal',mechanismRules:'revised-2026-09-27-v1.5',width:7,height:9,playable:Array.from({length:63},(_,p)=>[p%7,Math.floor(p/7)]).filter(([x,y])=>!(y>=4&&y<=5&&(x===0||x===6))),timeSeconds:95,reward:200,parMoves:8,preservedMoveTarget:34,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:11,calibratedDifficulty:1.3},
 gates:[{id:'l212-green',color:'green',side:'top',offset:2,size:3,frozen:19},{id:'l212-red',color:'red',side:'left',offset:0,size:2,frozen:16},{id:'l212-yellow',color:'yellow',side:'left',offset:6,size:2,frozen:11},{id:'l212-blue',color:'blue',side:'right',offset:6,size:2}],
 shutters:[{id:'l212-cover10',x:0,y:0,width:7,height:2,count:10,skin:'shutter'},{id:'l212-cover1',x:1,y:4,width:2,height:2,count:1,skin:'shutter'}],coloredGrids:[{id:'l212-blue-floor',color:'blue',cells:[[1,4],[2,4]]}],
 blocks:[B('a','blue',0,2,H2),B('b','yellow',2,2),B('c','blue',3,2),B('d','red',4,2),B('e','green',5,2,H2),B('e-adapt','yellow',5,3),B('f','yellow',1,3),B('g','red',2,3),B('h','green',3,3),B('i','blue',4,3),B('left-wing','red',0,3),B('right-wing','blue',6,3),B('center-fill','yellow',3,4),B('ice11','red',4,4,H2,{frozen:11}),B('j','blue',3,5),B('k','yellow',4,5),B('l','blue',5,5),...['red','green','blue','yellow','blue','red','blue'].map((c,x)=>B('m'+x,c,x,6)),B('former-shell-blue','blue',0,7,Q2),B('n','yellow',2,7,V2),B('former-shell-red','red',3,7,Q2),B('o','yellow',5,7,H2),B('p','green',5,8,H2),
 B('small-blue','blue',1,4,H2,{shutterId:'l212-cover1'}),B('small-yellow','yellow',1,5,H2,{shutterId:'l212-cover1'}),B('top-a','yellow',0,0,H2,{shutterId:'l212-cover10'}),B('top-bomb40','blue',2,0,H2,{shutterId:'l212-cover10',timedBombSeconds:40}),B('top-c','yellow',4,0,L3,{shutterId:'l212-cover10'}),B('top-d','blue',5,0,H2,{shutterId:'l212-cover10'}),B('top-d-adapt','red',6,1,S,{shutterId:'l212-cover10'}),B('top-e','red',0,1,H2,{shutterId:'l212-cover10'}),B('top-f','green',2,1,H2,{shutterId:'l212-cover10'})],
 mechanismAdaptation:{sourceFrames:['.codex-temp/video211220/frame-0046-0092.00s.png','.codex-temp/video211220/frame-0049-0098.00s.png','.codex-temp/video211220/frame-0068-0136.00s.png','.codex-temp/video211220/frame-0089-0178.00s.png'],ruleConflict:'v1.11item5 givescoloredgrid priority over shells. Preserve2blue cells andremove only2shell attributes, keep bothindependentbody footprints. Earlier212 omit-grid drafts are invalid andnotreused.',change:'Source7x9/hourglass56cellshasinternalhole. Fillhole +2upperneckedgecells gives59cellssymmetric originalcontour. Preserve2shutters10/1 andareas14/4; fullhidden14+4. Preserve redH2ice11,hiddenblueH2bomb40,icegates19green/16red/11yellow andordinaryblue. Source2shells→ordinaryblue/redQ2. Sourcegreen/blue non-q0L3 retilednativeH2+S. Addedordinarycellsfill sourceholes; necessary colors preventsamecolor touching. Strict realbomb timedroute required.'}};
 const paint=(id,color)=>{level.blocks.find(b=>b.id===`l212-${id}`).color=color;};
 if(index&1)paint('p','blue');
 if(index&2){level.blocks=level.blocks.filter(b=>b.id!=='l212-former-shell-blue');level.blocks.push(B('former-blue-top','yellow',0,7,H2),B('former-blue-bottom','blue',0,8,H2));}
 if(index&4){paint('former-shell-red','green');paint('p','blue');}
 if(index>=8){
  paint('o','blue');paint('p','green');paint('m6','green');paint('former-shell-red','red');
  if(index&2){paint('m0','blue');paint('former-blue-top','red');}
  if(index&1){paint('d','green');paint('e','red');}
  if(index&4)paint('k','green');
 }
 if(index>=16){
  level.gates.find(g=>g.color==='blue').offset=7;
  paint('o','green');paint('p','blue');paint('m6','blue');
  if(index&1)paint('top-d-adapt','green');
 }
 level.mechanismAdaptation.change+=` Finitevariant${index}; lowerordinarycolor/shape changes explicitlyselected.`;
 return level;
}
async function run(){
 fs.mkdirSync(DIR,{recursive:true});const start=Number(process.argv[2]??0),history=[],api0=await loadSpatialApi(),fast=await load217WitnessSearch({eagerClear:true}),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra};
 if(fs.existsSync(`${DIR}/history-${start}.json`))throw Error('Do not repeatfailedfamily');
 for(let n=0;n<8;n++){
  const index=start+n,level=source212Grid(index),file=`${DIR}/candidate212-${index}.json`;if(fs.existsSync(file))throw Error('Do not overwrite');
  let audit;try{audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};}catch(e){history.push({index,status:'INVALID',error:e.message});continue;}
  const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,formalAdopted:false};
  if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);packet.search=fast.search(plan,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:n});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}if(packet.replay.valid&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){const projection=structuredClone(plan);delete projection.coloredGrids;packet.lowerBound={status:'PROJECTION_DIAGNOSTIC_ONLY',projectionSha256:digest(projection),search:searchSpatial(projection,api,{floor:11,prove:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000})};}}}
  const row={index,levelSha256:packet.levelSha256,structurePassed:passed,adjacency:audit.allInventoryAdjacency,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
 }
 fs.writeFileSync(`${DIR}/history-${start}.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));
}
if(process.argv[1]?.endsWith('source212-grid.mjs'))await run();

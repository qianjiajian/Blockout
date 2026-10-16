import fs from 'node:fs';
import {build} from 'esbuild';
import {source212Grid} from './source212-grid.mjs';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {load217WitnessSearch} from './spatial217-witness.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source212-grid`,S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],Q2=[[0,0],[1,0],[0,1],[1,1]];
const cells=b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]),key=p=>p.join(',');
export function tiling212(seed){
 let state=seed|0;const rnd=n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)%n;};const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const level=source212Grid(0);level.gates.find(g=>g.color==='blue').offset=7;
 level.blocks=level.blocks.filter(b=>b.shutterId||b.id==='l212-ice11');
 if(seed>=212300)Object.assign(level.blocks.find(b=>b.id==='l212-ice11'),{x:0,y:7});
 if(seed>=212600){
  const smallX=seed>=212700?2:3;
  Object.assign(level.shutters.find(s=>s.id==='l212-cover1'),{x:smallX,y:7});
  Object.assign(level.blocks.find(b=>b.id==='l212-small-blue'),{x:smallX,y:7});
  Object.assign(level.blocks.find(b=>b.id==='l212-small-yellow'),{x:smallX,y:8});
  level.coloredGrids[0].cells=[[smallX,7],[smallX+1,7]];
 }
 level.blocks.push({id:'l212-blue-opening',color:'blue',x:5,y:7,shape:Q2});
 const occupied=new Set(level.blocks.flatMap(cells).map(key)),remaining=new Set(level.playable.map(key).filter(p=>!occupied.has(p)));
 const blueTarget=seed>=212400?9:seed>=212100?10:9,blueCandidates=seed>=212700?[[0,6],[4,6],[1,5],[3,5],[5,5],[2,4],[4,4],[0,8],seed>=212800?[3,3]:[6,3]].map(key):seed>=212600?[[0,6],[2,6],[1,5],[3,5],[5,5],[2,4],[4,4],[0,8],[2,8]].map(key):seed>=212400?[[0,6],[2,6],[4,6],[3,7],[0,8],[2,8],[3,5],[5,5],[4,4]].map(key):shuffle([...remaining]);let blueCount=0;
 for(const p of blueCandidates){const[x,y]=p.split(',').map(Number),b={id:`l212-blue-${blueCount}`,color:'blue',x,y,shape:S};if(adjacency([...level.blocks,b]).length)continue;level.blocks.push(b);remaining.delete(p);blueCount++;if(blueCount===blueTarget)break;}
 if(blueCount<blueTarget)return null;
 let nodes=0;
 function fill(rest,blocks,singlesLeft){if(++nodes>40000||rest.size<singlesLeft)return null;if(!rest.size)return singlesLeft===0?blocks:null;const[x,y]=[...rest][0].split(',').map(Number);
  for(const shape of shuffle(rest.size===singlesLeft?[S]:[...(!singlesLeft?[]:[S]),H2,V2])){const points=shape.map(([dx,dy])=>`${x+dx},${y+dy}`);if(!points.every(p=>rest.has(p)))continue;
   for(const color of shuffle(['red','yellow','green'])){const b={id:`l212-fill-${blocks.length}`,color,x,y,shape};if(adjacency([...level.blocks,...blocks,b]).length)continue;const next=new Set(rest);points.forEach(p=>next.delete(p));const result=fill(next,[...blocks,b],singlesLeft-Number(shape.length===1));if(result)return result;}
  }return null;
 }
 const fillBlocks=fill(remaining,[],seed>=212500?16:seed>=212400?6:seed>=212200?11:seed>=212100?5:2);if(!fillBlocks)return null;level.blocks.push(...fillBlocks);
 level.mechanismAdaptation.change+=` Full native retiling seed${seed}: earlyblueQ2 movedrightbottom,9separateblueS,12 ordinarydominos+2ordinaryS. Ordinary shapes/colors/positions change underuser finite-regeneration authorization; allmechanisms/counts andhidden sourceknown kept. Blueexitshiftedonecell down withsame2-cellwidth.`;
 return level;
}
async function run(){
 fs.mkdirSync(DIR,{recursive:true});const start=Number(process.argv[2]??212000),history=[],api0=await loadSpatialApi(),fast=await load217WitnessSearch({eagerClear:true,preferOpenGates:start>=212200}),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra};
 if(fs.existsSync(`${DIR}/tiling-history-${start}.json`))throw Error('Do not repeatfailedfamily');
 for(let n=0;n<8;n++){
  const seed=start+n,level=tiling212(seed);if(!level){history.push({seed,status:'NO_TILING'});console.log(seed,'no-tiling');continue;}const file=`${DIR}/tiling212-${seed}.json`;if(fs.existsSync(file))throw Error('Do not overwrite');
  const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
  const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,formalAdopted:false};
  if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);packet.search=fast.search(plan,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:n});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}if(packet.replay.valid&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){const projection=structuredClone(plan);delete projection.coloredGrids;packet.lowerBound={status:'PROJECTION_DIAGNOSTIC_ONLY',projectionSha256:digest(projection),search:searchSpatial(projection,api,{floor:11,prove:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000})};}}}
  const row={seed,levelSha256:packet.levelSha256,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
 }
 fs.writeFileSync(`${DIR}/tiling-history-${start}.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));
}
if(process.argv[1]?.endsWith('tiling212-grid.mjs'))await run();

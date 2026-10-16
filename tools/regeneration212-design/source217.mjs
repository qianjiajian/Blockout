import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {load217WitnessSearch} from './spatial217-witness.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source217`;
const S=[[0,0]],H2=[[0,0],[1,0]],H3=[[0,0],[1,0],[2,0]],V2=[[0,0],[0,1]],V3=[[0,0],[0,1],[0,2]],Q2=[[0,0],[1,0],[0,1],[1,1]],Q3=Array.from({length:9},(_,p)=>[p%3,Math.floor(p/3)]),L4=[[0,0],[0,1],[1,1],[2,1]];
const B=(id,color,x,y,shape=S,more={})=>({id:`l217-${id}`,color,x,y,shape,...more});
const footprint=b=>b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`);
const frames=[678,690,700,720,740,742,744,746,748].map(t=>`.codex-temp/video211220/frame-${String(t/2).padStart(4,'0')}-${t.toFixed(2).padStart(7,'0')}s.png`);
export const sourceFacts={levelId:217,openingTimeSeconds:678,grid:{width:8,height:9,playableCells:62,blocked:Array.from({length:10},(_,i)=>[i%5,4+Math.floor(i/5)])},
 openingBlocks:[B('a','orange',0,0,V2),B('b','green',1,0,V2),B('c','purple',2,0,V3),B('d','blue',3,0,V2),B('e','purple',4,0,H2),B('f','red',4,1,H2),B('g','yellow',1,2),B('h','red',0,2,L4),B('i','orange',3,2,V2),B('j','SOURCE_LIME',4,2,H2),B('k','cyan',4,3,H2),B('l','SOURCE_LIME',5,6,H2),B('m','blue',5,7,Q2),B('n','green',7,6,V3,{sourceBadge:'circular-double-arrow; mechanic UNKNOWN, mobile body not fixed exit'})],
 colorNames:{note:'Gold/orange versus yellow is disambiguated by different exit eligibility seen during play, not by assumed identical pixel colors. Lime is mapped to pink in the authored 8-color palette.'},
 coloredFloor:{color:'blue',cells:[[5,4],[6,4],[5,5],[6,5]]},
 lift:{region:[0,0,3,4],revealedBy744Seconds:true,hiddenBlocks:[B('lift-blue','blue',0,0,Q3),B('lift-orange','orange',0,3,H3)],hiddenCells:12},
 gates:[{side:'top',offset:0,size:2,frozen:5,color:'cyan'},{side:'top',offset:5,size:3,frozen:4,color:'red'},{side:'left',offset:0,size:2,frozen:8,color:'SOURCE_LIME'},{side:'left',offset:2,size:2,frozen:10,color:'purple'},{side:'right',offset:0,size:1,frozen:8,color:'yellow'},{side:'top',origin:[1,6],offset:1,size:3,frozen:3,color:'blue'},{side:'left',offset:6,size:3,frozen:12,color:'green'},{side:'bottom',offset:0,size:2,frozen:7,color:'green'},{side:'bottom',offset:2,size:2,color:'orange'},{side:'bottom',offset:7,size:1,frozen:1,color:'purple'}],
 corrections:['Initial audit omitted the right-top ice8 gate: 9 ice gates, not 8.','Mobile green V3 is not a fixed green flip door.','Source upper-left 3x4 is a true lift, with blueQ3+orangeH3 hidden layer.'],unknown:['The circular-double-arrow badge interaction has not been established; no movementAxis or flipDoor is asserted.'],
 adaptationContract:{rule:'v1.11 section1 items2/4/6/7, inherited by v1.38 A5 and v1.125',gateConflict:'10 non-star portals exceed8 colors. Remove exactly2 conflicting ice portals: purple10 and green7; retain the7 other exact ice counters and sole ordinary orange gate. Do not merge counters.',geometry:'Keep source8x9 irregular category; replace asymmetrical side bridge by4-cell-wide centered neck,64cells and exact1lift/4bluefloors.',badge:'Retain independent greenV3 body, omit unsupported legacy rotation metadata; mapping remains source-review pending.'}};
export function source217(seed=217000){
 let state=seed|0;const rnd=n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)%n;};
 const playable=Array.from({length:72},(_,p)=>[p%8,Math.floor(p/8)]).filter(([x,y])=>!(y>=4&&y<=5&&(x<(seed>=217800?1:2)||x>(seed>=217800?6:5))));
 const blocks=[B('a','orange',0,0,V2),B('b','green',1,0,V2),B('c','purple',2,0,V3),B('d','blue',3,0,V2),B('e','purple',4,0,H2),B('f','red',4,1,H2),B('g','yellow',1,2),B('h','red',0,2,L4),B('i','orange',3,2,V2),B('j','pink',4,2,H2),B('k','cyan',4,3,H2),B('l','pink',5,6,H2),B('m','blue',5,7,Q2),B('n','green',7,6,V3),B('bridge-blue','blue',3,4,Q2)];
 if(seed>=217100){
  Object.assign(blocks.find(b=>b.id==='l217-c'),{x:7,y:6});
  Object.assign(blocks.find(b=>b.id==='l217-n'),{x:2,y:0});
  blocks.find(b=>b.id==='l217-b').color='cyan';
  blocks.find(b=>b.id==='l217-d').color='cyan';
  blocks.push(B('start-orange','orange',2,8,H2),B('start-orange2','orange',0,7,V2));
 }
 if(seed>=217300)blocks.find(b=>b.id==='l217-e').color='orange';
 if(seed>=217400){
  blocks.find(b=>b.id==='l217-e').color='pink';
  blocks.find(b=>b.id==='l217-n').color='purple';
  blocks.find(b=>b.id==='l217-l').color='orange';
 }
 if(seed>=217500){
  blocks.splice(blocks.findIndex(b=>b.id==='l217-m'),1);
  blocks.push(B('m-blue','blue',6,7,V2),B('m-purple','purple',5,8),B('m-red','red',5,7));
 }
 if(seed>=217700)Object.assign(blocks.find(b=>b.id==='l217-n'),{color:'green',x:4,y:6,movementAxis:'horizontal'});
 const grids=[[3,4],[4,4],[3,5],[4,5]];
 const occupied=new Set(blocks.flatMap(footprint));let n=0;
 for(const[x,y]of playable){if(occupied.has(`${x},${y}`))continue;
  let shapes=[H2,V2,S];if(seed>=217100)shapes=[V2,H2,S];if(seed>=217200&&seed<217400)shapes=[S];
  if(rnd(3)===0)shapes=[...shapes].reverse();let chosen;
  for(const shape of shapes){const points=shape.map(([dx,dy])=>[x+dx,y+dy]);if(!points.every(p=>playable.some(q=>q.join(',')===p.join(','))&&!occupied.has(p.join(','))))continue;
   const colors=seed>=217700&&y>=6?(seed>=217800?['orange','purple','blue','red']:['orange','purple','blue']):['orange','purple','blue','cyan','red','yellow','pink','green'];for(let i=colors.length-1;i>0;i--){const j=rnd(i+1);[colors[i],colors[j]]=[colors[j],colors[i]];}
   for(const color of colors){if(seed>=217300&&(color==='purple'&&shape.some(p=>p[0]>0)||color==='yellow'&&shape.some(p=>p[1]>0)))continue;if(seed>=217400&&shape.some(p=>p[0]>0)&&color!=='blue'&&(y<4&&!['red','pink','cyan','yellow'].includes(color)||y>=6&&!['orange','green'].includes(color)))continue;const candidate=B(`fill-${n}`,color,x,y,shape);if(!adjacency([...blocks,candidate]).length){chosen=candidate;break;}}
   if(chosen)break;
  }
  if(!chosen)return null;blocks.push(chosen);footprint(chosen).forEach(p=>occupied.add(p));n++;
 }
 blocks.push(B('lift-blue','blue',0,0,Q3,{shutterId:'l217-lift'}),B('lift-orange',seed>=217300?'yellow':'orange',0,3,H3,{shutterId:'l217-lift'}));
 return{id:217,name:'冰桥升降·217',difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',width:8,height:9,playable,timeSeconds:90,reward:200,parMoves:8,preservedMoveTarget:52,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:17,calibratedDifficulty:2.2},
 gates:[{id:'l217-cyan',color:'cyan',side:'top',offset:0,size:2,frozen:5},{id:'l217-red',color:'red',side:'top',offset:5,size:3,frozen:4},{id:'l217-pink',color:'pink',side:'left',offset:0,size:2,frozen:8},{id:'l217-yellow',color:'yellow',side:'right',offset:0,size:1,frozen:8},{id:'l217-blue',color:'blue',side:'right',offset:6,size:3,frozen:3},{id:'l217-green',color:'green',side:'left',offset:6,size:3,frozen:12},{id:'l217-orange',color:'orange',side:'bottom',offset:2,size:2},{id:'l217-purple',color:'purple',side:'bottom',offset:7,size:1,frozen:1}],
 coloredGrids:[{id:'l217-blue-floor',color:'blue',cells:grids}],shutters:[{id:'l217-lift',x:0,y:0,width:3,height:4,count:0,skin:'lift'}],blocks,
 mechanismAdaptation:{userAuthorized:'211–220有限改色/换形/必要布局，合格后正式数据接入',sourceFactsFile:`${DIR}/source217-facts.json`,change:'Source8×9/62cells reauthored symmetric64cells. Preserve actual3×4lift with blueQ3/orangeH3 hidden12cells and4blue colored cells. Source9ice+1ordinary exceeds8 unique colors: v1.11 minimum omit only purpleice10 and greenice7; retainedice5/4/8/8/3/12/1 unchanged. Source lime mappedpink. Known14 visiblebodies preserved,33 source occupiedcells plus31 authoredcells fillednative ordinary bodies; badgegreenV3 keptbody but unsupportedrotationbadge omitted, source mapping pending. No fabricated flipdoor, axis or star.'}};
}
async function run(){
 fs.mkdirSync(DIR,{recursive:true});const factsFile=`${DIR}/source217-facts.json`;if(!fs.existsSync(factsFile))fs.writeFileSync(factsFile,JSON.stringify({...sourceFacts,frames:frames.map(file=>({file,sha256:digest(fs.readFileSync(file))}))},null,2));
 const history=[],start=Number(process.argv[2]??217000);
 const api=await loadSpatialApi(),fast=await load217WitnessSearch({eagerClear:start>=217600});const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{replayRevisedRoute}from'./src/core/revisedLevelSearch.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),core=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
 if(fs.existsSync(`${DIR}/history217-${start}.json`))throw Error('History exists, never repeat a failed fingerprint');
 for(let n=0;n<8;n++){
  const level=source217(start+n);if(!level){history.push({n,status:'COLORING_FAILED'});continue;}
  const file=`${DIR}/candidate217-${start+n}.json`;if(fs.existsSync(file))throw Error('Do not overwrite evidence');
  let audit;try{audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),openingAdjacency:adjacency(level.blocks.filter(b=>!b.shutterId)),hiddenAdjacency:adjacency(level.blocks.filter(b=>b.shutterId)),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:core.auditRevisedMechanismContract(level),uniqueGateColors:new Set(level.gates.map(g=>g.color)).size===level.gates.length};}catch(e){history.push({n,status:'INVALID',error:e.message});console.log(n,e.message);continue;}
  const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.openingAdjacency.length&&!audit.hiddenAdjacency.length&&!audit.mechanismIssues.length&&audit.uniqueGateColors;
  const packet={level,levelSha256:digest(level),audit,sourceReviewPending:['circular badge semantics'],formalAdopted:false};
  if(passed){packet.search=fast.search(level,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:n});if(packet.search.status==='witness'){packet.replay=core.replayRevisedRoute(level,packet.search.drags);if(packet.replay.valid&&packet.replay.complete&&packet.replay.nonClearingDrags>=16&&packet.replay.nonClearingDrags<=20){const projection=structuredClone(level);delete projection.coloredGrids;packet.lowerBound={status:'PROJECTION_DIAGNOSTIC_ONLY',levelSha256:digest(level),projectionSha256:digest(projection),reason:'Removing4 colored restrictions is a cost-nonincreasing relaxation; complete inventory/lift/gates kept.',search:searchSpatial(projection,api,{floor:16,prove:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000})};}}}
  const row={n,levelSha256:packet.levelSha256,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
 }
 fs.writeFileSync(`${DIR}/history217-${start}.json`,JSON.stringify({maxAttempts:8,millisecondsPerCandidate:4000,sourceFactsFile:factsFile,history},null,2));
}
if(process.argv[1]?.endsWith('source217.mjs'))await run();


import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {load217WitnessSearch} from './spatial217-witness.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source212-grid`,base=JSON.parse(fs.readFileSync(`${DIR}/scored-candidate212-0.json`));
const api0=await loadSpatialApi(),fast=await load217WitnessSearch({eagerClear:true,preferOpenGates:true}),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra};
const start=Number(process.argv[2]??0),history=[],S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]),key=p=>p.join(','),touch=(a,b)=>cells(a).some(([x,y])=>cells(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
if(fs.existsSync(`${DIR}/structured-history212-${start}.json`))throw Error('Do not repeat family');
for(let index=start;index<start+8;index++){
 let rs=(214421+index*157)|0;const rnd=n=>{rs^=rs<<13;rs^=rs>>>17;rs^=rs<<5;return(rs>>>0)%n;},shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const level=structuredClone(base.level);level.blocks=level.blocks.filter(b=>b.shutterId||b.frozen||b.id==='l212-blue-opening');delete level.mechanismAdaptation.sourceFactsFile;
 const taken=new Set(level.blocks.flatMap(cells).map(key)),rest=new Set(level.playable.map(key).filter(p=>!taken.has(p)));let tilingVisits=0,colorVisits=0,made;
 for(let attempt=0;attempt<64&&!made;attempt++){
  function tile(rest,blocks,singles){
   if(++tilingVisits>200000||rest.size<singles)return null;if(!rest.size)return singles===0?blocks:null;
   const [x,y]=[...rest][0].split(',').map(Number);
   for(const shape of shuffle([H2,V2,...(singles?[S]:[])])){
    const pts=shape.map(([a,b])=>[x+a,y+b].join(','));if(!pts.every(p=>rest.has(p)))continue;
    const next=new Set(rest);pts.forEach(p=>next.delete(p));const result=tile(next,[...blocks,{id:`l212-structured-${index}-${blocks.length}`,x,y,shape}],singles-Number(shape.length===1));if(result)return result;
   }return null;
  }
  const shapes=tile(rest,[],7);if(!shapes)continue;
  const neighbors=shapes.map(b=>shapes.map((a,i)=>touch(a,b)?i:-1).filter(i=>i!==-1)),options=shapes.map(b=>['blue','red','yellow','green'].filter(c=>!level.blocks.some(a=>a.color===c&&touch(a,b)))),colors=Array(shapes.length).fill(null);let visits=0;
  function paint(remaining,blue){
   colorVisits++;if(++visits>20000||blue>9||blue+remaining.length<9)return false;if(!remaining.length)return blue===9;
   let best;
   for(const i of remaining){const opts=options[i].filter(c=>c!=='blue'||blue<9).filter(c=>!neighbors[i].some(j=>colors[j]===c));if(!opts.length)return false;if(!best||opts.length<best.opts.length)best={i,opts};}
   for(const c of shuffle(best.opts)){colors[best.i]=c;if(paint(remaining.filter(i=>i!==best.i),blue+Number(c==='blue')))return true;colors[best.i]=null;}return false;
  }
  if(paint(shapes.map((_,i)=>i),0))made=shapes.map((b,i)=>({...b,color:colors[i]}));
 }
 const file=`${DIR}/structured212-${index}.json`;if(fs.existsSync(file))throw Error('Do not overwrite');
 if(!made){const row={index,status:'NO_TILING_COLORING',tilingVisits,colorVisits};fs.writeFileSync(file,JSON.stringify(row,null,2));history.push(row);console.log(JSON.stringify(row));continue;}
 level.blocks.push(...made);level.mechanismAdaptation.change+=` Structured ordinary family ${index}: 14dominos and7singles, exactly9ordinaryblue bodies plus the initialblueQ2; all fixed mechanisms and hidden bodies retained. Native full coverage, source differences explicit. Total ${level.blocks.length} bodies.`;
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)},passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,tilingVisits,colorVisits,formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.search=fast.search(plan,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}}}
 const row={index,levelSha256:packet.levelSha256,bodies:level.blocks.length,structurePassed:passed,status:packet.search?.status,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/structured-history212-${start}.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));

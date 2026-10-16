import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {load217WitnessSearch} from './spatial217-witness.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source212-grid`,parentFile=`${DIR}/scored-candidate212-0.json`,base=JSON.parse(fs.readFileSync(parentFile));
const api0=await loadSpatialApi(),fast=await load217WitnessSearch({eagerClear:true,preferOpenGates:true}),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra};
const start=Number(process.argv[2]??0),history=[],cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]),touch=(a,b)=>cells(a).some(([x,y])=>cells(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
if(fs.existsSync(`${DIR}/merge-history212-${start}.json`))throw Error('Do not repeat a failed family');
for(let index=start;index<start+8;index++){
 const file=`${DIR}/merged212-${index}.json`;if(fs.existsSync(file))throw Error('Do not overwrite prior candidate');
 let rs=(212901+index*131)|0;const rand=n=>{rs^=rs<<13;rs^=rs>>>17;rs^=rs<<5;return(rs>>>0)%n;},shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const level=structuredClone(base.level),fixed=level.blocks.filter(b=>!b.id.startsWith('l212-fill-')||b.color==='blue'),mutable=level.blocks.filter(b=>!fixed.includes(b)),merged=[];
 for(let n=0;n<6+index%4;n++){
  const choices=[];
  for(let i=0;i<mutable.length;i++)for(let j=i+1;j<mutable.length;j++){
   const a=mutable[i],b=mutable[j];if(a.shape.length+b.shape.length>4||!touch(a,b))continue;
   const occupied=[...cells(a),...cells(b)],x=Math.min(...occupied.map(p=>p[0])),y=Math.min(...occupied.map(p=>p[1])),shape=occupied.map(([u,v])=>[u-x,v-y]);
   if(api.matchFormalBlockShape(shape,'native-only')?.quarterTurns!==0)continue;
   choices.push({i,j,next:{id:`l212-merged-${index}-${n}`,x,y,shape,color:'green'},ids:[a.id,b.id]});
  }
  if(!choices.length)break;const c=choices[rand(choices.length)];mutable.splice(c.j,1);mutable.splice(c.i,1);mutable.push(c.next);merged.push(c.ids);
 }
 let visits=0;
 function color(made,remaining){
  if(++visits>50000)return null;if(!remaining.length)return made;
  let best;
  for(const b of shuffle([...remaining])){
   const height=1+Math.max(...b.shape.map(p=>p[1])),width=1+Math.max(...b.shape.map(p=>p[0])),colors=shuffle(['red','yellow','green']).filter(c=>(c==='green'?width<=3:height<=2)&&![...fixed,...made].some(a=>a.color===c&&touch(a,b)));
   if(!colors.length)return null;if(!best||colors.length<best.colors.length)best={b,colors};
  }
  for(const c of best.colors){const r=color([...made,{...best.b,color:c}],remaining.filter(b=>b!==best.b));if(r)return r;}return null;
 }
 const filled=color([],mutable);if(!filled){const row={index,status:'no-adjacency-safe-coloring',merged,visits};fs.writeFileSync(file,JSON.stringify(row,null,2));history.push(row);console.log(JSON.stringify(row));continue;}
 level.blocks=[...fixed,...filled];delete level.mechanismAdaptation.sourceFactsFile;
 level.mechanismAdaptation.change+=` Finite merged ordinary family ${index}: ${merged.length} merges of ordinary nonblue fragments, preserving cells and fixed blue opening supply. Remaining ordinary colors assigned with adjacency and gate aperture constraints. Actual bodies=${level.blocks.length}; source inventory remains separately observed and is not claimed exact.`;
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,merged,parentFile,formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.search=fast.search(plan,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}}}
 const row={index,levelSha256:packet.levelSha256,bodies:level.blocks.length,structurePassed:passed,status:packet.search?.status,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/merge-history212-${start}.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));

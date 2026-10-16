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
const start=Number(process.argv[2]??0),history=[],S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]),key=p=>p.join(',');
if(fs.existsSync(`${DIR}/domino-history212-${start}.json`))throw Error('Do not repeat family');
for(let index=start;index<start+8;index++){
 let rs=(214021+index*171)|0;const rnd=n=>{rs^=rs<<13;rs^=rs>>>17;rs^=rs<<5;return(rs>>>0)%n;},shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const level=structuredClone(base.level);level.blocks=level.blocks.filter(b=>b.shutterId||b.frozen||b.id==='l212-blue-opening');delete level.mechanismAdaptation.sourceFactsFile;
 const taken=new Set(level.blocks.flatMap(cells).map(key)),rest=new Set(level.playable.map(key).filter(p=>!taken.has(p)));let visits=0;
 function fill(rest,made,singlesLeft,bluesLeft){
  if(++visits>300000||rest.size<singlesLeft||bluesLeft<0||Math.floor(rest.size/2)<bluesLeft)return null;
  if(!rest.size)return singlesLeft===0&&bluesLeft===0?made:null;
  const [x,y]=[...rest][0].split(',').map(Number);
  for(const shape of shuffle([H2,V2,...(singlesLeft?[S]:[])])){
   const pts=shape.map(([a,b])=>[x+a,y+b].join(','));if(!pts.every(p=>rest.has(p)))continue;
   for(const color of shuffle(['red','yellow','green',...(shape.length===2&&bluesLeft?['blue']:[])])){
    const b={id:`l212-domino-${index}-${made.length}`,x,y,shape,color};if(adjacency([...level.blocks,...made,b]).length)continue;
    const next=new Set(rest);pts.forEach(p=>next.delete(p));const result=fill(next,[...made,b],singlesLeft-Number(shape.length===1),bluesLeft-Number(color==='blue'));if(result)return result;
   }
  }return null;
 }
 const made=fill(rest,[],1,9),file=`${DIR}/domino212-${index}.json`;if(fs.existsSync(file))throw Error('Do not overwrite');
 if(!made){const row={index,status:'NO_TILING',visits};fs.writeFileSync(file,JSON.stringify(row,null,2));history.push(row);console.log(JSON.stringify(row));continue;}
 level.blocks.push(...made);level.mechanismAdaptation.change+=` Ordinary opening is retiled as nine blue dominos plus eight other dominos and one other S, preserving first blue Q2 and source ice body. Total29bodies; known source mechanisms unchanged, 2bluefloor cells kept, both source shell properties removed. Family ${index}.`;
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)},passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,parentFile,visits,formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.search=fast.search(plan,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}}}
 const row={index,levelSha256:packet.levelSha256,bodies:level.blocks.length,structurePassed:passed,status:packet.search?.status,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/domino-history212-${start}.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));

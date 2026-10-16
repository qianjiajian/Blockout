import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {nativeWitness64} from './native-witness212-guided.mjs';
import {prefixPayload,runPrefix} from './native-prefix212.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/source212-grid`,sourceFile=`${DIR}/q3ice55prefix212-0.json`,base=JSON.parse(fs.readFileSync(sourceFile));
const changes=Array.from({length:8},(_,i)=>i);
const api0=await loadSpatialApi(),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra},history=[];
for(const[index,extraChanges]of changes.entries()){
 const level=structuredClone(base.level),file=`${DIR}/redLeft55prefix212-${index}.json`;if(fs.existsSync(file))throw Error('Never repeatfailedobject');
 delete level.mechanismAdaptation.sourceFactsFile;

 const get=id=>level.blocks.find(b=>b.id==='l212-'+id),change=[];
 let seed=index+17;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;};const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const topSh=level.shutters.find(s=>s.count===10),small=level.shutters.find(s=>s.count===1);small.x=5;small.y=7;
 level.blocks=level.blocks.filter(b=>b.shutterId===topSh.id);
 const add=(id,color,x,y,shape,extra={})=>level.blocks.push({id:'l212-'+id,color,x,y,shape,...extra}),S=[[0,0]],H2=[[0,0],[1,0]],Q2=[[0,0],[1,0],[0,1],[1,1]],L3=[[0,0],[0,1],[1,1]],Q3=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]);
 add('ice11','red',2,2,H2,{frozen:11});add('cold-red-q3','red',0,6,Q3);add('cold-green-h2','green',3,6,H2);add('first-blue-h2','blue',5,6,H2);add('second-blue-q2','blue',3,7,Q2);
 add('small-red-h2','red',5,7,H2,{shutterId:small.id});add('small-yellow-s','yellow',5,8,S,{shutterId:small.id});add('small-blue-s','blue',6,8,S,{shutterId:small.id});
 level.coloredGrids[0].cells=[[5,0],[6,0]];
 const fixed=structuredClone(level.blocks),remaining=new Set();for(let y=2;y<=5;y++)for(let x=1;x<=5;x++)if(!(y===2&&(x===2||x===3)))remaining.add(x+','+y);
 let nodes=0;const shapes=[L3,Q2,H2,[[0,0],[0,1]],S];
 function fill(left,blueCount,made){if(++nodes>150000)return null;if(!left.size)return blueCount===7?made:null;if(blueCount>7||blueCount+left.size<7)return null;const cell=[...left].sort((a,b)=>{const[ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);return ay-by||ax-bx;})[0],[cx,cy]=cell.split(',').map(Number);let options=[];
 for(const shape of shapes)for(const color of shape.length===1?['blue','red','yellow','green']:['red','yellow','green']){if(color==='blue'&&blueCount>=7)continue;const body={id:'l212-upper-'+made.length,color,x:cx,y:cy,shape},cells=shape.map(([dx,dy])=>(cx+dx)+','+(cy+dy));if(!cells.every(p=>left.has(p))||adjacency([...fixed,...made,body]).length)continue;options.push({body,cells});}
 options=shuffle(options);options.sort((a,b)=>{const score=o=>o.body.color==='blue'?(blueCount<7?1:10):o.body.shape.length===3?2:o.body.shape.length===4?3:4;return score(a)-score(b);});
 for(const{body,cells}of options){const next=new Set(left);cells.forEach(p=>next.delete(p));const found=fill(next,blueCount+Number(body.color==='blue'),[...made,body]);if(found)return found;}return null;}
 const filled=fill(remaining,0,[]);if(!filled){console.log(JSON.stringify({index,status:'no-tiling',nodes}));continue;}level.blocks.push(...filled);
 if(index&1)get('top-d-adapt').color='yellow';
 change.push({family:'left cold red Q3, right initial blue H2 then blue Q2 with two cold small S blockers',upperNativeTiling:filled.map(b=>({id:b.id,color:b.color,x:b.x,y:b.y,shape:b.shape})),smallCurtain:[5,7,2,2],blueFloors:[[5,0],[6,0]]});
 level.mechanismAdaptation.change='Original symmetric55-cell mask; ordinary block shapes/colors are authored new family with left red Q3 delayed until source ice16. Retain source ice19/16/11, red numeric H2 ice11, top blue H2 bomb40, full14/4 hidden layers count10/1, two blue grids moved topblueH2, shells removed per v1.11 floor priority. Source and authored ordinary positions inventory differ. Blue portal span3 needed for previous crosssection design; family explicit. '+JSON.stringify(change);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.allInventoryAdjacency.length&&!audit.mechanismIssues.length,packet={level,levelSha256:digest(level),audit,change,parentSource:{file:sourceFile,levelSha256:base.levelSha256},formalAdopted:false};
 if(passed){const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;packet.planningLevelSha256=digest(plan);let prefix=[];const prefixReplay=replay(level,prefix,api,{timed:true,requirePointerCompatible:true});packet.prefix={length:prefix.length,U:prefixReplay.nonClearingDrags,clears:prefixReplay.clearEvents};packet.search=nativeWitness64(plan,api,{floor:16-prefixReplay.nonClearingDrags,normalize:true,maxMilliseconds:3000,maxStates:350000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index,prefixDrags:prefix});if(packet.search.status==='witness'){try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});for(let n=1;n<=packet.search.drags.length;n++){const r=replay(level,packet.search.drags.slice(0,n),api,{timed:true,requirePointerCompatible:true});if(r.clearEvents>=11){packet.prefix11RouteCost=r.nonClearingDrags;break;}}if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15&&packet.prefix11RouteCost>=11){packet.prefixBound=runPrefix(prefixPayload(plan,api,{goalClears:11,floor:11,maxMilliseconds:6000,maxStates:500000}).p);}}catch(e){packet.replay={valid:false,error:e.message};}}}

 const row={index,levelSha256:packet.levelSha256,prefix:packet.prefix,prefix11:packet.prefix11RouteCost,bound:packet.prefixBound?.status,structurePassed:passed,searchStatus:packet.search?.status,maxClears:packet.search?.maxClearsSeen,partialCost:packet.search?.partialCost,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,error:packet.replay?.error};history.push(row);fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/redLeft55prefix-history212.json`,JSON.stringify({finiteCap:8,millisecondsPerCandidate:4000,history},null,2));


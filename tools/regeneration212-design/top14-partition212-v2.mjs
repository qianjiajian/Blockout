import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {prefixPayload,runPrefix} from './native-prefix212.mjs';
import {nativeWitness64} from './native-witness212-guided.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {adjacency,OUT} from './design212.mjs';
const DIR=`${OUT}/top14-partition-v2`,sourceFile=`${OUT}/source212-grid/q3redVb55prefix212-6.json`,base=JSON.parse(fs.readFileSync(sourceFile));
fs.mkdirSync(DIR,{recursive:true});
const api0=await loadSpatialApi(),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra};
const S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],H3=[[0,0],[1,0],[2,0]],Q2=[[0,0],[1,0],[0,1],[1,1]],L3=[[0,0],[0,1],[1,1]],L4=[[0,0],[0,1],[1,1],[2,1]];
const shapes=[L4,L3,Q2,H3,V2,H2,S].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const shapeFingerprints=new Set(),history=[];
for(let index=0;index<8;index++){
 const file=`${DIR}/candidate-${index}.json`;if(fs.existsSync(file))throw Error('Append-only candidate already exists');
 const level=structuredClone(base.level),top=level.shutters.find(s=>s.count===10),fixed=level.blocks.filter(b=>b.shutterId!==top.id),bomb=structuredClone(level.blocks.find(b=>b.timedBombSeconds));
 let seed=3269+index*499;const rnd=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;},shuffle=a=>{for(let j=a.length-1;j>0;j--){const k=rnd(j+1);[a[j],a[k]]=[a[k],a[j]];}return a;};
 const remain=new Set(Array.from({length:14},(_,i)=>`${i%7},${Math.floor(i/7)}`).filter(p=>!['2,0','3,0'].includes(p)));
 let nodes=0;function fill(left,made,blues){if(++nodes>300000)return null;if(!left.size){const sig=JSON.stringify(made.map(b=>[b.x,b.y,b.shape]));if(blues!==2||made.length<4||made.length>7||shapeFingerprints.has(sig))return null;shapeFingerprints.add(sig);return made;}if(made.length>=7)return null;
  const [cx,cy]=[...left].sort((a,b)=>{const[ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);return ay-by||ax-bx;})[0].split(',').map(Number),options=[];
  for(const shape of shuffle([...shapes]))for(const color of shuffle(['blue','red','yellow','green'])){if(color==='blue'&&blues>=2)continue;if(color==='yellow'&&shape.some(p=>p[1]>0))continue;const cells=shape.map(([x,y])=>`${cx+x},${cy+y}`);if(!cells.every(p=>left.has(p)))continue;const body={id:`l212-top14-${made.length}`,color,x:cx,y:cy,shape,shutterId:top.id};if(adjacency([...fixed,bomb,...made,body]).length)continue;options.push({body,cells});}
  for(const{body,cells}of options){const next=new Set(left);cells.forEach(p=>next.delete(p));const found=fill(next,[...made,body],blues+Number(body.color==='blue'));if(found)return found;}return null;
 }
 const made=fill(remain,[],1);if(!made)throw Error('No distinct native tiling '+index);level.blocks=[...fixed,bomb,...made];delete level.mechanismAdaptation.sourceFactsFile;
 level.mechanismAdaptation.change='New authored q0 top14-cell hidden tiling, retain blue H2 bomb40 and exactly two hidden blue bodies; source curtain10/1, ice19/16/11 and red H2 ice11, two blue floors retained. Ordinary shapes/colors differ from source, no source fact overwritten. '+JSON.stringify(made);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&audit.nativeQ0&&!audit.mechanismIssues.length;
 const packet={level,levelSha256:digest(level),audit,parentSource:{file:sourceFile,levelSha256:base.levelSha256},formalAdopted:false,finiteBudget:{hiddenMilliseconds:1500,hiddenStates:100000,prefixMilliseconds:6000,prefixStates:500000,upperMilliseconds:3000,upperStates:350000}};
 if(passed){
  const hidden=structuredClone(level);hidden.blocks=hidden.blocks.filter(b=>b.shutterId===top.id).map(b=>{delete b.shutterId;delete b.timedBombSeconds;return b;});hidden.shutters=[];hidden.gates.forEach(g=>delete g.frozen);
  packet.hiddenProjection={level:hidden,sha256:digest(hidden),statement:'Keep complete original playable geometry and colored floors. Delete all other bodies, remove all shutter covers and bomb timer, open all ice gates. Count only hidden-body non-clearing drags after reveal; no costs before reveal belong to this term.'};
  const h=liftPayload(hidden,api,{floor:5,maxMilliseconds:1500,maxStates:100000});packet.hiddenBound=runNativeLift(h.p);
  if(packet.hiddenBound.status==='threshold-proven'||packet.hiddenBound.relaxedNonClearingDrags>0){
   const lowerHidden=packet.hiddenBound.status==='threshold-proven'?5:packet.hiddenBound.relaxedNonClearingDrags;
   const plan=structuredClone(level);plan.blocks.forEach(b=>delete b.timedBombSeconds);packet.prefixBound=runPrefix(prefixPayload(plan,api,{goalClears:10,floor:11-lowerHidden,maxMilliseconds:6000,maxStates:500000,mergeCold:true}).p);
   if(packet.prefixBound.status==='threshold-proven'){packet.search=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000});if(packet.search.status==='witness')try{packet.replay=replay(level,packet.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}}
  }
 }
 fs.writeFileSync(file,JSON.stringify(packet,null,2));const row={index,sha:packet.levelSha256,topBodies:made.length+1,static:passed,hidden:packet.hiddenBound?.status,hiddenCost:packet.hiddenBound?.relaxedNonClearingDrags,hiddenResult:packet.hiddenBound?.cost,prefix:packet.prefixBound?.status,U:packet.replay?.nonClearingDrags};history.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync(`${DIR}/history.json`,JSON.stringify({finiteCap:8,history},null,2));

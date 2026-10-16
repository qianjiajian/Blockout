import fs from 'node:fs';
import {nativeWitness64} from './continuation211-native-witness64.mjs';
import {loadSpatialApi} from './continuation211-colored-witness.mjs';
import {staticDelayedLiftFloor} from './regeneration211-design/native-static-lift214.mjs';
import {loadApi,replay} from './remake191-200/replay.mjs';
import {sha256} from './continuation211-runtime.mjs';
import {adjacency} from './regeneration212-design/design212.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';

const OUT='deliverables/continue211-220-20260930/root212-top6';fs.mkdirSync(OUT,{recursive:true});
const api=await loadSpatialApi(),strict=(await loadApi()).api,history=[],seen=new Set(),patterns=[];
for(let qx=0;qx<=5;qx++){
 const used=new Set([qx,qx+1,qx+7,qx+8]);
 const recurse=bs=>{const p=Array.from({length:14},(_,i)=>i).find(i=>!used.has(i));if(p===undefined){if(bs.some(b=>b.shape[1][0]===1))patterns.push([{x:qx,y:0,shape:[[0,0],[1,0],[0,1],[1,1]]},...bs]);return;}const x=p%7,y=Math.floor(p/7);for(const shape of [[[0,0],[1,0]],[[0,0],[0,1]]]){const cells=shape.map(([a,b])=>[x+a,y+b]);if(cells.some(([a,b])=>a>=7||b>=2||used.has(b*7+a)))continue;cells.forEach(([a,b])=>used.add(b*7+a));recurse([...bs,{x,y,shape}]);cells.forEach(([a,b])=>used.delete(b*7+a));}};recurse([]);
}
let seed=2129983;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let n=0;n<36;n++){
 const baseFile=`deliverables/continue211-220-20260930/design212-new/source212-grid/q3bar55prefix212-${n%2?4:0}.json`,base=JSON.parse(fs.readFileSync(baseFile));let level,tiling;
 for(let tries=0;tries<1000;tries++){
  level=structuredClone(base.level);tiling=patterns[Math.floor(rand()*patterns.length)];level.blocks=level.blocks.filter(b=>b.shutterId!=='l212-cover10');
  const bodies=tiling.map((b,i)=>({...b,id:'root212-top6-'+i,shutterId:'l212-cover10',color:null}));
  const horizontal=bodies.filter(b=>b.shape.length===2&&b.shape[1][0]===1),bomb=horizontal[Math.floor(rand()*horizontal.length)];bomb.color='blue';bomb.timedBombSeconds=40;
  const other=bodies.filter(b=>b!==bomb);other[Math.floor(rand()*other.length)].color='blue';
  const blanks=bodies.filter(b=>b.color===null);let valid=false;
  for(let j=0;j<40;j++){blanks.forEach(b=>b.color=['red','yellow','green'][Math.floor(rand()*3)]);if(!adjacency([...level.blocks,...bodies]).length){valid=true;break;}}
  if(!valid)continue;level.blocks.push(...bodies);const fingerprint=sha256(level.blocks);if(seen.has(fingerprint))continue;seen.add(fingerprint);break;
 }
 if(adjacency(level.blocks).length)continue;
 level.mechanismAdaptation.change+=' Root top6 final adaptation: ordinary upper7x2 hidden region retiled as1Q2+5native dominos, six bodies; keep blueH2bomb40 and one other blue body. Source hidden shapes versus authored six-body inventory separated.';
 if(!auditOpeningCoverage(new strict.PuzzleModel(level).snapshot()).passed||!auditHiddenCoverage(level).passed||!level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0))continue;
 const projection=structuredClone(level);projection.blocks.forEach(b=>delete b.timedBombSeconds);
 const upper=nativeWitness64(projection,api,{floor:16,maxMilliseconds:3000,maxStates:350000}),drags=upper.drags??[];
 let route;try{if(drags.length)route=replay(level,drags,strict,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){route={valid:false,error:e.message};}
 const packet={level,levelSha256:sha256(level),projection,drags,replay:route,upper,parentSource:baseFile,finiteBudget:{upperMilliseconds:3000,upperStates:350000,lowerMilliseconds:6000,lowerStates:2000000}};
 if(route?.valid&&route.complete&&route.nonClearingDrags>=11&&route.nonClearingDrags<=15){level.preservedMoveTarget=route.effectiveDrags;projection.preservedMoveTarget=route.effectiveDrags;packet.levelSha256=sha256(level);packet.lower=staticDelayedLiftFloor(projection,api,{floor:11,maxMilliseconds:6000,maxStates:2000000});}
 const row={n,bodies:level.blocks.length,U:route?.nonClearingDrags,valid:route?.valid,complete:route?.complete,max:upper.maxClearsSeen,L:packet.lower?.status,frontier:packet.lower?.frontierCost};history.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/candidate-${n}.json`,JSON.stringify(packet,null,2),{flag:'wx'});fs.writeFileSync(OUT+'/history.json',JSON.stringify(history,null,2));if(packet.lower?.thresholdProven){console.log('QUALIFIED');break;}
}

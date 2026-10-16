import fs from 'node:fs';
import {nativeWitness64} from './regeneration212-design/native-witness212-guided.mjs';
import {loadSpatialApi,compileSpatial} from './continuation211-optional-lift-domain.mjs';
import {staticDelayedLiftFloor} from './regeneration211-design/native-static-lift214.mjs';
import {loadApi,replay} from './remake191-200/replay.mjs';
import {sha256} from './continuation211-runtime.mjs';
import {adjacency} from './regeneration212-design/design212.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
const OUT='deliverables/continue211-220-20260930/root212-skeleton-v6';fs.mkdirSync(OUT,{recursive:true});
const api=await loadSpatialApi(),strict=(await loadApi()).api,history=[],baseFile='deliverables/continue211-220-20260930/design212-new/source212-grid/q3ice55prefix212-0.json',base=JSON.parse(fs.readFileSync(baseFile)),layouts=JSON.parse(fs.readFileSync('deliverables/continue211-220-20260930/root212-skeleton/layouts.json')).results;
let seed=21293401;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const seen=new Set();
for(let n=0;n<16;n++){
 const l=layouts[0],level=structuredClone(base.level),cut=new Set([21,28,27,34]);
 level.playable=Array.from({length:63},(_,p)=>p).filter(p=>!cut.has(p)).map(p=>[p%7,Math.floor(p/7)]);
 level.blocks=level.blocks.filter(b=>b.shutterId==='l212-cover10');level.shutters[1].x=l.smallX;
 const body=(id,cells,color,extra={})=>{const x=Math.min(...cells.map(p=>p%7)),y=Math.min(...cells.map(p=>Math.floor(p/7)));return {id,x,y,color,shape:cells.map(p=>[p%7-x,Math.floor(p/7)-y]),...extra};};
 const cold=l.rects.map((c,i)=>body('skeleton-cold-'+i,c.filter(p=>!cut.has(p)),'green'));
 level.blocks.push(...cold,body('skeleton-ice11',l.ice,'red',{frozen:11}),...l.blue.map((c,i)=>body('skeleton-blue-'+i,c,'blue')));
 level.blocks.push({id:'skeleton-small-blueQ2',x:l.smallX,y:7,color:'blue',shape:[[0,0],[1,0],[0,1],[1,1]],shutterId:'l212-cover1'});
 const ice=level.blocks.find(b=>b.id==='skeleton-ice11');delete ice.frozen;const iceNew=cold[5];iceNew.shape=[[0,0],[1,0]];iceNew.frozen=11;iceNew.color='red';cold.splice(5,1);const extra={id:'skeleton-right-bottom-cold',x:5,y:7,color:'green',shape:[[0,0],[1,0]]};level.blocks.push(extra);cold.push(extra);
 const blue=level.gates.find(g=>g.color==='blue');blue.side='right';blue.offset=6;blue.size=3;
 // Two blue source floor cells on the small concealed blue body, away from yellow left port.
 level.coloredGrids[0].cells=n%2===0?[[0,8],[1,8]]:[[5,8],[6,8]];
 let valid=false;for(let j=0;j<1500;j++){
  cold.forEach(b=>b.color=['red','yellow','green'][Math.floor(rand()*3)]);
  const count=c=>level.blocks.filter(b=>b.color===c).length;
  if(count('blue')+count('yellow')<16||count('blue')+count('yellow')+count('red')<19)continue;
  if([undefined,'l212-cover10','l212-cover1'].some(id=>adjacency(level.blocks.filter(b=>b.shutterId===id)).length))continue;const k=sha256(level.blocks);if(seen.has(k))continue;seen.add(k);valid=true;break;
 }
 if(!valid){console.log({n,noColoring:true});continue;}
 level.mechanismAdaptation.change='v6 new ice11 at5,6 replaces ordinary Q2 with iceH2 andordinaryH2; oldiceH2ordinaryred, counts preserved. New original59cell symmetric notch board. Source56cell/32body versus authored25body: ordinary bodies merged into 5Q2+2V2, nine separate blue components; source top hidden6 adapted7 full14cells and small hidden1 blueQ2 full4cells. Keep source 2bluefloor, both curtain counts10/1, redH2ice11, blueH2bomb40 and all 3gate ice19/16/11. Source shells removed per v1.11 colored-floor conflict; retained bodies are retilled. Blue ordinary gate moved to right'+blue.offset+' span2. All shape/color/position differences are authored, source facts remain separate.';
 const projection=structuredClone(level);projection.blocks.forEach(b=>delete b.timedBombSeconds);
 const packet={level,levelSha256:sha256(level),projection,parentSource:baseFile,coverage:auditOpeningCoverage(new strict.PuzzleModel(level).snapshot()),hiddenCoverage:auditHiddenCoverage(level),adjacency:[undefined,'l212-cover10','l212-cover1'].flatMap(id=>adjacency(level.blocks.filter(b=>b.shutterId===id)))};
 const c=compileSpatial(projection,api);packet.staticBlockedBodies=c.blocks.filter(b=>{const seen=new Set([b.initial]),q=[b.initial];for(let i=0;i<q.length;i++)for(const to of b.poses[q[i]].neighbors)if(!seen.has(to)){seen.add(to);q.push(to);}return !q.some(pos=>b.poses[pos].exits[0].length);}).map(b=>b.id);
 if(packet.coverage.passed&&packet.hiddenCoverage.passed&&!packet.adjacency.length&&!packet.staticBlockedBodies.length){packet.upper=nativeWitness64(projection,api,{floor:16,maxMilliseconds:3000,maxStates:350000});packet.drags=packet.upper.drags??[];if(packet.drags.length){try{packet.replay=replay(level,packet.drags,strict,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}if(packet.replay?.valid&&packet.replay.complete&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){level.preservedMoveTarget=packet.replay.effectiveDrags;projection.preservedMoveTarget=packet.replay.effectiveDrags;packet.levelSha256=sha256(level);packet.lower=staticDelayedLiftFloor(projection,api,{floor:11,maxMilliseconds:6000,maxStates:2000000});}}}
 const row={n,N:level.blocks.length,blocked:packet.staticBlockedBodies,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,max:packet.upper?.maxClearsSeen,L:packet.lower?.status,frontier:packet.lower?.frontierCost};history.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/candidate-${n}.json`,JSON.stringify(packet,null,2),{flag:'wx'});fs.writeFileSync(OUT+'/history.json',JSON.stringify(history,null,2));if(packet.lower?.thresholdProven)break;
}

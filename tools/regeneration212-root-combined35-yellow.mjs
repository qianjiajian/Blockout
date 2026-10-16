import fs from 'node:fs';import {compactRoute} from './continuation211-compact-colored.mjs';
import{nativeWitness64}from './regeneration211-design/aux212/witness-cost60.mjs';
import{stationaryPayload,stationaryPrefix}from './regeneration211-design/aux212/stationary-prefix.mjs';
import{loadSpatialApi}from './continuation211-optional-lift-domain.mjs';
import{loadApi,replay}from './remake191-200/replay.mjs';
import{sha256}from './continuation211-runtime.mjs';
import{adjacency}from './regeneration212-design/design212.mjs';
import{auditOpeningCoverage}from './revised-opening-coverage.mjs';
import{auditHiddenCoverage}from './revised-hidden-coverage.mjs';
const DIR='deliverables/continue211-220-20260930/root212-combined35-yellow';fs.mkdirSync(DIR,{recursive:true});
const hiddenFile='deliverables/continue211-220-20260930/root212-hidden35-grid/hidden-0.json',hidden=JSON.parse(fs.readFileSync(hiddenFile)),api=await loadSpatialApi(),strict=(await loadApi()).api,history=[];
let seed=212394701;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let n=0;n<4;n++){
 const level=structuredClone(hidden.level);level.gates.forEach(g=>{if(g.color!=='blue')g.frozen={yellow:11,red:16,green:19}[g.color];});
 level.shutters=[{id:'root212-top35',x:0,y:0,width:7,height:5,count:10,skin:'shutter'},{id:'root212-small4',x:0,y:7,width:2,height:2,count:1,skin:'shutter'}];
 level.blocks.forEach(b=>{b.shutterId='root212-top35';if(b.id==='l212-top-bomb40')b.timedBombSeconds=40;});
 const iceX=[2,4,0,2][n%4],iceY=[8,8,6,6][n%4];
 level.blocks.push({id:'root212-red-ice11',x:iceX,y:iceY,color:'red',shape:[[0,0],[1,0]],frozen:11});
 const cold=[];
 for(const[x,y]of level.playable){if(y<5||y>=7&&x<2||y===iceY&&(x===iceX||x===iceX+1))continue;const color=(x+y)%2===0?'blue':'green',b={id:`root212-${x}-${y}`,x,y,color,shape:[[0,0]]};level.blocks.push(b);if(color!=='blue')cold.push(b);}
 level.blocks.push(...[[0,7,'yellow'],[1,7,'blue'],[0,8,'blue'],[1,8,'yellow']].map(([x,y,color])=>({id:'root212-small-'+x+'-'+y,x,y,color,shape:[[0,0]],shutterId:'root212-small4'})));
 for(let j=0;j<100;j++){cold.forEach(b=>b.color='yellow');if(!adjacency(level.blocks.filter(b=>!b.shutterId)).length)break;}
 level.mechanismAdaptation.change='New authored59cell geometry, top7x5 count10 curtain with13 native hidden bodies versus source7x2 six; small2x2 count1 blueQ2 replaces source singleS plus3 uncovered cells. Source56cell/32body versus full33body. Preserve2bluefloor cells, redH2ice11, blueH2bomb40, three icegates19/16/11; sourcecolored-floor-shell conflict removes2shell attributes and retains ordinary inventory via retile. Source ordinaryblue outlet widened2to3 within limit for new lower chamber layout. Source facts remain separately recorded.';
 const projection=structuredClone(level);projection.blocks.forEach(b=>delete b.timedBombSeconds);
 const packet={level,levelSha256:sha256(level),projection,hiddenFile,coverage:auditOpeningCoverage(new strict.PuzzleModel(level).snapshot()),hiddenCoverage:auditHiddenCoverage(level),adjacency:adjacency(level.blocks.filter(b=>!b.shutterId))};
 if(packet.coverage.passed&&packet.hiddenCoverage.passed&&!packet.adjacency.length){packet.prefixInput=stationaryPayload(level,api,{goalClears:10});packet.prefix=stationaryPrefix(packet.prefixInput,{floor:4,maxMilliseconds:2000,maxStates:200000});packet.upper=nativeWitness64(projection,api,{floor:18,maxMilliseconds:5000,maxStates:600000});packet.drags=packet.upper.drags??[];if(packet.drags.length){packet.compact=compactRoute(projection,packet.drags,api,{maxMilliseconds:1500,maxPasses:2});packet.drags=packet.compact.drags;try{packet.replay=replay(level,packet.drags,strict,{complete:true,timed:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}}}
 const row={n,N:level.blocks.length,prefix:packet.prefix?.status,min:packet.prefix?.minimum,U:packet.replay?.nonClearingDrags,valid:packet.replay?.valid,max:packet.upper?.maxClearsSeen};history.push(row);console.log(JSON.stringify(row));fs.writeFileSync(DIR+`/candidate-${n}.json`,JSON.stringify(packet,null,2),{flag:'wx'});fs.writeFileSync(DIR+'/history.json',JSON.stringify(history,null,2));if(packet.prefix?.thresholdProven&&packet.replay?.valid&&packet.replay.nonClearingDrags<=15){console.log('FULL QUALIFIED candidate',n);break;}
}

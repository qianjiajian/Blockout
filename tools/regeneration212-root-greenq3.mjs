import fs from 'node:fs';
import {nativeWitness64} from './continuation211-native-witness64-v2.mjs';
import {loadSpatialApi,compileSpatial} from './continuation211-optional-lift-domain.mjs';
import {staticDelayedLiftFloor} from './regeneration211-design/native-static-lift214.mjs';
import {loadApi,replay} from './remake191-200/replay.mjs';
import {sha256} from './continuation211-runtime.mjs';
import {adjacency} from './regeneration212-design/design212.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
const OUT='deliverables/continue211-220-20260930/root212-greenq3';fs.mkdirSync(OUT,{recursive:true});const api=await loadSpatialApi(),strict=(await loadApi()).api,history=[];
for(let n=0;n<16;n++){
 const baseFile=`deliverables/continue211-220-20260930/design212-new/source212-grid/q3ice55prefix212-${n%8}.json`,base=JSON.parse(fs.readFileSync(baseFile)),level=structuredClone(base.level),get=id=>level.blocks.find(b=>b.id==='l212-'+id);
 get('blue-q3').color='green';get('new-green-t4').color='red';get('fill-2').color='yellow';get('fill-19').color='red';get('blue-0').color='green';
 const old=get('new-green-v3');level.blocks=level.blocks.filter(b=>b!==old);level.blocks.push({id:'root212-right-redV2',x:5,y:3,color:'red',shape:[[0,0],[0,1]]},{id:'root212-right-blueS',x:5,y:5,color:'blue',shape:[[0,0]]});
 const gate=level.gates.find(g=>g.color==='blue');gate.side='bottom';gate.offset=n<8?2:1;gate.size=2;
 level.mechanismAdaptation.change+=' Root new greenQ3 held until19clear, redT4 and rightredV2/blueS retile. Ordinaryblue exit moved to realbottom offset'+gate.offset+' span2 (source right6/span2); largegreen3x3 uses preservedtopgreen span3. Keep twofloors/twofullcurtains, redH2ice11, blueH2bomb40 and all icegates. Ordinarycolors/positions explicitly adapted.';
 const projection=structuredClone(level);projection.blocks.forEach(b=>delete b.timedBombSeconds);
 const pairs=adjacency(level.blocks),coverage=auditOpeningCoverage(new strict.PuzzleModel(level).snapshot()),hidden=auditHiddenCoverage(level),packet={level,levelSha256:sha256(level),projection,parentSource:baseFile,adjacency:pairs,coverage,hiddenCoverage:hidden};
 if(!pairs.length&&coverage.passed&&hidden.passed){const c=compileSpatial(projection,api);packet.staticBlockedBodies=c.blocks.filter(b=>{const seen=new Set([b.initial]),q=[b.initial];for(let i=0;i<q.length;i++)for(const to of b.poses[q[i]].neighbors)if(!seen.has(to)){seen.add(to);q.push(to);}return !q.some(pos=>b.poses[pos].exits[0].length);}).map(b=>b.id);
 if(!packet.staticBlockedBodies.length){packet.upper=nativeWitness64(projection,api,{floor:16,maxMilliseconds:3000,maxStates:350000});packet.drags=packet.upper.drags??[];if(packet.drags.length){try{packet.replay=replay(level,packet.drags,strict,{timed:true,complete:true,requirePointerCompatible:true});}catch(e){packet.replay={valid:false,error:e.message};}const r=packet.replay;if(r.valid&&r.complete&&r.nonClearingDrags>=11&&r.nonClearingDrags<=15){level.preservedMoveTarget=r.effectiveDrags;projection.preservedMoveTarget=r.effectiveDrags;packet.levelSha256=sha256(level);packet.lower=staticDelayedLiftFloor(projection,api,{floor:11,maxMilliseconds:6000,maxStates:2000000});}}}}
 const row={n,pairs,staticBlocked:packet.staticBlockedBodies,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,max:packet.upper?.maxClearsSeen,L:packet.lower?.status,frontier:packet.lower?.frontierCost};history.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/candidate-${n}.json`,JSON.stringify(packet,null,2),{flag:'wx'});fs.writeFileSync(OUT+'/history.json',JSON.stringify(history,null,2));if(packet.lower?.thresholdProven)break;
}

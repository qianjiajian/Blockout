import fs from 'node:fs';
import {api,baseline,shapes,tile,recolor,rng,audit,save,digest,ruleGate} from './common.mjs';
import {noFlipSpatialBridge} from './spatial-bridge.mjs';
import {loadSpatialApi,searchSpatial} from '../campaign-v145/lv141-150/round2-a/witness-greedy.mjs';
import {checkNativePrunedFloor} from '../campaign-v145/lv141-150/round2-c/native96.mjs';
import {measureRoute} from '../remake21to30-quality.mjs';
ruleGate();const spatialApi={...api,...await loadSpatialApi()},R=rng(Number(process.env.SEED??102160)),rows=[];
const base=baseline.levels[159],cover={id:'r102-160-cover13',x:0,y:4,width:7,height:5,count:13};
const gates=[{id:'r102-160-cyan',color:'cyan',side:'top',offset:4,size:3},{id:'r102-160-purple5',color:'purple',side:'top',offset:0,size:3,frozen:5},{id:'r102-160-red9',color:'red',side:'right',offset:0,size:3,frozen:9},{id:'r102-160-yellow14',color:'yellow',side:'right',offset:4,size:3,frozen:14},{id:'r102-160-green19',color:'green',side:'left',offset:5,size:3,frozen:19},{id:'r102-160-orange20',color:'orange',side:'bottom',offset:4,size:3,frozen:20}];
const openShapes=[...Array(7).fill(8),3,...Array(9).fill(1),2];
// Preserve all 9 observed hidden bodies and all 3 axis instances. Hidden source
// footprints cover28/35; resize ordinary bodies by7 cells for true layer fill.
const hiddenShapes=[8,9,4,8,13,14,4,4,7];
let best=-1,found=0;const rejected={};const skip=why=>{rejected[why]=(rejected[why]??0)+1;};
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??180);attempt++){
 const seed=R.state();R.random();
 const op=openShapes.map((n,i)=>({id:'r102-160-o'+i,shape:shapes[n],color:'cyan',...(i===7?{movementAxis:'horizontal'}:{})}));
 if(attempt%3===1){for(let i=0;i<7;i++)if(R.random()<.5)op[i].shape=shapes[2];}
 const bs=tile(op,base.level.playable.filter(p=>p[1]<4),{seed,maxNodes:1500});if(!bs){skip('open-tile');continue;}
 const axis=bs.find(b=>b.movementAxis);if(axis.y>0){skip('axis-y');continue;}
 const first=R.shuffle(bs.filter(b=>b.y===0&&b.x>=4))[0];if(!first){skip('first');continue;}
 if(!recolor(bs,['cyan','cyan','cyan','purple','purple','red'],{seed,pins:{[axis.id]:'red',[first.id]:'cyan'}})){skip('color');continue;}
 if(bs.filter(b=>b.color==='cyan').length<5||bs.filter(b=>['cyan','purple'].includes(b.color)).length<9){skip('clear-load');continue;}
 const hs=hiddenShapes.map((n,i)=>({id:'r102-160-h'+i,shape:shapes[n],color:'orange',shutterId:cover.id,...(i===3?{movementAxis:'horizontal'}:i===4?{movementAxis:'vertical'}:{})}));
 const hidden=tile(hs,base.level.playable.filter(p=>p[1]>=4),{seed:seed+900,maxNodes:4000});if(!hidden){skip('hidden-tile');continue;}
 const hAxis=hidden.find(b=>b.movementAxis==='horizontal'),vAxis=hidden.find(b=>b.movementAxis==='vertical');
 if(vAxis.x>1||hAxis.y>6){skip('hidden-axis-exit');continue;}
 if(!recolor(hidden,['red','yellow','green','orange','purple','cyan'],{seed:seed+333,pins:{[hAxis.id]:'yellow',[vAxis.id]:'purple'}})){skip('hidden-color');continue;}
 // At least19 pre-green/20 pre-orange clear events must be possible in total.
 const blocks=[...bs,...hidden];if(blocks.filter(b=>!['green','orange'].includes(b.color)).length<20)continue;
 const level={...structuredClone(base.level),mechanismRules:'revised-2026-09-27-v1.5',difficulty:'normal',preservedMoveTarget:base.starTargets.moveTarget,blocks,gates,shutters:[cover]};delete level.flipDoors;delete level.generators;delete level.coloredGrids;
 let checks,search,replay,proof,measurement;const row={attempt,seed,levelSha256:digest(level),budget:{maxMilliseconds:1200,maxStates:20000,maxTransitions:250000,floor:16}};
 try{checks=audit(level);if(!checks.passed){row.status='audit-failed';row.issues=Object.entries(checks).filter(([k,v])=>k!=='passed'&&!v.passed).map(([k])=>k);rows.push(row);continue;}
 const spatial=noFlipSpatialBridge(level,api);search=searchSpatial(spatial,spatialApi,{...row.budget,orderSeed:attempt,diagnosticTrace:true});row.status=search.status;row.maxClears=search.maxClearsSeen;
 if(search.status==='witness'){replay=api.replayRevisedRoute(level,search.drags);row.U=replay.nonClearingDrags;row.valid=replay.valid;row.complete=replay.complete;
 if(replay.valid&&replay.complete){measurement=measureRoute(level,search.drags,api);row.multi=measurement.multiCellDrags;row.single=measurement.singleCellDrags;if(replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15&&measurement.multiCellDrags>measurement.singleCellDrags)proof=checkNativePrunedFloor(spatial,api,{floor:11,maxStates:150000,maxMilliseconds:2000});row.proof=proof?.status;}
 }
 }catch(e){row.status='error';row.error=e.message;}
 rows.push(row);
 if((search?.maxClearsSeen??-1)>best||replay?.complete){best=Math.max(best,search?.maxClearsSeen??-1);const p=save('root160/candidate160',{taskRule:'1.102.0',level,levelSha256:digest(level),iteration:row,audit:checks,search,replay,drags:search?.drags??[],proof,measurement,sourceReview:{passed:false},adoptionReady:false});console.log(JSON.stringify({...row,p}));}
 if(proof?.thresholdProven){found++;break;}
}
console.log(JSON.stringify({attempts:save('root160/attempts160',{rows,rejected}),tested:rows.length,found,rejected}));

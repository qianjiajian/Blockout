import fs from 'node:fs';
import {api,baseline,shapes,tile,recolor,rng,audit,guard,save,digest,OUT} from './common.mjs';
import {search153} from './witness153.mjs';
import {projection} from './witness151.mjs';
import {searchSpatial as floorSearch,loadSpatialApi} from '../../remake111to120-spatial-floor-v147.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
const floorApi={...api,...await loadSpatialApi()};guard();const base=baseline.levels[152],R=rng(Number(process.env.SEED??102153)),stamp=Date.now();let best=-1;
const covers=[{id:'n153-lift-upper',x:3,y:0,width:3,height:3,count:0,skin:'lift'},{id:'n153-lift-lower',x:0,y:4,width:3,height:3,count:0,skin:'lift'}];
const h1=[{id:'n153-h1-green',shape:shapes[10],color:'green'},{id:'n153-h1-yellow',shape:shapes[1],color:'yellow'},{id:'n153-h1-blue',shape:shapes[6],color:'blue'}],h2=[{id:'n153-h2-red',shape:shapes[9],color:'red'},{id:'n153-h2-blue',shape:shapes[2],color:'blue'},{id:'n153-h2-yellow',shape:shapes[2],color:'yellow'},{id:'n153-h2-purple',shape:shapes[2],color:'purple'}];
const hidden=covers.flatMap((s,i)=>tile(i?h2:h1,Array.from({length:9},(_,j)=>[s.x+j%3,s.y+Math.floor(j/3)]),{seed:i+11}).map(b=>({...b,shutterId:s.id})));
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??200);attempt++){
 const seed=R.state();R.random();const specs=Array.from({length:29},(_,i)=>({id:'n102-153-'+i,color:'red',shape:shapes[i<19?1:i<26?R.random()<.5?2:8:4]})),blocks=tile(specs,base.level.playable,{seed});if(!blocks)continue;
 const first=blocks.find(b=>b.x+Math.max(...b.shape.map(p=>p[0]))===5&&b.y>=4&&b.y+Math.max(...b.shape.map(p=>p[1]))<7);if(!first)continue;
 if(!recolor(blocks,['purple','purple','green','green','yellow','red','blue'],{seed,pins:{[first.id]:'purple'}}))continue;
 const iced=R.shuffle(blocks.filter(b=>b!==first&&b.shape.length===2)).slice(0,2);if(iced.length!==2)continue;iced[0].frozen=15;iced[1].frozen=13;
 const level={...structuredClone(base.level),mechanismRules:'revised-2026-09-27-v1.5',difficulty:'easy',blocks:[...blocks,...structuredClone(hidden)],gates:[{id:'n153-yellow',color:'yellow',side:'top',offset:1,size:3,frozen:8},{id:'n153-green',color:'green',side:'left',offset:4,size:3,frozen:3},{id:'n153-purple',color:'purple',side:'right',offset:4,size:3}],flipDoors:[{id:'n153-red',color:'red',side:'left',offset:0,size:3,frozen:11,initiallyOpen:true},{id:'n153-blue',color:'blue',side:'right',offset:0,size:3,frozen:11,initiallyOpen:true}],shutters:structuredClone(covers)};for(const k of ['coloredGrids','generators','elevators','conveyors'])delete level[k];
 let checks,result,replay,measure,proof;try{checks=audit(level);if(!checks.passed){if(attempt<3)console.log(JSON.stringify({attempt,audit:checks}));continue;}result=search153(level,api,{maxMilliseconds:600,maxCost:10,seed:attempt});if(result.status==='witness'){replay=api.replayRevisedRoute(level,result.drags);if(replay.complete){measure=measureRoute(level,result.drags,api);if(replay.nonClearingDrags>=5&&measure.multiCellDrags>measure.singleCellDrags)proof=floorSearch(projection(level),floorApi,{floor:5,prove:true,maxStates:100000,maxMilliseconds:1200});}}}catch(e){result={status:'error',error:e.message};}
 const row={attempt,seed,levelSha256:digest(level),status:result?.status,reason:result?.reason,error:result?.error,bestClears:result?.bestClears,U:replay?.nonClearingDrags,proof:proof?.status,multi:measure?.multiCellDrags,single:measure?.singleCellDrags};fs.appendFileSync(`${OUT}/iterations153-${stamp}.jsonl`,JSON.stringify(row)+'\n');
 if(replay?.complete&&replay.nonClearingDrags>=5&&measure.multiCellDrags>measure.singleCellDrags){const p=save('candidate153',{ruleVersion:'1.102.0',level,drags:result.drags,levelSha256:digest(level),audit:checks,replay,measure,proof,sourceReview:{passed:false,reason:'Frozen flip first-thaw states need independent review.'},iteration:{attempt,seed,witnessBudgetMs:600,proofBudgetMs:1200},adoptionReady:false});console.log(JSON.stringify({...row,p}));if(proof?.thresholdProven)break;}
 if((result?.bestClears??0)>best||attempt%20===0){best=Math.max(best,result?.bestClears??0);console.log(JSON.stringify(row));}
}
console.log(JSON.stringify({done:true,best,log:`${OUT}/iterations153-${stamp}.jsonl`}));

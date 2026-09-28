import fs from 'node:fs';
import {api,baseline,shapes,tile,recolor,rng,audit,guard,save,digest,OUT} from './common.mjs';
import {search,projection} from './witness151.mjs';
import {checkAxisFloor} from '../../remake131to140-axis-floor-v172.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
guard();const base=baseline.levels[151],R=rng(Number(process.env.SEED??102152)),stamp=Date.now();let best=-1;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??200);attempt++){
 const seed=R.state();R.random();const specs=Array.from({length:13},(_,i)=>({id:'n102-152-'+i,color:'red',shape:shapes[i<2?1:R.random()<.7?8:2]})),blocks=tile(specs,base.level.playable,{seed});if(!blocks)continue;
 const first=blocks.find(b=>b.y===0&&b.x===2&&b.shape.length===2);if(!first)continue;const axis=R.shuffle(blocks.filter(b=>b!==first&&b.x>=2&&b.x+Math.max(...b.shape.map(p=>p[0]))<=3))[0];if(!axis)continue;axis.movementAxis='vertical';
 const pins={[axis.id]:'blue',[first.id]:'blue'},shells=R.shuffle(blocks.filter(b=>b!==axis&&b!==first)).slice(0,5),pairs=[['blue','yellow'],['yellow','red'],['yellow','red'],['blue','green'],['red','green']];for(let j=0;j<5;j++){shells[j].layers=pairs[j];pins[shells[j].id]=pairs[j][0];}
 if(!recolor(blocks,['red','blue','green','yellow'],{seed,pins}))continue;const openCount=blocks.flatMap(b=>b.layers??[b.color]).filter(c=>c==='blue'||c==='green').length;if(openCount!==9)continue;
 const level={...structuredClone(base.level),mechanismRules:'revised-2026-09-27-v1.5',difficulty:'hard',blocks,gates:[],flipDoors:[{id:'n152-blue',color:'blue',side:'top',offset:2,size:2,initiallyOpen:true},{id:'n152-green',color:'green',side:'left',offset:2,size:2,initiallyOpen:true},{id:'n152-yellow',color:'yellow',side:'right',offset:2,size:2,initiallyOpen:false},{id:'n152-red',color:'red',side:'bottom',offset:2,size:2,initiallyOpen:false}]};for(const k of ['coloredGrids','shutters','generators','elevators','conveyors'])delete level[k];
 let checks,result,replay,measure,proof;try{checks=audit(level);if(!checks.passed)continue;result=search(level,{milliseconds:600,maxCost:20});if(result.status==='witness'){replay=api.replayRevisedRoute(level,result.drags);if(replay.complete){measure=measureRoute(level,result.drags,api);if(replay.nonClearingDrags>=16&&measure.multiCellDrags>measure.singleCellDrags)proof=checkAxisFloor(projection(level),api,{floor:16,maxStates:200000,maxMilliseconds:1800});}}}catch(e){result={status:'error',error:e.message};}
 const row={attempt,seed,levelSha256:digest(level),status:result?.status,bestClears:result?.bestClears,error:result?.error,U:replay?.nonClearingDrags,proof:proof?.status,multi:measure?.multiCellDrags,single:measure?.singleCellDrags};fs.appendFileSync(`${OUT}/iterations152-${stamp}.jsonl`,JSON.stringify(row)+'\n');
 if(replay?.complete&&replay.nonClearingDrags>=16&&measure.multiCellDrags>measure.singleCellDrags){const p=save('candidate152',{ruleVersion:'1.102.0',level,drags:result.drags,levelSha256:digest(level),audit:checks,replay,measure,proof,sourceReview:{passed:false,reason:'Source report needs independent review; exact five source shell color chains preserved.'},iteration:{attempt,seed,witnessBudgetMs:600,proofBudgetMs:1800},adoptionReady:false});console.log(JSON.stringify({...row,p}));if(proof?.thresholdProven)break;}
 if((replay?.nonClearingDrags??-1)>best||attempt%20===0){best=Math.max(best,replay?.nonClearingDrags??-1);console.log(JSON.stringify(row));}
}
console.log(JSON.stringify({done:true,best,log:`${OUT}/iterations152-${stamp}.jsonl`}));

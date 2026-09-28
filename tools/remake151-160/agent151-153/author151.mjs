import fs from 'node:fs';
import {api,baseline,shapes,tile,recolor,rng,audit,guard,save,digest,OUT} from './common.mjs';
import {search,projection} from './witness151.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
guard();const base=baseline.levels[150],R=rng(Number(process.env.SEED??102151)),stamp=Date.now();let winners=0;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??120);attempt++){
 const seed=R.state();R.random();const specs=Array.from({length:18},(_,i)=>({id:'n102-151-'+i,color:'red',shape:shapes[i<6?1:R.random()<.5?2:8]})),blocks=tile(specs,base.level.playable,{seed});if(!blocks)continue;
 const blue=blocks.find(b=>b.y+Math.max(...b.shape.map(p=>p[1]))===5&&b.x+Math.max(...b.shape.map(p=>p[0]))<2);if(!blue)continue;
 if(!recolor(blocks,['red','blue','green','yellow','purple'],{seed,pins:{[blue.id]:'blue'}}))continue;
 const level={...structuredClone(base.level),mechanismRules:'revised-2026-09-27-v1.5',difficulty:'easy',blocks,gates:[],flipDoors:[{id:'n151-red',color:'red',side:'top',offset:1,size:3,frozen:6,initiallyOpen:false},{id:'n151-purple',color:'purple',side:'left',offset:0,size:2,initiallyOpen:false},{id:'n151-yellow',color:'yellow',side:'right',offset:0,size:2,initiallyOpen:false},{id:'n151-blue',color:'blue',side:'bottom',offset:0,size:2,initiallyOpen:true},{id:'n151-green',color:'green',side:'bottom',offset:3,size:2,initiallyOpen:true}]};for(const k of ['coloredGrids','shutters','generators','elevators','conveyors'])delete level[k];
 let checks,result,replay,measure,proof;try{checks=audit(level);if(!checks.passed){console.log(JSON.stringify({attempt,auditFail:checks}));continue;}result=search(level,{milliseconds:500,maxCost:10});if(result.status==='witness'){replay=api.replayRevisedRoute(level,result.drags);if(replay.complete){measure=measureRoute(level,result.drags,api);if(replay.nonClearingDrags>=5&&measure.multiCellDrags>measure.singleCellDrags)proof=checkSymmetryFloor(projection(level),{floor:5,maxStates:150000,maxMilliseconds:1200});}}}catch(e){result={status:'error',error:e.message};}
 const record={attempt,seed,levelSha256:digest(level),status:result?.status,bestClears:result?.bestClears,U:replay?.nonClearingDrags,proof:proof?.status,multi:measure?.multiCellDrags,single:measure?.singleCellDrags};fs.appendFileSync(`${OUT}/iterations151-${stamp}.jsonl`,JSON.stringify(record)+'\n');
 if(replay?.complete&&replay.nonClearingDrags>=5&&measure.multiCellDrags>measure.singleCellDrags){const p=save('candidate151',{ruleVersion:'1.102.0',level,drags:result.drags,levelSha256:digest(level),audit:checks,replay,measure,proof,sourceReview:{passed:false,reason:'Source red frozen flip initial phase inferred from first thaw must be explicitly reviewed.'},iteration:{attempt,seed,witnessBudgetMs:500,proofBudgetMs:1200},adoptionReady:false});console.log(JSON.stringify({...record,p}));if(proof?.thresholdProven){winners++;break;}}
 if(attempt%20===0)console.log(JSON.stringify(record));
}
console.log(JSON.stringify({done:true,winners,log:`${OUT}/iterations151-${stamp}.jsonl`}));

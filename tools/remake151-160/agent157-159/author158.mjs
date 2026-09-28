import {api,base,shapes,guard,audit,tile,recolor,rng,save,digest} from './common.mjs';
import {loadSpatialApi,searchSpatial} from '../agent154-156/witness-v15.mjs';
import {nativeFloor} from './native-floor.mjs';
const spatialApi={...api,...await loadSpatialApi()};guard();const R=rng(Number(process.env.SEED??1021582)),original=base.levels[157],rows=[];
const covers=[{id:'r102-158-c8',x:0,y:8,width:3,height:3,count:8},{id:'r102-158-c9',x:4,y:8,width:3,height:3,count:9}];
const gates=[['yellow','left',1,3,0],['red','right',1,3,0],['green','top',1,3,0],['blue','right',5,3,6]].map(([color,side,offset,size,frozen])=>({id:`r102-158-g-${color}`,color,side,offset,size,...(frozen?{frozen}:{})}));
const inside=(p,s)=>p[0]>=s.x&&p[0]<s.x+s.width&&p[1]>=s.y&&p[1]<s.y+s.height;
const openingCells=original.level.playable.filter(p=>!covers.some(s=>inside(p,s)));
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??40);attempt++){
 const seed=R.state();R.random();const mk=(id,shape,extra={})=>({id:`r102-158-${id}`,color:'red',shape:structuredClone(shapes[shape]),...extra});
 const os=Array.from({length:20},(_,i)=>mk('o'+i,i===0?12:i===1?4:i<7?(R.random()<.5?2:8):(R.random()<.5?3:9)));
 const opening=tile(os,openingCells,{seed,maxNodes:10000,pins:{[os[0].id]:[2,4]}});if(!opening){rows.push({attempt,seed,status:'tiling-fail'});continue;}
 const edge=opening.find(b=>((b.x===0&&b.y>=1&&b.y+Math.max(...b.shape.map(p=>p[1]))<4)||(b.x+1+Math.max(...b.shape.map(p=>p[0]))===7&&b.y>=1&&b.y+Math.max(...b.shape.map(p=>p[1]))<4)));
 if(!edge){rows.push({attempt,seed,status:'no-first-exit'});continue;}
 const pins={[edge.id]:edge.x===0?'yellow':'red'};
 if(!recolor(opening,['red','yellow','green','blue'],{seed,pins})){rows.push({attempt,seed,status:'color-fail'});continue;}
 const hidden=covers.flatMap((s,i)=>[mk('h'+i,12,{x:s.x,y:s.y,shutterId:s.id}),...[[0,0],[2,0],[0,2],[2,2]].map(([x,y],j)=>mk(`h${i}-fill${j}`,1,{x:s.x+x,y:s.y+y,shutterId:s.id}))]);
 hidden[0].color='red';hidden[5].color='yellow';if(!recolor(hidden,['red','yellow','green','blue'],{seed:seed+2,pins:{[hidden[0].id]:'red',[hidden[5].id]:'yellow'}})){rows.push({attempt,seed,status:'hidden-color-fail'});continue;}
 const level={...structuredClone(original.level),mechanismRules:'revised-2026-09-27-v1.5',difficulty:'super',preservedMoveTarget:original.starTargets.moveTarget,gates,shutters:covers,blocks:[...opening,...hidden]};for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])delete level[k];
 let check,search,replay;try{check=audit(level);if(!check.passed){rows.push({attempt,seed,status:'audit-fail',check});continue;}
 search=searchSpatial(level,spatialApi,{floor:31,maxStates:25000,maxMilliseconds:1200,maxTransitions:400000,orderSeed:attempt,diagnosticTrace:true});if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);
 }catch(e){rows.push({attempt,seed,status:'error',message:e.message});continue;}
 const p=save('candidate158',{ruleVersion:'1.102.0',activeVersion:guard().activeVersion,level,levelSha256:digest(level),audit:check,iteration:{attempt,seed,budget:{maxMilliseconds:2000,maxStates:25000}},search,replay,drags:search.drags??[],projection:{purpose:'witness-search-only',field:'mechanismRules',from:'v1.5',to:'v1.4',reason:'No flipDoors; only v1.5 semantic delta concerns frozen flip doors. Current actual v1.5 replay is decisive.'},sourceReview:{passed:false,reference:'source-corrections.md',pending:'Full ledger/hash binding'},adoptionReady:false});
 let proof;if(replay?.complete&&replay.nonClearingDrags>=21&&replay.nonClearingDrags<=30){proof=nativeFloor(level,spatialApi,{floor:21,maxStates:150000,maxMilliseconds:2000});save('native-floor158',{candidate:p,result:proof});}
 rows.push({attempt,seed,p,status:search.status,cost:search.cost,clears:search.maxClearsSeen,complete:replay?.complete,U:replay?.nonClearingDrags,proof:proof?.status,L:proof?.relaxedNonClearingDrags});console.log(JSON.stringify(rows.at(-1)));if(proof?.thresholdProven)break;
}
console.log(save('attempts158',rows));

import {api,base,shapes,guard,audit,tile,recolor,rng,save,digest} from './common.mjs';
import {loadSpatialApi,searchSpatial} from '../agent154-156/witness-v15.mjs';
import {searchSpatial as floorSearch,loadSpatialApi as floorApi} from '../../remake111to120-spatial-floor-v147.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
const spatialApi={...api,...await loadSpatialApi()},proofApi={...api,...await floorApi()};guard();
const R=rng(Number(process.env.SEED??102159)),original=base.levels[158],rows=[];
const covers=[{id:'r102-159-top15',x:0,y:0,width:2,height:3,count:15},{id:'r102-159-bottom12',x:0,y:5,width:6,height:3,count:12},{id:'r102-159-bottom-lift',x:0,y:5,width:6,height:3,count:1,skin:'lift'}];
const gates=[['red','right',0,3,0],['yellow','top',2,2,4],['blue','left',3,2,6],['green','right',3,2,8],['orange','top',0,2,15]].map(([color,side,offset,size,frozen])=>({id:`r102-159-g-${color}`,color,side,offset,size,...(frozen?{frozen}:{})}));
const flipDoors=[['purple','left',0,3,true],['cyan','bottom',0,3,false],['pink','bottom',3,3,false]].map(([color,side,offset,size,initiallyOpen])=>({id:'r102-159-flip-'+color,color,side,offset,size,initiallyOpen,frozen:15}));
const rect=s=>Array.from({length:s.width*s.height},(_,i)=>[s.x+i%s.width,s.y+Math.floor(i/s.width)]),inside=(p,s)=>p[0]>=s.x&&p[0]<s.x+s.width&&p[1]>=s.y&&p[1]<s.y+s.height;
const all=Array.from({length:48},(_,i)=>[i%6,Math.floor(i/6)]),openingCells=all.filter(p=>!covers.some(s=>inside(p,s)));
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??100);attempt++){
 const seed=R.state();R.random();const mk=(id,shape,extra={})=>({id:`r102-159-${id}`,color:'red',shape:structuredClone(shapes[shape]),...extra});
 const os=Array.from({length:16},(_,i)=>mk('o'+i,i<9?1:i===15?4:R.random()<.5?2:8));os[0].frozen=16;os[9].layers=['red','yellow'];
 const opening=tile(os,openingCells,{seed,maxNodes:10000,pins:{[os[0].id]:[2,4],[os[15].id]:[3,3]}});if(!opening){rows.push({attempt,seed,status:'opening-tile-fail'});continue;}
 const edge=opening.find(b=>!b.frozen&&b.x+1+Math.max(...b.shape.map(p=>p[0]))===6&&b.y+Math.max(...b.shape.map(p=>p[1]))<3);if(!edge)continue;
 if(!recolor(opening,['red','red','red','yellow','yellow','blue','green'],{seed,pins:{[os[0].id]:'blue',[edge.id]:'red'}})){rows.push({attempt,seed,status:'opening-colors-fail'});continue;}
 const hs1=[8,8,8].map((s,i)=>mk('top-'+i,s,{shutterId:covers[0].id,...(i===0?{layers:['green','orange']}:i===1?{frozen:4}:{})}));
 const h1=tile(hs1,rect(covers[0]),{seed,maxNodes:2000});h1.forEach(b=>{b.color=b.id.endsWith('top-0')?'green':b.id.endsWith('top-1')?'purple':'orange';if(b.layers)b.layers[0]=b.color;});
 const hs2=[3,3,1,1,21,10].map((s,i)=>mk('bottom-'+i,s,{shutterId:covers[1].id,...(i<2?{frozen:7}:{})}));
 const h2=tile(hs2,rect(covers[1]),{seed,maxNodes:2000});if(!h2||!recolor(h2,['red','yellow','blue','green','purple','cyan','pink'],{seed:seed+1,pins:{[hs2[0].id]:'cyan',[hs2[1].id]:'pink'}}))continue;
 const hs3=[7,8,5,10,10].map((s,i)=>mk('lift-'+i,s,{shutterId:covers[2].id,...(i<2?{layers:['green',i===0?'yellow':'purple']}:{})}));
 const h3=tile(hs3,rect(covers[2]),{seed,maxNodes:4000});if(!h3||!recolor(h3,['red','yellow','blue','green','purple'],{seed:seed+2}))continue;
 const level={...structuredClone(original.level),mechanismRules:'revised-2026-09-27-v1.5',difficulty:'easy',preservedMoveTarget:original.starTargets.moveTarget,gates,flipDoors,shutters:covers,blocks:[...opening,...h1,...h2,...h3]};for(const k of ['generators','coloredGrids','elevators','conveyors'])delete level[k];
 let check,search,replay;try{check=audit(level);if(!check.passed){rows.push({attempt,seed,status:'audit-fail',check});continue;}
 search=searchSpatial(level,spatialApi,{floor:11,maxStates:25000,maxMilliseconds:1500,maxTransitions:400000,orderSeed:attempt,diagnosticTrace:true});if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);
 }catch(e){rows.push({attempt,seed,status:'error',reason:e.message});continue;}
 const p=save('candidate159',{ruleVersion:'1.102.0',level,levelSha256:digest(level),audit:check,search,replay,drags:search.drags??[],sourceReview:{passed:false,pending:'Source ledger and explicit freeze-thaw phase mapping; gate capacity adaptation'},iteration:{attempt,seed,budget:{maxMilliseconds:1500,maxStates:25000,maxTransitions:400000}},adoptionReady:false});
 let proof,measurement;if(replay?.complete&&replay.nonClearingDrags>=5&&replay.nonClearingDrags<=10){measurement=measureRoute(level,search.drags,api);const projection={...level,mechanismRules:'revised-2026-09-23-v1.4',gates:[...gates,...flipDoors.map(({initiallyOpen,...g})=>g)],flipDoors:[]};proof=floorSearch(projection,proofApi,{floor:5,prove:true,maxMilliseconds:3000,maxStates:120000});save('floor159',{candidate:p,result:proof,measurement,projection:'All flip gates permanently open after original frozen counters; all bodies/layers/ice/lift stages retained. Optimistic animation/contact relaxation.'});}
 rows.push({attempt,seed,p,status:search.status,clears:search.maxClearsSeen,U:replay?.nonClearingDrags,complete:replay?.complete,proof:proof?.status});console.log(JSON.stringify(rows.at(-1)));if(proof?.thresholdProven&&measurement.multiCellDrags>measurement.singleCellDrags)break;
}
console.log(save('attempts159',rows));

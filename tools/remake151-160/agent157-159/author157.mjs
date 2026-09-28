import {api,base,shapes,guard,audit,tile,recolor,rng,save,digest} from './common.mjs';
import {loadSpatialApi,searchSpatial} from '../agent154-156/witness-v15.mjs';
import {searchSpatial as floorSearch,loadSpatialApi as floorApi} from '../../remake111to120-spatial-floor-v147.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
const proofApi={...api,...await floorApi()};
const spatialApi={...api,...await loadSpatialApi()};guard();const R=rng(Number(process.env.SEED??1021572)),original=base.levels[156],rows=[];
const covers=[{id:'r102-157-c10',x:0,y:5,width:6,height:2,count:10},{id:'r102-157-c14',x:0,y:7,width:6,height:4,count:14}];
const gates=[['yellow','left',1,3,0],['red','right',1,3,0],['cyan','top',1,3,4],['pink','left',7,2,14],['blue','right',7,2,14],['purple','bottom',0,3,20],['green','bottom',3,3,20]].map(([color,side,offset,size,frozen])=>({id:`r102-157-g-${color}`,color,side,offset,size,...(frozen?{frozen}:{})}));
const rect=s=>Array.from({length:s.width*s.height},(_,i)=>[s.x+i%s.width,s.y+Math.floor(i/s.width)]);
const openingCells=original.level.playable.filter(p=>p[1]<5);
let best=0;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??40);attempt++){
 const seed=R.state();R.random();const mk=(id,shape,extra={})=>({id:`r102-157-${id}`,color:'red',shape:structuredClone(shapes[shape]),...extra});
 const os=Array.from({length:15},(_,i)=>mk('o'+i,i<6?1:i===14?21:R.random()<.5?2:8));os[6].layers=['red','yellow'];os[0].lockedBy='r102-157-key';os[0].lockCount=1;
 const opening=tile(os,openingCells,{seed,maxNodes:12000,pins:{[os[14].id]:[0,3],[os[0].id]:[5,4]}});if(!opening){rows.push({attempt,seed,status:'tiling-fail'});continue;}
 const pins={[os[0].id]:'pink'};const edge=opening.find(b=>!b.lockedBy&&((b.x===0&&b.y>=1&&b.y+Math.max(...b.shape.map(p=>p[1]))<4)||(b.x+1+Math.max(...b.shape.map(p=>p[0]))===6&&b.y>=1&&b.y+Math.max(...b.shape.map(p=>p[1]))<4)));
 if(!edge){rows.push({attempt,seed,status:'no-first-exit'});continue;}pins[edge.id]=edge.x===0?'yellow':'red';const right=opening.find(b=>!b.lockedBy&&b.x+1+Math.max(...b.shape.map(p=>p[0]))===6&&b.y>=1&&b.y+Math.max(...b.shape.map(p=>p[1]))<4);if(right)pins[right.id]='red';
 if(!recolor(opening,['red','red','yellow','yellow','cyan'],{seed,pins})){rows.push({attempt,seed,status:'color-fail'});continue;}
 const hs1=[4,1,2,8,7].map((s,i)=>mk('h10-'+i,s,{shutterId:covers[0].id,...(i===4?{layers:['red','cyan']}:{})}));
 const h1=tile(hs1,rect(covers[0]),{seed,maxNodes:12000});if(!h1||!recolor(h1,['red','yellow','cyan','pink','blue'],{seed:seed+1})){rows.push({attempt,seed,status:'h1-fail'});continue;}
 const hs2=Array.from({length:10},(_,i)=>mk('h14-'+i,[8,8,8,8,8,8,9,9,4,4][i],{shutterId:covers[1].id,...(i===0?{keyId:'r102-157-key'}:{})}));
 const h2=tile(hs2,rect(covers[1]),{seed,maxNodes:12000});if(!h2||!recolor(h2,['red','yellow','cyan','pink','blue','purple','green'],{seed:seed+2,pins:{[hs2[0].id]:'red'}})){rows.push({attempt,seed,status:'h2-fail'});continue;}
 const level={...structuredClone(original.level),mechanismRules:'revised-2026-09-27-v1.5',difficulty:'normal',preservedMoveTarget:original.starTargets.moveTarget,gates,shutters:covers,blocks:[...opening,...h1,...h2]};for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])delete level[k];
 let check,search,replay;try{check=audit(level);if(!check.passed){rows.push({attempt,seed,status:'audit-fail',check});continue;}
 search=searchSpatial(level,spatialApi,{floor:16,maxStates:35000,maxMilliseconds:1500,maxTransitions:500000,orderSeed:attempt,diagnosticTrace:true});if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);
 }catch(e){rows.push({attempt,seed,status:'error',message:e.message});continue;}
 const p=save('candidate157',{ruleVersion:'1.102.0',activeVersion:guard().activeVersion,level,levelSha256:digest(level),audit:check,iteration:{attempt,seed,budget:{maxMilliseconds:2500,maxStates:14000,maxTransitions:250000}},search,replay,drags:search.drags??[],sourceReview:{passed:false,reference:'source-corrections.md',pending:'Full ledger/hash binding; extra frozen-gate colors and body shape edits are authored adaptations'},adoptionReady:false});
 let proof,measurement;if(replay?.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){measurement=measureRoute(level,search.drags,api);proof=floorSearch({...level,mechanismRules:'revised-2026-09-23-v1.4'},proofApi,{floor:11,prove:true,maxMilliseconds:2000,maxStates:120000});save('floor157',{candidate:p,result:proof,measurement,projection:'Only profile changed in no-flip level; full inventory retained; optional exit/sweep relaxation; current v1.5 route decisive'});}
 const row={attempt,seed,p,status:search.status,search,replay,proof};rows.push(row);console.log(JSON.stringify({attempt,p,status:search.status,U:replay?.nonClearingDrags,complete:replay?.complete,proof:proof?.status}));if(proof?.thresholdProven&&measurement.multiCellDrags>measurement.singleCellDrags)break;
}
console.log(save('attempts157',rows));

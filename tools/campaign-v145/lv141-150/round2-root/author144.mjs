import {measureRoute} from '../../../remake21to30-quality.mjs';
import {api,audit,rng,tile,recolor,searchSpatial,save,digest,baseline,sources,shapes} from './common144.mjs';
import {searchSpatial as floorSearch} from '../../../remake111to120-spatial-floor-v147.mjs';
const src=sources[144],base=baseline.levels[143],R=rng(Number(process.env.SEED??173144)),rows=[];let best=-1;
const clean=(b,shutterId)=>({id:'n144-'+b.id,color:b.color,shape:structuredClone(b.shapeName.startsWith('L3')?shapes[3]:b.shape),...(b.layers?{layers:[...b.layers]}:{}),...(b.keyColor?{keyId:'key-'+b.keyColor}:{}),...(b.lockColor?{lockedBy:'key-'+b.lockColor,lockCount:b.lockCount}:{}),...(shutterId?{shutterId}:{})});
const covers=[{id:'n144-cover5',x:0,y:4,width:3,height:3,count:5},{id:'n144-cover12',x:5,y:4,width:2,height:3,count:12},{id:'n144-cover15',x:3,y:5,width:2,height:2,count:15}];
const inside=(p,s)=>p[0]>=s.x&&p[0]<s.x+s.width&&p[1]>=s.y&&p[1]<s.y+s.height;
const opening=src.opening.blocks.map(b=>clean(b)),cells=base.level.playable.filter(p=>!covers.some(s=>inside(p,s)));
const h5=src.hidden.knownBatches[0].blocks.map(b=>clean(b,covers[0].id));h5[0].shape=shapes[2];
const h12=src.hidden.knownBatches[1].blocks.map(b=>({...clean(b,covers[1].id),shape:shapes[8]}));
const hd5=tile(h5,base.level.playable.filter(p=>inside(p,covers[0])),{seed:22}),hd12=tile(h12,base.level.playable.filter(p=>inside(p,covers[1])),{seed:31});
if(!hd5||!hd12)throw Error('Hidden tiling failed');
const hd15=[{id:'n144-original-last',x:3,y:5,shape:shapes[7],color:'pink',shutterId:covers[2].id}];
const gates=[{id:'n144-blue',color:'blue',side:'top',offset:1,size:3},{id:'n144-purple',color:'purple',side:'top',offset:4,size:2,frozen:3},{id:'n144-yellow',color:'yellow',side:'left',offset:1,size:3,frozen:7},{id:'n144-cyan',color:'cyan',side:'right',offset:1,size:3,frozen:12},{id:'n144-red15',color:'red',side:'left',offset:4,size:3,frozen:15},{id:'n144-green18',color:'green',side:'right',offset:4,size:3,frozen:18},{id:'n144-pink23',color:'pink',side:'bottom',offset:2,size:3,frozen:23}];
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??240);attempt++){
 const seed=R.state();R.random();const specs=structuredClone(opening);const singles=new Set(R.shuffle(specs.filter(b=>!b.keyId&&!b.lockedBy)).slice(0,4).map(b=>b.id));for(const b of specs)b.shape=singles.has(b.id)?shapes[1]:R.random()<.5?shapes[2]:shapes[8];
 const bs=tile(specs,cells,{seed,maxNodes:10000});if(!bs)continue;
 const first=R.shuffle(bs.filter(b=>!b.lockedBy&&b.y===0&&b.x>=1&&b.x+Math.max(...b.shape.map(p=>p[0]))<4))[0];if(!first)continue;
 if(!recolor(bs,['blue','blue','blue','purple','purple','yellow','yellow'],{seed,pins:{[first.id]:'blue'},filter:(b,c)=>c!=='purple'||Math.max(...b.shape.map(p=>p[0]))<2}))continue;
 if(bs.filter(b=>b.color==='blue'&&!b.lockedBy).length<4)continue;
 const hidden=structuredClone([...hd5,...hd12,...hd15]);
 hidden.find(b=>b.id==='n144-h12a').color='red';

 const level={...structuredClone(base.level),difficulty:'easy',preservedMoveTarget:base.starTargets.moveTarget,blocks:[...bs,...hidden],gates,shutters:covers};delete level.generators;delete level.flipDoors;
 let search,replay,check;try{check=audit(level);if(!check.passed)continue;search=searchSpatial(level,api,{floor:11,maxMilliseconds:700,maxStates:25000,maxTransitions:300000,orderSeed:attempt,diagnosticTrace:true});if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);}catch(e){rows.push({attempt,error:e.message});continue;}
 const row={attempt,seed,status:search.status,clears:search.maxClearsSeen,U:replay?.nonClearingDrags,valid:replay?.valid};rows.push(row);
 if((search.maxClearsSeen??0)>best||replay?.complete){best=Math.max(best,search.maxClearsSeen??0);let proof;const measurement=replay?.complete?measureRoute(level,search.drags,api):null;if(replay?.complete&&replay.nonClearingDrags>=5&&measurement.multiCellDrags>measurement.singleCellDrags)proof=floorSearch(level,api,{floor:5,prove:true,maxMilliseconds:3000,maxStates:100000});const p=save('candidate144-root',{ruleVersion:'1.73.0',level,levelSha256:digest(level),source:src,sourceGateStatus:'THREE_GATE_COLORS_UNKNOWN',designGateColors:{frozen15:'red',frozen18:'green',frozen23:'pink'},iteration:{attempt,seed,maxMilliseconds:700,maxStates:25000},audit:check,measurement,search,replay,drags:search.drags??[],proof,sourceReview:{passed:false},userReviewRequired:true,adoptionReady:false});console.log(JSON.stringify({...row,p,proof:proof?.status}));if(proof?.thresholdProven)break;}
}
console.log(save('attempts144-root',rows));

import {api,audit,rng,tile,recolor,searchSpatial,save,digest,baseline,sources,shapes} from './common.mjs';
import {searchSpatial as floorSearch} from '../../../remake111to120-spatial-floor-v147.mjs';
const src=sources['144'],base=baseline.levels[143],R=rng(Number(process.env.SEED??144173)),rows=[];let op,best=-1;
const clean=(b,shutterId)=>({id:'s144-'+b.id,color:b.color,shape:structuredClone(b.shapeName.startsWith('L3')?shapes[4]:b.shape),...(b.layers?{layers:structuredClone(b.layers)}:{}),...(b.keyColor?{keyId:'s144-key-'+b.keyColor}:{}),...(b.lockColor?{lockedBy:'s144-key-'+b.lockColor,lockCount:b.lockCount}:{}),...(shutterId?{shutterId}:{})});
const covers=[{id:'s144-cover5',x:0,y:4,width:4,height:2,count:5},{id:'s144-cover12',x:5,y:1,width:2,height:2,count:12},{id:'s144-cover15',x:0,y:6,width:7,height:1,count:15}],inside=(p,s)=>p[0]>=s.x&&p[0]<s.x+s.width&&p[1]>=s.y&&p[1]<s.y+s.height;
const opening=src.opening.blocks.map(b=>clean(b)),openingCells=base.level.playable.filter(p=>!covers.some(s=>inside(p,s)));
const h5=src.hidden.knownBatches.find(s=>s.count===5).blocks.map(b=>clean(b,'s144-cover5'));for(const b of h5)b.shape=shapes[['s144-h5c','s144-h5d'].includes(b.id)?4:1];
const hd5=tile(h5,base.level.playable.filter(p=>inside(p,covers[0])),{seed:1});
const h12=src.hidden.knownBatches.find(s=>s.count===12).blocks.map(b=>clean(b,'s144-cover12'));for(const b of h12)b.shape=shapes[b.layers?8:1];const hd12=tile(h12,base.level.playable.filter(p=>inside(p,covers[1])),{seed:2});
const hd15=Array.from({length:7},(_,i)=>({id:'s144-original-hidden15-'+i,x:i,y:6,color:['red','pink','green','cyan','blue','yellow','purple'][i],shape:shapes[1],shutterId:'s144-cover15'}));
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??80);attempt++){
 const seed=R.state();if(!op)op=tile(opening,openingCells,{seed,maxNodes:30000});if(!op){rows.push({attempt,seed,status:'packing-failed'});R.random();continue;}
 const bs=structuredClone(op),first=R.shuffle(bs.filter(b=>!b.lockedBy&&b.x===0&&b.y>=1&&b.y+Math.max(...b.shape.map(p=>p[1]))<=3)).sort((a,b)=>b.shape.length-a.shape.length)[0];if(!first){op=null;R.random();continue;}
 if(!recolor(bs,['blue','blue','blue','purple','purple','yellow','yellow','cyan'],{seed,pins:{[first.id]:'blue'},filter:(b,c)=>!['cyan','purple'].includes(c)||Math.max(...b.shape.map(p=>p[1]))<2})){op=null;R.random();continue;}
 if(bs.filter(b=>b.color==='blue'&&!b.lockedBy).length<5||bs.filter(b=>b.color==='cyan').length>2){op=null;R.random();continue;}
 const gates=[{id:'s144-blue',color:'blue',side:'left',offset:1,size:3},{id:'s144-purple',color:'purple',side:'right',offset:3,size:2,frozen:3},{id:'s144-yellow',color:'yellow',side:'top',offset:1,size:3,frozen:7},{id:'s144-cyan',color:'cyan',side:'right',offset:1,size:2,frozen:12},{id:'s144-design-red15',color:'red',side:'bottom',offset:0,size:2,frozen:15},{id:'s144-design-green18',color:'green',side:'bottom',offset:2,size:3,frozen:18},{id:'s144-design-pink23',color:'pink',side:'bottom',offset:5,size:2,frozen:23}];
 const level={...structuredClone(base.level),difficulty:'easy',preservedMoveTarget:base.starTargets.moveTarget,blocks:[...bs,...structuredClone(hd5),...structuredClone(hd12),...hd15],gates,shutters:covers};delete level.generators;delete level.flipDoors;
 let check,search,replay,error;try{check=audit(level);if(check.passed){search=searchSpatial(level,api,{floor:11,maxMilliseconds:2500,maxStates:35000,maxTransitions:700000,diagnosticTrace:true,orderSeed:attempt});if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);}}catch(e){error=e.message;}
 const row={attempt,seed,status:search?.status??'static-rejected',stop:search?.termination,clears:search?.maxClearsSeen,U:replay?.nonClearingDrags,complete:replay?.complete,error};rows.push(row);console.log(JSON.stringify(row));
 if((search?.maxClearsSeen??-1)>best||replay?.complete){best=Math.max(best,search?.maxClearsSeen??-1);const proof=replay?.complete&&replay.nonClearingDrags>=5?floorSearch(level,api,{floor:5,prove:true,maxMilliseconds:8000,maxStates:100000}):null;row.candidate=save('candidate144',{activeRuleVersion:'1.73.0',level,levelSha256:digest(level),source:src,sourceGateStatus:'THREE_GATE_COLORS_UNKNOWN',designGateColors:{frozen15:'red',frozen18:'green',frozen23:'pink'},userReviewRequired:true,iteration:{seed,attempt,budget:{maxMilliseconds:2500,maxStates:35000,maxTransitions:700000}},audit:check,search,replay,drags:search?.drags??[],proof,formalAdopted:false});console.log(row.candidate);}
 R.random();if(attempt%3===2)op=null;
}
console.log(save('attempts144',rows));

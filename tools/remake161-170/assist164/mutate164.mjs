import fs from 'node:fs';
import {api,audit,recolor,rng,save,searchSpatial,project,digest} from './common.mjs';
import {prefixFloor} from './floor-countdown.mjs';
import {shortenRoute} from './shorten-route-keys.mjs';
import {checkAxisPrefixFloor} from '../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
import {replay} from '../replay.mjs';
const original=JSON.parse(fs.readFileSync('deliverables/remake161-170-20260927/author164-167/strip164-1790517459873.json')).level;
const R=rng(Number(process.env.SEED??164103)),rows=[],open=original.blocks.filter(b=>!b.shutterId),candidates=[];
for(let i=0;i<open.length;i++)for(let j=i+1;j<open.length;j++){
 if(open[i].color==='green'||open[j].color==='green'||open[i].color===open[j].color)continue;
 const l=structuredClone(original),a=l.blocks.find(b=>b.id===open[i].id),b=l.blocks.find(b=>b.id===open[j].id);[a.color,b.color]=[b.color,a.color];
 let proof,error;try{audit(l);proof=prefixFloor(l,{goalClears:3,floor:16,maxMilliseconds:250,maxStates:50000});}catch(e){error=e.message;}
 const row={type:'opening-swap',swap:[a.id,b.id],sha:digest(l),status:proof?.status,cost:proof?.relaxedNonClearingDrags,error};rows.push(row);console.log(JSON.stringify(row));
 if(proof?.status==='relaxed-shortcut'&&proof.relaxedNonClearingDrags>=11&&proof.relaxedNonClearingDrags<=13){const prefix=checkAxisPrefixFloor(project(l),api,{goalClears:3,floor:14,maxMilliseconds:1000,maxStates:100000});if(prefix.drags&&api.replayRevisedRoute(l,prefix.drags).valid)candidates.push({l,prefix,swap:row.swap});}
}
let done=false;for(let i=0;i<Number(process.env.ATTEMPTS??120)&&candidates.length;i++){
 const src=candidates[i%candidates.length],l=structuredClone(src.l);let good=true;
 if(i>=candidates.length)for(const id of ['c3','c9','c22']){
   const bs=l.blocks.filter(b=>b.shutterId===id);if(!recolor(bs,id==='c22'?['red','yellow','blue','purple','cyan','pink']:['green','red','yellow'],{seed:R.state()})){good=false;break;}R.random();
 }
 if(!good)continue;let spatial,search,drags,rr,error;try{spatial=audit(l);search=searchSpatial(project(l),api,{floor:16,maxMilliseconds:800,maxStates:16000,maxTransitions:160000,normalize:true,orderSeed:i,diagnosticTrace:true,initialDrags:src.prefix.drags});if(search.status==='witness'){drags=shortenRoute(l,search.drags,api).drags;rr=replay(l,drags,api,{complete:true,requirePointerCompatible:true});}}catch(e){error=e.message;}
 const row={type:'hidden-recolor',attempt:i,swap:src.swap,sha:digest(l),prefix:src.prefix.cost,status:search?.status,U:rr?.nonClearingDrags,clears:search?.maxClearsSeen,error};rows.push(row);console.log(JSON.stringify(row));
 if(rr?.complete){const proof=prefixFloor(l,{goalClears:3,floor:11,maxMilliseconds:500,maxStates:100000});row.file=save('candidate164',{level:l,drags,route:{...rr,final:undefined},proof,sourceOpeningSwap:src.swap,iteration:row,spatial,search,source:'source164-review.json',qualificationRequired:true});console.log(row.file);if(proof.thresholdProven&&rr.nonClearingDrags<=15){done=true;break;}}
 if(global.gc)global.gc();
}
console.log(save('mutations164',{done,rows}));

import fs from 'node:fs';
import {ROOT,ruleGate,loadApi,audit,replay,digest,writeNew} from './common.mjs';
import {witness240} from './author240-native.mjs';
import {source240} from './author240-source.mjs';
ruleGate();const{api}=await loadApi(),root=ROOT+'/author240',base=JSON.parse(fs.readFileSync(root+'/mutate-10001-1792397210380/candidate-10004.json')).level;
const touch=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
const adjacency=base.blocks.map(a=>base.blocks.map((b,i)=>a!==b&&touch(a,b)?i:-1).filter(i=>i>=0));
function make(seed){
 let n=seed;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;},level=structuredClone(base);
 const valid=()=>level.blocks.every((b,i)=>adjacency[i].every(j=>level.blocks[j].color!==b.color))&&api.auditCandidateBlockArt(level).passed;
 let changed=0;for(let tries=0;tries<200&&changed<2+seed%3;tries++){
  const a=1+Math.floor(random()*(level.blocks.length-1)),b=1+Math.floor(random()*(level.blocks.length-1));if(a===b||level.blocks[a].color===level.blocks[b].color)continue;
  [level.blocks[a].color,level.blocks[b].color]=[level.blocks[b].color,level.blocks[a].color];
  if(!valid()){[level.blocks[a].color,level.blocks[b].color]=[level.blocks[b].color,level.blocks[a].color];continue;}changed++;
 }
 if(!changed)return null;
 level.mechanismAdaptation={userAuthorized:'继续制作200关以后的关卡，保已知源机制数量和计数，在有限求解后允许普通形色和排布必要原创适配。',sourceFactsFile:root+'/source-transcription.json',change:'保7×9/50格/31体与七冰12/9/6/4/14/20/18，紫普通及蓝冰4等已知门色保持；源内墙改上下对称连通双庭原创轮廓，源31体面积逐体保持，非原向L3重建q0。重复黄20/红18最小改橙20/粉18。本轮自产双庭失败族的新配色对象，不复用正式旧图；形色原值与新值逐体列账。'};
 return level;
}
const start=Number(process.argv[2]??50000),count=Math.min(24,Number(process.argv[3]??16)),run=root+`/recombine-${start}-${Date.now()}`;fs.mkdirSync(run,{recursive:true});fs.copyFileSync(new URL(import.meta.url),run+'/generator.mjs');const rows=[];let ready=0;
for(let seed=start;seed<start+count;seed++){
 const level=make(seed),row={seed};if(!level){rows.push({seed,status:'CONSTRUCTION_REJECTED'});continue;}row.levelSha256=digest(level);
 try{row.audit=audit(level,api);row.route=witness240(level,api,{maxStates:180000,maxMilliseconds:2200});row.status='ROUTE_'+row.route.status;
  if(row.route.status==='witness'){
   row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;
   if(row.U<21)row.status='TOO_EASY';else if(row.U>30)row.status='TOO_HARD';else{
    level.parMoves=level.preservedMoveTarget=row.replay.effectiveDrags;row.status='ROUTE_READY_LOWER_UNVERIFIED';writeNew(run+`/route-ready-${seed}.json`,{level,drags:row.route.drags,levelSha256:digest(level),routeSha256:digest(row.route.drags),L:null,U:row.U,audit:audit(level,api),replay:row.replay,sourceChanges:level.blocks.map(b=>({id:b.id,source:source240.blocks[Number(b.id.split('b')[1])],authored:b})),pointerValidated:false,formalAccepted:false});ready++;
   }
  }
 }catch(e){row.status='REJECTED';row.error=e.message;}
 writeNew(run+`/candidate-${seed}.json`,{level,row});rows.push(row);console.log(JSON.stringify({seed,status:row.status,U:row.U,clears:row.route?.maxClearsSeen,error:row.error?.slice(0,180)}));if(ready>=4)break;
}
writeNew(run+'/report.json',{ready,rows});console.log(JSON.stringify({run,ready,attempted:rows.length}));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,ruleGate,loadApi,audit,replay,digest,writeNew} from './common.mjs';
import {witness240,lower240,qualify240,payload240} from './author240-native.mjs';
ruleGate();const{api}=await loadApi(),root=ROOT+'/author240',base=JSON.parse(fs.readFileSync(root+'/run-1-1792396533166/candidate-1.json')).level;
const touch=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
const adjacency=base.blocks.map(a=>base.blocks.map((b,i)=>a!==b&&touch(a,b)?i:-1).filter(i=>i>=0));
function make(seed){
 let n=seed;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;},level=structuredClone(base);
 const valid=()=>level.blocks.every((b,i)=>adjacency[i].every(j=>level.blocks[j].color!==b.color));
 let changed=0;for(let tries=0;tries<120&&changed<2+seed%4;tries++){
  const a=1+Math.floor(random()*(level.blocks.length-1)),b=1+Math.floor(random()*(level.blocks.length-1));if(a===b||level.blocks[a].color===level.blocks[b].color)continue;
  [level.blocks[a].color,level.blocks[b].color]=[level.blocks[b].color,level.blocks[a].color];
  if(!valid()){[level.blocks[a].color,level.blocks[b].color]=[level.blocks[b].color,level.blocks[a].color];continue;}changed++;
 }
 if(!changed)return null;
 if(seed%3){const a=seed%7,b=(seed*13+3)%7;if(a!==b){const ga=level.gates[a],gb=level.gates[b],fields=['side','offset','size','portals'];for(const f of fields)[ga[f],gb[f]]=[gb[f],ga[f]];}}
 level.mechanismAdaptation.change+='首次原色新图U12后，在本轮原创几何内有限换色/门位置；保持源31体的全部面积/形状及颜色总库存，七冰门绑定颜色计数不改。';
 return level;
}
const start=Number(process.argv[2]??10001),count=Math.min(100,Number(process.argv[3]??45)),run=root+`/mutate-${start}-${Date.now()}`;fs.mkdirSync(run,{recursive:true});fs.copyFileSync(new URL(import.meta.url),run+'/generator.mjs');const rows=[];let accepted;
for(let seed=start;seed<start+count;seed++){
 const level=make(seed),row={seed};if(!level){rows.push({seed,status:'CONSTRUCTION_REJECTED'});continue;}row.levelSha256=digest(level);
 try{row.audit=audit(level,api);row.route=witness240(level,api);row.status='ROUTE_'+row.route.status;
  if(row.route.status==='witness'){
   row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;
   if(row.U<21)row.status='TOO_EASY';else if(row.U>30)row.status='TOO_HARD';else{
    row.lower=lower240(level,api);row.status=row.lower.thresholdProven?'BOUNDS_MET':'LOWER_'+row.lower.status;
    if(row.lower.thresholdProven){const p=payload240(level,api).p;level.parMoves=level.preservedMoveTarget=row.replay.effectiveDrags;assert.deepEqual(payload240(level,api).p,p);row.qualification=qualify240(level,row.route.drags,api);accepted={level,drags:row.route.drags,levelSha256:digest(level),routeSha256:digest(row.route.drags),L:21,U:row.U,lower:row.lower,qualification:row.qualification,sourceLedger:root+'/source-transcription.json',pointerValidated:false,formalAccepted:false};writeNew(run+'/qualified240.json',accepted);}
   }
  }
 }catch(e){row.status='REJECTED';row.error=e.message;}
 writeNew(run+`/candidate-${seed}.json`,{level,row});rows.push(row);console.log(JSON.stringify({seed,status:row.status,U:row.U,clears:row.route?.maxClearsSeen,error:row.error?.slice(0,180)}));if(accepted)break;
}
writeNew(run+'/report.json',{accepted:accepted?run+'/qualified240.json':null,rows});console.log(JSON.stringify({run,accepted:Boolean(accepted),attempted:rows.length}));

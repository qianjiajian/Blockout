import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,PROFILE,rect,ruleGate,loadApi,audit,replay,digest,writeNew} from './common.mjs';
import {source240 as source} from './author240-source.mjs';
import {witnessWide240} from './author240-wide-native.mjs';
import {blockerBound240} from './author240-alt-blocker-bound-v2.mjs';
import {ordinarySweepPaths} from './author240-alt-sweep-paths.mjs';
import {compileSpatial} from '../continuation211-colored-witness.mjs';

const root=ROOT+'/author240';
function rng(seed){let s=seed;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const touching=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
export function makeWide240(seed,api){
 const random=rng(seed),shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(o=>o.v);
 const widths=[4,6,7,6,4,6,7,6,4],starts=[0,0,0,1,3,1,0,0,0];
 const playable=widths.flatMap((w,y)=>Array.from({length:w},(_,x)=>[x+starts[y],y]));
 const blocks=[],occupied=new Set();
 function add(i,shape,x,y,color){const b={id:'l240-b'+i,shape,x,y,color};blocks.push(b);for(const[u,v]of shape){const k=[x+u,y+v].join(',');assert(playable.some(p=>p.join(',')===k));assert(!occupied.has(k));occupied.add(k);}return b;}
 for(const[i,x,y]of[[2,0,0],[19,0,2],[18,3,6],[24,0,8]])add(i,rect(4,1),x,y,'blue');
 for(const[i,x,y]of[[4,4,1],[5,1,3],[11,1,5],[16,4,7],[21,3,4]])add(i,rect(2,1),x,y,null);
 add(9,[[0,0],[0,1],[1,1]],4,2,null);
 const ids=source.blocks.map((_,i)=>i).filter(i=>!blocks.some(b=>b.id==='l240-b'+i));
 const cells=playable.filter(p=>!occupied.has(p.join(',')));assert.equal(cells.length,21);assert.equal(ids.length,21);
 for(let i=0;i<ids.length;i++)add(ids[i],rect(1,1),...cells[i],null);
 const gateSpecs=[['red','top',[0,0],2,12],['green','top',[2,0],2,9],['cyan','bottom',[0,8],2,6],['purple','bottom',[2,8],2,4],['yellow','right',[6,2],2,14],['orange','right',[6,4],3,20],['pink','left',[0,0],2,18],['blue','left',[0,8],1,0]];
 const gates=gateSpecs.map(([color,side,origin,size,frozen])=>({id:'l240-g-'+color,color,side,offset:origin[['left','right'].includes(side)?1:0],size,portals:[{side,origin,size}],...frozen?{frozen}:{}}));
 const assigned=new Set(blocks.filter(b=>b.color)),counts={purple:5,cyan:4,green:4,red:4,yellow:4,orange:3,pink:3};
 const adjacent=new Map(blocks.map(b=>[b,blocks.filter(a=>a!==b&&touching(a,b))]));let budget=12000;
 function color(){if(--budget<0)return false;if(assigned.size===blocks.length)return true;
  const b=shuffle(blocks.filter(b=>!assigned.has(b))).sort((a,b)=>adjacent.get(b).filter(x=>assigned.has(x)).length-adjacent.get(a).filter(x=>assigned.has(x)).length)[0];
  for(const c of shuffle(Object.keys(counts))){if(!counts[c]||adjacent.get(b).some(a=>assigned.has(a)&&a.color===c))continue;b.color=c;if(!api.auditCandidateBlockArt({blocks:[b]}).passed)continue;assigned.add(b);counts[c]--;if(color())return true;counts[c]++;assigned.delete(b);}return false;
 }
 assert(color());blocks.sort((a,b)=>Number(a.id.split('b')[1])-Number(b.id.split('b')[1]));
 const level={id:240,name:'冰门·折廊调度',difficulty:'super',width:7,height:9,playable,mechanismRules:PROFILE,timeSeconds:180,reward:200,parMoves:61,preservedMoveTarget:61,
  designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:21,calibratedDifficulty:21},blocks,gates,
  mechanismAdaptation:{userAuthorized:'继续制作200关后新关，按主线既定四档与来源事实必要原创适配；新关三星采用已验完整路线总拖。',sourceFactsFile:root+'/source-transcription.json',change:'保7×9及50真实格、31源体总库存、七冰门12/9/6/4/14/20/18与一普通门。源内部墙改上下对称原创折廊；31普通体改4原向H4+1原向L3+5H2+21S且全重排配色。重复黄20/红18映橙20/粉18；因紫H4无原向素材，将源紫普通门和蓝冰4交换颜色为蓝普通/紫冰4，并同步普通库存。逐体原值与适配独立列账；全部原向素材、不增加机关。'}};
 const sourceChanges=blocks.map(b=>{const i=Number(b.id.split('b')[1]),s=source.blocks[i];return{id:b.id,source:s,authored:b};});
 return{level,sourceChanges};
}
if(process.argv[1]?.endsWith('author240-wide.mjs')){
 ruleGate();const{api}=await loadApi(),seedStart=Number(process.argv[2]??18000),count=Math.min(40,Number(process.argv[3]??1)),solve=process.argv.includes('--solve');
 const run=root+`/wide-${seedStart}-${Date.now()}`;fs.mkdirSync(run,{recursive:true});fs.copyFileSync(new URL(import.meta.url),run+'/generator.mjs');const rows=[];
 for(let seed=seedStart;seed<seedStart+count;seed++){
  const{level,sourceChanges}=makeWide240(seed,api),row={seed,levelSha256:digest(level)};
  try{row.audit=audit(level,api);row.status='STATIC_READY';
   if(solve){row.lower=blockerBound240(level,api);row.status=row.lower.thresholdProven?'LOWER_PROVEN':'LOWER_'+row.lower.status;
    if(row.lower.thresholdProven){row.sweep=ordinarySweepPaths(compileSpatial(level,api));assert.equal(row.sweep.status,'complete');row.route=witnessWide240(level,api,Object.fromEntries(row.sweep.rows.map(r=>[r.blockId,r.sweepPaths])));row.status='ROUTE_'+row.route.status;if(row.route.status==='witness'){
     row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;
     if(row.U>=21&&row.U<=30){level.parMoves=level.preservedMoveTarget=row.replay.effectiveDrags;row.lowerFinalBinding=blockerBound240(level,api);assert.equal(row.lowerFinalBinding.minimumDistinctBlockers,row.lower.minimumDistinctBlockers);row.status='BOUNDS_MET';writeNew(run+'/qualified240.json',{level,drags:row.route.drags,sourceChanges,levelSha256:digest(level),routeSha256:digest(row.route.drags),L:row.lower.provenLowerBound,U:row.U,lower:row.lowerFinalBinding,audit:audit(level,api),replay:row.replay,pointerValidated:false,formalAccepted:false});}
    }}
   }
  }catch(e){row.status='REJECTED';row.error=e.message;}
  writeNew(run+`/candidate-${seed}.json`,{level,sourceChanges,row});rows.push(row);console.log(JSON.stringify({seed,status:row.status,L:row.lower?.minimumDistinctBlockers,U:row.U,clears:row.route?.maxClearsSeen,error:row.error}));if(row.status==='BOUNDS_MET')break;
 }
 writeNew(run+'/report.json',{run,rows});console.log(JSON.stringify({run,attempts:rows.length}));
}

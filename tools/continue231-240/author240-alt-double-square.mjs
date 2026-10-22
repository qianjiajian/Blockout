import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,PROFILE,rect,ruleGate,loadApi,audit,replay,digest,writeNew} from './common.mjs';
import {source240 as source} from './author240-source.mjs';
import {witnessWide240,directSweep240} from './author240-alt-wide-native.mjs';
import {blockerBound240} from './author240-alt-blocker-bound-v2.mjs';
import {ordinarySweepPaths} from './author240-alt-sweep-paths.mjs';
import {compileSpatial} from '../continuation211-colored-witness.mjs';

const root=ROOT+'/author240-alt',T=[[1,0],[0,1],[1,1],[2,1]],L=[[0,0],[0,1],[1,1]];
function rng(seed){let s=seed;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const touching=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
export function makeAltDoubleSquare240(seed,api){
 const random=rng(seed),shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(o=>o.v);
 const widths=[5,6,6,6,4,6,6,6,5],starts=[0,0,0,0,3,0,0,0,0],playable=widths.flatMap((w,y)=>Array.from({length:w},(_,x)=>[x+starts[y],y]));
 const blocks=[],occupied=new Set(),legal=new Set(playable.map(p=>p.join(',')));
 const fits=(shape,x,y)=>shape.every(([u,v])=>legal.has([x+u,y+v].join(','))&&!occupied.has([x+u,y+v].join(',')));
 function add(i,shape,x,y,color){assert(fits(shape,x,y));const b={id:'l240-b'+i,shape,x,y,color};blocks.push(b);for(const[u,v]of shape)occupied.add([x+u,y+v].join(','));return b;}
 for(const[i,shape,x,y]of[[2,rect(3,3),0,0],[19,rect(1,1),3,4],[18,rect(1,1),5,5],[24,rect(3,3),0,6]])add(i,shape,x,y,'purple');
 add(9,L,4,1,null);add(4,rect(2,1),3,0,null);
 const ids=source.blocks.map((_,i)=>i).filter(i=>!blocks.some(b=>b.id==='l240-b'+i)),cells=playable.filter(p=>!occupied.has(p.join(',')));assert.equal(cells.length,25);
 for(let i=0;i<ids.length;i++)add(ids[i],rect(1,1),...cells[i],null);
 const gateSpecs=[['red','top',[0,0],2,12],['green','top',[2,0],2,9],['cyan','bottom',[0,8],2,6],['blue','bottom',[2,8],2,4],['yellow','right',[5,1],3,14],['orange','right',[5,5],3,20],['pink','left',[0,0],2,18],['purple','left',[0,6],3,0]];
 const gates=gateSpecs.map(([color,side,origin,size,frozen])=>({id:'l240-g-'+color,color,side,offset:origin[['left','right'].includes(side)?1:0],size,portals:[{side,origin,size}],...frozen?{frozen}:{}}));
 const assigned=new Set(blocks.filter(b=>b.color)),counts={blue:5,cyan:4,green:4,red:4,yellow:4,orange:3,pink:3},adjacent=new Map(blocks.map(b=>[b,blocks.filter(a=>a!==b&&touching(a,b))]));let budget=12000;
 function color(){if(--budget<0)return false;if(assigned.size===blocks.length)return true;const b=shuffle(blocks.filter(b=>!assigned.has(b))).sort((a,b)=>adjacent.get(b).filter(x=>assigned.has(x)).length-adjacent.get(a).filter(x=>assigned.has(x)).length)[0];for(const c of shuffle(Object.keys(counts))){if(!counts[c]||adjacent.get(b).some(a=>assigned.has(a)&&a.color===c))continue;b.color=c;if(!api.auditCandidateBlockArt({blocks:[b]}).passed)continue;assigned.add(b);counts[c]--;if(color())return true;counts[c]++;assigned.delete(b);}return false;}
 if(!color())return null;blocks.sort((a,b)=>Number(a.id.split('b')[1])-Number(b.id.split('b')[1]));
 const level={id:240,name:'冰门·折廊调度',difficulty:'super',width:7,height:9,playable,mechanismRules:PROFILE,timeSeconds:180,reward:200,parMoves:61,preservedMoveTarget:61,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:21,calibratedDifficulty:21},blocks,gates,
 mechanismAdaptation:{userAuthorized:'继续制作200关后新关，按主线既定四档与来源事实必要原创适配；新关三星采用已验完整路线总拖。',sourceFactsFile:ROOT+'/author240/source-transcription.json',change:'保7×9及50真实格、31源体总库存、七冰门12/9/6/4/14/20/18与紫普通门。源内部墙改独立上下对称三列错位折廊50格（与Z版不同）；31普通体改紫SQ3两体/紫S两体+1原向L3+1双格+25S且全重排配色。重复黄20/红18映橙20/粉18，其余已知门色保持；紫门扩3格匹配SQ3真实横截面。逐体原值与适配独立列账；全部原向素材、不增加机关。'}};
 return{level,sourceChanges:blocks.map(b=>({id:b.id,source:source.blocks[Number(b.id.split('b')[1])],authored:b}))};
}
if(process.argv[1]?.endsWith('author240-alt-double-square.mjs')){
 ruleGate();const{api}=await loadApi(),seedStart=Number(process.argv[2]??103000),count=Math.min(80,Number(process.argv[3]??8)),run=root+`/double-square-${seedStart}-${Date.now()}`;
 fs.mkdirSync(run,{recursive:true});fs.copyFileSync(new URL(import.meta.url),run+'/generator.mjs');const rows=[];
 for(let seed=seedStart;seed<seedStart+count;seed++){
  const built=makeAltDoubleSquare240(seed,api),row={seed};if(!built){row.status='CONSTRUCTION_FAILED';rows.push(row);continue;}const{level,sourceChanges}=built;row.levelSha256=digest(level);
  try{row.audit=audit(level,api);row.lower=blockerBound240(level,api);row.status=row.lower.thresholdProven?'LOWER_PROVEN':'LOWER_'+row.lower.status;
   if(row.lower.thresholdProven){const c=compileSpatial(level,api);row.sweep=ordinarySweepPaths({...c,blocks:c.blocks.filter(b=>b.shape.length>=9)});assert.equal(row.sweep.status,'complete');row.route=witnessWide240(level,api,{...directSweep240(c),...Object.fromEntries(row.sweep.rows.map(r=>[r.blockId,r.sweepPaths]))});row.status='ROUTE_'+row.route.status;
    if(row.route.status==='witness'){row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;
     if(row.U>=21&&row.U<=30){level.parMoves=level.preservedMoveTarget=row.replay.effectiveDrags;row.lowerFinalBinding=blockerBound240(level,api);assert.equal(row.lowerFinalBinding.minimumDistinctBlockers,row.lower.minimumDistinctBlockers);row.status='BOUNDS_MET';writeNew(run+'/qualified240.json',{level,drags:row.route.drags,sourceChanges,levelSha256:digest(level),routeSha256:digest(row.route.drags),L:row.lower.provenLowerBound,U:row.U,lower:row.lowerFinalBinding,audit:audit(level,api),replay:row.replay,pointerValidated:false,formalAccepted:false});}
    }
   }
  }catch(e){row.status='REJECTED';row.error=e.message;}
  writeNew(run+`/candidate-${seed}.json`,{level,sourceChanges,row});rows.push(row);console.log(JSON.stringify({seed,status:row.status,L:row.lower?.minimumDistinctBlockers,U:row.U,clears:row.route?.maxClearsSeen,error:row.error}));if(row.status==='BOUNDS_MET')break;
 }
 writeNew(run+'/report.json',{run,rows});console.log(JSON.stringify({run,attempts:rows.length}));
}

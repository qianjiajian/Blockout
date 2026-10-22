import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,PROFILE,rect,ruleGate,loadApi,audit,replay,digest,writeNew} from './common.mjs';
import {source240 as source} from './author240-source.mjs';
import {witness240,lower240,qualify240,payload240} from './author240-native.mjs';
ruleGate();const {api}=await loadApi(),root=ROOT+'/author240';
const L=[[0,0],[0,1],[1,1]];
function rng(seed){let s=seed;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const touching=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
function make(seed){
 const random=rng(seed),shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.v);
 const widths=seed>=13000?[5,6,7,6,2,6,7,6,5]:seed>=4000?[7,7,7,3,2,3,7,7,7]:seed>=2000?[7,7,3,7,2,7,3,7,7]:seed>=1000?[4,6,7,6,4,6,7,6,4]:[7,7,7,3,2,3,7,7,7];
 const starts=seed>=13000?[1,0,0,0,2,0,0,0,1]:seed>=4000?[0,0,0,2,2,2,0,0,0]:seed>=2000?[0,0,2,0,2,0,2,0,0]:seed>=1000?[1,0,0,0,1,0,0,0,1]:[0,0,0,2,2,2,0,0,0];
 const mask=widths.flatMap((w,y)=>Array.from({length:w},(_,x)=>[x+starts[y],y]));assert.equal(mask.length,50);
 const pieces=source.blocks.map((b,i)=>({id:'l240-b'+i,color:i===26?'orange':i===30?'pink':b.color,shape:b.shape.length===3?L:seed>=7000&&b.shape.length===2?(random()<.5?rect(2,1):rect(1,2)):b.shape}));
 if(seed>=11000){
  for(const i of [1,20,26])pieces[i].shape=rect(1,1);
  for(const i of [0,6,7,8,10,12])pieces[i].shape=random()<.5?rect(1,2):rect(2,1);
  assert.equal(pieces.reduce((n,b)=>n+b.shape.length,0),50);
 }
 if(seed>=17000){pieces[0].shape=rect(1,1);pieces[6].shape=rect(1,1);pieces[24].shape=rect(4,1);}
 const legal=new Set(mask.map(p=>p.join(','))),used=new Set(),occ=new Set(),placed=[];let budget=18000;
 const fits=(b,x,y)=>b.shape.every(([u,v])=>legal.has([x+u,y+v].join(','))&&!occ.has([x+u,y+v].join(',')));
 const starter=seed>=8000?24:seed>=5000?3:24,starX=seed>=17000?0:seed>=16000?2:seed>=1000&&seed<2000?1:0,starY=seed>=17000?7:seed>=16000?4:seed>=15000?7:seed>=13000?6:seed>=5000&&seed<8000?8:7;
 if(seed>=8000&&seed<17000)pieces[24].shape=seed>=15000?rect(2,1):rect(1,2);
 placed.push({...pieces[starter],x:starX,y:starY});used.add(starter);pieces[starter].shape.forEach(([x,y])=>occ.add([x+starX,y+starY].join(',')));
 if(seed>=15000)for(const[i,x,y]of (seed>=16000&&seed<17000?[[18,4,7],[19,4,3],[2,0,1]]:[[18,4,6],[19,3,3],[2,1,1]])){
  pieces[i].shape=rect(2,1);const b={...pieces[i],x,y};if(!fits(b,x,y))return null;placed.push(b);used.add(i);b.shape.forEach(([u,v])=>occ.add([x+u,y+v].join(',')));
 }
 if(seed>=6000&&seed<11000)for(const[i,x,y]of (seed>=8000?[[0,1,7],[6,1,8],[8,2,8],[10,2,7],[13,2,6],[14,2,1],[7,5,1]]:[[0,0,7],[6,1,7],[8,1,8],[10,2,8],[12,2,7],[13,2,6],[14,2,1],[7,5,1]])){
  const b={...pieces[i],x,y};if(!fits(b,x,y))return null;placed.push(b);used.add(i);b.shape.forEach(([u,v])=>occ.add([x+u,y+v].join(',')));
 }
 if(seed>=9000&&seed<11000){const b={...pieces[27],x:3,y:5};if(!fits(b,b.x,b.y))return null;placed.push(b);used.add(27);b.shape.forEach(([u,v])=>occ.add([b.x+u,b.y+v].join(',')));}
 const fillOrder=seed>=11000?[...mask].sort((a,b)=>b[1]-a[1]||a[0]-b[0]):mask;
 function fill(){if(--budget<0)return false;if(used.size===pieces.length)return true;const p=fillOrder.find(p=>!occ.has(p.join(','))),seen=new Set();
  const choices=shuffle(pieces.map((_,i)=>i).filter(i=>!used.has(i)));if(seed<5000)choices.sort((a,b)=>pieces[b].shape.length-pieces[a].shape.length);
  for(const i of choices){const piece=pieces[i],sig=piece.color+JSON.stringify(piece.shape);if(seen.has(sig))continue;seen.add(sig);
   for(const[u,v]of piece.shape){const x=p[0]-u,y=p[1]-v,b={...piece,x,y};if(!fits(b,x,y)||placed.some(a=>a.color===b.color&&touching(a,b)))continue;
    placed.push(b);used.add(i);piece.shape.forEach(([u,v])=>occ.add([x+u,y+v].join(',')));if(fill())return true;placed.pop();used.delete(i);piece.shape.forEach(([u,v])=>occ.delete([x+u,y+v].join(',')));
   }
  }return false;
 }
 if(!fill())return null;
 const slots=seed>=13000?[['left',[0,1],3],['top',[2,0],2],['top',[1,0],1],['top',[4,0],2],['bottom',[4,8],2],['bottom',[1,8],1],['bottom',[2,8],2]]:seed>=4000?[['top',[0,0],2],['top',[2,0],3],['top',[5,0],2],['left',[0,0],3],['right',[6,0],3],['right',[6,6],3],['bottom',[2,8],3]]:seed>=2000?[
 ['top',[0,0],2],['top',[2,0],3],['top',[5,0],2],['left',[0,0],2],['right',[6,0],2],['right',[6,7],2],['bottom',[2,8],3],
 ]:seed>=1000?[
  ['top',[1,0],2],['top',[3,0],2],['left',[0,1],3],['right',[6,2],1],['left',[0,5],3],['right',[5,5],1],['bottom',[3,8],2],
 ]:[['top',[0,0],2],['top',[2,0],3],['top',[5,0],2],['left',[0,0],3],['right',[6,0],3],['right',[6,6],3],['bottom',[2,8],3]];
 const colors=['red','green','cyan','blue','yellow','orange','pink'],thresholds=[12,9,6,4,14,20,18];
 const assigned=seed>=13000?slots:shuffle(slots),gates=colors.map((color,i)=>{const[side,origin,size]=assigned[i];return{id:'l240-g-'+color,color,side,offset:origin[['left','right'].includes(side)?1:0],size,portals:[{side,origin,size}],frozen:thresholds[i]};});
 const purple=seed>=17000?{side:'left',origin:[0,7],size:1}:seed>=16000?{side:'left',origin:[2,4],size:1}:seed>=15000?{side:'left',origin:[0,7],size:1}:seed>=13000?{side:'left',origin:[0,5],size:3}:seed>=4000?{side:'left',origin:[0,6],size:3}:seed>=2000?{side:'left',origin:[0,7],size:2}:seed>=1000?{side:'bottom',origin:[1,8],size:2}:{side:'left',origin:[0,6],size:3};
 gates.push({id:'l240-g-purple',color:'purple',side:purple.side,offset:purple.origin[['left','right'].includes(purple.side)?1:0],size:purple.size,portals:[purple]});
 if(seed>=4000){
  const first=placed.find(b=>b.id==='l240-b'+starter),purples=seed>=15000?[first,...[18,19,2].map(i=>placed.find(b=>b.id==='l240-b'+i))]:seed>=6000&&seed<11000?[first,...[13,14,7].map(i=>placed.find(b=>b.id==='l240-b'+i))]:[first];
  if(seed>=9000&&seed<11000)purples.push(placed.find(b=>b.id==='l240-b27'));
  const purpleChoices=shuffle(placed.filter(b=>b!==first&&(seed>=11000?true:seed>=5000?b.shape.length===1&&b.x>=2&&b.y<8:b.y<6)));
  if(seed<5000)purpleChoices.sort((a,b)=>b.shape.length-a.shape.length);
  const purpleCount=seed>=15000?4:seed>=9000?5:4;
  for(const b of purpleChoices){if(purples.length>=purpleCount)break;
   if(purples.some(a=>touching(a,b)))continue;purples.push(b);
  }
  if(purples.length!==purpleCount)return null;
  const assigned=new Set(purples);purples.forEach(b=>b.color='purple');
  const counts={blue:5,cyan:4,green:seed>=15000?5:seed>=9000?4:5,red:4,yellow:4,orange:3,pink:2};let cb=15000;
  const adjacent=new Map(placed.map(b=>[b,placed.filter(a=>a!==b&&touching(a,b))]));
  function recolor(){if(--cb<0)return false;if(assigned.size===placed.length)return true;
   const b=shuffle(placed.filter(b=>!assigned.has(b))).sort((a,b)=>adjacent.get(b).filter(x=>assigned.has(x)).length-adjacent.get(a).filter(x=>assigned.has(x)).length)[0];
   for(const color of shuffle(Object.keys(counts))){const gate=gates.find(g=>g.color===color),span=1+Math.max(...b.shape.map(p=>p[['left','right'].includes(gate.side)?1:0]));if(span>gate.size||!counts[color]||adjacent.get(b).some(a=>assigned.has(a)&&a.color===color))continue;b.color=color;if(!api.auditCandidateBlockArt({blocks:[b]}).passed)continue;assigned.add(b);counts[color]--;if(recolor())return true;counts[color]++;assigned.delete(b);}return false;
  }
  if(!recolor())return null;
 }
 const colorSummary=Object.fromEntries([...new Set(placed.map(b=>b.color))].map(color=>[color,placed.filter(b=>b.color===color).length]));
 const sourceChanges=placed.map(b=>{const i=Number(b.id.split('b')[1]),s=source.blocks[i];return{id:b.id,source:{color:s.color,shape:s.shape,x:s.x,y:s.y},authored:{color:b.color,shape:b.shape,x:b.x,y:b.y}};});
 return{id:240,name:'冰门·双庭回转',difficulty:'super',width:7,height:9,playable:mask,mechanismRules:PROFILE,timeSeconds:180,reward:200,parMoves:61,preservedMoveTarget:61,
 designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:21,calibratedDifficulty:21},blocks:placed,gates,
 mechanismAdaptation:{sourceReference:root+'/source-transcription.json',change:'保7×9及50真实格、31源体总库存、七冰门12/9/6/4/14/20/18和紫普通门。源内部孤岛墙改上下对称原创连通轮廓。非原向L3实体重建，全部重排。重复黄20/红18映橙20/粉18，事实与适配分列；普通体形色必要适配详见逐体sourceChanges，不删体不增机关。',colorSummary,sourceChanges}};
}
const start=Number(process.argv[2]??1),count=Math.min(100,Number(process.argv[3]??35)),run=root+`/run-${start}-${Date.now()}`;
fs.mkdirSync(run,{recursive:true});fs.copyFileSync(new URL(import.meta.url),run+'/generator.mjs');let accepted;const rows=[];
for(let seed=start;seed<start+count;seed++){
 const level=make(seed),row={seed};if(!level){row.status='TILING_BUDGET';rows.push(row);continue;}row.levelSha256=digest(level);
 try{row.audit=audit(level,api);row.route=witness240(level,api);row.status='ROUTE_'+row.route.status;
  if(row.route.status==='witness'){row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;
   if(row.U<21)row.status='TOO_EASY';else if(row.U>30)row.status='TOO_HARD';else{
    const lowerOptions=seed>=15000?{goalClears:6}:{};
    row.lower=lower240(level,api,lowerOptions);row.status=row.lower.thresholdProven?'BOUNDS_MET':'LOWER_'+row.lower.status;
    if(row.lower.thresholdProven){const originalInput=payload240(level,api,lowerOptions).p;level.parMoves=level.preservedMoveTarget=row.replay.effectiveDrags;assert.deepEqual(payload240(level,api,lowerOptions).p,originalInput);row.qualification=qualify240(level,row.route.drags,api,lowerOptions);accepted={level,drags:row.route.drags,levelSha256:digest(level),routeSha256:digest(row.route.drags),L:21,U:row.U,lower:row.lower,qualification:row.qualification,audit:audit(level,api),sourceLedger:root+'/source-transcription.json',pointerValidated:false,formalAccepted:false};writeNew(run+'/qualified240.json',accepted);}
   }
  }
 }catch(e){row.status='REJECTED';row.error=e.message;}
 writeNew(run+`/candidate-${seed}.json`,{level,row});rows.push(row);console.log(JSON.stringify({seed,status:row.status,U:row.U,clears:row.route?.maxClearsSeen,error:row.error?.slice(0,300)}));if(accepted)break;
}
writeNew(run+'/report.json',{accepted:accepted?run+'/qualified240.json':null,rows});console.log(JSON.stringify({run,accepted:Boolean(accepted),attempts:rows.length}));

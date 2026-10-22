import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,PROFILE,rect,ruleGate,loadApi,audit,digest,replay,writeNew} from './common.mjs';
import {searchSpatial} from '../continuation211-colored-witness.mjs';
import {lower,qualify,payload} from './author236-native.mjs';
ruleGate();const{api}=await loadApi(),out=ROOT+'/author237';fs.mkdirSync(out,{recursive:true});
const source=[
 ['purple',[[1,0],[0,1],[1,1]],1,0,{layers:['purple','blue']}],['yellow',rect(1,2),3,0],['pink',[[0,0],[0,1],[1,1]],4,0],
 ['yellow',rect(2,2),0,2],['red',rect(3,1),2,2,{layers:['red','pink']}],['blue',rect(2,2),5,2,{layers:['blue','yellow']}],
 ['green',rect(3,1),2,3,{layers:['green','purple']}],['yellow',rect(3,1),2,4,{frozen:8}],['blue',rect(3,1),2,5,{frozen:8}],
 ['blue',rect(2,1),0,6],['yellow',rect(2,1),2,6],['blue',rect(2,1),4,6],['yellow',rect(1,2),6,6],
 ['yellow',rect(2,1),0,7],['purple',rect(2,1),2,7],['red',rect(2,1),4,7],
 ['green',[[0,0],[1,0],[1,1]],1,8],['purple',rect(1,2),3,8,{layers:['purple','pink']}],['blue',[[0,0],[1,0],[0,1]],4,8],
].map(([color,shape,x,y,props],i)=>({id:`source237-${i}`,color,shape,x,y,...props}));
assert.equal(source.flatMap(b=>b.shape).length,50);assert.equal(new Set(source.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y].join(',')))).size,50);
const sourceFile=out+'/source-block-transcription.json';
if(!fs.existsSync(sourceFile))writeNew(sourceFile,{sourceFrames:[ROOT+'/source/frame-628.png',ROOT+'/source/frame-663.png',ROOT+'/source/frame-666.png',ROOT+'/source/frame-673.png'],blocks:source,width:7,height:10,occupiedCells:50,
 sourceRowWidths:[3,5,7,7,3,3,7,7,5,3],
 gates:[{color:'green',side:'top',offset:2,size:3,frozen:10},{color:'blue',side:'left',offset:2,size:2,frozen:9},{color:'pink',side:'right',offset:2,size:2,frozen:9},{color:'purple',side:'right',offset:6,size:2,frozen:2},{color:'yellow',side:'bottom',offset:2,size:3,frozen:3},{color:'blue',side:'left',offset:6,size:1},{color:'red',side:'left',offset:7,size:1}],
 clockSeconds:130,completeOpening:true,hiddenInventory:'none',duplicateBlueGateConflict:'Source blue ice9 plus ordinary blue; mainline uniqueness requires minimal ordinary blue→cyan adaptation',sourceConfirmedBy:'root/video_facts independently inspected thaw frames663/666/673'});
const widths=[3,3,5,5,7,7,5,5,5,5],mask=widths.flatMap((w,y)=>Array.from({length:w},(_,x)=>[x+(7-w)/2,y]));assert.equal(mask.length,50);
const palette=['green','blue','pink','purple','yellow','cyan','red'];
function rng(seed){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const touch=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
function make(seed){
 const random=rng(seed),shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.v);
 const pieces=source.map((b,i)=>({id:`l237-b${i}`,color:[9,11,18].includes(i)?'cyan':b.color,
 shape:b.shape.length===3?(b.frozen||b.layers?rect(3,1):random()<.5?rect(1,3):rect(3,1)):b.shape.length===2?(random()<.5?rect(1,2):rect(2,1)):rect(2,2),
 ...b.frozen?{frozen:b.frozen}:{},...b.layers?{layers:[...b.layers]}:{}}));
 const legal=new Set(mask.map(p=>p.join(','))),occupied=new Set(),placed=[],used=new Set();let budget=20000;
 const fits=(b,x,y)=>b.shape.every(([dx,dy])=>legal.has([x+dx,y+dy].join(','))&&!occupied.has([x+dx,y+dy].join(',')));
 function fill(){if(--budget<0)return false;if(used.size===pieces.length)return true;const p=mask.find(p=>!occupied.has(p.join(','))),tried=new Set();
  for(const i of shuffle(pieces.map((_,i)=>i).filter(i=>!used.has(i))).sort((a,b)=>pieces[b].shape.length-pieces[a].shape.length)){
   const piece=pieces[i],sig=JSON.stringify(piece.shape)+(piece.frozen||piece.layers?piece.color+JSON.stringify(piece.layers)+piece.frozen:'');if(tried.has(sig))continue;tried.add(sig);
   for(const[dx,dy]of piece.shape){const x=p[0]-dx,y=p[1]-dy,b={...piece,x,y};if(!fits(b,x,y)||((b.frozen||b.layers)&&placed.some(a=>(a.frozen||a.layers)&&a.color===b.color&&touch(a,b))))continue;
    placed.push(b);used.add(i);for(const[u,v]of b.shape)occupied.add([x+u,y+v].join(','));if(fill())return true;
    placed.pop();used.delete(i);for(const[u,v]of b.shape)occupied.delete([x+u,y+v].join(','));
   }
  }return false;
 }
 if(!fill())return null;
 const slots=shuffle([['top',[2,0],3],['bottom',[1,9],3],['left',[1,2],2],['right',[5,2],2],['left',[0,4],2],['right',[6,4],2],['right',[5,7],3]]);
 const freeze=[10,9,9,2,3,0,0],gates=palette.map((color,i)=>{const[side,origin,size]=slots[i];return{id:'l237-g-'+color,color,side,offset:origin[['left','right'].includes(side)?1:0],size,portals:[{side,origin,size}],...freeze[i]?{frozen:freeze[i]}:{}};});
 const assigned=new Set(placed.map((b,i)=>b.frozen||b.layers?i:-1).filter(i=>i>=0)),adjacent=placed.map(a=>placed.map((b,i)=>a!==b&&touch(a,b)?i:-1).filter(i=>i>=0));
 if(placed.some((b,i)=>assigned.has(i)&&adjacent[i].some(j=>assigned.has(j)&&placed[j].color===b.color)))return null;
 // Every color stage needs an actual portal wide enough for the unrotated body.
 const gateFits=(b,color)=>{const g=gates.find(g=>g.color===color);return 1+Math.max(...b.shape.map(p=>p[['left','right'].includes(g.side)?1:0]))<=g.size;};
 if(placed.some((b,i)=>assigned.has(i)&&(b.layers??[b.color]).some(col=>!gateFits(b,col))))return null;
 let colorBudget=5000;
 function color(){if(--colorBudget<0)return false;if(assigned.size===placed.length)return true;
  const i=shuffle(placed.map((_,i)=>i).filter(i=>!assigned.has(i))).sort((a,b)=>adjacent[b].filter(j=>assigned.has(j)).length-adjacent[a].filter(j=>assigned.has(j)).length)[0],b=placed[i];
  for(const col of shuffle(palette)){if(!gateFits(b,col)||adjacent[i].some(j=>assigned.has(j)&&placed[j].color===col))continue;b.color=col;if(!api.auditCandidateBlockArt({blocks:[b]}).passed)continue;assigned.add(i);if(color())return true;assigned.delete(i);}return false;
 }
 if(!color())return null;
 return{id:237,name:'壳冰·环肩递进',difficulty:'hard',width:7,height:10,playable:mask,mechanismRules:PROFILE,timeSeconds:130,reward:200,parMoves:50,preservedMoveTarget:50,
 designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:16,calibratedDifficulty:16},blocks:placed,gates,
 mechanismAdaptation:{sourceReference:sourceFile,change:'保7×10异形类别与50格/19本体、5壳逐实例外芯配色、两H3冰8黄/蓝及五冰门绿10/蓝9/粉9/紫2/黄3。源多腰缺口改左右对称宽肩原创轮廓；原非原向L3及普通三格改H3/V3、双格改H2/V2并全盘重排。源蓝普通与蓝冰门违反唯一色，普通门最小映青、普通体配色必要适配；全部机械层色保持，出口重排真实边界，时限130秒。'}};
}
const start=Number(process.argv[2]??1),count=Math.min(500,Number(process.argv[3]??100)),run=out+`/run-${start}-${Date.now()}`;fs.mkdirSync(run);const rows=[];let accepted;
for(let seed=start;seed<start+count;seed++){
 const level=make(seed),row={seed,budget:{routeMilliseconds:1600,routeStates:35000,lowerMilliseconds:5000,lowerStates:800000}};
 if(!level){row.status='CONSTRUCTION_BUDGET';rows.push(row);continue;}row.levelSha256=digest(level);
 try{row.audit=audit(level,api);row.route=searchSpatial(level,api,{floor:21,maxMilliseconds:1600,maxStates:35000,maxTransitions:400000,normalize:true,orderSeed:seed%19});row.status='ROUTE_'+row.route.status;
  if(row.route.status==='witness'){row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;
   if(row.U<16)row.status='BELOW_DIFFICULTY';else if(row.U>20)row.status='ABOVE_DIFFICULTY';else{
    row.lower=lower(level,api,{floor:16,maxMilliseconds:5000,maxStates:800000});row.status=row.lower.thresholdProven?'BOUNDS_MET_PENDING_QUALIFICATION':'LOWER_'+row.lower.status;
    if(row.lower.thresholdProven){const p=payload(level,api,{floor:16,maxMilliseconds:5000,maxStates:800000}).p;level.preservedMoveTarget=row.replay.effectiveDrags;level.parMoves=row.replay.effectiveDrags;assert.deepEqual(payload(level,api,{floor:16,maxMilliseconds:5000,maxStates:800000}).p,p);row.qualification=qualify(level,row.route.drags,api);
     accepted={status:'HEADLESS_QUALIFIED_PENDING_DUAL_POINTER',level,drags:row.route.drags,levelSha256:digest(level),routeSha256:digest(row.route.drags),sourceLedger:sourceFile,proof:{...row.lower,originalInputLevelSha256:row.levelSha256,levelSha256:digest(level),binding:'Only independent scoring metadata changed; native input deeply equal, no repeated lower search'},qualification:row.qualification,replay:replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true}),audit:audit(level,api),difficultyBand:[16,20],certifiedLowerBound:16,witnessUpperBound:row.U,pointerValidated:false,formalAdopted:false,releaseApproved:false};writeNew(run+'/qualified237.json',accepted);
    }
   }
  }
 }catch(e){row.status='REJECTED';row.error=e.stack;}
 writeNew(run+`/candidate-${seed}.json`,{level,row});rows.push(row);console.log(JSON.stringify({seed,status:row.status,U:row.U,error:row.error?.split('\n')[0],clears:row.route?.maxClearsSeen}));if(accepted)break;
}
writeNew(run+'/report.json',{accepted:accepted?{file:run+'/qualified237.json',levelSha256:accepted.levelSha256}:null,rows});console.log(JSON.stringify({run,accepted:Boolean(accepted),attempted:rows.length}));

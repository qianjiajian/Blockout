import fs from 'node:fs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {loadSpatialApi,searchSpatial} from './continuation211-colored-witness.mjs';
import {loadContinuationRuntime,sha256} from './continuation211-runtime.mjs';
const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));
const OUT='deliverables/continue211-220-20260930/design216-new';fs.mkdirSync(OUT,{recursive:true});
const api=await loadSpatialApi(),core=await loadContinuationRuntime();
const S={S:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],Q:[[0,0],[1,0],[0,1],[1,1]],L:[[0,0],[0,1],[1,1]],R6:[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]]};
const lowerRaw=[['orange','H2'],['yellow','H2'],['blue','L'],['orange','H2'],['purple','Q'],['blue','Q'],['purple','Q'],['yellow','H3']];
const upperRaw=[['pink','S'],['purple','H2'],['cyan','S'],['red','Q',{movementAxis:'horizontal'}],['purple','L'],['cyan','V2'],['cyan','V2'],['green','H2'],['pink','H3',{movementAxis:'vertical'}],['purple','Q'],['pink','Q'],['red','Q']];
const variant=Number(process.env.DESIGN216_VARIANT??0);
if(variant>=1)lowerRaw.splice(2,1,['blue','S'],['blue','S'],['blue','S']);
if(variant>=4)upperRaw[11][0]=variant===4?'purple':'pink';
const playable=Array.from({length:80},(_,i)=>[i%8,Math.floor(i/8)]).filter(([x,y])=>y<4||y>=7||x===3||x===4);
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function pack(raw,region,seed,prefix,fixed=[]){
 const rand=random(seed),legal=new Set(region.map(p=>p.join(','))),occupied=new Map(),remaining=new Set(raw.map((_,i)=>i)),result=[];let budget=20000;
 const plans=raw.map(([color,shape,props],i)=>region.flatMap(([x,y])=>{const cells=S[shape].map(([dx,dy])=>[x+dx,y+dy]);return cells.every(p=>legal.has(p.join(',')))?[{id:`l216-${prefix}${i}`,color,x,y,shape:S[shape],...props,cells}]:[];}));
 const visit=()=>{if(!remaining.size)return true;if(--budget<0)return false;let options=null;
  for(const cell of region){if(occupied.has(cell.join(',')))continue;const opts=[];
   for(const i of remaining)for(const p of plans[i])if(p.cells.some(q=>q[0]===cell[0]&&q[1]===cell[1])&&!p.cells.some(q=>occupied.has(q.join(',')))&&!p.cells.some(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>occupied.get([x+dx,y+dy].join(','))===p.color)))opts.push([i,p]);
   if(!opts.length)return false;if(options===null||opts.length<options.length)options=opts;if(options.length===1)break;
  }
  for(let j=options.length-1;j>0;j--){const k=Math.floor(rand()*(j+1));[options[j],options[k]]=[options[k],options[j]];}
  for(const [i,p]of options){remaining.delete(i);result.push(p);for(const q of p.cells)occupied.set(q.join(','),p.color);if(visit())return true;for(const q of p.cells)occupied.delete(q.join(','));remaining.add(i);result.pop();}return false;
 };
 for(const [i,x,y]of fixed){const p=plans[i].find(p=>p.x===x&&p.y===y);if(!p)return null;remaining.delete(i);result.push(p);for(const q of p.cells)occupied.set(q.join(','),p.color);}
 return visit()?result.map(({cells,...b})=>b):null;
}
const gate=(id,color,side,origin,size,frozen)=>({id,color,side,offset:['top','bottom'].includes(side)?origin[0]:origin[1],size,portals:[{side,origin,size}],...(frozen?{frozen}:{})});
const history=[];
for(let n=0;n<32;n++){
 const lower=pack(lowerRaw,playable.filter(([,y])=>y>=7),216000+variant*1000+n,'b',[[variant>=1?7:5,0,8]]);
 const upper=pack(upperRaw,playable.filter(([,y])=>y<4),216100+variant*1000+n,'h',variant>=7?[[3,0,0],[8,5,3],[10,5,0]]:variant>=6?[[3,3,1],[8,5,3],[10,5,0]]:variant>=3?[[3,3,1],[8,5,3],[5,0,2],[1,6,2],[10,5,0]]:[[3,6,0],[8,5,3],...(variant>=2?[[5,0,2],[1,6,2]]:[])]);
 if(!lower||!upper){console.log(n,'packing-failed');continue;}
 // Preserve the purple-only six-cell bridge and full-fill it with one body.
 if(lower.some(b=>b.color==='purple'&&b.shape.some(([dx,dy])=>b.y+dy===7&&[3,4].includes(b.x+dx))))continue;
 const level={id:216,name:'紫色栈桥·216',mechanismRules:'revised-2026-09-27-v1.5',width:8,height:10,playable,difficulty:'normal',timeSeconds:120,reward:200,parMoves:8,preservedMoveTarget:48,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:13,calibratedDifficulty:1.45},
 gates:[gate('red','red','left',[0,0],3),gate('pink','pink','top',[5,0],3),gate('purple','purple','right',[7,0],3),gate('green','green','right',[7,3],1),gate('cyan','cyan','bottom',[0,3],1),gate('blue','blue','left',[0,8],2),gate('orange','orange','top',[6,7],2,2),gate('yellow','yellow','right',[7,9],1,3)],
 blocks:[...lower,{id:'l216-bridge',color:'purple',x:3,y:4,shape:S.R6},...upper.map(b=>({...b,shutterId:'cover'}))],shutters:[{id:'cover',x:0,y:0,width:8,height:4,count:6,skin:'shutter'}],coloredGrids:[{id:'purple-floor',color:'purple',cells:Array.from({length:6},(_,i)=>[3+i%2,4+Math.floor(i/2)])}],
 mechanismAdaptation:{userAuthorized:'211–220有限换色换形与直接正式数据接入，v1.125',change:'216视频580秒及630秒：保8×10/62格双舱、1帘6、6紫彩格、冰门2/3、隐藏2方向块。源隐藏约24/32格及开局桥6格未铺满，补普通块；非原向下层紫T4和上层红方向L4改Q2。源10实体口/重复红蓝橙与8色唯一口冲突：保全部冰门，取消上舱蓝/橙普通口，下舱红口和对应块映黄，上舱蓝橙块换色换形匹配其余色口。原向全铺重排，不冒称来源精确一致。'}};
 const mechanism=core.auditRevisedMechanismContract(level);if(mechanism.length)throw Error(JSON.stringify(mechanism));
 const upperRoute=searchSpatial(level,api,{floor:variant>=3?Infinity:16,normalize:true,maxMilliseconds:2000,maxStates:30000,maxTransitions:1000000,orderSeed:n});
 const replay=upperRoute.drags?core.replayRevisedRoute(level,upperRoute.drags):null;
 const row={n,levelSha256:sha256(level),status:upperRoute.status,maxClears:upperRoute.maxClearsSeen,U:replay?.nonClearingDrags??null,valid:replay?.valid??false,complete:replay?.complete??false};history.push(row);console.log(JSON.stringify(row));
 fs.writeFileSync(`${OUT}/attempt-${variant}-${n}.json`,JSON.stringify({level,levelSha256:sha256(level),drags:upperRoute.drags??[],upper:upperRoute,replay},null,2));
 if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){fs.writeFileSync(`${OUT}/upper-pass.json`,JSON.stringify({level,drags:upperRoute.drags,replay},null,2));break;}
}
fs.writeFileSync(`${OUT}/history-${variant}.json`,JSON.stringify(history,null,2));

import fs from 'node:fs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {loadSpatialApi,searchSpatial} from './remake201to210-v123-floor.mjs';
import {loadContinuationRuntime,sha256} from './continuation211-runtime.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));
const OUT='deliverables/continue211-220-20260930/design218-new';fs.mkdirSync(OUT,{recursive:true});
const api=await loadSpatialApi(),core=await loadContinuationRuntime();
const S={H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],V3:[[0,0],[0,1],[0,2]],Q:[[0,0],[1,0],[0,1],[1,1]],L:[[0,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]]};
const raw=[['green','Q',{layers:['green','orange']}],['yellow','Q',{layers:['yellow','blue']}],['purple','V3',{layers:['purple','red']}],['orange','Q',{lockedBy:'key218',lockCount:3}],['blue','Q',{keyId:'key218'}],['purple','L',{keyId:'key218'}],['red','Z',{keyId:'key218'}],['red','L'],['blue','V2'],['yellow','V2'],['orange','V2'],['purple','L'],['purple','H2'],['blue','L'],['red','Q'],['yellow','H2'],['blue','H3'],['red','H3'],['green','H3'],['orange','H3'],['yellow','H3'],['green','H2']];
const playable=Array.from({length:70},(_,i)=>[i%7,Math.floor(i/7)]).filter(([x,y])=>!([0,9].includes(y)&&[0,6].includes(x)));
const cells=new Set(playable.map(p=>p.join(',')));
const total=raw.reduce((n,p)=>n+S[p[1]].length,0);if(total!==playable.length)throw Error(`area ${total} vs ${playable.length}`);
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const variant=Number(process.env.DESIGN218_VARIANT??0);
if(variant>=2)raw[16][1]='V3'; // Blue must fit its two-cell top aperture.
function packing(seed){
 const rand=rng(seed),occupied=new Map(),remaining=new Set(raw.map((_,i)=>i)),blocks=[];let budget=50000;
 const placements=raw.map(([color,shape,props],i)=>playable.flatMap(([x,y])=>{
  const footprint=S[shape].map(([dx,dy])=>[x+dx,y+dy]);return footprint.every(p=>cells.has(p.join(',')))?[{id:`l218-b${i}`,color,x,y,shape:S[shape],...props,footprint}]:[];
 }));
 const recurse=()=>{
  if(!remaining.size)return true;if(--budget<0)return false;
  let options=null;
  for(const cell of playable){const k=cell.join(',');if(occupied.has(k))continue;
   const opts=[];
   for(const i of remaining)for(const p of placements[i]){
    if(!p.footprint.some(q=>q[0]===cell[0]&&q[1]===cell[1]))continue;
    if(p.footprint.some(q=>occupied.has(q.join(','))))continue;
    if(p.footprint.some(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>occupied.get([x+dx,y+dy].join(','))===p.color)))continue;
    opts.push([i,p]);
   }
   if(!opts.length)return false;
   if(options===null||opts.length<options.length)options=opts;
   if(options.length===1)break;
  }
  for(let j=options.length-1;j>0;j--){const k=Math.floor(rand()*(j+1));[options[j],options[k]]=[options[k],options[j]];}
  for(const [i,p]of options){remaining.delete(i);blocks.push(p);for(const q of p.footprint)occupied.set(q.join(','),p.color);
   if(recurse())return true;
   for(const q of p.footprint)occupied.delete(q.join(','));blocks.pop();remaining.add(i);
  }
  return false;
 };
 if(variant>=1)for(const [i,x,y]of [[12,3,0],[9,6,6],[0,0,7]]){
   const p=placements[i].find(p=>p.x===x&&p.y===y);if(!p)throw Error('fixed footprint');
   remaining.delete(i);blocks.push(p);for(const q of p.footprint)occupied.set(q.join(','),p.color);
 }
 return recurse()?blocks.map(({footprint,...b})=>b):null;
}
const ledger=[];
for(let n=0;n<32;n++){
 const seed=218000+variant*100+n,blocks=packing(seed);if(!blocks){console.log(seed,'packing-budget');continue;}
 const level={id:218,name:'钥锁错位·218',mechanismRules:'revised-2026-09-27-v1.5',width:7,height:10,playable,difficulty:'easy',timeSeconds:100,reward:200,parMoves:8,preservedMoveTarget:58,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:7,calibratedDifficulty:1.25},
 gates:[{id:'purple',color:'purple',side:'top',offset:3,size:2},{id:'blue',color:'blue',side:'top',offset:1,size:2,frozen:3},{id:'red',color:'red',side:'right',offset:1,size:3,frozen:1},{id:'orange',color:'orange',side:'left',offset:2,size:2,frozen:3},{id:'green',color:'green',side:'left',offset:7,size:2},{id:'yellow',color:'yellow',side:'right',offset:6,size:2}],blocks,
 mechanismAdaptation:{userAuthorized:'211–220有限换色换形重生成与正式数据接入；v1.125',change:'218来源786秒/820秒：3钥匙1锁3、3壳、3冰门3/3/1保留。源gold映orange、lime映yellow。源不对称64格与空17格、非矩形壳/非原向形状须适配；原创对称66格轮廓、3壳改原向矩形，空白补普通块，钥匙和形色原向重排；不称精确复刻。'}};
 const hash=sha256(level);const opening=auditOpeningCoverage(new core.PuzzleModel(level).snapshot());
 if(!opening.passed||core.auditRevisedMechanismContract(level).length)throw Error('static invalid');
 const upper=searchSpatial(level,api,{floor:11,normalize:true,maxMilliseconds:1400,maxStates:20000,maxTransitions:800000,orderSeed:n});
 const replay=upper.drags?core.replayRevisedRoute(level,upper.drags):null;
 const lower=replay?.valid&&replay.complete&&replay.nonClearingDrags>=5&&replay.nonClearingDrags<=10?searchSpatial(level,api,{floor:5,prove:true,maxMilliseconds:3000,maxStates:100000,maxTransitions:1500000}):null;
 const row={seed,levelSha256:hash,status:upper.status,U:replay?.nonClearingDrags??null,complete:replay?.complete??false,lower:lower?.status??null};ledger.push(row);console.log(JSON.stringify(row));
 fs.writeFileSync(`${OUT}/attempt-${seed}.json`,JSON.stringify({level,levelSha256:hash,drags:upper.drags??[],upper,replay,lower,opening},null,2));
 if(lower?.status==='threshold-proven'){fs.writeFileSync(`${OUT}/spatial-pass.json`,JSON.stringify({level,levelSha256:hash,drags:upper.drags,replay,lower,opening},null,2));break;}
}
fs.writeFileSync(`${OUT}/ledger-${variant}.json`,JSON.stringify(ledger,null,2));

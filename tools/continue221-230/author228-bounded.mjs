import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake111to120-spatial-floor-v147.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {nativeKeyFloor,qualifyNativeKeyFloor} from './native-key-floor.mjs';import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);const out=path.resolve('deliverables/continue221-230-20260930/author228');fs.mkdirSync(out,{recursive:true});
const api=await loadSpatialApi(),built=await build({stdin:{resolveDir:process.cwd(),contents:`export {replayRevisedRoute} from './src/core/revisedLevelSearch';export {auditRevisedCandidate} from './src/core/revisedCandidateAudit';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),runtime=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),H2=rect(2,1),V2=rect(1,2),SQ=rect(2,2),H3=rect(3,1),V3=rect(1,3);
const specs=[['green',H2,{movementAxis:'vertical'}],['yellow',V2,{}],['green',SQ,{}],['purple',V2,{}],['purple',SQ,{layers:['purple','red']}],['yellow',SQ,{layers:['yellow','green']}],['red',SQ,{layers:['red','blue']}],['blue',H2,{}],['red',H2,{}],['yellow',V3,{}],['red',SQ,{}],['purple',H3,{layers:['purple','yellow']}],['blue',H3,{}],['yellow',H3,{}]];
const gates=[['red','top',2,2,8],['green','bottom',2,2,12],['blue','left',0,3,3],['purple','left',4,3,4],['yellow','right',2,3,0]].map(([color,side,offset,size,frozen])=>({id:'l228-'+color,color,side,offset,size,...(frozen?{frozen}:{})}));
const ignore=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
function candidate(seed){let r=(seed*2654435761)>>>0;const random=()=>{r^=r<<13;r^=r>>>17;r^=r<<5;return(r>>>0)/4294967296;};const trio=process.argv[4]==='trio',pieces=specs.map(([color,shape,properties],i)=>({id:'l228-b'+i,color,shape:trio?(i===0?V3:random()<.5?H3:V3):shape,...properties})),occupied=Array(42).fill(false),placed=[],localGates=structuredClone(gates);let budget=12000;
 if(trio){localGates[0].size=3;localGates[1].size=3;}
 localGates[0].offset=seed%(trio?4:5);localGates[1].offset=Math.floor(seed/5)%(trio?4:5);localGates[4].offset=Math.floor(seed/25)%5;
 if(seed%2)[localGates[2].offset,localGates[3].offset]=[localGates[3].offset,localGates[2].offset];
 if(process.argv[4]==='phase'){
  pieces.find(b=>b.id==='l228-b8').color='yellow';
  localGates[0]={id:'l228-red',color:'red',side:'right',offset:0,size:3,frozen:8};
  localGates[1]={id:'l228-green',color:'green',side:'bottom',offset:Math.floor(seed/5)%4,size:3,frozen:12};
  localGates[2]={id:'l228-blue',color:'blue',side:'left',offset:Math.floor(seed/25)%5,size:3,frozen:3};
  localGates[3]={id:'l228-purple',color:'purple',side:'right',offset:4,size:3,frozen:4};
  localGates[4]={id:'l228-yellow',color:'yellow',side:'top',offset:seed%4,size:3};
 }
 const fixedIndices=[];
 if(process.argv[4]==='opening'||process.argv[4]==='split'){
  localGates[4].offset=0;pieces[9].shape=H3;pieces[8].color='yellow';
  let fixed=[[13,3,0],[9,3,2],[8,0,1]];
  if(process.argv[4]==='split'){pieces[1].shape=H2;pieces[3].shape=rect(1,1);pieces[3].color='red';pieces.push({id:'l228-b14',color:'purple',shape:rect(1,1)});fixed.push([3,2,1],[7,1,0],[14,0,0]);localGates[2].offset=0;localGates[3].offset=4;}
  for(const[i,x,y]of fixed){
   const b={...pieces[i],x,y};placed.push(b);for(const[dx,dy]of b.shape)occupied[(y+dy)*6+x+dx]=true;fixedIndices.push(i);
  }
 }
 const touches=(a,b)=>a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1));
 function fill(rem){if(--budget<0)return false;if(!rem.length)return true;const pos=occupied.indexOf(false),x=pos%6,y=Math.floor(pos/6),order=rem.map(i=>({i,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.i);
  for(const i of order){const b={...pieces[i],x,y},cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(b.movementAxis&&(x<localGates[1].offset||x+Math.max(...b.shape.map(p=>p[0]))>=localGates[1].offset+localGates[1].size))continue;if(cells.some(([xx,yy])=>xx>=6||yy>=7||occupied[yy*6+xx]))continue;if(placed.some(a=>a.color===b.color&&touches(a,b)))continue;
   cells.forEach(([xx,yy])=>occupied[yy*6+xx]=true);placed.push(b);if(fill(rem.filter(v=>v!==i)))return true;placed.pop();cells.forEach(([xx,yy])=>occupied[yy*6+xx]=false);
  }return false;
 }
 if(!fill(pieces.map((_,i)=>i).filter(i=>!fixedIndices.includes(i))))return null;
 return {id:228,name:'四色剥壳回廊',width:6,height:7,difficulty:'easy',mechanismRules:'revised-2026-09-27-v1.5',timeSeconds:210,parMoves:7,reward:200,preservedMoveTarget:58,blocks:placed,gates:localGates,mechanismAdaptation:{userAuthorized:'221–230有限换色换形重生成',change:`源687秒开局14体42格、4外壳、1竖轴H2、四冰门红8蓝3紫4绿12。新6×7原创满铺，${trio?'14实体改为原向H3/V3，总42格、壳数量和颜色序列/轴方向保持':'黄L3适配V3、红J4适配SQ2，其余形状和颜色数量保留'}。没有升降台或卷帘；三星待已验路线设置。`}};
}
const start=Number(process.argv[2]??1),count=Math.min(300,Number(process.argv[3]??100)),records=[];let accepted;const end=Date.now()+180000;
for(let seed=start;seed<start+count&&Date.now()<end;seed++){
 const level=candidate(seed);if(!level){records.push({seed,status:'TILING_BUDGET'});continue;}const row={seed,sha256:digest(level),status:'STATIC_PENDING'};
 try{api.validateLevel(level);const issues=runtime.auditRevisedCandidate(level).issues.filter(i=>!ignore.has(i.code));assert.deepEqual(issues,[]);assert(auditOpeningCoverage(new api.PuzzleModel(level).snapshot()).passed);assert(auditGateSpanLimits(level).passed);assert(level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
  row.route=searchSpatial({...structuredClone(level),mechanismRules:'revised-2026-09-23-v1.4'},api,{floor:11,maxMilliseconds:1400,maxStates:40000,maxTransitions:800000,normalize:true,orderSeed:seed%14});row.status='ROUTE_'+row.route.status.toUpperCase();
  if(row.route.status==='witness'){row.replay=runtime.replayRevisedRoute(level,row.route.drags);assert(row.replay.valid&&row.replay.complete);const U=row.replay.nonClearingDrags;
   if(U<5)row.status='TOO_EASY_REGENERATE';else if(U>10)row.status='UPPER_BOUND_NOT_MET_REGENERATE';else {row.floor=nativeKeyFloor(level,{floor:5,countdown:true,maxMilliseconds:1400,maxStates:400000});row.status=row.floor.thresholdProven?'BOUNDS_MET_POINTER_PENDING':'LOWER_BOUND_'+row.floor.status.toUpperCase()+'_REGENERATE';if(row.floor.thresholdProven){row.qualification=qualifyNativeKeyFloor(level,row.route.drags,api,{countdown:true});accepted={level,record:row};}}
   fs.writeFileSync(path.join(out,`candidate-${seed}-${row.sha256.slice(0,8)}.json`),JSON.stringify({level,row},null,2));
  }
 }catch(e){row.status='INVALID';row.error=e.message;}
 records.push(row);console.log(JSON.stringify({seed,status:row.status,U:row.replay?.nonClearingDrags}));fs.writeFileSync(path.join(out,`batch-${start}-progress.json`),JSON.stringify({activeRule:lock.activeVersion,records},null,2));if(accepted)break;
}
fs.writeFileSync(path.join(out,`batch-${start}-report.json`),JSON.stringify({activeRule:lock.activeVersion,accepted:accepted??null,records},null,2));

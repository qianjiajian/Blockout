import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake111to120-spatial-floor-v147.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {nativeKeyFloor,qualifyNativeKeyFloor} from './native-key-floor.mjs';

const out=path.resolve('deliverables/continue221-230-20260930/author229');fs.mkdirSync(out,{recursive:true});
const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));
const api=await loadSpatialApi();
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`export {replayRevisedRoute} from './src/core/revisedLevelSearch';export {auditRevisedCandidate} from './src/core/revisedCandidateAudit';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const runtime=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const S=rect(1,1),V2=rect(1,2),V3=rect(1,3),H2=rect(2,1),SQ=rect(2,2);
const narrow=process.argv[4]==='narrow',W=narrow?4:6,H=narrow?9:7;
const spec=[
 ['red',V3,{movementAxis:'vertical'}],['purple',V3,{movementAxis:'vertical'}],
 ['yellow',V3,{lockedBy:'red-key',lockCount:1}],['pink',V3,{lockedBy:'blue-key',lockCount:1}],
 ['blue',SQ,{}],['orange',V2,{}],['green',V2,{}],['pink',V2,{}],['yellow',V2,{}],['red',V2,{}],['green',H2,{}],
 ['pink',S,{}],['orange',S,{keyId:'red-key'}],['yellow',S,{keyId:'blue-key'}],
 ['yellow',S,{movementAxis:'horizontal'}],['green',S,{movementAxis:'horizontal'}],['blue',S,{}],
 ['blue',H2,{}],['orange',V3,{}],['yellow',rect(3,1),{}],
];
if(narrow)spec.splice(18,2);
const gates=[['red','bottom',0,1],['purple','bottom',W-1,1],['blue','top',Math.floor(W/2)-1,2],['green','left',H-3,3],['pink','left',0,3],['yellow','right',0,3],['orange','right',H-3,3]].map(([color,side,offset,size])=>({id:'l229-'+color,color,side,offset,size}));
const ignored=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
function rng(seed){let n=seed;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
function candidate(seed){
 const random=rng(seed),pieces=spec.map(([color,shape,props],i)=>({id:'l229-b'+i,color,shape,...props})),occupied=Array(W*H).fill(false),placed=[];
 let effort=0;
 function fill(remaining){
  if(++effort>4000)return false;if(!remaining.length)return true;
  const p=occupied.indexOf(false),x=p%W,y=Math.floor(p/W),order=remaining.map(i=>({i,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.i);
  for(const i of order){const b=pieces[i],cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);
   if(b.movementAxis==='vertical'&&x!==(b.color==='red'?0:W-1))continue;
   if(b.movementAxis==='horizontal'&&(b.color==='yellow'?y>=3:y<H-3))continue;
   if(cells.some(([xx,yy])=>xx>=W||yy>=H||occupied[yy*W+xx]))continue;
   for(const[xx,yy]of cells)occupied[yy*W+xx]=true;placed.push({...b,x,y});
   if(fill(remaining.filter(j=>j!==i)))return true;
   placed.pop();for(const[xx,yy]of cells)occupied[yy*W+xx]=false;
  }return false;
 }
 if(!fill(pieces.map((_,i)=>i)))return null;
 // Shapes are re-tiled every seed; ordinary colours are exchanged locally
 // within the same shape inventory. Keys/locks/axis instances remain intact.
 const fixed=placed.filter(b=>b.movementAxis),unfixed=placed.filter(b=>!b.movementAxis);
 const touches=(a,b)=>a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1));
 const assigned=[...fixed];
 for(const b of unfixed){const options=gates.filter(g=>1+Math.max(...b.shape.map(p=>p[['left','right'].includes(g.side)?1:0]))<=g.size).map(g=>g.color).filter(color=>!assigned.some(a=>a.color===color&&touches(a,b)));
  if(!options.length)return null;b.color=options[Math.floor(random()*options.length)];assigned.push(b);
 }
 return {id:229,name:'双钥匙回廊',width:W,height:H,mechanismRules:'revised-2026-09-27-v1.5',difficulty:'normal',timeSeconds:210,parMoves:14,reward:200,preservedMoveTarget:62,gates:structuredClone(gates),blocks:placed,mechanismAdaptation:{userAuthorized:'221–230有限换色换形重生成',change:`来源229 776秒：17体34格/2钥匙/2锁计数1/4轴。新${W}×${H}原创满铺；两枚非原向L3锁体适配V3，${narrow?'一普通H2补2格':'三普通补块填8格'}；源浅绿映粉，普通块按无同色邻接重配颜色。源事实、形色适配与待验评分分列。`}};
}
const start=Number(process.argv[2]??1),count=Math.min(200,Number(process.argv[3]??50)),deadline=Date.now()+180000;
const records=[],fingerprints=new Set();let accepted;
for(let seed=start;seed<start+count&&Date.now()<deadline;seed++){
 const level=candidate(seed);if(!level){records.push({seed,status:'TILING_BUDGET'});continue;}
 const sha=digest(level);if(fingerprints.has(sha))continue;fingerprints.add(sha);
 const row={seed,sha256:sha,budget:{routeMilliseconds:1400,floorMilliseconds:1400,maxStates:40000,maxTransitions:800000},status:'UNVALIDATED'};
 try{
  api.validateLevel(level);const opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),gate=auditGateSpanLimits(level),issues=runtime.auditRevisedCandidate(level).issues.filter(i=>!ignored.has(i.code));
  if(!opening.passed||!gate.passed||issues.length){row.status='STATIC_REJECTED';row.issues=issues;row.opening=opening;row.gate=gate;records.push(row);continue;}
  assert(level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
  const projection={...structuredClone(level),mechanismRules:'revised-2026-09-23-v1.4'};
  const route=searchSpatial(projection,api,{maxMilliseconds:1400,maxStates:40000,maxTransitions:800000,normalize:true,orderSeed:seed%19});
  row.route=route;row.status='ROUTE_'+route.status.toUpperCase();
  if(route.status==='witness'){
   row.replay=runtime.replayRevisedRoute(level,route.drags);
   if(!row.replay.valid||!row.replay.complete)row.status='AUTHORITATIVE_REPLAY_REJECTED';
   else if(row.replay.nonClearingDrags>15)row.status='UPPER_BOUND_NOT_MET_REGENERATE';
   else if(row.replay.nonClearingDrags<11)row.status='TOO_EASY_REGENERATE';
   else {
    row.floor=nativeKeyFloor(level,{floor:11,maxMilliseconds:1400,maxStates:400000});
    row.status=row.floor.thresholdProven?'BOUNDS_MET_POINTER_PENDING':'LOWER_BOUND_'+row.floor.status.toUpperCase()+'_REGENERATE';
    if(row.floor.thresholdProven){row.qualification=qualifyNativeKeyFloor(level,route.drags,api);accepted={level,record:row};}
   }
  }
  if(route.status==='witness')fs.writeFileSync(path.join(out,`candidate-${seed}-${sha.slice(0,8)}.json`),JSON.stringify({level,row},null,2));
 }catch(e){row.status='INVALID';row.error=e.message;}
 records.push(row);fs.writeFileSync(path.join(out,`batch-${start}-progress.json`),JSON.stringify({activeRule:lock.activeVersion,source:'../source228-230/frame-776.png',projection:'No flip doors: v1.5/v1.4 spatial semantics identical; no fields removed.',records},null,2));
 console.log(JSON.stringify({seed,status:row.status,U:row.replay?.nonClearingDrags,route:row.route?.status,clears:row.route?.maxClearsSeen}));
 if(accepted)break;
}
fs.writeFileSync(path.join(out,`batch-${start}-report.json`),JSON.stringify({activeRule:lock.activeVersion,attempts:records.length,accepted:accepted??null,records},null,2));

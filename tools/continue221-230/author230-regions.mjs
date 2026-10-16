import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {build} from 'esbuild';
import {loadSpatialApi} from '../remake111to120-spatial-floor-v147.mjs';import {compile,search} from '../remake191-200/root200/domain.mjs';import {gridFloor,qualifyGrid} from './author230-bounded.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);const out=path.resolve('deliverables/continue221-230-20260930/author230-regions');fs.mkdirSync(out,{recursive:true});
const api=await loadSpatialApi(),built=await build({stdin:{resolveDir:process.cwd(),contents:`export {replayRevisedRoute} from './src/core/revisedLevelSearch';export {auditRevisedCandidate} from './src/core/revisedCandidateAudit';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),runtime=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),V2=rect(1,2),H2=rect(2,1),S=rect(1,1),SQ3=rect(3,3),V3=rect(1,3),W=7,H=9;
const gates=[['red','top',0,3,4],['yellow','top',4,3,4],['blue','bottom',0,3,4],['green','bottom',6,1,4],['orange','right',3,3,0]].map(([color,side,offset,size,frozen])=>({id:'l230-'+color,color,side,offset,size,...(frozen?{frozen}:{})}));
const ignore=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
function candidate(seed){let r=(seed*2654435761)>>>0;const random=()=>{r^=r<<13;r^=r>>>17;r^=r<<5;return(r>>>0)/4294967296;},occupied=Array(W*H).fill(false),placed=[{id:'l230-red-core',color:'red',shape:SQ3,x:0,y:0},{id:'l230-yellow-core',color:'yellow',shape:SQ3,x:4,y:0},{id:'l230-blue-core',color:'blue',shape:SQ3,x:0,y:6},{id:'l230-green-core',color:'green',shape:V3,x:6,y:6}],pieces=[...Array(14).fill(V2),...Array(5).fill(S)].map((shape,i)=>({id:'l230-b'+i,shape:shape===V2&&i%3===seed%3?H2:shape}));let budget=9000;
 for(const b of placed)for(const[dx,dy]of b.shape)occupied[(b.y+dy)*W+b.x+dx]=true;
 function fill(rem){if(--budget<0)return false;if(!rem.length)return true;const p=occupied.indexOf(false),x=p%W,y=Math.floor(p/W),order=rem.map(i=>({i,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.i);
  for(const i of order){const b={...pieces[i],x,y},cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(([xx,yy])=>xx>=W||yy>=H||occupied[yy*W+xx]))continue;cells.forEach(([xx,yy])=>occupied[yy*W+xx]=true);placed.push(b);if(fill(rem.filter(v=>v!==i)))return true;placed.pop();cells.forEach(([xx,yy])=>occupied[yy*W+xx]=false);}return false;
 }
 if(!fill(pieces.map((_,i)=>i)))return null;
 const touches=(a,b)=>a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1));
 const starter=placed.find(b=>!b.color&&b.x+Math.max(...b.shape.map(p=>p[0]))===6&&b.y>=3&&b.y+Math.max(...b.shape.map(p=>p[1]))<6);if(!starter)return null;const oranges=[starter],order=placed.filter(b=>!b.color&&b!==starter).map(b=>({b,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.b);
 for(const b of order){if(oranges.length===4)break;if(oranges.some(a=>touches(a,b)))continue;oranges.push(b);}if(oranges.length<4)return null;oranges.forEach(b=>b.color='orange');
 const rest=placed.filter(b=>!b.color),colors=['red','blue','yellow','green'],assigned=placed.filter(b=>b.color);
 for(const b of rest){const options=colors.filter(color=>!assigned.some(a=>a.color===color&&touches(a,b)));if(!options.length)return null;b.color=options[Math.floor(random()*options.length)];assigned.push(b);}
 // Source grid counts are preserved exactly, now in four useful connected
 // regions. Every grid is covered by its actual same-colour body at opening.
 const grids=placed.slice(0,4).map(b=>({id:'l230-grid-'+b.color,color:b.color,cells:b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy])}));
 return{id:230,name:'四色回廊',width:W,height:H,difficulty:'super',mechanismRules:'revised-2026-09-27-v1.5',timeSeconds:210,parMoves:21,reward:200,preservedMoveTarget:68,blocks:placed,gates,coloredGrids:grids,mechanismAdaptation:{userAuthorized:'221–230有限换色换形重生成',change:'源871秒23体33格、红黄蓝各9绿3彩格、4冰4、4橙体含3壳。保23体与4橙载体，硬冲突去3壳，4色格9/9/9/3、四冰初4保留；重排为7×9全63格满铺，3SQ3/1V3/14多格/5S全q0，新增30占格来自源体换形扩充。非其他关克隆。'}};
}
const start=Number(process.argv[2]??1),count=Math.min(1000,Number(process.argv[3]??300)),records=[];let accepted;const end=Date.now()+180000;
for(let seed=start;seed<start+count&&Date.now()<end;seed++){
 const level=candidate(seed);if(!level){records.push({seed,status:'CONSTRUCTION_REJECTED'});continue;}const row={seed,sha256:digest(level),status:'STATIC_PENDING'};
 try{api.validateLevel(level);assert.deepEqual(runtime.auditRevisedCandidate(level).issues.filter(i=>!ignore.has(i.code)),[]);assert(auditOpeningCoverage(new api.PuzzleModel(level).snapshot()).passed);assert(auditGateSpanLimits(level).passed);assert(level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
  row.route=search(compile(level,api),{floor:31,maxMilliseconds:1400,maxStates:40000,pointer:true});row.status='ROUTE_'+row.route.status.toUpperCase();
  if(row.route.status==='witness'){row.replay=runtime.replayRevisedRoute(level,row.route.drags);assert(row.replay.valid&&row.replay.complete);const U=row.replay.nonClearingDrags;
   if(U<21)row.status='TOO_EASY_REGENERATE';else if(U>30)row.status='UPPER_BOUND_NOT_MET_REGENERATE';else{row.floor=gridFloor(level,{floor:21,maxMilliseconds:1400,maxStates:400000});row.status=row.floor.thresholdProven?'BOUNDS_MET_POINTER_PENDING':'LOWER_BOUND_'+row.floor.status.toUpperCase()+'_REGENERATE';if(row.floor.thresholdProven){row.qualification=qualifyGrid(level,row.route.drags);accepted={level,record:row};}}
   fs.writeFileSync(path.join(out,`candidate-${seed}-${row.sha256.slice(0,8)}.json`),JSON.stringify({level,row},null,2));
  }
 }catch(e){row.status='INVALID';row.error=e.message;}
 records.push(row);if(row.route?.status==='witness'||seed%25===0)console.log(JSON.stringify({seed,status:row.status,U:row.replay?.nonClearingDrags}));fs.writeFileSync(path.join(out,`batch-${start}-progress.json`),JSON.stringify({activeRule:lock.activeVersion,records},null,2));if(accepted)break;
}
fs.writeFileSync(path.join(out,`batch-${start}-report.json`),JSON.stringify({activeRule:lock.activeVersion,accepted:accepted??null,records},null,2));console.log(JSON.stringify({attempts:records.length,accepted:Boolean(accepted)}));

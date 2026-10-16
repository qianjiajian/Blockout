import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {build} from 'esbuild';
import {loadSpatialApi} from '../remake111to120-spatial-floor-v147.mjs';import {compile,search,each,normalize} from '../remake191-200/root200/domain.mjs';
import {keyPayload} from '../remake191-200/author194-196/key-floor.mjs';import {runNativePayload} from './native-key-floor.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);const out=path.resolve('deliverables/continue221-230-20260930/author230');fs.mkdirSync(out,{recursive:true});
const api=await loadSpatialApi(),built=await build({stdin:{resolveDir:process.cwd(),contents:`export {replayRevisedRoute} from './src/core/revisedLevelSearch';export {auditRevisedCandidate} from './src/core/revisedCandidateAudit';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),runtime=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),H2=rect(2,1),V2=rect(1,2),SQ=rect(2,2),V3=rect(1,3),W=5,H=10;
const shapes=[...Array(18).fill(V2),V3,V3,H2,H2,SQ];
const gates=[['red','top',0,2,4],['green','bottom',2,3,4],['blue','right',6,3,4],['yellow','left',4,3,4],['orange','right',0,3,0]].map(([color,side,offset,size,frozen])=>({id:'l230-'+color,color,side,offset,size,...(frozen?{frozen}:{})}));
const ignore=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
export function gridPayload(level,options){const projected=structuredClone(level);delete projected.coloredGrids;const {p}=keyPayload(projected,options);
 for(let i=0;i<level.blocks.length;i++){const b=level.blocks[i],forbidden=new Set(level.coloredGrids.filter(g=>g.color!==b.color).flatMap(g=>g.cells.map(([x,y])=>y*level.width+x))),body=p.blocks[i];
  body.poses=body.poses.map((pose,j)=>pose&&!b.shape.some(([dx,dy])=>forbidden.has(j+dy*level.width+dx))?pose:null);
  for(const pose of body.poses)if(pose)pose.neighbors=pose.neighbors.filter(j=>body.poses[j]);assert(body.poses[p.initial[i]]);
 }return p;
}
export function gridFloor(level,options){const p=gridPayload(level,options);return {...runNativePayload(p),levelSha256:digest(level),projection:'All colored grids retained as exact forbidden-pose masks for each color. All4 gate ice4 retained. All inventory present; only absent shell fields from the explicit source adaptation. Optional contact and full-body monotone normalization. No flips, keys, queues, time, axis or hidden bodies.',qualificationRequired:true};}
export function qualifyGrid(level,drags){const c=compile(level,api);c.pointer=false;const p=gridPayload(level,{floor:21,maxMilliseconds:3000,maxStates:100000}),states=[c.initial],seen=new Set([JSON.stringify([...c.initial])]);
 for(let a=0;a<states.length&&states.length<64;a++)each(c,states[a],(i,v)=>{const s=states[a].slice();s[i]=v;const k=JSON.stringify([...s]);if(!seen.has(k)){seen.add(k);states.push(s);}if(states.length>=64)return false;});
 const model=new api.PuzzleModel(level);model.startCountdown();for(const d of drags){model.beginAction();for(const[x,y]of d.path)assert(model.moveBlockStep(d.blockId,x,y));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());const sn=model.snapshot();states.push(Uint8Array.from(level.blocks.map(b=>{const n=sn.blocks.find(a=>a.id===b.id);return n?n.y*level.width+n.x:255;})));}
 const canonical=s=>{const a=[...s];for(const g of p.groups){const vals=g.map(i=>a[i]).sort((a,b)=>a-b);g.forEach((i,j)=>a[i]=vals[j]);}return a;},encode=s=>{const b=Buffer.alloc(s.length*2);s.forEach((v,i)=>b.writeUInt16LE(v===255?511:v,2*i));return b.toString('base64');};
 const n=runNativePayload({...p,successorsOnly:true,states:states.map(s=>[...s].map(v=>v===255?511:v))});let transitions=0;
 states.forEach((s,j)=>{const expected=new Set();each(c,s,(i,v,cost)=>{const t=s.slice();t[i]=v;expected.add(cost+':'+encode(canonical(normalize(c,t).state)));});assert.deepEqual([...expected].sort(),[...n.rows[j].successors].sort());transitions+=expected.size;});return{passed:true,states:states.length,transitions,native:n,levelSha256:digest(level)};
}
function candidate(seed){let r=(seed*2654435761)>>>0;const random=()=>{r^=r<<13;r^=r>>>17;r^=r<<5;return(r>>>0)/4294967296;},occupied=Array(W*H).fill(false),placed=[],pieces=shapes.map((shape,i)=>({id:'l230-b'+i,shape}));let budget=7000;
 function fill(rem){if(--budget<0)return false;if(!rem.length)return true;const p=occupied.indexOf(false),x=p%W,y=Math.floor(p/W),order=rem.map(i=>({i,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.i);
  for(const i of order){const b={...pieces[i],x,y},cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(([xx,yy])=>xx>=W||yy>=H||occupied[yy*W+xx]))continue;cells.forEach(([xx,yy])=>occupied[yy*W+xx]=true);placed.push(b);if(fill(rem.filter(v=>v!==i)))return true;placed.pop();cells.forEach(([xx,yy])=>occupied[yy*W+xx]=false);}return false;
 }
 if(!fill(pieces.map((_,i)=>i)))return null;
 const touches=(a,b)=>a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1));
 const starter=placed.find(b=>b.x===4&&b.y<=1&&b.shape===V2);if(!starter)return null;const oranges=[starter];
 const order=placed.filter(b=>b!==starter&&b.shape===V2).map(b=>({b,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.b);
 for(const b of order){if(oranges.length===4)break;if(oranges.some(a=>touches(a,b)))continue;oranges.push(b);}if(oranges.length<4)return null;oranges.forEach(b=>b.color='orange');
 const rest=placed.filter(b=>!b.color),colors=['red','blue','yellow','green'],assigned=[...oranges],totals={red:0,blue:0,yellow:0,green:0};
 for(const b of rest){const options=colors.filter(color=>!assigned.some(a=>a.color===color&&touches(a,b))).map(color=>({color,score:(totals[color]/(color==='green'?5:12))+random()*.7})).sort((a,b)=>a.score-b.score);if(!options.length)return null;b.color=options[0].color;totals[b.color]+=b.shape.length;assigned.push(b);}
 if(totals.red<9||totals.blue<9||totals.yellow<9||totals.green<3)return null;
 const grids=colors.map(color=>{const cells=placed.filter(b=>b.color===color).flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]));cells.sort((a,b)=>(a[0]+random()*.8)-(b[0]+random()*.8));return{id:'l230-grid-'+color,color,cells:cells.slice(0,color==='green'?3:9)};});
 return {id:230,name:'四色窄廊',width:W,height:H,difficulty:'super',mechanismRules:'revised-2026-09-27-v1.5',timeSeconds:210,parMoves:21,reward:200,preservedMoveTarget:68,blocks:placed,gates, coloredGrids:grids,mechanismAdaptation:{userAuthorized:'221–230有限换色换形重生成',change:'源871秒23体33占格，红黄蓝各9格/绿3格彩格，四冰门4，四橙体含3壳。按本游戏彩格壳互斥移除3壳而保4橙载体，不改冰4。23体换原向V2/V3/H2/SQ2并重配形色，5×10原创满铺50格；4彩格9/9/9/3全保，源23→候选23体，无隐藏库存删减。'}};
}
if(process.argv[1]?.endsWith('author230-bounded.mjs')){
 const start=Number(process.argv[2]??1),count=Math.min(1000,Number(process.argv[3]??300)),records=[];let accepted;const end=Date.now()+180000;
 for(let seed=start;seed<start+count&&Date.now()<end;seed++){
  const level=candidate(seed);if(!level){records.push({seed,status:'CONSTRUCTION_REJECTED'});continue;}const row={seed,sha256:digest(level),status:'STATIC_PENDING'};
  try{api.validateLevel(level);assert.deepEqual(runtime.auditRevisedCandidate(level).issues.filter(i=>!ignore.has(i.code)),[]);assert(auditOpeningCoverage(new api.PuzzleModel(level).snapshot()).passed);assert(auditGateSpanLimits(level).passed);assert(level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
   row.route=search(compile(level,api),{floor:31,maxMilliseconds:1400,maxStates:40000,pointer:true});row.status='ROUTE_'+row.route.status.toUpperCase();
   if(row.route.status==='witness'){row.replay=runtime.replayRevisedRoute(level,row.route.drags);assert(row.replay.valid&&row.replay.complete);const U=row.replay.nonClearingDrags;
    if(U<21)row.status='TOO_EASY_REGENERATE';else if(U>30)row.status='UPPER_BOUND_NOT_MET_REGENERATE';else {row.floor=gridFloor(level,{floor:21,maxMilliseconds:1400,maxStates:400000});row.status=row.floor.thresholdProven?'BOUNDS_MET_POINTER_PENDING':'LOWER_BOUND_'+row.floor.status.toUpperCase()+'_REGENERATE';if(row.floor.thresholdProven){row.qualification=qualifyGrid(level,row.route.drags);accepted={level,record:row};}}
    fs.writeFileSync(path.join(out,`candidate-${seed}-${row.sha256.slice(0,8)}.json`),JSON.stringify({level,row},null,2));
   }
  }catch(e){row.status='INVALID';row.error=e.message;}
  records.push(row);if(row.route?.status==='witness'||seed%50===0)console.log(JSON.stringify({seed,status:row.status,U:row.replay?.nonClearingDrags}));fs.writeFileSync(path.join(out,`batch-${start}-progress.json`),JSON.stringify({activeRule:lock.activeVersion,records},null,2));if(accepted)break;
 }
 fs.writeFileSync(path.join(out,`batch-${start}-report.json`),JSON.stringify({activeRule:lock.activeVersion,accepted:accepted??null,records},null,2));console.log(JSON.stringify({attempts:records.length,accepted:Boolean(accepted)}));
}

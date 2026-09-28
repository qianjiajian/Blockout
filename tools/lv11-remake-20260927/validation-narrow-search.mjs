import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {loadApi} from '../native-block-repair-v143.mjs';
import {compileLevel} from '../remake21to30-mask-floor.mjs';
import {checkSymmetryFloor,equivalentBlockGroups} from '../remake21to30-symmetry-floor-v139.mjs';
import {compileNative41,NATIVE_SOURCE} from '../remake41-optional-native-v146.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';

// Finite independent construction diagnostic, never a production write or
// acceptance bypass. Every attempt preserves all source shape/color/ice pairs.
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.79.0');
const {api,inputs}=await loadApi(),sourceFile='deliverables/lv11-remake-20260927/source-ledger.json';
const source=JSON.parse(fs.readFileSync(sourceFile)),catalog=source.blocks.filter(b=>b.shape.length===3);
assert.equal(catalog.length,10);
const masks=[[3,3,5,5,5,5,5,5,3,3],[3,5,5,5,3,3,5,5,5,3]];
const seedStart=Number(process.argv[2]??271151),limit=Number(process.argv[3]??500),ms=500;assert(limit>0&&limit<=500);
let seed=seedStart;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(rand()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const root=`deliverables/lv11-remake-20260927/validation-narrow-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const binary=compileNative41(path.join(root,'native'));
const bindings=Object.fromEntries([...inputs,sourceFile,'tools/lv11-remake-20260927/validation-narrow-search.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs',NATIVE_SOURCE,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.79.0.md'].map(p=>[p,digest(fs.readFileSync(p))]));
const report={generatedAt:new Date().toISOString(),status:'running',ruleVersion:lock.activeVersion,scope:'Bounded 5x10 H3-row diagnostic only',seedStart,limit,perCandidateMilliseconds:ms,masks,bindings,binary,attempts:[],rejected:{tiling:0,duplicate:0},solved:0,best:null,hardCandidate:null};
function construct(maskIndex){
 const lens=masks[maskIndex],playable=lens.flatMap((n,y)=>Array.from({length:n},(_,x)=>[x+(5-n)/2,y]));
 for(let trial=0;trial<300;trial++){
  const order=shuffle(catalog),bars=order.map((b,y)=>({id:b.id,color:b.color,shape:b.shape,x:lens[y]===3?1:pick([0,1,1,1,2]),y,...(b.frozen?{frozen:b.frozen}:{})}));
  if(bars.some((b,y)=>y&&b.color===bars[y-1].color))continue;
  const exits=bars.filter(b=>b.color==='green'&&!b.frozen&&lens[b.y]===5&&(b.x===0||b.x===2));if(!exits.length)continue;
  const own=new Map(bars.flatMap(b=>b.shape.map(([dx,dy])=>[`${b.x+dx},${b.y+dy}`,b]))),spaces=playable.filter(p=>!own.has(p.join(','))),single=[];
  const counts={cyan:6,purple:6};
  function fill(i){
   if(i===spaces.length)return true;const[x,y]=spaces[i];
   for(const color of shuffle(['cyan','purple'])){
    if(!counts[color]||[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>own.get(p.join(','))?.color===color))continue;
    const b={id:`narrow-s-${i}`,x,y,color,shape:[[0,0]]};single[i]=b;own.set(`${x},${y}`,b);counts[color]--;if(fill(i+1))return true;counts[color]++;own.delete(`${x},${y}`);
   }
   return false;
  }
  if(!fill(0))continue;
  const green=pick(exits),gates=[{id:'narrow-gate-green',color:'green',side:green.x===0?'left':'right',offset:green.y,size:1}];
  const mouths=lens.flatMap((n,y)=>n===5?['left','right'].map(side=>({side,offset:y,size:1})):[]);
  let failed=false;
  for(const[color,ice]of [['cyan',0],['pink',6],['purple',7],['red',13]]){
   let choices=mouths.filter(g=>!gates.some(h=>g.side===h.side&&g.offset===h.offset));
   if(color==='cyan')choices=choices.filter(g=>own.get(`${g.side==='left'?0:4},${g.offset}`)?.color==='cyan');
   if(!choices.length){failed=true;break;}
   gates.push({...pick(choices),id:'narrow-gate-'+color,color,...(ice?{frozen:ice}:{})});
  }
  if(failed)continue;
  const level={id:11,name:'冻域排序',difficulty:'hard',width:5,height:10,playable,blocked:[],seams:[],timeSeconds:120,reward:40,parMoves:36,preservedMoveTarget:36,mechanismRules:'revised-2026-09-23-v1.4',blocks:[...bars,...single],gates};
  api.validateLevel(level);compileLevel(level);
  return level;
 }
 return null;
}
function native(level,index){
 const c=compileLevel(level),payload={width:c.W,height:c.H,initial:[...c.initial],blocks:c.blocks.map(b=>({ice:b.ice,revealAt:b.revealAt,spawn:b.initial,poses:b.poses.map(p=>p?{lo:p.mask[0],hi:p.mask[1],top:p.mask[2],exit:p.exits[0]?(p.exits[0].frozen??0):-1,neighbors:p.neighbors}:null)})),covers:[],generators:[],groups:equivalentBlockGroups(c),floor:21,maxStates:200000,maxMilliseconds:ms,normalize:true,symmetry:true,collect:false};
 const input=path.resolve(root,`input-${index}.json`),output=path.resolve(root,`native-${index}.json`);fs.writeFileSync(input,JSON.stringify(payload),{flag:'wx'});
 execFileSync(binary.exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:ms+10000});return{...JSON.parse(fs.readFileSync(output)),input,output};
}
const save=()=>fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));
try{
 const seen=new Set();let trials=0;
 while(report.attempts.length<limit&&trials++<limit*30){
  const maskIndex=trials%2,level=construct(maskIndex);if(!level){report.rejected.tiling++;continue;}const sha=digest(level);if(seen.has(sha)){report.rejected.duplicate++;continue;}seen.add(sha);
  const index=report.attempts.length,result=native(level,index),cost=result.relaxedNonClearingDrags??null;
  const file=path.join(root,`attempt-${index}.json`);fs.writeFileSync(file,JSON.stringify({level,native:result,screeningOnly:true,levelSha256:sha},null,2),{flag:'wx'});
  const row={index,maskIndex,levelSha256:sha,file,status:result.status,cost,states:result.discoveredStates,ms:result.milliseconds};report.attempts.push(row);if(cost!==null){report.solved++;if(!report.best||cost>report.best.cost)report.best=row;}
  if(cost!==null&&cost>=16&&cost<=20){
   const witness=checkSymmetryFloor(level,{floor:21,maxStates:500000,maxMilliseconds:10000});
   if(witness.relaxedRoute){
    const drags=witness.relaxedRoute,replay=api.replayRevisedRoute(level,drags),nonclear=drags.filter(d=>!d.exitSide),multi=nonclear.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;
    const candidate=path.join(root,`witness-${index}.json`);fs.writeFileSync(candidate,JSON.stringify({level,drags,witness,replay,multi,single:nonclear.length-multi,difficultyCertified:false},null,2),{flag:'wx'});
    if(replay.valid&&replay.complete){report.hardCandidate={file:candidate,cost:replay.nonClearingDrags,multi,single:nonclear.length-multi};break;}
   }
  }
  if(index%20===0){save();console.log(JSON.stringify({root,attempts:report.attempts.length,solved:report.solved,best:report.best?.cost??null,status:row.status}));}
 }
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status=report.hardCandidate?'FINITE_SEARCH_WITNESS_FOUND_NOT_CERTIFIED':'FINITE_SEARCH_STOPPED_NO_HARD_WITNESS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
save();console.log(JSON.stringify({root,status:report.status,attempts:report.attempts.length,solved:report.solved,best:report.best,hardCandidate:report.hardCandidate,error:report.error}));

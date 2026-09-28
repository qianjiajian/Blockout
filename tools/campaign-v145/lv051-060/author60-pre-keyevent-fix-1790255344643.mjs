import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
import {search} from './campaign-axis-key-search-v146.mjs';
import {checkAxisKeyFloor} from './campaign-axis-key-floor-v146.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot} from './campaign-axis-key-graph-v146.mjs';

export const OUT='deliverables/remake31-200-v145-20260924/batches/lv051-060/root60';
export const AUTH='deliverables/remake31-200-v145-20260924/batches/lv051-060/USER-UPDATE-58-60.md';
const BASE='deliverables/remake31-200-v145-20260924/baseline.json';
const read=p=>JSON.parse(fs.readFileSync(p));
export const write=(prefix,data)=>{fs.mkdirSync(OUT,{recursive:true});const file=`${OUT}/${prefix}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
export function rngFor(seed){let v=seed>>>0;return()=>{v+=0x6D2B79F5;let t=v;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const shuffle=(a,rng)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export const apply=(model,d)=>{model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());};

export function build(layout,rng,baseline){
 const level=structuredClone(baseline.level);for(const k of ['shutters','generators','flipDoors','coloredGrids','hintPlan','construction','designTargets'])delete level[k];
 level.difficulty='easy';level.preservedMoveTarget=baseline.starTargets.moveTarget;level.gates=[];level.blocks=[];
 const grid=layout.grid,axis=layout.axisByColor??Object.fromEntries(layout.gates.map(g=>[g.color,['top','bottom'].includes(g.side)?'vertical':'horizontal']));
 assert.equal(grid.length,7);assert(grid.every(r=>r.length===5));
 for(let y=0;y<7;y++)for(let x=0;x<5;x++){const color=grid[y][x];assert(axis[color]);level.blocks.push({id:`v147-60-cell-${x}-${y}`,x,y,color,shape:[[0,0]],movementAxis:axis[color]});}
 const rail=new Set();
 for(const color of shuffle([...new Set(grid.flat())],rng)){
  const vertical=axis[color]==='vertical',positions=level.blocks.filter(b=>b.color===color).map(b=>vertical?b.x:b.y),lo=Math.min(...positions),hi=Math.max(...positions),size=hi-lo+1;assert(size<=3);
  const sides=shuffle(vertical?['top','bottom']:['left','right'],rng),side=sides.find(s=>positions.every(p=>!rail.has(s+':'+p))&&Array.from({length:size},(_,i)=>lo+i).every(p=>!rail.has(s+':'+p)));if(!side)return null;
  for(let p=lo;p<=hi;p++)rail.add(side+':'+p);level.gates.push({id:`v147-60-gate-${color}`,color,side,offset:lo,size});
 }
 const key=level.blocks[Math.floor(rng()*35)],locked=level.blocks[Math.floor(rng()*35)];if(key===locked||key.color===locked.color)return null;
 key.keyId='intro-key';locked.lockedBy='intro-key';locked.lockCount=1;
 assert.equal(level.blocks.filter(b=>b.movementAxis==='vertical').length,18);assert.equal(level.blocks.filter(b=>b.movementAxis==='horizontal').length,17);
 return level;
}

export function reviewParking(level,drags,api){
 const measurement=measureRoute(level,drags,api),parking=measurement.steps.filter(s=>!s.clears),effects=[];
 for(const step of parking){const without=api.replayRevisedRoute(level,drags.filter((_,i)=>i!==step.step-1));assert(!without.valid||!without.complete,'Redundant parking in witness');effects.push({step:step.step,blockId:step.blockId,from:step.start,to:step.end,omissionFails:true,error:without.error??'incomplete'});}
 // Source has ONLY single cells. Do not invent multi-cell inventory to satisfy
 // the historical 21-30 author's explicitly internal multi-cell-majority guard.
 const c=compileLevel(level),m=new api.PuzzleModel(level),cases=[];m.startCountdown();
 for(let step=0;step<drags.length&&cases.length<2;step++){
  const prefix=drags.slice(0,step),correct=drags[step];
  forEachGesture(c,stateFromSnapshot(c,m.snapshot()),(i,v,cost,get)=>{if(cost!==1)return;const wrong=get(),b=m.getBlock(wrong.blockId);if(!b||b.id===correct.blockId||cases.some(c=>c.blockId===b.id))return;
   if(!api.replayRevisedRoute(level,[...prefix,wrong]).valid||api.replayRevisedRoute(level,[...prefix,wrong,correct]).valid)return;
   const recovery={blockId:b.id,path:[[b.x,b.y],...wrong.path.slice(0,-1)].reverse()},full=[...prefix,wrong,recovery,...drags.slice(step)],result=api.replayRevisedRoute(level,full);if(!result.valid||!result.complete)return;
   const before=api.replayRevisedRoute(level,prefix),back=api.replayRevisedRoute(level,[...prefix,wrong,recovery]);if(before.finalStateKey!==back.finalStateKey)return;
   cases.push({atStep:step+1,blockId:b.id,area:1,legalWrongParking:wrong,blockedNextAction:correct,recoveryDrag:recovery,fullRecoveredRoute:full,meaning:'源全单格：沿箭头误停堵住已核实通路，原路恢复后完整通关；不冒称多格案例。'});return false;
  });apply(m,correct);
 }
 return {measurement,effects,decisionCases:cases,multiCellReview:{applicable:false,reason:'Verified competitor opening consists of35 single-cell axis blocks; all35 bodies and axes retained. Historical multi-cell-majority assertion is an internal21-30 selection guard, not a frozen numeric rule.'}};
}

export function reviewKey(level,drags,api){
 const key=level.blocks.find(b=>b.keyId),locked=level.blocks.find(b=>b.lockedBy),m=new api.PuzzleModel(level),events=[];m.startCountdown();assert(!m.isBlockActive(m.getBlock(locked.id)));let local;
 for(let step=0;step<drags.length;step++){
  const prefix=drags.slice(0,step),before=m.snapshot(),body=m.getBlock(locked.id);
  if(body?.lockedBy&&!local){const free=structuredClone(level);delete free.blocks.find(b=>b.id===locked.id).lockedBy;delete free.blocks.find(b=>b.id===locked.id).lockCount;const c=compileLevel(free),r=api.replayRevisedRoute(free,prefix);if(r.valid){const fm=new api.PuzzleModel(free);fm.startCountdown();for(const d of prefix)apply(fm,d);forEachGesture(c,stateFromSnapshot(c,fm.snapshot()),(i,v,cost,get)=>{if(c.blocks[i].id!==locked.id)return;const action=get();if(!api.replayRevisedRoute(level,[...prefix,action]).valid&&api.replayRevisedRoute(free,[...prefix,action]).valid){local={beforeDrag:step+1,prefix,blockedAction:action,onlyRemovedFields:['lockedBy','lockCount'],lockedBlock:locked.id,keyBlock:key.id};return false;}});}}
  apply(m,drags[step]);const after=m.snapshot(),a=m.getBlock(locked.id);
  if(body?.lockedBy&&!a?.lockedBy){assert.equal(drags[step].blockId,key.id);assert(!m.getBlock(key.id));assert(a&&m.isBlockActive(a));events.push({step:step+1,keyId:key.id,lockedId:locked.id,lockBefore:body.lockCount??1,lockAfter:0,keyBodyRemoved:true,activeAfter:true});}
 }
 assert.equal(events.length,1);assert(local,'A physically possible action must be blocked by the actual lock before its key clears');
 return {keyId:key.id,lockedId:locked.id,group:key.keyId,initialCount:1,events,localCase:local,explanation:'一个同组钥匙本体离场才解开一个锁1；标识同组，基础块颜色不同，轴向限制解锁后仍保持。'};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');const {api,inputs}=await loadApi(),baseline=read(BASE).levels[59],mode=process.argv[2]??'generate',file=process.argv[3];
 if(mode==='generate'){
  const specs=read(file),layouts=specs.layouts??[specs],seed=Number(process.env.SEED??1476001),rng=rngFor(seed),deadline=Date.now()+Number(process.env.SECONDS??120)*1000,failures={};let attempts=0,valid=0,solved=0;
  const input=write('inputs60',{seed,spec:file,specSha256:digest(fs.readFileSync(file)),authorization:{file:AUTH,sha256:digest(fs.readFileSync(AUTH))},baselineSha256:digest(fs.readFileSync(BASE)),inputs:Object.fromEntries([...inputs,process.argv[1],'tools/campaign-v145/lv051-060/campaign-axis-key-search-v146.mjs','tools/campaign-v145/lv051-060/campaign-axis-key-graph-v146.mjs','tools/campaign-v145/lv051-060/campaign-axis-key-floor-v146.mjs'].map(p=>[p,digest(fs.readFileSync(p))]))});
  while(Date.now()<deadline){attempts++;const index=Math.floor(rng()*layouts.length),level=build(layouts[index],rng,baseline);if(!level)continue;let audit;try{audit=auditSpatial(level,api);}catch(e){failures[e.message]=(failures[e.message]??0)+1;continue;}if(!audit.passed){failures.audit=(failures.audit??0)+1;continue;}valid++;
   const result=search(level,{floor:11,maxStates:60000,maxMilliseconds:Number(process.env.SEARCH_MS??300),weight:1000});if(result.status!=='witness'){failures[result.status]=(failures[result.status]??0)+1;continue;}const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete||replay.nonClearingDrags<5){failures.lowOrInvalid=(failures.lowOrInvalid??0)+1;continue;}solved++;
   const proof=checkAxisKeyFloor(level,{floor:5,maxStates:200000,maxMilliseconds:Number(process.env.PROOF_MS??5000)});if(!proof.thresholdProven){failures[proof.status]=(failures[proof.status]??0)+1;continue;}
   let drags=result.drags;const optimal=checkAxisKeyFloor(level,{floor:replay.nonClearingDrags+1,maxStates:300000,maxMilliseconds:5000});if(optimal.relaxedRoute){const rr=api.replayRevisedRoute(level,optimal.relaxedRoute);if(rr.valid&&rr.complete&&rr.nonClearingDrags>=5)drags=optimal.relaxedRoute;}
   const quality=reviewParking(level,drags,api);if(quality.measurement.repeatedRepositionedBlocks.length||!quality.decisionCases.length){failures.quality=(failures.quality??0)+1;continue;}let teaching;try{teaching=reviewKey(level,drags,api);}catch(e){failures.teaching=(failures.teaching??0)+1;continue;}
   const output=write('draft60',{ruleVersion:lock.activeVersion,seed,attempts,layoutIndex:index,input,spec:file,specSha256:digest(fs.readFileSync(file)),level,drags,replay:api.replayRevisedRoute(level,drags),proof,optimal,quality,decisionCases:quality.decisionCases,teaching,formalAdopted:false});console.log(JSON.stringify({output,U:quality.measurement.nonClearingDrags,L:5,attempts,valid,solved,proofStates:proof.discoveredStates}));break;
  }console.log(JSON.stringify({attempts,valid,solved,failures,input}));
 }else throw Error('Usage: generate LAYOUTS.json');
}

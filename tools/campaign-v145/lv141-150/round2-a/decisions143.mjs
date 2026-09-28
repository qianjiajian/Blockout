import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,api} from './common.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {compileSpatial,replayDomain,each} from './witness-greedy.mjs';

const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-a',input=process.argv[2]??'deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-a/enriched143-1790477808753.json',data=JSON.parse(fs.readFileSync(input)),level=data.level,drags=data.drags,lock=verifyRulesLock();assert(lock.ok);
const levelSha256=digest(level),routeSha256=digest(drags);assert.equal(levelSha256,data.levelSha256);const compiled=compileSpatial(level,api),cases=[],usedWrong=new Set();
function perform(m,d){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}
function replayModel(route){const m=new api.PuzzleModel(level);m.startCountdown();for(const d of route)perform(m,d);return m;}
function clockReplay(route){const m=new api.PuzzleModel(level);m.startCountdown();let seconds=0;const tick=t=>{m.tick(t);seconds+=t;assert(!m.snapshot().failed);};for(const d of route){tick(.75);tick(.08);m.beginAction();for(const p of d.path){tick(.12);assert(m.moveBlockStep(d.blockId,...p));}if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());tick(.08);}return{valid:true,complete:m.snapshot().complete,seconds,levelTimeSeconds:level.timeSeconds,naturalClockValidated:false,pointerValidated:false};}
const m=replayModel([]);
for(let i=0;i<drags.length&&cases.length<2;i++){
 const correct=drags[i],before=m.snapshot(),prefix=drags.slice(0,i),prefixReplay=api.replayRevisedRoute(level,prefix);
 if(correct.path.length){const options=[];each(compiled,replayDomain(compiled,prefix,api).state,(s,cost,get)=>{const d=get(),b=level.blocks.find(b=>b.id===d.blockId);if(cost===1&&b.shape.length>1&&b.id!==correct.blockId&&!usedWrong.has(b.id))options.push(d);});
  for(const wrong of options){const b=before.blocks.find(b=>b.id===wrong.blockId),end=wrong.path.at(-1),correctEnd=correct.path.at(-1);if(JSON.stringify(end)===JSON.stringify([b.x,b.y])||JSON.stringify(end)===JSON.stringify(correctEnd))continue;
   const legal=api.replayRevisedRoute(level,[...prefix,wrong]);if(!legal.valid||legal.clearEvents!==prefixReplay.clearEvents)continue;
   // Reject every no-op/state-change masquerading as a parking consequence.
   const originalState=JSON.parse(prefixReplay.finalStateKey),wrongState=JSON.parse(legal.finalStateKey),parked=wrongState.blocks.find(x=>x.id===b.id);parked.x=b.x;parked.y=b.y;assert.deepEqual(wrongState,originalState);
   const fork=replayModel([...prefix,wrong]),moving=fork.getBlock(correct.blockId);if(!moving)continue;const origin=[moving.x,moving.y];fork.beginAction();let collision;
   for(let unit=0;unit<correct.path.length;unit++){const to=correct.path[unit],active=fork.getBlock(correct.blockId),from=[active.x,active.y];assert.equal(Math.abs(to[0]-from[0])+Math.abs(to[1]-from[1]),1);const ok=fork.moveBlockStep(correct.blockId,...to);if(!ok){const wb=fork.getBlock(wrong.blockId),wrongCells=wb.shape.map(([x,y])=>[wb.x+x,wb.y+y]),occupied=new Set(wrongCells.map(p=>p.join(','))),targetCells=active.shape.map(([x,y])=>[to[0]+x,to[1]+y]),overlap=targetCells.filter(p=>occupied.has(p.join(',')));if(overlap.length)collision={unitIndex:unit,from,to,delta:[to[0]-from[0],to[1]-from[1]],wrongBlockId:wrong.blockId,wrongBlockAnchor:[wb.x,wb.y],wrongBlockCells:wrongCells,movingBlockId:correct.blockId,movingTargetCells:targetCells,overlapCells:overlap,moveBlockStepReturned:false};break;}}
   if(!collision)continue;const clean=replayModel(prefix);clean.beginAction();for(const to of correct.path.slice(0,collision.unitIndex+1))assert(clean.moveBlockStep(correct.blockId,...to));
   const blocked=api.replayRevisedRoute(level,[...prefix,wrong,correct]);if(blocked.valid)continue;
   const recovery={blockId:b.id,path:[...wrong.path.slice(0,-1).reverse(),[b.x,b.y]]},restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]);if(!restored.valid||restored.finalStateKey!==prefixReplay.finalStateKey)continue;
   const fullRecoveredRoute=[...prefix,wrong,recovery,...drags.slice(i)],full=api.replayRevisedRoute(level,fullRecoveredRoute);if(!full.valid||!full.complete)continue;let timed;try{timed=clockReplay(fullRecoveredRoute);}catch{continue;}if(!timed.complete)continue;
   cases.push({atStep:i+1,beforeDrag:i+1,blockId:b.id,area:b.shape.length,wrongStart:[b.x,b.y],wrongEnd:end,correctMovingBlockId:correct.blockId,correctStart:origin,correctEnd,correctDrag:correct,legalWrongParking:wrong,blockedNextAction:correct,blockedReason:blocked.error,physicalCollision:collision,originalUnitAllowed:true,differentBodies:true,wrongEndDiffersFromStartAndCorrectEnd:true,recoveryDrag:recovery,restoresExactSpatialState:true,fullRecoveredRoute,fullRecoveredReplay:{valid:full.valid,complete:full.complete,nonClearingDrags:full.nonClearingDrags,effectiveDrags:full.effectiveDrags},positiveTime:timed,provesGlobalDeadEnd:false,provesOptimalPenalty:false});usedWrong.add(b.id);break;
  }
 }
 perform(m,correct);
}
assert.equal(cases.length,2,'Two actual different-body occupancy obstructions required');
const report={passed:true,ruleVersion:lock.activeVersion,input,inputSha256:digest(fs.readFileSync(input)),levelSha256,routeSha256,decisionCases:cases,method:'Independent strict physical-collision evidence. Every wrong parking moves a distinct multi-cell body to a new anchor different from the planned moving body endpoint. A one-cell step of that other body is legal at the same route prefix and illegal after parking, with explicit occupied-cell intersection. Restoring the parked body recovers the exact original spatial state and the entire original suffix completes with positive time. No no-op rejection counts as obstruction.',humanBlindTested:false,pointerValidated:false,naturalClockValidated:false};
const file=`${OUT}/decisions143-genuine-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:true,cases:cases.map(c=>({step:c.atStep,wrong:c.blockId,start:c.wrongStart,end:c.wrongEnd,blocked:c.correctMovingBlockId,from:c.physicalCollision.from,to:c.physicalCollision.to,overlap:c.physicalCollision.overlapCells,seconds:c.positiveTime.seconds}))}));



import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,save,fileHash} from './common.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {compile,each} from '../../lv051-060/campaign-generator-axis-search-v146.mjs';
import {stateFromSnapshot} from '../../lv051-060/immediate-generator-floor56-v146.mjs';

// All qualification, collision and recovery replay uses the original level,
// including live bomb clocks and the full generator queue. Clock erasure below
// is confined to enumerating candidate parking positions, never validation.
function create(level){const m=new api.PuzzleModel(level);m.startCountdown();return {m,seconds:0,clears:0,moves:0,parking:0};}
function tick(r,t){r.m.tick(t);r.seconds+=t;assert(!r.m.snapshot().failed,'Original clock expired');}
function auto(m,id,previous){const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return;const sides=m.possibleExitSides(b);if(!sides.length)return;const snap=m.snapshot(),portals=api.matchingContinuousExitPortals(snap,b,sides),[x,y]=b.shape[0],dir=previous?(b.x<previous[0]?'left':b.x>previous[0]?'right':b.y<previous[1]?'top':b.y>previous[1]?'bottom':undefined):undefined;return api.choosePortalReleaseCandidate(portals,{x:b.x+x+.5,y:b.y+y+.5},{innerX:0,innerY:0,innerWidth:snap.width,innerHeight:snap.height,cell:1},dir)?.portal.side;}
function apply(r,d){tick(r,.83);const m=r.m,before=m.snapshot();m.beginAction();let side=auto(m,d.blockId);assert(!side||!d.path.length,'Would exit at pointer down');for(const[i,p]of d.path.entries()){const b=m.getBlock(d.blockId);assert(b&&m.isBlockActive(b));const previous=[b.x,b.y];assert.equal(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y),1,'Every attempted movement is a nonempty unit step');tick(r,.12);if(!m.moveBlockStep(b.id,...p)){const targetCells=b.shape.map(([dx,dy])=>[p[0]+dx,p[1]+dy]);const ids=[];for(const q of m.snapshot().blocks){if(q.id===b.id||!m.isBlockActive(m.getBlock(q.id)))continue;if(q.shape.some(([dx,dy])=>targetCells.some(([x,y])=>x===q.x+dx&&y===q.y+dy)))ids.push(q.id);}return {ok:false,pathIndex:i,from:previous,to:p,targetCells,collidingBlockIds:ids};}side=auto(m,b.id,previous);assert(!side||i===d.path.length-1,'Would exit before gesture end');}assert.equal(side,d.exitSide);if(side)assert(m.tryExit(d.blockId,side).ok);assert(m.commitAction());const after=m.snapshot(),n=after.cleared-before.cleared;r.clears+=n;r.moves++;r.parking+=Number(n===0);tick(r,.08);return {ok:true};}
function run(level,drags){const r=create(level);for(const d of drags){const a=apply(r,d);if(!a.ok)return {...r,ok:false,blocked:a};}return {...r,ok:true};}
const spatialState=r=>JSON.stringify(r.m.snapshot().blocks.map(b=>({id:b.id,x:b.x,y:b.y,color:b.color,layers:b.layers,frozen:b.frozen,active:r.m.isBlockActive(r.m.getBlock(b.id))})).sort((a,b)=>a.id.localeCompare(b.id)));
const input=process.argv[2],data=JSON.parse(fs.readFileSync(input)),{level,drags}=data;
assert([125,127].includes(level.id));const enumerationLevel=structuredClone(level);enumerationLevel.blocks.forEach(b=>delete b.timedBombSeconds);const graph=compile(enumerationLevel),cases=[],used=new Set(),main=create(level);
for(let k=0;k<drags.length&&cases.length<2;k++){
 const correct=drags[k],next=correct,prefix=drags.slice(0,k);
 if(next.path.length){
  const correctEnd=correct.path.at(-1),nextBody=main.m.getBlock(next.blockId),target=nextBody?.shape.map(([dx,dy])=>[next.path[0][0]+dx,next.path[0][1]+dy]);
  each(graph,stateFromSnapshot(graph,main.m.snapshot()),(_state,cost,get)=>{
   if(cost!==1)return;const wrong=get(),a=main.m.getBlock(wrong.blockId);if(!a||a.id===next.blockId||a.shape.length<2||used.has(a.id)||!wrong.path.length||wrong.exitSide)return;const start=[a.x,a.y],end=wrong.path.at(-1);if(JSON.stringify(end)===JSON.stringify(start)||JSON.stringify(end)===JSON.stringify(correctEnd))return;
   if(!target?.some(([x,y])=>a.shape.some(([dx,dy])=>x===end[0]+dx&&y===end[1]+dy)))return;
   try{
    const baseline=run(level,[...prefix,next]);if(!baseline.ok)return;
    const wrongState=run(level,[...prefix,wrong]);if(!wrongState.ok||wrongState.clears!==main.clears)return;
    const beforeProbe=spatialState(wrongState),blocked=apply(wrongState,next);if(blocked.ok||blocked.pathIndex!==0||!blocked.collidingBlockIds.includes(a.id)||spatialState(wrongState)!==beforeProbe)return;
    assert.equal(wrongState.m.commitAction(),false,'Rejected nonmoving probe cannot count as an effective gesture');tick(wrongState,.08);
    const recovery={blockId:a.id,path:[...wrong.path.slice(0,-1).reverse(),start]};if(!apply(wrongState,recovery).ok||spatialState(wrongState)!==spatialState(main))return;
    const recoveredRoute=[...prefix,wrong,recovery,...drags.slice(k)],recovered=wrongState;for(const d of drags.slice(k))assert(apply(recovered,d).ok);if(!recovered.m.snapshot().complete)return;
    cases.push({atStep:k+1,blockId:a.id,area:a.shape.length,origin:start,correctEnd,wrongEnd:end,correctDrag:correct,legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:recoveredRoute,collision:{...blocked,wrongFootprint:a.shape.map(([dx,dy])=>[end[0]+dx,end[1]+dy])},validation:{differentBlockParkingBeforeActualNextWitnessAction:true,wrongDiffersFromOriginAndCorrectEnd:true,nextBlockDifferent:true,nextFirstMovementNonempty:true,baselineCorrectBranchLegal:true,wrongLegal:true,wrongPreservesClearCount:true,actualFirstUnitMoveRejected:true,rejectionDirectlyOverlapsWrongBlock:true,failedProbeDoesNotMoveNextBlock:true,failedProbeLatencyIncluded:true,recoveryUsesSameLiveModelAfterRejection:true,spatialStateRestored:true,originalClockAndInventoryRetained:true,fullRecoveryComplete:true,recoveredSeconds:recovered.seconds,recoveredNonClearingDrags:recovered.parking,globalDeadEndProven:false,optimalPenaltyProven:false}});used.add(a.id);return false;
   }catch{}
  });
 }
 assert(apply(main,drags[k]).ok);
}
assert.equal(cases.length,2,`Only ${cases.length} true occupancy cases found`);
const output={input,levelSha256:digest(level),routeSha256:digest(drags),decisionCases:cases,method:'An additional legal multi-cell parking moves a block different from the actual next witness action, to a pose different from its origin and the next witness endpoint. The actual next witness block has a nonempty first unit step; original-model execution rejects that step with target cells occupied by the wrong block. Correct branch accepts it. Inverse parking restores the exact spatial state; entire recovery route runs with original mechanisms and positive clocks. No no-op-as-blockage or clock-erased validation.',passed:true,toolSha256:fileHash('tools/campaign-v145/lv121-130/round3-b/strict-next-decisions125127.mjs')};
console.log(JSON.stringify({file:save(`strict-next-decisions${level.id}`,output),cases:cases.map(c=>({step:c.atStep,block:c.blockId,next:c.blockedNextAction.blockId,from:c.origin,correct:c.correctEnd,wrong:c.wrongEnd,collision:c.collision.to,seconds:c.validation.recoveredSeconds}))}));

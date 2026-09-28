import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,digest,save,OUT,ruleGate} from './common.mjs';
ruleGate();
const input=OUT+'/reviewed171-1790527713145.json',d=JSON.parse(fs.readFileSync(input)),cases=[],used=new Set(),mechanisms=[],negativeControls=[];
const perform=(m,drag)=>{m.beginAction();for(const p of drag.path)if(!m.moveBlockStep(drag.blockId,...p))return false;if(drag.exitSide&&!m.tryExit(drag.blockId,drag.exitSide).ok)return false;return m.commitAction();};
const m=new api.PuzzleModel(d.level);m.startCountdown();
for(let i=0;i<d.drags.length;i++){
 const next=d.drags[i],before=m.snapshot();
 if(cases.length<3)for(const b of before.blocks){
  if(b.id===next.blockId||b.shape.length<2||!m.isBlockActive(m.getBlock(b.id))||used.has(b.id)||m.possibleExitSides(m.getBlock(b.id)).length)continue;
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const wrong=m.clone(),path=[];wrong.beginAction();
   for(let n=1;n<=4;n++){
    const p=[b.x+dx*n,b.y+dy*n];if(!wrong.moveBlockStep(b.id,...p))break;path.push(p);if(wrong.possibleExitSides(wrong.getBlock(b.id)).length)break;
    const parked=m.clone();if(!perform(parked,{blockId:b.id,path:[...path]}))continue;
    const blocked=parked.clone();if(perform(blocked,next))continue;
    const recover={blockId:b.id,path:[...path.slice(0,-1).reverse(),[b.x,b.y]]};assert(perform(parked,recover));
    for(const drag of d.drags.slice(i))assert(perform(parked,drag));assert(parked.snapshot().complete);
    cases.push({prefixDrags:i,wrongPark:{blockId:b.id,shape:b.shape,from:[b.x,b.y],path:[...path]},initialPortalContact:false,wrongPathPortalContact:false,blockedNextDrag:next,recoveryDrag:recover,completionRoute:d.drags.slice(i),recoveredComplete:true,addedNonClearingDrags:2});used.add(b.id);break;
   }
   if(used.has(b.id)||cases.length>=3)break;
  }
  if(cases.length>=3)break;
 }
 if(next.exitSide){
  const body=m.getBlock(next.blockId),flip=before.flipDoors.find(g=>g.color===body.color&&g.side===next.exitSide);
  if(flip&&!negativeControls.some(x=>x.kind==='flip-closed')){
   assert(flip.open);const control=m.clone();control.beginAction();for(const p of next.path)assert(control.moveBlockStep(next.blockId,...p));
   control.flipDoors.find(g=>g.id===flip.id).open=false;
   const rejected=control.tryExit(next.blockId,next.exitSide);assert(!rejected.ok);
   negativeControls.push({kind:'flip-closed',prefixDrags:i,drag:next,doorId:flip.id,actualDoorOpen:true,diagnosticOnlyChange:'Force the same matched flip door closed after the same spatial path, before trying the exit.',rejected,interpretation:'The witnessed gate exit depends on its real phase. This isolated control is not a difficulty proof or a production edit.'});
  }
  if(body.star&&!negativeControls.some(x=>x.kind==='star-requires-star-door')){
   const gate=before.gates.find(g=>g.star&&g.color===body.color&&g.side===next.exitSide);assert(gate);
   const control=m.clone();control.beginAction();for(const p of next.path)assert(control.moveBlockStep(next.blockId,...p));
   control.gates.find(g=>g.id===gate.id).star=false;
   const rejected=control.tryExit(next.blockId,next.exitSide);assert(!rejected.ok);
   negativeControls.push({kind:'star-requires-star-door',prefixDrags:i,drag:next,doorId:gate.id,diagnosticOnlyChange:'Change only the matched star door to an ordinary door at the same mouth and color.',rejected,interpretation:'The real hidden star cannot use an ordinary door. The same drag succeeds at the actual star door.'});
  }
 }
 assert(perform(m,next));const after=m.snapshot();
 if(after.cleared!==before.cleared)mechanisms.push({step:i+1,drag:next,cleared:after.cleared,flipDoors:after.flipDoors.map(g=>({id:g.id,open:g.open})),shutters:after.shutters,activeStars:after.blocks.filter(b=>b.star&&m.isBlockActive(m.getBlock(b.id))).map(b=>b.id)});
}
assert.equal(cases.length,3);assert(m.snapshot().complete);
const delayedLevel=structuredClone(d.level);for(const c of delayedLevel.shutters)c.count=13;
const delayed=new api.PuzzleModel(delayedLevel);delayed.startCountdown();let failedAt=-1;
for(let i=0;i<d.drags.length;i++)if(!perform(delayed,d.drags[i])){failedAt=i;break;}
assert(failedAt>=0);assert(d.level.blocks.find(b=>b.id===d.drags[failedAt].blockId).star);assert.equal(delayed.snapshot().cleared,12);assert(delayed.snapshot().shutters.every(c=>c.count===1));
negativeControls.push({kind:'curtain-threshold',diagnosticOnlyChange:'All five cover thresholds 12 to 13, with every body, door and route unchanged.',failedAtDrag:failedAt+1,blockedDrag:d.drags[failedAt],cleared:12,remainingCoverCounts:delayed.snapshot().shutters.map(c=>({id:c.id,count:c.count})),interpretation:'The actual twelfth body clear reveals all nine stars. The isolated +1 threshold control leaves them unavailable and blocks the same route; no changed threshold is adopted.'});
assert.equal(negativeControls.length,3);
const correction={supersedesTextOnly:'reviewed171-1790527713145.json sourceAdaptations[2]: six necessary closed-phase clears',replacement:'This selected route waits for completed animations and uses the six purple bodies as closed-phase clears. It does not claim that all GUI routes must alternate or must use six purple clears in closed phases: pending callbacks can legally overlap. L11 derives solely from the independently exhausted always-open relaxation, without the witness token or phase restriction.',oldReportPreserved:true,levelAndRouteUnchanged:true};
console.log(save('decisions171',{status:'PASS',input,inputSha256:digest(fs.readFileSync(input)),levelSha256:digest(d.level),routeSha256:digest(d.drags),cases,mechanisms,negativeControls,correction,blindTested:false,actualPointerScope:'Separate parent-run two-screen natural-clock evidence; these cases are current-model diagnostics.'}));

import assert from 'node:assert/strict';
import {loadSpatialApi} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {compileExact} from '../deliverables/remake91-100-v146-20260924/agent97-review/exact97.mjs';
import {projectionGuard,projectedInitialCut} from '../deliverables/remake91-100-v146-20260924/agent97-review/projection97-guard.mjs';
import {proveSplit} from '../deliverables/remake91-100-v146-20260924/agent97-review/split97.mjs';
// Every solution crosses a first completed gesture at which the lift is
// revealed. That gesture held an opening body, so every hidden body is still
// at its initial pose. Cuts are not unique. Removing the remaining opening
// bodies in the SAME inventory advances their real clear/key counts and frees
// space. With the guard's all-gates-thawed/no-hidden-effects restrictions,
// deleting future opening gestures maps each suffix to this easier graph.
// The two disjoint gesture intervals therefore have additive lower bounds.
export async function verifyFloor97(data,api){
 const {level,drags}=data;assert.equal(level.id,97);const full=await loadSpatialApi(),c=compileExact(level,full),domain=projectionGuard(c);
 assert.equal(domain.openingClears,19);assert.equal(domain.hidden.length,6);
 const projected=projectedInitialCut(c);assert.equal(projected[c.covers[0].stateIndex],19);
 const before=proveSplit(level,full,{mode:'before-reveal',floor:8,maxStates:2000000,maxMilliseconds:240000});assert(before.thresholdProven,JSON.stringify(before));
 const after=proveSplit(level,full,{mode:'after-projection',floor:3,maxStates:200000,maxMilliseconds:30000});assert(after.thresholdProven,JSON.stringify(after));
 const m=new api.PuzzleModel(level);m.startCountdown();let checkpoint;
 for(const[i,d]of drags.entries()){
  const was=m.snapshot().shutters[0].revealed;assert(!checkpoint||was);m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());
  const snap=m.snapshot();if(!was&&snap.shutters[0].revealed){assert(!level.blocks.find(b=>b.id===d.blockId).shutterId);for(const[b]of domain.hidden){const actual=snap.blocks.find(x=>x.id===b.id);assert(actual);assert.equal(actual.x,b.x);assert.equal(actual.y,b.y);assert.deepEqual(actual.layers,b.layers);}checkpoint={afterDrags:i+1,clearCount:snap.cleared,allHiddenPosesStillInitial:true,heldBodyWasOpening:true};}
 }
 assert(checkpoint);assert(m.snapshot().complete);
 return{floor:11,thresholdProven:true,method:'Disjoint first-reveal prefix8 plus full-inventory monotone projected suffix3',before,after,checkpoint,cutUnique:false,projectedBodyInventory:c.N,removedOpeningStates:19,hiddenOriginalPoses:6,sourceInventoryDeleted:false};
}

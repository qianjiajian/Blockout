import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,checkFastFloor} from './remake21to30-mask-floor.mjs';

/**
 * Lower-bound relaxation for the v1.28 / runtime-v1.4 generator authoring batch.
 * Keep EVERY visible body in a fresh, automatically settled opening, including
 * frozen bodies and already emitted cargo, with all its remaining shell layers.
 * Remove future bodies, covers and machines; remove ALL block and gate ice.
 * The fixed playable geometry and every ordinary gate are unchanged.
 *
 * Simulation argument: deleting occupants/covers cannot obstruct any unit step.
 * Clears of discarded bodies become stutters, since no retained countdown is
 * left to depend on those clears. Moves/peels/removals of retained bodies have
 * the same endpoints and layer changes in the optional-exit superset graph.
 * A gesture returning to its origin may become a zero-cost stutter. Thus each
 * real solution maps to a projected solution of no greater non-clearing cost.
 * A proven projected floor is a floor for the original, but cannot prove that
 * the original has ANY solution. Full real replay / Pointer / time stay separate.
 * This tool deliberately does not support post-opening arbitrary snapshots.
 */
export const GENERATOR_PROJECTION = 'opening-visible-no-future-no-countdowns-v1';

function assertDomain(level,api){
  assert(level?.mechanismRules==='revised-2026-09-23-v1.4','Only runtime v1.4 is qualified');
  assert(Number.isInteger(level.id)&&level.id>=41&&level.id<=50,'Generator projection qualified only for reviewed Lv41–50');
  assert(Array.isArray(level.generators)&&level.generators.length,'Requires a real generator');
  assert(api?.PuzzleModel&&typeof api.validateLevel==='function','Real model and validator required');
  for(const key of ['seams','flipDoors','coloredGrids','elevators','conveyors'])
    assert(level[key]===undefined||Array.isArray(level[key])&&level[key].length===0,`Unsupported ${key}`);
  for(const b of level.blocks??[]){
    for(const key of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'])assert(b[key]===undefined,`Unsupported block ${key}`);
    assert(!b.star&&!b.rotationBadge,'Star/rotation unsupported');
    assert(b.frozen===undefined||Number.isSafeInteger(b.frozen)&&b.frozen>0,'Malformed block ice');
  }
  for(const g of level.gates??[]){
    assert(g.portals===undefined&&!g.star,'Portals/star gates unsupported');
    assert(g.frozen===undefined||Number.isSafeInteger(g.frozen)&&g.frozen>0,'Malformed gate ice');
  }
  for(const s of level.shutters??[])
    assert((s.skin===undefined||s.skin==='shutter')&&s.triggerBlockIds===undefined,'Only ordinary countdown shutters supported');
  for(const g of level.generators){
    assert(g.trigger===undefined||g.trigger==='move','Only fixed-space generators supported');
    assert(g.intervalSeconds===undefined&&g.initialDelaySeconds===undefined,'Generator clocks unsupported');
  }
  // This checks all original cargo, not just the bodies the relaxation keeps:
  // queue identity/ice/mount/complete mouth footprint and revised construction.
  api.validateLevel(level);
}

export function projectGeneratorOpening(level,api){
  assertDomain(level,api);
  const model=new api.PuzzleModel(structuredClone(level)),snapshot=model.snapshot();
  assert.equal(snapshot.cleared,0,'Opening must be fresh');
  const visible=snapshot.blocks.filter(b=>!b.shutterId||snapshot.shutters.find(s=>s.id===b.shutterId)?.revealed===true);
  assert(visible.length,'No visible opening body: no positive projection floor available');
  const projected={id:level.id,name:level.name,difficulty:level.difficulty,timeSeconds:level.timeSeconds,reward:level.reward,
    mechanismRules:level.mechanismRules,width:level.width,height:level.height,
    ...(level.playable===undefined?{}:{playable:structuredClone(level.playable)}),
    ...(level.blocked===undefined?{}:{blocked:structuredClone(level.blocked)}),
    gates:level.gates.map(g=>{const copy=structuredClone(g);delete copy.frozen;return copy;}),
    blocks:visible.map(b=>({id:b.id,x:b.x,y:b.y,color:b.layers[0],shape:structuredClone(b.shape),layers:[...b.layers]}))};
  compileLevel(projected); // Keeps the mask graph's fail-closed geometric limits.
  const retainedIds=visible.map(b=>b.id),retained=new Set(retainedIds),queued=new Set(level.generators.flatMap(g=>g.queueBlockIds));
  return {level:projected,retainedIds,droppedIds:level.blocks.filter(b=>!retained.has(b.id)).map(b=>b.id),
    initiallySpawnedIds:retainedIds.filter(id=>queued.has(id)),sourceLevelSha256:digest(level),projectedLevelSha256:digest(projected),
    abstraction:GENERATOR_PROJECTION,allCountdownRestrictionsRemoved:true,solvabilityValidated:false};
}

export function checkGeneratorFloor(level,api,options={}){
  let projection;
  try{projection=projectGeneratorOpening(level,api);}catch(error){return {status:'unsupported',thresholdProven:false,reason:error.message,
    abstraction:GENERATOR_PROJECTION,solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};}
  const proof=checkFastFloor(projection.level,options);
  return {...proof,underlyingAbstraction:proof.abstraction,abstraction:GENERATOR_PROJECTION,
    sourceLevelSha256:projection.sourceLevelSha256,projectedLevelSha256:projection.projectedLevelSha256,
    retainedIds:projection.retainedIds,droppedIds:projection.droppedIds,initiallySpawnedIds:projection.initiallySpawnedIds,
    allCountdownRestrictionsRemoved:true,solvabilityValidated:false};
}

/** Empirical guard in addition to the simulation argument, never a substitute
 * for exhaustive graph proof. Requires a complete, canonical real witness. */
export function verifyGeneratorRouteProjection(level,drags,api){
  try{
    const projection=projectGeneratorOpening(level,api),c=compileLevel(projection.level);
    const replay=api.replayRevisedRoute(level,drags);
    assert(replay.valid&&replay.complete,`Complete canonical real route required: ${replay.error??'incomplete'}`);
    const model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
    assert.deepEqual(stateFromSnapshot(c,model.snapshot()),c.initial);
    let projectedNonClearingDrags=0,realNonClearingDrags=0,stutters=0;const steps=[];
    for(const [at,drag]of drags.entries()){
      const before=model.snapshot(),state=stateFromSnapshot(c,before),index=c.blocks.findIndex(b=>b.id===drag.blockId);
      model.beginAction();for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));
      if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
      const after=model.snapshot(),next=stateFromSnapshot(c,after),realCost=after.cleared===before.cleared?1:0;
      realNonClearingDrags+=realCost;
      if(state.every((v,i)=>v===next[i])){stutters++;steps.push({step:at+1,blockId:drag.blockId,realCost,projectedCost:0,stutter:true});continue;}
      assert(index>=0,'A discarded action changed a retained body');
      assert(state.every((v,i)=>i===index||v===next[i]),'More than one retained body changed');
      let cost=Infinity;
      forEachGesture(c,state,(i,v,edge)=>{if(i===index&&v===next[index])cost=Math.min(cost,edge);});
      assert(cost<=realCost,`Real step ${at+1} missing from the non-increasing projection`);
      projectedNonClearingDrags+=cost;steps.push({step:at+1,blockId:drag.blockId,realCost,projectedCost:cost,stutter:false});
    }
    assert(stateFromSnapshot(c,model.snapshot()).every(v=>v===255));
    assert.equal(realNonClearingDrags,replay.nonClearingDrags);assert(projectedNonClearingDrags<=realNonClearingDrags);
    return {valid:true,sourceLevelSha256:projection.sourceLevelSha256,routeSha256:digest(drags),projectedLevelSha256:projection.projectedLevelSha256,
      steps,stutters,realNonClearingDrags,projectedNonClearingDrags,projectionComplete:true,lowerBoundCertified:false};
  }catch(error){return {valid:false,error:error.message,lowerBoundCertified:false};}
}

/** Concrete controlled-clock witness, never a natural-time/Pointer claim.
 * Current qualification excludes timed generators and autonomous movers.
 * Every departure finishes before the next gesture. Ordinary gate selection
 * uses the same actual-cell grab and portal chooser as the production UI.
 */
export function validateTimeSchedule(schedule, runtime) {
  if (!schedule || schedule.kind !== 'per-drag-and-unit-step-v1') throw new Error('Explicit supported timeSchedule required');
  const allowed=['kind','secondsPerDrag','secondsPerUnitStep','secondsPerExitAnimation'];
  if(Object.keys(schedule).some(key=>!allowed.includes(key)))throw new Error('Unknown timeSchedule field');
  for(const key of allowed.slice(1)) if(!Number.isFinite(schedule[key])||schedule[key]<=0||schedule[key]>60)throw new Error(`Invalid timeSchedule ${key}`);
  if (runtime && schedule.secondsPerExitAnimation < runtime.animationTiming.minimumSettledExitSeconds) throw new Error('Exit animation schedule is shorter than qualified normal-motion completion');
  return structuredClone(schedule);
}

export function canonicalExit(runtime, model, blockId, previous) {
  const block=model.getBlock(blockId);
  if(!block||!model.isBlockActive(block))return undefined;
  const sides=model.possibleExitSides(block);if(!sides.length)return undefined;
  const snapshot=model.snapshot(), candidates=runtime.matchingContinuousExitPortals(snapshot,block,sides);
  const [gx,gy]=block.shape[0],pointer={x:block.x+gx+.5,y:block.y+gy+.5};
  const inferred=previous?(block.x<previous[0]?'left':block.x>previous[0]?'right':block.y<previous[1]?'top':block.y>previous[1]?'bottom':undefined):undefined;
  return runtime.choosePortalReleaseCandidate(candidates,pointer,{innerX:0,innerY:0,innerWidth:snapshot.width,innerHeight:snapshot.height,cell:1},inferred)?.portal.side;
}

export function replayScheduledRoute(runtime, level, drags, requestedSchedule) {
  const result={valid:false,complete:false,failed:false,effectiveDrags:0,nonClearingDrags:0,clearEvents:0,
    simulationTimeValidated:false,naturalTimeValidated:false,timeValidated:false,pointerReplayValidated:false,
    animationPolicy:'complete-each-departure-before-next-gesture',elapsedSeconds:0,trace:[]};
  try {
    const schedule=validateTimeSchedule(requestedSchedule,runtime);
    if(level.generators?.some(g=>g.trigger==='time')||level.elevators?.length||level.conveyors?.length)throw new Error('Scheduled route excludes autonomous inventory and motion');
    if(!Array.isArray(drags)||!drags.length||drags.length>10000)throw new Error('Finite nonempty drags required');
    const model=new runtime.PuzzleModel(structuredClone(level),{deferExitCompletion:true});model.startCountdown();
    const tick=seconds=>{model.tick(seconds);result.elapsedSeconds+=seconds;if(model.snapshot().failed)throw new Error('Original deadline expired');};
    for(const [index,drag] of drags.entries()) {
      if(!drag||Object.keys(drag).some(key=>!['blockId','path','exitSide'].includes(key))||!Array.isArray(drag.path))throw new Error(`Invalid drag ${index}`);
      tick(schedule.secondsPerDrag);
      const before=model.snapshot();model.beginAction();
      let automatic=canonicalExit(runtime,model,drag.blockId);
      if(automatic&&drag.path.length)throw new Error(`Pointer-down exit must end drag ${index}`);
      for(const [step,point] of drag.path.entries()) {
        tick(schedule.secondsPerUnitStep);
        const held=model.getBlock(drag.blockId),previous=held?[held.x,held.y]:undefined;
        if(!Array.isArray(point)||point.length!==2||!point.every(Number.isSafeInteger)||!model.moveBlockStep(drag.blockId,...point))throw new Error(`Rejected step ${index}:${step}`);
        automatic=canonicalExit(runtime,model,drag.blockId,previous);
        if(automatic&&step!==drag.path.length-1)throw new Error(`First-contact exit must end drag ${index}`);
      }
      if(automatic!==drag.exitSide)throw new Error(`Canonical exit mismatch ${index}`);
      let departure;
      if(drag.exitSide){departure=model.tryExit(drag.blockId,drag.exitSide);if(!departure.ok)throw new Error(`Rejected exit ${index}`);}
      if(!model.commitAction())throw new Error(`Ineffective drag ${index}`);
      if(departure){tick(schedule.secondsPerExitAnimation);if(departure.exitAnimationId&&!model.completeExitAnimation(departure.exitAnimationId))throw new Error(`Rejected departure completion ${index}`);}
      const after=model.snapshot(),clearDelta=after.cleared-before.cleared;
      if(after.failed||after.moves!==before.moves+1||clearDelta<0||after.pendingExitAnimations?.length)throw new Error(`Invalid resulting state ${index}`);
      result.effectiveDrags++;result.clearEvents+=clearDelta;if(!clearDelta)result.nonClearingDrags++;
      result.trace.push({index,blockId:drag.blockId,clearDelta,elapsedSeconds:result.elapsedSeconds,
        remainingSeconds:after.remainingSeconds,bombs:after.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>({id:b.id,seconds:b.timedBombSeconds,active:model.isBlockActive(b)})),
        flipDoors:after.flipDoors.map(door=>({id:door.id,open:door.open,frozen:door.frozen}))});
    }
    const final=model.snapshot();
    Object.assign(result,{valid:true,complete:final.complete&&final.blocks.length===0&&final.queuedBlocks.length===0,
      failed:final.failed,simulationTimeValidated:final.complete&&!final.failed,timeSchedule:schedule,remainingSeconds:final.remainingSeconds,
      remainingBodies:final.blocks.length,remainingQueued:final.queuedBlocks.length});
  }catch(error){result.error=error.message;}
  return result;
}

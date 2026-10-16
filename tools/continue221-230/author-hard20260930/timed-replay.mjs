// Fresh original PuzzleModel replay with canonical first-contact exit and an
// explicit simulated schedule. This is NOT real Pointer/natural-clock evidence.
export function replayTimed(level,drags,api,{secondsPerCell=0.06,secondsPerDrag=0.3}={}){
 const r={valid:false,complete:false,effectiveDrags:0,nonClearingDrags:0,clearEvents:0,simulatedSeconds:0,minimumBombSeconds:null,naturalClockValidated:false,pointerValidated:false};
 try{
  const m=new api.PuzzleModel(level);m.startCountdown();
  const tick=dt=>{m.tick(dt);r.simulatedSeconds+=dt;const s=m.snapshot();for(const b of s.blocks)if(b.timedBombSeconds!==undefined&&m.isBlockActive(b))r.minimumBombSeconds=Math.min(r.minimumBombSeconds??Infinity,b.timedBombSeconds);if(s.failed)throw Error('model failed under simulated schedule');};
  const auto=(id,previous)=>{const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return;const sides=m.possibleExitSides(b);if(!sides.length)return;const s=m.snapshot(),candidates=api.matchingContinuousExitPortals(s,b,sides),[gx,gy]=b.shape[0],inferred=previous?b.x<previous[0]?'left':b.x>previous[0]?'right':b.y<previous[1]?'top':b.y>previous[1]?'bottom':undefined:undefined;return api.choosePortalReleaseCandidate(candidates,{x:b.x+gx+0.5,y:b.y+gy+0.5},{innerX:0,innerY:0,innerWidth:s.width,innerHeight:s.height,cell:1},inferred)?.portal.side;};
  for(const d of drags){const before=m.snapshot();tick(secondsPerDrag);m.beginAction();let side=auto(d.blockId);if(side&&d.path.length)throw Error('pointer-down mandatory exit');for(let i=0;i<d.path.length;i++){const b=m.getBlock(d.blockId),prior=[b.x,b.y];tick(secondsPerCell);if(!m.moveBlockStep(d.blockId,...d.path[i]))throw Error('rejected unit step');side=auto(d.blockId,prior);if(side&&i!==d.path.length-1)throw Error('first-contact mandatory exit');}if(side!==d.exitSide)throw Error('canonical exit mismatch');if(side&&!m.tryExit(d.blockId,side).ok)throw Error('exit rejected');if(!m.commitAction())throw Error('ineffective action');const after=m.snapshot();if(after.failed||after.moves!==before.moves+1)throw Error('failed committed action');r.effectiveDrags++;const n=after.cleared-before.cleared;r.clearEvents+=n;if(!n)r.nonClearingDrags++;}
  return {...r,valid:true,complete:m.snapshot().complete,remainingSeconds:m.snapshot().remainingSeconds};
 }catch(e){return {...r,error:e.message};}
}

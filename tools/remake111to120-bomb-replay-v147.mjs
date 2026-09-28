import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';

// Fresh real model with unchanged bombs. Zero-time mode is explicitly spatial
// evidence only. The separate positive-time schedule is a model witness, not
// a replacement for the actual Pointer/natural tick verifier.
export function replayBombRoute(level,drags,api,{timed=false}={}){
 const r={valid:false,complete:false,effectiveDrags:0,nonClearingDrags:0,clearEvents:0,
  timeValidated:false,simulatedTimeValidated:false,pointerValidated:false,spatialOnly:!timed};
 try{
  assert.equal(level.id,120);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
  assert(level.blocks.some(b=>b.timedBombSeconds!==undefined));
  for(const k of ['generators','shutters','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Unqualified bomb replay ${k}`);
  api.validateLevel(level);const model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
  const lifecycle=level.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>({id:b.id,initialSeconds:b.timedBombSeconds}));let seconds=0;
  const tick=dt=>{if(timed){model.tick(dt);seconds+=dt;assert(!model.snapshot().failed,`Expired at ${seconds}`);}};
  const auto=(id,previous)=>{
   const block=model.getBlock(id);if(!block||!model.isBlockActive(block))return;
   const sides=model.possibleExitSides(block);if(!sides.length)return;
   const snapshot=model.snapshot(),candidates=api.matchingContinuousExitPortals(snapshot,block,sides);
   const [x,y]=block.shape[0],pointer={x:block.x+x+.5,y:block.y+y+.5};
   const inferred=previous?(block.x<previous[0]?'left':block.x>previous[0]?'right':block.y<previous[1]?'top':block.y>previous[1]?'bottom':undefined):undefined;
   return api.choosePortalReleaseCandidate(candidates,pointer,{innerX:0,innerY:0,innerWidth:snapshot.width,innerHeight:snapshot.height,cell:1},inferred)?.portal.side;
  };
  for(const d of drags){
   tick(.75);tick(.08);const before=structuredClone(model.snapshot());model.beginAction();let automatic=auto(d.blockId);
   assert(!automatic||!d.path.length,'Pointer-down auto-exit precedes movement');
   for(const [i,p]of d.path.entries()){
    const block=model.getBlock(d.blockId);assert(block);const previous=[block.x,block.y];
    assert.equal(Math.abs(p[0]-previous[0])+Math.abs(p[1]-previous[1]),1,'Unit pointer anchors required');
    tick(.12);assert(model.moveBlockStep(d.blockId,...p),`Rejected move ${d.blockId} to ${p}`);
    automatic=auto(d.blockId,previous);assert(!automatic||i===d.path.length-1,'First-contact exit ends drag');
   }
   assert.equal(d.exitSide,automatic,'Canonical automatic exit');
   if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());
   const after=model.snapshot();assert(!after.failed);assert.equal(after.moves,before.moves+1);
   r.effectiveDrags++;r.clearEvents+=after.cleared-before.cleared;r.nonClearingDrags+=Number(after.cleared===before.cleared);
   for(const b of lifecycle)if(b.disarmedAtSeconds===undefined&&model.getBlock(b.id)?.timedBombSeconds===undefined){b.disarmedAtSeconds=seconds;b.kind=model.getBlock(b.id)?'shell-peel':'body-removal';}
   tick(.08);
  }
  const {moves,...state}=model.snapshot();
  return {...r,valid:true,complete:state.complete,finalStateKey:JSON.stringify(state),simulatedTimeValidated:timed&&state.complete,
   simulatedSeconds:seconds,bombLifecycle:lifecycle,levelSha256:digest(level),routeSha256:digest(drags)};
 }catch(e){return {...r,error:e.message};}
}
export const bombSpatialApi=api=>({...api,replayRevisedRoute:(l,d)=>l.blocks.some(b=>b.timedBombSeconds!==undefined)?replayBombRoute(l,d,api):api.replayRevisedRoute(l,d)});

import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadApi as loadBase,digest} from './common.mjs';
export async function loadApi(){
 const base=await loadBase();
 const extra=await build({stdin:{resolveDir:process.cwd(),contents:"export {matchingContinuousExitPortals,choosePortalReleaseCandidate} from './src/game/continuousDrag.ts';"},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 return {api:{...base.api,...await import('data:text/javascript;base64,'+Buffer.from(extra.outputFiles[0].text).toString('base64'))},inputs:[...new Set([...base.inputs,...Object.keys(extra.metafile.inputs).filter(p=>p!=='<stdin>')])]};
}
export function replay(level,drags,api,{timed=false,complete=false,requirePointerCompatible=false}={}){
 const m=new api.PuzzleModel(structuredClone(level));api.validateLevel(level);m.startCountdown();
 let clearEvents=0,nonClearingDrags=0,multiCellRepositions=0,elapsed=0;
 const auto=(id,previous)=>{
  const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return;
  const sides=m.possibleExitSides(b);if(!sides.length)return;
  const s=m.snapshot(),portals=api.matchingContinuousExitPortals(s,b,sides),[dx,dy]=b.shape[0];
  const inferred=previous?(b.x<previous[0]?'left':b.x>previous[0]?'right':b.y<previous[1]?'top':b.y>previous[1]?'bottom':undefined):undefined;
  return api.choosePortalReleaseCandidate(portals,{x:b.x+dx+.5,y:b.y+dy+.5},{innerX:0,innerY:0,innerWidth:s.width,innerHeight:s.height,cell:1},inferred)?.portal.side;
 };
 const tick=seconds=>{if(timed){m.tick(seconds);elapsed+=seconds;assert(!m.snapshot().failed,'Simulated deadline reached');}};
 for(const [i,d] of drags.entries()){
  const before=m.snapshot(),b=m.getBlock(d.blockId);assert(b&&m.isBlockActive(b),`step ${i+1}: active block`);
  tick(.25);m.beginAction();let side=requirePointerCompatible?auto(b.id):undefined;
  if(requirePointerCompatible)assert(!side||!d.path.length,`step ${i+1}: down already auto-clears`);
  for(const [j,p]of d.path.entries()){
   const moving=m.getBlock(b.id);assert(moving);const previous=[moving.x,moving.y];
   assert.equal(Math.abs(p[0]-moving.x)+Math.abs(p[1]-moving.y),1,`step ${i+1}: unit path`);tick(.05);
   assert(m.moveBlockStep(b.id,...p),`step ${i+1}: rejected move ${j+1}`);
   if(requirePointerCompatible){side=auto(b.id,previous);assert(!side||j===d.path.length-1,`step ${i+1}: intermediate auto exit`);}
  }
  if(requirePointerCompatible)assert.equal(side,d.exitSide,`step ${i+1}: pointer release side`);
  if(d.exitSide)assert(m.tryExit(b.id,d.exitSide).ok,`step ${i+1}: full exit sweep rejected`);
  assert(m.commitAction(),`step ${i+1}: ineffective drag`);const after=m.snapshot();assert.equal(after.moves,before.moves+1);
  const n=after.cleared-before.cleared;clearEvents+=n;nonClearingDrags+=Number(!n);multiCellRepositions+=Number(!n&&b.shape.length>1);
 }
 const final=m.snapshot();if(complete)assert(final.complete&&!final.failed,'Complete route required');
 return {valid:true,complete:final.complete,effectiveDrags:final.moves,clearEvents,nonClearingDrags,multiCellRepositions,final,finalStateKey:JSON.stringify(final),simulatedSeconds:elapsed,simulatedTimeValidated:timed&&final.complete,naturalClockValidated:false,pointerValidated:false,levelSha256:digest(level),routeSha256:digest(drags)};
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,replay} from '../../replay.mjs';
import {original,geometry} from '../../common.mjs';
import {auditSpatial,digest,ruleGate,save} from './common.mjs';

const file=process.argv[2]??'deliverables/remake191-200-20260927/author197-199/assist194/additive194-1790528146236-39900.json';
const packet=JSON.parse(fs.readFileSync(file)),{level,drags}=packet,lock=ruleGate();
const {api,inputs}=await loadApi(),spatial=auditSpatial(level,api),baseline=original().levels[193];
assert.equal(digest(level),'220c84536dd3e2e56857b696b00c874db1a55c2c45b879c1ae1672dbd9880424');
const inputHashes=Object.fromEntries(inputs.map(f=>[f,digest(fs.readFileSync(f))]));
const full=replay(level,drags,api,{timed:true,complete:true,requirePointerCompatible:true});
assert.equal(full.effectiveDrags,45);assert.equal(full.nonClearingDrags,12);assert.equal(full.clearEvents,33);
const m=new api.PuzzleModel(level);m.startCountdown();
const queued=level.generators.flatMap(g=>g.queueBlockIds);assert.equal(queued.length,1);
const events=[],micro=[],states=[],spawns=[];
let peeled=0,removed=0,lastQ=queued.length;
function verify(where){
 const s=m.snapshot();
 for(const g of s.gates)assert.equal(g.frozen,Math.max(0,(level.gates.find(q=>q.id===g.id).frozen??0)-s.cleared),where+' gate '+g.id);
 for(const c of s.shutters){const initial=level.shutters.find(q=>q.id===c.id).count;assert.equal(c.count,Math.max(0,initial-s.cleared),where+' curtain '+c.id);assert.equal(c.revealed,s.cleared>=initial,where+' curtain visibility '+c.id);}
 assert.equal(s.generators[0].remaining,s.queuedBlocks.length);assert.equal(s.generators[0].head,1-s.queuedBlocks.length);
 if(s.queuedBlocks.length){
  const g=s.generators[0],b=s.queuedBlocks[0],cells=b.shape.map(([x,y])=>[x+g.spawn[0],y+g.spawn[1]]);
  const blockers=s.blocks.filter(b=>m.isBlockActive(b)&&b.shape.some(([x,y])=>cells.some(([sx,sy])=>sx===b.x+x&&sy===b.y+y))).map(b=>b.id);
  const covers=s.shutters.filter(c=>!c.revealed&&cells.some(([x,y])=>x>=c.x&&x<c.x+c.width&&y>=c.y&&y<c.y+c.height)).map(c=>c.id);
  assert(blockers.length+covers.length>0,where+' automatic queue left ready');
 }
 if(s.queuedBlocks.length<lastQ){const b=s.blocks.find(b=>b.id===queued[0]);assert(b);assert.deepEqual([b.x,b.y],level.generators[0].spawn);assert(s.shutters.find(c=>c.id==='c10').revealed);spawns.push({where,cleared:s.cleared,pose:[b.x,b.y],blockId:b.id});}
 lastQ=s.queuedBlocks.length;
 micro.push({where,cleared:s.cleared,gates:s.gates.map(g=>[g.id,g.frozen]),shutters:s.shutters.map(c=>[c.id,c.count,c.revealed]),queueRemaining:s.queuedBlocks.length});
 return s;
}
verify('initial');
for(const [i,d] of drags.entries()){
 const before=m.snapshot();states.push(m.clone());const block=structuredClone(m.getBlock(d.blockId));m.beginAction();
 for(const [j,p] of d.path.entries()){assert(m.moveBlockStep(d.blockId,...p));verify(`drag${i+1}/unit${j+1}`);}
 if(d.exitSide){const r=m.tryExit(d.blockId,d.exitSide);assert(r.ok);verify(`drag${i+1}/exit`);}
 assert(m.commitAction());const after=verify(`drag${i+1}/commit`),delta=after.cleared-before.cleared;
 const peel=delta===1&&!!m.getBlock(d.blockId);peeled+=Number(peel);removed+=Number(delta===1&&!peel);
 events.push({drag:i+1,blockId:d.blockId,color:block.color,shapeCells:block.shape.length,start:[block.x,block.y],stop:d.path.at(-1)??[block.x,block.y],exitSide:d.exitSide,kind:delta?(peel?'shell-peel':'body-remove'):'reposition',clearBefore:before.cleared,clearAfter:after.cleared,openedCurtains:after.shutters.filter(c=>c.revealed&&!before.shutters.find(b=>b.id===c.id).revealed).map(c=>c.id),thawedGates:after.gates.filter(g=>g.frozen===0&&before.gates.find(b=>b.id===g.id).frozen>0).map(g=>g.id),queueBefore:before.queuedBlocks.length,queueAfter:after.queuedBlocks.length});
}
assert(m.snapshot().complete);assert.equal(peeled,2);assert.equal(removed,31);assert.equal(spawns.length,1);
function auto(model,id,previous){
 const b=model.getBlock(id);if(!b||!model.isBlockActive(b))return;
 const sides=model.possibleExitSides(b);if(!sides.length)return;
 const s=model.snapshot(),portals=api.matchingContinuousExitPortals(s,b,sides),[dx,dy]=b.shape[0];
 const inferred=previous?(b.x<previous[0]?'left':b.x>previous[0]?'right':b.y<previous[1]?'top':b.y>previous[1]?'bottom':undefined):undefined;
 return api.choosePortalReleaseCandidate(portals,{x:b.x+dx+.5,y:b.y+dy+.5},{innerX:0,innerY:0,innerWidth:s.width,innerHeight:s.height,cell:1},inferred)?.portal.side;
}
const spatialKey=s=>{s=structuredClone(s);for(const k of ['moves','started','remainingSeconds','autonomousStarted'])delete s[k];return JSON.stringify(s);};
const recovery=[];
for(const phase of ['before-c10','after-c10']){
 outer:for(const [i,state] of states.entries()){
  const before=state.snapshot();if((before.cleared<10)!==(phase==='before-c10')||before.cleared===0)continue;
  for(const b of before.blocks){if(b.shape.length<2||!state.isBlockActive(b)||auto(state,b.id)||recovery.some(r=>r.blockId===b.id)||b.id===drags[i].blockId)continue;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p=[b.x+dx,b.y+dy];if(drags[i].blockId===b.id&&JSON.stringify(drags[i].path[0])===JSON.stringify(p))continue;
    const x=state.clone();x.beginAction();if(!x.moveBlockStep(b.id,...p)||auto(x,b.id,[b.x,b.y])||!x.commitAction())continue;
    const wrong=x.snapshot();if(wrong.cleared!==before.cleared||wrong.queuedBlocks.length!==before.queuedBlocks.length)continue;
    const next=x.clone(),planned=drags[i];next.beginAction();let blockedAt=null;
    for(const [j,p]of planned.path.entries())if(!next.moveBlockStep(planned.blockId,...p)){blockedAt={unit:j+1,pose:p};break;}
    if(!blockedAt&&planned.exitSide&&!next.tryExit(planned.blockId,planned.exitSide).ok)blockedAt={exitSide:planned.exitSide};
    if(!blockedAt)continue;
    x.beginAction();if(auto(x,b.id)||!x.moveBlockStep(b.id,b.x,b.y)||auto(x,b.id,p)||!x.commitAction())continue;
    if(spatialKey(x.snapshot())!==spatialKey(before))continue;
    const inserted=[{blockId:b.id,path:[p]},{blockId:b.id,path:[[b.x,b.y]]}],route=[...drags.slice(0,i),...inserted,...drags.slice(i)];
    let test;try{test=replay(level,route,api,{timed:true,complete:true,requirePointerCompatible:true});}catch{continue;}
    recovery.push({phase,insertBeforeDrag:i+1,clearCount:before.cleared,blockId:b.id,color:b.color,shape:b.shape,start:[b.x,b.y],wrongParking:p,correctNextDrag:drags[i],wrongParkingBlocksNextAction:blockedAt,extraEffectiveDrags:2,drags:route,complete:test.complete,totalDrags:test.effectiveDrags,nonClearingDrags:test.nonClearingDrags,simulatedSeconds:test.simulatedSeconds,routeSha256:test.routeSha256,restoredSpatialState:true});break outer;
   }
  }
 }
}
assert.equal(recovery.length,2,'Two reversible parking samples required');
for(const [p,h] of Object.entries(inputHashes))assert.equal(digest(fs.readFileSync(p)),h,'Input drift '+p);
const result={status:'PASS',scope:'Independent static geometry/scoring/full native art, opening/hidden coverage, complete authoritative route, every mechanism microstate and two reversible parking samples. Difficulty proof/source video qualification and real Pointer/natural clock are separate reviewers.',createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(drags),spatial,originalPreservation:{geometry:geometry(level),starTargets:api.levelStarTargets(level),timeSeconds:level.timeSeconds,reward:level.reward,parMoves:level.parMoves,baselineGeometry:baseline.geometry,baselineStars:baseline.starTargets},inventory:{bodies:level.blocks.length,opening:level.blocks.filter(b=>!b.shutterId&&!queued.includes(b.id)).length,hidden:level.blocks.filter(b=>b.shutterId).length,queued:queued.length,shells:peeled,iceGates:level.gates.filter(g=>g.frozen).length,curtains:level.shutters.length},route:{effectiveDrags:full.effectiveDrags,clearEvents:full.clearEvents,nonClearingDrags:full.nonClearingDrags,multiCellRepositions:full.multiCellRepositions,complete:full.complete,simulatedSeconds:full.simulatedSeconds,bodyRemovals:removed,shellPeels:peeled,microstates:micro.length},events,micro,spawns,recovery,recoveryLimit:'Two concrete wrong-parking/reversal/full-route samples only. Not a universal no-deadlock assertion, not human blind play or natural-clock/real-Pointer evidence.',inputs:inputHashes};
const out=save('review-selected194',result);console.log(JSON.stringify({out,inventory:result.inventory,route:result.route,spawns,recovery:recovery.map(({drags,...r})=>r)}));

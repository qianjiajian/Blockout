import fs from'node:fs';
import assert from'node:assert/strict';
import{loadIsolatedApi}from'../isolated-api.mjs';
import{projection,replayBomb}from'../../../../remake121to130-bomb-replay-v172.mjs';
import{compileSpatial,each,NONE,settle,assertStateMatches}from'../../../../remake111to120-spatial-floor-v147.mjs';
import{digest}from'../../../../revised-preview-validation-v160.mjs';
import{verifyRulesLock}from'../../../../verify-rules-lock.mjs';
const ROOT='deliverables/campaign121-130-v146-20260924',OUT=ROOT+'/round3-c/decision-repairs-v172';
fs.mkdirSync(OUT,{recursive:true});const lock=verifyRulesLock();assert(lock.ok);const api=await loadIsolatedApi();
const files=['reviewed/candidate122-bomb-earlier-1790470805492.json','round3-a/ready123-1790472706114.json','reviewed/candidate124-1790470554224.json'];
const key=p=>p.join(','),footprint=(b,at=[b.x,b.y])=>b.shape.map(([x,y])=>[x+at[0],y+at[1]]);
function apply(m,d){m.beginAction();for(const p of d.path){const b=m.getBlock(d.blockId);assert.equal(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y),1);assert(m.moveBlockStep(d.blockId,...p));}if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}
function modelAfter(l,drags){const m=new api.PuzzleModel(l);m.startCountdown();for(const d of drags)apply(m,d);return m;}
function positiveReplay(l,drags,failedBefore,blocked){
 const m=new api.PuzzleModel(l);m.startCountdown();let seconds=0,attempt;
 const bombs=l.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>({id:b.id,initial:b.timedBombSeconds}));
 const tick=t=>{m.tick(t);seconds+=t;assert(!m.snapshot().failed,`Deadline expired at ${seconds}`);};
 function auto(id,previous){const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return;const sides=m.possibleExitSides(b);if(!sides.length)return;const s=m.snapshot(),portals=api.matchingContinuousExitPortals(s,b,sides),[x,y]=b.shape[0],inferred=previous?(b.x<previous[0]?'left':b.x>previous[0]?'right':b.y<previous[1]?'top':b.y>previous[1]?'bottom':undefined):undefined;return api.choosePortalReleaseCandidate(portals,{x:b.x+x+.5,y:b.y+y+.5},{innerX:0,innerY:0,innerWidth:s.width,innerHeight:s.height,cell:1},inferred)?.portal.side;}
 for(const[index,d]of drags.entries()){
  if(index===failedBefore){const before=m.snapshot();tick(.75);tick(.08);assert.equal(auto(blocked.blockId),undefined);m.beginAction();const b=m.getBlock(blocked.blockId),to=blocked.path[0];assert.equal(Math.abs(b.x-to[0])+Math.abs(b.y-to[1]),1);tick(.12);assert.equal(m.moveBlockStep(b.id,...to),false);assert.equal(m.commitAction(),false);tick(.08);assert.equal(m.snapshot().moves,before.moves);attempt={simulatedSeconds:1.03,atSeconds:seconds,rejectedUnitMove:to,noEffectiveMoveRecorded:true};}
  tick(.75);tick(.08);m.beginAction();let side=auto(d.blockId);assert(!side||!d.path.length);
  for(const[i,p]of d.path.entries()){const b=m.getBlock(d.blockId),from=[b.x,b.y];assert.equal(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y),1);tick(.12);assert(m.moveBlockStep(b.id,...p));side=auto(b.id,from);assert(!side||i===d.path.length-1);}
  assert.equal(side,d.exitSide);if(side)assert(m.tryExit(d.blockId,side).ok);assert(m.commitAction());for(const b of bombs)if(b.disarmedAt===undefined&&m.getBlock(b.id)?.timedBombSeconds===undefined)b.disarmedAt=seconds;tick(.08);
 }
 assert(m.snapshot().complete);assert(attempt);return{valid:true,complete:true,simulatedSeconds:seconds,timeLimitSeconds:l.timeSeconds,remainingSeconds:m.snapshot().remainingSeconds,failedAttempt:attempt,bombs,retainsActualBombDeadlines:true,noFreezeOrBoosterUsed:true,naturalClockValidated:false,pointerValidated:false};
}
for(const relative of files){
 const input=ROOT+'/'+relative,bytes=fs.readFileSync(input),d=JSON.parse(bytes),l=d.level,p=projection(l),graph=compileSpatial(p,api),model=new api.PuzzleModel(p),cases=[];let state=graph.initial.slice();model.startCountdown();
 assert(api.replayRevisedRoute(p,d.drags).complete);
 for(let i=0;i<d.drags.length;i++){
  const correct=d.drags[i],before=model.snapshot(),prefix=d.drags.slice(0,i);assertStateMatches(graph,state,before);
  if(cases.length<2&&correct.path.length){
   const nextBody=model.getBlock(correct.blockId),target=correct.path[0];assert.equal(Math.abs(nextBody.x-target[0])+Math.abs(nextBody.y-target[1]),1);
   const needed=new Set(footprint(nextBody,target).map(key)),choices=[];
   each(graph,state,(_s,cost,get)=>{if(cost!==1)return;const w=get(),b=model.getBlock(w.blockId);if(!w.path.length||b.shape.length<2||b.id===correct.blockId||cases.some(c=>c.blockId===b.id))return;const occupied=footprint(b,w.path.at(-1));if(occupied.some(q=>needed.has(key(q))))choices.push(w);},{optionalExit:false});
   for(const wrong of choices){
    const b=model.getBlock(wrong.blockId),originalAnchor=[b.x,b.y],park=wrong.path.at(-1),recovery={blockId:b.id,path:[...wrong.path.slice(0,-1).reverse(),originalAnchor]};
    const wrongReplay=api.replayRevisedRoute(p,[...prefix,wrong]);if(!wrongReplay.valid)continue;
    const blockedReplay=api.replayRevisedRoute(p,[...prefix,wrong,correct]);if(blockedReplay.valid||!blockedReplay.error?.includes('Rejected move'))continue;
    const blockedModel=modelAfter(p,[...prefix,wrong]),blockedBlock=blockedModel.getBlock(correct.blockId),blocker=blockedModel.getBlock(wrong.blockId),from=[blockedBlock.x,blockedBlock.y];
    const blockerCells=new Set(footprint(blocker).map(key)),collidingCells=footprint(blockedBlock,target).filter(q=>blockerCells.has(key(q)));
    assert(collidingCells.length);assert.equal(Math.abs(from[0]-target[0])+Math.abs(from[1]-target[1]),1);blockedModel.beginAction();assert.equal(blockedModel.moveBlockStep(correct.blockId,...target),false);assert.equal(blockedModel.commitAction(),false);
    const restored=api.replayRevisedRoute(p,[...prefix,wrong,recovery]),original=api.replayRevisedRoute(p,prefix);if(!restored.valid||restored.finalStateKey!==original.finalStateKey)continue;
    const full=[...prefix,wrong,recovery,...d.drags.slice(i)],recovered=api.replayRevisedRoute(p,full);if(!recovered.valid||!recovered.complete)continue;
    let timed;try{timed=positiveReplay(l,full,i+1,correct);}catch{continue;}
    const externalBomb=l.blocks.some(b=>b.timedBombSeconds)?replayBomb(l,full,api,true):null;if(externalBomb)assert(externalBomb.valid&&externalBomb.complete);
    cases.push({beforeDrag:i+1,blockId:b.id,color:b.layers[0],shape:b.shape,area:b.shape.length,from:originalAnchor,wrongParkAt:park,legalWrongParking:wrong,blockedNextAction:correct,blockedReason:blockedReplay.error,
      blockedUnitMove:{pathIndex:0,blockId:correct.blockId,from,to:target,manhattanDistance:1,collidingCells,blockerId:b.id,blockerFootprint:footprint(blocker),differentBlock:true,actualModelRejected:true},
      recoveryDrag:recovery,restoresExactSpatialState:true,fullRecoveredRoute:full,recoveredSpatialReplay:recovered,positiveTimeIncludingFailedAttempt:timed,independentBombReplayWithoutFailedAttempt:externalBomb,
      provesGlobalDeadEnd:false,provesOptimalPenalty:false});break;
   }
  }
  const bi=graph.blocks.findIndex(b=>b.id===correct.blockId),stage=state[bi]>>>7;model.beginAction();for(const q of correct.path){assert(model.moveBlockStep(correct.blockId,...q));state[bi]=q[1]*graph.W+q[0]|stage<<7;settle(graph,state);}if(correct.exitSide){assert(model.tryExit(correct.blockId,correct.exitSide).ok);state[bi]=stage+1<graph.blocks[bi].layers.length?(state[bi]&127)|(stage+1)<<7:NONE;settle(graph,state);}assert(model.commitAction());assertStateMatches(graph,state,model.snapshot());
 }
 assert.equal(cases.length,2,`Lv${l.id} needs two independent blockers`);assert(model.snapshot().complete);assert.equal(digest(fs.readFileSync(input)),digest(bytes));
 const output=`${OUT}/decisions${l.id}-real-blockers-${Date.now()}.json`,report={passed:true,ruleVersion:lock.activeVersion,levelId:l.id,candidateFile:input,candidateFileSha256:digest(bytes),levelSha256:digest(l),routeSha256:digest(d.drags),cases,
  replacesPriorWrongParkingEvidence:true,reason:'Earlier same-block/zero-distance rejections do not demonstrate spatial obstruction. These two cases each occupy the first target footprint of a different block with a nonzero unit move and verified collision cells.',
  criterion:{minimumBlockerArea:2,differentBlockedBlock:true,blockedMoveDistance:1,directFootprintIntersection:true,exactRestoration:true,completeRecovery:true,positiveClockIncludesRejectedAttempt:true},
  candidateUnchanged:true,humanBlindTested:false,pointerValidated:false,naturalClockValidated:false,toolSha256:digest(fs.readFileSync('tools/campaign-v145/lv121-130/round3-c/decision-repairs-v172/repair.mjs'))};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,id:l.id,cases:cases.map(c=>({step:c.beforeDrag,block:c.blockId,from:c.from,park:c.wrongParkAt,blocked:c.blockedNextAction.blockId,collision:c.blockedUnitMove.collidingCells,seconds:c.positiveTimeIncludingFailedAttempt.simulatedSeconds}))}));
}

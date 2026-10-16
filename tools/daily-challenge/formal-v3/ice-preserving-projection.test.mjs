import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadBoundedRuntime,boundedPlainTask,boundedLowerTask,selectBoundedStrategy} from './bounded-proof.mjs';
import {boundedIceTask} from './bounded-ice-proof.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayScheduledRoute} from '../formal-v2/proof-scheduled-route.mjs';
import {projectIcePreservingConstraints,assertIcePreservingDomain,expectedIcePreservingLevel,ICE_PRESERVING_PROJECTION,ICE_PRESERVING_LOWER_METHOD} from './ice-preserving-projection.mjs';

const runtime=await loadBoundedRuntime(),results=[];
const fixture=()=>({id:996411,name:'new ice-preserving inclusion qualification',difficulty:'hard',reward:0,timeSeconds:90,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},
    {id:'b',x:1,y:0,shape:[[0,0]],color:'blue',frozen:1},
    {id:'g',x:2,y:1,shape:[[0,0]],color:'green'}],
  gates:[{id:'r-out',side:'left',offset:0,size:2,color:'red'},
    {id:'b-out',side:'bottom',offset:1,size:1,color:'blue',frozen:1},
    {id:'g-out',side:'top',offset:2,size:1,color:'green',frozen:2}]});
const physical=s=>s.blocks.map(b=>[b.id,b.x,b.y,b.color,b.layers,b.shape,b.frozen]).sort((a,b)=>a[0].localeCompare(b[0]));
const ice=s=>[...s.gates,...s.flipDoors].map(g=>[g.id,g.frozen]);
function semanticKey(model){
  const s=model.snapshot();delete s.moves;
  // Animation IDs contain model namespaces, irrelevant to transition meaning.
  // Preserve the full multiset of captured eligible doors, including empty
  // events. Their completion order is still explicitly enumerated below.
  const events=(s.pendingExitAnimations??[]).map(id=>[...(s.pendingExitFlipDoorIds?.[id]??[])].sort()).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  delete s.pendingExitAnimations;delete s.pendingExitFlipDoorIds;
  return JSON.stringify([s,events]);
}
function relation(real,loose){
  const a=real.snapshot(),b=loose.snapshot();
  assert.deepEqual(physical(a),physical(b),'all actual live bodies and their ice remain equal');
  assert.deepEqual(ice(a),ice(b),'ordinary and flip ice keep original resolution order and values');
  assert.equal(a.cleared,b.cleared);assert.equal(a.complete,b.complete);
}

/** Every legal original unit move, clear and arbitrary pending-animation
 * completion has a matching projected action (or zero-action animation).
 * Unit inclusion composes through an uninterrupted held path; a separate
 * turned-hold test below verifies its endpoint cost rather than per-step cost.
 */
function exhaustInclusion(level){
  const projection=projectIcePreservingConstraints(level,runtime),r=new runtime.PuzzleModel(level,{deferExitCompletion:true}),p=new runtime.PuzzleModel(projection.projectedLevel);
  r.start();p.start();const queue=[[r,p]],seen=new Set([semanticKey(r)]);
  let moves=0,clears=0,events=0,completeWorlds=0;
  const add=(real,loose)=>{relation(real,loose);const key=semanticKey(real);if(seen.has(key))return;
    assert(seen.size<10000,'finite new-fixture qualification graph');seen.add(key);queue.push([real,loose]);};
  for(let at=0;at<queue.length;at++){
    const [real,loose]=queue[at],snapshot=real.snapshot();relation(real,loose);
    if(snapshot.complete)completeWorlds++;
    for(const body of snapshot.blocks){
      const actions=[...[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>({kind:'move',run:m=>m.moveBlockStep(body.id,body.x+dx,body.y+dy)})),
        ...['top','right','bottom','left'].map(side=>({kind:'exit',run:m=>m.tryExit(body.id,side).ok}))];
      for(const action of actions){
        const rr=real.clone(),pp=loose.clone();rr.beginAction();pp.beginAction();if(!action.run(rr))continue;
        assert(action.run(pp),'every original legal action must be legal in the projection');
        assert(rr.commitAction());assert(pp.commitAction());
        assert.equal(rr.snapshot().cleared-snapshot.cleared,pp.snapshot().cleared-loose.snapshot().cleared,'same clear event and nonclear action cost');
        action.kind==='move'?moves++:clears++;add(rr,pp);
      }
    }
    for(const id of snapshot.pendingExitAnimations??[]){
      const rr=real.clone(),pp=loose.clone(),before=rr.snapshot();assert(rr.completeExitAnimation(id));
      assert.deepEqual(ice(before),ice(rr.snapshot()),'animation cannot advance ice');events++;add(rr,pp);
    }
  }
  return {states:seen.size,moves,clears,animationEvents:events,completeWorlds,sourceLevelSha256:projection.sourceLevelSha256,projectedLevelSha256:projection.projectedLevelSha256};
}

const changes={
  axis:l=>{l.blocks[0].movementAxis='horizontal';},
  key:l=>{l.blocks[1].frozen=2;l.blocks[1].lockedBy='green-key';l.blocks[2].keyId='green-key';l.gates[2].frozen=1;},
  star:l=>{l.blocks[0].star=true;l.gates[0].size=1;delete l.gates[2].frozen;l.gates.push({id:'r-star',side:'left',offset:1,size:1,color:'red',star:true,frozen:1});},
  grid:l=>{l.coloredGrids=[{id:'red-square',color:'red',cells:[[0,1]]}];},
  flip:l=>{l.flipDoors=[{...l.gates.splice(1,1)[0],initiallyOpen:true}];},
  mixed:l=>{l.blocks[0].star=true;l.gates[0].star=true;l.blocks[1].lockedBy='green-key';l.blocks[2].keyId='green-key';
    l.blocks[2].movementAxis='vertical';l.gates[2].frozen=1;l.coloredGrids=[{id:'red-square',color:'red',cells:[[0,1]]}];
    l.flipDoors=[{...l.gates.splice(1,1)[0],initiallyOpen:false}];},
};
for(const [name,change]of Object.entries(changes))test(`all new-model actions preserve real ice while erasing ${name}`,()=>{
  const level=fixture();change(level);const before=levelSha256(level),result=exhaustInclusion(level);
  assert.equal(levelSha256(level),before);assert(result.moves>0&&result.clears>0&&result.completeWorlds>0,'each mechanism fixture must reach real clears and completion');
  if(name==='flip'||name==='mixed')assert(result.animationEvents>0);
  results.push({name,...result});
});

test('locked body ice ticks on other clears; frozen flip eligibility does not alter its ice decrement',()=>{
  const level=fixture();changes.key(level);changes.flip(level);
  const projected=projectIcePreservingConstraints(level,runtime),real=new runtime.PuzzleModel(level,{deferExitCompletion:true}),loose=new runtime.PuzzleModel(projected.projectedLevel);
  real.start();loose.start();real.beginAction();loose.beginAction();
  const r=real.tryExit('r','left');assert(r.ok);assert(loose.tryExit('r','left').ok);assert(real.commitAction());assert(loose.commitAction());
  assert.equal(real.getBlock('b').lockedBy,'green-key');assert.equal(real.getBlock('b').frozen,1);
  assert.equal(real.snapshot().flipDoors[0].frozen,0);relation(real,loose);
  const wasOpen=real.snapshot().flipDoors[0].open;assert(real.completeExitAnimation(r.exitAnimationId));
  assert.equal(real.snapshot().flipDoors[0].open,wasOpen,'door frozen before that clear is excluded from the delayed toggle');relation(real,loose);
});

test('a held turn clears with zero nonclear cost and the projection retains strictly useful ice',()=>{
  const level=fixture();level.width=2;level.height=2;level.blocks=level.blocks.slice(0,2);delete level.blocks[1].frozen;
  level.gates=[{id:'red',side:'top',offset:0,size:1,color:'red',frozen:1},{id:'blue',side:'left',offset:0,size:1,color:'blue'}];
  level.blocks[0].star=true;level.gates[0].star=true;level.blocks[1].keyId='token';
  const projection=projectIcePreservingConstraints(level,runtime),kept=boundedIceTask(projection.projectedLevel,runtime,{floor:1});
  assert.equal(kept.thresholdProven,true);
  const erased=structuredClone(projection.projectedLevel);delete erased.gates[0].frozen;
  assert.equal(boundedPlainTask(erased,runtime,{floor:1}).cost,0);
  const route=[{blockId:'r',path:[[0,1]]},{blockId:'b',path:[[0,0]],exitSide:'left'},
    {blockId:'r',path:[[1,1],[1,0],[0,0]],exitSide:'top'}];
  for(const input of [level,projection.projectedLevel]){
    const model=new runtime.PuzzleModel(input);model.start();let nonclear=0;
    for(const drag of route){model.beginAction();const before=model.snapshot().cleared;
      for(const point of drag.path)assert(model.moveBlockStep(drag.blockId,...point));
      if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
      nonclear+=Number(model.snapshot().cleared===before);
    }
    assert(model.snapshot().complete);assert.equal(nonclear,1,'three-segment final turn remains one zero-cost clear hold');
  }
  results.push({name:'strictly-useful-preserved-ice',L:1,knownOriginalU:1,plainErasureMinimum:0,projection});
});

test('inventory, shells, synthetic and unknown fields are never accepted',()=>{
  const mutations=[l=>l.blocks[0].layers=['red','blue'],l=>l.blocks[0].shutterId='cover',l=>l.shutters=[{}],
    l=>l.generators=[{}],l=>l.elevators=[{}],l=>l.conveyors=[{}],
    l=>l.dailyProof={},l=>l.pulseRescue={},l=>l.blocks[0].futureRule=true,l=>l.gates[0].futureRule=true,
    l=>l.flipDoors=[{...l.gates[0],id:'future',initiallyOpen:true,futureRule:true}],l=>l.coloredGrids=[{id:'grid',color:'red',cells:[[0,0]],futureRule:true}]];
  for(const mutate of mutations){const l=fixture();mutate(l);assert.throws(()=>assertIcePreservingDomain(l));assert.throws(()=>projectIcePreservingConstraints(l,runtime));}
});

test('active, frozen and key-locked bombs erase only a deadline; cancel and failure preserve the ice relation',()=>{
  const level=fixture();level.bombFailurePolicy='fail';
  level.blocks[0].keyId='red-key';level.blocks[2].lockedBy='red-key';
  for(const b of level.blocks)b.timedBombSeconds=2;
  const projection=projectIcePreservingConstraints(level,runtime),real=new runtime.PuzzleModel(level),loose=new runtime.PuzzleModel(projection.projectedLevel);
  assert(!('bombFailurePolicy' in projection.projectedLevel));
  assert(projection.projectedLevel.blocks.every(b=>!('timedBombSeconds' in b)));
  assert.equal(projection.realDeadlineValidationRequiredForUpper,true);
  real.startCountdown();loose.startCountdown();relation(real,loose);
  const checkpoints=[];
  const check=name=>{relation(real,loose);checkpoints.push({name,cleared:real.snapshot().cleared,
    blocks:real.snapshot().blocks.map(b=>({id:b.id,frozen:b.frozen,seconds:b.timedBombSeconds,active:real.isBlockActive(b)})),
    failed:real.snapshot().failed});};
  assert.equal(real.tick(.25),false,'clock does not report a spatial mutation');check('initial-active-only');
  assert.equal(real.getBlock('r').timedBombSeconds,1.75);
  assert.equal(real.getBlock('b').timedBombSeconds,2);assert.equal(real.getBlock('g').timedBombSeconds,2);
  real.beginAction();loose.beginAction();assert(real.moveBlockStep('r',0,1));assert(loose.moveBlockStep('r',0,1));
  real.tick(.25);real.cancelAction();loose.cancelAction();check('cancel-restores-space-without-refunding-clock');
  assert.equal(real.getBlock('r').timedBombSeconds,1.5);assert.equal(real.getBlock('r').y,0);
  real.beginAction();loose.beginAction();assert(real.tryExit('r','left').ok);assert(loose.tryExit('r','left').ok);
  assert(real.commitAction());assert(loose.commitAction());check('one-real-clear-unfreezes-and-unlocks');
  assert.equal(real.getBlock('b').frozen,0);assert(real.isBlockActive(real.getBlock('g')));
  real.tick(.5);check('newly-active-clocks-run-without-an-ice-event');
  assert.equal(real.getBlock('b').timedBombSeconds,1.5);assert.equal(real.getBlock('g').timedBombSeconds,1.5);
  const beforeFailure={bodies:physical(real.snapshot()),ice:ice(real.snapshot()),cleared:real.snapshot().cleared};
  real.tick(2);check('timeout-fails-without-removal-motion-or-ice');
  assert(real.snapshot().failed);assert(!loose.snapshot().failed);
  assert.deepEqual({bodies:physical(real.snapshot()),ice:ice(real.snapshot()),cleared:real.snapshot().cleared},beforeFailure);
  assert.equal(real.snapshot().blocks.length,2);assert.equal(real.tick(.5),false);
  results.push({name:'bomb-deadline-counter-mapping',sourceLevelSha256:levelSha256(level),projection,checkpoints});
});

test('deadline removal cannot turn an expired original route into an accepted upper witness',()=>{
  const level=fixture();level.width=2;level.height=2;level.blocks=level.blocks.slice(0,2);delete level.blocks[1].frozen;
  level.gates=[{id:'red',side:'top',offset:0,size:1,color:'red',frozen:1},{id:'blue',side:'left',offset:0,size:1,color:'blue'}];
  level.bombFailurePolicy='fail';for(const b of level.blocks)b.timedBombSeconds=10;
  const projection=projectIcePreservingConstraints(level,runtime),proof=boundedIceTask(projection.projectedLevel,runtime,{floor:1});
  assert(proof.thresholdProven);assert.equal(selectBoundedStrategy(level,{providedRoute:true}).lower,'ice-preserving');
  const route=[{blockId:'r',path:[[0,1]]},{blockId:'b',path:[[0,0]],exitSide:'left'},{blockId:'r',path:[[0,0]],exitSide:'top'}];
  const schedule={kind:'per-drag-and-unit-step-v1',secondsPerDrag:.1,secondsPerUnitStep:.1,
    secondsPerExitAnimation:runtime.animationTiming.minimumSettledExitSeconds};
  const canonical=replayScheduledRoute(runtime,level,route,schedule),independent=independentReplay(runtime,level,route,{timeSchedule:schedule});
  for(const replay of [canonical,independent]){
    assert(replay.valid&&replay.complete&&!replay.failed,JSON.stringify(replay));
    assert.equal(replay.nonClearingDrags,1);assert.equal(replay.clearEvents,2);assert.equal(replay.simulationTimeValidated,true);
    assert.equal(replay.naturalTimeValidated,false,'controlled ticks never stand for natural-clock Pointer');
  }
  const expiredSchedule={...schedule,secondsPerDrag:11};
  const expired=replayScheduledRoute(runtime,level,route,expiredSchedule),expiredIndependent=independentReplay(runtime,level,route,{timeSchedule:expiredSchedule});
  assert.equal(expired.valid,false);assert.equal(expiredIndependent.valid,false);
  assert.equal(expired.simulationTimeValidated,false);assert.equal(expired.complete,false);
  results.push({name:'deadline-preserved-original-upper',sourceLevelSha256:levelSha256(level),projection,proof,
    canonical,independent,expired,expiredIndependent});
});

test('invalid deadlines still fail authoritative validation before a projected lower search',()=>{
  for(const seconds of [0,-1,NaN,Infinity]){
    const level=fixture();level.blocks[0].timedBombSeconds=seconds;
    assert.throws(()=>projectIcePreservingConstraints(level,runtime),/invalid timedBombSeconds/);
  }
});

test('unified lower fixes the preserved-ice image before search and binds source, image, raw budget and tool',()=>{
  const level=fixture();changes.mixed(level);
  assert.deepEqual(selectBoundedStrategy(level,{providedRoute:true}),{route:'provided',lower:'ice-preserving'});
  const lower=boundedLowerTask(runtime,level,1,{maxStates:100});
  assert.equal(lower.method,ICE_PRESERVING_LOWER_METHOD);assert.equal(lower.inputLevelSha256,levelSha256(level));
  assert.equal(lower.projectedLevelSha256,levelSha256(expectedIcePreservingLevel(level)));
  assert.equal(lower.result.sourceLevelSha256,lower.projectedLevelSha256);
  assert.equal(lower.result.iceProofSha256,runtime.toolchainSha256);
  assert.equal(lower.result.discoveredStates,lower.result.rawFullBoardStates);
  assert.equal(lower.result.exploredStates,lower.result.rawExploredStates);
  assert.equal(lower.projection.upperBoundTransfer,false);
  const wrong=structuredClone(lower.projection.projectedLevel);delete wrong.gates.find(g=>g.frozen).frozen;
  assert.notEqual(levelSha256(wrong),levelSha256(expectedIcePreservingLevel(level)),'deleting real ice cannot impersonate this projection');
  assert.equal(selectBoundedStrategy({...level,blocks:level.blocks.map((b,i)=>i?b:{...b,layers:['red','blue'],color:'blue'})}).lower,'projected-plain');
  const interrupted=boundedLowerTask(runtime,level,1,{maxStates:1});
  assert.equal(interrupted.method,ICE_PRESERVING_LOWER_METHOD);assert.equal(interrupted.result.status,'unknown');
  assert.equal(interrupted.result.thresholdProven,false,'no automatic plain fallback after a failed ice-preserving task');
});

test.after(async()=>{
  if(!process.env.ICE_PROJECTION_QUALIFICATION_OUT)return;
  const dir=process.env.ICE_PROJECTION_QUALIFICATION_OUT;await fs.mkdir(dir,{recursive:false});
  await fs.writeFile(`${dir}/report.json`,JSON.stringify({schemaVersion:1,status:'PRESERVED_ICE_SIMULATION_QUALIFIED',
    method:ICE_PRESERVING_PROJECTION,toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,
    totalStates:results.reduce((n,r)=>n+(r.states??0),0),totalMoves:results.reduce((n,r)=>n+(r.moves??0),0),
    totalClears:results.reduce((n,r)=>n+(r.clears??0),0),totalAnimationEvents:results.reduce((n,r)=>n+(r.animationEvents??0),0),
    results,oldCandidateSearches:0,productionChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});

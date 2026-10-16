import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime, independentReplay, solverSupport } from './contract.mjs';
import { replayScheduledRoute } from './proof-scheduled-route.mjs';

const api=await loadRuntime();
const schedule={kind:'per-drag-and-unit-step-v1',secondsPerDrag:.2,secondsPerUnitStep:.2,secondsPerExitAnimation:.4};
const fixture=()=>({id:998,name:'clock qualification',difficulty:'hard',reward:0,timeSeconds:20,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:[{id:'red',x:2,y:0,color:'red',shape:[[0,0]],timedBombSeconds:2},
    {id:'blue',x:0,y:1,color:'blue',shape:[[0,0]]}],
  gates:[{id:'blue-out',side:'left',offset:1,size:1,color:'blue'}],
  flipDoors:[{id:'red-out',side:'right',offset:0,size:1,color:'red',initiallyOpen:false}]});
const drags=[{blockId:'blue',path:[],exitSide:'left'},{blockId:'red',path:[],exitSide:'right'}];

test('bomb deadlines and deferred door completions are replayed on the unchanged original object',()=>{
  const level=fixture(),before=JSON.stringify(level);
  assert.equal(solverSupport(level).supported,false);
  assert.equal(solverSupport(level,{timeSchedule:schedule}).supported,true);
  const canonical=replayScheduledRoute(api,level,drags,schedule),independent=independentReplay(api,level,drags,{timeSchedule:schedule});
  for(const r of [canonical,independent]){
    assert.equal(r.valid,true,r.error);assert.equal(r.complete,true);assert.equal(r.nonClearingDrags,0);
    assert.equal(r.simulationTimeValidated,true);assert.equal(r.naturalTimeValidated,false);assert.equal(r.timeValidated,false);
    assert(Math.abs(r.elapsedSeconds-1.2)<1e-9);
  }
  assert(Math.abs(canonical.trace[0].bombs[0].seconds-1.4)<1e-9);
  assert.equal(canonical.trace[0].flipDoors[0].open,true);
  assert.equal(JSON.stringify(level),before);
});

test('time consumed while another departure animates may expire an active bomb',()=>{
  const level=fixture();level.blocks[0].timedBombSeconds=.5;
  for(const r of [replayScheduledRoute(api,level,drags,schedule),independentReplay(api,level,drags,{timeSchedule:schedule})]){
    assert.equal(r.valid,false);assert.match(r.error,/deadline expired/);
  }
});

test('invalid timing, original level-clock expiry and noncanonical exits fail closed',()=>{
  for(const patch of [{secondsPerExitAnimation:.1},{secondsPerUnitStep:0},{secondsPerDrag:Infinity},{unknown:1}]) {
    const r=replayScheduledRoute(api,fixture(),drags,{...schedule,...patch});assert.equal(r.valid,false);
  }
  const short=fixture();short.timeSeconds=.5;
  assert.equal(replayScheduledRoute(api,short,drags,schedule).valid,false);
  const wrong=[{blockId:'blue',path:[],exitSide:'bottom'},drags[1]];
  assert.match(replayScheduledRoute(api,fixture(),wrong,schedule).error,/Canonical exit mismatch/);
});

test('scheduled unit steps cost real time; canonical contact ends the gesture',()=>{
  const level={...fixture(),width:3,height:3,flipDoors:[],
    blocks:[{id:'red',x:1,y:1,color:'red',shape:[[0,0]],timedBombSeconds:.3}],
    gates:[{id:'red-out',side:'top',offset:1,size:1,color:'red'}]};
  const route=[{blockId:'red',path:[[1,0]],exitSide:'top'}];
  assert.match(replayScheduledRoute(api,level,route,schedule).error,/deadline expired/);
  level.blocks[0].timedBombSeconds=1;
  assert.equal(replayScheduledRoute(api,level,route,schedule).complete,true);
});

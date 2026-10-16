import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntime, levelSha256, routeSha256, verifyCandidate, finiteBudget, proveCandidateLower, independentReplay, solverSupport } from './contract.mjs';
import { checkPlainFloor } from './proof-plain.mjs';

const api = await loadRuntime();
const tiny = () => ({ id: 990001, name:'plain qualification', mechanismRules:'revised-2026-09-27-v1.5',
  difficulty:'hard', timeSeconds:120, reward:0, width:2,height:2,
  blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'}, {id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],
  gates:[{id:'gate-r',side:'right',offset:0,size:1,color:'red'}, {id:'gate-b',side:'left',offset:0,size:1,color:'blue'}] });

test('full canonical binding includes seams, clocks, rule profile and rescue fields', () => {
  const level=tiny(), hash=levelSha256(level);
  assert.equal(hash,levelSha256(Object.fromEntries(Object.entries(level).reverse())));
  for(const patch of [{seams:[{orientation:'horizontal',offset:1,start:0,size:2}]},{timeSeconds:121},
    {mechanismRules:'legacy'},{rocketRescue:{targetBlockId:'a'}}]) assert.notEqual(hash,levelSha256({...level,...patch}));
});

test('proof toolchain binds physics and solver files without self-referential registry data', () => {
  const files=Object.keys(api.toolchainBindings);
  for(const required of ['src/core/PuzzleModel.ts','src/core/revisedLevelSearch.ts',
    'tools/daily-challenge/formal-v2/proof-plain.mjs','tools/daily-challenge/formal-v2/contract.mjs']) assert(files.includes(required));
  assert.equal(files.some(path=>/dailyChallenge|DailyChallengeData|(?:^|\/)levels\.ts$|LevelData\.ts$/i.test(path)),false);
  assert.equal(api.toolchainSha256,levelSha256(api.toolchainBindings));
});

test('no initial boundary exit does not imply a nonclearing drag', () => {
  const level={...tiny(),width:3,height:3,blocks:[{id:'a',x:1,y:1,shape:[[0,0]],color:'red'}],gates:[{id:'r',side:'top',offset:1,size:1,color:'red'}]};
  const proof=checkPlainFloor(level,api,{floor:1,maxMilliseconds:1000});
  assert.equal(proof.status,'relaxed-shortcut');assert.equal(proof.cost,0);
  const replay=api.replayRevisedRoute(level,proof.drags);
  assert.equal(replay.valid,true);assert.equal(replay.complete,true);assert.equal(replay.nonClearingDrags,0);
});

test('plain closure and quotient agree with complete generic lower search on all 2x2 two-body poses', () => {
  for(let first=0;first<4;first++)for(let second=0;second<4;second++)if(first!==second)for(const floor of [1,2]) {
    const level=tiny();Object.assign(level.blocks[0],{x:first%2,y:Math.floor(first/2)});Object.assign(level.blocks[1],{x:second%2,y:Math.floor(second/2)});
    const options={floor,maxStates:2000,maxTransitions:100000,maxMilliseconds:2000,maxDragStates:100};
    const plain=checkPlainFloor(level,api,options),full=api.checkRevisedRepositionFloor(level,options);
    assert.equal(plain.status,full.status,JSON.stringify({first,second,floor,plain,full}));
    if(plain.status==='relaxed-shortcut')assert.equal(plain.cost,full.relaxedNonClearingDrags);
  }
});

test('interchangeable same-color bodies preserve the generic floor decision', () => {
  for(const poses of [[0,1,2],[1,3,5],[0,4,5],[2,3,4]])for(const floor of [1,2]) {
    const level={...tiny(),width:3,height:2,gates:[{id:'r',side:'top',offset:0,size:1,color:'red'}],
      blocks:poses.map((p,i)=>({id:`same-${i}`,x:p%3,y:Math.floor(p/3),shape:[[0,0]],color:'red'}))};
    const options={floor,maxStates:5000,maxTransitions:100000,maxMilliseconds:2000,maxDragStates:100};
    const plain=checkPlainFloor(level,api,options),full=api.checkRevisedRepositionFloor(level,options);
    assert.equal(plain.status,full.status);
    if(plain.status==='relaxed-shortcut')assert.equal(plain.cost,full.relaxedNonClearingDrags);
  }
});

test('bounded proof returns unknown when interrupted and reconstructs a shortest qualified route', () => {
  const level=tiny();
  const interrupted=checkPlainFloor(level,api,{floor:2,maxStates:1,maxMilliseconds:1000});
  assert.equal(interrupted.status,'unknown');assert.equal(interrupted.thresholdProven,false);
  const proof=checkPlainFloor(level,api,{floor:1,searchUpper:3,maxStates:1000,maxMilliseconds:1000});
  assert.equal(proof.status,'threshold-proven');assert.equal(proof.cost,1);
  const replay=api.replayRevisedRoute(level,proof.drags);
  assert.equal(replay.valid,true);assert.equal(replay.complete,true);assert.equal(replay.nonClearingDrags,1);
});

test('plain proof refuses dynamics, even superficially harmless metadata', () => {
  for(const [key,value] of [['frozen',1],['movementAxis','horizontal'],['star',true],['timedBombSeconds',999999],['keyId','k'],['rotationBadge',false]]) {
    const level=tiny();level.blocks[0][key]=value;assert.equal(checkPlainFloor(level,api,{floor:1}).status,'unsupported',key);
  }
  const level=tiny();level.blocks[0].layers=['red','blue'];assert.equal(checkPlainFloor(level,api,{floor:1}).status,'unsupported');
  const future=tiny();future.unknownMovingWalls=[];assert.equal(checkPlainFloor(future,api,{floor:1}).status,'unsupported');
  assert.throws(()=>checkPlainFloor(tiny(),api,{floor:1,maxMilliseconds:60_001}));
  assert.throws(()=>finiteBudget({maxMilliseconds:Infinity}));
  assert.throws(()=>finiteBudget({maxMilliseconds:60_001}));
});

const fullFixture = () => ({...tiny(),blocks:[{id:'a',x:0,y:0,shape:[[0,0],[0,1]],color:'red'},
  {id:'b',x:1,y:0,shape:[[0,0],[0,1]],color:'blue'}],gates:[{id:'r',side:'bottom',offset:0,size:1,color:'red'},
  {id:'gate-b',side:'top',offset:1,size:1,color:'blue'}]});
const inputFor = level => ({formalId:'daily-mechanisms-color-exit-1-d3-01',stageKey:'mechanisms-color-exit-1',difficulty:3,sourceLevelId:level.id,level,
  drags:[{blockId:'a',path:[],exitSide:'bottom'},{blockId:'b',path:[],exitSide:'top'}]});

test('external PASS metadata cannot turn a complete below-band route into acceptance', async () => {
  const level=fullFixture(),runtime={...api,LEVELS:[level]},candidate=inputFor(level);
  const result=await verifyCandidate(runtime,{...candidate,lowerBound:{thresholdProven:true,floor:31},proofStatus:'threshold-proven'});
  assert.equal(result.status,'COUNTEREXAMPLE_BELOW_BAND');assert.equal(result.U,0);assert.equal(result.accepted,false);assert.equal(result.formalReady,false);
});

test('source/level/route hashes and final runtime id/reward are mandatory consistent bindings', async () => {
  const level=fullFixture(),runtime={...api,LEVELS:[level]},candidate=inputFor(level);
  for(const patch of [{levelSha256:'0'.repeat(64)},{sourceLevelSha256:'0'.repeat(64)},
    {level:{...level,id:9999}},{level:{...level,reward:1}}]) {
    const result=await verifyCandidate(runtime,{...candidate,...patch});assert.equal(result.status,'BLOCKED_STATIC');assert.equal(result.accepted,false);
  }
  const result=await verifyCandidate(runtime,{...candidate,routeSha256:routeSha256([])});
  assert.equal(result.status,'REJECTED_ROUTE_SHA');assert.equal(result.accepted,false);
});

test('fresh constraint lower evidence binds both exact objects, without reusing supplied proof', () => {
  const level=tiny();level.blocks[0].frozen=1;level.gates[0].frozen=1;
  const before=levelSha256(level),lower=proveCandidateLower(api,level,1,{maxMilliseconds:1000});
  assert.equal(lower.method,'fresh-static-constraint-erasure-plain-floor-v2');
  assert.equal(lower.inputLevelSha256,before);assert.equal(levelSha256(level),before);
  assert.notEqual(lower.projectedLevelSha256,before);
  assert.equal(lower.result.sourceLevelSha256,lower.projectedLevelSha256);
  assert.equal(lower.projection.upperBoundTransfer,false);assert.equal(lower.result.thresholdProven,false);
});

test('mixed shell plus flip uses qualified inventory erasure instead of old marker qualification', () => {
  const level=tiny();level.blocks[0].layers=['red','blue'];level.flipDoors=[{...level.gates.shift(),initiallyOpen:true}];
  const lower=proveCandidateLower(api,level,1,{maxMilliseconds:1000});
  assert.equal(lower.method,'fresh-opening-inventory-erasure-plain-floor-v2');
  assert.equal(lower.projection.retainedOuterBodies[0].initialLayers,2);
  assert.equal(lower.result.thresholdProven,false);
  level.unqualifiedFutureRules=true;
  assert.equal(proveCandidateLower(api,level,1,{maxMilliseconds:1000}).result.status,'unsupported');
});

test('full physical shutter lower retains hidden bodies before inventory-erasure fallback', () => {
  const level=tiny();level.blocks[0].shutterId='cover';
  level.shutters=[{id:'cover',x:0,y:0,width:1,height:1,count:1}];
  const before=levelSha256(level),lower=proveCandidateLower(api,level,1,{maxMilliseconds:1000});
  assert.equal(lower.method,'fresh-full-physical-shutter-materialization-plain-floor-v2');
  assert.equal(lower.inputLevelSha256,before);assert.equal(levelSha256(level),before);
  assert.equal(lower.projection.preservesAllBodies,true);
  assert.equal(lower.projection.projectedLevel.blocks.length,level.blocks.length);
  assert.equal(lower.result.sourceLevelSha256,lower.projectedLevelSha256);
  assert.equal(lower.projection.upperBoundTransfer,false);assert.equal(lower.result.thresholdProven,false);
  assert(api.toolchainBindings['tools/daily-challenge/formal-v2/shutter-materialization-projection.mjs']);
  level.shutters[0].skin='lift';
  assert.equal(proveCandidateLower(api,level,1,{maxMilliseconds:1000}).method,'fresh-opening-inventory-erasure-plain-floor-v2');
});

test('fresh deferred-exit route waits for each flip completion, including v1.5 thaw eligibility', () => {
  for (const frozen of [0,1]) {
    const level={...tiny(),width:3,height:2,
      blocks:[{id:'a',x:2,y:0,shape:[[0,0]],color:'red'},
        {id:'b',x:0,y:0,shape:[[0,0]],color:'blue'}, {id:'c',x:1,y:1,shape:[[0,0]],color:'green'}],
      gates:[{id:'b-out',side:'left',offset:0,size:1,color:'blue'}, {id:'c-out',side:'bottom',offset:1,size:1,color:'green'}],
      flipDoors:[{id:'a-out',side:'right',offset:0,size:1,color:'red',initiallyOpen:false,...(frozen?{frozen}:{})}]};
    const route=frozen?[{blockId:'b',path:[],exitSide:'left'},{blockId:'c',path:[],exitSide:'bottom'},{blockId:'a',path:[],exitSide:'right'}]
      :[{blockId:'b',path:[],exitSide:'left'},{blockId:'a',path:[],exitSide:'right'},{blockId:'c',path:[],exitSide:'bottom'}];
    assert.equal(solverSupport(level).supported,true);
    const canonical=api.replayRevisedRoute(level,route),deferred=independentReplay(api,level,route);
    assert.equal(canonical.complete,true,JSON.stringify(canonical));assert.equal(deferred.valid,true,JSON.stringify(deferred));assert.equal(deferred.complete,true);
    assert.equal(deferred.clearEvents,3);assert.equal(deferred.nonClearingDrags,0);assert.equal(deferred.timeValidated,false);
    assert(deferred.trace.every(step=>step.exitCompletionAcknowledged));
    assert.equal(deferred.trace[0].flipDoorsBeforeCompletion[0].open,false);
    assert.equal(deferred.trace[0].flipDoorsAfterCompletion[0].open,frozen===0);
    const invalid=independentReplay(api,level,[{blockId:'a',path:[],exitSide:'right'}]);
    assert.equal(invalid.valid,false);
  }
});

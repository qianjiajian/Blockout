import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadLeagueProofRuntime,boundedBudget,boundedPlainTask,boundedUpperSearch,createLeagueAttemptLedger,leagueBand,
  auditLeagueScoring,openingExitAudit,auditLeagueStatic,levelSha256,probePlainLeagueLevel,verifyLeagueCandidate} from './proof-contract.mjs';

const runtime=await loadLeagueProofRuntime();
const tiny=()=>({id:900001,name:'test-only fixture; not formal content',difficulty:'hard',reward:0,timeSeconds:180,
  mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
  blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],
  gates:[{id:'r',side:'right',offset:0,size:1,color:'red'},{id:'b-out',side:'left',offset:0,size:1,color:'blue'}]});
const temp=async name=>{await fs.mkdir('deliverables/league-v2-20261008/proof/tests',{recursive:true});return fs.mkdtemp(`deliverables/league-v2-20261008/proof/tests/${name}-`);};

test('league band cadence and exact full-board budget are bounded',()=>{
  assert.deepEqual(leagueBand(3),{difficulty:2,lower:21,upper:30});assert.deepEqual(leagueBand(100),{difficulty:1,lower:16,upper:20});
  assert.throws(()=>leagueBand(101));assert.throws(()=>boundedBudget({maxStates:10001}));assert.throws(()=>boundedBudget({maxStates:Infinity}));
  assert.throws(()=>boundedBudget({maxMilliseconds:Infinity}));assert.equal(boundedBudget().maxStates,10000);
});
test('complete held-turn lower and actual upper agree on test fixture',()=>{
  const level=tiny(),proof=boundedPlainTask(level,runtime,{floor:1,searchUpper:3});
  assert.equal(proof.status,'threshold-proven');assert.equal(proof.cost,1);assert(proof.microExploredStates>0&&proof.microNeighborChecks>0);
  const replay=runtime.replayRevisedRoute(level,proof.drags);assert.equal(replay.valid,true);assert.equal(replay.complete,true);assert.equal(replay.nonClearingDrags,1);
  const upper=boundedUpperSearch(runtime,level);assert.equal(upper.witnessFound,true);assert.equal(upper.replay.complete,true);
});
test('resource exhaustion retains UNKNOWN and never accepts partial floor',()=>{
  for(const limit of [{maxStates:1},{maxTransitions:1},{maxMicroStates:1}]){
    const lower=boundedPlainTask(tiny(),runtime,{floor:1,searchUpper:3,...limit});
    assert.equal(lower.status,'unknown');assert.equal(lower.thresholdProven,false);
    const upper=boundedUpperSearch(runtime,tiny(),limit);assert.equal(upper.status,'unknown');assert.equal(upper.witnessFound,false);
    for(const result of [lower,upper]){assert(result.discoveredStates<=result.budget.maxStates);assert(result.exploredStates<=result.budget.maxStates);assert(result.microDiscoveredStates<=result.budget.maxMicroStates);assert(result.attemptedTransitions<=result.budget.maxTransitions);}
  }
});
test('raw complete board cap counts each closure removal even when quotient has one state',()=>{
  const level=tiny();level.gates[0].side='left';level.gates[1].side='right';
  const result=boundedPlainTask(level,runtime,{floor:1,searchUpper:3});
  assert.equal(result.cost,0);assert.equal(result.rawFullBoardStates,3);assert.equal(result.discoveredStates,3);assert.equal(result.quotientDiscoveredStates,1);
  const limited=boundedPlainTask(level,runtime,{floor:1,searchUpper:3,maxStates:2});
  assert.equal(limited.status,'unknown');assert.equal(limited.thresholdProven,false);assert.equal(limited.termination,'max-raw-board-states');
  assert.equal(limited.rawFullBoardStates,2);assert.equal(limited.quotientDiscoveredStates,0);
});
test('ledger cannot restart failed input, rename metadata, omit redesign parent or change only colour/shape',async()=>{
  const directory=await temp('ledger'),ledger=await createLeagueAttemptLedger(directory),level=tiny(),a=await ledger.claim(level,{attemptKey:'slot'});
  await assert.rejects(()=>ledger.claim(level,{attemptKey:'slot'}),/ATTEMPT_STILL_OPEN/);
  await ledger.finish(a,{accepted:false,status:'UNKNOWN_LOWER'});
  await assert.rejects(()=>ledger.claim({...level,id:54,name:'renamed'},{attemptKey:'slot'}),/BOTH_COLOUR_AND_SHAPE/);
  const color=structuredClone(level);color.blocks[0].color='green';await assert.rejects(()=>ledger.claim(color,{attemptKey:'slot'}),/BOTH_COLOUR_AND_SHAPE/);
  const shape=structuredClone(level);shape.blocks[0].shape=[[0,0],[0,1]];await assert.rejects(()=>ledger.claim(shape,{attemptKey:'slot'}),/BOTH_COLOUR_AND_SHAPE/);
  shape.blocks[0].color='green';const b=await ledger.claim(shape,{attemptKey:'slot'});assert.equal(b.redesignOf,a.id);
  await ledger.finish(b,{accepted:false,status:'UNKNOWN_LOWER'});
  await assert.rejects(()=>ledger.claim(level,{attemptKey:'different-key'}),/INPUT_ALREADY_ATTEMPTED/);
});
test('probe persists exact object and independently replayed witness, not caller-supplied proof',async()=>{
  const level=tiny(),directory=await temp('probe'),report=await probePlainLeagueLevel(runtime,{level,sourceLevelId:1,attemptKey:'single',lowerBound:{status:'threshold-proven'}},{floor:1,searchUpper:3,ledgerDirectory:directory});
  assert.equal(report.accepted,true);assert.equal(report.L,1);assert.equal(report.U,1);assert.equal(report.levelSha256,levelSha256(level));
  const saved=JSON.parse(await fs.readFile(report.proofReceipt,'utf8'));assert.equal(saved.lower.sourceLevelSha256,report.levelSha256);assert.equal(saved.toolchainSha256,runtime.toolchainSha256);
});
test('invalid budget fails before claim; explicit retry of prior zero-search configuration error preserves old record',async()=>{
  const directory=await temp('configuration'),level=tiny();
  await assert.rejects(()=>verifyLeagueCandidate(runtime,{index:1,sourceLevelId:1,level},{ledgerDirectory:directory,lowerBudget:{maxDiscoveredBoardStates:10000}}),/Invalid bounded budget/);
  assert.deepEqual(await fs.readdir(directory),[]);
  const ledger=await createLeagueAttemptLedger(directory),a=await ledger.claim(level,{attemptKey:'slot'});
  const first=await ledger.finish(a,{accepted:false,status:'INVALID',reasons:['Invalid bounded budget maxDiscoveredBoardStates: 10000'],route:{search:null}});
  const b=await ledger.claim(level,{attemptKey:'slot',retryUnsearchedConfiguration:true});assert.equal(b.configurationRetry.lowerSearchStates,0);assert.notEqual(a.id,b.id);
  assert.equal(JSON.parse(await fs.readFile(first,'utf8')).status,'INVALID');
  await ledger.finish(b,{accepted:false,status:'UNKNOWN_LOWER',lowerBound:{result:{status:'unknown',discoveredStates:10000}}});
  await assert.rejects(()=>ledger.claim(level,{attemptKey:'slot',retryUnsearchedConfiguration:true}),/BOTH_COLOUR_AND_SHAPE/);
});
test('score eligibility uses true late complete removal and real LeagueRun success/failure/discard',()=>{
  const level=tiny(),route=boundedPlainTask(level,runtime,{floor:1,searchUpper:3}).drags;
  assert.equal(openingExitAudit(runtime,level,'a').canExit,false);assert.equal(openingExitAudit(runtime,level,'b').canExit,false);
  const report=auditLeagueScoring(runtime,level,route);assert.equal(report.passed,true);assert(report.specials.length>=1&&report.specials.length<=3);
  assert.equal(report.successPoints,report.specials.length*10);assert.equal(report.failurePoints,0);assert.equal(report.discardPoints,0);
  for(const row of report.selected)assert(row.dragIndex>route.length/2);
  assert.throws(()=>auditLeagueScoring(runtime,level,route,{specials:['missing']}),/Need 1–3/);
});
test('static audit rejects preunlock shape, unknown source, missing fill and missing real colour asset',async()=>{
  const level=tiny();level.blocks[0].shape=[[0,0],[1,0],[0,1],[1,1],[1,2]];
  const report=await auditLeagueStatic(runtime,{index:1,sourceLevelId:99999,level});assert.equal(report.passed,false);assert(report.issues.includes('source-not-in-mainline-LEVELS'));
  const orange=tiny();orange.blocks[0]={...orange.blocks[0],color:'orange',shape:[[1,0],[0,1],[1,1],[2,1],[1,2]]};
  const missing=await auditLeagueStatic(runtime,{index:100,sourceLevelId:100,level:orange});assert.equal(missing.passed,false);
  assert(missing.issues.some(x=>x.startsWith('missing-art:')||x.startsWith('non-native-art-shape:')));
});

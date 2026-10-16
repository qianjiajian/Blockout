import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {loadLeagueProofRuntime,levelSha256,leagueBand,createLeagueAttemptLedger} from './proof-contract.mjs';
import {loadLeagueIceProofRuntime,verifyLeagueIceCandidate,inspectNativeIceLower,findPriorIceInputAttempt,ICE_LOWER_METHOD,ICE_CONTRACT_VERSION} from './proof-ice-contract.mjs';
import {ICE_PROOF_VERSION} from './proof-ice-bounded.mjs';
import {inspectLeagueReceipt} from './catalog-progress.mjs';

const runtime=await loadLeagueIceProofRuntime();
const parent=path.resolve('deliverables/league-v2-20261008/proof/tests');
async function temp(t){await fs.mkdir(parent,{recursive:true});const directory=await fs.mkdtemp(path.join(parent,'ice-adapter-'));t.after(async()=>{const relative=path.relative(parent,directory);assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));await fs.rm(directory,{recursive:true,force:true});});return directory;}

/** Filled, real Q0 sprite, source-2 board fixture; intentionally trivially easy
 * and NEVER an authored content candidate. Test IDs prevent concurrent fixture
 * runs from colliding with real candidate history. No difficulty is relaxed. */
function easyFixture(){
  const tag='qualification-'+randomUUID(),colors=['red','blue','green','yellow','purple','orange','pink','cyan'];
  const level={id:900006,name:'synthetic adapter fixture only',difficulty:'hard',timeSeconds:180,reward:0,mechanismRules:'revised-2026-09-27-v1.5',width:4,height:6,
    playable:Array.from({length:24},(_,i)=>[i%4,Math.floor(i/4)]),blocks:[],gates:[]};
  for(let i=0;i<8;i++){
    level.blocks.push({id:tag+'-body-'+i,x:i%4,y:i<4?0:3,shape:[[0,0],[0,1],[0,2]],color:colors[i]});
    level.gates.push({id:tag+'-gate-'+i,side:i<4?'top':'bottom',offset:i%4,size:1,color:colors[i],...(i===0?{frozen:1}:{})});
  }
  const drags=[1,2,3,4,5,6,7,0].map(i=>({blockId:level.blocks[i].id,path:[],exitSide:i<4?'top':'bottom'}));
  return{index:6,sourceLevelId:2,level,drags};
}

test('ice runtime extends bindings without changing stable runtime object/hash',async()=>{
  const stable=await loadLeagueProofRuntime();assert(!Object.hasOwn(stable.toolchainBindings,'tools/league-v2/proof-ice-contract.mjs'));
  assert(runtime.toolchainBindings['tools/league-v2/proof-ice-contract.mjs']);assert(runtime.toolchainBindings['tools/league-v2/proof-ice-bounded.mjs']);
  for(const [key,value]of Object.entries(stable.toolchainBindings))assert.equal(runtime.toolchainBindings[key],value);
  assert.equal(levelSha256(stable.toolchainBindings),stable.toolchainSha256);assert.equal(levelSha256(runtime.toolchainBindings),runtime.toolchainSha256);
});

test('invalid configuration rejects before any claim, and stable-only runtime is refused',async t=>{
  const directory=await temp(t),candidate=easyFixture();
  await assert.rejects(()=>verifyLeagueIceCandidate(runtime,candidate,{ledgerDirectory:directory,budget:{maxStates:10001}}),/Invalid bounded budget/);
  await assert.rejects(()=>verifyLeagueIceCandidate(awaitStable,candidate,{ledgerDirectory:directory}),/Use loadLeagueIceProofRuntime/);
  assert.deepEqual(await fs.readdir(directory),[]);
});
const awaitStable=await loadLeagueProofRuntime();

test('one native search rejects an easy route; below-band objects cannot be retried through other ledgers',async t=>{
  const directory=await temp(t),candidate=easyFixture();delete candidate.drags;
  const report=await verifyLeagueIceCandidate(runtime,candidate,{ledgerDirectory:directory});
  assert.equal(report.staticAudit.passed,true,JSON.stringify(report.staticAudit.issues));assert.equal(report.accepted,false);assert.equal(report.status,'BELOW_DIFFICULTY_BAND');
  assert.equal(report.proofExtension.searchInvocations,1);assert.equal(report.lowerBound.method,ICE_LOWER_METHOD);assert.equal(report.lowerBound.projection,null);assert.equal(report.lowerBound.result.cost,0);assert(report.lowerBound.result.rawFullBoardStates<=10000);
  const saved=JSON.parse(await fs.readFile(report.proofReceipt,'utf8'));assert.equal(saved.levelSha256,levelSha256(candidate.level));assert.equal(saved.accepted,false);
  const other=await temp(t);await assert.rejects(()=>verifyLeagueIceCandidate(runtime,{...candidate,level:{...candidate.level,id:900007,name:'metadata rename'},index:7},{ledgerDirectory:other}),/INPUT_ALREADY_ATTEMPTED_ACROSS_LEAGUE_TOOLS/);
  assert.deepEqual(await fs.readdir(other),[]);
});

test('supplied actual U outside band is refused before lower search; invalid Pointer route is refused',async t=>{
  const directory=await temp(t),candidate=easyFixture();const report=await verifyLeagueIceCandidate(runtime,candidate,{ledgerDirectory:directory});
  assert.equal(report.status,'ROUTE_OUTSIDE_BAND');assert.equal(report.U,0);assert.equal(report.proofExtension.searchInvocations,0);assert(!report.lowerBound);
  const bad=easyFixture();bad.drags=[{blockId:bad.level.blocks[0].id,path:[],exitSide:'top'},...bad.drags.slice(0,-1)];
  const rejected=await verifyLeagueIceCandidate(runtime,bad,{ledgerDirectory:await temp(t)});assert.equal(rejected.status,'REJECTED_ROUTE');assert.equal(rejected.proofExtension.searchInvocations,0);
});

test('ice cap is recorded UNKNOWN and cannot switch solver/ledger after failure',async t=>{
  const directory=await temp(t),candidate=easyFixture();delete candidate.drags;
  const report=await verifyLeagueIceCandidate(runtime,candidate,{ledgerDirectory:directory,budget:{maxStates:1}});
  assert.equal(report.status,'UNKNOWN_LOWER');assert.equal(report.lowerBound.result.status,'unknown');assert.equal(report.lowerBound.result.rawFullBoardStates,1);assert.equal(report.accepted,false);
  const ledger=await createLeagueAttemptLedger(directory);await assert.rejects(()=>ledger.claim(candidate.level,{attemptKey:'league-6'}),/BOTH_COLOUR_AND_SHAPE/);
  const renamed=structuredClone(candidate.level);renamed.name='another tool';assert(await findPriorIceInputAttempt(renamed));
});

test('unsupported mechanics and unsafe static source/score candidates never search',async t=>{
  const candidate=easyFixture();candidate.level.blocks[1].layers=['blue','red'];delete candidate.drags;
  const report=await verifyLeagueIceCandidate(runtime,candidate,{ledgerDirectory:await temp(t)});
  assert.equal(report.status,'UNSUPPORTED_NATIVE_ICE');assert.equal(report.proofExtension.searchInvocations,0);assert.equal(report.accepted,false);
  const bad=easyFixture();bad.sourceLevelId=99999;delete bad.drags;
  const staticFail=await verifyLeagueIceCandidate(runtime,bad,{ledgerDirectory:await temp(t)});assert.equal(staticFail.status,'REJECTED_STATIC');assert.equal(staticFail.proofExtension.searchInvocations,0);
});

test('native lower metadata fits general receipt schema but wrong raw/object/method never qualifies',async()=>{
  // Parser/schema test only: no new search or saved report. The existing plain
  // receipt supplies ordinary single-layer in-band observations for this unit.
  const selected=JSON.parse(await fs.readFile('deliverables/league-v2-20261008/selection/index-002.json','utf8')).selections.find(s=>s.index===1);
  const report=JSON.parse(await fs.readFile(selected.proofFile,'utf8'));
  report.lowerBound.method=ICE_LOWER_METHOD;report.lowerBound.projection=null;report.lowerBound.projectedLevelSha256=null;report.lowerBound.result.contractVersion=ICE_PROOF_VERSION;
  report.toolchainBindings=runtime.toolchainBindings;report.toolchainSha256=runtime.toolchainSha256;
  report.proofExtension={version:ICE_CONTRACT_VERSION,primitiveVersion:ICE_PROOF_VERSION,domain:'ordinary-static-single-layer-bodies-and-gates-with-only-ice-counters',searchInvocations:1,projectionUsed:false};
  const source=runtime.LEVELS.find(l=>l.id===report.sourceLevelId),band=leagueBand(report.index);
  assert.deepEqual(inspectNativeIceLower(report.lowerBound,report.level,band),[]);assert.deepEqual(inspectLeagueReceipt(report,source,report.index),[]);
  for(const mutate of [l=>l.result.rawFullBoardStates=10001,l=>l.result.discoveredStates++,l=>l.result.thresholdProven=false,l=>l.result.sourceLevelSha256='0'.repeat(64),l=>l.result.floor=21,l=>l.method='plain-projection',l=>l.projection={}]){
    const lower=structuredClone(report.lowerBound);mutate(lower);assert(inspectNativeIceLower(lower,report.level,band).length>0);
  }
});

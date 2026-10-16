import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {constructD2KeyRoute,auditD2KeyRoute} from './d2-key-route-construction.mjs';
import {d2KeyRouteFixture} from './d2-key-route-fixtures.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime),evidence=[];
const out=process.env.D2_KEY_TEST_OUT;assert(out,'Explicit new private qualification evidence directory required');
await fs.mkdir(out,{recursive:false});
const run=(f,extra={})=>constructD2KeyRoute(runtime,f.base,f.slot,f.priorLevel,{configuration:f.configuration,...extra});

test('fixed six real keys release two locks at five/six; original complete U21 and all bytes retained',()=>{
 const f=d2KeyRouteFixture(),bytes=JSON.stringify(f),result=run(f);assert(result.ok,result.reason);
 assert.equal(result.canonicalReplay.nonClearingDrags,21);assert.equal(result.independentReplay.nonClearingDrags,21);
 assert.equal(routeSha256(result.drags),routeSha256(f.base.drags));
 assert.deepEqual(result.participation.map(x=>[x.id,x.count,x.unlockDrag,x.firstAction]),[['b6',5,5,7],['b7',6,6,29]]);
 assert(result.participation.every(x=>x.actualKeyEvents.length===x.count&&x.actualKeyEvents.every(e=>e.gateId)));
 assert.equal(result.audit.priorComparison.previousTotal,1);assert.equal(result.audit.priorComparison.currentTotal,2);
 assert.equal(result.provenance.fullBoardSearches,0);assert.equal(result.mathematicalAcceptance,false);
 const audit=auditD2KeyRoute(runtime,result.level,result.drags,f.slot,f.priorLevel,{configuration:f.configuration});
 assert(audit.passed&&audit.independentReplay.complete);assert.deepEqual(audit.actualCounters,[5,6]);
 assert.equal(JSON.stringify(f),bytes);assert.equal(levelSha256(f.base.level),result.provenance.inputLevelSha256);
 evidence.push({test:'full-fixed-U-and-staggered-actual-keys',result,audit});
});
test('explicit D2-only fixed configuration rejects counter, ID, missing-key and prior-strength changes',()=>{
 for(const mutate of [f=>f.slot.difficulty=1,f=>f.slot.newestMechanism='flip-door',f=>f.configuration.keyBlockIds.pop(),
  f=>f.configuration.keyBlockIds[5]='b4',f=>f.configuration.locks[0].count=4,f=>f.configuration.locks[1].count=5,
  f=>f.priorLevel.blocks[6].lockCount=5]){
  const f=d2KeyRouteFixture();mutate(f);assert.throws(()=>run(f));
 }
 evidence.push({test:'fixed-domain-negative',cases:7});
});
test('a lock needed before its fifth actual key rejects the single plan without attempting a mechanism world',()=>{
 const f=d2KeyRouteFixture();f.base.drags.splice(3,0,{blockId:'b6',path:[[2,0]]},{blockId:'b6',path:[[2,1]]});
 const result=run(f);assert(!result.ok);assert.match(result.reason,/before its planned release/);assert.equal(result.level,null);
 assert(!result.constructionAccounting.kinds['one-full-key-configuration']);assert.equal(result.provenance.configurationsAttempted,1);
 evidence.push({test:'premature-lock-plan-terminal',result});
});
test('actual audit rejects altered key membership, release counters and double-release-at-five',()=>{
 const f=d2KeyRouteFixture(),result=run(f);assert(result.ok,result.reason);
 for(const mutate of [l=>delete l.blocks[5].keyId,l=>l.blocks[5].keyId='not-the-declared-group',l=>l.blocks[6].lockCount=4,l=>l.blocks[7].lockCount=5]){
  const level=structuredClone(result.level);mutate(level);
  assert.throws(()=>auditD2KeyRoute(runtime,level,result.drags,f.slot,f.priorLevel,{configuration:f.configuration}));
 }
 evidence.push({test:'actual-instance-negative',cases:4});
});
test('parking cannot cross the first same-colour gate contact, including a turn midway through a held path',()=>{
 const f=d2KeyRouteFixture();f.base.drags[6]={blockId:'b6',path:[[1,1],[0,1],[0,0],[1,0]]};
 const result=run(f);assert(!result.ok);assert.match(result.reason,/first contact/);
 assert.equal(result.level,null);assert.equal(result.provenance.heldSearches,0);
 evidence.push({test:'first-contact-midpath-rejected',result});
});
test('one shared world budget includes both canonical traces and deferred independent exit completion',()=>{
 const f=d2KeyRouteFixture(),full=run(f);assert(full.ok,full.reason);
 const counts=full.constructionAccounting,expected=1+f.base.drags.reduce((n,d)=>n+d.path.length+2+2*Number(!!d.exitSide),0);
 assert.equal(counts.fullWorldReservations,3*expected+1);assert.equal(counts.kinds['independent-complete-known-route'],expected);
 const tiny=run(f,{worldBudget:{maxStates:1}});assert(!tiny.ok&&tiny.budgetExhausted);assert.equal(tiny.constructionAccounting.fullWorldReservations,1);
 const insufficient=run(f,{worldBudget:{maxStates:counts.fullWorldReservations-1}});assert(!insufficient.ok&&insufficient.budgetExhausted);
 assert(insufficient.constructionAccounting.fullWorldReservations<counts.fullWorldReservations);
 const exact=run(f,{worldBudget:{maxStates:counts.fullWorldReservations}});assert(exact.ok,exact.reason);
 for(const maxStates of [NaN,Infinity,0,10001])assert.throws(()=>run(f,{worldBudget:{maxStates}}));
 evidence.push({test:'shared-raw-reservations',expectedPerReplay:expected,fullAccounting:counts,tiny,insufficient,exactPass:true,invalidBudgetsRejected:4});
});
test.after(async()=>{
 const files=['tools/daily-challenge/formal-v4/d2-key-route-construction.mjs','tools/daily-challenge/formal-v4/d2-key-route-fixtures.mjs','tools/daily-challenge/formal-v4/d2-key-route-construction.test.mjs'];
 const fileBindings=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===6?'PRIVATE_D2_KEY_ROUTE_QUALIFICATION_PASS':'INCOMPLETE',
  qualificationOnly:true,tests:evidence.length,evidence,fileBindings,executionEnvironment:environment,currentRuntimeValidationClaimed:false,
  actualCandidateConstructed:0,publicLedgerWrites:0,newBoardSearches:0,mathematicalAcceptance:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReverseReservationMeter,quoteReverseWorldCreation,quoteReverseForwardDrag,quoteReverseInverseEdge,quoteReverseCompleteWitness,REVERSE_RESERVATION_SCOPE} from './reverse-construction-reservations.mjs';
const evidence=[];
const drag=(p=0,exitSide)=>({blockId:'synthetic-metadata',path:Array.from({length:p},(_,i)=>[i,0]),...(exitSide?{exitSide}:{})});
const meter=(limits={})=>createReverseReservationMeter({qualificationOnly:true,limits,now:()=>0});

test('pure formula envelopes cover declared source-call bounds without constructing a level',()=>{
 for(const p of [0,1,4,80])for(const e of [0,1]){
  const d=drag(p,e?'left':undefined),q=quoteReverseForwardDrag(d);
  assert.deepEqual([q.worlds,q.transitions,q.micro],[12+3*p+4*e,12+3*p+4*e,p+1]);assert(q.worlds>=8+2*p+2*e);
  if(p||e){const inv=quoteReverseInverseEdge(e?'insertion':'parking',d);assert.equal(inv.worlds,q.worlds+2);}
 }
 const route=[drag(3),drag(0,'top'),drag(5,'left')],q=quoteReverseCompleteWitness(route);
 assert.equal(q.worlds,12+16*3+4*8+6*2);assert(q.worlds>=7+10*3+3*8+4*2);assert.equal(q.micro,2+2*8+2*3);
 assert.throws(()=>quoteReverseInverseEdge('parking',drag()));assert.throws(()=>quoteReverseInverseEdge('insertion',drag(2)));
 assert.throws(()=>quoteReverseCompleteWitness([]));assert.throws(()=>quoteReverseForwardDrag({...drag(),timeSchedule:{}}));
 evidence.push({name:'formula-and-domain-metadata',completeQuote:q,levelCreated:false});
});

test('reservation precedes allocation callback, is cumulative and cannot be refunded after rejection',async()=>{
 const m=meter({maxStates:18}),sequence=[];
 await m.run(quoteReverseWorldCreation('portal'),()=>{sequence.push(m.report().reserved.worlds);return null;});
 await m.run(quoteReverseInverseEdge('parking',drag(1)),()=>{sequence.push(m.report().reserved.worlds);return{valid:false};});
 assert.deepEqual(sequence,[1,18]);let calls=0;
 await assert.rejects(m.run(quoteReverseWorldCreation('rejected-colour-counterfactual'),()=>calls++),/worlds-exhausted/);
 assert.equal(calls,0);assert.equal(m.report().reserved.worlds,18);
 await assert.rejects(m.run(quoteReverseWorldCreation('new-label-does-not-reset'),()=>calls++),/worlds-exhausted/);
 assert.equal(calls,0);evidence.push({name:'preallocation-and-no-refund',report:m.report()});
 const sync=meter({maxStates:1});let syncCalls=0;
 assert.equal(sync.runSync(quoteReverseWorldCreation('synchronous-graph-callback'),()=>{syncCalls++;assert.equal(sync.report().reserved.worlds,1);return 'edge-metadata';}),'edge-metadata');
 assert.throws(()=>sync.runSync(quoteReverseWorldCreation('synchronous-overflow'),()=>syncCalls++),/worlds-exhausted/);assert.equal(syncCalls,1);
});

test('independent action and micro limits, immutable quotes and prototype boundary reject before callbacks',async()=>{
 for(const [limits,reason]of [[{maxTransitions:1},/transitions-exhausted/],[{maxMicroStates:1},/micro-exhausted/]]){
  const m=meter(limits);let calls=0;
  await assert.rejects(m.run(quoteReverseForwardDrag(drag(1)),()=>calls++),reason);assert.equal(calls,0);
  assert.deepEqual(m.report().reserved,{worlds:0,transitions:0,micro:0});
 }
 const m=meter(),q=quoteReverseForwardDrag(drag(2));assert(Object.isFrozen(q));
 assert.throws(()=>m.reserve({...q,worlds:0}),/intact quote/);
 assert.throws(()=>createReverseReservationMeter(),/synthetic-only/);
 assert.throws(()=>meter({maxStates:10001}));assert.throws(()=>meter({maxMilliseconds:30001}));
 evidence.push({name:'all-budget-dimensions-and-metadata-only',report:m.report()});
});

test('deadline before and after callback is terminal; an exception cannot resume with a new quote',async()=>{
 let clock=0,calls=0;const m=createReverseReservationMeter({qualificationOnly:true,limits:{maxMilliseconds:30},now:()=>clock});
 await assert.rejects(m.run(quoteReverseWorldCreation('late-synthetic-operation'),()=>{calls++;clock=30;return true;}),/deadline/);
 assert.equal(calls,1);assert.equal(m.report().reserved.worlds,1);
 await assert.rejects(m.run(quoteReverseWorldCreation('retry'),()=>calls++),/deadline/);assert.equal(calls,1);
 clock=0;const before=createReverseReservationMeter({qualificationOnly:true,limits:{maxMilliseconds:30},now:()=>clock});clock=31;
 await assert.rejects(before.run(quoteReverseWorldCreation('already-late'),()=>calls++),/deadline/);assert.equal(calls,1);
 const thrown=meter();await assert.rejects(thrown.run(quoteReverseWorldCreation('failure'),()=>{throw Error('synthetic rejection');}),/synthetic rejection/);
 await assert.rejects(thrown.run(quoteReverseWorldCreation('retry'),()=>calls++),/callback-threw/);assert.equal(calls,1);
 evidence.push({name:'deadline-and-exception-terminal',late:m.report(),before:before.report(),thrown:thrown.report()});
 clock=0;const sync=createReverseReservationMeter({qualificationOnly:true,limits:{maxMilliseconds:30},now:()=>clock});
 assert.throws(()=>sync.runSync(quoteReverseWorldCreation('late-synchronous-graph-callback'),()=>{clock=31;}),/deadline/);
 assert.equal(sync.report().reserved.worlds,1);
});

test.after(async()=>{
 if(!process.env.REVERSE_RESERVATION_TEST_OUT)return;
 assert.equal(evidence.length,4);const bindings={};
 for(const file of ['tools/daily-challenge/formal-v4/reverse-construction-reservations.mjs','tools/daily-challenge/formal-v4/reverse-construction-reservations.test.mjs',
 'tools/daily-challenge/formal-v3/reverse-route-audit.mjs','tools/daily-challenge/formal-v3/design-reverse-interleaved.mjs','tools/daily-challenge/formal-v2/contract.mjs',
 'tools/daily-challenge/formal-v2/proof-scheduled-route.mjs','src/core/PuzzleModel.ts','src/core/revisedLevelSearch.ts'])bindings[file]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
 const out=process.env.REVERSE_RESERVATION_TEST_OUT;await fs.mkdir(out,{recursive:false});
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:'REVERSE_RESERVATION_SYNTHETIC_METADATA_PASS',scope:REVERSE_RESERVATION_SCOPE,
  tests:4,errors:[],newLevelObjects:0,newModelInvocations:0,newSearches:0,newConstructions:0,newLedgerClaims:0,
  actualRuntimeReservationCoverageQualified:false,productionEntryImplemented:false,fileBindings:bindings,evidence},null,2)+'\n',{flag:'wx'});
});

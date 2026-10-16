import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makeFixedReverseCycleQualificationPlan,createFixedReverseCycleQualification} from './reverse-fixed-stock-cycle-qualification.mjs';
const runtime=await loadV4Runtime(),evidence=[];
function tracked(options={}){const plan=makeFixedReverseCycleQualificationPlan({qualificationOnly:true,...options});let factory;
 const events={models:0,canonical:0,unitSteps:0,prepaid:[]};const event=kind=>{const q=factory.report().session;assert(q.activeReservation);assert.equal(q.originalMeter.active,true);events.prepaid.push({kind,worlds:q.reserved.worlds,phase:q.activeReservation});};
 class Model extends runtime.PuzzleModel{constructor(...args){event('constructor');events.models++;super(...args);}snapshot(){event('snapshot');return super.snapshot();}moveBlockStep(...args){event('unit');events.unitSteps++;return super.moveBlockStep(...args);}tryExit(...args){event('exit');return super.tryExit(...args);}}
 factory=createFixedReverseCycleQualification({...runtime,PuzzleModel:Model,replayRevisedRoute(l,d){event('canonical');events.canonical++;return runtime.replayRevisedRoute(l,d);}},plan,{qualificationOnly:true});return{factory,plan,events};
}
test('fixed three-colour dependency uses one actual reverse parking and one complete dual U1',()=>{
 const t=tracked(),q=t.factory.construct();assert.equal(q.status,'FIXED_REVERSE_BOUND_COMPLETE_U_ONLY',JSON.stringify(q));assert.equal(q.U,1);assert.equal(q.L,null);assert.equal(q.accepted,false);
 assert.equal(q.drags.length,9);assert.equal(q.canonical.clearEvents,8);assert.equal(q.independent.nonClearingDrags,1);assert.equal(q.independent.remainingBodies,0);
 assert.deepEqual(q.drags.map(d=>d.blockId),['cyan','pink','yellow','green','purple','red','orange','blue','red'].map(c=>'q-'+c));
 assert.deepEqual(q.drags[5],{blockId:'q-red',path:[[0,1]]});assert.deepEqual(q.drags[6],{blockId:'q-orange',path:[[1,1]],exitSide:'bottom'});
 assert.deepEqual(q.drags[7],{blockId:'q-blue',path:[[1,0]],exitSide:'top'});assert.deepEqual(q.drags[8],{blockId:'q-red',path:[[0,0]],exitSide:'top'});
 const r=t.factory.report();assert.equal(r.totalReserved.worlds,399);assert.equal(r.totalReserved.micro,113);assert.equal(r.completePhysicalInputs,1);
 assert.equal(r.session.counters.localAudits,9);assert.equal(r.session.counters.heldSearches,9);assert.equal(r.stats.interleavedInsertedBodyParkingEdges,1);
 assert.equal(r.session.counters.canonicalReplays,1);assert.equal(r.session.counters.independentReplays,1);assert.equal(t.events.models,10);assert.equal(t.events.unitSteps,8);
 assert(r.historyChecks.filter(x=>x.full).every(x=>x.localAuditsBefore===8));assert.equal(r.historyChecks.filter(x=>x.label==='inverse-parking-endpoint').length,1);
 const lower=t.factory.consumeOriginalLower(q);assert.equal(lower.status,'KNOWN_UPPER_BELOW_FIXED_FLOOR');assert.equal(lower.lower,null);assert.equal(t.factory.report().lowerInvocations,0);
 assert.throws(()=>t.factory.construct(),/one-shot/);assert.equal(t.events.canonical,1);
 evidence.push({name:'actual-inverse-parking-complete-U1',plan:t.plan,result:q,lower,report:t.factory.report(),events:t.events});
});
test('one-parking fixture precharges before inverse endpoint, final dual and first full rejection',()=>{
 const cases=[];for(const [options,reason,models,canon]of [
  [{budget:{maxStates:398}},/worlds-exhausted/,9,0],
  [{budget:{maxMicroStates:39}},/micro-exhausted/,3,0],
  [{historyDecision:'blocked'},/first-complete-blocked/,8,0]
 ]){const t=tracked(options),q=t.factory.construct();assert.equal(q.status,'FIXED_REVERSE_CONSTRUCTION_TERMINAL');assert.match(q.reason,reason);
  assert.equal(t.events.models,models);assert.equal(t.events.canonical,canon);assert.throws(()=>t.factory.construct(),/one-shot/);
  if(options.budget?.maxMicroStates===39)assert.equal(t.factory.report().historyChecks.filter(x=>x.label==='inverse-parking-endpoint').length,0);
  cases.push({options,result:q,report:t.factory.report(),events:t.events});
 }
 const p=structuredClone(makeFixedReverseCycleQualificationPlan({qualificationOnly:true}));p.recipe.reverseOperations[3].target=[2,1];assert.throws(()=>createFixedReverseCycleQualification(runtime,p,{qualificationOnly:true}),/Fixed plan/);
 evidence.push({name:'parking-creation-first-full-and-shared-caps',cases,changedFixedTargetRejected:true});
});
test.after(async()=>{if(!process.env.REVERSE_CYCLE_TEST_OUT)return;assert.equal(evidence.length,2);const files=['tools/daily-challenge/formal-v4/reverse-fixed-stock-cycle-qualification.mjs','tools/daily-challenge/formal-v4/reverse-fixed-stock-cycle-qualification.test.mjs','tools/daily-challenge/formal-v4/reverse-fixed-stock-qualification.mjs','tools/daily-challenge/formal-v4/reverse-metered-qualification.mjs','tools/daily-challenge/formal-v4/reverse-construction-reservations.mjs'];
 const fileBindings={};for(const p of files)fileBindings[p]=createHash('sha256').update(await fs.readFile(p)).digest('hex');
 const report={status:'FIXED_REVERSE_CYCLE_SYNTHETIC_QUALIFICATION_PASS',qualificationOnly:true,productionQualified:false,tests:2,errors:[],fileBindings,toolBindings:runtime.toolchainBindings,proofToolchainSha256:runtime.toolchainSha256,
  newRealCandidateConstructions:0,newRealCandidateSearches:0,newLedgerClaims:0,newLowerSearches:0,syntheticModelTestsPerformed:true,completeWitness:{U:1,drags:9,clears:8,actualReverseParking:1},
  qualificationMeaning:'The fixed coordinate schedule makes one actual nonclearing move before three different clears. No artificial route cycle or fabricated upper receipt; U1 is not a D2/D3 certificate.',
  originalFactoryUnchanged:true,originalModelAndMeterUnchanged:true,realHistoryOwnerBridgeImplemented:false,positiveLowerInvocationQualified:false,source52Executed:false,
  reservation:'1 initial +8 portals +3*21 stepped insertions +5*18 direct insertions +17 parking +220 one full dual U =399; 9 held boxes*8 +13 local +28 full dual =113 micro. Bounds are conservative reservations, not unique-state visits.',evidence};
 await fs.mkdir(process.env.REVERSE_CYCLE_TEST_OUT,{recursive:false});await fs.writeFile(path.join(process.env.REVERSE_CYCLE_TEST_OUT,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

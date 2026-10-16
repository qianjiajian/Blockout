import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makeFixedReverseQualificationPlan,createFixedReverseQualification,SOURCE52_COORDINATE_DECLARATION} from './reverse-fixed-stock-qualification.mjs';
const runtime=await loadV4Runtime(),evidence=[];
function tracked({budget,targetDifficulty=3,historyDecision,now,afterCanonical}={}){
 const plan=makeFixedReverseQualificationPlan({qualificationOnly:true,budget,targetDifficulty,historyDecision});let factory;
 const events={models:0,canonical:0,snapshots:0,prepaid:[]};
 function event(kind){const q=factory.report().session;assert(q.activeReservation,'Unreserved actual toy model action');assert.equal(q.originalMeter.active,true);events.prepaid.push({kind,worlds:q.reserved.worlds,phase:q.activeReservation});}
 class Model extends runtime.PuzzleModel{constructor(...args){event('constructor');events.models++;super(...args);}snapshot(){event('snapshot');events.snapshots++;return super.snapshot();}moveBlockStep(...args){event('unit');return super.moveBlockStep(...args);}tryExit(...args){event('exit');return super.tryExit(...args);}}
 const rt={...runtime,PuzzleModel:Model,replayRevisedRoute(level,drags){event('canonical');events.canonical++;const r=runtime.replayRevisedRoute(level,drags);afterCanonical?.();return r;}};
 factory=createFixedReverseQualification(rt,plan,{qualificationOnly:true,now});return{factory,plan,events};
}
const record=(name,t,extra={})=>evidence.push({name,...extra,plan:t.plan,report:t.factory.report(),events:t.events});

test('closed fixed toy returns exactly one bound complete double U and rejects real production',()=>{
 const t=tracked();assert.deepEqual(Object.keys(t.factory),['construct','consumeOriginalLower','report']);
 const q=t.factory.construct();assert.equal(q.status,'FIXED_REVERSE_BOUND_COMPLETE_U_ONLY',JSON.stringify(q));assert.equal(q.accepted,false);assert.equal(q.U,0);assert.equal(q.L,null);
 assert.equal(q.canonical.clearEvents,8);assert.equal(q.independent.remainingBodies,0);assert(Object.isFrozen(q.level));
 const r=t.factory.report();assert.equal(r.totalReserved.worlds,341);assert.equal(r.completePhysicalInputs,1);assert.equal(r.session.counters.localAudits,8);
 assert.equal(r.session.counters.canonicalReplays,1);assert.equal(r.session.counters.independentReplays,1);assert.equal(t.events.models,9);
 assert(r.historyChecks.filter(x=>x.full).every(x=>x.localAuditsBefore===7));assert.equal(r.firstComplete,undefined);
 assert.equal(r.optionWork.portalScans,64);assert.equal(r.portalTransitionReservation,80000);assert(r.totalReserved.transitions<=t.plan.budget.maxTransitions);
 assert.throws(()=>t.factory.construct(),/one-shot/);
 const lower=t.factory.consumeOriginalLower(q);assert.equal(lower.status,'KNOWN_UPPER_BELOW_FIXED_FLOOR');assert.equal(lower.lower,null);assert.equal(t.factory.report().lowerInvocations,0);
 assert.equal(t.events.models,9);assert.equal(t.events.canonical,1);assert.throws(()=>t.factory.consumeOriginalLower(q),/one-shot/);
 assert.throws(()=>createFixedReverseQualification(runtime,t.plan),/unimplemented stub/);assert.throws(()=>makeFixedReverseQualificationPlan(),/not implemented/);
 assert.throws(()=>makeFixedReverseQualificationPlan({qualificationOnly:true,fixtureId:'source52'}),/Only this explicit synthetic/);
 assert.equal(SOURCE52_COORDINATE_DECLARATION.executed,false);assert.equal(SOURCE52_COORDINATE_DECLARATION.productionQualified,false);
 record('one-bound-double-U-no-production',t,{result:q,lower});
});

test('first complete portal blocked or near is terminal before its model and never picks another layout',()=>{
 const cases=[];for(const historyDecision of ['blocked','near']){const t=tracked({historyDecision}),q=t.factory.construct();
  assert.equal(q.status,'FIXED_REVERSE_CONSTRUCTION_TERMINAL');assert.match(q.reason,new RegExp('first-complete-'+historyDecision));
  assert.equal(t.factory.report().completePhysicalInputs,1);assert.equal(q.firstComplete.label,'fixed-insertion-portal');assert.equal(t.events.models,7);assert.equal(t.events.canonical,0);
  assert.equal(t.factory.report().session.counters.heldSearches,7);assert.throws(()=>t.factory.construct(),/one-shot/);assert.equal(t.events.models,7);
  cases.push({historyDecision,result:q,report:t.factory.report(),events:t.events});
 }evidence.push({name:'first-full-input-is-terminal',cases});
});

test('construction and final dual U share prepaid world, coordinate and deadline caps',()=>{
 const small=tracked({budget:{maxStates:1}}),q=small.factory.construct();assert.match(q.reason,/worlds-exhausted/);assert.equal(small.events.models,0);assert.equal(small.factory.report().totalReserved.worlds,1);
 const dual=tracked({budget:{maxStates:340}}),d=dual.factory.construct();assert.match(d.reason,/worlds-exhausted/);assert.equal(dual.events.models,8);assert.equal(dual.events.canonical,0);assert.equal(dual.factory.report().completePhysicalInputs,1);
 const micro=tracked({budget:{maxMicroStates:7}}),m=micro.factory.construct();assert.match(m.reason,/micro-exhausted/);assert.equal(micro.events.models,0);assert.equal(micro.factory.report().session.counters.heldSearches,0);
 assert.throws(()=>tracked({budget:{maxTransitions:80000}}),/No transition budget/);
 let clock=0;const late=tracked({budget:{maxMilliseconds:30},now:()=>clock,afterCanonical:()=>{clock=30;}}),l=late.factory.construct();
 assert.match(l.reason,/deadline/);assert.equal(late.events.models,8);assert.equal(late.events.canonical,1);assert.equal(late.factory.report().session.counters.independentReplays,0);
 assert.equal(late.factory.report().totalReserved.worlds,341);assert.throws(()=>late.factory.construct(),/one-shot/);
 record('all-subwork-one-prepaid-budget',late,{small:{result:q,report:small.factory.report()},dual:{result:d,report:dual.factory.report()},micro:{result:m,report:micro.factory.report()}});
});

test('fixed plan and bound U tampering cannot reach a lower call or change band/inventory',()=>{
 const original=makeFixedReverseQualificationPlan({qualificationOnly:true}),mutations=[p=>p.recipe.inventory[0].color='blue',p=>p.recipe.gates=[],p=>p.recipe.insertionOrder.reverse(),p=>p.recipe.parkingBodyIds.pop(),p=>p.floor=21,p=>p.budget.maxStates--];
 for(const change of mutations){const p=structuredClone(original);change(p);assert.throws(()=>createFixedReverseQualification(runtime,p,{qualificationOnly:true}),/Fixed plan/);}
 const callerPlan=structuredClone(original),isolated=createFixedReverseQualification(runtime,callerPlan,{qualificationOnly:true});
 callerPlan.budget.maxStates=1;callerPlan.historyDecision='blocked';callerPlan.recipe.inventory[0].color='blue';callerPlan.recipe.insertionOrder.reverse();
 assert.deepEqual(isolated.report().sharedBudget,original.budget);assert(Object.isFrozen(isolated.report().sharedBudget));assert.equal(isolated.report().started,false);
 const cases=[];for(const change of [q=>q.U=31,q=>q.drags[0].blockId='other',q=>q.level.blocks[0].color='blue',q=>q.constructionAccounting.session.counters.canonicalReplays=2]){
  const t=tracked(),q=t.factory.construct(),bad=structuredClone(q);change(bad);assert.throws(()=>t.factory.consumeOriginalLower(bad),/Bound upper receipt/);
  assert.equal(t.factory.report().lowerInvocations,0);assert.equal(t.events.canonical,1);assert.equal(t.events.models,9);cases.push(t.factory.report());
 }
 const d2=tracked({targetDifficulty:2}),q=d2.factory.construct();assert.equal(d2.plan.floor,21);assert.equal(d2.plan.upper,30);assert.equal(d2.factory.consumeOriginalLower(q).status,'KNOWN_UPPER_BELOW_FIXED_FLOOR');
 record('immutable-plan-and-exact-U-binding',d2,{tamperedReceiptCases:cases,mutatedPlanCases:mutations.length,callerPlanAliasDetachedBeforeAnyModel:true});
});

test.after(async()=>{
 if(!process.env.REVERSE_FIXED_TEST_OUT)return;assert.equal(evidence.length,4);
 const files=['tools/daily-challenge/formal-v4/reverse-fixed-stock-qualification.mjs','tools/daily-challenge/formal-v4/reverse-fixed-stock-qualification.test.mjs','tools/daily-challenge/formal-v4/reverse-metered-qualification.mjs','tools/daily-challenge/formal-v4/reverse-construction-reservations.mjs','tools/daily-challenge/formal-v3/design-reverse-interleaved.mjs','tools/daily-challenge/formal-v3/reserved-guard-budget.mjs'];
 const fileBindings={};for(const f of files)fileBindings[f]=createHash('sha256').update(await fs.readFile(f)).digest('hex');
 const report={status:'FIXED_REVERSE_STOCK_SYNTHETIC_QUALIFICATION_PASS',qualificationOnly:true,productionQualified:false,tests:4,errors:[],fileBindings,toolBindings:runtime.toolchainBindings,proofToolchainSha256:runtime.toolchainSha256,
  newRealCandidateConstructions:0,newRealCandidateSearches:0,newLedgerClaims:0,newLowerSearches:0,syntheticModelTestsPerformed:true,realHistoryOwnerBridgeImplemented:false,
  firstCompleteInputPolicy:'First full portal checks identity before held/local model; any refusal seals recipe. Same already-paid full endpoint is verified once; no new full alternative after it.',
  reservationMeaning:'Conservative before-creation upper reservations, no refund; fixed portal allowance + per-call held N/4N + local inverse models + exactly one full dual U share caps.',
  inheritedModelQualification:{path:'deliverables/daily-formal-v4-20261008/proof/reverse-metered-qualification-independent-01/report.json',sha256:'55559a6b290f6685cc7ee83108257f2610f9632a59429bc0628483d965b18efb'},
  limits:['Only one explicit 4x2 eight-colour native toy inventory is executable. Source52 is an unexecuted coordinate declaration.',
   'Toy U0 is rejected below both fixed floors; positive fresh L invocation, real owner/history/public seals, hard-layout ranking and nontrivial parking selection are not qualified.',
   'No real campaign, inventory selection, colour search, selection/catalog admission, UI/Pointer or production-qualified entry is implemented.'],evidence};
 await fs.mkdir(process.env.REVERSE_FIXED_TEST_OUT,{recursive:false});await fs.writeFile(path.join(process.env.REVERSE_FIXED_TEST_OUT,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

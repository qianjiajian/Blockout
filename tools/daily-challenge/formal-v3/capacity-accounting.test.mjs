import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCapacityConstructionBudget,intensityTargets} from './capacity-primary-adapter.mjs';
import {inspectCapacityConstructionAccounting,loadV3CatalogRuntime} from './catalog-contract.mjs';
import {composeCapacity} from './capacity-compose.mjs';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';

const runtime=await loadV3CatalogRuntime(),root='deliverables/daily-formal-v3-20261008';
const base=JSON.parse(fs.readFileSync(`${root}/design/macro-opening-guarded8-02/candidate-006.json`));
const slot=expectedDailySlots(runtime.MECHANISM_GUIDE).find(s=>s.newestMechanism==='axis-block'&&s.difficulty===3&&s.slot===1);
const old=JSON.parse(fs.readFileSync('deliverables/daily-formal-v2-20261007/final-qualified/index.json'));
const prior=JSON.parse(fs.readFileSync(old.entries.find(e=>e.formalId===slot.formalId).path)).level;
test('a composed real witness has intact separate pre-proof construction accounting',async()=>{
 const r=await composeCapacity(runtime,base,slot,prior);assert(r.ok,JSON.stringify(r.failures));
 const context={levelSha256:r.levelSha256,routeSha256:r.routeSha256,difficulty:3};
 assert.deepEqual(inspectCapacityConstructionAccounting(r.provenance,context),[]);
 const mutations=[p=>{delete p.constructionAccounting;},p=>{p.constructionAccounting.fullWorldReservations=10001;},
  p=>{p.constructionAccounting.maxStates=10001;},p=>{p.constructionAccounting.expanded=NaN;},
  p=>{p.constructionAccounting.kinds.fake=1;},p=>{p.constructionAccounting.conservativeFullBoardStateUpperBound--;},
  p=>{p.constructionAccounting.exactDistinctStateCountClaimed=true;},p=>{p.searchPerformed=!p.searchPerformed;},
  p=>{p.outputLevelSha256='0'.repeat(64);},p=>{p.taskBoundary='retry-prior-failed-proof';},
  p=>{p.maxAttemptsPerCount=4;},p=>{p.budgetDeclaredBeforeAdaptation=false;}];
 for(const mutate of mutations){const altered=structuredClone(r.provenance);mutate(altered);assert(inspectCapacityConstructionAccounting(altered,context).length>0);}
 assert(inspectCapacityConstructionAccounting(undefined,context).length>0);
});
test('one shared exhausted allowance stops before another primary count or attempt',async()=>{
 const r=await composeCapacity(runtime,base,slot,prior,{worldBudget:{maxStates:1}});
 assert.equal(r.ok,false);assert.equal(r.status,'CAPACITY_CONSTRUCTION_BUDGET_EXHAUSTED');
 assert.equal(r.budgetExhausted,true);assert.equal(r.failures.length,1);assert.equal(r.failures[0].primaryInstances,4);
 assert.equal(r.constructionAccounting.fullWorldReservations,1);assert.equal(r.constructionAccounting.expanded,0);
});
test('an unbound prior slot and nonfinite or enlarged world allowance are rejected',async()=>{
 await assert.rejects(()=>composeCapacity(runtime,base,slot,{...prior,timeSeconds:prior.timeSeconds+1}),/baseline mismatch/);
 for(const maxStates of [NaN,Infinity,0,-1,10001,1.5])assert.throws(()=>createCapacityConstructionBudget({maxStates}));
 const b=createCapacityConstructionBudget({maxStates:2});b.reserve(2);assert.throws(()=>b.reserve(1),/board-budget/);
 assert.equal(b.report().fullWorldReservations,2);
 for(const kind of ['generator','axis-block','layered-lift','colored-grid'])assert.equal(intensityTargets(kind,3,{instances:1}).instances,1);
 for(const kind of ['numeric-ice','key-lock','shutter'])assert.throws(()=>intensityTargets(kind,3,{instances:1}));
});

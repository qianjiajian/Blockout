import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from './remake21to30-v120.mjs';
import {verifyDecisions} from './review-remake21to30-decisions.mjs';
const {api}=await loadApi();
const fixtures=JSON.parse(fs.readFileSync('tests/fixtures/multi-block-decision-examples.json'));
const fresh=()=>structuredClone(fixtures[0]);
for(const d of fixtures)test(`real Lv${d.level.id} candidate case is independently replayed, including recovery`,()=>{
  const result=verifyDecisions(d,api);assert.equal(result.cases.length,1);assert(result.cases[0].area>1);
  assert.equal(result.humanBlindTested,false);assert.equal(result.observedMechanismProcess.provesAllSolutionsOrder,false);
  if(d.level.id===21)assert(result.mechanismContrast.strictBoundSeparation);
  if(d.level.id===25)assert(result.observedMechanismProcess.innerParkingDependencies.length>0);
});
test('wrong body ID and invented multi-cell area are rejected',()=>{
  for(const mutate of [c=>c.legalWrongParking.blockId='unrelated',c=>c.recoveryDrag.blockId='unrelated',c=>c.area=99]){
    const d=fresh();mutate(d.decisionCases[0]);assert.throws(()=>verifyDecisions(d,api));
  }
});
test('clearing is not accepted as wrong parking',()=>{const d=fresh();d.decisionCases[0].legalWrongParking.exitSide='top';assert.throws(()=>verifyDecisions(d,api),/Parking/);});
test('stale correct action and unverified recovery route are rejected',()=>{
  for(const mutate of [c=>c.correctDrag.path=[],c=>c.fullRecoveredRoute.pop()]){const d=fresh();mutate(d.decisionCases[0]);assert.throws(()=>verifyDecisions(d,api));}
});
test('counterfactual geometry edits and simultaneous mechanism changes are rejected',()=>{
  const geometry=fresh();geometry.mechanismCounterfactual.level.width++;assert.throws(()=>verifyDecisions(geometry,api),/Confounded/);
  const mixed=fresh();mixed.mechanismCounterfactual.level.gates[0].frozen=0;assert.throws(()=>verifyDecisions(mixed,api),/one mechanism/);
});

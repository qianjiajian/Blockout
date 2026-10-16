import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {fullStockVacancyFixture} from './design-vacancy-route-colouring-fixture.mjs';
import {constructVacancyRouteColouringMulti} from './design-vacancy-route-colouring-multi.mjs';
const runtime=await loadBoundedRuntime(),fixture=fullStockVacancyFixture(runtime);
const run=options=>constructVacancyRouteColouringMulti(runtime,fixture.source,fixture.geometry,{seed:1,qualification:{fixtureOnly:true,floor:2},...options});
test('four colours clear the entire real fixture; budget includes original geometry',()=>{
 const r=run({paletteSizes:[4]});assert.equal(r.status,'QUALIFICATION_COMPLETE_U_ONLY');assert.equal(r.U,2);assert.equal(r.drags.length,6);
 assert.equal(r.level.gates.length,4);assert.equal(new Set(r.level.blocks.map(b=>b.color)).size,4);
 assert(r.replay.complete&&r.independentReplay.complete);assert.equal(r.replay.clearEvents,4);assert.equal(r.accounting.rawFullBoardStates,17);assert.equal(r.accounting.kinds.priorGeometry,5);
});
test('failed five-colour domain can precede four-colour success within one construction',()=>{
 const r=run({paletteSizes:[5,4]});assert.equal(r.U,2);assert.equal(r.targets.length,1);
 assert.equal(r.targets[0].palettes[0].reason,'no-fixed-static-gate-domain');assert.equal(r.targets[0].palettes[1].status,'COMPLETE_U');
 assert.equal(r.accounting.rawFullBoardStates,17);
});
test('three target prefixes share prior state count; unavailable fifth/eighth colour never fabricated',()=>{
 for(const n of[5,8]){const r=run({paletteSizes:[n]});assert.equal(r.status,'CONSTRUCTION_UNKNOWN');assert.equal(r.U,null);
  assert.deepEqual(r.targets.map(t=>t.accountingBefore.rawFullBoardStates),[5,11,17]);assert.equal(r.accounting.rawFullBoardStates,23);
  assert.equal(new Set(r.targets.map(t=>`${t.target.i}:${t.target.g}`)).size,3);}
});
test('second/third target cannot reset whole-world allowance',()=>{
 for(const cap of[11,16,17,22]){const r=run({paletteSizes:[5],budget:{maxStates:cap}});assert.equal(r.status,'CONSTRUCTION_UNKNOWN');assert.equal(r.reason,'construction-board-budget');assert.equal(r.accounting.rawFullBoardStates,cap);assert.equal(r.U,null);}
});
test('production palettes and target counts are explicitly bounded',()=>{
 for(const sizes of[[3],[9],[4,4],[],[NaN],[Infinity]])assert.throws(()=>run({paletteSizes:sizes}));
 for(const maxTargets of[0,4,NaN,Infinity])assert.throws(()=>run({maxTargets}));
});
test('target opening overlap never opens a palette/tail search',()=>{
 const r=run({paletteSizes:[5]});const t=r.targets[2];assert.equal(t.reason,'opening-target-gates-overlap');assert.equal(t.palettes.length,0);
});

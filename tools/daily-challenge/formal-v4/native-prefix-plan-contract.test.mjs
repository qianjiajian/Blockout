import assert from 'node:assert/strict';
import test from 'node:test';
import {assertNativeRecipePlan} from './construct-native-prefix-recipes.mjs';

// Metadata-only checks. No runtime model, constructor, public claim or solver.
const valid=()=>({version:'late-prefix-native-three-v1',maximumFinalColourInputsIncludingRejected:3,
 maximumStocksEnteringColourCspIncludingFailed:3,maximumStaticPartitionAttempts:2000,previousMacro64ActualInputs:49,
 maximumAfterThisBatch:52,combinedMaximumInputs:64,selected:Array.from({length:147},()=>({})),
 blueprints:[[198,65],[18,49],[100,43]].map(([sourceLevelId,n],i)=>({sourceLevelId,recipeId:`private-recipe-${i}`,maximumStocks:1,prefixDrags:Array.from({length:n},()=>({}))})),
 futureStrategy:{tailStrategy:'native',originalLowerFloor:31,maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false},
 futureUpperBudget:{maxStates:10000},futureLowerBudget:{maxStates:9999},staticSlot:{stageKey:'basic-combined',difficulty:3},
 nativeQualification:{path:'private-metadata-only-not-opened.json',sha256:'a'.repeat(64)}});
test('fixed native-three metadata accepts exactly the declared recipe cuts and single-CSP quotas',()=>assert.equal(assertNativeRecipePlan(valid()),true));
test('no fourth stock, extra recipe use, changed history or enlarged static allowance',()=>{
 for(const [key,value]of [['maximumFinalColourInputsIncludingRejected',4],['maximumStocksEnteringColourCspIncludingFailed',4],
  ['maximumStaticPartitionAttempts',2001],['previousMacro64ActualInputs',48],['maximumAfterThisBatch',53],['combinedMaximumInputs',65]]){
  const q=valid();q[key]=value;assert.throws(()=>assertNativeRecipePlan(q));}
 const q=valid();q.blueprints[0].maximumStocks=2;assert.throws(()=>assertNativeRecipePlan(q));
});
test('source, first changed-body cut and recipe identity cannot be substituted',()=>{
 const q=valid();q.blueprints[1].sourceLevelId=54;assert.throws(()=>assertNativeRecipePlan(q));
 const r=valid();r.blueprints[2].prefixDrags.pop();assert.throws(()=>assertNativeRecipePlan(r));
 const s=valid();s.blueprints[1].recipeId=s.blueprints[0].recipeId;assert.throws(()=>assertNativeRecipePlan(s));
});
test('native method, no fallback and original L31 remain fixed before either execution',()=>{
 for(const [key,value]of [['tailStrategy','plain-joint'],['originalLowerFloor',16],['maximumTailCalls',2],['maximumOriginalLowerCalls',2],['fullUpperSearchAfterTailFailure',true]]){
  const q=valid();q.futureStrategy[key]=value;assert.throws(()=>assertNativeRecipePlan(q));}
 const q=valid();q.futureLowerBudget.maxStates=10000;assert.throws(()=>assertNativeRecipePlan(q));
 const r=valid();r.futureUpperBudget.maxStates=10001;assert.throws(()=>assertNativeRecipePlan(r));
});
test('qualification descriptor, selected147 and D3 validation envelope are mandatory',()=>{
 const q=valid();delete q.nativeQualification;assert.throws(()=>assertNativeRecipePlan(q));
 const r=valid();r.nativeQualification.sha256='bad';assert.throws(()=>assertNativeRecipePlan(r));
 const s=valid();s.selected.pop();assert.throws(()=>assertNativeRecipePlan(s));
 const t=valid();t.staticSlot.difficulty=2;assert.throws(()=>assertNativeRecipePlan(t));
});

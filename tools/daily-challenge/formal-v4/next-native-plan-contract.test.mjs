import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {assertNextNativeRecipePlan,assertNextNativeConstructedIndex,NEXT_NATIVE_PLAN_VERSION} from './next-native-plan-contract.mjs';
import {assertNextNativePreparationContext,bindNextNativeAdvancedBaseReceipt,recordNextNativeBinding,NEXT_NATIVE_PROPOSAL,NEXT_NATIVE_PROPOSAL_REVIEW} from './prepare-next-native-three-plan.mjs';
import {runNextNativePrefixPlan} from './run-next-native-prefix-plan.mjs';

// In-memory metadata only: never calls prepare, construct, a model or ledger.
const q=JSON.parse(fs.readFileSync(NEXT_NATIVE_PROPOSAL.path)),old=JSON.parse(fs.readFileSync(q.inheritPriorPlan.path));
const d={path:'private-unused-metadata.json',sha256:'1'.repeat(64)};
function fixture(){return{...structuredClone(old),version:NEXT_NATIVE_PLAN_VERSION,proposal:NEXT_NATIVE_PROPOSAL,proposalReview:NEXT_NATIVE_PROPOSAL_REVIEW,
 approvedRecipes:q.recommendedRecipes,blueprints:q.blueprints.filter(b=>q.recommendedRecipes.includes(b.recipeId)),previousMacro64ActualInputs:51,maximumAfterThisBatch:54,
 selectedIndex:d,selected:[...old.selected,d],selectedCount:148,advancedOutcomes:[d,{...d,path:'other-private-unused.json'}],
 failedParents:q.history.sealedParents,deferredRecipesExecutable:false};}
test('new reviewed metadata is accepted without old source/cut constants',()=>assert.equal(assertNextNativeRecipePlan(fixture()),true));
test('frozen previous plan is rejected instead of disguised as a new plan',()=>assert.throws(()=>assertNextNativeRecipePlan(old)));
test('only the three approved recipe identifiers and unique source recipes are allowed',()=>{
 const a=fixture();a.blueprints.push(q.blueprints.at(-1));assert.throws(()=>assertNextNativeRecipePlan(a));
 const b=fixture();b.blueprints[0]={...b.blueprints[0],recipeId:q.deferredRecipesNotExecutable[0]};assert.throws(()=>assertNextNativeRecipePlan(b));
});
test('full world and macro accounting reject over-limit or mismatched values',()=>{
 for(const change of [p=>p.futureUpperBudget.maxStates=10001,p=>p.futureLowerBudget.maxStates=10000,p=>p.maximumAfterThisBatch=55,p=>p.previousMacro64ActualInputs=62,
  p=>p.maximumStocksEnteringColourCspIncludingFailed=4]){const p=fixture();change(p);assert.throws(()=>assertNextNativeRecipePlan(p));}
});
test('latest selection and deferred status cannot be silently relaxed',()=>{
 const a=fixture();a.selectedCount=147;assert.throws(()=>assertNextNativeRecipePlan(a));const b=fixture();b.deferredRecipesExecutable=true;assert.throws(()=>assertNextNativeRecipePlan(b));
});
test('prepare requires two distinct bound outcomes and the terminal completion descriptor',()=>{
 const c={selection:d,advancedOutcomes:[d,{...d,path:'other-private-unused.json'}],advancedCompletion:d};assertNextNativePreparationContext(c);
 assert.throws(()=>assertNextNativePreparationContext({...c,advancedOutcomes:[d,d]}));
 assert.throws(()=>assertNextNativePreparationContext({...c,advancedCompletion:undefined}));
 assert.throws(()=>assertNextNativePreparationContext({...c,allowFailedRetry:true}));
});
function constructed(){const p=fixture(),recipes=p.blueprints.slice(0,2);return{p,index:{status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',scope:300,
 fixedColourInputs:2,stocksEnteringColourCspIncludingFailed:2,eligibleInputs:2,macro64ActualInputsIncludingThis:53,
 perRecipeColourCspInputs:Object.fromEntries(recipes.map(b=>[b.recipeId,1])),candidates:recipes.map(b=>({...d,recipeId:b.recipeId,sourceLevelId:b.sourceLevelId})),
 gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false}};}
test('math runner import is inert and actual two inputs count as 51+2 rather than maximum54',()=>{
 assert.equal(typeof runNextNativePrefixPlan,'function');const {p,index}=constructed();assertNextNativeConstructedIndex(index,p);
 index.macro64ActualInputsIncludingThis=54;assert.throws(()=>assertNextNativeConstructedIndex(index,p));
});
test('constructed input count cannot be negative, unknown, duplicated or assigned to another source',()=>{
 for(const change of [x=>x.perRecipeColourCspInputs[q.recommendedRecipes[0]]=-1,x=>x.perRecipeColourCspInputs.unknown=0,
  x=>x.candidates[1]={...x.candidates[0]},x=>x.candidates[0].sourceLevelId=999,x=>x.publicLedgerClaims=1]){
  const {p,index}=constructed();change(index);assert.throws(()=>assertNextNativeConstructedIndex(index,p));
 }
});
const advancedPlan=JSON.parse(fs.readFileSync('deliverables/daily-formal-v4-20261008/design/low-band-two-advanced-plan-01/plan.json'));
const advancedFiles=['01-daily-mechanisms-generator-35-d2-02.json','02-daily-mechanisms-key-lock-59-d2-03.json'];
test('both actual expanded advanced base receipts bind their original immutable public evidence',async()=>{
 for(const name of advancedFiles){const a=JSON.parse(fs.readFileSync('deliverables/daily-formal-v4-20261008/selection/low-band-two-advanced-01/'+name));
  const row=advancedPlan.rows.find(r=>r.slot.formalId===a.formalId);assert.throws(()=>assert.deepEqual(a.baseReceipt,row.base),'Original whole-object comparison falsely rejected enriched metadata');
  const bound=await bindNextNativeAdvancedBaseReceipt(a,row);assert.equal(bound.base.accepted,true);assert.equal(Object.keys(bound.fileBindings).length,3);
  for(const mutate of [x=>x.baseReceipt.sha256='0'.repeat(64),x=>x.baseReceipt.request.sha256='0'.repeat(64),x=>delete x.baseReceipt.result,
   x=>x.baseReceipt.routeSha256='0'.repeat(64)]){const bad=structuredClone(a);mutate(bad);await assert.rejects(bindNextNativeAdvancedBaseReceipt(bad,row));}
 }
});
test('ledger inventory refresh cannot overwrite a previously read SHA',()=>{
 const bindings={'already-read.json':'a'.repeat(64)};recordNextNativeBinding(bindings,'already-read.json','a'.repeat(64));
 assert.throws(()=>recordNextNativeBinding(bindings,'already-read.json','b'.repeat(64)));assert.equal(bindings['already-read.json'],'a'.repeat(64));
});

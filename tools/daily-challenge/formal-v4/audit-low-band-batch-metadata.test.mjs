import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {assertLowBandCandidateRecipe,assertLowBandBatchPrefixFacts,assertLowBandBatchCspAccounting} from './audit-low-band-batch-static-independent.mjs';
import {assertLowBandRecordedUpperAccounting} from './audit-low-band-batch-actual-independent.mjs';

test('fixed low difficulty and branch metadata cannot be replaced by another source or band',()=>{
 const bp={recipeId:'new-a',sourceLevelId:40,targetDifficulty:1,branchId:'branch40',prefixFacts:{drags:2,parking:1,clears:1}},q={...bp,predeclaredUpperStrategy:'plain-joint-low-band'};
 assertLowBandCandidateRecipe(bp,q,q,q);assert.throws(()=>assertLowBandCandidateRecipe(bp,q,q,{...q,targetDifficulty:2}));assert.throws(()=>assertLowBandCandidateRecipe(bp,q,q,{...q,branchId:'unrelated'}));
 const facts={valid:true,providedPrefixOnly:true,fullUValidated:false,isLowerBound:false,complete:false,drags:2,nonClearingDrags:1,clearEvents:1};assertLowBandBatchPrefixFacts(bp,facts);
 assert.throws(()=>assertLowBandBatchPrefixFacts(bp,{...facts,isLowerBound:true}));assert.throws(()=>assertLowBandBatchPrefixFacts({...bp,prefixFacts:{drags:21,parking:20,clears:1}},{...facts,drags:21,nonClearingDrags:20}));
});
test('dynamic actual CSP including rejection is charged by recipe without an old16 or64 quota',()=>{
 const p={campaign:{previousActualInputs:58},blueprints:[{recipeId:'a',sourceLevelId:40,maximumStocks:1},{recipeId:'b',sourceLevelId:86,maximumStocks:1}]};
 const index={attempts:[{index:0,recipeId:'a',sourceLevelId:40,enteredColourCsp:false},{index:1,recipeId:'b',sourceLevelId:86,enteredColourCsp:true}],perRecipeColourCspInputs:{b:1},fixedColourInputs:1,totalActualInputsIncludingThis:59};
 const rows=index.attempts.map(a=>({index:a.index,recipeId:a.recipeId,source:a.sourceLevelId,enteredColourCsp:a.enteredColourCsp}));assertLowBandBatchCspAccounting(index,p,rows);
 assert.throws(()=>assertLowBandBatchCspAccounting({...index,perRecipeColourCspInputs:{a:1}},p,rows));assert.throws(()=>assertLowBandBatchCspAccounting({...index,totalActualInputsIncludingThis:64},p,rows));
});
test('original recorded low-band upper accounting rejects raw, transition, micro and timer tampering without replay or search',async()=>{
 const q=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/design/low-band-sixteen-math-01/candidate-009.json','utf8'));
 const input=JSON.parse(await fs.readFile(q.input.path,'utf8')),prefix=input.prefixDrags;assertLowBandRecordedUpperAccounting(q,prefix);
 for(const mutate of [c=>c.upperAccounting.conservativeFullBoardStateUpperBound++,c=>c.upperConstruction.prefixTransitions--,c=>c.upperConstruction.tailSearch.budget.maxMicroStates++,c=>c.upperConstruction.tailSearch.elapsedMilliseconds=c.upperConstruction.tailSearch.budget.maxMilliseconds,c=>c.upperConstruction.tailSearch.elapsedMilliseconds=c.upperConstruction.elapsedMilliseconds+1,c=>c.plan.fullUpperBudget.maxMilliseconds=120000]){const c=structuredClone(q);mutate(c);assert.throws(()=>assertLowBandRecordedUpperAccounting(c,prefix));}
});

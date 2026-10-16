import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assertNativeStaticPlan,assertNativeCandidateRecipe,assertSolidNativeStock} from './audit-native-prefix-static-independent.mjs';
const plan=JSON.parse(fs.readFileSync('deliverables/daily-formal-v4-20261008/design/native-prefix-three-plan-01/plan.json'));
test('fixed three recipes retain native-only one-tail contract and exact 49 to 52 envelope',()=>{
 assert(assertNativeStaticPlan(plan));assert.equal(plan.blueprints[1].region.originalBodyCount,3);
 for(const edit of [q=>q.maximumAfterThisBatch=53,q=>q.futureStrategy.tailStrategy='plain-joint',q=>q.futureStrategy.maximumTailCalls=2,q=>q.futureStrategy.originalLowerFloor=16,q=>q.futureStrategy.upperParkingCap=128]){
  const q=structuredClone(plan);edit(q);assert.throws(()=>assertNativeStaticPlan(q));
 }
});
test('recipe/target prefix shape fields may not borrow another source or stock allowance',()=>{
 for(const edit of [q=>q.blueprints[0].maximumStocks=2,q=>q.blueprints[1].prefixDrags.pop(),q=>q.blueprints[2].targetDifficulty=2,q=>q.blueprints[0].recipeId='other']){
  const q=structuredClone(plan);edit(q);assert.throws(()=>assertNativeStaticPlan(q));
 }
});
test('attempt, index item and actual candidate must keep recipe/source and native strategy',()=>{
 const b=plan.blueprints[0],item={recipeId:b.recipeId,sourceLevelId:b.sourceLevelId},q={...item,predeclaredUpperStrategy:'native'};
 assert(assertNativeCandidateRecipe(b,item,item,q));
 assert.throws(()=>assertNativeCandidateRecipe(b,item,{...item,recipeId:'wrong'},q));
 assert.throws(()=>assertNativeCandidateRecipe(b,item,item,{...q,sourceLevelId:18}));
 assert.throws(()=>assertNativeCandidateRecipe(b,item,item,{...q,predeclaredUpperStrategy:'plain-joint'}));
});
test('native rectangular scope rejects L-body or missing rectangle cell',()=>{
 assert(assertSolidNativeStock({blocks:[{shape:[[0,0],[1,0],[0,1],[1,1]]},{shape:[[0,0],[0,1],[0,2]]}]}));
 assert.throws(()=>assertSolidNativeStock({blocks:[{shape:[[0,0],[1,0],[0,1]]}]}));
 assert.throws(()=>assertSolidNativeStock({blocks:[{shape:[[0,0],[0,2]]}]}));
});

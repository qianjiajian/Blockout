import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {assertNative120SearchAccounting,assertNative120ReceiptBindings,assertNative120UpperAccounting,assertNativeBatchActualEnvelope} from './audit-native-batch-actual-independent.mjs';
import {NATIVE_BATCH_REVIEW_STATUS,NATIVE_BATCH_STATIC_REVIEW_STATUS} from './native-batch-contract.mjs';

const privateReport=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/proof/native120-counter-independent-v2-01/author-rerun/report.json'));
const reference=privateReport.evidence.find(e=>e.result?.accepted&&e.result?.upperConstruction?.tailSearch)?.result;assert(reference);
const prefix=reference.upperConstruction.drags.slice(0,reference.upperConstruction.prefixAudits.length);
const descriptor={path:'private-metadata-only.json',sha256:'0'.repeat(64)};

test('dynamic actual envelope accepts zero searched inputs and charges all five failed CSP stocks',async()=>{
 const plan=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/design/native120-five-plan-01/plan.json'));
 const index={scope:300,status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',plan:descriptor,recipeReview:descriptor,
  fixedColourInputs:0,stocksEnteringColourCspIncludingFailed:0,eligibleInputs:0,candidates:[],attempts:[],perRecipeColourCspInputs:{},
  macro64ActualInputsIncludingThis:plan.previousMacro64ActualInputs,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
 const completion={status:'FINITE_FIRST_PREFIX_TAIL_BATCH_FINISHED',descriptors:{index:descriptor},batchPlan:descriptor,results:[],accepted:[],mathematicalPoolAccepted:0,selectedCandidatesAdded:0};
 const audit={status:NATIVE_BATCH_STATIC_REVIEW_STATUS,index:descriptor,plan:descriptor,recipeReview:descriptor,errors:[],verifiedCandidates:0,publicClaimsStarted:0,newGameplaySearches:0};
 const visual={status:'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED',index:descriptor,viewedCandidates:0};
 const review={status:NATIVE_BATCH_REVIEW_STATUS,plan:descriptor,errors:[],recipeCount:plan.blueprints.length,newSearches:0,newConstructions:0};
 assertNativeBatchActualEnvelope(completion,index,plan,audit,visual,review);
 for(const bp of plan.blueprints){index.attempts.push({recipeId:bp.recipeId,enteredColourCsp:true});index.perRecipeColourCspInputs[bp.recipeId]=1;index.fixedColourInputs++;index.stocksEnteringColourCspIncludingFailed++;index.macro64ActualInputsIncludingThis++;}
 assertNativeBatchActualEnvelope(completion,index,plan,audit,visual,review);
 const bad=structuredClone(completion);bad.mathematicalPoolAccepted=1;assert.throws(()=>assertNativeBatchActualEnvelope(bad,index,plan,audit,visual,review));
});
test('recorded native120 raw accounting cannot borrow frozen lower guard or hide state/transition excess',()=>{
 const s=reference.upperConstruction.tailSearch;assertNative120SearchAccounting(s);
 for(const change of [q=>q.rawFullBoardStates=10001,q=>q.attemptedTransitions=q.budget.maxTransitions+1,q=>q.microDiscoveredStates=q.budget.maxMicroStates+1,
  q=>q.guardAllowance.version='frozen-lower-guard',q=>q.lowerBoundCertified=true,q=>q.elapsedMilliseconds=q.budget.maxMilliseconds]){const q=structuredClone(s);change(q);assert.throws(()=>assertNative120SearchAccounting(q));}
});
test('one shared upper sum includes prior full assignments, prefix worlds and terminal allowance',()=>{
 assertNative120UpperAccounting(reference,prefix);
 for(const change of [q=>q.upperAccounting.conservativeFullBoardStateUpperBound--,q=>q.upperAccounting.terminalAllowance=0,
  q=>q.plan.constructionAccounting.completeWorldReservations++,q=>q.upperConstruction.tailSearch.budget.maxTransitions++,q=>q.upperAccounting.maximumElapsedMilliseconds=30000,
  q=>q.upperConstruction.tailSearch.elapsedMilliseconds=q.upperConstruction.elapsedMilliseconds+1,
  q=>{q.upperConstruction.prefixTransitions--;q.upperConstruction.tailSearch.budget.maxTransitions++;}]){
  const q=structuredClone(reference);change(q);assert.throws(()=>assertNative120UpperAccounting(q,prefix));}
});
test('upper engine/wrapper bindings and lower4588 remain distinct with production 120s/30s plans',()=>{
 const q=structuredClone(reference);Object.assign(q.plan.fullUpperBudget,{maxStates:10000,maxMilliseconds:120000});Object.assign(q.plan.lowerBudget,{maxStates:9999,maxMilliseconds:30000});
 assertNative120ReceiptBindings(q);
 for(const change of [r=>r.lowerToolchainSha256=r.upperToolchainSha256,r=>r.plan.lowerBudget.maxMilliseconds=120000,
  r=>r.nativeWrapper.sha256='0'.repeat(64),r=>r.upperToolchainBindings[r.upperEngine.tool.path]='0'.repeat(64)]){const bad=structuredClone(q);change(bad);assert.throws(()=>assertNative120ReceiptBindings(bad));}
});
test('complete U after shared deadline cannot enter accepted/route branch',()=>{
 const q=structuredClone(reference);q.upperAccounting.totalElapsedMilliseconds=q.plan.fullUpperBudget.maxMilliseconds;
 assert.throws(()=>assertNative120UpperAccounting(q,prefix),/Late witness/);
 q.accepted=false;q.route=null;q.lowerBound=null;q.L=null;q.U=null;assertNative120UpperAccounting(q,prefix);
});

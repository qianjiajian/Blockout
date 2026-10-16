import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {NATIVE_BATCH_VERSION,assertNativeBatchPlan,assertNativeBatchRecipe,deriveNativeMacroAccounting,assertNativeBatchIndex,recordNativeColourAttempt} from './native-batch-contract.mjs';
import {sha,claimNativeBatchPlan,finishLatePrefixPlan,realPathWithSuffix,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,checkLedgerSnapshot,HISTORY_LEDGER_ROOTS,mergeBindings,assertReviewedNativeQualification} from './native-batch-io.mjs';
import {nativeSelectionReviewBindings} from './prepare-native-batch.mjs';

const d=n=>({path:`synthetic-${n}.json`,sha256:String(n).padStart(64,'0')});
function recipe(id='fixture-a',source=17,quota=1){
 const level={id:source,width:4,height:2,blocks:Array.from({length:8},(_,i)=>({id:`b${i}`,x:i%4,y:Math.floor(i/4),shape:[[0,0]],color:i%2?'blue':'red'})),gates:[]};
 const ids=['b2','b3','b6','b7'],changed=level.blocks.filter(b=>ids.includes(b.id)),prefixDrags=[{blockId:'b0',path:[],exitSide:'left'}];
 return{recipeId:id,sourceLevelId:source,maximumStocks:quota,targetDifficulty:3,reference:d(10),level,referenceLevelSha256:levelSha256(level),
  changedBodies:changed,fixedBlocks:level.blocks.filter(b=>!ids.includes(b.id)),normalBoardArea:8,
  region:{bodyIds:ids,cells:changed.map(b=>[b.x,b.y]),area:4,fraction:.5,connected:true},prefixDrags,prefixSha256:routeSha256(prefixDrags),
  prefixFacts:{drags:1,parking:0,clears:1},prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true};
}
function fixturePlan(){
 const macroHistory=deriveNativeMacroAccounting([{plan:d(1),previous:49,actual:2,after:51,quota:3,qualificationOnly:false,terminal:true},
  {plan:d(2),previous:51,actual:3,after:54,quota:3,qualificationOnly:false,terminal:true}]);
 const blueprints=[recipe('alpha',17,1),recipe('beta',23,2)];
 return{schemaVersion:4,scope:300,version:NATIVE_BATCH_VERSION,qualificationOnly:false,selectedIndex:d(3),selectionReview:d(4),historyCheckpoint:d(5),nativeQualification:d(6),
  selected:[d(7)],selectedCount:1,macroHistory,previousMacro64ActualInputs:54,maximumAfterThisBatch:57,combinedMaximumInputs:64,
  blueprints,approvedRecipes:blueprints.map(b=>b.recipeId),failedParents:[{source:17,id:'old-a'},{source:23,id:'old-b'}],
  maximumFinalColourInputsIncludingRejected:3,maximumStocksEnteringColourCspIncludingFailed:3,maximumStaticPartitionAttempts:2000,
  futureStrategy:{tailStrategy:'native-120',originalLowerFloor:31,maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},
  futureUpperBudget:{maxStates:10000,maxMilliseconds:120000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000},
  futureLowerBudget:{maxStates:9999,maxMilliseconds:30000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000},
  sequence:{baseSeed:333,step:17,sourceFactor:13,bodyCountDeltas:[-2,0,3]},similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,newBatch:.65,source:.55,old450:.75},
  staticSlot:{stageKey:'basic-combined',difficulty:3},slotAssigned:false,formalReady:false,currentRuntimeValidationClaimed:false,noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,
  bindings:{'fixture-tool':'fixture'},ledgerSnapshot:{roots:[{directory:'synthetic',files:[]}]}};
}
test('explicit source/cut/count: no old 3-recipe/150-selected constants',()=>{
 const p=fixturePlan();assertNativeBatchPlan(p);p.blueprints[1].maximumStocks=9;p.maximumStocksEnteringColourCspIncludingFailed=10;p.maximumFinalColourInputsIncludingRejected=10;p.maximumAfterThisBatch=64;assertNativeBatchPlan(p);
 p.blueprints[1].maximumStocks=10;p.maximumStocksEnteringColourCspIncludingFailed=11;p.maximumFinalColourInputsIncludingRejected=11;p.maximumAfterThisBatch=65;assert.throws(()=>assertNativeBatchPlan(p));
});
test('history uses actual CSP count; rejects missing batch, quota substitution, interruption and duplicate',()=>{
 const rows=fixturePlan().macroHistory.rows;assert.equal(deriveNativeMacroAccounting(rows).remaining,10);
 for(const mutate of [r=>r[1].previous=52,r=>r[0].actual=3,r=>r[1].terminal=false,r=>r[1].plan=r[0].plan]){const q=structuredClone(rows);mutate(q);assert.throws(()=>deriveNativeMacroAccounting(q));}
});
test('region exact union/true connectivity/35 percent and untouched prefix are hard conditions',()=>{
 assertNativeBatchRecipe(recipe());
 for(const mutate of [b=>b.region.cells[0]=[99,99],b=>b.region.fraction=.34,b=>b.normalBoardArea=100,b=>b.prefixDrags[0].blockId='b2',b=>b.fixedBlocks.pop(),b=>b.sourceLevelId++]){
  const b=recipe();mutate(b);b.prefixSha256=routeSha256(b.prefixDrags);assert.throws(()=>assertNativeBatchRecipe(b));}
 const b=recipe();b.changedBodies=b.level.blocks.filter(x=>['b0','b3','b4','b7'].includes(x.id));b.region.bodyIds=b.changedBodies.map(x=>x.id);b.region.cells=b.changedBodies.map(x=>[x.x,x.y]);b.fixedBlocks=b.level.blocks.filter(x=>!b.region.bodyIds.includes(x.id));b.prefixDrags[0].blockId='b1';b.prefixSha256=routeSha256(b.prefixDrags);assert.throws(()=>assertNativeBatchRecipe(b),/connected/);
});
test('120 seconds is upper-only: raw/transition/micro/30-second L budgets and static ceiling unchanged',()=>{
 for(const mutate of [p=>p.futureUpperBudget.maxStates=10001,p=>p.futureLowerBudget.maxStates=10000,p=>p.futureLowerBudget.maxMilliseconds=120000,
  p=>p.futureUpperBudget.maxMilliseconds=Infinity,p=>p.futureUpperBudget.maxTransitions=10000001,p=>p.futureUpperBudget.maxMicroStates=3000001,p=>p.maximumStaticPartitionAttempts=2001,p=>p.sequence.bodyCountDeltas=[-3]]){
  const p=fixturePlan();mutate(p);assert.throws(()=>assertNativeBatchPlan(p));}
});
test('a rejected colour CSP uses its recipe quota, geometry-only rejection does not',()=>{
 const counts=new Map(),b=recipe();assert.equal(recordNativeColourAttempt(counts,b,{ok:false}),false);
 assert.equal(recordNativeColourAttempt(counts,b,{ok:false,paint:{reason:'shape-exit-domain'}}),true);assert.equal(counts.get(b.recipeId),1);
 assert.throws(()=>recordNativeColourAttempt(counts,b,{ok:true,paint:{}}),/quota/);assert.throws(()=>recordNativeColourAttempt(new Map(),b,{ok:true}),/consume/);
});
test('constructed index cannot omit colour failures or exceed the reviewed per-recipe quota',()=>{
 const p=fixturePlan(),i={scope:300,status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',fixedColourInputs:1,stocksEnteringColourCspIncludingFailed:1,
  eligibleInputs:0,candidates:[],attempts:[{recipeId:'alpha',enteredColourCsp:true,rejection:'shape-exit-domain'}],macro64ActualInputsIncludingThis:55,
  perRecipeColourCspInputs:{alpha:1},gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};assertNativeBatchIndex(i,p);
 for(const mutate of [q=>q.attempts=[],q=>q.perRecipeColourCspInputs.alpha=2,q=>q.macro64ActualInputsIncludingThis=54,q=>q.fixedColourInputs=0]){const q=structuredClone(i);mutate(q);assert.throws(()=>assertNativeBatchIndex(q,p));}
 const forged={...i,fixedColourInputs:2,stocksEnteringColourCspIncludingFailed:2,macro64ActualInputsIncludingThis:56,perRecipeColourCspInputs:{alpha:1,beta:1},attempts:[...i.attempts,...i.attempts]};
 assert.throws(()=>assertNativeBatchIndex(forged,p),/recipe CSP quota/);
});
test('wx shared-plan discipline tested only in private ledger: new output cannot restart same plan',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'native-batch-private-'));const file=path.join(tmp,'plan.json');await fs.writeFile(file,'{"qualificationFixture":true}\n');const desc={path:file,sha256:sha(await fs.readFile(file))};
 const opts={qualificationOnly:true,ledgerDirectory:path.join(tmp,'private-ledger')};const claim=await claimNativeBatchPlan(desc,path.join(tmp,'first-output'),opts);
 await finishLatePrefixPlan(claim,{status:'PRIVATE_QUALIFICATION_FINISHED',stocksEnteringColourCspIncludingFailed:1});
 assert.equal(claim.qualificationOnly,true);await assert.rejects(claimNativeBatchPlan(desc,path.join(tmp,'second-output'),opts),e=>e.code==='EEXIST');
 await fs.writeFile(file,'{"qualificationFixture":"changed"}\n');await assert.rejects(claimNativeBatchPlan(desc,path.join(tmp,'third-output'),opts),/changed|SHA/);
});
test('private namespace rejects actual shared roots, junction aliases, future suffix and nonboolean flags before writing',async()=>{
 const missing={path:'nonexistent-private-test.json',sha256:'0'.repeat(64)};
 for(const root of HISTORY_LEDGER_ROOTS)for(const suffix of ['',path.join('not-created','future')]){
  const direct=path.join(root,suffix),real=path.join(await realPathWithSuffix(root),suffix);
  for(const dir of [direct,real])await assert.rejects(claimNativeBatchPlan(missing,'unused',{qualificationOnly:true,ledgerDirectory:dir}),/Private ledger/);}
 await assert.rejects(claimNativeBatchPlan(missing,'unused',{qualificationOnly:'true'}));
});
test('history directory snapshot rejects an unreviewed append as well as changed bytes',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'native-batch-snapshot-')),file=path.join(tmp,'one.json');await fs.writeFile(file,'{}');
 const snapshot={roots:[{directory:tmp,files:[{path:file,sha256:sha(await fs.readFile(file))}]}]},opts={qualificationOnly:true,expectedPrivateRoots:[tmp]};await checkLedgerSnapshot(snapshot,opts);
 const extra=path.join(tmp,'two.json');await fs.writeFile(extra,'{}');await assert.rejects(checkLedgerSnapshot(snapshot,opts),/Unreviewed/);await checkLedgerSnapshot(snapshot,{...opts,allowedNewFiles:[extra]});
 await fs.writeFile(file,'{"changed":true}');await assert.rejects(checkLedgerSnapshot(snapshot,{...opts,allowedNewFiles:[extra]}));
});
test('zero-CSP batch precedes positive batch at same start regardless of filesystem order',()=>{
 const q=deriveNativeMacroAccounting([{plan:d(21),previous:54,actual:1,after:55,quota:1,qualificationOnly:false,terminal:true},{plan:d(22),previous:54,actual:0,after:54,quota:1,qualificationOnly:false,terminal:true}]);assert.equal(q.total,55);assert.equal(q.rows[0].actual,0);
});
test('binding merge refuses a conflicting snapshot instead of overwriting earlier evidence',()=>{
 const a={'one.json':'1'.repeat(64)};mergeBindings(a,{'one.json':'1'.repeat(64),'two.json':'2'.repeat(64)});assert.equal(Object.keys(a).length,2);
 assert.throws(()=>mergeBindings(a,{'one.json':'3'.repeat(64)}),/Conflicting/);assert.equal(a['one.json'],'1'.repeat(64));
});
test('production snapshot cannot omit shared roots',async()=>{
 await assert.rejects(checkLedgerSnapshot({roots:[]}),/root set/);await assert.rejects(checkLedgerSnapshot({roots:HISTORY_LEDGER_ROOTS.slice(0,4).map(directory=>({directory,files:[]}))}),/root set/);
});
test('native120 v2 actual independent schema passes; author-only or weakened evidence fails',async()=>{
 const q=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/proof/native120-counter-independent-v2-01/report.json'));
 const bindings=await assertReviewedNativeQualification(q);assert.equal(bindings[q.reviewed.wrapper.path],q.reviewed.wrapper.sha256);
 for(const mutate of [r=>r.status='NATIVE120_PREFIX_TAIL_V4_V2_PRIVATE_QUALIFICATION_PASS',r=>r.independentNewNegatives.testsPassed=2,r=>r.reviewed.wrapper.sha256='0'.repeat(64),r=>r.publicClaimsStarted=1,r=>r.publicRequestCountAfter++]){const c=structuredClone(q);mutate(c);await assert.rejects(assertReviewedNativeQualification(c));}
});
test('actual selection review uses the bound inputBindings and count, not an invented schema fallback',async()=>{
 const context=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/design/native120-five-plan-context-01.json'));
 const review=JSON.parse(await fs.readFile(context.selectionReview.path)),index=JSON.parse(await fs.readFile(context.selection.path));
 const bindings=nativeSelectionReviewBindings(review,index,context.selection);assert.equal(Object.keys(bindings).length,Object.keys(review.inputBindings).length);
 for(const file of index.files)assert(bindings[file]??bindings[path.resolve(file)]);
 for(const mutate of [q=>q.candidates--,q=>delete q.inputBindings,q=>q.selection.sha256='0'.repeat(64),q=>q.newLedgerClaims=1]){const c=structuredClone(review);mutate(c);assert.throws(()=>nativeSelectionReviewBindings(c,index,context.selection));}
});

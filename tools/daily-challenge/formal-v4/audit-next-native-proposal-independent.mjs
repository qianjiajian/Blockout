import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {describeLayout} from '../formal-v3/diversity.mjs';

// Audits existing metadata and known routes only. Never imports or calls a
// constructor, solver, ledger claim/finish, plan writer, or admission entry.
const own='tools/daily-challenge/formal-v4/audit-next-native-proposal-independent.mjs';
const proposal={path:'deliverables/daily-formal-v4-20261008/design/next-native-readonly-proposal-01/proposal.json',sha256:'1351db3c5846b05786faa380be0a828658f881805032a27818aac71cb70efb2a'};
const output='deliverables/daily-formal-v4-20261008/proof/next-native-proposal-independent-01';
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts';
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={},errors=[],rows=[];
async function bytes(p,h){const full=path.resolve(p),b=await fs.readFile(full),actual=sha(b);if(h)assert.equal(actual,h,p);if(bindings[full])assert.equal(actual,bindings[full]);bindings[full]=actual;return b;}
const read=async(p,h)=>JSON.parse(await bytes(p,h));
const bound=d=>read(d.path,d.sha256);
const check=async m=>{for(const[p,h]of Object.entries(m))await bytes(p,h);};
const occupied=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]);
const sorted=a=>a.toSorted((a,b)=>a[1]-b[1]||a[0]-b[0]);
const key=p=>p.join(',');
const requestNames=async()=> (await fs.readdir(ledger)).filter(n=>n.endsWith('.request.json')).sort();
const before=await requestNames();let q=null,environment=null;
try{
 q=await bound(proposal);assert.equal(q.executable,false);assert.equal(q.status,'READ_ONLY_RECIPE_PROPOSAL_NO_EXECUTION_PLAN');
 for(const k of ['newPhysicalInputs','newConstructions','newSearches','ledgerWrites'])assert.equal(q[k],0);
 assert.equal(q.selectionChanged,false);assert.equal(q.formalReady,false);
 await check(q.bindings);const runtime=await loadV4CatalogRuntime();environment=prefixExecutionEnvironment(runtime,q.executionEnvironment.descriptor);
 assert.deepEqual(environment,q.executionEnvironment);await check(runtime.toolchainBindings);await check(runtime.designBindings);
 const selected=await bound(q.selectedIndex);assert.equal(selected.files.length,147);assert.deepEqual(q.selected.map(d=>d.path),selected.files);
 for(const d of [...q.selected,...q.reservedAccepted]){const r=await bound(d);assert.equal(r.accepted,true);assert.equal(d.levelSha256,levelSha256(r.level));
  assert.equal(d.partitionSha256,describeLayout(r.level).exactPartitionSha256);}
 assert.equal(q.reservedAccepted.length,3);assert(q.reservedAccepted.some(d=>d.path.endsWith('native-prefix-three-math-01/candidate-000.json')));
 assert.equal(q.latestSelectionMustBeReboundBeforeExecution,true);assert.equal(q.pendingLowBandMechanismFinalsMustJoinFutureComparisonSet,true);
 assert.equal(q.previousMacro64ActualInputs,51);assert.equal(q.recommendedNewInputs,3);assert.equal(q.maximumAfterRecommendedBatch,54);
 assert.equal(q.maximumStocksPerRecipe,1);assert.equal(q.maximumStaticPartitionAttempts,2000);assert(q.maximumAfterAbsoluteBatch<=64);
 assert.equal(q.recommendedRecipes.length,3);assert.equal(new Set(q.recommendedRecipes).size,3);
 const limits=q.searchStrategy;assert.equal(limits.tailSearchesMaximum,1);assert.equal(limits.originalLowerCallsMaximum,1);
 assert.equal(limits.fullOriginalLowerFloor,31);assert.equal(limits.upperBudget.maxStates,10000);assert.equal(limits.originalLowerBudget.maxStates,9999);
 for(const budget of [limits.upperBudget,limits.originalLowerBudget]){
  assert.equal(budget.maxTransitions,10000000);assert.equal(budget.maxMicroStates,3000000);assert.equal(budget.maxMilliseconds,30000);}
 assert.equal(limits.terminalGuardAllowance,1);assert.equal(limits.deductAllConstructionPrefixResources,true);
 assert.equal(limits.lowerOnlyAfterTwoCompleteOriginalModelReplays,true);assert.equal(limits.noUCapForD3,true);assert.equal(limits.noOtherMethodOrPrefixAfterUnknown,true);
 assert.match(limits.completeUpperFormula,/constructor complete worlds.*prefix committed worlds.*tail raw worlds.*guard1 <=10000/);
 const gates=q.geometryAndHistoryGates;
 assert.equal(gates.exactConnectedChangedAreaMinimum,.35);assert.equal(gates.parentAndAllKnownCurrentCandidateFootprintMaximum,.65);
 assert.equal(gates.old450Maximum,.75);assert.equal(gates.sourceMaximum,.55);assert.equal(gates.actualShapeInventoryAndSharedBodyColourChange,true);
 for(const k of ['normalSourceMask','onlySolidUnrotatedRectangleInventory','forbidAllPublicIdentitiesAndPriorConstructedStockShapes','bothDirectionsEightGlobalOrientations',
  'visualRetiredFamiliesRemainBlocked','realNewObjectGlobalComparisonRequiredBeforeAnySearch','noIndependenceClaimFromRegionMetadata'])assert.equal(gates[k],true);
 const old=await bound(q.inheritPriorPlan),options=await bound(q.referenceRegions),nativeIndex=await bound(options.nativeConstruction);
 assert.equal(nativeIndex.macro64ActualInputsIncludingThis,51);
 assert.equal(q.history.publicStocks.length,14746);assert.equal(q.history.old450.length,450);assert(q.history.previousLateStocks.some(s=>s.completeColourInput===false));
 const inventory=await bound(q.history.ledgerInventory);assert.equal(inventory.status,'READ_ONLY_FULL_SHARED_LEDGER_BYTE_SNAPSHOT');assert.equal(inventory.newWrites,0);
 for(const root of inventory.roots)for(const item of root.files)await bytes(item.path,item.sha256);
 for(const parent of q.history.sealedParents){const r=await bound(parent.receipt),request=await bound(parent.request),result=await bound(parent.result);
  assert.equal(r.sourceLevelId,parent.source);assert.deepEqual(r.attempt,request);assert.equal(request.id,parent.id);assert.equal(result.accepted,false);assert.equal(r.accepted,false);
  assert.equal(result.status,r.status);assert.equal(result.levelSha256,r.levelSha256);assert.equal(request.levelSha256,r.levelSha256);
  for(const p of [`${ledger}/${request.id}.blocked.json`,`${ledger}/identities/${request.retryIdentitySha256}.blocked.json`]){
   const b=await read(p);assert.equal(b.attemptId,request.id);assert.equal(b.status,result.status);}
 }
 for(const id of q.recommendedRecipes){const b=q.blueprints.find(x=>x.recipeId===id);assert(b);assert.equal(b.priority,'recommended');assert.equal(b.maximumStocks,1);
  const r=await bound(b.reference);assert.equal(r.accepted,true);assert.deepEqual(r.level,b.level);assert.equal(levelSha256(r.level),b.referenceLevelSha256);
  assert.equal(routeSha256(r.drags),b.referenceRouteSha256);assert.deepEqual(b.prefixDrags,r.drags.slice(0,b.prefixFacts.drags));assert.equal(routeSha256(b.prefixDrags),b.prefixSha256);
  runtime.assertPlainProofDomain(r.level);assert(r.level.blocks.every(body=>body.shape.length===(1+Math.max(...body.shape.map(p=>p[0])))*(1+Math.max(...body.shape.map(p=>p[1])))));
  const source=runtime.LEVELS.find(l=>l.id===b.sourceLevelId);assert(source);assert.equal(levelSha256(source),b.sourceLevelSha256);
  assert.equal(boardBaselineSha256(source),b.boardOutlineSha256);assert.equal(boardBaselineSha256(r.level),b.boardOutlineSha256);
  assert.deepEqual([r.level.width,r.level.height],b.normalDimensions);
  const changedIds=new Set(b.region.bodyIds);assert.deepEqual(r.level.blocks.filter(x=>changedIds.has(x.id)),b.changedBodies);
  assert.deepEqual(r.level.blocks.filter(x=>!changedIds.has(x.id)),b.fixedBlocks);assert.equal(levelSha256(b.fixedBlocks),b.fixedSkeletonSha256);
  const cells=sorted(b.changedBodies.flatMap(occupied));assert.deepEqual(cells,sorted(b.region.cells));assert.equal(new Set(cells.map(key)).size,cells.length);
  assert.equal(cells.length,b.region.area);assert.equal(levelSha256(cells),b.region.sha256);assert.equal(b.region.fraction,b.region.area/b.normalBoardArea);assert(b.region.fraction>=.35);
  const todo=new Set(cells.map(key)),queue=[cells[0]];todo.delete(key(cells[0]));for(const[x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(todo.delete(key(p)))queue.push(p);assert.equal(todo.size,0);
  assert(b.prefixDrags.every(d=>!changedIds.has(d.blockId)));assert.equal(r.drags.findIndex(d=>changedIds.has(d.blockId)),b.prefixDrags.length);
  const canonical=runtime.replayRevisedRoute(r.level,r.drags),independent=independentReplay(runtime,r.level,r.drags);
  for(const replay of [canonical,independent]){assert(replay.valid&&replay.complete&&!replay.failed);assert.equal(replay.nonClearingDrags,b.referenceU);assert.equal(replay.clearEvents,r.level.blocks.length);}
  const partial=independentReplay(runtime,r.level,b.prefixDrags);assert(partial.valid&&!partial.failed);assert.equal(partial.effectiveDrags,b.prefixFacts.drags);
  assert.equal(partial.nonClearingDrags,b.prefixFacts.parking);assert.equal(partial.clearEvents,b.prefixFacts.clears);
  const model=new runtime.PuzzleModel(structuredClone(r.level));model.startCountdown();let parking=0,clears=0;
  for(const d of b.prefixDrags){model.beginAction();let exit=canonicalExit(runtime,model,d.blockId);assert(!exit||d.path.length===0);
   for(const[i,p]of d.path.entries()){const body=model.getBlock(d.blockId),previous=[body.x,body.y];assert.equal(Math.abs(p[0]-body.x)+Math.abs(p[1]-body.y),1);
    assert(model.moveBlockStep(d.blockId,...p));exit=canonicalExit(runtime,model,d.blockId,previous);assert(!exit||i===d.path.length-1);}
   assert.equal(exit,d.exitSide);if(exit){assert(model.tryExit(d.blockId,exit).ok);clears++;}else parking++;assert(model.commitAction());}
  const snapshot=model.snapshot();assert.equal(parking,b.prefixFacts.parking);assert.equal(clears,b.prefixFacts.clears);assert.equal(snapshot.blocks.length,b.prefixFacts.remainingBodies);
  assert.equal(r.level.blocks.reduce((n,x)=>n+x.shape.length,0)-snapshot.blocks.reduce((n,x)=>n+x.shape.length,0),b.prefixFacts.releasedArea);
  for(const body of b.changedBodies){const remaining=snapshot.blocks.find(x=>x.id===body.id);assert(remaining);assert.equal(remaining.x,body.x);assert.equal(remaining.y,body.y);assert.deepEqual(remaining.shape,body.shape);assert.equal(remaining.color,body.color);}
  const parent=q.history.sealedParents.find(p=>p.source===b.sourceLevelId);assert(parent);
  rows.push({recipeId:id,sourceLevelId:b.sourceLevelId,reference:b.reference,normalDimensions:b.normalDimensions,normalBoardArea:b.normalBoardArea,
   changedRegionArea:b.region.area,changedFraction:b.region.fraction,changedOriginalBodies:b.changedBodies.length,fixedBodies:b.fixedBlocks.length,
   prefixDrags:b.prefixFacts.drags,prefixParking:parking,prefixClears:clears,remainingBodies:snapshot.blocks.length,releasedArea:b.prefixFacts.releasedArea,
   originalReferenceCompleteU:canonical.nonClearingDrags,referenceReplayComplete:true,prefixIndependentAndFirstContactPassed:true,changedBodiesUntouchedAndUnmoved:true,
   failedParent:parent.id,shapeColourConstructionStillRequired:true,newCandidateDiversityPassed:false,newL:null,newU:null});
 }
 const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))await bytes(file);await check(bindings);
}catch(error){errors.push({message:error.message,stack:error.stack});}
const after=await requestNames();
const report={status:errors.length?'INDEPENDENT_NEXT_NATIVE_PROPOSAL_REJECTED':'INDEPENDENT_NEXT_NATIVE_PROPOSAL_READONLY_REVIEW_PASS',proposal,
 executable:false,reviewScope:'Three recommended recipe metadata only; no new inventory has been constructed or proved.',rows,
 verifiedRecommendedRecipes:rows.length,requiredBeforeExecution:[
  'Create a separate fixed executable plan for these three recipes only; two deferred rows are not fallback permission.',
  'Rebind the latest selection and both pending low-band mechanism final receipts; compare every actual new object with them, the accepted native draft, prior pool and other new candidates.',
  'Require real new shape and colour against the corresponding failed parent, full q0/coverage/adjacency and actual first-contact prefix replay after choosing new gates.',
  'Reject all public paired identities and exact prior stock/placeholder partitions; keep old failed requests sealed.',
  'Charge construction, prefix and the sole native tail plus guard against one 10000 cap; prove original full-level L31 only after complete dual U.',
 ],budget:{previousMacroInputs:51,threeRecommendedMaximum:54,absoluteCombinedMaximum:64,noExecutionAuthorizedByThisReport:true},
 publicRequestObservation:{before:before.length,after:after.length,unchanged:JSON.stringify(before)===JSON.stringify(after)},
 environment,fileBindings:bindings,errors,newConstructions:0,newSearches:0,newLedgerClaims:0,selectionChanged:false,formalReady:false,currentRuntimeValidationClaimed:false};
await fs.mkdir(output,{recursive:false});await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,report:output+'/report.json',sha256:sha(await fs.readFile(output+'/report.json')),rows:rows.length,errors}));
if(errors.length)process.exitCode=1;

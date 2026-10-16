import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {constructLowTwentyRegionStock} from './low-twenty-region-factory.mjs';
import {assertNoFailedDescendant} from './prepare-low-twenty-task.mjs';
import {PUBLIC_LEDGER,HISTORY_LEDGER_ROOTS,write,sha,checkLedgerSnapshot,finishLatePrefixPlan} from './low-twenty-io.mjs';
import {SELF,MATH_ENTRY,LONG_PREFIX_VERSION,UPPER_BUDGET,LOWER_BUDGET,STATIC_SLOT,assertLongPrefixProposal,assertLongPrefixPlan,assertLongPrefixIndex,
 changedShapeAndColour,recordLongPrefixStock,longPrefixDisposition,longPrefixConstructionFiles,claimLongPrefixCampaign} from './long-prefix-batch-task.mjs';

const out=process.env.LONG_PREFIX_BATCH_TEST_OUT;assert(out,'Explicit fresh private output required');await fs.mkdir(out,{recursive:false});
const runtime=await loadV4Runtime(),environment=prefixExecutionEnvironment(runtime),evidence=[],before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const fixturePath='deliverables/daily-formal-v4-20261008/proof/early-frozen-constructor-toy-probe-01/result.json',fixtureBytes=await fs.readFile(fixturePath),toy=JSON.parse(fixtureBytes).blueprint;
const h='a'.repeat(64),d={path:'private-only.json',sha256:h};let built;
function blueprint(){const b=structuredClone(toy);b.sourceLevelId=b.level.id=1;b.referenceLevelSha256=levelSha256(b.level);b.recipeId='private-one';b.branchId='private-source-1';b.maximumStocks=1;b.targetDifficulty=3;
 b.seed=1;b.colourSeed=1;b.bodyCountDelta=3;b.maximumStaticPartitionAttempts=2;b.allReferenceGates=b.level.gates;b.prefixSha256=routeSha256(b.prefixDrags);b.prefixFacts={drags:b.prefixDrags.length,parking:b.prefixDrags.filter(d=>!d.exitSide).length,clears:b.prefixDrags.filter(d=>d.exitSide).length};
 b.normalBoardArea=8;b.region={...b.region,bodyIds:b.changedBodies.map(x=>x.id),area:6,fraction:.75,connected:true};b.prefixIsNotLowerBound=true;b.oldSuffixIsNotNewU=true;return b;}
function plan(){const b=blueprint();return{version:LONG_PREFIX_VERSION,schemaVersion:4,scope:300,qualificationOnly:false,experimentId:'private-long-prefix-experiment',closedCampaignsExtended:false,closedExperimentIds:['closed-other'],previousExperimentInputs:0,
 proposal:d,proposalReview:d,qualification:d,mathQualification:d,selectedIndex:d,selectionReview:d,historyPlan:d,blueprints:[b],maximumInputs:1,maximumStaticPartitionAttempts:2,
 selected:[d],selectedCount:1,failedParents:[{source:1,branchId:b.branchId}],futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,staticSlot:STATIC_SLOT,
 strategy:{tail:'plain-joint',floor:31,searchUpper:128,maximumTailCalls:1,maximumOriginalLowerCalls:1,fallback:false},gatePolicy:'all-reference-gates-byte-equivalent-in-original-order',successStopsUnclaimedSiblings:true,
 globalShapeInventoryUniquenessRequired:false,exactHistoryExclusionsRetained:true,nearExemptionsAllowed:false,ledgerSnapshot:{roots:Array.from({length:7},()=>({}))},bindings:{[SELF]:h,[MATH_ENTRY]:h},accepted:false,catalogEligible:false,formalReady:false,slotAssigned:false};}
test('explicit proposal fixes every recipe, gate policy, finite quota and original L31',async()=>{
 const file='deliverables/daily-formal-v4-20261008/design/plain-long-prefix-four-proposal-01/proposal.json',p=JSON.parse(await fs.readFile(file));assertLongPrefixProposal(p);
 for(const edit of [q=>q.recipes[0].maximumColourCspInputsIncludingFailure=2,q=>q.recipes[0].regionSha256=h,q=>q.finiteExperiment.extendsClosedLocal18=true,q=>q.futureMathematics.freshOriginalLowerFloor=21]){const q=structuredClone(p);edit(q);assert.throws(()=>assertLongPrefixProposal(q));}
 const q=plan();assertLongPrefixPlan(q);for(const edit of [p=>p.blueprints[0].allReferenceGates=[],p=>p.futureUpperBudget.maxStates=10001,p=>p.strategy.fallback=true,p=>p.staticSlot.formalId=880000,p=>p.closedExperimentIds.push(p.experimentId)]){const p=structuredClone(q);edit(p);assert.throws(()=>assertLongPrefixPlan(p));}
 evidence.push({test:'fixed-plan-and-production-budget-negative',passed:true,proposal:{path:file,sha256:sha(await fs.readFile(file))}});
});
test('actual attempts, including failed CSPs, are the quota source rather than declared totals',()=>{
 const p=plan(),index={status:'LONG_PREFIX_STATIC_COMPLETE_NO_GAMEPLAY_SEARCH',experimentId:p.experimentId,attempts:[{recipeId:'private-one',localAttempt:0,enteredColourCsp:true}],perRecipeColourCspInputs:{'private-one':1},perRecipeStaticAttempts:{'private-one':1},fixedColourInputs:1,candidates:[],eligibleInputs:0,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};assertLongPrefixIndex(index,p);
 for(const edit of [q=>q.fixedColourInputs=0,q=>q.attempts[0].enteredColourCsp=false,q=>q.attempts.push({...q.attempts[0],localAttempt:1}),q=>q.perRecipeColourCspInputs={'private-other':1}]){const q=structuredClone(index);edit(q);assert.throws(()=>assertLongPrefixIndex(q,p));}
 evidence.push({test:'failed-csp-and-static-quota-reconstruction',passed:true});
});
test('one actual private stock preserves all gates and real shape/color while charging complete worlds',async()=>{
 built=constructLowTwentyRegionStock(runtime,toy,{seed:1,colourSeed:1,bodyCountDelta:3,qualificationOnly:true});assert(built.ok,built.reason??built.status);assert.deepEqual(built.level.gates,toy.level.gates);
 assert.equal(built.constructionAccounting.completeWorldReservations,2);assert(built.prefixAudit.valid);assert(changedShapeAndColour(designFingerprints(toy.level),designFingerprints(built.level)));
 const low=constructLowTwentyRegionStock(runtime,toy,{seed:1,colourSeed:1,bodyCountDelta:3,qualificationOnly:true,meterLimits:{maxWorlds:1}});assert.equal(low.ok,false);assert.equal(low.paint,null);assert.equal(low.constructionAccounting.completeWorldReservations,1);
 await write(`${out}/private-stock.json`,built);evidence.push({test:'actual-private-factory-and-precharge-boundary',passed:true,privateFactoryCalls:2,worlds:2,prefixOnly:true});
});
test('a formed-colour failure persists in branch and exact-partition history',()=>{
 const b=blueprint(),state={partitions:new Set(),shapes:[],formed:new Map()},q={...built,ok:false,status:'PRIVATE_POST_COLOUR_REJECT'};
 let r=recordLongPrefixStock(state,b,q);assert.equal(r.duplicate,false);assert.equal(r.prior.length,0);assert.equal(state.formed.get('1:private-source-1').length,1);
 r=recordLongPrefixStock(state,b,q);assert.equal(r.duplicate,true);assert.equal(r.prior.length,1);
 const a=designFingerprints(built.level),same=structuredClone(a);same.shapeSha256='f'.repeat(64);assert.equal(changedShapeAndColour(a,same),false);same.colorSha256=h;assert.equal(changedShapeAndColour(a,same),false);same.colorAssignments[0].colors=['different'];assert.equal(changedShapeAndColour(a,same),true);
 evidence.push({test:'post-colour-failure-persisted-and-shared-id-recolour',passed:true});
});
test('first successful family or near success stops only unclaimed siblings',()=>{
 const q={sourceLevelId:1,branchId:'family-a',level:built.level},s={...q,input:d,accepted:true};assert.equal(longPrefixDisposition(q,[]),null);
 assert.equal(longPrefixDisposition(q,[s]).status,'SKIPPED_FAMILY_ALREADY_SUCCEEDED');const near=longPrefixDisposition({...q,branchId:'family-b'},[s]);assert.equal(near.status,'SKIPPED_NEAR_NEW_FAMILY_SUCCESS');assert.deepEqual(near.successfulInput,d);assert.equal(near.failure,false);assert.equal(near.publicClaimsStarted,0);
 evidence.push({test:'same-family-and-near-success-skip-before-claim',passed:true});
});
test('accepted descendants do not erase a failed guard; pending or newer failed descendants reject',async()=>{
 const requests=[{id:'accepted',redesignOf:'parent'},{id:'accepted2',redesignOf:'accepted'}];assert.equal((await assertNoFailedDescendant('parent',requests,async()=>({accepted:true}))).checked,2);
 await assert.rejects(()=>assertNoFailedDescendant('parent',requests,async id=>id==='accepted2'?null:{accepted:true}),/Unfinished/);
 await assert.rejects(()=>assertNoFailedDescendant('parent',requests,async id=>({accepted:id!=='accepted2'})),/newer failed/);
 evidence.push({test:'latest-terminal-failure-guard-not-reference-ancestry',passed:true});
});
test('experiment, proposal and plan locks close restarts and permit only exact owned history delta',async()=>{
 const dir=`${out}/ledger`;const make=async(n,experiment)=>{const pp=`${out}/proposal${n}.json`;await write(pp,{private:n});const p=plan();p.proposal={path:pp,sha256:sha(await fs.readFile(pp))};p.experimentId=experiment;
  const file=`${out}/plan${n}.json`;await write(file,p);return{d:{path:file,sha256:sha(await fs.readFile(file))},p};};
 const one=await make(1,'one'),two=await make(2,'one'),claim=await claimLongPrefixCampaign(one.d,`${out}/output1`,{qualificationOnly:true,ledgerDirectory:dir});await finishLatePrefixPlan(claim,{status:'PRIVATE_COMPLETE',constructionFiles:[]});
 await checkLedgerSnapshot({roots:[{directory:dir,files:[]}]},{qualificationOnly:true,expectedPrivateRoots:[dir],allowedNewFiles:longPrefixConstructionFiles(one.d,one.p,dir)});
 await assert.rejects(()=>claimLongPrefixCampaign(two.d,`${out}/output2`,{qualificationOnly:true,ledgerDirectory:dir}),/EEXIST/);
 const p={...one.p,experimentId:'different'},file=`${out}/plan3.json`;await write(file,p);const third={path:file,sha256:sha(await fs.readFile(file))};await assert.rejects(()=>claimLongPrefixCampaign(third,`${out}/output3`,{qualificationOnly:true,ledgerDirectory:dir}),/EEXIST/);
 await write(`${dir}/foreign.json`,{});await assert.rejects(()=>checkLedgerSnapshot({roots:[{directory:dir,files:[]}]},{qualificationOnly:true,expectedPrivateRoots:[dir],allowedNewFiles:longPrefixConstructionFiles(one.d,one.p,dir)}),/Unreviewed/);
 evidence.push({test:'immutable-experiment-proposal-plan-locks-and-history-delta',passed:true});
});
test('all seven public roots and junction children reject qualification before ledger writes',async()=>{
 for(const [i,root]of HISTORY_LEDGER_ROOTS.entries()){const alias=path.resolve(out,`alias-${i}`);await fs.symlink(path.resolve(root),alias,'junction');
  for(const directory of [root,await fs.realpath(root),path.join(alias,'uncreated-private')])await assert.rejects(()=>claimLongPrefixCampaign(d,`${out}/nothing`,{qualificationOnly:true,ledgerDirectory:directory}),/aliases shared/);
  assert.equal(await fs.stat(path.join(alias,'uncreated-private')).then(()=>true).catch(()=>false),false);}
 evidence.push({test:'seven-root-private-junction-boundary',passed:true});
});
test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const toolBindings={...runtime.toolchainBindings};for(const f of Object.keys(compiled.metafile.inputs))toolBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 const testFile='tools/daily-challenge/formal-v4/long-prefix-batch-task.test.mjs',fileBindings={...toolBindings,...environment.bindings,[testFile]:sha(await fs.readFile(testFile)),[fixturePath]:sha(fixtureBytes)};
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();assert.deepEqual(after,before);
 await write(`${out}/report.json`,{status:evidence.length===8?'LONG_PREFIX_BATCH_TASK_PRIVATE_PASS':'INCOMPLETE',errors:evidence.length===8?[]:['Incomplete private assertions'],evidence,toolBindings,fileBindings,
  executionPolicyObservation:observeExecutionPolicy(),proofToolchainSha256:runtime.toolchainSha256,policyReviewedAtPreparation:environment.policyReviewedAtPreparation,historicalDesignPolicy:environment.historicalDesignPolicy,mathematicalContract:environment.mathematicalContract,
  newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,publicRequestCountBeforeAfter:[before.length,after.length],searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,qualificationOnly:true,formalReady:false});
});

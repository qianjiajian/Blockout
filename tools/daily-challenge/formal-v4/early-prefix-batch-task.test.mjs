import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {constructEarlyPrefixStock} from './early-six-task-factory.mjs';
import {makeEarlyFrozenPrefixTailPlan} from './early-frozen-prefix-tail-task.mjs';
import {assertEarlyPrefixReceiptAccounting} from './audit-early-six-actual-task.mjs';
import {assertLowTwentyFailedParent} from './prepare-low-twenty-task.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {PUBLIC_LEDGER,HISTORY_LEDGER_ROOTS,write,sha,finishLatePrefixPlan} from './low-twenty-io.mjs';
import {SELF,MATH_ENTRY,EARLY_PREFIX_BATCH_VERSION,UPPER_BUDGET,LOWER_BUDGET,STATIC_SLOT,
 assertSameUniqueCells,assertRecipeIceCapacity,assertSelectedAppendEnvelope,assertEarlyPrefixBatchProposal,assertEarlyPrefixBatchPlan,assertEarlyPrefixBatchIndex,assertEarlyPrefixActualEnvelope,
 recordEarlyPrefixBatchStock,earlyPrefixBatchDisposition,changedShapeAndColour,claimEarlyPrefixBatchCampaign} from './early-prefix-batch-task.mjs';

const out=process.env.EARLY_PREFIX_BATCH_TEST_OUT;assert(out,'Explicit fresh private output required');await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),environment=prefixExecutionEnvironment(rt),evidence=[],before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const proposalPath='deliverables/daily-formal-v4-20261008/design/early-prefix-two-source-four-proposal-01/proposal.json',proposal=JSON.parse(await fs.readFile(proposalPath));
const fixturePath='deliverables/daily-formal-v4-20261008/proof/early-frozen-constructor-toy-probe-01/result.json',toy=JSON.parse(await fs.readFile(fixturePath)).blueprint;
const h='a'.repeat(64),d={path:'private-only.json',sha256:h},extraBindings={};let built;
function blueprint(){const r=proposal.recipes[0],ref=proposal.references.find(f=>f.referenceId===r.referenceId);return{
 ...r,reference:ref.reference,level:ref.originalLevel,referenceLevelSha256:ref.referenceLevelSha256,maximumStocks:1,targetDifficulty:3,
 prefixDrags:ref.prefix.drags,prefixSha256:ref.prefix.prefixSha256,prefixFacts:{drags:ref.prefix.cut,parking:ref.prefix.drags.filter(d=>!d.exitSide).length,clears:ref.prefix.drags.filter(d=>d.exitSide).length},
 changedBodies:ref.changedBodies,fixedBlocks:ref.fixedBlocks,normalBoardArea:40,region:{...ref.region,bodyIds:ref.changedBodyIds},allReferenceGates:ref.fixedGates,prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true};}
function plan(){const b=blueprint();return{version:EARLY_PREFIX_BATCH_VERSION,schemaVersion:4,scope:300,qualificationOnly:false,experimentId:'private-new-early-prefix',closedCampaignsExtended:false,closedExperimentIds:['closed-other'],previousExperimentInputs:0,
 proposal:d,proposalReview:d,qualification:d,mathQualification:d,selectedIndex:d,selectionReview:d,historyPlan:d,blueprints:[b],maximumInputs:1,maximumStaticPartitionAttempts:200,
 selected:[d],selectedCount:1,failedParents:[{source:18,branchId:b.branchId}],futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,staticSlot:STATIC_SLOT,
 strategy:{tail:'thawed-prefix-one-plain-joint',bodyIcePolicy:'uniform-new-region-only',floor:31,searchUpper:128,maximumTailCalls:1,maximumOriginalLowerCalls:1,fallback:false},gatePolicy:'all-reference-gates-byte-equivalent-in-original-order',successStopsUnclaimedSiblings:true,
 globalShapeInventoryUniquenessRequired:false,exactHistoryExclusionsRetained:true,nearExemptionsAllowed:false,ledgerSnapshot:{roots:Array.from({length:7},()=>({}))},bindings:{[SELF]:h,[MATH_ENTRY]:h},accepted:false,catalogEligible:false,formalReady:false,slotAssigned:false};}

test('ice proposal and production plan bind finite recipes, ordinary gates, thaw capacity and unchanged budgets',()=>{
 assertEarlyPrefixBatchProposal(proposal);assertEarlyPrefixBatchPlan(plan());
 for(const edit of [p=>p.recipes[0].iceCount=3,p=>p.recipes[0].bodyCountDelta=-1,p=>p.recipes[0].maximumColourCspInputsIncludingFailure=2,p=>p.references[0].fixedGates[0].frozen=2,
  p=>p.references[0].prefix.drags.forEach(d=>delete d.exitSide),p=>p.finiteExperiment.extendsClosedLocal18=true]){
  const p=structuredClone(proposal);edit(p);assert.throws(()=>assertEarlyPrefixBatchProposal(p));}
 for(const edit of [p=>p.futureUpperBudget.maxStates=10001,p=>p.futureLowerBudget.maxStates=10000,p=>p.strategy.fallback=true,p=>p.blueprints[0].iceCount=4.5,p=>p.staticSlot.formalId=880000]){
  const p=structuredClone(plan());edit(p);assert.throws(()=>assertEarlyPrefixBatchPlan(p));}
 const ref=proposal.references[0];assertRecipeIceCapacity(ref,proposal.recipes[0]);assertSameUniqueCells(ref.region.cells,[...ref.region.cells].reverse());
 assert.throws(()=>assertSameUniqueCells([[0,0],[0,0]],[[0,0],[1,0]]),/Duplicate/);assert.throws(()=>assertSameUniqueCells([[0,0]],[[1,0]]),/differ/);
 evidence.push({name:'production-ice-capacity-quota-and-cell-set-negatives',passed:true});
});
test('dynamic selection keeps exact original prefix, count and review bytes while allowing genuine append length',()=>{
 const anchor=['original-a','original-b'],context={selection:d,selectedCount:4},index={files:[...anchor,'star-one','star-two']},review={status:'INDEPENDENT_159_MERGE_QUICK_CHECK_PASS',selection:d,errors:[],newSearches:0,newLedgerClaims:0,candidates:4};
 assertSelectedAppendEnvelope(index,review,context,anchor);
 for(const modify of [(i,r,c)=>i.files.reverse(),(i,r,c)=>i.files[3]=i.files[2],(i,r,c)=>r.selection.sha256='b'.repeat(64),(i,r,c)=>c.selectedCount=159]){
  const i=structuredClone(index),r=structuredClone(review),c=structuredClone(context);modify(i,r,c);assert.throws(()=>assertSelectedAppendEnvelope(i,r,c,anchor));}
 evidence.push({name:'latest-exact-selection-prefix-count-and-duplicate-negatives',passed:true});
});
test('private factory charges plain and ice then binds exact two evidence images to unchanged math plan',async()=>{
 built=constructEarlyPrefixStock(rt,toy,{seed:1,colourSeed:1,bodyCountDelta:3,qualificationOnly:true});assert(built.ok,built.reason??built.status);
 assert.deepEqual(built.level.gates,toy.level.gates);assert.equal(built.constructionAccounting.completeWorldReservations,3);assert.equal(built.plain.constructionAccounting.completeWorldReservations,2);
 assert(built.thawedPrefixBridge.valid);assert.equal(built.thawedPrefixBridge.icedCutSha256,built.thawedPrefixBridge.plainCutSha256);assert.equal(built.U,null);
 const pf=out+'/plain.json';await write(pf,built.plain);const pe={path:pf,sha256:sha(await fs.readFile(pf))},ff=out+'/iced.json';await write(ff,{...built,plainConstructionEvidence:pe});
 const candidate={...built,plainConstructionEvidence:pe,constructionEvidence:{path:ff,sha256:sha(await fs.readFile(ff))}},p=makeEarlyFrozenPrefixTailPlan(rt,candidate,{qualificationOnly:true,floor:1,searchUpper:8});
 assert.equal(p.innerPlan.tailBudget.maxStates,9992);assert.equal(p.lowerBudget.maxStates,9999);assert.equal(p.fullUpperBudget.maxStates,10000);assert.equal(p.alternativeSearchAllowed,false);
 assert.throws(()=>makeEarlyFrozenPrefixTailPlan(rt,{...candidate,plainConstructionEvidence:candidate.constructionEvidence},{qualificationOnly:true,floor:1,searchUpper:8}));
 const cap=constructEarlyPrefixStock(rt,toy,{seed:1,colourSeed:1,bodyCountDelta:3,qualificationOnly:true,meterLimits:{maxWorlds:2}});assert(!cap.ok);assert.equal(cap.level,null);assert.equal(cap.constructionAccounting.completeWorldReservations,1);
 evidence.push({name:'private-plain-final-bytes-conservative-world-accounting',passed:true,privateStockCalls:2,newSolverCalls:0});
});
test('post-colour failure keeps all formed worlds, consumes one CSP and cannot bypass real recolour',()=>{
 const failure=constructEarlyPrefixStock(rt,{...toy,iceCount:2},{seed:1,bodyCountDelta:3,qualificationOnly:true});assert(!failure.ok);assert(failure.plain&&failure.level&&failure.paint.ok);
 const b=blueprint(),state={partitions:new Set(),shapes:[],formed:new Map()},first=recordEarlyPrefixBatchStock(state,b,failure);assert(!first.duplicate);assert.equal(state.formed.size,1);assert.equal(recordEarlyPrefixBatchStock(state,b,failure).duplicate,true);
 const f=designFingerprints(built.level);assert(!changedShapeAndColour(f,{...f,shapeSha256:h,colorSha256:h}));
 const p=plan(),id=b.recipeId,index={status:'EARLY_PREFIX_BATCH_STATIC_COMPLETE_NO_GAMEPLAY_SEARCH',experimentId:p.experimentId,attempts:[{recipeId:id,localAttempt:0,enteredColourCsp:true}],perRecipeColourCspInputs:{[id]:1},perRecipeStaticAttempts:{[id]:1},fixedColourInputs:1,candidates:[],eligibleInputs:0,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
 assertEarlyPrefixBatchIndex(index,p);const repeated=structuredClone(index);repeated.attempts.push({...repeated.attempts[0],localAttempt:1});assert.throws(()=>assertEarlyPrefixBatchIndex(repeated,p));
 const forged=structuredClone(index);forged.fixedColourInputs=0;assert.throws(()=>assertEarlyPrefixBatchIndex(forged,p));
 evidence.push({name:'failed-csp-consumed-and-all-formed-image-history',passed:true,privateStockCalls:1});
});
test('first successful family or near accepted input skips unclaimed sibling without a failure label',()=>{
 const q={sourceLevelId:1,branchId:'one',level:built.level},success={...q,input:d};assert.equal(earlyPrefixBatchDisposition(q,[]),null);
 assert.equal(earlyPrefixBatchDisposition(q,[success]).status,'SKIPPED_FAMILY_ALREADY_SUCCEEDED');const near=earlyPrefixBatchDisposition({...q,branchId:'two'},[success]);
 assert.equal(near.status,'SKIPPED_NEAR_NEW_FAMILY_SUCCESS');assert.equal(near.failure,false);assert.equal(near.publicClaimsStarted,0);assert.deepEqual(near.successfulInput,d);
 evidence.push({name:'family-and-near-success-skip-before-public-claim',passed:true});
});
test('same shared construction namespace blocks relabel restarts and all seven public qualification aliases',async()=>{
 const pp=out+'/proposal.json';await write(pp,{private:true});const p=plan();p.proposal={path:pp,sha256:sha(await fs.readFile(pp))};const f=out+'/plan.json';await write(f,p);
 const pd={path:f,sha256:sha(await fs.readFile(f))},dir=out+'/private-ledger',claim=await claimEarlyPrefixBatchCampaign(pd,out+'/no-stock',{qualificationOnly:true,ledgerDirectory:dir});
 await finishLatePrefixPlan(claim,{status:'PRIVATE_TERMINAL',constructionFiles:[],stocksEnteringColourCspIncludingFailed:0});
 const other=out+'/renamed-plan.json';await write(other,{...p,label:'changed'});await assert.rejects(async()=>claimEarlyPrefixBatchCampaign({path:other,sha256:sha(await fs.readFile(other))},out+'/new-label',{qualificationOnly:true,ledgerDirectory:dir}),/EEXIST/);
 const changed=out+'/different-experiment.json';await write(changed,{...p,experimentId:'another-private-experiment'});await assert.rejects(async()=>claimEarlyPrefixBatchCampaign({path:changed,sha256:sha(await fs.readFile(changed))},out+'/other-label',{qualificationOnly:true,ledgerDirectory:dir}),/EEXIST/);
 for(const root of HISTORY_LEDGER_ROOTS)for(const directory of [root,path.join(await fs.realpath(root),'never-create-private')])await assert.rejects(()=>claimEarlyPrefixBatchCampaign(pd,out+'/bad',{qualificationOnly:true,ledgerDirectory:directory}),/aliases shared/);
 evidence.push({name:'same-ledger-experiment-proposal-lock-and-seven-real-roots',passed:true});
});
test('read-only consumers reject wrong completion counts and tampered ice accounting; actual parent schemas are compatible',async()=>{
 const p=plan(),index={status:'EARLY_PREFIX_BATCH_STATIC_COMPLETE_NO_GAMEPLAY_SEARCH',plan:d,experimentId:p.experimentId,attempts:[],perRecipeColourCspInputs:{},perRecipeStaticAttempts:{},fixedColourInputs:0,candidates:[],eligibleInputs:0,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
 const c={status:'EARLY_PREFIX_BATCH_FIRST_MATH_BATCH_FINISHED',batchPlan:d,selectionIndexUnchanged:true,formalReady:false,results:[],publicClaimsStarted:0,unclaimedSkipped:0,accepted:0};assertEarlyPrefixActualEnvelope(c,index,p);
 for(const edit of [x=>x.publicClaimsStarted=1,x=>x.accepted=1,x=>x.status='LONG_PREFIX_FIRST_MATH_BATCH_FINISHED']){const altered=structuredClone(c);edit(altered);assert.throws(()=>assertEarlyPrefixActualEnvelope(altered,index,p));}
 const read=async f=>{const bytes=await fs.readFile(f);extraBindings[f]=sha(bytes);return JSON.parse(bytes);};
 for(const ref of new Map(proposal.recipes.map(x=>[x.initialFailedParent.path,x.initialFailedParent])).values()){
  const q=await read(ref.path);assert.equal(extraBindings[ref.path],ref.sha256);const result=await read(`${PUBLIC_LEDGER}/${q.attempt.id}.result.json`);assertLowTwentyFailedParent(q,result);}
 const q=await read('deliverables/daily-formal-v4-20261008/design/early-six-math-task-01/candidate-000.json'),input=await read(q.input.path);assert.equal(extraBindings[q.input.path],q.input.sha256);assertEarlyPrefixReceiptAccounting(q,input);
 const changed=structuredClone(q);changed.upperAccounting.conservativeFullBoardStateUpperBound++;assert.throws(()=>assertEarlyPrefixReceiptAccounting(changed,input));
 evidence.push({name:'actual-consumer-schema-budget-and-two-real-parent-shapes-read-only',passed:true,newReplays:0,newSolverCalls:0});
});
test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={...rt.toolchainBindings};
 for(const f of Object.keys(compiled.metafile.inputs))toolBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 const inherited={path:'deliverables/daily-formal-v4-20261008/proof/long-prefix-batch-independent-01/report.json',sha256:'2d361d6e2b3125e7ae25c40096f178128e934ae9db79d7146ab554721bb7c751'};
 assert.equal(sha(await fs.readFile(inherited.path)),inherited.sha256);
 const testPath='tools/daily-challenge/formal-v4/early-prefix-batch-task.test.mjs',fileBindings={...toolBindings,...environment.bindings,...extraBindings,[testPath]:sha(await fs.readFile(testPath)),[proposalPath]:sha(await fs.readFile(proposalPath)),[fixturePath]:sha(await fs.readFile(fixturePath)),[inherited.path]:inherited.sha256};
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();assert.deepEqual(after,before);
 await write(out+'/report.json',{status:evidence.length===7?'EARLY_PREFIX_BATCH_TASK_PRIVATE_PASS':'INCOMPLETE',errors:evidence.length===7?[]:['Incomplete targeted assertions'],evidence,toolBindings,fileBindings,inheritedHistoryGuardQualification:inherited,
  executionPolicyObservation:observeExecutionPolicy(),proofToolchainSha256:rt.toolchainSha256,policyReviewedAtPreparation:environment.policyReviewedAtPreparation,historicalDesignPolicy:environment.historicalDesignPolicy,mathematicalContract:environment.mathematicalContract,
  newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,publicRequestCountBeforeAfter:[before.length,after.length],searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,qualificationOnly:true,formalReady:false});
});

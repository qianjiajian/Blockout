import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {parkingIceJointAccounting} from './parking-ice-region-stock.mjs';
import {mixedShortPrefixBatchDisposition} from './fixed-gate-region-batch-task.mjs';
import {sha,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER} from './low-twenty-io.mjs';
import {SELF,MODULE_REVIEW,assertParkingIceProposal,assertParkingIceIndex,assertParkingIceConstructionAccounting,assertParkingIceStockInventory,assertParkingIceReceipt,declaredHistoryMembership,assertParkingIceLedgerPaths} from './parking-ice-batch-task.mjs';

const out=process.env.PARKING_ICE_BATCH_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const bindings={},checks=[],rt=await loadV4Runtime();
async function read(file,digest){const bytes=await fs.readFile(file);bindings[file]=sha(bytes);if(digest)assert.equal(bindings[file],digest);return JSON.parse(bytes);}
const proposal=await read('deliverables/daily-formal-v4-20261008/design/parking-ice-source29-two-proposal-01/proposal.json','ebf47bf862ada7e528670c4e0c6d7dace88f3dd197b5c0bf5718b41094118c24');
const moduleReview=await read(MODULE_REVIEW.path,MODULE_REVIEW.sha256),author=await read(moduleReview.author.path,moduleReview.author.sha256);
assert.equal(author.errors.length,0);const prior=path.dirname(moduleReview.author.path);
async function privateEvidence(name){const file=path.join(prior,name),digest=moduleReview.fileBindings[file]??moduleReview.fileBindings[file.replaceAll('\\','/')];assert(digest,'Reviewed private fixture must be bound');return read(file,digest);}
const requests=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(x=>x.endsWith('.request.json')).sort(),before=await requests();

test('exact two D3 declaration; no plain/reband/quota/ice-region change',()=>{
 assertParkingIceProposal(proposal);
 for(const mutate of [p=>p.recipes[1].finalTargetDifficulty=2,p=>p.recipes[0].cut=10,p=>p.recipes[1].bodyCountDelta=2,p=>p.recipes[1].seed++,p=>p.references[0].region.cells.pop(),p=>p.finiteExperiment.maximumColourCspInputsIncludingFailed++,p=>p.mathematics.maximumJointCallsPerNewPhysicalInput=2]){const q=structuredClone(proposal);mutate(q);assert.throws(()=>assertParkingIceProposal(q));}
 checks.push({name:'fixed-two-preserved-ice-metadata',passed:true,realProposalReadOnly:true});
});

test('one CSP closes each recipe and first success skips sibling without claim',()=>{
 const plan={experimentId:proposal.experimentId,proposalData:proposal,blueprints:proposal.recipes},counts=Object.fromEntries(plan.blueprints.map(b=>[b.recipeId,1]));
 const attempts=plan.blueprints.map(b=>({recipeId:b.recipeId,sourceLevelId:29,branchId:b.branchId,finalTargetDifficulty:3,localAttempt:0,enteredColourCsp:true,constructionEvidence:{path:'SYNTHETIC_ONLY/'+b.recipeId,sha256:'a'.repeat(64)}}));
 const index={status:'PARKING_ICE_BATCH_STATIC_COMPLETE',experimentId:plan.experimentId,gameplaySearches:0,publicLedgerClaims:0,attempts,candidates:[],fixedColourInputs:2,eligibleInputs:0,perRecipeColourCspInputs:counts,perRecipeStaticAttempts:counts};assertParkingIceIndex(index,plan);
 const duplicate=structuredClone(index);duplicate.attempts.push({...attempts[0],localAttempt:1});assert.throws(()=>assertParkingIceIndex(duplicate,plan));
 const unfinished=structuredClone(index);unfinished.attempts.pop();assert.throws(()=>assertParkingIceIndex(unfinished,plan));
 const sibling={...proposal.recipes[1],level:{blocks:[]}},success={...proposal.recipes[0],input:{path:'PRIVATE_METADATA_ONLY',sha256:'b'.repeat(64)}};
 assert.equal(mixedShortPrefixBatchDisposition(sibling,[]),null);const skip=mixedShortPrefixBatchDisposition(sibling,[success]);assert.equal(skip.status,'SKIPPED_FAMILY_ALREADY_SUCCEEDED');assert.equal(skip.accepted,false);
 checks.push({name:'csp-and-sibling-seals',passed:true,newClaims:0});
});

test('original-ice receipt accounting consumes exact prior evidence, detects cap/deadline/alias changes',async()=>{
 const stock=await privateEvidence('private-stock.json'),original=levelSha256(stock);assertParkingIceConstructionAccounting(stock);
 const inventoryBlueprint={fixedBlocks:stock.level.blocks.slice(0,2),changedBodies:stock.provenance.region.bodyIds,bodyCountDelta:stock.provenance.bodyCountDelta};assertParkingIceStockInventory(stock.level,inventoryBlueprint);
 assert.throws(()=>assertParkingIceStockInventory(stock.level,{...inventoryBlueprint,bodyCountDelta:inventoryBlueprint.bodyCountDelta+1}),/changed-body count/);
 for(const mutate of [x=>x.blocks[3].id=x.blocks[2].id,x=>x.blocks[2].id=x.blocks[0].id,x=>x.blocks.shift()]){const f=structuredClone(stock.level);mutate(f);assert.throws(()=>assertParkingIceStockInventory(f,inventoryBlueprint));}
 const bad=structuredClone(stock);bad.constructionAccounting.prefixCompleteWorldReservations--;assert.throws(()=>assertParkingIceConstructionAccounting(bad));
 const raw=await privateEvidence('private-joint-receipt.json'),plan=await privateEvidence('private-plan.json');
 // Counter-only synthetic accepted envelope: no model, route validation,
 // actual candidate acceptance or call to the original proof is performed.
 const q=structuredClone(raw);q.plan=plan;q.finalTargetDifficulty=3;q.proof.budget=structuredClone(plan.jointBudget);q.proof.guardAllowance=guardAllowanceFor(q.proof);q.lowerBound.result=q.proof;
 q.accounting=parkingIceJointAccounting(plan,q.proof,{elapsedMilliseconds:100});const input={...stock,constructionEvidence:plan.constructionEvidence};assertParkingIceReceipt(q,input);
 q.proof.status='threshold-proven';q.proof.termination='below-threshold-exhausted';q.proof.thresholdProven=true;q.proof.routeTermination='minimum-optional-route-found';q.proof.cost=31;
 q.drags=[...Array.from({length:31},()=>({blockId:'synthetic-only',path:[]})),...stock.level.blocks.map(b=>({blockId:b.id,path:[],exitSide:'left'}))];q.proof.drags=q.drags;q.proof.guardAllowance=guardAllowanceFor(q.proof);
 q.U=31;q.L=31;q.accepted=true;q.status='EXPLORATORY_ORIGINAL_ICE_LU';q.mathematicalEvidenceValidated=true;q.routeSha256=routeSha256(q.drags);
 const replay={valid:true,complete:true,failed:false,nonClearingDrags:31,effectiveDrags:q.drags.length,clearEvents:stock.level.blocks.length,remainingBodies:0,remainingQueued:0};
 q.route={search:q.proof,inputLevelSha256:q.levelSha256,routeSha256:q.routeSha256,canonicalReplay:replay,independentReplay:structuredClone(replay)};q.accounting=parkingIceJointAccounting(plan,q.proof,{witness:q.drags,elapsedMilliseconds:100,requireSuccess:true});assertParkingIceReceipt(q,input);
 for(const mutate of [x=>x.proof.termination='deadline',x=>x.proof.elapsedMilliseconds=plan.jointBudget.maxMilliseconds+1,x=>x.accounting.conservativeFullBoardStateUpperBound--,x=>x.plan.floor=30,x=>x.level.gates.find(g=>g.frozen>0).frozen--,x=>x.proof.attemptedTransitions=plan.jointBudget.maxTransitions+1,x=>x.route.independentReplay.remainingBodies=1]){const f=structuredClone(q);mutate(f);assert.throws(()=>assertParkingIceReceipt(f,input));}
 const paidFailure=structuredClone(q);Object.assign(paidFailure,{accepted:false,L:null,U:null,route:null,status:'PARKING_ICE_REJECTED',mathematicalEvidenceValidated:false});delete paidFailure.drags;delete paidFailure.routeSha256;
 paidFailure.accounting.elapsedMilliseconds=plan.fullBudget.maxMilliseconds+1;assertParkingIceReceipt(paidFailure,input);
 const assignedInvalidReplay=structuredClone(paidFailure);assignedInvalidReplay.route=structuredClone(q.route);assignedInvalidReplay.route.independentReplay.valid=false;assignedInvalidReplay.route.independentReplay.remainingBodies=1;assertParkingIceReceipt(assignedInvalidReplay,input);
 const claimedInvalidU=structuredClone(assignedInvalidReplay);Object.assign(claimedInvalidU,{U:31,drags:q.drags,routeSha256:q.routeSha256});assert.throws(()=>assertParkingIceReceipt(claimedInvalidU,input));
 const wrongPaidQuote=structuredClone(paidFailure);wrongPaidQuote.accounting.witnessReservations.worlds++;assert.throws(()=>assertParkingIceReceipt(wrongPaidQuote,input));
 const unpaidFailure=structuredClone(paidFailure);unpaidFailure.accounting=parkingIceJointAccounting(plan,unpaidFailure.proof,{elapsedMilliseconds:plan.fullBudget.maxMilliseconds+1});assertParkingIceReceipt(unpaidFailure,input);
 unpaidFailure.route=structuredClone(q.route);assert.throws(()=>assertParkingIceReceipt(unpaidFailure,input));
 assert.equal(levelSha256(stock),original);checks.push({name:'prior-prefix-raw-guard-dual-reservation-and-receipt-negatives',passed:true,syntheticAcceptedEnvelopeOnly:true,failedPaidReplayAndActualInventoryCovered:true,newModelCalls:0,newProofCalls:0});
});

test('real runner dispatch is awaited once and complete membership retains nonJSON lock, external evidence excluded',async()=>{
 const source=await fs.readFile(SELF,'utf8');bindings[SELF]=sha(source);
 // Match the exact live dispatch statement, not a separately reimplemented one.
 const line=source.split('\n').find(l=>l.includes('const result=await runParkingIceJoint'));assert(line);const statement=line.slice(line.indexOf('const result='),line.indexOf(';assert(result.attempt)')+1);let calls=0;
 const invoke=new (async()=>{}).constructor('runParkingIceJoint','rt','q','x','latest','branch',statement+'return result;');
 const result=await invoke(async()=>{calls++;return{attempt:{id:'metadata'}};},{},{},{plan:{}},new Map(),()=> 'private');assert.equal(calls,1);assert.equal(result.attempt.id,'metadata');
 assert.equal((source.match(/await runParkingIceJoint\(/g)??[]).length,1);assert(!source.includes('explorePrefixTailV4'));assert(!source.includes('rt.replayRevisedRoute('));
 const scope={baseDirectory:'C:/private',roots:[{id:'r',physicalPath:'C:/private/history',aliases:['C:/alias/history']}]};
 const h={bundle:{scope,files:[{rootId:'r',path:'C:/private/history/old.json'},{rootId:null,path:'C:/external/old.json'}]}},delta={files:[{rootId:'r',path:'C:/private/history/one.revalidation.lock'}]};
 assert.deepEqual(declaredHistoryMembership(h,delta),{r:['C:/private/history/old.json','C:/private/history/one.revalidation.lock']});assert.throws(()=>declaredHistoryMembership(h,{files:[{rootId:'r',path:'C:/alias/history/old.json'}]}));
 assertParkingIceLedgerPaths(LATE_PREFIX_CONSTRUCTION_LEDGER,'real/shared/late','real/shared/late');assert.throws(()=>assertParkingIceLedgerPaths('C:/physical-shared/late','real/shared/late','real/shared/late'),/lexical/);assert.throws(()=>assertParkingIceLedgerPaths(LATE_PREFIX_CONSTRUCTION_LEDGER,'real/other','real/shared/late'),/physical/);
 assert(source.includes('try{claim=await claimNativeBatchPlan'));assert(source.indexOf('await campaignPreflight(d,p,out,h)')<source.indexOf('try{claim=await claimNativeBatchPlan'));assert(source.includes('finally{if(claim){await finishLatePrefixPlan'));
 checks.push({name:'live-joint-dispatch-and-member-boundary',passed:true,asyncStubCalls:1,newProofCalls:0});
});

test.after(async()=>{
 const after=await requests();assert.deepEqual(after,before);const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={...rt.toolchainBindings};
 for(const file of Object.keys(compiled.metafile.inputs)){toolBindings[file.replaceAll('\\','/')]=sha(await fs.readFile(file));}Object.assign(bindings,toolBindings);
 const own='tools/daily-challenge/formal-v4/parking-ice-batch-task.test.mjs';bindings[own]=sha(await fs.readFile(own));
 const report={status:checks.length===4?'PARKING_ICE_BATCH_PRIVATE_PASS':'PARKING_ICE_BATCH_PRIVATE_INCOMPLETE',errors:checks.length===4?[]:['Incomplete tests'],checks,toolBindings,fileBindings:bindings,reviewedModule:MODULE_REVIEW,qualificationOnly:true,newRealConstructions:0,newSearches:0,publicClaimsStarted:0,newModelCalls:0,newReplayCalls:0,newColourCspInputs:0,publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,searchAlgorithmChanged:false,failedOriginalRetryAllowed:false};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

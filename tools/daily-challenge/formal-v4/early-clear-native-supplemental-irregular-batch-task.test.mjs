import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {SELF,FIXED_PROPOSAL,FIXED_PROPOSAL_REVIEW,RESEALED_HISTORY,NATIVE_EXECUTION_STRATEGY_AMENDMENT,assertSupplementalContextPins,assertSupplementalHistoryView,assertEarlyClearProposal,assertEarlyClearReceipt,assertNativeSharedUpperAccounting,declaredHistoryMembership} from './early-clear-native-supplemental-irregular-batch-task.mjs';
import {declaredHistoryMembership as originalMembership} from './early-clear-supplemental-irregular-batch-task.mjs';
import {NATIVE_PREFIX_TAIL_TASK_VERSION,nativeTargetBand} from './prefix-tail-native-task.mjs';
import {UPPER_BUDGET,LOWER_BUDGET} from './fixed-gate-region-batch-task.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {sha,write} from './low-twenty-io.mjs';
const out=process.env.NATIVE_SUPPLEMENTAL_BATCH_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const HANDOFF='deliverables/daily-formal-v4-20261008/proof/native-supplemental-irregular-batch-handoff-03',OLD='tools/daily-challenge/formal-v4/early-clear-supplemental-irregular-batch-task.mjs',TEST='tools/daily-challenge/formal-v4/early-clear-native-supplemental-irregular-batch-task.test.mjs';
const clone=structuredClone,checks=[],bindings={};
const desc=(name)=>({path:'private-metadata/'+name,sha256:'a'.repeat(64)});
async function bound(file,expected){const b=await fs.readFile(file),h=sha(b);if(expected)assert.equal(h,expected);bindings[file]=h;return b;}
const context=()=>({proposal:clone(FIXED_PROPOSAL),proposalReview:clone(FIXED_PROPOSAL_REVIEW),history:clone(RESEALED_HISTORY),nativeExecutionStrategyAmendment:clone(NATIVE_EXECUTION_STRATEGY_AMENDMENT),supplementalFailedParents:{review:desc('review.json'),supplements:[11,7,50].map(x=>desc('source-'+x+'.json'))}});
test('native strategy is explicit and old six physical recipes cannot drift; overlay remains exact-current-head',async()=>{
 const p=context();assertSupplementalContextPins(p);const proposal=JSON.parse(await bound(FIXED_PROPOSAL.path,FIXED_PROPOSAL.sha256));assertEarlyClearProposal(proposal);
 assert.equal(proposal.futureMathematics.D2.entry,'tools/daily-challenge/formal-v4/prefix-tail-low-band-task.mjs');
 assert.equal(proposal.futureMathematics.D3.entry,'tools/daily-challenge/formal-v4/prefix-tail-explore-task.mjs');
 for(const edit of [x=>delete x.nativeExecutionStrategyAmendment,x=>x.nativeExecutionStrategyAmendment.targets[2].upper=null,x=>x.nativeExecutionStrategyAmendment.mathematicalEntry.sha256='b'.repeat(64),x=>x.nativeExecutionStrategyAmendment.originalProposalDidNotReviewNativeStrategy=false,x=>x.nativeExecutionStrategyAmendment.sidecarSuffix='.v4-low-band-prefix-tail',x=>x.history.sha256='b'.repeat(64),x=>x.proposalReview.sha256='b'.repeat(64),x=>x.supplementalFailedParents.supplements.pop(),x=>x.supplementalFailedParents.supplements[1]=clone(x.supplementalFailedParents.supplements[0])]){const bad=clone(p);edit(bad);assert.throws(()=>assertSupplementalContextPins(bad));}
 for(const edit of [x=>x.recipes[0].seed++,x=>x.recipes[0].bodyCountDelta++,x=>x.finiteExperiment.maximumStaticPartitionAttempts++,x=>x.futureMathematics.D3.entry=NATIVE_EXECUTION_STRATEGY_AMENDMENT.mathematicalEntry.path]){const bad=clone(proposal);edit(bad);assert.throws(()=>assertEarlyClearProposal(bad));}
 const v={baseHeadSha256:'c'.repeat(64),qualificationOnly:false,allowedRoles:['failed-parent'],...clone(p.supplementalFailedParents),addedHistoricalFullWorlds:3};p.supplementalHistoryEvidence=clone(v);
 assertSupplementalHistoryView(p,{headSha256:v.baseHeadSha256,supplementalFailedParentEvidence:clone(v)});
 assert.throws(()=>assertSupplementalHistoryView(p,{headSha256:'d'.repeat(64),supplementalFailedParentEvidence:clone(v)}));
 checks.push({name:'explicit-native-amendment-old-physics-and-current-overlay',passed:true});
});
function recorded(target=2,U=null){
 const level={id:999998,blocks:[],gates:[]},prefixDrags=[{blockId:'first',path:[],exitSide:'left'}],tailDrags=U===null?[]:Array.from({length:U},(_,i)=>({blockId:'metadata-only',path:[[i,0]]}));
 const prior={version:'late-region-static-construction-v1',completeWorldReservations:7,microStates:3,transitions:4,elapsedMilliseconds:1},evidence=desc('construction.json'),band=nativeTargetBand(target);
 const plan={targetDifficulty:target,band:clone(band),floor:band.floor,constructionAccounting:prior,constructionEvidence:evidence,fullUpperBudget:UPPER_BUDGET,lowerBudget:LOWER_BUDGET,innerPlan:{tailStrategy:'native',searchUpper:128},tailSearchesMaximum:1,alternativePrefixOrFullUpperSearchAllowed:false,failedInputContinuationAllowed:false,completeOriginalUpperCeiling:band.upper,nativeTailHasNoParkingCeiling:true,bandChangeAfterClaimAllowed:false};
 const tail={budget:{...UPPER_BUDGET,maxStates:9990,maxTransitions:9999995,maxMicroStates:2999997,maxMilliseconds:29998},discoveredStates:9990,visitedStates:9990,rawFullBoardStates:9990,exploredStates:2,rawExploredStates:2,attemptedTransitions:5,microDiscoveredStates:5,microExploredStates:4,elapsedMilliseconds:2,termination:U===null?'max-states':'witness',status:U===null?'unknown':'witness',witnessFound:U!==null,lowerBoundCertified:false,sourceLevelSha256:levelSha256(level),drags:tailDrags};tail.guardAllowance=guardAllowanceFor(tail);
 const u={plan:clone(plan.innerPlan),valid:U!==null,lowerBoundClaimed:false,prefixCommittedWorldUpperBound:2,prefixAudits:[{}],prefixTransitions:1,tailSearches:1,tailSearch:tail,tailLevel:level,tailLevelSha256:levelSha256(level),conservativeFullBoardStateUpperBound:9993,elapsedMilliseconds:3,U,drags:U===null?[]:[...prefixDrags,...tailDrags]};
 const input={level,finalTargetDifficulty:target,prefixDrags,constructionAccounting:prior,constructionEvidence:evidence};
 const q={version:NATIVE_PREFIX_TAIL_TASK_VERSION,level,levelSha256:levelSha256(level),finalTargetDifficulty:target,plan,upperConstruction:u,upperAccounting:{prior,knownPrefix:2,tailRegistered:9990,terminalAllowance:1,conservativeFullBoardStateUpperBound:10000,maximum:10000},accepted:false,lowerBound:null,L:null,U,route:null,status:'UNKNOWN_CONSTRUCTED_UPPER_TERMINAL'};
 if(U!==null){q.drags=u.drags;q.routeSha256=routeSha256(q.drags);q.route={search:null,inputLevelSha256:q.levelSha256,routeSha256:q.routeSha256};q.status=U<band.floor?'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR':band.upper!==null&&U>band.upper?'KNOWN_UPPER_ABOVE_PREDECLARED_CEILING':'UNKNOWN_OR_SHORTCUT_ORIGINAL_LOWER_TERMINAL';}
 return{q,input};
}
test('native total accounting rejects understated raw/prefix/guard; D2 outside-band never carries lower; accepted proof mandatory',()=>{
 const f=recorded();assertEarlyClearReceipt(f.q,f.input);assert.equal(assertNativeSharedUpperAccounting(f.q,f.input.prefixDrags),10000);
 const before=JSON.stringify(f);
 for(const edit of [x=>x.upperAccounting.conservativeFullBoardStateUpperBound--,x=>x.upperAccounting.terminalAllowance=0,x=>x.upperConstruction.prefixTransitions=0,x=>x.upperConstruction.tailSearch.budget.maxStates++,x=>x.upperConstruction.tailSearch.sourceLevelSha256='b'.repeat(64),x=>x.upperConstruction.tailSearch.elapsedMilliseconds=4,x=>x.accepted=true,x=>x.plan.innerPlan.tailStrategy='plain-joint']){const bad=clone(f.q);edit(bad);assert.throws(()=>assertEarlyClearReceipt(bad,f.input));}
 for(const [target,U]of [[2,20],[2,31],[3,30]]){const x=recorded(target,U);assertEarlyClearReceipt(x.q,x.input);const bad=clone(x.q);bad.proof={floor:nativeTargetBand(target).floor};bad.lowerBound={result:bad.proof};assert.throws(()=>assertEarlyClearReceipt(bad,x.input));}
 for(const [target,U]of [[2,21],[2,30],[3,31],[3,200]]){const x=recorded(target,U),p={budget:LOWER_BUDGET,discoveredStates:9999,visitedStates:9999,rawFullBoardStates:9999,exploredStates:1,rawExploredStates:1,attemptedTransitions:1,microDiscoveredStates:1,microExploredStates:1,elapsedMilliseconds:1,termination:'max-states',status:'unknown',floor:nativeTargetBand(target).floor,sourceLevelSha256:x.q.levelSha256};p.guardAllowance=guardAllowanceFor(p);x.q.proof=p;x.q.lowerBound={method:'v3-plain',requiredFloor:p.floor,inputLevelSha256:x.q.levelSha256,result:p};assertEarlyClearReceipt(x.q,x.input);const accepted=clone(x.q);Object.assign(accepted,{accepted:true,attempt:{id:'private-metadata'},mathematicalEvidenceValidated:true,L:p.floor,difficulty:target,status:'EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU'});Object.assign(accepted.proof,{status:'threshold-proven',termination:'below-threshold-exhausted',thresholdProven:true,certifiedFloor:p.floor,elapsedMilliseconds:30000});assertEarlyClearReceipt(accepted,x.input);accepted.proof.elapsedMilliseconds=30001;assert.throws(()=>assertEarlyClearReceipt(accepted,x.input),/declared deadline/);const bad=clone(x.q);bad.proof.sourceLevelSha256='c'.repeat(64);assert.throws(()=>assertEarlyClearReceipt(bad,x.input));}
 assert.equal(JSON.stringify(f),before);checks.push({name:'native-10000-same-object-accounting-fixed-band-and-accepted-proof',passed:true,modelCalls:0});
});
test('published source substitutions are complete; indexed member mapping remains equivalent with unknown and duplicate rejection',async()=>{
 const old=(await bound(OLD,'6f655f36044efbfde072d87bed58edd47a3f4346dee40335ad843ae94bbe5a82')).toString(),changes=JSON.parse(await bound(HANDOFF+'/declared-source-changes.json'));let expected=old;
 for(const c of changes){assert.equal(expected.split(c.fromText).length-1,c.occurrences,c.label);expected=expected.replaceAll(c.fromText,c.toText);}
 assert.equal((await bound(SELF)).toString(),expected);
 const scope={baseDirectory:'C:/toy',roots:[{id:'public',physicalPath:'C:/toy/live',aliases:['C:/toy/link']}]},h={bundle:{scope,files:[{path:'C:/toy/live/lock',rootId:'public'}]}},delta={files:[{path:'C:/toy/link/new.json',rootId:'public'},{path:'C:/toy/proof/evidence.json',rootId:null}]};
 assert.deepEqual(declaredHistoryMembership(h,delta),originalMembership(h,delta));assert.throws(()=>declaredHistoryMembership(h,{files:[{path:'C:/toy/link/lock',rootId:'public'}]}));assert.throws(()=>declaredHistoryMembership(h,{files:[{path:'C:/toy/other/a',rootId:'unknown'}]}));
 for(const [p,d]of Object.entries({'tools/daily-challenge/formal-v4/prefix-tail-native-task.mjs':'da2943fd288e79f7d1a6469089f8667d109dbb8f9a89ded7fff9a1b7156b1dd9','tools/daily-challenge/formal-v4/supplemental-failed-parent-evidence.mjs':'06b3174eb74b78f010f1c74f2af5883ec3fb2180645cf1a941da6686d38c311c','tools/daily-challenge/formal-v4/replaced-irregular-region-stock.mjs':'9a38e2db82c878488c63d4afb2386ed86ecfbfff57b50fd15d0996bbc6d90e2e','tools/daily-challenge/formal-v4/plan-history-adapter-v5.mjs':'6fce551da6428fba41d58950964a80d336ad16250034e6be6c5cb40b22531b06'}))await bound(p,d);
 checks.push({name:'complete-narrow-source-and-membership-equivalence',passed:true,sourceSubstitutions:changes.length});
});
test('actual runner dispatch expression awaits the imported native entry; archived missing-space spelling rejects before the stub',async()=>{
 const actual=(await bound(SELF)).toString(),old=(await bound('deliverables/daily-formal-v4-20261008/proof/native-supplemental-irregular-batch-handoff-02/outer-229172-before-fix.mjs.txt','229172a4bc7cee8c2dc7deb5f9e210a509d66bc6b7e79db4e00e3903f6b60ca3')).toString();
 const expression=s=>{const m=[...s.matchAll(/const result=([^;]+);assert\(result\.attempt\)/g)];assert.equal(m.length,1);return m[0][1];};
 assert.equal(expression(actual),'await exploreNativeTaskPrefixTail(rt,q,{plan:x.plan,redesignOf:latest.get(branch(q))})');
 assert.deepEqual(actual.match(/\bawait[A-Za-z_$]\w*\s*\(/g),null,'No fused await/call identifier');
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor,calls=[];
 const stub=async(rt,q,options)=>{await Promise.resolve();calls.push({rt,q,options});return{attempt:{id:'private-metadata-only'},completed:true};};
 const invoke=s=>new AsyncFunction('exploreNativeTaskPrefixTail','rt','q','x','latest','branch','return '+expression(s)+';');
 const args=[stub,{synthetic:true},{finalTargetDifficulty:2,branchId:'b'},{plan:{floor:21}},new Map([['b','failed-parent']]),q=>q.branchId];
 await assert.rejects(()=>invoke(old)(...args),/awaitexploreNativeTaskPrefixTail is not defined/);assert.equal(calls.length,0);
 const q=await invoke(actual)(...args);assert.equal(q.completed,true);assert.equal(calls.length,1);assert.deepEqual(calls[0].options,{plan:{floor:21},redesignOf:'failed-parent'});
 const exports=await import('./early-clear-native-supplemental-irregular-batch-task.mjs');
 for(const name of ['prepareEarlyClearNativeSupplementalIrregularBatch','constructEarlyClearNativeSupplementalIrregularBatch','runEarlyClearNativeSupplementalIrregularBatch','auditEarlyClearNativeSupplementalIrregularBatch']){assert.equal(typeof exports[name],'function');assert(actual.includes('await '+name+'('),'CLI must call the exported method');}
 assert(actual.includes('return makeNativeTaskPrefixTailPlan(rt,q,{...options,targetDifficulty:q.finalTargetDifficulty});'));
 assert(!actual.includes('explorePrefixTailV4(')&&!actual.includes('exploreLowBandPrefixTail('));
 checks.push({name:'real-dispatch-source-isolated-async-stub-and-archived-negative',passed:true,oldRejected:true,newStubCalls:1,newModelCalls:0});
});
test.after(async()=>{
 const c=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const f of Object.keys(c.metafile.inputs))toolBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 await bound(TEST);await write(out+'/report.json',{status:checks.length===4?'NATIVE_SUPPLEMENTAL_IRREGULAR_PRIVATE_PASS':'INCOMPLETE',errors:checks.length===4?[]:['Incomplete metadata tests'],checks,nativeExecutionStrategyAmendment:NATIVE_EXECUTION_STRATEGY_AMENDMENT,toolBindings,fileBindings:{...toolBindings,...bindings},qualificationOnly:true,syntheticMetadataOnly:true,newActualHistoryConsumptions:0,newRealReferencesReplayed:0,newReplayCalls:0,newModelCalls:0,newRealConstructions:0,newConstructions:0,newCspCalls:0,newSearches:0,newLedgerClaims:0,publicClaimsStarted:0,searchAlgorithmChanged:false,upperStrategyChanged:true,failedOriginalRetryAllowed:false,formalReady:false});
});


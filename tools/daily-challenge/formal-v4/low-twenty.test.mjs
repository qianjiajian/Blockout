import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {constructLowTwentyRegionStock} from './low-twenty-region-factory.mjs';
import {colourWithAllReferenceGates} from './early-frozen-region-factory.mjs';
import {LOW_TWENTY_EXPERIMENT_ID,LOW_BAND_BATCH_VERSION,assertLowBandBatchPlan,assertLowBandBatchIndex,recordLowBandColourAttempt,lowBandShapeBan,assertLowBandInputDiversity} from './low-twenty-contract.mjs';
import {claimLowBandCampaign,checkLedgerSnapshot,lowBandConstructionFiles,finishLatePrefixPlan,write,sha,HISTORY_LEDGER_ROOTS,PUBLIC_LEDGER,assertReviewedLowBandQualification} from './low-twenty-io.mjs';
import {assertLowTwentyProposal,lowTwentySelectionBindings,assertNoFailedDescendant,assertLowTwentyFailedParent,assertLowTwentyParentAncestry} from './prepare-low-twenty.mjs';
import {recordFormedLowTwentyInput} from './construct-low-twenty.mjs';
import {makeLowBandPrefixTailPlan} from './prefix-tail-low-band.mjs';

const out=process.env.LOW_TWENTY_TEST_OUT;assert(out,'Fresh private output directory required');await fs.mkdir(out,{recursive:false});
const runtime=await loadV4Runtime(),evidence=[],before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const fixturePath='deliverables/daily-formal-v4-20261008/proof/early-frozen-constructor-toy-probe-01/result.json',fixtureBytes=await fs.readFile(fixturePath),bp=JSON.parse(fixtureBytes).blueprint;
const h='a'.repeat(64),d={path:'private-only.json',sha256:h};let constructed;
function recipe(i){const source=Math.floor(i/2)+1,blocks=[{id:'a',x:0,y:0,color:'red',shape:[[0,0],[1,0]]},{id:'b',x:2,y:0,color:'blue',shape:[[0,0],[1,0]]},{id:'c',x:0,y:1,color:'green',shape:[[0,0],[1,0]]},{id:'d',x:2,y:1,color:'yellow',shape:[[0,0],[1,0]]}],level={id:source,width:4,height:2,blocks,gates:[]};
 const changed=i%2?[blocks[2],blocks[3]]:[blocks[1],blocks[3]],ids=new Set(changed.map(b=>b.id)),prefix=[{blockId:'a',path:[],exitSide:'left'}],cells=changed.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]));
 return{recipeId:`private-${i}`,sourceLevelId:source,targetDifficulty:i<8?1:2,branchId:`s${source}`,reference:d,maximumStocks:1,maximumStaticPartitionAttempts:200,seed:i+1,bodyCountDelta:1,level,allReferenceGates:[],referenceLevelSha256:levelSha256(level),normalBoardArea:8,prefixDrags:prefix,prefixSha256:routeSha256(prefix),prefixFacts:{drags:1,parking:0,clears:1},changedBodies:changed,fixedBlocks:blocks.filter(b=>!ids.has(b.id)),region:{bodyIds:[...ids],cells,area:4,fraction:.5,connected:true},prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true};}
function plan(){const blueprints=Array.from({length:20},(_,i)=>recipe(i));return{version:LOW_BAND_BATCH_VERSION,schemaVersion:4,scope:300,qualificationOnly:false,experimentId:LOW_TWENTY_EXPERIMENT_ID,selectedIndex:d,selectionReview:d,historyCheckpoint:d,lowBandQualification:d,proposal:d,proposalReview:d,constructorQualification:d,selected:[d],selectedCount:1,campaign:{key:h,experimentId:LOW_TWENTY_EXPERIMENT_ID,maximumInputs:20,previousActualInputs:0,userGlobalLimitClaimed:false},closedCampaignsExtended:false,maximumAfterThisBatch:20,blueprints,approvedRecipes:blueprints.map(b=>b.recipeId),gatePolicy:'all-reference-gates-byte-equivalent-in-original-order',maximumFinalColourInputsIncludingRejected:20,maximumStocksEnteringColourCspIncludingFailed:20,maximumStaticPartitionAttempts:4000,failedParents:Array.from({length:10},(_,i)=>({source:i+1,branchId:`s${i+1}`})),futureStrategy:{tailStrategy:'plain-joint-low-band',originalLowerFloors:{1:16,2:21},originalUpperCeilings:{1:20,2:30},maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},futureUpperBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},futureLowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,newBatch:.65,source:.55,old450:.75},staticSlots:Object.fromEntries([1,2].map(n=>[n,{formalId:`daily-basic-combined-d${n}-01`,stageKey:'basic-combined',difficulty:n,slot:1,newestMechanism:null}])),shapePolicy:'failed-parent-and-same-source-branch-only',globalShapeInventoryUniquenessRequired:false,slotAssigned:false,formalReady:false,currentRuntimeValidationClaimed:false,noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,bindings:{private:h},ledgerSnapshot:{roots:[{}]}};}
test('new20 private plan is ten distinct source pairs; quotas/gates/bands cannot drift',()=>{
 const p=plan();assertLowBandBatchPlan(p);
 for(const change of [q=>q.maximumAfterThisBatch=52,q=>q.blueprints[0].maximumStocks=2,q=>q.blueprints[0].maximumStaticPartitionAttempts=501,q=>q.blueprints[1].region=q.blueprints[0].region,q=>q.blueprints[0].allReferenceGates=[{}],q=>q.futureUpperBudget.maxMilliseconds=120000,q=>q.futureLowerBudget.maxStates=10000,q=>q.closedCampaignsExtended=true]){const q=structuredClone(p);change(q);assert.throws(()=>assertLowBandBatchPlan(q));}
 evidence.push({name:'fixed20-ten-distinct-pairs-all-gates-band-and-quota',passed:true});
});
test('failed CSP spends one recipe allowance; actual attempts determine index counts',()=>{
 const p=plan(),m=new Map();assert(recordLowBandColourAttempt(m,p.blueprints[0],{ok:false,paint:{ok:false}}));assert.throws(()=>recordLowBandColourAttempt(m,p.blueprints[0],{paint:{}}));
 const index={status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',scope:300,fixedColourInputs:1,stocksEnteringColourCspIncludingFailed:1,eligibleInputs:0,candidates:[],totalActualInputsIncludingThis:1,campaignKey:h,experimentId:LOW_TWENTY_EXPERIMENT_ID,closedCampaignsExtended:false,perRecipeColourCspInputs:{'private-0':1},perRecipeStaticAttempts:{'private-0':1},attempts:[{recipeId:'private-0',localAttempt:0,enteredColourCsp:true}],gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
 assertLowBandBatchIndex(index,p);const bad=structuredClone(index);bad.perRecipeColourCspInputs={'private-1':1};assert.throws(()=>assertLowBandBatchIndex(bad,p));evidence.push({name:'failed-csp-quota-and-index-reconstruction',passed:true});
});
test('whole private new stock preserves all eight gate bytes/order and two-model prefix',async()=>{
 constructed=constructLowTwentyRegionStock(runtime,bp,{seed:1,bodyCountDelta:3,qualificationOnly:true});assert(constructed.ok,JSON.stringify({status:constructed.status,reason:constructed.reason,paint:constructed.paint?.reason}));
 assert.deepEqual(constructed.level.gates,bp.level.gates);assert.equal(constructed.constructionAccounting.version,'late-region-static-construction-v1');assert.equal(constructed.constructionAccounting.completeWorldReservations,2);
 assert.equal(constructed.prefixAudit.valid,true);assert.equal(constructed.prefixAudit.clearEvents,1);assert.equal(constructed.level.blocks.length,7);assert(constructed.level.blocks.every(b=>!b.frozen));
 assert.notEqual(designFingerprints(constructed.level).shapeSha256,designFingerprints(bp.level).shapeSha256);assert.notEqual(designFingerprints(constructed.level).colorSha256,designFingerprints(bp.level).colorSha256);
 await write(`${out}/private-stock.json`,constructed);evidence.push({name:'actual-private-full-retile-all-gates-prefix',passed:true,completeWorlds:2,fullUValidated:false});
});
test('all-gates unsupported aperture rejects instead of relocating a gate',()=>{
 const q=structuredClone(bp);q.level.gates[0].size=1;const r=colourWithAllReferenceGates(constructed.placeholderWorld,runtime,q,{seed:1});assert.equal(r.ok,false);evidence.push({name:'fixed-gate-no-relocation-fallback',passed:true,reason:r.reason});
});
test('world reservation and finite clocks fail closed before paint when exhausted',()=>{
 const q=constructLowTwentyRegionStock(runtime,bp,{seed:1,bodyCountDelta:3,qualificationOnly:true,meterLimits:{maxWorlds:1}});assert.equal(q.ok,false);assert.equal(q.paint,null);assert.equal(q.constructionAccounting.completeWorldReservations,1);
 for(const limits of [{maxWorlds:NaN},{maxMilliseconds:30001},{maxTransitions:Infinity}])assert.throws(()=>constructLowTwentyRegionStock(runtime,bp,{seed:1,qualificationOnly:true,meterLimits:limits}));
 evidence.push({name:'precharged-world-finite-resource-bounds',passed:true});
});
test('formed colour failures remain source history; unrelated inventory is not globally banned',()=>{
 const m=new Map(),f=designFingerprints(constructed.level);assert.deepEqual(recordFormedLowTwentyInput(m,'a',{ok:false,paint:{ok:true},level:constructed.level}),[]);assert.deepEqual(m.get('a'),[f]);
 const b={sourceLevelId:1,branchId:'a'},parents=[{source:1,branchId:'a',fingerprints:{shapeSha256:'parent'}}];assert.deepEqual([...lowBandShapeBan(b,parents,[{key:'2:other',fingerprints:{shapeSha256:'unrelated'}}])],['parent']);
 const x={key:'a',shapeSha256:'shape',colorSha256:'red',designSha256:'one'},y={key:'b',shapeSha256:'shape',colorSha256:'blue',designSha256:'two'};assertLowBandInputDiversity([x,y]);assert.throws(()=>assertLowBandInputDiversity([x,{...y,key:'a'}]));evidence.push({name:'failed-full-colour-history-and-branch-only-shape-ban',passed:true});
});
test('same experiment cannot restart under another proposal or plan or label',async()=>{
 const ledger=`${out}/private-ledger`;const make=async(n)=>{const pp=`${out}/proposal-${n}.json`;await write(pp,{private:n});const pd={path:pp,sha256:sha(await fs.readFile(pp))};const pf=`${out}/plan-${n}.json`;await write(pf,{experimentId:LOW_TWENTY_EXPERIMENT_ID,proposal:pd,campaign:{key:pd.sha256,experimentId:LOW_TWENTY_EXPERIMENT_ID}});return{path:pf,sha256:sha(await fs.readFile(pf))};};
 const one=await make(1),two=await make(2),snapshot={roots:[{directory:ledger,files:[]}]};const claim=await claimLowBandCampaign(one,`${out}/out1`,{qualificationOnly:true,ledgerDirectory:ledger});await finishLatePrefixPlan(claim,{status:'PRIVATE_FINISHED',constructionFiles:[]});
 await checkLedgerSnapshot(snapshot,{qualificationOnly:true,expectedPrivateRoots:[ledger],allowedNewFiles:lowBandConstructionFiles(one,h,ledger)});
 await assert.rejects(()=>claimLowBandCampaign(two,`${out}/out2`,{qualificationOnly:true,ledgerDirectory:ledger}),/EEXIST/);
 await write(`${ledger}/unknown.json`,{});await assert.rejects(()=>checkLedgerSnapshot(snapshot,{qualificationOnly:true,expectedPrivateRoots:[ledger],allowedNewFiles:lowBandConstructionFiles(one,h,ledger)}),/Unreviewed shared history/);
 evidence.push({name:'stable-experiment-lock-and-exact-owned-history-delta',passed:true});
});
test('all seven real/junction shared histories reject private aliases before any write',async()=>{
 const env=JSON.parse(await fs.readFile('snapshot-environment.json'));assert.equal(HISTORY_LEDGER_ROOTS.length,7);
 for(const root of HISTORY_LEDGER_ROOTS)for(const dir of [root,path.join(env.sourceWorkspace,root,'not-created-private')])await assert.rejects(()=>claimLowBandCampaign(d,'unused',{qualificationOnly:true,ledgerDirectory:dir}),/aliases shared history/);
 evidence.push({name:'seven-shared-realpath-private-guard',passed:true});
});
test('real readonly proposal152 and all ten archived failure schemas bind without prepare',async()=>{
 const root='deliverables/daily-formal-v4-20261008/',p=JSON.parse(await fs.readFile(root+'design/low-band-diverse-twenty-proposal-02/proposal.json'));assertLowTwentyProposal(p);
 const r=JSON.parse(await fs.readFile(root+'proof/completed152-quick-independent-01.json')),index=JSON.parse(await fs.readFile(r.selection.path));lowTwentySelectionBindings(r,index,r.selection);
 for(const ref of p.references){const q=JSON.parse(await fs.readFile(ref.knownSealedParent.candidate.path)),res=JSON.parse(await fs.readFile(ref.knownSealedParent.result.path));assertLowTwentyFailedParent(q,res);assert.throws(()=>assertLowTwentyFailedParent(q,{...res,levelSha256:'0'.repeat(64)}));}
 const bad=structuredClone(r);bad.exactTwoAppendedOriginalReceipts=false;assert.throws(()=>lowTwentySelectionBindings(bad,index,r.selection));evidence.push({name:'production-readonly-exact-proposal-selection-and-failure-schemas',passed:true,prepared:false,realReplays:0});
});
test('a later failed descendant refuses stale context rather than silently resetting ancestry',async()=>{
 const rows=[{id:'b',redesignOf:'a'},{id:'c',redesignOf:'b'}];await assert.rejects(()=>assertNoFailedDescendant('a',rows,async id=>({accepted:id==='b'})),/newer failed descendant/);
 assertLowTwentyParentAncestry('c','a',rows);assert.throws(()=>assertLowTwentyParentAncestry('c','other',rows));
 assert.equal((await assertNoFailedDescendant('a',rows,async()=>({accepted:true}))).checked,2);await assert.rejects(()=>assertNoFailedDescendant('a',[{id:'a',redesignOf:'a'}],async()=>({accepted:true})),/Cyclic/);
 evidence.push({name:'latest-failed-branch-no-parent-reset',passed:true});
});
test('frozen low engine receives C2 plus fixed prefix and independently fixed16/21 lower',async()=>{
 const file=`${out}/private-stock.json`,candidate={...constructed,constructionEvidence:{path:file,sha256:sha(await fs.readFile(file))}};
 for(const d of [1,2]){const p=makeLowBandPrefixTailPlan(runtime,candidate,{targetDifficulty:d,qualificationOnly:true});assert.equal(p.floor,d===1?16:21);assert.equal(p.totalUpperLimit,d===1?20:30);assert.equal(p.tailParkingLimit,p.totalUpperLimit-constructed.prefixDrags.filter(x=>!x.exitSide).length);assert.equal(p.lowerBudget.maxMilliseconds,30000);assert.equal(p.fullUpperBudget.maxMilliseconds,30000);}
 const q=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/proof/low-band-prefix-tail-independent-01/report.json'));await assertReviewedLowBandQualification(q);
 const source=await fs.readFile('tools/daily-challenge/formal-v4/run-low-twenty.mjs','utf8');assert(source.includes("from './prefix-tail-low-band.mjs'"));assert(!source.includes('exploreNative'));
 evidence.push({name:'frozen-one-tail-original-low-band-entry-bindings',passed:true,newSearches:0});
});
test.after(async()=>{
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),added=after.filter(x=>!before.includes(x));
 const tools=['low-twenty-contract.mjs','low-twenty-io.mjs','low-twenty-region-factory.mjs','prepare-low-twenty.mjs','construct-low-twenty.mjs','run-low-twenty.mjs','low-twenty.test.mjs'].map(x=>'tools/daily-challenge/formal-v4/'+x);
 const compiled=await build({entryPoints:tools,bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-private',platform:'node',format:'esm',logLevel:'silent'}),fileBindings={...runtime.toolchainBindings,[fixturePath]:sha(fixtureBytes)};
 for(const f of Object.keys(compiled.metafile.inputs))fileBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 await write(`${out}/report.json`,{status:evidence.length===11?'LOW_TWENTY_PRIVATE_QUALIFICATION_PASS':'PRIVATE_QUALIFICATION_INCOMPLETE',qualificationOnly:true,evidence,errors:[],fileBindings,
  publicObservation:{before:before.length,after:after.length,addedRequests:added,parallelChangesNotAttributedToPrivateTests:true},newRealConstructions:0,newSearches:0,publicClaimsStarted:0,privateStockConstructions:2,privateGateColourCalls:1,preparedActualPlan:false,formalReady:false});
});

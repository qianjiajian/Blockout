import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {LOW_BAND_BATCH_VERSION,assertLowBandBatchPlan,assertLowBandBatchIndex,deriveLowBandHistoryAccounting,recordLowBandColourAttempt,lowBandShapeBan,assertLowBandInputDiversity} from './low-band-batch-contract.mjs';
import {claimLowBandCampaign,assertReviewedLowBandQualification,assertLowBandFailedParentResult,lowBandConstructionFiles,checkLedgerSnapshot,finishLatePrefixPlan,sha,HISTORY_LEDGER_ROOTS,write} from './low-band-batch-io.mjs';

const h='a'.repeat(64),d={path:'private-metadata.json',sha256:h};
function blueprint(id,band,source){
 const shape=[[0,0],[1,0]],blocks=[{id:'a',x:0,y:0,color:'red',shape},{id:'b',x:2,y:0,color:'blue',shape},{id:'c',x:0,y:1,color:'green',shape},{id:'d',x:2,y:1,color:'yellow',shape}],level={id:source,width:4,height:2,blocks,gates:[]};
 const prefixDrags=[{blockId:'a',path:[],exitSide:'left'}];
 return{recipeId:id,branchId:'private-'+source,sourceLevelId:source,targetDifficulty:band,maximumStocks:1,maximumStaticPartitionAttempts:125,seed:100+source,bodyCountDelta:1,reference:d,level,referenceLevelSha256:levelSha256(level),normalBoardArea:8,prefixDrags,prefixSha256:routeSha256(prefixDrags),prefixFacts:{drags:1,parking:0,clears:1},changedBodies:[blocks[1],blocks[3]],fixedBlocks:[blocks[0],blocks[2]],region:{bodyIds:['b','d'],cells:[[2,0],[3,0],[2,1],[3,1]],area:4,fraction:.5,connected:true},prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true};
}
function plan(){
 const blueprints=Array.from({length:32},(_,i)=>blueprint('recipe-'+i,i<8?1:2,Math.floor(i/4)+1));
 const history=deriveLowBandHistoryAccounting([{plan:d,previous:13,actual:45,after:58,quota:45,qualificationOnly:false,terminal:true}]);
 return{version:LOW_BAND_BATCH_VERSION,schemaVersion:4,scope:300,qualificationOnly:false,selectedIndex:d,selectionReview:d,historyCheckpoint:d,lowBandQualification:d,proposal:d,selected:[d],selectedCount:1,campaign:{key:h,maximumInputs:32,previousActualInputs:58,userGlobalLimitClaimed:false},history,blueprints,approvedRecipes:blueprints.map(b=>b.recipeId),maximumStocksEnteringColourCspIncludingFailed:32,maximumFinalColourInputsIncludingRejected:32,maximumStaticPartitionAttempts:4000,maximumAfterThisBatch:90,failedParents:Array.from({length:8},(_,i)=>({source:i+1,branchId:'private-'+(i+1)})),futureStrategy:{tailStrategy:'plain-joint-low-band',originalLowerFloors:{1:16,2:21},originalUpperCeilings:{1:20,2:30},maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},futureUpperBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},futureLowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,newBatch:.65,source:.55,old450:.75},staticSlots:{1:{stageKey:'basic-combined',difficulty:1},2:{stageKey:'basic-combined',difficulty:2}},shapePolicy:'failed-parent-and-same-source-branch-only',globalShapeInventoryUniquenessRequired:false,slotAssigned:false,formalReady:false,currentRuntimeValidationClaimed:false,noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,bindings:{'private':h},ledgerSnapshot:{roots:[{}]}};
}
test('32 explicit low inputs retain 58 history and have no experiment-wide64 barrier',()=>{
 const p=plan();assertLowBandBatchPlan(p);assert.equal(p.maximumAfterThisBatch,90);
 for(const mutate of [q=>q.blueprints[0].targetDifficulty=3,q=>q.futureUpperBudget.maxMilliseconds=120000,q=>q.futureLowerBudget.maxStates=10000,q=>q.maximumStaticPartitionAttempts=3999,q=>q.shapePolicy='global-shape-unique']){const q=structuredClone(p);mutate(q);assert.throws(()=>assertLowBandBatchPlan(q));}
});
test('actual zero-CSP history precedes a nonzero same-start batch; no reset or overlap',()=>{
 const rows=[{plan:{...d,sha256:'b'.repeat(64)},previous:58,actual:4,after:62,quota:8,qualificationOnly:false,terminal:true},{plan:d,previous:58,actual:0,after:58,quota:2,qualificationOnly:false,terminal:true}];
 assert.equal(deriveLowBandHistoryAccounting(rows).total,62);assert.throws(()=>deriveLowBandHistoryAccounting([{...rows[0],previous:0},rows[1]]));
});
test('failed CSP is charged once and index cannot forge another recipe share',()=>{
 const p=plan(),counts=new Map();assert.equal(recordLowBandColourAttempt(counts,p.blueprints[0],{ok:false,paint:{ok:false}}),true);assert.throws(()=>recordLowBandColourAttempt(counts,p.blueprints[0],{ok:false,paint:{}}));
 const index={status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',scope:300,fixedColourInputs:1,stocksEnteringColourCspIncludingFailed:1,eligibleInputs:0,candidates:[],totalActualInputsIncludingThis:59,campaignKey:h,perRecipeColourCspInputs:{'recipe-0':1},perRecipeStaticAttempts:{'recipe-0':1},attempts:[{recipeId:'recipe-0',localAttempt:0,enteredColourCsp:true}],gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
 assertLowBandBatchIndex(index,p);const bad=structuredClone(index);bad.perRecipeColourCspInputs={'recipe-1':1};assert.throws(()=>assertLowBandBatchIndex(bad,p));
});
test('joint and no-tail historical failures remain exact; no invented upper or altered lower',()=>{
 const proof={status:'unknown',discoveredStates:10000},packet={accepted:false,status:'FAILED',levelSha256:h,proof},joint={accepted:false,status:'FAILED',levelSha256:h,lower:proof,upper:proof};
 assertLowBandFailedParentResult(packet,joint);assertLowBandFailedParentResult({...packet,proof:undefined},{accepted:false,status:'FAILED',levelSha256:h});
 const noTail={...packet,route:null,proof:undefined},noTailResult={accepted:false,status:'FAILED',levelSha256:h};
 assertLowBandFailedParentResult(noTail,noTailResult);assert.throws(()=>assertLowBandFailedParentResult(noTail,{...noTailResult,upper:{}}));
 assert.throws(()=>assertLowBandFailedParentResult(packet,{...joint,upper:{...proof,discoveredStates:10}}));assert.throws(()=>assertLowBandFailedParentResult(packet,{...joint,lower:{}}));
});
test('shape-only bans are branch scoped while duplicate designs and same-branch shape/colour are rejected',()=>{
 const b=blueprint('a',1,1),parents=[{source:1,branchId:b.branchId,fingerprints:{shapeSha256:'parent'}},{source:2,branchId:'other',fingerprints:{shapeSha256:'unrelated'}}],earlier=[{key:'1:'+b.branchId,fingerprints:{shapeSha256:'same-branch'}},{key:'2:other',fingerprints:{shapeSha256:'other-past'}}];
 assert.deepEqual([...lowBandShapeBan(b,parents,earlier)],['parent','same-branch']);
 const a={key:'1:a',shapeSha256:'same',colorSha256:'red',designSha256:'layout1'},c={key:'2:b',shapeSha256:'same',colorSha256:'blue',designSha256:'layout2'};
 assertLowBandInputDiversity([a,c]);assert.throws(()=>assertLowBandInputDiversity([a,{...c,key:a.key}]));assert.throws(()=>assertLowBandInputDiversity([a,{...c,designSha256:a.designSha256}]));
});
test('one immutable proposal cannot restart through another plan or output label',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-low-batch-')),proposal=path.join(tmp,'proposal.json');await write(proposal,{private:true});const pd={path:proposal,sha256:sha(await fs.readFile(proposal))};
 const make=async name=>{const file=path.join(tmp,name);await write(file,{proposal:pd,campaign:{key:pd.sha256},label:name});return{path:file,sha256:sha(await fs.readFile(file))};};
 const one=await make('one.json'),two=await make('two.json'),options={qualificationOnly:true,ledgerDirectory:path.join(tmp,'ledger')};
 await claimLowBandCampaign(one,path.join(tmp,'out1'),options);await assert.rejects(()=>claimLowBandCampaign(two,path.join(tmp,'out2'),options),/EEXIST/);
 assert.equal((await fs.readdir(options.ledgerDirectory)).filter(n=>n.endsWith('.claim.json')).length,1);
});
test('real private campaign construction writes exactly three permitted ledger files, not an arbitrary fourth',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-low-flow-')),ledger=path.join(tmp,'ledger');await fs.mkdir(ledger);
 const proposal=path.join(tmp,'proposal.json');await write(proposal,{private:true});const pd={path:proposal,sha256:sha(await fs.readFile(proposal))};
 const planFile=path.join(tmp,'plan.json');await write(planFile,{proposal:pd,campaign:{key:pd.sha256}});const planD={path:planFile,sha256:sha(await fs.readFile(planFile))};
 const snapshot={roots:[{directory:ledger,files:[]}]},claim=await claimLowBandCampaign(planD,path.join(tmp,'out'),{qualificationOnly:true,ledgerDirectory:ledger});
 await finishLatePrefixPlan(claim,{status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',stocksEnteringColourCspIncludingFailed:0,gameplaySearches:0,publicLedgerClaims:0});
 const options={qualificationOnly:true,expectedPrivateRoots:[ledger],allowedNewFiles:lowBandConstructionFiles(planD,pd.sha256,ledger)};
 assert.equal((await fs.readdir(ledger)).length,3);await checkLedgerSnapshot(snapshot,options);
 await write(path.join(ledger,'unrelated.json'),{});await assert.rejects(()=>checkLedgerSnapshot(snapshot,options),/Unreviewed shared history added/);
});
test('private campaign refuses all six shared roots and future child paths before reading plan',async()=>{
 for(const root of HISTORY_LEDGER_ROOTS)for(const dir of [root,path.join(root,'not-created-private-suffix')])await assert.rejects(()=>claimLowBandCampaign({path:'does-not-exist',sha256:h},'unused',{qualificationOnly:true,ledgerDirectory:dir}),/aliases shared history/);
 await assert.rejects(()=>claimLowBandCampaign(d,'unused',{qualificationOnly:'true'}));
});
test('original qualified low-band engine and 30 second budget stay bound, no native120 substitution',async()=>{
 const file='deliverables/daily-formal-v4-20261008/proof/low-band-prefix-tail-independent-01/report.json',q=JSON.parse(await fs.readFile(file,'utf8'));await assertReviewedLowBandQualification(q);
 const source=await fs.readFile('tools/daily-challenge/formal-v4/run-low-band-batch.mjs','utf8');assert(source.includes("from './prefix-tail-low-band.mjs'"));assert(!source.includes("from './prefix-tail-native"));
 const bad=structuredClone(q);bad.proofToolchainSha256='0'.repeat(64);await assert.rejects(()=>assertReviewedLowBandQualification(bad));
});

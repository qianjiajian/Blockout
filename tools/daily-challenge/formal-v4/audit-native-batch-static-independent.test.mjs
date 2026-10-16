import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {NATIVE_BATCH_VERSION,NATIVE_BATCH_REVIEW_STATUS,NATIVE_BATCH_STATIC_REVIEW_STATUS,deriveNativeMacroAccounting} from './native-batch-contract.mjs';
import {assertReviewedNativeQualification,PUBLIC_LEDGER} from './native-batch-io.mjs';
import {assertNativeBatchStaticEnvelope,assertNativeCandidateRecipe,assertNativeBatchPrefixFacts,assertNativeBatchCspAccounting,assertSolidNativeStock} from './audit-native-batch-static-independent.mjs';

const SELF='tools/daily-challenge/formal-v4/audit-native-batch-static-independent.test.mjs';
const TOOL='tools/daily-challenge/formal-v4/audit-native-batch-static-independent.mjs';
const ORIGINAL='tools/daily-challenge/formal-v4/audit-next-native-prefix-static-independent.mjs';
const QUALIFICATION='deliverables/daily-formal-v4-20261008/proof/native120-counter-independent-v2-01/report.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const originalBytes=await fs.readFile(ORIGINAL),evidence=[];
const d=n=>({path:`private-metadata-only-${n}.json`,sha256:String(n).padStart(64,'0')});
function recipe(recipeId,sourceLevelId,maximumStocks){
 const level={id:sourceLevelId,width:4,height:2,blocks:Array.from({length:8},(_,i)=>({id:`b${i}`,x:i%4,y:Math.floor(i/4),shape:[[0,0]],color:i%2?'blue':'red'})),gates:[]};
 const changedBodies=level.blocks.filter(b=>[2,3,6,7].includes(Number(b.id.slice(1)))),fixedBlocks=level.blocks.filter(b=>!changedBodies.includes(b));
 const prefixDrags=[{blockId:'b0',path:[],exitSide:'left'}];
 return{recipeId,sourceLevelId,maximumStocks,targetDifficulty:3,reference:d(10),level,referenceLevelSha256:levelSha256(level),changedBodies,fixedBlocks,
  normalBoardArea:8,region:{bodyIds:changedBodies.map(b=>b.id),cells:changedBodies.map(b=>[b.x,b.y]),area:4,fraction:.5,connected:true},
  prefixDrags,prefixSha256:routeSha256(prefixDrags),prefixFacts:{drags:1,parking:0,clears:1},prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true};
}
function metadata(){
 const blueprints=[recipe('fixture-alpha',17,2),recipe('fixture-beta',23,3)];
 const macroHistory=deriveNativeMacroAccounting([{plan:d(1),previous:51,actual:3,after:54,quota:3,qualificationOnly:false,terminal:true}]);
 const plan={schemaVersion:4,scope:300,version:NATIVE_BATCH_VERSION,qualificationOnly:false,selectedIndex:d(2),selectionReview:d(3),historyCheckpoint:d(4),nativeQualification:d(5),
  selected:Array.from({length:151},(_,i)=>d(i+100)),selectedCount:151,macroHistory,previousMacro64ActualInputs:54,maximumAfterThisBatch:59,combinedMaximumInputs:64,
  blueprints,approvedRecipes:blueprints.map(b=>b.recipeId),failedParents:[{source:17,id:'old-a'},{source:23,id:'old-b'}],
  maximumFinalColourInputsIncludingRejected:5,maximumStocksEnteringColourCspIncludingFailed:5,maximumStaticPartitionAttempts:101,
  futureStrategy:{tailStrategy:'native-120',originalLowerFloor:31,maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},
  futureUpperBudget:{maxStates:10000,maxMilliseconds:120000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000},
  futureLowerBudget:{maxStates:9999,maxMilliseconds:30000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000},
  sequence:{baseSeed:71,step:17,sourceFactor:13,bodyCountDeltas:[-2,0,3]},similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,newBatch:.65,source:.55,old450:.75},
  staticSlot:{stageKey:'basic-combined',difficulty:3},slotAssigned:false,formalReady:false,currentRuntimeValidationClaimed:false,noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,
  bindings:{'private-metadata-only':hash('fixture')},ledgerSnapshot:{roots:[{directory:'private-metadata-only',files:[]}]}};
 const attempts=[{index:0,recipeId:'fixture-alpha',sourceLevelId:17,enteredColourCsp:false},{index:1,recipeId:'fixture-beta',sourceLevelId:23,enteredColourCsp:true,rejection:'private-colour-rejection'},
  {index:2,recipeId:'fixture-alpha',sourceLevelId:17,enteredColourCsp:true}];
 const candidate={...d(20),recipeId:'fixture-alpha',sourceLevelId:17};
 const index={schemaVersion:4,scope:300,status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',plan:d(21),attempts,
  fixedColourInputs:2,stocksEnteringColourCspIncludingFailed:2,eligibleInputs:1,candidates:[candidate],perRecipeColourCspInputs:{'fixture-alpha':1,'fixture-beta':1},
  macro64ActualInputsIncludingThis:56,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
 const review={status:NATIVE_BATCH_REVIEW_STATUS,plan:index.plan,errors:[],recipeCount:2,newSearches:0,newConstructions:0};
 return{plan,index,review};
}
function check(name,fn){test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(error){evidence.push({name,passed:false,error:error.message});throw error;}});}

check('dynamic recipes/151 selected/5 quota accept actual 2 CSP and reject quota substitution or scope drift',()=>{
 const {plan,index,review}=metadata();assertNativeBatchStaticEnvelope(index,plan,review);
 assert.equal(NATIVE_BATCH_STATIC_REVIEW_STATUS,'INDEPENDENT_FINITE_NATIVE_BATCH_STATIC_PASS');
 for(const mutate of [x=>x.index.fixedColourInputs=5,x=>x.index.macro64ActualInputsIncludingThis=59,x=>x.review.recipeCount=3,x=>x.plan.futureLowerBudget.maxMilliseconds=120000,
  x=>x.plan.futureUpperBudget.maxStates=10001,x=>x.plan.selectedCount=150,x=>x.plan.futureStrategy.tailStrategy='native']){
  const x=metadata();mutate(x);assert.throws(()=>assertNativeBatchStaticEnvelope(x.index,x.plan,x.review));}
});
check('exact recipe and native-120 are mandatory; a matching early prefix is never promoted to L31',()=>{
 const {plan}=metadata(),bp=plan.blueprints[0],row={recipeId:bp.recipeId,sourceLevelId:bp.sourceLevelId};
 assertNativeCandidateRecipe(bp,row,row,{...row,predeclaredUpperStrategy:'native-120'});
 for(const mutate of [q=>q.recipeId='wrong',q=>q.sourceLevelId=100,q=>q.predeclaredUpperStrategy='native']){
  const q={...row,predeclaredUpperStrategy:'native-120'};mutate(q);assert.throws(()=>assertNativeCandidateRecipe(bp,row,row,q));}
 const early={...bp,prefixFacts:{drags:9,parking:7,clears:2}},prefix={valid:true,providedPrefixOnly:true,fullUValidated:false,isLowerBound:false,complete:false,drags:9,nonClearingDrags:7,clearEvents:2};
 assertNativeBatchPrefixFacts(early,prefix);
 for(const mutate of [p=>p.nonClearingDrags=31,p=>p.clearEvents=1,p=>p.isLowerBound=true,p=>p.fullUValidated=true,p=>p.complete=true]){
  const q=structuredClone(prefix);mutate(q);assert.throws(()=>assertNativeBatchPrefixFacts(early,q));}
});
check('construction evidence must reproduce actual per-recipe CSP flags including rejected colours',()=>{
 const {plan,index}=metadata(),rows=index.attempts.map(a=>({index:a.index,recipeId:a.recipeId,source:a.sourceLevelId,enteredColourCsp:a.enteredColourCsp}));
 assert.deepEqual(assertNativeBatchCspAccounting(index,plan,rows),{'fixture-alpha':1,'fixture-beta':1});
 for(const mutate of [r=>r[1].enteredColourCsp=false,r=>r[1].source=17,r=>r[1].recipeId='fixture-alpha',r=>r.pop()]){
  const q=structuredClone(rows);mutate(q);assert.throws(()=>assertNativeBatchCspAccounting(index,plan,q));}
});
check('physical rectangle and per-drag dual-prefix implementations remain byte-for-byte inherited',async()=>{
 const old=originalBytes.toString().replaceAll('\r\n','\n'),current=(await fs.readFile(TOOL,'utf8')).replaceAll('\r\n','\n');
 const block=s=>s.slice(s.indexOf('export function assertSolidNativeStock'),s.indexOf('\n}\n',s.indexOf('function auditPrefix'))+3);
 assert.equal(block(current),block(old));
 assertSolidNativeStock({blocks:[{shape:[[0,0],[1,0],[0,1],[1,1]]}]});
 assert.throws(()=>assertSolidNativeStock({blocks:[{shape:[[0,0],[0,1],[1,1]]}]}),/rectangle/);
});
check('the real reviewed native120 v2 schema passes its shared adapter; invented or weakened schema fails',async()=>{
 const q=JSON.parse(await fs.readFile(QUALIFICATION)),bindings=await assertReviewedNativeQualification(q);
 assert.equal(bindings[q.reviewed.wrapper.path],'7303abec3b7ecf788b1dec3e1d35c382ab4b8a10bf0e50a7e2515a67a496a940');
 for(const mutate of [p=>p.status='INDEPENDENT_NATIVE_PREFIX_TAIL_V4_PASS',p=>p.independentNewNegatives.testsPassed=0,p=>p.review.originalLowerMaxMilliseconds=120000,p=>p.publicClaimsStarted=1]){
  const c=structuredClone(q);mutate(c);await assert.rejects(assertReviewedNativeQualification(c));}
 await assert.rejects(assertReviewedNativeQualification(q,{[q.reviewed.wrapper.path]:'0'.repeat(64)}));
});

after(async()=>{
 const names=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();assert.deepEqual(names,before);assert.equal(hash(await fs.readFile(ORIGINAL)),hash(originalBytes));
 if(!process.env.NATIVE_BATCH_STATIC_TEST_OUT)return;
 const out=process.env.NATIVE_BATCH_STATIC_TEST_OUT;await fs.mkdir(out,{recursive:false});
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',platform:'node',format:'esm',write:false,metafile:true,logLevel:'silent'}),fileBindings={};
 for(const p of [...Object.keys(compiled.metafile.inputs),ORIGINAL,QUALIFICATION])fileBindings[p]=hash(await fs.readFile(p));
 const report={status:evidence.length===5&&evidence.every(e=>e.passed)?'NATIVE_BATCH_STATIC_AUDITOR_PRIVATE_QUALIFICATION_PASS':'NATIVE_BATCH_STATIC_AUDITOR_PRIVATE_QUALIFICATION_FAIL',
  qualificationOnly:true,tool:{path:TOOL,sha256:fileBindings[TOOL]},original:{path:ORIGINAL,sha256:fileBindings[ORIGINAL]},fileBindings,evidence,
  publicRequestCountBefore:before.length,publicRequestCountAfter:names.length,publicClaimsStarted:0,newGameplaySearches:0,newConstructionCalls:0,newActualCandidateReplays:0,
  limitations:'Metadata fixtures and shared qualification adapter only. No real constructed batch, Canvas, mathematical route or lower bound was accepted.'};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

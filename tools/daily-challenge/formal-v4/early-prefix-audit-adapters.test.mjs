import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {assertEarlyPrefixStaticMetadata} from './audit-early-prefix-static-independent.mjs';
import {assertEarlyPrefixActualMetadata,assertEarlyPrefixReceiptAccounting} from './audit-early-prefix-actual-independent.mjs';
import {RECIPES,auditEarlyPrefixQuotas} from './early-prefix-four-contract.mjs';
import {PUBLIC_LEDGER} from './native-batch-io.mjs';

const out=process.env.EARLY_PREFIX_AUDIT_TEST_OUT;assert(out,'A new private qualification directory is required');
await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),fileBindings={},evidence=[];
const names=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),before=await names();
const fixturePath='deliverables/daily-formal-v4-20261008/proof/early-frozen-prefix-tail-private-02/report.json';
const fixtureBytes=await fs.readFile(fixturePath);assert.equal(sha(fixtureBytes),'6752b21d35aa8291eb1f7a275af249f80960e1d05b6ae3df53cb40bbc9a2e558');fileBindings[fixturePath]=sha(fixtureBytes);
const saved=JSON.parse(fixtureBytes).evidence;
const fromSaved=q=>({level:q.level,constructionAccounting:q.plan.constructionAccounting,prefixDrags:[{blockId:'r',path:[],exitSide:'top'}],iceDeclaration:q.plan.iceDeclaration});
const good=saved.find(e=>e.name==='actual-full-iced-U-and-original-ice-L').result;
const indexFixture=()=>{const plan={blueprints:RECIPES},attempts=RECIPES.map((b,i)=>({index:i,recipeId:b.recipeId,enteredColourCsp:true})),q=auditEarlyPrefixQuotas(plan,attempts);
 return{plan,index:{status:'EARLY_PREFIX_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',closedMacroActualInputs:58,closedMacroExperimentExtended:false,maximumSeparateExperimentInputs:4,
  fixedColourInputs:4,separateExperimentActualInputs:4,stocksEnteringColourCspIncludingFailed:4,eligibleInputs:0,candidates:[],attempts,
  perRecipeColourCspInputs:q.cspCounts,perRecipeStaticAttempts:q.staticCounts,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false}};};

test('new static status and independent per-recipe CSP quota reject the old experiment and fictitious counts',()=>{
 const {plan,index}=indexFixture();assertEarlyPrefixStaticMetadata(index,plan);
 for(const mutate of [x=>x.status='EARLY_FROZEN_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',x=>x.fixedColourInputs=3,x=>x.perRecipeColourCspInputs[RECIPES[0].recipeId]=0,x=>x.publicLedgerClaims=1]){
  const q=structuredClone(index);mutate(q);assert.throws(()=>assertEarlyPrefixStaticMetadata(q,plan));}
 evidence.push({name:'new-static-status-quota',passed:true});
});

test('new completed mathematics status remains distinct from static completion and old joint completion',()=>{
 const {index}=indexFixture(),c={status:'FINITE_EARLY_PREFIX_TAIL_BATCH_FINISHED',results:[],separateExperimentActualInputs:4,oldMacroActualInputs:58,
  selectedCandidatesAdded:0,selectionIndexUnchanged:true,catalogEligible:false,formalReady:false};assertEarlyPrefixActualMetadata(c,index);
 for(const status of ['FINITE_EARLY_FROZEN_FIRST_JOINT_BATCH_FINISHED',index.status,'PENDING'])assert.throws(()=>assertEarlyPrefixActualMetadata({...c,status},index));
 assert.throws(()=>assertEarlyPrefixActualMetadata({...c,selectedCandidatesAdded:1},index));evidence.push({name:'new-actual-status-no-admission',passed:true});
});

test('saved real private success, unknown tail and below-floor U all retain their original distinct outcomes',()=>{
 const cases=[good,saved.find(e=>e.name==='shared-10000-and-preclaim-reserve-boundary').result,saved.find(e=>e.name==='actual-short-U-no-lower-or-floor-retry').result];
 for(const q of cases)assertEarlyPrefixReceiptAccounting(q,fromSaved(q));
 assert(cases[0].accepted);assert(!cases[1].accepted);assert.equal(cases[1].upperAccounting.conservativeFullBoardStateUpperBound,10000);
 assert(!cases[2].accepted);assert.equal(cases[2].lowerSearchCalls,0);assert.equal(cases[2].L,null);
 evidence.push({name:'three-real-private-outcomes',passed:true,statuses:cases.map(q=>q.status),reusedEvidenceOnly:true});
});

test('shared prefix counts, raw aliases, tail budget, original-ice lower identity and terminal guard cannot be forged',()=>{
 const mutations=[q=>q.upperAccounting.conservativeFullBoardStateUpperBound--,q=>q.upperAccounting.icedBridgePrefixWorlds--,
  q=>q.upperConstruction.tailSearch.rawFullBoardStates--,q=>q.upperConstruction.tailSearch.budget.maxStates++,
  q=>q.upperConstruction.tailSearch.sourceLevelSha256=q.levelSha256,q=>q.proof.sourceLevelSha256=q.plan.plainLevelSha256,
  q=>q.proof.guardAllowance.unregisteredTerminalWorldAllowance=0,q=>q.plan.bridgeTransitions--,
  q=>q.lowerSearchCalls=0,q=>q.upperAccounting.elapsedMilliseconds=q.plan.fullUpperBudget.maxMilliseconds];
 for(const change of mutations){const q=structuredClone(good);change(q);assert.throws(()=>assertEarlyPrefixReceiptAccounting(q,fromSaved(q)));}
 evidence.push({name:'count-and-same-original-object-negative-controls',passed:true,mutations:mutations.length});
});

test('preview copy changes only its own identity and adds the new static status',async()=>{
 const old=await fs.readFile('tools/daily-challenge/formal-v4/preview-finite-static.mjs','utf8'),next=await fs.readFile('tools/daily-challenge/formal-v4/preview-early-prefix-static.mjs','utf8');
 assert.equal(next,old.replaceAll('preview-finite-static','preview-early-prefix-static').replace("'INDEPENDENT_EARLY_FROZEN_STATIC_PASS']","'INDEPENDENT_EARLY_FROZEN_STATIC_PASS','INDEPENDENT_EARLY_PREFIX_STATIC_PASS']"));
 evidence.push({name:'preview-render-and-storage-logic-unchanged',passed:true});
});

test.after(async()=>{
 const compiled=await build({entryPoints:['tools/daily-challenge/formal-v4/early-prefix-audit-adapters.test.mjs','tools/daily-challenge/formal-v4/preview-early-prefix-static.mjs'],bundle:true,packages:'external',outdir:'unused',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const f of Object.keys(compiled.metafile.inputs)){const p=f.replaceAll('\\','/');fileBindings[p]=sha(await fs.readFile(p));}
 const after=await names();assert.deepEqual(after,before);
 const report={status:evidence.length===5?'EARLY_PREFIX_AUDIT_ADAPTERS_PRIVATE_PASS':'INCOMPLETE',evidence,fileBindings,errors:[],testsPassed:evidence.length,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,newSearches:0,newLedgerClaims:0,newRealConstructions:0,actualAuditCalls:0,
  storedPrivateReceiptsReadOnly:true,formalReady:false};
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

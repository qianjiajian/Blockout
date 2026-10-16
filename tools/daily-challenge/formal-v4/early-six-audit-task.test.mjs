import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {assertEarlyPrefixStaticMetadata,auditEarlySixExecutionObservation} from './audit-early-six-static-task.mjs';
import {assertEarlyPrefixActualMetadata,assertEarlyPrefixReceiptAccounting} from './audit-early-six-actual-task.mjs';
import {RECIPES,auditEarlyPrefixQuotas} from './early-six-task-contract.mjs';
import {PUBLIC_LEDGER} from './native-batch-io.mjs';

const out=process.env.EARLY_SIX_AUDIT_TEST_OUT;assert(out,'A new private qualification directory is required');
await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),fileBindings={},evidence=[];
const names=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),before=await names();
const fixturePath='deliverables/daily-formal-v4-20261008/proof/early-frozen-prefix-tail-task-private-02/report.json';
const fixtureBytes=await fs.readFile(fixturePath);assert.equal(sha(fixtureBytes),'ac26451fa76658c705eec87dba2ec3e13cc25ef71b0383960cead04a63b43df3');fileBindings[fixturePath]=sha(fixtureBytes);
const saved=JSON.parse(fixtureBytes).evidence;
const fromSaved=q=>({level:q.level,constructionAccounting:q.plan.constructionAccounting,prefixDrags:[{blockId:'r',path:[],exitSide:'top'}],iceDeclaration:q.plan.iceDeclaration});
const good=saved.find(e=>e.name==='actual-full-iced-U-and-original-ice-L').result;
const indexFixture=()=>{const plan={blueprints:RECIPES},attempts=RECIPES.map((b,i)=>({index:i,recipeId:b.recipeId,enteredColourCsp:true})),q=auditEarlyPrefixQuotas(plan,attempts);
 return{plan,index:{status:'EARLY_SIX_TASK_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',closedCampaignsExtended:false,maximumSeparateExperimentInputs:6,
  fixedColourInputs:6,separateExperimentActualInputs:6,stocksEnteringColourCspIncludingFailed:6,eligibleInputs:0,candidates:[],attempts,
  perRecipeColourCspInputs:q.cspCounts,perRecipeStaticAttempts:q.staticCounts,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false}};};

test('new static status and independent per-recipe CSP quota reject the old experiment and fictitious counts',()=>{
 const {plan,index}=indexFixture();assertEarlyPrefixStaticMetadata(index,plan);
 for(const mutate of [x=>x.status='EARLY_FROZEN_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',x=>x.fixedColourInputs=3,x=>x.perRecipeColourCspInputs[RECIPES[0].recipeId]=0,x=>x.publicLedgerClaims=1]){
  const q=structuredClone(index);mutate(q);assert.throws(()=>assertEarlyPrefixStaticMetadata(q,plan));}
 evidence.push({name:'new-static-status-quota',passed:true});
});

test('new completed mathematics status remains distinct from static completion and old joint completion',()=>{
 const {index}=indexFixture(),c={status:'FINITE_EARLY_PREFIX_TAIL_BATCH_FINISHED',results:[],separateExperimentActualInputs:6,closedCampaignsExtended:false,
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

test('extra prefix clears are accepted only with all ice thawed and an identical complete cut snapshot',async()=>{
 const q=saved.find(e=>e.name==='extra-clear-events-exact-all-thawed-stock-and-U').result;
 const inputBytes=await fs.readFile(q.plan.constructionEvidence.path);assert.equal(sha(inputBytes),q.plan.constructionEvidence.sha256);fileBindings[q.plan.constructionEvidence.path]=sha(inputBytes);
 const input=JSON.parse(inputBytes);assertEarlyPrefixReceiptAccounting(q,input);assert.equal(q.bridge.cleared,3);assert.equal(input.iceDeclaration.count,2);
 for(const mutate of [x=>x.bridge.cleared=1,x=>x.bridge.allSurvivingIceZero=false,x=>x.bridge.plainCutSha256='0'.repeat(64)]){
  const bad=structuredClone(q);mutate(bad);assert.throws(()=>assertEarlyPrefixReceiptAccounting(bad,input));}
 evidence.push({name:'greater-clear-count-with-exact-thaw-and-cut',passed:true});
});

test('execution policy observations bind reviewed archives, with wrong identity and mutable manifest aliases rejected',async()=>{
 const bound=async d=>JSON.parse(await bytes(d.path,d.sha256));
 const bytes=async(f,h)=>{const b=await fs.readFile(f);assert.equal(sha(b),h);fileBindings[f]=h;return b;};
 const checkBindings=async map=>{for(const[f,h]of Object.entries(map))await bytes(f,h);};
 const io={bound,bytes,checkBindings},observation=good.executionPolicyObservation,env=good.plan.executionEnvironment;
 await auditEarlySixExecutionObservation(observation,env,io);
 for(const mutate of [x=>x.observedCurrentPolicy.activeVersion='1.1.0',x=>x.observedCurrentPolicy.manifest.sha256='0'.repeat(64),
  x=>x.reviewBindings[x.observedCurrentPolicy.manifest.path]=x.observedCurrentPolicy.manifest.sha256]){
  const bad=structuredClone(observation);mutate(bad);await assert.rejects(()=>auditEarlySixExecutionObservation(bad,env,io));}
 evidence.push({name:'separate-immutable-execution-observation',passed:true});
});

test.after(async()=>{
 const compiled=await build({entryPoints:['tools/daily-challenge/formal-v4/early-six-audit-task.test.mjs'],bundle:true,packages:'external',outdir:'unused',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const f of Object.keys(compiled.metafile.inputs)){const p=f.replaceAll('\\','/');fileBindings[p]=sha(await fs.readFile(p));}
 const after=await names();assert.deepEqual(after,before);
 const report={status:evidence.length===6?'EARLY_SIX_AUDIT_TASK_PRIVATE_PASS':'INCOMPLETE',evidence,fileBindings,errors:[],testsPassed:evidence.length,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,newSearches:0,newLedgerClaims:0,newRealConstructions:0,actualAuditCalls:0,
  storedPrivateReceiptsReadOnly:true,formalReady:false};
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

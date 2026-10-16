import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {constructEarlyPrefixStock} from './early-six-task-factory.mjs';
import {recordFormedEarlySourceInput} from './construct-early-six-task.mjs';
import {makeEarlyPrefixBlueprint,formedStockImages} from './prepare-early-six-task.mjs';
import {EARLY_EXPERIMENT_ID,EARLY_CONSTRUCTION_VERSION,RECIPES,STATIC_SLOT,UPPER_BUDGET,LOWER_BUDGET,MATH_ENTRY_PATH,FUTURE_FILES,PROPOSAL_SHA,
 assertEarlyConstructionPlan,auditEarlyPrefixQuotas,recordEarlyColourAttempt,claimEarlyConstruction,finishEarlyConstruction,HISTORY_ROOTS,
 historyAllowsStock,physicalPartition,physicalRetry,realShapeColourChange} from './early-six-task-contract.mjs';
import {makeEarlyFrozenPrefixTailPlan} from './early-frozen-prefix-tail-task.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sha,write,PUBLIC_LEDGER,readBound} from './native-batch-io.mjs';
const out=process.env.EARLY_SIX_TASK_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),evidence=[],before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const proposalFile='deliverables/daily-formal-v4-20261008/design/multisource-early-six-proposal-01/proposal.json',proposal=JSON.parse(await fs.readFile(proposalFile));
const fixturePath='deliverables/daily-formal-v4-20261008/proof/early-frozen-constructor-toy-probe-01/result.json',bp=JSON.parse(await fs.readFile(fixturePath)).blueprint;
let successful;

test('fixed recipes bind actual complete reference routes and correct basic metadata without a new stock',async()=>{
 const blueprints=[];for(const [i,r]of proposal.recipes.entries()){const q=await readBound(r.reference);blueprints.push(makeEarlyPrefixBlueprint(rt,q,r,RECIPES[i],{sourceLevelId:r.sourceLevelId,attemptId:r.failedParent.id,lineage:{noSourceInferenceFromBodyIds:true,scope:'declared-source-branch-descendants-only'}}));}
 const bindings=Object.fromEntries(await Promise.all(FUTURE_FILES.map(async p=>[p,sha(await fs.readFile(p))])));
 const plan={version:EARLY_CONSTRUCTION_VERSION,experimentId:EARLY_EXPERIMENT_ID,qualificationOnly:false,maximumStocksEnteringColourCspIncludingFailed:6,maximumStaticPartitionAttempts:1800,
  proposal:{path:proposalFile,sha256:PROPOSAL_SHA},bindings,closedCampaignsExtended:false,selectedCount:153,selected:Array(153).fill({}),staticSlot:STATIC_SLOT,accountingScope:'per-physical-stock',
  futureStrategy:'one-thawed-prefix-plain-tail-original-ice-lower',futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,mathEntry:{path:MATH_ENTRY_PATH,sha256:bindings[MATH_ENTRY_PATH]},
  sequence:{step:3571,bodyCountDeltas:[0]},blueprints,slotAssigned:false,formalReady:false};
 assertEarlyConstructionPlan(plan);
 for(const change of [p=>p.staticSlot.formalId=880000,p=>delete p.staticSlot.slot,p=>p.blueprints[0].maximumStocks=2,p=>p.blueprints[1].maximumStaticPartitionAttempts=301,
  p=>p.blueprints[0].failedParent.attemptId='old-parent',p=>p.futureUpperBudget.maxStates=10001,p=>p.futureLowerBudget.maxMilliseconds=120000]){
  const altered=structuredClone(plan);change(altered);assert.throws(()=>assertEarlyConstructionPlan(altered));}
 await write(out+'/reference-metadata.json',{blueprints,privatePlanSchemaFixture:true,mathematicalProofNotCreated:true});
 evidence.push({name:'actual-reference-prefix-region-and-fixed-contract',passed:true,recipes:6,realNewStocks:0});
});

test('thin adapter uses the old charged factory once and establishes exact thaw bridge on a private stock',async()=>{
 const b=constructEarlyPrefixStock(rt,bp,{seed:1,bodyCountDelta:3,qualificationOnly:true});assert(b.ok,JSON.stringify({status:b.status,reason:b.reason}));successful=b;
 assert.equal(b.constructionAccounting.completeWorldReservations,3);assert.equal(b.plain.constructionAccounting.completeWorldReservations,2);
 assert.deepEqual(b.level.gates,bp.level.gates);assert.deepEqual(b.plain.level.gates,bp.level.gates);assert.equal(b.thawedPrefixBridge.valid,true);
 assert.equal(b.thawedPrefixBridge.icedCutSha256,b.thawedPrefixBridge.plainCutSha256);assert.equal(b.newSearches,0);assert.equal(b.U,null);assert.equal(b.L,null);
 const plainFile=out+'/plain.json';await write(plainFile,b.plain);b.plainConstructionEvidence={path:plainFile,sha256:sha(await fs.readFile(plainFile))};
 const icedFile=out+'/iced.json';await write(icedFile,b);const candidate={...b,constructionEvidence:{path:icedFile,sha256:sha(await fs.readFile(icedFile))}};
 const plan=makeEarlyFrozenPrefixTailPlan(rt,candidate,{qualificationOnly:true,floor:1,searchUpper:8});
 assert.equal(plan.innerPlan.tailBudget.maxStates,9992);assert.equal(plan.lowerBudget.maxStates,9999);
 assert.equal(plan.fullUpperBudget.maxStates,10000);assert.equal(plan.alternativeSearchAllowed,false);
 evidence.push({name:'charged-plain-ice-bridge-to-frozen-math-plan',passed:true,worlds:3,tailRegisteredCap:9992,newSolverCalls:0});
});

test('failed colours consume exactly one recipe quota, while static failures stop at 300',()=>{
 const p={blueprints:RECIPES},a=RECIPES.map(r=>({recipeId:r.recipeId,enteredColourCsp:true})),q=auditEarlyPrefixQuotas(p,a);
 assert.equal(q.total,6);assert.throws(()=>auditEarlyPrefixQuotas(p,[...a,a[0]]),/CSP budget/);
 assert.throws(()=>auditEarlyPrefixQuotas(p,[{recipeId:'unknown',enteredColourCsp:false}]),/Unknown recipe/);
 const full=Array.from({length:300},()=>({recipeId:RECIPES[0].recipeId,enteredColourCsp:false}));assert.equal(auditEarlyPrefixQuotas(p,full).total,0);
 assert.throws(()=>auditEarlyPrefixQuotas(p,[...full,full[0]]),/static budget/);
 const m=new Map();assert(recordEarlyColourAttempt(m,RECIPES[0],{paint:{ok:false},enteredColourCsp:true}));assert.throws(()=>recordEarlyColourAttempt(m,RECIPES[0],{paint:{ok:false},enteredColourCsp:true}));
 evidence.push({name:'per-recipe300-total1800-and-failed-csp-one-of-six',passed:true});
});

test('all three formed images including post-paint failures remain excluded and require both shape and colour change',()=>{
 const b=constructEarlyPrefixStock(rt,{...bp,iceCount:2},{seed:1,bodyCountDelta:3,qualificationOnly:true});assert.equal(b.ok,false);assert(b.plain&&b.paint.ok&&b.level);
 const images=formedStockImages(b);assert.equal(images.length,3);
 const history=new Map();recordFormedEarlySourceInput(history,bp.sourceLevelId,b);const f=history.get(bp.sourceLevelId)[0];
 assert(!realShapeColourChange(f,{...f,shapeSha256:'changed'}));assert(!realShapeColourChange(f,{...f,colorSha256:'changed'}));
 const physical=designFingerprints(successful.level);
 assert(!historyAllowsStock(successful.level,physical,{partitions:new Set(images.map(physicalPartition))}));
 assert(!historyAllowsStock(successful.level,physical,{retryIdentities:new Set([physicalRetry(physical)])}));
 assert(historyAllowsStock(successful.level,physical,{unrelatedShapeInventories:new Set([physical.shapeSha256])}));
 evidence.push({name:'placeholder-plain-ice-failure-history-and-real-double-redesign',passed:true});
});

test('no final ice is formed when the same per-stock cap cannot reserve it',()=>{
 const b=constructEarlyPrefixStock(rt,bp,{seed:1,bodyCountDelta:3,qualificationOnly:true,meterLimits:{maxWorlds:2}});
 assert.equal(b.ok,false);assert.equal(b.enteredColourCsp,false);assert.equal(b.constructionAccounting.completeWorldReservations,1);assert.equal(b.level,null);
 evidence.push({name:'private-static-full-world-reserve-boundary',passed:true});
});

test('experiment lock is independent of plan metadata or output label and records terminal failure',async()=>{
 const f=out+'/lock-plan.json';await write(f,{experimentId:EARLY_EXPERIMENT_ID,label:'one'});const d={path:f,sha256:sha(await fs.readFile(f))},ledgerDirectory=out+'/private-ledger';
 const c=await claimEarlyConstruction(d,out+'/candidate-dir-a',{qualificationOnly:true,ledgerDirectory});await finishEarlyConstruction(c,{status:'PRIVATE_FAILURE_TERMINAL',constructionFiles:[],stocksEnteringColourCspIncludingFailed:1});
 const other=out+'/lock-plan-other.json';await write(other,{experimentId:EARLY_EXPERIMENT_ID,label:'two'});
 const renamed={path:other,sha256:sha(await fs.readFile(other))};
 await assert.rejects(()=>claimEarlyConstruction(renamed,out+'/candidate-dir-b',{qualificationOnly:true,ledgerDirectory}),/EEXIST/);
 const result=JSON.parse(await fs.readFile(c.resultFile));assert.equal(result.status,'PRIVATE_FAILURE_TERMINAL');assert.equal(result.retryAllowed,undefined);
 assert.equal((await fs.readdir(ledgerDirectory)).filter(n=>n.endsWith('.claim.json')).length,1);
 evidence.push({name:'experiment-wx-terminal-no-relabel-restart',passed:true});
});

test('private locks reject all seven public roots and their current-root junction descendants',async()=>{
 const f=out+'/lock-plan.json',d={path:f,sha256:sha(await fs.readFile(f))},env=JSON.parse(await fs.readFile('snapshot-environment.json'));
 for(const root of HISTORY_ROOTS)for(const dir of [root,path.join(env.sourceWorkspace,root,'must-not-create-private')])
  await assert.rejects(()=>claimEarlyConstruction(d,out+'/bad',{qualificationOnly:true,ledgerDirectory:dir}),/Private early-prefix/);
 evidence.push({name:'seven-shared-roots-and-junction-namespace',passed:true});
});

test.after(async()=>{
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();const concurrentPublicAdditions=after.filter(n=>!before.includes(n));
 // Parent may run real low20 mathematics concurrently. This private suite never calls mathematical explore or a public claim.
 const entries=['early-six-task.test.mjs','prepare-early-six-task.mjs','construct-early-six-task.mjs','run-early-six-task.mjs'].map(f=>'tools/daily-challenge/formal-v4/'+f);
 const compiled=await build({entryPoints:entries,bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'}),fileBindings={...rt.toolchainBindings};
 for(const f of [proposalFile,fixturePath,...Object.keys(compiled.metafile.inputs)])fileBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 await write(out+'/report.json',{status:evidence.length===7?'EARLY_SIX_TASK_PRIVATE_PASS':'EARLY_SIX_TASK_PRIVATE_INCOMPLETE',evidence,fileBindings,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,concurrentPublicAdditions,newRealConstructions:0,newSearches:0,publicClaimsStarted:0,
  privateStockConstructions:3,actualOldReferenceReplays:12,newActualPreparationCalls:0,qualificationOnly:true,formalReady:false});
});

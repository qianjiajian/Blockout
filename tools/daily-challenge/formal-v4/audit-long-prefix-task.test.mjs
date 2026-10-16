import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertLongPrefixAccounting,replayLongPrefix,assertLongPrefixProposalBinding,assertLongPrefixStockHistory,auditLongPrefixExecutionObservation} from './audit-long-prefix-task.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {UPPER_BUDGET,LOWER_BUDGET} from './long-prefix-batch-task.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {loadV4Runtime} from './runtime.mjs';
import {sha} from './native-batch-io.mjs';

// Only clone a historical private receipt. No constructor or solver runs here.
const fixture='deliverables/daily-formal-v4-20261008/proof/prefix-tail-task-private-01/report.json';
const originalBytes=await fs.readFile(fixture),original=JSON.parse(originalBytes);
const base=original.evidence.find(e=>e.result?.upperConstruction?.tailSearch)?.result;assert(base);
const drags=base.upperConstruction.drags.slice(0,base.upperConstruction.prefixAudits.length),evidence=[];
function control(){const q=structuredClone(base),p=q.plan,u=q.upperConstruction,t=u.tailSearch,prior=p.constructionAccounting;
 p.fullUpperBudget={...p.fullUpperBudget,...UPPER_BUDGET};p.lowerBudget={...p.lowerBudget,...LOWER_BUDGET};p.floor=31;
 p.innerPlan.floor=31;p.innerPlan.tailStrategy='plain-joint';p.innerPlan.searchUpper=128;u.plan=structuredClone(p.innerPlan);q.upperAccounting.maximum=10000;
 t.budget={...t.budget,...LOWER_BUDGET,maxStates:10000-prior.completeWorldReservations-drags.length-2,
  maxTransitions:10000000-prior.transitions-u.prefixTransitions,maxMicroStates:3000000-prior.microStates,maxMilliseconds:30000-prior.elapsedMilliseconds-u.elapsedMilliseconds};
 t.guardAllowance=guardAllowanceFor(t);return q;}
test('shared raw sum and exact terminal allowance reject copied accounting tampering',()=>{
 const q=control();assertLongPrefixAccounting(q,drags);
 for(const edit of [x=>x.upperAccounting.terminalAllowance=0,x=>x.upperAccounting.conservativeFullBoardStateUpperBound--,
  x=>x.plan.constructionAccounting.completeWorldReservations++,x=>x.upperConstruction.tailSearch.rawFullBoardStates=10001]){
  const bad=structuredClone(q);edit(bad);assert.throws(()=>assertLongPrefixAccounting(bad,drags));}
 evidence.push({test:'prior-prefix-tail-terminal-raw-bound',passed:true});
});
test('tail time, transitions and micro cannot borrow another budget or undercount prefix',()=>{
 const q=control();for(const edit of [x=>x.upperConstruction.tailSearch.elapsedMilliseconds=x.upperConstruction.tailSearch.budget.maxMilliseconds,
  x=>x.upperConstruction.tailSearch.elapsedMilliseconds=x.upperConstruction.elapsedMilliseconds+1,
  x=>{x.upperConstruction.prefixTransitions--;x.upperConstruction.tailSearch.budget.maxTransitions++;},
  x=>x.upperConstruction.tailSearch.microDiscoveredStates=x.upperConstruction.tailSearch.budget.maxMicroStates+1,
  x=>x.plan.lowerBudget.maxStates=10000]){const bad=structuredClone(q);edit(bad);assert.throws(()=>assertLongPrefixAccounting(bad,drags));}
 evidence.push({test:'own-time-prefix-transition-micro-and-lower-cap',passed:true});
});
test('supplied prefix replays real first-contact and an independent model without searching',async()=>{
 const rt=await loadV4Runtime(),q=control(),good=replayLongPrefix(rt,q.level,drags);assert.equal(good.audits.length,drags.length);
 assert.equal(good.tail.blocks.length,q.level.blocks.length-good.independent.clearEvents);
 const bad=structuredClone(drags);bad[0].path=[[99,99]];assert.throws(()=>replayLongPrefix(rt,q.level,bad));
 assert.equal(sha(await fs.readFile(fixture)),sha(originalBytes));
 evidence.push({test:'provided-prefix-two-model-and-illegal-unit-negative',passed:true});
});
test('proposal binds every seed, delta, branch, quota, prefix and unordered region',async()=>{
 const proposal=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/design/plain-long-prefix-four-proposal-02/proposal.json'));
 const d={path:'private-proposal',sha256:'a'.repeat(64)},review={status:'INDEPENDENT_LONG_PREFIX_PROPOSAL_PASS',proposal:d,errors:[],newSearches:0,newConstructions:0};
 const p={proposal:d,maximumInputs:proposal.recipes.length,maximumStaticPartitionAttempts:proposal.finiteExperiment.maximumStaticPartitionAttempts,
  blueprints:proposal.recipes.map(spec=>{const ref=proposal.references.find(x=>x.referenceId===spec.referenceId);return{...spec,maximumStocks:1,reference:ref.reference,
   referenceLevelSha256:ref.referenceLevelSha256,referenceRouteSha256:ref.referenceRouteSha256,level:ref.originalLevel,prefixDrags:ref.prefix.drags,
   region:{cells:[...ref.region.cells].reverse(),bodyIds:ref.changedBodyIds},fixedBlocks:ref.fixedBlocks,allReferenceGates:ref.fixedGates};})};
 assertLongPrefixProposalBinding(p,proposal,review);
 for(const key of ['seed','colourSeed','bodyCountDelta','maximumStaticPartitionAttempts','maximumStocks','branchId']){const bad=structuredClone(p);bad.blueprints[0][key]+=(typeof bad.blueprints[0][key]==='string'?'changed':1);assert.throws(()=>assertLongPrefixProposalBinding(bad,proposal,review));}
 const bad=structuredClone(p);bad.blueprints[0].region.cells[0]=bad.blueprints[0].region.cells[1];assert.throws(()=>assertLongPrefixProposalBinding(bad,proposal,review));
 assert.throws(()=>assertLongPrefixProposalBinding(p,proposal,{...review,proposal:{...d,sha256:'b'.repeat(64)}}));
 evidence.push({test:'proposal-seed-quota-branch-prefix-region-and-subject-binding',passed:true});
});
test('placeholder-only old shape blocks a later differently positioned complete stock before CSP',()=>{
 const level=structuredClone(base.level),f=designFingerprints(level),old=structuredClone(level);old.blocks[0].x++;
 assert.notEqual(levelSha256(old),levelSha256(level));assert.equal(designFingerprints(old).shapeSha256,f.shapeSha256);
 const built={placeholderWorld:level,stockFingerprints:f,enteredColourCsp:true},options={parent:{shapeSha256:'parent'},reference:{shapeSha256:'reference'},previousShapes:[]};
 assert.equal(assertLongPrefixStockHistory(built,options),f.shapeSha256);
 assert.throws(()=>assertLongPrefixStockHistory(built,{...options,previousShapes:[designFingerprints(old).shapeSha256]}));
 assert.equal(assertLongPrefixStockHistory({...built,enteredColourCsp:false},{...options,previousShapes:[f.shapeSha256]}),f.shapeSha256,'The recorded pre-CSP rejection remains legitimate');
 evidence.push({test:'placeholder-shape-history-independent-of-position-and-colour',passed:true});
});
test('recorded scope observation binds archive and refuses mutable policy and forged lock',async()=>{
 const environment=base.plan.executionEnvironment,observation=base.executionPolicyObservation;
 const r={bound:async d=>{const raw=await fs.readFile(d.path);assert.equal(sha(raw),d.sha256);return JSON.parse(raw);},
  bytes:async(f,h)=>{const raw=await fs.readFile(f);assert.equal(sha(raw),h);return raw;},map:async m=>{for(const[f,h]of Object.entries(m))assert.equal(sha(await fs.readFile(f)),h);}};
 await auditLongPrefixExecutionObservation(r,observation,environment);
 const bad=structuredClone(observation);bad.observedCurrentPolicy.ruleLock.verified++;await assert.rejects(()=>auditLongPrefixExecutionObservation(r,bad,environment));
 const mutable=structuredClone(observation);mutable.reviewBindings[mutable.observedCurrentPolicy.manifest.path]=mutable.observedCurrentPolicy.manifest.sha256;
 await assert.rejects(()=>auditLongPrefixExecutionObservation(r,mutable,environment));
 evidence.push({test:'recorded-scope-archive-lock-and-mutable-binding-negative',passed:true});
});
test.after(async()=>{const out=process.env.LONG_PREFIX_AUDIT_TEST_OUT;if(!out)return;await fs.mkdir(out,{recursive:false});
 const files=['tools/daily-challenge/formal-v4/audit-long-prefix-task.mjs','tools/daily-challenge/formal-v4/audit-long-prefix-task.test.mjs',fixture];
 const fileBindings=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await fs.readFile(f))])));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===6?'LONG_PREFIX_AUDITOR_PRIVATE_PASS':'INCOMPLETE',evidence,fileBindings,
  newSearches:0,newConstructions:0,newLedgerClaims:0,qualificationOnly:true,actualBatchAudited:false},null,2)+'\n',{flag:'wx'});
});

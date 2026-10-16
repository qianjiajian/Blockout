import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,after} from 'node:test';
import {assertActualAdvancedEntryBudget,FROZEN_ADVANCED_ENTRY_DEFAULT_BUDGET} from './audit-low-band-advanced-batch-actual-independent-v2.mjs';
const input='deliverables/daily-formal-v4-20261008/selection/low-band-thirtytwo-advanced-01';
const out=process.env.ADVANCED_ACTUAL_V2_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),fileBindings={},evidence=[];
const read=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return JSON.parse(b);};
const plan=await read(input+'/plan.json'),a=await read(input+'/01-daily-mechanisms-key-lock-59-d1-10.json'),b=await read(input+'/02-daily-mechanisms-axis-block-50-d2-05.json');
const check=(name,fn)=>test(name,()=>{try{fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.stack});throw e;}});
check('actual unchanged entry defaults are explicitly narrower than unpassed outer runner allowance',()=>{
 for(const q of [a,b]){const r=assertActualAdvancedEntryBudget(plan,q);assert.deepEqual(r.actualEntryDefaults,FROZEN_ADVANCED_ENTRY_DEFAULT_BUDGET);assert(r.outerWiderButNotPassedToEntry);assert.equal(r.actualEntryDefaults.maxMilliseconds,5000);}
});
check('larger actual budget or a smaller declared outer allowance rejects',()=>{
 const q=structuredClone(a);q.finalProofPlan.lowerBudget.maxTransitions=1000001;assert.throws(()=>assertActualAdvancedEntryBudget(plan,q));
 const p=structuredClone(plan);p.proofOptions.lowerBudget.maxMilliseconds=4999;assert.throws(()=>assertActualAdvancedEntryBudget(p,a));
 const z=structuredClone(a);z.mathematicalProof.attemptPlan.lowerBudget.maxStates=10000;assert.throws(()=>assertActualAdvancedEntryBudget(plan,z));
});
check('actual lower counters and accepted elapsed cannot exceed real defaults even inside the outer allowance',()=>{
 for(const [field,value]of [['attemptedTransitions',1000001],['microDiscoveredStates',500001],['elapsedMilliseconds',5000]]){
  const q=structuredClone(a);q.lowerBound.result[field]=value;q.mathematicalProof.lowerBound.result[field]=value;
  assert.throws(()=>assertActualAdvancedEntryBudget(plan,q));
 }
});
check('substituting provided route or final lower rejects without a solver invocation',()=>{
 const q=structuredClone(a);q.drags[0].blockId='changed-body';assert.throws(()=>assertActualAdvancedEntryBudget(plan,q));
 const r=structuredClone(a);r.mathematicalProof.lowerBound=structuredClone(b.lowerBound);assert.throws(()=>assertActualAdvancedEntryBudget(plan,r));
 const s=structuredClone(a);s.lowerBound=structuredClone(b.lowerBound);s.mathematicalProof.lowerBound=structuredClone(b.lowerBound);assert.throws(()=>assertActualAdvancedEntryBudget(plan,s));
});
after(async()=>{
 for(const p of ['tools/daily-challenge/formal-v4/audit-low-band-advanced-batch-actual-independent-v2.mjs','tools/daily-challenge/formal-v4/audit-low-band-advanced-batch-actual-v2.test.mjs'])fileBindings[p]=sha(await fs.readFile(p));
 await fs.writeFile(out+'/report.json',JSON.stringify({status:evidence.length===4&&evidence.every(e=>e.passed)?'ADVANCED_ACTUAL_DEFAULT_BUDGET_V2_PRIVATE_PASS':'FAIL',evidence,fileBindings,
  privateMetadataClonesOnly:true,newActualResultAudits:0,newSearches:0,newConstructions:0,newLedgerClaims:0,newPublicClaims:0,oldEvidenceModified:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});

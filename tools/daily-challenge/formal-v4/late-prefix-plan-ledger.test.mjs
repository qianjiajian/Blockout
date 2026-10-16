import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {claimLatePrefixPlan,finishLatePrefixPlan} from './late-prefix-plan-ledger.mjs';
const out=process.env.LATE_PLAN_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/late-plan-ledger-');
await fs.mkdir(out,{recursive:true});const bytes='{"qualificationOnly":true,"noStock":true}\n';
const file=`${out}/fixture-plan.json`;await fs.writeFile(file,bytes,{flag:'wx'});const descriptor={path:file,sha256:createHash('sha256').update(bytes).digest('hex')};
test('same fixed plan cannot restart at a different output or after terminal failure',async()=>{
 const options={qualificationOnly:true,ledgerDirectory:`${out}/private-ledger`};
 const claim=await claimLatePrefixPlan(descriptor,`${out}/first`,options);
 await assert.rejects(()=>claimLatePrefixPlan(descriptor,`${out}/second`,options),/EEXIST/);
 await finishLatePrefixPlan(claim,{status:'SYNTHETIC_TERMINAL_FAILURE',actualNewStockCalls:0});
 await assert.rejects(()=>claimLatePrefixPlan(descriptor,`${out}/third`,options),/EEXIST/);
});
test('path-only, wrong bytes and private qualification with public namespace are rejected',async()=>{
 await assert.rejects(()=>claimLatePrefixPlan(file,`${out}/bad`));
 await assert.rejects(()=>claimLatePrefixPlan({...descriptor,sha256:'0'.repeat(64)},`${out}/bad`));
 await assert.rejects(()=>claimLatePrefixPlan(descriptor,`${out}/bad`,{qualificationOnly:true}),/Private qualification/);
 await assert.rejects(()=>claimLatePrefixPlan(descriptor,`${out}/bad`,{ledgerDirectory:`${out}/private`}),/share one ledger/);
});

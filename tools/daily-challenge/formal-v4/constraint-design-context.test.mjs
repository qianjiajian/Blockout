import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {prepareConstraintDesignContext,CONSTRAINT_SEED139} from './constraint-design-context.mjs';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p));
const out=process.env.CONSTRAINT_CONTEXT_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/constraint-context-');
await fs.mkdir(out,{recursive:true});const runtime=await loadV4CatalogRuntime(),seed=await read(CONSTRAINT_SEED139.path),selected=[],fileBindings={};
for(const p of seed.files){const b=await fs.readFile(p);selected.push(JSON.parse(b));fileBindings[p]=sha(b);}
const baseReceipt={path:'deliverables/daily-formal-v3-20261008/design/nearband14-second/candidate-0069.json',sha256:'a89b57a2ede3c449648075173c1ef941b25fe3c86d97f1aafe15dbd88d7cdf8b'},base=await read(baseReceipt.path),
 slot=runtime.slots.find(s=>s.newestMechanism==='key-lock'&&s.difficulty===1&&s.slot===7);
const construction=`${out}/private-sidecar-copies`;await fs.mkdir(construction,{recursive:true});
for(const n of await fs.readdir(CONSTRUCTION_LEDGER))if(n.endsWith('.slot-result.json')){
 const b=await fs.readFile(`${CONSTRUCTION_LEDGER}/${n}`),q=JSON.parse(b);if(q.accepted)await fs.writeFile(`${construction}/${n}`,b,{flag:'wx'});
}
const options={constructionLedgerDirectory:construction,publicLedgerDirectory:PUBLIC_ATTEMPT_LEDGER},evidence=[];
async function put(n,q){const p=`${out}/${n}.json`,b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};}
const context={schemaVersion:4,scope:300,seedIndex:CONSTRAINT_SEED139,files:seed.files,fileBindings,formalReady:false};
test('actual139 context includes separately admitted basic plus every immutable genuine capacity sidecar',async()=>{
 const d=await put('positive-context',context),result=await prepareConstraintDesignContext(runtime,baseReceipt,base,slot,selected,d,options),audit=result.inspect(base.level);
 assert(audit.passed,JSON.stringify(audit.issues));assert.equal(audit.completeSelectedCount,139);assert(audit.independentlyAdmittedBasicVerified);
 assert.equal(audit.selectedComparisons.length,139);assert(audit.selectedComparisons.some(r=>r.formalId==='daily-basic-combined-d3-08'));
 evidence.push({test:'actual139-complete-control',passed:true,audit,bindingCount:Object.keys(result.bindings).length});
});
test('missing basic, stale138 and a forged appendix cannot silently reduce the geometry pool',async()=>{
 await assert.rejects(prepareConstraintDesignContext(runtime,baseReceipt,base,slot,selected,null,options),/descriptor/);
 const files=seed.files.slice(0,138),omit={...context,files,fileBindings:Object.fromEntries(files.map(p=>[p,fileBindings[p]]))};
 await assert.rejects(prepareConstraintDesignContext(runtime,baseReceipt,base,slot,selected.slice(0,138),await put('omit-basic',omit),options),/139 cannot be omitted/);
 const stale={...context,seedIndex:seed.inputSelection};await assert.rejects(prepareConstraintDesignContext(runtime,baseReceipt,base,slot,selected,await put('stale138',stale),options),/latest139/);
 const forged={...selected[0],formalId:slot.formalId},fake=await put('forged-accepted',forged),extra={...context,files:[...context.files,fake.path],fileBindings:{...fileBindings,[fake.path]:fake.sha256}};
 await assert.rejects(prepareConstraintDesignContext(runtime,baseReceipt,base,slot,[...selected,forged],await put('forged-context',extra),options),/sidecar/);
 evidence.push({test:'context-omission-and-forgery-rejected',passed:true});
});
test.after(async()=>{await put('report',{status:evidence.length===2?'PASS':'INCOMPLETE',evidence,executionEnvironment:prefixExecutionEnvironment(runtime),
 currentRuntimeValidationClaimed:false,privateImmutableSidecarCopiesOnly:true,realCandidateConstructionInvocations:0,realCandidateProofInvocations:0,
 publicLedgerWrites:0,formalReady:false,productionChanged:false});});

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,after} from 'node:test';
import {prepareLowBandBatchContext} from './low-band-advanced-batch-context.mjs';
import {inspectAcceptedLowBandLinkage} from './accepted-low-band-batch-base.mjs';
import {assertPlanRowMatchesBase} from './low-band-advanced-batch-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Read-only production evidence plus isolated context metadata. No runtime,
// constructor, solver, ledger writer or production qualifier is invoked.
const out=process.env.LOW_BAND_ADVANCED_INDEPENDENT_OUT;
assert(out,'A new private output directory is required');
await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
const bindings={},evidence=[];
const read=async p=>{const b=await fs.readFile(p);bindings[p]=sha(b);return JSON.parse(b);};
const put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
const planPath='deliverables/daily-formal-v4-20261008/design/low-band-thirtytwo-advanced-plan-01/plan.json';
const plan=await read(planPath),planDescriptor={path:planPath,sha256:bindings[planPath]};
assert.equal(planDescriptor.sha256,'cc3fe2e6a5140f14e09fe2516797e665c1a77628890ce159e213c414449b1faf');
const before=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json'));
function check(name,fn){test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.stack});throw e;}});}

check('production selection context cannot omit any original150 member or substitute matching-count metadata',async()=>{
 const index=await read(plan.inputSelection.path),review=await read(plan.selectionAnchorReview.path);
 assert.equal(index.files.length,150);
 const runtime={slots:plan.rows.map(r=>r.slot)},row=plan.rows[0];
 const variants=[index.files.slice(1),[index.files[1],index.files[0],...index.files.slice(2)]];
 for(const [i,files]of variants.entries()){
  const context={schemaVersion:4,scope:300,files,fileBindings:Object.fromEntries(files.map(p=>[p,review.inputBindings[p]])),formalReady:false};
  const descriptor=await put(path.join(out,`omitted-or-substituted-${i}.json`),context);
  await assert.rejects(prepareLowBandBatchContext(runtime,row.base,{},row.slot,files.map(()=>({})),descriptor,
   {planDescriptor,plan,row}),/deep-equal/);
 }
});

check('exact accepted base linkage rejects failure flags and real geometry changes even when the caller recomputes a hash',async()=>{
 const row=plan.rows[0],base=await read(row.base.path),stem=path.join(PUBLIC_ATTEMPT_LEDGER,base.attempt.id);
 const linked={base,request:await read(stem+'.request.json'),result:await read(stem+'.result.json'),
  sidecar:await read(stem+'.v4-low-band-prefix-tail-result.json'),planRecord:await read(stem+'.v4-low-band-prefix-tail-plan.json')};
 assert.equal(inspectAcceptedLowBandLinkage(base,linked).U,19);assertPlanRowMatchesBase(row,base);
 for(const mutate of [q=>{q.base.accepted=false;},q=>{q.result.accepted=false;},q=>{q.result.lower.thresholdProven=false;},
  q=>{q.base.level.blocks[0].x++;q.base.levelSha256=levelSha256(q.base.level);},
  q=>{q.base.level.blocks[0].color=q.base.level.blocks[0].color==='red'?'blue':'red';q.base.levelSha256=levelSha256(q.base.level);}]){
  const q=structuredClone(linked);mutate(q);assert.throws(()=>inspectAcceptedLowBandLinkage(q.base,q));
 }
 const changed=structuredClone(base);changed.level.blocks[0].x++;changed.levelSha256=levelSha256(changed.level);
 assert.throws(()=>assertPlanRowMatchesBase(row,changed));
});

after(async()=>{
 for(const p of ['low-band-advanced-batch.independent.test.mjs','low-band-advanced-batch-context.mjs','accepted-low-band-batch-base.mjs','low-band-advanced-batch-contract.mjs']){
  const f='tools/daily-challenge/formal-v4/'+p;bindings[f]=sha(await fs.readFile(f));}
 for(const [p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h);
 const after=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json'));
 await put(path.join(out,'report.json'),{status:evidence.length===2&&evidence.every(e=>e.passed)?'INDEPENDENT_LOW_BAND_ADVANCED_PRIVATE_NEGATIVES_PASS':'INDEPENDENT_PRIVATE_FAIL',
  plan:planDescriptor,evidence,fileBindings:bindings,privateMetadataOnly:true,newActualAdaptations:0,newSearches:0,newLedgerClaims:0,newPublicClaims:0,
  publicRequests:{before:before.length,after:after.length,concurrentAdditions:after.filter(n=>!before.includes(n))},formalReady:false});
});

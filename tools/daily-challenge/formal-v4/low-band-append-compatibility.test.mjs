import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prepareCapacityDesignContext,CAPACITY_SEED_BINDINGS} from './capacity-design-context.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {LOW_BAND_TWO_PROPOSAL,assertLowBandAdvancedAppend} from './low-band-advanced-context.mjs';
const out=process.env.LOW_BAND_APPEND_TEST_OUT??'deliverables/daily-formal-v4-20261008/proof/low-band-append-compatibility-01';
await fs.mkdir(out,{recursive:false});const rt=await loadV4CatalogRuntime(),evidence=[],sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
const check=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});

check('real accepted D2 generator evidence survives new outer version/status in a private legacy-reader interoperability copy',async()=>{
 const originalPath='deliverables/daily-formal-v4-20261008/selection/capacity12-01/05-daily-mechanisms-generator-35-d2-03.json';
 const original=await read(originalPath),copy=structuredClone(original);
 // No math, level, slot, route, constructor or public result is changed. This
 // isolates the alleged old-reader version/status incompatibility. It is NOT
 // a new source100 candidate and never enters the fixed147 context or catalog.
 copy.status='LOW_BAND_ADVANCED_300_CANDIDATE_VERIFIED_AWAITING_POINTER';copy.lowBandAdvancedSlotVersion='daily300-two-audited-low-band-advanced-once-v1';
 for(const n of ['qualify-low-band-advanced-slot.mjs','low-band-advanced-context.mjs','low-band-key-attempt-guard.mjs']){
  const p=`tools/daily-challenge/formal-v4/${n}`;copy.designBindings[p]=sha(await fs.readFile(p));}
 copy.designToolchainSha256=levelSha256(copy.designBindings);
 const construction=path.join(out,'private-ledger');await fs.mkdir(construction);
 const copied=await put(path.join(construction,`${copy.construction.constructionAttempt.id}.slot-result.json`),copy);
 const seed=await read(CAPACITY_SEED_BINDINGS.path),files=[...seed.files,copied.path],selected=await Promise.all(files.map(read));
 const context={schemaVersion:4,scope:300,seedIndex:seed.seedIndex,files,fileBindings:{...seed.fileBindings,[copied.path]:copied.sha256}};
 const descriptor=await put(path.join(out,'context117.json'),context),base=await read(original.baseReceipt.path);
 const c=await prepareCapacityDesignContext(rt,original.baseReceipt,base,rt.slots.find(s=>s.formalId===original.formalId),selected,descriptor,
  {constructionLedgerDirectory:construction});assert.equal(c.selectionBinding.count,117);
 assert.equal(levelSha256(copy.mathematicalProof),levelSha256(original.mathematicalProof));
 assert.equal(levelSha256(copy.construction),levelSha256(original.construction));
 // Despite passing the generic persisted-receipt protocol this unrelated
 // record cannot be appended as either of the fixed two source100 objects.
 const row=(await read(LOW_BAND_TWO_PROPOSAL.path)).rows[0];
 assert.throws(()=>assertLowBandAdvancedAppend(copy,row,copy.designBindings['tools/daily-challenge/formal-v4/qualify-low-band-advanced-slot.mjs']));
});
check('bare accepted flags, wrong entry binding and qualification controls cannot pass new append gate',async()=>{
 const row=(await read(LOW_BAND_TWO_PROPOSAL.path)).rows[0];
 for(const q of [{accepted:true},{...row.slot,accepted:true,catalogEligible:true},
  {lowBandAdvancedSlotVersion:'daily300-two-audited-low-band-advanced-once-v1',status:'LOW_BAND_ADVANCED_300_CANDIDATE_VERIFIED_AWAITING_POINTER',accepted:true,catalogEligible:true,qualificationOnly:true,formalReady:false}])
  assert.throws(()=>assertLowBandAdvancedAppend(q,row,'0'.repeat(64)));
});
after(async()=>{const bindings={};for(const n of ['low-band-advanced-context.mjs','low-band-append-compatibility.test.mjs','qualify-low-band-advanced-slot.mjs']){const p=`tools/daily-challenge/formal-v4/${n}`;bindings[p]=sha(await fs.readFile(p));}
 await put(path.join(out,'report.json'),{status:evidence.length===2&&evidence.every(r=>r.passed)?'LOW_BAND_APPEND_PROTOCOL_QUALIFICATION_PASS':'INCOMPLETE_OR_FAIL',evidence,toolBindings:bindings,
  scope:'New outer receipt version interoperability with real unchanged historical D2 generator mathematics, plus fixed-two append rejections; not a new accepted source100 result',
  newSearches:0,newConstructionCalls:0,newPublicClaims:0,newAcceptedCandidates:0,productionChanged:false});});

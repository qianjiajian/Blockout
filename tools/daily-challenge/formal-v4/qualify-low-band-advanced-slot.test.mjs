import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,after} from 'node:test';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {qualifyLowBandAdvancedSlot} from './qualify-low-band-advanced-slot.mjs';
import {d2KeyRouteFixture} from './d2-key-route-fixtures.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {withLowBandKeyConstructionAttempt} from './low-band-key-attempt-guard.mjs';
const out=process.env.LOW_BAND_ADVANCED_TEST_OUT??'deliverables/daily-formal-v4-20261008/proof/low-band-advanced-entry-qualification-01';
await fs.mkdir(out,{recursive:false});const runtime=await loadV4CatalogRuntime(),evidence=[],sha=b=>createHash('sha256').update(b).digest('hex');
const publicBefore=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).length;
const put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
const check=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});
async function fixture(generator=false){
 const f=d2KeyRouteFixture(),dir=await fs.mkdtemp(path.join(out,'case-')),pub=path.join(dir,'public'),construction=path.join(dir,'construction');
 const slot=runtime.slots.find(s=>s.formalId===(generator?'daily-mechanisms-generator-35-d2-02':f.slot.formalId));
 const source={...structuredClone(f.base.level),blocks:[{id:'source0',color:'red',x:0,y:0,shape:[[0,0],[1,0],[2,0],[3,0]]},
  {id:'source1',color:'blue',x:0,y:1,shape:[[0,0],[1,0],[2,0],[3,0]]}],
  gates:[{id:'sg0',color:'red',side:'left',offset:0,size:1},{id:'sg1',color:'blue',side:'left',offset:1,size:1}]};
 const prior=structuredClone(source);if(generator)prior.generators=[{id:'old-generator',spawn:[0,0],queueBlockIds:['source0','source1']}];
 else{prior.blocks[0].keyId='old';prior.blocks[1].lockedBy='old';prior.blocks[1].lockCount=1;}
 const priorFile=await put(path.join(dir,'prior.json'),{formalId:slot.formalId,level:prior,levelSha256:levelSha256(prior)});
 const rt={...runtime,LEVELS:[source],priorDailySlots:new Map([[slot.formalId,{formalId:slot.formalId,sourceReport:priorFile.path,
  sourceReportSha256:priorFile.sha256,levelSha256:levelSha256(prior),inventory:mechanismInventory(prior)}]])};
 const ledger=await createAttemptLedger(pub),attempt=await ledger.claim(f.base.level),status='SYNTHETIC_LOW_BAND_CONTROL_NOT_A_REAL_CERTIFICATE';
 await ledger.finish(attempt,{accepted:true,status,levelSha256:f.base.levelSha256});
 const packet={...f.base,difficulty:2,attempt,status,routeSha256:routeSha256(f.base.drags),sourceLevelSha256:levelSha256(source)};
 const descriptor=await put(path.join(dir,'base.json'),packet);
 return{...f,rt,slot,dir,pub,construction,descriptor,packet,options:{selected:[],qualificationOnly:true,
  qualificationConfiguration:generator?undefined:f.configuration,publicLedgerDirectory:pub,constructionLedgerDirectory:construction}};
}
check('real D2 six-key U21 construction reaches fresh lower counterexample, never catalogue acceptance',async()=>{
 const f=await fixture(),before=await fs.readFile(f.descriptor.path),r=await qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,
  {...f.options,proofOptions:{lowerBudget:{maxStates:100,maxMilliseconds:3000}}});
 assert(r.construction.ok,JSON.stringify({reason:r.construction.reason,status:r.construction.status}));
 assert(r.mechanismStrengthValidated&&r.designValidated,r.reasons.join(';'));assert.equal(r.actualConstructedU,21);
 assert.equal(r.finalProofStarted,true);assert.equal(r.accepted,false);assert.equal(r.status,'REJECTED_FINAL_BOUNDED_PROOF');
 assert.equal(r.catalogEligible,false);assert(r.terminalBlocked&&!r.formalReady);assert.equal(r.mathematicalProof.qualificationOnly,true);
 assert.deepEqual(await fs.readFile(f.descriptor.path),before);assert.deepEqual(JSON.parse(await fs.readFile(r.entryResultFile)),JSON.parse(JSON.stringify(r)));
 await assert.rejects(qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,f.options),/Failed or pending base/);
 await put(path.join(f.dir,'result.json'),r);
});
check('generator construction exhaustion seals the same base across subsequent mechanism stages',async()=>{
 const f=await fixture(true),r=await qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,{...f.options,worldBudget:{maxStates:1}});
 assert(r.constructionAttemptStarted&&!r.accepted&&!r.finalProofStarted&&r.terminalBlocked);
 assert.equal(r.status,'REJECTED_LOW_BAND_ADVANCED_CONSTRUCTION');assert(r.construction.constructionAccounting.fullWorldReservations<=1);
 const requests=(await fs.readdir(f.pub)).filter(n=>n.endsWith('.request.json'));assert.equal(requests.length,1);
 const repeated=await qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,f.options);assert(!repeated.accepted&&!repeated.constructionAttemptStarted&&repeated.terminalBlocked);
 let invoked=false;const other=await withLowBandKeyConstructionAttempt(f.rt,f.packet,d2KeyRouteFixture().slot,()=>{invoked=true;throw Error('must not run');},
  {qualificationOnly:true,configuration:d2KeyRouteFixture().configuration,ledgerDirectory:f.construction,publicLedgerDirectory:f.pub});
 assert(!invoked&&!other.constructionAttemptStarted&&other.terminalBlocked,'The same failed physical base cannot switch generator to key');
 await put(path.join(f.dir,'result.json'),r);
});
check('unplanned slot, wrong production base, invalid budgets and public namespace fail before construction',async()=>{
 const f=await fixture();for(const budget of [{maxStates:10001},{maxStates:NaN},{maxStates:0},10000])
  await assert.rejects(qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,{...f.options,worldBudget:budget}),/construction budget/);
 await assert.rejects(qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,{...f.options,proofOptions:{lowerBudget:{maxStates:10000}}}),/Reserve one/);
 await assert.rejects(qualifyLowBandAdvancedSlot(f.rt,f.descriptor,{...f.slot,slot:4},f.options),/Exact new slot/);
 await assert.rejects(qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,{...f.options,publicLedgerDirectory:PUBLIC_ATTEMPT_LEDGER}),/private ledgers/);
 await assert.rejects(qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,{qualificationOnly:false}),/Exact planned accepted base/);
 assert.equal(await fs.stat(f.construction).then(()=>true).catch(()=>false),false);
});
check('selected-near rejection and false key configurations cannot reach final proof',async()=>{
 const f=await fixture();await assert.rejects(qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,{...f.options,
  selected:[{...f.slot,formalId:'already-selected-other',level:f.packet.level}]}),/selected-near/);
 assert.equal(await fs.stat(f.construction).then(()=>true).catch(()=>false),false);
 const r=await qualifyLowBandAdvancedSlot(f.rt,f.descriptor,f.slot,{...f.options,qualificationConfiguration:{...f.configuration,locks:[{id:'absent',count:5},{id:'b7',count:6}]}});
 assert(!r.accepted&&r.terminalBlocked&&r.constructionAttemptStarted&&!r.finalProofStarted);
});
after(async()=>{const publicAfter=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).length;assert.equal(publicAfter,publicBefore);
 const toolBindings={};for(const n of ['qualify-low-band-advanced-slot.mjs','qualify-low-band-advanced-slot.test.mjs','low-band-key-attempt-guard.mjs','low-band-advanced-context.mjs','d2-key-route-construction.mjs','accepted-low-band-base.mjs']){const p=`tools/daily-challenge/formal-v4/${n}`;toolBindings[p]=sha(await fs.readFile(p));}
 await put(path.join(out,'report.json'),{status:evidence.length===4&&evidence.every(r=>r.passed)?'LOW_BAND_ADVANCED_ENTRY_PRIVATE_QUALIFICATION_PASS':'INCOMPLETE_OR_FAIL',
  evidence,toolBindings,publicRequests:{before:publicBefore,after:publicAfter},realCandidateConstructions:0,realCandidateSearches:0,newPublicClaims:0,productionChanged:false});});

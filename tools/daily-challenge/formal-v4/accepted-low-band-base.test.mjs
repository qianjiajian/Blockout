import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,before,after} from 'node:test';
import {loadV4Runtime} from './runtime.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {ACCEPTED_LOW_BAND_BASES,LOW_BAND_BASE_AUDIT,inspectAcceptedLowBandLinkage,assertAcceptedLowBandBase} from './accepted-low-band-base.mjs';

const out=process.env.LOW_BAND_BASE_TEST_OUT??'deliverables/daily-formal-v4-20261008/proof/accepted-low-band-base-qualification-01';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
let runtime,requestsBefore,actualBaseReplays=0;const evidence=[],bindings={},facts=[];
const count=async()=> (await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(f=>f.endsWith('.request.json')).length;
const check=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});
async function packet(index=0){const base=await read(ACCEPTED_LOW_BAND_BASES[index].path),stem=path.join(PUBLIC_ATTEMPT_LEDGER,base.attempt.id);
 return{base,request:await read(`${stem}.request.json`),result:await read(`${stem}.result.json`),
  sidecar:await read(`${stem}.v4-low-band-prefix-tail-result.json`),planRecord:await read(`${stem}.v4-low-band-prefix-tail-plan.json`)};}
async function privateLedger(label){const p=await packet(),pub=path.join(out,label,'public-copy'),construction=path.join(out,label,'construction-empty');
 await fs.mkdir(path.join(pub,'identities'),{recursive:true});await fs.mkdir(construction,{recursive:true});
 for(const suffix of ['.request.json','.result.json','.v4-low-band-prefix-tail-result.json','.v4-low-band-prefix-tail-plan.json'])
  await fs.copyFile(path.join(PUBLIC_ATTEMPT_LEDGER,p.base.attempt.id+suffix),path.join(pub,p.base.attempt.id+suffix));
 await fs.copyFile(path.join(PUBLIC_ATTEMPT_LEDGER,'identities',p.request.retryIdentitySha256+'.json'),path.join(pub,'identities',p.request.retryIdentitySha256+'.json'));
 return{...p,pub,construction,options:{qualificationOnly:true,publicLedgerDirectory:pub,constructionLedgerDirectory:construction}};
}
before(async()=>{await fs.mkdir(out,{recursive:false});runtime=await loadV4Runtime();requestsBefore=await count();});

check('both exact historical receipts retain public lower/null upper and full prefix-tail evidence',async()=>{
 for(let i=0;i<2;i++){const p=await packet(i),r=inspectAcceptedLowBandLinkage(p.base,p);assert.equal(r.L,21);assert.equal(r.U,28);facts.push(r);}
});
check('full original double replay is read-only and returns the original base descriptor',async()=>{
 for(const descriptor of ACCEPTED_LOW_BAND_BASES){const r=await assertAcceptedLowBandBase(runtime,descriptor);actualBaseReplays+=2;
  assert.equal(r.newSearches,0);assert.equal(r.newLedgerClaims,0);assert.equal(r.ledgerWrites,0);
  assert.equal(r.catalogEligible,false);assert.equal(r.slotAccepted,false);assert.equal(r.mechanismObjectValidated,false);
  assert.deepEqual(r.mechanismBaseReceipt,descriptor);assert.equal(r.canonicalReplay.nonClearingDrags,28);
  assert.equal(r.independentReplay.remainingBodies,0);Object.assign(bindings,r.fileBindings);}
 assert.equal(await count(),requestsBefore);
});
check('public request drift, fabricated public upper, missing sidecar and altered original lower all reject',async()=>{
 const original=await packet();
 const cases=[p=>{p.request.retryIdentitySha256='0'.repeat(64);},p=>{p.result.upper={accepted:true};},
  p=>{delete p.sidecar.upperConstruction;},p=>{p.result.lower.rawFullBoardStates+=1;},
  p=>{p.base.lowerBound.result.sourceLevelSha256='0'.repeat(64);},p=>{p.sidecar.drags.pop();}];
 for(const mutate of cases){const p=structuredClone(original);mutate(p);assert.throws(()=>inspectAcceptedLowBandLinkage(p.base,p));}
});
check('upper shared-budget omissions and route/plan aliases cannot borrow lower-only success',async()=>{
 const original=await packet();const cases=[p=>{p.base.upperAccounting.prior.completeWorldReservations=0;},
  p=>{p.base.upperAccounting.conservativeFullBoardStateUpperBound=10001;},p=>{p.base.upperConstruction.tailSearches=2;},
  p=>{p.base.route.independentReplay.remainingBodies=1;},p=>{p.planRecord.prefixDrags.pop();},
  p=>{p.base.upperConstruction.drags[0].blockId='absent';}];
 for(const mutate of cases){const p=structuredClone(original);mutate(p);assert.throws(()=>inspectAcceptedLowBandLinkage(p.base,p));}
});
check('private fault injection refuses public failure, pending work, and stage-independent construction reuse',async()=>{
 const p=await privateLedger('terminal');await assertAcceptedLowBandBase(runtime,ACCEPTED_LOW_BAND_BASES[0],p.options);actualBaseReplays+=2;
 const cases=[path.join(p.pub,'identities',p.request.retryIdentitySha256+'.blocked.json'),
  path.join(p.pub,p.request.id+'.revalidation.lock'),path.join(p.construction,'aliases',p.request.retryIdentitySha256+'.json')];
 for(let i=0;i<cases.length;i++){
  // Each independent copy preserves every earlier negative; no deletion or reset of a failed claim.
  const q=await privateLedger(`terminal-${i}`),file=cases[i].replace(p.pub,q.pub).replace(p.construction,q.construction);
  await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify({accepted:true,reason:'qualification-only-fault'}),{flag:'wx'});
  await assert.rejects(assertAcceptedLowBandBase(runtime,ACCEPTED_LOW_BAND_BASES[0],q.options),/already failed, pending or used/);
 }
});
check('byte-tampered private result, unsupported descriptor and public qualification aliases reject',async()=>{
 const p=await privateLedger('bytes'),f=path.join(p.pub,p.request.id+'.result.json');
 p.result.upper={status:'forged-complete'};await fs.writeFile(f,JSON.stringify(p.result));
 await assert.rejects(assertAcceptedLowBandBase(runtime,ACCEPTED_LOW_BAND_BASES[0],p.options),/Evidence bytes changed/);
 await assert.rejects(assertAcceptedLowBandBase(runtime,{...ACCEPTED_LOW_BAND_BASES[0],sha256:'0'.repeat(64)}),/Only the two immutable/);
 await assert.rejects(assertAcceptedLowBandBase(runtime,ACCEPTED_LOW_BAND_BASES[0],{qualificationOnly:true}),/private ledgers/);
});
after(async()=>{
 const requestsAfter=await count();assert.equal(requestsAfter,requestsBefore);
 for(const f of ['tools/daily-challenge/formal-v4/accepted-low-band-base.mjs','tools/daily-challenge/formal-v4/accepted-low-band-base.test.mjs'])bindings[f]=hash(await fs.readFile(f));
 const report={status:evidence.length===6&&evidence.every(r=>r.passed)?'ACCEPTED_LOW_BAND_BASE_PRIVATE_QUALIFICATION_PASS':'INCOMPLETE_OR_FAIL',
  evidence,facts,sourceAudit:LOW_BAND_BASE_AUDIT,toolBindings:bindings,publicRequests:{before:requestsBefore,after:requestsAfter},
  newSearches:0,newConstructionCalls:0,newPublicClaims:0,publicLedgerWrites:0,
  actualBaseReplays,currentRuntimeValidationClaimed:false,productionChanged:false,workspace:process.cwd()};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

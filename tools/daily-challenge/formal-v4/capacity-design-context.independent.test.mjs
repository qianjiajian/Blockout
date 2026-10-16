import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prepareCapacityDesignContext,CAPACITY_SEED_BINDINGS} from './capacity-design-context.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const runtime=await loadV4CatalogRuntime(),hash=b=>createHash('sha256').update(b).digest('hex');
const out=process.env.CAPACITY_CONTEXT_INDEPENDENT_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/capacity-context-independent-');
await fs.mkdir(out,{recursive:true});const evidence=[];
const seed=JSON.parse(await fs.readFile(CAPACITY_SEED_BINDINGS.path));
const selected=await Promise.all(seed.files.map(async p=>JSON.parse(await fs.readFile(p))));
const plan=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/design/unused-capacity-plan-02/plan.json'));
const row=plan.rows[0],baseReceipt={path:row.basePath,sha256:row.baseFileSha256},base=JSON.parse(await fs.readFile(row.basePath));
const slot=runtime.slots.find(s=>s.formalId===row.formalId);
const seedContext=()=>({schemaVersion:4,scope:300,seedIndex:seed.seedIndex,files:[...seed.files],fileBindings:{...seed.fileBindings}});
async function put(label,q){const path=`${out}/${label}.json`,bytes=JSON.stringify(q,null,2)+'\n';await fs.writeFile(path,bytes,{flag:'wx'});return{path,sha256:hash(bytes)};}

test('independent context: real 116 current reports and historical visual ancestry are bound without searches',async()=>{
 const descriptor=await put('context-valid',seedContext());
 const context=await prepareCapacityDesignContext(runtime,baseReceipt,base,slot,selected,descriptor);
 const audit=context.inspect(base.level);assert.equal(audit.passed,true,JSON.stringify(audit.issues));
 assert.equal(context.selectionBinding.count,116);assert.equal(audit.selectedComparisons.length,116);
 assert(audit.sourceComparison.footprintSimilarity<=.55);assert(audit.nearestOld.similarity<=.75);
 const paths=Object.keys(context.bindings);assert(paths.includes(seed.historicalSelection.path));
 assert(paths.some(p=>p.endsWith('preselection-visual-exclusions.json')));assert(paths.some(p=>p.includes('visual-curated')));
 evidence.push({test:'real-selection-and-history-read-only',passed:true,bindingCount:paths.length,audit});
});

test('independent context: missing context, missing seed member, drifted bound bytes and substituted selected metadata reject',async()=>{
 await assert.rejects(()=>prepareCapacityDesignContext(runtime,baseReceipt,base,slot,selected,undefined),/selectionContext/);
 const omit=seedContext();delete omit.fileBindings[omit.files.pop()];const omitted=await put('context-omitted',omit);
 await assert.rejects(()=>prepareCapacityDesignContext(runtime,baseReceipt,base,slot,selected.slice(0,-1),omitted),/Original116/);
 const drift=seedContext();drift.fileBindings[drift.files[0]]='0'.repeat(64);const driftDescriptor=await put('context-drift',drift);
 await assert.rejects(()=>prepareCapacityDesignContext(runtime,baseReceipt,base,slot,selected,driftDescriptor),/immutable/);
 const context=await put('context-substitution',seedContext()),replaced=structuredClone(selected);replaced[0].L++;
 await assert.rejects(()=>prepareCapacityDesignContext(runtime,baseReceipt,base,slot,replaced,context),/Actual selected object/);
 evidence.push({test:'selection-membership-and-byte-faults',passed:true});
});

test('independent context: a newly appended accepted boolean without bound construction or mathematical evidence is rejected',async()=>{
 const second=plan.rows.find(r=>r.basePath!==row.basePath),packet=JSON.parse(await fs.readFile(second.basePath));
 const forged={schemaVersion:4,accepted:true,qualificationOnly:false,catalogEligible:true,formalId:second.formalId,
  stageKey:second.stageKey,difficulty:second.difficulty,slot:second.slot,newestMechanism:second.newestMechanism,
  sourceLevelId:packet.sourceLevelId,level:packet.level,levelSha256:levelSha256(packet.level),drags:packet.drags,
  routeSha256:routeSha256(packet.drags),baseReceipt:{path:second.basePath,sha256:second.baseFileSha256},
  status:'FORGED_APPENDED_CONTROL_MISSING_PROOF_AND_CONSTRUCTION'};
 const fake=await put('forged-append',forged),context=seedContext();context.files.push(fake.path);context.fileBindings[fake.path]=fake.sha256;
 const descriptor=await put('context-forged-append',context);
 await assert.rejects(()=>prepareCapacityDesignContext(runtime,baseReceipt,base,slot,[...selected,forged],descriptor),
  undefined,'accepted booleans and intact LevelSpec bytes alone cannot constitute an admitted appended candidate');
 evidence.push({test:'appended-receipt-evidence-required',passed:true});
});

test('independent context: private stored-record controls reject omitted additions and changed metadata or evidence',async()=>{
 const qualificationPath='deliverables/daily-formal-v4-20261008/proof/capacity-slot-qualification-v8/report.json';
 const original=JSON.parse(await fs.readFile(qualificationPath)).tests.find(t=>t.test==='real-private-construction-and-bounded-counterexample').result;
 assert.equal(original.accepted,false);assert.equal(original.status,'REJECTED_FINAL_BOUNDED_PROOF');
 const cases=[];
 // These explicit fake bookkeeping records contain NO valid L certificate.
 // They exercise stored-record integrity in private directories. The genuine
 // toy counterexample above and every real public file remain untouched.
 for(const fault of ['none','omit','math-slot','math-stage','public-status','construction-bytes','missing-core-bindings','missing-math-bindings','missing-design-bindings']){
  const dir=await fs.mkdtemp(`${out}/stored-control-`),storedDir=`${dir}/construction`,publicDir=`${dir}/public`;
  await fs.mkdir(storedDir);await fs.mkdir(publicDir);
  const q=structuredClone(original);q.accepted=true;q.catalogEligible=true;q.qualificationOnly=false;
  q.privateSyntheticBookkeepingOnly=true;q.status='PRIVATE_BOOKKEEPING_CONTROL_NOT_A_MATH_CERTIFICATE';
  const m=q.mathematicalProof;m.accepted=true;m.catalogEligible=true;m.qualificationOnly=false;m.status=q.status;
  const marker={status:'threshold-proven',thresholdProven:true,floor:16,termination:'below-threshold-exhausted',
   guardAllowance:{conservativeFullBoardStateUpperBound:8},privateSyntheticBookkeepingOnly:true};
  m.lowerBound.result=marker;q.lowerBound=structuredClone(m.lowerBound);m.L=q.L=16;m.U=q.U=16;
  q.route=structuredClone(m.route);
  const requestFile=`${publicDir}/${m.attempt.id}.request.json`,resultFile=`${publicDir}/${m.attempt.id}.result.json`;
  await fs.writeFile(requestFile,JSON.stringify(m.attempt));
  await fs.writeFile(resultFile,JSON.stringify({accepted:true,status:m.status,levelSha256:q.levelSha256,lower:marker,upper:m.route.search}));
  const constructionBytes=await fs.readFile(q.constructionSidecar.path),constructionFile=`${dir}/construction-sidecar.json`;
  await fs.writeFile(constructionFile,constructionBytes);q.constructionSidecar={path:constructionFile,sha256:hash(constructionBytes)};
  if(fault==='math-slot')m.formalId='daily-mechanisms-axis-block-50-d1-09';
  if(fault==='math-stage')m.stageKey='mechanisms-colored-grid-200';
  if(fault==='missing-core-bindings')q.toolchainBindings={};
  if(fault==='missing-math-bindings')m.toolchainBindings={};
  if(fault==='missing-design-bindings')q.designBindings={};
  if(fault==='public-status'){const r=JSON.parse(await fs.readFile(resultFile));r.status='DRIFTED';await fs.writeFile(resultFile,JSON.stringify(r));}
  if(fault==='construction-bytes')await fs.appendFile(constructionFile,' ');
  q.entryResultFile=`${storedDir}/${q.construction.constructionAttempt.id}.slot-result.json`;
  await fs.writeFile(q.entryResultFile,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
  const context=seedContext(),records=[...selected];
  if(fault!=='omit'){const b=await fs.readFile(q.entryResultFile);context.files.push(q.entryResultFile);context.fileBindings[q.entryResultFile]=hash(b);records.push(q);}
  const descriptor=await put(`context-stored-${fault}`,context);
  const read=()=>prepareCapacityDesignContext(runtime,baseReceipt,base,slot,records,descriptor,
   {qualificationOnly:true,constructionLedgerDirectory:storedDir,publicLedgerDirectory:publicDir});
  if(fault==='none')assert.equal((await read()).selectionBinding.count,117);
  else await assert.rejects(read,fault==='omit'?/cannot be omitted/:fault==='math-slot'?/mathematical formalId/:
   fault==='math-stage'?/mathematical stageKey/:fault==='construction-bytes'?/Design input changed/:undefined);
  cases.push(fault);
 }
 evidence.push({test:'stored-private-bookkeeping-faults',passed:true,cases,syntheticRecordsAreNotMathematicalCertificates:true});
});

test.after(async()=>{
 const paths=['tools/daily-challenge/formal-v4/capacity-design-context.mjs','tools/daily-challenge/formal-v4/capacity-design-context.independent.test.mjs'];
 const bindings=Object.fromEntries(await Promise.all(paths.map(async p=>[p,hash(await fs.readFile(p))])));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===4?'INDEPENDENT_CONTEXT_QUALIFIED':'INDEPENDENT_CONTEXT_NOT_QUALIFIED',
  bindings,evidence,realCandidateConstructionInvocations:0,realCandidateProofInvocations:0,readOnlyRealInputs:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});

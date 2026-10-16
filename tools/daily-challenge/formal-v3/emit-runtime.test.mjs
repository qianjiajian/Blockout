import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {transform} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {loadV3CatalogRuntime,CATALOG_VERSION} from './catalog-contract.mjs';
import {requireCompleteCatalog,registryCandidate,catalogModule,emitCatalog,fileSha256} from './emit-catalog.mjs';
import {assertRegistryBinding,verifyProductionRuntime} from './verify-runtime.mjs';

const runtime=await loadV3CatalogRuntime(),expected=expectedDailySlots(runtime.MECHANISM_GUIDE);
const indexFile='deliverables/daily-formal-v3-20261008/selection/initial-01/index.json';
const index=JSON.parse(await fs.readFile(indexFile,'utf8')),receiptFile=index.files[0],bytes=await fs.readFile(receiptFile),receipt=JSON.parse(bytes);
const slot=expected.find(s=>s.formalId===receipt.formalId),candidate=registryCandidate(runtime,slot,receipt,receiptFile,fileSha256(bytes));
const unchangedFile='src/core/formalDailyChallengeData.ts';
const summary=()=>({schemaVersion:3,catalogVersion:CATALOG_VERSION,scope:450,verified:450,missing:0,
  allDesignAndMathematicsVerified:true,duplicateIds:[],unrecognized:[],diversity:{status:'DIVERSITY_450_VERIFIED'},
  rows:expected.map(slot=>({...slot,status:'BOUNDED_AND_STRENGTH_VERIFIED_AWAITING_POINTER',issues:[]}))});

test('complete-summary gate rejects missing, duplicated, changed or unverifiable slots',()=>{
  assert.doesNotThrow(()=>requireCompleteCatalog(summary(),expected));
  for(const mutate of [
    a=>{a.verified=449;},a=>{a.rows.pop();},a=>{a.missing=1;},a=>{a.allDesignAndMathematicsVerified=false;},
    a=>{a.rows[3]={...a.rows[2]};},a=>{a.rows[4].unlockLevel++;},a=>{a.rows[5].issues=['unverified'];},
    a=>{a.diversity.status='PARTIAL';},a=>{a.duplicateIds=['duplicate'];},a=>{a.unrecognized=['unexpected'];},
  ]){const audit=summary();mutate(audit);assert.throws(()=>requireCompleteCatalog(audit,expected));}
});

test('the actual six-candidate selection is rejected before any staged or production write',async()=>{
  assert.equal(index.files.length,6);
  const before=fileSha256(await fs.readFile(unchangedFile)),output=`deliverables/daily-formal-v3-20261008/proof/rejected-emission-${randomUUID()}`;
  await assert.rejects(()=>emitCatalog(indexFile,output),/Exactly 450/);
  assert.equal(await fs.stat(output).then(()=>true).catch(()=>false),false);
  assert.equal(fileSha256(await fs.readFile(unchangedFile)),before);
});

test('runtime binding rejects changed full objects, proof files, v3 quality and old boolean-only receipts',()=>{
  assert.doesNotThrow(()=>assertRegistryBinding(runtime,slot,candidate,receipt,fileSha256(bytes)));
  for(const mutate of [
    c=>{c.level.timeSeconds++;},c=>{c.v3Evidence.strengthSha256='0'.repeat(64);},
    c=>{c.sourceLayoutSha256='0'.repeat(64);},c=>{c.routeSha256='0'.repeat(64);},
    c=>{c.proofReportSha256='0'.repeat(64);},c=>{delete c.v3Evidence;},c=>{c.proofSchemaVersion=3;},
  ]){const changed=structuredClone(candidate);mutate(changed);assert.throws(()=>assertRegistryBinding(runtime,slot,changed,receipt,fileSha256(bytes)));}
  const forged=structuredClone(receipt);forged.strength={...forged.strength,passed:true,unsupportedExtraMechanism:100};
  assert.throws(()=>assertRegistryBinding(runtime,slot,candidate,forged,fileSha256(bytes)),/binding mismatch/);
});

test('explicit schema 2 transport preserves full objects and v3 bindings with defensive clones',async()=>{
  const stages=[{stageKey:slot.stageKey,unlockLevel:slot.unlockLevel,newestMechanism:slot.newestMechanism,unlockedMechanisms:[],
    difficulties:{1:{label:'难',candidates:[candidate],uniqueSourceCount:1,repeatedSourceVariants:0},2:{label:'超难',candidates:[],uniqueSourceCount:0,repeatedSourceVariants:0},3:{label:'超超难',candidates:[],uniqueSourceCount:0,repeatedSourceVariants:0}}}];
  const revision=levelSha256(stages),module=catalogModule(stages,revision),built=await transform(module,{loader:'ts',format:'esm'});
  const api=await import(`data:text/javascript;base64,${Buffer.from(built.code).toString('base64')}`);
  assert.equal(api.FORMAL_DAILY_CHALLENGE_SCHEMA_VERSION,2);
  assert.equal(api.FORMAL_DAILY_CHALLENGE_REVISION,revision);
  const clone=api.getFormalDailyChallengeLevel(slot.formalId);assert.equal(levelSha256(clone),receipt.levelSha256);
  clone.blocks[0].color='tampered';assert.equal(levelSha256(api.getFormalDailyChallengeLevel(slot.formalId)),receipt.levelSha256);
  assert(Object.isFrozen(api.getFormalDailyChallengeCandidate(slot.formalId).level.blocks[0]));
  assert.deepEqual(api.getFormalDailyChallengeAssignments(slot.stageKey,1)[0].v3Evidence,candidate.v3Evidence);
});

test('the current old production registry cannot pass the v3 runtime verifier or create evidence',async()=>{
  const before=fileSha256(await fs.readFile(unchangedFile)),output=`deliverables/daily-formal-v3-20261008/proof/rejected-runtime-${randomUUID()}`;
  await assert.rejects(()=>verifyProductionRuntime(output),/Old receipts cannot qualify/);
  assert.equal(await fs.stat(output).then(()=>true).catch(()=>false),false);
  assert.equal(fileSha256(await fs.readFile(unchangedFile)),before);
});

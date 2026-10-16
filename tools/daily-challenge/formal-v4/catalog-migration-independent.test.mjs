import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadV4CatalogRuntime,inspectHistoricalCandidate,auditV4HistoricalCatalog} from './catalog-contract.mjs';
import {historicalSelectionPlan,PROPOSAL} from './migrate-historical-selection.mjs';

const runtime=await loadV4CatalogRuntime();
const proposal=JSON.parse(await fs.readFile(PROPOSAL.path));
const [row]=historicalSelectionPlan(runtime,proposal);
const original=JSON.parse(await fs.readFile(row.input));
const requestPath=`deliverables/daily-formal-v3-20261008/proof/attempts/${original.attempt.id}.request.json`;
const resultPath=`deliverables/daily-formal-v3-20261008/proof/attempts/${original.attempt.id}.result.json`;

// Fault injection is confined to this process. Original reports are never written.
async function withReadFault(file,mutate,action){
 const read=fs.readFile;
 fs.readFile=async function(path,...options){
  const bytes=await read.call(this,path,...options);
  if(String(path).replaceAll('\\','/')!==file)return bytes;
  const value=JSON.parse(String(bytes));mutate(value);
  const changed=JSON.stringify(value);
  return typeof bytes==='string'?changed:Buffer.from(changed);
 };
 try{return await action();}finally{fs.readFile=read;}
}

test('real old request is exactly the frozen accepted attempt; real result status matches',async()=>{
 assert.deepEqual(JSON.parse(await fs.readFile(requestPath)),original.attempt);
 assert.equal(JSON.parse(await fs.readFile(resultPath)).status,original.status);
 const r=await inspectHistoricalCandidate(runtime,row.input,row.inputSha256,row.slot);
 assert.equal(r.migration.newLowerSearchInvocations,0);assert.equal(r.migration.newUpperSearchInvocations,0);
 assert.equal(r.formalReady,false);assert.equal(r.productionChanged,false);
});

for(const field of ['id','shapeSha256','colorSha256','retryIdentitySha256'])test(`rejects altered public request ${field}`,async()=>{
 await withReadFault(requestPath,r=>{r[field]='0'.repeat(64);},async()=>{
  await assert.rejects(inspectHistoricalCandidate(runtime,row.input,row.inputSha256,row.slot));
 });
});

test('rejects an inconsistent public result status even when accepted and lower bytes still match',async()=>{
 await withReadFault(resultPath,r=>{r.status='UNKNOWN_BUDGET';},async()=>{
  await assert.rejects(inspectHistoricalCandidate(runtime,row.input,row.inputSha256,row.slot));
 });
});

test('a caller cannot relabel historical source, mathematical bound, or formal readiness',async()=>{
 const r=await inspectHistoricalCandidate(runtime,row.input,row.inputSha256,row.slot);
 for(const patch of [{sourceLevelId:999},{L:r.L+1},{formalReady:true},{mathematicalEvidenceValidated:false}]){
  const changed={...structuredClone(r),...patch};
  const audit=await auditV4HistoricalCatalog(runtime,[changed]);
  assert.equal(audit.rows[0].accepted,false);
  assert.equal(audit.formalReady,false);
 }
});

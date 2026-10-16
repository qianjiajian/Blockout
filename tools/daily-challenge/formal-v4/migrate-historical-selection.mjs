import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {levelSha256} from '../formal-v2/contract.mjs';
import {loadV4CatalogRuntime,inspectHistoricalCandidate,auditV4HistoricalCatalog} from './catalog-contract.mjs';

export const PROPOSAL={path:'deliverables/daily-formal-v3-20261008/design/merged-basic-scope-01/proposal.json',
 sha256:'bf20ec3c62f2740f29001f3bde33ea9c16094b0fc56479eb891d4c06d0d3b9c1'};
const sha=b=>createHash('sha256').update(b).digest('hex');
export function historicalSelectionPlan(runtime,proposal){
 assert.equal(proposal.selectedBasic.length,27);assert.equal(proposal.retainedAdvanced.length,89);
 const counts={1:0,2:0,3:0},rows=[];
 for(const row of proposal.selectedBasic){
  const ordinal=++counts[row.difficulty];
  const slot=runtime.slots.find(s=>s.stageKey==='basic-combined'&&s.difficulty===row.difficulty&&s.slot===ordinal);
  assert(slot);rows.push({input:row.file,inputSha256:row.fileSha256,slot});
 }
 assert.deepEqual(counts,{1:10,2:10,3:7});
 for(const row of proposal.retainedAdvanced){
  const slot=runtime.slots.find(s=>s.formalId===row.oldFormalId);
  assert(slot&&slot.stageKey!=='basic-combined');rows.push({input:row.file,inputSha256:row.fileSha256,slot});
 }
 assert.equal(new Set(rows.map(r=>r.input)).size,116);
 assert.equal(new Set(rows.map(r=>r.slot.formalId)).size,116);
 for(const r of rows)assert.equal(runtime.historicalFiles.get(r.input),r.inputSha256);
 return rows;
}

async function main(){
 const [label]=process.argv.slice(2);assert(/^[a-z0-9-]+$/.test(label??''),'New output label required');
 const proposalBytes=await fs.readFile(PROPOSAL.path);assert.equal(sha(proposalBytes),PROPOSAL.sha256);
 const proposal=JSON.parse(proposalBytes),runtime=await loadV4CatalogRuntime(),plan=historicalSelectionPlan(runtime,proposal);
 const output=`deliverables/daily-formal-v4-20261008/selection/${label}`;
 await fs.mkdir(output,{recursive:false});
 await fs.writeFile(`${output}/plan.json`,JSON.stringify({schemaVersion:4,scope:300,proposal:PROPOSAL,rows:plan,
  preservedFields:'Entire original LevelSpec, witness, mathematical receipt and strength remain unchanged',
  newLowerSearchInvocations:0,newUpperSearchInvocations:0,designBindings:runtime.designBindings},null,2)+'\n',{flag:'wx'});
 const records=[],files=[];
 for(const [index,row]of plan.entries()){
  try{
   const record=await inspectHistoricalCandidate(runtime,row.input,row.inputSha256,row.slot);
   const file=`${output}/${record.formalId}.json`;
   await fs.writeFile(file,JSON.stringify(record,null,2)+'\n',{flag:'wx'});records.push(record);files.push(file);
   if((index+1)%10===0)console.log(JSON.stringify({revalidated:index+1,total:plan.length}));
  }catch(error){
   await fs.writeFile(`${output}/failure.json`,JSON.stringify({row,index,message:error.message,stack:error.stack,
    status:'MIGRATION_STOPPED_WITHOUT_FORMAL_ADOPTION',completed:records.length},null,2)+'\n',{flag:'wx'});throw error;
  }
 }
 const audit=await auditV4HistoricalCatalog(runtime,records);
 await fs.writeFile(`${output}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 assert.equal(audit.verified,116);assert.equal(audit.diversity.reasons.length,0);
 const fresh=await loadV4CatalogRuntime();assert.equal(fresh.designToolchainSha256,runtime.designToolchainSha256,'Tools changed during migration');
 const selected={1:0,2:0,3:0};for(const r of records)selected[r.difficulty]++;
 await fs.writeFile(`${output}/index.json`,JSON.stringify({schemaVersion:4,scope:300,profile:runtime.stageContract.DAILY_CHALLENGE_V3_PROFILE,
  status:'HISTORICAL_SAME_OBJECT_CANDIDATES_REVALIDATED_FOR_300',files,selected,
  candidateCount:records.length,missing:300-records.length,proposal:PROPOSAL,
  designToolchainSha256:runtime.designToolchainSha256,levelSetSha256:levelSha256(records.map(r=>[r.formalId,r.levelSha256])),
  newLowerSearchInvocations:0,newUpperSearchInvocations:0,formalReady:false,productionChanged:false},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,verified:audit.verified,selected,missing:184,formalReady:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

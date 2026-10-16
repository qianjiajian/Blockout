import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {loadV4CatalogRuntime,auditV4HistoricalCatalog,auditV4Diversity} from './catalog-contract.mjs';
import {qualifyCapacitySlot} from './qualify-capacity-slot.mjs';

const inputPlan={path:'deliverables/daily-formal-v4-20261008/design/unused-capacity-plan-02/plan.json',
 sha256:'6ef4cd58e98385c5b24d73ea1e226b4ce7b5cfc6bbf0b687c0dc3a17bb2f0304'};
const inputSelection={path:'deliverables/daily-formal-v4-20261008/selection/merged-116-v2/index.json',
 sha256:'80cf245a78f9b45e5697c1957524ba32cd42f1e944d87e6d4def516431776006'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const own='tools/daily-challenge/formal-v4/run-capacity-plan.mjs';
const readBound=async d=>{const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256,d.path);return JSON.parse(bytes);};
const [label]=process.argv.slice(2);assert(/^[a-z0-9-]+$/.test(label??''),'New output label required');
const runtime=await loadV4CatalogRuntime(),proposal=await readBound(inputPlan),input=await readBound(inputSelection);
const records=await Promise.all(input.files.map(async file=>JSON.parse(await fs.readFile(file))));
assert.equal(records.length,116);assert.equal(proposal.rows.length,12);
assert.equal(new Set(proposal.rows.map(r=>r.baseLevelSha256)).size,12);
assert.equal(new Set(proposal.rows.map(r=>r.formalId)).size,12);
const baseAudit=await auditV4HistoricalCatalog(runtime,records);assert.equal(baseAudit.verified,116);assert.equal(baseAudit.diversity.reasons.length,0);
await readBound({path:proposal.sourceReport,sha256:proposal.sourceReportSha256});
const rows=proposal.rows.map(r=>{
 const slot=runtime.slots.find(s=>s.formalId===r.formalId);assert(slot);
 for(const key of Object.keys(slot))assert.equal(r[key],slot[key]);
 assert(!records.some(s=>s.formalId===slot.formalId));
 return{slot,base:{path:r.basePath,sha256:r.baseFileSha256},baseLevelSha256:r.baseLevelSha256,baseRouteSha256:r.baseRouteSha256};
});
for(const row of rows){const base=await readBound(row.base);assert.equal(levelSha256(base.level),row.baseLevelSha256);assert.equal(routeSha256(base.drags),row.baseRouteSha256);}
const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const bindings={...runtime.toolchainBindings,...runtime.designBindings};
for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/');bindings[p]=sha(await fs.readFile(p));}
const assertBindings=async()=>{for(const [file,digest]of Object.entries(bindings))assert.equal(sha(await fs.readFile(file)),digest,`Tool changed: ${file}`);};
const options={maxAttemptsPerCount:3,worldBudget:{maxStates:10000},proofOptions:{
 routeBudget:{maxStates:9999,maxMilliseconds:30000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000},
 lowerBudget:{maxStates:9999,maxMilliseconds:30000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000},
}};
const output=`deliverables/daily-formal-v4-20261008/selection/${label}`;
await fs.mkdir(output,{recursive:false});
await fs.writeFile(`${output}/plan.json`,JSON.stringify({status:'FIXED_TWELVE_BASES_ONE_STAGE_EACH_BEFORE_SEARCH',
 inputPlan,inputSelection,rows,options,bindings,proofToolchainSha256:runtime.toolchainSha256,
 sameBaseFallbacksAllowed:false,sameBaseStageRetriesAllowed:false,
 qualificationOnly:false,formalReady:false,productionChanged:false},null,2)+'\n',{flag:'wx'});
const outcomes=[],acceptedFiles=[];
for(const [i,row]of rows.entries()){
 await assertBindings();
 const selectionFiles=[...input.files,...acceptedFiles];
 const fileBindings=Object.fromEntries(await Promise.all(selectionFiles.map(async file=>[file,sha(await fs.readFile(file))])));
 const context={schemaVersion:4,scope:300,seedIndex:inputSelection,files:selectionFiles,fileBindings,
  formalReady:false,productionChanged:false};
 const contextFile=`${output}/selection-context-${String(i+1).padStart(2,'0')}.json`;
 const contextBytes=JSON.stringify(context,null,2)+'\n';await fs.writeFile(contextFile,contextBytes,{flag:'wx'});
 const selectionContext={path:contextFile,sha256:sha(contextBytes)};
 const result=await qualifyCapacitySlot(runtime,row.base,row.slot,{...options,selected:records,selectionContext});
 assert.equal(result.formalReady,false);assert.equal(result.productionChanged,false);
 const file=`${output}/${String(i+1).padStart(2,'0')}-${row.slot.formalId}.json`;
 await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 outcomes.push({file,formalId:row.slot.formalId,accepted:result.accepted,status:result.status,
  L:result.L??null,U:result.U??null,terminalBlocked:result.terminalBlocked,
  constructionAttemptStarted:result.constructionAttemptStarted,finalProofStarted:result.finalProofStarted});
 if(result.accepted){assert(result.catalogEligible);assert.equal(result.levelSha256,levelSha256(result.level));records.push(result);acceptedFiles.push(file);}
 await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:outcomes.length,total:12,
  accepted:acceptedFiles.length,outcomes,formalReady:false,productionChanged:false},null,2)+'\n');
 console.log(JSON.stringify({index:i+1,formalId:row.slot.formalId,status:result.status,accepted:result.accepted,totalCandidates:records.length}));
}
await assertBindings();
const diversity=auditV4Diversity(records,runtime.slots);assert.equal(diversity.reasons.length,0);
await fs.writeFile(`${output}/completion.json`,JSON.stringify({status:'FINITE_CAPACITY_PLAN_FINISHED',outcomes,
 attempts:outcomes.length,accepted:acceptedFiles.length,combinedCandidates:records.length,
 missing:300-records.length,diversity,formalReady:false,productionChanged:false},null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${output}/index.json`,JSON.stringify({schemaVersion:4,scope:300,files:[...input.files,...acceptedFiles],
 status:'PARTIAL_CAPACITY_CANDIDATES_AWAITING_INDEPENDENT_REVIEW',candidateCount:records.length,missing:300-records.length,
 inputPlan,inputSelection,formalReady:false,productionChanged:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,accepted:acceptedFiles.length,total:records.length,formalReady:false}));

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {assertAcceptedLowBandBase} from './accepted-low-band-batch-base.mjs';
import {prepareLowBandBatchContext} from './low-band-advanced-batch-context.mjs';
import {assertLowBandAdvancedBatchPlan,assertPlanRowMatchesBase} from './low-band-advanced-batch-contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const own='tools/daily-challenge/formal-v4/audit-low-band-advanced-preflight.mjs';

// Deliberately imports no mechanism constructor or slot qualifier. This binds
// genuine production inputs and replays their known routes, without reserving
// a mechanism world, a ledger identity, or a new mathematical search.
export async function auditLowBandAdvancedPreflight(planDescriptor,output){
 await fs.mkdir(output,{recursive:false});const fileBindings={},rows=[],errors=[];
 const read=async d=>{const b=await fs.readFile(d.path),h=sha(b);assert.equal(h,d.sha256,`Changed bound file: ${d.path}`);
  if(fileBindings[d.path])assert.equal(fileBindings[d.path],h);fileBindings[d.path]=h;return JSON.parse(b);};
 const merge=map=>{for(const [p,h]of Object.entries(map)){if(fileBindings[p])assert.equal(fileBindings[p],h);fileBindings[p]=h;}};
 const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
 const before=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json'));
 try{
  const plan=await read(planDescriptor);assertLowBandAdvancedBatchPlan(plan,runtime.slots);
  const selectedIndex=await read(plan.inputSelection),selected=[],bindings={};
  for(const p of selectedIndex.files){const h=sha(await fs.readFile(p));bindings[p]=h;selected.push(await read({path:p,sha256:h}));}
  const context={schemaVersion:4,scope:300,inputSelection:plan.inputSelection,files:selectedIndex.files,fileBindings:bindings,formalReady:false};
  const contextPath=path.join(output,'readonly-context.json');await fs.writeFile(contextPath,JSON.stringify(context,null,2)+'\n',{flag:'wx'});
  const contextDescriptor={path:contextPath,sha256:sha(await fs.readFile(contextPath))};
  for(const row of plan.rows){
   const readiness=await assertAcceptedLowBandBase(runtime,row.base,{independentAudit:plan.independentActualAudit});
   const base=readiness.base;assertPlanRowMatchesBase(row,base);merge(readiness.fileBindings);
   const context=await prepareLowBandBatchContext(runtime,row.base,base,row.slot,selected,contextDescriptor,{planDescriptor,plan,row});
   const design=context.inspect(base.level);assert(design.passed,design.issues.join(';'));merge(context.bindings);
   rows.push({index:row.index,base:row.base,slot:row.slot,sourceLevelId:base.sourceLevelId,levelSha256:base.levelSha256,routeSha256:base.routeSha256,
    L:base.L,U:base.U,acceptedBaseFacts:readiness.facts,canonical:readiness.canonicalReplay,independent:readiness.independentReplay,
    selectedCount:context.selectionBinding.count,design,productionInputsVerified:true,constructed:false});
  }
  merge(runtime.toolchainBindings);merge(runtime.designBindings);merge(environment.bindings);
  const b=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const p of Object.keys(b.metafile.inputs))merge({[p]:sha(await fs.readFile(p))});
  for(const [p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h,`Preflight input drift: ${p}`);
 }catch(e){errors.push(e.stack??e.message);}
 const after=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json'));
 const report={status:errors.length?'LOW_BAND_ADVANCED_BATCH_READONLY_PREFLIGHT_FAIL':'LOW_BAND_ADVANCED_BATCH_READONLY_PREFLIGHT_PASS',
  plan:planDescriptor,rows,verifiedBases:rows.length,errors,fileBindings,executionEnvironment:environment,newConstructions:0,newSearches:0,newLedgerClaims:0,
  publicRequests:{before:before.length,after:after.length,concurrentAdditions:after.filter(n=>!before.includes(n))},currentRuntimeValidationClaimed:false,formalReady:false};
 const reportPath=path.join(output,'report.json');await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return{path:reportPath,sha256:sha(await fs.readFile(reportPath)),status:report.status,verifiedBases:rows.length,errors};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(own)){
 const [p,h,out]=process.argv.slice(2);const result=await auditLowBandAdvancedPreflight({path:p,sha256:h},out);console.log(JSON.stringify(result));if(result.errors.length)process.exitCode=1;
}

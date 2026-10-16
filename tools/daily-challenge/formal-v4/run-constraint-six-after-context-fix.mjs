import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {qualifyConstraintSlot} from './qualify-constraint-slot.mjs';
import {CONSTRAINT_SEED139} from './constraint-design-context.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const own='tools/daily-challenge/formal-v4/run-constraint-six-after-context-fix.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const write=(p,q)=>fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
const readBound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const b=await fs.readFile(d.path);
 assert.equal(hash(b),d.sha256,d.path);return JSON.parse(b);};
const [planPath,planSha,reviewPath,reviewSha,label]=process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(label??''),'New output label required');
const inputPlan={path:planPath,sha256:planSha},qualificationReview={path:reviewPath,sha256:reviewSha};
const proposal=await readBound(inputPlan),review=await readBound(qualificationReview);
assert.equal(review.status,'CONSTRAINT_SEVEN_ENTRY_READY_NOT_EXECUTED');assert.deepEqual(review.plan,inputPlan);
const requiredTools=['qualify-constraint-slot.mjs','constraint-design-context.mjs','constraint-attempt-guard.mjs','route-constraint-construction.mjs']
 .map(name=>`tools/daily-challenge/formal-v4/${name}`);
assert(requiredTools.every(p=>/^[a-f0-9]{64}$/.test(review.toolBindings?.[p]??'')),'Four exact qualified entry dependencies required');
const independentReview={path:'deliverables/daily-formal-v4-20261008/proof/constraint-entry-independent-v3-snapshot/report.json',
 sha256:'d03d07fc8dd1f43bd1370af7f3521b54efbac894674828ba686491b7e9c280fe'};
const independent=await readBound(independentReview);assert.equal(independent.status,'INDEPENDENT_CONSTRAINT_ENTRY_QUALIFICATION_PASS');
assert.equal(independent.tests,6);assert(independent.evidence.every(x=>x.passed===true));
for(const p of requiredTools)assert.equal(review.toolBindings[p],independent.bindings[p],`Exact independently qualified implementation: ${p}`);
for(const [p,h]of Object.entries(review.toolBindings))assert.equal(hash(await fs.readFile(p)),h,`Qualified tool changed: ${p}`);
assert.equal(proposal.status,'FIXED_SEVEN_FIRST_CONSTRAINT_ATTEMPTS_NOT_EXECUTED');assert.equal(proposal.scope,300);
assert.deepEqual(proposal.selection,CONSTRAINT_SEED139);assert.equal(proposal.rows.length,7);assert.equal(proposal.maximumBases,7);
assert(proposal.oneStagePerBase&&proposal.noFallback);assert.equal(proposal.constructionInvocations,0);assert.equal(proposal.proofSearches,0);
const runtime=await loadV4CatalogRuntime(),input=await readBound(CONSTRAINT_SEED139);
const records=await Promise.all(input.files.map(async file=>JSON.parse(await fs.readFile(file))));assert.equal(records.length,139);
const interruptedRoot='deliverables/daily-formal-v4-20261008/selection/constraint-seven-01';
const descriptor=async path=>({path,sha256:hash(await fs.readFile(path))});
const interruptedPlan=await descriptor(`${interruptedRoot}/plan.json`),interruptedProgress=await descriptor(`${interruptedRoot}/progress.json`);
const oldPlan=await readBound(interruptedPlan),oldProgress=await readBound(interruptedProgress);
assert.deepEqual(oldPlan.inputPlan,inputPlan);assert.deepEqual(oldPlan.qualificationReview,qualificationReview);
assert.equal(oldProgress.completed,1);assert.equal(oldProgress.accepted,1);assert.equal(oldProgress.candidates,140);
assert.equal(oldProgress.outcomes.length,1);const firstOutcome=oldProgress.outcomes[0];
assert.equal(firstOutcome.formalId,proposal.rows[0].slot.formalId);assert.equal(firstOutcome.accepted,true);
const firstRecord=await readBound({path:firstOutcome.file,sha256:firstOutcome.sha256});
assert.equal(firstRecord.status,'CONSTRAINT_300_CANDIDATE_VERIFIED_AWAITING_POINTER');assert(firstRecord.accepted&&firstRecord.catalogEligible);
assert.deepEqual(await fs.readFile(firstOutcome.file),await fs.readFile(firstRecord.entryResultFile));
// Only the six never-started rows run. The original successful row is loaded
// from its immutable JSON bytes, not the in-memory object with undefined keys.
assert.equal(new Set(proposal.rows.map(r=>r.baseLevelSha256)).size,7);assert.equal(new Set(proposal.rows.map(r=>r.slot.formalId)).size,7);
for(const row of proposal.rows){assert.deepEqual(row.slot,runtime.slots.find(s=>s.formalId===row.slot.formalId));
 assert(!records.some(r=>r.formalId===row.slot.formalId));assert.equal(row.declaredConstruction.configurationsMaximum,1);
 assert.equal(row.declaredConstruction.routeRepair,false);assert.equal(row.declaredConstruction.heldSearches,0);
 assert.equal(row.declaredConstruction.fullBoardSearches,0);assert.equal(row.declaredConstruction.worldBudget.maxStates,10000);
 assert.equal(row.slot.difficulty,1);assert(['key-lock','flip-door'].includes(row.slot.newestMechanism));
 const base=await readBound(row.baseReceipt);assert.equal(levelSha256(base.level),row.baseLevelSha256);assert.equal(routeSha256(base.drags),row.baseRouteSha256);}
const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const bindings={...proposal.bindings,[inputPlan.path]:inputPlan.sha256,[qualificationReview.path]:qualificationReview.sha256,
 [independentReview.path]:independentReview.sha256,
 [interruptedPlan.path]:interruptedPlan.sha256,[interruptedProgress.path]:interruptedProgress.sha256,
 [firstOutcome.file]:firstOutcome.sha256,...oldPlan.bindings,
 [CONSTRAINT_SEED139.path]:CONSTRAINT_SEED139.sha256};
for(const [p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h,`Original plan binding changed: ${p}`);
for(const [p,h]of Object.entries(review.toolBindings)){if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;}
for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),h=hash(await fs.readFile(p));
 if(bindings[p])assert.equal(bindings[p],h,`Plan dependency drift cannot be replaced by a current SHA: ${p}`);bindings[p]=h;}
const checkBindings=async()=>{for(const[p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h,`Bound input changed: ${p}`);};
await checkBindings();const output=`deliverables/daily-formal-v4-20261008/selection/${label}`;await fs.mkdir(output,{recursive:false});
await write(`${output}/plan.json`,{status:'FIXED_SIX_UNSTARTED_CONSTRAINT_ROWS_AFTER_JSON_CONTEXT_FIX',inputPlan,qualificationReview,
 independentReview,selection:CONSTRAINT_SEED139,rows:proposal.rows,bindings,executionEnvironment:proposal.executionEnvironment,
 interruptedPlan,interruptedProgress,reusedAcceptedReceipt:{path:firstOutcome.file,sha256:firstOutcome.sha256},
 repair:'Load accepted selected records from exact serialized JSON, preventing undefined optional fields from differing from bound context bytes.',
 firstSuccessfulRowReexecuted:false,
 sameBaseStageFallback:false,sameInputRetry:false,currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false});
records.push(firstRecord);
const acceptedFiles=[firstOutcome.file],outcomes=[firstOutcome];
for(const [i,row]of proposal.rows.entries()){
 if(i===0)continue;
 await checkBindings();
 const files=[...input.files,...acceptedFiles],fileBindings=Object.fromEntries(await Promise.all(files.map(async p=>[p,hash(await fs.readFile(p))])));
 const context={schemaVersion:4,scope:300,seedIndex:CONSTRAINT_SEED139,files,fileBindings,formalReady:false,productionChanged:false};
 const contextPath=`${output}/context-${String(i+1).padStart(2,'0')}.json`;await write(contextPath,context);
 const selectionContext={path:contextPath,sha256:hash(await fs.readFile(contextPath))};
 const result=await qualifyConstraintSlot(runtime,row.baseReceipt,row.slot,{selected:records,selectionContext,
  worldBudget:row.declaredConstruction.worldBudget,proofOptions:row.proofOptions,executionEnvironment:proposal.executionEnvironment.descriptor});
 assert.equal(result.formalReady,false);assert.equal(result.productionChanged,false);
 const file=`${output}/${String(i+1).padStart(2,'0')}-${row.slot.formalId}.json`;
 await write(file,result);
 if(result.entryResultFile)assert.deepEqual(await fs.readFile(file),await fs.readFile(result.entryResultFile),'Keep actual immutable entry receipt bytes');
 if(result.accepted){assert(result.catalogEligible&&!result.qualificationOnly);assert.equal(result.levelSha256,levelSha256(result.level));
  records.push(JSON.parse(await fs.readFile(file)));acceptedFiles.push(file);}
 outcomes.push({file,sha256:hash(await fs.readFile(file)),formalId:row.slot.formalId,sourceLevelId:row.sourceLevelId,
  accepted:result.accepted,status:result.status,L:result.L,U:result.U,constructionAttemptStarted:result.constructionAttemptStarted,
  finalProofStarted:result.finalProofStarted,terminalBlocked:result.terminalBlocked});
 await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:outcomes.length,total:7,accepted:acceptedFiles.length,
  candidates:records.length,outcomes,formalReady:false},null,2)+'\n');
 console.log(JSON.stringify({...outcomes.at(-1),totalCandidates:records.length}));
}
await checkBindings();const diversity=auditV4Diversity(records,runtime.slots);assert.deepEqual(diversity.reasons,[]);
await write(`${output}/completion.json`,{status:'FINITE_SEVEN_CONSTRAINT_PLAN_FINISHED',inputPlan,qualificationReview,outcomes,
 accepted:acceptedFiles.length,combinedCandidates:records.length,missing:300-records.length,diversity,currentRuntimeValidationClaimed:false,
 formalReady:false,productionChanged:false});
await write(`${output}/index.json`,{schemaVersion:4,scope:300,files:[...input.files,...acceptedFiles],priorIndex:CONSTRAINT_SEED139.path,
 inputSelection:CONSTRAINT_SEED139,inputPlan,status:'PARTIAL_CONSTRAINT_CANDIDATES_AWAITING_INDEPENDENT_REVIEW',
 candidateCount:records.length,missing:300-records.length,formalReady:false,productionChanged:false});
console.log(JSON.stringify({output,accepted:acceptedFiles.length,candidates:records.length,formalReady:false}));

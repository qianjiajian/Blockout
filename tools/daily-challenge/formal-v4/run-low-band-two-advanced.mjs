import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {qualifyLowBandAdvancedSlot} from './qualify-low-band-advanced-slot.mjs';
import {LOW_BAND_SEED147,LOW_BAND_TWO_PROPOSAL} from './low-band-advanced-context.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Exactly two first adaptations. No fallback, failed-input retry or partial
// production catalogue write. The final 300-slot merger is a separate step.
const own='tools/daily-challenge/formal-v4/run-low-band-two-advanced.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(p,q)=>fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
const readBound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const b=await fs.readFile(d.path);
 assert.equal(sha(b),d.sha256,`Bound input changed: ${d.path}`);return JSON.parse(b);};
const [reviewPath,reviewSha,label]=process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(label??''),'New output label required');
const reviewDescriptor={path:reviewPath,sha256:reviewSha},review=await readBound(reviewDescriptor);
assert.equal(review.status,'ROOT_LOW_BAND_TWO_ADVANCED_ENTRY_READY');
assert.equal(review.passed,true);assert.equal(review.newPublicClaims,0);assert.equal(review.newActualBaseAdaptations,0);
assert.deepEqual(review.proposal,LOW_BAND_TWO_PROPOSAL);assert.deepEqual(review.selection,LOW_BAND_SEED147);
const requiredTools=['accepted-low-band-base.mjs','low-band-advanced-context.mjs','low-band-key-attempt-guard.mjs',
 'd2-key-route-construction.mjs','qualify-low-band-advanced-slot.mjs'].map(n=>`tools/daily-challenge/formal-v4/${n}`);
for(const p of requiredTools)assert(/^[a-f0-9]{64}$/.test(review.toolBindings?.[p]??''),`Qualified dependency required: ${p}`);
for(const d of review.independentTestReports){const q=await readBound(d);assert(q.evidence?.length&&q.evidence.every(t=>t.passed));}
const proposal=await readBound(LOW_BAND_TWO_PROPOSAL),seed=await readBound(LOW_BAND_SEED147);
assert.equal(proposal.maximumNewBaseAdaptations,2);assert.equal(proposal.rows.length,2);
assert(proposal.oneBaseOnePredeterminedStage&&!proposal.failedBaseFallbackAllowed&&proposal.oldPlainMathematicsImmutable);
assert.deepEqual(proposal.selection,LOW_BAND_SEED147);assert.equal(seed.files.length,147);
const runtime=await loadV4CatalogRuntime(),records=await Promise.all(seed.files.map(async p=>JSON.parse(await fs.readFile(p))));
assert.equal(new Set(records.map(q=>q.formalId)).size,147);
for(const row of proposal.rows){assert.deepEqual(row.slot,runtime.slots.find(s=>s.formalId===row.slot.formalId));
 assert(!records.some(q=>q.formalId===row.slot.formalId));const base=await readBound(row.base);
 assert(base.accepted);assert.equal(levelSha256(base.level),row.baseLevelSha256);assert.equal(routeSha256(base.drags),row.baseRouteSha256);}
const bindings={...proposal.bindings,...review.toolBindings,[LOW_BAND_TWO_PROPOSAL.path]:LOW_BAND_TWO_PROPOSAL.sha256,
 [LOW_BAND_SEED147.path]:LOW_BAND_SEED147.sha256,[reviewDescriptor.path]:reviewDescriptor.sha256};
for(const [p,h]of Object.entries(proposal.bindings))if(review.toolBindings[p])assert.equal(review.toolBindings[p],h,'No overwrite of pinned proposal tool hash');
const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
for(const p of Object.keys(compiled.metafile.inputs)){const h=sha(await fs.readFile(p));if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;}
const check=async()=>{for(const [p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,`Execution input drift: ${p}`);};
await check();
const output=`deliverables/daily-formal-v4-20261008/selection/${label}`;await fs.mkdir(output,{recursive:false});
const publicBefore=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).length;
const proofOptions={lowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},
 routeBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}};
await write(`${output}/plan.json`,{status:'FIXED_TWO_FIRST_LOW_BAND_ADVANCED_ADAPTATIONS',inputPlan:LOW_BAND_TWO_PROPOSAL,
 qualificationReview:reviewDescriptor,selection:LOW_BAND_SEED147,rows:proposal.rows,bindings,
 worldBudget:{maxStates:10000},proofOptions,executionEnvironment:proposal.plannedMathematicalEnvironment,
 oneStagePerBase:true,noFallback:true,failedInputRetry:false,formalReady:false,productionChanged:false});
const acceptedFiles=[],outcomes=[];
for(const [i,row]of proposal.rows.entries()){
 await check();const files=[...seed.files,...acceptedFiles],fileBindings=Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await fs.readFile(p))])));
 const context={schemaVersion:4,scope:300,seedIndex:LOW_BAND_SEED147,files,fileBindings,formalReady:false,productionChanged:false};
 const contextPath=`${output}/context-${i+1}.json`;await write(contextPath,context);
 const result=await qualifyLowBandAdvancedSlot(runtime,row.base,row.slot,{selected:records,
  selectionContext:{path:contextPath,sha256:sha(await fs.readFile(contextPath))},worldBudget:{maxStates:10000},proofOptions,
  executionEnvironment:proposal.plannedMathematicalEnvironment.descriptor});
 assert.equal(result.formalReady,false);assert.equal(result.productionChanged,false);
 const file=`${output}/${String(i+1).padStart(2,'0')}-${row.slot.formalId}.json`;await write(file,result);
 if(result.entryResultFile)assert.deepEqual(await fs.readFile(file),await fs.readFile(result.entryResultFile),'Immutable entry output must match');
 if(result.accepted){assert(result.catalogEligible&&!result.qualificationOnly);assert.equal(result.levelSha256,levelSha256(result.level));
  // Reload actual JSON bytes before constructing the next bound context.
  records.push(JSON.parse(await fs.readFile(file)));acceptedFiles.push(file);}
 outcomes.push({file,sha256:sha(await fs.readFile(file)),formalId:row.slot.formalId,sourceLevelId:row.sourceLevelId,
  accepted:result.accepted,status:result.status,L:result.L,U:result.U,constructionAttemptStarted:result.constructionAttemptStarted,
  finalProofStarted:result.finalProofStarted,terminalBlocked:result.terminalBlocked});
 await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:outcomes.length,total:2,accepted:acceptedFiles.length,
  candidates:records.length,outcomes,formalReady:false},null,2)+'\n');
 console.log(JSON.stringify(outcomes.at(-1)));
}
await check();const diversity=auditV4Diversity(records,runtime.slots);assert.deepEqual(diversity.reasons,[]);
const publicAfter=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).length;
assert(publicAfter-publicBefore<=2,'Only two possible first final-object mathematical claims');
await write(`${output}/completion.json`,{status:'FINITE_TWO_LOW_BAND_ADVANCED_PLAN_FINISHED',inputPlan:LOW_BAND_TWO_PROPOSAL,
 qualificationReview:reviewDescriptor,outcomes,accepted:acceptedFiles.length,combinedCandidates:records.length,missing:300-records.length,
 publicRequestsBefore:publicBefore,publicRequestsAfter:publicAfter,diversity,currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false});
await write(`${output}/index.json`,{schemaVersion:4,scope:300,files:[...seed.files,...acceptedFiles],priorIndex:LOW_BAND_SEED147.path,
 inputSelection:LOW_BAND_SEED147,inputPlan:LOW_BAND_TWO_PROPOSAL,status:'PARTIAL_LOW_BAND_ADVANCED_CANDIDATES_AWAITING_INDEPENDENT_REVIEW',
 candidateCount:records.length,missing:300-records.length,formalReady:false,productionChanged:false});
console.log(JSON.stringify({output,accepted:acceptedFiles.length,candidates:records.length,formalReady:false}));

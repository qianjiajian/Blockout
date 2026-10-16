import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {prepareConstraintDesignContext,CONSTRAINT_SEED139} from './constraint-design-context.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {inspectHistoricalAttempt,CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';

// Read-only planning only: no construction, replay, claim, or proof API runs.
const specifications=[
 ['nearband14-second/candidate-0069.json','key-lock',7],
 ['nearband-multistep-01/candidate-0067.json','key-lock',8],
 ['nearband20-short-references/candidate-0186.json','key-lock',9],
 ['nearband14-second/candidate-0034.json','flip-door',7],
 ['nearband16-shared/candidate-0013.json','flip-door',8],
 ['nearband16-shared/candidate-0018.json','flip-door',9],
 ['nearband-multistep-03/candidate-0140.json','flip-door',10],
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
const [output]=process.argv.slice(2);assert(output&&/^[a-zA-Z0-9_./:-]+$/.test(output),'Explicit new output directory required');
await fs.mkdir(output,{recursive:false});
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime),bindings={...runtime.toolchainBindings,...runtime.designBindings,...environment.bindings};
async function read(p,h){const b=await fs.readFile(p);if(h)assert.equal(sha(b),h,p);bindings[p]=sha(b);return JSON.parse(b);}
const index=await read(CONSTRAINT_SEED139.path,CONSTRAINT_SEED139.sha256),selected=[];
for(const p of index.files)selected.push(await read(p));assert.equal(selected.length,139);
const context={schemaVersion:4,scope:300,seedIndex:CONSTRAINT_SEED139,files:index.files,
 fileBindings:Object.fromEntries(index.files.map(p=>[p,bindings[p]])),formalReady:false};
const contextReceipt=await write(`${output}/selection-context.json`,context),rows=[];
const diagnosis=await read('deliverables/daily-formal-v4-20261008/design/seven-noncapacity-readonly-01.json');
for(const [relative,mechanism,number]of specifications){
 const p=`deliverables/daily-formal-v3-20261008/design/${relative}`,base=await read(p),baseReceipt={path:p,sha256:bindings[p]},known=diagnosis.rows.find(r=>r.base.path===p);
 assert(known&&known.base.sha256===baseReceipt.sha256);assert(base.accepted&&base.difficulty===1);assert.equal(base.levelSha256,levelSha256(base.level));
 const slot=runtime.slots.find(s=>s.newestMechanism===mechanism&&s.difficulty===1&&s.slot===number);assert(slot&&!selected.some(q=>q.formalId===slot.formalId));
 const sourceBinding=await currentMainlineSourceBinding(runtime,environment,base.sourceLevelId);Object.assign(bindings,sourceBinding.bindings);
 const prior=runtime.priorDailySlots.get(slot.formalId),priorReceipt=await read(prior.sourceReport,prior.sourceReportSha256);
 assert.equal(levelSha256(priorReceipt.level),prior.levelSha256);assert.equal(prior.inventory[mechanism].length,1);
 const publicRequest=await read(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.request.json`),publicResult=await read(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.result.json`);
 assert.deepEqual(publicRequest,base.attempt);assert(publicResult.accepted&&publicResult.levelSha256===base.levelSha256&&publicResult.status===base.status);
 const historical=await inspectHistoricalAttempt(base.level);assert(historical.acceptedHistoricalMathematics&&!historical.blocked);
 const design=await prepareConstraintDesignContext(runtime,baseReceipt,base,slot,selected,contextReceipt),admission=design.inspect(base.level);assert(admission.passed,admission.issues.join(';'));
 Object.assign(bindings,design.bindings);
 rows.push({ordinal:rows.length+1,baseReceipt,sourceLevelId:base.sourceLevelId,sourceLevelSha256:sourceBinding.sourceLevelSha256,
  baseLevelSha256:base.levelSha256,baseRouteSha256:routeSha256(base.drags),slot,
  priorBaseline:{path:prior.sourceReport,sha256:prior.sourceReportSha256,levelSha256:prior.levelSha256,inventory:prior.inventory},
  declaredConstruction:{configurationsMaximum:1,routeRepair:false,heldSearches:0,fullBoardSearches:0,
   mechanism,instances:2,...(mechanism==='key-lock'?{keys:3,lockCounters:[2,3]}:{phaseChoice:'each actual gate exit uses one constant clear parity'}),
   designChoiceNotUserUniformQuota:true,worldBudget:{maxStates:10000}},
  proofOptions:{lowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},
   routeBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}},
  originalKnownRoute:known.existingRoute,preconstructionDesign:admission,stageChangeOnFailure:false,failedInputContinuationAllowed:false});
}
assert.equal(new Set(rows.map(r=>r.baseLevelSha256)).size,7);
const previews=rows.map(r=>({...r.slot,sourceLevelId:r.sourceLevelId,level:diagnosis.rows.find(d=>d.base.path===r.baseReceipt.path)&&null}));
// Before actual mechanism construction the underlying geometry can already be
// compared in its destined group; mechanism participation is NOT claimed here.
for(let i=0;i<rows.length;i++)previews[i].level=(await read(rows[i].baseReceipt.path,rows[i].baseReceipt.sha256)).level;
const diversity=auditV4Diversity([...selected,...previews],runtime.slots,{expectFull:false});assert.deepEqual(diversity.reasons,[]);
const bundle=await build({entryPoints:['tools/daily-challenge/formal-v4/qualify-constraint-slot.mjs',
 'tools/daily-challenge/formal-v4/prepare-constraint-seven-plan.mjs'],bundle:true,packages:'external',write:false,metafile:true,
 outdir:'unused',platform:'node',format:'esm',logLevel:'silent'});
for(const file of Object.keys(bundle.metafile.inputs)){const p=file.replaceAll('\\','/');bindings[p]=sha(await fs.readFile(p));}
const plan={schemaVersion:4,scope:300,status:'FIXED_SEVEN_FIRST_CONSTRAINT_ATTEMPTS_NOT_EXECUTED',selection:CONSTRAINT_SEED139,selectionContext:contextReceipt,
 rows,maximumBases:7,oneStagePerBase:true,noFallback:true,productionSelectionChanged:false,
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
 mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,toolchainSha256:runtime.toolchainSha256,
 toolchainBindings:runtime.toolchainBindings,bindings,designToolchainSha256:levelSha256(bindings),geometryPreflight:diversity,
 constructionLedgerDirectory:CONSTRUCTION_LEDGER,publicLedgerDirectory:PUBLIC_ATTEMPT_LEDGER,
 constructionInvocations:0,proofSearches:0,ledgerClaims:0,formalReady:false,
 executionRequirement:'For each row refresh exact139 plus every preceding accepted sidecar context, then qualifyConstraintSlot once. Save complete result bytes; no fallback on any failure.'};
for(const [p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);
console.log(JSON.stringify(await write(`${output}/plan.json`,plan)));

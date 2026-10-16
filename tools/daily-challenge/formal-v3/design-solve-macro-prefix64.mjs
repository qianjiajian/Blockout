import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {guardedPlainTask,reservedGuardBudget,FROZEN_PROOF_SHA} from './reserved-guard-budget.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';

const phase=Number(process.argv[2]);assert([1,2].includes(phase));const root='deliverables/daily-formal-v3-20261008',batch=`${root}/design/macro-prefix64-04`,preview=`${batch}/preview-${phase}`,output=`${batch}/solve-${phase}`;
assert(!fs.existsSync(output),'No prior result may be overwritten');const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=read(`${preview}/index.json`).files,audit=read(`${preview}/structure-opening-visual-audit.json`);assert(files.length>0&&files.length<=52);
const wrapper='tools/daily-challenge/formal-v3/reserved-guard-budget.mjs';assert.equal(sha(wrapper),'9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3');
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA);const ledger=await createAttemptLedger(`${root}/proof/attempts`);
const budget=reservedGuardBudget({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
const bindings=['tools/daily-challenge/formal-v3/design-solve-macro-prefix64.mjs',wrapper,`${preview}/index.json`,`${preview}/structure-opening-visual-audit.json`,`${preview}/canvas-preview/report.json`,`${root}/proof/reserved-guard-qualified-v1/report.json`].map(path=>({path,sha256:sha(path)}));
const inputs=files.map(file=>{const q=read(file);assertPlainProofDomain(q.level,runtime);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(audit.rows.find(r=>r.path===file)?.sha256,sha(file));assert(/^[a-f0-9]{64}$/.test(q.redesignOf));return{file,sha256:sha(file),levelSha256:q.levelSha256,sourceLevelId:q.sourceLevelId,redesignOf:q.redesignOf,failedParent:q.failedParent};});
fs.mkdirSync(output,{recursive:false});for(const p of bindings.filter(x=>x.path.endsWith('.mjs')))fs.copyFileSync(p.path,`${output}/${p.path.split('/').at(-1)}.snapshot`);
const plan={status:'FIXED_PHASE_FIRST_JOINT_SEARCHES_PREDECLARED',formalReady:false,inputs,bindings,proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
 strategy:{domain:'plain',floor:16,searchUpper:128,searchUpperIsEngineeringHorizonNotD3Limit:true,budget,guardAllowance:1,hardWholeBoardLimit:10000,
  acceptance:'One completed minimum-relaxed-route-found result plus canonical and independent full original routes. Select actual U band only when its lower endpoint is covered by the same-search relaxed minimum. UNKNOWN and partial floors cannot pass.',
  ancestry:'Use bound construction source-failure branch; within this fixed batch inherit the immediately preceding same-source failed input after verifying actual shape and colour change. Parallel independent source branches do not rewrite ancestry.',
  batchLimit:64,phaseLimit:files.length,descendantsGenerated:0}};
fs.writeFileSync(`${output}/plan.json`,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});const rows=[],accepted=[],failedInBatch=new Map();
const report=status=>fs.writeFileSync(`${output}/report.json`,JSON.stringify({status,formalReady:false,productionChanged:false,plan:`${output}/plan.json`,planSha256:sha(`${output}/plan.json`),rows,accepted,claims:rows.filter(r=>r.attemptId).length,searches:rows.filter(r=>r.jointSearchPerformed).length},null,2)+'\n');
report('RUNNING_FIXED_PHASE');
for(const [i,input]of inputs.entries()){
 const q=read(input.file),level=q.level;assert.equal(sha(input.file),input.sha256);const designAudit=audit.rows.find(r=>r.path===input.file);
 const effectiveFailed=failedInBatch.get(q.sourceLevelId);if(effectiveFailed){const a=designFingerprints(effectiveFailed.level),b=designFingerprints(level);assert.notEqual(a.shapeSha256,b.shapeSha256,'New stock after same-source failure');assert.notEqual(a.colorSha256,b.colorSha256,'New colour after same-source failure');}
 const packet={status:'NOT_SEARCHED',accepted:false,formalReady:false,sourceLevelId:q.sourceLevelId,level,levelSha256:q.levelSha256,sourceLevelSha256:q.sourceLevelSha256,sourceMaskSha256:q.sourceMaskSha256,
  staticAudit:q.staticAudit,inventory:q.inventory,previewInput:{file:input.file,sha256:input.sha256},redesignOf:effectiveFailed?.id??input.redesignOf,failedParent:q.failedParent,sameBatchFailedParent:effectiveFailed?{id:effectiveFailed.id,file:effectiveFailed.file}:null,
  proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,guardWrapper:bindings.find(r=>r.path===wrapper),
  predeclaredPlan:{path:`${output}/plan.json`,sha256:sha(`${output}/plan.json`)},L:null,U:null,
  provenance:{...q.provenance,previewInput:input.file,previewInputSha256:input.sha256,
   macroWholeBoardRedesign:{...designAudit.macroWholeBoardRedesign,structureVisualAudit:{path:`${preview}/structure-opening-visual-audit.json`,sha256:sha(`${preview}/structure-opening-visual-audit.json`)},
    actualCanvasEvidence:{path:`${preview}/canvas-preview/report.json`,sha256:sha(`${preview}/canvas-preview/report.json`)},authorisedAgentVisualReview:true},
   parentBranchPolicy:'Reference source branch is bound at construction. If an earlier same-source batch input failed, both actual shape and colour must change and claim explicitly inherits that last failed batch input.'}};
 let attempt,proof;
 try{
  assert.equal(sha(q.failedParent.file),q.failedParent.sha256);assert.equal(sha(q.failedParent.requestFile),q.failedParent.requestSha256);assert.equal(sha(q.failedParent.resultFile),q.failedParent.resultSha256);
  attempt=await ledger.claim(level,{redesignOf:packet.redesignOf});packet.attempt=attempt;
  proof=guardedPlainTask(level,runtime,{floor:16,searchUpper:128,...budget});packet.proof=proof;packet.guardAllowance=proof.guardAllowance;
  assert(proof.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
  packet.lowerBound={method:'v3-plain-joint-search',inputLevelSha256:packet.levelSha256,projectedLevelSha256:null,projection:null,requiredFloor:16,result:proof};packet.route={search:proof};packet.status='UNKNOWN_OR_NO_COMPLETE_ROUTE';
  if(proof.drags&&['threshold-proven','relaxed-shortcut'].includes(proof.status)&&proof.routeTermination==='minimum-relaxed-route-found'){
   packet.drags=structuredClone(proof.drags);packet.routeSha256=routeSha256(packet.drags);
   const canonical=runtime.replayRevisedRoute(level,packet.drags),independent=independentReplay(runtime,level,packet.drags);packet.replay=canonical;packet.independentReplay=independent;
   Object.assign(packet.route,{inputLevelSha256:packet.levelSha256,routeSha256:packet.routeSha256,canonicalReplay:canonical,independentReplay:independent});packet.status='REJECTED_ORIGINAL_ROUTE';
   if(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed&&canonical.nonClearingDrags===independent.nonClearingDrags&&canonical.effectiveDrags===independent.effectiveDrags&&canonical.clearEvents===independent.clearEvents){
    const U=canonical.nonClearingDrags,L=proof.cost;assert(Number.isSafeInteger(L)&&L>=0&&proof.certifiedFloor>=L&&U>=L);packet.actualCompleteWitnessU=U;packet.relaxedMinimum=L;
    const difficulty=U>=31?3:U>=21?2:U>=16?1:null,floor=difficulty===3?31:difficulty===2?21:difficulty===1?16:null;packet.status='ACTUAL_COUNTEREXAMPLE_BELOW_ACCEPTABLE_BAND';
    if(difficulty&&proof.thresholdProven&&proof.status==='threshold-proven'&&L>=floor){Object.assign(packet,{status:'EXPLORATORY_MACRO_BASE_PROVED_AWAITING_STAGE_ADAPTATION',accepted:true,difficulty,L,U,exactActualMinimum:L===U,
     sameSearchClassification:{requestedFloor:16,actualDifficulty:difficulty,certifiedRelaxedMinimum:L,actualCompleteU:U,secondSearchPerformed:false}});}
   }
  }
 }catch(e){packet.status=attempt?'ATTEMPT_ERROR_NO_RETRY':'CLAIM_REJECTED_NO_SEARCH';packet.error=e.message;packet.accepted=false;}
 finally{if(levelSha256(level)!==input.levelSha256){packet.accepted=false;packet.status='INPUT_MUTATION_REJECTED';}if(attempt)await ledger.finish(attempt,packet);}
 const file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
 if(attempt&&!packet.accepted)failedInBatch.set(q.sourceLevelId,{id:attempt.id,file,level});
 const row={path:file,fileSha256:sha(file),sourceLevelId:q.sourceLevelId,accepted:packet.accepted,status:packet.status,difficulty:packet.difficulty,L:packet.L,U:packet.U,
  actualCompleteWitnessU:packet.actualCompleteWitnessU,relaxedMinimum:packet.relaxedMinimum,attemptId:attempt?.id,redesignOf:packet.redesignOf,jointSearchPerformed:Boolean(proof),
  termination:proof?.termination,routeTermination:proof?.routeTermination,registeredRaw:proof?.rawFullBoardStates,registeredExpanded:proof?.rawExploredStates,
  conservativeWholeBoardUpperBound:proof?.guardAllowance?.conservativeFullBoardStateUpperBound,transitions:proof?.attemptedTransitions,micro:proof?.microDiscoveredStates,error:packet.error};rows.push(row);if(packet.accepted)accepted.push(row);report('RUNNING_FIXED_PHASE');console.log(JSON.stringify(row));
}
for(const b of bindings)assert.equal(sha(b.path),b.sha256);for(const f of inputs)assert.equal(sha(f.file),f.sha256);report('FIXED_PHASE_FINISHED');
fs.writeFileSync(`${output}/index.json`,JSON.stringify({status:'EXPLORATORY_MACRO_BASES_ONLY',formalReady:false,records:accepted,files:accepted.map(r=>r.path)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,inputs:files.length,claims:rows.filter(r=>r.attemptId).length,searches:rows.filter(r=>r.jointSearchPerformed).length,accepted:accepted.length}));

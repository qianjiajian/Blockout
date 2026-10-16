import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {guardedPlainTask,reservedGuardBudget,FROZEN_PROOF_SHA} from './reserved-guard-budget.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';

// Exactly the twelve already visually reviewed layouts; no mutations,
// descendants, replacement candidates or second search are generated here.
const root='deliverables/daily-formal-v3-20261008',preview=`${root}/design/macro-region-preview-01`,output=`${root}/design/macro-region-guarded12-01`;
assert(!fs.existsSync(output),'Keep all prior attempts immutable');
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const inputs=read(`${preview}/index.json`).files,audit=read(`${preview}/structure-and-visual-audit.json`);assert.equal(inputs.length,12);
const wrapper='tools/daily-challenge/formal-v3/reserved-guard-budget.mjs';assert.equal(sha(wrapper),'9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3');
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA);
const ledger=await createAttemptLedger(`${root}/proof/attempts`),lineage=createReferenceLineageReader();
const budget=reservedGuardBudget({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
const bindings=['tools/daily-challenge/formal-v3/design-solve-macro-fixed12.mjs',wrapper,'tools/daily-challenge/formal-v3/reference-lineage.mjs',`${preview}/index.json`,`${preview}/structure-and-visual-audit.json`,`${preview}/canvas-preview/report.json`,`${root}/proof/reserved-guard-qualified-v1/report.json`].map(path=>({path,sha256:sha(path)}));
const fixedInputs=inputs.map(file=>{const q=read(file),f=designFingerprints(q.level);assertPlainProofDomain(q.level,runtime);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(audit.rows.find(r=>r.path===file)?.sha256,sha(file));return{file,fileSha256:sha(file),levelSha256:q.levelSha256,sourceLevelId:q.sourceLevelId,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256};});
fs.mkdirSync(output,{recursive:false});for(const p of bindings.filter(x=>x.path.endsWith('.mjs')))fs.copyFileSync(p.path,`${output}/${p.path.split('/').at(-1)}.snapshot`);
const plan={status:'FIXED_TWELVE_FIRST_ATTEMPTS_PREDECLARED',formalReady:false,inputs:fixedInputs,inputBindings:bindings,proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
 strategy:{domain:'plain',oneJointSearch:true,floor:31,searchUpper:128,searchUpperIsEngineeringHorizonNotD3Limit:true,budget,guardAllowance:1,conservativeWholeBoardLimit:10000,
  resultClassification:'Only same-search minimum-relaxed-route-found plus both actual complete replays can yield D1/D2/D3. UNKNOWN cannot be reclassified using a partial floor, and no retry is permitted.',
  failureLineage:'Each source carries its latest failed attempt into the next fixed input. Public claim enforces new shape stock and real colours.',
  macroFamilyPolicy:'Ancestry is retained honestly. These pre-reviewed 45–100% whole-board macro translations are proposed as independent large-partition redesigns, not a local-retile sibling exemption by label. Final selector must inspect the bound macro and visual evidence.'}};
fs.writeFileSync(`${output}/plan.json`,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
const rows=[],accepted=[],failedBySource=new Map();
const report=status=>write(`${output}/report.json`,{status,formalReady:false,productionChanged:false,plan:`${output}/plan.json`,planSha256:sha(`${output}/plan.json`),rows,accepted,searches:rows.filter(r=>r.jointSearchPerformed).length,claims:rows.filter(r=>r.attemptId).length});
report('RUNNING_FIXED_TWELVE');
for(const [i,input]of fixedInputs.entries()){
 const q=read(input.file),level=q.level,ancestor=lineage.inspect(q.provenance.reference),parent=failedBySource.get(q.sourceLevelId);
 assert.equal(sha(input.file),input.fileSha256);assert.equal(levelSha256(level),input.levelSha256);
 const packet={status:'NOT_SEARCHED',accepted:false,formalReady:false,sourceLevelId:q.sourceLevelId,level,levelSha256:q.levelSha256,
  sourceLevelSha256:q.sourceLevelSha256,sourceMaskSha256:q.sourceMaskSha256,staticAudit:q.staticAudit,inventory:q.inventory,
  previewInput:{file:input.file,sha256:input.fileSha256},proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
  guardWrapper:bindings.find(b=>b.path===wrapper),predeclaredPlan:{path:`${output}/plan.json`,sha256:sha(`${output}/plan.json`)},
  provenance:{...q.provenance,previewInput:input.file,previewInputSha256:input.fileSha256,priorAncestry:ancestor,
   macroWholeBoardRedesign:{isLocalNeighbour:false,macroAreaFraction:q.provenance.macro.areaFraction,macroBodyCount:q.provenance.macro.bodyCount,
    touchedQuadrants:q.provenance.macro.quadrants,shapeAndColourChanged:true,similarity:q.similarity,
    structureVisualAudit:{path:`${preview}/structure-and-visual-audit.json`,sha256:sha(`${preview}/structure-and-visual-audit.json`)},
    actualCanvasEvidence:{path:`${preview}/canvas-preview/report.json`,sha256:sha(`${preview}/canvas-preview/report.json`)},parentAuthorisedVisualReview:true}},
  redesignOf:parent?.attemptId??null,L:null,U:null};
 let attempt,proof;
 try{
  attempt=await ledger.claim(level,{redesignOf:parent?.attemptId});packet.attempt=attempt;
  proof=guardedPlainTask(level,runtime,{floor:31,searchUpper:128,...budget});packet.proof=proof;packet.guardAllowance=proof.guardAllowance;
  assert(proof.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
  packet.lowerBound={method:'v3-plain-joint-search',inputLevelSha256:packet.levelSha256,projectedLevelSha256:null,projection:null,requiredFloor:31,result:proof};
  packet.route={search:proof};packet.status='UNKNOWN_OR_NO_COMPLETE_ROUTE';
  if(proof.drags&&['threshold-proven','relaxed-shortcut'].includes(proof.status)&&proof.routeTermination==='minimum-relaxed-route-found'){
   packet.drags=structuredClone(proof.drags);packet.routeSha256=routeSha256(packet.drags);
   const canonical=runtime.replayRevisedRoute(level,packet.drags),independent=independentReplay(runtime,level,packet.drags);
   packet.replay=canonical;packet.independentReplay=independent;
   Object.assign(packet.route,{inputLevelSha256:packet.levelSha256,routeSha256:packet.routeSha256,canonicalReplay:canonical,independentReplay:independent});
   packet.status='REJECTED_ORIGINAL_ROUTE';
   if(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed&&canonical.nonClearingDrags===independent.nonClearingDrags&&canonical.effectiveDrags===independent.effectiveDrags&&canonical.clearEvents===independent.clearEvents){
    const U=canonical.nonClearingDrags,L=proof.cost;packet.actualCompleteWitnessU=U;packet.relaxedMinimum=L;
    assert(Number.isSafeInteger(L)&&L>=0&&proof.certifiedFloor>=L&&U>=L);
    const difficulty=U>=31?3:U>=21?2:U>=16?1:null,floor=difficulty===3?31:difficulty===2?21:difficulty===1?16:null;
    packet.status='ACTUAL_COUNTEREXAMPLE_BELOW_ACCEPTABLE_BAND';
    if(difficulty&&L>=floor&&((L>=31&&proof.thresholdProven)||(L<31&&proof.status==='relaxed-shortcut'))){
     Object.assign(packet,{status:'EXPLORATORY_MACRO_BASE_PROVED_AWAITING_STAGE_ADAPTATION',accepted:true,difficulty,L,U,
      exactActualMinimum:L===U,sameSearchClassification:{requestedFloor:31,actualDifficulty:difficulty,certifiedRelaxedMinimum:L,actualCompleteU:U,secondSearchPerformed:false}});
    }
   }
  }
 }catch(e){packet.status=attempt?'ATTEMPT_ERROR_NO_RETRY':'CLAIM_REJECTED_NO_SEARCH';packet.error=e.message;packet.accepted=false;}
 finally{
  if(levelSha256(level)!==input.levelSha256){packet.accepted=false;packet.status='INPUT_MUTATION_REJECTED';}
  if(attempt)await ledger.finish(attempt,packet);
 }
 const file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
 if(attempt&&!packet.accepted)failedBySource.set(q.sourceLevelId,{attemptId:attempt.id,path:file});
 const row={path:file,fileSha256:sha(file),sourceLevelId:q.sourceLevelId,accepted:packet.accepted,status:packet.status,difficulty:packet.difficulty,L:packet.L,U:packet.U,
  actualCompleteWitnessU:packet.actualCompleteWitnessU,relaxedMinimum:packet.relaxedMinimum,attemptId:attempt?.id,redesignOf:packet.redesignOf,jointSearchPerformed:Boolean(proof),
  termination:proof?.termination,routeTermination:proof?.routeTermination,registeredRaw:proof?.rawFullBoardStates,registeredExpanded:proof?.rawExploredStates,
  conservativeWholeBoardUpperBound:proof?.guardAllowance?.conservativeFullBoardStateUpperBound,transitions:proof?.attemptedTransitions,micro:proof?.microDiscoveredStates,error:packet.error};
 rows.push(row);if(packet.accepted)accepted.push(row);report('RUNNING_FIXED_TWELVE');console.log(JSON.stringify(row));
}
for(const b of bindings)assert.equal(sha(b.path),b.sha256);for(const f of fixedInputs)assert.equal(sha(f.file),f.fileSha256);
report('FIXED_TWELVE_FINISHED_NO_EXPANSION');fs.writeFileSync(`${output}/index.json`,JSON.stringify({status:'EXPLORATORY_MACRO_BASES_ONLY',formalReady:false,records:accepted,files:accepted.map(r=>r.path)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,inputs:12,claims:rows.filter(r=>r.attemptId).length,searches:rows.filter(r=>r.jointSearchPerformed).length,accepted:accepted.length}));

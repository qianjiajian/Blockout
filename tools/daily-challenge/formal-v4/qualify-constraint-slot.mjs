import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256,independentReplay,BANDS} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {constructRouteConstraint,auditRouteConstraint,CONSTRAINT_STAGES,CONSTRAINT_CONSTRUCTION_VERSION} from './route-constraint-construction.mjs';
import {capacityMechanismBaseOption} from './qualify-capacity-slot.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';

import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {describeLayout} from '../formal-v3/diversity.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {auditV4Diversity,V4_DIVERSITY_POLICY,V4_CATALOG_VERSION} from './catalog-contract.mjs';
import {CONSTRUCTION_LEDGER,inspectHistoricalAttempt} from './capacity-construction-ledger.mjs';
import {withConstraintConstructionAttempt,assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';
import {qualifyBoundedCandidateV4,PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {mechanismSemanticSignature} from './accepted-base-adaptation.mjs';
import {prepareConstraintDesignContext} from './constraint-design-context.mjs';

export const CONSTRAINT_SLOT_VERSION='daily300-fixed-keyflip-slot-once-v1';
const own='tools/daily-challenge/formal-v4/qualify-constraint-slot.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=level=>{const f=designFingerprints(level);return levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});};
const designFiles=[own,'tools/daily-challenge/formal-v4/qualify-capacity-slot.mjs','tools/daily-challenge/formal-v4/constraint-design-context.mjs',
 'tools/daily-challenge/formal-v4/constraint-attempt-guard.mjs','tools/daily-challenge/formal-v4/route-constraint-construction.mjs',
 'tools/daily-challenge/formal-v4/prefix-execution-environment.mjs','tools/daily-challenge/formal-v4/capacity-construction-ledger.mjs',
 'tools/daily-challenge/formal-v4/capacity-design-context.mjs','tools/daily-challenge/formal-v3/reference-lineage.mjs',
 'tools/daily-challenge/formal-v3/family-promotion-history.mjs',
 'tools/daily-challenge/formal-v4/bounded-qualify.mjs','tools/daily-challenge/formal-v4/accepted-base-adaptation.mjs',
 'tools/daily-challenge/formal-v3/capacity-compose.mjs','tools/daily-challenge/formal-v3/capacity-primary-adapter.mjs',
 'tools/daily-challenge/formal-v3/capacity-intensity-policy.mjs','tools/daily-challenge/formal-v3/reserved-guard-budget.mjs'];
async function boundJson(descriptor){
 assert(descriptor&&typeof descriptor.path==='string'&&/^[a-f0-9]{64}$/.test(descriptor.sha256??''),'Exact file path and SHA descriptor required');
 const bytes=await fs.readFile(descriptor.path);assert.equal(sha(bytes),descriptor.sha256,`Changed bound input: ${descriptor.path}`);
 return JSON.parse(bytes);
}

/** One physical base -> one declared advanced slot. No selector loop lives
 * here. Construction sidecars remain U-only; the final original object owns
 * its separate first bounded proof. All failures after construction begins
 * are terminal for this base, even when no mathematical search occurred. */
export async function qualifyConstraintSlot(runtime,baseReceipt,slot,{
 selected=[],selectionContext,worldBudget,proofOptions={},executionEnvironment,
 constructionLedgerDirectory=CONSTRUCTION_LEDGER,publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,
 constructionRedesignOf,qualificationOnly=false,
}={}){
 assertV4Runtime(runtime);
 assert.equal(typeof qualificationOnly,'boolean');
 await assertConstraintLedgerNamespace(qualificationOnly,constructionLedgerDirectory,publicLedgerDirectory);
 const {lowerBudget={},routeBudget={}}=proofOptions;
 assert(Object.keys(proofOptions).every(k=>['lowerBudget','routeBudget'].includes(k)),'Only bounded budget options belong in proofOptions; ledger and qualification are owned by this entry');
 if(!qualificationOnly){assert.equal(path.resolve(constructionLedgerDirectory),path.resolve(CONSTRUCTION_LEDGER),'Production construction ledger must be shared');
  assert.equal(path.resolve(publicLedgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER),'Production public ledger must be shared');}
 const expected=runtime.slots?.find(s=>s.formalId===slot?.formalId);assert(expected,'Known v1.156 slot required');
 assert.deepEqual(slot,expected,'Exact new slot metadata required');assert(CONSTRAINT_STAGES.includes(slot.newestMechanism)&&slot.difficulty===1,'Fixed D1 key/flip stage required');
 assert(!selected.some(r=>r.formalId===slot.formalId),'Slot is already occupied');
 const base=await boundJson(baseReceipt);assert(base.accepted===true&&base.level&&Array.isArray(base.drags)&&base.attempt?.id,'Actual accepted public base file required');
 assert.equal(base.levelSha256,levelSha256(base.level));assert.equal(base.difficulty,slot.difficulty,'No cross-band base relabeling');
 if(base.routeSha256!==undefined)assert.equal(base.routeSha256,routeSha256(base.drags));
 const source=runtime.LEVELS.find(l=>l.id===base.sourceLevelId);assert(source,'Real source level required');
 if(base.sourceLevelSha256!==undefined)assert.equal(base.sourceLevelSha256,levelSha256(source),'Source object changed');
 const requestFile=path.join(publicLedgerDirectory,`${base.attempt.id}.request.json`),resultFile=path.join(publicLedgerDirectory,`${base.attempt.id}.result.json`);
 const requestBytes=await fs.readFile(requestFile),resultBytes=await fs.readFile(resultFile),request=JSON.parse(requestBytes),result=JSON.parse(resultBytes);
 assert.deepEqual(request,base.attempt,'Complete public base request identity');
 assert.equal(request.levelSha256,base.levelSha256);assert.equal(result.levelSha256,base.levelSha256);assert.equal(result.accepted,true,'Public base result must be accepted');
 assert.equal(result.status,base.status,'Exact accepted public status');
 if(base.lowerBound?.result)assert.deepEqual(result.lower,base.lowerBound.result,'Bound original lower result');
 if(base.route?.search)assert.deepEqual(result.upper,base.route.search,'Bound original upper result');
 if(base.proof!==undefined){assert.deepEqual(result.lower,base.proof,'Bound exploratory original lower result');
  if(base.status.startsWith('EXPLORATORY_')&&Array.isArray(base.proof.drags))assert.deepEqual(result.upper,base.proof,'Bound exploratory joint upper result');}
 const historical=await inspectHistoricalAttempt(base.level,publicLedgerDirectory);
 assert(historical.acceptedHistoricalMathematics&&!historical.blocked,'Failed or pending base cannot be adapted');
 const prior=runtime.priorDailySlots?.get(slot.formalId);assert(prior?.sourceReport&&prior.sourceReportSha256,'Exact old slot baseline required');
 const priorReceipt=await boundJson({path:prior.sourceReport,sha256:prior.sourceReportSha256});
 assert.equal(levelSha256(priorReceipt.level),prior.levelSha256,'Prior actual level hash');
 if(priorReceipt.levelSha256!==undefined)assert.equal(priorReceipt.levelSha256,prior.levelSha256);
 if(priorReceipt.formalId!==undefined)assert.equal(priorReceipt.formalId,slot.formalId,'Prior belongs to this unchanged advanced slot');
 assert.deepEqual(mechanismInventory(priorReceipt.level),prior.inventory,'Prior actual full mechanism inventory');
 const environment=prefixExecutionEnvironment(runtime,executionEnvironment);
 const currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,base.sourceLevelId,{qualificationOnly});
 const designContext=await prepareConstraintDesignContext(runtime,baseReceipt,base,slot,selected,selectionContext,
  {qualificationOnly,constructionLedgerDirectory,publicLedgerDirectory});
 const preconstructionDesign=designContext.inspect(base.level);
 assert(preconstructionDesign.passed,`Preconstruction design rejected: ${preconstructionDesign.issues.join(';')}`);
 const bindings={...runtime.designBindings,...environment.bindings,...currentSourceBinding.bindings};for(const file of designFiles)bindings[file]=sha(await fs.readFile(file));
 const bundled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(bundled.metafile.inputs)){const p=file.replaceAll('\\','/');bindings[p]=sha(await fs.readFile(p));}
 for(const [file,digest]of Object.entries({...runtime.toolchainBindings,...runtime.designBindings}))assert.equal(sha(await fs.readFile(file)),digest,`Runtime dependency changed: ${file}`);
 const inputBindings={...baseReceipt,levelSha256:base.levelSha256,routeSha256:routeSha256(base.drags),
  request:{path:requestFile,sha256:sha(requestBytes)},result:{path:resultFile,sha256:sha(resultBytes)}};
 const report={schemaVersion:4,catalogVersion:V4_CATALOG_VERSION,constraintSlotVersion:CONSTRAINT_SLOT_VERSION,...structuredClone(slot),
  sourceLevelId:base.sourceLevelId,baseReceipt:inputBindings,baseLevelSha256:base.levelSha256,baseRouteSha256:routeSha256(base.drags),
  priorBaseline:{path:prior.sourceReport,sha256:prior.sourceReportSha256,levelSha256:prior.levelSha256,inventory:prior.inventory},
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,
  designBindings:bindings,designToolchainSha256:levelSha256(bindings),
  selectionContext:designContext.selectionBinding,designInputBindings:designContext.bindings,preconstructionDesign,
  executionEnvironment:environment,currentSourceBinding,currentRuntimeValidationClaimed:false,
  qualificationOnly,catalogEligible:false,accepted:false,status:'CONSTRAINT_PRECONSTRUCTION_VALIDATED',
  terminalBlocked:false,constructionAttemptStarted:false,finalProofStarted:false,L:null,U:null,
  mechanismStrengthValidated:false,designValidated:false,mathematicalEvidenceValidated:false,
  pointerValidated:false,timeValidated:false,formalReady:false,productionChanged:false,reasons:[]};
 try{
  const construction=await withConstraintConstructionAttempt(runtime,base,slot,
   cloned=>constructRouteConstraint(runtime,cloned,slot,priorReceipt.level,{worldBudget}),
   {ledgerDirectory:constructionLedgerDirectory,publicLedgerDirectory,redesignOf:constructionRedesignOf,qualificationOnly});
  report.construction=construction;report.constructionAttemptStarted=construction.constructionAttemptStarted===true;
  if(construction.resultFile)report.constructionSidecar={path:construction.resultFile,sha256:sha(await fs.readFile(construction.resultFile))};
  if(construction.planFile)report.constructionPlan={path:construction.planFile,sha256:sha(await fs.readFile(construction.planFile)),canonicalSha256:construction.planSha256};
  if(!construction.ok){report.status='REJECTED_CONSTRAINT_CONSTRUCTION';report.terminalBlocked=true;return report;}
  const level=construction.level,drags=construction.drags;
  const candidate={...slot,sourceLevelId:base.sourceLevelId,level,drags,levelSha256:levelSha256(level),routeSha256:routeSha256(drags)};
  Object.assign(report,{level,drags,levelSha256:candidate.levelSha256,routeSha256:candidate.routeSha256});
  assert.deepEqual(Object.fromEntries(Object.keys(slot).map(k=>[k,construction.adaptation[k]])),slot,'Constructed output slot metadata changed');
  assert.equal(construction.provenance.inputLevelSha256,base.levelSha256);assert.equal(construction.provenance.inputRouteSha256,routeSha256(base.drags));
  assert.equal(construction.provenance.outputLevelSha256,candidate.levelSha256);assert.equal(construction.provenance.outputRouteSha256,candidate.routeSha256);
  const canonical=replayDecorated(runtime,level,drags),independent=independentReplay(runtime,level,drags);
  report.preProofReplay={canonical,independent};
  assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed,'Full original U before proof');
  assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
  report.actualConstructedU=independent.nonClearingDrags;
  const intensity=auditRouteConstraint(runtime,level,drags,slot,priorReceipt.level);
  report.strength={version:CONSTRAINT_CONSTRUCTION_VERSION,kind:'fixed-route-keyflip-active-mechanisms',mechanism:slot.newestMechanism,
   passed:intensity.passed,targets:construction.targets,designChoiceNotUserUniformQuota:true,participation:intensity,searchAccounting:construction.provenance,
   priorComparison:{priorLevelSha256:prior.levelSha256,priorInstances:prior.inventory[slot.newestMechanism],
    currentInstances:intensity.inventory[slot.newestMechanism],priorInstanceCount:intensity.priorInstances,
    currentInstanceCount:intensity.actualInstances,instanceIncrease:intensity.actualInstances-intensity.priorInstances,
    priorCounters:slot.newestMechanism==='key-lock'?prior.inventory[slot.newestMechanism].map(x=>x.value):null,
    currentCounters:slot.newestMechanism==='key-lock'?intensity.inventory[slot.newestMechanism].map(x=>x.value):null,
    numericCounterApplicable:slot.newestMechanism==='key-lock'},
   adaptationProvenance:{primaryInstances:construction.primaryInstances,addedSupport:construction.addedSupport}};
  assert(intensity.passed,intensity.issues.join(';'));report.mechanismStrengthValidated=true;
  report.staticAudit=await auditV4StaticCandidate(runtime,candidate);assert(report.staticAudit.passed,report.staticAudit.issues.join(';'));
  report.assetBindings=Object.fromEntries(Object.entries(report.staticAudit.assetBindings).map(([file,digest])=>[`public/${file}`,digest]));
  const diversity=auditV4Diversity([...selected,candidate],runtime.slots,{expectFull:false});
  const finalDesign=designContext.inspect(level),sourceComparison=finalDesign.sourceComparison;
  report.design={passed:!diversity.reasons.length&&finalDesign.passed,policy:V4_DIVERSITY_POLICY,diversity,sourceComparison,admission:finalDesign,
   boardOutlineSha256:describeLayout(level).boardOutlineSha256,retainsSourceBoard:boardBaselineSha256(level)===boardBaselineSha256(source),
   designBindings:bindings,designToolchainSha256:levelSha256(bindings)};
  assert(report.design.retainsSourceBoard,'Normal source board was changed');assert(!diversity.reasons.length,JSON.stringify(diversity.reasons));
  assert(finalDesign.passed,`Final design rejected: ${finalDesign.issues.join(';')}`);
  report.designValidated=true;
  const band=BANDS[slot.difficulty];if(report.actualConstructedU<band.lower||band.upper!==null&&report.actualConstructedU>band.upper){
   report.status='REJECTED_CONSTRUCTED_U_OUTSIDE_BAND';report.terminalBlocked=true;return report;}
  // Re-read the binding immediately before final proof; no caller-supplied
  // receipt or renamed object is allowed to stand in for the accepted base.
  await boundJson(baseReceipt);await boundJson({path:prior.sourceReport,sha256:prior.sourceReportSha256});
  const mechanismBaseReceipt=capacityMechanismBaseOption(base,level,baseReceipt);
  report.finalProofPlan={qualificationOnly,publicLedgerDirectory,mechanismBaseReceipt,providedCompleteRoute:true,
   noRevalidationOverride:true,lowerBudget,routeBudget,policyRuleVersion:runtime.policyRuleVersion};
  report.finalProofStarted=true;
  const mathematical=await qualifyBoundedCandidateV4(runtime,candidate,{lowerBudget,routeBudget,ledgerDirectory:publicLedgerDirectory,
   qualificationOnly,...(mechanismBaseReceipt?{mechanismBaseReceipt}:{})});
  report.mathematicalProof=mathematical;
  for(const key of ['attempt','attemptPlan','attemptPlanSha256','lowerBound','route','redesignRequired'])if(mathematical[key]!==undefined)report[key]=mathematical[key];
  report.L=mathematical.L;report.U=mathematical.U;
  assert.equal(mathematical.levelSha256,candidate.levelSha256,'Final proof changed the constructed level');
  if(mathematical.routeSha256!==undefined)assert.equal(mathematical.routeSha256,candidate.routeSha256,'Final proof changed the provided U');
  assert.equal(mathematical.qualificationOnly,qualificationOnly,'Qualification namespace must propagate');
  if(!mathematical.accepted){report.status='REJECTED_FINAL_BOUNDED_PROOF';report.terminalBlocked=true;return report;}
  report.accepted=true;report.mathematicalEvidenceValidated=true;report.status='CONSTRAINT_300_CANDIDATE_VERIFIED_AWAITING_POINTER';
  return report;
 }catch(error){report.accepted=false;report.status='CONSTRAINT_SLOT_REJECTED';report.reasons.push(error.message);
  report.terminalBlocked=report.constructionAttemptStarted;return report;
 }finally{
  const checks={...runtime.toolchainBindings,...bindings,...designContext.bindings,...report.assetBindings,...Object.fromEntries([baseReceipt,report.priorBaseline,inputBindings.request,inputBindings.result,
   report.constructionSidecar,report.constructionPlan].filter(Boolean).map(x=>[x.path,x.sha256]))};
  for(const [file,digest]of Object.entries(checks))if(await fs.readFile(file).then(sha).catch(()=>null)!==digest){
   report.accepted=false;report.status='CONSTRAINT_SLOT_BINDING_CHANGED';report.reasons.push(file);report.terminalBlocked=report.constructionAttemptStarted;}
  report.catalogEligible=report.accepted&&!qualificationOnly;
  if(!report.accepted)report.mathematicalEvidenceValidated=false;
  report.formalReady=false;report.productionChanged=false;
  if(report.constructionAttemptStarted){
   report.entryResultFile=path.join(constructionLedgerDirectory,`${report.construction.constructionAttempt.id}.slot-result.json`);
   try{await fs.writeFile(report.entryResultFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
   catch(error){report.accepted=false;report.catalogEligible=false;report.mathematicalEvidenceValidated=false;report.terminalBlocked=true;
    report.status='CONSTRAINT_SLOT_RESULT_NOT_PERSISTED';report.reasons.push(error.message);}
  }
 }
}

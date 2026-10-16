import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {FROZEN_MATH_SHA} from './runtime.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {inspectAcceptedIcedLinkage} from './accepted-iced-prefix-base.mjs';
import {prepareIcedFlipContext} from './fixed-iced-flip-context.mjs';
import {ICED_FLIP_BASE,ICED_FLIP_BASE_AUDIT,ICED_FLIP_SLOT,ICED_FLIP_CONFIGURATION,inspectFixedIcedFlipObject,auditFixedIcedFlip} from './fixed-iced-flip-construction.mjs';
import {FIXED_ICED_FLIP_ENTRY_VERSION,assertFixedIcedFlipPlan,assertIcedTerminalHistoryMembership} from './qualify-fixed-iced-flip.mjs';
import {CONSTRUCTION_LEDGER,inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {expectedIcePreservingLevel,projectIcePreservingConstraints,ICE_PRESERVING_LOWER_METHOD} from '../formal-v3/ice-preserving-projection.mjs';
import {guardAllowanceFor,reservedGuardBudget} from '../formal-v3/reserved-guard-budget.mjs';

// Stored evidence and supplied-route verification only. This module never
// invokes readiness, a constructor, a ledger loader/claim or a search primitive.
const SELF='tools/daily-challenge/formal-v4/audit-fixed-iced-flip-actual-independent-v2.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),clean=q=>JSON.parse(JSON.stringify(q));
const exact=d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));return{path:d.path,sha256:d.sha256};};
const same=(a,b,message)=>assert.equal(levelSha256(a),levelSha256(b),message);
const integer=(n,max)=>assert(Number.isSafeInteger(n)&&n>=0&&n<=max);
function full(r,level,drags,U){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,U);assert.equal(r.effectiveDrags,drags.length);assert.equal(r.clearEvents,level.blocks.length);if(r.remainingBodies!==undefined)assert.equal(r.remainingBodies,0);if(r.remainingQueued!==undefined)assert.equal(r.remainingQueued,0);}

/** Pure checks, usable with labelled private evidence. Files and actual model
 * traces remain independent mandatory checks in auditFixedIcedFlipActual. */
export function assertFixedIcedFlipReceiptAccounting(q,base,{qualificationOnly=false}={}){
 assert.equal(q.icedFlipSlotVersion,FIXED_ICED_FLIP_ENTRY_VERSION);assert.equal(q.formalId,ICED_FLIP_SLOT);assert.equal(q.difficulty,3);assert.equal(q.unlockLevel,150);
 assert.equal(q.qualificationOnly,qualificationOnly);assert.equal(q.baseLevelSha256,base.levelSha256);assert.equal(q.baseRouteSha256,base.routeSha256);
 assert.equal(q.sourceLevelId,base.sourceLevelId);
 assert.equal(q.toolchainSha256,FROZEN_MATH_SHA);assert.equal(q.policyRuleVersion,'1.156.0');assert.equal(q.mathRuleVersion,'1.154.0');
 assert.equal(q.formalReady,false);assert.equal(q.pointerValidated,false);assert.equal(q.timeValidated,false);assert.equal(q.currentRuntimeValidationClaimed,false);assert.equal(q.productionChanged,false);
 assert(q.constructionAttemptStarted,'A preflight exception is not a completed physical attempt');const c=q.construction;assert(c?.constructionAttemptStarted);
 assert.equal(c.inputLevelSha256,base.levelSha256);assert.equal(c.inputRouteSha256,base.routeSha256);assert.equal(c.mathematicalAcceptance,false);assert.equal(c.mathematicalLowerSearchInvocations,0);
 assert.deepEqual(inspectConstructionAccounting(c.constructionAccounting),[]);assert.equal(c.constructionAccounting.expanded,0);
 if(c.ok){const a=c.adaptation;assert(a?.ok);same(c.constructionAccounting,a.constructionAccounting);same(a.provenance.constructionAccounting,a.constructionAccounting);
  assert.equal(a.provenance.inputLevelSha256,base.levelSha256);assert.equal(a.provenance.inputRouteSha256,base.routeSha256);assert.equal(a.provenance.outputLevelSha256,q.levelSha256);assert.equal(a.provenance.outputRouteSha256,q.routeSha256);
  assert.equal(a.provenance.configurationsAttempted,1);assert.equal(a.provenance.heldSearches,0);assert.equal(a.provenance.fullBoardSearches,0);assert.equal(a.provenance.routeRepairAllowed,false);
  const P=1+base.drags.reduce((n,d)=>n+d.path.length+2+2*Number(!!d.exitSide),0);
  assert.equal(c.constructionAccounting.fullWorldReservations,3*P+1);assert.equal(c.constructionAccounting.kinds['base-initial'],1);assert.equal(c.constructionAccounting.kinds['final-initial'],1);
  assert.equal(c.constructionAccounting.kinds['base-begin-unit-exit-commit'],P-1);assert.equal(c.constructionAccounting.kinds['final-begin-unit-exit-commit'],P-1);
  assert.equal(c.constructionAccounting.kinds['one-final-iced-flip-world'],1);assert.equal(c.constructionAccounting.kinds['deferred-independent-full-route'],P);
  assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));same(q.drags,base.drags);same(a.level,q.level);same(c.level,q.level);
  inspectFixedIcedFlipObject(base.level,q.level,q.configuration);full(a.canonicalReplay,q.level,q.drags,c.U);full(a.independentReplay,q.level,q.drags,c.U);
  full(c.canonicalReplay,q.level,q.drags,c.U);full(c.independentReplay,q.level,q.drags,c.U);
 }
 const m=q.mathematicalProof;assert.equal(q.finalProofStarted,!!m);
 if(m){assert.equal(m.levelSha256,q.levelSha256);assert.equal(m.routeSha256,q.routeSha256);same(m.level,q.level);same(m.drags,q.drags);assert.equal(m.toolchainSha256,FROZEN_MATH_SHA);
  same(m.lowerBound,q.lowerBound);same(m.route,q.route);assert.equal(m.L,q.L);assert.equal(m.U,q.U);assert.equal(m.attempt.levelSha256,q.levelSha256);
  assert.equal(m.attemptPlan.strategy.route,'provided');assert.equal(m.attemptPlan.strategy.lower,'ice-preserving');assert.equal(m.attemptPlan.inputLevelSha256,q.levelSha256);assert.equal(m.attemptPlan.providedRouteSha256,q.routeSha256);
  assert.equal(m.route.search,null);assert(m.route.witnessValidation.providedRoute&&!m.route.witnessValidation.searchPerformed);assert.equal(m.route.witnessValidation.fullBoardSearchStates,0);
  full(m.route.canonicalReplay,q.level,q.drags,m.U);full(m.route.independentReplay,q.level,q.drags,m.U);
  const lower=m.lowerBound,p=lower.result;assert.equal(lower.method,ICE_PRESERVING_LOWER_METHOD);assert.equal(lower.requiredFloor,31);assert.equal(lower.inputLevelSha256,q.levelSha256);
  assert.equal(lower.projectedLevelSha256,levelSha256(expectedIcePreservingLevel(q.level)));assert.equal(p.sourceLevelSha256,lower.projectedLevelSha256);assert.equal(p.floor,31);
  assert.deepEqual(inspectSearchAccounting(p,'lower'),[]);assert.deepEqual(p.guardAllowance,guardAllowanceFor(p));same(p.budget,m.attemptPlan.lowerBudget);
  integer(p.rawFullBoardStates,p.budget.maxStates);integer(p.rawExploredStates,p.rawFullBoardStates);integer(p.attemptedTransitions,p.budget.maxTransitions);
  integer(p.microDiscoveredStates,p.budget.maxMicroStates);integer(p.microExploredStates,p.microDiscoveredStates);integer(p.elapsedMilliseconds,Number.MAX_SAFE_INTEGER);
  assert.equal(p.discoveredStates,p.rawFullBoardStates);assert.equal(p.visitedStates,p.rawFullBoardStates);assert.equal(p.exploredStates,p.rawExploredStates);
  assert.equal(p.guardAllowance.registeredRawSetStates,p.rawFullBoardStates);assert.equal(p.guardAllowance.registeredExpandedStates,p.rawExploredStates);
  assert.equal(p.guardAllowance.registeredSetBudget,p.budget.maxStates);assert.equal(p.guardAllowance.conservativeFullBoardStateUpperBound,p.rawFullBoardStates+1);
  if(!qualificationOnly){same(p.budget,reservedGuardBudget({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}));same(m.attemptPlan.upperBudget,reservedGuardBudget());}
  integer(p.guardAllowance.conservativeFullBoardStateUpperBound,10000);assert.equal(p.iceProofSha256,FROZEN_MATH_SHA);
  if(q.accepted){assert(m.accepted&&p.thresholdProven&&p.status==='threshold-proven');assert.equal(m.status,'FROZEN_MATH_VERIFIED_AWAITING_300_DESIGN_AND_POINTER');
   assert.equal(p.termination,'below-threshold-exhausted','Accepted lower must have exhausted every below-threshold state');assert(p.elapsedMilliseconds<=p.budget.maxMilliseconds,'Accepted lower elapsed time exceeds its original budget');
   assert.equal(q.L,31);assert(q.U>=q.L&&Number.isSafeInteger(q.U));assert.equal(q.U,c.U);assert(p.certifiedFloor>=31);}
 }
 if(q.accepted){assert(c.ok&&m?.accepted&&q.mathematicalEvidenceValidated&&q.mechanismStrengthValidated&&q.designValidated);assert.equal(q.status,'FIXED_ICED_FLIP_D3_CANDIDATE_VERIFIED_AWAITING_POINTER');assert.equal(q.catalogEligible,!qualificationOnly);assert.equal(q.terminalBlocked,false);}
 else{assert.equal(q.catalogEligible,false);assert.equal(q.terminalBlocked,true);assert.equal(q.mathematicalEvidenceValidated,false);}
 return{accepted:q.accepted,L:q.L,U:q.U,constructionWorlds:c.constructionAccounting.fullWorldReservations,upperSearches:0,lowerSearches:m?1:0,lowerRaw:m?.lowerBound.result.rawFullBoardStates??0,lowerWholeWorldUpperBound:m?.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound??0};
}

export function assertFixedIcedPublicProof(q,{request,result,planRecord}){
 const m=q.mathematicalProof;assert(m?.attempt);same(request,m.attempt);assert.equal(result.accepted,m.accepted);assert.equal(result.status,m.status);assert.equal(result.levelSha256,q.levelSha256);
 same(result.lower,m.lowerBound.result);assert.equal(result.upper,null);same(planRecord.plan,m.attemptPlan);same(planRecord.attempt,m.attempt);assert.equal(levelSha256(planRecord.plan),m.attemptPlanSha256);same(planRecord.policyBindings,m.policyBindings);
 return true;
}

export async function auditFixedIcedFlipActual({receipt,output}){
 exact(receipt);assert(output);await fs.mkdir(output,{recursive:false});const bindings={},errors=[],report={status:'INDEPENDENT_FIXED_ICED_FLIP_ACTUAL_INCOMPLETE',receipt,fileBindings:bindings,errors,newSearches:0,newLedgerClaims:0,newConstructions:0,formalReady:false};
 const cached=new Map(),read=async(d,json=true)=>{exact(d);const absolute=path.resolve(d.path),old=cached.get(absolute);if(old){assert.equal(old.sha256,d.sha256,'Conflicting bound file bytes');bindings[d.path]=d.sha256;return json?JSON.parse(old.bytes):old.bytes;}
  const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256,`Changed bytes ${d.path}`);cached.set(absolute,{sha256:d.sha256,bytes});bindings[d.path]=d.sha256;return json?JSON.parse(bytes):bytes;};
 const bindFile=async(file,json=true)=>{const b=await fs.readFile(file);return read({path:file,sha256:sha(b)},json);};
 const check=async map=>{for(const[p,h]of Object.entries(map??{}))await read({path:p,sha256:h},false);};
 let before;
 try{
  before=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(p=>p.endsWith('.request.json')).length;
  const runtime=await loadV4CatalogRuntime(),q=await read(receipt);assert(!q.qualificationOnly);const base=await read(ICED_FLIP_BASE),baseAudit=await read(ICED_FLIP_BASE_AUDIT);
  assert.equal(q.baseReceipt.path,ICED_FLIP_BASE.path);assert.equal(q.baseReceipt.sha256,ICED_FLIP_BASE.sha256);assert.equal(baseAudit.status,'INDEPENDENT_EARLY_PREFIX_ACTUAL_PASS');assert.deepEqual(baseAudit.errors,[]);
  const facts=assertFixedIcedFlipReceiptAccounting(q,base);report.result={...facts,status:q.status,sourceLevelId:q.sourceLevelId,formalId:q.formalId};
  const slot=runtime.slots.find(s=>s.formalId===ICED_FLIP_SLOT),plan=await read(q.fixedPlan);assertFixedIcedFlipPlan(plan,runtime.slots);same(plan.configuration,ICED_FLIP_CONFIGURATION);same(q.configuration,plan.configuration);
  for(const k of ['formalId','stageKey','difficulty','slot','newestMechanism','unlockLevel'])assert.equal(q[k],slot[k]);
  const ready=q.acceptedBaseReadiness;assert(ready?.status==='ACCEPTED_ICED_PREFIX_READY_FOR_ONE_FIXED_MECHANISM_CONSTRUCTION');same(ready.base,base);same(ready.baseReceipt,ICED_FLIP_BASE);same(ready.independentMathematicsAudit,ICED_FLIP_BASE_AUDIT);assert.equal(ready.newSearches,0);assert.equal(ready.newLedgerClaims,0);assert.equal(ready.ledgerWrites,0);await check(ready.fileBindings);
  const input=await read(base.input),stem=path.join(PUBLIC_ATTEMPT_LEDGER,base.attempt.id);
  inspectAcceptedIcedLinkage(base,input,{request:await bindFile(stem+'.request.json'),result:await bindFile(stem+'.result.json'),sidecar:await bindFile(stem+'.v4-thawed-prefix-result.json'),planRecord:await bindFile(stem+'.v4-thawed-prefix-plan.json')});same(ready.input,input);
  const recorded=await bindFile(q.entryResultFile);for(const[k,v]of Object.entries(recorded))same(v,q[k],`Immutable entry sidecar differs: ${k}`);
  const c=q.construction,request=c.constructionAttempt,conStem=path.join(CONSTRUCTION_LEDGER,request.id),cs=await read(q.constructionSidecar),cp=await read(q.constructionPlan);
  assert.equal(path.resolve(q.entryResultFile),path.resolve(conStem+'.slot-result.json'));assert.equal(path.resolve(q.constructionSidecar.path),path.resolve(conStem+'.construction-result.json'));assert.equal(path.resolve(q.constructionPlan.path),path.resolve(c.planFile));
  same(cs,c);same(await bindFile(conStem+'.request.json'),request);const cr=await bindFile(conStem+'.result.json');assert.equal(cr.accepted,c.accepted);assert.equal(cr.status,c.status);assert.equal(cr.levelSha256,base.levelSha256);
  assert.equal(request.levelSha256,base.levelSha256);assert.equal(request.redesignOf,null);assert.equal(cp.inputLevelSha256,base.levelSha256);assert.equal(cp.inputRouteSha256,base.routeSha256);same(cp.configuration,plan.configuration);same(cp.slot,slot);assert.equal(cp.noStageOrMethodRetry,true);assert.equal(cp.hardWholeBoardLimit,10000);
  const ci=await bindFile(path.join(CONSTRUCTION_LEDGER,'identities',request.retryIdentitySha256+'.json'));assert.equal(ci.origin,request.identityOrigin);
  if(c.adaptation?.level){const alias=await bindFile(path.join(CONSTRUCTION_LEDGER,'aliases',request.retryIdentitySha256+'.json'));assert.equal(alias.constructionAttempt,request.id);assert.equal(alias.finalLevelSha256,levelSha256(c.adaptation.level));}
  if(!q.accepted)for(const p of [conStem+'.blocked.json',path.join(CONSTRUCTION_LEDGER,'identities',request.retryIdentitySha256+'.blocked.json')]){const b=await bindFile(p);assert.equal(b.attemptId,request.id);}
  const prior=await read(plan.priorBaseline);assert.equal(runtime.priorDailySlots.get(slot.formalId).sourceReportSha256,plan.priorBaseline.sha256);
  if(c.ok){const fresh=auditFixedIcedFlip(runtime,base,q.level,q.drags,prior.level,{configuration:q.configuration});same(fresh,q.strength.participation,'Actual four physical gates / six ice participation differs');same(fresh.priorComparison,q.strength.priorComparison);
   assert.equal(q.strength.numericIceUniformMinimumSevenClaimed,false);assert.equal(q.strength.kind,'fixed-four-flips-with-staggered-early-ice');
   const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);full(canonical,q.level,q.drags,c.U);full(independent,q.level,q.drags,c.U);report.canonicalReplay=canonical;report.independentReplay=independent;report.participation=fresh;
   const stat=await auditV4StaticCandidate(runtime,q);assert(stat.passed,stat.issues.join(';'));same(clean(stat),clean(q.staticAudit));report.staticAudit=stat;
  }
  const m=q.mathematicalProof;
  if(m){const st=path.join(PUBLIC_ATTEMPT_LEDGER,m.attempt.id);assertFixedIcedPublicProof(q,{request:await bindFile(st+'.request.json'),result:await bindFile(st+'.result.json'),planRecord:await bindFile(st+'.v4-plan.json')});
   same(projectIcePreservingConstraints(q.level,runtime),m.lowerBound.projection);same(m.toolchainBindings,runtime.toolchainBindings);same(m.lowerBound.result.iceBindings,runtime.toolchainBindings);
   const adaptation=m.acceptedBaseAdaptation;assert.equal(adaptation.baseAttemptId,base.attempt.id);assert.equal(adaptation.finalLevelSha256,q.levelSha256);same(await bindFile(path.join(PUBLIC_ATTEMPT_LEDGER,'v4-mechanism-inputs',adaptation.finalMechanismInputIdentity+'.json')),adaptation);
   if(!m.accepted)for(const p of [path.join(PUBLIC_ATTEMPT_LEDGER,m.attempt.identityOrigin+'.blocked.json'),path.join(PUBLIC_ATTEMPT_LEDGER,'identities',m.attempt.retryIdentitySha256+'.blocked.json')]){const b=await bindFile(p);assert.equal(b.attemptId,m.attempt.id);}
  }
  const selection=await read(plan.inputSelection),selected=[];for(const file of selection.files){const h=q.selectionContext.fileBindings[file];assert(h);selected.push(await read({path:file,sha256:h}));}
  const context=await prepareIcedFlipContext(runtime,ICED_FLIP_BASE,base,slot,selected,plan.inputSelection,{selectionAudit:plan.selectionAudit});await check(context.bindings);same(context.selectionBinding,q.selectionContext);
  if(c.ok){const design=context.inspect(q.level);assert(design.passed,design.issues.join(';'));same(design,q.design.admission);const diversity=auditV4Diversity([...selected,q],runtime.slots,{expectFull:false});assert.deepEqual(diversity.reasons,[]);same(diversity,q.design.diversity);report.design=design;}
  assert(q.history?.passed&&q.historyTerminalMembership?.passed);same(q.history.own.iced,base.plan.constructionEvidence);same(q.history.own.plain,base.plan.plainConstructionEvidence);
  await check(q.designBindings);await check(q.toolchainBindings);await check(q.assetBindings);await check(q.historyTerminalMembership.fileBindings);assert.equal(q.designToolchainSha256,levelSha256(q.designBindings));
  const snapshot=structuredClone(q.history.snapshot),entryRoot=snapshot.roots.find(r=>path.resolve(r.directory)===path.resolve(CONSTRUCTION_LEDGER));assert(entryRoot);
  entryRoot.files.push({path:q.entryResultFile,sha256:bindings[q.entryResultFile]});report.terminalMembership=await assertIcedTerminalHistoryMembership(snapshot,q);await check(report.terminalMembership.fileBindings);
  const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const p of Object.keys(compiled.metafile.inputs))await bindFile(p,false);
  report.status='INDEPENDENT_FIXED_ICED_FLIP_ACTUAL_PASS';report.acceptedCandidates=Number(q.accepted);report.environment={executionWorkspace:process.cwd(),toolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,currentRuntimeValidationClaimed:false};
 }catch(e){errors.push(e.stack??e.message);report.status='INDEPENDENT_FIXED_ICED_FLIP_ACTUAL_FAIL';}
 finally{for(const[absolute,v]of cached)if(await fs.readFile(absolute).then(sha).catch(()=>null)!==v.sha256)errors.push('Input changed during audit: '+absolute);
  const after=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(p=>p.endsWith('.request.json')).length;report.publicRequests={before,after};if(after!==before)errors.push('Public request membership changed during read-only audit');if(errors.length)report.status='INDEPENDENT_FIXED_ICED_FLIP_ACTUAL_FAIL';
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [p,h,out]=process.argv.slice(2);const q=await auditFixedIcedFlipActual({receipt:{path:p,sha256:h},output:out});console.log(JSON.stringify({status:q.status,accepted:q.acceptedCandidates,errors:q.errors.length}));if(q.errors.length)process.exitCode=1;}

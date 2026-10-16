import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {reservedGuardBudget} from '../formal-v3/reserved-guard-budget.mjs';
import {expectedIcePreservingLevel,ICE_PRESERVING_LOWER_METHOD} from '../formal-v3/ice-preserving-projection.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {ICED_FLIP_VERSION,ICED_FLIP_SLOT,ICED_FLIP_BASE,ICED_FLIP_BASE_AUDIT,ICED_FLIP_CONFIGURATION,constructFixedIcedFlip,auditFixedIcedFlip} from './fixed-iced-flip-construction.mjs';
import {assertAcceptedIcedPrefixBase} from './accepted-iced-prefix-base.mjs';
import {inspectAcceptedIcedHistory} from './accepted-iced-prefix-history.mjs';
import {assertLatestSevenHistoryUnchanged} from './latest-seven-history-preflight.mjs';
import {walkJson} from './native-batch-io.mjs';
import {withFixedIcedFlipAttempt,CONSTRUCTION_LEDGER} from './fixed-iced-flip-attempt.mjs';
import {prepareIcedFlipContext} from './fixed-iced-flip-context.mjs';
import {assertLowBandBatchPrivateNamespace} from './low-band-advanced-batch-contract.mjs';
import {capacityMechanismBaseOption} from './qualify-capacity-slot.mjs';
import {qualifyBoundedCandidateV4,PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {auditV4Diversity,V4_DIVERSITY_POLICY,V4_CATALOG_VERSION} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';

export const FIXED_ICED_FLIP_ENTRY_VERSION='daily300-one-audited-iced-prefix-four-flip-v1';
const OWN='tools/daily-challenge/formal-v4/qualify-fixed-iced-flip.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
/** A terminal membership check: only this call's precise ledger outputs may
 * be new. Existing bytes are independently rechecked by the entry below. */
export async function assertIcedTerminalHistoryMembership(snapshot,report,{publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,constructionLedgerDirectory=CONSTRUCTION_LEDGER}={}){
 const key=p=>path.resolve(p).toLowerCase(),allowed=new Set(),add=p=>{if(p)allowed.add(key(p));};
 const c=report.construction,r=c?.constructionAttempt,m=report.mathematicalProof,a=m?.attempt;
 add(c?.planFile);add(c?.resultFile);
 if(r){for(const suffix of ['.request.json','.result.json','.blocked.json'])add(path.join(constructionLedgerDirectory,r.id+suffix));
  add(path.join(constructionLedgerDirectory,r.identityOrigin+'.blocked.json'));
  for(const suffix of ['.json','.blocked.json'])add(path.join(constructionLedgerDirectory,'identities',r.retryIdentitySha256+suffix));
  // The configuration leaves shape/colour identity unchanged, explicitly
  // checked by the object-restoration audit before acceptance.
  add(path.join(constructionLedgerDirectory,'aliases',r.retryIdentitySha256+'.json'));}
 if(a){for(const suffix of ['.request.json','.result.json','.v4-plan.json'])add(path.join(publicLedgerDirectory,a.id+suffix));
  add(path.join(publicLedgerDirectory,a.identityOrigin+'.blocked.json'));add(path.join(publicLedgerDirectory,'identities',a.retryIdentitySha256+'.blocked.json'));}
 if(m?.acceptedBaseAdaptation?.finalMechanismInputIdentity)add(path.join(publicLedgerDirectory,'v4-mechanism-inputs',m.acceptedBaseAdaptation.finalMechanismInputIdentity+'.json'));
 const additions=[],fileBindings={};
 for(const root of snapshot.roots){const old=new Set(root.files.map(d=>key(d.path))),current=await walkJson(root.directory),now=new Set(current.map(key));
  for(const d of root.files)assert(now.has(key(d.path)),'Historical ledger member disappeared');
  for(const file of current)if(!old.has(key(file))){assert(allowed.has(key(file)),`Unrelated ledger addition during fixed construction: ${file}`);const h=sha(await fs.readFile(file));additions.push({path:file,sha256:h});fileBindings[file]=h;}}
 return{passed:true,allSevenRootMembershipsChecked:true,additions,fileBindings,onlyExactCurrentAttemptOutputsAllowed:true};
}
export function assertFixedIcedFlipPlan(p,slots,{qualificationOnly=false}={}){
 assert.equal(p.version,FIXED_ICED_FLIP_ENTRY_VERSION);assert.equal(p.scope,300);assert.equal(p.maximumBaseAdaptations,1);
 const slot=slots.find(s=>s.formalId===ICED_FLIP_SLOT);assert.deepEqual(p.slot,slot);assert(slot);
 for(const d of [p.base,p.independentActualAudit,p.inputSelection,p.priorBaseline])assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));
 assert.equal(p.failedBaseFallbackAllowed,false);assert.equal(p.routeRepairAllowed,false);assert.equal(p.freshOriginalLowerRequired,true);
 assert.equal(p.floor,31);assert.equal(p.maximumConstructionWorlds,10000);assert.equal(p.maximumProofWorlds,10000);
 if(!qualificationOnly){assert.deepEqual(p.base,ICED_FLIP_BASE);assert.deepEqual(p.independentActualAudit,ICED_FLIP_BASE_AUDIT);assert.deepEqual(p.configuration,ICED_FLIP_CONFIGURATION);}
 return slot;
}
export async function qualifyFixedIcedFlip(runtime,{plan:planDescriptor,planReview,selected=[],qualificationOnly=false,
 publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,constructionLedgerDirectory=CONSTRUCTION_LEDGER,
 worldBudget,proofOptions={},executionEnvironment}={}){
 assertV4Runtime(runtime);await assertLowBandBatchPrivateNamespace(qualificationOnly,publicLedgerDirectory,constructionLedgerDirectory);
 assert(Object.keys(proofOptions).every(k=>['lowerBudget','routeBudget'].includes(k)));
 if(worldBudget)assert(Object.keys(worldBudget).length===1&&Number.isSafeInteger(worldBudget.maxStates)&&worldBudget.maxStates>0&&worldBudget.maxStates<=10000);
 if(!qualificationOnly){assert.equal(path.resolve(publicLedgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER));assert.equal(path.resolve(constructionLedgerDirectory),path.resolve(CONSTRUCTION_LEDGER));assert.equal(worldBudget,undefined);assert.deepEqual(proofOptions,{});}
 const bindings={},read=async(d,json=true)=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const b=await fs.readFile(d.path),h=sha(b);assert.equal(h,d.sha256,`Changed bound file ${d.path}`);if(bindings[d.path])assert.equal(bindings[d.path],h);bindings[d.path]=h;return json?JSON.parse(b):b;};
 const merge=map=>{for(const[p,h]of Object.entries(map??{})){if(bindings[p])assert.equal(bindings[p],h,'Binding conflict');bindings[p]=h;}};
 const plan=await read(planDescriptor),slot=assertFixedIcedFlipPlan(plan,runtime.slots,{qualificationOnly});
 if(!qualificationOnly){const review=await read(planReview);assert.equal(review.status,'INDEPENDENT_FIXED_ICED_FLIP_PLAN_PASS');assert.deepEqual(review.plan,planDescriptor);assert.deepEqual(review.errors,[]);assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);for(const[p,h]of Object.entries(review.fileBindings))await read({path:p,sha256:h},false);}
 const readiness=qualificationOnly?null:await assertAcceptedIcedPrefixBase(runtime,plan.base,{independentAudit:plan.independentActualAudit,publicLedgerDirectory,constructionLedgerDirectory});merge(readiness?.fileBindings);
 const base=await read(plan.base);assert(base.accepted&&base.levelSha256===levelSha256(base.level));assert.equal(base.routeSha256,routeSha256(base.drags));
 const requestFile=path.join(publicLedgerDirectory,`${base.attempt.id}.request.json`),resultFile=path.join(publicLedgerDirectory,`${base.attempt.id}.result.json`);
 const requestBytes=await fs.readFile(requestFile),resultBytes=await fs.readFile(resultFile),request=JSON.parse(requestBytes),result=JSON.parse(resultBytes);
 merge({[requestFile]:sha(requestBytes),[resultFile]:sha(resultBytes)});assert.deepEqual(request,base.attempt);assert.equal(request.levelSha256,base.levelSha256);
 assert(result.accepted&&result.levelSha256===base.levelSha256&&result.status===base.status);assert.deepEqual(result.lower,base.lowerBound.result);assert.equal(result.upper,null);
 const history=qualificationOnly?null:await inspectAcceptedIcedHistory(base,{},bindings);
 const prior=runtime.priorDailySlots.get(slot.formalId);assert(prior);assert.equal(plan.priorBaseline.path,prior.sourceReport);assert.equal(plan.priorBaseline.sha256,prior.sourceReportSha256);
 const priorReceipt=await read(plan.priorBaseline);assert.equal(levelSha256(priorReceipt.level),prior.levelSha256);
 const environment=prefixExecutionEnvironment(runtime,executionEnvironment),source=await currentMainlineSourceBinding(runtime,environment,base.sourceLevelId,{qualificationOnly});merge(environment.bindings);merge(source.bindings);
 const context=await prepareIcedFlipContext(runtime,plan.base,base,slot,selected,qualificationOnly?null:plan.inputSelection,{selectionAudit:plan.selectionAudit,qualificationOnly,publicLedgerDirectory,constructionLedgerDirectory});merge(context.bindings);
 const opening=context.inspect(base.level);assert(opening.passed,opening.issues.join(';'));
 const compiled=await build({entryPoints:[OWN],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))merge({[p]:sha(await fs.readFile(p))});merge(runtime.designBindings);merge(runtime.toolchainBindings);
 const lowerBudget=reservedGuardBudget({...{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},...proofOptions.lowerBudget});
 const routeBudget=reservedGuardBudget(proofOptions.routeBudget);
 const report={schemaVersion:4,catalogVersion:V4_CATALOG_VERSION,icedFlipSlotVersion:FIXED_ICED_FLIP_ENTRY_VERSION,...slot,
  baseReceipt:{...plan.base,request:{path:requestFile,sha256:sha(requestBytes)},result:{path:resultFile,sha256:sha(resultBytes)}},
  baseLevelSha256:base.levelSha256,baseRouteSha256:base.routeSha256,sourceLevelId:base.sourceLevelId,
  fixedPlan:planDescriptor,configuration:plan.configuration,acceptedBaseReadiness:readiness,history,priorBaseline:plan.priorBaseline,
  executionEnvironment:environment,currentSourceBinding:source,selectionContext:context.selectionBinding,
  designBindings:bindings,designToolchainSha256:levelSha256(bindings),designInputBindings:context.bindings,
  toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  accepted:false,catalogEligible:false,qualificationOnly,status:'ICED_FLIP_PREFLIGHT_COMPLETE',reasons:[],L:null,U:null,constructionAttemptStarted:false,finalProofStarted:false,
  mathematicalEvidenceValidated:false,mechanismStrengthValidated:false,designValidated:false,pointerValidated:false,timeValidated:false,formalReady:false,productionChanged:false,currentRuntimeValidationClaimed:false};
 try{
  if(history)await assertLatestSevenHistoryUnchanged(history.snapshot);
  const c=await withFixedIcedFlipAttempt(runtime,base,slot,b=>constructFixedIcedFlip(runtime,b,slot,priorReceipt.level,{configuration:plan.configuration,qualificationOnly,worldBudget}),
   {ledgerDirectory:constructionLedgerDirectory,publicLedgerDirectory,qualificationOnly,configuration:plan.configuration});
  report.construction=c;report.constructionAttemptStarted=!!c.constructionAttemptStarted;
  if(c.resultFile)report.constructionSidecar={path:c.resultFile,sha256:sha(await fs.readFile(c.resultFile))};
  if(c.planFile)report.constructionPlan={path:c.planFile,sha256:sha(await fs.readFile(c.planFile)),canonicalSha256:c.planSha256};
  if(!c.ok){report.status='REJECTED_FIXED_ICED_FLIP_CONSTRUCTION';return report;}
  const candidate={...slot,sourceLevelId:base.sourceLevelId,level:c.level,drags:c.drags,levelSha256:levelSha256(c.level),routeSha256:routeSha256(c.drags)};Object.assign(report,candidate);
  const audit=auditFixedIcedFlip(runtime,base,c.level,c.drags,priorReceipt.level,{configuration:plan.configuration,qualificationOnly,worldBudget});
  report.strength={version:ICED_FLIP_VERSION,kind:'fixed-four-flips-with-staggered-early-ice',mechanism:'flip-door',passed:audit.passed,participation:audit,priorComparison:audit.priorComparison,
   numericIceUniformMinimumSevenClaimed:false,searchAccounting:c.provenance};assert(audit.passed);report.mechanismStrengthValidated=true;
  report.staticAudit=await auditV4StaticCandidate(runtime,candidate);assert(report.staticAudit.passed,report.staticAudit.issues.join(';'));
  report.assetBindings=Object.fromEntries(Object.entries(report.staticAudit.assetBindings).map(([p,h])=>['public/'+p,h]));
  report.design={policy:V4_DIVERSITY_POLICY,diversity:auditV4Diversity([...selected,candidate],runtime.slots,{expectFull:false}),admission:context.inspect(c.level)};
  assert.equal(report.design.diversity.reasons.length,0);assert(report.design.admission.passed,report.design.admission.issues.join(';'));report.designValidated=true;
  report.actualConstructedU=audit.U;if(audit.U<31){report.status='REJECTED_CONSTRUCTED_U_BELOW_D3';return report;}
  await read(plan.base);report.finalProofStarted=true;
  const math=await qualifyBoundedCandidateV4(runtime,candidate,{qualificationOnly,ledgerDirectory:publicLedgerDirectory,lowerBudget,routeBudget,
   mechanismBaseReceipt:capacityMechanismBaseOption(base,c.level,plan.base)});report.mathematicalProof=math;
  for(const k of ['attempt','lowerBound','route','L','U','attemptPlan','attemptPlanSha256'])if(math[k]!==undefined)report[k]=math[k];
  assert.equal(math.levelSha256,candidate.levelSha256);assert.equal(math.routeSha256,candidate.routeSha256);
  if(math.lowerBound){assert.equal(math.lowerBound.method,ICE_PRESERVING_LOWER_METHOD,'Only the qualified ice-preserving projection may certify this final object');
   assert.equal(math.lowerBound.inputLevelSha256,candidate.levelSha256);assert.equal(math.lowerBound.projectedLevelSha256,levelSha256(expectedIcePreservingLevel(c.level)));}
  if(!math.accepted){report.status='REJECTED_FINAL_FRESH_ICED_FLIP_PROOF';return report;}
  assert.equal(math.L,31);assert.equal(math.U,audit.U);report.accepted=true;report.mathematicalEvidenceValidated=true;report.status='FIXED_ICED_FLIP_D3_CANDIDATE_VERIFIED_AWAITING_POINTER';return report;
 }catch(e){report.status='FIXED_ICED_FLIP_REJECTED';report.reasons.push(e.message);return report;}
 finally{
  const all={...bindings,...report.assetBindings};for(const d of [report.constructionPlan,report.constructionSidecar])if(d)all[d.path]=d.sha256;
  for(const[p,h]of Object.entries(all))if(await fs.readFile(p).then(sha).catch(()=>null)!==h){report.accepted=false;report.status='FIXED_ICED_FLIP_BINDING_CHANGED';report.reasons.push(p);}
  if(history)try{report.historyTerminalMembership=await assertIcedTerminalHistoryMembership(history.snapshot,report,{publicLedgerDirectory,constructionLedgerDirectory});}
  catch(e){report.accepted=false;report.status='FIXED_ICED_FLIP_HISTORY_MEMBERSHIP_CHANGED';report.reasons.push(e.message);}
  report.catalogEligible=report.accepted&&!qualificationOnly;report.terminalBlocked=report.constructionAttemptStarted&&!report.accepted;
  if(!report.accepted)report.mathematicalEvidenceValidated=false;
  if(report.constructionAttemptStarted){
   const r=report.construction.constructionAttempt;report.entryResultFile=path.join(constructionLedgerDirectory,`${r.id}.slot-result.json`);
   if(report.terminalBlocked)for(const p of [path.join(constructionLedgerDirectory,r.identityOrigin+'.blocked.json'),path.join(constructionLedgerDirectory,'identities',r.retryIdentitySha256+'.blocked.json')]){
    await fs.writeFile(p,JSON.stringify({attemptId:r.id,status:report.status,slotResult:report.entryResultFile})+'\n',{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});}
   try{await fs.writeFile(report.entryResultFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}catch(e){report.accepted=false;report.catalogEligible=false;report.mathematicalEvidenceValidated=false;report.terminalBlocked=true;report.status='FIXED_ICED_FLIP_RESULT_NOT_PERSISTED';report.reasons.push(e.message);
    for(const p of [path.join(constructionLedgerDirectory,r.identityOrigin+'.blocked.json'),path.join(constructionLedgerDirectory,'identities',r.retryIdentitySha256+'.blocked.json')])await fs.writeFile(p,JSON.stringify({attemptId:r.id,status:report.status,slotResult:report.entryResultFile})+'\n',{flag:'wx'}).catch(x=>{if(x.code!=='EEXIST')throw x;});}
  }
 }
}

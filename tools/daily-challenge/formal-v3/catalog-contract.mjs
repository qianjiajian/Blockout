import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,BANDS,auditStaticCandidate} from '../formal-v2/contract.mjs';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {loadBoundedRuntime,verifyBoundedCandidate,boundedBudget} from './bounded-proof.mjs';
import {ICE_PROOF_VERSION} from './bounded-ice-proof.mjs';
import {ICE_PRESERVING_LOWER_METHOD,ICE_PRESERVING_PROJECTION,expectedIcePreservingLevel} from './ice-preserving-projection.mjs';
import {intensify,intensityTargets,auditMechanismParticipation,mechanismInventory,INTENSITY_VERSION} from './mechanism-intensity.mjs';
import {auditDiversity,compareLayouts,describeLayout,DIVERSITY_POLICY} from './diversity.mjs';
import {CAPACITY_STAGES,CAPACITY_INTENSITY_VERSION,capacityTargets,auditCapacityIntensity} from './capacity-intensity-policy.mjs';
import {composeCapacity} from './capacity-compose.mjs';

export const CATALOG_VERSION='daily-formal-v3-catalog-1';
const foundational=new Set(['color-exit','irregular-block','irregular-board']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=value=>value===undefined?null:levelSha256(value);
const irregularCount=level=>level.blocks.filter(b=>b.shape.length!==(Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1)).length;
const bindingsPresent=bindings=>bindings&&Object.keys(bindings).length>0&&Object.values(bindings).every(s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s));
/** Construction is a separate pre-proof task, never a second attempt on a
 * failed final proof. Its conservative reservations include dynamic held
 * worlds; neither coordinate reachability nor a provided route waives it. */
export function inspectCapacityConstructionAccounting(accounting,{levelSha256:levelHash,routeSha256:routeHash,difficulty}={}){
 const issues=[],a=accounting,c=a?.constructionAccounting;
 if(!a||a.taskBoundary!=='finite-construction-before-separate-first-final-object-proof'||a.budgetDeclaredBeforeAdaptation!==true
  ||a.outputLevelSha256!==levelHash||a.outputRouteSha256!==routeHash||a.fullBoardSolverInvocations!==0
  ||!bindingsPresent({level:a.inputLevelSha256,route:a.inputRouteSha256})
  ||a.maximumPrimaryCounts!==difficulty+1||!Number.isSafeInteger(a.maxAttemptsPerCount)||a.maxAttemptsPerCount<1||a.maxAttemptsPerCount>3)
  issues.push('capacity-construction-task-binding');
 if(!c||c.version!=='capacity-world-reservations-v1'||!Number.isSafeInteger(c.maxStates)||c.maxStates<1||c.maxStates>10000
  ||!Number.isSafeInteger(c.fullWorldReservations)||c.fullWorldReservations<1||c.fullWorldReservations>c.maxStates
  ||!Number.isSafeInteger(c.expanded)||c.expanded<0||c.expanded>c.fullWorldReservations
  ||c.conservativeFullBoardStateUpperBound!==c.fullWorldReservations||c.exactDistinctStateCountClaimed!==false
  ||!c.kinds||Object.values(c.kinds).some(n=>!Number.isSafeInteger(n)||n<1)
  ||Object.values(c.kinds??{}).reduce((n,v)=>n+v,0)!==c.fullWorldReservations
  ||a?.searchPerformed!==(c.expanded>0))issues.push('capacity-construction-accounting');
 return issues;
}
const baselineFile='deliverables/daily-formal-v3-20261008/mechanisms/old450-baseline.json';
const designFiles=['tools/daily-challenge/formal-v3/catalog-contract.mjs','tools/daily-challenge/formal-v3/diversity.mjs',
 'tools/daily-challenge/formal-v3/mechanism-intensity.mjs','tools/daily-challenge/formal-v2/geometry.mjs',
 'tools/daily-challenge/formal-v2/mechanism-decorate.mjs',baselineFile,
 'tools/daily-challenge/formal-v3/capacity-intensity-policy.mjs',
 'tools/daily-challenge/formal-v3/capacity-primary-adapter.mjs',
 'tools/daily-challenge/formal-v3/capacity-compose.mjs'];
export async function loadV3CatalogRuntime(){
 const runtime=await loadBoundedRuntime();
 const designBindings=Object.fromEntries(await Promise.all(designFiles.map(async f=>[f,hash(await fs.readFile(f))])));
 const baseline=JSON.parse(await fs.readFile(baselineFile,'utf8'));
 if(baseline.rows?.length!==450||new Set(baseline.rows.map(r=>r.formalId)).size!==450)throw Error('Complete prior 450-slot inventory baseline required');
 return{...runtime,designBindings,designToolchainSha256:levelSha256(designBindings),priorDailySlots:new Map(baseline.rows.map(r=>[r.formalId,r]))};
}

/** Slot identity is assigned before proof, so the final named object is bound. */
export async function qualifyV3Slot(runtime,base,slot,{selected=[],intensityOptions={},proofOptions={}}={}){
 if(!base.accepted||!base.level||!base.drags||base.levelSha256!==levelSha256(base.level))throw Error('Verified, intact exploratory base required');
 if(base.difficulty!==slot.difficulty)throw Error('Exploratory difficulty does not match slot');
 const expected=expectedDailySlots(runtime.MECHANISM_GUIDE).find(s=>s.formalId===slot.formalId);
 if(!expected||levelSha256(expected)!==levelSha256(slot))throw Error('Unknown or changed slot contract');
 const level=structuredClone(base.level);level.name=`每日挑战 ${slot.newestMechanism} ${slot.difficulty}-${slot.slot}`;
 level.difficulty=slot.difficulty===1?'hard':'super';
 let candidate={...slot,sourceLevelId:base.sourceLevelId,level,drags:structuredClone(base.drags)};
 let strength;
 if(foundational.has(slot.newestMechanism)){
  const irregularBodies=irregularCount(level);
  strength={version:INTENSITY_VERSION,kind:'foundation-geometry',mechanism:slot.newestMechanism,
   passed:runtime.mechanismsUsedByDailyLevel(level).includes(slot.newestMechanism)&&(slot.newestMechanism!=='irregular-block'||irregularBodies>=2),
   irregularBodies,minimumIrregularBodies:slot.newestMechanism==='irregular-block'?2:null,policyNotUserFixedQuota:true,
   numericOrDeviceQuotaApplicable:false,note:'Geometry is audited through original blocks, board outline and diversity; no artificial numeric counters.'};
 }else if(intensityOptions.capacityAware===true&&CAPACITY_STAGES.includes(slot.newestMechanism)){
  const adapted=await composeCapacity(runtime,{...base,level,drags:candidate.drags},slot,intensityOptions.priorLevel);
  if(!adapted.ok)return{...slot,status:'REJECTED_CAPACITY_ADAPTATION',accepted:false,formalReady:false,adaptation:adapted,baseLevelSha256:base.levelSha256};
  candidate={...candidate,level:adapted.level,drags:adapted.drags};
  strength={version:CAPACITY_INTENSITY_VERSION,kind:'capacity-active-mechanisms',mechanism:slot.newestMechanism,
   passed:adapted.audit.passed,targets:adapted.targets,participation:adapted.audit,
   searchAccounting:adapted.provenance,adaptationProvenance:{primaryInstances:adapted.primaryInstances,
    addedSupport:adapted.addedSupport,failedKnownWitnessAdaptations:adapted.failures},
   priorComparison:{priorLevelSha256:levelSha256(intensityOptions.priorLevel),...adapted.audit.priorComparison}};
 }else{
  const adapted=await intensify(level,candidate.drags,slot.newestMechanism,{...intensityOptions,runtime,difficulty:slot.difficulty,
   sourceLevelId:base.sourceLevelId,formalId:slot.formalId,idPrefix:slot.formalId});
  if(!adapted.ok)return{...slot,status:'REJECTED_MECHANISM_ADAPTATION',accepted:false,formalReady:false,adaptation:adapted,baseLevelSha256:base.levelSha256};
  candidate={...candidate,level:adapted.level,drags:adapted.drags,...(adapted.timeSchedule?{timeSchedule:adapted.timeSchedule}:{})};
  strength={version:INTENSITY_VERSION,kind:'active-mechanisms',mechanism:slot.newestMechanism,passed:adapted.participation.pass,
   targets:adapted.targets,participation:adapted.participation,searchAccounting:adapted.searchAccounting,
   adaptationProvenance:adapted.provenance,priorComparison:adapted.priorComparison};
 }
 if(!strength.passed)return{...slot,status:'REJECTED_MECHANISM_STRENGTH',accepted:false,formalReady:false,strength,baseLevelSha256:base.levelSha256};
 return finishQualification(runtime,candidate,base,slot,strength,{selected,proofOptions});
}

/** Native mechanism-first designers supply an already validated complete route.
 * Strength and the final named object are still independently rechecked here. */
export async function qualifyV3DesignedSlot(runtime,packet,slot,{selected=[],priorLevel,proofOptions={}}={}){
 if(!packet.accepted||!packet.level||!packet.drags||packet.levelSha256!==levelSha256(packet.level))throw Error('Intact accepted mechanism-first packet required');
 const expected=expectedDailySlots(runtime.MECHANISM_GUIDE).find(s=>s.formalId===slot.formalId);
 if(!expected||levelSha256(expected)!==levelSha256(slot)||packet.stageKey!==slot.stageKey||packet.difficulty!==slot.difficulty)throw Error('Mechanism-first slot mismatch');
 if(foundational.has(slot.newestMechanism))throw Error('Foundation layouts use the plain base qualifier');
 const level=structuredClone(packet.level);level.name=`每日挑战 ${slot.newestMechanism} ${slot.difficulty}-${slot.slot}`;
 level.difficulty=slot.difficulty===1?'hard':'super';
 const targets=intensityTargets(slot.newestMechanism,slot.difficulty);
 const replay=replayDecorated(runtime,level,packet.drags,packet.timeSchedule);
 const participation=auditMechanismParticipation(level,packet.drags,replay,slot.newestMechanism,targets);
 const strength={version:INTENSITY_VERSION,kind:'active-mechanisms',mechanism:slot.newestMechanism,passed:participation.pass,
  targets,participation,searchAccounting:{knownRouteReplay:true,fullBoardSolverInvocations:0,originalDesignAttempt:packet.attempt?.id??null},
  adaptationProvenance:{mechanismFirst:true,designInputLevelSha256:packet.levelSha256},
  priorComparison:priorLevel?{scope:'exact prior slot object',priorLevelSha256:levelSha256(priorLevel),
   priorInstances:mechanismInventory(priorLevel)[slot.newestMechanism],currentInstances:mechanismInventory(level)[slot.newestMechanism],
   instanceIncrease:participation.instanceCount-mechanismInventory(priorLevel)[slot.newestMechanism].length}:null};
 if(!participation.pass)return{...slot,status:'REJECTED_MECHANISM_STRENGTH',accepted:false,formalReady:false,strength};
 const candidate={...slot,sourceLevelId:packet.sourceLevelId,level,drags:packet.drags,...(packet.timeSchedule?{timeSchedule:packet.timeSchedule}:{})};
 return finishQualification(runtime,candidate,packet,slot,strength,{selected,proofOptions});
}

async function finishQualification(runtime,candidate,base,slot,strength,{selected,proofOptions}){
 const source=runtime.LEVELS.find(s=>s.id===base.sourceLevelId);
 const sourceComparison=compareLayouts(candidate.level,source);
 const diversity=auditDiversity([...selected,candidate]);
 if(diversity.reasons.length)return{...slot,status:'REJECTED_PARTIAL_DIVERSITY',accepted:false,formalReady:false,diversity,
  baseLevelSha256:base.levelSha256,levelSha256:levelSha256(candidate.level)};
 const proof=await verifyBoundedCandidate(runtime,candidate,{...proofOptions,allowRevalidation:true});
 return{...proof,catalogVersion:CATALOG_VERSION,newestMechanism:slot.newestMechanism,slot:slot.slot,
  baseLevelSha256:base.levelSha256,baseRouteSha256:routeSha256(base.drags),strength,
  design:{passed:!diversity.reasons.length,policy:DIVERSITY_POLICY,sourceComparison,
   boardOutlineSha256:describeLayout(candidate.level).boardOutlineSha256,
   retainsSourceBoard:boardBaselineSha256(candidate.level)===boardBaselineSha256(source),
   designBindings:runtime.designBindings,designToolchainSha256:runtime.designToolchainSha256},
  formalReady:false,productionChanged:false,pointerValidated:false,timeValidated:false};
}

/** Inspect recorded accounting; a receipt cannot turn missing counters into zero. */
export function inspectSearchAccounting(search,label){
 const issues=[];
 if(!search)return[`${label}:missing-search`];
 if(!search.budget)issues.push(`${label}:missing-budget`);
 for(const key of Object.keys(boundedBudget()))if(!Object.hasOwn(search.budget??{},key))issues.push(`${label}:missing-budget-${key}`);
 try{boundedBudget(search.budget);}catch{issues.push(`${label}:invalid-budget`);}
 for(const field of ['discoveredStates','exploredStates','attemptedTransitions','microDiscoveredStates','microExploredStates']){
  if(!Number.isSafeInteger(search[field])||search[field]<0)issues.push(`${label}:missing-or-invalid-${field}`);
 }
 for(const field of ['discoveredStates','exploredStates'])if(search[field]>10000||search[field]>search.budget?.maxStates)issues.push(`${label}:board-budget-exceeded`);
 if(search.visitedStates!==search.discoveredStates||search.exploredStates>search.discoveredStates)issues.push(`${label}:inconsistent-board-counts`);
 if(search.rawFullBoardStates!==search.discoveredStates||search.rawExploredStates!==search.exploredStates)
  issues.push(`${label}:missing-or-inconsistent-raw-board-counts`);
 for(const [quotient,raw]of [['quotientDiscoveredStates','discoveredStates'],['quotientExploredStates','exploredStates']])
  if(Object.hasOwn(search,quotient)&&(!Number.isSafeInteger(search[quotient])||search[quotient]<0||search[quotient]>search[raw]))
   issues.push(`${label}:inconsistent-quotient-board-counts`);
 if(!Number.isFinite(search.elapsedMilliseconds)||search.elapsedMilliseconds<0||typeof search.termination!=='string'||!search.termination)issues.push(`${label}:missing-elapsed-or-termination`);
 if(search.attemptedTransitions>search.budget?.maxTransitions)issues.push(`${label}:transition-budget-exceeded`);
 if(search.microDiscoveredStates>search.budget?.maxMicroStates)issues.push(`${label}:micro-budget-exceeded`);
 if(search.microExploredStates>search.microDiscoveredStates)issues.push(`${label}:inconsistent-micro-counts`);
 return issues;
}

export function inspectV3Receipt(report,source,slot){
 const issues=[],band=BANDS[slot.difficulty];
 if(!report?.level||!Array.isArray(report.drags))return['missing-final-level-or-route'];
 if(report.catalogVersion!==CATALOG_VERSION||report.schemaVersion!==3)issues.push('wrong-catalog-or-proof-version');
 for(const k of ['formalId','stageKey','difficulty','newestMechanism','slot'])if(report[k]!==slot[k])issues.push(`slot-mismatch:${k}`);
 const actual=levelSha256(report.level),routeHash=routeSha256(report.drags);
 if(actual!==report.levelSha256||routeHash!==report.routeSha256)issues.push('level-or-route-hash-mismatch');
 if(!source||source.id!==report.sourceLevelId||levelSha256(source)!==report.sourceLevelSha256)issues.push('source-binding');
 if(!report.accepted||report.status!=='BOUNDED_SPATIAL_VERIFIED_AWAITING_V3_DESIGN_AND_POINTER')issues.push('not-bounded-verified');
 if(!Number.isSafeInteger(report.L)||!Number.isSafeInteger(report.U)||report.L<band.lower||report.U<report.L||band.upper!==null&&report.U>band.upper)issues.push('difficulty-band');
 if(report.dailyBudgetRuleVersion!=='1.154.0'||!report.dailyBudgetRuleSha256)issues.push('unbound-10000-rule');
 if(!report.staticAudit?.passed||report.staticAudit.levelSha256!==actual)issues.push('static-audit-binding');
 const route=report.route,lower=report.lowerBound;
 if(route?.inputLevelSha256!==actual||route?.routeSha256!==routeHash)issues.push('route-binding');
 for(const k of ['canonicalReplay','independentReplay'])if(!route?.[k]?.valid||!route[k].complete||route[k].failed||route[k].nonClearingDrags!==report.U)issues.push(`route-incomplete:${k}`);
 if(lower?.inputLevelSha256!==actual||lower?.requiredFloor!==band.lower||lower?.result?.floor!==band.lower||lower?.result?.status!=='threshold-proven'
  ||!lower?.result?.thresholdProven||lower?.result?.termination!=='below-threshold-exhausted')issues.push('lower-binding');
 if(lower?.result?.sourceLevelSha256!==(lower?.projectedLevelSha256??actual))issues.push('lower-search-object-binding');
 if(lower?.projection&&(lower.projection.sourceLevelSha256!==actual||lower.projection.projectedLevelSha256!==lower.projectedLevelSha256
  ||digest(lower.projection.projectedLevel)!==lower.projectedLevelSha256))issues.push('projection-binding');
 if(['v3-native-static-ice','v3-native-static-ice-joint-search',ICE_PRESERVING_LOWER_METHOD].includes(lower?.method)){
  if(lower.result.contractVersion!==ICE_PROOF_VERSION||lower.result.iceProofSha256!==report.toolchainSha256
   ||digest(lower.result.iceBindings)!==digest(report.toolchainBindings))
   issues.push('native-ice-proof-binding');
  if(lower.method===ICE_PRESERVING_LOWER_METHOD){
   try{
    if(lower.projection?.method!==ICE_PRESERVING_PROJECTION||lower.projectedLevelSha256!==levelSha256(expectedIcePreservingLevel(report.level)))
     issues.push('ice-preserving-projection-binding');
   }catch{issues.push('unsupported-ice-preserving-projection-source');}
  }else if(lower.projection!==null||lower.projectedLevelSha256!==null)issues.push('native-ice-proof-binding');
 }
 issues.push(...inspectSearchAccounting(lower?.result,'lower'));
 if(route?.search)issues.push(...inspectSearchAccounting(route.search,'upper'));
 else if(!route?.witnessValidation?.providedRoute||route?.witnessValidation?.searchPerformed!==false||route?.witnessValidation?.fullBoardSearchStates!==0)issues.push('missing-upper-validation-accounting');
 if(!bindingsPresent(report.toolchainBindings)||levelSha256(report.toolchainBindings)!==report.toolchainSha256)issues.push('proof-tool-binding');
 if(!report.design?.passed||!report.design.retainsSourceBoard||digest(report.design.policy)!==levelSha256(DIVERSITY_POLICY))issues.push('design-gate');
 if(!bindingsPresent(report.design?.designBindings)||levelSha256(report.design.designBindings)!==report.design.designToolchainSha256)issues.push('design-tool-binding');
 if(source&&boardBaselineSha256(source)!==boardBaselineSha256(report.level))issues.push('actual-source-board-mismatch');
 if(slot.newestMechanism==='irregular-block'&&irregularCount(report.level)<2)issues.push('foundation-irregular-instance-count');
 const capacity=report.strength?.kind==='capacity-active-mechanisms';
 if(!report.strength?.passed||report.strength.mechanism!==slot.newestMechanism
  ||report.strength.version!==(capacity?CAPACITY_INTENSITY_VERSION:INTENSITY_VERSION))issues.push('mechanism-strength');
 if(capacity){
  issues.push(...inspectCapacityConstructionAccounting(report.strength.searchAccounting,{levelSha256:actual,routeSha256:routeHash,difficulty:slot.difficulty}));
  if(!CAPACITY_STAGES.includes(slot.newestMechanism))issues.push('unreviewed-capacity-stage');
  else if(digest(report.strength.targets)!==levelSha256(capacityTargets(slot.newestMechanism,slot.difficulty)))issues.push('unreviewed-strength-targets');
  const audit=report.strength.participation;
  if(!audit?.passed||audit.levelSha256!==actual||audit.routeSha256!==routeHash
   ||digest(audit.targets)!==digest(report.strength.targets))issues.push('capacity-audit-binding');
 }else if(!foundational.has(slot.newestMechanism)&&digest(report.strength?.targets)!==levelSha256(intensityTargets(slot.newestMechanism,slot.difficulty)))issues.push('unreviewed-strength-targets');
 if(!foundational.has(slot.newestMechanism)&&(!report.strength?.priorComparison||!(report.strength.priorComparison.instanceIncrease>0)))issues.push('missing-prior-slot-strength-increase');
 if(report.timeSchedule){
  if(report.timeScheduleSha256!==levelSha256(report.timeSchedule))issues.push('time-schedule-hash');
  for(const k of ['canonicalReplay','independentReplay'])if(!route?.[k]?.simulationTimeValidated)issues.push(`schedule-not-replayed:${k}`);
 }
 return issues;
}

/** A complete mathematical/design inventory still cannot claim Pointer or formal acceptance. */
export async function auditV3Catalog(runtime,records,{expectFull=false}={}){
 const expected=expectedDailySlots(runtime.MECHANISM_GUIDE),byId=new Map(),duplicateIds=[];
 for(const r of records){if(byId.has(r.formalId))duplicateIds.push(r.formalId);byId.set(r.formalId,r);}
 const freshHash=new Map(),fileHash=async f=>{if(!freshHash.has(f))freshHash.set(f,await fs.readFile(f).then(hash).catch(()=>null));return freshHash.get(f);};
 const rows=[];
 for(const slot of expected){
  const r=byId.get(slot.formalId);if(!r){rows.push({...slot,status:'PENDING_CANDIDATE'});continue;}
  const source=runtime.LEVELS.find(s=>s.id===r.sourceLevelId),issues=inspectV3Receipt(r,source,slot);
  if(expectFull&&!r.baseInputFile)issues.push('missing-exploratory-source-record');
  if(r.baseInputFile){
   try{
    const bytes=await fs.readFile(r.baseInputFile),base=JSON.parse(bytes);
    if(hash(bytes)!==r.baseInputFileSha256||!base.accepted||base.levelSha256!==r.baseLevelSha256
     ||levelSha256(base.level)!==r.baseLevelSha256||routeSha256(base.drags)!==r.baseRouteSha256)
     issues.push('exploratory-source-record-binding');
   }catch{issues.push('missing-or-invalid-exploratory-source-record');}
  }
  if(digest(r.toolchainBindings)!==digest(runtime.toolchainBindings))issues.push('incomplete-or-changed-proof-tool-set');
  if(digest(r.design?.designBindings)!==digest(runtime.designBindings))issues.push('incomplete-or-changed-design-tool-set');
  if(r.ruleVersion!==runtime.boundedRuleVersion||r.ruleSha256!==runtime.boundedRuleSha256||r.dailyBudgetRuleSha256!==runtime.dailyBudgetRuleSha256)issues.push('rule-binding-mismatch');
  for(const [f,sha]of Object.entries({...r.toolchainBindings,...r.design?.designBindings}))if(await fileHash(f)!==sha)issues.push(`stale-tool:${f}`);
  if(!issues.length){
   const freshStatic=await auditStaticCandidate(runtime,r);
   if(!freshStatic.passed||levelSha256(freshStatic)!==levelSha256(r.staticAudit))issues.push('fresh-static-or-material-binding-mismatch');
   if(foundational.has(slot.newestMechanism)&&!runtime.mechanismsUsedByDailyLevel(r.level).includes(slot.newestMechanism))issues.push('fresh-foundation-mechanism-missing');
  }
  if(!issues.length&&!foundational.has(slot.newestMechanism)){
   const prior=runtime.priorDailySlots?.get(slot.formalId),comparison=r.strength.priorComparison;
   if(prior&&await fileHash(prior.sourceReport)!==prior.sourceReportSha256)issues.push('prior-slot-source-report-changed');
   if(r.strength.kind==='capacity-active-mechanisms'){
    if(!prior||comparison.priorLevelSha256!==prior.levelSha256||digest(comparison.priorInventory)!==digest(prior.inventory))issues.push('actual-prior-slot-strength-binding');
    try{
     const participation=auditCapacityIntensity(runtime,r.level,r.drags,slot.newestMechanism,slot.difficulty,prior?.inventory,{timeSchedule:r.timeSchedule});
     if(!participation.passed||levelSha256(participation)!==levelSha256(r.strength.participation))issues.push('fresh-mechanism-participation-mismatch');
     if(digest(comparison)!==digest({priorLevelSha256:prior.levelSha256,...participation.priorComparison}))issues.push('actual-prior-slot-strength-binding');
    }catch(e){issues.push(`mechanism-replay:${e.message}`);}
   }else{
    if(!prior||comparison.priorLevelSha256!==prior.levelSha256||digest(comparison.priorInstances)!==digest(prior.inventory[slot.newestMechanism])
     ||digest(comparison.currentInstances)!==digest(mechanismInventory(r.level)[slot.newestMechanism])
     ||comparison.instanceIncrease!==comparison.currentInstances.length-comparison.priorInstances.length)issues.push('actual-prior-slot-strength-binding');
    try{const replay=replayDecorated(runtime,r.level,r.drags,r.timeSchedule);
     const participation=auditMechanismParticipation(r.level,r.drags,replay,slot.newestMechanism,r.strength.targets);
     if(!participation.pass||levelSha256(participation)!==levelSha256(r.strength.participation))issues.push('fresh-mechanism-participation-mismatch');
    }catch(e){issues.push(`mechanism-replay:${e.message}`);}
   }
  }
  rows.push({...slot,sourceLevelId:r.sourceLevelId,levelSha256:r.levelSha256,L:r.L,U:r.U,issues,
   status:issues.length?'REJECTED_V3_RECEIPT':'BOUNDED_AND_STRENGTH_VERIFIED_AWAITING_POINTER'});
 }
 const diversity=auditDiversity(records.filter(r=>r.level),{expectFull});
 const unrecognized=records.filter(r=>!expected.some(s=>s.formalId===r.formalId)).map(r=>r.formalId);
 const verified=rows.filter(r=>r.status==='BOUNDED_AND_STRENGTH_VERIFIED_AWAITING_POINTER').length;
 return{schemaVersion:3,catalogVersion:CATALOG_VERSION,scope:450,verified,missing:450-records.length,duplicateIds,unrecognized,
  allDesignAndMathematicsVerified:verified===450&&!duplicateIds.length&&!unrecognized.length&&diversity.status==='DIVERSITY_450_VERIFIED',
  status:verified===450&&diversity.status==='DIVERSITY_450_VERIFIED'?'AWAITING_FORMAL_RUNTIME_POINTER_TIME':'INCOMPLETE_V3_CATALOG',
  rows,diversity,formalReady:false,productionChanged:false};
}

import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {inspectV3Receipt} from '../formal-v3/catalog-contract.mjs';
import {auditDiversity,DIVERSITY_POLICY} from '../formal-v3/diversity.mjs';
import {auditMechanismParticipation,mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {loadV4Runtime,FROZEN_MATH_SHA} from './runtime.mjs';
import {loadV4StageContract,auditV4StaticCandidate} from './static-contract.mjs';

export const V4_CATALOG_VERSION='daily-300-catalog-v1';
export const HISTORICAL_150_SNAPSHOT={
 path:'deliverables/daily-formal-v3-20261008/proof/pre-capacity-contract-150/snapshot.json',
 sha256:'eff828cb91f9e9b769cd4523b0c4da6ee6ebacfc5a129e4e691cf555cbea2e51',
};
export const V4_DIVERSITY_POLICY=Object.freeze({
 version:'daily-diversity-300-v1',comparison:DIVERSITY_POLICY.comparison,
 sameGroupMaximumFootprintSimilarity:DIVERSITY_POLICY.sameGroupMaximumFootprintSimilarity,
 globalMaximumFootprintSimilarity:DIVERSITY_POLICY.globalMaximumFootprintSimilarity,
 minimumBoardOutlinesPerGroup:DIVERSITY_POLICY.minimumBoardOutlinesPerGroup,
 minimumSourceLevelsPerGroup:DIVERSITY_POLICY.minimumSourceLevelsPerGroup,
 maximumSameGateGeometryPerGroup:DIVERSITY_POLICY.maximumSameGateGeometryPerGroup,
 minimumBoardOutlinesIn300:30,minimumSourceLevelsIn300:40,
 quotaSource:'Engineering diversity policy inherited from the previous design review; not user-fixed counts.',
});
const sha=b=>createHash('sha256').update(b).digest('hex');
const baselineFile='deliverables/daily-formal-v3-20261008/mechanisms/old450-baseline.json';
const archive='deliverables/daily-formal-v3-20261008/proof/pre-capacity-contract-150/catalog-contract.mjs.snapshot';
const files=[
 'tools/daily-challenge/formal-v4/catalog-contract.mjs','tools/daily-challenge/formal-v4/runtime.mjs',
 'tools/daily-challenge/formal-v4/static-contract.mjs','src/core/dailyChallengeStagesV3.ts',
 'tools/daily-challenge/formal-v3/catalog-contract.mjs','tools/daily-challenge/formal-v3/diversity.mjs',
 'tools/daily-challenge/formal-v3/mechanism-intensity.mjs','tools/daily-challenge/formal-v2/geometry.mjs',
 'tools/daily-challenge/formal-v2/mechanism-decorate.mjs',baselineFile,archive,
];
export const v4Slot=slot=>({formalId:slot.id,stageKey:slot.stageKey,unlockLevel:slot.stageUnlockLevel,
 newestMechanism:slot.newestMechanism,difficulty:slot.difficulty,slot:slot.slot});

export async function loadV4CatalogRuntime(){
 const runtime=await loadV4Runtime(),stageContract=await loadV4StageContract();
 const designBindings=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await fs.readFile(f))])));
 const snapshotBytes=await fs.readFile(HISTORICAL_150_SNAPSHOT.path);
 assert.equal(sha(snapshotBytes),HISTORICAL_150_SNAPSHOT.sha256,'Frozen historical membership');
 const snapshot=JSON.parse(snapshotBytes),baseline=JSON.parse(await fs.readFile(baselineFile));
 assert.equal(snapshot.inputs.length,150);assert.equal(baseline.rows.length,450);
 const manifest=JSON.parse(await fs.readFile('docs/rules/manifest.json'));
 return{...runtime,stageContract,slots:stageContract.DAILY_CHALLENGE_V3_SLOTS.map(v4Slot),
  historicalFiles:new Map(snapshot.inputs.map(r=>[r.path,r.sha256])),
  priorDailySlots:new Map(baseline.rows.map(r=>[r.formalId,r])),
  frozenRules:new Map(manifest.versions.map(r=>[r.version,r.sha256])),
  designBindings,designToolchainSha256:levelSha256(designBindings)};
}

/** The pairwise comparison is the unchanged symmetric/eight-orientation
 * implementation. The complete-catalog checks use 300 slots and 30 groups. */
export function auditV4Diversity(records,slots,{expectFull=false}={}){
 const result=auditDiversity(records,{expectFull:false,policy:V4_DIVERSITY_POLICY});
 const reasons=[...result.reasons],expected=new Map(slots.map(s=>[s.formalId,s]));
 for(const r of records){const slot=expected.get(r.formalId);
  if(!slot||['stageKey','difficulty','slot','newestMechanism'].some(k=>slot[k]!==r[k]))
   reasons.push({kind:'unknown-or-mismatched-300-slot',id:r.formalId});
 }
 if(expectFull){
  if(records.length!==300||new Set(records.map(r=>r.formalId)).size!==300||result.groups.length!==30)
   reasons.push({kind:'incomplete-300',count:records.length,groups:result.groups.length});
  for(const group of result.groups)if(group.count!==10)reasons.push({kind:'incomplete-ten-level-group',...group});
  if(result.boardOutlines<V4_DIVERSITY_POLICY.minimumBoardOutlinesIn300)reasons.push({kind:'too-few-global-outlines'});
  if(result.sourceLevels<V4_DIVERSITY_POLICY.minimumSourceLevelsIn300)reasons.push({kind:'too-few-global-sources'});
 }
 return{...result,reasons,status:reasons.length?'DIVERSITY_REJECTED':expectFull?'DIVERSITY_300_VERIFIED':'PARTIAL_DIVERSITY_VERIFIED'};
}

export function assertHistoricalSlotMigration(runtime,old,next){
 const expected=runtime.slots.find(s=>s.formalId===next.formalId);
 assert(expected,'Known external 300 slot required');
 assert.deepEqual(next,expected,'Exact external slot metadata required');
 assert.equal(old.difficulty,next.difficulty,'No cross-band reuse');
 const mapped=runtime.stageContract.mapLegacyDailyChallengeStageV3(old.stageKey);
 assert(mapped&&mapped.key===next.stageKey,'Only authorized six-stage merge; advanced stages stay fixed');
 if(next.stageKey!=='basic-combined')assert.equal(old.formalId,next.formalId,'Retain advanced slot identity');
}

/** Read the unchanged original receipt from a fixed whitelist. This does not
 * start or continue any search and does not relabel a historical proof. */
export async function inspectHistoricalCandidate(runtime,inputFile,inputSha256,next){
 assert.equal(runtime.historicalFiles.get(inputFile),inputSha256,'Only the frozen accepted 150 are eligible');
 const bytes=await fs.readFile(inputFile);assert.equal(sha(bytes),inputSha256,'Historical receipt drift');
 const old=JSON.parse(bytes),source=runtime.LEVELS.find(l=>l.id===old.sourceLevelId);
 assertHistoricalSlotMigration(runtime,old,next);
 const oldSlot=expectedDailySlots(runtime.MECHANISM_GUIDE).find(s=>s.formalId===old.formalId);
 assert(oldSlot,'Real original stage required');
 assert.deepEqual(inspectV3Receipt(old,source,oldSlot),[],'Historical receipt integrity');
 assert.equal(old.toolchainSha256,FROZEN_MATH_SHA);
 assert.deepEqual(old.toolchainBindings,runtime.toolchainBindings,'Identical mathematical closure');
 assert.equal(old.ruleSha256,runtime.frozenRules.get(old.ruleVersion));
 assert.equal(old.dailyBudgetRuleSha256,runtime.frozenRules.get(old.dailyBudgetRuleVersion));
 for(const [file,digest]of Object.entries(old.design.designBindings)){
  const current=file==='tools/daily-challenge/formal-v3/catalog-contract.mjs'?archive:file;
  assert.equal(sha(await fs.readFile(current)),digest,`Historical design dependency: ${file}`);
 }
 assert(old.baseInputFile,'Original exploratory provenance required');
 const baseBytes=await fs.readFile(old.baseInputFile),base=JSON.parse(baseBytes);
 assert.equal(sha(baseBytes),old.baseInputFileSha256);assert(base.accepted);
 assert.equal(levelSha256(base.level),old.baseLevelSha256);assert.equal(routeSha256(base.drags),old.baseRouteSha256);
 const ledgerRoot='deliverables/daily-formal-v3-20261008/proof/attempts';
 const requestFile=`${ledgerRoot}/${old.attempt.id}.request.json`,resultFile=`${ledgerRoot}/${old.attempt.id}.result.json`;
 const requestBytes=await fs.readFile(requestFile),resultBytes=await fs.readFile(resultFile);
 const request=JSON.parse(requestBytes),result=JSON.parse(resultBytes);
 assert.deepEqual(request,old.attempt,'Full historical public-ledger request identity');
 assert.equal(request.levelSha256,old.levelSha256);assert.equal(result.levelSha256,old.levelSha256);assert(result.accepted);
 assert.equal(result.status,old.status,'Original accepted public-ledger outcome status');
 assert.equal(levelSha256(result.lower),levelSha256(old.lowerBound.result),'Original bounded result required');
 if(old.route.search)assert.equal(levelSha256(result.upper),levelSha256(old.route.search));
 const candidate={...next,sourceLevelId:old.sourceLevelId,level:old.level};
 const staticAudit=await auditV4StaticCandidate(runtime,candidate);
 assert(staticAudit.passed,staticAudit.issues.join(';'));
 const canonical=replayDecorated(runtime,old.level,old.drags,old.timeSchedule);
 const independent=independentReplay(runtime,old.level,old.drags,{timeSchedule:old.timeSchedule});
 for(const r of [canonical,independent])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===old.U,'Complete same-object replay required');
 let participation=null;
 if(old.strength.kind!=='foundation-geometry'){
  const prior=runtime.priorDailySlots.get(old.formalId),comparison=old.strength.priorComparison;
  assert(prior);assert.equal(sha(await fs.readFile(prior.sourceReport)),prior.sourceReportSha256);
  assert.equal(comparison.priorLevelSha256,prior.levelSha256);
  assert.deepEqual(comparison.priorInstances,prior.inventory[old.newestMechanism]);
  assert.deepEqual(comparison.currentInstances,mechanismInventory(old.level)[old.newestMechanism]);
  assert.equal(comparison.instanceIncrease,comparison.currentInstances.length-comparison.priorInstances.length);
  participation=auditMechanismParticipation(old.level,old.drags,canonical,old.newestMechanism,old.strength.targets);
  assert(participation.pass);assert.deepEqual(participation,old.strength.participation,'Same actual primary mechanism participation');
 }
 // Receipt fields remain under historicalProof. External slot metadata alone changes.
 return{schemaVersion:4,catalogVersion:V4_CATALOG_VERSION,...next,sourceLevelId:old.sourceLevelId,
  level:old.level,levelSha256:old.levelSha256,drags:old.drags,routeSha256:old.routeSha256,
  ...(old.timeSchedule?{timeSchedule:old.timeSchedule,timeScheduleSha256:old.timeScheduleSha256}:{}),
  L:old.L,U:old.U,accepted:true,status:'SAME_OBJECT_300_CANDIDATE_REVALIDATED_AWAITING_POINTER',
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  historicalProof:{path:inputFile,sha256:inputSha256,formalId:old.formalId,stageKey:old.stageKey,
   snapshot:HISTORICAL_150_SNAPSHOT,ruleVersion:old.ruleVersion,ruleSha256:old.ruleSha256,
   proofToolchainSha256:old.toolchainSha256,lowerBoundSha256:levelSha256(old.lowerBound),
   upperEvidenceSha256:levelSha256(old.route),strengthSha256:levelSha256(old.strength),
   request:{path:requestFile,sha256:sha(requestBytes)},result:{path:resultFile,sha256:sha(resultBytes)}},
  migration:{levelUnchanged:true,routeUnchanged:true,newLowerSearchInvocations:0,newUpperSearchInvocations:0,
   fullOriginalMetadataPreserved:true,originalMechanismStrengthPreserved:true},
  staticAudit,freshCanonicalReplay:canonical,freshIndependentReplay:independent,freshPrimaryParticipation:participation,
  design:{policy:V4_DIVERSITY_POLICY,designBindings:runtime.designBindings,designToolchainSha256:runtime.designToolchainSha256},
  mathematicalEvidenceValidated:true,mechanismStrengthValidated:true,
  designValidated:false,pointerValidated:false,timeValidated:false,formalReady:false,productionChanged:false};
}

export async function auditV4HistoricalCatalog(runtime,records,{expectFull=false}={}){
 const rows=[];
 for(const r of records){
  const issues=[];try{
   const slot=runtime.slots.find(s=>s.formalId===r.formalId);assert(slot);
   const expected=await inspectHistoricalCandidate(runtime,r.historicalProof.path,r.historicalProof.sha256,slot);
   assert.equal(levelSha256(r),levelSha256(expected),'Current receipt differs from fresh same-object revalidation');
  }catch(error){issues.push(error.message);}
  rows.push({formalId:r.formalId,issues,accepted:issues.length===0});
 }
 const diversity=auditV4Diversity(records,runtime.slots,{expectFull});
 const verified=rows.filter(r=>r.accepted).length;
 return{schemaVersion:4,catalogVersion:V4_CATALOG_VERSION,scope:300,verified,missing:300-records.length,
  rows,diversity,allDesignAndMathematicsVerified:verified===300&&diversity.status==='DIVERSITY_300_VERIFIED',
  status:verified===records.length&&!diversity.reasons.length?'REVALIDATED_CANDIDATES_AWAITING_COMPLETE_CATALOG':'REJECTED_CANDIDATE_MIGRATION',
  formalReady:false,productionChanged:false};
}

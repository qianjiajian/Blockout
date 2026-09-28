import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadApi} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {checkAdvancedFloor} from './campaign31-200-advanced-floor-v145.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const ROOT='deliverables/campaign121-130-v146-20260924';
const IDS=Array.from({length:10},(_,i)=>121+i);
const floors=Object.fromEntries([5,11,16,5,11,21,5,11,11,16].map((n,i)=>[121+i,n]));
const historicalCandidates={
  121:'.codex-temp/remaining30-v112/final-stable/candidate-121.json',
  122:'.codex-temp/remaining30-v112/final-stable/candidate-122.json',
  125:'.codex-temp/remaining30-v112/final-stable/candidate-125.json',
  127:'.codex-temp/remaining147-v110/core-111-140/candidate-127-v1.json',
  129:'.codex-temp/remaining30-v112/final-stable/candidate-129.json',
  130:'.codex-temp/remaining30-v112/final-stable/candidate-130.json',
};
const lock=verifyRulesLock();
assert(lock.ok,lock.errors.join('\n'));
assert(['1.64.0','1.65.0'].includes(lock.activeVersion));
const {api}=await loadApi();
const source=JSON.parse(fs.readFileSync('deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json','utf8'));
const sourceById=new Map(source.levels.map(row=>[Number(row.level),row]));
const rows=[];
for(const id of IDS){
  const level=api.LEVELS.find(row=>row.id===id); assert(level,`missing level ${id}`);
  const snapshot=new api.PuzzleModel(level).snapshot();
  let floor;
  try{floor=await checkAdvancedFloor(level,{floor:floors[id],maxStates:50_000,maxMilliseconds:5_000});}
  catch(error){floor={status:'error',termination:'error',thresholdProven:false,reasons:[String(error)]};}
  let historicalReplay=null;
  const candidatePath=historicalCandidates[id];
  if(candidatePath&&fs.existsSync(candidatePath)){
    const candidate=JSON.parse(fs.readFileSync(candidatePath,'utf8'));
    try{
      const replay=api.replayRevisedRoute(level,candidate.drags);
      historicalReplay={path:candidatePath,levelSha256:digest(candidate.level),ruleProfile:candidate.level?.mechanismRules,replay:{valid:replay.valid,complete:replay.complete,nonClearingDrags:replay.nonClearingDrags,clearEvents:replay.clearEvents,error:replay.error}};
    }catch(error){historicalReplay={path:candidatePath,error:String(error)};}
  }
  const truth=sourceById.get(id);
  rows.push({id,target:{floor:floors[id]},currentLevelSha256:digest(level),currentDesign:{difficulty:level.difficulty,mechanismRules:level.mechanismRules,blocks:level.blocks.length,gates:level.gates.length,shutters:level.shutters?.length??0,generators:level.generators?.length??0},staticAudits:{opening:auditOpeningCoverage(snapshot),hidden:auditHiddenCoverage(level),queue:auditGeneratorQueueColors(level),gateSpans:auditGateSpanLimits(level),nativeArt:{passed:level.blocks.every(block=>api.matchFormalBlockShape(block.shape,'native-only')?.quarterTurns===0)}},sourceSummary:{recordSha256:truth&&digest(truth),requiredMissing:truth?.required_exact_fields_missing??[],unclear:truth?.source_unclear_fields??[]},floor:{status:floor.status,termination:floor.termination,thresholdProven:floor.thresholdProven,exploredStates:floor.exploredStates,discoveredStates:floor.discoveredStates,attemptedTransitions:floor.attemptedTransitions,reasons:floor.reasons},historicalReplay,state:'diagnostic-only'});
}
const report={schemaVersion:1,activeRuleVersion:lock.activeVersion,scope:IDS,createdAt:new Date().toISOString(),campaign:'121-130',contract:'v1.45/v1.46 inherited; v1.64 lock rechecked',currentCampaignSha256:digest(api.LEVELS),rows,generated:0,verified:0,adopted:0,releaseApproved:false,evidenceBoundary:'Fresh static/floor diagnostics only. No candidate is promoted; no old certificate is relabeled.'};
const output=path.join(ROOT,`fresh-diagnostic-v164-${Date.now()}.json`);
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file:output.replaceAll('\\','/'),activeRuleVersion:lock.activeVersion,rows:rows.map(row=>({id:row.id,floor:row.floor.status,thresholdProven:row.floor.thresholdProven,historicalReplay:row.historicalReplay?.replay??null,state:row.state})),generated:0,verified:0,adopted:0},null,2));

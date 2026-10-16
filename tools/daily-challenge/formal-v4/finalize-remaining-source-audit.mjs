import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const V3='deliverables/daily-formal-v3-20261008',V4='deliverables/daily-formal-v4-20261008',out=`${V4}/design/remaining-d2d3-readonly-01/supply-conclusion.json`;
assert(!fs.existsSync(out));const bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>{const bytes=fs.readFileSync(p);bindings[p]=sha(bytes);return JSON.parse(bytes);};
const desc=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const preliminaryPath=`${V4}/design/remaining-d2d3-readonly-01/report.json`,preliminary=read(preliminaryPath);
const candidatePaths=new Set(preliminary.free.map(r=>r.path)),history=new Map([...candidatePaths].map(p=>[p,[]]));
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=`${d}/${e.name}`;if(e.isDirectory()&&!e.isSymbolicLink())walk(p);else if(e.isFile()&&/^attempt-.*\.json$/.test(e.name)){
 const bytes=fs.readFileSync(p);let q;try{q=JSON.parse(bytes);}catch{continue;}
 if(candidatePaths.has(q.baseInputFile)){bindings[p]=sha(bytes);history.get(q.baseInputFile).push({...desc(p),accepted:q.accepted,status:q.status,stageKey:q.stageKey,baseLevelSha256:q.baseLevelSha256,
  reason:q.adaptation?.reason??q.reason??null});}
}}}
walk(`${V3}/selection`);
const excluded=preliminary.free.map(r=>{const failures=history.get(r.path).filter(q=>q.accepted===false);assert(failures.length,'Do not silently assume historical failure');
 for(const f of failures)if(f.baseLevelSha256)assert.equal(f.baseLevelSha256,r.levelSha256);
 return{base:{path:r.path,sha256:r.sha256},sourceLevelId:r.sourceLevelId,difficulty:r.difficulty,originalL:r.L,originalU:r.U,
  originalMathematicsStillValid:r.acceptedPublicReceiptBound,fullKnownRouteReplayed:true,exactOldAdaptationFailures:failures,
  disposition:'EXCLUDE_FROM_REUSABLE_SUPPLY_NO_NEW_STAGE_RETRY',newStageAdaptationAllowed:false,
  originalPublicAcceptanceDoesNotEraseConstructionFailure:true};});
const selectedPath=`${V4}/selection/gate-aware-basic-147-01/index.json`,selected=read(selectedPath).files.map(p=>read(p));assert.equal(selected.length,147);
const counts=[1,2,3].map(d=>selected.filter(q=>q.difficulty===d).length);
const stages=preliminary.stages.map(s=>{const occupied=[1,2,3].map(d=>selected.filter(q=>q.stageKey===s.stageKey&&q.difficulty===d).length);
 return{stageKey:s.stageKey,actualSelected:occupied,remaining:occupied.map(n=>10-n)};});
const optionsPath=`${V4}/design/remaining-d2d3-readonly-01/reference-options.json`,options=read(optionsPath);
const planPath=`${V4}/design/fixed-late-recipes-eight-plan-02/plan.json`,plan=read(planPath);
assert.equal(plan.selectedIndex.sha256,bindings[selectedPath]);assert.equal(plan.newConstructions,0);
const report={status:'READ_ONLY_SUPPLY_AUDIT_COMPLETE_HISTORICAL_FAILURES_INCLUDED',
 preliminary:desc(preliminaryPath),correction:'The preliminary free list checked public/v4 journals but not pre-ledger v3 mechanism attempts. All seven apparent free bases have exact historical adaptation failures; none is reusable for another stage.',
 scan:{files:preliminary.counts.scannedFiles,acceptedPackets:preliminary.counts.acceptedPackets,uniqueLevelObjects:preliminary.counts.uniqueLevelObjects,
  coverage:'candidate*.json packets below daily v3/v4 design; duplicates grouped by complete object SHA; historical v3 selection attempts additionally inspected for the seven provisional survivors.',
  historicalExternalSurvey:preliminary.externalSurvey,externalSurveyIsNotNewlyRescanned:true},
 unusedAcceptedPlainBasesAllowedForNewAdaptation:[0,0,0],excludedHistoricalConstructionInputs:excluded,
 latestSelection:desc(selectedPath),actualSelected:147,actualSelectedByBand:counts,remainingByBand:counts.map(n=>100-n),remainingTotal:153,stages,
 d3Gap:{basic:1,advanced:81,generator:10,axis:10,coloredGrid:10,mechanismEngineeringTargetsAreNotDifficultyProofs:true},
 recommendation:{kind:'finite new connected macro reconstruction from complete known routes',fixedRecipePlan:desc(planPath),
  recipes:plan.blueprints.map(b=>({recipeId:b.recipeId,maximumStocks:b.maximumStocks,reference:b.reference,sourceLevelId:b.sourceLevelId,
   board:[b.level.width,b.level.height],regionArea:b.region.area,regionFraction:b.region.fraction,regionSha256:b.region.sha256,
   prefixSha256:b.prefixSha256,prefix:b.prefixFacts})),
  reason:'Late untouched subregions preserve a longer actual prefix while leaving more empty cells and a smaller original suffix than cut31 whole untouchable-area retiling. This is a solvability heuristic, not L.',
  maximumNewStocksEnteringCspIncludingRejected:8,macroCountBefore:25,macroMaximumAfter:33,newConstructedCandidates:0,
  primaryAdvancedUse:'Successful independent D3 bases should be assigned only after real route capacity/participation checks; generator/axis/grid have zero D3 currently. Do not preassign a mechanism or claim any count as L.',
  d2Supply:'No currently unused nonfailed D2 base was found in this scan. The 51 remaining D2 slots require new physical layouts; do not recolour/redecorate the four historical generator failures.'},
 rejectedNextReferences:[{sourceLevelId:54,reference:options.rows.find(r=>r.sourceLevelId===54).file,
  reason:'Retained v3-54-7083810-b15 is not a solid rectangle and therefore outside the frozen plain-tail input domain. Late area25 is two components22+3. No new domain qualification is included.'},
 {sourceLevelId:42,reference:options.rows.find(r=>r.sourceLevelId===42&&r.options.length).file,
  reason:'The39% region is two disconnected8-cell components; root chose to retain the currently qualified single-connected construction domain.'}],
 actualNewSearches:0,newConstructionCalls:0,ledgerWrites:0,sourceOrProofMutation:false,currentRuntimeValidationClaimed:false,formalReady:false,
 executionEnvironment:preliminary.executionEnvironment,referenceOptions:desc(optionsPath),inputBindings:bindings};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:desc(out),actualSelected:147,bands:counts,remaining:report.remainingByBand,reusable:[0,0,0],oldFailedCandidatesExcluded:excluded.length},null,2));

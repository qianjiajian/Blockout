import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';

const V4='deliverables/daily-formal-v4-20261008',out=`${V4}/proof/native-basic-admission-catalog-independent-01`;
const output=`${out}/report.json`;assert(!fs.existsSync(output));
const bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
const read=(p,h)=>{const b=fs.readFileSync(p);bindings[p]=sha(b);if(h)assert.equal(bindings[p],h,p);return JSON.parse(b);};
const desc=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const errors=[],notes=[],rows=[];
const oldReportPath=`${V4}/proof/native-basic-admission-draft-01/report.json`;
const originalReport=read(oldReportPath,'421e22cbc99a6cdae17967508d7a8aa7b3dbed102b8829fd1cfa105be33604d3');
const originalDraft=read(originalReport.draft.path,originalReport.draft.sha256);
const rerunReportPath=`${V4}/proof/native-basic-admission-catalog-rerun-01/report.json`,rerunReport=read(rerunReportPath);
const draft=read(rerunReport.draft.path,rerunReport.draft.sha256);
assert.equal(rerunReport.status,'NATIVE_BASIC_ADMISSION_DRAFT_PASS');assert.deepEqual(draft,originalDraft,'Fresh draft must preserve all same-object fields');
assert.equal(rerunReport.draft.sha256,originalReport.draft.sha256,'Draft bytes must be identical');
const selectedIndex=read(originalReport.inputs.selection.path,originalReport.inputs.selection.sha256);
const selected=selectedIndex.files.map(p=>({file:p,receipt:read(p)}));assert.equal(selected.length,147);
const newRaw=read(originalReport.inputs.math.path,originalReport.inputs.math.sha256);
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
const basic=[...selected.filter(x=>x.receipt.stageKey==='basic-combined'),{file:rerunReport.draft.path,receipt:draft}];
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts';
const requestsBefore=fs.readdirSync(ledger).filter(n=>n.endsWith('.request.json')).length;
for(const {file,receipt:q}of basic){
 const row={file,formalId:q.formalId,difficulty:q.difficulty,L:q.L,U:q.U};rows.push(row);
 try{
  assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
  const floor=[null,16,21,31][q.difficulty],upper=[null,20,30,null][q.difficulty];
  assert(q.L>=floor&&q.L<=q.U&&(upper===null||q.U<=upper)&&Number.isSafeInteger(q.U));
  const m=q.historicalProof?read(q.historicalProof.path,q.historicalProof.sha256):read(q.mathematicalProof.path,q.mathematicalProof.sha256);
  assert(m.accepted);assert.deepEqual(m.level,q.level);assert.deepEqual(m.drags,q.drags);assert.equal(m.L,q.L);assert.equal(m.U,q.U);
  assert.equal(m.lowerBound.inputLevelSha256,q.levelSha256);assert.equal(m.lowerBound.requiredFloor,floor);
  assert(m.lowerBound.result.thresholdProven);assert(m.lowerBound.result.certifiedFloor>=floor);
  assert.equal(m.lowerBound.result.sourceLevelSha256,m.lowerBound.projectedLevelSha256??q.levelSha256);
  const request=read(`${ledger}/${m.attempt.id}.request.json`),result=read(`${ledger}/${m.attempt.id}.result.json`);
  assert.deepEqual(request,m.attempt);assert.equal(result.accepted,true);assert.equal(result.levelSha256,q.levelSha256);
  assert.deepEqual(result.lower,m.lowerBound.result);
  if(q.historicalProof){assert.equal(levelSha256(m.lowerBound),q.historicalProof.lowerBoundSha256);
   read(q.historicalProof.request.path,q.historicalProof.request.sha256);read(q.historicalProof.result.path,q.historicalProof.result.sha256);}
  const c=runtime.replayRevisedRoute(q.level,q.drags),i=independentReplay(runtime,q.level,q.drags);
  assert(c.valid&&c.complete&&!c.failed&&i.valid&&i.complete&&!i.failed);
  assert.equal(c.nonClearingDrags,q.U);assert.equal(i.nonClearingDrags,q.U);
  assert.equal(i.remainingBodies,0);assert.equal(i.remainingQueued,0);assert.equal(i.clearEvents,q.level.blocks.length);
  const statics=await auditV4StaticCandidate(runtime,q);assert(statics.passed,statics.issues.join(';'));
  for(const [p,h]of Object.entries(statics.assetBindings)){const path=`public/${p}`;assert.equal(sha(fs.readFileSync(path)),h);bindings[path]=h;}
  Object.assign(row,{passed:true,originalMathematics:m.attempt.id,method:m.lowerBound.method,
   lowerStates:m.lowerBound.result.rawFullBoardStates??m.lowerBound.result.discoveredStates,
   fullCanonical:true,fullIndependent:true,clearedAllBodies:i.clearEvents,remainingBodies:0,remainingQueued:0,
   staticPassed:true,assetFiles:Object.keys(statics.assetBindings).length,newSearches:0});
 }catch(error){row.passed=false;row.error=error.message;errors.push(`${q.formalId}: ${error.message}`);}
}
const all=[...selected.map(x=>x.receipt),draft],diversity=auditV4Diversity(all,runtime.slots,{expectFull:false});
if(diversity.reasons.length)errors.push(`combined-diversity:${JSON.stringify(diversity.reasons)}`);
const comparisons=selected.map(x=>({formalId:x.receipt.formalId,sameGroup:x.receipt.stageKey==='basic-combined'&&x.receipt.difficulty===3,
 ...compareLayouts(draft.level,x.receipt.level)}));
for(const r of comparisons)if(r.footprintSimilarity>(r.sameGroup?.65:.75)+1e-12)errors.push(`current-receipt-near:${r.formalId}`);
const nativePlan=read(newRaw.batchPlan.path,newRaw.batchPlan.sha256),old450=nativePlan.old450.map(d=>({descriptor:d,receipt:read(d.path,d.sha256)}));
const oldNear=old450.map(x=>({path:x.descriptor.path,...compareLayouts(draft.level,x.receipt.level)})).sort((a,b)=>b.footprintSimilarity-a.footprintSimilarity)[0];
if(oldNear.footprintSimilarity>.75+1e-12)errors.push('old450-near');
const source=runtime.LEVELS.find(l=>l.id===draft.sourceLevelId),sourceNear=compareLayouts(draft.level,source);
assert.equal(levelSha256(source),newRaw.plan.sourceLevelSha256);if(sourceNear.footprintSimilarity>.55+1e-12)errors.push('mainline-source-near');
const pending=nativePlan.reservedLowBandAccepted.map(d=>{const q=read(d.path,d.sha256);return{path:d.path,...compareLayouts(draft.level,q.level)};});
if(pending.some(p=>p.footprintSimilarity>.65+1e-12))errors.push('pending-low-band-base-near');
assert.equal(draft.accepted,false);assert.equal(draft.catalogEligible,false);assert.equal(draft.formalReady,false);assert.equal(draft.currentRuntimeValidationClaimed,false);
assert.equal(rows.length,30);for(const d of [1,2,3])assert.equal(rows.filter(r=>r.difficulty===d).length,10);
const tests=fs.readFileSync(`${out}/tests.tap`,'utf8');assert(/tests 9/.test(tests)&&/pass 9/.test(tests)&&/fail 0/.test(tests));bindings[`${out}/tests.tap`]=sha(Buffer.from(tests));
const tool='tools/daily-challenge/formal-v4/prepare-native-basic-admission.mjs',test='tools/daily-challenge/formal-v4/prepare-native-basic-admission.test.mjs';
assert.equal(sha(fs.readFileSync(tool)),'629279eefd1d2cb4014d2518bb01681022d0a36262a356e88b11693327171cae');
assert.equal(sha(fs.readFileSync(test)),'5ceeacc061f72b5e036f3bbcf2def7c4fa7418be3985ed349f68f89baf1f0dd9');
bindings[tool]=sha(fs.readFileSync(tool));bindings[test]=sha(fs.readFileSync(test));
const requestsAfter=fs.readdirSync(ledger).filter(n=>n.endsWith('.request.json')).length;
notes.push('All 30 basic receipts were freshly replayed in both original models; all 30 historical mathematical receipts/public results were read without another lower search.');
notes.push('The new basic receipt is only an unchanged draft: accepted=false, catalogEligible=false; it does not mutate selection147 or claim final300/Pointer.');
notes.push('All148 complete existing receipts were compared; the two pending source100 low-band bases were additionally compared before their future mechanism adaptation.');
const report={status:errors.length?'INDEPENDENT_NATIVE_BASIC_DRAFT_REJECTED':'INDEPENDENT_NATIVE_BASIC_DRAFT_PASS',errors,notes,
 sourceReport:desc(oldReportPath),sourceDraft:originalReport.draft,rerunReport:desc(rerunReportPath),rerunDraft:rerunReport.draft,
 privateTests:{passed:9,failed:0,log:desc(`${out}/tests.tap`)},
 selection:originalReport.inputs.selection,newOriginalMath:originalReport.inputs.math,
 unchangedPhysicalAndRouteSHA:{level:draft.levelSha256,route:draft.routeSha256},L:31,U:40,totalDrags:draft.drags.length,
 originalNewCandidateBudget:{upperWorlds:originalReport.upperWorlds,lowerWorlds:originalReport.lowerWorlds},
 basicGroups:[1,2,3].map(difficulty=>({difficulty,count:10})),rows,
 diversity,allCurrentReceiptComparisons:comparisons,nearestOld450:oldNear,mainlineSourceComparison:sourceNear,pendingLowBandComparisons:pending,
 requestsBefore,requestsAfter,publicRequestCountUnchanged:requestsBefore===requestsAfter,
 actualKnownUpperReplays:60,lowerSearchCalls:0,newSearches:0,newLedgerClaims:0,selectionWrites:0,
 actualSelectionCount:147,hypotheticalTotalAfterExplicitMerge:148,newDraftAccepted:false,
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,formalReady:false,fileBindings:bindings};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:desc(output),status:report.status,errors,privateTests:9,rows:rows.length,
 basicGroups:report.basicGroups,nearestCurrent:comparisons.sort((a,b)=>b.footprintSimilarity-a.footprintSimilarity)[0],
 old450:oldNear.footprintSimilarity,source:sourceNear.footprintSimilarity,publicRequests:[requestsBefore,requestsAfter]}));

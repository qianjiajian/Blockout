import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {levelSha256,routeSha256,auditStaticCandidate} from '../formal-v2/contract.mjs';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {INTENSITY_VERSION,intensityTargets} from './mechanism-intensity.mjs';
import {DIVERSITY_POLICY} from './diversity.mjs';
import {boundedBudget,designFingerprints} from './bounded-proof.mjs';
import {ICE_PROOF_VERSION} from './bounded-ice-proof.mjs';
import {CATALOG_VERSION,loadV3CatalogRuntime,inspectSearchAccounting,inspectV3Receipt,auditV3Catalog,qualifyV3Slot} from './catalog-contract.mjs';

// Receipt-shape fixtures only: these invented lower records are NEVER written
// to the production ledger or presented as a new mathematical certificate.
// No solver is called here; the real base and source are used for static/art QA.
const runtime=await loadV3CatalogRuntime();
const base=JSON.parse(await fs.readFile('deliverables/daily-formal-v3-20261008/design/global-pilot-02/candidate-0030.json','utf8'));
const source=runtime.LEVELS.find(level=>level.id===base.sourceLevelId);
const slots=expectedDailySlots(runtime.MECHANISM_GUIDE);
const slotFor=(mechanism='color-exit',difficulty=1)=>slots.find(s=>s.newestMechanism===mechanism&&s.difficulty===difficulty);
const accounting=()=>({budget:boundedBudget(),discoveredStates:257,visitedStates:257,exploredStates:253,
 rawFullBoardStates:257,rawExploredStates:253,quotientDiscoveredStates:100,quotientExploredStates:98,
 attemptedTransitions:100836,microDiscoveredStates:1000,microExploredStates:999,
 elapsedMilliseconds:42,termination:'below-threshold-exhausted'});
async function receipt(mechanism='color-exit'){
 const slot=slotFor(mechanism),level=structuredClone(base.level),drags=structuredClone(base.drags);
 const actual=levelSha256(level),routeHash=routeSha256(drags);
 const r={...slot,schemaVersion:3,catalogVersion:CATALOG_VERSION,accepted:true,
  status:'BOUNDED_SPATIAL_VERIFIED_AWAITING_V3_DESIGN_AND_POINTER',formalReady:false,
  sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),level,drags,levelSha256:actual,routeSha256:routeHash,L:16,U:19,
  ruleVersion:runtime.boundedRuleVersion,ruleSha256:runtime.boundedRuleSha256,
  dailyBudgetRuleVersion:runtime.dailyBudgetRuleVersion,dailyBudgetRuleSha256:runtime.dailyBudgetRuleSha256,
  toolchainBindings:structuredClone(runtime.toolchainBindings),toolchainSha256:runtime.toolchainSha256,
  strength:{passed:true,version:INTENSITY_VERSION,mechanism,kind:'foundation-geometry',numericOrDeviceQuotaApplicable:false},
  route:{inputLevelSha256:actual,routeSha256:routeHash,canonicalReplay:structuredClone(base.replay),independentReplay:structuredClone(base.replay),
   witnessValidation:{providedRoute:true,searchPerformed:false,fullBoardSearchStates:0}},
  lowerBound:{inputLevelSha256:actual,requiredFloor:16,projectedLevelSha256:null,projection:null,
   result:{...accounting(),sourceLevelSha256:actual,floor:16,status:'threshold-proven',thresholdProven:true}},
  design:{passed:true,retainsSourceBoard:true,boardOutlineSha256:boardBaselineSha256(level),policy:DIVERSITY_POLICY,
   designBindings:structuredClone(runtime.designBindings),designToolchainSha256:runtime.designToolchainSha256}};
 r.staticAudit=await auditStaticCandidate(runtime,r);
 return r;
}
const template=await receipt();
const cloneReceipt=()=>structuredClone(template);
const changeColor=block=>{block.color=block.color==='red'?'blue':'red';};
const inspect=(r,slot=slotFor())=>inspectV3Receipt(r,source,slot);
const auditRow=async r=>(await auditV3Catalog(runtime,[r])).rows.find(row=>row.formalId===r.formalId);

test('a foundation receipt needs no invented mechanism counter; partial inventory remains nonformal',async()=>{
 assert.equal(template.staticAudit.passed,true,template.staticAudit.issues.join(','));
 assert.equal(template.strength.targets,undefined);
 assert.deepEqual(inspect(template),[]);
 const report=await auditV3Catalog(runtime,[template]);
 assert.equal(report.verified,1);assert.equal(report.missing,449);
 assert.equal(report.formalReady,false);assert.equal(report.allDesignAndMathematicsVerified,false);
 assert.equal(report.status,'INCOMPLETE_V3_CATALOG');
});

test('search accounting uses 10000 complete boards, while finite micro and action counts are separate',()=>{
 const s=accounting();Object.assign(s,{discoveredStates:10000,visitedStates:10000,exploredStates:10000,rawFullBoardStates:10000,rawExploredStates:10000,attemptedTransitions:10001});
 assert.deepEqual(inspectSearchAccounting(s,'lower'),[]);
 for(const field of ['discoveredStates','exploredStates']){
  const broken=structuredClone(s);broken[field]=10001;
  assert(inspectSearchAccounting(broken,'lower').includes('lower:board-budget-exceeded'));
 }
 for(const field of ['discoveredStates','exploredStates','attemptedTransitions','microDiscoveredStates','microExploredStates']){
  const broken=accounting();delete broken[field];assert(inspectSearchAccounting(broken,'lower').length,field);
 }
 for(const [field,value] of [['visitedStates',0],['exploredStates',258],['elapsedMilliseconds',NaN],['termination','']]){
  const broken=accounting();broken[field]=value;assert(inspectSearchAccounting(broken,'lower').length,field);
 }
 for(const [field,value] of [['maxStates',10001],['maxTransitions',Infinity]]){
  const broken=accounting();broken.budget[field]=value;assert(inspectSearchAccounting(broken,'lower').includes('lower:invalid-budget'));
 }
});

test('raw full boards including closure intermediates cannot be replaced by quotient counts',()=>{
 const s=accounting();delete s.rawFullBoardStates;
 assert(inspectSearchAccounting(s,'lower').includes('lower:missing-or-inconsistent-raw-board-counts'));
 const substituted=accounting();substituted.discoveredStates=substituted.visitedStates=substituted.quotientDiscoveredStates;
 assert(inspectSearchAccounting(substituted,'lower').includes('lower:missing-or-inconsistent-raw-board-counts'));
 const impossible=accounting();impossible.quotientExploredStates=254;
 assert(inspectSearchAccounting(impossible,'lower').includes('lower:inconsistent-quotient-board-counts'));
});

test('ice-native receipts bind the separately qualified solver to the actual unprojected object',()=>{
 const r=cloneReceipt();r.lowerBound.method='v3-native-static-ice';
 Object.assign(r.lowerBound.result,{contractVersion:ICE_PROOF_VERSION,iceProofSha256:r.toolchainSha256,iceBindings:r.toolchainBindings});
 assert(!inspect(r).includes('native-ice-proof-binding'));
 for(const mutate of [x=>x.lowerBound.result.iceBindings={},x=>x.lowerBound.result.iceProofSha256='0'.repeat(64),
  x=>x.lowerBound.result.contractVersion='unqualified',x=>x.lowerBound.projectedLevelSha256='0'.repeat(64)]){
  const broken=structuredClone(r);mutate(broken);assert(inspect(broken).includes('native-ice-proof-binding'));
 }
});

test('level, route, slot and actual source bindings reject changed inputs',()=>{
 for(const [mutate,reason] of [
  [r=>changeColor(r.level.blocks[0]),'level-or-route-hash-mismatch'],
  [r=>r.drags.pop(),'level-or-route-hash-mismatch'],
  [r=>r.slot++,'slot-mismatch:slot'],
  [r=>r.sourceLevelSha256='0'.repeat(64),'source-binding'],
  [r=>r.staticAudit.levelSha256='0'.repeat(64),'static-audit-binding'],
 ]){const r=cloneReceipt();mutate(r);assert(inspect(r).includes(reason),reason);}
});

test('unknown or partial bounds and wrong nonclearing bands cannot be promoted by accepted flags',()=>{
 for(const mutate of [r=>r.status='UNKNOWN_LOWER',r=>r.L=null,r=>r.U=21,r=>r.L=15,
  r=>r.lowerBound.result.termination='max-states',r=>r.lowerBound.result.thresholdProven=false,
  r=>r.lowerBound.result.sourceLevelSha256='0'.repeat(64)]){
  const r=cloneReceipt();mutate(r);assert(inspect(r).length);
 }
 const r=cloneReceipt();r.L=31;r.U=999;Object.assign(r,slotFor('color-exit',3));
 assert(!inspect(r,slotFor('color-exit',3)).includes('difficulty-band'),'D3 has no invented U ceiling');
});

test('original route needs both complete no-failure replays and explicit zero-search witness accounting',()=>{
 for(const replay of ['canonicalReplay','independentReplay'])for(const [field,value] of [['complete',false],['failed',true],['nonClearingDrags',18]]){
  const r=cloneReceipt();r.route[replay][field]=value;assert(inspect(r).includes(`route-incomplete:${replay}`));
 }
 const r=cloneReceipt();delete r.route.witnessValidation;
 assert(inspect(r).includes('missing-upper-validation-accounting'));
});

test('projection source, projected object and lower search object must all agree',()=>{
 const r=cloneReceipt(),projected=structuredClone(r.level),projectedHash=levelSha256(projected);
 r.lowerBound.projectedLevelSha256=projectedHash;
 r.lowerBound.projection={sourceLevelSha256:r.levelSha256,projectedLevelSha256:projectedHash,projectedLevel:projected};
 assert.deepEqual(inspect(r),[]);
 changeColor(r.lowerBound.projection.projectedLevel.blocks[0]);
 assert(inspect(r).includes('projection-binding'));
});

test('self-consistent empty or incomplete tool maps cannot bypass the current complete binding set',async()=>{
 for(const target of ['proof','design'])for(const empty of [true,false]){
  const r=cloneReceipt(),bindings=target==='proof'?r.toolchainBindings:r.design.designBindings;
  if(empty)for(const k of Object.keys(bindings))delete bindings[k];else delete bindings[Object.keys(bindings)[0]];
  if(target==='proof')r.toolchainSha256=levelSha256(bindings);else r.design.designToolchainSha256=levelSha256(bindings);
  const row=await auditRow(r);assert.equal(row.status,'REJECTED_V3_RECEIPT');
  assert(row.issues.includes(`incomplete-or-changed-${target}-tool-set`));
 }
});

test('active and inherited daily rule SHA values are checked against locked documents',async()=>{
 for(const field of ['ruleSha256','dailyBudgetRuleSha256']){
  const r=cloneReceipt();r[field]='a'.repeat(64);
  assert((await auditRow(r)).issues.includes('rule-binding-mismatch'));
 }
});

test('stale and omitted original-direction material bindings are rejected by fresh static audit',async()=>{
 assert(Object.keys(template.staticAudit.assetBindings).length>0);
 for(const empty of [false,true]){
  const r=cloneReceipt();if(empty)r.staticAudit.assetBindings={};else r.staticAudit.assetBindings[Object.keys(r.staticAudit.assetBindings)[0]]='a'.repeat(64);
  assert((await auditRow(r)).issues.includes('fresh-static-or-material-binding-mismatch'));
 }
});

test('retainsSourceBoard=true cannot hide a changed actual normal source mask',()=>{
 const r=cloneReceipt();r.level.playable=r.level.playable??Array.from({length:r.level.width*r.level.height},(_,i)=>[i%r.level.width,Math.floor(i/r.level.width)]);
 r.level.playable.pop();assert(inspect(r).includes('actual-source-board-mismatch'));
});

test('rectangles cannot masquerade as multiple irregular bodies or an irregular board',async()=>{
 const r=await receipt('irregular-block');r.strength.irregularBodies=4;r.staticAudit.passed=true;
 assert(inspect(r,slotFor('irregular-block')).includes('foundation-irregular-instance-count'));
 const board=await receipt('irregular-board');board.staticAudit.passed=true;
 const row=await auditRow(board);assert.equal(row.status,'REJECTED_V3_RECEIPT');
 assert(row.issues.includes('fresh-foundation-mechanism-missing'));
});

test('latest-mechanism policies cannot silently replace the published instance targets',()=>{
 const r=cloneReceipt(),slot=slotFor('numeric-ice');Object.assign(r,slot);
 r.strength={passed:true,version:INTENSITY_VERSION,mechanism:slot.newestMechanism,targets:intensityTargets(slot.newestMechanism,1)};
 assert(!inspect(r,slot).includes('unreviewed-strength-targets'));
 r.strength.targets.instances=1;assert(inspect(r,slot).includes('unreviewed-strength-targets'));
});

test('time schedules must be hash-bound and validated in both simulation replays',()=>{
 const r=cloneReceipt();r.timeSchedule={kind:'per-drag-and-unit-step-v1',secondsPerDrag:.4,secondsPerUnitStep:.25,secondsPerExitAnimation:.4};
 r.timeScheduleSha256=levelSha256(r.timeSchedule);
 assert(inspect(r).includes('schedule-not-replayed:canonicalReplay'));
 assert(inspect(r).includes('schedule-not-replayed:independentReplay'));
 r.timeSchedule.secondsPerDrag=.5;assert(inspect(r).includes('time-schedule-hash'));
});

test('qualifier rejects changed base hashes and slot metadata before adaptation or search',async()=>{
 const r=structuredClone(base);changeColor(r.level.blocks[0]);
 await assert.rejects(()=>qualifyV3Slot(runtime,r,slotFor()),/intact exploratory base/);
 await assert.rejects(()=>qualifyV3Slot(runtime,base,{...slotFor(),unlockLevel:999}),/changed slot contract/);
});

test('duplicates and unknown IDs remain visible and cannot become a complete catalog',async()=>{
 const unknown={...cloneReceipt(),formalId:'not-a-real-slot'};
 const r=await auditV3Catalog(runtime,[template,cloneReceipt(),unknown]);
 assert.deepEqual(r.duplicateIds,[template.formalId]);assert.deepEqual(r.unrecognized,['not-a-real-slot']);
 assert.equal(r.formalReady,false);assert.equal(r.allDesignAndMathematicsVerified,false);
 assert.equal(r.status,'INCOMPLETE_V3_CATALOG');
});

test('incomplete budget objects cannot erase finite transition or held-state ceilings',()=>{
 for(const field of ['maxStates','maxTransitions','maxMicroStates','maxDragStates','maxMilliseconds']){
  const s=accounting();delete s.budget[field];
  assert(inspectSearchAccounting(s,'lower').length,`missing ${field} must not inherit defaults during receipt inspection`);
 }
 const s=accounting();s.microExploredStates=s.microDiscoveredStates+1;
 assert(inspectSearchAccounting(s,'lower').length,'held-state expansion cannot exceed discovery');
});

test('missing maps, policy or active mechanism targets reject the receipt without crashing the catalog',async()=>{
 for(const mutate of [r=>delete r.toolchainBindings,r=>delete r.design,r=>delete r.design.policy]){
  const r=cloneReceipt();mutate(r);
  const row=await auditRow(r);assert.equal(row.status,'REJECTED_V3_RECEIPT');
 }
 const r=cloneReceipt(),slot=slotFor('numeric-ice');Object.assign(r,slot);
 r.strength={passed:true,version:INTENSITY_VERSION,mechanism:slot.newestMechanism};
 assert(inspect(r,slot).includes('unreviewed-strength-targets'));
});

test('the historical source18 four-star failure is present in the shared immutable block ledger',async()=>{
 const old=JSON.parse(await fs.readFile('deliverables/daily-formal-v3-20261008/mechanisms/bounded-qualified-v3-1/d3-star.json','utf8'));
 assert.equal(old.accepted,false);assert.equal(old.status,'UNKNOWN_LOWER');
 const fingerprint=designFingerprints(old.level);
 const stem=`deliverables/daily-formal-v3-20261008/proof/attempts/${fingerprint.designSha256}`;
 const blocked=JSON.parse(await fs.readFile(`${stem}.blocked.json`,'utf8'));
 const result=JSON.parse(await fs.readFile(`${stem}.result.json`,'utf8'));
 assert.equal(blocked.status,'HISTORICAL_FAILED_INPUT_DO_NOT_RETRY');
 assert.equal(result.accepted,false);assert.equal(result.levelSha256,levelSha256(old.level));
 assert.equal(result.lower.discoveredStates,old.lowerBound.result.discoveredStates);
 assert.equal(result.lower.exploredStates,old.lowerBound.result.exploredStates);
 assert.equal(result.lower.termination,old.lowerBound.result.termination);
});

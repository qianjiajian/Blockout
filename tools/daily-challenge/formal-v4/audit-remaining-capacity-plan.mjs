import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
const dir='deliverables/daily-formal-v4-20261008/design/remaining-capacity-plan-01';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,sha256:sha(p)});
const report=read(`${dir}/report.json`),plan=read(`${dir}/plan.json`),runtime=await loadV4CatalogRuntime();
assert.equal(sha(plan.sourceReport),plan.sourceReportSha256);assert.deepEqual(plan.rows,report.plans);assert.equal(report.checked,20);assert(report.proposed<=20);
for(const key of ['selectedIndex','priorTwelveCompletion','sourceIndex','sourceAudit','previousCapacityReport','previousCapacityQa','tool'])assert.equal(sha(report[key].path),report[key].sha256);
assert.equal(sha(`${dir}/planner-source.mjs.snapshot`),report.tool.sha256);
const selected=read(report.selectedIndex.path).files.map(p=>read(p));assert.equal(selected.length,126);
const excluded=read(report.previousCapacityReport.path).plans,excludedPaths=new Set(excluded.map(r=>r.basePath)),excludedRoots=new Set(excluded.flatMap(r=>r.roots));
assert.equal(read(report.priorTwelveCompletion.path).accepted,10);assert.equal(read(report.priorTwelveCompletion.path).attempts,12);
for(const key of ['newCandidates','newConstructionCalls','ledgerClaims','proofSearches','heldReachabilitySearches'])assert.equal(report[key],0);
const seenPaths=new Set(),seenSlots=new Set(),seenRoots=new Set(),seenIdentity=new Set(),comparisons=[];
for(const row of plan.rows){
 assert(!excludedPaths.has(row.basePath));assert(!seenPaths.has(row.basePath));seenPaths.add(row.basePath);
 for(const r of row.roots){assert(!seenRoots.has(r)&&!excludedRoots.has(r));seenRoots.add(r);}
 assert(!seenSlots.has(row.formalId));seenSlots.add(row.formalId);assert(!selected.some(r=>r.formalId===row.formalId));
 const slot=runtime.slots.find(s=>s.formalId===row.formalId);assert(slot);for(const k of Object.keys(slot))assert.equal(row[k],slot[k]);
 const b=read(row.basePath);assert.equal(sha(row.basePath),row.baseFileSha256);assert.equal(levelSha256(b.level),row.baseLevelSha256);assert.equal(routeSha256(b.drags),row.baseRouteSha256);
 const f=designFingerprints(b.level),identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});assert(!seenIdentity.has(identity));seenIdentity.add(identity);
 const sourceRow=report.rows.find(r=>r.path===row.basePath);assert(sourceRow&&sourceRow.rejections.length===0);assert.equal(sourceRow.publicLedger.retryIdentity,identity);
 for(const k of ['request','result'])assert.equal(sha(sourceRow.publicLedger[k].path),sourceRow.publicLedger[k].sha256);assert(read(sourceRow.publicLedger.result.path).accepted);
 const ledger='deliverables/daily-formal-v3-20261008/proof/attempts',construction='deliverables/daily-formal-v4-20261008/proof/capacity-construction-attempts';
 assert(!fs.existsSync(`${ledger}/identities/${identity}.blocked.json`));assert(!fs.existsSync(`${construction}/identities/${identity}.json`));assert(!fs.existsSync(`${construction}/aliases/${identity}.json`));
 const prior=runtime.priorDailySlots.get(row.formalId);assert.equal(prior.levelSha256,row.priorSlot.levelSha256);assert.equal(sha(row.priorSlot.sourceReport),row.priorSlot.sourceReportSha256);
 assert(row.primaryInstancesProposal>=Math.max(1,row.priorSlot.latestInstances));assert(row.primaryInstancesProposal<=row.primaryInstancesAvailable);
 assert(row.primaryInstancesProposal+row.supportInstancesNeeded>=row.minimumCombinedInstances);
 if(row.supportInstancesNeeded){assert(row.supportInstancesNeeded>=2);assert(row.supportOptions.length>=row.supportInstancesNeeded);assert(new Set(row.supportOptions.map(r=>r.count)).size>=2);}
 const source=runtime.LEVELS.find(s=>s.id===row.sourceLevelId);assert(compareLayouts(b.level,source).footprintSimilarity<=.55);assert(sourceRow.old450Similarity<=.75);
 for(const other of selected){const c=compareLayouts(b.level,other.level),sameGroup=other.stageKey===row.stageKey&&other.difficulty===row.difficulty;assert(c.footprintSimilarity<=(sameGroup?.65:.75));comparisons.push({sameGroup,ratio:c.footprintSimilarity});}
 selected.push({...slot,sourceLevelId:row.sourceLevelId,level:b.level});
}
const diversity=auditV4Diversity(selected,runtime.slots);assert.equal(diversity.reasons.length,0);
const result={status:'READ_ONLY_REMAINING_PLAN_QA_PASS',formalReady:false,productionChanged:false,newCandidates:0,newConstructionCalls:0,newClaims:0,newProofSearches:0,
 plan:bind(`${dir}/plan.json`),report:bind(`${dir}/report.json`),selectedIndex:report.selectedIndex,excludedPreviousTwelve:12,
 checkedRemaining:20,planned:plan.rows.length,unallocated:report.unallocated.length,uniqueSlots:seenSlots.size,uniqueBases:seenPaths.size,uniqueRootFamilies:seenRoots.size,
 sourceCount:new Set(plan.rows.map(r=>r.sourceLevelId)).size,maximumGlobalSimilarity:Math.max(...comparisons.map(c=>c.ratio)),maximumSameGroupSimilarity:Math.max(0,...comparisons.filter(c=>c.sameGroup).map(c=>c.ratio)),
 publicFailureIdentityCollisions:0,capacityConstructionIdentityCollisions:0,combinedProvisionalDiversity:diversity.status,
 generatorFIFOClaimed:false,newHiddenInventoryRouteClaimed:false,tool:bind('tools/daily-challenge/formal-v4/audit-remaining-capacity-plan.mjs')};
fs.writeFileSync(`${dir}/qa.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));

import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>{const b=await fs.readFile(p);return{path:p,sha256:hash(b),value:JSON.parse(b)};};
const directory='deliverables/daily-formal-v4-20261008/design/unused-capacity-plan-02';
const report=await read(`${directory}/report.json`),plan=await read(`${directory}/plan.json`);
assert.equal(plan.value.sourceReportSha256,report.sha256);
assert.deepEqual(plan.value.rows,report.value.plans);
const runtime=await loadV4CatalogRuntime();
assert.equal(report.value.mathToolchainSha256,runtime.toolchainSha256);
assert.equal(hash(await fs.readFile(report.value.tool.path)),report.value.tool.sha256);
assert.equal(report.value.checked,32);assert.equal(report.value.plans.length,12);
assert.equal(report.value.proofSearches,0);assert.equal(report.value.heldReachabilitySearches,0);
assert.equal(report.value.ledgerClaims,0);assert.equal(report.value.newConstructionCalls,0);
const index=await read(report.value.selectedIndex.path);assert.equal(index.sha256,report.value.selectedIndex.sha256);
const selected=await Promise.all(index.value.files.map(async p=>(await read(p)).value));
const sources=new Set(),bases=new Set(),roots=new Set(),slots=new Set(),comparisons=[];
for(const row of plan.value.rows){
 assert(!sources.has(row.sourceLevelId));sources.add(row.sourceLevelId);
 assert(!bases.has(row.basePath));bases.add(row.basePath);
 assert(!slots.has(row.formalId));slots.add(row.formalId);
 for(const root of row.roots){assert(!roots.has(root));roots.add(root);}
 const original=await read(row.basePath);assert.equal(original.sha256,row.baseFileSha256);
 assert(row.primaryInstancesProposal>=1);assert(row.primaryInstancesProposal<=row.primaryInstancesAvailable);
 if(row.supportInstancesNeeded)assert(row.supportInstancesNeeded>=2&&new Set(row.supportOptions.map(o=>o.count)).size>=2);
 for(const previous of selected){
  const c=compareLayouts(original.value.level,previous.level),sameGroup=previous.stageKey===row.stageKey&&previous.difficulty===row.difficulty;
  assert(c.footprintSimilarity<=(sameGroup?.65:.75)+1e-12);
  comparisons.push({a:row.formalId,b:previous.formalId,sameGroup,ratio:c.footprintSimilarity});
 }
 selected.push({...row,level:original.value.level});
}
const result={status:'READ_ONLY_PREPLAN_QA_PASS',plan:{path:plan.path,sha256:plan.sha256},report:{path:report.path,sha256:report.sha256},
 selectedIndex:report.value.selectedIndex,sourceIndex:report.value.sourceIndex,toolchainBindings:runtime.designBindings,
 planner:report.value.tool,auditor:{path:'tools/daily-challenge/formal-v4/audit-unused-capacity-plan.mjs',sha256:hash(await fs.readFile('tools/daily-challenge/formal-v4/audit-unused-capacity-plan.mjs'))},
 checkedExistingWitnesses:32,planned:12,uniqueSources:sources.size,uniqueBasePaths:bases.size,uniqueRootFamilies:roots.size,
 symmetricComparisons:comparisons.length,maximumGlobalSimilarity:Math.max(...comparisons.map(r=>r.ratio)),
 maximumSameGroupSimilarity:Math.max(...comparisons.filter(r=>r.sameGroup).map(r=>r.ratio)),
 constructionCalls:0,ledgerClaims:0,proofSearches:0,activeGeneratorFIFOClaimed:false,
 phase:'PREDECLARED_ONLY_WAITING_FOR_NARROW_ACCEPTED_PARENT_QUALIFIER',formalReady:false,productionChanged:false};
await fs.writeFile(`${directory}/qa.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
await fs.copyFile(report.value.tool.path,`${directory}/planner-source.mjs.snapshot`,fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify(result));

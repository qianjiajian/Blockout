import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardCells,absoluteCells,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {LATE_REGION_VERSION} from './late-region-gate-aware-factory.mjs';
import {LATE_PREFIX_CONSTRUCTION_LEDGER} from './late-prefix-plan-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Preparation only. This file never calls a constructor, ledger helper, CSP,
// upper search or lower search. Root owns the separate actual batch driver.
const V3='deliverables/daily-formal-v3-20261008',V4='deliverables/daily-formal-v4-20261008';
const own='tools/daily-challenge/formal-v4/prepare-fixed-late-recipes-eight-v2.mjs';
const out=`${V4}/design/fixed-late-recipes-eight-plan-02`;
assert(!fs.existsSync(out),'Immutable new plan directory');
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
const read=(p,expected)=>{const bytes=fs.readFileSync(p);bindings[p]=sha(bytes);if(expected)assert.equal(bindings[p],expected);return JSON.parse(bytes);};
const desc=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
Object.assign(bindings,environment.bindings,runtime.toolchainBindings);
const oldPlanPath=`${V4}/design/late-prefix-gate-aware8-plan-01/plan.json`,oldPlan=read(oldPlanPath);
const selectedPath=`${V4}/selection/gate-aware-basic-147-01/index.json`;
const index=read(selectedPath,'049a2cea87672b4fbf54afdb06ae01d8b3c964af85a0e9447c23b5ec3e1f39dd');assert.equal(index.files.length,147);
const selected=index.files.map(p=>{const q=read(p);assert(q.accepted&&q.levelSha256===levelSha256(q.level));return{...desc(p),levelSha256:q.levelSha256};});
const old450=oldPlan.old450.map(d=>{const q=read(d.path,d.sha256);assert.equal(q.levelSha256,levelSha256(q.level));return d;});
const qualification=read(oldPlan.qualification.path,oldPlan.qualification.sha256);
assert.equal(qualification.status,'INDEPENDENT_GATE_AWARE_QUALIFICATION_PASS');
for(const [p,h]of Object.entries(qualification.toolBindings)){assert.equal(sha(fs.readFileSync(p)),h);bindings[p]=h;}
const filesWithin=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=`${d}/${e.name}`;return e.isDirectory()&&!e.isSymbolicLink()?filesWithin(p):e.isFile()&&/^(candidate|input)-.*\.json$/.test(e.name)?[p]:[];}):[];
const previousMacro=[];
for(const base of [`${V3}/design`,`${V4}/design`])for(const e of fs.readdirSync(base,{withFileTypes:true})){
 if(!e.isDirectory()||!e.name.startsWith('macro-'))continue;
 for(const p of filesWithin(`${base}/${e.name}`)){const q=read(p);if(q.level?.blocks&&q.level?.gates)previousMacro.push({...desc(p),sourceLevelId:q.sourceLevelId??q.level.id});}
}
const previousLateStocks=[];
for(const name of fs.readdirSync(LATE_PREFIX_CONSTRUCTION_LEDGER))if(name.endsWith('.claim.json')){
 const claim=read(`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${name}`);assert.equal(claim.qualificationOnly,false);
 const resultPath=`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${name.replace('.claim.json','.result.json')}`;
 assert(fs.existsSync(resultPath),'Earlier constructor still pending');read(resultPath);
 for(const n of fs.readdirSync(claim.outputDirectory))if(/^construction-.*\.json$/.test(n)){
  const p=`${claim.outputDirectory}/${n}`,q=read(p);if(q.placeholderWorld){assert.equal(designFingerprints(q.placeholderWorld).shapeSha256,q.stockFingerprints.shapeSha256);
   previousLateStocks.push({...desc(p),shapeSha256:q.stockFingerprints.shapeSha256,level:q.level??q.placeholderWorld});}
 }
}
const sealedFailures=oldPlan.sealedFailures.map(d=>{const q=read(d.path,d.sha256);assert.equal(q.accepted,false);assert.deepEqual(designFingerprints(q.level),d.fingerprints);return d;});
const sourceBranch=read(`${V3}/design/macro-prefix64-04/scope156/preview-1/report.json`);
const source198=sourceBranch.latestFailedBySource.find(r=>r.source===198);assert(source198);
const failurePaths=[{source:198,path:source198.file,sha256:source198.sha256},
 {source:118,path:`${V4}/design/macro-prefix-half300-joint-02/candidate-007.json`}];
const failedParents=failurePaths.map(d=>{const q=read(d.path,d.sha256);assert.equal(q.accepted,false);assert.equal(q.sourceLevelId,d.source);
 const requestFile=`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.request.json`,resultFile=`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.result.json`;
 const request=read(requestFile),result=read(resultFile);assert.deepEqual(q.attempt,request);assert.equal(result.accepted,false);
 read(`${PUBLIC_ATTEMPT_LEDGER}/${request.id}.blocked.json`);read(`${PUBLIC_ATTEMPT_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`);
 return{source:d.source,file:d.path,sha256:bindings[d.path],id:request.id,requestFile,requestSha256:bindings[requestFile],resultFile,resultSha256:bindings[resultFile],fingerprints:designFingerprints(q.level)};
});
const publicStocks=[];
for(const n of fs.readdirSync(PUBLIC_ATTEMPT_LEDGER))if(n.endsWith('.request.json')){
 const p=`${PUBLIC_ATTEMPT_LEDGER}/${n}`,q=read(p);assert(q.shapeSha256&&q.colorSha256&&q.id);
 publicStocks.push({...desc(p),id:q.id,shapeSha256:q.shapeSha256,colorSha256:q.colorSha256,designSha256:q.designSha256??q.id,
  retryIdentitySha256:levelSha256({shapeSha256:q.shapeSha256,colorSha256:q.colorSha256})});
}
const optionsPath=`${V4}/design/remaining-d2d3-readonly-01/reference-options.json`,options=read(optionsPath);
const specifications=[{source:198,area:26,cut:65},{source:198,area:31,cut:63},{source:198,area:38,cut:57},{source:118,area:21,cut:34}];
const blueprints=[];
for(const [i,s]of specifications.entries()){
 const ref=options.rows.find(r=>r.sourceLevelId===s.source&&r.options.some(o=>o.region.area===s.area&&o.prefixDrags===s.cut&&o.mode==='single-connected-region'));
 assert(ref);const option=ref.options.find(o=>o.region.area===s.area&&o.prefixDrags===s.cut&&o.mode==='single-connected-region');
 const q=read(ref.file,ref.sha256),level=q.level;assert(q.accepted);assert.equal(levelSha256(level),ref.levelSha256);runtime.assertPlainProofDomain(level);
 const actual=replayDecorated(runtime,level,q.drags),independent=independentReplay(runtime,level,q.drags);
 assert(actual.complete&&independent.complete&&actual.nonClearingDrags===ref.fullU&&independent.nonClearingDrags===ref.fullU);
 const ids=new Set(option.region.bodyIds),changedBodies=level.blocks.filter(b=>ids.has(b.id)),fixedBlocks=level.blocks.filter(b=>!ids.has(b.id)),cells=changedBodies.flatMap(absoluteCells).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 assert.equal(levelSha256(cells),levelSha256(option.region.cells));assert.equal(cells.length,s.area);assert(cells.length/boardCells(level).length>.35);
 const all=new Set(cells.map(p=>p.join(','))),seen=new Set([cells[0].join(',')]),queue=[cells[0]];
 for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(all.has(p.join(','))&&!seen.has(p.join(','))){seen.add(p.join(','));queue.push(p);}assert.equal(seen.size,cells.length);
 const prefixDrags=q.drags.slice(0,s.cut);assert(prefixDrags.every(d=>!ids.has(d.blockId)));assert.equal(q.drags.findIndex(d=>ids.has(d.blockId)),s.cut);
 assert.equal(routeSha256(prefixDrags),option.prefixSha256);
 const source=runtime.LEVELS.find(l=>l.id===s.source);assert.equal(boardBaselineSha256(level),boardBaselineSha256(source));
 const sourceBinding=await currentMainlineSourceBinding(runtime,environment,s.source);Object.assign(bindings,sourceBinding.bindings);
 const inventory=inventorySummary(level,runtime);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);
 assert(level.blocks.every(b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])))),'Unchanged solid rectangle tail domain');
 blueprints.push({version:LATE_REGION_VERSION,recipeId:`source-${s.source}-cut-${s.cut}-area-${s.area}`,maxStocks:2,maximumStocks:2,
  recipeSelection:'Explicit later connected untouched region, independently read/replayed; frozen makeLateRegionBlueprint is not called or changed.',
  reference:desc(ref.file),referenceLevelSha256:ref.levelSha256,referenceRouteSha256:ref.routeSha256,sourceLevelId:s.source,
  level,fixedBlocks,changedBodies,region:{cells,bodyIds:[...ids],fraction:s.area/boardCells(level).length,area:s.area,originalBodyCount:ids.size,connected:true,sha256:levelSha256(cells)},
  prefixDrags,prefixSha256:routeSha256(prefixDrags),prefixFacts:{drags:s.cut,parking:option.prefixParking,clears:option.prefixClears,releasedArea:option.prefixReleasedArea,
   remainingBodies:option.remainingOriginalBodies,originalSuffixParking:option.originalTailParking},
  currentSourceBinding:sourceBinding,referenceNativeInventory:inventory,knownReferenceOnly:true,newCandidateRouteNotClaimed:true,searchPerformed:false,
  stockRecipeQuota:2,maximumColourCspCallsPerStock:1,noReplacementAfterColourCspFailure:true});
}
const compiled=await build({entryPoints:[own,'tools/daily-challenge/formal-v4/prefix-tail-explore.mjs','tools/daily-challenge/formal-v4/construct-late-prefix-recipes.mjs'],bundle:true,packages:'external',write:false,outdir:'unused-esbuild-output',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
for(const p of Object.keys(compiled.metafile.inputs)){const f=p.replaceAll('\\','/');bindings[f]=sha(fs.readFileSync(f));}
const plan={schemaVersion:4,scope:300,status:'FIXED_EIGHT_RECIPES_PREPARED_NO_CONSTRUCTION',version:'late-prefix-recipe-eight-v1',
 inheritedHistoryPlan:desc(oldPlanPath),referenceOptions:desc(optionsPath),selectedIndex:desc(selectedPath),selected,old450,previousMacro,previousLateStocks,sealedFailures,failedParents,publicStocks,blueprints,
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,mathematicalToolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,
 policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,qualification:oldPlan.qualification,
 sequence:{baseSeed:813019001,step:7919,sourceFactor:101,bodyCountDeltas:[1,-1,2,0,3,-2]},maximumFinalColourInputsIncludingRejected:8,maximumStocksEnteringColourCspIncludingFailed:8,maximumPerSource:{198:6,118:2},maximumStaticPartitionAttempts:2000,
 previousMacro64ActualInputs:25,combinedMaximumInputs:64,maximumAfterThisBatch:33,
 quotaMeaning:'Four exact connected recipes, two distinct stocks each. First CSP entry consumes that stock even on rejection. No ninth input, no recipe fallback after CSP.',
 geometry:{minimumConnectedChangedFraction:.35,actualFractionsStrictlyGreaterThanMinimum:true,exactExternalBodyFieldsRetained:true,oldRegionFootprintsForbidden:true,originalOrientationOnly:true},
 similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,source:.55,old450:.75,newBatch:.65},
 mutualSimilarityMeasured:false,newPhysicalLayoutIndependenceClaimed:false,
 gatePolicy:oldPlan.gatePolicy,staticPartitionBudget:oldPlan.staticPartitionBudget,colourBudget:oldPlan.colourBudget,
 futureUpperBudget:oldPlan.futureUpperBudget,futureLowerBudget:oldPlan.futureLowerBudget,futureStrategy:oldPlan.futureStrategy,
 staticSlot:oldPlan.staticSlot,staticSlotIsOnlyAValidationEnvelope:true,slotAssigned:false,candidatePoolOnly:true,
 constructorApi:'constructLateRegionStock(runtime, blueprint, options) from frozen late-region-gate-aware-factory.mjs',
 driverResponsibilities:['Require descriptor SHA and immutable shared plan execution claim before first construction.',
  'Use each blueprint directly; do not call frozen makeLateRegionBlueprint, which fixes the older cut31 domain.',
  'Keep all source/block/route/region bytes bound; prohibit every old partition/stock identity and all failed parents; changed shape AND colour must be real.',
  'Update same-source failed-parent chain from each new full failure, including construction failures, without resetting any physical budget.',
  'Measure actual candidate source/old450/current147/priorMacro/newBatch symmetric near ratios; no preclaimed visual independence.',
  'Each eligible full input gets one public original identity claim before one shared-budget tail U and then original lower L31; no fallback or repeat.',
  'Account prior construction worlds/micro/transitions/time plus prefix and tail under one <=10000 upper budget; original lower is separate <=9999+1.',
  'A changed latest selected index requires a new bound supplemental plan and fresh read-only geometry preflight, never omission of additions.'],
 newConstructions:0,newSearches:0,ledgerWrites:0,mathematicalSuccessIsNotFormalSlotAcceptance:true,formalReady:false,bindings};
fs.mkdirSync(out);fs.writeFileSync(`${out}/plan.json`,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({plan:desc(`${out}/plan.json`),recipes:blueprints.map(b=>({recipeId:b.recipeId,maxStocks:b.maxStocks,region:b.region.area,prefix:b.prefixFacts,reference:b.reference,prefixSha256:b.prefixSha256,regionSha256:b.region.sha256})),history:{previousMacro:previousMacro.length,previousLateStocks:previousLateStocks.length,publicStocks:publicStocks.length},newConstructions:0,newSearches:0},null,2));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {LATE_REGION_VERSION} from './late-region-gate-aware-factory.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {LATE_PREFIX_CONSTRUCTION_LEDGER} from './late-prefix-plan-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Read-only recipe proposal. No retile, colour CSP, gameplay search, attempt
// ledger helper or public claim is called. Root owns any later fixed plan.
const V4='deliverables/daily-formal-v4-20261008';
const V3='deliverables/daily-formal-v3-20261008';
const own='tools/daily-challenge/formal-v4/prepare-low-band-sixteen-plan.mjs';
const driver='tools/daily-challenge/formal-v4/construct-low-band-prefix-recipes.mjs';
const output=`${V4}/design/low-band-sixteen-plan-01`;
assert(!fs.existsSync(output),'Never overwrite an earlier proposal');
const bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
const read=(p,h)=>{const b=fs.readFileSync(p);bindings[p]=sha(b);if(h)assert.equal(bindings[p],h);return JSON.parse(b);};
const descriptor=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const auditPath=`${V4}/design/low-band-late-options-readonly-01/report.json`,audit=read(auditPath);
const supplyPath=`${V4}/design/remaining-d2d3-readonly-01/report.json`,supply=read(supplyPath);
const exclusionPath=`${V4}/design/remaining-d2d3-readonly-01/supply-conclusion.json`,exclusions=read(exclusionPath);
const forbiddenReferences=new Set(exclusions.excludedHistoricalConstructionInputs.map(r=>r.base.path));
const selection=read(audit.selection.path,audit.selection.sha256);assert.equal(selection.files.length,147);
const selected=selection.files.map(p=>{const q=read(p);assert(q.accepted);assert.equal(q.levelSha256,levelSha256(q.level));return{...descriptor(p),formalId:q.formalId,sourceLevelId:q.sourceLevelId,stageKey:q.stageKey,difficulty:q.difficulty};});
const stages={};for(const q of selected){stages[q.stageKey]??=[0,0,0];stages[q.stageKey][q.difficulty-1]++;}
const missingByStage=Object.fromEntries(Object.entries(stages).map(([k,a])=>[k,a.map(n=>10-n)]));
const missing=[0,1,2].map(i=>Object.values(missingByStage).reduce((n,a)=>n+a[i],0));assert.deepEqual(missing,[20,51,82]);
const eightPath=`${V4}/proof/late-recipes-actual-independent-01/report.json`,eight=read(eightPath,'63807ece865aa48bb958ded0d08370ecfca08ee011c3aaf0a7b1700be1ddaed9');
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
Object.assign(bindings,environment.bindings,runtime.toolchainBindings);
const specs=[
 [109,'axial3-global-10/candidate-0338',1,[0]],
 [13,'broad-rect-04/candidate-0353',1,[0]],
 [155,'nearband16-shared/candidate-0030',1,[0]],
 [130,'axial2-rect-10/candidate-0631',1,[0]],
 [23,'concave-plain-08/candidate-0450',1,[0]],
 [21,'dense-rect-07/candidate-0211',1,[0]],
 [17,'axial2-rect-10/candidate-0159',2,[0,0]],
 [154,'bar-global-09/candidate-0710',2,[0,0]],
 [131,'concave-plain-08/candidate-0279',2,[0,0]],
 [100,'generator-berths-05/candidate-0057',2,[0,0]],
 [60,'wide-rect-06/candidate-0511',2,[0,0]],
];
const recipes=[];
for(const [source,suffix,band,optionIndexes]of specs){
 const row=audit.rows.find(r=>r.sourceLevelId===source&&r.reference.path.includes(suffix));assert(row&&!row.error&&row.difficulty===band);
 const history=supply.rows.find(r=>r.path===row.reference.path);assert(history?.acceptedPublicReceiptBound&&history.plain);
 assert(!forbiddenReferences.has(row.reference.path));
 assert(history.issues.every(x=>['live-family','selected-or-reserved-global-near'].includes(x)),'Retired, failed or unknown reference excluded');
 const q=read(row.reference.path,row.reference.sha256);assert(q.accepted);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),row.fullRouteSha256);
 const sourceBinding=await currentMainlineSourceBinding(runtime,environment,source);Object.assign(bindings,sourceBinding.bindings);
 assert.equal(boardBaselineSha256(q.level),boardBaselineSha256(runtime.LEVELS.find(l=>l.id===source)));
 for(const [stockWithinSource,optionIndex]of optionIndexes.entries()){
  const option=row.options[optionIndex];assert(option&&option.fraction>=.35&&option.newTailParkingAllowance>0);
  const ids=new Set(option.region.bodyIds),changedBodies=q.level.blocks.filter(b=>ids.has(b.id)),fixedBlocks=q.level.blocks.filter(b=>!ids.has(b.id));
  const cells=changedBodies.flatMap(absoluteCells).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);assert.deepEqual(cells,option.region.cells);assert.equal(levelSha256(cells),option.regionSha256);
  const prefix=q.drags.slice(0,option.prefixDrags);assert(prefix.every(d=>!ids.has(d.blockId)));assert.equal(q.drags.findIndex(d=>ids.has(d.blockId)),prefix.length);assert.equal(routeSha256(prefix),option.prefixSha256);
  const all=new Set(cells.map(p=>p.join(','))),seen=new Set([cells[0].join(',')]),queue=[cells[0]];
  for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(all.has(p.join(','))&&!seen.has(p.join(','))){seen.add(p.join(','));queue.push(p);}assert.equal(seen.size,cells.length);
  assert(fixedBlocks.every(b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])))));
  const n=recipes.length+1,bandMax=band===1?20:30;
  recipes.push({recipeId:`low-band-${String(n).padStart(2,'0')}-source-${source}`,maximumStocks:1,stockWithinSource:stockWithinSource+1,
   targetDifficulty:band,lowerFloor:band===1?16:21,upperCeiling:bandMax,tailParkingCeiling:bandMax-option.prefixParking,
   reference:row.reference,referenceHistoricalBounds:{L:row.L,U:row.U,drags:q.drags.length,notNewStockEvidence:true},
   historicalReferencePublicEvidence:history.journal.evidence,occupiedReferenceFamilies:history.liveFamilyRoots,
   board:{sourceLevelId:source,width:row.width,height:row.height,playableCells:row.boardArea,baselineSha256:boardBaselineSha256(q.level)},currentSourceBinding:sourceBinding,
   blueprint:{version:LATE_REGION_VERSION,recipeId:`low-band-${String(n).padStart(2,'0')}-source-${source}`,maximumStocks:1,
    reference:row.reference,referenceLevelSha256:q.levelSha256,referenceRouteSha256:row.fullRouteSha256,sourceLevelId:source,
    level:q.level,fixedBlocks,changedBodies,region:{cells,bodyIds:[...ids],fraction:cells.length/boardCells(q.level).length,area:cells.length,originalBodyCount:ids.size,connected:true,sha256:option.regionSha256},
    prefixDrags:prefix,prefixSha256:option.prefixSha256,prefixFacts:{drags:option.prefixDrags,parking:option.prefixParking,clears:option.prefixClears,releasedArea:option.prefixReleasedArea,remainingBodies:option.remainingOriginalBodies,originalSuffixParking:option.originalTailParking},
    knownReferenceOnly:true,newCandidateRouteNotClaimed:true,searchPerformed:false},
   noNewPhysicalInput:true,completeReferenceRouteIsNotNewStockU:true,prefixIsNotLowerBound:true,
   rationale:option.prefixClears>=6?'Known prefix releases substantial space before the rebuilt region is first used.':'Retain a longer live blocking sequence; finite tail search is less predictable because the released hole remains small.'});
 }
}
assert.equal(recipes.length,16);assert.equal(new Set(recipes.map(r=>r.board.sourceLevelId)).size,11);
const excludedRetired=supply.rows.filter(r=>r.path.includes('broad-rect-04/candidate-0533')).map(r=>({path:r.path,sha256:r.sha256,issues:r.issues,excludedFromProposal:true}));assert.equal(excludedRetired.length,1);
const oldPlanPath=`${V4}/design/fixed-late-recipes-eight-plan-02/plan.json`,oldPlan=read(oldPlanPath);
const old450=oldPlan.old450.map(d=>{read(d.path,d.sha256);return d;});
const qualification=read(oldPlan.qualification.path,oldPlan.qualification.sha256);assert.equal(qualification.status,'INDEPENDENT_GATE_AWARE_QUALIFICATION_PASS');
for(const [p,h]of Object.entries(qualification.toolBindings)){assert.equal(sha(fs.readFileSync(p)),h);bindings[p]=h;}
const filesWithin=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=`${d}/${e.name}`;return e.isDirectory()&&!e.isSymbolicLink()?filesWithin(p):e.isFile()&&/^(candidate|input)-.*\.json$/.test(e.name)?[p]:[];}):[];
const previousMacro=[];
for(const base of [`${V3}/design`,`${V4}/design`])for(const e of fs.readdirSync(base,{withFileTypes:true})){
 if(!e.isDirectory()||!e.name.startsWith('macro-'))continue;
 for(const p of filesWithin(`${base}/${e.name}`)){const q=read(p);if(q.level?.blocks&&q.level?.gates)previousMacro.push({...descriptor(p),sourceLevelId:q.sourceLevelId??q.level.id});}
}
const previousLateStocks=[];
for(const n of fs.readdirSync(LATE_PREFIX_CONSTRUCTION_LEDGER))if(n.endsWith('.claim.json')){
 const claim=read(`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${n}`);assert.equal(claim.qualificationOnly,false);
 const resultPath=`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${n.replace('.claim.json','.result.json')}`;assert(fs.existsSync(resultPath),'Earlier constructor still pending');read(resultPath);
 for(const file of fs.readdirSync(claim.outputDirectory))if(/^construction-.*\.json$/.test(file)){
  const p=`${claim.outputDirectory}/${file}`,q=read(p);if(q.placeholderWorld){assert.equal(designFingerprints(q.placeholderWorld).shapeSha256,q.stockFingerprints.shapeSha256);
   previousLateStocks.push({...descriptor(p),shapeSha256:q.stockFingerprints.shapeSha256,level:q.level??q.placeholderWorld});}
 }
}
const sealedFailures=oldPlan.sealedFailures.map(d=>{const q=read(d.path,d.sha256);assert.equal(q.accepted,false);assert.deepEqual(designFingerprints(q.level),d.fingerprints);return d;});
const branchPath=`${V3}/design/macro-prefix64-04/scope156/preview-1/report.json`,branch=read(branchPath);
const failedParents=specs.map(([source])=>{
 const d=branch.latestFailedBySource.find(r=>r.source===source);assert(d);const q=read(d.file,d.sha256);assert.equal(q.accepted,false);assert.equal(q.sourceLevelId,source);
 const request=read(d.requestFile,d.requestSha256),result=read(d.resultFile,d.resultSha256);assert.deepEqual(q.attempt,request);assert.equal(result.accepted,false);
 read(`${PUBLIC_ATTEMPT_LEDGER}/${request.id}.blocked.json`);read(`${PUBLIC_ATTEMPT_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`);
 return{...d,source,fingerprints:designFingerprints(q.level),branchParentMeaning:'Explicit failed origin of this new whole-region branch; all later public identities and construction stocks are separately forbidden, not omitted.'};
});
const publicStocks=[];
for(const n of fs.readdirSync(PUBLIC_ATTEMPT_LEDGER))if(n.endsWith('.request.json')){
 const p=`${PUBLIC_ATTEMPT_LEDGER}/${n}`,q=read(p);assert(q.shapeSha256&&q.colorSha256&&q.id);
 publicStocks.push({...descriptor(p),id:q.id,shapeSha256:q.shapeSha256,colorSha256:q.colorSha256,designSha256:q.designSha256??q.id,retryIdentitySha256:levelSha256({shapeSha256:q.shapeSha256,colorSha256:q.colorSha256})});
}
const blueprints=specs.map(([source,,band,stockOptions])=>{
 const r=recipes.find(r=>r.board.sourceLevelId===source);return{...r.blueprint,recipeId:`low-band-source-${source}-d${band}`,targetDifficulty:band,maximumStocks:stockOptions.length,
  currentSourceBinding:r.currentSourceBinding,referenceHistoricalBounds:r.referenceHistoricalBounds,
  prefixPlanExplanation:{targetFloor:r.lowerFloor,totalUpperCeiling:r.upperCeiling,tailParkingCeiling:r.tailParkingCeiling,prefixIsNotLowerBound:true,actualLowBandWrapperMustEnforce:true}};
});
const compiled=await build({entryPoints:[own,driver],bundle:true,packages:'external',write:false,outdir:'unused-esbuild-output',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
for(const p of Object.keys(compiled.metafile.inputs)){const f=p.replaceAll('\\','/');bindings[f]=sha(fs.readFileSync(f));}
const plan={schemaVersion:4,scope:300,version:'late-prefix-low-band-sixteen-v1',status:'FIXED_LOW_BAND_RECIPES_PREPARED_NO_CONSTRUCTION',
 independentRecipeReviewRequired:true,selectedIndex:audit.selection,selected,sourceAudit:descriptor(auditPath),supplyAudit:descriptor(supplyPath),historicalFailureExclusion:descriptor(exclusionPath),
 previousFixedEightCompletion:descriptor(eightPath),currentMissingByDifficulty:missing,currentMissingByStage:missingByStage,
 counts:{proposedStocks:16,targetD1:6,targetD2:10,sources:11,sourceOutlines:new Set(recipes.map(r=>r.board.baselineSha256)).size,newPhysicalCandidates:0,newSearches:0,ledgerWrites:0},
 recipes,blueprints,excludedRetired,old450,previousMacro,previousLateStocks,sealedFailures,failedParents,publicStocks,
 inheritedHistoryPlan:descriptor(oldPlanPath),failedBranchSnapshot:descriptor(branchPath),qualification:oldPlan.qualification,
 sequence:{baseSeed:814021003,step:7919,sourceFactor:101,bodyCountDeltas:[1,-1,2,0,3,-2]},
 maximumFinalColourInputsIncludingRejected:16,maximumStocksEnteringColourCspIncludingFailed:16,maximumStaticPartitionAttempts:4000,
 previousMacro64ActualInputs:33,combinedMaximumInputs:64,maximumAfterThisBatch:49,
 maximumPerSource:Object.fromEntries(specs.map(([source,,,a])=>[source,a.length])),
 staticSlots:{1:{formalId:'daily-basic-combined-d1-01',stageKey:'basic-combined',difficulty:1,slot:1,newestMechanism:null},2:{formalId:'daily-basic-combined-d2-01',stageKey:'basic-combined',difficulty:2,slot:1,newestMechanism:null}},
 staticSlotIsOnlyAValidationEnvelope:true,slotAssigned:false,candidatePoolOnly:true,
 gatePolicy:oldPlan.gatePolicy,staticPartitionBudget:oldPlan.staticPartitionBudget,colourBudget:oldPlan.colourBudget,
 futureUpperBudget:oldPlan.futureUpperBudget,futureLowerBudget:oldPlan.futureLowerBudget,
 futureStrategy:{upper:'same-full-input-claim-before-one-fixed-prefix-plus-one-band-capped-tail',originalLowerFloorByDifficulty:{1:16,2:21},completeUpperCeilingByDifficulty:{1:20,2:30},tailUpperCeiling:'band ceiling minus verified prefix parking',maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,lowerOnlyAfterActualCompleteOriginalU:true,noFloorFallback:true},
 budget:{upper:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000,includes:'All prior complete construction worlds, colouring worlds, prefix commits, tail search and guard allowance; transitions/micro/time deducted too.'},lower:{maxStates:9999,guardAllowance:1,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}},
 workflow:['This fixed metadata plan requires an independent recipe review before the root-owned constructor. Mathematical calls require the separately qualified low-band wrapper and its own immutable before-claim plan.',
  'Use the explicit earlier-prefix blueprint with the frozen gate-aware static constructor; never invoke or modify the fixed-parking31 blueprint maker.',
  'Change the entire connected footprint union with new native shapes and actual colours; outside body fields remain exact. Each stock may enter colour CSP once, including a rejected CSP. No replacement beyond its fixed quota.',
  'Require exact normal source mask, full coverage, native artwork, adjacent-colour legality, fixed prefix actual first-contact and swept exit validation, plus actual symmetric geometry gates and visual review before claim.',
  'Use an independently qualified low-band wrapper. Freeze each targetDifficulty before original full-identity claim; one tail U under the remaining shared upper budget, full original dual replay, then one original L16 or L21. Reject out-of-band U, UNKNOWN and shortcut without trying another floor or solver.',
  'No old physical failure, same stock with another colour, restored earlier prefix, extra tail pass or stage fallback is permitted. Each new failure persists the actual parent fingerprints and usage.',
  'A successful plain base is only an exploratory supply object. Read its actual full route for mechanism capacity, select one advanced stage, construct once with real participation and strengthened counters, then perform that final object validation. Never assign one base to several slots.'],
 geometry:{minimumActualChangedAreaFraction:.35,exactRegionUnion:true,referenceMaximum:.65,latestSelectionPreFilterMaximum:.65,sourceMaximum:.55,old450Maximum:.75,priorMacroMaximum:.65,newBatchMaximum:.65,allComparisonsSymmetricEightTransforms:true,noVisualIndependenceClaimBeforeNewStockExists:true},
 similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,source:.55,old450:.75,newBatch:.65},
 advancedUse:{basicD1D2AlreadyFull:true,unfilledD1:{generator:5,key:1,shell:4,star:5,bomb:5},
  firstReadOnlyCapacityPass:['For new routes, measure first action/first colour exit and usable gate IDs; use the key/flip/ice or capacity contracts only in their qualified domains.',
   'Late unused bodies in source109/13/155 regions are candidates for delayed shell/key/star participation, but no participation or number is certified by the parent route.',
   'Generator demand remains a separate hardware and FIFO condition. Eight-colour gate-aware recipes do not guarantee two or three free native machine mounts; do not fill generator slots by a label or tail-only cargo.',
   'Bomb deadlines use the actual new route and final natural-clock Pointer qualification, never non-clearing count alone.'],
  noFixedUniversalInstanceQuota:true,newestMechanismMustActuallyParticipate:true,stageAssigned:false},
 wrapperQualificationRequired:['Fixed D1/D2 ceiling checked before lower; an over-band U produces zero lower calls.',
  'Prefix coordinate/first-contact/exit-sweep preservation and original full-inventory dual replay.',
  'Shared constructor + prefix + tail + guard world count <=10000; all micro, transition and elapsed use included.',
  'Exactly one lower floor fixed before claim; lower UNKNOWN or shortcut terminal, no downgrading retry.',
  'Tampered plan/source/construction bytes or identity rejected; old failed physical identity remains blocked.',
  'Qualification-only private namespace rejects both lexical and junction-resolved public roots.'],
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,policyRuleVersion:runtime.policyRuleVersion,mathRuleVersion:runtime.mathRuleVersion,mathematicalToolchainSha256:runtime.toolchainSha256,
 newConstructions:0,newSearches:0,ledgerWrites:0,searchPerformed:false,constructionPerformed:false,formalReady:false,bindings};
fs.mkdirSync(output);fs.writeFileSync(`${output}/plan.json`,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({plan:descriptor(`${output}/plan.json`),counts:plan.counts,missing,history:{previousMacro:previousMacro.length,previousLateStocks:previousLateStocks.length,publicStocks:publicStocks.length},recipes:blueprints.map(r=>({id:r.recipeId,source:r.sourceLevelId,difficulty:r.targetDifficulty,quota:r.maximumStocks,area:r.region.area,prefix:r.prefixFacts,tailCeiling:r.prefixPlanExplanation.tailParkingCeiling}))},null,2));

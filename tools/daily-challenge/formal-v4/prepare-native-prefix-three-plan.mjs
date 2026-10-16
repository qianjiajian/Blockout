import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {LATE_REGION_VERSION} from './late-region-gate-aware-factory.mjs';
import {LATE_PREFIX_CONSTRUCTION_LEDGER} from './late-prefix-plan-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Prepare immutable metadata only. No constructor/CSP/ledger helper/search.
const V3='deliverables/daily-formal-v3-20261008',V4='deliverables/daily-formal-v4-20261008';
const own='tools/daily-challenge/formal-v4/prepare-native-prefix-three-plan.mjs';
const driver='tools/daily-challenge/formal-v4/construct-native-prefix-recipes.mjs';
const out=`${V4}/design/native-prefix-three-plan-01`;assert(!fs.existsSync(out));
const bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
const read=(p,h)=>{const bytes=fs.readFileSync(p);bindings[p]=sha(bytes);if(h)assert.equal(bindings[p],h);return JSON.parse(bytes);};
const descriptor=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const optionsPath=`${V4}/design/native-tail-eight-proposal-01/reference-options.json`,options=read(optionsPath,'f7629cee3cfe4495702e7bb23592e108425a0e1a7e8906fed91b9791722d07bb');
const oldPlanPath=`${V4}/design/low-band-sixteen-plan-01/plan.json`,oldPlan=read(oldPlanPath,'956f5f2e2bce5eac51c60b5511ba9bc1b443ba74ee476bbf9e24dca37f9c17a5');
const diagnosisPath=`${V4}/proof/late-recipes-upper-strategy-readonly-01.json`,diagnosis=read(diagnosisPath);
const lowIndexPath=`${V4}/design/low-band-sixteen-construct-01/index.json`,lowIndex=read(lowIndexPath);assert.equal(lowIndex.macro64ActualInputsIncludingThis,49);assert.equal(lowIndex.fixedColourInputs,16);
const lowMathPath=`${V4}/design/low-band-sixteen-math-01/completion.json`,lowMath=read(lowMathPath);assert.equal(lowMath.mathematicalPoolAccepted,2);
const reservedInputs=lowIndex.candidates.map(d=>{const q=read(d.path,d.sha256);return{...descriptor(d.path),sourceLevelId:q.sourceLevelId,levelSha256:q.levelSha256,targetDifficulty:q.targetDifficulty};});
const reservedAccepted=lowMath.accepted.map(d=>{const q=read(d.file??d.path,d.sha256);assert(q.accepted);return{...descriptor(d.file??d.path),sourceLevelId:q.sourceLevelId,difficulty:q.difficulty,L:q.L,U:q.U,stageAssigned:false};});
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);Object.assign(bindings,environment.bindings,runtime.toolchainBindings);
const selection=read(oldPlan.selectedIndex.path,oldPlan.selectedIndex.sha256);assert.equal(selection.files.length,147);
const selected=selection.files.map(p=>{const q=read(p);assert(q.accepted);return{...descriptor(p),levelSha256:levelSha256(q.level)};});
const old450=oldPlan.old450.map(d=>{read(d.path,d.sha256);return d;});
const qualifications=[oldPlan.qualification,{path:`${V4}/proof/native-prefix-tail-root-independent-01/report.json`}];
for(const d of qualifications)read(d.path,d.sha256);
const nativeQualification=descriptor(qualifications[1].path);assert.equal(read(nativeQualification.path,nativeQualification.sha256).status,'INDEPENDENT_NATIVE_PREFIX_TAIL_V4_PASS');

const recursiveFiles=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>{const p=`${directory}/${e.name}`;return e.isDirectory()&&!e.isSymbolicLink()?recursiveFiles(p):e.isFile()&&e.name.endsWith('.json')?[p]:[];});
const previousMacro=[];
for(const base of [`${V3}/design`,`${V4}/design`])for(const e of fs.readdirSync(base,{withFileTypes:true})){
 if(!e.isDirectory()||!e.name.startsWith('macro-'))continue;
 for(const p of recursiveFiles(`${base}/${e.name}`))if(/\/(candidate|input)-[^/]+\.json$/.test(p)){const q=read(p);if(q.level?.blocks&&q.level?.gates)previousMacro.push({...descriptor(p),sourceLevelId:q.sourceLevelId??q.level.id});}
}
const previousLateStocks=[];
for(const n of fs.readdirSync(LATE_PREFIX_CONSTRUCTION_LEDGER))if(n.endsWith('.claim.json')){
 const claim=read(`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${n}`);assert.equal(claim.qualificationOnly,false);
 read(`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${n.replace('.claim.json','.result.json')}`);
 for(const file of fs.readdirSync(claim.outputDirectory))if(/^construction-.*\.json$/.test(file)){
  const p=`${claim.outputDirectory}/${file}`,q=read(p);if(q.placeholderWorld){assert.equal(designFingerprints(q.placeholderWorld).shapeSha256,q.stockFingerprints.shapeSha256);
   previousLateStocks.push({...descriptor(p),shapeSha256:q.stockFingerprints.shapeSha256,level:q.level??q.placeholderWorld});}
 }
}
const publicStocks=[];
for(const n of fs.readdirSync(PUBLIC_ATTEMPT_LEDGER))if(n.endsWith('.request.json')){
 const p=`${PUBLIC_ATTEMPT_LEDGER}/${n}`,q=read(p);assert(q.shapeSha256&&q.colorSha256&&q.id);
 publicStocks.push({...descriptor(p),id:q.id,shapeSha256:q.shapeSha256,colorSha256:q.colorSha256,designSha256:q.designSha256??q.id,retryIdentitySha256:levelSha256({shapeSha256:q.shapeSha256,colorSha256:q.colorSha256})});
}
// Preserve a complete read-only file-byte inventory of all shared public and
// construction ledgers, including results/blocked records and aliases. No
// inspecting helper is used because some legacy inspectors create aliases.
const ledgerDirectories=[PUBLIC_ATTEMPT_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,`${V3}/design/reverse-construction-attempts`,`${V3}/design/vacancy-joint-construction-attempts`,`${V4}/proof/capacity-construction-attempts`];
const ledgerInventory=ledgerDirectories.map(directory=>{const files=recursiveFiles(directory).sort();let bytes=0;
 return{directory,files:files.map(p=>{const b=fs.readFileSync(p);bytes+=b.length;return{path:p,sha256:sha(b),bytes:b.length};}),get bytes(){return bytes;}};});
const sealedFailures=oldPlan.sealedFailures.map(d=>{const q=read(d.path,d.sha256);assert.equal(q.accepted,false);return d;});
const explicitParents=[{source:198,file:`${V4}/design/fixed-late-recipes-eight-math-01/candidate-005.json`},{source:18,file:`${V4}/design/late-prefix-gate-aware-math-01/candidate-003.json`},oldPlan.failedParents.find(x=>x.source===100)];
const failedParents=explicitParents.map(d=>{assert(d);const q=read(d.file,d.sha256);assert.equal(q.accepted,false);assert.equal(q.sourceLevelId,d.source);
 const requestFile=`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.request.json`,resultFile=`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.result.json`;
 const request=read(requestFile),result=read(resultFile);assert.deepEqual(q.attempt,request);assert.equal(result.accepted,false);
 read(`${PUBLIC_ATTEMPT_LEDGER}/${request.id}.blocked.json`);read(`${PUBLIC_ATTEMPT_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`);
 return{source:d.source,file:d.file,sha256:bindings[d.file],id:request.id,requestFile,requestSha256:bindings[requestFile],resultFile,resultSha256:bindings[resultFile],fingerprints:designFingerprints(q.level)};
});
const specs=[{source:198,suffix:'d3-batch-03/candidate-0025.json',area:26,cut:65},{source:18,suffix:'late-prefix-gate-aware-math-01/candidate-002.json',area:15,cut:49},{source:100,suffix:'late-prefix-first-math-01/candidate-000.json',area:18,cut:43}];
const blueprints=[];
for(const spec of specs){const row=options.rows.find(r=>r.sourceLevelId===spec.source&&r.reference.path.endsWith(spec.suffix));assert(row&&!row.error);
 const option=row.options.find(o=>o.region.area===spec.area&&o.prefixDrags===spec.cut&&o.newRectangleInventoryCompatible);assert(option);
 const q=read(row.reference.path,row.reference.sha256);assert(q.accepted);assert.equal(levelSha256(q.level),row.levelSha256);assert.equal(routeSha256(q.drags),row.routeSha256);
 const ids=new Set(option.region.bodyIds),changedBodies=q.level.blocks.filter(b=>ids.has(b.id)),fixedBlocks=q.level.blocks.filter(b=>!ids.has(b.id));
 const cells=changedBodies.flatMap(absoluteCells).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);assert.equal(levelSha256(cells),option.region.sha256);
 assert.equal(cells.length/boardCells(q.level).length,option.region.fraction);assert(option.region.fraction>=.35);
 const prefixDrags=q.drags.slice(0,spec.cut);assert(prefixDrags.every(d=>!ids.has(d.blockId)));assert.equal(q.drags.findIndex(d=>ids.has(d.blockId)),spec.cut);assert.equal(routeSha256(prefixDrags),option.prefixSha256);
 const source=runtime.LEVELS.find(l=>l.id===spec.source);assert.equal(boardBaselineSha256(q.level),boardBaselineSha256(source));
 const sourceBinding=await currentMainlineSourceBinding(runtime,environment,spec.source);Object.assign(bindings,sourceBinding.bindings);
 const originalInput=q.input?.path?read(q.input.path,q.input.sha256):null;
 blueprints.push({version:LATE_REGION_VERSION,recipeId:`native-d3-source-${spec.source}-cut-${spec.cut}`,maximumStocks:1,targetDifficulty:3,
  reference:row.reference,referenceLevelSha256:row.levelSha256,referenceRouteSha256:row.routeSha256,sourceLevelId:spec.source,
  level:q.level,fixedBlocks,changedBodies,region:option.region,prefixDrags,prefixSha256:option.prefixSha256,
  prefixFacts:{drags:spec.cut,parking:option.prefixParking,clears:option.prefixClears,releasedArea:option.prefixReleasedArea,remainingBodies:option.remainingOriginalBodies,originalSuffixParking:option.originalTailParking},
  currentSourceBinding:sourceBinding,referenceOriginalInput:q.input??null,referenceWholeRegionProvenance:originalInput?.provenance??null,
  knownReferenceOnly:true,newCandidateRouteNotClaimed:true,searchPerformed:false,prefixIsNotLowerBound:true});
}
const compiled=await build({entryPoints:[own,driver,'tools/daily-challenge/formal-v4/prefix-tail-native-v4.mjs'],bundle:true,packages:'external',write:false,outdir:'unused-esbuild-output',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
for(const p of Object.keys(compiled.metafile.inputs)){const f=p.replaceAll('\\','/');bindings[f]=sha(fs.readFileSync(f));}
const plan={schemaVersion:4,scope:300,version:'late-prefix-native-three-v1',status:'FIXED_THREE_NATIVE_RECIPES_PREPARED_NO_CONSTRUCTION',
 inheritedHistoryPlan:descriptor(oldPlanPath),referenceOptions:descriptor(optionsPath),upperStrategyDiagnosis:descriptor(diagnosisPath),
 selectedIndex:oldPlan.selectedIndex,selected,old450,previousMacro,previousLateStocks,sealedFailures,failedParents,publicStocks,blueprints,
 reservedLowBandInputs:reservedInputs,reservedLowBandAccepted:reservedAccepted,lowBandCompletion:descriptor(lowMathPath),lowBandConstruction:descriptor(lowIndexPath),
 previousMacro64ActualInputs:49,maximumAfterThisBatch:52,combinedMaximumInputs:64,maximumStaticPartitionAttempts:2000,
 maximumFinalColourInputsIncludingRejected:3,maximumStocksEnteringColourCspIncludingFailed:3,maximumPerSource:{198:1,18:1,100:1},
 sequence:{baseSeed:815022003,step:7919,sourceFactor:101,bodyCountDeltas:[1,-1,2,0,3,-2]},
 qualification:oldPlan.qualification,nativeQualification,staticSlot:{formalId:'daily-basic-combined-d3-01',stageKey:'basic-combined',difficulty:3,slot:1,newestMechanism:null},
 staticSlotIsOnlyAValidationEnvelope:true,candidatePoolOnly:true,slotAssigned:false,
 geometry:oldPlan.geometry,similarity:oldPlan.similarity,gatePolicy:oldPlan.gatePolicy,staticPartitionBudget:oldPlan.staticPartitionBudget,colourBudget:oldPlan.colourBudget,
 futureUpperBudget:oldPlan.futureUpperBudget,futureLowerBudget:oldPlan.futureLowerBudget,
 futureStrategy:{upper:'one-guarded-native-tail-prioritizing-fewer-live-layers',tailStrategy:'native',originalLowerFloor:31,maximumTailCalls:1,maximumOriginalLowerCalls:1,upperParkingCap:null,
  lowerOnlyAfterActualCompleteOriginalU:true,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true},
 sameInputBudget:{upperFormula:'constructor complete worlds + prefix.length + 1 + nativeTail.rawDiscovered + guard1 <= 10000',
  tailStateAllowance:'min(9999,10000 - constructorWorlds - prefix.length - 1 - terminalGuard1)',
  microTransitionElapsed:'Deduct actual construction usage, then actual fixed-prefix unit work and elapsed time from the one native tail budget. Never reset per prefix, body or tail retry.',
  lower:'One fresh original full-input L31, at most9999 generated worlds+terminal1; tail progress/floor does not become original L.',
  failure:'U unknown, native witness replay rejection, U<31, or lower UNKNOWN/shortcut seals the original full identity. No second prefix, no plain-joint fallback, no budget extension.'},
 deferredOnlyNotExecutable:[{source:29,area:24,boardArea:63,prefixParking:14},{source:86,area:8,boardArea:22,prefixParking:9},{source:42,area:15,boardArea:41,prefixParking:5},{source:115,area:17,boardArea:48,prefixParking:12},{source:14,area:13,boardArea:35,prefixParking:12}],
 deferredReason:'Each has >=35% connected area but a weaker retained parking prefix. Not counted among this batch or permitted as fallback.',
 source54Exclusion:'Solid-rectangle tail domain would require rebuilding the early nonrectangle body; latest compatible cut4 keeps only3 parking and rebuilds59/70 cells. Not selected.',
 noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,selectionUnchanged:true,mathematicalAcceptanceIsNotFinalSlotAcceptance:true,
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,mathematicalToolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
 newConstructions:0,newSearches:0,ledgerWrites:0,formalReady:false,bindings};
fs.mkdirSync(out);const inventoryPath=`${out}/ledger-inventory.json`;fs.writeFileSync(inventoryPath,JSON.stringify({status:'READ_ONLY_COMPLETE_SHARED_LEDGER_BYTE_SNAPSHOT',entries:ledgerInventory,newWrites:0},null,2)+'\n',{flag:'wx'});
plan.ledgerInventory=descriptor(inventoryPath);plan.bindings[inventoryPath]=plan.ledgerInventory.sha256;
fs.writeFileSync(`${out}/plan.json`,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({plan:descriptor(`${out}/plan.json`),ledgerInventory:plan.ledgerInventory,history:{publicRequests:publicStocks.length,lateStocks:previousLateStocks.length,ledgerFiles:ledgerInventory.map(x=>[x.directory,x.files.length,x.bytes])},recipes:blueprints.map(b=>({recipe:b.recipeId,area:b.region.area,fraction:b.region.fraction,prefix:b.prefixFacts})),newConstructions:0,newSearches:0},null,2));

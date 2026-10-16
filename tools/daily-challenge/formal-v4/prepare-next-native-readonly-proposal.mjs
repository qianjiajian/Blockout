import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {describeLayout} from '../formal-v3/diversity.mjs';
import {absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';

// Metadata and complete file-byte history snapshot only. No constructor,
// colour CSP, gameplay search, attempt helper, or mutable ledger is invoked.
const V3='deliverables/daily-formal-v3-20261008',V4='deliverables/daily-formal-v4-20261008';
const output=`${V4}/design/next-native-readonly-proposal-01`;assert(!fs.existsSync(output));
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
const read=(p,h)=>{const b=fs.readFileSync(p);bindings[p]=sha(b);if(h)assert.equal(bindings[p],h);return JSON.parse(b);};
const descriptor=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>{const p=`${directory}/${e.name}`;
 return e.isDirectory()&&!e.isSymbolicLink()?walk(p):e.isFile()&&p.endsWith('.json')?[p]:[];});
const priorPath=`${V4}/design/native-prefix-three-plan-01/plan.json`,prior=read(priorPath,'e4b6b71836e9c2daee2d7efba4b0601638ac55d3e3e6d4cf74018fca24dcc727');
const optionsPath=`${V4}/design/next-native-six-readonly-01/reference-regions.json`,options=read(optionsPath,'0f1ef3031af2c83f4771002016c9a23be4a1dd3c5ad75e44d6906d544be4239f');
const native=read(options.nativeCompletion.path,options.nativeCompletion.sha256);
const nativeIndex=read(options.nativeConstruction.path,options.nativeConstruction.sha256);assert.equal(nativeIndex.macro64ActualInputsIncludingThis,51);
const selection=read(prior.selectedIndex.path,prior.selectedIndex.sha256);assert.equal(selection.files.length,147);
const selected=selection.files.map(p=>{const q=read(p);assert(q.accepted);return{...descriptor(p),levelSha256:levelSha256(q.level),partitionSha256:describeLayout(q.level).exactPartitionSha256};});
const reservedAccepted=[...prior.reservedLowBandAccepted,...native.accepted].map(d=>{
 const q=read(d.path,d.sha256);assert(q.accepted);return{...descriptor(d.path),sourceLevelId:q.sourceLevelId,L:q.L,U:q.U,
  levelSha256:levelSha256(q.level),partitionSha256:describeLayout(q.level).exactPartitionSha256,notAssignedByThisProposal:true};});
const previousMacro=prior.previousMacro.map(d=>{read(d.path,d.sha256);return d;});
const lateRoot=`${V4}/design/late-prefix-construction-ledger`,publicRoot=`${V3}/proof/attempts`;
const previousLateStocks=[];
for(const name of fs.readdirSync(lateRoot))if(name.endsWith('.claim.json')){
 const claim=read(`${lateRoot}/${name}`);assert.equal(claim.qualificationOnly,false);
 read(`${lateRoot}/${name.replace('.claim.json','.result.json')}`);
 for(const file of fs.readdirSync(claim.outputDirectory))if(/^construction-.*\.json$/.test(file)){
  const p=`${claim.outputDirectory}/${file}`,q=read(p);if(q.placeholderWorld){const level=q.level??q.placeholderWorld,f=designFingerprints(level);
   previousLateStocks.push({...descriptor(p),sourceLevelId:q.sourceLevelId??level.id,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,
    partitionSha256:describeLayout(level).exactPartitionSha256,completeColourInput:!!q.paint,
    status:q.status,levelSha256:levelSha256(level)});}
 }
}
const publicStocks=[];
for(const name of fs.readdirSync(publicRoot))if(name.endsWith('.request.json')){
 const p=`${publicRoot}/${name}`,q=read(p);assert(q.id&&q.shapeSha256&&q.colorSha256);
 const resultPath=`${publicRoot}/${q.id}.result.json`,result=fs.existsSync(resultPath)?read(resultPath):null;
 publicStocks.push({...descriptor(p),id:q.id,levelSha256:q.levelSha256,shapeSha256:q.shapeSha256,colorSha256:q.colorSha256,
  retryIdentitySha256:q.retryIdentitySha256,result:result?descriptor(resultPath):null,status:result?.status??'PENDING',accepted:result?.accepted??null});
}
const roots=[publicRoot,lateRoot,`${V3}/design/reverse-construction-attempts`,`${V3}/design/vacancy-joint-construction-attempts`,`${V4}/proof/capacity-construction-attempts`];
const inventory=roots.map(directory=>{let totalBytes=0;const files=walk(directory).sort().map(p=>{const b=fs.readFileSync(p);totalBytes+=b.length;return{path:p,sha256:sha(b),bytes:b.length};});
 return{directory,fileCount:files.length,totalBytes,files};});
const specs=[
 {source:18,referenceSuffix:'native-prefix-three-math-01/candidate-000.json',area:25,cut:40,priority:'recommended',
  reason:'Use the newly successful L31/U40 input; rebuild62.5% instead of repeating the previously attempted15-cell cut49 stock domain.'},
 {source:198,referenceSuffix:'d3-batch-03/candidate-0025.json',area:46,cut:43,priority:'recommended',
  reason:'A materially larger65.7% connected area changes seven additional old bodies relative to26-cell cut65; do not retry the nativeU56 failed stock.'},
 {source:118,referenceSuffix:'macro-opening-guarded8-02/candidate-006.json',area:24,cut:33,priority:'recommended',
  reason:'Rebuild the former fixed b6 together with the21-cell region, changing the fixed skeleton and stopping before its first action. Native tail is predeclared only for the new shape+colour input.'},
 {source:29,referenceSuffix:'wide-rect-06/candidate-0379.json',area:24,cut:15,priority:'deferred-for-design-review',
  reason:'Different normal7x9 source with true historical L38; only14 retained parking actions and22 remaining bodies, so lower confidence than the three long-prefix recipes.'},
 {source:100,referenceSuffix:'hard-region-03/candidate-0040.json',area:26,cut:8,priority:'deferred-for-design-review',
  reason:'Different accepted L35 reference and54.2% region, not another seed in the exhausted18-cell cut43 domain; only7 retained parking actions, so do not automatically spend a slot.'},
];
const blueprints=specs.map(spec=>{
 const row=options.rows.find(r=>r.sourceLevelId===spec.source&&r.reference.path.endsWith(spec.referenceSuffix));assert(row&&!row.error&&row.L>=31);
 const region=row.options.find(o=>o.region.area===spec.area&&o.cut===spec.cut);assert(region&&region.region.fraction>=.35);
 const q=read(row.reference.path,row.reference.sha256),changedIds=new Set(region.region.bodyIds);
 const prefix=q.drags.slice(0,spec.cut);assert(prefix.every(d=>!changedIds.has(d.blockId)));assert.equal(q.drags.findIndex(d=>changedIds.has(d.blockId)),spec.cut);
 assert.equal(routeSha256(prefix),region.prefixSha256);
 const changedBodies=q.level.blocks.filter(b=>changedIds.has(b.id)),fixedBlocks=q.level.blocks.filter(b=>!changedIds.has(b.id));
 const cells=changedBodies.flatMap(absoluteCells).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);assert.equal(levelSha256(cells),region.region.sha256);
 assert.equal(levelSha256(fixedBlocks),region.fixedSkeletonSha256);
 const older=prior.blueprints.filter(b=>b.sourceLevelId===spec.source).map(b=>({recipeId:b.recipeId,reference:b.reference,area:b.region.area,
  cut:b.prefixFacts.drags,regionSha256:levelSha256(b.region.cells.toSorted((a,b)=>a[1]-b[1]||a[0]-b[0])),fixedSkeletonSha256:levelSha256(b.fixedBlocks),
  newlyRebuiltOldBodyIds:changedBodies.filter(x=>!b.changedBodies.some(t=>t.id===x.id)).map(x=>x.id)}));
 return{recipeId:`proposed-native-d3-source-${spec.source}-cut-${spec.cut}-area-${spec.area}`,maximumStocks:1,targetDifficulty:3,
  priority:spec.priority,reason:spec.reason,reference:row.reference,referenceLevelSha256:row.levelSha256,referenceRouteSha256:row.routeSha256,
  sourceLevelId:spec.source,sourceLevelSha256:row.sourceLevelSha256,normalDimensions:[row.width,row.height],normalBoardArea:row.boardArea,
  boardOutlineSha256:row.boardOutlineSha256,referenceL:row.L,referenceU:row.U,level:q.level,changedBodies,fixedBlocks,region:region.region,
  prefixDrags:prefix,prefixSha256:region.prefixSha256,fixedSkeletonSha256:region.fixedSkeletonSha256,
  prefixFacts:{drags:spec.cut,parking:region.prefixParking,clears:region.prefixClears,releasedArea:region.prefixReleasedArea,
   remainingBodies:region.remainingBodies,originalSuffixParking:region.originalSuffixParking},differenceFromPreviousRecipe:older,
  prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true,newPhysicalShapeColourNotYetConstructed:true};
});
const sealedParents=[
 {source:18,path:`${V4}/design/late-prefix-gate-aware-math-01/candidate-003.json`},
 {source:198,path:`${V4}/design/native-prefix-three-math-01/candidate-001.json`},
 {source:118,path:`${V4}/design/fixed-late-recipes-eight-math-01/candidate-007.json`},
].map(d=>{const q=read(d.path);assert.equal(q.accepted,false);assert.equal(q.sourceLevelId,d.source);
 const requestPath=`${publicRoot}/${q.attempt.id}.request.json`,resultPath=`${publicRoot}/${q.attempt.id}.result.json`;
 const request=read(requestPath),result=read(resultPath);assert.deepEqual(request,q.attempt);assert.equal(result.accepted,false);
 read(`${publicRoot}/${request.id}.blocked.json`);read(`${publicRoot}/identities/${request.retryIdentitySha256}.blocked.json`);
 return{source:d.source,receipt:descriptor(d.path),id:q.attempt.id,request:descriptor(requestPath),result:descriptor(resultPath),
  shapeSha256:request.shapeSha256,colorSha256:request.colorSha256,branchMeaning:'Explicit failed-source branch; every new candidate must change both real shape and colours, while all history aliases remain forbidden.'};});
const report={schemaVersion:4,scope:300,version:'next-native-up-to-six-readonly-design-review-v1',status:'READ_ONLY_RECIPE_PROPOSAL_NO_EXECUTION_PLAN',
 executable:false,selectedIndex:prior.selectedIndex,selected,reservedAccepted,inheritPriorPlan:descriptor(priorPath),referenceRegions:descriptor(optionsPath),
 blueprints,recommendedRecipes:blueprints.filter(b=>b.priority==='recommended').map(b=>b.recipeId),
 deferredRecipesNotExecutable:blueprints.filter(b=>b.priority!=='recommended').map(b=>b.recipeId),
 previousMacro64ActualInputs:51,absoluteMaximumNewInputs:6,recommendedNewInputs:3,maximumStaticPartitionAttempts:2000,
 maximumAfterRecommendedBatch:54,maximumAfterAbsoluteBatch:57,combinedMaximumInputs:64,maximumStocksPerRecipe:1,
 searchStrategy:{tail:'one fixed native remaining-inventory-first search',fullOriginalLowerFloor:31,
  upperBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},
  originalLowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},terminalGuardAllowance:1,
  completeUpperFormula:'constructor complete worlds + actual fixed prefix committed worlds + native tail raw worlds + terminal guard1 <=10000',
  deductAllConstructionPrefixResources:true,tailSearchesMaximum:1,originalLowerCallsMaximum:1,
  lowerOnlyAfterTwoCompleteOriginalModelReplays:true,noUCapForD3:true,noOtherMethodOrPrefixAfterUnknown:true},
 geometryAndHistoryGates:{normalSourceMask:true,onlySolidUnrotatedRectangleInventory:true,exactConnectedChangedAreaMinimum:.35,
  actualShapeInventoryAndSharedBodyColourChange:true,forbidAllPublicIdentitiesAndPriorConstructedStockShapes:true,
  parentAndAllKnownCurrentCandidateFootprintMaximum:.65,old450Maximum:.75,sourceMaximum:.55,
  bothDirectionsEightGlobalOrientations:true,visualRetiredFamiliesRemainBlocked:true,
  realNewObjectGlobalComparisonRequiredBeforeAnySearch:true,noIndependenceClaimFromRegionMetadata:true},
 history:{previousMacro,previousLateStocks,publicStocks,sealedParents,old450:prior.old450},
 reasonsForNotFillingSix:['Only three distinct normal-board references retain31+ actual parking actions while changing a genuinely large connected region.',
  'Source29 and the changed source100 reference are documented weaker-prefix possibilities for design review, not fallback permission.',
  'Source86 is a22-cell concave board and only9 retained parking actions; it is deferred in this rectangle-only batch.',
  'Sources54/42/52 keep nonrectangle external bodies at their useful late prefixes; no solver-domain extension is proposed.',
  'The old source100 cut43/18-cell stock domain is exhausted under the current exclusions; its plan cannot be restarted.'],
 latestSelectionMustBeReboundBeforeExecution:true,pendingLowBandMechanismFinalsMustJoinFutureComparisonSet:true,
 executionEnvironment:options.executionEnvironment,currentRuntimeValidationClaimed:false,newPhysicalInputs:0,newConstructions:0,newSearches:0,ledgerWrites:0,
 formalReady:false,selectionChanged:false,bindings};
fs.mkdirSync(output);const inventoryPath=`${output}/ledger-inventory.json`;
fs.writeFileSync(inventoryPath,JSON.stringify({status:'READ_ONLY_FULL_SHARED_LEDGER_BYTE_SNAPSHOT',roots:inventory,newWrites:0},null,2)+'\n',{flag:'wx'});
report.history.ledgerInventory=descriptor(inventoryPath);bindings[inventoryPath]=report.history.ledgerInventory.sha256;
for(const file of ['tools/daily-challenge/formal-v4/prepare-next-native-readonly-proposal.mjs','tools/daily-challenge/formal-v4/audit-next-native-reference-regions.mjs',
 'tools/daily-challenge/formal-v4/prefix-tail-native-v4.mjs','tools/daily-challenge/formal-v4/late-region-gate-aware-factory.mjs',
 'tools/daily-challenge/formal-v4/late-prefix-gate-aware-colouring.mjs','tools/daily-challenge/formal-v3/diversity.mjs'])bindings[file]=sha(fs.readFileSync(file));
const file=`${output}/proposal.json`;fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({proposal:descriptor(file),ledgerInventory:report.history.ledgerInventory,
 history:{lateStocks:previousLateStocks.length,publicRequests:publicStocks.length,ledgerFiles:inventory.reduce((n,x)=>n+x.fileCount,0)},
 recipes:blueprints.map(b=>({source:b.sourceLevelId,area:b.region.area,fraction:b.region.fraction,cut:b.prefixFacts.drags,parking:b.prefixFacts.parking,priority:b.priority})),newConstructions:0,newSearches:0},null,2));

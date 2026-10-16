import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding,mapHistoricalBindingsTask} from './prefix-execution-environment-task.mjs';
import {readLowTwenty153Admission} from './prepare-low-twenty-153.mjs';
import {makeExplicitNativeBatchRecipe} from './prepare-native-batch.mjs';
import {assertNativeBatchRecipe,descriptor,integer} from './native-batch-contract.mjs';
import {formedStockImages} from './prepare-early-prefix-four.mjs';
import {assertLowTwentyFailedParent,assertNoFailedDescendant} from './prepare-low-twenty-task.mjs';
import {constructLowTwentyRegionStock} from './low-twenty-region-factory.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {makePrefixTailV4Plan,explorePrefixTailV4} from './prefix-tail-explore-task.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {bodyFootprint} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {readBound,readFile,write,sha,exists,mergeBindings,realPathWithSuffix,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,
 HISTORY_LEDGER_ROOTS,captureLedgerSnapshot,checkLedgerSnapshot,claimNativeBatchPlan,claimNativeBatchMath,finishLatePrefixPlan} from './low-twenty-io.mjs';

export const LONG_PREFIX_VERSION='finite-reviewed-plain-long-prefix-task-v1';
export const SELF='tools/daily-challenge/formal-v4/long-prefix-batch-task.mjs';
export const MATH_ENTRY='tools/daily-challenge/formal-v4/prefix-tail-explore-task.mjs';
export const UPPER_BUDGET=Object.freeze({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
export const LOWER_BUDGET=Object.freeze({...UPPER_BUDGET,maxStates:9999});
export const STATIC_SLOT=Object.freeze({formalId:'daily-basic-combined-d3-01',stageKey:'basic-combined',difficulty:3,slot:1,newestMechanism:null});
const partition=l=>levelSha256(l.blocks.map(bodyFootprint).sort());
const physical=f=>levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
const branch=b=>`${b.sourceLevelId??b.source}:${b.branchId}`;
const nearest=(level,rows)=>rows.reduce((n,q)=>Math.max(n,compareLayouts(level,q.level).footprintSimilarity),0);
const fileDescriptor=async p=>({path:p,sha256:sha(await fs.readFile(p))});
async function checkAll(bindings){for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);}
function unique(xs){return new Set(xs).size===xs.length;}

export function changedShapeAndColour(a,b){
 const shared=b.colorAssignments.filter(x=>a.colorAssignments.some(y=>y.id===x.id));
 const changed=shared.length?shared.some(x=>a.colorAssignments.some(y=>y.id===x.id&&JSON.stringify(x.colors)!==JSON.stringify(y.colors))):
  levelSha256(a.colorAssignments.map(x=>x.colors).sort())!==levelSha256(b.colorAssignments.map(x=>x.colors).sort());
 return a.shapeSha256!==b.shapeSha256&&a.colorSha256!==b.colorSha256&&changed;
}
export function longPrefixDisposition(candidate,successes){
 const same=successes.find(q=>branch(q)===branch(candidate));
 const near=same??successes.find(q=>compareLayouts(q.level,candidate.level).footprintSimilarity>.65+1e-12);
 return near?{status:same?'SKIPPED_FAMILY_ALREADY_SUCCEEDED':'SKIPPED_NEAR_NEW_FAMILY_SUCCESS',successfulInput:near.input,
  accepted:false,failure:false,publicClaimsStarted:0,newGameplaySearches:0}:null;
}
export function assertLongPrefixProposal(p){
 assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);assert.equal(p.status,'READONLY_FIXED_FOUR_PROPOSAL_NOT_EXECUTABLE');assert.equal(p.executable,false);
 for(const k of ['newConstructions','newGameplaySearches','newColourCspInputs','publicClaimsStarted'])assert.equal(p[k],0);
 integer(p.recipes.length,1,64);assert.equal(p.recipeCount,p.recipes.length);assert(unique(p.recipes.map(r=>r.recipeId)));
 assert.equal(p.referenceCount,p.references.length);assert(unique(p.references.map(r=>r.referenceId)));
 let cap=0;for(const r of p.recipes){const ref=p.references.find(x=>x.referenceId===r.referenceId);assert(ref);descriptor(ref.reference);
  assert.equal(ref.sourceLevelId,r.sourceLevelId);integer(r.seed,1,2**32-1);integer(r.colourSeed,1,2**32-1);integer(r.bodyCountDelta,-2,3);
  integer(r.maximumStaticPartitionAttempts,1,500);cap+=r.maximumStaticPartitionAttempts;assert.equal(r.maximumColourCspInputsIncludingFailure,1);
  for(const k of ['quotaConsumedIfColourFails','firstSameBranchMathematicalPassStopsUnclaimedSibling'])assert.equal(r[k],true);
  assert.equal(r.failedInputFallbackAllowed,false);assert.equal(typeof r.branchId,'string');assert(r.branchId.length);
  assert.equal(r.prefixCut,ref.prefix.cut);assert.equal(r.prefixSha256,ref.prefix.prefixSha256);assert.equal(r.regionSha256,levelSha256(ref.region.cells));
  assert.equal(ref.preserveAllReferenceGatesInOriginalOrder,true);assert.equal(ref.prefix.isLowerBound,false);
 }
 for(const s of new Set(p.recipes.map(r=>r.sourceLevelId)))assert.equal(new Set(p.recipes.filter(r=>r.sourceLevelId===s).map(r=>r.branchId)).size,1);
 const c=p.finiteExperiment;assert.equal(c.maximumColourCspInputsIncludingFailed,p.recipes.length);assert.equal(c.maximumStaticPartitionAttempts,cap);integer(cap,1,10000);
 assert.equal(c.maximumFinalRepresentativesPerFamily,1);assert.equal(c.independentExperiment,true);assert.equal(c.extendsClosedMacro64,false);assert.equal(c.extendsClosedLocal18,false);
 assert.equal(p.futureMathematics.freshOriginalLowerFloor,31);assert.equal(p.futureMathematics.upperWorldsIncludingConstructionPrefixTailAndTerminalMaximum,10000);
 assert.equal(p.futureMathematics.originalLowerWorldsIncludingTerminalMaximum,10000);return true;
}
export function assertLongPrefixPlan(p){
 assert.equal(p.version,LONG_PREFIX_VERSION);assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);assert.equal(p.qualificationOnly,false);
 assert(/^[a-z0-9-]+$/.test(p.experimentId));assert.equal(p.closedCampaignsExtended,false);assert.equal(p.previousExperimentInputs,0);
 assert(Array.isArray(p.closedExperimentIds));assert(!p.closedExperimentIds.includes(p.experimentId),'A closed experiment must not receive a new namespace');
 for(const k of ['proposal','proposalReview','qualification','mathQualification','selectedIndex','selectionReview','historyPlan'])descriptor(p[k]);
 integer(p.blueprints.length,1,64);assert(unique(p.blueprints.map(b=>b.recipeId)));assert.equal(p.maximumInputs,p.blueprints.length);
 assert.equal(p.maximumStaticPartitionAttempts,p.blueprints.reduce((n,b)=>n+b.maximumStaticPartitionAttempts,0));integer(p.maximumStaticPartitionAttempts,1,10000);
 for(const b of p.blueprints){assertNativeBatchRecipe(b);assert.equal(b.maximumStocks,1);integer(b.maximumStaticPartitionAttempts,1,500);
  integer(b.seed,1,2**32-1);integer(b.colourSeed,1,2**32-1);integer(b.bodyCountDelta,-2,3);assert.deepEqual(b.allReferenceGates,b.level.gates);
  assert.equal(p.failedParents.filter(x=>branch(x)===branch(b)).length,1);}
 for(const s of new Set(p.blueprints.map(b=>b.sourceLevelId)))assert.equal(new Set(p.blueprints.filter(b=>b.sourceLevelId===s).map(b=>b.branchId)).size,1);
 assert.equal(p.selected.length,p.selectedCount);p.selected.forEach(descriptor);assert(unique(p.selected.map(x=>x.path)));
 assert.deepEqual(p.futureUpperBudget,UPPER_BUDGET);assert.deepEqual(p.futureLowerBudget,LOWER_BUDGET);assert.deepEqual(p.staticSlot,STATIC_SLOT);
 assert.deepEqual(p.strategy,{tail:'plain-joint',floor:31,searchUpper:128,maximumTailCalls:1,maximumOriginalLowerCalls:1,fallback:false});
 assert.equal(p.gatePolicy,'all-reference-gates-byte-equivalent-in-original-order');assert.equal(p.successStopsUnclaimedSiblings,true);
 assert.equal(p.globalShapeInventoryUniquenessRequired,false);assert.equal(p.exactHistoryExclusionsRetained,true);assert.equal(p.nearExemptionsAllowed,false);
 assert.equal(p.ledgerSnapshot.roots.length,7);assert(p.bindings[SELF]&&p.bindings[MATH_ENTRY]);
 for(const k of ['accepted','catalogEligible','formalReady','slotAssigned'])assert.equal(p[k],false);return true;
}
export function assertLongPrefixIndex(index,p){
 assertLongPrefixPlan(p);assert.equal(index.status,'LONG_PREFIX_STATIC_COMPLETE_NO_GAMEPLAY_SEARCH');assert.equal(index.experimentId,p.experimentId);
 const counts={},statics={};for(const a of index.attempts){const b=p.blueprints.find(x=>x.recipeId===a.recipeId);assert(b);
  assert.equal(a.localAttempt,statics[a.recipeId]??0);statics[a.recipeId]=(statics[a.recipeId]??0)+1;assert(statics[a.recipeId]<=b.maximumStaticPartitionAttempts);
  assert.equal(typeof a.enteredColourCsp,'boolean');if(a.enteredColourCsp){counts[a.recipeId]=(counts[a.recipeId]??0)+1;assert.equal(counts[a.recipeId],1);}}
 assert.deepEqual(counts,index.perRecipeColourCspInputs);assert.deepEqual(statics,index.perRecipeStaticAttempts);
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),index.fixedColourInputs);assert(index.fixedColourInputs<=p.maximumInputs);
 assert.equal(index.candidates.length,index.eligibleInputs);assert(index.eligibleInputs<=index.fixedColourInputs);
 for(const d of index.candidates){descriptor(d);const b=p.blueprints.find(x=>x.recipeId===d.recipeId);assert(b);assert.equal(d.sourceLevelId,b.sourceLevelId);assert.equal(d.branchId,b.branchId);}
 for(const k of ['gameplaySearches','publicLedgerClaims','accepted'])assert.equal(index[k],0);assert.equal(index.formalReady,false);return true;
}

export function longPrefixConstructionFiles(d,p,dir=LATE_PREFIX_CONSTRUCTION_LEDGER){return[
 `${d.sha256}.claim.json`,`${d.sha256}.result.json`,`long-prefix-experiment-${levelSha256(p.experimentId)}.json`,`long-prefix-proposal-${p.proposal.sha256}.json`].map(n=>path.join(dir,n));}
export async function claimLongPrefixCampaign(d,out,{qualificationOnly=false,ledgerDirectory=LATE_PREFIX_CONSTRUCTION_LEDGER}={}){
 assert.equal(typeof qualificationOnly,'boolean');const target=await realPathWithSuffix(ledgerDirectory);
 if(qualificationOnly){for(const r of HISTORY_LEDGER_ROOTS){const real=await realPathWithSuffix(r);assert(target!==real&&!target.startsWith(real+path.sep),'Private long-prefix ledger aliases shared history');}}
 else assert.equal(target,await realPathWithSuffix(LATE_PREFIX_CONSTRUCTION_LEDGER));
 const p=await readBound(d);assertLongPrefixPlan(p);await readBound(p.proposal);await fs.mkdir(ledgerDirectory,{recursive:true});
 const files=longPrefixConstructionFiles(d,p,ledgerDirectory),entry={plan:d,proposal:p.proposal,experimentId:p.experimentId,outputDirectory:path.resolve(out),qualificationOnly,restartAllowed:false};
 await write(files[2],entry);await write(files[3],entry);return{...await claimNativeBatchPlan(d,out,{qualificationOnly,ledgerDirectory}),campaignFiles:files.slice(2)};
}
async function checkQualification(d,kind,bindings){
 const q=await readBound(d,bindings);assert.equal(q.status,kind);assert.deepEqual(q.errors,[]);
 for(const k of ['newRealCandidateSearches','newRealCandidateConstructions','publicLedgerClaims'])assert.equal(q[k],0);
 assert.equal(q.searchAlgorithmChanged,false);assert.equal(q.failedOriginalRetryAllowed,false);assert(q.toolBindings?.[MATH_ENTRY]);
 if(kind==='INDEPENDENT_LONG_PREFIX_BATCH_TASK_PASS')assert(q.toolBindings[SELF]);
 await checkAll(q.toolBindings);mergeBindings(bindings,q.toolBindings);return q;
}
async function readContext(context){
 const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime),bindings={},cache=new Map(),historicalBindingResolutions=[];
 const read=async p=>{const key=path.resolve(p).toLowerCase();if(cache.has(key)){const q=cache.get(key);mergeBindings(bindings,{[p]:q.sha256});return q.value;}
  const bytes=await fs.readFile(p),q={sha256:sha(bytes),value:JSON.parse(bytes)};cache.set(key,q);mergeBindings(bindings,{[p]:q.sha256});return q.value;};
 const bound=async d=>{descriptor(d);const q=await read(d.path);assert.equal(bindings[d.path],d.sha256,d.path);return q;};
 const historical=map=>{const pending={};for(const[p,h]of Object.entries(map)){if(bindings[p])assert.equal(bindings[p],h);else pending[p]=h;}
  if(!Object.keys(pending).length)return;const m=mapHistoricalBindingsTask(pending,environment);mergeBindings(bindings,m.bindings);historicalBindingResolutions.push(...m.resolutions);};
 mergeBindings(bindings,runtime.toolchainBindings,environment.bindings);return{runtime,environment,bindings,read,bound,historical,historicalBindingResolutions};
}
/** Read-only preparation. Explicit reviewed proposal and current terminal history,
 * not a source/cut hardcoded loop, define the sole future finite experiment. */
export async function prepareLongPrefixBatch(context){
 assert(/^[a-z0-9-]+$/.test(context.experimentId));const c=await readContext(context),{runtime,environment,bindings,read,bound,historical}=c;
 const proposal=await bound(context.proposal);assertLongPrefixProposal(proposal);const reviewed=await bound(context.proposalReview);
 assert.equal(reviewed.status,'INDEPENDENT_LONG_PREFIX_PROPOSAL_PASS');assert.deepEqual(reviewed.proposal,context.proposal);assert.deepEqual(reviewed.errors,[]);
 assert.equal(reviewed.newSearches,0);assert.equal(reviewed.newConstructions,0);historical(reviewed.fileBindings);historical(proposal.fileBindings);
 await checkQualification(context.mathQualification,'INDEPENDENT_PREFIX_TAIL_TASK_PASS',bindings);await checkQualification(context.qualification,'INDEPENDENT_LONG_PREFIX_BATCH_TASK_PASS',bindings);
 const inherited=await bound(context.historyPlan);assert(context.historyReviews?.length);const reviews=[];
 for(const d of context.historyReviews){const q=await bound(d);assert(q.status.startsWith('INDEPENDENT_')&&q.status.endsWith('_PASS'));assert.deepEqual(q.errors,[]);assert.equal(q.newSearches,0);assert.equal(q.newLedgerClaims,0);historical(q.fileBindings);reviews.push(q);}
 assert(reviews.some(q=>q.completion),'A finished actual mathematical history review is required');
 assert(reviews.some(q=>q.fileBindings[context.historyPlan.path]===context.historyPlan.sha256||q.fileBindings[path.resolve(context.historyPlan.path)]===context.historyPlan.sha256),'Inherited history plan must be bound by an actual review');
 const admission=await readLowTwenty153Admission(context.selection,context.selectionReview);historical(admission.bindings);
 assert.deepEqual(auditV4Diversity(admission.records,runtime.slots).reasons,[]);const selected=admission.index.files.map(p=>({path:p,sha256:bindings[path.resolve(p)]??bindings[p],levelSha256:admission.records[admission.index.files.indexOf(p)].levelSha256}));selected.forEach(descriptor);
 const old450=inherited.old450,previousMacro=inherited.previousMacro,comparisonOnly=inherited.comparisonOnly;assert(old450?.length&&previousMacro&&comparisonOnly);
 for(const d of [...old450,...previousMacro,...comparisonOnly])await bound(d);
 const requests=[],publicStocks=[];for(const n of (await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort()){
  const p=path.join(PUBLIC_LEDGER,n),q=await read(p);requests.push(q);publicStocks.push({...q,path:p,sha256:bindings[p]});}
 const failedParents=[];for(const spec of context.failedParents){const q=await bound(spec.receipt),a=q.attempt??q.proof?.attempt;assert(a?.id);assert.equal(q.accepted,false);
  assert.equal(q.sourceLevelId??q.level.id,spec.sourceLevelId);assert.equal(q.levelSha256,levelSha256(q.level));
  const requestFile=`${PUBLIC_LEDGER}/${a.id}.request.json`,resultFile=`${PUBLIC_LEDGER}/${a.id}.result.json`,r=await read(requestFile),result=await read(resultFile);assert.deepEqual(r,a);assertLowTwentyFailedParent(q,result);
  const blockedFile=`${PUBLIC_LEDGER}/${a.id}.blocked.json`,identityBlockedFile=`${PUBLIC_LEDGER}/identities/${r.retryIdentitySha256}.blocked.json`;
  assert.equal((await read(blockedFile)).attemptId,a.id);const ib=await read(identityBlockedFile);assert(ib.attemptId===a.id||ib.attemptIds?.includes(a.id));
  const descendants=await assertNoFailedDescendant(a.id,requests,id=>read(`${PUBLIC_LEDGER}/${id}.result.json`));
  failedParents.push({source:spec.sourceLevelId,branchId:spec.branchId,id:a.id,receipt:spec.receipt,requestFile,resultFile,blockedFile,identityBlockedFile,
   descendants,parentMeaning:'same-source-failure-guard-not-reference-ancestry',fingerprints:designFingerprints(q.level)});}
 const blueprints=[];for(const r of proposal.recipes){const ref=proposal.references.find(x=>x.referenceId===r.referenceId),q=await bound(ref.reference);
  assert.equal(levelSha256(q.level),ref.referenceLevelSha256);assert.equal(routeSha256(q.drags),ref.referenceRouteSha256);assert.deepEqual(q.level,ref.originalLevel);assert.deepEqual(q.drags,ref.completeReferenceDrags);
  const b=makeExplicitNativeBatchRecipe(runtime,q,{...r,reference:ref.reference,cut:r.prefixCut,regionBodyIds:ref.changedBodyIds,maximumStocks:1});
  assert.deepEqual(b.prefixDrags,ref.prefix.drags);assert.deepEqual(b.region.cells,ref.region.cells);assert.deepEqual(q.level.gates,ref.fixedGates);assert.deepEqual(b.fixedBlocks,ref.fixedBlocks);
  Object.assign(b,{branchId:r.branchId,seed:r.seed,colourSeed:r.colourSeed,bodyCountDelta:r.bodyCountDelta,maximumStaticPartitionAttempts:r.maximumStaticPartitionAttempts,allReferenceGates:q.level.gates});
  b.currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,b.sourceLevelId);mergeBindings(bindings,b.currentSourceBinding.bindings);blueprints.push(b);}
 const previousLateStocks=[],seen=new Set(),add=(l,d,q)=>{const h=levelSha256(l);if(seen.has(h))return;seen.add(h);previousLateStocks.push({...d,level:l,sourceLevelId:q.sourceLevelId??l.id,reference:q.plain?.provenance?.reference??q.provenance?.reference??q.branchProvenance?.reference??q.reference??null,fingerprints:designFingerprints(l)});};
 for(const q of inherited.previousLateStocks??[])add(q.level,{path:q.path,sha256:q.sha256},q);
 const ledgerSnapshot=await captureLedgerSnapshot(bindings),terminalHistory=[],closedExperimentIds=new Set([inherited.experimentId].filter(Boolean));
 for(const root of ledgerSnapshot.roots)for(const d of root.files){const q=await bound(d);for(const l of formedStockImages(q))add(l,d,q);
  if(q.experimentId)closedExperimentIds.add(q.experimentId);
  if(d.path.endsWith('.claim.json')&&q.outputDirectory){const resultPath=d.path.replace(/\.claim\.json$/,'.result.json');
   if(q.plan?.path){const previousPlan=await bound(q.plan);if(previousPlan.experimentId)closedExperimentIds.add(previousPlan.experimentId);}
   if([HISTORY_LEDGER_ROOTS[1],HISTORY_LEDGER_ROOTS[5],HISTORY_LEDGER_ROOTS[6]].includes(root.directory))assert(await exists(resultPath),'Unfinished construction blocks a new batch');
   if(await exists(resultPath)){const result=await read(resultPath);if(result.constructionFiles){assert.deepEqual(result.plan,q.plan);const indexPath=path.join(q.outputDirectory,'index.json'),index=await read(indexPath);assert.deepEqual(index.plan,q.plan);
    terminalHistory.push({claim:d,result:{path:resultPath,sha256:bindings[resultPath]},index:{path:indexPath,sha256:bindings[indexPath]}});
    for(const f of result.constructionFiles){const stock=await bound(f);for(const l of formedStockImages(stock))add(l,f,stock);}}}}
 }
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))mergeBindings(bindings,{[file.replaceAll('\\','/')]:sha(await fs.readFile(file))});
 const plan={schemaVersion:4,scope:300,version:LONG_PREFIX_VERSION,status:'LONG_PREFIX_PREPARED_NO_CONSTRUCTION',experimentId:context.experimentId,qualificationOnly:false,
  proposal:context.proposal,proposalReview:context.proposalReview,qualification:context.qualification,mathQualification:context.mathQualification,historyPlan:context.historyPlan,historyReviews:context.historyReviews,
  selectedIndex:context.selection,selectionReview:context.selectionReview,selected,selectedCount:selected.length,blueprints,failedParents,old450,previousMacro,comparisonOnly,previousLateStocks,publicStocks,terminalHistory,
  maximumInputs:blueprints.length,maximumStaticPartitionAttempts:blueprints.reduce((n,b)=>n+b.maximumStaticPartitionAttempts,0),previousExperimentInputs:0,closedCampaignsExtended:false,closedExperimentIds:[...closedExperimentIds].sort(),
  gatePolicy:'all-reference-gates-byte-equivalent-in-original-order',globalShapeInventoryUniquenessRequired:false,exactHistoryExclusionsRetained:true,nearExemptionsAllowed:false,successStopsUnclaimedSiblings:true,
  futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,staticSlot:STATIC_SLOT,strategy:{tail:'plain-joint',floor:31,searchUpper:128,maximumTailCalls:1,maximumOriginalLowerCalls:1,fallback:false},
  ledgerSnapshot,bindings,historicalBindingResolutions:c.historicalBindingResolutions,executionEnvironment:environment,policyReviewedAtPreparation:environment.policyReviewedAtPreparation,
  historicalDesignPolicy:environment.historicalDesignPolicy,mathematicalContract:environment.mathematicalContract,proofToolchainSha256:runtime.toolchainSha256,
  accepted:false,catalogEligible:false,formalReady:false,slotAssigned:false,currentRuntimeValidationClaimed:false};
 assertLongPrefixPlan(plan);for(const f of longPrefixConstructionFiles({sha256:'0'.repeat(64)},plan).slice(2))assert(!(await exists(f)),'A closed long-prefix experiment/proposal cannot be renewed');
 await checkAll(bindings);await checkLedgerSnapshot(ledgerSnapshot);return plan;
}

async function boundPlan(d){const p=await readBound(d);assertLongPrefixPlan(p);await checkAll(p.bindings);assert.equal(p.bindings[SELF],sha(await fs.readFile(SELF)));return p;}
async function reviewGate(d,status,subjectKey,subject){const q=await readBound(d);assert.equal(q.status,status);assert.deepEqual(q[subjectKey],subject);assert.deepEqual(q.errors,[]);
 assert.equal(q.newSearches??q.newGameplaySearches,0);assert(q.fileBindings?.[SELF]);await checkAll(q.fileBindings);return q;}
async function pools(p){return{selected:await Promise.all(p.selected.map(d=>readBound(d))),old450:await Promise.all(p.old450.map(d=>readBound(d))),
  history:[...await Promise.all(p.previousMacro.map(async d=>({path:d.path,...await readBound(d)}))),...p.previousLateStocks,...await Promise.all(p.comparisonOnly.map(async d=>({path:d.path,...await readBound(d)})))]};}
function similarity(level,b,source,pool,eligible){return{reference:compareLayouts(level,b.level).footprintSimilarity,source:compareLayouts(level,source).footprintSimilarity,
 selected:nearest(level,pool.selected),old450:nearest(level,pool.old450),history:nearest(level,pool.history),newBatch:nearest(level,eligible.filter(q=>branch(q)!==branch(b)))};}
const similarPass=s=>Object.entries(s).every(([k,v])=>v<=(k==='source'?.55:k==='old450'?.75:.65)+1e-12);
export function recordLongPrefixStock(state,b,built){
 const key=branch(b),prior=[...(state.formed.get(key)??[])];if(built.stockFingerprints)state.shapes.push({key,f:built.stockFingerprints});
 const formed=built.plain?.level??(built.paint?.ok?built.level:null);if(formed)state.formed.set(key,[...prior,designFingerprints(formed)]);
 const duplicate=formed?state.partitions.has(partition(formed)):false;for(const l of formedStockImages(built))state.partitions.add(partition(l));
 return{prior,duplicate};
}
/** One stock has one placeholder and one colour attempt, whose every complete
 * assignment is charged by the unchanged factory. Failed CSPs close a recipe. */
export async function constructLongPrefixBatch(d,out,review){
 assert(!(await exists(out)));const p=await boundPlan(d);await reviewGate(review,'INDEPENDENT_LONG_PREFIX_PLAN_PASS','plan',d);
 await checkQualification(p.qualification,'INDEPENDENT_LONG_PREFIX_BATCH_TASK_PASS',{});await checkQualification(p.mathQualification,'INDEPENDENT_PREFIX_TAIL_TASK_PASS',{});
 const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime),p.executionEnvironment);const pool=await pools(p);
 const state={partitions:new Set([...pool.history,...pool.selected].map(q=>partition(q.level))),formed:new Map(),shapes:[]};
 for(const q of p.previousLateStocks)for(const b of p.blueprints)if(q.sourceLevelId===b.sourceLevelId&&q.reference?.path===b.reference.path){
  const key=branch(b);state.shapes.push({key,f:q.fingerprints});state.formed.set(key,[...(state.formed.get(key)??[]),q.fingerprints]);}
 const retries=new Set(p.publicStocks.map(q=>q.retryIdentitySha256??physical(q))),designs=new Set(p.publicStocks.map(q=>q.designSha256??q.id));
 const attempts=[],eligible=[],counts={},statics={},rejections={};let status='LONG_PREFIX_CONSTRUCTION_INTERRUPTED',failureReason=null;
 await checkLedgerSnapshot(p.ledgerSnapshot);const executionPolicyObservation=observeExecutionPolicy(),claim=await claimLongPrefixCampaign(d,out);
 try{await fs.mkdir(out,{recursive:false});await write(`${out}/execution-start.json`,{plan:d,claim,executionPolicyObservation});
  for(const b of p.blueprints)for(let local=0;local<b.maximumStaticPartitionAttempts&&!counts[b.recipeId];local++){
   const seed=b.seed+7919*local,colourSeed=b.colourSeed+7919*local,key=branch(b),parent=p.failedParents.find(x=>branch(x)===key),source=runtime.LEVELS.find(l=>l.id===b.sourceLevelId);
   const filter=level=>({passed:!state.partitions.has(partition(level))&&similarPass(similarity(level,b,source,pool,eligible)),gameplaySearches:0});
   const built=constructLowTwentyRegionStock(runtime,b,{seed,colourSeed,bodyCountDelta:b.bodyCountDelta,forbiddenShapeHashes:[parent.fingerprints.shapeSha256,...state.shapes.filter(q=>q.key===key).map(q=>q.f.shapeSha256)],geometryFilter:filter});
   const a={recipeId:b.recipeId,branchId:b.branchId,sourceLevelId:b.sourceLevelId,localAttempt:local,seed,colourSeed,enteredColourCsp:!!built.paint,status:built.status};statics[b.recipeId]=local+1;
   if(a.enteredColourCsp)counts[b.recipeId]=1;assert(!built.ok||a.enteredColourCsp);
   const file=`${out}/construction-${String(attempts.length).padStart(4,'0')}.json`;await write(file,{...built,plan:d,recipeReview:review,recipeId:b.recipeId,branchId:b.branchId,executionEnvironment:p.executionEnvironment,executionPolicyObservation});a.constructionEvidence=await fileDescriptor(file);attempts.push(a);
   const previous=recordLongPrefixStock(state,b,built);const reject=reason=>{a.rejection=reason;rejections[reason]=(rejections[reason]??0)+1;};
   if(!built.ok){reject(built.status);continue;}const f=designFingerprints(built.level);
   if(previous.duplicate||retries.has(physical(f))||designs.has(f.designSha256)){reject('existing-exact-physical-input');continue;}
   if(![parent.fingerprints,designFingerprints(b.level),...previous.prior].every(old=>changedShapeAndColour(old,f))){reject('branch-shape-and-real-colour-change-required');continue;}
   if(await exists(`${PUBLIC_LEDGER}/identities/${physical(f)}.json`)||await exists(`${PUBLIC_LEDGER}/${f.designSha256}.request.json`)){reject('public-input-already-attempted');continue;}
   assert.deepEqual(built.level.gates,b.level.gates);assert.equal(boardBaselineSha256(built.level),boardBaselineSha256(source));
   const comparisons=similarity(built.level,b,source,pool,eligible);if(!similarPass(comparisons)){reject('layout-near');continue;}
   const audit=await auditV4StaticCandidate(runtime,{...STATIC_SLOT,sourceLevelId:b.sourceLevelId,level:built.level});a.staticAudit=audit;if(!audit.passed){reject('static-structure');continue;}
   const candidate={...built,status:'LONG_PREFIX_NEW_INPUT_AWAITING_FIRST_CLAIM',sourceLevelId:b.sourceLevelId,recipeId:b.recipeId,branchId:b.branchId,targetDifficulty:3,
    executionEnvironment:p.executionEnvironment.descriptor,constructionEvidence:a.constructionEvidence,batchPlan:d,redesignOf:parent.id,inputStaticAudit:audit,similarity:comparisons,
    accepted:false,catalogEligible:false,formalReady:false,gameplaySearches:0,fullOriginalUValidated:false};
   try{makePrefixTailV4Plan(runtime,candidate,{upperBudget:p.futureUpperBudget,lowerBudget:p.futureLowerBudget});}catch(error){reject('no-tail-budget-reserve:'+error.message);continue;}
   const cf=`${out}/candidate-${String(eligible.length).padStart(3,'0')}.json`;await write(cf,candidate);a.candidate={...await fileDescriptor(cf),recipeId:b.recipeId,sourceLevelId:b.sourceLevelId,branchId:b.branchId,levelSha256:built.levelSha256,prefixSha256:routeSha256(built.prefixDrags)};eligible.push(candidate);
  }
  await checkAll(p.bindings);await checkLedgerSnapshot(p.ledgerSnapshot,{allowedNewFiles:longPrefixConstructionFiles(d,p).filter(f=>!f.endsWith('.result.json'))});
  const index={status:'LONG_PREFIX_STATIC_COMPLETE_NO_GAMEPLAY_SEARCH',scope:300,plan:d,recipeReview:review,experimentId:p.experimentId,executionEnvironment:p.executionEnvironment,executionPolicyObservation,
   attempts,candidates:attempts.flatMap(a=>a.candidate?[a.candidate]:[]),fixedColourInputs:Object.values(counts).reduce((a,b)=>a+b,0),eligibleInputs:eligible.length,perRecipeColourCspInputs:counts,perRecipeStaticAttempts:statics,rejections,
   closedCampaignsExtended:false,gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};assertLongPrefixIndex(index,p);await write(`${out}/index.json`,index);status=index.status;return index;
 }catch(e){failureReason=e.message;throw e;}finally{await finishLatePrefixPlan(claim,{status,failureReason,experimentId:p.experimentId,constructionFiles:attempts.map(a=>a.constructionEvidence),stocksEnteringColourCspIncludingFailed:Object.values(counts).reduce((a,b)=>a+b,0),gameplaySearches:0,publicLedgerClaims:0});}
}

/** Static and root visual receipts are required before the only batch math
 * claim. Success protects unclaimed siblings immediately; failures never retry. */
export async function runLongPrefixBatch({index:indexDescriptor,audit,visual,output}){
 assert(!(await exists(output)));const index=await readBound(indexDescriptor),p=await boundPlan(index.plan);assertLongPrefixIndex(index,p);
 const reviewed=await reviewGate(audit,'INDEPENDENT_LONG_PREFIX_STATIC_PASS','index',indexDescriptor);assert.equal(reviewed.verifiedCandidates,index.candidates.length);
 const view=await readBound(visual);assert.equal(view.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(view.index,indexDescriptor);assert.equal(view.viewedCandidates,index.candidates.length);await checkAll(view.fileBindings);
 const bindings=mergeBindings({},p.bindings,reviewed.fileBindings,view.fileBindings);for(const d of [indexDescriptor,audit,visual,index.plan])mergeBindings(bindings,{[d.path]:d.sha256});
 await checkQualification(p.mathQualification,'INDEPENDENT_PREFIX_TAIL_TASK_PASS',bindings);await checkLedgerSnapshot(p.ledgerSnapshot,{allowedNewFiles:longPrefixConstructionFiles(index.plan,p)});
 const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime),p.executionEnvironment);const inputs=[];
 for(const d of index.candidates){const q=await readBound(d,bindings),b=p.blueprints.find(b=>b.recipeId===q.recipeId);assert(b);assert.equal(q.status,'LONG_PREFIX_NEW_INPUT_AWAITING_FIRST_CLAIM');assert.equal(q.levelSha256,levelSha256(q.level));
  assert.deepEqual(q.batchPlan,index.plan);assert.deepEqual(q.prefixDrags,b.prefixDrags);assert.deepEqual(q.level.gates,b.level.gates);assert.equal(q.branchId,b.branchId);assert.equal(q.sourceLevelId,b.sourceLevelId);
  const plan=makePrefixTailV4Plan(runtime,q,{upperBudget:p.futureUpperBudget,lowerBudget:p.futureLowerBudget});inputs.push({descriptor:d,candidate:q,plan});}
 for(let i=0;i<inputs.length;i++)for(let j=0;j<i;j++){const a=inputs[i].candidate,b=inputs[j].candidate;assert.notEqual(physical(designFingerprints(a.level)),physical(designFingerprints(b.level)));if(branch(a)===branch(b))assert(changedShapeAndColour(designFingerprints(a.level),designFingerprints(b.level)));}
 const executionPolicyObservation=observeExecutionPolicy(),mathExecutionClaim=await claimNativeBatchMath(index.plan,output);await fs.mkdir(output,{recursive:false});
 await write(`${output}/plan.json`,{status:'LONG_PREFIX_FIRST_MATH_DECLARED',index:indexDescriptor,audit,visual,batchPlan:index.plan,inputs:inputs.map(({descriptor,plan})=>({descriptor,plan})),bindings,mathExecutionClaim,executionPolicyObservation});
 const latest=new Map(p.failedParents.map(q=>[branch(q),q.id])),results=[],successes=[];
 for(const [i,{descriptor:d,candidate:q,plan}]of inputs.entries()){
  await checkAll(bindings);const disposition=longPrefixDisposition(q,successes),file=`${output}/candidate-${String(i).padStart(3,'0')}.json`;let record;
  if(disposition)record={...disposition,input:d,batchPlan:index.plan,sourceLevelId:q.sourceLevelId,branchId:q.branchId,L:null,U:null,attempt:null};
  else{const result=await explorePrefixTailV4(runtime,q,{plan,redesignOf:latest.get(branch(q))});assert(result.attempt?.id);assert.equal(result.catalogEligible,false);
   record={...result,input:d,batchPlan:index.plan,batchExecutionPlan:`${output}/plan.json`,preflightAudit:audit,visualReview:visual,selectionIndexUnchanged:true};
   if(!result.accepted)latest.set(branch(q),result.attempt.id);}
  await write(file,record);const fd=await fileDescriptor(file);if(record.accepted)successes.push({...q,input:fd});
  results.push({...fd,input:d,sourceLevelId:q.sourceLevelId,branchId:q.branchId,status:record.status,accepted:record.accepted,L:record.L,U:record.U,attemptId:record.attempt?.id??null});
  await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:results.length,total:inputs.length,results,accepted:successes.length},null,2)+'\n');
 }
 await checkAll(bindings);const completion={status:'LONG_PREFIX_FIRST_MATH_BATCH_FINISHED',batchPlan:index.plan,index:indexDescriptor,audit,visual,mathExecutionClaim,executionPolicyObservation,
  results,accepted:successes.length,publicClaimsStarted:results.filter(r=>r.attemptId).length,unclaimedSkipped:results.filter(r=>!r.attemptId).length,selectionIndexUnchanged:true,formalReady:false};
 await write(`${output}/completion.json`,completion);return completion;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const[mode,arg,digest,out,review,reviewSha]=process.argv.slice(2);assert(arg&&digest&&out);
 if(mode==='prepare'){assert(!(await exists(out)));const d={path:arg,sha256:digest},p=await prepareLongPrefixBatch(await readBound(d));mergeBindings(p.bindings,{[d.path]:d.sha256});await fs.mkdir(out,{recursive:false});await write(`${out}/plan.json`,p);console.log(JSON.stringify(await fileDescriptor(`${out}/plan.json`)));}
 else if(mode==='construct')console.log(JSON.stringify({status:(await constructLongPrefixBatch({path:arg,sha256:digest},out,{path:review,sha256:reviewSha})).status}));
 else if(mode==='run'){const options=await readBound({path:arg,sha256:digest});assert.equal(options.output,out);console.log(JSON.stringify(await runLongPrefixBatch(options)));}
 else throw Error('Use prepare context sha out | construct plan sha out review sha | run options sha out');
}

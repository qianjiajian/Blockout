import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sync from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {assertV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding} from './prefix-execution-environment-task.mjs';
import {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,readDirectHistoryRole,authenticateKnownReversePartials} from './plan-history-adapter-v13.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {readSupplementalComparisonEvidence} from './supplemental-comparison-evidence.mjs';
import {sha,write,exists,realPathWithSuffix,HISTORY_LEDGER_ROOTS,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,claimNativeBatchPlan,finishLatePrefixPlan} from './low-twenty-io.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {SELF as LOWER_MODULE,VERSION as LOWER_VERSION,LIMITS as LOWER_LIMITS,PREPAID_WORLDS,runStarSuffixLower,assertStarSuffixLowerReceipt} from './reverse-star-suffix-lower-v2.mjs';
import {assertSource200StarStock} from './reverse-star-suffix-blueprint-v2.mjs';
import {assertStaticStarStockIds} from './static-star-stock-ids-v1.mjs';
import {quoteReverseWorldCreation} from './reverse-construction-reservations.mjs';

export const SELF='tools/daily-challenge/formal-v4/reverse-star-suffix-task-v6.mjs';
export const FACTORY='tools/daily-challenge/formal-v4/reverse-star-suffix-factory-v7.mjs';
export const VERSION='single-star-double-exit-known-suffix-owned-task-v6';
export const QUALIFICATION_STATUS='INDEPENDENT_REVERSE_STAR_SUFFIX_TASK_V6_PASS';
// Production still requires the original exact-context/one-use authorities.
export const HISTORY_ADAPTER='tools/daily-challenge/formal-v4/plan-history-adapter-v13.mjs';
export const HISTORY_ADAPTER_SHA256='95dfc1dc54cd136eb5ec32d5849f51aed1755551ccadc26a2dc7c0096edc900c';
export const HISTORY_ADAPTER_QUALIFICATION=Object.freeze({"path":"deliverables/daily-formal-v4-20261008/proof/plan-history-adapter-v13-independent-01/report.json","sha256":"e3bb94e7d7ce171c815920846208d440cf4746a4f7c6272890364f08001c55ef"});
export const PRODUCTION_DISABLED=false;
export function assertReverseStarProductionReady(){assert.equal(PRODUCTION_DISABLED,false,'Reusable star production wiring is disabled');}
export const LEGACY_STAR_PRODUCER_QUALIFICATION=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/reverse-star-suffix-task-v4-independent-01/report.json',sha256:'f5e556da24314e88c7e049c3194cc9c6802897cb3819766fab10906a7724f6a5'});
export const PREVIOUS_STAR_PRODUCER_QUALIFICATION=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/reverse-star-suffix-task-v5-independent-01/report.json',sha256:'8eef0bac6aadd24c21d98e7c68fbc56af9e13a44aec017caf1c690ce56018082'});
export const ADMINISTRATIVE_PRIOR=Object.freeze({"path":"deliverables/daily-formal-v4-20261008/proof/star-source200-dual-exit-pilot-administrative-seal-01/report.json","sha256":"602560a991f723c45cb8d9b746f761f85ff572e73c2cf981de71606c3bef929e"});
export const STAR_ARCHIVAL_OBSERVATION=Object.freeze({"path":"deliverables/daily-formal-v4-20261008/proof/star-source200-administrative-observation-01/observation.json","sha256":"7aa664b69de5e2227b02ce84e01f5faee86cfb0b8b2d72ed9bab7b8dc7917262"});
export const LOWER_POLICY=Object.freeze({version:LOWER_VERSION,combinedLimits:LOWER_LIMITS,prepaidWorlds:PREPAID_WORLDS,rawSetMaximum:9999-PREPAID_WORLDS,terminalWorldAllowance:1,projectionOnly:'erase-star-preserve-all-ten-gates',upperBoundTransfer:false});
export const MINIMUM_DESIGN_HOLDS=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/selected161-root-design-disposition-08.json',sha256:'89182c4a630658423c11007692374981f73158e84156853f971c2702a33c0883'});
const copy=structuredClone,constructions=new WeakMap(),claims=new WeakMap();
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact descriptor required');
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
const fd=async file=>({path:file,sha256:sha(await fs.readFile(file))});
function reader(){const bindings={},seen=new Map();return{bindings,
 async bytes(p){const b=await fs.readFile(p),h=sha(b);if(bindings[p])assert.equal(h,bindings[p],'Current input changed: '+p);bindings[p]=h;seen.set(p,h);return b;},
 async bound(d){descriptor(d);const b=await this.bytes(d.path);assert.equal(sha(b),d.sha256,d.path);return JSON.parse(b);},
 async map(m){for(const[p,h]of Object.entries(m)){assert.equal(sha(await this.bytes(p)),h,p);}},
 async finish(){for(const[p,h]of seen)assert.equal(sha(await fs.readFile(p)),h,'Current byte binding changed: '+p);}};}
async function bindTools(r,rt){await r.map(rt.toolchainBindings);const c=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});assert(c.metafile.inputs[FACTORY]);for(const p of Object.keys(c.metafile.inputs))await r.bytes(p);}
async function listing(scope){const result={};for(const root of scope.roots){const rows=[];const visit=async dir=>{for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'No nested history aliases');const f=path.join(dir,e.name);if(e.isDirectory())await visit(f);else{assert(e.isFile());rows.push(f);}}};if(await exists(root.physicalPath))await visit(root.physicalPath);result[root.id]=rows;}return result;}
function declaredMembers(state,delta){const canonical=compileCanonicalHistoryPath(state.bundle.scope).canonical,out=Object.fromEntries(state.bundle.scope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...state.bundle.files,...delta.files])if(f.rootId!==null){const k=canonical(f.path);assert(!seen.has(k));seen.add(k);assert(Object.hasOwn(out,f.rootId));out[f.rootId].push(f.path);}return out;}
async function history(r,c,qualificationOnly){
 assert.equal(c.historyScope.roots.length,7);const actual=await Promise.all(c.historyScope.roots.map(x=>realPathWithSuffix(x.physicalPath))),shared=await Promise.all(HISTORY_LEDGER_ROOTS.map(realPathWithSuffix));
 assert.equal(new Set(actual).size,7);if(qualificationOnly){for(const x of actual)for(const y of shared)assert(x!==y&&!x.startsWith(y+path.sep),'Private history aliases a shared root');}
 else assert.deepEqual([...actual].sort(),[...shared].sort(),'Exact shared seven namespaces');
 let h=await consumePlanHistory({checkpoint:c.history,review:c.historyReview,expectedScope:c.historyScope,readBytes:p=>r.bytes(p)});
 for(const x of c.historyDeltas){const d=await r.bound(x.descriptor);h=await mergePlanHistoryDelta(h,{...x,listing:declaredMembers(h,d),readBytes:p=>r.bytes(p)});}
 assert.equal(h.headSha256,c.historyHeadSha256);assert(!h.closedExperimentIds.includes(c.experimentId),'Closed experiment cannot restart');assertPlanHistoryMembers(h,await listing(c.historyScope));
 let partialHistoryAuthentication=null;if(!qualificationOnly){const {fileBindings:partialFileBindings,...summary}=await authenticateKnownReversePartials(h,{readBytes:p=>r.bytes(p),additionalClosedArchives:c.additionalClosedArchives,trustedProducerQualifications:[LEGACY_STAR_PRODUCER_QUALIFICATION,PREVIOUS_STAR_PRODUCER_QUALIFICATION,c.qualification]});assertReversePartialAuthentication(summary,c.additionalClosedArchives);partialHistoryAuthentication={...summary,worldBindingsPinnedInPlan:true};}
 let comparison=null;if(c.comparison){comparison=await readSupplementalComparisonEvidence(h,{...c.comparison,readBytes:p=>r.bytes(p),qualificationOnly});}
 else assert(qualificationOnly,'Production requires the reviewed historical comparison view');
 return{h,comparison,partialHistoryAuthentication};
}
async function qualification(r,d){const q=await r.bound(d);assert.equal(q.status,QUALIFICATION_STATUS);assert.deepEqual(q.errors,[]);for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(q[k],0);assert.equal(q.closedProductionScopeReviewed,true);assert(q.toolBindings[SELF]&&q.toolBindings[FACTORY]&&q.toolBindings[LOWER_MODULE]);await r.map(q.toolBindings);}
async function context(runtime,contextDescriptor,qualificationOnly){
 assertReverseStarProductionReady();
 assertV4Runtime(runtime);const r=reader(),c=await r.bound(contextDescriptor);assert.equal(c.version,VERSION);assert.equal(c.qualificationOnly,qualificationOnly);assert(/^[a-z0-9-]+$/.test(c.experimentId));assert([1,2,3].includes(c.targetDifficulty));
 assert.equal(c.maximumCompletePhysicalInputs,1);assert.equal(c.fallbackAllowed,false);assert.equal(c.failedInputRebandAllowed,false);assert(Array.isArray(c.historyDeltas));
 assert(c.qualificationClockCase===undefined||qualificationOnly&&c.qualificationClockCase==='deadline-after-claim','No production clock override');
 assert(c.qualificationFailureCase===undefined||qualificationOnly&&['after-construction-locks','archive-review'].includes(c.qualificationFailureCase),'No production failure injection');
 if(!qualificationOnly)assertReverseProductionChoice(c);
 const environment=prefixExecutionEnvironment(runtime),observation=observeExecutionPolicy(environment);await r.map(environment.bindings);await bindTools(r,runtime);
 if(!qualificationOnly){await qualification(r,c.qualification);const adapterQualification=await r.bound(HISTORY_ADAPTER_QUALIFICATION);assertReverseHistoryAdapterQualification(adapterQualification);await r.map(adapterQualification.toolBindings);const prior=await r.bound(c.priorHistoryReport),administrative=await r.bound(ADMINISTRATIVE_PRIOR);assertReversePriorHistory(c,prior,administrative);if(['REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V10_VALIDATED','REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V12_VALIDATED','REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V13_VALIDATED'].includes(prior.status))await assertReverseReusablePriorProducer(c,prior,administrative,{bound:d=>r.bound(d),map:m=>r.map(m)});assertReverseDesignHolds(c,await r.bound(c.designDisposition),await r.bound(MINIMUM_DESIGN_HOLDS));}
 const declared=await r.bound(c.declaration);
 if(!qualificationOnly)assertStarStockIdPreflight(c,declared);
 const {h,comparison,partialHistoryAuthentication}=await history(r,c,qualificationOnly);let source,ref=null,reference=null,stock;
 if(qualificationOnly){assert.equal(c.sourceLevelId,997661);source=await r.bound(c.syntheticSource);assert.equal(source.id,997661);assert.equal(source.width,4);assert.equal(source.height,2);assert.deepEqual(source.blocks,[]);stock=declared;}
 else{
  const sourceBinding=await currentMainlineSourceBinding(runtime,environment,c.sourceLevelId);await r.map(sourceBinding.bindings);source=runtime.LEVELS.find(x=>x.id===c.sourceLevelId);assert(source);
  reference=declared.sourceReference;ref=await r.bound(reference);stock=assertReverseStockDeclaration(c,declared,source,ref);
  reference={path:await fs.realpath(reference.path),sha256:reference.sha256};assert.deepEqual(await r.bound(reference),ref);await r.map(declared.inputBindings);
  const design=await r.bound(c.starDesignDeclaration);await r.map(design.fileBindings);assertStarSuffixDeclaredDesign(c,declared,source,ref,stock,design);
 }
 // Exactly the predeclared eight colours / ten gates / two-star pilot.
 // These are this design's physical inventory, not a universal instance quota.
 const payload=copy(stock);payload.starDesignDeclaration=copy(c.starDesignDeclaration);payload.targetDifficulty=c.targetDifficulty;payload.upperBudget=c.upperBudget??stock.upperBudget??{};

 const {makeReverseStockRecipe,compileStoredStarSuffixBlueprint}=await import('./reverse-star-suffix-factory-v7.mjs');
 assert(!qualificationOnly,'Production adapter has no synthetic context dispatch');assert.equal(payload.blueprint.cutAfterDrag,34);assert.deepEqual(payload.blueprint.reference,declared.sourceReference);
 payload.suffixBlueprint=compileStoredStarSuffixBlueprint(ref,{cutAfterDrag:payload.blueprint.cutAfterDrag,gates:payload.gates,inventory:payload.inventory});
 const recipe=makeReverseStockRecipe(runtime,source,payload,{qualificationOnly});await r.map(recipe.assetBindings);
 let failedParent=null;if(c.failedParent){const latest=latestReverseFailedAttempt(h,c.sourceLevelId);assert.equal(c.failedParent.namespace,latest.namespace);assert.equal(c.failedParent.attemptId,latest.request.value.id);failedParent=await readDirectHistoryRole(h,{...c.failedParent,role:'failed-parent',readBytes:p=>r.bytes(p)});await r.map(failedParent.fileBindings);assert.equal(failedParent.blocked.length,2);assert.equal(failedParent.receipt.level.id,c.sourceLevelId);assert.equal(compileCanonicalHistoryPath(h.bundle.scope).canonical(c.failedParent.namespace),h.bundle.publicNamespace);}
 else assert(qualificationOnly,'Production fixed recipe requires its explicit latest failed parent');
 const recent=await readLatestFailedReverseStock(h,{sourceLevelId:c.sourceLevelId,referenceLevelSha256:ref.levelSha256,referenceRouteSha256:routeSha256(ref.drags),readBytes:p=>r.bytes(p)});assertLatestFailedStockPartialAuthentication(recent,partialHistoryAuthentication,h.bundle.scope);const {inventory:failedInventory,...failedStockEvidence}=recent.latest;const constructorStockRedesign={latest:failedStockEvidence,matchingFailedCampaignCount:recent.matchingFailedCampaignCount,...assertReverseChangedFailedStock(stock.inventory,failedInventory)};
 await r.finish();return{r,c,h,comparison,partialHistoryAuthentication,constructorStockRedesign,environment,observation,source,reference,referenceLevel:ref?.level??null,recipe,failedParent};
}

/** Metadata/bytes only. No full candidate, model, owner or mathematical claim. */
function prepared(x,contextDescriptor,qualificationOnly){return freeze({version:VERSION,constructorStockRedesign:copy(x.constructorStockRedesign),contextDescriptor:copy(contextDescriptor),qualificationOnly,experimentId:x.c.experimentId,recipe:x.recipe,environment:x.environment,historyHeadSha256:x.h.headSha256,
 partialHistoryAuthentication:x.partialHistoryAuthentication??null,comparisonEvidence:x.comparison?.comparisonEvidence??null,priorHistoryReport:x.c.priorHistoryReport??null,selection:x.c.selection??null,designDisposition:x.c.designDisposition??null,failedParent:copy(x.c.failedParent??null),declaration:copy(x.c.declaration),bindings:copy(x.r.bindings),lowerPolicy:copy(LOWER_POLICY),starDesignDeclaration:copy(x.c.starDesignDeclaration),maximumCompletePhysicalInputs:1,
 firstFullFailureIsTerminal:true,dualUpperReplayPairsMaximum:1,originalLowerCallsMaximum:1,accepted:false,catalogEligible:false,formalReady:false});
}
export async function prepareReverseStockTask(runtime,contextDescriptor,{qualificationOnly=false}={}){assertReverseStarProductionReady();return prepared(await context(runtime,contextDescriptor,qualificationOnly),contextDescriptor,qualificationOnly);}

// Only this module issues capabilities after exact-context authentication.
// Exported consumers cannot mint one from a naked state or caller callback.
export function takeReverseConstructionAuthority(token,runtime,recipe){const a=constructions.get(token);assert(a&&!a.used,'Authenticated one-shot construction authority');assert.equal(a.runtime,runtime);assert.deepEqual(a.recipe,recipe);a.used=true;return a;}
export function takeReverseClaimAuthority(token,construction,levelSha){const c=claims.get(token);assert(c&&!c.used&&c.construction===construction&&c.levelSha256===levelSha,'One original full-world public claim required');c.used=true;return c;}

/** Pure receipt validation also used by tiny metadata tests. It never accepts
 * supplied U evidence as permission to run a lower search. Actual dispatch
 * below receives its U solely from the private factory continuation. */
export function assertReverseLowerReceipt(lower,original,target){
 assert.equal(target,1);assert.equal(lower.requiredFloor,16);return assertStarSuffixLowerReceipt(lower,original);
}
function trackedFile(root,file){return{rootId:root.id,path:file};}
async function outputFile(file,q,files){await write(file,q);const d=await fd(file);files.push(d);return d;}
async function owner(file,value,files){const result={version:'plan-history-owner-v1',...value,files:files.map(x=>copy(x))};await write(file,result);return fd(file);}
/** The hook only transports an already-created object. The optional writer is
 * a pure metadata fault-injection seam, never a model or authority provider. */
export async function archiveStarLowerWorld(report,packet,{recipe,reference,outputDirectory,mathFiles,writer=outputFile}){
 assert(['original','projection'].includes(packet.kind));assert.equal(packet.inputLevelSha256,report.levelSha256);assert.equal(packet.levelSha256,levelSha256(packet.level));assert.equal(packet.upperBoundTransfer,false);
 // Existing v9 templateLevel is a complete-world field. Retain the very same
 // projected object before any I/O, including when its own file cannot save.
 if(packet.kind==='projection'){report.templateLevel=packet.level;report.templateLevelRole='LOWER_ONLY_STAR_ERASURE_NO_UPPER_TRANSFER';}
 const record={version:LOWER_VERSION,sourceLevelId:recipe.sourceLevelId,reference,recipeSha256:recipe.recipeSha256,...packet};
 try{return await writer(path.join(outputDirectory,'lower-'+packet.kind+'.json'),record,mathFiles);}
 catch(e){report.adminClosureRequired=true;report.lowerArchiveFailure={kind:packet.kind,error:e.message,levelSha256:packet.levelSha256};throw e;}
}
/** Stable recipe core: labels, body/gate IDs, target band and budget cannot
 * reset an already-started fixed inventory strategy, even before first full.
 * Identity indexes retain the actual insertion/parking order and atom roles. */
export function reverseRecipeExecutionIdentity(recipe){
 const ids=recipe.inventory.map(b=>b.id);assert.equal(new Set(ids).size,ids.length);const order=xs=>xs.map(id=>{const i=ids.indexOf(id);assert(i>=0);return i;});
 const atom=({id,...body})=>({inventoryIndex:order([id])[0],...body});
 const drag=({blockId,...move})=>({inventoryIndex:order([blockId])[0],...move});
 // Only physical seed poses and inverse moves participate in the lock.
 // Reference hashes, labels and replacement IDs cannot reopen this recipe.
 const suffix={seedBodies:recipe.suffixBlueprint.seedBodies.map(atom),inverseOperations:recipe.suffixBlueprint.inverseOperations.map(({body,forwardDrag,...op})=>({...op,body:atom(body),forwardDrag:drag(forwardDrag)}))};
 return levelSha256({version:'fixed-reverse-physical-recipe-once-v1',sourceLevelId:recipe.sourceLevelId,sourceMaskSha256:recipe.sourceMaskSha256,
  inventory:recipe.inventory.map(({color,shape,star})=>({color,shape,star:star??false})),gates:recipe.board.gates.map(({id,...g})=>g),insertionOrder:order(recipe.insertionOrder),parkingOrder:order(recipe.parkingBodyIds),strategy:recipe.strategy,qualificationFixture:recipe.qualificationFixture,suffix});
}

export const REVERSE_V4_FACTORY_DESCRIPTOR=Object.freeze({path:FACTORY,sha256:'e4b2724b182e41a301ceaaa955656384b3d25b11bc574f00228e4a0fb612f12d'});
export const REVERSE_TARGET_BANDS=Object.freeze({1:Object.freeze({floor:16,upper:20})});
export function reverseTargetBand(target){assert(Number.isSafeInteger(target)&&Object.hasOwn(REVERSE_TARGET_BANDS,target),'This source200 pilot only admits predeclared D1');return REVERSE_TARGET_BANDS[target];}
export function reverseOriginalLowerStage(U,target,lowerTask){
 assert(Number.isSafeInteger(U)&&U>=0,'Complete U must be a finite parking count');const band=reverseTargetBand(target);
 if(U<band.floor)return{status:'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR',lower:null};
 if(band.upper!==null&&U>band.upper)return{status:'KNOWN_UPPER_ABOVE_PREDECLARED_CEILING',lower:null};
 assert.equal(typeof lowerTask,'function');return{status:'ORIGINAL_LOWER_REQUESTED',lower:lowerTask()};
}
export function assertReverseProductionChoice(c){
 assert.equal(c.sourceLevelId,200,'Only the declared source200 pilot');assert.equal(c.targetDifficulty,1);assert(typeof c.stockId==='string'&&/^[a-z0-9-]+$/.test(c.stockId));reverseTargetBand(c.targetDifficulty);descriptor(c.declaration);descriptor(c.starDesignDeclaration);descriptor(c.priorHistoryReport);descriptor(c.selection);descriptor(c.designDisposition);assert(Array.isArray(c.additionalClosedArchives));const seen=new Set();for(const a of c.additionalClosedArchives){assert.deepEqual(Object.keys(a).sort(),['completion','producerQualification']);descriptor(a.completion);descriptor(a.producerQualification);assert(!seen.has(a.completion.path));seen.add(a.completion.path);}return true;
}
/** Explicit one-case administrative history contract; never a normal ACTUAL PASS. */
export function assertReversePriorHistory(c,p,administrative){
 if(c.priorHistoryReport?.sha256===ADMINISTRATIVE_PRIOR.sha256||p.status==='STAR_SOURCE200_ARCHIVAL_FAILURE_SEALED_AND_V9_VALIDATED')return assertReverseAdministrativePrior(c,p);
 if(['REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V10_VALIDATED','REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V12_VALIDATED','REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V13_VALIDATED'].includes(p.status))return assertReverseReusablePriorHistory(c,p,administrative);
 return assertReverseNormalPriorHistory(c,p);
}
export function assertReverseAdministrativePrior(c,p){
 assert.deepEqual(c.priorHistoryReport,ADMINISTRATIVE_PRIOR,'Only the exact reviewed administrative report');
 assert.equal(p.status,'STAR_SOURCE200_ARCHIVAL_FAILURE_SEALED_AND_V9_VALIDATED');assert.deepEqual(p.errors,[]);
 assert.equal(p.archivalIntegrity,'FAILED');assert.deepEqual(p.archivalErrors,['PREPAID_RECORD_NOT_ARCHIVED_AFTER_STATIC_VALIDATION_THROW']);
 for(const k of ['normalActualReviewPassed','normalExportAllowed','completeFormedWorldArchivalVerified','partialHistoryAuthenticationGranted','checkpointReexported','oldFilesChanged','mathematicalOwnerSynthesized','selectionWritten','formalAdoptionPerformed'])assert.equal(p[k],false,k);
 for(const k of ['administrativeSealOnly','originalOwnerDefinitionsPreserved','unclaimedMathOwnerTransported','metadataOnlyOwnerNotPhysicalProducer','completeBeforeAfterMembersEqual'])assert.equal(p[k],true,k);
 for(const k of ['newConstructions','newSearches','newLedgerClaims','newReplayCalls','newModels','recoveredLevelSpecsCreated'])assert.equal(p[k],0,k);
 assert.deepEqual(p.administrativeObservation,STAR_ARCHIVAL_OBSERVATION);assert.deepEqual(p.qualification,{"path":"deliverables/daily-formal-v4-20261008/proof/star-source200-administrative-seal-independent-01/report.json","sha256":"312b359a65dd77e88469b5f0388510b7ed0b6ea2dba144a58812e43cce9fd54c"});assert.deepEqual(p.actualAudit,{"path":"deliverables/daily-formal-v4-20261008/proof/star-source200-dual-exit-pilot-actual-independent-01/report.json","sha256":"aaa87dd587178b7a78561d37021f9f0c9f3d5f2a64eeba75d54022a84ddb46f7"});
 assert.equal(p.previousHeadSha256,'ea8fd622d3031ea080db56b6b60234c538290c2b9ca2cc7e41687b18776d4476');assert.equal(p.headSha256,'c65991ef0880f51ca20ef6c803366d7e080e502c70cf886220ec80ca73568017');
 assert.deepEqual(c.history,p.checkpoint);assert.deepEqual(c.historyReview,p.checkpointReview);assert.deepEqual(c.historyScope,p.historyScope);assert.deepEqual(c.selection,p.selection);assert.equal(c.historyHeadSha256,p.headSha256);
 assert(Array.isArray(p.priorHistoryDeltas)&&Array.isArray(p.historyDeltas)&&Array.isArray(p.completeHistoryDeltas));assert.equal(p.priorHistoryDeltas.length,8);assert.equal(p.historyDeltas.length,3);assert.deepEqual(p.completeHistoryDeltas,[...p.priorHistoryDeltas,...p.historyDeltas]);assert.deepEqual(c.historyDeltas,p.completeHistoryDeltas);
 const seen=new Set();for(const x of c.historyDeltas){descriptor(x.descriptor);descriptor(x.declaredOwner.definition);assert(!seen.has(x.descriptor.path));seen.add(x.descriptor.path);}assert.equal(c.historyDeltas.at(-1).descriptor.sha256,c.historyHeadSha256);assert.equal(c.historyScope.roots.length,7);
 assert.deepEqual(p.historyDeltas.map(x=>x.declaredOwner.kind),['construction','mathematical','construction']);assert.deepEqual(p.historyDeltas.map(x=>x.declaredOwner.definition),[p.constructorOwner,p.mathOwner,p.administrativeOwner]);
 for(const [k,n]of Object.entries({recordTicketsIssued:6,recordTicketsConsumed:6,savedOriginalRecords:5,unarchivedRecordCount:1,savedNonemptyPartials:4,emptyNonIdentityRecords:1,completePhysicalInputs:0,publicClaimsStarted:0}))assert.equal(p.archivalFacts[k],n,k);
 assert.equal(p.archivalFacts.saved.length,5);assert.equal(p.archivalFacts.saved.filter(x=>x.field==='level').length,4);assert(p.archivalFacts.saved.every(x=>x.full===false));assert.equal(p.archivalFacts.saved.filter(x=>x.field==='emptyConstructionWorld').length,1);
 assert.equal(p.summary.publicStocks,p.before.publicStocks);assert.equal(p.summary.terminalRecords,p.before.terminalRecords);assert.equal(p.summary.historyWorlds,p.before.historyWorlds+4);assert.equal(p.summary.closedCampaigns,p.before.closedCampaigns+1);
 for(const[k,n]of Object.entries({constructorFiles:10,constructorPartialWorlds:4,mathematicalFiles:1,mathematicalFullWorlds:0,administrativeFiles:1,administrativeFullWorlds:0,newPublicClaims:0,newAccepted:0}))assert.equal(p.summary[k],n,k);
 assert.equal(p.failedParentUnchanged.sourceLevelId,200);assert.equal(p.failedParentUnchanged.authenticatedBeforeAndAfter,true);assert.equal(p.failedParentUnchanged.blocked.length,2);
 assert.equal(c.failedParent.attemptId,p.failedParentUnchanged.attemptId);assert.equal(c.failedParent.namespace,p.failedParentUnchanged.namespace);
 return true;
}
/** Stable normal transport protocol. The old administrative failure remains
 * a separately authenticated prefix, never a repaired ACTUAL or math PASS. */
export function assertReverseReusablePriorHistory(c,p,administrative){
 const versions={REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V10_VALIDATED:4,REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V12_VALIDATED:5,REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V13_VALIDATED:6};
 assert(Object.hasOwn(versions,p.status),'Only explicit qualified star V10/V12/V13 successor protocols');assert.deepEqual(p.errors,[]);
 for(const k of ['oldFilesChanged','checkpointReexported','mathematicalOwnerSynthesized','selectionWritten','formalAdoptionPerformed'])assert.equal(p[k],false,k);
 for(const k of ['newConstructions','newSearches','newLedgerClaims','newReplayCalls'])assert.equal(p[k],0,k);
 assert.equal(p.originalOwnerDefinitionsPreserved,true);descriptor(p.qualification);descriptor(p.plan);descriptor(p.completion);descriptor(p.actualAudit);descriptor(p.priorHistoryReport);descriptor(p.constructorOwner);descriptor(p.mathOwner);
 for(const [a,b]of [['history','checkpoint'],['historyReview','checkpointReview'],['historyScope','historyScope'],['selection','selection']])assert.deepEqual(c[a],p[b]);
 assert.equal(c.historyScope.roots.length,7);assert(Array.isArray(p.priorHistoryDeltas)&&Array.isArray(p.historyDeltas));assert([1,2].includes(p.historyDeltas.length));assert.deepEqual(p.completeHistoryDeltas,[...p.priorHistoryDeltas,...p.historyDeltas]);assert.deepEqual(c.historyDeltas,p.completeHistoryDeltas);
 const canonical=compileCanonicalHistoryPath(c.historyScope).canonical,seen=new Set();for(const x of c.historyDeltas){descriptor(x.descriptor);descriptor(x.declaredOwner.definition);const key=canonical(x.descriptor.path);assert(!seen.has(key));seen.add(key);}
 assert.equal(p.previousHeadSha256,p.priorHistoryDeltas.at(-1)?.descriptor.sha256??c.history.sha256);assert.equal(p.headSha256,c.historyDeltas.at(-1).descriptor.sha256);assert.equal(c.historyHeadSha256,p.headSha256);
 assert.deepEqual(p.historyDeltas.map(x=>x.declaredOwner.kind),p.historyDeltas.length===1?['construction']:['construction','mathematical']);assert.deepEqual(p.historyDeltas[0].declaredOwner.definition,p.constructorOwner);if(p.historyDeltas.length===2)assert.deepEqual(p.historyDeltas[1].declaredOwner.definition,p.mathOwner);
 assert(administrative,'The immutable original administrative prefix must be read by descriptor');
 const originalContext={...c,priorHistoryReport:ADMINISTRATIVE_PRIOR,historyDeltas:administrative.completeHistoryDeltas,historyHeadSha256:administrative.headSha256,failedParent:{namespace:administrative.failedParentUnchanged?.namespace,attemptId:administrative.failedParentUnchanged?.attemptId}};
 assertReverseAdministrativePrior(originalContext,administrative);assert.deepEqual(p.priorHistoryDeltas.slice(0,administrative.completeHistoryDeltas.length),administrative.completeHistoryDeltas,'Original failed administrative chain cannot be omitted or rewritten');
 assert.equal(p.priorHistoryDeltas.length>=11,true);return{producerTaskVersion:versions[p.status],administrativeFailurePreserved:true,normalTransportDoesNotAcceptMathematics:true};
}
export async function assertReverseReusablePriorProducer(c,p,administrative,{bound,map}){
 const protocol=assertReverseReusablePriorHistory(c,p,administrative),n=protocol.producerTaskVersion;
 const qualification=await bound(p.qualification),plan=await bound(p.plan),review=await bound(p.actualAudit);
 assert.equal(qualification.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_TASK_V'+n+'_PASS');assert.equal(qualification.closedProductionScopeReviewed,true);assert.notEqual(qualification.productionDisabled,true);assert.deepEqual(qualification.errors,[]);for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(qualification[k],0);
 assert.equal(plan.version,'single-star-double-exit-known-suffix-owned-task-v'+n);assert.equal(plan.qualificationOnly,false);const context=await bound(plan.contextDescriptor);assert.deepEqual(context.qualification,p.qualification);assert.equal(context.version,plan.version);assert.equal(context.sourceLevelId,200);assert.equal(context.targetDifficulty,1);
 assert.equal(review.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_ACTUAL_V'+n+'_PASS');assert.deepEqual(review.plan,p.plan);assert.deepEqual(review.completion,p.completion);assert.deepEqual(review.errors,[]);for(const k of ['newConstructions','newSearches','newReplayCalls','publicClaimsStarted'])assert.equal(review[k],0);
 const producerTask='tools/daily-challenge/formal-v4/reverse-star-suffix-task-v'+n+'.mjs',producerFactory='tools/daily-challenge/formal-v4/reverse-star-suffix-factory-v'+(n+1)+'.mjs',adapter='tools/daily-challenge/formal-v4/plan-history-adapter-v'+({4:10,5:12,6:13}[n])+'.mjs';
 for(const file of [producerTask,producerFactory,adapter,'tools/daily-challenge/formal-v4/reverse-star-suffix-lower-v2.mjs']){assert(/^[a-f0-9]{64}$/.test(qualification.toolBindings[file]));assert.equal(plan.bindings[file],qualification.toolBindings[file]);assert.equal(review.toolBindings[file],qualification.toolBindings[file]);}
 await map(qualification.toolBindings);return protocol;
}
/** Conservative metadata-only sufficient condition. Color counts are compared
 * independently of shapes, so shape-only changes cannot masquerade as recolor.
 * This intentionally rejects some real recolor permutations with unchanged
 * color totals; it is not a new user threshold or a design acceptance proof. */
export function reverseDeclaredStockFingerprints(inventory){
 assert(Array.isArray(inventory)&&inventory.length>0);const shapes=[],colors={},pairs=[];
 for(const b of inventory){assert(typeof b.color==='string'&&b.color.length);assert(Array.isArray(b.shape)&&b.shape.length);const cells=b.shape.map(p=>{assert(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger));return p;});const minX=Math.min(...cells.map(p=>p[0])),minY=Math.min(...cells.map(p=>p[1]));const shape=cells.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);assert.equal(new Set(shape.map(p=>p.join(','))).size,shape.length);const key=JSON.stringify(shape);shapes.push(key);colors[b.color]=(colors[b.color]??0)+1;pairs.push(JSON.stringify({shape,color:b.color,star:b.star??false}));}
 shapes.sort();pairs.sort();const colorBodyCounts=Object.fromEntries(Object.entries(colors).sort(([a],[b])=>a.localeCompare(b)));
 return{shapeMultisetSha256:levelSha256(shapes),colorBodyCountsSha256:levelSha256(colorBodyCounts),shapeColorStarMultisetSha256:levelSha256(pairs),colorBodyCounts,bodyCount:inventory.length};
}
export function assertReverseChangedFailedStock(current,previous){
 const after=reverseDeclaredStockFingerprints(current),before=reverseDeclaredStockFingerprints(previous);
 assert.notEqual(after.shapeMultisetSha256,before.shapeMultisetSha256,'Latest failed constructor stock requires an actually changed original-orientation shape multiset');
 assert.notEqual(after.colorBodyCountsSha256,before.colorBodyCountsSha256,'Latest failed constructor stock requires independently changed per-color body counts');
 return{before,after,shapeMultisetChanged:true,colorBodyCountsChanged:true,ignored:['body/gate IDs','names','inventory order','insertion order','parking order','seed poses','reference aliases'],engineeringSufficientConditionOnly:true,completeWorldFreshnessAndFailedParentChecksStillRequired:true};
}
/** Locate every matching closed constructor from the already authenticated
 * bundle, independently of the caller partial-authentication list. */
export async function readLatestFailedReverseStock(state,{sourceLevelId,referenceLevelSha256,referenceRouteSha256,readBytes}){
 assert.equal(sourceLevelId,200);assert(state.bundle&&Array.isArray(state.closedCampaigns));const canonical=compileCanonicalHistoryPath(state.bundle.scope).canonical,members=new Map(state.bundle.files.map(d=>[canonical(d.path),d.sha256])),bindings={};
 const read=async d=>{descriptor(d);const b=await readBytes(d.path);assert.equal(sha(b),d.sha256,d.path);bindings[d.path]=d.sha256;return JSON.parse(b);};
 const rows=[];
 for(const closure of state.closedCampaigns){if(closure.raw?.status!=='REVERSE_FIXED_STOCK_CONSTRUCTION_CLOSED')continue;assert.equal(members.get(canonical(closure.descriptor.path)),closure.descriptor.sha256);assert.deepEqual(await read(closure.descriptor),closure.raw);assert.equal(closure.closed,true);assert.equal(closure.restartAllowed,false);assert(state.closedExperimentIds.includes(closure.id));const raw=closure.raw,p=await read(raw.plan);if(p.recipe?.sourceLevelId!==sourceLevelId)continue;
  const {recipeSha256,...recipeCore}=p.recipe;assert.equal(recipeSha256,levelSha256(recipeCore),'Latest failed-stock recipe bytes must match their original recipe hash');const blueprint=p.recipe.suffixBlueprint;assert(blueprint,'Unknown same-source constructor reference contract');if(blueprint.referenceLevelSha256!==referenceLevelSha256||blueprint.referenceRouteSha256!==referenceRouteSha256)continue;
  assert(/^single-star-double-exit-known-suffix-owned-task-v[2456]$/.test(p.version),'Unknown producer cannot bypass latest failed-stock gate');assert.equal(p.qualificationOnly,false);assert.equal(p.recipe.targetDifficulty,1);assert.equal(p.experimentId,closure.id);assert.equal(raw.experimentId,closure.id);assert.equal(raw.qualificationOnly,false);
  const receiptMember=members.get(canonical(raw.receipt.path));if(receiptMember!==undefined)assert.equal(receiptMember,raw.receipt.sha256,'Existing candidate member SHA mismatch');const q=await read(raw.receipt);assert.deepEqual(q.plan,raw.plan);assert.equal(q.version,p.version);assert.equal(q.sourceLevelId,sourceLevelId);assert.equal(q.experimentId,closure.id);assert.equal(typeof q.accepted,'boolean');if(q.accepted)continue;
  assert(Number.isFinite(Date.parse(raw.finishedAt)));rows.push({experimentId:closure.id,closure:closure.descriptor,plan:raw.plan,receipt:raw.receipt,finishedAt:raw.finishedAt,sourceLevelId,referenceLevelSha256,referenceRouteSha256,inventory:p.recipe.inventory,completePhysicalInputs:raw.completePhysicalInputs,claimed:!!q.attempt,accepted:false,requiresProtocolPartialAuthentication:['single-star-double-exit-known-suffix-owned-task-v4','single-star-double-exit-known-suffix-owned-task-v5','single-star-double-exit-known-suffix-owned-task-v6'].includes(p.version)&&q.status==='REVERSE_CONSTRUCTION_TERMINAL'&&raw.completePhysicalInputs===0&&!q.attempt&&q.archiveValidation?.completeFormedWorldArchivalVerified===true&&q.archiveValidation?.allStaticWorldsValid===true});
 }
 assert(rows.length,'No authenticated latest failed constructor stock for this source/reference');rows.sort((a,b)=>Date.parse(b.finishedAt)-Date.parse(a.finishedAt));assert(rows.length===1||Date.parse(rows[0].finishedAt)>Date.parse(rows[1].finishedAt),'Ambiguous latest failed constructor timestamp');
 for(const [p,h]of Object.entries(bindings))assert.equal(sha(await readBytes(p)),h,'Failed constructor metadata changed');return{latest:rows[0],matchingFailedCampaignCount:rows.length,fileBindings:bindings};
}

export function assertLatestFailedStockPartialAuthentication(recent,summary,scope){
 if(!recent.latest.requiresProtocolPartialAuthentication)return true;
 const canonical=compileCanonicalHistoryPath(scope).canonical;
 assert(summary.protocolArchives.some(a=>canonical(a.plan.path)===canonical(recent.latest.plan.path)&&a.plan.sha256===recent.latest.plan.sha256),'Latest eligible failed constructor was omitted from protocol partial authentication');return true;
}

export function assertReverseHistoryAdapterQualification(q){
 assert.equal(q.status,"INDEPENDENT_PLAN_HISTORY_ADAPTER_V13_PASS");assert.deepEqual(q.errors,[]);assert.equal(q.toolBindings[HISTORY_ADAPTER],HISTORY_ADAPTER_SHA256);return true;
}
export function assertReversePartialAuthentication(summary,additionalClosedArchives=[]){
 assert(Array.isArray(additionalClosedArchives));assert(Array.isArray(summary.protocolArchives));assert.equal(summary.protocolArchives.length,additionalClosedArchives.length);assert.equal(summary.archives.length,3+summary.protocolArchives.length);assert.deepEqual(summary.archives.slice(3),summary.protocolArchives);assert.equal(summary.authenticatedPartialRecords,10166+summary.protocolArchives.reduce((n,a)=>n+a.authenticatedPartialRecords,0));for(const [i,a]of summary.protocolArchives.entries()){assert.deepEqual(a.completion,additionalClosedArchives[i].completion);assert.deepEqual(a.producerQualification,additionalClosedArchives[i].producerQualification);assert.equal(a.allStaticWorldsValid,true);assert.equal(a.sourceLevelId,200);assert(Number.isSafeInteger(a.authenticatedPartialRecords)&&a.authenticatedPartialRecords>=0);assert.equal(a.completePhysicalInputs,0);assert.equal(a.completeFormedWorldArchivalVerified,true);}
assert.equal(summary.archives[0].authenticatedPartialRecords+summary.archives[1].authenticatedPartialRecords,10162);
 assert.deepEqual(summary.archives.slice(0,2).map(x=>x.review.sha256),['f2d2496b0971878aef2248f6d5b6d69809e4c6ef36c63de21727f24937369c24','a132d450e7be0da964f69c3cf85be500d8f6d3df50e0cf99d96e54416adacb0a']);
 assert(summary.archives.every(x=>x.completePhysicalInputs===0));const star=summary.archives[2];assert.deepEqual(star.observation,STAR_ARCHIVAL_OBSERVATION);assert.equal(star.authenticatedPartialRecords,4);
 assert.equal(star.originalArchivalFailurePreserved,true);assert.equal(star.completeFormedWorldArchivalVerified,false);assert.equal(star.unarchivedRecordAuthorized,false);assert.equal(star.normalActualReviewPassed,false);
 assert.equal(summary.onlySameReferenceShapeColourClauseSkipped,true);assert.equal(summary.nearPoolsChanged,false);assert.equal(summary.historyChanged,false);for(const k of ['newConstructions','newModels','newSearches','newReplayCalls','newLedgerClaims'])assert.equal(summary[k],0);return true;
}
export function assertReverseNormalPriorHistory(c,p){
 assert(typeof p.status==='string'&&/^.+HISTORY_DELTAS_EXPORTED_AND_V[6789]_VALIDATED$/.test(p.status),'Original validated history export report required');assert.deepEqual(p.errors,[]);assert.equal(p.oldFilesChanged,false);assert.equal(p.checkpointReexported,false);for(const k of ['newConstructions','newSearches','newLedgerClaims','newReplayCalls'])assert.equal(p[k],0);
 descriptor(c.history);descriptor(c.historyReview);assert.deepEqual(c.history,p.checkpoint);assert.deepEqual(c.historyReview,p.checkpointReview);assert.deepEqual(c.historyScope,p.historyScope);assert.deepEqual(c.selection,p.selection);assert.equal(c.historyHeadSha256,p.headSha256);
 assert(Array.isArray(p.priorHistoryDeltas)&&Array.isArray(p.historyDeltas)&&Array.isArray(p.completeHistoryDeltas));assert.deepEqual(p.completeHistoryDeltas,[...p.priorHistoryDeltas,...p.historyDeltas]);assert.deepEqual(c.historyDeltas,p.completeHistoryDeltas);
 const seen=new Set();for(const x of c.historyDeltas){descriptor(x.descriptor);descriptor(x.declaredOwner.definition);assert(!seen.has(x.descriptor.path));seen.add(x.descriptor.path);}
 assert.equal(c.historyHeadSha256,c.historyDeltas.length?c.historyDeltas.at(-1).descriptor.sha256:c.history.sha256);assert.equal(c.historyScope.roots.length,7);return true;
}
export function assertReverseStockDeclaration(c,d,source,reference){
 assert.equal(d.status,'READONLY_REVERSE_STOCK_DECLARATION_NOT_EXECUTABLE');assert.equal(d.executable,false);assert.equal(d.sourceLevelId,c.sourceLevelId);assert.equal(source.id,c.sourceLevelId);descriptor(d.sourceReference);assert.equal(d.sourceLevelSha256,levelSha256(source));assert.equal(d.sourceBoardBaselineSha256,boardBaselineSha256(source));
 assert(Number.isSafeInteger(source.width)&&source.width>0&&Number.isSafeInteger(source.height)&&source.height>0);assert(!(source.seams??[]).length,'No introduced or omitted internal wall');assert(!(source.blocked??[]).length,'This new input domain uses full normal rectangles');
 if(source.playable){const expected=Array.from({length:source.width*source.height},(_,i)=>[i%source.width,Math.floor(i/source.width)].join(',')).sort();assert.deepEqual(source.playable.map(p=>p.join(',')).sort(),expected);}
 assert.equal(reference.levelSha256,levelSha256(reference.level));assert.equal(reference.level.id,c.sourceLevelId);assert.equal(boardBaselineSha256(reference.level),d.sourceBoardBaselineSha256);
 assert(Array.isArray(d.recipes)&&d.recipes.length>0);assert.equal(new Set(d.recipes.map(x=>x.recipeId)).size,d.recipes.length);const stock=d.recipes.find(x=>x.recipeId===c.stockId);assert(stock,'Exact independently declared stock');assert.equal(stock.sourceLevelId,c.sourceLevelId);assert.equal(stock.targetDifficulty,c.targetDifficulty,'No construction-time rebanding');
 assert(!Object.hasOwn(stock,'level')&&!Object.hasOwn(stock,'builder')&&!Object.hasOwn(stock,'qualificationFixture'));assert(d.inputBindings&&typeof d.inputBindings==='object');return stock;
}
/** Before large history loading: inventory/gate IDs only, no LevelSpec/model. */
export function assertStarStockIdPreflight(c,d){
 descriptor(c.starDesignDeclaration);descriptor(d.starDesignDeclaration);assert.deepEqual(c.starDesignDeclaration,d.starDesignDeclaration);
 assert(Array.isArray(d.recipes));assert.equal(new Set(d.recipes.map(x=>x.recipeId)).size,d.recipes.length);const stock=d.recipes.find(x=>x.recipeId===c.stockId);assert(stock,'Exact stock must exist before history');
 assertStaticStarStockIds(stock);return stock;
}
/** Every physical field comes from the exact bound, explicit-ID declaration. */
export function assertBoundStarDeclaredStock(c,d,stock,design){
 assert.equal(assertStarStockIdPreflight(c,d),stock);assert.equal(design.status,'READONLY_SINGLE_STAR_ROUTE_SPLIT_DESIGN_NOT_CONSTRUCTED');assert.equal(design.executable,false);
 const inventory=design.inventoryWithoutPositions.map(b=>{assert(typeof b.id==='string'&&b.id.length);assert(!Object.hasOwn(b,'x')&&!Object.hasOwn(b,'y'),'Design bodies have no positions');return{id:b.id,color:b.color,shape:b.shape,star:b.star};});
 const gates=design.gatesWithoutLevel.map(({designId,...g})=>g);assertStaticStarStockIds({inventory,gates});
 assert.deepEqual(stock.inventory,inventory,'Exact declared ID/shape/color/star inventory');assert.deepEqual(stock.gates,gates,'Exact declared ten physical gate IDs and resolution order');assertSource200StarStock(inventory,gates);
 for(const field of ['proposedInventoryOrder','proposedInsertionOrder','proposedParkingBodyIds'])assert.deepEqual(design[field],inventory.map(b=>b.id));
 assert.deepEqual(stock.insertionOrder,inventory.map(b=>b.id));assert.deepEqual(stock.parkingBodyIds,inventory.map(b=>b.id));return true;
}
/** Only scalar inventory/declaration inspection. No pose assignment or model. */
export function assertStarSuffixDeclaredDesign(c,d,source,reference,stock,design){
 assert.equal(design.status,'READONLY_SINGLE_STAR_ROUTE_SPLIT_DESIGN_NOT_CONSTRUCTED');assert.equal(design.sourceLevelId,200);assert.equal(design.target.proposedDifficulty,1);assert.equal(design.target.requiredFreshL,16);assert.equal(design.target.requiredCompleteUAtMost,20);assert.equal(design.target.slotAssignmentCommitted,false);
 assert.equal(source.id,200);assert.equal(source.width,6);assert.equal(source.height,8);assert.equal(levelSha256(source),design.sourceMask.existingSourceRecordSha256);assert.equal(c.targetDifficulty,1);
 assertBoundStarDeclaredStock(c,d,stock,design);assert.deepEqual(d.sourceReference,design.reference.base);assert.equal(reference.levelSha256,design.reference.baseLevelSha256);assert.equal(routeSha256(reference.drags),design.reference.baseRouteSha256);
 assert.equal(stock.blueprint.cutAfterDrag,34);assert.deepEqual(stock.blueprint.reference,d.sourceReference);
 assert.equal(design.retainedSuffix.cutAfterOriginalDrag,34);assert.equal(design.retainedSuffix.bodyCount,2);assert.equal(design.retainedSuffix.area,10);
 const maximum={maxStates:10000,maxTransitions:30000000,maxMicroStates:3000000,maxMilliseconds:45000};if(stock.upperBudget!==undefined)assert.deepEqual(stock.upperBudget,maximum);if(c.upperBudget!==undefined)assert.deepEqual(c.upperBudget,maximum);
 assert.equal(design.plannedRedesign.retainedBodies,2);assert.equal(design.plannedRedesign.changedArea,38);assert.equal(design.plannedRedesign.oldDifficultyTransferred,false);return true;
}
export function assertReverseDesignHolds(c,holds,minimum){
 assert.equal(minimum.heldCandidateCount,62);assert.equal(minimum.decisions.length,62);assert.equal(holds.status,'SELECTED_MATHEMATICS_PRESERVED_ADDITIONAL_DESIGN_HOLDS_RECORDED');assert.deepEqual(holds.selection,c.selection);assert.deepEqual(minimum.selection,c.selection);assert.equal(holds.formalAcceptedCount,0);assert.equal(holds.remainingAutomaticallyDesignApproved,false);assert(holds.heldCandidateCount>=62);assert.equal(holds.heldCandidateCount,holds.decisions.length);assert.equal(new Set(holds.decisions.map(d=>d.formalId)).size,holds.decisions.length);
 for(const d of minimum.decisions)assert(holds.decisions.some(x=>levelSha256(x)===levelSha256(d)),'Previously recorded design hold changed');for(const d of holds.decisions){assert.equal(d.formalAdoptionAllowed,false);assert.equal(d.originalMathematicalEvidencePreserved,true);}return{descriptor:c.designDisposition,minimum:MINIMUM_DESIGN_HOLDS,heldCandidateCount:holds.heldCandidateCount,allSelectedRemainInNearPool:true,automaticDesignAcceptance:false};
}
export function latestReverseFailedAttempt(h,source){const hashes=new Set(h.fullWorlds.filter(w=>w.sourceLevelId===source||w.level?.id===source).map(w=>levelSha256(w.level)));const rows=Object.values(h.terminalByAttempt).filter(r=>r.namespace===h.bundle.publicNamespace&&r.kind==='mathematical'&&r.result?.value.accepted===false&&hashes.has(r.request.value.levelSha256));assert(rows.length,'No latest failed parent');for(const r of rows)assert(Number.isFinite(Date.parse(r.request.value.startedAt)));rows.sort((a,b)=>Date.parse(b.request.value.startedAt)-Date.parse(a.request.value.startedAt));assert(rows.length===1||Date.parse(rows[0].request.value.startedAt)>Date.parse(rows[1].request.value.startedAt),'Ambiguous failed parent');return rows[0];}
/** Read-only preflight mirrors the old ledger's lexical assertion, in addition
 * to the physical shared-root check. The exact argument returned here is used
 * by the claim; no output or lock has been written at this point. */
export async function assertReverseLedgerPreflight({qualificationOnly,publicDirectory,constructorDirectory,ledgerDirectory}){
 assert.equal(typeof qualificationOnly,'boolean');
 const physical=await realPathWithSuffix(constructorDirectory),ledgerPhysical=await realPathWithSuffix(ledgerDirectory),publicPhysical=await realPathWithSuffix(publicDirectory);
 assert.equal(ledgerPhysical,physical,'Claim namespace must be the authenticated construction root');
 const actual=path.resolve(ledgerDirectory),production=path.resolve(LATE_PREFIX_CONSTRUCTION_LEDGER);
 if(!qualificationOnly){assert.equal(actual,production,'Production claim requires the same lexical namespace as the unchanged ledger');assert.equal(physical,await realPathWithSuffix(LATE_PREFIX_CONSTRUCTION_LEDGER));assert.equal(publicPhysical,await realPathWithSuffix(PUBLIC_LEDGER));}
 else{assert(actual.toLowerCase()!==production.toLowerCase()&&!actual.toLowerCase().startsWith(production.toLowerCase()+path.sep));for(const shared of HISTORY_LEDGER_ROOTS){const p=await realPathWithSuffix(shared);for(const candidate of [physical,publicPhysical])assert(candidate!==p&&!candidate.startsWith(p+path.sep),'Private namespace aliases shared history');}}
 return ledgerDirectory;
}
/** No model or world builder. Persisted objects retain every original field;
 * the one initial bodyless board has an explicit nonidentity evidence field.
 * The quote comes from the factory's active, already admitted reservation. */
export function makeReverseFormedWorldRecord(recipe,reference,level,creation){
 assert(Number.isSafeInteger(creation.ordinal)&&creation.ordinal>=0);assert.equal(creation.levelSha256,levelSha256(level));assert(Array.isArray(level.blocks));assert.equal(creation.staticValidation,'PENDING');assert.equal(creation.full,level.blocks.length===0?false:null,'Capture cannot invent a static classification');
 const record={levelSha256:creation.levelSha256,sourceLevelId:recipe.sourceLevelId,reference,recipeSha256:recipe.recipeSha256,creation:copy(creation),factory:REVERSE_V4_FACTORY_DESCRIPTOR};
 if(level.blocks.length===0){
  assert.equal(creation.ordinal,0,'Only the first formed board can be nonidentity');assert.equal(creation.label,'empty-normal-mask');assert.equal(creation.full,false);assert.equal(creation.reservedWorlds,1);assert.deepEqual(creation.quote,quoteReverseWorldCreation('empty-normal-mask'));
  assert.deepEqual(level,{...recipe.board,blocks:[]},'Exact initial mask/gates/all board fields required');
  return{...record,kind:'NON_IDENTITY_INITIAL_EMPTY_WORLD',identityEligible:false,emptyConstructionWorld:level};
 }
 assert(creation.ordinal>0,'Initial empty board must be retained before every nonempty world');assert.notEqual(creation.label,'empty-normal-mask');return{...record,level};
}
/** Used before terminal serialization and by a later actual/export reader.
 * Every row is authenticated; no empty record is silently filtered. Full
 * file bytes remain owned even though a bodyless board has no retry identity. */
export function assertReverseFormedWorldArchive(recipe,rows,{accounting,ownerFiles,terminalNonIdentityWorlds}={}){
 assert(Array.isArray(rows)&&Array.isArray(ownerFiles));const seen=new Set(),nonIdentityWorlds=[],validationResults=[];
 for(const [ordinal,row]of rows.entries()){
  descriptor(row.descriptor);assert.equal(sha(row.bytes),row.descriptor.sha256);const k=path.resolve(row.descriptor.path).toLowerCase();assert(!seen.has(k),'Repeated world descriptor');seen.add(k);
  assert(ownerFiles.some(d=>d.path===row.descriptor.path&&d.sha256===row.descriptor.sha256),'Every formed world belongs to the actual owner');
  const packet=JSON.parse(row.bytes);assert.deepEqual(packet.factory,REVERSE_V4_FACTORY_DESCRIPTOR);assert.equal(packet.creation.ordinal,ordinal);
  const empty=Object.hasOwn(packet,'emptyConstructionWorld');assert(!(empty&&Object.hasOwn(packet,'level')),'No dual physical/nonidentity representation');const level=empty?packet.emptyConstructionWorld:packet.level;
  assert.deepEqual(packet,makeReverseFormedWorldRecord(recipe,packet.reference,level,packet.creation),'Exact formed-world representation');
  if(empty)nonIdentityWorlds.push({descriptor:copy(row.descriptor),field:'emptyConstructionWorld',levelSha256:packet.levelSha256,ordinal:0,kind:packet.kind,factory:copy(REVERSE_V4_FACTORY_DESCRIPTOR)});
 }
 assert.equal(nonIdentityWorlds.length,Number(rows.length>0),'Exactly one initial empty when any world was formed');
 if(rows.length){
  assert(accounting?.session?.originalMeter,'Actual reservation accounting required');const meter=accounting.session.originalMeter;
  assert.deepEqual(meter.reservations[0],quoteReverseWorldCreation('empty-normal-mask'));assert(meter.reserved.worlds>=1);
  const raw=accounting.session.rawAccounting;
  assert.equal(accounting.session.budgetAccountingVersion,'labelled-snapshot-before-mutation-v4');assert.equal(raw.version,'labelled-snapshot-before-mutation-v4');
  assert.equal(raw.postUseAdmissions,0);assert.equal(raw.refunds,0);assert.equal(raw.rawSetSharedAcrossAllModelsAndReplays,true);assert.equal(raw.active,false);
  assert(Number.isSafeInteger(raw.distinctStates)&&raw.distinctStates>=1&&raw.distinctStates<=recipe.budget.maxStates);assert.equal(raw.events.length,raw.distinctStates);
  assert.equal(accounting.session.reserved.worlds,raw.distinctStates);assert.equal(accounting.totalReserved.worlds,raw.distinctStates);
  assert.equal(meter.verificationOperationsMaximum,meter.budget.maxTransitions);assert(meter.reserved.worlds<=meter.verificationOperationsMaximum);
  assert.equal(accounting.formed.length,rows.length);const registered=accounting.session.formed;
  assert.equal(raw.recordTicketsConsumed,rows.length,'Every consumed record ticket must have its original bytes');assert(Number.isSafeInteger(raw.recordTicketsIssued)&&raw.recordTicketsIssued>=raw.recordTicketsConsumed);
  assert.equal(registered.length,rows.length,'Every captured session world must be archived, including rejected ones');
  for(const [ordinal,row]of rows.entries()){
   const packet=JSON.parse(row.bytes),a=accounting.formed[ordinal],b=registered[ordinal];assert.equal(a.ordinal,ordinal);assert.equal(levelSha256(a.level),packet.levelSha256);assert.deepEqual(a.info,packet.creation);
   for(const key of ['label','levelSha256','full'])assert.equal(b[key],packet.creation[key]);const v=b.validation;assert(v&&v.archiveCaptured===true,'Original capture did not complete');
   assert(['PASSED','FAILED'].includes(v.staticValidation),'Static validation did not finish');assert.equal(typeof v.authorityGranted,'boolean');
   if(v.staticValidation==='PASSED')assert.equal(typeof v.validatedFull,'boolean');else{assert.equal(v.validatedFull,null);assert.equal(v.authorityGranted,false);}
   if(v.error!==null){assert.equal(typeof v.error,'string');assert(v.error.length);assert.equal(ordinal,rows.length-1);assert.equal(accounting.phase,'terminal');}
   else{assert.equal(v.staticValidation,'PASSED');assert.equal(v.authorityGranted,true);}
   validationResults.push({ordinal,levelSha256:packet.levelSha256,...copy(v)});
  }
 }else{assert(!accounting||accounting.formed.length===0,'A missing archive cannot hide formed worlds');if(accounting?.session?.rawAccounting)assert.equal(accounting.session.rawAccounting.recordTicketsConsumed,0,'No consumed ticket may be omitted');}
 if(terminalNonIdentityWorlds!==undefined)assert.deepEqual(terminalNonIdentityWorlds,nonIdentityWorlds);
 return{nonIdentityWorlds,physicalWorldRecords:rows.length-nonIdentityWorlds.length,totalFormedWorldRecords:rows.length,allStaticWorldsValid:validationResults.every(x=>x.staticValidation==='PASSED'),validationResults};
}

/** One recipe; first full world pauses before any model on that full portal.
 * All generated worlds are written by this owner synchronously before model
 * use. Internal model snapshots are separately prepaid, not catalogue inputs.
 * No public caller supplies builders, history decisions, clocks or U receipts. */
export async function runReverseStockTask(runtime,planDescriptor,outputDirectory,{qualificationOnly=false,planReview=null}={}){
 assertReverseStarProductionReady();

 const initial=reader(),plan=await initial.bound(planDescriptor);assert.equal(plan.version,VERSION);assert.equal(plan.qualificationOnly,qualificationOnly);
 const x=await context(runtime,plan.contextDescriptor,qualificationOnly),expected=prepared(x,plan.contextDescriptor,qualificationOnly);assert.deepEqual(plan,expected,'Immutable recipe/plan changed');
 if(!qualificationOnly){const q=await initial.bound(planReview);assert.equal(q.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_PLAN_V6_PASS');assert.deepEqual(q.errors,[]);assert.deepEqual(q.plan,planDescriptor);assert.equal(q.newSearches,0);assert.equal(q.newConstructions,0);await initial.map(q.toolBindings);}
 const canonical=compileCanonicalHistoryPath(x.h.bundle.scope).canonical;
 const publicRoot=x.h.bundle.scope.roots.find(r=>canonical(r.physicalPath)===x.h.bundle.publicNamespace),constructorRoot=x.h.bundle.scope.roots.find(r=>r.id===x.c.constructorRootId);assert(publicRoot&&constructorRoot&&publicRoot!==constructorRoot);
 const ledgerDirectory=qualificationOnly?constructorRoot.physicalPath:LATE_PREFIX_CONSTRUCTION_LEDGER;
 await assertReverseLedgerPreflight({qualificationOnly,publicDirectory:publicRoot.physicalPath,constructorDirectory:constructorRoot.physicalPath,ledgerDirectory});
 const recipeIdentity=reverseRecipeExecutionIdentity(plan.recipe),recipeFile=path.join(constructorRoot.physicalPath,'reverse-recipe-'+recipeIdentity+'.execution.json');
 assert(!await exists(recipeFile),'FIXED_RECIPE_ALREADY_STARTED: no relabel, reband, budget change or continuation');
 assert(!await exists(outputDirectory),'Fresh owner output required');const startObservation=observeExecutionPolicy(plan.environment);
 const constructionFiles=[],mathFiles=[],allowed=[],formedFiles=[],formedRecords=[];let claim=null,attempt=null,pending=null;
 const experimentFile=path.join(constructorRoot.physicalPath,'experiment-'+levelSha256({experimentId:plan.experimentId})+'.execution.json');
 const report={version:VERSION,qualificationOnly,experimentId:plan.experimentId,sourceLevelId:plan.recipe.sourceLevelId,targetDifficulty:plan.recipe.targetDifficulty,plan:planDescriptor,accepted:false,formalReady:false,catalogEligible:false,status:'REVERSE_TASK_PENDING',level:null,levelSha256:null,L:null,U:null,proof:null,route:null,attempt:null,upperConstruction:null,lowerBound:null,executionPolicyObservation:startObservation,historyHeadSha256:x.h.headSha256,partialHistoryAuthentication:x.partialHistoryAuthentication??null,comparisonEvidence:x.comparison?.comparisonEvidence??null,priorHistoryReport:plan.priorHistoryReport,designDisposition:plan.designDisposition,designAccepted:false,starDesignReviewRequired:true,starDesignDeclaration:plan.starDesignDeclaration,bindings:plan.bindings,errors:[]};
 const members=async()=>assertPlanHistoryMembers(x.h,await listing(x.c.historyScope),allowed);
 const factory=await import('./reverse-star-suffix-factory-v7.mjs');
 try{
  claim=await claimNativeBatchPlan(planDescriptor,outputDirectory,{qualificationOnly,ledgerDirectory});constructionFiles.push(await fd(claim.claimFile));allowed.push(trackedFile(constructorRoot,claim.claimFile));
  await fs.mkdir(outputDirectory,{recursive:true});
  await outputFile(recipeFile,{version:'fixed-reverse-physical-recipe-once-v1',recipeIdentity,plan:planDescriptor,experimentId:plan.experimentId,maximumInputs:1,restartAllowed:false},constructionFiles);allowed.push(trackedFile(constructorRoot,recipeFile));
  await outputFile(experimentFile,{experimentId:plan.experimentId,plan:planDescriptor,maximumInputs:1,restartAllowed:false},constructionFiles);allowed.push(trackedFile(constructorRoot,experimentFile));
  if(x.c.qualificationFailureCase==='after-construction-locks'){assert(qualificationOnly);throw Error('synthetic-after-construction-locks');}
  // Existing ledger initialization may migrate aliases. Unknown additions are
  // rejected by the complete member check before the first world; no silent
  // allowance is minted for a migration or another producer.
  const ledger=await createAttemptLedger(publicRoot.physicalPath);await members();await x.r.finish();await initial.finish();
  let privateClockOffset=0;
  const authority=Object.freeze({}),auth={runtime,recipe:expected.recipe,state:x.h,comparisonView:x.comparison?.comparisonView,source:x.source,reference:x.reference,referenceLevel:x.referenceLevel,failedParent:x.c.failedParent?{namespace:x.c.failedParent.namespace,attemptId:x.c.failedParent.attemptId}:null,now:()=>Date.now()+privateClockOffset,used:false,
   persistFormedWorld(level,info){assert.equal(info.ordinal,formedFiles.length);const record=makeReverseFormedWorldRecord(plan.recipe,x.reference,level,info),file=path.join(outputDirectory,'world-'+String(formedFiles.length).padStart(5,'0')+'.json');const bytes=JSON.stringify(record,null,2)+'\n';sync.writeFileSync(file,bytes,{flag:'wx'});const d={path:file,sha256:sha(bytes)};formedFiles.push(d);constructionFiles.push(d);formedRecords.push({descriptor:d,bytes});}};
  constructions.set(authority,auth);pending=factory.beginReverseStockConstruction(runtime,expected.recipe,authority);report.construction=pending.report;
  if(!pending.pending){report.status=pending.status;report.errors.push(pending.reason??'Finite constructor exhausted');return report;}
  report.level=pending.level;report.levelSha256=pending.levelSha256;report.executionPolicyObservation=observeExecutionPolicy(plan.environment);await members();
  attempt=await ledger.claim(pending.level,{redesignOf:x.c.failedParent?.attemptId,allowRevalidation:false});report.attempt=attempt;
  for(const file of [path.join(publicRoot.physicalPath,attempt.id+'.request.json'),path.join(publicRoot.physicalPath,'identities',attempt.retryIdentitySha256+'.json')]){mathFiles.push(await fd(file));allowed.push(trackedFile(publicRoot,file));}
  const planFile=path.join(publicRoot.physicalPath,attempt.id+'.v4-reverse-fixed-stock-plan.json');await outputFile(planFile,{attempt,plan:planDescriptor,recipeSha256:plan.recipe.recipeSha256,levelSha256:report.levelSha256},mathFiles);allowed.push(trackedFile(publicRoot,planFile));
  if(x.c.qualificationClockCase==='deadline-after-claim'){assert(qualificationOnly);privateClockOffset=plan.recipe.budget.maxMilliseconds;report.syntheticClockAdvanceMilliseconds=privateClockOffset;}
  const claimToken=Object.freeze({});claims.set(claimToken,{construction:authority,levelSha256:pending.levelSha256,used:false});const upper=factory.finishReverseStockUpper(pending.token,claimToken);report.upperConstruction=upper;report.construction=upper.accounting;
  if(!upper.ok){report.status=upper.status;report.errors.push(upper.reason);return report;}
  assert.equal(upper.level,report.level);assert.equal(upper.levelSha256,report.levelSha256);assert.equal(upper.routeSha256,routeSha256(upper.drags));assert.equal(upper.accounting.session.counters.canonicalReplays,1);assert.equal(upper.accounting.session.counters.independentReplays,1);
  report.U=upper.U;report.drags=upper.drags;report.routeSha256=upper.routeSha256;report.route={search:null,inputLevelSha256:report.levelSha256,routeSha256:upper.routeSha256,canonicalReplay:upper.canonical,independentReplay:upper.independent,witnessSource:'one-internal-reverse-construction-double-upper'};
  const stage=reverseOriginalLowerStage(upper.U,plan.recipe.targetDifficulty,()=>runStarSuffixLower(runtime,report.level,{archiveFullWorld:packet=>archiveStarLowerWorld(report,packet,{recipe:plan.recipe,reference:x.reference,outputDirectory,mathFiles})}));
  if(stage.lower===null){report.status=stage.status;return report;}const lower=await stage.lower;report.lowerBound=lower;report.proof=lower.result;report.lowerArchives=lower.archives;assertReverseLowerReceipt(lower,report.level,plan.recipe.targetDifficulty);
  if(!lower.mathematicalLowerValidated){report.status='UNKNOWN_OR_SHORTCUT_STAR_PROJECTED_LOWER_TERMINAL';return report;}
  report.accepted=true;report.L=plan.recipe.floor;report.difficulty=plan.recipe.targetDifficulty;report.mathematicalEvidenceValidated=true;report.status='REVERSE_STAR_SUFFIX_ORIGINAL_U_PROJECTED_LOWER_VERIFIED';return report;
 }catch(e){if(!claim)throw e;if(pending?.pending&&!report.upperConstruction){try{report.construction=factory.abandonReverseStockConstruction(pending.token,e.message).report;}catch{}}
  report.accepted=false;report.status='REVERSE_FIXED_STOCK_TERMINAL';report.errors.push(e.message);return report;
 }finally{if(claim){
  try{await members();await x.r.finish();await initial.finish();}catch(e){report.accepted=false;report.status='REVERSE_BINDING_OR_MEMBERSHIP_TERMINAL';report.errors.push(e.message);}
  if(!report.accepted){report.L=null;report.difficulty=null;}report.redesignRequired=!report.accepted;report.mathematicalEvidenceValidated=report.accepted===true;report.formedWorlds=formedFiles;
  let archive;try{archive=assertReverseFormedWorldArchive(plan.recipe,formedRecords,{accounting:report.construction,ownerFiles:constructionFiles,...(x.c.qualificationFailureCase==='archive-review'?{terminalNonIdentityWorlds:[]}: {})});if(!archive.allStaticWorldsValid)assert.equal(report.accepted,false,'Invalid static world cannot be accepted');report.archiveValidation={valid:true,completeFormedWorldArchivalVerified:true,allStaticWorldsValid:archive.allStaticWorldsValid};report.nonIdentityWorlds=archive.nonIdentityWorlds;}
  catch(e){report.accepted=false;report.mathematicalEvidenceValidated=false;report.redesignRequired=true;report.status='REVERSE_ARCHIVE_VALIDATION_TERMINAL';report.L=null;report.difficulty=null;report.errors.push(e.message);report.archiveValidation={valid:false,error:e.message};report.adminClosureRequired=true;report.nonIdentityWorlds=null;archive={nonIdentityWorlds:null};}
  if(attempt){const ledger=await createAttemptLedger(publicRoot.physicalPath),sidecar=path.join(publicRoot.physicalPath,attempt.id+'.v4-reverse-fixed-stock-result.json');await outputFile(sidecar,report,mathFiles);allowed.push(trackedFile(publicRoot,sidecar));await ledger.finish(attempt,report);
   const endings=[path.join(publicRoot.physicalPath,attempt.id+'.result.json'),...(!report.accepted?[path.join(publicRoot.physicalPath,attempt.identityOrigin+'.blocked.json'),path.join(publicRoot.physicalPath,'identities',attempt.retryIdentitySha256+'.blocked.json')]:[])];for(const f of endings){mathFiles.push(await fd(f));allowed.push(trackedFile(publicRoot,f));}}
  const receipt=await outputFile(path.join(outputDirectory,'candidate.json'),report,mathFiles);
  const terminal={status:'REVERSE_FIXED_STOCK_CONSTRUCTION_CLOSED',experimentId:plan.experimentId,closed:true,restartAllowed:false,consumedInputs:Number(!!report.construction?.firstComplete),maximumInputs:1,completePhysicalInputs:report.construction?.completePhysicalInputs??0,formedWorldFiles:formedFiles,nonIdentityWorlds:archive.nonIdentityWorlds,archiveValidation:report.archiveValidation,adminClosureRequired:report.adminClosureRequired??false,receipt,accepted:false,mathematicalAcceptance:false};
  if(claim){await finishLatePrefixPlan(claim,terminal);constructionFiles.push(await fd(claim.resultFile));allowed.push(trackedFile(constructorRoot,claim.resultFile));}
  const index=await outputFile(path.join(outputDirectory,'construction-index.json'),terminal,constructionFiles),closure={id:plan.experimentId,descriptor:await fd(claim.resultFile),raw:JSON.parse(await fs.readFile(claim.resultFile)),closed:true,restartAllowed:false,consumedInputs:terminal.consumedInputs,maximumInputs:1};
  report.constructionOwner=await owner(path.join(outputDirectory,'construction.owner.definition.json'),{id:plan.experimentId,namespace:canonical(constructorRoot.physicalPath),kind:'construction',parentPlan:planDescriptor,experimentId:plan.experimentId,attemptIds:[],closedCampaigns:[closure]},constructionFiles);
  report.mathOwner=await owner(path.join(outputDirectory,'math.owner.definition.json'),{id:plan.experimentId+'-math',namespace:x.h.bundle.publicNamespace,kind:'mathematical',parentPlan:planDescriptor,experimentId:plan.experimentId,attemptIds:attempt?[attempt.id]:[],closedCampaigns:[]},mathFiles);
  // Completion is a small external index of two complete, immutable owner
  // manifests. It has no new worlds or ledger facts and is separately pinned
  // by the actual reviewer/exporter; nesting it into itself would be circular.
  await members();await write(path.join(outputDirectory,'completion.json'),{version:VERSION,status:'REVERSE_FIXED_STOCK_TASK_CLOSED',externalOwnerIndexOnly:true,plan:planDescriptor,receipt,index,constructionOwner:report.constructionOwner,mathOwner:report.mathOwner,publicClaimsStarted:Number(!!attempt),accepted:Number(report.accepted),formedWorlds:formedFiles.length,nonIdentityWorlds:archive.nonIdentityWorlds,archiveValidation:report.archiveValidation,adminClosureRequired:report.adminClosureRequired??false,maximumInputs:1,closed:true,allFailuresTerminal:true,oldLiveByteIntegrityClaimed:false});
 }}
}

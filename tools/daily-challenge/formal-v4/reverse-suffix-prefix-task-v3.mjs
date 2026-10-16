import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sync from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {assertV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding} from './prefix-execution-environment-task.mjs';
import {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,readDirectHistoryRole,authenticateKnownReversePartials} from './plan-history-adapter-v9.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {readSupplementalComparisonEvidence} from './supplemental-comparison-evidence.mjs';
import {sha,write,exists,realPathWithSuffix,HISTORY_LEDGER_ROOTS,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,claimNativeBatchPlan,finishLatePrefixPlan} from './low-twenty-io.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {guardedPlainTask,guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {quoteReverseWorldCreation} from './reverse-construction-reservations.mjs';

export const SELF='tools/daily-challenge/formal-v4/reverse-suffix-prefix-task-v3.mjs';
export const FACTORY='tools/daily-challenge/formal-v4/reverse-suffix-prefix-factory-v3.mjs';
export const VERSION='single-known-suffix-new-prefix-owned-task-v3';
export const QUALIFICATION_STATUS='INDEPENDENT_REVERSE_SUFFIX_PREFIX_TASK_PASS';
export const LOWER_BUDGET=Object.freeze({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
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
 let partialHistoryAuthentication=null;if(!qualificationOnly){const {fileBindings:partialFileBindings,...summary}=await authenticateKnownReversePartials(h,{readBytes:p=>r.bytes(p)});assert.equal(summary.authenticatedPartialRecords,10162);partialHistoryAuthentication={...summary,worldBindingsPinnedInPlan:true};}
 let comparison=null;if(c.comparison){comparison=await readSupplementalComparisonEvidence(h,{...c.comparison,readBytes:p=>r.bytes(p),qualificationOnly});}
 else assert(qualificationOnly,'Production requires the reviewed historical comparison view');
 return{h,comparison,partialHistoryAuthentication};
}
async function qualification(r,d){const q=await r.bound(d);assert.equal(q.status,QUALIFICATION_STATUS);assert.deepEqual(q.errors,[]);for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(q[k],0);assert.equal(q.closedProductionScopeReviewed,true);assert(q.toolBindings[SELF]&&q.toolBindings[FACTORY]);await r.map(q.toolBindings);}
async function context(runtime,contextDescriptor,qualificationOnly){
 assertV4Runtime(runtime);const r=reader(),c=await r.bound(contextDescriptor);assert.equal(c.version,VERSION);assert.equal(c.qualificationOnly,qualificationOnly);assert(/^[a-z0-9-]+$/.test(c.experimentId));assert([1,2,3].includes(c.targetDifficulty));
 assert.equal(c.maximumCompletePhysicalInputs,1);assert.equal(c.fallbackAllowed,false);assert.equal(c.failedInputRebandAllowed,false);assert(Array.isArray(c.historyDeltas));
 assert(c.qualificationClockCase===undefined||qualificationOnly&&c.qualificationClockCase==='deadline-after-claim','No production clock override');
 assert(c.qualificationFailureCase===undefined||qualificationOnly&&['after-construction-locks','archive-review'].includes(c.qualificationFailureCase),'No production failure injection');
 if(!qualificationOnly)assertReverseProductionChoice(c);
 const environment=prefixExecutionEnvironment(runtime),observation=observeExecutionPolicy(environment);await r.map(environment.bindings);await bindTools(r,runtime);
 if(!qualificationOnly){await qualification(r,c.qualification);assertReversePriorHistory(c,await r.bound(c.priorHistoryReport));assertReverseDesignHolds(c,await r.bound(c.designDisposition),await r.bound(MINIMUM_DESIGN_HOLDS));}
 const {h,comparison,partialHistoryAuthentication}=await history(r,c,qualificationOnly),declared=await r.bound(c.declaration);let source,ref=null,reference=null,stock;
 if(qualificationOnly){assert.equal(c.sourceLevelId,997661);source=await r.bound(c.syntheticSource);assert.equal(source.id,997661);assert.equal(source.width,4);assert.equal(source.height,2);assert.deepEqual(source.blocks,[]);stock=declared;}
 else{
  const sourceBinding=await currentMainlineSourceBinding(runtime,environment,c.sourceLevelId);await r.map(sourceBinding.bindings);source=runtime.LEVELS.find(x=>x.id===c.sourceLevelId);assert(source);
  reference=declared.sourceReference;ref=await r.bound(reference);stock=assertReverseStockDeclaration(c,declared,source,ref);
  reference={path:await fs.realpath(reference.path),sha256:reference.sha256};assert.deepEqual(await r.bound(reference),ref);await r.map(declared.inputBindings);
 }
 // Eight ordinary colours and the finite insertion policy are inherited tool
 // engineering domains, not a user-imposed quota. No full level is declared.
 const payload=copy(stock);payload.targetDifficulty=c.targetDifficulty;payload.upperBudget=c.upperBudget??stock.upperBudget??{};

 const {makeReverseStockRecipe,compileStoredSuffixBlueprint}=await import('./reverse-suffix-prefix-factory-v3.mjs');
 assert(!qualificationOnly,'Production adapter has no synthetic context dispatch');assert.equal(payload.blueprint.cutAfterDrag,26);assert.deepEqual(payload.blueprint.reference,declared.sourceReference);
 payload.suffixBlueprint=compileStoredSuffixBlueprint(ref,{cutAfterDrag:payload.blueprint.cutAfterDrag,gates:payload.gates,inventory:payload.inventory});
 const recipe=makeReverseStockRecipe(runtime,source,payload,{qualificationOnly});await r.map(recipe.assetBindings);
 let failedParent=null;if(c.failedParent){const latest=latestReverseFailedAttempt(h,c.sourceLevelId);assert.equal(c.failedParent.namespace,latest.namespace);assert.equal(c.failedParent.attemptId,latest.request.value.id);failedParent=await readDirectHistoryRole(h,{...c.failedParent,role:'failed-parent',readBytes:p=>r.bytes(p)});await r.map(failedParent.fileBindings);assert.equal(failedParent.blocked.length,2);assert.equal(failedParent.receipt.level.id,c.sourceLevelId);assert.equal(compileCanonicalHistoryPath(h.bundle.scope).canonical(c.failedParent.namespace),h.bundle.publicNamespace);}
 else assert(qualificationOnly,'Production fixed recipe requires its explicit latest failed parent');
 await r.finish();return{r,c,h,comparison,partialHistoryAuthentication,environment,observation,source,reference,referenceLevel:ref?.level??null,recipe,failedParent};
}

/** Metadata/bytes only. No full candidate, model, owner or mathematical claim. */
function prepared(x,contextDescriptor,qualificationOnly){return freeze({version:VERSION,contextDescriptor:copy(contextDescriptor),qualificationOnly,experimentId:x.c.experimentId,recipe:x.recipe,environment:x.environment,historyHeadSha256:x.h.headSha256,
 partialHistoryAuthentication:x.partialHistoryAuthentication??null,comparisonEvidence:x.comparison?.comparisonEvidence??null,priorHistoryReport:x.c.priorHistoryReport??null,selection:x.c.selection??null,designDisposition:x.c.designDisposition??null,failedParent:copy(x.c.failedParent??null),declaration:copy(x.c.declaration),bindings:copy(x.r.bindings),lowerBudget:copy(LOWER_BUDGET),maximumCompletePhysicalInputs:1,
 firstFullFailureIsTerminal:true,dualUpperReplayPairsMaximum:1,originalLowerCallsMaximum:1,accepted:false,catalogEligible:false,formalReady:false});
}
export async function prepareReverseStockTask(runtime,contextDescriptor,{qualificationOnly=false}={}){return prepared(await context(runtime,contextDescriptor,qualificationOnly),contextDescriptor,qualificationOnly);}

// Only this module issues capabilities after exact-context authentication.
// Exported consumers cannot mint one from a naked state or caller callback.
export function takeReverseConstructionAuthority(token,runtime,recipe){const a=constructions.get(token);assert(a&&!a.used,'Authenticated one-shot construction authority');assert.equal(a.runtime,runtime);assert.deepEqual(a.recipe,recipe);a.used=true;return a;}
export function takeReverseClaimAuthority(token,construction,levelSha){const c=claims.get(token);assert(c&&!c.used&&c.construction===construction&&c.levelSha256===levelSha,'One original full-world public claim required');c.used=true;return c;}

/** Pure receipt validation also used by tiny metadata tests. It never accepts
 * supplied U evidence as permission to run a lower search. Actual dispatch
 * below receives its U solely from the private factory continuation. */
export function assertReverseLowerReceipt(lower,levelHash,target){
 assert.deepEqual(lower.budget,LOWER_BUDGET);assert.equal(lower.sourceLevelSha256,levelHash);assert.equal(lower.floor,reverseTargetBand(target).floor);assert.deepEqual(inspectSearchAccounting(lower,'reverse-original-lower'),[]);assert.deepEqual(lower.guardAllowance,guardAllowanceFor(lower));assert(lower.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
 if(lower.thresholdProven){assert.equal(lower.status,'threshold-proven');assert.equal(lower.termination,'below-threshold-exhausted');assert.equal(lower.certifiedFloor,lower.floor);assert(lower.elapsedMilliseconds<=LOWER_BUDGET.maxMilliseconds);}return true;
}
function trackedFile(root,file){return{rootId:root.id,path:file};}
async function outputFile(file,q,files){await write(file,q);const d=await fd(file);files.push(d);return d;}
async function owner(file,value,files){const result={version:'plan-history-owner-v1',...value,files:files.map(x=>copy(x))};await write(file,result);return fd(file);}
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
  inventory:recipe.inventory.map(({color,shape})=>({color,shape})),gates:recipe.board.gates.map(({id,...g})=>g),insertionOrder:order(recipe.insertionOrder),parkingOrder:order(recipe.parkingBodyIds),strategy:recipe.strategy,qualificationFixture:recipe.qualificationFixture,suffix});
}

export const REVERSE_V4_FACTORY_DESCRIPTOR=Object.freeze({path:FACTORY,sha256:'908ad45cfe09ed084df1985086de096caf3768ddb8c46af691bcfa031a6b4d3d'});
export const REVERSE_TARGET_BANDS=Object.freeze({1:Object.freeze({floor:16,upper:20}),2:Object.freeze({floor:21,upper:30}),3:Object.freeze({floor:31,upper:null})});
export function reverseTargetBand(target){assert(Number.isSafeInteger(target)&&Object.hasOwn(REVERSE_TARGET_BANDS,target),'Predeclared D1/D2/D3 required');return REVERSE_TARGET_BANDS[target];}
export function reverseOriginalLowerStage(U,target,lowerTask){
 assert(Number.isSafeInteger(U)&&U>=0,'Complete U must be a finite parking count');const band=reverseTargetBand(target);
 if(U<band.floor)return{status:'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR',lower:null};
 if(band.upper!==null&&U>band.upper)return{status:'KNOWN_UPPER_ABOVE_PREDECLARED_CEILING',lower:null};
 assert.equal(typeof lowerTask,'function');return{status:'ORIGINAL_LOWER_REQUESTED',lower:lowerTask()};
}
export function assertReverseProductionChoice(c){
 assert(Number.isSafeInteger(c.sourceLevelId)&&c.sourceLevelId>=1&&c.sourceLevelId<=200,'Actual normal mainline source');assert(typeof c.stockId==='string'&&/^[a-z0-9-]+$/.test(c.stockId));reverseTargetBand(c.targetDifficulty);descriptor(c.declaration);descriptor(c.priorHistoryReport);descriptor(c.selection);descriptor(c.designDisposition);return true;
}
export function assertReversePriorHistory(c,p){
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
 assert(Number.isSafeInteger(creation.ordinal)&&creation.ordinal>=0);assert.equal(creation.levelSha256,levelSha256(level));assert(Array.isArray(level.blocks));
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
 assert(Array.isArray(rows)&&Array.isArray(ownerFiles));const seen=new Set(),nonIdentityWorlds=[];
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
  assert(registered.length===rows.length||registered.length===rows.length-1&&accounting.phase==='terminal'&&accounting.firstComplete?.levelSha256===JSON.parse(rows.at(-1).bytes).levelSha256,'Only the last first-full rejection may precede session registration');
  for(const [ordinal,row]of rows.entries()){const packet=JSON.parse(row.bytes),a=accounting.formed[ordinal],b=registered[ordinal];assert.equal(a.ordinal,ordinal);assert.equal(levelSha256(a.level),packet.levelSha256);assert.deepEqual(a.info,packet.creation);if(b)for(const key of ['label','levelSha256','full'])assert.equal(b[key],packet.creation[key]);}
 }else assert(!accounting||accounting.formed.length===0,'A missing archive cannot hide formed worlds');
 if(terminalNonIdentityWorlds!==undefined)assert.deepEqual(terminalNonIdentityWorlds,nonIdentityWorlds);
 return{nonIdentityWorlds,physicalWorldRecords:rows.length-nonIdentityWorlds.length,totalFormedWorldRecords:rows.length};
}

/** One recipe; first full world pauses before any model on that full portal.
 * All generated worlds are written by this owner synchronously before model
 * use. Internal model snapshots are separately prepaid, not catalogue inputs.
 * No public caller supplies builders, history decisions, clocks or U receipts. */
export async function runReverseStockTask(runtime,planDescriptor,outputDirectory,{qualificationOnly=false,planReview=null}={}){
 const initial=reader(),plan=await initial.bound(planDescriptor);assert.equal(plan.version,VERSION);assert.equal(plan.qualificationOnly,qualificationOnly);
 const x=await context(runtime,plan.contextDescriptor,qualificationOnly),expected=prepared(x,plan.contextDescriptor,qualificationOnly);assert.deepEqual(plan,expected,'Immutable recipe/plan changed');
 if(!qualificationOnly){const q=await initial.bound(planReview);assert.equal(q.status,'INDEPENDENT_REVERSE_SUFFIX_PREFIX_PLAN_PASS');assert.deepEqual(q.errors,[]);assert.deepEqual(q.plan,planDescriptor);assert.equal(q.newSearches,0);assert.equal(q.newConstructions,0);await initial.map(q.toolBindings);}
 const canonical=compileCanonicalHistoryPath(x.h.bundle.scope).canonical;
 const publicRoot=x.h.bundle.scope.roots.find(r=>canonical(r.physicalPath)===x.h.bundle.publicNamespace),constructorRoot=x.h.bundle.scope.roots.find(r=>r.id===x.c.constructorRootId);assert(publicRoot&&constructorRoot&&publicRoot!==constructorRoot);
 const ledgerDirectory=qualificationOnly?constructorRoot.physicalPath:LATE_PREFIX_CONSTRUCTION_LEDGER;
 await assertReverseLedgerPreflight({qualificationOnly,publicDirectory:publicRoot.physicalPath,constructorDirectory:constructorRoot.physicalPath,ledgerDirectory});
 const recipeIdentity=reverseRecipeExecutionIdentity(plan.recipe),recipeFile=path.join(constructorRoot.physicalPath,'reverse-recipe-'+recipeIdentity+'.execution.json');
 assert(!await exists(recipeFile),'FIXED_RECIPE_ALREADY_STARTED: no relabel, reband, budget change or continuation');
 assert(!await exists(outputDirectory),'Fresh owner output required');const startObservation=observeExecutionPolicy(plan.environment);
 const constructionFiles=[],mathFiles=[],allowed=[],formedFiles=[],formedRecords=[];let claim=null,attempt=null,pending=null;
 const experimentFile=path.join(constructorRoot.physicalPath,'experiment-'+levelSha256({experimentId:plan.experimentId})+'.execution.json');
 const report={version:VERSION,qualificationOnly,experimentId:plan.experimentId,sourceLevelId:plan.recipe.sourceLevelId,targetDifficulty:plan.recipe.targetDifficulty,plan:planDescriptor,accepted:false,formalReady:false,catalogEligible:false,status:'REVERSE_TASK_PENDING',level:null,levelSha256:null,L:null,U:null,proof:null,route:null,attempt:null,upperConstruction:null,lowerBound:null,executionPolicyObservation:startObservation,historyHeadSha256:x.h.headSha256,partialHistoryAuthentication:x.partialHistoryAuthentication??null,comparisonEvidence:x.comparison?.comparisonEvidence??null,priorHistoryReport:plan.priorHistoryReport,designDisposition:plan.designDisposition,designAccepted:false,bindings:plan.bindings,errors:[]};
 const members=async()=>assertPlanHistoryMembers(x.h,await listing(x.c.historyScope),allowed);
 const factory=await import('./reverse-suffix-prefix-factory-v3.mjs');
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
  const stage=reverseOriginalLowerStage(upper.U,plan.recipe.targetDifficulty,()=>guardedPlainTask(report.level,runtime,{floor:plan.recipe.floor,searchUpper:null,...LOWER_BUDGET}));
  if(stage.lower===null){report.status=stage.status;return report;}const lower=stage.lower;assertReverseLowerReceipt(lower,report.levelSha256,plan.recipe.targetDifficulty);report.proof=lower;report.lowerBound={method:'v3-plain',inputLevelSha256:report.levelSha256,result:lower};
  if(!lower.thresholdProven){report.status='UNKNOWN_OR_SHORTCUT_ORIGINAL_LOWER_TERMINAL';return report;}
  report.accepted=true;report.L=plan.recipe.floor;report.difficulty=plan.recipe.targetDifficulty;report.mathematicalEvidenceValidated=true;report.status='REVERSE_FIXED_STOCK_ORIGINAL_LU_VERIFIED';return report;
 }catch(e){if(!claim)throw e;if(pending?.pending&&!report.upperConstruction){try{report.construction=factory.abandonReverseStockConstruction(pending.token,e.message).report;}catch{}}
  report.accepted=false;report.status='REVERSE_FIXED_STOCK_TERMINAL';report.errors.push(e.message);return report;
 }finally{if(claim){
  try{await members();await x.r.finish();await initial.finish();}catch(e){report.accepted=false;report.status='REVERSE_BINDING_OR_MEMBERSHIP_TERMINAL';report.errors.push(e.message);}
  report.redesignRequired=!report.accepted;report.mathematicalEvidenceValidated=report.accepted===true;report.formedWorlds=formedFiles;
  let archive;try{archive=assertReverseFormedWorldArchive(plan.recipe,formedRecords,{accounting:report.construction,ownerFiles:constructionFiles,...(x.c.qualificationFailureCase==='archive-review'?{terminalNonIdentityWorlds:[]}: {})});report.archiveValidation={valid:true};report.nonIdentityWorlds=archive.nonIdentityWorlds;}
  catch(e){report.accepted=false;report.mathematicalEvidenceValidated=false;report.redesignRequired=true;report.status='REVERSE_ARCHIVE_VALIDATION_TERMINAL';report.errors.push(e.message);report.archiveValidation={valid:false,error:e.message};report.adminClosureRequired=true;report.nonIdentityWorlds=null;archive={nonIdentityWorlds:null};}
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

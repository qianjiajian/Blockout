import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sync from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {assertV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding} from './prefix-execution-environment-task.mjs';
import {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,readDirectHistoryRole} from './plan-history-adapter-v5.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {readSupplementalComparisonEvidence} from './supplemental-comparison-evidence.mjs';
import {sha,write,exists,realPathWithSuffix,HISTORY_LEDGER_ROOTS,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,claimNativeBatchPlan,finishLatePrefixPlan} from './low-twenty-io.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {guardedPlainTask,guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {nativeOriginalLowerStage} from './prefix-tail-native-task.mjs';

export const SELF='tools/daily-challenge/formal-v4/reverse-fixed-stock-task.mjs';
export const FACTORY='tools/daily-challenge/formal-v4/reverse-fixed-stock-factory.mjs';
export const VERSION='single-fixed-reverse-stock-owned-task-v1';
export const QUALIFICATION_STATUS='INDEPENDENT_REVERSE_FIXED_STOCK_TASK_PASS';
export const LOWER_BUDGET=Object.freeze({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
const DECLARATION={path:'deliverables/daily-formal-v4-20261008/design/reverse-source52-three-stock-declaration-01/declaration.json',sha256:'7d675cefbd233e9bd1b2ef3a19bcc058d9446c3bb985a7b3124b1472433a4c70'};
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
 let comparison=null;if(c.comparison){comparison=await readSupplementalComparisonEvidence(h,{...c.comparison,readBytes:p=>r.bytes(p),qualificationOnly});}
 else assert(qualificationOnly,'Production requires the reviewed historical comparison view');
 return{h,comparison};
}
async function qualification(r,d){const q=await r.bound(d);assert.equal(q.status,QUALIFICATION_STATUS);assert.deepEqual(q.errors,[]);for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(q[k],0);assert.equal(q.closedProductionScopeReviewed,true);assert(q.toolBindings[SELF]&&q.toolBindings[FACTORY]);await r.map(q.toolBindings);}
async function context(runtime,contextDescriptor,qualificationOnly){
 assertV4Runtime(runtime);const r=reader(),c=await r.bound(contextDescriptor);assert.equal(c.version,VERSION);assert.equal(c.qualificationOnly,qualificationOnly);assert(/^[a-z0-9-]+$/.test(c.experimentId));assert([2,3].includes(c.targetDifficulty));
 assert.equal(c.maximumCompletePhysicalInputs,1);assert.equal(c.fallbackAllowed,false);assert.equal(c.failedInputRebandAllowed,false);assert(Array.isArray(c.historyDeltas));
 assert(c.qualificationClockCase===undefined||qualificationOnly&&c.qualificationClockCase==='deadline-after-claim','No production clock override');
 const environment=prefixExecutionEnvironment(runtime),observation=observeExecutionPolicy(environment);await r.map(environment.bindings);await bindTools(r,runtime);
 if(!qualificationOnly)await qualification(r,c.qualification);
 const {h,comparison}=await history(r,c,qualificationOnly),declared=await r.bound(c.declaration);let source,ref=null,reference=null,stock;
 if(qualificationOnly){assert.equal(c.sourceLevelId,997661);source=await r.bound(c.syntheticSource);assert.equal(source.id,997661);assert.equal(source.width,4);assert.equal(source.height,2);assert.deepEqual(source.blocks,[]);stock=declared;}
 else{assert.deepEqual(c.declaration,DECLARATION);assert.equal(c.sourceLevelId,52);assert.equal(declared.sourceLevelId,52);assert.equal(declared.executable,false);assert.equal(declared.status,'READONLY_REVERSE_STOCK_DECLARATION_NOT_EXECUTABLE');
  const sourceBinding=await currentMainlineSourceBinding(runtime,environment,52);await r.map(sourceBinding.bindings);source=runtime.LEVELS.find(x=>x.id===52);assert(source);assert.equal(source.width,6);assert.equal(source.height,8);
  reference=declared.sourceReference;ref=await r.bound(reference);assert.equal(ref.levelSha256,levelSha256(ref.level));assert.equal(boardBaselineSha256(source),boardBaselineSha256(ref.level),'Normal source mask');
  // Verified realpath for this exact deliverables object only, never a blanket
  // root/snapshot source-code alias. Same-reference shape/colour sees one path.
  reference={path:await fs.realpath(reference.path),sha256:reference.sha256};assert.deepEqual(await r.bound(reference),ref);
  stock=declared.recipes.find(x=>x.recipeId===c.stockId);assert(stock,'Exact one predeclared inventory');assert.equal(c.targetDifficulty,c.stockId==='source52-stock-c'?2:3,'Inventory target fixed before any actual world');await r.map(declared.inputBindings);
 }
 const payload=qualificationOnly?copy(stock):{recipeId:c.experimentId+'-'+stock.recipeId,sourceLevelId:c.sourceLevelId,inventory:stock.inventory.map(({id,color,shape})=>({id,color,shape})),gates:declared.gates,insertionOrder:stock.insertionOrder,parkingBodyIds:stock.insertionOrder,strategy:{name:'finite-cross-colour-access-v1',missingWindow:2,maximumTargetsPerBody:4,parkingBodiesMaximum:2,parkingTargetsPerBody:2,maxParkingDrags:48,queuePolicy:'fill-first-diverse'}};
 payload.targetDifficulty=c.targetDifficulty;payload.upperBudget=c.upperBudget??{};
 const {makeReverseStockRecipe}=await import('./reverse-fixed-stock-factory.mjs'),recipe=makeReverseStockRecipe(runtime,source,payload,{qualificationOnly});await r.map(recipe.assetBindings);
 let failedParent=null;if(c.failedParent){failedParent=await readDirectHistoryRole(h,{...c.failedParent,role:'failed-parent',readBytes:p=>r.bytes(p)});assert.equal(failedParent.receipt.level.id,c.sourceLevelId);assert.equal(compileCanonicalHistoryPath(h.bundle.scope).canonical(c.failedParent.namespace),h.bundle.publicNamespace);}
 else assert(qualificationOnly,'Production fixed recipe requires its explicit latest failed parent');
 await r.finish();return{r,c,h,comparison,environment,observation,source,reference,referenceLevel:ref?.level??null,recipe,failedParent};
}

/** Metadata/bytes only. No full candidate, model, owner or mathematical claim. */
function prepared(x,contextDescriptor,qualificationOnly){return freeze({version:VERSION,contextDescriptor:copy(contextDescriptor),qualificationOnly,experimentId:x.c.experimentId,recipe:x.recipe,environment:x.environment,historyHeadSha256:x.h.headSha256,
 comparisonEvidence:x.comparison?.comparisonEvidence??null,failedParent:copy(x.c.failedParent??null),declaration:copy(x.c.declaration),bindings:copy(x.r.bindings),lowerBudget:copy(LOWER_BUDGET),maximumCompletePhysicalInputs:1,
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
 assert.deepEqual(lower.budget,LOWER_BUDGET);assert.equal(lower.sourceLevelSha256,levelHash);assert.equal(lower.floor,target===2?21:31);assert.deepEqual(inspectSearchAccounting(lower,'reverse-original-lower'),[]);assert.deepEqual(lower.guardAllowance,guardAllowanceFor(lower));assert(lower.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
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
 return levelSha256({version:'fixed-reverse-physical-recipe-once-v1',sourceLevelId:recipe.sourceLevelId,sourceMaskSha256:recipe.sourceMaskSha256,
  inventory:recipe.inventory.map(({color,shape})=>({color,shape})),gates:recipe.board.gates.map(({id,...g})=>g),insertionOrder:order(recipe.insertionOrder),parkingOrder:order(recipe.parkingBodyIds),strategy:recipe.strategy,qualificationFixture:recipe.qualificationFixture});
}

/** One recipe; first full world pauses before any model on that full portal.
 * All generated worlds are written by this owner synchronously before model
 * use. Internal model snapshots are separately prepaid, not catalogue inputs.
 * No public caller supplies builders, history decisions, clocks or U receipts. */
export async function runReverseStockTask(runtime,planDescriptor,outputDirectory,{qualificationOnly=false,planReview=null}={}){
 const initial=reader(),plan=await initial.bound(planDescriptor);assert.equal(plan.version,VERSION);assert.equal(plan.qualificationOnly,qualificationOnly);
 const x=await context(runtime,plan.contextDescriptor,qualificationOnly),expected=prepared(x,plan.contextDescriptor,qualificationOnly);assert.deepEqual(plan,expected,'Immutable recipe/plan changed');
 if(!qualificationOnly){const q=await initial.bound(planReview);assert.equal(q.status,'INDEPENDENT_REVERSE_FIXED_STOCK_PLAN_PASS');assert.deepEqual(q.errors,[]);assert.deepEqual(q.plan,planDescriptor);assert.equal(q.newSearches,0);assert.equal(q.newConstructions,0);await initial.map(q.toolBindings);}
 const canonical=compileCanonicalHistoryPath(x.h.bundle.scope).canonical;
 const publicRoot=x.h.bundle.scope.roots.find(r=>canonical(r.physicalPath)===x.h.bundle.publicNamespace),constructorRoot=x.h.bundle.scope.roots.find(r=>r.id===x.c.constructorRootId);assert(publicRoot&&constructorRoot&&publicRoot!==constructorRoot);
 if(!qualificationOnly){assert.equal(await realPathWithSuffix(publicRoot.physicalPath),await realPathWithSuffix(PUBLIC_LEDGER));assert.equal(await realPathWithSuffix(constructorRoot.physicalPath),await realPathWithSuffix(LATE_PREFIX_CONSTRUCTION_LEDGER));}
 const recipeIdentity=reverseRecipeExecutionIdentity(plan.recipe),recipeFile=path.join(constructorRoot.physicalPath,'reverse-recipe-'+recipeIdentity+'.execution.json');
 assert(!await exists(recipeFile),'FIXED_RECIPE_ALREADY_STARTED: no relabel, reband, budget change or continuation');
 assert(!await exists(outputDirectory),'Fresh owner output required');const startObservation=observeExecutionPolicy(plan.environment);await fs.mkdir(outputDirectory,{recursive:true});
 const constructionFiles=[],mathFiles=[],allowed=[],formedFiles=[];let claim=null,attempt=null,pending=null,result;
 const experimentFile=path.join(constructorRoot.physicalPath,'experiment-'+levelSha256({experimentId:plan.experimentId})+'.execution.json');await fs.mkdir(constructorRoot.physicalPath,{recursive:true});
 await outputFile(recipeFile,{version:'fixed-reverse-physical-recipe-once-v1',recipeIdentity,plan:planDescriptor,experimentId:plan.experimentId,maximumInputs:1,restartAllowed:false},constructionFiles);allowed.push(trackedFile(constructorRoot,recipeFile));
 await outputFile(experimentFile,{experimentId:plan.experimentId,plan:planDescriptor,maximumInputs:1,restartAllowed:false},constructionFiles);allowed.push(trackedFile(constructorRoot,experimentFile));
 claim=await claimNativeBatchPlan(planDescriptor,outputDirectory,{qualificationOnly,ledgerDirectory:constructorRoot.physicalPath});constructionFiles.push(await fd(claim.claimFile));allowed.push(trackedFile(constructorRoot,claim.claimFile));
 const report={version:VERSION,qualificationOnly,experimentId:plan.experimentId,sourceLevelId:plan.recipe.sourceLevelId,targetDifficulty:plan.recipe.targetDifficulty,plan:planDescriptor,accepted:false,formalReady:false,catalogEligible:false,status:'REVERSE_TASK_PENDING',level:null,levelSha256:null,L:null,U:null,proof:null,route:null,attempt:null,upperConstruction:null,lowerBound:null,executionPolicyObservation:startObservation,historyHeadSha256:x.h.headSha256,comparisonEvidence:x.comparison?.comparisonEvidence??null,bindings:plan.bindings,errors:[]};
 const members=async()=>assertPlanHistoryMembers(x.h,await listing(x.c.historyScope),allowed);
 const factory=await import('./reverse-fixed-stock-factory.mjs');
 try{
  // Existing ledger initialization may migrate aliases. Unknown additions are
  // rejected by the complete member check before the first world; no silent
  // allowance is minted for a migration or another producer.
  const ledger=await createAttemptLedger(publicRoot.physicalPath);await members();await x.r.finish();await initial.finish();
  let privateClockOffset=0;
  const authority=Object.freeze({}),auth={runtime,recipe:expected.recipe,state:x.h,comparisonView:x.comparison?.comparisonView,source:x.source,reference:x.reference,referenceLevel:x.referenceLevel,failedParent:x.c.failedParent?{namespace:x.c.failedParent.namespace,attemptId:x.c.failedParent.attemptId}:null,now:()=>Date.now()+privateClockOffset,used:false,
   persistFormedWorld(level,info){const file=path.join(outputDirectory,'world-'+String(formedFiles.length).padStart(5,'0')+'.json');const bytes=JSON.stringify({level,levelSha256:info.levelSha256,sourceLevelId:plan.recipe.sourceLevelId,reference:x.reference,recipeSha256:plan.recipe.recipeSha256,creation:info},null,2)+'\n';sync.writeFileSync(file,bytes,{flag:'wx'});const d={path:file,sha256:sha(bytes)};formedFiles.push(d);constructionFiles.push(d);}};
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
  const stage=nativeOriginalLowerStage(upper.U,plan.recipe.targetDifficulty,()=>guardedPlainTask(report.level,runtime,{floor:plan.recipe.floor,searchUpper:null,...LOWER_BUDGET}));
  if(stage.lower===null){report.status=stage.status;return report;}const lower=stage.lower;assertReverseLowerReceipt(lower,report.levelSha256,plan.recipe.targetDifficulty);report.proof=lower;report.lowerBound={method:'v3-plain',inputLevelSha256:report.levelSha256,result:lower};
  if(!lower.thresholdProven){report.status='UNKNOWN_OR_SHORTCUT_ORIGINAL_LOWER_TERMINAL';return report;}
  report.accepted=true;report.L=plan.recipe.floor;report.difficulty=plan.recipe.targetDifficulty;report.mathematicalEvidenceValidated=true;report.status='REVERSE_FIXED_STOCK_ORIGINAL_LU_VERIFIED';return report;
 }catch(e){if(pending?.pending&&!report.upperConstruction){try{report.construction=factory.abandonReverseStockConstruction(pending.token,e.message).report;}catch{}}
  report.accepted=false;report.status='REVERSE_FIXED_STOCK_TERMINAL';report.errors.push(e.message);return report;
 }finally{
  try{await members();await x.r.finish();await initial.finish();}catch(e){report.accepted=false;report.status='REVERSE_BINDING_OR_MEMBERSHIP_TERMINAL';report.errors.push(e.message);}
  report.redesignRequired=!report.accepted;report.mathematicalEvidenceValidated=report.accepted===true;report.formedWorlds=formedFiles;
  if(attempt){const ledger=await createAttemptLedger(publicRoot.physicalPath),sidecar=path.join(publicRoot.physicalPath,attempt.id+'.v4-reverse-fixed-stock-result.json');await outputFile(sidecar,report,mathFiles);allowed.push(trackedFile(publicRoot,sidecar));await ledger.finish(attempt,report);
   const endings=[path.join(publicRoot.physicalPath,attempt.id+'.result.json'),...(!report.accepted?[path.join(publicRoot.physicalPath,attempt.identityOrigin+'.blocked.json'),path.join(publicRoot.physicalPath,'identities',attempt.retryIdentitySha256+'.blocked.json')]:[])];for(const f of endings){mathFiles.push(await fd(f));allowed.push(trackedFile(publicRoot,f));}}
  const receipt=await outputFile(path.join(outputDirectory,'candidate.json'),report,mathFiles);
  const terminal={status:'REVERSE_FIXED_STOCK_CONSTRUCTION_CLOSED',experimentId:plan.experimentId,closed:true,restartAllowed:false,consumedInputs:Number(!!report.construction?.firstComplete),maximumInputs:1,completePhysicalInputs:report.construction?.completePhysicalInputs??0,formedWorldFiles:formedFiles,receipt,accepted:false,mathematicalAcceptance:false};
  if(claim){await finishLatePrefixPlan(claim,terminal);constructionFiles.push(await fd(claim.resultFile));allowed.push(trackedFile(constructorRoot,claim.resultFile));}
  const index=await outputFile(path.join(outputDirectory,'construction-index.json'),terminal,constructionFiles),closure={id:plan.experimentId,descriptor:await fd(claim.resultFile),raw:JSON.parse(await fs.readFile(claim.resultFile)),closed:true,restartAllowed:false,consumedInputs:terminal.consumedInputs,maximumInputs:1};
  report.constructionOwner=await owner(path.join(outputDirectory,'construction.owner.definition.json'),{id:plan.experimentId,namespace:canonical(constructorRoot.physicalPath),kind:'construction',parentPlan:planDescriptor,experimentId:plan.experimentId,attemptIds:[],closedCampaigns:[closure]},constructionFiles);
  report.mathOwner=await owner(path.join(outputDirectory,'math.owner.definition.json'),{id:plan.experimentId+'-math',namespace:x.h.bundle.publicNamespace,kind:'mathematical',parentPlan:planDescriptor,experimentId:plan.experimentId,attemptIds:attempt?[attempt.id]:[],closedCampaigns:[]},mathFiles);
  // Completion is a small external index of two complete, immutable owner
  // manifests. It has no new worlds or ledger facts and is separately pinned
  // by the actual reviewer/exporter; nesting it into itself would be circular.
  await members();await write(path.join(outputDirectory,'completion.json'),{version:VERSION,status:'REVERSE_FIXED_STOCK_TASK_CLOSED',externalOwnerIndexOnly:true,plan:planDescriptor,receipt,index,constructionOwner:report.constructionOwner,mathOwner:report.mathOwner,publicClaimsStarted:Number(!!attempt),accepted:Number(report.accepted),formedWorlds:formedFiles.length,maximumInputs:1,closed:true,allFailuresTerminal:true,oldLiveByteIntegrityClaimed:false});
 }
}

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {intensify,mechanismInventory,INTENSITY_VERSION} from '../formal-v3/mechanism-intensity.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {loadV4CatalogRuntime,auditV4Diversity,V4_DIVERSITY_POLICY} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {readLowTwenty153Admission,LOW_TWENTY_153_INPUTS} from './prepare-low-twenty-153.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,mapHistoricalBindingsTask,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {qualifyBoundedCandidateV4,PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {inspectHistoricalAttempt} from './capacity-construction-ledger.mjs';
import {withStaticMechanismConstructionAttempt,CONSTRUCTION_LEDGER,assertStaticStarDelta,staticStarReplayReservations} from './static-mechanism-attempt-guard.mjs';

export const SELF='tools/daily-challenge/formal-v4/star-reserve-task.mjs';
export const STAR_RESERVE_TASK_VERSION='exact-regional-reserve195-star-task-once-v1';
const ROOT='deliverables/daily-formal-v4-20261008';
const hash=b=>createHash('sha256').update(b).digest('hex');
const IMPORT_SHA=hash(await fs.readFile(SELF));
export const STAR_RESERVE_INPUTS=Object.freeze({
 base:{path:'deliverables/daily-formal-v3-20261008/design/nearband18-shared/candidate-0057.json',sha256:'7948ea57d3fd3390e98afae16b8b98a41caa4af93efd8e80bc21c36cd62a4a5e'},
 lineage:{path:ROOT+'/proof/unused-donors-five-195-resolution-01.json',sha256:'a2ca251d808b8160f1df618c906a235473163ef35331247b94d4710336f7af7a'},
 selection:LOW_TWENTY_153_INPUTS.selection,selectionReview:LOW_TWENTY_153_INPUTS.review,
 prior:{path:'deliverables/daily-formal-v2-20261007/final-qualified/daily-mechanisms-star-100-d1-06.json',sha256:'4a017849620b1e14ac7405cd9615f5613c11bd26a5b2eb090c8cbc27b273e2da'},
});
export const STAR_SLOT=Object.freeze({formalId:'daily-mechanisms-star-100-d1-06',stageKey:'mechanisms-star-100',unlockLevel:100,newestMechanism:'star',difficulty:1,slot:6});
export const EXPECTED_STARS=Object.freeze([{id:'r108-195-s0',color:'pink',gateId:'g-pink',exitDrag:21},{id:'r108-195-s11',color:'yellow',gateId:'g-yellow',exitDrag:26}]);
export const STAR_LOWER_BUDGET=Object.freeze({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact descriptor required');
function merge(target,source){for(const [p,h]of Object.entries(source)){if(target[p])assert.equal(target[p],h,'Binding conflict '+p);target[p]=h;}}
async function read(d,bindings={}){descriptor(d);const bytes=await fs.readFile(d.path);assert.equal(hash(bytes),d.sha256,'Input changed '+d.path);merge(bindings,{[d.path]:d.sha256});return JSON.parse(bytes);}
async function liveRead(p,bindings){const bytes=await fs.readFile(p),d={path:p,sha256:hash(bytes)};merge(bindings,{[p]:d.sha256});return {descriptor:d,value:JSON.parse(bytes)};}
async function check(bindings){const seen=new Map();for(const [p,h]of Object.entries(bindings)){const abs=path.resolve(p);if(seen.has(abs))assert.equal(seen.get(abs),h);else{assert.equal(hash(await fs.readFile(abs)),h,'Dependency changed '+p);seen.set(abs,h);}}}
const fullInventory=i=>Object.values(i).reduce((n,x)=>n+x.length,0);

export function assertStarReservePlan(p){
 assert.equal(p.version,STAR_RESERVE_TASK_VERSION);assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);
 assert.deepEqual(p.inputs,STAR_RESERVE_INPUTS);assert.deepEqual(p.slot,STAR_SLOT);assert.deepEqual(p.expectedStars,EXPECTED_STARS);
 assert.equal(p.sourceLevelId,195);assert.equal(p.expectedU,16);assert.equal(p.requiredFloor,16);assert.equal(p.maximumUpper,20);
 assert.deepEqual(p.construction,{variant:0,maxAttempts:1,instances:2,maxStates:10000});assert.deepEqual(p.lowerBudget,STAR_LOWER_BUDGET);
 assert.equal(p.oneBaseOneStage,true);assert.equal(p.fallbackAllowed,false);assert.equal(p.originalPlainSearchAllowed,false);
 assert.equal(p.lineageClassification,'explicitly-reviewed-regional-retile-reserve-not-whole-board');
 assert.equal(p.formalReady,false);assert.equal(p.productionChanged,false);assert.equal(p.bindings[SELF],IMPORT_SHA);
 return true;
}

// The sole lineage exception is the documented, previously unselected source195
// reserve. It does not generalize the old UNKNOWN ancestry or revive its failed
// ancestors, and does not reopen the previous zero-mount generator rejection.
export function assertReserveEvidence(base,request,result,lineage){
 assert(base.accepted===true&&base.difficulty===1&&base.L===16&&base.U===16);
 assert.equal(base.sourceLevelId,195);assert.equal(base.levelSha256,levelSha256(base.level));
 assert.equal(base.levelSha256,'c67dd152d8c0a344aed8f0094955fe48bbe88277f9b0613754e06c7d5b693867');
 assert.equal(routeSha256(base.drags),'25b85260da075cd2c81aaf75b5d09c74dd788866a896a93b4c83d949ccb44c13');
 assert.deepEqual(request,base.attempt);assert.equal(result.accepted,true);assert.equal(result.status,base.status);assert.equal(result.levelSha256,base.levelSha256);
 assert.deepEqual(result.lower,base.proof);assert.deepEqual(result.upper,base.proof);assert.equal(base.proof.thresholdProven,true);assert.equal(base.proof.cost,16);
 assert.equal(base.proof.status,'threshold-proven');assert(base.proof.rawFullBoardStates<=10000);
 const r=lineage.source195;assert.equal(lineage.status,'READONLY_TWO_DONOR_RESOLUTION');assert.deepEqual(r.candidate,STAR_RESERVE_INPUTS.base);
 assert.equal(r.reserveRole,'UNSELECTED_PRESERVED_RESERVE');assert.equal(r.physicalChangesAtEveryDailyFailureEdgeVerified,true);
 assert.deepEqual(r.oldReuseScreen.issues,['ancestry-needs-explicit-review']);assert.deepEqual(r.oldReuseScreen.visualSkeletonMatches,[]);assert.deepEqual(r.oldReuseScreen.liveFamilyOverlaps,[]);
 assert.equal(r.dailyAttemptChain[0].id,request.id);assert.equal(r.dailyAttemptChain[0].accepted,true);
 assert.equal(fullInventory(mechanismInventory(base.level)),0,'Only the accepted plain object is the donor');return true;
}

function designChecks(runtime,base,selected,old,level=base.level){
 const source=runtime.LEVELS.find(x=>x.id===base.sourceLevelId);assert(source);
 assert.equal(boardBaselineSha256(level),boardBaselineSha256(source),'Normal source mask required');
 const sourceComparison=compareLayouts(level,source);assert(sourceComparison.footprintSimilarity<=.55+1e-12);
 const nearestOld=old.map(q=>({formalId:q.formalId,similarity:compareLayouts(level,q.level).footprintSimilarity})).sort((a,b)=>b.similarity-a.similarity)[0];
 assert(nearestOld.similarity<=.75+1e-12,'Old450 near gate');
 const comparisons=selected.map(q=>({formalId:q.formalId,sourceLevelId:q.sourceLevelId,similarity:compareLayouts(level,q.level).footprintSimilarity}));
 assert(comparisons.every(q=>q.similarity<=.65+1e-12),'Conservative all-selected .65 gate');
 const candidate={...STAR_SLOT,sourceLevelId:195,level};
 const diversity=auditV4Diversity([...selected,candidate],runtime.slots,{expectFull:false});assert.deepEqual(diversity.reasons,[]);
 return{passed:true,policy:V4_DIVERSITY_POLICY,sourceComparison,nearestOld,selectedComparisons:comparisons,diversity,
  lineageClassification:'explicitly-reviewed-regional-retile-reserve-not-whole-board',oneFamilyRepresentative:true};
}

async function readiness(runtime){
 const environment=prefixExecutionEnvironment(runtime),bindings={};
 merge(bindings,runtime.toolchainBindings);merge(bindings,runtime.designBindings);merge(bindings,environment.bindings);
 const base=await read(STAR_RESERVE_INPUTS.base,bindings),lineage=await read(STAR_RESERVE_INPUTS.lineage,bindings);
 const mapped=mapHistoricalBindingsTask(lineage.fileBindings,environment);merge(bindings,mapped.bindings);
 const request=await liveRead(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.request.json`,bindings),result=await liveRead(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.result.json`,bindings);
 assertReserveEvidence(base,request.value,result.value,lineage);assert.equal(base.proofToolchainSha256,runtime.toolchainSha256);
 assert.deepEqual(runtime.slots.find(s=>s.formalId===STAR_SLOT.formalId),STAR_SLOT);
 const sourceBinding=await currentMainlineSourceBinding(runtime,environment,195,{qualificationOnly:false});merge(bindings,sourceBinding.bindings);
 assert.equal(levelSha256(runtime.LEVELS.find(s=>s.id===195)),base.sourceLevelSha256);
 const admission=await readLowTwenty153Admission(STAR_RESERVE_INPUTS.selection,STAR_RESERVE_INPUTS.selectionReview);
 merge(bindings,mapHistoricalBindingsTask(admission.bindings,environment).bindings);
 assert(!admission.records.some(r=>r.formalId===STAR_SLOT.formalId),'Fixed target slot already occupied');
 const historical=await inspectHistoricalAttempt(base.level,PUBLIC_ATTEMPT_LEDGER);assert(!historical.blocked&&historical.acceptedHistoricalMathematics,'Public base failed or pending');
 const old=[];assert.equal(runtime.priorDailySlots.size,450);
 for(const p of runtime.priorDailySlots.values()){const q=await read({path:p.sourceReport,sha256:p.sourceReportSha256},bindings);assert.equal(levelSha256(q.level),p.levelSha256);old.push(q);}
 const prior=await read(STAR_RESERVE_INPUTS.prior,bindings),baseline=runtime.priorDailySlots.get(STAR_SLOT.formalId);
 assert.deepEqual({path:baseline.sourceReport,sha256:baseline.sourceReportSha256},STAR_RESERVE_INPUTS.prior);assert.equal(levelSha256(prior.level),baseline.levelSha256);
 assert.deepEqual(mechanismInventory(prior.level),baseline.inventory);assert.equal(baseline.inventory.star.length,1);assert.equal(fullInventory(baseline.inventory),1);
 const design=designChecks(runtime,base,admission.records,old);
 return{environment,bindings,base,prior,selected:admission.records,old,design,sourceBinding,request:request.descriptor,result:result.descriptor,historicalBindingResolutions:mapped.resolutions};
}

/** Metadata only. No new level, model, solver or ledger claim is created. */
export async function makeStarReserveTaskPlan(runtime){
 assert.equal(hash(await fs.readFile(SELF)),IMPORT_SHA);const r=await readiness(runtime),bindings=r.bindings;
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))merge(bindings,{[p.replaceAll('\\','/')]:hash(await fs.readFile(p))});
 const plan={schemaVersion:4,scope:300,version:STAR_RESERVE_TASK_VERSION,inputs:STAR_RESERVE_INPUTS,slot:STAR_SLOT,sourceLevelId:195,
  expectedStars:EXPECTED_STARS,expectedU:16,requiredFloor:16,maximumUpper:20,construction:{variant:0,maxAttempts:1,instances:2,maxStates:10000},lowerBudget:STAR_LOWER_BUDGET,
  oneBaseOneStage:true,fallbackAllowed:false,originalPlainSearchAllowed:false,lineageClassification:'explicitly-reviewed-regional-retile-reserve-not-whole-board',
  environment:r.environment,policyReviewedAtPreparation:r.environment.policyReviewedAtPreparation,historicalDesignPolicy:r.environment.historicalDesignPolicy,
  mathematicalContract:r.environment.mathematicalContract,proofToolchainSha256:runtime.toolchainSha256,currentRuntimeValidationClaimed:false,
  baseLevelSha256:r.base.levelSha256,baseRouteSha256:routeSha256(r.base.drags),basePublicRequest:r.request,basePublicResult:r.result,
  sourceBinding:r.sourceBinding,preconstructionDesign:r.design,historicalBindingResolutions:r.historicalBindingResolutions,
  finalWitnessAccounting:'Both provided final witness replays and static model creations are conservatively reserved in the single construction meter; final fresh L has its separate original-object 9999+1 bound.',
  bindings,newConstructions:0,newSearches:0,newLedgerClaims:0,formalReady:false,productionChanged:false};
 assertStarReservePlan(plan);await check(bindings);return plan;
}

export function assertExpectedStars(level,events,expected){
 const actual=level.blocks.filter(b=>b.star).map(b=>{const e=events.filter(x=>x.blockId===b.id);assert.equal(e.length,1);assert.equal(e[0].gateStar,true);assert.equal(e[0].gateColor,b.color);return{id:b.id,color:b.color,gateId:e[0].gateId,exitDrag:e[0].drag};});
 assert.deepEqual(actual,expected,'Exact chosen stars and actual matching star gate exits');return actual;
}

/** Single deterministic application of the already qualified intensify star
 * branch. Fixed route only: zero held searches and zero full-board searches. */
export async function constructKnownStarPair(runtime,base,priorLevel,budget,expected=EXPECTED_STARS){
 const before=levelSha256(base.level),routeHash=routeSha256(base.drags),replayWorlds=staticStarReplayReservations(base.drags)/2;
 // Reserve before intensify: one input analysis + one final replay + formed
 // output + static model. Additional static inspections are conservatively
 // over-reserved (16). Final qualifier's two provided-U replays are prepaid.
 budget.reserve(4*replayWorlds+16,'intensify-two-replays-and-final-proof-two-replays-plus-static-worlds');
 const adapted=await intensify(base.level,base.drags,'star',{runtime,difficulty:1,variant:0,maxAttempts:1,targets:{instances:2},formalId:STAR_SLOT.formalId,sourceLevelId:base.sourceLevelId,priorLevel});
 if(!adapted.ok)return{...adapted,constructionAccounting:budget.report()};
 assert.deepEqual(adapted.drags,base.drags);assert.equal(adapted.provenance.attemptsUsed,1);assert.equal(adapted.provenance.maxAttempts,1);
 assert.equal(adapted.searchAccounting.fullBoardSolverInvocations,0);assert.deepEqual(adapted.searchAccounting.localHeldReachability,[]);
 assertStaticStarDelta(base.level,adapted.level,adapted.drags);assert(adapted.participation.pass);assert(adapted.priorComparison.instanceIncrease>0);
 assert.equal(fullInventory(mechanismInventory(adapted.level)),2);assert(fullInventory(mechanismInventory(priorLevel))<2);
 budget.reserve(replayWorlds,'actual-star-gate-known-route');const model=new runtime.PuzzleModel(adapted.level);model.startCountdown();const events=[];
 for(const [i,d]of adapted.drags.entries()){const original=model.tryExit;model.tryExit=function(id,side){const s=this.snapshot(),out=original.call(this,id,side);if(out.ok){const gate=s.gates.find(g=>g.id===out.gateId);assert(gate);events.push({drag:i+1,blockId:id,gateId:out.gateId,gateColor:gate.color,gateStar:gate.star===true});}return out;};try{applyNativeDrag(model,d);}finally{model.tryExit=original;}}
 const end=model.snapshot();assert(end.complete&&!end.failed&&!end.blocks.length&&!end.queuedBlocks.length);
 const stars=assertExpectedStars(adapted.level,events,expected);assert.equal(before,levelSha256(base.level));assert.equal(routeHash,routeSha256(base.drags));
 return{...adapted,...STAR_SLOT,audit:{passed:true,issues:[],participation:adapted.participation,actualStarExits:stars,fullInventoryCleared:true,
  fixedKnownRoute:true,originalU:adapted.replay.nonClearingDrags,noNewUpperSearch:true},primaryInstances:stars,
  constructionAccounting:budget.report(),provenance:{...adapted.provenance,outputLevelSha256:levelSha256(adapted.level),outputRouteSha256:routeHash},
  qualificationOnly:base.qualificationOnly===true,formalReady:false};
}

export function assertStarFinalMath(math,level,drags){
 assert.equal(math.levelSha256,levelSha256(level));assert.equal(math.routeSha256,routeSha256(drags));assert.deepEqual(math.level,level);assert.deepEqual(math.drags,drags);
 assert.equal(math.route.search,null,'No new upper search is allowed');assert.equal(math.route.witnessValidation.providedRoute,true);
 for(const r of [math.route.canonicalReplay,math.route.independentReplay])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===16);
 assert.equal(math.route.independentReplay.remainingBodies,0);assert.equal(math.route.independentReplay.remainingQueued,0);
 if(math.accepted){assert.equal(math.L,16);assert.equal(math.U,16);assert.equal(math.lowerBound.inputLevelSha256,levelSha256(level));
  const l=math.lowerBound.result;assert.equal(l.thresholdProven,true);assert.equal(l.floor,16);assert.equal(l.termination,'below-threshold-exhausted');assert(l.guardAllowance.conservativeFullBoardStateUpperBound<=10000);}
 return true;
}

/** Production-only one-shot entry. Private tests exercise the exact same
 * constructor and mathematical qualifier in their explicit private ledgers. */
export async function qualifyStarReserveTask(runtime,planDescriptor,reviewDescriptor){
 const plan=await read(planDescriptor);assertStarReservePlan(plan);const review=await read(reviewDescriptor);
 assert.equal(review.status,'INDEPENDENT_STAR_RESERVE_TASK_PLAN_PASS');assert.deepEqual(review.plan,planDescriptor);assert.deepEqual(review.errors,[]);
 assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);assert.equal(review.fileBindings[SELF],IMPORT_SHA);
 await check(plan.bindings);await check(review.fileBindings);
 const ready=await readiness(runtime);assert.deepEqual(ready.environment,plan.environment);assert.equal(ready.base.levelSha256,plan.baseLevelSha256);assert.equal(routeSha256(ready.base.drags),plan.baseRouteSha256);
 const bindings={...plan.bindings};merge(bindings,ready.bindings);merge(bindings,{[planDescriptor.path]:planDescriptor.sha256,[reviewDescriptor.path]:reviewDescriptor.sha256});
 const report={schemaVersion:4,scope:300,version:STAR_RESERVE_TASK_VERSION,...STAR_SLOT,sourceLevelId:195,baseReceipt:{...STAR_RESERVE_INPUTS.base,request:ready.request,result:ready.result},
  baseLevelSha256:plan.baseLevelSha256,baseRouteSha256:plan.baseRouteSha256,priorBaseline:STAR_RESERVE_INPUTS.prior,lineageReview:STAR_RESERVE_INPUTS.lineage,
  fixedPlan:planDescriptor,planReview:reviewDescriptor,inputSelection:STAR_RESERVE_INPUTS.selection,selectionReview:STAR_RESERVE_INPUTS.selectionReview,
  environment:plan.environment,policyReviewedAtPreparation:plan.policyReviewedAtPreparation,historicalDesignPolicy:plan.historicalDesignPolicy,mathematicalContract:plan.mathematicalContract,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,designBindings:bindings,designToolchainSha256:levelSha256(bindings),
  accepted:false,L:null,U:null,status:'STAR_RESERVE_TASK_PENDING',qualificationOnly:false,catalogEligible:false,formalReady:false,productionChanged:false,currentRuntimeValidationClaimed:false,
  pointerValidated:false,timeValidated:false,mathematicalEvidenceValidated:false,mechanismStrengthValidated:false,designValidated:false,terminalBlocked:false,reasons:[]};
 try{
  report.constructionExecutionPolicyObservation=observeExecutionPolicy(plan.environment);
  const c=await withStaticMechanismConstructionAttempt(runtime,ready.base,STAR_SLOT,(base,meter)=>constructKnownStarPair(runtime,base,ready.prior.level,meter),{worldBudget:{maxStates:10000}});
  report.construction=c;report.constructionAttemptStarted=c.constructionAttemptStarted===true;
  if(c.resultFile)report.constructionSidecar=(await liveRead(c.resultFile,bindings)).descriptor;
  if(c.planFile)report.constructionPlan={...(await liveRead(c.planFile,bindings)).descriptor,canonicalSha256:c.planSha256};
  if(!c.ok){report.status='REJECTED_STAR_CONSTRUCTION';report.terminalBlocked=c.terminalBlocked;return report;}
  Object.assign(report,{level:c.level,drags:c.drags,levelSha256:levelSha256(c.level),routeSha256:routeSha256(c.drags),constructionAccounting:c.constructionAccounting});
  assert.equal(c.U,16);assert.deepEqual(c.drags,ready.base.drags);assertStaticStarDelta(ready.base.level,c.level,c.drags);
  report.strength={version:INTENSITY_VERSION,kind:'fixed-two-active-stars',mechanism:'star',passed:true,targets:c.targets,participation:c.audit.participation,actualStarExits:c.audit.actualStarExits,
   priorComparison:c.adaptation.priorComparison,designChoiceNotUserUniformQuota:true};report.mechanismStrengthValidated=true;
  const candidate={...STAR_SLOT,sourceLevelId:195,level:c.level,drags:c.drags,levelSha256:report.levelSha256,routeSha256:report.routeSha256};
  report.staticAudit=await auditV4StaticCandidate(runtime,candidate);assert(report.staticAudit.passed,report.staticAudit.issues.join(';'));
  report.assetBindings=Object.fromEntries(Object.entries(report.staticAudit.assetBindings).map(([p,h])=>['public/'+p,h]));merge(bindings,report.assetBindings);
  report.design=designChecks(runtime,ready.base,ready.selected,ready.old,c.level);report.designValidated=true;
  await check(bindings);report.executionPolicyObservation=observeExecutionPolicy(plan.environment);
  report.finalProofPlan={lowerBudget:STAR_LOWER_BUDGET,routeBudget:STAR_LOWER_BUDGET,providedCompleteRoute:true,maximumOriginalLowerWorlds:10000,
   mechanismBaseReceipt:STAR_RESERVE_INPUTS.base,newUpperSearchAllowed:false,originalPlainRevalidation:false};
  report.finalProofStarted=true;
  const math=await qualifyBoundedCandidateV4(runtime,candidate,{lowerBudget:STAR_LOWER_BUDGET,routeBudget:STAR_LOWER_BUDGET,mechanismBaseReceipt:STAR_RESERVE_INPUTS.base});
  report.mathematicalProof=math;for(const k of ['attempt','attemptPlan','attemptPlanSha256','lowerBound','route','L','U'])if(math[k]!==undefined)report[k]=math[k];
  if(math.route?.canonicalReplay)assertStarFinalMath(math,c.level,c.drags);
  if(!math.accepted){report.status='REJECTED_STAR_FRESH_ORIGINAL_PROOF';report.terminalBlocked=true;return report;}
  assertStarFinalMath(math,c.level,c.drags);report.accepted=true;report.mathematicalEvidenceValidated=true;report.status='STAR_RESERVE_TASK_CANDIDATE_VERIFIED_AWAITING_POINTER';return report;
 }catch(error){report.accepted=false;report.status='STAR_RESERVE_TASK_REJECTED';report.reasons.push(error.message);return report;}
 finally{
  try{await check(bindings);}catch(error){report.accepted=false;report.status='STAR_RESERVE_TASK_BINDING_CHANGED';report.reasons.push(error.message);}
  report.designToolchainSha256=levelSha256(bindings);report.catalogEligible=report.accepted;report.terminalBlocked=report.terminalBlocked||!!report.constructionAttemptStarted&&!report.accepted;
  if(!report.accepted)report.mathematicalEvidenceValidated=false;
  if(report.constructionAttemptStarted){report.entryResultFile=path.join(CONSTRUCTION_LEDGER,`${report.construction.constructionAttempt.id}.slot-result.json`);
   try{await fs.writeFile(report.entryResultFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}catch(error){report.accepted=false;report.catalogEligible=false;report.terminalBlocked=true;report.status='STAR_RESULT_NOT_PERSISTED';report.reasons.push(error.message);}}
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [mode,...args]=process.argv.slice(2);assert(['prepare','qualify'].includes(mode));const runtime=await loadV4CatalogRuntime();
 const output=args.at(-1);assert(output);await fs.mkdir(output,{recursive:false});
 const result=mode==='prepare'?await makeStarReserveTaskPlan(runtime):await qualifyStarReserveTask(runtime,{path:args[0],sha256:args[1]},{path:args[2],sha256:args[3]});
 const file=path.join(output,mode==='prepare'?'plan.json':'candidate.json');await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({path:file,sha256:hash(await fs.readFile(file)),status:result.status??'READONLY_STAR_PLAN_PREPARED',accepted:result.accepted??false}));
}

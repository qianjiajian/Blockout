import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {levelSha256,routeSha256,BANDS} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {intensify,mechanismInventory,INTENSITY_VERSION} from '../formal-v3/mechanism-intensity.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {readLowTwenty153Admission,LOW_TWENTY_153_INPUTS} from './prepare-low-twenty-153.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,mapHistoricalBindingsTask,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {qualifyBoundedCandidateV4,PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {inspectHistoricalAttempt} from './capacity-construction-ledger.mjs';
import {withStaticMechanismConstructionAttempt,CONSTRUCTION_LEDGER,assertStaticStarDelta,staticStarReplayReservations} from './static-mechanism-attempt-guard-batch.mjs';
import {STAR_LOWER_BUDGET,assertExpectedStars} from './star-reserve-task.mjs';

export const SELF='tools/daily-challenge/formal-v4/star-donor-batch-task.mjs';
export const VERSION='finite-reviewed-accepted-donors-star-task-v1';
export const DONOR_REVIEW={path:'deliverables/daily-formal-v4-20261008/proof/unused-quotient-six-route-planning-01.json',sha256:'2fdf4cc76f6854432a9c36893047ca25d87cc8dee3bf3dcd5d60a07912023a13'};
const hash=b=>createHash('sha256').update(b).digest('hex'),IMPORT_SHA=hash(await fs.readFile(SELF));
const total=i=>Object.values(i).reduce((n,x)=>n+x.length,0);
function merge(a,b){for(const[p,h]of Object.entries(b)){if(a[p])assert.equal(a[p],h,'Binding conflict '+p);a[p]=h;}}
const desc=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact descriptor required');
async function bound(d,bindings={}){desc(d);const b=await fs.readFile(d.path);assert.equal(hash(b),d.sha256,'Input changed '+d.path);merge(bindings,{[d.path]:d.sha256});return JSON.parse(b);}
async function readFile(p,bindings={}){const b=await fs.readFile(p),d={path:p,sha256:hash(b)};merge(bindings,{[p]:d.sha256});return{descriptor:d,value:JSON.parse(b)};}
async function check(bindings){const seen=new Map();for(const[p,h]of Object.entries(bindings)){const a=path.resolve(p);if(seen.has(a))assert.equal(seen.get(a),h);else{assert.equal(hash(await fs.readFile(a)),h,'Dependency changed '+p);seen.set(a,h);}}}
const put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:hash(b)};};

/** Pure metadata equivalent of intensify's variant0 colour-map selection.
 * The last moving body of each colour wins, while first-colour order is kept. */
export function plannedStarInstances(base,difficulty){
 assert([1,2].includes(difficulty));const moving=base.level.blocks.filter(b=>base.drags.some(d=>d.blockId===b.id&&d.path.length));
 const chosen=[...new Map(moving.map(b=>[b.color,b])).values()].slice(0,difficulty+1);assert.equal(chosen.length,difficulty+1);
 assert.equal(new Set(base.level.gates.map(g=>g.color)).size,base.level.gates.length);
 return base.level.blocks.filter(b=>chosen.some(x=>x.id===b.id)).map(b=>{
  const gates=base.level.gates.filter(g=>g.color===b.color),exits=base.drags.flatMap((d,i)=>d.blockId===b.id&&d.exitSide?[i+1]:[]);
  assert.equal(gates.length,1);assert.equal(exits.length,1);return{id:b.id,color:b.color,gateId:gates[0].id,exitDrag:exits[0]};});
}
export function assertDonorEvidence(base,request,result,row){
 assert(base.accepted===true);assert.equal(base.sourceLevelId,row.sourceLevelId);assert.equal(levelSha256(base.level),row.levelSha256);assert.equal(base.levelSha256,row.levelSha256);
 assert.equal(routeSha256(base.drags),row.routeSha256);assert.deepEqual(request,base.attempt);assert.equal(result.accepted,true);assert.equal(result.levelSha256,row.levelSha256);assert.equal(result.status,base.status);
 assert.deepEqual(result.lower,base.proof);assert.deepEqual(result.upper,base.proof);assert.deepEqual(base.proof.drags,base.drags);
 assert.equal(base.U,row.historicalU);assert.equal(base.L,row.historicalL);assert.equal(row.currentRawCountCertified,false);
 assert.equal(base.proof.fullBoardStateDefinition,row.historicalStateDefinition);assert.equal(total(mechanismInventory(base.level)),0);
 assert.deepEqual(row.selected.exactPartitions,[]);assert.deepEqual(row.selected.exactInputReferences,[]);assert.deepEqual(row.selected.familyIssues,[]);
 assert(row.selected.familyRoots.directWholeBoard&&row.selected.familyRoots.unknownReasons.length===0);
 // This is the specifically reviewed historical zero-mount preflight boundary,
 // never a generic accepted:false exemption or permission to retry generator.
 assert(row.priorMechanismAdaptations.length>0);
 for(const a of row.priorMechanismAdaptations){assert.equal(a.mechanism,'generator');assert.equal(a.status,'REJECTED_MECHANISM_ADAPTATION');assert.equal(a.accepted,false);
  assert.equal(a.localHeldSearches,0);assert.equal(a.publicMathAttempt,null);assert.equal(a.reportedFinalLevel,false);assert(a.errors.length>0&&a.errors.every(e=>/^only [01] real disjoint generator mounts for [23]$/.test(e)));}
 return true;
}
export function assertStarDonorBatchPlan(p){
 assert.equal(p.version,VERSION);assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);assert.deepEqual(p.donorReview,DONOR_REVIEW);
 desc(p.selection);desc(p.selectionReview);assert(Number.isSafeInteger(p.selectedCount)&&p.selectedCount>=153);
 assert(Array.isArray(p.tasks)&&p.tasks.length>0&&p.tasks.length<=5);assert.equal(p.maximumTasks,p.tasks.length);
 assert.equal(new Set(p.tasks.map(t=>t.base.path)).size,p.tasks.length);assert.equal(new Set(p.tasks.map(t=>t.slot.formalId)).size,p.tasks.length);
 for(const [i,t]of p.tasks.entries()){
  assert.equal(t.index,i);desc(t.base);assert.equal(t.slot.newestMechanism,'star');assert([1,2].includes(t.slot.difficulty));assert.equal(t.sourceLevelId,t.historical.sourceLevelId);
  assert.deepEqual(t.base,t.historical.candidate);assert(!p.deferredSourceLevelIds.includes(t.sourceLevelId));
  assert.equal(t.expectedStars.length,t.slot.difficulty+1);assert.deepEqual(t.construction,{variant:0,maxAttempts:1,instances:t.slot.difficulty+1,maxStates:10000});
  assert.deepEqual(t.lowerBudget,STAR_LOWER_BUDGET);assert.equal(t.requiredFloor,BANDS[t.slot.difficulty].lower);assert.equal(t.maximumUpper,BANDS[t.slot.difficulty].upper);
  assert.equal(t.expectedU,t.historical.historicalU);assert(t.expectedU>=t.requiredFloor&&t.expectedU<=t.maximumUpper);assert.equal(t.historicalLowerReused,false);
 }
 assert.equal(p.oneBaseOneStage,true);assert.equal(p.fallbackAllowed,false);assert.equal(p.originalPlainSearchAllowed,false);assert.equal(p.formalReady,false);
 assert.equal(p.bindings[SELF],IMPORT_SHA);return true;
}

function inspectDesign(rt,base,slot,selected,old,level=base.level){
 const source=rt.LEVELS.find(s=>s.id===base.sourceLevelId);assert(source);assert.equal(boardBaselineSha256(level),boardBaselineSha256(source));
 const sourceComparison=compareLayouts(level,source);assert(sourceComparison.footprintSimilarity<=.55+1e-12,'Source near>.55');
 const nearestOld=old.map(q=>({formalId:q.formalId,similarity:compareLayouts(level,q.level).footprintSimilarity})).sort((a,b)=>b.similarity-a.similarity)[0];assert(nearestOld.similarity<=.75+1e-12);
 const selectedComparisons=selected.map(q=>({formalId:q.formalId,similarity:compareLayouts(level,q.level).footprintSimilarity}));assert(selectedComparisons.every(q=>q.similarity<=.65+1e-12),'Selected whole footprint>.65');
 const diversity=auditV4Diversity([...selected,{...slot,sourceLevelId:base.sourceLevelId,level}],rt.slots,{expectFull:false});assert.deepEqual(diversity.reasons,[]);
 return{passed:true,sourceComparison,nearestOld,selectedComparisons,diversity};
}
export function assertOriginalFinalMath(q,level,drags,expectedU,difficulty){
 assert.equal(q.levelSha256,levelSha256(level));assert.equal(q.routeSha256,routeSha256(drags));assert.deepEqual(q.level,level);assert.deepEqual(q.drags,drags);
 assert.equal(q.route.search,null);assert.equal(q.route.witnessValidation.providedRoute,true);assert.equal(q.U,expectedU);
 for(const r of [q.route.canonicalReplay,q.route.independentReplay])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===expectedU);
 assert.equal(q.route.independentReplay.remainingBodies,0);assert.equal(q.route.independentReplay.remainingQueued,0);
 if(q.accepted){const l=q.lowerBound.result;assert.equal(q.L,BANDS[difficulty].lower);assert.equal(q.lowerBound.inputLevelSha256,levelSha256(level));
  assert.equal(l.thresholdProven,true);assert.equal(l.floor,BANDS[difficulty].lower);assert.equal(l.termination,'below-threshold-exhausted');assert(l.guardAllowance.conservativeFullBoardStateUpperBound<=10000);}
 return true;
}
async function selectedContext(context,environment,bindings){
 // Keep the exact established153 prefix. Future supplied quick reviews bind
 // their real appended original receipts; no invented old receipt schema.
 const anchor=await readLowTwenty153Admission(LOW_TWENTY_153_INPUTS.selection,LOW_TWENTY_153_INPUTS.review);
 merge(bindings,mapHistoricalBindingsTask(anchor.bindings,environment).bindings);
 const index=await bound(context.selection,bindings),review=await bound(context.selectionReview,bindings);
 assert.deepEqual(review.selection,context.selection);assert.deepEqual(review.errors,[]);assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);
 assert.equal(review.candidates,index.files.length);assert.equal(index.files.length,context.selectedCount);assert.deepEqual(index.files.slice(0,153),anchor.index.files);
 assert.equal(new Set(index.files).size,index.files.length);merge(bindings,mapHistoricalBindingsTask(review.inputBindings,environment).bindings);
 const records=[];
 for(const [i,file]of index.files.entries()){
  const h=review.inputBindings[file]??review.inputBindings[path.resolve(file)];assert(h,'Selected receipt bytes must be in the exact quick review');
  const q=await bound({path:file,sha256:h},bindings);assert(q.accepted&&!q.qualificationOnly);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
  if(i>=153){
   assert(['exact-regional-reserve195-star-task-once-v1',VERSION].includes(q.version),'Only genuine new star entry append is supported');
   assertOriginalFinalMath(q.mathematicalProof,q.level,q.drags,q.U,q.difficulty);assert(q.mathematicalProof.accepted);
   const request=(await readFile(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.request.json`,bindings)).value,result=(await readFile(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.result.json`,bindings)).value;
   assert.deepEqual(request,q.attempt);assert(result.accepted);assert.equal(result.status,q.mathematicalProof.status);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,q.lowerBound.result);assert.deepEqual(result.upper,q.route.search);
   assert.deepEqual((await readFile(q.entryResultFile,bindings)).value,q);assert.deepEqual(await bound(q.constructionSidecar,bindings),q.construction);await bound(q.constructionPlan,bindings);
   assert(q.construction.ok&&q.construction.accepted&&!q.construction.mathematicalAcceptance);assert(q.construction.constructionAccounting.conservativeFullBoardStateUpperBound<=10000);
  }
  records.push(q);
 }
 return records;
}
async function common(rt,context){
 const environment=prefixExecutionEnvironment(rt),bindings={...rt.toolchainBindings,...rt.designBindings,...environment.bindings};
 const review=await bound(DONOR_REVIEW,bindings);assert.equal(review.status,'UNUSED_QUOTIENT_DONORS_READONLY_PLANNING_COMPLETE');
 merge(bindings,mapHistoricalBindingsTask(review.fileBindings,environment).bindings);
 const selected=await selectedContext(context,environment,bindings),old=[];assert.equal(rt.priorDailySlots.size,450);
 for(const p of rt.priorDailySlots.values()){const q=await bound({path:p.sourceReport,sha256:p.sourceReportSha256},bindings);assert.equal(levelSha256(q.level),p.levelSha256);old.push(q);}
 return{environment,bindings,review,selected,old};
}
async function donor(rt,task,c){
 const historical=c.review.rows.find(r=>r.sourceLevelId===task.sourceLevelId);assert(historical);assert.deepEqual(task.base,historical.candidate);
 const base=await bound(task.base,c.bindings),request=await readFile(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.request.json`,c.bindings),result=await readFile(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.result.json`,c.bindings);
 assertDonorEvidence(base,request.value,result.value,historical);const status=await inspectHistoricalAttempt(base.level,PUBLIC_ATTEMPT_LEDGER);assert(!status.blocked&&status.acceptedHistoricalMathematics);
 assert.deepEqual(rt.slots.find(s=>s.formalId===task.slot.formalId),task.slot);assert(!c.selected.some(q=>q.formalId===task.slot.formalId));
 const sourceBinding=await currentMainlineSourceBinding(rt,c.environment,base.sourceLevelId,{qualificationOnly:false});merge(c.bindings,sourceBinding.bindings);assert.equal(levelSha256(rt.LEVELS.find(s=>s.id===base.sourceLevelId)),base.sourceLevelSha256);
 const priorRow=rt.priorDailySlots.get(task.slot.formalId),priorDescriptor={path:priorRow.sourceReport,sha256:priorRow.sourceReportSha256},prior=await bound(priorDescriptor,c.bindings);
 assert.equal(levelSha256(prior.level),priorRow.levelSha256);assert.deepEqual(mechanismInventory(prior.level),priorRow.inventory);
 assert(priorRow.inventory.star.length<task.slot.difficulty+1&&total(priorRow.inventory)<task.slot.difficulty+1);
 const artBindings={};for(const b of base.level.blocks){const shape=rt.matchFormalBlockShape(b.shape,'native-only');assert(shape&&shape.quarterTurns===0);const p=rt.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[shape.shapeId];assert(p);artBindings['public/'+p]=hash(await fs.readFile('public/'+p));}merge(c.bindings,artBindings);
 return{base,historical,prior,priorDescriptor,sourceBinding,request:request.descriptor,result:result.descriptor};
}

/** Only metadata/read-only evidence. Does not create any new physical level. */
export async function prepareStarDonorBatch(rt,context){
 assert.equal(hash(await fs.readFile(SELF)),IMPORT_SHA);assert(context.tasks.length>0&&context.tasks.length<=5);const c=await common(rt,context),tasks=[];
 for(const [index,t]of context.tasks.entries()){
  const d=await donor(rt,t,c),band=BANDS[t.slot.difficulty];assert([1,2].includes(t.slot.difficulty));assert(!context.deferredSourceLevelIds.includes(t.sourceLevelId));
  const design=inspectDesign(rt,d.base,t.slot,c.selected,c.old);
  tasks.push({...t,index,historical:d.historical,expectedStars:plannedStarInstances(d.base,t.slot.difficulty),expectedU:d.base.U,
   requiredFloor:band.lower,maximumUpper:band.upper,construction:{variant:0,maxAttempts:1,instances:t.slot.difficulty+1,maxStates:10000},lowerBudget:STAR_LOWER_BUDGET,
   historicalLowerReused:false,historicalRawCountCertified:false,priorBaseline:d.priorDescriptor,basePublicRequest:d.request,basePublicResult:d.result,sourceBinding:d.sourceBinding,design});
 }
 for(let i=0;i<tasks.length;i++)for(let j=i+1;j<tasks.length;j++){const a=await bound(tasks[i].base),b=await bound(tasks[j].base);assert(compareLayouts(a.level,b.level).footprintSimilarity<=.65+1e-12,'Planned donors must be physically independent');}
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))merge(c.bindings,{[p.replaceAll('\\','/')]:hash(await fs.readFile(p))});
 const plan={schemaVersion:4,scope:300,version:VERSION,donorReview:DONOR_REVIEW,selection:context.selection,selectionReview:context.selectionReview,selectedCount:c.selected.length,
  deferredSourceLevelIds:context.deferredSourceLevelIds,tasks,maximumTasks:tasks.length,oneBaseOneStage:true,fallbackAllowed:false,originalPlainSearchAllowed:false,
  environment:c.environment,policyReviewedAtPreparation:c.environment.policyReviewedAtPreparation,historicalDesignPolicy:c.environment.historicalDesignPolicy,mathematicalContract:c.environment.mathematicalContract,
  proofToolchainSha256:rt.toolchainSha256,bindings:c.bindings,oldGeneratorFailuresReopened:false,oldQuotientProofUsedAsRawCertificate:false,
  newConstructions:0,newSearches:0,newLedgerClaims:0,formalReady:false,productionChanged:false};assertStarDonorBatchPlan(plan);await check(plan.bindings);return plan;
}

export async function constructTaskStars(rt,base,priorLevel,slot,expected,budget){
 const before=levelSha256(base.level),routeHash=routeSha256(base.drags),w=staticStarReplayReservations(base.drags)/2;
 budget.reserve(4*w+16,'intensify-two-replays-final-proof-two-replays-static-worlds');
 const a=await intensify(base.level,base.drags,'star',{runtime:rt,difficulty:slot.difficulty,variant:0,maxAttempts:1,targets:{instances:slot.difficulty+1},formalId:slot.formalId,sourceLevelId:base.sourceLevelId,priorLevel});
 if(!a.ok)return{...a,constructionAccounting:budget.report()};
 assert.deepEqual(a.drags,base.drags);assert.equal(a.provenance.attemptsUsed,1);assert.equal(a.provenance.maxAttempts,1);assert.deepEqual(a.searchAccounting.localHeldReachability,[]);assert.equal(a.searchAccounting.fullBoardSolverInvocations,0);
 assertStaticStarDelta(base.level,a.level,a.drags,slot.difficulty);assert(a.participation.pass&&a.priorComparison.instanceIncrease>0);assert.equal(total(mechanismInventory(a.level)),slot.difficulty+1);assert(total(mechanismInventory(priorLevel))<slot.difficulty+1);
 budget.reserve(w,'actual-star-gate-complete-route');const model=new rt.PuzzleModel(a.level);model.startCountdown();const events=[];
 for(const [i,d]of a.drags.entries()){const original=model.tryExit;model.tryExit=function(id,side){const s=this.snapshot(),r=original.call(this,id,side);if(r.ok){const g=s.gates.find(g=>g.id===r.gateId);assert(g);events.push({blockId:id,drag:i+1,gateId:r.gateId,gateColor:g.color,gateStar:g.star===true});}return r;};try{applyNativeDrag(model,d);}finally{model.tryExit=original;}}
 const end=model.snapshot();assert(end.complete&&!end.failed&&!end.blocks.length&&!end.queuedBlocks.length);const stars=assertExpectedStars(a.level,events,expected);
 assert.equal(levelSha256(base.level),before);assert.equal(routeSha256(base.drags),routeHash);
 return{...a,...slot,audit:{passed:true,issues:[],participation:a.participation,actualStarExits:stars,fullInventoryCleared:true,noNewUpperSearch:true},primaryInstances:stars,
  constructionAccounting:budget.report(),provenance:{...a.provenance,outputLevelSha256:levelSha256(a.level),outputRouteSha256:routeHash}};
}
async function qualifyRow(rt,t,c,planDescriptor){
 const d=await donor(rt,t,c);assert.deepEqual(plannedStarInstances(d.base,t.slot.difficulty),t.expectedStars);assert.equal(d.base.U,t.expectedU);
 inspectDesign(rt,d.base,t.slot,c.selected,c.old);
 const q={schemaVersion:4,scope:300,version:VERSION,...t.slot,sourceLevelId:t.sourceLevelId,sourceLevelSha256:d.base.sourceLevelSha256,
  baseReceipt:{...t.base,request:d.request,result:d.result},baseLevelSha256:d.base.levelSha256,baseRouteSha256:routeSha256(d.base.drags),priorBaseline:d.priorDescriptor,
  historicalDonor:t.historical,oldQuotientProofUsedAsRawCertificate:false,oldGeneratorFailuresReopened:false,batchPlan:planDescriptor,
  environment:c.environment,policyReviewedAtPreparation:c.environment.policyReviewedAtPreparation,historicalDesignPolicy:c.environment.historicalDesignPolicy,mathematicalContract:c.environment.mathematicalContract,
  toolchainSha256:rt.toolchainSha256,toolchainBindings:rt.toolchainBindings,designBindings:{...c.bindings},accepted:false,L:null,U:null,status:'STAR_BATCH_ROW_PENDING',
  qualificationOnly:false,catalogEligible:false,formalReady:false,productionChanged:false,pointerValidated:false,timeValidated:false,currentRuntimeValidationClaimed:false,reasons:[]};
 try{
  q.constructionExecutionPolicyObservation=observeExecutionPolicy(c.environment);
  const a=await withStaticMechanismConstructionAttempt(rt,d.base,t.slot,(b,m)=>constructTaskStars(rt,b,d.prior.level,t.slot,t.expectedStars,m),{worldBudget:{maxStates:10000}});q.construction=a;
  if(a.resultFile)q.constructionSidecar=(await readFile(a.resultFile,q.designBindings)).descriptor;if(a.planFile)q.constructionPlan={...(await readFile(a.planFile,q.designBindings)).descriptor,canonicalSha256:a.planSha256};
  if(!a.ok){q.status='REJECTED_STAR_CONSTRUCTION';q.terminalBlocked=a.terminalBlocked;return q;}
  Object.assign(q,{level:a.level,drags:a.drags,levelSha256:levelSha256(a.level),routeSha256:routeSha256(a.drags),constructionAccounting:a.constructionAccounting});assert.equal(a.U,t.expectedU);
  q.strength={version:INTENSITY_VERSION,kind:'fixed-active-stars',mechanism:'star',passed:true,targets:a.targets,participation:a.audit.participation,actualStarExits:a.audit.actualStarExits,priorComparison:a.adaptation.priorComparison,designChoiceNotUserUniformQuota:true};q.mechanismStrengthValidated=true;
  const candidate={...t.slot,sourceLevelId:t.sourceLevelId,level:a.level,drags:a.drags,levelSha256:q.levelSha256,routeSha256:q.routeSha256};
  q.staticAudit=await auditV4StaticCandidate(rt,candidate);assert(q.staticAudit.passed,q.staticAudit.issues.join(';'));
  q.assetBindings=Object.fromEntries(Object.entries(q.staticAudit.assetBindings).map(([p,h])=>['public/'+p,h]));merge(q.designBindings,q.assetBindings);
  q.design=inspectDesign(rt,d.base,t.slot,c.selected,c.old,a.level);q.designValidated=true;await check(q.designBindings);
  q.executionPolicyObservation=observeExecutionPolicy(c.environment);q.finalProofPlan={lowerBudget:t.lowerBudget,routeBudget:t.lowerBudget,providedCompleteRoute:true,mechanismBaseReceipt:t.base};
  const m=await qualifyBoundedCandidateV4(rt,candidate,{lowerBudget:t.lowerBudget,routeBudget:t.lowerBudget,mechanismBaseReceipt:t.base});q.mathematicalProof=m;
  for(const k of ['attempt','attemptPlan','attemptPlanSha256','lowerBound','route','L','U'])if(m[k]!==undefined)q[k]=m[k];
  if(m.route?.canonicalReplay)assertOriginalFinalMath(m,a.level,a.drags,t.expectedU,t.slot.difficulty);
  if(!m.accepted){q.status='REJECTED_STAR_FRESH_ORIGINAL_PROOF';return q;}
  assertOriginalFinalMath(m,a.level,a.drags,t.expectedU,t.slot.difficulty);q.accepted=true;q.mathematicalEvidenceValidated=true;q.status='STAR_BATCH_TASK_CANDIDATE_VERIFIED_AWAITING_POINTER';return q;
 }catch(e){q.accepted=false;q.status='STAR_BATCH_ROW_REJECTED';q.reasons.push(e.message);return q;}
 finally{
  try{await check(q.designBindings);}catch(e){q.accepted=false;q.status='STAR_BATCH_BINDING_CHANGED';q.reasons.push(e.message);}
  q.designToolchainSha256=levelSha256(q.designBindings);q.catalogEligible=q.accepted;q.terminalBlocked=q.terminalBlocked||!!q.construction?.constructionAttemptStarted&&!q.accepted;
  if(!q.accepted)q.mathematicalEvidenceValidated=false;
  if(q.construction?.constructionAttemptStarted){q.entryResultFile=path.join(CONSTRUCTION_LEDGER,`${q.construction.constructionAttempt.id}.slot-result.json`);await put(q.entryResultFile,q);}
 }
}
export async function runStarDonorBatch(rt,planDescriptor,reviewDescriptor,out){
 const p=await bound(planDescriptor),r=await bound(reviewDescriptor);assertStarDonorBatchPlan(p);
 assert.equal(r.status,'INDEPENDENT_STAR_DONOR_BATCH_PLAN_PASS');assert.deepEqual(r.plan,planDescriptor);assert.deepEqual(r.errors,[]);assert.equal(r.newSearches,0);assert.equal(r.newLedgerClaims,0);assert.equal(r.fileBindings[SELF],IMPORT_SHA);
 await check(p.bindings);await check(r.fileBindings);const c=await common(rt,{selection:p.selection,selectionReview:p.selectionReview,selectedCount:p.selectedCount});assert.deepEqual(c.environment,p.environment);
 merge(c.bindings,p.bindings);merge(c.bindings,{[planDescriptor.path]:planDescriptor.sha256,[reviewDescriptor.path]:reviewDescriptor.sha256});
 await fs.mkdir(out,{recursive:false});const claimDir=path.join(CONSTRUCTION_LEDGER,'star-batches');await fs.mkdir(claimDir,{recursive:true});
 const executionPolicyObservation=observeExecutionPolicy(c.environment),claim=await put(path.join(claimDir,`${planDescriptor.sha256}.json`),{plan:planDescriptor,review:reviewDescriptor,out,executionPolicyObservation});
 const results=[];let error=null;
 try{for(const t of p.tasks){await check(p.bindings);const q=await qualifyRow(rt,t,c,planDescriptor),file=await put(`${out}/candidate-${String(t.index).padStart(3,'0')}.json`,q);
   results.push({...file,sourceLevelId:t.sourceLevelId,formalId:t.slot.formalId,accepted:q.accepted,status:q.status,L:q.L,U:q.U});if(q.accepted)c.selected.push(q);console.log(JSON.stringify(results.at(-1)));}}
 catch(e){error=e.message;throw e;}
 finally{await put(`${out}/completion.json`,{status:error?'STAR_BATCH_STOPPED':'STAR_BATCH_FIRST_ATTEMPTS_FINISHED',plan:planDescriptor,review:reviewDescriptor,claim,results,error,
  inputSelection:p.selection,attempted:results.length,accepted:results.filter(q=>q.accepted).length,noFallback:true,selectionModified:false,formalReady:false,productionChanged:false});}
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[mode,...a]=process.argv.slice(2),rt=await loadV4CatalogRuntime();
 if(mode==='prepare'){const context=await bound({path:a[0],sha256:a[1]}),p=await prepareStarDonorBatch(rt,context);await fs.mkdir(a[2],{recursive:false});console.log(JSON.stringify(await put(`${a[2]}/plan.json`,p)));}
 else{assert.equal(mode,'run');await runStarDonorBatch(rt,{path:a[0],sha256:a[1]},{path:a[2],sha256:a[3]},a[4]);}}

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,TASK_ENVIRONMENT_PINS,DEFAULT_EXECUTION_POLICY_REVIEW,assertExecutionPolicyReviewMetadata} from './prefix-execution-environment-task.mjs';
import {assertLongPrefixProposal,assertLongPrefixPlan,assertLongPrefixIndex,changedShapeAndColour,longPrefixDisposition,longPrefixConstructionFiles,
 SELF as OUTER,MATH_ENTRY,UPPER_BUDGET,LOWER_BUDGET,STATIC_SLOT} from './long-prefix-batch-task.mjs';
import {makeExplicitNativeBatchRecipe} from './prepare-native-batch.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {makePrefixTailV4Plan} from './prefix-tail-explore-task.mjs';
import {formedStockImages} from './prepare-early-prefix-four.mjs';
import {sha,walkJson,HISTORY_LEDGER_ROOTS,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER} from './low-twenty-io.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {auditPlainForwardDrag,auditCompleteReverseWitness} from '../formal-v3/reverse-route-audit.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {bodyFootprint,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';

// Read-only: no constructor, colour CSP, search, ledger claim or finish is called.
export const SELF='tools/daily-challenge/formal-v4/audit-long-prefix-task-bounded-io.mjs';
const FROZEN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const norm=f=>path.resolve(f).toLowerCase(),branch=b=>`${b.sourceLevelId??b.source}:${b.branchId}`;
const partition=l=>levelSha256(l.blocks.map(bodyFootprint).sort());
const identity=f=>levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
const cells=ps=>JSON.stringify(ps.map(p=>p.join(',')).sort());
const descriptor=d=>assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact descriptor required');
const exists=f=>fs.stat(f).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const statuses={plan:'INDEPENDENT_LONG_PREFIX_PLAN_PASS',static:'INDEPENDENT_LONG_PREFIX_STATIC_PASS',actual:'INDEPENDENT_LONG_PREFIX_ACTUAL_PASS'};

/** Memoize only verified file hashes, never mathematical results. Finish always
 * re-reads every distinct file, detecting deletion or mutation during this audit. */
function reader(){const bindings={},verified=new Map();
 const bytes=async(f,h)=>{const b=await fs.readFile(f),actual=sha(b),key=norm(f);if(h)assert.equal(actual,h,f);
  if(verified.has(key))assert.equal(actual,verified.get(key).sha256,f);verified.set(key,{path:path.resolve(f),sha256:actual});bindings[f]=actual;bindings[path.resolve(f)]=actual;return b;};
 const map=async m=>{assert(m&&typeof m==='object');for(const[f,h]of Object.entries(m)){
  if(verified.has(norm(f)))assert.equal(verified.get(norm(f)).sha256,h,`Conflicting binding ${f}`);else await bytes(f,h);bindings[f]=h;}};
 return{bindings,bytes,map,read:async f=>JSON.parse(await bytes(f)),bound:async d=>{descriptor(d);return JSON.parse(await bytes(d.path,d.sha256));},
  finish:async()=>{for(const d of verified.values())assert.equal(sha(await fs.readFile(d.path)),d.sha256,`Final bytes changed: ${d.path}`);}};
}
export function replayLongPrefix(runtime,level,drags){
 let tail=structuredClone(level);const audits=[];
 for(const drag of drags){const a=auditPlainForwardDrag(runtime,tail,drag);assert(a.valid,a.error);audits.push(a);
  const body=tail.blocks.find(b=>b.id===drag.blockId);if(drag.path.length)[body.x,body.y]=drag.path.at(-1);
  if(drag.exitSide)tail.blocks=tail.blocks.filter(b=>b.id!==drag.blockId);}
 const independent=independentReplay(runtime,level,drags);assert(independent.valid&&!independent.failed,independent.error);
 assert.equal(independent.remainingBodies,tail.blocks.length);assert.equal(independent.remainingQueued,0);
 assert.equal(independent.clearEvents,audits.reduce((n,a)=>n+a.clearEvents,0));assert.equal(independent.effectiveDrags,drags.length);
 return{tail,audits,independent,parking:audits.filter(a=>!a.clearEvents).length};
}
export function assertLongPrefixProposalBinding(p,proposal,review){
 assertLongPrefixProposal(proposal);assert.equal(review.status,'INDEPENDENT_LONG_PREFIX_PROPOSAL_PASS');assert.deepEqual(review.proposal,p.proposal);
 assert.deepEqual(review.errors,[]);assert.equal(review.newSearches,0);assert.equal(review.newConstructions,0);
 assert.deepEqual(p.blueprints.map(b=>b.recipeId),proposal.recipes.map(b=>b.recipeId));
 assert.equal(p.maximumInputs,proposal.finiteExperiment.maximumColourCspInputsIncludingFailed);
 assert.equal(p.maximumStaticPartitionAttempts,proposal.finiteExperiment.maximumStaticPartitionAttempts);
 for(const [i,b]of p.blueprints.entries()){const spec=proposal.recipes[i],ref=proposal.references.find(x=>x.referenceId===spec.referenceId);
  for(const k of ['recipeId','sourceLevelId','branchId','seed','colourSeed','bodyCountDelta','maximumStaticPartitionAttempts'])assert.deepEqual(b[k],spec[k],`Proposal ${k}`);
  assert.equal(b.maximumStocks,spec.maximumColourCspInputsIncludingFailure);assert.deepEqual(b.reference,ref.reference);
  assert.equal(b.referenceLevelSha256,ref.referenceLevelSha256);assert.equal(b.referenceRouteSha256,ref.referenceRouteSha256);
  assert.deepEqual(b.level,ref.originalLevel);assert.deepEqual(b.prefixDrags,ref.completeReferenceDrags.slice(0,spec.prefixCut));assert.deepEqual(b.prefixDrags,ref.prefix.drags);
  assert.equal(b.prefixSha256,spec.prefixSha256);assert.equal(cells(b.region.cells),cells(ref.region.cells));
  assert.deepEqual([...b.region.bodyIds].sort(),[...ref.changedBodyIds].sort());assert.deepEqual(b.fixedBlocks,ref.fixedBlocks);assert.deepEqual(b.allReferenceGates,ref.fixedGates);
 }
 return true;
}
export function assertLongPrefixStockHistory(built,{parent,reference,previousShapes=[]}){
 if(built.placeholderWorld){const f=designFingerprints(built.placeholderWorld);assert(built.stockFingerprints);assert.equal(built.stockFingerprints.shapeSha256,f.shapeSha256);
  if(built.enteredColourCsp){assert.notEqual(f.shapeSha256,reference.shapeSha256);assert(![parent.shapeSha256,...previousShapes].includes(f.shapeSha256),'Previously considered branch shape entered CSP');}}
 else assert.equal(built.enteredColourCsp,false);
 if(built.plain?.level)assert.deepEqual(built.plain.stockFingerprints,designFingerprints(built.plain.level));
 return built.stockFingerprints?.shapeSha256??null;
}
export async function auditLongPrefixExecutionObservation(r,observation,environment){
 assert.equal(observation.status,'REVIEWED_EXECUTION_POLICY_OBSERVED');assert.equal(observation.mathematicalIdentityUnchanged,true);assert.equal(observation.currentUIValidated,false);
 assert.equal(environment.descriptor.sha256,TASK_ENVIRONMENT_PINS.environment);const snapshot=await r.bound(environment.descriptor),sourceRoot=path.resolve(snapshot.sourceWorkspace);
 assert.equal(sourceRoot,environment.sourceWorkspace);assert.equal(path.resolve(snapshot.workspace),environment.executionWorkspace);
 const review=await r.bound(observation.scopeReview),mutable=path.join(sourceRoot,'docs/rules/manifest.json');assert.notEqual(norm(review.reviewedManifest.path),norm(mutable));
 for(const f of Object.keys(observation.reviewBindings))assert.notEqual(norm(f),norm(mutable),'Mutable manifest cannot become a proof binding');
 const manifest=await r.bound(review.reviewedManifest),defaultReview=await r.bound(DEFAULT_EXECUTION_POLICY_REVIEW),anchor=await r.bound(defaultReview.reviewedManifest);
 assertExecutionPolicyReviewMetadata(review,manifest,manifest,anchor);assert.equal(review.scope,observation.scope);const observed=observation.observedCurrentPolicy;
 assert.equal(observed.activeVersion,review.reviewedActiveVersion);assert.equal(manifest.activeVersion,observed.activeVersion);
 assert.equal(observed.manifest.path,mutable);assert.equal(observed.manifest.sha256,review.reviewedManifest.sha256);assert.deepEqual(observed.ruleLock,{status:'PASS',verified:manifest.versions.length});
 const active=review.reviewedDocuments.find(x=>x.version===observed.activeVersion);assert(active);assert.equal(observed.document.path,path.resolve(sourceRoot,active.originalRelativePath));assert.equal(observed.document.sha256,active.archive.sha256);
 await r.map(observation.reviewBindings);for(const row of review.reviewedDocuments){const entry=manifest.versions.find(x=>x.version===row.version);assert(entry);
  assert.equal(row.originalRelativePath,entry.document);assert.equal(row.ruleSha256,entry.sha256);assert.notEqual(norm(row.archive.path),norm(path.resolve(sourceRoot,row.originalRelativePath)));
  const raw=await r.bytes(row.archive.path,row.archive.sha256);assert.equal(sha(Buffer.from(raw.toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n'))),entry.sha256);}
 return{scopeReview:observation.scopeReview,observedActiveVersion:observed.activeVersion};
}
export function assertLongPrefixAccounting(q,drags){
 const p=q.plan,prior=p.constructionAccounting,u=q.upperConstruction,a=q.upperAccounting,t=u?.tailSearch;
 assert(u&&a);for(const[k,v]of Object.entries(UPPER_BUDGET))assert.equal(p.fullUpperBudget[k],v);
 for(const[k,v]of Object.entries(LOWER_BUDGET))assert.equal(p.lowerBudget[k],v);
 assert.equal(p.floor,31);assert.equal(p.innerPlan.tailStrategy,'plain-joint');assert.equal(p.innerPlan.searchUpper,128);
 assert.equal(p.tailSearchesMaximum,1);assert.equal(p.alternativePrefixOrFullUpperSearchAllowed,false);assert.equal(p.failedInputContinuationAllowed,false);
 for(const k of ['completeWorldReservations','microStates','transitions','elapsedMilliseconds'])assert(Number.isSafeInteger(prior[k])&&prior[k]>=0);
 assert(prior.completeWorldReservations>=1);assert.deepEqual(a.prior,prior);assert.deepEqual(u.plan,p.innerPlan);assert.equal(u.lowerBoundClaimed,false);
 const n=u.prefixCommittedWorldUpperBound;assert(Number.isSafeInteger(n)&&n>=1&&n<=drags.length+1);assert.equal(u.prefixAudits.length,n-1);
 assert.equal(a.knownPrefix,n);assert.equal(a.tailRegistered,t?.rawFullBoardStates??0);assert.equal(a.terminalAllowance,t?1:0);assert.equal(u.tailSearches,t?1:0);
 const total=prior.completeWorldReservations+n+(t?t.rawFullBoardStates+1:0);
 assert.equal(a.conservativeFullBoardStateUpperBound,total);assert.equal(u.conservativeFullBoardStateUpperBound,total-prior.completeWorldReservations);assert.equal(a.maximum,10000);assert(total<=10000);
 if(t){searchAccounting(t);assert.equal(n,drags.length+1);assert.equal(u.prefixTransitions,drags.reduce((v,d)=>v+d.path.length+1,0));
  assert.equal(t.budget.maxStates,10000-prior.completeWorldReservations-n-1);
  assert.equal(t.budget.maxTransitions,UPPER_BUDGET.maxTransitions-prior.transitions-u.prefixTransitions);
  assert.equal(t.budget.maxMicroStates,UPPER_BUDGET.maxMicroStates-prior.microStates);
  assert(t.budget.maxMilliseconds<=30000-prior.elapsedMilliseconds);assert(t.elapsedMilliseconds<=u.elapsedMilliseconds);
  assert(prior.transitions+u.prefixTransitions+t.attemptedTransitions<=UPPER_BUDGET.maxTransitions);
  assert(prior.microStates+t.microDiscoveredStates<=UPPER_BUDGET.maxMicroStates);
  if(Number.isSafeInteger(t.cost)&&Array.isArray(t.drags))assert(t.elapsedMilliseconds<t.budget.maxMilliseconds);
 }
 if(q.route||q.accepted)assert(prior.elapsedMilliseconds+u.elapsedMilliseconds<=30000);
 return total;
}
function searchAccounting(s){assert.deepEqual(inspectSearchAccounting(s,'recorded-search'),[]);assert.deepEqual(s.guardAllowance,guardAllowanceFor(s));
 assert(s.budget.maxStates<=9999&&s.guardAllowance.conservativeFullBoardStateUpperBound<=10000);}
export function assertLongPrefixActualEnvelope(c,index,p){
 assertLongPrefixIndex(index,p);assert.equal(c.status,'LONG_PREFIX_FIRST_MATH_BATCH_FINISHED');assert.deepEqual(c.batchPlan,index.plan);
 assert.deepEqual(c.results.map(r=>r.input),index.candidates);assert.equal(c.accepted,c.results.filter(r=>r.accepted).length);
 assert.equal(c.publicClaimsStarted,c.results.filter(r=>r.attemptId).length);assert.equal(c.unclaimedSkipped,c.results.filter(r=>!r.attemptId).length);
 assert.equal(c.selectionIndexUnchanged,true);assert.equal(c.formalReady,false);
}
async function snapshot(r,p,allowed=[]){
 assert.deepEqual(p.ledgerSnapshot.roots.map(x=>norm(x.directory)).sort(),HISTORY_LEDGER_ROOTS.map(norm).sort());const allow=new Set(allowed.map(norm));
 for(const root of p.ledgerSnapshot.roots){const old=new Set(root.files.map(d=>norm(d.path)));assert.equal(old.size,root.files.length);
  for(const d of root.files){assert(norm(d.path).startsWith(norm(root.directory)+path.sep));await r.map({[d.path]:d.sha256});}
  for(const f of await exists(root.directory)?await walkJson(root.directory):[])assert(old.has(norm(f))||allow.has(norm(f)),`Unreviewed history addition: ${f}`);}
}
async function review(r,d,status,key,subject){const q=await r.bound(d);assert.equal(q.status,status);assert.deepEqual(q.errors,[]);assert.deepEqual(q[key],subject);
 assert.equal(q.newSearches??q.newGameplaySearches,0);assert(q.fileBindings[OUTER]);await r.map(q.fileBindings);return q;}
async function planCore(r,rt,d,{replayReferences=true}={}){
 const p=await r.bound(d);assertLongPrefixPlan(p);await r.map(p.bindings);assert.deepEqual(prefixExecutionEnvironment(rt),p.executionEnvironment);
 const proposal=await r.bound(p.proposal),proposalReview=await r.bound(p.proposalReview);assertLongPrefixProposalBinding(p,proposal,proposalReview);
 assert.equal(p.proofToolchainSha256,FROZEN);const rows=[];
 for(const [key,status]of [['qualification','INDEPENDENT_LONG_PREFIX_BATCH_TASK_PASS'],['mathQualification','INDEPENDENT_PREFIX_TAIL_TASK_PASS']]){
  const q=await r.bound(p[key]);assert.equal(q.status,status);assert.deepEqual(q.errors,[]);assert.equal(q.searchAlgorithmChanged,false);assert.equal(q.failedOriginalRetryAllowed,false);
  for(const k of ['newRealCandidateSearches','newRealCandidateConstructions','publicLedgerClaims'])assert.equal(q[k],0);await r.map(q.toolBindings);}
 const selected=await r.bound(p.selectedIndex);assert.deepEqual(selected.files,p.selected.map(x=>x.path));
 for(const x of p.failedParents){const projected=await r.bound(x.receipt),q=projected.originalReceipt?await r.bound(projected.originalReceipt):projected;
  assert.equal(q.accepted,false);assert.equal(q.levelSha256,levelSha256(q.level));assert.deepEqual(projected.level,q.level);
  const request=await r.read(x.requestFile),terminal=await r.read(x.resultFile);assert.deepEqual(request,q.attempt??q.proof?.attempt);assert.equal(request.id,x.id);
  assert.equal(terminal.accepted,false);assert.equal(terminal.status,q.status);assert.equal(terminal.levelSha256,q.levelSha256);assert.deepEqual(x.fingerprints,designFingerprints(q.level));
  for(const f of [x.blockedFile,x.identityBlockedFile]){const b=await r.read(f);assert.equal(b.attemptId,x.id);assert.equal(b.status,q.status);}}
 for(const b of p.blueprints){const ref=await r.bound(b.reference);
  if(replayReferences){const fresh=makeExplicitNativeBatchRecipe(rt,ref,{recipeId:b.recipeId,reference:b.reference,sourceLevelId:b.sourceLevelId,
    cut:b.prefixDrags.length,regionBodyIds:b.region.bodyIds,maximumStocks:1});
   for(const k of ['level','changedBodies','fixedBlocks','prefixDrags','prefixSha256','referenceLevelSha256','referenceRouteSha256'])assert.deepEqual(b[k],fresh[k],k);
   assert.equal(cells(b.region.cells),cells(fresh.region.cells));for(const k of ['area','fraction','originalBodyCount','connected'])assert.equal(b.region[k],fresh.region[k]);
   assert.deepEqual([...b.region.bodyIds].sort(),[...fresh.region.bodyIds].sort());
   replayLongPrefix(rt,ref.level,b.prefixDrags);}
  const source=await currentMainlineSourceBinding(rt,p.executionEnvironment,b.sourceLevelId);await r.map(source.bindings);assert.equal(source.sourceLevelSha256,b.sourceLevelSha256);
  rows.push({recipeId:b.recipeId,sourceLevelId:b.sourceLevelId,reference:b.reference,prefixDrags:b.prefixDrags.length,regionArea:b.region.area,regionFraction:b.region.fraction});}
 return{p,rows};
}
async function constructionEvidence(r,index,p,d){
 const files=longPrefixConstructionFiles(d,p),claim=await r.read(files[0]),result=await r.read(files[1]);
 for(const q of [claim,result]){assert.deepEqual(q.plan,d);assert.equal(q.qualificationOnly,false);assert.equal(q.outputDirectory,path.resolve(path.dirname(index.__file)));}
 assert.equal(claim.failedPlanContinuationAllowed,false);assert.equal(result.status,index.status);assert.equal(result.failureReason,null);
 assert.deepEqual(result.constructionFiles,index.attempts.map(a=>a.constructionEvidence));assert.equal(result.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);
 for(const f of files.slice(2)){const q=await r.read(f);assert.deepEqual(q.plan,d);assert.deepEqual(q.proposal,p.proposal);assert.equal(q.experimentId,p.experimentId);assert.equal(q.restartAllowed,false);}
 return files;
}
async function staticCore(r,rt,d){
 const index=await r.bound(d),{p}=await planCore(r,rt,index.plan);assertLongPrefixIndex(index,p);
 await review(r,index.recipeReview,statuses.plan,'plan',index.plan);assert.deepEqual(index.executionEnvironment,p.executionEnvironment);
 await auditLongPrefixExecutionObservation(r,index.executionPolicyObservation,p.executionEnvironment);
 const allowed=await constructionEvidence(r,{...index,__file:d.path},p,index.plan),selected=await Promise.all(p.selected.map(x=>r.bound(x))),old450=await Promise.all(p.old450.map(x=>r.bound(x)));
 const history=[...await Promise.all(p.previousMacro.map(x=>r.bound(x))),...p.previousLateStocks,...await Promise.all(p.comparisonOnly.map(x=>r.bound(x)))];
 const partitions=new Set([...history,...selected].map(q=>partition(q.level))),formed=new Map(),shapes=new Map(),rows=[],seenCandidates=[];
 for(const q of p.previousLateStocks)for(const b of p.blueprints)if(q.sourceLevelId===b.sourceLevelId&&q.reference?.path===b.reference.path)
  {formed.set(branch(b),[...(formed.get(branch(b))??[]),q.fingerprints]);shapes.set(branch(b),[...(shapes.get(branch(b))??[]),q.fingerprints.shapeSha256]);}
 for(const a of index.attempts){const b=p.blueprints.find(x=>x.recipeId===a.recipeId),built=await r.bound(a.constructionEvidence),prior=formed.get(branch(b))??[];
  assert.equal(a.sourceLevelId,b.sourceLevelId);assert.equal(a.branchId,b.branchId);assert.equal(a.seed,b.seed+7919*a.localAttempt);assert.equal(a.colourSeed,b.colourSeed+7919*a.localAttempt);
  assert.equal(a.enteredColourCsp,built.enteredColourCsp===true);assert.equal(a.status,built.status);assert.deepEqual(built.plan,index.plan);assert.deepEqual(built.recipeReview,index.recipeReview);
  assert.deepEqual(built.executionPolicyObservation,index.executionPolicyObservation);assert.deepEqual(built.executionEnvironment,p.executionEnvironment);
  const priorShape=assertLongPrefixStockHistory(built,{parent:p.failedParents.find(x=>branch(x)===branch(b)).fingerprints,reference:designFingerprints(b.level),previousShapes:shapes.get(branch(b))??[]});
  if(priorShape)shapes.set(branch(b),[...(shapes.get(branch(b))??[]),priorShape]);
  const formedLevel=built.plain?.level??(built.paint?.ok?built.level:null),duplicate=formedLevel?partitions.has(partition(formedLevel)):false;
  if(formedLevel)formed.set(branch(b),[...prior,designFingerprints(formedLevel)]);for(const l of formedStockImages(built))partitions.add(partition(l));
  const accounting=built.constructionAccounting;assert(accounting&&Number.isSafeInteger(accounting.transitions)&&accounting.transitions>=0);
  if(a.enteredColourCsp){assert(built.paint?.accounting);assert.equal(accounting.completeWorldReservations,1+built.paint.accounting.completeWorldReservations);assert(accounting.completeWorldReservations<=10000);
   assert.equal(accounting.transitions,(built.partition.transitions??0)+built.paint.accounting.transitions);assert.equal(accounting.microStates,built.paint.accounting.microStates);}
  if(!a.candidate)continue;assert(built.ok&&!duplicate);seenCandidates.push(a.candidate);const q=await r.bound(a.candidate),f=designFingerprints(q.level);
  assert.equal(q.status,'LONG_PREFIX_NEW_INPUT_AWAITING_FIRST_CLAIM');assert.deepEqual(q.level,built.level);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(a.candidate.levelSha256,q.levelSha256);
  assert.deepEqual(q.constructionEvidence,a.constructionEvidence);assert.deepEqual(q.constructionAccounting,built.constructionAccounting);assert.deepEqual(q.batchPlan,index.plan);
  assert.equal(q.recipeId,b.recipeId);assert.equal(q.branchId,b.branchId);assert.equal(q.sourceLevelId,b.sourceLevelId);assert.equal(q.targetDifficulty,3);
  assert.deepEqual(q.prefixDrags,b.prefixDrags);assert.equal(routeSha256(q.prefixDrags),a.candidate.prefixSha256);assert.deepEqual(q.level.gates,b.level.gates);
  assert.equal(q.level.blocks.length,b.level.blocks.length+b.bodyCountDelta);for(const fixed of b.fixedBlocks)assert.deepEqual(q.level.blocks.find(x=>x.id===fixed.id),fixed);
  assert.equal(cells(q.level.blocks.filter(x=>!b.fixedBlocks.some(y=>y.id===x.id)).flatMap(absoluteCells)),cells(b.region.cells));
  const parent=p.failedParents.find(x=>branch(x)===branch(b));assert.equal(q.redesignOf,parent.id);
  for(const old of [parent.fingerprints,designFingerprints(b.level),...prior])assert(changedShapeAndColour(old,f));
  assert(!p.publicStocks.some(x=>(x.retryIdentitySha256??identity(x))===identity(f)||(x.designSha256??x.id)===f.designSha256));
  const source=rt.LEVELS.find(x=>x.id===b.sourceLevelId);assert.equal(boardBaselineSha256(source),boardBaselineSha256(q.level));
  const nearest=xs=>xs.reduce((n,x)=>Math.max(n,compareLayouts(q.level,x.level).footprintSimilarity),0);
  const similarity={reference:compareLayouts(q.level,b.level).footprintSimilarity,source:compareLayouts(q.level,source).footprintSimilarity,
   selected:nearest(selected),old450:nearest(old450),history:nearest(history),newBatch:nearest(rows.filter(x=>branch(x)!==branch(b)))};
  assert.deepEqual(q.similarity,similarity);for(const[k,v]of Object.entries(similarity))assert(v<=(k==='source'?.55:k==='old450'?.75:.65)+1e-12,`Near: ${k}`);
  const staticAudit=await auditV4StaticCandidate(rt,{...STATIC_SLOT,sourceLevelId:b.sourceLevelId,level:q.level});assert(staticAudit.passed,staticAudit.issues.join(';'));
  await r.map(staticAudit.policyBindings);await r.map(q.assetBindings);const prefix=replayLongPrefix(rt,q.level,q.prefixDrags);
  for(const k of ['accepted','catalogEligible','formalReady','fullOriginalUValidated'])assert.equal(q[k],false);assert.equal(q.gameplaySearches,0);
  rows.push({candidate:a.candidate,recipeId:b.recipeId,branchId:b.branchId,sourceLevelId:b.sourceLevelId,level:q.level,levelSha256:q.levelSha256,
   prefixDrags:q.prefixDrags.length,prefixParking:prefix.parking,remainingBodies:prefix.tail.blocks.length,similarity,staticAudit,constructionEvidence:a.constructionEvidence});
 }
 assert.deepEqual(seenCandidates,index.candidates);return{index,p,rows,allowed};
}
async function actualCore(r,rt,d){
 const c=await r.bound(d),index=await r.bound(c.index),{p}=await planCore(r,rt,c.batchPlan,{replayReferences:false});assertLongPrefixActualEnvelope(c,index,p);
 await auditLongPrefixExecutionObservation(r,c.executionPolicyObservation,p.executionEnvironment);
 const staticReview=await review(r,c.audit,statuses.static,'index',c.index);assert.equal(staticReview.verifiedCandidates,index.candidates.length);assert.deepEqual(staticReview.plan,c.batchPlan);
 const visual=await r.bound(c.visual);assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');assert.deepEqual(visual.index,c.index);assert.equal(visual.viewedCandidates,index.candidates.length);await r.map(visual.fileBindings);
 const execution=await r.read(path.join(path.dirname(d.path),'plan.json'));assert.equal(execution.status,'LONG_PREFIX_FIRST_MATH_DECLARED');assert.deepEqual(execution.batchPlan,c.batchPlan);
 for(const k of ['index','audit','visual','mathExecutionClaim'])assert.deepEqual(execution[k],c[k]);await r.map(execution.bindings);
 assert.deepEqual(execution.executionPolicyObservation,c.executionPolicyObservation);
 const lockFile=path.join(LATE_PREFIX_CONSTRUCTION_LEDGER,`${c.batchPlan.sha256}.math-execution.json`);assert.equal(norm(c.mathExecutionClaim.file),norm(lockFile));
 const lock=await r.bound({path:lockFile,sha256:c.mathExecutionClaim.sha256});assert.deepEqual(lock.plan,c.batchPlan);assert.equal(lock.retryAllowed,false);assert.equal(lock.outputDirectory,path.resolve(path.dirname(d.path)));
 const allowed=[...longPrefixConstructionFiles(c.batchPlan,p),lockFile],latest=new Map(p.failedParents.map(x=>[branch(x),x.id])),successes=[],rows=[],ids=new Set();
 const names=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),requests=[];
 // Bound Windows file handles while preserving sorted request order and every check.
 for(let offset=0;offset<names.length;offset+=32)requests.push(...await Promise.all(names.slice(offset,offset+32).map(n=>r.read(path.join(PUBLIC_LEDGER,n)))));
 for(const [i,row]of c.results.entries()){
  const q=await r.bound(row),input=await r.bound(row.input);assert.deepEqual(q.input,row.input);assert.deepEqual(q.batchPlan,c.batchPlan);
  assert.deepEqual(execution.inputs[i].descriptor,row.input);for(const k of ['accepted','status','L','U','sourceLevelId'])assert.equal(q[k],row[k]);assert.equal(row.branchId,input.branchId);
  const disposition=longPrefixDisposition(input,successes);
  if(!row.attemptId){assert(disposition);for(const[k,v]of Object.entries(disposition))assert.deepEqual(q[k],v);assert.equal(q.attempt,null);assert.equal(q.L,null);assert.equal(q.U,null);
   assert(!requests.some(x=>identity(x)===identity(designFingerprints(input.level))),'Skipped input must remain unclaimed');rows.push({...row,skipped:true});continue;}
  assert.equal(disposition,null);assert(!ids.has(row.attemptId));ids.add(row.attemptId);assert.equal(q.attempt.id,row.attemptId);
  await auditLongPrefixExecutionObservation(r,q.executionPolicyObservation,p.executionEnvironment);
  assert.deepEqual(q.level,input.level);assert.equal(q.levelSha256,levelSha256(q.level));assert.deepEqual(q.plan,execution.inputs[i].plan);assert.equal(q.plan.levelSha256,q.levelSha256);
  assert.deepEqual(q.plan,makePrefixTailV4Plan(rt,input,{upperBudget:p.futureUpperBudget,lowerBudget:p.futureLowerBudget}));
  assert.equal(q.plan.prefixSha256,routeSha256(input.prefixDrags));assert.equal(q.plan.sourceLevelId,input.sourceLevelId);assert.equal(q.plan.floor,31);
  for(const k of ['qualificationOnly','catalogEligible','formalReady','currentRuntimeValidationClaimed','productionChanged'])assert.equal(q[k],false);
  assert.equal(q.toolchainSha256,FROZEN);assert.deepEqual(q.toolchainBindings,rt.toolchainBindings);await r.map(q.designBindings);assert.equal(q.designToolchainSha256,levelSha256(q.designBindings));
  const prior=await r.bound(q.plan.constructionEvidence);assert.deepEqual(prior.level,q.level);assert.deepEqual(prior.prefixDrags,input.prefixDrags);assert.deepEqual(prior.constructionAccounting,q.plan.constructionAccounting);
  const stem=path.join(PUBLIC_LEDGER,q.attempt.id),planFile=stem+'.v4-prefix-tail-task-plan.json',sideFile=stem+'.v4-prefix-tail-task-result.json';
  assert.equal(norm(q.planEvidence.path),norm(planFile));assert.equal(norm(q.evidenceFile),norm(sideFile));const side=await r.read(sideFile);
  for(const[k,v]of Object.entries(side))assert.deepEqual(q[k],v,`Saved original receipt ${k}`);
  const pe=await r.bound(q.planEvidence);assert.deepEqual(pe,{attempt:q.attempt,plan:q.plan,prefixDrags:input.prefixDrags,bindings:q.designBindings});
  const request=await r.read(stem+'.request.json'),result=await r.read(stem+'.result.json'),f=designFingerprints(q.level);assert.deepEqual(request,q.attempt);
  for(const[k,v]of Object.entries(f))assert.deepEqual(request[k],v);assert.equal(request.levelSha256,q.levelSha256);assert.equal(request.retryIdentitySha256,identity(f));
  assert.equal(request.identityOrigin,request.id);assert(!request.revalidates);assert.equal(request.redesignOf,latest.get(branch(input)));
  assert.deepEqual(requests.filter(x=>identity(x)===identity(f)).map(x=>x.id),[request.id]);const aliasFile=path.join(PUBLIC_LEDGER,'identities',identity(f)+'.json');assert.equal((await r.read(aliasFile)).origin,request.id);
  const parent=await r.read(path.join(PUBLIC_LEDGER,request.redesignOf+'.request.json'));assert(changedShapeAndColour(parent,f));
  assert.equal(result.accepted,q.accepted);assert.equal(result.status,q.status);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,q.lowerBound?.result);assert.deepEqual(result.upper,q.route?.search);
  allowed.push(stem+'.request.json',stem+'.result.json',planFile,sideFile,aliasFile);
  const prefix=replayLongPrefix(rt,q.level,input.prefixDrags),u=q.upperConstruction,tail=u?.tailSearch,total=assertLongPrefixAccounting(q,input.prefixDrags);
  for(const [j,a]of u.prefixAudits.entries()){assert(a.valid);assert.equal(a.afterBodiesSha256,prefix.audits[j].afterBodiesSha256);assert.equal(a.clearEvents,prefix.audits[j].clearEvents);}
  if(tail){assert.deepEqual(u.tailLevel,prefix.tail);assert.equal(u.tailLevelSha256,levelSha256(prefix.tail));assert.equal(tail.sourceLevelSha256,u.tailLevelSha256);assert.equal(tail.floor,1);}
  if(q.route){const full=auditCompleteReverseWitness(rt,q.level,q.drags);assert(full.valid,full.error);assert.equal(full.U,q.U);assert.equal(routeSha256(q.drags),q.routeSha256);
   assert.deepEqual(q.drags,[...input.prefixDrags,...(tail?.drags??[])]);assert(u.valid&&u.complete);assert.deepEqual(u.drags,q.drags);assert.equal(u.U,q.U);
   assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.route.routeSha256,q.routeSha256);assert.equal(q.route.search,null);
   for(const a of [q.route.canonicalReplay,q.route.independentReplay])assert(a.valid&&a.complete&&!a.failed&&a.nonClearingDrags===q.U);
  }else{assert.equal(q.U,null);assert.equal(q.lowerBound,null);assert.equal(q.accepted,false);assert.equal(u.valid,false);}
  if(q.lowerBound){const l=q.lowerBound.result;assert.equal(q.lowerBound.method,'v3-plain');assert.equal(q.lowerBound.inputLevelSha256,q.levelSha256);assert.equal(q.lowerBound.requiredFloor,31);
   assert(q.U>=31);assert.equal(l.sourceLevelSha256,q.levelSha256);assert.equal(l.floor,31);assert.deepEqual(q.proof,l);searchAccounting(l);for(const[k,v]of Object.entries(LOWER_BUDGET))assert.equal(l.budget[k],v);}
  if(q.accepted){const l=q.lowerBound.result;assert.equal(q.status,'EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU');assert.equal(q.L,31);assert(q.U>=31);
   assert(l.thresholdProven&&l.status==='threshold-proven'&&l.termination==='below-threshold-exhausted');assert.equal(q.mathematicalEvidenceValidated,true);successes.push({...input,input:{path:row.path,sha256:row.sha256}});
  }else{assert.equal(q.L,null);assert.equal(q.mathematicalEvidenceValidated,false);for(const file of [stem+'.blocked.json',path.join(PUBLIC_LEDGER,'identities',identity(f)+'.blocked.json')]){
    const b=await r.read(file);assert.equal(b.attemptId,request.id);assert.equal(b.status,q.status);allowed.push(file);}latest.set(branch(input),request.id);}
  rows.push({...row,levelSha256:q.levelSha256,upperWorlds:total,lowerWorlds:q.lowerBound?.result.guardAllowance.conservativeFullBoardStateUpperBound??null,failureSealed:!q.accepted});
 }
 assert.deepEqual((await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),names,'Public requests changed during audit');
 return{completion:c,index,p,rows,allowed,publicRequestCount:names.length};
}
async function audit(mode,d,output,{runtime}={}){
 descriptor(d);assert(!(await exists(output)),'Never overwrite an earlier audit');const r=reader(),errors=[];let data={},rt=runtime;
 try{rt??=await loadV4Runtime();assert.equal(rt.toolchainSha256,FROZEN);await r.map(rt.toolchainBindings);
  const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const f of Object.keys(compiled.metafile.inputs))await r.bytes(f);
  data=mode==='plan'?await planCore(r,rt,d):mode==='static'?await staticCore(r,rt,d):await actualCore(r,rt,d);
  await snapshot(r,data.p,data.allowed??[]);await r.finish();
 }catch(e){errors.push(e.stack??e.message);}
 const report={status:errors.length?statuses[mode].replace(/PASS$/,'FAIL'):statuses[mode],[mode==='plan'?'plan':mode==='static'?'index':'completion']:d,
  ...(mode!=='plan'?{plan:data.index?.plan??data.completion?.batchPlan}:{}),environment:data.p?.executionEnvironment??null,
  rows:(data.rows??[]).map(({level,...row})=>row),verifiedCandidates:mode==='plan'?undefined:data.rows?.length??0,recipeCount:data.p?.blueprints.length,
  accepted:mode==='actual'?(data.rows??[]).filter(q=>q.accepted).length:0,publicRequestCount:data.publicRequestCount,
  errors,fileBindings:r.bindings,newSearches:0,newGameplaySearches:0,newConstructions:0,newLedgerClaims:0,publicClaimsStarted:0,
  proofToolchainSha256:rt?.toolchainSha256,currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false,
  scope:'Read-only recorded evidence and provided-route replay; no search, CSP, construction, public claim, slot admission or current-UI acceptance'};
 await fs.mkdir(output,{recursive:false});const file=path.join(output,'report.json');await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return{...report,reportDescriptor:{path:file,sha256:sha(await fs.readFile(file))}};
}
export const auditLongPrefixPlan=(d,out,options)=>audit('plan',d,out,options);
export const auditLongPrefixStatic=(d,out,options)=>audit('static',d,out,options);
export const auditLongPrefixActual=(d,out,options)=>audit('actual',d,out,options);
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [mode,file,digest,out]=process.argv.slice(2);assert(statuses[mode]&&file&&digest&&out);const report=await audit(mode,{path:file,sha256:digest},out);
 console.log(JSON.stringify({status:report.status,report:report.reportDescriptor,verifiedCandidates:report.verifiedCandidates,errors:report.errors}));if(report.errors.length)process.exitCode=1;
}

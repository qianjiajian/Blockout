import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,assertExecutionPolicyReviewMetadata,DEFAULT_EXECUTION_POLICY_REVIEW,TASK_ENVIRONMENT_PINS} from './prefix-execution-environment-task.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {boardCells,bodyFootprint,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {assertIceProofDomain} from '../formal-v3/bounded-ice-proof.mjs';
import {assertEarlyConstructionPlan,realShapeColourChange,physicalPartition,physicalRetry,EARLY_PLAN_REVIEW_STATUS,auditEarlyPrefixQuotas,HISTORY_ROOTS} from './early-six-task-contract.mjs';
import {auditEarlyFrozenPrefix} from './early-six-task-factory.mjs';
import {assertEarlyFrozenConstructionAccounting} from './early-frozen-ice-joint.mjs';
import {makeEarlyFrozenPrefixTailPlan,auditThawedPrefixBridge} from './early-frozen-prefix-tail-task.mjs';
import {PUBLIC_LEDGER,walkJson} from './native-batch-io.mjs';

// Read-only actual construction audit. No constructor, solver or claim calls.
const SELF='tools/daily-challenge/formal-v4/audit-early-six-static-task.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const points=ps=>JSON.stringify(ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const connected=cells=>{const all=new Set(cells.map(p=>p.join(','))),seen=new Set(),queue=[cells[0]];for(const [x,y]of queue){const k=x+','+y;if(seen.has(k))continue;seen.add(k);for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(all.has(p.join(','))&&!seen.has(p.join(',')))queue.push(p);}return seen.size===all.size;};
const exists=f=>fs.stat(f).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
export async function auditEarlySixExecutionObservation(observation,executionEnvironment,{bound,checkBindings,bytes}){
 assert.equal(observation.status,'REVIEWED_EXECUTION_POLICY_OBSERVED');
 assert.equal(observation.mathematicalIdentityUnchanged,true);assert.equal(observation.currentUIValidated,false);
 const review=await bound(observation.scopeReview);
 assert.equal(executionEnvironment.descriptor.sha256,TASK_ENVIRONMENT_PINS.environment);
 const snapshot=await bound(executionEnvironment.descriptor),sourceRoot=path.resolve(snapshot.sourceWorkspace);
 assert.equal(sourceRoot,executionEnvironment.sourceWorkspace);assert.equal(path.resolve(snapshot.workspace),executionEnvironment.executionWorkspace);
 const mutableManifest=path.join(sourceRoot,'docs/rules/manifest.json');
 assert.notEqual(path.resolve(review.reviewedManifest.path).toLowerCase(),mutableManifest.toLowerCase(),'Policy manifest must be an immutable archive');
 for(const file of Object.keys(observation.reviewBindings))assert.notEqual(path.resolve(file).toLowerCase(),mutableManifest.toLowerCase(),'Mutable root manifest cannot be a mathematical binding');
 const manifest=await bound(review.reviewedManifest),defaultReview=await bound(DEFAULT_EXECUTION_POLICY_REVIEW),anchor=await bound(defaultReview.reviewedManifest);
 assertExecutionPolicyReviewMetadata(review,manifest,manifest,anchor);assert.equal(review.scope,observation.scope);
 const observed=observation.observedCurrentPolicy;
 assert.equal(observed.activeVersion,review.reviewedActiveVersion);assert.equal(manifest.activeVersion,review.reviewedActiveVersion);
 assert.equal(observed.manifest.path,path.join(sourceRoot,'docs/rules/manifest.json'));
 assert.equal(observed.manifest.sha256,review.reviewedManifest.sha256);
 assert.deepEqual(observed.ruleLock,{status:'PASS',verified:manifest.versions.length});
 const active=review.reviewedDocuments.find(r=>r.version===observed.activeVersion);assert(active);
 assert.equal(observed.document.path,path.resolve(sourceRoot,active.originalRelativePath));
 assert.equal(observed.document.sha256,active.archive.sha256);
 await checkBindings(observation.reviewBindings);
 for(const row of review.reviewedDocuments){
  const manifestRow=manifest.versions.find(r=>r.version===row.version);assert(manifestRow);
  assert.equal(row.originalRelativePath,manifestRow.document);assert.equal(row.ruleSha256,manifestRow.sha256);
  assert.notEqual(path.resolve(row.archive.path),path.resolve(sourceRoot,row.originalRelativePath),'Archived document must not alias current root');
  const raw=await bytes(row.archive.path,row.archive.sha256);
  assert.equal(sha(Buffer.from(raw.toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n'))),manifestRow.sha256);
 }
 // Current root is allowed to have a later reviewed policy. These observations
 // certify the immutable scope review actually used at each historical claim.
 return {scopeReview:observation.scopeReview,observedActiveVersion:observed.activeVersion};
}

export function assertEarlyPrefixStaticMetadata(index,plan){
 assert.equal(index.status,'EARLY_SIX_TASK_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');
 assert.equal(index.closedCampaignsExtended,false);assert.equal(index.maximumSeparateExperimentInputs,6);
 const q=auditEarlyPrefixQuotas(plan,index.attempts);assert.deepEqual(q.cspCounts,index.perRecipeColourCspInputs);assert.deepEqual(q.staticCounts,index.perRecipeStaticAttempts);
 for(const k of ['fixedColourInputs','separateExperimentActualInputs','stocksEnteringColourCspIncludingFailed'])assert.equal(index[k],q.total);
 assert.equal(index.eligibleInputs,index.candidates.length);assert(index.candidates.length<=q.total);
 for(const k of ['gameplaySearches','publicLedgerClaims','accepted'])assert.equal(index[k],0);assert.equal(index.formalReady,false);return q;
}
export async function auditEarlyPrefixStatic(inputDirectory,outputFile){
 const fileBindings={},errors=[],rows=[],constructionRows=[],cache=new Map();let index,plan,environment;
 const bytes=async(f,h)=>{const b=await fs.readFile(f),a=sha(b);if(h)assert.equal(a,h,f);for(const key of [f,path.resolve(f)]){if(fileBindings[key])assert.equal(a,fileBindings[key]);fileBindings[key]=a;}return b;};
 const read=async(f,h)=>{const b=await bytes(f,h);if(!cache.has(f))cache.set(f,JSON.parse(b));return cache.get(f);};
 const bound=d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));return read(d.path,d.sha256);};
 const check=async(m,{fresh=false}={})=>{const pairs=Object.entries(m),seen=new Map();for(let i=0;i<pairs.length;i+=32)await Promise.all(pairs.slice(i,i+32).map(async([f,h])=>{
  if(fileBindings[f])assert.equal(fileBindings[f],h,'Conflicting repeated binding '+f);
  const absolute=path.resolve(f);if(fileBindings[absolute])assert.equal(fileBindings[absolute],h,'Conflicting path alias '+f);
  if(seen.has(absolute)){assert.equal(seen.get(absolute),h);return;}seen.set(absolute,h);
  if(!fresh&&fileBindings[absolute]){fileBindings[f]=h;return;}await bytes(f,h);
 }));};
 const requestNames=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(f=>f.endsWith('.request.json')).sort();
 const before=await requestNames();let result;
 try{
  const rt=await loadV4Runtime();environment=prefixExecutionEnvironment(rt);await check(rt.toolchainBindings);await check(environment.bindings);
  const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',metafile:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
  for(const f of Object.keys(compiled.metafile.inputs))await bytes(f.replaceAll('\\','/'));
  index=await read(inputDirectory+'/index.json');plan=await bound(index.plan);assertEarlyConstructionPlan(plan);await check(plan.bindings);
  assert.equal(index.sourceConstructionIndex,undefined,'No old metadata repair envelope');
  const physicalIndex=index,physicalDirectory=inputDirectory,staticSlot=plan.staticSlot;
  assertEarlyPrefixStaticMetadata(index,plan);
  assert.equal(index.status,'EARLY_SIX_TASK_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH');assert.deepEqual(index.executionEnvironment,environment);assert.deepEqual(plan.executionEnvironment,environment);
  const review=await bound(index.recipeReview);assert.equal(review.status,EARLY_PLAN_REVIEW_STATUS);assert.deepEqual(review.plan,index.plan);assert.deepEqual(review.errors,[]);await check(review.fileBindings);
  const qualification=await bound(plan.constructorQualification);assert.equal(qualification.status,'INDEPENDENT_EARLY_SIX_TASK_PASS');assert.deepEqual(qualification.errors,[]);
  assert.equal(index.closedCampaignsExtended,false);assert.equal(index.maximumSeparateExperimentInputs,6);
  assert.equal(index.separateExperimentActualInputs,index.fixedColourInputs);assert.equal(index.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);assert.equal(index.eligibleInputs,index.candidates.length);
  assert(index.fixedColourInputs<=6&&index.attempts.length<=1800);assert.equal(new Set(index.attempts.map(a=>a.index)).size,index.attempts.length);assert.equal(new Set(index.candidates.map(a=>a.path)).size,index.candidates.length);
  for(const k of ['gameplaySearches','publicLedgerClaims','accepted'])assert.equal(index[k],0);assert.equal(index.formalReady,false);
  const start=await read(path.join(physicalDirectory,'execution-start.json'));assert.deepEqual(start.plan,index.plan);assert.deepEqual(start.recipeReview,index.recipeReview);
  assert.deepEqual(start.executionPolicyObservation,index.executionPolicyObservation);
  await auditEarlySixExecutionObservation(index.executionPolicyObservation,environment,{bound,checkBindings:check,bytes});
  const claim=await read(start.claim.claimFile,start.claim.claimSha256),terminal=await read(start.claim.resultFile);
  assert.equal(claim.qualificationOnly,false);assert.equal(claim.publicMathematicalClaim,false);assert.equal(claim.retryAllowed,false);assert.equal(claim.outputDirectory,path.resolve(physicalDirectory));assert.deepEqual(claim.plan,index.plan);
  assert.deepEqual(terminal.executionPolicyObservation,index.executionPolicyObservation);assert.equal(terminal.status,index.status);assert.equal(terminal.failureReason,null);assert.deepEqual(terminal.plan,index.plan);assert.equal(terminal.staticAttempts,index.attempts.length);
  assert.deepEqual(terminal.constructionFiles,index.attempts.map(a=>a.constructionEvidence));assert.equal(terminal.stocksEnteringColourCspIncludingFailed,index.fixedColourInputs);assert.equal(terminal.eligibleInputs,physicalIndex.candidates.length);assert.equal(terminal.gameplaySearches,0);assert.equal(terminal.publicMathematicalClaims,0);
  const selectedIndex=await bound(plan.selectedIndex);assert.equal(selectedIndex.scope,300);assert.equal(selectedIndex.files.length,plan.selectedCount);assert.deepEqual(selectedIndex.files,plan.selected.map(d=>d.path));
  const selected=await Promise.all(plan.selected.map(bound)),old450=await Promise.all(plan.old450.map(bound));assert.equal(old450.length,450);
  const history=[...await Promise.all([...plan.previousMacro,...plan.comparisonOnly].map(bound)),...plan.previousLateStocks];
  for(const d of plan.previousLateStocks)await bound(d);
  for(const bp of plan.blueprints){
   const ref=await bound(bp.reference);assert(ref.accepted);assert.equal(levelSha256(ref.level),bp.referenceLevelSha256);assert.equal(routeSha256(ref.drags),bp.referenceRouteSha256);assert.deepEqual(ref.level,bp.level);assert.deepEqual(ref.drags.slice(0,bp.cut),bp.prefixDrags);
   const fp=bp.failedParent,q=await bound(fp.candidate),req=await bound(fp.request),res=await bound(fp.result);assert.deepEqual(req,q.attempt);assert.equal(q.accepted,false);assert.equal(res.accepted,false);assert.equal(res.status,q.status);assert.equal(res.levelSha256,q.levelSha256);assert.equal(levelSha256(q.level),q.levelSha256);
   assert.deepEqual(res.lower,q.proof);assert.deepEqual(res.upper,q.route?.search);
   for(const d of [fp.blocked,fp.identityBlocked])assert.equal((await bound(d)).attemptId,req.id);assert.deepEqual(designFingerprints(q.level),fp.fingerprints);
  }
  assert.equal(plan.publicStocks.length,before.length);assert.deepEqual(plan.publicStocks.map(d=>path.basename(d.path)).sort(),before);for(const d of plan.publicStocks)await bound(d);
  const oldPartitions=new Set([...history,...selected].map(q=>physicalPartition(q.level))),sourceShapes=new Map(plan.blueprints.map(b=>[b.sourceLevelId,new Set([b.failedParent.fingerprints.shapeSha256])])),fullHistory=new Map(),byCandidate=new Map(),counts=Object.fromEntries(plan.blueprints.map(b=>[b.recipeId,0]));
  for(const bp of plan.blueprints){const prior=plan.previousLateStocks.filter(q=>q.sourceLevelId===bp.sourceLevelId&&q.reference?.path===bp.reference.path).map(q=>designFingerprints(q.level));
   sourceShapes.set(bp.sourceLevelId,new Set([bp.failedParent.fingerprints.shapeSha256,...prior.map(q=>q.shapeSha256)]));fullHistory.set(bp.sourceLevelId,prior);}
  for(const a of index.attempts){
   const old=physicalIndex.attempts.find(x=>x.index===a.index);assert(old);for(const k of ['index','recipeId','sourceLevelId','seed','bodyCountDelta','enteredColourCsp','status','constructionEvidence'])assert.deepEqual(a[k],old[k]);
   const b=await bound(a.constructionEvidence),bp=plan.blueprints[a.index%6];assert.equal(a.recipeId,bp.recipeId);assert.equal(a.sourceLevelId,bp.sourceLevelId);assert.equal(a.status,b.status);
   assert.deepEqual(b.plan,index.plan);assert.deepEqual(b.recipeReview,index.recipeReview);assert.deepEqual(b.executionEnvironment,environment);assert.deepEqual(b.executionPolicyObservation,index.executionPolicyObservation);assert.equal(b.searchPerformed,false);
   const localAttempt=Math.floor(a.index/6);assert.equal(a.localAttempt,localAttempt);assert(localAttempt<300);
   assert.equal(a.seed,bp.seed+localAttempt*plan.sequence.step);assert.deepEqual(b.options,{seed:a.seed,colourSeed:a.seed,bodyCountDelta:a.bodyCountDelta});assert.equal(a.bodyCountDelta,plan.sequence.bodyCountDeltas[localAttempt%plan.sequence.bodyCountDeltas.length]);
   const entered=Boolean(b.paint);assert.equal(a.enteredColourCsp,entered);if(entered)counts[bp.recipeId]++;
   const c=b.constructionAccounting;assert.equal(c.version,'early-frozen-static-shared-v1');for(const k of ['placeholderWorldReservations','completedColourWorldReservations','icedWorldReservations','completeWorldReservations','transitions','microStates','elapsedMilliseconds'])assert(Number.isSafeInteger(c[k])&&c[k]>=0,k);
   assert.equal(c.completeWorldReservations,c.placeholderWorldReservations+c.completedColourWorldReservations+c.icedWorldReservations);assert(c.completeWorldReservations<=9998&&c.transitions<=10000000&&c.microStates<=3000000);
   assert.equal(c.placeholderWorldReservations,b.placeholderWorld?1:0);assert.equal(c.completedColourWorldReservations,b.paint?.accounting.completeWorldReservations??0);assert.equal(c.icedWorldReservations,b.level?1:0);
   const priorFull=fullHistory.get(bp.sourceLevelId)??[];
   if(b.placeholderWorld){const f=designFingerprints(b.placeholderWorld);assert.equal(f.shapeSha256,b.stockFingerprints.shapeSha256);
    if(entered){assert(!sourceShapes.get(bp.sourceLevelId).has(f.shapeSha256));assert(!oldPartitions.has(physicalPartition(b.placeholderWorld)));}
    sourceShapes.get(bp.sourceLevelId).add(f.shapeSha256);oldPartitions.add(physicalPartition(b.placeholderWorld));}
   if(b.paint){const p=b.paint.accounting;assert.equal(b.paint.completeColourAssignments,p.completeWorldReservations);assert.equal(p.completeAssignmentsAreChargedEvenOnFailure,true);assert.equal(p.gameBoardBranchSearches,0);assert.equal(p.searchPerformed,false);
    for(const[k,cap]of [['nodes',3000],['cspTransitions',6000],['microStates',100000],['microTransitions',400000],['completeWorldReservations',3000]])assert(Number.isSafeInteger(p[k])&&p[k]>=0&&p[k]<=cap,k);
    assert.equal(p.transitions,p.cspTransitions+p.microTransitions);assert.equal(c.transitions,b.partition.transitions+p.transitions);assert.equal(c.microStates,p.microStates);}
   else{assert.equal(c.transitions,b.partition.transitions??0);assert.equal(c.microStates,0);}
   if(b.plain){const p=await bound(b.plainConstructionEvidence);assert.deepEqual(p,b.plain);assert.equal(p.levelSha256,levelSha256(p.level));assert(p.paint.ok);assert.deepEqual(p.level.gates,bp.level.gates);
    const pc=p.constructionAccounting;assert.equal(pc.completeWorldReservations,1+p.paint.accounting.completeWorldReservations);assert.equal(pc.transitions,c.transitions);assert.equal(pc.microStates,c.microStates);assert(c.elapsedMilliseconds>=pc.elapsedMilliseconds);
    fullHistory.set(bp.sourceLevelId,[...priorFull,designFingerprints(p.level)]);}
   if(a.candidate){assert.equal(b.ok,true);assert(b.plain&&b.level);assertEarlyFrozenConstructionAccounting(c);assert(c.elapsedMilliseconds<30000);byCandidate.set(a.candidate.path,{attempt:a,built:b,bp,priorFull});}
   constructionRows.push({index:a.index,recipeId:a.recipeId,source:a.sourceLevelId,status:b.status,evidence:a.constructionEvidence,enteredColourCsp:entered,constructionAccounting:c,completeColourAssignments:b.paint?.completeColourAssignments??null,formedPlainRetained:Boolean(b.plain)});
  }
  for(const bp of plan.blueprints){assert(counts[bp.recipeId]<=bp.maximumStocks);assert.equal(counts[bp.recipeId],index.perRecipeColourCspInputs[bp.recipeId]??0);}assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),index.fixedColourInputs);
  assert.deepEqual((await fs.readdir(physicalDirectory)).filter(n=>/^construction-.*\.json$/.test(n)).sort(),index.attempts.map(a=>path.basename(a.constructionEvidence.path)).sort());
  assert.deepEqual((await fs.readdir(inputDirectory)).filter(n=>/^candidate-.*\.json$/.test(n)).sort(),index.candidates.map(a=>path.basename(a.path)).sort());
  const eligible=[];
  for(const item of index.candidates){
   const q=await bound(item),pair=byCandidate.get(item.path);assert(pair);const {built:b,bp,priorFull}=pair;
   for(const k of ['level','levelSha256','prefixDrags','prefixSha256','constructionAccounting','partition','paint','stockFingerprints','iceDeclaration','plainConstructionEvidence','prefixAudit','thawedPrefixBridge'])assert.deepEqual(q[k],b[k]);
   assert.deepEqual(q.constructionEvidence,pair.attempt.constructionEvidence);assert.deepEqual(q.fixedBatchPlan,index.plan);assert.equal(q.recipeId,bp.recipeId);assert.equal(q.sourceLevelId,bp.sourceLevelId);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.prefixSha256,routeSha256(q.prefixDrags));assert.equal(item.levelSha256,q.levelSha256);assert.equal(item.prefixSha256,q.prefixSha256);
   assert.deepEqual(q.executionPolicyObservation,index.executionPolicyObservation);assert.equal(q.status,'STATIC_EARLY_PREFIX_INPUT_AWAITING_FIRST_PUBLIC_CLAIM');for(const k of ['accepted','catalogEligible','formalReady','mathematicalEvidenceValidated','mechanismStrengthValidated','designValidated','slotAssigned'])assert.equal(q[k],false);assert.equal(q.L,null);assert.equal(q.U,null);assert.equal(q.gameplaySearches,0);assert.equal(q.predeclaredUpperStrategy,'one-thawed-prefix-plain-tail-original-ice-lower');
   const source=rt.LEVELS.find(l=>l.id===q.sourceLevelId);assert.equal(q.sourceLevelSha256,levelSha256(source));assert.equal(points(boardCells(source)),points(boardCells(q.level)));assert.equal(q.level.width,source.width);assert.equal(q.level.height,source.height);
   const sourceBinding=await currentMainlineSourceBinding(rt,environment,source.id);await check(sourceBinding.bindings);
   assert.deepEqual(q.prefixDrags,bp.prefixDrags);assert.deepEqual(q.level.gates,bp.level.gates);assert.deepEqual(b.plain.provenance.region,bp.region);assert.deepEqual(b.plain.provenance.reference,bp.reference);
   const oldSet=new Set(bp.level.blocks.map(bodyFootprint)),newSet=new Set(q.level.blocks.map(bodyFootprint)),oldBodies=bp.level.blocks.filter(x=>!newSet.has(bodyFootprint(x))),newBodies=q.level.blocks.filter(x=>!oldSet.has(bodyFootprint(x)));
   assert.equal(points(oldBodies.flatMap(absoluteCells)),points(bp.region.cells));assert.equal(points(newBodies.flatMap(absoluteCells)),points(bp.region.cells));assert(connected(bp.region.cells));assert(bp.region.cells.length/boardCells(q.level).length>=.35);assert.equal(points(q.level.blocks.flatMap(absoluteCells)),points(boardCells(q.level)));
   for(const fixed of bp.fixedBlocks)assert.deepEqual(q.level.blocks.find(x=>x.id===fixed.id),fixed);
   assert.deepEqual(q.iceDeclaration.regionBlockIds,newBodies.map(x=>x.id));assert.equal(q.iceDeclaration.count,bp.iceCount);for(const block of q.level.blocks)assert.equal(block.frozen,newBodies.some(b=>b.id===block.id)?bp.iceCount:undefined);
   const stripped=structuredClone(q.level);for(const x of stripped.blocks)delete x.frozen;assert.deepEqual(stripped,b.plain.level);assertIceProofDomain(q.level);
   const f=designFingerprints(q.level);assert.deepEqual(q.stockFingerprints,f);for(const p of [designFingerprints(bp.level),bp.failedParent.fingerprints,...priorFull])assert(realShapeColourChange(p,f));assert.deepEqual(q.branchProvenance.previousNewFixedInputs,priorFull);assert.deepEqual(q.branchProvenance.failedParent,bp.failedParent);assert.equal(q.redesignOf,bp.failedParent.attemptId);
   for(const old of [...history,...selected,...eligible])assert.notEqual(physicalPartition(q.level),physicalPartition(old.level));
   const retry=physicalRetry(f);for(const file of [`${PUBLIC_LEDGER}/identities/${retry}.json`,`${PUBLIC_LEDGER}/identities/${retry}.blocked.json`,`${PUBLIC_LEDGER}/${f.designSha256}.request.json`,`${PUBLIC_LEDGER}/${f.designSha256}.blocked.json`])assert(!await exists(file),'Existing identity '+file);
   assert(!plan.publicStocks.some(p=>p.retryIdentitySha256===retry||p.designSha256===f.designSha256));
   const nearest=pool=>pool.reduce((m,p)=>Math.max(m,compareLayouts(q.level,p.level).footprintSimilarity),0);
   const similarity={reference:compareLayouts(q.level,bp.level).footprintSimilarity,source:compareLayouts(q.level,source).footprintSimilarity,selected:nearest(selected),priorMacro:nearest(history),old450:nearest(old450),batch:nearest(eligible)};
   assert.deepEqual(similarity,b.plain.geometryAudit.similarity);
   for(const[k,v]of Object.entries(similarity))assert(v<=(k==='source'?.55:k==='old450'?.75:.65)+1e-12,k);
   const staticAudit=await auditV4StaticCandidate(rt,{...staticSlot,sourceLevelId:q.sourceLevelId,level:q.level});assert(staticAudit.passed,staticAudit.issues?.join(';'));assert.deepEqual(staticAudit,q.inputStaticAudit);for(const[f,h]of Object.entries(staticAudit.assetBindings))await bytes(path.posix.join('public',f),h);await check(b.plain.assetBindings);
   const prefix=auditEarlyFrozenPrefix(rt,q.level,q.prefixDrags,q.iceDeclaration);assert.deepEqual(prefix,q.prefixAudit);assert(prefix.clearEvents>=bp.iceCount);assert.equal(prefix.clearEvents,bp.prefixFacts.clears);assert.equal(prefix.nonClearingDrags,bp.prefixFacts.parking);assert.equal(prefix.fullUValidated,false);
   const bridge=auditThawedPrefixBridge(rt,q.level,b.plain.level,q.prefixDrags,q.iceDeclaration);assert.deepEqual(bridge,q.thawedPrefixBridge);
   const mathPlan=makeEarlyFrozenPrefixTailPlan(rt,q,{floor:31,searchUpper:128,upperBudget:plan.futureUpperBudget,lowerBudget:plan.futureLowerBudget});assert.deepEqual(mathPlan,q.predeclaredMathematics);
   assert.equal(mathPlan.innerPlan.tailBudget.maxStates,9999-q.constructionAccounting.completeWorldReservations-2*(q.prefixDrags.length+1));
   eligible.push(q);rows.push({candidate:item,recipeId:bp.recipeId,sourceLevelId:q.sourceLevelId,levelSha256:q.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,changedArea:bp.region.cells.length,totalArea:boardCells(q.level).length,changedOldBodies:oldBodies.length,changedNewBodies:newBodies.length,allOriginalGatesPreserved:true,sourceBinding,iceDeclaration:q.iceDeclaration,similarity,staticAudit,prefix,bridge,constructionAccounting:q.constructionAccounting,futureTailBudget:mathPlan.innerPlan.tailBudget,futureOriginalIceLowerBudget:mathPlan.lowerBudget,publicIdentity:{retry,design:f.designSha256,unclaimed:true}});
  }
  const normalized=f=>path.resolve(f).toLowerCase(),allowed=new Set([start.claim.claimFile,start.claim.resultFile].map(normalized));
  assert.deepEqual(plan.ledgerSnapshot.roots.map(r=>normalized(r.directory)).sort(),HISTORY_ROOTS.map(normalized).sort());
  for(const root of plan.ledgerSnapshot.roots){const expected=new Map(root.files.map(d=>[normalized(d.path),d]));assert.equal(expected.size,root.files.length);
   for(const d of root.files)assert(normalized(d.path).startsWith(normalized(root.directory)+path.sep));
   await check(Object.fromEntries(root.files.map(d=>[d.path,d.sha256])));
   for(const f of await exists(root.directory)?await walkJson(root.directory):[])assert(expected.has(normalized(f))||allowed.has(normalized(f)),'Unreviewed history '+f);}
  assert.deepEqual(await requestNames(),before);await check(fileBindings,{fresh:true});
  result={status:'INDEPENDENT_EARLY_SIX_STATIC_PASS',index:{path:inputDirectory+'/index.json',sha256:fileBindings[inputDirectory+'/index.json']},plan:index.plan,recipeReview:index.recipeReview,sourceConstructionIndex:index.sourceConstructionIndex??null,staticMetadataCorrection:index.staticMetadataCorrection??null,originalEligibleInputs:physicalIndex.eligibleInputs,environment,executionPolicyObservation:index.executionPolicyObservation,fileBindings,errors,rows,constructionRows,verifiedCandidates:rows.length,staticPartitionAttempts:index.attempts.length,stocksEnteringColourCspIncludingFailed:index.fixedColourInputs,perRecipeColourCspInputs:counts,separateExperimentActualInputs:index.fixedColourInputs,closedCampaignsExtended:false,publicRequestCountBefore:before.length,publicRequestCountAfter:(await requestNames()).length,publicClaimsStarted:0,newGameplaySearches:0,newConstructionCalls:0,providedPrefixReplays:rows.length*2,fullUValidated:false,L:null,U:null,formalReady:false,canvasRendered:false,currentRuntimeValidationClaimed:false,limitations:'Actual full static stock, independent supplied ice prefix and resource evidence only; no L/U search, full-U certificate, mechanism-strength or slot admission. The basic slot is static validation only; no slot is assigned. The original iced prefix and complete thawed-cut state bridge are replayed without tail search.'};
 }catch(e){errors.push(e.message);result={status:'INDEPENDENT_EARLY_SIX_STATIC_FAIL',index:index?{path:inputDirectory+'/index.json',sha256:fileBindings[inputDirectory+'/index.json']}:null,plan:index?.plan??null,environment,fileBindings,errors,stack:e.stack,rows,constructionRows,verifiedCandidates:rows.length,publicClaimsStarted:0,newGameplaySearches:0,newConstructionCalls:0,formalReady:false};}
 await fs.writeFile(outputFile,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[input,out]=process.argv.slice(2);assert(input&&out);const r=await auditEarlyPrefixStatic(input,out);console.log(JSON.stringify({status:r.status,verifiedCandidates:r.verifiedCandidates,errors:r.errors,output:out,sha256:sha(await fs.readFile(out))}));if(r.errors.length)process.exitCode=1;}

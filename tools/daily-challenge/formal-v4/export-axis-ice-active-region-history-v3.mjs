import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {BATCH_PARENT_POLICY,createOrderedFailedParentOverlay} from './active-region-batch-parent-overlay-v1.mjs';
import {compileCanonicalHistoryPath as parentCanonical} from './canonical-history-path-compiled.mjs';
const compileParentCanonical=scope=>parentCanonical(scope).canonical;

// Metadata only, once after the actual completion and independent audit.
// Original owners are never synthesized. No new domain/model/replay/search.
const V='deliverables/daily-formal-v4-20261008/',P=V+'proof/',T='tools/daily-challenge/formal-v4/';
export const SELF=T+'export-axis-ice-active-region-history-v3.mjs';
export const PREDECESSOR={path:T+'export-axis-ice-active-region-history-v2.mjs',sha256:'9ff92b115f231bfb05e3341df53e5603272fa954c524027aa7dbb374ce810a4c'};
const pins={
 [T+'active-region-batch-parent-overlay-v1.mjs']:'b0f9950aa40336aa53d95e74e744d8eb10f7eb063af3af087ab0148838c36455',
 [T+'plan-history-adapter-v6.mjs']:'4b62c5bdc954e3f4df1d45b6dbffa8fdfd2b8f29a1fca2e76e3376729a2d1bcf',
 [T+'canonical-history-path-compiled.mjs']:'8682bb896edd01d6204a3c3d6128fd600cc8313aedd44820816c4b494d1e6ed7',
 [T+'axis-ice-active-region-batch-task-v2_1.mjs']:'6b02f24a6411f1b408d0dc0dde2d21bb19a79929ea99036b3af6a790024e0051',
 [T+'axis-ice-active-region-stock-v2.mjs']:'6e47e1893b23ab2db3dee5bfc9a9077669c9004a777f5bc602173077fb1ec64d',
 [T+'active-region-core-diversity-v3.mjs']:'dcb61666cc1e941f5ea32ee471eae189c78e8f7f464ad589fccb186083a835bb'
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function exportActiveRegionHistory(configuration){
const fileBindings={},cache=new Map();
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Real immutable descriptor required');
async function read(d){descriptor(d);const k=await fs.realpath(d.path);let b=cache.get(k);if(!b){b=await fs.readFile(k);cache.set(k,b);}assert.equal(sha(b),d.sha256,d.path);if(fileBindings[d.path])assert.equal(fileBindings[d.path],d.sha256);fileBindings[d.path]=d.sha256;return b;}
const json=async d=>JSON.parse(await read(d));
const absent=async p=>fs.lstat(p).then(()=>{throw Error('Immutable output/forbidden file exists: '+p);},e=>{if(e.code!=='ENOENT')throw e;});
const fd=async p=>({path:p,sha256:sha(await fs.readFile(p))});
const load=p=>import(pathToFileURL(path.resolve(p)).href),desc=d=>({path:d.path,sha256:d.sha256});
assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');
// Usage: node tools/daily-challenge/formal-v4/export-axis-ice-active-region-history-v3.mjs CONFIG.json CONFIG_SHA256
// The immutable config supplies already-existing audit descriptors. No future
// result hash or batch source list is embedded in this reusable exporter.
const cli=await json(configuration);
assert.deepEqual(Object.keys(cli).sort(),['actualReview','completion','futureSourceLevelIds','outputDirectory','plan','planReview','priorHistoryReport']);
for(const k of ['priorHistoryReport','plan','planReview','completion','actualReview']){descriptor(cli[k]);assert(cli[k].path.replaceAll('\\','/').startsWith(V),'Artifact must be in this frozen campaign');}
assert(Array.isArray(cli.futureSourceLevelIds));assert.equal(new Set(cli.futureSourceLevelIds).size,cli.futureSourceLevelIds.length);
for(const n of cli.futureSourceLevelIds)assert(Number.isSafeInteger(n)&&n>=1&&n<=200,'Future source ID');
const OUT=cli.outputDirectory;
assert(typeof OUT==='string'&&OUT.startsWith(P)&&!OUT.includes('\\')&&path.posix.normalize(OUT)===OUT&&OUT!==P.slice(0,-1),'New relative proof output directory required');
assert(path.resolve(OUT).startsWith(path.resolve(P)+path.sep));await absent(OUT);
await read(PREDECESSOR);
for(const[p,h]of Object.entries(pins))await read({path:p,sha256:h});
const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,readDirectHistoryRole,PLAN_HISTORY_VERSION}=await load(T+'plan-history-adapter-v6.mjs');
const {compileCanonicalHistoryPath}=await load(T+'canonical-history-path-compiled.mjs');
const {levelSha256}=await load('tools/daily-challenge/formal-v2/contract.mjs');
const {sealedWorldIdentity}=await load(T+'sealed-history-contract.mjs');
const {PUBLIC_LEDGER}=await load(T+'low-twenty-io.mjs'); // Exact lexical paths used by the original task owner.
const {observeExecutionPolicy}=await load(T+'prefix-execution-environment-task.mjs');
const api=await load(T+'axis-ice-active-region-batch-task-v2_1.mjs');
const {loadActiveCoreIndex}=await load(T+'active-region-core-diversity-v3.mjs');
const p=await json(cli.plan),ctx=await json(p.contextDescriptor),pr=await json(cli.planReview),done=await json(cli.completion),actual=await json(cli.actualReview),prior=await json(cli.priorHistoryReport);
const CHECKPOINT=ctx.history,CHECKPOINT_REVIEW=ctx.historyReview,QUALIFICATION=ctx.qualification,SELECTION=ctx.selection,HEAD=ctx.historyHeadSha256;
const hq=await json(CHECKPOINT_REVIEW),qualification=await json(QUALIFICATION),selected=await json(SELECTION),N=p.maximumInputs;
assert(Number.isSafeInteger(N)&&N>=1&&N<=64);assert.equal(p.version,api.VERSION);assert.equal(p.recipes.length,N);assert.equal(p.historyHeadSha256,HEAD);assert.equal(p.firstFullIsTerminal,true);assert.equal(p.historyLoads,1);assert.equal(p.runtimeLoads,1);assert.deepEqual(p.constructionLimits,api.LIMITS);assert.equal(p.stageAccountingVersion,api.STAGE_ACCOUNTING_VERSION);
assert.equal(pr.status,api.REVIEW_STATUS.plan);assert.equal(pr.mode,'plan');assert.deepEqual(pr.plan,cli.plan);assert.deepEqual(pr.errors,[]);
assert.equal(ctx.version,p.version);assert.equal(ctx.experimentId,p.experimentId);assert.equal(ctx.maximumInputs,N);assert.equal(ctx.failedInputRebandAllowed,false);assert.equal(ctx.fallbackAllowed,false);
assert(['WHOLEBOARD_AXIS_ICE_BATCH_HISTORY_DELTAS_EXPORTED_AND_V5_VALIDATED','ACTIVE_REGION_AXIS_ICE_BATCH_HISTORY_DELTAS_EXPORTED_AND_V6_VALIDATED'].includes(prior.status));assert.deepEqual(prior.errors,[]);assert.equal(prior.headSha256,HEAD);assert.deepEqual(prior.checkpoint,CHECKPOINT);assert.deepEqual(prior.checkpointReview,CHECKPOINT_REVIEW);assert.deepEqual(prior.historyScope,ctx.historyScope);assert.deepEqual(prior.completeHistoryDeltas,[...prior.priorHistoryDeltas,...prior.historyDeltas]);assert.deepEqual(ctx.historyDeltas,prior.completeHistoryDeltas);assert(ctx.historyDeltas.length>0);assert.equal(ctx.historyDeltas.at(-1).descriptor.sha256,HEAD);
assert.equal(hq.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(hq.errors,[]);assert.deepEqual(hq.checkpoint,CHECKPOINT);assert.equal(hq.fullMergedBundleEquality,true);assert.equal(hq.allFieldsPreserved,true);await read(hq.authorReport);await read(hq.provenance);
assert.equal(qualification.status,api.QUALIFICATION_STATUS);assert.deepEqual(qualification.errors,[]);for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(qualification[k],0);for(const[p,h]of Object.entries(pins))assert.equal(qualification.toolBindings[p],h);for(const[p,h]of Object.entries(qualification.toolBindings))await read({path:p,sha256:h});
assert.equal(selected.files.length,161);const sources=[...new Set(p.recipes.map(row=>row.recipe.sourceLevelId))];assert.equal(ctx.failedParents.length,sources.length);assert.equal(p.parentResolutionPolicy,BATCH_PARENT_POLICY);
const expectedParents=sources.map(sourceLevelId=>{const matches=prior.futureParents.resolved.filter(r=>r.sourceLevelId===sourceLevelId);assert.equal(matches.length,1,'Prior export must resolve exactly one original parent per source');const r=matches[0];assert.equal(r.status,'RESOLVED_ORIGINAL_FAILED_PARENT');assert.equal(r.readDirectHistoryRolePassed,true);return{sourceLevelId:r.sourceLevelId,receipt:r.receipt};});
assert.equal(prior.futureParents.historyHeadSha256,HEAD);assert.deepEqual(ctx.failedParents,expectedParents);
const proposal=await json(ctx.proposal),proposalReview=await json(ctx.proposalReview);assert.equal(proposal.status,'METADATA_DESIGN_PROPOSAL_NOT_EXECUTABLE');assert.equal(proposal.executable,false);assert.equal(proposal.schemaVersion,1);assert.deepEqual(proposal.selection,SELECTION);assert.deepEqual(p.proposal,ctx.proposal);assert.deepEqual(p.proposalReview,ctx.proposalReview);assert.equal(p.experimentId,proposal.experimentId);assert.deepEqual(p.recipes.map(q=>q.recipe),proposal.recipes);api.assertWholeBoardBatchProposal(proposal,N);assert.deepEqual(p.admissionPolicy,proposal.admissionPolicy);
assert.equal(proposalReview.status,api.PROPOSAL_REVIEW_STATUS);assert.deepEqual(proposalReview.proposal,ctx.proposal);assert.deepEqual(proposalReview.errors,[]);for(const k of ['newConstructions','newSearches','newClaims'])assert.equal(proposalReview[k],0);
const slots=Object.entries(p.admissionPolicy.slotsByBand).flatMap(([difficulty,rows])=>rows.map(row=>({...row,difficulty:Number(difficulty)})));assert.equal(p.slotRows.length,slots.length);
for(const [i,row]of p.slotRows.entries()){const wanted=slots[i];assert.equal(row.slot.formalId,wanted.formalId);assert.equal(row.slot.difficulty,wanted.difficulty);assert.deepEqual(row.priorSlot,wanted.priorSlot);await read(row.priorSlot);}
for(const row of p.recipes){api.assertWholeBoardRecipe(row.recipe);assert.deepEqual(row.futureReservationsDeclared,api.futureReservations(row.recipe));assert.deepEqual(row.phaseQuotes,api.adaptivePhaseQuotes(row.recipe));assert.deepEqual(row.jointBudget,api.JOINT_BUDGET);assert.equal(row.rawSetMaximum,9999);assert.equal(row.searchGuardAllowance,1);}
const policyObservation=observeExecutionPolicy(p.environment);
api.assertCompleteBatchDisposition(done.disposition);assert.equal(done.status,'WHOLEBOARD_BATCH_TASK_CLOSED');assert.deepEqual(done.plan,cli.plan);assert.equal(done.closed,true);assert.equal(done.finalizationError,null);assert.equal(done.maximumInputs,N);assert.equal(done.consumedInputs,N);assert.equal(done.receipts.length,N);assert.equal(done.externalOwnerIndexOnly,true);assert.equal(done.historyLoads,1);assert.equal(done.runtimeLoads,1);
assert.equal(actual.status,api.REVIEW_STATUS.actual);assert.equal(actual.mode,'actual');assert.deepEqual(actual.completion,cli.completion);assert.deepEqual(actual.plan,cli.plan);assert.deepEqual(actual.candidates,done.receipts);assert.deepEqual(actual.errors,[]);for(const k of ['newSearches','newConstructions','newReplayCalls','publicClaimsStarted'])assert.equal(actual[k],0);for(const[p,h]of Object.entries(actual.fileBindings))await read({path:p,sha256:h});
const canonical=compileCanonicalHistoryPath(ctx.historyScope).canonical,rootFor=p=>ctx.historyScope.roots.find(r=>canonical(p).startsWith(canonical(r.physicalPath)+'/'))?.id??null;
const publicRoot=ctx.historyScope.roots.find(r=>r.id==='public'),lateRoot=ctx.historyScope.roots.find(r=>r.id==='late');assert(publicRoot&&lateRoot);const pub=publicRoot.physicalPath,actualDir=path.dirname(cli.completion.path),constructionPaths=api.constructionFiles(cli.plan,p);
assert.equal(canonical(done.constructionOwner.path),canonical(actualDir+'/construction.owner.definition.json'));assert.equal(canonical(done.mathOwner.path),canonical(actualDir+'/math.owner.definition.json'));
// Re-read original immutable receipts, including formed-but-unclaimed and late
// rejected mathematical successes. Never export only the accepted subset.
const qs=[],acceptedFormalIds=[];
for(const[i,d]of done.receipts.entries()){
 assert.equal(canonical(d.path),canonical(actualDir+'/candidate-'+(i+1)+'.json'));const q=await json(d),row=p.recipes[i];
 assert.equal(q.version,p.version);assert.equal(q.experimentId,p.experimentId);assert.deepEqual(q.plan,cli.plan);assert.equal(q.recipeIndex,i);assert.equal(q.recipeId,row.recipe.recipeId);assert.equal(q.sourceLevelId,row.recipe.sourceLevelId);assert.equal(q.stageKey,row.recipe.targetStageKey);assert.equal(q.historyHeadSha256,HEAD);assert.equal(q.formalReady,false);assert.equal(q.mathematicalEvidenceValidated,q.joint?.accepted===true);assert.equal(q.redesignRequired,!q.accepted);assert(Array.isArray(q.errors));
 let built=null;
 if(q.constructionEvidence){assert.equal(canonical(q.constructionEvidence.path),canonical(actualDir+'/construction-'+(i+1)+'.json'));built=await json(q.constructionEvidence);api.assertWholeBoardConstruction(built,row.recipe);assert.deepEqual(built.plan,cli.plan);assert.equal(built.recipeId,q.recipeId);assert.equal(built.sourceLevelId,q.sourceLevelId);assert.deepEqual(built.level,q.level);assert.equal(built.levelSha256,q.levelSha256);api.assertWholeBoardPhaseAccounting(built,q.accounting,q.joint);}
 else{assert(['WHOLEBOARD_NOT_STARTED_CONSUMED','WHOLEBOARD_FACTORY_PRECHECK_REFUSED'].includes(q.status));if(q.accounting){api.assertWholeBoardAccounting(q.accounting);for(const k of ['worlds','partialNodes','transitions','micro'])assert.equal(q.accounting[k],0);assert.deepEqual(q.accounting.reservations,[]);}else assert.equal(q.status,'WHOLEBOARD_NOT_STARTED_CONSUMED');}
 if(q.level){assert.equal(q.levelSha256,levelSha256(q.level));api.assertWholeBoardMechanisms(q.level,row.recipe);assert(built);if(built.status!=='FIRST_FULL_AXIS_ICE_TERMINAL'){assert.equal(q.attempt,null);assert.equal(q.joint,null);}}
 else{for(const k of ['level','levelSha256','attempt','proof','joint','lowerBound','route','drags','U','L','exactMinimum','admission','phaseAccounting','formalId','difficulty'])assert.equal(q[k],null);assert.equal(q.accepted,false);}
 if(q.joint){assert(q.attempt);api.assertAdaptivePhaseAccounting(q.phaseAccounting,row.recipe);assert.deepEqual(q.proof,q.joint.proof);assert.deepEqual(q.route,q.joint.route);assert.deepEqual(q.drags,q.joint.drags);assert.deepEqual(q.exactMinimum,q.joint.exactMinimum);assert.deepEqual(q.lowerBound,q.proof?{result:q.proof,method:'same-original-axis-ice-exact-minimum',derivedCertificate:q.exactMinimum}:null);assert.equal(q.U,q.joint.U);}
 else{for(const k of ['proof','route','drags','U','L','exactMinimum','admission','phaseAccounting'])assert.equal(q[k],null);assert.equal(q.accepted,false);}
 api.assertAdaptiveAllocation(q,p.admissionPolicy,acceptedFormalIds,p.slotRows);
 if(q.attempt){assert(q.freshness&&q.coreFreshness);assert.equal(built.status,'FIRST_FULL_AXIS_ICE_TERMINAL');assert.equal(q.attempt.levelSha256,q.levelSha256);assert(q.resolvedFailedParent,'Original resolved parent evidence required; authenticated in fixed order after the one history load');}
 if(q.accepted){assert(q.attempt&&q.joint?.accepted);assert.equal(q.status,'ORIGINAL_WHOLEBOARD_AXIS_ICE_ADAPTIVE_ACCEPTED');assert.equal(q.L,q.joint.U);assert.equal(q.U,q.L);assert(q.L>=21);assert.equal(q.difficulty,api.minimumBand(q.L));assert(q.proof&&q.route&&q.drags&&q.exactMinimum);acceptedFormalIds.push(q.formalId);}else assert.equal(q.L,null);
 qs.push(q);
}
assert.deepEqual(done.persistedConstructionWorldFiles,qs.filter(q=>q.level).map(q=>q.constructionEvidence));assert.deepEqual(done.unpersistedInputs,[]);
assert.equal(done.accepted,qs.filter(q=>q.accepted).length);assert.equal(actual.accepted,done.accepted);assert.equal(done.publicClaimsStarted,qs.filter(q=>q.attempt).length);assert.equal(done.formedFullWorlds,qs.filter(q=>q.level).length);
const publicFiles=q=>{const stem=path.join(PUBLIC_LEDGER,q.attempt.id),identity=path.join(PUBLIC_LEDGER,'identities',q.attempt.retryIdentitySha256);return[stem+'.request.json',stem+'.result.json',stem+'.v4-wholeboard-plan.json',stem+'.v4-wholeboard-result.json',identity+'.json',...q.accepted?[]:[stem+'.blocked.json',identity+'.blocked.json']];};
const ctor=await json(done.constructionOwner),math=await json(done.mathOwner),expectedCtor=[...constructionPaths,actualDir+'/execution-start.json',...qs.filter(q=>q.constructionEvidence).map(q=>q.constructionEvidence.path)],expectedMath=[...done.receipts.map(d=>d.path),...qs.filter(q=>q.attempt).flatMap(publicFiles)];
const declared=(owner,d,kind,expected)=>{api.assertWholeBoardOwner(owner,{kind,plan:cli.plan,experimentId:p.experimentId,namespace:canonical(kind==='construction'?lateRoot.physicalPath:pub),attemptIds:kind==='mathematical'?qs.filter(q=>q.attempt).map(q=>q.attempt.id):[],files:expected});return{id:owner.id,namespace:owner.namespace,kind,definition:d};};
const ctorDeclared=declared(ctor,done.constructionOwner,'construction',expectedCtor),mathDeclared=declared(math,done.mathOwner,'mathematical',expectedMath);for(const owner of [ctor,math])for(const d of owner.files)await read(d);
assert.equal(ctor.closedCampaigns.length,1);assert.deepEqual(math.closedCampaigns,[]);const closure=ctor.closedCampaigns[0],rawClosure=await json(closure.descriptor),formed=qs.filter(q=>q.level).map(q=>q.constructionEvidence);assert.equal(canonical(closure.descriptor.path),canonical(constructionPaths[1]));api.assertWholeBoardClosedCampaign(closure,rawClosure,{plan:cli.plan,experimentId:p.experimentId,maximumInputs:N,receipts:done.receipts,formedWorldFiles:formed});
for(const f of constructionPaths.slice(2)){const d=ctor.files.find(d=>canonical(d.path)===canonical(f));assert(d);assert.deepEqual(await json(d),{plan:cli.plan,experimentId:p.experimentId,recipeIdentities:p.recipes.map(q=>api.recipeIdentity(q.recipe)),maximumInputs:N,restartAllowed:false});}
if(!done.publicClaimsStarted){assert.equal(math.files.length,N);assert(math.files.every(f=>rootFor(f.path)===null));}
const makeDelta=(owner,declaredOwner,parentHeadSha256)=>buildActiveRegionOwnerDelta({owner,declaredOwner,parentHeadSha256,read,json,absent,rootFor,canonical,qs,p,cli,pub,api,PLAN_HISTORY_VERSION,levelSha256,sealedWorldIdentity});
const summary=s=>({publicStocks:s.publicStocks.length,historyWorlds:s.nearPools.history.length,terminalRecords:s.bundle.terminalRecords.length,closedCampaigns:s.closedCampaigns.length});
const listing=async()=>{const out={};for(const r of ctx.historyScope.roots){const todo=[r.physicalPath],names=[];while(todo.length){const dir=todo.pop();for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'Nested history alias');const f=path.join(dir,e.name);if(e.isDirectory())todo.push(f);else{assert(e.isFile());names.push(f);}}}out[r.id]=names;}return out;};
const declaredListing=(s,d)=>{const out=Object.fromEntries(ctx.historyScope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...s.bundle.files,...d.files])if(f.rootId!==null){const k=canonical(f.path);assert(!seen.has(k));seen.add(k);out[f.rootId].push(f.path);}return out;};
const initialListing=await listing();let state=await consumePlanHistory({checkpoint:ctx.history,review:ctx.historyReview,expectedScope:ctx.historyScope,readBytes:fs.readFile});
for(const prior of ctx.historyDeltas){const delta=await json(prior.descriptor);await read(prior.declaredOwner.definition);state=await mergePlanHistoryDelta(state,{...prior,listing:declaredListing(state,delta),readBytes:fs.readFile});}
assert.equal(state.headSha256,HEAD);const before=summary(state);assert.deepEqual(before,Object.fromEntries(Object.keys(before).map(k=>[k,prior.summary[k]])));assert.deepEqual(selected.files,state.nearPools.selected.map(x=>x.descriptor.path));
const parentRoles=[],parentSeeds=[];
for(const source of sources){const latest=api.latestFailedAttemptBySource(state,source),parent=ctx.failedParents.find(x=>x.sourceLevelId===source);assert(parent);const role=await readDirectHistoryRole(state,{namespace:latest.namespace,attemptId:latest.request.value.id,receipt:parent.receipt,role:'failed-parent',readBytes:fs.readFile});assert.equal(role.blocked.length,2);assert.equal(role.receipt.sourceLevelId??role.receipt.level.id,source);assert.equal(role.request.id,latest.request.value.id);assert.equal(role.receipt.accepted,false);assert.equal(role.result.accepted,false);for(const[p,h]of Object.entries(role.fileBindings))await read({path:p,sha256:h});
 const evidence={policy:BATCH_PARENT_POLICY,origin:'sealed-history',sourceLevelId:source,recipeIndex:null,recipeId:null,namespace:latest.namespace,attemptId:role.request.id,startedAt:role.request.startedAt,receipt:parent.receipt,request:latest.request.descriptor,result:latest.result.descriptor,blocked:latest.blocked.map(b=>b.descriptor)};
 parentSeeds.push({...role,sourceLevelId:source,namespace:latest.namespace,evidence});parentRoles.push({sourceLevelId:source,receipt:parent.receipt,attemptId:role.request.id,startedAt:role.request.startedAt,namespace:latest.namespace,blocked:role.blocked.map(b=>b.descriptor)});
}
const parentOverlay=await assertActiveRegionParentSequence({p,qs,receipts:done.receipts,seeds:parentSeeds,scope:ctx.historyScope,ownerFiles:math.files,publicLedger:PUBLIC_LEDGER,readBytes:fs.readFile});assert.deepEqual(done.parentOverlay,parentOverlay.report);for(const[p,h]of Object.entries(parentOverlay.fileBindings))await read({path:p,sha256:h});
const coreIndex=await loadActiveCoreIndex({bound:json},state);assert.deepEqual(p.coreDiversityScope,coreIndex.stats());const coreHistory=assertActiveRegionCoreSequence(coreIndex,qs,p.recipes);assert.deepEqual(done.coreDiversityStats,coreHistory.after);
const ctorDelta=await makeDelta(ctor,ctorDeclared,HEAD),ctorBytes=Buffer.from(JSON.stringify(ctorDelta)),ctorDesc={path:OUT+'/construction.delta.json',sha256:sha(ctorBytes)};assert.equal(ctorDelta.fullWorlds.length,done.formedFullWorlds);
const mathDelta=historyExportMode(done).includeMathDelta?await makeDelta(math,mathDeclared,ctorDesc.sha256):null,mathBytes=mathDelta?Buffer.from(JSON.stringify(mathDelta)):null,mathDesc=mathBytes?{path:OUT+'/mathematical.delta.json',sha256:sha(mathBytes)}:null;
assertPlanHistoryMembers(state,initialListing,[...ctorDelta.files,...mathDelta?.files??[]].filter(f=>f.rootId!==null));
const virtual=new Map([[ctorDesc.path,ctorBytes],...mathDesc?[[mathDesc.path,mathBytes]]:[]]),readBytes=p=>virtual.get(p)??fs.readFile(p),historyDeltas=[{descriptor:ctorDesc,declaredOwner:ctorDeclared}];
state=await mergePlanHistoryDelta(state,{...historyDeltas[0],listing:declaredListing(state,ctorDelta),readBytes});if(mathDelta){const next={descriptor:mathDesc,declaredOwner:mathDeclared};state=await mergePlanHistoryDelta(state,{...next,listing:declaredListing(state,mathDelta),readBytes});historyDeltas.push(next);}
const finalListing=await listing();assertPlanHistoryMembers(state,finalListing);for(const k of Object.keys(finalListing))assert.deepEqual(finalListing[k].map(canonical).sort(),initialListing[k].map(canonical).sort());const after=summary(state);assert.equal(after.publicStocks,before.publicStocks+done.publicClaimsStarted);assert.equal(after.terminalRecords,before.terminalRecords+done.publicClaimsStarted);assert.equal(after.historyWorlds,before.historyWorlds+ctorDelta.fullWorlds.length+(mathDelta?.fullWorlds.length??0));assert.equal(after.closedCampaigns,before.closedCampaigns+1);assert(state.closedExperimentIds.includes(p.experimentId));
for(const q of qs.filter(q=>q.attempt)){const r=state.terminalByAttempt[state.bundle.publicNamespace+'|'+q.attempt.id];assert(r);assert.deepEqual(r.request.value,q.attempt);assert.equal(r.result.value.accepted,q.accepted);assert.equal(r.blocked.length,q.accepted?0:2);}
// Optional read-only metadata for a later proposal. Resolve against the new
// head already in memory, never invent a parent or redo historical mathematics.
// An unresolved future source must not invalidate this actual owner export.
const futureParents={historyHeadSha256:state.headSha256,requestedSourceLevelIds:cli.futureSourceLevelIds,resolved:[],unresolved:[],newHistoryTraversal:false,newModelCalls:0,newSearches:0,mathematicalProofRevalidated:false};
for(const sourceLevelId of futureParents.requestedSourceLevelIds){try{const latest=api.latestFailedAttemptBySource(state,sourceLevelId),attemptId=latest.request.value.id,targetHash=latest.request.value.levelSha256,seen=new Set(),choices=state.fullWorlds.filter(w=>w.field==='level'&&(w.sourceLevelId===sourceLevelId||w.level?.id===sourceLevelId)&&levelSha256(w.level)===targetHash).map(w=>w.descriptor).filter(d=>{const key=canonical(d.path);if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>Number(!a.path.includes(attemptId))-Number(!b.path.includes(attemptId))||canonical(a.path).localeCompare(canonical(b.path)));let resolved=null;const rejected=[];
 for(const receipt of choices){try{const raw=await json(receipt);if(raw.accepted!==false||(raw.attempt??raw.proof?.attempt)?.id!==attemptId)continue;const role=await readDirectHistoryRole(state,{namespace:latest.namespace,attemptId,receipt,role:'failed-parent',readBytes:fs.readFile});assert.equal(role.blocked.length,2);for(const[p,h]of Object.entries(role.fileBindings))await read({path:p,sha256:h});resolved={sourceLevelId,status:'RESOLVED_ORIGINAL_FAILED_PARENT',receipt:desc(receipt),attemptId,startedAt:role.request.startedAt,namespace:latest.namespace,blocked:role.blocked.map(b=>b.descriptor),readDirectHistoryRolePassed:true,mathematicalProofRevalidated:false};break;}catch(e){rejected.push({receipt:desc(receipt),reason:e.message});}}
 assert(resolved,'No authentic original receipt for latest failed attempt '+attemptId+(rejected.length?'; '+JSON.stringify(rejected):''));futureParents.resolved.push(resolved);
 }catch(e){futureParents.unresolved.push({sourceLevelId,status:'UNRESOLVED',reason:e.message});}}
for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h,'Final evidence drift '+p);const self=SELF;assert.equal(await fs.realpath(self),await fs.realpath(fileURLToPath(import.meta.url)));const exportScript=await fd(self);
const report={status:'ACTIVE_REGION_AXIS_ICE_BATCH_HISTORY_DELTAS_EXPORTED_AND_V6_VALIDATED',mode:historyExportMode(done).mode,checkpoint:ctx.history,checkpointReview:ctx.historyReview,historyScope:ctx.historyScope,context:p.contextDescriptor,plan:cli.plan,planAudit:cli.planReview,actualAudit:cli.actualReview,completion:cli.completion,candidates:done.receipts,constructorOwner:done.constructionOwner,mathOwner:done.mathOwner,priorHistoryReport:cli.priorHistoryReport,baselineCheckpointReview:CHECKPOINT_REVIEW,baselineCheckpointProvenance:hq.provenance,qualification:QUALIFICATION,selection:SELECTION,priorFailedParents:parentRoles,priorHistoryDeltas:ctx.historyDeltas,previousHeadSha256:HEAD,historyDeltas,completeHistoryDeltas:[...ctx.historyDeltas,...historyDeltas],headSha256:state.headSha256,exportScript,configuration,predecessorExporter:PREDECESSOR,policyObservation,before,candidateStatuses:qs.map(q=>({recipeId:q.recipeId,sourceLevelId:q.sourceLevelId,status:q.status,errors:q.errors,levelSha256:q.levelSha256,accepted:q.accepted,mathematicalEvidenceValidated:q.mathematicalEvidenceValidated,formalId:q.formalId,difficulty:q.difficulty,L:q.L,U:q.U,admission:q.admission,exactMinimum:q.exactMinimum,attemptId:q.attempt?.id??null})),summary:{...after,constructorFiles:ctorDelta.files.length,constructorFullWorlds:ctorDelta.fullWorlds.length,mathematicalFiles:mathDelta?.files.length??0,mathematicalFullWorlds:mathDelta?.fullWorlds.length??0,newPublicClaims:done.publicClaimsStarted,newFailures:qs.filter(q=>q.attempt&&!q.accepted).length,newAccepted:done.accepted,consumedInputs:N,maximumInputs:N},sevenRootMemberCounts:Object.fromEntries(Object.entries(finalListing).map(([k,v])=>[k,v.length])),errors:[],fileBindings:{...fileBindings,[ctx.history.path]:ctx.history.sha256,[ctx.historyReview.path]:ctx.historyReview.sha256,[exportScript.path]:exportScript.sha256},originalOwnerDefinitionsPreserved:true,unclaimedMathOwnerReportBindingOnly:done.publicClaimsStarted===0,mathematicalOwnerSynthesized:false,checkpointReexported:false,oldFilesChanged:false,oldLiveByteIntegrityClaimed:false,largeProjectionRecomputed:false,comparisonEvidence:p.comparisonEvidence,comparisonOnlyFactsMergedIntoSealedBase:false,newConstructions:0,newCspCalls:0,newSearches:0,newLedgerClaims:0,newReplayCalls:0};
report.parentOverlay=parentOverlay.report;report.disposition=done.disposition;report.persistedConstructionWorldFiles=done.persistedConstructionWorldFiles;report.unpersistedInputs=done.unpersistedInputs;report.futureParents=futureParents;report.coreHistory=coreHistory;report.bodyIceFieldsPreserved=true;report.selectionWritten=false;report.formalAdoptionPerformed=false;report.acceptanceScope='History transports independently audited accepted mathematical receipts; it does not perform selection, Pointer/time validation or formal adoption.';
await fs.mkdir(OUT);await fs.writeFile(ctorDesc.path,ctorBytes,{flag:'wx'});if(mathDesc)await fs.writeFile(mathDesc.path,mathBytes,{flag:'wx'});const reportBytes=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(OUT+'/report.json',reportBytes,{flag:'wx'});console.log(JSON.stringify({report:{path:OUT+'/report.json',sha256:sha(reportBytes)},historyDeltas,headSha256:state.headSha256,summary:report.summary,futureParents:{resolved:futureParents.resolved.map(r=>r.sourceLevelId),unresolved:futureParents.unresolved}}));

}

const desc=d=>({path:d.path,sha256:d.sha256});
const fields=['level','placeholderWorld','plain.level','built.level','built.placeholderWorld','built.plain.level','constructionTemplateLevel','templateLevel','constructionTemplatePacket.level','input.level','construction.level'],at=(o,k)=>k.split('.').reduce((q,s)=>q?.[s],o);
export async function buildActiveRegionOwnerDelta({owner,declaredOwner,parentHeadSha256,read,json,absent,rootFor,canonical,qs,p,cli,pub,api,PLAN_HISTORY_VERSION,levelSha256,sealedWorldIdentity}){const files=[],fullWorlds=[],terminalRecords=[];
 for(const d of owner.files){const b=await read(d);files.push({...d,aliases:[d.path],rootId:rootFor(d.path)});if(!d.path.endsWith('.json'))continue;const raw=JSON.parse(b);for(const field of fields){const level=at(raw,field);if(!level?.blocks)continue;assert(level.blocks.length>0);const q=qs.find(q=>q.levelSha256===levelSha256(level));assert(q,'Unaccounted formed original world');assert.deepEqual(level,q.level);fullWorlds.push({descriptor:desc(d),field,level,sourceLevelId:q.sourceLevelId,reference:null,fingerprints:sealedWorldIdentity(level)});}}
 const lookup=f=>{const d=owner.files.find(d=>canonical(d.path)===canonical(f));assert(d,'Owner omitted '+f);return desc(d);};
 for(const id of owner.attemptIds){const q=qs.find(q=>q.attempt?.id===id);assert(q);const recipe=p.recipes[q.recipeIndex].recipe,request=lookup(path.join(pub,id+'.request.json')),result=lookup(path.join(pub,id+'.result.json')),rv=await json(request),sv=await json(result);assert.deepEqual(rv,q.attempt);assert.equal(rv.identityOrigin,id);assert.equal(sv.accepted,q.accepted);assert.equal(sv.status,q.status);assert.equal(sv.levelSha256,q.levelSha256);assert.deepEqual(sv.lower,q.lowerBound?.result);assert.deepEqual(sv.upper,q.route?.search);
  const sp=await json(lookup(path.join(pub,id+'.v4-wholeboard-plan.json'))),sr=await json(lookup(path.join(pub,id+'.v4-wholeboard-result.json')));assert.deepEqual(sp,{attempt:q.attempt,plan:cli.plan,recipe,levelSha256:q.levelSha256,futureReservationsDeclared:api.futureReservations(recipe),admissionPolicy:p.admissionPolicy,jointBudget:api.JOINT_BUDGET,referenceLowerNotTransferred:true});assert.deepEqual(sr,q);const blocked=[];for(const f of [path.join(pub,id+'.blocked.json'),path.join(pub,'identities',rv.retryIdentitySha256+'.blocked.json')]){if(q.accepted){await absent(f);continue;}const d=lookup(f),value=await json(d);assert.equal(value.attemptId,id);assert.equal(value.status,q.status);blocked.push({descriptor:d,value});}await absent(path.join(pub,id+'.revalidation.lock'));terminalRecords.push({kind:'mathematical',namespace:owner.namespace,request:{descriptor:request,value:rv},result:{descriptor:result,value:sv},blocked,lock:null});}
 return{version:PLAN_HISTORY_VERSION,parentHeadSha256,owner:declaredOwner,files,terminalRecords,fullWorlds,closedCampaigns:owner.closedCampaigns};}

/** Transport classification only; counts come from bound original completion. */
export function historyExportMode(done){
 for(const k of ['consumedInputs','formedFullWorlds','publicClaimsStarted','accepted'])assert(Number.isSafeInteger(done[k])&&done[k]>=0,k);
 assert(done.accepted<=done.publicClaimsStarted&&done.publicClaimsStarted<=done.formedFullWorlds&&done.formedFullWorlds<=done.consumedInputs);
 return{includeMathDelta:done.publicClaimsStarted>0,mode:done.publicClaimsStarted?'constructor-and-mathematical':done.formedFullWorlds?'constructor-only-formed-unclaimed':'constructor-only-no-full-world'};
}
/** Metadata over original full-world receipts. Failed fulls consume a core too.
 * This never constructs a board/model or recomputes a mathematical proof. */
export function assertActiveRegionCoreSequence(index,qs,recipes){
 const before=index.stats(),rows=[];assert.equal(qs.length,recipes.length);
 for(const [i,q]of qs.entries()){
  if(!q.level){assert(!q.coreFreshness);continue;}
  const region=recipes[i].recipe.activeRegion;assert(q.constructionEvidence);
  if(q.coreFreshness)assert.deepEqual(q.coreFreshness,index.check(q.level,region));
  if(q.attempt||q.accepted)assert(q.coreFreshness,'Claimed original world requires passing original core metadata');
  index.add(q.level,region,q.constructionEvidence);
  rows.push({sourceLevelId:q.sourceLevelId,constructionEvidence:q.constructionEvidence,levelSha256:q.levelSha256,activeRegion:region,coreFreshness:q.coreFreshness??null,accepted:q.accepted,attemptId:q.attempt?.id??null});
 }
 return{before,after:index.stats(),rows,newModels:0,newSearches:0,allFormedWorldsRetained:true,oldUnrecordedCoresInferred:false};
}

/** Reauthenticate same-source parents in the original fixed recipe order.
 * A failure advances only after all its original owner-bound publication is
 * read. No-full, unclaimed-full and accepted rows never advance. This uses
 * the already-loaded history seeds; it performs no second history load. */
export async function assertActiveRegionParentSequence({p,qs,receipts,seeds,scope,ownerFiles,publicLedger,readBytes}){
 assert.equal(p.parentResolutionPolicy,BATCH_PARENT_POLICY);assert.deepEqual(p.initialFailedParents,seeds.map(s=>s.evidence));assert.equal(qs.length,p.recipes.length);assert.equal(receipts.length,qs.length);
 const canonical=compileParentCanonical(scope),initial=new Map(seeds.map(s=>[s.sourceLevelId,s.evidence])),overlay=createOrderedFailedParentOverlay(seeds,p.recipes.map(r=>r.recipe),scope),fileBindings={};
 const owned=f=>{const matches=ownerFiles.filter(d=>canonical(d.path)===canonical(f));assert.equal(matches.length,1,'Exactly one original mathematical owner descriptor required: '+f);return{path:matches[0].path,sha256:matches[0].sha256};};
 for(const[i,q]of qs.entries()){
  const row=p.recipes[i],parent=overlay.resolve(i);assert.equal(row.parentResolutionPolicy,BATCH_PARENT_POLICY);assert.deepEqual(row.initialFailedParent,initial.get(row.recipe.sourceLevelId));assert.deepEqual(q.resolvedFailedParent,parent.evidence);if(q.attempt)assert.equal(q.attempt.redesignOf,parent.request.id);
  let publication=null;if(q.attempt&&!q.accepted){const stem=path.join(publicLedger,q.attempt.id),identity=path.join(publicLedger,'identities',q.attempt.retryIdentitySha256);publication={request:owned(stem+'.request.json'),result:owned(stem+'.result.json'),sidecar:owned(stem+'.v4-wholeboard-result.json'),identity:owned(identity+'.json'),blocked:[owned(stem+'.blocked.json'),owned(identity+'.blocked.json')]};}
  assert.deepEqual(owned(receipts[i].path),receipts[i],'Candidate descriptor must equal original owner descriptor');const committed=await overlay.commit(i,q,receipts[i],publication,readBytes);Object.assign(fileBindings,committed.fileBindings);
 }
 return{report:overlay.report(),fileBindings};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,4,'Config path and exact SHA256 required');await exportActiveRegionHistory({path:process.argv[2],sha256:process.argv[3]});}

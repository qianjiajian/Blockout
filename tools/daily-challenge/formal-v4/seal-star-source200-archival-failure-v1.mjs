// Single-case administrative transport. It cannot validate or resume a puzzle.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as api from './reverse-star-suffix-task-v2.mjs';
import {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,readDirectHistoryRole,PLAN_HISTORY_VERSION} from './plan-history-adapter-v9.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {observeExecutionPolicy} from './prefix-execution-environment-task.mjs';

const V='deliverables/daily-formal-v4-20261008/',A=V+'design/star-source200-dual-exit-pilot-actual-01/';
export const SELF='tools/daily-challenge/formal-v4/seal-star-source200-archival-failure-v1.mjs';
export const OUT=V+'proof/star-source200-dual-exit-pilot-administrative-seal-01';
export const ERROR_CODE='PREPAID_RECORD_NOT_ARCHIVED_AFTER_STATIC_VALIDATION_THROW';
export const SEAL_STATUS='STAR_SOURCE200_ARCHIVAL_FAILURE_SEALED_AND_V9_VALIDATED';
export const TOOL_REVIEW_STATUS='INDEPENDENT_STAR_SOURCE200_ARCHIVAL_SEAL_TOOL_PASS';
const pin=(path,sha256)=>Object.freeze({path,sha256});
export const CASE=Object.freeze({
 plan:pin(V+'design/star-source200-dual-exit-pilot-plan-01/plan.json','fe4ab79b776a7ab0b102a1d8363ce293636c9f6be068718db2af97c530abc127'),
 context:pin(V+'design/star-source200-dual-exit-pilot-context-01/context.json','d49915c3cf4b59156ec7d124e114324b1b7c121b0bfba97e5b65b9a54ce610fd'),
 planReview:pin(V+'proof/star-source200-dual-exit-pilot-plan-independent-01/report.json','6ff62efd4c839d915b0952392b0f2081e80524948035f557aad02c60a129c7f5'),
 completion:pin((A+'completion.json').replaceAll('/','\\'),'4a96db14d137d34608fbb41ab5368f59feb8cd93d19b6dcf6ec854d25f31fcef'),
 failureReview:pin(V+'proof/star-source200-dual-exit-pilot-actual-independent-01/report.json','aaa87dd587178b7a78561d37021f9f0c9f3d5f2a64eeba75d54022a84ddb46f7'),
 fragment:pin(V+'proof/star-source200-dual-exit-pilot-actual-independent-01/unarchived-fragment-readonly.json','d85f29e4c31d0621f13cea5e43b22439dea1c00d0736e965365465d73751dcfe'),
 prior:pin(V+'proof/plain-reverse-source5-suffix-prefix-pilot-history-delta-03/report.json','425e2188af77039779d1f034e12b7fcebcd951d45d48eabd324786941d6dd449'),
 qualification:pin(V+'proof/reverse-star-suffix-task-v2-independent-01/report.json','25bceb6da05762498a9efaaf9ecdbeee4f3c64ae970e46f0f020df05269f848d'),
 normalExporterReview:pin(V+'proof/reverse-star-suffix-history-export-independent-01/report.json','295a7e81c968e5a8eabd3231376b67fd9c944c71b681b41dbdd64f603e7f0b5d'),
 observation:pin(V+'proof/star-source200-administrative-observation-01/observation.json','7aa664b69de5e2227b02ce84e01f5faee86cfb0b8b2d72ed9bab7b8dc7917262'),
 candidate:pin((A+'candidate.json').replaceAll('/','\\'),'c49b8f81f174f7fb8fe8056f40249bb824f6f4c676dbacb8e8239f268c22d052'),
 constructorOwner:pin((A+'construction.owner.definition.json').replaceAll('/','\\'),'f44a6ed264d441a5de0863c4b6ca1f4617c9c40a6b14e7006e35114fb58236a3'),
 mathOwner:pin((A+'math.owner.definition.json').replaceAll('/','\\'),'eb54b82bcf1ea92f4fa444f7325161e35c3199f7256a7bd55dd006f71e0cfbb7'),
 priorHead:'ea8fd622d3031ea080db56b6b60234c538290c2b9ca2cc7e41687b18776d4476',
 rawKey:'167b1beaca67b55d272baf6d58da9ebd7887509dc3fc0e3604b3ea7870ad1afb',
 experimentId:'star-source200-dual-exit-pilot-01'
});
const sha=b=>createHash('sha256').update(b).digest('hex'),desc=d=>({path:d.path,sha256:d.sha256});
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Descriptor required');
const fields=['level','placeholderWorld','plain.level','built.level','built.placeholderWorld','built.plain.level','constructionTemplateLevel','templateLevel','constructionTemplatePacket.level','input.level','construction.level'];
const at=(o,f)=>f.split('.').reduce((q,k)=>q?.[k],o);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};

// Reads only the small fixed case; no checkpoint, model, replay or delta merge.
export async function readSource200Case(readBytes=fs.readFile){
 const fileBindings={},rawFiles=new Map();
 const read=async d=>{descriptor(d);const b=await readBytes(d.path);assert.equal(sha(b),d.sha256,'Evidence bytes '+d.path);fileBindings[d.path]=d.sha256;rawFiles.set(d.path,b);return b;};
 const json=async d=>JSON.parse(await read(d));
 const e={};for(const k of ['plan','context','planReview','completion','failureReview','fragment','prior','qualification','normalExporterReview'])e[k]=await json(CASE[k]);
 assert.deepEqual(e.completion.receipt,CASE.candidate);assert.deepEqual(e.completion.constructionOwner,CASE.constructorOwner);assert.deepEqual(e.completion.mathOwner,CASE.mathOwner);
 e.candidate=await json(CASE.candidate);e.constructorOwner=await json(CASE.constructorOwner);e.mathOwner=await json(CASE.mathOwner);e.index=await json(e.completion.index);
 for(const owner of [e.constructorOwner,e.mathOwner])for(const d of owner.files)await read(d);
 e.closure=await json(e.constructorOwner.closedCampaigns[0].descriptor);
 e.rows=[];for(const d of e.candidate.formedWorlds)e.rows.push({descriptor:d,value:await json(d)});
 e.fileBindings=fileBindings;e.rawFiles=rawFiles;return e;
}

// Strong case-specific evidence assertions. The original incorrect true fields
// are authenticated historical facts, explicitly NOT an archival PASS.
export function assertSource200ArchivalFailure(e){
 const {plan:p,context:c,completion:done,candidate:q,index:ix,constructorOwner:ctor,mathOwner:math,failureReview:r,fragment:f}=e;
 const canonical=compileCanonicalHistoryPath(c.historyScope).canonical;
 assert.equal(p.version,api.VERSION);assert.equal(p.experimentId,CASE.experimentId);assert.deepEqual(p.contextDescriptor,CASE.context);assert.deepEqual(done.plan,CASE.plan);
 assert.deepEqual(c.qualification,CASE.qualification);assert.deepEqual(c.priorHistoryReport,CASE.prior);assert.deepEqual(p.priorHistoryReport,CASE.prior);
 assert.equal(c.historyHeadSha256,CASE.priorHead);assert.equal(p.historyHeadSha256,CASE.priorHead);assert.equal(e.prior.headSha256,CASE.priorHead);assert.equal(c.historyDeltas.length,8);api.assertReversePriorHistory(c,e.prior);
 assert.equal(e.planReview.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_PLAN_V2_PASS');assert.deepEqual(e.planReview.plan,CASE.plan);assert.deepEqual(e.planReview.errors,[]);
 assert.equal(r.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_ACTUAL_V2_ARCHIVAL_FAILURE_CONFIRMED');assert.equal(r.normalExportAllowed,false);assert.equal(r.completeFormedWorldArchivalVerified,false);assert.deepEqual(r.errors,[ERROR_CODE]);
 assert.deepEqual(r.plan,CASE.plan);assert.deepEqual(r.completion,CASE.completion);assert.deepEqual(r.receipt,CASE.candidate);
 assert.equal(done.status,'REVERSE_FIXED_STOCK_TASK_CLOSED');assert.equal(done.closed,true);assert.equal(done.maximumInputs,1);assert.equal(done.accepted,0);assert.equal(done.publicClaimsStarted,0);assert.equal(done.formedWorlds,5);assert.equal(done.archiveValidation.valid,true);assert.equal(done.adminClosureRequired,false);
 assert.equal(q.status,'REVERSE_CONSTRUCTION_TERMINAL');assert.deepEqual(q.errors,['Level 200: duplicate id star200-pink-normal']);assert.equal(q.sourceLevelId,200);assert.equal(q.targetDifficulty,1);assert.equal(q.accepted,false);assert.equal(q.catalogEligible,false);assert.equal(q.formalReady,false);assert.equal(q.mathematicalEvidenceValidated,false);
 for(const k of ['level','levelSha256','L','U','proof','route','attempt','upperConstruction','lowerBound'])assert.equal(q[k],null,k);
 assert.equal(q.templateLevel,undefined);assert.equal(q.archiveValidation.valid,true);assert.equal(q.construction.firstComplete,null);assert.equal(q.construction.completePhysicalInputs,0);
 assert.equal(q.formedWorlds.length,5);assert.equal(q.construction.formed.length,5);assert.equal(q.construction.session.formed.length,5);
 const ra=q.construction.session.rawAccounting;assert.equal(ra.recordTicketsIssued,6);assert.equal(ra.recordTicketsConsumed,6);assert.equal(ra.rawFullBoardStates,29);assert.equal(ra.active,false);assert.equal(ra.events.length,29);
 assert.deepEqual(ra.events.at(-1),{ordinal:29,reason:'insertion-portal',phase:'world-creation',keySha256:CASE.rawKey});
 for(const k of ['canonicalReplays','independentReplays'])assert.equal(q.construction.session.counters[k],0);
 assert.equal(r.archivalFailure.code,ERROR_CODE);assert.equal(r.archivalFailure.missingRecordCount,1);assert.equal(r.archivalFailure.savedOriginalRecords,5);assert.equal(r.archivalFailure.recordTicketsConsumed,6);
 for(const k of ['receipt','formedWorldFiles','nonIdentityWorlds'])assert.deepEqual(ix[k],k==='receipt'?done.receipt:k==='formedWorldFiles'?q.formedWorlds:q.nonIdentityWorlds);
 assert.equal(ix.closed,true);assert.equal(ix.restartAllowed,false);assert.equal(ix.consumedInputs,0);assert.equal(ix.maximumInputs,1);assert.equal(ix.completePhysicalInputs,0);assert.equal(ix.archiveValidation.valid,true);assert.equal(ix.adminClosureRequired,false);
 for(const k of Object.keys(ix))assert.deepEqual(e.closure[k],ix[k]);
 const owned=(o,d)=>{const xs=o.files.filter(x=>canonical(x.path)===canonical(d.path));assert.equal(xs.length,1,'Exact owner member');assert.deepEqual(xs[0],d);};
 for(const [o,kind,id]of [[ctor,'construction',CASE.experimentId],[math,'mathematical',CASE.experimentId+'-math']]){assert.equal(o.version,'plan-history-owner-v1');assert.equal(o.kind,kind);assert.equal(o.id,id);assert.deepEqual(o.parentPlan,CASE.plan);assert.deepEqual(o.attemptIds,[]);assert.equal(new Set(o.files.map(d=>canonical(d.path))).size,o.files.length);}
 assert.equal(ctor.files.length,10);assert.equal(math.files.length,1);assert.deepEqual(math.files,[CASE.candidate]);assert.deepEqual(math.closedCampaigns,[]);assert.equal(ctor.closedCampaigns.length,1);
 const closure=ctor.closedCampaigns[0];assert.deepEqual(closure.raw,e.closure);assert.equal(closure.id,CASE.experimentId);assert.equal(closure.closed,true);assert.equal(closure.restartAllowed,false);assert.equal(closure.consumedInputs,0);assert.equal(closure.maximumInputs,1);owned(ctor,closure.descriptor);
 const expectedCounts=[0,1,1,2,2],expectedAreas=[0,4,4,10,10],saved=[];
 assert.equal(e.rows.length,5);
 for(let i=0;i<5;i++){
  const {descriptor:d,value:w}=e.rows[i],field=i?'level':'emptyConstructionWorld',l=w[field];owned(ctor,d);assert.deepEqual(d,q.formedWorlds[i]);assert.equal(canonical(d.path),canonical(A+'world-'+String(i).padStart(5,'0')+'.json'));
  assert.equal(w.sourceLevelId,200);assert.equal(w.recipeSha256,p.recipe.recipeSha256);assert.equal(w.creation.ordinal,i);assert.equal(w.creation.full,false);assert.equal(levelSha256(l),w.levelSha256);assert.equal(w.creation.levelSha256,w.levelSha256);
  assert.deepEqual(q.construction.formed[i].level,l);assert.deepEqual(q.construction.formed[i].info,w.creation);assert.deepEqual(q.construction.session.formed[i],{label:w.creation.label,levelSha256:w.levelSha256,full:false});
  assert.equal(l.blocks.length,expectedCounts[i]);const area=l.blocks.reduce((n,b)=>n+b.shape.length,0);assert.equal(area,expectedAreas[i]);assert(area<48);assert.equal(l.width*l.height,48);assert.deepEqual(l.gates,p.recipe.board.gates);
  for(const b of l.blocks){const stock=p.recipe.inventory.find(s=>s.id===b.id);assert(stock);for(const k of ['color','shape'])assert.deepEqual(b[k],stock[k]);assert.equal(b.star??false,stock.star??false);}
  for(const k of ['shutters','generators','elevators','queuedBlocks'])assert(!(l[k]?.length));
  if(!i){assert.equal(w.kind,'NON_IDENTITY_INITIAL_EMPTY_WORLD');assert.equal(w.identityEligible,false);assert.equal(w.level,undefined);}else assert.equal(w.emptyConstructionWorld,undefined);
  saved.push({descriptor:desc(d),field,levelSha256:w.levelSha256,bodyCount:l.blocks.length,area,full:false});
 }
 assert.deepEqual(q.nonIdentityWorlds.map(x=>x.descriptor),[q.formedWorlds[0]]);
 assert.equal(f.status,'READONLY_UNARCHIVED_COORDINATE_FRAGMENT_HASH_MATCHED_NOT_WORLD_RECOVERY');assert.deepEqual(f.actualAudit,CASE.failureReview);assert.equal(f.candidate.sha256,CASE.candidate.sha256);assert.equal(f.normalExportAllowed,false);
 assert.deepEqual(f.lastRawEvent,ra.events.at(-1));assert.equal(f.coordinateFragment.keySha256,CASE.rawKey);assert.equal(f.deduction.inferredPartialBodyCount,3);assert.equal(f.deduction.inferredPartialArea,12);
 // Coordinates/scalars only. Never assemble a sixth LevelSpec or fingerprint.
 const poses=new Map(e.rows[4].value.level.blocks.map(b=>[b.id,[b.x,b.y]]));poses.set('star200-pink-normal',[2,7]);
 const rawKey=JSON.stringify([p.recipe.inventory.map(b=>poses.get(b.id)??null),[0,false,false,false,false,p.recipe.board.timeSeconds,0]]);assert.equal(sha(rawKey),CASE.rawKey);
 return freeze({recordTicketsIssued:6,recordTicketsConsumed:6,savedOriginalRecords:5,unarchivedRecordCount:1,savedNonemptyPartials:4,emptyNonIdentityRecords:1,completePhysicalInputs:0,publicClaimsStarted:0,saved});
}

export function makeAdministrativeObservation(e,facts){
 const observation={status:'SOURCE200_ORIGINAL_ARCHIVAL_FAILURE_ADMINISTRATIVE_OBSERVATION',caseId:CASE.experimentId,plan:CASE.plan,completion:CASE.completion,candidate:CASE.candidate,strictFailureReview:CASE.failureReview,coordinateFragmentEvidence:CASE.fragment,
  originalConstructorOwner:CASE.constructorOwner,originalMathOwner:CASE.mathOwner,previousHistoryReport:CASE.prior,previousHeadSha256:CASE.priorHead,originalIndex:e.completion.index,originalClosure:e.constructorOwner.closedCampaigns[0].descriptor,
  archivalIntegrity:'FAILED',archivalErrors:[ERROR_CODE],normalActualReviewPassed:false,normalExportAllowed:false,completeFormedWorldArchivalVerified:false,
  ...facts,originalErroneousFieldsPreserved:{completionArchiveValidation:e.completion.archiveValidation,completionAdminClosureRequired:e.completion.adminClosureRequired,candidateArchiveValidation:e.candidate.archiveValidation,indexArchiveValidation:e.index.archiveValidation,indexAdminClosureRequired:e.index.adminClosureRequired,closureArchiveValidation:e.closure.archiveValidation},
  missingOriginalRecord:{originalBytesAvailable:false,originalDescriptorAvailable:false,originalLevelSha256Available:false,recoveredWorldCreated:false,insertedIntoHistoryWorlds:false,rawKeySha256:CASE.rawKey,coordinateEvidenceRole:'RECOVERED_COORDINATE_FRAGMENT_ONLY_NOT_ORIGINAL_WORLD',inferredBodyCount:3,inferredArea:12},
  recipeDisposition:{closed:true,restartAllowed:false,originalConsumedCompleteInputs:0,originalMaximumInputs:1,productionRecipeMayResume:false},
  partialFreshnessWarning:{sameReferenceShapeColourMayRejectRetainedSuffix:true,newPartialAuthenticationGranted:false,onlyFutureSeparatelyReviewedExactSavedRecordsMayBeAuthenticated:true,unarchivedFragmentEligible:false,exactNearPartitionAndFailedParentGatesUnchanged:true},
  historyMergePerformed:false,historyExportPerformed:false,fileBindings:e.fileBindings,newLevelSpecsCreated:0,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0,oldFilesChanged:false};
 assertMetadataOnlyObservation(observation);return observation;
}
export function assertMetadataOnlyObservation(o){
 assert.equal(o.archivalIntegrity,'FAILED');assert.equal(o.normalExportAllowed,false);assert.equal(o.completeFormedWorldArchivalVerified,false);assert.equal(o.unarchivedRecordCount,1);
 const walk=x=>{if(!x||typeof x!=='object')return;assert(!Object.hasOwn(x,'blocks')&&!Object.hasOwn(x,'gates'),'Observation must never carry a world');for(const v of Object.values(x))walk(v);};walk(o);
 assert.equal(o.missingOriginalRecord.recoveredWorldCreated,false);assert.equal(o.missingOriginalRecord.insertedIntoHistoryWorlds,false);assert.equal(o.recipeDisposition.productionRecipeMayResume,false);return o;
}
export function makeObservationOwner(namespace,observationDescriptor){descriptor(observationDescriptor);return{version:'plan-history-owner-v1',id:CASE.experimentId+'-archival-observation',namespace,kind:'construction',parentPlan:CASE.plan,experimentId:CASE.experimentId+'-archival-observation',files:[desc(observationDescriptor)],attemptIds:[],closedCampaigns:[]};}
export function assertThreeDeltaEffects(deltas){
 assert.equal(deltas.length,3);assert.deepEqual(deltas.map(d=>d.files.length),[10,1,1]);assert.deepEqual(deltas.map(d=>d.fullWorlds.length),[4,0,0]);assert.deepEqual(deltas.map(d=>d.terminalRecords.length),[0,0,0]);assert.deepEqual(deltas.map(d=>d.closedCampaigns.length),[1,0,0]);
 assert.equal(deltas[0].owner.id,CASE.experimentId);assert.equal(deltas[1].owner.id,CASE.experimentId+'-math');assert.equal(deltas[2].owner.id,CASE.experimentId+'-archival-observation');
}

export async function sealSource200ArchivalFailure(configuration){
 assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');descriptor(configuration);
 const configBytes=await fs.readFile(configuration.path);assert.equal(sha(configBytes),configuration.sha256);const cfg=JSON.parse(configBytes);assert.deepEqual(Object.keys(cfg).sort(),['outputDirectory','qualification']);assert.equal(cfg.outputDirectory,OUT);descriptor(cfg.qualification);
 const absent=async p=>{try{await fs.lstat(p);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Immutable output already exists: '+p);};await absent(OUT);
 const e=await readSource200Case(),facts=assertSource200ArchivalFailure(e),{plan:p,context:c,constructorOwner:ctor,mathOwner:math}=e;
 const bindings={...e.fileBindings,[configuration.path]:configuration.sha256};const read=async d=>{descriptor(d);const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,d.path);bindings[d.path]=d.sha256;return b;};
 const approval=JSON.parse(await read(cfg.qualification));assert.equal(approval.status,TOOL_REVIEW_STATUS);assert.deepEqual(approval.errors,[]);for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(approval[k],0);
 const selfBytes=await fs.readFile(SELF);assert.equal(approval.toolBindings[SELF],sha(selfBytes),'Qualified final sealer bytes');
 for(const m of [approval.fileBindings,approval.toolBindings,e.qualification.toolBindings,p.bindings,e.failureReview.fileBindings])for(const[f,h]of Object.entries(m))await read({path:f,sha256:h});
 const policyObservation=observeExecutionPolicy(p.environment),canonical=compileCanonicalHistoryPath(c.historyScope).canonical;
 const rootFor=f=>c.historyScope.roots.find(r=>canonical(f).startsWith(canonical(r.physicalPath)+'/'))?.id??null;
 const encode=q=>Buffer.from(JSON.stringify(q,null,2)+'\n'),virtual=new Map(),outputs=[];
 const retain=(name,value)=>{const bytes=encode(value),d={path:OUT+'/'+name,sha256:sha(bytes)};virtual.set(d.path,bytes);outputs.push(d);return d;};
 const observationDescriptor=CASE.observation,observation=JSON.parse(await read(observationDescriptor));assert.deepEqual(observation,makeAdministrativeObservation(e,facts));
 const admin=makeObservationOwner(ctor.namespace,observationDescriptor),adminDefinition=retain('administrative.owner.definition.json',admin);
 const declare=(o,d)=>({id:o.id,namespace:o.namespace,kind:o.kind,definition:d});
 const readBytes=async f=>virtual.get(f)??fs.readFile(f);
 const allowedWorlds=new Map(e.rows.slice(1).map(r=>[canonical(r.descriptor.path)+'|level',{descriptor:r.descriptor,value:r.value}]));
 const makeDelta=async(o,definition,parentHeadSha256)=>{const files=[],fullWorlds=[];for(const d of o.files){const bytes=await readBytes(d.path);assert.equal(sha(bytes),d.sha256);files.push({...d,aliases:[d.path],rootId:rootFor(d.path)});if(!d.path.endsWith('.json'))continue;const value=JSON.parse(bytes);
   for(const field of fields){const l=at(value,field);if(!l?.blocks)continue;const original=allowedWorlds.get(canonical(d.path)+'|'+field);assert(original,'No recovered, candidate, lower or unexpected world allowed');assert.deepEqual(d,original.descriptor);assert.deepEqual(l,original.value.level);assert.equal(l.blocks.length>0,true);fullWorlds.push({descriptor:desc(d),field,level:l,sourceLevelId:200,reference:value.reference,fingerprints:sealedWorldIdentity(l)});}}
  assert.deepEqual(o.attemptIds,[]);return{version:PLAN_HISTORY_VERSION,parentHeadSha256,owner:declare(o,definition),files,fullWorlds,terminalRecords:[],closedCampaigns:o.closedCampaigns};};
 const ctorDelta=await makeDelta(ctor,CASE.constructorOwner,CASE.priorHead),ctorD=retain('construction.delta.json',ctorDelta);
 const mathDelta=await makeDelta(math,CASE.mathOwner,ctorD.sha256),mathD=retain('mathematical.delta.json',mathDelta);
 const adminDelta=await makeDelta(admin,adminDefinition,mathD.sha256),adminD=retain('administrative.delta.json',adminDelta);assertThreeDeltaEffects([ctorDelta,mathDelta,adminDelta]);
 assert.equal(rootFor(observationDescriptor.path),null);assert.equal(rootFor(CASE.candidate.path),null);
 const declaredListing=(s,d)=>{const out=Object.fromEntries(c.historyScope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...s.bundle.files,...d.files])if(f.rootId!==null){const k=canonical(f.path);assert(!seen.has(k));seen.add(k);out[f.rootId].push(f.path);}return out;};
 const listing=async()=>{const out={};for(const r of c.historyScope.roots){const todo=[r.physicalPath],names=[];while(todo.length){const dir=todo.pop();for(const entry of await fs.readdir(dir,{withFileTypes:true})){assert(!entry.isSymbolicLink());const f=path.join(dir,entry.name);if(entry.isDirectory())todo.push(f);else{assert(entry.isFile());names.push(f);}}}out[r.id]=names;}return out;};
 const summary=s=>({publicStocks:s.publicStocks.length,historyWorlds:s.nearPools.history.length,terminalRecords:s.bundle.terminalRecords.length,closedCampaigns:s.closedCampaigns.length});
 let state=await consumePlanHistory({checkpoint:c.history,review:c.historyReview,expectedScope:c.historyScope,readBytes:fs.readFile});
 for(const priorDelta of c.historyDeltas){const d=JSON.parse(await read(priorDelta.descriptor));await read(priorDelta.declaredOwner.definition);state=await mergePlanHistoryDelta(state,{...priorDelta,listing:declaredListing(state,d),readBytes:fs.readFile});}
 assert.equal(state.headSha256,CASE.priorHead);const before=summary(state);assert.deepEqual(before,Object.fromEntries(Object.keys(before).map(k=>[k,e.prior.summary[k]])));
 const latest=api.latestReverseFailedAttempt(state,200);assert.equal(latest.request.value.id,c.failedParent.attemptId);assert.equal(latest.namespace,c.failedParent.namespace);
 const parent=await readDirectHistoryRole(state,{...c.failedParent,role:'failed-parent',readBytes:fs.readFile});assert.equal(parent.blocked.length,2);Object.assign(bindings,parent.fileBindings);
 const initialListing=await listing();assertPlanHistoryMembers(state,initialListing,[...ctorDelta.files,...mathDelta.files,...adminDelta.files].filter(f=>f.rootId!==null));
 const historyDeltas=[{descriptor:ctorD,declaredOwner:ctorDelta.owner},{descriptor:mathD,declaredOwner:mathDelta.owner},{descriptor:adminD,declaredOwner:adminDelta.owner}];
 for(const [i,d]of [ctorDelta,mathDelta,adminDelta].entries())state=await mergePlanHistoryDelta(state,{...historyDeltas[i],listing:declaredListing(state,d),readBytes});
 const finalListing=await listing();assertPlanHistoryMembers(state,finalListing);for(const id of Object.keys(initialListing))assert.deepEqual(finalListing[id].map(canonical).sort(),initialListing[id].map(canonical).sort());
 const after=summary(state);assert.deepEqual(after,{...before,historyWorlds:before.historyWorlds+4,closedCampaigns:before.closedCampaigns+1});
 assert.equal(api.latestReverseFailedAttempt(state,200).request.value.id,c.failedParent.attemptId);const finalParent=await readDirectHistoryRole(state,{...c.failedParent,role:'failed-parent',readBytes:fs.readFile});assert.deepEqual(finalParent.request,parent.request);assert.deepEqual(finalParent.blocked,parent.blocked);
 const report={status:SEAL_STATUS,archivalIntegrity:'FAILED',archivalErrors:[ERROR_CODE],normalActualReviewPassed:false,normalExportAllowed:false,completeFormedWorldArchivalVerified:false,administrativeSealOnly:true,
  checkpoint:c.history,checkpointReview:c.historyReview,historyScope:c.historyScope,priorHistoryReport:CASE.prior,priorHistoryDeltas:c.historyDeltas,historyDeltas,completeHistoryDeltas:[...c.historyDeltas,...historyDeltas],previousHeadSha256:CASE.priorHead,headSha256:state.headSha256,
  context:CASE.context,plan:CASE.plan,planAudit:CASE.planReview,completion:CASE.completion,candidate:CASE.candidate,actualAudit:CASE.failureReview,coordinateFragmentEvidence:CASE.fragment,constructorOwner:CASE.constructorOwner,mathOwner:CASE.mathOwner,administrativeOwner:adminDefinition,administrativeObservation:observationDescriptor,qualification:cfg.qualification,
  selection:c.selection,designDisposition:c.designDisposition,comparisonEvidence:p.comparisonEvidence,before,summary:{...after,constructorFiles:10,constructorPartialWorlds:4,mathematicalFiles:1,mathematicalFullWorlds:0,administrativeFiles:1,administrativeFullWorlds:0,newPublicClaims:0,newAccepted:0,consumedInputs:0,maximumInputs:1},
  archivalFacts:facts,originalOwnerDefinitionsPreserved:true,unclaimedMathOwnerTransported:true,mathematicalOwnerSynthesized:false,metadataOnlyOwnerNotPhysicalProducer:true,nonIdentityWorlds:e.candidate.nonIdentityWorlds,originalArchiveValidation:e.candidate.archiveValidation,
  failedParentUnchanged:{sourceLevelId:200,...c.failedParent,authenticatedBeforeAndAfter:true,blocked:finalParent.blocked.map(x=>x.descriptor)},priorFutureParents:CASE.prior,completeBeforeAfterMembersEqual:true,partialHistoryAuthenticationGranted:false,
  checkpointReexported:false,oldFilesChanged:false,oldLiveByteIntegrityClaimed:false,newConstructions:0,newSearches:0,newLedgerClaims:0,newReplayCalls:0,newModels:0,recoveredLevelSpecsCreated:0,automaticDesignAcceptance:false,selectionWritten:false,formalAdoptionPerformed:false,
  consumerContract:'Explicit administrative archival-failure contract required; this is not a normal ACTUAL/EXPORT PASS.',policyObservation,configuration,exportScript:{path:SELF,sha256:sha(selfBytes)},fileBindings:{...bindings,[SELF]:sha(selfBytes),[c.history.path]:c.history.sha256,[c.historyReview.path]:c.historyReview.sha256},errors:[]};
 for(const[f,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(f)),h,'Evidence drift '+f);assert.equal(await fs.realpath(SELF),await fs.realpath(fileURLToPath(import.meta.url)));
 // All three deltas have passed the unchanged v9 merge and real membership
 // before any output is persisted. No writes to any of the seven namespaces.
 await fs.mkdir(OUT);for(const d of outputs)await fs.writeFile(d.path,virtual.get(d.path),{flag:'wx'});
 const reportPath=OUT+'/report.json',bytes=encode(report);await fs.writeFile(reportPath,bytes,{flag:'wx'});return{report:{path:reportPath,sha256:sha(bytes)},headSha256:state.headSha256,status:SEAL_STATUS};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'One exact configuration descriptor JSON argument required');console.log(JSON.stringify(await sealSource200ArchivalFailure(JSON.parse(process.argv[2]))));
}

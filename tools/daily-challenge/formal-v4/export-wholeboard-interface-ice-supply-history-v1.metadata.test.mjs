import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {SELF,QUALIFICATION_PIN,ICE_RUNTIME_METADATA,readFrozenIceMetadata,buildIceSupplyOwnerDelta,assertStoredIceSupplyCandidate,assertActiveRegionParentSequence} from './export-wholeboard-interface-ice-supply-history-v1.mjs';
import {historyExportMode} from './export-axis-ice-active-region-history-v3.mjs';
import * as api from './wholeboard-interface-ice-supply-batch-task-v1.mjs';
import {VERSION as FACTORY_VERSION,LIMITS} from './wholeboard-interface-ice-supply-stock-v1.mjs';
import {BATCH_PARENT_POLICY,describeBatchDisposition,assertCompleteBatchDisposition} from './wholeboard-interface-ice-supply-batch-task-v1.mjs';
import {recipeIdentity} from './axis-ice-active-region-batch-task-v2_1.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008/',OUT=process.env.INTERFACE_ICE_SUPPLY_EXPORT_METADATA_OUT;
assert(OUT);assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');await fs.mkdir(OUT,{recursive:false});
const bindings={},checks=[],sha=b=>createHash('sha256').update(b).digest('hex'),canonical=p=>path.resolve(p).replaceAll('\\','/').toLowerCase();
async function read(p){const b=await fs.readFile(p);bindings[p]=sha(b);return b;}
async function save(n,q){const p=OUT+'/'+n,b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});bindings[p]=sha(b);}
const qualification=JSON.parse(await read(QUALIFICATION_PIN.path));assert.equal(bindings[QUALIFICATION_PIN.path],QUALIFICATION_PIN.sha256);assert.equal(qualification.status,api.QUALIFICATION_STATUS);

test('unchanged owner-bound parent overlay reauthenticates the two saved same-source failures, and refuses future/wrong/missing evidence',async()=>{
 const original={path:V+'proof/active-region-fixed64-metadata-private-02/report.json',sha256:'7299ba70d771906efe0a230a85d2497d501711e801e288c4e8db0f778df44e37'},report=JSON.parse(await read(original.path));assert.equal(bindings[original.path],original.sha256);
 async function oldBytes(p){const b=await read(p);assert.equal(sha(b),report.fileBindings[p]);return b;}
 const chain=JSON.parse(await oldBytes(V+'proof/active-region-fixed64-metadata-private-02/chain/report.json')),events=chain.events,qs=await Promise.all(events.map(async e=>JSON.parse(await oldBytes(e.receipt.path)))),e=events[0].parent;
 const seeds=[{sourceLevelId:e.sourceLevelId,namespace:e.namespace,request:{id:e.attemptId,startedAt:e.startedAt},receipt:{accepted:false,sourceLevelId:e.sourceLevelId,level:qs[1].level},evidence:e}],p={parentResolutionPolicy:BATCH_PARENT_POLICY,initialFailedParents:[e],recipes:qs.map(q=>({recipe:{recipeId:q.recipeId,sourceLevelId:q.sourceLevelId},initialFailedParent:e,parentResolutionPolicy:BATCH_PARENT_POLICY}))};
 const owned=new Map();for(const row of events){const n=row.newParent;for(const d of [row.receipt,n.request,n.result,n.identity,n.sidecar,...n.blocked])owned.set(d.path,d);}
 const args={p,qs,receipts:events.map(e=>e.receipt),seeds,scope:{baseDirectory:process.cwd(),roots:[]},ownerFiles:[...owned.values()],publicLedger:e.namespace,readBytes:oldBytes},result=await assertActiveRegionParentSequence(args);assert.deepEqual(result.report.events,chain.events);assert.equal(result.report.committedInputs,2);
 const future=structuredClone(qs);future[0].resolvedFailedParent=qs[1].resolvedFailedParent;await assert.rejects(()=>assertActiveRegionParentSequence({...args,qs:future}));
 const missing=args.ownerFiles.filter(d=>d.path!==events[0].newParent.blocked[1].path);await assert.rejects(()=>assertActiveRegionParentSequence({...args,ownerFiles:missing}));const wrong=structuredClone(args.ownerFiles);wrong.find(d=>d.path===events[0].newParent.result.path).sha256='0'.repeat(64);await assert.rejects(()=>assertActiveRegionParentSequence({...args,ownerFiles:wrong}));
 await save('saved-parent-chain.json',{original,report:result.report,futureParentRejected:true,missingBlockedRejected:true,wrongOwnerResultRejected:true,newPublications:0});checks.push({name:'saved-ordered-failure-parent-chain',pass:true});
});

// This is an in-memory transport fixture, not a candidate or a certificate.
// Its geometry and tiny proof are copied unchanged from the saved author test;
// it is deliberately not passed through production admission or history merge.
async function publicationFixture(accepted){
 const original=V+'proof/wholeboard-ice-supply-task-private-01/tiny-ice-joint.json',source=JSON.parse(await read(original)),pub=path.resolve('private-in-memory-ice-export'),id='a'.repeat(64),identity='b'.repeat(64),plan={path:'in-memory/plan.json',sha256:'c'.repeat(64)},recipe=source.recipe;
 const attempt={id,identityOrigin:id,retryIdentitySha256:identity,levelSha256:levelSha256(source.level)},q={recipeIndex:0,sourceLevelId:source.level.id,level:source.level,levelSha256:levelSha256(source.level),attempt,accepted,status:accepted?'IN_MEMORY_ACCEPTED_TRANSPORT_ONLY':'IN_MEMORY_LATE_REJECTION_TRANSPORT_ONLY',joint:source.q,proof:source.q.proof,lowerBound:{result:source.q.proof,method:'same-original-gate-ice-optional-clear-raw-joint'},route:source.q.route,drags:source.q.drags};
 const p={recipes:[{recipe}],admissionPolicy:{purpose:'in-memory-transport-not-production'}},stem=path.join(pub,id),files=[],memory=new Map();
 const add=(f,value)=>{const b=Buffer.from(JSON.stringify(value)),d={path:f,sha256:sha(b)};files.push(d);memory.set(canonical(f),b);return d;};
 add('in-memory/candidate.json',q);add(stem+'.request.json',attempt);add(stem+'.result.json',{accepted,status:q.status,levelSha256:q.levelSha256,lower:q.lowerBound.result,upper:q.route.search});add(stem+'.v4-wholeboard-plan.json',{attempt,plan,recipe,levelSha256:q.levelSha256,admissionPolicy:p.admissionPolicy,jointBudget:api.JOINT_BUDGET,phaseQuotes:api.icePhaseQuotes(recipe),referenceLowerNotTransferred:true});add(stem+'.v4-wholeboard-result.json',q);add(path.join(pub,'identities',identity+'.json'),{origin:id});
 if(!accepted)for(const f of[stem+'.blocked.json',path.join(pub,'identities',identity+'.blocked.json')])add(f,{attemptId:id,status:q.status});
 const readBytes=async d=>{const b=memory.get(canonical(d.path));assert(b);assert.equal(sha(b),d.sha256);return b;},owner={files,namespace:canonical(pub),attemptIds:[id],closedCampaigns:[]},args={owner,declaredOwner:{kind:'mathematical',definition:{path:'in-memory/no-owner-file',sha256:'d'.repeat(64)}},parentHeadSha256:'0'.repeat(64),read:readBytes,json:async d=>JSON.parse(await readBytes(d)),absent:async f=>assert(!memory.has(canonical(f))),rootFor:f=>canonical(f).startsWith(canonical(pub)+'/')?'private-fixture':null,canonical,qs:[q],p,cli:{plan},pub,api,PLAN_HISTORY_VERSION:'test-no-merge',levelSha256,sealedWorldIdentity};return{original,source,pub,stem,q,p,files,memory,add,owner,args};
}

test('ice joint proof/route and exact original sidecar shape survive accepted and late-rejected metadata transport',async()=>{
 const rows=[];for(const accepted of[false,true]){const f=await publicationFixture(accepted),d=await buildIceSupplyOwnerDelta(f.args);assert.equal(d.fullWorlds.length,2);assert(d.fullWorlds.every(w=>w.field==='level'));assert.equal(d.terminalRecords[0].blocked.length,accepted?0:2);assert.deepEqual(d.terminalRecords[0].result.value.lower,f.source.q.proof);assert.deepEqual(d.terminalRecords[0].result.value.upper,f.source.q.route.search);rows.push({accepted,fullFields:2,blocked:d.terminalRecords[0].blocked.length,original:f.original,originalProofPreserved:true});}
 const f=await publicationFixture(false),wrong=structuredClone(f.owner);wrong.files.find(d=>d.path.endsWith('.result.json')).sha256='0'.repeat(64);await assert.rejects(()=>buildIceSupplyOwnerDelta({...f.args,owner:wrong}));const missing={...f.owner,files:f.owner.files.filter(d=>!d.path.endsWith('.v4-wholeboard-result.json'))};await assert.rejects(()=>buildIceSupplyOwnerDelta({...f.args,owner:missing}));
 const duplicate={...f.owner,files:[...f.owner.files,{...f.owner.files.find(d=>d.path.endsWith('.request.json')),path:f.pub+'/./'+path.basename(f.stem)+'.request.json'}]};await assert.rejects(()=>buildIceSupplyOwnerDelta({...f.args,owner:duplicate}));
 const changedJoint=structuredClone(f.q);changedJoint.joint.status='invented';await assert.rejects(()=>buildIceSupplyOwnerDelta({...f.args,qs:[changedJoint]}));const changedRecipe={...f.p,recipes:[{recipe:{...f.p.recipes[0].recipe,bodyCount:4}}]};await assert.rejects(()=>buildIceSupplyOwnerDelta({...f.args,p:changedRecipe}));
 await save('ice-publication-fixtures.json',{rows,negativeCases:['wrongSHA','missingOriginalSidecar','duplicateCanonicalOwner','changedJoint','changedRecipeAndPhaseQuotes'],inMemoryOnly:true,productionAdmissionCalled:false,oldTinySearchReexecuted:false,newOwnerOrPublicationFiles:0});checks.push({name:'ice-proof-route-sidecar-payload',pass:true});
});

test('all eleven opening fields remain discoverable, unclaimed fulls survive, and zero-full owners emit no mathematical delta',async()=>{
 const f=await publicationFixture(false),full=f.source.level,raw={level:full,placeholderWorld:full,plain:{level:full},built:{level:full,placeholderWorld:full,plain:{level:full}},constructionTemplateLevel:full,templateLevel:full,constructionTemplatePacket:{level:full},input:{level:full},construction:{level:full}},d=f.add('in-memory/all-old-opening-fields.json',raw),none=f.add('in-memory/no-full.json',{level:null,partition:{blocks:[]},accepted:false}),owner={namespace:'in-memory',files:[d,none],attemptIds:[],closedCampaigns:[{id:'in-memory'}]};const delta=await buildIceSupplyOwnerDelta({...f.args,owner});assert.equal(delta.fullWorlds.length,11);assert.equal(delta.terminalRecords.length,0);assert.deepEqual(delta.closedCampaigns,owner.closedCampaigns);assert(delta.fullWorlds.every(w=>levelSha256(w.level)===f.q.levelSha256));
 for(const n of[0,1])assert.equal(historyExportMode({consumedInputs:48,formedFullWorlds:n,publicClaimsStarted:0,accepted:0}).includeMathDelta,false);assert.equal(historyExportMode({consumedInputs:48,formedFullWorlds:1,publicClaimsStarted:1,accepted:0}).includeMathDelta,true);
 await save('full-fields-and-modes.json',{openingFieldCount:11,allFieldsReferToOnePreviouslySavedTinyLayout:true,terminalCount:0,noFullAndUnclaimedMathDelta:false,newPhysicalLayouts:0,newHistoryLoads:0});checks.push({name:'all-full-fields-unclaimed-and-no-full',pass:true});
});

test('stored no-full metadata and interrupted suffix cannot become formal supply or a normal export',async()=>{
 const recipe={recipeId:'synthetic-no-full-only',sourceLevelId:998302,source:{levelSha256:'d'.repeat(64)}},prop={recipes:[recipe,{...recipe,recipeId:'synthetic-unexecuted'}]},accounting={version:FACTORY_VERSION,qualificationOnly:false,limits:LIMITS,interfacePreferenceMeter:{version:'staggered-interface-ordering-preference-v1',checks:3,byKind:{'placement-cell':3},maxChecks:1000000,maxMilliseconds:30000,elapsedMilliseconds:1,worlds:0},partialNodes:10000,dfsTransitions:4,partialColourSupportChecks:12,partialColourSupportCheckLimit:1000000,fullWorldReservations:0,fullWorlds:0,firstFullTerminal:true,newModels:0,newSearches:0,newReplays:0,newClaims:0},b={version:FACTORY_VERSION,recipeSha256:recipeIdentity(recipe),sourceLevelSha256:recipe.source.levelSha256,sourceLevelId:recipe.sourceLevelId,found:false,level:null,levelSha256:null,accepted:false,catalogEligible:false,formalReady:false,accounting,constructionCalls:{retile:1,colour:0},ok:false,reason:'in-memory-node-budget',status:'WHOLEBOARD_ICE_NO_FULL_TERMINAL'},q={version:api.VERSION,recipeId:recipe.recipeId,sourceLevelId:recipe.sourceLevelId,sourceLevelSha256:recipe.source.levelSha256,formalId:null,stageKey:null,difficulty:3,formalReady:false,catalogEligible:false,designAccepted:false,designDisposition:api.HOLDS,mathematicalEvidenceValidated:false,redesignRequired:true,errors:[],level:null,levelSha256:null,attempt:null,proof:null,joint:null,lowerBound:null,route:null,drags:null,routeSha256:null,U:null,L:null,accepted:false,accounting};assertStoredIceSupplyCandidate(q,b,recipe);
 const formal=structuredClone(q);formal.formalId='invented';assert.throws(()=>assertStoredIceSupplyCandidate(formal,b,recipe));const budget=structuredClone(b);budget.accounting.partialNodes=10001;assert.throws(()=>assertStoredIceSupplyCandidate({...q,accounting:budget.accounting},budget,recipe));
 const partial=describeBatchDisposition(prop.recipes,1,[0],'metadata IO terminal');assert.throws(()=>assertCompleteBatchDisposition(partial));const source=(await read(SELF)).toString();assert(source.indexOf('api.assertCompleteBatchDisposition(done.disposition)')<source.indexOf('const initialListing=await listing()'));assert(source.includes('const parentOverlay=await assertActiveRegionParentSequence('));
 await save('normal-export-refusals.json',{formalSlotRejected:true,budgetOverflowRejected:true,interruptedSuffixRejected:true,unchangedOrderedParentImplementationUsed:true,inMemoryMetadataOnly:true});checks.push({name:'no-full-budget-formal-and-interrupted-boundaries',pass:true});
});

test('immutable external ice map binds frozen bytes and saved proof without runtime or replay',async()=>{
 const descriptor=ICE_RUNTIME_METADATA,anchor=JSON.parse(await read(descriptor.path));assert.equal(bindings[descriptor.path],descriptor.sha256);const v=anchor.frozenToolchainBindingVerification;
 const plan={bindings:{...v.bindings}},json=async d=>{const b=await read(d.path);assert.equal(sha(b),d.sha256);return JSON.parse(b);},readDescriptor=async d=>{const b=await read(d.path);assert.equal(sha(b),d.sha256);return b;},args={descriptor,json,read:readDescriptor,plan,qualification};
 const rt=await readFrozenIceMetadata(args);assert.equal(Object.keys(rt.iceBindings).length,36);
 const saved=JSON.parse(await read(V+'proof/wholeboard-ice-supply-task-private-01/tiny-ice-joint.json'));api.assertIceJointReceipt(saved.q,saved.level,saved.recipe,rt,{qualificationOnly:true,floor:1,upper:3});
 const altered=structuredClone(saved.q);delete altered.proof.iceBindings['src/core/types.ts'];altered.proof.iceProofSha256=levelSha256(altered.proof.iceBindings);assert.throws(()=>api.assertIceJointReceipt(altered,saved.level,saved.recipe,rt,{qualificationOnly:true,floor:1,upper:3}));
 const badPlan=structuredClone(plan);badPlan.bindings['src/core/types.ts']='0'.repeat(64);await assert.rejects(()=>readFrozenIceMetadata({...args,plan:badPlan}));
 const badQualification=structuredClone(qualification);delete badQualification.fileBindings['src/core/types.ts'];await assert.rejects(()=>readFrozenIceMetadata({...args,qualification:badQualification}));
 await assert.rejects(()=>readFrozenIceMetadata({...args,descriptor:{...descriptor,sha256:'0'.repeat(64)}}));
 const participation=structuredClone(saved.q);participation.iceParticipation.actualInstances=1;assert.throws(()=>api.assertIceJointReceipt(participation,saved.level,saved.recipe,rt,{qualificationOnly:true,floor:1,upper:3}));
 await save('external-ice-map.json',{anchor:descriptor,field:'frozenToolchainBindingVerification',exactBindings:36,proofMapForgeryRejected:true,wrongPlanRejected:true,missingQualificationBindingRejected:true,wrongAnchorRejected:true,changedParticipationRejected:true,originalTinyProofReadOnly:true,newModels:0,newReplays:0,newSearches:0});checks.push({name:'external-ice-map-and-participation',pass:true});
});


test('72 fixed same-source metadata rows use the new ordered overlay without advancing a failed parent',async()=>{
 const original=V+'proof/active-region-fixed64-metadata-private-02/chain/report.json',chain=JSON.parse(await read(original)),e=chain.events[0].parent;
 const seed={sourceLevelId:e.sourceLevelId,namespace:e.namespace,request:{id:e.attemptId,startedAt:e.startedAt},receipt:{accepted:false,sourceLevelId:e.sourceLevelId},evidence:e};
 const memory=new Map(),ownerFiles=[],recipes=[],qs=[],receipts=[];for(let i=0;i<72;i++){const recipe={recipeId:'in-memory-interface-'+i,sourceLevelId:e.sourceLevelId},q={recipeIndex:i,recipeId:recipe.recipeId,sourceLevelId:e.sourceLevelId,resolvedFailedParent:e,attempt:null,accepted:false,level:null},bytes=Buffer.from(JSON.stringify(q)),d={path:'in-memory/72-candidate-'+i+'.json',sha256:sha(bytes)};memory.set(d.path,bytes);ownerFiles.push(d);receipts.push(d);qs.push(q);recipes.push({recipe,initialFailedParent:e,parentResolutionPolicy:BATCH_PARENT_POLICY});}
 const p={parentResolutionPolicy:BATCH_PARENT_POLICY,initialFailedParents:[e],recipes},args={p,qs,receipts,seeds:[seed],scope:{baseDirectory:process.cwd(),roots:[]},ownerFiles,publicLedger:e.namespace,readBytes:async p=>{assert(memory.has(p));return memory.get(p);}};
 const result=await assertActiveRegionParentSequence(args);assert.equal(result.report.maximumInputs,72);assert.equal(result.report.committedInputs,72);assert(result.report.events.every(e=>!e.advanced));
 const complete=describeBatchDisposition(recipes.map(r=>r.recipe),72,Array.from({length:72},(_,i)=>i),null);assertCompleteBatchDisposition(complete);
 const wrong=structuredClone(ownerFiles);wrong[71].sha256='0'.repeat(64);await assert.rejects(()=>assertActiveRegionParentSequence({...args,ownerFiles:wrong}));
 const tooMany={...p,recipes:[...recipes,recipes[0]]};await assert.rejects(()=>assertActiveRegionParentSequence({...args,p:tooMany,qs:[...qs,qs[0]],receipts:[...receipts,receipts[0]]}));
 const partial=describeBatchDisposition(recipes.map(r=>r.recipe),71,Array.from({length:71},(_,i)=>i),'metadata IO refusal');assert.throws(()=>assertCompleteBatchDisposition(partial));
 await save('72-parent-and-disposition.json',{declaredInputs:72,syntheticNoFullMetadataRows:72,parentsAdvanced:0,wrongLastOriginalOwnerRejected:true,over72Refused:true,interruptedSuffixRefused:true,newFullWorlds:0,newPublicFiles:0});checks.push({name:'72-exact-original-parent-and-interrupted-contract',pass:true});
});
test('transport source, all-world extractor and original parent sequence preserve preceding audited code',async()=>{
 const current=String(await read(SELF)),previous=String(await read(T+'export-wholeboard-ice-supply-history-v1.mjs')),parent=String(await read(T+'export-axis-ice-active-region-history-v3.mjs'));
 const extract=s=>s.slice(s.indexOf('const fields=['),s.indexOf('\nif(process.argv[1]',s.indexOf('const fields=['))).trim();
 const ownerNew=current.slice(current.indexOf('const fields=['),current.indexOf('export async function assertActiveRegionParentSequence(')).trim();assert.equal(ownerNew,extract(previous));
 const parentOnly=s=>s.slice(s.indexOf('export async function assertActiveRegionParentSequence('),s.indexOf('\nif(process.argv[1]',s.indexOf('export async function assertActiveRegionParentSequence('))).trim();assert.equal(parentOnly(current),parentOnly(parent));
 assert(current.includes("load(T+'plan-history-adapter-v7.mjs')"));assert(current.includes('api.assertInterfaceConstructionMetadata(b,recipe)'));assert(!current.includes("load(T+'plan-history-adapter-v6.mjs')"));
 await save('preserved-transport-source.json',{allElevenFullFieldsOwnerSidecarsAndDoubleSealsByteIdentical:true,parentSequenceBodyByteIdentical:true,parentFactoryNowQualified72Overlay:true,currentExporterUsesV7:true,oldExportersUnchanged:true});checks.push({name:'preserved-original-owner-transport-source',pass:true});
});

test.after(async()=>{const own=T+'export-wholeboard-interface-ice-supply-history-v1.metadata.test.mjs',b=await build({entryPoints:[SELF,own],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-plain-export-metadata',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(b.metafile.inputs))toolBindings[p]=sha(await read(p));for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h);await save('report.json',{status:checks.length===7?'WHOLEBOARD_INTERFACE_ICE_SUPPLY_HISTORY_EXPORT_METADATA_PASS':'WHOLEBOARD_INTERFACE_ICE_SUPPLY_HISTORY_EXPORT_METADATA_INCOMPLETE',checks,qualification:QUALIFICATION_PIN,toolBindings,fileBindings:{...bindings},newHistoryLoads:0,newConstructions:0,newDomains:0,newModels:0,newReplays:0,newSearches:0,newClaims:0,newOwnerOrPublicationFiles:0,actualExportCalled:false,oldEvidenceUnchanged:true,syntheticPublicationFixturesInMemoryOnly:true,oldMathematicalProofsRevalidated:false});});

/** Metadata-only administration qualification. No builder, exporter, factory,
 * runtime, replay, search, claim, or history loader is invoked. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import * as b from './build-wholeboard-three-band-ice-supply-metadata-v1.mjs';
import * as e from './export-wholeboard-three-band-ice-supply-history-v1.mjs';
import * as api from './wholeboard-three-band-ice-supply-batch-task-v1.mjs';
import {recipeIdentity} from './axis-ice-active-region-batch-task-v2_1.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';

const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/';
const SELF=T+'wholeboard-three-band-ice-supply-administration-v1.test.mjs';
const out=process.argv[2];assert(out);assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');await fs.mkdir(out);
const bindings={},tests=[],sha=x=>createHash('sha256').update(x).digest('hex'),clone=structuredClone;
const descriptor=n=>({path:'synthetic-administration/'+n+'.json',sha256:sha(n)});
const canonical=p=>path.resolve(p).replaceAll('\\','/').toLowerCase();
async function read(p,h){const raw=await fs.readFile(p),actual=sha(raw);if(h)assert.equal(actual,h,p);bindings[p]=actual;return raw;}
async function json(p,h){return JSON.parse(await read(p,h));}
async function test(name,fn){try{await fn();tests.push({name,pass:true});}catch(error){tests.push({name,pass:false,error:error.stack});}}
async function save(name,value){await fs.writeFile(out+'/'+name+'.json',JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
const delta=n=>({descriptor:descriptor(n),declaredOwner:{id:n,namespace:'synthetic-administration',kind:'construction',definition:descriptor(n+'-owner')}});
function priorReport(){const old=[delta('prior-a'),delta('prior-b')],next=[delta('post-n20-construction'),delta('post-n20-mathematical')],head=next.at(-1).descriptor.sha256;
 return{status:b.POST_N20_STATUS,errors:[],headSha256:head,previousHeadSha256:old.at(-1).descriptor.sha256,
 checkpoint:descriptor('checkpoint'),checkpointReview:descriptor('checkpoint-review'),context:descriptor('n20-context'),plan:descriptor('n20-plan'),completion:descriptor('n20-completion'),
 checkpointReexported:false,oldFilesChanged:false,newConstructions:0,newSearches:0,newLedgerClaims:0,newReplayCalls:0,selection:b.SELECTION,
 before:{closedCampaigns:40},summary:{closedCampaigns:41,consumedInputs:1,maximumInputs:1},candidateStatuses:[{sourceLevelId:118}],unpersistedInputs:[],persistedConstructionWorldFiles:[descriptor('n20-original-full')],
 historyScope:{roots:Array.from({length:7},(_,i)=>({id:'root'+i,physicalPath:'synthetic-administration/root'+i}))},priorHistoryDeltas:old,historyDeltas:next,completeHistoryDeltas:[...old,...next],
 comparisonEvidence:{provenance:descriptor('comparison'),review:descriptor('comparison-review')},
 futureParents:{historyHeadSha256:head,requestedSourceLevelIds:[115,118,124],newHistoryTraversal:false,newModelCalls:0,newSearches:0,mathematicalProofRevalidated:false,
 resolved:b.SOURCE_IDS.map(sourceLevelId=>({sourceLevelId,status:'RESOLVED_ORIGINAL_FAILED_PARENT',receipt:descriptor('receipt'+sourceLevelId),attemptId:sha('attempt'+sourceLevelId),startedAt:'2026-10-10T00:00:00.000Z',namespace:'synthetic-administration',blocked:[descriptor('origin-blocked'+sourceLevelId),descriptor('retry-blocked'+sourceLevelId)],readDirectHistoryRolePassed:true,mathematicalProofRevalidated:false})),unresolved:[]}};
}

// Only recipe metadata is formed. These deterministic synthetic test seeds are
// never published as future input recipes and no factory consumes them.
const previousDraft=await json(V+'design/wholeboard-interface-ice-seventytwo-draft-01/proposal.json','b82d2d279cf3ba7fb6532ad72e26ed7a7eb81ad585811f59f660afdbf477d6d6');
const previousCompletion=await json(V+'design/wholeboard-ice-d3-supply-twentyfour-actual-01/completion.json','e6808e5b3ba9326fd03e0f797ab2716862a3466cad15272eb1ef4db9473664af');
const previousPlan=await json(previousCompletion.plan.path,previousCompletion.plan.sha256);
const templates=new Map([115,124].map(id=>[id,previousDraft.recipes.find(r=>r.sourceLevelId===id&&r.shapeProfile==='bar-mix')]));
templates.set(118,previousPlan.recipes.find(r=>r.recipe.sourceLevelId===118&&r.recipe.shapeProfile==='bar-mix').recipe);
const recipes=Array.from({length:72},(_,i)=>{const sourceLevelId=api.FIXED_SOURCE_ORDER[i%3],arm=Math.floor(i/3)%2?'interface':'generic',c=clone(templates.get(sourceLevelId));
 Object.assign(c,{recipeId:'synthetic-admin-only-'+i,seed:910000+i*2,colourSeed:910001+i*2,bodyCount:api.BODY_COUNTS[sourceLevelId][Math.floor(i/6)%3],primaryExitQuota:2});
 if(arm==='generic'){delete c.interfaceLayout;delete c.interfacePreferenceVersion;}else{c.interfaceLayout={topSplitX:2,bottomSplitX:3,splitY:3,topLeftAxis:'horizontal'};c.interfacePreferenceVersion='staggered-interface-ordering-preference-v1';}
 return{recipeId:c.recipeId,sourceLevelId,source:c.source,bodyCount:c.bodyCount,arm,constructionContract:c,solvePolicy:api.SOLVE_POLICY,solvePolicySha256:api.SOLVE_POLICY_SHA};});
const draft={schemaVersion:1,status:'METADATA_DESIGN_PROPOSAL_NOT_EXECUTABLE',executable:false,experimentId:'synthetic-administration-only',scopeDescriptor:api.SCOPE,sourceIds:api.FIXED_SOURCE_ORDER,maximumInputs:72,recipesPerSource:24,admissionPolicy:api.ADMISSION_POLICY,selection:b.SELECTION,designDisposition:api.HOLDS,recipes};
const taskDescriptor={path:api.SELF,sha256:sha(await read(api.SELF))};
const qualified=await json(b.QUALIFICATION_PIN.path,b.QUALIFICATION_PIN.sha256);assert.equal(qualified.status,api.QUALIFICATION_STATUS);assert.equal(qualified.toolBindings[api.SELF],taskDescriptor.sha256);assert.deepEqual(qualified.errors,[]);

await test('post-n20 complete chain and source parents only; omission/reorder/old-batch/future-head refuse',()=>{
 const h=priorReport(),v=b.inheritPostN20History(h);assert.deepEqual(v.inherited.historyDeltas,h.completeHistoryDeltas);assert.equal(v.inherited.failedParents.length,3);
 for(const change of [x=>x.completeHistoryDeltas.reverse(),x=>x.completeHistoryDeltas.pop(),x=>x.headSha256=sha('wrong'),x=>x.summary.closedCampaigns++,x=>x.summary.consumedInputs=24,x=>x.candidateStatuses[0].sourceLevelId=124,x=>x.status='WHOLEBOARD_INTERFACE_ICE_SUPPLY_HISTORY_DELTAS_EXPORTED_AND_V7_VALIDATED',x=>x.futureParents.resolved.pop(),x=>x.futureParents.resolved[0].blocked.pop(),x=>x.futureParents.resolved[0].readDirectHistoryRolePassed=false,x=>x.futureParents.historyHeadSha256=sha('future')]){const wrong=clone(h);change(wrong);assert.throws(()=>b.inheritPostN20History(wrong));}
});

await test('ordinary and original revalidation parents retain exact origin blocked paths',()=>{
 const origin=sha('origin'),retry=sha('retry'),startedAt='2026-10-10T00:00:00.000Z';
 for(const revalidation of [false,true]){const id=revalidation?origin+'-revalidation-12345678-1234-4123-8123-123456789abc':origin;
  const a={id,identityOrigin:origin,retryIdentitySha256:retry,startedAt,...revalidation?{revalidates:origin}:{}},p={attemptId:id,startedAt,blocked:[{...descriptor('origin'),path:'synthetic-administration/'+origin+'.blocked.json'},{...descriptor('retry'),path:'synthetic-administration/identities/'+retry+'.blocked.json'}]};
  b.assertParentPublicationDeclaration(p,a);const h=priorReport();h.futureParents.resolved[1].attemptId=id;b.inheritPostN20History(h);
  for(const change of [x=>x.identityOrigin=sha('wrong'),x=>x.retryIdentitySha256=sha('wrong'),x=>x.id=sha('wrong'),x=>x.revalidates=sha('wrong')]){const wrong=clone(a);change(wrong);assert.throws(()=>b.assertParentPublicationDeclaration(p,wrong));}
  if(revalidation){const wrong=clone(p);wrong.blocked[0].path='synthetic-administration/'+id+'.blocked.json';assert.throws(()=>b.assertParentPublicationDeclaration(wrong,a));}
 }
 const context={version:'accepted-ice20-one-final-bomb-d3-v1',targetSlot:'daily-mechanisms-bomb-120-d3-03',acceptedBaseAdaptation:true},cd=descriptor('n20-context'),plan={version:context.version,contextDescriptor:cd,maximumInputs:1},done={version:context.version,maximumInputs:1,consumedInputs:1,formedFullWorlds:1,status:'ACCEPTED_ICE20_BOMB_TASK_CLOSED',closed:true,finalizationError:null,unpersistedInputs:[]};
 api.assertPostN20Metadata(context,plan,done,cd);assert.throws(()=>api.assertPostN20Metadata(context,plan,{...done,closed:false},cd));
});

await test('72 fixed two-arm metadata preserves original construction 3/31 and distinct solve16 envelope',()=>{
 api.assertIceSupplyProposal(draft,72);const original=JSON.stringify(draft),p=b.composeIceSupplyProposal(draft,descriptor('test-draft'),b.QUALIFICATION_PIN,taskDescriptor,descriptor('test-postn20'),priorReport());
 assert.equal(JSON.stringify(draft),original);assert.deepEqual(p.recipes,draft.recipes);assert.equal(p.metadataPreparation.seedsGenerated,false);
 assert.equal(new Set(recipes.flatMap(r=>[r.constructionContract.seed,r.constructionContract.colourSeed])).size,144);
 for(const r of recipes){assert.equal(r.constructionContract.searchFloor,31);assert.equal(r.solvePolicy.searchFloor,16);assert.equal(api.constructionRecipe(r),r.constructionContract);assert.notEqual(recipeIdentity(r),recipeIdentity(r.constructionContract));}
 for(const change of [x=>x.recipes.reverse(),x=>x.recipes[0].constructionContract.searchFloor=16,x=>x.recipes[0].solvePolicy={...api.SOLVE_POLICY,searchFloor:31},x=>x.recipes[0].arm='interface',x=>x.recipes[0].bodyCount++,x=>x.recipes[1].constructionContract.seed=x.recipes[0].constructionContract.seed]){const wrong=clone(draft);change(wrong);assert.throws(()=>api.assertIceSupplyProposal(wrong,72));}
 const pd=descriptor('proposal'),review={status:api.PROPOSAL_REVIEW_STATUS,proposal:pd,errors:[],newConstructions:0,newSearches:0,newClaims:0},context=b.composeIceSupplyContext(p,pd,review,descriptor('review'));assert.deepEqual(context.historyDeltas,priorReport().completeHistoryDeltas);assert.deepEqual(context.designDisposition,api.HOLDS);assert.throws(()=>b.composeIceSupplyContext(p,pd,{...review,newClaims:1},descriptor('review')));
});

await test('all12 exact minimum holds persist; extensions allowed but removal/implicit approval rejected',async()=>{
 const holds=await json(api.HOLDS.path,api.HOLDS.sha256);b.assertDispositionMetadata(holds,holds);
 for(const change of [x=>x.decisions.pop(),x=>x.decisions[0].originalMathematicalEvidencePreserved=false,x=>x.remainingAutomaticallyDesignApproved=true]){const wrong=clone(holds);change(wrong);assert.throws(()=>b.assertDispositionMetadata(wrong,holds));}
 const extension=clone(holds);extension.decisions.push({...clone(holds.decisions[0]),formalId:'synthetic-extra-hold'});extension.heldCandidateCount++;b.assertDispositionMetadata(extension,holds);
});

function noFull(r){const f=api.factoryFor(r),a={version:f.VERSION,qualificationOnly:false,limits:f.LIMITS,partialNodes:10000,dfsTransitions:4,partialColourSupportChecks:12,partialColourSupportCheckLimit:1000000,fullWorldReservations:0,fullWorlds:0,firstFullTerminal:true,newModels:0,newSearches:0,newReplays:0,newClaims:0};
 if(r.arm==='interface')a.interfacePreferenceMeter={version:'staggered-interface-ordering-preference-v1',checks:3,byKind:{'placement-cell':3},maxChecks:1000000,maxMilliseconds:30000,elapsedMilliseconds:1,worlds:0};
 const built={version:f.VERSION,recipeSha256:recipeIdentity(r.constructionContract),sourceLevelSha256:r.source.levelSha256,sourceLevelId:r.sourceLevelId,found:false,level:null,levelSha256:null,accepted:false,catalogEligible:false,formalReady:false,accounting:a,constructionCalls:{retile:1,colour:0},ok:false,reason:'synthetic-partial-cap',status:'WHOLEBOARD_ICE_NO_FULL_TERMINAL'};
 const q={version:api.VERSION,recipeId:r.recipeId,sourceLevelId:r.sourceLevelId,sourceLevelSha256:r.source.levelSha256,formalId:null,stageKey:null,difficulty:null,experimentEnvelope:api.recipeEnvelope(r),formalReady:false,catalogEligible:false,designAccepted:false,designDisposition:api.HOLDS,mathematicalEvidenceValidated:false,redesignRequired:true,errors:[],level:null,levelSha256:null,attempt:null,proof:null,joint:null,lowerBound:null,route:null,drags:null,routeSha256:null,U:null,L:null,derivedCertificate:null,admissionBand:null,accepted:false,accounting:a};return{q,built};
}
await test('two original factory receipt schemas bind constructor hash, not experimental envelope hash',()=>{
 for(const r of [recipes[0],recipes[3]]){const{q,built}=noFull(r);e.assertStoredIceSupplyCandidate(q,built,r);
  for(const change of [x=>x.recipeSha256=recipeIdentity(r),x=>x.version='wrong-arm',x=>x.accounting.partialNodes=10001,x=>x.accounting.fullWorlds=1]){const bad=clone(built);change(bad);assert.throws(()=>e.assertStoredIceSupplyCandidate({...q,accounting:bad.accounting},bad,r));}
  assert.throws(()=>e.assertStoredIceSupplyCandidate({...q,difficulty:2},built,r));assert.throws(()=>e.assertStoredIceSupplyCandidate({...q,derivedCertificate:{L:31,U:31}},built,r));
 }
 const partial=api.describeBatchDisposition(recipes,71,Array.from({length:71},(_,i)=>i),'synthetic IO failure');assert.throws(()=>api.assertCompleteBatchDisposition(partial));
});

await test('original frozen map remains external and exact; no runtime initialized',async()=>{
 const anchor=await json(e.ICE_RUNTIME_METADATA.path,e.ICE_RUNTIME_METADATA.sha256),v=anchor.frozenToolchainBindingVerification;
 const args={descriptor:e.ICE_RUNTIME_METADATA,json:async d=>json(d.path,d.sha256),read:async d=>read(d.path,d.sha256),plan:{bindings:clone(v.bindings)},qualification:{fileBindings:clone(v.bindings)}};
 const rt=await e.readFrozenIceMetadata(args);assert.equal(Object.keys(rt.iceBindings).length,36);const wrong=clone(args.plan);wrong.bindings['src/core/types.ts']='0'.repeat(64);await assert.rejects(()=>e.readFrozenIceMetadata({...args,plan:wrong}));
});

await test('raw tiny proof plus separately derived certificate survive accepted and late-rejected original-owner transport',async()=>{
 const saved=await json(V+'proof/wholeboard-ice-supply-task-private-01/tiny-ice-joint.json'),certificate=api.deriveExactIceCertificate(saved.level,saved.q.proof,saved.q.route,{qualificationOnly:true,floor:1,upper:3});
 assert.equal(certificate.qualificationOnly,true);assert.equal(certificate.admissionBand,null);
 for(const accepted of [false,true]){const pub=path.resolve('synthetic-administration-public'),id=sha('attempt'),retry=sha('retry'),plan=descriptor('plan'),recipe=recipes[0],level=saved.level;
  const attempt={id,identityOrigin:id,retryIdentitySha256:retry,levelSha256:levelSha256(level)},q={recipeIndex:0,sourceLevelId:level.id,level,levelSha256:levelSha256(level),attempt,accepted,status:'SYNTHETIC_TRANSPORT_ONLY',joint:saved.q,derivedCertificate:certificate,proof:saved.q.proof,lowerBound:{result:saved.q.proof},route:saved.q.route};
  const p={recipes:[{recipe}],admissionPolicy:api.ADMISSION_POLICY},stem=path.join(pub,id),memory=new Map(),files=[];
  const add=(name,value)=>{const bytes=Buffer.from(JSON.stringify(value)),d={path:name,sha256:sha(bytes)};memory.set(canonical(name),bytes);files.push(d);return d;};
  add('synthetic-administration/candidate.json',q);add(stem+'.request.json',attempt);add(stem+'.result.json',{accepted,status:q.status,levelSha256:q.levelSha256,lower:q.proof,upper:q.route.search});add(stem+'.v4-wholeboard-result.json',q);add(stem+'.v4-wholeboard-plan.json',{attempt,plan,recipe,levelSha256:q.levelSha256,admissionPolicy:p.admissionPolicy,jointBudget:api.JOINT_BUDGET,phaseQuotes:api.icePhaseQuotes(recipe),referenceLowerNotTransferred:true});
  if(!accepted)for(const name of[stem+'.blocked.json',path.join(pub,'identities',retry+'.blocked.json')])add(name,{attemptId:id,status:q.status});
  const readBytes=async d=>{const bytes=memory.get(canonical(d.path));assert(bytes);assert.equal(sha(bytes),d.sha256);return bytes;},owner={files,namespace:canonical(pub),attemptIds:[id],closedCampaigns:[]};
  const args={owner,declaredOwner:{kind:'mathematical',definition:descriptor('never-written-owner')},parentHeadSha256:sha('parent'),read:readBytes,json:async d=>JSON.parse(await readBytes(d)),absent:async name=>assert(!memory.has(canonical(name))),rootFor:()=>null,canonical,qs:[q],p,cli:{plan},pub,api,PLAN_HISTORY_VERSION:'synthetic-no-history-merge',levelSha256,sealedWorldIdentity};
  const delta=await e.buildIceSupplyOwnerDelta(args);assert.equal(delta.fullWorlds.length,2);assert.deepEqual(delta.terminalRecords[0].result.value.lower,saved.q.proof);assert.equal(delta.terminalRecords[0].blocked.length,accepted?0:2);
  const bad=clone(q);bad.derivedCertificate.L++;await assert.rejects(()=>e.buildIceSupplyOwnerDelta({...args,qs:[bad]}));
 }
 await save('stored-tiny-certificate-transport',{source:V+'proof/wholeboard-ice-supply-task-private-01/tiny-ice-joint.json',certificate,certificateDerivedFromSavedProofAndSavedDualWitnessesOnly:true,productionAdmissionCalled:false,newModels:0,newReplayCalls:0,newSearches:0,newPublications:0});
});

await test('unchanged original-owner full-field extraction and ordered parent authentication source',async()=>{
 const current=String(await read(e.SELF)),old=String(await read(e.PREDECESSOR.path,e.PREDECESSOR.sha256));
 const owner=s=>s.slice(s.indexOf('const fields=['),s.indexOf('export async function assertActiveRegionParentSequence('));assert.equal(owner(current),owner(old));
 const parent=s=>s.slice(s.indexOf('export async function assertActiveRegionParentSequence('),s.indexOf('\nif(process.argv[1]',s.indexOf('export async function assertActiveRegionParentSequence(')));assert.equal(parent(current),parent(old));
 assert(current.includes('assert.deepEqual(q.designDisposition,ctx.designDisposition)'));assert(current.includes('api.assertIceJointReceipt(q.joint,q.level,recipe,iceRuntime)'));assert(current.includes('assert.deepEqual(q.derivedCertificate,q.joint?.derivedCertificate??null)'));
 assert(current.includes("const {PUBLIC_LEDGER}=await load(T+'low-twenty-io.mjs')"));assert(current.indexOf('api.assertCompleteBatchDisposition(done.disposition)')<current.indexOf('const initialListing=await listing()'));
 assert(current.includes('api.assertPostN20Metadata('));assert(current.includes('assert.equal(N,72)'));assert(current.includes('qualification.toolBindings?.[api.SELF]'));
});

const closure=await build({entryPoints:[SELF,b.SELF,e.SELF],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-three-band-administration',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};
for(const p of Object.keys(closure.metafile.inputs))toolBindings[p]=sha(await read(p));
for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);
const report={status:tests.every(t=>t.pass)?'THREE_BAND_ICE_ADMINISTRATION_METADATA_PASS':'THREE_BAND_ICE_ADMINISTRATION_METADATA_FAIL',tests,task:taskDescriptor,toolBindings,fileBindings:bindings,bindingBaseDirectory:process.cwd(),newHistoryLoads:0,newHistoryMerges:0,newDomains:0,newFullWorlds:0,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0,actualBuilderCalled:false,actualExporterCalled:false,syntheticRecipeMetadataNotProductionInputs:true,originalTinyMathReexecuted:false,certificateRecomputedFromSavedMetadataOnly:true,errors:tests.filter(t=>!t.pass)};
await save('report',report);console.log(JSON.stringify({report:{path:out+'/report.json',sha256:sha(await fs.readFile(out+'/report.json'))},tests:tests.length,failures:report.errors.length}));if(report.errors.length)process.exitCode=1;

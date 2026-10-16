import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {assertWholeBoardBatchProposal,assertWholeBoardRecipe,adaptivePhaseQuotes,describeBatchDisposition,assertCompleteBatchDisposition,SELF,JOINT_BUDGET} from './axis-ice-active-region-batch-task-v2.mjs';
import {BATCH_PARENT_POLICY,createOrderedFailedParentOverlay} from './active-region-batch-parent-overlay-v1.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const T='tools/daily-challenge/formal-v4/',P='deliverables/daily-formal-v4-20261008/proof/',TEST=T+'active-region-batch-task-v2.metadata.test.mjs';
const out=process.env.ACTIVE_REGION_V2_METADATA_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const originalPrivate={path:P+'active-region-axis-ice-task-private-02/report.json',sha256:'a76492933d1184957fe904fc5e81358d51b0e3ffb687fdac9f86662d8cd7f392'},originalFactory={path:P+'active-region-axis-ice-factory-private-02/report.json',sha256:'db77d7ca6d1981ff6f2663dbcb8870fe84c34402c38e846a12fa77f100d3ff84'};
const hash=b=>createHash('sha256').update(b).digest('hex'),bindings={},checks=[];
const bytes=async p=>{const b=await fs.readFile(p);bindings[p]=hash(b);return b;};
const bound=async d=>{const b=await bytes(d.path);assert.equal(hash(b),d.sha256);return JSON.parse(b);};
const write=async(p,value)=>{const b=JSON.stringify(value,null,2)+'\n';await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,b,{flag:'wx'});bindings[p]=hash(b);return{path:p,sha256:hash(b)};};
const save=(n,v)=>write(out+'/'+n,v);
const old=await bound(originalPrivate),factory=await bound(originalFactory);assert.equal(old.checks.length,11);assert(old.checks.every(q=>q.passed));
for(const[p,h]of Object.entries(old.toolBindings))assert.equal(hash(await bytes(p)),h,'Old mathematical tool unchanged: '+p);
const fromReport=async(r,p)=>{const rows=Object.entries(r.fileBindings).filter(([f])=>f.replaceAll('\\','/')===p);assert.equal(rows.length,1);return bound({path:rows[0][0],sha256:rows[0][1]});};
const savedFactory=await fromReport(factory,P+'active-region-axis-ice-factory-private-02/first-full.json'),savedPositive=await fromReport(old,P+'active-region-axis-ice-task-private-02/tiny-positive-before-assert.json');
const positiveLevel=savedPositive.level??savedPositive.fixture?.level;assert(positiveLevel?.blocks);
// ID-only adaptation of an already saved synthetic level. No geometry,
// colours, mechanics, model, factory or search is created or changed here.
const a={...savedFactory.q.level,id:positiveLevel.id},b=positiveLevel,source=positiveLevel.id;
assert.deepEqual(sealedWorldIdentity(a).shapeSha256,sealedWorldIdentity(savedFactory.q.level).shapeSha256);assert.deepEqual(sealedWorldIdentity(a).colorSha256,sealedWorldIdentity(savedFactory.q.level).colorSha256);
const draft=JSON.parse(await bytes('deliverables/daily-formal-v4-20261008/design/axis-ice-active-region-eight-proposal-01/proposal.json'));
const namespaceFor=name=>path.resolve(out,name,'private-public').replaceAll('\\','/').toLowerCase();
const scope={baseDirectory:process.cwd(),roots:[]};
const seed=(namespace)=>{const id='a'.repeat(64),d=suffix=>({path:namespace+'/'+suffix,sha256:'b'.repeat(64)}),request={id,startedAt:'2026-10-09T00:00:00.000Z'};return{sourceLevelId:source,namespace,request,receipt:{accepted:false,sourceLevelId:source,level:b},evidence:{policy:BATCH_PARENT_POLICY,origin:'sealed-history',sourceLevelId:source,recipeIndex:null,recipeId:null,namespace,attemptId:id,startedAt:request.startedAt,receipt:d('synthetic-seed.json'),request:d(id+'.request.json'),result:d(id+'.result.json'),blocked:[d(id+'.blocked.json'),d('identities/'+id+'.blocked.json')]}};};
const recipes=n=>Array.from({length:n},(_,i)=>({recipeId:'private-ordered-'+i,sourceLevelId:source}));
const plain=(i,parent,r,extra={})=>({qualificationOnly:true,syntheticMetadataFixture:true,recipeIndex:i,recipeId:r.recipeId,sourceLevelId:source,accepted:false,attempt:null,level:null,resolvedFailedParent:parent.evidence,status:'PRIVATE_NO_FULL',...extra});
async function publication(name,i,parent,r,level,{omit=null,mutate=null}={}){
 const f=sealedWorldIdentity(level),id=f.designSha256,request={id,levelSha256:f.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,colorAssignments:f.colorAssignments,designSha256:id,retryIdentitySha256:f.retryIdentitySha256,identityOrigin:id,redesignOf:parent.request.id,startedAt:'2026-10-09T00:00:01.000Z'};
 const q=plain(i,parent,r,{status:'PRIVATE_MATHEMATICAL_FAILURE_METADATA_ONLY',level,levelSha256:f.levelSha256,attempt:request,lowerBound:null,route:null});
 const result={accepted:false,status:q.status,levelSha256:q.levelSha256,finishedAt:'2026-10-09T00:00:02.000Z'},namespace=parent.namespace,values={request,result,identity:{origin:id},sidecar:q,blockAttempt:{attemptId:id,status:q.status},blockIdentity:{attemptId:id,status:q.status},candidate:q};
 if(mutate)mutate(values);
 const paths={request:namespace+'/'+id+'.request.json',result:namespace+'/'+id+'.result.json',identity:namespace+'/identities/'+f.retryIdentitySha256+'.json',sidecar:namespace+'/'+id+'.v4-wholeboard-result.json',blockAttempt:namespace+'/'+id+'.blocked.json',blockIdentity:namespace+'/identities/'+f.retryIdentitySha256+'.blocked.json',candidate:out+'/'+name+'/candidate-'+i+'.json'},ds={};
 for(const[k,v]of Object.entries(values)){if(k===omit){ds[k]={path:paths[k],sha256:hash(JSON.stringify(v,null,2)+'\n')};continue;}ds[k]=await write(paths[k],v);}
 return{q,receipt:ds.candidate,evidence:{request:ds.request,result:ds.result,identity:ds.identity,sidecar:ds.sidecar,blocked:[ds.blockAttempt,ds.blockIdentity]}};
}

test('fixed 64 same-source recipes retain unchanged physical and search limits',async()=>{
 const rs=Array.from({length:64},(_,i)=>({...structuredClone(draft.recipes[0]),recipeId:'private64-'+i,seed:10000+i})),p={...draft,recipes:rs};assertWholeBoardBatchProposal(p,64);rs.forEach(r=>assertWholeBoardRecipe(r));
 assert.throws(()=>assertWholeBoardBatchProposal({...p,recipes:[...rs,{...rs[0],recipeId:'private65'}]},65));
 assert.throws(()=>assertWholeBoardBatchProposal({...p,recipes:[rs[0],rs[0]]},2));assert.throws(()=>assertWholeBoardBatchProposal(p,63));
 assert.deepEqual(JOINT_BUDGET,{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});assert.equal(adaptivePhaseQuotes(rs[0])['admission-metadata'].maximumCandidateRecords,300);
 await save('fixed64-boundaries.json',{fixedRecipes:64,uniqueSources:1,sixtyFifthRejected:true,duplicateRecipeRejected:true,misstatedMaximumRejected:true,jointBudget:JOINT_BUDGET,metadataMaximum:300,physicalRecipesNotConstructed:true});checks.push({name:'fixed64-metadata-boundaries',passed:true});
});

test('no-full, unclaimed full and accepted rows never become failure parents',async()=>{
 const rs=recipes(3),s=seed(namespaceFor('nonparents')),overlay=createOrderedFailedParentOverlay([s],rs,scope);
 for(let i=0;i<3;i++){const parent=overlay.resolve(i);assert.deepEqual(parent.evidence,s.evidence);const q=plain(i,parent,rs[i],i===0?{}:i===1?{level:a,levelSha256:levelSha256(a),status:'PRIVATE_UNCLAIMED_FULL'}:{accepted:true,status:'PRIVATE_ACCEPTED_CONTROL_FIXTURE',level:a,levelSha256:levelSha256(a),attempt:{id:'c'.repeat(64)}}),cd=await save('nonparents/candidate-'+i+'.json',q);assert.equal((await overlay.commit(i,q,cd,null,fs.readFile)).advanced,false);}
 assert.equal(overlay.report().committedInputs,3);assert(overlay.report().events.every(e=>!e.advanced));await save('nonparents/report.json',overlay.report());checks.push({name:'nonparents-never-advance',passed:true});
});

test('two durable mathematical failures advance same-source parents in exact recipe order',async()=>{
 const rs=recipes(3),overlay=createOrderedFailedParentOverlay([seed(namespaceFor('chain'))],rs,scope),first=await publication('chain',0,overlay.resolve(0),rs[0],a),readOrder=[];
 assert.throws(()=>overlay.resolve(1),/fixed recipe order/);await overlay.commit(0,first.q,first.receipt,first.evidence,async p=>{readOrder.push(p);return fs.readFile(p);});
 assert.equal(overlay.resolve(1).request.id,first.q.attempt.id);assert.deepEqual(overlay.resolve(1).receipt.level,a);assert.deepEqual(overlay.resolve(1).evidence.receipt,first.receipt);
 const second=await publication('chain',1,overlay.resolve(1),rs[1],b);assert.notEqual(first.q.attempt.id,second.q.attempt.id);await overlay.commit(1,second.q,second.receipt,second.evidence,fs.readFile);assert.equal(overlay.resolve(2).request.id,second.q.attempt.id);
 assert(first.evidence.blocked.every(d=>readOrder.includes(d.path)));assert(readOrder.includes(first.receipt.path));assert(readOrder.includes(first.evidence.sidecar.path));
 await save('chain/report.json',{...overlay.report(),completeCandidateReadBeforeAdvancement:true,originalParentAndBothBlockedBound:true,newLedgerClaims:0,syntheticMetadataOnly:true});checks.push({name:'durable-ordered-failure-chain',passed:true});
});

test('missing publication, forged namespace, result, sidecar and parent descriptors are terminal',async()=>{
 const scenarios=[{name:'missing-candidate',omit:'candidate'},{name:'missing-second-block',omit:'blockIdentity'},{name:'wrong-result',mutate:v=>{v.result.accepted=true;}},{name:'wrong-sidecar',mutate:v=>{v.sidecar={...v.sidecar,status:'OTHER'};}},{name:'wrong-block',mutate:v=>{v.blockAttempt.attemptId='f'.repeat(64);}},{name:'wrong-identity',mutate:v=>{v.identity.origin='f'.repeat(64);}}],rows=[];
 for(const scenario of scenarios){const rs=recipes(2),overlay=createOrderedFailedParentOverlay([seed(namespaceFor(scenario.name))],rs,scope),p=await publication(scenario.name,0,overlay.resolve(0),rs[0],a,scenario);await assert.rejects(()=>overlay.commit(0,p.q,p.receipt,p.evidence,fs.readFile));assert.equal(overlay.report().committedInputs,0);assert.equal(overlay.report().halted,true);assert.throws(()=>overlay.resolve(1),/terminal/);await assert.rejects(()=>overlay.commit(0,p.q,p.receipt,p.evidence,fs.readFile));rows.push({name:scenario.name,rejected:true,parentNotAdvanced:true,continuationRejected:true});}
 const rs=recipes(2),overlay=createOrderedFailedParentOverlay([seed(namespaceFor('forged-parent'))],rs,scope),q=plain(0,overlay.resolve(0),rs[0]);q.resolvedFailedParent={...q.resolvedFailedParent,startedAt:'2026-10-09T00:00:09.000Z'};const cd=await save('forged-parent/candidate.json',q);await assert.rejects(()=>overlay.commit(0,q,cd,null,fs.readFile));assert.equal(overlay.report().committedInputs,0);
 await save('publication-failures.json',{rows,forgedExactParentRejected:true});checks.push({name:'partial-publication-seals-overlay',passed:true});
});

test('interrupted batch records actual consumed prefix and never passes normal closure',async()=>{
 const rs=recipes(64),partial=describeBatchDisposition(rs,2,[0],'candidate write failed');assert.equal(partial.consumedInputs,2);assert.equal(partial.unexecutedRecipes.length,62);assert.deepEqual(partial.missingReceiptRecipeIndices,[1]);assert.equal(partial.restartAllowed,false);assert.throws(()=>assertCompleteBatchDisposition(partial),/Interrupted/);
 const beforeAny=describeBatchDisposition(rs,0,[],'initial publication failed');assert.equal(beforeAny.unexecutedRecipes.length,64);assert.equal(beforeAny.consumedInputs,0);
 const complete=describeBatchDisposition(rs,64,Array.from({length:64},(_,i)=>i),null);assertCompleteBatchDisposition(complete);
 await save('partial-and-complete-closure.json',{partial,beforeAny,complete});checks.push({name:'honest-interrupted-prefix',passed:true});
});

test('all mathematical and physical acceptance functions remain exact source bytes',async()=>{
 const oldSource=(await bytes(T+'axis-ice-active-region-batch-task-v1_1.mjs')).toString(),newSource=(await bytes(SELF)).toString();
 const between=(s,start,end)=>{const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert(a>=0&&b>a);return s.slice(a,b);};
 for(const[start,end]of [['export function deriveAdaptiveExactCertificate','export function assertWholeBoardRecipe'],['export function assertWholeBoardRecipe','export function createWholeBoardHistoryIndex'],['export function createWholeBoardHistoryIndex','async function bindTools'],['export function assertWholeBoardAccounting','async function preflight']])assert.equal(between(newSource,start,end),between(oldSource,start,end));
 await save('mathematics-unchanged.json',{originalPrivate,originalFactory,originalJointTestsRerun:false,originalPhysicsAndMathSourceSlicesEqual:true,metadataOnlyChanges:true});checks.push({name:'unchanged-original-mathematics',passed:true});
});

test.after(async()=>{const compiled=await build({entryPoints:[SELF,TEST],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-v2-metadata',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={...old.toolBindings};for(const p of Object.keys(compiled.metafile.inputs))toolBindings[p]=hash(await bytes(p));await save('report.json',{status:checks.length===6?'ACTIVE_REGION_FIXED64_METADATA_PRIVATE_PASS':'ACTIVE_REGION_FIXED64_METADATA_PRIVATE_INCOMPLETE',checks,errors:checks.length===6?[]:['Incomplete checks'],originalPrivate,originalFactory,task:{path:SELF,sha256:toolBindings[SELF]},toolBindings,fileBindings:{...bindings},newRealDomains:0,newConstructions:0,newModelCalls:0,newReplayCalls:0,newSearches:0,newLedgerClaims:0,metadataOnlySavedTinyWorldCopies:true,syntheticPublicationNamespaceOnly:true,productionBatchExecuted:false,oldMathematicsTestsRerun:false});});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {build} from 'esbuild';
import {SELF,PREDECESSOR,INITIAL_PRIOR_HISTORY_REPORT,historyExportMode,assertActiveRegionCoreSequence,buildActiveRegionOwnerDelta} from './export-axis-ice-active-region-history-v2.mjs';
import {assertWholeBoardOwner} from './axis-ice-active-region-batch-task-v1_1.mjs';
import {createActiveCoreIndex} from './active-region-core-diversity-v2.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

// In-memory owner/delta transport fixtures around already-saved tiny worlds.
// No real owner is exported; no consume/merge, runtime, model, replay or claim.
const out=process.env.ACTIVE_REGION_EXPORT_TEST_OUT;assert(out);assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');await fs.mkdir(out,{recursive:false});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),bindings={},checks=[];
const V='deliverables/daily-formal-v4-20261008/',P=V+'proof/',T='tools/daily-challenge/formal-v4/';
const bound=async d=>{const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,d.path);bindings[d.path]=d.sha256;return JSON.parse(b);};
const saved=async p=>{const b=await fs.readFile(p);bindings[p]=sha(b);return JSON.parse(b);};
const write=async(name,q)=>{const p=out+'/'+name,b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});bindings[p]=sha(b);};
const factoryReport=await bound({path:P+'active-region-axis-ice-factory-private-02/report.json',sha256:'db77d7ca6d1981ff6f2663dbcb8870fe84c34402c38e846a12fa77f100d3ff84'});
const fp=P+'active-region-axis-ice-factory-private-02/first-full.json',pair=Object.entries(factoryReport.fileBindings).find(([p])=>p.replaceAll('\\','/')===fp);assert(pair);const first=await bound({path:pair[0],sha256:pair[1]});
const taskReport=await bound({path:P+'active-region-axis-ice-task-private-02/report.json',sha256:'a76492933d1184957fe904fc5e81358d51b0e3ffb687fdac9f86662d8cd7f392'});
const pp=P+'active-region-axis-ice-task-private-02/tiny-positive-before-assert.json',ppair=Object.entries(taskReport.fileBindings).find(([p])=>p.replaceAll('\\','/')===pp);assert(ppair);const positive=await bound({path:ppair[0],sha256:ppair[1]});
const canonical=p=>p.replaceAll('\\','/').toLowerCase();

test('all transport branches and impossible counts',async()=>{
 const base={consumedInputs:3,formedFullWorlds:0,publicClaimsStarted:0,accepted:0};
 const rows=[historyExportMode(base),historyExportMode({...base,formedFullWorlds:2}),historyExportMode({...base,formedFullWorlds:2,publicClaimsStarted:1}),historyExportMode({...base,formedFullWorlds:2,publicClaimsStarted:2,accepted:1})];
 assert.deepEqual(rows.map(r=>r.includeMathDelta),[false,false,true,true]);assert.equal(rows[0].mode,'constructor-only-no-full-world');assert.equal(rows[1].mode,'constructor-only-formed-unclaimed');
 for(const change of[{accepted:1},{publicClaimsStarted:1},{formedFullWorlds:4},{consumedInputs:-1},{publicClaimsStarted:1.5}])assert.throws(()=>historyExportMode({...base,...change}));
 await write('branch-metadata.json',{rows,acceptedTransportDoesNotAdoptSelection:true,newWorlds:0});checks.push({name:'no-full-unclaimed-failed-and-accepted-transport',passed:true});
});

test('original construction fields and mixed mathematical owner bytes are all retained',async()=>{
 const memory=new Map(),put=(p,q)=>{const b=Buffer.from(JSON.stringify(q));memory.set(canonical(p),b);return{path:p,sha256:sha(b)};},read=async d=>{const b=memory.get(canonical(d.path));assert(b,'Missing '+d.path);assert.equal(sha(b),d.sha256);return b;},json=async d=>JSON.parse(await read(d)),absent=async p=>assert(!memory.has(canonical(p)),'Unexpected '+p),rootFor=p=>canonical(p).startsWith('private-public/')?'public':null;
 const plan={path:'private-plan.json',sha256:'d'.repeat(64)},region=first.recipe.activeRegion,construction={...first.q},d=put('private-construction.json',construction),ctor={files:[d],attemptIds:[],closedCampaigns:[{raw:{formedWorldFiles:[d]}}]},ctq={level:first.q.level,levelSha256:first.q.levelSha256,sourceLevelId:first.q.level.id};
 const common={read,json,absent,rootFor,canonical,cli:{plan},pub:'private-public',api:{futureReservations:()=>[]},PLAN_HISTORY_VERSION:'synthetic-transport-only',levelSha256,sealedWorldIdentity};
 const cd=await buildActiveRegionOwnerDelta({...common,owner:ctor,declaredOwner:{id:'synthetic-construction'},parentHeadSha256:'1'.repeat(64),qs:[ctq],p:{recipes:[]}});assert.equal(cd.fullWorlds.length,1);assert.deepEqual(cd.fullWorlds[0].level,first.q.level);assert.deepEqual(cd.closedCampaigns[0].raw.formedWorldFiles,[d]);assert.deepEqual((await json(d)).constructionAccounting.domainDesignChoices.activeRegion,region);assert(cd.fullWorlds[0].level.blocks.some(b=>b.frozen&&b.movementAxis));
 const original=positive.fixture.level,j=positive.j,qs=[],files=[],p={recipes:[],admissionPolicy:{syntheticTransportOnly:true}};
 for(const[i,accepted]of [false,true].entries()){
  const id=String(i+2).repeat(64),identity=String(i+4).repeat(64),q={level:original,levelSha256:levelSha256(original),sourceLevelId:original.id,recipeIndex:i,accepted,status:accepted?'SYNTHETIC_ACCEPTED_TRANSPORT':'SYNTHETIC_FAILED_TRANSPORT',attempt:{id,identityOrigin:id,retryIdentitySha256:identity,levelSha256:levelSha256(original)},lowerBound:{result:j.proof},route:j.route},recipe={syntheticTransportOnly:true};qs.push(q);p.recipes.push({recipe});
  files.push(put('private-public/'+id+'.request.json',q.attempt),put('private-public/'+id+'.result.json',{accepted,status:q.status,levelSha256:q.levelSha256,lower:j.proof,upper:j.route.search}),put('private-public/'+id+'.v4-wholeboard-plan.json',{attempt:q.attempt,plan,recipe,levelSha256:q.levelSha256,futureReservationsDeclared:[],admissionPolicy:p.admissionPolicy,jointBudget:undefined,referenceLowerNotTransferred:true}),put('private-public/'+id+'.v4-wholeboard-result.json',q),put('private-public/identities/'+identity+'.json',{origin:id}));
  if(!accepted)for(const f of['private-public/'+id+'.blocked.json','private-public/identities/'+identity+'.blocked.json'])files.push(put(f,{attemptId:id,status:q.status}));files.push(put('private-candidate-'+i+'.json',q));
 }
 // JSON serialization drops undefined; real task has a concrete joint budget.
 common.api.JOINT_BUDGET={syntheticTransportOnly:true};for(const q of qs){const f='private-public/'+q.attempt.id+'.v4-wholeboard-plan.json',old=JSON.parse(memory.get(canonical(f)));old.jointBudget=common.api.JOINT_BUDGET;const replacement=put(f,old);files[files.findIndex(d=>canonical(d.path)===canonical(f))]=replacement;}
 const owner={files,attemptIds:qs.map(q=>q.attempt.id),closedCampaigns:[]},md=await buildActiveRegionOwnerDelta({...common,owner,declaredOwner:{id:'synthetic-math'},parentHeadSha256:'6'.repeat(64),qs,p});assert.equal(md.terminalRecords.length,2);assert.deepEqual(md.terminalRecords.map(r=>r.blocked.length),[2,0]);assert.equal(md.fullWorlds.length,4);assert.equal(md.files.length,files.length);for(const w of md.fullWorlds)assert.deepEqual(w.level,original);
 const missing={...owner,files:files.filter(d=>!d.path.endsWith(qs[0].attempt.id+'.request.json'))};await assert.rejects(()=>buildActiveRegionOwnerDelta({...common,owner:missing,declaredOwner:{},parentHeadSha256:'6'.repeat(64),qs,p}),/Owner omitted/);
 const extra=put('private-unowned-world.json',{level:{...original,name:'Forged different full world'}});await assert.rejects(()=>buildActiveRegionOwnerDelta({...common,owner:{...owner,files:[...files,extra]},declaredOwner:{},parentHeadSha256:'6'.repeat(64),qs,p}),/Unaccounted/);
 await write('owner-transport.json',{constructorWorlds:cd.fullWorlds.length,mathWorlds:md.fullWorlds.length,blockedCounts:md.terminalRecords.map(r=>r.blocked.length),bodyIceAndAxisRetained:true,coreConstructionMetadataRetained:true,missingOriginalOwnedRequestRejected:true,extraWorldRejected:true,syntheticAcceptedTransportOnly:true,realAcceptedD2D3Claimed:false,newClaims:0});checks.push({name:'original-body-ice-core-and-mixed-owner-transport',passed:true});
});

test('core transport includes failed fulls and requires saved passing check before claim',async()=>{
 const level=first.q.level,region=first.recipe.activeRegion,hash=levelSha256(level),evidence={path:'private-original-full.json',sha256:'a'.repeat(64)},seed=createActiveCoreIndex(),passed=seed.check(level,region),q={level,levelSha256:hash,sourceLevelId:level.id,constructionEvidence:evidence,coreFreshness:passed,accepted:false,attempt:null},failed={...q,constructionEvidence:{...evidence,path:'private-refused-full.json'},coreFreshness:undefined},recipes=[{recipe:{activeRegion:region}},{recipe:{activeRegion:region}}];
 const result=assertActiveRegionCoreSequence(createActiveCoreIndex(),[q,failed],recipes);assert.equal(result.rows.length,2);assert.equal(result.after.coreRecords,2);assert.equal(levelSha256(level),hash);
 assert.throws(()=>assertActiveRegionCoreSequence(createActiveCoreIndex(),[{...q,coreFreshness:null,attempt:{id:'synthetic'}}],[recipes[0]]),/requires passing/);
 assert.throws(()=>assertActiveRegionCoreSequence(createActiveCoreIndex(),[q,{...q,constructionEvidence:failed.constructionEvidence}],recipes),/partition/);
 const no=assertActiveRegionCoreSequence(createActiveCoreIndex(),[{level:null,coreFreshness:null}],recipes.slice(0,1));assert.equal(no.rows.length,0);await write('core-sequence-metadata.json',{rows:result.rows,after:result.after,noFullRows:no.rows.length,missingClaimedCoreRejected:true,repeatedPassingCoreRejected:true,newOriginalWorlds:0});checks.push({name:'core-failure-preservation-and-sequential-claim-gate',passed:true});
});

test('original lexical owner aliases remain exact; prior is the new eight-delta head',async()=>{
 const p={path:'private-plan.json',sha256:'c'.repeat(64)},lex='deliverables/daily-formal-v3-20261008/proof/attempts/private.json',o={version:'plan-history-owner-v1',kind:'mathematical',parentPlan:p,id:'private-export-math',experimentId:'private-export',namespace:'private',attemptIds:[],files:[{path:lex,sha256:'d'.repeat(64)}]},expected={kind:'mathematical',plan:p,experimentId:'private-export',namespace:'private',attemptIds:[],files:[lex]};assertWholeBoardOwner(o,expected);assert.throws(()=>assertWholeBoardOwner(o,{...expected,files:['another-root/private.json']}));
 const prior=await bound(INITIAL_PRIOR_HISTORY_REPORT);assert.equal(prior.headSha256,'9719c12380c9eac72a43d63106b3409ec4457f668696c3abd3a561f67a689f3e');assert.equal(prior.completeHistoryDeltas.length,8);assert.deepEqual(prior.completeHistoryDeltas,[...prior.priorHistoryDeltas,...prior.historyDeltas]);assert.deepEqual(prior.errors,[]);const b=await fs.readFile(PREDECESSOR.path);assert.equal(sha(b),PREDECESSOR.sha256);bindings[PREDECESSOR.path]=sha(b);await write('prior-and-alias-metadata.json',{prior:INITIAL_PRIOR_HISTORY_REPORT,head:prior.headSha256,orderedDeltas:8,priorReportOnlyNotHistoryMerge:true,originalLexicalOwnerAccepted:true,wrongOwnerPathRejected:true});checks.push({name:'lexical-owner-binding-and-current-prior-descriptor',passed:true});
});

test.after(async()=>{const compiled=await build({entryPoints:[SELF,T+'export-axis-ice-active-region-history-v2.test.mjs'],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-private-output',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(compiled.metafile.inputs)){const b=await fs.readFile(p);toolBindings[p]=sha(b);bindings[p]=sha(b);}for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);await write('report.json',{status:checks.length===4?'ACTIVE_REGION_HISTORY_EXPORTER_METADATA_PRIVATE_PASS':'ACTIVE_REGION_HISTORY_EXPORTER_METADATA_PRIVATE_INCOMPLETE',checks,errors:checks.length===4?[]:['Incomplete checks'],toolBindings,fileBindings:{...bindings},priorHistoryReport:INITIAL_PRIOR_HISTORY_REPORT,predecessorExporter:PREDECESSOR,newRealConstructions:0,newRealDomains:0,newModels:0,newReplays:0,newSearches:0,newClaims:0,newRealHistoryMerges:0,realOwnerExports:0,selectionWrites:0,syntheticAcceptedTransportOnly:true,realAcceptedD2D3Claimed:false});});

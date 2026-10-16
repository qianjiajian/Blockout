import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {build} from 'esbuild';
import * as api from './reverse-star-suffix-task-v4.mjs';
import {inspectStarCapturedArchive,assertStarExportSuccessor,QUALIFICATION} from './export-reverse-star-suffix-history-v2.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {quoteReverseWorldCreation} from './reverse-construction-reservations.mjs';

const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/';
const SELF=T+'export-reverse-star-suffix-history-v2.metadata.test.mjs',EXPORT=T+'export-reverse-star-suffix-history-v2.mjs',ACTUAL='.codex-temp/review-star-source200-actual-v4-once.mjs';
const OLD_EXPORT=T+'export-reverse-star-suffix-history-v1.mjs',OLD_ACTUAL='.codex-temp/review-star-source200-actual-v2-once.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');
const OUT=process.argv[2];assert(typeof OUT==='string'&&OUT.startsWith(V+'proof/'));await fs.mkdir(OUT,{recursive:false});
const fileBindings={},checks=[];
async function read(p){const b=await fs.readFile(p);fileBindings[p]=hash(b);return b;}
async function bound(d){const b=await read(d.path);assert.equal(hash(b),d.sha256);return JSON.parse(b);}
async function save(name,value){const p=OUT+'/'+name+'.json',b=Buffer.from(JSON.stringify(value,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});fileBindings[p]=hash(b);return{path:p,sha256:hash(b)};}
async function check(name,fn){checks.push({name,passed:true,evidence:await save(name,await fn())});}

// These are JSON metadata fixtures, not factory or runtime-created worlds.
function fixture({full=false,failed=false,lateRefusal=false}={}){
 const board={id:998994,width:2,height:1,timeSeconds:180,mechanismRules:'revised-2026-09-27-v1.5',gates:[{id:'gate-red',color:'red',side:'left',offset:0,size:1},{id:'gate-blue',color:'blue',side:'right',offset:0,size:1}]};
 const inventory=[{id:'body-red',color:'red',shape:[[0,0]],x:0,y:0,star:false},{id:'body-blue',color:'blue',shape:[[0,0]],x:0,y:0,star:false}];
 const recipe={sourceLevelId:998994,recipeSha256:'a'.repeat(64),board:copy(board),inventory,budget:{maxStates:10000}};
 const levels=[{...copy(board),blocks:[]},{...copy(board),blocks:full?inventory.map((b,i)=>({...copy(b),x:i})):copy(inventory.slice(0,1))}];
 const infos=levels.map((level,ordinal)=>({label:ordinal?'synthetic-captured':'empty-normal-mask',levelSha256:levelSha256(level),full:ordinal?null:false,staticValidation:'PENDING',reservedWorlds:ordinal+1,ordinal,quote:quoteReverseWorldCreation(ordinal?'synthetic-captured':'empty-normal-mask')}));
 const packets=levels.map((level,i)=>api.makeReverseFormedWorldRecord(recipe,null,level,infos[i]));
 const rows=packets.map((packet,i)=>{const bytes=Buffer.from(JSON.stringify(packet));return{descriptor:{path:'synthetic-only-star-export-v2/world-'+i+'.json',sha256:hash(bytes)},bytes};});
 const passed={staticValidation:'PASSED',archiveCaptured:true,validatedFull:false,authorityGranted:true,error:null};
 const last=failed?{staticValidation:'FAILED',archiveCaptured:true,validatedFull:null,authorityGranted:false,error:'synthetic-static-rejection'}:{...passed,validatedFull:full,...lateRefusal?{authorityGranted:false,error:'synthetic-first-full-near-refusal'}:{}};
 const raw={version:'labelled-snapshot-before-mutation-v4',postUseAdmissions:0,refunds:0,rawSetSharedAcrossAllModelsAndReplays:true,active:false,distinctStates:2,events:[{},{}],recordTicketsIssued:3,recordTicketsConsumed:2};
 const accounting={phase:'terminal',completePhysicalInputs:Number(full&&!failed),firstComplete:full&&!failed?{levelSha256:infos[1].levelSha256}:null,completePhysicalInputsFullyClassified:!failed,unvalidatedWorlds:Number(failed),formed:levels.map((level,i)=>({level,info:infos[i],ordinal:i})),totalReserved:{worlds:2},session:{budgetAccountingVersion:'labelled-snapshot-before-mutation-v4',originalMeter:{reservations:[quoteReverseWorldCreation('empty-normal-mask')],reserved:{worlds:2},budget:{maxTransitions:10000000},verificationOperationsMaximum:10000000},rawAccounting:raw,reserved:{worlds:2},formed:infos.map((info,i)=>({label:info.label,levelSha256:info.levelSha256,full:info.full,validation:copy(i?last:passed)}))}};
 const ownerFiles=rows.map(r=>r.descriptor),archive=api.assertReverseFormedWorldArchive(recipe,rows,{accounting,ownerFiles});
 const q={construction:accounting,archiveValidation:{valid:true,completeFormedWorldArchivalVerified:true,allStaticWorldsValid:!failed},nonIdentityWorlds:archive.nonIdentityWorlds,accepted:false,attempt:null,level:null,levelSha256:null,route:null,lowerBound:null};
 return{recipe,rows,ownerFiles,q,done:{archiveValidation:copy(q.archiveValidation)},packets};
}
const inspect=f=>inspectStarCapturedArchive(f);
try{
 const sources={};for(const p of [EXPORT,ACTUAL,OLD_EXPORT,OLD_ACTUAL,SELF])sources[p]=(await read(p)).toString();
 await check('exact-reversible-source-changes-and-original-transport',async()=>{
  const changes=JSON.parse(await read(V+'proof/reverse-star-review-export-v2-source-changes-03/source-changes.json'));
  for(const change of changes.changes){let final=sources[change.target];assert.equal(hash(final),change.targetSha256);for(const e of [...change.replacements].reverse()){assert.equal(final.slice(e.offset,e.offset+e.to.length),e.to);final=final.slice(0,e.offset)+e.from+final.slice(e.offset+e.to.length);}const original=sources[change.original];assert.equal(hash(original),change.originalSha256);assert.equal(final,change.normalization?original.replaceAll('\r\n','\n'):original);}
  const section=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
  assert.equal(section(sources[EXPORT],'// BEGIN PURE STAR LOWER TRANSPORT HELPERS','// END PURE STAR LOWER TRANSPORT HELPERS'),section(sources[OLD_EXPORT],'// BEGIN PURE STAR LOWER TRANSPORT HELPERS','// END PURE STAR LOWER TRANSPORT HELPERS'));
  assert.equal(section(sources[EXPORT],' const makeDelta=',' const summary='),section(sources[OLD_EXPORT],' const makeDelta=',' const summary='));
  assert.equal(section(sources[ACTUAL],' if(q.route){const u=',' const newMembers='),section(sources[OLD_ACTUAL].replaceAll('\r\n','\n'),' if(q.route){const u=',' const newMembers='));
  return{reconstructed:changes.changes.map(x=>x.original),oldLowerAndOwnerTransportByteIdentical:true,actualUpperLowerPublicEvidenceByteIdentical:true,productionEntrypointsExecuted:false};
 });
 await check('pending-packet-valid-classification-and-unused-ticket',()=>{
  const f=fixture(),r=inspect(f);assert.equal(r.archive.totalFormedWorldRecords,2);assert.equal(r.archive.allStaticWorldsValid,true);assert.equal(r.classifiedFullRecords.length,0);assert.equal(JSON.parse(f.rows[1].bytes).creation.full,null);assert.equal(f.q.construction.session.rawAccounting.recordTicketsIssued,3);assert.equal(f.q.construction.session.rawAccounting.recordTicketsConsumed,2);
  const full=fixture({full:true});full.q.level=full.packets[1].level;full.q.levelSha256=full.packets[1].levelSha256;const x=inspect(full);assert.equal(x.classifiedFullRecords.length,1);assert.deepEqual(x.originalPacket,full.packets[1]);
  return{partial:r.archive,classifiedFull:x.classifiedFullRecords,packetStillPending:true,unusedIssuedTicketAllowedButConsumedExact:true};
 });
 await check('static-rejection-is-saved-but-cannot-claim',()=>{
  const f=fixture({failed:true}),r=inspect(f);assert.equal(r.archive.allStaticWorldsValid,false);assert.equal(r.staticFailedRecords.length,1);assert.equal(r.classifiedFullRecords.length,0);
  const refusals=[];for(const[name,mutate]of [
   ['accepted-static-failure',x=>x.q.accepted=true],['claim-static-failure',x=>x.q.attempt={id:'f'.repeat(64)}],
   ['consumed-record-missing',x=>x.q.construction.session.rawAccounting.recordTicketsConsumed++],
   ['session-record-missing',x=>x.q.construction.session.formed.pop()],
   ['not-captured',x=>x.q.construction.session.formed[1].validation.archiveCaptured=false],
   ['not-run',x=>x.q.construction.session.formed[1].validation.staticValidation='NOT_RUN'],
   ['pending',x=>x.q.construction.session.formed[1].validation.staticValidation='PENDING'],
   ['running',x=>x.q.construction.session.formed[1].validation.staticValidation='RUNNING'],
   ['failed-marked-full',x=>x.q.construction.session.formed[1].validation.validatedFull=true],
   ['failed-authority',x=>x.q.construction.session.formed[1].validation.authorityGranted=true],
   ['completion-lies-valid',x=>x.done.archiveValidation.allStaticWorldsValid=true],
   ['unvalidated-count',x=>x.q.construction.unvalidatedWorlds=0]
  ]){const x=fixture({failed:true});mutate(x);assert.throws(()=>inspect(x),name);refusals.push(name);}
  return{preserved:r.archive,refusals,failedGameplayNotPassed:true};
 });
 await check('first-full-classification-survives-later-refusal',()=>{
  const f=fixture({full:true,lateRefusal:true}),r=inspect(f);assert.equal(r.classifiedFullRecords.length,1);assert.equal(r.classifiedFullRecords[0].authorityGranted,false);assert.equal(r.originalPacket,null);assert.equal(f.q.accepted,false);
  for(const mutate of [x=>x.q.construction.firstComplete=null,x=>x.q.construction.firstComplete.levelSha256='f'.repeat(64),x=>x.q.construction.completePhysicalInputs=0]){const x=fixture({full:true,lateRefusal:true});mutate(x);assert.throws(()=>inspect(x));}
  return{classified:r.classifiedFullRecords,originalFullSavedWithoutClaim:true,firstCompleteMismatchRefused:true};
 });
 await check('actual-template-geometry-and-validation-remain-separate',()=>{
  const s=sources[ACTUAL],start=s.indexOf('const inventories=new Map('),end=s.indexOf('\n assert.equal(fullRows.length,fullCount)',start);assert(start>=0&&end>start);
  const run=new Function('assert','isDeepStrictEqual','levelSha256','p','packets','rows','archive',s.slice(start,end)+'\nreturn {fullRows,staticFailedSavedObjects,geometricCompleteSavedObjects,partialRepresentative};');
  const f=fixture({failed:true}),archive=inspect(f).archive;
  // Isolated failed JSON geometry, not passed through the physical constructor.
  // Keep the prior empty row valid; only this captured rejected packet differs.
  for(const packet of f.packets)packet.sourceLevelId=200; // wrapper label only; synthetic level.id stays 998994.
  f.packets[1].level.width=3;f.packets[1].levelSha256=levelSha256(f.packets[1].level);archive.validationResults[1].levelSha256=f.packets[1].levelSha256;
  const r=run(assert,isDeepStrictEqual,levelSha256,{recipe:f.recipe},f.packets,f.rows,archive);assert.equal(r.staticFailedSavedObjects.length,1);assert(r.staticFailedSavedObjects[0].geometryErrors.includes('board-fields'));assert.equal(r.fullRows.length,0);
  return{loopExtractedFromFinalActualTemplate:true,failedCapturedGeometryRecordedWithoutGameplayAcceptance:r.staticFailedSavedObjects,wholeActualEntrypointExecuted:false};
 });
 await check('zero-captured-pre-session-export-metadata-does-not-invent-accounting',()=>{
  const f=fixture();f.rows=[];f.ownerFiles=[];delete f.q.construction;f.q.nonIdentityWorlds=[];Object.assign(f.q,{level:null,levelSha256:null,L:null,U:null,proof:null,route:null,attempt:null,upperConstruction:null,lowerBound:null});Object.assign(f.done,{formedWorlds:0,accepted:0,publicClaimsStarted:0});
  const r=inspect(f);assert.equal(r.archive.totalFormedWorldRecords,0);assert.equal(r.originalPacket,null);assert.equal(f.q.construction,undefined);
  const bad={...f,done:{...f.done,formedWorlds:1}};assert.throws(()=>inspect(bad));assert(sources[ACTUAL].includes('a pre-session closure needs a separately reviewed factual seal'));
  return{noAccountingInvented:true,emptyArchiveMetadataTransportSupported:true,actualTemplatePreSessionOrdinaryPassSupported:false};
 });
 await check('strict-v10-successor-retains-all-prior-deltas',()=>{
  const d=(path,n)=>({path,sha256:String(n).repeat(64)}),row=(i,kind)=>({descriptor:d('delta-'+i,i),declaredOwner:{kind,definition:d('owner-'+i,i)}});
  const c={history:d('checkpoint',1),historyReview:d('review',2),historyScope:{roots:Array.from({length:7},(_,i)=>({id:String(i)}))},selection:d('selection',3),designDisposition:d('holds',4),priorHistoryReport:d('exact-administrative',5),historyHeadSha256:'6'.repeat(64),historyDeltas:[row(6,'construction')]},historyDeltas=[row(7,'construction'),row(8,'mathematical')],headSha256='8'.repeat(64);
  const p={status:'REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V10_VALIDATED',errors:[],oldFilesChanged:false,checkpointReexported:false,mathematicalOwnerSynthesized:false,selectionWritten:false,formalAdoptionPerformed:false,newConstructions:0,newSearches:0,newLedgerClaims:0,newReplayCalls:0,checkpoint:c.history,checkpointReview:c.historyReview,historyScope:c.historyScope,selection:c.selection,designDisposition:c.designDisposition,priorHistoryReport:c.priorHistoryReport,previousHeadSha256:c.historyHeadSha256,priorHistoryDeltas:c.historyDeltas,historyDeltas,completeHistoryDeltas:[...c.historyDeltas,...historyDeltas],headSha256};
  assertStarExportSuccessor(c,p,{historyDeltas,headSha256});const refusals=[];for(const[name,mutate]of [['wrong-status',q=>q.status='ARBITRARY_V10_PASS'],['omitted-prior',q=>q.completeHistoryDeltas.shift()],['reordered-chain',q=>q.completeHistoryDeltas.reverse()],['wrong-head',q=>q.headSha256='9'.repeat(64)],['wrong-parent',q=>q.previousHeadSha256='9'.repeat(64)],['changed-owner',q=>q.historyDeltas[0].declaredOwner.kind='mathematical'],['wrong-prior-report',q=>q.priorHistoryReport.sha256='9'.repeat(64)],['selection-write',q=>q.selectionWritten=true]]){const q=copy(p);mutate(q);assert.throws(()=>assertStarExportSuccessor(c,q,{historyDeltas,headSha256}),name);refusals.push(name);}
  return{syntheticDeclarationsOnly:true,completePriorChainPreserved:true,refusals,taskAdministrativeInputContractUnchanged:true};
 });
 await check('real-task-qualification-and-reused-evidence-bindings',async()=>{
  const q=await bound(QUALIFICATION);assert.equal(q.status,api.QUALIFICATION_STATUS);assert.equal(q.closedProductionScopeReviewed,true);assert.deepEqual(q.errors,[]);
  for(const[p,h]of Object.entries(q.toolBindings)){assert.equal(hash(await read(p)),h);}
  const reused=[{path:V+'proof/reverse-star-suffix-history-export-private-01/report.json',sha256:'9a9b75243e728278de8bcb3be1a3ca33eb1eb01af9e353c28499404d3a3f7405'},{path:V+'proof/reverse-star-archival-order-metadata-private-01/report.json',sha256:'5f296f56cab4a37cbcbb57865b90a1307613325db7b1ffc738292a7e300506a4'}];
  for(const d of reused)await bound(d);return{qualification:QUALIFICATION,reusedSavedEvidence:reused,oldTestsReexecuted:false,newModels:0};
 });
 const result=await build({entryPoints:[EXPORT],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(result.metafile.inputs))toolBindings[p]=hash(await read(p));
 for(const[p,h]of Object.entries(fileBindings))assert.equal(hash(await fs.readFile(p)),h);const report={status:'REVERSE_STAR_REVIEW_EXPORT_V2_METADATA_PASS',checks,errors:[],fileBindings,toolBindings,bindingWorkingDirectory:process.cwd(),qualification:QUALIFICATION,newRealConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,publicClaimsStarted:0,newHistoryLoads:0,newHistoryMerges:0,exportEntrypointExecuted:false,actualReviewEntrypointExecuted:false,productionQualificationIssued:false,limitations:['Synthetic JSON metadata callbacks and final source extraction only; no real candidate, model, runtime, solver, replay or history consumer ran.','The actual template entry was not run against future input.','Old lower transport and mathematical tests were bound and compared, not rerun.','Root or another agent must independently review this authored exporter.']};console.log(JSON.stringify({report:await save('report',report),checks:checks.length}));
}catch(e){await save('failure',{status:'REVERSE_STAR_REVIEW_EXPORT_V2_METADATA_FAIL',error:e.stack,checks,fileBindings,newRealConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newHistoryLoads:0});throw e;}

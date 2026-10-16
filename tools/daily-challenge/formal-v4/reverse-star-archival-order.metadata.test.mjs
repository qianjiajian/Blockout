import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {quoteReverseWorldCreation} from './reverse-construction-reservations.mjs';

const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/';
const SELF=T+'reverse-star-archival-order.metadata.test.mjs',FACTORY=T+'reverse-star-suffix-factory-v5.mjs',TASK=T+'reverse-star-suffix-task-v4.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
const initialValidation=()=>({staticValidation:'NOT_RUN',archiveCaptured:false,validatedFull:null,authorityGranted:false,error:null});

export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V+'proof')+path.sep));await fs.mkdir(out,{recursive:false});
 const fileBindings={},checks=[];
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=hash(b);return b;};
 const save=async(name,value)=>{const p=path.join(out,name+'.json'),b=Buffer.from(JSON.stringify(value,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});fileBindings[p]=hash(b);return{path:p,sha256:hash(b)};};
 const check=async(name,fn)=>checks.push({name,passed:true,evidence:await save(name,await fn())});
 try{
  const factory=await import('./reverse-star-suffix-factory-v5.mjs'),task=await import('./reverse-star-suffix-task-v4.mjs');
  const execute=factory.captureValidateStarWorld;assert.equal(typeof execute,'function');
  // JSON-only synthetic fixture: no runtime, model, graph, route or ledger.
  const board={id:998992,width:2,height:1,timeSeconds:180,mechanismRules:'revised-2026-09-27-v1.5',gates:[{id:'gate-red',color:'red',side:'left',offset:0,size:1}]};
  const empty={...copy(board),blocks:[]},partial={...copy(board),blocks:[{id:'body-red',color:'red',shape:[[0,0]],x:0,y:0,star:false}]};
  const creation=(level,ordinal)=>({label:ordinal?'synthetic-partial':'empty-normal-mask',levelSha256:levelSha256(level),full:ordinal?null:false,staticValidation:'PENDING',reservedWorlds:ordinal+1,ordinal,quote:quoteReverseWorldCreation(ordinal?'synthetic-partial':'empty-normal-mask')});
  await check('capture-before-inspect-and-authority-on-success',()=>{
   const info=creation(partial,1),before=JSON.stringify({partial,info}),validation=initialValidation(),events=[];let captured=null;
   execute(partial,info,validation,{capture:(l,c)=>{events.push('capture');captured=JSON.stringify({level:l,creation:c});},inspect:l=>{events.push('inspect');assert(captured);assert.equal(l,partial);return{full:false};},validated:(l,c)=>{events.push('validated');assert.equal(validation.staticValidation,'PASSED');assert.equal(c.full,false);return true;},grant:()=>events.push('grant')});
   assert.deepEqual(events,['capture','inspect','validated','grant']);assert.equal(validation.staticValidation,'PASSED');assert.equal(validation.archiveCaptured,true);assert.equal(validation.validatedFull,false);assert.equal(validation.authorityGranted,true);assert.equal(validation.error,null);assert.equal(JSON.stringify({partial,info}),before);assert.equal(JSON.parse(captured).creation.full,null);
   return{events,validation,originalCreationUnchanged:true,persistedPendingPacketNotRewritten:true,newModels:0};
  });
  await check('domain-runtime-throw-retains-original-before-rejection',()=>{
   const info=creation(partial,1),validation=initialValidation(),events=[],error=Error('synthetic-runtime-duplicate-id');let original=null,validated=0,grant=0;
   assert.throws(()=>execute(partial,info,validation,{capture:(l,c)=>{original=JSON.stringify({level:l,creation:c});events.push('capture');},inspect:()=>{events.push('inspect');assert(original);throw error;},validated:()=>{validated++;return true;},grant:()=>grant++}),e=>e===error);
   assert.deepEqual(events,['capture','inspect']);assert.equal(validation.staticValidation,'FAILED');assert.equal(validation.archiveCaptured,true);assert.equal(validation.validatedFull,null);assert.equal(validation.authorityGranted,false);assert.equal(validation.error,error.message);assert.equal(validated,0);assert.equal(grant,0);assert.deepEqual(JSON.parse(original).level,partial);
   return{events,validation,originalObjectPreserved:true,validatedCalls:validated,grantCalls:grant,newModels:0,newClaims:0};
  });
  await check('native-geometry-and-post-full-refusal-never-grant',()=>{
   const results=[];for(const message of ['synthetic-native-asset-missing','synthetic-overlap-outside-mask']){
    const info=creation(partial,1),validation=initialValidation(),events=[];let original=null;
    assert.throws(()=>execute(partial,info,validation,{capture:(l,c)=>{events.push('capture');original=JSON.stringify({level:l,creation:c});},inspect:()=>{events.push('inspect');throw Error(message);},validated:()=>{throw Error('unexpected-validation-callback');},grant:()=>{throw Error('unexpected-grant');}}),new RegExp(message));
    assert.deepEqual(events,['capture','inspect']);assert.equal(validation.staticValidation,'FAILED');assert.equal(validation.archiveCaptured,true);assert.equal(validation.authorityGranted,false);assert.equal(validation.validatedFull,null);assert(original);results.push({message,events,validation});
   }
   const validation=initialValidation(),events=[],info=creation(partial,1);let original=null;
   // Boolean full is a synthetic inspect result, not a constructed full board.
   assert.throws(()=>execute(partial,info,validation,{capture:(l,c)=>{events.push('capture');original=JSON.stringify({level:l,creation:c});},inspect:()=>{events.push('inspect');return{full:true};},validated:()=>{events.push('validated');throw Error('synthetic-first-full-near-refusal');},grant:()=>{throw Error('unexpected-grant');}}),/synthetic-first-full-near-refusal/);
   assert.deepEqual(events,['capture','inspect','validated']);assert.equal(validation.staticValidation,'PASSED');assert.equal(validation.validatedFull,true);assert.equal(validation.authorityGranted,false);assert.equal(JSON.parse(original).creation.full,null);assert.equal(info.full,null);
   return{results,postValidationFullRefusal:{events,validation,persistedPacketUnchanged:true},newFullBoards:0,newModels:0,newClaims:0};
  });
  await check('capture-io-failure-stops-before-inspect',()=>{
   const validation=initialValidation(),events=[],error=Error('synthetic-write-refusal');let held=null;
   assert.throws(()=>execute(partial,creation(partial,1),validation,{capture:l=>{events.push('capture');held=l;throw error;},inspect:()=>{events.push('inspect');return{full:false};},validated:()=>{events.push('validated');return true;},grant:()=>events.push('grant')}),e=>e===error);
   assert.deepEqual(events,['capture']);assert.equal(held,partial);assert.equal(validation.archiveCaptured,false);assert.equal(validation.staticValidation,'NOT_RUN');assert.equal(validation.authorityGranted,false);assert.equal(validation.validatedFull,null);assert.equal(validation.error,error.message);
   return{events,validation,inMemoryOriginalReferenceRetained:true,completeArchiveClaimed:false,modelsAndClaims:0};
  });
  await check('archive-ticket-parity-and-static-validity-separated',()=>{
   const recipe={sourceLevelId:998992,recipeSha256:'a'.repeat(64),board:copy(board),budget:{maxStates:10000}},reference=null;
   const levels=[empty,partial],infos=levels.map(creation),records=levels.map((level,i)=>task.makeReverseFormedWorldRecord(recipe,reference,level,infos[i]));
   const rows=records.map((packet,i)=>{const bytes=Buffer.from(JSON.stringify(packet));return{descriptor:{path:'metadata-only/world-'+i+'.json',sha256:hash(bytes)},bytes};}),owners=rows.map(r=>r.descriptor);
   const passed={staticValidation:'PASSED',archiveCaptured:true,validatedFull:false,authorityGranted:true,error:null},failed={staticValidation:'FAILED',archiveCaptured:true,validatedFull:null,authorityGranted:false,error:'synthetic-static-rejection'};
   const raw={version:'labelled-snapshot-before-mutation-v4',postUseAdmissions:0,refunds:0,rawSetSharedAcrossAllModelsAndReplays:true,active:false,distinctStates:2,events:[{},{}],recordTicketsIssued:2,recordTicketsConsumed:2};
   const accounting={phase:'terminal',firstComplete:null,formed:levels.map((level,i)=>({level,info:infos[i],ordinal:i})),totalReserved:{worlds:2},session:{budgetAccountingVersion:'labelled-snapshot-before-mutation-v4',originalMeter:{reservations:[quoteReverseWorldCreation('empty-normal-mask')],reserved:{worlds:2},budget:{maxTransitions:10000000},verificationOperationsMaximum:10000000},rawAccounting:raw,reserved:{worlds:2},formed:infos.map((info,i)=>({label:info.label,levelSha256:info.levelSha256,full:info.full,validation:copy(i?failed:passed)}))}};
   const review=(a=accounting,r=rows)=>task.assertReverseFormedWorldArchive(recipe,r,{accounting:a,ownerFiles:owners});
   const savedFailure=review();assert.equal(savedFailure.allStaticWorldsValid,false);assert.equal(savedFailure.totalFormedWorldRecords,2);assert.equal(savedFailure.physicalWorldRecords,1);
   const success=copy(accounting);success.session.formed[1].validation=copy(passed);assert.equal(review(success).allStaticWorldsValid,true);
   const refusals=[];
   for(const[name,mutate]of [['extra-consumed-ticket',a=>a.session.rawAccounting.recordTicketsConsumed++],['capture-not-saved',a=>a.session.formed[1].validation.archiveCaptured=false],['failed-world-authority',a=>a.session.formed[1].validation.authorityGranted=true],['failed-world-marked-full',a=>a.session.formed[1].validation.validatedFull=true],['missing-session-record',a=>a.session.formed.pop()]]){const a=copy(accounting);mutate(a);assert.throws(()=>review(a),name);refusals.push(name);}
   assert.throws(()=>review(accounting,rows.slice(0,1)));refusals.push('missing-original-row');
   const tampered=rows.map(r=>({...r,descriptor:{...r.descriptor},bytes:Buffer.from(r.bytes)}));tampered[1].bytes=Buffer.from('{}');assert.throws(()=>review(accounting,tampered));refusals.push('original-bytes-hash-changed');
   return{fixture:'Two JSON-only synthetic archive rows, no model or physical constructor invoked',savedFailure,validSuccessAccepted:true,refusals,syntheticAccounting:true,realArchiveReinterpreted:false};
  });
  const toolBindings={};for(const entry of [FACTORY,TASK]){const result=await build({entryPoints:[entry],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const p of Object.keys(result.metafile.inputs))toolBindings[p]=hash(await bytes(p));}await bytes(SELF);
  for(const[p,h]of Object.entries(fileBindings))assert.equal(hash(await fs.readFile(p)),h,'Source or saved evidence changed during test');
  const report={status:'STAR_FORMED_OBJECT_ARCHIVAL_ORDER_METADATA_PASS',errors:[],checks,fileBindings,toolBindings,productionQualified:false,newRealConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newPublicClaims:0,newHistoryLoads:0,syntheticMetadataLevelObjects:2,limitations:['Callbacks and archive validator only; no runtime/model/graph/kernel or history consumer invoked.','Synthetic validation outcomes exercise control flow and do not certify gameplay validity.','An injected capture failure is not repaired or retried; incomplete evidence cannot be normal PASS.','Old source200 records and missing sixth object are unchanged.']};return{report:await save('report',report),checks:checks.length};
 }catch(error){await save('failed-report',{status:'STAR_ARCHIVAL_ORDER_METADATA_FAIL',error:error.stack,checks,fileBindings});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));

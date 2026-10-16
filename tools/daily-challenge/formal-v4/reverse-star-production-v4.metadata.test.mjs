import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import * as api from './reverse-star-suffix-task-v4.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/';
const SELF=T+'reverse-star-production-v4.metadata.test.mjs',hash=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V+'proof')+path.sep));await fs.mkdir(out,{recursive:false});
 const fileBindings={},toolBindings={},tests=[];let error=null;
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=hash(b);return b;};
 const read=async(d)=>{const b=await bytes(typeof d==='string'?d:d.path);if(d.sha256)assert.equal(hash(b),d.sha256);return JSON.parse(b);};
 const check=async(name,fn)=>{const result=await fn(),p=path.join(out,name+'.json');await fs.writeFile(p,JSON.stringify(result,null,2)+'\n',{flag:'wx'});tests.push({name,passed:true,evidence:{path:p,sha256:hash(await bytes(p))}});};
 try{
  const changes=await read(V+'proof/reverse-star-production-v4-source-01/source-changes.json'),prior=await read(api.ADMINISTRATIVE_PRIOR);
  const contextFor=p=>({priorHistoryReport:copy(api.ADMINISTRATIVE_PRIOR),history:copy(p.checkpoint),historyReview:copy(p.checkpointReview),historyScope:copy(p.historyScope),historyHeadSha256:p.headSha256,historyDeltas:copy(p.completeHistoryDeltas),selection:copy(p.selection),failedParent:copy(p.failedParentUnchanged)});
  await check('exact-source-reconstruction-and-production-authorities',async()=>{
   const rows=[];for(const x of changes.changes){let s=(await bytes(x.original.path)).toString();assert.equal(hash(s),x.original.sha256);const now=await bytes(x.current.path);assert.equal(hash(now),x.current.sha256);for(const r of x.replacements){assert.equal(s.split(r.from).length-1,r.count);s=s.split(r.from).join(r.to);}assert.deepEqual(Buffer.from(s),now);rows.push({original:x.original,current:x.current,exactBytes:true,replacementGroups:x.replacements.length});}
   const task=(await bytes(api.SELF)).toString(),factory=(await bytes(api.FACTORY)).toString(),cli=(await bytes(T+'reverse-star-suffix-cli-v4.mjs')).toString();
   for(const s of [task,factory,cli])assert(!s.includes('assertReverseStarProductionReady'));
   assert(task.indexOf('assertStarStockIdPreflight(c,declared)')<task.indexOf('await history(r,c,qualificationOnly)'));
   assert(factory.includes('takeReverseConstructionAuthority(authority,runtime,recipe)'));assert(task.includes('new WeakMap(),claims=new WeakMap()'));
   assert(factory.includes("from './plan-history-adapter-v10.mjs'"));assert(task.includes("from './plan-history-adapter-v10.mjs'"));
   assert.equal(api.REVERSE_V4_FACTORY_DESCRIPTOR.sha256,hash(await bytes(api.FACTORY)));
   return{rows,guardRemovalIsNotAnExecution:true,jointIdBeforeHistory:true,originalOneUseAuthorityRequired:true,originalGraphOrderingAndMathematicsUnchanged:true,archivalSequencingDeliberatelyChanged:true};
  });
  await check('exact-qualified-v10-and-unchanged-lower',async()=>{
   const q=await read(api.HISTORY_ADAPTER_QUALIFICATION);assert.equal(api.assertReverseHistoryAdapterQualification(q),true);assert.equal(hash(await bytes(api.HISTORY_ADAPTER)),api.HISTORY_ADAPTER_SHA256);
   const wrong=copy(q);wrong.toolBindings[api.HISTORY_ADAPTER]='0'.repeat(64);assert.throws(()=>api.assertReverseHistoryAdapterQualification(wrong));
   const d=copy(q);d.errors=['bad'];assert.throws(()=>api.assertReverseHistoryAdapterQualification(d));
   assert.equal(hash(await bytes(T+'reverse-star-suffix-lower-v2.mjs')),'6526e5276ad52cc66a0f32c571fe8f3c3dd782b389766d0f9fbb3f7c1ebb6a42');
   assert.equal(hash(await bytes(T+'reverse-star-suffix-blueprint-v2.mjs')),'5abf53925901b89b90443d6714465db75521c69f0926522ba517e92874524634');
   return{adapter:changes.adapter,qualification:api.HISTORY_ADAPTER_QUALIFICATION,wrongHashRejected:true,qualificationErrorsRejected:true,lowerAndBlueprintUnchanged:true,authenticationExecuted:false};
  });
  await check('exact-administrative-prior-preserves-original-failure',()=>{
   const c=contextFor(prior);assert.equal(api.assertReversePriorHistory(c,prior),true);const rejected=[];
   const no=(name,mutate)=>{const x=copy(prior),y=copy(c);mutate(x,y);assert.throws(()=>api.assertReversePriorHistory(y,x));rejected.push(name);};
   no('wrong-report-sha',(p,c)=>c.priorHistoryReport.sha256='0'.repeat(64));no('wrong-report-path',(p,c)=>c.priorHistoryReport.path+='-alias');no('normal-actual-forgery',p=>p.normalActualReviewPassed=true);no('normal-export-forgery',p=>p.normalExportAllowed=true);no('archive-failure-erased',p=>p.archivalIntegrity='PASS');no('missing-sixth-reclassified',p=>p.archivalFacts.unarchivedRecordCount=0);no('sixth-level-recovery',p=>p.recoveredLevelSpecsCreated=1);no('partial-authorized-by-seal',p=>p.partialHistoryAuthenticationGranted=true);no('wrong-head',p=>p.headSha256='0'.repeat(64));no('missing-original-delta',p=>p.completeHistoryDeltas.shift());no('extra-public-claim',p=>p.summary.publicStocks++);no('fake-math-terminal',p=>p.summary.terminalRecords++);no('two-closed-recipes',p=>p.summary.closedCampaigns++);no('wrong-observation',p=>p.administrativeObservation.sha256='0'.repeat(64));no('lost-old-owner',p=>p.originalOwnerDefinitionsPreserved=false);no('wrong-failed-parent',(p,c)=>c.failedParent.attemptId='f'.repeat(64));
   return{originalReport:api.ADMINISTRATIVE_PRIOR,statusPreserved:prior.status,archivalIntegrity:'FAILED',normalActualReviewPassed:false,normalExportAllowed:false,chainLength:c.historyDeltas.length,rejected,historyNotLoaded:true};
  });
  await check('original-normal-history-contract-unmodified',async()=>{
   const p=await read(prior.priorHistoryReport),c=contextFor(p);c.priorHistoryReport=prior.priorHistoryReport;
   assert.equal(api.assertReversePriorHistory(c,p),true);assert.equal(api.assertReverseNormalPriorHistory(c,p),true);
   const x=copy(p);x.status='STAR_SOURCE200_ARCHIVAL_FAILURE_SEALED_AND_V9_VALIDATED';assert.throws(()=>api.assertReversePriorHistory(c,x));
   const bad=copy(p);bad.errors=['bad'];assert.throws(()=>api.assertReversePriorHistory(c,bad));
   const v10=copy(p);v10.status='X_HISTORY_DELTAS_EXPORTED_AND_V10_VALIDATED';assert.throws(()=>api.assertReversePriorHistory(c,v10));
   return{normalPrior:prior.priorHistoryReport,normalStatus:p.status,originalV6789PatternUnchanged:true,administrativeStatusCannotEnterNormalBranch:true,arbitraryNewStatusesRejected:true};
  });
  await check('three-archive-summary-requires-four-only-star-records',async()=>{
   const reviews=[{path:V+'proof/plain-reverse-source5-suffix-prefix-pilot-actual-independent-01/report.json',sha256:'f2d2496b0971878aef2248f6d5b6d69809e4c6ef36c63de21727f24937369c24'},{path:V+'proof/plain-reverse-source5-suffix-prefix-pilot-actual-independent-02/report.json',sha256:'a132d450e7be0da964f69c3cf85be500d8f6d3df50e0cf99d96e54416adacb0a'}];
   const archives=[];for(const review of reviews){const r=await read(review);archives.push({review,authenticatedPartialRecords:r.archive.physicalWorldRecords,completePhysicalInputs:0});}
   archives.push({observation:copy(api.STAR_ARCHIVAL_OBSERVATION),authenticatedPartialRecords:4,completePhysicalInputs:0,originalArchivalFailurePreserved:true,completeFormedWorldArchivalVerified:false,unarchivedRecordAuthorized:false,normalActualReviewPassed:false});
   const summary={authenticatedPartialRecords:10166,archives,onlySameReferenceShapeColourClauseSkipped:true,nearPoolsChanged:false,historyChanged:false,newConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0};assert.equal(api.assertReversePartialAuthentication(summary),true);
   const rejected=[];const no=(name,fn)=>{const s=copy(summary);fn(s);assert.throws(()=>api.assertReversePartialAuthentication(s));rejected.push(name);};
   no('old-two-archive-total',s=>s.authenticatedPartialRecords=10162);no('missing-third',s=>s.archives.pop());no('sixth-record-granted',s=>s.archives[2].unarchivedRecordAuthorized=true);no('five-star-records',s=>s.archives[2].authenticatedPartialRecords=5);no('true-full-exemption',s=>s.archives[2].completePhysicalInputs=1);no('failure-erased',s=>s.archives[2].originalArchivalFailurePreserved=false);no('new-third-reference',s=>s.archives[2].observation.sha256='0'.repeat(64));no('near-pool-removed',s=>s.nearPoolsChanged=true);no('unknown-first-anchor',s=>s.archives[0].review.sha256='1'.repeat(64));
   return{fixtureOnly:true,actualAuthenticationExecuted:false,summaryContract:summary,rejected};
  });
  await check('explicit-design02-and-ID-preflight-still-bound',async()=>{
   const d=await read({path:V+'design/star-source200-stock-declaration-02/source-200.json',sha256:'8047050e694feaf099545da18c2bee55db99a46b1b99a4c8f9395e46e4323b53'}),design=await read(api.STAR_DESIGN_DECLARATION),stock=d.recipes[0];
   const c={sourceLevelId:200,targetDifficulty:1,stockId:stock.recipeId,starDesignDeclaration:copy(api.STAR_DESIGN_DECLARATION),declaration:{path:'metadata-only-stock',sha256:'a'.repeat(64)},priorHistoryReport:copy(api.ADMINISTRATIVE_PRIOR),selection:copy(prior.selection),designDisposition:copy(prior.designDisposition)};
   assert.equal(api.assertReverseProductionChoice(c),true);assert.equal(api.assertStarStockIdPreflight(c,d),stock);assert.equal(api.assertBoundStarDeclaredStock(c,d,stock,design),true);
   const bad=copy(c);bad.starDesignDeclaration.sha256='0'.repeat(64);assert.throws(()=>api.assertReverseProductionChoice(bad));const collision=copy(d);collision.recipes[0].gates[0].id=collision.recipes[0].inventory[0].id;assert.throws(()=>api.assertStarStockIdPreflight(c,collision));
   return{design:api.STAR_DESIGN_DECLARATION,originalBodyCount:17,totalUnpositionedArea:48,gates:10,wrongDesignRejected:true,jointIdCollisionRejectedBeforeHistory:true,newPositionsCreated:false};
  });
  const compiled=await build({entryPoints:[api.SELF,T+'reverse-star-suffix-cli-v4.mjs',SELF],outdir:'.metadata-memory-only',bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
  for(const p of Object.keys(compiled.metafile.inputs)){await bytes(p);toolBindings[p]=fileBindings[p];}
  for(const [p,h]of Object.entries(fileBindings))assert.equal(hash(await fs.readFile(p)),h,p);
 }catch(e){error=e;}
 const report={status:error?'REVERSE_STAR_PRODUCTION_V4_METADATA_FAIL':'REVERSE_STAR_PRODUCTION_V4_METADATA_PASS',tests,errors:error?[error.stack]:[],fileBindings,toolBindings,bindingWorkingDirectory:process.cwd(),newRealConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newRawAdmissions:0,newLedgerClaims:0,publicClaimsStarted:0,historyLoads:0,actualPartialAuthenticationExecuted:false,productionEntryInvocations:0,oldFilesChanged:false,archivalOrderTestsSeparate:true,limitations:['This report checks source and metadata contracts only, not packing, route validity or mathematical bounds.','No real context, history consume/authenticate, stock construction or mathematical claim was executed.','Archive sequencing failure injection is recorded by the separate archival-order metadata suite.']};
 const p=path.join(out,'report.json');await fs.writeFile(p,JSON.stringify(report,null,2)+'\n',{flag:'wx'});if(error)throw error;return{path:p,sha256:hash(await fs.readFile(p)),tests:tests.length,fileBindings:Object.keys(fileBindings).length,toolBindings:Object.keys(toolBindings).length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));

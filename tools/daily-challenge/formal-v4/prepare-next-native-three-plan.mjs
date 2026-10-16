import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {LATE_REGION_VERSION} from './late-region-gate-aware-factory.mjs';
import {assertLowBandAdvancedAppend,LOW_BAND_TWO_PROPOSAL} from './low-band-advanced-context.mjs';
import {assertNextNativeRecipePlan,NEXT_NATIVE_PLAN_VERSION} from './next-native-plan-contract.mjs';

// Importing this module does nothing. prepare() returns metadata without
// writing it. The CLI prepare mode is reserved for explicit future dispatch
// after both advanced outcomes and the native basic draft have been merged.
const own='tools/daily-challenge/formal-v4/prepare-next-native-three-plan.mjs';
const driver='tools/daily-challenge/formal-v4/construct-next-native-recipes.mjs';
const runner='tools/daily-challenge/formal-v4/run-next-native-prefix-plan.mjs';
const V4='deliverables/daily-formal-v4-20261008',V3='deliverables/daily-formal-v3-20261008';
const ledger=`${V3}/proof/attempts`,lateLedger=`${V4}/design/late-prefix-construction-ledger`;
export const NEXT_NATIVE_PROPOSAL=Object.freeze({path:`${V4}/design/next-native-readonly-proposal-01/proposal.json`,sha256:'1351db3c5846b05786faa380be0a828658f881805032a27818aac71cb70efb2a'});
export const NEXT_NATIVE_PROPOSAL_REVIEW=Object.freeze({path:`${V4}/proof/next-native-proposal-independent-01/report.json`,sha256:'6e75d0e444cd1ad4db212679ca26ad1955a52da80dc791c632878a36b8c1a112'});
const sha=b=>createHash('sha256').update(b).digest('hex');
const validDescriptor=d=>assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Caller must provide exact path and SHA');
const exists=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const walk=async dir=>{const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);
 if(e.isDirectory()&&!e.isSymbolicLink())out.push(...await walk(p));else if(e.isFile()&&e.name.endsWith('.json'))out.push(p);}return out;};

export function assertNextNativePreparationContext(context){
 assert(context&&Object.keys(context).every(k=>['selection','advancedOutcomes','advancedCompletion'].includes(k)),'Only exact final context descriptors');
 validDescriptor(context.selection);validDescriptor(context.advancedCompletion);
 assert(Array.isArray(context.advancedOutcomes)&&context.advancedOutcomes.length===2);context.advancedOutcomes.forEach(validDescriptor);
 assert.equal(new Set(context.advancedOutcomes.map(d=>path.resolve(d.path))).size,2,'Exactly two distinct outcomes');
}

export function recordNextNativeBinding(bindings,file,digest){
 if(bindings[file])assert.equal(bindings[file],digest,`Previously read input changed: ${file}`);
 bindings[file]=digest;
}

/** Accepted advanced receipts enrich the declared base descriptor with the
 * exact original request/result. Verify the extra evidence rather than
 * requiring the richer receipt to equal a two-field plan descriptor. */
export async function bindNextNativeAdvancedBaseReceipt(q,row){
 const d=q.baseReceipt;validDescriptor(d);assert.equal(d.path,row.base.path);assert.equal(d.sha256,row.base.sha256);
 assert.equal(d.levelSha256,row.baseLevelSha256);assert.equal(d.routeSha256,row.baseRouteSha256);
 validDescriptor(d.request);validDescriptor(d.result);const fileBindings={};
 const read=async x=>{const bytes=await fs.readFile(x.path);assert.equal(sha(bytes),x.sha256,x.path);recordNextNativeBinding(fileBindings,x.path,x.sha256);return JSON.parse(bytes);};
 const base=await read(d),request=await read(d.request),result=await read(d.result);
 assert.equal(base.levelSha256,levelSha256(base.level));assert.equal(base.levelSha256,d.levelSha256);
 assert.equal(base.routeSha256,routeSha256(base.drags));assert.equal(base.routeSha256,d.routeSha256);
 assert.deepEqual(base.attempt,request);assert.equal(request.levelSha256,d.levelSha256);
 assert.equal(path.resolve(d.request.path),path.resolve(`${ledger}/${request.id}.request.json`));
 assert.equal(path.resolve(d.result.path),path.resolve(`${ledger}/${request.id}.result.json`));
 assert.equal(base.accepted,true);assert.equal(result.accepted,true);assert.equal(result.levelSha256,d.levelSha256);
 assert.equal(result.status,base.status);assert.deepEqual(result.lower,base.lowerBound.result);assert.deepEqual(result.upper,base.route.search);
 return{base,request,result,fileBindings};
}

export async function inspectNextNativePreparation(){
 const toolBindings={};for(const p of [own,driver,runner,'tools/daily-challenge/formal-v4/next-native-plan-contract.mjs',
  'tools/daily-challenge/formal-v4/construct-native-prefix-recipes.mjs','tools/daily-challenge/formal-v4/run-native-prefix-plan.mjs',
  'tools/daily-challenge/formal-v4/late-region-gate-aware-factory.mjs','tools/daily-challenge/formal-v4/late-prefix-plan-ledger.mjs',
  'tools/daily-challenge/formal-v4/prefix-tail-native-v4.mjs'])toolBindings[p]=sha(await fs.readFile(p));
 const b=await fs.readFile(NEXT_NATIVE_PROPOSAL.path);assert.equal(sha(b),NEXT_NATIVE_PROPOSAL.sha256);const q=JSON.parse(b);
 assert.equal(q.executable,false);assert.equal(q.recommendedRecipes.length,3);
 return{status:'NEXT_NATIVE_PLAN_BUILDER_STATIC_INSPECTED_NO_PLAN',version:NEXT_NATIVE_PLAN_VERSION,
  proposal:NEXT_NATIVE_PROPOSAL,proposalReview:NEXT_NATIVE_PROPOSAL_REVIEW,recipes:q.recommendedRecipes,
  requiredContext:['selection:{path,sha256}','advancedOutcomes:[{path,sha256},{path,sha256}]','advancedCompletion:{path,sha256}'],
  compatibility:{oldConstructor:false,oldRunner:false,reason:'Both freeze old recipes, selected147 and previousMacro49; neither may consume the new plan.',
   newConstructor:driver,frozenFactory:true,frozenSharedPlanLedger:true,frozenNativePerCandidateApi:true,
   newMathBatchRunner:runner,newMathBatchRunnerImplementedNotExecuted:true,independentFixedPlanReviewStillRequired:true},
  toolBindings,planCreated:false,newConstructions:0,newSearches:0,newLedgerClaims:0,selectionChanged:false,formalReady:false};
}

/** Read-only metadata preparation; no physical stock or claim is made. */
export async function prepareNextNativeThreePlan(context){
 assertNextNativePreparationContext(context);const bindings={};
 const read=async(p,h)=>{const b=await fs.readFile(p),actual=sha(b);if(h)assert.equal(actual,h,p);if(bindings[p])assert.equal(actual,bindings[p]);bindings[p]=actual;return JSON.parse(b);};
 const bound=d=>{validDescriptor(d);return read(d.path,d.sha256);};
 const check=async m=>{for(const[p,h]of Object.entries(m)){assert.equal(sha(await fs.readFile(p)),h,p);if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;}};
 const descriptor=p=>({path:p,sha256:bindings[p]});
 const proposal=await bound(NEXT_NATIVE_PROPOSAL),review=await bound(NEXT_NATIVE_PROPOSAL_REVIEW);
 assert.equal(proposal.executable,false);assert.equal(review.status,'INDEPENDENT_NEXT_NATIVE_PROPOSAL_READONLY_REVIEW_PASS');
 assert.deepEqual(review.proposal,NEXT_NATIVE_PROPOSAL);assert.deepEqual(review.errors,[]);assert.equal(review.verifiedRecommendedRecipes,3);
 await check(proposal.bindings);await check(review.fileBindings);
 const inherited=await bound(proposal.inheritPriorPlan),oldIndex=await bound(proposal.selectedIndex),index=await bound(context.selection);
 assert.equal(oldIndex.files.length,147);assert.equal(index.scope,300);assert.deepEqual(index.files.slice(0,147),oldIndex.files);
 assert.equal(new Set(index.files).size,index.files.length);assert(index.files.length>=148&&index.files.length<=150);
 const selected=[],records=[];for(const p of index.files){const q=await read(p);assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));
  assert.equal(q.routeSha256,routeSha256(q.drags));selected.push({...descriptor(p),levelSha256:q.levelSha256});records.push(q);}
 for(const d of proposal.selected)assert.equal(bindings[d.path],d.sha256,'Previous147 bytes unchanged');
 const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);await check(environment.bindings);await check(runtime.toolchainBindings);
 const advancedProposal=await bound(LOW_BAND_TWO_PROPOSAL),completion=await bound(context.advancedCompletion);
 assert.equal(completion.status,'FINITE_TWO_LOW_BAND_ADVANCED_PLAN_FINISHED');assert.deepEqual(completion.inputPlan,LOW_BAND_TWO_PROPOSAL);assert.equal(completion.outcomes.length,2);
 const advancedOutcomes=[],allowedAppendFiles=new Set(),entry='tools/daily-challenge/formal-v4/qualify-low-band-advanced-slot.mjs',entrySha=sha(await fs.readFile(entry));
 for(const d of context.advancedOutcomes){const q=await bound(d),row=advancedProposal.rows.find(r=>r.slot.formalId===q.formalId);assert(row,'Only the two fixed advanced outcomes');
  assert(completion.outcomes.some(r=>r.file===d.path&&r.sha256===d.sha256&&r.accepted===q.accepted&&r.status===q.status));
  const baseEvidence=await bindNextNativeAdvancedBaseReceipt(q,row);await check(baseEvidence.fileBindings);
  assert.equal(q.sourceLevelId,row.sourceLevelId);assert.equal(q.qualificationOnly,false);assert.equal(q.formalReady,false);
  assert(q.entryResultFile&&q.constructionAttemptStarted,'An actual terminal entry result is required');
  const persisted=await read(q.entryResultFile);assert.deepEqual(persisted,q);await check(q.designBindings);
  if(q.constructionSidecar)await bound(q.constructionSidecar);if(q.constructionPlan)await bound(q.constructionPlan);
  if(q.accepted){
   assertLowBandAdvancedAppend(q,row,entrySha);assert(index.files.includes(d.path),'Every accepted advanced outcome must already belong to final selection');allowedAppendFiles.add(d.path);
   const m=q.mathematicalProof,request=await read(`${ledger}/${m.attempt.id}.request.json`),result=await read(`${ledger}/${m.attempt.id}.result.json`);
   assert.deepEqual(request,m.attempt);assert.equal(request.levelSha256,q.levelSha256);assert.equal(result.levelSha256,q.levelSha256);assert.equal(result.accepted,true);
   assert.equal(result.status,m.status);assert.deepEqual(result.lower,m.lowerBound.result);assert.deepEqual(result.upper,m.route.search);
   assert.equal(m.lowerBound.requiredFloor,21);assert(m.lowerBound.result.thresholdProven);assert.equal(m.L,21);assert(m.U>=21&&m.U<=30);
   assert.equal(m.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound<=10000,true);await check(q.assetBindings);
  }else{assert(q.terminalBlocked);assert(!index.files.includes(d.path));assert(!records.some(r=>r.formalId===q.formalId));}
  advancedOutcomes.push({...d,formalId:q.formalId,accepted:q.accepted,status:q.status,finalAttemptId:q.attempt?.id??null,
   constructionAttemptId:q.construction.constructionAttempt.id,terminalBlocked:q.terminalBlocked??false});
 }
 assert.equal(new Set(advancedOutcomes.map(r=>r.formalId)).size,2);assert.equal(completion.accepted,advancedOutcomes.filter(r=>r.accepted).length);
 const nativeDescriptor=proposal.reservedAccepted.find(d=>d.path.endsWith('native-prefix-three-math-01/candidate-000.json')),native=await bound(nativeDescriptor);
 const nativeIndex=records.findIndex(q=>q.formalId==='daily-basic-combined-d3-10');assert(nativeIndex>=147,'Native draft must be explicitly merged first');
 const nativeRecord=records[nativeIndex];assert.equal(nativeRecord.mathematicalProof.path,nativeDescriptor.path);assert.equal(nativeRecord.mathematicalProof.sha256,nativeDescriptor.sha256);
 for(const k of ['level','drags','levelSha256','routeSha256','attempt','lowerBound','L','U'])assert.deepEqual(nativeRecord[k],native[k]);
 assert.equal(nativeRecord.catalogEligible,true);allowedAppendFiles.add(index.files[nativeIndex]);
 assert.deepEqual([...allowedAppendFiles].sort(),index.files.slice(147).toSorted(),'Only two reviewed outcomes plus native basic may extend147');
 assert.deepEqual(auditV4Diversity(records,runtime.slots).reasons,[]);
 const comparisonOnly=proposal.reservedAccepted.map(d=>({path:d.path,sha256:d.sha256}));for(const d of comparisonOnly)await bound(d);
 const previousMacro=proposal.history.previousMacro;for(const d of previousMacro)await bound(d);
 const previousLateStocks=[];
 const oldInventory=await bound(proposal.history.ledgerInventory),oldLate=oldInventory.roots.find(r=>path.resolve(r.directory)===path.resolve(lateLedger));assert(oldLate);
 const currentLateFiles=(await walk(lateLedger)).sort();assert.deepEqual(currentLateFiles.map(p=>path.resolve(p)).sort(),oldLate.files.map(d=>path.resolve(d.path)).sort(),
  'Another late construction requires a new reviewed macro plan, not a silently increased count');
 for(const n of await fs.readdir(lateLedger))if(n.endsWith('.claim.json')){
  const claim=await read(`${lateLedger}/${n}`);assert.equal(claim.qualificationOnly,false);await read(`${lateLedger}/${n.replace('.claim.json','.result.json')}`);
  for(const file of await fs.readdir(claim.outputDirectory))if(/^construction-.*\.json$/.test(file)){
   const p=path.join(claim.outputDirectory,file),q=await read(p);if(q.placeholderWorld){const level=q.level??q.placeholderWorld,f=designFingerprints(level);
    previousLateStocks.push({...descriptor(p),shapeSha256:f.shapeSha256,level});}
  }
 }
 const publicStocks=[],newRequests=[],priorIds=new Set(proposal.history.publicStocks.map(r=>r.id));
 for(const n of await fs.readdir(ledger))if(n.endsWith('.request.json')){const p=`${ledger}/${n}`,r=await read(p);
  publicStocks.push({...descriptor(p),id:r.id,shapeSha256:r.shapeSha256,colorSha256:r.colorSha256,designSha256:r.designSha256??r.id,
   retryIdentitySha256:levelSha256({shapeSha256:r.shapeSha256,colorSha256:r.colorSha256})});if(!priorIds.has(r.id))newRequests.push(r.id);}
 assert(newRequests.every(id=>advancedOutcomes.some(r=>r.finalAttemptId===id)),
  'Unrelated new public input requires explicit review before binding latest failure parents');
 const failedParents=[];for(const d of proposal.history.sealedParents){const q=await bound(d.receipt),request=await bound(d.request),result=await bound(d.result);
  assert.deepEqual(q.attempt,request);assert.equal(result.accepted,false);assert.equal(request.id,d.id);
  for(const p of [`${ledger}/${request.id}.blocked.json`,`${ledger}/identities/${request.retryIdentitySha256}.blocked.json`]){
   const b=await read(p);assert.equal(b.attemptId,request.id);assert.equal(b.status,result.status);}
  failedParents.push({source:d.source,file:d.receipt.path,sha256:d.receipt.sha256,id:d.id,requestFile:d.request.path,requestSha256:d.request.sha256,
   resultFile:d.result.path,resultSha256:d.result.sha256,fingerprints:designFingerprints(q.level)});
 }
 const blueprints=[];for(const id of proposal.recommendedRecipes){const b=proposal.blueprints.find(x=>x.recipeId===id);assert.equal(b.priority,'recommended');
  const ref=await bound(b.reference);assert.deepEqual(ref.level,b.level);assert.equal(routeSha256(ref.drags),b.referenceRouteSha256);
  const sourceBinding=await currentMainlineSourceBinding(runtime,environment,b.sourceLevelId);await check(sourceBinding.bindings);
  blueprints.push({...b,version:LATE_REGION_VERSION,currentSourceBinding:sourceBinding,knownReferenceOnly:true,newCandidateRouteNotClaimed:true,searchPerformed:false});}
 const ledgerInventory=[];for(const directory of oldInventory.roots.map(r=>r.directory)){
  const files=[];for(const p of (await walk(directory)).sort()){const b=await fs.readFile(p);recordNextNativeBinding(bindings,p,sha(b));files.push({path:p,sha256:bindings[p],bytes:b.length});}
  ledgerInventory.push({directory,fileCount:files.length,files});}
 const compiled=await build({entryPoints:[own,driver,runner,'tools/daily-challenge/formal-v4/prefix-tail-native-v4.mjs'],bundle:true,packages:'external',write:false,
  outdir:'unused-esbuild-output',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs)){const h=sha(await fs.readFile(p));if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;}
 const plan={...Object.fromEntries(['old450','sealedFailures','qualification','nativeQualification','geometry','similarity','gatePolicy','staticPartitionBudget','colourBudget',
  'futureUpperBudget','futureLowerBudget','futureStrategy','sameInputBudget','staticSlot'].map(k=>[k,inherited[k]])),
  schemaVersion:4,scope:300,version:NEXT_NATIVE_PLAN_VERSION,status:'FIXED_REVIEWED_NATIVE_THREE_PREPARED_NO_CONSTRUCTION',
  proposal:NEXT_NATIVE_PROPOSAL,proposalReview:NEXT_NATIVE_PROPOSAL_REVIEW,approvedRecipes:proposal.recommendedRecipes,
  selectedIndex:context.selection,selected,selectedCount:selected.length,advancedOutcomes,advancedCompletion:context.advancedCompletion,
  comparisonOnly,previousMacro,previousLateStocks,failedParents,publicStocks,blueprints,previousMacro64ActualInputs:51,maximumAfterThisBatch:54,
  combinedMaximumInputs:64,maximumStaticPartitionAttempts:2000,maximumFinalColourInputsIncludingRejected:3,maximumStocksEnteringColourCspIncludingFailed:3,
  maximumPerSource:Object.fromEntries(blueprints.map(b=>[b.sourceLevelId,1])),
  sequence:{baseSeed:816334701,step:7919,sourceFactor:101,bodyCountDeltas:[1,-1,2,0,3,-2]},
  deferredRecipesExecutable:false,deferredOnlyNotExecutable:proposal.deferredRecipesNotExecutable,
  staticSlotIsOnlyAValidationEnvelope:true,candidatePoolOnly:true,slotAssigned:false,
  noVisualOrPhysicalIndependenceClaimBeforeActualConstruction:true,selectionUnchanged:true,mathematicalAcceptanceIsNotFinalSlotAcceptance:true,
  executionEnvironment:environment,currentRuntimeValidationClaimed:false,mathematicalToolchainSha256:runtime.toolchainSha256,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  executionTool:driver,mathExecutionTool:runner,oldConstructorCompatible:false,oldMathBatchRunnerCompatible:false,
  newConstructions:0,newSearches:0,ledgerWrites:0,formalReady:false,bindings};
 assertNextNativeRecipePlan(plan);await check(bindings);
 return{plan,ledgerInventory:{status:'READ_ONLY_REFRESHED_SHARED_LEDGER_BYTE_SNAPSHOT',roots:ledgerInventory,newWrites:0}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [mode,out,contextPath,contextSha]=process.argv.slice(2);assert(['inspect','prepare'].includes(mode));
 assert(out&&!(await exists(out)),'Fresh output directory required');
 if(mode==='inspect'){const report=await inspectNextNativePreparation();await fs.mkdir(out,{recursive:false});
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,out,planCreated:false}));}
 else{validDescriptor({path:contextPath,sha256:contextSha});const b=await fs.readFile(contextPath);assert.equal(sha(b),contextSha);
  const {plan,ledgerInventory}=await prepareNextNativeThreePlan(JSON.parse(b));await fs.mkdir(out,{recursive:false});
  const inventoryPath=path.join(out,'ledger-inventory.json');await fs.writeFile(inventoryPath,JSON.stringify(ledgerInventory,null,2)+'\n',{flag:'wx'});
  plan.ledgerInventory={path:inventoryPath,sha256:sha(await fs.readFile(inventoryPath))};plan.bindings[contextPath]=contextSha;plan.bindings[inventoryPath]=plan.ledgerInventory.sha256;
  const file=path.join(out,'plan.json');await fs.writeFile(file,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({plan:{path:file,sha256:sha(await fs.readFile(file))},newConstructions:0,newSearches:0,newLedgerClaims:0}));}
}

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SHELL_PROVIDED_LOWER_BUDGET as SHELL_SEARCH_BUDGET,SHELL_PROVIDED_SEARCH_LIMITS as SHELL_SEARCH_LIMITS,authoredShellProvidedMathOptionsV198 as authoredShellMathOptionsV198,assertShellProvidedMathOptionsV198 as assertShellMathOptionsV198,accountShellProvidedSearchReceiptV198 as accountShellSearchReceiptV198,assertSealedShellProvidedRouteV198} from './shell-provided-search-budget-v198.mjs';
import {VERSION,PINS,HISTORY_RELEASE_VERSION,HISTORY_RELEASE_PATH,HISTORY_RELEASE_TEMPLATE,assertShellHistoryReleaseV198,assertAuthoredShellProvidedOnceConfigV198,assertShellCheckpoint10BridgeV198,assertShellProvidedHistoryDescendantV198,assertCheckpoint10SealedSourceV198,assertShellProvidedSelectionV198,assertAuthoredReservationV198} from './run-authored-shell-provided-once-v198-history10.mjs';
export {VERSION,PINS,HISTORY_RELEASE_VERSION,HISTORY_RELEASE_PATH,HISTORY_RELEASE_TEMPLATE,assertShellHistoryReleaseV198,assertAuthoredShellProvidedOnceConfigV198,assertShellCheckpoint10BridgeV198,assertShellProvidedHistoryDescendantV198,assertCheckpoint10SealedSourceV198,assertShellProvidedSelectionV198,assertAuthoredReservationV198};

// Independent execution sibling. The shared history10 source remains byte-frozen
// and READY=false because completed native evidence binds that exact source.
// Reuse its pure metadata checks only; never invoke or bypass its run gate.
// The execution body below is byte-identical to its reviewed projected body.
export const SELF='tools/daily-challenge/formal-v4/run-authored-shell-provided-once-v198-history10-execution-01.mjs';
export const BUDGET=SHELL_SEARCH_BUDGET;
const V='deliverables/daily-formal-v4-20261008',T='tools/daily-challenge/formal-v4/';
export const READY=true; // SOURCE ONLY: requires independent qualification and deployment.
const sha=b=>createHash('sha256').update(b).digest('hex');
const descriptor=d=>assert(d&&Object.keys(d).sort().join(',')==='path,sha256'&&typeof d.path==='string'&&d.path.length&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact path/SHA descriptor required');
export function assertShellHistoryPinsReadyV198(pins=PINS){
 assert.equal(READY,true,'History10 execution sibling is SOURCE ONLY: no IO, history, model or claim');
 for(const key of Object.keys(PINS))descriptor(pins[key]);return true;
}

export async function runAuthoredShellProvidedOnceV198(configDescriptor){
 assertShellHistoryPinsReadyV198(); // First operation: no IO, history, model or claim while pending.
 descriptor(configDescriptor);assert.equal(path.basename(process.cwd()),'frozen-workspace-4588','Actual frozen cwd required');
 const bindings={},cache=new Map();
 const bytes=async p=>{const key=await fs.realpath(p);let b=cache.get(key);if(!b){b=await fs.readFile(key);cache.set(key,b);}const h=sha(b);if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;return b;};
 const bound=async d=>{descriptor(d);const b=await bytes(d.path);assert.equal(sha(b),d.sha256,d.path);return JSON.parse(b);};
 const map=async m=>{for(const[p,h]of Object.entries(m??{}))assert.equal(sha(await bytes(p)),h,p);};
 const finish=async()=>{for(const[p,b]of cache)assert.equal(sha(await fs.readFile(p)),sha(b),'Binding drift '+p);};
 const c=assertAuthoredShellProvidedOnceConfigV198(await bound(configDescriptor));
 const self={path:fileURLToPath(import.meta.url),sha256:sha(await bytes(fileURLToPath(import.meta.url)))};
 assert.equal(await fs.realpath(SELF),await fs.realpath(self.path),'Run the reviewed frozen copy');
 const executionReview=await bound(c.runnerReview);assert.equal(executionReview.status,'INDEPENDENT_AUTHORED_SHELL_PROVIDED_ONCE_V198_HISTORY10_RUNNER_PASS');assert.deepEqual(executionReview.errors,[]);
 assert.equal(executionReview.productionQualified,true);assert.equal(executionReview.executionAllowed,true);
 assert.equal(executionReview.runner.sha256,self.sha256);assert.equal(path.resolve(executionReview.runner.path),path.resolve(SELF));
 await map(executionReview.toolBindings);
 assert.deepEqual(executionReview.historyRelease,c.historyRelease,'Execution cannot substitute its own10 trust anchor');
 const release=assertShellHistoryReleaseV198(await bound(c.historyRelease));
 const load=p=>import(pathToFileURL(path.resolve(p)));
 // Explicit control entrypoints, including dynamic imports, are compiled only
 // to enumerate and bind source bytes. This is not a mathematical execution.
 const seeds=[SELF,PINS.adapter.path,T+'catalog-contract.mjs',T+'prefix-execution-environment-task.mjs',T+'bounded-qualify-v198.mjs',T+'difficulty-policy-v198.mjs',T+'late-prefix-plan-ledger.mjs',T+'canonical-history-path-compiled.mjs',T+'supplemental-comparison-evidence.mjs',T+'axis-ice-active-region-batch-task-v2_1.mjs'];
 const {build}=await import('esbuild');
 const control=await build({entryPoints:seeds,outdir:'.codex-temp/never-written-authored-shell-control',bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 for(const f of Object.keys(control.metafile.inputs)){const b=await bytes(f);assert.equal(executionReview.toolBindings[f],sha(b),'Control dependency absent from exact independent review: '+f);}
 assert.equal(sha(await bytes(PINS.adapter.path)),PINS.adapter.sha256);
 const ar=await bound(PINS.adapterReview);assert.equal(ar.status,'INDEPENDENT_PLAN_HISTORY_ADAPTER_V17_PASS');assert.deepEqual(ar.errors,[]);assert.equal(ar.toolBindings[PINS.adapter.path],PINS.adapter.sha256);
 await map(ar.toolBindings);
 const policyReview=await bound(PINS.policy);assert.equal(policyReview.reviewedActiveVersion,'1.198.0');
 process.env.DAILY_EXECUTION_POLICY_REVIEW=JSON.stringify(PINS.policy);
 const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,readDirectHistoryRole,assertFreshPlanHistoryInput,PLAN_HISTORY_VERSION}=await load(PINS.adapter.path);
 const {compileCanonicalHistoryPath}=await load(T+'canonical-history-path-compiled.mjs');
 const {latestFailedAttemptBySource}=await load(T+'axis-ice-active-region-batch-task-v2_1.mjs');
 const {readSupplementalComparisonEvidence}=await load(T+'supplemental-comparison-evidence.mjs');
 const {sealedWorldIdentity,changedHistoryShapeAndColour}=await load(T+'sealed-history-contract.mjs');
 const {levelSha256,routeSha256}=await load('tools/daily-challenge/formal-v2/contract.mjs');
 const {selectBoundedStrategy}=await load('tools/daily-challenge/formal-v3/bounded-proof.mjs');
 const {compareLayouts}=await load('tools/daily-challenge/formal-v3/diversity.mjs');
 const {loadV4CatalogRuntime}=await load(T+'catalog-contract.mjs');
 const {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding}=await load(T+'prefix-execution-environment-task.mjs');
 const {loadDailyDifficultyPolicyV198}=await load(T+'difficulty-policy-v198.mjs');
 const {qualifyBoundedCandidateV198,PUBLIC_ATTEMPT_LEDGER}=await load(T+'bounded-qualify-v198.mjs');
 const {claimLatePrefixPlan,finishLatePrefixPlan,LATE_PREFIX_CONSTRUCTION_LEDGER}=await load(T+'late-prefix-plan-ledger.mjs');
 const q=await bound(c.input),s=await bound(c.staticPreflight),prior=await bound(c.historyReport),reference=await bound(c.sourceReference);
 assertShellProvidedSelectionV198(q,c.target,selectBoundedStrategy(q.level,{providedRoute:Array.isArray(q.drags),routeStrategy:'native'}));
 assert.equal(routeSha256(q.drags),q.routeSha256);
 const minimumHistory=await bound(PINS.minimumHistory),bridge=await bound(release.historyBridge),checkpointReview=await bound(release.checkpointReview);
 const sealedReceipt=await bound(checkpointReview.sourceClosure.receipt);
 assertShellCheckpoint10BridgeV198(release,minimumHistory,checkpointReview,bridge,sealedReceipt);
 assertShellProvidedHistoryDescendantV198(prior,c.historyReport,release,bridge);
 assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(q.level.id,c.target.sourceLevelId);
 assert(['AUTHORED_INPUT_STATIC_PASS','AUTHORED_INPUT_STATIC_PASS_HISTORY_AND_MATH_PENDING'].includes(s.status));assert.deepEqual(s.errors,[]);assert(s.fileBindings&&Object.keys(s.fileBindings).length);
 assert.deepEqual(s.input,c.input);
 const render=await bound(c.staticVisualEvidence);
 assert.equal(render.status,'STATIC_AUTHORED_SHELL_OPENING_RENDERED');assert.deepEqual(render.errors,[]);
 assert.deepEqual(render.input,c.input);assert.deepEqual(render.staticPreflight,c.staticPreflight);
 assert.equal(render.levelSha256,q.levelSha256);assert.equal(render.renderedLevelSha256,q.levelSha256);
 assert.equal(render.actuallyRendered,true);assert.equal(render.method,'static-q0-native-sprite-composite');assert.equal(render.playerSaveTouched,false);
 for(const k of ['newGameplaySearches','publicClaimsStarted'])assert.equal(render[k],0);
 assert.deepEqual(render.missingWholeBlockIds,[]);assert.deepEqual(render.storageViolations,[]);
 assert(render.sourceBindings&&Object.keys(render.sourceBindings).length);await map(render.sourceBindings);descriptor(render.image);
 const visual=await bound(c.rootVisualReview);assert.deepEqual(visual.renderEvidence,c.staticVisualEvidence);assert.equal(visual.status,'ROOT_ACTUAL_STATIC_VISUAL_REVIEW_PASS');assert.deepEqual(visual.staticPreflight,c.staticPreflight);assert.deepEqual(visual.input,s.input);assert.equal(visual.levelSha256,q.levelSha256);assert.equal(visual.formalId,q.formalId);assert.equal(visual.sourceLevelId,q.sourceLevelId);assert.equal(visual.image.method,'view_image');assert.equal(visual.image.actuallyViewed,true);
 assert.equal(sha(await bytes(visual.image.path)),visual.image.sha256);assert.deepEqual(render.image,{path:visual.image.path,sha256:visual.image.sha256});
 const staticIndependent=await bound(c.staticIndependentReview);assert.equal(staticIndependent.status,'STATIC_INPUT_INDEPENDENT_PASS_HISTORY_AND_MATH_PENDING');assert.deepEqual(staticIndependent.input,c.input);assert.equal(staticIndependent.levelSha256,q.levelSha256);assert.deepEqual(staticIndependent.errors,[]);
 assert.equal(reference.sourceLevelId??reference.level?.id,c.target.sourceLevelId);assert(reference.level?.blocks);
 const rt=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(rt),root=environment.sourceWorkspace;
 await map(rt.toolchainBindings);await map(rt.designBindings);await map(environment.bindings);
 for(const[p,h]of Object.entries(s.fileBindings))await map({[path.isAbsolute(p)?p:path.join(root,p)]:h});
 for(const[p,h]of Object.entries(staticIndependent.fileBindings??{}))await map({[path.isAbsolute(p)?p:path.join(root,p)]:h});
 descriptor(q.constructionReservation);const reservation=await bound(q.constructionReservation);
 assertAuthoredReservationV198(reservation,q,c.experimentId);assert.deepEqual(reservation.designBase,c.sourceReference);assert.deepEqual(q.designBase,c.sourceReference);
 const numeric=await loadDailyDifficultyPolicyV198();assert.equal(numeric.version,'1.198.0');await map(numeric.bindings);
 assert.deepEqual(numeric.bands,policyReview.numericalAcceptancePolicyDelta.bands);
 for(const[p,h]of Object.entries(policyReview.numericalAcceptancePolicyDelta.adapterBindings)){await map({[p]:h,[path.join(root,p)]:h});}
 const sourceBinding=await currentMainlineSourceBinding(rt,environment,q.sourceLevelId);await map(sourceBinding.bindings);assert.equal(sourceBinding.sourceLevelSha256,q.sourceLevelSha256);
 const source=rt.LEVELS.find(x=>x.id===q.sourceLevelId);
 const canonical=compileCanonicalHistoryPath(prior.historyScope).canonical;
 const rootFor=p=>prior.historyScope.roots.find(r=>canonical(p).startsWith(canonical(r.physicalPath)+'/'))?.id??null;
 async function listing(){const rows={};for(const r of prior.historyScope.roots){const real=await fs.realpath(r.physicalPath);for(const a of r.aliases)assert.equal(await fs.realpath(a),real,'History alias retargeted');const names=[],todo=[r.physicalPath];while(todo.length){const dir=todo.pop();for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'Nested history alias');const f=path.join(dir,e.name);if(e.isDirectory())todo.push(f);else{assert(e.isFile());names.push(f);}}}rows[r.id]=names;}return rows;}
 const declared=(h,d)=>{const out=Object.fromEntries(prior.historyScope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...h.bundle.files,...d.files])if(f.rootId!==null){const k=canonical(f.path);assert(!seen.has(k));seen.add(k);out[f.rootId].push(f.path);}return out;};
 assert.equal(prior.historyScope.roots.length,7);assert.deepEqual(prior.errors,[]);assert.equal(prior.completeHistoryDeltas.at(-1)?.descriptor.sha256??prior.checkpoint.sha256,prior.headSha256);
 console.log('READ_HISTORY_ONCE');
 let h=await consumePlanHistory({checkpoint:prior.checkpoint,review:prior.checkpointReview,expectedScope:prior.historyScope,readBytes:bytes});
 assertCheckpoint10SealedSourceV198(h,checkpointReview,latestFailedAttemptBySource(h,2),sealedReceipt);
 for(const entry of prior.completeHistoryDeltas){const d=await bound(entry.descriptor);h=await mergePlanHistoryDelta(h,{...entry,listing:declared(h,d),readBytes:bytes});}
 assert.equal(h.headSha256,prior.headSha256);assert(!h.closedExperimentIds.includes(c.experimentId));assertPlanHistoryMembers(h,await listing());
 const latest=latestFailedAttemptBySource(h,q.sourceLevelId);
 const role=await readDirectHistoryRole(h,{namespace:latest.namespace,attemptId:latest.request.value.id,receipt:c.failedParentReceipt,role:'failed-parent',readBytes:bytes});await map(role.fileBindings);assert.equal(role.blocked.length,2);
 const parent={namespace:latest.namespace,attemptId:latest.request.value.id,receipt:c.failedParentReceipt,request:latest.request.descriptor,result:latest.result.descriptor,blocked:role.blocked.map(x=>x.descriptor)};
 const fresh=assertFreshPlanHistoryInput(h,q.level,{sourceLevelId:q.sourceLevelId,reference:c.sourceReference,failedParent:parent});
 const unsealed=await bound(c.unsealedHistory);assert.equal(unsealed.status,'ROOT_UNSEALED_HISTORY_STOCKS_REVIEWED');assert.equal(unsealed.complete,true);assert.deepEqual(unsealed.historyReport,c.historyReport);assert.deepEqual(unsealed.currentInput,c.input);assert.deepEqual(unsealed.errors,[]);assert(Array.isArray(unsealed.stocks));
 const identity=sealedWorldIdentity(q.level),extra=[];
 for(const d of unsealed.stocks){const old=await bound(d);assert(old.level?.blocks);const f=sealedWorldIdentity(old.level);assert.notEqual(f.designSha256,identity.designSha256);assert.notEqual(f.retryIdentitySha256,identity.retryIdentitySha256);assert.notEqual(f.partitionSha256,identity.partitionSha256);
  if((old.sourceLevelId??old.level.id)===q.sourceLevelId)assert(changedHistoryShapeAndColour(f,identity));extra.push({descriptor:d,level:old.level});}
 const design=await bound(c.designPool);assert.equal(design.status,'ROOT_RETAINED_DAILY_DESIGN_POOL');assert.equal(design.allRetainedRepresentativesEnumerated,true);assert.deepEqual(design.formalRegistry,c.formalRegistry);assert.deepEqual(design.errors,[]);assert(Array.isArray(design.rows)&&design.rows.length);
 assert.equal(path.resolve(c.formalRegistry.path).toLowerCase(),path.resolve(root,'src/core/formalDailyChallenge300Data.ts').toLowerCase());await bytes(c.formalRegistry.path);assert.equal(bindings[c.formalRegistry.path],c.formalRegistry.sha256);
 const compiled=await build({absWorkingDir:root,entryPoints:['src/core/formalDailyChallenge300Data.ts'],bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))await bytes(path.resolve(root,p));
 const formal=(await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'))).FORMAL_DAILY_300_ENTRIES;
 assert(Array.isArray(formal)&&formal.length>0);assert(!formal.some(x=>x.formalId===q.formalId||x.layoutSha256===q.levelSha256));
 const representatives=[];for(const row of design.rows){descriptor(row.candidate);descriptor(row.disposition);const old=await bound(row.candidate),disposition=await bound(row.disposition);assert.equal(old.formalId,row.formalId);assert(!representatives.some(x=>x.formalId===old.formalId),'Duplicate retained identity');
  const matching=d=>d.formalId===old.formalId&&d.levelSha256===levelSha256(old.level);
  assert([...(disposition.decisions??[]),...(disposition.designAccepted??[])].some(d=>matching(d)&&[d.candidate,d.receipt].some(x=>x?.sha256===row.candidate.sha256)&&d.status==='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION'));
  assert(!(disposition.decisions??[]).some(d=>matching(d)&&d.status!=='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION'),'Retained representative is held');representatives.push(old);}
 const near=(rows)=>rows.map(old=>({formalId:old.formalId,sourceLevelId:old.sourceLevelId,...compareLayouts(q.level,old.level)}));
 const sourceSimilarity=compareLayouts(q.level,source);assert(sourceSimilarity.footprintSimilarity<=.55+1e-12,'Source layout similarity');
 const selectedNear=[...representatives,...formal].map(old=>{const row=near([old])[0],max=old.stageKey===q.stageKey&&old.difficulty===q.difficulty? .65:.75;assert(row.footprintSimilarity<=max+1e-12,'Retained/formal near layout '+row.formalId);return{...row,maximum:max};});
 const view=await readSupplementalComparisonEvidence(h,{provenance:prior.comparisonEvidence.provenance,review:prior.comparisonEvidence.review,readBytes:bytes});await map(view.fileBindings);
 const historicalNear={};for(const[key,rows]of Object.entries({...view.comparisonView.nearPools,unsealed:extra})){let nearest=null;const seen=new Set();for(const old of rows){const hash=levelSha256(old.level);if(seen.has(hash))continue;seen.add(hash);const comparison=compareLayouts(q.level,old.level);if(!nearest||comparison.footprintSimilarity>nearest.footprintSimilarity)nearest={descriptor:old.descriptor,levelSha256:hash,...comparison};}historicalNear[key]={distinctWorlds:seen.size,nearest};}
 // Deliberately diagnostic: a changed failed ancestor need not pass the
 // retained-formal-layout threshold. Original freshness above is untouched.
 const historyEvidence={fresh,parent,sourceSimilarity,selectedNear,historicalNear,historicalNearIsDiagnosticOnly:true,headSha256:h.headSha256};
 await finish();assertPlanHistoryMembers(h,await listing());observeExecutionPolicy(environment);
 await fs.mkdir(c.outputDirectory); // Exclusive once latch; never recursive/reused.
 const fd=async p=>({path:p,sha256:sha(await fs.readFile(p))});
 const write=async(name,value)=>{const p=c.outputDirectory+'/'+name;await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return fd(p);};
 const start=await write('execution-start.json',{version:VERSION,config:configDescriptor,input:c.input,startedAt:new Date().toISOString(),restartAllowed:false,newConstructions:0,newSearches:0});
 let claim=null,result=null,receipt=null,plan=null,entered=false,returned=false,receiptWriteAttempted=false,error=null,closed=false,historyExport=null,constructionOwner=null,mathOwner=null,searchAccounting=null,searchAccountingReceipt=null;
 const construction=[c.input.path,c.staticPreflight.path,q.constructionReservation.path,start.path],mathematics=[];
 try{
  const preflight=await write('history-preflight.json',historyEvidence);construction.push(preflight.path);
  plan=await write('plan.json',{version:VERSION,experimentId:c.experimentId,config:configDescriptor,input:c.input,staticPreflight:c.staticPreflight,sourceReference:c.sourceReference,historyPreflight:preflight,historyHeadSha256:h.headSha256,historyReport:c.historyReport,minimumHistory:PINS.minimumHistory,historyRelease:c.historyRelease,historyBridge:release.historyBridge,providedRouteSha256:q.routeSha256,historyScope:prior.historyScope,environment,policy:PINS.policy,difficultyBand:numeric.bands[q.difficulty],failedParent:parent,mathOptions:authoredShellMathOptionsV198(parent.attemptId),maximumInputs:1,newConstructions:0,...SHELL_SEARCH_LIMITS,rawWholeBoardLimit:10000,retryAllowed:false,rebandAllowed:false,fallbackAllowed:false,bindings:{...bindings},orchestration:self});construction.push(plan.path);
  await finish();assertPlanHistoryMembers(h,await listing());observeExecutionPolicy(environment);
  claim=await claimLatePrefixPlan(plan,c.outputDirectory);construction.push(claim.claimFile);
  const mathOptions=assertShellMathOptionsV198(authoredShellMathOptionsV198(parent.attemptId),parent.attemptId);
  entered=true;result=await qualifyBoundedCandidateV198(rt,q,mathOptions);returned=true;
  receiptWriteAttempted=true;receipt=await write('candidate.json',result);mathematics.push(receipt.path);
  searchAccounting=accountShellSearchReceiptV198(result,{entered,returned,failedParentId:parent.attemptId,providedRouteSha256:q.routeSha256});
  searchAccountingReceipt=await write('search-accounting.json',{...searchAccounting,originalReceipt:receipt});mathematics.push(searchAccountingReceipt.path);
 }catch(e){error=e.stack??String(e);}
 if(!searchAccounting&&!entered)searchAccounting=accountShellSearchReceiptV198(null,{entered:false,returned:false,failedParentId:parent.attemptId,providedRouteSha256:q.routeSha256});
 if(!searchAccounting){
  // Interrupted/invalid evidence is never silently converted to zero calls.
  // The unchanged raw candidate, if present, stays separate from this notice.
  searchAccounting={version:'shell-provided-original-route-single-lower-budget-v198',limits:SHELL_SEARCH_LIMITS,upper:null,lower:null,totalSearchCalls:null,registeredRawSetStatesSum:null,conservativeFullWorlds:null,replayCalls:{canonical:null,independent:null},providedRouteSha256:q.routeSha256,combinedFullWorldsMaximum:10000,jointMathematicalCalls:0,evidenceStatus:'UNKNOWN_OR_ACCOUNTING_REJECTED',qualifierEntered:entered,qualifierReturned:returned,error};
 }
 // Preserve the original result. An ambiguous public claim cannot be turned
 // into a normal failed owner or retried just because this wrapper threw.
 const unknownClaim=entered&&(!returned||(!result?.attempt&&result?.status==='INVALID_ATTEMPT'));
 if(!receipt&&!receiptWriteAttempted){receiptWriteAttempted=true;receipt=await write('candidate.json',result??{accepted:false,formalReady:false,formalId:q.formalId,sourceLevelId:q.sourceLevelId,level:q.level,levelSha256:q.levelSha256,status:unknownClaim?'AUTHORED_SHELL_QUALIFIER_INTERRUPTED':'AUTHORED_SHELL_PRE_MATH_REJECTED',attempt:null,L:null,U:null,qualifierEntered:entered,qualifierReturned:returned,publicClaimsStarted:unknownClaim?null:0,errors:[error]});mathematics.push(receipt.path);}
 if(claim&&!unknownClaim&&receipt){try{
  const a=result?.attempt,records=[];
  if(a){const stem=path.join(PUBLIC_ATTEMPT_LEDGER,a.id),identityFile=path.join(PUBLIC_ATTEMPT_LEDGER,'identities',a.retryIdentitySha256);mathematics.push(stem+'.request.json',stem+'.result.json',stem+'.v4-plan.json',identityFile+'.json');
   const request=await fd(stem+'.request.json'),outcome=await fd(stem+'.result.json'),rawRequest=await bound(request),rawResult=await bound(outcome);assert.deepEqual(rawRequest,a);assert.equal(rawResult.accepted,result.accepted);assert.equal(rawResult.status,result.status);assert.equal(rawResult.levelSha256,q.levelSha256);assert.deepEqual(rawResult.lower,result.lowerBound?.result);assert.deepEqual(rawResult.upper,result.route?.search);
   const blocked=[];if(!result.accepted)for(const p of [path.join(PUBLIC_ATTEMPT_LEDGER,a.identityOrigin+'.blocked.json'),identityFile+'.blocked.json']){mathematics.push(p);const d=await fd(p);blocked.push({descriptor:d,value:await bound(d)});}records.push({kind:'mathematical',namespace:canonical(path.resolve(PUBLIC_ATTEMPT_LEDGER)),request:{descriptor:request,value:rawRequest},result:{descriptor:outcome,value:rawResult},blocked,lock:null});}
  const allowed=()=>[...construction,...mathematics].filter(p=>rootFor(p)!==null).map(p=>({rootId:rootFor(p),path:p}));
  assertPlanHistoryMembers(h,await listing(),allowed());await finish();observeExecutionPolicy(environment);
  await finishLatePrefixPlan(claim,{status:error?'AUTHORED_SHELL_CONSTRUCTION_CLOSED_REJECTED':'AUTHORED_SHELL_CONSTRUCTION_CLOSED',experimentId:c.experimentId,closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1,newConstructions:0,receipts:[receipt],formedWorldFiles:[c.input],mathematicalAcceptance:false,administrativeError:error});construction.push(claim.resultFile);
  const closure=await fd(claim.resultFile),raw=await bound(closure);
  const owner=async(kind,files,ids,campaigns)=>write(kind+'.owner.definition.json',{version:'plan-history-owner-v1',id:c.experimentId+(kind==='mathematical'?'-math':''),namespace:canonical(path.resolve(kind==='construction'?LATE_PREFIX_CONSTRUCTION_LEDGER:PUBLIC_ATTEMPT_LEDGER)),kind,parentPlan:plan,experimentId:c.experimentId,files:await Promise.all([...new Set(files)].map(fd)),attemptIds:ids,closedCampaigns:campaigns});
  constructionOwner=await owner('construction',construction,[],[{id:c.experimentId,descriptor:closure,raw,closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1}]);mathOwner=await owner('mathematical',mathematics,a?[a.id]:[],[]);
  const deltas=[];
  for(const od of [constructionOwner,mathOwner]){const o=await bound(od),declaredOwner={id:o.id,namespace:o.namespace,kind:o.kind,definition:od},files=[],fullWorlds=[];
   for(const d of o.files){
    const value=await bound(d);files.push({...d,aliases:[d.path],rootId:rootFor(d.path)});
    if(value.level?.blocks){assert.deepEqual(value.level,q.level);fullWorlds.push({descriptor:d,field:'level',level:value.level,sourceLevelId:q.sourceLevelId,reference:c.sourceReference,fingerprints:sealedWorldIdentity(value.level)});}
    // A real projected proof world was absent from the plain-joint runner.
    // Preserve it under the exact original receipt field as a separate world;
    // never omit it, substitute it for the original, or call it an upper route.
    const projection=value.lowerBound?.projection;
    if(projection){
     assert.equal(d.path,receipt.path);assert.deepEqual(projection,result.lowerBound.projection);
     assert.equal(projection.method,'opening-outer-bodies-inventory-erasure-v1');assert.equal(projection.upperBoundTransfer,false);
     assert.equal(projection.sourceLevelSha256,q.levelSha256);
     assert.equal(projection.projectedLevelSha256,levelSha256(projection.projectedLevel));
     fullWorlds.push({descriptor:d,field:'lowerBound.projection.projectedLevel',level:projection.projectedLevel,sourceLevelId:q.sourceLevelId,reference:c.sourceReference,fingerprints:sealedWorldIdentity(projection.projectedLevel)});
    }
   }
   const delta={version:PLAN_HISTORY_VERSION,parentHeadSha256:h.headSha256,owner:declaredOwner,files,terminalRecords:o.kind==='mathematical'?records:[],fullWorlds,closedCampaigns:o.closedCampaigns},d=await write(o.kind+'.delta.json',delta);
   h=await mergePlanHistoryDelta(h,{descriptor:d,declaredOwner,listing:declared(h,delta),readBytes:bytes});deltas.push({descriptor:d,declaredOwner});}
  assertPlanHistoryMembers(h,await listing());await finish();
  historyExport=await write('history-report.json',{status:'AUTHORED_SHELL_HISTORY_DELTAS_EXPORTED',errors:[],checkpoint:prior.checkpoint,checkpointReview:prior.checkpointReview,historyScope:prior.historyScope,priorHistoryReport:c.historyReport,priorHistoryDeltas:prior.completeHistoryDeltas,historyDeltas:deltas,completeHistoryDeltas:[...prior.completeHistoryDeltas,...deltas],headSha256:h.headSha256,comparisonEvidence:prior.comparisonEvidence,previousUnsealedHistory:c.unsealedHistory,scope:'Metadata export only; provided original route replays and the single projected lower search are separately accounted in parentExecution',parentExecution:{qualifierEntered:entered,qualifierReturned:returned,publicClaimsStarted:Number(!!result?.attempt),searchAccounting,searchAccountingReceipt,receipt},newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});closed=true;
 }catch(e){error=(error?error+'\n':'')+(e.stack??String(e));}}
 const completion=await write('completion.json',{version:VERSION,status:closed?'AUTHORED_SHELL_SINGLE_INPUT_CLOSED':'AUTHORED_SHELL_SINGLE_INPUT_ADMINISTRATIVE_FAILURE',experimentId:c.experimentId,config:configDescriptor,plan,input:c.input,receipt,constructionOwner,mathOwner,historyExport,closed,restartAllowed:false,newConstructions:0,consumedInputs:1,maximumInputs:1,formedFullWorlds:1,formedFullWorldScope:'Authored physical input only; original saved proof projection is separately declared below and in the mathematical delta',lowerProjectionWorlds:result?.lowerBound?.projection?1:0,persistedLowerProjectionWorldFields:result?.lowerBound?.projection&&receipt?[{descriptor:receipt,field:'lowerBound.projection.projectedLevel',sourceLevelSha256:q.levelSha256,levelSha256:result.lowerBound.projectedLevelSha256}]:[],persistedConstructionWorldFiles:[c.input],unpersistedInputs:[],qualifierEntered:entered,qualifierReturned:returned,publicClaimsStarted:unknownClaim?null:Number(!!result?.attempt),normalExportAllowed:closed&&!unknownClaim,mathematicalReceiptPersisted:!!receipt,unpersistedOriginalMathematicalResult:receipt?null:result,searchAccounting,searchAccountingReceipt,mathematicallyAccepted:result?.accepted===true,accepted:false,formalReady:false,administrativeError:error});
 return{completion,receipt,historyExport,status:result?.status??null,L:result?.L??null,U:result?.U??null,closed,error};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,5,'Explicit --execute, config path and exact SHA required');
 assert.equal(process.argv[2],'--execute');
 console.log(JSON.stringify(await runAuthoredShellProvidedOnceV198({path:process.argv[3],sha256:process.argv[4]})));
}

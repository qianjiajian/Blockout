import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Administrative orchestration only. All mathematics, physical identities,
// parent roles, history decoding and state guards remain in reviewed tools.
export const VERSION='single-authored-basic-input-once-v198-first-input';
export const SELF='tools/daily-challenge/formal-v4/run-authored-basic-once-v198-first-input.mjs';
export const BUDGET=Object.freeze({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
const V='deliverables/daily-formal-v4-20261008',T='tools/daily-challenge/formal-v4/';
const PINS=Object.freeze({
 policy:{path:V+'/proof/execution-policy-reviews/198-01/review.json',sha256:'d72447f1e6f6c7b52c8cc79021d4d8349e7817e8d2e0ddf87eac9c0a8a90fa41'},
 adapter:{path:T+'plan-history-adapter-v16.mjs',sha256:'fd05219f45b8d10364c36aee1b1824b0b56b9439e9a03bcaef2646529c4a28ef'},
 adapterReview:{path:V+'/proof/plan-history-adapter-v16-independent-01/report.json',sha256:'80ca5608db339934e9462db1c88d367549cdeca13b7a5cd36019020671cf53c9'},
});
const sha=b=>createHash('sha256').update(b).digest('hex');
const descriptor=d=>assert(d&&Object.keys(d).sort().join(',')==='path,sha256'&&typeof d.path==='string'&&d.path.length&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact path/SHA descriptor required');
const exactKeys=(o,keys)=>assert.deepEqual(Object.keys(o).sort(),[...keys].sort(),'Unknown/missing configuration fields');

/** Pure validation; importing this file does not load any runtime or history.
 * Root supplies immutable designPool/unsealedHistory reviews; neither is a
 * solver receipt. They cannot replace the original full history consumer. */
export function assertAuthoredBasicOnceConfigV198(c){
 exactKeys(c,['version','experimentId','input','inputCorrection','staticPreflight','staticIndependentReview','rootVisualReview','runnerReview','target','sourceReference','failedParentReceipt','historyReport','formalRegistry','designPool','unsealedHistory','outputDirectory']);
 assert.equal(c.version,VERSION);assert(/^[a-z0-9][a-z0-9-]{2,100}$/.test(c.experimentId));
 for(const k of ['input','staticPreflight','staticIndependentReview','rootVisualReview','runnerReview','sourceReference','historyReport','formalRegistry','designPool','unsealedHistory'])descriptor(c[k]);
 if(c.failedParentReceipt!==null)descriptor(c.failedParentReceipt);
 if(c.inputCorrection!==null)descriptor(c.inputCorrection);
 exactKeys(c.target,['formalId','stageKey','difficulty','slot','sourceLevelId']);
 const t=c.target;assert.equal(t.stageKey,'basic-combined');assert([1,2,3].includes(t.difficulty));
 assert(Number.isSafeInteger(t.slot)&&t.slot>=1&&t.slot<=10);assert(Number.isSafeInteger(t.sourceLevelId)&&t.sourceLevelId>=1&&t.sourceLevelId<=200);
 assert.equal(t.formalId,`daily-basic-combined-d${t.difficulty}-${String(t.slot).padStart(2,'0')}`);
 assert(typeof c.outputDirectory==='string'&&c.outputDirectory.startsWith(V+'/design/')&&!c.outputDirectory.includes('\\'));
 assert.equal(path.posix.normalize(c.outputDirectory),c.outputDirectory);assert(!c.outputDirectory.includes('..'));
 assert(![c.input.path,c.staticPreflight.path].some(p=>p.startsWith(c.outputDirectory+'/')),'Run directory must not contain pre-existing input/static files');
 return c;
}

export function assertPlainJointSelectionV198(candidate,target,strategy){
 for(const k of Object.keys(target))assert.equal(candidate[k],target[k],k);
 for(const k of ['drags','routeSha256','timeSchedule','timeScheduleSha256'])assert(!Object.hasOwn(candidate,k),'New input has no borrowed route/time schedule');
 for(const k of ['L','U','proof','lowerBound','route','mathematicalEvidence'])assert(candidate[k]===undefined||candidate[k]===null,'New input has no existing mathematical evidence');
 assert.equal(strategy.route,'plain-joint');assert.equal(strategy.lower,'plain');
 assert.equal(candidate.accepted,false);assert.equal(candidate.formalReady,false);
 assert.equal(candidate.newestMechanism,null);assert.equal(candidate.unlockLevel,1);
}

export function assertAuthoredReservationV198(reservation,candidate,experimentId){
 assert.equal(reservation.maximumFullWorldInputs,1);assert.equal(reservation.experimentId,experimentId);
 for(const k of ['formalId','difficulty','slot','sourceLevelId'])assert.equal(reservation[k],candidate[k]);
 for(const k of ['retryAllowed','fallbackAllowed','rebandAllowed'])assert.equal(reservation[k],false);
 for(const k of ['newModels','newSearches','newReplayCalls','newSharedLedgerClaims'])assert.equal(reservation[k],0);
}

export function assertAdministrativeEnvelopeCorrectionV198(original,corrected,correction){
 assert.equal(correction.status,'ADMINISTRATIVE_ENVELOPE_CORRECTION_PASS');assert.deepEqual(correction.errors,[]);
 assert.equal(original.newestMechanism,'basic-combined');assert.equal(corrected.newestMechanism,null);
 assert.deepEqual({...original,newestMechanism:null},corrected,'Only the exact administrative slot field may change');
 assert.equal(correction.newPhysicalInputs,0);assert.equal(correction.physicalInputCountTotal,1);
 for(const k of ['newModels','newSearches','newReplayCalls','newClaims','oldFilesChanged'])assert.equal(correction[k],0);
}

/** Search limits are deliberately not caller parameters. The sole plain
 * joint search shares its lower/upper raw state set. 128 is an exploration
 * cutoff, never an added D3 admission upper bound. No fallback or reband. */
export function authoredBasicMathOptionsV198(failedParentId){
 assert(failedParentId===null||/^[a-f0-9]{64}$/.test(failedParentId));
 return{routeBudget:{...BUDGET},lowerBudget:{...BUDGET},...(failedParentId===null?{}:{redesignOf:failedParentId}),routeStrategy:'plain-minimum',searchUpper:128};
}


/** Metadata gate over the ENTIRE consumed history, never a caller decision
 * that a failed-parent lookup error means none. The run function derives
 * sourceWorlds itself from h.fullWorlds using the original level hash function.
 * Identity aliases are followed across all namespaces and result kinds. */
export function normalizeFirstInputWorldMetadataV198(sourceLevelId,originalDescriptor,levelSha256){
 assert(originalDescriptor&&typeof originalDescriptor==='object');
 const exact={path:originalDescriptor.path,sha256:originalDescriptor.sha256};descriptor(exact);
 assert(/^[a-f0-9]{64}$/.test(levelSha256));
 return{sourceLevelId,descriptor:exact,originalDescriptor:structuredClone(originalDescriptor),levelSha256};
}
export function assertFirstInputHistoryRecordsV198({headSha256,sourceLevelId,sourceWorlds,terminalRecords,publicNamespace}){
 const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
 assert(isHash(headSha256));assert(Number.isSafeInteger(sourceLevelId)&&sourceLevelId>=1&&sourceLevelId<=200);
 assert(typeof publicNamespace==='string'&&publicNamespace.length);assert(Array.isArray(sourceWorlds)&&sourceWorlds.length,'Source must have authenticated historical worlds');
 assert(Array.isArray(terminalRecords));
 const levels=new Set(),designs=new Set(),physical=new Set(),selected=new Set();
 for(const w of sourceWorlds){exactKeys(w,['sourceLevelId','descriptor','originalDescriptor','levelSha256']);assert.equal(w.sourceLevelId,sourceLevelId);descriptor(w.descriptor);assert.deepEqual(w.descriptor,{path:w.originalDescriptor.path,sha256:w.originalDescriptor.sha256});assert(isHash(w.levelSha256));levels.add(w.levelSha256);}
 const identities=terminalRecords.map(r=>{assert(r&&typeof r.namespace==='string'&&r.namespace.length);assert(['mathematical','construction'].includes(r.kind));
  const q=r.request?.value;assert(q&&typeof q.id==='string'&&q.id.length);descriptor(r.request.descriptor);
  for(const k of ['levelSha256','designSha256','shapeSha256','colorSha256'])assert(isHash(q[k]),'Missing original identity '+k);
  assert(Array.isArray(r.blocked));assert(Object.hasOwn(r,'result')&&Object.hasOwn(r,'lock'));
  if(r.result!==null){descriptor(r.result.descriptor);assert.equal(r.result.value.levelSha256,q.levelSha256);assert.equal(typeof r.result.value.accepted,'boolean');}
  if(r.lock!==null)descriptor(r.lock.descriptor);for(const x of r.blocked)descriptor(x.descriptor);
  return{level:q.levelSha256,design:q.designSha256,physical:q.shapeSha256+'|'+q.colorSha256};});
 // A same-identity record may live outside the source's namespace or carry a
 // different level hash. Transitive alias closure prevents hiding its status.
 let changed=true;while(changed){changed=false;for(let i=0;i<terminalRecords.length;i++){if(selected.has(i))continue;const f=identities[i];
  if(!levels.has(f.level)&&!designs.has(f.design)&&!physical.has(f.physical))continue;
  selected.add(i);levels.add(f.level);designs.add(f.design);physical.add(f.physical);changed=true;
 }}
 const rows=[...selected].map(i=>terminalRecords[i]);
 for(const r of rows){assert(r.result!==null&&r.lock===null,'Source has a pending attempt or lock');assert.equal(r.result.value.accepted,true,'Source has a failed attempt');assert.equal(r.blocked.length,0,'Source has a blocked identity');}
 return{status:'NO_FAILED_PENDING_OR_BLOCKED_SOURCE_HISTORY',scope:'All namespaces and original mathematical/construction terminal roles, including physical/design aliases',
  historyHeadSha256:headSha256,sourceLevelId,sourceWorlds:structuredClone(sourceWorlds),matchedRecords:rows.map(r=>({namespace:r.namespace,kind:r.kind,attemptId:r.request.value.id,request:r.request.descriptor,result:r.result.descriptor,blocked:[],lock:null,accepted:true})),
  matchedRecordCount:rows.length,publicMathematicalCount:rows.filter(r=>r.namespace===publicNamespace&&r.kind==='mathematical').length,
  failedCount:0,pendingCount:0,blockedCount:0,failedParent:null,redesignOfOmitted:true,acceptedIdentityRevalidationAllowed:false};
}

export async function runAuthoredBasicOnceV198(configDescriptor){
 descriptor(configDescriptor);assert.equal(path.basename(process.cwd()),'frozen-workspace-4588','Actual frozen cwd required');
 const bindings={},cache=new Map();
 const bytes=async p=>{const key=await fs.realpath(p);let b=cache.get(key);if(!b){b=await fs.readFile(key);cache.set(key,b);}const h=sha(b);if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;return b;};
 const bound=async d=>{descriptor(d);const b=await bytes(d.path);assert.equal(sha(b),d.sha256,d.path);return JSON.parse(b);};
 const map=async m=>{for(const[p,h]of Object.entries(m??{}))assert.equal(sha(await bytes(p)),h,p);};
 const finish=async()=>{for(const[p,b]of cache)assert.equal(sha(await fs.readFile(p)),sha(b),'Binding drift '+p);};
 const c=assertAuthoredBasicOnceConfigV198(await bound(configDescriptor));
 const self={path:fileURLToPath(import.meta.url),sha256:sha(await bytes(fileURLToPath(import.meta.url)))};
 assert.equal(await fs.realpath(SELF),await fs.realpath(self.path),'Run the reviewed frozen copy');
 const executionReview=await bound(c.runnerReview);assert.equal(executionReview.status,'INDEPENDENT_AUTHORED_BASIC_ONCE_V198_FIRST_INPUT_RUNNER_PASS');assert.deepEqual(executionReview.errors,[]);
 assert.equal(executionReview.runner.sha256,self.sha256);assert.equal(path.resolve(executionReview.runner.path),path.resolve(SELF));
 await map(executionReview.toolBindings);
 const load=p=>import(pathToFileURL(path.resolve(p)));
 // Explicit control entrypoints, including dynamic imports, are compiled only
 // to enumerate and bind source bytes. This is not a mathematical execution.
 const seeds=[SELF,PINS.adapter.path,T+'catalog-contract.mjs',T+'prefix-execution-environment-task.mjs',T+'bounded-qualify-v198.mjs',T+'difficulty-policy-v198.mjs',T+'late-prefix-plan-ledger.mjs',T+'canonical-history-path-compiled.mjs',T+'supplemental-comparison-evidence.mjs',T+'axis-ice-active-region-batch-task-v2_1.mjs'];
 const {build}=await import('esbuild');
 const control=await build({entryPoints:seeds,outdir:'.codex-temp/never-written-authored-basic-control',bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 for(const f of Object.keys(control.metafile.inputs)){const b=await bytes(f);assert.equal(executionReview.toolBindings[f],sha(b),'Control dependency absent from exact independent review: '+f);}
 assert.equal(sha(await bytes(PINS.adapter.path)),PINS.adapter.sha256);
 const ar=await bound(PINS.adapterReview);assert.equal(ar.status,'INDEPENDENT_PLAN_HISTORY_ADAPTER_V16_PASS');assert.deepEqual(ar.errors,[]);assert.equal(ar.toolBindings[PINS.adapter.path],PINS.adapter.sha256);
 await map(ar.toolBindings);
 const policyReview=await bound(PINS.policy);assert.equal(policyReview.reviewedActiveVersion,'1.198.0');
 process.env.DAILY_EXECUTION_POLICY_REVIEW=JSON.stringify(PINS.policy);
 const {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,readDirectHistoryRole,assertFreshPlanHistoryInput,PLAN_HISTORY_VERSION}=await load(PINS.adapter.path);
 const {compileCanonicalHistoryPath}=await load(T+'canonical-history-path-compiled.mjs');
 const {latestFailedAttemptBySource}=await load(T+'axis-ice-active-region-batch-task-v2_1.mjs');
 const {readSupplementalComparisonEvidence}=await load(T+'supplemental-comparison-evidence.mjs');
 const {sealedWorldIdentity,changedHistoryShapeAndColour}=await load(T+'sealed-history-contract.mjs');
 const {levelSha256}=await load('tools/daily-challenge/formal-v2/contract.mjs');
 const {selectBoundedStrategy}=await load('tools/daily-challenge/formal-v3/bounded-proof.mjs');
 const {compareLayouts}=await load('tools/daily-challenge/formal-v3/diversity.mjs');
 const {loadV4CatalogRuntime}=await load(T+'catalog-contract.mjs');
 const {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding}=await load(T+'prefix-execution-environment-task.mjs');
 const {loadDailyDifficultyPolicyV198}=await load(T+'difficulty-policy-v198.mjs');
 const {qualifyBoundedCandidateV198,PUBLIC_ATTEMPT_LEDGER}=await load(T+'bounded-qualify-v198.mjs');
 const {claimLatePrefixPlan,finishLatePrefixPlan,LATE_PREFIX_CONSTRUCTION_LEDGER}=await load(T+'late-prefix-plan-ledger.mjs');
 const q=await bound(c.input),s=await bound(c.staticPreflight),prior=await bound(c.historyReport),reference=await bound(c.sourceReference);
 assertPlainJointSelectionV198(q,c.target,selectBoundedStrategy(q.level,{routeStrategy:'plain-minimum'}));
 assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(q.level.id,c.target.sourceLevelId);
 assert(['AUTHORED_INPUT_STATIC_PASS','AUTHORED_INPUT_STATIC_PASS_HISTORY_AND_MATH_PENDING'].includes(s.status));assert.deepEqual(s.errors,[]);assert(s.fileBindings&&Object.keys(s.fileBindings).length);
 let correction=null;
 if(c.inputCorrection){correction=await bound(c.inputCorrection);assert.deepEqual(correction.originalStaticReport,c.staticPreflight);assert.deepEqual(correction.originalInput,s.input);assert.deepEqual(correction.correctedInput,c.input);assertAdministrativeEnvelopeCorrectionV198(await bound(s.input),q,correction);}
 else assert.deepEqual(s.input,c.input);
 const visual=await bound(c.rootVisualReview);assert.equal(visual.status,'ROOT_ACTUAL_STATIC_VISUAL_REVIEW_PASS');assert.deepEqual(visual.staticPreflight,c.staticPreflight);assert.deepEqual(visual.input,s.input);assert.equal(visual.levelSha256,q.levelSha256);assert.equal(visual.formalId,q.formalId);assert.equal(visual.sourceLevelId,q.sourceLevelId);assert.equal(visual.image.method,'view_image');assert.equal(visual.image.actuallyViewed,true);
 assert.equal(sha(await bytes(visual.image.path)),visual.image.sha256);assert.deepEqual(s.image,{path:visual.image.path,sha256:visual.image.sha256});
 const staticIndependent=await bound(c.staticIndependentReview);assert.equal(staticIndependent.status,'STATIC_INPUT_INDEPENDENT_PASS_HISTORY_AND_MATH_PENDING');assert.deepEqual(staticIndependent.input,c.input);assert.equal(staticIndependent.levelSha256,q.levelSha256);assert.deepEqual(staticIndependent.errors,[]);
 assert.equal(reference.sourceLevelId??reference.level?.id,c.target.sourceLevelId);assert(reference.level?.blocks);
 const rt=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(rt),root=environment.sourceWorkspace;
 await map(rt.toolchainBindings);await map(rt.designBindings);await map(environment.bindings);
 for(const[p,h]of Object.entries(s.fileBindings))await map({[path.isAbsolute(p)?p:path.join(root,p)]:h});
 for(const[p,h]of Object.entries(correction?.fileBindings??{}))await map({[path.isAbsolute(p)?p:path.join(root,p)]:h});
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
 for(const entry of prior.completeHistoryDeltas){const d=await bound(entry.descriptor);h=await mergePlanHistoryDelta(h,{...entry,listing:declared(h,d),readBytes:bytes});}
 assert.equal(h.headSha256,prior.headSha256);assert(!h.closedExperimentIds.includes(c.experimentId));assertPlanHistoryMembers(h,await listing());
 let parent=null,firstInputHistory=null;
 if(c.failedParentReceipt===null){
  const sourceWorlds=h.fullWorlds.filter(w=>w.sourceLevelId===q.sourceLevelId||w.level?.id===q.sourceLevelId).map(w=>normalizeFirstInputWorldMetadataV198(q.sourceLevelId,w.descriptor,levelSha256(w.level)));
  firstInputHistory=assertFirstInputHistoryRecordsV198({headSha256:h.headSha256,sourceLevelId:q.sourceLevelId,sourceWorlds,terminalRecords:h.bundle.terminalRecords,publicNamespace:h.bundle.publicNamespace});
 }else{
  const latest=latestFailedAttemptBySource(h,q.sourceLevelId);
  const role=await readDirectHistoryRole(h,{namespace:latest.namespace,attemptId:latest.request.value.id,receipt:c.failedParentReceipt,role:'failed-parent',readBytes:bytes});await map(role.fileBindings);assert.equal(role.blocked.length,2);
  parent={namespace:latest.namespace,attemptId:latest.request.value.id,receipt:c.failedParentReceipt,request:latest.request.descriptor,result:latest.result.descriptor,blocked:role.blocked.map(x=>x.descriptor)};
 }
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
 const historyEvidence={fresh,parent,firstInputHistory,sourceSimilarity,selectedNear,historicalNear,historicalNearIsDiagnosticOnly:true,headSha256:h.headSha256};
 await finish();assertPlanHistoryMembers(h,await listing());observeExecutionPolicy(environment);
 await fs.mkdir(c.outputDirectory); // Exclusive once latch; never recursive/reused.
 const fd=async p=>({path:p,sha256:sha(await fs.readFile(p))});
 const write=async(name,value)=>{const p=c.outputDirectory+'/'+name;await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return fd(p);};
 const start=await write('execution-start.json',{version:VERSION,config:configDescriptor,input:c.input,startedAt:new Date().toISOString(),restartAllowed:false,newConstructions:0,newSearches:0});
 let claim=null,result=null,receipt=null,plan=null,entered=false,returned=false,receiptWriteAttempted=false,error=null,closed=false,historyExport=null,constructionOwner=null,mathOwner=null;
 const construction=[c.input.path,c.staticPreflight.path,q.constructionReservation.path,...(c.inputCorrection?[s.input.path,c.inputCorrection.path]:[]),start.path],mathematics=[];
 try{
  const preflight=await write('history-preflight.json',historyEvidence);construction.push(preflight.path);
  plan=await write('plan.json',{version:VERSION,experimentId:c.experimentId,config:configDescriptor,input:c.input,staticPreflight:c.staticPreflight,sourceReference:c.sourceReference,historyPreflight:preflight,historyHeadSha256:h.headSha256,historyReport:c.historyReport,historyScope:prior.historyScope,environment,policy:PINS.policy,difficultyBand:numeric.bands[q.difficulty],failedParent:parent,mathOptions:authoredBasicMathOptionsV198(parent?.attemptId??null),maximumInputs:1,newConstructions:0,jointCallsMaximum:1,rawWholeBoardLimit:10000,retryAllowed:false,rebandAllowed:false,fallbackAllowed:false,bindings:{...bindings},orchestration:self});construction.push(plan.path);
  await finish();assertPlanHistoryMembers(h,await listing());observeExecutionPolicy(environment);
  claim=await claimLatePrefixPlan(plan,c.outputDirectory);construction.push(claim.claimFile);
  entered=true;result=await qualifyBoundedCandidateV198(rt,q,authoredBasicMathOptionsV198(parent?.attemptId??null));returned=true;
  receiptWriteAttempted=true;receipt=await write('candidate.json',result);mathematics.push(receipt.path);
 }catch(e){error=e.stack??String(e);}
 // Preserve the original result. An ambiguous public claim cannot be turned
 // into a normal failed owner or retried just because this wrapper threw.
 const unknownClaim=entered&&(!returned||(!result?.attempt&&result?.status==='INVALID_ATTEMPT'));
 if(!receipt&&!receiptWriteAttempted){receiptWriteAttempted=true;receipt=await write('candidate.json',result??{accepted:false,formalReady:false,formalId:q.formalId,sourceLevelId:q.sourceLevelId,level:q.level,levelSha256:q.levelSha256,status:unknownClaim?'AUTHORED_BASIC_QUALIFIER_INTERRUPTED':'AUTHORED_BASIC_PRE_MATH_REJECTED',attempt:null,L:null,U:null,qualifierEntered:entered,qualifierReturned:returned,publicClaimsStarted:unknownClaim?null:0,errors:[error]});mathematics.push(receipt.path);}
 if(claim&&!unknownClaim&&receipt){try{
  const a=result?.attempt,records=[];
  if(a){const stem=path.join(PUBLIC_ATTEMPT_LEDGER,a.id),identityFile=path.join(PUBLIC_ATTEMPT_LEDGER,'identities',a.retryIdentitySha256);mathematics.push(stem+'.request.json',stem+'.result.json',stem+'.v4-plan.json',identityFile+'.json');
   const request=await fd(stem+'.request.json'),outcome=await fd(stem+'.result.json'),rawRequest=await bound(request),rawResult=await bound(outcome);assert.deepEqual(rawRequest,a);assert.equal(rawResult.accepted,result.accepted);assert.equal(rawResult.status,result.status);assert.equal(rawResult.levelSha256,q.levelSha256);assert.deepEqual(rawResult.lower,result.lowerBound?.result);assert.deepEqual(rawResult.upper,result.route?.search);
   const blocked=[];if(!result.accepted)for(const p of [path.join(PUBLIC_ATTEMPT_LEDGER,a.identityOrigin+'.blocked.json'),identityFile+'.blocked.json']){mathematics.push(p);const d=await fd(p);blocked.push({descriptor:d,value:await bound(d)});}records.push({kind:'mathematical',namespace:canonical(path.resolve(PUBLIC_ATTEMPT_LEDGER)),request:{descriptor:request,value:rawRequest},result:{descriptor:outcome,value:rawResult},blocked,lock:null});}
  const allowed=()=>[...construction,...mathematics].filter(p=>rootFor(p)!==null).map(p=>({rootId:rootFor(p),path:p}));
  assertPlanHistoryMembers(h,await listing(),allowed());await finish();observeExecutionPolicy(environment);
  await finishLatePrefixPlan(claim,{status:error?'AUTHORED_BASIC_CONSTRUCTION_CLOSED_REJECTED':'AUTHORED_BASIC_CONSTRUCTION_CLOSED',experimentId:c.experimentId,closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1,newConstructions:0,receipts:[receipt],formedWorldFiles:[c.input],mathematicalAcceptance:false,administrativeError:error});construction.push(claim.resultFile);
  const closure=await fd(claim.resultFile),raw=await bound(closure);
  const owner=async(kind,files,ids,campaigns)=>write(kind+'.owner.definition.json',{version:'plan-history-owner-v1',id:c.experimentId+(kind==='mathematical'?'-math':''),namespace:canonical(path.resolve(kind==='construction'?LATE_PREFIX_CONSTRUCTION_LEDGER:PUBLIC_ATTEMPT_LEDGER)),kind,parentPlan:plan,experimentId:c.experimentId,files:await Promise.all([...new Set(files)].map(fd)),attemptIds:ids,closedCampaigns:campaigns});
  constructionOwner=await owner('construction',construction,[],[{id:c.experimentId,descriptor:closure,raw,closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1}]);mathOwner=await owner('mathematical',mathematics,a?[a.id]:[],[]);
  const deltas=[];
  for(const od of [constructionOwner,mathOwner]){const o=await bound(od),declaredOwner={id:o.id,namespace:o.namespace,kind:o.kind,definition:od},files=[],fullWorlds=[];
   for(const d of o.files){const value=await bound(d);files.push({...d,aliases:[d.path],rootId:rootFor(d.path)});if(value.level?.blocks){assert.deepEqual(value.level,q.level);fullWorlds.push({descriptor:d,field:'level',level:value.level,sourceLevelId:q.sourceLevelId,reference:c.sourceReference,fingerprints:sealedWorldIdentity(value.level)});}}
   const delta={version:PLAN_HISTORY_VERSION,parentHeadSha256:h.headSha256,owner:declaredOwner,files,terminalRecords:o.kind==='mathematical'?records:[],fullWorlds,closedCampaigns:o.closedCampaigns},d=await write(o.kind+'.delta.json',delta);
   h=await mergePlanHistoryDelta(h,{descriptor:d,declaredOwner,listing:declared(h,delta),readBytes:bytes});deltas.push({descriptor:d,declaredOwner});}
  assertPlanHistoryMembers(h,await listing());await finish();
  historyExport=await write('history-report.json',{status:'AUTHORED_BASIC_HISTORY_DELTAS_EXPORTED',errors:[],checkpoint:prior.checkpoint,checkpointReview:prior.checkpointReview,historyScope:prior.historyScope,priorHistoryReport:c.historyReport,priorHistoryDeltas:prior.completeHistoryDeltas,historyDeltas:deltas,completeHistoryDeltas:[...prior.completeHistoryDeltas,...deltas],headSha256:h.headSha256,comparisonEvidence:prior.comparisonEvidence,previousUnsealedHistory:c.unsealedHistory,scope:'Metadata export after the separately recorded unique mathematical call; zero counters below describe export only',parentExecution:{qualifierEntered:entered,qualifierReturned:returned,publicClaimsStarted:Number(!!result?.attempt),jointMathematicalCalls:result?.lowerBound?.result?1:result?.attempt?null:0,nullCallCountMeaning:'Original receipt cannot establish whether the sole mathematical call began',receipt},newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});closed=true;
 }catch(e){error=(error?error+'\n':'')+(e.stack??String(e));}}
 const completion=await write('completion.json',{version:VERSION,status:closed?'AUTHORED_BASIC_SINGLE_INPUT_CLOSED':'AUTHORED_BASIC_SINGLE_INPUT_ADMINISTRATIVE_FAILURE',experimentId:c.experimentId,config:configDescriptor,plan,input:c.input,receipt,constructionOwner,mathOwner,historyExport,closed,restartAllowed:false,newConstructions:0,consumedInputs:1,maximumInputs:1,formedFullWorlds:1,persistedConstructionWorldFiles:[c.input],unpersistedInputs:[],qualifierEntered:entered,qualifierReturned:returned,publicClaimsStarted:unknownClaim?null:Number(!!result?.attempt),normalExportAllowed:closed&&!unknownClaim,mathematicalReceiptPersisted:!!receipt,unpersistedOriginalMathematicalResult:receipt?null:result,mathematicallyAccepted:result?.accepted===true,accepted:false,formalReady:false,administrativeError:error});
 return{completion,receipt,historyExport,status:result?.status??null,L:result?.L??null,U:result?.U??null,closed,error};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,5,'Explicit --execute, config path and exact SHA required');
 assert.equal(process.argv[2],'--execute');
 console.log(JSON.stringify(await runAuthoredBasicOnceV198({path:process.argv[3],sha256:process.argv[4]})));
}

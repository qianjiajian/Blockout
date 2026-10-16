import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sealedWorldIdentity,changedHistoryShapeAndColour} from './sealed-history-contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {VERSION as HISTORY_VERSION,assertCompactHistoryMembersV198,appendCompactShellResultV198} from './compact-shell-execution-v198.mjs';
import {assertSealedShellProvidedRouteV198,SHELL_PROVIDED_LOWER_BUDGET,SHELL_PROVIDED_UNUSED_UPPER_BUDGET,accountShellProvidedSearchReceiptV198} from './shell-provided-search-budget-v198.mjs';
import {auditProvidedRouteCyclesV198} from './provided-route-cycle-audit-v198.mjs';

// First-source administrative sibling; existing adapters and mathematics stay intact.
// Null parent is permitted only after complete source/alias history absence checks.
// The supplied route is sealed before the shared once claim, replayed exactly
// once by each original validator, and never searched. Only one projected
// lower search is permitted (9999 registered worlds + one terminal allowance).
// Static closed-gesture inspection is not a model, proof or gameplay replay.
export const VERSION='compact-shell-first-source-provided-route-projected-lower-v198-v1';
export const SELF='tools/daily-challenge/formal-v4/compact-shell-first-source-provided-v198.mjs';
const CYCLE='tools/daily-challenge/formal-v4/provided-route-cycle-audit-v198.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact descriptor required');
const related=(a,b)=>a.designSha256===b.designSha256||a.shapeSha256===b.shapeSha256&&a.colorSha256===b.colorSha256;
const canonical=i=>compileCanonicalHistoryPath(i.scope).canonical;
const samePath=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
async function bound(d){descriptor(d);const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,d.path);return JSON.parse(b);}
async function writeOnce(p,value){await fs.writeFile(p,JSON.stringify(value)+'\n',{flag:'wx'});return{path:p,sha256:sha(await fs.readFile(p))};}

const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const physical=f=>f.shapeSha256+'|'+f.colorSha256;
function checkIdentity(f){for(const k of ['levelSha256','designSha256','shapeSha256','colorSha256'])assert(isHash(f?.[k]),'Missing original identity '+k);}
function indexFile(index,d){descriptor(d);const norm=canonical(index),target=norm(d.path);assert(index.files.some(f=>norm(f.path)===target&&f.sha256===d.sha256),'History descriptor missing from reviewed index');}

/** No source-world construction or solver calls. The exact reviewed compact
 * index supplies ALL source worlds. Start with their level/design/physical
 * identities, then close transitively over every namespace and record kind.
 * A failed lookup is never treated as evidence that no failed parent exists. */
export function assertCompactShellFirstSourceHistoryV198(index,sourceLevelId){
 assert.equal(index.version,HISTORY_VERSION);assert(isHash(index.headSha256));assert.equal(index.scope.roots.length,7);
 assert(Number.isSafeInteger(sourceLevelId)&&sourceLevelId>=1&&sourceLevelId<=200);
 assert(Array.isArray(index.worlds)&&Array.isArray(index.records));assert(typeof index.publicNamespace==='string'&&index.publicNamespace.length);
 const sourceWorlds=index.worlds.filter(w=>w.sourceLevelId===sourceLevelId||w.levelId===sourceLevelId);
 assert(sourceWorlds.length,'Authenticated source history is required');
 const levels=new Set(),designs=new Set(),physicals=new Set(),selected=new Set();
 const add=f=>{checkIdentity(f);levels.add(f.levelSha256);designs.add(f.designSha256);physicals.add(physical(f));};
 for(const w of sourceWorlds)add(w.identity);
 for(const r of index.records){assert(['mathematical','construction'].includes(r.kind),'Unknown terminal kind');assert(typeof r.namespace==='string'&&r.namespace.length);
  descriptor(r.request?.descriptor);assert(typeof r.request.value.id==='string'&&r.request.value.id.length);checkIdentity(r.request.value);
  assert(Array.isArray(r.blocked));assert(Object.hasOwn(r,'result')&&Object.hasOwn(r,'lock'),'Missing terminal/lock state');
  if(r.result!==null){descriptor(r.result.descriptor);assert.equal(typeof r.result.value.accepted,'boolean');assert.equal(r.result.value.levelSha256,r.request.value.levelSha256);}
  if(r.lock!==null)descriptor(r.lock.descriptor);for(const b of r.blocked)descriptor(b.descriptor);
 }
 let changed=true;while(changed){changed=false;for(let n=0;n<index.records.length;n++){if(selected.has(n))continue;const f=index.records[n].request.value;
  if(!levels.has(f.levelSha256)&&!designs.has(f.designSha256)&&!physicals.has(physical(f)))continue;
  selected.add(n);add(f);changed=true;
 }}
 const matchedRecords=[...selected].sort((a,b)=>a-b).map(n=>{const r=index.records[n];
  assert(r.result!==null&&r.lock===null,'Source has a pending attempt or lock');assert.equal(r.result.value.accepted,true,'Source has a failed attempt');
  assert.equal(r.blocked.length,0,'Source has a blocked identity');assert(!r.legacyPrivateResultFailure,'Source has a legacy private failure');
  indexFile(index,r.request.descriptor);indexFile(index,r.result.descriptor);
  return{recordIndex:n,namespace:r.namespace,kind:r.kind,attemptId:r.request.value.id,request:r.request.descriptor,result:r.result.descriptor,accepted:true,blocked:[],lock:null};
 });
 return{status:'NO_FAILED_PENDING_OR_BLOCKED_SOURCE_HISTORY',scope:'Complete compact source worlds and transitive level/design/physical aliases across all namespaces',
  historyHeadSha256:index.headSha256,sourceLevelId,sourceWorlds:structuredClone(sourceWorlds),matchedRecords,
  matchedRecordCount:matchedRecords.length,publicMathematicalCount:matchedRecords.filter(r=>r.namespace===index.publicNamespace&&r.kind==='mathematical').length,
  failedCount:0,pendingCount:0,blockedCount:0,failedParent:null,redesignOfOmitted:true,acceptedIdentityRevalidationAllowed:false};
}
const anchor=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const gateKey=gs=>JSON.stringify(gs.map(g=>({side:g.side,offset:g.offset,size:g.size,color:g.color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
function assertNotRetired(index,level,reference){
 const f=sealedWorldIdentity(level),anchors=new Set(level.blocks.map(anchor)),gates=gateKey([...(level.gates??[]),...(level.flipDoors??[])]);
 for(const r of index.retired){assert(['design','skeleton','reference-family'].includes(r.kind),'Unknown retired classifier');
  if(r.kind==='design')assert.notEqual(r.designSha256,f.designSha256,'Retired design');
  if(r.kind==='skeleton')assert(!(gateKey(r.gates)===gates&&r.anchors.every(b=>anchors.has(anchor(b)))),'Retired visible skeleton');
  if(r.kind==='reference-family')assert(!r.references.some(d=>canonical(index)(d.path)===canonical(index)(reference.path)&&d.sha256===reference.sha256),'Retired reference family');
 }
}
export function assertCompactShellFirstSourceFreshV198(index,candidate,reference,referenceReceipt){
 const history=assertCompactShellFirstSourceHistoryV198(index,candidate.sourceLevelId);indexFile(index,reference);
 assert.equal(candidate.level.id,candidate.sourceLevelId);assert.equal(candidate.levelSha256,levelSha256(candidate.level));
 assert.equal(referenceReceipt.sourceLevelId??referenceReceipt.level?.id,candidate.sourceLevelId);assert.equal(referenceReceipt.accepted,true,'Accepted reference required');
 const ref=sealedWorldIdentity(referenceReceipt.level),f=sealedWorldIdentity(candidate.level);
 assert(history.sourceWorlds.some(w=>w.identity.levelSha256===ref.levelSha256),'Reference world absent from authenticated source history');
 assert(history.matchedRecords.some(r=>related(index.records[r.recordIndex].request.value,ref)),'Reference has no accepted historical terminal record');
 assertNotRetired(index,referenceReceipt.level,reference);assertNotRetired(index,candidate.level,reference);
 for(const r of index.records)assert(!related(r.request.value,f),'Existing cross-namespace physical/design identity');
 for(const w of index.worlds){assert(!related(w.identity,f),'Existing full-world physical/design identity');assert(isHash(w.identity.partitionSha256),'Missing original partition');assert.notEqual(w.identity.partitionSha256,f.partitionSha256,'Existing partition');
  if(w.sourceLevelId===candidate.sourceLevelId||w.levelId===candidate.sourceLevelId)assert(changedHistoryShapeAndColour(w.identity,f),'Same source requires changed shape AND true colour');
 }
 assert(changedHistoryShapeAndColour(ref,f),'Reference requires changed shape AND true colour');
 return{parent:null,firstSourceHistory:history,identity:f,freshIdentity:true,mathematicalAcceptance:false};
}
export function authoredShellFirstSourceProvidedMathOptionsV198(){
 return{routeBudget:{...SHELL_PROVIDED_UNUSED_UPPER_BUDGET},lowerBudget:{...SHELL_PROVIDED_LOWER_BUDGET},routeStrategy:'native',searchUpper:128};
}
export function assertCompactShellFirstSourcePreflightV198(p){
 assert.equal(p.version,VERSION);assert.equal(p.newInputs,1);assert.equal(p.newSearches,0);
 assert.equal(p.failedParentId,null,'First-source parent must be explicitly null');assert.equal(p.failedParentReceipt,null,'First-source parent receipt must be explicitly null');
 assert(p.firstSourceHistory&&p.firstSourceHistory.status==='NO_FAILED_PENDING_OR_BLOCKED_SOURCE_HISTORY');
 for(const k of ['redesignOf','allowRevalidation','mechanismBaseReceipt','qualificationOnly','firstInputApproved'])assert(!Object.hasOwn(p,k),'First-source preflight cannot request exception '+k);
 assert.deepEqual(p.mathOptions,authoredShellFirstSourceProvidedMathOptionsV198(),'No changed budget, strategy, parent, accepted-base exception or fallback');return p;
}

/** Metadata only. Recompute the narrow static audit to reject a stale/forged
 * zero-findings report. No collisions, exit legality, completeness, mechanism
 * quality, lower bound or upper bound is certified by this function. */
export function assertCompactShellProvidedCycleAuditV198(input,report,inputDescriptor,auditTool){
 descriptor(inputDescriptor);descriptor(auditTool);assertSealedShellProvidedRouteV198(input);
 descriptor(report.sourceFile);descriptor(report.auditTool);
 assert(samePath(report.sourceFile.path,inputDescriptor.path),'Closed-gesture audit input path');assert.equal(report.sourceFile.sha256,inputDescriptor.sha256);
 assert(samePath(report.auditTool.path,auditTool.path),'Closed-gesture audit tool path');assert.equal(report.auditTool.sha256,auditTool.sha256);
 const {auditTool:ignored,...saved}=report;
 const actual=auditProvidedRouteCyclesV198(input,{sourceFile:report.sourceFile});assert.deepEqual(saved,actual,'Exact static closed-gesture audit required');
 assert.equal(actual.status,'STATIC_NO_CLOSED_GESTURES_FOUND','Closed or malformed supplied gestures cannot be consumed');
 assert.equal(actual.avoidableParkingDrags,0);assert.deepEqual(actual.findings,[]);assert.equal(actual.domain.supported,true);
 return{routeSha256:input.routeSha256,closedNonClearingGestures:0,completeRouteValidated:false,mathematicalAcceptance:false};
}

export function assertCompactShellProvidedSelectionV198(q,source,representatives,formal){
 assert.equal(q.stageKey,'mechanisms-multilayer-shell-15');assert([1,2,3].includes(q.difficulty));assert(Number.isInteger(q.slot)&&q.slot>=1&&q.slot<=10);
 assert.equal(q.formalId,`daily-mechanisms-multilayer-shell-15-d${q.difficulty}-${String(q.slot).padStart(2,'0')}`);
 assert.equal(q.newestMechanism,'multilayer-shell');assert.equal(q.unlockLevel,15);assert.equal(q.level.id,q.sourceLevelId);
 assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.sourceLevelSha256,levelSha256(source));
 assert.equal(q.accepted,false);assert.equal(q.formalReady,false);assert(q.level.blocks.some(b=>b.layers?.length>1));
 assertSealedShellProvidedRouteV198(q);
 for(const k of ['timeSchedule','L','U','proof','lowerBound','route'])assert(q[k]===undefined||q[k]===null,'Input must not carry borrowed mathematics');
 assert(Array.isArray(representatives)&&representatives.length>0,'Complete nonempty retained pool required');assert(Array.isArray(formal)&&formal.length>0,'Current nonempty formal registry required');
 assert(!formal.some(r=>r.formalId===q.formalId||levelSha256(r.level)===q.levelSha256),'Formal slot/layout already occupied');
 const sourceSimilarity=compareLayouts(q.level,source);assert(sourceSimilarity.footprintSimilarity<=.55+1e-12,'Source layout similarity');
 const comparisons=[...representatives,...formal].map(r=>{const comparison=compareLayouts(q.level,r.level),maximum=r.stageKey===q.stageKey&&r.difficulty===q.difficulty ? .65 : .75;
  assert(comparison.footprintSimilarity<=maximum+1e-12,'Retained/formal near layout '+r.formalId);return{formalId:r.formalId,maximum,...comparison};});
 return{sourceSimilarity,comparisons,historicalNearestDiagnosticOmitted:true};
}

async function selectionEvidence(p,input,rt,root){
 const cycleTool={path:path.resolve(root,CYCLE),sha256:sha(await fs.readFile(CYCLE))};
 const cycleAudit=await bound(p.closedGestureAudit);
 const cycle=assertCompactShellProvidedCycleAuditV198(input,cycleAudit,{...p.input,path:path.resolve(root,p.input.path)},cycleTool);
 const s=await bound(p.staticPreflight);assert(['AUTHORED_INPUT_STATIC_PASS','AUTHORED_INPUT_STATIC_PASS_HISTORY_AND_MATH_PENDING'].includes(s.status));
 assert.deepEqual(s.input,p.input);assert.equal(s.levelSha256,input.levelSha256);assert.deepEqual(s.errors,[]);
 for(const[f,h]of Object.entries(s.fileBindings)){const file=path.isAbsolute(f)?f:path.resolve(root,f);assert.equal(sha(await fs.readFile(file)),h,file);}
 const independent=await bound(p.staticIndependentReview);assert(['STATIC_INPUT_INDEPENDENT_PASS_HISTORY_AND_MATH_PENDING','INDEPENDENT_STATIC_REVIEW_PASS'].includes(independent.status));assert.deepEqual(independent.input,p.input);assert.equal(independent.levelSha256,input.levelSha256);assert.deepEqual(independent.errors,[]);
 if(independent.status==='INDEPENDENT_STATIC_REVIEW_PASS'){assert.equal(independent.activeRuleVersion,'1.198.0');assert.equal(independent.rulesLock.passed,true);assert.equal(independent.rulesLock.activeVersion,'1.198.0');assert.equal(independent.checks.nativeArt.passed,true);for(const k of ['missing','overlap','outside'])assert.deepEqual(independent.checks.coverage[k],[]);}
 for(const[f,h]of Object.entries(independent.fileBindings??{})){const file=path.isAbsolute(f)?f:path.resolve(root,f);assert.equal(sha(await fs.readFile(file)),h,file);}
 const render=await bound(p.staticVisualEvidence),visual=await bound(p.rootVisualReview);
 assert.equal(render.status,'STATIC_AUTHORED_SHELL_OPENING_RENDERED');assert.deepEqual(render.input,p.input);assert.deepEqual(render.staticPreflight,p.staticPreflight);assert.deepEqual(render.errors,[]);
 assert.equal(render.levelSha256,input.levelSha256);assert.equal(render.renderedLevelSha256,input.levelSha256);assert.equal(render.actuallyRendered,true);assert.equal(render.method,'static-q0-native-sprite-composite');
 assert.deepEqual(render.missingWholeBlockIds,[]);assert.deepEqual(render.storageViolations,[]);assert.equal(render.playerSaveTouched,false);
 for(const[f,h]of Object.entries(render.sourceBindings)){const file=path.isAbsolute(f)?f:path.resolve(root,f);assert.equal(sha(await fs.readFile(file)),h,file);}
 assert.equal(visual.status,'ROOT_ACTUAL_STATIC_VISUAL_REVIEW_PASS');assert.deepEqual(visual.input,p.input);assert.deepEqual(visual.renderEvidence,p.staticVisualEvidence);assert.deepEqual(visual.staticPreflight,p.staticPreflight);
 assert.equal(visual.levelSha256,input.levelSha256);assert.equal(visual.image.actuallyViewed,true);assert.equal(visual.image.method,'view_image');assert.equal(path.resolve(render.image.path).toLowerCase(),path.resolve(visual.image.path).toLowerCase());assert.equal(render.image.sha256,visual.image.sha256);
 assert.equal(sha(await fs.readFile(render.image.path)),render.image.sha256);
 const source=await bound(p.sourceReference);assert.equal(source.sourceLevelId??source.level.id,input.sourceLevelId);assert.deepEqual(input.designBase,p.sourceReference);
 const pool=await bound(p.designPool);assert.equal(pool.status,'ROOT_RETAINED_DAILY_DESIGN_POOL');assert.equal(pool.allRetainedRepresentativesEnumerated,true);assert.deepEqual(pool.errors,[]);assert.deepEqual(pool.formalRegistry,p.formalRegistry);
 assert(Array.isArray(pool.rows)&&pool.rows.length>0);const representatives=[];for(const row of pool.rows){const old=await bound(row.candidate),decision=await bound(row.disposition);assert.equal(old.formalId,row.formalId);assert(!representatives.some(r=>r.formalId===old.formalId));
  const matches=d=>d.formalId===old.formalId&&d.levelSha256===levelSha256(old.level);
  assert([...(decision.decisions??[]),...(decision.designAccepted??[])].some(d=>matches(d)&&[d.candidate,d.receipt].some(x=>x?.sha256===row.candidate.sha256)&&d.status==='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION'));
  assert(!(decision.decisions??[]).some(d=>matches(d)&&d.status!=='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION'));representatives.push(old);
 }
 assert.equal(path.resolve(p.formalRegistry.path).toLowerCase(),path.resolve(root,'src/core/formalDailyChallenge300Data.ts').toLowerCase());assert.equal(sha(await fs.readFile(p.formalRegistry.path)),p.formalRegistry.sha256);
 const {build}=await import('esbuild'),built=await build({entryPoints:[p.formalRegistry.path],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 const formal=(await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))).FORMAL_DAILY_300_ENTRIES;
 const selection=assertCompactShellProvidedSelectionV198(input,rt.LEVELS.find(x=>x.id===input.sourceLevelId),representatives,formal);
 // Inputs formed outside the sealed mathematical/construction ledgers remain
 // in the root's complete byte-bound list; they are never silently discarded.
 const unsealed=await bound(p.unsealedHistory);assert.equal(unsealed.status,'ROOT_UNSEALED_HISTORY_STOCKS_REVIEWED');assert.equal(unsealed.complete,true);assert.deepEqual(unsealed.currentInput,p.input);assert.deepEqual(unsealed.historyReport,p.historyReport);assert.deepEqual(unsealed.errors,[]);
 const f=sealedWorldIdentity(input.level);for(const d of unsealed.stocks){const old=await bound(d),v=sealedWorldIdentity(old.level);assert(!related(v,f));assert.notEqual(v.partitionSha256,f.partitionSha256);if((old.sourceLevelId??old.level.id)===input.sourceLevelId)assert(changedHistoryShapeAndColour(v,f));}
 return{...selection,closedGestureAudit:p.closedGestureAudit,cycle};
}

/** Math execution accepts an independently reviewed, byte-bound metadata
 * preflight. The preflight writer is separate from execution and cannot call
 * this function by passing an in-memory assertion or changing a budget.
 * It includes CURRENT source/registry/retained-pool/static/visual bindings.
 * This module deliberately has no CLI or auto-execution on import. */
export async function executeCompactShellFirstSourceProvidedMathV198({preflight,review,outputDirectory}){
 const p=await bound(preflight),r=await bound(review);
 assert.equal(r.status,'INDEPENDENT_COMPACT_SHELL_FIRST_SOURCE_PROVIDED_EXECUTION_PREFLIGHT_PASS');assert.deepEqual(r.preflight,preflight);assert.deepEqual(r.errors,[]);
 assert.equal(r.executionAllowed,true);assertCompactShellFirstSourcePreflightV198(p);
 assert.equal(path.resolve(outputDirectory),path.resolve(p.outputDirectory),'Exact preflight output directory required');
 assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');
 assert.equal(r.toolBindings[SELF],sha(await fs.readFile(fileURLToPath(import.meta.url))));
 const {qualifyBoundedCandidateV198}=await import('./bounded-qualify-v198.mjs');
 const {loadV4CatalogRuntime}=await import('./catalog-contract.mjs');
 const {prefixExecutionEnvironment,observeExecutionPolicy,currentMainlineSourceBinding}=await import('./prefix-execution-environment-task.mjs');
 const {claimLatePrefixPlan,finishLatePrefixPlan}=await import('./late-prefix-plan-ledger.mjs');
 const {build}=await import('esbuild');
 const control=await build({entryPoints:[SELF],outdir:'.codex-temp/compact-shell-first-source-provided-never-written',bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 for(const file of Object.keys(control.metafile.inputs))assert.equal(r.toolBindings[file],sha(await fs.readFile(file)),'Missing or changed reviewed dependency '+file);
 const input=await bound(p.input),index=await bound(p.index);
 const indexReview=await bound(p.indexReview);assert.equal(indexReview.status,'INDEPENDENT_COMPACT_SHELL_HISTORY_INDEX_PASS');assert.deepEqual(indexReview.index,p.index);assert.deepEqual(indexReview.errors,[]);assert.equal(indexReview.historyHeadSha256,index.headSha256);assert.deepEqual(index.historyReport,p.historyReport);
 assert.equal(index.headSha256,p.historyHeadSha256);const firstSourceHistory=assertCompactShellFirstSourceHistoryV198(index,input.sourceLevelId);assert.deepEqual(p.firstSourceHistory,firstSourceHistory);
 assert(!index.closedExperimentIds.includes(p.experimentId));
 for(const[file,h]of Object.entries({...r.toolBindings,...p.bindings}))assert.equal(sha(await fs.readFile(file)),h,file);
 await assertCompactHistoryMembersV198(index);
 process.env.DAILY_EXECUTION_POLICY_REVIEW=JSON.stringify(p.executionPolicy);
 const rt=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(rt);observeExecutionPolicy(environment,{scopeReview:p.executionPolicy});
 const sourceBinding=await currentMainlineSourceBinding(rt,environment,input.sourceLevelId);assert.equal(sourceBinding.sourceLevelSha256,input.sourceLevelSha256);
 for(const[file,h]of Object.entries(sourceBinding.bindings))assert.equal(sha(await fs.readFile(file)),h,file);
 const selection=await selectionEvidence(p,input,rt,environment.sourceWorkspace);
 const referenceReceipt=await bound(p.sourceReference),fresh=assertCompactShellFirstSourceFreshV198(index,input,p.sourceReference,referenceReceipt);
 assert.deepEqual(fresh.firstSourceHistory,firstSourceHistory);
 // Re-read the directly relied-on accepted source/alias terminal bytes. These
 // are reference/absence facts only; no old theorem or route is transferred.
 const firstSourceTerminalBindings={};
 for(const row of firstSourceHistory.matchedRecords){const record=index.records[row.recordIndex];for(const item of [record.request,record.result]){const actual=await bound(item.descriptor);firstSourceTerminalBindings[item.descriptor.path]=item.descriptor.sha256;for(const[k,v]of Object.entries(item.value))assert.deepEqual(actual[k],v);}}
 const providedRouteSha256=assertSealedShellProvidedRouteV198(input);
 const options=authoredShellFirstSourceProvidedMathOptionsV198();assert.deepEqual(p.mathOptions,options);
 await fs.mkdir(outputDirectory); // Exclusive once latch; no restart on failure.
 const start=await writeOnce(path.join(outputDirectory,'execution-start.json'),{version:VERSION,preflight,review,input:p.input,index:p.index,providedRouteSha256,firstSourceHistory,selection,startedAt:new Date().toISOString(),restartAllowed:false,formalReady:false});
 const claim=await claimLatePrefixPlan(preflight,outputDirectory);
 let result=null,entered=false,returned=false,error=null;
 try{entered=true;result=await qualifyBoundedCandidateV198(rt,input,options);returned=true;}catch(e){error=e.stack??String(e);}
 const receipt=await writeOnce(path.join(outputDirectory,'candidate.json'),result??{status:'INTERRUPTED_UNKNOWN_ATTEMPT',accepted:false,formalReady:false,level:input.level,levelSha256:input.levelSha256,error});
 let accounting;try{accounting=accountShellProvidedSearchReceiptV198(result,{entered,returned,failedParentId:p.failedParentId,providedRouteSha256});}catch(e){error??=e.stack??String(e);accounting={status:'UNKNOWN_ACCOUNTING',upper:null,lower:null,combinedFullWorldsMaximum:10000};}
 try{for(const[file,h]of Object.entries({...r.toolBindings,...p.bindings,...sourceBinding.bindings,...firstSourceTerminalBindings}))assert.equal(sha(await fs.readFile(file)),h,file);await bound(p.input);await bound(p.closedGestureAudit);await bound(preflight);await bound(review);observeExecutionPolicy(environment,{scopeReview:p.executionPolicy});}catch(e){error??=e.stack??String(e);}
 await finishLatePrefixPlan(claim,{status:error?'COMPACT_SHELL_FIRST_SOURCE_PROVIDED_INTERRUPTED':'COMPACT_SHELL_FIRST_SOURCE_PROVIDED_CONSTRUCTION_CLOSED',experimentId:p.experimentId,closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1,formedWorldFiles:[p.input],receipts:[receipt],mathematicalAcceptance:false});
 const completion=await writeOnce(path.join(outputDirectory,'completion.json'),{version:VERSION,start,preflight,review,receipt,entered,returned,error,accounting,providedRouteSha256,failedParentId:null,firstSourceHistory,
  originalResultPreserved:true,restartAllowed:false,formalReady:false,registryWrites:0,indexUpdateRequired:true,
  // Any new public ledger record makes old index fail membership immediately.
  nextExecutionBlockedUntilReviewedIndexRefresh:true});
 const rootFor=file=>index.scope.roots.find(root=>canonical(index)(file).startsWith(canonical(index)(root.physicalPath)+'/'))?.id??null;
 const paths=[claim.claimFile,claim.resultFile,start.path,receipt.path,completion.path,p.input.path,preflight.path,review.path,p.closedGestureAudit.path],record=result?.attempt?{kind:'mathematical',namespace:index.publicNamespace,request:null,result:null,blocked:[],lock:null,legacyPrivateResultFailure:false}:null;
 if(record){const a=result.attempt,base=path.join(index.publicNamespace,a.id),idbase=path.join(index.publicNamespace,'identities',a.retryIdentitySha256);
  for(const[k,f]of [['request',base+'.request.json'],['result',base+'.result.json']]){const raw=await fs.readFile(f);record[k]={descriptor:{path:f,sha256:sha(raw)},value:JSON.parse(raw)};paths.push(f);}
  assert.deepEqual(record.request.value,a);assert.equal(record.result.value.accepted,result.accepted);assert.equal(record.result.value.status,result.status);
  assert.equal(record.request.value.redesignOf,null);assert(!record.request.value.revalidates&&!record.request.value.lockFile,'First source cannot revalidate an existing identity');
  paths.push(base+'.v4-plan.json',idbase+'.json');
  if(!result.accepted)for(const f of [path.join(index.publicNamespace,a.identityOrigin+'.blocked.json'),idbase+'.blocked.json']){const raw=await fs.readFile(f);record.blocked.push({descriptor:{path:f,sha256:sha(raw)},value:JSON.parse(raw)});paths.push(f);}
 }
 const files=[];for(const file of [...new Set(paths)])files.push({path:file,sha256:sha(await fs.readFile(file)),rootId:rootFor(file)});
 const successor=appendCompactShellResultV198(index,{input,sourceReference:p.sourceReference,result,files,completion,experimentId:p.experimentId});
 if(record){record.result.value={accepted:record.result.value.accepted,status:record.result.value.status,levelSha256:record.result.value.levelSha256};successor.records.push(record);}
 successor.parentCompactIndex=p.index;await assertCompactHistoryMembersV198(successor);
 const successorIndex=await writeOnce(path.join(outputDirectory,'successor-index.json'),successor);
 return{receipt,completion,successorIndex,status:result?.status??null,L:result?.L??null,U:result?.U??null,accepted:!error&&result?.accepted===true,formalReady:false};
}

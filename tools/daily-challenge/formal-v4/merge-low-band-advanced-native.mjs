import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {LOW_BAND_SEED147,LOW_BAND_TWO_PROPOSAL,assertLowBandAdvancedAppend} from './low-band-advanced-context.mjs';
import {NATIVE_BASIC_DRAFT_INPUTS,NATIVE_BASIC_SLOT,assertNativeBasicOriginalEvidence,assertCompleteBasicDraftPool} from './prepare-native-basic-admission.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
import {auditD2KeyRoute} from './d2-key-route-construction.mjs';
import {auditCapacityIntensity} from '../formal-v3/capacity-intensity-policy.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';

// This module never calls a constructor, search, attempt claim or ledger write.
// It retains all old receipt paths and bytes, and writes one new basic receipt.
const own='tools/daily-challenge/formal-v4/merge-low-band-advanced-native.mjs';
const root='deliverables/daily-formal-v4-20261008/';
const batch=root+'selection/low-band-two-advanced-01/';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const NATIVE_MERGE_INPUTS=Object.freeze({
 draftReport:{path:root+'proof/native-basic-admission-draft-01/report.json',sha256:'421e22cbc99a6cdae17967508d7a8aa7b3dbed102b8829fd1cfa105be33604d3'},
 draft:{path:root+'proof/native-basic-admission-draft-01/draft.json',sha256:'73cad673b647485c75cb271b4ea9ae54a4b8efb47c5ce5939eadd4fd1b24f94f'},
 independentDraft:{path:root+'proof/native-basic-admission-catalog-independent-01/report.json',sha256:'533255e44174b6b38afcc9de6756cfa9fd8052968b9a16e5fe604a5b48c1ec77'},
});

/** Metadata predicate only. File-byte, public evidence and fresh replay checks
 * below are also mandatory; passing this function never grants admission. */
export function assertFixedAdvancedMergeBatch({seed,proposal,index,completion,audit,receipts}){
 assert.equal(seed.files.length,147);assert.equal(seed.scope,300);
 assert.equal(proposal.rows.length,2);assert.equal(proposal.maximumNewBaseAdaptations,2);
 assert.deepEqual(proposal.selection,LOW_BAND_SEED147);
 assert.equal(audit.status,'INDEPENDENT_LOW_BAND_TWO_ADVANCED_ACTUAL_PASS');assert.deepEqual(audit.errors,[]);assert.equal(audit.newSearches,0);
 assert.equal(audit.completion.path,batch+'completion.json');
 const selection=audit.selection??audit.index;assert.equal(selection.path,batch+'index.json');
 if(audit.selection&&audit.index)assert.deepEqual(audit.selection,audit.index);
 assert.equal(completion.status,'FINITE_TWO_LOW_BAND_ADVANCED_PLAN_FINISHED');assert.deepEqual(completion.inputPlan,LOW_BAND_TWO_PROPOSAL);
 assert.equal(completion.outcomes.length,2);assert.equal(audit.results.length,2);assert.equal(receipts.length,2);
 assert.equal(index.scope,300);assert.deepEqual(index.inputSelection,LOW_BAND_SEED147);assert.deepEqual(index.inputPlan,LOW_BAND_TWO_PROPOSAL);
 assert.equal(index.priorIndex,LOW_BAND_SEED147.path);assert.deepEqual(index.files.slice(0,147),seed.files);
 const accepted=[];
 for(let i=0;i<2;i++){
  const row=proposal.rows[i],q=receipts[i],outcome=completion.outcomes[i];
  const file=batch+String(i+1).padStart(2,'0')+'-'+row.slot.formalId+'.json';
  assert.equal(outcome.file,file);assert.equal(outcome.formalId,row.slot.formalId);
  const result=audit.results.find(r=>r.file===file);assert(result,'Every outcome needs independent evidence');
  assert.equal(result.sha256,outcome.sha256);assert.equal(new Set(audit.results.map(r=>r.file)).size,2);
  for(const k of ['accepted','L','U']){assert.deepEqual(result[k],q[k]);assert.deepEqual(outcome[k],q[k]);}
  assert.equal(outcome.status,q.status);assert.equal(q.sourceLevelId,row.sourceLevelId);
  assert.deepEqual(Object.fromEntries(Object.keys(row.slot).map(k=>[k,q[k]])),row.slot);
  assert.equal(q.baseReceipt.path,row.base.path);assert.equal(q.baseReceipt.sha256,row.base.sha256);
  assert.equal(q.formalReady,false);assert.equal(q.productionChanged,false);assert.equal(q.qualificationOnly,false);
  if(q.accepted){assert.equal(q.catalogEligible,true);accepted.push(file);}
  else assert.equal(q.catalogEligible,false,'Rejected row cannot be admitted');
 }
 assert.deepEqual(index.files,[...seed.files,...accepted],'Only accepted fixed rows may extend exact147');
 assert.equal(index.candidateCount,147+accepted.length);assert.equal(completion.accepted,accepted.length);
 assert.equal(completion.combinedCandidates,index.files.length);assert.equal(index.formalReady,false);assert.equal(completion.formalReady,false);
 assert.equal(new Set(index.files).size,index.files.length);
 return accepted;
}

export function assertNativeDraftUnchanged(draft,math){
 assert.equal(draft.admissionVersion,'native-basic-d3-10-draft-v1');
 assert.equal(draft.status,'NATIVE_BASIC_DRAFT_READY_FOR_EXPLICIT_MERGE');
 assert.equal(draft.accepted,false);assert.equal(draft.catalogEligible,false);assert.equal(draft.admissionReady,true);
 assert.equal(draft.newSearches,0);assert.equal(draft.newLedgerClaims,0);
 assert.deepEqual(Object.fromEntries(Object.keys(NATIVE_BASIC_SLOT).map(k=>[k,draft[k]])),NATIVE_BASIC_SLOT);
 assert.deepEqual(draft.mathematicalProof,NATIVE_BASIC_DRAFT_INPUTS.math);
 assert.deepEqual(draft.independentMathematicalAudit,NATIVE_BASIC_DRAFT_INPUTS.mathAudit);
 assert.deepEqual(draft.inputSelection,LOW_BAND_SEED147);
 for(const k of ['level','drags','attempt','lowerBound','route','upperAccounting'])assert.deepEqual(draft[k],math[k],`Original native ${k}`);
 for(const k of ['levelSha256','routeSha256','L','U','sourceLevelId','toolchainSha256'])assert.equal(draft[k],math[k]);
 for(const k of ['formalReady','pointerValidated','timeValidated','currentRuntimeValidationClaimed','productionChanged'])assert.equal(draft[k],false);
}

export async function mergeLowBandAdvancedNative({advancedAudit,label}){
 assert(/^[a-z0-9-]+$/.test(label??''),'New immutable output label required');
 const output=root+'selection/'+label;assert.equal(await fs.stat(output).then(()=>true,()=>false),false,'Output already exists');
 const bindings={},bytesCache=new Map();
 const bytes=async(p,expected)=>{
  const absolute=path.resolve(p),b=bytesCache.get(absolute)??await fs.readFile(absolute),h=sha(b);
  if(expected)assert.equal(h,expected,`Bound bytes changed: ${p}`);
  if(bindings[absolute])assert.equal(bindings[absolute],h,'Dependency cannot be rebound');
  bindings[absolute]=h;bytesCache.set(absolute,b);return b;
 };
 const read=async p=>JSON.parse(await bytes(p));
 const bound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact descriptor required');return JSON.parse(await bytes(d.path,d.sha256));};
 const check=async map=>{assert(map&&typeof map==='object');for(const [p,h]of Object.entries(map))await bytes(p,h);};
 const checkFinal=async()=>{for(const [p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,`Input changed during merge: ${p}`);};
 const publicCount=async()=> (await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).length;
 const publicBefore=await publicCount();
 const audit=await bound(advancedAudit),completion=await bound(audit.completion),selection=audit.selection??audit.index,index=await bound(selection);
 const seed=await bound(LOW_BAND_SEED147),proposal=await bound(LOW_BAND_TWO_PROPOSAL);
 await check(audit.fileBindings);
 const receipts=[];for(const r of completion.outcomes)receipts.push(await bound({path:r.file,sha256:r.sha256}));
 const advancedFiles=assertFixedAdvancedMergeBatch({seed,proposal,index,completion,audit,receipts});
 const draftReport=await bound(NATIVE_MERGE_INPUTS.draftReport),draft=await bound(NATIVE_MERGE_INPUTS.draft),independentDraft=await bound(NATIVE_MERGE_INPUTS.independentDraft);
 assert.equal(draftReport.status,'NATIVE_BASIC_ADMISSION_DRAFT_PASS');assert.deepEqual(draftReport.errors,[]);assert.deepEqual(draftReport.draft,NATIVE_MERGE_INPUTS.draft);
 assert.equal(independentDraft.status,'INDEPENDENT_NATIVE_BASIC_DRAFT_PASS');assert.deepEqual(independentDraft.errors,[]);
 assert.deepEqual(independentDraft.sourceReport,NATIVE_MERGE_INPUTS.draftReport);assert.deepEqual(independentDraft.sourceDraft,NATIVE_MERGE_INPUTS.draft);
 assert.equal(independentDraft.newSearches,0);assert.equal(independentDraft.newLedgerClaims,0);
 await check(draftReport.fileBindings);await check(independentDraft.fileBindings);
 const proof=await bound(NATIVE_BASIC_DRAFT_INPUTS.math),nativeAudit=await bound(NATIVE_BASIC_DRAFT_INPUTS.mathAudit);
 assertNativeDraftUnchanged(draft,proof);assert.deepEqual(nativeAudit.errors,[]);assert.equal(nativeAudit.newSearches,0);await check(nativeAudit.fileBindings);
 assert(nativeAudit.results.some(r=>r.file===NATIVE_BASIC_DRAFT_INPUTS.math.path&&r.sha256===NATIVE_BASIC_DRAFT_INPUTS.math.sha256&&r.accepted&&r.L===proof.L&&r.U===proof.U));
 const input=await bound(proof.input),saved=await read(proof.evidenceFile),planEvidence=await bound(proof.planEvidence);
 const stem=PUBLIC_ATTEMPT_LEDGER+'/'+proof.attempt.id,request=await read(stem+'.request.json'),result=await read(stem+'.result.json');
 const parentStem=PUBLIC_ATTEMPT_LEDGER+'/'+request.redesignOf,parent=await read(parentStem+'.request.json'),parentResult=await read(parentStem+'.result.json');
 const nativeFacts=assertNativeBasicOriginalEvidence({proof,input,request,result,saved,planEvidence,parent,parentResult,slot:NATIVE_BASIC_SLOT});
 assert.equal(path.resolve(proof.planEvidence.path),path.resolve(stem+'.v4-native-prefix-tail-plan.json'));
 assert.equal(path.resolve(proof.evidenceFile),path.resolve(stem+'.v4-native-prefix-tail-result.json'));
 const assertUnblocked=async(req)=>{
  for(const p of [PUBLIC_ATTEMPT_LEDGER+'/'+req.id+'.blocked.json',PUBLIC_ATTEMPT_LEDGER+'/identities/'+req.retryIdentitySha256+'.blocked.json'])
   assert.equal(await fs.stat(p).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}),false,'Accepted actual identity is blocked');
 };
 await assertUnblocked(request);
 const runtime=await loadV4CatalogRuntime();await check(runtime.toolchainBindings);await check(runtime.designBindings);
 const old=[];for(const p of seed.files){const q=await read(p);assert(q.accepted&&!q.qualificationOnly);assert.equal(levelSha256(q.level),q.levelSha256);old.push(q);}
 assertCompleteBasicDraftPool(old,NATIVE_BASIC_SLOT,runtime.slots);
 const records=[...old],freshReplays=[],freshStrength=[];
 const entry='tools/daily-challenge/formal-v4/qualify-low-band-advanced-slot.mjs',entrySha=sha(await bytes(entry));
 for(let i=0;i<2;i++){
  const q=receipts[i];if(!q.accepted)continue;
  assertLowBandAdvancedAppend(q,proposal.rows[i],entrySha);
  assert.equal(path.resolve(q.entryResultFile),path.resolve(q.construction.resultFile).replace(/\.construction-result\.json$/,'.slot-result.json'),'Entry and constructor must share identity');
  assert.deepEqual(await bytes(q.entryResultFile),await bytes(completion.outcomes[i].file),'Original entry receipt bytes must be retained');
  const math=q.mathematicalProof;
  assert.deepEqual(q.toolchainBindings,runtime.toolchainBindings);assert.deepEqual(math.toolchainBindings,runtime.toolchainBindings);
  for(const k of ['level','drags','attempt','lowerBound','route'])assert.deepEqual(q[k],math[k]);
  for(const k of ['L','U','levelSha256','routeSha256','formalId','stageKey','difficulty','sourceLevelId'])assert.equal(q[k],math[k]);
  assert.equal(q.L,21);assert(Number.isSafeInteger(q.U)&&q.U>=21&&q.U<=30);
  const req=await read(PUBLIC_ATTEMPT_LEDGER+'/'+math.attempt.id+'.request.json'),res=await read(PUBLIC_ATTEMPT_LEDGER+'/'+math.attempt.id+'.result.json');
  assert.deepEqual(req,math.attempt);assert(res.accepted);assert.equal(res.levelSha256,q.levelSha256);assert.equal(res.status,math.status);
  await assertUnblocked(req);
  assert.deepEqual(res.lower,math.lowerBound.result);assert.equal(res.upper,null);assert.equal(math.route.search,null);
  assert.equal(math.lowerBound.inputLevelSha256,q.levelSha256);assert.equal(math.lowerBound.requiredFloor,21);
  const lower=math.lowerBound.result;assert.equal(lower.status,'threshold-proven');assert.equal(lower.thresholdProven,true);assert.equal(lower.floor,21);
  assert.equal(lower.termination,'below-threshold-exhausted');assert.deepEqual(inspectSearchAccounting(lower,'final-original-lower'),[]);
  assert.deepEqual(lower.guardAllowance,guardAllowanceFor(lower));assert(lower.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
  const construction=await bound(q.constructionSidecar),constructionPlan=await bound(q.constructionPlan);
  assert.deepEqual(construction,q.construction);assert.equal(levelSha256(constructionPlan),q.constructionPlan.canonicalSha256);
  assert(construction.ok&&construction.accepted&&!construction.mathematicalAcceptance);assert.deepEqual(construction.level,q.level);assert.deepEqual(construction.drags,q.drags);
  assert.deepEqual(inspectConstructionAccounting(construction.constructionAccounting),[]);
  const prior=await bound(q.priorBaseline);assert.equal(levelSha256(prior.level),q.priorBaseline.levelSha256);
  const strength=q.newestMechanism==='generator'?auditCapacityIntensity(runtime,q.level,q.drags,'generator',2,mechanismInventory(prior.level)):
   auditD2KeyRoute(runtime,q.level,q.drags,q,prior.level,{configuration:q.configuration,worldBudget:{maxStates:10000}});
  assert(strength.passed,JSON.stringify(strength.issues));freshStrength.push({formalId:q.formalId,audit:strength});
  await check(q.designBindings);await check(q.designInputBindings);await check(q.assetBindings);
  for(const d of [q.baseReceipt,q.baseReceipt.request,q.baseReceipt.result])await bound(d);
  records.push(q);
 }
 assert.deepEqual(records.map(q=>q.formalId),[...old.map(q=>q.formalId),...receipts.filter(q=>q.accepted).map(q=>q.formalId)]);
 const newRows=[...receipts.filter(q=>q.accepted),draft];
 for(const q of newRows){
  assert.deepEqual(q.toolchainBindings,runtime.toolchainBindings);
  for(const k of ['policyRuleVersion','policyRuleSha256','mathRuleVersion','mathRuleSha256','toolchainSha256'])assert.equal(q[k],runtime[k]);
  const environment=prefixExecutionEnvironment(runtime,q.executionEnvironment.descriptor);assert.deepEqual(environment,q.executionEnvironment);
  await check(environment.bindings);const source=await currentMainlineSourceBinding(runtime,environment,q.sourceLevelId);await check(source.bindings);
  assert.equal(boardBaselineSha256(q.level),boardBaselineSha256(runtime.LEVELS.find(l=>l.id===q.sourceLevelId)));
  const canonical=replayDecorated(runtime,q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
  for(const r of [canonical,independent]){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,q.U);assert.equal(r.effectiveDrags,q.drags.length);}
  assert.equal(canonical.clearEvents,independent.clearEvents);assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
  freshReplays.push({formalId:q.formalId,levelSha256:q.levelSha256,routeSha256:q.routeSha256,canonical,independent});
 }
 const candidate={...NATIVE_BASIC_SLOT,sourceLevelId:proof.sourceLevelId,level:proof.level};
 const combined=[...records,candidate],basic=combined.filter(q=>q.stageKey==='basic-combined');
 assert.equal(basic.length,30);for(const d of [1,2,3])assert.equal(basic.filter(q=>q.difficulty===d).length,10);
 assert.equal(new Set(combined.map(q=>q.formalId)).size,combined.length);assert.equal(new Set(combined.map(q=>levelSha256(q.level))).size,combined.length);
 const staticAudits=[];for(const q of [...basic,...receipts.filter(q=>q.accepted)]){
  const checked=await auditV4StaticCandidate(runtime,q);assert(checked.passed,JSON.stringify(checked.issues));await check(checked.policyBindings);
  for(const [p,h]of Object.entries(checked.assetBindings))await bytes(path.resolve('public',p),h);
  staticAudits.push({formalId:q.formalId,levelSha256:levelSha256(q.level),audit:checked});
 }
 const diversity=auditV4Diversity(combined,runtime.slots);assert.deepEqual(diversity.reasons,[]);
 const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))await bytes(p);
 await checkFinal();assert.equal(await publicCount(),publicBefore,'Merge cannot create public mathematical claims');
 const context={schemaVersion:4,status:'READONLY_FIXED_TWO_PLUS_NATIVE_MERGE_CONTEXT',inputSelection:LOW_BAND_SEED147,
  advancedSelection:selection,advancedIndependentAudit:advancedAudit,nativeDraft:NATIVE_MERGE_INPUTS.draft,nativeDraftReport:NATIVE_MERGE_INPUTS.draftReport,
  nativeIndependentReview:NATIVE_MERGE_INPUTS.independentDraft,originalMathematics:NATIVE_BASIC_DRAFT_INPUTS.math,
  acceptedAdvancedFiles:advancedFiles,combinedCandidates:combined.length,basicGroups:[1,2,3].map(difficulty=>({stageKey:'basic-combined',difficulty,count:10})),
  fileBindings:bindings,toolchainSha256:levelSha256(bindings),newSearches:0,newLedgerClaims:0,currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false};
 const contextFile=output+'/merge-context.json',contextBytes=JSON.stringify(context,null,2)+'\n',contextDescriptor={path:contextFile,sha256:sha(contextBytes)};
 const nativeReplay=freshReplays.find(r=>r.formalId===NATIVE_BASIC_SLOT.formalId);
 const admissionBindings={...bindings,[path.resolve(contextFile)]:contextDescriptor.sha256};
 const nativeReceipt={...draft,admissionVersion:'native-basic-readonly-admission-v1',status:'NATIVE_BASIC_CANDIDATE_ADMITTED_AWAITING_FINAL_POINTER',
  accepted:true,catalogEligible:true,qualificationOnly:false,sourceDraft:NATIVE_MERGE_INPUTS.draft,sourceDraftReport:NATIVE_MERGE_INPUTS.draftReport,
  independentDraftReview:NATIVE_MERGE_INPUTS.independentDraft,originalInputSelection:LOW_BAND_SEED147,inputSelection:selection,inputSelectionAudit:advancedAudit,
  mergeContext:contextDescriptor,freshCanonicalReplay:nativeReplay.canonical,freshIndependentReplay:nativeReplay.independent,
  staticAudit:staticAudits.find(r=>r.formalId===NATIVE_BASIC_SLOT.formalId).audit,basicGroupStaticAudits:staticAudits.filter(r=>r.formalId.startsWith('daily-basic-combined-')),
  completeBasicGroups:{basicCandidates:30,groups:context.basicGroups,actualCombinedCandidates:combined.length},diversity,
  admissionBindings,admissionToolchainSha256:levelSha256(admissionBindings),mergePolicy:'Exact old147 bytes + immutable accepted advanced rows + one same-object native basic admission; no search or claim.',
  newSearches:0,newLedgerClaims:0,currentRuntimeValidationClaimed:false,pointerValidated:false,timeValidated:false,formalReady:false,productionChanged:false};
 // All validation has finished before any new selection artifact is written.
 await fs.mkdir(output,{recursive:false});const write=(p,q)=>fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
 await fs.writeFile(contextFile,contextBytes,{flag:'wx'});const nativeFile=output+'/'+NATIVE_BASIC_SLOT.formalId+'.json';await write(nativeFile,nativeReceipt);
 const nativeDescriptor={path:nativeFile,sha256:sha(await fs.readFile(nativeFile))};
 const finalIndex={schemaVersion:4,scope:300,status:'PARTIAL_CANDIDATES_AWAITING_FINAL_ACCEPTANCE',files:[...index.files,nativeFile],
  priorIndex:selection.path,inputSelection:selection,original147:LOW_BAND_SEED147,advancedIndependentAudit:advancedAudit,
  nativeDraft:NATIVE_MERGE_INPUTS.draft,newAdmission:nativeDescriptor,mergeContext:contextDescriptor,
  candidateCount:combined.length,missing:300-combined.length,formalReady:false,productionChanged:false};
 await write(output+'/index.json',finalIndex);
 const finalSelection={path:output+'/index.json',sha256:sha(await fs.readFile(output+'/index.json'))};
 const report={status:'READONLY_LOW_BAND_ADVANCED_NATIVE_MERGE_COMPLETE',errors:[],selection:finalSelection,newAdmission:nativeDescriptor,
  original147:LOW_BAND_SEED147,advancedSelection:selection,advancedIndependentAudit:advancedAudit,nativeInputs:NATIVE_MERGE_INPUTS,
  mergeContext:contextDescriptor,combinedCandidates:combined.length,advancedAccepted:advancedFiles.length,old147BytePrefixUnchanged:true,
  nativeDraftUnchanged:true,originalMathematicsUnchanged:true,nativeFacts,freshUpperReplays:freshReplays,freshStrength,staticAudits,diversity,
  basicGroups:context.basicGroups,fileBindings:admissionBindings,publicRequests:{before:publicBefore,after:publicBefore},
  newSearches:0,newLedgerClaims:0,newConstructions:0,currentRuntimeValidationClaimed:false,pointerValidated:false,timeValidated:false,formalReady:false,productionChanged:false};
 await write(output+'/audit.json',report);return{selection:finalSelection,report:{path:output+'/audit.json',sha256:sha(await fs.readFile(output+'/audit.json'))},combinedCandidates:combined.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [auditPath,auditSha,label]=process.argv.slice(2);
 console.log(JSON.stringify(await mergeLowBandAdvancedNative({advancedAudit:{path:auditPath,sha256:auditSha},label})));
}

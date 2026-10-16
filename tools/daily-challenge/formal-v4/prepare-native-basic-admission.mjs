import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {describeLayout} from '../formal-v3/diversity.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Deliberately no admit/merge entry point. Only the fixed original receipt may
// become a draft; no search, ledger mutation, production or selection write.
export const NATIVE_BASIC_DRAFT_VERSION='native-basic-d3-10-draft-v1';
const own='tools/daily-challenge/formal-v4/prepare-native-basic-admission.mjs';
const root='deliverables/daily-formal-v4-20261008/';
export const NATIVE_BASIC_DRAFT_INPUTS=Object.freeze({
 selection:{path:root+'selection/gate-aware-basic-147-01/index.json',sha256:'049a2cea87672b4fbf54afdb06ae01d8b3c964af85a0e9447c23b5ec3e1f39dd'},
 selectionAudit:{path:root+'proof/gate-aware147-admission-quick-independent-01.json',sha256:'fe4f13ed2feac737d118df1ee78f3d8b665a6b6e871a58cdca2d69979fef19dc'},
 math:{path:root+'design/native-prefix-three-math-01/candidate-000.json',sha256:'61ed350caab24e2a84f54d72a8b46dfcf58a713846ed44a34e0fac277ca20223'},
 mathAudit:{path:root+'proof/native-prefix-actual-independent-01/report.json',sha256:'6b2ffa1a1486336cf685310d485e45fd578da096a3991a139f0a79245c67329e'},
});
for(const descriptor of Object.values(NATIVE_BASIC_DRAFT_INPUTS))Object.freeze(descriptor);
export const NATIVE_BASIC_SLOT=Object.freeze({formalId:'daily-basic-combined-d3-10',stageKey:'basic-combined',unlockLevel:1,newestMechanism:null,difficulty:3,slot:10});
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=q=>JSON.parse(JSON.stringify(q));
const integer=(v,min,max,label)=>assert(Number.isSafeInteger(v)&&v>=min&&v<=max,label);

export function assertNativeBasicOriginalEvidence({proof:q,input,request,result,saved,planEvidence,parent,parentResult,slot}){
 assert.deepEqual(slot,NATIVE_BASIC_SLOT,'Only basic D3 slot 10 is prepared');
 assert.equal(q.sourceLevelId,18);assert.equal(q.status,'EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU');
 assert.equal(q.accepted,true);assert.equal(q.mathematicalEvidenceValidated,true);
 for(const k of ['qualificationOnly','catalogEligible','formalReady','currentRuntimeValidationClaimed','productionChanged'])assert.equal(q[k],false);
 assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
 assert.equal(q.L,31);integer(q.U,31,Number.MAX_SAFE_INTEGER,'Finite complete original U');assert.equal(q.difficulty,3);
 assert.equal(q.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
 assert.equal(q.plan.levelSha256,q.levelSha256);assert.equal(q.plan.sourceLevelId,q.sourceLevelId);assert.equal(q.plan.floor,31);
 assert.equal(q.plan.innerPlan.tailStrategy,'native');assert.equal(q.plan.nativeTailHasNoParkingCeiling,true);
 assert.equal(q.plan.tailSearchesMaximum,1);assert.equal(q.plan.failedInputContinuationAllowed,false);
 assert.equal(q.plan.alternativePrefixOrFullUpperSearchAllowed,false);
 assert.deepEqual(input.level,q.level);assert.equal(input.levelSha256,q.levelSha256);assert.equal(input.sourceLevelId,q.sourceLevelId);
 assert.equal(input.predeclaredUpperStrategy,'native');assert.equal(input.prefixSha256,routeSha256(input.prefixDrags));
 assert.equal(q.plan.prefixSha256,input.prefixSha256);assert.deepEqual(q.plan.constructionAccounting,input.constructionAccounting);
 assert.deepEqual(planEvidence.plan,q.plan);assert.deepEqual(planEvidence.attempt,q.attempt);assert.deepEqual(planEvidence.prefixDrags,input.prefixDrags);
 assert.deepEqual(planEvidence.bindings,q.designBindings);
 for(const [key,value]of Object.entries(saved))assert.deepEqual(q[key],value,`Original native sidecar: ${key}`);
 assert.deepEqual(request,q.attempt);assert.equal(request.levelSha256,q.levelSha256);
 const fp=designFingerprints(q.level);for(const [k,v]of Object.entries(fp))assert.deepEqual(request[k],v);
 assert.equal(request.retryIdentitySha256,levelSha256({shapeSha256:fp.shapeSha256,colorSha256:fp.colorSha256}));
 assert.equal(request.identityOrigin,request.id);assert(!request.revalidates);
 assert.equal(result.accepted,true);assert.equal(result.status,q.status);assert.equal(result.levelSha256,q.levelSha256);
 assert.deepEqual(result.lower,q.lowerBound.result);assert.equal(result.upper,null);assert.equal(q.route.search,null);
 assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.route.routeSha256,q.routeSha256);
 assert.equal(q.lowerBound.method,'v3-plain');assert.equal(q.lowerBound.requiredFloor,31);assert.equal(q.lowerBound.inputLevelSha256,q.levelSha256);
 const lower=q.lowerBound.result,upper=q.upperConstruction,tail=upper.tailSearch;
 assert.deepEqual(q.proof,lower);assert.equal(lower.sourceLevelSha256,q.levelSha256);
 assert.equal(lower.status,'threshold-proven');assert.equal(lower.termination,'below-threshold-exhausted');
 assert.equal(lower.thresholdProven,true);assert.equal(lower.floor,31);assert.equal(lower.certifiedFloor,31);
 assert.deepEqual(lower.budget,q.plan.lowerBudget);
 for(const [label,search]of [['original-lower',lower],['native-tail',tail]]){
  assert.deepEqual(inspectSearchAccounting(search,label),[]);assert.deepEqual(search.guardAllowance,guardAllowanceFor(search));
  integer(search.budget.maxStates,1,9999,'Registered budget');assert(search.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
 }
 assert(upper.valid&&upper.complete);assert.equal(upper.levelSha256,q.levelSha256);assert.equal(upper.U,q.U);
 assert.equal(upper.lowerBoundClaimed,false);assert.equal(upper.tailSearches,1);assert.deepEqual(upper.plan,q.plan.innerPlan);
 assert.equal(tail.lowerBoundCertified,false);assert.equal(tail.status,'witness');assert.equal(tail.termination,'witness');assert.equal(tail.witnessFound,true);
 assert.equal(upper.tailLevelSha256,levelSha256(upper.tailLevel));assert.equal(tail.sourceLevelSha256,upper.tailLevelSha256);
 assert.notEqual(tail.sourceLevelSha256,q.levelSha256,'Tail proof cannot replace original lower');
 assert.deepEqual(q.drags,[...input.prefixDrags,...tail.drags]);assert.deepEqual(upper.drags,q.drags);
 assert.equal(upper.routeSha256,q.routeSha256);assert.equal(upper.prefixAudits.length,input.prefixDrags.length);
 const construction=q.plan.constructionAccounting,prefixWorlds=input.prefixDrags.length+1;
 integer(construction.completeWorldReservations,1,10000,'Actual construction worlds');
 const shared=construction.completeWorldReservations+prefixWorlds+tail.rawFullBoardStates+1;
 integer(shared,1,10000,'Construction, prefix, tail and terminal guard share one budget');
 assert.deepEqual(q.upperAccounting.prior,construction);assert.equal(q.upperAccounting.knownPrefix,prefixWorlds);
 assert.equal(q.upperAccounting.tailRegistered,tail.rawFullBoardStates);assert.equal(q.upperAccounting.terminalAllowance,1);
 assert.equal(q.upperAccounting.conservativeFullBoardStateUpperBound,shared);assert.equal(q.upperAccounting.maximum,10000);
 assert.equal(tail.budget.maxStates,10000-construction.completeWorldReservations-prefixWorlds-1);
 assert.equal(tail.budget.maxTransitions,10000000-construction.transitions-upper.prefixTransitions);
 assert.equal(tail.budget.maxMicroStates,3000000-construction.microStates);
 assert(construction.elapsedMilliseconds+upper.elapsedMilliseconds<=30000);
 assert.equal(parent.id,request.redesignOf);assert.equal(parentResult.accepted,false);assert.equal(parentResult.levelSha256,parent.levelSha256);
 assert.notEqual(parent.shapeSha256,fp.shapeSha256);assert.notEqual(parent.colorSha256,fp.colorSha256);
 const priorColors=new Map(parent.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),sharedColors=fp.colorAssignments.filter(b=>priorColors.has(b.id));
 if(sharedColors.length)assert(sharedColors.some(b=>priorColors.get(b.id)!==JSON.stringify(b.colors)),'Shared body colour must really change');
 else assert.notEqual(levelSha256(parent.colorAssignments.map(b=>b.colors).sort()),levelSha256(fp.colorAssignments.map(b=>b.colors).sort()),'No shared IDs requires changed full colour inventory');
 assert.equal(input.provenance.allExternalBodiesByteEquivalent,true);assert.equal(input.provenance.newShapeInventory,true);
 assert(input.provenance.region.connected&&input.provenance.region.fraction>=.35);assert.equal(input.provenance.knownPrefixIsNotLowerBound,true);
 return{L:31,U:q.U,upperWorlds:shared,lowerWorlds:lower.guardAllowance.conservativeFullBoardStateUpperBound,shapeSha256:fp.shapeSha256,colorSha256:fp.colorSha256};
}

export function assertCompleteBasicDraftPool(selected,slot,slots){
 assert.deepEqual(slot,NATIVE_BASIC_SLOT);assert.equal(selected.length,147);assert.equal(new Set(selected.map(q=>q.formalId)).size,147);
 assert(!selected.some(q=>q.formalId===slot.formalId),'Target already selected');
 const expected=slots.filter(s=>s.stageKey==='basic-combined'),basic=[...selected.filter(q=>q.stageKey==='basic-combined'),slot];
 assert.equal(expected.length,30);assert.equal(basic.length,30);assert.equal(new Set(basic.map(q=>q.formalId)).size,30);
 for(const s of expected){const q=basic.find(r=>r.formalId===s.formalId);assert(q);for(const k of Object.keys(NATIVE_BASIC_SLOT))assert.equal(q[k],s[k],`Basic slot identity ${s.formalId}/${k}`);}
 for(const difficulty of [1,2,3])assert.equal(basic.filter(q=>q.difficulty===difficulty).length,10);
 return{basicCandidates:30,groups:[1,2,3].map(difficulty=>({stageKey:'basic-combined',difficulty,count:10})),hypotheticalTotal:148,actualSelectionCount:147};
}

export async function prepareNativeBasicAdmission(){
 const bindings={};
 async function bytes(file,expected){const absolute=path.resolve(file),b=await fs.readFile(absolute),h=sha(b);
  if(expected)assert.equal(h,expected,`File changed: ${file}`);if(bindings[absolute])assert.equal(h,bindings[absolute]);bindings[absolute]=h;return b;}
 const read=async(file,expected)=>JSON.parse(await bytes(file,expected));
 const bound=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));return read(d.path,d.sha256);};
 const check=async m=>{assert(m&&typeof m==='object');for(const [p,h]of Object.entries(m))await bytes(p,h);};
 const exists=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
 const {selection,selectionAudit,math,mathAudit}=NATIVE_BASIC_DRAFT_INPUTS;
 const index=await bound(selection),priorAudit=await bound(selectionAudit),q=await bound(math),audit=await bound(mathAudit);
 assert.equal(index.scope,300);assert.equal(index.files.length,147);assert.equal(index.candidateCount,147);
 assert.equal(priorAudit.status,'INDEPENDENT_147_ADMISSION_QUICK_CHECK_PASS');assert.deepEqual(priorAudit.selection,selection);
 assert.deepEqual(priorAudit.errors,[]);assert.equal(priorAudit.newSearches,0);assert.equal(priorAudit.newLedgerClaims,0);await check(priorAudit.inputBindings);
 assert.equal(audit.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(audit.errors,[]);assert.equal(audit.newSearches,0);
 const actual=audit.results.find(r=>r.file===math.path&&r.sha256===math.sha256);assert(actual?.accepted);assert.equal(actual.L,31);assert.equal(actual.U,q.U);
 await check(audit.fileBindings);const completion=await bound(audit.completion);
 assert.equal(completion.status,'FINITE_FIRST_PREFIX_TAIL_BATCH_FINISHED');assert.equal(completion.selectedCandidatesAdded,0);
 assert(completion.results.some(r=>r.file===math.path&&r.sha256===math.sha256&&r.accepted));
 const runtime=await loadV4CatalogRuntime();assert.deepEqual(q.toolchainBindings,runtime.toolchainBindings);await check(runtime.toolchainBindings);
 for(const k of ['policyRuleVersion','policyRuleSha256','mathRuleVersion','mathRuleSha256','toolchainSha256'])assert.equal(q[k],runtime[k]);
 await check(q.designBindings);await check(runtime.designBindings);
 const environment=prefixExecutionEnvironment(runtime,q.executionEnvironment.descriptor);assert.deepEqual(environment,q.executionEnvironment);
 const currentSource=await currentMainlineSourceBinding(runtime,environment,q.sourceLevelId);await check(currentSource.bindings);
 assert.equal(currentSource.sourceLevelSha256,q.plan.sourceLevelSha256);
 assert.equal(boardBaselineSha256(runtime.LEVELS.find(l=>l.id===q.sourceLevelId)),boardBaselineSha256(q.level));
 const input=await bound(q.input),planEvidence=await bound(q.planEvidence),saved=await read(q.evidenceFile);
 const stem=`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}`,request=await read(stem+'.request.json'),result=await read(stem+'.result.json');
 assert.equal(path.resolve(q.planEvidence.path),path.resolve(stem+'.v4-native-prefix-tail-plan.json'));
 assert.equal(path.resolve(q.evidenceFile),path.resolve(stem+'.v4-native-prefix-tail-result.json'));
 const parentStem=`${PUBLIC_ATTEMPT_LEDGER}/${request.redesignOf}`,parent=await read(parentStem+'.request.json'),parentResult=await read(parentStem+'.result.json');
 const evidence=assertNativeBasicOriginalEvidence({proof:q,input,request,result,saved,planEvidence,parent,parentResult,slot:NATIVE_BASIC_SLOT});
 for(const p of [parentStem+'.blocked.json',`${PUBLIC_ATTEMPT_LEDGER}/identities/${parent.retryIdentitySha256}.blocked.json`]){
  const b=await read(p);assert.equal(b.attemptId,parent.id);assert.equal(b.status,parentResult.status);}
 for(const p of [stem+'.blocked.json',`${PUBLIC_ATTEMPT_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`])assert.equal(await exists(p),false,'Accepted exact identity must remain unblocked');
 const identity=await read(`${PUBLIC_ATTEMPT_LEDGER}/identities/${request.retryIdentitySha256}.json`);assert.equal(identity.origin,request.id);
 const names=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')),matches=[];
 for(const name of names){const r=await read(`${PUBLIC_ATTEMPT_LEDGER}/${name}`);if(r.id===request.id||r.shapeSha256===request.shapeSha256&&r.colorSha256===request.colorSha256)matches.push(r.id);}
 assert.deepEqual(matches,[request.id],'Exactly one original physical claim');
 const construction=await bound(q.plan.constructionEvidence);assert.deepEqual(construction.level,q.level);assert.deepEqual(construction.constructionAccounting,q.plan.constructionAccounting);
 const visual=await bound(q.visualReview);assert.equal(visual.status,'ROOT_ALL_NEW_OPENINGS_VISUALLY_REVIEWED');await check(visual.fileBindings);
 const preflight=await bound(q.preflightAudit);assert.equal(preflight.status,'INDEPENDENT_NATIVE_PREFIX_STATIC_PASS');assert.deepEqual(preflight.errors,[]);await check(preflight.fileBindings);
 const selected=[];for(const file of index.files){assert(priorAudit.inputBindings[file],'Each previous receipt must be independently bound');const r=await read(file,priorAudit.inputBindings[file]);assert.equal(r.accepted,true);assert.equal(r.levelSha256,levelSha256(r.level));selected.push(r);}
 assert(!selected.some(r=>r.levelSha256===q.levelSha256));
 const groups=assertCompleteBasicDraftPool(selected,NATIVE_BASIC_SLOT,runtime.slots),candidate={...NATIVE_BASIC_SLOT,sourceLevelId:q.sourceLevelId,level:q.level};
 const allBasic=[...selected.filter(r=>r.stageKey==='basic-combined'),candidate],staticChecks=[];
 for(const r of allBasic){const checked=await auditV4StaticCandidate(runtime,r);assert(checked.passed,`${r.formalId}: ${JSON.stringify(checked.issues)}`);
  await check(checked.policyBindings);for(const [p,h]of Object.entries(checked.assetBindings))await bytes(path.resolve('public',p),h);
  staticChecks.push({formalId:r.formalId,levelSha256:levelSha256(r.level),audit:checked});}
 const diversity=auditV4Diversity([...selected,candidate],runtime.slots);assert.deepEqual(diversity.reasons,[]);
 const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
 assert.deepEqual(json(canonical),q.route.canonicalReplay);assert.deepEqual(json(independent),q.route.independentReplay);
 for(const r of [canonical,independent]){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,q.U);assert.equal(r.effectiveDrags,q.drags.length);assert.equal(r.clearEvents,q.level.blocks.length);}
 assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
 const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))await bytes(file);
 const draft={schemaVersion:4,catalogVersion:'daily-300-catalog-v1',admissionVersion:NATIVE_BASIC_DRAFT_VERSION,...NATIVE_BASIC_SLOT,
  sourceLevelId:q.sourceLevelId,level:q.level,levelSha256:q.levelSha256,drags:q.drags,routeSha256:q.routeSha256,L:q.L,U:q.U,
  status:'NATIVE_BASIC_DRAFT_READY_FOR_EXPLICIT_MERGE',accepted:false,catalogEligible:false,admissionReady:true,
  mathematicalProof:math,independentMathematicalAudit:mathAudit,inputSelection:selection,inputSelectionAudit:selectionAudit,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,executionEnvironment:environment,currentSourceBinding:currentSource,
  attempt:q.attempt,lowerBound:q.lowerBound,upperAccounting:q.upperAccounting,route:q.route,freshCanonicalReplay:canonical,freshIndependentReplay:independent,
  staticAudit:staticChecks.at(-1).audit,basicGroupStaticAudits:staticChecks,completeBasicGroups:groups,diversity,layout:describeLayout(q.level),
  designProvenance:input.provenance,visualReview:q.visualReview,preflightAudit:q.preflightAudit,
  strength:{kind:'foundation-geometry',newestMechanism:null,advancedPrimaryRequired:false},
  mathematicalEvidenceValidated:true,mechanismStrengthValidated:true,designValidated:true,
  newSearches:0,newLedgerClaims:0,currentRuntimeValidationClaimed:false,pointerValidated:false,timeValidated:false,formalReady:false,productionChanged:false,
  mergePolicy:'No selection written. Final merger must independently validate any additional records and rerun full combined diversity; this draft only checks the exact bound 147 plus this one candidate.'};
 await check(bindings);
 return{draft,report:{status:'NATIVE_BASIC_ADMISSION_DRAFT_PASS',version:NATIVE_BASIC_DRAFT_VERSION,inputs:NATIVE_BASIC_DRAFT_INPUTS,
  slot:NATIVE_BASIC_SLOT,sourceLevelId:q.sourceLevelId,levelSha256:q.levelSha256,...evidence,completeBasicGroups:groups,
  verifiedBasicStatic:30,comparedCandidates:148,actualSelectionCount:147,selectionChanged:false,executionEnvironment:environment,
  actualUpperReplays:2,originalLowerRevalidatedWithoutSearch:true,lowerRerun:false,fileBindings:bindings,toolchainSha256:levelSha256(bindings),
  errors:[],newSearches:0,newLedgerClaims:0,currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const label=process.argv[2]??'native-basic-admission-draft-01';assert(/^[a-z0-9-]+$/.test(label));
 const output=root+'proof/'+label;assert.equal(await fs.stat(output).then(()=>true,()=>false),false,'Immutable new output directory');
 const {draft,report}=await prepareNativeBasicAdmission();await fs.mkdir(output,{recursive:false});
 const file=output+'/draft.json';await fs.writeFile(file,JSON.stringify(draft,null,2)+'\n',{flag:'wx'});
 report.draft={path:file,sha256:sha(await fs.readFile(file))};
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,status:report.status,L:draft.L,U:draft.U,accepted:draft.accepted,selectionChanged:false}));
}

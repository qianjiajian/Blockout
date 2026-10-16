import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {auditCapacityIntensity} from '../formal-v3/capacity-intensity-policy.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {expectedIcePreservingLevel,ICE_PRESERVING_LOWER_METHOD} from '../formal-v3/ice-preserving-projection.mjs';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {qualifyBoundedCandidateV4,PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {withCapacityConstructionAttempt,CONSTRUCTION_LEDGER,inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
import {captureLatestSevenHistory,assertLatestSevenHistoryUnchanged,latestHistoryStockImages} from './latest-seven-history-preflight.mjs';
import {realPathWithSuffix} from './native-batch-io.mjs';
import {assertIcedTerminalHistoryMembership} from './qualify-fixed-iced-flip.mjs';
import {assertLowBandBatchPrivateNamespace} from './low-band-advanced-batch-contract.mjs';

export const SELF='tools/daily-challenge/formal-v4/axis-iced-task.mjs';
export const VERSION='fixed-accepted-early-task-two-axis-four-ice-once-v1';
const ROOT='deliverables/daily-formal-v4-20261008';
const sha=b=>createHash('sha256').update(b).digest('hex');
const IMPORT_SHA=sha(await fs.readFile(SELF));
export const INPUTS=Object.freeze({
 base:{path:ROOT+'/design/early-prefix-two-source-four-math-01/candidate-000.json',sha256:'0d9d75107587d994e5c2fbc9f4ddba9264d09ff4931a451850eee48a539fa280'},
 actual:{path:ROOT+'/proof/early-prefix-two-source-four-actual-independent-01.json',sha256:'62d03a1a17f85ffe14cb77855f7e39116d0965e3bfacb17003476465afe2e6c1'},
 selection:{path:ROOT+'/selection/completed-basic-and-advanced-160-01/index.json',sha256:'1a3d2b4d5aa37922e429df77d28ecc8a01a9841f6bcc1812545c42a6ae31692e'},
 selectionReview:{path:ROOT+'/proof/completed160-quick-independent-01.json',sha256:'82236b343519617ba3b15fc94322dd15412bd0879843cf4407d628a381e3c5bc'},
 prior:{path:'deliverables/daily-formal-v2-20261007/final-qualified/daily-mechanisms-axis-block-50-d3-01.json',sha256:'f5c69d950c9b383f72b316d4b9bf7a65b2c96493714a8ff8fe9fae857f40f965'},
});
export const SLOT=Object.freeze({formalId:'daily-mechanisms-axis-block-50-d3-01',stageKey:'mechanisms-axis-block-50',unlockLevel:50,newestMechanism:'axis-block',difficulty:3,slot:1});
export const CONFIGURATION=Object.freeze({
 axes:[{id:'v3-18-6841290-b12',axis:'vertical',exitDrag:41,gateId:'v3-g-orange'},{id:'v3-18-6841290-b2',axis:'horizontal',exitDrag:51,gateId:'late-aware-cyan'}],
 ice:[{id:'v3-18-6841290-b2',before:2,count:7,releaseDrag:46},{id:'v3-18-6841290-b10',before:2,count:8,releaseDrag:47},
  {id:'late-811217594-6',before:2,count:9,releaseDrag:48},{id:'early-841049970-4',before:2,count:10,releaseDrag:49}],
 U:40,clears:16,drags:56,engineeringChoiceNotUserQuota:true,
});
export const LOWER_BUDGET=Object.freeze({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
const eq=(a,b,msg)=>assert.equal(levelSha256(a),levelSha256(b),msg);
function merge(target,map){for(const[p,h]of Object.entries(map??{})){if(target[p])assert.equal(target[p],h,'Binding conflict '+p);target[p]=h;}}
async function read(d,bindings={}){assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,'Changed '+d.path);merge(bindings,{[d.path]:d.sha256});return JSON.parse(b);}
async function live(p,bindings={}){const b=await fs.readFile(p),d={path:p,sha256:sha(b)};merge(bindings,{[p]:d.sha256});return{descriptor:d,value:JSON.parse(b)};}
async function check(bindings){const seen=new Map();for(const[p,h]of Object.entries(bindings)){const k=path.resolve(p).toLowerCase();if(seen.has(k))assert.equal(seen.get(k),h);else{assert.equal(sha(await fs.readFile(p)),h,'Changed '+p);seen.set(k,h);}}}
async function absent(p){await fs.stat(p).then(()=>{throw Error('Already owned or blocked '+p);},e=>{if(e.code!=='ENOENT')throw e;});}
async function write(p,q){await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});return{path:p,sha256:sha(await fs.readFile(p))};}

/** Fieldwise restoration: no normalized replacement world, no permissive
 * mechanism projection. Exactly the two axes and four ice values may differ. */
export function assertAxisIcedDelta(base,level,drags,originalDrags,configuration=CONFIGURATION){
 eq(drags,originalDrags,'The complete given route is immutable');assert.equal(configuration.axes.length,2);assert.equal(configuration.ice.length,4);
 assert.equal(new Set(configuration.axes.map(x=>x.id)).size,2);assert.equal(new Set(configuration.ice.map(x=>x.id)).size,4);
 const allowed=new Map();for(const x of configuration.axes){assert(['horizontal','vertical'].includes(x.axis));allowed.set(x.id,{movementAxis:x.axis});}
 for(const x of configuration.ice){assert.equal(x.before,2);assert(Number.isSafeInteger(x.count)&&x.count>=7);allowed.set(x.id,{...allowed.get(x.id),frozen:x.count});}
 eq(Object.keys(base).sort(),Object.keys(level).sort());assert.equal(base.blocks.length,level.blocks.length);
 for(const k of Object.keys(base))if(k!=='blocks')eq(base[k],level[k],'Unexpected level change '+k);
 let changes=0;
 for(const [i,b]of base.blocks.entries()){
  const next=level.blocks[i],fields=allowed.get(b.id)??{};assert.equal(next.id,b.id);eq(Object.keys(next).sort(),[...new Set([...Object.keys(b),...Object.keys(fields)])].sort());
  for(const k of Object.keys(next))if(k in fields){assert.equal(next[k],fields[k]);if(k==='frozen')assert.equal(b[k],2);else assert.equal(b[k],undefined);assert.notEqual(b[k],next[k]);changes++;}
   else eq(next[k],b[k],'Unexpected body change '+b.id+'.'+k);
 }
 assert.equal(changes,6);return true;
}
export const replayReservations=drags=>1+drags.reduce((n,d)=>n+d.path.length+2+2*Number(!!d.exitSide),0);

// The new early-task writer adds exactly four provenance fields to the separate
// plain receipt. Its embedded physical/plain report remains byte-equivalent.
export function assertPlainTaskLink(iced,input,plain){
 const additions=['plan','recipeId','branchId','executionPolicyObservation'];
 eq(Object.keys(plain).sort(),[...Object.keys(iced.plain),...additions].sort());
 for(const[k,v]of Object.entries(iced.plain))eq(plain[k],v,'Embedded plain '+k);
 eq(input.plain,iced.plain);for(const k of additions)eq(plain[k],iced[k],'Plain provenance '+k);
 eq(input.level,iced.level);eq(plain.levelSha256,levelSha256(plain.level));return true;
}
async function inspectEarlyTaskHistory(base,bindings){
 const cd=base.plan.constructionEvidence,pd=base.plan.plainConstructionEvidence,iced=await read(cd,bindings),plain=await read(pd,bindings),input=await read(base.input,bindings);
 assertPlainTaskLink(iced,input,plain);eq(iced.level,base.level);eq(input.constructionEvidence,cd);eq(input.plainConstructionEvidence,pd);eq(iced.plainConstructionEvidence,pd);eq(plain.levelSha256,base.plan.plainLevelSha256);
 const key=p=>path.resolve(p).toLowerCase(),cp=key(await realPathWithSuffix(cd.path)),pp=key(await realPathWithSuffix(pd.path));
 const allowed=[{p:cp,sha:cd.sha256,level:base.levelSha256},{p:cp,sha:cd.sha256,level:plain.levelSha256},{p:pp,sha:pd.sha256,level:plain.levelSha256}];
 const identity=l=>{const f=designFingerprints(l);return{retry:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),design:f.designSha256};};
 const sought=[identity(base.level),identity(plain.level)],snapshot=await captureLatestSevenHistory({},bindings),seen=new Set(),ownMatches=[],collisions=[];let terminal=null,worldImages=0;
 async function inspect(q,d){const physicalPath=key(await realPathWithSuffix(d.path));for(const image of latestHistoryStockImages(q)){
  const k=physicalPath+'|'+d.sha256+'|'+image.levelSha256;if(seen.has(k))continue;seen.add(k);worldImages++;
  if(!sought.some(f=>f.retry===image.retryIdentitySha256||f.design===image.designSha256))continue;
  const row={evidence:d,field:image.field,levelSha256:image.levelSha256};if(allowed.some(a=>a.p===physicalPath&&a.sha===d.sha256&&a.level===image.levelSha256))ownMatches.push(row);else collisions.push(row);
 }}
 for(const [i,r]of snapshot.roots.entries())if(i!==0&&i!==4)for(const d of r.files){
  const q=await read(d,bindings);await inspect(q,d);
  if(q.constructionFiles!==undefined)for(const child of q.constructionFiles){const stock=await read(child,bindings);await inspect(stock,child);}
  if(d.path.endsWith('.claim.json')&&q.outputDirectory){
   const resultDescriptor=r.files.find(f=>key(f.path)===key(d.path.replace(/\.claim\.json$/,'.result.json')));assert(resultDescriptor,'Pending static constructor');
   const result=await read(resultDescriptor,bindings);eq(result.plan,q.plan);assert.equal(key(await realPathWithSuffix(result.outputDirectory)),key(await realPathWithSuffix(q.outputDirectory)));
   assert(Array.isArray(result.constructionFiles));
   if(result.constructionFiles.some(f=>key(f.path)===key(cd.path)&&f.sha256===cd.sha256)){
    const ix=await live(path.join(q.outputDirectory,'index.json'),bindings);eq(ix.value.plan,q.plan);eq(iced.plan,q.plan);
    const listed=new Map(result.constructionFiles.map(f=>[key(f.path),f.sha256]));assert.equal(listed.size,result.constructionFiles.length);assert.equal(ix.value.attempts.length,listed.size);
    for(const a of ix.value.attempts)assert.equal(listed.get(key(a.constructionEvidence.path)),a.constructionEvidence.sha256);
    const row=ix.value.attempts.find(a=>key(a.constructionEvidence.path)===key(cd.path));eq(row.plainConstructionEvidence,pd);eq(row.candidate,base.input);
    terminal={claim:d,result:resultDescriptor,index:ix.descriptor,plan:q.plan};
   }
  }
 }
 assert(terminal,'Accepted stock must belong to the exact completed early-task constructor');await inspect(iced,cd);await inspect(plain,pd);
 assert(ownMatches.some(r=>r.levelSha256===base.levelSha256));assert(ownMatches.some(r=>key(r.evidence.path)===key(pd.path)));assert.equal(collisions.length,0,'Foreign static physical stock collision');
 return{version:'exact-early-task-four-plain-metadata-fields-history-v1',passed:true,snapshot,own:{iced:cd,plain:pd,terminal},ownMatches,collisions,worldImages,
  publicAndCapacityImmediateGuardOwnedByCaller:true,newSearches:0,newConstructions:0,newLedgerClaims:0};
}

export function assertEarlyTaskEvidence(base,request,result,sidecar,planRecord){
 assert.equal(base.version,'new-body-ice-thawed-prefix-one-plain-tail-original-ice-lower-task-v1');assert.equal(base.accepted,true);
 assert.equal(base.qualificationOnly,false);assert.equal(base.sourceLevelId,18);assert.equal(base.L,31);assert.equal(base.U,40);assert.equal(base.drags.length,56);
 assert.equal(base.levelSha256,levelSha256(base.level));assert.equal(base.routeSha256,routeSha256(base.drags));assert.equal(base.plan.floor,31);
 eq(request,base.attempt);assert.equal(result.accepted,true);assert.equal(result.status,base.status);assert.equal(result.levelSha256,base.levelSha256);
 eq(result.lower,base.proof);assert.equal(result.upper,null);eq(base.lowerBound.result,base.proof);assert.equal(base.route.search,null);
 assert(base.proof.thresholdProven&&base.proof.floor===31&&base.proof.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
 for(const k of ['level','drags','plan','attempt','bridge','upperConstruction','upperAccounting','lowerBound','route','L','U','accepted','status'])assert(Object.hasOwn(sidecar,k),'Missing original task sidecar '+k);
 for(const[k,v]of Object.entries(sidecar))eq(base[k],v,'Original task sidecar '+k);eq(planRecord.attempt,base.attempt);eq(planRecord.plan,base.plan);eq(planRecord.bindings,base.designBindings);
 for(const r of [base.route.canonicalReplay,base.route.independentReplay])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===40&&r.clearEvents===16);
 const inventory=mechanismInventory(base.level);assert.equal(inventory['numeric-ice'].length,4);assert.equal(Object.values(inventory).reduce((n,v)=>n+v.length,0),4);
 return true;
}

async function baseReader(runtime,bindings){
 const base=await read(INPUTS.base,bindings),actual=await read(INPUTS.actual,bindings);
 assert.equal(actual.status,'INDEPENDENT_EARLY_PREFIX_BATCH_ACTUAL_PASS');assert.deepEqual(actual.errors,[]);assert.equal(actual.accepted,1);
 const row=actual.results.find(r=>r.path===INPUTS.base.path);assert(row&&row.sha256===INPUTS.base.sha256&&row.accepted&&row.L===31&&row.U===40&&row.attemptId===base.attempt.id);
 const completion=await read(actual.completion,bindings);assert(completion.results.some(r=>r.path===INPUTS.base.path&&r.sha256===INPUTS.base.sha256&&r.accepted));
 const request=await live(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.request.json`,bindings),result=await live(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.result.json`,bindings);
 const sidecar=await live(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.v4-thawed-prefix-task-result.json`,bindings);
 const planRecord=await read(base.planEvidence,bindings);assertEarlyTaskEvidence(base,request.value,result.value,sidecar.value,planRecord);
 for(const d of [request.descriptor,result.descriptor,sidecar.descriptor,base.planEvidence]){
  const found=Object.entries(actual.fileBindings).some(([p,h])=>path.resolve(p).toLowerCase()===path.resolve(d.path).toLowerCase()&&h===d.sha256);assert(found,'Actual audit must bind original public evidence');
 }
 assert.equal(base.toolchainSha256,runtime.toolchainSha256);eq(base.toolchainBindings,runtime.toolchainBindings);
 await read(base.input,bindings);await read(base.batchPlan,bindings);await read(base.plan.constructionEvidence,bindings);await read(base.plan.plainConstructionEvidence,bindings);
 const f=base.attempt,alias=await live(`${PUBLIC_ATTEMPT_LEDGER}/identities/${f.retryIdentitySha256}.json`,bindings);assert.equal(alias.value.origin,f.identityOrigin);
 for(const p of [`${PUBLIC_ATTEMPT_LEDGER}/${f.identityOrigin}.blocked.json`,`${PUBLIC_ATTEMPT_LEDGER}/${f.identityOrigin}.revalidation.lock`,
  `${PUBLIC_ATTEMPT_LEDGER}/identities/${f.retryIdentitySha256}.blocked.json`,`${CONSTRUCTION_LEDGER}/identities/${f.retryIdentitySha256}.json`,`${CONSTRUCTION_LEDGER}/identities/${f.retryIdentitySha256}.blocked.json`,`${CONSTRUCTION_LEDGER}/aliases/${f.retryIdentitySha256}.json`])await absent(p);
 return{base,request:request.descriptor,result:result.descriptor,sidecar:sidecar.descriptor};
}
function design(runtime,base,level,selected,old){
 const source=runtime.LEVELS.find(s=>s.id===base.sourceLevelId);assert.equal(boardBaselineSha256(level),boardBaselineSha256(source));
 const sourceComparison=compareLayouts(level,source);assert(sourceComparison.footprintSimilarity<=.55+1e-12);
 const nearestOld=old.map(q=>({id:q.formalId,similarity:compareLayouts(level,q.level).footprintSimilarity})).sort((a,b)=>b.similarity-a.similarity)[0];assert(nearestOld.similarity<=.75+1e-12);
 const comparisons=selected.map(q=>({id:q.formalId,similarity:compareLayouts(level,q.level).footprintSimilarity}));assert(comparisons.every(q=>q.similarity<=.65+1e-12));
 const diversity=auditV4Diversity([...selected,{...SLOT,sourceLevelId:18,level}],runtime.slots,{expectFull:false});assert.deepEqual(diversity.reasons,[]);
 return{passed:true,sourceComparison,nearestOld,selectedComparisons:comparisons,diversity,
  lineage:'accepted new regional retile: 15/40 cells, three old bodies replaced by four; retained outside backbone disclosed',oneFamilyRepresentative:true};
}
async function readiness(runtime,{includeHistory=true}={}){
 const bindings={},environment=prefixExecutionEnvironment(runtime);merge(bindings,runtime.toolchainBindings);merge(bindings,runtime.designBindings);merge(bindings,environment.bindings);
 const b=await baseReader(runtime,bindings),sourceBinding=await currentMainlineSourceBinding(runtime,environment,18,{qualificationOnly:false});merge(bindings,sourceBinding.bindings);
 assert.equal(levelSha256(runtime.LEVELS.find(s=>s.id===18)),b.base.plan.sourceLevelSha256);eq(runtime.slots.find(s=>s.formalId===SLOT.formalId),SLOT);
 const index=await read(INPUTS.selection,bindings),review=await read(INPUTS.selectionReview,bindings);assert.equal(review.status,'INDEPENDENT_160_MERGE_QUICK_CHECK_PASS');eq(review.selection,INPUTS.selection);assert.deepEqual(review.errors,[]);assert.equal(review.candidates,160);
 const selected=[];assert.equal(index.files.length,160);for(const p of index.files){assert.equal(review.inputBindings[p],index.fileBindings[p]);const q=await read({path:p,sha256:index.fileBindings[p]},bindings);assert(q.accepted);selected.push(q);}
 assert(!selected.some(q=>q.formalId===SLOT.formalId||q.levelSha256===b.base.levelSha256));
 const old=[];for(const row of runtime.priorDailySlots.values()){const q=await read({path:row.sourceReport,sha256:row.sourceReportSha256},bindings);assert.equal(levelSha256(q.level),row.levelSha256);old.push(q);}
 const prior=await read(INPUTS.prior,bindings),baseline=runtime.priorDailySlots.get(SLOT.formalId);eq({path:baseline.sourceReport,sha256:baseline.sourceReportSha256},INPUTS.prior);assert.equal(levelSha256(prior.level),baseline.levelSha256);eq(mechanismInventory(prior.level),baseline.inventory);
 assert.equal(baseline.inventory['axis-block'].length,1);const inspection=design(runtime,b.base,b.base.level,selected,old);
 const history=includeHistory?await inspectEarlyTaskHistory(b.base,bindings):null;
 return{...b,bindings,environment,sourceBinding,selected,old,prior,inspection,history};
}
export function assertAxisIcedPlan(p){
 assert.equal(p.version,VERSION);assert.equal(p.schemaVersion,4);assert.equal(p.scope,300);eq(p.inputs,INPUTS);eq(p.slot,SLOT);eq(p.configuration,CONFIGURATION);eq(p.lowerBudget,LOWER_BUDGET);
 assert.equal(p.maximumBaseAdaptations,1);assert.equal(p.maximumConstructionWorlds,10000);assert.equal(p.maximumProofWorlds,10000);assert.equal(p.freshOriginalLowerRequired,true);
 assert.equal(p.routeRepairAllowed,false);assert.equal(p.failedBaseFallbackAllowed,false);assert.equal(p.formalReady,false);assert.equal(p.bindings[SELF],IMPORT_SHA);return true;
}
/** Metadata and history only. Does not instantiate the new axis/ice object. */
export async function prepareAxisIcedTask(runtime){
 assert.equal(sha(await fs.readFile(SELF)),IMPORT_SHA);const r=await readiness(runtime),compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))merge(r.bindings,{[p.replaceAll('\\','/')]:sha(await fs.readFile(p))});
 const plan={schemaVersion:4,scope:300,version:VERSION,inputs:INPUTS,slot:SLOT,configuration:CONFIGURATION,lowerBudget:LOWER_BUDGET,
  maximumBaseAdaptations:1,maximumConstructionWorlds:10000,maximumProofWorlds:10000,freshOriginalLowerRequired:true,routeRepairAllowed:false,failedBaseFallbackAllowed:false,
  baseLevelSha256:r.base.levelSha256,baseRouteSha256:r.base.routeSha256,basePublicRequest:r.request,basePublicResult:r.result,baseTaskSidecar:r.sidecar,
  environment:r.environment,sourceBinding:r.sourceBinding,preconstructionDesign:r.inspection,history:r.history,
  policyReviewedAtPreparation:r.environment.policyReviewedAtPreparation,historicalDesignPolicy:r.environment.historicalDesignPolicy,mathematicalContract:r.environment.mathematicalContract,
  proofToolchainSha256:runtime.toolchainSha256,bindings:r.bindings,newConstructions:0,newSearches:0,newLedgerClaims:0,formalReady:false,currentRuntimeValidationClaimed:false};
 assertAxisIcedPlan(plan);await check(plan.bindings);return plan;
}

/** One fixed application. Six modifications and every final witness replay,
 * including the unmodified guard and qualifier's replays, are prepaid. */
export function constructAxisIced(runtime,base,prior,meter,configuration=CONFIGURATION){
 const w=replayReservations(base.drags);meter.reserve(8+6*w+8,'clone-six-edits-capacity-two-guard-two-qualifier-two-replays-static');
 const level=structuredClone(base.level);for(const x of configuration.axes)level.blocks.find(b=>b.id===x.id).movementAxis=x.axis;
 for(const x of configuration.ice)level.blocks.find(b=>b.id===x.id).frozen=x.count;
 assertAxisIcedDelta(base.level,level,base.drags,base.drags,configuration);
 const audit=auditCapacityIntensity(runtime,level,base.drags,'axis-block',3,mechanismInventory(prior));assert(audit.passed,audit.issues.join(';'));
 assert.equal(audit.replay.nonClearingDrags,configuration.U);assert.equal(audit.replay.clearEvents,configuration.clears);assert.equal(base.drags.length,configuration.drags);
 const axes=audit.rows.find(r=>r.mechanism==='axis-block');assert.equal(axes.details.length,2);
 for(const x of configuration.axes){const events=audit.exitEvents.filter(e=>e.blockId===x.id);assert.equal(events.length,1);assert.equal(events[0].gateId,x.gateId);assert.equal(events[0].drag,x.exitDrag);assert(axes.details.find(r=>r.id===x.id)?.active);}
 const ice=audit.rows.find(r=>r.mechanism==='numeric-ice');assert.equal(ice.details.length,4);for(const x of configuration.ice)assert.equal(ice.details.find(r=>r.id===x.id)?.evidence.thawDrag,x.releaseDrag);
 const accounting=meter.report();return{ok:true,level,drags:base.drags,levelSha256:levelSha256(level),routeSha256:routeSha256(base.drags),audit,targets:audit.targets,
  primaryInstances:configuration.axes,constructionAccounting:accounting,provenance:{version:VERSION,inputLevelSha256:base.levelSha256,inputRouteSha256:routeSha256(base.drags),
   outputLevelSha256:levelSha256(level),outputRouteSha256:routeSha256(base.drags),configuration,constructionAccounting:accounting,attemptsUsed:1,maxAttempts:1,fullBoardSolverInvocations:0}};
}
export async function withAxisIcedConstruction(runtime,base,prior,{qualificationOnly=false,publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,constructionLedgerDirectory=CONSTRUCTION_LEDGER,maxStates=10000,configuration=CONFIGURATION}={}){
 await assertLowBandBatchPrivateNamespace(qualificationOnly,publicLedgerDirectory,constructionLedgerDirectory);
 if(!qualificationOnly){assert.equal(maxStates,10000);eq(configuration,CONFIGURATION);}
 const meter=createCapacityConstructionBudget({maxStates});meter.reserve(1,'guard-base-clone');
 return withCapacityConstructionAttempt(runtime,base,SLOT,b=>{
  try{return constructAxisIced(runtime,b,prior,meter,configuration);}catch(e){return{ok:false,reason:e.message,constructionAccounting:meter.report()};}
 },{qualificationOnly,ledgerDirectory:constructionLedgerDirectory,publicLedgerDirectory});
}
export function assertAxisFinalMath(math,level,drags,U=40){
 eq(math.level,level);eq(math.drags,drags);assert.equal(math.levelSha256,levelSha256(level));assert.equal(math.routeSha256,routeSha256(drags));assert.equal(math.route.search,null);
 assert.equal(math.route.witnessValidation.providedRoute,true);for(const r of [math.route.canonicalReplay,math.route.independentReplay])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===U);
 assert.equal(math.route.independentReplay.remainingBodies,0);assert.equal(math.route.independentReplay.remainingQueued,0);
 eq(math.attemptPlan.lowerBudget,LOWER_BUDGET);eq(math.attemptPlan.upperBudget,LOWER_BUDGET);assert.equal(math.attemptPlan.inputLevelSha256,levelSha256(level));assert.equal(math.attemptPlan.providedRouteSha256,routeSha256(drags));
 if(math.lowerBound){assert.equal(math.lowerBound.method,ICE_PRESERVING_LOWER_METHOD);assert.equal(math.lowerBound.inputLevelSha256,levelSha256(level));assert.equal(math.lowerBound.projectedLevelSha256,levelSha256(expectedIcePreservingLevel(level)));const l=math.lowerBound.result;
  eq(l.budget,LOWER_BUDGET);assert(l.guardAllowance.conservativeFullBoardStateUpperBound<=10000);assert.equal(l.guardAllowance.registeredRawSetStates,l.rawFullBoardStates);assert.equal(l.guardAllowance.conservativeFullBoardStateUpperBound,l.rawFullBoardStates+1);assert(l.rawFullBoardStates<=9999);
  if(math.accepted){assert(l.elapsedMilliseconds<30000);assert(l.attemptedTransitions<=10000000);assert(l.microDiscoveredStates<=3000000);}}
 if(math.accepted){assert.equal(math.L,31);assert.equal(math.U,U);assert(math.lowerBound.result.thresholdProven);assert.equal(math.lowerBound.result.floor,31);assert.equal(math.lowerBound.result.termination,'below-threshold-exhausted');}return true;
}
async function seal(report,bindings){
 const c=report.construction,r=c?.constructionAttempt;if(!r)return;
 report.entryResultFile=path.join(CONSTRUCTION_LEDGER,r.id+'.slot-result.json');
 if(!report.accepted)for(const p of [path.join(CONSTRUCTION_LEDGER,r.identityOrigin+'.blocked.json'),path.join(CONSTRUCTION_LEDGER,'identities',r.retryIdentitySha256+'.blocked.json')])await fs.writeFile(p,JSON.stringify({attemptId:r.id,status:report.status,slotResult:report.entryResultFile})+'\n',{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
 report.designBindings=bindings;report.designToolchainSha256=levelSha256(bindings);await write(report.entryResultFile,report);
}
export async function runAxisIcedTask(runtime,planDescriptor,reviewDescriptor){
 const plan=await read(planDescriptor);assertAxisIcedPlan(plan);const review=await read(reviewDescriptor);assert.equal(review.status,'INDEPENDENT_AXIS_ICED_TASK_PLAN_PASS');eq(review.plan,planDescriptor);assert.deepEqual(review.errors,[]);assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);assert.equal(review.fileBindings[SELF],IMPORT_SHA);
 await check(plan.bindings);await check(review.fileBindings);await assertLatestSevenHistoryUnchanged(plan.history.snapshot);
 const ready=await readiness(runtime,{includeHistory:false});eq(ready.environment,plan.environment);eq(ready.base.levelSha256,plan.baseLevelSha256);
 const bindings={...plan.bindings};merge(bindings,ready.bindings);merge(bindings,{[planDescriptor.path]:planDescriptor.sha256,[reviewDescriptor.path]:reviewDescriptor.sha256});
 const report={schemaVersion:4,scope:300,version:VERSION,...SLOT,sourceLevelId:18,baseReceipt:INPUTS.base,baseActualAudit:INPUTS.actual,inputSelection:INPUTS.selection,selectionReview:INPUTS.selectionReview,
  baseLevelSha256:ready.base.levelSha256,baseRouteSha256:ready.base.routeSha256,fixedPlan:planDescriptor,planReview:reviewDescriptor,priorBaseline:INPUTS.prior,configuration:CONFIGURATION,
  environment:plan.environment,policyReviewedAtPreparation:plan.policyReviewedAtPreparation,historicalDesignPolicy:plan.historicalDesignPolicy,mathematicalContract:plan.mathematicalContract,
  toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,
  accepted:false,L:null,U:null,status:'AXIS_ICED_PENDING',reasons:[],qualificationOnly:false,catalogEligible:false,formalReady:false,productionChanged:false,currentRuntimeValidationClaimed:false,
  pointerValidated:false,timeValidated:false,mathematicalEvidenceValidated:false,designValidated:false,mechanismStrengthValidated:false,finalProofStarted:false,terminalBlocked:false};
 try{
  report.constructionExecutionPolicyObservation=observeExecutionPolicy(plan.environment);
  const c=await withAxisIcedConstruction(runtime,ready.base,ready.prior.level);report.construction=c;report.constructionAttemptStarted=!!c.constructionAttemptStarted;
  if(c.resultFile)report.constructionSidecar=(await live(c.resultFile,bindings)).descriptor;if(c.planFile)report.constructionPlan=(await live(c.planFile,bindings)).descriptor;
  if(!c.ok){report.status='REJECTED_AXIS_ICED_CONSTRUCTION';return report;}
  Object.assign(report,{level:c.level,drags:c.drags,levelSha256:levelSha256(c.level),routeSha256:routeSha256(c.drags),constructionAccounting:c.constructionAccounting});
  assert.equal(c.U,40);assertAxisIcedDelta(ready.base.level,c.level,c.drags,ready.base.drags);assert.deepEqual(inspectConstructionAccounting(c.constructionAccounting),[]);
  report.strength={...c.audit,mechanism:'axis-block',kind:'capacity-primary-with-existing-staggered-body-ice'};report.mechanismStrengthValidated=true;
  const candidate={...SLOT,sourceLevelId:18,level:c.level,drags:c.drags,levelSha256:report.levelSha256,routeSha256:report.routeSha256};
  report.staticAudit=await auditV4StaticCandidate(runtime,candidate);assert(report.staticAudit.passed,report.staticAudit.issues.join(';'));merge(bindings,Object.fromEntries(Object.entries(report.staticAudit.assetBindings).map(([p,h])=>['public/'+p,h])));
  report.design=design(runtime,ready.base,c.level,ready.selected,ready.old);report.designValidated=true;
  report.finalExecutionPolicyObservation=observeExecutionPolicy(plan.environment);report.finalProofStarted=true;
  const math=await qualifyBoundedCandidateV4(runtime,candidate,{lowerBudget:LOWER_BUDGET,routeBudget:LOWER_BUDGET,mechanismBaseReceipt:INPUTS.base});report.mathematicalProof=math;
  for(const k of ['attempt','lowerBound','route','L','U','attemptPlan','attemptPlanSha256'])if(math[k]!==undefined)report[k]=math[k];
  assertAxisFinalMath(math,c.level,c.drags);report.accepted=math.accepted;report.mathematicalEvidenceValidated=math.accepted;report.status=math.accepted?'AXIS_ICED_D3_VERIFIED_AWAITING_POINTER':'REJECTED_FINAL_FRESH_AXIS_ICED_PROOF';return report;
 }catch(e){report.status='REJECTED_AXIS_ICED_TASK';report.reasons.push(e.message);return report;}
 finally{
  try{await check(bindings);report.historyTerminalMembership=await assertIcedTerminalHistoryMembership(plan.history.snapshot,report);merge(bindings,report.historyTerminalMembership.fileBindings);}catch(e){report.accepted=false;report.status='AXIS_ICED_FINAL_BINDING_OR_HISTORY_REJECTED';report.reasons.push(e.message);}
  report.catalogEligible=report.accepted;report.terminalBlocked=!!report.constructionAttemptStarted&&!report.accepted;if(!report.accepted)report.mathematicalEvidenceValidated=false;
  await seal(report,bindings);
 }
}

/** Exact stored object audit; no readiness, candidate construction or solver. */
export async function auditAxisIcedTask(runtime,receiptDescriptor){
 const bindings={},q=await read(receiptDescriptor,bindings),p=await read(q.fixedPlan,bindings);assertAxisIcedPlan(p);assert.equal(q.version,VERSION);eq(q.configuration,CONFIGURATION);eq(q.inputSelection,INPUTS.selection);
 const base=await read(INPUTS.base,bindings),prior=await read(INPUTS.prior,bindings),stored=await live(q.entryResultFile,bindings);eq(stored.value,q);
 const c=await read(q.constructionSidecar,bindings);eq(c,q.construction);assert.deepEqual(inspectConstructionAccounting(c.constructionAccounting),[]);
 const cr=await live(path.join(CONSTRUCTION_LEDGER,c.constructionAttempt.id+'.request.json'),bindings),ct=await live(path.join(CONSTRUCTION_LEDGER,c.constructionAttempt.id+'.result.json'),bindings);eq(cr.value,c.constructionAttempt);assert.equal(ct.value.accepted,c.accepted);assert.equal(ct.value.levelSha256,base.levelSha256);
 const cp=await read(q.constructionPlan,bindings);eq(cp.slot,SLOT);assert.equal(cp.inputLevelSha256,base.levelSha256);assert.equal(cp.inputRouteSha256,base.routeSha256);assert.equal(levelSha256(cp),c.planSha256);
 if(c.ok){assertAxisIcedDelta(base.level,q.level,q.drags,base.drags);const canonical=replayDecorated(runtime,q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);for(const r of [canonical,independent])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===40&&r.clearEvents===16);
  assert.equal(c.constructionAccounting.fullWorldReservations,17+6*replayReservations(base.drags));eq(c.level,q.level);eq(c.drags,q.drags);eq(q.constructionAccounting,c.constructionAccounting);
  const alias=await live(`${CONSTRUCTION_LEDGER}/aliases/${c.constructionAttempt.retryIdentitySha256}.json`,bindings);assert.equal(alias.value.constructionAttempt,c.constructionAttempt.id);assert.equal(alias.value.finalLevelSha256,q.levelSha256);
  const strength=auditCapacityIntensity(runtime,q.level,q.drags,'axis-block',3,mechanismInventory(prior.level));assert(strength.passed);eq(strength,c.audit);
  if(q.mathematicalProof){const m=q.mathematicalProof;assertAxisFinalMath(m,q.level,q.drags);eq(q.attempt,m.attempt);eq(q.lowerBound,m.lowerBound);eq(q.route,m.route);assert.equal(q.accepted,m.accepted);assert.equal(q.L,m.L);assert.equal(q.U,m.U);
   const r=await live(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.request.json`,bindings),t=await live(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.result.json`,bindings),mp=await live(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.v4-plan.json`,bindings);
   eq(r.value,q.attempt);eq(t.value.lower,q.lowerBound.result);assert.equal(t.value.upper,null);assert.equal(t.value.accepted,m.accepted);assert.equal(t.value.status,m.status);assert.equal(t.value.levelSha256,q.levelSha256);eq(mp.value.attempt,q.attempt);eq(mp.value.plan,m.attemptPlan);eq(mp.value.policyBindings,m.policyBindings);
   const a=m.acceptedBaseAdaptation;eq(a.baseReceipt,INPUTS.base);assert.equal(a.baseAttemptId,base.attempt.id);assert.equal(a.baseLevelSha256,base.levelSha256);assert.equal(a.finalLevelSha256,q.levelSha256);
   const input=await live(`${PUBLIC_ATTEMPT_LEDGER}/v4-mechanism-inputs/${a.finalMechanismInputIdentity}.json`,bindings);eq(input.value,a);assert.equal(q.attempt.revalidates,base.attempt.id);
   if(!m.accepted)for(const f of [`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.identityOrigin}.blocked.json`,`${PUBLIC_ATTEMPT_LEDGER}/identities/${q.attempt.retryIdentitySha256}.blocked.json`])await live(f,bindings);
  }
 }
 if(!q.accepted&&q.constructionAttemptStarted)for(const file of [`${CONSTRUCTION_LEDGER}/${c.constructionAttempt.identityOrigin}.blocked.json`,`${CONSTRUCTION_LEDGER}/identities/${c.constructionAttempt.retryIdentitySha256}.blocked.json`])await live(file,bindings);
 await check(q.designBindings);await check(bindings);return{status:'INDEPENDENT_AXIS_ICED_TASK_ACTUAL_PASS',receipt:receiptDescriptor,accepted:q.accepted,L:q.L,U:q.U,errors:[],fileBindings:bindings,newSearches:0,newLedgerClaims:0,newConstructions:0,formalReady:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [mode,a,b,c,d,out]=process.argv.slice(2),rt=await loadV4CatalogRuntime();
 if(mode==='prepare')console.log(JSON.stringify(await write(a,await prepareAxisIcedTask(rt))));
 else if(mode==='run')console.log(JSON.stringify(await write(out,await runAxisIcedTask(rt,{path:a,sha256:b},{path:c,sha256:d}))));
 else if(mode==='audit')console.log(JSON.stringify(await write(c,await auditAxisIcedTask(rt,{path:a,sha256:b}))));
 else throw Error('prepare <plan.json> | run <plan> <sha> <review> <sha> <candidate.json> | audit <receipt> <sha> <report.json>');
}

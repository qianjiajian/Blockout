import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {inspectConstructionAccounting,CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {levelSha256,routeSha256,independentReplay,BANDS} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {auditCapacityIntensity} from '../formal-v3/capacity-intensity-policy.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {projectStaticConstraints} from '../formal-v2/constraint-projection.mjs';
import {projectFullPhysicalShutters} from '../formal-v2/shutter-materialization-projection.mjs';
import {projectOpeningOuterBodies} from '../formal-v2/inventory-projection.mjs';
import {projectIcePreservingConstraints} from '../formal-v3/ice-preserving-projection.mjs';

// No solver or construction function is called. Stored proofs are authenticated
// against original requests/results; only their original witnesses are replayed.
const [input='deliverables/daily-formal-v4-20261008/selection/capacity13-02',label='capacity13-completion-independent-01',environmentPath]=process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(label));const output=`deliverables/daily-formal-v4-20261008/proof/${label}`;
const runtime=await loadV4CatalogRuntime(),inputBindings={},cache=new Map(),rows=[],errors=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
async function bytes(p,expected){const b=await fs.readFile(p),h=hash(b);if(expected)assert.equal(h,expected,`File SHA: ${p}`);
 if(inputBindings[p])assert.equal(h,inputBindings[p],`Changed while auditing: ${p}`);inputBindings[p]=h;return b;}
async function read(p,expected){const b=await bytes(p,expected);if(!cache.has(p))cache.set(p,JSON.parse(b));return cache.get(p);}
async function descriptor(d){assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256));return read(d.path,d.sha256);}
async function bindings(map){assert(map&&typeof map==='object');for(const [p,h]of Object.entries(map))await bytes(p,h);}
async function absent(p){assert.equal(await fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;}),false,`Unexpected pending lock: ${p}`);}
function metricReplay(r,U,drags){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,U);assert.equal(r.effectiveDrags,drags.length);}
function projectionFor(lower,level){
 const m=lower.projection?.method;if(!m)return null;
 if(m==='static-bodies-constraint-erasure-v1')return projectStaticConstraints(level);
 if(m==='full-physical-shutter-early-materialization-v1')return projectFullPhysicalShutters(level,runtime);
 if(m==='opening-outer-bodies-inventory-erasure-v1')return projectOpeningOuterBodies(level,runtime);
 if(lower.method.includes('ice-preserving'))return projectIcePreservingConstraints(level,runtime);
 throw Error(`Unreviewed projection method: ${m}`);
}
const plan=await read(`${input}/plan.json`),completion=await read(`${input}/completion.json`),index=await read(`${input}/index.json`);
let environment=null;
if(environmentPath){
 const e=await read(environmentPath);
 assert.equal(e.status,'EXPLICIT_HISTORICAL_MATH_WORKSPACE');assert.equal(path.resolve(e.workspace),process.cwd());
 assert.equal(e.frozenMath,runtime.toolchainSha256);assert.equal(e.productionSourceChanged,false);assert.equal(e.currentRuntimeValidationClaimed,false);
 await bytes(e.historicalUI.path,e.historicalUI.sha256);await bytes('src/game/ColorEscapeGame.ts',e.historicalUI.sha256);
 await bytes(path.resolve(e.sourceWorkspace,e.currentUI.path),e.currentUI.sha256);
 environment={path:environmentPath,sha256:inputBindings[environmentPath],...e,
  interpretation:'All relative mathematical source bindings resolve inside the explicit historical workspace. Current production UI is bound separately and has not been revalidated by this audit.'};
}
assert.equal(completion.status,'FINITE_CAPACITY_PLAN_FINISHED');assert.equal(completion.attempts,13);assert.equal(completion.outcomes.length,13);
assert.equal(plan.rows.length,13);assert.equal(plan.sameBaseFallbacksAllowed,false);assert.equal(plan.sameBaseStageRetriesAllowed,false);
assert.deepEqual(plan.options.worldBudget,{maxStates:10000});assert.equal(plan.options.proofOptions.lowerBudget.maxStates,9999);
await bindings(plan.bindings);assert.equal(plan.proofToolchainSha256,runtime.toolchainSha256);
const priorIndex=await descriptor(plan.inputSelection),originalPlan=await descriptor(plan.inputPlan);
assert.equal(priorIndex.files.length,126);assert.equal(originalPlan.rows.length,13);
const seedIndex=await descriptor(plan.seedSelection),priorBatchAudit=await descriptor(plan.previousAudit);
assert.equal(seedIndex.files.length,116);assert.deepEqual(priorIndex.files.slice(0,116),seedIndex.files);
assert.equal(priorBatchAudit.status,'INDEPENDENT_ACTUAL_BATCH_AUDIT_COMPLETE');assert.equal(priorBatchAudit.combinedCandidates,126);assert.deepEqual(priorBatchAudit.errors,[]);
const priorTen=priorIndex.files.slice(116);assert.equal(priorTen.length,10);
for(const file of priorTen){assert(priorBatchAudit.inputBindings[file]);await bytes(file,priorBatchAudit.inputBindings[file]);}
const records=await Promise.all(priorIndex.files.map(f=>read(f))),acceptedFiles=[];
const baseIds=new Set(),constructionIds=new Set(),mathIds=new Set();
for(const [i,outcome]of completion.outcomes.entries()){
 const row={position:i+1,file:outcome.file,formalId:outcome.formalId,reportedAccepted:outcome.accepted,issues:[]};
 try{
  const q=await read(outcome.file),p=plan.rows[i],slot=runtime.slots.find(s=>s.formalId===q.formalId);assert(slot);
  assert.deepEqual(p.slot,slot);for(const k of Object.keys(slot))assert.equal(q[k],slot[k]);
  assert.equal(q.accepted,outcome.accepted);assert.equal(q.status,outcome.status);assert.equal(q.formalReady,false);assert.equal(q.productionChanged,false);
  assert.equal(q.qualificationOnly,false);assert.equal(q.catalogEligible,q.accepted);
  assert(!baseIds.has(q.baseLevelSha256));baseIds.add(q.baseLevelSha256);
  const base=await descriptor(q.baseReceipt);assert.deepEqual({path:q.baseReceipt.path,sha256:q.baseReceipt.sha256},p.base);
  assert.equal(base.levelSha256,q.baseLevelSha256);assert.equal(levelSha256(base.level),p.baseLevelSha256);assert.equal(routeSha256(base.drags),p.baseRouteSha256);
  const baseRequest=await descriptor(q.baseReceipt.request),baseResult=await descriptor(q.baseReceipt.result);
  assert.deepEqual(baseRequest,base.attempt);assert(baseResult.accepted);assert.equal(baseResult.status,base.status);assert.equal(baseResult.levelSha256,base.levelSha256);
  if(base.proof)assert.deepEqual(baseResult.lower,base.proof);if(base.lowerBound?.result)assert.deepEqual(baseResult.lower,base.lowerBound.result);
  const ctx=await descriptor(q.selectionContext);assert.deepEqual(ctx.files,[...priorIndex.files,...acceptedFiles]);
  assert.deepEqual(ctx.seedIndex,plan.seedSelection);for(const f of ctx.files)await bytes(f,ctx.fileBindings[f]);
  await bindings(q.toolchainBindings);assert.deepEqual(q.toolchainBindings,runtime.toolchainBindings);
  await bindings(q.designBindings);assert.equal(levelSha256(q.designBindings),q.designToolchainSha256);
  await bindings(q.designInputBindings);await bindings(q.assetBindings??{});
  assert.deepEqual(await read(q.entryResultFile),q,'Exact immutable final entry sidecar');
  const c=q.construction,request=c.constructionAttempt;assert(request&&q.constructionAttemptStarted);
  assert(!constructionIds.has(request.id));constructionIds.add(request.id);
  assert.deepEqual(await read(path.join(CONSTRUCTION_LEDGER,`${request.id}.request.json`)),request);
  const cr=await read(path.join(CONSTRUCTION_LEDGER,`${request.id}.result.json`));assert.equal(cr.accepted,c.accepted);assert.equal(cr.status,c.status);assert.equal(cr.levelSha256,q.baseLevelSha256);
  assert.deepEqual(await descriptor(q.constructionSidecar),c);
  const cp=await descriptor(q.constructionPlan);assert.equal(levelSha256(cp),q.constructionPlan.canonicalSha256);
  assert.deepEqual(cp.slot,slot);assert.equal(cp.inputLevelSha256,q.baseLevelSha256);assert.equal(cp.inputRouteSha256,q.baseRouteSha256);assert.equal(cp.hardWholeBoardLimit,10000);
  assert.equal(cp.allFailuresTerminal,true);assert.equal(cp.noStageOrMethodRetry,true);assert.equal(cp.mathematicalLowerSearchInvocations,0);
  assert.deepEqual(inspectConstructionAccounting(c.constructionAccounting),[]);
  row.construction={accepted:c.accepted,status:c.status,...c.constructionAccounting};
  if(!c.accepted){assert(q.terminalBlocked&&!q.accepted&&!q.finalProofStarted);
   await read(path.join(CONSTRUCTION_LEDGER,`${request.id}.blocked.json`));
   await read(path.join(CONSTRUCTION_LEDGER,'identities',`${request.retryIdentitySha256}.blocked.json`));
  }
  if(q.mathematicalProof){
   const m=q.mathematicalProof;assert(q.finalProofStarted);assert.equal(m.levelSha256,q.levelSha256);
   for(const k of ['formalId','stageKey','difficulty','slot','newestMechanism','sourceLevelId'])assert.equal(m[k],q[k]);
   assert.equal(levelSha256(m.level),q.levelSha256);assert.equal(levelSha256(m.attemptPlan),m.attemptPlanSha256);
   assert.equal(m.attemptPlan.strategy.route,'provided');assert.equal(m.attemptPlan.providedRouteSha256,q.routeSha256);
   assert.equal(m.attemptPlan.lowerBudget.maxStates,9999);assert.equal(m.attemptPlan.formedBeforeClaim,true);
   await bindings(m.policyBindings);assert.equal(levelSha256(m.policyBindings),m.policyToolchainSha256);
   if(m.attempt){assert(!mathIds.has(m.attempt.id));mathIds.add(m.attempt.id);
    assert.deepEqual(await read(path.join(PUBLIC_ATTEMPT_LEDGER,`${m.attempt.id}.request.json`)),m.attempt);
    const mr=await read(path.join(PUBLIC_ATTEMPT_LEDGER,`${m.attempt.id}.result.json`));assert.equal(mr.accepted,m.accepted);assert.equal(mr.status,m.status);
    assert.equal(mr.levelSha256,m.levelSha256);assert.deepEqual(mr.lower,m.lowerBound?.result);assert.deepEqual(mr.upper,m.route?.search);
    const mp=await read(path.join(PUBLIC_ATTEMPT_LEDGER,`${m.attempt.id}.v4-plan.json`));assert.deepEqual(mp.attempt,m.attempt);assert.deepEqual(mp.plan,m.attemptPlan);
    if(m.attempt.lockFile)await absent(m.attempt.lockFile);
    if(!m.accepted){assert(q.terminalBlocked);await read(path.join(PUBLIC_ATTEMPT_LEDGER,`${m.attempt.id}.blocked.json`));await read(path.join(PUBLIC_ATTEMPT_LEDGER,'identities',`${m.attempt.retryIdentitySha256}.blocked.json`));}
   }
   if(m.lowerBound){const lower=m.lowerBound,s=lower.result;assert.deepEqual(inspectSearchAccounting(s,'lower'),[]);
    assert.deepEqual(s.guardAllowance,guardAllowanceFor(s));assert.equal(lower.inputLevelSha256,q.levelSha256);
    const projection=projectionFor(lower,q.level);if(projection)assert.deepEqual(projection,lower.projection);
    assert.equal(s.sourceLevelSha256,projection?.projectedLevelSha256??q.levelSha256);
    row.lower={method:lower.method,status:s.status,floor:s.floor,termination:s.termination,raw:s.rawFullBoardStates,expanded:s.rawExploredStates,
     guardUpper:s.guardAllowance.conservativeFullBoardStateUpperBound,transitions:s.attemptedTransitions,micro:s.microDiscoveredStates,elapsedMilliseconds:s.elapsedMilliseconds};
   }
  }
  if(q.level&&q.drags){
   assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
   const canonical=replayDecorated(runtime,q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
   metricReplay(canonical,q.actualConstructedU,q.drags);metricReplay(independent,q.actualConstructedU,q.drags);
   assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);assert.equal(canonical.clearEvents,independent.clearEvents);
   const old=await descriptor(q.priorBaseline);assert.equal(levelSha256(old.level),q.priorBaseline.levelSha256);
   assert.deepEqual(mechanismInventory(old.level),q.priorBaseline.inventory);
   const strength=auditCapacityIntensity(runtime,q.level,q.drags,q.newestMechanism,q.difficulty,q.priorBaseline.inventory);
   assert.deepEqual(strength,q.strength.participation);assert(strength.passed);
   const staticAudit=await auditV4StaticCandidate(runtime,q);assert(staticAudit.passed,staticAudit.issues.join(';'));assert.equal(staticAudit.levelSha256,q.levelSha256);
   row.freshFullU={complete:true,U:independent.nonClearingDrags,totalDrags:q.drags.length,clearEvents:independent.clearEvents,remainingBodies:0,remainingQueued:0};
   row.strength={passed:true,priorComparison:strength.priorComparison,targets:strength.targets,actualInventory:mechanismInventory(q.level)};
  }
  if(q.accepted){const band=BANDS[q.difficulty],s=q.lowerBound.result;assert(q.mathematicalProof.accepted&&q.design.passed&&q.mechanismStrengthValidated);
   assert.equal(q.L,band.lower);assert(q.U>=q.L&&(band.upper===null||q.U<=band.upper));assert.equal(s.status,'threshold-proven');assert.equal(s.thresholdProven,true);
   assert.equal(s.floor,band.lower);assert.equal(s.termination,'below-threshold-exhausted');assert.equal(q.U,row.freshFullU.U);
   records.push(q);acceptedFiles.push(outcome.file);
  }
  row.status='ACTUAL_RESULT_AUTHENTICATED';row.accepted=q.accepted;row.L=q.L;row.U=q.U;
 }catch(error){row.status='AUDIT_REJECTED';row.issues.push(error.message);errors.push({file:outcome.file,message:error.message});}
 rows.push(row);
}
assert.deepEqual(index.files,[...priorIndex.files,...acceptedFiles]);assert.equal(completion.accepted,acceptedFiles.length);assert.equal(completion.combinedCandidates,records.length);
const diversity=auditV4Diversity(records,runtime.slots);assert.equal(diversity.reasons.length,0);
for(const [p,h]of Object.entries(inputBindings))assert.equal(hash(await fs.readFile(p)),h,`Input changed after audit: ${p}`);
const report={status:errors.length?'INDEPENDENT_ACTUAL_BATCH_AUDIT_REJECTED':'INDEPENDENT_ACTUAL_BATCH_AUDIT_COMPLETE',input,scope:300,
 plannedInputs:13,actualInputs:rows.length,newAccepted:acceptedFiles.length,previousAccepted:126,combinedCandidates:records.length,
 priorSeedCount:116,priorTenByteIdentical:true,priorTenFiles:priorTen,priorBatchAudit:plan.previousAudit,
 acceptedByDifficulty:Object.fromEntries([1,2,3].map(d=>[d,rows.filter(r=>r.accepted&&plan.rows[r.position-1].slot.difficulty===d).length])),
 rows,errors,diversity,inputBindings,environment,currentProductionUIRevalidated:false,
 tool:{path:'tools/daily-challenge/formal-v4/audit-capacity13-completion-independent.mjs',sha256:hash(await fs.readFile('tools/daily-challenge/formal-v4/audit-capacity13-completion-independent.mjs'))},
 lowerSearchInvocations:0,upperSearchInvocations:0,constructionInvocations:0,actualWitnessReplayOnly:true,
 remainingAcceptance:'Accepted results still require actual Canvas review and Pointer natural-clock testing; incomplete 300 cannot replace production.',formalReady:false,productionChanged:false};
await fs.mkdir(output,{recursive:false});await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,inputs:rows.length,newAccepted:report.newAccepted,combined:records.length,errors}));
if(errors.length)process.exitCode=1;

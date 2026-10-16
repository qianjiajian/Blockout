import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {assertIceProofDomain} from '../formal-v3/bounded-ice-proof.mjs';
import {reservedGuardBudget,guardedIceTask} from '../formal-v3/reserved-guard-budget.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {HISTORY_LEDGER_ROOTS,realPathWithSuffix} from './native-batch-io.mjs';

export const EARLY_FROZEN_VERSION='new-stock-original-ice-joint-shared-construction-v1';
export const EARLY_FROZEN_ACCOUNTING='early-frozen-static-shared-v1';
const own='tools/daily-challenge/formal-v4/early-frozen-ice-joint.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const EARLY_FROZEN_BINDING=Object.freeze({path:own,sha256:sha(readFileSync(own))});
const LIMITS={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000};
const PHASES=['placeholderWorldReservations','completedColourWorldReservations','icedWorldReservations'];
function integer(n,label,min=0){assert(Number.isSafeInteger(n)&&n>=min,`Finite integer ${label}`);return n;}
export function assertEarlyFrozenConstructionAccounting(a){
 assert.equal(a?.version,EARLY_FROZEN_ACCOUNTING);
 for(const k of [...PHASES,'completeWorldReservations','transitions','microStates','elapsedMilliseconds'])integer(a[k],k);
 assert.equal(a.completeWorldReservations,PHASES.reduce((n,k)=>n+a[k],0),'All complete static worlds must be charged');
 assert(a.placeholderWorldReservations>=1&&a.completedColourWorldReservations>=1&&a.icedWorldReservations>=1);
 assert(a.completeWorldReservations<=9998,'Keep one registered search world and one terminal allowance');return true;
}

/** Final ice assignment is charged before the full object exists. Earlier
 * placeholder/colour branches (including rejected complete assignments) must
 * come from the bound, independently audited constructor meter. No search. */
export function reserveEarlyFrozenAssignment(plain,iceDeclaration,meter){
 assert(meter&&typeof meter.reserveWorld==='function');
 const ids=new Set(iceDeclaration.regionBlockIds);assert(ids.size&&ids.size===iceDeclaration.regionBlockIds.length);
 assert([1,2,4].includes(iceDeclaration.count));assert(plain.blocks.every(b=>!b.frozen));
 assert([...ids].every(id=>plain.blocks.some(b=>b.id===id)));
 meter.reserveWorld('icedWorldReservations');
 const level=structuredClone(plain);for(const b of level.blocks)if(ids.has(b.id))b.frozen=iceDeclaration.count;
 return level;
}
function stockDomain(level,declaration,qualificationOnly){
 assertIceProofDomain(level);assert(declaration&&Array.isArray(declaration.regionBlockIds));
 assert((qualificationOnly?[1,2,4]:[2,4]).includes(declaration.count),'Production ice count is predeclared 2 or 4');
 const ids=new Set(declaration.regionBlockIds);assert(ids.size>0&&ids.size===declaration.regionBlockIds.length);
 assert([...ids].every(id=>level.blocks.some(b=>b.id===id)));
 for(const b of level.blocks){
  assert.equal(b.frozen,ids.has(b.id)?declaration.count:undefined,'Only declared new region bodies carry this ice');
  const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;
  assert.equal(new Set(b.shape.map(p=>p.join(','))).size,w*h,'This first experiment is solid original-orientation rectangles only');
 }
 assert(level.gates.every(g=>g.frozen===undefined),'First experiment has ordinary exits');
 assert(level.blocks.length-ids.size>=declaration.count,'Enough unfrozen clear inventory is necessary, not a solvability certificate');
}
export function makeEarlyFrozenIcePlan(runtime,candidate,{budget={},floor=31,searchUpper=128,qualificationOnly=false}={}){
 assertV4Runtime(runtime);assert.equal(typeof qualificationOnly,'boolean');
 assert(qualificationOnly?Number.isSafeInteger(floor)&&floor>=1&&floor<=31:floor===31);
 assert(qualificationOnly?Number.isSafeInteger(searchUpper)&&searchUpper>=floor&&searchUpper<=128:searchUpper===128);
 assert(candidate.drags===undefined,'A provided route must not bypass the one declared joint task');
 stockDomain(candidate.level,candidate.iceDeclaration,qualificationOnly);assertEarlyFrozenConstructionAccounting(candidate.constructionAccounting);
 const fullBudget={...LIMITS,...budget};assert(Object.keys(fullBudget).every(k=>k in LIMITS));
 for(const [k,cap]of Object.entries(LIMITS)){integer(fullBudget[k],k,1);assert(fullBudget[k]<=cap,`Hard ${k} limit`);}
 const prior=candidate.constructionAccounting;
 const jointBudget=reservedGuardBudget({...fullBudget,maxStates:fullBudget.maxStates-prior.completeWorldReservations-1,
  maxTransitions:fullBudget.maxTransitions-prior.transitions,maxMicroStates:fullBudget.maxMicroStates-prior.microStates,
  maxMilliseconds:fullBudget.maxMilliseconds-prior.elapsedMilliseconds});
 assert(candidate.constructionEvidence?.path&&/^[a-f0-9]{64}$/.test(candidate.constructionEvidence.sha256??''));
 assert(candidate.plainConstructionEvidence?.path&&/^[a-f0-9]{64}$/.test(candidate.plainConstructionEvidence.sha256??''));
 const executionEnvironment=prefixExecutionEnvironment(runtime,candidate.executionEnvironment);
 return{schemaVersion:4,version:EARLY_FROZEN_VERSION,entry:EARLY_FROZEN_BINDING,qualificationOnly,
  levelSha256:levelSha256(candidate.level),sourceLevelId:candidate.sourceLevelId,
  sourceLevelSha256:qualificationOnly?null:levelSha256(runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId)),
  iceDeclaration:structuredClone(candidate.iceDeclaration),constructionAccounting:structuredClone(prior),
  constructionEvidence:structuredClone(candidate.constructionEvidence),plainConstructionEvidence:structuredClone(candidate.plainConstructionEvidence),executionEnvironment,fullBudget,jointBudget,floor,searchUpper,
  strategy:'one-original-full-ice-joint',jointSearchesMaximum:1,alternativeSearchAllowed:false,failedInputContinuationAllowed:false,
  toolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  mathRuleVersion:runtime.mathRuleVersion,mathRuleSha256:runtime.mathRuleSha256,catalogEligible:false,formalReady:false};
}

/** Exactly one original-opening joint search. No tail state, plain pre-search,
 * native fallback, second lower call, slot reservation or formal admission. */
export async function exploreEarlyFrozenIce(runtime,candidate,{plan,redesignOf,qualificationOnly=false,ledgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 assertV4Runtime(runtime);assert.equal(typeof qualificationOnly,'boolean');
 await assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,ledgerDirectory);
 if(qualificationOnly){const actual=await realPathWithSuffix(ledgerDirectory);for(const root of HISTORY_LEDGER_ROOTS){
  const physical=await realPathWithSuffix(root);assert(actual!==physical&&!actual.startsWith(physical+path.sep),'Private ice fixture aliases shared history');}}
 if(!qualificationOnly)assert.equal(path.resolve(ledgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER));
 assert(plan&&plan.qualificationOnly===qualificationOnly);
 assert.deepEqual(plan,makeEarlyFrozenIcePlan(runtime,candidate,{budget:plan.fullBudget,floor:plan.floor,searchUpper:plan.searchUpper,qualificationOnly}));
 const bytes=await fs.readFile(plan.constructionEvidence.path);assert.equal(sha(bytes),plan.constructionEvidence.sha256,'Construction bytes changed');
 const prior=JSON.parse(bytes);assert.equal(prior.levelSha256,levelSha256(prior.level));assert.equal(prior.levelSha256,plan.levelSha256);
 assert.equal(prior.sourceLevelId,plan.sourceLevelId);assert.deepEqual(prior.iceDeclaration,plan.iceDeclaration);
 assert.deepEqual(prior.constructionAccounting,plan.constructionAccounting);
 assert.deepEqual(prior.plainConstructionEvidence,plan.plainConstructionEvidence);
 const plainBytes=await fs.readFile(plan.plainConstructionEvidence.path);assert.equal(sha(plainBytes),plan.plainConstructionEvidence.sha256,'Original plain construction bytes changed');
 const plain=JSON.parse(plainBytes);assert.equal(plain.levelSha256,levelSha256(plain.level));assert.equal(plain.sourceLevelId,plan.sourceLevelId);
 assert(plain.level.blocks.every(b=>b.frozen===undefined),'Original factory output must still be the plain object');
 const stripped=structuredClone(candidate.level);for(const b of stripped.blocks)if(plan.iceDeclaration.regionBlockIds.includes(b.id))delete b.frozen;
 assert.equal(levelSha256(stripped),plain.levelSha256,'Ice assignment may not relabel or alter the original plain factory object');
 const p=plain.constructionAccounting,a=plan.constructionAccounting;
 assert.equal(p?.version,'late-region-static-construction-v1');
 integer(plain.paint?.accounting?.completeWorldReservations,'Original completed colour worlds',1);
 assert.equal(p.completeWorldReservations,1+plain.paint.accounting.completeWorldReservations);
 assert.equal(a.placeholderWorldReservations,1);assert.equal(a.completedColourWorldReservations,plain.paint.accounting.completeWorldReservations);
 assert.equal(a.icedWorldReservations,1);assert.equal(a.completeWorldReservations,p.completeWorldReservations+1);
 for(const key of ['microStates','transitions'])assert.equal(a[key],p[key],'Exact prior static resources');
 integer(p.elapsedMilliseconds,'Original construction time');assert(a.elapsedMilliseconds>=p.elapsedMilliseconds);
 const sourceBinding=await currentMainlineSourceBinding(runtime,plan.executionEnvironment,candidate.sourceLevelId,{qualificationOnly});
 if(!qualificationOnly){assert.equal(sourceBinding.sourceLevelSha256,plan.sourceLevelSha256);
  assert.equal(boardBaselineSha256(candidate.level),boardBaselineSha256(runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId)));}
 runtime.validateLevel(candidate.level);
 const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const bindings={...runtime.toolchainBindings,[runtime.policyRuntimeBinding.path]:runtime.policyRuntimeBinding.sha256,...plan.executionEnvironment.bindings,...sourceBinding.bindings};
 for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),h=sha(await fs.readFile(p));if(bindings[p])assert.equal(bindings[p],h);bindings[p]=h;}
 assert.equal(bindings[own],EARLY_FROZEN_BINDING.sha256,'Loaded entry differs from compiled bytes');
 for(const [p,h]of Object.entries(runtime.toolchainBindings))assert.equal(sha(await fs.readFile(p)),h);
 const level=structuredClone(candidate.level),ledger=await createAttemptLedger(ledgerDirectory);
 const attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});
 const report={schemaVersion:4,version:EARLY_FROZEN_VERSION,entry:EARLY_FROZEN_BINDING,exploratory:true,qualificationOnly,
  accepted:false,status:'ICE_JOINT_PENDING',catalogEligible:false,formalReady:false,productionChanged:false,
  level,levelSha256:plan.levelSha256,sourceLevelId:candidate.sourceLevelId,plan,attempt,sourceBinding,
  executionEnvironment:plan.executionEnvironment,currentRuntimeValidationClaimed:false,
  toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,designBindings:bindings,designToolchainSha256:levelSha256(bindings),
  policyRuleVersion:runtime.policyRuleVersion,mathRuleVersion:runtime.mathRuleVersion,jointSearchCalls:0,
  proof:null,lowerBound:null,route:null,L:null,U:null,mathematicalEvidenceValidated:false,mechanismStrengthValidated:false,
  designValidated:false,pointerValidated:false,timeValidated:false,reasons:[]};
 let started;
 const wall=()=>plan.constructionAccounting.elapsedMilliseconds+(started===undefined?0:Date.now()-started);
 const wallGuard=()=>{assert(wall()<plan.fullBudget.maxMilliseconds,'shared-construction-joint-deadline');};
 try{
  const file=path.join(ledgerDirectory,`${attempt.id}.v4-early-frozen-plan.json`);
  await fs.writeFile(file,JSON.stringify({attempt,plan,bindings},null,2)+'\n',{flag:'wx'});
  report.planEvidence={path:file,sha256:sha(await fs.readFile(file))};started=Date.now();report.jointSearchCalls=1;
  const result=guardedIceTask(level,runtime,{floor:plan.floor,searchUpper:plan.searchUpper,...plan.jointBudget});report.proof=result;
  report.lowerBound={method:'v3-native-static-ice-joint-search',inputLevelSha256:report.levelSha256,requiredFloor:plan.floor,result};
  assert.equal(result.sourceLevelSha256,report.levelSha256);
  report.sharedAccounting={prior:plan.constructionAccounting,registeredRaw:result.rawFullBoardStates,terminalAllowance:1,
   conservativeFullBoardStateUpperBound:plan.constructionAccounting.completeWorldReservations+result.rawFullBoardStates+1,
   transitions:plan.constructionAccounting.transitions+result.attemptedTransitions,
   microStates:plan.constructionAccounting.microStates+result.microDiscoveredStates,elapsedMilliseconds:wall(),fullBudget:plan.fullBudget};
  assert(report.sharedAccounting.conservativeFullBoardStateUpperBound<=plan.fullBudget.maxStates);
  assert(report.sharedAccounting.transitions<=plan.fullBudget.maxTransitions&&report.sharedAccounting.microStates<=plan.fullBudget.maxMicroStates);
  if(!['threshold-proven','relaxed-shortcut'].includes(result.status)||!Array.isArray(result.drags)){report.status='UNKNOWN_ICE_JOINT_TERMINAL';return report;}
  wallGuard();const canonical=runtime.replayRevisedRoute(level,result.drags);wallGuard();
  const independent=independentReplay(runtime,level,result.drags);wallGuard();
  assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed,'Original complete double replay');
  assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(independent.nonClearingDrags,result.cost);
  assert.equal(canonical.effectiveDrags,result.drags.length);assert.equal(independent.effectiveDrags,result.drags.length);
  assert.equal(canonical.clearEvents,level.blocks.length);assert.equal(independent.clearEvents,level.blocks.length);
  assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
  report.drags=result.drags;report.routeSha256=routeSha256(result.drags);report.U=independent.nonClearingDrags;
  report.route={search:result,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256,canonicalReplay:canonical,independentReplay:independent};
  if(report.U<plan.floor){report.status='ORIGINAL_UPPER_BELOW_DECLARED_FLOOR';return report;}
  if(!(result.status==='threshold-proven'&&result.thresholdProven===true&&result.floor===plan.floor&&result.termination==='below-threshold-exhausted')){
   report.status='ORIGINAL_ICE_LOWER_NOT_PROVEN';return report;}
  report.accepted=true;report.L=plan.floor;report.mathematicalEvidenceValidated=true;
  report.status='EXPLORATORY_ORIGINAL_ICE_JOINT_LU';return report;
 }catch(error){report.status='ICE_JOINT_REJECTED';report.reasons.push(error.message);return report;}
 finally{
  if(report.sharedAccounting)report.sharedAccounting.elapsedMilliseconds=wall();
  if(levelSha256(level)!==plan.levelSha256){report.accepted=false;report.status='ICE_JOINT_INPUT_CHANGED';}
  for(const [p,h]of Object.entries({...bindings,[plan.constructionEvidence.path]:plan.constructionEvidence.sha256,[plan.plainConstructionEvidence.path]:plan.plainConstructionEvidence.sha256}))if(await fs.readFile(p).then(sha).catch(()=>null)!==h){report.accepted=false;report.status='ICE_JOINT_BINDING_CHANGED';report.reasons.push(p);}
  report.redesignRequired=!report.accepted;if(!report.accepted)report.mathematicalEvidenceValidated=false;
  report.catalogEligible=false;report.formalReady=false;
  report.evidenceFile=path.join(ledgerDirectory,`${attempt.id}.v4-early-frozen-result.json`);
  await fs.writeFile(report.evidenceFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await ledger.finish(attempt,report);
 }
}

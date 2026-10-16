import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {assertV4Runtime,FROZEN_MATH_SHA} from './runtime.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';

export const ACCEPTED_LOW_BAND_BASE_VERSION='audited-fixed-plan-low-band-original-receipt-v1';
const own='tools/daily-challenge/formal-v4/accepted-low-band-batch-base.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const equal=(a,b,message)=>assert.equal(levelSha256(a),levelSha256(b),message);
const present=async file=>fs.stat(file).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const positive=n=>Number.isSafeInteger(n)&&n>0;

function searchAccounting(s){
 assert(s&&s.budget&&positive(s.budget.maxStates)&&s.budget.maxStates<=9999,'Missing bounded search');
 for(const key of ['rawFullBoardStates','rawExploredStates','attemptedTransitions','microDiscoveredStates','microExploredStates'])
  assert(Number.isSafeInteger(s[key])&&s[key]>=0,`Invalid search counter ${key}`);
 assert.equal(s.discoveredStates,s.rawFullBoardStates);assert.equal(s.visitedStates,s.rawFullBoardStates);
 assert.equal(s.exploredStates,s.rawExploredStates);assert(s.rawExploredStates<=s.rawFullBoardStates&&s.rawFullBoardStates<=s.budget.maxStates);
 assert(s.attemptedTransitions<=s.budget.maxTransitions&&s.budget.maxTransitions<=10000000);
 assert(s.microExploredStates<=s.microDiscoveredStates&&s.microDiscoveredStates<=s.budget.maxMicroStates&&s.budget.maxMicroStates<=3000000);
 const g=s.guardAllowance;assert(g&&g.version==='raw-set-9999-plus-one-terminal-candidate-v1');
 assert.equal(g.registeredRawSetStates,s.rawFullBoardStates);assert.equal(g.registeredExpandedStates,s.rawExploredStates);
 assert.equal(g.registeredSetBudget,s.budget.maxStates);assert.equal(g.unregisteredTerminalWorldAllowance,1);
 assert.equal(g.conservativeFullBoardStateUpperBound,s.rawFullBoardStates+1);assert(g.conservativeFullBoardStateUpperBound<=10000);
 assert.equal(g.frozenProofToolchainSha256,FROZEN_MATH_SHA);
}
function completeReplay(r,base,independent=false){
 assert(r?.valid===true&&r.complete===true&&!r.failed,'Incomplete original witness');
 assert.equal(r.nonClearingDrags,base.U);assert.equal(r.effectiveDrags,base.drags.length);
 if(independent){assert.equal(r.remainingBodies,0);assert.equal(r.remainingQueued,0);}
}

/** Pure structural check for tests and audit consumers. It does not establish
 * provenance by itself; production callers must use assertAcceptedLowBandBase. */
export function inspectAcceptedLowBandLinkage(base,{request,result,sidecar,planRecord}){
 assert.equal(base.version,'low-band-fixed-prefix-one-capped-tail-original-lower-v1');
 assert.equal(base.status,'EXPLORATORY_PREFIX_TAIL_FULL_ORIGINAL_LU');
 assert(base.accepted===true&&base.mathematicalEvidenceValidated===true&&base.qualificationOnly===false);
 assert.equal(base.catalogEligible,false);assert.equal(base.formalReady,false);
 const band={1:{lower:16,upper:20},2:{lower:21,upper:30}}[base.targetDifficulty];assert(band,'Only fixed D1/D2 original receipts');
 assert.equal(base.difficulty,base.targetDifficulty);assert(positive(base.sourceLevelId),'Real mainline source id required');
 assert.equal(base.levelSha256,levelSha256(base.level));assert.equal(base.routeSha256,routeSha256(base.drags));
 assert.equal(base.L,band.lower);assert(Number.isSafeInteger(base.U)&&base.U>=band.lower&&base.U<=band.upper);
 equal(request,base.attempt,'Complete public request differs');assert.equal(request.levelSha256,base.levelSha256);
 assert(result.accepted===true&&result.levelSha256===base.levelSha256&&result.status===base.status,'Public result differs');
 assert.equal(result.upper,null,'Prefix-tail witness is not a public upper search');assert.equal(base.route.search,null);
 equal(result.lower,base.lowerBound.result,'Public original lower differs');equal(base.proof,base.lowerBound.result,'Proof alias differs');
 for(const [key,value]of Object.entries(sidecar))equal(value,base[key],`Full historical sidecar differs: ${key}`);
 for(const key of ['level','drags','plan','attempt','upperConstruction','upperAccounting','lowerBound','route','L','U','accepted','status'])
  assert(Object.hasOwn(sidecar,key),`Incomplete historical sidecar: ${key}`);
 equal(planRecord.attempt,request);equal(planRecord.plan,base.plan);equal(planRecord.bindings,base.designBindings);
 assert.equal(routeSha256(planRecord.prefixDrags),base.plan.prefixSha256);
 assert.equal(base.plan.levelSha256,base.levelSha256);assert.equal(base.plan.floor,band.lower);assert.equal(base.plan.band.floor,band.lower);assert.equal(base.plan.band.upper,band.upper);
 assert.equal(base.plan.targetDifficulty,base.targetDifficulty);assert.equal(base.plan.tailSearchesMaximum,1);
 for(const k of ['alternativePrefixOrFullUpperSearchAllowed','failedInputContinuationAllowed','bandChangeAfterClaimAllowed'])assert.equal(base.plan[k],false);
 const lower=base.lowerBound;assert.equal(lower.method,'v3-plain');assert.equal(lower.inputLevelSha256,base.levelSha256);
 assert.equal(lower.requiredFloor,band.lower);assert.equal(lower.result.floor,band.lower);assert.equal(lower.result.sourceLevelSha256,base.levelSha256);
 assert(lower.result.thresholdProven===true&&lower.result.status==='threshold-proven'&&lower.result.termination==='below-threshold-exhausted');
 searchAccounting(lower.result);
 const upper=base.upperConstruction;assert(upper.valid===true&&upper.complete===true&&upper.lowerBoundClaimed===false);
 assert.equal(upper.levelSha256,base.levelSha256);assert.equal(upper.prefixSha256,base.plan.prefixSha256);
 assert.equal(upper.tailSearches,1);assert.equal(upper.U,base.U);equal(upper.drags,base.drags);
 assert.equal(upper.routeSha256,base.routeSha256);equal(upper.plan,base.plan.innerPlan);
 assert.equal(upper.tailLevelSha256,levelSha256(upper.tailLevel));assert.equal(upper.tailSearch.sourceLevelSha256,upper.tailLevelSha256);
 searchAccounting(upper.tailSearch);
 const a=base.upperAccounting;equal(a.prior,base.plan.constructionAccounting);assert(positive(a.prior.completeWorldReservations));
 assert.equal(a.knownPrefix,planRecord.prefixDrags.length+1);assert.equal(a.knownPrefix,upper.prefixCommittedWorldUpperBound);
 assert.equal(a.tailRegistered,upper.tailSearch.rawFullBoardStates);assert.equal(a.terminalAllowance,1);
 assert.equal(a.conservativeFullBoardStateUpperBound,a.prior.completeWorldReservations+a.knownPrefix+a.tailRegistered+1);
 assert.equal(a.conservativeFullBoardStateUpperBound,a.prior.completeWorldReservations+upper.conservativeFullBoardStateUpperBound);
 assert.equal(a.maximum,base.plan.fullUpperBudget.maxStates);assert(a.maximum<=10000&&a.conservativeFullBoardStateUpperBound<=a.maximum);
 assert.equal(a.exactCountClaimed,false);
 assert.equal(base.route.inputLevelSha256,base.levelSha256);assert.equal(base.route.routeSha256,base.routeSha256);
 completeReplay(base.route.canonicalReplay,base);completeReplay(base.route.independentReplay,base,true);
 completeReplay(upper.canonical,base);completeReplay(upper.independent,base,true);
 return{levelSha256:base.levelSha256,routeSha256:base.routeSha256,L:base.L,U:base.U,
  upperWorlds:a.conservativeFullBoardStateUpperBound,lowerWorlds:lower.result.guardAllowance.conservativeFullBoardStateUpperBound};
}

/** Read-only admission of one exact plan-bound, independently audited plain receipt as mechanism
 * design inputs. No new receipt is minted, no ledger is claimed or migrated,
 * and the old lower proof is never replayed as a solver invocation. A caller
 * still needs the shared construction lock, final changed-mechanism identity,
 * full actual U, fresh final-object L, slot strength and current selection audit. */
export async function assertAcceptedLowBandBase(runtime,descriptor,{independentAudit,qualificationOnly=false,
 publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,constructionLedgerDirectory=CONSTRUCTION_LEDGER}={}){
 assertV4Runtime(runtime);assert.equal(typeof qualificationOnly,'boolean');
 if(qualificationOnly)await assertConstraintLedgerNamespace(true,constructionLedgerDirectory,publicLedgerDirectory);
 else{assert.equal(path.resolve(publicLedgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER));assert.equal(path.resolve(constructionLedgerDirectory),path.resolve(CONSTRUCTION_LEDGER));}
 assert(independentAudit?.path&&/^[a-f0-9]{64}$/.test(independentAudit.sha256??''),'Fixed independent actual audit descriptor required');
 assert(descriptor?.path&&/^[a-f0-9]{64}$/.test(descriptor.sha256??''),'Fixed exact accepted base descriptor required');
 const expected=descriptor;
 const fileBindings={};
 async function read(file,digest){const bytes=await fs.readFile(file),actual=sha(bytes);if(digest)assert.equal(actual,digest,`Evidence bytes changed: ${file}`);
  if(fileBindings[file])assert.equal(fileBindings[file],actual);fileBindings[file]=actual;return JSON.parse(bytes);}
 const audit=await read(independentAudit.path,independentAudit.sha256);
 assert.equal(audit.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(audit.errors,[]);assert.equal(audit.newSearches,0);
 const record=audit.results.find(r=>path.resolve(r.file)===path.resolve(expected.path));assert(record?.accepted===true&&record.sha256===expected.sha256);
 const base=await read(expected.path,expected.sha256),completion=await read(audit.completion.path,audit.completion.sha256);
 assert(completion.results.some(r=>path.resolve(r.file)===path.resolve(expected.path)&&r.sha256===expected.sha256&&r.accepted===true));
 assert.equal(audit.newLedgerClaims??audit.publicClaimsStarted??0,0);
 const originalPublic=PUBLIC_ATTEMPT_LEDGER;
 async function ledgerRead(suffix){const original=path.join(originalPublic,`${base.attempt.id}${suffix}`),file=path.join(publicLedgerDirectory,`${base.attempt.id}${suffix}`);
  const boundPath=path.resolve(audit.executionWorkspace,original),digest=audit.fileBindings[boundPath];
  assert(digest,`Missing independent binding ${boundPath}`);return read(file,digest);}
 const request=await ledgerRead('.request.json'),result=await ledgerRead('.result.json');
 const sidecar=await ledgerRead('.v4-low-band-prefix-tail-result.json'),planRecord=await ledgerRead('.v4-low-band-prefix-tail-plan.json');
 assert.equal(path.resolve(base.evidenceFile),path.resolve(originalPublic,`${base.attempt.id}.v4-low-band-prefix-tail-result.json`));
 assert.equal(path.resolve(base.planEvidence.path),path.resolve(originalPublic,`${base.attempt.id}.v4-low-band-prefix-tail-plan.json`));
 assert.equal(fileBindings[path.join(publicLedgerDirectory,`${base.attempt.id}.v4-low-band-prefix-tail-plan.json`)],base.planEvidence.sha256);
 const facts=inspectAcceptedLowBandLinkage(base,{request,result,sidecar,planRecord});
 assert.equal(record.levelSha256,facts.levelSha256);assert.equal(record.sourceLevelId,base.sourceLevelId);
 if(record.targetDifficulty!==undefined)assert.equal(record.targetDifficulty,base.difficulty);assert.equal(record.L,facts.L);assert.equal(record.U,facts.U);
 equal(base.toolchainBindings,runtime.toolchainBindings);assert.equal(base.toolchainSha256,FROZEN_MATH_SHA);
 assert.equal(base.policyRuleVersion,runtime.policyRuleVersion);assert.equal(base.policyRuleSha256,runtime.policyRuleSha256);
 assert.equal(base.mathRuleVersion,runtime.mathRuleVersion);assert.equal(base.mathRuleSha256,runtime.mathRuleSha256);
 assert.equal(base.designToolchainSha256,levelSha256(base.designBindings));
 for(const [file,digest]of Object.entries({...base.toolchainBindings,...base.designBindings})){
  assert.equal(sha(await fs.readFile(file)),digest,`Original dependency changed: ${file}`);fileBindings[file]=digest;}
 await read(base.plan.constructionEvidence.path,base.plan.constructionEvidence.sha256);
 await read(base.input.path,base.input.sha256);
 const source=runtime.LEVELS.find(l=>l.id===base.sourceLevelId);assert(source&&levelSha256(source)===base.plan.sourceLevelSha256,'Mainline source changed');
 const f=designFingerprints(base.level),identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
 assert.equal(request.retryIdentitySha256,identity);assert.equal(request.shapeSha256,f.shapeSha256);assert.equal(request.colorSha256,f.colorSha256);
 const identityFile=path.join(publicLedgerDirectory,'identities',`${identity}.json`),recorded=await read(identityFile);
 assert.equal(recorded.origin,request.identityOrigin);assert.equal(recorded.origin,request.id,'These exact original accepted inputs must own their physical identity');
 const absenceChecks=[path.join(publicLedgerDirectory,'identities',`${identity}.blocked.json`),
  path.join(publicLedgerDirectory,`${request.id}.blocked.json`),path.join(publicLedgerDirectory,`${request.id}.revalidation.lock`),
  path.join(constructionLedgerDirectory,'identities',`${identity}.json`),path.join(constructionLedgerDirectory,'identities',`${identity}.blocked.json`),
  path.join(constructionLedgerDirectory,'aliases',`${identity}.json`),path.join(constructionLedgerDirectory,`${request.id}.request.json`)];
 for(const file of absenceChecks)assert(!(await present(file)),`Base already failed, pending or used for mechanism construction: ${file}`);
 const canonical=runtime.replayRevisedRoute(base.level,base.drags),independent=independentReplay(runtime,base.level,base.drags);
 completeReplay(canonical,base);completeReplay(independent,base,true);
 fileBindings[own]=sha(await fs.readFile(own));
 return{version:ACCEPTED_LOW_BAND_BASE_VERSION,status:'AUDITED_LOW_BAND_BASE_READY_FOR_ONE_MECHANISM_CONSTRUCTION',
  base,baseReceipt:{...expected},mechanismBaseReceipt:{...expected},independentMathematicsAudit:{...independentAudit},
  facts,canonicalReplay:canonical,independentReplay:independent,fileBindings,absenceChecks,qualificationOnly,
  acceptedPlainMathematicsUnchanged:true,newSearches:0,newLedgerClaims:0,ledgerWrites:0,
  mechanismObjectValidated:false,slotAccepted:false,catalogEligible:false,currentRuntimeValidationClaimed:false};
}

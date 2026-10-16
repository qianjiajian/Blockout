import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {assertNewShellFirstSourceProvidedReceiptV198,assertShellFirstSourceNullParentV198} from './shell-first-source-provided-qualification-metadata-v198.mjs';
import {VERSION as EXECUTION_VERSION,assertCompactShellFirstSourcePreflightV198,assertCompactShellFirstSourceFreshV198,authoredShellFirstSourceProvidedMathOptionsV198} from './compact-shell-first-source-provided-v198.mjs';
import {assertCompactFirstSourceHistoryMetadataV198,assertCompactFirstSourceProvidedConstructionMetadataV198} from './compact-shell-first-source-provided-execution-evidence-v198.mjs';
import {VERSION as QUALIFICATION_VERSION,assertCompactShellFirstSourceProvidedQualificationConfigV198} from './qualify-compact-shell-first-source-provided-v198.mjs';

// Metadata tests only. Read real immutable source/index/input bytes. No model,
// replay, search, qualification call/output, claimed input or registry write.
const clone=x=>structuredClone(x),hash=b=>createHash('sha256').update(b).digest('hex');
const bound=(path,sha256)=>{const b=fs.readFileSync(path);assert.equal(hash(b),sha256);return JSON.parse(b);};
const base='deliverables/daily-formal-v4-20261008/';
const inputDescriptor={path:base+'design/shell-d2-06-source51-new-01/input.json',sha256:'aaaff6db273d169fd4bbb19f4d5c23e98a1435135160e5a44b32cf9ca388209b'};
const input=bound(inputDescriptor.path,inputDescriptor.sha256);
const index=bound(base+'design/shell-d2-05-source80-new-06-execution-01/successor-index.json','900007f8ab6c39b64354e8c958ff4756df7b6ee5727c5f8e7ab2b207780f89fa');
const source=bound(input.designBase.path,input.designBase.sha256);
const fresh=assertCompactShellFirstSourceFreshV198(index,input,input.designBase,source);
const parentOnly=()=>({attempt:{redesignOf:null},attemptPlan:{redesignOf:null,mechanismBaseReceipt:null,acceptedBaseMechanismAdaptationRequested:false,sameExactObjectRevalidationAllowed:false}});
const preflight=()=>({version:EXECUTION_VERSION,newInputs:1,newSearches:0,failedParentId:null,failedParentReceipt:null,firstSourceHistory:clone(fresh.firstSourceHistory),mathOptions:authoredShellFirstSourceProvidedMathOptionsV198()});

test('first-source parent boundary accepts only explicit null in both original records',()=>assert.equal(assertShellFirstSourceNullParentV198(parentOnly()),true));
for(const[name,change]of[
 ['missing plan parent',x=>delete x.attemptPlan.redesignOf],['missing request parent',x=>delete x.attempt.redesignOf],
 ['fabricated failed plan parent',x=>x.attemptPlan.redesignOf='0'.repeat(64)],['real-looking failed ledger parent',x=>x.attempt.redesignOf='a'.repeat(64)],
 ['accepted mechanism base',x=>x.attemptPlan.mechanismBaseReceipt=input.designBase],['accepted adaptation flag',x=>x.attemptPlan.acceptedBaseMechanismAdaptationRequested=true],
 ['object revalidation',x=>x.attemptPlan.sameExactObjectRevalidationAllowed=true],['revalidation request',x=>x.attempt.revalidates='a'.repeat(64)],
 ['accepted-base result',x=>x.acceptedBaseAdaptation={}],['failed-mechanism exception',x=>x.failedMechanismParent={}],
])test('first-source parent boundary rejects '+name,()=>{const x=parentOnly();change(x);assert.throws(()=>assertShellFirstSourceNullParentV198(x));});

test('an authentic accepted retry receipt cannot enter the first-source receipt verifier',()=>{
 const retry=bound(base+'design/shell-d2-05-source80-new-06-execution-01/candidate.json','4c6b54c398328466e84a76044a3c4499672e42491f52725b121694a63692d495');
 assert.equal(retry.accepted,true);assert.equal(retry.attemptPlan.redesignOf,'8e064fdf1153d35bcdb228e3a8118a643149a0754e9a84ac7732a32a92b598ba');
 assert.throws(()=>assertNewShellFirstSourceProvidedReceiptV198(retry));
});

test('first-source plan keeps the original single projected budget and omits redesign option',()=>{
 const p=preflight();assert.equal(assertCompactShellFirstSourcePreflightV198(p),p);assert(!Object.hasOwn(p.mathOptions,'redesignOf'));
 assert.equal(p.mathOptions.lowerBudget.maxStates,9999);assert.equal(p.mathOptions.routeBudget.maxStates,1);
});
for(const[name,change]of[
 ['other execution version',p=>p.version='compact-shell-provided-route-projected-lower-v198-v1'],
 ['larger lower budget',p=>p.mathOptions.lowerBudget.maxStates=10000],['larger upper budget',p=>p.mathOptions.routeBudget.maxStates=2],
 ['native lower switch',p=>p.mathOptions.lowerStrategy='native'],['fallback switch',p=>p.mathOptions.fallback=true],
 ['non-null parent option',p=>p.mathOptions.redesignOf='b'.repeat(64)],['null redesign option still supplied',p=>p.mathOptions.redesignOf=null],
 ['accepted base bypass',p=>p.mechanismBaseReceipt=input.designBase],['revalidation bypass',p=>p.allowRevalidation=true],
 ['qualification-only bypass',p=>p.qualificationOnly=true],['invented approval bypass',p=>p.firstInputApproved=true],
])test('first-source plan rejects '+name,()=>{const p=preflight();change(p);assert.throws(()=>assertCompactShellFirstSourcePreflightV198(p));});

const historyFixture=()=>({p:preflight(),start:{firstSourceHistory:clone(fresh.firstSourceHistory)},done:{failedParentId:null,firstSourceHistory:clone(fresh.firstSourceHistory)}});
const checkHistory=x=>assertCompactFirstSourceHistoryMetadataV198(index,input,input.designBase,source,x.p,x.start,x.done);
test('real source51 index/reference history is recomputed and binds all three original metadata copies',()=>{
 const result=checkHistory(historyFixture());assert.equal(result.firstSourceHistory.sourceLevelId,51);assert.equal(result.firstSourceHistory.failedCount,0);
 assert(result.firstSourceHistory.sourceWorlds.length>0);assert(result.firstSourceHistory.matchedRecords.length>0);assert.equal(result.parent,null);
});
for(const[name,change]of[
 ['preflight source substituted',x=>x.p.firstSourceHistory.sourceLevelId=80],['start alias evidence dropped',x=>x.start.firstSourceHistory.matchedRecords=[]],
 ['completion source world dropped',x=>x.done.firstSourceHistory.sourceWorlds=[]],['completion changed history head',x=>x.done.firstSourceHistory.historyHeadSha256='c'.repeat(64)],
 ['preflight invented failed receipt',x=>x.p.failedParentReceipt=inputDescriptor],['completion invented failed id',x=>x.done.failedParentId='d'.repeat(64)],
])test('first-source history rejects '+name,()=>{const x=historyFixture();change(x);assert.throws(()=>checkHistory(x));});

const fixtureDescriptor={path:base+'proof/nonexistent-first-source-qualification-metadata-test.json',sha256:'a'.repeat(64)};
const closureFixture=()=>({claim:{plan:fixtureDescriptor,qualificationOnly:false,failedPlanContinuationAllowed:false},closed:{plan:fixtureDescriptor,status:'COMPACT_SHELL_FIRST_SOURCE_PROVIDED_CONSTRUCTION_CLOSED',experimentId:'metadata-only',closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1,qualificationOnly:false,catalogEligible:false,formalReady:false,mathematicalAcceptance:false,formedWorldFiles:[inputDescriptor],receipts:[fixtureDescriptor]}});
const checkClosure=x=>assertCompactFirstSourceProvidedConstructionMetadataV198(x.claim,x.closed,fixtureDescriptor,inputDescriptor,fixtureDescriptor,'metadata-only');
test('first-source closure keeps construction separate from mathematical acceptance',()=>checkClosure(closureFixture()));
for(const[name,change]of[
 ['retry closure version',x=>x.closed.status='COMPACT_SHELL_PROVIDED_CONSTRUCTION_CLOSED'],['mathematical award',x=>x.closed.mathematicalAcceptance=true],
 ['restart enabled',x=>x.closed.restartAllowed=true],['additional input',x=>x.closed.maximumInputs=2],['lost formed input',x=>x.closed.formedWorldFiles=[]],
])test('first-source closure rejects '+name,()=>{const x=closureFixture();change(x);assert.throws(()=>checkClosure(x));});

test('qualification config requires the new version and retains every existing evidence descriptor',()=>{
 const keys=['candidate','rootDesign','pointer','visual','completion','mechanismReview','successorIndex','successorIndexReview','compatibilityReview'];
 const c={version:QUALIFICATION_VERSION,...Object.fromEntries(keys.map(k=>[k,fixtureDescriptor])),output:base+'proof/nonexistent-first-source-qualification-output-test.json'};
 assert.equal(assertCompactShellFirstSourceProvidedQualificationConfigV198(c),c);
 for(const change of [x=>x.version='compact-shell-provided-current-ui-qualification-v198-v1',x=>delete x.compatibilityReview,x=>x.skipFreshness=true]){const x=clone(c);change(x);assert.throws(()=>assertCompactShellFirstSourceProvidedQualificationConfigV198(x));}
});

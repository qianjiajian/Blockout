import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {SHELL_SEARCH_BUDGET,SHELL_SEARCH_LIMITS,authoredShellMathOptionsV198,assertShellMathOptionsV198,accountShellSearchReceiptV198} from './shell-search-budget-v198.mjs';
import {PINS,VERSION,assertShellHistoryPinsReadyV198,assertAuthoredShellOnceConfigV198,assertShellNativeSelectionV198,runAuthoredShellOnceV198} from './run-authored-shell-once-v198.mjs';

// Private metadata only: no valid LevelSpec, real coordinates, model, history,
// replay, search, claim or rendering is constructed/executed by these tests.
const sha='a'.repeat(64),parent='b'.repeat(64),desc=()=>({path:'private-metadata-only.json',sha256:sha});
const clone=structuredClone;
const target={formalId:'daily-mechanisms-multilayer-shell-15-d1-01',stageKey:'mechanisms-multilayer-shell-15',difficulty:1,slot:1,sourceLevelId:7};
const candidate=()=>({...target,newestMechanism:'multilayer-shell',unlockLevel:15,accepted:false,formalReady:false,level:{blocks:[{layers:['orange','cyan']} ]},L:null,U:null});
const config=()=>({version:VERSION,experimentId:'private-metadata-test',input:desc(),inputCorrection:null,staticPreflight:desc(),staticVisualEvidence:desc(),staticIndependentReview:desc(),rootVisualReview:desc(),runnerReview:desc(),target:{...target},sourceReference:desc(),failedParentReceipt:desc(),historyReport:desc(),formalRegistry:desc(),designPool:desc(),unsealedHistory:desc(),outputDirectory:'deliverables/daily-formal-v4-20261008/design/private-metadata-not-created'});
const plan=()=>({strategy:{route:'native',lower:'projected-plain'},upperBudget:{...SHELL_SEARCH_BUDGET},lowerBudget:{...SHELL_SEARCH_BUDGET},searchUpper:128,redesignOf:parent,providedRouteSha256:null,mechanismBaseReceipt:null,acceptedBaseMechanismAdaptationRequested:false,sameExactObjectRevalidationAllowed:false,formedBeforeClaim:true,difficultyPolicyVersion:'1.198.0'});
function search(raw=4999){return{budget:{...SHELL_SEARCH_BUDGET},rawFullBoardStates:raw,rawExploredStates:raw,discoveredStates:raw,visitedStates:raw,exploredStates:raw,witnessFound:true,
 guardAllowance:{version:'raw-set-9999-plus-one-terminal-candidate-v1',wrapper:{path:'tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',sha256:'9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3'},frozenProofToolchainSha256:'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804',registeredRawSetStates:raw,registeredExpandedStates:raw,registeredSetBudget:4999,unregisteredTerminalWorldAllowance:1,conservativeFullBoardStateUpperBound:raw+1,hardWholeBoardLimit:10000,exactFullBoardVisitedCountClaimed:false,terminalBehavior:'first-unregistered-world-throws-and-immediately-returns-no-recovery-or-continuation'}};}
function receipt(){return{accepted:true,status:'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER',attempt:{id:sha},attemptPlan:plan(),levelSha256:sha,band:{lower:13,upper:23},L:13,U:19,route:{search:search()},lowerBound:{method:'v3-opening-outer-bodies-inventory-erasure-v1',inputLevelSha256:sha,projection:{method:'opening-outer-bodies-inventory-erasure-v1',sourceLevelSha256:sha,upperBoundTransfer:false},result:{...search(),status:'threshold-proven',thresholdProven:true,floor:13,termination:'below-threshold-exhausted'}}};}
const account=q=>accountShellSearchReceiptV198(q,{entered:true,returned:true,failedParentId:parent});

test('fixed two-search preallocation and native replay maxima',()=>{
 assert.equal(SHELL_SEARCH_BUDGET.maxStates,4999);assert.equal(SHELL_SEARCH_LIMITS.combinedFullWorldsMaximum,10000);
 assert.equal(SHELL_SEARCH_LIMITS.jointCallsMaximum,0);assert.equal(SHELL_SEARCH_LIMITS.totalSearchCallsMaximum,2);assert.equal(SHELL_SEARCH_LIMITS.upperInternalCanonicalReplaysMaximum,1);
 assertShellMathOptionsV198(authoredShellMathOptionsV198(parent),parent);
});
for(const [name,mutate] of [
 ['upper state ceiling',o=>o.routeBudget.maxStates=5000],['lower state ceiling',o=>o.lowerBudget.maxStates=5000],
 ['borrow unused upper budget',o=>{o.routeBudget.maxStates=4998;o.lowerBudget.maxStates=5000;}],['fallback route',o=>o.routeStrategy='auto'],
 ['accepted parent exception',o=>o.mechanismBaseReceipt=desc()],['different failed parent',o=>o.redesignOf=sha],['new options',o=>o.retry=true],
])test('options reject '+name,()=>{const o=authoredShellMathOptionsV198(parent);mutate(o);assert.throws(()=>assertShellMathOptionsV198(o,parent));});
test('two actual receipts consume conservative 5000 plus 5000, not joint',()=>{const a=account(receipt());assert.equal(a.totalSearchCalls,2);assert.equal(a.registeredRawSetStatesSum,9998);assert.equal(a.conservativeFullWorlds,10000);assert.equal(a.jointMathematicalCalls,0);});
for(const [name,mutate] of [
 ['oversized raw count',q=>q.route.search.rawFullBoardStates=5000],['quotient substituted for raw',q=>q.lowerBound.result.discoveredStates=100],
 ['guard budget enlarged',q=>q.route.search.guardAllowance.registeredSetBudget=9999],['guard candidate omitted',q=>q.route.search.guardAllowance.unregisteredTerminalWorldAllowance=0],
 ['missing guard',q=>delete q.lowerBound.result.guardAllowance],['missing upper',q=>delete q.route.search],['missing lower',q=>delete q.lowerBound],
 ['projected upper transfer',q=>q.lowerBound.projection.upperBoundTransfer=true],['wrong source domain',q=>q.lowerBound.projection.sourceLevelSha256=parent],
 ['wrong lower method',q=>q.lowerBound.method='v3-plain-joint-search'],['floor below target',q=>q.lowerBound.result.floor=12],
 ['partial lower',q=>q.lowerBound.result.thresholdProven=false],['unknown termination',q=>q.lowerBound.result.termination='deadline'],
 ['nonfinite U',q=>q.U=Infinity],['U over band',q=>q.U=24],['old budget plan',q=>q.attemptPlan.upperBudget.maxStates=9999],
 ['borrowed route plan',q=>q.attemptPlan.providedRouteSha256=sha],['different wrapper',q=>q.route.search.guardAllowance.wrapper.sha256=sha],
])test('receipt rejects '+name,()=>{const q=receipt();mutate(q);assert.throws(()=>account(q));});
for(const status of ['UNKNOWN_UPPER','UNSUPPORTED_UPPER','REJECTED_ORIGINAL_ROUTE','COUNTEREXAMPLE_BELOW_BAND','UNKNOWN_UPPER_WITHIN_BAND'])test(status+' records no lower invocation',()=>{
 const q=receipt();q.accepted=false;q.status=status;delete q.lowerBound;const a=account(q);assert.equal(a.upper.calls,1);assert.equal(a.lower.calls,0);assert.equal(a.totalSearchCalls,1);assert.equal(a.conservativeFullWorlds,5000);
});
test('normal early return cannot conceal lower invocation',()=>{const q=receipt();q.accepted=false;q.status='UNKNOWN_UPPER';assert.throws(()=>account(q));});
test('caught error with no saved search remains unknown',()=>{const q=receipt();q.accepted=false;q.status='INVALID_ATTEMPT';delete q.route;delete q.lowerBound;const a=account(q);assert.equal(a.upper,null);assert.equal(a.lower,null);assert.equal(a.totalSearchCalls,null);assert.equal(a.conservativeFullWorlds,null);assert.equal(a.combinedFullWorldsMaximum,10000);});
test('caught lower error preserves upper and does not invent lower zero',()=>{const q=receipt();q.accepted=false;q.status='INVALID_ATTEMPT';delete q.lowerBound;const a=account(q);assert.equal(a.upper.calls,1);assert.equal(a.lower,null);assert.equal(a.totalSearchCalls,null);});
test('outer rejection remains unknown, even without original receipt',()=>{const a=accountShellSearchReceiptV198(null,{entered:true,returned:false,failedParentId:parent});assert.equal(a.totalSearchCalls,null);assert.equal(a.conservativeFullWorlds,null);});
test('proven pre-call exit alone counts zero',()=>{const a=accountShellSearchReceiptV198(null,{entered:false,returned:false,failedParentId:parent});assert.equal(a.totalSearchCalls,0);assert.equal(a.conservativeFullWorlds,0);});
for(const status of ['BLOCKED_STATIC','UNSUPPORTED_ROUTE_DOMAIN'])test(status+' before public claim counts zero',()=>{const q=receipt();q.status=status;q.accepted=false;delete q.attempt;delete q.route;delete q.lowerBound;assert.equal(account(q).totalSearchCalls,0);});
test('valid shell slot metadata and config accepted',()=>{assertAuthoredShellOnceConfigV198(config());assertShellNativeSelectionV198(candidate(),target,{route:'native',lower:'projected-plain'});});
for(const field of ['drags','routeSha256','timeSchedule','timeScheduleSha256','proof','lowerBound','route','mathematicalEvidence'])test('new input refuses existing '+field,()=>{const q=candidate();q[field]={privateMetadataOnly:true};assert.throws(()=>assertShellNativeSelectionV198(q,target,{route:'native',lower:'projected-plain'}));});
test('plain metadata cannot masquerade as shell',()=>{const q=candidate();q.level={blocks:[{layers:['orange']}]};assert.throws(()=>assertShellNativeSelectionV198(q,target,{route:'native',lower:'projected-plain'}));});
test('wrong stage/slot and missing render descriptor refused',()=>{for(const f of [c=>c.target.stageKey='basic-combined',c=>c.target.slot=2,c=>delete c.staticVisualEvidence,c=>c.inputCorrection=desc()]){const c=config();f(c);assert.throws(()=>assertAuthoredShellOnceConfigV198(c));}});
test('pending real history pins reject before even reading an invalid config',async()=>{assert.equal(PINS.checkpoint.sha256,'PENDING');assert.throws(()=>assertShellHistoryPinsReadyV198(),/PENDING/);await assert.rejects(runAuthoredShellOnceV198(null),/PENDING/);});
test('original basic runner and frozen guard stay byte-identical',()=>{
 for(const[p,h]of [['tools/daily-challenge/formal-v4/run-authored-basic-once-v198.mjs','5ba112934b33bbe2cddf006655581c162bf6aee408b048f94e34b6dc947e1769'],['tools/daily-challenge/formal-v3/reserved-guard-budget.mjs','9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3']])assert.equal(createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h);
});

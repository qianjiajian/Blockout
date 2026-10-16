import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boundedBudget} from '../formal-v3/bounded-proof.mjs';
import {boundedNativeLowerTask,NATIVE_LOWER_VERSION} from '../formal-v3/bounded-native-lower.mjs';
import {assertV4Runtime} from './runtime.mjs';

// Qualification adapter ONLY. No loader, ledger, candidate IO, production
// selector or fallback is added. Existing engines and receipts stay unchanged.
export const NATIVE_LOWER_ADAPTER_VERSION='native-full-layers-lower-v198-qualification-v1';
export const NATIVE_LOWER_GUARD_VERSION='native-labelled-9999-plus-one-terminal-v1';
export const NATIVE_LOWER_ENGINE_SHA='3b998cd21345f3cb78a27fd74c4cd58926d9ef09d9d955288ba90a3ce5b13056';
const enginePath=fileURLToPath(new URL('../formal-v3/bounded-native-lower.mjs',import.meta.url));
const ownPath=fileURLToPath(import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytesHash=p=>hash(fs.readFileSync(p));
const integer=(n,min,max,label)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,label);

export function nativeLowerBudgetV198(requested={}){
 const options=boundedBudget({maxStates:9999,...requested});
 assert(options.maxStates<=9999,'Native lower reserves one terminal world; registered states must be <=9999');
 return options;
}

function bindRuntime(runtime){
 assertV4Runtime(runtime);
 assert.equal(bytesHash(enginePath),NATIVE_LOWER_ENGINE_SHA,'Unreviewed native engine bytes');
 const bindings={...runtime.toolchainBindings,[enginePath]:NATIVE_LOWER_ENGINE_SHA,[ownPath]:bytesHash(ownPath)};
 // These functions are imported by the original native module from this tree.
 // The actual model is supplied by the separately verified frozen runtime.
 for(const relative of ['../formal-v3/bounded-proof.mjs','../formal-v2/contract.mjs']){
  const p=fileURLToPath(new URL(relative,import.meta.url));
  const key='tools/daily-challenge/'+relative.slice(3);
  assert.equal(bytesHash(p),runtime.toolchainBindings[key],'Native import differs from frozen core: '+key);
  bindings[p]=bytesHash(p);
 }
 for(const[p,h]of Object.entries(bindings))assert.equal(bytesHash(p),h,'Runtime binding changed: '+p);
 return bindings;
}

function validateResult(result,inputSha,floor,budget){
 assert.equal(result.method,NATIVE_LOWER_VERSION);
 assert.equal(result.inputLevelSha256,inputSha);
 assert.equal(result.requiredFloor,floor);
 assert.deepEqual(result.budget,budget);
 integer(result.rawFullBoardStates,0,budget.maxStates,'Native raw state count');
 integer(result.rawExploredStates,0,result.rawFullBoardStates,'Native expanded count');
 assert.equal(result.discoveredStates,result.rawFullBoardStates);
 assert.equal(result.visitedStates,result.rawFullBoardStates);
 assert.equal(result.exploredStates,result.rawExploredStates);
 assert.equal(result.catalogAcceptanceEnabled,false);
 assert.equal(result.retryLedgerValidated,false);
 assert.equal(result.formalReady,false);
 integer(result.certifiedFloor,0,floor,'Native certified floor');
 if(result.thresholdProven){
  integer(result.elapsedMilliseconds,0,budget.maxMilliseconds-1,'Native proof exceeded its final deadline');
  assert.equal(result.status,'threshold-proven');
  assert.equal(result.termination,'all-costs-below-floor-exhausted');
  assert.equal(result.L,floor);assert.equal(result.certifiedFloor,floor);
  assert.equal(result.domain.retainsAllBodies,true);
  assert.equal(result.domain.retainsAllLayers,true);
  assert.equal(result.domain.retainsAllHiddenBatches,true);
 }else{
  assert.equal(result.thresholdProven,false);assert.equal(result.L,null);
  assert(['unknown','unsupported','invalid','relaxed-shortcut'].includes(result.status));
  if(result.status==='relaxed-shortcut'){
   integer(result.minimumOptionalCost,0,floor-1,'Native relaxed shortcut cost');
   assert.equal(result.termination,'minimum-optional-completion');
   assert(Array.isArray(result.drags));
  }
 }
}

/** Qualified-domain 0/1 lower subtask on NEW TINY TEST FIXTURES only for now.
 * The unchanged engine counts the initial board, every parking candidate and
 * every exit/peel candidate at enqueue. A new exit world is constructed before
 * enqueue checks maxStates. That first throw immediately unwinds the task;
 * reserving ONE candidate therefore bounds it by registered+1 <=10000.
 * Held coordinate BFS is separate only while its full non-coordinate world
 * invariant holds. No failed/unknown task is resumed or sent to another engine.
 * This is a new native-specific guard; the plain/ice core4588 guard is NOT reused.
 */
export function guardedNativeLowerTaskV198(runtime,level,{floor,...requested}={}){
 integer(floor,1,256,'Qualification floor must be 1..256');
 const budget=nativeLowerBudgetV198(requested),bindings=bindRuntime(runtime);
 const before=levelSha256(level),nativeBindings={...runtime.toolchainBindings,[enginePath]:NATIVE_LOWER_ENGINE_SHA};
 const adapted={...runtime,nativeLowerVersion:NATIVE_LOWER_VERSION,
  nativeLowerBindings:nativeBindings,nativeLowerSha256:levelSha256(nativeBindings)};
 let originalResult,result,error=null;
 try{
  originalResult=boundedNativeLowerTask(adapted,level,{floor,...budget});
  validateResult(originalResult,before,floor,budget);
  assert.equal(levelSha256(level),before,'Native lower mutated input');
  result={...originalResult,guardAllowance:{version:NATIVE_LOWER_GUARD_VERSION,
   engine:{path:enginePath,sha256:NATIVE_LOWER_ENGINE_SHA},adapter:{path:ownPath,sha256:bindings[ownPath]},
   registeredRawSetStates:originalResult.rawFullBoardStates,registeredExpandedStates:originalResult.rawExploredStates,
   registeredSetBudget:budget.maxStates,unregisteredTerminalWorldAllowance:1,
   conservativeFullBoardStateUpperBound:originalResult.rawFullBoardStates+1,hardWholeBoardLimit:10000,
   exactFullBoardVisitedCountClaimed:false,
   terminalBehavior:'first-unregistered-world-throws-and-returns-without-recovery'}};
 }catch(e){
  error=e.message;
  // Never manufacture counters or a successful certificate after an exception.
  result={status:'invalid',termination:'native-qualification-adapter-rejected',thresholdProven:false,L:null,
   requiredFloor:floor,guardAllowance:null,accountingStatus:'UNKNOWN',reason:error};
 }
 for(const[p,h]of Object.entries(bindings))assert.equal(bytesHash(p),h,'Binding drift during native task: '+p);
 return{version:NATIVE_LOWER_ADAPTER_VERSION,method:NATIVE_LOWER_VERSION,inputLevelSha256:before,requiredFloor:floor,
  projection:null,projectedLevelSha256:null,result,originalResult:originalResult??null,error,bindings,
  qualificationOnly:true,primitiveCalls:1,productionQualified:false,productionExecutionAllowed:false,
  catalogAcceptanceEnabled:false,retryLedgerValidated:false,formalReady:false,
  upperBoundCertified:false,solvabilityValidated:false,newPublicLedgerClaims:0};
}

/** The future daily interface locks the real v198 floor, without changing the
 * original primitive's result schema or pretending it is a projected proof. */
export function boundedNativeLowerTaskV198(runtime,level,difficulty,policy,budget={}){
 assert.equal(policy?.version,'1.198.0','Explicit v198 difficulty policy required');
 const expected={1:{lower:13,upper:23},2:{lower:18,upper:33},3:{lower:28,upper:null}};
 for(const d of [1,2,3])for(const k of ['lower','upper'])assert.equal(policy.bands?.[d]?.[k],expected[d][k],'Actual daily v198 band');
 assert(Object.hasOwn(expected,difficulty),'Unknown daily difficulty');
 const options=nativeLowerBudgetV198(budget); // rejects floor/searchUpper overrides
 const report=guardedNativeLowerTaskV198(runtime,level,{floor:expected[difficulty].lower,...options});
 return{...report,difficultyPolicyVersion:policy.version,difficulty,band:expected[difficulty]};
}

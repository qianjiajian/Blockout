import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {boundedBudget,boundedPlainTask,boundedUpperSearch,verifyBoundedCandidate} from './bounded-proof.mjs';
import {boundedIceTask} from './bounded-ice-proof.mjs';

export const RESERVED_GUARD_VERSION='raw-set-9999-plus-one-terminal-candidate-v1';
export const FROZEN_PROOF_SHA='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const own='tools/daily-challenge/formal-v3/reserved-guard-budget.mjs';
const binding={path:own,sha256:createHash('sha256').update(fs.readFileSync(own)).digest('hex')};
/** The existing engines record at most this many distinct raw worlds. They
 * may form/read one further full candidate immediately before their guard
 * throws; that first throw unwinds directly to the terminal UNKNOWN return.
 * Reserve one world without changing frozen core or claiming an exact count.
 * Raw primitives still require the caller's original shared ledger claim. */
export function reservedGuardBudget(requested={}){
 const result=boundedBudget({maxStates:9999,...requested});
 assert(result.maxStates<=9999,'Reserve one full world: registered raw Set budget cannot exceed 9999');
 return result;
}
function assertRuntime(runtime){assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA,'This guard proof is specific to frozen core4588');}
export function guardAllowanceFor(result){
 const budget=reservedGuardBudget(result.budget);
 assert(Number.isSafeInteger(result.rawFullBoardStates)&&result.rawFullBoardStates>=0&&result.rawFullBoardStates<=budget.maxStates);
 assert.equal(result.discoveredStates,result.rawFullBoardStates);assert.equal(result.visitedStates,result.rawFullBoardStates);
 assert(Number.isSafeInteger(result.rawExploredStates)&&result.rawExploredStates>=0&&result.rawExploredStates<=result.rawFullBoardStates);
 assert.equal(result.exploredStates,result.rawExploredStates);
 return{version:RESERVED_GUARD_VERSION,wrapper:binding,frozenProofToolchainSha256:FROZEN_PROOF_SHA,
  registeredRawSetStates:result.rawFullBoardStates,registeredExpandedStates:result.rawExploredStates,registeredSetBudget:budget.maxStates,
  unregisteredTerminalWorldAllowance:1,conservativeFullBoardStateUpperBound:result.rawFullBoardStates+1,hardWholeBoardLimit:10000,
  exactFullBoardVisitedCountClaimed:false,terminalBehavior:'first-unregistered-world-throws-and-immediately-returns-no-recovery-or-continuation'};
}
const annotate=result=>({...result,guardAllowance:guardAllowanceFor(result)});
export function guardedPlainTask(level,runtime,{floor,searchUpper=null,...budget}={}){
 assertRuntime(runtime);return annotate(boundedPlainTask(level,runtime,{floor,searchUpper,...reservedGuardBudget(budget)}));
}
export function guardedIceTask(level,runtime,{floor,searchUpper=null,...budget}={}){
 assertRuntime(runtime);return annotate(boundedIceTask(level,runtime,{floor,searchUpper,...reservedGuardBudget(budget)}));
}
export function guardedNativeUpper(runtime,level,budget={}){
 assertRuntime(runtime);return annotate(boundedUpperSearch(runtime,level,reservedGuardBudget(budget)));
}
/** Preserves the core-owned public ledger and strategy-before-claim flow.
 * The guard annotations are outside its original mathematical/ledger results.
 * Provided routes are replay, not a new upper search. Never retry old failures. */
export async function verifyWithReservedGuard(runtime,candidate,options={}){
 assertRuntime(runtime);
 const result=await verifyBoundedCandidate(runtime,candidate,{...options,
  routeBudget:reservedGuardBudget(options.routeBudget),lowerBudget:reservedGuardBudget(options.lowerBudget)});
 return{...result,reservedGuard:{version:RESERVED_GUARD_VERSION,wrapper:binding,
  upper:result.route?.search?guardAllowanceFor(result.route.search):null,
  lower:result.lowerBound?.result?guardAllowanceFor(result.lowerBound.result):null}};
}

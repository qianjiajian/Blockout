import fs from 'node:fs/promises';
import {loadBoundedRuntime,verifyBoundedCandidate} from './bounded-proof.mjs';

const output=process.argv[2]??'deliverables/daily-formal-v3-20261008/proof/independent-review-v1';
await fs.mkdir(output,{recursive:false});
const runtime=await loadBoundedRuntime();
// This object already passed both v3 lower and original-model upper replay.
// Revalidation is allowed; none of the exhausted historical objects is searched.
const file='deliverables/daily-formal-v3-20261008/proof/qualification-v2/candidate-3.json';
const candidate=JSON.parse(await fs.readFile(file,'utf8'));
delete candidate.drags;delete candidate.routeSha256;
const joint=await verifyBoundedCandidate(runtime,candidate,{allowRevalidation:true});
await fs.writeFile(`${output}/joint-upper.json`,JSON.stringify({...joint,qualificationOnly:true,inputFile:file},null,2)+'\n',{flag:'wx'});
if(!joint.accepted||!joint.route?.search||joint.route.search.discoveredStates>10000||joint.route.search.exploredStates>10000)
  throw Error(`Joint search qualification failed: ${joint.status}`);
const report={ruleVersion:runtime.boundedRuleVersion,toolchainSha256:runtime.toolchainSha256,productionChanged:false,formalReady:false,
  status:'BOUNDED_PROOF_IMPLEMENTATION_REVIEW_PASSED_WITH_EXPLICIT_SCOPE',
  jointFreshSample:{levelSha256:joint.levelSha256,L:joint.L,U:joint.U,lowerAndUpperAreOneTask:true,search:joint.route.search},
  mathematicalArguments:[
    'Every natural continuous held drag is a finite unit-step path. Enumerating the entire connected held-body coordinate component includes turns; a parking endpoint costs one, and an exit reached during that same hold costs zero.',
    'Optional exits and omission of external exit-sweep obstruction only add actions. Any lower bound on this relaxed action graph transfers to the original graph. A relaxed witness is never accepted as U without fresh original-model replay.',
    'For the qualified static single-layer domain, clearing a reachable body deletes occupied cells and cannot disable any other move or gate. Such zero-cost clears commute earlier; future moves of the removed body can be erased. Closure preserves the minimum nonclearing cost.',
    'Bodies are grouped only by equal normalized oriented shape and color, after rejecting mechanism fields and non-normalized anchors. Such bodies have identical placement and exit actions; permuting their labels is a graph automorphism.',
    'The BFS expands all closure-normalized states at lower nonclearing cost before the next depth. No terminal state through depth floor minus one certifies the floor. Exhausted finite space also excludes every below-floor solution.',
    'Both state discovery and expansion check the cap before incrementing or registering a new search state. Micro discovery and transition checks have their own finite counters. Every interruption returns UNKNOWN with thresholdProven false.',
    'The initial lower closure and deterministic post-action closures are normalization, not additional branching whole-board search states. Their actual held-coordinate scans, neighbor tests, exit tests and removals are separately recorded. This state definition is exposed in each task report.',
    'Known original routes are replayed without invoking an upper search. Such replay cannot supply a missing lower bound or continue a previously failed lower search: the persistent attempt ledger is claimed first.',
  ],
  independentChecks:{nodeTests:8,independentLabelledGraphs:120,oracleUsesClosure:false,oracleUsesIdenticalBodyQuotient:false,
    oracleUsesV2Proof:false,costDisagreements:0,fixtures:'tools/daily-challenge/formal-v3/bounded-proof.test.mjs'},
  fixedCounterexample:{kind:'Equivalent physical board with different playable/blocked JSON encoding bypassed old fingerprint',
    fix:'Canonical effective playable cell set plus conservative old-ledger shape-and-colored-cell identity aliases',
    evidence:'deliverables/daily-formal-v3-20261008/proof/ledger-canonicalization-v1/summary.json'},
  v2BudgetAudit:[
    'v2 plain defaults permit 25000 full-board states; they are not used by a v3 solver task.',
    'v2 plain attemptedTransitions counts parking candidates only. v3 separately records and caps held coordinate discovery, compiled neighbor checks, closure exit checks and parking candidates.',
    'v2 combined floor/searchUpper can preserve an already-certified lower threshold after later upper interruption. v3 treats a combined interrupted task as UNKNOWN; certifiedFloor remains diagnostic only.',
    'The old native route solver had state and transition guards but no separately exposed held micro accounting. v3 implements its own original-model constructive search with both board counters and micro counters.',
  ],
  interface:{runtime:'await loadBoundedRuntime()',knownRoute:'await verifyBoundedCandidate(runtime, {formalId,stageKey,difficulty,sourceLevelId,level,drags,timeSchedule?}, {ledgerDirectory,lowerBudget,allowRevalidation?})',
    newPlain:'await verifyBoundedCandidate(runtime, {formalId,stageKey,difficulty,sourceLevelId,level}, {ledgerDirectory,routeBudget,lowerBudget})',
    exploration:'ledger.claim(level) before boundedPlainTask(level,runtime,{floor:16,searchUpper:64,...budget}); ledger.finish only after actual route replay; raw primitive is not a formal acceptance',
    changedFailedInput:'Pass redesignOf with the failed request ID; both true shape inventory and block colors must change',
    hardBoardCeiling:10000,separateResourceCeilings:{maxTransitions:3000000,maxMicroStates:1000000,maxDragStates:10000,maxMilliseconds:30000}},
  limitations:[
    'This verifies the mathematical/budget implementation, not new450 layout diversity, mechanism intensity, natural time, browser Pointer or final production acceptance.',
    'Lower support is restricted to the reviewed plain graph and the three qualified static-constraint, full-physical-shutter, and opening-outer-body projections. Unqualified dynamic domains remain UNSUPPORTED.',
    'Whole-board state counts use closure-normalized nodes modulo identical body labels; a report must not relabel micro positions or normalization operations as complete board search nodes.',
    'Raw low-level search functions cannot police process restarts themselves. Production qualification requires the persistent ledger; exploration callers must claim and finish it. Failed redesign lineage must be supplied rather than hidden as an unrelated input.',
    'Already passed same objects may receive explicit fresh revalidation. A failed revalidation blocks subsequent attempts, and old request/result bytes remain immutable.',
  ]};
await fs.writeFile(`${output}/review.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,toolchainSha256:runtime.toolchainSha256,joint:{L:joint.L,U:joint.U,states:joint.route.search.discoveredStates,expanded:joint.route.search.exploredStates,micro:joint.route.search.microDiscoveredStates,transitions:joint.route.search.attemptedTransitions}}));

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NATIVE_BATCH_VERSION,deriveNativeMacroAccounting,assertNativeBatchPlan,assertNativeBatchIndex} from './native-batch-contract.mjs';
import {sha,PUBLIC_LEDGER} from './native-batch-io.mjs';

const output=process.argv[2];assert(output,'Fresh private evidence directory required');
const input='deliverables/daily-formal-v4-20261008/design/next-native-three-plan-01/plan.json';
const bytes=await fs.readFile(input),plan=JSON.parse(bytes);
// The old reference geometry supplies valid recipe data only. This in-memory
// metadata fixture is never handed to preparation, construction or solving.
plan.version=NATIVE_BATCH_VERSION;plan.qualificationOnly=false;
plan.selectionReview=plan.proposalReview;plan.historyCheckpoint=plan.proposalReview;
plan.macroHistory=deriveNativeMacroAccounting([{plan:{path:'private-prior-metadata.json',sha256:'0'.repeat(64)},previous:51,actual:3,after:54,quota:3,qualificationOnly:false,terminal:true}]);
plan.previousMacro64ActualInputs=54;plan.maximumAfterThisBatch=57;
plan.futureUpperBudget.maxMilliseconds=120000;
plan.futureStrategy={tailStrategy:'native-120',originalLowerFloor:31,maximumTailCalls:1,maximumOriginalLowerCalls:1,fullUpperSearchAfterTailFailure:false,noOtherStrategyOnSameInput:true};
plan.ledgerSnapshot={roots:[{directory:'private-in-memory-only',files:[]}]};
assertNativeBatchPlan(plan);
const a=plan.blueprints[0].recipeId,b=plan.blueprints[1].recipeId;
const index={scope:300,status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',fixedColourInputs:2,stocksEnteringColourCspIncludingFailed:2,
 eligibleInputs:0,candidates:[],attempts:[{recipeId:a,enteredColourCsp:true,rejection:'unsatisfiable'},{recipeId:b,enteredColourCsp:true,rejection:'unsatisfiable'}],
 macro64ActualInputsIncludingThis:56,perRecipeColourCspInputs:{[a]:1,[b]:1},gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
assertNativeBatchIndex(index,plan);
const bad=structuredClone(index);bad.attempts[1].recipeId=a;
let rejected=false,error=null;try{assertNativeBatchIndex(bad,plan);}catch(e){rejected=true;error=e.message;}
const publicCount=(await fs.readdir(PUBLIC_LEDGER)).filter(f=>f.endsWith('.request.json')).length;
const tools=['native-batch-contract.mjs','native-batch-recipe-accounting-independent.mjs'];
const toolBindings=Object.fromEntries(await Promise.all(tools.map(async n=>{const f=`tools/daily-challenge/formal-v4/${n}`;return[f,sha(await fs.readFile(f))];})));
await fs.mkdir(output,{recursive:false});
await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:rejected?'NATIVE_BATCH_RECIPE_DISTRIBUTION_NEGATIVE_PASS':'NATIVE_BATCH_RECIPE_DISTRIBUTION_NEGATIVE_FAIL',
 qualificationOnly:true,referenceGeometryOnly:{path:input,sha256:sha(bytes)},toolBindings,validIndexAccepted:true,tamperedIndexRejected:rejected,error,
 expected:'Two colour attempts of recipe A with quota one must not pass as declared A=1/B=1.',tamperedIndex:bad,
 newRealCandidateConstructions:0,newRealCandidateSearches:0,publicClaimsStarted:0,publicRequestCount:publicCount,formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,tamperedIndexRejected:rejected,publicRequestCount:publicCount}));
if(!rejected)process.exitCode=1;

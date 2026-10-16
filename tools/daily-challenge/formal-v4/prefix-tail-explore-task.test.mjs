import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {build} from 'esbuild';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {CONSTRUCTION_LEDGER} from './constraint-attempt-guard.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment-task.mjs';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makePrefixTailV4Plan,explorePrefixTailV4} from './prefix-tail-explore-task.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const runtime=await loadV4Runtime(),evidence=[];
const publicBefore=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const declaredReplacements=[
  [
    "import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';",
    "import {prefixExecutionEnvironment,currentMainlineSourceBinding,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';\nimport {assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';"
  ],
  [
    "export const PREFIX_TAIL_V4_VERSION='new-plain-stock-fixed-late-prefix-one-tail-then-original-lower-v1';",
    "export const PREFIX_TAIL_V4_VERSION='new-plain-stock-fixed-late-prefix-one-tail-then-original-lower-task-v1';"
  ],
  [
    "const own='tools/daily-challenge/formal-v4/prefix-tail-explore.mjs';",
    "const own='tools/daily-challenge/formal-v4/prefix-tail-explore-task.mjs';"
  ],
  [
    "  sourceLevelId:candidate.sourceLevelId,floor,executionEnvironment,currentRuntimeValidationClaimed:false,",
    "  sourceLevelId:candidate.sourceLevelId,floor,executionEnvironment,currentRuntimeValidationClaimed:false,\n  policyReviewedAtPreparation:executionEnvironment.policyReviewedAtPreparation,historicalDesignPolicy:executionEnvironment.historicalDesignPolicy,mathematicalContract:executionEnvironment.mathematicalContract,"
  ],
  [
    " assert.equal(typeof qualificationOnly,'boolean');\n if(!qualificationOnly)",
    " assert.equal(typeof qualificationOnly,'boolean');\n await assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,ledgerDirectory);\n if(!qualificationOnly)"
  ],
  [
    " const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});",
    " // Current scope authorizes this execution; mutable root policy is not a mathematical identity binding.\n const executionPolicyObservation=observeExecutionPolicy(plan.executionEnvironment);\n const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});"
  ],
  [
    "  level,levelSha256:levelSha256(level),plan,attempt,executionEnvironment:plan.executionEnvironment,currentSourceBinding,",
    "  level,levelSha256:levelSha256(level),plan,attempt,executionEnvironment:plan.executionEnvironment,currentSourceBinding,executionPolicyObservation,"
  ],
  [
    "  currentRuntimeValidationClaimed:false,toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,",
    "  currentRuntimeValidationClaimed:false,toolchainSha256:runtime.toolchainSha256,toolchainBindings:runtime.toolchainBindings,\n  policyReviewedAtPreparation:plan.policyReviewedAtPreparation,historicalDesignPolicy:plan.historicalDesignPolicy,mathematicalContract:plan.mathematicalContract,"
  ],
  [
    ".v4-prefix-tail-plan.json",
    ".v4-prefix-tail-task-plan.json"
  ],
  [
    ".v4-prefix-tail-result.json",
    ".v4-prefix-tail-task-result.json"
  ]
];

const out=process.env.PREFIX_TAIL_TASK_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/prefix-tail-task-qualification-');
await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const stock={id:999822,name:'private prefix-tail control',width:2,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},
  {id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'},{id:'gb',side:'bottom',offset:1,size:1,color:'blue'},
  {id:'gg',side:'left',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:1,size:1,color:'yellow'}]};
async function fixture({prefixDrags=[{blockId:'r',path:[],exitSide:'top'}],priorWorlds=1}={}){
 const dir=await fs.mkdtemp(`${out}/case-`),candidate={sourceLevelId:stock.id,level:structuredClone(stock),prefixDrags,
  constructionAccounting:{version:'late-region-static-construction-v1',completeWorldReservations:priorWorlds,microStates:3,transitions:4,elapsedMilliseconds:1}};
 const prior={...candidate,levelSha256:levelSha256(candidate.level),prefixSha256:routeSha256(prefixDrags),qualificationOnly:true,formalReady:false};
 const bytes=JSON.stringify(prior,null,2)+'\n',file=`${dir}/construction.json`;await fs.writeFile(file,bytes,{flag:'wx'});
 candidate.constructionEvidence={path:file,sha256:sha(bytes)};
 return{dir,candidate,options:{qualificationOnly:true,ledgerDirectory:`${dir}/ledger`}};
}
const budgets={upperBudget:{maxStates:100,maxMicroStates:1000,maxTransitions:10000,maxMilliseconds:3000},lowerBudget:{maxStates:100,maxMilliseconds:3000},floor:1,qualificationOnly:true};

test('one claimed full input joins exact prefix and one tail, then proves only original L',async()=>{
 const f=await fixture(),plan=makePrefixTailV4Plan(runtime,f.candidate,budgets);
 assert.equal(plan.innerPlan.tailBudget.maxStates,96);assert.equal(plan.innerPlan.fullUpperBudget.maxMicroStates,997);
 assert.equal(plan.innerPlan.fullUpperBudget.maxTransitions,9996);assert.equal(plan.innerPlan.fullUpperBudget.maxMilliseconds,2999);
 const result=await explorePrefixTailV4(runtime,f.candidate,{...f.options,plan});
 assert(result.accepted,JSON.stringify(result));assert.equal(result.L,1);assert.equal(result.U,1);
 assert.equal(result.upperConstruction.tailSearches,1);assert.equal(result.lowerBound.inputLevelSha256,result.levelSha256);
 assert.notEqual(result.upperConstruction.tailLevelSha256,result.levelSha256);
 assert.equal(result.upperAccounting.conservativeFullBoardStateUpperBound,1+2+result.upperConstruction.tailSearch.rawFullBoardStates+1);
 assert(result.upperAccounting.conservativeFullBoardStateUpperBound<=100);assert(result.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound<=101);
 assert.equal(result.catalogEligible,false);assert.equal(result.qualificationOnly,true);assert.equal(result.formalReady,false);
 assert.equal((await fs.readdir(f.options.ledgerDirectory)).filter(p=>p.endsWith('.request.json')).length,1);
 evidence.push({test:'single-first-full-identity-upper-and-lower',passed:true,result});
});

test('prior worlds, prefix and terminal guard exhaust together; U failure seals input without L or another tail',async()=>{
 const f=await fixture({priorWorlds:3}),plan=makePrefixTailV4Plan(runtime,f.candidate,{...budgets,upperBudget:{...budgets.upperBudget,maxStates:7}});
 assert.equal(plan.innerPlan.tailBudget.maxStates,1);
 const result=await explorePrefixTailV4(runtime,f.candidate,{...f.options,plan});
 assert.equal(result.status,'UNKNOWN_CONSTRUCTED_UPPER_TERMINAL');assert.equal(result.accepted,false);assert.equal(result.lowerBound,null);
 assert.equal(result.upperConstruction.tailSearches,1);assert.equal(result.upperAccounting.conservativeFullBoardStateUpperBound,7);
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{...f.options,plan}),/INPUT_ALREADY_ATTEMPTED/);
 const names=await fs.readdir(f.options.ledgerDirectory);assert(names.includes(`${result.attempt.id}.blocked.json`));
 evidence.push({test:'one-shared-upper-limit-terminal',passed:true,result});
});

test('illegal prefix canonical first contact fails after full claim and before any tail/lower',async()=>{
 const f=await fixture({prefixDrags:[{blockId:'r',path:[[0,1]]}]}),plan=makePrefixTailV4Plan(runtime,f.candidate,budgets);
 const result=await explorePrefixTailV4(runtime,f.candidate,{...f.options,plan});
 assert.equal(result.accepted,false);assert.equal(result.upperConstruction.tailSearches,0);assert.equal(result.lowerBound,null);
 assert.match(result.upperConstruction.reason,/Pointer-down exit/);
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{...f.options,plan}),/INPUT_ALREADY_ATTEMPTED/);
 evidence.push({test:'canonical-prefix-terminal',passed:true,result});
});

test('plain domain, plan, namespace and exact construction evidence cannot be substituted',async()=>{
 const f=await fixture(),plan=makePrefixTailV4Plan(runtime,f.candidate,budgets);
 for(const key of ['frozen','movementAxis','lockedBy','shutterId']){
  const c=structuredClone(f.candidate);c.level.blocks[0][key]=key==='frozen'?2:'x';assert.throws(()=>makePrefixTailV4Plan(runtime,c,budgets));}
 const irregular=structuredClone(f.candidate);irregular.level.blocks[0].shape=[[0,0],[1,0],[0,1]];
 assert.throws(()=>makePrefixTailV4Plan(runtime,irregular,budgets),/rectangles/);
 for(const n of [NaN,Infinity,10001])assert.throws(()=>makePrefixTailV4Plan(runtime,f.candidate,{...budgets,upperBudget:{maxStates:n}}));
 const changed=structuredClone(plan);changed.innerPlan.tailBudget.maxStates++;
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{...f.options,plan:changed}),/plan changed/);
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{...f.options,qualificationOnly:false,plan}),/shared public/);
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{qualificationOnly:true,plan}),/private ledgers/);
 await fs.appendFile(f.candidate.constructionEvidence.path,' ');
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{...f.options,plan}),/construction bytes changed/);
 assert.equal(await fs.stat(f.options.ledgerDirectory).then(()=>true).catch(()=>false),false);
 evidence.push({test:'domain-and-binding-negative',passed:true});
});

test('qualification resolves public and construction junctions, including nonexistent children, before writing',async()=>{
 const f=await fixture(),plan=makePrefixTailV4Plan(runtime,f.candidate,budgets),attempts=[];
 for(const [label,root]of [['public',PUBLIC_ATTEMPT_LEDGER],['construction',CONSTRUCTION_LEDGER]]){
  const alias=path.resolve(f.dir,`${label}-alias`);await fs.symlink(path.resolve(root),alias,'junction');
  const actual=await fs.realpath(root),child=path.join(alias,'never-created-prefix-task-private');
  for(const ledgerDirectory of [root,actual,alias,child]){
   await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{qualificationOnly:true,ledgerDirectory,plan}),/private ledgers/);
   attempts.push(ledgerDirectory);
  }
  assert.equal(await fs.stat(child).then(()=>true).catch(()=>false),false);
 }
 assert.equal(await fs.stat(f.options.ledgerDirectory).then(()=>true).catch(()=>false),false);
 evidence.push({test:'private-junction-namespace-before-write',passed:true,attempts});
});

test('only environment declarations change; observed policy stays outside the plan and mathematical identity',async()=>{
 const oldPath='tools/daily-challenge/formal-v4/prefix-tail-explore.mjs',newPath='tools/daily-challenge/formal-v4/prefix-tail-explore-task.mjs';
 let expected=await fs.readFile(oldPath,'utf8');
 for(const [before,after]of declaredReplacements){assert.equal(expected.split(before).length-1,1);expected=expected.replace(before,after);}
 assert.equal(await fs.readFile(newPath,'utf8'),expected,'The original mathematical implementation is byte-identical after the declared ten narrow substitutions');
 const f=await fixture(),plan=makePrefixTailV4Plan(runtime,f.candidate,budgets);
 assert.equal(plan.policyReviewedAtPreparation.version,'1.159.0');assert.equal(plan.historicalDesignPolicy.version,'1.156.0');assert.equal(plan.mathematicalContract.version,'1.154.0');
 assert.equal(plan.innerPlan.searchUpper,128);assert.equal(plan.finiteTailWindowIsNotADifficultyUpperLimit,true);assert.equal(plan.totalUpperLimit,undefined);
 const changed=structuredClone(plan);changed.policyReviewedAtPreparation.sha256='0'.repeat(64);
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{...f.options,plan:changed}),/plan changed/);
 assert.equal(await fs.stat(f.options.ledgerDirectory).then(()=>true).catch(()=>false),false);
 const result=await explorePrefixTailV4(runtime,f.candidate,{...f.options,plan});assert(result.accepted);assert(result.executionPolicyObservation);
 assert.equal(result.plan.executionPolicyObservation,undefined);
 const request=JSON.parse(await fs.readFile(`${f.options.ledgerDirectory}/${result.attempt.id}.request.json`));
 assert.equal(request.executionPolicyObservation,undefined);assert.equal(request.policyReviewedAtPreparation,undefined);
 const rootManifest=path.resolve(plan.executionEnvironment.sourceWorkspace,'docs/rules/manifest.json').toLowerCase();
 assert.equal(Object.keys(result.designBindings).some(p=>path.resolve(p).toLowerCase()===rootManifest),false);
 assert.deepEqual(makePrefixTailV4Plan(runtime,f.candidate,budgets),plan);
 evidence.push({test:'declared-diff-stable-task-policy',passed:true,oldPath,newPath,replacements:declaredReplacements.length,executionPolicyObservation:result.executionPolicyObservation});
});

test('an archived old-wrapper failure cannot acquire a new claim by switching to TASK or changing metadata',async()=>{
 const sourceReport='deliverables/daily-formal-v4-20261008/proof/prefix-tail-qualification-v4-snapshot/report.json';
 const sourceBytes=await fs.readFile(sourceReport),old=JSON.parse(sourceBytes).evidence.find(e=>e.test==='one-shared-upper-limit-terminal').result;
 assert.equal(old.accepted,false);assert.equal(old.qualificationOnly,true);assert.equal(old.version,'new-plain-stock-fixed-late-prefix-one-tail-then-original-lower-v1');
 const f=await fixture();assert.equal(old.levelSha256,levelSha256(f.candidate.level));
 const oldDirectory=path.dirname(old.evidenceFile);await fs.cp(oldDirectory,f.options.ledgerDirectory,{recursive:true,errorOnExist:true,force:false});
 const before=(await fs.readdir(f.options.ledgerDirectory)).sort();assert(before.includes(`${old.attempt.id}.blocked.json`));
 let plan=makePrefixTailV4Plan(runtime,f.candidate,budgets);
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{...f.options,plan}),/INPUT_ALREADY_ATTEMPTED/);
 const renamed=structuredClone(f.candidate);renamed.level.id++;renamed.level.name+=' renamed';
 const prior={...renamed,levelSha256:levelSha256(renamed.level),prefixSha256:routeSha256(renamed.prefixDrags),qualificationOnly:true};
 delete prior.constructionEvidence;
 const renamedFile=`${f.dir}/renamed-construction.json`,bytes=JSON.stringify(prior,null,2)+'\n';await fs.writeFile(renamedFile,bytes,{flag:'wx'});
 renamed.constructionEvidence={path:renamedFile,sha256:sha(bytes)};plan=makePrefixTailV4Plan(runtime,renamed,budgets);
 await assert.rejects(()=>explorePrefixTailV4(runtime,renamed,{...f.options,plan}),/INPUT_ALREADY_ATTEMPTED/);
 assert.deepEqual((await fs.readdir(f.options.ledgerDirectory)).sort(),before);assert.equal(sha(await fs.readFile(sourceReport)),sha(sourceBytes));
 evidence.push({test:'old-failed-physical-identity-stays-blocked',passed:true,sourceReport:{path:sourceReport,sha256:sha(sourceBytes)},oldAttemptId:old.attempt.id,newClaims:0});
});

test.after(async()=>{
 const files=['tools/daily-challenge/formal-v4/prefix-tail-explore-task.mjs','tools/daily-challenge/formal-v4/prefix-tail-explore-task.test.mjs','tools/daily-challenge/formal-v4/prefix-tail-explore.mjs','tools/daily-challenge/formal-v4/prefix-tail-explore.test.mjs','tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.mjs','tools/daily-challenge/formal-v4/prefix-execution-environment-task.mjs','tools/daily-challenge/formal-v4/constraint-attempt-guard.mjs'];
 const compiled=await build({entryPoints:files.slice(0,1),bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const toolBindings=Object.fromEntries(await Promise.all(Object.keys(compiled.metafile.inputs).map(async p=>[p.replaceAll('\\','/'),sha(await fs.readFile(p))])));
 for(const [p,h]of Object.entries(runtime.toolchainBindings)){if(toolBindings[p])assert.equal(toolBindings[p],h);assert.equal(sha(await fs.readFile(p)),h);toolBindings[p]=h;}
 const environment=prefixExecutionEnvironment(runtime),fileBindings={...toolBindings,...environment.bindings,...Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await fs.readFile(p))])))};
 const publicAfter=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),beforeSet=new Set(publicBefore),afterSet=new Set(publicAfter);
 assert(publicBefore.every(n=>afterSet.has(n)),'Historical public claims cannot disappear');
 const addedPublicRequests=publicAfter.filter(n=>!beforeSet.has(n));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===7?'PREFIX_TAIL_TASK_PRIVATE_PASS':'INCOMPLETE',evidence,fileBindings,toolBindings,
  errors:evidence.length===7?[]:['One or more private tests did not reach their final assertions'],policyReviewedAtPreparation:environment.policyReviewedAtPreparation,historicalDesignPolicy:environment.historicalDesignPolicy,mathematicalContract:environment.mathematicalContract,
  searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,realCandidateConstructionInvocations:0,realCandidateSolverInvocations:0,publicLedgerClaims:0,
  publicRequestCountBefore:publicBefore.length,publicRequestCountAfter:publicAfter.length,concurrentPublicRequestsObserved:addedPublicRequests,concurrentPublicRequestsAttributedToThisTest:false,
  executionWorkspace:path.resolve('.'),proofToolchainSha256:runtime.toolchainSha256,qualificationOnly:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});


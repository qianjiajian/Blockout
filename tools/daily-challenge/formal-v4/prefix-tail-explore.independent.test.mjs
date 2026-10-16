import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makePrefixTailV4Plan,explorePrefixTailV4} from './prefix-tail-explore.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Independent, new tiny physical fixtures and private ledgers only. These
// examples establish interface behavior, never any real candidate's L or U.
const runtime=await loadV4Runtime(),evidence=[];
const out=process.env.PREFIX_TAIL_V4_INDEPENDENT_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/prefix-tail-independent-');
await fs.mkdir(out,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const own='tools/daily-challenge/formal-v4/prefix-tail-explore.independent.test.mjs';
const level={id:999892,name:'Independent isolated exact prefix plus tail',width:2,height:2,timeSeconds:100,reward:0,
 difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',blocks:[
  {id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},
  {id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'},{id:'gb',side:'bottom',offset:1,size:1,color:'blue'},
  {id:'gg',side:'left',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:1,size:1,color:'yellow'}]};
function candidate(prefixDrags=[{blockId:'r',path:[],exitSide:'top'}]){
 return{sourceLevelId:level.id,level:structuredClone(level),prefixDrags,constructionAccounting:{version:'late-region-static-construction-v1',
  completeWorldReservations:1,microStates:0,transitions:0,elapsedMilliseconds:0},constructionEvidence:{path:'qualification-placeholder-never-read.json',sha256:'0'.repeat(64)}};
}
const options=(upper={})=>({qualificationOnly:true,floor:1,upperBudget:{maxStates:100,maxMilliseconds:5000,...upper},lowerBudget:{maxStates:100,maxMilliseconds:5000}});
async function bind(input,label,change=()=>{}){
 const prior={sourceLevelId:input.sourceLevelId,level:input.level,levelSha256:levelSha256(input.level),prefixDrags:input.prefixDrags,
  constructionAccounting:structuredClone(input.constructionAccounting)};change(prior);
 const file=path.join(out,`${label}-construction.json`),bytes=JSON.stringify(prior,null,2)+'\n';
 await fs.writeFile(file,bytes,{flag:'wx'});input.constructionEvidence={path:file,sha256:hash(bytes)};
}
async function run(input,label,opt=options()){
 await bind(input,label);
 const directory=path.join(out,label),plan=makePrefixTailV4Plan(runtime,input,opt),before=levelSha256(input);
 const result=await explorePrefixTailV4(runtime,input,{plan,qualificationOnly:true,ledgerDirectory:directory});
 assert.equal(levelSha256(input),before,'Exploration must not rewrite full source/prefix/accounting');
 return{result,plan,directory};
}

test('independent: moved retained body and exact full stock survive prefix -> tail -> both original replays',async()=>{
 const input=candidate([{blockId:'r',path:[],exitSide:'top'},{blockId:'b',path:[[0,0]]}]);
 const {result:r,plan,directory}=await run(input,'moved-retained');assert(r.accepted,r.reasons.join(';')||r.status);
 assert.equal(r.qualificationOnly,true);assert.equal(r.catalogEligible,false);assert.equal(r.formalReady,false);
 assert.equal(r.upperConstruction.tailSearches,1);assert.equal(r.upperConstruction.tailLevel.blocks.find(b=>b.id==='b').x,0);
 assert.deepEqual(r.upperConstruction.tailLevel.blocks.map(b=>b.id).sort(),['b','g','y']);
 assert.deepEqual(r.upperConstruction.tailLevel.gates,input.level.gates);
 assert.equal(r.route.canonicalReplay.clearEvents,4);assert.equal(r.route.independentReplay.clearEvents,4);
 assert.equal(r.lowerBound.inputLevelSha256,levelSha256(input.level));
 assert.equal(r.lowerBound.result.sourceLevelSha256,levelSha256(input.level));
 assert.notEqual(r.upperConstruction.tailSearch.sourceLevelSha256,levelSha256(input.level));
 assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,1+plan.innerPlan.prefixBoardCharge+r.upperConstruction.tailSearch.rawFullBoardStates+1);
 const files=await fs.readdir(directory);assert.equal(files.filter(p=>p.endsWith('.request.json')).length,1);
 const request=JSON.parse(await fs.readFile(path.join(directory,`${r.attempt.id}.request.json`)));
 assert.equal(request.levelSha256,levelSha256(input.level));
 evidence.push({test:'exact-original-versus-tail-and-retained-coordinates',passed:true,report:r});
});

test('independent: prior construction and terminal candidate share cap; failed full input cannot change method or metadata to retry',async()=>{
 const input=candidate(),{result:r,plan,directory}=await run(input,'terminal-cap',options({maxStates:5}));
 assert.equal(plan.innerPlan.tailBudget.maxStates,1);assert.equal(r.accepted,false);assert.equal(r.lowerBound,null);
 assert.equal(r.upperConstruction.tailSearches,1);assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,5);
 assert.equal(r.upperConstruction.tailSearch.rawFullBoardStates,1);
 assert(await fs.stat(path.join(directory,`${r.attempt.id}.blocked.json`)));
 const renamed=structuredClone(input);renamed.level.name='Metadata cannot create a new physical retry';
 await bind(renamed,'renamed-failure');
 const larger=makePrefixTailV4Plan(runtime,renamed,options());
 await assert.rejects(()=>explorePrefixTailV4(runtime,renamed,{plan:larger,qualificationOnly:true,ledgerDirectory:directory}),/INPUT_ALREADY_ATTEMPTED/);
 assert.equal((await fs.readdir(directory)).filter(p=>p.endsWith('.request.json')).length,1);
 evidence.push({test:'shared-budget-one-tail-failure-and-retry-block',passed:true,report:r});
});

test('independent: real first-contact exit and omitted unit steps reject before tail and seal original request',async()=>{
 const reports=[];
 for(const [label,prefix]of [['early-contact',[{blockId:'r',path:[[0,1]]}]],
  ['jump',[{blockId:'r',path:[],exitSide:'top'},{blockId:'b',path:[[-1,0]]}]]]){
  const {result:r,directory}=await run(candidate(prefix),label);assert.equal(r.accepted,false);assert.equal(r.lowerBound,null);
  assert.equal(r.upperConstruction.tailSearches,0);assert.match(r.upperConstruction.reason,label==='jump'?/unit step/:/Pointer-down exit/);
  assert(await fs.stat(path.join(directory,`${r.attempt.id}.blocked.json`)));reports.push(r);
 }
 evidence.push({test:'first-contact-and-unit-path-negatives',passed:true,reports});
});

test('independent: no mechanism-state reset, nonrectangle, invalid prior budget or plan mutation enters a search',async()=>{
 const rejected=[];
 for(const field of ['frozen','lockedBy','shutterId','timedBombSeconds','movementAxis']){
  const input=candidate();input.level.blocks[0][field]=field==='frozen'?1:'x';
  assert.throws(()=>makePrefixTailV4Plan(runtime,input,options()));rejected.push(field);
 }
 const nonrect=candidate();nonrect.level.blocks[0].shape=[[0,0],[1,0],[0,1]];
 assert.throws(()=>makePrefixTailV4Plan(runtime,nonrect,options()),/rectang/);
 for(const value of [-1,NaN,Infinity,10001]){
  const input=candidate();input.constructionAccounting.completeWorldReservations=value;
  assert.throws(()=>makePrefixTailV4Plan(runtime,input,options()));
 }
 for(const field of ['microStates','transitions','elapsedMilliseconds']){
  const input=candidate();input.constructionAccounting[field]=1e9;assert.throws(()=>makePrefixTailV4Plan(runtime,input,options()));
 }
 const input=candidate(),plan=makePrefixTailV4Plan(runtime,input,options());plan.innerPlan.tailBudget.maxStates++;
 const directory=path.join(out,'tampered-plan');
 await assert.rejects(()=>explorePrefixTailV4(runtime,input,{plan,qualificationOnly:true,ledgerDirectory:directory}),/plan changed/i);
 assert.equal(await fs.stat(directory).then(()=>true).catch(()=>false),false);
 assert.throws(()=>makePrefixTailV4Plan(runtime,input),'Unknown synthetic source cannot enter the production plan');
 // Namespace-only control: a real source ID lets plan preflight finish, but
 // the private production directory must reject before any source/model use.
 const namespaceControl={...input,sourceLevelId:runtime.LEVELS[0].id};
 const productionPlan=makePrefixTailV4Plan(runtime,namespaceControl);
 await assert.rejects(()=>explorePrefixTailV4(runtime,namespaceControl,{plan:productionPlan,ledgerDirectory:path.join(out,'not-public')}),/shared public/);
 const privatePlan=makePrefixTailV4Plan(runtime,input,options());
 for(const ledgerDirectory of [PUBLIC_ATTEMPT_LEDGER,path.join(PUBLIC_ATTEMPT_LEDGER,'qualification-must-not-write')])
  await assert.rejects(()=>explorePrefixTailV4(runtime,input,{plan:privatePlan,qualificationOnly:true,ledgerDirectory}),/isolated private/);
 evidence.push({test:'domain-plan-and-finite-resources',passed:true,rejected});
});

test('independent: changed accounting, source, prefix or full object cannot reuse a genuine construction descriptor',async()=>{
 const rejected=[];
 for(const kind of ['bytes','accounting','source','prefix','level']){
  const input=candidate();await bind(input,`provenance-${kind}`,prior=>{
   if(kind==='accounting')prior.constructionAccounting.completeWorldReservations=40;
   if(kind==='source')prior.sourceLevelId++;
   if(kind==='prefix')prior.prefixDrags=[];
   if(kind==='level')prior.levelSha256='1'.repeat(64);
  });
  if(kind==='bytes')input.constructionEvidence.sha256='1'.repeat(64);
  const plan=makePrefixTailV4Plan(runtime,input,options()),directory=path.join(out,`provenance-${kind}-ledger`);
  await assert.rejects(()=>explorePrefixTailV4(runtime,input,{plan,qualificationOnly:true,ledgerDirectory:directory}));
  assert.equal(await fs.stat(directory).then(()=>true).catch(()=>false),false);rejected.push(kind);
 }
 evidence.push({test:'actual-construction-file-binding-negatives',passed:true,rejected});
});

test('independent: all prior construction resources reduce the single upper allowance, never its independent lower budget',()=>{
 const input=candidate();Object.assign(input.constructionAccounting,{completeWorldReservations:7,microStates:17,transitions:29,elapsedMilliseconds:11});
 const plan=makePrefixTailV4Plan(runtime,input,options({maxStates:100,maxMicroStates:200,maxTransitions:500,maxMilliseconds:1000}));
 assert.equal(plan.innerPlan.tailBudget.maxStates,90); // 100 - prior7 - prefix2 - terminal1.
 assert.equal(plan.innerPlan.tailBudget.maxMicroStates,183);
 assert.equal(plan.innerPlan.tailBudget.maxTransitions,471);
 assert.equal(plan.innerPlan.tailBudget.maxMilliseconds,989);
 assert.equal(plan.lowerBudget.maxStates,100);
 for(const [field,value]of [['maxStates',10001],['maxMicroStates',3000001],['maxTransitions',10000001],['maxMilliseconds',30001]])
  assert.throws(()=>makePrefixTailV4Plan(runtime,input,{...options(),upperBudget:{[field]:value}}));
 assert.throws(()=>makePrefixTailV4Plan(runtime,input,{...options(),lowerBudget:{maxStates:10000}}),/9999/);
 evidence.push({test:'full-resource-reservation-and-independent-task-boundaries',passed:true,plan});
});

test('independent: a held turn that clears is zero reposition, not an artificial lower bound',async()=>{
 const input=candidate([{blockId:'o',path:[],exitSide:'right'},{blockId:'r',path:[[1,0],[1,1]],exitSide:'bottom'},
  {blockId:'g',path:[],exitSide:'left'}]);
 input.level.blocks=[{id:'o',x:1,y:0,shape:[[0,0],[0,1]],color:'blue'},
  {id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'g',x:0,y:1,shape:[[0,0]],color:'green'}];
 input.level.gates=[{id:'gb',side:'right',offset:0,size:2,color:'blue'},{id:'gr',side:'bottom',offset:1,size:1,color:'red'},
  {id:'gg',side:'left',offset:1,size:1,color:'green'}];
 const {result:r}=await run(input,'held-turn');assert.equal(r.accepted,false);assert.equal(r.upperConstruction.valid,true);
 assert.equal(r.upperConstruction.tailSearches,0);assert.equal(r.U,0);assert.equal(r.lowerBound,null);
 assert.equal(r.route.independentReplay.effectiveDrags,3);assert.equal(r.route.independentReplay.clearEvents,3);
 assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,5);
 evidence.push({test:'complete-stock-held-turn-cost-and-no-redundant-lower',passed:true,report:r});
});

test.after(async()=>{
 const files=[own,'tools/daily-challenge/formal-v4/prefix-tail-explore.mjs','tools/daily-challenge/formal-v4/runtime.mjs',
  'tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.mjs','tools/daily-challenge/formal-v3/reserved-guard-budget.mjs'];
 const bindings=Object.fromEntries(await Promise.all(files.map(async p=>[p,hash(await fs.readFile(p))])));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:evidence.length===7?'INDEPENDENT_PREFIX_TAIL_FIXTURES_COMPLETE':'INCOMPLETE',
  evidence,toolBindings:bindings,proofToolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,
  executionWorkspace:path.resolve('.'),runtimeGameSourceSha256:hash(await fs.readFile('src/game/ColorEscapeGame.ts')),
  runtimeScope:'The actual files in this execution workspace only; another UI workspace needs separate validation.',
  realCandidateSolverCalls:0,publicLedgerWrites:0,productionChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});

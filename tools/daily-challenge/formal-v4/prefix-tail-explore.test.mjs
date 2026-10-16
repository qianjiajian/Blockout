import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makePrefixTailV4Plan,explorePrefixTailV4} from './prefix-tail-explore.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const runtime=await loadV4Runtime(),evidence=[];
const out=process.env.PREFIX_TAIL_V4_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/prefix-tail-qualification-');
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
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{qualificationOnly:true,plan}),/isolated private/);
 await fs.appendFile(f.candidate.constructionEvidence.path,' ');
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{...f.options,plan}),/construction bytes changed/);
 assert.equal(await fs.stat(f.options.ledgerDirectory).then(()=>true).catch(()=>false),false);
 evidence.push({test:'domain-and-binding-negative',passed:true});
});

test.after(async()=>{
 const files=['tools/daily-challenge/formal-v4/prefix-tail-explore.mjs','tools/daily-challenge/formal-v4/prefix-tail-explore.test.mjs'];
 const bindings=Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await fs.readFile(p))])));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===4?'PASS':'INCOMPLETE',evidence,bindings,
  realCandidateConstructionInvocations:0,realCandidateSolverInvocations:0,publicLedgerClaims:0,qualificationOnly:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});

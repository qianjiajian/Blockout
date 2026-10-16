import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {constructRouteConstraint,auditRouteConstraint} from './route-constraint-construction.mjs';
import {withConstraintConstructionAttempt,CONSTRUCTION_LEDGER} from './constraint-attempt-guard.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
const runtime=await loadV4CatalogRuntime(),evidence=[],environment=prefixExecutionEnvironment(runtime);
const out=process.env.CONSTRAINT_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/constraint-construction-');
await fs.mkdir(out,{recursive:true});
function fixture(){
 const colors=['red','blue','green','yellow','purple','orange'];
 const level={id:999981,name:'synthetic constraint integration',difficulty:'hard',reward:0,timeSeconds:120,parMoves:30,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[['red','top',0],['blue','left',0],['green','top',2],['yellow','right',1],['purple','left',1],['orange','bottom',2]]
   .map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
 const drags=[{blockId:'b0',path:[],exitSide:'top'},{blockId:'b1',path:[[0,0]],exitSide:'left'},
  {blockId:'b2',path:[],exitSide:'top'},{blockId:'b5',path:[],exitSide:'bottom'},
  {blockId:'b4',path:[[1,0]]},{blockId:'b3',path:[[1,1],[2,1]],exitSide:'right'}];
 for(let i=0;i<15;i++)drags.push({blockId:'b4',path:[[1,i%2===0?1:0]]});
 drags.push({blockId:'b4',path:[[0,1]],exitSide:'left'});
 return{accepted:true,qualificationOnly:true,sourceLevelId:level.id,level,drags,levelSha256:levelSha256(level)};
}
function slot(m){return runtime.slots.find(s=>s.newestMechanism===m&&s.difficulty===1&&s.slot===10);}
function prior(base,m){const l=structuredClone(base.level);if(m==='key-lock'){l.blocks[0].keyId='old';l.blocks[1].lockedBy='old';l.blocks[1].lockCount=1;}
 else{l.flipDoors=[{...l.gates[0],initiallyOpen:true}];l.gates=l.gates.slice(1);}return l;}
test('fixed two-key/three-key releases and two real flip gates preserve one complete U16 without a new route',()=>{
 for(const m of ['key-lock','flip-door']){
  const base=fixture(),input=JSON.stringify(base),p=prior(base,m),result=constructRouteConstraint(runtime,base,slot(m),p);
  assert(result.ok,JSON.stringify(result));assert.equal(result.canonicalReplay.nonClearingDrags,16);assert.equal(routeSha256(result.drags),routeSha256(base.drags));
  const audit=auditRouteConstraint(runtime,result.level,result.drags,slot(m),p);assert(audit.passed,JSON.stringify(audit));
  assert.equal(audit.actualInstances,2);assert(audit.details.every(x=>x.active));
  if(m==='key-lock'){assert.deepEqual(audit.details.map(x=>x.value).sort(),[2,3]);assert.equal(new Set(audit.details.map(x=>x.unlockDrag)).size,2);}
  else assert(audit.details.every(x=>x.actualPortalExits.length&&x.actualPortalExits.every(e=>e.gateId===x.id&&e.openBeforeExit)));
  assert.equal(JSON.stringify(base),input);assert.equal(result.provenance.fullBoardSearches,0);assert(result.constructionAccounting.fullWorldReservations<=10000);
  evidence.push({mechanism:m,result,audit,mathematicalAcceptance:false});
 }
});
test('one-state construction failure seals the same base across key/flip in the existing shared-shape namespace',async()=>{
 const base=fixture(),dir=await fs.mkdtemp(`${out}/private-`),pub=`${dir}/public`,con=`${dir}/construction`;
 const ledger=await createAttemptLedger(pub),attempt=await ledger.claim(base.level);await ledger.finish(attempt,{accepted:true,status:'SYNTHETIC_ONLY',levelSha256:base.levelSha256});
 const options={qualificationOnly:true,ledgerDirectory:con,publicLedgerDirectory:pub};let calls=0;
 const first=await withConstraintConstructionAttempt(runtime,base,slot('key-lock'),b=>{calls++;return constructRouteConstraint(runtime,b,slot('key-lock'),prior(base,'key-lock'),{worldBudget:{maxStates:1}});},options);
 assert(!first.ok&&first.terminalBlocked);assert.equal(first.constructionAccounting.fullWorldReservations,1);
 const second=await withConstraintConstructionAttempt(runtime,base,slot('flip-door'),()=>{calls++;throw Error('Must not run');},options);
 assert(!second.ok&&second.terminalBlocked&&!second.constructionAttemptStarted);assert.equal(calls,1);
 evidence.push({test:'one-state-failure-cross-stage-terminal',first,second});
});
test('public failed physical identity blocks all constraint construction callbacks',async()=>{
 const base=fixture(),dir=await fs.mkdtemp(`${out}/blocked-`),pub=`${dir}/public`;
 const ledger=await createAttemptLedger(pub),attempt=await ledger.claim(base.level);await ledger.finish(attempt,{accepted:false,status:'SYNTHETIC_FAILED',levelSha256:base.levelSha256});
 let calls=0;const result=await withConstraintConstructionAttempt(runtime,base,slot('key-lock'),()=>{calls++;},
  {qualificationOnly:true,ledgerDirectory:`${dir}/construction`,publicLedgerDirectory:pub});
 assert(!result.ok&&result.terminalBlocked&&!result.constructionAttemptStarted);assert.equal(calls,0);
 evidence.push({test:'public-old-failure-before-callback',result});
});
test('qualification never enters either production ledger or its children',async()=>{
 const base=fixture();let calls=0;
 for(const namespace of [CONSTRUCTION_LEDGER,PUBLIC_ATTEMPT_LEDGER])for(const p of [namespace,`${namespace}/synthetic-child`,
  path.resolve(environment.sourceWorkspace,namespace),path.resolve(environment.sourceWorkspace,namespace,'synthetic-new-child')]){
  await assert.rejects(withConstraintConstructionAttempt(runtime,base,slot('key-lock'),()=>{calls++;},
   {qualificationOnly:true,ledgerDirectory:p,publicLedgerDirectory:`${out}/private-unused`}),/private ledgers/);
  await assert.rejects(withConstraintConstructionAttempt(runtime,base,slot('key-lock'),()=>{calls++;},
   {qualificationOnly:true,ledgerDirectory:`${out}/private-unused`,publicLedgerDirectory:p}),/private ledgers/);
 }
 await assert.rejects(withConstraintConstructionAttempt(runtime,base,slot('key-lock'),()=>{calls++;},{qualificationOnly:'true'}),/boolean/);
 assert.equal(calls,0);evidence.push({test:'qualification-production-namespace-rejected',callbacks:0});
});
test.after(async()=>{await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===5?'PASS':'INCOMPLETE',evidence,
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,qualificationOnly:true,realCandidateConstructed:0,
 realPublicLedgerWrites:0,gameplaySearches:0,formalReady:false},null,2)+'\n',{flag:'wx'});});

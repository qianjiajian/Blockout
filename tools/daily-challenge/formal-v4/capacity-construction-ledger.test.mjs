import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {withCapacityConstructionAttempt,inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';

const runtime=await loadV4Runtime(),evidence=[];
const out=process.env.CAPACITY_LEDGER_QUALIFICATION_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/capacity-ledger-');
await fs.mkdir(out,{recursive:true});
function base(){const level={id:998631,name:'isolated ledger fixture',difficulty:'hard',reward:0,timeSeconds:120,parMoves:2,
 mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
 blocks:[{id:'a',x:0,y:0,color:'red',shape:[[0,0]]},{id:'b',x:1,y:0,color:'blue',shape:[[0,0]]}],
 gates:[{id:'r-out',color:'red',side:'left',offset:0,size:1},{id:'b-out',color:'blue',side:'right',offset:0,size:1}]};
 return{accepted:true,sourceLevelId:level.id,level,levelSha256:levelSha256(level),drags:[{blockId:'a',path:[],exitSide:'left'},{blockId:'b',path:[],exitSide:'right'}]};}
const slot=(mechanism='axis-block')=>({formalId:`isolated-${mechanism}`,newestMechanism:mechanism,difficulty:1});
async function dirs(){const directory=await fs.mkdtemp(`${out}/case-`);return{ledgerDirectory:`${directory}/construction`,publicLedgerDirectory:`${directory}/public`,qualificationOnly:true};}
function accounting(){const meter=createCapacityConstructionBudget({maxStates:10});meter.reserve(3,'qualification-world');meter.expand();return meter.report();}
function fixtureResult(input){return{ok:true,level:input.level,drags:input.drags,levelSha256:input.levelSha256,routeSha256:routeSha256(input.drags),audit:{passed:true},
 provenance:{inputLevelSha256:input.levelSha256,inputRouteSha256:routeSha256(input.drags),outputLevelSha256:levelSha256(input.level),outputRouteSha256:routeSha256(input.drags),constructionAccounting:accounting()}};}

test('every failed dynamic result is terminal across stages, not only budget exhaustion',async()=>{
 const options=await dirs(),input=base();let calls=0;
 const first=await withCapacityConstructionAttempt(runtime,input,slot(),async()=>{calls++;return{ok:false,status:'NO_LEGAL_ROUTE_WITHIN_FINITE_ATTEMPTS',constructionAccounting:accounting()};},options);
 assert(first.terminalBlocked&&first.constructionAttemptStarted&&!first.ok);assert.equal(first.accepted,false);
 const second=await withCapacityConstructionAttempt(runtime,{...input,level:{...input.level,name:'renamed'},levelSha256:levelSha256({...input.level,name:'renamed'})},slot('colored-grid'),async()=>{calls++;return fixtureResult(input);},options);
 assert(second.terminalBlocked&&!second.constructionAttemptStarted);assert.equal(calls,1);
 const saved=JSON.parse(await fs.readFile(first.resultFile));assert.equal(saved.terminalBlocked,true);assert(saved.constructionAccounting);
 evidence.push({test:'all-failures-cross-stage',passed:true,first,second});
});

test('exceptions and exhausted reservations close the same claim, with no alternate-count retry',async()=>{
 for(const errorKind of ['throw','budget']){
  const options=await dirs(),input=base();let calls=0;
  const first=await withCapacityConstructionAttempt(runtime,input,slot(),async()=>{calls++;if(errorKind==='throw')throw Error('callback failed after starting');
   return{ok:false,budgetExhausted:true,status:'CAPACITY_CONSTRUCTION_BUDGET_EXHAUSTED',constructionAccounting:accounting()};},options);
  assert(first.terminalBlocked&&!first.ok);const retry=await withCapacityConstructionAttempt(runtime,input,slot(),async()=>{calls++;},options);
  assert(retry.terminalBlocked);assert.equal(calls,1);evidence.push({test:`terminal-${errorKind}`,passed:true,first,retry});
 }
});

test('old mathematical failures and pending attempts block before construction while accepted evidence stays byte-identical',async()=>{
 for(const accepted of [false,null,true]){
  const options=await dirs(),input=base(),publicLedger=await createAttemptLedger(options.publicLedgerDirectory),request=await publicLedger.claim(input.level);
  if(accepted!==null)await publicLedger.finish(request,{accepted,status:accepted?'HISTORICAL_VERIFIED':'HISTORICAL_UNKNOWN',levelSha256:input.levelSha256});
  const file=`${options.publicLedgerDirectory}/${request.id}.${accepted===null?'request':'result'}.json`,before=await fs.readFile(file);let calls=0;
  const result=await withCapacityConstructionAttempt(runtime,input,slot(),async()=>{calls++;return{ok:false,status:'NEW_CONSTRUCTION_FAIL',constructionAccounting:accounting()};},options);
  assert.equal(calls,accepted===true?1:0);assert(result.terminalBlocked);assert.deepEqual(await fs.readFile(file),before);
  evidence.push({test:`historical-${accepted}`,passed:true,result});
 }
});

test('claimed complete U must be actual and counted; success is U only and cannot construct again',async()=>{
 const options=await dirs(),input=base();const result=await withCapacityConstructionAttempt(runtime,input,slot(),async()=>fixtureResult(input),options);
 assert(result.ok&&result.accepted,JSON.stringify(result));assert.equal(result.U,0);assert.equal(result.mathematicalAcceptance,false);assert.equal(result.mathematicalLowerSearchInvocations,0);
 assert(result.canonicalReplay.complete&&result.independentReplay.complete);assert.equal(result.terminalBlocked,false);assert(result.resultFile);
 const next=await withCapacityConstructionAttempt(runtime,input,slot('colored-grid'),async()=>{throw Error('must not execute');},options);assert(next.terminalBlocked);
 for(const tamper of [r=>delete r.provenance.constructionAccounting,r=>r.provenance.constructionAccounting.fullWorldReservations=10001,
  r=>r.provenance.constructionAccounting.maxStates=Infinity,r=>r.provenance.outputLevelSha256='0'.repeat(64),r=>r.drags.pop()]){
  const badOptions=await dirs(),badInput=base(),r=fixtureResult(badInput);tamper(r);
  const bad=await withCapacityConstructionAttempt(runtime,badInput,slot(),async()=>r,badOptions);assert(!bad.ok&&bad.terminalBlocked);assert.equal(bad.mathematicalAcceptance,false);
 }
 evidence.push({test:'actual-complete-U-no-math-and-negative',passed:true,result,next});
});

test('failure descendants require both actual shape and colour, and arbitrary production ledger overrides reject',async()=>{
 const options=await dirs(),input=base();const failed=await withCapacityConstructionAttempt(runtime,input,slot(),async()=>({ok:false}),options);
 const changed=structuredClone(input);changed.level.blocks[0].color='green';changed.levelSha256=levelSha256(changed.level);
 const noShape=await withCapacityConstructionAttempt(runtime,changed,slot(),async()=>{throw Error('must not enter');},{...options,redesignOf:failed.constructionAttempt.id});
 assert(noShape.terminalBlocked&&!noShape.constructionAttemptStarted);assert(noShape.reason.includes('BOTH'));
 await assert.rejects(()=>withCapacityConstructionAttempt(runtime,input,slot(),async()=>({ok:false}),{...options,qualificationOnly:false}),/shared historical/);
 assert(inspectConstructionAccounting({...accounting(),expanded:10001}).length);assert(inspectConstructionAccounting({...accounting(),kinds:{faked:1}}).length);
 evidence.push({test:'redesign-and-ledger-negative',passed:true,noShape});
});

test.after(async()=>{
 const files=['capacity-construction-ledger.mjs','capacity-construction-ledger.test.mjs'].map(f=>`tools/daily-challenge/formal-v4/${f}`);
 const bindings=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===8&&evidence.every(e=>e.passed)?'CAPACITY_CONSTRUCTION_LEDGER_QUALIFIED':'INCOMPLETE_QUALIFICATION',
  bindings,evidence,mathematicalSearchInvocations:0,productionConstructionInvocations:0,syntheticControlFlowFixturesOnly:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});

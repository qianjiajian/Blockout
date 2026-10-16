import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {withStaticMechanismConstructionAttempt,staticStarReplayReservations,assertStaticStarDelta} from './static-mechanism-attempt-guard.mjs';
import {withCapacityConstructionAttempt,CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {HISTORY_ROOTS} from './early-prefix-four-contract.mjs';

const runtime=await loadV4CatalogRuntime(),evidence=[];
const out=process.env.STATIC_STAR_GUARD_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/star-guard-private-');
await fs.mkdir(out,{recursive:true});
const publicCount=async()=>(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).length;
const before=await publicCount();
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
 const colors=['red','blue','green','yellow','purple','orange'];
 const level={id:999843,name:'private two-star shared guard',difficulty:'hard',reward:0,timeSeconds:120,parMoves:7,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[['red','top',0],['blue','left',0],['green','top',2],['yellow','right',1],['purple','left',1],['orange','bottom',2]]
   .map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
 const drags=[{blockId:'b0',path:[],exitSide:'top'},{blockId:'b1',path:[[0,0]],exitSide:'left'},
  {blockId:'b2',path:[],exitSide:'top'},{blockId:'b5',path:[],exitSide:'bottom'},
  {blockId:'b4',path:[[1,0]]},{blockId:'b3',path:[[1,1],[2,1]],exitSide:'right'},
  {blockId:'b4',path:[[1,1],[0,1]],exitSide:'left'}];
 return{accepted:true,level,drags,levelSha256:levelSha256(level)};
}
const slot=m=>({formalId:`private-${m}`,newestMechanism:m,difficulty:1});
async function dirs(){const p=await fs.mkdtemp(`${out}/case-`);return{ledgerDirectory:`${p}/construction`,publicLedgerDirectory:`${p}/public`,qualificationOnly:true};}
function adapt(base,meter){
 meter.reserve(1,'fixed-star-proposal');const level=structuredClone(base.level);
 for(const id of ['b1','b3'])level.blocks.find(b=>b.id===id).star=true;
 for(const id of ['g1','g3'])level.gates.find(g=>g.id===id).star=true;
 const accounting=meter.report();return{ok:true,level,drags:base.drags,audit:{passed:true},primaryInstances:2,
  constructionAccounting:accounting,provenance:{inputLevelSha256:base.levelSha256,inputRouteSha256:routeSha256(base.drags),
   outputLevelSha256:levelSha256(level),outputRouteSha256:routeSha256(base.drags),constructionAccounting:accounting}};
}
test('actual star U and all guard validation worlds share one meter; accepted alias prevents any stage retry',async()=>{
 const options=await dirs(),base=fixture();const report=await withStaticMechanismConstructionAttempt(runtime,base,slot('star'),adapt,options);
 assert(report.accepted,report.reason);assert.equal(report.U,1);assert(report.canonicalReplay.complete&&report.independentReplay.complete);
 assert.equal(report.constructionAccounting.fullWorldReservations,2+staticStarReplayReservations(base.drags));
 assert.equal(report.constructionAccounting.kinds['shared-guard-complete-replays'],staticStarReplayReservations(base.drags));
 assert.equal(report.mathematicalAcceptance,false);assert.equal(report.mathematicalLowerSearchInvocations,0);
 let calls=0;const retry=await withCapacityConstructionAttempt(runtime,base,slot('axis-block'),async()=>{calls++;},options);
 assert.equal(calls,0);assert(retry.terminalBlocked&&!retry.constructionAttemptStarted);
 const renamed=structuredClone(base);renamed.level.name='same physical renamed';renamed.levelSha256=levelSha256(renamed.level);
 const retry2=await withStaticMechanismConstructionAttempt(runtime,renamed,slot('star'),async()=>{calls++;},options);assert.equal(calls,0);assert(retry2.terminalBlocked);
 evidence.push({test:'actual-U-shared-budget-accepted-cross-stage-alias',passed:true,report,retry,retry2});
});
test('failures cross both old four-stage and new star entry without callback or fallback',async()=>{
 for(const firstStar of [false,true]){
  const options=await dirs(),base=fixture();let calls=0;
  const fail=async()=>{calls++;return{ok:false,status:'FIXED_CONFIGURATION_FAILED'};};
  const first=firstStar?await withStaticMechanismConstructionAttempt(runtime,base,slot('star'),fail,options):await withCapacityConstructionAttempt(runtime,base,slot('axis-block'),fail,options);
  const next=firstStar?await withCapacityConstructionAttempt(runtime,base,slot('colored-grid'),fail,options):await withStaticMechanismConstructionAttempt(runtime,base,slot('star'),fail,options);
  assert.equal(calls,1);assert(first.terminalBlocked&&next.terminalBlocked);assert(!next.constructionAttemptStarted);
  const id=first.constructionAttempt.id;assert(await fs.stat(`${options.ledgerDirectory}/${id}.blocked.json`));
  assert(await fs.stat(`${options.ledgerDirectory}/identities/${first.constructionAttempt.retryIdentitySha256}.blocked.json`));
  evidence.push({test:`cross-stage-${firstStar?'star-first':'old-first'}`,passed:true,first,next});
 }
});
test('existing real private public failure and pending owner block before callback and preserve bytes',async()=>{
 for(const accepted of [false,null]){
  const options=await dirs(),base=fixture(),ledger=await createAttemptLedger(options.publicLedgerDirectory),request=await ledger.claim(base.level);
  if(accepted===false)await ledger.finish(request,{accepted:false,status:'UNKNOWN_TERMINAL',levelSha256:base.levelSha256});
  const file=`${options.publicLedgerDirectory}/${request.id}.${accepted===false?'result':'request'}.json`,bytes=await fs.readFile(file);let calls=0;
  const result=await withStaticMechanismConstructionAttempt(runtime,base,slot('star'),()=>{calls++;},options);
  assert.equal(calls,0);assert(result.terminalBlocked&&!result.constructionAttemptStarted);assert.deepEqual(await fs.readFile(file),bytes);
  evidence.push({test:`old-public-${accepted}`,passed:true,result});
 }
});
test('exact raw boundary pre-reserves both actual replays; exhaustion is terminal and cannot raise budget',async()=>{
 const base=fixture(),needed=2+staticStarReplayReservations(base.drags);
 for(const maxStates of [needed,needed-1]){
  const options=await dirs();const result=await withStaticMechanismConstructionAttempt(runtime,base,slot('star'),adapt,{...options,worldBudget:{maxStates}});
  assert.equal(result.accepted,maxStates===needed);assert(result.constructionAccounting.fullWorldReservations<=maxStates);
  if(maxStates<needed){assert.equal(result.canonicalReplay,undefined);let calls=0;const retry=await withStaticMechanismConstructionAttempt(runtime,base,slot('star'),()=>{calls++;},{...options,worldBudget:{maxStates:10000}});assert.equal(calls,0);assert(retry.terminalBlocked);}
  evidence.push({test:`raw-boundary-${maxStates}`,passed:true,result});
 }
});
test('foreign mechanisms, bad delta, fake accounting and rejected callback all fail closed',async()=>{
 const base=fixture();for(const m of ['axis-block','flip-door','generator'])await assert.rejects(()=>withStaticMechanismConstructionAttempt(runtime,base,slot(m),adapt,{qualificationOnly:true,ledgerDirectory:`${out}/unused-c`,publicLedgerDirectory:`${out}/unused-p`}),/Only the reviewed star/);
 for(const tamper of [q=>q.level.blocks[0].movementAxis='horizontal',q=>q.level.gates[1].star=false,q=>q.constructionAccounting.fullWorldReservations++,q=>q.drags=q.drags.slice(0,-1)]){
  const options=await dirs(),report=await withStaticMechanismConstructionAttempt(runtime,base,slot('star'),(b,m)=>{const q=adapt(b,m);tamper(q);return q;},options);
  assert(!report.accepted&&report.terminalBlocked);assert(report.constructionAttemptStarted);
 }
 for(const maxStates of [0,10001,Infinity,NaN]){const options=await dirs();await assert.rejects(()=>withStaticMechanismConstructionAttempt(runtime,base,slot('star'),adapt,{...options,worldBudget:{maxStates}}));}
 const x=adapt(base,{reserve(){},report(){return{};}});assertStaticStarDelta(base.level,x.level,x.drags);
 evidence.push({test:'domain-delta-accounting-and-complete-inventory-negative',passed:true});
});
test('private qualification rejects all seven shared roots including physical junction aliases',async()=>{
 const base=fixture();assert.equal(HISTORY_ROOTS.length,7);
 for(const root of HISTORY_ROOTS){for(const dir of [root,path.join(await fs.realpath(root),'not-created-private-child')])await assert.rejects(()=>withStaticMechanismConstructionAttempt(runtime,base,slot('star'),adapt,{qualificationOnly:true,ledgerDirectory:dir,publicLedgerDirectory:`${out}/safe-public`}),/private ledgers/);}
 await assert.rejects(()=>withStaticMechanismConstructionAttempt(runtime,base,slot('star'),adapt,{qualificationOnly:'yes'}));
 const productionOptions=await dirs();await assert.rejects(()=>withStaticMechanismConstructionAttempt(runtime,base,slot('star'),adapt,{...productionOptions,qualificationOnly:false}),/shared historical/);
 evidence.push({test:'seven-roots-and-junction-private-isolation',passed:true});
});
test.after(async()=>{
 const own='tools/daily-challenge/formal-v4/static-mechanism-attempt-guard.mjs',fileBindings={...runtime.toolchainBindings};
 const compiled=await build({entryPoints:[own],bundle:true,platform:'node',format:'esm',write:false,metafile:true,logLevel:'silent',packages:'external'});
 for(const f of Object.keys(compiled.metafile.inputs))fileBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 const testFile=own.replace('.mjs','.test.mjs');fileBindings[testFile]=sha(await fs.readFile(testFile));
 const report={status:evidence.length===9?'STATIC_STAR_SHARED_GUARD_PRIVATE_PASS':'INCOMPLETE_PRIVATE_QUALIFICATION',tests:6,evidence,fileBindings,toolBindings:fileBindings,
  proofToolchainSha256:runtime.toolchainSha256,publicRequestCountBeforeAfter:[before,await publicCount()],newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,newLedgerNamespace:false,originalCapacityGuardChanged:false,formalReady:false};
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

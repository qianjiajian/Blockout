import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {withStaticMechanismConstructionAttempt as batch,staticStarReplayReservations,assertStaticStarDelta} from './static-mechanism-attempt-guard-batch.mjs';
import {withStaticMechanismConstructionAttempt as old} from './static-mechanism-attempt-guard.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const runtime=await loadV4CatalogRuntime(),evidence=[],own='tools/daily-challenge/formal-v4/static-mechanism-attempt-guard-batch.mjs';
const out=process.env.STATIC_STAR_BATCH_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/star-d1d2-private-');
await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const publicCount=async()=>(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(f=>f.endsWith('.request.json')).length;
const before=await publicCount();
const historicalQualification={path:'deliverables/daily-formal-v4-20261008/proof/static-star-shared-guard-private-01/report.json',sha256:'e229c6fdc0135831b9e2c80da87545e7e9e68511a9a10f5dbf45273df957eb42'};
function fixture(){
 const colors=['red','blue','green','yellow','purple','orange'];
 const level={id:999845,name:'private D2 three-star guard',difficulty:'hard',reward:0,timeSeconds:120,parMoves:7,
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
const slot=difficulty=>({formalId:`private-star-d${difficulty}`,newestMechanism:'star',difficulty});
async function dirs(){const p=await fs.mkdtemp(`${out}/case-`);return{qualificationOnly:true,ledgerDirectory:`${p}/construction`,publicLedgerDirectory:`${p}/public`};}
function adapt(base,meter,count=3){
 meter.reserve(1,'fixed-star-proposal');const level=structuredClone(base.level);
 for(const n of [1,3,4].slice(0,count)){level.blocks[n].star=true;level.gates[n].star=true;}
 const accounting=meter.report();return{ok:true,level,drags:base.drags,primaryInstances:count,audit:{passed:true},constructionAccounting:accounting,
  provenance:{inputLevelSha256:base.levelSha256,inputRouteSha256:routeSha256(base.drags),outputLevelSha256:levelSha256(level),outputRouteSha256:routeSha256(base.drags),constructionAccounting:accounting}};
}
test('D2 genuinely moves and exits three distinct-color stars with full dual U and shared reservations',async()=>{
 const base=fixture(),options=await dirs();const q=await batch(runtime,base,slot(2),adapt,options);
 assert(q.accepted,q.reason);assert.equal(q.U,1);assert.equal(q.level.blocks.filter(b=>b.star).length,3);assert.equal(q.level.gates.filter(g=>g.star).length,3);
 assert(q.canonicalReplay.complete&&q.independentReplay.complete);assert.equal(q.independentReplay.remainingBodies,0);
 assert.equal(q.constructionAccounting.fullWorldReservations,2+staticStarReplayReservations(base.drags));
 assert.equal(q.mathematicalAcceptance,false);assert.equal(q.mathematicalLowerSearchInvocations,0);
 evidence.push({test:'actual-three-star-complete-dual-U',passed:true,report:q});
});
test('D1/D2 exact counts and genuine third-star participation fail closed before mathematical proof',async()=>{
 const base=fixture();
 for(const [difficulty,count]of [[2,2],[1,3]]){const options=await dirs(),q=await batch(runtime,base,slot(difficulty),(b,m)=>adapt(b,m,count),options);assert(!q.accepted&&q.terminalBlocked);assert.match(q.reason,/Exact difficulty/);}
 const options=await dirs(),q=await batch(runtime,base,slot(2),(b,m)=>{const r=adapt(b,m);delete r.level.blocks[4].star;delete r.level.gates[4].star;r.level.blocks[0].star=true;r.level.gates[0].star=true;return r;},options);
 assert(!q.accepted&&q.terminalBlocked);assert.match(q.reason,/Every star must really move/);
 for(const difficulty of [0,3,NaN]){const opts=await dirs();let calls=0;await assert.rejects(()=>batch(runtime,base,slot(difficulty),()=>{calls++;},opts),/Only the reviewed star/);assert.equal(calls,0);}
 assert.throws(()=>assertStaticStarDelta(base.level,base.level,base.drags,3),/Only D1 or D2/);
 evidence.push({test:'exact-band-count-and-third-participation-negatives',passed:true});
});
test('D2 exact world boundary remains pre-reserved and a failed budget cannot switch to old D1 entry',async()=>{
 const base=fixture(),required=2+staticStarReplayReservations(base.drags);
 for(const maxStates of [required,required-1]){const options=await dirs(),q=await batch(runtime,base,slot(2),adapt,{...options,worldBudget:{maxStates}});assert.equal(q.accepted,maxStates===required);assert(q.constructionAccounting.fullWorldReservations<=maxStates);
  if(!q.accepted){assert.equal(q.canonicalReplay,undefined);let calls=0;const next=await old(runtime,base,slot(1),()=>{calls++;},{...options,worldBudget:{maxStates:10000}});assert.equal(calls,0);assert(next.terminalBlocked&&!next.constructionAttemptStarted);}
 }
 evidence.push({test:'shared-budget-precharge-and-cross-version-failure',passed:true,exactLimit:required});
});
test('old accepted/failure ownership blocks new D2; the only source edits are declared star count metadata',async()=>{
 const base=fixture();for(const accepted of [true,false]){const options=await dirs();const first=await old(runtime,base,slot(1),accepted?(b,m)=>adapt(b,m,2):()=>({ok:false,status:'PRIVATE_FIXED_FAILURE'}),options);assert.equal(first.accepted,accepted);let calls=0;const next=await batch(runtime,base,slot(2),()=>{calls++;},options);assert.equal(calls,0);assert(next.terminalBlocked&&!next.constructionAttemptStarted);}
 const declared=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/proof/static-star-d1d2-declared-diff.json'));const originalBytes=await fs.readFile(declared.original.path);assert.equal(sha(originalBytes),declared.original.sha256);
 let expected=originalBytes.toString();for(const [a,b]of declared.replacements){assert.equal(expected.split(a).length,2);expected=expected.replace(a,b);}assert.equal(await fs.readFile(own,'utf8'),expected);
 assert.equal(sha(await fs.readFile(historicalQualification.path)),historicalQualification.sha256);
 const historical=JSON.parse(await fs.readFile(historicalQualification.path));assert.equal(historical.status,'STATIC_STAR_SHARED_GUARD_PRIVATE_PASS');assert.equal(historical.tests,6);
 evidence.push({test:'old-entry-ownership-and-exact-declared-diff',passed:true,historicalSixReusedWithoutRerun:true});
});
test.after(async()=>{
 const fileBindings={...runtime.toolchainBindings};const compiled=await build({entryPoints:[own],bundle:true,platform:'node',format:'esm',write:false,metafile:true,packages:'external',logLevel:'silent'});
 for(const f of [...Object.keys(compiled.metafile.inputs),own.replace('.mjs','.test.mjs'),historicalQualification.path,'tools/daily-challenge/formal-v4/static-mechanism-attempt-guard.mjs','deliverables/daily-formal-v4-20261008/proof/static-star-d1d2-declared-diff.json'])fileBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 const report={status:evidence.length===4?'STATIC_STAR_D1D2_SHARED_GUARD_PRIVATE_PASS':'INCOMPLETE_PRIVATE_QUALIFICATION',tests:4,evidence,historicalQualification,fileBindings,toolBindings:fileBindings,
  proofToolchainSha256:runtime.toolchainSha256,publicRequestCountBeforeAfter:[before,await publicCount()],newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,
  newLedgerNamespace:false,originalGuardChanged:false,searchAlgorithmChanged:false,formalReady:false};
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

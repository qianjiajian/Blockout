import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,after} from 'node:test';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {SELF,STAR_RESERVE_TASK_VERSION,STAR_RESERVE_INPUTS,STAR_SLOT,EXPECTED_STARS,STAR_LOWER_BUDGET,
 assertStarReservePlan,assertReserveEvidence,constructKnownStarPair,assertExpectedStars,assertStarFinalMath} from './star-reserve-task.mjs';
import {withStaticMechanismConstructionAttempt,staticStarReplayReservations} from './static-mechanism-attempt-guard.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {qualifyBoundedCandidateV4,PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
const runtime=await loadV4CatalogRuntime(),out=process.env.STAR_RESERVE_TEST_OUT??'deliverables/daily-formal-v4-20261008/proof/star-reserve-task-private-01';
await fs.mkdir(out,{recursive:false});const evidence=[],sha=b=>createHash('sha256').update(b).digest('hex');
const publicNames=async()=>(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),before=await publicNames();
const check=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});
const read=async p=>JSON.parse(await fs.readFile(p));
function fixture(){
 const colors=['red','blue','green','yellow','purple','orange'],level={id:999844,name:'PRIVATE one star adaptation fixture',difficulty:'hard',reward:0,timeSeconds:120,parMoves:22,mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[['red','left',1],['blue','top',1],['green','top',2],['yellow','right',1],['purple','bottom',1],['orange','bottom',2]].map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
 const drags=[{blockId:'b1',path:[],exitSide:'top'},{blockId:'b2',path:[],exitSide:'top'},{blockId:'b4',path:[],exitSide:'bottom'},{blockId:'b5',path:[],exitSide:'bottom'}];
 for(let i=0;i<16;i++)drags.push({blockId:'b0',path:[[i%2===0?1:0,0]]});
 drags.push({blockId:'b3',path:[[1,1],[2,1]],exitSide:'right'},{blockId:'b0',path:[[0,1]],exitSide:'left'});
 const prior=structuredClone(level);prior.blocks[0].star=true;prior.gates[0].star=true;
 const base={accepted:true,qualificationOnly:true,sourceLevelId:level.id,level,drags,levelSha256:levelSha256(level)};
 const rt={...runtime,LEVELS:[level]},expected=[{id:'b0',color:'red',gateId:'g0',exitDrag:22},{id:'b3',color:'yellow',gateId:'g3',exitDrag:21}];
 return{rt,base,prior,expected};
}

check('real tiny known U16 uses exactly two predetermined stars, real gates and shared complete-inventory budget',async()=>{
 const f=fixture(),original=JSON.stringify(f.base),dir=await fs.mkdtemp(`${out}/guard-`);
 const q=await withStaticMechanismConstructionAttempt(f.rt,f.base,STAR_SLOT,(b,m)=>constructKnownStarPair(f.rt,b,f.prior,m,f.expected),{
  qualificationOnly:true,ledgerDirectory:dir+'/construction',publicLedgerDirectory:dir+'/public'});
 assert(q.ok,q.reason??q.adaptation?.failedAttempts?.[0]?.error);assert.equal(q.U,16);assert.deepEqual(q.primaryInstances,f.expected);
 assert.equal(q.constructionAccounting.fullWorldReservations,17+3.5*staticStarReplayReservations(f.base.drags));
 assert.equal(q.canonicalReplay.clearEvents,6);assert.equal(q.independentReplay.remainingBodies,0);assert.equal(JSON.stringify(f.base),original);
 await fs.writeFile(`${out}/toy-construction.json`,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
});
check('budget is reserved before intensify creates or replays any world; no retry configuration',async()=>{
 const f=fixture();let models=0;const rt={...f.rt,PuzzleModel:class extends f.rt.PuzzleModel{constructor(...a){super(...a);models++;}}};
 const b=createCapacityConstructionBudget({maxStates:1});await assert.rejects(()=>constructKnownStarPair(rt,f.base,f.prior,b,f.expected),/budget/i);assert.equal(models,0);assert(b.report().fullWorldReservations<=1);
 const enough=createCapacityConstructionBudget({maxStates:10000}),wrong=structuredClone(f.expected);wrong[0].gateId='not-the-real-gate';
 await assert.rejects(()=>constructKnownStarPair(f.rt,f.base,f.prior,enough,wrong),/Exact chosen stars/);assert(enough.report().fullWorldReservations>0);
});
check('exact source195 old receipt/public proof link cannot be replaced, and retired/source5 is not whitelisted',async()=>{
 const d=STAR_RESERVE_INPUTS,base=await read(d.base.path),lineage=await read(d.lineage.path);
 assert.equal(sha(await fs.readFile(d.base.path)),d.base.sha256);assert.equal(sha(await fs.readFile(d.lineage.path)),d.lineage.sha256);
 const request=await read(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.request.json`),result=await read(`${PUBLIC_ATTEMPT_LEDGER}/${base.attempt.id}.result.json`);
 assertReserveEvidence(base,request,result,lineage);
 for(const mutate of [x=>x.accepted=false,x=>x.level.blocks[0].x++,x=>x.drags[0].path.push([0,0]),x=>x.sourceLevelId=5]){const x=structuredClone(base);mutate(x);assert.throws(()=>assertReserveEvidence(x,request,result,lineage));}
 const wrong=structuredClone(result);wrong.lower.cost=15;assert.throws(()=>assertReserveEvidence(base,request,wrong,lineage));
 const retired=structuredClone(lineage);retired.source195.oldReuseScreen.visualSkeletonMatches.push({id:'retired'});assert.throws(()=>assertReserveEvidence(base,request,result,retired));
});
check('immutable one-base plan rejects omitted153, altered stars/stage, extra attempt or excessive budget',async()=>{
 const p={schemaVersion:4,scope:300,version:STAR_RESERVE_TASK_VERSION,inputs:STAR_RESERVE_INPUTS,slot:STAR_SLOT,expectedStars:EXPECTED_STARS,sourceLevelId:195,
  expectedU:16,requiredFloor:16,maximumUpper:20,construction:{variant:0,maxAttempts:1,instances:2,maxStates:10000},lowerBudget:STAR_LOWER_BUDGET,
  oneBaseOneStage:true,fallbackAllowed:false,originalPlainSearchAllowed:false,lineageClassification:'explicitly-reviewed-regional-retile-reserve-not-whole-board',formalReady:false,productionChanged:false,bindings:{[SELF]:sha(await fs.readFile(SELF))}};
 assertStarReservePlan(p);
 for(const change of [q=>delete q.inputs.selection,q=>q.slot.newestMechanism='generator',q=>q.expectedStars.reverse(),q=>q.construction.maxAttempts=2,q=>q.lowerBudget.maxStates=10000,q=>q.fallbackAllowed=true,q=>q.lineageClassification='wholeboard']){const q=structuredClone(p);change(q);assert.throws(()=>assertStarReservePlan(q));}
});
check('wrong physical star gate or missing participation cannot be substituted by metadata',async()=>{
 const f=fixture(),m=createCapacityConstructionBudget({maxStates:10000}),q=await constructKnownStarPair(f.rt,f.base,f.prior,m,f.expected);
 const events=f.expected.map(x=>({blockId:x.id,gateId:x.gateId,gateColor:x.color,gateStar:true,drag:x.exitDrag}));assertExpectedStars(q.level,events,f.expected);
 for(const tamper of [e=>e[0].gateStar=false,e=>e[0].gateColor='blue',e=>e.pop(),e=>e[0].gateId='ordinary']){const e=structuredClone(events);tamper(e);assert.throws(()=>assertExpectedStars(q.level,e,f.expected));}
 const prior=structuredClone(f.prior);prior.blocks[3].star=true;prior.gates[3].star=true;
 await assert.rejects(()=>constructKnownStarPair(f.rt,f.base,prior,createCapacityConstructionBudget({maxStates:10000}),f.expected));
});
check('fresh final original L16 is actually searched once in private and rejects the toy shortcut; no inherited L',async()=>{
 const f=fixture(),dir=await fs.mkdtemp(`${out}/math-`),ledger=await createAttemptLedger(dir+'/public'),attempt=await ledger.claim(f.base.level),status='PRIVATE_SYNTHETIC_ACCEPTED_PARENT_NOT_A_REAL_CERTIFICATE';
 await ledger.finish(attempt,{accepted:true,status,levelSha256:f.base.levelSha256});
 const parent={...f.base,attempt,status,routeSha256:routeSha256(f.base.drags)},bytes=JSON.stringify(parent,null,2)+'\n',file=dir+'/base.json';await fs.writeFile(file,bytes,{flag:'wx'});
 const m=createCapacityConstructionBudget({maxStates:10000}),built=await constructKnownStarPair(f.rt,f.base,f.prior,m,f.expected);
 const q=await qualifyBoundedCandidateV4(f.rt,{...STAR_SLOT,sourceLevelId:f.base.sourceLevelId,level:built.level,drags:built.drags},{qualificationOnly:true,ledgerDirectory:dir+'/public',
  mechanismBaseReceipt:{path:file,sha256:sha(bytes)},lowerBudget:STAR_LOWER_BUDGET,routeBudget:STAR_LOWER_BUDGET});
 assert.equal(q.accepted,false);assert.equal(q.catalogEligible,false);assert.equal(q.status,'UNKNOWN_LOWER',q.reasons?.join(';'));
 assert.equal(q.U,16);assert.equal(q.L,null);assert.equal(q.lowerBound.requiredFloor,16);assert.equal(q.lowerBound.inputLevelSha256,levelSha256(built.level));
 assert.equal(q.lowerBound.result.status,'relaxed-shortcut');assert(q.lowerBound.result.cost<16);assert(q.lowerBound.result.rawFullBoardStates<=9999);
 assertStarFinalMath(q,built.level,built.drags);for(const tamper of [x=>x.routeSha256='0'.repeat(64),x=>x.levelSha256='1'.repeat(64),x=>x.route.search={drags:[]}]){const x=structuredClone(q);tamper(x);assert.throws(()=>assertStarFinalMath(x,built.level,built.drags));}
 assert(await fs.stat(`${dir}/public/${q.attempt.identityOrigin}.blocked.json`));assert(await fs.stat(`${dir}/public/identities/${q.attempt.retryIdentitySha256}.blocked.json`));
 const again=await qualifyBoundedCandidateV4(f.rt,{...STAR_SLOT,sourceLevelId:f.base.sourceLevelId,level:built.level,drags:built.drags},{qualificationOnly:true,ledgerDirectory:dir+'/public',mechanismBaseReceipt:{path:file,sha256:sha(bytes)},lowerBudget:STAR_LOWER_BUDGET});assert.equal(again.attempt,undefined);assert.equal(again.accepted,false);
 await fs.writeFile(`${out}/private-final-proof.json`,JSON.stringify({q,again},null,2)+'\n',{flag:'wx'});
});
after(async()=>{
 const fileBindings={...runtime.toolchainBindings};const c=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const f of Object.keys(c.metafile.inputs))fileBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));fileBindings[SELF.replace('.mjs','.test.mjs')]=sha(await fs.readFile(SELF.replace('.mjs','.test.mjs')));
 const after=await publicNames();assert.deepEqual(after,before);
 const report={status:evidence.length===6&&evidence.every(e=>e.passed)?'STAR_RESERVE_TASK_PRIVATE_PASS':'STAR_RESERVE_TASK_PRIVATE_FAIL',tests:6,evidence,fileBindings,
  proofToolchainSha256:runtime.toolchainSha256,publicRequestCountBeforeAfter:[before.length,after.length],newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,
  privateSyntheticFinalLowerCalls:1,productionPlanPrepared:false,formalReady:false};
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

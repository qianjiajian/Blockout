import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,after} from 'node:test';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {SELF,VERSION,DONOR_REVIEW,plannedStarInstances,assertDonorEvidence,assertStarDonorBatchPlan,constructTaskStars,assertOriginalFinalMath} from './star-donor-batch-task.mjs';
import {STAR_LOWER_BUDGET} from './star-reserve-task.mjs';
import {withStaticMechanismConstructionAttempt,staticStarReplayReservations} from './static-mechanism-attempt-guard-batch.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {qualifyBoundedCandidateV4,PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
const rt=await loadV4CatalogRuntime(),out=process.env.STAR_DONOR_BATCH_TEST_OUT??'deliverables/daily-formal-v4-20261008/proof/star-donor-batch-private-01';
await fs.mkdir(out,{recursive:false});const sha=b=>createHash('sha256').update(b).digest('hex'),evidence=[];
const names=async()=>(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),before=await names();
const read=async p=>JSON.parse(await fs.readFile(p));
const check=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});
const review=await read(DONOR_REVIEW.path);assert.equal(sha(await fs.readFile(DONOR_REVIEW.path)),DONOR_REVIEW.sha256);
function fixture(){
 const colors=['red','blue','green','yellow','purple','orange'],level={id:999846,name:'PRIVATE D2 star intensify fixture',difficulty:'hard',reward:0,timeSeconds:120,parMoves:27,mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[['red','top',0],['blue','left',0],['green','top',2],['yellow','right',1],['purple','left',1],['orange','bottom',2]].map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
 const drags=[{blockId:'b0',path:[],exitSide:'top'},{blockId:'b1',path:[[0,0]],exitSide:'left'},{blockId:'b2',path:[],exitSide:'top'},{blockId:'b5',path:[],exitSide:'bottom'},{blockId:'b4',path:[[1,0]]}];
 for(let i=0;i<20;i++)drags.push({blockId:'b4',path:[[i%2===0?2:1,0]]});drags.push({blockId:'b3',path:[[1,1],[2,1]],exitSide:'right'},{blockId:'b4',path:[[1,1],[0,1]],exitSide:'left'});
 const prior=structuredClone(level);prior.blocks[1].star=true;prior.gates[1].star=true;
 return{runtime:{...rt,LEVELS:[level]},base:{accepted:true,qualificationOnly:true,sourceLevelId:level.id,level,drags,levelSha256:levelSha256(level)},prior,
  slot:rt.slots.find(s=>s.formalId==='daily-mechanisms-star-100-d2-06')};
}
check('five exact historical quotient donors remain historical; altered failed-generator boundary is rejected',async()=>{
 for(const row of review.rows.filter(r=>r.sourceLevelId!==151)){
  const b=await read(row.candidate.path);assert.equal(sha(await fs.readFile(row.candidate.path)),row.candidate.sha256);
  const request=await read(`${PUBLIC_ATTEMPT_LEDGER}/${b.attempt.id}.request.json`),result=await read(`${PUBLIC_ATTEMPT_LEDGER}/${b.attempt.id}.result.json`);
  assertDonorEvidence(b,request,result,row);assert.equal(plannedStarInstances(b,b.difficulty).length,b.difficulty+1);
  for(const mutation of [x=>x.currentRawCountCertified=true,x=>x.priorMechanismAdaptations[0].localHeldSearches=1,x=>x.priorMechanismAdaptations[0].publicMathAttempt='failed',x=>x.priorMechanismAdaptations[0].reportedFinalLevel=true]){const x=structuredClone(row);mutation(x);assert.throws(()=>assertDonorEvidence(b,request,result,x));}
  const bad=structuredClone(result);bad.accepted=false;assert.throws(()=>assertDonorEvidence(b,request,bad,row));
 }
});
check('variant0 deterministic metadata matches last moving body per colour without constructing a new real donor',async()=>{
 const base={level:{blocks:[{id:'a',color:'red'},{id:'b',color:'blue'},{id:'c',color:'red'},{id:'d',color:'green'}],gates:[{id:'r',color:'red'},{id:'b',color:'blue'},{id:'g',color:'green'}]},
  drags:[{blockId:'a',path:[[0,0]],exitSide:'left'},{blockId:'b',path:[[0,0]],exitSide:'left'},{blockId:'c',path:[[0,0]],exitSide:'left'},{blockId:'d',path:[[0,0]],exitSide:'left'}]};
 assert.deepEqual(plannedStarInstances(base,1).map(x=>x.id),['b','c']);assert.deepEqual(plannedStarInstances(base,2).map(x=>x.id),['b','c','d']);assert.throws(()=>plannedStarInstances(base,3));
});
check('data-driven slots and current selection cannot be silently omitted, relabelled or over-budget',async()=>{
 const tasks=review.rows.filter(r=>r.sourceLevelId!==151).map((h,i)=>{const difficulty=h.historicalU<=20?1:2,slot=rt.slots.find(s=>s.formalId===h.provisionalRecommendation.slot);return{index:i,base:h.candidate,historical:h,sourceLevelId:h.sourceLevelId,slot,
  expectedStars:Array.from({length:difficulty+1},(_,j)=>({id:String(j)})),expectedU:h.historicalU,requiredFloor:difficulty===1?16:21,maximumUpper:difficulty===1?20:30,
  construction:{variant:0,maxAttempts:1,instances:difficulty+1,maxStates:10000},lowerBudget:STAR_LOWER_BUDGET,historicalLowerReused:false};});
 const p={schemaVersion:4,scope:300,version:VERSION,donorReview:DONOR_REVIEW,selection:review.selected,selectionReview:{path:'PRIVATE-REVIEW',sha256:'a'.repeat(64)},selectedCount:154,
  tasks,maximumTasks:5,deferredSourceLevelIds:[151],oneBaseOneStage:true,fallbackAllowed:false,originalPlainSearchAllowed:false,formalReady:false,bindings:{[SELF]:sha(await fs.readFile(SELF))}};
 assertStarDonorBatchPlan(p);
 for(const mutate of [x=>delete x.selection,x=>x.selectedCount=152,x=>x.tasks[0].slot.difficulty=3,x=>x.tasks[0].construction.maxAttempts=2,x=>x.tasks[0].lowerBudget.maxStates=10000,x=>x.tasks[0].historicalLowerReused=true,x=>x.tasks[0].expectedU=31,x=>x.maximumTasks=6]){const x=structuredClone(p);mutate(x);assert.throws(()=>assertStarDonorBatchPlan(x));}
});
check('D2 actual intensify three-star route has shared two-model U21 and no uncharged retry',async()=>{
 const f=fixture(),dir=await fs.mkdtemp(`${out}/guard-`),expected=plannedStarInstances(f.base,2),original=JSON.stringify(f.base);
 const q=await withStaticMechanismConstructionAttempt(f.runtime,f.base,f.slot,(b,m)=>constructTaskStars(f.runtime,b,f.prior,f.slot,expected,m),{qualificationOnly:true,ledgerDirectory:dir+'/construction',publicLedgerDirectory:dir+'/public'});
 assert(q.ok,q.reason??q.adaptation?.failedAttempts?.[0]?.error);assert.equal(q.U,21);assert.equal(q.level.blocks.filter(b=>b.star).length,3);assert.deepEqual(q.primaryInstances,expected);
 assert.equal(q.constructionAccounting.fullWorldReservations,17+3.5*staticStarReplayReservations(f.base.drags));assert.equal(JSON.stringify(f.base),original);
 let calls=0;const retry=await withStaticMechanismConstructionAttempt(f.runtime,f.base,{...f.slot,difficulty:1},()=>{calls++;},{qualificationOnly:true,ledgerDirectory:dir+'/construction',publicLedgerDirectory:dir+'/public'});assert.equal(calls,0);assert(retry.terminalBlocked);
 await fs.writeFile(`${out}/private-three-star-construction.json`,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
});
check('D2 fresh original L21 rejects a toy shortcut after complete U21; neither old L nor provided U certifies lower',async()=>{
 const f=fixture(),dir=await fs.mkdtemp(`${out}/math-`),ledger=await createAttemptLedger(dir+'/public'),attempt=await ledger.claim(f.base.level),status='PRIVATE_ACCEPTED_PARENT_NO_REAL_QUOTIENT_CERTIFICATE';
 await ledger.finish(attempt,{accepted:true,status,levelSha256:f.base.levelSha256});const parent={...f.base,attempt,status},b=JSON.stringify(parent,null,2)+'\n',p=dir+'/parent.json';await fs.writeFile(p,b,{flag:'wx'});
 const a=await constructTaskStars(f.runtime,f.base,f.prior,f.slot,plannedStarInstances(f.base,2),createCapacityConstructionBudget({maxStates:10000}));assert(a.ok);
 const q=await qualifyBoundedCandidateV4(f.runtime,{...f.slot,sourceLevelId:f.base.sourceLevelId,level:a.level,drags:a.drags},{qualificationOnly:true,ledgerDirectory:dir+'/public',mechanismBaseReceipt:{path:p,sha256:sha(b)},lowerBudget:STAR_LOWER_BUDGET,routeBudget:STAR_LOWER_BUDGET});
 assert.equal(q.status,'UNKNOWN_LOWER',q.reasons?.join(';'));assert.equal(q.accepted,false);assert.equal(q.U,21);assert.equal(q.L,null);assert.equal(q.lowerBound.result.status,'relaxed-shortcut');assert(q.lowerBound.result.cost<21);assertOriginalFinalMath(q,a.level,a.drags,21,2);
 assert(await fs.stat(`${dir}/public/${q.attempt.identityOrigin}.blocked.json`));
 const fake=structuredClone(q);fake.accepted=true;fake.L=21;assert.throws(()=>assertOriginalFinalMath(fake,a.level,a.drags,21,2));
 await fs.writeFile(`${out}/private-original-lower-rejection.json`,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
});
after(async()=>{const fileBindings={...rt.toolchainBindings},compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))fileBindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));fileBindings[SELF.replace('.mjs','.test.mjs')]=sha(await fs.readFile(SELF.replace('.mjs','.test.mjs')));
 const after=await names();const report={status:evidence.length===5&&evidence.every(x=>x.passed)?'STAR_DONOR_BATCH_PRIVATE_PASS':'STAR_DONOR_BATCH_PRIVATE_FAIL',tests:5,evidence,fileBindings,
  proofToolchainSha256:rt.toolchainSha256,publicRequestCountBeforeAfter:[before.length,after.length],publicNewDuringTests:after.filter(x=>!before.includes(x)),
  newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,privateSyntheticFinalLowerCalls:1,productionPlanPrepared:false,formalReady:false};await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});});

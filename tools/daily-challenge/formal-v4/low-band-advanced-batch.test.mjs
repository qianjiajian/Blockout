import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,after} from 'node:test';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {qualifyLowBandBatchSlot,assertReadonlyExpected} from './qualify-low-band-batch-slot.mjs';
import {lowBandAdvancedStrategy,assertLowBandAdvancedBatchPlan,assertLowBandBatchPrivateNamespace,
 LOW_BAND_ADVANCED_BATCH_VERSION,LOW_BAND_ADVANCED_ANCHOR,LOW_BAND_ADVANCED_ANCHOR_REVIEW} from './low-band-advanced-batch-contract.mjs';
import {inspectAcceptedLowBandLinkage} from './accepted-low-band-batch-base.mjs';
import {d2KeyRouteFixture} from './d2-key-route-fixtures.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {HISTORY_LEDGER_ROOTS} from './native-batch-io.mjs';
import {EARLY_CONSTRUCTION_LEDGER} from './early-frozen-construction-contract.mjs';
const out=process.env.LOW_BAND_ADVANCED_BATCH_TEST_OUT??'deliverables/daily-formal-v4-20261008/proof/low-band-advanced-batch-private-01';
await fs.mkdir(out,{recursive:false});const runtime=await loadV4CatalogRuntime(),evidence=[],sha=b=>createHash('sha256').update(b).digest('hex');
const publicBefore=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
const read=async p=>JSON.parse(await fs.readFile(p));
const check=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});
function d1(){
 const colors=['red','blue','green','yellow','purple','orange'],level={id:999981,name:'private low-band batch D1',difficulty:'hard',reward:0,timeSeconds:120,parMoves:30,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[['red','top',0],['blue','left',0],['green','top',2],['yellow','right',1],['purple','left',1],['orange','bottom',2]].map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
 const drags=[{blockId:'b0',path:[],exitSide:'top'},{blockId:'b1',path:[[0,0]],exitSide:'left'},{blockId:'b2',path:[],exitSide:'top'},
  {blockId:'b5',path:[],exitSide:'bottom'},{blockId:'b4',path:[[1,0]]},{blockId:'b3',path:[[1,1],[2,1]],exitSide:'right'}];
 for(let i=0;i<15;i++)drags.push({blockId:'b4',path:[[1,i%2===0?1:0]]});drags.push({blockId:'b4',path:[[0,1]],exitSide:'left'});
 return{level,drags};
}
async function fixture(mechanism='key-lock',difficulty=1){
 let f=difficulty===1?d1():d2KeyRouteFixture().base;
 if(mechanism==='axis-block'&&difficulty===2){
  const colors=['red','blue','green','yellow','purple','orange','cyan','pink','red'];
  const level={...d1().level,id:999984,name:'private three active axes',height:3,
   blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
   gates:[['red','top',0],['blue','left',0],['green','top',2],['yellow','bottom',0],['purple','left',1],['orange','right',1],['cyan','left',2],['pink','bottom',1]]
    .map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
  const drags=[{blockId:'b0',path:[],exitSide:'top'},{blockId:'b1',path:[[0,0]],exitSide:'left'},{blockId:'b2',path:[],exitSide:'top'},
   {blockId:'b5',path:[],exitSide:'right'},{blockId:'b6',path:[],exitSide:'left'},{blockId:'b3',path:[[0,2]],exitSide:'bottom'},
   {blockId:'b4',path:[[0,1]],exitSide:'left'},{blockId:'b7',path:[],exitSide:'bottom'}];
  for(let i=0;i<21;i++)drags.push({blockId:'b8',path:[[i%2===0?1:2,2]]});
  drags.push({blockId:'b8',path:[[0,2],[0,1],[0,0]],exitSide:'top'});f={level,drags};
 }
 const dir=await fs.mkdtemp(path.join(out,'case-')),pub=path.join(dir,'public'),construction=path.join(dir,'construction');
 const slot=runtime.slots.find(s=>s.newestMechanism===mechanism&&s.difficulty===difficulty&&s.slot===(difficulty===2?4:10));
 const source={...structuredClone(f.level),blocks:[{id:'s0',color:'red',x:0,y:0,shape:Array.from({length:f.level.width},(_,x)=>[x,0])},
  {id:'s1',color:'blue',x:0,y:1,shape:Array.from({length:f.level.width},(_,x)=>[x,0])}],gates:[{id:'sg0',color:'red',side:'left',offset:0,size:1},{id:'sg1',color:'blue',side:'left',offset:1,size:1}]};
 const prior=structuredClone(source);if(mechanism==='key-lock'){prior.blocks[0].keyId='old';prior.blocks[1].lockedBy='old';prior.blocks[1].lockCount=1;}
 else if(mechanism==='axis-block')prior.blocks[0].movementAxis='horizontal';
 else if(mechanism==='generator')prior.generators=[{id:'old',spawn:[0,0],queueBlockIds:['s0','s1']}];
 const priorDescriptor=await put(path.join(dir,'prior.json'),{formalId:slot.formalId,level:prior,levelSha256:levelSha256(prior)});
 const rt={...runtime,LEVELS:[source],priorDailySlots:new Map([[slot.formalId,{formalId:slot.formalId,sourceReport:priorDescriptor.path,
  sourceReportSha256:priorDescriptor.sha256,levelSha256:levelSha256(prior),inventory:mechanismInventory(prior)}]])};
 const ledger=await createAttemptLedger(pub),attempt=await ledger.claim(f.level),status='SYNTHETIC_QUALIFICATION_ONLY_NOT_A_REAL_CERTIFICATE';
 await ledger.finish(attempt,{accepted:true,status,levelSha256:levelSha256(f.level)});
 const band=difficulty===1?{lower:16,upper:20}:{lower:21,upper:30},U=independentReplay(rt,f.level,f.drags).nonClearingDrags;
 const packet={...f,accepted:true,qualificationOnly:true,status,sourceLevelId:f.level.id,difficulty,targetDifficulty:difficulty,attempt,L:band.lower,U,
  levelSha256:levelSha256(f.level),routeSha256:routeSha256(f.drags),sourceLevelSha256:levelSha256(source)};
 const descriptor=await put(path.join(dir,'base.json'),packet),dummy={path:'qualificationOnly-unread-evidence',sha256:'1'.repeat(64)};
 const row={index:0,base:descriptor,independentActualAudit:dummy,sourceLevelId:packet.sourceLevelId,slot,baseLevelSha256:packet.levelSha256,baseRouteSha256:packet.routeSha256,
  retryIdentitySha256:attempt.retryIdentitySha256,baseL:band.lower,baseU:U,band,construction:{strategy:lowBandAdvancedStrategy(slot),maximumWholeWorlds:10000,
   ...(difficulty===2&&mechanism==='key-lock'?{configuration:d2KeyRouteFixture().configuration}:{})},
  finalProof:{maximumWholeWorlds:10000,providedCompleteRouteRequired:true,freshOriginalLowerRequired:true,floor:band.lower,upper:band.upper},
  priorBaseline:{...priorDescriptor,formalId:slot.formalId},visual:{review:dummy,decision:'ONE_FAMILY_REPRESENTATIVE',familyId:'private-toy',reason:'Synthetic isolated fixture only'}};
 const plan={schemaVersion:4,scope:300,version:LOW_BAND_ADVANCED_BATCH_VERSION,inputSelection:dummy,inputSelectionCount:150,selectionAnchor:LOW_BAND_ADVANCED_ANCHOR,
  selectionAnchorReview:LOW_BAND_ADVANCED_ANCHOR_REVIEW,visualReview:dummy,independentActualAudit:dummy,rows:[row],maximumBaseAdaptations:1,
  oneBaseOnePredeterminedSlot:true,failedBaseFallbackAllowed:false,bandChangeAfterFailureAllowed:false,selectionModified:false,formalReady:false};
 const batchPlan=await put(path.join(dir,'plan.json'),plan);
 return{dir,pub,construction,rt,slot,packet,descriptor,plan,row,batchPlan,options:{batchPlan,rowIndex:0,selected:[],qualificationOnly:true,
  publicLedgerDirectory:pub,constructionLedgerDirectory:construction,proofOptions:{lowerBudget:{maxStates:100,maxMilliseconds:3000}}}};
}
check('D1 key construction uses known U16 but must reject fresh original L16 shortcut',async()=>{
 const f=await fixture(),q=await qualifyLowBandBatchSlot(f.rt,f.descriptor,f.slot,f.options);await put(path.join(f.dir,'result.json'),q);
 assert(q.construction.ok&&q.mechanismStrengthValidated&&q.designValidated,JSON.stringify(q.reasons));assert.equal(q.actualConstructedU,16);
 assert(q.finalProofStarted&&!q.accepted&&q.terminalBlocked&&!q.catalogEligible);assert.equal(q.status,'REJECTED_FINAL_BOUNDED_PROOF');
 await assert.rejects(qualifyLowBandBatchSlot(f.rt,f.descriptor,f.slot,f.options),/Failed or pending base/);
});
check('D2 axis uses the same reviewed capacity adapter and actual U21, never borrowed plain L',async()=>{
 const f=await fixture('axis-block',2),q=await qualifyLowBandBatchSlot(f.rt,f.descriptor,f.slot,f.options);await put(path.join(f.dir,'result.json'),q);
 assert(q.construction.ok&&q.mechanismStrengthValidated&&q.designValidated,JSON.stringify(q));assert.equal(q.actualConstructedU,21);
 assert(q.finalProofStarted&&!q.accepted&&q.terminalBlocked&&!q.catalogEligible);
});
check('D2 key slot04 is general metadata with unchanged fixed six-key constructor',async()=>{
 const f=await fixture('key-lock',2),q=await qualifyLowBandBatchSlot(f.rt,f.descriptor,f.slot,f.options);await put(path.join(f.dir,'result.json'),q);
 assert(q.construction.ok&&q.mechanismStrengthValidated,JSON.stringify(q));assert.equal(q.actualConstructedU,21);assert(q.finalProofStarted&&!q.accepted);
 assert.equal(q.formalId,'daily-mechanisms-key-lock-59-d2-04');
});
check('construction cap one seals the physical base, no alternate stage or updated label retry',async()=>{
 const f=await fixture('generator',2),q=await qualifyLowBandBatchSlot(f.rt,f.descriptor,f.slot,{...f.options,worldBudget:{maxStates:1}});
 assert(q.constructionAttemptStarted&&q.terminalBlocked&&!q.finalProofStarted&&!q.accepted);assert(q.construction.constructionAccounting.fullWorldReservations<=1);
 const again=await qualifyLowBandBatchSlot(f.rt,f.descriptor,f.slot,f.options);assert(!again.constructionAttemptStarted&&again.terminalBlocked);
 await put(path.join(f.dir,'result.json'),q);
});
check('fixed plan forbids occupied/repeated bases, missing visual decisions, false bands and unsupported adapters',async()=>{
 const f=await fixture();assertLowBandAdvancedBatchPlan(f.plan,runtime.slots);
 for(const mutate of [p=>{p.rows.push({...structuredClone(p.rows[0]),index:1});p.maximumBaseAdaptations=2;},p=>{delete p.rows[0].visual;},
  p=>{p.rows[0].band.upper=30;},p=>{p.failedBaseFallbackAllowed=true;},p=>{p.rows[0].baseU=21;}]){
  const p=structuredClone(f.plan);mutate(p);assert.throws(()=>assertLowBandAdvancedBatchPlan(p,runtime.slots));}
 for(const m of ['flip-door','multilayer-shell','star','bomb'])assert.throws(()=>lowBandAdvancedStrategy({newestMechanism:m,difficulty:2}));
 await assert.rejects(qualifyLowBandBatchSlot(f.rt,f.descriptor,f.slot,{...f.options,selected:[{formalId:f.slot.formalId}]}),/already occupied/);
 assert.equal(await fs.stat(f.construction).then(()=>true).catch(()=>false),false);
});
check('readonly expected keys/locks and axes bind actual final fields, not a reported count',()=>{
 assert.throws(()=>assertReadonlyExpected({slot:{newestMechanism:'key-lock'},construction:{readonlyExpected:{keyBlockIds:['a'],locks:[{id:'b',count:3}]}}},{},
  {blocks:[{id:'a',keyId:'k'},{id:'b',lockedBy:'k',lockCount:2}]}),/Actual locks/);
 assert.throws(()=>assertReadonlyExpected({slot:{newestMechanism:'axis-block'},construction:{readonlyExpected:{selected:[{id:'a',axis:'horizontal'}],primaryInstances:1,addedSupport:[]}}},
  {primaryInstances:1,addedSupport:[]},{blocks:[{id:'a',movementAxis:'vertical'}]}),/Actual axes/);
});
check('intact historical D2 linkage remains valid; forged lower, public upper and omitted U accounting reject read-only',async()=>{
 const file='deliverables/daily-formal-v4-20261008/design/low-band-sixteen-math-01/candidate-009.json',base=await read(file),stem=path.join(PUBLIC_ATTEMPT_LEDGER,base.attempt.id),p={base,
  request:await read(stem+'.request.json'),result:await read(stem+'.result.json'),sidecar:await read(stem+'.v4-low-band-prefix-tail-result.json'),planRecord:await read(stem+'.v4-low-band-prefix-tail-plan.json')};
 assert.equal(inspectAcceptedLowBandLinkage(base,p).U,28);
 for(const mutate of [x=>{x.base.L=31;},x=>{x.result.upper={accepted:true};},x=>{x.base.upperAccounting.prior.completeWorldReservations=0;},x=>{x.planRecord.prefixDrags.pop();}]){
  const q=structuredClone(p);mutate(q);assert.throws(()=>inspectAcceptedLowBandLinkage(q.base,q));}
});
check('all seven public roots and source-workspace junction aliases reject before private writes',async()=>{
 const env=JSON.parse(await fs.readFile('snapshot-environment.json'));
 for(const root of [...HISTORY_LEDGER_ROOTS,EARLY_CONSTRUCTION_LEDGER,'deliverables/daily-formal-v4-20261008/design/early-prefix-construction-ledger'])
  for(const p of [root,path.join(root,'private-child'),path.resolve(env.sourceWorkspace??'C:/Users/Administrator/Documents/ChatGPT/Block Out!',root)])
   await assert.rejects(assertLowBandBatchPrivateNamespace(true,p),/private ledgers/);
});
after(async()=>{
 const after=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),added=after.filter(n=>!publicBefore.includes(n));
 const bindings={};for(const name of ['low-band-advanced-batch-contract.mjs','accepted-low-band-batch-base.mjs','low-band-advanced-batch-context.mjs',
  'low-band-batch-key-attempt-guard.mjs','qualify-low-band-batch-slot.mjs','low-band-advanced-batch.test.mjs']){
  const p=`tools/daily-challenge/formal-v4/${name}`;bindings[p]=sha(await fs.readFile(p));}
 await put(path.join(out,'report.json'),{status:evidence.length===8&&evidence.every(e=>e.passed)?'LOW_BAND_ADVANCED_BATCH_PRIVATE_PASS':'INCOMPLETE_OR_FAIL',evidence,fileBindings:bindings,
  privateFixturesOnly:true,newRealConstructions:0,newRealSearches:0,publicClaimsStarted:0,publicRequests:{before:publicBefore.length,after:after.length,concurrentAdditions:added},
  currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false});
});

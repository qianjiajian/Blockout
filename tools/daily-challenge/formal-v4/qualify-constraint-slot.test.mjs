import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {qualifyConstraintSlot} from './qualify-constraint-slot.mjs';
import {capacityMechanismBaseOption} from './qualify-capacity-slot.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {prepareCapacityDesignContext} from './capacity-design-context.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';

// These explicit control receipts do not claim real mathematical acceptance.
// Every invocation owns fresh private ledgers and qualificationOnly=true.
const runtime=await loadV4CatalogRuntime(),evidence=[];
const out=process.env.CONSTRAINT_SLOT_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/constraint-slot-qualification-');
await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const axis=runtime.slots.find(s=>s.newestMechanism==='key-lock'&&s.difficulty===1&&s.slot===10);
async function put(file,object){const bytes=JSON.stringify(object,null,2)+'\n';await fs.writeFile(file,bytes,{flag:'wx'});return{path:file,sha256:sha(bytes)};}
async function fixture({longRoute=true}={}){
 const dir=await fs.mkdtemp(`${out}/case-`),publicDir=`${dir}/public`,constructionDir=`${dir}/construction`;
 const colors=['red','blue','green','yellow','purple','orange'];
 const level={id:999981,name:'synthetic axis integration',difficulty:'hard',reward:0,timeSeconds:120,parMoves:30,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[['red','top',0],['blue','left',0],['green','top',2],['yellow','right',1],['purple','left',1],['orange','bottom',2]]
   .map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
 const drags=[{blockId:'b0',path:[],exitSide:'top'},{blockId:'b1',path:[[0,0]],exitSide:'left'},
  {blockId:'b2',path:[],exitSide:'top'},{blockId:'b5',path:[],exitSide:'bottom'},
  {blockId:'b4',path:[[1,0]]},{blockId:'b3',path:[[1,1],[2,1]],exitSide:'right'}];
 if(longRoute)for(let i=0;i<15;i++)drags.push({blockId:'b4',path:[[1,i%2===0?1:0]]});
 else drags.push({blockId:'b4',path:[[1,1]]});
 drags.push({blockId:'b4',path:[[0,1]],exitSide:'left'});
 const source={...structuredClone(level),blocks:[
  {id:'source0',color:'red',x:0,y:0,shape:[[0,0],[1,0],[2,0]]},
  {id:'source1',color:'blue',x:0,y:1,shape:[[0,0],[1,0],[2,0]]}],
  gates:[{id:'sourceg0',color:'red',side:'left',offset:0,size:1},{id:'sourceg1',color:'blue',side:'left',offset:1,size:1}]};
 const old=structuredClone(source);old.blocks[0].keyId='old';old.blocks[1].lockedBy='old';old.blocks[1].lockCount=1;
 const prior=await put(`${dir}/prior.json`,{formalId:axis.formalId,level:old,levelSha256:levelSha256(old)});
 const priorDailySlots=new Map([[axis.formalId,{formalId:axis.formalId,sourceReport:prior.path,sourceReportSha256:prior.sha256,
  levelSha256:levelSha256(old),inventory:mechanismInventory(old)}]]);
 const rt={...runtime,LEVELS:[source],priorDailySlots};
 const replay=rt.replayRevisedRoute(level,drags),independent=independentReplay(rt,level,drags);
 assert(replay.valid&&replay.complete&&independent.valid&&independent.complete,'Synthetic actual route qualification');
 const ledger=await createAttemptLedger(publicDir),attempt=await ledger.claim(level),status='SYNTHETIC_QUALIFICATION_CONTROL_ONLY';
 await ledger.finish(attempt,{accepted:true,status,levelSha256:levelSha256(level)});
 const packet={accepted:true,status,qualificationOnly:true,sourceLevelId:level.id,difficulty:1,level,drags,attempt,
  levelSha256:levelSha256(level),sourceLevelSha256:levelSha256(source)};
 const descriptor=await put(`${dir}/base.json`,packet);
 return{rt,dir,publicDir,constructionDir,packet,descriptor,prior,replay,independent,
  options:{selected:[],qualificationOnly:true,publicLedgerDirectory:publicDir,constructionLedgerDirectory:constructionDir}};
}

test('actual known U16 and two staggered actual locks do not substitute for fresh L16',async()=>{
 const f=await fixture(),before=await fs.readFile(f.descriptor.path);
 assert.equal(f.independent.nonClearingDrags,16);
 const result=await qualifyConstraintSlot(f.rt,f.descriptor,axis,{...f.options,
  proofOptions:{lowerBudget:{maxStates:100,maxMilliseconds:3000}}});
 assert.equal(result.construction.ok,true,JSON.stringify(result.construction));
 assert.equal(result.mechanismStrengthValidated,true,JSON.stringify(result.reasons));
 assert.equal(result.designValidated,true,JSON.stringify(result.reasons));
 assert.equal(result.actualConstructedU,16);assert.equal(result.finalProofStarted,true);
 assert.equal(result.accepted,false);assert.equal(result.status,'REJECTED_FINAL_BOUNDED_PROOF');
 assert.equal(result.mathematicalProof.accepted,false);assert.equal(result.terminalBlocked,true);assert.equal(result.catalogEligible,false);
 assert.equal(result.mathematicalProof.qualificationOnly,true);assert.equal(result.finalProofPlan.mechanismBaseReceipt.path,f.descriptor.path);
 assert.deepEqual(await fs.readFile(f.descriptor.path),before);assert.equal(result.formalReady,false);
 assert.equal(levelSha256(JSON.parse(await fs.readFile(result.entryResultFile))),levelSha256(result));
 await assert.rejects(()=>qualifyConstraintSlot(f.rt,f.descriptor,axis,f.options),/Failed or pending base/);
 evidence.push({test:'real-private-construction-and-bounded-counterexample',passed:true,result,repeatRejectedBeforeConstruction:true});
});

test('complete route below band ends after construction without any final bounded search',async()=>{
 const f=await fixture({longRoute:false}),result=await qualifyConstraintSlot(f.rt,f.descriptor,axis,{...f.options});
 assert.equal(result.construction.ok,true,JSON.stringify(result.construction));assert.equal(result.actualConstructedU,2);
 assert.equal(result.status,'REJECTED_CONSTRUCTED_U_OUTSIDE_BAND');assert.equal(result.finalProofStarted,false);
 assert(result.terminalBlocked&&!result.catalogEligible&&!result.formalReady);
 const requests=(await fs.readdir(f.publicDir)).filter(x=>x.endsWith('.request.json'));assert.equal(requests.length,1);
 evidence.push({test:'known-upper-does-not-start-wrong-band-proof',passed:true,result});
});

test('source, old450 and selected geometry are rejected before construction',async()=>{
 const f=await fixture(),selected=[{...axis,formalId:'different-occupied-slot',level:f.packet.level}];
 await assert.rejects(()=>qualifyConstraintSlot(f.rt,f.descriptor,axis,{...f.options,selected}),/selected-near/);
 const closeSource={...f.rt,LEVELS:[structuredClone(f.packet.level)]};
 const design=await prepareCapacityDesignContext(closeSource,f.descriptor,f.packet,axis,[],null,{qualificationOnly:true});
 assert(design.inspect(f.packet.level).issues.includes('source-footprint-over-.55'));
 const old=await put(`${f.dir}/near-prior.json`,{level:f.packet.level});
 const closeOld={...f.rt,priorDailySlots:new Map([[axis.formalId,{sourceReport:old.path,sourceReportSha256:old.sha256,levelSha256:f.packet.levelSha256}]])};
 const priorDesign=await prepareCapacityDesignContext(closeOld,f.descriptor,f.packet,axis,[],null,{qualificationOnly:true});
 assert(priorDesign.inspect(f.packet.level).issues.includes('old450-footprint-over-.75'));
 assert.equal(await fs.stat(f.constructionDir).then(()=>true).catch(()=>false),false);
 evidence.push({test:'pre-construction-geometry-gates',passed:true});
});

test('same-stock metadata alone cannot request a new mathematical attempt',async()=>{
 const f=await fixture(),metadata={...f.packet.level,name:'new slot label',id:456};
 assert.throws(()=>capacityMechanismBaseOption(f.packet,metadata,f.descriptor),/actual mechanism/);
 const mechanics=structuredClone(f.packet.level);mechanics.blocks[1].movementAxis='horizontal';
 assert.deepEqual(capacityMechanismBaseOption(f.packet,mechanics,f.descriptor),f.descriptor);
 const inventory=structuredClone(mechanics);inventory.blocks[1].color='orange';
 assert.equal(capacityMechanismBaseOption(f.packet,inventory,f.descriptor),null);
 evidence.push({test:'narrow-stock-and-mechanism-identity',passed:true});
});

test('exploratory joint packet proof must match both stored public results before construction',async()=>{
 for(const side of ['lower','upper']){
  const f=await fixture(),proof={status:'threshold-proven',drags:f.packet.drags,qualificationMarker:'synthetic-not-a-certificate'};
  const packet={...f.packet,status:'EXPLORATORY_SYNTHETIC_CONTROL',proof};
  const resultFile=`${f.publicDir}/${packet.attempt.id}.result.json`,result=JSON.parse(await fs.readFile(resultFile));
  Object.assign(result,{status:packet.status,lower:structuredClone(proof),upper:structuredClone(proof)});result[side].qualificationMarker='tampered';
  await fs.writeFile(resultFile,JSON.stringify(result));const descriptor=await put(`${f.dir}/joint-base.json`,packet);
  await assert.rejects(()=>qualifyConstraintSlot(f.rt,descriptor,axis,f.options),/exploratory/);
  assert.equal(await fs.stat(f.constructionDir).then(()=>true).catch(()=>false),false);
 }
 evidence.push({test:'exploratory-joint-public-proof-binding',passed:true});
});

test.after(async()=>{
 const files=['qualify-constraint-slot.mjs','qualify-constraint-slot.test.mjs','constraint-design-context.mjs','constraint-attempt-guard.mjs','route-constraint-construction.mjs'];
 const bindings=Object.fromEntries(await Promise.all(files.map(async n=>{const p=`tools/daily-challenge/formal-v4/${n}`;return[p,sha(await fs.readFile(p))];})));
 await put(`${out}/report.json`,{status:evidence.length===5?'PASS':'INCOMPLETE',tests:evidence,bindings,
  executionEnvironment:prefixExecutionEnvironment(runtime),currentRuntimeValidationClaimed:false,qualificationOnly:true,syntheticSearchesOnly:true,realCandidateConstructionInvocations:0,realCandidateProofInvocations:0,formalReady:false,productionChanged:false});
});

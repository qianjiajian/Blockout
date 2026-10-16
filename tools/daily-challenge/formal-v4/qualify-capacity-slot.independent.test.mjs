import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {qualifyCapacitySlot,capacityMechanismBaseOption} from './qualify-capacity-slot.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';

// Synthetic private accounting fixtures only. No actual candidate is claimed,
// constructed, or searched, and accepted fixture flags are not L certificates.
const runtime=await loadV4CatalogRuntime(),evidence=[];
const out=process.env.CAPACITY_INDEPENDENT_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/capacity-slot-independent-');
await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const status='SYNTHETIC_CONTROL_FIXTURE_NOT_MATHEMATICS';
const axis=runtime.slots.find(s=>s.newestMechanism==='axis-block'&&s.difficulty===1&&s.slot===1);
const grid=runtime.slots.find(s=>s.newestMechanism==='colored-grid'&&s.difficulty===1&&s.slot===1);
async function put(file,value){const b=JSON.stringify(value,null,2)+'\n';await fs.writeFile(file,b);return{path:file,sha256:hash(b)};}
async function fixture(){
 const dir=await fs.mkdtemp(`${out}/case-`),publicDir=`${dir}/public`,constructionDir=`${dir}/construction`;
 const colors=['red','blue','green','yellow','purple','pink'];
 const level={id:999980,name:'isolated capacity qualifier control',difficulty:'hard',reward:0,timeSeconds:120,parMoves:30,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:colors.map((color,i)=>({id:`g${i}`,color,side:i<3?'top':'bottom',offset:i%3,size:1}))};
 const drags=level.blocks.map((b,i)=>({blockId:b.id,path:[],exitSide:i<3?'top':'bottom'}));
 const source={...structuredClone(level),blocks:[
  {id:'source-top',color:'red',x:0,y:0,shape:[[0,0],[1,0],[2,0]]},
  {id:'source-bottom',color:'blue',x:0,y:1,shape:[[0,0],[1,0],[2,0]]}],
  gates:[{id:'source-red',color:'red',side:'left',offset:0,size:1},{id:'source-blue',color:'blue',side:'left',offset:1,size:1}]};
 const ledger=await createAttemptLedger(publicDir),attempt=await ledger.claim(level);
 const lower={qualificationMarker:'bound-lower-not-a-certificate'},upper={qualificationMarker:'bound-upper-not-a-certificate'};
 await ledger.finish(attempt,{accepted:true,status,levelSha256:levelSha256(level),lowerBound:{result:lower},route:{search:upper}});
 const packet={accepted:true,status,qualificationOnly:true,sourceLevelId:level.id,difficulty:1,level,drags,attempt,
  levelSha256:levelSha256(level),routeSha256:routeSha256(drags),sourceLevelSha256:levelSha256(source),
  lowerBound:{result:lower},route:{search:upper}};
 const descriptor=await put(`${dir}/base.json`,packet);
 const prior=await put(`${dir}/prior.json`,{formalId:axis.formalId,level:source,levelSha256:levelSha256(source)});
 const priorGrid=await put(`${dir}/prior-grid.json`,{formalId:grid.formalId,level:source,levelSha256:levelSha256(source)});
 const priorDailySlots=new Map(runtime.priorDailySlots);
 for(const [slot,old]of [[axis,prior],[grid,priorGrid]])priorDailySlots.set(slot.formalId,{sourceReport:old.path,sourceReportSha256:old.sha256,
  levelSha256:levelSha256(source),inventory:mechanismInventory(source)});
 return{dir,publicDir,constructionDir,packet,descriptor,prior,rt:{...runtime,LEVELS:[source],priorDailySlots},
  options:{qualificationOnly:true,selected:[],publicLedgerDirectory:publicDir,constructionLedgerDirectory:constructionDir}};
}
async function noConstruction(f){assert.equal(await fs.stat(f.constructionDir).then(()=>true).catch(()=>false),false);}

test('independent: complete base ledger provenance faults reject before construction',async()=>{
 const cases=[];
 for(const kind of ['request-colour','result-lower','result-upper','result-status','receipt-sha','prior-inventory']){
  const f=await fixture();let descriptor=f.descriptor;
  if(kind==='receipt-sha')descriptor={...descriptor,sha256:'0'.repeat(64)};
  else if(kind==='prior-inventory')f.rt.priorDailySlots.get(axis.formalId).inventory['axis-block'].push({id:'phantom',axis:'horizontal'});
  else{
   const file=`${f.publicDir}/${f.packet.attempt.id}.${kind.startsWith('request')?'request':'result'}.json`,r=JSON.parse(await fs.readFile(file));
   if(kind==='request-colour')r.colorAssignments[0].colors=['purple'];
   if(kind==='result-lower')r.lower.qualificationMarker='tampered';
   if(kind==='result-upper')r.upper.qualificationMarker='tampered';
   if(kind==='result-status')r.status='FORGED';
   await put(file,r);
  }
  await assert.rejects(()=>qualifyCapacitySlot(f.rt,descriptor,axis,f.options));await noConstruction(f);cases.push(kind);
 }
 evidence.push({test:'pre-construction-provenance-faults',cases,passed:true});
});

test('independent: fake slot, private production namespace and proof option overrides reject without construction',async()=>{
 const f=await fixture();
 await assert.rejects(()=>qualifyCapacitySlot(f.rt,f.descriptor,{...axis,newestMechanism:'colored-grid'},f.options),/slot metadata/);
 await assert.rejects(()=>qualifyCapacitySlot(f.rt,f.descriptor,axis,{...f.options,qualificationOnly:false}),/ledger must be shared/);
 for(const option of [{allowRevalidation:true},{qualificationOnly:false},{mechanismBaseReceipt:f.descriptor},{routeStrategy:'native'}])
  await assert.rejects(()=>qualifyCapacitySlot(f.rt,f.descriptor,axis,{...f.options,proofOptions:option}),/Only bounded budget/);
 await noConstruction(f);evidence.push({test:'entry-ownership-and-namespace',passed:true});
});

test('independent: one tiny actual construction exhaustion seals base across stage changes and preserves accepted math bytes',async()=>{
 const f=await fixture(),resultFile=`${f.publicDir}/${f.packet.attempt.id}.result.json`,before=await fs.readFile(resultFile);
 const first=await qualifyCapacitySlot(f.rt,f.descriptor,axis,{...f.options,worldBudget:{maxStates:1}});
 assert.equal(first.accepted,false);assert.equal(first.catalogEligible,false);assert.equal(first.finalProofStarted,false);
 assert.equal(first.constructionAttemptStarted,true);assert.equal(first.terminalBlocked,true);
 assert.equal(first.construction.constructionAccounting.fullWorldReservations,1);
 assert.equal(first.construction.constructionAccounting.maxStates,1);
 const second=await qualifyCapacitySlot(f.rt,f.descriptor,grid,{...f.options,worldBudget:{maxStates:1}});
 assert.equal(second.accepted,false);assert.equal(second.constructionAttemptStarted,false);assert.equal(second.finalProofStarted,false);
 assert.equal(second.terminalBlocked,true);assert.equal(second.construction.status,'CAPACITY_INPUT_ALREADY_ATTEMPTED');
 assert.deepEqual(await fs.readFile(resultFile),before);
 const requests=(await fs.readdir(f.constructionDir)).filter(p=>p.endsWith('.request.json'));assert.equal(requests.length,1);
 const sidecar=JSON.parse(await fs.readFile(first.constructionSidecar.path));assert.equal(sidecar.accepted,false);
 assert.equal(hash(await fs.readFile(first.constructionSidecar.path)),first.constructionSidecar.sha256);
 assert.equal(hash(await fs.readFile(first.constructionPlan.path)),first.constructionPlan.sha256);
 evidence.push({test:'actual-tiny-construction-cross-stage-terminal',passed:true,first,second});
});

test('independent: same stock metadata and mechanism ID renaming do not open the narrow mathematical claim',async()=>{
 const f=await fixture();
 assert.throws(()=>capacityMechanismBaseOption(f.packet,{...f.packet.level,name:'different'},f.descriptor),/actual mechanism/);
 const next=structuredClone(f.packet.level);next.blocks[0].movementAxis='vertical';
 assert.deepEqual(capacityMechanismBaseOption(f.packet,next,f.descriptor),f.descriptor);
 const renamed=structuredClone(next);renamed.blocks[0].id='renamed-axis-body';
 assert.throws(()=>capacityMechanismBaseOption({level:next},renamed,f.descriptor),/actual mechanism/);
 evidence.push({test:'narrow-semantic-adaptation-only',passed:true});
});

test.after(async()=>{
 const names=['qualify-capacity-slot.mjs','qualify-capacity-slot.independent.test.mjs','capacity-construction-ledger.mjs','accepted-base-adaptation.mjs','bounded-qualify.mjs'];
 const bindings=Object.fromEntries(await Promise.all(names.map(async n=>{const p=`tools/daily-challenge/formal-v4/${n}`;return[p,hash(await fs.readFile(p))];})));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===4?'INDEPENDENT_CAPACITY_ENTRY_TESTS_COMPLETE':'INDEPENDENT_CAPACITY_ENTRY_TESTS_INCOMPLETE',
  bindings,evidence,realCandidateConstructionInvocations:0,realCandidateProofInvocations:0,privateSyntheticControlOnly:true,
  doesNotCertifyUnreviewedSelectionAdmission:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});

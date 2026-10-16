import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {prepareAcceptedMechanismClaim,validateFailedMechanismParent,adaptedMechanismIdentity} from './accepted-base-adaptation.mjs';
import {qualifyBoundedCandidateV4} from './bounded-qualify.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const runtime=await loadV4Runtime(),evidence=[];
const out=process.env.ADAPTATION_QUALIFICATION_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/accepted-base-');await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(){const level={id:999938,name:'isolated accepted-identity qualification',difficulty:'hard',reward:0,timeSeconds:120,parMoves:4,
 mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
 blocks:[['a','red',0,0],['b','blue',1,0],['c','green',0,1],['d','yellow',1,1]].map(([id,color,x,y])=>({id,color,x,y,shape:[[0,0]]})),
 gates:[{id:'red',color:'red',side:'left',offset:0,size:1},{id:'blue',color:'blue',side:'top',offset:1,size:1},{id:'green',color:'green',side:'bottom',offset:0,size:1},{id:'yellow',color:'yellow',side:'right',offset:1,size:1}]};
 const drags=['left','top','bottom','right'].map((exitSide,i)=>({blockId:['a','b','c','d'][i],path:[],exitSide}));return{level,drags};}
async function acceptedFixture(){
 const dir=await fs.mkdtemp(`${out}/case-`),{level,drags}=fixture(),ledger=await createAttemptLedger(dir),attempt=await ledger.claim(level);
 await ledger.finish(attempt,{accepted:true,status:'SYNTHETIC_LEDGER_CONTROL_FIXTURE_NOT_A_MATH_CERTIFICATE',levelSha256:levelSha256(level)});
 const packet={accepted:true,status:'SYNTHETIC_LEDGER_CONTROL_FIXTURE_NOT_A_MATH_CERTIFICATE',qualificationOnly:true,attempt,level,levelSha256:levelSha256(level),drags,routeSha256:routeSha256(drags)},file=`${dir}/base.json`;
 const bytes=JSON.stringify(packet,null,2)+'\n';await fs.writeFile(file,bytes,{flag:'wx'});return{dir,ledger,packet,descriptor:{path:file,sha256:hash(bytes)}};
}
test('a bound accepted base may claim one genuinely new mechanism object, but not names, IDs or the exact object',async()=>{
 const {dir,packet,descriptor}=await acceptedFixture();
 await assert.rejects(()=>prepareAcceptedMechanismClaim(packet.level,descriptor,{ledgerDirectory:dir}),/zero-search/);
 await assert.rejects(()=>prepareAcceptedMechanismClaim({...packet.level,name:'new'},descriptor,{ledgerDirectory:dir}),/real mechanism/);
 const ids=structuredClone(packet.level);ids.blocks[0].id='renamed';ids.gates[0].id='renamed-gate';
 await assert.rejects(()=>prepareAcceptedMechanismClaim(ids,descriptor,{ledgerDirectory:dir}),/real mechanism/);
 const next=structuredClone(packet.level);next.blocks[3].frozen=1;
 const allowed=await prepareAcceptedMechanismClaim(next,descriptor,{ledgerDirectory:dir});assert(allowed.allowAcceptedIdentityClaim);
 const renamed=structuredClone(next);renamed.name='another slot';renamed.blocks[3].id='other';
 assert.equal(adaptedMechanismIdentity(next),adaptedMechanismIdentity(renamed));
 await assert.rejects(()=>prepareAcceptedMechanismClaim(renamed,descriptor,{ledgerDirectory:dir}),/ALREADY_ATTEMPTED/);
 evidence.push({test:'bound-one-distinct-mechanism',passed:true,allowed});
});
test('missing receipt binding, changed bytes, unaccepted public result and shape change reject this narrow path',async()=>{
 const {dir,packet,descriptor}=await acceptedFixture(),next=structuredClone(packet.level);next.blocks[0].movementAxis='horizontal';
 await assert.rejects(()=>prepareAcceptedMechanismClaim(next,{path:descriptor.path},{ledgerDirectory:dir}),/path and SHA/);
 await assert.rejects(()=>prepareAcceptedMechanismClaim(next,{...descriptor,sha256:'0'.repeat(64)},{ledgerDirectory:dir}),/bytes changed/);
 const reshaped=structuredClone(next);reshaped.blocks[0].shape=[[0,0],[1,0]];
 await assert.rejects(()=>prepareAcceptedMechanismClaim(reshaped,descriptor,{ledgerDirectory:dir}),/ordinary first-attempt/);
 const alternate=await fs.mkdtemp(`${out}/failed-`),ledger=await createAttemptLedger(alternate),failed=await ledger.claim(packet.level);
 await ledger.finish(failed,{accepted:false,status:'SYNTHETIC_FAILURE',levelSha256:packet.levelSha256});
 await assert.rejects(()=>prepareAcceptedMechanismClaim(next,descriptor,{ledgerDirectory:alternate}),/accepted public/);
 evidence.push({test:'base-binding-negatives',passed:true});
});
test('full actual candidate path uses the narrow claim then seals a failing result without altering original accepted bytes',async()=>{
 const {dir,packet,descriptor}=await acceptedFixture(),next=structuredClone(packet.level);next.blocks[0].movementAxis='horizontal';
 const originalResult=`${dir}/${packet.attempt.id}.result.json`,before=await fs.readFile(originalResult);
 const result=await qualifyBoundedCandidateV4({...runtime,LEVELS:[packet.level]},
  {formalId:'daily-basic-combined-d1-01',stageKey:'basic-combined',newestMechanism:null,slot:1,difficulty:1,sourceLevelId:next.id,level:next,drags:packet.drags},
  {ledgerDirectory:dir,qualificationOnly:true,mechanismBaseReceipt:descriptor});
 // Axis is not permitted in basic: no claim is allowed until the new stage's
 // independent static check succeeds.
 assert.equal(result.status,'BLOCKED_STATIC');assert.equal(result.attempt,undefined);
 const input={formalId:'daily-mechanisms-axis-block-50-d1-01',stageKey:'mechanisms-axis-block-50',newestMechanism:'axis-block',slot:1,difficulty:1,sourceLevelId:next.id,level:next,drags:packet.drags};
 const actual=await qualifyBoundedCandidateV4({...runtime,LEVELS:[packet.level]},input,{ledgerDirectory:dir,qualificationOnly:true,mechanismBaseReceipt:descriptor});
 assert.equal(actual.status,'COUNTEREXAMPLE_BELOW_BAND',JSON.stringify(actual.reasons));assert.equal(actual.U,0);assert(actual.attempt.revalidates);
 assert(actual.route.independentReplay.complete);assert.equal(actual.lowerBound,undefined);assert.deepEqual(await fs.readFile(originalResult),before);
 const nextMechanism=structuredClone(next);nextMechanism.blocks[3].frozen=1;
 await assert.rejects(()=>prepareAcceptedMechanismClaim(nextMechanism,descriptor,{ledgerDirectory:dir}),/Failed or pending/);
 evidence.push({test:'actual-path-and-terminal-failure',passed:true,result:actual});
});
test('failed UUID mechanism parents bind the real failed request and require shape AND colour redesign',async()=>{
 const {dir,ledger,packet,descriptor}=await acceptedFixture(),next=structuredClone(packet.level);next.blocks[0].movementAxis='horizontal';
 await prepareAcceptedMechanismClaim(next,descriptor,{ledgerDirectory:dir});const failed=await ledger.claim(next,{allowRevalidation:true});
 await ledger.finish(failed,{accepted:false,status:'SYNTHETIC_NEW_MECHANISM_FAILURE',levelSha256:levelSha256(next)});
 const changed=structuredClone(next);changed.blocks[0].shape=[[0,0],[1,0]];
 await assert.rejects(()=>validateFailedMechanismParent(changed,failed.id,{ledgerDirectory:dir}),/BOTH/);
 changed.blocks[0].color='purple';const binding=await validateFailedMechanismParent(changed,failed.id,{ledgerDirectory:dir});assert(binding.actualShapeChanged&&binding.actualColoursChanged);
 evidence.push({test:'uuid-failed-parent-shape-colour-chain',passed:true,binding});
});
test('complete public request, result status, lower and upper bytes must match the pinned accepted source',async()=>{
 const cases=[];
 for(const kind of ['shape','colour','retry','status','lower','upper']){
  const {dir,packet,descriptor}=await acceptedFixture(),next=structuredClone(packet.level);next.blocks[0].movementAxis='horizontal';
  const isRequest=['shape','colour','retry'].includes(kind),file=`${dir}/${packet.attempt.id}.${isRequest?'request':'result'}.json`;
  const record=JSON.parse(await fs.readFile(file));let binding=descriptor;
  if(kind==='shape')record.shapeSha256='0'.repeat(64);
  if(kind==='colour')record.colorAssignments[0].colors=['purple'];
  if(kind==='retry')record.retryIdentitySha256='0'.repeat(64);
  if(kind==='status')record.status='TAMPERED_QUALIFICATION_STATUS';
  if(kind==='lower'||kind==='upper'){
   // Deliberately nonmathematical fixture markers only; they exercise byte
   // integrity without manufacturing a production lower certificate.
   if(kind==='lower')packet.lowerBound={result:{qualificationMarker:'original'}};
   else packet.route={search:{qualificationMarker:'original'}};
   const bytes=JSON.stringify(packet,null,2)+'\n';await fs.writeFile(descriptor.path,bytes);binding={path:descriptor.path,sha256:hash(bytes)};
   record[kind]={qualificationMarker:'tampered'};
  }
  await fs.writeFile(file,JSON.stringify(record,null,2)+'\n');
  await assert.rejects(()=>prepareAcceptedMechanismClaim(next,binding,{ledgerDirectory:dir}),/provenance changed|status changed|evidence changed/);
  cases.push(kind);
 }
 evidence.push({test:'public-provenance-fault-injection',passed:true,cases});
});
test.after(async()=>{
 const files=['accepted-base-adaptation.mjs','accepted-base-adaptation.test.mjs','bounded-qualify.mjs'].map(f=>`tools/daily-challenge/formal-v4/${f}`);
 const bindings=Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await fs.readFile(f))])));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===5&&evidence.every(e=>e.passed)?'NARROW_ACCEPTED_BASE_ADAPTATION_QUALIFIED':'INCOMPLETE_QUALIFICATION',
  bindings,evidence,realCandidateSearchInvocations:0,syntheticLedgerFixturesNotMathematicalCertificates:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designStaggeredKeyLocks,assertKeyDesignInputUnblocked,qualifyStaggeredKeyDesign} from './design-staggered-key-locks.mjs';
const runtime=await loadBoundedRuntime(),evidence=[],completedChecks=[];
const out=process.env.KEY_STAGGER_QUALIFICATION_OUT??await fs.mkdtemp('deliverables/daily-formal-v3-20261008/proof/key-stagger-test-');
if(process.env.KEY_STAGGER_QUALIFICATION_OUT)await fs.mkdir(out,{recursive:false});
function fixture(){
 const colors=['red','blue','green','yellow'],level={id:998021,name:'Four-key independent planned-threshold fixture',width:4,height:3,timeSeconds:180,reward:0,difficulty:'super',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:Array.from({length:12},(_,i)=>({id:`k${i}`,x:i%4,y:Math.floor(i/4),shape:[[0,0]],color:colors[(i%4+Math.floor(i/4))%4]})),
 gates:colors.map((color,i)=>({id:color,color,side:'top',offset:i,size:1}))};
 const drags=level.blocks.map(b=>{const target=colors.indexOf(b.color),path=[];let x=b.x,y=b.y;
  while(y){y--;path.push([x,y]);}while(x!==target){x+=x<target?1:-1;path.push([x,0]);}
  return{blockId:b.id,path,exitSide:'top'};});
 return{level,drags};
}
test('four locks keep minimum four, release on real events six and seven, and clear all twelve bodies',async()=>{
 const {level,drags}=fixture(),before=JSON.stringify({level,drags}),prior=structuredClone(level);prior.blocks[11].lockedBy='old';prior.blocks[11].lockCount=1;prior.blocks[0].keyId='old';
 const result=await designStaggeredKeyLocks(runtime,level,drags,{ledgerDirectory:`${out}/fresh`,priorLevel:prior});
 assert(result.ok);assert.deepEqual(result.plannedLocks.map(b=>b.count),[6,7,7,7]);
 assert.equal(result.participation.instanceCount,4);assert.equal(result.participation.distinctReleaseEvents,2);
 assert(result.participation.details.every(x=>x.active&&x.evidence.unlockDrag<x.evidence.firstAction));
 assert.equal(result.canonicalReplay.clearEvents,12);assert.equal(result.independentReplay.clearEvents,12);
 assert.equal(result.U,0);assert.equal(result.L,null);assert.equal(result.accepted,false);assert.equal(result.priorComparison.instanceIncrease,3);
 assert.equal(JSON.stringify({level,drags}),before);assert.equal(result.searchAccounting.fullBoardSearchInvocations,0);evidence.push(result);completedChecks.push('actual-distinct-key-events');
});
test('blocked identity is rejected even after metadata and block-id disguises',async()=>{
 const {level}=fixture(),f=designFingerprints(level),identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
 const dir=`${out}/blocked`;await fs.mkdir(`${dir}/identities`,{recursive:true});await fs.writeFile(`${dir}/identities/${identity}.blocked.json`,JSON.stringify({reason:'qualification-fixture-only'}));
 const changed=structuredClone(level);changed.name='new metadata';changed.id++;for(const b of changed.blocks)b.id='alias-'+b.id;
 await assert.rejects(()=>assertKeyDesignInputUnblocked(changed,dir),/FAILED_PHYSICAL_INPUT/);
 completedChecks.push('metadata-and-body-id-disguise-rejected');
});
test('a failed historical result or unfinished request cannot bypass the guard without a blocked alias',async()=>{
 const {level}=fixture(),f=designFingerprints(level),dir=`${out}/result-only`;await fs.mkdir(dir);
 await fs.writeFile(`${dir}/${f.designSha256}.result.json`,JSON.stringify({accepted:false}));
 await assert.rejects(()=>assertKeyDesignInputUnblocked(level,dir),/FAILED_PHYSICAL_INPUT/);
 const pending=`${out}/pending`;await fs.mkdir(pending);await fs.writeFile(`${pending}/${f.designSha256}.request.json`,JSON.stringify({id:f.designSha256}));
 await assert.rejects(()=>assertKeyDesignInputUnblocked(level,pending),/PENDING_PHYSICAL_INPUT/);
 completedChecks.push('failed-and-pending-inputs-rejected');
});
test('broken witnesses, unsupported ice and non-increased prior counts fail',async()=>{
 const {level,drags}=fixture();await assert.rejects(()=>designStaggeredKeyLocks(runtime,level,drags.slice(0,-1),{ledgerDirectory:`${out}/fresh`}),/Complete original witness/);
 const ice=structuredClone(level);ice.blocks[0].frozen=1;await assert.rejects(()=>designStaggeredKeyLocks(runtime,ice,drags,{ledgerDirectory:`${out}/fresh`}));
 const prior=structuredClone(level);prior.blocks[11].lockedBy='old';prior.blocks[11].lockCount=7;
 await assert.rejects(()=>designStaggeredKeyLocks(runtime,level,drags,{ledgerDirectory:`${out}/fresh`,priorLevel:prior}),/counter must exceed/);
 completedChecks.push('route-domain-and-prior-value-rejected');
});
test('qualification bridge refuses unbound source, altered design, and failed base before any solver call',async()=>{
 const {level,drags}=fixture(),design=await designStaggeredKeyLocks(runtime,level,drags,{ledgerDirectory:`${out}/fresh`});
 const slot={newestMechanism:'key-lock',stageKey:design.stageKey,difficulty:3},prior=structuredClone(level);
 await assert.rejects(()=>qualifyStaggeredKeyDesign(runtime,design,slot,{priorLevel:prior}),/Accepted original base file required/);
 await assert.rejects(()=>qualifyStaggeredKeyDesign(runtime,{...design,accepted:true},slot,{priorLevel:prior}),/Pending mechanism-only design required/);
 const changed=structuredClone(design);changed.level.blocks[7].lockCount=99;
 await assert.rejects(()=>qualifyStaggeredKeyDesign(runtime,changed,slot,{priorLevel:prior}));
 const baseInputFile=`${out}/rejected-base.json`;
 await fs.writeFile(baseInputFile,JSON.stringify({level,drags,levelSha256:levelSha256(level),accepted:false}),{flag:'wx'});
 await assert.rejects(()=>qualifyStaggeredKeyDesign(runtime,design,slot,{priorLevel:prior,baseInputFile}),/Original accepted base binding changed/);
 completedChecks.push('qualifier-bridge-preflight-rejected');
});
test.after(async()=>{await fs.writeFile(`${out}/report.json`,JSON.stringify({status:completedChecks.length===5?'STAGGERED_KEY_QUALIFICATIONS_PASS':'STAGGERED_KEY_QUALIFICATIONS_INCOMPLETE',proofToolchainSha256:runtime.toolchainSha256,
 completedChecks,expectedChecks:5,actualDesignCandidatesSearched:0,newDifficultySearches:0,realPublicLedgerWrites:0,evidence},null,2)+'\n',{flag:'wx'});});

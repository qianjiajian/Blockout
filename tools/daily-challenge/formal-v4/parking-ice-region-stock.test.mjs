import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {PARKING_ICE_VERSION,SELF,assertParkingGateIceDomain,frozenGateInventoryCapacity,makeParkingIceBlueprint,staticGateIceColourRuntime,
 constructParkingIceStock,auditParkingIcePrefix,parkingPrefixReservations,parkingIceReplayQuote,parkingIceJointAccounting,makeParkingIceJointPlan,runParkingIceJoint} from './parking-ice-region-stock.mjs';

const out=process.env.PARKING_ICE_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),sha=b=>createHash('sha256').update(b).digest('hex'),checks=[];
const requests=async()=>(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const before=await requests(),rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
let stock,privateConstructions=0;
function fixture(){
 const level={id:199,name:'Private retained gate ice and parking prefix',width:4,height:3,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
  blocks:[{id:'pink-h4',x:0,y:0,shape:rect(4,1),color:'pink'},{id:'red-fixed',x:0,y:1,shape:[[0,0]],color:'red'},
   {id:'a',x:1,y:1,shape:rect(3,1),color:'green'},{id:'b',x:0,y:2,shape:rect(2,1),color:'blue'},{id:'c',x:2,y:2,shape:rect(2,1),color:'yellow'}],
  gates:[{id:'pink',side:'right',offset:0,size:1,color:'pink'},{id:'red',side:'bottom',offset:0,size:1,color:'red'},
   {id:'green',side:'left',offset:2,size:1,color:'green'},{id:'blue',side:'right',offset:2,size:1,color:'blue',frozen:3},
   {id:'yellow',side:'top',offset:0,size:2,color:'yellow'},{id:'purple',side:'top',offset:2,size:2,color:'purple'}]};
 const prefixDrags=[{blockId:'pink-h4',path:[],exitSide:'right'},{blockId:'red-fixed',path:[[0,0]]}],changedBodies=level.blocks.slice(2),cells=changedBodies.flatMap(absoluteCells);
 return{version:PARKING_ICE_VERSION,qualificationOnly:true,recipeId:'private-parking-ice',branchId:'private',sourceLevelId:level.id,targetDifficulty:3,finalTargetDifficulty:3,
  seed:1,colourSeed:1,bodyCountDelta:3,shapeProfile:'balanced',maximumStocks:1,maximumStaticPartitionAttempts:1,
  level,reference:{path:'PRIVATE_SYNTHETIC_ONLY',sha256:'0'.repeat(64)},referenceBand:3,referenceLevelSha256:levelSha256(level),
  changedBodies,fixedBlocks:level.blocks.slice(0,2),normalBoardArea:12,region:{cells,bodyIds:changedBodies.map(b=>b.id),area:7,fraction:7/12,originalBodyCount:3,connected:true},
  prefixDrags,prefixSha256:routeSha256(prefixDrags),prefixFacts:{drags:2,parking:1,clears:1},prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true};
}
const construct=(bp,options={})=>{privateConstructions++;return constructParkingIceStock(rt,bp,options);};
async function write(name,value){const file=path.join(out,name),bytes=JSON.stringify(value,null,2)+'\n';await fs.writeFile(file,bytes,{flag:'wx'});return{path:file,sha256:sha(bytes)};}

test('metadata builder accepts parking end, keeps real gate ice and half-region, rejects broad domains',()=>{
 const b=fixture(),drags=[...b.prefixDrags,...Array.from({length:30},(_,i)=>({blockId:'red-fixed',path:[[i%2?0:1,0]]}))];
 // This synthetic certificate-shaped object tests metadata only. It is not
 // recorded as a mathematical PASS and no reference gameplay is performed.
 const ref={accepted:true,sourceLevelId:b.sourceLevelId,level:b.level,levelSha256:b.referenceLevelSha256,drags,L:31,U:31};
 const recipe={...b,cut:2,referenceRouteSha256:routeSha256(drags),regionBodyIds:b.region.bodyIds};
 const api={...rt,LEVELS:[b.level]},result=makeParkingIceBlueprint(api,ref,recipe,{qualificationOnly:true});
 assert.equal(result.metadataOnly,true);assert.equal(result.endsAtParking,true);assert.deepEqual(result.level.gates,b.level.gates);
 assert.equal(result.region.area,7);assert.equal(result.prefixFacts.parking,1);assert.equal(result.completeReferenceDualReplayRequired,true);
 assert.throws(()=>makeParkingIceBlueprint(api,ref,{...recipe,cut:1},{qualificationOnly:true}),/parking/);
 assert.throws(()=>makeParkingIceBlueprint(api,ref,{...recipe,referenceBand:2},{qualificationOnly:true}));
 assert.throws(()=>makeParkingIceBlueprint(api,ref,{...recipe,regionBodyIds:['a']},{qualificationOnly:true}),/half/);
 const irregular=structuredClone(b.level);irregular.blocks[0].shape=[[0,0],[1,0],[0,1]];assert.throws(()=>assertParkingGateIceDomain(irregular),/rectangles/);
 const bodyIce=structuredClone(b.level);bodyIce.blocks[0].frozen=2;assert.throws(()=>assertParkingGateIceDomain(bodyIce),/gate ice only/);
 const view=staticGateIceColourRuntime(rt,b.level.gates);view.assertPlainProofDomain(b.level);assert.equal(view.mathematicalPlainDomainClaimed,false);
 assert.notEqual(view.assertPlainProofDomain,rt.assertPlainProofDomain);assert.throws(()=>rt.assertPlainProofDomain(b.level));
 const frozen=[{id:'blue21',color:'blue',frozen:21}],two=[{color:'blue'},{color:'blue'}];
 assert.equal(frozenGateInventoryCapacity(frozen,two,23)[0].passed,true);
 for(const total of [21,22])assert.equal(frozenGateInventoryCapacity(frozen,two,total)[0].passed,false);
 checks.push({name:'parking-metadata-and-explicit-frozen-gate-domain',passed:true,newReferenceReplays:0});
});

test('one private actual stock preserves frozen gates/q0/fixed bodies and debits every prefix validation image',async()=>{
 const b=fixture(),input=levelSha256(b);stock=construct(b);await write('private-stock.json',stock);
 assert(stock.ok,JSON.stringify({status:stock.status,reason:stock.reason,paint:stock.paint?.reason}));assert.equal(levelSha256(b),input);
 assert.deepEqual(stock.level.gates,b.level.gates);assert.equal(stock.level.gates.find(g=>g.id==='blue').frozen,3);
 for(const fixed of b.fixedBlocks)assert.deepEqual(stock.level.blocks.find(x=>x.id===fixed.id),fixed);
 assert.equal(stock.prefixAudit.valid,true);assert.equal(stock.prefixAudit.clearEvents,1);assert.equal(stock.prefixAudit.nonClearingDrags,1);
 assert.equal(stock.inventory.nonNativeOrMissingArtIds.length,0);assert.equal(stock.level.blocks.flatMap(absoluteCells).length,12);
 const a=stock.constructionAccounting;assert.equal(a.prefixCompleteWorldReservations,parkingPrefixReservations(b.prefixDrags));
 assert.equal(a.completeWorldReservations,2+stock.paint.accounting.completeWorldReservations+a.prefixCompleteWorldReservations);
 assert.equal(a.transitions,stock.partition.transitions+stock.paint.accounting.transitions+a.prefixTransitions);
 assert.equal(a.microStates,stock.paint.accounting.microStates+a.prefixMicroStates);assert.equal(a.prefixMicroStates,parkingIceReplayQuote(b.prefixDrags).micro);assert.equal(stock.provenance.mathematicalPlainProjectionUsed,false);
 assert.equal(stock.L,null);assert.equal(stock.U,null);assert.equal(stock.accepted,false);
 const mistaken=structuredClone(stock.level);Object.assign(mistaken.gates.find(g=>g.id==='red'),{side:'left',offset:1});
 assert.throws(()=>auditParkingIcePrefix(rt,mistaken,b.prefixDrags),/Pointer-down exit/);
 checks.push({name:'actual-private-CSP-and-dual-prefix-with-preserved-gate-ice',passed:true,worldReservations:a.completeWorldReservations});
});

test('budget stops before CSP and rejects omitted prefix construction charges',async()=>{
 const capped=construct(fixture(),{meterLimits:{maxWorlds:1}});assert(!capped.ok);assert.equal(capped.paint,null);
 assert.equal(capped.constructionAccounting.completeWorldReservations,1);assert.equal(capped.enteredColourCsp,false);await write('private-pre-csp-cap.json',capped);
 assert(stock?.ok);const constructionEvidence=await write('private-construction.json',stock),candidate={...stock,constructionEvidence};
 const p=makeParkingIceJointPlan(rt,candidate,{qualificationOnly:true});assert.equal(p.floor,31);assert.equal(p.searchUpper,128);
 assert.equal(p.jointBudget.maxStates+p.constructionAccounting.completeWorldReservations+p.inputCopyReservations+1,10000);
 assert.equal(p.jointBudget.maxMilliseconds+p.constructionAccounting.elapsedMilliseconds,30000);
 const bad=structuredClone(candidate);bad.constructionAccounting.prefixCompleteWorldReservations--;
 bad.constructionAccounting.completeWorldReservations--;assert.throws(()=>makeParkingIceJointPlan(rt,bad,{qualificationOnly:true}));
 assert.throws(()=>makeParkingIceJointPlan(rt,candidate,{qualificationOnly:true,budget:{maxStates:10001}}));
 await write('private-plan.json',p);checks.push({name:'prior-plus-prefix-plus-raw-plus-guard-shared-cap',passed:true,maximum:10000});
});

test('one private original-ice joint cap failure seals same object without alternate prefix or plain lower',async()=>{
 assert(stock?.ok);const constructionEvidence=await write('private-joint-construction.json',stock),candidate={...stock,constructionEvidence};
 const plan=makeParkingIceJointPlan(rt,candidate,{qualificationOnly:true,budget:{maxStates:stock.constructionAccounting.completeWorldReservations+3}});
 const ledgerDirectory=path.join(out,'private-ledger'),beforeInput=levelSha256(candidate);
 const q=await runParkingIceJoint(rt,candidate,{plan,qualificationOnly:true,ledgerDirectory});await write('private-joint-receipt.json',q);
 assert.equal(q.accepted,false);assert.equal(q.status,'UNKNOWN_ORIGINAL_ICE_JOINT_TERMINAL');assert.equal(q.proof.termination,'max-raw-board-states');
 assert.equal(q.proof.sourceLevelSha256,levelSha256(stock.level));assert.equal(q.proof.budget.maxStates,1);assert.equal(q.U,null);assert.equal(q.L,null);
 assert.equal(q.accounting.conservativeFullBoardStateUpperBound,plan.fullBudget.maxStates);assert.equal(levelSha256(candidate),beforeInput);
 const terminal=JSON.parse(await fs.readFile(path.join(ledgerDirectory,q.attempt.id+'.result.json'),'utf8'));
 assert.deepEqual(terminal.lower,q.proof);assert.deepEqual(q.lowerBound.result,q.proof);assert.equal(terminal.levelSha256,q.levelSha256);assert.equal(terminal.accepted,false);
 await assert.rejects(()=>runParkingIceJoint(rt,candidate,{plan,qualificationOnly:true,ledgerDirectory}),/INPUT_ALREADY_ATTEMPTED/);
 for(const file of [path.join(ledgerDirectory,q.attempt.identityOrigin+'.blocked.json'),path.join(ledgerDirectory,'identities',q.attempt.retryIdentitySha256+'.blocked.json')])assert((await fs.stat(file)).isFile());
 // Synthetic counters only: no model, route or lower claim is made by these mutations.
 const metadataPlan=makeParkingIceJointPlan(rt,candidate,{qualificationOnly:true}),metadataProof={...q.proof,budget:metadataPlan.jointBudget,
  status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted',routeTermination:'minimum-optional-route-found',cost:31};
 metadataProof.guardAllowance=guardAllowanceFor(metadataProof);
 assert.doesNotThrow(()=>parkingIceJointAccounting(metadataPlan,metadataProof,{witness:fixture().prefixDrags,elapsedMilliseconds:100,requireSuccess:true}));
 for(const bad of [{sourceLevelSha256:'0'.repeat(64)},{floor:30},{termination:'deadline'},{routeTermination:'search-upper-exhausted'},
  {elapsedMilliseconds:metadataPlan.jointBudget.maxMilliseconds+1},{attemptedTransitions:metadataPlan.jointBudget.maxTransitions+1},
  {microDiscoveredStates:metadataPlan.jointBudget.maxMicroStates+1},{guardAllowance:{}}])
  assert.throws(()=>parkingIceJointAccounting(metadataPlan,{...metadataProof,...bad},{elapsedMilliseconds:100,requireSuccess:true}));
 assert.throws(()=>parkingIceJointAccounting(plan,q.proof,{witness:fixture().prefixDrags,elapsedMilliseconds:100}),/world/);
 assert.throws(()=>parkingIceJointAccounting(metadataPlan,metadataProof,{witness:fixture().prefixDrags,elapsedMilliseconds:30000}),/deadline/);
 await assert.rejects(()=>runParkingIceJoint(rt,candidate,{plan,qualificationOnly:true,ledgerDirectory:path.join(PUBLIC_ATTEMPT_LEDGER,'..private')}),/seven/);
 checks.push({name:'single-original-ice-private-claim-and-terminal-failure',passed:true,privateJointCalls:1,publicClaims:0});
});

test.after(async()=>{
 const after=await requests();assert.deepEqual(after,before);
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),bindings={...rt.toolchainBindings};
 for(const p of [...Object.keys(compiled.metafile.inputs),'tools/daily-challenge/formal-v4/parking-ice-region-stock.test.mjs'])bindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));
 await write('report.json',{status:checks.length===4?'PARKING_ICE_REGION_PRIVATE_PASS':'PARKING_ICE_REGION_PRIVATE_INCOMPLETE',checks,fileBindings:bindings,
  privateConstructions,newRealConstructions:0,newRealCandidateSearches:0,newPublicClaims:0,privateOriginalIceJointCalls:checks.some(c=>c.privateJointCalls)?1:0,
  publicBefore:before.length,publicAfter:after.length,errors:checks.length===4?[]:['Incomplete checks'],oldToolsModified:false,qualificationOnly:true});
});

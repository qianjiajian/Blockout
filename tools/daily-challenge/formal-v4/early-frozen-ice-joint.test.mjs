import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makeEarlyFrozenIcePlan,exploreEarlyFrozenIce,reserveEarlyFrozenAssignment,EARLY_FROZEN_ACCOUNTING} from './early-frozen-ice-joint.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {HISTORY_LEDGER_ROOTS} from './native-batch-io.mjs';
const runtime=await loadV4Runtime(),out=process.env.EARLY_FROZEN_TEST_OUT;
assert(out,'Fresh private output required');await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),evidence=[];
const publicBefore=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort();
const plain={id:999824,name:'Private full original ice fixture',width:2,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},
  {id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'},{id:'gb',side:'bottom',offset:1,size:1,color:'blue'},
  {id:'gg',side:'left',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:1,size:1,color:'yellow'}]};
const declaration={regionBlockIds:['y'],count:1};
const defaults={floor:1,searchUpper:8,qualificationOnly:true,budget:{maxStates:100,maxTransitions:100000,maxMicroStates:100000,maxMilliseconds:5000}};
async function fixture(label,{worlds=3,count=1}={}){
 const dir=`${out}/${label}`;await fs.mkdir(dir);
 const accounting={version:EARLY_FROZEN_ACCOUNTING,placeholderWorldReservations:1,completedColourWorldReservations:worlds-2,icedWorldReservations:1,
  completeWorldReservations:worlds,microStates:3,transitions:5,elapsedMilliseconds:1};
 const iceDeclaration={...declaration,count};
 const level=reserveEarlyFrozenAssignment(plain,iceDeclaration,{reserveWorld:k=>assert.equal(k,'icedWorldReservations')});
 const plainFile=`${dir}/plain-construction.json`,plainOutput={sourceLevelId:plain.id,level:plain,levelSha256:levelSha256(plain),
  qualificationOnly:true,syntheticPriorAccountingFixture:true,placeholderWorld:plain,paint:{accounting:{completeWorldReservations:worlds-2}},
  constructionAccounting:{version:'late-region-static-construction-v1',completeWorldReservations:worlds-1,microStates:3,transitions:5,elapsedMilliseconds:1}};
 await fs.writeFile(plainFile,JSON.stringify(plainOutput,null,2)+'\n',{flag:'wx'});
 const candidate={sourceLevelId:plain.id,level,iceDeclaration,constructionAccounting:accounting,plainConstructionEvidence:{path:plainFile,sha256:sha(await fs.readFile(plainFile))}};
 const file=`${dir}/construction.json`;await fs.writeFile(file,JSON.stringify({...candidate,levelSha256:levelSha256(level)},null,2)+'\n',{flag:'wx'});
 candidate.constructionEvidence={path:file,sha256:sha(await fs.readFile(file))};return{candidate,dir,ledgerDirectory:`${dir}/private-ledger`};
}
const planFor=(f,options={})=>makeEarlyFrozenIcePlan(runtime,f.candidate,{...defaults,...options});
const run=(f,plan=planFor(f))=>exploreEarlyFrozenIce(runtime,f.candidate,{plan,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory});
async function sealed(f,r){assert(await fs.stat(`${f.ledgerDirectory}/${r.attempt.id}.blocked.json`));
 assert(await fs.stat(`${f.ledgerDirectory}/identities/${r.attempt.retryIdentitySha256}.blocked.json`));
 const result=JSON.parse(await fs.readFile(`${f.ledgerDirectory}/${r.attempt.id}.result.json`));assert.equal(result.accepted,false);assert.equal(result.status,r.status);
 assert.equal((await fs.readdir(f.ledgerDirectory)).filter(x=>x.endsWith('.request.json')).length,1);}

test('one original ice joint yields complete two-model U and same-object L without a tail or slot',async()=>{
 const f=await fixture('one-joint'),r=await run(f);assert(r.accepted,JSON.stringify({status:r.status,reason:r.reasons,proof:r.proof?.status,U:r.U}));
 assert.equal(r.L,1);assert.equal(r.U,1);assert.equal(r.jointSearchCalls,1);
 assert.equal(r.proof.sourceLevelSha256,r.levelSha256);assert.deepEqual(r.route.search,r.lowerBound.result);
 assert.equal(r.route.canonicalReplay.clearEvents,4);assert.equal(r.route.independentReplay.clearEvents,4);
 assert.equal(r.route.independentReplay.remainingBodies,0);assert.equal(r.route.independentReplay.remainingQueued,0);
 assert.equal(r.sharedAccounting.conservativeFullBoardStateUpperBound,3+r.proof.rawFullBoardStates+1);
 assert.equal(r.plan.jointBudget.maxStates,96);assert.equal(r.plan.jointBudget.maxTransitions,99995);assert.equal(r.plan.jointBudget.maxMilliseconds,4999);
 assert.equal(r.catalogEligible,false);assert.equal(r.mechanismStrengthValidated,false);assert.equal(r.formalReady,false);
 evidence.push({name:'one-joint-original-full-LU',passed:true,result:r});
});
test('below-floor actual U remains terminal and changing only ice cannot retry the same physical identity',async()=>{
 const f=await fixture('below-floor'),r=await run(f,planFor(f,{floor:2}));
 assert.equal(r.accepted,false);assert.equal(r.U,1);assert.equal(r.L,null);assert.equal(r.status,'ORIGINAL_UPPER_BELOW_DECLARED_FLOOR');await sealed(f,r);
 const changed=await fixture('changed-count',{count:2});changed.ledgerDirectory=f.ledgerDirectory;
 await assert.rejects(()=>run(changed),/INPUT_ALREADY_ATTEMPTED|FAILED_INPUT/);
 evidence.push({name:'below-floor-and-no-ice-only-retry',passed:true,result:r});
});
test('prior 9998 worlds plus one joint world plus terminal allowance hits 10000 then seals UNKNOWN',async()=>{
 const f=await fixture('raw-cap',{worlds:9998});const p=planFor(f,{budget:{...defaults.budget,maxStates:10000}}),r=await run(f,p);
 assert.equal(p.jointBudget.maxStates,1);assert.equal(r.proof.rawFullBoardStates,1);assert.equal(r.sharedAccounting.conservativeFullBoardStateUpperBound,10000);
 assert.equal(r.accepted,false);assert.equal(r.U,null);assert.equal(r.L,null);assert.equal(r.jointSearchCalls,1);await sealed(f,r);
 await assert.rejects(()=>run(f,planFor(f,{budget:{...defaults.budget,maxStates:10000,maxMilliseconds:6000}})),/INPUT_ALREADY_ATTEMPTED|FAILED_INPUT/);
 evidence.push({name:'shared-10000-terminal-no-budget-retry',passed:true,result:r});
});
test('a previously failed plain input cannot acquire a fresh claim by adding ice',async()=>{
 const f=await fixture('plain-failure');const ledger=await createAttemptLedger(f.ledgerDirectory),attempt=await ledger.claim(plain);
 await ledger.finish(attempt,{accepted:false,status:'PRIVATE_PRIOR_FAILURE',levelSha256:levelSha256(plain)});
 await assert.rejects(()=>run(f),/INPUT_ALREADY_ATTEMPTED|FAILED_INPUT/);
 assert.equal((await fs.readdir(f.ledgerDirectory)).filter(x=>x.endsWith('.request.json')).length,1);
 evidence.push({name:'old-plain-failure-plus-ice-blocked',passed:true});
});
test('wrong construction bytes and inconsistent prior counters reject before a claim',async()=>{
 const f=await fixture('wrong-bytes'),p=planFor(f);await fs.appendFile(f.candidate.constructionEvidence.path,' ');
 await assert.rejects(()=>run(f,p),/Construction bytes changed/);assert.equal(await fs.stat(f.ledgerDirectory).then(()=>true,()=>false),false);
 const g=await fixture('wrong-meter');g.candidate.constructionAccounting.completedColourWorldReservations++;
 assert.throws(()=>planFor(g),/All complete static worlds/);
 const fresh=await fixture('bad-budgets');
 for(const budget of [{maxStates:10001},{maxMilliseconds:30001},{maxMicroStates:3000001},{maxTransitions:10000001},{maxStates:4}])assert.throws(()=>planFor(fresh,{budget}));
 evidence.push({name:'byte-binding-and-prior-accounting-preclaim',passed:true});
});
test('final iced complete world is charged before cloning, including a rejected reservation',()=>{
 let reserved=0,cloned=0;const source={...plain,get name(){cloned++;assert.equal(reserved,1);return plain.name;}};
 const made=reserveEarlyFrozenAssignment(source,declaration,{reserveWorld:()=>{reserved++;}});assert.equal(reserved,1);assert.equal(cloned,1);assert.equal(made.blocks.at(-1).frozen,1);
 reserved=0;cloned=0;assert.throws(()=>reserveEarlyFrozenAssignment(source,declaration,{reserveWorld:()=>{throw Error('world cap');}}),/world cap/);assert.equal(cloned,0);
 evidence.push({name:'ice-assignment-before-creation-reservation',passed:true});
});
test('private fixtures reject all five shared roots and current-root junction aliases before creating files',async()=>{
 const f=await fixture('namespace'),plan=planFor(f),env=JSON.parse(await fs.readFile('snapshot-environment.json'));
 for(const root of HISTORY_LEDGER_ROOTS)for(const dir of [root,`${root}/must-not-create-early-ice`,path.join(env.sourceWorkspace,root),path.join(env.sourceWorkspace,root,'must-not-create-early-ice')])
  await assert.rejects(()=>exploreEarlyFrozenIce(runtime,f.candidate,{plan,qualificationOnly:true,ledgerDirectory:dir}),/private|Private|Qualification/);
 evidence.push({name:'all-shared-namespace-and-junction-rejection',passed:true});
});
test('production floor/search ceiling and ice domain cannot be changed through fixture options',async()=>{
 const f=await fixture('domain',{count:2});assert.throws(()=>makeEarlyFrozenIcePlan(runtime,f.candidate,{floor:1}),/assertion|false|31|true/i);
 assert.throws(()=>makeEarlyFrozenIcePlan(runtime,f.candidate,{searchUpper:64}),/assertion|false|128|true/i);
 const altered=structuredClone(f.candidate);altered.level.blocks[0].frozen=2;assert.throws(()=>makeEarlyFrozenIcePlan(runtime,altered,defaults),/declared new region/);
 f.candidate.drags=[];assert.throws(()=>planFor(f),/provided route/);
 evidence.push({name:'no-scope-domain-or-provided-route-bypass',passed:true});
});
test.after(async()=>{
 const after=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort();assert.deepEqual(after,publicBefore);
 const toolBindings={};for(const file of ['tools/daily-challenge/formal-v4/early-frozen-ice-joint.mjs','tools/daily-challenge/formal-v4/early-frozen-ice-joint.test.mjs',...Object.keys(runtime.toolchainBindings)])toolBindings[file]=sha(await fs.readFile(file));
 const report={status:evidence.length===8?'EARLY_FROZEN_ICE_JOINT_PRIVATE_PASS':'EARLY_FROZEN_ICE_JOINT_PRIVATE_INCOMPLETE',evidence,toolBindings,
  publicRequestCountBefore:publicBefore.length,publicRequestCountAfter:after.length,newRealCandidateConstructions:0,newRealCandidateSearches:0,newPublicClaims:0,qualificationOnly:true,formalReady:false};
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});

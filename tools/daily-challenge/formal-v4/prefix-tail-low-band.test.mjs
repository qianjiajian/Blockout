import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makeLowBandPrefixTailPlan,exploreLowBandPrefixTail,LOW_BANDS} from './prefix-tail-low-band.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {CONSTRUCTION_LEDGER} from './constraint-attempt-guard.mjs';

const runtime=await loadV4Runtime(),evidence=[];
const out=process.env.LOW_BAND_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/low-band-prefix-tail-qualification-');
await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const publicBefore=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const stock={id:999821,name:'Private low-band prefix-tail one-parking fixture',width:2,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},
 {id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'},{id:'gb',side:'bottom',offset:1,size:1,color:'blue'},
 {id:'gg',side:'left',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:1,size:1,color:'yellow'}]};
const two={id:999823,name:'Private two-parking fixture',width:4,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'o',x:0,y:0,shape:[[0,0],[0,1]],color:'red'},{id:'a',x:1,y:0,shape:[[0,0],[1,0]],color:'blue'},
 {id:'b',x:1,y:1,shape:[[0,0],[1,0]],color:'green'},{id:'c',x:3,y:0,shape:[[0,0],[0,1]],color:'yellow'}],
 gates:[{id:'gr',side:'left',offset:0,size:2,color:'red'},{id:'gb',side:'right',offset:0,size:1,color:'blue'},
 {id:'gg',side:'right',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:2,size:1,color:'yellow'}]};
const onePrefix=[{blockId:'r',path:[],exitSide:'top'}],movedPrefix=[...onePrefix,{blockId:'y',path:[[0,0]]}],twoPrefix=[{blockId:'o',path:[],exitSide:'left'},{blockId:'a',path:[[0,0]]}];
const options=(floor=1,upper=1,targetDifficulty=1)=>({qualificationOnly:true,targetDifficulty,qualificationBand:{floor,upper},upperBudget:{maxStates:100,maxMicroStates:10000,maxTransitions:50000,maxMilliseconds:5000},lowerBudget:{maxStates:100,maxMilliseconds:5000}});
async function fixture(label,{level=stock,prefixDrags=onePrefix,priorWorlds=1}={}){
 const dir=`${out}/${label}`,candidate={sourceLevelId:level.id,level:structuredClone(level),prefixDrags:structuredClone(prefixDrags),
  constructionAccounting:{version:'late-region-static-construction-v1',completeWorldReservations:priorWorlds,microStates:3,transitions:4,elapsedMilliseconds:1}};
 await fs.mkdir(dir);const file=`${dir}/construction.json`,prior={...candidate,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags),qualificationOnly:true},bytes=JSON.stringify(prior,null,2)+'\n';
 await fs.writeFile(file,bytes,{flag:'wx'});candidate.constructionEvidence={path:file,sha256:hash(bytes)};return{dir,candidate,ledgerDirectory:`${dir}/private-ledger`};
}
async function run(f,opt=options()){
 const plan=makeLowBandPrefixTailPlan(runtime,f.candidate,opt),before=levelSha256(f.candidate),r=await exploreLowBandPrefixTail(runtime,f.candidate,{qualificationOnly:true,ledgerDirectory:f.ledgerDirectory,plan});
 assert.equal(levelSha256(f.candidate),before);return{plan,r};
}
async function blocked(f,r){
 assert(await fs.stat(`${f.ledgerDirectory}/${r.attempt.id}.blocked.json`));assert(await fs.stat(`${f.ledgerDirectory}/identities/${r.attempt.retryIdentitySha256}.blocked.json`));
 assert.equal((await fs.readdir(f.ledgerDirectory)).filter(n=>n.endsWith('.request.json')).length,1);
}

test('production bands are fixed; inclusive tail allowance subtracts only declared plain parking',async()=>{
 assert.deepEqual(LOW_BANDS,{1:{floor:16,upper:20},2:{floor:21,upper:30}});
 const f=await fixture('production-plan');f.candidate.sourceLevelId=runtime.LEVELS[0].id;
 for(const difficulty of [1,2]){
  const p=makeLowBandPrefixTailPlan(runtime,f.candidate,{targetDifficulty:difficulty});
  assert.equal(p.floor,LOW_BANDS[difficulty].floor);assert.equal(p.totalUpperLimit,LOW_BANDS[difficulty].upper);
  assert.equal(p.tailParkingLimit,p.totalUpperLimit);assert.equal(p.innerPlan.searchUpper,p.tailParkingLimit);
  assert.equal(p.bandChangeAfterClaimAllowed,false);
 }
 for(const targetDifficulty of [undefined,0,3])assert.throws(()=>makeLowBandPrefixTailPlan(runtime,f.candidate,{targetDifficulty}),/targetDifficulty/);
 assert.throws(()=>makeLowBandPrefixTailPlan(runtime,f.candidate,{targetDifficulty:1,qualificationBand:{floor:1,upper:20}}),/cannot be overridden/);
 const tooLong=structuredClone(f.candidate);tooLong.prefixDrags=Array.from({length:21},()=>({blockId:'b',path:[[0,0]]}));
 assert.throws(()=>makeLowBandPrefixTailPlan(runtime,tooLong,{targetDifficulty:1}),/prefix already exceeds/);
 evidence.push({test:'fixed-production-bands',passed:true});
});

test('one full original claim: U exactly at ceiling passes, original L follows once',async()=>{
 const f=await fixture('one-parking'),{r,plan}=await run(f);
 assert(r.accepted,JSON.stringify(r));assert.equal(r.U,1);assert.equal(r.L,1);assert.equal(r.difficulty,null);assert.equal(plan.tailParkingLimit,1);
 assert.equal(r.upperConstruction.tailSearches,1);assert.equal(r.lowerBound.inputLevelSha256,r.levelSha256);assert.equal(r.lowerBound.result.sourceLevelSha256,r.levelSha256);
 assert.notEqual(r.upperConstruction.tailLevelSha256,r.levelSha256);assert.equal(r.route.independentReplay.clearEvents,4);
 const request=JSON.parse(await fs.readFile(`${f.ledgerDirectory}/${r.attempt.id}.request.json`));assert.equal(request.levelSha256,r.levelSha256);
 evidence.push({test:'inclusive-full-upper-original-lower',passed:true,result:r});
});

test('zero remaining parking uses only cost-zero closure and still completes a genuine moved prefix',async()=>{
 const f=await fixture('zero-remainder',{prefixDrags:movedPrefix}),{r,plan}=await run(f);
 assert.equal(plan.prefixParking,1);assert.equal(plan.tailParkingLimit,0);assert.equal(plan.innerPlan.searchUpper,0);
 assert.equal(plan.innerPlan.tailSearchMode,'zero-parking-closure-only');assert(r.accepted,JSON.stringify(r));assert.equal(r.U,1);
 assert.equal(r.upperConstruction.tailSearch.cost,0);assert.equal(r.upperConstruction.tailSearches,1);
 evidence.push({test:'zero-remainder-positive',passed:true,result:r});
});

test('two-parking control: remaining one is inclusive; zero is terminal rather than rounded up',async()=>{
 const success=await fixture('two-parking-positive',{level:two,prefixDrags:twoPrefix}),{r:yes,plan}=await run(success,options(2,2,2));
 assert(yes.accepted,JSON.stringify(yes));assert.equal(yes.U,2);assert.equal(yes.L,2);assert.equal(plan.tailParkingLimit,1);assert.equal(yes.upperConstruction.tailSearch.cost,1);
 const failure=await fixture('two-parking-zero-cap',{level:two,prefixDrags:twoPrefix}),{r:no}=await run(failure,options(1,1,2));
 assert.equal(no.accepted,false);assert.equal(no.lowerBound,null);assert.equal(no.upperConstruction.tailSearches,1);assert.equal(no.upperConstruction.plan.searchUpper,0);
 assert.equal(no.upperConstruction.tailSearch.parkingTransitions,0);await blocked(failure,no);
 evidence.push({test:'one-cost-boundary',passed:true,positive:yes,negative:no});
});

test('below-band complete U is blocked without L; another difficulty/strategy cannot retry the same identity',async()=>{
 const f=await fixture('below-band'),{r}=await run(f,options(2,2,2));assert.equal(r.U,1);assert.equal(r.accepted,false);assert.equal(r.lowerBound,null);
 assert.equal(r.status,'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR');await blocked(f,r);
 const changed=makeLowBandPrefixTailPlan(runtime,f.candidate,options(1,1,1));
 await assert.rejects(()=>exploreLowBandPrefixTail(runtime,f.candidate,{qualificationOnly:true,ledgerDirectory:f.ledgerDirectory,plan:changed}),/INPUT_ALREADY_ATTEMPTED/);
 evidence.push({test:'below-band-no-retarget',passed:true,result:r});
});

test('construction, prefix, raw tail and reserved terminal share one cap; no larger retry',async()=>{
 const f=await fixture('shared-budget',{priorWorlds:3}),opt=options();opt.upperBudget.maxStates=7;
 const {r,plan}=await run(f,opt);assert.equal(plan.innerPlan.tailBudget.maxStates,1);assert.equal(r.accepted,false);assert.equal(r.lowerBound,null);
 assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,7);assert.equal(r.upperConstruction.tailSearches,1);await blocked(f,r);
 const more=makeLowBandPrefixTailPlan(runtime,f.candidate,options());
 await assert.rejects(()=>exploreLowBandPrefixTail(runtime,f.candidate,{qualificationOnly:true,ledgerDirectory:f.ledgerDirectory,plan:more}),/INPUT_ALREADY_ATTEMPTED/);
 assert.equal(plan.innerPlan.tailBudget.maxMicroStates,9997);assert.equal(plan.innerPlan.tailBudget.maxTransitions,49996);assert.equal(plan.innerPlan.tailBudget.maxMilliseconds,4999);
 for(const [key,value]of [['maxStates',10001],['maxMicroStates',3000001],['maxTransitions',10000001],['maxMilliseconds',30001]])assert.throws(()=>makeLowBandPrefixTailPlan(runtime,f.candidate,{...options(),upperBudget:{[key]:value}}));
 evidence.push({test:'shared-all-resource-budgets',passed:true,result:r});
});

test('invalid first-contact prefix is sealed after claim without tail or lower',async()=>{
 const f=await fixture('illegal-prefix',{prefixDrags:[{blockId:'r',path:[[0,1]]}]}),{r}=await run(f,options(1,2));
 assert.equal(r.accepted,false);assert.equal(r.upperConstruction.tailSearches,0);assert.equal(r.lowerBound,null);assert.match(r.upperConstruction.reason,/Pointer-down exit/);await blocked(f,r);
 evidence.push({test:'illegal-prefix-terminal',passed:true,result:r});
});

test('plan/object/accounting tampering and unsupported mechanisms cannot start any claim',async()=>{
 const f=await fixture('tamper'),opt=options(),plan=makeLowBandPrefixTailPlan(runtime,f.candidate,opt),changed=structuredClone(plan);changed.innerPlan.searchUpper++;
 await assert.rejects(()=>exploreLowBandPrefixTail(runtime,f.candidate,{qualificationOnly:true,ledgerDirectory:f.ledgerDirectory,plan:changed}),/plan changed/);
 for(const value of [-1,NaN,Infinity,10001]){const c=structuredClone(f.candidate);c.constructionAccounting.completeWorldReservations=value;assert.throws(()=>makeLowBandPrefixTailPlan(runtime,c,opt));}
 for(const key of ['frozen','lockedBy','shutterId','movementAxis','timedBombSeconds']){const c=structuredClone(f.candidate);c.level.blocks[0][key]=1;assert.throws(()=>makeLowBandPrefixTailPlan(runtime,c,opt));}
 await fs.appendFile(f.candidate.constructionEvidence.path,' ');
 await assert.rejects(()=>exploreLowBandPrefixTail(runtime,f.candidate,{qualificationOnly:true,ledgerDirectory:f.ledgerDirectory,plan}),/construction bytes changed/);
 assert.equal(await fs.stat(f.ledgerDirectory).then(()=>true).catch(()=>false),false);evidence.push({test:'binding-domain-negatives',passed:true});
});

test('private qualification resolves junction aliases and nonexistent children before any ledger write',async()=>{
 const f=await fixture('namespace'),plan=makeLowBandPrefixTailPlan(runtime,f.candidate,options());
 const alias=path.resolve(f.dir,'public-alias');await fs.symlink(path.resolve(PUBLIC_ATTEMPT_LEDGER),alias,'junction');
 const attempts=[PUBLIC_ATTEMPT_LEDGER,CONSTRUCTION_LEDGER,alias,path.join(alias,'never-created-low-band-private')];
 for(const ledgerDirectory of attempts)await assert.rejects(()=>exploreLowBandPrefixTail(runtime,f.candidate,{qualificationOnly:true,ledgerDirectory,plan}),/private ledgers/);
 assert.equal(await fs.stat(path.join(alias,'never-created-low-band-private')).then(()=>true).catch(()=>false),false);
 await assert.rejects(()=>exploreLowBandPrefixTail(runtime,f.candidate,{qualificationOnly:false,ledgerDirectory:f.ledgerDirectory,plan}),/shared public/);
 evidence.push({test:'junction-private-ledger-guard',passed:true,attempts});
});

test.after(async()=>{
 const publicAfter=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();assert.deepEqual(publicAfter,publicBefore);
 const files=['tools/daily-challenge/formal-v4/prefix-tail-low-band.mjs','tools/daily-challenge/formal-v4/prefix-tail-low-band.test.mjs','tools/daily-challenge/formal-v4/prefix-tail-explore.mjs','tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.mjs','tools/daily-challenge/formal-v4/constraint-attempt-guard.mjs'];
 const fileBindings=Object.fromEntries(await Promise.all(files.map(async p=>[p,hash(await fs.readFile(p))])));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===9?'LOW_BAND_PREFIX_TAIL_QUALIFICATION_PASS':'INCOMPLETE',evidence,fileBindings,executionWorkspace:path.resolve('.'),proofToolchainSha256:runtime.toolchainSha256,qualificationOnly:true,
  publicRequestCountBefore:publicBefore.length,publicRequestCountAfter:publicAfter.length,realCandidateConstructions:0,realCandidateSolverInvocations:0,publicLedgerClaims:0,productionChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});

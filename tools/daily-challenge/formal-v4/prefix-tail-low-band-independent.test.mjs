import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makeLowBandPrefixTailPlan,exploreLowBandPrefixTail} from './prefix-tail-low-band.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Independently authored private fixtures. No real candidate or public claim.
const runtime=await loadV4Runtime(),out=process.env.LOW_BAND_INDEPENDENT_OUT;
assert(out,'A fresh private qualification output is required');
await fs.mkdir(out,{recursive:false});
const before=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort();
const evidence=[],hash=b=>createHash('sha256').update(b).digest('hex');
const level={id:998431,name:'Independent bent-held path fixture',width:3,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[['r','red',0,0],['b','blue',1,0],['g','green',2,0],['y','yellow',0,1],['p','pink',1,1],['c','cyan',2,1]].map(([id,color,x,y])=>({id,color,x,y,shape:[[0,0]]})),
 gates:[{id:'gr',color:'red',side:'top',offset:0,size:1},{id:'gb',color:'blue',side:'top',offset:1,size:1},
  {id:'gg',color:'green',side:'top',offset:2,size:1},{id:'gy',color:'yellow',side:'right',offset:0,size:1},
  {id:'gp',color:'pink',side:'bottom',offset:1,size:1},{id:'gc',color:'cyan',side:'right',offset:1,size:1}]};
const prefix=[{blockId:'r',path:[],exitSide:'top'},{blockId:'b',path:[],exitSide:'top'},{blockId:'y',path:[[0,0],[1,0]]}];
async function fixture(label,priorWorlds=1,drags=prefix){
 const dir=`${out}/${label}`;await fs.mkdir(dir);
 const candidate={sourceLevelId:level.id,level:structuredClone(level),prefixDrags:structuredClone(drags),
  constructionAccounting:{version:'late-region-static-construction-v1',completeWorldReservations:priorWorlds,microStates:0,transitions:0,elapsedMilliseconds:0}};
 const file=`${dir}/construction.json`,data={...candidate,levelSha256:levelSha256(level),prefixSha256:routeSha256(drags)};
 await fs.writeFile(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});candidate.constructionEvidence={path:file,sha256:hash(await fs.readFile(file))};
 return{candidate,ledgerDirectory:`${dir}/private-ledger`};
}
function make(candidate,extra={}){return makeLowBandPrefixTailPlan(runtime,candidate,{targetDifficulty:2,qualificationOnly:true,qualificationBand:{floor:2,upper:2},
 upperBudget:{maxStates:10000,maxTransitions:50000,maxMicroStates:10000,maxMilliseconds:5000},lowerBudget:{maxStates:100,maxMilliseconds:5000},...extra});}
async function run(f,plan=make(f.candidate)){return exploreLowBandPrefixTail(runtime,f.candidate,{plan,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory});}
async function checkSealed(f,r){
 const request=JSON.parse(await fs.readFile(`${f.ledgerDirectory}/${r.attempt.id}.request.json`));
 assert.equal(request.levelSha256,levelSha256(level));
 const result=JSON.parse(await fs.readFile(`${f.ledgerDirectory}/${r.attempt.id}.result.json`));assert.equal(result.accepted,false);
 assert(await fs.stat(`${f.ledgerDirectory}/${r.attempt.id}.blocked.json`));
 assert(await fs.stat(`${f.ledgerDirectory}/identities/${r.attempt.retryIdentitySha256}.blocked.json`));
}
test('a two-unit bent hold counts once; actual complete below-band U never yields the prefix floor',async()=>{
 const f=await fixture('bent-hold'),plan=make(f.candidate),r=await run(f,plan);
 assert.equal(plan.prefixParking,1);assert.equal(plan.tailParkingLimit,1);assert.equal(r.U,1);
 assert.equal(r.route.canonicalReplay.nonClearingDrags,1);assert.equal(r.route.independentReplay.nonClearingDrags,1);
 assert.equal(r.route.independentReplay.clearEvents,6);assert.equal(r.route.independentReplay.remainingBodies,0);
 assert.equal(r.route.canonicalReplay.effectiveDrags,7);assert.equal(r.upperConstruction.tailSearch.cost,0);
 assert.equal(r.lowerBound,null);assert.equal(r.L,null);assert.equal(r.accepted,false);assert.equal(r.status,'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR');
 assert.deepEqual(r.drags.slice(0,3),prefix);await checkSealed(f,r);
 evidence.push({test:'held-turn-one-cost-original-six-body-U',passed:true,result:r});
});
test('9994 prior worlds + four prefix worlds + one raw tail + terminal allowance stop at exactly the shared cap',async()=>{
 const f=await fixture('hard-cap',9994),plan=make(f.candidate),r=await run(f,plan);
 assert.equal(plan.innerPlan.tailBudget.maxStates,1);assert.equal(r.upperConstruction.tailSearches,1);
 assert.equal(r.upperConstruction.tailSearch.rawFullBoardStates,1);assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,10000);
 assert.equal(r.accepted,false);assert.equal(r.lowerBound,null);assert.equal(r.U,null);await checkSealed(f,r);
 // Changing only metadata or using another difficulty cannot continue the failed physical input.
 const renamed=structuredClone(f.candidate);renamed.level.name='New name cannot reset the budget';
 const file=`${out}/hard-cap/renamed-construction.json`,q={...renamed,levelSha256:levelSha256(renamed.level),prefixSha256:routeSha256(renamed.prefixDrags)};
 await fs.writeFile(file,JSON.stringify(q)+'\n',{flag:'wx'});renamed.constructionEvidence={path:file,sha256:hash(await fs.readFile(file))};
 await assert.rejects(()=>exploreLowBandPrefixTail(runtime,renamed,{plan:make(renamed),qualificationOnly:true,ledgerDirectory:f.ledgerDirectory}),/INPUT_ALREADY_ATTEMPTED/);
 assert.throws(()=>makeLowBandPrefixTailPlan(runtime,f.candidate,{targetDifficulty:1,qualificationOnly:true,upperBudget:{maxStates:10001}}));
 evidence.push({test:'full-10000-boundary-and-metadata-no-retry',passed:true,result:r});
});
test('pretending the bent parking hold is a clear cannot remove its cost or mint a tail U',async()=>{
 const wrong=structuredClone(prefix);wrong[2].exitSide='right';
 const f=await fixture('fake-clear',1,wrong),r=await run(f);
 assert.equal(r.accepted,false);assert.equal(r.lowerBound,null);assert.equal(r.U,null);assert.equal(r.upperConstruction.tailSearches,0);
 assert.match(r.upperConstruction.reason,/prefix-replay/);await checkSealed(f,r);
 evidence.push({test:'actual-gate-first-contact-cost-authority',passed:true,result:r});
});
test.after(async()=>{
 const after=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort();assert.deepEqual(after,before);
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===3?'INDEPENDENT_PRIVATE_NEGATIVES_PASS':'INCOMPLETE',evidence,
  publicRequestsBefore:before.length,publicRequestsAfter:after.length,publicLedgerClaims:0,realCandidateSearches:0,
  toolchainSha256:runtime.toolchainSha256,currentRuntimeValidationClaimed:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {makeNativeTaskPrefixTailPlan,exploreNativeTaskPrefixTail,nativeOriginalLowerStage,nativeTargetBand} from './prefix-tail-native-task.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

const out=process.env.NATIVE_PREFIX_TASK_TEST_OUT;
assert(out,'An explicit fresh private output directory is required');
await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),sha=b=>createHash('sha256').update(b).digest('hex'),checks=[];
const publicRequests=async()=>(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const before=await publicRequests();
const level={id:999861,name:'Private native tail four-square fixture',width:2,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},{id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'},{id:'gb',side:'bottom',offset:1,size:1,color:'blue'},{id:'gg',side:'left',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:1,size:1,color:'yellow'}]};
const prefixDrags=[{blockId:'r',path:[],exitSide:'top'}];
async function fixture(label,priorWorlds=1){
 const dir=path.join(out,label);await fs.mkdir(dir);
 const candidate={sourceLevelId:level.id,level:structuredClone(level),prefixDrags:structuredClone(prefixDrags),constructionAccounting:{version:'late-region-static-construction-v1',completeWorldReservations:priorWorlds,microStates:3,transitions:4,elapsedMilliseconds:1}};
 const prior={...candidate,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags),qualificationOnly:true},raw=JSON.stringify(prior,null,2)+'\n',file=path.join(dir,'construction.json');
 await fs.writeFile(file,raw,{flag:'wx'});candidate.constructionEvidence={path:file,sha256:sha(raw)};
 return{candidate,ledgerDirectory:path.join(dir,'private-ledger')};
}

test('D2 and D3 are fixed bands; out-of-band first U dispatches no lower or fallback',()=>{
 let calls=0;const result={token:'pure lower callback sentinel'},lower=()=>{calls++;return result;};
 assert.deepEqual(nativeTargetBand(2),{floor:21,upper:30});assert.deepEqual(nativeTargetBand(3),{floor:31,upper:null});
 assert.equal(nativeOriginalLowerStage(20,2,lower).status,'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR');
 assert.equal(nativeOriginalLowerStage(31,2,lower).status,'KNOWN_UPPER_ABOVE_PREDECLARED_CEILING');
 assert.equal(nativeOriginalLowerStage(30,3,lower).status,'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR');assert.equal(calls,0);
 for(const [U,target]of [[21,2],[30,2],[31,3],[200,3]])assert.strictEqual(nativeOriginalLowerStage(U,target,lower).lower,result);
 assert.equal(calls,4);for(const target of [1,0,'2',4])assert.throws(()=>nativeTargetBand(target));
 for(const U of [-1,NaN,Infinity,30.5])assert.throws(()=>nativeOriginalLowerStage(U,2,lower));
 checks.push({name:'fixed-target-and-first-U-terminal',passed:true,syntheticOnly:true,lowerDispatches:4});
});

test('prior plus prefix plus native plus terminal share 10000; lower remains separately 9999 plus one',async()=>{
 const f=await fixture('budget',7),p=makeNativeTaskPrefixTailPlan(rt,f.candidate,{targetDifficulty:2,qualificationOnly:true});
 assert.equal(p.floor,21);assert.deepEqual(p.band,{floor:21,upper:30});assert.equal(p.innerPlan.tailStrategy,'native');
 assert.equal(p.fullUpperBudget.maxMilliseconds,30000);assert.equal(p.innerPlan.prefixBoardCharge,2);
 assert.equal(p.innerPlan.tailBudget.maxStates,9990);assert.equal(7+2+p.innerPlan.tailBudget.maxStates+1,10000);
 assert.equal(p.innerPlan.tailBudget.maxMicroStates,3000000-3);assert.equal(p.innerPlan.tailBudget.maxTransitions,10000000-4);
 assert.equal(p.innerPlan.tailBudget.maxMilliseconds,30000-1);assert.equal(p.lowerBudget.maxStates,9999);
 const q=makeNativeTaskPrefixTailPlan(rt,f.candidate,{targetDifficulty:3,qualificationOnly:true});assert.equal(q.floor,31);assert.equal(q.band.upper,null);
 assert.throws(()=>makeNativeTaskPrefixTailPlan(rt,{...f.candidate,constructionAccounting:{...f.candidate.constructionAccounting,completeWorldReservations:9997}},{targetDifficulty:2,qualificationOnly:true}),/No board budget remains/);
 assert.throws(()=>makeNativeTaskPrefixTailPlan(rt,f.candidate,{targetDifficulty:2,qualificationOnly:true,upperBudget:{maxMilliseconds:30001}}),/Invalid bounded budget/);
 const core=await fs.readFile('tools/daily-challenge/formal-v3/bounded-proof.mjs');assert.equal(sha(core),'ebf6522ed5a6c8b3c5bc4e217a8026f68f05894cc07ebc54f190efc941360054');
 checks.push({name:'shared-U-budget-and-frozen-lower-primitive',passed:true,syntheticOnly:true,registeredNativeAllowance:9990,upperTotal:10000,lowerRegistered:9999});
});

test('one real private toy native U cap failure seals the same physical input and starts no L',async()=>{
 const f=await fixture('native-cap'),plan=makeNativeTaskPrefixTailPlan(rt,f.candidate,{targetDifficulty:2,qualificationOnly:true,upperBudget:{maxStates:5}}),original=levelSha256(f.candidate);
 const q=await exploreNativeTaskPrefixTail(rt,f.candidate,{plan,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory});
 assert.equal(q.accepted,false);assert.equal(q.status,'UNKNOWN_CONSTRUCTED_UPPER_TERMINAL');assert.equal(q.upperConstruction.tailSearches,1);
 assert.equal(q.upperConstruction.tailSearch.termination,'max-states');assert.equal(q.lowerBound,null);assert.equal(q.L,null);
 assert.equal(q.upperAccounting.conservativeFullBoardStateUpperBound,5);assert.equal(levelSha256(f.candidate),original);
 for(const file of [path.join(f.ledgerDirectory,q.attempt.identityOrigin+'.blocked.json'),path.join(f.ledgerDirectory,'identities',q.attempt.retryIdentitySha256+'.blocked.json')])assert((await fs.stat(file)).isFile());
 const second=makeNativeTaskPrefixTailPlan(rt,f.candidate,{targetDifficulty:3,qualificationOnly:true});
 await assert.rejects(()=>exploreNativeTaskPrefixTail(rt,f.candidate,{plan:second,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory}),/INPUT_ALREADY_ATTEMPTED/);
 assert.equal((await fs.readdir(f.ledgerDirectory)).filter(x=>x.endsWith('.request.json')).length,1);
 checks.push({name:'native-private-U-failure-terminal-and-no-reband-retry',passed:true,privateToyOnly:true,lowerCalls:0,actualUpperTotal:5,receipt:q.evidenceFile});
});

test.after(async()=>{
 const after=await publicRequests();assert.deepEqual(after,before);
 const paths=['tools/daily-challenge/formal-v4/prefix-tail-native-task.mjs','tools/daily-challenge/formal-v4/prefix-tail-native-task.test.mjs','tools/daily-challenge/formal-v3/bounded-proof.mjs','tools/daily-challenge/formal-v3/reserved-guard-budget.mjs','tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.mjs','tools/daily-challenge/formal-v4/prefix-execution-environment-task.mjs'];
 const bindings={...rt.toolchainBindings};for(const p of paths)bindings[p]=sha(await fs.readFile(p));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:checks.length===3?'NATIVE_PREFIX_TASK_PRIVATE_PASS':'NATIVE_PREFIX_TASK_PRIVATE_INCOMPLETE',checks,fileBindings:bindings,publicBefore:before.length,publicAfter:after.length,newRealConstructions:0,newRealCandidateSearches:0,newPublicClaims:0,privateToyUpperCalls:checks.some(x=>x.privateToyOnly)?1:0,lowerAlgorithmChanged:false,upperAlgorithmChanged:false,errors:checks.length===3?[]:['Incomplete checks']},null,2)+'\n',{flag:'wx'});
});

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {makeNativePrefixTailV4Plan,exploreNativePrefixTailV4} from './prefix-tail-native-v4.mjs';
import {makePrefixTailV4Plan,explorePrefixTailV4} from './prefix-tail-explore.mjs';
import {guardedNativeUpper} from '../formal-v3/reserved-guard-budget.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {CONSTRUCTION_LEDGER} from './constraint-attempt-guard.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

const runtime=await loadV4Runtime(),out=process.env.NATIVE_PREFIX_TAIL_TEST_OUT;
assert(out,'Fresh private qualification output required');await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),evidence=[];
const publicBefore=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort();
const stock={id:999824,name:'Private native-tail one-parking control',width:2,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},
  {id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'},{id:'gb',side:'bottom',offset:1,size:1,color:'blue'},
  {id:'gg',side:'left',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:1,size:1,color:'yellow'}]};
const bent={...stock,id:999825,name:'Private native-tail continuous bend',width:3,height:2,
 blocks:[['r','red',0,0],['b','blue',1,0],['g','green',2,0],['y','yellow',0,1],['p','pink',1,1],['c','cyan',2,1]].map(([id,color,x,y])=>({id,color,x,y,shape:[[0,0]]})),
 gates:[{id:'gr',color:'red',side:'top',offset:0,size:1},{id:'gb',color:'blue',side:'top',offset:1,size:1},
  {id:'gg',color:'green',side:'top',offset:2,size:1},{id:'gy',color:'yellow',side:'right',offset:0,size:1},
  {id:'gp',color:'pink',side:'bottom',offset:1,size:1},{id:'gc',color:'cyan',side:'right',offset:1,size:1}]};
const prefix=[{blockId:'r',path:[],exitSide:'top'}];
const bentPrefix=[...prefix,{blockId:'b',path:[],exitSide:'top'},{blockId:'y',path:[[0,0],[1,0]]}];
const defaults={floor:1,qualificationOnly:true,upperBudget:{maxStates:100,maxMicroStates:10000,maxTransitions:50000,maxMilliseconds:5000},lowerBudget:{maxStates:100,maxMilliseconds:5000}};
async function fixture(label,{level=stock,prefixDrags=prefix,priorWorlds=1}={}){
 const dir=`${out}/${label}`;await fs.mkdir(dir);
 const candidate={sourceLevelId:level.id,level:structuredClone(level),prefixDrags:structuredClone(prefixDrags),
  constructionAccounting:{version:'late-region-static-construction-v1',completeWorldReservations:priorWorlds,microStates:3,transitions:4,elapsedMilliseconds:1}};
 const file=`${dir}/construction.json`;await fs.writeFile(file,JSON.stringify({...candidate,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags)},null,2)+'\n',{flag:'wx'});
 candidate.constructionEvidence={path:file,sha256:sha(await fs.readFile(file))};return{candidate,dir,ledgerDirectory:`${dir}/private-ledger`};
}
const planFor=(f,options={})=>makeNativePrefixTailV4Plan(runtime,f.candidate,{...defaults,...options});
const run=(f,plan=planFor(f))=>exploreNativePrefixTailV4(runtime,f.candidate,{plan,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory});
async function sealed(f,r){
 assert(await fs.stat(`${f.ledgerDirectory}/${r.attempt.id}.blocked.json`));
 assert(await fs.stat(`${f.ledgerDirectory}/identities/${r.attempt.retryIdentitySha256}.blocked.json`));
 const request=JSON.parse(await fs.readFile(`${f.ledgerDirectory}/${r.attempt.id}.request.json`));assert.deepEqual(request,r.attempt);
 assert.equal(request.levelSha256,levelSha256(f.candidate.level));
 const result=JSON.parse(await fs.readFile(`${f.ledgerDirectory}/${r.attempt.id}.result.json`));assert.equal(result.accepted,false);assert.equal(result.status,r.status);
 assert.equal((await fs.readdir(f.ledgerDirectory)).filter(x=>x.endsWith('.request.json')).length,1);
}

test('one native U plus separate original L completes all four original bodies under the same first claim',async()=>{
 const f=await fixture('success'),plan=planFor(f),before=levelSha256(f.candidate),r=await run(f,plan);
 assert.equal(plan.innerPlan.tailStrategy,'native');assert.equal(plan.nativeTailHasNoParkingCeiling,true);assert.equal(plan.witnessOptimalityClaimed,false);
 assert(r.accepted,JSON.stringify(r));assert.equal(r.L,1);assert.equal(r.U,1);assert.equal(r.difficulty,null);
 assert.equal(r.upperConstruction.tailSearches,1);assert.equal(r.upperConstruction.tailSearch.witnessFound,true);assert.equal(r.upperConstruction.tailSearch.lowerBoundCertified,false);
 assert.notEqual(r.upperConstruction.tailLevelSha256,r.levelSha256);assert.equal(r.lowerBound.result.sourceLevelSha256,r.levelSha256);
 assert.equal(r.lowerBound.requiredFloor,1);assert.equal(r.route.canonicalReplay.clearEvents,4);assert.equal(r.route.independentReplay.clearEvents,4);
 assert.equal(r.route.independentReplay.remainingBodies,0);assert.equal(r.route.independentReplay.remainingQueued,0);
 assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,1+2+r.upperConstruction.tailSearch.rawFullBoardStates+1);
 assert.equal(r.plan.innerPlan.tailBudget.maxMicroStates,9997);assert.equal(r.plan.innerPlan.tailBudget.maxTransitions,49996);assert.equal(r.plan.innerPlan.tailBudget.maxMilliseconds,4999);
 assert.equal(levelSha256(f.candidate),before);assert.equal(r.catalogEligible,false);assert.equal(r.formalReady,false);
 assert.equal((await fs.readdir(f.ledgerDirectory)).filter(x=>x.endsWith('.request.json')).length,1);
 evidence.push({test:'one-original-identity-complete-native-U-original-L',passed:true,result:r});
});
test('construction, prefix, native tail and its first unregistered world share the full 10000 cap',async()=>{
 const f=await fixture('hard-cap',{priorWorlds:9996}),plan=planFor(f,{upperBudget:{...defaults.upperBudget,maxStates:10000}}),r=await run(f,plan);
 assert.equal(plan.innerPlan.tailBudget.maxStates,1);assert.equal(r.upperConstruction.tailSearch.rawFullBoardStates,1);
 assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,10000);assert.equal(r.upperConstruction.tailSearch.guardAllowance.unregisteredTerminalWorldAllowance,1);
 assert.equal(r.upperConstruction.tailSearches,1);assert.equal(r.U,null);assert.equal(r.lowerBound,null);assert.equal(r.accepted,false);await sealed(f,r);
 // Same original physics cannot use a different solver after that failure.
 const plain=makePrefixTailV4Plan(runtime,f.candidate,{...defaults,upperBudget:{...defaults.upperBudget,maxStates:10000}});
 await assert.rejects(()=>explorePrefixTailV4(runtime,f.candidate,{plan:plain,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory}),/INPUT_ALREADY_ATTEMPTED/);
 const nativeAgain=planFor(f,{upperBudget:{...defaults.upperBudget,maxStates:10000}});
 await assert.rejects(()=>run(f,nativeAgain),/INPUT_ALREADY_ATTEMPTED/);
 evidence.push({test:'shared-10000-and-no-alternate-solver-retry',passed:true,result:r});
});
test('observed native commits stop at the first unregistered world; held-only coordinates are separate',()=>{
 const worlds=new Set(),key=m=>{const {moves,...s}=m.snapshot();return JSON.stringify(s);};
 const track=m=>{const clone=m.clone.bind(m),commit=m.commitAction.bind(m),start=m.startCountdown.bind(m);
  m.clone=()=>track(clone());m.startCountdown=()=>{start();worlds.add(key(m));};
  m.commitAction=()=>{const ok=commit();if(ok)worlds.add(key(m));return ok;};return m;};
 class Observed extends runtime.PuzzleModel{constructor(...args){super(...args);return track(this);}}
 const r=guardedNativeUpper({...runtime,PuzzleModel:Observed},stock,{maxStates:1,maxMilliseconds:5000});
 assert.equal(r.status,'unknown');assert.equal(r.termination,'max-states');assert.equal(r.rawFullBoardStates,1);assert.equal(worlds.size,2);
 assert.equal(r.guardAllowance.conservativeFullBoardStateUpperBound,2);assert(r.microDiscoveredStates>=1);assert.equal(r.rawExploredStates,1);
 evidence.push({test:'first-terminal-world-observer',passed:true,registered:r.rawFullBoardStates,observed:worlds.size,result:r,instrumentation:'Private model-method observer; frozen source unchanged'});
});
test('a continuous held turn is one parking and its actual complete U cannot certify a larger floor',async()=>{
 const f=await fixture('held-turn',{level:bent,prefixDrags:bentPrefix}),plan=planFor(f,{floor:2}),r=await run(f,plan);
 assert.equal(r.U,1);assert.equal(r.upperConstruction.tailSearches,1);assert.equal(r.route.canonicalReplay.effectiveDrags,7);
 assert.equal(r.route.canonicalReplay.nonClearingDrags,1);assert.equal(r.route.independentReplay.nonClearingDrags,1);assert.equal(r.route.independentReplay.clearEvents,6);
 assert.deepEqual(r.drags.slice(0,3),bentPrefix);assert.equal(r.status,'KNOWN_UPPER_BELOW_PREDECLARED_FLOOR');assert.equal(r.L,null);assert.equal(r.lowerBound,null);await sealed(f,r);
 evidence.push({test:'held-turn-and-below-floor-no-L',passed:true,result:r});
});
test('pointer-down exit, false exit and non-unit prefix errors are terminal before tail search',async()=>{
 const cases=[{prefixDrags:[{blockId:'r',path:[[0,1]]}],level:stock},
  {prefixDrags:[...bentPrefix.slice(0,2),{...bentPrefix[2],exitSide:'right'}],level:bent},
  {prefixDrags:[...prefix,{blockId:'b',path:[[-1,0]]}],level:stock}];
 const results=[];for(const [i,options]of cases.entries()){
  const f=await fixture(`bad-prefix-${i}`,options),r=await run(f);
  assert.equal(r.accepted,false);assert.equal(r.U,null);assert.equal(r.upperConstruction.tailSearches,0);assert.equal(r.lowerBound,null);assert.match(r.upperConstruction.reason,/prefix-replay/);await sealed(f,r);results.push(r);
 }
 evidence.push({test:'invalid-first-contact-prefix',passed:true,results});
});
test('fixed native domain, production floor, construction bytes and budgets reject before claim',async()=>{
 const f=await fixture('preflight');
 assert.throws(()=>makeNativePrefixTailV4Plan(runtime,f.candidate,{floor:16}),/L31/);
 for(const field of ['frozen','movementAxis','lockedBy','shutterId','timedBombSeconds']){
  const c=structuredClone(f.candidate);c.level.blocks[0][field]=1;assert.throws(()=>makeNativePrefixTailV4Plan(runtime,c,defaults));}
 for(const field of ['generators','elevators','conveyors','flipDoors','shutters']){
  const c=structuredClone(f.candidate);c.level[field]=[{id:'unsupported'}];assert.throws(()=>makeNativePrefixTailV4Plan(runtime,c,defaults));}
 const irregular=structuredClone(f.candidate);irregular.level.blocks[0].shape=[[0,0],[1,0],[0,1]];
 assert.throws(()=>makeNativePrefixTailV4Plan(runtime,irregular,defaults),/rectangles/);
 for(const value of [0,NaN,Infinity,10001])assert.throws(()=>planFor(f,{upperBudget:{maxStates:value}}));
 assert.throws(()=>planFor(f,{lowerBudget:{maxStates:10000}}),/9999/);
 const bad=planFor(f);bad.innerPlan.tailStrategy='plain-joint';await assert.rejects(()=>run(f,bad),/plan changed/);
 const plan=planFor(f);await fs.appendFile(f.candidate.constructionEvidence.path,' ');await assert.rejects(()=>run(f,plan),/construction bytes changed/);
 assert.equal(await fs.stat(f.ledgerDirectory).then(()=>true).catch(()=>false),false);
 evidence.push({test:'domain-plan-budget-evidence-preflight',passed:true});
});
test('qualification namespace resolves junction and nonexistent descendant before any public writes',async()=>{
 const f=await fixture('namespace'),plan=planFor(f),alias=path.resolve(f.dir,'public-alias');await fs.symlink(path.resolve(PUBLIC_ATTEMPT_LEDGER),alias,'junction');
 for(const ledgerDirectory of [PUBLIC_ATTEMPT_LEDGER,CONSTRUCTION_LEDGER,alias,path.join(alias,'not-created')])
  await assert.rejects(()=>exploreNativePrefixTailV4(runtime,f.candidate,{plan,qualificationOnly:true,ledgerDirectory}),/private ledgers/);
 await assert.rejects(()=>exploreNativePrefixTailV4(runtime,f.candidate,{plan,qualificationOnly:false,ledgerDirectory:f.ledgerDirectory}),/shared public/);
 await assert.rejects(()=>exploreNativePrefixTailV4(runtime,f.candidate,{plan,qualificationOnly:1,ledgerDirectory:f.ledgerDirectory}));
 assert.equal(await fs.stat(path.join(alias,'not-created')).then(()=>true).catch(()=>false),false);
 evidence.push({test:'physical-namespace-alias-negative',passed:true});
});
test.after(async()=>{
 const publicAfter=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort();assert.deepEqual(publicAfter,publicBefore);
 const entries=['tools/daily-challenge/formal-v4/prefix-tail-native-v4.mjs','tools/daily-challenge/formal-v4/prefix-tail-native-v4.test.mjs'];
 const compiled=await build({entryPoints:entries,bundle:true,write:false,outdir:'unused-output',metafile:true,format:'esm',platform:'node',packages:'external',logLevel:'silent'});
 const toolBindings={...runtime.toolchainBindings,[runtime.policyRuntimeBinding.path]:runtime.policyRuntimeBinding.sha256};
 for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),h=sha(await fs.readFile(p));if(toolBindings[p])assert.equal(toolBindings[p],h);toolBindings[p]=h;}
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===7?'NATIVE_PREFIX_TAIL_V4_PRIVATE_QUALIFICATION_PASS':'INCOMPLETE',evidence,toolBindings,
  proofToolchainSha256:runtime.toolchainSha256,publicRequestCountBefore:publicBefore.length,publicRequestCountAfter:publicAfter.length,
  publicLedgerClaims:0,realCandidateSearches:0,realCandidateConstructions:0,qualificationOnly:true,currentRuntimeValidationClaimed:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});

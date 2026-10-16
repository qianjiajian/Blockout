import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {reservedGuardBudget} from '../formal-v3/reserved-guard-budget.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Dependency-boundary tests of the NEW adapter only. Engine and replay control
// responses below are explicit synthetic test doubles, never proof evidence.
// The original attempt ledger and reserved-state budget run unmodified against
// private temp directories. No historical candidate, public ledger or save is used.
const dir='tools/daily-challenge/formal-v4';
const version='1.198.0';
const bands={1:{lower:13,upper:23},2:{lower:18,upper:33},3:{lower:28,upper:null}};
const policy={version,bands,bindings:{},accepts:(d,L,U)=>Number.isSafeInteger(L)&&Number.isSafeInteger(U)&&L>=bands[d].lower&&U>=L&&(bands[d].upper===null||U<=bands[d].upper)};
const synthetic=()=>({id:991997,name:'PRIVATE ADAPTER CONTROL',width:2,height:2,timeSeconds:120,blocks:[{id:'private-red',color:'red',x:0,y:0,shape:[[0,0]]}],gates:[{id:'red',color:'red',side:'top',offset:0,size:1}]});
const sha=x=>createHash('sha256').update(x).digest('hex');
const normalize=p=>p.replaceAll('\\','/');
async function adapter(entry,dependencies){
 const token='__dailyPolicyTest_'+randomUUID().replaceAll('-','');globalThis[token]=dependencies;
 try{
  const compiled=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',packages:'external',logLevel:'silent',plugins:[{name:'explicit-private-control-boundaries',setup(b){
   b.onResolve({filter:/.*/},args=>{if(!args.importer)return;const absolute=normalize(path.resolve(path.dirname(args.importer),args.path));if(dependencies[absolute])return{path:absolute,namespace:'private-control'};});
   b.onLoad({filter:/.*/,namespace:'private-control'},args=>({contents:Object.keys(dependencies[args.path]).map(name=>`export const ${name}=globalThis[${JSON.stringify(token)}][${JSON.stringify(args.path)}][${JSON.stringify(name)}];`).join('\n'),loader:'js'}));
  }}]});
  return await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 }finally{delete globalThis[token];}
}
const dep=(p,exports)=>[normalize(path.resolve(p)),exports];
async function lowerHarness({strategy='plain',plain=true,projectionFailures=[],resultStatus='unknown'}={}){
 const calls=[],projectionCalls=[];
 const project=name=>(level)=>{projectionCalls.push(name);if(projectionFailures.includes(name))throw Error('Synthetic projection rejection');const projectedLevel={...structuredClone(level),testProjection:name};return{method:name,sourceLevelSha256:levelSha256(level),projectedLevel,projectedLevelSha256:levelSha256(projectedLevel)};};
 const guard=name=>(level,runtime,options)=>{calls.push({name,level:structuredClone(level),options});return{status:resultStatus,thresholdProven:resultStatus==='threshold-proven',floor:options.floor,budget:options,rawFullBoardStates:1};};
 const dependencies=Object.fromEntries([
  dep('tools/daily-challenge/formal-v2/contract.mjs',{levelSha256}),
  dep('tools/daily-challenge/formal-v2/proof-plain.mjs',{assertPlainProofDomain:l=>{if(!plain&&!l.testProjection)throw Error('Synthetic nonplain');}}),
  dep('tools/daily-challenge/formal-v2/constraint-projection.mjs',{projectStaticConstraints:project('static')}),
  dep('tools/daily-challenge/formal-v2/inventory-projection.mjs',{projectOpeningOuterBodies:project('opening')}),
  dep('tools/daily-challenge/formal-v2/shutter-materialization-projection.mjs',{projectFullPhysicalShutters:project('shutter')}),
  dep('tools/daily-challenge/formal-v3/ice-preserving-projection.mjs',{projectIcePreservingConstraints:project('ice-preserving'),ICE_PRESERVING_LOWER_METHOD:'ice-preserving-control'}),
  dep('tools/daily-challenge/formal-v3/bounded-proof.mjs',{selectBoundedStrategy:()=>({lower:strategy})}),
  dep('tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',{reservedGuardBudget,guardedPlainTask:guard('plain'),guardedIceTask:guard('ice')}),
 ]);
 const api=await adapter(dir+'/bounded-lower-v198.mjs',dependencies);
 return{run:api.boundedLowerTaskV198,runtime:{validateLevel(){}},calls,projectionCalls};
}
test('all three configured floors reach the real guard boundary, with the raw-state reserve',async()=>{
 const h=await lowerHarness();for(const d of [1,2,3]){const original=synthetic(),before=levelSha256(original),r=h.run(h.runtime,original,d,policy);assert.equal(r.requiredFloor,bands[d].lower);assert.equal(r.result.floor,bands[d].lower);assert.equal(h.calls.at(-1).options.floor,bands[d].lower);assert.equal(h.calls.at(-1).options.maxStates,9999);assert.equal(levelSha256(original),before);}
 assert.throws(()=>h.run(h.runtime,synthetic(),1,policy,{maxStates:10000}),/9999/);
 assert.throws(()=>h.run(h.runtime,synthetic(),1,policy,{floor:1}),/Invalid bounded budget/);
 assert.throws(()=>h.run(h.runtime,synthetic(),1,{...policy,version:'old'}),/Reviewed daily/);
 assert.equal(h.calls.length,3,'Rejected options never reach a primitive');
});
test('native ice remains ice, and preserving projection retains ice before the configured floor',async()=>{
 for(const strategy of ['ice-native','ice-preserving']){const h=await lowerHarness({strategy,plain:false}),level=synthetic();level.blocks[0].frozen=7;const r=h.run(h.runtime,level,3,policy,{maxStates:7});assert.equal(h.calls[0].name,'ice');assert.equal(h.calls[0].options.floor,28);assert.equal(h.calls[0].options.maxStates,7);assert.equal(h.calls[0].level.blocks[0].frozen,7);assert.equal(r.result.status,'unknown');assert.equal(r.result.thresholdProven,false);assert.equal(h.calls.length,1,'UNKNOWN is not retried with a weaker domain');if(strategy==='ice-preserving'){assert.equal(r.projectedLevelSha256,levelSha256(h.calls[0].level));assert.deepEqual(h.projectionCalls,['ice-preserving']);}else assert.equal(r.projection,null);}
});
test('plain projection order is retained; unsupported projects never invoke a solver',async()=>{
 const h=await lowerHarness({strategy:'projected-plain',plain:false,projectionFailures:['static','shutter']});const r=h.run(h.runtime,synthetic(),2,policy);assert.deepEqual(h.projectionCalls,['static','shutter','opening']);assert.equal(r.method,'v3-opening');assert.equal(h.calls[0].name,'plain');assert.equal(h.calls[0].options.floor,18);
 const rejected=await lowerHarness({strategy:'projected-plain',plain:false,projectionFailures:['static','shutter','opening']});const bad=rejected.run(rejected.runtime,synthetic(),1,policy);assert.equal(bad.result.status,'unsupported');assert.equal(bad.result.thresholdProven,false);assert.equal(rejected.calls.length,0);
});

async function qualifyHarness({U=13,route='provided',proofStatus='threshold-proven',proofFloor=13,complete=true,unknownUpper=false,rawStates=1}={}){
 const calls=[],level=synthetic(),drags=Array.from({length:U+1},()=>({blockId:'private-red',path:[[0,1]]}));
 const replay=()=>({valid:true,complete,failed:false,nonClearingDrags:U,effectiveDrags:drags.length,clearEvents:1,remainingBodies:complete?0:1,remainingQueued:0});
 const proof=()=>({status:proofStatus,thresholdProven:proofStatus==='threshold-proven',floor:proofFloor,termination:proofStatus==='threshold-proven'?'below-threshold-exhausted':'max-raw-board-states',rawFullBoardStates:rawStates,guardAllowance:{conservativeFullBoardStateUpperBound:rawStates+1},drags});
 const guard=(input,runtime,options)=>{calls.push({kind:'joint',options});return unknownUpper?{status:'unknown',drags:null,guardAllowance:{conservativeFullBoardStateUpperBound:2}}:proof();};
 const runtime={toolchainBindings:{},replayRevisedRoute:replay};
 const dependencies=Object.fromEntries([
  dep('tools/daily-challenge/formal-v2/contract.mjs',{levelSha256,routeSha256,independentReplay:replay}),
  dep('tools/daily-challenge/formal-v2/proof-scheduled-route.mjs',{replayScheduledRoute:replay}),
  dep('tools/daily-challenge/formal-v3/bounded-proof.mjs',{createAttemptLedger,selectBoundedStrategy:()=>({route,lower:'plain'})}),
  dep('tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',{reservedGuardBudget,guardAllowanceFor:r=>r.guardAllowance,guardedPlainTask:guard,guardedIceTask:guard,guardedNativeUpper:(rt,l,options)=>{calls.push({kind:'native',options});return{status:'unknown',witnessFound:false};}}),
  dep(dir+'/runtime.mjs',{assertV4Runtime(){}}),dep(dir+'/difficulty-policy-v198.mjs',{loadDailyDifficultyPolicyV198:async()=>policy}),
  dep(dir+'/bounded-lower-v198.mjs',{boundedLowerTaskV198:(rt,l,d,p,options)=>{calls.push({kind:'lower',difficulty:d,floor:p.bands[d].lower,options});return{result:proof()};}}),
  dep(dir+'/static-contract.mjs',{auditV4StaticCandidate:async()=>({passed:true,support:{supported:true},policyBindings:{},sourceLevelSha256:levelSha256(level)})}),
  dep(dir+'/accepted-base-adaptation.mjs',{prepareAcceptedMechanismClaim:async()=>{throw Error('Not in private qualification scope');},validateFailedMechanismParent:async()=>{throw Error('Not in private qualification scope');}}),
 ]);
 const api=await adapter(dir+'/bounded-qualify-v198.mjs',dependencies),ledgerDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-policy-private-'));
 return{run:api.qualifyBoundedCandidateV198,runtime,calls,level,drags,ledgerDirectory,options:{ledgerDirectory,qualificationOnly:true},candidate:{formalId:'private-control',stageKey:'private',difficulty:1,sourceLevelId:level.id,level,...(route==='provided'?{drags}:{})}};
}
test('UNKNOWN, wrong floor, over-budget proof and incomplete route cannot be accepted',async()=>{
 for(const control of [{proofStatus:'unknown'},{proofFloor:16},{rawStates:10000},{complete:false}]){const h=await qualifyHarness(control),r=await h.run(h.runtime,h.candidate,h.options);assert.equal(r.accepted,false,JSON.stringify(r));assert.equal(r.catalogEligible,false);assert(['UNKNOWN_LOWER','REJECTED_ORIGINAL_ROUTE'].includes(r.status),JSON.stringify(r));}
});
test('tolerance uses both complete U and proved L, including finite D3 without a numeric ceiling',async()=>{
 for(const [difficulty,U,accepted]of [[1,13,true],[1,23,true],[1,24,false],[2,18,true],[2,33,true],[2,34,false],[3,28,true],[3,80,true]]){const h=await qualifyHarness({U,proofFloor:bands[difficulty].lower}),r=await h.run(h.runtime,{...h.candidate,difficulty},h.options);assert.equal(r.accepted,accepted,JSON.stringify(r));assert.equal(r.catalogEligible,false,'Private synthetic controls never become catalogue evidence');if(accepted){assert.equal(r.L,bands[difficulty].lower);assert.equal(r.U,U);}else assert.equal(r.status,'UNKNOWN_UPPER_WITHIN_BAND');}
});
test('joint lower and upper use the same configured band and minimum reserved budgets',async()=>{
 for(const [difficulty,route]of [[1,'plain-joint'],[2,'ice-joint'],[3,'plain-joint']]){const h=await qualifyHarness({U:bands[difficulty].lower,proofFloor:bands[difficulty].lower,route}),r=await h.run(h.runtime,{...h.candidate,difficulty},{...h.options,routeBudget:{maxStates:20},lowerBudget:{maxStates:10},searchUpper:99});assert(r.accepted,JSON.stringify(r));assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.floor,bands[difficulty].lower);assert.equal(h.calls[0].options.searchUpper,bands[difficulty].upper??99);assert.equal(h.calls[0].options.maxStates,10);}
 const h=await qualifyHarness({route:'ice-joint',unknownUpper:true}),r=await h.run(h.runtime,h.candidate,h.options);assert.equal(r.status,'UNKNOWN_UPPER');assert.equal(r.accepted,false);assert.equal(h.calls.length,1);
});
test('failed physical input is blocked by the original ledger before renamed or re-banded retry',async()=>{
 const h=await qualifyHarness({proofStatus:'unknown'}),first=await h.run(h.runtime,h.candidate,h.options);assert.equal(first.status,'UNKNOWN_LOWER');assert.equal(h.calls.length,1);
 const renamed={...h.candidate,difficulty:3,formalId:'different-slot',level:{...h.level,id:9999,name:'metadata cannot erase attempt'}};
 const second=await h.run(h.runtime,renamed,h.options);assert.equal(second.status,'INVALID_ATTEMPT');assert(second.reasons.some(x=>x.includes('INPUT_ALREADY_ATTEMPTED')),JSON.stringify(second));assert.equal(h.calls.length,1);assert.equal(second.lowerBound,undefined);
 await assert.rejects(()=>h.run(h.runtime,h.candidate,{ledgerDirectory:h.ledgerDirectory}),/historical public/);
 const files=await fs.readdir(h.ledgerDirectory);assert.equal(files.filter(x=>x.endsWith('.request.json')).length,1);assert.equal(files.filter(x=>x.endsWith('.result.json')).length,1);assert(files.some(x=>x.endsWith('.blocked.json')));
});
test('adapter review never edits frozen engines',async()=>{
 const expected={'bounded-proof.mjs':'ebf6522ed5a6c8b3c5bc4e217a8026f68f05894cc07ebc54f190efc941360054','bounded-ice-proof.mjs':'3d6bd7894b185ee69715b4c677986a564864d2c8b590fcc96b4526ff153a80ab','ice-preserving-projection.mjs':'90897f75a65ed7f9c02501f1b2d1a2a3e846d5d94458861174a692c115b4217d'};
 for(const[file,want]of Object.entries(expected))assert.equal(sha(await fs.readFile('tools/daily-challenge/formal-v3/'+file)),want);
});
test('actual frozen guard engines receive tolerance floors on new private tiny boards',async()=>{
 const frozen=path.resolve('deliverables/daily-formal-v4-20261008/frozen-workspace-4588');
 // A fresh process is required: an esbuild service started in another cwd emits
 // differently rooted metadata keys even when source bytes are identical.
 const script=`import assert from 'node:assert/strict';
 const {loadV4Runtime}=await import('./tools/daily-challenge/formal-v4/runtime.mjs');
 const {levelSha256}=await import('./tools/daily-challenge/formal-v2/contract.mjs');
 const {boundedLowerTaskV198}=await import(${JSON.stringify(pathToFileURL(path.resolve(dir+'/bounded-lower-v198.mjs')).href)});
 const runtime=await loadV4Runtime(),policy=${JSON.stringify({version,bands})},bands=policy.bands;
 const base={id:991998,name:'NEW PRIVATE TINY FLOOR CHECK',difficulty:'hard',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
  blocks:[{id:'private-r',color:'red',x:0,y:0,shape:[[0,0]]},{id:'private-b',color:'blue',x:1,y:0,shape:[[0,0]]}],
  gates:[{id:'private-ro',color:'red',side:'top',offset:0,size:1},{id:'private-bo',color:'blue',side:'top',offset:1,size:1}]};
 for(const [kind,d]of [['plain',1],['ice-native',2],['ice-preserving',3]]){
  const level=structuredClone(base);if(kind!=='plain')level.blocks[1].frozen=1;if(kind==='ice-preserving')level.blocks[0].movementAxis='horizontal';
  const before=levelSha256(level),r=boundedLowerTaskV198(runtime,level,d,policy,{maxStates:20,maxMilliseconds:1000});
  assert.equal(r.result.floor,bands[d].lower);assert.equal(r.requiredFloor,bands[d].lower);assert.equal(r.result.thresholdProven,false,'Easy fixture is a counterexample, never a qualifying level');assert.equal(r.result.status,'relaxed-shortcut');assert.equal(r.result.cost,0);assert.equal(r.result.rawFullBoardStates,3);assert.equal(r.result.guardAllowance.conservativeFullBoardStateUpperBound,4);assert.equal(levelSha256(level),before);
  const stopped=boundedLowerTaskV198(runtime,level,d,policy,{maxStates:1,maxMilliseconds:1000});assert.equal(stopped.result.status,'unknown');assert.equal(stopped.result.thresholdProven,false);assert.equal(stopped.result.rawFullBoardStates,1);assert.equal(stopped.result.guardAllowance.conservativeFullBoardStateUpperBound,2);
  if(kind==='ice-native')assert.equal(r.method,'v3-native-static-ice');if(kind==='ice-preserving'){assert(r.projection);assert.equal(r.projection.projectedLevel.blocks[1].frozen,1);assert.equal(r.projectedLevelSha256,levelSha256(r.projection.projectedLevel));}
 }
 console.log(JSON.stringify({cases:3,toolchain:runtime.toolchainSha256,publicLedgerWrites:0,realCandidateSearches:0}));`;
 const {stdout}=await promisify(execFile)(process.execPath,['--input-type=module','-e',script],{cwd:frozen,maxBuffer:1024*1024});
 assert.deepEqual(JSON.parse(stdout.trim()),{cases:3,toolchain:'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804',publicLedgerWrites:0,realCandidateSearches:0});
});

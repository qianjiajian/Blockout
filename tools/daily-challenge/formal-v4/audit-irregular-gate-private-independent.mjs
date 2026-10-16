import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {colourIrregularLatePrefix,irregularExitGeometry} from './late-prefix-irregular-gate-aware.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

const out=process.argv[2];assert(out,'Fresh private output directory');await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),hash=b=>createHash('sha256').update(b).digest('hex');
const before=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const level={id:999889,name:'Independent private irregular full inventory',difficulty:'hard',reward:0,timeSeconds:120,
 mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
 blocks:[{id:'l',color:'red',x:0,y:0,shape:[[0,0],[0,1],[1,1]]},{id:'s',color:'blue',x:1,y:0,shape:[[0,0]]}],
 gates:[{id:'red',color:'red',side:'right',offset:0,size:2},{id:'blue',color:'blue',side:'top',offset:1,size:1}]};
const drags=[{blockId:'s',path:[],exitSide:'top'},{blockId:'l',path:[],exitSide:'right'}];
const options={scope:'private-fixture',paletteSize:2,fixedBodyColours:{l:'red',s:'blue'},
 mappedPrefix:{ok:true,drags,preservedGates:structuredClone(level.gates),openingColours:{l:'red',s:'blue'}}};
const errors=[],evidence=[];
const check=(name,fn)=>{try{evidence.push({name,passed:true,...fn()});}catch(error){errors.push({name,reason:error.message});evidence.push({name,passed:false,error:error.message});}};

check('independent-authoritative-portal-domain-is-only-necessary',()=>{
 const rows=[];for(const side of ['top','right','bottom','left'])for(let size=1;size<=2;size++)for(let offset=0;offset+size<=2;offset++){
  const gate={id:'red',color:'red',side,offset,size};
  for(const occupied of [true,false]){
   const q={...structuredClone(level),blocks:structuredClone(occupied?level.blocks:[level.blocks[0]]),gates:[gate]};
   const model=new rt.PuzzleModel(q);model.startCountdown();model.beginAction();
   const geometry=irregularExitGeometry(rt,q,q.blocks[0],gate),actual=model.tryExit('l',side);
   if(actual.ok)assert(geometry,'A legal authoritative exit was excluded by geometric necessary domain');
   rows.push({side,size,offset,occupied,geometry,actualExit:actual.ok});
  }
 }
 assert(rows.some(x=>x.geometry&&!x.actualExit));assert(rows.some(x=>x.actualExit));
 return{rows,privateFixedWorlds:rows.length,boardBranchSearches:0};
});
check('full-stock-route-and-prefix-reservations-remain-distinct-from-U-L',()=>{
 const result=colourIrregularLatePrefix(level,rt,{...options,priorCompleteWorldReservations:1});
 assert(result.ok,result.reason);assert(result.prefix.canonical.complete&&result.prefix.independent.complete);
 assert.equal(result.prefix.independent.remainingBodies,0);assert.equal(result.accounting.completeAssignments,1);
 assert.equal(result.accounting.prefixWorldReservations,14);assert.equal(result.accounting.completeWorldReservations,16);
 assert.equal(result.U,null);assert.equal(result.L,null);assert.equal(result.productionExecutable,false);
 return{result};
});
check('fully-forced-invalid-overlap-is-charged-and-capped-before-prefix',()=>{
 const overlap=structuredClone(options);overlap.mappedPrefix.preservedGates[1]={id:'blue',color:'blue',side:'right',offset:0,size:1};
 const result=colourIrregularLatePrefix(level,rt,{...overlap,priorCompleteWorldReservations:9999});
 assert.equal(result.ok,false);assert.equal(result.accounting.completeAssignments,1);assert.equal(result.accounting.completeWorldReservations,10000);
 assert.match(result.reason,/overlap/);assert.equal(result.accounting.prefixWorldReservations,0);
 const maxed=colourIrregularLatePrefix(level,rt,{...options,priorCompleteWorldReservations:10000});
 assert.equal(maxed.ok,false);assert.equal(maxed.accounting.completeAssignments,0);assert.equal(maxed.accounting.completeWorldReservations,10000);
 return{result,maxed};
});
// This test advances only the private engineering clock after an actual
// canonical replay. No game clock, model rule, file or public identity changes.
let lateObservation;
check('witness-returning-at-or-after-wall-ceiling-must-not-be-ok',()=>{
 const original=Date.now;let now=0;
 try{
  Date.now=()=>now;
  const instrumented={...rt,replayRevisedRoute:(...args)=>{const actual=rt.replayRevisedRoute(...args);now=31;return actual;}};
  lateObservation=colourIrregularLatePrefix(level,instrumented,{...options,maxMilliseconds:30});
  assert.equal(lateObservation.ok,false,'Actual prefix replay returned after wall limit but helper accepted');
  assert.match(lateObservation.reason,/deadline/);
  return{result:lateObservation};
 }finally{Date.now=original;}
});
check('private-scope-and-real-domain-are-closed',()=>{
 const denied=colourIrregularLatePrefix(level,rt,{...options,scope:'production'});assert.equal(denied.ok,false);
 const modified=structuredClone(level);modified.blocks[0].timedBombSeconds=3;
 const timed=colourIrregularLatePrefix(modified,rt,options);assert.equal(timed.ok,false);
 return{denied,timed};
});

const after=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();assert.deepEqual(after,before);
const self='tools/daily-challenge/formal-v4/audit-irregular-gate-private-independent.mjs';
const meta=await build({entryPoints:[self],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
const fileBindings={...rt.toolchainBindings};for(const file of Object.keys(meta.metafile.inputs)){const p=file.replaceAll('\\','/'),h=hash(await fs.readFile(p));if(fileBindings[p])assert.equal(fileBindings[p],h);fileBindings[p]=h;}
const report={status:errors.length?'INDEPENDENT_PRIVATE_IRREGULAR_GATE_AWARE_BLOCKED':'INDEPENDENT_PRIVATE_IRREGULAR_GATE_AWARE_PASS',
 evidence,lateObservation,errors,fileBindings,frozenMathSha256:rt.toolchainSha256,
 publicRequestsBefore:before.length,publicRequestsAfter:after.length,publicClaimsStarted:0,newGameplaySearches:0,newRealCandidateConstructions:0,
 privateFixtureOnly:true,productionExecutable:false,formalReady:false};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,passed:evidence.filter(e=>e.passed).length,failed:errors.length,errors,
 report:{path:path.join(out,'report.json').replaceAll('\\','/'),sha256:hash(await fs.readFile(path.join(out,'report.json')))}}));
if(errors.length)process.exitCode=1;

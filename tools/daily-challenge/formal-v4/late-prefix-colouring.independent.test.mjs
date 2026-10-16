import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {colourLatePrefix} from './late-prefix-colouring.mjs';

const runtime=await loadV4Runtime(),evidence=[];
const out=process.env.LATE_COLOUR_INDEPENDENT_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/late-colour-independent-');
await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const level={id:999895,name:'Isolated forced colour accounting',width:2,height:2,timeSeconds:100,reward:0,difficulty:'hard',
 mechanismRules:'revised-2026-09-27-v1.5',blocks:['red','blue','green','yellow'].map((color,i)=>({id:`b${i}`,color,x:i%2,y:Math.floor(i/2),shape:[[0,0]]})),
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'}]};
const options={seed:1,paletteSize:4,mappedPrefix:{ok:true,preservedGates:level.gates,
 openingColours:Object.fromEntries(level.blocks.map(b=>[b.id,'red'])),parkingPoses:{}}};

test('independent: a fully forced but adjacency-invalid colour world is charged before rejection',()=>{
 const before=JSON.stringify(level),r=colourLatePrefix(level,runtime,options);
 assert.equal(r.ok,false);assert.equal(r.reason,'forced-opening-colours-adjacent');
 assert.equal(r.accounting.completeWorldReservations,1,'The full forced red world exists before adjacency rejection');
 assert.equal(r.accounting.cspTransitions,0);assert(r.accounting.microTransitions>0);
 assert.equal(r.accounting.transitions,r.accounting.microTransitions+r.accounting.cspTransitions);
 assert.equal(JSON.stringify(level),before);
 evidence.push({test:'rejected-complete-forced-assignment-is-counted',passed:true,report:r});
});

test('independent: finite held-coordinate transition guard stops and retains its consumed budget',()=>{
 const r=colourLatePrefix(level,runtime,{...options,maxMicroTransitions:1});
 assert.equal(r.ok,false);assert.equal(r.reason,'colour-static-micro-transitions');
 assert.equal(r.accounting.microTransitions,1);assert.equal(r.accounting.transitions,1);
 assert.equal(r.accounting.completeWorldReservations,0);assert.equal(r.accounting.gameBoardBranchSearches,0);
 for(const maxMicroTransitions of [0,NaN,Infinity,400001])assert.throws(()=>colourLatePrefix(level,runtime,{...options,maxMicroTransitions}));
 evidence.push({test:'micro-transition-boundary-with-no-reset',passed:true,report:r});
});

test.after(async()=>{
 const files=['tools/daily-challenge/formal-v4/late-prefix-colouring.mjs','tools/daily-challenge/formal-v4/late-prefix-colouring.independent.test.mjs'];
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===2?'INDEPENDENT_COLOUR_ACCOUNTING_COMPLETE':'INCOMPLETE',evidence,
  executionWorkspace:path.resolve('.'),toolBindings:Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await fs.readFile(f))]))),
  mathematicalToolchainSha256:runtime.toolchainSha256,qualificationOnly:true,realCandidateCalls:0,publicLedgerWrites:0,
  gameplaySearches:0,formalReady:false},null,2)+'\n',{flag:'wx'});
});

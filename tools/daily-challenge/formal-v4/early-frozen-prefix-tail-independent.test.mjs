import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {auditThawedPrefixBridge,makeEarlyFrozenPrefixTailPlan,exploreEarlyFrozenPrefixTail} from './early-frozen-prefix-tail.mjs';
import {independentReplay} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

const out=process.env.EARLY_PREFIX_INDEPENDENT_OUT,author=process.env.EARLY_PREFIX_AUTHOR_REPORT;
assert(out&&author);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),sha=b=>createHash('sha256').update(b).digest('hex'),evidence=[];
const names=async()=>(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort();
const before=await names();

test('true held turn survives the exact thaw bridge, but an earlier exit cannot be passed over',()=>{
 const plain={id:999873,name:'Private held-turn ice bridge',width:3,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
  blocks:[{id:'r',x:0,y:0,shape:[[0,0],[1,0],[0,1],[1,1]],color:'red'},
   {id:'b',x:2,y:0,shape:[[0,0]],color:'blue'},{id:'y',x:2,y:1,shape:[[0,0]],color:'yellow'}],
  gates:[{id:'gr',side:'left',offset:0,size:2,color:'red'},{id:'gb',side:'bottom',offset:0,size:1,color:'blue'},
   {id:'gy',side:'bottom',offset:2,size:1,color:'yellow'}]};
 const iced=structuredClone(plain);iced.blocks[2].frozen=1;rt.validateLevel(iced);
 const declaration={regionBlockIds:['y'],count:1};
 const prefix=[{blockId:'r',path:[],exitSide:'left'},{blockId:'b',path:[[1,0],[1,1]]}];
 const bridge=auditThawedPrefixBridge(rt,iced,plain,prefix,declaration);
 assert(bridge.valid);assert.equal(bridge.trace.length,2);assert.equal(bridge.remainingBodies,2);assert.equal(bridge.cleared,1);
 assert.equal(bridge.icedCutSha256,bridge.plainCutSha256);
 const drags=[...prefix,{blockId:'b',path:[[0,1]],exitSide:'bottom'},{blockId:'y',path:[],exitSide:'bottom'}];
 const canonical=rt.replayRevisedRoute(iced,drags),independent=independentReplay(rt,iced,drags);
 for(const r of [canonical,independent]){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.clearEvents,3);assert.equal(r.nonClearingDrags,1);}
 assert.equal(independent.remainingBodies,0);
 const bad=[prefix[0],{blockId:'b',path:[[1,0],[1,1],[0,1],[1,1]]}];
 assert.throws(()=>auditThawedPrefixBridge(rt,iced,plain,bad,declaration),/first contact occurs before/);
 evidence.push({name:'unit-held-turn-and-early-contact-original-full-witness',passed:true,bridge,canonical,independent,
  mathematicalLowerClaimed:false,gameplaySearches:0});
});

test('entry and frozen upper helper import-time digests reject byte drift before opening a private ledger',async()=>{
 const repeat=JSON.parse(await fs.readFile(author));assert.equal(repeat.status,'EARLY_FROZEN_PREFIX_TAIL_PRIVATE_PASS');
 const accepted=repeat.evidence[0].result;
 const final=JSON.parse(await fs.readFile(accepted.plan.constructionEvidence.path));
 const candidate={sourceLevelId:final.sourceLevelId,level:final.level,prefixDrags:final.prefixDrags,
  iceDeclaration:final.iceDeclaration,constructionAccounting:final.constructionAccounting,
  plainConstructionEvidence:final.plainConstructionEvidence,constructionEvidence:accepted.plan.constructionEvidence};
 const plan=makeEarlyFrozenPrefixTailPlan(rt,candidate,{qualificationOnly:true,floor:1,searchUpper:8,
  upperBudget:accepted.plan.fullUpperBudget,lowerBudget:accepted.plan.lowerBudget});
 const paths=['tools/daily-challenge/formal-v4/early-frozen-prefix-tail.mjs','tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.mjs'];
 const original=fs.readFile,results=[];
 for(const [i,target]of paths.entries()){
  const ledgerDirectory=path.join(out,'drift-'+i),bytes=await original(target);
  try{
   fs.readFile=async function(file,...args){const b=await original.call(this,file,...args);
    return typeof file==='string'&&path.resolve(file)===path.resolve(target)?Buffer.concat([Buffer.from(b),Buffer.from('\n// private read injection only\n')]):b;};
   await assert.rejects(()=>exploreEarlyFrozenPrefixTail(rt,candidate,{plan,qualificationOnly:true,ledgerDirectory}),/Loaded tool bytes differ/);
  }finally{fs.readFile=original;}
  assert.equal(await fs.stat(ledgerDirectory).then(()=>true,()=>false),false);
  assert.equal(sha(await fs.readFile(target)),sha(bytes));results.push({target,sha256:sha(bytes),privateLedgerCreated:false});
 }
 evidence.push({name:'loaded-entry-and-helper-byte-drift-preclaim',passed:true,results,sourceFilesChanged:false});
});

test.after(async()=>{
 const after=await names();assert.deepEqual(after,before);
 const fileBindings={};for(const p of ['tools/daily-challenge/formal-v4/early-frozen-prefix-tail.mjs',
  'tools/daily-challenge/formal-v4/early-frozen-prefix-tail-independent.test.mjs',author])fileBindings[p]=sha(await fs.readFile(p));
 await fs.writeFile(out+'/report.json',JSON.stringify({status:evidence.length===2?'EARLY_PREFIX_TAIL_INDEPENDENT_EXTRA_PASS':'EARLY_PREFIX_TAIL_INDEPENDENT_EXTRA_INCOMPLETE',
  evidence,fileBindings,publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,newRealConstructions:0,newSearches:0,newLedgerClaims:0},null,2)+'\n',{flag:'wx'});
});

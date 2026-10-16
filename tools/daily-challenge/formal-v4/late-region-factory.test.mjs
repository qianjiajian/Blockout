import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {constructLateRegionStock,mappedLatePrefix} from './late-region-factory.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
const runtime=await loadV4Runtime(),executionEnvironment=prefixExecutionEnvironment(runtime),evidence=[];
const out=process.env.LATE_REGION_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/late-region-qualification-');
await fs.mkdir(out,{recursive:true});const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
 const colors=['red','blue','green','yellow','purple','orange'];
 const blocks=Array.from({length:12},(_,i)=>({id:'b'+i,x:i%6,y:i<6?0:3,shape:[[0,0],[0,1],[0,2]],color:colors[(i%6+(i<6?0:3))%6]}));
 const fixed=blocks.filter(b=>b.x<3),changed=blocks.filter(b=>b.x>=3);
 const level={id:999881,name:'Synthetic late region',width:6,height:6,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',blocks,
  gates:fixed.map(b=>({id:'g'+b.id,color:b.color,side:b.y===0?'top':'bottom',offset:b.x,size:1}))};
 return{level,fixedBlocks:fixed,changedBodies:changed,sourceLevelId:level.id,
  prefixDrags:fixed.map(b=>({blockId:b.id,path:[],exitSide:b.y===0?'top':'bottom'})),
  region:{cells:changed.flatMap(b=>b.shape.map(([x,y])=>[b.x+x,b.y+y])),bodyIds:changed.map(b=>b.id),fraction:.5,area:18,originalBodyCount:6,connected:true},
  reference:{path:'synthetic-qualification-only',sha256:'1'.repeat(64)}};
}
test('new native stock changes an exact connected half, retains every external field and actual prefix',()=>{
 const bp=fixture(),before=JSON.stringify(bp),q=constructLateRegionStock(runtime,bp,{seed:6});assert(q.ok,JSON.stringify(q));
 assert.equal(q.constructionAccounting.completeWorldReservations,1+q.paint.accounting.completeWorldReservations);assert.equal(q.constructionAccounting.completeWorldReservations,2);
 assert.notEqual(designFingerprints(q.level).shapeSha256,designFingerprints(bp.level).shapeSha256);
 assert.notEqual(designFingerprints(q.level).colorSha256,designFingerprints(bp.level).colorSha256);
 assert(q.parentSimilarity<=.65);assert.equal(q.inventory.nonNativeOrMissingArtIds.length,0);
 for(const b of bp.fixedBlocks)assert.deepEqual(q.level.blocks.find(x=>x.id===b.id),b);
 let at=structuredClone(q.level);const prefix=[];for(const drag of q.prefixDrags){const check=auditPlainForwardDrag(runtime,at,drag);assert(check.valid,check.error);prefix.push(check);at={...at,blocks:at.blocks.filter(b=>b.id!==drag.blockId)};}
 assert.equal(JSON.stringify(bp),before);assert.equal(q.accepted,false);assert.equal(q.U,null);assert.equal(q.L,null);
 evidence.push({test:'exact-new-region-and-original-fixed-prefix',passed:true,stock:q,prefixReplay:prefix,qualificationOnly:true});
});
test('failed static colour stock keeps placeholder world and all consumed micro/actions, never retries colour',()=>{
 const q=constructLateRegionStock(runtime,fixture(),{seed:7,bodyCountDelta:1});assert.equal(q.ok,false);assert.equal(q.status,'STATIC_COLOUR_REJECTED');
 assert.equal(q.constructionAccounting.completeWorldReservations,1+q.paint.accounting.completeWorldReservations);
 assert.equal(q.stockFingerprints.shapeSha256,designFingerprints(q.placeholderWorld).shapeSha256);
 assert.equal(q.constructionAccounting.transitions,q.partition.transitions+q.paint.accounting.transitions);
 assert(q.constructionAccounting.microStates>0);assert.equal(q.searchPerformed,false);
 evidence.push({test:'failed-construction-complete-accounting',passed:true,result:q});
});
test('previous failed shape is rejected before colour and prefix maps intermediate clears without altering outside bodies',()=>{
 const bp=fixture(),q=constructLateRegionStock(runtime,bp,{seed:6});
 const rejected=constructLateRegionStock(runtime,bp,{seed:6,forbiddenShapeHashes:[q.stockFingerprints.shapeSha256]});
 assert.equal(rejected.status,'STATIC_PREVIOUS_STOCK_SHAPE_REJECTED');assert.equal(rejected.paint,undefined);assert.equal(rejected.constructionAccounting.completeWorldReservations,1);
 const mapped=mappedLatePrefix(bp);assert.equal(mapped.preservedGates.length,6);assert.equal(Object.keys(mapped.openingColours).length,6);
 assert.throws(()=>constructLateRegionStock(runtime,bp,{seed:Infinity}));assert.throws(()=>constructLateRegionStock(runtime,bp,{seed:1,bodyCountDelta:4}));
 evidence.push({test:'prior-stock-terminal-before-csp',passed:true,result:rejected});
});
test.after(async()=>{
 const files=['late-region-factory.mjs','late-prefix-colouring.mjs','late-region-factory.test.mjs','prefix-execution-environment.mjs'];
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===3?'QUALIFICATION_PASS':'INCOMPLETE',evidence,executionEnvironment,
  currentRuntimeValidationClaimed:false,toolBindings:Object.fromEntries(await Promise.all(files.map(async name=>{const file=`tools/daily-challenge/formal-v4/${name}`;return[file,sha(await fs.readFile(file))];}))),
  mathematicalToolchainSha256:runtime.toolchainSha256,qualificationOnly:true,realCandidateCalls:0,publicLedgerWrites:0,gameplaySearches:0,formalReady:false},null,2)+'\n',{flag:'wx'});
});

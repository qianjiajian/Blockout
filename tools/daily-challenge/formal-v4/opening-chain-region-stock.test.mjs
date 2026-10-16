import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {PUBLIC_LEDGER,sha,write} from './low-twenty-io.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {absoluteCells,boardCells,bodyFootprint} from '../formal-v3/diversity-layout-factory.mjs';
import {assertSparseOpeningChain,constructOpeningChainRegionStock,SPARSE_DECLARATION} from './opening-chain-region-stock.mjs';
import {makePrefixTailV4Plan} from './prefix-tail-explore-task.mjs';
import {makeLowBandPrefixTailPlan} from './prefix-tail-low-band-task.mjs';

const out=process.env.OPENING_CHAIN_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),evidence=[];
const SELF='tools/daily-challenge/formal-v4/opening-chain-region-stock.mjs';let stock,privateCalls=0,modelCalls=0;
const noModels={...rt,PuzzleModel:class{constructor(){modelCalls++;throw Error('The stock factory must not instantiate a model');}}};
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
function toy(){
 const level={id:999952,name:'Private anchored second-clear declaration',width:6,height:4,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
  blocks:[{id:'first',x:0,y:0,shape:rect(3,1),color:'purple'},
   {id:'a',x:3,y:0,shape:rect(3,1),color:'red'},{id:'b',x:0,y:1,shape:rect(3,1),color:'green'},
   {id:'c',x:3,y:1,shape:rect(3,1),color:'blue'},{id:'d',x:0,y:2,shape:rect(3,1),color:'yellow'},
   {id:'e',x:3,y:2,shape:rect(3,1),color:'orange'},{id:'f',x:0,y:3,shape:rect(3,1),color:'red'},
   {id:'g',x:3,y:3,shape:rect(3,1),color:'green'}],
  gates:[{id:'purple',color:'purple',side:'left',offset:0,size:1},{id:'blue',color:'blue',side:'top',offset:1,size:1},
   {id:'green',color:'green',side:'top',offset:3,size:2},{id:'red',color:'red',side:'right',offset:1,size:1},
   {id:'yellow',color:'yellow',side:'bottom',offset:0,size:2},{id:'orange',color:'orange',side:'bottom',offset:4,size:2}]};
 const bp={sourceLevelId:level.id,level,reference:{path:'PRIVATE_SYNTHETIC_ONLY',sha256:'0'.repeat(64)},referenceLevelSha256:levelSha256(level),
  fixedBlocks:[level.blocks[0]],changedBodies:level.blocks.slice(1),region:{cells:level.blocks.slice(1).flatMap(absoluteCells)},prefixDrags:[{blockId:'first',path:[],exitSide:'left'}],iceCount:0};
 // The square opens a 2x3 pocket; the remainder is still not specified here.
 const anchorBlocks=[{id:'new-blue-square',x:1,y:1,shape:rect(2,2),color:'blue'}];
 level.gates.find(g=>g.color==='blue').size=2;
  bp.referenceLevelSha256=levelSha256(level);
 return{bp,anchorBlocks,authoredOpeningChain:[{blockId:'new-blue-square',path:[[1,0]],exitSide:'top'}]};
}
const construct=(t,options={})=>{privateCalls++;return constructOpeningChainRegionStock(noModels,t.bp,{...t,seed:1,colourSeed:1,bodyCountDelta:3,shapeProfile:'balanced',qualificationOnly:true,...options});};
function turnToy(){
 const level={id:999953,name:'Private two-anchor turn',width:4,height:4,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
  blocks:[{id:'first',x:0,y:0,shape:rect(1,3),color:'green'},{id:'a',x:1,y:0,shape:rect(3,1),color:'red'},
   {id:'b',x:1,y:1,shape:rect(3,1),color:'yellow'},{id:'c',x:1,y:2,shape:rect(3,1),color:'purple'},
   {id:'d',x:0,y:3,shape:rect(4,1),color:'pink'}],
  gates:[{id:'green',color:'green',side:'top',offset:0,size:2},{id:'blue',color:'blue',side:'bottom',offset:0,size:2},
   {id:'red',color:'red',side:'right',offset:0,size:1},{id:'yellow',color:'yellow',side:'right',offset:1,size:1},
   {id:'purple',color:'purple',side:'left',offset:3,size:1},{id:'pink',color:'pink',side:'right',offset:3,size:1}]};
 return{bp:{sourceLevelId:level.id,level,reference:{path:'PRIVATE_SYNTHETIC_TURN',sha256:'0'.repeat(64)},referenceLevelSha256:levelSha256(level),
  fixedBlocks:[level.blocks[0]],changedBodies:level.blocks.slice(1),region:{cells:level.blocks.slice(1).flatMap(absoluteCells)},prefixDrags:[{blockId:'first',path:[],exitSide:'top'}]},
  anchorBlocks:[{id:'park',x:1,y:0,shape:rect(1,2),color:'blue'},{id:'second',x:2,y:0,shape:rect(1,2),color:'green'}],
  authoredOpeningChain:[{blockId:'park',path:[[0,0],[0,1]]},{blockId:'second',path:[[1,0]],exitSide:'top'}]};
}

test('sparse first-contact chain, exact new anchors and original reference prefix are checked without models',()=>{
 const t=toy(),original=structuredClone(t),q=assertSparseOpeningChain(noModels,t.bp,{...t,qualificationOnly:true});
 assert.equal(q.valid,true);assert.equal(q.clearEvents,2);assert.equal(q.nonClearingDrags,0);assert.equal(q.trace[0].emptyCells.length,7);
 assert.deepEqual(q.prefixDrags,[...t.bp.prefixDrags,...t.authoredOpeningChain]);assert.deepEqual(t,original);
 for(const mutate of [x=>x.authoredOpeningChain[0].path=[[2,1],[2,0]],x=>delete x.authoredOpeningChain[0].exitSide,
  x=>x.authoredOpeningChain[0].path=[[1,0],[2,0]],x=>x.anchorBlocks[0].shape=rect(3,1),x=>x.anchorBlocks[0].color='purple']){
  const bad=toy();mutate(bad);assert.throws(()=>assertSparseOpeningChain(noModels,bad.bp,{...bad,qualificationOnly:true}));}
 assert.throws(()=>assertSparseOpeningChain(noModels,t.bp,{...t,qualificationOnly:false}));assert.equal(modelCalls,0);
 const turn=turnToy(),turned=assertSparseOpeningChain(noModels,turn.bp,{...turn,qualificationOnly:true});
 assert.equal(turned.nonClearingDrags,1);assert.equal(turned.coordinateTransitions,3);assert.equal(turned.trace.at(-1).emptyCells.length,5);
 const premature=turnToy();premature.authoredOpeningChain[1].path.push([0,0]);
 assert.throws(()=>assertSparseOpeningChain(noModels,premature.bp,{...premature,qualificationOnly:true}),/Unexpected early/);
 evidence.push({name:'sparse-chain-and-first-contact-negative-controls',passed:true});
});

test('one private anchored tiling and one CSP preserve physical facts and combine the declared prefix',async()=>{
 const t=toy(),original=structuredClone(t);stock=construct(t);await write(out+'/private-stock.json',stock);
 assert(stock.ok,JSON.stringify({status:stock.status,reason:stock.reason,partition:stock.partition.reason,paint:stock.paint?.reason}));
 assert.deepEqual(t,original);assert.deepEqual(stock.level.gates,t.bp.level.gates);assert.deepEqual(boardCells(stock.level),boardCells(t.bp.level));
 for(const a of [...t.bp.fixedBlocks,...t.anchorBlocks])assert.deepEqual(stock.level.blocks.find(b=>b.id===a.id),a);
 assert.equal(stock.partition.fixedBodies,1);assert.equal(stock.partition.fixedArea,4);
 for(const b of stock.partition.blocks)assert(!new Set(t.bp.changedBodies.map(bodyFootprint)).has(bodyFootprint(b)));
 assert.deepEqual(stock.referencePrefixDrags,t.bp.prefixDrags);assert.deepEqual(stock.authoredOpeningChain,t.authoredOpeningChain);
 assert.deepEqual(stock.prefixDrags,[...t.bp.prefixDrags,...t.authoredOpeningChain]);assert.equal(stock.prefixSha256,routeSha256(stock.prefixDrags));
 assert.equal(stock.constructionAccounting.completeWorldReservations,1+stock.paint.accounting.completeWorldReservations);
 assert.equal(stock.constructionAccounting.transitions,stock.partition.transitions+stock.paint.accounting.transitions+stock.openingChain.coordinateTransitions);
 assert.equal(stock.constructionAccounting.microStates,stock.paint.accounting.microStates);assert.equal(stock.inventory.nonNativeOrMissingArtIds.length,0);
 assert.equal(stock.qualificationOnly,true);assert.equal(stock.newModelCalls,0);assert.equal(modelCalls,0);assert.equal(stock.accepted,false);assert.equal(stock.U,null);assert.equal(stock.L,null);
 evidence.push({name:'private-anchored-colour-stock-and-exact-combined-prefix',passed:true});
});

test('pre-reserved complete assignments and rejected CSP retain their charges',async()=>{
 const capped=construct(toy(),{meterLimits:{maxWorlds:2}});assert(!capped.ok);assert.equal(capped.paint,null);
 assert.equal(capped.constructionAccounting.completeWorldReservations,1);assert.equal(capped.enteredColourCsp,false);
 const t=toy();Object.assign(t.bp.level.gates.find(g=>g.color==='yellow'),{side:'left',offset:0,size:1});
 const rejected=construct(t);assert(!rejected.ok);assert.equal(rejected.paint?.reason,'mapped-initial-portals-overlap');
 assert.equal(rejected.enteredColourCsp,true);assert.equal(rejected.constructionAccounting.completeWorldReservations,1+rejected.paint.accounting.completeWorldReservations);
 assert.equal(rejected.constructionAccounting.transitions,rejected.partition.transitions+rejected.paint.accounting.transitions+rejected.openingChain.coordinateTransitions);
 await write(out+'/private-rejections.json',{capped,rejected});assert.equal(modelCalls,0);
 evidence.push({name:'budget-and-failed-CSP-preserve-shared-accounting',passed:true});
});

test('the unchanged D3 and D2 planners reserve the complete combined prefix and constructor charge',async()=>{
 assert(stock?.ok);const file=out+'/bound-private-construction.json';await write(file,stock);
 const candidate={...stock,constructionEvidence:{path:file,sha256:sha(await fs.readFile(file))}};
 for(const [name,plan] of [['d3',makePrefixTailV4Plan(rt,candidate,{qualificationOnly:true,floor:1})],['d2',makeLowBandPrefixTailPlan(rt,candidate,{qualificationOnly:true,targetDifficulty:2})]]){
  assert.equal(plan.prefixSha256,routeSha256(stock.prefixDrags));assert.equal(plan.fullUpperBudget.maxStates,10000);assert.equal(plan.lowerBudget.maxStates,9999);
  assert.deepEqual(plan.constructionAccounting,stock.constructionAccounting);assert(plan.innerPlan.tailBudget.maxStates<10000-stock.constructionAccounting.completeWorldReservations-stock.prefixDrags.length);
  await write(out+'/'+name+'-plan-only.json',plan);
 }
 assert.equal(modelCalls,0);evidence.push({name:'unchanged-math-planners-debit-whole-authored-prefix-no-search',passed:true});
});

test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const bindings={...rt.toolchainBindings};for(const p of [...Object.keys(compiled.metafile.inputs),'tools/daily-challenge/formal-v4/opening-chain-region-stock.test.mjs'])bindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));
 bindings[SPARSE_DECLARATION.path]=sha(await fs.readFile(SPARSE_DECLARATION.path));assert.equal(bindings[SPARSE_DECLARATION.path],SPARSE_DECLARATION.sha256);
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
 await write(out+'/report.json',{status:evidence.length===4?'OPENING_CHAIN_REGION_STOCK_PRIVATE_PASS':'INCOMPLETE',evidence,fileBindings:bindings,
  privateConstructionCalls:privateCalls,newRealConstructions:0,newSearches:0,newLedgerClaims:0,newModelCalls:modelCalls,oldHelpersModified:false,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,concurrentPublicAdditions:after.filter(x=>!before.includes(x)),qualificationOnly:true,formalReady:false});
});

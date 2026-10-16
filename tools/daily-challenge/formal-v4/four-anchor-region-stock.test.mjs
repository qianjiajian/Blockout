import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {PUBLIC_LEDGER,sha,write} from './low-twenty-io.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {absoluteCells,boardCells,bodyFootprint} from '../formal-v3/diversity-layout-factory.mjs';
import {assertFourAnchorOpeningChain,constructFourAnchorRegionStock,SPARSE_DECLARATION} from './four-anchor-region-stock.mjs';
import {makePrefixTailV4Plan} from './prefix-tail-explore-task.mjs';
import {makeLowBandPrefixTailPlan} from './prefix-tail-low-band-task.mjs';

const out=process.env.FOUR_ANCHOR_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),evidence=[];
const SELF='tools/daily-challenge/formal-v4/four-anchor-region-stock.mjs';let privateCalls=0,modelCalls=0;
const noModels={...rt,PuzzleModel:class{constructor(){modelCalls++;throw Error('No model may run in this factory qualification');}}};
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
function toy(){
 const colours=['red','green','blue','yellow','orange','green','pink','purple'];
 const level={id:999954,name:'Private four-anchor opening',width:6,height:4,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
  blocks:colours.map((color,i)=>({id:i===7?'first':`old-${i}`,x:(i%2)*3,y:Math.floor(i/2),shape:rect(3,1),color})),
  gates:[{id:'purple',color:'purple',side:'right',offset:2,size:2},{id:'blue',color:'blue',side:'bottom',offset:3,size:1},
   {id:'red',color:'red',side:'bottom',offset:1,size:2},{id:'orange',color:'orange',side:'top',offset:2,size:2},
   {id:'cyan',color:'cyan',side:'left',offset:2,size:2},{id:'yellow',color:'yellow',side:'left',offset:0,size:2},
   {id:'green',color:'green',side:'top',offset:4,size:2},{id:'pink',color:'pink',side:'top',offset:0,size:2}]};
 const bp={sourceLevelId:level.id,level,reference:{path:'PRIVATE_SYNTHETIC_FOUR_ANCHORS',sha256:'0'.repeat(64)},referenceLevelSha256:levelSha256(level),
  fixedBlocks:[level.blocks[7]],changedBodies:level.blocks.slice(0,7),region:{cells:level.blocks.slice(0,7).flatMap(absoluteCells)},
  prefixDrags:[{blockId:'first',path:[],exitSide:'right'}],iceCount:0};
 return{bp,anchorBlocks:[{id:'new-blue',x:3,y:1,shape:rect(1,2),color:'blue'},
  {id:'new-orange',x:1,y:3,shape:rect(2,1),color:'orange'},
  {id:'new-red',x:1,y:1,shape:rect(1,2),color:'red'},
  {id:'new-cyan',x:2,y:1,shape:rect(1,2),color:'cyan'}],
  authoredOpeningChain:[{blockId:'new-blue',path:[[3,2]],exitSide:'bottom'},
   {blockId:'new-orange',path:[[2,3],[3,3],[4,3]]},
   {blockId:'new-cyan',path:[[3,1]]},
   {blockId:'new-red',path:[[1,2]],exitSide:'bottom'}]};
}
const construct=(t,options={})=>{privateCalls++;return constructFourAnchorRegionStock(noModels,t.bp,
 {...t,seed:1,colourSeed:1,bodyCountDelta:3,shapeProfile:'balanced',qualificationOnly:true,...options});};

test('four sparse anchors transfer the hole through two parks and finish at a true third clear',()=>{
 const t=toy(),original=structuredClone(t),q=assertFourAnchorOpeningChain(noModels,t.bp,{...t,qualificationOnly:true});
 assert.equal(q.clearEvents,3);assert.equal(q.nonClearingDrags,2);assert.equal(q.coordinateTransitions,6);
 assert.equal(q.prefixDrags.length,5);assert.deepEqual(q.prefixDrags,[...t.bp.prefixDrags,...t.authoredOpeningChain]);
 const empty=new Set(q.trace.at(-1).emptyCells.map(p=>p.join(',')));
 assert.equal(empty.size,7);for(const x of [1,2])for(const y of [1,2,3])assert(empty.has(`${x},${y}`));
 assert.equal(q.remainingRegionCells.length,13);assert.equal(q.fullUValidated,false);assert.equal(q.modelReplayPerformed,false);assert.deepEqual(t,original);
 const negatives=[
  {name:'wrong-real-gate',mutate:x=>x.authoredOpeningChain[0].exitSide='right'},
  {name:'occupied-cell',mutate:x=>x.authoredOpeningChain[2].path=[[1,1]]},
  {name:'red-clears-before-orange-parking',mutate:x=>[x.authoredOpeningChain[0],x.authoredOpeningChain[3]]=[x.authoredOpeningChain[3],x.authoredOpeningChain[0]]},
  {name:'missed-first-automatic-exit',mutate:x=>x.authoredOpeningChain[0].path.push([3,1])},
  {name:'park-at-real-orange-gate',mutate:x=>Object.assign(x.bp.level.gates.find(g=>g.color==='orange'),{side:'right',offset:3,size:1})},
  {name:'missing-fourth-anchor',mutate:x=>x.anchorBlocks.pop()},
  {name:'reference-footprint-reuse',mutate:x=>Object.assign(x.anchorBlocks[0],{x:3,y:1,shape:rect(3,1)})}
 ];
 for(const n of negatives){const bad=toy();n.mutate(bad);assert.throws(()=>assertFourAnchorOpeningChain(noModels,bad.bp,{...bad,qualificationOnly:true}),n.name);}
 assert.throws(()=>assertFourAnchorOpeningChain(noModels,t.bp,{...t,qualificationOnly:false}),/source 10/);
 assert.equal(modelCalls,0);evidence.push({name:'four-anchor-coordinate-positive-and-negative-controls',passed:true,negativeControls:negatives.map(n=>n.name)});
});

test('one private tiling and CSP preserve the complete board and debit the complete combined prefix',async()=>{
 const t=toy(),original=structuredClone(t),stock=construct(t);await write(out+'/private-stock.json',stock);
 assert(stock.ok,JSON.stringify({status:stock.status,reason:stock.reason,partition:stock.partition.reason,paint:stock.paint?.reason}));
 assert.deepEqual(t,original);assert.deepEqual(stock.level.gates,t.bp.level.gates);assert.deepEqual(boardCells(stock.level),boardCells(t.bp.level));
 for(const a of [...t.bp.fixedBlocks,...t.anchorBlocks])assert.deepEqual(stock.level.blocks.find(b=>b.id===a.id),a);
 assert.equal(stock.partition.fixedBodies,4);assert.equal(stock.partition.fixedArea,8);
 const oldFootprints=new Set(t.bp.changedBodies.map(bodyFootprint));for(const b of stock.partition.blocks)assert(!oldFootprints.has(bodyFootprint(b)));
 assert.deepEqual(stock.referencePrefixDrags,t.bp.prefixDrags);assert.deepEqual(stock.authoredOpeningChain,t.authoredOpeningChain);
 assert.equal(stock.prefixSha256,routeSha256([...t.bp.prefixDrags,...t.authoredOpeningChain]));
 assert.equal(stock.constructionAccounting.completeWorldReservations,1+stock.paint.accounting.completeWorldReservations);
 assert.equal(stock.constructionAccounting.transitions,6+stock.partition.transitions+stock.paint.accounting.transitions);
 assert.equal(stock.constructionAccounting.microStates,stock.paint.accounting.microStates);assert.equal(stock.inventory.nonNativeOrMissingArtIds.length,0);
 assert.equal(stock.qualificationOnly,true);assert.equal(stock.accepted,false);assert.equal(stock.U,null);assert.equal(stock.L,null);
 const file=out+'/private-stock.json',candidate={...stock,constructionEvidence:{path:file,sha256:sha(await fs.readFile(file))}};
 for(const [name,plan]of [['d3',makePrefixTailV4Plan(rt,candidate,{qualificationOnly:true,floor:1})],['d2',makeLowBandPrefixTailPlan(rt,candidate,{qualificationOnly:true,targetDifficulty:2})]]){
  assert.equal(plan.prefixSha256,routeSha256(stock.prefixDrags));assert.deepEqual(plan.constructionAccounting,stock.constructionAccounting);
  assert.equal(plan.fullUpperBudget.maxStates,10000);assert.equal(plan.lowerBudget.maxStates,9999);
  assert(plan.innerPlan.tailBudget.maxStates<10000-stock.constructionAccounting.completeWorldReservations-stock.prefixDrags.length);
  await write(out+'/'+name+'-plan-only.json',plan);
 }
 assert.equal(modelCalls,0);evidence.push({name:'one-private-CSP-and-unchanged-planners-full-prefix-reservations',passed:true});
});

test('pre-CSP world caps and rejected CSP preserve sparse-coordinate and partition charges',async()=>{
 const capped=construct(toy(),{meterLimits:{maxWorlds:1}});assert.equal(capped.ok,false);assert.equal(capped.paint,null);
 assert.equal(capped.enteredColourCsp,false);assert.equal(capped.constructionAccounting.completeWorldReservations,1);
 assert.equal(capped.constructionAccounting.transitions,6+capped.partition.transitions);assert.equal(capped.constructionAccounting.microStates,0);
 assert.match(capped.reason,/No colour/);
 const t=toy();Object.assign(t.bp.level.gates.find(g=>g.color==='yellow'),{side:'top',offset:0,size:2});
 const rejected=construct(t);assert.equal(rejected.ok,false);assert.equal(rejected.paint?.reason,'mapped-initial-portals-overlap');
 assert.equal(rejected.enteredColourCsp,true);
 assert.equal(rejected.constructionAccounting.completeWorldReservations,1+rejected.paint.accounting.completeWorldReservations);
 assert.equal(rejected.constructionAccounting.transitions,6+rejected.partition.transitions+rejected.paint.accounting.transitions);
 await write(out+'/private-rejections.json',{capped,rejected});assert.equal(modelCalls,0);
 evidence.push({name:'pre-CSP-cap-and-failed-CSP-retain-all-charges',passed:true});
});

test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const bindings={...rt.toolchainBindings};for(const p of [...Object.keys(compiled.metafile.inputs),'tools/daily-challenge/formal-v4/four-anchor-region-stock.test.mjs'])bindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));
 bindings[SPARSE_DECLARATION.path]=sha(await fs.readFile(SPARSE_DECLARATION.path));assert.equal(bindings[SPARSE_DECLARATION.path],SPARSE_DECLARATION.sha256);
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
 await write(out+'/report.json',{status:evidence.length===3?'FOUR_ANCHOR_REGION_STOCK_PRIVATE_PASS':'INCOMPLETE',evidence,fileBindings:bindings,
  privateConstructionCalls:privateCalls,newRealConstructions:0,newSearches:0,newLedgerClaims:0,newModelCalls:modelCalls,oldHelpersModified:false,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,concurrentPublicAdditions:after.filter(x=>!before.includes(x)),
  qualificationOnly:true,formalReady:false});
});

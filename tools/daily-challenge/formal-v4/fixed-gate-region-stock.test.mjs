import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {PUBLIC_LEDGER,sha,write} from './low-twenty-io.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';
import {fixedGateColourRuntime,assertFixedGateRegionBlueprint,constructFixedGateRegionStock} from './fixed-gate-region-stock.mjs';
import {makeEarlyFrozenPrefixTailPlan} from './early-frozen-prefix-tail-task.mjs';
import {makeLowBandPrefixTailPlan} from './prefix-tail-low-band-task.mjs';

const out=process.env.FIXED_GATE_REGION_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),evidence=[];
const SELF='tools/daily-challenge/formal-v4/fixed-gate-region-stock.mjs';let privateCalls=0,stocks;
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
function toy(count=0){
 const level={id:999948,name:'Private six gates and retained pink H4',width:4,height:3,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
  blocks:[{id:'pink-h4',x:0,y:0,shape:rect(4,1),color:'pink'},{id:'red-opening',x:0,y:1,shape:[[0,0]],color:'red'},
   {id:'a',x:1,y:1,shape:rect(3,1),color:'green'},{id:'b',x:0,y:2,shape:rect(2,1),color:'blue'},{id:'c',x:2,y:2,shape:rect(2,1),color:'yellow'}],
  gates:[{id:'pink',side:'right',offset:0,size:1,color:'pink'},{id:'red',side:'left',offset:1,size:1,color:'red'},
   {id:'green',side:'left',offset:2,size:1,color:'green'},{id:'blue',side:'right',offset:2,size:1,color:'blue'},
   {id:'yellow',side:'top',offset:0,size:2,color:'yellow'},{id:'purple',side:'top',offset:2,size:2,color:'purple'}]};
 return{sourceLevelId:level.id,level,reference:{path:'PRIVATE_SYNTHETIC_ONLY',sha256:'0'.repeat(64)},referenceLevelSha256:levelSha256(level),
  fixedBlocks:level.blocks.slice(0,2),changedBodies:level.blocks.slice(2),region:{cells:level.blocks.slice(2).flatMap(absoluteCells)},
  prefixDrags:[{blockId:'pink-h4',path:[],exitSide:'right'},{blockId:'red-opening',path:[],exitSide:'left'}],iceCount:count};
}
function construct(b,options={}){privateCalls++;return constructFixedGateRegionStock(rt,b,{seed:1,colourSeed:1,bodyCountDelta:3,qualificationOnly:true,...options});}

test('restricted six-colour view retains original artwork values, and fixed pink H4 has real q0 support',()=>{
 const b=toy(),before=levelSha256(rt.GAME_ART),view=fixedGateColourRuntime(rt,b.level.gates);
 assert.equal(Object.keys(view.GAME_ART.gameplay.formalBlocks).length,6);
 for(const g of b.level.gates)assert.equal(view.GAME_ART.gameplay.formalBlocks[g.color],rt.GAME_ART.gameplay.formalBlocks[g.color]);
 assert(!view.GAME_ART.gameplay.formalBlocks.orange&&!view.GAME_ART.gameplay.formalBlocks.cyan);
 assert.equal(Object.keys(rt.GAME_ART.gameplay.formalBlocks).length,8);assert.equal(levelSha256(rt.GAME_ART),before);
 assertFixedGateRegionBlueprint(rt,b);assert.equal(rt.matchFormalBlockShape(b.fixedBlocks[0].shape,'native-only').shapeId,15);
 for(const mutate of [x=>{x.level.blocks[0].color='green';},x=>x.region.cells.push(x.region.cells[0]),x=>x.prefixDrags[0].blockId='a',x=>x.level.gates.push({...x.level.gates[0],id:'duplicate'})]){
  const bad=toy();mutate(bad);assert.throws(()=>assertFixedGateRegionBlueprint(rt,bad));}
 evidence.push({name:'true-six-colour-domain-and-fixed-q0-negative-controls',passed:true});
});

test('one private region tiling and colour CSP form complete plain/iced stocks with fixed H4, original board and exact six gates',async()=>{
 stocks=[];
 for(const count of [0,2]){const b=toy(count),original=structuredClone(b),q=construct(b);
  await write(out+'/private-stock-'+count+'.json',q);assert(q.ok,JSON.stringify({count,status:q.status,reason:q.reason,paint:q.paint?.reason}));
  assert.deepEqual(b,original);assert.deepEqual(q.level.gates,b.level.gates);assert.deepEqual(boardCells(q.level),boardCells(b.level));
  assert.equal(q.partition.blocks.length,6);assert.equal(q.partition.fixedBodies,0);assert.equal(q.partitionScope.notGameplayLevel,true);
  assert.equal(q.level.blocks.length,8);assert.equal(q.plain.level.blocks.flatMap(absoluteCells).length,12);
  for(const fixed of b.fixedBlocks)assert.deepEqual(q.level.blocks.find(x=>x.id===fixed.id),fixed);
  const worldSum=1+q.paint.accounting.completeWorldReservations+Number(count>0);
  assert.equal(q.constructionAccounting.completeWorldReservations,worldSum);assert.equal(q.plain.constructionAccounting.completeWorldReservations,worldSum-Number(count>0));
  assert.equal(q.constructionAccounting.transitions,q.partition.transitions+q.paint.accounting.transitions);
  assert.equal(q.constructionAccounting.microStates,q.paint.accounting.microStates);assert.equal(q.prefixAudit.valid,true);
  if(count){assert(q.thawedPrefixBridge.valid);assert.equal(q.thawedPrefixBridge.cleared,2);assert.equal(q.thawedPrefixBridge.icedCutSha256,q.thawedPrefixBridge.plainCutSha256);}
  assert.equal(q.L,null);assert.equal(q.U,null);assert.equal(q.accepted,false);stocks.push(q);
 }
 evidence.push({name:'private-region-assembly-six-gates-and-real-thawed-prefix',passed:true,privateConstructions:2});
});

test('budget and rejected CSP retain actual charges, without a second assignment or claim',async()=>{
 const capped=construct(toy(2),{meterLimits:{maxWorlds:2}});assert(!capped.ok);assert.equal(capped.paint,null);assert.equal(capped.enteredColourCsp,false);
 assert.equal(capped.constructionAccounting.completeWorldReservations,1);assert.equal(capped.level,null);
 const b=toy();Object.assign(b.level.gates.find(g=>g.color==='yellow'),{side:'right',offset:0,size:1});
 const rejected=construct(b);assert(!rejected.ok);assert.equal(rejected.paint.reason,'mapped-initial-portals-overlap');
 assert.equal(rejected.enteredColourCsp,true);assert.equal(rejected.paint.accounting.completeWorldReservations,0);assert.equal(rejected.constructionAccounting.completeWorldReservations,1);
 assert.equal(rejected.constructionAccounting.transitions,rejected.partition.transitions+rejected.paint.accounting.transitions);
 await write(out+'/private-rejections.json',{capped,rejected});evidence.push({name:'budget-before-CSP-and-failed-CSP-shared-accounting',passed:true,privateConstructions:2});
});

test('unchanged plain and ice planners debit the new constructor evidence; no upper/lower search is called',async()=>{
 assert.equal(stocks?.length,2);
 for(const q of stocks){const suffix=q.iceDeclaration?'ice':'plain',plainFile=out+'/'+suffix+'-plain-evidence.json';await write(plainFile,q.plain);
  const plainConstructionEvidence={path:plainFile,sha256:sha(await fs.readFile(plainFile))};
  const final={...q,plainConstructionEvidence},file=out+'/'+suffix+'-construction.json';await write(file,final);
  const candidate={...final,constructionEvidence:{path:file,sha256:sha(await fs.readFile(file))}};
  const p=q.iceDeclaration?makeEarlyFrozenPrefixTailPlan(rt,candidate,{qualificationOnly:true,floor:1,searchUpper:8}):
   makeLowBandPrefixTailPlan(rt,candidate,{qualificationOnly:true,targetDifficulty:2});
  assert.equal(p.fullUpperBudget.maxStates,10000);assert.equal(p.lowerBudget.maxStates,9999);
  assert.equal(p.constructionAccounting.completeWorldReservations,q.constructionAccounting.completeWorldReservations);
  assert(p.innerPlan.tailBudget.maxStates<10000-q.constructionAccounting.completeWorldReservations);
  await write(out+'/'+suffix+'-private-math-plan.json',p);
 }
 evidence.push({name:'original-math-planner-schema-and-shared-debit-only',passed:true,newSearches:0});
});

test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const bindings={...rt.toolchainBindings};for(const p of [...Object.keys(compiled.metafile.inputs),'tools/daily-challenge/formal-v4/fixed-gate-region-stock.test.mjs'])bindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
 await write(out+'/report.json',{status:evidence.length===4?'FIXED_GATE_REGION_STOCK_PRIVATE_PASS':'INCOMPLETE',evidence,fileBindings:bindings,
  privateConstructionCalls:privateCalls,newRealConstructions:0,newSearches:0,newLedgerClaims:0,oldHelpersModified:false,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,concurrentPublicAdditions:after.filter(x=>!before.includes(x)),
  productionPipelineChanged:false,qualificationOnly:true,formalReady:false});
});

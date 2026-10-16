import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {STAR_SUFFIX_DECLARATION,assertSource200StarStock,compileStoredStarSuffixBlueprint} from './reverse-star-suffix-blueprint-v1.mjs';
import {STAR_SUFFIX_PRODUCTION_READY,beginReverseStockConstruction,createReverseRawCountingFixture,coordinateStarPortals,eligibleStarGates,runStarSuffixGestureQualification,runStoredSuffixTinyQualification} from './reverse-star-suffix-factory-v1.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',SELF=T+'reverse-star-suffix-private.test.mjs',FACTORY=T+'reverse-star-suffix-factory-v1.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
// All actual fixture objects are created only when explicitly running this test.
function single(star=true,x=0,y=0){return{id:998721,name:'Synthetic star gate qualification',width:3,height:2,difficulty:'super',timeSeconds:180,reward:0,mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'a',x,y,color:'red',shape:[[0,0]],star}],gates:[{id:'red-normal',color:'red',side:'left',offset:0,size:1,star:false},{id:'red-star',color:'red',side:'right',offset:1,size:1,star:true}]};}
function four(){return{id:998722,name:'Synthetic static star full replay',width:2,height:2,difficulty:'super',timeSeconds:180,reward:0,mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'r',x:0,y:0,color:'red',shape:[[0,0]],star:true},{id:'y',x:1,y:0,color:'yellow',shape:[[0,0]],star:false},{id:'b',x:0,y:1,color:'blue',shape:[[0,0]],star:false},{id:'g',x:1,y:1,color:'green',shape:[[0,0]],star:false}],gates:[{id:'r-normal',color:'red',side:'left',offset:0,size:1,star:false},{id:'r-star',color:'red',side:'top',offset:1,size:1,star:true},{id:'gate-y',color:'yellow',side:'right',offset:0,size:1},{id:'gate-b',color:'blue',side:'left',offset:1,size:1},{id:'gate-g',color:'green',side:'bottom',offset:1,size:1}]};}
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V,'proof')+path.sep));await fs.mkdir(out,{recursive:false});const fileBindings={},toolBindings={},evidence=[];
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return b;};const bound=async d=>{const b=await bytes(d.path);assert.equal(sha(b),d.sha256);return JSON.parse(b);};
 const save=async(name,value)=>{const p=path.join(out,name+'.json');await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return{path:p,sha256:sha(await bytes(p))};};
 const check=async(name,fn)=>{const value=await fn();evidence.push({name,passed:true,evidence:await save(name,value)});};
 let rt,completedTiny;const counters={newRealConstructions:0,newProductionStocksExecuted:0,newSearches:0,publicClaimsStarted:0,historyLoads:0,lowerCalls:0,privateCanonicalReplays:0,privateIndependentReplays:0};
 try{
  await check('source200-declaration-and-stored-suffix-metadata',async()=>{
   const d=await bound(STAR_SUFFIX_DECLARATION),ref=await bound(d.reference.base),inventory=d.inventoryWithoutPositions.map(b=>({id:b.retainedReferenceBodyId??'star200-'+b.designId,color:b.color,shape:copy(b.shape),star:b.star})),gates=d.gatesWithoutLevel.map(({designId,...g})=>({id:'star200-'+designId,...g}));
   assertSource200StarStock(inventory,gates);const blueprint=compileStoredStarSuffixBlueprint(ref,{cutAfterDrag:34,inventory,gates});assert.equal(blueprint.retainedArea,10);assert.equal(blueprint.replacementArea,38);assert.equal(blueprint.inverseOperations.length,2);
   const bad=copy(inventory);bad.find(b=>b.star).star=false;assert.throws(()=>assertSource200StarStock(bad,gates));const wrong=copy(gates);wrong.find(g=>g.star).size++;assert.throws(()=>assertSource200StarStock(inventory,wrong));assert.throws(()=>compileStoredStarSuffixBlueprint(ref,{cutAfterDrag:33,inventory,gates}));
   assert.equal(STAR_SUFFIX_PRODUCTION_READY,false);assert.throws(()=>beginReverseStockConstruction(null,null,null),/PRODUCTION_TASK_NOT_INTEGRATED/);
   return{blueprint,inventorySha256:levelSha256(inventory),gatesSha256:levelSha256(gates),newModels:0,productionEntryClosed:true};
  });
  await check('ordinary-star-eligible-portal-directions',()=>{
   const star=single(),ordinary=single(false),a=star.blocks[0],b=ordinary.blocks[0];assert.deepEqual(eligibleStarGates(star,a).map(g=>g.id),['red-star']);assert.deepEqual(eligibleStarGates(ordinary,b).map(g=>g.id),['red-normal','red-star']);
   assert.deepEqual(coordinateStarPortals(star,a),[{position:[2,1],gateId:'red-star',side:'right'}]);assert.deepEqual(coordinateStarPortals(ordinary,b),[{position:[0,0],gateId:'red-normal',side:'left'},{position:[2,1],gateId:'red-star',side:'right'}]);return{newModels:0,starPorts:coordinateStarPortals(star,a),ordinaryPorts:coordinateStarPortals(ordinary,b)};
  });
  rt=await loadV4Runtime();const original=Object.getOwnPropertyDescriptors(rt.PuzzleModel.prototype);
  await check('original-star-eligibility-and-first-contact-local-gestures',()=>{
   const cases=[];for(const [name,level,drag,valid]of[
    ['star-cannot-normal',single(),{blockId:'a',path:[],exitSide:'left'},false],
    ['star-can-pass-normal-to-star',single(),{blockId:'a',path:[[1,0],[2,0],[2,1]],exitSide:'right'},true],
    ['ordinary-can-star',single(false,1,1),{blockId:'a',path:[[2,1]],exitSide:'right'},true],
    ['ordinary-pointer-down-must-clear',single(false),{blockId:'a',path:[[1,0],[2,0],[2,1]],exitSide:'right'},false],
    ['ordinary-cannot-pass-star-contact',single(false,1,1),{blockId:'a',path:[[2,1],[2,0]]},false]]){
     const result=runStarSuffixGestureQualification(rt,level,{drags:[drag]});assert.equal(result.terminal,null,name);assert.equal(result.outcome.valid,valid,name);assert.equal(result.accounting.rawAccounting.active,false);assert.deepEqual(Object.getOwnPropertyDescriptors(rt.PuzzleModel.prototype),original);cases.push({name,...result});
   }return{cases};
  });
  await check('held-domain-respects-both-eligible-exits',()=>{
   const a=runStarSuffixGestureQualification(rt,single(),{kind:'held',heldBodyId:'a'}),b=runStarSuffixGestureQualification(rt,single(false,1,1),{kind:'held',heldBodyId:'a'});
   assert.equal(a.terminal,null);assert.equal(b.terminal,null);assert(!a.outcome.positions.some(p=>p[0]===2&&p[1]===1));assert(!b.outcome.positions.some(p=>p[0]===0&&p[1]===0));assert(!b.outcome.positions.some(p=>p[0]===2&&p[1]===1));return{star:a,ordinary:b};
  });
  await check('raw-cap-before-mutation-and-static-star-identity',()=>{
   const level=single(),meter=createReverseRawCountingFixture(rt,level,{limit:1});meter.admitInitial(level.blocks);let model;
   assert.throws(()=>meter.scope(()=>{model=new rt.PuzzleModel(copy(level));model.startCountdown();}),/distinct-worlds/);assert.equal(model.started,false);assert.equal(meter.report().distinctStates,1);assert.equal(meter.report().active,false);assert.throws(()=>meter.admitInitial(level.blocks),/distinct-worlds/);assert.deepEqual(Object.getOwnPropertyDescriptors(rt.PuzzleModel.prototype),original);
   const exact=createReverseRawCountingFixture(rt,level);const changed=copy(level.blocks);changed[0].star=false;assert.throws(()=>exact.admitInitial(changed));assert.equal(exact.report().distinctStates,0);return{capped:meter.report(),starTamper:exact.report()};
  });
  await check('one-original-full-dual-replay-shares-star-raw',()=>{
   const result=runStarSuffixGestureQualification(rt,four(),{kind:'dual',drags:[{blockId:'y',path:[],exitSide:'right'},{blockId:'r',path:[[1,0]],exitSide:'top'},{blockId:'b',path:[],exitSide:'left'},{blockId:'g',path:[],exitSide:'bottom'}]});
   counters.privateCanonicalReplays=result.accounting.counters.canonicalReplays;counters.privateIndependentReplays=result.accounting.counters.independentReplays;assert.equal(result.terminal,null);assert.equal(result.outcome.ok,true);assert.equal(result.outcome.U,0);assert.equal(result.accounting.counters.canonicalReplays,1);assert.equal(result.accounting.counters.independentReplays,1);assert(result.accounting.rawAccounting.distinctStates<=10000);assert.equal(result.accounting.rawAccounting.postUseAdmissions,0);assert.equal(result.accounting.rawAccounting.active,false);assert.deepEqual(Object.getOwnPropertyDescriptors(rt.PuzzleModel.prototype),original);completedTiny=result.outcome;return result;
  });
  await check('stored-tiny-two-body-suffix-shares-graph-raw',()=>{
   assert(completedTiny);const result=runStoredSuffixTinyQualification(rt,completedTiny,{cutAfterDrag:2});assert.equal(result.terminal,null);assert.equal(result.seed.level.blocks.length,2);assert.equal(result.fullWorlds,0);assert.equal(result.seed.operations.length,2);assert.equal(result.graphStats.interleavedPoppedWorlds,1);assert.equal(result.accounting.rawAccounting.distinctStates,result.rawBeforeGraph);assert.equal(result.accounting.rawAccounting.rawSetSharedAcrossAllModelsAndReplays,true);assert.equal(result.accounting.rawAccounting.active,false);assert.equal(result.accounting.counters.canonicalReplays,0);assert.equal(result.accounting.counters.independentReplays,0);assert.deepEqual(Object.getOwnPropertyDescriptors(rt.PuzzleModel.prototype),original);return result;
  });
  for(const n of ['failed-report.json','failure-note.json','reverse-star-suffix-blueprint-v1.mjs.at-failure.txt','reverse-star-suffix-factory-v1.mjs.at-failure.txt','reverse-star-suffix-private.test.mjs.at-failure.txt'])await bytes(V+'proof/reverse-star-suffix-private-01/'+n);
  const closure=await build({entryPoints:[FACTORY],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const p of Object.keys(closure.metafile.inputs))toolBindings[p.replaceAll('\\','/')]=sha(await bytes(p));for(const[p,h]of Object.entries(rt.toolchainBindings)){assert.equal(sha(await bytes(p)),h);toolBindings[p]=h;}await bytes(SELF);for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h);
  return await save('report',{status:'REVERSE_STAR_SUFFIX_FACTORY_PRIVATE_PASS',tests:evidence.length,evidence,errors:[],fileBindings,toolBindings,...counters,productionQualified:false,limitations:['Source200 used only as static declaration and saved suffix metadata.','No production task, lower projection or public claim was run.','One synthetic four-cell dual replay does not establish production solvability or difficulty.']});
 }catch(e){await save('failed-report',{status:'REVERSE_STAR_SUFFIX_FACTORY_PRIVATE_FAIL',error:e.stack,evidence,fileBindings,...counters});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));

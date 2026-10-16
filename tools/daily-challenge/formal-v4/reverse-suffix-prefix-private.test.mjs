import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import * as task from './reverse-suffix-prefix-task-v1.mjs';
import {compileStoredSuffixBlueprint,makeReverseStockRecipe,runStoredSuffixTinyQualification} from './reverse-suffix-prefix-factory-v1.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',SELF=T+'reverse-suffix-prefix-private.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V,'proof')+path.sep));await fs.mkdir(out,{recursive:false});const fileBindings={},toolBindings={},evidence=[];
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return b;},json=async p=>JSON.parse(await bytes(p));
 const save=async(name,q)=>{const p=path.join(out,name+'.json');await fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});return{path:p,sha256:sha(await bytes(p))};};
 const check=async(name,fn)=>{evidence.push({name,passed:true,evidence:await save(name,await fn())});};
 const rt=await loadV4Runtime(),descriptors=Object.getOwnPropertyDescriptors(rt.PuzzleModel.prototype);
 try{
  const declarationPath=V+'design/plain-reverse-source5-suffix-prefix-input-01/source-005.json',d=await json(declarationPath),ref=await json(d.sourceReference.path);assert.equal(fileBindings[d.sourceReference.path],d.sourceReference.sha256);
  const stock=d.recipes[0],blueprint=compileStoredSuffixBlueprint(ref,{cutAfterDrag:26,gates:stock.gates,inventory:stock.inventory});
  await check('production-input-static-native-and-tail-binding',async()=>{
   const source=rt.LEVELS.find(x=>x.id===5);task.assertReverseStockDeclaration({sourceLevelId:5,stockId:stock.recipeId,targetDifficulty:1},d,source,ref);
   const recipe=makeReverseStockRecipe(rt,source,{...stock,suffixBlueprint:blueprint});assert.equal(recipe.inventory.length,12);assert.equal(recipe.suffixBlueprint.retainedArea,13);assert.equal(recipe.suffixBlueprint.replacementArea,22);
   assert.deepEqual(blueprint.inverseOperations.map(x=>x.body.id),ref.drags.slice(26).map(x=>x.blockId).reverse());assert.equal(blueprint.inverseOperations.length,4);
   for(const[p,h]of Object.entries(recipe.assetBindings))assert.equal(sha(await bytes(p)),h);
   return{declaration:{path:declarationPath,sha256:fileBindings[declarationPath]},blueprint,recipeSha256:recipe.recipeSha256,sourceGeometry:[source.width,source.height],nativeAssetCount:Object.keys(recipe.assetBindings).length,models:0,newPhysicalWorlds:0};
  });
  await check('bad-route-cut-tail-gate-and-id-refusals',()=>{
   const cases=[];const reject=(name,r,s)=>{assert.throws(()=>compileStoredSuffixBlueprint(r,s));cases.push(name);};const options={cutAfterDrag:26,gates:stock.gates,inventory:stock.inventory};
   const r=copy(ref);r.routeSha256='0'.repeat(64);reject('wrong-route-sha',r,options);reject('wrong-cut',ref,{...options,cutAfterDrag:25});
   const g=copy(stock.gates);g.find(x=>x.color==='blue').offset++;reject('changed-tail-portal',ref,{...options,gates:g});
   const i=copy(stock.inventory);i.find(x=>x.id===blueprint.retainedBodyIds[0]).color='pink';reject('changed-tail-colour',ref,{...options,inventory:i});
   const j=copy(stock.inventory);j[0].id=ref.drags[0].blockId;reject('prefix-old-id-alias',ref,{...options,inventory:j});return{cases,newModels:0};
  });
  const tiny=await json(V+'proof/reverse-fixed-stock-task-private-03/u1/actual-private/candidate.json');let seeded,capped;
  await check('tiny-three-body-seed-and-scheduler-share-raw',()=>{
   seeded=runStoredSuffixTinyQualification(rt,tiny,{cutAfterDrag:6});assert.equal(seeded.terminal,null);assert.equal(seeded.seed.level.blocks.length,3);assert.equal(seeded.fullWorlds,0);assert.equal(seeded.seed.operations.length,3);
   assert.equal(seeded.accounting.counters.localAudits,3);assert.equal(seeded.graphStats.interleavedPoppedWorlds,1);assert.equal(seeded.accounting.rawAccounting.distinctStates,seeded.rawBeforeGraph);assert.equal(seeded.accounting.rawAccounting.rawSetSharedAcrossAllModelsAndReplays,true);assert.equal(seeded.accounting.rawAccounting.postUseAdmissions,0);assert.equal(seeded.accounting.rawAccounting.active,false);
   assert.equal(seeded.accounting.counters.canonicalReplays,0);assert.equal(seeded.accounting.counters.independentReplays,0);assert.deepEqual(Object.getOwnPropertyDescriptors(rt.PuzzleModel.prototype),descriptors);return seeded;
  });
  await check('tiny-seed-cap-before-first-portal-no-reset',()=>{
   capped=runStoredSuffixTinyQualification(rt,tiny,{cutAfterDrag:6,maxStates:1});assert.match(capped.terminal,/distinct-worlds/);assert.equal(capped.seed,null);assert.equal(capped.formed.length,1);assert.equal(capped.formed[0].level.blocks.length,0);assert.equal(capped.accounting.rawAccounting.distinctStates,1);assert.equal(capped.accounting.rawAccounting.modelInstances,0);assert.equal(capped.accounting.rawAccounting.active,false);assert.deepEqual(Object.getOwnPropertyDescriptors(rt.PuzzleModel.prototype),descriptors);return capped;
  });
  await check('original-v4-meter-forward-and-mathematics-byte-identical',async()=>{
   const old=(await bytes(T+'reverse-fixed-stock-factory-v4.mjs')).toString(),now=(await bytes(task.FACTORY)).toString(),ot=(await bytes(T+'reverse-fixed-stock-task-v4.mjs')).toString(),nt=(await bytes(task.SELF)).toString();
   const section=(s,a,b)=>{assert(s.includes(a)&&s.includes(b));return s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));};
   assert.equal(section(now,'function createRawBoardObserver(','export const REVERSE_STOCK_FACTORY_VERSION='),section(old,'function createRawBoardObserver(','export const REVERSE_STOCK_FACTORY_VERSION='));
   assert.equal(section(nt,'export function assertReverseLowerReceipt(','function trackedFile('),section(ot,'export function assertReverseLowerReceipt(','function trackedFile('));
   assert.equal(section(nt,'  assert.equal(upper.level,report.level);',' }catch(e){if(!claim)'),section(ot,'  assert.equal(upper.level,report.level);',' }catch(e){if(!claim)'));
   assert.equal(sha(now),task.REVERSE_V4_FACTORY_DESCRIPTOR.sha256);return{rawMeterAndForwardAndDoubleUUnchanged:true,lowerReceiptAndDispatchUnchanged:true,lowerBudget:task.LOWER_BUDGET,oldQualification:{path:V+'proof/reverse-fixed-stock-v4-independent-01/report.json',sha256:sha(await bytes(V+'proof/reverse-fixed-stock-v4-independent-01/report.json'))}};
  });
  const closure=await build({entryPoints:[task.SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const f of Object.keys(closure.metafile.inputs)){const p=f.replaceAll('\\','/');toolBindings[p]=sha(await bytes(p));}for(const[p,h]of Object.entries(rt.toolchainBindings)){assert.equal(sha(await bytes(p)),h);toolBindings[p]=h;}await bytes(SELF);await bytes(T+'reverse-suffix-prefix-cli-v1.mjs');
  for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h);
  const report={status:'REVERSE_SUFFIX_PREFIX_PRIVATE_PASS',errors:[],tests:evidence.length,evidence,fileBindings,toolBindings,newRealConstructions:0,newProductionStocksExecuted:0,newSearches:0,publicClaimsStarted:0,historyLoads:0,privatePartialModelInstances:seeded.accounting.rawAccounting.modelInstances+capped.accounting.rawAccounting.modelInstances,privateCompleteWorlds:0,originalFullReplayCalls:0,productionQualified:false,limitations:['One <=8-cell saved fixture restores 3 partial bodies; no production source seed was materialized.','Old v4 meter/forward/dual-U/lower byte sections reused, not retested in a large suite.','Known suffix proves neither new prefix completion nor new D1 difficulty.']};
  await save('report',report);return{tests:report.tests,report:{path:path.join(out,'report.json'),sha256:sha(await fs.readFile(path.join(out,'report.json')))}};
 }catch(e){await save('failed-report',{status:'REVERSE_SUFFIX_PREFIX_PRIVATE_FAIL',error:e.stack,evidence,fileBindings,newRealConstructions:0,newSearches:0});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));

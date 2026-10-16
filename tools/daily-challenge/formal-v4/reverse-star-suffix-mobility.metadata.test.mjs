import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import * as task from './reverse-star-suffix-task-v2.mjs';
import {inspectStarParkingCandidatesForMetadata as inspect} from './reverse-star-suffix-factory-v3.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',SELF=T+'reverse-star-suffix-mobility.metadata.test.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
const square=[[0,0],[1,0],[0,1],[1,1]],vertical=[[0,0],[0,1]],single=[[0,0]];
const b=(id,color,shape,x,y,star=false)=>({id,color,shape,x,y,star});
const small=blocks=>({id:998921,width:4,height:4,timeSeconds:180,mechanismRules:'revised-2026-09-27-v1.5',blocks,gates:[{id:'g-orange',color:'orange',side:'top',offset:0,size:1}]});
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V,'proof')+path.sep));await fs.mkdir(out,{recursive:false});const fileBindings={},toolBindings={},evidence=[];
 const bytes=async p=>{const z=await fs.readFile(p);fileBindings[p]=hash(z);return z;};
 const bound=async d=>{const z=await bytes(d.path);assert.equal(hash(z),d.sha256);return JSON.parse(z);};
 const save=async(name,value)=>{const p=path.join(out,name+'.json');await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return{path:p,sha256:hash(await bytes(p))};};
 const check=async(name,fn)=>evidence.push({name,passed:true,evidence:await save(name,await fn())});
 const zero={newRealConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newProjections:0,newRawAdmissions:0,publicClaimsStarted:0,historyLoads:0,authenticatedProductionEntriesCalled:0};
 try{
  const oldFactory=(await bytes(T+'reverse-star-suffix-factory-v2.mjs')).toString(),factory=(await bytes(task.FACTORY)).toString(),oldTask=(await bytes(T+'reverse-star-suffix-task-v1.mjs')).toString(),current=(await bytes(task.SELF)).toString();
  await check('exact-narrow-forks-and-preserved-kernel-owner',async()=>{
   const start=factory.indexOf('// Coordinate fragments only:'),end=factory.indexOf('const instrumentedPrototypes=',start);assert(start>0&&end>start);
   let restored=factory.slice(0,start)+factory.slice(end);
   restored=restored.replace('closed-reverse-star-stock-static-native-rectangle-v3','closed-reverse-star-stock-static-native-rectangle-v2').replace('./reverse-star-suffix-task-v2.mjs','./reverse-star-suffix-task-v1.mjs').replace('star-double-exit-known-suffix-new-prefix-first-full-reverse-v3','star-double-exit-known-suffix-new-prefix-first-full-reverse-v2');
   restored=restored.replace(' function parkingCandidates(level,ids,portals,maximum){owned(level);return rankStaticParkingCandidates(level,ids,portals,maximum,coordinateWork).selectedIds;}\n','').replace('heldReach,parkingCandidates,finish','heldReach,finish');
   restored=restored.replace('session.parkingCandidates(level,recipe.parkingBodyIds,portals,recipe.strategy.parkingBodiesMaximum)','recipe.parkingBodyIds.filter(id=>level.blocks.some(b=>b.id===id)).sort((a,b)=>{const score=id=>portals.filter(p=>overlaps(cells(level.blocks.find(x=>x.id===id)),p)).length;return score(b)-score(a)||a.localeCompare(b);}).slice(0,recipe.strategy.parkingBodiesMaximum)');
   assert.equal(restored,oldFactory);assert.equal(task.REVERSE_V4_FACTORY_DESCRIPTOR.sha256,hash(Buffer.from(factory)));
   const strict="assert.deepEqual(stock.insertionOrder,inventory.map(b=>b.id),'Insertion order must be the original fixed inventory order');assert.deepEqual(stock.parkingBodyIds,inventory.map(b=>b.id),'Parking order must be the original fixed inventory order');";
   let restoredTask=current.replaceAll('reverse-star-suffix-task-v2.mjs','reverse-star-suffix-task-v1.mjs').replaceAll('reverse-star-suffix-factory-v3.mjs','reverse-star-suffix-factory-v2.mjs').replaceAll('single-star-double-exit-known-suffix-owned-task-v2','single-star-double-exit-known-suffix-owned-task-v1').replaceAll('INDEPENDENT_REVERSE_STAR_SUFFIX_TASK_V2_PASS','INDEPENDENT_REVERSE_STAR_SUFFIX_TASK_PASS').replaceAll('INDEPENDENT_REVERSE_STAR_SUFFIX_PLAN_V2_PASS','INDEPENDENT_REVERSE_STAR_SUFFIX_PLAN_PASS').replace(task.REVERSE_V4_FACTORY_DESCRIPTOR.sha256,'c576e8508352bce81072c256f8a5e068e847d43dfb8c2e7c685d685a446e653c').replace(strict,"assert.deepEqual([...(stock.insertionOrder??[])].sort(),inventory.map(b=>b.id).sort());assert.deepEqual([...(stock.parkingBodyIds??[])].sort(),inventory.map(b=>b.id).sort());");
   assert.equal(restoredTask,oldTask);
   const cli=(await bytes(T+'reverse-star-suffix-cli-v2.mjs')).toString(),oldCli=(await bytes(T+'reverse-star-suffix-cli-v1.mjs')).toString();assert.equal(cli.replaceAll('reverse-star-suffix-task-v2.mjs','reverse-star-suffix-task-v1.mjs').replaceAll('reverse-star-suffix-cli-v2.mjs','reverse-star-suffix-cli-v1.mjs'),oldCli);
   return{factoryOtherBytesIdentical:true,taskOtherBytesIdentical:true,cliOnlyImportUsage:true,unchanged:['raw state observer','forward and complete original dual U','first-full terminal','targetOrder','heldReach','two-body/two-target strategy','lower 9+9990+1','all owner/history/failure paths']};
  });
  await check('blocked-square-fixture-selects-movable-helper',()=>{
   const level=small([b('blue-left','blue',vertical,0,2),b('blue-right','blue',vertical,3,2),b('cyan','cyan',square,1,2),b('block-left','red',single,0,1),b('block-right','pink',single,3,1)]),before=levelSha256(level),r=inspect(level,['blue-left','blue-right','cyan'],[[[0,2],[0,3]],[[3,2],[3,3]]]);
   assert.equal(r.terminal,null);assert.deepEqual(r.result.selectedIds,['cyan']);assert.equal(r.result.ranked[0].openDirections,1);assert.deepEqual(r.result.excluded.map(x=>x.reason),['no-geometric-first-step','no-geometric-first-step']);assert.equal(levelSha256(level),before);return{fixtureKind:'synthetic-partial-scalar-geometry',result:r};
  });
  await check('eligible-star-exits-and-boundary-only',()=>{
   const level=small([b('blue','blue',single,0,1,true)]);level.gates=[{id:'ordinary-blue',color:'blue',side:'left',offset:1,size:1},{id:'star-blue',color:'blue',star:true,side:'right',offset:1,size:1}];
   const star=inspect(level,['blue'],[]);assert.deepEqual(star.result.selectedIds,['blue']);assert.equal(star.result.ranked[0].openDirections,3);
   const ordinary=copy(level);ordinary.blocks[0].star=false;assert.equal(inspect(ordinary,['blue'],[]).result.excluded[0].reason,'already-at-eligible-exit');
   const atStar=copy(level);atStar.blocks[0].x=3;assert.equal(inspect(atStar,['blue'],[]).result.excluded[0].reason,'already-at-eligible-exit');atStar.blocks[0].star=false;assert.equal(inspect(atStar,['blue'],[]).result.excluded[0].reason,'already-at-eligible-exit');
   return{starAtOrdinaryGateRemainsCandidate:true,ordinaryAtEitherGateFiltered:true,starAtStarGateFiltered:true,boundaryDirectionsCount:3,endpointExitIsOnlyOptimisticAndStillCheckedByHeldForward:true};
  });
  await check('portal-priority-open-directions-id-and-cap-precharge',()=>{
   const level=small([b('a','red',single,0,0),b('b','blue',single,1,2),b('c','cyan',single,3,3)]),ids=['c','b','a'],r=inspect(level,ids,[[[0,0]],[[3,3]]]);
   assert.deepEqual(r.result.selectedIds,['a','c']);assert.deepEqual(r.result.ranked.map(x=>x.id),['a','c','b']);assert(r.result.comparisons<=level.blocks.length**2);
   const ties=inspect(level,ids,[]);assert.deepEqual(ties.result.ranked.map(x=>x.id),['b','a','c']);
   const refused=inspect(level,ids,[],{maxTransitions:0});assert(refused.terminal);assert.equal(refused.result,null);assert.equal(refused.accounting.transitions,0);assert.deepEqual(refused.accounting.operations,[]);
   const noMicro=inspect(level,ids,[],{maxMicroStates:0});assert(noMicro.terminal);assert(!noMicro.accounting.operations.some(x=>x.label==='parking-first-step-direction'));assert.equal(noMicro.accounting.micro,0);
   const full=inspect(level,ids,[]);const short=inspect(level,ids,[],{maxTransitions:full.accounting.transitions-1});assert(short.terminal);assert.equal(short.result,null);assert(short.accounting.transitions<=full.accounting.transitions-1);
   return{ranked:r.result,openTieRank:ties.result,zeroTransitionRefusal:refused,zeroMicroRefusal:noMicro,finalComparisonRefusal:short,checksChargedBeforeUse:true};
  });
  await check('saved-world01658-readonly-geometry-no-resume',async()=>{
   const p=V+'design/plain-reverse-source5-suffix-prefix-pilot-actual-03/world-01658.json',raw=await bytes(p),q=JSON.parse(raw),level=q.level,before=levelSha256(level);
   const portals=[[[3,5],[4,5]],[[3,6],[4,6]]],r=inspect(level,level.blocks.map(x=>x.id),portals);
   assert.equal(r.terminal,null);assert(r.result.selectedIds.includes('suffix5-r03-cyan-2x2'));for(const id of ['v3-5-6823833-b10','suffix5-r03-blue-1x3'])assert(r.result.excluded.some(x=>x.id===id&&x.reason==='no-geometric-first-step'));assert.equal(levelSha256(level),before);assert.equal(hash(await fs.readFile(p)),hash(raw));
   return{descriptor:{path:p,sha256:hash(raw)},originalWorldSha256:before,result:r,existingSnapshotOnly:true,noOldInputResumed:true,newWorlds:0,newModelCalls:0,newSearchCalls:0};
  });
  await check('actual-stock-order-exact-and-old-evidence-only',async()=>{
   const d=await bound({path:V+'design/star-source200-stock-declaration-01/source-200.json',sha256:'e3de97f9a290c17e871b7dfb48cdd273e4b9e37c3a8dff7ac6ae5da4e6b4e7ee'}),design=await bound(d.starDesignDeclaration),ref=await bound(d.sourceReference),catalog=JSON.parse(await bytes('deliverables/daily-formal-v3-20261008/design/mainline-baseline-catalog.json')),source=catalog.rows.find(x=>x.sourceLevelId===200).level,stock=d.recipes[0],c={sourceLevelId:200,targetDifficulty:1,stockId:stock.recipeId};
   assert(task.assertStarSuffixDeclaredDesign(c,d,source,ref,stock,design));for(const field of ['insertionOrder','parkingBodyIds']){const bad=copy(stock);[bad[field][0],bad[field][1]]=[bad[field][1],bad[field][0]];assert.throws(()=>task.assertStarSuffixDeclaredDesign(c,d,source,ref,bad,design));}
   const oldReview=await bound({path:V+'proof/reverse-star-suffix-task-independent-01/report.json',sha256:'102c04276cfbea8844cb8230be6b3493dc94b91ec1e4d1535fdf6db8103bf277'});assert.equal(oldReview.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_TASK_PASS');
   return{actualStockDescriptor:{path:V+'design/star-source200-stock-declaration-01/source-200.json',sha256:fileBindings[V+'design/star-source200-stock-declaration-01/source-200.json']},bothOrdersExactlyInventory:true,permutationRejected:true,oldQualificationUsedOnlyForUnchangedCode:true,newActualRecipeOrWorldCreated:false};
  });
  const closure=await build({entryPoints:[task.SELF],bundle:true,write:false,packages:'external',metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const p of Object.keys(closure.metafile.inputs))toolBindings[p.replaceAll('\\','/')]=hash(await bytes(p));await bytes(SELF);
  for(const [p,h]of Object.entries(fileBindings))assert.equal(hash(await fs.readFile(p)),h,p);
  return await save('report',{status:'REVERSE_STAR_SUFFIX_MOBILITY_METADATA_PASS',tests:evidence.length,evidence,fileBindings,toolBindings,errors:[],...zero,productionQualified:false,oldInputsRerun:false,limitsChanged:false,scope:'Pure charged scalar geometry, exact source forks, saved world read-only; no factory/model/solver invocation.'});
 }catch(e){await save('failed-report',{status:'REVERSE_STAR_SUFFIX_MOBILITY_METADATA_FAIL',error:e.stack,evidence,fileBindings,...zero});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));

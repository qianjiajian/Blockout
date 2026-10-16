import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {STAR_SUFFIX_DECLARATION,compileStoredStarSuffixBlueprint} from './reverse-star-suffix-blueprint-v1.mjs';
import {assertStarSuffixLowerReceipt} from './reverse-star-suffix-lower-v1.mjs';
import * as task from './reverse-star-suffix-task-v1.mjs';
import {beginReverseStockConstruction} from './reverse-star-suffix-factory-v2.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',SELF=T+'reverse-star-suffix-task.metadata.test.mjs',OLD_TASK=T+'reverse-suffix-prefix-task-v3.mjs',OLD_FACTORY=T+'reverse-star-suffix-factory-v1.mjs',CLI=T+'reverse-star-suffix-cli-v1.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'),copy=structuredClone;
const section=(s,a,b)=>{const start=s.indexOf(a),end=s.indexOf(b,start);assert(start>=0&&end>start,a);return s.slice(start,end);};
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V,'proof')+path.sep));await fs.mkdir(out,{recursive:false});const fileBindings={},toolBindings={},evidence=[];
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return b;};const bound=async d=>{const b=await bytes(d.path);assert.equal(sha(b),d.sha256,d.path);return JSON.parse(b);};
 const save=async(name,value)=>{const p=path.join(out,name+'.json');await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return{path:p,sha256:sha(await bytes(p))};};
 const check=async(name,fn)=>evidence.push({name,passed:true,evidence:await save(name,await fn())});
 const counters={newRealConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newProjections:0,publicClaimsStarted:0,historyLoads:0,authenticatedProductionEntriesCalled:0};
 try{
  const oldFactory=(await bytes(OLD_FACTORY)).toString(),factory=(await bytes(task.FACTORY)).toString(),oldTask=(await bytes(OLD_TASK)).toString(),current=(await bytes(task.SELF)).toString();
  await check('factory-and-cli-exact-narrow-diff',async()=>{
   const expected=oldFactory.replace("closed-reverse-star-stock-static-native-rectangle-v1","closed-reverse-star-stock-static-native-rectangle-v2")
    .replace("// Production stays closed until the separately reviewed task integrates lower projection/owners.\nfunction takeReverseConstructionAuthority(){throw Error('STAR_SUFFIX_PRODUCTION_TASK_NOT_INTEGRATED');}\nfunction takeReverseClaimAuthority(){throw Error('STAR_SUFFIX_PRODUCTION_TASK_NOT_INTEGRATED');}\nexport const STAR_SUFFIX_PRODUCTION_READY=false;","// The new task alone issues authenticated, one-use production capabilities.\nimport {takeReverseConstructionAuthority,takeReverseClaimAuthority} from './reverse-star-suffix-task-v1.mjs';")
    .replace("./plan-history-adapter-v8.mjs","./plan-history-adapter-v9.mjs").replace('star-double-exit-known-suffix-new-prefix-first-full-reverse-v1','star-double-exit-known-suffix-new-prefix-first-full-reverse-v2');
   assert.equal(factory,expected);assert.equal(task.REVERSE_V4_FACTORY_DESCRIPTOR.sha256,sha(Buffer.from(factory)));
   const oldCli=(await bytes(T+'reverse-suffix-prefix-cli-v3.mjs')).toString(),newCli=(await bytes(CLI)).toString();assert.equal(newCli,oldCli.replaceAll('reverse-suffix-prefix-task-v3.mjs','reverse-star-suffix-task-v1.mjs').replaceAll('reverse-suffix-prefix-cli-v3.mjs','reverse-star-suffix-cli-v1.mjs'));
   return{factoryChanges:['one-shot authority import','v8 to qualified v9','scope and factory version'],allOtherFactoryBytesIdentical:true,rawObserverForwardAndDualUnchanged:true,cliImportAndUsageOnly:true};
  });
  await check('history-owner-raw-archive-and-upper-path-preserved',()=>{
   const boundaries=[['function reader()','async function qualification('],['export function takeReverseConstructionAuthority(','/** Pure receipt validation'],['export function reverseOriginalLowerStage(','export function assertReverseProductionChoice('],['export function assertReversePriorHistory(','export function assertReverseStockDeclaration('],['export function assertReverseDesignHolds(','/** One recipe;'],['  const claimToken=Object.freeze({});','  const stage=reverseOriginalLowerStage('],['  if(attempt){const ledger=','\n }}\n}']];
   for(const[a,b]of boundaries)assert.equal(section(current,a,b),section(oldTask,a,b),a);
   assert(current.includes("await r.map(design.fileBindings);assertStarSuffixDeclaredDesign"));assert(current.includes("report.lowerBound=lower;report.proof=lower.result;report.lowerArchives=lower.archives;assertReverseLowerReceipt"));assert(current.includes("if(!lower.mathematicalLowerValidated)"));
   return{byteIdenticalSections:boundaries.map(x=>x[0]),metadataOnly:true};
  });
  const design=await bound(STAR_SUFFIX_DECLARATION),reference=await bound(design.reference.base),catalog=JSON.parse(await bytes('deliverables/daily-formal-v3-20261008/design/mainline-baseline-catalog.json')),source=catalog.rows.find(x=>x.sourceLevelId===200).level;
  const inventory=design.inventoryWithoutPositions.map(b=>({id:b.retainedReferenceBodyId??'star200-'+b.designId,color:b.color,shape:b.shape,star:b.star})),gates=design.gatesWithoutLevel.map(({designId,...g})=>({id:'star200-'+designId,...g}));
  // In-memory schema fixture only. Never passed to a factory/prepare/runner.
  const stock={recipeId:'metadata-only-star-pilot-schema',sourceLevelId:200,targetDifficulty:1,inventory,gates,insertionOrder:inventory.map(b=>b.id),parkingBodyIds:inventory.map(b=>b.id),blueprint:{cutAfterDrag:34,reference:design.reference.base}},c={sourceLevelId:200,targetDifficulty:1,stockId:stock.recipeId},declaration={status:'READONLY_REVERSE_STOCK_DECLARATION_NOT_EXECUTABLE',executable:false,sourceLevelId:200,sourceReference:design.reference.base,sourceLevelSha256:levelSha256(source),sourceBoardBaselineSha256:boardBaselineSha256(source),starDesignDeclaration:STAR_SUFFIX_DECLARATION,recipes:[stock],inputBindings:{}};
  await check('source200-exact-physical-inventory-and-declaration-schema',()=>{
   assert.equal(task.assertReverseStockDeclaration(c,declaration,source,reference),stock);assert(task.assertStarSuffixDeclaredDesign(c,declaration,source,reference,stock,design));let rejected=0;
   for(const change of [s=>s.inventory[2].star=false,s=>s.inventory[0].id='renamed-tail',s=>s.gates.pop(),s=>s.gates[0].color='red',s=>s.blueprint.cutAfterDrag=33,s=>s.upperBudget={maxStates:9999},s=>s.insertionOrder.pop()]){const s=copy(stock);change(s);assert.throws(()=>task.assertStarSuffixDeclaredDesign(c,declaration,source,reference,s,design));rejected++;}
   assert.throws(()=>task.reverseTargetBand(2));assert.throws(()=>task.reverseTargetBand(3));return{rejected,sourceLevelSha256:levelSha256(source),reference:design.reference.base,inventoryBodies:17,area:48,gates:10,stars:2,cutAfterDrag:34,newStockCreated:false,newFullLevel:false,actualInsertionOrderNotChosen:true};
  });
  await check('physical-star-recipe-identity-and-one-shot-authority',()=>{
   const blueprint=compileStoredStarSuffixBlueprint(reference,{cutAfterDrag:34,inventory,gates});const recipe={sourceLevelId:200,sourceMaskSha256:'a'.repeat(64),inventory,board:{gates},insertionOrder:stock.insertionOrder,parkingBodyIds:stock.parkingBodyIds,strategy:{metadataFixture:true},qualificationFixture:null,suffixBlueprint:blueprint};
   const base=task.reverseRecipeExecutionIdentity(recipe),changed=copy(recipe);changed.inventory[2].star=false;assert.notEqual(task.reverseRecipeExecutionIdentity(changed),base);
   const rename=copy(recipe);rename.recipeId='a-label-cannot-reset-physical-recipe';rename.targetDifficulty=3;assert.equal(task.reverseRecipeExecutionIdentity(rename),base);
   assert.throws(()=>task.takeReverseConstructionAuthority({},null,recipe));assert.throws(()=>task.takeReverseClaimAuthority({},null,'a'.repeat(64)));assert.throws(()=>beginReverseStockConstruction(null,null,{}),/Authenticated one-shot/);
   return{physicalIdentityIncludesStar:true,labelAndTargetDoNotReset:true,nakedCapabilitiesRejected:true,blueprintMetadataOnly:true,newModelCalls:0};
  });
  await check('D1-upper-window-dispatch-only',async()=>{
   let calls=0;const lower=async()=>{calls++;return{sentinel:'metadata-only-no-kernel'};};for(const U of[0,15,21,100])assert.equal(task.reverseOriginalLowerStage(U,1,lower).lower,null);assert.equal(calls,0);
   for(const U of[16,20])assert.deepEqual(await task.reverseOriginalLowerStage(U,1,lower).lower,{sentinel:'metadata-only-no-kernel'});assert.equal(calls,2);assert.throws(()=>task.reverseOriginalLowerStage(20,2,lower));
   assert.equal(task.LOWER_POLICY.prepaidWorlds,9);assert.equal(task.LOWER_POLICY.rawSetMaximum,9990);assert.equal(task.LOWER_POLICY.terminalWorldAllowance,1);assert.equal(task.LOWER_POLICY.upperBoundTransfer,false);return{metadataDispatchCalls:calls,actualLowerCalls:0,belowAndAboveWindowSkipLower:true};
  });
  const lowerReport=await bound({path:V+'proof/reverse-star-suffix-lower-private-01/report.json',sha256:'6336b33986d8539d4a5736b9623c7a8b0eb68406b88e884de66d89493bdbdf2e'});
  await check('saved-tiny-lower-receipt-and-root-world-transport',async()=>{
   const q=await bound(lowerReport.evidence.find(e=>e.name==='single-original-and-ten-gate-projection-threshold').evidence),original=await bound(q.archives.original);assertStarSuffixLowerReceipt(q,original.level,{qualificationOnly:true});
   const report={levelSha256:q.inputLevelSha256},packet={kind:'projection',level:q.projection.projectedLevel,levelSha256:q.projectedLevelSha256,inputLevelSha256:q.inputLevelSha256,upperBoundTransfer:false};let seen;
   const d=await task.archiveStarLowerWorld(report,packet,{recipe:{sourceLevelId:998733,recipeSha256:'b'.repeat(64)},reference:null,outputDirectory:'metadata-unused-directory',mathFiles:[],writer:async(_file,value)=>{seen=value;return{path:'metadata-not-written.json',sha256:'c'.repeat(64)};}});
   assert.equal(report.templateLevel,packet.level);assert.equal(seen.level,packet.level);assert.equal(seen.inputLevelSha256,q.inputLevelSha256);assert.equal(seen.upperBoundTransfer,false);assert.equal(d.sha256,'c'.repeat(64));
   const failed={levelSha256:q.inputLevelSha256};await assert.rejects(task.archiveStarLowerWorld(failed,packet,{recipe:{sourceLevelId:998733,recipeSha256:'b'.repeat(64)},reference:null,outputDirectory:'metadata-unused-directory',mathFiles:[],writer:async()=>{throw Error('injected-lower-write-refusal');}}));assert.equal(failed.templateLevel,packet.level);assert.equal(failed.adminClosureRequired,true);assert.equal(failed.lowerArchiveFailure.levelSha256,q.projectedLevelSha256);
   return{savedProofRevalidatedWithoutSearch:true,allTenPortsRetained:true,successfulAndFailedTransportKeepSameObject:true,failed,localWriterInjectionOnly:true,actualOwnerFilesWritten:0};
  });
  const closure=await build({entryPoints:[task.SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const p of Object.keys(closure.metafile.inputs))toolBindings[p.replaceAll('\\','/')]=sha(await bytes(p));for(const[p,h]of Object.entries(lowerReport.toolBindings)){assert.equal(sha(await bytes(p)),h);toolBindings[p]=h;}await bytes(SELF);await bytes(CLI);
  await bound({path:V+'proof/reverse-star-suffix-lower-independent-01/report.json',sha256:'3f32eb2d690611c907ec1dee4275c75fd924d61e5aaff76d4870ff998858fa2f'});
  const factoryTinyEvidence={path:V+'proof/reverse-star-suffix-private-02/report.json',sha256:'5d9e97254bc33222c6d1b4e7d3b061436c5718c955e37919eabc944ec0a76103'};await bound(factoryTinyEvidence);
  for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h);
  return await save('report',{status:'REVERSE_STAR_SUFFIX_TASK_METADATA_PASS',tests:evidence.length,evidence,errors:[],fileBindings,toolBindings,...counters,reusedFactoryTinyEvidence:factoryTinyEvidence,productionQualified:false,actualContextCreated:false,actualStockCreated:false,designAccepted:false,limitations:['Pure schema/diff/transport checks only; no real source200 positions or model.','Factory raw/upper and lower tiny evidence is reused by exact source/binding, not rerun.','Only fake-capability rejection invoked the factory entry; authenticated production entries and models remain zero.','Actual history/latest parent/stock order/context remain root-owned future inputs.','L/U acceptance is mathematical only; ba87 split routes/space reuse remain design review requirements.']});
 }catch(e){await save('failed-report',{status:'REVERSE_STAR_SUFFIX_TASK_METADATA_FAIL',error:e.stack,evidence,fileBindings,...counters});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import * as api from './reverse-fixed-stock-task-v3.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';

// Metadata only: no runtime loader, constructor, replay, solver, history load,
// ledger or browser is invoked. Existing tiny levels are read without editing.
const SELF='tools/daily-challenge/formal-v4/reverse-fixed-stock-v3.metadata.test.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
const fake=(name)=>({path:'synthetic-metadata/'+name+'.json',sha256:sha(name)});
export async function runMetadataTests(out){
 assert(out&&path.resolve(out).startsWith(path.resolve(V,'proof')+path.sep));
 await fs.mkdir(out,{recursive:false});
 const fileBindings={},evidence=[];
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return b;};
 const json=async p=>JSON.parse(await bytes(p));
 async function test(name,fn){await fn();evidence.push({name,passed:true});}
 try{
 await test('predeclared-three-bands-dispatch-once-and-refuse-outside',()=>{
  assert.deepEqual(api.REVERSE_TARGET_BANDS,{1:{floor:16,upper:20},2:{floor:21,upper:30},3:{floor:31,upper:null}});
  for(const [band,values]of [[1,[16,19,20]],[2,[21,25,30]],[3,[31,135,999]]])for(const u of values){let calls=0;const result=api.reverseOriginalLowerStage(u,band,()=>{calls++;return 'metadata-only-sentinel';});assert.equal(calls,1);assert.equal(result.lower,'metadata-only-sentinel');}
  for(const [band,u]of [[1,15],[1,21],[2,20],[2,31],[3,30]]){let calls=0;assert.equal(api.reverseOriginalLowerStage(u,band,()=>calls++).lower,null);assert.equal(calls,0);}
  for(const u of [-1,1.5,Infinity,NaN])assert.throws(()=>api.reverseOriginalLowerStage(u,3,()=>null));for(const d of [0,4,'1'])assert.throws(()=>api.reverseTargetBand(d));
 });
 await test('dynamic-source-stock-with-saved-tiny-reference-no-world-creation',async()=>{
  const base=V+'proof/reverse-fixed-stock-task-private-03/u1/';
  const source=await json(base+'toy-source.json'),saved=await json(base+'actual-private/candidate.json'),raw=await json(base+'toy-declaration.json');
  const stock={...raw,targetDifficulty:1};delete stock.qualificationFixture;
  const c={sourceLevelId:source.id,stockId:stock.recipeId,targetDifficulty:1};
  const d={status:'READONLY_REVERSE_STOCK_DECLARATION_NOT_EXECUTABLE',executable:false,sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),sourceBoardBaselineSha256:boardBaselineSha256(source),sourceReference:{path:base+'actual-private/candidate.json',sha256:fileBindings[base+'actual-private/candidate.json']},recipes:[stock],inputBindings:{}};
  assert.equal(api.assertReverseStockDeclaration(c,d,source,saved),stock);
  for(const edit of [x=>x.sourceLevelSha256='0'.repeat(64),x=>x.sourceBoardBaselineSha256='0'.repeat(64),x=>x.executable=true,x=>x.recipes[0].targetDifficulty=2,x=>x.recipes.push(copy(x.recipes[0])),x=>x.recipes[0].qualificationFixture='eight-colour-cycle-one-parking',x=>x.recipes[0].level={}]){const altered=copy(d);edit(altered);assert.throws(()=>api.assertReverseStockDeclaration(c,altered,source,saved));}
  const production={sourceLevelId:58,stockId:'new-independent-stock',targetDifficulty:1,declaration:fake('declaration'),priorHistoryReport:fake('prior'),selection:fake('selection'),designDisposition:api.MINIMUM_DESIGN_HOLDS};assert.equal(api.assertReverseProductionChoice(production),true);
  assert.throws(()=>api.assertReverseProductionChoice({...production,sourceLevelId:997661}));assert.throws(()=>api.assertReverseProductionChoice({...production,targetDifficulty:4}));
 });
 await test('complete-checkpoint06-successor-chain-cannot-be-omitted-or-reordered',()=>{
  const d=n=>({descriptor:fake('delta-'+n),declaredOwner:{definition:fake('owner-'+n)}}),a=d(1),b=d(2);
  const p={status:'SYNTHETIC_HISTORY_DELTAS_EXPORTED_AND_V7_VALIDATED',errors:[],oldFilesChanged:false,checkpointReexported:false,newConstructions:0,newSearches:0,newLedgerClaims:0,newReplayCalls:0,checkpoint:fake('checkpoint06'),checkpointReview:fake('review06'),selection:fake('selection'),historyScope:{roots:Array.from({length:7},(_,i)=>({id:'root-'+i}))},priorHistoryDeltas:[a],historyDeltas:[b],completeHistoryDeltas:[a,b],headSha256:b.descriptor.sha256};
  const c={history:p.checkpoint,historyReview:p.checkpointReview,selection:p.selection,historyScope:p.historyScope,historyDeltas:p.completeHistoryDeltas,historyHeadSha256:p.headSha256};assert(api.assertReversePriorHistory(c,p));
  for(const edit of [q=>q.historyDeltas.pop(),q=>q.historyDeltas.reverse(),q=>q.historyHeadSha256='0'.repeat(64),q=>q.history.sha256='0'.repeat(64),q=>q.selection.sha256='0'.repeat(64)]){const q=copy(c);edit(q);assert.throws(()=>api.assertReversePriorHistory(q,p));}
  for(const edit of [q=>q.completeHistoryDeltas.reverse(),q=>q.historyDeltas=[],q=>q.status='NOT_A_HISTORY_EXPORT',q=>q.newSearches=1]){const q=copy(p);edit(q);assert.throws(()=>api.assertReversePriorHistory(c,q));}
  const base=copy(p);base.priorHistoryDeltas=[];base.historyDeltas=[];base.completeHistoryDeltas=[];base.headSha256=base.checkpoint.sha256;assert(api.assertReversePriorHistory({...c,historyDeltas:[],historyHeadSha256:base.headSha256},base));
 });
 await test('all34-existing-design-holds-preserved-without-adoption',async()=>{
  const minimum=await json(api.MINIMUM_DESIGN_HOLDS.path);assert.equal(fileBindings[api.MINIMUM_DESIGN_HOLDS.path],api.MINIMUM_DESIGN_HOLDS.sha256);
  const c={selection:minimum.selection,designDisposition:api.MINIMUM_DESIGN_HOLDS};const result=api.assertReverseDesignHolds(c,minimum,minimum);assert.equal(result.heldCandidateCount,34);assert.equal(result.automaticDesignAcceptance,false);
  for(const edit of [h=>h.decisions.pop(),h=>h.decisions[0].formalAdoptionAllowed=true,h=>h.decisions[0].reason+='changed',h=>h.remainingAutomaticallyDesignApproved=true]){const h=copy(minimum);edit(h);assert.throws(()=>api.assertReverseDesignHolds(c,h,minimum));}
 });
 await test('latest-failed-parent-and-stable-physical-recipe-identity',async()=>{
  const p=V+'proof/reverse-fixed-stock-task-private-03/u1/plan.json',plan=await json(p);
  const old=await import('./reverse-fixed-stock-task-v2.mjs');assert.equal(api.reverseRecipeExecutionIdentity(plan.recipe),old.reverseRecipeExecutionIdentity(plan.recipe));
  const changed=copy(plan.recipe);changed.targetDifficulty=1;changed.recipeId='new-label';changed.budget.maxStates=1;assert.equal(api.reverseRecipeExecutionIdentity(changed),api.reverseRecipeExecutionIdentity(plan.recipe));
  const q=await json(V+'proof/reverse-fixed-stock-task-private-03/u1/actual-private/candidate.json');const level=q.level,h={bundle:{publicNamespace:'public'},fullWorlds:[{sourceLevelId:level.id,level}],terminalByAttempt:{}};
  const row=(id,date,accepted=false)=>({namespace:'public',kind:'mathematical',request:{value:{id,startedAt:date,levelSha256:levelSha256(level)}},result:{value:{accepted}}});h.terminalByAttempt.a=row('a','2026-01-01T00:00:00Z');h.terminalByAttempt.b=row('b','2026-01-02T00:00:00Z');h.terminalByAttempt.c=row('accepted','2026-01-03T00:00:00Z',true);assert.equal(api.latestReverseFailedAttempt(h,level.id).request.value.id,'b');assert.throws(()=>api.latestReverseFailedAttempt(h,1));h.terminalByAttempt.d=row('tied','2026-01-02T00:00:00Z');assert.throws(()=>api.latestReverseFailedAttempt(h,level.id));
 });
 await test('exact-factory-diff-and-preserved-model-graph-mathematics',async()=>{
  const oldFactory=(await bytes(T+'reverse-fixed-stock-factory-v2.mjs')).toString(),currentFactory=(await bytes(api.FACTORY)).toString();let expected=oldFactory;
  for(const[a,b]of [["'./reverse-fixed-stock-task-v2.mjs'","'./reverse-fixed-stock-task-v3.mjs'"],["'./plan-history-adapter-v5.mjs'","'./plan-history-adapter-v7.mjs'"],["'closed-fixed-inventory-first-full-reverse-v1'","'closed-fixed-inventory-first-full-reverse-v3'"],['assert([2,3].includes(declaration.targetDifficulty))','assert([1,2,3].includes(declaration.targetDifficulty))'],['floor:declaration.targetDifficulty===2?21:31,upper:declaration.targetDifficulty===2?30:null','floor:declaration.targetDifficulty===1?16:declaration.targetDifficulty===2?21:31,upper:declaration.targetDifficulty===1?20:declaration.targetDifficulty===2?30:null']]){assert(expected.includes(a));expected=expected.replaceAll(a,b);}assert.equal(currentFactory,expected);assert.equal(sha(currentFactory),api.REVERSE_V3_FACTORY_DESCRIPTOR.sha256);
  const oldTask=(await bytes(T+'reverse-fixed-stock-task-v2.mjs')).toString(),currentTask=(await bytes(api.SELF)).toString();const math=s=>s.slice(s.indexOf('  assert.equal(upper.level,report.level);'),s.indexOf('\n }catch(e){if('));assert.equal(math(currentTask),math(oldTask).replace('nativeOriginalLowerStage(upper.U','reverseOriginalLowerStage(upper.U'));
  const lower=s=>s.slice(s.indexOf('export function assertReverseLowerReceipt('),s.indexOf('\nfunction trackedFile'));assert.equal(lower(currentTask),lower(oldTask).replace('lower.floor,target===2?21:31','lower.floor,reverseTargetBand(target).floor'));
  for(const name of ['reverseRecipeExecutionIdentity','assertReverseLedgerPreflight']){const body=s=>{const i=s.indexOf('export '+(name==='assertReverseLedgerPreflight'?'async ':'')+'function '+name+'(');return s.slice(i,s.indexOf('\n}',i)+2);};assert.equal(body(currentTask),body(oldTask));}
  assert.equal(api.LOWER_BUDGET.maxStates,9999);
  const prior=await json(V+'proof/reverse-fixed-stock-v2-independent-01/report.json');assert.equal(prior.status,'INDEPENDENT_REVERSE_FIXED_STOCK_TASK_V2_PASS');assert.deepEqual(prior.errors,[]);assert.equal(prior.toolBindings[T+'reverse-fixed-stock-factory-v2.mjs'],sha(oldFactory));assert.equal(prior.toolBindings[T+'reverse-fixed-stock-task-v2.mjs'],sha(oldTask));
 });
 const compiled=await build({entryPoints:[api.SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const f of Object.keys(compiled.metafile.inputs)){const p=f.replaceAll('\\','/');toolBindings[p]=sha(await bytes(p));}
 await bytes(SELF);
 const inherited=await json(V+'proof/execution-policy-reviews/181-01/review.json');assert.equal(inherited.frozenToolchainBindingVerification.count,36);for(const[p,h]of Object.entries(inherited.frozenToolchainBindingVerification.bindings)){assert.equal(sha(await bytes(p)),h);toolBindings[p]=h;}
 for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h);
 const report={status:'REVERSE_FIXED_STOCK_V3_METADATA_PRIVATE_PASS',errors:[],evidence,tests:evidence.length,toolBindings,fileBindings,priorMathematicalQualification:{path:V+'proof/reverse-fixed-stock-v2-independent-01/report.json',sha256:fileBindings[V+'proof/reverse-fixed-stock-v2-independent-01/report.json']},oldMathematicsReexecuted:false,newRealConstructions:0,newSyntheticConstructions:0,newWorlds:0,newModels:0,newSearches:0,newReplayCalls:0,publicClaimsStarted:0,historyLoads:0,productionStockDeclared:false,productionQualified:false,closedProductionScopeReviewed:false,limitations:['Pure metadata tests reuse existing tiny receipt objects without creating or moving a level.','No real post72 report, production declaration, source5 reuse permission or actual plan is asserted.','Factory diff is exhaustive; numerical bands and authority/history module bindings are the only changes.','No performance improvement or future construction success is claimed.']};
 const p=path.join(out,'report.json');await fs.writeFile(p,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({report:p,sha256:sha(await fs.readFile(p)),tests:evidence.length,files:Object.keys(fileBindings).length,tools:Object.keys(toolBindings).length}));return report;
 }catch(e){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({status:'REVERSE_V3_METADATA_PRIVATE_FAIL',error:e.stack,evidence,fileBindings,newModels:0,newSearches:0},null,2)+'\n',{flag:'wx'});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await runMetadataTests(process.argv[2]);

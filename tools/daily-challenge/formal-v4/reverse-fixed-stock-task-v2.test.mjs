import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sync from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prepareReverseStockTask,runReverseStockTask,VERSION,SELF,FACTORY,REVERSE_V2_FACTORY_DESCRIPTOR,assertReverseV2ProductionChoice,assertReverseLedgerPreflight,reverseRecipeExecutionIdentity,assertReverseFormedWorldArchive} from './reverse-fixed-stock-task-v2.mjs';
import {reverseRecipeExecutionIdentity as oldIdentity} from './reverse-fixed-stock-task.mjs';
import {PLAN_HISTORY_VERSION,PLAN_HISTORY_REVIEW_STATUS,planHistorySummary,consumePlanHistory,mergePlanHistoryDelta} from './plan-history-adapter-v5.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {quoteReverseWorldCreation} from './reverse-construction-reservations.mjs';
import {sha,HISTORY_LEDGER_ROOTS,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER} from './low-twenty-io.mjs';
const out=process.env.REVERSE_STOCK_V2_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const runtime=await loadV4Runtime(),evidence=[],colours=['red','blue','green','yellow','purple','orange','pink','cyan'];
const expectedOldTask='07d9e39e5bb7007f99daea7f967f12b6e320aceab3d30e42b4bedc62a4b060f1';
const doc=async(p,q)=>{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});return{path:p,sha256:sha(await fs.readFile(p))};};
const publicCount=async()=> (await fs.readdir(HISTORY_LEDGER_ROOTS[0])).filter(x=>x.endsWith('.request.json')).length;
const beforePublic=await publicCount();
async function fixture(name,{upperBudget={},historyLevel=null,qualificationClockCase,qualificationFailureCase}={}){
 const root=path.resolve(out,name),scope={baseDirectory:root,roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:path.join(root,'ledgers',id),aliases:[]}))};for(const r of scope.roots)await fs.mkdir(r.physicalPath,{recursive:true});
 const namespace=scope.roots[0].physicalPath.replaceAll('\\','/').toLowerCase();
 const b={version:PLAN_HISTORY_VERSION,scope,baselinePlan:{path:path.join(root,'old-plan.json'),sha256:sha('plan')},baselineActual:{path:path.join(root,'old-actual.json'),sha256:sha('actual')},publicNamespace:namespace,files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false,baselineFields:{publicStocks:[],previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]}};
 if(historyLevel){const d=await doc(path.join(root,'old-world.json'),{level:historyLevel});b.files.push({...d,rootId:null,aliases:[d.path]});b.archivedBindings[d.path]=d.sha256;b.nearPools.history.push({descriptor:d,field:'level',level:historyLevel,sourceLevelId:997661,reference:null,fingerprints:sealedWorldIdentity(historyLevel)});}
 const checkpoint=await doc(path.join(root,'checkpoint.json'),b),review=await doc(path.join(root,'review.json'),{status:PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:planHistorySummary(b),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
 const syntheticSource=await doc(path.join(root,'toy-source.json'),{id:997661,width:4,height:2,blocks:[]});
 const declaration=await doc(path.join(root,'toy-declaration.json'),{recipeId:name,sourceLevelId:997661,inventory:colours.map(color=>({id:'q-'+color,color,shape:[[0,0]]})),gates:colours.map((color,i)=>({id:'q-g-'+color,color,side:i<4?'top':'bottom',offset:i%4,size:1})),insertionOrder:['red','blue','orange','purple','green','yellow','pink','cyan'].map(c=>'q-'+c),parkingBodyIds:colours.map(c=>'q-'+c),strategy:{name:'finite-cross-colour-access-v1',missingWindow:2,maximumTargetsPerBody:4,parkingBodiesMaximum:2,parkingTargetsPerBody:2,maxParkingDrags:48,queuePolicy:'fill-first-diverse'},qualificationFixture:'eight-colour-cycle-one-parking'});
 const c={version:VERSION,qualificationOnly:true,experimentId:'reverse-private-'+name,sourceLevelId:997661,targetDifficulty:3,maximumCompletePhysicalInputs:1,fallbackAllowed:false,failedInputRebandAllowed:false,history:checkpoint,historyReview:review,historyScope:scope,historyHeadSha256:checkpoint.sha256,historyDeltas:[],constructorRootId:'late',syntheticSource,declaration,upperBudget};
 if(qualificationClockCase)c.qualificationClockCase=qualificationClockCase; if(qualificationFailureCase)c.qualificationFailureCase=qualificationFailureCase;
 const context=await doc(path.join(root,'context.json'),c),plan=await prepareReverseStockTask(runtime,context,{qualificationOnly:true}),planDescriptor=await doc(path.join(root,'plan.json'),plan);return{root,scope,c,context,plan,planDescriptor,output:path.join(root,'actual-private')};
}
test('B/D3 only; stable old recipe key; lexical plus physical namespace preflight is read-only',async()=>{
 assertReverseV2ProductionChoice({sourceLevelId:52,stockId:'source52-stock-b',targetDifficulty:3});
 for(const c of [{sourceLevelId:52,stockId:'source52-stock-a',targetDifficulty:3},{sourceLevelId:52,stockId:'source52-stock-c',targetDifficulty:2},{sourceLevelId:52,stockId:'source52-stock-b',targetDifficulty:2}])assert.throws(()=>assertReverseV2ProductionChoice(c));
 const recipe=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/proof/reverse-fixed-stock-task-private-03/u1/plan.json')).recipe;
 const oldKey=oldIdentity(recipe);assert.equal(reverseRecipeExecutionIdentity(recipe),oldKey);
 const renamed=structuredClone(recipe);renamed.recipeId='different';renamed.targetDifficulty=2;renamed.budget.maxStates=1;const ids=new Map(renamed.inventory.map((b,i)=>[b.id,'renamed-'+i]));renamed.inventory.forEach(b=>b.id=ids.get(b.id));renamed.insertionOrder=renamed.insertionOrder.map(x=>ids.get(x));renamed.parkingBodyIds=renamed.parkingBodyIds.map(x=>ids.get(x));renamed.board.gates.forEach((g,i)=>g.id='gate-'+i);assert.equal(reverseRecipeExecutionIdentity(renamed),oldKey);
 const root=path.resolve(out,'namespace-private'),pub=path.join(root,'public'),late=path.join(root,'late'),alias=path.join(root,'alias');await fs.mkdir(late,{recursive:true});await fs.mkdir(pub);await fs.symlink(late,alias,'junction');
 assert.equal(await assertReverseLedgerPreflight({qualificationOnly:true,publicDirectory:pub,constructorDirectory:late,ledgerDirectory:alias}),alias);assert.deepEqual(await fs.readdir(late),[]);
 const actualLate=await fs.realpath(LATE_PREFIX_CONSTRUCTION_LEDGER),actualPublic=await fs.realpath(PUBLIC_LEDGER);
 assert.notEqual(path.resolve(actualLate),path.resolve(LATE_PREFIX_CONSTRUCTION_LEDGER),'This focused regression must run in the frozen cwd');
 await assert.rejects(assertReverseLedgerPreflight({qualificationOnly:false,publicDirectory:actualPublic,constructorDirectory:actualLate,ledgerDirectory:actualLate}),/lexical namespace/);
 await assertReverseLedgerPreflight({qualificationOnly:false,publicDirectory:actualPublic,constructorDirectory:actualLate,ledgerDirectory:LATE_PREFIX_CONSTRUCTION_LEDGER});
 await assert.rejects(assertReverseLedgerPreflight({qualificationOnly:true,publicDirectory:pub,constructorDirectory:actualLate,ledgerDirectory:LATE_PREFIX_CONSTRUCTION_LEDGER}));
 evidence.push({name:'B-only-and-old-stable-key-and-frozen-lexical-preflight',passed:true,productionPreflightOnly:true,productionWrites:0});
});

test('owned exception after claim/locks seals every actual file without starting a world; retry blocked',async()=>{
 const f=await fixture('after-locks',{qualificationFailureCase:'after-construction-locks'}),tracked={...runtime,PuzzleModel:class{constructor(){throw Error('MODEL_MUST_NOT_RUN');}},replayRevisedRoute(){throw Error('REPLAY_MUST_NOT_RUN');}};
 const q=await runReverseStockTask(tracked,f.planDescriptor,f.output,{qualificationOnly:true});assert.equal(q.status,'REVERSE_FIXED_STOCK_TERMINAL');assert.deepEqual(q.errors,['synthetic-after-construction-locks']);assert.equal(q.attempt,null);assert.deepEqual(q.formedWorlds,[]);assert.deepEqual(q.nonIdentityWorlds,[]);assert.equal(q.L,null);assert.equal(q.U,null);
 const co=JSON.parse(await fs.readFile(q.constructionOwner.path)),terminal=co.closedCampaigns[0];assert.equal(terminal.consumedInputs,0);assert.equal(terminal.maximumInputs,1);assert.equal(terminal.closed,true);assert.deepEqual(terminal.raw.nonIdentityWorlds,[]);
 for(const d of co.files)assert.equal(sha(await fs.readFile(d.path)),d.sha256);assert(co.files.some(d=>d.path.endsWith('.claim.json')));assert(co.files.some(d=>path.basename(d.path).startsWith('reverse-recipe-')));assert(co.files.some(d=>path.basename(d.path).startsWith('experiment-')));assert(co.files.some(d=>d.path.endsWith('.result.json')));
 await assert.rejects(runReverseStockTask(tracked,f.planDescriptor,path.join(f.root,'retry-private'),{qualificationOnly:true}),/Unknown owner\/member|FIXED_RECIPE_ALREADY_STARTED/);assert(!sync.existsSync(path.join(f.root,'retry-private')));
 const af=await fixture('archive-review',{upperBudget:{maxStates:1},qualificationFailureCase:'archive-review'}),aq=await runReverseStockTask(tracked,af.planDescriptor,af.output,{qualificationOnly:true});assert.equal(aq.status,'REVERSE_ARCHIVE_VALIDATION_TERMINAL');assert.equal(aq.archiveValidation.valid,false);assert.equal(aq.adminClosureRequired,true);assert.equal(aq.accepted,false);assert.equal(aq.nonIdentityWorlds,null);assert.equal(aq.formedWorlds.length,1);assert.equal(aq.attempt,null);const ao=JSON.parse(await fs.readFile(aq.constructionOwner.path));assert.equal(ao.closedCampaigns[0].raw.archiveValidation.valid,false);assert.equal(ao.closedCampaigns[0].raw.adminClosureRequired,true);assert(ao.files.some(d=>d.path===aq.formedWorlds[0].path));assert(sync.existsSync(path.join(af.output,'completion.json')));for(const d of ao.files)assert.equal(sha(await fs.readFile(d.path)),d.sha256);
 evidence.push({name:'private-owned-exceptions-and-archive-assertion-still-closed-no-model',passed:true,constructionOwner:q.constructionOwner,archiveFailureOwner:aq.constructionOwner,receipt:{path:path.join(f.output,'candidate.json'),sha256:sha(await fs.readFile(path.join(f.output,'candidate.json')))},syntheticConstructionClaims:2,syntheticModelCalls:0});
});

test('sole prepaid empty is fully archived; tampering rejected; unchanged v5 retains file and nonidentity closure',async()=>{
 const f=await fixture('empty-cap',{upperBudget:{maxStates:1}});let models=0;const tracked={...runtime,PuzzleModel:class{constructor(){models++;throw Error('MODEL_MUST_NOT_RUN');}},replayRevisedRoute(){throw Error('REPLAY_MUST_NOT_RUN');}};
 const q=await runReverseStockTask(tracked,f.planDescriptor,f.output,{qualificationOnly:true});assert.equal(q.accepted,false);assert.equal(q.attempt,null);assert.equal(q.U,null);assert.equal(q.L,null);assert.equal(models,0);assert.equal(q.formedWorlds.length,1);assert.match(q.errors.join(' '),/worlds-exhausted/);
 const rows=await Promise.all(q.formedWorlds.map(async descriptor=>({descriptor,bytes:await fs.readFile(descriptor.path)}))),co=JSON.parse(await fs.readFile(q.constructionOwner.path)),record=JSON.parse(rows[0].bytes);assert(!Object.hasOwn(record,'level'));assert.deepEqual(record.emptyConstructionWorld,{...f.plan.recipe.board,blocks:[]});assert.deepEqual(record.creation.quote,quoteReverseWorldCreation('empty-normal-mask'));assert.equal(q.construction.totalReserved.worlds,1);
 const options={accounting:q.construction,ownerFiles:co.files,terminalNonIdentityWorlds:q.nonIdentityWorlds};assert.equal(assertReverseFormedWorldArchive(f.plan.recipe,rows,options).physicalWorldRecords,0);
 for(const edit of [r=>r.creation.ordinal=1,r=>r.creation.reservedWorlds=0,r=>r.creation.quote.worlds=0,r=>r.factory.sha256='0'.repeat(64),r=>r.emptyConstructionWorld.gates[0].color='pink',r=>r.emptyConstructionWorld.blocks.push({id:'hidden',x:0,y:0,color:'red',shape:[[0,0]]}),r=>r.level=r.emptyConstructionWorld,r=>{r.level=r.emptyConstructionWorld;delete r.emptyConstructionWorld;}]){
  const altered=structuredClone(record);edit(altered);const bytes=Buffer.from(JSON.stringify(altered)),descriptor={...rows[0].descriptor,sha256:sha(bytes)},ownerFiles=co.files.map(d=>d.path===descriptor.path?descriptor:d);assert.throws(()=>assertReverseFormedWorldArchive(f.plan.recipe,[{descriptor,bytes}],{...options,ownerFiles}));
 }
 assert.throws(()=>assertReverseFormedWorldArchive(f.plan.recipe,[...rows,...rows],options));
 assert.throws(()=>assertReverseFormedWorldArchive(f.plan.recipe,rows,{...options,ownerFiles:[]}));
 const badAccounting=structuredClone(q.construction);badAccounting.session.originalMeter.reservations[0].worlds=0;assert.throws(()=>assertReverseFormedWorldArchive(f.plan.recipe,rows,{...options,accounting:badAccounting}));
 const readBytes=p=>fs.readFile(p),state=await consumePlanHistory({checkpoint:f.c.history,review:f.c.historyReview,expectedScope:f.scope,readBytes});
 const files=co.files.map(d=>({...d,rootId:f.scope.roots.find(r=>path.resolve(d.path).startsWith(path.resolve(r.physicalPath)+path.sep))?.id??null,aliases:[d.path]}));
 const declaredOwner={id:co.id,namespace:co.namespace,kind:co.kind,definition:q.constructionOwner},delta={version:PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner:declaredOwner,files,terminalRecords:[],fullWorlds:[],closedCampaigns:co.closedCampaigns};
 const deltaDescriptor=await doc(path.join(f.root,'empty-owned.delta.json'),delta),listing=Object.fromEntries(f.scope.roots.map(r=>[r.id,files.filter(d=>d.rootId===r.id).map(d=>d.path)]));
 const merged=await mergePlanHistoryDelta(state,{descriptor:deltaDescriptor,declaredOwner,listing,readBytes});assert.equal(merged.fullWorlds.length,0);assert.equal(merged.publicStocks.length,0);assert.equal(merged.closedCampaigns.length,1);assert(merged.bundle.files.some(d=>d.path===rows[0].descriptor.path&&d.sha256===rows[0].descriptor.sha256));assert.deepEqual(merged.closedCampaigns[0].raw.nonIdentityWorlds,q.nonIdentityWorlds);assert.deepEqual(state.closedCampaigns,[]);
 evidence.push({name:'one-actual-private-empty-reservation-no-model-full-bytes-v5-retention',passed:true,constructionOwner:q.constructionOwner,delta:deltaDescriptor,nonIdentityWorlds:q.nonIdentityWorlds,reservedWorlds:1,physicalWorlds:0,syntheticModelCalls:models,negativeMutations:11});
});

test('old source pins and complete declared narrow changes; math bodies remain unchanged',async()=>{
 const handoff='deliverables/daily-formal-v4-20261008/proof/reverse-fixed-stock-v2-handoff-01/';
 for(const [oldFile,newFile,changeFile,expectedHash]of [['reverse-fixed-stock-task.mjs','reverse-fixed-stock-task-v2.mjs','task-changes.json','07d9e39e5bb7007f99daea7f967f12b6e320aceab3d30e42b4bedc62a4b060f1'],['reverse-fixed-stock-factory.mjs','reverse-fixed-stock-factory-v2.mjs','factory-changes.json','0b60a6a1565644062ef392a9a85f49fbf1339c071f8d39dbe6a72618267eb7c2']]){
  let old=await fs.readFile('tools/daily-challenge/formal-v4/'+oldFile,'utf8');assert.equal(sha(old),expectedHash);const changes=JSON.parse(await fs.readFile(handoff+changeFile));for(const c of changes){if(c.endOnly){assert(old.endsWith(c.from));old=old.slice(0,-c.from.length)+c.to;}else{assert.equal(old.split(c.from).length-1,c.occurrences,c.label);old=old.replaceAll(c.from,c.to);}}assert.equal(old,await fs.readFile('tools/daily-challenge/formal-v4/'+newFile,'utf8'));}
 const source=await fs.readFile(SELF,'utf8'),prior=await fs.readFile('tools/daily-challenge/formal-v4/reverse-fixed-stock-task.mjs','utf8');
 const body=s=>s.slice(s.indexOf('  assert.equal(upper.level,report.level);'),s.indexOf('\n }catch(e){if('));assert.equal(body(source),body(prior));assert.equal(sha(await fs.readFile(FACTORY)),REVERSE_V2_FACTORY_DESCRIPTOR.sha256);
 evidence.push({name:'two-file-complete-diff-no-search-or-budget-change',passed:true,oldTask:expectedOldTask,oldFactory:'0b60a6a1565644062ef392a9a85f49fbf1339c071f8d39dbe6a72618267eb7c2'});
});

test.after(async()=>{
 const toolBindings={...runtime.toolchainBindings},compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const f of Object.keys(compiled.metafile.inputs))toolBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));const fileBindings={...toolBindings};
 for(const f of ['tools/daily-challenge/formal-v4/reverse-fixed-stock-task-v2.test.mjs','tools/daily-challenge/formal-v4/reverse-fixed-stock-task.mjs','tools/daily-challenge/formal-v4/reverse-fixed-stock-factory.mjs',...['task-changes.json','factory-changes.json'].map(n=>'deliverables/daily-formal-v4-20261008/proof/reverse-fixed-stock-v2-handoff-01/'+n)])fileBindings[f]=sha(await fs.readFile(f));
 const afterPublic=await publicCount();assert.equal(afterPublic,beforePublic);await doc(path.join(out,'report.json'),{status:evidence.length===4?'REVERSE_FIXED_STOCK_TASK_V2_PRIVATE_PASS':'INCOMPLETE',errors:evidence.length===4?[]:['Incomplete focused checks'],evidence,tests:evidence.length,toolBindings,fileBindings,qualificationOnly:true,productionQualified:false,closedProductionScopeReviewed:false,newRealConstructions:0,newSearches:0,publicClaimsStarted:0,syntheticModelCalls:0,syntheticPrivateConstructionClaims:3,syntheticEmptyWorlds:2,positiveLowerSearchPerformed:false,source52Executed:false,largeCheckpointRead:false,searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,publicRequestCountBefore:beforePublic,publicRequestCountAfter:afterPublic,limitations:['Only private initial empty worlds were created under one-world caps; no model/replay/solver was called.','Old model qualification evidence is reused; new B source52 has not been prepared or constructed.','No full production checkpoint was consumed. New tool and exact B plan still require independent review.']});
});

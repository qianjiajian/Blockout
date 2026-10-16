import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import * as task from './reverse-fixed-stock-task-v4.mjs';
import {createReverseRawCountingFixture} from './reverse-fixed-stock-factory-v4.mjs';
import {independentReplay,levelSha256} from '../formal-v2/contract.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',SELF=T+'reverse-fixed-stock-v4.counting.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
export async function runCountingTests(out){
 assert(path.resolve(out).startsWith(path.resolve(V,'proof')+path.sep));await fs.mkdir(out,{recursive:false});
 const fileBindings={},evidence=[],rawReports=[];let runtime;
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return b;};
 const json=async p=>JSON.parse(await bytes(p));
 const save=async(name,q)=>{const f=path.join(out,name+'.json');await fs.writeFile(f,JSON.stringify(q,null,2)+'\n',{flag:'wx'});return{path:f,sha256:sha(await bytes(f))};};
 const test=async(name,fn)=>{const result=await fn();evidence.push({name,passed:true,evidence:await save(name,result??{})});};
 const observe=(l,options)=>{const q=createReverseRawCountingFixture(runtime,l,options);rawReports.push(q);return q;};
 try{
  runtime=await loadV4Runtime();const proto=runtime.PuzzleModel.prototype,descriptors=Object.getOwnPropertyDescriptors(proto);
  const saved=await json(V+'proof/reverse-fixed-stock-task-private-03/u1/actual-private/candidate.json'),level=saved.level;
  const tiny=(blocks)=>({...copy(level),id:997664,width:2,height:2,gates:[{id:'red-gate',side:'top',offset:0,size:2,color:'red'}],blocks});
  const atom=(id,x,y)=>({id,x,y,color:'red',shape:[[0,0]]});
  await test('first-insert-and-copy-snapshot-dedup',()=>{
   const o=observe(level);o.admitInitial(level.blocks);o.admitInitial(copy(level.blocks));assert.equal(o.report().distinctStates,1);
   let model;o.scope(()=>{model=new runtime.PuzzleModel(copy(level));const a=model.snapshot(),b=model.snapshot();assert.deepEqual(a,b);});
   assert.equal(o.report().distinctStates,1);assert(o.report().duplicateAdmissions>=2);assert.equal(o.report().modelInstances,1);
   assert.equal(Object.getOwnPropertyDescriptor(model,'blocks').get,undefined);assert.deepEqual(Object.getOwnPropertyDescriptors(proto),descriptors);return o.report();
  });
  await test('same-colour-ids-and-absent-not-quotiented',()=>{
   const l=tiny([atom('a',0,1),atom('b',1,1)]),o=observe(l);o.admitInitial(l.blocks);
   o.admitInitial([atom('a',1,1),atom('b',0,1)]);o.admitInitial([atom('a',0,1)]);o.admitInitial([atom('b',0,1)]);o.admitInitial([]);
   assert.equal(o.report().distinctStates,5);assert.equal(new Set(o.report().events.map(e=>e.keySha256)).size,5);return o.report();
  });
  await test('actual-intermediate-removal-and-dynamic-snapshot-stages',()=>{
   const l=tiny([atom('a',0,0)]),o=observe(l);o.admitInitial(l.blocks);let model;
   o.scope(()=>{model=new runtime.PuzzleModel(copy(l));model.startCountdown();model.beginAction();assert(model.tryExit('a','top').ok);assert(model.commitAction());assert(model.snapshot().complete);});
   const r=o.report(),reasons=r.events.map(e=>e.reason);for(const k of ['model-started','model-autonomousStarted','model-block-removal','model-cleared','model-complete'])assert(reasons.includes(k),k);
   assert.equal(r.distinctStates,6);assert.equal(model.cleared,1);assert.deepEqual(Object.getOwnPropertyDescriptors(proto),descriptors);return r;
  });
  await test('cap-before-spatial-mutation-sticky-and-restored',()=>{
   const l=tiny([atom('a',0,1)]),o=observe(l,{limit:1});o.admitInitial(l.blocks);let model;
   assert.throws(()=>o.scope(()=>{model=new runtime.PuzzleModel(copy(l));model.beginAction();model.moveBlockStep('a',1,1);}),/distinct-worlds/);
   assert.equal(model.getBlock('a').x,0);assert.equal(model.started,false);assert.equal(o.report().distinctStates,1);assert.throws(()=>o.scope(()=>{}),/distinct-worlds/);
   assert.deepEqual(Object.getOwnPropertyDescriptors(proto),descriptors);assert.equal(Object.getOwnPropertyDescriptor(model.getBlock('a'),'x').get,undefined);return o.report();
  });
  await test('invalid-operation-no-new-state-and-rejected-endpoint-kept',()=>{
   const l=tiny([atom('a',0,1)]),o=observe(l);o.admitInitial(l.blocks);let endpoint;
   // Admission precedes the complete endpoint clone, even though the later
   // first-contact contract rejects the requested nonempty exit path.
   o.admitInitial(l.blocks,{id:'a',x:0,y:0},'rejected-endpoint');endpoint={...copy(l),blocks:[atom('a',0,0)]};
   o.scope(()=>{const m=new runtime.PuzzleModel(copy(endpoint));assert.equal(m.moveBlockStep('a',-1,0),false);assert.equal(m.tryExit('a','bottom').ok,false);});
   assert.equal(o.report().distinctStates,2);assert.throws(()=>{assert.equal(endpoint.blocks[0].y,1,'synthetic first-contact rejection');});assert.equal(o.report().distinctStates,2);return o.report();
  });
  await test('one-original-dual-replay-shared-set-and-hook-coverage',()=>{
   const o=observe(level);o.admitInitial(level.blocks);let canonical,independent,afterCanonical;
   o.scope(()=>{o.setLabel('canonical');canonical=runtime.replayRevisedRoute(level,saved.drags);afterCanonical=o.report().distinctStates;o.setLabel('independent');independent=independentReplay(runtime,level,saved.drags);});
   assert.deepEqual(canonical,saved.route.canonicalReplay);assert.deepEqual(independent,saved.route.independentReplay);assert.equal(o.report().distinctStates,afterCanonical);
   const steps=saved.drags.reduce((n,d)=>n+d.path.length,0),exits=saved.drags.filter(d=>d.exitSide).length,r=o.report();
   for(const k of ['canonical','independent']){assert.equal(r.operations[k+':moveBlockStep'],steps);assert.equal(r.operations[k+':set-blocks'],exits);assert.equal(r.operations[k+':set-cleared'],exits);assert(r.operations[k+':snapshot']>0);}
   assert.equal(r.modelInstances,2);assert.deepEqual(Object.getOwnPropertyDescriptors(proto),descriptors);return{canonical,independent,accounting:r,originalSavedWitnessOnly:true,newSearches:0};
  });
  await test('nested-scope-unknown-domain-and-throw-restoration',()=>{
   const l=tiny([atom('a',0,1)]),o=observe(l);o.admitInitial(l.blocks);
   assert.throws(()=>o.scope(()=>o.scope(()=>{})),/Nested/);assert.deepEqual(Object.getOwnPropertyDescriptors(proto),descriptors);
   assert.throws(()=>o.scope(()=>{const m=new runtime.PuzzleModel(copy(l));assert.equal(m.getBlock('a').x,0);throw Error('synthetic-callback-throw');}),/synthetic-callback/);assert.deepEqual(Object.getOwnPropertyDescriptors(proto),descriptors);
   const bad=copy(l);bad.blocks[0].frozen=1;assert.throws(()=>createReverseRawCountingFixture(runtime,bad));
   const altered={...descriptors.snapshot,value:function(){}};Object.defineProperty(proto,'snapshot',altered);
   try{assert.throws(()=>o.scope(()=>{}),/prototype changed/);}finally{Object.defineProperty(proto,'snapshot',descriptors.snapshot);}
   assert.deepEqual(Object.getOwnPropertyDescriptors(proto),descriptors);return o.report();
  });
  await test('unchanged-forward-body-graph-lower-and-physical-recipe-identity',async()=>{
   const old=await import('./reverse-fixed-stock-task-v3.mjs'),oldFactory=(await bytes(T+'reverse-fixed-stock-factory-v3.mjs')).toString(),newFactory=(await bytes(task.FACTORY)).toString();
   const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));assert.equal(section(newFactory,' function forwardBody(','\n function forward('),section(oldFactory,' function forwardBody(','\n function forward('));
   const oldTask=(await bytes(old.SELF)).toString(),newTask=(await bytes(task.SELF)).toString();assert.equal(section(newTask,'export function assertReverseLowerReceipt(','\nfunction trackedFile'),section(oldTask,'export function assertReverseLowerReceipt(','\nfunction trackedFile'));
   assert.equal(section(newTask,'  assert.equal(upper.level,report.level);','\n }catch(e){if('),section(oldTask,'  assert.equal(upper.level,report.level);','\n }catch(e){if('));
   const plan=await json(V+'proof/reverse-fixed-stock-task-private-03/u1/plan.json');assert.equal(task.reverseRecipeExecutionIdentity(plan.recipe),old.reverseRecipeExecutionIdentity(plan.recipe));
   assert.deepEqual(task.LOWER_BUDGET,old.LOWER_BUDGET);assert.equal(sha(newFactory),task.REVERSE_V4_FACTORY_DESCRIPTOR.sha256);
   return{forwardBodyUnchanged:true,lowerDispatchUnchanged:true,physicalRecipeIdentityUnchanged:true,lowerBudget:task.LOWER_BUDGET};
  });
  assert.deepEqual(Object.getOwnPropertyDescriptors(proto),descriptors);
  const toolBindings={},closure=await build({entryPoints:[task.SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const f of Object.keys(closure.metafile.inputs)){const p=f.replaceAll('\\','/');toolBindings[p]=sha(await bytes(p));}await bytes(SELF);
  for(const[p,h]of Object.entries(runtime.toolchainBindings)){assert.equal(sha(await bytes(p)),h);toolBindings[p]=h;}
  const prior=V+'proof/reverse-fixed-stock-v3-independent-01/report.json';await json(prior);
  for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h,p);
  const report={status:'REVERSE_FIXED_STOCK_V4_COUNTING_PRIVATE_PASS',errors:[],tests:evidence.length,evidence,fileBindings,toolBindings,priorQualification:{path:prior,sha256:fileBindings[prior]},newRealConstructions:0,newProductionStocks:0,newSearches:0,publicClaimsStarted:0,historyLoads:0,privateCanonicalReplays:1,privateIndependentReplays:1,privateModelInstances:rawReports.reduce((n,r)=>n+r.report().modelInstances,0),productionQualified:false,prototypeRestored:true,
   limitations:['Only synthetic <=16-cell/8-body fixtures. No source5/115/124 construction, no lower search.','Original clone/snapshot quote envelope remains separately bounded; only actual labelled snapshot state keys consume raw cap.','The temporary synchronous prototype/property instrumentation is explicit, restored in finally, and only covers the fixed ordinary unclocked domain.','No future yield/performance improvement or production-plan permission is claimed.']};
  const d=await save('report',report);console.log(JSON.stringify({...d,tests:evidence.length,files:Object.keys(fileBindings).length,tools:Object.keys(toolBindings).length}));return report;
 }catch(error){await save('failure',{status:'REVERSE_V4_COUNTING_PRIVATE_FAIL',error:error.stack,evidence,fileBindings,accounting:rawReports.map(r=>r.report()),newRealConstructions:0,newSearches:0,publicClaimsStarted:0});throw error;}
}
/** Metadata-only followup: preserve private02's actual model/replay execution
 * and exact archived sources. Do not rerun its original eight fixtures. */
export async function runPrepaidRecordMetadataTests(out){
 assert(path.resolve(out).startsWith(path.resolve(V,'proof')+path.sep));await fs.mkdir(out,{recursive:false});const fileBindings={},evidence=[];
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return b;};const json=async p=>JSON.parse(await bytes(p));
 try{
  const previousPath=V+'proof/reverse-fixed-stock-v4-private-02/report.json',previous=await json(previousPath);assert.equal(previous.tests,8);assert.deepEqual(previous.errors,[]);
  const archive=V+'proof/reverse-fixed-stock-v4-source02-archive/';
  for(const name of ['reverse-fixed-stock-factory-v4.mjs','reverse-fixed-stock-task-v4.mjs','reverse-fixed-stock-v4.counting.test.mjs'])assert.equal(sha(await bytes(archive+name)),previous.fileBindings[T+name]);
  // Check every old binding, mapping ONLY the three changed source paths to
  // their byte-exact execution snapshot. Old reports are never rewritten.
  const inheritedFileBindings={};for(const[p,h]of Object.entries(previous.fileBindings)){const mapped=p.startsWith(T)&&['reverse-fixed-stock-factory-v4.mjs','reverse-fixed-stock-task-v4.mjs','reverse-fixed-stock-v4.counting.test.mjs'].includes(p.slice(T.length))?archive+p.slice(T.length):p;assert.equal(sha(await bytes(mapped)),h);inheritedFileBindings[mapped]=h;}
  const oldFactory=(await bytes(archive+'reverse-fixed-stock-factory-v4.mjs')).toString(),currentFactory=(await bytes(task.FACTORY)).toString();
  // The execution observer, model methods, original local audit and dual U
  // are byte-identical. Only pre-creation record-ticket bookkeeping changes.
  const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
  for(const[a,b]of [[' function scope(fn){','\n return{scope,'],[' function forwardBody(','\n function forward('],[' function finish(level,drags,inventory){','\n function report()']])assert.equal(section(currentFactory,a,b),section(oldFactory,a,b));
  evidence.push({name:'original-eight-tests-and-replay-observer-bound-to-exact-source02',passed:true});
  const rt=await loadV4Runtime(),saved=await json(V+'proof/reverse-fixed-stock-task-private-03/u1/actual-private/candidate.json'),level=saved.level;
  const o=createReverseRawCountingFixture(rt,level,{limit:1});o.admitInitialForRecord(level.blocks,null,'synthetic-prepay');
  const before=o.report().transitions;assert.throws(()=>o.admitInitial([]),/distinct-worlds/);const afterRejected=o.report().transitions;
  // A sticky stop may arise after creation. Its previously paid original
  // record is still verifiable/persistable without a new guard or debit.
  o.assertPrepaidRecord(level.blocks);assert.equal(o.report().transitions,afterRejected);assert.throws(()=>o.assertPrepaidRecord(level.blocks),/pre-admitted/);
  assert.throws(()=>o.scope(()=>{}),/distinct-worlds/);assert.equal(o.report().recordTicketsIssued,1);assert.equal(o.report().recordTicketsConsumed,1);assert(afterRejected>before);assert.equal(o.report().modelInstances,0);
  evidence.push({name:'prepaid-record-survives-sticky-cap-without-postfull-budget-guard',passed:true,accounting:o.report()});
  const p=createReverseRawCountingFixture(rt,level,{limit:1});p.admitInitial([]);assert.throws(()=>p.admitInitialForRecord(level.blocks,null,'cap-before-builder'),/distinct-worlds/);assert.equal(p.report().recordTicketsIssued,0);assert.throws(()=>p.assertPrepaidRecord(level.blocks),/pre-admitted/);assert.equal(p.report().modelInstances,0);
  evidence.push({name:'cap-refuses-before-record-ticket-and-no-builder-is-authorized',passed:true,accounting:p.report()});
  const oldTask=(await bytes(archive+'reverse-fixed-stock-task-v4.mjs')).toString(),currentTask=(await bytes(task.SELF)).toString();assert.equal(currentTask,oldTask.replace(previous.fileBindings[task.FACTORY],sha(currentFactory)));assert.equal(sha(currentFactory),task.REVERSE_V4_FACTORY_DESCRIPTOR.sha256);
  evidence.push({name:'task-only-updates-factory-digest-no-math-or-owner-diff',passed:true});
  const toolBindings={},closure=await build({entryPoints:[task.SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const f of Object.keys(closure.metafile.inputs)){const k=f.replaceAll('\\','/');toolBindings[k]=sha(await bytes(k));}await bytes(SELF);for(const[k,h]of Object.entries(rt.toolchainBindings)){assert.equal(sha(await bytes(k)),h);toolBindings[k]=h;}
  for(const[k,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(k)),h);
  const report={status:'REVERSE_FIXED_STOCK_V4_COUNTING_PRIVATE_PASS',errors:[],tests:previous.tests+evidence.length,inheritedTests:previous.tests,newMetadataTests:evidence.length,evidence,previousPrivate:{path:previousPath,sha256:fileBindings[previousPath]},source02Archive:archive,inheritedFileBindings,fileBindings,toolBindings,newRealConstructions:0,newSearches:0,newModels:0,newReplayCalls:0,publicClaimsStarted:0,historyLoads:0,oldMathematicsReexecuted:false,originalTinyExecution:{privateCanonicalReplays:previous.privateCanonicalReplays,privateIndependentReplays:previous.privateIndependentReplays,privateModelInstances:previous.privateModelInstances},limitations:['New run is pure coordinate/accounting metadata; no model, replay, graph or production stock dispatched.','Original eight tests remain bound to their exact archived execution sources; observer/local-forward/dual-U bodies are unchanged.','Stage-aware raw keys deliberately refine plain pose/NONE; no equality with original lower rawBoards is claimed.']};
  const f=path.join(out,'report.json');await fs.writeFile(f,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({path:f,sha256:sha(await fs.readFile(f)),tests:report.tests,newMetadataTests:evidence.length,files:Object.keys(fileBindings).length,tools:Object.keys(toolBindings).length}));return report;
 }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:error.stack,evidence,fileBindings,newModels:0,newSearches:0},null,2)+'\n',{flag:'wx'});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv[3]==='--metadata-followup')await runPrepaidRecordMetadataTests(process.argv[2]);else await runCountingTests(process.argv[2]);}

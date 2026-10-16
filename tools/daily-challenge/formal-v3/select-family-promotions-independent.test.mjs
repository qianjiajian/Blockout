import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';

// Execute the actual selector modules with an isolated in-memory filesystem.
// Mathematical qualification is deliberately a sentinel: these tests exercise
// admission/lineage guards only and never call any solver or real selector.
const evidence=[],out=process.env.FAMILY_QUALIFICATION_OUT??await fs.mkdtemp('deliverables/daily-formal-v3-20261008/proof/family-selector-test-');
if(process.env.FAMILY_QUALIFICATION_OUT)await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
 const data=new Map(),ancestry=new Map(),write=(p,v)=>{const bytes=Buffer.from(JSON.stringify(v));data.set(p,bytes);return sha(bytes);};
 const root='deliverables/test/design/origin/candidate-root.json',baseFile='deliverables/test/design/base/candidate-parent.json',childFile='deliverables/test/design/child/candidate-child.json';
 const level={id:105,width:2,height:2,blocks:[{id:'a',shape:[[0,0]],x:0,y:0,color:'red'}],gates:[]};
 const base={accepted:true,difficulty:2,sourceLevelId:105,level,levelSha256:levelSha256(level),drags:[]};write(baseFile,base);
 const parentFile='deliverables/test/selection/parent.json',parent={formalId:'parent-d2',difficulty:2,sourceLevelId:105,level,levelSha256:base.levelSha256,baseLevelSha256:base.levelSha256,baseInputFile:baseFile};
 const parentSHA=write(parentFile,parent),replace={formalId:parent.formalId,receipt:parentFile,receiptSha256:parentSHA,levelSha256:parent.levelSha256,baseLevelSha256:parent.baseLevelSha256,baseInputFile:baseFile,familyRoot:root};
 const child={...base,difficulty:3,replacementOf:replace};write(childFile,child);
 const sourceIndex='deliverables/test/selection/source-index.json',sourceIndexSHA=write(sourceIndex,{files:[parentFile]});
 const promotedFile='deliverables/test/selection/promoted.json',promoted={...parent,formalId:'promoted-d3',difficulty:3,baseInputFile:childFile,familyPromotion:{familyRoot:root,retired:replace,
  proposal:{path:childFile,sha256:sha(data.get(childFile))},sourceIndex:{path:sourceIndex,sha256:sourceIndexSHA}}};write(promotedFile,promoted);
 for(const p of [root,baseFile,childFile])ancestry.set(p,{roots:[root],unknownReasons:[]});
 const index='deliverables/test/selection/current.json',pool='deliverables/test/pool.json';write(index,{files:[parentFile]});write(pool,{records:[{path:childFile,fileSha256:sha(data.get(childFile))}]});
 write('deliverables/daily-formal-v2-20261007/final-qualified/index.json',{entries:[]});
 write('deliverables/daily-formal-v3-20261008/proof/preselection-visual-exclusions.json',{records:[]});
 const fixture={data,ancestry,write,root,base,baseFile,parent,parentFile,child,childFile,promoted,promotedFile,index,pool,qualifierCalls:0};
 fixture.api={levelSha256,
  fs:{readFile:async(p,encoding)=>{if(!data.has(p)){const e=Error(`Missing fixture ${p}`);e.code='ENOENT';throw e;}const b=data.get(p);return encoding?b.toString():b;},
   mkdir:async()=>{},writeFile:async(p,b)=>{data.set(p,Buffer.from(b));},stat:async()=>{throw Error('No blocked physical fixture');}},
  inspect:p=>ancestry.get(p)??{roots:[],unknownReasons:['unresolved-test-ancestry']},
  runtime:{MECHANISM_GUIDE:[{id:'color-exit',unlockLevel:1}],mechanismsUsedByDailyLevel:()=>['color-exit']},
  slots:[{formalId:'test-d3',difficulty:3,stageKey:'mechanisms-color-exit-1',newestMechanism:'color-exit',unlockLevel:1,slot:1},
   {formalId:'test-d2',difficulty:2,stageKey:'mechanisms-color-exit-1',newestMechanism:'color-exit',unlockLevel:1,slot:1}],
  qualify:async()=>{fixture.qualifierCalls++;throw Error('QUALIFIER_REACHED_FAMILY_GUARD');}};
 return fixture;
}
async function execute(file,f){
 const stubs={
  'node:fs/promises':'export default globalThis.__familyFixture.fs;',
  './catalog-contract.mjs':'export const loadV3CatalogRuntime=async()=>globalThis.__familyFixture.runtime; export const qualifyV3Slot=(...a)=>globalThis.__familyFixture.qualify(...a);export const qualifyV3DesignedSlot=qualifyV3Slot;export const auditV3Catalog=async(_r,rows)=>({verified:rows.length,status:"ISOLATED_MATH_STUB"});',
  './reference-lineage.mjs':'export const createReferenceLineageReader=()=>({inspect:p=>globalThis.__familyFixture.inspect(p)});',
  '../formal-v2/contract.mjs':'export const levelSha256=x=>globalThis.__familyFixture.levelSha256(x);',
  '../formal-v2/catalog-progress.mjs':'export const expectedDailySlots=()=>globalThis.__familyFixture.slots;',
  './bounded-proof.mjs':'export const designFingerprints=level=>({designSha256:globalThis.__familyFixture.levelSha256(level),shapeSha256:"test-shape",colorSha256:"test-colour"});',
  './diversity.mjs':'export const describeLayout=()=>({boardOutlineSha256:"test-outline"});export const compareLayouts=()=>({footprintSimilarity:0});'};
 const built=await build({entryPoints:[file],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'isolate-family-tests',setup(b){
  b.onResolve({filter:/.*/},args=>Object.hasOwn(stubs,args.path)?{path:args.path,namespace:'family-stub'}:undefined);
  b.onLoad({filter:/.*/,namespace:'family-stub'},args=>({contents:stubs[args.path],loader:'js'}));
 }}]});
 const oldArgs=process.argv,oldFixture=globalThis.__familyFixture;process.argv=['node',file,f.pool,'isolated-family-fixture',f.index];globalThis.__familyFixture=f.api;
 try{await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text+'\n//'+Math.random()).toString('base64')}`);return null;}
 catch(e){return e.message;}finally{process.argv=oldArgs;globalThis.__familyFixture=oldFixture;}
}
async function check(name,operation){let observation;try{observation=await operation();evidence.push({name,pass:true,...observation});}catch(error){evidence.push({name,pass:false,error:error.message});throw error;}}
const atomic='tools/daily-challenge/formal-v3/select-family-promotions.mjs',ordinary='tools/daily-challenge/formal-v3/select-diverse-pool.mjs';
test('atomic promotion rejects missing exact parent receipt SHA before qualification',()=>check('missing-receipt-binding',async()=>{
 const f=fixture();delete f.child.replacementOf.receiptSha256;f.write(f.childFile,f.child);f.write(f.pool,{records:[{path:f.childFile,fileSha256:sha(f.data.get(f.childFile))}]});
 const error=await execute(atomic,f);assert(error);assert.equal(f.qualifierCalls,0);return{error};
}));
test('atomic promotion rejects a second live representative of the same independent family',()=>check('same-family-two-live',async()=>{
 const f=fixture(),sibling='deliverables/test/selection/sibling.json';f.write(sibling,{...f.parent,formalId:'sibling-d2'});f.write(f.index,{files:[f.parentFile,sibling]});
 const error=await execute(atomic,f);assert.match(error,/sole representative/);assert.equal(f.qualifierCalls,0);return{error};
}));
test('ordinary selector rejects child after parent and parent after promoted child',()=>check('both-live-insertion-orders',async()=>{
 const a=fixture();assert.equal(await execute(ordinary,a),null);assert.equal(a.qualifierCalls,0);
 const b=fixture();b.write(b.index,{files:[b.promotedFile]});b.write(b.pool,{records:[{path:b.baseFile,fileSha256:sha(b.data.get(b.baseFile))}]});
 assert.equal(await execute(ordinary,b),null);assert.equal(b.qualifierCalls,0);return{orders:['parent-then-child','child-then-parent']};
}));
test('a retired family parent cannot re-enter after the promoted child leaves selection',()=>check('historical-retirement-survives-child-removal',async()=>{
 const f=fixture(),oldIndex='deliverables/test/selection/promoted-index.json';
 f.write(oldIndex,{files:[f.promotedFile],familyPromotions:[f.promoted.familyPromotion]});f.write(f.index,{files:[],priorIndex:oldIndex});
 f.write(f.pool,{records:[{path:f.baseFile,fileSha256:sha(f.data.get(f.baseFile))}]});
 const error=await execute(ordinary,f);assert.notEqual(error,'QUALIFIER_REACHED_FAMILY_GUARD','Historical retirement was forgotten before qualification');assert.equal(f.qualifierCalls,0);return{error};
}));
test('historical retirement refuses altered parent bytes and unknown newcomer ancestry',()=>check('history-bindings-and-unknown-lineage',async()=>{
 const a=fixture();a.write(a.index,{files:[a.promotedFile]});a.write(a.parentFile,{...a.parent,levelSha256:'tampered'});
 const bindingError=await execute(ordinary,a);assert.match(bindingError,/Retired parent receipt changed/);assert.equal(a.qualifierCalls,0);
 const b=fixture();b.write(b.index,{files:[b.promotedFile]});b.ancestry.set(b.baseFile,{roots:[],unknownReasons:['unresolved-test-ancestry']});
 // Keep the historical parent resolvable; use a separate newcomer with no ancestry.
 b.ancestry.set(b.baseFile,{roots:[b.root],unknownReasons:[]});const newcomer='deliverables/test/design/unknown/candidate-new.json';b.write(newcomer,b.base);
 b.write(b.pool,{records:[{path:newcomer,fileSha256:sha(b.data.get(newcomer))}]});assert.equal(await execute(ordinary,b),null);assert.equal(b.qualifierCalls,0);
 return{bindingError,unknownAncestryBlocked:true};
}));
test('ordinary selector rejects an already corrupt live parent plus promoted child selection',()=>check('preexisting-promoted-family-duplicate',async()=>{
 const f=fixture();f.write(f.index,{files:[f.parentFile,f.promotedFile]});
 const error=await execute(ordinary,f);assert.match(error,/Two live representatives/);assert.equal(f.qualifierCalls,0);return{error};
}));
test.after(async()=>{const bindings={};for(const file of [atomic,ordinary,'tools/daily-challenge/formal-v3/family-promotion-history.mjs','tools/daily-challenge/formal-v3/select-family-promotions-independent.test.mjs'])bindings[file]=sha(await fs.readFile(file));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===6&&evidence.every(e=>e.pass)?'FAMILY_ADMISSION_GUARDS_QUALIFIED':'FAMILY_ADMISSION_GUARDS_HAVE_FAILURE',
 scope:'Actual selector control flow with isolated file/lineage fixtures; mathematical qualifier is a not-reached sentinel, not mocked proof acceptance evidence',evidence,bindings,newSolverCalls:0,realSelectionWrites:0,formalReady:false},null,2)+'\n',{flag:'wx'});
});

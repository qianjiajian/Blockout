import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadActiveCoreIndex} from './active-region-core-diversity-v3.mjs';
import {assertWholeBoardConstruction} from './axis-ice-active-region-batch-task-v2_1.mjs';

const T='tools/daily-challenge/formal-v4/',P='deliverables/daily-formal-v4-20261008/proof/',SELF=T+'active-region-batch-v2_1.metadata.test.mjs',TASK=T+'axis-ice-active-region-batch-task-v2_1.mjs',CORE=T+'active-region-core-diversity-v3.mjs';
const out=process.env.ACTIVE_REGION_V21_METADATA_OUT;assert(out);await fs.mkdir(out,{recursive:false});const bindings={},checks=[],sha=b=>createHash('sha256').update(b).digest('hex');
async function bytes(p){const b=await fs.readFile(p);bindings[p]=sha(b);return b;}
async function json(p){return JSON.parse(await bytes(p));}
async function save(name,q){const p=out+'/'+name,b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});bindings[p]=sha(b);return{path:p,sha256:sha(b)};}
const original={path:P+'axis-ice-active-region-batch-v2-independent-01/report.json',sha256:'d92f05fdc32888ce8d16f31b7d40912a37b90865b1005af3cbff0f383a2b28cb'},old=await json(original.path);assert.equal(bindings[original.path],original.sha256);
const factoryReportPath=P+'active-region-axis-ice-factory-v2-private-01/report.json',factory=await json(factoryReportPath),base=P+'active-region-axis-ice-factory-v2-private-01/';assert.equal(factory.status,'ACTIVE_REGION_AXIS_ICE_FACTORY_V2_TINY_PASS');
const first=await json(base+'first-full.json'),oldFirst=await json(P+'active-region-axis-ice-factory-private-02/first-full.json');const context=await json('deliverables/daily-formal-v4-20261008/design/axis-ice-active-region-eight-context-01/context.json'),scope=context.historyScope;
const reader={async bound(d){const b=await bytes(d.path);assert.equal(sha(b),d.sha256);return JSON.parse(b);}},history=(d,level)=>({bundle:{scope,files:[{...d,aliases:[d.path],rootId:null}]},closedCampaigns:[{raw:{formedWorldFiles:[d]}}],fullWorlds:[{descriptor:d,field:'level',level}]});

test('task math, limits, overlay and command flow remain byte-identical apart from two imports and identity',async()=>{
 const previous=(await bytes(T+'axis-ice-active-region-batch-task-v2.mjs')).toString(),next=(await bytes(TASK)).toString();assert.equal(bindings[T+'axis-ice-active-region-batch-task-v2.mjs'],'453d0f4bcf607d227fb15547212463209dacdb5639e862b10045def84b7f4ef8');
 const expected=previous.replace("from './axis-ice-active-region-stock-v1.mjs'","from './axis-ice-active-region-stock-v2.mjs'").replace("from './active-region-core-diversity-v2.mjs'","from './active-region-core-diversity-v3.mjs'").replace("export const SELF='tools/daily-challenge/formal-v4/axis-ice-active-region-batch-task-v2.mjs'","export const SELF='tools/daily-challenge/formal-v4/axis-ice-active-region-batch-task-v2_1.mjs'").replace("export const VERSION='active-region-real-axis-body-ice-fixed-64-batch-v2'","export const VERSION='active-region-real-axis-body-ice-fixed-64-batch-v2.1'");assert.equal(next,expected);
 const oldCore=(await bytes(T+'active-region-core-diversity-v2.mjs')).toString(),newCore=(await bytes(CORE)).toString();assert.equal(newCore,oldCore.replace('canonical-bound-original-world-fields-v2','canonical-bound-original-world-fields-active-v1-v2-v3').replace("  if(c?.version!=='joint-active-region-real-body-ice-first-full-v1')continue;","  const supported=['joint-active-region-real-body-ice-first-full-v1','joint-active-region-real-body-ice-first-full-v2'];\n  if(!supported.includes(c?.version)){assert(!String(c?.version??'').startsWith('joint-active-region-'),'Unknown active-region construction version');continue;}"));
 const overlay=T+'active-region-batch-parent-overlay-v1.mjs';await bytes(overlay);assert.equal(bindings[overlay],'b0f9950aa40336aa53d95e74e744d8eb10f7eb063af3af087ab0148838c36455');await save('exact-diff.json',{original,changes:['factory import','core version-aware loader import','SELF','VERSION'],allOtherTaskBytesUnchanged:true,coreChanges:['supported factory versions v1/v2','reject unknown active-region family version','loader version'],oldMathematicsRerun:false});checks.push({name:'exact-minimal-source-difference',pass:true});
});

test('both saved factory generations enter core history; unknown active generation never silently skips',async()=>{
 const v1=await save('saved-v1-construction.json',oldFirst.q),v2=await save('saved-v2-construction.json',first.q);assert.deepEqual(first.q.level,oldFirst.q.level);
 for(const d of [v1,v2])assert.equal((await loadActiveCoreIndex(reader,history(d,first.q.level))).stats().coreRecords,2);
 const unknown=await save('unknown-version-metadata.json',{...first.q,constructionAccounting:{...first.q.constructionAccounting,version:'joint-active-region-real-body-ice-first-full-v999'}});await assert.rejects(()=>loadActiveCoreIndex(reader,history(unknown,first.q.level)),/Unknown active-region construction version/);
 const missing=history(v2,first.q.level);missing.fullWorlds=[];await assert.rejects(()=>loadActiveCoreIndex(reader,missing),/Original full-world field/);await save('core-version-results.json',{savedV1:v1,savedV2:v2,unknown,coreRecordsEach:2,unknownRejected:true,strictFieldMembershipRetained:true,newPhysicalInputs:0});checks.push({name:'saved-v1-v2-history-core-membership',pass:true});
});

test('new task authenticates saved factory first/no/post-full receipts without any construction or math',async()=>{
 const no=await json(base+'no-full-terminals.json'),formed=await json(base+'formed-full-terminals.json'),closed=await json(base+'closed-tiny-naive-and-empty.json');let count=0;
 // The synthetic pre-paid-world exhaustion row deliberately has one prior
 // private world outside this constructor; it is not a task receipt.
 for(const q of [first.q,closed.naive,closed.failed,...no.rows.filter(q=>!q.accounting.kinds['tiny-prior-world']),formed.base,formed.timed,formed.capped]){assertWholeBoardConstruction(q,first.recipe,{qualificationOnly:true});count++;}
 await save('saved-receipts-accepted.json',{count,constructorCalled:false,modelCalled:false,solverCalled:false});checks.push({name:'saved-construction-receipt-contract',pass:true,count});
});

test.after(async()=>{const b=await build({entryPoints:[SELF,TASK],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-only-metadata',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(b.metafile.inputs))toolBindings[p]=sha(await bytes(p));await save('report.json',{status:checks.length===3?'ACTIVE_REGION_BATCH_V2_1_METADATA_PASS':'ACTIVE_REGION_BATCH_V2_1_METADATA_INCOMPLETE',checks,originalQualification:original,newFactoryPrivate:{path:factoryReportPath,sha256:bindings[factoryReportPath]},task:{path:TASK,sha256:bindings[TASK]},core:{path:CORE,sha256:bindings[CORE]},toolBindings,fileBindings:{...bindings},oldMathematicsEvidenceReused:true,oldMathematicsRerun:false,newDomains:0,newConstructions:0,newModels:0,newReplays:0,newSearches:0,newClaims:0,largeCheckpointLoaded:false});});

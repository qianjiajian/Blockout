import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadActiveCoreIndex,SOURCE18_CORE} from './active-region-core-diversity-v2.mjs';
import {loadActiveCoreIndex as oldLoad} from './active-region-core-diversity-v1.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const T='tools/daily-challenge/formal-v4/',P='deliverables/daily-formal-v4-20261008/proof/';
const SELF=T+'active-region-core-history-v2.metadata.test.mjs',TASK=T+'axis-ice-active-region-batch-task-v1_1.mjs',HELPER=T+'active-region-core-diversity-v2.mjs';
const out=process.env.ACTIVE_CORE_HISTORY_V2_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const originalPrivate={path:P+'active-region-axis-ice-task-private-02/report.json',sha256:'a76492933d1184957fe904fc5e81358d51b0e3ffb687fdac9f86662d8cd7f392'};
const originalFactory={path:P+'active-region-axis-ice-factory-private-02/report.json',sha256:'db77d7ca6d1981ff6f2663dbcb8870fe84c34402c38e846a12fa77f100d3ff84'};
const originalDelta={path:P+'route-axis-ice-source100-history-delta-01/construction.delta.json',sha256:'9a7a5eafeac081a27d51b07f13a9b7633d500f2a52132377bd87afd62c6a8956'};
const originalNoFull={path:'deliverables/daily-formal-v4-20261008/design/route-source100-actual-01/construction.json',sha256:'54b627949cce8cc57655d83299d5ff2e006edd9c4a5016fe1c859d71b7cef683'};
const sha=b=>createHash('sha256').update(b).digest('hex'),fileBindings={},checks=[];
const reader={async bound(d){const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,d.path);fileBindings[d.path]=d.sha256;return JSON.parse(b);}};
const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return b;};
const save=async(name,value)=>{const p=out+'/'+name,b=JSON.stringify(value,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});fileBindings[p]=sha(b);return{path:p,sha256:sha(b)};};
const qualified=await reader.bound(originalPrivate);assert.equal(qualified.status,'ACTIVE_REGION_AXIS_ICE_BATCH_TASK_PRIVATE_PASS');assert.equal(qualified.checks.length,11);assert(qualified.checks.every(c=>c.passed));
for(const[p,h]of Object.entries(qualified.toolBindings))assert.equal(sha(await bytes(p)),h,'Original qualified tool changed: '+p);
const factory=await reader.bound(originalFactory),firstPath=P+'active-region-axis-ice-factory-private-02/first-full.json',firstKeys=Object.entries(factory.fileBindings).filter(([p])=>p.replaceAll('\\','/')===firstPath);assert.equal(firstKeys.length,1);
const first=await reader.bound({path:firstKeys[0][0],sha256:firstKeys[0][1]}),built=first.q,originalBuiltHash=levelSha256(built);
const contextPath='deliverables/daily-formal-v4-20261008/design/axis-ice-active-region-eight-context-01/context.json';
const context=JSON.parse(await bytes(contextPath)),scope=context.historyScope;
const delta=await reader.bound(originalDelta),noFull=await reader.bound(originalNoFull),source18=await reader.bound(SOURCE18_CORE.receipt);
const copied=await save('saved-tiny-construction.json',built);
const member=d=>({...d,aliases:[d.path],rootId:null});
const history=(d,worlds=[{descriptor:d,field:'level',level:built.level}])=>({bundle:{scope,files:[member(d)]},closedCampaigns:[{raw:{formedWorldFiles:[d]}}],fullWorlds:worlds});

test('real source100 closed campaign labeled a no-full receipt as formedWorldFiles',async()=>{
 assert.deepEqual(delta.fullWorlds,[]);assert.deepEqual(delta.closedCampaigns[0].raw.formedWorldFiles,[originalNoFull]);
 assert.equal(noFull.found,false);assert.equal(noFull.level,null);assert.equal(noFull.levelSha256,null);assert.equal(noFull.accounting.fullAssignments,0);
 const h={bundle:{scope,files:delta.files},closedCampaigns:delta.closedCampaigns,fullWorlds:delta.fullWorlds};
 await assert.rejects(()=>oldLoad(reader,h),/Closed campaign full-world descriptor must belong to sealed history/);
 const q=await loadActiveCoreIndex(reader,h);assert.equal(q.stats().coreRecords,1);
 await save('real-source100-regression.json',{originalDelta,originalNoFull,originalFound:false,originalFullAssignments:0,oldFailureReproduced:true,newCoreRecords:1,noWorldCreated:true,checkpointLoaded:false});checks.push({name:'real-legacy-no-full',passed:true});
});

test('canonical slash/case aliases and multiple original fields are authenticated separately',async()=>{
 const alias={...copied,path:path.resolve(copied.path).replaceAll('\\','/').toUpperCase()},h=history(copied);
 h.closedCampaigns[0].raw.formedWorldFiles=[alias];h.fullWorlds=[{descriptor:alias,field:'level',level:built.level},{descriptor:copied,field:'level',level:built.level},{descriptor:copied,level:built.level}];
 const q=await loadActiveCoreIndex(reader,h);assert.equal(q.stats().coreRecords,2);
 await assert.rejects(()=>loadActiveCoreIndex(reader,{...h,fullWorlds:[h.fullWorlds[2]]}),/Original full-world field/);
 const multi=await save('two-saved-world-fields.json',{...built,plain:{level:source18.level}}),mh=history(multi,[{descriptor:multi,field:'level',level:built.level},{descriptor:multi,field:'plain.level',level:source18.level}]);
 assert.equal((await loadActiveCoreIndex(reader,mh)).stats().coreRecords,2);
 await assert.rejects(()=>loadActiveCoreIndex(reader,{...mh,fullWorlds:[mh.fullWorlds[1]]}),/Original full-world field.*level/);
 await assert.rejects(()=>loadActiveCoreIndex(reader,{...mh,fullWorlds:[mh.fullWorlds[0]]}),/Original full-world field.*plain.level/);
 const corrupted=structuredClone(mh);corrupted.fullWorlds[1].level=built.level;await assert.rejects(()=>loadActiveCoreIndex(reader,corrupted),/differs from sealed history/);
 await save('canonical-multifield-results.json',{alias,original:copied,twoFields:multi,matchingDuplicatePoolRowsAccepted:true,eachOriginalFieldRequired:true,wrongFieldLevelRejected:true});checks.push({name:'canonical-and-multiple-fields',passed:true});
});

test('missing file, wrong SHA, active no-full and missing real legacy full remain rejected',async()=>{
 const h=history(copied);await assert.rejects(()=>loadActiveCoreIndex(reader,{...h,bundle:{scope,files:[]}}),/sealed file membership/);
 const wrong=structuredClone(h);wrong.closedCampaigns[0].raw.formedWorldFiles[0].sha256='0'.repeat(64);await assert.rejects(()=>loadActiveCoreIndex(reader,wrong),/SHA differs/);
 await assert.rejects(()=>loadActiveCoreIndex(reader,{...h,fullWorlds:[]}),/full-world field/);
 const badField=structuredClone(h);badField.fullWorlds[0].field='placeholderWorld';await assert.rejects(()=>loadActiveCoreIndex(reader,badField),/full-world field/);
 const legacy=await save('saved-legacy-full.json',{...built,constructionAccounting:{...built.constructionAccounting,version:'legacy-metadata-fixture'}});
 assert.equal((await loadActiveCoreIndex(reader,history(legacy))).stats().coreRecords,1);
 await assert.rejects(()=>loadActiveCoreIndex(reader,history(legacy,[])),/full-world field/);
 const activeNull=await save('invalid-active-null.json',{...built,level:null,levelSha256:null});await assert.rejects(()=>loadActiveCoreIndex(reader,history(activeNull,[])),/Active construction requires original level field/);
 const invalidHash=await save('invalid-active-hash.json',{...built,levelSha256:'0'.repeat(64)});await assert.rejects(()=>loadActiveCoreIndex(reader,history(invalidHash)),/level hash mismatch/);
 await save('strict-rejections.json',{missingFileRejected:true,wrongShaRejected:true,missingWorldRejected:true,wrongFieldRejected:true,legacyRealWorldStillRequiresMembership:true,activeNullRejected:true,wrongActiveLevelHashRejected:true});checks.push({name:'strict-negative-membership',passed:true});
});

test('task revision changes only loader import and its own identity; old mathematical evidence stays exact',async()=>{
 const old=(await bytes(T+'axis-ice-active-region-batch-task-v1.mjs')).toString(),next=(await bytes(TASK)).toString();
 const expected=old.replace("from './active-region-core-diversity-v1.mjs'","from './active-region-core-diversity-v2.mjs'").replace("export const SELF='tools/daily-challenge/formal-v4/axis-ice-active-region-batch-task-v1.mjs'","export const SELF='tools/daily-challenge/formal-v4/axis-ice-active-region-batch-task-v1_1.mjs'").replace("export const VERSION='active-region-real-axis-body-ice-adaptive-stage-accounted-batch-v1'","export const VERSION='active-region-real-axis-body-ice-adaptive-stage-accounted-batch-v1.1'");assert.equal(next,expected);
 const oldCore=(await bytes(T+'active-region-core-diversity-v1.mjs')).toString(),newCore=(await bytes(HELPER)).toString(),geometry=s=>s.slice(s.indexOf('export const CORE_DIVERSITY_VERSION'),s.indexOf('export async function loadActiveCoreIndex'));
 assert.equal(geometry(newCore),geometry(oldCore));assert.equal(levelSha256(built),originalBuiltHash);
 await save('exact-difference-and-reused-evidence.json',{originalPrivate,originalFactory,taskChanges:['loader-import','SELF','VERSION'],allOtherTaskBytesEqual:true,coreGeometryBytesEqual:true,originalTinyWorldHash:originalBuiltHash,oldTestsNotRerun:true,newMathematicalCalls:0});checks.push({name:'exact-narrow-difference',passed:true});
});

test.after(async()=>{
 const compiled=await build({entryPoints:[SELF,TASK],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-metadata-only',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={...qualified.toolBindings};
 for(const p of Object.keys(compiled.metafile.inputs))toolBindings[p]=sha(await bytes(p));
 await save('report.json',{status:checks.length===4?'ACTIVE_REGION_CORE_HISTORY_V2_METADATA_PRIVATE_PASS':'ACTIVE_REGION_CORE_HISTORY_V2_METADATA_PRIVATE_INCOMPLETE',checks,errors:checks.length===4?[]:['Incomplete checks'],originalPrivate,originalFactory,originalDelta,originalNoFull,task:{path:TASK,sha256:toolBindings[TASK]},helper:{path:HELPER,sha256:toolBindings[HELPER]},oldMathematicsEvidenceReused:true,oldMathematicsTestsRerun:false,newRealDomains:0,newConstructions:0,newModelCalls:0,newReplayCalls:0,newSearches:0,newClaims:0,largeCheckpointLoaded:false,toolBindings,fileBindings:{...fileBindings}});
});

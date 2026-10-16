import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadActiveCoreIndex,SOURCE18_CORE,createActiveCoreIndex,extractActiveCore} from './active-region-core-diversity-v1.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const SELF='tools/daily-challenge/formal-v4/axis-ice-active-region-batch-task-v1.metadata.test.mjs';
const out=process.env.ACTIVE_REGION_METADATA_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const PRIVATE={path:'deliverables/daily-formal-v4-20261008/proof/active-region-axis-ice-task-private-02/report.json',sha256:'a76492933d1184957fe904fc5e81358d51b0e3ffb687fdac9f86662d8cd7f392'};
const FACTORY={path:'deliverables/daily-formal-v4-20261008/proof/active-region-axis-ice-factory-private-02/report.json',sha256:'db77d7ca6d1981ff6f2663dbcb8870fe84c34402c38e846a12fa77f100d3ff84'};
const sha=b=>createHash('sha256').update(b).digest('hex'),fileBindings={},checks=[];
const reader={async bound(d){const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,d.path);fileBindings[d.path]=d.sha256;return JSON.parse(b);}};
const save=async(name,value)=>{const path=out+'/'+name,b=JSON.stringify(value,null,2)+'\n';await fs.writeFile(path,b,{flag:'wx'});const d={path,sha256:sha(b)};fileBindings[path]=d.sha256;return d;};
const qualified=await reader.bound(PRIVATE);assert.equal(qualified.status,'ACTIVE_REGION_AXIS_ICE_BATCH_TASK_PRIVATE_PASS');assert.equal(qualified.checks.length,11);assert(qualified.checks.every(c=>c.passed));
for(const[p,h]of Object.entries(qualified.toolBindings)){const actual=sha(await fs.readFile(p));assert.equal(actual,h,'Unchanged private02 tool '+p);fileBindings[p]=h;}
const fr=await reader.bound(FACTORY),firstPath='deliverables/daily-formal-v4-20261008/proof/active-region-axis-ice-factory-private-02/first-full.json',firstBindings=Object.entries(fr.fileBindings).filter(([p])=>p.replaceAll('\\','/')===firstPath);assert.equal(firstBindings.length,1);const first=await reader.bound({path:firstBindings[0][0],sha256:firstBindings[0][1]}),built=first.q;
assert.equal(built.levelSha256,levelSha256(built.level));const originalHash=levelSha256(built);
const copied=await save('original-saved-tiny-construction.json',built); // Existing tiny object's bytes only; no factory call.
const history=d=>({closedCampaigns:[{raw:{formedWorldFiles:[d]}}],fullWorlds:[{descriptor:d,field:'level',level:built.level}]});

test('explicit historical core metadata requires both sealed membership and original descriptor bytes',async()=>{
 const index=await loadActiveCoreIndex(reader,history(copied));assert.equal(index.stats().coreRecords,2);assert(index.stats().origins.includes('historical-explicit-active-region'));assert.equal(index.stats().allOldHistoricalCoresInferred,false);
 await assert.rejects(()=>loadActiveCoreIndex(reader,{...history(copied),fullWorlds:[]}),/sealed history/);
 const wrong={...copied,sha256:'0'.repeat(64)};await assert.rejects(()=>loadActiveCoreIndex(reader,history(wrong)));
 const source=await reader.bound(SOURCE18_CORE.receipt),mismatch=history(copied);mismatch.fullWorlds[0].level=source.level;await assert.rejects(()=>loadActiveCoreIndex(reader,mismatch));
 const invalid=await save('invalid-hash-metadata.json',{...built,levelSha256:'0'.repeat(64)});await assert.rejects(()=>loadActiveCoreIndex(reader,history(invalid)));
 assert.equal(originalHash,levelSha256(built));await save('descriptor-rejections.json',{validCoreRecords:2,missingMembershipRejected:true,wrongShaRejected:true,wrongOriginalWorldRejected:true,forgedLevelHashRejected:true,originalTinyReceiptUntouched:true});checks.push({name:'historical-explicit-core-descriptor-integrity',passed:true});
});

test('core rejection preserves the original firstfull receipt and indexes failed full before next input',async()=>{
 const region=first.recipe.activeRegion,index=createActiveCoreIndex(),snapshot=levelSha256(built),evidence={path:copied.path,sha256:copied.sha256};
 index.add(built.level,region,evidence,'earlier-batch-failed-full');let terminal=null;try{index.check(built.level,region);}catch(e){terminal=e.message;}assert.match(terminal,/partition/);assert.equal(levelSha256(built),snapshot);assert.equal(built.accounting.worlds,1);assert.equal(built.firstFullReceipt.levelSha256,built.levelSha256);
 const disposition={status:'CORE_FRESHNESS_REFUSED_METADATA_FIXTURE',accepted:false,attempt:null,constructionEvidence:evidence,levelSha256:built.levelSha256,originalFirstFullReceipt:built.firstFullReceipt,reason:terminal,publicClaimsStarted:0,existingTinyWorldOnly:true};await save('core-refusal-retains-firstfull.json',disposition);assert.throws(()=>index.check(built.level,region),/partition/);assert.equal(index.stats().coreRecords,1);checks.push({name:'rejected-full-remains-consumed-core',passed:true});
});

test.after(async()=>{const c=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={...qualified.toolBindings};for(const p of Object.keys(c.metafile.inputs))toolBindings[p]=sha(await fs.readFile(p));Object.assign(fileBindings,toolBindings);await save('report.json',{status:checks.length===2?'ACTIVE_REGION_CORE_METADATA_PRIVATE_PASS':'ACTIVE_REGION_CORE_METADATA_PRIVATE_INCOMPLETE',checks,errors:checks.length===2?[]:['Incomplete metadata cases'],originalPrivateMathReport:PRIVATE,originalFactoryReport:FACTORY,originalMathToolsUnchanged:true,originalMathTestsNotRerun:true,toolBindings,fileBindings:{...fileBindings},newRealConstructions:0,newRealDomains:0,newModelCalls:0,newReplayCalls:0,newSearches:0,newClaims:0,metadataCopiesOfAlreadyFormedTinyWorld:2,productionCampaignExecuted:false});});

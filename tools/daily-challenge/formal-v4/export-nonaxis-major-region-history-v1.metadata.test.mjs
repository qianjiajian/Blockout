import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {SELF,QUALIFICATION,buildPrefixOwnerDelta,assertPrefixReceiptMetadata} from './export-nonaxis-major-region-history-v1.mjs';
import {historyExportMode} from './export-axis-ice-active-region-history-v3.mjs';
import {assertCompleteBatchDisposition,describeBatchDisposition} from './axis-ice-active-region-batch-task-v2_1.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008/',PUB='deliverables/daily-formal-v3-20261008/proof/attempts',OUT=process.env.NONAXIS_EXPORT_METADATA_OUT;
assert(OUT);assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');await fs.mkdir(OUT,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={},checks=[],canonical=p=>path.resolve(p).replaceAll('\\','/').toLowerCase();
async function read(d){const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256);bindings[d.path]=d.sha256;return b;}
async function descriptor(p){return{path:p,sha256:sha(await fs.readFile(p))};}
const json=async d=>JSON.parse(await read(d)),absent=p=>fs.lstat(p).then(()=>{throw Error('Unexpected file '+p);},e=>{if(e.code!=='ENOENT')throw e;});
async function save(n,q){const p=OUT+'/'+n,b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});bindings[p]=sha(b);}
const qualification=await json(QUALIFICATION);assert.equal(qualification.status,'INDEPENDENT_NONAXIS_MAJOR_REGION_BATCH_PASS');
// Existing public objects are read as transport fixtures only. No mathematical
// verdict is recomputed and no owner/publication file or candidate is written.
const fixtures=[];
for(const[id,n]of [['171779615b9c881b96ec04e4eb722bc8d23588b3ece03bbeff67b71295aba4ad','006'],['9bc5300db6716e6b2e1c644a6284a40d8373df52c4d811be5b4b972642c25430','009'],['3c91e5c74827fc14bce3158fee7e041c981ce67dd2f4ee49d9e940b6214bb872','014']]){
 const stem=path.join(PUB,id),md=await descriptor(stem+'.v4-low-band-prefix-tail-result.json'),m=await json(md),cd=await descriptor(V+'design/low-band-sixteen-math-01/candidate-'+n+'.json'),old=await json(cd);assert.deepEqual(old.level,m.level);assert.deepEqual(old.attempt,m.attempt);
 const files=await Promise.all([cd.path,stem+'.request.json',stem+'.result.json',stem+'.v4-low-band-prefix-tail-plan.json',md.path,path.join(PUB,'identities',m.attempt.retryIdentitySha256+'.json'),...m.accepted?[]:[stem+'.blocked.json',path.join(PUB,'identities',m.attempt.retryIdentitySha256+'.blocked.json')]].map(descriptor));
 const q={...m,mathReceipt:md,recipeIndex:0},row={recipe:{reference:m.plan.constructionEvidence},blueprint:{prefixDrags:(await json(files.find(d=>d.path.endsWith('-plan.json')))).prefixDrags},failedParent:{attemptId:m.attempt.redesignOf}},owner={namespace:canonical(PUB),files,attemptIds:[id],closedCampaigns:[]};
 fixtures.push({q,m,row,owner,cd,args:{owner,declaredOwner:{kind:'mathematical',definition:{path:'in-memory-transport-fixture-only',sha256:'0'.repeat(64)}},parentHeadSha256:'0'.repeat(64),read,json,absent,rootFor:p=>canonical(p).startsWith(canonical(PUB)+'/')?'public':null,canonical,qs:[q],p:{recipes:[row]},pub:path.resolve(PUB),PLAN_HISTORY_VERSION:'metadata-only-not-merged',levelSha256,sealedWorldIdentity}});
}

test('original accepted, failed-upper and failed-lower prefix publications preserve exact terminal payloads and all opening aliases',async()=>{
 const rows=[];for(const f of fixtures){assertPrefixReceiptMetadata(f.q,f.m,f.row);const d=await buildPrefixOwnerDelta(f.args);assert.equal(d.fullWorlds.length,2);assert.deepEqual(d.fullWorlds.map(w=>w.descriptor.path).sort(),[f.cd.path,f.q.mathReceipt.path].sort());assert(d.fullWorlds.every(w=>w.field==='level'&&levelSha256(w.level)===f.m.levelSha256));assert.equal(d.terminalRecords.length,1);const terminal=d.terminalRecords[0];assert.deepEqual(terminal.request.value,f.m.attempt);assert.equal(terminal.result.value.accepted,f.m.accepted);assert.equal(terminal.blocked.length,f.m.accepted?0:2);assert.deepEqual(terminal.result.value.lower,f.m.lowerBound?.result);assert.deepEqual(terminal.result.value.upper,f.m.route?.search);rows.push({original:f.q.mathReceipt,accepted:f.m.accepted,status:f.m.status,files:d.files.length,openingFields:d.fullWorlds.map(w=>({descriptor:w.descriptor,field:w.field})),blocked:terminal.blocked.map(b=>b.descriptor)});}
 await save('original-publications.json',{rows,originalMathematicsRevalidated:false,newOwnerOrPublicationFiles:0});checks.push({name:'original-accepted-upper-failure-lower-failure-transport',pass:true});
});

test('exact owner descriptors reject external same-content aliases, missing sidecars or blocked files, and wrong hashes',async()=>{
 const f=fixtures[0],wrongAlias=structuredClone(f.q);wrongAlias.mathReceipt.path=path.dirname(f.q.mathReceipt.path)+'/./'+path.basename(f.q.mathReceipt.path);assert.equal(canonical(wrongAlias.mathReceipt.path),canonical(f.q.mathReceipt.path));assert.notEqual(wrongAlias.mathReceipt.path,f.q.mathReceipt.path);await assert.rejects(()=>buildPrefixOwnerDelta({...f.args,qs:[wrongAlias]}));
 for(const suffix of['.v4-low-band-prefix-tail-result.json','.blocked.json']){const owner={...f.owner,files:f.owner.files.filter(d=>!d.path.endsWith(suffix))};await assert.rejects(()=>buildPrefixOwnerDelta({...f.args,owner}));}
 const badOwner=structuredClone(f.owner);badOwner.files.find(d=>d.path.endsWith('.result.json')).sha256='0'.repeat(64);await assert.rejects(()=>buildPrefixOwnerDelta({...f.args,owner:badOwner}));
 const changedPrefix=structuredClone(f.args.p);changedPrefix.recipes[0].blueprint.prefixDrags=[];await assert.rejects(()=>buildPrefixOwnerDelta({...f.args,p:changedPrefix}));
 const failedLower=fixtures[2],badReceipt=structuredClone(failedLower.m);badReceipt.lowerBound.result={...badReceipt.lowerBound.result,status:'invented'};const alteredJson=async d=>d.path===failedLower.q.mathReceipt.path?badReceipt:json(d);await assert.rejects(()=>buildPrefixOwnerDelta({...failedLower.args,json:alteredJson}));
 await save('transport-negative-cases.json',{sameBytesExternalAliasRejected:true,missingSidecarRejected:true,missingBlockedRejected:true,wrongOwnerShaRejected:true,changedPrefixRejected:true,changedLowerMetadataRejected:true,newPhysicalInputs:0});checks.push({name:'exact-owner-and-prefix-negative-cases',pass:true});
});

test('construction-only worlds survive without a public claim and colour-incomplete geometry is never emitted as a full world',async()=>{
 const f=fixtures[0],old=await json(await descriptor(V+'proof/late-region-first-full-private-02/report.json')),noFull=old.evidence.find(e=>e.name==='no-placeholder-full').result;assert.equal(noFull.level,undefined);assert.equal(noFull.partialStock.gates.length,0);
 const f1={path:'in-memory/full.json',sha256:''},f0={path:'in-memory/no-full.json',sha256:''},bytes=new Map([[f1.path,Buffer.from(JSON.stringify({level:f.m.level,accepted:false}))],[f0.path,Buffer.from(JSON.stringify(noFull))]]);for(const d of[f1,f0])d.sha256=sha(bytes.get(d.path));const readFixture=async d=>{const b=bytes.get(d.path);assert.equal(sha(b),d.sha256);return b;};
 const owner={files:[f1,f0],attemptIds:[],closedCampaigns:[{id:'in-memory-only'}]},d=await buildPrefixOwnerDelta({...f.args,owner,read:readFixture,json:async d=>JSON.parse(await readFixture(d)),rootFor:()=>null});assert.equal(d.fullWorlds.length,1);assert.deepEqual(d.fullWorlds[0].level,f.m.level);assert.equal(d.terminalRecords.length,0);assert.deepEqual(d.closedCampaigns,owner.closedCampaigns);
 for(const count of[0,1]){const mode=historyExportMode({consumedInputs:2,formedFullWorlds:count,publicClaimsStarted:0,accepted:0});assert.equal(mode.includeMathDelta,false);}assert.equal(historyExportMode({consumedInputs:2,formedFullWorlds:1,publicClaimsStarted:1,accepted:0}).includeMathDelta,true);
 const partial=describeBatchDisposition([{recipeId:'one',sourceLevelId:115},{recipeId:'two',sourceLevelId:100}],1,[0],'injected IO metadata');assert.throws(()=>assertCompleteBatchDisposition(partial));const source=(await fs.readFile(SELF,'utf8'));assert(source.indexOf('assertCompleteBatchDisposition(done.disposition)')<source.indexOf('const initialListing=await listing()'));
 await save('construction-and-interruption.json',{existingOpening:f.q.mathReceipt,fullCount:1,terminalCount:0,colourIncompleteGeometryExcluded:true,unclaimedMathDelta:false,partialRejected:true,newPhysicalInputs:0,inMemoryMetadataOnly:true});checks.push({name:'no-full-unclaimed-full-and-interruption',pass:true});
});

test.after(async()=>{const own=T+'export-nonaxis-major-region-history-v1.metadata.test.mjs',compiled=await build({entryPoints:[SELF,own],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-nonaxis-export-test',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(compiled.metafile.inputs))toolBindings[p]=sha(await fs.readFile(p));for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h);await save('report.json',{status:checks.length===3?'NONAXIS_MAJOR_REGION_HISTORY_EXPORT_METADATA_PASS':'NONAXIS_MAJOR_REGION_HISTORY_EXPORT_METADATA_INCOMPLETE',checks,qualification:QUALIFICATION,toolBindings,fileBindings:{...bindings,...toolBindings},originalReceipts:fixtures.map(f=>f.q.mathReceipt),newHistoryLoads:0,newConstructions:0,newDomains:0,newModels:0,newReplays:0,newSearches:0,newClaims:0,newOwnerOrPublicationFiles:0,actualExportCalled:false,mathematicalProofRevalidated:false,oldEvidenceUnchanged:true});});

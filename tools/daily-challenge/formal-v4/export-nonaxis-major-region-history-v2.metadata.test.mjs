import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {SELF,PREDECESSOR,QUALIFICATION,assertProposalExportBindings} from './export-nonaxis-major-region-history-v2.mjs';
import * as api from './nonaxis-major-region-batch-v2.mjs';
const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008/',OUT=process.env.NONAXIS_EXPORT_V2_METADATA_OUT;
assert(OUT);await fs.mkdir(OUT,{recursive:false});const bindings={},checks=[],sha=b=>createHash('sha256').update(b).digest('hex');
async function bound(d){const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256);bindings[d.path]=d.sha256;return JSON.parse(b);}
async function raw(p){const b=await fs.readFile(p);bindings[p]=sha(b);return b;}
const q=await bound(QUALIFICATION);assert.equal(q.status,api.QUALIFICATION_STATUS);assert.deepEqual(q.errors,[]);

test('all original owner, first-full, public-prefix terminal, failed-parent and merge blocks retain their reviewed source',async()=>{
 const oldBytes=await raw(PREDECESSOR.path);assert.equal(sha(oldBytes),PREDECESSOR.sha256);const old=oldBytes.toString(),next=(await raw(SELF)).toString(),part=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
 assert.equal(part(next,'export function assertPrefixReceiptMetadata(','if(process.argv[1]'),part(old,'export function assertPrefixReceiptMetadata(','if(process.argv[1]'));
 assert.equal(part(next,' const formed=qs.filter(','const report={status:'),part(old,' const formed=qs.filter(','const report={status:'));
 const original=await bound({path:V+'proof/nonaxis-major-region-export-metadata-private-01/report.json',sha256:'d378ab4c9cac5b5584b5855ceaed67d89552835cc2c65d01526abc554ef50e66'});assert.equal(original.status,'NONAXIS_MAJOR_REGION_HISTORY_EXPORT_METADATA_PASS');assert.equal(original.checks.length,3);assert(original.checks.every(x=>x.pass));for(const[p,h]of Object.entries(original.fileBindings)){assert.equal(sha(await raw(p)),h);}
 checks.push({name:'unchanged-prefix-owner-and-v6-blocks',pass:true,oldTransportCasesReused:3,transportCasesRerun:0,newHistoryLoads:0,newMathematics:0});
});

test('new proposal and dynamic whole prior chain are bound together, with no historical head or source fallback',async()=>{
 const proposalDescriptor={path:V+'design/nonaxis-major-region-31-151-proposal-01/proposal.json',sha256:'17fc9d00d83db5deb72069d7b321b7677f7b22a63e2b416c2d4beadcf6d9fd6f'},proposal=await bound(proposalDescriptor),preparation=await bound(api.PINS.preparation),history={path:V+'proof/nonaxis-major-region-two-history-delta-01/report.json',sha256:'9f00b8d1f413f32b69f183777a1a0ad09af3b638a660f1e984c76ce6171b19a2'},prior=await bound(history);
 // Only an in-memory context fixture, not an executable context or a prediction
 // of the still-running 48-input history head; review evidence is bound below.
 const config={qualification:QUALIFICATION,proposal:proposalDescriptor,proposalReview:{path:V+'proof/nonaxis-major-region-31-151-proposal-independent-01/report.json',sha256:'839c8dd2c43155effc45c5b869e08cf1e5f43c696300c9e19bcdd9ab382c7b1d'},priorHistoryReport:history},ctx={...config,preparation:api.PINS.preparation,designDisposition:api.PINS.designDisposition,experimentId:proposal.experimentId,recipes:proposal.recipes,selection:proposal.selection,history:prior.checkpoint,historyReview:prior.checkpointReview,historyScope:prior.historyScope,historyDeltas:prior.completeHistoryDeltas,historyHeadSha256:prior.headSha256},proposalReview=await bound(config.proposalReview),args={api,ctx,config,proposal,proposalReview,preparation,prior};assertProposalExportBindings(args);
 const oldHead=structuredClone(ctx);oldHead.historyHeadSha256='5669c20b88e97d2390b387ceb37d44522c3398162278ba96cba11eb14634f5d7';assert.throws(()=>assertProposalExportBindings({...args,ctx:oldHead}));const missing=structuredClone(ctx);missing.historyDeltas.pop();assert.throws(()=>assertProposalExportBindings({...args,ctx:missing}));const alteredConfig=structuredClone(config);alteredConfig.priorHistoryReport.sha256='1'.repeat(64);assert.throws(()=>assertProposalExportBindings({...args,config:alteredConfig}));const changed=structuredClone(proposal);changed.recipes[0].sourceLevelId=115;assert.throws(()=>assertProposalExportBindings({...args,proposal:changed}));const failedReview={...proposalReview,errors:['not-approved']};assert.throws(()=>assertProposalExportBindings({...args,proposalReview:failedReview}));
 checks.push({name:'dynamic-two-source-proposal-history-binding',pass:true,negativeCases:5,post48HeadPredicted:false,executableContextCreated:false,actualIndependentProposalReviewBound:true});
});

test.after(async()=>{const own=T+'export-nonaxis-major-region-history-v2.metadata.test.mjs',b=await build({entryPoints:[SELF,own],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-nonaxis-export-v2',platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(b.metafile.inputs))toolBindings[p]=sha(await raw(p));for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h);await fs.writeFile(OUT+'/report.json',JSON.stringify({status:checks.length===2?'NONAXIS_MAJOR_REGION_HISTORY_EXPORT_V2_METADATA_PASS':'NONAXIS_MAJOR_REGION_HISTORY_EXPORT_V2_METADATA_INCOMPLETE',checks,qualification:QUALIFICATION,predecessor:PREDECESSOR,fileBindings:{...bindings},toolBindings,newHistoryLoads:0,newConstructions:0,newDomains:0,newModels:0,newReplays:0,newSearches:0,newClaims:0,newOwnerOrPublicationFiles:0,actualExportCalled:false,mathematicalProofRevalidated:false,oldEvidenceUnchanged:true},null,2)+'\n',{flag:'wx'});});

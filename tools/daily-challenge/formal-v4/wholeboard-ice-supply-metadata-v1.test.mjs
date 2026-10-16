import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {SELF,assertIceJointReceipt,assertPriorHistoryReport} from './wholeboard-ice-supply-batch-task-v1.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
const TEST='tools/daily-challenge/formal-v4/wholeboard-ice-supply-metadata-v1.test.mjs',BASE='deliverables/daily-formal-v4-20261008/proof/',OUT=process.env.ICE_SUPPLY_METADATA_TEST_OUT;assert(OUT);await fs.mkdir(OUT,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={},checks=[];
async function bytes(p){const b=await fs.readFile(p);bindings[p]=sha(b);return b;}
async function read(p){return JSON.parse(await bytes(p));}
async function save(name,q){const p=path.join(OUT,name);await fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});bindings[p]=sha(await fs.readFile(p));return{path:p,sha256:bindings[p]};}
const archive=BASE+'wholeboard-ice-supply-task-private-01-source/wholeboard-ice-supply-batch-task-v1.mjs.txt',oldReportPath=BASE+'wholeboard-ice-supply-task-private-01/report.json';let fatal=null,oldReport,snapshot,mathReuse,oldReportBindingRemap;
try{
 oldReport=await read(oldReportPath);assert.equal(bindings[oldReportPath],'1adc57f22fd174a8c0247e022eddf460ca4a2668785fb072f4866edfb8efbb4d');assert.equal(oldReport.status,'WHOLEBOARD_ICE_SUPPLY_TASK_TINY_PASS');
 snapshot=(await bytes(archive)).toString();assert.equal(bindings[archive],'c065574a761100713d0290448633f0165b9611b3c7e6694be839ebd12b115747');assert.equal(oldReport.toolBindings[SELF],bindings[archive]);
 for(const[p,h]of Object.entries(oldReport.fileBindings)){const actual=p===SELF?archive:p;assert.equal(sha(await bytes(actual)),h);}
 const current=(await bytes(SELF)).toString(),body=s=>s.slice(s.indexOf('export function solveIceSupplyJoint('),s.indexOf('export function assertIceJointReceipt('));assert(body(snapshot).length>1000);assert.equal(body(current),body(snapshot));
 const normal=s=>s.replace('assert.deepEqual(q.proof.iceBindings,rt.iceBindings);assert.equal(q.proof.iceProofSha256,rt.iceProofSha256);','').replace('assert(Array.isArray(h.completeHistoryDeltas)&&Array.isArray(h.priorHistoryDeltas)&&Array.isArray(h.historyDeltas));assert.deepEqual(h.completeHistoryDeltas,[...h.priorHistoryDeltas,...h.historyDeltas]);assert(h.completeHistoryDeltas.length>0);assert.equal(h.completeHistoryDeltas.at(-1).descriptor.sha256,h.headSha256);','assert(Array.isArray(h.completeHistoryDeltas));');assert.equal(normal(current),snapshot);
 oldReportBindingRemap={originalPath:SELF,originalSha256:bindings[archive],archivedSource:{path:archive,sha256:bindings[archive]},reportUnmodified:true};mathReuse={report:{path:oldReportPath,sha256:bindings[oldReportPath]},executedTaskSha256:bindings[archive],currentTaskSha256:bindings[SELF],solveFunctionByteIdentical:true,solveFunctionSha256:sha(body(current)),newMathematicalExecutions:0};checks.push({name:'exact-old-source-archived-and-only-two-metadata-changes',pass:true});
 const policyPath=BASE+'execution-policy-reviews/181-01/review.json',policy=await read(policyPath);assert.equal(bindings[policyPath],'3457a7045b4304f738d5c5059275ec7eb055c4c14837980c68cd646d8ade5a1b');const v=policy.frozenToolchainBindingVerification;assert.equal(v.count,36);assert.equal(Object.keys(v.bindings).length,36);assert.equal(levelSha256(v.bindings),v.toolchainSha256);for(const[p,h]of Object.entries(v.bindings))assert.equal(sha(await bytes(p)),h);
 const rt={toolchainSha256:v.toolchainSha256,iceBindings:v.bindings,iceProofSha256:v.toolchainSha256},tiny=await read(BASE+'wholeboard-ice-supply-task-private-01/tiny-ice-joint.json'),opts={qualificationOnly:true,floor:1,upper:3};assertIceJointReceipt(tiny.q,tiny.level,tiny.recipe,rt,opts);
 const swapped=structuredClone(tiny.q),core=Object.keys(swapped.proof.iceBindings).find(p=>p.startsWith('src/'));assert(core);swapped.proof.iceBindings[core]='0'.repeat(64);swapped.proof.iceProofSha256=levelSha256(swapped.proof.iceBindings);assert.throws(()=>assertIceJointReceipt(swapped,tiny.level,tiny.recipe,rt,opts));
 const wrongHash=structuredClone(rt);wrongHash.iceProofSha256='0'.repeat(64);assert.throws(()=>assertIceJointReceipt(tiny.q,tiny.level,tiny.recipe,wrongHash,opts));checks.push({name:'saved-tiny-proof-full36-map-and-hash-match-external-frozen-anchor',pass:true,cases:3});
 const histories=['axis-ice-active-region-sixtyfour-history-delta-01/report.json','nonaxis-major-region-two-history-delta-01/report.json'],results=[];
 const context=h=>({historyHeadSha256:h.headSha256,history:h.checkpoint,historyReview:h.checkpointReview,historyScope:h.historyScope,historyDeltas:h.completeHistoryDeltas,selection:h.selection});
 for(const name of histories){const h=await read(BASE+name),c=context(h);assertPriorHistoryReport(c,h);let rejected=0;
  for(const change of [x=>x.completeHistoryDeltas.shift(),x=>x.completeHistoryDeltas.reverse(),x=>{x.headSha256='0'.repeat(64);},x=>{x.completeHistoryDeltas=[];x.priorHistoryDeltas=[];x.historyDeltas=[];},x=>{delete x.priorHistoryDeltas;}]){const bad=structuredClone(h);change(bad);assert.throws(()=>assertPriorHistoryReport(context(bad),bad));rejected++;}
  results.push({path:BASE+name,sha256:bindings[BASE+name],length:h.completeHistoryDeltas.length,positive:true,rejected});
 }
 const latest=await read(BASE+histories[1]),future=structuredClone(latest);future.priorHistoryDeltas=future.completeHistoryDeltas;future.historyDeltas=[{descriptor:{path:'synthetic-private-future-delta-NOT-REAL.json',sha256:'e'.repeat(64)}}];future.completeHistoryDeltas=[...future.priorHistoryDeltas,...future.historyDeltas];future.headSha256='e'.repeat(64);assertPriorHistoryReport(context(future),future);
 await save('metadata-checks.json',{results,syntheticFutureFormatPassed:true,syntheticFutureDescriptorNeverLoadedOrPublished:true,fullMapAnchor:{path:policyPath,sha256:bindings[policyPath]},newModels:0,newSearches:0,newReplays:0,historyLoads:0});checks.push({name:'real11-and13-complete-chain-concat-head-plus-future-format',pass:true,positive:3,negative:10});
}catch(e){fatal={message:e.message,stack:e.stack};process.exitCode=1;}
const bundle=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(bundle.metafile.inputs))toolBindings[p]=sha(await bytes(p));bindings[TEST]=sha(await bytes(TEST));
await save('report.json',{status:fatal?'WHOLEBOARD_ICE_SUPPLY_METADATA_TINY_FAIL':'WHOLEBOARD_ICE_SUPPLY_METADATA_TINY_PASS',fatal,checks,mathReuse,oldReportBindingRemap,originalSevenTestsNotRerun:true,toolBindings,fileBindings:{...bindings},newRealConstructions:0,newDomains:0,newModels:0,newSearches:0,newReplays:0,publicClaimsStarted:0,historyLoads:0,productionQualified:false});console.log(JSON.stringify({out:OUT,checks:checks.length,fatal}));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {compareLayouts} from './diversity.mjs';
const root='deliverables/daily-formal-v3-20261008',batch=`${root}/design/macro-prefix64-04`,read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert(!fs.existsSync(`${batch}/completion-audit.json`));const plan=read(`${batch}/plan.json`),runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,plan.toolchainSha256);
for(const b of plan.bindings)assert.equal(sha(b.path),b.sha256);
const rows=[],packets=[],replays=[],reasons={},sources={},bands={1:0,2:0,3:0},indices=[];
for(const phase of [1,2]){
 const dir=`${batch}/solve-${phase}`,report=read(`${dir}/report.json`),preview=read(`${batch}/preview-${phase}/report.json`),audit=read(`${batch}/preview-${phase}/structure-opening-visual-audit.json`),sp=read(`${dir}/plan.json`);
 assert.equal(report.status,'FIXED_PHASE_FINISHED');assert.equal(report.rows.length,preview.candidates.length);assert.equal(report.rows.length,audit.rows.length);
 assert.equal(sp.strategy.floor,16);assert.equal(sp.strategy.searchUpper,128);assert.equal(sp.strategy.budget.maxStates,9999);assert.equal(sp.strategy.guardAllowance,1);
 for(const b of sp.bindings)assert.equal(sha(b.path),b.sha256);
 for(const row of report.rows){
  const q=read(row.path);assert.equal(sha(row.path),row.fileSha256);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.proofToolchainSha256,plan.toolchainSha256);assert.equal(q.formalReady,false);
  assert(q.attempt?.id&&q.proof,'All fixed inputs get only their first joint task');const requestFile=`${root}/proof/attempts/${q.attempt.id}.request.json`,resultFile=`${root}/proof/attempts/${q.attempt.id}.result.json`,request=read(requestFile),result=read(resultFile);
  assert.equal(request.levelSha256,q.levelSha256);assert.equal(result.accepted,q.accepted);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,q.proof);assert.deepEqual(result.upper,q.proof);assert.equal(request.redesignOf,q.redesignOf);
  const parent=read(`${root}/proof/attempts/${q.redesignOf}.request.json`),nf=designFingerprints(q.level);assert.notEqual(parent.shapeSha256,nf.shapeSha256);assert.notEqual(parent.colorSha256,nf.colorSha256);
  assert(q.proof.guardAllowance.conservativeFullBoardStateUpperBound<=10000);assert(q.proof.rawFullBoardStates<=9999&&q.proof.rawExploredStates<=9999);
  if(q.accepted){assert(q.drags&&q.L>=([0,16,21,31][q.difficulty]));assert(q.U>=q.L);assert.equal(routeSha256(q.drags),q.routeSha256);const a=runtime.replayRevisedRoute(q.level,q.drags),b=independentReplay(runtime,q.level,q.drags);assert(a.valid&&a.complete&&b.valid&&b.complete);assert.equal(a.nonClearingDrags,q.U);assert.equal(b.nonClearingDrags,q.U);bands[q.difficulty]++;replays.push({path:row.path,canonical:a,independent:b});}
  else {assert.equal(q.L,null);assert.equal(q.U,null);assert(fs.existsSync(`${root}/proof/attempts/identities/${q.attempt.retryIdentitySha256}.blocked.json`));}
  reasons[q.proof.termination]=(reasons[q.proof.termination]??0)+1;sources[q.sourceLevelId]=(sources[q.sourceLevelId]??0)+1;packets.push(q);rows.push({...row,requestSha256:sha(requestFile),resultSha256:sha(resultFile),finalObjectSha256:q.levelSha256,actualSourceFailureParent:q.redesignOf});
 }
 indices.push({phase,previewIndex:`${batch}/preview-${phase}/index.json`,canvas:`${batch}/preview-${phase}/canvas-preview/report.json`,visualAudit:`${batch}/preview-${phase}/structure-opening-visual-audit.json`,proofIndex:`${dir}/index.json`});
}
assert.equal(rows.length,64);assert(Object.keys(sources).length>=10);assert(Math.max(...Object.values(sources))<=8);
let maxPair=0;for(let i=0;i<packets.length;i++)for(let j=i+1;j<packets.length;j++){const n=compareLayouts(packets[i].level,packets[j].level).footprintSimilarity;assert(n<=.65);maxPair=Math.max(maxPair,n);}
const accepted=rows.filter(x=>x.accepted);fs.writeFileSync(`${batch}/index.json`,JSON.stringify({status:'FIXED_64_EXPLORATORY_RESULTS',formalReady:false,productionChanged:false,files:accepted.map(x=>x.path),records:accepted},null,2)+'\n',{flag:'wx'});
const report={status:'FIXED_64_SINGLE_JOINT_TASKS_AUDITED',formalReady:false,productionChanged:false,proofContractChanged:false,newSearchesInThisAudit:0,inputs:64,claims:64,searches:64,accepted:accepted.length,bands,
 sources,sourceCount:Object.keys(sources).length,maskCount:new Set(packets.map(x=>x.sourceMaskSha256)).size,maxPairSimilarity:maxPair,terminations:reasons,maximumGuardAllowance:Math.max(...packets.map(x=>x.proof.guardAllowance.conservativeFullBoardStateUpperBound)),
 plan:{path:`${batch}/plan.json`,sha256:sha(`${batch}/plan.json`)},toolchainSha256:runtime.toolchainSha256,indices,rows,acceptedFreshReplay:replays,
 scope:'Mathematical exploratory base candidates only. Mechanism stage design, final same-object contracts, visual selection and real Pointer/natural clock still required. All failed stock remains failed and is not re-searched. No batch expansion.'};
fs.writeFileSync(`${batch}/completion-audit.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({inputs:64,accepted:accepted.length,bands,sources:report.sourceCount,masks:report.maskCount,maxPair,terminations:reasons}));

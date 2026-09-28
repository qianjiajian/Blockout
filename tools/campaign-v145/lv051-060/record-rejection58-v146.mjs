import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent58-59';
const lock=verifyRulesLock();assert(lock.ok);const {api,inputs}=await loadApi();
const meta=await build({entryPoints:['tools/campaign-v145/lv051-060/record-rejection58-v146.mjs'],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
const sourcePaths=[...new Set([...Object.keys(meta.metafile.inputs),...inputs,'docs/rules/manifest.json',lock.document??`docs/mechanism-rules-v${lock.activeVersion}.md`])].sort();
const bindings=Object.fromEntries(sourcePaths.map(p=>[p,digest(fs.readFileSync(p))]));
const rows=[],runId=Date.now();
for(const reportFile of process.argv.slice(2)){
 const proofReport=JSON.parse(fs.readFileSync(reportFile)),candidate=JSON.parse(fs.readFileSync(proofReport.candidate));
 assert.equal(candidate.level.id,58);assert.equal(digest(candidate.level),proofReport.levelSha256);
 const drags=proofReport.proof.relaxedRoute;assert(Array.isArray(drags));
 const replay=api.replayRevisedRoute(candidate.level,drags);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags<11);
 const model=new api.PuzzleModel(structuredClone(candidate.level));model.startCountdown();let nonClearing=0;
 const steps=[];
 for(const [n,d]of drags.entries()){
  const before=model.snapshot();model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));
  if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());const after=model.snapshot();
  if(after.cleared===before.cleared)nonClearing++;
  steps.push({step:n+1,blockId:d.blockId,clearDelta:after.cleared-before.cleared,queuedRemaining:after.queuedBlocks.length});
 }
 assert(model.snapshot().complete);assert.equal(nonClearing,replay.nonClearingDrags);
 const aliases=fs.readdirSync(dir).filter(x=>/^(candidate58|enriched58).*\.json$/.test(x)).filter(x=>{const d=JSON.parse(fs.readFileSync(`${dir}/${x}`));return d.level&&digest(d.level)===proofReport.levelSha256;});
 const counterexampleFile=`${dir}/counterexample58-${runId}-${rows.length+1}.json`;
 const counterexample={drags,routeSha256:digest(drags),effectiveDrags:replay.effectiveDrags,nonClearingDrags:nonClearing,clearEvents:replay.clearEvents,valid:true,complete:true,steps};
 fs.writeFileSync(counterexampleFile,JSON.stringify({createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,level:candidate.level,levelSha256:proofReport.levelSha256,originalCandidate:proofReport.candidate,originalCandidateSha256:digest(fs.readFileSync(proofReport.candidate)),sourceProof:reportFile,sourceProofSha256:digest(fs.readFileSync(reportFile)),...counterexample,bindings,headlessOnly:true,pointerValidated:false,naturalTimeValidated:false,formalAdopted:false},null,2)+'\n',{flag:'wx'});
 rows.push({levelSha256:proofReport.levelSha256,candidate:proofReport.candidate,candidateSha256:digest(fs.readFileSync(proofReport.candidate)),proofReport:reportFile,proofReportSha256:digest(fs.readFileSync(reportFile)),status:'REJECTED_NORMAL_MINIMUM',reason:'A complete real-model route has fewer than 11 non-clearing effective gestures.',counterexampleFile,counterexample,aliases,formalAdopted:false});
}
const out=`${dir}/rejected58-immediate-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,bindings,rows,oldReportsPreserved:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,rows:rows.map(r=>({levelSha256:r.levelSha256,aliases:r.aliases.length,nonClearingDrags:r.counterexample.nonClearingDrags}))}));

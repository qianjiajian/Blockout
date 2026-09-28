import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {auditGeneratorQueueColors} from '../../revised-generator-queue-colors.mjs';
import {observeMechanismProcess,verifyDecisions} from '../../review-remake31to40-decisions.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
import {compile,each} from './campaign-generator-axis-search-v146.mjs';
import {projectImmediateRoute} from './immediate-generator-floor56-v146.mjs';

const DIR='deliverables/remake31-200-v145-20260924/batches/lv051-060/rebuild58',BASE='deliverables/remake31-200-v145-20260924/baseline.json';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');const {api,inputs}=await loadApi(),old=JSON.parse(fs.readFileSync(BASE)).levels[57];
const meta=await build({entryPoints:['tools/campaign-v145/lv051-060/rebuild58-review.mjs'],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),native={SINGLE:rect(1,1),H2:rect(2,1),V2:rect(1,2),H3:rect(3,1),V3:rect(1,3),SQ2:rect(2,2),SQ3:rect(3,3),T4:[[1,0],[0,1],[1,1],[2,1]]},shapeKey=s=>s.map(p=>p.join(',')).sort().join(';');
const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
const state=(c,s)=>Uint16Array.from(c.blocks.map(b=>{const v=s.blocks.find(v=>v.id===b.id);return v?(v.y*c.W+v.x)|((b.layers.length-v.layers.length)<<7):s.queuedBlocks.some(v=>v.id===b.id)?510:511;}));
for(const file of process.argv.slice(2)){
 const data=JSON.parse(fs.readFileSync(file)),{level:l,drags}=data;assert.equal(l.id,58);assert(Array.isArray(drags));const source=JSON.parse(fs.readFileSync(data.sourceReview)),facts=source.facts[58];
 assert.equal(digest(fs.readFileSync(data.sourceReview)),data.sourceReviewSha256);assert.equal(digest(fs.readFileSync(source.sourceVideo)),source.videoSha256);for(const frame of source.frames)assert.equal(digest(fs.readFileSync(frame.path)),frame.sha256);
 assert.deepEqual(geometry(l),old.geometry);for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(l[k],old.level[k]);assert.deepEqual(api.levelStarTargets(l),old.starTargets);
 const specs=[...facts.opening,...facts.queue],sourceCarriers=[];assert.equal(specs.length,23);
 for(const s of specs){const b=l.blocks.find(b=>b.id===`r147-r58-${s.sourceId}`);assert(b);assert.equal(shapeKey(b.shape),shapeKey(native[s.kind]));assert.equal(b.color,s.sourceId==='q04'?'blue':s.color);assert.equal(b.frozen??0,s.frozen??0);assert.deepEqual(b.layers??[b.color],s.layers??[b.color]);for(const k of ['shutterId','keyId','lockedBy','axis','bombSeconds'])assert(!b[k]);sourceCarriers.push({sourceId:s.sourceId,id:b.id,area:b.shape.length,color:b.color,frozen:b.frozen??0,layers:b.layers??[b.color]});}
 assert.equal(l.blocks.length,25);assert.equal(l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),27);const fillers=l.blocks.filter(b=>b.id.startsWith('r147-r58-fill'));assert.equal(fillers.length,2);assert.equal(fillers.reduce((n,b)=>n+b.shape.length,0),10);assert(fillers.every(b=>!b.frozen&&!b.layers&&!b.shutterId));
 assert.deepEqual(l.gates.map(g=>[g.color,g.frozen??0]).sort(),Object.entries(facts.gates).sort());assert.equal(l.generators.length,1);assert.deepEqual(l.generators[0].queueBlockIds,facts.queue.map(s=>`r147-r58-${s.sourceId}`));assert.equal(l.shutters?.length??0,0);
 assert.deepEqual(data.sourceAdaptation.orientationAdaptations,source.orientationAdaptations.filter(r=>r.level===58));assert(l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
 const spatial=auditSpatial(l,api),art=api.auditCandidateBlockArt(l),queue=auditGeneratorQueueColors(l),replay=api.replayRevisedRoute(l,drags);assert(spatial.passed);assert(art.passed);assert(queue.passed);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15);
 const c=compile(l),m=new api.PuzzleModel(l);m.startCountdown();const found=[];
 for(let step=0;step<drags.length-1&&found.length<6;step++){
  const prefix=drags.slice(0,step),next=drags[step],snapshot=m.snapshot();
  each(c,state(c,snapshot),(_s,cost,get)=>{if(cost!==1)return;const wrong=get(),b=snapshot.blocks.find(b=>b.id===wrong.blockId);if(b.shape.length<2||b.id===next.blockId)return;const blocked=api.replayRevisedRoute(l,[...prefix,wrong,next]);if(blocked.valid||!blocked.error?.startsWith('Rejected move'))return;if(!api.replayRevisedRoute(l,[...prefix,wrong]).valid)return;const recovery={blockId:b.id,path:[[b.x,b.y],...wrong.path.slice(0,-1)].reverse()},restored=api.replayRevisedRoute(l,[...prefix,wrong,recovery]),before=api.replayRevisedRoute(l,prefix);if(!restored.valid||restored.finalStateKey!==before.finalStateKey)return;const full=[...prefix,wrong,recovery,...drags.slice(step)],whole=api.replayRevisedRoute(l,full);if(!whole.valid||!whole.complete)return;found.push({atStep:step+1,beforeDrag:step+1,blockId:b.id,area:b.shape.length,correctDrag:next,legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:full,meaning:'多格合法误停阻塞下一动作，恢复原状态后完整通关；非全局死局或难度下界。'});return false;});apply(m,next);
 }
 data.decisionCases=[];for(const r of found)if(!data.decisionCases.some(d=>d.blockId===r.blockId)){data.decisionCases.push(r);if(data.decisionCases.length===3)break;}assert(data.decisionCases.length>0);
 data.iceLocalChoices=[];for(const collection of ['blocks','gates']){let result;
  for(let i=1;i<drags.length&&!result;i++){const prefix=drags.slice(0,i),formal=api.replayRevisedRoute(l,prefix);assert(formal.valid);for(const target of l[collection].filter(b=>(b.frozen??0)>formal.clearEvents)){
   const modified=structuredClone(l);modified[collection].find(b=>b.id===target.id).frozen=formal.clearEvents;const relaxed=api.replayRevisedRoute(modified,prefix);if(!relaxed.valid)continue;const mm=new api.PuzzleModel(modified);mm.startCountdown();prefix.forEach(d=>apply(mm,d));const cc=compile(modified);
   each(cc,state(cc,mm.snapshot()),(_s,_cost,get)=>{const d=get();if(l.blocks.find(b=>b.id===d.blockId).shape.length<2)return;const denied=api.replayRevisedRoute(l,[...prefix,d]),allowed=api.replayRevisedRoute(modified,[...prefix,d]);if(denied.valid||!allowed.valid)return;result={collection,id:target.id,originalCount:target.frozen,relaxedCount:formal.clearEvents,beforeDrag:i+1,prefix,blockedAction:d,formalRejection:denied.error,relaxedActionLegal:true,meaning:'单独降低此冰块/冰门计数，其它库存/属性保持，原图拒绝的多格动作在对照中可执行。'};return false;});if(result)break;
  }}assert(result,`Ice local decision ${collection}`);data.iceLocalChoices.push(result);
 }
 const measurements=measureRoute(l,drags,api),process=observeMechanismProcess(l,drags,api),decisions=verifyDecisions(data,api),projection=projectImmediateRoute(l,drags,api);
 const paths=[...new Set([...Object.keys(meta.metafile.inputs),...inputs,file,data.sourceReview,BASE,'docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`])].sort(),bindings=Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
 data.activeRuleVersion=lock.activeVersion;data.freshQuality={measurements,process,decisions,bindings,checkedAt:new Date().toISOString(),pointerValidated:false,humanBlindTested:false,formalAdopted:false};
 const stamp=Date.now(),candidate=`${DIR}/enriched-${stamp}.json`,report=`${DIR}/review-${stamp}.json`;fs.writeFileSync(candidate,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(report,JSON.stringify({checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,candidate,candidateSha256:digest(fs.readFileSync(candidate)),sourceInput:file,levelSha256:digest(l),routeSha256:digest(drags),sourceReview:data.sourceReview,sourceReviewSha256:data.sourceReviewSha256,sourceFramesVerified:source.frames.length,sourceVideoVerified:true,sourceCarriers,fillers,baselinePreserved:true,spatial,art,queue,replay,projection,measurements,decisions,bindings,sourceContractPassed:true,stagesPassed:true,lowerBoundProven:false,pointerValidated:false,formalAdopted:false},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({candidate,report,upper:replay.nonClearingDrags,multi:measurements.multiCellDrags,single:measurements.singleCellDrags,cases:data.decisionCases.length}));
}

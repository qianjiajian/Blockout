import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {observeMechanismProcess,verifyDecisions} from '../../review-remake31to40-decisions.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
import {compile,each} from './campaign-generator-axis-search-v146.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.51.0');
const {api}=await loadApi();
const OUT='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent58-59';
const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
const state=(c,s)=>Uint16Array.from(c.blocks.map(b=>{const v=s.blocks.find(v=>v.id===b.id);return v?(v.y*c.W+v.x)|((b.layers.length-v.layers.length)<<7):s.queuedBlocks.some(v=>v.id===b.id)?510:511;}));
for(const file of process.argv.slice(2)){
 const data=JSON.parse(fs.readFileSync(file)),{level,drags}=data;assert([58,59].includes(level.id));
 if(process.env.SOURCE_REVIEW)data.sourceReview=process.env.SOURCE_REVIEW;
 data.sourceReviewSha256=crypto.createHash('sha256').update(fs.readFileSync(data.sourceReview)).digest('hex');
 const sourceEvidence=JSON.parse(fs.readFileSync(data.sourceReview));data.sourceAdaptation.orientationAdaptations=(sourceEvidence.orientationAdaptations??[]).filter(a=>a.level===level.id);for(const a of data.sourceAdaptation.orientationAdaptations)assert.deepEqual(level.blocks.find(b=>b.id===`v146-${level.id}-${a.sourceId}`).shape,a.designShape);
 const m=new api.PuzzleModel(level);m.startCountdown();const c=compile(level),found=[];
 for(let step=0;step<drags.length-1&&found.length<6;step++){
  const prefix=drags.slice(0,step),next=drags[step],snap=m.snapshot();
  each(c,state(c,snap),(_s,cost,get)=>{
   if(cost!==1)return;const wrong=get(),b=snap.blocks.find(b=>b.id===wrong.blockId);if(b.shape.length<2||wrong.blockId===next.blockId)return;
   const blocked=api.replayRevisedRoute(level,[...prefix,wrong,next]);if(blocked.valid||!blocked.error?.startsWith('Rejected move'))return;
   const legal=api.replayRevisedRoute(level,[...prefix,wrong]);if(!legal.valid)return;
   const recovery={blockId:b.id,path:[[b.x,b.y],...wrong.path.slice(0,-1)].reverse()},restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]),before=api.replayRevisedRoute(level,prefix);
   if(!restored.valid||restored.finalStateKey!==before.finalStateKey)return;
   const full=[...prefix,wrong,recovery,...drags.slice(step)],whole=api.replayRevisedRoute(level,full);if(!whole.valid||!whole.complete)return;
   found.push({atStep:step+1,beforeDrag:step+1,blockId:b.id,area:b.shape.length,correctDrag:next,legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:full,meaning:'合法多格误停阻塞指定下一拖；原路恢复同一状态后完整通关，非全局死局或最优代价证明。'});return false;
  });apply(m,next);
 }
 data.decisionCases=[];for(const row of found)if(!data.decisionCases.some(d=>d.blockId===row.blockId)){data.decisionCases.push(row);if(data.decisionCases.length===3)break;}
 data.curtainLocalChoices=[];
 for(const cover of level.shutters??[]){let result;
  for(let i=1;i<drags.length&&!result;i++){const prefix=drags.slice(0,i),formal=api.replayRevisedRoute(level,prefix);if(!formal.valid||formal.clearEvents<1||formal.clearEvents>=cover.count)continue;
   const modified=structuredClone(level);modified.shutters.find(s=>s.id===cover.id).count=formal.clearEvents;const relaxed=api.replayRevisedRoute(modified,prefix);if(!relaxed.valid)continue;
   const model=new api.PuzzleModel(modified);model.startCountdown();prefix.forEach(d=>apply(model,d));const cc=compile(modified);
   each(cc,state(cc,model.snapshot()),(_s,_cost,get)=>{const d=get();if(level.blocks.find(b=>b.id===d.blockId).shape.length<2)return;if(api.replayRevisedRoute(level,[...prefix,d]).valid||!api.replayRevisedRoute(modified,[...prefix,d]).valid)return;
    result={curtainId:cover.id,originalCount:cover.count,relaxedCount:formal.clearEvents,beforeDrag:i+1,prefix,cleared:formal.clearEvents,formalRemaining:cover.count-formal.clearEvents,blockedAction:d,meaning:'仅此帘提早揭开，完整库存与其它属性保持；同前缀下该多格动作才可用。'};return false;
   });
  }assert(result,'Curtain local case '+cover.id);data.curtainLocalChoices.push(result);
 }
 data.iceLocalChoices=[];
 if(level.id===58)for(const collection of ['blocks','gates']){let result;
  for(let i=1;i<drags.length&&!result;i++){const prefix=drags.slice(0,i),formal=api.replayRevisedRoute(level,prefix);if(!formal.valid)continue;
   for(const target of level[collection].filter(b=>(b.frozen??0)>formal.clearEvents)){const modified=structuredClone(level);modified[collection].find(b=>b.id===target.id).frozen=formal.clearEvents;const relaxed=api.replayRevisedRoute(modified,prefix);if(!relaxed.valid)continue;const model=new api.PuzzleModel(modified);model.startCountdown();prefix.forEach(d=>apply(model,d));const cc=compile(modified);
    each(cc,state(cc,model.snapshot()),(_s,_cost,get)=>{const d=get();if(level.blocks.find(b=>b.id===d.blockId).shape.length<2)return;const blocked=api.replayRevisedRoute(level,[...prefix,d]),allowed=api.replayRevisedRoute(modified,[...prefix,d]);if(blocked.valid||!allowed.valid)return;result={collection,id:target.id,originalCount:target.frozen,relaxedCount:formal.clearEvents,beforeDrag:i+1,prefix,blockedAction:d,formalRejection:blocked.error,relaxedActionLegal:true,meaning:'仅减小此冰块/冰门初值；库存与其它属性保持，同一前缀后原图拒绝而局部对照允许该多格动作。'};return false;});if(result)break;
   }
  }assert(result,'Ice local decision '+collection);data.iceLocalChoices.push(result);
 }
 assert(data.decisionCases.length);const measurements=measureRoute(level,drags,api),mechanismProcess=observeMechanismProcess(level,drags,api),decisions=verifyDecisions(data,api);
 const bindings={sourceReview:digest(fs.readFileSync(data.sourceReview)),author:digest(fs.readFileSync('tools/campaign-v145/lv051-060/author58-59-v146.mjs')),enricher:digest(fs.readFileSync('tools/campaign-v145/lv051-060/enrich58-59-v146.mjs'))};
 data.activeRuleVersion=lock.activeVersion;data.freshQuality={measurements,process:mechanismProcess,decisions,bindings,checkedAt:new Date().toISOString(),pointerValidated:false,humanBlindTested:false,formalAdopted:false};
 const out=`${OUT}/enriched${level.id}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,id:level.id,upper:measurements.nonClearingDrags,multi:measurements.multiCellDrags,single:measurements.singleCellDrags,cases:data.decisionCases.length,covers:data.curtainLocalChoices.length}));
}

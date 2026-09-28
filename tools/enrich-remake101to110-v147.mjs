import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ROOT,save,ruleGate} from './remake101to110-v146.mjs';
import {loadSpatialApi,compileSpatial,each} from '../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {verifyDecisions} from './review-remake101to110-decisions-v147.mjs';
ruleGate();const {api}=await loadApi(),full=await loadSpatialApi();
for(const input of process.argv.slice(2)){
 const data=JSON.parse(fs.readFileSync(input)),{level,drags}=data,c=compileSpatial(level,full);let state=c.initial;
 data.decisionCases=[];data.mechanismEvidence={starCases:[],axisCases:[]};delete data.earlyIceChoice;delete data.earlyGateChoice;
 const replay=route=>api.replayRevisedRoute(level,route),before=[],relaxedGateGraphs=new Map();
 for(let step=0;step<drags.length;step++){
  const prefix=drags.slice(0,step),r=replay(prefix);assert(r.valid);const s=JSON.parse(r.finalStateKey);before.push(s);
  if(data.decisionCases.length<3)each(c,state,(_,cost,get)=>{
   if(cost!==1)return;const alt=get(),body=s.blocks.find(b=>b.id===alt.blockId);if(body.shape.length<2||data.decisionCases.some(a=>a.blockId===body.id))return;
   const wrong=replay([...prefix,alt]);if(!wrong.valid||wrong.clearEvents!==r.clearEvents)return;
   const blocked=replay([...prefix,alt,drags[step]]);if(blocked.valid)return;
   const recovery={blockId:body.id,path:[[body.x,body.y],...alt.path.slice(0,-1)].reverse()},restored=replay([...prefix,alt,recovery]);if(!restored.valid||restored.finalStateKey!==r.finalStateKey)return;
   const fullRecoveredRoute=[...prefix,alt,recovery,...drags.slice(step)];if(!replay(fullRecoveredRoute).complete)return;
   data.decisionCases.push({atStep:step+1,beforeDrag:step+1,blockId:body.id,area:body.shape.length,legalWrongParking:alt,blockedNextAction:drags[step],recoveryDrag:recovery,fullRecoveredRoute});if(data.decisionCases.length===3)return false;
  },{optionalExit:false});
  const m=new api.PuzzleModel(level);m.startCountdown();for(const d of prefix){m.beginAction();d.path.forEach(p=>assert(m.moveBlockStep(d.blockId,...p)));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}
  if(!data.mechanismEvidence.starCases.length)for(const b of s.blocks.filter(b=>b.star))for(const side of ['top','right','bottom','left'])if(m.exitAttemptStatus(b.id,side)==='star-gate-required')data.mechanismEvidence.starCases.push({afterDrags:step,prefix,blockId:b.id,side});
  if(!data.mechanismEvidence.starCases.length)each(c,state,(_,cost,get)=>{
   if(cost!==1)return;const approach=get(),b=s.blocks.find(b=>b.id===approach.blockId);if(!b.star)return;
   const branch=[...prefix,approach],original=replay(branch);if(!original.valid)return;
   const originalModel=m.clone();originalModel.beginAction();for(const p of approach.path)assert(originalModel.moveBlockStep(b.id,...p));assert(originalModel.commitAction());const relaxedModel=originalModel.clone();delete relaxedModel.getBlock(b.id).star;
   for(const side of ['top','right','bottom','left']){if(originalModel.exitAttemptStatus(b.id,side)!=='star-gate-required'||relaxedModel.exitAttemptStatus(b.id,side)!=='ok')continue;
    data.mechanismEvidence.starCases.push({afterDrags:step,approach,prefix:branch,blockId:b.id,side});return false;}
  },{optionalExit:false});
  if(!data.mechanismEvidence.axisCases.length)for(const b of s.blocks.filter(b=>b.movementAxis&&!b.hidden&&!b.frozen)){
   const copy=structuredClone(level);delete copy.blocks.find(a=>a.id===b.id).movementAxis;
   for(const [dx,dy]of b.movementAxis==='vertical'?[[1,0],[-1,0]]:[[0,1],[0,-1]]){const action={blockId:b.id,path:[[b.x+dx,b.y+dy]]};if(replay([...prefix,action]).valid)continue;const relaxed=api.replayRevisedRoute(copy,[...prefix,action]);if(relaxed.valid)data.mechanismEvidence.axisCases.push({prefix,blockId:b.id,action});}
  }
  if(!data.earlyIceChoice)for(const b of s.blocks.filter(b=>b.frozen>0&&!b.hidden)){
   const copy=structuredClone(level);delete copy.blocks.find(a=>a.id===b.id).frozen;
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const relaxedMove={blockId:b.id,path:[[b.x+dx,b.y+dy]]},allowed=api.replayRevisedRoute(copy,[...prefix,relaxedMove]);if(allowed.valid&&allowed.clearEvents===r.clearEvents&&!replay([...prefix,relaxedMove]).valid){data.earlyIceChoice={beforeDrag:step+1,blockId:b.id,remainingIce:b.frozen,cleared:s.cleared,relaxedMove};break;}}
  }
  if(!data.earlyGateChoice)for(const g of s.gates.filter(g=>g.frozen>0))for(const b of s.blocks){
   const action={blockId:b.id,path:[],exitSide:g.side},copy=structuredClone(level);delete copy.gates.find(a=>a.id===g.id).frozen;
   if(replay([...prefix,action]).valid)continue;const allowed=api.replayRevisedRoute(copy,[...prefix,action]);if(allowed.valid&&allowed.clearEvents>r.clearEvents){data.earlyGateChoice={beforeDrag:step+1,gateId:g.id,remainingIce:g.frozen,cleared:s.cleared,relaxedMove:action};break;}
  }
  if(!data.earlyGateChoice)for(const g of s.gates.filter(g=>g.frozen>0)){
   if(!relaxedGateGraphs.has(g.id)){const copy=structuredClone(level);delete copy.gates.find(a=>a.id===g.id).frozen;relaxedGateGraphs.set(g.id,{copy,graph:compileSpatial(copy,full)});}
   const {copy,graph}=relaxedGateGraphs.get(g.id),relaxedPrefix=api.replayRevisedRoute(copy,prefix);if(!relaxedPrefix.valid)continue;
   const restored=JSON.parse(relaxedPrefix.finalStateKey);restored.gates.find(a=>a.id===g.id).frozen=g.frozen;if(JSON.stringify(restored)!==JSON.stringify(s))continue;
   each(graph,state,(_,cost,get)=>{if(cost!==0)return;const relaxedMove=get();if(relaxedMove.exitSide!==g.side||replay([...prefix,relaxedMove]).valid)return;const allowed=api.replayRevisedRoute(copy,[...prefix,relaxedMove]);if(!allowed.valid||allowed.clearEvents<=r.clearEvents)return;
    data.earlyGateChoice={beforeDrag:step+1,gateId:g.id,remainingIce:g.frozen,cleared:s.cleared,relaxedMove};return false;
   },{optionalExit:false});if(data.earlyGateChoice)break;
  }
  let next;each(c,state,(candidate,_,get)=>{if(JSON.stringify(get())===JSON.stringify(drags[step])){next=candidate;return false;}});assert(next,'Route gesture not present at '+step);state=next;
 }
 const checked=verifyDecisions(data,api);data.decisionReview=checked;
 const out=save(`${ROOT}/enriched${level.id}-${Date.now()}.json`,{...data,enrichedFrom:input});console.log(JSON.stringify({out,id:level.id,wrongParking:data.decisionCases.length,starCases:data.mechanismEvidence.starCases.length,axisCases:data.mechanismEvidence.axisCases.length,iceChoices:checked.earlyIceChoices.length}));
}

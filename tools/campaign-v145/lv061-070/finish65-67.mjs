import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
import {compile,each} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {proveOpeningFloor,verifyRouteProjection} from './opening-projection.mjs';
import {checkLiftFloor} from './lift-floor.mjs';
const {api,inputs}=await loadApi(),file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),{level,drags}=d,id=level.id;
assert([65,66,67].includes(id));const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67',lock=verifyRulesLock();assert(lock.ok);const old=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[id-1];
assert.deepEqual(geometry(level),old.geometry);for(const k of ['id','name','timeSeconds','reward'])assert.deepEqual(level[k],old.level[k]);assert.deepEqual(api.levelStarTargets(level),old.starTargets);
const audit={native:level.blocks.map(b=>({id:b.id,...api.matchFormalBlockShape(b.shape,'native-only')})),art:api.auditCandidateBlockArt(level),opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level)};
assert(audit.native.every(b=>b.quarterTurns===0));for(const k of ['art','opening','hidden','gates'])assert(audit[k].passed);
const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete);const target=id===65?[5,10]:[11,15];assert(replay.nonClearingDrags<=target[1]);
const projectionReplay=verifyRouteProjection(level,drags,api),proof=id===65?proveOpeningFloor(level,api,{floor:target[0],maxStates:1000000,maxMilliseconds:45000}):checkLiftFloor(level,api,{floor:target[0],maxStates:1000000,maxMilliseconds:60000});assert(proof.thresholdProven,JSON.stringify(proof));
const c=compile(level),m=new api.PuzzleModel(level);m.startCountdown();const mechanismProcess=[],cases=[];
const apply=(model,drag)=>{model.beginAction();for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());};
const stateOf=s=>{const out=new Uint16Array(c.N*2+c.covers.length);for(let i=0;i<c.N;i++){const b=c.blocks[i],a=s.blocks.find(a=>a.id===b.id);out[i]=!a?511:a.shutterId&&!s.shutters.find(q=>q.id===a.shutterId)?.revealed?510:(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7);out[c.N+i]=a?.frozen??0;}for(const co of c.covers)out[2*c.N+co.j]=s.shutters.find(s=>s.id===co.id).revealed?1:0;return out;};
for(let step=0;step<drags.length;step++){
 const before=m.snapshot(),next=drags[step];if(cases.length<3)each(c,stateOf(before),(_s,cost,get)=>{if(cost!==1)return;const wrong=get(),body=before.blocks.find(b=>b.id===wrong.blockId);if(body.shape.length<2||body.id===next.blockId||!wrong.path.length)return;const prefix=drags.slice(0,step),test=api.replayRevisedRoute(level,[...prefix,wrong,next]);if(test.valid||!test.error?.startsWith('Rejected move'))return;
  const recovery={blockId:body.id,path:[[body.x,body.y],...wrong.path.slice(0,-1)].reverse()},restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]),initial=api.replayRevisedRoute(level,prefix);if(!restored.valid||restored.finalStateKey!==initial.finalStateKey)return;
  const full=[...prefix,wrong,recovery,...drags.slice(step)],checked=api.replayRevisedRoute(level,full);if(!checked.valid||!checked.complete)return;
  cases.push({beforeDrag:step+1,blockId:body.id,area:body.shape.length,correctDrag:next,legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:full,consequence:'合法多格误停堵住下一动作；原路恢复同一状态后仍完整通关。不是全局唯一解或最优误差证明。'});return false;
 });
 apply(m,next);const after=m.snapshot();const changed=after.shutters.filter(s=>s.revealed&&!before.shutters.find(t=>t.id===s.id)?.revealed).map(s=>s.id),thawed=before.blocks.filter(b=>(b.frozen??0)>0&&(after.blocks.find(a=>a.id===b.id)?.frozen??0)===0).map(b=>b.id);if(changed.length||thawed.length)mechanismProcess.push({step:step+1,drag:next,cleared:after.cleared,revealed:changed,thawed});
}
assert(cases.length);
const sourceReview=JSON.parse(fs.readFileSync(root+'/source-corrections.json')).levels.find(x=>x.id===id);assert(sourceReview);
const toolFiles=['tools/campaign-v145/lv061-070/author65-67.mjs','tools/campaign-v145/lv061-070/finish65-67.mjs','tools/campaign-v145/lv061-070/opening-projection.mjs',root+'/lift-search.mjs',root+'/source-corrections.json'];
const final={...d,ruleVersion:lock.activeVersion,generationContract:'1.45.0',seed:d.reproduction?.seed??null,sourceAdaptation:sourceReview,
 originality:{changes:'保留原轮廓，重排原层内部及新增多格外围工作区；源中居中的Lift移到原创边界分区，出口相应重新安排。块邻接及解锁后交通通路改变，非整图镜像/旋转。'},
 design:{primaryMechanism:'占区控制的真实升降批次',concreteDecision:'必须把多格占位挪离整个Lift区域，提前留足出口通路，避免外来停车阻止揭层。',nativeOnly:true},
 decisionCases:cases,mechanismProcess,freshVerification:{source:true,audit,replay,projectionReplay,proof,measurement:measureRoute(level,drags,api),lowerBound:target[0],upperBound:replay.nonClearingDrags,levelSha256:digest(level),routeSha256:digest(drags),
 inputs:Object.fromEntries([...new Set([...inputs,...toolFiles])].map(p=>[p,digest(fs.readFileSync(p))])),starAssessment:{preserved:old.starTargets,clearLoad:level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),minimumTotalDrags:level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0)+target[0],witnessDrags:drags.length},pointerValidated:false,humanBlindTested:false},formalAdopted:false};
const out=`${root}/candidate${id}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(final,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,id,L:target[0],U:replay.nonClearingDrags,drags:drags.length,decisions:cases.length,mechanismProcess}));

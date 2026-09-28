import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {campaignCadence} from '../../campaign31-200-plan-v145.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
import {checkAxisKeyFloor} from './campaign-axis-key-floor-v146.mjs';
import {checkFullGeneratorFloor,verifyFullGeneratorRouteProjection} from './campaign-generator-axis-floor-v146.mjs';
import {checkImmediateGeneratorFloor,projectImmediateRoute} from './immediate-generator-floor56-v146.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const baselineFile='deliverables/remake31-200-v145-20260924/baseline.json',baseline=JSON.parse(fs.readFileSync(baselineFile));
assert.equal(digest(baseline.levels.map(r=>r.level)),'e8956f9f3d02d438f9e88c71386b803a5064a6793ad6e5fcac833196fa435ccb');
const {api,inputs}=await loadApi(),targets=campaignCadence().rows;
const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
export function verifyDecisionCases(data,api){
 const {level:l,drags}=data,cases=data.decisionCases;assert(Array.isArray(cases)&&cases.length>=1,'Fresh concrete recoverable multi-cell parking cases required');
 return cases.map(c=>{const n=c.atStep??c.beforeDrag;assert(n>=1&&n<=drags.length);const prefix=drags.slice(0,n-1),wrong=c.legalWrongParking,recovery=c.recoveryDrag,next=c.blockedNextAction;assert(l.blocks.find(b=>b.id===wrong.blockId)?.shape.length>1);const before=api.replayRevisedRoute(l,prefix),w=api.replayRevisedRoute(l,[...prefix,wrong]);assert(w.valid&&w.nonClearingDrags===before.nonClearingDrags+1);const blocked=api.replayRevisedRoute(l,[...prefix,wrong,next]);assert(!blocked.valid);const restored=api.replayRevisedRoute(l,[...prefix,wrong,recovery]);assert(restored.valid);assert.equal(restored.finalStateKey,before.finalStateKey);const full=[...prefix,wrong,recovery,...drags.slice(n-1)],r=api.replayRevisedRoute(l,full);assert(r.valid&&r.complete);if(c.fullRecoveredRoute)assert.deepEqual(c.fullRecoveredRoute,full);return{atStep:n,blockId:wrong.blockId,area:l.blocks.find(b=>b.id===wrong.blockId).shape.length,wrongLegal:true,nextRejected:blocked.error,exactRecovery:true,complete:true};});
}
function processMechanisms(level,drags){
 const m=new api.PuzzleModel(level);m.startCountdown();const steps=[],thaw=[],peels=[],reveals=[],spawns=[];
 for(const [i,d]of drags.entries()){const before=m.snapshot(),body=before.blocks.find(b=>b.id===d.blockId);apply(m,d);const after=m.snapshot(),now=after.blocks.find(b=>b.id===d.blockId);
  for(const field of ['blocks','gates'])for(const b of before[field])if(b.frozen>0&&after[field].find(a=>a.id===b.id)?.frozen===0)thaw.push({step:i+1,kind:field,id:b.id});
  if(now&&now.layers.length<body.layers.length)peels.push({step:i+1,id:body.id,from:body.layers[0],to:now.layers[0]});
  for(const s of after.shutters)if(s.revealed&&!before.shutters.find(b=>b.id===s.id)?.revealed)reveals.push({step:i+1,id:s.id});
  const queuedBefore=new Set(before.queuedBlocks.map(b=>b.id)),queuedAfter=new Set(after.queuedBlocks.map(b=>b.id));for(const id of queuedBefore)if(!queuedAfter.has(id))spawns.push({step:i+1,id});
  steps.push({step:i+1,id:d.blockId,clearEvent:after.cleared,delta:after.cleared-before.cleared});
 }
 assert(m.snapshot().complete);for(const b of level.blocks.filter(b=>b.frozen>0))assert(thaw.some(t=>t.kind==='blocks'&&t.id===b.id));for(const g of level.gates.filter(g=>g.frozen>0))assert(thaw.some(t=>t.kind==='gates'&&t.id===g.id));assert.equal(peels.length,level.blocks.filter(b=>b.layers?.length>1).length);assert.equal(reveals.length,level.shutters?.length??0);
 return{passed:true,steps,thaw,peels,reveals,spawns};
}
for(const file of process.argv.slice(2)){
 const d=JSON.parse(fs.readFileSync(file)),l=d.level,id=l.id,old=baseline.levels[id-1],target=targets.find(t=>t.id===id);assert(id>=51&&id<=60);assert.deepEqual(geometry(l),old.geometry);for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(l[k],old.level[k]);assert.deepEqual(api.levelStarTargets(l),old.starTargets);assert.equal(l.difficulty,target.difficulty);assert(!l.flipDoors?.length&&!l.coloredGrids?.length&&!l.elevators?.length&&!l.conveyors?.length);assert(!l.blocks.some(b=>b.star||b.timedBombSeconds!==undefined||b.rotationBadge));assert(!l.gates.some(g=>g.star));if(id<60)assert(!l.blocks.some(b=>b.keyId||b.lockedBy));assert(!l.shutters?.some(s=>s.skin==='lift'));
 const audit=auditSpatial(l,api);assert(audit.passed,JSON.stringify(audit));const replay=api.replayRevisedRoute(l,d.drags);assert(replay.valid&&replay.complete);const bounds=target.range??target.repositionRange??[target.min,target.max];const min=({easy:5,normal:11,hard:16,super:21})[target.difficulty],max=({easy:10,normal:15,hard:20,super:30})[target.difficulty];assert(replay.nonClearingDrags>=min&&replay.nonClearingDrags<=max);const measurement=measureRoute(l,d.drags,api);assert(measurement.multiCellDrags>measurement.singleCellDrags);
 const decisions=verifyDecisionCases(d,api),mechanisms=processMechanisms(l,d.drags);const proof=id===56?checkImmediateGeneratorFloor(l,api,{floor:min,maxStates:3000000,maxMilliseconds:180000}):l.generators?.length?checkFullGeneratorFloor(l,api,{floor:min,maxStates:3000000,maxMilliseconds:180000}):checkAxisKeyFloor(l,{floor:min,maxStates:3000000,maxMilliseconds:180000});assert(proof.thresholdProven,JSON.stringify(proof));const projection=id===56?projectImmediateRoute(l,d.drags,api):l.generators?.length?verifyFullGeneratorRouteProjection(l,d.drags,api):undefined;
 assert(d.sourceReview&&d.sourceAdaptation&&d.originality&&d.design?.concreteDecision,'Source/adaptation/originality/decision specification required');
 const sourceFile=typeof d.sourceReview==='string'?d.sourceReview:null,sourceData=sourceFile?JSON.parse(fs.readFileSync(sourceFile)):d.sourceReview;
 const clearLoad=l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),bindFiles=[...inputs,baselineFile,file,...(sourceFile?[sourceFile]:[]),'docs/rules/manifest.json','docs/mechanism-rules-v1.47.0.md',process.argv[1],'tools/campaign-v145/lv051-060/campaign-axis-key-graph-v146.mjs','tools/campaign-v145/lv051-060/campaign-axis-key-floor-v146.mjs','tools/campaign-v145/lv051-060/campaign-generator-axis-floor-v146.mjs'];
 if(id===56)bindFiles.push('tools/campaign-v145/lv051-060/immediate-generator-floor56-v146.mjs','tools/campaign-v145/lv051-060/campaign-generator-axis-search-v146.mjs','tools/campaign-v145/lv051-060/campaign-generator-axis-domain-v146.mjs','tools/remake21to30-mask-floor.mjs');
 const checkRefs=v=>{if(!v||typeof v!=='object')return;const p=v.file??v.path;if(typeof p==='string'&&typeof v.sha256==='string'){assert.equal(digest(fs.readFileSync(p)),v.sha256,'Source evidence drift '+p);bindFiles.push(p);}for(const x of Object.values(v))checkRefs(x);};checkRefs(sourceData);
 const r={ruleVersion:lock.activeVersion,checkedAt:new Date().toISOString(),status:'PASS',id,candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(l),routeSha256:digest(d.drags),sourceSha256:sourceFile?digest(fs.readFileSync(sourceFile)):digest(sourceData),target:{difficulty:target.difficulty,min,max},L:min,U:replay.nonClearingDrags,totalDrags:d.drags.length,audit,replay,measurement,proof,projection,decisions,mechanisms,bindings:Object.fromEntries(bindFiles.map(p=>[p,digest(fs.readFileSync(p))])),starAssessment:{preservedTargets:old.starTargets,clearLoad,guaranteedMinimumDrags:clearLoad+min,moveTargetImpossible:clearLoad+min>old.starTargets.moveTarget,witnessWithinMoveTarget:d.drags.length<=old.starTargets.moveTarget},pointerValidated:false,formalAdopted:false,humanBlindTested:false,releaseApproved:false};
 const out=path.dirname(file)+'/independent-check'+id+'-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,id,status:r.status,L:r.L,U:r.U,starAssessment:r.starAssessment}));
}

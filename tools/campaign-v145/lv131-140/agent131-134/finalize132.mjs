import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest,loadPreviewCore} from '../../../revised-preview-validation-v160.mjs';
import {loadSpatialApi} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {checkCandidate,ruleGate,BASELINE} from '../../../remake131to140-v172.mjs';
import {measureRoute} from '../../../remake21to30-quality.mjs';
import {projectFrozenBlockedQueues} from './frozen-blocked-queue-floor.mjs';

ruleGate();
const input=process.argv[2],raw=JSON.parse(fs.readFileSync(input));
const root='deliverables/remake131-140-v146-20260924/agent131-134';
const [spatial,{api:core},starBundle]=await Promise.all([
 loadSpatialApi(),loadPreviewCore(),build({stdin:{resolveDir:process.cwd(),contents:"export {levelStarTargets} from './src/core/levelStarConditions.ts'"},bundle:true,write:false,platform:'node',format:'esm'})
]);
const stars=await import(`data:text/javascript;base64,${Buffer.from(starBundle.outputFiles[0].text).toString('base64')}`);
const api={...core,...spatial,...stars},level=raw.level,baseline=JSON.parse(fs.readFileSync(BASELINE));
const validation=checkCandidate(raw,baseline,api),measurement=measureRoute(level,raw.drags,api);
assert.equal(validation.replay.nonClearingDrags,15);assert(measurement.multiCellDrags>measurement.singleCellDrags);
assert.equal(raw.proof.sourceLevelSha256,digest(level));assert(raw.proof.thresholdProven&&raw.proof.floor===11);
const ledger=JSON.parse(fs.readFileSync(raw.sourceReview.ledger));
assert.equal(ledger.levelSha256,digest(level));assert.equal(ledger.bindings.length,34);
assert.equal(new Set(ledger.bindings.map(b=>b.sourceId)).size,34);
assert.equal(new Set(ledger.bindings.map(b=>b.candidateId)).size,34);
assert.deepEqual(ledger.candidateTotals,{opening:22,queued:12,openingM11:6,fullM11:10});

const projected=projectFrozenBlockedQueues(level,api),real=new api.PuzzleModel(level),relaxed=new api.PuzzleModel(projected.level);
real.startCountdown();relaxed.startCountdown();
const queued=new Set(level.generators.flatMap(g=>g.queueBlockIds)),original=new Set(level.blocks.filter(b=>!queued.has(b.id)).map(b=>b.id));
const deliveries=[],clears=[],iceEvents=[],gateEvents=[],gateUses=[],units=[];
let openingClears=0,queueClears=0,unitCount=0;
function mapped(){
 const a=real.snapshot(),b=relaxed.snapshot();
 const selected=s=>s.blocks.filter(x=>original.has(x.id)).map(x=>({id:x.id,x:x.x,y:x.y,frozen:x.frozen})).sort((x,y)=>x.id.localeCompare(y.id));
 assert.deepEqual(selected(a),selected(b),'Retained body poses and original ice match at every real unit step');
 assert.deepEqual(a.gates.map(g=>({id:g.id,frozen:g.frozen})),b.gates.map(g=>({id:g.id,frozen:g.frozen})),'Both low gate counters match');
 assert(openingClears>=14||queueClears===0);
}
function observe(before,step,phase){
 const after=real.snapshot();
 for(const cargo of before.queuedBlocks.filter(b=>!after.queuedBlocks.some(a=>a.id===b.id))){
  const active=after.blocks.find(b=>b.id===cargo.id);assert(active,'Delivered cargo remains active immediately after release');
  const machine=level.generators.find(g=>g.queueBlockIds.includes(cargo.id));
  assert.deepEqual([active.x,active.y],machine.spawn);
  deliveries.push({step,phase,machine:machine.id,body:cargo.id,fifoIndex:machine.queueBlockIds.indexOf(cargo.id),spawn:machine.spawn,cleared:after.cleared});
  assert(after.cleared>=14,'No first delivery before opening ice thaw');
 }
 for(const ice of before.blocks.filter(b=>b.frozen>0)){
  const now=after.blocks.find(b=>b.id===ice.id);
  if(now?.frozen===0)iceEvents.push({step,phase,id:ice.id,cleared:after.cleared,from:ice.frozen,to:0});
 }
 for(const gate of before.gates.filter(g=>g.frozen>0)){
  const now=after.gates.find(g=>g.id===gate.id);
  if(now?.frozen===0)gateEvents.push({step,phase,id:gate.id,cleared:after.cleared,from:gate.frozen,to:0});
 }
 mapped();unitCount++;
 units.push({step,phase,cleared:after.cleared,queued:after.queuedBlocks.length,openingClears,queueClears});
}
mapped();
for(const [index,drag]of raw.drags.entries()){
 const step=index+1,isQueue=queued.has(drag.blockId);
 real.beginAction();if(!isQueue)relaxed.beginAction();
 for(const [pathIndex,point]of drag.path.entries()){
  const before=real.snapshot();assert(real.moveBlockStep(drag.blockId,...point));
  if(!isQueue)assert(relaxed.moveBlockStep(drag.blockId,...point));
  observe(before,step,`move-${pathIndex}`);
 }
 if(drag.exitSide){
  const before=real.snapshot(),result=real.tryExit(drag.blockId,drag.exitSide);assert(result.ok);
  if(!isQueue)assert(relaxed.tryExit(drag.blockId,drag.exitSide).ok);
  const count=real.snapshot().cleared-before.cleared;
  if(isQueue)queueClears+=count;else openingClears+=count;
  if(count)clears.push({step,body:drag.blockId,queued:isQueue,cleared:real.snapshot().cleared});
  gateUses.push({step,body:drag.blockId,gateId:result.gateId,queued:isQueue});
  observe(before,step,'exit');
 }
 const before=real.snapshot();assert(real.commitAction());if(!isQueue)assert(relaxed.commitAction());observe(before,step,'commit');
}
assert(real.snapshot().complete&&relaxed.snapshot().complete);assert.equal(queueClears,12);assert.equal(openingClears,22);
assert.equal(deliveries.length,12);assert.equal(new Set(deliveries.map(d=>d.body)).size,12);
for(const g of level.generators)assert.deepEqual(deliveries.filter(d=>d.machine===g.id).map(d=>d.body),g.queueBlockIds);
assert.equal(iceEvents.length,4);assert(iceEvents.every(e=>e.cleared===14));
assert.equal(gateEvents.length,2);assert(gateEvents.every(e=>e.cleared===3));
assert.deepEqual([...new Set(gateUses.map(e=>e.gateId))].sort(),level.gates.map(g=>g.id).sort());
const dependencies=[];
for(const step of measurement.steps.filter(s=>s.clears===0&&s.area>1)){
 const i=step.step-1,next=raw.drags[i+1];if(!next)continue;
 const omission=api.replayRevisedRoute(level,[...raw.drags.slice(0,i),next]);
 if(!omission.valid)dependencies.push({step:step.step,blockId:step.blockId,area:step.area,nextAction:next,errorWhenOmitted:omission.error,globalOrderProven:false});
}
const toolFiles=['tools/campaign-v145/lv131-140/agent131-134/generate132-v20.mjs','tools/campaign-v145/lv131-140/agent131-134/splice132.mjs','tools/campaign-v145/lv131-140/agent131-134/source132.mjs','tools/campaign-v145/lv131-140/agent131-134/frozen-blocked-queue-floor.mjs','tools/campaign-v145/lv131-140/agent131-134/frozen-blocked-queue-floor.test.mjs','tools/campaign-v145/lv131-140/agent131-134/finalize132.mjs'];
const report={candidate:input,levelSha256:digest(level),routeSha256:digest(raw.drags),validation,measurement,dependencies,events:{deliveries,clears,iceEvents,gateEvents,gateUses},unitMapping:{passed:true,unitCount,units,queueStutterDrags:12,realCost:15,projectedCost:15},theorem:projected.proofPrecondition,toolBindings:toolFiles.map(file=>({file,sha256:digest(fs.readFileSync(file))})),qualification:{file:root+'/frozen-blocked-qualification-1790474093728.json',sha256:digest(fs.readFileSync(root+'/frozen-blocked-qualification-1790474093728.json')),boundedGraphTraversalNotExhaustive:true},mechanismReview:{main:'Four synchronized frozen bodies gate the first deliveries of four independent FIFO machines; plan the initial clearance while protecting later delivery paths.',auxiliary:'Two ice3 bottom gates open early and all four ordinary/frozen exits are actually used.',multiCellDecisionEvidence:dependencies.length,blindTested:false},pointerValidated:false,timeValidated:false,formalAdopted:false};
const stamp=Date.now(),reportPath=root+`/acceptance132-author-${stamp}.json`;fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
const {search,audit,constructorSha256,sourceReview,...kept}=raw;
const final={...kept,ruleVersion:'1.72.0',sourceReview,search:{status:'complete-authoritative-witness',construction:'Projected opening witness plus exact true-FIFO zero-cost cargo clear gestures',historicalOpeningCandidate:raw.sourceCandidate,openingWitness:raw.projectedWitness,actualWitnessReplayed:true,nonClearingDrags:15,drags:49},audit:validation.checks,reproduction:{sourceInput:input,sourceInputSha256:digest(fs.readFileSync(input)),tools:report.toolBindings},authorAcceptance:{file:reportPath,sha256:digest(fs.readFileSync(reportPath))},formalAdopted:false,pointerValidated:false,timeValidated:false};
const finalPath=root+`/enriched132-final-${stamp}.json`;fs.writeFileSync(finalPath,JSON.stringify(final,null,2)+'\n');
console.log(JSON.stringify({reportPath,finalPath,levelSha256:digest(level),L:11,U:15,drags:49,multi:measurement.multiCellDrags,single:measurement.singleCellDrags,deliveries:deliveries.length,iceEvents,gateEvents,usedGates:[...new Set(gateUses.map(e=>e.gateId))],unitMapping:unitCount}));

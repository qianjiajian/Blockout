import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';

const root='deliverables/lv70-remake-20260927';
const oldRoot='deliverables/remake31-200-v145-20260924/batches/lv061-070';
const summaryFile=oldRoot+'/summary.json',sourceFile=oldRoot+'/source-audit/source-review70.json';
const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,'1.90.0');
const summary=JSON.parse(fs.readFileSync(summaryFile)),row=summary.rows.find(r=>r.id===70),source=JSON.parse(fs.readFileSync(sourceFile));
const candidate=JSON.parse(fs.readFileSync(row.candidate.path)),{api,inputs}=await loadApi(),level=api.LEVELS[69];
assert.equal(digest(fs.readFileSync(row.candidate.path)),row.candidate.sha256);
assert.deepEqual(JSON.parse(JSON.stringify(level)),candidate.level,'Current formal70 must match the historical route map before diagnosing that route');
assert.equal(digest(level),row.candidate.levelSha256);
const replay=api.replayRevisedRoute(level,candidate.drags);assert(replay.valid&&replay.complete);
const queueIds=new Set(level.generators.flatMap(g=>g.queueBlockIds)),opening=level.blocks.filter(b=>!queueIds.has(b.id));
const m=new api.PuzzleModel(level);m.startCountdown();const unitBirths=[],steps=[];
function apply(model,d){model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());}
for(const[index,d]of candidate.drags.entries()){
 const before=m.snapshot(),b=m.getBlock(d.blockId);assert(b);const started=m.snapshot();m.beginAction();
 for(const[j,p]of d.path.entries()){
  const prior=m.snapshot(),moving=m.getBlock(d.blockId),oldAnchor=[moving.x,moving.y];assert(m.moveBlockStep(d.blockId,...p));const next=m.snapshot();
  const born=next.blocks.filter(x=>!prior.blocks.some(y=>y.id===x.id));
  if(born.length){const reverse=m.clone();const returnAccepted=reverse.moveBlockStep(d.blockId,...oldAnchor);
   unitBirths.push({drag:index+1,unitStep:j+1,moving:d.blockId,oldAnchor,newAnchor:p,cleared:next.cleared,born:born.map(x=>({id:x.id,color:x.color,shape:x.shape,anchor:[x.x,x.y]})),remainingOpeners:next.blocks.filter(x=>!queueIds.has(x.id)).map(x=>x.id),reverseAccepted:returnAccepted});
  }
 }
 if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());const after=m.snapshot();
 const born=after.blocks.filter(x=>!started.blocks.some(y=>y.id===x.id));
 steps.push({drag:index+1,blockId:d.blockId,fromQueue:queueIds.has(d.blockId),shapeArea:b.shape.length,path:d.path,exitSide:d.exitSide??null,nonClearing:after.cleared===before.cleared,cleared:after.cleared,born:born.map(x=>x.id),remainingOpening:after.blocks.filter(x=>!queueIds.has(x.id)).length,activeQueue:after.blocks.filter(x=>queueIds.has(x.id)).length,queued:after.queuedBlocks.length,generators:after.generators.map(x=>({id:x.id,remaining:x.remaining})),gateIce:after.gates.map(x=>({color:x.color,frozen:x.frozen??0}))});
}
assert(m.snapshot().complete);
const firstBirth=steps.find(s=>s.born.length),lastOpeningRemoval=Math.max(...steps.filter(s=>!s.fromQueue&&!s.nonClearing).map(s=>s.drag));
const queueSteps=steps.filter(s=>s.fromQueue),tail=steps.filter(s=>s.drag>lastOpeningRemoval);
const oldCausalityFile=oldRoot+'/author70/generator-causality-1790250630652.json',oldCausality=JSON.parse(fs.readFileSync(oldCausalityFile));
const targetCase=unitBirths.find(b=>b.drag===oldCausality.case.beforeDrag&&b.unitStep===oldCausality.case.unitStep);assert(targetCase&&!targetCase.reverseAccepted);
const noCargo=structuredClone(level);noCargo.generators=[];noCargo.blocks=noCargo.blocks.filter(b=>!queueIds.has(b.id));const reduced=new api.PuzzleModel(noCargo);reduced.startCountdown();
for(const d of candidate.drags.slice(0,targetCase.drag-1))apply(reduced,d);reduced.beginAction();for(const p of candidate.drags[targetCase.drag-1].path.slice(0,targetCase.unitStep))assert(reduced.moveBlockStep(targetCase.moving,...p));
assert(reduced.moveBlockStep(targetCase.moving,...targetCase.oldAnchor));
const stars=api.levelStarTargets(level),clearLoad=level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
const rawBindings=[summaryFile,sourceFile,row.candidate.path,oldCausalityFile,'tools/lv70-remake-20260927/source-current-audit.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.90.0.md',...inputs];
const sourceEvidence=Object.entries(source.evidenceBindings).map(([path,sha256])=>({path,expected:sha256,current:fs.existsSync(path)?digest(fs.readFileSync(path)):null}));
assert(sourceEvidence.every(x=>x.expected===x.current),'Historical source frames drift');
const report={status:'CURRENT_FORMAL_SOURCE_AND_ROUTE_DIAGNOSIS_COMPLETE',ruleVersion:lock.activeVersion,levelSha256:digest(level),level,
 sourceFacts:{sourceFile,sourceVerifiedInHistoricalAudit:source.sourceVerified,sourceEvidenceRehashed:true,sourceInventory:source.inventorySummary,sourceQueue:source.stages[0].items,sourceGates:source.mechanisms.gates.items,newVisualSourceReviewPerformed:false},
 routeSource:row.candidate,routeReplay:replay,oldDifficultyEvidence:{lowerBound:row.lowerBound,upperBound:row.upperBound,scope:'Historical certificate cited only; no fresh lower-bound search performed by this diagnostic'},
 currentInventory:{openingBodies:opening.length,queueBodies:queueIds.size,fullBodies:level.blocks.length,clearLoad,openingArea:opening.reduce((n,b)=>n+b.shape.length,0),queueColors:auditGeneratorQueueColors(level)},
 scoring:{difficulty:level.difficulty,band:[11,15],timeSeconds:level.timeSeconds,parMoves:level.parMoves,stars,minimumTotalUnderBand:clearLoad+11,maximumTotalUnderBand:clearLoad+15,currentWitnessDrags:replay.effectiveDrags,oldTargetImpossibleFromClearLoadAlone:clearLoad>stars.moveTarget,retainingSource17QueuePlusOneSourceOpenerMinimumAtL11:29,necessaryBodyBudgetIfKeeping23MovesAtL11:stars.moveTarget-11,timeNotFreshPointerValidated:true},
 generatorDiagnosis:{firstBirthDrag:firstBirth.drag,firstBirthCleared:firstBirth.cleared,firstBirthOpeningRemaining:firstBirth.remainingOpening,lastOpeningRemovalDrag:lastOpeningRemoval,queueBodyActionCount:queueSteps.length,queueRepositionActions:queueSteps.filter(x=>x.nonClearing).length,queueClearActions:queueSteps.filter(x=>!x.nonClearing).length,tailAfterLastOpening:{drags:tail.length,queueActions:tail.filter(x=>x.fromQueue).length,repositions:tail.filter(x=>x.nonClearing).length,clears:tail.filter(x=>!x.nonClearing).length},localCounterfactual:{source:oldCausalityFile,reproduced:true,actualReverseRejected:true,withoutCargoReverseAccepted:true,onlyLocalNotGlobal:true},conclusion:'Current route delays the only generator until the opening puzzle is almost over; local immediate-spawn irreversibility is real, but does not by itself establish a difficult generator phase. Queue route action statistics determine whether tail cargo is all direct-clear.'},
 unitBirths,steps,sourceEvidence,bindings:Object.fromEntries(rawBindings.map(p=>[p,digest(fs.readFileSync(p))])),
 generatedCandidate:false,productionModified:false,playerSaveTouched:false,newDifficultyCertified:false,newPointerValidated:false,mobileTested:false,published:false};
fs.mkdirSync(root,{recursive:true});const out=root+'/source-current-audit-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,status:report.status,stars,scoreConflict:report.scoring,generatorDiagnosis:report.generatorDiagnosis,levelSha256:report.levelSha256}));

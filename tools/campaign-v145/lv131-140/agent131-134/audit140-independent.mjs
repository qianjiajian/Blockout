import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest,loadPreviewCore} from '../../../revised-preview-validation-v160.mjs';
import {loadSpatialApi} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {checkCandidate,ruleGate,BASELINE} from '../../../remake131to140-v172.mjs';
import {checkAxisFloor} from '../../../remake131to140-axis-floor-v172.mjs';
import {measureRoute} from '../../../remake21to30-quality.mjs';

const lock=ruleGate(),input=process.argv[2],raw=JSON.parse(fs.readFileSync(input)),l=raw.level;
const [spatial,{api:core},sb]=await Promise.all([loadSpatialApi(),loadPreviewCore(),build({stdin:{resolveDir:process.cwd(),contents:"export {levelStarTargets} from './src/core/levelStarConditions.ts'"},bundle:true,write:false,platform:'node',format:'esm'})]);
const stars=await import(`data:text/javascript;base64,${Buffer.from(sb.outputFiles[0].text).toString('base64')}`),api={...core,...spatial,...stars},baseline=JSON.parse(fs.readFileSync(BASELINE));
const staticReplay=checkCandidate(raw,baseline,api),measurement=measureRoute(l,raw.drags,api),facts=raw.sourceReview;
const expectedOpening=[['V2','red'],['V2','yellow'],['V2','blue'],['V2','purple'],['V2','green'],['S','yellow'],['S','blue'],['S','green'],['H2','purple'],['V3','blue','vertical'],['V3','cyan','vertical'],['V3','yellow','vertical'],['V3','red','vertical']].map(([shape,color,movementAxis])=>({shape,color,...(movementAxis?{movementAxis}:{})}));
const expectedHidden=[{shape:'T4',layers:['green','purple']},{shape:'H2',layers:['purple','yellow']},{shape:'T4',layers:['red','blue']},{shape:'T4',color:'purple'},{shape:'S',color:'green'}];
assert.deepEqual(facts.sourceOpening,expectedOpening);assert.deepEqual(facts.hiddenFacts,expectedHidden);
const maps=[...(facts.sourceMap??[]),...(facts.hiddenMap??[])];assert.equal(maps.length,18);assert.equal(new Set(maps.map(m=>m.source.id)).size,18);assert.equal(new Set(maps.map(m=>m.target.id)).size,18);
for(const m of maps){
 const b=l.blocks.find(b=>b.id===m.target.id);assert(b,m.target.id);
 for(const k of ['x','y','shape','color','movementAxis','shutterId'])assert.deepEqual(m.target[k],b[k],`${m.target.id} ${k} source binding must be fresh`);
 assert.deepEqual(m.target.layers,b.layers??[b.color],`${b.id} layers binding`);
 if(m.source.movementAxis)assert.equal(b.movementAxis,m.source.movementAxis);
 if(m.source.layers?.length>1)assert.equal(b.layers?.length,m.source.layers.length);
 assert.equal(!!b.shutterId,m.source.stage==='cover8');
}
const sourceIds=new Set(maps.map(m=>m.target.id)),extras=l.blocks.filter(b=>!sourceIds.has(b.id));assert.equal(extras.length,1);assert.equal(extras[0].id,'a140-capacity-0');assert.equal(extras[0].shape.length,2);
for(const b of extras)for(const k of ['layers','movementAxis','frozen','shutterId','keyId','lockedBy'])assert(!b[k],'Only ordinary capacity filler');
const irregular=b=>b.shape.length<(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])));
assert.equal(l.blocks.length,19);assert.equal(l.blocks.filter(b=>b.movementAxis==='vertical').length,4);assert(l.blocks.filter(b=>b.movementAxis).every(b=>!irregular(b)));
assert.equal(l.blocks.filter(b=>b.layers?.length>1).length,3);assert(l.blocks.filter(b=>b.layers?.length>1).every(b=>!irregular(b)&&b.shutterId));
assert.equal(l.blocks.filter(irregular).length,3);assert.equal(l.blocks.filter(b=>b.shutterId).length,5);
assert.equal(l.shutters.length,1);assert.equal(l.shutters[0].count,8);assert.equal(l.shutters[0].width*l.shutters[0].height,15);
assert.deepEqual(l.gates.filter(g=>g.frozen).map(g=>({color:g.color,frozen:g.frozen})).sort((a,b)=>a.color.localeCompare(b.color)),[{color:'purple',frozen:3},{color:'red',frozen:4},{color:'yellow',frozen:2}]);
const art=api.auditCandidateBlockArt(l);assert(art.passed);assert(l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
const assets=[...new Set(art.requirements.map(r=>'public/'+r.path))].map(file=>({file,sha256:digest(fs.readFileSync(file)),bytes:fs.statSync(file).size}));
const proof=checkAxisFloor(l,api,{floor:16,maxStates:200000,maxMilliseconds:10000});assert(proof.thresholdProven,'Fresh original JS lower bound must pass');
const model=new api.PuzzleModel(l),events=[];model.startCountdown();
for(const [i,d]of raw.drags.entries()){
 const before=model.snapshot(),body=structuredClone(model.getBlock(d.blockId)),x=body.x;model.beginAction();
 for(const p of d.path){assert(model.moveBlockStep(d.blockId,...p));if(body.movementAxis==='vertical')assert.equal(model.getBlock(d.blockId).x,x);}
 let result;if(d.exitSide){result=model.tryExit(d.blockId,d.exitSide);assert(result.ok);}assert(model.commitAction());
 const after=model.snapshot(),remains=model.getBlock(d.blockId);
 events.push({step:i+1,id:d.blockId,axis:body.movementAxis??null,clears:after.cleared-before.cleared,clearedTotal:after.cleared,peel:!!remains&&body.layers.length>remains.layers.length,gate:result?.gateId??null,revealed:after.shutters.filter(s=>s.revealed&&!before.shutters.find(a=>a.id===s.id)?.revealed).map(s=>s.id),thawed:after.gates.filter(g=>g.frozen===0&&(before.gates.find(a=>a.id===g.id)?.frozen??0)>0).map(g=>g.id)});
}
assert(model.snapshot().complete);assert.equal(events.filter(e=>e.peel).length,3);assert.equal(model.snapshot().cleared,22);
assert.equal(events.flatMap(e=>e.revealed).length,1);assert.equal(events.find(e=>e.revealed.length).clearedTotal,8);
assert.deepEqual([...new Set(events.flatMap(e=>e.gate?[e.gate]:[]))].sort(),l.gates.map(g=>g.id).sort());assert.equal(events.flatMap(e=>e.thawed).length,3);
assert.equal(api.levelStarTargets(l).moveTarget,37);assert.equal(l.timeSeconds,70);
const sourceEvidence=['.codex-temp/video-audit-135-169/openings/level-140.jpg','.codex-temp/video-audit-135-169/137-144/samples1s/sec-00377.jpg','.codex-temp/video-audit-135-169/137-144/samples1s/sec-00417.jpg'].map(file=>({file,sha256:digest(fs.readFileSync(file)),independentlyViewed:true}));
const report={activeRuleVersion:lock.activeVersion,input,inputSha256:digest(fs.readFileSync(input)),levelSha256:digest(l),routeSha256:digest(raw.drags),passed:true,sourceEvidence,sourceObserved:{opening:expectedOpening,openingCells:27,hidden:expectedHidden,hiddenCells:15,fullBodies:18,openingIrregular:0,fullIrregular:3,axes:4,shells:3,cover8:1,iceGates:{purple:3,yellow:2,red:4}},sourceBindingsChecked:maps,extraCapacity:extras,capacityAccounting:{sourceOccupiedCells:42,baselinePlayableCells:56,requiredCapacity:14,sourceMappedBodiesCandidateArea:l.blocks.filter(b=>sourceIds.has(b.id)).reduce((n,b)=>n+b.shape.length,0),extraFillerArea:2,totalCandidateOccupiedArea:l.blocks.reduce((n,b)=>n+b.shape.length,0)},irregularTransfer:{sourceHiddenShellsToRectangles:['source-hidden-0','source-hidden-2'],replacementIrregulars:l.blocks.filter(irregular).map(b=>({id:b.id,stage:b.shutterId??'opening',shapeId:api.matchFormalBlockShape(b.shape,'native-only').shapeId})),retainedTotal:3,notExactSourceCopy:true},staticReplay,proof,measurement,events,assets,starConflict:{retainedMoveTarget:37,timeSeconds:70,timeStarTargetSeconds:api.levelStarTargets(l).timeTargetSeconds,bodyClears:19,mandatoryShellPeels:3,certifiedRepositionLowerBound:16,totalDragLowerBound:38,witnessDrags:42,withoutTools:true,moveStarAchievable:false,status:'ORIGINAL_MOVE_STAR_TARGET_PRESERVED_BUT_UNREACHABLE_WITHOUT_TOOLS',originalTargetChanged:false},pointerValidated:false,naturalClockValidated:false,humanBlindTested:false,formalAdoptionDecision:'Root owns formal Pointer/natural-clock and adoption; this is independent author-candidate review only.'};
const out=`deliverables/remake131-140-v146-20260924/agent131-134/audit140-independent-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,passed:true,levelSha256:digest(l),L:16,U:staticReplay.replay.nonClearingDrags,drags:raw.drags.length,multi:measurement.multiCellDrags,single:measurement.singleCellDrags,sourceBindings:maps.length,assetFiles:assets.length,proof:{status:proof.status,states:proof.states,ms:proof.ms},starConflict:report.starConflict}));

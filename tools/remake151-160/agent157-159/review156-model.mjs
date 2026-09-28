import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {checkAutomaticGeneratorFloor} from '../../remake131to140-generator-floor-v172.mjs';
import {checkFullGeneratorFloor} from '../../remake31to40-full-generator-floor-v141.mjs';
const root='deliverables/remake151-160-20260927',out=root+'/agent157-159';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts'; export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const oldPath=root+'/agent154-156/candidate-156-3209.json',old=JSON.parse(fs.readFileSync(oldPath));
const oldDiagnostics={kind:'bounded-existing-tool-domain-check',candidate:oldPath,candidateSha256:digest(fs.readFileSync(oldPath)),levelSha256:digest(old.level),
 automatic:checkAutomaticGeneratorFloor(old.level,api,{floor:5,maxStates:50000,maxMilliseconds:4000}),
 optionalSpawn:checkFullGeneratorFloor(old.level,api,{floor:5,maxStates:50000,maxMilliseconds:4000}),
 conclusion:'No floor certificate and no sub-5 real counterexample. Existing tools fail their structural domains before search. No derivative graph was generated. Stop because a new candidate has replaced this layout.',
 requiredButNotImplemented:['Normalize each offset cargo with its own physical spawn and inverse path mapping before any pose enumeration; raw anchors may legally be negative.','Preserve all four FIFO queues. Ordinary permanently open gates may relax flip phases but this must be explicit, not mislabelled as exact equivalence.']};
assert.equal(oldDiagnostics.automatic.status,'unsupported');assert.equal(oldDiagnostics.optionalSpawn.status,'unsupported');
const path=process.argv[2]??root+'/agent154-156/candidate-156-4209.json',candidate=JSON.parse(fs.readFileSync(path)),level=candidate.level;
assert.equal(level.id,156);assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');
assert.equal(level.generators.length,4);assert(level.generators.every(g=>g.queueBlockIds.length===4));
assert.equal(level.blocks.length,29);assert.deepEqual(level.blocks.filter(b=>b.frozen).map(b=>b.frozen),[1,1]);
assert.equal(level.flipDoors.length,5);assert(level.flipDoors.every(g=>!g.frozen));
assert.deepEqual(Object.fromEntries(level.flipDoors.map(g=>[g.color,g.initiallyOpen])),{yellow:false,green:true,red:true,cyan:true,orange:true});
const model=new api.PuzzleModel(level),legacy=new api.PuzzleModel({...structuredClone(level),mechanismRules:'revised-2026-09-23-v1.4'});
const omitProfile=s=>{const v=structuredClone(s);delete v.mechanismRules;return v;};
let previous=model.snapshot(),unitCalls=0,negativeAnchors=0,nonClearing=0,multi=0,single=0;
const arrivals=[];
const check=(step,method)=>{
 const after=model.snapshot();assert.deepEqual(omitProfile(after),omitProfile(legacy.snapshot()),`profile bridge ${step}/${method}`);
 for(const g of after.generators){const before=previous.generators.find(x=>x.id===g.id);assert(g.head>=before.head);assert.equal(g.remaining,g.queueBlockIds.length-g.head);assert.equal(g.nextBlockId,g.queueBlockIds[g.head]);
  const ids=new Set(after.queuedBlocks.map(b=>b.id));assert.deepEqual(g.queueBlockIds.filter(id=>ids.has(id)),g.queueBlockIds.slice(g.head));
  for(const id of g.queueBlockIds.slice(before.head,g.head)){const b=after.blocks.find(b=>b.id===id);assert(b);assert.deepEqual([b.x,b.y],g.spawn);arrivals.push({step,method,generator:g.id,id,head:g.head,remaining:g.remaining});}
 }
 assert(!after.failed);previous=after;unitCalls++;
};
model.startCountdown();legacy.startCountdown();check(0,'startCountdown');
for(const [index,drag]of candidate.drags.entries()){
 const before=model.snapshot(),moving=before.blocks.find(b=>b.id===drag.blockId);assert(moving);
 model.beginAction();legacy.beginAction();
 for(const point of drag.path){assert(model.moveBlockStep(drag.blockId,...point));assert(legacy.moveBlockStep(drag.blockId,...point));if(point.some(x=>x<0))negativeAnchors++;check(index+1,'moveBlockStep');}
 if(drag.exitSide){const pre=model.snapshot();const a=model.tryExit(drag.blockId,drag.exitSide),b=legacy.tryExit(drag.blockId,drag.exitSide);assert(a.ok&&b.ok);delete a.exitAnimationId;delete b.exitAnimationId;assert.deepEqual(a,b);check(index+1,'tryExit');
  const after=model.snapshot();for(const door of pre.flipDoors)assert.equal(after.flipDoors.find(x=>x.id===door.id).open,!door.open);}
 assert(model.commitAction());assert(legacy.commitAction());check(index+1,'commitAction');
 if(model.snapshot().cleared===before.cleared){nonClearing++;if(moving.shape.length>1)multi++;else single++;}
}
const final=model.snapshot();assert(final.complete);assert.equal(final.blocks.length,0);assert.equal(final.queuedBlocks.length,0);assert.equal(final.moves,candidate.drags.length);
assert.equal(final.cleared,29);assert.equal(arrivals.length,16);assert.equal(nonClearing,10);assert.equal(final.moves,39);assert(multi>single);
const replay=api.replayRevisedRoute(level,candidate.drags);assert(replay.valid&&replay.complete);assert.equal(replay.nonClearingDrags,10);
const report={passed:true,activeVersion:lock.activeVersion,oldDiagnostics,candidate:path,candidateSha256:digest(fs.readFileSync(path)),levelSha256:digest(level),routeSha256:digest(candidate.drags),
 route:{complete:true,totalDrags:final.moves,clears:final.cleared,nonClearing,multi,single,unitCalls,negativeAnchorSteps:negativeAnchors,arrivals},
 profileBridge:{checkedUnitCalls:unitCalls,exactObservedStatesIgnoringProfile:true,domain:'All five flip doors have frozen=0 and no counter operation increases ice. Every clear selects all five before decrement in v1.5, exactly as v1.4; automatic generation, bodies, collisions, and all other semantics are unchanged. This is not a lower-bound graph qualification.'},
 lowerBoundCertified:false,naturalTimeValidated:false,pointerValidated:false};
const dest=out+'/model156-review-'+Date.now()+'.json';fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({path:dest,passed:true,U:nonClearing,total:final.moves,multi,single,arrivals:arrivals.length,oldDomain:oldDiagnostics.automatic.status}));

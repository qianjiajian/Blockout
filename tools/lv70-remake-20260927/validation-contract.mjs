import assert from 'node:assert/strict';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
const json=x=>JSON.parse(JSON.stringify(x)),geometry=l=>Object.fromEntries(['width','height','playable','blocked','seams'].filter(k=>l[k]!==undefined).map(k=>[k,l[k]]));
export function preserveOther199(levels,baseline){
 const concurrent=[],unchanged=[];assert.equal(levels.length,200);
 for(const old of baseline.levels){if(old.id===70)continue;const current=json(levels.find(l=>l.id===old.id)),restored=structuredClone(current),changes=[];
  if(current.mechanismRules!==old.mechanismRules){assert(old.flipDoors?.some(g=>(g.frozen??0)>0),'Only frozen-flip levels migrate');assert.equal(current.mechanismRules,'revised-2026-09-27-v1.5');assert.equal(old.mechanismRules,'revised-2026-09-23-v1.4');restored.mechanismRules=old.mechanismRules;changes.push({field:'mechanismRules',from:old.mechanismRules,to:current.mechanismRules,authority:'v1.90'});}
  if(current.preservedMoveTarget!==old.preservedMoveTarget){const targets={35:38,36:31,38:49,39:44,41:45,43:24,44:39,46:41,47:46,48:43,50:27,52:45,54:48,55:34,56:40,58:41,59:51};assert.equal(current.preservedMoveTarget,targets[old.id],`Only the exact v1.92/v1.94/v1.95 seventeen authorized scores may differ: ${old.id}`);assert(targets[old.id]);if(old.preservedMoveTarget===undefined)delete restored.preservedMoveTarget;else restored.preservedMoveTarget=old.preservedMoveTarget;changes.push({field:'preservedMoveTarget',from:old.preservedMoveTarget??null,to:current.preservedMoveTarget,authority:old.id<40?'v1.92':old.id<=50?'v1.95':'v1.94'});}
  assert.deepEqual(restored,old,`Other level ${old.id} differs outside precise parallel authorizations`);
  if(changes.length)concurrent.push({id:old.id,changes});else unchanged.push(old.id);
 }
 return {passed:true,unchanged,concurrent,unrelatedGameplayChanges:0};
}
export function auditLv70Static(level,drags,baseline,api){
 const old=baseline.level;
 for(const k of ['id','name','difficulty','timeSeconds','reward','parMoves','featureIntro'])assert.deepEqual(level[k],old[k],`Preserve ${k}`);
 assert.equal(level.id,70);assert.equal(level.difficulty,'normal');assert.equal(level.timeSeconds,180);assert.equal(level.reward,185);assert.equal(level.parMoves,23);
 assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');assert.equal(level.preservedMoveTarget,drags.length);assert.equal(level.designTargets,undefined);
 assert.deepEqual(api.levelStarTargets(level),{moveTarget:drags.length,timeTargetSeconds:129});
 assert.deepEqual(geometry(level),geometry(old),'Original 6x7 missing-four-corners geometry retained');assert.deepEqual(level.blocked??[],[]);assert.deepEqual(level.seams??[],[]);
 for(const k of ['shutters','elevators','flipDoors','coloredGrids','conveyors'])assert.deepEqual(level[k]??[],[],`No added mechanism ${k}`);
 assert.equal(level.generators?.length,2);assert.equal(level.blocks.length,36);assert.equal(new Set(level.blocks.map(b=>b.id)).size,36);
 const beforeQueue=new Set(old.generators.flatMap(g=>g.queueBlockIds)),queue=new Set(level.generators.flatMap(g=>g.queueBlockIds));
 assert.equal(queue.size,17);assert.deepEqual([...queue].sort(),[...beforeQueue].sort(),'All original 17 queue identities preserved');
 assert.deepEqual(level.blocks.map(b=>b.id).sort(),old.blocks.map(b=>b.id).sort());
 const mapping=[];
 for(const b of level.blocks){assert(Object.keys(b).every(k=>['id','x','y','shape','color'].includes(k)),`Only unmodified source shape/color mechanisms: ${b.id}`);const source=old.blocks.find(x=>x.id===b.id);assert.equal(b.color,source.color);assert.deepEqual(b.shape,source.shape);mapping.push({id:b.id,color:b.color,shape:b.shape,queued:queue.has(b.id),before:[source.x,source.y],after:[b.x,b.y]});}
 for(const g of level.generators){assert(g.queueBlockIds.length>0);assert(Object.keys(g).every(k=>['id','side','offset','rimSpan','rimMount','spawn','queueBlockIds'].includes(k)));}
 assert.equal(level.gates.length,4);for(const g of level.gates)assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen'].includes(k)));
 const gateIce=Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0]));assert.deepEqual(Object.keys(gateIce).sort(),['blue','green','pink','yellow']);assert.equal(gateIce.blue,0);for(const color of ['green','yellow','pink'])assert(Number.isSafeInteger(gateIce[color])&&gateIce[color]>=1,'v1.93 allows raising existing three ice values, never deleting an ice gate');
 api.validateLevel(level);const opening=new api.PuzzleModel(structuredClone(level)).snapshot();
 assert.equal(opening.playable.length,38);assert.equal(opening.blocks.length,19);assert.equal(opening.queuedBlocks.length,17);assert(opening.generators.every(g=>g.head===0),'Full opening prevents queue pre-emission');
 const adjacency=[],occupied=new Map();for(const b of opening.blocks)for(const [dx,dy]of b.shape){const k=`${b.x+dx},${b.y+dy}`;assert(!occupied.has(k));occupied.set(k,b);}
 for(const[k,b]of occupied){const[x,y]=k.split(',').map(Number);for(const[xx,yy]of [[x+1,y],[x,y+1]]){const other=occupied.get(`${xx},${yy}`);if(other&&other.id!==b.id){assert.notEqual(b.color,other.color,`Independent same-colored neighbors ${b.id}/${other.id}`);adjacency.push([b.id,other.id]);}}}
 const native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(native.every(x=>x.match?.quarterTurns===0),'Every original multi-cell/queue shape has unrotated whole art');
 const audits={coverage:auditOpeningCoverage(opening),queueColors:auditGeneratorQueueColors(level),gateSpans:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level)};for(const[k,a]of Object.entries(audits))assert(a.passed,k+': '+JSON.stringify(a));
 const replaced=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']),historical=api.auditRevisedCandidate(level,undefined);
 const hard=historical.issues.filter(i=>!replaced.has(i.code));assert.deepEqual(hard,[]);
 const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete);assert.equal(replay.clearEvents,36);assert(replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15);
 return {passed:true,profile:level.mechanismRules,sourceIdentityMapping:mapping,inventory:{opening:19,queued:17,total:36},geometryPreserved:true,metadataPreservedExceptAuthorizedMoveTarget:true,starTargets:api.levelStarTargets(level),gateIce,native,adjacency,audits,replay,hiddenCoverage:{passed:true,reason:'No shutters/lifts/hidden bodies exist; queue inventory is not a simultaneous hidden spatial layer.'},replacedHistoricalChecks:historical.issues.filter(i=>replaced.has(i.code)),difficultyCertified:false};
}

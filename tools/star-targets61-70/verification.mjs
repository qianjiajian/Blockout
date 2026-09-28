import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';

export const ALL_IDS=Array.from({length:10},(_,i)=>61+i);
export const BEFORE_SHA='c5724c228babc52ec21b37c38c3f12f7a54f84b850c5e8f81aa77b153d8fa8ce';
export const ORIGINAL_BEFORE='deliverables/star-targets61-70-20260927/before.json';
export const CONCURRENT_TARGETS={71:50,75:37,76:36,78:37,79:58,81:38,83:56,85:33,87:50,88:54};
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};
export function parseTargets(argument){
 assert(typeof argument==='string'&&/^(6[1-9]|70):[1-9][0-9]*(,(6[1-9]|70):[1-9][0-9]*)*$/.test(argument),'Explicit ID:TARGET pairs are required');
 const pairs=argument.split(',').map(p=>p.split(':').map(Number));
 assert(new Set(pairs.map(p=>p[0])).size===pairs.length,'Duplicate target IDs are forbidden');
 assert(pairs.every(([,target])=>Number.isSafeInteger(target)));
 return Object.fromEntries(pairs);
}
export function validateBaseline(before,rawSha,readDocument,verifyFile){
 verifyFile(ORIGINAL_BEFORE,BEFORE_SHA);
 const original=readDocument(ORIGINAL_BEFORE);assert.equal(original.ruleVersion,'1.95.0');
 if(rawSha===BEFORE_SHA){assert.deepEqual(before,original);return{passed:true,originalBeforeSha256:BEFORE_SHA,concurrentChanges:[]};}
 assert.equal(before.originalBeforeSha256,BEFORE_SHA);assert.equal(before.ruleVersion,'1.97.0');
 const reference=before.concurrentCheck;
 assert(reference&&typeof reference.file==='string'&&/^[a-f0-9]{64}$/.test(reference.sha256));
 verifyFile(reference.file,reference.sha256);
 const check=readDocument(reference.file);assert(check.passed===true||check.status==='PASS','Concurrent changes need their pinned completed audit');
 assert.deepEqual(before.rows,original.rows,'All ten pre-score rows must stay exact');
 const expected=clean(original.priorLevels);
 for(const[id,target]of Object.entries(CONCURRENT_TARGETS))expected[Number(id)-1].preservedMoveTarget=target;
 assert.deepEqual(before.priorLevels,expected,'Only the ten exact v1.96/v1.97 concurrent scoring fields may change');
 assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.deepEqual(Object.keys(before.bindings).sort(),Object.keys(original.bindings).sort());
 for(const[p,sha]of Object.entries(original.bindings))if(!['src/core/remake71to80.ts','src/core/remake81to90.ts'].includes(p))assert.equal(before.bindings[p],sha,'Unrelated baseline source change: '+p);
 return{passed:true,originalBeforeSha256:BEFORE_SHA,concurrentCheck:reference,concurrentChanges:Object.entries(CONCURRENT_TARGETS).map(([id,target])=>({id:Number(id),preservedMoveTarget:target}))};
}

// No historical fixture is used as the current map. Lv63, Lv66 and Lv70 have
// subsequent repairs; the fresh, pinned pre-score 200-level snapshot is binding.
export function validateScoringData(before,witnesses,levels,api,contract){
 const ids=Object.keys(contract.targets).map(Number).sort((a,b)=>a-b);
 assert(ids.length>0&&ids.every(id=>ALL_IDS.includes(id)),'An explicit nonempty 61-70 scoring scope is required');
 assert.equal(before.ruleVersion,contract.beforeRuleVersion);
 assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(before.rows.map(r=>r.id),ALL_IDS);
 assert.deepEqual(witnesses.rows.map(r=>r.id),ids);
 assert.equal(witnesses.beforeSha256,contract.beforeSha256);
 assert.equal(digest(before.priorLevels),before.campaignSha256);
 const expected=clean(before.priorLevels),rows=[],targets={};
 for(const id of ALL_IDS){
  const old=before.priorLevels[id-1],current=levels[id-1],archived=before.rows.find(r=>r.id===id);
  assert.equal(old.id,id);assert.equal(current.id,id);
  assert.equal(digest(old),archived.oldLevelSha256);
  assert.equal(digest(omitTarget(old)),archived.gameplaySha256);
  assert.deepEqual(api.levelStarTargets(old),archived.oldTargets);
  assert.equal(old.timeSeconds,archived.timeSeconds);
  if(!ids.includes(id)){assert.deepEqual(current,old,'Unmodified batch levels stay exact');continue;}
  const row=witnesses.rows.find(r=>r.id===id),target=contract.targets[id];
  assert.deepEqual(row.level,current);
  assert.deepEqual(omitTarget(current),omitTarget(old),'Only the move scoring target changes');
  assert(Array.isArray(row.drags)&&row.drags.length>0);
  assert.equal(row.drags.length,target,'Approved total drags, without an optimality claim');
  assert.equal(digest(row.drags),row.routeSha256);
  assert.equal(digest(omitTarget(row.level)),row.gameplaySha256);
  assert(Number.isSafeInteger(target)&&target>archived.oldTargets.moveTarget,'Only the explicitly reviewed tight targets are loosened');
  assert.deepEqual(api.levelStarTargets(current),{moveTarget:target,timeTargetSeconds:archived.oldTargets.timeTargetSeconds});
  assert.equal(current.timeSeconds,archived.timeSeconds);
  expected[id-1].preservedMoveTarget=target;targets[id]=target;
  const time=archived.oldTargets.timeTargetSeconds;
  const boundaries=[
   {moves:target,elapsedSeconds:time,stars:3,move:true,time:true},
   {moves:target+1,elapsedSeconds:time,stars:2,move:false,time:true},
   {moves:target,elapsedSeconds:time+.001,stars:2,move:true,time:false},
   {moves:target+1,elapsedSeconds:time+.001,stars:1,move:false,time:false},
  ].map(c=>{const r=api.evaluateLevelStars(current,c);assert.equal(r.earnedStars,c.stars);assert.equal(r.moveAchieved,c.move);assert.equal(r.timeAchieved,c.time);return {...c,result:r};});
  rows.push({id,oldMoveTarget:archived.oldTargets.moveTarget,newMoveTarget:target,timeTargetSeconds:time,levelSha256:digest(current),gameplaySha256:row.gameplaySha256,routeSha256:row.routeSha256,boundaries});
 }
 assert.deepEqual(levels,expected,'All 200 formal objects: only approved preservedMoveTarget fields may change');
 return {passed:true,modifiedIds:ids,targets,all200Compared:true,otherLevelsPreserved:200-ids.length,gameplayPreserved:true,timeTargetsPreserved:true,rows};
}

export function validateWitnessSources(before,witnesses,readDocument,verifyFile){
 const bindings=witnesses.evidenceBindings;assert(bindings&&typeof bindings==='object');
 for(const [file,sha]of Object.entries(bindings))verifyFile(file,sha);
 const rows=[];
 for(const row of witnesses.rows){
  const ref=row.sourceEvidence;assert(ref&&typeof ref.file==='string'&&/^[a-f0-9]{64}$/.test(ref.sha256));
  assert.equal(bindings[ref.file],ref.sha256,'Every source is pinned in the witness evidence index');
  verifyFile(ref.file,ref.sha256);
  const doc=readDocument(ref.file),source=doc.rows?.find(r=>r.id===row.id)??doc;
  assert.equal(source.id??source.levelId??source.level?.id,row.id);
  assert.deepEqual(source.drags??source.route,row.drags,'The adopted route must equal its pinned fresh source');
  if(source.routeSha256)assert.equal(source.routeSha256,row.routeSha256);
  assert(source.level||source.levelSha256,'Route evidence must bind exact current gameplay');
  if(source.level)assert.deepEqual(omitTarget(source.level),omitTarget(row.level));
  if(source.levelSha256)assert([digest(before.priorLevels[row.id-1]),digest(row.level)].includes(source.levelSha256),'Route hash must bind before-score or current-score formal level');
  if(row.originalSource){assert.equal(bindings[row.originalSource.file],row.originalSource.sha256);verifyFile(row.originalSource.file,row.originalSource.sha256);}
  rows.push({id:row.id,file:ref.file,sha256:ref.sha256,exactRoute:true,gameplayBound:true});
 }
 return {passed:true,rows};
}

// Keep the ordinary canonical held-path policy and all current mechanics.
// Time is never advanced in this spatial precheck. Real natural ticks are
// captured and replayed separately by the Pointer harness.
export function replaySpatial(level,drags,api){
 assert(!level.blocks.some(b=>b.timedBombSeconds!==undefined),'This batch precheck does not omit bomb timing');
 const valid=api.replayRevisedRoute(level,drags);if(!valid.valid)return valid;
 const model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
 for(const drag of drags){model.beginAction();for(const [x,y]of drag.path)assert(model.moveBlockStep(drag.blockId,x,y));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());}
 const {moves,...state}=model.snapshot();assert.equal(moves,valid.effectiveDrags);assert.equal(state.complete,valid.complete);assert(!state.failed);
 return {...valid,finalStateKey:JSON.stringify(state),timeValidated:false,lowerBoundCertified:false};
}

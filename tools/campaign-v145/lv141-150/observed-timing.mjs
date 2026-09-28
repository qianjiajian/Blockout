import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';

// Read-only interception: every actual input, natural tick and deferred exit
// callback is called once, then replayed into a separate current model.
export function observe(){
 const g=window.__COLOR_ESCAPE__,model=g.model,clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
 const methods=['start','startCountdown','tick','beginAction','moveBlockStep','tryExit','commitAction','cancelAction','completeExitAnimation'];
 const forbidden=['undo','addTime','freezeTime','removeBlockWithBooster','removeBlock','clearColorWithBooster'];
 const log={initial:clone(model.snapshot()),events:[],startedAt:performance.now(),forbidden:[],readOnlyObservation:true,deferExitCompletion:true};
 if(log.initial.started)throw Error('Observation must start before the playable clock');
 let depth=0;
 for(const method of [...methods,...forbidden]){
  if(typeof model[method]!=='function')continue;const original=model[method];
  model[method]=function(...args){
   if(forbidden.includes(method)){log.forbidden.push(method);throw Error('Forbidden unassisted operation '+method);}
   if(depth)return original.apply(this,args);depth++;
   try{const result=original.apply(this,args);log.events.push({method,args:clone(args),result:clone(result),at:performance.now(),after:clone(this.snapshot())});return result;}
   finally{depth--;}
  };
 }
 window.__BATCH_TIMING__={read:()=>({...clone(log),final:clone(model.snapshot()),sameModel:g.model===model,finishedAt:performance.now()})};
 return clone(log.initial);
}
export function replayTiming(level,log,api){
 assert(log?.readOnlyObservation&&log.sameModel&&log.deferExitCompletion);assert.deepEqual(log.forbidden,[]);
 const model=new api.PuzzleModel(structuredClone(level),{deferExitCompletion:true}),clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
 assert.deepEqual(clone(model.snapshot()),log.initial);
 const allowed=new Set(['start','startCountdown','tick','beginAction','moveBlockStep','tryExit','commitAction','cancelAction','completeExitAnimation']);
 let previous=log.startedAt,ticks=0,activeSeconds=0,callbacks=0;
 for(const [i,e]of log.events.entries()){
  assert(allowed.has(e.method)&&Array.isArray(e.args));assert(Number.isFinite(e.at)&&e.at>=previous);previous=e.at;
  if(e.method==='tick'){assert(Number.isFinite(e.args[0])&&e.args[0]>=0);ticks++;const s=model.snapshot();if(s.started&&!s.complete&&!s.failed)activeSeconds+=e.args[0];}
  if(e.method==='completeExitAnimation')callbacks++;
  const r=model[e.method](...e.args);assert.deepEqual(clone(r),e.result,`result ${i}/${e.method}`);assert.deepEqual(clone(model.snapshot()),e.after,`state ${i}/${e.method}`);assert(!model.snapshot().failed);
 }
 assert(ticks>0&&activeSeconds>0&&log.finishedAt>=previous);assert.deepEqual(clone(model.snapshot()),log.final);assert(log.final.complete&&!log.final.failed);
 return {passed:true,ticks,activeSeconds,callbacks,events:log.events.length,wholeModelReplay:true,exactBombTimersCompared:true,deferredExitCallbacksCompared:true,levelSha256:digest(level),logSha256:digest(log)};
}

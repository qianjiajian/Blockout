import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';

export function observeFormalModelTiming(){
 const g=window.__COLOR_ESCAPE__,model=g.model,clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
 const methods=['start','startCountdown','tick','beginAction','moveBlockStep','tryExit','commitAction','cancelAction','completeExitAnimation'];
 const forbidden=['undo','addTime','removeBlockWithBooster','removeBlock','clearColorWithBooster'];
 const log={initial:clone(model.snapshot()),events:[],startedAt:performance.now(),forbidden:[],readOnlyObservation:true,deferExitCompletion:true,exitAnimationNamespace:model.exitAnimationNamespace};
 if(log.initial.started)throw Error('Timing observation started after the playable clock');
 let depth=0;
 for(const method of [...methods,...forbidden]){
  if(typeof model[method]!=='function')continue;
  const original=model[method];
  model[method]=function(...args){
   if(forbidden.includes(method)){log.forbidden.push(method);throw Error('Forbidden operation in natural timing evidence: '+method);}
   if(depth)return original.apply(this,args);depth++;
   try{const result=original.apply(this,args);log.events.push({method,args:clone(args),result:clone(result),at:performance.now(),after:clone(this.snapshot())});return result;}
   finally{depth--;}
  };
 }
 window.__FORMAL_MODEL_TIMING__={read:()=>({...clone(log),final:clone(model.snapshot()),sameModel:g.model===model,finishedAt:performance.now()})};
 return clone(log.initial);
}

export function replayObservedModelTiming(level,log,api){
 assert(log?.readOnlyObservation&&log.sameModel&&log.deferExitCompletion,'Exact deferred formal model instance must be observed');
 assert.deepEqual(log.forbidden,[],'Booster/undo is not an unassisted route');
 assert(Array.isArray(log.events)&&log.events.length>0,'Complete observed input log required');
 const model=new api.PuzzleModel(structuredClone(level),{deferExitCompletion:true}),clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
 assert.deepEqual(clone(model.snapshot()),log.initial,'Cannot omit clock intervals before observation');
 const mapIds=(v,from,to)=>Array.isArray(v)?v.map(x=>mapIds(x,from,to)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[mapIds(k,from,to),mapIds(x,from,to)])):typeof v==='string'&&Number.isInteger(from)&&Number.isInteger(to)&&v.startsWith('exit-'+from+'-')?'exit-'+to+'-'+v.slice(('exit-'+from+'-').length):v;
 const observedNamespace=log.exitAnimationNamespace,replayNamespace=model.exitAnimationNamespace;
 assert(Number.isInteger(observedNamespace)&&Number.isInteger(replayNamespace));
 const comparable=v=>mapIds(clone(v),replayNamespace,observedNamespace);
 let ticks=0,totalTickSeconds=0,activeTickSeconds=0,previousAt=log.startedAt,started=false,callbacks=0;
 const allowed=new Set(['start','startCountdown','tick','beginAction','moveBlockStep','tryExit','commitAction','cancelAction','completeExitAnimation']);
 for(const [i,event]of log.events.entries()){
  assert(allowed.has(event.method)&&Array.isArray(event.args),'Unexpected observed model method');
  assert(Number.isFinite(event.at)&&event.at>=previousAt,'Nonmonotonic actual observation');previousAt=event.at;
  if(event.method==='tick'){
   assert(event.args.length>=1&&event.args.length<=2&&Number.isFinite(event.args[0])&&event.args[0]>=0,'Invalid actual tick');
   const held=event.args[1];assert(held==null||(typeof held==='object'&&!Array.isArray(held)),'Invalid held-block reservation');
   ticks++;totalTickSeconds+=event.args[0];const before=model.snapshot();if(before.started&&!before.complete&&!before.failed)activeTickSeconds+=event.args[0];
  }
  if(event.method==='completeExitAnimation')callbacks++;
  const result=model[event.method](...mapIds(event.args,observedNamespace,replayNamespace));
  assert.deepEqual(comparable(result),event.result,`Observed result ${i}/${event.method}`);
  assert.deepEqual(comparable(model.snapshot()),event.after,`Observed complete state ${i}/${event.method}`);
  assert(!model.snapshot().failed,`Natural clock failed at ${i}`);started ||= model.snapshot().started;
 }
 assert(started&&ticks>0&&activeTickSeconds>0,'A real playable ticking interval is required');
 assert(Number.isFinite(log.finishedAt)&&log.finishedAt>=previousAt,'Missing final observation time');
 assert.deepEqual(comparable(model.snapshot()),log.final,'Final observed state mismatch');
 assert(log.final.complete&&!log.final.failed,'Natural whole-level completion required');
 return {passed:true,events:log.events.length,ticks,totalTickSeconds,activeTickSeconds,callbacks,wholeModelReplay:true,exactBombTimersCompared:true,deferredExitCallbacksCompared:true,animationIdNamespaceBijection:true,levelSha256:digest(level),logSha256:digest(log),finalSnapshot:model.snapshot(),releaseApproved:false};
}

import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';

// Serialized into an isolated test browser. Calls every original method once,
// without changing time, inputs, model fields or the game update loop.
export function observeFormalModelTiming(){
 const g=window.__COLOR_ESCAPE__,model=g.model,clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
 const methods=['start','startCountdown','tick','beginAction','moveBlockStep','tryExit','commitAction','cancelAction'];
 const forbidden=['undo','addTime','removeBlockWithBooster','removeBlock','clearColorWithBooster'];
 const log={initial:clone(model.snapshot()),events:[],startedAt:performance.now(),forbidden:[],readOnlyObservation:true};
 if(log.initial.started)throw Error('Timing observation started after the playable clock');
 let depth=0;
 for(const method of [...methods,...forbidden]){
  if(typeof model[method]!=='function')continue;
  const original=model[method];
  model[method]=function(...args){
   if(forbidden.includes(method)){log.forbidden.push(method);throw Error('Forbidden operation in natural timing evidence: '+method);}
   if(depth)return original.apply(this,args);
   depth++;
   try{
    const result=original.apply(this,args);
    log.events.push({method,args:clone(args),result:clone(result),at:performance.now(),after:clone(this.snapshot())});
    return result;
   }finally{depth--;}
  };
 }
 window.__FORMAL_MODEL_TIMING__={read:()=>({...clone(log),final:clone(model.snapshot()),sameModel:g.model===model,finishedAt:performance.now()})};
 return clone(log.initial);
}

/** Replays actual observed natural game ticks, not an estimated per-drag time.
 * Pointer policy and no-action-injection are independently checked by the E2E.
 */
export function replayObservedModelTiming(level,log,api){
 assert(log?.readOnlyObservation&&log.sameModel,'Exact formal model instance must be observed');
 assert.deepEqual(log.forbidden,[],'Booster/undo is not an unassisted route');
 assert(Array.isArray(log.events)&&log.events.length>0,'Complete observed input log required');
 const model=new api.PuzzleModel(structuredClone(level)),normalize=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
 assert.deepEqual(normalize(model.snapshot()),log.initial,'Cannot omit clock intervals before observation');
 let ticks=0,totalTickSeconds=0,activeTickSeconds=0,previousAt=log.startedAt,started=false;
 const allowed=new Set(['start','startCountdown','tick','beginAction','moveBlockStep','tryExit','commitAction','cancelAction']);
 for(const [i,event]of log.events.entries()){
  assert(allowed.has(event.method)&&Array.isArray(event.args),'Unexpected observed model method');
  assert(Number.isFinite(event.at)&&event.at>=previousAt,'Nonmonotonic actual observation');previousAt=event.at;
  if(event.method==='tick'){
   assert(event.args.length>=1&&event.args.length<=2&&Number.isFinite(event.args[0])&&event.args[0]>=0,'Invalid actual tick');
   // The live loop also supplies a held-block reservation during a pointer
   // gesture. Preserve and replay it; never drop it to simplify timing proof.
   const held=event.args[1];
   assert(held==null||(typeof held==='object'&&!Array.isArray(held)),'Invalid held-block reservation');
   ticks++;totalTickSeconds+=event.args[0];const before=model.snapshot();if(before.started&&!before.complete&&!before.failed)activeTickSeconds+=event.args[0];
  }
  const result=model[event.method](...event.args),after=model.snapshot();
  assert.deepEqual(normalize(result),event.result,`Observed result ${i}/${event.method}`);
  assert.deepEqual(normalize(after),event.after,`Observed complete state ${i}/${event.method}`);
  assert(!after.failed,`Natural clock failed at ${i}`);started||=after.started;
 }
 assert(started&&ticks>0&&activeTickSeconds>0,'A real playable ticking interval is required');
 assert(Number.isFinite(log.finishedAt)&&log.finishedAt>=previousAt,'Missing final observation time');
 assert.deepEqual(normalize(model.snapshot()),log.final,'Final observed state mismatch');
 assert(log.final.complete&&!log.final.failed,'Natural whole-level completion required');
 return{passed:true,events:log.events.length,ticks,totalTickSeconds,activeTickSeconds,wholeModelReplay:true,
  exactBombTimersCompared:true,levelSha256:digest(level),logSha256:digest(log),finalSnapshot:model.snapshot(),releaseApproved:false};
}

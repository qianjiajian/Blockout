import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPreviewCore,digest} from './revised-preview-validation-v160.mjs';
import {replayObservedModelTiming} from './revised-model-timing-observer.mjs';
import {formalTimedRoute,reviewedSourceAdapter} from './revised-continuation-batch.mjs';
const {api}=await loadPreviewCore();
const level={id:120,name:'Synthetic observer test only',width:5,height:5,difficulty:'normal',timeSeconds:10,reward:0,mechanismRules:'revised-2026-09-21-v1.2',gates:[{id:'r',side:'left',offset:0,size:1,color:'red'}],blocks:[{id:'b',x:0,y:0,color:'red',shape:[[0,0]],timedBombSeconds:3}]};
const clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
function fixture(held){
 const model=new api.PuzzleModel(level),log={initial:clone(model.snapshot()),events:[],startedAt:0,finishedAt:20,forbidden:[],readOnlyObservation:true,sameModel:true};let at=0;
 for(const [method,args]of [['startCountdown',[]],['tick',held===undefined?[.2]:[.2,held]],['beginAction',[]],['tryExit',['b','left']],['commitAction',[]],['tick',[.1]]]){
  const result=model[method](...args);log.events.push({method,args,result:clone(result),at:++at,after:clone(model.snapshot())});
 }
 log.final=clone(model.snapshot());return log;
}
test('observed full timer state replays exactly including complete post-ticks',()=>{
 const r=replayObservedModelTiming(level,fixture(),api);assert(r.passed&&r.exactBombTimersCompared);assert.equal(r.activeTickSeconds,.2);
});
test('natural tick retains the live second held-reservation argument',()=>{
 for(const held of [null,{blockId:'b',x:.2,y:0,shape:[[0,0]],rollbackX:0,rollbackY:0}])assert(replayObservedModelTiming(level,fixture(held),api).passed);
 const wrong=fixture();wrong.events[1].args.push('not-a-held-reservation');assert.throws(()=>replayObservedModelTiming(level,wrong,api),/Invalid held-block/);
});
for(const [name,change]of [
 ['omitted live tick',l=>{l.events.splice(1,1);}],
 ['shortened live tick',l=>{l.events[1].args[0]=.1;}],
 ['changed bomb timer',l=>{l.events[1].after.blocks[0].timedBombSeconds=3;}],
 ['clock started before observation',l=>{l.initial.started=true;}],
 ['unknown mutation',l=>{l.events[2].method='addTime';}],
 ['missing result',l=>{l.events[3].result=null;}],
 ['replaced model',l=>{l.sameModel=false;}],
 ['forbidden operation',l=>{l.forbidden=['undo'];}],
 ['nonmonotonic timestamp',l=>{l.events[2].at=0;}],
 ['missing complete suffix',l=>{l.events.splice(3);l.final=l.events.at(-1).after;}],
 ])test(`rejects ${name}`,()=>{const log=fixture();change(log);assert.throws(()=>replayObservedModelTiming(level,log,api));});
test('bomb archive retains exact plan and only rebinds approved formal metadata',()=>{
 const raw={level,drags:[{blockId:'b',path:[],exitSide:'left'}],timedRoute:{levelSha256:digest(level),events:[{type:'down',dtSeconds:.2,atSeconds:.2,blockId:'b'}]}};
 const row={drags:structuredClone(raw.drags),timedRoute:structuredClone(raw.timedRoute),timedRouteSha256:digest(raw.timedRoute)};
 const formal={...level,name:'Actual formal name',timeSeconds:5},route=formalTimedRoute(row,raw,formal);
 assert.equal(route.levelSha256,digest(formal));assert.deepEqual(route.events,raw.timedRoute.events);
 for(const mutate of [r=>{delete r.timedRoute;},r=>{r.timedRoute.events[0].dtSeconds=.1;},r=>{r.timedRouteSha256='0'.repeat(64);},r=>{r.drags=[];}]){const altered=structuredClone(row);mutate(altered);assert.throws(()=>formalTimedRoute(altered,raw,formal));}
 assert.throws(()=>formalTimedRoute(row,raw,{...formal,blocks:[]}));
});
test('positive bomb dispatch precedes unsupported mixed-family routes',()=>{
 const plain=reviewedSourceAdapter({sourceNormalizedFacts:{mechanisms:{bombs:{count:0}}}});
 const bomb=reviewedSourceAdapter({sourceNormalizedFacts:{mechanisms:{bombs:{count:1},starBlocks:{count:1},elevators:{count:1}}}});
 assert.notEqual(bomb.verifyReviewedDesign,plain.verifyReviewedDesign);assert.equal(typeof bomb.auditBombCarriers,'function');
});

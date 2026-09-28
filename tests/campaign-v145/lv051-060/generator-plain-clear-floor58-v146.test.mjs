import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {forEachOptionalSpawn,forEachGeneratorGesture,generatorClearCount} from '../../../tools/campaign-v145/lv051-060/campaign-generator-axis-floor-v146.mjs';
import {compilePlainQueueLevel,normalizePlainQueueClears,checkPlainQueueFloor,verifyPlainQueueRouteProjection} from '../../../tools/campaign-v145/lv051-060/generator-plain-clear-floor58-v146.mjs';
const {api}=await loadApi(),NONE=255,QUEUED=254,key=s=>String.fromCharCode(...s);
const S=[[0,0]],H2=[[0,0],[1,0]];
function tiny(seed=0){return{id:58,name:'plain queue differential fixture',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:2,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:1,...(seed&1?{frozen:2}:{})},{id:'b',color:'blue',side:'left',offset:1,size:1},{id:'g',color:'green',side:'right',offset:0,size:1},{id:'y',color:'yellow',side:'right',offset:1,size:1,...(seed&2?{frozen:3}:{})},{id:'p',color:'purple',side:'bottom',offset:2,size:1}],
 generators:[{id:'gen',side:'top',offset:1,rimMount:'rim',rimSpan:3,spawn:[1,0],queueBlockIds:['q1','q2']}],
 shutters:seed&4?[{id:'cover',x:2,y:1,width:1,height:1,count:2}]:[],
 blocks:[{id:'carrier',x:1,y:0,color:'red',shape:S,...(seed&8?{layers:['red','blue']}:{})},{id:'blue',x:0,y:1,color:'blue',shape:S,...(seed&16?{frozen:1}:{})},...(seed&4?[{id:'hidden',x:2,y:1,color:'purple',shape:S,shutterId:'cover',frozen:1}]:[]),{id:'q1',x:1,y:0,color:'green',shape:seed&32?H2:S},{id:'q2',x:1,y:0,color:'yellow',shape:S}]};}

// Independent exhaustive graph traversal: no normalizer and no symmetry key.
// Retain every edge, then solve all states' distance-to-goal on reverse edges.
function exhaustive(c,normalize=s=>({state:s})){const initial=normalize(c.initial).state,states=new Map([[key(initial),initial]]),queue=[initial],edges=new Map();
 for(let n=0;n<queue.length;n++){const s=queue[n],from=key(s),row=[];
  const visit=(i,v,cost)=>{const raw=s.slice();raw[i]=v;const next=normalize(raw).state,k=key(next);row.push({to:k,cost});if(!states.has(k)){states.set(k,next);queue.push(next);assert(states.size<150000,'Tiny oracle graph exceeded finite fixture budget');}};
  forEachGeneratorGesture(c,s,visit);forEachOptionalSpawn(c,s,visit);edges.set(from,row);
 }
 const reverse=new Map([...states.keys()].map(k=>[k,[]]));for(const[from,row]of edges)for(const e of row)reverse.get(e.to).push({to:from,cost:e.cost});
 const distances=new Map(),open=[];for(const[k,s]of states)if(s.every(v=>v===NONE)){distances.set(k,0);open.push(k);}
 for(let n=0;n<open.length;n++){const k=open[n],d=distances.get(k);for(const e of reverse.get(k)){const next=d+e.cost;if(next<(distances.get(e.to)??Infinity)){distances.set(e.to,next);open.push(e.to);}}}
 return{states,distances,optimum:distances.get(key(initial))??Infinity};
}
function replayZeroActions(c,start,result){let state=start.slice();for(const a of result.actions){let found;
 const visit=(i,v,cost,get)=>{if(cost===0&&JSON.stringify(get())===JSON.stringify(a)){found={i,v};return false;}};
 if(a.spawn)forEachOptionalSpawn(c,state,visit);else forEachGeneratorGesture(c,state,visit);assert(found,`Normalization emitted illegal/nonzero edge ${JSON.stringify(a)}`);state[found.i]=found.v;
 }assert.deepEqual(state,result.state);}

test('exhaustive tiny standard graphs and normalized graphs have equal optima; every reachable state preserves its remaining optimum',()=>{
 let compared=0,positive=0,impossible=0;
 for(const seed of [0,1,2,3,4,5,7,8,9,12,13,16,17,21,32,33,37,45,128]){
  const level=tiny(seed);if(seed===128)level.gates.forEach(g=>g.frozen=99);const c=compilePlainQueueLevel(level,api),raw=exhaustive(c),normalized=exhaustive(c,s=>normalizePlainQueueClears(c,s));
  assert.equal(normalized.optimum,raw.optimum,`initial optimum seed ${seed}`);if(raw.optimum>0&&Number.isFinite(raw.optimum))positive++;if(!Number.isFinite(raw.optimum))impossible++;
  for(const[k,s]of raw.states){const before=s.slice(),n=normalizePlainQueueClears(c,s);assert.deepEqual(s,before);replayZeroActions(c,s,n);assert(raw.states.has(key(n.state)));assert.equal(raw.distances.get(k)??Infinity,raw.distances.get(key(n.state))??Infinity,`state optimum seed ${seed}`);compared++;}
 }
 assert(compared>100);assert(positive>0,'Include actual necessary parking');assert(impossible>0,'Include true deadlocks');
 console.log(JSON.stringify({differentialStates:compared,fixtures:19,positiveOptimumFixtures:positive,unsolvableFixtures:impossible}));
});
test('spawn plus clear is atomic: a gated cargo stays queued, never a forced pure arrival',()=>{
 const l=tiny();l.gates.find(g=>g.color==='green').frozen=99;const c=compilePlainQueueLevel(l,api),n=normalizePlainQueueClears(c,c.initial);
 assert.equal(n.state[c.blocks.findIndex(b=>b.id==='q1')],QUEUED);assert.equal(n.state[c.blocks.findIndex(b=>b.id==='q2')],QUEUED);assert(!n.actions.some(a=>a.spawn));
});
test('entire spawn footprint is required even when its anchor is free',()=>{
 const l=tiny(32);l.blocks.find(b=>b.id==='blue').x=2;l.blocks.find(b=>b.id==='blue').y=0;l.blocks.find(b=>b.id==='blue').frozen=99;
 const c=compilePlainQueueLevel(l,api),n=normalizePlainQueueClears(c,c.initial);assert.equal(n.state[c.blocks.findIndex(b=>b.id==='q1')],QUEUED);assert(!n.actions.some(a=>a.spawn));
});
test('queue order/counters are real and thaw only after actual atomic clears',()=>{
 const l=tiny(2),c=compilePlainQueueLevel(l,api),n=normalizePlainQueueClears(c,c.initial),spawns=n.actions.filter(a=>a.spawn).map(a=>a.spawn);
 assert.deepEqual(spawns,['q1','q2']);assert(n.state.every(v=>v===NONE));assert.equal(generatorClearCount(c,n.state),c.totalClears);replayZeroActions(c,c.initial,n);
});
test('axis restrictions remain; a cargo with no axis-legal exit remains queued',()=>{
 const l=tiny();l.blocks.find(b=>b.id==='q1').movementAxis='vertical';l.gates.find(g=>g.color==='green').side='right';l.gates.find(g=>g.color==='green').offset=0;
 const c=compilePlainQueueLevel(l,api),n=normalizePlainQueueClears(c,c.initial);assert.equal(n.state[c.blocks.findIndex(b=>b.id==='q1')],QUEUED);
});
test('queue shells/ice and unsupported mechanism domains fail closed; opening shells stay supported',()=>{
 for(const edit of [l=>l.blocks.find(b=>b.id==='q1').layers=['green','yellow'],l=>l.blocks.find(b=>b.id==='q1').frozen=1,l=>l.blocks.find(b=>b.id==='q1').keyId='key']){const l=tiny();edit(l);const r=checkPlainQueueFloor(l,api,{floor:1});assert.equal(r.status,'unsupported');assert(!r.thresholdProven);}
 assert(compilePlainQueueLevel(tiny(8),api).blocks.find(b=>b.id==='carrier').layers.length===2);
});
test('fresh threshold/existence outcomes match exhaustive minimum; exhausted budgets do not pass',()=>{
 const l=tiny(1),opt=exhaustive(compilePlainQueueLevel(l,api)).optimum;assert.equal(opt,1);
 assert(checkPlainQueueFloor(l,api,{floor:1,maxStates:10000,maxMilliseconds:10000}).thresholdProven);
 const r=checkPlainQueueFloor(l,api,{floor:2,maxStates:10000,maxMilliseconds:10000});assert.equal(r.status,'relaxed-shortcut');assert.equal(r.relaxedNonClearingDrags,1);
 const budget=checkPlainQueueFloor(l,api,{floor:2,maxStates:1,maxMilliseconds:10000});assert.equal(budget.status,'unknown');assert(!budget.thresholdProven);
 assert.equal(checkPlainQueueFloor(l,api,{floor:0}).status,'invalid');assert.equal(verifyPlainQueueRouteProjection(l,[],api).valid,false);
});
test('actual immediate-arrival route constructs a normalized path and skips early clears at no extra cost',()=>{
 const l=tiny(1),drags=[{blockId:'blue',path:[],exitSide:'left'},{blockId:'carrier',path:[[0,0]]},{blockId:'q1',path:[[2,0]],exitSide:'right'},{blockId:'carrier',path:[],exitSide:'left'},{blockId:'q2',path:[[2,0],[2,1]],exitSide:'right'}];
 const r=verifyPlainQueueRouteProjection(l,drags,api);assert(r.valid,r.error);assert.equal(r.realNonClearingDrags,1);assert.equal(r.projectedNonClearingDrags,1);assert(r.steps.some(s=>s.skippedEarlyClearedBody));assert(r.steps.some(s=>s.normalizationActions.some(a=>a.spawn==='q2')));
});

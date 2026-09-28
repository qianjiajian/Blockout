import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {loadApi,ROOT,writeNew} from './remake81to90-v146.mjs';
import {compileImmediate,eachImmediateOptional,key,assertModelState,checkImmediateGeneratorFloor} from './remake81to90-immediate-generator-floor-v146.mjs';
import {generatorStateFromSnapshot} from './remake81to90-generator-floor-v146.mjs';
import {checkFastGeneratorFloor,normalizeFinishedQueue,projectSymmetricRoute} from './remake81to90-fast2-generator-floor-v146.mjs';
import {eachImmediateFast,verifyFastSuccessors} from './remake81to90-fast2-generator-domain-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const {api}=await loadApi(),evidence={qualificationOnly:true,candidateCertified:false,finite:[],floors:[],projections:[]};
const piece=(id,x,color,extra={})=>({id,x,y:1,color,shape:[[0,0]],...extra});
function fixture(id=88){return{id,name:'Complete tail dominance qualification',difficulty:'hard',width:2,height:3,timeSeconds:100,reward:0,mechanismRules:'revised-2026-09-23-v1.4',gates:[{id:'r',color:'red',side:'top',offset:0,size:2},{id:'g',color:'green',side:'bottom',offset:0,size:2}],generators:[{id:'left',side:'left',offset:1,spawn:[0,1],rimMount:'rim',rimSpan:3,queueBlockIds:['q1']},{id:'right',side:'right',offset:1,spawn:[1,1],rimMount:'rim',rimSpan:3,queueBlockIds:['q2']}],blocks:[piece('a',0,'red'),piece('b',1,'red'),piece('q1',0,'red'),piece('q2',1,'green')]};}
function apply(m,d){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}
for(const shell of [false,true])test(`every reachable state's exact optimal distance survives normalization; shell=${shell}`,()=>{
 const l=fixture();if(shell){l.blocks[0].layers=['red','green'];l.gates[1].frozen=1;}
 const c=compileImmediate(l,api),model=new api.PuzzleModel(l);model.startCountdown();
 const nodes=[{s:c.initial,m:model}],indices=new Map([[key(c.initial),0]]),reverse=[[]];let edges=0;
 for(let i=0;i<nodes.length;i++){const n=nodes[i];const slow=new Set(),fast=new Set();eachImmediateOptional(c,n.s,(s,cost)=>slow.add(cost+':'+key(s)));eachImmediateFast(c,n.s,(s,cost)=>fast.add(cost+':'+key(s)));assert.deepEqual(fast,slow);eachImmediateFast(c,n.s,(s,cost,get)=>{const k=key(s);let j=indices.get(k);if(j===undefined){j=nodes.length;const m=n.m.clone();apply(m,get());assertModelState(c,s,m.snapshot());nodes.push({s,m});indices.set(k,j);reverse.push([]);}reverse[j].push([i,cost]);edges++;});assert(nodes.length<30000);}
 const distances=nodes.map(()=>Infinity),queue=[];
 for(let i=0;i<nodes.length;i++)if(nodes[i].s.every(v=>v===255)){distances[i]=0;queue.push(i);}
 for(let h=0;h<queue.length;h++){const j=queue[h];for(const[i,cost]of reverse[j])if(distances[i]>distances[j]+cost){distances[i]=distances[j]+cost;queue.push(i);}}
 let eligible=0,normalized=0;
 for(let i=0;i<nodes.length;i++){const n=nodes[i],norm=normalizeFinishedQueue(c,n.s);assert.equal(norm.eligible,!n.s.includes(254));if(!norm.eligible){assert.equal(norm.drags.length,0);assert.equal(norm.state,n.s);continue;}eligible++;const j=indices.get(key(norm.state));assert.notEqual(j,undefined);assert.equal(distances[i],distances[j]);const m=n.m.clone();for(const d of norm.drags){assert.equal(m.getBlock(d.blockId).layers.length,1,'Never force a peel');apply(m,d);normalized++;}assertModelState(c,norm.state,m.snapshot());}
 assert(eligible&&normalized);evidence.finite.push({shell,states:nodes.length,edges,eligible,normalized,allExactOptimalDistancesEqual:true});console.log(JSON.stringify(evidence.finite.at(-1)));
});
test('all combinations of identity quotient and tail dominance agree across floors',()=>{
 for(const id of [87,88,90]){const l=fixture(id);l.width=3;l.gates=[{id:'r',color:'red',side:'top',offset:0,size:1},{id:'b',color:'blue',side:'top',offset:2,size:1},{id:'g',color:'green',side:'bottom',offset:1,size:1}];l.generators[1].spawn=[2,1];l.blocks=[piece('a',2,'red',{y:0}),piece('b',2,'red'),piece('c',0,'blue',{y:0}),piece('q1',0,'red'),piece('q2',2,'green')];
  for(const floor of [1,2,3]){const o={floor,maxStates:100000,maxMilliseconds:30000},raw=checkImmediateGeneratorFloor(l,api,o);assert.notEqual(raw.status,'unknown');for(const symmetry of [false,true])for(const normalizeTail of [false,true]){const p=checkFastGeneratorFloor(l,api,{...o,symmetry,normalizeTail});assert.equal(p.status,raw.status);assert.equal(p.thresholdProven,raw.thresholdProven);if(p.relaxedRoute){const r=api.replayRevisedRoute(l,p.relaxedRoute);assert(r.valid&&r.complete);assert.equal(r.nonClearingDrags,p.relaxedNonClearingDrags);assert(r.nonClearingDrags<floor);}evidence.floors.push({id,floor,symmetry,normalizeTail,status:p.status});}}
 }
});
test('new 88 and existing 87 complete routes preserve real cargo and identity',()=>{
 for(const f of ['agent85-87/enriched87-1790266245884.json','agent88-90/candidate88-enriched-1790267166815.json','agent88-90/candidate90-enriched-1790268798949.json']){const d=JSON.parse(fs.readFileSync(ROOT+'/'+f));evidence.projections.push({file:f,...projectSymmetricRoute(d.level,d.drags,api),fastSuccessors:verifyFastSuccessors(d.level,d.drags,api)});}
});
test('strict domain and exhausted budgets remain fail closed',()=>{
 const l=fixture();assert.equal(checkFastGeneratorFloor(l,api,{floor:0}).status,'invalid');assert.equal(checkFastGeneratorFloor(l,api,{floor:4,maxStates:1}).status,'unknown');l.blocks[0].movementAxis='vertical';assert.equal(checkFastGeneratorFloor(l,api,{floor:1}).status,'unsupported');
});
test('write immutable qualification evidence without certifying a candidate',()=>{
 evidence.bindings=Object.fromEntries(['tools/remake81to90-fast2-generator-domain-v146.mjs','tools/remake81to90-fast2-generator-floor-v146.mjs','tools/remake81to90-fast2-generator-floor-v146.test.mjs','tools/remake81to90-immediate-generator-floor-v146.mjs','tools/remake81to90-generator-floor-v146.mjs','tools/remake81to90-generator-domain-v146.mjs','tools/remake21to30-symmetry-floor-v139.mjs'].map(p=>[p,digest(fs.readFileSync(p))]));const file=ROOT+'/fast2-generator-qualification-'+Date.now()+'.json';writeNew(file,evidence);console.log(JSON.stringify({file}));
});

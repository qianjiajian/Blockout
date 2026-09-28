import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi,ROOT,writeNew} from './remake81to90-v146.mjs';
import {compileImmediate,eachImmediateOptional,key,assertModelState,checkImmediateGeneratorFloor} from './remake81to90-immediate-generator-floor-v146.mjs';
import {generatorClearCount} from './remake81to90-generator-floor-v146.mjs';
import {compileSymmetricImmediate,canonicalGeneratorStateKey,checkCurrentGeneratorFloor,projectSymmetricRoute} from './remake81to90-current-fast3-generator-floor-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const {api}=await loadApi(),evidence={qualificationOnly:true,candidateCertified:false,graphs:[],floors:[],projections:[]};
const body=(id,x,color,extra={})=>({id,x,y:1,color,shape:[[0,0]],...extra});
function fixture(shell=false){return {id:88,name:'Current mechanical multiset qualification',difficulty:'hard',width:2,height:3,timeSeconds:10000,reward:0,mechanismRules:'revised-2026-09-23-v1.4',gates:[{id:'r',color:'red',side:'top',offset:0,size:1},{id:'gate-blue',color:'blue',side:'top',offset:1,size:1,frozen:1},{id:'g',color:'green',side:'bottom',offset:0,size:2}],generators:[{id:'left',side:'left',offset:1,spawn:[0,1],rimMount:'rim',rimSpan:3,queueBlockIds:['q1']},{id:'right',side:'right',offset:1,spawn:[1,1],rimMount:'rim',rimSpan:3,queueBlockIds:['q2']}],blocks:[body('a',0,'red',shell?{layers:['red','blue']}:{ }),body('b',1,'green',shell?{layers:['green','blue']}:{ }),body('q1',0,'blue'),body('q2',1,'red')]};}
function apply(m,d){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}
for(const shell of [false,true])test(`complete weighted quotient has identical successors and all exact remaining costs, shells=${shell}`,()=>{
 const l=fixture(shell),c=compileSymmetricImmediate(l,api),m=new api.PuzzleModel(l);m.startCountdown();const nodes=[{s:c.initial,m}],index=new Map([[key(c.initial),0]]),reverse=[[]],groups=new Map();let edges=0,collisions=0,crossStageMerges=0;
 for(let i=0;i<nodes.length;i++){
  assert(nodes.length<150000);const n=nodes[i],ck=canonicalGeneratorStateKey(c,n.s),successors=new Set();
  eachImmediateOptional(c,n.s,(s,cost,get)=>{const sk=key(s);let j=index.get(sk);const model=n.m.clone();apply(model,get());assertModelState(c,s,model.snapshot());assert.equal(cost,Number(model.snapshot().cleared===n.m.snapshot().cleared));if(j===undefined){j=nodes.length;index.set(sk,j);nodes.push({s,m:model});reverse.push([]);}reverse[j].push([i,cost]);successors.add(cost+':'+canonicalGeneratorStateKey(c,s));edges++;});
  const prior=groups.get(ck);if(prior){assert.deepEqual(successors,prior.successors);assert.equal(generatorClearCount(c,n.s),generatorClearCount(c,nodes[prior.index].s));collisions++;if(n.s.some((v,j)=>v!==254&&v!==255&&(v>>>7)!==(nodes[prior.index].s[j]>>>7)))crossStageMerges++;prior.members.push(i);}else groups.set(ck,{index:i,successors,members:[i]});
 }
 const distances=nodes.map(()=>Infinity),queue=[];for(let i=0;i<nodes.length;i++)if(nodes[i].s.every(v=>v===255)){distances[i]=0;queue.push(i);}for(let h=0;h<queue.length;h++){const j=queue[h];for(const[i,cost]of reverse[j])if(distances[i]>distances[j]+cost){distances[i]=distances[j]+cost;queue.push(i);}}
 for(const g of groups.values())for(const i of g.members)assert.equal(distances[i],distances[g.index]);assert(collisions>0);if(shell)assert(crossStageMerges>0);
 const record={shell,labeledStates:nodes.length,canonicalStates:groups.size,edges,collisions,crossStageMerges,optimum:distances[0],allCostsAndSuccessorsIdentical:true,everyOriginalEdgeReplayed:true,allStateOptimalRemainingDistancesEqual:true};evidence.graphs.push(record);console.log(JSON.stringify(record));
 for(const floor of [1,2,3])for(const normalizeTail of [false,true]){const o={floor,maxStates:200000,maxMilliseconds:60000},raw=checkImmediateGeneratorFloor(l,api,o),q=checkCurrentGeneratorFloor(l,api,{...o,normalizeTail});assert.notEqual(raw.status,'unknown');assert.notEqual(q.status,'unknown');assert.equal(q.thresholdProven,floor<=distances[0]);assert.equal(q.status,raw.status);if(q.relaxedRoute){const r=api.replayRevisedRoute(l,q.relaxedRoute);assert(r.valid&&r.complete);assert.equal(r.nonClearingDrags,q.relaxedNonClearingDrags);assert(r.nonClearingDrags<floor);}evidence.floors.push({shell,floor,normalizeTail,status:q.status});}
});
test('physical anchor offsets, current layer colors, counters and QUEUED identities stay distinct',()=>{
 const c=compileSymmetricImmediate(fixture(true),api),s=c.initial.slice();assert(s.includes(254));const changed=s.slice(),q=c.generators[0].indices[0];changed[q]=255;assert.notEqual(canonicalGeneratorStateKey(c,s),canonicalGeneratorStateKey(c,changed));
 const t=s.slice();t[0]|=128;assert.notEqual(canonicalGeneratorStateKey(c,s),canonicalGeneratorStateKey(c,t));
 const l=fixture(false);l.blocks.find(b=>b.id==='q1').shape=[[1,0]];l.generators[0].spawn=[-1,1];const cc=compileSymmetricImmediate(l,api);const cargo=cc.blocks.find(b=>b.id==='q1');assert.deepEqual(cargo.anchorOffset,[1,0]);assert.equal(cargo.initial,2);
});
test('88 and 90 current physical keys preserve every real gesture and all inventories',()=>{
 for(const f of ['agent88-90/candidate88-enriched-1790270925078.json','agent88-90/candidate90-enriched-1790270924589.json']){const d=JSON.parse(fs.readFileSync(ROOT+'/'+f));evidence.projections.push({file:f,...projectSymmetricRoute(d.level,d.drags,api)});}
});
test('positive optimal cost and both proven/rejected thresholds agree with the original full graph',()=>{
 const l=fixture();l.width=3;l.gates=[{id:'gate-red',color:'red',side:'top',offset:0,size:1},{id:'gate-blue',color:'blue',side:'top',offset:2,size:1},{id:'gate-green',color:'green',side:'bottom',offset:1,size:1}];l.generators[1].spawn=[2,1];l.blocks=[body('a',2,'red',{y:0}),body('b',2,'red'),body('c',0,'blue',{y:0}),body('q1',0,'red'),body('q2',2,'green')];
 const optimum=checkImmediateGeneratorFloor(l,api,{floor:8,maxStates:300000,maxMilliseconds:60000});assert.equal(optimum.status,'relaxed-shortcut');assert(optimum.relaxedNonClearingDrags>0);const n=optimum.relaxedNonClearingDrags;
 for(const floor of [n,n+1])for(const normalizeTail of [false,true]){const r=checkCurrentGeneratorFloor(l,api,{floor,normalizeTail,maxStates:300000,maxMilliseconds:60000});assert.notEqual(r.status,'unknown');assert.equal(r.thresholdProven,floor===n);if(r.relaxedRoute){const q=api.replayRevisedRoute(l,r.relaxedRoute);assert(q.valid&&q.complete);assert.equal(q.nonClearingDrags,n);}evidence.floors.push({positive:true,floor,optimum:n,normalizeTail,status:r.status});}
});
test('unsupported future identity semantics and budgets fail closed',()=>{
 for(const change of [l=>l.id=87,l=>l.blocks[0].frozen=1,l=>l.blocks[0].lockCount=1,l=>l.blocks[0].keyId='k',l=>l.blocks[0].movementAxis='horizontal',l=>l.blocks[0].timedBombSeconds=10,l=>l.blocks[0].star=true,l=>l.shutters=[{id:'hidden',x:0,y:1,width:1,height:1,count:1}]]){const l=fixture();change(l);const r=checkCurrentGeneratorFloor(l,api,{floor:1});assert.equal(r.status,'unsupported');assert(!r.thresholdProven);}
 assert.equal(checkCurrentGeneratorFloor(fixture(),api,{floor:0}).status,'invalid');assert.equal(checkCurrentGeneratorFloor(fixture(),api,{floor:5,maxStates:1,normalizeTail:false}).status,'unknown');
});
test('write independent qualification without certifying 88 or 90',()=>{
 assert.equal(evidence.graphs.length,2);assert.equal(evidence.projections.length,2);evidence.bindings=Object.fromEntries(['tools/remake81to90-current-fast3-generator-floor-v147.mjs','tools/remake81to90-current-fast3-generator-floor-v147.test.mjs','tools/remake81to90-fast3-generator-domain-v147.mjs','tools/remake81to90-immediate-generator-floor-v146.mjs','tools/remake81to90-generator-floor-v146.mjs'].map(p=>[p,digest(fs.readFileSync(p))]));const file=ROOT+'/current-fast3-generator-qualification-'+Date.now()+'.json';writeNew(file,evidence);console.log(JSON.stringify({file,candidateCertified:false}));
});

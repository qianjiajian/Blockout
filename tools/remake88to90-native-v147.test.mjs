import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi,ROOT,writeNew} from './remake81to90-v146.mjs';
import {compileImmediate,eachImmediateOptional} from './remake81to90-immediate-generator-floor-v146.mjs';
import {generatorStateFromSnapshot,generatorClearCount} from './remake81to90-generator-floor-v146.mjs';
import {nativePayload,runNative,NATIVE_SOURCE} from './remake88to90-native-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const boundFiles=[NATIVE_SOURCE,'tools/remake88to90-native-v147.mjs','tools/remake88to90-native-v147.test.mjs','tools/remake81to90-current-fast3-generator-floor-v147.mjs','tools/remake81to90-immediate-generator-floor-v146.mjs','tools/remake81to90-generator-floor-v146.mjs'];
const initialBindings=Object.fromEntries(boundFiles.map(p=>[p,digest(fs.readFileSync(p))]));
const {api}=await loadApi();
const evidence={qualificationOnly:true,candidateCertified:false,graphs:[],realPrefixes:[],bindings:{}};
const body=(id,x,color,extra={})=>({id,x,y:1,color,shape:[[0,0]],...extra});
function fixture(shell=false){return{id:88,name:'Native graph qualification',difficulty:'hard',width:2,height:3,timeSeconds:10000,reward:0,mechanismRules:'revised-2026-09-23-v1.4',gates:[{id:'r',color:'red',side:'top',offset:0,size:1},{id:'gate-blue',color:'blue',side:'top',offset:1,size:1,frozen:1},{id:'g',color:'green',side:'bottom',offset:0,size:2}],generators:[{id:'left',side:'left',offset:1,spawn:[0,1],rimMount:'rim',rimSpan:3,queueBlockIds:['q1']},{id:'right',side:'right',offset:1,spawn:[1,1],rimMount:'rim',rimSpan:3,queueBlockIds:['q2']}],blocks:[body('a',0,'red',shell?{layers:['red','blue']}:{ }),body('b',1,'green',shell?{layers:['green','blue']}:{ }),body('q1',0,'blue'),body('q2',1,'red')]};}
const text=s=>Buffer.from(s).toString('base64');
function jsGraph(level,symmetry){
 const c=compileImmediate(level,api),p=nativePayload(level,api),key=s=>{if(!symmetry)return text(s);const t=s.slice();for(const g of p.groups){const slots=g.filter(i=>s[i]!==254),values=slots.map(i=>s[i]).sort((a,b)=>a-b);slots.forEach((i,j)=>t[i]=values[j]);}return text(t);};
 const dist=new Map([[key(c.initial),0]]),nodes=[{s:c.initial,cost:0}],edges=new Map();
 for(let h=0;h<nodes.length;h++){assert(dist.size<100000);const n=nodes[h],k=key(n.s);if(dist.get(k)<n.cost)continue;const es=edges.get(k)??new Set();edges.set(k,es);eachImmediateOptional(c,n.s,(s,cost)=>{const sk=key(s);es.add(cost+':'+sk);if((dist.get(sk)??Infinity)>n.cost+cost){dist.set(sk,n.cost+cost);nodes.push({s,cost:n.cost+cost});}});}
 let optimum=Infinity;for(const [k,cost]of dist)if([...Buffer.from(k,'base64')].every(v=>v===255))optimum=Math.min(optimum,cost);
 return{dist,edges,optimum};
}
for(const shell of [false,true])test(`full native graph every state, edge and exact initial cost matches independent JS; shells=${shell}`,()=>{
 for(const symmetry of [false,true]){const l=fixture(shell),expected=jsGraph(l,symmetry),r=runNative(l,api,{floor:50,maxStates:100000,maxMilliseconds:60000,collect:true,symmetry});assert.notEqual(r.status,'unknown');assert.deepEqual(new Map(r.distances),expected.dist);assert.deepEqual(new Map(r.edges.map(([k,a])=>[k,new Set(a)])),expected.edges);assert.equal(r.relaxedNonClearingDrags,expected.optimum);
  const row={shell,symmetry,states:expected.dist.size,edges:[...expected.edges.values()].reduce((n,a)=>n+a.size,0),optimum:expected.optimum,input:r.input,output:r.output};evidence.graphs.push(row);console.log(JSON.stringify(row));
 }
});
test('nonzero optimum, proven and rejected thresholds, both priority orders',()=>{
 const l=fixture();l.width=3;l.gates=[{id:'gate-red',color:'red',side:'top',offset:0,size:1},{id:'gate-blue',color:'blue',side:'top',offset:2,size:1},{id:'gate-green',color:'green',side:'bottom',offset:1,size:1}];l.generators[1].spawn=[2,1];l.blocks=[body('a',2,'red',{y:0}),body('b',2,'red'),body('c',0,'blue',{y:0}),body('q1',0,'red'),body('q2',2,'green')];
 const expected=jsGraph(l,false);assert(expected.optimum>0&&Number.isFinite(expected.optimum));
 for(const floor of [expected.optimum,expected.optimum+1])for(const symmetry of [false,true])for(const weight of [0,1000]){const r=runNative(l,api,{floor,symmetry,weight,maxStates:500000,maxMilliseconds:60000});assert.equal(r.thresholdProven,floor===expected.optimum);assert.notEqual(r.status,'unknown');}
});
test('actual 88/90 every gesture prefix, all original successors, high board bits and >32 bodies',()=>{
 for(const f of ['agent88-90/candidate88-enriched-1790270925078.json','agent88-90/candidate90-enriched-1790272684314.json']){
  const d=JSON.parse(fs.readFileSync(ROOT+'/'+f)),c=compileImmediate(d.level,api),m=new api.PuzzleModel(d.level);m.startCountdown();let prefixes=0,edgeCount=0,highPose=false;
  function compare(){const s=generatorStateFromSnapshot(c,m.snapshot()),expected=new Set();eachImmediateOptional(c,s,(t,cost)=>expected.add(cost+':'+text(t)));const r=runNative(d.level,api,{state:s,successorsOnly:true,symmetry:false});assert.deepEqual(new Set(r.successors),expected);prefixes++;edgeCount+=expected.size;highPose ||= s.some(v=>v<254&&(v&127)>=64);}
  compare();for(const a of d.drags){m.beginAction();for(const p of a.path)assert(m.moveBlockStep(a.blockId,...p));if(a.exitSide)assert(m.tryExit(a.blockId,a.exitSide).ok);assert(m.commitAction());compare();}assert(m.snapshot().complete);assert(c.blocks.length>32);if(d.level.id===88)assert(highPose);const row={id:d.level.id,file:f,levelSha256:digest(d.level),prefixes,allSuccessorEdges:edgeCount,highPose,bodyCount:c.blocks.length};evidence.realPrefixes.push(row);console.log(JSON.stringify(row));
 }
});
test('scope rejects unsupported semantics and resource exhaustion stays unknown',()=>{
 for(const mutate of [l=>l.id=87,l=>l.blocks[0].frozen=1,l=>l.blocks[0].keyId='a',l=>l.blocks[0].movementAxis='vertical',l=>l.blocks[0].star=true,l=>l.blocks[0].timedBombSeconds=10]){const l=fixture();mutate(l);assert.throws(()=>nativePayload(l,api));}
 assert.throws(()=>nativePayload(fixture(),api,{floor:0}));assert.throws(()=>nativePayload(fixture(),api,{state:[255,255,255,255]}));const r=runNative(fixture(),api,{floor:5,maxStates:1});assert.equal(r.status,'unknown');assert.equal(r.thresholdProven,false);
});
test('write fresh native qualification only',()=>{
 assert.equal(evidence.graphs.length,4);assert.equal(evidence.realPrefixes.length,2);for(const p of boundFiles)evidence.bindings[p]=digest(fs.readFileSync(p));assert.deepEqual(evidence.bindings,initialBindings);const f=ROOT+'/native88-90-qualification-'+Date.now()+'.json';writeNew(f,evidence);console.log(JSON.stringify({file:f,candidateCertified:false}));
});

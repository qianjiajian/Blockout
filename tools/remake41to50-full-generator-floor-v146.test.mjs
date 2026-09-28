import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi} from './remake21to30-v120.mjs';
import {compileGeneratorLevel,generatorClearCount,forEachOptionalSpawn,checkFullGeneratorFloor,verifyFullGeneratorRouteProjection} from './remake41to50-full-generator-floor-v146.mjs';
const {api}=await loadApi();
const piece=(id,x,y,color,extra={})=>({id,x,y,color,shape:[[0,0],[1,0]],...extra});
const fixture=()=>({id:41,name:'projection fixture',difficulty:'easy',reward:0,timeSeconds:100,
  mechanismRules:'revised-2026-09-23-v1.4',width:5,height:5,
  gates:[{id:'r',color:'red',side:'left',offset:1,size:2},{id:'b',color:'blue',side:'right',offset:1,size:2},
    {id:'g',color:'green',side:'bottom',offset:1,size:2},{id:'p',color:'purple',side:'right',offset:3,size:2},
    {id:'o',color:'orange',side:'left',offset:3,size:2},{id:'y',color:'yellow',side:'bottom',offset:3,size:2,frozen:2}],
  generators:[{id:'machine',side:'top',offset:2,rimSpan:3,rimMount:'rim',spawn:[1,0],queueBlockIds:['cargo-a','cargo-b']}],
  shutters:[{id:'cover',x:3,y:3,width:2,height:1,count:2}],
  blocks:[piece('carrier',1,0,'red',{layers:['red','blue']}),piece('ice',1,3,'green',{frozen:2}),
    piece('hidden',3,3,'purple',{shutterId:'cover'}),piece('cargo-a',1,0,'orange'),piece('cargo-b',1,0,'yellow')]});
const route=()=>[
  {blockId:'carrier',path:[[1,1]]}, // Mid-drag automatic first cargo arrival.
  {blockId:'carrier',path:[[0,1]],exitSide:'left'},
  {blockId:'carrier',path:[[1,1],[2,1],[3,1]],exitSide:'right'}, // Reveals cover, thaws visible ice.
  {blockId:'ice',path:[[1,4]],exitSide:'bottom'},
  {blockId:'cargo-a',path:[[1,1],[1,2],[1,3],[0,3]],exitSide:'left'}, // Second cargo arrives mid-drag.
  {blockId:'hidden',path:[],exitSide:'right'},
  {blockId:'cargo-b',path:[[1,1],[2,1],[3,1],[3,2],[3,3],[3,4]],exitSide:'bottom'},
];


test('keeps complete fixed cargo, all real counters and revealed layers',()=>{
 const l=fixture(),before=structuredClone(l),c=compileGeneratorLevel(l,api);
 assert.deepEqual(l,before);assert.equal(c.blocks.length,5);assert.equal(c.totalClears,6);
 assert.equal(generatorClearCount(c,c.initial),0);
 assert.equal(c.initial[c.blocks.findIndex(b=>b.id==='cargo-a')],254);
 assert.equal(c.blocks.find(b=>b.id==='ice').ice,2);
 assert.equal(c.gates.find(g=>g.id==='y').frozen,2);
 assert.equal(c.covers[0].count,2);
 const emitted=[];forEachOptionalSpawn(c,c.initial,i=>emitted.push(c.blocks[i].id));assert.deepEqual(emitted,[]);
});
test('every complete real gesture maps including mid-drag arrivals/peel/reveal/ice',()=>{
 const r=verifyFullGeneratorRouteProjection(fixture(),route(),api);assert(r.valid,r.error);
 assert.equal(r.steps.length,7);assert.equal(r.projectedNonClearingDrags,1);
 assert.deepEqual(r.steps.flatMap(s=>s.arrivals),['cargo-a','cargo-b']);
 assert.equal(r.lowerBoundCertified,false);
});
test('settled initial emission is not double spawned or counted as cleared',()=>{
 const l=fixture();l.blocks=l.blocks.filter(b=>b.id!=='carrier');const c=compileGeneratorLevel(l,api);
 assert.notEqual(c.initial[c.blocks.findIndex(b=>b.id==='cargo-a')],254);
 assert.equal(c.initial[c.blocks.findIndex(b=>b.id==='cargo-b')],254);assert.equal(generatorClearCount(c,c.initial),0);
});
test('only queue head and its complete free footprint may spawn',()=>{
 const c=compileGeneratorLevel(fixture(),api),s=c.initial.slice(),carrier=c.blocks.findIndex(b=>b.id==='carrier');
 s[carrier]=255;const first=[];forEachOptionalSpawn(c,s,(i,v)=>first.push([c.blocks[i].id,v]));
 assert.deepEqual(first.map(x=>x[0]),['cargo-a']);s[c.blocks.findIndex(b=>b.id==='cargo-a')]=first[0][1];
 const blocked=[];forEachOptionalSpawn(c,s,i=>blocked.push(i));assert.deepEqual(blocked,[]);
 s[c.blocks.findIndex(b=>b.id==='cargo-a')]=255;const second=[];forEachOptionalSpawn(c,s,i=>second.push(c.blocks[i].id));
 assert.deepEqual(second,['cargo-b']);assert.equal(generatorClearCount(c,s),3);
});
test('small exhaustive graph has same optimum with/without monotone normalization',()=>{
 const results=[];
 for(const normalize of [false,true]){
  const r=checkFullGeneratorFloor(fixture(),api,{floor:2,maxStates:100000,maxMilliseconds:10000,normalize});
  assert.equal(r.status,'relaxed-shortcut',JSON.stringify(r));assert(r.relaxedNonClearingDrags<=1);
  assert.equal(r.thresholdProven,false);results.push(r.relaxedNonClearingDrags);
 }assert.equal(results[0],results[1]);
});
test('invalid budgets/unknown deadlines/incomplete routes never certify',()=>{
 assert.equal(checkFullGeneratorFloor(fixture(),api,{floor:0}).status,'invalid');
 const r=checkFullGeneratorFloor(fixture(),api,{floor:4,maxStates:1,maxMilliseconds:1000,normalize:false});
 assert.equal(r.status,'unknown');assert.equal(r.thresholdProven,false);
 assert.equal(verifyFullGeneratorRouteProjection(fixture(),route().slice(0,1),api).valid,false);
});
test('unsupported or malformed cargo domains fail closed',()=>{
 for(const change of [l=>l.id=34,l=>l.blocks.at(-1).frozen=1,l=>l.blocks.at(-1).star=true,l=>l.generators[0].intervalSeconds=1,l=>l.shutters[0].skin='lift']){
  const l=fixture();change(l);const r=checkFullGeneratorFloor(l,api,{floor:1});
  assert.equal(r.status,'unsupported');assert.equal(r.thresholdProven,false);
 }
});
test('queued block anchor is the actual generator spawn, not unused spec coordinates',()=>{
 const l=fixture();for(const b of l.blocks.filter(b=>b.id.startsWith('cargo-'))){b.x=4;b.y=4;}
 const c=compileGeneratorLevel(l,api);assert.equal(c.blocks.find(b=>b.id==='cargo-a').initial,1);
 const r=verifyFullGeneratorRouteProjection(l,route(),api);assert(r.valid,r.error);
});

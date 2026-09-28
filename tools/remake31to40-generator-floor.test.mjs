import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi} from './remake21to30-v120.mjs';
import {projectGeneratorOpening,checkGeneratorFloor,verifyGeneratorRouteProjection} from './remake31to40-generator-floor.mjs';
const {api}=await loadApi();
const piece=(id,x,y,color,extra={})=>({id,x,y,color,shape:[[0,0],[1,0]],...extra});
const fixture=()=>({id:35,name:'projection fixture',difficulty:'easy',reward:0,timeSeconds:100,
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

test('opening projection keeps frozen visible bodies/all shell layers, not hidden or future cargo',()=>{
  const level=fixture(),before=structuredClone(level),p=projectGeneratorOpening(level,api);
  assert.deepEqual(level,before);assert.deepEqual(p.retainedIds,['carrier','ice']);assert.deepEqual(p.droppedIds,['hidden','cargo-a','cargo-b']);
  assert.deepEqual(p.level.blocks[0].layers,['red','blue']);assert(!p.level.blocks.some(b=>b.frozen||b.shutterId));
  assert(!p.level.gates.some(g=>g.frozen));assert(!p.level.generators&&!p.level.shutters);
  assert.deepEqual(p.level.gates,level.gates.map(g=>{const x={...g};delete x.frozen;return x;}));
});
test('fresh automatic cargo emission is retained at its true fixed spawn',()=>{
  const level=fixture();level.blocks=level.blocks.filter(b=>b.id!=='carrier');
  const p=projectGeneratorOpening(level,api);assert(p.retainedIds.includes('cargo-a'));assert(!p.retainedIds.includes('cargo-b'));
  assert.deepEqual(p.initiallySpawnedIds,['cargo-a']);assert.equal(p.level.blocks.find(b=>b.id==='cargo-a').x,1);
});
test('all real witness actions simulate, including shell, numeric ice, hidden reveal and mid-drag refills',()=>{
  const result=verifyGeneratorRouteProjection(fixture(),route(),api);
  assert(result.valid,result.error);assert.equal(result.steps.length,7);assert.equal(result.stutters,3);
  assert.equal(result.realNonClearingDrags,1);assert.equal(result.projectedNonClearingDrags,1);assert(result.projectionComplete);
  assert.equal(result.lowerBoundCertified,false);
});
test('retained out-and-back drag can project to a zero-cost stutter',()=>{
  const drags=route();drags.splice(1,0,{blockId:'carrier',path:[[1,2],[1,1]]});
  const result=verifyGeneratorRouteProjection(fixture(),drags,api);assert(result.valid,result.error);
  assert(result.projectedNonClearingDrags<result.realNonClearingDrags);
});
test('clears from discarded cargo cannot leave fake freeze floors behind',()=>{
  const level=fixture();level.blocks.find(b=>b.id==='ice').frozen=99;level.gates.find(g=>g.id==='y').frozen=99;
  const p=projectGeneratorOpening(level,api);assert(p.level.blocks.every(b=>b.frozen===undefined));assert(p.level.gates.every(g=>g.frozen===undefined));
  const result=checkGeneratorFloor(level,api,{floor:2,maxStates:20000,maxMilliseconds:5000});
  assert.equal(result.thresholdProven,false);assert.equal(result.status,'relaxed-shortcut');assert.equal(result.solvabilityValidated,false);
});
test('bad budgets and exhausted search are not proofs',()=>{
  assert.equal(checkGeneratorFloor(fixture(),api,{floor:0}).status,'invalid');
  const result=checkGeneratorFloor(fixture(),api,{floor:10,maxStates:1,maxMilliseconds:1000});assert.equal(result.thresholdProven,false);assert.equal(result.status,'unknown');
});
test('a positive geometric floor survives deletion of future cargo and binds both data hashes',()=>{
  const level={id:36,name:'positive projection',difficulty:'easy',reward:0,timeSeconds:100,
    mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,
    gates:[{id:'r',color:'red',side:'bottom',offset:0,size:2},{id:'b',color:'blue',side:'left',offset:0,size:1},
      {id:'g',color:'green',side:'right',offset:0,size:1},{id:'p',color:'purple',side:'right',offset:2,size:1}],
    generators:[{id:'machine',side:'top',offset:1,spawn:[0,0],queueBlockIds:['cargo']}],
    blocks:[piece('carrier',0,0,'red'),piece('blue',0,2,'blue',{shape:[[0,0]]}),
      piece('green',1,2,'green',{shape:[[0,0]]}),piece('cargo',0,0,'purple')]};
  const drags=[{blockId:'green',path:[[2,2],[2,1],[2,0]],exitSide:'right'},
    {blockId:'blue',path:[[1,2],[2,2]]},{blockId:'carrier',path:[[0,1],[0,2]],exitSide:'bottom'},
    {blockId:'cargo',path:[[0,1]]},{blockId:'blue',path:[[2,1],[2,0],[1,0],[0,0]],exitSide:'left'},
    {blockId:'cargo',path:[[1,1],[1,2]],exitSide:'right'}];
  const simulation=verifyGeneratorRouteProjection(level,drags,api);assert(simulation.valid,simulation.error);
  assert.equal(simulation.realNonClearingDrags,2);assert.equal(simulation.projectedNonClearingDrags,1);
  const result=checkGeneratorFloor(level,api,{floor:1,maxStates:10000,maxMilliseconds:1000});
  assert(result.thresholdProven);assert.equal(result.solvabilityValidated,false);
  assert.equal(result.sourceLevelSha256,simulation.sourceLevelSha256);assert.equal(result.projectedLevelSha256,simulation.projectedLevelSha256);
  assert.equal(checkGeneratorFloor(level,api,{floor:2,maxStates:10000,maxMilliseconds:1000}).status,'relaxed-shortcut');
});
test('incomplete or noncanonical routes cannot certify projection checks',()=>{
  assert.equal(verifyGeneratorRouteProjection(fixture(),route().slice(0,2),api).valid,false);
  const bad=route();bad[0].path=[[4,4]];assert.equal(verifyGeneratorRouteProjection(fixture(),bad,api).valid,false);
});
test('locked, timed and unsupported mechanics fail closed even on discarded cargo',()=>{
  const mutations=[l=>l.id=34,l=>l.id=41,l=>delete l.mechanismRules,l=>l.mechanismRules='revised-2026-09-21-v1.2',
    l=>l.generators=[],l=>l.generators[0].trigger='time',l=>l.generators[0].intervalSeconds=1,
    l=>l.generators[0].initialDelaySeconds=1,l=>l.blocks.at(-1).frozen=1,
    ...['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'].map(k=>l=>l.blocks.at(-1)[k]=k==='movementAxis'?'horizontal':1),
    l=>l.blocks.at(-1).star=true,l=>l.blocks.at(-1).rotationBadge=true,l=>l.gates[0].star=true,l=>l.gates[0].portals=[],
    ...['seams','flipDoors','coloredGrids','elevators','conveyors'].map(k=>l=>l[k]=[{}]),
    ...['lift','generator','staging','staged-frame'].map(skin=>l=>l.shutters[0].skin=skin),
    l=>l.shutters[0].triggerBlockIds=['carrier'],l=>l.generators[0].queueBlockIds.push('missing'),
    l=>l.generators[0].spawn=[0,4],l=>l.width=20];
  for(const mutate of mutations){const l=fixture();mutate(l);const result=checkGeneratorFloor(l,api,{floor:1});assert.equal(result.status,'unsupported',JSON.stringify(l));assert.equal(result.thresholdProven,false);}
});

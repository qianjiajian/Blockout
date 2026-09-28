import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from './revised-preview-validation-v160.mjs';
import {loadRemakeApi,auditOriginalLayout,checkOriginalCandidate,formalFromOriginal,makeTimedPlan,REMAKE_IDS,checkRemakeBindings,assertRemakeBaseline} from './revised-original-remake-v112.mjs';
const {api}=await loadRemakeApi();
const base=()=>({id:32,name:'test only',mechanismRules:'revised-2026-09-21-v1.2',width:2,height:2,
  timeSeconds:90,reward:60,difficulty:'normal',parMoves:8,
  gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'b',color:'blue',side:'right',offset:0,size:2}],
  blocks:[[0,0,'red'],[1,0,'blue'],[0,1,'blue'],[1,1,'red']].map(([x,y,color],i)=>({id:'b'+i,x,y,color,shape:[[0,0]]}))});
const rawFor=(level,drags=[])=>({ruleVersion:'1.12.0',designOrigin:'independent-original-remake',seed:'test',
  bindings:{'tools/revised-original-remake-v112.test.mjs':digest(fs.readFileSync('tools/revised-original-remake-v112.test.mjs'))},
  designSpec:{theme:'test-only',width:level.width,height:level.height,openingBlockCount:4,fullBlockCount:4,
    mechanisms:api.measureRevisedMechanismInventory(level)},level,drags});
const passes=l=>assert.equal(auditOriginalLayout(l,api).passed,true);
const rejects=l=>{let result,error;try{result=auditOriginalLayout(l,api);}catch(e){error=e;}assert(error||result.passed===false);};
const completeRoute=()=>[{blockId:'b0',path:[],exitSide:'left'},{blockId:'b1',path:[],exitSide:'right'},
  {blockId:'b2',path:[[0,0],[1,0]],exitSide:'right'},{blockId:'b3',path:[[0,1]],exitSide:'left'}];

test('exact 30 level scope excludes other 170',()=>{
  assert.equal(REMAKE_IDS.length,30);assert.equal(new Set(REMAKE_IDS).size,30);
  assert.throws(()=>auditOriginalLayout({...base(),id:21},api),/outside/);
});
test('formal campaign keeps 200 slots and all 180 revised designs are installed',()=>{
  assert.equal(api.LEVELS.length,200);
  assert.equal(api.LEVELS.filter(l=>l.id>=21 && l.mechanismRules==='revised-2026-09-21-v1.2').length,180);
  for(const id of REMAKE_IDS)assert(api.REVISED_CONTINUATION_LAYOUTS[id]);
});
test('formal remakes cannot inherit obsolete tutorials, including the Lv70 timed generator',()=>{
  for(const id of REMAKE_IDS)assert.equal(api.LEVELS[id-1].featureIntro,undefined);
});
test('original design does not fabricate competitor source evidence',()=>{
  const r=auditOriginalLayout(base(),api);assert(r.passed);
  assert.equal(r.competitorAlignment,'not-applicable-independent-original');assert.equal(r.releaseApproved,false);
});
test('duplicate ordinary colours remain forbidden without source contract',()=>{
  const l=base();l.gates.push({id:'r2',color:'red',side:'top',offset:0,size:1});rejects(l);
});
test('wide gates are not excused by original scope',()=>{
  const l=base();l.gates[0].size=4;rejects(l);
});
test('empty opening cells remain forbidden',()=>{
  const l=base();l.blocks.pop();rejects(l);
});
test('same-colour opening adjacency remains forbidden',()=>{
  const l=base();l.blocks[1].color='red';rejects(l);
});
test('asymmetric floor remains forbidden',()=>{
  const l=base();l.playable=[[0,0],[1,0],[0,1]];l.blocks.pop();rejects(l);
});
test('original source flag cannot bless an incomplete route',()=>{
  assert.throws(()=>checkOriginalCandidate(rawFor(base(),[{blockId:'b0',path:[],exitSide:'left'}]),api),/incomplete spatial/);
});
test('correct fresh complete route can be replayed with positive elapsed time',()=>{
  const l=base(),drags=completeRoute();
  const r=checkOriginalCandidate(rawFor(l,drags),api);
  assert(r.spatial.complete && r.timed.complete && r.timed.activeElapsedSeconds>0);
  assert.equal(r.pointerValidated,false);assert.equal(r.lowerBoundCertified,false);
  assert.equal(r.timeAndStarsCalibrated,false);
});
test('new formal geometry keeps old actual timing/reward/star targets and drops old hints',()=>{
  const old={...base(),featureIntro:{kind:'timed-generator'},hint:{blockId:'obsolete'},timeSeconds:73,reward:91,parMoves:8};
  const formal=formalFromOriginal(rawFor(base()),old,api);
  assert.equal(formal.timeSeconds,73);assert.equal(formal.reward,91);assert(!('hint'in formal));
  assert(!('featureIntro'in formal));
  assert.deepEqual(api.levelStarTargets(formal),api.levelStarTargets(old));
});
test('candidate input bindings reject a changed construction script hash',()=>{
  assert.throws(()=>checkRemakeBindings({'tools/revised-original-remake-v112.test.mjs':'0'.repeat(64)}),/input drift/);
  assert.throws(()=>checkRemakeBindings({}),/must bind/);
});
test('baseline cannot self-assert a fabricated campaign identity',()=>{
  assert.throws(()=>assertRemakeBaseline({ruleVersion:'1.12.0',scope:REMAKE_IDS,
    dataSha256:'f13232d3cb9b703de97d0aa4851813c9521b2f60e7bcbafd87266d76d488be6e',
    campaignSemanticSha256:'0'.repeat(64)},api));
});
test('authored design inventory/count changes are not silently accepted',()=>{
  const r=rawFor(base(),[{blockId:'b0',path:[],exitSide:'left'}]);r.designSpec.fullBlockCount=5;
  assert.throws(()=>checkOriginalCandidate(r,api),/full count/);
});
test('positive-time plan cannot be accepted under a changed candidate identity',()=>{
  const r=rawFor(base(),completeRoute());r.timedRoute=makeTimedPlan(r.level,r.drags);
  r.timedRoute.levelSha256='0'.repeat(64);
  assert.throws(()=>checkOriginalCandidate(r,api),/timing identity changed/);
});

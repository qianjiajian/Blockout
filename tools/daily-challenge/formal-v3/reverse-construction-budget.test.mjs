import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {buildReverseConstructedCandidate} from './design-reverse-construction-factory.mjs';
import {auditCompleteReverseWitness} from './reverse-route-audit.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const runtime=await loadBoundedRuntime(),evidence=[];
const fixture=()=>({id:997621,name:'new tiny reverse budget qualification',width:2,height:2,timeSeconds:180,difficulty:'super',reward:0,
  mechanismRules:'revised-2026-09-27-v1.5',blocks:['red','blue','green','yellow'].map((color,i)=>({id:color,color,x:i%2,y:Math.floor(i/2),shape:[[0,0]]})),
  gates:['red','blue','green','yellow'].map((color,i)=>({id:`g-${color}`,color,side:i<2?'top':'bottom',offset:i%2,size:1}))});
function build(options={}){
  const level=fixture();return buildReverseConstructedCandidate(level,runtime,{seed:734157,minimumScrambleDrags:0,maxScrambleDrags:0,
    constructionTemplatePacket:{ok:true,level,construction:{qualificationFixture:true}},...options});
}

test('raw cap includes template, empty world and first inserted inventory before any held BFS',()=>{
  const stopped=build({maxStates:2});
  assert.equal(stopped.ok,false);assert.equal(stopped.reason,'construction-max-raw-board-states');
  assert.equal(stopped.construction.rawDiscoveredStates,2);assert.equal(stopped.construction.rawExpandedStates,1);
  assert.equal(stopped.construction.microDiscoveredStates,0,'no exemption for inserting a new entity before coordinate BFS');
  assert.equal(stopped.construction.microExpandedStates,0);
  assert.equal(stopped.construction.fullBoardDifficultySearchInvocations,0);
  assert.equal(levelSha256(stopped.constructionTemplateLevel),levelSha256(fixture()));evidence.push({name:'raw-insertion-start-before-micro',report:stopped});
});

test('the same shared raw set stops the next full proposed world without exceeding its limit',()=>{
  const stopped=build({maxStates:3}),s=stopped.construction;
  assert.equal(stopped.ok,false);assert.equal(stopped.reason,'construction-max-raw-board-states');
  assert.equal(s.rawDiscoveredStates,3);assert(s.rawExpandedStates<=3);assert(s.microDiscoveredStates>0);
  assert.equal(new Set(s.rawWorldSha256s).size,s.rawDiscoveredStates);
  assert(s.expandedWorldSha256s.every(k=>s.rawWorldSha256s.includes(k)));
  evidence.push({name:'single-shared-raw-set',report:stopped});
});

test('finite micro and transition guards stop separately while retaining actual raw counters',()=>{
  for(const [options,reason]of [[{maxMicroStates:1},'construction-max-micro-states'],[{maxTransitions:1},'construction-max-transitions']]){
    const stopped=build(options),s=stopped.construction;
    assert.equal(stopped.ok,false);assert.equal(stopped.reason,reason);
    assert(s.rawDiscoveredStates>=3&&s.rawDiscoveredStates<=10000);
    assert(s.microDiscoveredStates<=(options.maxMicroStates??1000000));assert(s.attemptedTransitions<=(options.maxTransitions??3000000));
    evidence.push({name:reason,report:stopped});
  }
});

test('invalid raw, internal, duration and scramble limits cannot silently disable bounds',()=>{
  for(const options of [{maxStates:10001},{maxStates:NaN},{maxStates:Infinity},{maxMicroStates:Infinity},{maxMicroStates:3000001},
    {maxTransitions:NaN},{maxTransitions:10000001},{maxMilliseconds:Infinity},{maxMilliseconds:30001},
    {minimumScrambleDrags:-1},{minimumScrambleDrags:2,maxScrambleDrags:1},{maxScrambleDrags:257},{maxScrambleDrags:Infinity}])assert.throws(()=>build(options));
});

test('a complete tiny inverse construction is fully replayed, fully covered and still makes no lower claim',()=>{
  const source=fixture(),template=structuredClone(source),before=levelSha256(source);
  const report=buildReverseConstructedCandidate(source,runtime,{seed:734157,minimumScrambleDrags:0,maxScrambleDrags:0,maxStates:1000,
    constructionTemplatePacket:{ok:true,level:template,construction:{qualificationFixture:true}}});
  assert(report.ok,JSON.stringify({status:report.status,reason:report.reason,stats:report.construction}));
  assert.equal(report.reverseOperations.filter(op=>op.kind==='insertion').length,4);
  assert.equal(new Set(report.reverseOperations.filter(op=>op.kind==='insertion').map(op=>op.body.id)).size,4);
  const audit=auditCompleteReverseWitness(runtime,report.level,report.drags);assert(audit.valid,JSON.stringify(audit));
  assert.equal(report.provenance.reverseConstruction.lowerBoundClaimed,false);assert.equal(report.formalReady,false);
  assert.equal(report.construction.fullBoardDifficultySearchInvocations,0);assert.equal(report.construction.rawDiscoveredStates,new Set(report.construction.rawWorldSha256s).size);
  assert.equal(report.construction.rawExpandedStates,new Set(report.construction.expandedWorldSha256s).size);
  assert(report.construction.rawExpandedStates<=report.construction.rawDiscoveredStates&&report.construction.rawDiscoveredStates<=1000);
  assert.equal(levelSha256(source),before);assert.equal(levelSha256(template),before);evidence.push({name:'tiny-positive-complete-reverse',report,audit});
});

test('provided inventory cannot replace the source board or inject unqualified mechanisms',()=>{
  for(const mutate of [l=>l.width=3,l=>l.blocks[0].frozen=1,l=>l.blocks[0].timedBombSeconds=10,l=>l.blocks.pop()]){
    const level=fixture();mutate(level);const report=build({constructionTemplatePacket:{ok:true,level,construction:{qualificationFixture:true}}});
    assert.equal(report.ok,false);assert.equal(report.construction.rawDiscoveredStates,0);
  }
});

test.after(async()=>{
  if(!process.env.REVERSE_BUDGET_QUALIFICATION_OUT)return;
  await fs.writeFile(process.env.REVERSE_BUDGET_QUALIFICATION_OUT,JSON.stringify({schemaVersion:1,status:'TINY_REVERSE_CONSTRUCTION_BUDGET_QUALIFIED',tests:6,
    toolchainSha256:runtime.toolchainSha256,actualCandidateSearches:0,proofFrozenUnchanged:true,reverseConstructionIsNotLowerProof:true,evidence,formalReady:false},null,2)+'\n',{flag:'wx'});
});

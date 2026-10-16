import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sharedWorldBudget,repairCargoRoute,makeSmallCargoCandidate} from './generator-small-cargo.mjs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {independentReplay,levelSha256} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {auditMechanismParticipation} from './mechanism-intensity.mjs';

const rt=await loadBoundedRuntime();
const root='deliverables/daily-formal-v3-20261008';
const read=p=>JSON.parse(fs.readFileSync(p));

test('held and committed nodes spend the same pre-increment ceiling',()=>{
 const b=sharedWorldBudget({maxStates:2,maxMicroStates:2,maxMilliseconds:30000});
 b.discover();b.expand();b.discover(true);b.expand(true);
 assert.throws(()=>b.guardDiscover(),/max-states/);
 assert.throws(()=>b.discover(true),/max-states/);
 assert.equal(b.counts.discoveredStates,2);assert.equal(b.counts.microDiscoveredStates,1);
 assert.equal(b.report('test').microStatesAlsoChargedToFullBoardBudget,true);
});

test('state exhaustion guards the native move before generating the next world',()=>{
 const level={id:99991,name:'Synthetic budget guard only',difficulty:'hard',reward:0,width:2,height:2,timeSeconds:180,parMoves:1,
  mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'toy',x:0,y:0,color:'red',shape:[[0,0]]}],
  gates:[{id:'toy-exit',color:'red',side:'right',offset:0,size:1}],generators:[]};
 const baseDrags=[{blockId:'toy',path:[[1,0]],exitSide:'right'}];let calls=0;
 const original=rt.PuzzleModel.prototype.moveBlockStep;
 rt.PuzzleModel.prototype.moveBlockStep=function(...args){calls++;return original.apply(this,args);};
 try{
  const result=repairCargoRoute(rt,{level,baseDrags,difficulty:1},{maxStates:1,maxMilliseconds:30000});
  assert.equal(result.status,'unknown');assert.equal(result.termination,'max-states');
  assert.equal(result.discoveredStates,1);assert.equal(calls,0);
 }finally{rt.PuzzleModel.prototype.moveBlockStep=original;}
});

test('provided three-machine witness clears actual twelve FIFO bodies with midgame participation',()=>{
 const packet=read(`${root}/mechanisms/small-cargo-source149-06/candidate.json`);
 const before=levelSha256(packet.level),canonical=rt.replayRevisedRoute(packet.level,packet.drags);
 const independent=independentReplay(rt,packet.level,packet.drags,{});
 const replay=replayDecorated(rt,packet.level,packet.drags);
 const audit=auditMechanismParticipation(packet.level,packet.drags,replay,'generator',packet.targets);
 assert.equal(canonical.valid,true);assert.equal(canonical.complete,true);
 assert.equal(independent.valid,true);assert.equal(independent.complete,true);assert.equal(independent.nonClearingDrags,27);
 assert.equal(audit.pass,true);assert.equal(audit.capacityPass,true);
 assert.deepEqual(packet.level.generators.map(g=>g.queueBlockIds.length),[4,4,4]);
 assert.equal(replay.finalSnapshot.blocks.length,0);assert.equal(replay.finalSnapshot.queuedBlocks.length,0);
 for(const item of audit.details)assert(item.evidence.baseBodiesRemainingAtCargoClear.every(n=>n>=2));
 assert.equal(levelSha256(packet.level),before);
});

test('read-only vacancy planning selects real native footprints and leaves the base unchanged',()=>{
 const base=read(`${root}/design/bar-gen3-09/candidate-0005.json`),before=levelSha256(base.level);
 const candidate=makeSmallCargoCandidate(rt,base,{variant:25});
 assert.equal(candidate.level.generators.length,2);
 assert(candidate.chosen.every(g=>g.firstVacancy.cleared>=2&&g.firstVacancy.cleared<=base.level.blocks.length-2));
 for(const g of candidate.level.generators)for(const id of g.queueBlockIds){
  const b=candidate.level.blocks.find(b=>b.id===id),match=rt.matchFormalBlockShape(b.shape,'native-only');
  assert(match);assert.equal(match.quarterTurns,0);assert(rt.GAME_ART.gameplay.formalBlocks[b.color].solid[match.shapeId]);
 }
 assert.equal(levelSha256(base.level),before);
});

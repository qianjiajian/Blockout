import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {traceKnownRoute,firstEmptySample,CARGO_SHAPES,loadMountAudit} from './generator-first-footprint-audit.mjs';
const runtime=await loadBoundedRuntime(),mount=await loadMountAudit();

test('SQ2, H2 and V2 all have actual native artwork in eight colors',()=>{
 for(const name of ['SQ2','H2','V2']){
  const m=runtime.matchFormalBlockShape(CARGO_SHAPES[name],'native-only');assert(m);assert.equal(m.quarterTurns,0);
  const entries=Object.entries(runtime.GAME_ART.gameplay.formalBlocks);assert.equal(entries.length,8);
  for(const[,art]of entries){const p=art.solid[m.shapeId];assert(p);assert(fs.statSync(`public/${p}`).size>0);}
 }
});

test('a real SQ2 head waits with an empty center mouth until its fourth cell frees during a held unit step',()=>{
 const level={id:99991,name:'Native SQ2 vacancy qualification only',difficulty:'hard',reward:0,width:6,height:6,timeSeconds:180,parMoves:1,
  mechanismRules:'revised-2026-09-27-v1.5',blocks:[
   {id:'owner',x:1,y:2,color:'red',shape:[[0,0]]},
   {id:'sq2-cargo',x:0,y:1,color:'blue',shape:structuredClone(CARGO_SHAPES.SQ2)},
  ],gates:[{id:'r',color:'red',side:'top',offset:2,size:1},{id:'b',color:'blue',side:'bottom',offset:2,size:2}],
  generators:[{id:'native-machine',side:'left',offset:2,rimSpan:3,rimMount:'rim',spawn:[0,1],queueBlockIds:['sq2-cargo']}]};
 assert.deepEqual(mount.auditGeneratorMounts(level),[]);
 assert.equal(mount.validateGeneratorMouthSpawn(level.generators[0],[0,1],CARGO_SHAPES.SQ2,level).status,'ok');
 const model=new runtime.PuzzleModel(level);model.startCountdown();
 assert.equal(model.snapshot().generators[0].head,0);assert.equal(model.snapshot().queuedBlocks.length,1);
 assert(!model.snapshot().blocks.some(b=>b.shape.some(([x,y])=>b.x+x===0&&b.y+y===2)),'center mouth is already empty');
 model.beginAction();assert(model.moveBlockStep('owner',2,2));
 const after=model.snapshot();assert.equal(after.moves,0,'not yet committed');
 assert.equal(after.generators[0].head,1);assert.equal(after.queuedBlocks.length,0);
 assert.deepEqual(after.blocks.find(b=>b.id==='sq2-cargo').shape,CARGO_SHAPES.SQ2);
});

test('known-route audit reports the first whole-footprint vacancy at its unit step instead of the next commit',()=>{
 const level={id:99992,name:'Read-only trace qualification only',difficulty:'hard',reward:0,width:6,height:6,timeSeconds:180,parMoves:1,
  mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'owner',x:1,y:2,color:'red',shape:[[0,0]]}],
  gates:[{id:'r',color:'red',side:'top',offset:2,size:1}]};
 const drags=[{blockId:'owner',path:[[2,2],[2,1],[2,0]],exitSide:'top'}],before=JSON.stringify(level);
 const result=traceKnownRoute(runtime,level,drags),single=firstEmptySample(result.samples,[[0,2]]),square=firstEmptySample(result.samples,[[0,1],[1,1],[0,2],[1,2]]);
 assert.equal(single.phase,'opening');assert.equal(square.phase,'unit-step');assert.equal(square.unitStep,1);assert.equal(square.drag,1);
 assert.equal(result.fullBoardSearchInvocations,0);assert.equal(result.alternativeActionsExplored,0);assert.equal(JSON.stringify(level),before);
});

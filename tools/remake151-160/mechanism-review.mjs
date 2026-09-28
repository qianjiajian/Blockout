// Isolated constraint probes are diagnostics, not real input or global order proofs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,ruleGate,save,digest} from './common.mjs';
Error.stackTraceLimit=2;
for(const file of process.argv.slice(2)){
 ruleGate();const d=JSON.parse(fs.readFileSync(file)),l=d.level,m=new api.PuzzleModel(l);m.startCountdown();
 const events=[],constraints=[],peels=[],seen=new Set();
 const probe=(model,key,mutate,drag)=>{if(seen.has(key))return;const q=model.clone(),s=q.snapshot();mutate(s);q.restore(s);assert(!q.tryExit(drag.blockId,drag.exitSide).ok,`Constraint probe did not block ${key}`);constraints.push({kind:key,beforeDrag:step+1,blockId:drag.blockId,exitSide:drag.exitSide,isolatedStateOnly:true,provesGlobalOrder:false});seen.add(key);};
 let step=0;
 for(const drag of d.drags){const before=m.snapshot(),body=before.blocks.find(b=>b.id===drag.blockId);m.beginAction();for(const xy of drag.path)assert(m.moveBlockStep(drag.blockId,...xy));
  if(drag.exitSide){const atGate=m.clone();assert(atGate.clone().tryExit(drag.blockId,drag.exitSide).ok);const state=atGate.snapshot(),b=state.blocks.find(b=>b.id===drag.blockId),original=l.blocks.find(b=>b.id===drag.blockId);
   const door=state.flipDoors.find(g=>g.color===b.color&&g.side===drag.exitSide&&!!g.star===!!b.star&&g.frozen===0&&g.open);
   if(door)probe(atGate,'flip:'+door.id,s=>{s.flipDoors.find(g=>g.id===door.id).open=false;},drag);
   const iced=[...l.gates,...l.flipDoors??[]].filter(g=>g.frozen>0&&g.color===b.color&&g.side===drag.exitSide&&!!g.star===!!b.star);
   if(iced.length)probe(atGate,'gate-ice:'+iced[0].id,s=>{for(const g of [...s.gates,...s.flipDoors])if(iced.some(x=>x.id===g.id))g.frozen=1;},drag);
   if(original.frozen)probe(atGate,'block-ice:'+b.id,s=>{s.blocks.find(x=>x.id===b.id).frozen=1;},drag);
   if(original.lockedBy)probe(atGate,'key-lock:'+b.id,s=>{const x=s.blocks.find(x=>x.id===b.id);x.lockCount=1;x.lockedBy=original.lockedBy;},drag);
   assert(m.tryExit(drag.blockId,drag.exitSide).ok);
  }
  assert(m.commitAction());const after=m.snapshot(),left=after.blocks.find(b=>b.id===drag.blockId),clear=after.cleared-before.cleared;
  if(clear&&left){assert.equal(left.layers.length,body.layers.length-1);assert.deepEqual(left.shape,body.shape);assert.equal(left.color,body.layers[1]);peels.push({step:step+1,blockId:body.id,from:body.color,to:left.color,retainedShape:true,remainingLayers:left.layers.length});}
  const reveals=after.shutters.filter(s=>s.revealed&&!before.shutters.find(x=>x.id===s.id)?.revealed).map(s=>({id:s.id,kind:s.skin??'shutter',initialCount:l.shutters.find(x=>x.id===s.id).count}));
  const flips=after.flipDoors.flatMap(g=>{const old=before.flipDoors.find(x=>x.id===g.id);return old.open!==g.open||old.frozen!==g.frozen?[{id:g.id,fromFrozen:old.frozen,toFrozen:g.frozen,fromOpen:old.open,toOpen:g.open}]:[];});
  for(const g of after.flipDoors){const old=before.flipDoors.find(x=>x.id===g.id);assert.equal(g.open,clear&&old.frozen===0?!old.open:old.open);}
  for(const b of after.blocks){const old=before.blocks.find(x=>x.id===b.id);if(old?.shutterId&&!before.shutters.find(s=>s.id===old.shutterId)?.revealed)assert.equal(b.frozen,old.frozen,'Hidden ice cannot lose count on the reveal event');}
  const spawns=before.queuedBlocks.filter(b=>!after.queuedBlocks.some(x=>x.id===b.id)).map(b=>b.id);
  if(clear||reveals.length||spawns.length)events.push({step:step+1,blockId:drag.blockId,clearEvents:clear,totalCleared:after.cleared,reveals,flips,spawns});
  step++;
 }
 assert(m.snapshot().complete&&!m.snapshot().failed);assert.equal(peels.length,l.blocks.reduce((n,b)=>n+(b.layers?.length??1)-1,0));
 const result=save('mechanism-review'+l.id,{passed:true,input:file,levelSha256:digest(l),routeSha256:digest(d.drags),events,peels,constraints,humanBlindTested:false,allSolutionOrderProven:false,allMistakesRecoverableProven:false,scope:'Full original-model witness plus isolated blocking probes. Actual Pointer and clock evidence remain separate.'});console.log(JSON.stringify({id:l.id,result,probes:constraints.length,peels:peels.length}));
}

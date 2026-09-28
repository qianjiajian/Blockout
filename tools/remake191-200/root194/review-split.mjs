import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {ROOT,digest,writeNew,ruleGate} from '../common.mjs';
import {loadApi,replay} from '../replay.mjs';

ruleGate();
const candidate=process.argv[2],d=JSON.parse(fs.readFileSync(candidate)),l=d.level;
assert.equal(l.id,194);assert.equal(l.blocks.length,31);
for(const key of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!l[key]?.length,key);
assert(l.blocks.every(b=>!b.frozen&&!b.keyId&&!b.lockedBy&&!b.star&&!b.timedBombSeconds&&!b.movementAxis));
const cover=l.shutters.find(c=>c.id==='c10');assert.equal(cover.count,10);
const inside=l.blocks.filter(b=>b.shutterId===cover.id),outside=l.blocks.filter(b=>b.shutterId!==cover.id);
assert.equal(inside.length,13);assert.equal(outside.length,18);assert(outside.every(b=>!b.layers?.length));
const events=inside.reduce((s,b)=>s+(b.layers?.length??1),0);assert.equal(events,15);
assert(inside.every(b=>b.shape.every(([x,y])=>b.x+x>=cover.x&&b.x+x<cover.x+cover.width&&b.y+y>=cover.y&&b.y+y<cover.y+cover.height)));
assert.equal(l.generators.length,1);assert.equal(l.generators[0].queueBlockIds.length,1);
const gen=l.generators[0],queue=l.blocks.find(b=>b.id===gen.queueBlockIds[0]);assert(outside.includes(queue));
assert(queue.shape.every(([x,y])=>gen.spawn[0]+x>=cover.x&&gen.spawn[0]+x<cover.x+cover.width&&gen.spawn[1]+y>=cover.y&&gen.spawn[1]+y<cover.y+cover.height));
const projected=structuredClone(l);
projected.mechanismRules='revised-2026-09-23-v1.4';
projected.blocks=structuredClone(inside).map(b=>{delete b.shutterId;return b;});
delete projected.generators;delete projected.shutters;
for(const gate of projected.gates)if(gate.frozen!==undefined){if(gate.frozen>outside.length)gate.frozen-=outside.length;else delete gate.frozen;}
const {api}=await loadApi(),model=new api.PuzzleModel(l);model.startCountdown();
const original=inside.map(b=>{const x=model.getBlock(b.id);return{id:x.id,x:x.x,y:x.y,layers:x.layers};});
let revealAt=null;
for(let step=0;step<=d.drags.length;step++){
 const snap=model.snapshot();
 if(snap.cleared<=10)assert.deepEqual(inside.map(b=>{const x=model.getBlock(b.id);return{id:x.id,x:x.x,y:x.y,layers:x.layers};}),original);
 if(snap.cleared===10&&revealAt===null)revealAt=step;
 if(step===d.drags.length)break;
 const drag=d.drags[step];if(snap.cleared<10)assert(!inside.some(b=>b.id===drag.blockId));
 model.beginAction();for(const xy of drag.path)assert(model.moveBlockStep(drag.blockId,...xy));
 if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
}
assert(revealAt!==null);assert(model.snapshot().complete);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {checkRevisedRepositionFloor} from './src/core/revisedRepositionFloor.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {checkRevisedRepositionFloor}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const floor=Number(process.argv[3]??3),budget={floor,maxStates:18000,maxDragStates:500000,maxTransitions:2000000,maxMilliseconds:10000};
const result=checkRevisedRepositionFloor(projected,budget);
const out=ROOT+'/root194/split-review-'+Date.now()+'.json';
writeNew(out,{status:result.thresholdProven?'TAIL_FLOOR_VERIFIED_PREFIX_SEPARATE':'TAIL_NOT_CERTIFIED',candidate,candidateSha256:digest(fs.readFileSync(candidate)),levelSha256:digest(l),projected,projectionSha256:digest(projected),removedOutsideBodies:outside.map(b=>b.id),precreditedClearEvents:outside.length,tailClearEvents:events,revealAt,budget,result,fullReplay:replay(l,d.drags,api,{complete:true,requirePointerCompatible:true}),argument:'Every c10 body is physically hidden and immovable before clear10, and keeps its initial pose/layer when revealed. Its postreveal actions form a disjoint subset of total drag costs. Remove all18 outside bodies including the entire FIFO and grant all18 clear events before tail play; every gate is at least as thawed as in the actual play and all removed occupancy can only free space. Tail13 bodies, two shell peels, their geometry and whole-board boundaries remain. No hidden ice, flip, key or other counter-dependent effects are present. A proved tail floor adds to a separately proved pre-clear10 prefix floor. Full original route and final dual Pointer remain required.',toolSha256:digest(fs.readFileSync('src/core/revisedRepositionFloor.ts')),formalAdopted:false});
console.log(JSON.stringify({out,status:result.status,states:result.discoveredStates,termination:result.termination,floor}));

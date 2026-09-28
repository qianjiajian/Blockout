import assert from 'node:assert/strict';
// Explicit qualification for the complete observed Lv129 inventory.
export function assertAxisGeneratorDomain(level,api){
 assert.equal(level.id,129);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 assert.equal(level.width,7);assert.equal(level.height,7);
 const expected=Array.from({length:49},(_,i)=>[i%7,Math.floor(i/7)]).filter(([x,y])=>y!==0||(x!==0&&x!==6));
 const sort=a=>a.map(p=>p.join(',')).sort();assert.deepEqual(sort(level.playable),sort(expected));
 assert(!level.blocked?.length);
 assert.deepEqual(level.generators?.map(g=>g.queueBlockIds.length).sort((a,b)=>a-b),[4,5]);
 assert.equal(level.blocks.length,39);
 assert.deepEqual(level.shutters?.map(s=>s.count).sort((a,b)=>a-b),[7,23]);
 assert(level.shutters.every(s=>!s.skin||s.skin==='shutter'));
 assert.deepEqual(level.shutters.map(s=>level.blocks.filter(b=>b.shutterId===s.id).length).sort((a,b)=>a-b),[8,9]);
 assert.equal(level.blocks.filter(b=>b.layers?.length>1).length,4);
 assert.deepEqual(level.blocks.filter(b=>b.frozen).map(b=>b.frozen),[10]);
 assert.deepEqual(level.gates.map(g=>[g.color,g.frozen??0]).sort(),[['blue',0],['cyan',0],['green',0],['pink',0],['purple',0],['red',2],['yellow',4]].sort());
 const queued=new Set(level.generators.flatMap(g=>g.queueBlockIds));assert.equal(queued.size,9);
 assert(level.blocks.filter(b=>queued.has(b.id)).every(b=>!b.layers&&!b.frozen&&!b.shutterId));
 for(const k of ['seams','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Unsupported ${k}`);
 for(const b of level.blocks){for(const k of ['keyId','lockedBy','lockCount','timedBombSeconds','movementAxis'])assert(b[k]===undefined,`Unsupported ${k}`);assert(!b.star&&!b.rotationBadge);}
 for(const g of level.generators){assert(g.trigger===undefined||g.trigger==='move');assert(g.intervalSeconds===undefined&&g.initialDelaySeconds===undefined);}
 api.validateLevel(level);
}

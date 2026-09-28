import assert from 'node:assert/strict';
// Same structural qualification as the v146 full-inventory graph, explicitly
// extended to Lv127 instead of disguising its identity as a Lv50–59 level.
export function assertAxisGeneratorDomain(level,api){
 assert.equal(level.id,127);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 assert.equal(level.generators?.length,1);
 assert.equal(level.width,7);assert.equal(level.height,9);
 assert.equal(level.generators[0].queueBlockIds.length,1,'One known green V3 cargo required');
 const cargo=level.blocks.find(b=>b.id===level.generators[0].queueBlockIds[0]);
 assert(cargo&&cargo.color==='green'&&!cargo.layers&&!cargo.frozen&&!cargo.shutterId);
 assert.deepEqual(cargo.shape,[[0,0],[0,1],[0,2]]);
 assert.deepEqual(level.shutters.map(s=>s.count).sort((a,b)=>a-b),[12,14]);
 assert(level.shutters.every(s=>!s.skin||s.skin==='shutter'));
 assert.equal(level.blocks.filter(b=>b.layers?.length>1).length,3,'Full video reveals two additional shells');
 for(const k of ['seams','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Unsupported ${k}`);
 for(const b of level.blocks){for(const k of ['keyId','lockedBy','lockCount','timedBombSeconds','movementAxis'])assert(b[k]===undefined,`Unsupported ${k}`);assert(!b.star&&!b.rotationBadge);}
 for(const g of level.generators){assert(g.trigger===undefined||g.trigger==='move');assert(g.intervalSeconds===undefined&&g.initialDelaySeconds===undefined);}
 api.validateLevel(level);
}

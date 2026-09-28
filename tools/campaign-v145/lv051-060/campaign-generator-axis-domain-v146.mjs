// Batch-owned qualifier: no production runtime changes.
import assert from 'node:assert/strict';
import {compileLevel} from './campaign-axis-key-graph-v146.mjs';
export function assertAxisGeneratorDomain(level,api){
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 assert(Number.isInteger(level.id)&&level.id>=50&&level.id<=59,'Qualified axis/generator batch 50–59');
 assert(level.generators?.length,'Real fixed generator required');
 for(const k of ['seams','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Unsupported ${k}`);
 for(const b of level.blocks){for(const k of ['keyId','lockedBy','lockCount','timedBombSeconds'])assert(b[k]===undefined,`Unsupported ${k}`);assert(!b.star&&!b.rotationBadge);}
 for(const g of level.generators){assert(g.trigger===undefined||g.trigger==='move');assert(g.intervalSeconds===undefined&&g.initialDelaySeconds===undefined);}
 api.validateLevel(level);
}
export function compileAxisOpening(level){
 for(const b of level.blocks)for(const k of ['keyId','lockedBy','lockCount'])assert(b[k]===undefined,`Unsupported ${k}`);
 const c=compileLevel(level);
 return {...c,blocks:c.blocks.map(b=>({...b,reveal:b.revealAt})),initial:Uint16Array.from(c.initial),total:c.totalClears};
}

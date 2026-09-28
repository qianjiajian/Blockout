import assert from 'node:assert/strict';

// Qualification is based on actual semantics; IDs are never rewritten to bypass
// the historical Lv35–40 check. The old verifier and certificates stay intact.
export function assertGeneratorDomain(level,api){
 assert.equal(level?.mechanismRules,'revised-2026-09-23-v1.4');
 assert(Number.isInteger(level.id)&&level.id>=81&&level.id<=90,'Only this reviewed batch');
 assert(api?.PuzzleModel&&api?.validateLevel,'Authoritative API required');
 assert(level.generators?.length>0,'A real fixed-space generator is required');
 for(const key of ['seams','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[key]?.length,`Unsupported ${key}`);
 for(const block of level.blocks){
  for(const key of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'])assert(block[key]===undefined,`Unsupported ${key}; use explicit restriction projection`);
  assert(!block.star&&!block.rotationBadge);
 }
 for(const gate of level.gates)assert(gate.portals===undefined&&!gate.star,'Only unique outer-rail ordinary/ice gates');
 for(const cover of level.shutters??[])assert((cover.skin===undefined||cover.skin==='shutter')&&cover.triggerBlockIds===undefined,'Only real countdown covers');
 for(const machine of level.generators){
  assert(machine.trigger===undefined||machine.trigger==='move');
  assert(machine.intervalSeconds===undefined&&machine.initialDelaySeconds===undefined,'No clock dispatch');
 }
 api.validateLevel(level);
}

import { createHash } from 'node:crypto';
import { projectStaticConstraints } from './constraint-projection.mjs';

export const INVENTORY_PROJECTION_METHOD = 'opening-outer-bodies-inventory-erasure-v1';
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const BLOCK_FIELDS = new Set(['id','x','y','shape','color','layers','frozen','movementAxis','keyId','lockedBy','lockCount','star','timedBombSeconds','shutterId']);
const SHUTTER_FIELDS = new Set(['id','x','y','width','height','count','skin','triggerBlockIds']);
const GENERATOR_FIELDS = new Set(['id','side','offset','rimSpan','rimMount','rimAnchor','spawn','queueBlockIds','trigger','intervalSeconds','initialDelaySeconds']);

/**
 * LOWER-BOUND ONLY. Map each initial non-hidden/non-queued body to a single
 * body with its initial outer colour. Its FIRST clear (peel or removal) removes
 * the mapped body. Discard hidden/queued bodies entirely, all facilities, and
 * every movement/exit restriction handled by static constraint erasure.
 *
 * Simulation relation: each mapped body still present has the same location
 * and outer colour as its real counterpart before that counterpart's first
 * clear. Everything else in the real world is an extra obstacle/restriction.
 * A real gesture on a retained body maps to the same held unit-step path;
 * its first clear maps to a cost-zero removal. Gestures on discarded cargo or
 * already-peeled bodies map to no action. Hence mapped nonclear cost never
 * exceeds actual cost. Reveals/dispatch/clock/animation events either add extra
 * obstacles or relax restrictions, never move a retained body. A complete real
 * solution removes every retained body's first layer, so the projection also
 * completes. This establishes L(real) >= L(projection), NOT an upper bound.
 *
 * No legacy moving scenery, synthetic topology, rescue overrides, or unknown
 * semantics are admitted. Source validation is mandatory before projection.
 */
export function projectOpeningOuterBodies(level, runtime) {
  if (!runtime?.validateLevel) throw new Error('Inventory projection requires authoritative validation');
  runtime.validateLevel(level);
  const fail = reason => { throw new Error(`Inventory projection unsupported: ${reason}`); };
  if (level.elevators?.length || level.conveyors?.length || level.seams?.length) fail('moving scenery or synthetic topology');
  for (const block of level.blocks) for (const field of Object.keys(block)) if (!BLOCK_FIELDS.has(field)) fail(`unknown block field ${field}`);
  for (const cover of level.shutters ?? []) {
    for (const field of Object.keys(cover)) if (!SHUTTER_FIELDS.has(field)) fail(`unknown shutter field ${field}`);
    if (![undefined,'shutter','lift'].includes(cover.skin)) fail('legacy staging cover');
  }
  for (const generator of level.generators ?? []) {
    for (const field of Object.keys(generator)) if (!GENERATOR_FIELDS.has(field)) fail(`unknown generator field ${field}`);
    if (![undefined,'move','time'].includes(generator.trigger)) fail('unknown generator trigger');
  }
  const originalHash = hash(level), intermediate = structuredClone(level);
  const queuedIds = new Set((level.generators ?? []).flatMap(generator => generator.queueBlockIds));
  const retained = level.blocks.filter(block => !block.shutterId && !queuedIds.has(block.id));
  const retainedIds = new Set(retained.map(block => block.id));
  const dropped = level.blocks.filter(block => !retainedIds.has(block.id)).map(block => block.id);
  intermediate.blocks = retained.map(block => {
    const out = structuredClone(block);
    out.color = block.layers?.[0] ?? block.color;
    delete out.layers;
    delete out.shutterId;
    return out;
  });
  delete intermediate.shutters;
  delete intermediate.generators;
  const erased = projectStaticConstraints(intermediate);
  runtime.validateLevel(erased.projectedLevel);
  if (hash(level) !== originalHash) throw new Error('Inventory projection mutated input');
  return { method: INVENTORY_PROJECTION_METHOD, sourceLevelSha256: originalHash,
    projectedLevelSha256: erased.projectedLevelSha256, projectedLevel: erased.projectedLevel,
    retainedOuterBodies: retained.map(block => ({ id: block.id, color: block.layers?.[0] ?? block.color,
      initialLayers: block.layers?.length ?? 1 })), droppedBodyIds: dropped,
    erasedFacilities: { shutters: (level.shutters ?? []).map(x => x.id), generators: (level.generators ?? []).map(x => x.id) },
    erasedConstraints: erased.erased, upperBoundTransfer: false };
}

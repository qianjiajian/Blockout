import { createHash } from 'node:crypto';

export const CONSTRAINT_PROJECTION_METHOD = 'static-bodies-constraint-erasure-v1';
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const BLOCK_FIELDS = new Set(['id','x','y','shape','color','layers','frozen','movementAxis','keyId','lockedBy','lockCount','star','timedBombSeconds']);
const GATE_FIELDS = new Set(['id','side','offset','size','color','portals','frozen','star']);
const LEVEL_FIELDS = new Set(['id','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget',
  'mechanismRules','width','height','playable','blocked','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy',
  'designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation',
  'seams','shutters','generators','elevators','conveyors']);

/**
 * LOWER-BOUND ONLY. This projection preserves every body, its initial cells,
 * colour, and every physical aperture in fixed-then-flip resolution order.
 * It only removes predicates that can refuse movement/removal or end a run:
 * ice, locks, axes, stars, coloured cells, closed doors and bomb deadlines.
 * For any legal original held-block gesture, the same sequence is legal in
 * the optional-exit projection. Clear gestures still remove the same single
 * body, while nonclear gestures still cost one. Time/animation waits erase.
 * Consequently each original solution maps to a projected solution of no
 * greater nonclear cost. A fresh projected lower bound is therefore valid
 * for the original; a projected solution is NEVER an original upper bound.
 *
 * Layers, hidden cargo, dispensing, moving scenery and unknown fields are
 * rejected because removal/visibility can then change the transition graph.
 */
export function projectStaticConstraints(level) {
  const fail = reason => { throw new Error(`Projection unsupported: ${reason}`); };
  if (!level || typeof level !== 'object') fail('missing level');
  if (!['revised-2026-09-23-v1.4','revised-2026-09-27-v1.5'].includes(level.mechanismRules)) fail('unqualified profile');
  for (const field of Object.keys(level)) if (!LEVEL_FIELDS.has(field)) fail(`unknown or special level field ${field}`);
  for (const field of ['seams','shutters','generators','elevators','conveyors']) if (level[field]?.length) fail(`dynamic inventory/topology ${field}`);
  for (const block of level.blocks) {
    for (const field of Object.keys(block)) if (!BLOCK_FIELDS.has(field)) fail(`block field ${field}`);
    if (block.layers && (block.layers.length !== 1 || block.layers[0] !== block.color)) fail('shell/colour stages');
  }
  for (const [kind, list] of [['gate', level.gates], ['flip', level.flipDoors ?? []]]) for (const gate of list) {
    for (const field of Object.keys(gate)) if (!GATE_FIELDS.has(field) && !(kind === 'flip' && field === 'initiallyOpen')) fail(`gate field ${field}`);
  }
  for (const grid of level.coloredGrids ?? []) for (const field of Object.keys(grid)) {
    if (!['id','color','cells'].includes(field)) fail(`grid field ${field}`);
  }
  const before = hash(level), projected = structuredClone(level);
  const erased = [];
  projected.blocks = level.blocks.map(block => {
    for (const field of ['frozen','movementAxis','keyId','lockedBy','lockCount','star','timedBombSeconds']) {
      if (block[field] !== undefined) erased.push({ owner: block.id, field, value: block[field] });
    }
    return { id: block.id, x: block.x, y: block.y, shape: structuredClone(block.shape), color: block.color };
  });
  projected.gates = [...level.gates, ...(level.flipDoors ?? [])].map(gate => {
    for (const field of ['frozen','star','initiallyOpen']) if (gate[field] !== undefined) erased.push({ owner: gate.id, field, value: gate[field] });
    return { id: gate.id, side: gate.side, offset: gate.offset, size: gate.size, color: gate.color,
      ...(gate.portals ? { portals: structuredClone(gate.portals) } : {}) };
  });
  for (const field of ['flipDoors','coloredGrids','bombFailurePolicy']) {
    if (projected[field] !== undefined) erased.push({ owner: 'level', field });
    delete projected[field];
  }
  if (hash(level) !== before) throw new Error('Projection mutated its input');
  return { method: CONSTRAINT_PROJECTION_METHOD, sourceLevelSha256: before,
    projectedLevelSha256: hash(projected), projectedLevel: projected, erased,
    preservesBodies: true, preservesGateResolutionOrder: true, upperBoundTransfer: false };
}

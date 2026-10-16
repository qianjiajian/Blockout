// Literal-coordinate inspection only. No model, replay, solver, history or I/O.
// Restricted to a full rectangular mask, ordinary outer gates and shell layers.
// It is a static precheck, never an authoritative gameplay or L/U certificate.
import assert from 'node:assert/strict';

export const VERSION = 'finite-ordinary-shell-coordinates-pointer-down-v198-v2';
const key = ([x, y]) => `${x},${y}`;
const cells = b => b.shape.map(([dx, dy]) => [b.x + dx, b.y + dy]);
const sides = ['top', 'right', 'bottom', 'left'];
const vectors = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };

export function assertFiniteShellCoordinateDomainV198(level) {
  assert(Number.isInteger(level.width) && level.width > 0 && Number.isInteger(level.height) && level.height > 0);
  const playable = new Set(level.playable.map(key));
  assert.equal(playable.size, level.width * level.height, 'Full rectangular mask required');
  assert.equal(level.playable.length, playable.size);
  for (let y = 0; y < level.height; y++) for (let x = 0; x < level.width; x++) assert(playable.has(key([x, y])));
  for (const field of ['blocked', 'flipDoors', 'coloredGrids', 'shutters', 'generators', 'elevators', 'conveyors', 'seams', 'queuedBlocks']) {
    assert(!level[field] || Array.isArray(level[field]) && level[field].length === 0, 'Unsupported mechanism: ' + field);
  }
  assert(Array.isArray(level.gates) && level.gates.length > 0);
  assert.equal(new Set(level.gates.map(g => g.color)).size, level.gates.length, 'One ordinary outer gate per colour required');
  for (const g of level.gates) {
    assert.deepEqual(Object.keys(g).sort(), ['color', 'id', 'offset', 'side', 'size']);
    assert(sides.includes(g.side) && Number.isInteger(g.offset) && g.offset >= 0 && Number.isInteger(g.size) && g.size > 0);
    assert(g.offset + g.size <= (['top', 'bottom'].includes(g.side) ? level.width : level.height));
  }
  assert(Array.isArray(level.blocks) && level.blocks.length > 0);
  assert.equal(new Set(level.blocks.map(b => b.id)).size, level.blocks.length);
  for (const b of level.blocks) {
    assert(Object.keys(b).every(k => ['id', 'x', 'y', 'shape', 'color', 'layers'].includes(k)), 'Only ordinary/shell block fields supported');
    assert(Number.isInteger(b.x) && Number.isInteger(b.y) && b.shape.length > 0);
    assert(b.shape.every(p => p.length === 2 && p.every(Number.isInteger)));
    assert.equal(new Set(b.shape.map(key)).size, b.shape.length);
    assert.equal(Math.min(...b.shape.map(p => p[0])), 0); assert.equal(Math.min(...b.shape.map(p => p[1])), 0);
    assert(!b.layers || b.layers.length > 0 && b.layers[0] === b.color);
  }
}

function gateContacts(level, block, blocks) {
  const footprint = cells(block), color = block.layers?.[0] ?? block.color;
  return level.gates.filter(g => {
    const tangent = footprint.map(p => ['top', 'bottom'].includes(g.side) ? p[0] : p[1]);
    if (color !== g.color || Math.min(...tangent) < g.offset || Math.max(...tangent) >= g.offset + g.size) return false;
    return g.side === 'top' ? Math.min(...footprint.map(p => p[1])) === 0
      : g.side === 'bottom' ? Math.max(...footprint.map(p => p[1])) === level.height - 1
        : g.side === 'left' ? Math.min(...footprint.map(p => p[0])) === 0 : Math.max(...footprint.map(p => p[0])) === level.width - 1;
  }).map(g => {
    const [dx, dy] = vectors[g.side], ray = new Map(), blockers = [];
    for (const [cx, cy] of footprint) for (let x = cx + dx, y = cy + dy; x >= 0 && x < level.width && y >= 0 && y < level.height; x += dx, y += dy) {
      ray.set(key([x, y]), [x, y]);
      for (const other of blocks) if (other.id !== block.id && cells(other).some(p => p[0] === x && p[1] === y)) blockers.push({ cell: [x, y], blockId: other.id });
    }
    return { gateId: g.id, side: g.side, color, anchor: [block.x, block.y], footprint, fullInBoardRay: [...ray.values()], blockers, available: blockers.length === 0 };
  });
}

// Also usable on a saved coordinate table. This function never moves a body.
export function inspectFiniteShellPointerDownV198(level, blocks, drag) {
  assertFiniteShellCoordinateDomainV198(level);
  assert(Array.isArray(drag.path));
  const block = blocks.find(b => b.id === drag.blockId); assert(block, 'Missing dragged body');
  const contacts = gateContacts(level, block, blocks), available = contacts.filter(c => c.available);
  const errors = available.length && (drag.path.length !== 0 || available.length !== 1 || drag.exitSide !== available[0].side)
    ? [{ kind: 'pointer-down-auto-exit-must-end-drag', blockId: block.id, anchor: [block.x, block.y], availableGateIds: available.map(c => c.gateId), availableSides: available.map(c => c.side), declaredPathLength: drag.path.length, declaredExitSide: drag.exitSide ?? null }]
    : [];
  return { anchor: [block.x, block.y], contacts, availableGateIds: available.map(c => c.gateId), errors };
}

export function inspectFiniteShellCoordinatesV198(level, drags) {
  assertFiniteShellCoordinateDomainV198(level); assert(Array.isArray(drags));
  const blocks = level.blocks.map(b => ({ ...structuredClone(b), layers: [...(b.layers ?? [b.color])] }));
  const errors = [], rows = [], tables = [], startChecks = [], exitSweeps = [];
  const issue = (kind, detail) => errors.push({ kind, ...detail });
  const playable = new Set(level.playable.map(key)), occupied = new Map();
  const overlaps = (b, p) => blocks.filter(o => o.id !== b.id && cells(o).some(c => key(c) === key(p))).map(o => o.id);
  for (const b of blocks) for (const p of cells(b)) {
    if (!playable.has(key(p))) issue('initial-outside', { blockId: b.id, cell: p });
    if (occupied.has(key(p))) issue('initial-overlap', { blockId: b.id, cell: p, other: occupied.get(key(p)) });
    occupied.set(key(p), b.id);
  }
  const missing = [...playable].filter(k => !occupied.has(k)); if (missing.length) issue('initial-missing', { missing });
  for (const b of blocks) for (const [x, y] of cells(b)) for (const [dx, dy] of [[1, 0], [0, 1]]) for (const o of blocks) {
    if (o.id !== b.id && o.layers[0] === b.layers[0] && cells(o).some(p => p[0] === x + dx && p[1] === y + dy)) issue('initial-adjacent-same-color', { blockId: b.id, other: o.id, edge: [[x, y], [x + dx, y + dy]] });
  }
  let anchors = 0, declaredClears = 0, declaredPeels = 0;
  for (const [i, drag] of drags.entries()) {
    const step = i + 1, b = blocks.find(b => b.id === drag.blockId);
    if (!b) { issue('missing-declared-body', { step, blockId: drag.blockId }); break; }
    const start = inspectFiniteShellPointerDownV198(level, blocks, drag);
    startChecks.push({ step, blockId: b.id, ...start });
    if (start.errors.length) { errors.push(...start.errors.map(e => ({ step, ...e }))); break; }
    const layersBefore = [...b.layers], startAnchor = [b.x, b.y], checkedAnchors = [];
    for (const [j, point] of drag.path.entries()) {
      assert(point.length === 2 && point.every(Number.isInteger));
      if (Math.abs(point[0] - b.x) + Math.abs(point[1] - b.y) !== 1) issue('non-unit-orthogonal', { step, pathIndex: j, from: [b.x, b.y], to: point });
      [b.x, b.y] = point; anchors++;
      for (const p of cells(b)) {
        if (!playable.has(key(p))) issue('unplayable-anchor', { step, pathIndex: j, cell: p });
        const blockers = overlaps(b, p); if (blockers.length) issue('anchor-overlap', { step, pathIndex: j, cell: p, blockers });
      }
      const contacts = gateContacts(level, b, blocks).filter(c => c.available);
      if (contacts.length && !(j === drag.path.length - 1 && contacts.length === 1 && contacts[0].side === drag.exitSide)) issue('earlier-matching-gate-contact', { step, pathIndex: j, anchor: point, gates: contacts.map(c => c.gateId) });
      checkedAnchors.push({ anchor: point, footprint: cells(b), matchingGateIds: contacts.map(c => c.gateId) });
    }
    let declaredExit = null;
    if (drag.exitSide) {
      const contacts = gateContacts(level, b, blocks).filter(c => c.side === drag.exitSide);
      if (contacts.length !== 1) issue('declared-exit-not-full-span-contact', { step, side: drag.exitSide });
      const c = contacts[0]; if (c?.blockers.length) issue('blocked-outward-ray', { step, blocked: c.blockers });
      declaredExit = { step, blockId: b.id, side: drag.exitSide, gateId: c?.gateId ?? null, color: b.layers[0], shellPeel: b.layers.length > 1, ...(c ?? {}) };
      exitSweeps.push(declaredExit); declaredClears++;
      if (b.layers.length > 1) { declaredPeels++; b.layers.shift(); b.color = b.layers[0]; } else blocks.splice(blocks.indexOf(b), 1);
    }
    rows.push({ step, blockId: drag.blockId, start: startAnchor, layersBefore, checkedAnchors, declaredExit, layersAfter: blocks.includes(b) ? [...b.layers] : [] });
    tables.push({ step, declaredCoordinateTableAfterEvent: blocks.map(b => ({ id: b.id, x: b.x, y: b.y, shape: structuredClone(b.shape), layers: [...b.layers] })) });
  }
  if (blocks.length) issue('declared-inventory-not-empty', { remaining: blocks.map(b => b.id) });
  return { version: VERSION, status: errors.length ? 'INDEPENDENT_ROUTE_STATIC_CONTRADICTION' : 'INDEPENDENT_ROUTE_STATIC_CHECK_NO_KNOWN_CONTRADICTION', rows, tables, startChecks, exitSweeps, errors,
    checks: { authoredDragsInspected: rows.length, pointerDownStartsInspected: startChecks.length, intermediateAnchorsInspected: anchors, declaredExitsInspected: declaredClears, declaredShellPeelsInspected: declaredPeels, declaredInventoryRemaining: blocks.length, plannedNonClearingGestures: drags.length - declaredClears, noPointerDownAutoExitBypassed: !errors.some(e => e.kind === 'pointer-down-auto-exit-must-end-drag') },
    scope: 'Fixed full rectangle, explicit unit anchors, ordinary single outer gates and shell layers only; no timers/ice/queues/portals/axes/star/other mechanisms.',
    limits: ['Static declared-coordinate inspection; no engine import or authoritative legality replay.', 'No L/U, difficulty or formal acceptance is certified.'], mathematicsRun: false, runtimeRouteValidated: false, accepted: false, formalReady: false };
}

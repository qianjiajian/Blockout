import assert from 'node:assert/strict';
import { compileSpatial, NONE } from '../continuation211-optional-lift-domain.mjs';
import { unionPaths } from './author240-alt-blocker-bound.mjs';
import { solveParkingClosure } from './author232-prefix-closure-core.mjs';
import { digest } from './common.mjs';

// General graph builder also supports a plain <=31-body board. Runtime pose
// legality/axis/portal geometry come from compileSpatial, before ice filtering.
export function initialFootprintGraphs(c, opening, permanent = new Set()) {
  assert(opening.length >= 1 && opening.length <= 31);
  const owner = new Map();
  opening.forEach((b, i) => b.shape.forEach(([dx, dy]) => {
    const key = [b.x + dx, b.y + dy].join(',');
    assert(!owner.has(key), 'Opening footprints must be disjoint');
    assert(!permanent.has(key), 'Opening bodies cannot overlap a permanent curtain');
    owner.set(key, i);
  }));
  return opening.map((target, index) => {
    const b = c.blocks.find(block => block.id === target.id);
    const gates = c.level.gates.filter(gate => gate.color === b.color);
    assert.equal(gates.length, 1, 'This wrapper requires one gate per color');
    const gateCount = gates[0].frozen ?? 0;
    const cells = b.poses.map((pose, i) => pose ? b.shape.map(([x, y]) => [i % c.W + x, Math.floor(i / c.W) + y].join(',')) : []);
    const allowed = b.poses.map((pose, i) => !!pose && !cells[i].some(cell => permanent.has(cell)));
    assert(allowed[b.initial]);
    const neighbors = b.poses.map((pose, i) => allowed[i] ? pose.neighbors.filter(j => allowed[j]) : []);
    const occupied = cells.map((ks, i) => allowed[i] ? ks.reduce((mask, cell) => {
      const other = owner.get(cell);
      return other === undefined || other === index ? mask : mask | (1 << other);
    }, 0) : 0);
    const goals = b.poses.flatMap((pose, i) => allowed[i] && pose.exits[0].some(exit => exit.gate.id === gates[0].id) ? [i] : []);
    return { id: b.id, color: b.color, shape: b.shape, gateCount, graph: { neighbors, occupied, start: b.initial, goals } };
  });
}

export function buildPrefixGraphs232(level, api) {
  assert.equal(level.id, 232);
  assert.equal(level.blocks.length, 42);
  for (const key of ['generators', 'flipDoors', 'elevators', 'coloredGrids', 'conveyors', 'seams']) assert(!level[key]?.length, `Unsupported ${key}`);
  assert(level.blocks.every(b => Object.keys(b).every(key => ['id', 'shape', 'color', 'x', 'y', 'shutterId', 'movementAxis'].includes(key))), 'Only plain opening/hidden bodies (optional static axis) are supported');
  assert(level.gates.every(g => !g.star));
  assert.equal(new Set(level.gates.map(g => g.color)).size, level.gates.length);
  const c = compileSpatial(level, api);
  const curtains = c.covers.filter(cover => cover.skin !== 'lift');
  const lifts = c.covers.filter(cover => cover.skin === 'lift');
  assert.equal(c.covers.length, 4);
  assert.equal(curtains.length, 2);
  assert.equal(lifts.length, 2);
  const sameRegion = (a, b) => ['x', 'y', 'width', 'height'].every(key => a[key] === b[key]);
  const permanent = new Set();
  for (const cover of curtains) {
    assert.equal(cover.count, 11);
    assert.equal(lifts.filter(lift => sameRegion(cover, lift)).length, 1);
    for (let y = cover.y; y < cover.y + cover.height; y++) for (let x = cover.x; x < cover.x + cover.width; x++) permanent.add([x, y].join(','));
  }
  assert.equal(permanent.size, 24, 'Two distinct 12-cell curtain regions required');
  for (const cover of c.covers) {
    assert.equal(c.initial[cover.stateIndex], NONE);
    assert.equal(cover.members.length, 4);
    assert.equal(cover.width * cover.height, 12);
    const covered = cover.members.flatMap(i => {
      const b = c.blocks[i];
      assert.equal(b.ice, 0);
      return b.shape.map(([x, y]) => [b.x + x, b.y + y].join(','));
    });
    assert.equal(covered.length, 12);
    assert.equal(new Set(covered).size, 12);
    assert(covered.every(key => permanent.has(key)));
  }
  const opening = level.blocks.filter(b => !b.shutterId);
  assert.equal(opening.length, 26);
  const graphs = initialFootprintGraphs(c, opening, permanent);
  return {
    graphs, fullInventoryBodies: 42, openingBodies: 26, hiddenBodies: 16,
    openingIds: opening.map(b => b.id), permanentCells: [...permanent],
    permanentCurtainIds: curtains.map(cover => cover.id),
    liftPairing: curtains.map(cover => ({ curtain: cover.id, lift: lifts.find(lift => sameRegion(cover, lift)).id })),
  };
}

export const PREFIX_CLOSURE_PROOF = 'Let P be the set of distinct opening bodies that have undergone at least one nonclearing drag before clear11. Its cardinality never exceeds actual nonclearing drags. Concatenate every body\'s actual unit-motion trajectory from its initial footprint through all its parking gestures to its final exit. Any other initial footprint crossed belongs to an identity that parked or cleared before this exit. Removing all P initial footprints from the outset and ignoring every moved-body new footprint is therefore a relaxation. Each parked body must still satisfy an entire initial-to-exit path; parking never grants a free clear. A gate is eligible only once its frozen count is at most the number already cleared. Greedy clear closure is monotone: clears only remove obstructions and open gates. At a stalled closure, the next possible clear under any completion parking set uses an eligible path whose missing blocker identities lie in that completion set. Branching on all such missing sets, keeping subset-minimal additions, thus retains a subset of every feasible completion. Cardinality buckets and memoization by P exactly search this relaxation below the stated threshold. The same-region lift is blocked by its solid unrevealed curtain until clear11; the 11th clearing gesture takes place while both curtain11 regions remain solid. Consequently all24 curtain cells are permanent for this prefix, and hidden16 cannot contribute earlier clears. All42 bodies, both ordinary curtains and both lift cohorts remain in the source and input binding. This is a necessary-prefix lower bound only; full actual solvability and route upper bounds remain separate.';

export function prefixBound232(level, api, {
  maxLabels = 100000, maxMilliseconds = 1200,
  maxStates = 100000, searchMilliseconds = 5000, threshold = 11,
} = {}) {
  const prepared = buildPrefixGraphs232(level, api);
  const base = {
    sourceLevelSha256: digest(level), mathematicalInputSha256: digest({ fullInventory: level.blocks, allCovers: level.shutters, allGates: level.gates, ...prepared }),
    ...Object.fromEntries(Object.entries(prepared).filter(([key]) => key !== 'graphs')),
    necessaryClearPrefix: 11, proof: PREFIX_CLOSURE_PROOF,
  };
  const rows = [];
  for (const item of prepared.graphs) {
    const path = unionPaths(item.graph, { maxLabels, maxMilliseconds });
    rows.push({ id: item.id, gateCount: item.gateCount, graphSha256: digest(item.graph), ...path });
    if (path.status !== 'complete') return { ...base, status: 'unknown', thresholdProven: false, provenLowerBound: null, rows, reason: 'path-antichain-' + path.reason };
    // Empty path lists are retained. Isolated initial bodies may be parked as
    // blockers, but cannot supply a clear in this permanent-curtain prefix.
  }
  const problem = { bodies: rows.map(({ id, gateCount, masks }) => ({ id, gateCount, masks })), goalClears: 11 };
  const search = solveParkingClosure(problem, { threshold, maxStates, maxMilliseconds: searchMilliseconds });
  return { ...base, ...search, closureProblemSha256: digest(problem), rows, search };
}

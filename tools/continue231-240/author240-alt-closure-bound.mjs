import assert from 'node:assert/strict';
import { compileSpatial } from '../continuation211-optional-lift-domain.mjs';
import { initialFootprintGraphs } from './author232-prefix-closure-bound.mjs';
import { solveParkingClosure } from './author232-prefix-closure-core.mjs';
import { goalUnionPaths } from './author240-alt-goal-paths.mjs';
import { digest } from './common.mjs';

export function buildClosureGraphs240(level, api) {
  assert.equal(level.id, 240);
  assert.equal(level.width, 7);
  assert.equal(level.height, 9);
  assert.equal(level.playable.length, 50);
  assert.equal(level.blocks.length, 31);
  for (const key of ['shutters', 'generators', 'flipDoors', 'elevators', 'coloredGrids', 'conveyors', 'seams']) assert(!level[key]?.length, `Unsupported ${key}`);
  assert(level.blocks.every(b => Object.keys(b).every(key => ['id', 'shape', 'color', 'x', 'y', 'movementAxis'].includes(key))), 'Only plain bodies with optional static axis supported');
  assert(level.gates.every(g => !g.star));
  const ordinary = level.gates.filter(g => !g.frozen);
  assert.equal(ordinary.length, 1);
  assert.equal(ordinary[0].color, 'purple');
  assert.deepEqual(level.gates.filter(g => g.frozen).map(g => g.frozen).sort((a, b) => a - b), [4, 6, 9, 12, 14, 18, 20]);
  assert.equal(level.gates.find(g => g.frozen === 4).color, 'blue');
  const c = compileSpatial(level, api);
  return initialFootprintGraphs(c, level.blocks);
}

export function prefixBound240(level, api, {
  maxLabels = 100000, maxMilliseconds = 1200,
  maxStates = 100000, searchMilliseconds = 5000,
  threshold = 21, goalClears = 31,
} = {}) {
  const graphs = buildClosureGraphs240(level, api);
  const base = {
    sourceLevelSha256: digest(level),
    mathematicalInputSha256: digest({ fullInventory: level.blocks, allGates: level.gates, graphs, goalClears }),
    fullInventoryBodies: 31, openingBodies: 31, hiddenBodies: 0,
    openingIds: level.blocks.map(b => b.id), necessaryClearPrefix: goalClears,
    proof: 'Every actual solution projects to the set P of initial bodies which park at least once, costing at most its nonclearing drag count. Each body still requires a full initial-to-exit path whose other initial identities are all parked or cleared earlier; its own bit is excluded. Moved-body new occupancy is ignored and all P initial footprints are removed from the outset, both relaxations. Gate ice opens only at its original clear threshold. Clear closure is monotone because there are no shells, hidden cohorts, queues, keys, flip gates, colored floors or other clear/reveal effects. At a stalled closure the next feasible clear uses an eligible path whose missing bits lie inside any completing P; branching on subset-minimal missing sets retains a subset of that completion. Cardinality-ordered search therefore exactly excludes every parking set below the claimed threshold. Goal-aware path pruning is valid because any completed goal mask which is a subset of a partial mask also dominates every possible continuation of that partial trajectory. All31 source bodies and all seven frozen counts remain in the mathematical input, with purple ordinary and blue4 retained. This lower bound requires a separately checked full actual route upper bound.',
  };
  const rows = [];
  for (const item of graphs) {
    const path = goalUnionPaths(item.graph, { maxLabels, maxMilliseconds });
    rows.push({ id: item.id, gateCount: item.gateCount, graphSha256: digest(item.graph), ...path });
    if (path.status !== 'complete') return { ...base, status: 'unknown', thresholdProven: false, provenLowerBound: null, rows, reason: 'path-antichain-' + path.reason };
  }
  const problem = { bodies: rows.map(({ id, gateCount, masks }) => ({ id, gateCount, masks })), goalClears };
  const search = solveParkingClosure(problem, { threshold, maxStates, maxMilliseconds: searchMilliseconds });
  return { ...base, ...search, closureProblemSha256: digest(problem), rows, search };
}
export { prefixBound240 as blockerBound240 };

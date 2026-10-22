import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { solveParkingClosure, parkingClosure } from './author232-prefix-closure-core.mjs';
import { buildPrefixGraphs232 } from './author232-prefix-closure-bound.mjs';
import { unionPaths } from './author240-alt-blocker-bound.mjs';
import { ROOT, ruleGate, writeNew, loadApi, digest } from './common.mjs';
ruleGate();

const member = (mask, i) => Math.floor(mask / 2 ** i) % 2 === 1;
const ids = (mask, n) => Array.from({ length: n }, (_, i) => i).filter(i => member(mask, i));

// Independent all-P oracle uses Sets and parallel closure rounds, not the
// production bitset closure, missing-mask branching, memo or dominance.
function setClosure(problem, parkedIndices) {
  const parked = new Set(parkedIndices), cleared = new Set();
  for (;;) {
    const ready = [];
    for (let i = 0; i < problem.bodies.length; i++) {
      const body = problem.bodies[i];
      if (cleared.has(i) || body.gateCount > cleared.size) continue;
      const paths = body.masks.map(mask => ids(mask, problem.bodies.length));
      if (paths.some(path => path.every(j => parked.has(j) || cleared.has(j)))) ready.push(i);
    }
    if (!ready.length) return cleared.size;
    ready.forEach(i => cleared.add(i));
  }
}

// A second oracle explicitly enumerates every clear order. This independently
// verifies that monotone greedy closure neither loses nor invents a prefix.
function everyClearOrder(problem, parkedIndices) {
  const parked = new Set(parkedIndices), todo = [[]], seen = new Set(['']);
  let maximum = 0;
  for (let head = 0; head < todo.length; head++) {
    const removed = todo[head], cleared = new Set(removed);
    maximum = Math.max(maximum, removed.length);
    for (let i = 0; i < problem.bodies.length; i++) {
      const body = problem.bodies[i];
      if (cleared.has(i) || body.gateCount > removed.length) continue;
      if (!body.masks.some(mask => ids(mask, problem.bodies.length).every(j => parked.has(j) || cleared.has(j)))) continue;
      const next = [...removed, i].sort((a, b) => a - b), key = next.join(',');
      if (!seen.has(key)) { seen.add(key); todo.push(next); }
    }
  }
  return { maximum, states: seen.size };
}

function exhaustive(problem, activeIds = problem.bodies.map((_, i) => i), checkAllOrders = false) {
  let minimum = Infinity, subsetCount = 0, clearOrderStates = 0;
  for (let subset = 0; subset < 2 ** activeIds.length; subset++) {
    const parked = activeIds.filter((_, i) => member(subset, i));
    const count = setClosure(problem, parked);
    const actual = parkingClosure(problem, parked.reduce((mask, i) => mask + 2 ** i, 0));
    assert.equal(actual.count, Math.min(count, problem.goalClears));
    if (checkAllOrders) {
      const orders = everyClearOrder(problem, parked);
      assert.equal(orders.maximum, count);
      clearOrderStates += orders.states;
    }
    if (count >= problem.goalClears) minimum = Math.min(minimum, parked.length);
    subsetCount++;
  }
  return { minimum, subsetCount, clearOrderStates };
}

const body = (id, gateCount, masks) => ({ id: String(id), gateCount, masks });
const fixtures = [
  { name: 'parked-body-still-blocked-on-full-path', problem: { bodies: [body(0, 0, [2]), body(1, 3, []), body(2, 3, [])], goalClears: 1 } },
  { name: 'two-cycle-needs-one-parking-identity', problem: { bodies: [body(0, 0, [2]), body(1, 0, [1])], goalClears: 2 } },
  { name: 'gate-cascade-and-unreachable-isolated-body', problem: { bodies: [body(0, 0, [8]), body(1, 1, [1]), body(2, 2, [2]), body(3, 9, []), body(4, 14, [])], goalClears: 3 } },
  { name: 'no-gate-can-open-even-if-all-parked', problem: { bodies: [body(0, 1, [0]), body(1, 1, [0])], goalClears: 1 } },
  { name: 'alternative-path-versus-clear-order', problem: { bodies: [body(0, 0, [2, 12]), body(1, 0, [1, 8]), body(2, 2, [3]), body(3, 3, [4])], goalClears: 4 } },
];
let randomState = 923265;
const random = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 4294967296);
for (let sample = 0; sample < 180; sample++) {
  const n = 2 + sample % 8, goalClears = 1 + Math.floor(random() * n);
  const bodies = Array.from({ length: n }, (_, i) => body(i, random() < .5 ? 0 : Math.floor(random() * (n + 2)), Array.from({ length: Math.floor(random() * 4) }, () => {
    let mask = 0;
    for (let j = 0; j < n; j++) if (i !== j && random() < .36) mask += 2 ** j;
    return mask;
  })));
  fixtures.push({ name: 'random-' + sample, problem: { bodies, goalClears } });
}
// Sparse embedding explicitly exercises signed-shift boundary bit30, without
// pretending to enumerate all2^31 parking sets. Unused IDs never occur in paths.
const embedded = [0, 8, 17, 24, 30];
const sparseBodies = Array.from({ length: 31 }, (_, i) => body(i, 99, []));
sparseBodies[0] = body(0, 0, [2 ** 30]);
sparseBodies[8] = body(8, 1, [1]);
sparseBodies[17] = body(17, 2, [2 ** 8]);
sparseBodies[24] = body(24, 3, [2 ** 17]);
sparseBodies[30] = body(30, 4, [2 ** 24]);
fixtures.push({ name: 'bit30-sparse-31-body-domain', problem: { bodies: sparseBodies, goalClears: 5 }, activeIds: embedded });

const cases = [];
for (const fixture of fixtures) {
  const oracle = exhaustive(fixture.problem, fixture.activeIds, fixture.problem.bodies.length <= 6);
  const exact = solveParkingClosure(fixture.problem, { threshold: fixture.problem.bodies.length + 1, maxStates: 100000, maxMilliseconds: 10000 });
  if (oracle.minimum === Infinity) assert.equal(exact.status, 'relaxation-unreachable');
  else { assert.equal(exact.status, 'complete'); assert.equal(exact.minimum, oracle.minimum); assert(exact.minimumIsExact); }
  for (let threshold = 1; threshold <= Math.min(fixture.problem.bodies.length, 5); threshold++) {
    const bounded = solveParkingClosure(fixture.problem, { threshold, maxStates: 100000, maxMilliseconds: 10000 });
    if (oracle.minimum === Infinity) assert.equal(bounded.status, 'relaxation-unreachable');
    else if (oracle.minimum < threshold) { assert.equal(bounded.minimum, oracle.minimum); assert.equal(bounded.thresholdProven, false); }
    else { assert.equal(bounded.thresholdProven, true); assert.equal(bounded.provenLowerBound, threshold); }
  }
  cases.push({ name: fixture.name, bodies: fixture.problem.bodies.length, goalClears: fixture.problem.goalClears, minimum: Number.isFinite(oracle.minimum) ? oracle.minimum : null, ...oracle, input: fixture.problem });
}
assert.equal(parkingClosure(fixtures[0].problem, 1).count, 0, 'Parking a target cannot free-clear it');
assert.equal(solveParkingClosure(fixtures[1].problem, { threshold: 3, maxStates: 1 }).status, 'unknown');
assert.equal(solveParkingClosure(fixtures[1].problem, { threshold: 3, maxMilliseconds: 0 }).status, 'unknown');

// New preview only: no candidate lower search. Validate assumptions and the
// extracted real pose graphs by independent static BFS under every projected
// eight-identity removal set. This exercises actual curtain/portal extraction.
const preview = `${ROOT}/author232/eight-preview-7803.json`;
const value = JSON.parse(fs.readFileSync(preview, 'utf8')), level = value.level ?? value;
const { api } = await loadApi(), prepared = buildPrefixGraphs232(level, api);
let bfsSubsets = 0;
const graphChecks = [];
for (const [index, item] of prepared.graphs.entries()) {
  const selected = Array.from({ length: 8 }, (_, j) => (index + j * 3 + 1) % 26);
  const project = mask => selected.reduce((out, identity, bit) => member(mask, identity) ? out + 2 ** bit : out, 0);
  const graph = { ...item.graph, occupied: item.graph.occupied.map(project) };
  const paths = unionPaths(graph, { maxLabels: 100000, maxMilliseconds: 10000 });
  assert.equal(paths.status, 'complete');
  for (let removed = 0; removed < 256; removed++) {
    const canOccupy = pose => ids(graph.occupied[pose], 8).every(i => member(removed, i));
    const queue = canOccupy(graph.start) ? [graph.start] : [], seen = new Set(queue);
    for (let head = 0; head < queue.length; head++) for (const to of graph.neighbors[queue[head]]) if (!seen.has(to) && canOccupy(to)) { seen.add(to); queue.push(to); }
    const reachable = graph.goals.some(goal => seen.has(goal));
    assert.equal(paths.masks.some(mask => ids(mask, 8).every(i => member(removed, i))), reachable);
    bfsSubsets++;
  }
  graphChecks.push({ id: item.id, gateCount: item.gateCount, graphSha256: digest(item.graph), selected, projectedMasks: paths.masks });
}
const files = [
  'tools/continue231-240/author232-prefix-closure-core.mjs',
  'tools/continue231-240/author232-prefix-closure-bound.mjs',
  'tools/continue231-240/author232-prefix-closure-qualify.mjs',
  'tools/continue231-240/author240-alt-blocker-bound.mjs',
  'tools/continuation211-optional-lift-domain.mjs',
];
const file = `${ROOT}/author232/prefix-closure-qualification-${Date.now()}.json`;
writeNew(file, {
  status: 'PASS', method: 'Independent exhaustive parking subsets with Set-based parallel closure, plus exhaustive legal clear orders for small fixtures. Compare exact minimum and five bounded thresholds against missing-mask branch search. Actual new-preview pose graphs independently checked by BFS under all256 subsets of eight projected initial identities per body. No candidate lower bound or witness search executed here.',
  fixtures: cases.length, allParkingSubsets: cases.reduce((sum, c) => sum + c.subsetCount, 0), clearOrderStates: cases.reduce((sum, c) => sum + c.clearOrderStates, 0), cases,
  budgetStops: ['state-budget returns UNKNOWN', 'deadline returns UNKNOWN'],
  wrapper: { preview, sourceLevelSha256: digest(level), opening: 26, hidden: 16, total: 42, goalClears: 11, ordinaryBodies: level.blocks.filter(b => !b.shutterId && level.gates.some(g => !g.frozen && g.color === b.color)).length, permanentCells: prepared.permanentCells, bfsSubsets, graphChecks },
  sourceRawSha256: Object.fromEntries(files.map(f => [f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
});
console.log(JSON.stringify({ file, status: 'PASS', fixtures: cases.length, allParkingSubsets: cases.reduce((sum, c) => sum + c.subsetCount, 0), clearOrderStates: cases.reduce((sum, c) => sum + c.clearOrderStates, 0), bfsSubsets }));

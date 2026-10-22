import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { goalUnionPaths } from './author240-alt-goal-paths.mjs';
import { buildClosureGraphs240 } from './author240-alt-closure-bound.mjs';
import { ROOT, loadApi, ruleGate, digest, writeNew } from './common.mjs';
ruleGate();
const qualification = `${ROOT}/author232/prefix-closure-qualification-1792402291676.json`;
const prior = JSON.parse(fs.readFileSync(qualification, 'utf8'));
assert.equal(prior.status, 'PASS');
const core = 'tools/continue231-240/author232-prefix-closure-core.mjs';
assert.equal(prior.sourceRawSha256[core], createHash('sha256').update(fs.readFileSync(core)).digest('hex'));
const member = (mask, bit) => Math.floor(mask / 2 ** bit) % 2 === 1;
function check(graph, bits) {
  const result = goalUnionPaths(graph, { maxLabels: 100000, maxMilliseconds: 10000 });
  assert.equal(result.status, 'complete');
  for (let permitted = 0; permitted < 2 ** bits; permitted++) {
    const allowed = pose => Array.from({ length: bits }, (_, i) => i).every(i => !member(graph.occupied[pose], i) || member(permitted, i));
    const queue = allowed(graph.start) ? [graph.start] : [], visited = new Set(queue);
    for (let head = 0; head < queue.length; head++) for (const to of graph.neighbors[queue[head]]) if (!visited.has(to) && allowed(to)) { visited.add(to); queue.push(to); }
    assert.equal(result.masks.some(mask => Array.from({ length: bits }, (_, i) => i).every(i => !member(mask, i) || member(permitted, i))), graph.goals.some(goal => visited.has(goal)));
  }
  return result;
}
let state = 3247681;
const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
const cases = [];
for (let sample = 0; sample < 100; sample++) {
  const vertices = 5 + sample % 8, bits = 3 + sample % 5;
  const neighbors = Array.from({ length: vertices }, () => []);
  for (let i = 0; i < vertices; i++) for (let j = 0; j < vertices; j++) if (i !== j && random() < .23) neighbors[i].push(j);
  const occupied = Array.from({ length: vertices }, () => Math.floor(random() * 2 ** bits));
  const graph = { neighbors, occupied, start: 0, goals: Array.from({ length: vertices }, (_, i) => i).filter(() => random() < .3) };
  const result = check(graph, bits);
  cases.push({ graph, bits, masks: result.masks, subsets: 2 ** bits });
}
const candidate = process.argv[2];
assert(candidate, 'A new route-ready candidate is required for wrapper extraction qualification');
const value = JSON.parse(fs.readFileSync(candidate, 'utf8')), level = value.level ?? value;
const { api } = await loadApi(), graphs = buildClosureGraphs240(level, api), graphChecks = [];
for (const [index, item] of graphs.entries()) {
  const selected = Array.from({ length: 8 }, (_, j) => (index + j * 4 + 1) % 31);
  const projected = { ...item.graph, occupied: item.graph.occupied.map(mask => selected.reduce((out, id, bit) => member(mask, id) ? out + 2 ** bit : out, 0)) };
  const result = check(projected, 8);
  graphChecks.push({ id: item.id, gateCount: item.gateCount, graphSha256: digest(item.graph), selected, projectedMasks: result.masks });
}
const files = ['tools/continue231-240/author240-alt-closure-bound.mjs', 'tools/continue231-240/author240-alt-goal-paths.mjs', 'tools/continue231-240/author240-alt-closure-qualify.mjs', 'tools/continue231-240/author232-prefix-closure-bound.mjs', core, 'tools/continuation211-optional-lift-domain.mjs'];
const file = `${ROOT}/author240-alt/closure-qualification-${Date.now()}.json`;
writeNew(file, {
  status: 'PASS', coreQualification: qualification, coreQualificationRawSha256: createHash('sha256').update(fs.readFileSync(qualification)).digest('hex'),
  method: 'Unchanged closure core inherits exhaustive all-P and all-clear-order qualification including31-body sparse bit30. New goal-aware path antichain independently checked against exhaustive permitted-subset BFS for100 graph fixtures and31 actual new-candidate graphs with eight projected identities. This is extraction qualification only; no candidate lower search here.',
  cases, totalBfsSubsets: cases.reduce((sum, c) => sum + c.subsets, 0) + graphs.length * 256,
  candidate, sourceLevelSha256: digest(level), ordinaryBodies: level.blocks.filter(b => b.color === 'purple').length, graphChecks,
  sourceRawSha256: Object.fromEntries(files.map(f => [f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
});
console.log(JSON.stringify({ status: 'PASS', file, fixtures: cases.length, candidateGraphs: graphs.length }));

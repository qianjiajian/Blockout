import fs from 'node:fs';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial, compileSpatial, each, cleared, key as stateKey } from '../continuation211-colored-witness.mjs';
import { gameplayFingerprint, retileAndRecolor, runFiniteCandidates } from './finite-search-policy.mjs';

const output = 'deliverables/league-regeneration-20261004/formal/level14-finite-retry.json';
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: `export { LEVELS } from './src/core/levels.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { LEVELS } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const rand = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
function searchWeighted(level, { maxMilliseconds = 1800, maxCost = 40, penalty = 8, orderSeed = 0 } = {}) {
  let compiled;
  try { compiled = compileSpatial(level, spatial); } catch (error) { return { status: 'unsupported', reason: error.message }; }
  const started = Date.now();
  const normalize = state => {
    const drags = [];
    for (;;) {
      let next;
      each(compiled, state, (candidate, cost, get) => {
        if (cost === 0) { next = candidate; drags.push(get()); return false; }
      }, { optionalExit: false, orderSeed });
      if (!next) return { state, drags };
      state = next;
    }
  };
  const initial = normalize(compiled.initial);
  const nodes = [{ state: initial.state, parent: -1, cost: 0, g: 0, clears: cleared(compiled, initial.state), drags: initial.drags }];
  const seen = new Map([[stateKey(initial.state), 0]]), open = [0];
  const score = index => nodes[index].clears * 1000 - nodes[index].g;
  const push = index => { open.push(index); for (let at = open.length - 1; at;) { const parent = (at - 1) >> 1; if (score(open[parent]) >= score(open[at])) break; [open[parent], open[at]] = [open[at], open[parent]]; at = parent; } };
  const pop = () => { const first = open[0], last = open.pop(); if (open.length) { open[0] = last; for (let at = 0;;) { let child = at * 2 + 1; if (child >= open.length) break; if (child + 1 < open.length && score(open[child + 1]) > score(open[child])) child += 1; if (score(open[at]) >= score(open[child])) break; [open[at], open[child]] = [open[child], open[at]]; at = child; } } return first; };
  const route = index => { const out = []; while (index >= 0) { out.push(nodes[index].drags); index = nodes[index].parent; } return out.reverse().flat(); };
  let best = 0;
  while (open.length && Date.now() - started < maxMilliseconds && seen.size < 220000) {
    const index = pop(), node = nodes[index];
    if (seen.get(stateKey(node.state)) < node.g) continue;
    if (node.clears > nodes[best].clears) best = index;
    if (node.clears === compiled.totalClears) return { status: 'witness', cost: node.cost, states: seen.size, drags: route(index) };
    each(compiled, node.state, (raw, stepCost, get) => {
      if (node.cost + stepCost > maxCost) return;
      const drag = get(), body = level.blocks.find(block => block.id === drag.blockId);
      const g = node.g + stepCost * (body?.shape.length === 1 ? penalty : 1);
      const normalized = normalize(raw), stateKeyValue = stateKey(normalized.state);
      if ((seen.get(stateKeyValue) ?? Infinity) <= g) return;
      seen.set(stateKeyValue, g);
      nodes.push({ state: normalized.state, parent: index, cost: node.cost + stepCost, g, clears: cleared(compiled, normalized.state), drags: [drag, ...normalized.drags] });
      push(nodes.length - 1);
    }, { optionalExit: false, orderSeed });
  }
  return { status: 'unknown', states: seen.size, maxClearsSeen: nodes[best].clears, elapsed: Date.now() - started };
}
function sanitize(level) {
  level.mechanismRules = 'revised-2026-09-27-v1.5'; level.timeSeconds = 180; level.reward = 0;
  for (const key of ['generators', 'elevators', 'conveyors', 'flipDoors', 'seams', 'coloredGrids']) delete level[key];
  // Match the early-targeted hard-band reconstruction: Lv14 keeps source ice
  // values, while layers/axes/keys/stars and shutters are removed for this
  // isolated finite audit.
  for (const block of level.blocks) { delete block.layers; delete block.movementAxis; delete block.keyId; delete block.lockedBy; delete block.lockCount; delete block.star; }
  delete level.shutters;
  for (const block of level.blocks) delete block.shutterId;
  return level;
}
function baseCandidate() {
  const r = rand(140068), level = sanitize(structuredClone(LEVELS[13]));
  level.id = 900014; level.name = '荣耀联赛14·有限复核'; level.difficulty = 'hard';
  for (const gate of level.gates) {
    if (r() < 0.85) { const span = gate.side === 'top' || gate.side === 'bottom' ? level.width : level.height; gate.offset = Math.floor(r() * Math.max(1, span - gate.size)); }
    if (r() < 0.08) { const other = level.gates[Math.floor(r() * level.gates.length)]; if (other && other !== gate) [gate.color, other.color] = [other.color, gate.color]; }
  }
  const same = new Map(); for (const block of level.blocks) { const key = JSON.stringify(block.shape); if (!same.has(key)) same.set(key, []); same.get(key).push(block); }
  for (const group of same.values()) if (group.length > 1 && r() < 0.8) { const a = group[Math.floor(r() * group.length)], b = group[Math.floor(r() * group.length)]; if (a !== b) [a.x, b.x, a.y, b.y] = [b.x, a.x, b.y, a.y]; }
  const byArea = new Map(); for (const block of level.blocks) { const key = String(block.shape.length); if (!byArea.has(key)) byArea.set(key, []); byArea.get(key).push(block); }
  for (const group of byArea.values()) { const a = group.find(item => group.some(other => other !== item && JSON.stringify(item.shape) !== JSON.stringify(other.shape))); if (!a || r() > 0.55) continue; const b = group.find(item => item !== a && JSON.stringify(item.shape) !== JSON.stringify(a.shape)); if (b) { [a.shape, b.shape] = [b.shape, a.shape]; [a.x, b.x, a.y, b.y] = [b.x, a.x, b.y, a.y]; } }
  if (level.blocks.length > 1 && r() < 0.65) { const a = Math.floor(r() * level.blocks.length), b = Math.floor(r() * level.blocks.length); if (a !== b) [level.blocks[a].color, level.blocks[b].color] = [level.blocks[b].color, level.blocks[a].color]; }
  return level;
}
const base = baseCandidate();
const definitions = [
  { cells: [[0, 0], [1, 0]] }, { cells: [[0, 0], [0, 1]] },
  { cells: [[0, 0], [1, 0], [2, 0]] }, { cells: [[0, 0], [0, 1], [0, 2]] },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
];
const candidates = [base, ...retileAndRecolor(base, definitions, 4)].map((level, index) => ({ ...level, id: 900014, name: `荣耀联赛14·有限复核${index}` }));
const report = await runFiniteCandidates({
  base, candidates, maxCandidates: 5,
  solve: async level => {
    const route = searchWeighted(level, { maxMilliseconds: 2200, maxCost: 40, penalty: 8, orderSeed: 68 });
    const result = { route: { status: route.status, termination: route.termination, exploredStates: route.exploredStates, discoveredStates: route.discoveredStates, attemptedTransitions: route.attemptedTransitions, valid: false, complete: false, nonClearingDrags: null } };
    if (!route.drags) return { ...result, accepted: false, failureReasons: ['fresh-pointer-route-not-found'] };
    const runtimeBundle = await build({ stdin: { resolveDir: process.cwd(), contents: `export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
    const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].text).toString('base64')}`);
    const replay = runtime.replayRevisedRoute(level, route.drags);
    result.route = { ...result.route, valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags };
    if (!replay.valid || !replay.complete || replay.nonClearingDrags < 16 || replay.nonClearingDrags > 20) return { ...result, accepted: false, failureReasons: ['upper-U16-20-out-of-band-or-invalid'] };
    const lower = searchSpatial(level, spatial, { floor: 16, prove: true, normalize: false, maxStates: 800000, maxTransitions: 6000000, maxMilliseconds: 12000, orderSeed: 68 });
    result.lower = { status: lower.status, termination: lower.termination, thresholdProven: lower.thresholdProven, exploredStates: lower.exploredStates, attemptedTransitions: lower.attemptedTransitions };
    if (!lower.thresholdProven) return { ...result, accepted: false, failureReasons: ['fresh-lower-L16-not-proven'] };
    const exits = route.drags.filter(drag => drag.exitSide);
    const half = exits.length / 2;
    const rectangle = block => {
      const cells = block.shape;
      const xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      return cells.length === (maxX - minX + 1) * (maxY - minY + 1)
        && new Set(cells.map(([x, y]) => `${x},${y}`)).size === cells.length;
    };
    const specials = [];
    for (let index = 0; index < exits.length; index += 1) {
      if (index + 1 <= half) continue;
      const blockId = exits[index].blockId;
      if (specials.includes(blockId)) continue;
      const block = level.blocks.find(item => item.id === blockId);
      if (block && rectangle(block.shape)) specials.push(blockId);
      if (specials.length === 3) break;
    }
    const specialEvidence = specials.map(blockId => {
      const exitOrder = exits.findIndex(drag => drag.blockId === blockId) + 1;
      return { blockId, exitOrder, clearEvents: exits.length, completeClearVerified: true, lateClear: exitOrder > half, score: 10, specialShape: 'filled-axis-aligned-rectangle' };
    });
    if (!specials.length || specialEvidence.some(item => !item.lateClear)) return { ...result, accepted: false, failureReasons: ['no-late-filled-rectangle-special'] };
    return { ...result, accepted: true, level, drags: route.drags, specials, specialEvidence };
  },
});
const final = { index: 14, levelId: 900014, finite: true, noInfiniteRetry: true, baseFingerprint: gameplayFingerprint(base), ...report };
fs.writeFileSync(output, JSON.stringify(final, null, 2) + '\n');
console.log(JSON.stringify({ status: final.status, attempts: final.attempts.length, accepted: Boolean(final.accepted), output, summary: final.attempts.map(attempt => ({ mutationIndex: attempt.mutationIndex, status: attempt.status, reasons: attempt.failureReasons, U: attempt.result?.route?.nonClearingDrags, L: attempt.result?.lower?.thresholdProven })) }, null, 2));

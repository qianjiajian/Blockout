/* Finite early hard candidates using a mechanism-free mainline template. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { rawJsonHash, canonicalLevelHash, evidenceCheck } from './round3-contract.mjs';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/early-repair/basic-hard');
fs.mkdirSync(OUT_DIR, { recursive: true });
const bundle = await build({ stdin: { resolveDir: ROOT, loader: 'ts', contents: `export { LEVELS } from './src/core/levels.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { LEVELS } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const clone = value => structuredClone(value);
const key = ([x, y]) => `${x},${y}`;
const cells = block => (block.shape ?? []).map(([dx, dy]) => [block.x + dx, block.y + dy]);
const palette = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const target = [16, 20];

function strip(level) {
  const out = clone(level);
  for (const gate of out.gates ?? []) delete gate.frozen;
  for (const block of out.blocks ?? []) {
    delete block.frozen; delete block.layers; delete block.shutterId;
    delete block.keyId; delete block.lockedBy; delete block.lockCount;
    delete block.movementAxis; delete block.star;
  }
  delete out.shutters; delete out.generators; delete out.elevators; delete out.conveyors;
  delete out.flipDoors; delete out.coloredGrids; delete out.seams;
  out.mechanismRules = 'revised-2026-09-27-v1.5';
  return out;
}

function splitShape(shape, mode) {
  const pts = shape.map(([x, y]) => [x, y]);
  if (pts.length < 2) return null;
  if (pts.length === 4 && pts.some(p => p[0] === 1) && pts.some(p => p[1] === 1)) {
    const a = mode % 2 === 0 ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]];
    const set = new Set(a.map(key));
    const b = pts.filter(p => !set.has(key(p)));
    if (b.length === 2) return [a, b];
  }
  // For 2/3-cell pieces, splitting into single cells is valid and increases
  // basic-move pressure without introducing an unlock-gated mechanism.
  return pts.map(p => [p]);
}

function recolor(level, random, colorPool = palette) {
  const adjacency = new Map((level.blocks ?? []).map(block => [block.id, new Set()]));
  for (let i = 0; i < level.blocks.length; i++) for (let j = i + 1; j < level.blocks.length; j++) {
    const a = level.blocks[i], b = level.blocks[j];
    if (cells(a).some(p => cells(b).some(q => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) === 1))) {
      adjacency.get(a.id).add(b.id); adjacency.get(b.id).add(a.id);
    }
  }
  const order = [...level.blocks].sort((a, b) => adjacency.get(b.id).size - adjacency.get(a.id).size);
  const assigned = new Map();
  for (const block of order) {
    const used = new Set([...adjacency.get(block.id)].map(id => assigned.get(id)).filter(Boolean));
    const options = colorPool.filter(color => !used.has(color));
    if (!options.length) return false;
    assigned.set(block.id, options[Math.floor(random() * options.length)]);
  }
  for (const block of level.blocks) block.color = assigned.get(block.id);
  return true;
}

function q0(level) {
  const legal = new Set((level.playable ?? []).map(key));
  const occupancy = new Map();
  for (const block of level.blocks ?? []) for (const cell of cells(block)) {
    const k = key(cell); const list = occupancy.get(k) ?? []; list.push(block.id); occupancy.set(k, list);
  }
  let adjacent = 0;
  for (let i = 0; i < level.blocks.length; i++) for (let j = i + 1; j < level.blocks.length; j++) {
    const a = level.blocks[i], b = level.blocks[j]; if (a.color !== b.color) continue;
    if (cells(a).some(p => cells(b).some(q => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) === 1))) adjacent++;
  }
  return { missing: [...legal].filter(k => !occupancy.has(k)).length, overlap: [...occupancy.values()].filter(v => v.length !== 1).length, adjacent };
}

function variant(index, attempt) {
  const random = rng(index * 10000 + attempt * 7919);
  const sourceId = Number(process.env.EARLY_SOURCE ?? 45);
  const level = strip(LEVELS[sourceId - 1]);
  level.id = 995000 + index * 100 + attempt;
  level.name = `荣耀联赛${index}·早段基础变体${attempt}`;
  level.difficulty = 'hard'; level.timeSeconds = 180; level.reward = 0;
  // Keep the source color inventory and gate colors aligned. Increase basic
  // spatial pressure with diagonal singleton splits of square blocks (the two
  // same-colour pieces are not adjacent), plus finite same-shape permutations.
  // No unlock-gated field is introduced.
  const splitCount = 1 + (attempt % 2);
  const squareCandidates = [...level.blocks].filter(block => block.shape.length === 4 && block.shape.some(p => p[0] === 1) && block.shape.some(p => p[1] === 1)).sort(() => random() - 0.5).slice(0, splitCount);
  const splitIds = new Set(squareCandidates.map(block => block.id));
  const splitBlocks = [];
  const gateColors = [...new Set(level.gates.map(gate => gate.color))];
  for (const block of level.blocks) {
    if (!splitIds.has(block.id)) { splitBlocks.push(block); continue; }
    const cellsInShape = block.shape.map(([x, y]) => ({ x, y }));
    const diagonal = cellsInShape.filter(point => (point.x + point.y) % 2 === 0);
    const other = cellsInShape.filter(point => (point.x + point.y) % 2 !== 0);
    const alternate = gateColors[(attempt + index + splitBlocks.length) % gateColors.length];
    splitBlocks.push({ ...block, id: `${block.id}-d0`, shape: diagonal.map(point => [point.x, point.y]) });
    splitBlocks.push({ ...block, id: `${block.id}-d1`, color: alternate === block.color ? gateColors[(attempt + index + splitBlocks.length + 1) % gateColors.length] : alternate, shape: other.map(point => [point.x, point.y]) });
  }
  level.blocks = splitBlocks;
  const groups = new Map();
  for (const block of level.blocks) {
    const k = JSON.stringify(block.shape);
    const group = groups.get(k) ?? []; group.push(block); groups.set(k, group);
  }
  // Do not permute origins after diagonal splitting: unlike a whole-shape
  // swap, that could break full-cover geometry. The finite variation is the
  // selected split set itself.
  const staticQ0 = q0(level);
  if (staticQ0.missing || staticQ0.overlap || staticQ0.adjacent) return null;
  return level;
}

function applyDrag(model, drag) {
  model.beginAction();
  for (const point of drag.path ?? []) if (!model.moveBlockStep(drag.blockId, point[0], point[1])) { model.cancelAction(); return false; }
  if (drag.exitSide) { const result = model.tryExit(drag.blockId, drag.exitSide); if (!result.ok) { model.cancelAction(); return false; } }
  return model.commitAction();
}

function scoreEvidence(level, drags) {
  const model = new runtime.PuzzleModel(level); model.startCountdown(); const events = [];
  for (let step = 0; step < drags.length; step++) {
    const drag = drags[step]; const before = model.getBlock(drag.blockId); if (!applyDrag(model, drag)) return { status: 'BLOCKED' };
    if (drag.exitSide) events.push({ step: step + 1, blockId: drag.blockId, fullyRemoved: !model.getBlock(drag.blockId), shape: before?.shape ?? [] });
  }
  const late = Math.floor(events.length / 2) + 1;
  const selected = events.filter(event => event.fullyRemoved && event.step >= late && filledRect(event.shape)).slice(0, 3).map(event => ({ blockId: event.blockId, clearEvent: event.step, points: 10 }));
  return { status: model.snapshot().complete && selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold: late, completeExitEvents: events.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}
function filledRect(shape) {
  if (!shape?.length) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) && new Set(shape.map(key)).size === shape.length;
}

const rows = [];
const targetIndexes = process.env.EARLY_INDEX ? [Number(process.env.EARLY_INDEX)] : [1, 2, 4, 5];
for (const index of targetIndexes) {
  let accepted = null; const attempts = [];
  for (let attempt = 1; attempt <= 28 && !accepted; attempt++) {
    const level = variant(index, attempt); if (!level) continue;
    const levelSha256 = canonicalLevelHash(level);
    const row = { attempt, levelSha256, q0: q0(level) };
    const route = searchSpatial(level, spatial, { floor: 21, maxStates: 260000, maxTransitions: 1300000, maxMilliseconds: 2600, normalize: true, orderSeed: index * 1000 + attempt });
    row.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, sourceLevelSha256: route.sourceLevelSha256 ?? null, exploredStates: route.exploredStates ?? null };
    if (route.status !== 'witness' || !route.drags) { row.reason = 'route-unavailable'; attempts.push(row); continue; }
    const replay = runtime.replayRevisedRoute(level, route.drags);
    row.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
    if (!replay.valid || !replay.complete || replay.nonClearingDrags < 16 || replay.nonClearingDrags > 20) { row.reason = 'route-out-of-band'; attempts.push(row); continue; }
    const proof = searchSpatial(level, spatial, { floor: 16, prove: true, maxStates: 900000, maxTransitions: 4500000, maxMilliseconds: 7000, normalize: false, orderSeed: index * 1000 + attempt });
    row.lowerBound = { status: proof.status, thresholdProven: proof.thresholdProven === true, termination: proof.termination ?? null, sourceLevelSha256: levelSha256, exploredStates: proof.exploredStates ?? null, attemptedTransitions: proof.attemptedTransitions ?? null, elapsedMilliseconds: proof.elapsedMilliseconds ?? null, floor: 16 };
    if (proof.thresholdProven !== true) { row.reason = 'lower-not-proven'; attempts.push(row); continue; }
    const scoreBlocks = scoreEvidence(level, route.drags); row.scoreBlocks = scoreBlocks;
    if (scoreBlocks.status !== 'PASS') { row.reason = 'score-failed'; attempts.push(row); continue; }
    const candidate = { sourceLevelId: Number(process.env.EARLY_SOURCE ?? 45), levelSha256, routeSha256: rawJsonHash(route.drags), level, drags: route.drags, replay, lowerBound: row.lowerBound, scoreBlocks };
    const check = await evidenceCheck({ index, accepted: candidate }, { strictQ0: true, replayRoute: async (l, d) => runtime.replayRevisedRoute(l, d) });
    row.evidence = { status: check.status, errors: check.errors };
    if (check.status === 'PASS') { accepted = candidate; break; }
    row.reason = 'evidence-blocked'; attempts.push(row);
  }
  rows.push({ index, status: accepted ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', accepted, attempts, finiteBudget: { maxAttempts: 28, noInfiniteRetry: true } });
  fs.writeFileSync(path.join(OUT_DIR, `formal-${index}.json`), JSON.stringify(rows.at(-1), null, 2) + '\n');
  console.log(JSON.stringify({ index, accepted: Boolean(accepted), attempts: attempts.length, U: accepted?.replay?.nonClearingDrags ?? null }));
}
const report = { status: rows.every(row => row.accepted) ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES', generatedAt: new Date().toISOString(), source: 'finite mechanism-free source45 split/recolor', accepted: rows.filter(row => row.accepted).map(row => row.index), blocked: rows.filter(row => !row.accepted).map(row => row.index), acceptedCandidates: rows.filter(row => row.accepted).map(row => ({ index: row.index, accepted: row.accepted })), rows, productionChanged: false };
fs.writeFileSync(path.join(OUT_DIR, 'formal-basic-hard.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, accepted: report.accepted, blocked: report.blocked, output: path.relative(ROOT, path.join(OUT_DIR, 'formal-basic-hard.json')) }));

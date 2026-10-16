/*
 * Finite targeted recovery batch for round-2 late indexes.
 * This is isolated evidence only: no production registry, selector, LEVELS or
 * saves are touched.  It deliberately uses a fixed source pool and a finite
 * eight-variant budget per index, then records every blocked attempt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = 'deliverables/league-regeneration-20261005/round2/early-targeted';
const REPORT = `${OUTPUT_DIR}/formal-1-19.json`;
const MAX_VARIANTS = 8;
const PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const TARGET = difficulty => difficulty === 'super' ? [21, 30] : [16, 20];
const difficulty = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const clone = value => structuredClone(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cellKey = ([x, y]) => `${x},${y}`;
const filledRectangle = shape => {
  if (!Array.isArray(shape) || shape.length === 0) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return shape.length === area && new Set(shape.map(cellKey)).size === shape.length;
};
const hash = (seed, salt) => {
  let x = (seed ^ salt) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};

const sourceBundle = await build({
  stdin: { resolveDir: ROOT, contents: "export { LEVELS } from './src/core/levels.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';" },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { LEVELS, validateLevel } = await import(`data:text/javascript;base64,${Buffer.from(sourceBundle.outputFiles[0].text).toString('base64')}`);
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();

function recolor(level, shift) {
  const map = new Map(PALETTE.map((color, index) => [color, PALETTE[(index + shift) % PALETTE.length]]));
  const paint = item => {
    if (item.color) item.color = map.get(item.color) ?? item.color;
    if (item.layers) item.layers = item.layers.map(color => map.get(color) ?? color);
  };
  for (const block of level.blocks ?? []) paint(block);
  for (const gate of level.gates ?? []) paint(gate);
  for (const door of level.flipDoors ?? []) paint(door);
  for (const grid of level.coloredGrids ?? []) paint(grid);
  return Object.fromEntries(map);
}

function safeSwap(level, seed, maxSwaps = 3) {
  const queued = new Set((level.generators ?? []).flatMap(generator => generator.queueBlockIds ?? []));
  const key = block => JSON.stringify({ shape: block.shape, shutterId: block.shutterId ?? null, layers: block.layers ?? null, frozen: block.frozen ?? 0, movementAxis: block.movementAxis ?? null, keyId: block.keyId ?? null, lockedBy: block.lockedBy ?? null });
  const groups = new Map();
  for (const block of level.blocks ?? []) {
    if (queued.has(block.id)) continue;
    const list = groups.get(key(block)) ?? [];
    list.push(block); groups.set(key(block), list);
  }
  const swaps = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const offset = 1 + (hash(seed, list.length) % (list.length - 1));
    for (let i = 0; i < list.length - 1 && swaps.length < maxSwaps; i += 1) {
      const a = list[i], b = list[(i + offset) % list.length];
      if (!a || !b || a === b) continue;
      [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y];
      try { validateLevel(level); swaps.push({ a: a.id, b: b.id }); }
      catch { [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y]; }
    }
    if (swaps.length >= maxSwaps) break;
  }
  return swaps;
}

function scoreEvidence(level, drags) {
  const exits = drags.filter(drag => drag.exitSide);
  const firstExit = new Map();
  exits.forEach((drag, index) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, index + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? [])
    .filter(block => !block.shutterId && filledRectangle(block.shape) && (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

// Source 158 is a finite, replay-valid super-band template with a proven
// 21-drag lower threshold and late rectangular blocks.  198/112 are finite
// fallbacks if a recolour variant cannot replay; the early unlock window is checked by the report.
const sourceByIndex = index => difficulty(index) === 'super' ? [52] : [45];
const rows = [];
for (const index of [1, 2, 3, 4, 5, 8, 13, 18]) {
  const target = TARGET(difficulty(index));
  const attempts = [];
  let accepted = null;
  for (const sourceId of sourceByIndex(index)) {
    const source = LEVELS[sourceId - 1];
    for (let variant = 0; variant < MAX_VARIANTS && attempts.length < MAX_VARIANTS; variant += 1) {
      const level = clone(source);
      const swaps = safeSwap(level, hash(sourceId, index * 31 + variant), variant % 4);
      const paletteShift = 1 + (hash(sourceId, index * 719 + variant * 37) % (PALETTE.length - 1));
      const paletteMap = recolor(level, paletteShift);
      level.id = 930000 + index * 100 + variant;
      level.name = `荣耀联赛${index}·定向模板${sourceId}·变体${variant}`;
      level.difficulty = difficulty(index);
      level.timeSeconds = 180;
      level.reward = 0;
      level.mechanismRules = 'revised-2026-09-27-v1.5';
      const attempt = { attempt: attempts.length + 1, sourceLevelId: sourceId, levelSha256: digest(level), mutation: { kind: 'finite-early-targeted', sourceLevelId: sourceId, paletteShift, paletteMap, positionSwaps: swaps }, status: 'BLOCKED', reasons: [], target };
      try {
        validateLevel(level);
        const routeSeed = sourceId === 158 || sourceId === 198 || sourceId === 112 ? sourceId : index * 17 + variant;
        const route = searchSpatial(level, spatialApi, { maxStates: 300000, maxTransitions: 1200000, maxMilliseconds: 3000, floor: target[1] + 1, normalize: true, orderSeed: routeSeed });
        attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
        if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`); attempts.push(attempt); continue; }
        const replay = runtime.replayRevisedRoute(level, route.drags);
        attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
        if (!replay.valid || !replay.complete) { attempt.reasons.push('runtime-replay-invalid-or-incomplete'); attempts.push(attempt); continue; }
        if (replay.nonClearingDrags < target[0]) attempt.reasons.push('route-below-lower-target');
        if (replay.nonClearingDrags > target[1]) attempt.reasons.push('route-above-upper-target');
        if (attempt.reasons.length) { attempts.push(attempt); continue; }
        const lower = searchSpatial(level, spatialApi, { maxStates: 300000, maxTransitions: 1500000, maxMilliseconds: 4000, floor: target[0], prove: true, normalize: false, orderSeed: routeSeed });
        attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null };
        if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`); attempts.push(attempt); continue; }
        attempt.scoreBlocks = scoreEvidence(level, route.drags);
        if (attempt.scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
        attempt.status = 'FORMAL_CANDIDATE_READY';
        attempt.level = level;
        attempt.drags = route.drags;
        attempt.routeSha256 = digest(route.drags);
        accepted = attempt;
        attempts.push(attempt);
        break;
      } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error)}`); attempts.push(attempt); }
    }
    if (accepted) break;
  }
  rows.push({ index, difficulty: difficulty(index), target, sourceCandidates: sourceByIndex(index), status: accepted ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', accepted: accepted ? { sourceLevelId: accepted.sourceLevelId, fingerprint: digest(accepted.level), levelSha256: accepted.levelSha256, routeSha256: accepted.routeSha256, level: accepted.level, drags: accepted.drags, lowerBound: accepted.lowerBound, route: accepted.route, replay: accepted.replay, scoreBlocks: accepted.scoreBlocks } : null, attempts, reasons: accepted ? [] : [...new Set(attempts.flatMap(attempt => attempt.reasons))], formalEligibility: Boolean(accepted) });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(`${REPORT}.partial`, JSON.stringify({ status: 'PARTIAL', range: [1, 19], rows }, null, 2) + '\n');
}
const acceptedRows = rows.filter(row => row.accepted);
const report = { status: acceptedRows.length === rows.length ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES', generatedAt: new Date().toISOString(), range: [1, 19], accepted: acceptedRows.length, blocked: rows.filter(row => !row.accepted).map(row => row.index), finiteBudget: { maxVariantsPerIndex: MAX_VARIANTS, noInfiniteRetry: true }, scoringContract: { scoreBlockCount: '1-3', pointsPerBlock: 10, lateHalfRequired: true, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' }, rows };
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
fs.rmSync(`${REPORT}.partial`, { force: true });
console.log(JSON.stringify({ report: REPORT, status: report.status, accepted: report.accepted, blocked: report.blocked }, null, 2));

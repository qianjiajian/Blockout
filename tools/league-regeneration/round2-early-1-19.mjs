/*
 * Round-2 isolated authoring for league indexes 1..19.
 *
 * The first pass mapped league indexes directly to mainline indexes, which
 * left many early rows below the league L16/L21 bands. This pass deliberately
 * chooses an early mainline template by mechanism unlock stage, then emits a
 * finite set of true layout/shape/colour variants. It never edits LEVELS,
 * formalLeagueCandidateData, the league selector, or player saves.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { retileAndRecolor, gameplayFingerprint } from './finite-search-policy.mjs';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const OUTPUT_DIR = 'deliverables/league-regeneration-20261005/round2/early';
const REPORT = `${OUTPUT_DIR}/formal-1-19.json`;
const CANDIDATES = `${OUTPUT_DIR}/candidates-1-19.json`;
const MAX_VARIANTS_PER_INDEX = 12;
const ROUTE_BUDGET = { maxStates: 180000, maxTransitions: 850000, maxMilliseconds: 1800 };
const PROOF_BUDGET = { maxStates: 300000, maxTransitions: 1600000, maxMilliseconds: 4000 };
const PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const clone = value => structuredClone(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cadence = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const band = difficulty => difficulty === 'super' ? [21, 30] : [16, 20];
const hashSeed = (seed, salt) => {
  let value = (seed ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
};
const cellKey = ([x, y]) => `${x},${y}`;
const shapeKey = block => JSON.stringify(block.shape);
const mechanismKey = block => JSON.stringify({
  shutterId: block.shutterId ?? null,
  movementAxis: block.movementAxis ?? null,
  layers: block.layers ?? null,
  frozen: block.frozen ?? 0,
  keyId: block.keyId ?? null,
  lockedBy: block.lockedBy ?? null,
  lockCount: block.lockCount ?? null,
  star: block.star ?? false,
});
const filledRectangle = shape => {
  if (!shape?.length) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return shape.length === area && new Set(shape.map(cellKey)).size === shape.length;
};

const sourceBundle = await build({
  stdin: { resolveDir: process.cwd(), contents: "export { LEVELS } from './src/core/levels.ts'; export { validateLevel } from './src/core/PuzzleModel.ts'; export { FORMAL_BLOCK_SHAPES } from './src/game/formalBlockShapes.ts';" },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { LEVELS, validateLevel, FORMAL_BLOCK_SHAPES } = await import(`data:text/javascript;base64,${Buffer.from(sourceBundle.outputFiles[0].text).toString('base64')}`);
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();

function rotatesPalette(level, shift) {
  const map = new Map(PALETTE.map((color, index) => [color, PALETTE[(index + shift) % PALETTE.length]]));
  const recolor = block => {
    if (block.color) block.color = map.get(block.color) ?? block.color;
    if (block.layers) block.layers = block.layers.map(color => map.get(color) ?? color);
  };
  for (const block of level.blocks ?? []) recolor(block);
  for (const gate of level.gates ?? []) gate.color = map.get(gate.color) ?? gate.color;
  for (const door of level.flipDoors ?? []) door.color = map.get(door.color) ?? door.color;
  for (const grid of level.coloredGrids ?? []) grid.color = map.get(grid.color) ?? grid.color;
  return Object.fromEntries(map);
}

function safePositionSwap(level, seed, maxSwaps = 4) {
  const queued = new Set((level.generators ?? []).flatMap(generator => generator.queueBlockIds ?? []));
  const groups = new Map();
  for (const block of level.blocks ?? []) {
    if (queued.has(block.id)) continue;
    const key = `${shapeKey(block)}|${mechanismKey(block)}`;
    const group = groups.get(key) ?? [];
    group.push(block);
    groups.set(key, group);
  }
  const swaps = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const offset = hashSeed(seed, group.length) % group.length;
    for (let step = 0; step < group.length - 1 && swaps.length < maxSwaps; step += 1) {
      const a = group[step], b = group[(step + offset + 1) % group.length];
      if (!a || !b || a === b) continue;
      [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y];
      try { validateLevel(level); swaps.push({ a: a.id, b: b.id }); }
      catch { [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y]; }
    }
    if (swaps.length >= maxSwaps) break;
  }
  return swaps;
}

function mechanismAllowed(level, index) {
  // Unlock schedule requested for this isolated league batch.
  if (index < 6 && (level.shutters?.length || level.generators?.length || level.flipDoors?.length || level.elevators?.length || level.conveyors?.length)) return false;
  if (index < 10 && level.blocks.some(block => block.frozen !== undefined)) return false;
  if (index < 15 && level.blocks.some(block => block.layers?.length > 1)) return false;
  return true;
}

function makeVariants(source, index, sourceIndex) {
  const output = [];
  const seen = new Set();
  const add = (level, mutation) => {
    level.id = 920000 + index * 100 + output.length;
    level.name = `荣耀联赛${index}·主线模板${sourceIndex}·二轮变体${output.length}`;
    level.difficulty = cadence(index);
    level.timeSeconds = 180;
    level.reward = 0;
    level.mechanismRules = 'revised-2026-09-27-v1.5';
    if (!mechanismAllowed(level, index)) return;
    try { validateLevel(level); } catch { return; }
    const fingerprint = gameplayFingerprint(level);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    output.push({ level, mutation, fingerprint, sourceLevelId: sourceIndex });
  };
  const baseline = clone(source);
  add(baseline, { kind: 'template-baseline', sourceLevelId: sourceIndex, shapeChanged: false, colorChanged: false, layoutChanged: false });
  const maxRetiles = Math.min(7, MAX_VARIANTS_PER_INDEX - 1);
  const retiles = retileAndRecolor(source, FORMAL_BLOCK_SHAPES, maxRetiles);
  for (let i = 0; i < retiles.length; i += 1) {
    const level = clone(retiles[i]);
    const swaps = safePositionSwap(level, hashSeed(sourceIndex, index * 101 + i), 4);
    const shift = 1 + (hashSeed(sourceIndex, index * 719 + i * 37) % (PALETTE.length - 1));
    const paletteMap = rotatesPalette(level, shift);
    add(level, { kind: 'template-retile-recolor', sourceLevelId: sourceIndex, shapeChanged: true, colorChanged: true, layoutChanged: swaps.length > 0, positionSwaps: swaps, paletteShift: shift, paletteMap });
  }
  // Position-only permutations still change the spatial layout while retaining
  // the exact shape/mechanism inventory. They are added only after at least one
  // real shape/colour candidate, never as cosmetic substitutes for a failed
  // shape mutation.
  for (let i = 0; i < 6 && output.length < MAX_VARIANTS_PER_INDEX; i += 1) {
    const level = clone(source);
    const swaps = safePositionSwap(level, hashSeed(sourceIndex, index * 997 + i), 5);
    if (!swaps.length) continue;
    const shift = 1 + (hashSeed(sourceIndex, index * 1429 + i * 11) % (PALETTE.length - 1));
    const paletteMap = rotatesPalette(level, shift);
    add(level, { kind: 'template-layout-recolor', sourceLevelId: sourceIndex, shapeChanged: false, colorChanged: true, layoutChanged: true, positionSwaps: swaps, paletteShift: shift, paletteMap });
  }
  return output.slice(0, MAX_VARIANTS_PER_INDEX);
}

function scoreEvidence(level, drags) {
  const exitEvents = drags.filter(drag => drag.exitSide);
  const firstExit = new Map();
  exitEvents.forEach((drag, index) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, index + 1); });
  const threshold = Math.floor(exitEvents.length / 2) + 1;
  const selected = level.blocks
    .filter(block => !block.shutterId && filledRectangle(block.shape) && (firstExit.get(block.id) ?? Infinity) >= threshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold: threshold, completeExitEvents: exitEvents.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

const templateMap = index => {
  // 1–5 prefer low-mechanism mainline templates. 6–14 move to the validated
  // 9/12 shape families after the ice-gate/block unlock windows. 15–19 use the
  // shell-bearing 15 template. Candidate order is finite and deterministic.
  if (index <= 5) return [2, 4, ...(index === 3 ? [9] : [])];
  if (index <= 9) return [9, 12, 4];
  if (index <= 14) return [12, 9, 4];
  return [15, 12, 9];
};

const rows = [];
const acceptedEntries = [];
for (let index = 1; index <= 19; index += 1) {
  const target = band(cadence(index));
  const attempts = [];
  let accepted = null;
  for (const sourceIndex of templateMap(index)) {
    const source = LEVELS[sourceIndex - 1];
    for (const variant of makeVariants(source, index, sourceIndex)) {
      if (attempts.length >= MAX_VARIANTS_PER_INDEX) break;
      const attempt = { attempt: attempts.length + 1, sourceLevelId: sourceIndex, fingerprint: variant.fingerprint, levelSha256: digest(variant.level), mutation: variant.mutation, status: 'BLOCKED', reasons: [], target: { lower: target[0], upper: target[1] } };
      try {
        const route = searchSpatial(variant.level, spatialApi, { ...ROUTE_BUDGET, floor: target[1] + 1, normalize: true, orderSeed: index + attempts.length * 31 });
        attempt.route = { status: route.status, cost: route.cost ?? null, exploredStates: route.exploredStates ?? null, discoveredStates: route.discoveredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, maxClearsSeen: route.maxClearsSeen ?? null, termination: route.termination ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
        if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`); attempts.push(attempt); continue; }
        const replay = runtime.replayRevisedRoute(variant.level, route.drags);
        attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
        if (!replay.valid || !replay.complete) { attempt.reasons.push('runtime-replay-invalid-or-incomplete'); attempts.push(attempt); continue; }
        if (replay.nonClearingDrags < target[0]) attempt.reasons.push('route-below-lower-target');
        if (replay.nonClearingDrags > target[1]) attempt.reasons.push('route-above-upper-target');
        if (attempt.reasons.length) { attempts.push(attempt); continue; }
        const lower = searchSpatial(variant.level, spatialApi, { ...PROOF_BUDGET, floor: target[0], prove: true, normalize: false, orderSeed: index + attempts.length * 31 });
        attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, exploredStates: lower.exploredStates ?? null, discoveredStates: lower.discoveredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, termination: lower.termination ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null };
        if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`); attempts.push(attempt); continue; }
        attempt.scoreBlocks = scoreEvidence(variant.level, route.drags);
        if (attempt.scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
        attempt.status = 'FORMAL_CANDIDATE_READY';
        attempt.routeSha256 = digest(route.drags);
        attempt.level = variant.level;
        attempt.drags = route.drags;
        accepted = attempt;
        attempts.push(attempt);
        break;
      } catch (error) { attempt.reasons.push(`error:${error instanceof Error ? error.message : String(error)}`); attempts.push(attempt); }
    }
    if (accepted || attempts.length >= MAX_VARIANTS_PER_INDEX) break;
  }
  const row = { index, difficulty: cadence(index), target: { lower: target[0], upper: target[1] }, sourceCandidates: templateMap(index), status: accepted ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', selectedAttempt: accepted?.attempt ?? null, accepted: accepted ? { sourceLevelId: accepted.sourceLevelId, fingerprint: accepted.fingerprint, levelSha256: accepted.levelSha256, routeSha256: accepted.routeSha256, level: accepted.level, drags: accepted.drags, lowerBound: accepted.lowerBound, route: accepted.route, replay: accepted.replay, scoreBlocks: accepted.scoreBlocks } : null, attempts, reasons: accepted ? [] : [...new Set(attempts.flatMap(attempt => attempt.reasons))], formalEligibility: Boolean(accepted) };
  rows.push(row);
  if (accepted) acceptedEntries.push({ index, difficulty: cadence(index), sourceLevelId: accepted.sourceLevelId, fingerprint: accepted.fingerprint, levelSha256: accepted.levelSha256, routeSha256: accepted.routeSha256, level: accepted.level, drags: accepted.drags, lowerBound: accepted.lowerBound, scoreBlocks: accepted.scoreBlocks, formalEligibility: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(`${REPORT}.partial`, JSON.stringify({ status: 'PARTIAL', range: [1, 19], rows }, null, 2) + '\n');
}

const report = { status: acceptedEntries.length === 19 ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES', generatedAt: new Date().toISOString(), source: 'src/core/levels.ts', range: [1, 19], accepted: acceptedEntries.length, blocked: rows.filter(row => row.status !== 'FORMAL_CANDIDATE_READY').map(row => row.index), unlockContract: { iceGateFirstIndex: 6, iceBlockFirstIndex: 10, shellFirstIndex: 15, earlyTemplates: '1-5 prefer mainline2/4; 6-14 mainline9/12; 15-19 mainline15/12/9' }, finiteBudget: { maxVariantsPerIndex: MAX_VARIANTS_PER_INDEX, route: ROUTE_BUDGET, lowerProof: PROOF_BUDGET, noInfiniteRetry: true, shapeMutationRequiredForRetile: true }, scoringContract: { scoreBlockCount: '1-3', pointsPerBlock: 10, lateHalfRequired: true, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' }, formalEligibility: acceptedEntries.length === 19 ? 'ready for adoption review' : 'blocked rows require another finite redesign batch', rows, acceptedEntries };
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(CANDIDATES, JSON.stringify({ generatedAt: report.generatedAt, range: [1, 19], entries: acceptedEntries }, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, accepted: report.accepted, blocked: report.blocked, report: REPORT, candidates: CANDIDATES }, null, 2));

/*
 * Round-4 isolated unique-layout generator.
 *
 * The round-3 report is audited first with the v1.134 strict opening contract,
 * then a bounded fresh batch is generated from mainline templates.  Every
 * candidate must have full q0 cover, no overlap, adjacentSameColor=0, a real
 * local position swap, no pre-unlock mechanism, same-object route replay and
 * lower-bound proof, and 1-3 late rectangular score blocks that are not
 * directly movable on the opening pose.  This file never writes production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, mechanismCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/round4/unique');
const OUTPUT = path.join(OUTPUT_DIR, 'formal-unique-layouts.json');
const PARTIAL = `${OUTPUT}.partial`;
const ROUND3 = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/formal-unique-mid.json');
const ROUND2 = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/final-independent-audit.json');
const MAX_ATTEMPTS = 100;
const MAX_ACCEPTED = 20;
const PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const targetBand = index => ((index - 1) % 5 === 2 ? [21, 30] : [16, 20]);
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

function scoreEvidence(level, drags) {
  const exits = drags.filter(drag => drag.exitSide);
  const firstExit = new Map();
  const firstAction = new Map();
  drags.forEach((drag, index) => {
    if (!firstAction.has(drag.blockId)) firstAction.set(drag.blockId, { index, exit: Boolean(drag.exitSide) });
    if (drag.exitSide && !firstExit.has(drag.blockId)) firstExit.set(drag.blockId, exits.findIndex(item => item === drag) + 1);
  });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? [])
    .filter(block => !block.shutterId && filledRectangle(block.shape)
      && (firstExit.get(block.id) ?? Infinity) >= lateThreshold
      && !firstAction.get(block.id)?.exit)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return {
    status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected,
    lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10,
    runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  };
}

function applyPalette(level, shift) {
  const map = new Map(PALETTE.map((colour, i) => [colour, PALETTE[(i + shift) % PALETTE.length]]));
  for (const block of level.blocks ?? []) {
    if (block.color) block.color = map.get(block.color) ?? block.color;
    if (block.layers) block.layers = block.layers.map(colour => map.get(colour) ?? colour);
  }
  for (const gate of level.gates ?? []) if (gate.color) gate.color = map.get(gate.color) ?? gate.color;
  return Object.fromEntries(map);
}

/* Swap positions of two plain, equal-shape blocks with different colours.
 * Keeping their colours attached makes this a local topology change; the
 * palette shift only keeps candidate source colours varied and is ignored by
 * normalizedPuzzleKey. */
function localSwap(base, aIndex, bIndex, paletteShift) {
  const level = clone(base);
  const a = level.blocks?.[aIndex], b = level.blocks?.[bIndex];
  if (!a || !b) return null;
  const forbidden = block => block.shutterId || block.layers || block.frozen || block.movementAxis || block.keyId || block.lockedBy || block.star;
  if (forbidden(a) || forbidden(b) || a.color === b.color || JSON.stringify(a.shape) !== JSON.stringify(b.shape)) return null;
  [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y];
  const paletteMap = applyPalette(level, paletteShift);
  return { level, mutation: { kind: 'round4-local-position-swap', pair: [a.id, b.id], positionChanged: true, paletteShift, paletteMap } };
}

const sourceBundle = await build({
  stdin: { resolveDir: ROOT, contents: "export { LEVELS } from './src/core/levels.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';" },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { LEVELS, validateLevel } = await import(`data:text/javascript;base64,${Buffer.from(sourceBundle.outputFiles[0].text).toString('base64')}`);
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();

/* Independent pre-audit of round-3 rows. This is recorded separately from
 * the fresh round-4 catalogue and cannot make a row eligible by itself. */
const round3SeedAudit = [];
if (fs.existsSync(ROUND3)) {
  const report = JSON.parse(fs.readFileSync(ROUND3, 'utf8'));
  for (const row of report.rows ?? []) if (row.accepted?.level) {
    const result = await evidenceCheck(row, { strictQ0: true, replayRoute: async (level, drags) => runtime.replayRevisedRoute(level, drags) });
    round3SeedAudit.push({ index: row.index, status: result.status, errors: result.errors, adjacentSameColor: result.opening.adjacentSameColor.length, opening: result.opening });
  }
}

/* Existing canonical keys are excluded so a fresh row cannot be a disguised
 * repeat of round-2/round-3 geometry. */
const priorGeometry = new Set();
if (fs.existsSync(ROUND2)) for (const row of JSON.parse(fs.readFileSync(ROUND2, 'utf8')).rows ?? []) if (row.geometryKey) priorGeometry.add(row.geometryKey);
if (fs.existsSync(ROUND3)) for (const row of JSON.parse(fs.readFileSync(ROUND3, 'utf8')).rows ?? []) if (row.accepted?.level) priorGeometry.add(normalizedPuzzleKey(row.accepted.level));

const sourceIdsForIndex = index => difficulty(index) === 'super' ? [158, 158, 12] : [9, 12, 15, 9];
const rows = [];
const usedGeometry = new Set();
const usedFingerprints = new Set();
let attemptCount = 0;
for (let index = 20; index < 200 && acceptedRowsCount() < MAX_ACCEPTED && attemptCount < MAX_ATTEMPTS; index += 1) {
  const target = targetBand(index);
  const attempts = [];
  let accepted = null;
  const sourceCandidates = sourceIdsForIndex(index);
  for (const sourceId of sourceCandidates) {
    const source = LEVELS[sourceId - 1];
    const pairs = [];
    for (let a = 0; a < (source.blocks?.length ?? 0); a += 1) for (let b = a + 1; b < source.blocks.length; b += 1) pairs.push([a, b]);
    for (let variant = 0; variant < pairs.length && attempts.length < 8 && attemptCount < MAX_ATTEMPTS; variant += 1) {
      const pair = pairs[(variant * 11 + index * 3 + sourceId) % pairs.length];
      const built = localSwap(source, pair[0], pair[1], 1 + ((index + variant) % (PALETTE.length - 1)));
      if (!built) continue;
      attemptCount += 1;
      const level = built.level;
      level.id = 999000 + index * 10 + variant;
      level.name = `荣耀联赛Round4·${index}·局部换位${variant}`;
      level.difficulty = difficulty(index);
      level.timeSeconds = 180;
      level.reward = 0;
      level.mechanismRules = 'revised-2026-09-27-v1.5';
      const fingerprint = digest(level);
      const geometry = normalizedPuzzleKey(level);
      const attempt = { attempt: attempts.length + 1, index, sourceLevelId: sourceId, candidateLevelId: level.id, target, fingerprint, geometryKey: geometry, mutation: built.mutation, status: 'BLOCKED', reasons: [] };
      if (usedFingerprints.has(fingerprint)) { attempt.reasons.push('duplicate-fingerprint'); attempts.push(attempt); continue; }
      usedFingerprints.add(fingerprint);
      if (priorGeometry.has(geometry) || usedGeometry.has(geometry)) { attempt.reasons.push('duplicate-normalized-geometry'); attempts.push(attempt); continue; }
      try {
        validateLevel(level);
        const mechanism = mechanismCheck(level, index);
        attempt.mechanism = mechanism;
        const opening = openingAudit(level);
        attempt.opening = opening;
        if (opening.missingCells.length || opening.overlaps.length || opening.adjacentSameColor.length) {
          attempt.reasons.push(...(opening.missingCells.length ? [`q0-missing:${opening.missingCells.length}`] : []), ...(opening.overlaps.length ? [`q0-overlap:${opening.overlaps.length}`] : []), ...(opening.adjacentSameColor.length ? [`q0-adjacent-same-color:${opening.adjacentSameColor.length}`] : []));
        }
        if (mechanism.status !== 'PASS') attempt.reasons.push(...mechanism.errors);
        if (attempt.reasons.length) { attempts.push(attempt); continue; }
        const route = searchSpatial(level, spatialApi, { maxStates: 180000, maxTransitions: 800000, maxMilliseconds: 1800, floor: target[1] + 1, normalize: true, orderSeed: index + variant });
        attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
        if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`); attempts.push(attempt); continue; }
        const replay = runtime.replayRevisedRoute(level, route.drags);
        attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
        if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
        if (replay.nonClearingDrags < target[0]) attempt.reasons.push('route-below-lower-target');
        if (replay.nonClearingDrags > target[1]) attempt.reasons.push('route-above-upper-target');
        if (attempt.reasons.length) { attempts.push(attempt); continue; }
        const lower = searchSpatial(level, spatialApi, { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, floor: target[0], prove: true, normalize: false, orderSeed: index + variant });
        attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, termination: lower.termination ?? null, floor: target[0], exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null, sourceLevelSha256: rawJsonHash(level) };
        if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`); attempts.push(attempt); continue; }
        const score = scoreEvidence(level, route.drags);
        attempt.scoreBlocks = score;
        if (score.status !== 'PASS') { attempt.reasons.push('score-block-count-or-opening-direct-exit'); attempts.push(attempt); continue; }
        attempt.status = 'FORMAL_CANDIDATE_READY'; attempt.routeSha256 = rawJsonHash(route.drags); attempt.level = level; attempt.drags = route.drags;
        accepted = attempt; attempts.push(attempt); break;
      } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error)}`); attempts.push(attempt); }
    }
    if (accepted) break;
  }
  if (accepted) usedGeometry.add(accepted.geometryKey);
  rows.push({ index, difficulty: difficulty(index), target, sourceLevelCandidates: sourceCandidates, status: accepted ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', accepted: accepted ? { sourceLevelId: accepted.sourceLevelId, candidateLevelId: accepted.candidateLevelId, fingerprint: accepted.fingerprint, geometryKey: accepted.geometryKey, levelSha256: rawJsonHash(accepted.level), routeSha256: accepted.routeSha256, level: accepted.level, drags: accepted.drags, lowerBound: accepted.lowerBound, route: accepted.route, replay: accepted.replay, scoreBlocks: accepted.scoreBlocks, mutation: accepted.mutation, opening: accepted.opening, mechanism: accepted.mechanism } : null, attempts, formalEligibility: Boolean(accepted) });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(PARTIAL, `${JSON.stringify({ status: 'PARTIAL', maxAttempts: MAX_ATTEMPTS, attemptCount, round3SeedAudit, rows }, null, 2)}\n`);
}

function acceptedRowsCount() { return rows.filter(row => row.formalEligibility).length; }
const acceptedRows = rows.filter(row => row.formalEligibility);
const report = {
  schemaVersion: 1, status: acceptedRows.length === MAX_ACCEPTED ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES',
  generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated-round4-unique-layouts',
  accepted: acceptedRows.length, blocked: rows.filter(row => !row.formalEligibility).map(row => row.index),
  finiteBudget: { maxAttempts: MAX_ATTEMPTS, attempts: attemptCount, noInfiniteRetry: true },
  strictOpeningContract: { fullCover: true, overlapFree: true, adjacentSameColor: 0, scoreSpecialsNotDirectExit: true },
  round3SeedAudit, counts: { rows: rows.length, accepted: acceptedRows.length, blocked: rows.length - acceptedRows.length, uniqueGeometry: new Set(acceptedRows.map(row => row.accepted.geometryKey)).size, uniqueIds: new Set(acceptedRows.map(row => row.accepted.candidateLevelId)).size },
  contract: { cadence: 'hard,hard,super,hard,hard', hard: [16, 20], super: [21, 30], scoreBlocks: '1-3 filled rectangles, late half, no opening direct exit', pointsPerBlock: 10, lowerProofFreshSourceHash: true, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' },
  rows, productionChanged: false,
};
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.rmSync(PARTIAL, { force: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'progress.json'), `${JSON.stringify({ status: report.status, activeRuleVersion: '1.150.0', maxAttempts: MAX_ATTEMPTS, attempts: attemptCount, accepted: acceptedRows.length, blocked: rows.length - acceptedRows.length, productionChanged: false }, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT).replaceAll('\\', '/'), status: report.status, attempts: attemptCount, accepted: acceptedRows.length, blocked: rows.length - acceptedRows.length, seedAudit: round3SeedAudit.length }, null, 2));

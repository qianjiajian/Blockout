/*
 * Round-2 isolated finite audit for league indexes 65..100.
 *
 * This report is deliberately evidence-only. It never edits LEVELS, the
 * formal league registry, the selector, or player saves.  Spatial routes use
 * a bounded search (floor = target lower + 1); generator rows fall back to
 * the bounded authoritative route search.  Every returned route is replayed
 * against the same candidate object before it can be called a witness.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const INPUT = 'deliverables/league-regeneration-20261005/round2/mainline-reselected-candidates.json';
const OUT_DIR = 'deliverables/league-regeneration-20261005/round2/late';
const OUTPUT = `${OUT_DIR}/formal-65-100.json`;
const PARTIAL = `${OUTPUT}.partial`;
const candidateText = fs.readFileSync(INPUT, 'utf8');
const candidates = JSON.parse(candidateText);
const rows = candidates.rows.filter(row => row.index >= 65 && row.index <= 100);
if (rows.length !== 36) throw new Error(`expected 36 rows, got ${rows.length}`);

const clone = value => structuredClone(value);
const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const targetFor = difficulty => difficulty === 'super' ? { lower: 21, upper: 30 } : { lower: 16, upper: 20 };
const isRectangle = shape => {
  if (!Array.isArray(shape) || !shape.length) return false;
  const keys = new Set(shape.map(([x, y]) => `${x},${y}`));
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return keys.size === shape.length && keys.size === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
};
const routeExits = drags => drags.filter(drag => drag.exitSide);
const fallbackScoreBlocks = level => {
  const queued = new Set((level.generators ?? []).flatMap(generator => generator.queueBlockIds ?? []));
  return level.blocks.filter(block => !queued.has(block.id) && block.shutterId === undefined && block.frozen === undefined && !block.layers?.length && isRectangle(block.shape)).slice(-3).map(block => ({
  blockId: block.id,
  shape: 'filled-axis-aligned-rectangle',
  points: 10,
  clearStep: null,
  lateHalf: 'UNVERIFIED',
  completeClearVerified: false,
  }));
};

const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const routeBundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `export { searchRevisedLevel } from './src/core/revisedLevelSearch.ts';` },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { searchRevisedLevel } = await import(`data:text/javascript;base64,${Buffer.from(routeBundle.outputFiles[0].text).toString('base64')}`);
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `export { validateLevel } from './src/core/PuzzleModel.ts';` },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { validateLevel } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const ROUTE_BUDGET = { maxStates: 180000, maxTransitions: 900000, maxMilliseconds: 2000 };
const LOWER_BUDGET = { maxStates: 220000, maxTransitions: 1100000, maxMilliseconds: 2000 };
const RUNTIME_BUDGET = { maxStates: 18000, maxDragStates: 300, maxTransitions: 90000, maxMilliseconds: 2000 };

function scoreAudit(level, drags, replay) {
  const exits = routeExits(drags);
  const clearEvents = replay?.clearEvents ?? exits.length;
  const half = clearEvents / 2;
  const seen = new Set();
  const selected = [];
  exits.forEach((drag, index) => {
    if (seen.has(drag.blockId)) return;
    const block = level.blocks.find(candidate => candidate.id === drag.blockId);
    if (!block || !isRectangle(block.shape)) return;
    seen.add(drag.blockId);
    if (index + 1 > half && selected.length < 3) selected.push({
      blockId: drag.blockId,
      shape: 'filled-axis-aligned-rectangle',
      points: 10,
      clearStep: index + 1,
      lateHalf: true,
      completeClearVerified: true,
    });
  });
  const pending = selected.length ? selected : fallbackScoreBlocks(level);
  const status = Boolean(replay?.valid && replay.complete && selected.length >= 1 && selected.length <= 3 && pending.every(item => item.lateHalf === true));
  return {
    status: status ? 'PASS' : 'BLOCKED',
    pointsPerSpecial: 10,
    specialCount: pending.length,
    totalPoints: pending.length * 10,
    lateHalfRequired: true,
    clearEvents,
    specials: pending,
    runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  };
}

function serializeRoute(result) {
  if (!result) return null;
  return {
    status: result.status,
    termination: result.termination ?? null,
    exploredStates: result.exploredStates ?? null,
    discoveredStates: result.discoveredStates ?? null,
    attemptedTransitions: result.attemptedTransitions ?? null,
    elapsedMilliseconds: result.elapsedMilliseconds ?? null,
    reasons: result.reasons ?? [],
    cost: result.cost ?? null,
  };
}

const reportRows = [];
for (const entry of rows) {
  const level = clone(entry.level);
  const target = targetFor(entry.difficulty);
  const row = {
    index: entry.index,
    levelId: level.id,
    difficulty: entry.difficulty,
    sourceLevelId: entry.source?.levelId ?? null,
    candidateFingerprint: sha256({ blocks: level.blocks, gates: level.gates, shutters: level.shutters, generators: level.generators }),
    candidateLevelSha256: sha256(level),
    target,
    finiteBudget: { route: ROUTE_BUDGET, lowerProof: LOWER_BUDGET, runtimeRoute: RUNTIME_BUDGET, noInfiniteRetry: true },
    status: 'BLOCKED',
    formalEligibility: false,
    attempts: [],
  };
  try {
    validateLevel(level);
    row.validation = 'PASS';
  } catch (error) {
    row.validation = 'FAIL';
    row.failureReasons = [`structural:${error instanceof Error ? error.message : String(error)}`];
    row.scoreAudit = { status: 'BLOCKED', ...scoreAudit(level, [], null) };
    reportRows.push(row);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(PARTIAL, JSON.stringify({ status: 'PARTIAL', range: [65, 100], rows: reportRows }, null, 2) + '\n');
    continue;
  }

  const attempt = { attempt: 1, routeSource: 'spatial', reasons: [] };
  let witness = null;
  try {
    const spatial = searchSpatial(level, spatialApi, {
      ...ROUTE_BUDGET,
      // This is the requested finite route floor: route cost must stay below
      // lower+1 while seeking a complete witness.
      floor: target.lower + 1,
      normalize: true,
      orderSeed: entry.index,
    });
    attempt.spatial = serializeRoute(spatial);
    if ((spatial.status === 'witness' || spatial.status === 'relaxed-shortcut') && spatial.drags) witness = spatial.drags;
    if (!witness) {
      const runtimeRoute = searchRevisedLevel(level, RUNTIME_BUDGET);
      attempt.routeSource = 'runtime-fallback';
      attempt.runtime = serializeRoute(runtimeRoute);
      if (runtimeRoute.status === 'witness' && runtimeRoute.drags) witness = runtimeRoute.drags;
    }
  } catch (error) {
    attempt.reasons.push(`route-exception:${error instanceof Error ? error.message : String(error)}`);
  }

  if (witness) {
    row.routeWitness = witness;
    const replay = runtime.replayRevisedRoute(level, witness);
    row.replay = {
      valid: replay.valid,
      complete: replay.complete,
      effectiveDrags: replay.effectiveDrags,
      nonClearingDrags: replay.nonClearingDrags,
      clearEvents: replay.clearEvents,
      error: replay.error ?? null,
    };
    row.upperBound = {
      status: Number.isInteger(replay.nonClearingDrags) ? 'MEASURED_ROUTE' : 'BLOCKED',
      nonClearingDrags: replay.nonClearingDrags ?? null,
      inBand: Number.isInteger(replay.nonClearingDrags) && replay.nonClearingDrags >= target.lower && replay.nonClearingDrags <= target.upper,
    };
    row.scoreAudit = scoreAudit(level, witness, replay);
    if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
    else if (!row.upperBound.inBand) attempt.reasons.push('route-nonClearing-out-of-band');
  } else {
    row.replay = { valid: false, complete: false, effectiveDrags: null, nonClearingDrags: null, clearEvents: null, error: 'no finite route witness' };
    row.upperBound = { status: 'NOT_FOUND', nonClearingDrags: null, inBand: false };
    row.scoreAudit = scoreAudit(level, [], null);
    attempt.reasons.push('route-not-found-within-finite-budget');
  }

  let lower = null;
  try {
    lower = searchSpatial(level, spatialApi, {
      ...LOWER_BUDGET,
      floor: target.lower,
      prove: true,
      normalize: false,
      orderSeed: entry.index,
    });
  } catch (error) {
    lower = { status: 'invalid', termination: 'invalid', reasons: [error instanceof Error ? error.message : String(error)] };
  }
  row.lowerBound = {
    status: lower?.thresholdProven === true ? 'PROVEN' : 'BLOCKED',
    requestedFloor: target.lower,
    thresholdProven: lower?.thresholdProven === true,
    termination: lower?.termination ?? null,
    exploredStates: lower?.exploredStates ?? null,
    discoveredStates: lower?.discoveredStates ?? null,
    attemptedTransitions: lower?.attemptedTransitions ?? null,
    reasons: lower?.reasons ?? [],
  };
  if (row.lowerBound.status !== 'PROVEN') attempt.reasons.push('lower-bound-not-proven');

  row.attempts.push(attempt);
  row.failureReasons = [...new Set(attempt.reasons)];
  row.formalEligibility = row.validation === 'PASS'
    && row.replay.valid === true && row.replay.complete === true
    && row.upperBound.inBand === true
    && row.lowerBound.status === 'PROVEN'
    && row.scoreAudit.status === 'PASS';
  row.status = row.formalEligibility ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED';
  reportRows.push(row);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(PARTIAL, JSON.stringify({ status: 'PARTIAL', range: [65, 100], rows: reportRows }, null, 2) + '\n');
  console.log(JSON.stringify({ index: row.index, status: row.status, route: row.replay.nonClearingDrags, lower: row.lowerBound.status, score: row.scoreAudit.status }));
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  range: [65, 100],
  source: INPUT,
  sourceSha256: sha256(candidateText),
  finite: true,
  formalEligibility: reportRows.every(row => row.formalEligibility),
  thresholds: { hard: { lower: 16, upper: 20 }, super: { lower: 21, upper: 30 } },
  scorePolicy: { specialBlockCount: '1-3', specialBlockShape: 'filled-axis-aligned-rectangle', pointsPerSpecial: 10, successfulClearOnly: true, lateHalfRequired: true, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' },
  finitePolicy: 'One spatial route attempt at floor lower+1 with 2s budget, one runtime fallback at 2s when spatial abstraction is unsupported, and one lower-bound proof at floor lower with 2s budget. No infinite retries.',
  counts: {
    total: reportRows.length,
    accepted: reportRows.filter(row => row.formalEligibility).length,
    blocked: reportRows.filter(row => !row.formalEligibility).length,
    routeWitness: reportRows.filter(row => row.replay?.complete).length,
    lowerBoundProven: reportRows.filter(row => row.lowerBound?.status === 'PROVEN').length,
    scoreSettlementPass: reportRows.filter(row => row.scoreAudit?.status === 'PASS').length,
  },
  rows: reportRows,
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: OUTPUT, partial: PARTIAL, counts: report.counts, sourceSha256: report.sourceSha256 }, null, 2));

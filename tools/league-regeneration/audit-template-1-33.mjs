/*
 * Isolated formal audit for the mainline-template league candidates 1..33.
 *
 * This runner deliberately has finite candidate and solver budgets. It records
 * exact route/replay/lower-bound/late-score evidence but never writes any
 * production level registry, selector, or save data. A row is accepted only
 * when the same candidate has a replayable complete route inside its league
 * difficulty band, a complete lower-bound proof, and at least one rectangular
 * score block cleared after the halfway point. Score blocks are recorded as
 * 10 points each; the candidate data remains isolated until a separate formal
 * adoption review.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { retileAndRecolor, gameplayFingerprint } from './finite-search-policy.mjs';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const INPUT = 'deliverables/league-regeneration-20261005/template/mainline-template-candidates.json';
const OUTPUT = 'deliverables/league-regeneration-20261005/template/formal-1-33.json';
const MAX_VARIANTS = 4; // baseline + at most three real shape/colour mutations
const ROUTE_BUDGET = { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2500 };
const PROOF_BUDGET = { maxStates: 320000, maxTransitions: 1600000, maxMilliseconds: 4500 };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone = value => structuredClone(value);
const difficultyBand = difficulty => difficulty === 'super' ? [21, 30] : [16, 20];
const filledRectangle = shape => {
  if (!shape?.length) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return shape.length === area && new Set(shape.map(([x, y]) => `${x},${y}`)).size === shape.length;
};

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const shapeBundle = await build({
  stdin: { resolveDir: process.cwd(), contents: "export { FORMAL_BLOCK_SHAPES } from './src/game/formalBlockShapes.ts';" },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { FORMAL_BLOCK_SHAPES } = await import(`data:text/javascript;base64,${Buffer.from(shapeBundle.outputFiles[0].text).toString('base64')}`);

function candidateVariants(base) {
  const result = [clone(base)];
  // RetileAndRecolor only changes plain equal-area bodies, preserving occupied
  // cells and mechanism-bearing bodies. Invalid or duplicate variants remain
  // in the finite audit record and are never retried with a larger budget.
  for (const variant of retileAndRecolor(base, FORMAL_BLOCK_SHAPES, MAX_VARIANTS - 1)) {
    variant.mechanismRules = base.mechanismRules ?? 'revised-2026-09-27-v1.5';
    if (!result.some(existing => gameplayFingerprint(existing) === gameplayFingerprint(variant))) result.push(variant);
    if (result.length >= MAX_VARIANTS) break;
  }
  return result;
}

function scoreEvidence(level, drags) {
  const blockMap = new Map(level.blocks.map(block => [block.id, block]));
  const exitEvents = drags.filter(drag => drag.exitSide);
  const firstExit = new Map();
  exitEvents.forEach((drag, index) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, index + 1); });
  const rectangles = level.blocks.filter(block => !block.shutterId && filledRectangle(block.shape));
  const lateThreshold = Math.floor(exitEvents.length / 2) + 1;
  const late = rectangles
    .filter(block => (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3);
  const selected = late.map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return {
    status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED',
    candidateCount: rectangles.length,
    selected,
    lateThreshold,
    completeExitEvents: exitEvents.length,
    totalPoints: selected.length * 10,
    runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
    rule: 'rectangular-only; first successful clear in route second half; 10 points per fully cleared block',
  };
}

function routeSummary(route) {
  return {
    status: route.status,
    cost: route.cost ?? null,
    exploredStates: route.exploredStates ?? null,
    discoveredStates: route.discoveredStates ?? null,
    attemptedTransitions: route.attemptedTransitions ?? null,
    maxClearsSeen: route.maxClearsSeen ?? null,
    termination: route.termination ?? null,
    elapsedMilliseconds: route.elapsedMilliseconds ?? null,
  };
}

const rows = [];
for (const entry of data.entries.filter(item => item.index >= 1 && item.index <= 33).sort((a, b) => a.index - b.index)) {
  const target = difficultyBand(entry.difficulty);
  const attempts = [];
  let accepted = null;
  const variants = candidateVariants(entry.level);
  for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
    const level = variants[variantIndex];
    const attempt = {
      variantIndex,
      fingerprint: gameplayFingerprint(level),
      levelSha256: digest(level),
      status: 'BLOCKED',
      reasons: [],
      target: { lower: target[0], upper: target[1] },
    };
    try {
      spatialApi.validateLevel(level);
      const route = searchSpatial(level, spatialApi, {
        ...ROUTE_BUDGET,
        floor: target[1] + 1,
        normalize: true,
        orderSeed: entry.index + variantIndex * 17,
      });
      attempt.route = routeSummary(route);
      if (route.status !== 'witness' || !route.drags) {
        attempt.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`);
        attempts.push(attempt);
        continue;
      }
      attempt.routeLength = route.drags.length;
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = {
        valid: replay.valid,
        complete: replay.complete,
        nonClearingDrags: replay.nonClearingDrags,
        effectiveDrags: replay.effectiveDrags,
      };
      if (!replay.valid || !replay.complete) {
        attempt.reasons.push('runtime-replay-invalid-or-incomplete');
        attempts.push(attempt);
        continue;
      }
      if (replay.nonClearingDrags < target[0]) attempt.reasons.push('route-below-lower-target');
      if (replay.nonClearingDrags > target[1]) attempt.reasons.push('route-above-upper-target');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, {
        ...PROOF_BUDGET,
        floor: target[0],
        prove: true,
        normalize: false,
        orderSeed: entry.index + variantIndex * 17,
      });
      attempt.lowerBound = routeSummary(lower);
      attempt.lowerBound.thresholdProven = lower.thresholdProven === true;
      if (!lower.thresholdProven) {
        attempt.reasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`);
        attempts.push(attempt);
        continue;
      }
      attempt.scoreBlocks = scoreEvidence(level, route.drags);
      if (attempt.scoreBlocks.status !== 'PASS') {
        attempt.reasons.push('no-late-rectangular-score-block');
        attempts.push(attempt);
        continue;
      }
      attempt.status = 'FORMAL_CANDIDATE_READY';
      attempt.routeSha256 = digest(route.drags);
      attempt.level = level;
      attempt.drags = route.drags;
      accepted = attempt;
      attempts.push(attempt);
      break;
    } catch (error) {
      attempt.reasons.push(`error:${error instanceof Error ? error.message : String(error)}`);
      attempts.push(attempt);
    }
  }
  const best = accepted ?? attempts[attempts.length - 1];
  rows.push({
    index: entry.index,
    candidateId: entry.level.id,
    templateSourceId: entry.templateSource?.levelId ?? entry.index,
    difficulty: entry.difficulty,
    target: { lower: target[0], upper: target[1] },
    status: accepted ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED',
    attempts,
    selectedAttempt: accepted ? accepted.variantIndex : null,
    reasons: accepted ? [] : [...new Set(attempts.flatMap(attempt => attempt.reasons))],
    levelSha256: accepted?.levelSha256 ?? best?.levelSha256 ?? null,
    routeSha256: accepted?.routeSha256 ?? null,
    formalEligibility: Boolean(accepted),
  });
  // Keep a machine-readable partial artifact after each row if the runner is
  // interrupted; the final write below supersedes it atomically.
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(`${OUTPUT}.partial`, JSON.stringify({ status: 'PARTIAL', range: [1, 33], rows }, null, 2) + '\n');
}

const acceptedRows = rows.filter(row => row.status === 'FORMAL_CANDIDATE_READY');
const report = {
  status: acceptedRows.length === rows.length ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES',
  generatedAt: new Date().toISOString(),
  source: INPUT,
  range: [1, 33],
  accepted: acceptedRows.length,
  blocked: rows.filter(row => row.status !== 'FORMAL_CANDIDATE_READY').map(row => row.index),
  finiteBudget: {
    maxVariantsPerLevel: MAX_VARIANTS,
    route: ROUTE_BUDGET,
    lowerBoundProof: PROOF_BUDGET,
    mutation: 'baseline plus bounded equal-area plain-body retile/recolour variants',
    noInfiniteRetry: true,
  },
  scoringContract: { scoreBlockCount: '1-3', pointsPerBlock: 10, lateHalfRequired: true, failedOrExitedRunScores: 0, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' },
  formalEligibility: acceptedRows.length === rows.length ? 'ready for independent adoption review' : 'blocked rows require another finite redesign batch',
  rows,
};
fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, accepted: report.accepted, blocked: report.blocked, output: OUTPUT }, null, 2));

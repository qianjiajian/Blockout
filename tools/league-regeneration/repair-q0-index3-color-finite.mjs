/*
 * Bounded strict-Q0 repair for league index 3.
 *
 * The original index-3 candidate has four opening adjacent-colour contacts.
 * This isolated pass keeps the board, shapes, mechanisms and score-block
 * geometry unchanged, and evaluates four finite colour assignments for the
 * six blocks in that contact neighbourhood.  Every accepted candidate gets a
 * fresh route search, runtime replay, fresh super-band lower-bound proof and
 * score timing audit.  No production file is touched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import {
  canonicalLevelHash,
  evidenceCheck,
  mechanismCheck,
  normalizedPuzzleKey,
  openingAudit,
  rawJsonHash,
} from './round3-contract.mjs';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json');
const OUTPUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-repair-index3-color');
const OUTPUT = path.join(OUTPUT_DIR, 'formal-q0-index3-color-repair.json');
const ROW_OUTPUT = path.join(OUTPUT_DIR, 'formal-q0-index3-color-candidates.json');
const MAX_ATTEMPTS = 4;
const clone = value => JSON.parse(JSON.stringify(value));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const source = input.rows.find(row => Number(row.index) === 3);
if (!source?.accepted?.level) throw new Error('Missing accepted source row for index 3');
const base = clone(source.accepted.level);
const target = [21, 30];
const ids = [
  'r102-158-o17',
  'r102-158-o8',
  'r102-158-h0-fill0',
  'r102-158-h0-fill1',
  'r102-158-o19',
  'r102-158-h1-fill0',
];
// These four assignments are the complete minimum-change Q0 solutions for
// this local contact graph while preserving all other block colours.
const assignments = [
  ['blue', 'blue', 'green', 'green', 'green', 'red'],
  ['blue', 'blue', 'green', 'yellow', 'green', 'red'],
  ['blue', 'blue', 'yellow', 'green', 'green', 'red'],
  ['blue', 'blue', 'yellow', 'yellow', 'green', 'red'],
];

const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const replayRoute = async (level, drags) => runtime.replayRevisedRoute(level, drags);

const filledRectangle = shape => {
  if (!Array.isArray(shape) || !shape.length) return false;
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return cells.size === shape.length
    && cells.size === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
};

function scoreEvidence(level, drags) {
  const exits = drags.filter(drag => drag.exitSide);
  const firstExit = new Map();
  const firstAction = new Map();
  for (const [index, drag] of drags.entries()) {
    if (!firstAction.has(drag.blockId)) firstAction.set(drag.blockId, { index, exit: Boolean(drag.exitSide) });
    if (drag.exitSide && !firstExit.has(drag.blockId)) {
      firstExit.set(drag.blockId, exits.findIndex(item => item === drag) + 1);
    }
  }
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? [])
    .filter(block => !block.shutterId && filledRectangle(block.shape)
      && (firstExit.get(block.id) ?? Infinity) >= lateThreshold
      && !firstAction.get(block.id)?.exit)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity)
      || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return {
    status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED',
    selected,
    lateThreshold,
    completeExitEvents: exits.length,
    totalPoints: selected.length * 10,
    runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  };
}

function buildCandidate(assignment, attempt) {
  const level = clone(base);
  const changes = [];
  ids.forEach((id, i) => {
    const block = level.blocks.find(item => item.id === id);
    const next = assignment[i];
    if (!block || !next) throw new Error(`Missing target block ${id}`);
    if (block.color !== next) changes.push({ id, from: block.color, to: next });
    block.color = next;
  });
  level.id = Number(base.id) * 1000 + 30 + attempt;
  level.name = `${base.name ?? '荣耀联赛3'}·严格Q0颜色修复${attempt}`;
  return {
    level,
    mutation: { kind: 'finite-q0-index3-local-colour-assignment', attempt, changes },
  };
}

async function auditCandidate(built, attempt) {
  const level = built.level;
  const out = {
    attempt,
    index: 3,
    target,
    candidateLevelId: level.id,
    fingerprint: digest(level),
    geometryKey: normalizedPuzzleKey(level),
    mutation: built.mutation,
    status: 'BLOCKED',
    reasons: [],
  };
  try {
    out.mechanism = mechanismCheck(level, 3);
    out.opening = openingAudit(level);
    if (out.mechanism.status !== 'PASS') out.reasons.push(...out.mechanism.errors);
    if (out.opening.missingCells.length) out.reasons.push(`q0-missing:${out.opening.missingCells.length}`);
    if (out.opening.overlaps.length) out.reasons.push(`q0-overlap:${out.opening.overlaps.length}`);
    if (out.opening.adjacentSameColor.length) out.reasons.push(`q0-adjacent-same-color:${out.opening.adjacentSameColor.length}`);
    if (out.reasons.length) return out;

    const route = searchSpatial(level, spatialApi, {
      maxStates: 900000,
      maxTransitions: 5000000,
      maxMilliseconds: 60000,
      floor: target[1] + 1,
      normalize: true,
      orderSeed: attempt - 1,
    });
    out.route = {
      status: route.status,
      cost: route.cost ?? null,
      termination: route.termination ?? null,
      exploredStates: route.exploredStates ?? null,
      attemptedTransitions: route.attemptedTransitions ?? null,
      elapsedMilliseconds: route.elapsedMilliseconds ?? null,
    };
    if (route.status !== 'witness' || !route.drags) {
      out.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`);
      return out;
    }

    const replay = await replayRoute(level, route.drags);
    out.replay = {
      valid: replay.valid,
      complete: replay.complete,
      failed: replay.failed,
      nonClearingDrags: replay.nonClearingDrags,
      effectiveDrags: replay.effectiveDrags,
    };
    if (!replay.valid || !replay.complete) out.reasons.push('runtime-replay-invalid-or-incomplete');
    if (replay.nonClearingDrags < target[0]) out.reasons.push(`route-below-lower-target:${replay.nonClearingDrags}`);
    if (replay.nonClearingDrags > target[1]) out.reasons.push(`route-above-upper-target:${replay.nonClearingDrags}`);
    if (out.reasons.length) return out;

    const lower = searchSpatial(level, spatialApi, {
      maxStates: 900000,
      maxTransitions: 5000000,
      maxMilliseconds: 60000,
      floor: target[0],
      prove: true,
      normalize: false,
      orderSeed: 31 + attempt,
    });
    out.lowerBound = {
      status: lower.status,
      thresholdProven: lower.thresholdProven === true,
      termination: lower.termination ?? null,
      floor: target[0],
      exploredStates: lower.exploredStates ?? null,
      attemptedTransitions: lower.attemptedTransitions ?? null,
      elapsedMilliseconds: lower.elapsedMilliseconds ?? null,
      sourceLevelSha256: rawJsonHash(level),
      sourceLevelCanonicalSha256: canonicalLevelHash(level),
    };
    if (lower.thresholdProven !== true) {
      out.reasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`);
      return out;
    }

    out.scoreBlocks = scoreEvidence(level, route.drags);
    if (out.scoreBlocks.status !== 'PASS' || out.scoreBlocks.totalPoints !== 30) {
      out.reasons.push('score-block-count-or-opening-direct-exit');
      return out;
    }

    const accepted = {
      sourceLevelId: source.accepted.sourceLevelId,
      candidateLevelId: level.id,
      fingerprint: out.fingerprint,
      geometryKey: out.geometryKey,
      levelSha256: rawJsonHash(level),
      routeSha256: rawJsonHash(route.drags),
      level,
      drags: route.drags,
      lowerBound: out.lowerBound,
      route: out.route,
      replay: out.replay,
      scoreBlocks: out.scoreBlocks,
      mutation: built.mutation,
      opening: out.opening,
      mechanism: out.mechanism,
    };
    const contract = await evidenceCheck({ ...source, status: 'FORMAL_CANDIDATE_READY', formalEligibility: true, accepted }, { strictQ0: true, replayRoute });
    out.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings };
    if (contract.status !== 'PASS') {
      out.reasons.push(...contract.errors.map(error => `contract:${error}`));
      return out;
    }
    out.status = 'FORMAL_CANDIDATE_READY';
    out.accepted = accepted;
  } catch (error) {
    out.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`);
  }
  return out;
}

const attempts = [];
for (let i = 0; i < Math.min(MAX_ATTEMPTS, assignments.length); i += 1) {
  const built = buildCandidate(assignments[i], i + 1);
  attempts.push(await auditCandidate(built, i + 1));
}
const accepted = attempts.filter(attempt => attempt.status === 'FORMAL_CANDIDATE_READY');
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  activeRuleVersion: '1.150.0',
  scope: 'isolated-index3-strict-q0-finite-colour-repair',
  source: 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json#index3',
  contract: {
    difficulty: 'super',
    target,
    strictQ0: { fullCover: true, noOverlap: true, adjacentSameColor: 0 },
    freshRouteReplay: true,
    freshLowerBoundProof: true,
    scoreBlocks: '1-3 filled rectangles, late half, 10 points each, no opening direct exit',
    runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  },
  counts: {
    attempts: attempts.length,
    accepted: accepted.length,
    blocked: attempts.length - accepted.length,
    finiteBudgetSatisfied: attempts.length <= MAX_ATTEMPTS,
  },
  attempts,
  productionChanged: false,
};
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(ROW_OUTPUT, `${JSON.stringify({
  schemaVersion: 1,
  rows: accepted.map(attempt => ({
    index: 3,
    difficulty: 'super',
    target,
    status: attempt.status,
    formalEligibility: true,
    accepted: attempt.accepted,
  })),
  productionChanged: false,
}, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(ROOT, OUTPUT).replaceAll('\\', '/'),
  candidates: path.relative(ROOT, ROW_OUTPUT).replaceAll('\\', '/'),
  counts: report.counts,
  statuses: attempts.map(attempt => ({ attempt: attempt.attempt, status: attempt.status, reasons: attempt.reasons })),
}, null, 2));

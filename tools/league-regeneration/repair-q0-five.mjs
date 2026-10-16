/*
 * Bounded Q0 repair for the five round-2 rows left after lower-bound
 * evidence binding.  Each attempt only swaps the colours of two existing
 * blocks (a real local content change preserving colour cardinality); no
 * block is added/deleted and no route or proof is copied from the base row.
 * Every accepted candidate gets a fresh spatial witness, runtime replay,
 * fresh lower-bound threshold proof, score-block timing audit and strict Q0
 * contract check.  This is an isolated report and never writes production.
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
const OUTPUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-repair');
const OUTPUT = path.join(OUTPUT_DIR, 'q0-repair-report.json');
const ROW_OUTPUT = path.join(OUTPUT_DIR, 'q0-repaired-candidates.json');
const TARGET_INDEXES = [3, 15, 16, 17, 19];
const MAX_ATTEMPTS_PER_ROW = 12;
const PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const clone = value => JSON.parse(JSON.stringify(value));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const sourceRows = new Map((input.rows ?? []).map(row => [Number(row.index), row]));
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const replayRoute = async (level, drags) => runtime.replayRevisedRoute(level, drags);

const targetBand = row => {
  const target = row.target ?? row.accepted?.target;
  if (Array.isArray(target)) return [Number(target[0]), Number(target[1])];
  if (target && Number.isFinite(Number(target.lower))) return [Number(target.lower), Number(target.upper)];
  return Number(row.index) === 3 ? [21, 30] : [16, 20];
};

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
    if (drag.exitSide && !firstExit.has(drag.blockId)) firstExit.set(drag.blockId, exits.findIndex(item => item === drag) + 1);
  }
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? [])
    .filter(block => !block.shutterId && filledRectangle(block.shape)
      && (firstExit.get(block.id) ?? Infinity) >= lateThreshold
      && !firstAction.get(block.id)?.exit)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
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

function swapColours(base, aIndex, bIndex, attempt) {
  const level = clone(base);
  const a = level.blocks?.[aIndex];
  const b = level.blocks?.[bIndex];
  if (!a || !b || a.color === b.color) return null;
  // Keep layer semantics intact. A colour swap is applied to visible colour
  // and corresponding layer stacks only when the stacks are one-colour plain
  // blocks; mechanisms and score geometry remain untouched.
  const blocked = block => block.frozen || block.shutterId || block.movementAxis || block.keyId || block.lockedBy || block.star || (block.layers?.length ?? 1) > 1;
  if (blocked(a) || blocked(b)) return null;
  [a.color, b.color] = [b.color, a.color];
  const levelId = Number(base.id) * 100 + attempt;
  level.id = levelId;
  level.name = `${base.name ?? '荣耀联赛'}·Q0修复${attempt}`;
  return {
    level,
    mutation: {
      kind: 'finite-q0-colour-swap',
      pair: [a.id, b.id],
      oldColours: [b.color, a.color],
      newColours: [a.color, b.color],
      attempt,
    },
  };
}

/* A bounded five-block recolouring found by the finite adjacency solver for
 * index 3.  It is deliberately listed as one candidate, rather than letting
 * the solver run during this audit.  The changed IDs form a small local
 * neighbourhood around the two hidden fill areas and preserve the colour
 * multiset; the later strict opening audit remains the authority. */
function index3PreferredMutation(base) {
  const assignments = new Map([
    ['r102-158-o7', 'blue'],
    ['r102-158-h0-fill0', 'yellow'],
    ['r102-158-h0-fill1', 'green'],
    ['r102-158-h1-fill0', 'red'],
    ['r102-158-h1-fill1', 'blue'],
  ]);
  const level = clone(base);
  const changes = [];
  for (const block of level.blocks ?? []) {
    const next = assignments.get(block.id);
    if (!next || next === block.color) continue;
    changes.push({ id: block.id, from: block.color, to: next });
    block.color = next;
  }
  if (changes.length !== assignments.size) return null;
  level.id = Number(base.id) * 100 + 1;
  level.name = `${base.name ?? '荣耀联赛'}·Q0修复优选`;
  return {
    level,
    mutation: { kind: 'finite-q0-local-five-colour-cycle', changes },
  };
}

async function auditCandidate(row, built, attemptNumber, target) {
  const level = built.level;
  const attempt = {
    attempt: attemptNumber,
    index: Number(row.index),
    target,
    candidateLevelId: level.id,
    fingerprint: digest(level),
    geometryKey: normalizedPuzzleKey(level),
    mutation: built.mutation,
    status: 'BLOCKED',
    reasons: [],
  };
  let opening;
  try {
    const mechanism = mechanismCheck(level, Number(row.index));
    attempt.mechanism = mechanism;
    opening = openingAudit(level);
    attempt.opening = opening;
    if (mechanism.status !== 'PASS') attempt.reasons.push(...mechanism.errors);
    if (opening.missingCells.length) attempt.reasons.push(`q0-missing:${opening.missingCells.length}`);
    if (opening.overlaps.length) attempt.reasons.push(`q0-overlap:${opening.overlaps.length}`);
    if (opening.adjacentSameColor.length) attempt.reasons.push(`q0-adjacent-same-color:${opening.adjacentSameColor.length}`);
    if (attempt.reasons.length) return attempt;

    const route = searchSpatial(level, spatialApi, {
      maxStates: Number(row.index) === 3 ? 900000 : 220000,
      maxTransitions: Number(row.index) === 3 ? 5000000 : 1000000,
      maxMilliseconds: Number(row.index) === 3 ? 60000 : 2600,
      floor: target[1] + 1,
      normalize: true,
      orderSeed: Number(row.index) * 100 + attemptNumber,
    });
    attempt.route = {
      status: route.status,
      cost: route.cost ?? null,
      termination: route.termination ?? null,
      exploredStates: route.exploredStates ?? null,
      attemptedTransitions: route.attemptedTransitions ?? null,
      elapsedMilliseconds: route.elapsedMilliseconds ?? null,
    };
    if (route.status !== 'witness' || !route.drags) {
      attempt.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`);
      return attempt;
    }
    const replay = await replayRoute(level, route.drags);
    attempt.replay = {
      valid: replay.valid,
      complete: replay.complete,
      failed: replay.failed,
      nonClearingDrags: replay.nonClearingDrags,
      effectiveDrags: replay.effectiveDrags,
    };
    if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
    if (replay.nonClearingDrags < target[0]) attempt.reasons.push(`route-below-lower-target:${replay.nonClearingDrags}`);
    if (replay.nonClearingDrags > target[1]) attempt.reasons.push(`route-above-upper-target:${replay.nonClearingDrags}`);
    if (attempt.reasons.length) return attempt;

    const lower = searchSpatial(level, spatialApi, {
      maxStates: Number(row.index) === 3 ? 900000 : 240000,
      maxTransitions: Number(row.index) === 3 ? 5000000 : 1100000,
      maxMilliseconds: Number(row.index) === 3 ? 60000 : 3000,
      floor: target[0],
      prove: true,
      normalize: false,
      orderSeed: Number(row.index) * 100 + attemptNumber + 31,
    });
    attempt.lowerBound = {
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
      attempt.reasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`);
      return attempt;
    }
    const scoreBlocks = scoreEvidence(level, route.drags);
    attempt.scoreBlocks = scoreBlocks;
    if (scoreBlocks.status !== 'PASS') {
      attempt.reasons.push('score-block-count-or-opening-direct-exit');
      return attempt;
    }

    const accepted = {
      sourceLevelId: row.accepted.sourceLevelId,
      candidateLevelId: level.id,
      fingerprint: attempt.fingerprint,
      geometryKey: attempt.geometryKey,
      levelSha256: rawJsonHash(level),
      routeSha256: rawJsonHash(route.drags),
      level,
      drags: route.drags,
      lowerBound: attempt.lowerBound,
      route: attempt.route,
      replay: attempt.replay,
      scoreBlocks,
      mutation: built.mutation,
      opening,
      mechanism,
    };
    const candidateRow = { ...row, accepted, status: 'FORMAL_CANDIDATE_READY', formalEligibility: true };
    const contract = await evidenceCheck(candidateRow, { strictQ0: true, replayRoute });
    attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
    if (contract.status !== 'PASS') {
      attempt.reasons.push(...contract.errors.map(error => `contract:${error}`));
      return attempt;
    }
    attempt.status = 'FORMAL_CANDIDATE_READY';
    attempt.accepted = accepted;
    return attempt;
  } catch (error) {
    attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`);
    return attempt;
  }
}

const rows = [];
const acceptedRows = [];
for (const index of TARGET_INDEXES) {
  const baseRow = sourceRows.get(index);
  if (!baseRow?.accepted?.level) {
    rows.push({ index, status: 'BLOCKED', attempts: [], reasons: ['source-row-missing'], formalEligibility: false });
    continue;
  }
  const target = targetBand(baseRow);
  const base = baseRow.accepted.level;
  const candidates = [];
  const seen = new Set();
  const q0 = openingAudit(base).adjacentSameColor;
  const focusIds = [...new Set(q0.flat())];
  const allBlocks = base.blocks ?? [];
  if (index === 3) {
    const preferred = index3PreferredMutation(base);
    if (preferred) {
      seen.add(digest(preferred.level));
      candidates.push(preferred);
    }
  }
  // Try each offending block against deterministic remote plain blocks first,
  // then fill the remaining budget with all plain unequal pairs. A maximum of
  // twelve attempts is enforced per row, regardless of search termination.
  for (const focusId of focusIds) {
    const focusIndex = allBlocks.findIndex(block => block.id === focusId);
    for (let otherIndex = 0; otherIndex < allBlocks.length && candidates.length < MAX_ATTEMPTS_PER_ROW; otherIndex += 1) {
      if (otherIndex === focusIndex) continue;
      const built = swapColours(base, focusIndex, otherIndex, candidates.length + 1);
      if (!built) continue;
      const fp = digest(built.level);
      if (seen.has(fp)) continue;
      seen.add(fp);
      candidates.push(built);
    }
    if (candidates.length >= MAX_ATTEMPTS_PER_ROW) break;
  }
  // In case all focused blocks were mechanism-bearing, fill the finite budget
  // with ordinary unequal pairs without exceeding the same cap.
  for (let a = 0; a < allBlocks.length && candidates.length < MAX_ATTEMPTS_PER_ROW; a += 1) {
    for (let b = a + 1; b < allBlocks.length && candidates.length < MAX_ATTEMPTS_PER_ROW; b += 1) {
      const built = swapColours(base, a, b, candidates.length + 1);
      if (!built) continue;
      const fp = digest(built.level);
      if (seen.has(fp)) continue;
      seen.add(fp);
      candidates.push(built);
    }
  }
  const attempts = [];
  let accepted = null;
  for (const [offset, built] of candidates.entries()) {
    const attempt = await auditCandidate(baseRow, built, offset + 1, target);
    attempts.push(attempt);
    if (attempt.status === 'FORMAL_CANDIDATE_READY') {
      accepted = attempt.accepted;
      break;
    }
  }
  const result = {
    index,
    difficulty: index === 3 ? 'super' : 'hard',
    target,
    status: accepted ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED',
    formalEligibility: Boolean(accepted),
    accepted,
    attempts,
    attemptsExecuted: attempts.length,
    maxAttempts: MAX_ATTEMPTS_PER_ROW,
    baseQ0AdjacentSameColor: q0,
  };
  rows.push(result);
  if (accepted) acceptedRows.push(result);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(`${OUTPUT}.partial`, `${JSON.stringify({ status: 'PARTIAL', rows, productionChanged: false }, null, 2)}\n`);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  activeRuleVersion: '1.150.0',
  scope: 'isolated-five-row-strict-q0-finite-repair',
  source: 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json',
  contract: {
    strictQ0: { fullCover: true, noOverlap: true, adjacentSameColor: 0 },
    maxAttemptsPerRow: MAX_ATTEMPTS_PER_ROW,
    mutation: 'local colour swaps only; no route/proof copy',
    freshRouteReplay: true,
    freshLowerBoundProof: true,
    scoreBlocks: '1-3 filled rectangles, late half, 10 points each, no opening direct exit',
    runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  },
  counts: {
    rows: rows.length,
    expectedRows: TARGET_INDEXES.length,
    accepted: acceptedRows.length,
    blocked: rows.length - acceptedRows.length,
    attemptsExecuted: rows.reduce((sum, row) => sum + Number(row.attemptsExecuted ?? 0), 0),
    finiteBudgetSatisfied: rows.every(row => Number(row.attemptsExecuted ?? 0) <= MAX_ATTEMPTS_PER_ROW),
  },
  rows,
  productionChanged: false,
};
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(ROW_OUTPUT, `${JSON.stringify({
  schemaVersion: 1,
  rows: acceptedRows.map(row => ({
    index: row.index,
    difficulty: row.difficulty,
    target: row.target,
    status: row.status,
    formalEligibility: row.formalEligibility,
    accepted: row.accepted,
  })),
  productionChanged: false,
}, null, 2)}\n`);
fs.rmSync(`${OUTPUT}.partial`, { force: true });
console.log(JSON.stringify({
  output: path.relative(ROOT, OUTPUT).replaceAll('\\', '/'),
  candidates: path.relative(ROOT, ROW_OUTPUT).replaceAll('\\', '/'),
  counts: report.counts,
  statuses: rows.map(row => ({ index: row.index, status: row.status, attempts: row.attemptsExecuted })),
}, null, 2));

/*
 * Finite isolated repair for the repeated 6x9 hard band (10/11/12/14).
 * The source payload is never edited.  Each slot gets one real three-block
 * position mutation (a swap or a three-cycle), then fresh route/lower-bound,
 * replay, score and strict-Q0 evidence are recorded in full.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-group-10-14-final');
const OUT = path.join(OUT_DIR, 'position-variants.json');
const TARGETS = [10, 11, 12, 14];
const MAX_VARIANTS_PER_SLOT = 8;
const MUTATIONS = Object.freeze({
  10: { type: 'swap', blocks: [0, 2] },
  11: { type: 'cycle', blocks: [3, 4, 7], direction: 0 },
  12: { type: 'swap', blocks: [3, 7] },
  14: { type: 'swap', blocks: [4, 8] },
});
const clone = value => structuredClone(value);

function mutate(base, spec) {
  const level = clone(base);
  const indices = spec.blocks;
  const positions = indices.map(index => [base.blocks[index].x, base.blocks[index].y]);
  if (spec.type === 'swap') {
    for (const index of indices) {
      const other = indices[0] === index ? indices[1] : indices[0];
      level.blocks[index].x = base.blocks[other].x;
      level.blocks[index].y = base.blocks[other].y;
    }
  } else {
    // direction 0: first <- third, second <- first, third <- second.
    const permutation = spec.direction === 0
      ? [positions[2], positions[0], positions[1]]
      : [positions[1], positions[2], positions[0]];
    indices.forEach((index, i) => {
      level.blocks[index].x = permutation[i][0];
      level.blocks[index].y = permutation[i][1];
    });
  }
  return level;
}

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(drag => drag.exitSide);
  const firstExit = new Map();
  exits.forEach((drag, i) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, i + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const filled = shape => {
    if (!Array.isArray(shape) || shape.length === 0) return false;
    const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
    const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
    return cells.size === shape.length
      && shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  };
  const selected = (level.blocks ?? []).filter(block => !block.shutterId && filled(block.shape)
    && (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity)
      || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return {
    status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED',
    selected, lateThreshold, completeExitEvents: exits.length,
    totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  };
}

const source = JSON.parse(fs.readFileSync(path.join(ROOT,
  'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json'), 'utf8'));
const rowsByIndex = new Map((source.rows ?? []).map(row => [row.index, row]));
const formal = JSON.parse(fs.readFileSync(path.join(ROOT,
  'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json'), 'utf8'));
const reserved = new Set((formal.checks ?? []).map(row => row.geometryKey).filter(Boolean));
const api = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const acceptedCandidates = [];
const rows = [];

for (const index of TARGETS) {
  const sourceRow = rowsByIndex.get(index);
  const base = sourceRow?.accepted?.level;
  const targetRaw = sourceRow?.target ?? { lower: 16, upper: 20 };
  const target = Array.isArray(targetRaw)
    ? [Number(targetRaw[0]), Number(targetRaw[1])]
    : [Number(targetRaw.lower), Number(targetRaw.upper)];
  const spec = MUTATIONS[index];
  const variants = [];
  if (!base || !spec) {
    rows.push({ index, status: 'BLOCKED', variants: [{ status: 'BLOCKED', reasons: ['source-or-mutation-missing'] }] });
    continue;
  }
  const level = mutate(base, spec);
  level.id = 997000 + index;
  level.name = `荣耀联赛几何三格去重·${index}`;
  const geometryKey = normalizedPuzzleKey(level);
  const attempt = { index, variant: 1, mutation: spec, status: 'BLOCKED', reasons: [], geometryKey,
    sourceLevelSha256: rawJsonHash(base), levelSha256: rawJsonHash(level), level };
  const opening = openingAudit(level);
  attempt.opening = opening;
  if (reserved.has(geometryKey)) attempt.reasons.push('duplicate-formal-geometry');
  if (opening.status !== 'PASS') attempt.reasons.push('opening-audit-failed');
  if (attempt.reasons.length) { variants.push(attempt); rows.push({ index, status: 'BLOCKED', variants }); continue; }
  const seed = 500 + index;
  const route = searchSpatial(level, api, {
    maxStates: 320000, maxTransitions: 1300000, maxMilliseconds: 3500,
    floor: target[1] + 1, normalize: true, orderSeed: seed,
  });
  attempt.route = { status: route.status, cost: route.cost ?? null,
    termination: route.termination ?? null, exploredStates: route.exploredStates ?? null,
    attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
  if (route.status !== 'witness' || !route.drags) attempt.reasons.push(`route-${route.status}`);
  let replay, lower, scoreBlocks;
  if (!attempt.reasons.length) {
    replay = runtime.replayRevisedRoute(level, route.drags);
    attempt.replay = { valid: replay.valid, complete: replay.complete,
      nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
    if (!replay.valid || !replay.complete || replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) {
      attempt.reasons.push('route-replay-out-of-band');
    }
  }
  if (!attempt.reasons.length) {
    lower = searchSpatial(level, api, {
      maxStates: 320000, maxTransitions: 1300000, maxMilliseconds: 3500,
      floor: target[0], prove: true, normalize: false, orderSeed: seed,
    });
    attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true,
      floor: target[0], termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null,
      attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null,
      sourceLevelSha256: rawJsonHash(level) };
    if (lower.thresholdProven !== true) attempt.reasons.push(`lower-${lower.status}`);
  }
  if (!attempt.reasons.length) {
    scoreBlocks = scoreEvidence(level, route.drags); attempt.scoreBlocks = scoreBlocks;
    if (scoreBlocks.status !== 'PASS') attempt.reasons.push('no-late-rectangular-score-block');
  }
  if (!attempt.reasons.length) {
    const candidate = { index, target: { lower: target[0], upper: target[1] }, level,
      levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags,
      route: attempt.route, lowerBound: attempt.lowerBound, replay: attempt.replay,
      scoreBlocks: attempt.scoreBlocks, geometryKey, sourceLevelSha256: rawJsonHash(base), mutation: spec };
    const contract = await evidenceCheck(candidate, {
      strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags),
    });
    attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
    if (contract.status === 'PASS') { attempt.status = 'FORMAL_CANDIDATE_READY'; acceptedCandidates.push(candidate); reserved.add(geometryKey); }
    else attempt.reasons.push(...contract.errors);
  }
  variants.push(attempt);
  rows.push({ index, status: attempt.status === 'FORMAL_CANDIDATE_READY' ? attempt.status : 'BLOCKED',
    geometryKey, levelSha256: attempt.levelSha256, variants });
}

const report = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0',
  scope: 'isolated finite real three-block position variants for duplicate group 10/11/12/14; production unchanged',
  targets: TARGETS, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS_PER_SLOT, attemptedPerSlot: 1, noInfiniteRetry: true },
  counts: { slots: TARGETS.length, accepted: acceptedCandidates.length,
    blocked: TARGETS.length - acceptedCandidates.length,
    uniqueGeometry: new Set(acceptedCandidates.map(row => row.geometryKey)).size },
  acceptedCandidates, rows, productionChanged: false,
  status: acceptedCandidates.length === TARGETS.length ? 'GEOMETRY_GROUP_10_14_READY' : 'GEOMETRY_GROUP_10_14_FINDINGS',
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: report.status, counts: report.counts }, null, 2));

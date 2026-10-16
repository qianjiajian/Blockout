/*
 * Isolated finite repair for canonical-geometry group 10/11/12/14.
 * Every slot starts from its own accepted payload.  Only ordinary blocks with
 * the same footprint are position-swapped; mechanism blocks and their
 * relationships are untouched.  At most eight candidates are examined per
 * slot and the complete candidate payload is retained for independent replay.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-group-10-14');
const OUT = path.join(OUT_DIR, 'group-10-14.json');
const PARTIAL = `${OUT}.partial`;
const TARGETS = [10, 11, 12, 14];
const MAX_VARIANTS = 8;
const clone = value => structuredClone(value);

function sourceRows() {
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json'), 'utf8'));
  return new Map((report.rows ?? []).filter(row => row.accepted?.level).map(row => [row.index, row]));
}

function mutationCandidates(level) {
  const candidates = [];
  const seen = new Set();
  for (let a = 0; a < (level.blocks ?? []).length; a += 1) for (let b = a + 1; b < (level.blocks ?? []).length; b += 1) {
    const first = level.blocks[a], second = level.blocks[b];
    if (!first || !second || first.shutterId || second.shutterId || first.frozen || second.frozen
      || first.layers || second.layers || first.movementAxis || second.movementAxis
      || first.keyId || second.keyId || first.lockedBy || second.lockedBy
      || first.star || second.star || first.timedBombSeconds || second.timedBombSeconds) continue;
    if (JSON.stringify(first.shape) !== JSON.stringify(second.shape) || first.color === second.color) continue;
    // Two bars in this mask are adjacent.  A bare position swap frequently
    // creates a same-colour opening adjacency, so pair it with a *local*
    // three-block colour permutation.  The multiset of colours is preserved;
    // no palette-wide recolour or mechanism field is touched.
    for (let c = 0; c < (level.blocks ?? []).length; c += 1) {
      if (c === a || c === b) continue;
      const third = level.blocks[c];
      if (!third || third.shutterId || third.frozen || third.layers || JSON.stringify(third.shape) !== JSON.stringify(first.shape)) continue;
      const colors = [first.color, second.color, third.color];
      for (const order of [[1, 2, 0], [2, 0, 1], [2, 1, 0], [1, 0, 2], [0, 2, 1], [0, 1, 2]]) {
        const candidate = { pair: [a, b], colorBlocks: [a, b, c], colors: order.map(i => colors[i]) };
        const probe = positionSwap(level, candidate, 0, 0);
        const key = normalizedPuzzleKey(probe);
        if (key === normalizedPuzzleKey(level) || seen.has(key)) continue;
        // Keep the finite solver budget for real Q0 openings; failed opening
        // arrangements are still represented by the source-level audit, while
        // this candidate pool records only geometry variants worth replaying.
        if (openingAudit(probe).status !== 'PASS') continue;
        seen.add(key); candidates.push(candidate);
      }
    }
  }
  return candidates;
}

function positionSwap(base, mutation, index, variant) {
  const level = clone(base), [a, b] = mutation.pair;
  const first = level.blocks[a], second = level.blocks[b];
  [first.x, second.x] = [second.x, first.x];
  [first.y, second.y] = [second.y, first.y];
  mutation.colorBlocks?.forEach((blockIndex, i) => { level.blocks[blockIndex].color = mutation.colors[i]; });
  level.id = 995000 + index * 100 + variant;
  level.name = `荣耀联赛几何去重·${index}·${variant}`;
  return level;
}

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(drag => drag.exitSide);
  const firstExit = new Map();
  exits.forEach((drag, i) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, i + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const filled = shape => {
    if (!Array.isArray(shape) || shape.length === 0) return false;
    const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
    return new Set(shape.map(([x, y]) => `${x},${y}`)).size === shape.length
      && shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  };
  const selected = (level.blocks ?? []).filter(block => !block.shutterId && filled(block.shape)
    && (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3).map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected,
    lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10,
    runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

const rowsByIndex = sourceRows();
const prior = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json'), 'utf8'));
const reserved = new Set((prior.checks ?? []).map(row => row.geometryKey).filter(Boolean));
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const acceptedCandidates = [];
const rows = [];

for (const index of TARGETS) {
  const source = rowsByIndex.get(index);
  const base = source?.accepted?.level;
  const targetRaw = source?.target ?? { lower: 16, upper: 20 };
  const target = Array.isArray(targetRaw) ? [Number(targetRaw[0]), Number(targetRaw[1])] : [Number(targetRaw.lower), Number(targetRaw.upper)];
  const attempts = [];
  let chosen = null;
  if (!base) { rows.push({ index, status: 'BLOCKED', source: { sourceLevelSha256: null, sourceGeometryKey: null }, attempts: [{ variant: 0, reasons: ['source-level-missing'] }] }); continue; }
  const candidates = mutationCandidates(base);
  for (let variant = 0; variant < Math.min(MAX_VARIANTS, candidates.length); variant += 1) {
    const level = positionSwap(base, candidates[variant], index, variant + 1);
    const attempt = { index, variant: variant + 1, pair: candidates[variant].pair, colorBlocks: candidates[variant].colorBlocks, colors: candidates[variant].colors, status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level), sourceLevelSha256: source.accepted.levelSha256 ?? rawJsonHash(base), level };
    try {
      const key = normalizedPuzzleKey(level); attempt.geometryKey = key;
      if (reserved.has(key) || acceptedCandidates.some(candidate => candidate.geometryKey === key)) { attempt.reasons.push('duplicate-canonical-geometry'); attempts.push(attempt); continue; }
      attempt.opening = openingAudit(level);
      if (attempt.opening.status !== 'PASS') { attempt.reasons.push('opening-audit-failed'); attempts.push(attempt); continue; }
      const route = searchSpatial(level, spatialApi, { maxStates: 180000, maxTransitions: 800000, maxMilliseconds: 1800, floor: target[1] + 1, normalize: true, orderSeed: index * 100 + variant });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.routeDrags = route.drags;
      attempt.routeSha256 = rawJsonHash(route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      attempt.scoreBlocks = scoreEvidence(level, route.drags);
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) attempt.reasons.push('route-out-of-band');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, floor: target[0], prove: true, normalize: false, orderSeed: index * 100 + variant });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: target[0], termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); attempts.push(attempt); continue; }
      const scoreBlocks = attempt.scoreBlocks; 
      if (scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
      const candidate = { index, target, level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey: key, sourceLevelSha256: source.accepted.levelSha256 ?? rawJsonHash(base) };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
      attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); attempts.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY'; chosen = candidate; attempts.push(attempt); break;
    } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`); attempts.push(attempt); }
  }
  if (chosen) { acceptedCandidates.push(chosen); reserved.add(chosen.geometryKey); rows.push({ index, status: 'FORMAL_CANDIDATE_READY', geometryKey: chosen.geometryKey, levelSha256: chosen.levelSha256, routeSha256: chosen.routeSha256, attempts }); }
  else rows.push({ index, status: 'BLOCKED', source: { sourceLevelSha256: source.accepted.levelSha256 ?? rawJsonHash(base), sourceGeometryKey: normalizedPuzzleKey(base), level: base }, attempts });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(PARTIAL, `${JSON.stringify({ status: 'PARTIAL', targets: TARGETS, acceptedCandidates, rows, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS, noInfiniteRetry: true } }, null, 2)}\n`);
}

const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated geometry position variants for canonical duplicate group 10/11/12/14; no production integration', targets: TARGETS, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS, noInfiniteRetry: true }, counts: { slots: TARGETS.length, accepted: acceptedCandidates.length, blocked: TARGETS.length - acceptedCandidates.length, uniqueGeometry: new Set(acceptedCandidates.map(row => row.geometryKey)).size }, acceptedCandidates, rows, productionChanged: false, status: acceptedCandidates.length === TARGETS.length ? 'GEOMETRY_GROUP_10_14_READY' : 'GEOMETRY_GROUP_10_14_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
fs.rmSync(PARTIAL, { force: true });
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: report.status, counts: report.counts }, null, 2));

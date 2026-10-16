/*
 * Finite repair pass for the duplicate canonical-geometry groups found by the
 * round-3 independent audit.  This pass is deliberately isolated: it reads
 * candidate reports and writes only an evidence catalogue below
 * deliverables/league-regeneration-20261006/geometry-repair.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import {
  evidenceCheck,
  normalizedPuzzleKey,
  openingAudit,
  rawJsonHash,
} from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-max-group');
const OUT = path.join(OUT_DIR, 'max-group-20-31.json');
const PARTIAL = `${OUT}.partial`;
const MAX_VARIANTS_PER_SLOT = 8;
const GROUPS = [[20, 21, 22, 24, 25, 26, 27, 29, 30, 31]];
const TARGET_INDEXES = GROUPS.flat();

const clone = value => structuredClone(value);
const cellKey = point => point.join(',');
const filledRectangle = shape => {
  if (!Array.isArray(shape) || shape.length === 0) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1)
    && new Set(shape.map(cellKey)).size === shape.length;
};

function mutationPairs(level) {
  const pairs = [];
  for (let a = 0; a < (level.blocks ?? []).length; a += 1) {
    for (let b = a + 1; b < (level.blocks ?? []).length; b += 1) {
      const first = level.blocks[a], second = level.blocks[b];
      // Moving a mechanism block can invalidate its trigger/initial state.
      // Restrict this finite repair to ordinary filled blocks with different
      // colours and identical footprints; their positions can be exchanged
      // without changing inventory or mechanism counts.
      if (!first || !second || first.shutterId || second.shutterId || first.frozen || second.frozen
        || first.layers || second.layers || first.movementAxis || second.movementAxis
        || first.keyId || second.keyId || first.lockedBy || second.lockedBy
        || first.star || second.star || first.timedBombSeconds || second.timedBombSeconds) continue;
      if (JSON.stringify(first.shape) !== JSON.stringify(second.shape) || first.color === second.color) continue;
      pairs.push([a, b]);
    }
  }
  return pairs;
}

function swapCandidate(base, pair, variant) {
  const level = clone(base);
  const [a, b] = pair;
  const first = level.blocks[a], second = level.blocks[b];
  if (!first || !second) return null;
  [first.x, second.x] = [second.x, first.x];
  [first.y, second.y] = [second.y, first.y];
  // A local colour exchange is intentionally paired with every position swap
  // so a swap among equal-colour blocks cannot accidentally collapse to the
  // same normalized geometry key.
  if (variant % 2 === 1) [first.color, second.color] = [second.color, first.color];
  level.id = 981000 + Number(level.id ?? 0) + variant;
  level.name = `荣耀联赛重复几何修复·${level.id}`;
  return level;
}

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(drag => drag.exitSide);
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

function sourceRows(round2) {
  const rows = new Map();
  for (const source of round2.sourceReports ?? []) {
    const file = path.join(ROOT, source.file);
    if (!fs.existsSync(file)) continue;
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const row of report.rows ?? []) {
      if (!rows.has(row.index) || (row.status === 'FORMAL_CANDIDATE_READY' && row.accepted?.level)) rows.set(row.index, row);
    }
  }
  return rows;
}

const round2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/formal-round2-status.json'), 'utf8'));
const rowsByIndex = sourceRows(round2);
// Prefer the round-3 accepted candidate payload for the middle indexes.  It
// already contains a local layout mutation; this pass then performs a second
// finite mutation against that exact object before re-proving L/U.
const uniquePath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/formal-unique-mid.json');
if (fs.existsSync(uniquePath)) {
  const unique = JSON.parse(fs.readFileSync(uniquePath, 'utf8'));
  for (const row of unique.rows ?? []) if (row.status === 'FORMAL_CANDIDATE_READY' && row.accepted?.level) rowsByIndex.set(row.index, row);
}
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const priorAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/final-independent-audit.json'), 'utf8'));
const priorKeys = new Set((priorAudit.rows ?? []).map(row => row.geometryKey).filter(Boolean));
const accepted = [];
const results = [];
const groupBases = new Map();

for (const index of TARGET_INDEXES) {
  const sourceRow = rowsByIndex.get(index);
  const group = GROUPS.find(items => items.includes(index));
  const groupBase = group && groupBases.get(group.join(','));
  const base = groupBase ?? sourceRow?.accepted?.level;
  const targetRaw = sourceRow?.target ?? [16, 20];
  const target = Array.isArray(targetRaw)
    ? [Number(targetRaw[0]), Number(targetRaw[1])]
    : [Number(targetRaw.lower), Number(targetRaw.upper)];
  const variants = [];
  let selected = null;
  if (!base) {
    results.push({ index, status: 'BLOCKED', reasons: ['source-level-missing'], variants });
    continue;
  }
  const pairs = mutationPairs(base);
  for (let variant = 0; variant < Math.min(MAX_VARIANTS_PER_SLOT, pairs.length); variant += 1) {
    const level = swapCandidate(base, pairs[variant], variant);
    const attempt = { index, variant: variant + 1, pair: pairs[variant], status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level) };
    try {
      const key = normalizedPuzzleKey(level);
      attempt.geometryKey = key;
      if (priorKeys.has(key) || accepted.some(row => row.geometryKey === key)) {
        attempt.reasons.push('duplicate-canonical-geometry'); variants.push(attempt); continue;
      }
      const opening = openingAudit(level);
      attempt.opening = opening;
      if (opening.status !== 'PASS') { attempt.reasons.push('opening-audit-failed'); variants.push(attempt); continue; }
      const route = searchSpatial(level, spatialApi, {
        maxStates: 180000, maxTransitions: 800000, maxMilliseconds: 1800,
        floor: Number(target[1]) + 1, normalize: true, orderSeed: index * 100 + variant,
      });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); variants.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < Number(target[0]) || replay.nonClearingDrags > Number(target[1])) attempt.reasons.push('route-out-of-band');
      if (attempt.reasons.length) { variants.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, {
        maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200,
        floor: Number(target[0]), prove: true, normalize: false, orderSeed: index * 100 + variant,
      });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: Number(target[0]), termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); variants.push(attempt); continue; }
      const scoreBlocks = scoreEvidence(level, route.drags);
      attempt.scoreBlocks = scoreBlocks;
      if (scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); variants.push(attempt); continue; }
      const candidate = { index, target, level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey: key };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
      attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); variants.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY';
      selected = candidate;
      variants.push(attempt);
      break;
    } catch (error) {
      attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`);
      variants.push(attempt);
    }
  }
  if (selected) {
    accepted.push(selected);
    if (group) groupBases.set(group.join(','), selected.level);
    results.push({ index, status: 'FORMAL_CANDIDATE_READY', geometryKey: selected.geometryKey, levelSha256: selected.levelSha256, routeSha256: selected.routeSha256, variants });
  } else results.push({ index, status: 'BLOCKED', variants });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(PARTIAL, `${JSON.stringify({ status: 'PARTIAL', accepted, results, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS_PER_SLOT, noInfiniteRetry: true } }, null, 2)}\n`);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  activeRuleVersion: '1.150.0',
  scope: 'isolated duplicate-geometry repairs; no production integration',
  groups: GROUPS,
  counts: { slots: TARGET_INDEXES.length, accepted: accepted.length, blocked: TARGET_INDEXES.length - accepted.length, uniqueGeometry: new Set(accepted.map(row => row.geometryKey)).size },
  finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS_PER_SLOT, noInfiniteRetry: true },
  // Keep complete candidate payloads in the isolated evidence catalogue so a
  // later merge audit can independently replay the exact level and drags.
  acceptedCandidates: accepted,
  rows: results,
  productionChanged: false,
  status: accepted.length === TARGET_INDEXES.length ? 'GEOMETRY_REPAIR_CANDIDATES_READY' : 'GEOMETRY_REPAIR_FINDINGS',
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
fs.rmSync(PARTIAL, { force: true });
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: report.status, counts: report.counts }, null, 2));

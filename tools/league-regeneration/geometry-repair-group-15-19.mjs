/*
 * Isolated finite repair for the normalized-geometry duplicate group 15/16/17/19.
 * Every slot starts from its own complete round-2 payload.  Only real position
 * swaps (and no ids/global-only recolours) are attempted; production data is
 * never imported or written.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, mechanismCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-group-15-19');
const OUT = path.join(OUT_DIR, 'formal-geometry-repair-15-19.json');
const SOURCE = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/early/formal-1-19.json');
const FINAL = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
const INDEXES = [15, 16, 17, 19];
const MAX_VARIANTS = 8;

const clone = value => structuredClone(value);
const sourceReport = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const finalAudit = JSON.parse(fs.readFileSync(FINAL, 'utf8'));
const priorKeys = new Set((finalAudit.checks ?? []).map(row => row.geometryKey).filter(Boolean));

function candidatePairs(level) {
  const pairs = [];
  for (let a = 0; a < (level.blocks ?? []).length; a += 1) for (let b = a + 1; b < (level.blocks ?? []).length; b += 1) {
    const first = level.blocks[a], second = level.blocks[b];
    if (!first || !second) continue;
    // A pure position swap preserves every block footprint, mechanism field and
    // board coverage.  This is intentionally broader than the old repair pass:
    // shells remain attached to their own blocks, while only x/y move.
    if (JSON.stringify(first.shape) !== JSON.stringify(second.shape)) continue;
    const level2 = clone(level);
    [level2.blocks[a].x, level2.blocks[b].x] = [level2.blocks[b].x, level2.blocks[a].x];
    [level2.blocks[a].y, level2.blocks[b].y] = [level2.blocks[b].y, level2.blocks[a].y];
    if (openingAudit(level2).status === 'PASS') pairs.push([a, b]);
  }
  return pairs;
}

function swapCandidate(base, pair, index, variant) {
  const level = clone(base);
  const [a, b] = pair;
  [level.blocks[a].x, level.blocks[b].x] = [level.blocks[b].x, level.blocks[a].x];
  [level.blocks[a].y, level.blocks[b].y] = [level.blocks[b].y, level.blocks[a].y];
  level.id = 995000 + index * 100 + variant;
  level.name = `荣耀联赛重复几何修复·${index}·${variant}`;
  return level;
}

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(drag => drag.exitSide);
  const firstExit = new Map();
  exits.forEach((drag, index) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, index + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const filled = shape => {
    if (!Array.isArray(shape) || shape.length === 0) return false;
    const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
    const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
    return cells.size === shape.length && shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  };
  const selected = (level.blocks ?? [])
    .filter(block => !block.shutterId && filled(block.shape) && (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const rows = [];
const acceptedCandidates = [];

for (const index of INDEXES) {
  const source = sourceReport.rows.find(row => row.index === index)?.accepted;
  const target = [16, 20];
  const attempts = [];
  let selected = null;
  if (!source?.level) {
    rows.push({ index, status: 'BLOCKED', attempts: [{ variant: 0, reasons: ['source-payload-missing'] }] });
    continue;
  }
  const pairs = candidatePairs(source.level);
  for (let variant = 0; variant < Math.min(MAX_VARIANTS, pairs.length); variant += 1) {
    const pair = pairs[variant];
    const level = swapCandidate(source.level, pair, index, variant + 1);
    const attempt = { index, variant: variant + 1, pair, status: 'BLOCKED', reasons: [], sourceLevelSha256: source.levelSha256 ?? rawJsonHash(source.level), levelSha256: rawJsonHash(level) };
    try {
      const geometryKey = normalizedPuzzleKey(level);
      attempt.geometryKey = geometryKey;
      if (priorKeys.has(geometryKey) || acceptedCandidates.some(row => row.geometryKey === geometryKey)) {
        attempt.reasons.push('duplicate-final-audit-geometry'); attempts.push(attempt); continue;
      }
      attempt.opening = openingAudit(level);
      if (attempt.opening.status !== 'PASS') { attempt.reasons.push('opening-audit-failed'); attempts.push(attempt); continue; }
      attempt.mechanisms = mechanismCheck(level, index);
      if (attempt.mechanisms.status !== 'PASS') { attempt.reasons.push(...attempt.mechanisms.errors); attempts.push(attempt); continue; }
      const route = searchSpatial(level, spatial, { maxStates: 500000, maxTransitions: 2500000, maxMilliseconds: 7000, floor: target[1] + 1, normalize: true, orderSeed: index * 100 + variant });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) attempt.reasons.push('route-out-of-band');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatial, { maxStates: 1000000, maxTransitions: 5000000, maxMilliseconds: 12000, floor: target[0], prove: true, normalize: false, orderSeed: index * 100 + variant });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: target[0], termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); attempts.push(attempt); continue; }
      const scoreBlocks = scoreEvidence(level, route.drags);
      attempt.scoreBlocks = scoreBlocks;
      if (scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
      const candidate = { index, target, sourceLevelSha256: source.levelSha256 ?? rawJsonHash(source.level), level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey, opening: attempt.opening, mechanisms: attempt.mechanisms };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
      attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); attempts.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY';
      selected = candidate;
      acceptedCandidates.push(candidate);
      attempts.push(attempt);
      break;
    } catch (error) {
      attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`); attempts.push(attempt);
    }
  }
  rows.push({ index, status: selected ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', variants: attempts });
}

const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated complete-payload position/shape variants for normalized duplicate group [15,16,17,19]; no production integration', group: [15, 16, 17, 19], finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS, noInfiniteRetry: true }, counts: { slots: INDEXES.length, accepted: acceptedCandidates.length, blocked: INDEXES.length - acceptedCandidates.length, uniqueGeometry: new Set(acceptedCandidates.map(row => row.geometryKey)).size }, acceptedCandidates, rows, productionChanged: false, status: acceptedCandidates.length === INDEXES.length ? 'GEOMETRY_REPAIR_CANDIDATES_READY' : 'GEOMETRY_REPAIR_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: report.status, counts: report.counts }, null, 2));

/*
 * Isolated finite geometry repair for the repeated super-level group
 * [53,58,63,68,73,78,83,88,93,98].  The source levels all share the same
 * normalized layout.  We only exchange positions of ordinary blocks (0..19),
 * preserving shapes, colours, shutter inventory, and all level metadata.  A
 * finite eight-variant window is used per slot; no production files are read
 * for writing and no candidate is accepted without the strict league contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-super-53-98');
const OUT = path.join(OUT_DIR, 'formal-geometry-repair-super-53-98.json');
const PARTIAL = `${OUT}.partial`;
const TARGETS = [53, 58, 63, 68, 73, 78, 83, 88, 93, 98];
const MAX_VARIANTS_PER_SLOT = 8;
const TARGET = [21, 30];

// The first sixteen mutations are deliberately small, true position swaps.
// The extra combinations give later slots a distinct geometry window while
// keeping the per-slot finite budget at eight attempts.
const MUTATIONS = [
  [[1, 2]], [[1, 6]], [[3, 19]], [[1, 2], [1, 3]],
  [[1, 2], [2, 6]], [[1, 2], [3, 4]], [[1, 2], [6, 19]],
  [[1, 3], [4, 6]], [[1, 3], [6, 19]], [[2, 3], [2, 19]],
  [[2, 3], [4, 6]], [[2, 6], [3, 19]], [[3, 4], [4, 19]],
  [[3, 19], [4, 6]], [[4, 5], [4, 6]], [[5, 6], [5, 7]],
  [[1, 5]], [[2, 7]], [[3, 8]], [[4, 9]], [[5, 10]], [[6, 11]],
  [[7, 12]], [[8, 13]], [[9, 14]], [[10, 15]], [[11, 16]], [[12, 17]],
  [[13, 18]], [[14, 19]], [[1, 10]], [[2, 11]], [[3, 12]], [[4, 13]],
  [[5, 14]], [[6, 15]], [[7, 16]], [[8, 17]], [[9, 18]], [[10, 19]],
];

const clone = value => structuredClone(value);
function swapPositions(level, [a, b]) {
  const first = level.blocks[a], second = level.blocks[b];
  if (!first || !second || first.shutterId || second.shutterId) throw new Error(`invalid ordinary block pair ${a},${b}`);
  [first.x, second.x] = [second.x, first.x];
  [first.y, second.y] = [second.y, first.y];
}
function mutation(level, pairs, variant) {
  const next = clone(level);
  for (const pair of pairs) swapPositions(next, pair);
  next.id = 996000 + Number(level.id ?? 0) + variant;
  next.name = `荣耀联赛超难位置去重·${next.id}`;
  return next;
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
function sourceRows() {
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json'), 'utf8'));
  return new Map((report.rows ?? []).filter(row => row.accepted?.level).map(row => [row.index, row]));
}
function reservedGeometryKeys() {
  const keys = new Set();
  const auditPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
  if (fs.existsSync(auditPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      for (const row of report.checks ?? []) {
        if (!TARGETS.includes(row.index) && row.geometryKey) keys.add(row.geometryKey);
      }
    } catch {}
  }
  return keys;
}

const rowsByIndex = sourceRows();
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const accepted = [];
// The unmodified source key is the duplicate we are repairing; reserve it
// explicitly so a swap between equal-colour blocks can never be reported as
// a successful geometry repair.
const sourceGeometryKey = normalizedPuzzleKey(rowsByIndex.get(TARGETS[0])?.accepted?.level);
const usedKeys = reservedGeometryKeys();
if (sourceGeometryKey) usedKeys.add(sourceGeometryKey);
const rows = [];
for (let slot = 0; slot < TARGETS.length; slot += 1) {
  const index = TARGETS[slot];
  const source = rowsByIndex.get(index);
  const variants = [];
  let selected = null;
  if (!source?.accepted?.level) {
    rows.push({ index, status: 'BLOCKED', reasons: ['source-level-missing'], variants });
    continue;
  }
  // Rotate through the larger mutation pool so each duplicate slot receives a
  // different first-choice window while still trying no more than eight.
  const start = (slot * 3) % MUTATIONS.length;
  for (let attemptNo = 0; attemptNo < MAX_VARIANTS_PER_SLOT; attemptNo += 1) {
    const mutationIndex = (start + attemptNo) % MUTATIONS.length;
    const pairs = MUTATIONS[mutationIndex];
    const level = mutation(source.accepted.level, pairs, attemptNo + 1);
    const attempt = { index, variant: attemptNo + 1, mutationIndex, pairs, status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level) };
    try {
      const key = normalizedPuzzleKey(level);
      attempt.geometryKey = key;
      if (usedKeys.has(key)) { attempt.reasons.push(key === sourceGeometryKey ? 'unchanged-source-geometry' : 'duplicate-reserved-geometry'); variants.push(attempt); continue; }
      const opening = openingAudit(level); attempt.opening = opening;
      if (opening.status !== 'PASS') { attempt.reasons.push('opening-audit-failed'); variants.push(attempt); continue; }
      const route = searchSpatial(level, spatialApi, { maxStates: 500000, maxTransitions: 2200000, maxMilliseconds: 8000, floor: TARGET[1] + 1, normalize: true, orderSeed: index * 100 + attemptNo });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); variants.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete || replay.nonClearingDrags < TARGET[0] || replay.nonClearingDrags > TARGET[1]) { attempt.reasons.push('route-replay-out-of-band'); variants.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, { maxStates: 500000, maxTransitions: 2200000, maxMilliseconds: 8000, floor: TARGET[0], prove: true, normalize: false, orderSeed: index * 100 + attemptNo });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: TARGET[0], termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); variants.push(attempt); continue; }
      const scoreBlocks = scoreEvidence(level, route.drags); attempt.scoreBlocks = scoreBlocks;
      if (scoreBlocks.status !== 'PASS' || scoreBlocks.totalPoints !== 30) { attempt.reasons.push('score-block-evidence-failed'); variants.push(attempt); continue; }
      const candidate = { index, target: TARGET, level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, route: attempt.route, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey: key };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
      attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); variants.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY'; variants.push(attempt); selected = candidate; break;
    } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`); variants.push(attempt); }
  }
  if (selected) { accepted.push(selected); usedKeys.add(selected.geometryKey); rows.push({ index, status: 'FORMAL_CANDIDATE_READY', geometryKey: selected.geometryKey, levelSha256: selected.levelSha256, routeSha256: selected.routeSha256, variants }); }
  else rows.push({ index, status: 'BLOCKED', variants });
  fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(PARTIAL, `${JSON.stringify({ status: 'PARTIAL', acceptedCandidates: accepted, rows, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS_PER_SLOT, noInfiniteRetry: true } }, null, 2)}\n`);
}
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated real-position variants for repeated super group [53,58,63,68,73,78,83,88,93,98]; no production integration', targets: TARGETS, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS_PER_SLOT, noInfiniteRetry: true }, counts: { slots: TARGETS.length, accepted: accepted.length, blocked: TARGETS.length - accepted.length, uniqueGeometry: new Set(accepted.map(row => row.geometryKey)).size }, acceptedCandidates: accepted, rows, productionChanged: false, status: accepted.length === TARGETS.length ? 'GEOMETRY_POSITION_REPAIR_CANDIDATES_READY' : 'GEOMETRY_POSITION_REPAIR_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`); fs.rmSync(PARTIAL, { force: true }); console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: report.status, counts: report.counts }, null, 2));

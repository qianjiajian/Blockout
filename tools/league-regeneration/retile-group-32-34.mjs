/*
 * Finite, isolated shape-retile probe for the 32/34 canonical duplicate.
 * Two adjacent 2x2 blocks are repartitioned over their unchanged 4x2 union
 * into a connected 3-cell and 5-cell pair.  This changes real footprints and
 * therefore the normalized geometry key while preserving opening coverage,
 * mechanism inventory, and the rest of the board.  At most eight variants per
 * slot are attempted; this tool never writes production data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-group-32-34');
const OUT = path.join(OUT_DIR, 'retile-32-34.json');
const TARGETS = [32, 34];
const MAX_VARIANTS = 8;
const clone = value => structuredClone(value);
const cellKey = ([x, y]) => `${x},${y}`;

const sourceReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json'), 'utf8'));
const sources = new Map((sourceReport.rows ?? []).filter(row => row.accepted?.level).map(row => [row.index, row.accepted]));
const finalAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json'), 'utf8'));
const reserved = new Set((finalAudit.checks ?? []).map(row => row.geometryKey).filter(Boolean));

function filledRectangle(shape) {
  if (!Array.isArray(shape) || !shape.length) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return new Set(shape.map(cellKey)).size === shape.length
    && shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
}

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(d => d.exitSide);
  const firstExit = new Map();
  exits.forEach((drag, i) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, i + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? []).filter(block => !block.shutterId && filledRectangle(block.shape)
    && (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3).map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

// Every source board is a 2x2 tiling.  Enumerate each horizontal neighboring
// pair and two orientations of a 3/5 partition over its 4x2 rectangle.  The
// second shape remains connected, and all global cells stay covered exactly.
function mutations(base) {
  const blocks = base.blocks ?? [];
  const out = [];
  const seen = new Set();
  for (let a = 0; a < blocks.length; a += 1) for (let b = a + 1; b < blocks.length; b += 1) {
    const A = blocks[a], B = blocks[b];
    if (!A || !B || JSON.stringify(A.shape) !== JSON.stringify(B.shape) || A.shape.length !== 4) continue;
    if ([A, B].some(x => x.shutterId || x.frozen || x.layers || x.movementAxis || x.keyId || x.lockedBy || x.star || x.timedBombSeconds)) continue;
    const sameRow = A.y === B.y && Math.abs(A.x - B.x) === 2;
    const sameCol = A.x === B.x && Math.abs(A.y - B.y) === 2;
    if (!sameRow && !sameCol) continue;
    const minX = Math.min(A.x, B.x), minY = Math.min(A.y, B.y);
    const width = sameRow ? 4 : 2, height = sameRow ? 2 : 4;
    // canonical local partitions.  These are 3/5 connected polyominoes and
    // are both valid for axis-free blocks.  Rotate the pattern for vertical
    // unions; each mutation retains the exact union of source cells.
    const patterns = sameRow
      ? [
        [[[0, 0], [1, 0], [0, 1]], [[1, 1], [2, 0], [3, 0], [2, 1], [3, 1]]],
        [[[0, 0], [1, 0], [1, 1]], [[0, 1], [2, 0], [3, 0], [2, 1], [3, 1]]],
        [[[0, 0], [0, 1], [1, 1]], [[1, 0], [2, 0], [3, 0], [2, 1], [3, 1]]],
        [[[0, 0], [1, 0], [2, 0]], [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]]],
      ]
      : [
        [[[0, 0], [0, 1], [1, 0]], [[1, 1], [0, 2], [1, 2], [0, 3], [1, 3]]],
        [[[0, 0], [1, 0], [0, 1]], [[1, 1], [0, 2], [1, 2], [0, 3], [1, 3]]],
      ];
    for (const [shapeA, shapeB] of patterns) {
      const level = clone(base);
      level.blocks[a].x = minX; level.blocks[a].y = minY;
      level.blocks[b].x = minX; level.blocks[b].y = minY;
      level.blocks[a].shape = shapeA;
      level.blocks[b].shape = shapeB;
      if (sameCol) {
        // The vertical patterns above already use the 2x4 union.  Preserve
        // row/column orientation and do not rotate the cells a second time.
      }
      // Preserve opening colours when possible; a local swap is tried only
      // as a separate mutation to avoid hiding shape failures.
      const key = normalizedPuzzleKey(level);
      if (key === normalizedPuzzleKey(base) || seen.has(key) || openingAudit(level).status !== 'PASS') continue;
      seen.add(key); out.push({ a, b, shapeA, shapeB, swapColors: false });
      if (A.color !== B.color && out.length < 32) {
        const swapped = clone(level);
        [swapped.blocks[a].color, swapped.blocks[b].color] = [swapped.blocks[b].color, swapped.blocks[a].color];
        const swapKey = normalizedPuzzleKey(swapped);
        if (swapKey !== normalizedPuzzleKey(base) && !seen.has(swapKey) && openingAudit(swapped).status === 'PASS') {
          seen.add(swapKey); out.push({ a, b, shapeA, shapeB, swapColors: true });
        }
      }
    }
  }
  return out;
}

function buildCandidate(base, mutation, index, variant) {
  const level = clone(base);
  level.blocks[mutation.a].x = Math.min(base.blocks[mutation.a].x, base.blocks[mutation.b].x);
  level.blocks[mutation.a].y = Math.min(base.blocks[mutation.a].y, base.blocks[mutation.b].y);
  level.blocks[mutation.b].x = level.blocks[mutation.a].x;
  level.blocks[mutation.b].y = level.blocks[mutation.a].y;
  level.blocks[mutation.a].shape = mutation.shapeA;
  level.blocks[mutation.b].shape = mutation.shapeB;
  if (mutation.swapColors) [level.blocks[mutation.a].color, level.blocks[mutation.b].color] = [level.blocks[mutation.b].color, level.blocks[mutation.a].color];
  level.id = 997400 + index * 100 + variant;
  level.name = `荣耀联赛真实重铺32-34·${index}·${variant}`;
  return level;
}

const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const acceptedCandidates = [];
const rows = [];

for (const index of TARGETS) {
  const source = sources.get(index);
  const base = source?.level;
  const target = [16, 20];
  const attempts = [];
  let selected = null;
  if (!base) { rows.push({ index, status: 'BLOCKED', attempts: [{ variant: 0, reasons: ['source-level-missing'] }] }); continue; }
  const candidates = mutations(base);
  for (let n = 0; n < Math.min(MAX_VARIANTS, candidates.length); n += 1) {
    const level = buildCandidate(base, candidates[n], index, n + 1);
    const attempt = { index, variant: n + 1, mutation: candidates[n], status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level), sourceLevelSha256: source.levelSha256 ?? rawJsonHash(base) };
    try {
      const geometryKey = normalizedPuzzleKey(level); attempt.geometryKey = geometryKey;
      if (reserved.has(geometryKey) || acceptedCandidates.some(row => row.geometryKey === geometryKey)) { attempt.reasons.push('duplicate-final-audit-geometry'); attempts.push(attempt); continue; }
      attempt.opening = openingAudit(level);
      if (attempt.opening.status !== 'PASS') { attempt.reasons.push('opening-audit-failed'); attempts.push(attempt); continue; }
      const route = searchSpatial(level, spatial, { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, floor: 21, normalize: true, orderSeed: index * 100 + n });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) attempt.reasons.push('route-out-of-band');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatial, { maxStates: 500000, maxTransitions: 2200000, maxMilliseconds: 5000, floor: 16, prove: true, normalize: false, orderSeed: index * 100 + n });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: 16, termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); attempts.push(attempt); continue; }
      const scoreBlocks = scoreEvidence(level, route.drags); attempt.scoreBlocks = scoreBlocks;
      if (scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
      const candidate = { index, target, level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey, sourceLevelSha256: source.levelSha256 ?? rawJsonHash(base) };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
      attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); attempts.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY'; selected = candidate; acceptedCandidates.push(candidate); attempts.push(attempt); break;
    } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`); attempts.push(attempt); }
  }
  rows.push({ index, status: selected ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', geometryKey: selected?.geometryKey ?? null, attempts });
}

const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated true shape-retile variants for duplicate group 32/34; no production integration', targets: TARGETS, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS, noInfiniteRetry: true }, counts: { slots: TARGETS.length, accepted: acceptedCandidates.length, blocked: TARGETS.length - acceptedCandidates.length, uniqueGeometry: new Set(acceptedCandidates.map(row => row.geometryKey)).size }, acceptedCandidates, rows, productionChanged: false, status: acceptedCandidates.length === TARGETS.length ? 'GEOMETRY_GROUP_32_34_RETILE_READY' : 'GEOMETRY_GROUP_32_34_RETILE_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: report.status, counts: report.counts }, null, 2));

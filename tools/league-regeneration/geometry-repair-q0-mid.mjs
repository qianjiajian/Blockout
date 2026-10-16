/*
 * Finite second-pass geometry repair for the round-3 Q0 colour candidates.
 * The colour pass fixed opening adjacency, but the resulting layouts can still
 * share a canonical geometry key with the current 100-level audit.  This
 * isolated pass changes real block anchors (ordinary filled blocks only), then
 * re-proves opening Q0, a complete route, the lower bound and score contract.
 * It never writes production data and stops after eight variants per slot.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  loadSpatialApi,
  searchSpatial,
} from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import {
  evidenceCheck,
  normalizedPuzzleKey,
  openingAudit,
  rawJsonHash,
} from './round3-contract.mjs';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-color-repair/round3-unique-mid-q0.json');
const BASELINE = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-color-repair-geometry');
const OUT = path.join(OUT_DIR, 'round3-unique-mid-q0-geometry.json');
const PARTIAL = `${OUT}.partial`;
const MAX_VARIANTS_PER_SLOT = 8;

const clone = value => structuredClone(value);
const cellKey = point => point.join(',');
const filledRectangle = shape => {
  if (!Array.isArray(shape) || shape.length === 0) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1)
    && new Set(shape.map(cellKey)).size === shape.length;
};

// A position swap among equal footprints preserves the covered cells, colours,
// inventory and all mechanism fields while changing the canonical geometry.
function mutationPairs(level) {
  const pairs = [];
  for (let a = 0; a < (level.blocks ?? []).length; a += 1) {
    for (let b = a + 1; b < (level.blocks ?? []).length; b += 1) {
      const first = level.blocks[a], second = level.blocks[b];
      if (!first || !second) continue;
      const mechanism = block => block.shutterId || block.frozen || block.layers
        || block.movementAxis || block.keyId || block.lockedBy || block.star
        || block.timedBombSeconds || block.generatorId;
      if (mechanism(first) || mechanism(second)) continue;
      if (!Array.isArray(first.shape) || !Array.isArray(second.shape)) continue;
      if (JSON.stringify(first.shape) !== JSON.stringify(second.shape)) continue;
      if (first.x === second.x && first.y === second.y) continue;
      pairs.push([a, b]);
    }
  }
  return pairs;
}

function swapCandidate(base, pair, variant) {
  const level = clone(base);
  const [a, b] = pair;
  const first = level.blocks[a], second = level.blocks[b];
  [first.x, second.x] = [second.x, first.x];
  [first.y, second.y] = [second.y, first.y];
  level.id = 997000 + Number(level.id ?? 0) + variant;
  level.name = `荣耀联赛Q0几何修复·${level.id}`;
  return level;
}

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(drag => drag.exitSide);
  const firstExit = new Map();
  exits.forEach((drag, index) => {
    if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, index + 1);
  });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? [])
    .filter(block => !block.shutterId && filledRectangle(block.shape)
      && (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
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

const input = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const priorKeys = new Set((baseline.checks ?? []).map(row => row.geometryKey).filter(Boolean));
const targets = (input.acceptedCandidates ?? []).map(row => row.index).sort((a, b) => a - b);
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const accepted = [];
const results = [];

for (const index of targets) {
  const source = (input.acceptedCandidates ?? []).find(row => row.index === index);
  const target = source.target ?? [16, 20];
  const variants = [];
  let selected = null;
  const pairs = mutationPairs(source.level);
  for (let variant = 0; variant < Math.min(MAX_VARIANTS_PER_SLOT, pairs.length); variant += 1) {
    const pairIndex = (variant * 11 + index * 5) % pairs.length;
    const pair = pairs[pairIndex];
    const level = swapCandidate(source.level, pair, variant + 1);
    const attempt = {
      index,
      variant: variant + 1,
      pair,
      pairIndex,
      status: 'BLOCKED',
      reasons: [],
      levelSha256: rawJsonHash(level),
    };
    try {
      const key = normalizedPuzzleKey(level);
      attempt.geometryKey = key;
      if (priorKeys.has(key) || accepted.some(row => row.geometryKey === key)) {
        attempt.reasons.push('duplicate-canonical-geometry');
        variants.push(attempt);
        continue;
      }
      const opening = openingAudit(level);
      attempt.opening = opening;
      if (opening.status !== 'PASS') {
        attempt.reasons.push('opening-audit-failed');
        variants.push(attempt);
        continue;
      }
      const route = searchSpatial(level, spatialApi, {
        maxStates: 180000,
        maxTransitions: 800000,
        maxMilliseconds: 1800,
        floor: Number(target[1]) + 1,
        normalize: true,
        orderSeed: index * 100 + variant,
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
        attempt.reasons.push(`route-${route.status}`);
        variants.push(attempt);
        continue;
      }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = {
        valid: replay.valid,
        complete: replay.complete,
        nonClearingDrags: replay.nonClearingDrags,
        effectiveDrags: replay.effectiveDrags,
      };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < Number(target[0]) || replay.nonClearingDrags > Number(target[1])) {
        attempt.reasons.push('route-out-of-band');
      }
      if (attempt.reasons.length) {
        variants.push(attempt);
        continue;
      }
      const lower = searchSpatial(level, spatialApi, {
        maxStates: 220000,
        maxTransitions: 1000000,
        maxMilliseconds: 2200,
        floor: Number(target[0]),
        prove: true,
        normalize: false,
        orderSeed: index * 100 + variant,
      });
      attempt.lowerBound = {
        status: lower.status,
        thresholdProven: lower.thresholdProven === true,
        floor: Number(target[0]),
        termination: lower.termination ?? null,
        exploredStates: lower.exploredStates ?? null,
        attemptedTransitions: lower.attemptedTransitions ?? null,
        elapsedMilliseconds: lower.elapsedMilliseconds ?? null,
        sourceLevelSha256: rawJsonHash(level),
      };
      if (lower.thresholdProven !== true) {
        attempt.reasons.push(`lower-${lower.status}`);
        variants.push(attempt);
        continue;
      }
      const scoreBlocks = scoreEvidence(level, route.drags);
      attempt.scoreBlocks = scoreBlocks;
      if (scoreBlocks.status !== 'PASS') {
        attempt.reasons.push('no-late-rectangular-score-block');
        variants.push(attempt);
        continue;
      }
      const candidate = {
        index,
        target,
        sourceLevelSha256: source.levelSha256,
        level,
        levelSha256: rawJsonHash(level),
        routeSha256: rawJsonHash(route.drags),
        drags: route.drags,
        lowerBound: attempt.lowerBound,
        replay: attempt.replay,
        scoreBlocks,
        geometryKey: key,
      };
      const contract = await evidenceCheck(candidate, {
        strictQ0: true,
        replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags),
      });
      attempt.contract = {
        status: contract.status,
        errors: contract.errors,
        warnings: contract.warnings,
        score: contract.score,
      };
      if (contract.status !== 'PASS') {
        attempt.reasons.push(...contract.errors);
        variants.push(attempt);
        continue;
      }
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
    results.push({
      index,
      status: 'FORMAL_CANDIDATE_READY',
      geometryKey: selected.geometryKey,
      levelSha256: selected.levelSha256,
      routeSha256: selected.routeSha256,
      variants,
    });
  } else {
    results.push({ index, status: 'BLOCKED', variants });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(PARTIAL, `${JSON.stringify({ status: 'PARTIAL', accepted, results, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS_PER_SLOT, noInfiniteRetry: true } }, null, 2)}\n`);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  activeRuleVersion: '1.150.0',
  scope: 'isolated round3 unique-mid Q0 geometry repair; no production integration',
  targets,
  finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS_PER_SLOT, noInfiniteRetry: true },
  counts: {
    slots: targets.length,
    accepted: accepted.length,
    blocked: targets.length - accepted.length,
    uniqueGeometry: new Set(accepted.map(row => row.geometryKey)).size,
  },
  acceptedCandidates: accepted,
  rows: results,
  productionChanged: false,
  status: accepted.length === targets.length ? 'Q0_GEOMETRY_REPAIR_CANDIDATES_READY' : 'Q0_GEOMETRY_REPAIR_FINDINGS',
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
fs.rmSync(PARTIAL, { force: true });
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: report.status, counts: report.counts }, null, 2));


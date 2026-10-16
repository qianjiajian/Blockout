/**
 * Isolated league-regeneration experiment for the first 19 levels.
 *
 * This is intentionally not a catalog writer. It demonstrates a finite
 * candidate queue with real geometry/color mutations and records why every
 * candidate is rejected. D1 is never used as a lower-bound signal.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { compileSpatial, loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';

if (!verifyRulesLock().ok) throw new Error('rules lock failed; no experiment may run');

const ROOT = 'deliverables/league-regeneration-20261004/early-experiments';
const runDir = path.join(ROOT, `finite-${Date.now()}`);
fs.mkdirSync(runDir, { recursive: true });
const api = await loadSpatialApi();
const core = await loadContinuationRuntime();
const sha = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];

// Finite by construction: no candidate is retried forever.
const SEED_BUDGET = Number(process.argv[2] ?? 20);
const SHAPE_VARIANTS = 3;
const COLOR_VARIANTS = 4;
const SEARCH_MS = 350;
const PROOF_MS = 1200;
const seen = new Set();
let state = 194723;
const rand = (n) => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return Math.floor((state / 4294967296) * n);
};

const palette = (seed) => {
  const out = [...COLORS];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Full rectangular board and real bar geometry; no main-level object is copied. */
function makeBase(seed) {
  const width = 8, height = 8;
  const blocks = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 4) {
      blocks.push({ id: `piece-${blocks.length}`, x, y,
        shape: [[0, 0], [1, 0], [2, 0], [3, 0]], color: palette(seed)[blocks.length % COLORS.length] });
    }
  }
  const gates = [['top', 0], ['top', 4], ['bottom', 0], ['bottom', 4],
    ['left', 0], ['left', 4], ['right', 0], ['right', 4]]
    .map(([side, offset], i) => ({ id: `mouth-${i}`, side, offset, size: 4, color: COLORS[i] }));
  return { id: 980000 + seed, name: `荣耀联赛实验 ${seed}`, difficulty: seed % 5 === 2 ? 'super' : 'hard',
    mechanismRules: 'revised-2026-09-27-v1.5', width, height,
    playable: Array.from({ length: width * height }, (_, i) => [i % width, Math.floor(i / width)]),
    gates, blocks, timeSeconds: 180, reward: 0 };
}

function mutate(base, seed, shapeVariant, colorVariant) {
  const level = structuredClone(base);
  level.id += shapeVariant * 100 + colorVariant;
  level.name += ` / s${shapeVariant} c${colorVariant}`;
  const order = palette(seed * 17 + colorVariant * 31);
  // Shape mutations preserve a genuine spatial board change. A shortened
  // bar leaves a pocket; a vertical bar changes the movement path.
  if (shapeVariant === 1) level.blocks[seed % level.blocks.length].shape = [[0, 0], [1, 0], [2, 0]];
  if (shapeVariant === 2) {
    // Re-tile the same 8x8 board as vertical bars. This is a spatial variant
    // of the whole arrangement, rather than an overlapping single-block edit.
    level.blocks.forEach((block, i) => {
      block.x = i % 8;
      block.y = Math.floor(i / 8) * 4;
      block.shape = [[0, 0], [0, 1], [0, 2], [0, 3]];
    });
  }
  if (colorVariant > 0) {
    const a = (seed + colorVariant) % level.blocks.length;
    const b = (a + 1 + colorVariant) % level.blocks.length;
    [level.blocks[a].color, level.blocks[b].color] = [order[a % order.length], order[b % order.length]];
  }
  return level;
}

function classify(level, witness) {
  const target = level.difficulty === 'super' ? { lo: 21, hi: 30 } : { lo: 16, hi: 20 };
  if (witness.status !== 'witness') return { accepted: false, reason: `no-witness:${witness.status}`, target };
  const replay = core.replayRevisedRoute(level, witness.drags);
  if (!replay.valid || !replay.complete) return { accepted: false, reason: 'replay-invalid', replay, target };
  if (replay.nonClearingDrags < target.lo) return { accepted: false, reason: 'witness-below-lower', replay, target };
  if (replay.nonClearingDrags > target.hi) return { accepted: false, reason: 'witness-above-upper', replay, target };
  // A witness in range still needs a complete below-floor proof. The proof
  // budget is finite; timeout remains an explicit rejection.
  const proof = searchSpatial(level, api, { floor: target.lo, prove: true, normalize: false,
    maxMilliseconds: PROOF_MS, maxStates: 150000, maxTransitions: 500000 });
  if (!proof.thresholdProven) return { accepted: false, reason: `lower-proof:${proof.status}/${proof.termination}`, replay, proof, target };
  return { accepted: true, reason: 'accepted-experiment-only', replay, proof, target };
}

const rows = [];
for (let seed = 0; seed < SEED_BUDGET; seed += 1) {
  const base = makeBase(seed);
  for (let shapeVariant = 0; shapeVariant < SHAPE_VARIANTS; shapeVariant += 1) {
    for (let colorVariant = 0; colorVariant < COLOR_VARIANTS; colorVariant += 1) {
      const level = mutate(base, seed, shapeVariant, colorVariant);
      const fingerprint = sha({ width: level.width, height: level.height, playable: level.playable,
        gates: level.gates, blocks: level.blocks });
      if (seen.has(fingerprint)) {
        rows.push({ seed, shapeVariant, colorVariant, fingerprint, outcome: 'dedup' });
        continue;
      }
      seen.add(fingerprint);
      try {
        compileSpatial(level, api);
        const witness = searchSpatial(level, api, { floor: 31, normalize: true,
          maxMilliseconds: SEARCH_MS, maxStates: 50000, maxTransitions: 500000 });
        const result = classify(level, witness);
        rows.push({ seed, shapeVariant, colorVariant, fingerprint, ...result,
          witness: { status: witness.status, cost: witness.cost, drags: witness.drags?.length }, levelSha256: sha(level) });
        if (result.accepted) fs.writeFileSync(path.join(runDir, `candidate-${rows.length}.json`),
          JSON.stringify({ level, witness, result }, null, 2));
      } catch (error) {
        rows.push({ seed, shapeVariant, colorVariant, fingerprint, outcome: 'error',
          reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }
}

const accepted = rows.filter((row) => row.accepted === true).length;
const report = { finiteBudget: { seed: SEED_BUDGET, shapeVariants: SHAPE_VARIANTS, colorVariants: COLOR_VARIANTS,
  searchMilliseconds: SEARCH_MS, proofMilliseconds: PROOF_MS }, attempted: rows.length, unique: seen.size, accepted,
  rejected: rows.filter((row) => row.accepted !== true).length,
  reasons: rows.reduce((map, row) => { const key = row.reason ?? row.outcome ?? 'unknown'; map[key] = (map[key] ?? 0) + 1; return map; }, {}), rows };
fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ runDir, attempted: report.attempted, unique: report.unique, accepted, reasons: report.reasons }));

/* Targeted shape-and-layout retile pass for the three priority duplicates. */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-shape-retile');
const OUT = path.join(OUT_DIR, 'priority-10-15-20.json');
const TARGETS = [10, 15, 20];
const clone = value => structuredClone(value);
const shape = (...cells) => cells;

function recolorToQ0(level, ids) {
  const colors = ids.map(id => level.blocks[id]?.color);
  const palette = [...new Set([...(level.blocks ?? []).map(block => block.color), ...(level.gates ?? []).map(gate => gate.color)])];
  const order = new Array(colors.length);
  let solution = null;
  const visit = position => {
    if (solution) return;
    if (position === order.length) {
      const candidate = clone(level);
      ids.forEach((id, index) => { candidate.blocks[id].color = order[index]; });
      const present = new Set(candidate.blocks.map(block => block.color));
      if (openingAudit(candidate).status === 'PASS' && (candidate.gates ?? []).every(gate => present.has(gate.color))) solution = candidate;
      return;
    }
    for (const color of palette) {
      order[position] = color; visit(position + 1);
      if (solution) return;
    }
  };
  visit(0);
  return solution ?? level;
}

function mutate(base, index, variant) {
  const level = clone(base);
  if (index === 20) {
    // The mask's first two rows are a 4x2 strip.  Retile two 2x2 blocks into
    // two horizontal 1x4 blocks, preserving exactly the same eight cells and
    // block count while changing both shape and local adjacency.
    const a = level.blocks[0], b = level.blocks[1];
    if (variant === 0) {
      a.x = 2; a.y = 0; a.shape = shape([0, 0], [1, 0], [2, 0], [3, 0]);
      b.x = 2; b.y = 1; b.shape = shape([0, 0], [1, 0], [2, 0], [3, 0]);
    } else {
      // Partition a 2x4 middle strip into two complementary L tetrominoes.
      // Both blocks share the strip origin; their cell sets are disjoint.
      const c = level.blocks[2], d = level.blocks[3];
      c.x = 0; c.y = 2; c.shape = shape([0, 0], [0, 1], [1, 1], [0, 2]);
      d.x = 0; d.y = 2; d.shape = shape([1, 0], [1, 2], [0, 3], [1, 3]);
      const fixed = recolorToQ0(level, [2, 3]);
      for (const [key, value] of Object.entries(fixed)) level[key] = value;
    }
  } else if (index === 15) {
    // Same 4x2 top strip as the index-15 mask.  Preserve the shell layer on
    // block 1 while changing its footprint; the second top block completes
    // the strip on the adjacent row.
    const a = level.blocks[1], b = level.blocks[9];
    if (variant === 0) {
      a.x = 2; a.y = 0; a.shape = shape([0, 0], [1, 0], [2, 0], [3, 0]);
      b.x = 2; b.y = 1; b.shape = shape([0, 0], [1, 0], [2, 0], [3, 0]);
    } else {
      const c = level.blocks[3], d = level.blocks[4];
      c.x = 2; c.y = 2; c.shape = shape([0, 0], [0, 1], [1, 1], [0, 2]);
      d.x = 2; d.y = 2; d.shape = shape([1, 0], [1, 2], [0, 3], [1, 3]);
    }
  } else if (index === 10) {
    // Repack the 2-column x 9-cell strip (x=2..3) into three 2x2 rectangles
    // followed by three horizontal 1x2 blocks.  Six blocks still cover the
    // same 18 cells, but both footprints and their ordering change.
    const ids = [2, 3, 4, 6, 7, 8];
    const rects = [
      [2, 0, shape([0, 0], [1, 0], [0, 1], [1, 1])],
      [2, 2, shape([0, 0], [1, 0], [0, 1], [1, 1])],
      [2, 4, shape([0, 0], [1, 0], [0, 1], [1, 1])],
      [2, 6, shape([0, 0], [1, 0])],
      [2, 7, shape([0, 0], [1, 0])],
      [2, 8, shape([0, 0], [1, 0])],
    ];
    if (variant === 0) for (let i = 0; i < ids.length; i += 1) {
      const block = level.blocks[ids[i]], [x, y, cells] = rects[i]; block.x = x; block.y = y; block.shape = cells;
    }
    if (variant === 0) {
      const fixed = recolorToQ0(level, ids);
      for (const [key, value] of Object.entries(fixed)) level[key] = value;
    } else {
      const a = level.blocks[3], b = level.blocks[6];
      a.x = 2; a.y = 0; a.shape = shape([0, 0], [1, 0], [0, 1]);
      b.x = 2; b.y = 0; b.shape = shape([1, 1], [0, 2], [1, 2]);
      const fixed = recolorToQ0(level, [3, 6]);
      for (const [key, value] of Object.entries(fixed)) level[key] = value;
    }
  }
  level.id = 989000 + index * 10 + variant;
  level.name = `荣耀联赛形状重铺·${index}·${variant}`;
  return level;
}

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(drag => drag.exitSide);
  const firstExit = new Map(); exits.forEach((drag, i) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, i + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? []).filter(block => {
    const rectangle = block.shape?.length && new Set(block.shape.map(([x, y]) => `${x},${y}`)).size === block.shape.length;
    const xs = block.shape?.map(([x]) => x) ?? [], ys = block.shape?.map(([, y]) => y) ?? [];
    const filled = rectangle && block.shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
    return !block.shutterId && filled && (firstExit.get(block.id) ?? Infinity) >= lateThreshold;
  }).sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id)).slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

const reportFiles = [
  'deliverables/league-regeneration-20261006/geometry-repair/duplicate-groups.json',
  'deliverables/league-regeneration-20261006/geometry-repair-max-group/max-group-20-31.json',
];
const source = new Map();
for (const file of reportFiles) {
  const full = path.join(ROOT, file); if (!fs.existsSync(full)) continue;
  for (const row of JSON.parse(fs.readFileSync(full, 'utf8')).acceptedCandidates ?? []) source.set(row.index, row);
}
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const finalAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json'), 'utf8'));
const blockedKeys = new Set((finalAudit.checks ?? []).map(row => row.geometryKey).filter(Boolean));
const rows = [];
const acceptedCandidates = [];
for (const index of TARGETS) {
  const base = source.get(index);
  const attempts = [];
  if (!base?.level) { rows.push({ index, status: 'BLOCKED', attempts: [{ variant: 0, reasons: ['source-payload-missing'] }] }); continue; }
  for (let variant = 0; variant < 2; variant += 1) {
    const level = mutate(base.level, index, variant);
    const attempt = { index, variant, status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level) };
    try {
      const key = normalizedPuzzleKey(level); attempt.geometryKey = key;
      if (blockedKeys.has(key) || acceptedCandidates.some(candidate => candidate.geometryKey === key)) { attempt.reasons.push('duplicate-final-audit-geometry'); attempts.push(attempt); continue; }
      attempt.opening = openingAudit(level);
      if (attempt.opening.status !== 'PASS') { attempt.reasons.push('opening-audit-failed'); attempts.push(attempt); continue; }
      const target = base.target;
      const route = searchSpatial(level, spatialApi, { maxStates: 500000, maxTransitions: 2200000, maxMilliseconds: 8000, floor: Number(target[1]) + 1, normalize: true, orderSeed: index * 10 + variant });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < Number(target[0]) || replay.nonClearingDrags > Number(target[1])) attempt.reasons.push('route-out-of-band');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, { maxStates: 500000, maxTransitions: 2200000, maxMilliseconds: 8000, floor: Number(target[0]), prove: true, normalize: false, orderSeed: index * 10 + variant });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: Number(target[0]), termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); attempts.push(attempt); continue; }
      const scoreBlocks = scoreEvidence(level, route.drags); attempt.scoreBlocks = scoreBlocks;
      if (scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
      const candidate = { index, target, level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey: key };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
      attempt.contract = { status: contract.status, errors: contract.errors, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); attempts.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY'; attempts.push(attempt); acceptedCandidates.push(candidate); break;
    } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`); attempts.push(attempt); }
  }
  rows.push({ index, status: attempts.some(attempt => attempt.status === 'FORMAL_CANDIDATE_READY') ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', attempts });
}
const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated true shape/layout retile against final audit keys; no production integration', targets: TARGETS, finiteBudget: { maxVariantsPerSlot: 2, noInfiniteRetry: true }, counts: { slots: TARGETS.length, accepted: acceptedCandidates.length, blocked: TARGETS.length - acceptedCandidates.length, uniqueGeometry: new Set(acceptedCandidates.map(candidate => candidate.geometryKey)).size }, acceptedCandidates, rows, productionChanged: false, status: acceptedCandidates.length === TARGETS.length ? 'SHAPE_REPAIR_PASS' : 'SHAPE_REPAIR_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: output.status, counts: output.counts }, null, 2));

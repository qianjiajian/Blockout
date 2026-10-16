/* Targeted finite Q0 repair for the two remaining unique-mid blockers. */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/formal-unique-mid.json');
const AUDIT = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-color-repair-targeted');
const OUT = path.join(OUT_DIR, 'q0-targeted-29-37.json');
const MAX_VARIANTS = 8;
const clone = value => structuredClone(value);

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(drag => drag.exitSide);
  const firstExit = new Map();
  exits.forEach((drag, i) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, i + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? []).filter(block => {
    const cells = block.shape ?? [], xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
    const filled = cells.length > 0 && new Set(cells.map(([x, y]) => `${x},${y}`)).size === cells.length
      && cells.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
    return !block.shutterId && filled && (firstExit.get(block.id) ?? Infinity) >= lateThreshold;
  }).sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3).map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

function swapColors(level, firstId, secondId) {
  const next = clone(level);
  const first = next.blocks.find(block => block.id === firstId), second = next.blocks.find(block => block.id === secondId);
  if (!first || !second) return null;
  [first.color, second.color] = [second.color, first.color];
  return next;
}

function swapPositions(level, firstId, secondId) {
  const next = clone(level);
  const first = next.blocks.find(block => block.id === firstId), second = next.blocks.find(block => block.id === secondId);
  if (!first || !second) return null;
  [first.x, second.x] = [second.x, first.x];
  [first.y, second.y] = [second.y, first.y];
  return next;
}

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const audit = fs.existsSync(AUDIT) ? JSON.parse(fs.readFileSync(AUDIT, 'utf8')) : {};
const finalKeys = new Set((audit.checks ?? []).map(row => row.geometryKey).filter(Boolean));
const runtime = await loadContinuationRuntime();
const spatialApi = await loadSpatialApi();
const plans = {
  // Resolve both adjacent pairs by exchanging colours with a neighbouring cell;
  // the final four variants are same-shape anchor swaps for a geometry change.
  29: [
    ['color', 'lv9-original-3', 'lv9-original-7'],
    ['color', 'lv9-original-8', 'lv9-original-4'],
    ['color', 'lv9-original-3', 'lv9-original-4'],
    ['color', 'lv9-original-8', 'lv9-original-7'],
    ['position', 'lv9-original-3', 'lv9-original-7'],
    ['position', 'lv9-original-8', 'lv9-original-4'],
    ['position', 'lv9-original-3', 'lv9-original-4'],
    ['position', 'lv9-original-8', 'lv9-original-7'],
  ],
  37: [
    ['color', 'lv9-original-1', 'lv9-original-0'],
    ['color', 'lv9-original-1', 'lv9-original-3'],
    ['color', 'lv9-original-9', 'lv9-original-8'],
    ['color', 'lv9-original-9', 'lv9-original-7'],
    ['position', 'lv9-original-1', 'lv9-original-9'],
    ['position', 'lv9-original-1', 'lv9-original-0'],
    ['position', 'lv9-original-9', 'lv9-original-8'],
    ['position', 'lv9-original-9', 'lv9-original-7'],
  ],
};

const acceptedCandidates = [];
const rows = [];
for (const index of [29, 37]) {
  const sourceRow = source.rows.find(row => row.index === index);
  const base = sourceRow?.accepted;
  const attempts = [];
  let selected = null;
  for (let variant = 0; variant < MAX_VARIANTS; variant += 1) {
    const plan = plans[index][variant];
    let level = plan[0] === 'color' ? swapColors(base.level, plan[1], plan[2]) : swapPositions(base.level, plan[1], plan[2]);
    if (!level) continue;
    level.id = 999500 + index * 10 + variant;
    level.name = `荣耀联赛Q0定向修复·${index}·${variant + 1}`;
    const attempt = { index, variant: variant + 1, mutation: { type: plan[0], firstBlockId: plan[1], secondBlockId: plan[2] }, status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level) };
    try {
      const key = normalizedPuzzleKey(level); attempt.geometryKey = key;
      if (finalKeys.has(key) || acceptedCandidates.some(candidate => candidate.geometryKey === key)) { attempt.reasons.push('duplicate-final-audit-geometry'); attempts.push(attempt); continue; }
      attempt.opening = openingAudit(level);
      if (attempt.opening.status !== 'PASS') { attempt.reasons.push('q0-opening-failed'); attempts.push(attempt); continue; }
      const target = sourceRow.target;
      const route = searchSpatial(level, spatialApi, { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, floor: Number(target[1]) + 1, normalize: true, orderSeed: index * 100 + variant });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < Number(target[0]) || replay.nonClearingDrags > Number(target[1])) attempt.reasons.push('route-out-of-band');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, { maxStates: 260000, maxTransitions: 1200000, maxMilliseconds: 2600, floor: Number(target[0]), prove: true, normalize: false, orderSeed: index * 100 + variant });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: Number(target[0]), termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); attempts.push(attempt); continue; }
      const scoreBlocks = scoreEvidence(level, route.drags); attempt.scoreBlocks = scoreBlocks;
      if (scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
      const candidate = { index, target, sourceLevelSha256: rawJsonHash(base.level), level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey: key };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
      attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); attempts.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY';
      selected = candidate;
      attempts.push(attempt);
      break;
    } catch (error) {
      attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`);
      attempts.push(attempt);
    }
  }
  if (selected) { acceptedCandidates.push(selected); rows.push({ index, status: 'FORMAL_CANDIDATE_READY', geometryKey: selected.geometryKey, levelSha256: selected.levelSha256, routeSha256: selected.routeSha256, variants: attempts }); }
  else rows.push({ index, status: 'BLOCKED', variants: attempts });
}

const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated targeted Q0 colour/anchor repair for unique-mid indexes 29 and 37; no production integration', targets: [29, 37], finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS, noInfiniteRetry: true }, counts: { slots: 2, accepted: acceptedCandidates.length, blocked: 2 - acceptedCandidates.length, uniqueGeometry: new Set(acceptedCandidates.map(candidate => candidate.geometryKey)).size }, acceptedCandidates, rows, productionChanged: false, status: acceptedCandidates.length === 2 ? 'Q0_TARGETED_REPAIR_PASS' : 'Q0_TARGETED_REPAIR_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: output.status, counts: output.counts }, null, 2));


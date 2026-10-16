/* Finite shape/position follow-up for the one remaining Q0 row (index 3).
 * Starts from the strict-Q0 five-block colour candidate and tries at most
 * eight equal-shape position swaps.  Every candidate is freshly searched,
 * replayed, lower-bound proved and score audited in isolation. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import {
  canonicalLevelHash,
  evidenceCheck,
  mechanismCheck,
  normalizedPuzzleKey,
  openingAudit,
  rawJsonHash,
} from './round3-contract.mjs';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json');
const OUTPUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-repair');
const OUTPUT = path.join(OUTPUT_DIR, 'index3-layout-followup.json');
const MAX_ATTEMPTS = 8;
const clone = value => JSON.parse(JSON.stringify(value));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const source = JSON.parse(fs.readFileSync(INPUT, 'utf8')).rows.find(row => Number(row.index) === 3);
const base = clone(source.accepted.level);
const preferred = new Map([
  ['r102-158-o7', 'blue'],
  ['r102-158-h0-fill0', 'yellow'],
  ['r102-158-h0-fill1', 'green'],
  ['r102-158-h1-fill0', 'red'],
  ['r102-158-h1-fill1', 'blue'],
]);
for (const block of base.blocks ?? []) if (preferred.has(block.id)) block.color = preferred.get(block.id);
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const replayRoute = async (level, drags) => runtime.replayRevisedRoute(level, drags);
const target = [21, 30];
const keyShape = shape => JSON.stringify(shape);
const filledRectangle = shape => {
  if (!Array.isArray(shape) || !shape.length) return false;
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return cells.size === shape.length && cells.size === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
};
function scoreEvidence(level, drags) {
  const exits = drags.filter(drag => drag.exitSide);
  const firstExit = new Map(), firstAction = new Map();
  drags.forEach((drag, index) => {
    if (!firstAction.has(drag.blockId)) firstAction.set(drag.blockId, { index, exit: Boolean(drag.exitSide) });
    if (drag.exitSide && !firstExit.has(drag.blockId)) firstExit.set(drag.blockId, exits.findIndex(item => item === drag) + 1);
  });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? []).filter(block => !block.shutterId && filledRectangle(block.shape)
    && (firstExit.get(block.id) ?? Infinity) >= lateThreshold && !firstAction.get(block.id)?.exit)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3).map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}
function makeSwap(aIndex, bIndex, attempt) {
  const level = clone(base);
  const a = level.blocks[aIndex], b = level.blocks[bIndex];
  if (!a || !b || keyShape(a.shape) !== keyShape(b.shape)) return null;
  [a.x, b.x] = [b.x, a.x];
  [a.y, b.y] = [b.y, a.y];
  level.id = 99100300 + attempt;
  level.name = `荣耀联赛Round2·3·Q0位置修复${attempt}`;
  return { level, mutation: { kind: 'finite-q0-equal-shape-position-swap', pair: [a.id, b.id], attempt } };
}
async function audit(built, attempt) {
  const level = built.level;
  const out = { attempt, candidateLevelId: level.id, fingerprint: digest(level), geometryKey: normalizedPuzzleKey(level), mutation: built.mutation, status: 'BLOCKED', reasons: [] };
  try {
    const mechanism = mechanismCheck(level, 3);
    const opening = openingAudit(level);
    out.mechanism = mechanism;
    out.opening = opening;
    if (mechanism.status !== 'PASS') out.reasons.push(...mechanism.errors);
    if (opening.missingCells.length) out.reasons.push(`q0-missing:${opening.missingCells.length}`);
    if (opening.overlaps.length) out.reasons.push(`q0-overlap:${opening.overlaps.length}`);
    if (opening.adjacentSameColor.length) out.reasons.push(`q0-adjacent-same-color:${opening.adjacentSameColor.length}`);
    if (out.reasons.length) return out;
    const route = searchSpatial(level, spatialApi, { maxStates: 500000, maxTransitions: 3000000, maxMilliseconds: 8000, floor: 31, normalize: true, orderSeed: 300 + attempt });
    out.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
    if (route.status !== 'witness' || !route.drags) { out.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`); return out; }
    const replay = await replayRoute(level, route.drags);
    out.replay = { valid: replay.valid, complete: replay.complete, failed: replay.failed, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
    if (!replay.valid || !replay.complete) out.reasons.push('runtime-replay-invalid-or-incomplete');
    if (replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) out.reasons.push(`route-out-of-band:${replay.nonClearingDrags}`);
    if (out.reasons.length) return out;
    const lower = searchSpatial(level, spatialApi, { maxStates: 500000, maxTransitions: 3000000, maxMilliseconds: 8000, floor: 21, prove: true, normalize: false, orderSeed: 340 + attempt });
    out.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, termination: lower.termination ?? null, floor: 21, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null, sourceLevelSha256: rawJsonHash(level), sourceLevelCanonicalSha256: canonicalLevelHash(level) };
    if (lower.thresholdProven !== true) { out.reasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`); return out; }
    out.scoreBlocks = scoreEvidence(level, route.drags);
    if (out.scoreBlocks.status !== 'PASS') { out.reasons.push('score-block-count-or-opening-direct-exit'); return out; }
    const accepted = { sourceLevelId: source.accepted.sourceLevelId, candidateLevelId: level.id, fingerprint: out.fingerprint, geometryKey: out.geometryKey, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), level, drags: route.drags, lowerBound: out.lowerBound, route: out.route, replay: out.replay, scoreBlocks: out.scoreBlocks, mutation: built.mutation, opening, mechanism };
    const contract = await evidenceCheck({ ...source, status: 'FORMAL_CANDIDATE_READY', formalEligibility: true, accepted }, { strictQ0: true, replayRoute });
    out.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings };
    if (contract.status !== 'PASS') { out.reasons.push(...contract.errors.map(error => `contract:${error}`)); return out; }
    out.status = 'FORMAL_CANDIDATE_READY';
    out.accepted = accepted;
  } catch (error) { out.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`); }
  return out;
}

const groups = new Map();
for (let i = 0; i < base.blocks.length; i += 1) {
  const key = keyShape(base.blocks[i].shape);
  const values = groups.get(key) ?? []; values.push(i); groups.set(key, values);
}
const pairs = [];
for (const values of groups.values()) for (let a = 0; a < values.length; a += 1) for (let b = a + 1; b < values.length; b += 1) pairs.push([values[a], values[b]]);
pairs.sort((a, b) => `${base.blocks[a[0]].id}:${base.blocks[a[1]].id}`.localeCompare(`${base.blocks[b[0]].id}:${base.blocks[b[1]].id}`));
const attempts = [];
for (const [offset, pair] of pairs.slice(0, MAX_ATTEMPTS).entries()) {
  const built = makeSwap(pair[0], pair[1], offset + 1);
  if (!built) continue;
  attempts.push(await audit(built, offset + 1));
}
const accepted = attempts.filter(attempt => attempt.status === 'FORMAL_CANDIDATE_READY');
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated-index3-q0-layout-followup', source: 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json#index3', maxAttempts: MAX_ATTEMPTS, counts: { attempts: attempts.length, accepted: accepted.length, blocked: attempts.length - accepted.length, finiteBudgetSatisfied: attempts.length <= MAX_ATTEMPTS }, attempts, productionChanged: false };
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(OUTPUT_DIR, 'index3-layout-candidates.json'), `${JSON.stringify({ schemaVersion: 1, rows: accepted.map(attempt => ({ index: 3, status: 'FORMAL_CANDIDATE_READY', formalEligibility: true, accepted: attempt.accepted })), productionChanged: false }, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT).replaceAll('\\', '/'), attempts: attempts.length, accepted: accepted.length, statuses: attempts.map(attempt => ({ attempt: attempt.attempt, status: attempt.status, reasons: attempt.reasons })) }, null, 2));

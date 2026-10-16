/* Finite position-only follow-up for the duplicate pair containing index 42. */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const AUDIT = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-targeted-pairs');
const OUT = path.join(OUT_DIR, 'duplicate-42-position-repair.json');
const MAX_VARIANTS = 8;
const clone = value => structuredClone(value);
const scoreEvidence = (level, drags) => {
  const exits = (drags ?? []).filter(drag => drag.exitSide), firstExit = new Map();
  exits.forEach((drag, i) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, i + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? []).filter(block => {
    const cells = block.shape ?? [], xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
    const filled = cells.length > 0 && cells.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
    return !block.shutterId && filled && (firstExit.get(block.id) ?? Infinity) >= lateThreshold;
  }).sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id)).slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
};
const audit = JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
const check = audit.checks.find(row => row.index === 42);
const sourceReport = JSON.parse(fs.readFileSync(path.join(ROOT, check.source), 'utf8'));
const base = (sourceReport.rows ?? []).find(row => row.index === 42)?.accepted ?? (sourceReport.acceptedCandidates ?? []).find(row => row.index === 42);
const finalKeys = new Set((audit.checks ?? []).map(row => row.geometryKey).filter(Boolean));
const blocks = base.level.blocks;
const pairs = [];
for (let a = 0; a < blocks.length; a += 1) for (let b = a + 1; b < blocks.length; b += 1) if (blocks[a].color !== blocks[b].color) pairs.push([blocks[a].id, blocks[b].id]);
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const attempts = [];
let selected = null;
for (let variant = 0; variant < Math.min(MAX_VARIANTS, pairs.length); variant += 1) {
  const [firstId, secondId] = pairs[(variant * 7 + 42 * 3) % pairs.length];
  const level = clone(base.level), first = level.blocks.find(block => block.id === firstId), second = level.blocks.find(block => block.id === secondId);
  [first.x, second.x] = [second.x, first.x]; [first.y, second.y] = [second.y, first.y];
  level.id = 999800 + variant; level.name = `荣耀联赛重复对组位置修复·42·${variant + 1}`;
  const attempt = { index: 42, variant: variant + 1, mutation: { type: 'position-swap', firstBlockId: firstId, secondBlockId: secondId }, status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level) };
  try {
    const key = normalizedPuzzleKey(level); attempt.geometryKey = key;
    if (finalKeys.has(key)) { attempt.reasons.push('duplicate-final-audit-geometry'); attempts.push(attempt); continue; }
    attempt.opening = openingAudit(level);
    if (attempt.opening.status !== 'PASS') { attempt.reasons.push('q0-opening-failed'); attempts.push(attempt); continue; }
    const target = [16, 20];
    const route = searchSpatial(level, spatialApi, { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, floor: target[1] + 1, normalize: true, orderSeed: 4200 + variant });
    attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null };
    if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
    const replay = runtime.replayRevisedRoute(level, route.drags); attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
    if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
    if (replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) attempt.reasons.push('route-out-of-band');
    if (attempt.reasons.length) { attempts.push(attempt); continue; }
    const lower = searchSpatial(level, spatialApi, { maxStates: 260000, maxTransitions: 1200000, maxMilliseconds: 2600, floor: target[0], prove: true, normalize: false, orderSeed: 4200 + variant });
    attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: target[0], termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, sourceLevelSha256: rawJsonHash(level) };
    if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); attempts.push(attempt); continue; }
    const scoreBlocks = scoreEvidence(level, route.drags); attempt.scoreBlocks = scoreBlocks;
    if (scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
    const candidate = { index: 42, target, sourceLevelSha256: base.levelSha256 ?? rawJsonHash(base.level), level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey: key };
    const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
    attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
    if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); attempts.push(attempt); continue; }
    attempt.status = 'FORMAL_CANDIDATE_READY'; selected = candidate; attempts.push(attempt); break;
  } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`); attempts.push(attempt); }
}
const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated index42 position repair; no production integration', targets: [42], finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS, noInfiniteRetry: true }, counts: { slots: 1, accepted: selected ? 1 : 0, blocked: selected ? 0 : 1, uniqueGeometry: selected ? 1 : 0 }, acceptedCandidates: selected ? [selected] : [], rows: [{ index: 42, status: selected ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', variants: attempts }], productionChanged: false, status: selected ? 'DUPLICATE_42_POSITION_REPAIR_PASS' : 'DUPLICATE_42_POSITION_REPAIR_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: output.status, counts: output.counts }, null, 2));


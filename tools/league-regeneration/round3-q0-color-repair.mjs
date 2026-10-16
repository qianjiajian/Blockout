/* Finite Q0 colour repairs for the eight round-3 unique-mid candidates. */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const TARGETS = [29, 31, 35, 36, 37, 40, 41, 48];
const MAX_VARIANTS_PER_SLOT = 8;
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-color-repair');
const OUT = path.join(OUT_DIR, 'round3-unique-mid-q0.json');
const sourcePath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/formal-unique-mid.json');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const clone = value => structuredClone(value);

function scoreEvidence(level, drags) {
  const exits = (drags ?? []).filter(drag => drag.exitSide);
  const firstExit = new Map(); exits.forEach((drag, i) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, i + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? []).filter(block => {
    const cells = block.shape ?? [], xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
    const filled = cells.length > 0 && new Set(cells.map(([x, y]) => `${x},${y}`)).size === cells.length
      && cells.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
    return !block.shutterId && filled && (firstExit.get(block.id) ?? Infinity) >= lateThreshold;
  }).sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id)).slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

const finalAuditPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
const finalKeys = fs.existsSync(finalAuditPath)
  ? new Set((JSON.parse(fs.readFileSync(finalAuditPath, 'utf8')).checks ?? []).map(row => row.geometryKey).filter(Boolean))
  : new Set();
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const rows = [];
const acceptedCandidates = [];

for (const index of TARGETS) {
  const sourceRow = source.rows.find(row => row.index === index);
  const base = sourceRow?.accepted;
  const attempts = [];
  if (!base?.level) { rows.push({ index, status: 'BLOCKED', attempts: [{ variant: 0, reasons: ['source-payload-missing'] }] }); continue; }
  const opening = openingAudit(base.level);
  const pairs = [...new Set(opening.adjacentSameColor.map(pair => pair.join('|')))];
  const colors = [...new Set([...(base.level.gates ?? []).map(gate => gate.color), ...(base.level.blocks ?? []).map(block => block.color)])];
  const variants = [];
  for (const pairKey of pairs) {
    const [firstId, secondId] = pairKey.split('|');
    for (const blockId of [firstId, secondId]) for (const color of colors) {
      if (variants.length >= MAX_VARIANTS_PER_SLOT) break;
      const original = base.level.blocks.find(block => block.id === blockId)?.color;
      if (color === original) continue;
      variants.push({ blockId, color });
    }
    if (variants.length >= MAX_VARIANTS_PER_SLOT) break;
  }
  for (let variant = 0; variant < variants.length; variant += 1) {
    const choice = variants[variant];
    const level = clone(base.level);
    const block = level.blocks.find(item => item.id === choice.blockId);
    if (!block) continue;
    block.color = choice.color;
    level.id = 999000 + index * 10 + variant;
    level.name = `荣耀联赛Q0颜色修复·${index}·${variant}`;
    const attempt = { index, variant: variant + 1, mutation: choice, status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level) };
    try {
      const key = normalizedPuzzleKey(level); attempt.geometryKey = key;
      if (finalKeys.has(key) || acceptedCandidates.some(candidate => candidate.geometryKey === key)) { attempt.reasons.push('duplicate-final-audit-geometry'); attempts.push(attempt); continue; }
      attempt.opening = openingAudit(level);
      if (attempt.opening.status !== 'PASS') { attempt.reasons.push('q0-opening-failed'); attempts.push(attempt); continue; }
      const target = sourceRow.target;
      const route = searchSpatial(level, spatialApi, { maxStates: 180000, maxTransitions: 800000, maxMilliseconds: 1800, floor: Number(target[1]) + 1, normalize: true, orderSeed: index * 10 + variant });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < Number(target[0]) || replay.nonClearingDrags > Number(target[1])) attempt.reasons.push('route-out-of-band');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, floor: Number(target[0]), prove: true, normalize: false, orderSeed: index * 10 + variant });
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
const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated round3 unique-mid Q0 color repair; no production integration', targets: TARGETS, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS_PER_SLOT, noInfiniteRetry: true }, counts: { slots: TARGETS.length, accepted: acceptedCandidates.length, blocked: TARGETS.length - acceptedCandidates.length, uniqueGeometry: new Set(acceptedCandidates.map(candidate => candidate.geometryKey)).size }, acceptedCandidates, rows, productionChanged: false, status: acceptedCandidates.length === TARGETS.length ? 'Q0_COLOR_REPAIR_PASS' : 'Q0_COLOR_REPAIR_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: output.status, counts: output.counts }, null, 2));

/* Finite local colour-relation repairs for small duplicate-geometry pairs. */
import fs from 'node:fs';
import path from 'node:path';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, openingAudit, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const AUDIT = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-targeted-pairs');
const OUT = path.join(OUT_DIR, 'duplicate-pair-color-repair.json');
const MAX_VARIANTS = 8;
const TARGETS = [42, 72, 59, 47];
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

function sourceCandidates() {
  const audit = JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
  const rows = new Map();
  for (const check of audit.checks ?? []) {
    if (!TARGETS.includes(check.index) || !check.source) continue;
    const file = path.join(ROOT, check.source);
    if (!fs.existsSync(file)) continue;
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const candidate of report.acceptedCandidates ?? []) if (candidate.index === check.index) rows.set(check.index, candidate);
    for (const row of report.rows ?? []) if (row.index === check.index && row.accepted?.level) rows.set(check.index, row.accepted);
  }
  return rows;
}

const audit = JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
const finalKeys = new Set((audit.checks ?? []).map(row => row.geometryKey).filter(Boolean));
const source = sourceCandidates();
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
const acceptedCandidates = [];
const rows = [];

for (const index of TARGETS) {
  const base = source.get(index);
  const attempts = [];
  let selected = null;
  const blocks = base?.level?.blocks ?? [];
  const pairs = [];
  for (let a = 0; a < blocks.length; a += 1) for (let b = a + 1; b < blocks.length; b += 1) {
    if (blocks[a].color === blocks[b].color) continue;
    pairs.push([blocks[a].id, blocks[b].id]);
  }
  for (let variant = 0; variant < Math.min(MAX_VARIANTS, pairs.length); variant += 1) {
    const [firstId, secondId] = pairs[(variant * 7 + index * 3) % pairs.length];
    const level = clone(base.level);
    const first = level.blocks.find(block => block.id === firstId), second = level.blocks.find(block => block.id === secondId);
    [first.color, second.color] = [second.color, first.color];
    level.id = 999700 + index * 10 + variant;
    level.name = `荣耀联赛重复对组调色·${index}·${variant + 1}`;
    const attempt = { index, variant: variant + 1, mutation: { type: 'color-swap', firstBlockId: firstId, secondBlockId: secondId }, status: 'BLOCKED', reasons: [], levelSha256: rawJsonHash(level) };
    try {
      const key = normalizedPuzzleKey(level); attempt.geometryKey = key;
      if (finalKeys.has(key) || acceptedCandidates.some(candidate => candidate.geometryKey === key)) { attempt.reasons.push('duplicate-final-audit-geometry'); attempts.push(attempt); continue; }
      attempt.opening = openingAudit(level);
      if (attempt.opening.status !== 'PASS') { attempt.reasons.push('q0-opening-failed'); attempts.push(attempt); continue; }
      const target = [16, 20];
      const route = searchSpatial(level, spatialApi, { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, floor: target[1] + 1, normalize: true, orderSeed: index * 100 + variant });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) attempt.reasons.push('route-out-of-band');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, { maxStates: 260000, maxTransitions: 1200000, maxMilliseconds: 2600, floor: target[0], prove: true, normalize: false, orderSeed: index * 100 + variant });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: target[0], termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); attempts.push(attempt); continue; }
      const scoreBlocks = scoreEvidence(level, route.drags); attempt.scoreBlocks = scoreBlocks;
      if (scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
      const candidate = { index, target, sourceLevelSha256: base.levelSha256 ?? rawJsonHash(base.level), level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, scoreBlocks, geometryKey: key };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (candidateLevel, drags) => runtime.replayRevisedRoute(candidateLevel, drags) });
      attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); attempts.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY'; selected = candidate; attempts.push(attempt); break;
    } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 300)}`); attempts.push(attempt); }
  }
  if (selected) { acceptedCandidates.push(selected); rows.push({ index, status: 'FORMAL_CANDIDATE_READY', geometryKey: selected.geometryKey, levelSha256: selected.levelSha256, routeSha256: selected.routeSha256, variants: attempts }); }
  else rows.push({ index, status: 'BLOCKED', variants: attempts });
}

const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated local color-relation repair for duplicate pairs; no production integration', targets: TARGETS, finiteBudget: { maxVariantsPerSlot: MAX_VARIANTS, noInfiniteRetry: true }, counts: { slots: TARGETS.length, accepted: acceptedCandidates.length, blocked: TARGETS.length - acceptedCandidates.length, uniqueGeometry: new Set(acceptedCandidates.map(candidate => candidate.geometryKey)).size }, acceptedCandidates, rows, productionChanged: false, status: acceptedCandidates.length === TARGETS.length ? 'DUPLICATE_PAIR_REPAIR_PASS' : 'DUPLICATE_PAIR_REPAIR_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: output.status, counts: output.counts }, null, 2));


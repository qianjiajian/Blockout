/* Finite real retile pass for duplicate league geometries.  Isolated only. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { retileAndRecolor } from './finite-search-policy.mjs';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, normalizedPuzzleKey, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/retile-repair');
const OUT = path.join(OUT_DIR, 'retile-duplicate-repair.json');
const TARGETS = [6,7,9,20,26,27,29,30,31,35,36,37,39,40,41,42,44,45,46,50,52,57,60,61,64,65,67,69,71,76,77,80,81,84,85,89,90,91,95,99,10,11,12,15,16,17,19,23,28,33,38,43,48,53,58,63,68,73,78,83,88,93,98];
const targetFor = i => ((i - 1) % 5 === 2 ? { lower: 21, upper: 30 } : { lower: 16, upper: 20 });
const difficulty = i => ((i - 1) % 5 === 2 ? 'super' : 'hard');
const read = p => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
const clone = x => structuredClone(x);
function candidateRows(report) {
  if (!report) return [];
  if (Array.isArray(report.acceptedCandidates)) return report.acceptedCandidates.map(a => ({ index: a.index, accepted: a, status: 'FORMAL_CANDIDATE_READY', formalEligibility: true, target: targetFor(a.index), difficulty: difficulty(a.index) }));
  return (report.rows ?? []).filter(r => r.accepted?.level).map(r => ({ ...r, target: r.target ?? targetFor(r.index), difficulty: r.difficulty ?? difficulty(r.index), formalEligibility: true }));
}
const selected = new Map();
const put = (r, source, force = false) => { if (r?.accepted?.level && (force || !selected.has(r.index))) selected.set(r.index, { ...r, source, target: r.target ?? targetFor(r.index), difficulty: r.difficulty ?? difficulty(r.index), formalEligibility: true }); };
for (const r of read(path.join(ROOT, 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json'))?.rows ?? []) put(r, 'binding');
for (const p of [
  'deliverables/league-regeneration-20261005/round2/early-targeted/formal-1-19.json',
  'deliverables/league-regeneration-20261005/round2/early/source198-stripped-early-formal.json',
]) for (const r of candidateRows(read(path.join(ROOT, p)))) put(r, p);
for (const r of candidateRows(read(path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-repair/q0-repaired-candidates.json')))) put(r, 'q0', true);
for (const d of ['geometry-repair','geometry-repair-max-group','geometry-repair-max-group-32-44','geometry-repair-max-group-45-57','geometry-repair-max-group-59-70','geometry-repair-max-group-71-82','geometry-repair-max-group-84-100']) {
  const dir = path.join(ROOT, 'deliverables/league-regeneration-20261006', d); if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json') && !x.includes('verification') && !x.includes('report'))) for (const r of candidateRows(read(path.join(dir, f)))) put(r, `${d}/${f}`, true);
}

const shapeBundle = await build({ stdin: { resolveDir: ROOT, contents: "export { FORMAL_BLOCK_SHAPES } from './src/game/formalBlockShapes.ts';" }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { FORMAL_BLOCK_SHAPES } = await import(`data:text/javascript;base64,${Buffer.from(shapeBundle.outputFiles[0].text).toString('base64')}`);
const api = await loadSpatialApi();
const runtime = await loadContinuationRuntime();

// Reserve the geometry of every row not being repaired. A replacement must be
// genuinely distinct from the complete current catalogue, not merely from a
// prior repair batch.
const reserved = new Set();
for (const [index, row] of selected) if (!TARGETS.includes(index)) reserved.add(normalizedPuzzleKey(row.accepted.level));
const accepted = [];
const rows = [];
for (const index of TARGETS) {
  const source = selected.get(index);
  if (!source?.accepted?.level) { rows.push({ index, status: 'BLOCKED', reasons: ['missing-source-level'] }); continue; }
  const base = source.accepted.level;
  const candidates = retileAndRecolor(base, FORMAL_BLOCK_SHAPES, 8);
  let chosen = null; const attempts = [];
  for (let variant = 0; variant < candidates.length; variant += 1) {
    const level = clone(candidates[variant]);
    level.id = 998000 + index * 10 + variant;
    level.name = `荣耀联赛重铺修复·${index}·${variant + 1}`;
    level.difficulty = difficulty(index); level.mechanismRules = 'revised-2026-09-27-v1.5';
    const key = normalizedPuzzleKey(level);
    const attempt = { index, variant: variant + 1, geometryKey: key, status: 'BLOCKED', reasons: [] };
    if (reserved.has(key) || accepted.some(x => x.geometryKey === key)) { attempt.reasons.push('duplicate-canonical-geometry'); attempts.push(attempt); continue; }
    try {
      const target = targetFor(index);
      const route = searchSpatial(level, api, { floor: target.upper + 1, normalize: true, maxStates: 180000, maxTransitions: 800000, maxMilliseconds: 1800, orderSeed: index * 100 + variant });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete || replay.nonClearingDrags < target.lower || replay.nonClearingDrags > target.upper) { attempt.reasons.push('route-replay-out-of-band'); attempts.push(attempt); continue; }
      const lower = searchSpatial(level, api, { floor: target.lower, prove: true, normalize: false, maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, orderSeed: index * 100 + variant });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, floor: target.lower, termination: lower.termination ?? null, exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, sourceLevelSha256: rawJsonHash(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}`); attempts.push(attempt); continue; }
      const candidate = { index, target, level, levelSha256: rawJsonHash(level), routeSha256: rawJsonHash(route.drags), drags: route.drags, lowerBound: attempt.lowerBound, replay: attempt.replay, route: { status: 'witness', cost: replay.nonClearingDrags }, geometryKey: key };
      const contract = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (l, d) => runtime.replayRevisedRoute(l, d) });
      attempt.contract = { status: contract.status, errors: contract.errors, warnings: contract.warnings, score: contract.score };
      if (contract.status !== 'PASS') { attempt.reasons.push(...contract.errors); attempts.push(attempt); continue; }
      candidate.scoreBlocks = contract.score;
      chosen = candidate; attempt.status = 'FORMAL_CANDIDATE_READY'; attempts.push(attempt); break;
    } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error).slice(0, 250)}`); attempts.push(attempt); }
  }
  if (chosen) { accepted.push(chosen); reserved.add(chosen.geometryKey); rows.push({ index, status: 'FORMAL_CANDIDATE_READY', geometryKey: chosen.geometryKey, levelSha256: chosen.levelSha256, routeSha256: chosen.routeSha256, attempts }); }
  else rows.push({ index, status: 'BLOCKED', attempts });
  fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(`${OUT}.partial`, JSON.stringify({ status: 'PARTIAL', accepted, rows }, null, 2));
}
const out = { schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'finite-real-retile-duplicate-geometry-repair; isolated; no production integration', targets: TARGETS, acceptedCandidates: accepted, rows, counts: { slots: TARGETS.length, accepted: accepted.length, blocked: TARGETS.length - accepted.length, uniqueGeometry: new Set(accepted.map(x => x.geometryKey)).size }, finiteBudget: { maxVariantsPerSlot: 8, noInfiniteRetry: true }, productionChanged: false, status: accepted.length === TARGETS.length ? 'RETiLE_REPAIR_PASS' : 'RETiLE_REPAIR_FINDINGS' };
fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`); fs.rmSync(`${OUT}.partial`, { force: true }); console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: out.status, counts: out.counts }, null, 2));

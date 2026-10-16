/* Round4 isolated early-fix audit. Writes only deliverables/.../round4/early. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { retileAndRecolor, gameplayFingerprint, mutationChanges } from './finite-search-policy.mjs';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'deliverables/league-regeneration-20261005/round4/early');
const indexes = [1, 2, 4, 5, 8, 13, 18];
const MAX_VARIANTS = 80;
const HARD = new Set([1, 2, 4, 5]);
const SUPER = new Set([8, 13, 18]);
const TARGET = i => SUPER.has(i) ? [21, 30] : [16, 20];
const SOURCE = i => SUPER.has(i) ? 198 : 158;
const ROUTE = { maxStates: 450000, maxTransitions: 2200000, maxMilliseconds: 3500 };
const PROOF = { maxStates: 1000000, maxTransitions: 5000000, maxMilliseconds: 9000 };
const PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const clone = x => structuredClone(x);
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cellKey = p => `${p[0]},${p[1]}`;
const cellsOf = b => (b.shape ?? []).map(([dx, dy]) => [b.x + dx, b.y + dy]);
const filledRectangle = shape => {
  if (!shape?.length) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return shape.length === area && new Set(shape.map(cellKey)).size === shape.length;
};
const bundle = await build({
  stdin: { resolveDir: ROOT, loader: 'ts', contents: `
    export { LEVELS } from './src/core/levels.ts';
    export { FORMAL_BLOCK_SHAPES } from './src/game/formalBlockShapes.ts';
    export { PuzzleModel, validateLevel } from './src/core/PuzzleModel.ts';
    export { LeagueRun } from './src/core/leagueRun.ts';
    export { createLeague, finishLeagueAttempt } from './src/core/league.ts';
  ` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { LEVELS, FORMAL_BLOCK_SHAPES, PuzzleModel, validateLevel, LeagueRun, createLeague, finishLeagueAttempt } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
fs.mkdirSync(OUT, { recursive: true });

function stripForIndex(level, index) {
  const l = clone(level);
  for (const g of l.gates ?? []) if (index < 6) delete g.frozen;
  for (const b of l.blocks ?? []) {
    // The round4 pool intentionally omits all mechanisms outside the early gate;
    // this also makes variants comparable and prevents old lock/shell fields leaking.
    delete b.keyId; delete b.lockedBy; delete b.lockCount;
    delete b.frozen; delete b.layers; delete b.shutterId;
  }
  delete l.shutters;
  l.mechanismRules = 'revised-2026-09-27-v1.5';
  return l;
}
function q0(level) {
  const legal = new Set((level.playable ?? []).map(cellKey));
  const occ = new Map();
  for (const b of level.blocks ?? []) for (const p of cellsOf(b)) {
    const k = cellKey(p); const list = occ.get(k) ?? []; list.push(b.id); occ.set(k, list);
  }
  const adjacent = [];
  for (let i = 0; i < (level.blocks ?? []).length; i++) for (let j = i + 1; j < level.blocks.length; j++) {
    const a = level.blocks[i], b = level.blocks[j];
    if (a.color !== b.color) continue;
    for (const p of cellsOf(a)) for (const q of cellsOf(b)) {
      if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) === 1) adjacent.push([a.id, b.id]);
    }
  }
  return { playableCells: legal.size, coveredCells: occ.size, missingCells: [...legal].filter(k => !occ.has(k)).length, overlapCells: [...occ.values()].filter(v => v.length !== 1).length, adjacentSameColor: adjacent.length };
}
function mechanismPresence(level) {
  return {
    iceGate: (level.gates ?? []).some(g => (g.frozen ?? 0) > 0),
    frozenBlock: (level.blocks ?? []).some(b => (b.frozen ?? 0) > 0),
    shell: (level.blocks ?? []).some(b => (b.layers?.length ?? 1) > 1),
    shutter: Boolean(level.shutters?.length || (level.blocks ?? []).some(b => b.shutterId)),
    generator: Boolean(level.generators?.length), axis: (level.blocks ?? []).some(b => b.movementAxis),
    lock: (level.blocks ?? []).some(b => b.keyId || b.lockedBy || b.lockCount), lift: Boolean(level.elevators?.length),
    star: (level.blocks ?? []).some(b => b.star) || (level.gates ?? []).some(g => g.star),
    grid: Boolean(level.coloredGrids?.length),
  };
}
const unlock = { iceGate: 6, frozenBlock: 10, shell: 15, shutter: 20, generator: 35, axis: 50, lock: 60, lift: 65, star: 100, grid: 200 };
function gateErrors(level, index) {
  const p = mechanismPresence(level);
  return Object.entries(p).filter(([name, present]) => present && index < unlock[name]).map(([name]) => `mechanism-before-unlock:${name}:${unlock[name]}`);
}
function paletteShift(level, shift) {
  const map = new Map(PALETTE.map((c, i) => [c, PALETTE[(i + shift) % PALETTE.length]]));
  for (const item of [...(level.blocks ?? []), ...(level.gates ?? []), ...(level.flipDoors ?? []), ...(level.coloredGrids ?? [])]) {
    if (item.color) item.color = map.get(item.color) ?? item.color;
    if (item.layers) item.layers = item.layers.map(c => map.get(c) ?? c);
  }
  return Object.fromEntries(map);
}
function candidatePool(index) {
  const base = stripForIndex(LEVELS[SOURCE(index) - 1], index);
  const variants = [];
  const seen = new Set();
  const add = (level, mutation) => {
    level.id = 994000 + index * 100 + variants.length;
    level.name = `荣耀联赛${index}·round4早段候选${variants.length}`;
    level.difficulty = SUPER.has(index) ? 'super' : 'hard';
    level.timeSeconds = 180; level.reward = 0;
    level.mechanismRules = 'revised-2026-09-27-v1.5';
    const fp = gameplayFingerprint(level);
    const changes = mutationChanges(base, level);
    if (seen.has(fp) || variants.length >= MAX_VARIANTS || !changes.shapeBlockIds.length) return;
    if (q0(level).missingCells || q0(level).overlapCells || q0(level).adjacentSameColor) return;
    if (gateErrors(level, index).length) return;
    try { validateLevel(level); } catch { return; }
    seen.add(fp); variants.push({ level, fp, mutation: { ...mutation, shapeBlockIds: changes.shapeBlockIds, colorBlockIds: changes.colorBlockIds } });
  };
  // Add a finite baseline record only for diagnosis; acceptance requires a real retile.
  for (let i = 0; i < Math.min(80, retileAndRecolor(base, FORMAL_BLOCK_SHAPES, MAX_VARIANTS).length); i++) {
    const l = clone(retileAndRecolor(base, FORMAL_BLOCK_SHAPES, MAX_VARIANTS)[i]);
    const paletteMap = paletteShift(l, 1 + ((index * 17 + i) % 7));
    add(l, { kind: 'retile-plus-palette', variant: i, paletteMap, sourceLevelId: SOURCE(index), removedFields: ['keyId', 'lockedBy', 'lockCount', 'frozen', 'layers', 'shutterId', 'shutters'] });
  }
  return { base, variants };
}
function applyDrag(model, drag) {
  model.beginAction();
  for (const p of drag.path ?? []) if (!model.moveBlockStep(drag.blockId, p[0], p[1])) { model.cancelAction(); return { ok: false, reason: `move:${drag.blockId}` }; }
  let result;
  if (drag.exitSide) { result = model.tryExit(drag.blockId, drag.exitSide); if (!result.ok) { model.cancelAction(); return { ok: false, reason: `exit:${drag.blockId}` }; } }
  if (!model.commitAction()) return { ok: false, reason: 'commit' };
  return { ok: true, result };
}
function scoreEvidence(level, drags) {
  const model = new PuzzleModel(level); model.startCountdown(); const events = []; let error = null;
  for (let i = 0; i < drags.length; i++) {
    const out = applyDrag(model, drags[i]); if (!out.ok) { error = out.reason; break; }
    if (out.result?.ok) events.push({ step: i + 1, blockId: out.result.blockId, layerRemoved: out.result.layerRemoved === true, fullyRemoved: out.result.layerRemoved !== true && !model.getBlock(out.result.blockId) });
  }
  const late = Math.floor(events.length / 2) + 1;
  const selected = [];
  for (const b of level.blocks ?? []) {
    const e = events.filter(x => x.blockId === b.id && x.fullyRemoved).at(-1);
    if (e && e.step >= late && filledRectangle(b.shape)) selected.push({ blockId: b.id, clearEvent: e.step, points: 10 });
  }
  selected.sort((a, b) => a.clearEvent - b.clearEvent || String(a.blockId).localeCompare(String(b.blockId)));
  const chosen = selected.slice(0, 3);
  return { status: !error && model.snapshot().complete && chosen.length >= 1 && chosen.length <= 3 ? 'PASS' : 'BLOCKED', selected: chosen, lateThreshold: late, completeExitEvents: events.length, totalPoints: chosen.length * 10, replayComplete: !error && model.snapshot().complete, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY', error };
}
function scoreRuntime(level, drags, score) {
  const now = 1790841600000; const selected = score.selected ?? []; const ids = selected.map(x => x.blockId); const state = createLeague(now, 0x5eeda11, 0); const run = new LeagueRun(state, 1, level, ids, now); const events = []; let error = null;
  for (let i = 0; i < drags.length; i++) { const before = run.model.snapshot(); const out = applyDrag(run.model, drags[i]); if (!out.ok) { error = out.reason; break; } if (out.result?.ok) { run.recordRemoval(out.result, now + i + 1); events.push({ step: i + 1, blockId: out.result.blockId, layerRemoved: out.result.layerRemoved === true, fullyRemoved: out.result.layerRemoved !== true && !run.model.getBlock(out.result.blockId), delta: run.model.snapshot().cleared - before.cleared }); } }
  const snap = run.model.snapshot(); const finish = !error && run.successful ? finishLeagueAttempt(state, run.attempt, true, run.completedMs) : { status: 'not-successful', points: 0, state };
  const failedState = createLeague(now, 0x5eeda11, 0); const failed = finishLeagueAttempt(failedState, run.attempt, false, now + 999);
  const special = selected.map(x => { const e = events.find(y => y.blockId === x.blockId && y.fullyRemoved); return { blockId: x.blockId, completeRemoval: Boolean(e), clearEvent: e?.step ?? null, points: e ? 10 : 0 }; });
  const checks = { freshPuzzleModelReplay: !error && snap.complete && !snap.failed, successful: !error && run.successful, allSpecialsFullyRemoved: special.every(x => x.completeRemoval), allSpecialsInLateHalf: special.every(x => x.clearEvent >= score.lateThreshold), pointsPerSpecialTen: special.every(x => x.points === 10), finishLeagueAttemptCredited: finish.status === 'credited' && finish.points === ids.length * 10 && finish.state.season.score === ids.length * 10, unsuccessfulAttemptPointsZero: failed.status === 'discarded' && failed.points === 0 && failed.state.season.score === 0 };
  return { status: Object.values(checks).every(Boolean) ? 'PASS' : 'BLOCKED', checks, events, special, finish: { status: finish.status, points: finish.points, score: finish.state.season.score }, failed: { status: failed.status, points: failed.points, score: failed.state.season.score }, snapshot: snap, error };
}

const rows = [];
for (const index of indexes) {
  const { base, variants } = candidatePool(index); const target = TARGET(index); const attempts = []; let accepted = null;
  // Hard source158 is first diagnosed against the strict adjacent-color gate. This is a finite,
  // explicit block; it does not spend solver budget on a candidate violating q0.
  if (HARD.has(index) && q0(base).adjacentSameColor > 0) {
    const row = { index, difficulty: 'hard', target: { lower: target[0], upper: target[1] }, sourceLevelId: SOURCE(index), status: 'BLOCKED', formalEligibility: false, attempts: [], reasons: ['q0-adjacent-same-color-in-source158-stripped-base'], q0: q0(base), mechanismPresence: mechanismPresence(base), finiteBudget: { maxVariants: MAX_VARIANTS, noInfiniteRetry: true } };
    rows.push(row); fs.writeFileSync(path.join(OUT, `formal-${index}.partial.json`), JSON.stringify(row, null, 2) + '\n'); console.log(JSON.stringify({ index, accepted: false, blocked: row.reasons })); continue;
  }
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i]; const a = { attempt: i + 1, sourceLevelId: SOURCE(index), fingerprint: v.fp, levelSha256: sha(v.level), mutation: v.mutation, status: 'BLOCKED', reasons: [], q0: q0(v.level), target: { lower: target[0], upper: target[1] } };
    try {
      const route = searchSpatial(v.level, spatial, { ...ROUTE, floor: target[1] + 1, normalize: true, orderSeed: index * 1000 + i });
      a.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null, sourceLevelSha256: route.sourceLevelSha256 ?? null };
      if (route.status !== 'witness' || !route.drags) { a.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`); attempts.push(a); fs.writeFileSync(path.join(OUT, `formal-${index}.partial.json`), JSON.stringify({ index, attempts }, null, 2) + '\n'); continue; }
      const replay = runtime.replayRevisedRoute(v.level, route.drags); a.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete || replay.nonClearingDrags < target[0] || replay.nonClearingDrags > target[1]) { a.reasons.push('route-out-of-band-or-invalid'); attempts.push(a); continue; }
      const proof = searchSpatial(v.level, spatial, { ...PROOF, floor: target[0], prove: true, normalize: false, orderSeed: index * 1000 + i }); a.lowerBound = { status: proof.status, thresholdProven: proof.thresholdProven === true, termination: proof.termination ?? null, exploredStates: proof.exploredStates ?? null, attemptedTransitions: proof.attemptedTransitions ?? null, elapsedMilliseconds: proof.elapsedMilliseconds ?? null, sourceLevelSha256: proof.sourceLevelSha256 ?? null };
      if (proof.thresholdProven !== true || proof.sourceLevelSha256 !== a.levelSha256) { a.reasons.push(proof.thresholdProven !== true ? `lower-${proof.status}` : 'lower-source-sha-mismatch'); attempts.push(a); continue; }
      a.scoreBlocks = scoreEvidence(v.level, route.drags); if (a.scoreBlocks.status !== 'PASS') { a.reasons.push('score-block-evidence-failed'); attempts.push(a); continue; }
      a.scoreRuntime = scoreRuntime(v.level, route.drags, a.scoreBlocks); if (a.scoreRuntime.status !== 'PASS') { a.reasons.push('score-runtime-replay-failed'); attempts.push(a); continue; }
      a.status = 'FORMAL_CANDIDATE_READY'; a.level = v.level; a.drags = route.drags; a.routeSha256 = sha(route.drags); accepted = a; attempts.push(a); break;
    } catch (error) { a.reasons.push(`error:${error?.message ?? error}`); attempts.push(a); }
  }
  const row = { index, difficulty: SUPER.has(index) ? 'super' : 'hard', target: { lower: target[0], upper: target[1] }, sourceLevelId: SOURCE(index), status: accepted ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', formalEligibility: Boolean(accepted), selectedAttempt: accepted?.attempt ?? null, accepted: accepted ? { sourceLevelId: accepted.sourceLevelId, fingerprint: accepted.fingerprint, levelSha256: accepted.levelSha256, routeSha256: accepted.routeSha256, level: accepted.level, drags: accepted.drags, mutation: accepted.mutation, route: accepted.route, replay: accepted.replay, lowerBound: accepted.lowerBound, scoreBlocks: accepted.scoreBlocks, scoreRuntime: accepted.scoreRuntime } : null, attempts, reasons: accepted ? [] : [...new Set(attempts.flatMap(x => x.reasons))], finiteBudget: { maxVariants: MAX_VARIANTS, route: ROUTE, proof: PROOF, noInfiniteRetry: true } };
  rows.push(row); fs.writeFileSync(path.join(OUT, `formal-${index}.partial.json`), JSON.stringify(row, null, 2) + '\n'); console.log(JSON.stringify({ index, accepted: Boolean(accepted), attempts: attempts.length, U: accepted?.replay?.nonClearingDrags ?? null, L: accepted?.lowerBound?.thresholdProven ?? false }));
}
const report = { status: rows.every(r => r.formalEligibility) ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES', generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', source: 'round4 finite early fixes; no production writes', indexes, accepted: rows.filter(r => r.formalEligibility).map(r => r.index), blocked: rows.filter(r => !r.formalEligibility).map(r => r.index), finiteBudget: { maxVariantsPerIndex: MAX_VARIANTS, route: ROUTE, proof: PROOF, noInfiniteRetry: true }, unlockContract: unlock, scoreContract: { scoreBlocks: '1-3 filled axis-aligned rectangles', pointsPerBlock: 10, lateHalfRequired: true, failedOrExitedAttemptPoints: 0, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' }, rows };
fs.writeFileSync(path.join(OUT, 'formal-early-fixes.json'), JSON.stringify(report, null, 2) + '\n'); fs.writeFileSync(path.join(OUT, 'progress.json'), JSON.stringify({ status: report.status, accepted: report.accepted, blocked: report.blocked, productionChanged: false, report: path.join('deliverables/league-regeneration-20261005/round4/early/formal-early-fixes.json').replaceAll('\\', '/') }, null, 2) + '\n'); console.log(JSON.stringify({ status: report.status, accepted: report.accepted, blocked: report.blocked, output: path.join('deliverables/league-regeneration-20261005/round4/early/formal-early-fixes.json') }));

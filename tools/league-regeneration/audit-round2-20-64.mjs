/*
 * Isolated round-two audit for the reselected mainline-template league rows
 * 20..64.  This runner intentionally accepts no production side effects: it
 * only writes a resumable partial report and the final evidence report.
 *
 * A row is formal-ready only when the same object has a finite route in its
 * cadence band, an independently proven lower threshold, and 1..3 filled
 * rectangular score blocks whose complete clear events all happen in the
 * latter half of that route.  Unsupported mechanisms are recorded as blocked
 * instead of being silently simplified.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const candidatePath = 'deliverables/league-regeneration-20261005/round2/mainline-reselected-candidates.json';
const outDir = 'deliverables/league-regeneration-20261005/round2/mid';
const reportPath = `${outDir}/formal-20-64.json`;
const partialPath = `${reportPath}.partial`;
const sourceText = fs.readFileSync(candidatePath, 'utf8');
const source = JSON.parse(sourceText);
const rows = source.rows.filter(row => row.index >= 20 && row.index <= 64);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const targetFor = difficulty => difficulty === 'super' ? { lower: 21, upper: 30 } : { lower: 16, upper: 20 };
const routeBudget = { maxStates: 120000, maxTransitions: 700000, maxMilliseconds: 2000 };
const proofBudget = { maxStates: 220000, maxTransitions: 1200000, maxMilliseconds: 2000 };
const rectangle = shape => {
  if (!Array.isArray(shape) || shape.length < 1) return false;
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  if (cells.size !== shape.length) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return cells.size === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
};
const unsupportedFields = level => [
  ['generators', level.generators], ['flipDoors', level.flipDoors], ['elevators', level.elevators],
  ['conveyors', level.conveyors], ['seams', level.seams],
].filter(([, value]) => Array.isArray(value) && value.length).map(([key]) => key)
  .concat((level.blocks ?? []).some(block => block.timedBombSeconds !== undefined) ? ['timedBombSeconds'] : []);

const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();

function scoreAudit(level, drags, clearEvents) {
  const exitsByBlock = new Map();
  let exitOrder = 0;
  for (const drag of drags ?? []) {
    if (!drag.exitSide) continue;
    exitOrder += 1;
    const list = exitsByBlock.get(drag.blockId) ?? [];
    list.push(exitOrder);
    exitsByBlock.set(drag.blockId, list);
  }
  const latter = Number.isInteger(clearEvents) ? clearEvents / 2 : Infinity;
  const rectangularCandidates = level.blocks.filter(block => rectangle(block.shape)).map(block => {
    const events = exitsByBlock.get(block.id) ?? [];
    const expected = block.layers?.length ?? 1;
    const complete = events.length >= expected;
    const late = complete && events.every(step => step > latter);
    return {
      blockId: block.id,
      shapeCells: block.shape.length,
      filledAxisAlignedRectangle: true,
      expectedClearEvents: expected,
      clearEvents: events,
      completeClearVerified: complete,
      latterHalf: late,
      scorePoints: late ? 10 : 0,
    };
  });
  const candidates = rectangularCandidates.filter(item => item.completeClearVerified && item.latterHalf)
    .sort((a, b) => a.clearEvents[0] - b.clearEvents[0] || a.blockId.localeCompare(b.blockId));
  const selected = candidates.slice(0, 3);
  return {
    status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED',
    rule: '1–3 filled axis-aligned rectangular score blocks; each complete clear is after the latter-half boundary; +10 per block',
    clearEvents,
    latterHalfBoundary: Number.isInteger(clearEvents) ? clearEvents / 2 : null,
    rectangularCandidates,
    candidates,
    selected,
    totalScore: selected.length * 10,
    runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  };
}

function baseRow(entry) {
  const target = targetFor(entry.difficulty);
  return {
    index: entry.index,
    difficulty: entry.difficulty,
    target,
    sourceLevelId: entry.source?.levelId ?? null,
    candidateLevelId: entry.level?.id ?? null,
    candidateFingerprint: entry.proxy ? null : (entry.fingerprint ?? null),
    candidateLevelSha256: sha256(JSON.stringify(entry.level)),
    formalEligibility: false,
    status: 'BLOCKED',
    blockedReasons: [],
    route: null,
    lowerBound: null,
    upperBound: null,
    scoreAudit: scoreAudit(entry.level, [], null),
    finiteBudget: { route: routeBudget, lowerProof: proofBudget, noInfiniteRetry: true },
  };
}

async function audit(entry) {
  const out = baseRow(entry);
  const level = entry.level;
  const unsupported = unsupportedFields(level);
  if (unsupported.length) {
    out.blockedReasons.push(`unsupported-spatial-mechanisms:${unsupported.join(',')}`);
    out.route = { status: 'UNSUPPORTED', valid: false, complete: false, error: `searchSpatial excludes ${unsupported.join(',')}` };
    out.scoreAudit = scoreAudit(level, [], null);
    return out;
  }
  const target = out.target;
  let witness;
  try {
    witness = searchSpatial(level, spatial, { ...routeBudget, floor: target.lower + 1, normalize: true, orderSeed: entry.index * 17 });
  } catch (error) {
    out.blockedReasons.push(`route-error:${String(error?.message ?? error).slice(0, 180)}`);
    return out;
  }
  out.route = {
    status: witness.status,
    valid: false,
    complete: false,
    cost: witness.cost ?? null,
    exploredStates: witness.exploredStates ?? null,
    discoveredStates: witness.discoveredStates ?? null,
    attemptedTransitions: witness.attemptedTransitions ?? null,
    maxClearsSeen: witness.maxClearsSeen ?? null,
    termination: witness.termination ?? null,
    elapsedMilliseconds: witness.elapsedMilliseconds ?? null,
    error: witness.reason ?? null,
  };
  if (witness.status !== 'witness' || !witness.drags) {
    out.blockedReasons.push(`route-${witness.status}${witness.termination ? `:${witness.termination}` : ''}`);
    out.scoreAudit = scoreAudit(level, [], null);
    return out;
  }
  let replay;
  try { replay = runtime.replayRevisedRoute(level, witness.drags); }
  catch (error) {
    out.blockedReasons.push(`runtime-replay-error:${String(error?.message ?? error).slice(0, 180)}`);
    return out;
  }
  out.route = { ...out.route, valid: replay.valid, complete: replay.complete, effectiveDrags: replay.effectiveDrags, nonClearingDrags: replay.nonClearingDrags, clearEvents: replay.clearEvents };
  if (!replay.valid || !replay.complete) out.blockedReasons.push('runtime-replay-invalid-or-incomplete');
  if (!Number.isInteger(replay.nonClearingDrags) || replay.nonClearingDrags < target.lower) out.blockedReasons.push('route-below-lower-target');
  if (Number.isInteger(replay.nonClearingDrags) && replay.nonClearingDrags > target.upper) out.blockedReasons.push('route-above-upper-target');
  out.scoreAudit = scoreAudit(level, witness.drags, replay.clearEvents);
  if (out.scoreAudit.status !== 'PASS') out.blockedReasons.push('no-1-to-3-late-rectangular-score-blocks');
  out.routeWitness = witness.drags;
  // Keep lower-bound evidence even when score timing or the route band is
  // blocked.  A completed route below the requested floor is a concrete
  // counterexample and the proof runner records it as relaxed-shortcut.
  if (replay.valid && replay.complete && Number.isInteger(replay.nonClearingDrags)) {
    let lower;
    try { lower = searchSpatial(level, spatial, { ...proofBudget, floor: target.lower, prove: true, normalize: false, orderSeed: entry.index * 31 }); }
    catch (error) { out.blockedReasons.push(`lower-proof-error:${String(error?.message ?? error).slice(0, 180)}`); return out; }
    out.lowerBound = {
      status: lower.status,
      thresholdProven: lower.thresholdProven === true,
      counterexampleCost: lower.cost ?? null,
      exploredStates: lower.exploredStates ?? null,
      discoveredStates: lower.discoveredStates ?? null,
      attemptedTransitions: lower.attemptedTransitions ?? null,
      termination: lower.termination ?? null,
      elapsedMilliseconds: lower.elapsedMilliseconds ?? null,
    };
    if (lower.thresholdProven !== true) out.blockedReasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`);
  }
  out.upperBound = { value: replay.nonClearingDrags, requestedCeiling: target.upper, inBand: replay.nonClearingDrags <= target.upper };
  out.formalEligibility = out.blockedReasons.length === 0;
  out.status = out.formalEligibility ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED';
  return out;
}

fs.mkdirSync(outDir, { recursive: true });
const audited = [];
for (const entry of rows) {
  const row = await audit(entry);
  audited.push(row);
  fs.writeFileSync(partialPath, JSON.stringify({ status: 'PARTIAL', range: [20, 64], source: candidatePath, sourceSha256: sha256(sourceText), rows: audited }, null, 2) + '\n');
  console.log(JSON.stringify({ index: row.index, status: row.status, reasons: row.blockedReasons, nonClearingDrags: row.route?.nonClearingDrags ?? null, score: row.scoreAudit?.totalScore ?? 0 }));
}
const report = {
  status: audited.every(row => row.formalEligibility) ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES',
  generatedAt: new Date().toISOString(),
  source: candidatePath,
  sourceSha256: sha256(sourceText),
  range: [20, 64],
  accepted: audited.filter(row => row.formalEligibility).length,
  blocked: audited.filter(row => !row.formalEligibility).length,
  finitePolicy: 'Same-object finite route max 2s, lower proof max 2s, no infinite retry; unsupported generators/flip doors/lifts/conveyors/seams remain blocked.',
  scoringPolicy: '1–3 filled rectangles, complete clear events in route latter half, +10 each; evidence isolated and not production scoring.',
  rows: audited,
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: reportPath, accepted: report.accepted, blocked: report.blocked, sourceSha256: report.sourceSha256 }, null, 2));

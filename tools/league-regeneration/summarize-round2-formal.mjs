import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const mechanismThresholds = { iceGate: 6, frozenBlock: 10, shell: 15, shutter: 20, generator: 35, axis: 50, lock: 60, lift: 65, star: 100, grid: 200 };
function mechanismGate(level, index) {
  if (!level) return { status: 'BLOCKED', reasons: ['candidate-level-missing'] };
  const present = {
    iceGate: (level.gates ?? []).some(g => (g.frozen ?? 0) > 0),
    frozenBlock: (level.blocks ?? []).some(b => (b.frozen ?? 0) > 0),
    shell: (level.blocks ?? []).some(b => (b.layers?.length ?? 1) > 1),
    shutter: Boolean(level.shutters?.length),
    generator: Boolean(level.generators?.length),
    axis: (level.blocks ?? []).some(b => b.movementAxis),
    lock: (level.blocks ?? []).some(b => b.keyId || b.lockedBy),
    lift: Boolean(level.elevators?.length),
    star: (level.blocks ?? []).some(b => b.star) || (level.gates ?? []).some(g => g.star),
    grid: Boolean(level.coloredGrids?.length),
  };
  const mechanisms = Object.keys(present).filter(name => present[name]);
  const reasons = mechanisms.filter(name => index < mechanismThresholds[name]).map(name => `mechanism-before-unlock:${name}:${mechanismThresholds[name]}`);
  return { status: reasons.length ? 'BLOCKED' : 'PASS', mechanisms, reasons };
}
const files = [
  ['early', 'deliverables/league-regeneration-20261005/round2/early/formal-1-19.json'],
  ['early-targeted', 'deliverables/league-regeneration-20261005/round2/early-targeted/formal-1-19.json'],
  // Source-198 stripped early variants satisfy the early mechanism unlock
  // gates for indexes 8, 13 and 18 after independent same-object replay.
  ['source198-stripped-early', 'deliverables/league-regeneration-20261005/round2/early/source198-stripped-early-formal.json'],
  ['source158-stripped-index3', 'deliverables/league-regeneration-20261005/round2/early-super-recovery/source158-stripped-index3-formal.json'],
  ['mid', 'deliverables/league-regeneration-20261005/round2/mid/formal-20-64.json'],
  ['mid-targeted', 'deliverables/league-regeneration-20261005/round2/mid-targeted/formal-20-64.json'],
  ['late', 'deliverables/league-regeneration-20261005/round2/late/formal-65-100.json'],
  // The targeted late batch is deliberately listed last: it replaces a
  // blocked row only when a finite, same-object candidate was found.
  ['late-targeted', 'deliverables/league-regeneration-20261005/round2/late-targeted/formal-65-100.json'],
];
const rowByIndex = new Map();
const inputHashes = [];
for (const [range, relative] of files) {
  const absolute = path.join(ROOT, relative);
  const report = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  inputHashes.push({ range, file: relative, generatedAt: report.generatedAt ?? null });
  for (const row of report.rows ?? []) {
    const accepted = row.accepted ?? null;
    const status = row.status === 'FORMAL_CANDIDATE_READY' || accepted ? 'FORMAL_CANDIDATE_READY' : (row.status ?? 'BLOCKED');
    const mechanismCompatibility = status === 'FORMAL_CANDIDATE_READY' ? mechanismGate(accepted?.level ?? row.level, row.index) : null;
    const verifiedStatus = status === 'FORMAL_CANDIDATE_READY' && mechanismCompatibility?.status !== 'PASS' ? 'BLOCKED' : status;
    const normalized = {
      index: row.index,
      range,
      difficulty: row.difficulty,
      target: row.target,
      sourceLevelId: accepted?.sourceLevelId ?? row.sourceLevelId ?? null,
      candidateLevelId: accepted?.level?.id ?? row.candidateLevelId ?? row.levelId ?? null,
      levelSha256: accepted?.levelSha256 ?? row.candidateLevelSha256 ?? null,
      status: verifiedStatus,
      routeDifficultyScoreVerified: status === 'FORMAL_CANDIDATE_READY',
      formalEligibility: verifiedStatus === 'FORMAL_CANDIDATE_READY',
      mechanismCompatibility,
      adaptation: row.adaptation ?? accepted?.adaptation ?? null,
      route: accepted ? { cost: accepted.drags?.filter(d => d.exitSide == null).length ?? null, routeSha256: accepted.routeSha256 ?? null, replay: accepted.replay ?? null } : { status: row.route?.status ?? row.upperBound?.status ?? null, cost: row.route?.cost ?? row.upperBound?.nonClearingDrags ?? null, replay: row.replay ?? null },
      lowerBound: accepted?.lowerBound ?? row.lowerBound ?? null,
      scoreAudit: accepted?.scoreBlocks ?? row.scoreAudit ?? null,
      blockedReasons: [...(row.reasons ?? row.blockedReasons ?? row.failureReasons ?? []), ...(mechanismCompatibility?.reasons ?? [])],
    };
    if (!rowByIndex.has(row.index) || status === 'FORMAL_CANDIDATE_READY') rowByIndex.set(row.index, normalized);
  }
}
const rows = [...rowByIndex.values()];
const scoreReplays = [];
for (const relative of [
  'deliverables/league-regeneration-20261005/round2/score/early-score-replay.json',
  'deliverables/league-regeneration-20261005/round2/score/early-targeted-score-replay.json',
  'deliverables/league-regeneration-20261005/round2/score/source198-stripped-early-8-13-18-score-replay.json',
  'deliverables/league-regeneration-20261005/round2/score/source158-stripped-index3-score-replay.json',
  'deliverables/league-regeneration-20261005/round2/score/mid-targeted-score-replay.json',
  'deliverables/league-regeneration-20261005/round2/score/late-targeted-score-replay.json',
]) {
  if (!fs.existsSync(path.join(ROOT, relative))) continue;
  const replay = JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
  scoreReplays.push({ file: relative, status: replay.status, replayedRows: replay.replayedRows, passed: replay.passed, blocked: replay.blocked ?? [] });
}
rows.sort((a, b) => a.index - b.index);
const duplicateIndexes = [...new Set(rows.map(row => row.index).filter((index, i, all) => all.indexOf(index) !== i))];
const accepted = rows.filter(row => row.formalEligibility);
const blocked = rows.filter(row => !row.formalEligibility);
const missing = Array.from({ length: 100 }, (_, i) => i + 1).filter(index => !rows.some(row => row.index === index));
const reasonCounts = {};
for (const row of blocked) for (const reason of row.blockedReasons) reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
const output = {
  status: accepted.length === 100 && blocked.length === 0 && missing.length === 0 && duplicateIndexes.length === 0 ? 'FORMAL_DATA_READY' : 'FORMAL_DATA_BLOCKED',
  activeRuleVersion: '1.150.0',
  generatedAt: new Date().toISOString(),
  sourceReports: inputHashes,
  counts: { totalRows: rows.length, expectedRows: 100, accepted: accepted.length, blocked: blocked.length, missing: missing.length, duplicateIndexes: duplicateIndexes.length },
  acceptedIndexes: accepted.map(row => row.index),
  blockedIndexes: blocked.map(row => row.index),
  missingIndexes: missing,
  duplicateIndexes,
  blockedReasonCounts: reasonCounts,
  scoreReplays,
  runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  productionChanged: false,
  rows,
};
const outputPath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/formal-round2-status.json');
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outputPath).replaceAll('\\', '/'), status: output.status, counts: output.counts, blockedReasonCounts: reasonCounts }, null, 2));

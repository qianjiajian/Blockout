/* Read-only independent gate for the isolated round3 unique-mid batch. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const inputPath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/formal-unique-mid.json');
const scorePath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/score-replay.json');
const outputPath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/independent-audit.json');
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const thresholds = { iceGate: 6, frozenBlock: 10, shell: 15, shutter: 20, generator: 35, axis: 50, lock: 60, lift: 65, star: 100, grid: 200 };
const presence = level => ({
  iceGate: (level.gates ?? []).some(g => (g.frozen ?? 0) > 0),
  frozenBlock: (level.blocks ?? []).some(b => (b.frozen ?? 0) > 0),
  shell: (level.blocks ?? []).some(b => (b.layers?.length ?? 1) > 1),
  shutter: Boolean(level.shutters?.length), generator: Boolean(level.generators?.length),
  axis: (level.blocks ?? []).some(b => b.movementAxis), lock: (level.blocks ?? []).some(b => b.keyId || b.lockedBy),
  lift: Boolean(level.elevators?.length), star: (level.blocks ?? []).some(b => b.star) || (level.gates ?? []).some(g => g.star),
  grid: Boolean(level.coloredGrids?.length),
});

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const score = JSON.parse(fs.readFileSync(scorePath, 'utf8'));
const rows = input.rows ?? [];
const accepted = rows.filter(row => row.formalEligibility && row.accepted);
const errors = [];
const warnings = [];
if (input.status !== 'FORMAL_CANDIDATES_READY') errors.push(`input-status:${input.status}`);
if (accepted.length !== 20 || input.accepted !== 20) errors.push(`accepted-count:${accepted.length}`);
if (Number(input.finiteBudget?.attempts) > Number(input.finiteBudget?.maxAttempts)) errors.push('finite-budget-exceeded');
if (input.productionChanged !== false) errors.push('production-changed');
const ids = new Set();
const geometry = new Set();
for (const row of accepted) {
  const a = row.accepted;
  const level = a.level;
  if (!level || ids.has(level.id)) errors.push(`missing-or-duplicate-id:${row.index}`); else ids.add(level.id);
  if (!a.mutation?.positionChanged || !Array.isArray(a.mutation?.pair) || a.mutation.pair.length !== 2) errors.push(`no-real-local-position-change:${row.index}`);
  if (geometry.has(a.geometryKey)) errors.push(`duplicate-canonical-geometry:${row.index}`); else geometry.add(a.geometryKey);
  if (!a.lowerBound?.thresholdProven) errors.push(`lower-not-proven:${row.index}`);
  if (a.lowerBound?.sourceLevelSha256 !== sha(level)) errors.push(`lower-hash-mismatch:${row.index}`);
  if (a.routeSha256 !== sha(a.drags)) errors.push(`route-hash-mismatch:${row.index}`);
  if (!a.replay?.valid || !a.replay?.complete) errors.push(`route-replay-invalid:${row.index}`);
  const band = row.difficulty === 'super' ? [21, 30] : [16, 20];
  if (a.replay.nonClearingDrags < band[0] || a.replay.nonClearingDrags > band[1]) errors.push(`route-out-of-band:${row.index}`);
  for (const mechanism of Object.keys(presence(level)).filter(key => presence(level)[key])) if (row.index < thresholds[mechanism]) errors.push(`before-unlock:${row.index}:${mechanism}`);
  if (a.scoreBlocks?.status !== 'PASS' || !(a.scoreBlocks.selected?.length >= 1 && a.scoreBlocks.selected?.length <= 3) || a.scoreBlocks.selected.some(item => item.points !== 10)) errors.push(`score-evidence-invalid:${row.index}`);
}
if (score.status !== 'FORMAL_SCORE_REPLAY_PASS' || score.replayedRows !== 20 || score.passed !== 20 || (score.blocked ?? []).length) errors.push('score-replay-not-20-pass');
const output = { schemaVersion: 1, status: errors.length ? 'ROUND3_UNIQUE_MID_BLOCKED' : 'ROUND3_UNIQUE_MID_PASS', generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', input: path.relative(ROOT, inputPath).replaceAll('\\', '/'), scoreReplay: path.relative(ROOT, scorePath).replaceAll('\\', '/'), counts: { accepted: accepted.length, uniqueGeometry: geometry.size, duplicateGeometry: accepted.length - geometry.size, uniqueIds: ids.size, scorePassed: score.passed ?? 0, finiteAttempts: input.finiteBudget?.attempts ?? null }, errors, warnings, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY', productionChanged: false };
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outputPath).replaceAll('\\', '/'), status: output.status, counts: output.counts, errors: output.errors }, null, 2));

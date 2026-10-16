import fs from 'node:fs';
import { evidenceCheck, normalizedPuzzleKey } from './round3-contract.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
const reportPath = 'deliverables/league-regeneration-20261006/geometry-repair-group-10-14-final/position-variants.json';
const outPath = 'deliverables/league-regeneration-20261006/geometry-repair-group-10-14-final/verification.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const source = JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json', 'utf8'));
const sourceBy = new Map((source.rows ?? []).map(row => [row.index, row.accepted?.level]));
const runtime = await loadContinuationRuntime();
const checks = [];
for (const candidate of report.acceptedCandidates ?? []) {
  const base = sourceBy.get(candidate.index);
  const changed = [];
  for (let i = 0; i < (candidate.level.blocks ?? []).length; i += 1) {
    const a = candidate.level.blocks[i], b = base?.blocks?.[i];
    if (a && b && (a.x !== b.x || a.y !== b.y || JSON.stringify(a.shape) !== JSON.stringify(b.shape))) changed.push(a.id);
  }
  const evidence = await evidenceCheck(candidate, { strictQ0: true,
    replayRoute: async (level, drags) => runtime.replayRevisedRoute(level, drags) });
  checks.push({ index: candidate.index, status: evidence.status, errors: evidence.errors,
    warnings: evidence.warnings, geometryKey: normalizedPuzzleKey(candidate.level),
    changedBlockIds: changed, realThreeBlockVariant: changed.length >= 2, score: evidence.score });
}
const keys = checks.map(row => row.geometryKey);
const duplicateKeys = keys.filter((key, i) => keys.indexOf(key) !== i);
const pass = checks.length === 4 && checks.every(row => row.status === 'PASS' && row.realThreeBlockVariant) && duplicateKeys.length === 0;
const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), source: reportPath,
  checks, counts: { rows: checks.length, pass: checks.filter(row => row.status === 'PASS').length,
    realThreeBlockVariants: checks.filter(row => row.realThreeBlockVariant).length, duplicateKeys: duplicateKeys.length },
  status: pass ? 'GEOMETRY_GROUP_10_14_VERIFY_PASS' : 'GEOMETRY_GROUP_10_14_VERIFY_FINDINGS', productionChanged: false };
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: output.status, counts: output.counts }, null, 2));

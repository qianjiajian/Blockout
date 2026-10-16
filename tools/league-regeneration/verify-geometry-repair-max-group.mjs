import fs from 'node:fs';
import path from 'node:path';
import { evidenceCheck, normalizedPuzzleKey } from './round3-contract.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const reportPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-max-group/max-group-20-31.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const runtime = await loadContinuationRuntime();
const checks = [];
for (const row of report.acceptedCandidates ?? []) {
  const result = await evidenceCheck(row, { strictQ0: true, replayRoute: async (level, drags) => runtime.replayRevisedRoute(level, drags) });
  checks.push({ index: row.index, status: result.status, errors: result.errors, score: result.score, opening: result.opening });
}
const keys = checks.map((check, index) => report.acceptedCandidates[index] ? normalizedPuzzleKey(report.acceptedCandidates[index].level) : null);
const duplicateKeys = keys.filter((key, index) => key && keys.indexOf(key) !== index);
const pass = checks.every(check => check.status === 'PASS') && duplicateKeys.length === 0;
const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), source: 'geometry-repair-max-group/max-group-20-31.json', checks, counts: { rows: checks.length, pass: checks.filter(check => check.status === 'PASS').length, duplicateKeys: duplicateKeys.length }, status: pass ? 'GEOMETRY_REPAIR_MAX_GROUP_PASS' : 'GEOMETRY_REPAIR_MAX_GROUP_FINDINGS', productionChanged: false };
const outPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair-max-group/verification.json');
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outPath).replaceAll('\\', '/'), status: output.status, counts: output.counts }, null, 2));

/* Merge and independently replay all finite duplicate-geometry repair batches. */
import fs from 'node:fs';
import path from 'node:path';
import { evidenceCheck, normalizedPuzzleKey } from './round3-contract.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const reportPaths = [
  'deliverables/league-regeneration-20261006/geometry-repair/duplicate-groups.json',
  'deliverables/league-regeneration-20261006/geometry-repair-max-group/max-group-20-31.json',
  'deliverables/league-regeneration-20261006/geometry-repair-max-group-32-44/max-group-32-44.json',
  'deliverables/league-regeneration-20261006/geometry-repair-max-group-45-57/max-group-45-57.json',
  'deliverables/league-regeneration-20261006/geometry-repair-max-group-59-70/max-group-59-70.json',
  'deliverables/league-regeneration-20261006/geometry-repair-max-group-71-82/max-group-71-82.json',
  'deliverables/league-regeneration-20261006/geometry-repair-max-group-84-100/max-group-84-100.json',
  'deliverables/league-regeneration-20261006/geometry-repair-relaxed/relaxed-pair-fallback.json',
];
const candidates = [];
const sourceReports = [];
for (const relative of reportPaths) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) continue;
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  sourceReports.push(relative);
  for (const candidate of report.acceptedCandidates ?? []) candidates.push({ ...candidate, repairSource: relative });
}
const runtime = await loadContinuationRuntime();
const checks = [];
for (const candidate of candidates) {
  const result = await evidenceCheck(candidate, { strictQ0: true, replayRoute: async (level, drags) => runtime.replayRevisedRoute(level, drags) });
  checks.push({ index: candidate.index, source: candidate.repairSource, status: result.status, errors: result.errors, score: result.score, opening: result.opening, geometryKey: normalizedPuzzleKey(candidate.level) });
}
const indexCounts = new Map();
for (const candidate of candidates) indexCounts.set(candidate.index, (indexCounts.get(candidate.index) ?? 0) + 1);
const duplicateIndexes = [...indexCounts.entries()].filter(([, count]) => count > 1).map(([index]) => index);
const keyCounts = new Map();
for (const check of checks) keyCounts.set(check.geometryKey, (keyCounts.get(check.geometryKey) ?? 0) + 1);
const duplicateGeometryKeys = [...keyCounts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
const finalAuditPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
const finalAuditKeys = fs.existsSync(finalAuditPath)
  ? new Set((JSON.parse(fs.readFileSync(finalAuditPath, 'utf8')).checks ?? []).map(check => check.geometryKey).filter(Boolean))
  : new Set();
const finalAuditGeometryOverlap = checks.filter(check => finalAuditKeys.has(check.geometryKey)).map(check => check.index);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  activeRuleVersion: '1.150.0',
  scope: 'isolated duplicate-geometry repair aggregate; no production integration',
  sourceReports,
  counts: { candidateRows: candidates.length, replayPass: checks.filter(check => check.status === 'PASS').length, replayBlocked: checks.filter(check => check.status !== 'PASS').length, duplicateIndexes: duplicateIndexes.length, duplicateGeometryKeys: duplicateGeometryKeys.length, finalAuditGeometryOverlap: finalAuditGeometryOverlap.length },
  duplicateIndexes,
  duplicateGeometryKeys,
  finalAuditGeometryOverlap,
  checks,
  productionChanged: false,
  status: checks.length === candidates.length && checks.every(check => check.status === 'PASS') && duplicateIndexes.length === 0 && duplicateGeometryKeys.length === 0
    ? 'GEOMETRY_REPAIR_AGGREGATE_PASS'
    : 'GEOMETRY_REPAIR_AGGREGATE_FINDINGS',
};
const outPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/geometry-repair/aggregate.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outPath).replaceAll('\\', '/'), status: output.status, counts: output.counts }, null, 2));

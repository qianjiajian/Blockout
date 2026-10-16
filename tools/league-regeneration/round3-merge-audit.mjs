/*
 * Merge round-3 isolated candidates into a read-only audit catalogue.
 * This file never writes production data or the round-2 aggregate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { evidenceCheck, normalizedPuzzleKey } from './round3-contract.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const round2Path = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/formal-round2-status.json');
const uniquePath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/formal-unique-mid.json');
const outputDir = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/combined');
const outputPath = path.join(outputDir, 'formal-round3-status.json');
const round2 = JSON.parse(fs.readFileSync(round2Path, 'utf8'));
const unique = JSON.parse(fs.readFileSync(uniquePath, 'utf8'));
const runtime = await loadContinuationRuntime();
const replacements = new Map((unique.rows ?? []).filter(row => row.status === 'FORMAL_CANDIDATE_READY' && row.accepted?.level).map(row => [row.index, row]));
// The round-2 summary is normalized and omits candidate payloads. Rebuild the
// same source precedence so this audit can inspect each complete object.
const sourceRows = new Map();
for (const source of round2.sourceReports ?? []) {
  const file = path.join(ROOT, source.file);
  if (!fs.existsSync(file)) continue;
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const row of report.rows ?? []) {
    const ready = row.status === 'FORMAL_CANDIDATE_READY' && row.accepted?.level;
    if (!sourceRows.has(row.index) || ready) sourceRows.set(row.index, row);
  }
}
const rows = Array.from({ length: 100 }, (_, offset) => {
  const index = offset + 1;
  return replacements.get(index) ?? sourceRows.get(index) ?? round2.rows?.find(row => row.index === index) ?? { index, status: 'BLOCKED', reasons: ['missing-source-row'] };
});

const geometry = new Map();
const checks = [];
for (const row of rows) {
  if (!row.formalEligibility && !(row.status === 'FORMAL_CANDIDATE_READY' && row.accepted?.level)) {
    checks.push({ index: row.index, status: 'BLOCKED', errors: row.blockedReasons ?? row.reasons ?? [] });
    continue;
  }
  const result = await evidenceCheck(row, {
    strictQ0: true,
    replayRoute: async (level, drags) => runtime.replayRevisedRoute(level, drags),
  });
  checks.push({ index: row.index, status: result.status, errors: result.errors, warnings: result.warnings, score: result.score, mechanisms: result.mechanisms, opening: result.opening });
  const level = row.accepted?.level ?? row.level;
  if (level) {
    const key = normalizedPuzzleKey(level);
    const list = geometry.get(key) ?? [];
    list.push(row.index);
    geometry.set(key, list);
  }
}
const duplicateGeometryGroups = [...geometry.values()].filter(group => group.length > 1).map(group => group.sort((a, b) => a - b));
const accepted = checks.filter(row => row.status === 'PASS');
const blocked = checks.filter(row => row.status !== 'PASS');
const missing = Array.from({ length: 100 }, (_, i) => i + 1).filter(index => !rows.some(row => row.index === index));
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  activeRuleVersion: '1.150.0',
  scope: 'isolated-round3-catalogue; round2 rows with accepted unique-mid replacements; no production integration',
  source: {
    round2: 'deliverables/league-regeneration-20261005/round2/formal-round2-status.json',
    round3: 'deliverables/league-regeneration-20261005/round3/unique-mid/formal-unique-mid.json',
  },
  replacements: [...replacements.keys()].sort((a, b) => a - b),
  counts: {
    selectedRows: rows.length,
    expectedRows: 100,
    evidencePass: accepted.length,
    evidenceBlocked: blocked.length,
    missing: missing.length,
    duplicateGeometryGroups: duplicateGeometryGroups.length,
  },
  duplicateGeometryGroups,
  checks,
  status: rows.length === 100 && accepted.length === 100 && missing.length === 0 && duplicateGeometryGroups.length === 0
    ? 'ROUND3_INDEPENDENT_AUDIT_PASS'
    : 'ROUND3_INDEPENDENT_AUDIT_FINDINGS',
  productionChanged: false,
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outputPath).replaceAll('\\', '/'), status: output.status, counts: output.counts, replacements: output.replacements, duplicateGeometryGroups }, null, 2));

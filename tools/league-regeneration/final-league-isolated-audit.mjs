/*
 * Read-only merge/audit for the isolated 100-level league catalogue.
 *
 * This deliberately never edits src/core or player data.  It combines the
 * binding-repaired base catalogue with finite q0, early-mechanism and
 * duplicate-geometry repairs, then replays every selected candidate through
 * the strict round-3 contract and records missing/duplicate rows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { evidenceCheck, normalizedPuzzleKey } from './round3-contract.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/final');
const OUT = path.join(OUT_DIR, 'formal-league-100-audit.json');
const basePath = path.join(ROOT, 'deliverables/league-regeneration-20261006/binding-repair/repaired-round2-candidates.json');
const q0Path = path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-repair/q0-repaired-candidates.json');
const oldEarlyPaths = [
  path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/early-targeted/formal-1-19.json'),
  path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/early/source198-stripped-early-formal.json'),
];
const repairDirs = [
  'geometry-repair',
  'geometry-repair-max-group',
  'geometry-repair-max-group-32-44',
  'geometry-repair-max-group-45-57',
  'geometry-repair-max-group-59-70',
  'geometry-repair-max-group-71-82',
  'geometry-repair-max-group-84-100',
  'q0-color-repair',
  'q0-color-repair-geometry',
  'q0-color-repair-targeted',
  'geometry-repair-targeted-pairs',
  'geometry-repair-group-15-19',
  'geometry-repair-group-23-43',
  'geometry-repair-group-43',
  'geometry-repair-group-24-42',
  'geometry-repair-group-large',
  'geometry-repair-group-32-34-double-swap',
  'geometry-repair-super-gate-variants',
  'geometry-repair-super-color-variants',
  'geometry-repair-group-10-14-final',
  'q0-repair-index3-color',
  'early-repair',
];
const thresholds = { iceGate: 6, frozenBlock: 10, shell: 15, shutter: 20, generator: 35, axis: 50, lock: 60, lift: 65, star: 100, grid: 200 };
const difficulty = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const targetFor = index => difficulty(index) === 'super' ? { lower: 21, upper: 30 } : { lower: 16, upper: 20 };

function readJson(file) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null; }
function candidateRows(report) {
  if (!report) return [];
  if (Array.isArray(report.acceptedCandidates)) return report.acceptedCandidates.map(candidate => ({ index: candidate.index, accepted: candidate, status: 'FORMAL_CANDIDATE_READY', formalEligibility: true, difficulty: difficulty(candidate.index), target: targetFor(candidate.index) }));
  if (report.formalEligibility === true && report.level && report.drags && report.lowerBound) {
    const candidate = { sourceLevelId: report.sourceLevelId ?? null, level: report.level, drags: report.drags, levelSha256: report.levelSha256 ?? null, routeSha256: report.routeSha256 ?? null, route: report.route ?? null, replay: report.replay ?? null, lowerBound: report.lowerBound, scoreBlocks: report.scoreBlocks ?? null };
    return [{ index: report.index, accepted: candidate, status: 'FORMAL_CANDIDATE_READY', formalEligibility: true, difficulty: report.difficulty ?? difficulty(report.index), target: report.target ?? targetFor(report.index) }];
  }
  const rows = Array.isArray(report.rows) ? report.rows : Object.values(report.rows ?? {});
  return rows.filter(row => row.accepted?.level).map(row => ({ ...row, difficulty: row.difficulty ?? difficulty(row.index), target: row.target ?? targetFor(row.index), formalEligibility: row.formalEligibility ?? true }));
}

const selected = new Map();
function put(row, source, force = false) {
  if (!row?.accepted?.level || !Number.isInteger(row.index)) return;
  const normalized = { ...row, source, difficulty: row.difficulty ?? difficulty(row.index), target: row.target ?? targetFor(row.index), formalEligibility: true };
  // The round-3 unique-mid rows use real shape/position mutations and are
  // already unique under the strict normalizer. Later same-shape repair
  // batches were generated against an older geometry key and can accidentally
  // collapse them back to the large duplicate group. Keep unique-mid unless a
  // later Q0 repair explicitly fixes that exact row.
  const existing = selected.get(row.index);
  // A few unique-mid rows were later found to fail strict Q0 or to collide
  // with another selected normalized geometry.  Let the finite geometry
  // repair for those exact rows replace the provisional unique-mid payload.
  // All other unique-mid rows remain preferred over older same-shape batches.
  const uniqueMidReplacementRows = new Set([22, 24, 25, 34]);
  if (force && existing?.source?.includes('round3/unique-mid/') && !source.includes('q0-color') && !uniqueMidReplacementRows.has(row.index)) return;
  if (force || !selected.has(row.index)) selected.set(row.index, normalized);
}

const base = readJson(basePath);
for (const row of base?.rows ?? []) put(row, 'binding-repair');
// Existing early payloads are retained as a fallback until a new strict early
// repair report supplies a complete replacement payload.
for (const file of oldEarlyPaths) for (const row of candidateRows(readJson(file))) put(row, path.relative(ROOT, file).replaceAll('\\', '/'));
// The round-3 unique-mid catalogue already contains real shape/position
// mutations with same-object lower-bound hashes. Prefer these before the
// later same-shape duplicate repair batches; they are the strongest isolated
// geometry replacements currently available.
const uniqueMidPath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid/formal-unique-mid.json');
for (const row of candidateRows(readJson(uniqueMidPath))) put(row, path.relative(ROOT, uniqueMidPath).replaceAll('\\', '/'), true);
for (const row of candidateRows(readJson(q0Path))) put(row, 'q0-repair', true);
for (const row of candidateRows(readJson(path.join(ROOT, 'deliverables/league-regeneration-20261006/q0-color-repair/round3-unique-mid-q0.json')))) put(row, 'q0-color-repair', true);
for (const dir of repairDirs) {
  const absolute = path.join(ROOT, 'deliverables/league-regeneration-20261006', dir);
  if (!fs.existsSync(absolute)) continue;
  for (const file of fs.readdirSync(absolute)) {
    if (!file.endsWith('.json') || file.includes('verification') || file.includes('report')) continue;
    for (const row of candidateRows(readJson(path.join(absolute, file)))) put(row, `deliverables/league-regeneration-20261006/${dir}/${file}`, true);
  }
}
// Rebound score evidence is the fallback for index 8.  Fresh 13/18 files can
// supersede it once their independent geometry repair is available; otherwise
// the older per-index files would overwrite the exit-order correction.
for (const row of candidateRows(readJson(path.join(ROOT, 'deliverables/league-regeneration-20261006/early-repair/early-score-rebound.json')))) if (row.index === 8) put(row, 'early-score-rebound', true);

const runtime = await loadContinuationRuntime();
const checks = [];
const geometry = new Map();
for (let index = 1; index <= 100; index += 1) {
  const row = selected.get(index);
  if (!row) {
    checks.push({ index, difficulty: difficulty(index), target: targetFor(index), status: 'BLOCKED', source: null, errors: ['missing-complete-candidate-payload'], warnings: [] });
    continue;
  }
  let result;
  try {
    result = await evidenceCheck(row, {
      strictQ0: true,
      replayRoute: async (level, drags) => runtime.replayRevisedRoute(level, drags),
    });
  } catch (error) {
    result = { status: 'BLOCKED', errors: [`audit-error:${String(error?.message ?? error).slice(0, 300)}`], warnings: [] };
  }
  const level = row.accepted.level;
  const key = normalizedPuzzleKey(level);
  const group = geometry.get(key) ?? [];
  group.push(index); geometry.set(key, group);
  checks.push({ index, difficulty: row.difficulty, target: row.target, source: row.source, status: result.status, errors: result.errors ?? [], warnings: result.warnings ?? [], opening: result.opening ?? null, score: result.score ?? null, mechanisms: result.mechanisms ?? [], geometryKey: key, levelSha256: row.accepted.levelSha256 ?? null, routeSha256: row.accepted.routeSha256 ?? null });
}
const duplicateGeometryGroups = [...geometry.values()].filter(group => group.length > 1).map(group => [...group].sort((a, b) => a - b));
for (const group of duplicateGeometryGroups) for (const row of checks) if (group.includes(row.index)) row.warnings.push(`duplicate-geometry-group:${group.join(',')}`);
const pass = checks.filter(row => row.status === 'PASS');
const missing = checks.filter(row => row.errors.includes('missing-complete-candidate-payload')).map(row => row.index);
const beforeUnlock = checks.filter(row => {
  const names = Array.isArray(row.mechanisms)
    ? row.mechanisms
    : Array.isArray(row.mechanisms?.mechanisms)
      ? row.mechanisms.mechanisms
      : row.mechanisms && typeof row.mechanisms === 'object'
      ? Object.keys(row.mechanisms).filter(name => row.mechanisms[name])
      : [];
  return names.some(name => indexThreshold(name, row.index));
}).map(row => row.index);
function indexThreshold(name, index) { return thresholds[name] != null && index < thresholds[name]; }
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  activeRuleVersion: '1.150.0',
  scope: 'isolated-100-level-league-catalogue; strict read-only merge audit; no production integration',
  contract: { cadence: 'hard,hard,super,hard,hard', hard: [16, 20], super: [21, 30], strictQ0: true, mechanismThresholds: thresholds, scorePoints: 10, scoreBlocks: '1-3 late filled rectangles' },
  counts: { selectedRows: selected.size, expectedRows: 100, evidencePass: pass.length, evidenceBlocked: checks.length - pass.length, missing: missing.length, beforeUnlockRows: beforeUnlock.length, duplicateGeometryGroups: duplicateGeometryGroups.length },
  missing,
  beforeUnlock,
  duplicateGeometryGroups,
  selectedCandidates: [...selected.entries()].map(([index, row]) => ({ index, source: row.source, accepted: row.accepted })),
  checks,
  status: selected.size === 100 && pass.length === 100 && duplicateGeometryGroups.length === 0 ? 'FORMAL_LEAGUE_100_AUDIT_PASS' : 'FORMAL_LEAGUE_100_AUDIT_FINDINGS',
  productionChanged: false,
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUT).replaceAll('\\', '/'), status: output.status, counts: output.counts, missing, duplicateGeometryGroups }, null, 2));

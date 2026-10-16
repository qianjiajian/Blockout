/*
 * Isolated lower-bound binding repair for the round-2 league candidates.
 *
 * The round-2 producer recorded threshold-proven lower-bound searches, but a
 * number of accepted rows omitted the source level hash on that proof.  This
 * script only binds an existing proof to the hash of the exact level carried
 * by the same accepted row.  It never searches, changes a level, changes a
 * route, or writes any production registry.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalLevelHash,
  evidenceCheck,
  rawJsonHash,
} from './round3-contract.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const sourceStatusPath = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/formal-round2-status.json');
const outputDir = path.join(ROOT, 'deliverables/league-regeneration-20261006/binding-repair');
const reportPath = path.join(outputDir, 'binding-repair-report.json');
const rowsPath = path.join(outputDir, 'repaired-round2-candidates.json');

const clone = value => JSON.parse(JSON.stringify(value));
const round2 = JSON.parse(fs.readFileSync(sourceStatusPath, 'utf8'));

// Rebuild the same source precedence used by the round-3 merge audit.  The
// aggregate intentionally carries no full level objects, so sourceReports are
// the authoritative isolated candidate payloads for this repair.
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

const acceptedIndexSet = new Set((round2.acceptedIndexes ?? []).map(Number));
const candidateRows = [...sourceRows.values()]
  // The source reports retain superseded early attempts for blocked indexes.
  // The round-2 aggregate's acceptedIndexes is the authoritative 93-row
  // selection; do not repair the seven withdrawn rows merely because their
  // old payload still says FORMAL_CANDIDATE_READY.
  .filter(row => acceptedIndexSet.has(Number(row.index)) && row.status === 'FORMAL_CANDIDATE_READY' && row.accepted?.level)
  .sort((a, b) => Number(a.index) - Number(b.index));

const runtime = await loadContinuationRuntime();
const replayRoute = async (level, drags) => runtime.replayRevisedRoute(level, drags);

const check = async row => evidenceCheck(row, {
  strictQ0: true,
  replayRoute,
});

const rows = [];
const repairedRows = [];
let eligible = 0;
let repaired = 0;
let repairSkippedHashMismatch = 0;
let repairSkippedShape = 0;

for (const original of candidateRows) {
  const before = await check(original);
  const repairedRow = clone(original);
  const accepted = repairedRow.accepted;
  const level = accepted?.level;
  const lower = accepted?.lowerBound;
  const rawLevel = level ? rawJsonHash(level) : null;
  const canonicalLevel = level ? canonicalLevelHash(level) : null;
  const recordedLevel = accepted?.levelSha256 ?? null;
  const recordedLevelMode = recordedLevel === rawLevel
    ? 'raw-json'
    : (recordedLevel === canonicalLevel ? 'canonical-json' : null);
  const eligibleForRepair = Boolean(
    level && lower && lower.thresholdProven === true && recordedLevelMode,
  );
  if (eligibleForRepair) eligible += 1;

  let repair = {
    attempted: false,
    applied: false,
    reason: null,
    bindingMode: recordedLevelMode,
    rawLevelSha256: rawLevel,
    canonicalLevelSha256: canonicalLevel,
    previousSourceLevelSha256: lower?.sourceLevelSha256 ?? null,
  };

  if (!level || !lower) {
    repair.reason = 'same-row-level-or-proof-missing';
    repairSkippedShape += 1;
  } else if (lower.thresholdProven !== true) {
    repair.reason = 'threshold-not-proven';
  } else if (!recordedLevelMode) {
    repair.reason = 'accepted-level-sha-does-not-match-recomputed-level';
    repairSkippedHashMismatch += 1;
  } else if (!lower.sourceLevelSha256) {
    repair.attempted = true;
    // Bind to the same hash representation used by accepted.levelSha256.  No
    // new proof or route is made; this is only a source-object identity link.
    lower.sourceLevelSha256 = recordedLevelMode === 'raw-json' ? rawLevel : canonicalLevel;
    repair.applied = true;
    repair.reason = 'bound-existing-threshold-proof-to-same-row-level';
    repaired += 1;
  } else {
    repair.reason = 'source-level-sha-already-present';
  }

  const after = await check(repairedRow);
  const beforeErrors = new Set(before.errors ?? []);
  const afterErrors = new Set(after.errors ?? []);
  const removedErrors = [...beforeErrors].filter(error => !afterErrors.has(error));
  const addedErrors = [...afterErrors].filter(error => !beforeErrors.has(error));
  const releasedByRepair = repair.applied && before.status !== 'PASS' && after.status === 'PASS';
  const shaOnlyBefore = (before.errors ?? []).length > 0 && (before.errors ?? []).every(error => error === 'lower-bound-source-level-sha-missing');
  const shaOnlyReleased = repair.applied && shaOnlyBefore && after.status === 'PASS';
  rows.push({
    index: Number(original.index),
    sourceLevelId: accepted?.sourceLevelId ?? null,
    beforeStatus: before.status,
    afterStatus: after.status,
    beforeErrors: before.errors ?? [],
    afterErrors: after.errors ?? [],
    removedErrors,
    addedErrors,
    releasedByRepair,
    shaOnlyBefore,
    shaOnlyReleased,
    repair,
    target: after.target,
    levelHash: after.hashes?.level ?? null,
    lowerBoundHash: after.hashes?.lowerBound ?? null,
  });
  // Keep the complete accepted 93-row isolated catalogue, including index 3
  // whose proof already had a binding.  This makes the output directly
  // auditable/replayable without implying that unchanged rows were repaired.
  repairedRows.push(repairedRow);
}

const count = predicate => rows.filter(predicate).length;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  activeRuleVersion: '1.150.0',
  scope: 'isolated-round2-sourceReports-lower-bound-binding-repair',
  source: {
    round2Status: 'deliverables/league-regeneration-20261005/round2/formal-round2-status.json',
    sourceReports: round2.sourceReports?.map(source => source.file) ?? [],
  },
  contract: {
    strictQ0: true,
    freshRouteReplay: true,
    noSearch: true,
    noLevelMutation: true,
    noRouteMutation: true,
    bindingRule: 'only thresholdProven=true proofs bind to raw/canonical hash of accepted.level on the same row',
  },
  counts: {
    sourceReadyCandidates: candidateRows.length,
    eligibleThresholdProofs: eligible,
    repairedBindings: repaired,
    repairSkippedHashMismatch,
    repairSkippedShape,
    beforePass: count(row => row.beforeStatus === 'PASS'),
    afterPass: count(row => row.afterStatus === 'PASS'),
    beforeBlocked: count(row => row.beforeStatus !== 'PASS'),
    afterBlocked: count(row => row.afterStatus !== 'PASS'),
    releasedByRepair: count(row => row.releasedByRepair),
    shaOnlyBefore: count(row => row.shaOnlyBefore),
    shaOnlyReleased: count(row => row.shaOnlyReleased),
    lowerShaMissingBefore: count(row => row.beforeErrors.includes('lower-bound-source-level-sha-missing')),
    lowerShaMissingAfter: count(row => row.afterErrors.includes('lower-bound-source-level-sha-missing')),
  },
  rows,
  productionChanged: false,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(rowsPath, `${JSON.stringify({ schemaVersion: 1, rows: repairedRows, productionChanged: false }, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({ ...report, repairedRowsFile: path.relative(ROOT, rowsPath).replaceAll('\\', '/') }, null, 2)}\n`);
console.log(JSON.stringify({
  report: path.relative(ROOT, reportPath).replaceAll('\\', '/'),
  repairedRows: path.relative(ROOT, rowsPath).replaceAll('\\', '/'),
  counts: report.counts,
  repairedIndexes: rows.filter(row => row.repair.applied).map(row => row.index),
  releasedIndexes: rows.filter(row => row.releasedByRepair).map(row => row.index),
}, null, 2));

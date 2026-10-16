/* Independent, read-only audit of the isolated round-2 catalogue.
 * This never writes production data. It selects rows using the same report
 * precedence as the summary, then rechecks mechanisms, hashes, bounds and
 * geometry after canonicalising ids/names and globally recolouring colours.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const ROOT = process.cwd();
const round2 = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2');
const fallbackFiles = [
  ['early', 'early/formal-1-19.json'],
  ['early-targeted', 'early-targeted/formal-1-19.json'],
  ['source198-stripped-early', 'early/source198-stripped-early-formal.json'],
  ['source158-stripped-index3', 'early-super-recovery/source158-stripped-index3-formal.json'],
  ['mid', 'mid/formal-20-64.json'],
  ['mid-targeted', 'mid-targeted/formal-20-64.json'],
  ['late', 'late/formal-65-100.json'],
  ['late-targeted', 'late-targeted/formal-65-100.json'],
];
// Prefer the exact report list recorded by the current aggregate. This lets
// the audit follow a later isolated replacement (for example a recovered
// index-3 candidate) without silently auditing an obsolete source file.
const aggregatePath = path.join(round2, 'formal-round2-status.json');
let files = fallbackFiles;
if (fs.existsSync(aggregatePath)) {
  try {
    const aggregate = JSON.parse(fs.readFileSync(aggregatePath, 'utf8'));
    const listed = (aggregate.sourceReports ?? []).map(item => {
      const absolute = path.join(ROOT, item.file);
      return [item.range, path.relative(round2, absolute).replaceAll('\\', '/')];
    }).filter(([, relative]) => fs.existsSync(path.join(round2, relative)));
    if (listed.length) files = listed;
  } catch { /* fallback list remains deterministic */ }
}
const thresholds = { iceGate: 6, frozenBlock: 10, shell: 15, shutter: 20, generator: 35, axis: 50, lock: 60, lift: 65, star: 100, grid: 200 };
const difficulty = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const band = index => difficulty(index) === 'super' ? [21, 30] : [16, 20];
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stable = value => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
    : value;
const canonicalHash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const clone = value => structuredClone(value);

function acceptedFromReport(report) {
  return (report.rows ?? []).map(row => {
    if (!row.accepted) return { ...row, accepted: null };
    return row;
  });
}

const chosen = new Map();
const sourceFiles = [];
for (const [range, relative] of files) {
  const file = path.join(round2, relative);
  if (!fs.existsSync(file)) continue;
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  sourceFiles.push({ range, file: `deliverables/league-regeneration-20261005/round2/${relative}`, generatedAt: report.generatedAt ?? null });
  for (const row of acceptedFromReport(report)) {
    const ready = row.status === 'FORMAL_CANDIDATE_READY' && Boolean(row.accepted?.level);
    if (!chosen.has(row.index) || ready) chosen.set(row.index, { ...row, reportRange: range });
  }
}

function mechanismPresence(level) {
  return {
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
}

/* Canonical geometry retains physical mechanism and relationships but maps all
 * colours to first-seen abstract symbols and all IDs to deterministic local
 * references. Thus a pure palette shift, display name or id change hashes the
 * same while a position/shape/mechanism change does not. */
function geometryKey(level) {
  const colours = new Map();
  const color = value => {
    if (value == null) return value;
    if (!colours.has(value)) colours.set(value, `c${colours.size}`);
    return colours.get(value);
  };
  const blocks = [...(level.blocks ?? [])].map((block, position) => ({ block, position }))
    .sort((a, b) => a.block.x - b.block.x || a.block.y - b.block.y || JSON.stringify(a.block.shape).localeCompare(JSON.stringify(b.block.shape)) || a.position - b.position);
  const blockRefs = new Map(blocks.map((item, index) => [item.block.id, `b${index}`]));
  const gateRows = [...(level.gates ?? [])].map(gate => ({
    side: gate.side, offset: gate.offset, size: gate.size, frozen: gate.frozen ?? null,
    star: Boolean(gate.star), color: color(gate.color), portals: gate.portals?.map(portal => ({ side: portal.side, origin: portal.origin, size: portal.size })) ?? null,
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const blockRows = blocks.map(({ block }) => ({
    x: block.x, y: block.y, shape: block.shape, color: color(block.color), layers: block.layers?.map(color) ?? null,
    frozen: block.frozen ?? null, shutterId: block.shutterId ?? null, movementAxis: block.movementAxis ?? null,
    keyId: block.keyId ?? null, lockedBy: block.lockedBy ?? null, lockCount: block.lockCount ?? null, star: Boolean(block.star),
    timedBombSeconds: block.timedBombSeconds ?? null, rotationBadge: Boolean(block.rotationBadge),
  }));
  const shutters = (level.shutters ?? []).map(shutter => ({ ...shutter, id: undefined, triggerBlockIds: shutter.triggerBlockIds?.map(id => blockRefs.get(id) ?? id).sort() ?? null })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const generators = (level.generators ?? []).map(generator => ({ ...generator, id: undefined, queueBlockIds: generator.queueBlockIds?.map(id => blockRefs.get(id) ?? id) ?? [] })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const elevators = (level.elevators ?? []).map(elevator => ({ ...elevator, id: undefined, blockId: blockRefs.get(elevator.blockId) ?? elevator.blockId })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const conveyors = (level.conveyors ?? []).map(conveyor => ({ ...conveyor, id: undefined, blockId: blockRefs.get(conveyor.blockId) ?? conveyor.blockId })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const colouredGrids = (level.coloredGrids ?? []).map(grid => ({ ...grid, id: undefined, color: color(grid.color) })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return canonicalHash({ width: level.width, height: level.height, playable: level.playable ?? null, blocked: level.blocked ?? null,
    seams: level.seams ?? null, gates: gateRows, blocks: blockRows, flipDoors: level.flipDoors ?? null,
    coloredGrids: colouredGrids, shutters, generators, elevators, conveyors, bombFailurePolicy: level.bombFailurePolicy ?? null });
}

const rows = [];
for (const index of [...chosen.keys()].sort((a, b) => a - b)) {
  const row = chosen.get(index);
  const level = row.accepted?.level;
  const errors = [];
  const warnings = [];
  if (!level) {
    rows.push({ index, reportRange: row.reportRange, status: 'BLOCKED', errors: ['missing-level'] });
    continue;
  }
  const presence = mechanismPresence(level);
  const mechanisms = Object.keys(presence).filter(name => presence[name]);
  const beforeUnlock = mechanisms.filter(name => index < thresholds[name]);
  if (beforeUnlock.length) errors.push(...beforeUnlock.map(name => `mechanism-before-unlock:${name}:${thresholds[name]}`));
  const target = band(index);
  const lower = row.accepted.lowerBound ?? null;
  const replay = row.accepted.replay ?? null;
  const route = row.accepted.route ?? null;
  const levelDigest = sha(level);
  const lowerSourceShaPresent = typeof lower?.sourceLevelSha256 === 'string' && lower.sourceLevelSha256.length > 0;
  const canonicalLevelDigest = canonicalHash(level);
  const lowerSourceMatchesRaw = lowerSourceShaPresent && lower.sourceLevelSha256 === levelDigest;
  const lowerSourceMatchesCanonical = lowerSourceShaPresent && lower.sourceLevelSha256 === canonicalLevelDigest;
  const lowerSourceMatches = lowerSourceMatchesRaw || lowerSourceMatchesCanonical;
  if (!lower) errors.push('lower-bound-missing');
  else {
    if (lower.thresholdProven !== true) errors.push('lower-bound-not-threshold-proven');
    if (!lowerSourceShaPresent) warnings.push('lower-bound-source-level-sha-missing; binding cannot be independently rechecked');
    else if (!lowerSourceMatches) errors.push('lower-bound-source-level-sha-mismatch');
    if (lower.floor != null && Number(lower.floor) !== target[0]) warnings.push(`lower-floor-recorded:${lower.floor};expected:${target[0]}`);
  }
  if (!replay?.valid || !replay?.complete) errors.push('same-object-route-replay-not-complete');
  const routeCost = Number(replay?.nonClearingDrags ?? route?.cost);
  if (!Number.isInteger(routeCost) || routeCost < target[0] || routeCost > target[1]) errors.push(`route-out-of-band:${routeCost};expected:${target[0]}-${target[1]}`);
  if (row.accepted.levelSha256 && row.accepted.levelSha256 !== levelDigest) errors.push('candidate-level-sha-mismatch');
  // Candidate reports hash route JSON without key sorting; use the exact
  // producer convention here so this check tests evidence binding rather
  // than a canonicalisation detail.
  const routeSha = row.accepted.routeSha256 ? sha(row.accepted.drags) : null;
  if (row.accepted.routeSha256 && routeSha !== row.accepted.routeSha256) errors.push('route-sha-mismatch');
  const score = row.accepted.scoreBlocks ?? null;
  if (!score || score.status !== 'PASS') errors.push('score-block-evidence-missing-or-failed');
  const geometry = geometryKey(level);
  rows.push({ index, reportRange: row.reportRange, sourceLevelId: row.accepted.sourceLevelId ?? null, candidateLevelId: level.id ?? null,
    difficulty: row.difficulty, target, status: errors.length ? 'AUDIT_BLOCKED' : 'AUDIT_PASS', errors, warnings,
    mechanisms, beforeUnlock, geometryKey: geometry, levelSha256: levelDigest,
    evidenceBinding: { candidateLevelShaMatches: row.accepted.levelSha256 === levelDigest, routeShaMatches: !row.accepted.routeSha256 || routeSha === row.accepted.routeSha256, lowerSourceShaPresent: lowerSourceShaPresent, lowerSourceLevelMatches: lowerSourceMatches, lowerSourceHashMatchMode: lowerSourceMatchesRaw ? 'raw-json' : (lowerSourceMatchesCanonical ? 'canonical-json' : null), lowerThresholdProven: lower?.thresholdProven === true, replayComplete: Boolean(replay?.valid && replay?.complete), scoreStatus: score?.status ?? null },
    counts: { blocks: level.blocks?.length ?? 0, gates: level.gates?.length ?? 0, shutters: level.shutters?.length ?? 0, generators: level.generators?.length ?? 0, elevators: level.elevators?.length ?? 0 },
  });
}

const byGeometry = new Map();
for (const row of rows) {
  if (!row.geometryKey) continue;
  const list = byGeometry.get(row.geometryKey) ?? [];
  list.push(row.index); byGeometry.set(row.geometryKey, list);
}
const duplicateGeometryGroups = [...byGeometry.values()].filter(indexes => indexes.length > 1).map(indexes => indexes.sort((a, b) => a - b));
for (const group of duplicateGeometryGroups) {
  for (const row of rows.filter(item => group.includes(item.index))) row.warnings.push(`duplicate-geometry-group:${group.join(',')}`);
}
const accepted = rows.filter(row => row.status === 'AUDIT_PASS');
const output = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0',
  scope: 'independent-read-only-audit-of-isolated-round2-final-candidates', sourceFiles,
  contract: { cadence: 'hard,hard,super,hard,hard', hard: [16, 20], super: [21, 30], mechanismThresholds: thresholds, ignores: ['id', 'name', 'global-palette-recolour'] },
  counts: { selectedRows: rows.length, expectedRows: 100, auditPass: accepted.length, auditBlocked: rows.length - accepted.length, beforeUnlockRows: rows.filter(row => row.beforeUnlock?.length).length, lowerBoundBindingUnverifiable: rows.filter(row => row.evidenceBinding?.lowerSourceShaPresent === false).length, duplicateGeometryGroups: duplicateGeometryGroups.length },
  duplicateGeometryGroups,
  rows,
  status: rows.length === 100 && accepted.length === 100 && duplicateGeometryGroups.length === 0 ? 'INDEPENDENT_AUDIT_PASS' : 'INDEPENDENT_AUDIT_FINDINGS',
  productionChanged: false,
};
const outputPath = path.join(round2, 'final-independent-audit.json');
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outputPath).replaceAll('\\', '/'), status: output.status, counts: output.counts, duplicateGeometryGroups }, null, 2));

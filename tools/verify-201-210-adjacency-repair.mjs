/**
 * Isolated acceptance gate for the four v1.124 same-colour adjacency repairs.
 *
 * Default: audit the real FORMAL_ISOLATED_201_210_LEVELS objects against the
 * current fixture, formal record, and fresh repair lower-bound reports. A changed
 * object cannot inherit an old proof: sourceLevelSha256 must match exactly.
 *
 * Provisional candidate example:
 *   node tools/verify-201-210-adjacency-repair.mjs \
 *     --candidate path/to/levels.json --routes path/to/routes.json \
 *     --floor-report path/to/fresh-floor.json --formal-record path/to/record.json
 * The latter two flags are optional while developing a candidate. Without
 * them, stale default evidence will be reported as a failure, never adopted.
 *
 * This checks static geometry, fresh-model route replay, and recorded spatial
 * lower bounds. It does not certify GUI Pointer, natural time, or release.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { auditHiddenCoverage } from './revised-hidden-coverage.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const targetIds = [203, 204, 207, 209];
const baselineInventory = { 203: { blocks: 19, shutters: 1 },
  204: { blocks: 19, shutters: 3 }, 207: { blocks: 19, shutters: 3 },
  209: { blocks: 19, shutters: 1 } };
const bands = { easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30] };
const defaults = {
  routes: 'tests/fixtures/remake201-210-adjacency-repair-20260930.json',
  formalRecord: 'deliverables/continue201-210-20260930/formal-isolated-adjacency-repair.json',
  floorReports: ['deliverables/continue201-210-20260930/fresh-floor-adjacency-repair.json'],
};

function parseArgs(argv) {
  const options = { candidate: undefined, routes: undefined, formalRecord: undefined, floorReports: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    const field = {
      '--candidate': 'candidate', '--routes': 'routes',
      '--floor-report': 'floorReports', '--formal-record': 'formalRecord',
    }[arg];
    if (!field || i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
      throw new Error(`Invalid argument ${arg}. Use --help for usage.`);
    }
    const value = argv[++i];
    if (field === 'floorReports') options.floorReports.push(value);
    else if (options[field] !== undefined) throw new Error(`Duplicate ${arg}.`);
    else options[field] = value;
  }
  options.routes ??= defaults.routes;
  options.formalRecord ??= defaults.formalRecord;
  if (!options.floorReports.length) options.floorReports = defaults.floorReports;
  return options;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const proofSha = value => sha(canonical(value));
const cellKey = (x, y) => `${x},${y}`;
const outerColor = block => block.layers?.[0] ?? block.color;

/** All authored blocks count, including hidden cohorts and queued inventory. */
function adjacentSameColor(level) {
  const occupancy = new Map();
  const issues = [];
  for (const block of level.blocks ?? []) {
    if (!block?.id || !Array.isArray(block.shape) || !block.shape.length
      || !Number.isSafeInteger(block.x) || !Number.isSafeInteger(block.y)) {
      issues.push({ code: 'invalid-block-shape', blockId: block?.id });
      continue;
    }
    for (const offset of block.shape) {
      if (!Array.isArray(offset) || offset.length !== 2 || !offset.every(Number.isSafeInteger)) {
        issues.push({ code: 'invalid-block-cell', blockId: block.id, offset });
        continue;
      }
      const at = cellKey(block.x + offset[0], block.y + offset[1]);
      const owners = occupancy.get(at) ?? [];
      owners.push(block);
      occupancy.set(at, owners);
    }
  }
  const pairs = new Map();
  for (const [at, owners] of occupancy) {
    const [x, y] = at.split(',').map(Number);
    for (const neighbor of [cellKey(x + 1, y), cellKey(x, y + 1)]) {
      for (const a of owners) for (const b of occupancy.get(neighbor) ?? []) {
        if (a.id === b.id || outerColor(a) !== outerColor(b)) continue;
        const [first, second] = [a.id, b.id].sort();
        pairs.set(`${first}|${second}`, { first, second, color: outerColor(a) });
      }
    }
  }
  return { passed: issues.length === 0 && pairs.size === 0,
    checkedBlocks: level.blocks?.length ?? 0,
    hiddenBlocks: (level.blocks ?? []).filter(block => block.shutterId).length,
    queuedBlocks: new Set((level.generators ?? []).flatMap(machine => machine.queueBlockIds ?? [])).size,
    pairs: [...pairs.values()], issues };
}

function unwrapLevels(json) {
  const collection = Array.isArray(json) ? json : json?.levels;
  if (Array.isArray(collection)) return collection;
  if (collection && typeof collection === 'object') {
    return Object.entries(collection).map(([id, value]) => value?.level ?? { id: Number(id), ...value });
  }
  throw new Error('Candidate JSON must be a level array or an object with levels.');
}

function reportRow(report, id) {
  const indexed = report?.records?.[String(id)];
  if (indexed) return indexed;
  if (report?.record?.levelId === id) return report.record;
  if (Array.isArray(report?.records)) {
    const record = report.records.find(item => item.id === id || item.levelId === id);
    if (record) return { levelId: id, result: record.lowerBound ?? record.result };
  }
  if (report?.levelId === id && report.proof) return { levelId: id, result: report.proof };
  // searchSpatial also writes its result as a bare JSON object. The candidate
  // hash below selects which level (if any) this proof can actually certify.
  if (report?.status === 'threshold-proven' && report.sourceLevelSha256) {
    return { levelId: id, result: report };
  }
  return undefined;
}

function routeRow(routes, id) {
  const value = routes?.levels?.[String(id)];
  return value?.route ? value : undefined;
}

async function loadActualApi() {
  const entry = `
    export { FORMAL_ISOLATED_201_210_LEVELS } from './src/core/formal201to210Data.ts';
    export { LEVELS, getLevelStrict } from './src/core/levels.ts';
    export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
  `;
  const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
}

function checkProduction(api) {
  const ids = api.LEVELS.map(level => level.id);
  let rejects201 = false;
  try { api.getLevelStrict(201); } catch (error) { rejects201 = error instanceof RangeError; }
  return { passed: ids.length === 200 && ids.every((id, index) => id === index + 1) && rejects201,
    count: ids.length, firstId: ids[0], lastId: ids.at(-1), rejects201 };
}

function verifyLevel(level, source, routes, formal, reports, api) {
  const failures = [];
  const id = level.id;
  const current = source.find(item => item.id === id);
  const band = bands[level.difficulty];
  const levelSha256 = sha(level);
  const proofLevelSha256 = proofSha(level);
  const sourceMatchesCurrent = current ? sha(current) === levelSha256 : false;
  const adjacency = adjacentSameColor(level);
  if (!adjacency.passed) failures.push('same-colour-adjacency-or-invalid-block');
  const inventory = baselineInventory[id];
  if (level.blocks?.length !== inventory.blocks || level.shutters?.length !== inventory.shutters) {
    failures.push('baseline-inventory-changed');
  }
  const hidden = auditHiddenCoverage(level);
  if (!hidden.passed) failures.push('hidden-coverage');
  const route = routeRow(routes, id);
  let replay;
  if (!route) failures.push('missing-route');
  else {
    if (route.levelId !== undefined && route.levelId !== id) failures.push('route-level-id-mismatch');
    if (route.sourceLevelSha256 && route.sourceLevelSha256 !== proofLevelSha256) {
      failures.push('route-level-hash-mismatch');
    }
    replay = api.replayRevisedRoute(level, route.route);
    if (!replay.valid || !replay.complete) failures.push('route-replay-incomplete');
    if (replay.valid && replay.complete && replay.nonClearingDrags !== route.upperBound) failures.push('route-upper-bound-mismatch');
    if (replay.valid && replay.complete && replay.effectiveDrags !== route.totalDrags) failures.push('route-total-drags-mismatch');
    if (!band || !Number.isSafeInteger(route.upperBound) || route.upperBound > band[1]) failures.push('route-outside-difficulty-band');
  }
  const formalRow = formal?.levels?.find(item => item.id === id);
  if (!formalRow || formalRow.levelSha256 !== levelSha256) failures.push('formal-record-level-hash-mismatch');
  if (route && formalRow && JSON.stringify(route.starTargets) !== JSON.stringify(formalRow.starTargets)) {
    failures.push('route-formal-star-target-mismatch');
  }
  if (route && replay?.valid && replay?.complete && replay.effectiveDrags > route.starTargets?.moveTarget) {
    failures.push('route-exceeds-three-star-move-target');
  }
  if (!band) failures.push('unknown-difficulty');
  if (route && formalRow && (route.lowerBound !== formalRow.lowerBound
    || route.upperBound !== formalRow.upperBound)) failures.push('route-formal-bound-mismatch');
  const matches = reports.map(report => ({ path: report.path, row: reportRow(report.data, id) }))
    .filter(entry => entry.row);
  const validProofs = matches.filter(({ row }) => row.levelId === id
    && row.result?.status === 'threshold-proven'
    && row.result?.thresholdProven === true
    && row.result?.sourceLevelSha256 === proofLevelSha256
    && Number.isSafeInteger(row.result?.floor));
  const provenFloor = validProofs.length ? Math.max(...validProofs.map(({ row }) => row.result.floor)) : null;
  const claimedLowerBound = route?.lowerBound ?? formalRow?.lowerBound ?? level.designTargets?.minimumRepositionOverhead;
  const bandFloorProven = band !== undefined && provenFloor !== null && provenFloor >= band[0];
  const claimedFloorProven = Number.isSafeInteger(claimedLowerBound)
    && provenFloor !== null && provenFloor >= claimedLowerBound;
  if (!validProofs.length) failures.push('missing-current-object-threshold-proof');
  if (!bandFloorProven) failures.push('difficulty-band-floor-unproven');
  if (!claimedFloorProven) failures.push('claimed-lower-bound-unproven');
  if (route && replay?.valid && replay?.complete && Number.isSafeInteger(claimedLowerBound)
    && claimedLowerBound > replay.nonClearingDrags) failures.push('lower-bound-exceeds-witness');
  return {
    id, passed: failures.length === 0, failures, levelSha256, proofLevelSha256,
    sourceMatchesCurrent, difficulty: level.difficulty, difficultyBand: band ?? null,
    adjacency, inventory: { blocks: level.blocks?.length ?? 0, shutters: level.shutters?.length ?? 0,
      baseline: inventory }, hidden: { passed: hidden.passed, regionCount: hidden.regionCount,
      coveredCells: hidden.coveredCells, totalCells: hidden.totalCells, issues: hidden.issues },
    route: { found: !!route, replay: replay ? { valid: replay.valid, complete: replay.complete,
      effectiveDrags: replay.effectiveDrags, nonClearingDrags: replay.nonClearingDrags,
      clearEvents: replay.clearEvents, error: replay.error ?? null } : null, claimedLowerBound,
      upperBound: route?.upperBound ?? null, totalDrags: route?.totalDrags ?? null },
    lowerBound: { provenFloor, bandFloorProven, claimedFloorProven,
      matchingReports: validProofs.map(({ path }) => path),
      staleOrInvalidReports: matches.filter(entry => !validProofs.includes(entry)).map(entry => ({
        path: entry.path, recordedFloor: entry.row.result?.floor ?? null,
        recordedHash: entry.row.result?.sourceLevelSha256 ?? null,
      })) },
    formalRecordHashMatches: formalRow?.levelSha256 === levelSha256,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`Usage: node tools/verify-201-210-adjacency-repair.mjs [--candidate levels.json --routes routes.json --floor-report floor.json --formal-record record.json]\n`);
    return;
  }
  const api = await loadActualApi();
  const current = api.FORMAL_ISOLATED_201_210_LEVELS;
  const candidate = args.candidate ? unwrapLevels(await readJson(args.candidate)) : current;
  const routes = await readJson(args.routes);
  const formal = await readJson(args.formalRecord);
  const reports = await Promise.all(args.floorReports.map(async path => ({ path, data: await readJson(path) })));
  const production = checkProduction(api);
  const rows = targetIds.map(id => {
    const level = candidate.find(item => item.id === id);
    return level ? verifyLevel(level, current, routes, formal, reports, api)
      : { id, passed: false, failures: ['missing-candidate-level'] };
  });
  const passed = production.passed && rows.every(row => row.passed);
  process.stdout.write(`${JSON.stringify({ status: passed ? 'PASS_ISOLATED_MODEL_GATES' : 'FAIL_ISOLATED_MODEL_GATES',
    passed, candidateMode: !!args.candidate, candidateMatchesCurrentSource: rows.every(row => row.sourceMatchesCurrent),
    production, targetIds, levels: rows, pointerValidated: false,
    naturalClockValidated: false, starsValidated: false, releaseApproved: false }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 2;
});

/*
 * Finite, isolated geometry-diversity batch for the round-2 catalogue.
 *
 * This runner intentionally does not touch the production league registry,
 * selector, mainline LEVELS or player saves.  It only writes an evidence file
 * below deliverables/league-regeneration-20261005/round3/unique-mid.
 *
 * Every attempt performs a real local position swap between two same-shape,
 * different-colour blocks.  A palette recolour alone (and a zero-swap
 * variant) is never accepted.  We keep a canonical geometry key that ignores
 * IDs, names and a global palette shift, so accepted rows are unique against
 * each other and against the current round-2 independent audit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/unique-mid');
const OUTPUT = path.join(OUTPUT_DIR, 'formal-unique-mid.json');
const PARTIAL = `${OUTPUT}.partial`;
const MAX_ATTEMPTS = 100;
const MAX_ACCEPTED = 20;
// Walk a larger unlocked middle/late index pool and collect the first 20
// passing rows.  This lets the fixed 100-attempt budget be spent on genuinely
// distinct local variants rather than stopping after one failed source row.
const TARGET_INDEXES = Array.from({ length: 100 }, (_, i) => 20 + i);
const PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const clone = value => structuredClone(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stable = value => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
    : value;
const canonicalHash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const difficulty = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const targetBand = index => difficulty(index) === 'super' ? [21, 30] : [16, 20];
const cellKey = point => point.join(',');
const filledRectangle = shape => {
  if (!Array.isArray(shape) || shape.length === 0) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return shape.length === area && new Set(shape.map(cellKey)).size === shape.length;
};

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

const unlockThresholds = { iceGate: 6, frozenBlock: 10, shell: 15, shutter: 20, generator: 35, axis: 50, lock: 60, lift: 65, star: 100, grid: 200 };

/* Same canonical geometry convention used by final-independent-audit.mjs. */
function geometryKey(level) {
  const colours = new Map();
  const colour = value => {
    if (value == null) return value;
    if (!colours.has(value)) colours.set(value, `c${colours.size}`);
    return colours.get(value);
  };
  const blocks = [...(level.blocks ?? [])].map((block, position) => ({ block, position }))
    .sort((a, b) => a.block.x - b.block.x || a.block.y - b.block.y || JSON.stringify(a.block.shape).localeCompare(JSON.stringify(b.block.shape)) || a.position - b.position);
  const blockRefs = new Map(blocks.map((item, index) => [item.block.id, `b${index}`]));
  const gateRows = [...(level.gates ?? [])].map(gate => ({
    side: gate.side, offset: gate.offset, size: gate.size, frozen: gate.frozen ?? null,
    star: Boolean(gate.star), color: colour(gate.color), portals: gate.portals?.map(portal => ({ side: portal.side, origin: portal.origin, size: portal.size })) ?? null,
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const blockRows = blocks.map(({ block }) => ({
    x: block.x, y: block.y, shape: block.shape, color: colour(block.color), layers: block.layers?.map(colour) ?? null,
    frozen: block.frozen ?? null, shutterId: block.shutterId ?? null, movementAxis: block.movementAxis ?? null,
    keyId: block.keyId ?? null, lockedBy: block.lockedBy ?? null, lockCount: block.lockCount ?? null, star: Boolean(block.star),
    timedBombSeconds: block.timedBombSeconds ?? null, rotationBadge: Boolean(block.rotationBadge),
  }));
  const shutters = (level.shutters ?? []).map(shutter => ({ ...shutter, id: undefined, triggerBlockIds: shutter.triggerBlockIds?.map(id => blockRefs.get(id) ?? id).sort() ?? null })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const generators = (level.generators ?? []).map(generator => ({ ...generator, id: undefined, queueBlockIds: generator.queueBlockIds?.map(id => blockRefs.get(id) ?? id) ?? [] })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const elevators = (level.elevators ?? []).map(elevator => ({ ...elevator, id: undefined, blockId: blockRefs.get(elevator.blockId) ?? elevator.blockId })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const conveyors = (level.conveyors ?? []).map(conveyor => ({ ...conveyor, id: undefined, blockId: blockRefs.get(conveyor.blockId) ?? conveyor.blockId })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const colouredGrids = (level.coloredGrids ?? []).map(grid => ({ ...grid, id: undefined, color: colour(grid.color) })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return canonicalHash({ width: level.width, height: level.height, playable: level.playable ?? null, blocked: level.blocked ?? null,
    seams: level.seams ?? null, gates: gateRows, blocks: blockRows, flipDoors: level.flipDoors ?? null,
    coloredGrids: colouredGrids, shutters, generators, elevators, conveyors, bombFailurePolicy: level.bombFailurePolicy ?? null });
}

function applyPaletteShift(level, shift) {
  const map = new Map(PALETTE.map((colour, index) => [colour, PALETTE[(index + shift) % PALETTE.length]]));
  for (const block of level.blocks ?? []) {
    if (block.color) block.color = map.get(block.color) ?? block.color;
    if (block.layers) block.layers = block.layers.map(colour => map.get(colour) ?? colour);
  }
  for (const gate of level.gates ?? []) if (gate.color) gate.color = map.get(gate.color) ?? gate.color;
  for (const door of level.flipDoors ?? []) if (door.color) door.color = map.get(door.color) ?? door.color;
  return Object.fromEntries(map);
}

/* Make a real local mutation: swap positions of two equal-shape, different
 * colour, plain blocks while leaving the colour attached to each block. */
function forcedLocalSwap(base, pair, paletteShift) {
  const level = clone(base);
  const [a, b] = pair;
  const first = level.blocks[a], second = level.blocks[b];
  if (!first || !second) return null;
  if (first.shutterId || second.shutterId || first.layers || second.layers || first.frozen || second.frozen || first.movementAxis || second.movementAxis || first.keyId || second.keyId || first.lockedBy || second.lockedBy || first.star || second.star) return null;
  if (JSON.stringify(first.shape) !== JSON.stringify(second.shape) || first.color === second.color) return null;
  [first.x, second.x] = [second.x, first.x];
  [first.y, second.y] = [second.y, first.y];
  const paletteMap = applyPaletteShift(level, paletteShift);
  return { level, mutation: { kind: 'forced-local-position-swap-plus-palette', pair: [first.id, second.id], paletteShift, paletteMap, positionChanged: true } };
}

function scoreEvidence(level, drags) {
  const exits = drags.filter(drag => drag.exitSide);
  const firstExit = new Map();
  exits.forEach((drag, index) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, index + 1); });
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = (level.blocks ?? [])
    .filter(block => !block.shutterId && filledRectangle(block.shape) && (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  return { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
}

const sourceBundle = await build({ stdin: { resolveDir: ROOT, contents: "export { LEVELS } from './src/core/levels.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';" }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { LEVELS, validateLevel } = await import(`data:text/javascript;base64,${Buffer.from(sourceBundle.outputFiles[0].text).toString('base64')}`);
const spatialApi = await loadSpatialApi();
const runtime = await loadContinuationRuntime();

const priorAudit = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/final-independent-audit.json');
const priorGeometry = new Set();
if (fs.existsSync(priorAudit)) for (const row of JSON.parse(fs.readFileSync(priorAudit, 'utf8')).rows ?? []) if (row.geometryKey) priorGeometry.add(row.geometryKey);
const rows = [];
const attemptedFingerprints = new Set();
let attemptCount = 0;

for (let slot = 0; slot < TARGET_INDEXES.length && rows.filter(row => row.formalEligibility).length < MAX_ACCEPTED && attemptCount < MAX_ATTEMPTS; slot += 1) {
  const index = TARGET_INDEXES[slot];
  const target = targetBand(index);
  const sourceId = difficulty(index) === 'super' ? 158 : 9;
  const source = LEVELS[sourceId - 1];
  const attempts = [];
  let accepted = null;
  const pairs = [];
  for (let a = 0; a < source.blocks.length; a += 1) for (let b = a + 1; b < source.blocks.length; b += 1) pairs.push([a, b]);
  for (let variant = 0; variant < pairs.length && attempts.length < 5 && attemptCount < MAX_ATTEMPTS; variant += 1) {
    const pair = pairs[(variant * 7 + slot * 3) % pairs.length];
    const built = forcedLocalSwap(source, pair, 1 + ((slot + variant) % (PALETTE.length - 1)));
    if (!built) continue;
    const level = built.level;
    level.id = 997000 + index * 10 + variant;
    level.name = `荣耀联赛Round3·${index}·局部换位${variant}`;
    level.difficulty = difficulty(index);
    level.timeSeconds = 180;
    level.reward = 0;
    level.mechanismRules = 'revised-2026-09-27-v1.5';
    const fingerprint = digest(level);
    const geometry = geometryKey(level);
    const attempt = { attempt: attempts.length + 1, index, sourceLevelId: sourceId, candidateLevelId: level.id, target, fingerprint, geometryKey: geometry, mutation: built.mutation, status: 'BLOCKED', reasons: [] };
    attemptCount += 1;
    if (attemptedFingerprints.has(fingerprint)) { attempt.reasons.push('duplicate-fingerprint'); attempts.push(attempt); continue; }
    attemptedFingerprints.add(fingerprint);
    if (priorGeometry.has(geometry) || rows.some(row => row.accepted?.geometryKey === geometry)) { attempt.reasons.push('duplicate-canonical-geometry'); attempts.push(attempt); continue; }
    try {
      validateLevel(level);
      const budget = { maxStates: 180000, maxTransitions: 800000, maxMilliseconds: 1800 };
      const route = searchSpatial(level, spatialApi, { ...budget, floor: target[1] + 1, normalize: true, orderSeed: index + variant });
      attempt.route = { status: route.status, cost: route.cost ?? null, termination: route.termination ?? null, exploredStates: route.exploredStates ?? null, attemptedTransitions: route.attemptedTransitions ?? null, elapsedMilliseconds: route.elapsedMilliseconds ?? null };
      if (route.status !== 'witness' || !route.drags) { attempt.reasons.push(`route-${route.status}${route.termination ? `:${route.termination}` : ''}`); attempts.push(attempt); continue; }
      const replay = runtime.replayRevisedRoute(level, route.drags);
      attempt.replay = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags };
      if (!replay.valid || !replay.complete) attempt.reasons.push('runtime-replay-invalid-or-incomplete');
      if (replay.nonClearingDrags < target[0]) attempt.reasons.push('route-below-lower-target');
      if (replay.nonClearingDrags > target[1]) attempt.reasons.push('route-above-upper-target');
      if (attempt.reasons.length) { attempts.push(attempt); continue; }
      const lower = searchSpatial(level, spatialApi, { maxStates: 220000, maxTransitions: 1000000, maxMilliseconds: 2200, floor: target[0], prove: true, normalize: false, orderSeed: index + variant });
      attempt.lowerBound = { status: lower.status, thresholdProven: lower.thresholdProven === true, termination: lower.termination ?? null, floor: target[0], exploredStates: lower.exploredStates ?? null, attemptedTransitions: lower.attemptedTransitions ?? null, elapsedMilliseconds: lower.elapsedMilliseconds ?? null, sourceLevelSha256: digest(level) };
      if (lower.thresholdProven !== true) { attempt.reasons.push(`lower-${lower.status}${lower.termination ? `:${lower.termination}` : ''}`); attempts.push(attempt); continue; }
      attempt.scoreBlocks = scoreEvidence(level, route.drags);
      if (attempt.scoreBlocks.status !== 'PASS') { attempt.reasons.push('no-late-rectangular-score-block'); attempts.push(attempt); continue; }
      attempt.status = 'FORMAL_CANDIDATE_READY';
      attempt.routeSha256 = digest(route.drags);
      attempt.level = level;
      attempt.drags = route.drags;
      accepted = attempt;
      attempts.push(attempt);
      break;
    } catch (error) { attempt.reasons.push(`error:${String(error?.message ?? error)}`); attempts.push(attempt); }
  }
  rows.push({ slot: slot + 1, index, difficulty: difficulty(index), target, sourceLevelCandidates: [sourceId], status: accepted ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', accepted: accepted ? { sourceLevelId: accepted.sourceLevelId, candidateLevelId: accepted.candidateLevelId, fingerprint: accepted.fingerprint, geometryKey: accepted.geometryKey, levelSha256: digest(accepted.level), routeSha256: accepted.routeSha256, level: accepted.level, drags: accepted.drags, lowerBound: accepted.lowerBound, route: accepted.route, replay: accepted.replay, scoreBlocks: accepted.scoreBlocks, mutation: accepted.mutation } : null, attempts, formalEligibility: Boolean(accepted) });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(PARTIAL, `${JSON.stringify({ status: 'PARTIAL', maxAttempts: MAX_ATTEMPTS, attemptCount, rows }, null, 2)}\n`);
}

const acceptedRows = rows.filter(row => row.formalEligibility);
const geometryKeys = acceptedRows.map(row => row.accepted.geometryKey);
const uniqueGeometry = new Set(geometryKeys);
const report = { schemaVersion: 1, status: acceptedRows.length === MAX_ACCEPTED && attemptCount <= MAX_ATTEMPTS ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES', generatedAt: new Date().toISOString(), activeRuleVersion: '1.150.0', scope: 'isolated-round3-unique-mid', accepted: acceptedRows.length, blocked: rows.filter(row => !row.formalEligibility).map(row => row.index), finiteBudget: { maxAttempts: MAX_ATTEMPTS, attempts: attemptCount, maxVariantsPerSlot: 5, noInfiniteRetry: true }, contract: { cadence: 'hard,hard,super,hard,hard', hard: [16, 20], super: [21, 30], scoreBlocks: '1-3 filled axis-aligned rectangles in late half', pointsPerBlock: 10, lowerProofHashBound: true, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' }, counts: { slots: rows.length, accepted: acceptedRows.length, blocked: rows.length - acceptedRows.length, uniqueGeometry: uniqueGeometry.size, duplicateGeometry: geometryKeys.length - uniqueGeometry.size }, rows, productionChanged: false };
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.rmSync(PARTIAL, { force: true });
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT).replaceAll('\\', '/'), status: report.status, attemptCount, accepted: acceptedRows.length, uniqueGeometry: uniqueGeometry.size, blocked: rows.filter(row => !row.formalEligibility).map(row => row.index) }, null, 2));

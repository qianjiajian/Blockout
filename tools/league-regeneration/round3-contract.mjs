/*
 * Round-3 isolated evidence contract.
 *
 * This module is deliberately independent of the round summary and production
 * registries.  It checks the object carried by a candidate report rather than
 * trusting a `FORMAL_CANDIDATE_READY` status.  Hash helpers are exported for
 * report generators; evidenceCheck is async only because it can lazily load
 * the current PuzzleModel validator when a caller does not provide one.
 */
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

export const MECHANISM_UNLOCKS = Object.freeze({
  iceGate: 6,
  frozenBlock: 10,
  shell: 15,
  shutter: 20,
  generator: 35,
  axis: 50,
  lock: 60,
  lift: 65,
  star: 100,
  grid: 200,
});

const HARD_BAND = Object.freeze([16, 20]);
const SUPER_BAND = Object.freeze([21, 30]);
/** SHA over the producer's ordinary JSON representation (array order intact). */
export const rawJsonHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Stable recursive object-key hash used by revised-preview proof tools. */
export const canonicalJson = value => Array.isArray(value)
  ? value.map(canonicalJson)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalJson(value[key])]))
    : value;

export const canonicalLevelHash = level => createHash('sha256')
  .update(JSON.stringify(canonicalJson(level)))
  .digest('hex');

const pointKey = ([x, y]) => `${x},${y}`;
const sortedJson = values => [...values].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const rectShape = shape => {
  if (!Array.isArray(shape) || shape.length === 0) return false;
  const cells = new Set(shape.map(pointKey));
  if (cells.size !== shape.length) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return cells.size === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
};

const rectangularPlayable = (width, height) => Array.from({ length: height }, (_, y) =>
  Array.from({ length: width }, (_, x) => [x, y])).flat();

function colorNormalizer() {
  const map = new Map();
  return value => {
    if (value == null) return null;
    if (!map.has(value)) map.set(value, `c${map.size}`);
    return map.get(value);
  };
}

/**
 * Return a geometry/relationship key.  IDs and display names are removed,
 * colors are mapped to equality classes (so a global palette permutation does
 * not change the key), and references such as keyId/lockedBy, shutterId and
 * generator queue ids are mapped to deterministic local references.
 */
export function normalizedPuzzleKey(level) {
  if (!level || typeof level !== 'object') throw new TypeError('level is required');
  const color = colorNormalizer();
  const blockSource = (level.blocks ?? []).map((block, original) => ({ block, original }));
  const blockSort = item => ({
    x: item.block.x, y: item.block.y, shape: item.block.shape, frozen: item.block.frozen ?? null,
    layersLength: item.block.layers?.length ?? 1, shutterPresent: item.block.shutterId != null,
    movementAxis: item.block.movementAxis ?? null, keyPresent: item.block.keyId != null,
    lockedPresent: item.block.lockedBy != null, lockCount: item.block.lockCount ?? null,
    star: Boolean(item.block.star), timedBombSeconds: item.block.timedBombSeconds ?? null,
    rotationBadge: Boolean(item.block.rotationBadge), original: item.original,
  });
  const blocks = blockSource.sort((a, b) => JSON.stringify(blockSort(a)).localeCompare(JSON.stringify(blockSort(b))));
  const blockRefs = new Map(blocks.map((item, index) => [item.block.id, `b${index}`]));

  const relationMap = prefix => {
    const map = new Map();
    return value => {
      if (value == null) return null;
      if (!map.has(value)) map.set(value, `${prefix}${map.size}`);
      return map.get(value);
    };
  };
  const keyRef = relationMap('k');
  const shutterSource = (level.shutters ?? []).map((item, original) => ({ item, original }))
    .sort((a, b) => JSON.stringify({ ...a.item, id: undefined, triggerBlockIds: undefined, original: a.original })
      .localeCompare(JSON.stringify({ ...b.item, id: undefined, triggerBlockIds: undefined, original: b.original })));
  const shutterRef = new Map(shutterSource.map(({ item }, index) => [item.id, `s${index}`]));
  const generatorSource = (level.generators ?? []).map((item, original) => ({ item, original }))
    .sort((a, b) => JSON.stringify({ ...a.item, id: undefined, queueBlockIds: undefined, original: a.original })
      .localeCompare(JSON.stringify({ ...b.item, id: undefined, queueBlockIds: undefined, original: b.original })));
  const generatorRef = new Map(generatorSource.map(({ item }, index) => [item.id, `g${index}`]));
  const gateSource = (level.gates ?? []).map((item, original) => ({ item, original }))
    .sort((a, b) => JSON.stringify({ ...a.item, id: undefined, color: undefined, original: a.original })
      .localeCompare(JSON.stringify({ ...b.item, id: undefined, color: undefined, original: b.original })));

  const gates = gateSource.map(({ item }) => ({
    side: item.side, offset: item.offset, size: item.size, frozen: item.frozen ?? null, star: Boolean(item.star),
    color: color(item.color), portals: item.portals?.map(portal => ({ side: portal.side, origin: portal.origin, size: portal.size })) ?? null,
  }));
  const blocksOut = blocks.map(({ block }) => ({
    x: block.x, y: block.y, shape: block.shape, color: color(block.color), layers: block.layers?.map(color) ?? null,
    frozen: block.frozen ?? null, shutterRef: shutterRef.get(block.shutterId) ?? null,
    movementAxis: block.movementAxis ?? null, keyRef: keyRef(block.keyId), lockedRef: keyRef(block.lockedBy),
    lockCount: block.lockCount ?? null, star: Boolean(block.star), timedBombSeconds: block.timedBombSeconds ?? null,
    rotationBadge: Boolean(block.rotationBadge),
  }));
  const shutters = shutterSource.map(({ item }) => ({
    x: item.x, y: item.y, width: item.width, height: item.height, count: item.count, skin: item.skin ?? null,
    triggerBlockRefs: item.triggerBlockIds?.map(id => blockRefs.get(id) ?? null).sort() ?? null,
  }));
  const generators = generatorSource.map(({ item }) => ({
    side: item.side, offset: item.offset, rimSpan: item.rimSpan ?? null, rimMount: item.rimMount ?? null,
    rimAnchor: item.rimAnchor ?? null, spawn: item.spawn, trigger: item.trigger ?? null,
    intervalSeconds: item.intervalSeconds ?? null, initialDelaySeconds: item.initialDelaySeconds ?? null,
    queueBlockRefs: item.queueBlockIds?.map(id => blockRefs.get(id) ?? null) ?? [],
  }));
  const mapRefs = (items, fields) => sortedJson((items ?? []).map(item => {
    const out = { ...item };
    delete out.id;
    for (const [field, map] of fields) if (field in out) out[field] = map.get(out[field]) ?? null;
    return out;
  }));
  const elevators = mapRefs(level.elevators, [['blockId', blockRefs]]);
  const conveyors = mapRefs(level.conveyors, [['blockId', blockRefs]]);
  const flipDoors = sortedJson((level.flipDoors ?? []).map(item => ({
    side: item.side, offset: item.offset, size: item.size, color: color(item.color), frozen: item.frozen ?? null,
    star: Boolean(item.star), initiallyOpen: Boolean(item.initiallyOpen), portals: item.portals ?? null,
  })));
  const coloredGrids = sortedJson((level.coloredGrids ?? []).map(item => ({ color: color(item.color), cells: item.cells })));
  return canonicalLevelHash({
    mechanismRules: level.mechanismRules ?? null, width: level.width, height: level.height,
    playable: level.playable ?? null, blocked: level.blocked ?? null, seams: level.seams ?? null,
    gates, blocks: blocksOut, flipDoors, coloredGrids, shutters, generators, elevators, conveyors,
    bombFailurePolicy: level.bombFailurePolicy ?? null,
  });
}

export function mechanismPresence(level) {
  return {
    iceGate: (level?.gates ?? []).some(gate => (gate.frozen ?? 0) > 0),
    frozenBlock: (level?.blocks ?? []).some(block => (block.frozen ?? 0) > 0),
    shell: (level?.blocks ?? []).some(block => (block.layers?.length ?? 1) > 1),
    shutter: Boolean(level?.shutters?.length),
    generator: Boolean(level?.generators?.length),
    axis: (level?.blocks ?? []).some(block => block.movementAxis),
    lock: (level?.blocks ?? []).some(block => block.keyId || block.lockedBy),
    lift: Boolean(level?.elevators?.length) || (level?.shutters ?? []).some(shutter => shutter.skin === 'lift'),
    star: (level?.blocks ?? []).some(block => block.star) || (level?.gates ?? []).some(gate => gate.star),
    grid: Boolean(level?.coloredGrids?.length),
  };
}

export function mechanismCheck(level, index, { allowLateUnlock = false } = {}) {
  const errors = [];
  const present = mechanismPresence(level);
  const mechanisms = Object.keys(present).filter(name => present[name]);
  const beforeUnlock = mechanisms.filter(name => !allowLateUnlock && Number(index) < MECHANISM_UNLOCKS[name]);
  for (const name of beforeUnlock) errors.push(`mechanism-before-unlock:${name}:${MECHANISM_UNLOCKS[name]}`);
  return { status: errors.length ? 'BLOCKED' : 'PASS', index: Number(index), mechanisms, beforeUnlock, unlocks: MECHANISM_UNLOCKS, errors };
}

export function openingAudit(level) {
  const playable = (level?.playable ?? rectangularPlayable(level?.width ?? 0, level?.height ?? 0)).map(pointKey);
  const playableSet = new Set(playable);
  const queued = new Set((level?.generators ?? []).flatMap(generator => generator.queueBlockIds ?? []));
  const blocks = (level?.blocks ?? []).filter(block => !queued.has(block.id) && !block.shutterId);
  const occupancy = new Map();
  for (const block of blocks) for (const [dx, dy] of block.shape ?? []) {
    const key = `${block.x + dx},${block.y + dy}`;
    const list = occupancy.get(key) ?? [];
    list.push(block.id); occupancy.set(key, list);
  }
  for (const shutter of level?.shutters ?? []) {
    if ((shutter.count ?? 0) <= 0 || ['staging', 'lift', 'staged-frame'].includes(shutter.skin)) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
      const key = `${x},${y}`; const list = occupancy.get(key) ?? []; list.push(`shutter:${shutter.id}`); occupancy.set(key, list);
    }
  }
  const missing = [...playableSet].filter(key => !occupancy.has(key));
  const overlaps = [...occupancy.entries()].filter(([, ids]) => ids.length > 1).map(([cell, ids]) => ({ cell, ids }));
  const sameColorAdjacency = [];
  for (let left = 0; left < blocks.length; left += 1) for (let right = left + 1; right < blocks.length; right += 1) {
    const a = blocks[left], b = blocks[right]; if (a.color !== b.color) continue;
    for (const [ax, ay] of a.shape ?? []) for (const [bx, by] of b.shape ?? []) {
      if (Math.abs(a.x + ax - b.x - bx) + Math.abs(a.y + ay - b.y - by) === 1) sameColorAdjacency.push([a.id, b.id]);
    }
  }
  return { playableCells: playableSet.size, coveredCells: occupancy.size, missingCells: missing, overlaps, adjacentSameColor: sameColorAdjacency, status: missing.length || overlaps.length || sameColorAdjacency.length ? 'BLOCKED' : 'PASS' };
}

let runtimePromise;
const loadRuntime = () => runtimePromise ??= build({
  stdin: { resolveDir: process.cwd(), loader: 'ts', contents: "export { validateLevel, PuzzleModel } from './src/core/PuzzleModel.ts';" },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
}).then(result => import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`));

const modelClass = async options => options?.PuzzleModel ?? (await loadRuntime()).PuzzleModel;
const modelPointKey = (x, y) => `${x},${y}`;
const modelDirections = block => {
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (block?.movementAxis === 'horizontal') return directions.filter(([, dy]) => dy === 0);
  if (block?.movementAxis === 'vertical') return directions.filter(([dx]) => dx === 0);
  return directions;
};
const sides = ['top', 'right', 'bottom', 'left'];

/**
 * Check a selected block from the opening state using the production model.
 * The BFS moves this block only; every node is replayed on a fresh model, so
 * moving another block first cannot make an initially blocked block look like
 * an opening direct exit.
 */
export async function openingSingleBlockExitAudit(level, blockId, options = {}) {
  const PuzzleModel = await modelClass(options);
  const maxStates = Math.max(1, Number(options.maxStates ?? ((level?.width ?? 0) * (level?.height ?? 0) * 4)));
  let initialModel;
  try {
    initialModel = new PuzzleModel(level, { deferExitCompletion: true });
    initialModel.startCountdown();
  } catch (error) {
    return { status: 'BLOCKED', directExit: false, blockId, reachablePositions: 0, exits: [], error: String(error?.message ?? error) };
  }
  const initial = initialModel.getBlock(blockId);
  if (!initial || !initialModel.isBlockActive?.(initial)) {
    return { status: 'PASS', directExit: false, blockId, reachablePositions: 0, exits: [], reason: 'inactive-at-opening' };
  }
  const start = [initial.x, initial.y];
  const queue = [{ path: [] }];
  const seen = new Set([modelPointKey(...start)]);
  const exits = [];
  let statesExplored = 0;
  while (queue.length && statesExplored < maxStates) {
    const node = queue.shift();
    const model = new PuzzleModel(level, { deferExitCompletion: true });
    model.startCountdown();
    if (node.path.length) {
      model.beginAction();
      let validPath = true;
      for (const [x, y] of node.path) {
        if (!model.moveBlockStep(blockId, x, y)) { validPath = false; break; }
      }
      if (!validPath) { model.cancelAction(); continue; }
      model.commitAction(false);
    }
    statesExplored += 1;
    const block = model.getBlock(blockId);
    if (!block || !model.isBlockActive?.(block)) continue;
    const available = sides.filter(side => model.exitAttemptStatus(blockId, side) === 'ok');
    if (available.length) {
      exits.push({ position: [block.x, block.y], path: node.path, sides: available });
      if (node.path.length === 0) {
        return { status: 'BLOCKED', directExit: true, blockId, initialPosition: start, reachablePositions: statesExplored, statesExplored, exits };
      }
    }
    for (const [dx, dy] of modelDirections(block)) {
      const next = [block.x + dx, block.y + dy];
      const key = modelPointKey(...next);
      if (seen.has(key) || seen.size >= maxStates) continue;
      seen.add(key);
      queue.push({ path: [...node.path, next] });
    }
  }
  return { status: 'PASS', directExit: false, blockId, initialPosition: start, reachablePositions: statesExplored, statesExplored, exits, truncated: queue.length > 0 };
}

/** Replay a complete candidate route through the production PuzzleModel. */
export async function replayRouteWithModel(level, drags, options = {}) {
  const PuzzleModel = await modelClass(options);
  const model = new PuzzleModel(level, { deferExitCompletion: true });
  model.startCountdown();
  const events = [];
  const actions = [];
  const errors = [];
  for (let index = 0; index < (Array.isArray(drags) ? drags.length : 0); index += 1) {
    const drag = drags[index] ?? {};
    const blockId = drag.blockId;
    if (!model.getBlock(blockId)) { errors.push({ index, blockId, reason: 'block-missing' }); break; }
    model.beginAction();
    let moved = true;
    for (const point of Array.isArray(drag.path) ? drag.path : []) {
      if (!Array.isArray(point) || point.length < 2 || !model.moveBlockStep(blockId, Number(point[0]), Number(point[1]))) { moved = false; break; }
    }
    if (!moved) { model.cancelAction(); errors.push({ index, blockId, reason: 'path-rejected' }); break; }
    let result = null;
    if (drag.exitSide) {
      result = model.tryExit(blockId, drag.exitSide);
      if (!result?.ok) { model.cancelAction(); errors.push({ index, blockId, reason: `exit-rejected:${drag.exitSide}` }); break; }
    }
    const committed = model.commitAction();
    actions.push({ index, blockId, moved: Array.isArray(drag.path) && drag.path.length > 0, exitSide: drag.exitSide ?? null, committed, result });
    if (result?.ok) {
      const layerRemoved = result.layerRemoved === true;
      events.push({ index, blockId, side: drag.exitSide, layerRemoved, fullyRemoved: !layerRemoved && !model.getBlock(blockId), complete: result.complete === true });
    }
  }
  const snapshot = model.snapshot();
  const fullRemovalEvents = events.filter(event => event.fullyRemoved);
  return { valid: errors.length === 0, complete: errors.length === 0 && snapshot.complete === true, failed: snapshot.failed === true,
    nonClearingDrags: (Array.isArray(drags) ? drags : []).filter(drag => !drag?.exitSide).length, effectiveDrags: actions.length,
    actions, events, fullRemovalEvents, errors, snapshot };
}

const getLevel = row => row?.accepted?.level ?? row?.level ?? null;
const getEvidence = row => row?.accepted ?? row;
const targetBand = (row, index) => {
  const target = row?.target ?? getEvidence(row)?.target;
  if (Array.isArray(target) && target.length >= 2) return [Number(target[0]), Number(target[1])];
  if (target && Number.isFinite(Number(target.lower)) && Number.isFinite(Number(target.upper))) return [Number(target.lower), Number(target.upper)];
  return ((Number(index) - 1) % 5 === 2 ? [...SUPER_BAND] : [...HARD_BAND]);
};

function q0Warnings(opening) {
  const out = [];
  if (opening.missingCells.length) out.push(`q0-missing-cells:${opening.missingCells.length}`);
  if (opening.overlaps.length) out.push(`q0-overlap-cells:${opening.overlaps.length}`);
  if (opening.adjacentSameColor.length) out.push(`q0-adjacent-same-color:${opening.adjacentSameColor.length}`);
  return out;
}

/* Check the actual initial PuzzleModel. A later exit after earlier board
 * moves has already opened the board and is therefore not an opening direct
 * exit. */
function openingDirectExit(level, blockId, PuzzleModel) {
  if (!PuzzleModel || !level || !blockId) return false;
  const sides = [...new Set((level.gates ?? []).map(gate => gate.side).filter(Boolean))];
  for (const side of sides) {
    try {
      const model = new PuzzleModel(level);
      model.startCountdown();
      model.beginAction();
      const result = model.tryExit(blockId, side);
      model.cancelAction();
      if (result?.ok) return true;
    } catch {
      // A malformed or unsupported initial state is handled by the normal
      // validator/replay gates; it is not an opening direct exit here.
    }
  }
  return false;
}

/**
 * Validate an accepted report row.  `options.validateLevel` and
 * `options.replayRoute` can be injected by tests or callers.  Without a
 * validator the current PuzzleModel validator is loaded lazily. This function
 * does no search and never writes files.
 */
export async function evidenceCheck(row, options = {}) {
  const errors = [];
  const warnings = [];
  const index = Number(row?.index ?? row?.accepted?.index);
  const evidence = getEvidence(row);
  const level = getLevel(row);
  if (!Number.isInteger(index) || index < 1) errors.push('invalid-index');
  if (!level) return { status: 'BLOCKED', errors: [...errors, 'candidate-level-missing'], warnings, checks: {} };
  const runtime = await loadRuntime();
  const validate = options.validateLevel ?? runtime.validateLevel;
  const PuzzleModel = options.PuzzleModel ?? runtime.PuzzleModel;
  try { validate(level); } catch (error) { errors.push(`validateLevel:${String(error?.message ?? error).slice(0, 300)}`); }
  const mechanisms = mechanismCheck(level, index, options);
  errors.push(...mechanisms.errors);

  const rawLevel = rawJsonHash(level);
  const canonicalLevel = canonicalLevelHash(level);
  const recordedLevel = evidence.levelSha256 ?? evidence.candidateLevelSha256 ?? null;
  const levelHashMode = recordedLevel === rawLevel ? 'raw-json' : (recordedLevel === canonicalLevel ? 'canonical-json' : null);
  if (!recordedLevel) errors.push('candidate-level-sha-missing');
  else if (!levelHashMode) errors.push('candidate-level-sha-mismatch');

  const lower = evidence.lowerBound ?? evidence.lower ?? evidence.proof ?? null;
  const [minMoves, maxMoves] = targetBand(row, index);
  if (!lower || lower.thresholdProven !== true) errors.push('lower-bound-not-threshold-proven');
  const lowerSourceSha = lower?.sourceLevelSha256 ?? lower?.levelSha256 ?? null;
  const lowerHashMode = lowerSourceSha === rawLevel ? 'raw-json' : (lowerSourceSha === canonicalLevel ? 'canonical-json' : null);
  if (!lowerSourceSha) errors.push('lower-bound-source-level-sha-missing');
  else if (!lowerHashMode) errors.push('lower-bound-source-level-sha-mismatch');
  if (lower?.floor != null && Number(lower.floor) !== minMoves) errors.push(`lower-bound-floor:${lower.floor};expected:${minMoves}`);

  const replay = evidence.replay ?? row.replay ?? null;
  if (!replay?.valid || !replay?.complete) errors.push('route-replay-not-complete');
  const nonClearing = Number(replay?.nonClearingDrags ?? evidence.route?.cost ?? evidence.upperBound?.nonClearingDrags);
  if (!Number.isInteger(nonClearing) || nonClearing < minMoves || nonClearing > maxMoves) errors.push(`route-out-of-band:${nonClearing};expected:${minMoves}-${maxMoves}`);
  const drags = evidence.drags ?? row.drags ?? null;
  const recordedRouteSha = evidence.routeSha256 ?? null;
  const rawRoute = Array.isArray(drags) ? rawJsonHash(drags) : null;
  const canonicalRoute = Array.isArray(drags) ? canonicalLevelHash(drags) : null;
  const routeHashMode = recordedRouteSha === rawRoute ? 'raw-json' : (recordedRouteSha === canonicalRoute ? 'canonical-json' : null);
  if (!Array.isArray(drags)) errors.push('complete-route-missing');
  else if (!recordedRouteSha) errors.push('complete-route-sha-missing');
  else if (!routeHashMode) errors.push('complete-route-sha-mismatch');
  if (options.replayRoute && Array.isArray(drags)) {
    try {
      const replayed = await options.replayRoute(level, drags);
      if (!replayed?.valid || !replayed?.complete) errors.push('fresh-route-replay-failed');
    } catch (error) { errors.push(`fresh-route-replay-error:${String(error?.message ?? error).slice(0, 200)}`); }
  }

  const opening = openingAudit(level);
  const openingWarnings = q0Warnings(opening);
  if (options.strictQ0) errors.push(...openingWarnings);
  else warnings.push(...openingWarnings);
  const score = evidence.scoreBlocks ?? evidence.score ?? row.scoreBlocks ?? row.score ?? null;
  const selected = score?.selected ?? [];
  const blocks = new Map((level.blocks ?? []).map(block => [block.id, block]));
  const exits = Array.isArray(drags) ? drags.filter(drag => drag.exitSide) : [];
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const directOpenSpecials = [];
  const lateFailures = [];
  const specialErrors = [];
  if (score?.status != null && score.status !== 'PASS') specialErrors.push(`score-evidence-status:${score.status}`);
  if (!Array.isArray(selected) || selected.length < 1 || selected.length > 3) specialErrors.push('special-count-out-of-range');
  const seen = new Set();
  for (const item of selected) {
    if (seen.has(item.blockId)) specialErrors.push(`special-duplicate:${item.blockId}`); seen.add(item.blockId);
    const block = blocks.get(item.blockId);
    if (!block) { specialErrors.push(`special-missing:${item.blockId}`); continue; }
    if (!rectShape(block.shape)) specialErrors.push(`special-not-filled-rectangle:${item.blockId}`);
    if (item.points !== 10) specialErrors.push(`special-points-not-10:${item.blockId}`);
    const firstExit = exits.findIndex(drag => drag.blockId === item.blockId);
    if (openingDirectExit(level, item.blockId, PuzzleModel)) directOpenSpecials.push(item.blockId);
    if (firstExit < 0 || firstExit + 1 < lateThreshold) lateFailures.push(item.blockId);
    if (firstExit < 0) specialErrors.push(`special-route-missing:${item.blockId}`);
  }
  if (directOpenSpecials.length) specialErrors.push(`special-open-direct-exit:${directOpenSpecials.join(',')}`);
  if (lateFailures.length) specialErrors.push(`special-not-late-half:${lateFailures.join(',')}`);
  if (score?.totalPoints != null && Number(score.totalPoints) !== selected.length * 10) specialErrors.push(`score-total-mismatch:${score.totalPoints};expected:${selected.length * 10}`);
  errors.push(...specialErrors);
  return {
    status: errors.length ? 'BLOCKED' : 'PASS', errors, warnings,
    index, target: [minMoves, maxMoves], mechanisms, opening,
    hashes: { level: { recorded: recordedLevel, raw: rawLevel, canonical: canonicalLevel, matchMode: levelHashMode }, lowerBound: { recorded: lowerSourceSha, raw: rawLevel, canonical: canonicalLevel, matchMode: lowerHashMode }, route: { recorded: recordedRouteSha, raw: rawRoute, canonical: canonicalRoute, matchMode: routeHashMode } },
    checks: { validateLevel: !errors.some(error => error.startsWith('validateLevel:')), mechanismUnlock: mechanisms.status === 'PASS', lowerThresholdProven: lower?.thresholdProven === true, lowerBoundSourceBinding: Boolean(lowerHashMode), completeRouteHash: Boolean(routeHashMode), routeReplayEvidence: Boolean(replay?.valid && replay?.complete), scoreBlockCount: Array.isArray(selected) && selected.length >= 1 && selected.length <= 3, scoreBlocksRectangular: !specialErrors.some(error => error.startsWith('special-not-filled-rectangle:')), scoreBlocksNotDirectExit: directOpenSpecials.length === 0, scoreBlocksLateHalf: lateFailures.length === 0 },
    score: { selected, exits: exits.length, lateThreshold, directOpenSpecials, lateFailures, totalPoints: Array.isArray(selected) ? selected.length * 10 : 0 },
  };
}

export default { canonicalLevelHash, normalizedPuzzleKey, mechanismCheck, evidenceCheck, openingAudit, mechanismPresence, rawJsonHash };

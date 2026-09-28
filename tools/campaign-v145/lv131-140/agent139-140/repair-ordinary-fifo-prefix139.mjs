import assert from 'node:assert/strict';

// Witness discovery only. Every insertion and supplied gesture is executed by
// PuzzleModel with its real automatic FIFO events; no lower-bound claim.
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const sides = ['top', 'right', 'bottom', 'left'];
const worldKey = model => {
  const s = model.snapshot();
  return JSON.stringify([s.blocks, s.queuedBlocks, s.gates, s.shutters, s.generators, s.cleared]);
};

export function executeActualGesture(model, drag) {
  const next = model.clone();
  next.beginAction();
  for (const point of drag.path ?? []) {
    if (!next.moveBlockStep(drag.blockId, ...point)) return null;
  }
  if (drag.exitSide && !next.tryExit(drag.blockId, drag.exitSide).ok) return null;
  return next.commitAction() ? next : null;
}

export function findActualBodyClear(model, blockId, options = {}) {
  const maxMilliseconds = options.maxMilliseconds ?? 200;
  const maxStates = options.maxStates ?? 1000;
  const began = Date.now(), original = model.getBlock(blockId);
  if (!original || !model.isBlockActive(original)) return { status: 'inactive', explored: 0 };
  const nodes = [{ model, path: [] }], seen = new Set([worldKey(model)]);
  let explored = 0;
  for (let at = 0; at < nodes.length; at++) {
    if (Date.now() - began >= maxMilliseconds || seen.size >= maxStates) {
      return { status: 'unknown', explored, discovered: seen.size, milliseconds: Date.now() - began };
    }
    const node = nodes[at]; explored++;
    for (const exitSide of sides) {
      const attempt = node.model.clone(); attempt.beginAction();
      if (!attempt.tryExit(blockId, exitSide).ok) continue;
      const drag = { blockId, path: node.path, exitSide };
      const exact = executeActualGesture(model, drag);
      assert(exact && !exact.getBlock(blockId), 'Single held gesture must actually remove the FIFO body');
      return { status: 'witness', drag, model: exact, explored, discovered: seen.size, milliseconds: Date.now() - began };
    }
    const position = node.model.getBlock(blockId);
    for (const [dx, dy] of directions) {
      const next = node.model.clone(); next.beginAction();
      const point = [position.x + dx, position.y + dy];
      if (!next.moveBlockStep(blockId, ...point)) continue;
      const key = worldKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push({ model: next, path: [...node.path, point] });
    }
  }
  return { status: 'exhausted', explored, discovered: seen.size, milliseconds: Date.now() - began };
}

export function findActualBodyPlacement(model, blockId, destination, options = {}) {
  const began = Date.now(), original = model.getBlock(blockId);
  if (!original || !model.isBlockActive(original)) return null;
  const nodes = [{ model, path: [] }], seen = new Set([worldKey(model)]);
  for (let at = 0; at < nodes.length; at++) {
    if (Date.now() - began >= (options.maxMilliseconds ?? 300) || seen.size >= (options.maxStates ?? 2000)) return null;
    const node = nodes[at], position = node.model.getBlock(blockId);
    if (node.path.length && position.x === destination[0] && position.y === destination[1]) {
      const drag = { blockId, path: node.path }, exact = executeActualGesture(model, drag);
      assert(exact, 'Placement witness must replay as one actual gesture');
      return { drag, model: exact };
    }
    for (const [dx, dy] of directions) {
      const next = node.model.clone(); next.beginAction();
      const point = [position.x + dx, position.y + dy];
      if (!next.moveBlockStep(blockId, ...point)) continue;
      const key = worldKey(next); if (seen.has(key)) continue;
      seen.add(key); nodes.push({ model: next, path: [...node.path, point] });
    }
  }
  return null;
}

export function repairOrdinaryFifoPrefix(level, projectedDrags, api, options = {}) {
  const ordinaryColors = new Set(level.gates.filter(g => !(g.frozen > 0)).map(g => g.color));
  const queueIds = new Set((level.generators ?? []).flatMap(g => g.queueBlockIds));
  const ordinaryQueue = level.blocks.filter(b => queueIds.has(b.id) && ordinaryColors.has((b.layers ?? [b.color])[0])).map(b => b.id);
  const policies = options.policies ?? ['timely', 'on-demand'];
  const attempts = [];
  for (const policy of policies) {
    let model = new api.PuzzleModel(level); model.startCountdown();
    const drags = [], inserted = [], diagnostics = [];
    const insertAvailable = () => {
      for (let round = 0; round < ordinaryQueue.length; round++) {
        let didInsert = false;
        for (const id of ordinaryQueue) {
          if (inserted.includes(id) || !model.getBlock(id)) continue;
          const found = findActualBodyClear(model, id, options);
          diagnostics.push({ id, beforeDrag: drags.length, status: found.status, explored: found.explored });
          if (found.status !== 'witness') continue;
          model = found.model; drags.push(found.drag); inserted.push(id); didInsert = true;
          break;
        }
        if (!didInsert) break;
      }
    };
    let completedProjected = 0;
    for (const drag of projectedDrags) {
      if (policy === 'timely') insertAvailable();
      let next = executeActualGesture(model, drag);
      if (!next) { insertAvailable(); next = executeActualGesture(model, drag); }
      if (!next) break;
      model = next; drags.push(drag); completedProjected++;
    }
    insertAvailable();
    const replay = api.replayRevisedRoute(level, drags);
    assert(replay.valid, 'Every returned repaired prefix must have a fresh valid replay');
    attempts.push({ policy, completedProjected, completeProjected: completedProjected === projectedDrags.length,
      inserted, diagnostics, drags, replay, finalSnapshot: model.snapshot() });
  }
  attempts.sort((a, b) => Number(b.completeProjected) - Number(a.completeProjected) || b.completedProjected - a.completedProjected || b.inserted.length - a.inserted.length);
  return { witnessOnly: true, thresholdProven: false, sourceDragCount: projectedDrags.length, selected: attempts[0], attempts };
}

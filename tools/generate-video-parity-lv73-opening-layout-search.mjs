import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Geometry-only screening search for Lv73's initial no-clear phase.  It is not
// a proof artifact: candidates found here are always rerun by the authoritative
// PuzzleModel physical_cover_prefix verifier and replayed before use.
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputPath = resolve(option(
  "--input",
  ".codex-temp/video-parity-v6-lv73-klotski-hand-a-probe-r9/proof-input.json",
));
const maxDepth = Number(option("--max-depth", "24"));
const maxStates = Number(option("--max-states", "2000000"));
const beamWidth = Number(option("--beam-width", "0"));
const targetId = option("--target-id", "cc-piece-s1-01");

const parsed = JSON.parse(await readFile(inputPath, "utf8"));
const level = parsed.levels?.[0]?.level ?? parsed.levels?.[0] ?? parsed.level ?? parsed;
const targetGate = level.gates.find((gate) => !gate.frozen && gate.color === "blue" && gate.size >= 2);
if (!targetGate) throw new Error("unique target gate not found");
const physicalCovers = (level.shutters ?? []).filter((cover) => (
  (cover.skin ?? "shutter") !== "staged-frame"
  && cover.skin !== "staging"
  && cover.skin !== "lift"
));
const coverCells = new Set(physicalCovers.flatMap((cover) => (
  Array.from({ length: cover.height }, (_, dy) => (
    Array.from({ length: cover.width }, (_unused, dx) => `${cover.x + dx},${cover.y + dy}`)
  )).flat()
)));
const playable = new Set(level.playable.map(([x, y]) => `${x},${y}`));
const blocks = level.blocks.filter((block) => !block.shutterId).map((block) => ({
  id: block.id,
  shape: block.shape.map(([x, y]) => [x, y]),
  start: block.y * level.width + block.x,
}));
const targetIndex = blocks.findIndex((block) => block.id === targetId);
if (targetIndex < 0) throw new Error(`missing target ${targetId}`);

const shapeSignature = (shape) => [...shape].sort(([ax, ay], [bx, by]) => ay - by || ax - bx)
  .map(([x, y]) => `${x},${y}`).join(";");
const groups = [];
const groupedByShape = new Map();
for (let index = 0; index < blocks.length; index += 1) {
  if (index === targetIndex) continue;
  const signature = shapeSignature(blocks[index].shape);
  const entries = groupedByShape.get(signature) ?? [];
  entries.push(index);
  groupedByShape.set(signature, entries);
}
for (const entries of groupedByShape.values()) if (entries.length > 1) groups.push(entries);

const normalize = (positions) => {
  const normalized = positions.slice();
  for (const group of groups) {
    const anchors = group.map((index) => normalized[index]).sort((left, right) => left - right);
    group.forEach((index, order) => { normalized[index] = anchors[order]; });
  }
  return normalized;
};
const keyOf = (positions) => positions.join(",");
const xy = (anchor) => [anchor % level.width, Math.floor(anchor / level.width)];
const occupiedWithout = (positions, skippedIndex) => {
  const occupied = new Set(coverCells);
  for (let index = 0; index < blocks.length; index += 1) {
    if (index === skippedIndex) continue;
    const [x, y] = xy(positions[index]);
    for (const [dx, dy] of blocks[index].shape) occupied.add(`${x + dx},${y + dy}`);
  }
  return occupied;
};
const canPlace = (blockIndex, x, y, occupied) => blocks[blockIndex].shape.every(([dx, dy]) => {
  const key = `${x + dx},${y + dy}`;
  return playable.has(key) && !occupied.has(key);
});
const targetAtExit = (x, y) => {
  const cells = blocks[targetIndex].shape.map(([dx, dy]) => [x + dx, y + dy]);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  if (targetGate.side === "top") return minY === 0 && minX >= targetGate.offset && maxX < targetGate.offset + targetGate.size;
  if (targetGate.side === "bottom") return maxY === level.height - 1 && minX >= targetGate.offset && maxX < targetGate.offset + targetGate.size;
  if (targetGate.side === "left") return minX === 0 && minY >= targetGate.offset && maxY < targetGate.offset + targetGate.size;
  return maxX === level.width - 1 && minY >= targetGate.offset && maxY < targetGate.offset + targetGate.size;
};
const reachableAnchors = (positions, blockIndex, stopAtTargetExit = false) => {
  const occupied = occupiedWithout(positions, blockIndex);
  const start = positions[blockIndex];
  const queue = [start];
  const parents = new Map([[start, null]]);
  let exitAnchor = null;
  for (let head = 0; head < queue.length; head += 1) {
    const anchor = queue[head];
    const [x, y] = xy(anchor);
    if (stopAtTargetExit && targetAtExit(x, y)) {
      exitAnchor = anchor;
      break;
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const next = nextY * level.width + nextX;
      if (parents.has(next) || !canPlace(blockIndex, nextX, nextY, occupied)) continue;
      parents.set(next, anchor);
      queue.push(next);
    }
  }
  return { queue, parents, exitAnchor };
};
const anchorPath = (parents, anchor) => {
  const path = [];
  for (let cursor = anchor; parents.get(cursor) !== null; cursor = parents.get(cursor)) path.push(xy(cursor));
  return path.reverse();
};

const startPositions = normalize(blocks.map((block) => block.start));
const startKey = keyOf(startPositions);
let current = [{ positions: startPositions, key: startKey }];
const seen = new Set([startKey]);
const cameFrom = new Map();
let explored = 0;
let result = null;
let targetAnchorCount = new Set([startPositions[targetIndex]]);
let bestNode = { positions: startPositions, key: startKey, score: Number.NEGATIVE_INFINITY, depth: 0 };
const heuristic = (positions) => {
  const [targetX, targetY] = xy(positions[targetIndex]);
  let outsideFrame = 0;
  let corridorBlockers = 0;
  let bayCells = 0;
  let goalBlockers = 0;
  for (let index = 0; index < blocks.length; index += 1) {
    if (index === targetIndex) continue;
    const [x, y] = xy(positions[index]);
    const cells = blocks[index].shape.map(([dx, dy]) => [x + dx, y + dy]);
    if (cells.some(([, cellY]) => cellY >= 5)) outsideFrame += 1;
    bayCells += cells.filter(([cellX, cellY]) => cellY === 5 && cellX >= 3).length;
    corridorBlockers += cells.filter(([cellX, cellY]) => (
      cellY >= targetY + 2 && cellX >= targetGate.offset && cellX < targetGate.offset + targetGate.size
    )).length;
    goalBlockers += cells.filter(([cellX, cellY]) => (
      cellY >= 10 && cellX >= targetGate.offset && cellX < targetGate.offset + targetGate.size
    )).length;
  }
  return targetY * 10_000 + (targetX === targetGate.offset ? 5_000 : 0)
    + bayCells * 2_000 + outsideFrame * 100
    - corridorBlockers * 12_000 - goalBlockers * 20_000;
};

for (let depth = 0; depth <= maxDepth && current.length && !result; depth += 1) {
  const next = [];
  for (const node of current) {
    if (++explored > maxStates) break;
    const targetReachable = reachableAnchors(node.positions, targetIndex, true);
    const nodeScore = heuristic(node.positions);
    if (nodeScore > bestNode.score) bestNode = { ...node, score: nodeScore, depth };
    for (const anchor of targetReachable.queue) targetAnchorCount.add(anchor);
    if (targetReachable.exitAnchor !== null) {
      const actions = [{
        block_id: blocks[targetIndex].id,
        path: anchorPath(targetReachable.parents, targetReachable.exitAnchor),
        exit_side: targetGate.side,
      }];
      for (let cursor = node.key; cursor !== startKey;) {
        const prior = cameFrom.get(cursor);
        actions.push(prior.action);
        cursor = prior.parent;
      }
      actions.reverse();
      result = { depth, actions };
      break;
    }
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const reachable = blockIndex === targetIndex
        ? targetReachable
        : reachableAnchors(node.positions, blockIndex, false);
      for (const anchor of reachable.queue) {
        if (anchor === node.positions[blockIndex]) continue;
        const positions = node.positions.slice();
        positions[blockIndex] = anchor;
        const normalized = normalize(positions);
        const key = keyOf(normalized);
        if (seen.has(key)) continue;
        seen.add(key);
        cameFrom.set(key, {
          parent: node.key,
          action: {
            block_id: blocks[blockIndex].id,
            path: anchorPath(reachable.parents, anchor),
          },
        });
        next.push({ positions: normalized, key });
      }
    }
  }
  if (explored > maxStates) break;
  process.stderr.write(`depth=${depth} frontier=${current.length} seen=${seen.size}\n`);
  current = beamWidth > 0 && next.length > beamWidth
    ? next.sort((left, right) => heuristic(right.positions) - heuristic(left.positions)).slice(0, beamWidth)
    : next;
}

const routeToNode = (node) => {
  const actions = [];
  for (let cursor = node.key; cursor !== startKey;) {
    const prior = cameFrom.get(cursor);
    if (!prior) break;
    actions.push(prior.action);
    cursor = prior.parent;
  }
  return actions.reverse();
};

console.log(JSON.stringify({
  input: inputPath,
  target_id: targetId,
  target_gate: targetGate,
  symmetry_groups: groups.map((indices) => indices.map((index) => blocks[index].id)),
  solved: Boolean(result),
  minimum_repositions_before_first_clear: result?.depth ?? null,
  explored_states: explored,
  visited_states: seen.size,
  beam_width: beamWidth || null,
  target_reachable_anchors: [...targetAnchorCount].map(xy),
  best_screening_state: {
    depth: bestNode.depth,
    score: bestNode.score,
    anchors: blocks.map((block, index) => ({ id: block.id, anchor: xy(bestNode.positions[index]) })),
    route: routeToNode(bestNode),
  },
  route: result?.actions ?? [],
}, null, 2));

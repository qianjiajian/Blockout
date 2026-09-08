import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(
  root,
  process.env.DIFFICULTY_FLOOR_OUTPUT
    ?? "playtest-results/experiments/difficulty-bands-2026-09-06/counter-floor-candidates.json",
);
const requestedIds = (process.env.LEVEL_IDS ?? "")
  .split(",")
  .map(Number)
  .filter((id) => Number.isInteger(id) && id >= 1 && id <= 100);
const targetScore = Number(process.env.DIFFICULTY_FLOOR_TARGET ?? 45.5);
const counterCap = Number(process.env.DIFFICULTY_COUNTER_CAP ?? 9);
const trimRatioCap = Number(process.env.DIFFICULTY_TRIM_RATIO_CAP ?? 0.1);

const bundle = await build({
  stdin: {
    contents: `
      import { LEVELS } from "./src/core/levels.ts";
      import { PuzzleModel } from "./src/core/PuzzleModel.ts";
      import { scoreBlockOutLevel } from "./src/core/blockOutDifficulty.ts";
      import { solveLevelForValidation } from "./src/core/levelSolver.ts";
      import { isIceEligibleBlockShape } from "./src/core/blockShape.ts";
      export { LEVELS, PuzzleModel, scoreBlockOutLevel, solveLevelForValidation, isIceEligibleBlockShape };
    `,
    resolveDir: root,
    sourcefile: "difficulty-floor-search-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const { LEVELS, PuzzleModel, scoreBlockOutLevel, solveLevelForValidation, isIceEligibleBlockShape } = await import(moduleUrl);

const CALIBRATION = { slope: 0.826935, intercept: 13.161835 };
const calibrated = (level) => Number((
  CALIBRATION.intercept + CALIBRATION.slope * scoreBlockOutLevel(level).score
).toFixed(2));
const key = ([x, y]) => `${x},${y}`;
const cloneLevel = (level) => structuredClone(level);
const baselineHash = (level) => {
  const payload = JSON.stringify({
    id: level.id,
    width: level.width,
    height: level.height,
    playable: level.playable,
    blocked: level.blocked,
    gates: level.gates,
    blocks: level.blocks,
    shutters: level.shutters,
    elevators: level.elevators,
    conveyors: level.conveyors,
    onboardingHint: level.onboardingHint,
    strategyNudge: level.strategyNudge,
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const replay = (level, route) => {
  try {
    const model = new PuzzleModel(level);
    for (const drag of route.drags) {
      model.beginAction();
      for (const [x, y] of drag.path) {
        if (!model.moveBlock(drag.blockId, x, y)) return false;
      }
      if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
      if (!model.commitAction()) return false;
    }
    return model.snapshot().complete;
  } catch {
    return false;
  }
};

const hasMechanism = (level, kind) => {
  if (kind === "gate") return level.gates.some((gate) => (gate.frozen ?? 0) > 0);
  return level.blocks.some((block) => (block.frozen ?? 0) > 0);
};

const incrementCounter = (level, option) => {
  const next = cloneLevel(level);
  const collection = option.kind === "gate" ? next.gates : next.blocks;
  const item = collection.find((entry) => entry.id === option.id);
  item.frozen = (item.frozen ?? 0) + 1;
  return next;
};

const counterOptions = (level) => [
  ...level.gates.map((gate) => ({ kind: "gate", id: gate.id, current: gate.frozen ?? 0 })),
  ...level.blocks
    .filter((block) => !block.shutterId && isIceEligibleBlockShape(block.shape))
    .map((block) => ({ kind: "block", id: block.id, current: block.frozen ?? 0 })),
];

const connected = (playable) => {
  if (!playable.length) return false;
  const cells = new Set(playable.map(key));
  const queue = [playable[0]];
  const seen = new Set([key(playable[0])]);
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const point = [x + dx, y + dy];
      const pointKey = key(point);
      if (!cells.has(pointKey) || seen.has(pointKey)) continue;
      seen.add(pointKey);
      queue.push(point);
    }
  }
  return seen.size === cells.size;
};

const hasEnclosedVoid = (level) => {
  const playable = new Set(level.playable.map(key));
  const outside = new Set();
  const queue = [];
  for (let y = -1; y <= level.height; y += 1) {
    for (let x = -1; x <= level.width; x += 1) {
      if (x !== -1 && x !== level.width && y !== -1 && y !== level.height) continue;
      const pointKey = `${x},${y}`;
      outside.add(pointKey);
      queue.push([x, y]);
    }
  }
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < -1 || ny < -1 || nx > level.width || ny > level.height) continue;
      const pointKey = `${nx},${ny}`;
      if (outside.has(pointKey) || playable.has(pointKey)) continue;
      outside.add(pointKey);
      queue.push([nx, ny]);
    }
  }
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const pointKey = `${x},${y}`;
      if (!playable.has(pointKey) && !outside.has(pointKey)) return true;
    }
  }
  return false;
};

const singleCellTrim = (level, route) => {
  const protectedCells = new Set();
  for (const block of level.blocks) {
    for (const [dx, dy] of block.shape) protectedCells.add(`${block.x + dx},${block.y + dy}`);
  }
  for (const gate of level.gates) {
    for (let offset = gate.offset; offset < gate.offset + gate.size; offset += 1) {
      const point = gate.side === "top" ? [offset, 0]
        : gate.side === "bottom" ? [offset, level.height - 1]
          : gate.side === "left" ? [0, offset]
            : [level.width - 1, offset];
      protectedCells.add(key(point));
    }
  }
  const protectAuthoredPath = (blockId, origins) => {
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    if (!block) return;
    for (const [x, y] of origins) {
      for (const [dx, dy] of block.shape) protectedCells.add(`${x + dx},${y + dy}`);
    }
  };
  if (level.onboardingHint) protectAuthoredPath(level.onboardingHint.blockId, level.onboardingHint.path);
  if (level.strategyNudge) {
    protectAuthoredPath(level.strategyNudge.blockId, [level.strategyNudge.from, ...level.strategyNudge.path]);
  }
  const candidates = level.playable
    .filter((point) => !protectedCells.has(key(point)))
    .sort(([ax, ay], [bx, by]) => {
      const aEdge = Math.min(ax, ay, level.width - 1 - ax, level.height - 1 - ay);
      const bEdge = Math.min(bx, by, level.width - 1 - bx, level.height - 1 - by);
      return aEdge - bEdge || ay - by || ax - bx;
    });
  for (const removed of candidates) {
    const next = cloneLevel(level);
    next.playable = next.playable.filter((point) => key(point) !== key(removed));
    if (!connected(next.playable) || hasEnclosedVoid(next) || !replay(next, route)) continue;
    return { level: next, removed };
  }
  return undefined;
};

const bestLayerExtension = (level) => {
  const unlayered = level.blocks.filter((block) => (block.layers?.length ?? 1) === 1);
  if (!unlayered.length) return undefined;
  const colors = [...new Set(level.gates.map((gate) => gate.color))];
  const viable = [];
  for (const block of unlayered) {
    const layers = block.layers?.length ? block.layers : [block.color];
    for (const color of colors) {
      if (layers[0] === color) continue;
        const next = cloneLevel(level);
        const nextBlock = next.blocks.find((candidate) => candidate.id === block.id);
        nextBlock.layers = [...layers, color];
        const score = calibrated(next);
        if (score < 45) continue;
        const route = solveLevelForValidation(next, 240_000);
        if (!route.solved || !replay(next, route)) continue;
        viable.push({ next, blockId: block.id, suffix: [color], route, score });
    }
  }
  viable.sort((left, right) => (
    Math.abs(left.score - targetScore) - Math.abs(right.score - targetScore)
    || left.route.exploredStates - right.route.exploredStates
    || left.blockId.localeCompare(right.blockId)
    || left.suffix.join(",").localeCompare(right.suffix.join(","))
  ));
  return viable[0];
};

const ids = requestedIds.length
  ? requestedIds
  : LEVELS.filter((level) => calibrated(level) < 45).map((level) => level.id);
const results = [];

for (const id of ids) {
  const source = LEVELS[id - 1];
  const route = solveLevelForValidation(source, 240_000);
  if (!route.solved || !replay(source, route)) throw new Error(`Lv${id} baseline route did not replay`);
  let candidate = cloneLevel(source);
  const changes = [];
  const removedCells = [];

  if (calibrated(candidate) < targetScore && id < 10) {
    const trim = singleCellTrim(candidate, route);
    if (trim) {
      candidate = trim.level;
      removedCells.push(trim.removed);
      changes.push({ type: "remove-playable", cell: trim.removed });
    }
  }

  const addRouteSafeCounter = (allowNewMechanism) => {
    const priorGateMechanism = hasMechanism(candidate, "gate");
    const priorBlockMechanism = hasMechanism(candidate, "block");
    const viable = [];
    for (const option of counterOptions(candidate)) {
      if (option.current >= counterCap) continue;
      const next = incrementCounter(candidate, option);
      if (!replay(next, route)) continue;
      const introducesMechanism = option.kind === "gate" ? !priorGateMechanism : !priorBlockMechanism;
      if (!allowNewMechanism && introducesMechanism) continue;
      viable.push({ option, next, score: calibrated(next), introducesMechanism });
    }
    viable.sort((left, right) => (
      Number(left.introducesMechanism) - Number(right.introducesMechanism)
      || Number(left.option.current === 0) - Number(right.option.current === 0)
      || right.score - left.score
      || left.option.kind.localeCompare(right.option.kind)
      || left.option.id.localeCompare(right.option.id)
    ));
    const best = viable[0];
    if (!best) return false;
    candidate = best.next;
    const existing = changes.find((change) => change.type === `${best.option.kind}-frozen` && change.id === best.option.id);
    const collection = best.option.kind === "gate" ? candidate.gates : candidate.blocks;
    const value = collection.find((entry) => entry.id === best.option.id).frozen;
    if (existing) existing.to = value;
    else changes.push({ type: `${best.option.kind}-frozen`, id: best.option.id, from: best.option.current, to: value });
    return true;
  };

  while (calibrated(candidate) < targetScore && id >= 10 && addRouteSafeCounter(false)) {
    // Exhaust route-safe increments that keep the level's existing mechanism set.
  }

  const maxRemovedCells = Math.floor((source.playable?.length ?? 0) * trimRatioCap);
  while (calibrated(candidate) < targetScore
    && targetScore - calibrated(candidate) <= 2
    && removedCells.length < maxRemovedCells) {
    const trim = singleCellTrim(candidate, route);
    if (!trim) break;
    candidate = trim.level;
    removedCells.push(trim.removed);
    changes.push({ type: "remove-playable", cell: trim.removed });
  }

  while (calibrated(candidate) < targetScore && id >= 10 && addRouteSafeCounter(true)) {
    // A newly introduced counter type is allowed only after known-mechanism
    // increments and conservative geometry tuning have been exhausted.
  }

  let finalRouteResult = route;
  if (calibrated(candidate) < 45 && id >= 15) {
    const extension = bestLayerExtension(candidate);
    if (extension) {
      candidate = extension.next;
      finalRouteResult = extension.route;
      changes.push({ type: "append-layers", id: extension.blockId, colors: extension.suffix });
    }
  }

  const exactBaselineRoute = replay(candidate, route);
  const finalRoute = replay(candidate, finalRouteResult);
  results.push({
    levelId: id,
    name: source.name,
    baselineScore: calibrated(source),
    targetScore,
    finalScore: calibrated(candidate),
    passed: calibrated(candidate) >= 45 && finalRoute,
    exactBaselineRouteReplays: exactBaselineRoute,
    routeDrags: finalRouteResult.minimumDrags,
    routeClearLoad: finalRouteResult.clearLoad,
    changes,
    baselineHash: baselineHash(source),
    override: {
      playable: candidate.playable,
      gates: Object.fromEntries(candidate.gates
        .filter((gate, index) => (gate.frozen ?? 0) !== (source.gates[index].frozen ?? 0))
        .map((gate) => [gate.id, { frozen: gate.frozen ?? 0 }])),
      blocks: Object.fromEntries(candidate.blocks
        .filter((block, index) => (
          (block.frozen ?? 0) !== (source.blocks[index].frozen ?? 0)
          || JSON.stringify(block.layers ?? [block.color]) !== JSON.stringify(source.blocks[index].layers ?? [source.blocks[index].color])
        ))
        .map((block) => [block.id, {
          ...((block.frozen ?? 0) !== (source.blocks.find((entry) => entry.id === block.id)?.frozen ?? 0)
            ? { frozen: block.frozen ?? 0 }
            : {}),
          ...(JSON.stringify(block.layers ?? [block.color]) !== JSON.stringify(source.blocks.find((entry) => entry.id === block.id)?.layers ?? [source.blocks.find((entry) => entry.id === block.id)?.color])
            ? { layers: block.layers }
            : {}),
        }])),
      parMoves: finalRouteResult.clearLoad > route.clearLoad
        ? (source.parMoves ?? route.clearLoad) + (finalRouteResult.clearLoad - route.clearLoad)
        : undefined,
    },
  });
  console.log(`Lv${id}: ${calibrated(source)} -> ${calibrated(candidate)} ${finalRoute ? "replay-ok" : "replay-failed"}`);
}

await writeFile(outputPath, `${JSON.stringify({ targetScore, counterCap, levels: results }, null, 2)}\n`, "utf8");
if (results.some((result) => !result.passed)) process.exitCode = 1;

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Repair completion witnesses after video-parity mechanisms have been applied.
 *
 * This is deliberately independent from assemble-video-parity-runtime.mjs. It
 * does not mutate LevelSpec records and it never treats a replayed route as a
 * necessary-reposition lower bound. PuzzleModel is the sole runtime authority:
 * every proposed drag is executed on a clone, and every published event stream
 * is replayed from a fresh model before it is written.
 *
 * Examples:
 *   node tools/repair-video-parity-completion-witnesses.mjs
 *   node tools/repair-video-parity-completion-witnesses.mjs \
 *     --levels .codex-temp/run/videoParityLevels.generated.ts \
 *     --routes .codex-temp/base/validation-routes.json \
 *     --level-ids 10-19,31 \
 *     --output-routes .codex-temp/run/repaired-routes.json \
 *     --output-audit .codex-temp/run/repaired-routes-audit.json
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  levels: ".codex-temp/carrier-matching-ab/final2/videoParityLevels.generated.ts",
  routes: ".codex-temp/video-parity-v6-final-smoke-r2/report/validation-routes.json",
  baselineRoutes: ".codex-temp/carrier-matching-ab/final2/runtime-validation-routes.json",
  outputRoutes: ".codex-temp/carrier-matching-ab/completion-witness-repair/repaired-validation-routes.json",
  outputAudit: ".codex-temp/carrier-matching-ab/completion-witness-repair/repair-audit.json",
  levelIds: "",
  maxStates: 100_000,
  maxMillisecondsPerLevel: 15_000,
  stochasticRestarts: 0,
  stochasticMillisecondsPerLevel: 0,
};

const usage = `Usage: node tools/repair-video-parity-completion-witnesses.mjs [options]

Options:
  --levels <ts|json>          LevelSpec array/module input
  --routes <json>             Original validation routes
  --baseline-routes <json>    Optional previous witness artifact for A/B
  --level-ids <list>          Comma-separated ids/ranges, for example 10-19,31
  --output-routes <json>      Repaired route event artifact
  --output-audit <json>       Repair and A/B audit
  --max-states <n>            Search-state cap per level
  --max-ms <n>                Wall-clock cap per level
  --stochastic-restarts <n>   Deterministic randomized-greedy restart count (0 disables)
  --stochastic-ms <n>         Separate wall-clock cap for stochastic fallback
  --help                      Show this help
`;

const parseArgs = (argv) => {
  const parsed = { ...defaults };
  const keys = new Map([
    ["--levels", "levels"],
    ["--routes", "routes"],
    ["--baseline-routes", "baselineRoutes"],
    ["--level-ids", "levelIds"],
    ["--output-routes", "outputRoutes"],
    ["--output-audit", "outputAudit"],
    ["--max-states", "maxStates"],
    ["--max-ms", "maxMillisecondsPerLevel"],
    ["--stochastic-restarts", "stochasticRestarts"],
    ["--stochastic-ms", "stochasticMillisecondsPerLevel"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    const key = keys.get(token);
    if (!key) throw new Error(`Unknown option: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
    parsed[key] = key === "maxStates" || key === "maxMillisecondsPerLevel"
      || key === "stochasticRestarts" || key === "stochasticMillisecondsPerLevel"
      ? Number.parseInt(value, 10)
      : value;
    index += 1;
  }
  if (!Number.isInteger(parsed.maxStates) || parsed.maxStates <= 0) throw new Error("--max-states must be a positive integer");
  if (!Number.isInteger(parsed.maxMillisecondsPerLevel) || parsed.maxMillisecondsPerLevel <= 0) {
    throw new Error("--max-ms must be a positive integer");
  }
  if (!Number.isInteger(parsed.stochasticRestarts) || parsed.stochasticRestarts < 0) {
    throw new Error("--stochastic-restarts must be a non-negative integer");
  }
  if (!Number.isInteger(parsed.stochasticMillisecondsPerLevel) || parsed.stochasticMillisecondsPerLevel < 0) {
    throw new Error("--stochastic-ms must be a non-negative integer");
  }
  return parsed;
};

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(usage);
  process.exit(0);
}

const absolute = (path) => resolve(root, path);
const displayPath = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (source) => createHash("sha256").update(source).digest("hex").toUpperCase();
const clone = (value) => structuredClone(value);
const levelIdOf = (entry) => Number(String(entry?.level_id ?? entry?.levelId ?? entry?.id ?? entry?.level?.id ?? "")
  .replace(/^Lv/i, ""));
const levelLabel = (id) => `Lv${String(id).padStart(3, "0")}`;
const pointKey = (x, y) => `${x},${y}`;
const roundSeconds = (seconds) => Math.round(seconds * 1_000_000) / 1_000_000;

const parseLevelIds = (source) => [...new Set(String(source ?? "")
  .split(",")
  .flatMap((raw) => {
    const token = raw.trim();
    if (!token) return [];
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!range) return [Number.parseInt(token, 10)];
    const start = Number(range[1]);
    const end = Number(range[2]);
    const lower = Math.min(start, end);
    const upper = Math.max(start, end);
    return Array.from({ length: upper - lower + 1 }, (_, index) => lower + index);
  })
  .filter((id) => Number.isInteger(id) && id > 0))].sort((left, right) => left - right);

const bundleModule = async (entryPath) => {
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  const url = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`;
  return import(url);
};

const normalizeLevels = (value) => {
  const raw = Array.isArray(value) ? value : value?.levels;
  if (!Array.isArray(raw)) return null;
  return raw.map((entry) => clone(entry?.level ?? entry));
};

const loadLevels = async (path) => {
  const source = await readFile(path, "utf8");
  if (extname(path).toLowerCase() === ".json") {
    const levels = normalizeLevels(JSON.parse(source));
    if (!levels) throw new Error(`${displayPath(path)} does not contain a LevelSpec array`);
    return { levels, source };
  }
  const module = await bundleModule(path);
  const candidates = [module.VIDEO_PARITY_LEVELS, module.LEVELS, module.default, ...Object.values(module)];
  const levels = candidates.map(normalizeLevels).find(Boolean);
  if (!levels) throw new Error(`${displayPath(path)} exports no recognizable LevelSpec array`);
  return { levels, source };
};

const puzzleBundle = await build({
  stdin: {
    contents: `export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "completion-witness-repair-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const puzzleSourcePath = absolute("src/core/PuzzleModel.ts");
const puzzleSource = await readFile(puzzleSourcePath, "utf8");
const puzzleBundleSource = puzzleBundle.outputFiles[0].text;
const puzzleModuleUrl = `data:text/javascript;base64,${Buffer.from(puzzleBundleSource).toString("base64")}`;
const { PuzzleModel, validateLevel } = await import(puzzleModuleUrl);

const normalizeRouteEntries = (artifact) => {
  const raw = Array.isArray(artifact) ? artifact : artifact?.levels ?? artifact?.routes ?? [];
  return raw.map((entry) => ({
    ...entry,
    id: levelIdOf(entry),
    events: clone(entry.events ?? entry.route ?? entry.drags ?? []),
  })).filter((entry) => Number.isInteger(entry.id));
};

const levelsPath = absolute(options.levels);
const routesPath = absolute(options.routes);
const baselineRoutesPath = options.baselineRoutes ? absolute(options.baselineRoutes) : null;
const outputRoutesPath = absolute(options.outputRoutes);
const outputAuditPath = absolute(options.outputAudit);
const [{ levels, source: levelsSource }, routesSource, baselineRoutesSource] = await Promise.all([
  loadLevels(levelsPath),
  readFile(routesPath, "utf8"),
  baselineRoutesPath ? readFile(baselineRoutesPath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  }) : null,
]);
const routeEntries = normalizeRouteEntries(JSON.parse(routesSource));
const baselineEntries = baselineRoutesSource ? normalizeRouteEntries(JSON.parse(baselineRoutesSource)) : [];
const levelById = new Map(levels.map((level) => [Number(level.id), level]));
const routeById = new Map(routeEntries.map((entry) => [entry.id, entry]));
const baselineById = new Map(baselineEntries.map((entry) => [entry.id, entry]));
const requestedIds = parseLevelIds(options.levelIds);
const selectedIds = requestedIds.length ? requestedIds : [...levelById.keys()].sort((left, right) => left - right);

for (const id of selectedIds) {
  if (!levelById.has(id)) throw new Error(`${levelLabel(id)} is absent from ${displayPath(levelsPath)}`);
  if (!routeById.has(id)) throw new Error(`${levelLabel(id)} has no original route in ${displayPath(routesPath)}`);
}

const isWaitEvent = (event) => event?.type === "wait";
const asDragEvent = (event) => ({
  type: "drag",
  blockId: event.blockId,
  path: clone(event.path ?? []),
  ...(event.exitSide ? { exitSide: event.exitSide } : {}),
  ...(event.purpose ? { purpose: event.purpose } : {}),
});

const timedGeneratorIntervals = (level) => (level.generators ?? [])
  .filter((generator) => generator.trigger === "time")
  .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));

const executeDrag = (model, event) => {
  const drag = asDragEvent(event);
  if (!model.getBlock(drag.blockId)) return { ok: false, error: `block ${drag.blockId} is not on the board` };
  model.beginAction();
  for (let index = 0; index < drag.path.length; index += 1) {
    const [x, y] = drag.path[index];
    const before = model.getBlock(drag.blockId);
    const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
    const moved = distance === 1
      ? model.moveBlockStep(drag.blockId, x, y)
      : model.moveBlock(drag.blockId, x, y);
    const after = model.getBlock(drag.blockId);
    if (!moved || !after || after.x !== x || after.y !== y) {
      model.cancelAction();
      return { ok: false, error: `step ${index + 1} cannot move ${drag.blockId} to ${x},${y}` };
    }
  }
  let exitResult = null;
  if (drag.exitSide) {
    exitResult = model.tryExit(drag.blockId, drag.exitSide);
    if (!exitResult.ok) {
      model.cancelAction();
      return {
        ok: false,
        error: `cannot exit ${drag.blockId} via ${drag.exitSide}`,
        exitStatus: model.exitAttemptStatus(drag.blockId, drag.exitSide),
      };
    }
  }
  if (!model.commitAction()) return { ok: false, error: `drag for ${drag.blockId} did not mutate the puzzle` };
  return { ok: true, exitResult };
};

const replayEvents = (level, events, { legacyImplicitTimedTicks = false } = {}) => {
  const model = new PuzzleModel(level);
  const legacyInterval = Math.max(0, ...timedGeneratorIntervals(level));
  let dragCount = 0;
  let waitCount = 0;
  let waitedSeconds = 0;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (isWaitEvent(event)) {
      const seconds = Number(event.seconds);
      if (!Number.isFinite(seconds) || seconds < 0) {
        return { ok: false, error: `event ${index + 1}: invalid wait duration` };
      }
      const movesBefore = model.snapshot().moves;
      model.tick(seconds);
      if (model.snapshot().moves !== movesBefore) {
        return { ok: false, error: `event ${index + 1}: wait changed the player move count` };
      }
      if (model.snapshot().failed) return { ok: false, error: `event ${index + 1}: wait exhausted the level timer` };
      waitCount += 1;
      waitedSeconds += seconds;
      continue;
    }
    const result = executeDrag(model, event);
    if (!result.ok) return { ok: false, error: `event ${index + 1}: ${result.error}` };
    dragCount += 1;
    if (legacyImplicitTimedTicks && legacyInterval > 0) model.tick(legacyInterval);
  }
  const snapshot = model.snapshot();
  if (!snapshot.complete) {
    return {
      ok: false,
      error: `${snapshot.blocks.length} board and ${snapshot.queuedBlocks.length} queued blocks remain`,
      dragCount,
      waitCount,
      waitedSeconds: roundSeconds(waitedSeconds),
    };
  }
  return {
    ok: true,
    dragCount,
    waitCount,
    waitedSeconds: roundSeconds(waitedSeconds),
    moves: snapshot.moves,
    cleared: snapshot.cleared,
  };
};

const explicitizeLegacyTimedRoute = (level, events) => {
  const interval = Math.max(0, ...timedGeneratorIntervals(level));
  if (interval <= 0) return clone(events);
  return events.flatMap((event) => isWaitEvent(event)
    ? [clone(event)]
    : [
      asDragEvent(event),
      {
        type: "wait",
        seconds: roundSeconds(interval),
        costMoves: 0,
        purpose: "explicitized-legacy-timed-feeder-progress",
      },
    ]);
};

const movementDirections = (block) => block.movementAxis === "horizontal"
  ? [[1, 0], [-1, 0]]
  : block.movementAxis === "vertical"
    ? [[0, 1], [0, -1]]
    : [[1, 0], [0, 1], [-1, 0], [0, -1]];

const reconstructPath = (nodes, targetKey) => {
  const path = [];
  let key = targetKey;
  while (key) {
    const node = nodes.get(key);
    if (!node) break;
    path.push(node.point);
    key = node.parent;
  }
  path.reverse();
  return path.slice(1);
};

const bfsAnchors = (model, blockId, goal) => {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return null;
  const startKey = pointKey(block.x, block.y);
  const nodes = new Map([[startKey, { point: [block.x, block.y], parent: null }]]);
  const queue = [[block.x, block.y]];
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    const match = goal(x, y);
    if (match) return { path: reconstructPath(nodes, pointKey(x, y)), match, explored: nodes.size };
    for (const [dx, dy] of movementDirections(block)) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = pointKey(nextX, nextY);
      if (nodes.has(key) || !model.canPlace(block, nextX, nextY)) continue;
      nodes.set(key, { point: [nextX, nextY], parent: pointKey(x, y) });
      queue.push([nextX, nextY]);
    }
  }
  return null;
};

const bfsAllGoalAnchors = (model, blockId, goal, maxGoals = 24) => {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return [];
  const startKey = pointKey(block.x, block.y);
  const nodes = new Map([[startKey, { point: [block.x, block.y], parent: null }]]);
  const queue = [[block.x, block.y]];
  const goals = [];
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    const match = goal(x, y);
    if (match) {
      goals.push({
        path: reconstructPath(nodes, pointKey(x, y)),
        point: [x, y],
        match,
        explored: nodes.size,
      });
      if (goals.length >= maxGoals) break;
    }
    for (const [dx, dy] of movementDirections(block)) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = pointKey(nextX, nextY);
      if (nodes.has(key) || !model.canPlace(block, nextX, nextY)) continue;
      nodes.set(key, { point: [nextX, nextY], parent: pointKey(x, y) });
      queue.push([nextX, nextY]);
    }
  }
  return goals;
};

const footprintBounds = (block, x, y) => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  return {
    minX: Math.min(...cells.map(([cellX]) => cellX)),
    maxX: Math.max(...cells.map(([cellX]) => cellX)),
    minY: Math.min(...cells.map(([, cellY]) => cellY)),
    maxY: Math.max(...cells.map(([, cellY]) => cellY)),
  };
};

const axisAllowsSide = (block, side) => block.movementAxis === "horizontal"
  ? side === "left" || side === "right"
  : block.movementAxis === "vertical"
    ? side === "top" || side === "bottom"
    : true;

// Match PuzzleModel.exitAttemptStatus exactly: the first covering gate on a
// side owns the attempt, even if a later overlapping descriptor would match.
const authoritativeExitSideAt = (snapshot, block, x, y, preferredSide) => {
  const bounds = footprintBounds(block, x, y);
  const sides = [preferredSide, "top", "right", "bottom", "left"]
    .filter((side, index, all) => side && all.indexOf(side) === index);
  for (const side of sides) {
    if (!axisAllowsSide(block, side)) continue;
    const atEdge = side === "top" ? bounds.minY === 0
      : side === "bottom" ? bounds.maxY === snapshot.height - 1
        : side === "left" ? bounds.minX === 0
          : bounds.maxX === snapshot.width - 1;
    if (!atEdge) continue;
    const gate = snapshot.gates.find((candidate) => {
      if (candidate.side !== side) return false;
      return side === "top" || side === "bottom"
        ? bounds.minX >= candidate.offset && bounds.maxX < candidate.offset + candidate.size
        : bounds.minY >= candidate.offset && bounds.maxY < candidate.offset + candidate.size;
    });
    if (!gate) continue;
    const activeColor = block.layers?.[0] ?? block.color;
    if (gate.color !== activeColor || gate.frozen > 0) continue;
    if (block.star && !gate.star) continue;
    return side;
  }
  return null;
};

const readyGateExists = (snapshot, block) => {
  const activeColor = block.layers?.[0] ?? block.color;
  return snapshot.gates.some((gate) => (
    axisAllowsSide(block, gate.side)
    && gate.color === activeColor
    && gate.frozen <= 0
    && (!block.star || gate.star)
  ));
};

const inactiveReason = (model, blockId) => {
  const snapshot = model.snapshot();
  if (snapshot.queuedBlocks.some((block) => block.id === blockId)) return "queued_waiting";
  const block = model.getBlock(blockId);
  if (!block) return "missing_block";
  if (block.frozen > 0) return "frozen_waiting";
  if (block.lockedBy) return "locked_waiting";
  if (block.shutterId && snapshot.shutters.some((shutter) => shutter.id === block.shutterId && shutter.count > 0)) {
    return "covered_waiting";
  }
  return "inactive_block";
};

const tryDynamicExits = (model, action) => {
  const block = model.getBlock(action.blockId);
  if (!block || !model.isBlockActive(block)) {
    return { candidates: [], failure: { ok: false, reason: inactiveReason(model, action.blockId) } };
  }
  const snapshot = model.snapshot();
  let reached = bfsAllGoalAnchors(
    model,
    block.id,
    (x, y) => authoritativeExitSideAt(snapshot, block, x, y, action.exitSide),
  );
  if (!reached.length) {
    return {
      candidates: [],
      failure: { ok: false, reason: readyGateExists(snapshot, block) ? "no_reachable_gate" : "no_ready_gate" },
    };
  }
  // Once the block is removed, different anchors on the same side produce the
  // same structural state. A shell carrier remains on the chosen anchor, so
  // retain every reachable anchor for the next differently coloured layer.
  if (block.layers.length <= 1) {
    const seenSides = new Set();
    reached = reached.filter((entry) => {
      if (seenSides.has(entry.match)) return false;
      seenSides.add(entry.match);
      return true;
    });
  }
  const candidates = [];
  const rejected = [];
  for (const destination of reached) {
    const trial = model.clone();
    const event = {
      type: "drag",
      blockId: block.id,
      path: destination.path,
      exitSide: destination.match,
      purpose: block.layers.length > 1 ? "dynamic-shell-layer-exit" : "dynamic-final-exit",
    };
    const beforeLayers = block.layers.length;
    const applied = executeDrag(trial, event);
    if (!applied.ok) {
      rejected.push(applied.error);
      continue;
    }
    candidates.push({
      ok: true,
      model: trial,
      event,
      advanceCursor: !trial.getBlock(block.id),
      priority: 1_000_000 + (trial.getBlock(block.id) ? 0 : 100_000)
        + (destination.match === action.exitSide ? 1_000 : 0) - destination.path.length,
      delta: {
        dynamicExit: 1,
        shellLayerExit: beforeLayers > 1 ? 1 : 0,
        exitBfsAnchors: destination.explored,
      },
    });
  }
  return {
    candidates,
    failure: candidates.length ? null : {
      ok: false,
      reason: "dynamic_exit_replay_rejected",
      detail: rejected.join("; "),
    },
  };
};

const applyOriginalPath = (model, action) => {
  const trial = model.clone();
  const event = { type: "drag", blockId: action.blockId, path: clone(action.path ?? []), purpose: "original-no-exit" };
  const applied = executeDrag(trial, event);
  return applied.ok ? { trial, event } : null;
};

const tryFixedNoExit = (model, action) => {
  const block = model.getBlock(action.blockId);
  if (!block || !model.isBlockActive(block)) return { ok: false, reason: inactiveReason(model, action.blockId) };
  if ((action.path ?? []).length) {
    const exact = applyOriginalPath(model, action);
    if (exact) {
      return {
        ok: true,
        model: exact.trial,
        event: exact.event,
        advanceCursor: true,
        priority: 10_000 - (action.originalIndex ?? 0),
        delta: { originalNoExit: 1 },
      };
    }
  }
  const endpoint = action.path?.at(-1);
  if (!endpoint || (endpoint[0] === block.x && endpoint[1] === block.y)) {
    return {
      ok: true,
      model,
      event: null,
      advanceCursor: true,
      priority: 2_000_000,
      delta: { redundantNoExit: 1 },
    };
  }
  const reached = bfsAnchors(model, block.id, (x, y) => x === endpoint[0] && y === endpoint[1]);
  if (!reached) return { ok: false, reason: "fixed_endpoint_unreachable" };
  const trial = model.clone();
  const event = {
    type: "drag",
    blockId: block.id,
    path: reached.path,
    purpose: "replanned-no-exit-endpoint",
  };
  const applied = executeDrag(trial, event);
  if (!applied.ok) return { ok: false, reason: "fixed_endpoint_replay_rejected", detail: applied.error };
  return {
    ok: true,
    model: trial,
    event,
    advanceCursor: true,
    priority: 9_000 - (action.originalIndex ?? 0) - reached.path.length,
    delta: { replannedNoExit: 1, noExitBfsAnchors: reached.explored },
  };
};

const meaningfulGeneratorProgress = (before, after) => {
  if (after.queuedBlocks.length < before.queuedBlocks.length) return true;
  return after.generators.some((generator) => {
    const previous = before.generators.find((candidate) => candidate.id === generator.id);
    return previous && generator.head > previous.head;
  });
};

const generatorTriggerCandidates = (model) => {
  const before = model.snapshot();
  if (!before.generators.some((generator) => (generator.trigger ?? "move") === "move" && generator.remaining > 0)) return [];
  const candidates = [];
  for (const originalBlock of [...before.blocks].sort((left, right) => left.id.localeCompare(right.id))) {
    const liveBlock = model.getBlock(originalBlock.id);
    if (!liveBlock || !model.isBlockActive(liveBlock)) continue;
    for (const [dx, dy] of movementDirections(liveBlock)) {
      const nextX = liveBlock.x + dx;
      const nextY = liveBlock.y + dy;
      if (!model.canPlace(liveBlock, nextX, nextY)) continue;
      const trial = model.clone();
      trial.beginAction();
      if (!trial.moveBlockStep(liveBlock.id, nextX, nextY)
        || !trial.moveBlockStep(liveBlock.id, liveBlock.x, liveBlock.y)
        || !trial.commitAction()) continue;
      if (!meaningfulGeneratorProgress(before, trial.snapshot())) continue;
      candidates.push({
        ok: true,
        model: trial,
        event: {
          type: "drag",
          blockId: liveBlock.id,
          path: [[nextX, nextY], [liveBlock.x, liveBlock.y]],
          purpose: "move-generator-depart-return-trigger",
        },
        advanceCursor: false,
        // Releasing a queued block early is often a hard deadline rather than
        // optional progress: numeric ice does not thaw while still queued.
        // Rank a proven release ahead of ordinary exits; fresh replay remains
        // the authority, so an unnecessary trigger is harmless but delaying a
        // high-count frozen head can make a solvable level impossible.
        priority: 1_500_000,
        delta: { generatorTriggers: 1 },
      });
      break;
    }

    // A depart-return cannot release a head when this very block overlaps the
    // generator spawn after returning.  Search bounded one-way anchors and
    // retain only moves that demonstrably advance a generator in PuzzleModel.
    const originX = liveBlock.x;
    const originY = liveBlock.y;
    const snapshot = model.snapshot();
    const anchors = bfsAllGoalAnchors(
      model,
      liveBlock.id,
      (x, y) => x !== originX || y !== originY,
      24,
    );
    for (const anchor of anchors) {
      if (!anchor.path.length || authoritativeExitSideAt(snapshot, liveBlock, anchor.point[0], anchor.point[1], null)) {
        continue;
      }
      const trial = model.clone();
      const event = {
        type: "drag",
        blockId: liveBlock.id,
        path: anchor.path,
        purpose: "move-generator-unblock-reposition-trigger",
      };
      const applied = executeDrag(trial, event);
      if (!applied.ok || !meaningfulGeneratorProgress(before, trial.snapshot())) continue;
      candidates.push({
        ok: true,
        model: trial,
        event,
        advanceCursor: false,
        priority: 1_600_000 - anchor.path.length,
        delta: { generatorTriggers: 1, generatorUnblockRepositions: 1 },
      });
    }
  }
  return candidates;
};

const syntheticRepositionCandidates = (model, heads) => {
  const snapshot = model.snapshot();
  const headByBlock = new Map(heads.map((head) => [head.blockId, head.action]));
  const desiredCells = new Set();
  for (const head of heads) {
    if (head.action.dynamicTerminalExit || head.action.exitSide) continue;
    const endpoint = head.action.path?.at(-1);
    const target = [...snapshot.blocks, ...snapshot.queuedBlocks].find((block) => block.id === head.blockId);
    if (!endpoint || !target) continue;
    for (const [dx, dy] of target.shape) desiredCells.add(pointKey(endpoint[0] + dx, endpoint[1] + dy));
  }

  const preliminary = [];
  for (const originalBlock of [...snapshot.blocks].sort((left, right) => left.id.localeCompare(right.id))) {
    const block = model.getBlock(originalBlock.id);
    if (!block || !model.isBlockActive(block)) continue;
    const startKey = pointKey(block.x, block.y);
    const reached = new Map([[startKey, { point: [block.x, block.y], parent: null }]]);
    const queue = [[block.x, block.y]];
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index];
      for (const [dx, dy] of movementDirections(block)) {
        const nextX = x + dx;
        const nextY = y + dy;
        const key = pointKey(nextX, nextY);
        if (reached.has(key) || !model.canPlace(block, nextX, nextY)) continue;
        reached.set(key, { point: [nextX, nextY], parent: pointKey(x, y) });
        queue.push([nextX, nextY]);
      }
    }

    const beforeCells = new Set(block.shape.map(([dx, dy]) => pointKey(block.x + dx, block.y + dy)));
    const ownHead = headByBlock.get(block.id);
    const ownEndpoint = ownHead && !ownHead.dynamicTerminalExit && !ownHead.exitSide
      ? ownHead.path?.at(-1)
      : null;
    const ownDistanceBefore = ownEndpoint
      ? Math.abs(block.x - ownEndpoint[0]) + Math.abs(block.y - ownEndpoint[1])
      : 0;
    const blockOptions = [];
    for (const [key, entry] of reached) {
      if (key === startKey) continue;
      const [nextX, nextY] = entry.point;
      // A no-exit reposition ending on a live matching exit would be consumed
      // by the held-edge gameplay rule, so never publish that artificial pose.
      if (authoritativeExitSideAt(snapshot, block, nextX, nextY, null)) continue;
      const path = reconstructPath(reached, key);
      const afterCells = new Set(block.shape.map(([dx, dy]) => pointKey(nextX + dx, nextY + dy)));
      const vacatedDesired = [...beforeCells]
        .filter((cell) => desiredCells.has(cell) && !afterCells.has(cell)).length;
      const ownDistanceGain = ownEndpoint
        ? ownDistanceBefore - (Math.abs(nextX - ownEndpoint[0]) + Math.abs(nextY - ownEndpoint[1]))
        : 0;
      const displacement = Math.abs(nextX - block.x) + Math.abs(nextY - block.y);
      blockOptions.push({
        block,
        point: [nextX, nextY],
        path,
        cheapScore: vacatedDesired * 5_000 + ownDistanceGain * 500 + displacement * 2 - path.length,
      });
    }
    blockOptions.sort((left, right) => right.cheapScore - left.cheapScore
      || left.path.length - right.path.length
      || pointKey(...left.point).localeCompare(pointKey(...right.point)));
    // Keep several strategic anchors per block rather than every grid cell.
    // Include the farthest reachable anchor as an escape-space candidate even
    // when it is not near an authored parking target.
    const selected = blockOptions.slice(0, 6);
    const farthest = [...blockOptions].sort((left, right) => right.path.length - left.path.length)[0];
    if (farthest && !selected.some((entry) => pointKey(...entry.point) === pointKey(...farthest.point))) selected.push(farthest);
    preliminary.push(...selected);
  }

  preliminary.sort((left, right) => right.cheapScore - left.cheapScore
    || left.path.length - right.path.length
    || left.block.id.localeCompare(right.block.id));
  const candidates = [];
  for (let optionIndex = 0; optionIndex < Math.min(80, preliminary.length); optionIndex += 1) {
    const option = preliminary[optionIndex];
    const { block, path } = option;
    const trial = model.clone();
    const event = {
      type: "drag",
      blockId: block.id,
      path,
      purpose: "synthetic-deadlock-reposition",
    };
    const applied = executeDrag(trial, event);
    if (!applied.ok) continue;

      // Prefer a move that immediately makes one of the preserved action heads
      // executable. This is only an ordering heuristic; the DFS and fresh
      // replay remain authoritative.
    let releasedHeads = 0;
    if (optionIndex < 24) {
      for (const head of heads.slice(0, 6)) {
        const probe = head.action.dynamicTerminalExit || head.action.exitSide
          ? { ok: tryDynamicExits(trial, { ...head.action, blockId: head.blockId }).candidates.length > 0 }
          : tryFixedNoExit(trial, { ...head.action, blockId: head.blockId });
        if (probe.ok) releasedHeads += 1;
      }
    }
    candidates.push({
      ok: true,
      model: trial,
      event,
      advanceCursor: false,
      priority: 500 + option.cheapScore + releasedHeads * 20_000,
      delta: { syntheticRepositions: 1 },
    });
  }
  return candidates;
};

const structuralWorldSignature = (model) => {
  const snapshot = model.snapshot();
  const sorted = (items) => [...items].sort((left, right) => left.id.localeCompare(right.id));
  return JSON.stringify({
    gates: sorted(snapshot.gates).map((gate) => [gate.id, gate.frozen]),
    blocks: sorted(snapshot.blocks).map((block) => [
      block.id, block.x, block.y, block.layers, block.frozen, block.shutterId ?? null,
      block.lockedBy ?? null, block.lockCount ?? 0,
    ]),
    queued: sorted(snapshot.queuedBlocks).map((block) => [
      block.id, block.layers, block.frozen, block.shutterId ?? null, block.lockedBy ?? null, block.lockCount ?? 0,
    ]),
    shutters: sorted(snapshot.shutters).map((shutter) => [shutter.id, shutter.count]),
    generators: sorted(snapshot.generators).map((generator) => [
      generator.id, generator.head, generator.remaining, generator.nextBlockId ?? null,
      roundSeconds(generator.elapsed),
    ]),
    elevators: sorted(snapshot.elevators).map((elevator) => [
      elevator.id, elevator.x, elevator.y, elevator.direction, roundSeconds(elevator.elapsed),
    ]),
    cleared: snapshot.cleared,
    complete: snapshot.complete,
    failed: snapshot.failed,
  });
};

const autonomousWaitCandidates = (model) => {
  const snapshot = model.snapshot();
  const deltas = [];
  for (const generator of snapshot.generators) {
    if (generator.trigger !== "time" || generator.remaining <= 0) continue;
    const interval = generator.intervalSeconds ?? 1;
    const threshold = generator.head === 0 ? generator.initialDelaySeconds ?? interval : interval;
    deltas.push(Math.max(0, threshold - generator.elapsed));
  }
  for (const elevator of snapshot.elevators) deltas.push(Math.max(0, elevator.periodSeconds - elevator.elapsed));
  const unique = [...new Set(deltas.map(roundSeconds))].sort((left, right) => left - right);
  const beforeSignature = structuralWorldSignature(model);
  const candidates = [];
  for (const seconds of unique) {
    if (seconds > snapshot.remainingSeconds) continue;
    const trial = model.clone();
    const movedBefore = trial.snapshot().moves;
    trial.tick(seconds);
    const after = trial.snapshot();
    if (after.failed || after.moves !== movedBefore || structuralWorldSignature(trial) === beforeSignature) continue;
    const generatorChanged = meaningfulGeneratorProgress(snapshot, after);
    candidates.push({
      ok: true,
      model: trial,
      event: {
        type: "wait",
        seconds,
        costMoves: 0,
        purpose: generatorChanged ? "timed-feeder-release" : "autonomous-device-advance",
      },
      advanceCursor: false,
      priority: generatorChanged ? 1_500 : 1_000,
      delta: { waits: 1, waitedSeconds: seconds, timedFeederWaits: generatorChanged ? 1 : 0 },
    });
  }
  return candidates;
};

const gateCanEventuallyAcceptLayer = (gate, block, color) => {
  if (gate.color !== color || !axisAllowsSide(block, gate.side)) return false;
  if (block.star && !gate.star) return false;
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  return gate.side === "top" || gate.side === "bottom"
    ? width <= gate.size
    : height <= gate.size;
};

// Necessary-only feasibility bound.  It deliberately ignores occupancy,
// shutters, locks, numeric ice, generator placement and shell order, so it can
// never reject a puzzle merely because the relaxed model was too strict.  If
// even this over-approximation cannot accumulate enough clears to thaw the
// next colour gate (or a layer has no axis/size-compatible gate at all), no
// legal runtime route can complete the actual puzzle.
const relaxedGateCapacityAudit = (model) => {
  const snapshot = model.snapshot();
  const layerItems = [...snapshot.blocks, ...snapshot.queuedBlocks].flatMap((block) => (
    block.layers.map((color, layerIndex) => ({ block, color, layerIndex }))
  ));
  let maximumClearableLayers = 0;
  let previous = -1;
  while (maximumClearableLayers !== previous) {
    previous = maximumClearableLayers;
    maximumClearableLayers = layerItems.filter(({ block, color }) => snapshot.gates.some((gate) => (
      gate.frozen <= previous && gateCanEventuallyAcceptLayer(gate, block, color)
    ))).length;
  }
  const unreachable = layerItems.filter(({ block, color }) => !snapshot.gates.some((gate) => (
    gate.frozen <= maximumClearableLayers && gateCanEventuallyAcceptLayer(gate, block, color)
  )));
  return {
    feasible: maximumClearableLayers >= layerItems.length,
    total_layers_remaining: layerItems.length,
    relaxed_maximum_clearable_layers: maximumClearableLayers,
    unreachable_layers: unreachable.map(({ block, color, layerIndex }) => ({
      block_id: block.id,
      layer_index: layerIndex,
      color,
      movement_axis: block.movementAxis ?? null,
    })),
  };
};

// Necessary-only bound for a frozen move-generator head. Queued blocks do not
// thaw in PuzzleModel. If the head cannot materialise until C clears, needs F
// further clears after spawning, and at most A non-queued layers remain, then
// A < F is a proof of impossibility whenever the head also occupies the spawn
// footprint needed by every queued tail. Occupancy, gates, covers and routing
// are otherwise ignored, making A an intentionally generous upper bound.
const queuedFrozenHeadCapacityAudit = (model) => {
  const snapshot = model.snapshot();
  const liveMoveGenerators = snapshot.generators.filter((generator) => (
    (generator.trigger ?? "move") === "move" && generator.remaining > 0 && generator.nextBlockId
  ));
  if (liveMoveGenerators.length !== 1) return { feasible: true, applicable: false };
  const generator = liveMoveGenerators[0];
  const head = snapshot.queuedBlocks.find((block) => block.id === generator.nextBlockId);
  if (!head || head.frozen <= 0) return { feasible: true, applicable: false };

  const cellsAtSpawn = (block) => new Set(block.shape.map(([dx, dy]) => (
    pointKey(generator.spawn[0] + dx, generator.spawn[1] + dy)
  )));
  const headCells = cellsAtSpawn(head);
  const tails = snapshot.queuedBlocks.filter((block) => block.id !== head.id
    && generator.queueBlockIds.includes(block.id));
  const everyTailBlockedByHead = tails.every((tail) => (
    [...cellsAtSpawn(tail)].some((cell) => headCells.has(cell))
  ));
  if (!everyTailBlockedByHead) return { feasible: true, applicable: false };

  const blockers = snapshot.blocks.filter((block) => block.shape.some(([dx, dy]) => (
    headCells.has(pointKey(block.x + dx, block.y + dy))
  )));
  // Ignoring every constraint except an explicit numeric freeze can only make
  // the spawn earlier, so this remains a valid lower bound.
  const earliestSpawnClearsLowerBound = Math.max(0, ...blockers.map((block) => block.frozen ?? 0));
  const nonQueuedLayers = snapshot.blocks.reduce((sum, block) => sum + block.layers.length, 0);
  const maximumOtherClearsAfterEarliestSpawn = Math.max(0, nonQueuedLayers - earliestSpawnClearsLowerBound);
  const feasible = maximumOtherClearsAfterEarliestSpawn >= head.frozen;
  return {
    feasible,
    applicable: true,
    generator_id: generator.id,
    head_block_id: head.id,
    head_frozen_value: head.frozen,
    queued_tail_block_ids: tails.map((block) => block.id),
    head_blocks_every_queued_tail_spawn: everyTailBlockedByHead,
    initial_spawn_footprint_blockers: blockers.map((block) => ({
      block_id: block.id,
      frozen_value: block.frozen,
    })),
    earliest_spawn_after_cleared_layers_lower_bound: earliestSpawnClearsLowerBound,
    non_queued_clear_layers_total: nonQueuedLayers,
    maximum_other_clears_after_earliest_spawn: maximumOtherClearsAfterEarliestSpawn,
    thaw_deficit_layers: Math.max(0, head.frozen - maximumOtherClearsAfterEarliestSpawn),
  };
};

const buildActionQueues = (level, originalEvents) => {
  const knownIds = new Set(level.blocks.map((block) => block.id));
  const byBlock = new Map();
  const unknownBlockIds = new Set();
  let ignoredInputWaits = 0;
  for (let originalIndex = 0; originalIndex < originalEvents.length; originalIndex += 1) {
    const event = originalEvents[originalIndex];
    if (isWaitEvent(event)) {
      ignoredInputWaits += 1;
      continue;
    }
    if (!event?.blockId || !knownIds.has(event.blockId)) {
      if (event?.blockId) unknownBlockIds.add(event.blockId);
      continue;
    }
    if (!byBlock.has(event.blockId)) byBlock.set(event.blockId, []);
    byBlock.get(event.blockId).push({ ...clone(event), originalIndex });
  }

  let appendedTerminalExits = 0;
  let droppedAfterTerminalExit = 0;
  for (const block of level.blocks) {
    const queue = byBlock.get(block.id) ?? [];
    const firstExit = queue.findIndex((action) => Boolean(action.exitSide));
    if (firstExit >= 0 && firstExit < queue.length - 1) {
      droppedAfterTerminalExit += queue.length - firstExit - 1;
      queue.splice(firstExit + 1);
    }
    if (!queue.some((action) => action.exitSide)) {
      queue.push({
        blockId: block.id,
        path: [],
        exitSide: null,
        dynamicTerminalExit: true,
        originalIndex: Number.MAX_SAFE_INTEGER,
      });
      appendedTerminalExits += 1;
    }
    byBlock.set(block.id, queue);
  }
  return {
    byBlock,
    normalization: {
      unknown_block_ids: [...unknownBlockIds].sort(),
      ignored_input_waits: ignoredInputWaits,
      appended_terminal_exits: appendedTerminalExits,
      dropped_actions_after_terminal_exit: droppedAfterTerminalExit,
    },
  };
};

const remainingQueueHeads = (queues, cursors) => [...queues.entries()]
  .map(([blockId, queue]) => ({ blockId, action: queue[cursors.get(blockId) ?? 0] }))
  .filter((entry) => entry.action)
  .sort((left, right) => (
    (left.action.originalIndex ?? Number.MAX_SAFE_INTEGER) - (right.action.originalIndex ?? Number.MAX_SAFE_INTEGER)
    || left.blockId.localeCompare(right.blockId)
  ));

const cursorsSignature = (queues, cursors) => JSON.stringify([...queues.keys()].sort()
  .map((id) => [id, cursors.get(id) ?? 0]));

const mergeDelta = (totals, delta) => {
  const next = { ...totals };
  for (const [key, value] of Object.entries(delta ?? {})) next[key] = (next[key] ?? 0) + value;
  return next;
};

const summarizeDeadReasons = (failures) => {
  const counts = {};
  for (const failure of failures) counts[failure.reason] = (counts[failure.reason] ?? 0) + 1;
  return counts;
};

const primaryFailureCategory = (best, capped, timedOut) => {
  if (timedOut) return "time_cap";
  if (capped) return "state_cap";
  const reasons = best?.reason_counts ?? {};
  const priority = [
    "no_reachable_gate", "fixed_endpoint_unreachable", "no_ready_gate", "move_generator_blocked",
    "timed_generator_blocked", "frozen_waiting", "locked_waiting", "covered_waiting",
    "queued_waiting", "missing_block", "incomplete_no_pending_action",
  ];
  return priority.find((reason) => reasons[reason])
    ?? Object.entries(reasons).sort((left, right) => right[1] - left[1])[0]?.[0]
    ?? "search_exhausted";
};

const repairLevel = (level, originalEvents, limits) => {
  const { byBlock: queues, normalization } = buildActionQueues(level, originalEvents);
  const initialCursors = new Map([...queues.keys()].map((id) => [id, 0]));
  const memo = new Set();
  const startedAt = Date.now();
  let exploredStates = 0;
  let capped = false;
  let timedOut = false;
  let best = null;

  const captureBest = (model, cursors, failures, eventCount) => {
    const snapshot = model.snapshot();
    const pending = remainingQueueHeads(queues, cursors);
    const score = snapshot.cleared * 1_000_000 - (snapshot.blocks.length + snapshot.queuedBlocks.length) * 10_000
      - pending.length * 100 - eventCount;
    if (best && best.score >= score) return;
    best = {
      score,
      cleared: snapshot.cleared,
      board_blocks_remaining: snapshot.blocks.length,
      queued_blocks_remaining: snapshot.queuedBlocks.length,
      pending_action_heads: pending.map((entry) => ({
        block_id: entry.blockId,
        kind: entry.action.dynamicTerminalExit || entry.action.exitSide ? "exit" : "fixed_no_exit",
      })),
      reason_counts: summarizeDeadReasons(failures),
    };
  };

  const visit = (model, cursors, events, totals, stagnantRepositions = 0) => {
    if (exploredStates >= limits.maxStates) {
      capped = true;
      return null;
    }
    if (Date.now() - startedAt >= limits.maxMilliseconds) {
      timedOut = true;
      return null;
    }
    exploredStates += 1;
    const heads = remainingQueueHeads(queues, cursors);
    const snapshot = model.snapshot();
    if (snapshot.complete && heads.length === 0) return { events, totals };
    if (snapshot.failed) return null;
    if (snapshot.complete && heads.length > 0) {
      captureBest(model, cursors, heads.map(() => ({ reason: "missing_block" })), events.length);
      return null;
    }
    if (!heads.length) {
      captureBest(model, cursors, [{ reason: "incomplete_no_pending_action" }], events.length);
      return null;
    }

    const signature = `${structuralWorldSignature(model)};cursors:${cursorsSignature(queues, cursors)}`;
    if (memo.has(signature)) return null;
    memo.add(signature);

    const failures = [];
    const candidates = [];
    for (const { blockId, action } of heads) {
      if (action.dynamicTerminalExit || action.exitSide) {
        const exits = tryDynamicExits(model, { ...action, blockId });
        if (!exits.candidates.length) failures.push(exits.failure);
        else candidates.push(...exits.candidates.map((candidate) => ({ ...candidate, blockId })));
      } else {
        const candidate = tryFixedNoExit(model, { ...action, blockId });
        if (!candidate.ok) failures.push(candidate);
        else candidates.push({ ...candidate, blockId });
      }
    }
    candidates.push(...generatorTriggerCandidates(model).map((candidate) => ({ ...candidate, blockId: null })));
    candidates.push(...autonomousWaitCandidates(model).map((candidate) => ({ ...candidate, blockId: null })));
    if (!candidates.length && stagnantRepositions < 24) {
      candidates.push(...syntheticRepositionCandidates(model, heads).map((candidate) => ({ ...candidate, blockId: null })));
    }
    candidates.sort((left, right) => right.priority - left.priority
      || (left.event?.path?.length ?? 0) - (right.event?.path?.length ?? 0)
      || String(left.blockId ?? "").localeCompare(String(right.blockId ?? "")));

    if (!candidates.length) {
      const generators = snapshot.generators.filter((generator) => generator.remaining > 0);
      if (generators.some((generator) => (generator.trigger ?? "move") === "move")) {
        failures.push({ reason: "move_generator_blocked" });
      }
      if (generators.some((generator) => generator.trigger === "time")) {
        failures.push({ reason: "timed_generator_blocked" });
      }
      captureBest(model, cursors, failures, events.length);
      return null;
    }

    for (const candidate of candidates) {
      const nextCursors = new Map(cursors);
      if (candidate.blockId && candidate.advanceCursor) {
        nextCursors.set(candidate.blockId, (nextCursors.get(candidate.blockId) ?? 0) + 1);
      }
      const nextEvents = candidate.event ? [...events, candidate.event] : events;
      const nextStagnation = candidate.event?.purpose === "synthetic-deadlock-reposition"
        ? stagnantRepositions + 1
        : 0;
      const solved = visit(
        candidate.model,
        nextCursors,
        nextEvents,
        mergeDelta(totals, candidate.delta),
        nextStagnation,
      );
      if (solved) return solved;
      if (capped || timedOut) return null;
    }
    captureBest(model, cursors, failures, events.length);
    return null;
  };

  const model = new PuzzleModel(level);
  const found = visit(model, initialCursors, [], {});
  if (!found) {
    return {
      ok: false,
      events: [],
      exploredStates,
      elapsedMilliseconds: Date.now() - startedAt,
      capped,
      timedOut,
      failureCategory: primaryFailureCategory(best, capped, timedOut),
      best,
      normalization,
    };
  }
  const independentReplay = replayEvents(level, found.events);
  if (!independentReplay.ok) {
    return {
      ok: false,
      events: [],
      exploredStates,
      elapsedMilliseconds: Date.now() - startedAt,
      capped,
      timedOut,
      failureCategory: "independent_replay_failed",
      replayError: independentReplay.error,
      best,
      normalization,
    };
  }
  return {
    ok: true,
    events: found.events,
    drags: found.events.filter((event) => !isWaitEvent(event)).map((event) => {
      const drag = asDragEvent(event);
      delete drag.type;
      return drag;
    }),
    exploredStates,
    elapsedMilliseconds: Date.now() - startedAt,
    capped,
    timedOut,
    independentReplay,
    counters: found.totals,
    normalization,
  };
};

/**
 * Second-stage completion search which intentionally has no dependency on an
 * authored/base route.  The first repair phase is useful when most of a route
 * remains valid, but its per-block action queues can become actively harmful
 * after a mechanism carrier changes: an obsolete parking endpoint can prevent
 * the live, immediately-clearable block from ever being considered.
 *
 * This fallback starts from a fresh PuzzleModel and derives every action from
 * the current runtime state.  Original events are accepted only so the audit
 * can state how many stale constraints were discarded; they never influence
 * candidate selection or ordering.
 */
const repairLevelRouteFree = (level, originalEvents, limits) => {
  const memo = new Set();
  const startedAt = Date.now();
  let exploredStates = 0;
  let capped = false;
  let timedOut = false;
  let best = null;

  const discardedNonExitConstraints = originalEvents.filter((event) => (
    !isWaitEvent(event) && !event?.exitSide && (event?.path?.length ?? 0) > 0
  )).length;
  const discardedExitHints = originalEvents.filter((event) => !isWaitEvent(event) && event?.exitSide).length;
  const discardedWaitHints = originalEvents.filter(isWaitEvent).length;
  const generatorBlockIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));

  const dynamicHeads = (snapshot) => [...snapshot.blocks]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((block) => ({
      blockId: block.id,
      action: {
        blockId: block.id,
        path: [],
        exitSide: null,
        dynamicTerminalExit: true,
        originalIndex: Number.MAX_SAFE_INTEGER,
      },
    }));

  const captureBest = (model, failures, eventCount) => {
    const snapshot = model.snapshot();
    const activeBlocks = snapshot.blocks.filter((block) => {
      const live = model.getBlock(block.id);
      return Boolean(live && model.isBlockActive(live));
    });
    const score = snapshot.cleared * 1_000_000
      - (snapshot.blocks.length + snapshot.queuedBlocks.length) * 10_000
      + activeBlocks.length * 10
      - eventCount;
    if (best && best.score >= score) return;
    best = {
      score,
      cleared: snapshot.cleared,
      board_blocks_remaining: snapshot.blocks.length,
      queued_blocks_remaining: snapshot.queuedBlocks.length,
      active_blocks_remaining: activeBlocks.length,
      remaining_blocks: snapshot.blocks.map((block) => ({
        id: block.id,
        x: block.x,
        y: block.y,
        color: block.layers?.[0] ?? block.color,
        layers: block.layers,
        frozen: block.frozen,
        movement_axis: block.movementAxis ?? null,
      })),
      gate_state: snapshot.gates.map((gate) => ({
        id: gate.id,
        side: gate.side,
        offset: gate.offset,
        size: gate.size,
        color: gate.color,
        frozen: gate.frozen,
      })),
      reason_counts: summarizeDeadReasons(failures),
    };
  };

  const visit = (model, events, totals, stagnantRepositions = 0) => {
    if (exploredStates >= limits.maxStates) {
      capped = true;
      return null;
    }
    if (Date.now() - startedAt >= limits.maxMilliseconds) {
      timedOut = true;
      return null;
    }
    exploredStates += 1;
    const snapshot = model.snapshot();
    if (snapshot.complete) return { events, totals };
    if (snapshot.failed) return null;

    // Route-free states deliberately omit cursors: reaching the same runtime
    // world by a different sequence gives no additional future capability.
    const signature = structuralWorldSignature(model);
    if (memo.has(signature)) return null;
    memo.add(signature);

    const heads = dynamicHeads(snapshot);
    const failures = [];
    const exits = [];
    for (const { blockId, action } of heads) {
      const result = tryDynamicExits(model, action);
      if (result.candidates.length) {
        exits.push(...result.candidates.map((candidate) => ({
          ...candidate,
          blockId,
          // Once a generated block occupies its spawn, clearing it is the only
          // way to admit the next queued item.  Prefer that monotonic release
          // as soon as the block becomes active (especially after numeric ice
          // thaws) instead of exhausting permutations of unrelated exits.
          priority: candidate.priority + 100_000 + (generatorBlockIds.has(blockId) ? 500_000 : 0),
          delta: mergeDelta(candidate.delta, { routeFreeDynamicExits: 1 }),
        })));
      } else if (result.failure) {
        failures.push(result.failure);
      }
    }

    const candidates = [
      ...exits,
      ...generatorTriggerCandidates(model).map((candidate) => ({
        ...candidate,
        blockId: null,
        delta: mergeDelta(candidate.delta, { routeFreeGeneratorEvents: 1 }),
      })),
      ...autonomousWaitCandidates(model).map((candidate) => ({
        ...candidate,
        blockId: null,
        delta: mergeDelta(candidate.delta, { routeFreeWaitEvents: 1 }),
      })),
    ];

    // A temporary parking move may be required even while another block can
    // exit: taking that exit first can strand a shell layer or axis block.  Add
    // a bounded set after the exit candidates so DFS tries monotonic progress
    // first, then backtracks into live-state repositions when necessary.
    if (stagnantRepositions < 24) {
      const repositionLimit = exits.length ? 16 : 64;
      const repositions = syntheticRepositionCandidates(model, heads)
        .slice(0, repositionLimit)
        .map((candidate) => ({
          ...candidate,
          blockId: null,
          event: candidate.event ? {
            ...candidate.event,
            purpose: "route-free-deadlock-reposition",
          } : null,
          delta: mergeDelta(candidate.delta, { routeFreeRepositions: 1 }),
        }));
      candidates.push(...repositions);
    }

    candidates.sort((left, right) => right.priority - left.priority
      || (left.event?.path?.length ?? 0) - (right.event?.path?.length ?? 0)
      || String(left.event?.blockId ?? "").localeCompare(String(right.event?.blockId ?? "")));

    if (!candidates.length) {
      const generators = snapshot.generators.filter((generator) => generator.remaining > 0);
      if (generators.some((generator) => (generator.trigger ?? "move") === "move")) {
        failures.push({ reason: "move_generator_blocked" });
      }
      if (generators.some((generator) => generator.trigger === "time")) {
        failures.push({ reason: "timed_generator_blocked" });
      }
      if (!heads.length) failures.push({ reason: "incomplete_no_pending_action" });
      captureBest(model, failures, events.length);
      return null;
    }

    for (const candidate of candidates) {
      const nextEvents = candidate.event ? [...events, candidate.event] : events;
      const nextStagnation = candidate.event?.purpose === "route-free-deadlock-reposition"
        ? stagnantRepositions + 1
        : 0;
      const solved = visit(
        candidate.model,
        nextEvents,
        mergeDelta(totals, candidate.delta),
        nextStagnation,
      );
      if (solved) return solved;
      if (capped || timedOut) return null;
    }
    captureBest(model, failures, events.length);
    return null;
  };

  const initialModel = new PuzzleModel(level);
  const relaxedCapacity = relaxedGateCapacityAudit(initialModel);
  if (!relaxedCapacity.feasible) {
    return {
      ok: false,
      events: [],
      exploredStates: 0,
      elapsedMilliseconds: Date.now() - startedAt,
      capped: false,
      timedOut: false,
      failureCategory: "relaxed_gate_capacity_impossible",
      best: {
        cleared: 0,
        board_blocks_remaining: initialModel.snapshot().blocks.length,
        queued_blocks_remaining: initialModel.snapshot().queuedBlocks.length,
        ...relaxedCapacity,
      },
      normalization: {
        route_free_fallback: true,
        discarded_non_exit_constraints: discardedNonExitConstraints,
        discarded_exit_side_hints: discardedExitHints,
        discarded_wait_hints: discardedWaitHints,
      },
    };
  }
  const queuedHeadCapacity = queuedFrozenHeadCapacityAudit(initialModel);
  if (!queuedHeadCapacity.feasible) {
    return {
      ok: false,
      events: [],
      exploredStates: 0,
      elapsedMilliseconds: Date.now() - startedAt,
      capped: false,
      timedOut: false,
      failureCategory: "queued_frozen_head_capacity_impossible",
      best: {
        cleared: 0,
        board_blocks_remaining: initialModel.snapshot().blocks.length,
        queued_blocks_remaining: initialModel.snapshot().queuedBlocks.length,
        ...queuedHeadCapacity,
      },
      normalization: {
        route_free_fallback: true,
        discarded_non_exit_constraints: discardedNonExitConstraints,
        discarded_exit_side_hints: discardedExitHints,
        discarded_wait_hints: discardedWaitHints,
      },
    };
  }

  const found = visit(initialModel, [], {
    routeFreeSearches: 1,
    discardedNonExitConstraints,
    discardedExitHints,
    discardedWaitHints,
  });
  const common = {
    exploredStates,
    elapsedMilliseconds: Date.now() - startedAt,
    capped,
    timedOut,
    normalization: {
      route_free_fallback: true,
      discarded_non_exit_constraints: discardedNonExitConstraints,
      discarded_exit_side_hints: discardedExitHints,
      discarded_wait_hints: discardedWaitHints,
    },
  };
  if (!found) {
    return {
      ok: false,
      events: [],
      ...common,
      failureCategory: primaryFailureCategory(best, capped, timedOut),
      best,
    };
  }
  const independentReplay = replayEvents(level, found.events);
  if (!independentReplay.ok) {
    return {
      ok: false,
      events: [],
      ...common,
      failureCategory: "route_free_independent_replay_failed",
      replayError: independentReplay.error,
      best,
    };
  }
  return {
    ok: true,
    source: "route-free-dynamic-puzzle-model-completion-witness-repair-v2",
    events: found.events,
    drags: found.events.filter((event) => !isWaitEvent(event)).map((event) => {
      const drag = asDragEvent(event);
      delete drag.type;
      return drag;
    }),
    ...common,
    independentReplay,
    counters: found.totals,
  };
};

// Deterministic randomized-greedy fallback. The exhaustive DFS above is the
// stronger search, but it can spend its complete budget enumerating equivalent
// early exit orders before it ever reaches a useful parking choice. Repeated
// fresh rollouts are intentionally memory bounded (one live model path and one
// per-rollout signature set) and vary only candidate ordering. Every resulting
// stream is still independently replayed before it can be published.
const repairLevelStochastic = (level, originalEvents, limits) => {
  const startedAt = Date.now();
  let attemptedRestarts = 0;
  let exploredStates = 0;
  let best = null;

  const seedFor = (restart) => {
    let seed = (Number(level.id) * 0x9E3779B1 + restart * 0x85EBCA6B) >>> 0;
    return () => {
      seed = (seed + 0x6D2B79F5) >>> 0;
      let value = seed;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  };

  const dynamicHeads = (snapshot) => [...snapshot.blocks]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((block) => ({
      blockId: block.id,
      action: { blockId: block.id, path: [], dynamicTerminalExit: true },
    }));

  const progressScore = (model, events) => {
    const snapshot = model.snapshot();
    const active = snapshot.blocks.filter((block) => {
      const live = model.getBlock(block.id);
      return live && model.isBlockActive(live);
    }).length;
    return snapshot.cleared * 1_000_000
      - (snapshot.blocks.length + snapshot.queuedBlocks.length) * 10_000
      + active * 10 - events.length;
  };

  const choose = (candidates, random, breadth, biasExponent = 3) => {
    const ranked = candidates
      .map((candidate) => {
        const after = candidate.model.snapshot();
        const remainingSameBlock = candidate.event?.blockId
          ? Boolean(candidate.model.getBlock(candidate.event.blockId))
          : true;
        return {
          candidate,
          score: after.cleared * 1_000_000
            - (after.blocks.length + after.queuedBlocks.length) * 10_000
            + (remainingSameBlock ? 0 : 50_000)
            + (candidate.priority ?? 0)
            - (candidate.event?.path?.length ?? 0),
        };
      })
      .sort((left, right) => right.score - left.score);
    const pool = ranked.slice(0, Math.max(1, Math.min(breadth, ranked.length)));
    // Cubing strongly favours the best candidate while retaining deterministic
    // diversity across restarts for the genuinely order-sensitive cases.
    return pool[Math.floor((random() ** biasExponent) * pool.length)].candidate;
  };

  for (let restart = 0; restart < limits.maxRestarts; restart += 1) {
    if (Date.now() - startedAt >= limits.maxMilliseconds) break;
    attemptedRestarts += 1;
    const random = seedFor(restart);
    let model = new PuzzleModel(level);
    let events = [];
    let totals = { stochasticRestarts: 1 };
    const seen = new Set();
    let consecutiveRepositions = 0;
    const maxEvents = Math.max(160, (level.blocks.length + (level.generators ?? []).reduce((sum, item) => sum + item.queueBlockIds.length, 0)) * 16);

    for (let step = 0; step < maxEvents; step += 1) {
      if (Date.now() - startedAt >= limits.maxMilliseconds) break;
      exploredStates += 1;
      const snapshot = model.snapshot();
      if (snapshot.complete) {
        const independentReplay = replayEvents(level, events);
        if (!independentReplay.ok) break;
        return {
          ok: true,
          source: "deterministic-stochastic-greedy-puzzle-model-completion-witness-v1",
          events,
          drags: events.filter((event) => !isWaitEvent(event)).map((event) => {
            const drag = asDragEvent(event);
            delete drag.type;
            return drag;
          }),
          exploredStates,
          elapsedMilliseconds: Date.now() - startedAt,
          capped: false,
          timedOut: false,
          independentReplay,
          counters: totals,
          normalization: {
            stochastic_fallback: true,
            attempted_restarts: attemptedRestarts,
            discarded_input_events: originalEvents.length,
          },
        };
      }
      if (snapshot.failed) break;
      const signature = structuralWorldSignature(model);
      if (seen.has(signature)) break;
      seen.add(signature);

      const heads = dynamicHeads(snapshot);
      const exits = [];
      for (const head of heads) {
        const result = tryDynamicExits(model, head.action);
        exits.push(...result.candidates);
      }
      const devices = [
        ...generatorTriggerCandidates(model),
        ...autonomousWaitCandidates(model),
      ];
      let candidates = exits;

      // Most exits are monotonic progress. Occasionally park first to avoid a
      // later spatial trap, and always park when no progress/device event exists.
      const considerParking = (!exits.length && !devices.length)
        || consecutiveRepositions === 0 && random() < Math.min(0.22, 0.04 + restart / Math.max(1, limits.maxRestarts) * 0.18);
      if (considerParking && consecutiveRepositions < 36) {
        const parking = syntheticRepositionCandidates(model, heads).slice(0, exits.length ? 18 : 64);
        candidates = [...candidates, ...parking];
      }
      if (!candidates.length) candidates = devices;
      else if (devices.length && (!exits.length || random() < 0.08)) candidates = [...candidates, ...devices];
      candidates = candidates.filter((candidate) => !seen.has(structuralWorldSignature(candidate.model)));
      if (!candidates.length) break;

      const chosen = choose(candidates, random, exits.length ? 10 : 64, exits.length ? 3 : 1);
      model = chosen.model;
      if (chosen.event) events = [...events, chosen.event];
      totals = mergeDelta(totals, chosen.delta);
      const parked = chosen.event?.purpose === "synthetic-deadlock-reposition";
      consecutiveRepositions = parked ? consecutiveRepositions + 1 : 0;
    }

    const score = progressScore(model, events);
    if (!best || score > best.score) {
      const snapshot = model.snapshot();
      best = {
        score,
        cleared: snapshot.cleared,
        board_blocks_remaining: snapshot.blocks.length,
        queued_blocks_remaining: snapshot.queuedBlocks.length,
        attempted_restart: restart + 1,
      };
    }
    globalThis.gc?.();
  }

  return {
    ok: false,
    events: [],
    exploredStates,
    elapsedMilliseconds: Date.now() - startedAt,
    capped: attemptedRestarts >= limits.maxRestarts,
    timedOut: Date.now() - startedAt >= limits.maxMilliseconds,
    failureCategory: Date.now() - startedAt >= limits.maxMilliseconds ? "stochastic_time_cap" : "stochastic_restarts_exhausted",
    best,
    normalization: {
      stochastic_fallback: true,
      attempted_restarts: attemptedRestarts,
      discarded_input_events: originalEvents.length,
    },
  };
};

const results = [];
for (const id of selectedIds) {
  const level = levelById.get(id);
  const original = routeById.get(id);
  const baseline = baselineById.get(id);
  let validation = "pass";
  try {
    validateLevel(level);
  } catch (error) {
    validation = error instanceof Error ? error.message : String(error);
  }
  const baselineDeclaredReplayed = Boolean(baseline
    && (baseline.source !== null && baseline.source !== undefined || baseline.events.length > 0));
  const baselineLegacyReplay = baselineDeclaredReplayed
    ? replayEvents(level, baseline.events, { legacyImplicitTimedTicks: true })
    : { ok: false, error: "baseline did not publish a witness" };
  const baselineStrictReplay = baselineDeclaredReplayed
    ? replayEvents(level, baseline.events)
    : { ok: false, error: "baseline did not publish a witness" };
  const originalDirectReplay = replayEvents(level, original.events);
  const explicitBaselineEvents = baselineDeclaredReplayed && baselineLegacyReplay.ok
    ? (baselineStrictReplay.ok ? clone(baseline.events) : explicitizeLegacyTimedRoute(level, baseline.events))
    : null;
  const explicitBaselineReplay = explicitBaselineEvents ? replayEvents(level, explicitBaselineEvents) : null;
  const retainedBaselineRepair = explicitBaselineReplay?.ok ? {
    ok: true,
    source: "retained-baseline-independent-replay",
    events: explicitBaselineEvents,
    drags: explicitBaselineEvents.filter((event) => !isWaitEvent(event)).map((event) => {
      const drag = asDragEvent(event);
      delete drag.type;
      return drag;
    }),
    exploredStates: 0,
    elapsedMilliseconds: 0,
    capped: false,
    timedOut: false,
    independentReplay: explicitBaselineReplay,
    counters: {
      waits: explicitBaselineEvents.filter(isWaitEvent).length,
      timedFeederWaits: explicitBaselineEvents.filter(isWaitEvent).length,
    },
    normalization: { retained_previously_replayed_baseline: true },
  } : null;
  let orderedRepair = null;
  let routeFreeRepair = null;
  let stochasticRepair = null;
  let repair;
  if (validation === "pass" && retainedBaselineRepair) {
    repair = retainedBaselineRepair;
  } else if (validation === "pass") {
    const limits = {
      maxStates: options.maxStates,
      maxMilliseconds: options.maxMillisecondsPerLevel,
    };
    const hasAuthoredDragConstraints = original.events.some((event) => !isWaitEvent(event) && event?.blockId);
    if (hasAuthoredDragConstraints) {
      orderedRepair = repairLevel(level, original.events, limits);
    } else {
      // An assembler may intentionally publish an empty route when its own
      // bounded witness pass failed.  Running the route-preserving phase in
      // that case merely invents block-id order from LevelSpec iteration and
      // can spend the full wall-clock cap defending constraints that never
      // existed.  Enter the independent route-free phase immediately.
      orderedRepair = null;
    }
    if (orderedRepair?.ok) {
      repair = orderedRepair;
    } else {
      routeFreeRepair = repairLevelRouteFree(level, original.events, limits);
      if (routeFreeRepair.ok || options.stochasticRestarts <= 0
        || routeFreeRepair.failureCategory === "relaxed_gate_capacity_impossible") {
        repair = routeFreeRepair;
      } else {
        stochasticRepair = repairLevelStochastic(level, original.events, {
          maxRestarts: options.stochasticRestarts,
          maxMilliseconds: options.stochasticMillisecondsPerLevel || options.maxMillisecondsPerLevel,
        });
        repair = stochasticRepair;
      }
    }
  } else {
    repair = {
      ok: false,
      events: [],
      failureCategory: "validate_level_failed",
      replayError: validation,
      exploredStates: 0,
      elapsedMilliseconds: 0,
      capped: false,
      timedOut: false,
      counters: {},
      normalization: null,
    };
  }
  const added = repair.ok && !baselineDeclaredReplayed;
  const regression = !repair.ok && baselineDeclaredReplayed;
  results.push({
    id,
    level,
    route: {
      level_id: levelLabel(id),
      source: repair.ok ? repair.source ?? "dynamic-puzzle-model-completion-witness-repair-v1" : null,
      proof_scope: "completion_upper_bound_only; no necessary-reposition floor claim",
      replayed: repair.ok,
      replay_contract: "events is authoritative; wait events cost zero player moves; drags omits waits for compatibility only",
      events: repair.ok ? repair.events : [],
      drags: repair.ok ? repair.drags : [],
    },
    audit: {
      level_id: levelLabel(id),
      validate_level: validation,
      baseline_declared_replayed: baselineDeclaredReplayed,
      baseline_legacy_replay: baselineLegacyReplay,
      baseline_strict_explicit_event_replay: baselineStrictReplay,
      original_route_direct_replay: originalDirectReplay,
      repaired: repair.ok,
      independent_replay: repair.ok ? repair.independentReplay : null,
      delta_vs_baseline: added ? "added" : regression ? "regression" : repair.ok ? "retained" : "still_failed",
      explored_states: repair.exploredStates,
      elapsed_milliseconds: repair.elapsedMilliseconds,
      capped: repair.capped,
      timed_out: repair.timedOut,
      failure_category: repair.ok ? null : repair.failureCategory,
      failure_error: repair.ok ? null : repair.replayError ?? null,
      deepest_progress: repair.ok ? null : repair.best ?? null,
      route_normalization: repair.normalization,
      repair_counters: repair.ok ? repair.counters : null,
      repair_strategy: retainedBaselineRepair
        ? "retained_baseline"
        : stochasticRepair
          ? "stochastic_route_free_fallback"
        : routeFreeRepair
          ? "route_free_fallback"
          : orderedRepair
            ? "route_preserving_primary"
            : "none",
      route_preserving_primary: orderedRepair ? {
        repaired: orderedRepair.ok,
        explored_states: orderedRepair.exploredStates,
        elapsed_milliseconds: orderedRepair.elapsedMilliseconds,
        capped: orderedRepair.capped,
        timed_out: orderedRepair.timedOut,
        failure_category: orderedRepair.ok ? null : orderedRepair.failureCategory,
        deepest_progress: orderedRepair.ok ? null : orderedRepair.best ?? null,
      } : null,
      route_free_fallback: routeFreeRepair ? {
        repaired: routeFreeRepair.ok,
        explored_states: routeFreeRepair.exploredStates,
        elapsed_milliseconds: routeFreeRepair.elapsedMilliseconds,
        capped: routeFreeRepair.capped,
        timed_out: routeFreeRepair.timedOut,
        failure_category: routeFreeRepair.ok ? null : routeFreeRepair.failureCategory,
        deepest_progress: routeFreeRepair.ok ? null : routeFreeRepair.best ?? null,
      } : null,
      stochastic_fallback: stochasticRepair ? {
        repaired: stochasticRepair.ok,
        explored_states: stochasticRepair.exploredStates,
        elapsed_milliseconds: stochasticRepair.elapsedMilliseconds,
        capped: stochasticRepair.capped,
        timed_out: stochasticRepair.timedOut,
        failure_category: stochasticRepair.ok ? null : stochasticRepair.failureCategory,
        deepest_progress: stochasticRepair.ok ? null : stochasticRepair.best ?? null,
      } : null,
    },
  });
  console.error(
    `${levelLabel(id)} ${repair.ok ? "REPLAYED" : `FAILED:${repair.failureCategory}`} `
    + `states=${repair.exploredStates} ms=${repair.elapsedMilliseconds} `
    + `A/B=${results.at(-1).audit.delta_vs_baseline}`,
  );
  globalThis.gc?.();
}

const declaredContractSha256 = levelsSource.match(/Contract SHA-256:\s*([A-Fa-f0-9]{64})/)?.[1]?.toUpperCase() ?? null;
const routeSourceBinding = {
  declared_contract_sha256: declaredContractSha256,
  levels: { path: displayPath(levelsPath), sha256: sha256(levelsSource) },
  original_routes: { path: displayPath(routesPath), sha256: sha256(routesSource) },
  runtime_authority: {
    path: displayPath(puzzleSourcePath),
    source_sha256: sha256(puzzleSource),
    bundled_with_dependencies_sha256: sha256(puzzleBundleSource),
  },
};
const repairedRoutes = results.map((result) => ({
  ...result.route,
  source_binding: routeSourceBinding,
}));
const failureCategories = {};
for (const result of results.filter((entry) => !entry.audit.repaired)) {
  const category = result.audit.failure_category ?? "unknown";
  failureCategories[category] = (failureCategories[category] ?? 0) + 1;
}
const addedIds = results.filter((entry) => entry.audit.delta_vs_baseline === "added").map((entry) => entry.audit.level_id);
const regressionIds = results.filter((entry) => entry.audit.delta_vs_baseline === "regression").map((entry) => entry.audit.level_id);
const retainedIds = results.filter((entry) => entry.audit.delta_vs_baseline === "retained").map((entry) => entry.audit.level_id);
const repairedIds = results.filter((entry) => entry.audit.repaired).map((entry) => entry.audit.level_id);
const routesJson = `${JSON.stringify(repairedRoutes, null, 2)}\n`;
const audit = {
  schema_version: "blockout-video-parity-completion-witness-repair-v2",
  generated_on: new Date().toISOString(),
  inputs: {
    declared_contract_sha256: declaredContractSha256,
    levels: { path: displayPath(levelsPath), sha256: sha256(levelsSource) },
    original_routes: { path: displayPath(routesPath), sha256: sha256(routesSource) },
    baseline_routes: baselineRoutesSource ? {
      path: displayPath(baselineRoutesPath),
      sha256: sha256(baselineRoutesSource),
    } : null,
    runtime_authority: {
      path: displayPath(puzzleSourcePath),
      source_sha256: sha256(puzzleSource),
      bundled_with_dependencies_sha256: sha256(puzzleBundleSource),
    },
    selected_level_ids: selectedIds,
  },
  outputs: {
    repaired_routes: { path: displayPath(outputRoutesPath), sha256: sha256(routesJson) },
    audit: displayPath(outputAuditPath),
  },
  policy: {
    runtime_authority: "src/core/PuzzleModel.ts loaded through esbuild",
    per_block_order: "The primary repair preserves original per-block action order while reordering different blocks. If it fails, the route-free fallback discards all authored parking endpoints, exit-side hints and event order, then chooses every exit/reposition/device action from a fresh live PuzzleModel. A previously replayed baseline is retained unchanged only after a fresh independent replay.",
    exits: "Every layer exit is replanned against the live block layer, gates, devices, occupancy and movement constraints using canPlace BFS.",
    route_free_fallback: "A second fresh-model search dynamically selects active exit candidates, bounded temporary repositions, move-generator triggers and explicit timed/autonomous waits. Necessary-only relaxed gate-capacity and queued-frozen-head bounds terminate provably impossible chains before spatial search.",
    stochastic_fallback: "An explicitly enabled deterministic seeded randomized-greedy restart phase keeps one live path per rollout, varies candidate ordering, and publishes nothing without a fresh independent PuzzleModel replay.",
    waits: "Timed-feeder and autonomous waits are explicit route events and never increment the player move count.",
    generators: "A legal depart-return drag may be inserted only when it demonstrably releases a move-triggered generator head.",
    proof_scope: "Every emitted event stream is independently replayed; this proves completion only and makes no lower-bound claim.",
  },
  run_configuration: {
    max_states_per_level: options.maxStates,
    max_milliseconds_per_level: options.maxMillisecondsPerLevel,
    stochastic_restarts: options.stochasticRestarts,
    stochastic_milliseconds_per_level: options.stochasticMillisecondsPerLevel,
  },
  summary: {
    requested: results.length,
    validate_level_passed: results.filter((entry) => entry.audit.validate_level === "pass").length,
    baseline_declared_replayed: results.filter((entry) => entry.audit.baseline_declared_replayed).length,
    baseline_legacy_replayed_fresh: results.filter((entry) => entry.audit.baseline_legacy_replay.ok).length,
    baseline_strict_explicit_event_replayed_fresh: results.filter((entry) => entry.audit.baseline_strict_explicit_event_replay.ok).length,
    repaired_and_independently_replayed: repairedIds.length,
    added_vs_baseline: addedIds.length,
    retained_vs_baseline: retainedIds.length,
    regressions_vs_baseline: regressionIds.length,
    still_failed: results.length - repairedIds.length,
    added_level_ids: addedIds,
    retained_level_ids: retainedIds,
    regression_level_ids: regressionIds,
    repaired_level_ids: repairedIds,
    failure_categories: failureCategories,
    route_free_fallback_attempted: results.filter((entry) => entry.audit.route_free_fallback).length,
    route_free_fallback_repaired: results.filter((entry) => entry.audit.route_free_fallback?.repaired).length,
    route_free_relaxed_capacity_impossible: results.filter((entry) => (
      entry.audit.route_free_fallback?.failure_category === "relaxed_gate_capacity_impossible"
    )).length,
    route_free_queued_frozen_head_capacity_impossible: results.filter((entry) => (
      entry.audit.route_free_fallback?.failure_category === "queued_frozen_head_capacity_impossible"
    )).length,
    stochastic_fallback_attempted: results.filter((entry) => entry.audit.stochastic_fallback).length,
    stochastic_fallback_repaired: results.filter((entry) => entry.audit.stochastic_fallback?.repaired).length,
    explicit_wait_events: results.reduce((sum, entry) => sum + (entry.audit.repair_counters?.waits ?? 0), 0),
    timed_feeder_wait_events: results.reduce((sum, entry) => sum + (entry.audit.repair_counters?.timedFeederWaits ?? 0), 0),
    generator_depart_return_events: results.reduce((sum, entry) => sum + (entry.audit.repair_counters?.generatorTriggers ?? 0), 0),
  },
  levels: results.map((result) => result.audit),
};
const auditJson = `${JSON.stringify(audit, null, 2)}\n`;

const atomicWrite = async (artifacts) => {
  const nonce = `${process.pid}-${Date.now()}`;
  const prepared = artifacts.map(({ path, source }) => ({ path, source, temporary: `${path}.tmp-${nonce}` }));
  try {
    await Promise.all(prepared.map(async ({ temporary, source }) => {
      await mkdir(dirname(temporary), { recursive: true });
      await writeFile(temporary, source, "utf8");
    }));
    for (const artifact of prepared) await rename(artifact.temporary, artifact.path);
  } finally {
    await Promise.all(prepared.map((artifact) => rm(artifact.temporary, { force: true }).catch(() => {})));
  }
};

await atomicWrite([
  { path: outputRoutesPath, source: routesJson },
  { path: outputAuditPath, source: auditJson },
]);
console.log(JSON.stringify(audit.summary, null, 2));
if (regressionIds.length || repairedIds.length < results.length) process.exitCode = 2;

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Build narrowly scoped base overrides for levels whose directional-exit
 * countdowns otherwise outrun the available colour-layer capacity.
 *
 * The tool never changes geometry, shape inventory, stage devices or counts.
 * It reuses a freshly replayed base peel route, records every geometrically
 * reachable exit at each terminal drag, then assigns ordinary/frozen deadlines
 * and colours so every chosen exit is live when used.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  baseCandidates: ".codex-temp/video-parity-v6-final-smoke-r7/report/formal-candidates.json",
  outputDir: ".codex-temp/video-parity-gate-deadline-seeds",
  levelIds: "7,25,27,38,62,77,88",
};

const parseArgs = (argv) => {
  const parsed = { ...defaults };
  const keys = new Map([
    ["--contract", "contract"],
    ["--base-candidates", "baseCandidates"],
    ["--output-dir", "outputDir"],
    ["--level-ids", "levelIds"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const key = keys.get(argv[index]);
    if (!key) throw new Error(`Unknown option: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argv[index]}`);
    parsed[key] = value;
    index += 1;
  }
  return parsed;
};

const options = parseArgs(process.argv.slice(2));
const absolute = (path) => resolve(root, path);
const displayPath = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (source) => createHash("sha256").update(source).digest("hex").toUpperCase();
const clone = (value) => structuredClone(value);
const label = (id) => `Lv${String(id).padStart(3, "0")}`;
const pointKey = (x, y) => `${x},${y}`;
const sortedNumbers = (values) => [...values].map(Number).sort((left, right) => left - right);
const parseIds = (source) => [...new Set(String(source).split(",").map((token) => Number(token.trim()))
  .filter((id) => Number.isInteger(id) && id > 0))].sort((left, right) => left - right);

const contractPath = absolute(options.contract);
const baseCandidatesPath = absolute(options.baseCandidates);
const outputDir = absolute(options.outputDir);
const outputOverridesPath = resolve(outputDir, "base-overrides.json");
const outputAuditPath = resolve(outputDir, "audit.json");
const requireContractOpeningColors = process.env.VIDEO_PARITY_GATE_REQUIRE_CONTRACT_OPENING_COLORS === "1";
const forceAlternativeLayouts = process.env.VIDEO_PARITY_GATE_FORCE_ALTERNATIVE_LAYOUTS === "1";
const skipBaseRouteReplay = process.env.VIDEO_PARITY_GATE_SKIP_BASE_ROUTE_REPLAY === "1";
const numericCarriersConcealOpeningColour = process.env.VIDEO_PARITY_GATE_NUMERIC_CARRIERS_HIDE_OPENING_COLOUR === "1";
const requireDistinctShellColours = process.env.VIDEO_PARITY_GATE_REQUIRE_DISTINCT_SHELL_COLOURS === "1";
const [contractText, baseCandidatesText] = await Promise.all([
  readFile(contractPath, "utf8"),
  readFile(baseCandidatesPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const baseArtifact = JSON.parse(baseCandidatesText);
const baseEntries = Array.isArray(baseArtifact.levels) ? baseArtifact.levels
  : Array.isArray(baseArtifact) ? baseArtifact
    : [];
const contractById = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")), entry,
]));
const baseById = new Map(baseEntries.map((entry) => [Number(entry.level?.id ?? entry.id), entry]));
const selectedIds = parseIds(options.levelIds);

const puzzleBundle = await build({
  stdin: {
    contents: `export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "gate-deadline-seed-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const puzzleBundleSource = puzzleBundle.outputFiles[0].text;
const puzzleModuleUrl = `data:text/javascript;base64,${Buffer.from(puzzleBundleSource).toString("base64")}`;
const { PuzzleModel, validateLevel } = await import(puzzleModuleUrl);

const movementDirections = (block) => block.movementAxis === "horizontal"
  ? [[1, 0], [-1, 0]]
  : block.movementAxis === "vertical"
    ? [[0, 1], [0, -1]]
    : [[1, 0], [0, 1], [-1, 0], [0, -1]];

const axisAllowsSide = (block, side) => block.movementAxis === "horizontal"
  ? side === "left" || side === "right"
  : block.movementAxis === "vertical"
    ? side === "top" || side === "bottom"
    : true;

const footprintBounds = (block, x, y) => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  return {
    minX: Math.min(...cells.map(([cellX]) => cellX)),
    maxX: Math.max(...cells.map(([cellX]) => cellX)),
    minY: Math.min(...cells.map(([, cellY]) => cellY)),
    maxY: Math.max(...cells.map(([, cellY]) => cellY)),
  };
};

const coveringGateIndex = (snapshot, block, x, y) => {
  const bounds = footprintBounds(block, x, y);
  for (let index = 0; index < snapshot.gates.length; index += 1) {
    const gate = snapshot.gates[index];
    if (!axisAllowsSide(block, gate.side)) continue;
    const atEdge = gate.side === "top" ? bounds.minY === 0
      : gate.side === "bottom" ? bounds.maxY === snapshot.height - 1
        : gate.side === "left" ? bounds.minX === 0
          : bounds.maxX === snapshot.width - 1;
    if (!atEdge) continue;
    const covered = gate.side === "top" || gate.side === "bottom"
      ? bounds.minX >= gate.offset && bounds.maxX < gate.offset + gate.size
      : bounds.minY >= gate.offset && bounds.maxY < gate.offset + gate.size;
    if (covered) return index;
  }
  return null;
};

const reconstructPath = (nodes, targetKey) => {
  const path = [];
  let key = targetKey;
  while (key) {
    const node = nodes.get(key);
    if (!node) break;
    path.push(node.point);
    key = node.parent;
  }
  return path.reverse().slice(1);
};

const descriptorKey = (descriptor) => `${descriptor.side}:${descriptor.offset}:${descriptor.size}`;

const boundaryDescriptorsAt = (snapshot, block, x, y) => {
  const bounds = footprintBounds(block, x, y);
  const sides = [];
  if (axisAllowsSide(block, "top") && bounds.minY === 0) sides.push(["top", bounds.minX, bounds.maxX, snapshot.width]);
  if (axisAllowsSide(block, "bottom") && bounds.maxY === snapshot.height - 1) {
    sides.push(["bottom", bounds.minX, bounds.maxX, snapshot.width]);
  }
  if (axisAllowsSide(block, "left") && bounds.minX === 0) sides.push(["left", bounds.minY, bounds.maxY, snapshot.height]);
  if (axisAllowsSide(block, "right") && bounds.maxX === snapshot.width - 1) {
    sides.push(["right", bounds.minY, bounds.maxY, snapshot.height]);
  }
  const descriptors = [];
  for (const [side, spanStart, spanEnd, sideLength] of sides) {
    for (let offset = 0; offset <= spanStart; offset += 1) {
      for (let end = spanEnd; end < sideLength; end += 1) {
        descriptors.push({ side, offset, size: end - offset + 1 });
      }
    }
  }
  return descriptors;
};

const reachableBoundaryPaths = (model, blockId) => {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return new Map();
  const snapshot = model.snapshot();
  const start = pointKey(block.x, block.y);
  const nodes = new Map([[start, { point: [block.x, block.y], parent: null }]]);
  const queue = [[block.x, block.y]];
  const paths = new Map();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const descriptor of boundaryDescriptorsAt(snapshot, block, x, y)) {
      const key = descriptorKey(descriptor);
      const path = reconstructPath(nodes, pointKey(x, y));
      const current = paths.get(key);
      if (!current || path.length < current.path.length) paths.set(key, { descriptor, path });
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
  return paths;
};

const executeDrag = (model, event) => {
  const block = model.getBlock(event.blockId);
  if (!block) return { ok: false, reason: `missing block ${event.blockId}` };
  model.beginAction();
  for (const [x, y] of event.path ?? []) {
    const before = model.getBlock(event.blockId);
    const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
    const moved = distance === 1
      ? model.moveBlockStep(event.blockId, x, y)
      : model.moveBlock(event.blockId, x, y);
    const after = model.getBlock(event.blockId);
    if (!moved || !after || after.x !== x || after.y !== y) {
      model.cancelAction();
      return { ok: false, reason: `cannot move ${event.blockId} to ${x},${y}` };
    }
  }
  if (event.exitSide) {
    const exited = model.tryExit(event.blockId, event.exitSide);
    if (!exited.ok) {
      const status = model.exitAttemptStatus(event.blockId, event.exitSide);
      model.cancelAction();
      return { ok: false, reason: `cannot exit ${event.blockId} via ${event.exitSide}: ${status}` };
    }
  }
  if (!model.commitAction()) return { ok: false, reason: `action for ${event.blockId} was a no-op` };
  return { ok: true };
};

const replay = (level, route) => {
  const model = new PuzzleModel(level);
  let clearLayers = 0;
  for (let index = 0; index < route.length; index += 1) {
    const before = model.snapshot().cleared;
    const result = executeDrag(model, route[index]);
    if (!result.ok) return { ok: false, reason: `event ${index + 1}: ${result.reason}` };
    clearLayers += model.snapshot().cleared - before;
  }
  const snapshot = model.snapshot();
  return snapshot.complete
    ? { ok: true, drags: route.length, clear_layers: clearLayers, moves: snapshot.moves }
    : { ok: false, reason: `${snapshot.blocks.length} board / ${snapshot.queuedBlocks.length} queued remain` };
};

const openingBlockIds = (level) => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closedShutters = new Set((level.shutters ?? [])
    .filter((shutter) => shutter.count > 0)
    .map((shutter) => shutter.id));
  return new Set(level.blocks
    .filter((block) => !queued.has(block.id)
      && (!block.shutterId || !closedShutters.has(block.shutterId))
      && (!numericCarriersConcealOpeningColour || Number(block.frozen ?? 0) <= 0))
    .map((block) => block.id));
};

const analyzeBaseRoute = (level, route) => {
  const baseReplay = replay(level, route);
  if (!baseReplay.ok) throw new Error(`${label(level.id)} base route does not fresh replay: ${baseReplay.reason}`);
  const model = new PuzzleModel(level);
  const openingIds = openingBlockIds(level);
  const exits = [];
  for (let eventIndex = 0; eventIndex < route.length; eventIndex += 1) {
    const event = route[eventIndex];
    if (event.exitSide) {
      const block = model.getBlock(event.blockId);
      if (!block) throw new Error(`${label(level.id)} route exit ${eventIndex + 1} references a missing block`);
      const paths = reachableBoundaryPaths(model, block.id);
      exits.push({
        eventIndex,
        blockId: block.id,
        clearIndex: exits.length,
        opening: openingIds.has(block.id),
        reachableBoundaries: [...paths.values()],
      });
    }
    const result = executeDrag(model, event);
    if (!result.ok) throw new Error(`${label(level.id)} base route event ${eventIndex + 1}: ${result.reason}`);
  }
  if (!model.snapshot().complete) throw new Error(`${label(level.id)} base route analysis ended incomplete`);
  if (new Set(exits.map((exit) => exit.blockId)).size !== level.blocks.length) {
    throw new Error(`${label(level.id)} base route is not a one-terminal-exit-per-block peel route`);
  }
  return { exits, openingIds, baseReplay };
};

const reachableConfiguredGatePaths = (model, blockId) => {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return new Map();
  const snapshot = model.snapshot();
  const start = pointKey(block.x, block.y);
  const nodes = new Map([[start, { point: [block.x, block.y], parent: null }]]);
  const queue = [[block.x, block.y]];
  const paths = new Map();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    const gateIndex = coveringGateIndex(snapshot, block, x, y);
    if (gateIndex !== null && !paths.has(gateIndex)) {
      paths.set(gateIndex, reconstructPath(nodes, pointKey(x, y)));
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
  return paths;
};

const worldSignature = (model) => {
  const snapshot = model.snapshot();
  const sorted = (items) => [...items].sort((left, right) => left.id.localeCompare(right.id));
  return JSON.stringify({
    blocks: sorted(snapshot.blocks).map((block) => [
      block.id, block.x, block.y, block.frozen, block.shutterId ?? null, block.lockedBy ?? null,
    ]),
    queued: sorted(snapshot.queuedBlocks).map((block) => [block.id, block.frozen, block.shutterId ?? null]),
    shutters: sorted(snapshot.shutters).map((shutter) => [shutter.id, shutter.count]),
    generators: sorted(snapshot.generators).map((generator) => [generator.id, generator.head, generator.remaining]),
    cleared: snapshot.cleared,
    complete: snapshot.complete,
  });
};

const repositionCandidates = (model, limit = 48) => {
  const snapshot = model.snapshot();
  const preliminary = [];
  for (const original of [...snapshot.blocks].sort((left, right) => left.id.localeCompare(right.id))) {
    const block = model.getBlock(original.id);
    if (!block || !model.isBlockActive(block)) continue;
    const start = pointKey(block.x, block.y);
    const nodes = new Map([[start, { point: [block.x, block.y], parent: null }]]);
    const queue = [[block.x, block.y]];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const [x, y] = queue[cursor];
      for (const [dx, dy] of movementDirections(block)) {
        const nextX = x + dx;
        const nextY = y + dy;
        const key = pointKey(nextX, nextY);
        if (nodes.has(key) || !model.canPlace(block, nextX, nextY)) continue;
        nodes.set(key, { point: [nextX, nextY], parent: pointKey(x, y) });
        queue.push([nextX, nextY]);
      }
    }
    const options = [...nodes.entries()].filter(([key]) => key !== start).map(([key, entry]) => ({
      blockId: block.id,
      point: entry.point,
      path: reconstructPath(nodes, key),
      displacement: Math.abs(entry.point[0] - block.x) + Math.abs(entry.point[1] - block.y),
    })).filter((option) => coveringGateIndex(snapshot, block, option.point[0], option.point[1]) === null);
    options.sort((left, right) => right.displacement - left.displacement
      || left.path.length - right.path.length
      || pointKey(...left.point).localeCompare(pointKey(...right.point)));
    const selected = options.slice(0, 6);
    for (const selector of [
      (entry) => entry.point[0],
      (entry) => -entry.point[0],
      (entry) => entry.point[1],
      (entry) => -entry.point[1],
    ]) {
      const extreme = [...options].sort((left, right) => selector(left) - selector(right))[0];
      if (extreme && !selected.some((entry) => pointKey(...entry.point) === pointKey(...extreme.point))) selected.push(extreme);
    }
    preliminary.push(...selected);
  }
  const candidates = [];
  for (const option of preliminary) {
    const trial = model.clone();
    const event = { blockId: option.blockId, path: option.path, purpose: "gate-deadline-temporary-reposition" };
    const moved = executeDrag(trial, event);
    if (!moved.ok) continue;
    let newlyReachableExits = 0;
    for (const block of trial.snapshot().blocks) {
      if (reachableConfiguredGatePaths(trial, block.id).size) newlyReachableExits += 1;
    }
    candidates.push({
      model: trial,
      event,
      priority: newlyReachableExits * 100_000 + option.displacement * 100 - option.path.length,
    });
  }
  return candidates.sort((left, right) => right.priority - left.priority
    || left.event.path.length - right.event.path.length
    || left.event.blockId.localeCompare(right.event.blockId)).slice(0, limit);
};

const removeOne = (values, selected) => {
  const next = [...values];
  const index = next.indexOf(selected);
  if (index < 0) throw new Error(`deadline ${selected} is not available`);
  next.splice(index, 1);
  return next;
};

const ensureGateCount = (level, gateCount) => {
  const gateCells = new Set(level.gates.flatMap((gate) => Array.from(
    { length: gate.size }, (_, index) => `${gate.side}:${gate.offset + index}`,
  )));
  const playable = new Set(level.playable.map(([x, y]) => pointKey(x, y)));
  const sides = ["top", "right", "bottom", "left"];
  while (level.gates.length < gateCount) {
    let added = null;
    for (const side of sides) {
      const limit = side === "top" || side === "bottom" ? level.width : level.height;
      for (let offset = 0; offset < limit; offset += 1) {
        if (gateCells.has(`${side}:${offset}`)) continue;
        const boardKey = side === "top" ? pointKey(offset, 0)
          : side === "bottom" ? pointKey(offset, level.height - 1)
            : side === "left" ? pointKey(0, offset)
              : pointKey(level.width - 1, offset);
        if (!playable.has(boardKey)) continue;
        added = {
          id: `gate-deadline-extra-${String(level.gates.length + 1).padStart(2, "0")}`,
          side,
          offset,
          size: 1,
          color: level.gates[0]?.color ?? "red",
        };
        gateCells.add(`${side}:${offset}`);
        level.gates.push(added);
        break;
      }
      if (added) break;
    }
    if (!added) throw new Error(`${label(level.id)} has no free playable boundary cell for contracted extra gate`);
  }
  if (level.gates.length !== gateCount) {
    throw new Error(`${label(level.id)} base gate count ${level.gates.length} exceeds contract ${gateCount}`);
  }
};

const verticalBoundaryUnitLayout = (sourceLevel, gateCount) => {
  const verticalOnly = sourceLevel.blocks.every((block) => {
    const xs = block.shape.map(([x]) => x);
    return Math.max(...xs) - Math.min(...xs) + 1 === 1;
  });
  if (!verticalOnly) return null;
  const playable = new Set(sourceLevel.playable.map(([x, y]) => pointKey(x, y)));
  const slots = [];
  for (let x = 0; x < sourceLevel.width; x += 1) {
    if (playable.has(pointKey(x, 0))) slots.push({ side: "top", offset: x, size: 1 });
    if (playable.has(pointKey(x, sourceLevel.height - 1))) slots.push({ side: "bottom", offset: x, size: 1 });
  }
  if (slots.length < gateCount) return null;
  const level = clone(sourceLevel);
  level.gates = slots.slice(0, gateCount).map((slot, index) => ({
    id: sourceLevel.gates[index]?.id ?? `gate-deadline-extra-${String(index + 1).padStart(2, "0")}`,
    ...slot,
    color: sourceLevel.gates[index % sourceLevel.gates.length]?.color ?? "red",
  }));
  return level;
};

const uniformThreeCellBoundaryLayout = (sourceLevel, gateCount) => {
  const span = 3;
  const playable = new Set(sourceLevel.playable.map(([x, y]) => pointKey(x, y)));
  const descriptors = [];
  for (const side of ["top", "right", "bottom", "left"]) {
    const limit = side === "top" || side === "bottom" ? sourceLevel.width : sourceLevel.height;
    for (let offset = 0; offset + span <= limit; offset += span) {
      const opensOnlyOntoPlayable = Array.from({ length: span }, (_, delta) => {
        const coordinate = offset + delta;
        return side === "top" ? pointKey(coordinate, 0)
          : side === "bottom" ? pointKey(coordinate, sourceLevel.height - 1)
            : side === "left" ? pointKey(0, coordinate)
              : pointKey(sourceLevel.width - 1, coordinate);
      }).every((cell) => playable.has(cell));
      if (opensOnlyOntoPlayable) descriptors.push({ side, offset, size: span });
    }
  }
  if (descriptors.length < gateCount) return null;
  const level = clone(sourceLevel);
  level.gates = descriptors.slice(0, gateCount).map((descriptor, index) => ({
    id: sourceLevel.gates[index]?.id ?? `gate-deadline-extra-${String(index + 1).padStart(2, "0")}`,
    ...descriptor,
    color: sourceLevel.gates[index % sourceLevel.gates.length]?.color ?? "red",
  }));
  return level;
};

const assignSemanticGateColors = ({
  gateCount,
  usedGates,
  openingGates,
  palette,
  openingColorCount,
  deadlineByGate,
}) => {
  const used = [...usedGates].sort((left, right) => left - right);
  const byDeadline = (left, right) => (deadlineByGate.get(left) ?? 0) - (deadlineByGate.get(right) ?? 0)
    || left - right;
  const opening = used.filter((gate) => openingGates.has(gate)).sort(byDeadline);
  const hiddenOnly = used.filter((gate) => !openingGates.has(gate)).sort(byDeadline);
  if (used.length < palette.length || opening.length < openingColorCount
    || hiddenOnly.length < palette.length - openingColorCount) return null;
  const colorByGate = new Map();
  opening.forEach((gate, index) => colorByGate.set(gate, palette[Math.min(index, openingColorCount - 1)]));
  hiddenOnly.forEach((gate, index) => colorByGate.set(
    gate,
    index < palette.length - openingColorCount ? palette[openingColorCount + index] : palette[0],
  ));
  for (let gate = 0; gate < gateCount; gate += 1) {
    if (!colorByGate.has(gate)) colorByGate.set(gate, palette[0]);
  }
  return colorByGate;
};

const runtimeOpeningColorCount = (level, target, deadlines) => {
  const openingIds = openingBlockIds(level);
  const openingClearLayers = level.blocks
    .filter((block) => openingIds.has(block.id))
    .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
  const gatesAvailableBeforeOpeningExhaustion = deadlines
    .filter((deadline) => deadline <= Math.max(0, openingClearLayers - 1)).length;
  return {
    count: requireContractOpeningColors ? Number(target.opening_color_count) : Math.min(
      Number(target.opening_color_count),
      gatesAvailableBeforeOpeningExhaustion,
      Number(target.full_level_color_count),
    ),
    openingClearLayers,
    gatesAvailableBeforeOpeningExhaustion,
  };
};

const shapeIdOf = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  const normalized = shape.map(([x, y]) => [x - minX, y - minY])
    .sort(([leftX, leftY], [rightX, rightY]) => leftY - rightY || leftX - rightX);
  const width = Math.max(...normalized.map(([x]) => x)) + 1;
  const height = Math.max(...normalized.map(([, y]) => y)) + 1;
  if (normalized.length === 1) return "SINGLE";
  if (height === 1) return `H${width}`;
  if (width === 1) return `V${height}`;
  if (width === 2 && height === 2 && normalized.length === 4) return "SQ2";
  if (width === 2 && height === 2 && normalized.length === 3) return "L3";
  if (width === 3 && height === 3 && normalized.length === 5
    && sameJson(normalized, [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]])) return "CROSS5";
  return `CELLS_${normalized.length}_${width}X${height}`;
};

const histogramOfBlocks = (blocks) => {
  const histogram = {};
  for (const block of blocks) {
    const shapeId = shapeIdOf(block.shape);
    histogram[shapeId] = (histogram[shapeId] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(histogram).sort(([left], [right]) => left.localeCompare(right)));
};

const generatorStageBlockIds = (level, target) => {
  const partitions = target.stage_partitions ?? [];
  const generatorPartitions = partitions.filter((partition) => partition.kind === "side_generator");
  if (!generatorPartitions.length) return new Set();
  const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const groups = [];
  if (queuedIds.size) groups.push(level.blocks.filter((block) => queuedIds.has(block.id)));
  const byShutter = new Map();
  for (const block of level.blocks.filter((candidate) => candidate.shutterId)) {
    if (!byShutter.has(block.shutterId)) byShutter.set(block.shutterId, []);
    byShutter.get(block.shutterId).push(block);
  }
  groups.push(...byShutter.values());
  const selected = new Set();
  const usedGroups = new Set();
  for (const partition of generatorPartitions) {
    const expectedHistogram = Object.fromEntries(Object.entries(partition.shape_histogram ?? {})
      .sort(([left], [right]) => left.localeCompare(right)));
    const groupIndex = groups.findIndex((group, index) => !usedGroups.has(index)
      && group.length === Number(partition.count)
      && sameJson(histogramOfBlocks(group), expectedHistogram));
    if (groupIndex < 0) continue;
    usedGroups.add(groupIndex);
    groups[groupIndex].forEach((block) => selected.add(block.id));
  }
  return selected;
};

const dynamicDeadlineSeed = ({ baseLevel, baseRoute, target, deadlines }) => {
  const level = clone(baseLevel);
  const shellBlockIds = new Set(level.blocks
    .filter((block) => (block.layers?.length ?? 1) > 1)
    .map((block) => block.id));
  const gateCount = level.gates.length;
  level.gates.forEach((gate, gateIndex) => {
    gate.color = target.design_palette[gateIndex % target.design_palette.length];
    delete gate.frozen;
  });
  const openingIds = openingBlockIds(level);
  const openingCapacity = runtimeOpeningColorCount(level, target, deadlines);
  const desiredOpeningColorCount = openingCapacity.count;
  const generatorBlockIds = generatorStageBlockIds(level, target);
  const numericShapeIds = new Set(Object.keys(target.mechanism_contract?.numeric_ice?.shape_histogram ?? {}));
  const maximumDeadline = Math.max(...deadlines, 0);
  const baseExitRank = new Map(baseRoute.filter((event) => event.exitSide)
    .map((event, index) => [event.blockId, index]));
  const basePreferredGate = new Map(baseLevel.blocks.map((block) => [
    block.id,
    baseLevel.gates.findIndex((gate) => gate.color === block.color),
  ]));
  const memo = new Set();
  const startedAt = Date.now();
  const maxStates = Number(process.env.VIDEO_PARITY_GATE_MAX_STATES ?? 500_000);
  const maxMilliseconds = Number(process.env.VIDEO_PARITY_GATE_MAX_MS ?? 45_000);
  let exploredStates = 0;
  let timedOut = false;
  let capped = false;
  let best = null;

  const visit = ({
    model,
    deadlineByGate,
    remainingDeadlines,
    openingGates,
    usedGates,
    events,
    blockGateSequence,
    exitGateIndices,
    stagnant,
  }) => {
    if (exploredStates >= maxStates) {
      capped = true;
      return null;
    }
    if (Date.now() - startedAt >= maxMilliseconds) {
      timedOut = true;
      return null;
    }
    exploredStates += 1;
    const snapshot = model.snapshot();
    const remainingOpeningLayers = [...snapshot.blocks, ...snapshot.queuedBlocks]
      .filter((block) => openingIds.has(block.id))
      .reduce((sum, block) => sum + block.layers.length, 0);
    const totalRemainingLayers = [...snapshot.blocks, ...snapshot.queuedBlocks]
      .reduce((sum, block) => sum + block.layers.length, 0);
    if (openingGates.size + remainingOpeningLayers < desiredOpeningColorCount
      || usedGates.size + totalRemainingLayers < target.full_level_color_count) return null;
    if (snapshot.complete) {
      const colorByGate = assignSemanticGateColors({
        gateCount,
        usedGates,
        openingGates,
        palette: target.design_palette,
        openingColorCount: desiredOpeningColorCount,
        deadlineByGate,
      });
      if (!colorByGate) return null;
      const completedDeadlines = new Map(deadlineByGate);
      const unusedGates = Array.from({ length: gateCount }, (_, gateIndex) => gateIndex)
        .filter((gateIndex) => !completedDeadlines.has(gateIndex));
      if (unusedGates.length !== remainingDeadlines.length) return null;
      unusedGates.forEach((gateIndex, index) => completedDeadlines.set(gateIndex, remainingDeadlines[index]));
      return {
        events,
        deadlineByGate: completedDeadlines,
        blockGateSequence,
        exitGateIndices,
        colorByGate,
      };
    }
    const progressScore = snapshot.cleared * 1_000_000
      + deadlineByGate.size * 10_000
      - (snapshot.blocks.length + snapshot.queuedBlocks.length) * 100
      - events.length;
    if (!best || progressScore > best.score) {
      best = {
        score: progressScore,
        cleared: snapshot.cleared,
        board_remaining: snapshot.blocks.length,
        queued_remaining: snapshot.queuedBlocks.length,
        remaining_blocks: snapshot.blocks.map((block) => ({
          id: block.id,
          x: block.x,
          y: block.y,
          shape: shapeIdOf(block.shape),
          frozen: block.frozen ?? 0,
          layers: [...block.layers],
        })),
        gate_state: snapshot.gates.map((gate, gateIndex) => ({
          gate_index: gateIndex,
          side: gate.side,
          offset: gate.offset,
          size: gate.size,
          frozen: gate.frozen ?? 0,
          assigned_deadline: deadlineByGate.get(gateIndex) ?? null,
        })),
        route: clone(events),
        deadlines_bound: deadlineByGate.size,
        opening_colours: openingGates.size,
      };
    }
    const deadlineSignature = [...deadlineByGate.entries()].sort((left, right) => left[0] - right[0]);
    const signature = `${worldSignature(model)};deadlines=${JSON.stringify(deadlineSignature)};`
      + `opening=${[...openingGates].sort().join(",")};used=${[...usedGates].sort().join(",")}`;
    if (memo.has(signature)) return null;
    memo.add(signature);

    const exits = [];
    for (const block of snapshot.blocks) {
      const paths = reachableConfiguredGatePaths(model, block.id);
      for (const [gateIndex, path] of paths) {
        const previousGate = blockGateSequence.get(block.id)?.at(-1);
        if (requireDistinctShellColours && shellBlockIds.has(block.id)
          && previousGate === gateIndex) continue;
        const assignedDeadline = deadlineByGate.get(gateIndex);
          const choices = assignedDeadline === undefined
          ? [...new Set(remainingDeadlines)].filter((deadline) => deadline <= snapshot.cleared)
          : [assignedDeadline];
        for (const deadline of choices) {
          const nextOpening = new Set(openingGates);
          if (openingIds.has(block.id)) nextOpening.add(gateIndex);
          const nextUsedGates = new Set(usedGates);
          nextUsedGates.add(gateIndex);
          const gateColor = level.gates[gateIndex].color;
          const trial = model.clone();
          const trialBlock = trial.getBlock(block.id);
          const gate = trial.snapshot().gates[gateIndex];
          trialBlock.color = gate.color;
          // Keep every shell layer.  Recolouring the remaining live layers is
          // only a search convenience; the winning per-peel colour sequence is
          // materialised back onto the fresh initial level below.
          trialBlock.layers = trialBlock.layers.map(() => gate.color);
          const event = {
            blockId: block.id,
            path,
            exitSide: gate.side,
            purpose: "gate-deadline-dynamic-peel",
          };
          const applied = executeDrag(trial, event);
          if (!applied.ok) continue;
          const nextDeadlines = new Map(deadlineByGate);
          let nextRemaining = remainingDeadlines;
          const firstUse = !nextDeadlines.has(gateIndex);
          if (firstUse) {
            nextDeadlines.set(gateIndex, deadline);
            nextRemaining = removeOne(remainingDeadlines, deadline);
          }
          const nextBlockGateSequence = new Map(blockGateSequence);
          nextBlockGateSequence.set(block.id, [
            ...(nextBlockGateSequence.get(block.id) ?? []),
            gateIndex,
          ]);
          exits.push({
            model: trial,
            event,
            deadlineByGate: nextDeadlines,
            remainingDeadlines: nextRemaining,
            openingGates: nextOpening,
            usedGates: nextUsedGates,
            blockGateSequence: nextBlockGateSequence,
            exitGateIndices: [...exitGateIndices, gateIndex],
            priority: 1_000_000
              + (firstUse ? 200_000 : 0)
              + (!usedGates.has(gateIndex) ? 400_000 : 0)
              + (basePreferredGate.get(block.id) === gateIndex ? 350_000 : 0)
              + (openingIds.has(block.id) && openingGates.size < desiredOpeningColorCount
                && !openingGates.has(gateIndex) ? 300_000 : 0)
              + (generatorBlockIds.has(block.id) && numericShapeIds.has(shapeIdOf(block.shape)) ? 600_000 : 0)
              + (generatorBlockIds.has(block.id) ? (maximumDeadline - deadline) * 10_000 : 0)
              + deadline * 1_000
              - (baseExitRank.get(block.id) ?? 10_000)
              - path.length,
          });
        }
      }
    }
    exits.sort((left, right) => right.priority - left.priority
      || left.event.path.length - right.event.path.length
      || left.event.blockId.localeCompare(right.event.blockId));
    const actions = exits.slice(0, 32).map((candidate) => ({ kind: "exit", candidate, priority: candidate.priority }));
    if (stagnant < 24) {
      for (const candidate of repositionCandidates(model, exits.length ? 16 : 48)) {
        const reachableUnusedGates = new Set();
        if (usedGates.size < target.full_level_color_count) {
          for (const block of candidate.model.snapshot().blocks) {
            for (const gateIndex of reachableConfiguredGatePaths(candidate.model, block.id).keys()) {
              if (!usedGates.has(gateIndex)) reachableUnusedGates.add(gateIndex);
            }
          }
        }
        actions.push({
          kind: "reposition",
          candidate,
          // A legal clear is always preferable to speculative parking.  The
          // reposition score only orders fallbacks after all current exits;
          // otherwise a high "newly reachable" count can create hundreds of
          // harmless but wholly unnecessary drags in the emitted witness.
          priority: 500_000
            + reachableUnusedGates.size * 10_000
            + candidate.priority / 1_000_000,
        });
      }
    }
    actions.sort((left, right) => right.priority - left.priority
      || left.candidate.event.path.length - right.candidate.event.path.length
      || left.candidate.event.blockId.localeCompare(right.candidate.event.blockId));
    for (const action of actions) {
      const { candidate } = action;
      const solved = action.kind === "exit" ? visit({
        ...candidate,
        events: [...events, candidate.event],
        stagnant: 0,
      }) : visit({
        model: candidate.model,
        deadlineByGate,
        remainingDeadlines,
        openingGates,
        usedGates,
        events: [...events, candidate.event],
        blockGateSequence,
        exitGateIndices,
        stagnant: stagnant + 1,
      });
      if (solved) return solved;
      if (timedOut || capped) return null;
    }
    return null;
  };

  const found = visit({
    model: new PuzzleModel(level),
    deadlineByGate: new Map(),
    remainingDeadlines: [...deadlines],
    openingGates: new Set(),
    usedGates: new Set(),
    events: [],
    blockGateSequence: new Map(),
    exitGateIndices: [],
    stagnant: 0,
  });
  if (!found) {
    return {
      ok: false,
      reason: timedOut ? "time_cap" : capped ? "state_cap" : "search_exhausted",
      exploredStates,
      elapsedMilliseconds: Date.now() - startedAt,
      best,
    };
  }
  const seeded = clone(level);
  for (let gateIndex = 0; gateIndex < gateCount; gateIndex += 1) {
    const deadline = found.deadlineByGate.get(gateIndex);
    seeded.gates[gateIndex].color = found.colorByGate.get(gateIndex);
    if (deadline > 0) seeded.gates[gateIndex].frozen = deadline;
    else delete seeded.gates[gateIndex].frozen;
  }
  const seededBlockById = new Map(seeded.blocks.map((block) => [block.id, block]));
  for (const [blockId, gateIndices] of found.blockGateSequence) {
    const block = seededBlockById.get(blockId);
    const colours = gateIndices.map((gateIndex) => found.colorByGate.get(gateIndex));
    block.color = colours[0];
    if (block.layers) block.layers = colours;
  }
  return {
    ok: true,
    level: seeded,
    route: found.events,
    deadlineByGate: found.deadlineByGate,
    blockGateSequence: found.blockGateSequence,
    exitGateIndices: found.exitGateIndices,
    openingIds,
    runtimeOpeningColorCount: desiredOpeningColorCount,
    openingCapacity,
    exploredStates,
    elapsedMilliseconds: Date.now() - startedAt,
    best,
  };
};

function* uniquePermutations(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const distinct = [...counts.keys()].sort((left, right) => left - right);
  const current = [];
  function* visit() {
    if (current.length === values.length) {
      yield [...current];
      return;
    }
    for (const value of distinct) {
      const remaining = counts.get(value) ?? 0;
      if (!remaining) continue;
      counts.set(value, remaining - 1);
      current.push(value);
      yield* visit();
      current.pop();
      counts.set(value, remaining);
    }
  }
  yield* visit();
}

const combinations = (values, count) => {
  const result = [];
  const visit = (start, selected) => {
    if (selected.length === count) {
      result.push([...selected]);
      return;
    }
    for (let index = start; index <= values.length - (count - selected.length); index += 1) {
      selected.push(values[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  };
  visit(0, []);
  return result;
};

const coverRequiredGates = (requiredGates, recordIndices, eligible) => {
  const ordered = [...requiredGates].sort((left, right) => {
    const leftCount = recordIndices.filter((recordIndex) => eligible[recordIndex].includes(left)).length;
    const rightCount = recordIndices.filter((recordIndex) => eligible[recordIndex].includes(right)).length;
    return leftCount - rightCount || left - right;
  });
  const usedRecords = new Set();
  const assignment = new Map();
  const visit = (cursor) => {
    if (cursor === ordered.length) return true;
    const gateIndex = ordered[cursor];
    const records = recordIndices.filter((recordIndex) => (
      !usedRecords.has(recordIndex) && eligible[recordIndex].includes(gateIndex)
    ));
    for (const recordIndex of records) {
      usedRecords.add(recordIndex);
      assignment.set(recordIndex, gateIndex);
      if (visit(cursor + 1)) return true;
      assignment.delete(recordIndex);
      usedRecords.delete(recordIndex);
    }
    return false;
  };
  return visit(0) ? assignment : null;
};

const descriptorsOverlap = (left, right) => left.side === right.side
  && left.offset < right.offset + right.size
  && right.offset < left.offset + left.size;

const materializeLayoutExits = (exits, descriptors) => exits.map((exit) => {
  const boundaryByKey = new Map(exit.reachableBoundaries.map((candidate) => [
    descriptorKey(candidate.descriptor), candidate,
  ]));
  return {
    ...exit,
    reachable: descriptors.flatMap((descriptor, gateIndex) => {
      const candidate = boundaryByKey.get(descriptorKey(descriptor));
      return candidate ? [{ gateIndex, path: candidate.path }] : [];
    }),
  };
});

const findGateLayoutAndDeadlines = ({ exits, baseGates, gateCount, deadlines, openingColorCount }) => {
  const universeByKey = new Map();
  exits.forEach((exit, recordIndex) => {
    for (const candidate of exit.reachableBoundaries) {
      const key = descriptorKey(candidate.descriptor);
      if (!universeByKey.has(key)) {
        universeByKey.set(key, { descriptor: candidate.descriptor, records: new Set(), pathLength: 0 });
      }
      const entry = universeByKey.get(key);
      entry.records.add(recordIndex);
      entry.pathLength += candidate.path.length;
    }
  });
  const sideOrder = new Map(["top", "right", "bottom", "left"].map((side, index) => [side, index]));
  const universe = [...universeByKey.values()].sort((left, right) => (
    right.records.size - left.records.size
    || left.descriptor.size - right.descriptor.size
    || sideOrder.get(left.descriptor.side) - sideOrder.get(right.descriptor.side)
    || left.descriptor.offset - right.descriptor.offset
  ));
  const baseDescriptors = baseGates.map((gate) => ({ side: gate.side, offset: gate.offset, size: gate.size }));
  const attempts = [];
  let layoutNodes = 0;
  let completeLayouts = 0;
  const maxLayoutNodes = 150_000;
  const memo = new Set();

  const tryLayout = (descriptors, source) => {
    if (descriptors.length !== gateCount) return null;
    if (descriptors.some((descriptor, index) => descriptors.slice(0, index)
      .some((other) => descriptorsOverlap(descriptor, other)))) return null;
    const layoutExits = materializeLayoutExits(exits, descriptors);
    if (layoutExits.some((exit) => exit.reachable.length === 0)) return null;
    completeLayouts += 1;
    const assignment = findDeadlineAssignment({
      exits: layoutExits,
      gateCount,
      deadlines,
      openingColorCount,
    });
    attempts.push({ source, assignment: assignment.failure ?? "pass" });
    return assignment.failure ? null : { descriptors, exits: layoutExits, assignment, source };
  };

  const base = tryLayout(baseDescriptors, "base_gate_geometry");
  if (base) return { ...base, layoutNodes, completeLayouts, attempts };

  let winner = null;
  const visit = (selected) => {
    if (winner || layoutNodes >= maxLayoutNodes) return;
    layoutNodes += 1;
    const selectedKeys = selected.map((entry) => descriptorKey(entry.descriptor)).sort();
    const signature = selectedKeys.join("|");
    if (memo.has(signature)) return;
    memo.add(signature);
    if (selected.length === gateCount) {
      winner = tryLayout(selected.map((entry) => entry.descriptor), "boundary_layout_search");
      return;
    }
    const covered = new Set(selected.flatMap((entry) => [...entry.records]));
    const compatible = universe.filter((entry) => (
      !selectedKeys.includes(descriptorKey(entry.descriptor))
      && selected.every((chosen) => !descriptorsOverlap(entry.descriptor, chosen.descriptor))
    ));
    if (compatible.length < gateCount - selected.length) return;
    const uncovered = exits.map((_, index) => index).filter((index) => !covered.has(index));
    let pool;
    if (uncovered.length) {
      const targetRecord = uncovered.sort((left, right) => {
        const leftCount = compatible.filter((entry) => entry.records.has(left)).length;
        const rightCount = compatible.filter((entry) => entry.records.has(right)).length;
        return leftCount - rightCount || exits[left].clearIndex - exits[right].clearIndex;
      })[0];
      pool = compatible.filter((entry) => entry.records.has(targetRecord));
    } else {
      pool = compatible;
    }
    pool.sort((left, right) => {
      const leftNew = [...left.records].filter((record) => !covered.has(record)).length;
      const rightNew = [...right.records].filter((record) => !covered.has(record)).length;
      const leftEarly = [...left.records].reduce((sum, record) => sum + Math.max(0, 32 - exits[record].clearIndex), 0);
      const rightEarly = [...right.records].reduce((sum, record) => sum + Math.max(0, 32 - exits[record].clearIndex), 0);
      return rightNew - leftNew || rightEarly - leftEarly
        || right.records.size - left.records.size
        || left.descriptor.size - right.descriptor.size
        || descriptorKey(left.descriptor).localeCompare(descriptorKey(right.descriptor));
    });
    for (const candidate of pool.slice(0, 80)) {
      visit([...selected, candidate]);
      if (winner) return;
    }
  };
  visit([]);
  if (!winner) {
    return {
      failure: `no non-overlapping ${gateCount}-gate boundary layout met all deadlines`,
      layoutNodes,
      completeLayouts,
      attempts: attempts.slice(-20),
    };
  }
  return { ...winner, layoutNodes, completeLayouts, attempts };
};

const findDeadlineAssignment = ({ exits, gateCount, deadlines, openingColorCount }) => {
  const gateIndices = Array.from({ length: gateCount }, (_, index) => index);
  const openingRecords = exits.map((_, index) => index).filter((index) => exits[index].opening);
  const hiddenRecords = exits.map((_, index) => index).filter((index) => !exits[index].opening);
  let permutationsTested = 0;
  let subsetsTested = 0;
  for (const deadlineByGate of uniquePermutations(deadlines)) {
    permutationsTested += 1;
    const eligible = exits.map((exit) => exit.reachable
      .map((candidate) => candidate.gateIndex)
      .filter((gateIndex) => deadlineByGate[gateIndex] <= exit.clearIndex));
    if (eligible.some((choices) => choices.length === 0)) continue;
    for (const openingGateSubset of combinations(gateIndices, openingColorCount)) {
      subsetsTested += 1;
      const openingSet = new Set(openingGateSubset);
      if (openingRecords.some((recordIndex) => !eligible[recordIndex].some((gate) => openingSet.has(gate)))) continue;
      const hiddenGateSubset = gateIndices.filter((gate) => !openingSet.has(gate));
      if (hiddenGateSubset.length > hiddenRecords.length) continue;
      const openingCoverage = coverRequiredGates(openingGateSubset, openingRecords, eligible);
      if (!openingCoverage) continue;
      const hiddenCoverage = coverRequiredGates(hiddenGateSubset, hiddenRecords, eligible);
      if (!hiddenCoverage) continue;
      const assignedGateByRecord = new Map([...openingCoverage, ...hiddenCoverage]);
      let valid = true;
      for (let recordIndex = 0; recordIndex < exits.length; recordIndex += 1) {
        if (assignedGateByRecord.has(recordIndex)) continue;
        const allowed = eligible[recordIndex]
          .filter((gate) => !exits[recordIndex].opening || openingSet.has(gate))
          .sort((left, right) => {
            const leftPath = exits[recordIndex].reachable.find((candidate) => candidate.gateIndex === left)?.path.length ?? Infinity;
            const rightPath = exits[recordIndex].reachable.find((candidate) => candidate.gateIndex === right)?.path.length ?? Infinity;
            return leftPath - rightPath || deadlineByGate[right] - deadlineByGate[left] || left - right;
          });
        if (!allowed.length) {
          valid = false;
          break;
        }
        assignedGateByRecord.set(recordIndex, allowed[0]);
      }
      if (!valid) continue;
      const used = new Set(assignedGateByRecord.values());
      if (used.size !== gateCount) continue;
      return {
        deadlineByGate,
        assignedGateByRecord,
        openingGateSubset,
        permutationsTested,
        subsetsTested,
      };
    }
  }
  return { failure: "no deadline/gate assignment satisfies route geometry and palette visibility", permutationsTested, subsetsTested };
};

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const immutableLevelProjection = (level) => {
  const { gates: _gates, blocks, ...levelWithoutGatesOrBlocks } = level;
  return {
    ...levelWithoutGatesOrBlocks,
    blocks: blocks.map((block) => {
      const { color: _color, layers, ...blockWithoutColours } = block;
      return {
        ...blockWithoutColours,
        layer_count: layers?.length ?? 1,
      };
    }),
  };
};

const results = [];
for (const id of selectedIds) {
  const contractEntry = contractById.get(id);
  const baseEntry = baseById.get(id);
  if (!contractEntry || !baseEntry) throw new Error(`${label(id)} missing contract or base candidate`);
  const target = contractEntry.our_design_target;
  const mechanism = target.mechanism_contract?.directional_exits;
  if (!mechanism) throw new Error(`${label(id)} has no directional exit contract`);
  const sourceBaseLevel = clone(baseEntry.level ?? baseEntry);
  const baseRoute = clone(baseEntry.route ?? []);
  const gateCount = Number(mechanism.ordinary_count ?? 0) + (mechanism.frozen_values?.length ?? 0);
  const deadlines = [
    ...Array.from({ length: Number(mechanism.ordinary_count ?? 0) }, () => 0),
    ...mechanism.frozen_values.map(Number),
  ];
  if (target.design_palette.length > gateCount) {
    throw new Error(`${label(id)} palette ${target.design_palette.length} exceeds gate count ${gateCount}`);
  }
  // The source witness is audited before gate geometry is changed.  It proves
  // the latest candidate itself is a valid starting authority, independently
  // from the newly generated seed and its fresh replay below.
  const analysis = skipBaseRouteReplay ? {
    baseReplay: { ok: false, skipped: true, reason: "runtime seed search has no pre-existing completion witness" },
  } : analyzeBaseRoute(sourceBaseLevel, baseRoute);
  const layouts = [];
  const verticalUnitLayout = verticalBoundaryUnitLayout(sourceBaseLevel, gateCount);
  const uniformThreeCellLayout = uniformThreeCellBoundaryLayout(sourceBaseLevel, gateCount);
  if (uniformThreeCellLayout && (forceAlternativeLayouts || sourceBaseLevel.gates.some((gate) => gate.size < 2))) {
    layouts.push({ name: "uniform_three_cell_boundary_layout", level: uniformThreeCellLayout });
  }
  if (verticalUnitLayout && sourceBaseLevel.gates.length !== gateCount) {
    layouts.push({ name: "vertical_boundary_unit_layout", level: verticalUnitLayout });
  }
  const expandedBaseLayout = clone(sourceBaseLevel);
  ensureGateCount(expandedBaseLayout, gateCount);
  layouts.push({
    name: sourceBaseLevel.gates.length === gateCount ? "base_gate_layout" : "expanded_base_gate_layout",
    level: expandedBaseLayout,
  });
  if (verticalUnitLayout && sourceBaseLevel.gates.length === gateCount
    && !sameJson(verticalUnitLayout.gates, expandedBaseLayout.gates)) {
    layouts.push({ name: "vertical_boundary_unit_layout", level: verticalUnitLayout });
  }

  let seeded = null;
  const layoutAttempts = [];
  for (const layout of layouts) {
    const attempt = dynamicDeadlineSeed({
      baseLevel: layout.level,
      baseRoute,
      target,
      deadlines,
    });
    layoutAttempts.push({
      layout: layout.name,
      ok: attempt.ok,
      reason: attempt.reason,
      states: attempt.exploredStates,
      milliseconds: attempt.elapsedMilliseconds,
      best: attempt.best,
    });
    if (attempt.ok) {
      seeded = { ...attempt, layoutName: layout.name, immutableBaseLevel: layout.level };
      break;
    }
  }
  if (!seeded) {
    throw new Error(`${label(id)} dynamic deadline search failed for every layout: ${JSON.stringify(layoutAttempts)}`);
  }
  const { level, route } = seeded;
  let exitCursor = 0;
  const plannedExits = route.filter((event) => event.exitSide).map((event) => {
    const gateIndex = seeded.exitGateIndices[exitCursor];
    const exit = {
      event,
      blockId: event.blockId,
      clearIndex: exitCursor,
      opening: seeded.openingIds.has(event.blockId),
      gateIndex,
    };
    exitCursor += 1;
    return exit;
  });

  validateLevel(level);
  const freshReplay = replay(level, route);
  if (!freshReplay.ok) throw new Error(`${label(id)} seeded route failed fresh replay: ${freshReplay.reason}`);
  const fullPalette = [...new Set(level.blocks.flatMap((block) => block.layers ?? [block.color]))].sort();
  const openingIds = openingBlockIds(level);
  const openingPalette = [...new Set(level.blocks
    .filter((block) => openingIds.has(block.id))
    .flatMap((block) => block.layers ?? [block.color]))].sort();
  const actualFrozen = sortedNumbers(level.gates.filter((gate) => gate.frozen > 0).map((gate) => gate.frozen));
  if (level.width !== target.board.cols || level.height !== target.board.rows
    || level.playable.length !== target.board.playable_cell_count
    || level.blocks.length !== target.full_level_block_count
    || !sameJson(immutableLevelProjection(level), immutableLevelProjection(seeded.immutableBaseLevel))
    || fullPalette.length !== target.full_level_color_count
    || openingPalette.length !== seeded.runtimeOpeningColorCount
    || level.gates.filter((gate) => !gate.frozen).length !== mechanism.ordinary_count
    || !sameJson(actualFrozen, sortedNumbers(mechanism.frozen_values))) {
    throw new Error(`${label(id)} seeded invariants do not exactly match the v6 contract`);
  }

  const firstUseByGate = new Map();
  plannedExits.forEach((exit) => {
    const gateIndex = exit.gateIndex;
    if (!firstUseByGate.has(gateIndex)) firstUseByGate.set(gateIndex, exit.clearIndex);
  });
  const gateTimeline = level.gates.map((gate, gateIndex) => ({
    gate_id: gate.id,
    color: gate.color,
    side: gate.side,
    offset: gate.offset,
    size: gate.size,
    frozen_value: gate.frozen ?? 0,
    first_available_after_cleared_layers: gate.frozen ?? 0,
    first_used_after_cleared_layers: firstUseByGate.get(gateIndex) ?? null,
    deadline_slack_layers: firstUseByGate.has(gateIndex)
      ? firstUseByGate.get(gateIndex) - (gate.frozen ?? 0)
      : null,
  }));
  results.push({
    level_id: label(id),
    target: clone(target),
    level,
    route,
    validation: {
      validate_level: "pass",
      base_route_fresh_replay: analysis.baseReplay,
      seeded_route_fresh_replay: freshReplay,
      board_shape_stage_and_count_invariants: "pass",
      full_palette: fullPalette,
      opening_palette: openingPalette,
      contract_opening_color_count: target.opening_color_count,
      runtime_opening_color_count: seeded.runtimeOpeningColorCount,
      opening_gate_capacity: seeded.openingCapacity,
      seed_search_mode: "dynamic_live_board_gate_deadline_binding",
      gate_layout: seeded.layoutName,
      gate_layout_attempts: layoutAttempts,
      seed_search_states: seeded.exploredStates,
      seed_search_milliseconds: seeded.elapsedMilliseconds,
    },
    gate_deadline_timeline: gateTimeline,
    peel_order: plannedExits.map((exit) => ({
      clear_layer_number: exit.clearIndex + 1,
      prior_cleared_layers: exit.clearIndex,
      block_id: exit.blockId,
      opening_visible: exit.opening,
      gate_id: level.gates[exit.gateIndex].id,
      gate_frozen_value: seeded.deadlineByGate.get(exit.gateIndex),
    })),
  });
  console.error(`${label(id)} PASS drags=${freshReplay.drags} states=${seeded.exploredStates} `
    + `deadlines=${level.gates.map((gate) => gate.frozen ?? 0).join(",")}`);
}

const overrideArtifact = {
  schema_version: "blockout-video-parity-gate-deadline-base-overrides-v1",
  generated_on: new Date().toISOString(),
  source: {
    contract: { path: displayPath(contractPath), sha256: sha256(contractText) },
    base_candidates: { path: displayPath(baseCandidatesPath), sha256: sha256(baseCandidatesText) },
    runtime_authority: "src/core/PuzzleModel.ts bundled with dependencies",
  },
  policy: {
    scope: "directional-exit gate deadline seeds only",
    immutable: "board/playable mask, block shapes/count/layer counts, stage devices, stage partition counts, timer, gate count, frozen-value multiset",
    mutable: "block colours, gate colours/side/offset/size, terminal peel paths/order",
    opening_palette_rule: "cap opening colours only when the frozen-value multiset proves fewer distinct gates can thaw before the opening stage is exhausted; preserve the exact full-level colour total",
    proof: "validateLevel plus complete fresh PuzzleModel replay",
  },
  levels: results,
};
const auditArtifact = {
  schema_version: "blockout-video-parity-gate-deadline-seed-audit-v1",
  generated_on: overrideArtifact.generated_on,
  inputs: overrideArtifact.source,
  output: { path: displayPath(outputOverridesPath) },
  summary: {
    requested: selectedIds.length,
    emitted: results.length,
    validate_level_passed: results.filter((entry) => entry.validation.validate_level === "pass").length,
    base_routes_fresh_replayed: results.filter((entry) => entry.validation.base_route_fresh_replay.ok).length,
    seeded_routes_fresh_replayed: results.filter((entry) => entry.validation.seeded_route_fresh_replay.ok).length,
    level_ids: results.map((entry) => entry.level_id),
  },
  levels: results.map((entry) => ({
    level_id: entry.level_id,
    validation: entry.validation,
    gate_deadline_timeline: entry.gate_deadline_timeline,
    peel_order: entry.peel_order,
  })),
};

const atomicWrite = async (artifacts) => {
  const nonce = `${process.pid}-${Date.now()}`;
  const temporary = artifacts.map((artifact) => ({ ...artifact, temporary: `${artifact.path}.tmp-${nonce}` }));
  try {
    await Promise.all(temporary.map(async (artifact) => {
      await mkdir(dirname(artifact.path), { recursive: true });
      await writeFile(artifact.temporary, `${JSON.stringify(artifact.value, null, 2)}\n`, "utf8");
    }));
    for (const artifact of temporary) await rename(artifact.temporary, artifact.path);
  } finally {
    await Promise.all(temporary.map((artifact) => rm(artifact.temporary, { force: true }).catch(() => {})));
  }
};

await atomicWrite([
  { path: outputOverridesPath, value: overrideArtifact },
  { path: outputAuditPath, value: auditArtifact },
]);
console.log(JSON.stringify(auditArtifact.summary, null, 2));

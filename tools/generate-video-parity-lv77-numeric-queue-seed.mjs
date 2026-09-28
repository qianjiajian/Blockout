import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Prepare Lv77's authored base witness for an early V3 generator spawn.
 *
 * The exact v6 contract fixes only this generator's queue histogram/length; it
 * does not fix numeric carrier identities. The generic matcher puts frozen-18
 * on the V3 queue head, which creates a strict capacity deadlock. This seed
 * adds a reversible early staging sequence that vacates the common V3 spawn;
 * the paired runtime carrier seed then assigns frozen-6 to that queue head and
 * frozen-18 to a late opening V3. Geometry, colours, gates, shapes, queue order
 * and every scalar contract remain inherited from the gate-deadline seed.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  input: ".codex-temp/video-parity-gate-deadline-seeds-r11/base-overrides.json",
  outputDir: ".codex-temp/video-parity-lv77-numeric-queue-seed-r11",
};

const parseArgs = (argv) => {
  const options = { ...defaults };
  const names = new Map([
    ["--contract", "contract"],
    ["--input", "input"],
    ["--output-dir", "outputDir"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = names.get(argv[index]);
    if (!name) throw new Error(`Unknown option: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argv[index]}`);
    options[name] = value;
    index += 1;
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
const absolute = (path) => resolve(root, path);
const display = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const clone = (value) => structuredClone(value);
const shapeIdOf = (shape) => {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (shape.length === 2 && width === 1 && height === 2) return "V2";
  if (shape.length === 3 && width === 1 && height === 3) return "V3";
  return `${shape.length}@${width}x${height}`;
};
const histogram = (blocks) => Object.fromEntries([...blocks.reduce((counts, block) => {
  const shape = shapeIdOf(block.shape);
  counts.set(shape, (counts.get(shape) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const contractPath = absolute(options.contract);
const inputPath = absolute(options.input);
const outputDir = absolute(options.outputDir);
const outputPath = resolve(outputDir, "base-overrides.json");
const auditPath = resolve(outputDir, "audit.json");
const [contractText, inputText] = await Promise.all([
  readFile(contractPath, "utf8"),
  readFile(inputPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const inputArtifact = JSON.parse(inputText);
const contractEntry = contract.levels.find((entry) => entry.level_id === "Lv077");
const sourceEntry = inputArtifact.levels.find((entry) => entry.level_id === "Lv077");
if (!contractEntry || !sourceEntry) throw new Error("Lv077 is missing from the contract or input overrides");
if (inputArtifact.source?.contract?.sha256?.toUpperCase() !== sha256(contractText)) {
  throw new Error("Input override is not bound to the active v6 contract");
}

const puzzleBundle = await build({
  stdin: {
    contents: `export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "lv77-numeric-queue-seed-entry.ts",
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
    const result = model.tryExit(event.blockId, event.exitSide);
    if (!result.ok) {
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
  for (let index = 0; index < route.length; index += 1) {
    const result = executeDrag(model, route[index]);
    if (!result.ok) return { ok: false, error: `event ${index + 1}: ${result.reason}` };
  }
  const snapshot = model.snapshot();
  return snapshot.complete
    ? { ok: true, drags: route.length, moves: snapshot.moves, cleared_layers: snapshot.cleared }
    : {
      ok: false,
      error: `${snapshot.blocks.length} board and ${snapshot.queuedBlocks.length} queued blocks remain`,
    };
};

const pointKey = (x, y) => `${x},${y}`;
const movementDirections = (block) => block.movementAxis === "horizontal"
  ? [[1, 0], [-1, 0]]
  : block.movementAxis === "vertical"
    ? [[0, 1], [0, -1]]
    : [[1, 0], [0, 1], [-1, 0], [0, -1]];
const cellsAt = (block, x = block.x, y = block.y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);
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
const reachablePositions = (model, blockId) => {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return [];
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
  return [...nodes.entries()].filter(([key]) => key !== start).map(([key, node]) => ({
    point: node.point,
    path: reconstructPath(nodes, key),
  }));
};
const axisAllowsSide = (block, side) => block.movementAxis === "horizontal"
  ? side === "left" || side === "right"
  : block.movementAxis === "vertical"
    ? side === "top" || side === "bottom"
    : true;
const coveringGate = (snapshot, block, x, y, preferredSide) => {
  const cells = cellsAt(block, x, y);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  return snapshot.gates.find((gate) => {
    if ((preferredSide && gate.side !== preferredSide) || !axisAllowsSide(block, gate.side)) return false;
    const atEdge = gate.side === "top" ? minY === 0
      : gate.side === "bottom" ? maxY === snapshot.height - 1
        : gate.side === "left" ? minX === 0
          : maxX === snapshot.width - 1;
    if (!atEdge) return false;
    const covered = gate.side === "top" || gate.side === "bottom"
      ? minX >= gate.offset && maxX < gate.offset + gate.size
      : minY >= gate.offset && maxY < gate.offset + gate.size;
    return covered && gate.color === block.color && (gate.frozen ?? 0) <= snapshot.cleared;
  });
};
const reachableExitPath = (model, blockId, preferredSide) => {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return null;
  const start = pointKey(block.x, block.y);
  const nodes = new Map([[start, { point: [block.x, block.y], parent: null }]]);
  const queue = [[block.x, block.y]];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    if (coveringGate(model.snapshot(), block, x, y, preferredSide)) {
      return reconstructPath(nodes, pointKey(x, y));
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
  return null;
};
const reachableAnyExit = (model, blockId) => ["top", "right", "bottom", "left"]
  .flatMap((side) => {
    const path = reachableExitPath(model, blockId, side);
    return path ? [{ side, path }] : [];
  })
  .sort((left, right) => left.path.length - right.path.length
    || ["top", "right", "bottom", "left"].indexOf(left.side)
      - ["top", "right", "bottom", "left"].indexOf(right.side))[0] ?? null;
const positionSignature = (model) => model.snapshot().blocks
  .map((block) => `${block.id}:${block.x},${block.y}`)
  .sort()
  .join("|");
const findEarlyUnblockSequence = ({ model, blockerId, forbiddenCells, maxDepth }) => {
  const goalReached = (candidateModel) => {
    const blocker = candidateModel.getBlock(blockerId);
    return blocker && cellsAt(blocker).every(([x, y]) => !forbiddenCells.has(pointKey(x, y)));
  };
  const queue = [{ model, actions: [] }];
  const seen = new Set([positionSignature(model)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (goalReached(current.model)) return current.actions;
    if (current.actions.length >= maxDepth) continue;
    const snapshot = current.model.snapshot();
    const active = snapshot.blocks
      .filter((block) => {
        const live = current.model.getBlock(block.id);
        return live && current.model.isBlockActive(live) && (live.frozen ?? 0) <= snapshot.cleared;
      })
      .sort((left, right) => Number(right.id === blockerId) - Number(left.id === blockerId)
        || left.id.localeCompare(right.id));
    for (const snapshotBlock of active) {
      const block = current.model.getBlock(snapshotBlock.id);
      for (const [dx, dy] of movementDirections(block)) {
        const nextX = block.x + dx;
        const nextY = block.y + dy;
        if (!current.model.canPlace(block, nextX, nextY)) continue;
        const trial = current.model.clone();
        const event = {
          blockId: block.id,
          path: [[nextX, nextY]],
          purpose: block.id === blockerId
            ? "early-generator-spawn-unblock"
            : "early-generator-unblock-support",
        };
        const result = executeDrag(trial, event);
        if (!result.ok) continue;
        const signature = positionSignature(trial);
        if (seen.has(signature)) continue;
        seen.add(signature);
        const action = { event, start: [block.x, block.y] };
        const actions = [...current.actions, action];
        if (goalReached(trial)) return actions;
        queue.push({ model: trial, actions });
      }
    }
  }
  return null;
};

const level = clone(sourceEntry.level);
const originalRoute = clone(sourceEntry.route);
validateLevel(level);
const originalReplay = replay(level, originalRoute);
if (!originalReplay.ok) throw new Error(`Inherited Lv077 route failed: ${originalReplay.error}`);

const target = contractEntry.our_design_target;
const generatorContract = target.mechanism_contract?.generators;
const numericContract = target.mechanism_contract?.numeric_ice;
if (generatorContract?.count !== 1
  || generatorContract.queue_lengths?.[0] !== 3
  || !sameJson(generatorContract.queue_histograms?.[0], { V2: 1, V3: 2 })
  || generatorContract.queue_shape_sequences !== null
  || generatorContract.preview_shapes !== null
  || numericContract?.count !== 2
  || !sameJson([...numericContract.values].sort((a, b) => a - b), [6, 18])
  || !sameJson(numericContract.shape_histogram, { V3: 2 })) {
  throw new Error("Lv077 generator/numeric contract no longer matches this narrow seed's preconditions");
}

const generatorPartition = target.stage_partitions.find((partition) => partition.kind === "side_generator");
const shutterGroups = [...level.blocks.reduce((groups, block) => {
  if (!block.shutterId) return groups;
  if (!groups.has(block.shutterId)) groups.set(block.shutterId, []);
  groups.get(block.shutterId).push(block);
  return groups;
}, new Map()).values()];
const stageBlocks = shutterGroups.find((blocks) => (
  blocks.length === generatorPartition.count
  && sameJson(histogram(blocks), generatorPartition.shape_histogram)
));
if (!stageBlocks) throw new Error("Could not identify Lv077's exact side-generator stage cohort");
const stageIds = new Set(stageBlocks.map((block) => block.id));
// The generator's common V3 spawn is selected at [3,1]. Its three cells are
// initially occupied by the opening V3 at x=3,y=2. Touch that blocker before
// five clears, while it is still an ordinary movable block, so a frozen-6 V3
// head can materialise early. The runtime carrier seed emitted in the second
// phase moves frozen-18 onto a late opening V3.
const expectedSpawn = [3, 1];
const expectedV3SpawnCells = new Set([pointKey(3, 1), pointKey(3, 2), pointKey(3, 3)]);
const spawnBlocker = level.blocks.find((block) => (
  shapeIdOf(block.shape) === "V3"
  && cellsAt(block).some(([x, y]) => expectedV3SpawnCells.has(pointKey(x, y)))
));
if (!spawnBlocker) throw new Error("Could not identify Lv077's opening V3 generator-spawn blocker");
const originalBlockerExitIndex = originalRoute.findIndex((event) => (
  event.blockId === spawnBlocker.id && event.exitSide
));
if (originalBlockerExitIndex < 0) throw new Error("Spawn blocker has no authored terminal peel");

let earlyUnblock = null;
for (let prefixLength = 0; prefixLength <= 4 && !earlyUnblock; prefixLength += 1) {
  const prefixModel = new PuzzleModel(level);
  let prefixValid = true;
  for (const event of originalRoute.slice(0, prefixLength)) {
    if (!executeDrag(prefixModel, event).ok) {
      prefixValid = false;
      break;
    }
  }
  if (!prefixValid) continue;
  const actions = findEarlyUnblockSequence({
    model: prefixModel,
    blockerId: spawnBlocker.id,
    forbiddenCells: expectedV3SpawnCells,
    maxDepth: 10,
  });
  if (!actions) continue;
  const reverseActions = [...actions].reverse().map((action) => ({
    blockId: action.event.blockId,
    path: [action.start],
    purpose: "base-witness-position-restore",
  }));
  const trialRoute = [
    ...clone(originalRoute.slice(0, prefixLength)),
    ...clone(actions.map((action) => action.event)),
    ...reverseActions,
    ...clone(originalRoute.slice(prefixLength)),
  ];
  const trialReplay = replay(level, trialRoute);
  if (!trialReplay.ok) continue;
  const finalBlocker = (() => {
    const probe = new PuzzleModel(level);
    for (const event of trialRoute.slice(0, prefixLength + actions.length)) executeDrag(probe, event);
    return probe.getBlock(spawnBlocker.id);
  })();
  earlyUnblock = {
    route: trialRoute,
    prefixClears: prefixLength,
    destination: [finalBlocker.x, finalBlocker.y],
    path: actions.flatMap((action) => action.event.blockId === spawnBlocker.id ? action.event.path : []),
    supportActions: actions.map((action) => action.event),
    returnPath: reverseActions,
  };
}
if (!earlyUnblock) throw new Error("No fresh-replayable early Lv077 generator-spawn unblock was found");

const routeSlots = earlyUnblock.route
  .map((event, index) => (stageIds.has(event.blockId) ? index : null))
  .filter((index) => index !== null);
if (routeSlots.length !== stageBlocks.length) throw new Error("Generator cohort does not have one authored peel per member");
const stageEvents = routeSlots.map((index) => earlyUnblock.route[index]);
const reorderedStageEvents = [...stageEvents];
const route = clone(earlyUnblock.route);
routeSlots.forEach((slot, index) => { route[slot] = reorderedStageEvents[index]; });
const inheritedStageColours = Object.fromEntries(stageBlocks.map((block) => [block.id, block.color]));
const seededStageColours = Object.fromEntries(stageBlocks.map((block) => [block.id, block.color]));
const reboundRoute = route;
const reorderedReplay = replay(level, reboundRoute);
if (!reorderedReplay.ok) throw new Error(`Reordered Lv077 route failed fresh replay: ${reorderedReplay.error}`);

const inheritedStageOrder = stageEvents.map((event) => event.blockId);
const seededStageOrder = reorderedStageEvents.map((event) => event.blockId);
const seededShapeSequence = seededStageOrder.map((id) => shapeIdOf(level.blocks.find((block) => block.id === id).shape));
if (!sameJson(seededShapeSequence, ["V3", "V3", "V2"])) {
  throw new Error(`Expected V3,V3,V2 queue order, got ${seededShapeSequence.join(",")}`);
}

const generatedOn = new Date().toISOString();
const levelEntry = {
  ...clone(sourceEntry),
  level,
  route: reboundRoute,
  validation: {
    ...clone(sourceEntry.validation ?? {}),
    inherited_route_fresh_replay: originalReplay,
    reordered_route_fresh_replay: reorderedReplay,
    generator_stage_id: generatorPartition.id,
    generator_stage_histogram: histogram(stageBlocks),
    inherited_generator_order: inheritedStageOrder,
    seeded_generator_order: seededStageOrder,
    seeded_generator_shape_sequence: seededShapeSequence,
    inherited_generator_stage_colours: inheritedStageColours,
    seeded_generator_stage_colours: seededStageColours,
    early_spawn_unblock: {
      block_id: spawnBlocker.id,
      prior_cleared_layers: earlyUnblock.prefixClears,
      destination: earlyUnblock.destination,
      path: earlyUnblock.path,
      support_actions: earlyUnblock.supportActions,
      base_witness_restore_actions: earlyUnblock.returnPath,
      expected_generator_spawn: expectedSpawn,
    },
    seeded_level_spec_sha256: sha256(JSON.stringify(level)),
  },
};
const outputArtifact = {
  schema_version: "blockout-video-parity-lv77-numeric-queue-base-override-v1",
  generated_on: generatedOn,
  source: {
    contract: { path: display(contractPath), sha256: sha256(contractText) },
    inherited_overrides: { path: display(inputPath), sha256: sha256(inputText) },
    runtime_authority: {
      path: "src/core/PuzzleModel.ts",
      bundled_with_dependencies_sha256: sha256(puzzleBundleSource),
    },
  },
  policy: {
    scope: "Lv077 early generator-spawn staging witness",
    immutable: "LevelSpec geometry/colours/gates/shapes/counts and every v6 scalar/mechanism contract",
    mutable: "authored temporary reposition events before the existing side-generator stage peel",
    rationale: "vacate the V3 spawn before five clears; a second runtime seed binds frozen-6 to that queue head and frozen-18 to a late opening V3",
  },
  levels: [levelEntry],
};
const audit = {
  schema_version: "blockout-video-parity-lv77-numeric-queue-seed-audit-v1",
  generated_on: generatedOn,
  sources: outputArtifact.source,
  invariants: {
    validate_level: "pass",
    inherited_route_fresh_replay: originalReplay,
    reordered_route_fresh_replay: reorderedReplay,
    geometry_shapes_counts_unchanged: true,
    full_colour_set_unchanged: true,
    queue_length: seededStageOrder.length,
    queue_histogram: histogram(stageBlocks),
    numeric_count: numericContract.count,
    numeric_values: numericContract.values,
    numeric_shape_histogram: numericContract.shape_histogram,
  },
  inherited_generator_order: inheritedStageOrder,
  seeded_generator_order: seededStageOrder,
  seeded_generator_shape_sequence: seededShapeSequence,
  inherited_generator_stage_colours: inheritedStageColours,
  seeded_generator_stage_colours: seededStageColours,
  early_spawn_unblock: {
    block_id: spawnBlocker.id,
    prior_cleared_layers: earlyUnblock.prefixClears,
    destination: earlyUnblock.destination,
    path: earlyUnblock.path,
    support_actions: earlyUnblock.supportActions,
    base_witness_restore_actions: earlyUnblock.returnPath,
    expected_generator_spawn: expectedSpawn,
  },
};

await mkdir(outputDir, { recursive: true });
const writeAtomic = async (path, value) => {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rm(path, { force: true });
  await rename(temporary, path);
};
await Promise.all([
  writeAtomic(outputPath, outputArtifact),
  writeAtomic(auditPath, audit),
]);
console.log(JSON.stringify({
  output: display(outputPath),
  audit: display(auditPath),
  inherited_generator_order: inheritedStageOrder,
  seeded_generator_order: seededStageOrder,
  seeded_generator_shape_sequence: seededShapeSequence,
  early_spawn_unblock: audit.early_spawn_unblock,
  fresh_replay: reorderedReplay,
}, null, 2));

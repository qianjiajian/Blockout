import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only Lv42 search.  The competitor scalars stay fixed (5x9,
// 29 playable cells, 24 SINGLE blocks, four colours and four ordinary exits),
// while the original board outline is replaced by a one-cell-wide serpentine
// tree.  This makes the five required empty cells useful but prevents them
// from turning the board into an open parking lot.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const inputRelative = option("--input", ".codex-temp/video-parity-v6-runtime-r22-all/runtime.generated.ts");
const contractRelative = option("--contract", "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json");
const outputDirRelative = option("--output-dir", ".codex-temp/video-parity-v6-lv42-path-search");
const attempts = Number(option("--attempts", "500"));
const validationMaxStates = Number(option("--validation-max-states", "50000"));
const keep = Number(option("--keep", "256"));
const idStart = Number(option("--id-start", "54001"));
const seed = Number(option("--seed", "420042")) >>> 0;
for (const [name, value] of Object.entries({ attempts, validationMaxStates, keep, idStart })) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive safe integer`);
}

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const [inputText, contractText] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(contractPath, "utf8"),
]);
const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv042")?.our_design_target;
if (!target) throw new Error("Lv42 is missing from the active design contract");
const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(inputPath)};
      export { PuzzleModel, validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv42-path-candidate-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const source = runtime.levels.find((level) => level.id === 42);
if (!source) throw new Error("Lv42 is missing from the input runtime");
if (source.width !== 5 || source.height !== 9 || source.playable.length !== 29
  || source.blocks.length !== 24 || source.gates.length !== 4
  || source.blocks.some((block) => block.shape.length !== 1)) {
  throw new Error("Lv42 source no longer matches the expected competitor scalar contract");
}

const path = [
  ...Array.from({ length: 5 }, (_, x) => [x, 0]),
  [4, 1],
  ...Array.from({ length: 5 }, (_, index) => [4 - index, 2]),
  [0, 3],
  ...Array.from({ length: 5 }, (_, x) => [x, 4]),
  [4, 5],
  ...Array.from({ length: 5 }, (_, index) => [4 - index, 6]),
  [0, 7],
  ...Array.from({ length: 5 }, (_, x) => [x, 8]),
];
if (path.length !== 29 || new Set(path.map(([x, y]) => `${x},${y}`)).size !== 29) {
  throw new Error("invalid serpentine path definition");
}
for (let left = 0; left < path.length; left += 1) {
  for (let right = left + 1; right < path.length; right += 1) {
    const adjacent = Math.abs(path[left][0] - path[right][0]) + Math.abs(path[left][1] - path[right][1]) === 1;
    if (adjacent && right !== left + 1) throw new Error(`path has a shortcut between ${left} and ${right}`);
  }
}

const boundaryDescriptors = path.flatMap(([x, y], pathIndex) => {
  const slots = [];
  if (y === 0) slots.push({ pathIndex, side: "top", offset: x });
  if (y === 8) slots.push({ pathIndex, side: "bottom", offset: x });
  if (x === 0) slots.push({ pathIndex, side: "left", offset: y });
  if (x === 4) slots.push({ pathIndex, side: "right", offset: y });
  return slots;
});

let randomState = seed || 1;
const random = () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 2 ** 32;
};
const shuffled = (values) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const label = (id) => `Lv${String(id).padStart(3, "0")}`;
const pathIndexByPoint = new Map(path.map((point, index) => [`${point[0]},${point[1]}`, index]));
const pathBetween = (from, to) => {
  const direction = Math.sign(to - from);
  if (!direction) return [];
  const result = [];
  for (let index = from + direction; index !== to + direction; index += direction) {
    result.push([...path[index]]);
  }
  return result;
};

// Exact 0-1 search specialized to the induced one-cell-wide path above.
// A token can slide anywhere between its two neighbouring tokens.  Reaching
// its matching gate and exiting costs zero; ending on another path cell costs
// one reposition.  Block order can never change on an induced path, so this is
// equivalent to PuzzleModel for this all-SINGLE, mechanism-free candidate.
const solvePathExactly = (level, maxStates, maxCost = 20) => {
  const ids = [...level.blocks].sort((left, right) => left.id.localeCompare(right.id));
  const ordinalById = new Map(ids.map((block, index) => [block.id, index]));
  const idByOrdinal = ids.map((block) => block.id);
  const colorByOrdinal = ids.map((block) => block.layers?.[0] ?? block.color);
  const tokens = level.blocks.map((block) => [
    ordinalById.get(block.id),
    pathIndexByPoint.get(`${block.x},${block.y}`),
  ]).sort((left, right) => left[1] - right[1]);
  if (tokens.some(([, position]) => position === undefined)) return { solved: false, reason: "off_path" };
  const gatesByColor = new Map();
  for (const gate of level.gates) {
    const point = gate.side === "top" ? [gate.offset, 0]
      : gate.side === "bottom" ? [gate.offset, level.height - 1]
        : gate.side === "left" ? [0, gate.offset]
          : [level.width - 1, gate.offset];
    const position = pathIndexByPoint.get(`${point[0]},${point[1]}`);
    if (position === undefined) return { solved: false, reason: "gate_off_path" };
    const entries = gatesByColor.get(gate.color) ?? [];
    entries.push({ position, side: gate.side });
    gatesByColor.set(gate.color, entries);
  }
  const stateKey = (state) => state.map(([ordinal, position]) => `${ordinal.toString(36)}.${position.toString(36)}`).join(",");
  const startKey = stateKey(tokens);
  const records = new Map([[startKey, { cost: 0, tokens, parent: null, action: null }]]);
  const buckets = Array.from({ length: maxCost + 1 }, () => []);
  buckets[0].push(startKey);
  let exploredStates = 0;
  for (let cost = 0; cost <= maxCost; cost += 1) {
    const queue = buckets[cost];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const key = queue[cursor];
      const record = records.get(key);
      if (!record || record.cost !== cost) continue;
      exploredStates += 1;
      if (exploredStates > maxStates) return { solved: false, reason: "state_cap", exploredStates };
      if (!record.tokens.length) {
        const drags = [];
        let trace = record;
        while (trace.parent !== null) {
          drags.push(trace.action);
          trace = records.get(trace.parent);
        }
        drags.reverse();
        return { solved: true, repositionOverhead: cost, exploredStates, drags };
      }
      for (let tokenIndex = 0; tokenIndex < record.tokens.length; tokenIndex += 1) {
        const [ordinal, position] = record.tokens[tokenIndex];
        const lower = tokenIndex === 0 ? 0 : record.tokens[tokenIndex - 1][1] + 1;
        const upper = tokenIndex === record.tokens.length - 1 ? path.length - 1 : record.tokens[tokenIndex + 1][1] - 1;
        for (const gate of gatesByColor.get(colorByOrdinal[ordinal]) ?? []) {
          if (gate.position < lower || gate.position > upper) continue;
          const next = record.tokens.filter((_token, index) => index !== tokenIndex);
          const nextKey = stateKey(next);
          if (!records.has(nextKey)) {
            records.set(nextKey, {
              cost,
              tokens: next,
              parent: key,
              action: { blockId: idByOrdinal[ordinal], path: pathBetween(position, gate.position), exitSide: gate.side },
            });
            buckets[cost].push(nextKey);
          }
        }
        if (cost >= maxCost) continue;
        for (let destination = lower; destination <= upper; destination += 1) {
          if (destination === position) continue;
          const next = record.tokens.map((token, index) => index === tokenIndex
            ? [token[0], destination]
            : token);
          const nextKey = stateKey(next);
          const nextCost = cost + 1;
          const previous = records.get(nextKey);
          if (previous && previous.cost <= nextCost) continue;
          records.set(nextKey, {
            cost: nextCost,
            tokens: next,
            parent: key,
            action: { blockId: idByOrdinal[ordinal], path: pathBetween(position, destination) },
          });
          buckets[nextCost].push(nextKey);
        }
      }
    }
  }
  return { solved: false, reason: "cost_cap", exploredStates };
};

const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlockStep(drag.blockId, x, y)) return null;
    }
    if (drag.exitSide) {
      if (!model.tryExit(drag.blockId, drag.exitSide).ok) return null;
    } else {
      repositions += 1;
    }
    if (!model.commitAction(true)) return null;
  }
  return model.snapshot().complete ? { repositions, actions: drags.length } : null;
};

const palette = [...new Set(source.blocks.map((block) => block.layers?.[0] ?? block.color))].sort();
if (palette.length !== 4) throw new Error(`expected four colours, received ${palette.length}`);
const applyPathContract = (level) => {
  level.playable = path.map((point) => [...point]);
  delete level.blocked;
  delete level.shutters;
  delete level.generators;
  delete level.elevators;
  delete level.conveyors;
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: level.designTargets?.calibratedDifficulty ?? 83,
    minimumRepositionOverhead: 9,
  };
};

const buildCraftedPairCorridor = () => {
  const [a, b, c, d] = palette;
  const level = structuredClone(source);
  const assignments = [
    ...[2, 4, 6, 8].flatMap((position) => [
      { position, color: b, role: "left-pair-forward" },
      { position: position + 1, color: a, role: "left-pair-blocker" },
    ]),
    ...[11, 13, 15, 17, 19].flatMap((position) => [
      { position, color: c, role: "middle-pair-forward" },
      { position: position + 1, color: b, role: "middle-pair-blocker" },
    ]),
    { position: 21, color: c, role: "middle-opener" },
    ...[23, 24, 25, 26, 27].map((position) => ({ position, color: d, role: "tail-opener" })),
  ];
  const blocks = [...level.blocks].sort((left, right) => left.id.localeCompare(right.id));
  if (assignments.length !== blocks.length) throw new Error("crafted assignment count mismatch");
  const blockAt = new Map();
  assignments.forEach((assignment, index) => {
    const block = blocks[index];
    [block.x, block.y] = path[assignment.position];
    block.shape = [[0, 0]];
    block.color = assignment.color;
    block.layers = [assignment.color];
    blockAt.set(assignment.position, block);
  });
  const gateSpecs = [
    { color: a, pathIndex: 1, side: "top", offset: 1 },
    { color: b, pathIndex: 10, side: "left", offset: 2 },
    { color: c, pathIndex: 22, side: "left", offset: 6 },
    { color: d, pathIndex: 28, side: "bottom", offset: 4 },
  ];
  level.gates.forEach((gate, index) => {
    const spec = gateSpecs[index];
    gate.side = spec.side;
    gate.offset = spec.offset;
    gate.size = 1;
    gate.color = spec.color;
    delete gate.frozen;
    delete gate.star;
  });
  applyPathContract(level);

  const route = [];
  for (let position = 27; position >= 23; position -= 1) {
    route.push({ blockId: blockAt.get(position).id, path: pathBetween(position, 28), exitSide: "bottom" });
  }
  route.push({ blockId: blockAt.get(21).id, path: pathBetween(21, 22), exitSide: "left" });

  const parkedMiddle = [];
  for (const [forwardPosition, blockerPosition] of [[19, 20], [17, 18], [15, 16], [13, 14], [11, 12]]) {
    for (let index = parkedMiddle.length - 1; index >= 0; index -= 1) {
      const parked = parkedMiddle[index];
      route.push({ blockId: parked.block.id, path: pathBetween(parked.position, parked.position + 1) });
      parked.position += 1;
    }
    const blocker = blockAt.get(blockerPosition);
    route.push({ blockId: blocker.id, path: pathBetween(blockerPosition, 23) });
    parkedMiddle.unshift({ block: blocker, position: 23 });
    route.push({ blockId: blockAt.get(forwardPosition).id, path: pathBetween(forwardPosition, 22), exitSide: "left" });
  }
  for (const parked of parkedMiddle) {
    route.push({ blockId: parked.block.id, path: pathBetween(parked.position, 10), exitSide: "left" });
  }

  const parkedLeft = [];
  for (const [forwardPosition, blockerPosition] of [[8, 9], [6, 7], [4, 5], [2, 3]]) {
    for (let index = parkedLeft.length - 1; index >= 0; index -= 1) {
      const parked = parkedLeft[index];
      route.push({ blockId: parked.block.id, path: pathBetween(parked.position, parked.position + 1) });
      parked.position += 1;
    }
    const blocker = blockAt.get(blockerPosition);
    route.push({ blockId: blocker.id, path: pathBetween(blockerPosition, 11) });
    parkedLeft.unshift({ block: blocker, position: 11 });
    route.push({ blockId: blockAt.get(forwardPosition).id, path: pathBetween(forwardPosition, 10), exitSide: "left" });
  }
  for (const parked of parkedLeft) {
    route.push({ blockId: parked.block.id, path: pathBetween(parked.position, 1), exitSide: "top" });
  }
  const coreGroups = [
    ...[[2, 3], [4, 5], [6, 7], [8, 9]],
    ...[[11, 12], [13, 14], [15, 16], [17, 18], [19, 20]],
  ].map(([left, right], index) => ({
    id: `pair-core-${String(index + 1).padStart(2, "0")}`,
    stage_key: "opening",
    block_ids: [blockAt.get(left).id, blockAt.get(right).id],
    floor: 1,
  }));
  return { level, route, coreGroups };
};

const candidates = [];
const crafted = buildCraftedPairCorridor();
runtime.validateLevel(crafted.level);
const craftedReplay = replay(crafted.level, crafted.route);
if (!craftedReplay || craftedReplay.repositions !== 25) {
  throw new Error(`crafted pair corridor replay failed: ${JSON.stringify(craftedReplay)}`);
}
crafted.level.id = idStart;
crafted.level.name = `${source.name} crafted pair corridor`;
candidates.push({
  level_id: label(idStart),
  search_attempt: "crafted-pair-corridor",
  target: structuredClone(target),
  level: crafted.level,
  route: crafted.route,
  witness_metrics: craftedReplay,
  core_groups: crafted.coreGroups,
});
let validated = 0;
let solved = 0;
for (let attempt = 0; attempt < attempts; attempt += 1) {
  const level = structuredClone(source);
  const holes = new Set(shuffled(Array.from({ length: path.length }, (_, index) => index)).slice(0, 5));
  const occupied = path.filter((_point, index) => !holes.has(index));
  const colors = shuffled(Array.from({ length: 24 }, (_value, index) => palette[index % palette.length]));
  const orderedBlocks = shuffled(level.blocks);
  orderedBlocks.forEach((block, index) => {
    [block.x, block.y] = occupied[index];
    block.shape = [[0, 0]];
    block.color = colors[index];
    block.layers = [colors[index]];
  });

  const gateCells = shuffled([...new Set(boundaryDescriptors.map((slot) => slot.pathIndex))]).slice(0, 4);
  const gateSlots = gateCells.map((pathIndex) => shuffled(
    boundaryDescriptors.filter((slot) => slot.pathIndex === pathIndex),
  )[0]);
  const gateColors = shuffled(palette);
  level.gates.forEach((gate, index) => {
    gate.side = gateSlots[index].side;
    gate.offset = gateSlots[index].offset;
    gate.size = 1;
    gate.color = gateColors[index];
    delete gate.frozen;
    delete gate.star;
  });
  applyPathContract(level);
  try {
    runtime.validateLevel(level);
    validated += 1;
  } catch {
    continue;
  }
  const result = solvePathExactly(level, validationMaxStates);
  if (!result.solved) {
    globalThis.gc?.();
    continue;
  }
  const replayed = replay(level, result.drags);
  if (!replayed) continue;
  solved += 1;
  if (replayed.repositions < 9) continue;
  const syntheticId = idStart + candidates.length;
  level.id = syntheticId;
  level.name = `${source.name} serpentine candidate ${attempt}`;
  const route = result.drags.map((drag) => ({
    blockId: drag.blockId,
    path: drag.path.map(([x, y]) => [x, y]),
    ...(drag.exitSide ? { exitSide: drag.exitSide } : {}),
  }));
  candidates.push({
    level_id: label(syntheticId),
    search_attempt: attempt,
    target: structuredClone(target),
    level,
    route,
    witness_metrics: replayed,
  });
  candidates.sort((left, right) => right.witness_metrics.repositions - left.witness_metrics.repositions
    || left.search_attempt - right.search_attempt);
  if (candidates.length > keep) candidates.length = keep;
  if (candidates.length % 10 === 0) {
    console.log(`attempt=${attempt} retained=${candidates.length} best-upper=${candidates[0].witness_metrics.repositions}`);
  } else if ((attempt + 1) % 25 === 0) {
    console.log(`attempt=${attempt + 1}/${attempts} validated=${validated} solved=${solved} retained=${candidates.length}`);
  }
  globalThis.gc?.();
}

// Reindex only after ranking so ids are contiguous and proof selection is easy.
candidates.forEach((candidate, index) => {
  const id = idStart + index;
  candidate.level_id = label(id);
  candidate.level.id = id;
});
const witnesses = candidates.map((candidate) => ({
  level_id: candidate.level_id,
  drags: candidate.route,
  metrics: candidate.witness_metrics,
  source_attempt: candidate.search_attempt,
}));
const corePlans = candidates.filter((candidate) => candidate.core_groups?.length).map((candidate) => ({
  level_id: candidate.level_id,
  source: "crafted disjoint pair-corridor plan; independent verifier must rebuild every relaxed core",
  proof_scope: "disjoint relaxed-core lower bound",
  groups: candidate.core_groups,
}));
const artifact = {
  schema_version: "blockout-video-parity-lv42-serpentine-candidates-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    path: inputRelative,
    sha256: sha256(inputText),
    contract: { path: contractRelative, sha256: sha256(contractText) },
  },
  contract_scalars: {
    rows: 9,
    cols: 5,
    playable_cell_count: 29,
    block_count: 24,
    shape_histogram: { SINGLE: 24 },
    color_count: 4,
    ordinary_exit_count: 4,
    required_reposition_floor: 9,
  },
  board_mask: ["#####", "....#", "#####", "#....", "#####", "....#", "#####", "#....", "#####"],
  search: { attempts, validation_max_states: validationMaxStates, validated, solved, retained: candidates.length, seed },
  levels: candidates,
};
const outputDir = resolve(root, outputDirRelative);
await mkdir(outputDir, { recursive: true });
const candidateText = `${JSON.stringify(artifact, null, 2)}\n`;
const witnessText = `${JSON.stringify(witnesses, null, 2)}\n`;
await Promise.all([
  writeFile(resolve(outputDir, "proof-input.json"), candidateText, "utf8"),
  writeFile(resolve(outputDir, "proof-witness.json"), witnessText, "utf8"),
  writeFile(resolve(outputDir, "core-plan.json"), `${JSON.stringify(corePlans, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  output: relative(root, outputDir).replaceAll("\\", "/"),
  attempts,
  validated,
  solved,
  retained: candidates.length,
  proof_input_sha256: sha256(candidateText),
  best_witness_repositions: candidates[0]?.witness_metrics.repositions ?? null,
}, null, 2));
if (!candidates.length) process.exitCode = 1;

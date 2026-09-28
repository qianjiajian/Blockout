import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Isolated Lv17 layout search.  A candidate survives only when a deliberately
// stronger first-deadline relaxation still needs seven paid removals: every
// matching purple body which can geometrically reach the ordinary exit is
// erased for free, while one paid action may erase any other whole body into
// infinite parking.  Whole-body erasure dominates an in-board reposition, so
// the resulting seven-action bound is conservative for PuzzleModel play.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, process.argv[2]
  ?? ".codex-temp/video-parity-lv17-lv32-floor-seeds/runtime.generated.ts");
const outputDir = resolve(root, process.argv[3]
  ?? ".codex-temp/video-parity-lv17-deadline-layout-search");
const trials = Number(process.argv[4] ?? 2_000);
const stateCap = Number(process.argv[5] ?? 350_000);
const seed = Number(process.argv[6] ?? 0x17_07_2026) >>> 0;
const completionCap = Number(process.argv[7] ?? 100_000);
const corePlacement = process.argv[8] ?? "top-pair";
const coreLayoutsPath = resolve(root, process.argv[9]
  ?? ".codex-temp/video-parity-lv17-h3-core-layouts/run1/results.json");

const bundle = await build({
  stdin: {
    contents: `export { VIDEO_PARITY_LEVELS } from ${JSON.stringify(inputPath.replaceAll("\\", "/"))}; export { solveLevelForValidation } from "./src/core/levelSolver.ts";`,
    resolveDir: root,
    sourcefile: "lv17-deadline-layout-runtime.ts",
    loader: "ts",
  },
  bundle: true, platform: "node", format: "esm",
  write: false, logLevel: "silent",
});
const imported = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const source = structuredClone(imported.VIDEO_PARITY_LEVELS.find((level) => level.id === 17));
if (!source) throw new Error("Lv17 missing from input");
if (source.blocks.length > 30) throw new Error("32-bit mask implementation supports at most 30 blocks");

const purpleIds = new Set([
  "cc-017-b1-04", "cc-017-b1-10", "cc-017-b1-03", "cc-017-b1-15",
  "cc-017-b1-19", "cc-017-b1-20", "cc-017-b1-22", "cc-017-b1-17",
]);
const directId = "cc-017-b1-03";
const lateFrozenIds = new Set(["cc-017-b1-05", "cc-017-b1-06", "cc-017-b1-08", "cc-017-b1-09"]);
const lateFrozenIdList = [...lateFrozenIds];
const directIndex = source.blocks.findIndex((block) => block.id === directId);
if (directIndex < 0 || source.blocks[directIndex].shape.length !== 3) throw new Error("Expected direct H3 carrier");
const purpleIndices = source.blocks.map((block, index) => purpleIds.has(block.id) ? index : -1).filter((index) => index >= 0);
if (purpleIndices.length !== 8) throw new Error("Expected eight first-deadline purple carriers");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
let randomState = seed || 1;
const random = () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x1_0000_0000;
};
const shuffled = (values) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
};

const playable = new Set(source.playable.map(([x, y]) => `${x},${y}`));
const anchorsByShape = new Map();
const shapeKey = (shape) => shape.map(([x, y]) => `${x},${y}`).sort().join(";");
const anchorsFor = (block) => {
  const key = shapeKey(block.shape);
  if (!anchorsByShape.has(key)) {
    const anchors = [];
    for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
      if (block.shape.every(([dx, dy]) => playable.has(`${x + dx},${y + dy}`))) anchors.push([x, y]);
    }
    anchorsByShape.set(key, anchors);
  }
  return anchorsByShape.get(key);
};

const searchedCoreLayouts = corePlacement === "searched"
  ? JSON.parse(await readFile(coreLayoutsPath, "utf8")).results
    .filter((entry) => entry.reposition_overhead >= 2 && !entry.block_colors.includes("purple"))
  : [];
if (corePlacement === "searched" && !searchedCoreLayouts.length) throw new Error("No searched H3 core layouts available");

function randomPacking(directY, searchedCore) {
  const direct = source.blocks[directIndex];
  const highAnchors = searchedCore?.anchors ?? (corePlacement === "top-bottom"
    ? [[0, 0], [3, 0], [0, 7], [3, 7]]
    : [[0, 0], [3, 0], [0, 1], [3, 1]]);
  const fixedAnchors = new Map([
    [directId, [3, directY]],
    ["cc-017-b1-05", highAnchors[0]],
    ["cc-017-b1-06", highAnchors[1]],
    ["cc-017-b1-08", highAnchors[2]],
    ["cc-017-b1-09", highAnchors[3]],
  ]);
  const ordered = shuffled(source.blocks.filter((block) => !fixedAnchors.has(block.id)))
    .sort((left, right) => right.shape.length - left.shape.length);
  const occupied = new Set();
  const positions = new Map(fixedAnchors);
  for (const [blockId, [x, y]] of fixedAnchors) {
    const block = source.blocks.find((entry) => entry.id === blockId);
    if (!block) throw new Error(`Missing fixed Lv17 carrier ${blockId}`);
    for (const [dx, dy] of block.shape) {
      const key = `${x + dx},${y + dy}`;
      if (!playable.has(key) || occupied.has(key)) return false;
      occupied.add(key);
    }
  }
  let nodes = 0;
  const recurse = (index) => {
    if (++nodes > 250_000) return false;
    if (index === ordered.length) return occupied.size === playable.size;
    const block = ordered[index];
    const anchors = shuffled(anchorsFor(block));
    for (const [x, y] of anchors) {
      const cells = block.shape.map(([dx, dy]) => `${x + dx},${y + dy}`);
      if (cells.some((cell) => occupied.has(cell))) continue;
      cells.forEach((cell) => occupied.add(cell));
      positions.set(block.id, [x, y]);
      if (recurse(index + 1)) return positions;
      positions.delete(block.id);
      cells.forEach((cell) => occupied.delete(cell));
    }
    return false;
  };
  return recurse(0);
}

const cellKey = (x, y) => y * source.width + x;
const allMask = (1 << source.blocks.length) - 1;
const purpleMask = purpleIndices.reduce((mask, index) => mask | (1 << index), 0);
const gate = { side: "right", offset: 4, size: 2 };
const fits = (block, x, y) => block.shape.every(([dx, dy]) => (
  x + dx >= 0 && x + dx < source.width && y + dy >= 0 && y + dy < source.height
));
const atGate = (block, x, y) => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  return maxX === source.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
};

function relaxedMinimum(level) {
  const reachCache = new Map();
  const canReachGate = (mask, blockIndex) => {
    const cacheKey = `${mask}:${blockIndex}`;
    if (reachCache.has(cacheKey)) return reachCache.get(cacheKey);
    const block = level.blocks[blockIndex];
    const occupied = new Set();
    for (let index = 0; index < level.blocks.length; index += 1) {
      if (index === blockIndex || !(mask & (1 << index))) continue;
      const other = level.blocks[index];
      for (const [dx, dy] of other.shape) occupied.add(cellKey(other.x + dx, other.y + dy));
    }
    const canPlace = (x, y) => fits(block, x, y)
      && block.shape.every(([dx, dy]) => !occupied.has(cellKey(x + dx, y + dy)));
    const queue = [[block.x, block.y]];
    const seen = new Set([`${block.x},${block.y}`]);
    let reached = false;
    for (let cursor = 0; cursor < queue.length && !reached; cursor += 1) {
      const [x, y] = queue[cursor];
      if (atGate(block, x, y)) { reached = true; break; }
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const nextX = x + dx;
        const nextY = y + dy;
        const key = `${nextX},${nextY}`;
        if (seen.has(key) || !canPlace(nextX, nextY)) continue;
        seen.add(key);
        queue.push([nextX, nextY]);
      }
    }
    reachCache.set(cacheKey, reached);
    return reached;
  };
  const closeFree = (mask) => {
    let next = mask;
    while (true) {
      let removed = false;
      for (const index of purpleIndices) {
        const bit = 1 << index;
        if (!(next & bit) || !canReachGate(next, index)) continue;
        next &= ~bit;
        removed = true;
      }
      if (!removed) return next;
    }
  };
  const start = closeFree(allMask);
  if ((start & purpleMask) === 0) return { minimum: 0, states: 1, removed: [] };
  const queue = [{ mask: start, cost: 0 }];
  const seen = new Set([start]);
  const parent = new Map();
  for (let cursor = 0; cursor < queue.length && cursor < stateCap; cursor += 1) {
    const current = queue[cursor];
    if (current.cost >= 7) continue;
    for (let index = 0; index < level.blocks.length; index += 1) {
      const bit = 1 << index;
      if (!(current.mask & bit)) continue;
      const next = closeFree(current.mask & ~bit);
      if (seen.has(next)) continue;
      seen.add(next);
      parent.set(next, { previous: current.mask, removed: index });
      if ((next & purpleMask) === 0) {
        const removed = [index];
        let back = current.mask;
        while (back !== start) {
          const entry = parent.get(back);
          removed.push(entry.removed);
          back = entry.previous;
        }
        removed.reverse();
        return { minimum: current.cost + 1, states: seen.size, removed };
      }
      queue.push({ mask: next, cost: current.cost + 1 });
    }
  }
  return { minimum: null, states: seen.size, removed: null, capped: seen.size >= stateCap };
}

const survivors = [];
let packed = 0;
let floorSeven = 0;
const proofHistogram = {};
for (let trial = 0; trial < trials; trial += 1) {
  const searchedCore = corePlacement === "searched"
    ? searchedCoreLayouts[Math.floor(random() * searchedCoreLayouts.length)]
    : null;
  const positions = randomPacking(4 + (trial & 1), searchedCore);
  if (!positions) continue;
  packed += 1;
  const level = structuredClone(source);
  for (const block of level.blocks) [block.x, block.y] = positions.get(block.id);
  if (searchedCore) for (let index = 0; index < lateFrozenIdList.length; index += 1) {
    const block = level.blocks.find((entry) => entry.id === lateFrozenIdList[index]);
    block.color = searchedCore.block_colors[index];
    block.layers = [searchedCore.block_colors[index]];
  }
  const proof = relaxedMinimum(level);
  const proofKey = proof.minimum == null ? "cap" : String(proof.minimum);
  proofHistogram[proofKey] = (proofHistogram[proofKey] ?? 0) + 1;
  if (trial % 100 === 0) console.log(`trial=${trial} packed=${packed} floor7=${floorSeven} histogram=${JSON.stringify(proofHistogram)}`);
  if (proof.minimum !== 7) continue;
  floorSeven += 1;
  console.log(`trial=${trial} floor7 states=${proof.states} core=${searchedCore?.attempt ?? corePlacement}`);
  const lateCore = structuredClone(level);
  lateCore.blocks = lateCore.blocks.filter((block) => lateFrozenIds.has(block.id)).map((block) => {
    const copy = structuredClone(block);
    copy.layers = [copy.layers?.[0] ?? copy.color];
    copy.color = copy.layers[0];
    delete copy.frozen;
    return copy;
  });
  lateCore.gates = lateCore.gates.map((gateEntry) => {
    const copy = structuredClone(gateEntry);
    delete copy.frozen;
    return copy;
  });
  delete lateCore.shutters;
  delete lateCore.generators;
  delete lateCore.elevators;
  delete lateCore.conveyors;
  delete lateCore.designTargets;
  const lateCoreResult = imported.solveLevelForValidation(lateCore, completionCap);
  if (!lateCoreResult.solved || lateCoreResult.repositionOverhead < 2) {
    console.log(`trial=${trial} floor7 rejected late-core=${lateCoreResult.solved ? lateCoreResult.repositionOverhead : "unsolved"}/${lateCoreResult.exploredStates}`);
    continue;
  }
  const completion = imported.solveLevelForValidation(level, completionCap);
  survivors.push({
    trial,
    proof,
    late_core: {
      block_ids: [...lateFrozenIds],
      solved: true,
      explored_states: lateCoreResult.exploredStates,
      reposition_overhead: lateCoreResult.repositionOverhead,
      route: lateCoreResult.drags,
    },
    completion: {
      solved: completion.solved,
      explored_states: completion.exploredStates,
      reposition_overhead: completion.repositionOverhead ?? null,
      route: completion.solved ? completion.drags : null,
    },
    level,
    searched_core: searchedCore,
  });
  console.log(`trial=${trial} found floor7 states=${proof.states} completion=${completion.solved ? `yes/${completion.repositionOverhead}` : `no/${completion.exploredStates}`}`);
  if (completion.solved || survivors.length >= 24) break;
}

await mkdir(outputDir, { recursive: true });
const artifact = {
  schema: "blockout-video-parity-lv17-deadline-layout-search-v1",
  input: { path: inputPath, sha256: sha256(await readFile(inputPath)) },
  core_placement: corePlacement,
  seed, trials, state_cap: stateCap, completion_state_cap: completionCap, packed, survivors: survivors.length,
  floor_seven_candidates: floorSeven,
  proof_histogram: proofHistogram,
  ordinary_gate: gate,
  purple_ids: [...purpleIds],
  proof_relaxation: "matching purple whole bodies erase free; one paid action erases any whole body into infinite parking",
  candidates: survivors,
};
const outputPath = resolve(outputDir, "candidates.json");
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: outputPath, packed, survivors: survivors.length }, null, 2));

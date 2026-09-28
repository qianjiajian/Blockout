import { build } from "esbuild";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportRoot = resolve(root, "playtest-results/experiments/competitor-composition-r140");
const outputDir = resolve(reportRoot, "strict-worker-tight-mid");
const proofScript = resolve(reportRoot, "prove-reposition-lower-bound.mjs");
const contractPath = resolve(root, "deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v4.json");
const attemptPaths = [
  resolve(reportRoot, "strict-worker-mid/strict-attempt-history.json"),
  resolve(reportRoot, "strict-guided-smoke/strict-attempt-history.json"),
];
const requestedIds = (process.env.TIGHT_LEVEL_IDS ?? "33,36").split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isSafeInteger(value) && value >= 1 && value <= 100);
const validationCap = Math.max(100, Number.parseInt(process.env.TIGHT_VALIDATION_CAP ?? "1800", 10) || 1800);
const proofMaxStates = Math.max(1, Number.parseInt(process.env.TIGHT_PROOF_MAX_STATES ?? "120000", 10) || 120000);
const proofMaxMemoryMb = Math.max(64, Number.parseInt(process.env.TIGHT_PROOF_MAX_MEMORY_MB ?? "420", 10) || 420);
const maxProofCandidates = Math.max(1, Number.parseInt(process.env.TIGHT_PROOF_CANDIDATES ?? "12", 10) || 12);
const maxRectangles = Math.max(1, Number.parseInt(process.env.TIGHT_RECTANGLES ?? "8", 10) || 8);
const trialsPerRectangle = Math.max(1, Number.parseInt(process.env.TIGHT_LAYOUT_TRIALS ?? "24", 10) || 24);
const maxGeneratedCandidates = Math.max(1, Number.parseInt(process.env.TIGHT_GENERATED_CANDIDATES ?? "24", 10) || 24);
const colorTrialsPerPack = Math.max(16, Number.parseInt(process.env.TIGHT_COLOR_TRIALS ?? "16", 10) || 16);
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const keyOf = (x, y) => `${x},${y}`;

const bundle = await build({
  stdin: {
    contents: `import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts"; import { solveLevelForValidation } from "./src/core/levelSolver.ts"; export { PuzzleModel, validateLevel, solveLevelForValidation };`,
    resolveDir: root,
    sourcefile: "tight-stage-mid-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);

const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  for (let index = 0; index < drags.length; index += 1) {
    const drag = drags[index];
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) return { ok: false, failedAt: index, reason: "move rejected" };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      return { ok: false, failedAt: index, reason: "exit rejected" };
    }
    if (!model.commitAction()) return { ok: false, failedAt: index, reason: "commit rejected" };
  }
  return { ok: model.snapshot().complete, failedAt: null, reason: model.snapshot().complete ? null : "route incomplete" };
};

const routeMetrics = (route) => ({
  actions: route.length,
  exits: route.filter((drag) => Boolean(drag.exitSide)).length,
  repositions: route.filter((drag) => !drag.exitSide).length,
  grid_steps: route.reduce((sum, drag) => sum + (drag.path?.length ?? 0), 0),
});

const foreignMouthScore = (level) => level.gates.reduce((score, gate) => {
  const mouth = new Set(Array.from({ length: gate.size }, (_, index) => {
    const coordinate = gate.offset + index;
    if (gate.side === "top") return keyOf(coordinate, 0);
    if (gate.side === "bottom") return keyOf(coordinate, level.height - 1);
    if (gate.side === "left") return keyOf(0, coordinate);
    return keyOf(level.width - 1, coordinate);
  }));
  return score + level.blocks.reduce((sum, block) => (
    sum + (block.color !== gate.color && blockCells(block).some(([x, y]) => mouth.has(keyOf(x, y))) ? 1 : 0)
  ), 0);
}, 0);

const shapeId = (shape) => {
  const normalized = [...shape].map(([x, y]) => `${x},${y}`).sort().join(";");
  const variants = {
    SINGLE: [[[0, 0]]], H2: [[[0, 0], [1, 0]]], V2: [[[0, 0], [0, 1]]],
    H3: [[[0, 0], [1, 0], [2, 0]]], V3: [[[0, 0], [0, 1], [0, 2]]],
    SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
    L3: [
      [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]],
      [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]],
    ],
    T4: [
      [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]],
    ],
    L4: [
      [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]],
      [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
    ],
    CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
    RECT2X3: [
      [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    ],
    SQ3: [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]],
  };
  return Object.entries(variants).find(([, choices]) => choices.some((choice) => (
    choice.map(([x, y]) => `${x},${y}`).sort().join(";") === normalized
  )))?.[0] ?? "UNKNOWN";
};

const contractMismatches = (level, target) => {
  const mismatches = [];
  if (level.width !== target.board.cols || level.height !== target.board.rows) mismatches.push("rows_cols");
  const mask = Array.from({ length: level.height }, (_, y) => Array.from({ length: level.width }, (_, x) => (
    level.playable.some(([px, py]) => px === x && py === y) ? "#" : "."
  )).join(""));
  if (JSON.stringify(mask) !== JSON.stringify(target.board.playable_mask)) mismatches.push("playable_mask");
  if (level.blocks.length !== target.full_level_block_count) mismatches.push("block_count");
  const histogram = level.blocks.reduce((result, block) => {
    const id = shapeId(block.shape);
    result[id] = (result[id] ?? 0) + 1;
    return result;
  }, {});
  if (JSON.stringify(Object.entries(histogram).sort()) !== JSON.stringify(Object.entries(target.full_level_shape_histogram).sort())) mismatches.push("shape_histogram");
  if (level.blocks.reduce((sum, block) => sum + block.shape.length, 0) !== target.full_level_occupied_cell_count) mismatches.push("occupied_cell_count");
  const palette = [...new Set(level.blocks.map((block) => block.color))].sort();
  if (palette.length !== target.full_level_color_count) mismatches.push("color_count");
  if (JSON.stringify(palette) !== JSON.stringify([...target.design_palette].sort())) mismatches.push("palette");
  return mismatches;
};

const unique = (values) => [...new Set(values)];
const makeRng = (seed) => () => {
  seed |= 0;
  seed = seed + 0x6D2B79F5 | 0;
  let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
  value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};
const shuffled = (values, seed) => {
  const copy = [...values];
  const rng = makeRng(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(rng() * (index + 1));
    [copy[index], copy[selected]] = [copy[selected], copy[index]];
  }
  return copy;
};

const shapeBounds = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});
const requiredSpan = (shape, side) => {
  const bounds = shapeBounds(shape);
  return side === "top" || side === "bottom" ? bounds.width : bounds.height;
};
const slotsOverlap = (left, right) => left.side === right.side
  && left.offset < right.offset + right.size
  && right.offset < left.offset + left.size;

const packBlocks = (blocks, points, seed, boardWidth, boardHeight) => {
  const playable = new Set(points.map(([x, y]) => keyOf(x, y)));
  const placements = new Map(blocks.map((block, blockIndex) => {
    const choices = [];
    const bounds = shapeBounds(block.shape);
    for (let y = 0; y <= Math.max(...points.map(([, py]) => py)) + 1 - bounds.height; y += 1) {
      for (let x = 0; x <= Math.max(...points.map(([px]) => px)) + 1 - bounds.width; x += 1) {
        const keys = block.shape.map(([dx, dy]) => keyOf(x + dx, y + dy));
        if (keys.every((key) => playable.has(key))) choices.push({ x, y, keys });
      }
    }
    return [blockIndex, shuffled(choices, seed ^ ((blockIndex + 1) * 0x9e3779b1))];
  }));
  if ([...placements.values()].some((choices) => !choices.length)) return undefined;
  const order = blocks.map((_, index) => index).sort((left, right) => (
    placements.get(left).length - placements.get(right).length
    || blocks[right].shape.length - blocks[left].shape.length
  ));
  const occupied = new Set();
  const selected = new Map();
  let nodes = 0;
  const visit = (depth) => {
    nodes += 1;
    if (nodes > 40_000) return false;
    if (depth === order.length) return true;
    const blockIndex = order[depth];
    const choices = placements.get(blockIndex).filter((choice) => choice.keys.every((key) => !occupied.has(key)));
    choices.sort((left, right) => {
      const adjacency = (choice) => choice.keys.reduce((sum, key) => {
        const [x, y] = key.split(",").map(Number);
        return sum + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => occupied.has(keyOf(x + dx, y + dy))).length;
      }, 0);
      const edgeCells = (choice, block) => block.shape.filter(([dx, dy]) => (
        choice.x + dx === 0 || choice.x + dx === boardWidth - 1
        || choice.y + dy === 0 || choice.y + dy === boardHeight - 1
      )).length;
      return edgeCells(right, blocks[blockIndex]) - edgeCells(left, blocks[blockIndex])
        || adjacency(right) - adjacency(left);
    });
    for (const choice of choices) {
      choice.keys.forEach((key) => occupied.add(key));
      selected.set(blockIndex, choice);
      if (visit(depth + 1)) return true;
      selected.delete(blockIndex);
      choice.keys.forEach((key) => occupied.delete(key));
    }
    return false;
  };
  if (!visit(0)) return undefined;
  return blocks.map((block, index) => ({
    ...structuredClone(block),
    x: selected.get(index).x,
    y: selected.get(index).y,
  }));
};

const randomizeColors = (blocks, palette, seed) => {
  const rng = makeRng(seed ^ 0xa5a5a5a5);
  const order = shuffled(blocks.map((_, index) => index), seed);
  const colors = Array(blocks.length);
  order.forEach((blockIndex, index) => {
    colors[blockIndex] = index < palette.length ? palette[index] : palette[Math.floor(rng() * palette.length)];
  });
  return blocks.map((block, index) => ({ ...block, color: colors[index] }));
};

const placementCanExitAtGate = (block, gate, width, height) => {
  const cells = blockCells(block);
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const atEdge = gate.side === "top" ? Math.min(...ys) === 0
    : gate.side === "bottom" ? Math.max(...ys) === height - 1
      : gate.side === "left" ? Math.min(...xs) === 0
        : Math.max(...xs) === width - 1;
  if (!atEdge || requiredSpan(block.shape, gate.side) > gate.size) return false;
  return gate.side === "top" || gate.side === "bottom"
    ? Math.min(...xs) >= gate.offset && Math.max(...xs) < gate.offset + gate.size
    : Math.min(...ys) >= gate.offset && Math.max(...ys) < gate.offset + gate.size;
};

const allocateGates = ({ blocks, groups, palette, playable, width, height, seed }) => {
  const playableKeys = new Set(playable.map(([x, y]) => keyOf(x, y)));
  const sides = ["top", "right", "bottom", "left"];
  const gateCells = (slot) => new Set(Array.from({ length: slot.size }, (_, index) => {
    const coordinate = slot.offset + index;
    if (slot.side === "top") return keyOf(coordinate, 0);
    if (slot.side === "bottom") return keyOf(coordinate, height - 1);
    if (slot.side === "left") return keyOf(0, coordinate);
    return keyOf(width - 1, coordinate);
  }));
  const choicesFor = (color, colorIndex) => {
    const shapes = blocks.filter((block) => block.color === color).map((block) => block.shape);
    const choices = [];
    for (const side of sides) {
      const limit = side === "top" || side === "bottom" ? width : height;
      const size = Math.max(...shapes.map((shape) => requiredSpan(shape, side)));
      for (let offset = 0; offset + size <= limit; offset += 1) {
        const slot = { side, offset, size };
        if ([...gateCells(slot)].every((key) => playableKeys.has(key))) choices.push(slot);
      }
    }
    const randomized = shuffled(choices, seed ^ ((colorIndex + 1) * 0x9e3779b1));
    const foreignScore = (slot) => {
      const mouth = gateCells(slot);
      let score = 0;
      for (const block of blocks) {
        const touches = blockCells(block).some(([x, y]) => mouth.has(keyOf(x, y)));
        if (touches) score += block.color === color ? -12 : 100;
      }
      return score;
    };
    randomized.sort((left, right) => foreignScore(right) - foreignScore(left));
    return { color, choices: randomized.slice(0, 16) };
  };
  const needs = palette.map(choicesFor).sort((left, right) => left.choices.length - right.choices.length);
  const chosen = [];
  let nodes = 0;
  const visit = (index) => {
    nodes += 1;
    if (nodes > 20_000) return false;
    if (index === needs.length) {
      return groups.every((group) => group.some((block) => chosen.some((gate) => (
        gate.color === block.color && placementCanExitAtGate(block, gate, width, height)
      ))));
    }
    for (const slot of needs[index].choices) {
      if (chosen.some((gate) => slotsOverlap(gate, slot))) continue;
      chosen.push({ ...slot, color: needs[index].color });
      if (visit(index + 1)) return true;
      chosen.pop();
    }
    return false;
  };
  return visit(0) ? chosen.map((gate, index) => ({ id: `tight-gate-${index + 1}`, ...gate })) : undefined;
};

const colorForFixedGateSlots = ({ blocks, groupLengths, gateSlots, palette, width, height, seed }) => {
  if (gateSlots.length !== palette.length) return undefined;
  const colors = shuffled(palette, seed ^ 0x7f4a7c15);
  const gates = gateSlots.map((slot, index) => ({
    id: `tight-gate-${index + 1}`,
    side: slot.side,
    offset: slot.offset,
    size: slot.size,
    color: colors[index],
  }));
  const compatible = (block, gate) => requiredSpan(block.shape, gate.side) <= gate.size;
  if (blocks.some((block) => !gates.some((gate) => compatible(block, gate)))) return undefined;
  const assigned = new Map();
  let groupStart = 0;
  for (let groupIndex = 0; groupIndex < groupLengths.length; groupIndex += 1) {
    const indices = Array.from({ length: groupLengths[groupIndex] }, (_, index) => groupStart + index);
    groupStart += groupLengths[groupIndex];
    const direct = shuffled(indices.flatMap((blockIndex) => gates.flatMap((gate) => (
      placementCanExitAtGate(blocks[blockIndex], gate, width, height) ? [{ blockIndex, gate }] : []
    ))), seed ^ ((groupIndex + 1) * 0x51f15e));
    if (!direct.length) return undefined;
    assigned.set(direct[0].blockIndex, direct[0].gate.color);
  }
  for (const gate of shuffled(gates, seed ^ 0xa5a5a5a5)) {
    if ([...assigned.values()].includes(gate.color)) continue;
    const candidate = shuffled(blocks.map((_, index) => index), seed ^ gate.color.charCodeAt(0))
      .find((index) => !assigned.has(index) && compatible(blocks[index], gate));
    if (candidate === undefined) return undefined;
    assigned.set(candidate, gate.color);
  }
  const colored = blocks.map((block, index) => {
    if (assigned.has(index)) return { ...block, color: assigned.get(index) };
    const choices = gates.filter((gate) => compatible(block, gate));
    const gate = choices[Math.floor(makeRng(seed ^ ((index + 1) * 7919))() * choices.length)];
    return { ...block, color: gate.color };
  });
  return { blocks: colored, gates };
};

const playableRectangles = (level) => {
  const playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => keyOf(x, y)));
  const rectangles = [];
  for (let height = 2; height <= level.height - 2; height += 1) {
    for (let width = 2; width <= level.width - 2; width += 1) {
      for (let y = 0; y + height <= level.height; y += 1) {
        for (let x = 0; x + width <= level.width; x += 1) {
          const cells = Array.from({ length: width * height }, (_, index) => [x + index % width, y + Math.floor(index / width)]);
          if (cells.every(([cx, cy]) => playable.has(keyOf(cx, cy)) && !blocked.has(keyOf(cx, cy)))) {
            rectangles.push({ x, y, width, height, cells, area: width * height });
          }
        }
      }
    }
  }
  return rectangles.sort((left, right) => right.area - left.area || left.y - right.y || left.x - right.x);
};

const blockCells = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const withOnlyBlocks = (level, blocks, blocked = level.blocked ?? []) => {
  const result = structuredClone(level);
  result.blocks = blocks.map((block) => {
    const copy = structuredClone(block);
    delete copy.shutterId;
    delete copy.frozen;
    delete copy.layers;
    return copy;
  });
  result.blocked = blocked;
  if (!result.blocked.length) delete result.blocked;
  delete result.shutters;
  delete result.elevators;
  delete result.conveyors;
  delete result.designTargets;
  delete result.onboardingHint;
  delete result.strategyNudge;
  delete result.strategyFocus;
  return result;
};

const solve = (level) => {
  try {
    runtime.validateLevel(level);
    const result = runtime.solveLevelForValidation(level, validationCap);
    if (!result.solved) return undefined;
    const replayed = replay(level, result.drags);
    if (!replayed.ok) return undefined;
    return { ...result, metrics: routeMetrics(result.drags) };
  } catch {
    return undefined;
  }
};

const runChild = (args) => new Promise((resolveChild, rejectChild) => {
  const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", rejectChild);
  child.on("close", (code) => {
    if (code === 0) resolveChild({ stdout, stderr });
    else rejectChild(new Error(`proof child exited ${code}: ${stdout}\n${stderr}`));
  });
});

const proveStage = async ({ levelId, candidateHash, stageNumber, level, route, floor }) => {
  if (floor === 0) {
    const replayed = replay(level, route);
    return {
      accepted: replayed.ok,
      report: null,
      report_sha256: null,
      input_sha256: null,
      witness_input_sha256: null,
      level_solver_sha256: null,
      proof: {
        level_id: `Lv${String(levelId).padStart(3, "0")}`,
        available: true,
        proof: {
          algorithm: "nonnegative-reposition-trivial-bound",
          status: "floor_zero_trivially_proven",
          target_reposition_overhead: 0,
          lower_bound_statement_proven: true,
          floor_disproven: false,
          explored_states: 0,
        },
        selected_solution_witness: { replay: { replayed: replayed.ok, complete: replayed.ok } },
        certification: { target_floor_certified_for_playable_level: replayed.ok },
      },
    };
  }
  const tag = `tight-mid-${String(levelId).padStart(3, "0")}-${candidateHash.slice(0, 12)}-s${stageNumber}-f${floor}`;
  const inputPath = resolve(outputDir, `proof-input-${tag}.json`);
  const witnessPath = resolve(outputDir, `proof-witness-${tag}.json`);
  const levelLabel = `Lv${String(levelId).padStart(3, "0")}`;
  await Promise.all([
    writeFile(inputPath, `${JSON.stringify({
      title: "Tight-stage additive component candidate",
      applied_to_live_campaign: false,
      levels: [{
        level_id: levelLabel,
        target: { recommended_minimum_reposition_overhead: floor },
        audit: { target_reposition_overhead: floor },
        level,
        route,
      }],
    }, null, 2)}\n`, "utf8"),
    writeFile(witnessPath, `${JSON.stringify([{ level_id: levelLabel, drags: route }], null, 2)}\n`, "utf8"),
  ]);
  await runChild([
    `--max-old-space-size=${Math.min(800, proofMaxMemoryMb + 100)}`,
    "--expose-gc", proofScript,
    "--input", inputPath,
    "--witnesses", witnessPath,
    "--report-tag", tag,
    "--levels", String(levelId),
    "--algorithm", "bounded-dfs",
    "--max-states", String(proofMaxStates),
    "--max-memory-mb", String(proofMaxMemoryMb),
    "--transposition-cap", "90000",
    "--validation-max-states", "1000",
    "--skip-official", "--stop-after-floor",
    "--no-relaxed-bound-pruning", "--symmetry-reduction",
  ]);
  const reportPath = resolve(reportRoot, `reposition-lower-bound-report-${tag}-lv${String(levelId).padStart(3, "0")}.json`);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const entry = report.reports.find((item) => item.level_id === levelLabel);
  const accepted = entry?.certification?.target_floor_certified_for_playable_level === true
    && entry?.proof?.lower_bound_statement_proven === true
    && entry?.proof?.floor_disproven !== true
    && entry?.selected_solution_witness?.replay?.replayed === true;
  return {
    accepted,
    report: relative(root, reportPath).replaceAll("\\", "/"),
    report_sha256: sha256(await readFile(reportPath)),
    input_sha256: report.input_sha256,
    witness_input_sha256: report.witness_input_sha256,
    level_solver_sha256: report.level_solver_sha256,
    proof: entry,
  };
};

const contract = JSON.parse(await readFile(contractPath, "utf8"));
const histories = [];
for (const path of attemptPaths) {
  const parsed = await readFile(path, "utf8").then(JSON.parse).catch(() => ({ attempts: [] }));
  histories.push(...(parsed.attempts ?? []));
}
await mkdir(outputDir, { recursive: true });
const acceptedPath = resolve(outputDir, "strict-accepted-tight-stage-candidates.json");
const previousAccepted = await readFile(acceptedPath, "utf8").then(JSON.parse).catch(() => ({ levels: [] }));
const acceptedById = new Map((previousAccepted.levels ?? []).map((entry) => [entry.level_id, entry]));

for (const levelId of requestedIds) {
  const levelLabel = `Lv${String(levelId).padStart(3, "0")}`;
  const target = contract.levels[levelId - 1].our_design_target;
  const floor = target.recommended_minimum_reposition_overhead;
  const rawAttempts = histories.filter((attempt) => attempt.level_id === levelLabel && attempt.attempted_candidate?.level);
  const sourceByHash = new Map();
  for (const attempt of rawAttempts) {
    const level = attempt.attempted_candidate.level;
    if (level.shutters?.length || level.elevators?.length || level.conveyors?.length) continue;
    if (level.gates.some((gate) => (gate.frozen ?? 0) > 0 || gate.star)) continue;
    if (level.blocks.some((block) => (block.frozen ?? 0) > 0 || block.star || (block.layers?.length ?? 1) !== 1)) continue;
    sourceByHash.set(sha256(JSON.stringify(level)), attempt.attempted_candidate);
  }
  const sources = [...sourceByHash.values()];
  const scan = [];
  const candidateByHash = new Map();
  const diagnostics = { partition: 0, pack_front: 0, pack_rear: 0, gate: 0, solve_front: 0, solve_rear: 0, witness_below_floor: 0, full_replay: 0, contract: 0 };
  let subsetOrdinal = 0;

  if (process.env.TIGHT_LEGACY_SPLIT === "1") for (const source of sources) {
    const level = source.level;
    const ids = level.blocks.map((block) => block.id);
    const exitOrder = unique(source.route.filter((drag) => drag.exitSide).map((drag) => drag.blockId));
    const subsets = [];
    for (let size = 2; size <= Math.min(8, ids.length - 2); size += 1) {
      subsets.push(exitOrder.slice(-size), exitOrder.slice(0, size));
    }
    for (let seed = 0; seed < 48; seed += 1) {
      const size = 2 + (seed % Math.min(7, Math.max(1, ids.length - 3)));
      subsets.push(shuffled(ids, levelId * 1009 + seed * 7919).slice(0, size));
    }

    for (const backIdsRaw of subsets) {
      const backIds = new Set(backIdsRaw);
      if (backIds.size < 2 || backIds.size >= ids.length) continue;
      const frontBlocks = level.blocks.filter((block) => !backIds.has(block.id));
      const backBlocks = level.blocks.filter((block) => backIds.has(block.id));
      const frontOccupied = new Set(frontBlocks.flatMap(blockCells).map(([x, y]) => keyOf(x, y)));
      const blocked = new Set((level.blocked ?? []).map(([x, y]) => keyOf(x, y)));
      const coverCells = level.playable.filter(([x, y]) => !frontOccupied.has(keyOf(x, y)) && !blocked.has(keyOf(x, y)));
      if (!coverCells.length) continue;
      const stageTwo = withOnlyBlocks(level, backBlocks);
      const second = solve(stageTwo);
      if (!second || second.metrics.repositions < 1) continue;

      for (const cover of coverCells.slice(0, 8)) {
        const stageOne = withOnlyBlocks(level, frontBlocks, [...(level.blocked ?? []), cover]);
        const first = solve(stageOne);
        if (!first || first.metrics.repositions < 1) continue;
        const totalWitness = first.metrics.repositions + second.metrics.repositions;
        if (totalWitness < floor) continue;
        const shutterId = `tight-stage-${String(levelId).padStart(3, "0")}-rear`;
        const fullLevel = structuredClone(level);
        fullLevel.name = `${level.name} · 紧密前后仓`;
        fullLevel.blocks = [
          ...frontBlocks.map((block) => structuredClone(block)),
          ...backBlocks.map((block) => ({ ...structuredClone(block), shutterId })),
        ];
        fullLevel.shutters = [{
          id: shutterId,
          x: cover[0], y: cover[1], width: 1, height: 1,
          count: frontBlocks.length,
          skin: levelId < 35 ? "staging" : "staging",
        }];
        fullLevel.parMoves = first.minimumDrags + second.minimumDrags;
        const route = [...first.drags, ...second.drags];
        try { runtime.validateLevel(fullLevel); } catch { continue; }
        const fullReplay = replay(fullLevel, route);
        if (!fullReplay.ok) continue;
        const mismatches = contractMismatches(fullLevel, target);
        if (mismatches.length) continue;
        const hash = sha256(JSON.stringify(fullLevel));
        candidateByHash.set(hash, {
          level_id: levelLabel,
          target,
          candidate_sha256: hash,
          source_candidate_sha256: sha256(JSON.stringify(level)),
          subset_ordinal: subsetOrdinal,
          cover,
          front_block_count: frontBlocks.length,
          back_block_count: backBlocks.length,
          stage_one: { level: stageOne, route: first.drags, witness: first.metrics },
          stage_two: { level: stageTwo, route: second.drags, witness: second.metrics },
          total_witness_overhead: totalWitness,
          contract_mismatches: mismatches,
          full_replay: fullReplay,
          level: fullLevel,
          route,
        });
        subsetOrdinal += 1;
        break;
      }
    }
  }

  // True front/rear warehouses: a large rectangular shutter removes a region
  // from stage one, while both stages are independently repacked. Blocks from
  // the rear stage start inside the covered footprint and are hidden until the
  // front stage is completely cleared.
  const sourceLevel = sources[0]?.level;
  if (sourceLevel) {
    const rectangles = playableRectangles(sourceLevel);
    const baseBlocks = sourceLevel.blocks.map((block) => {
      const copy = structuredClone(block);
      delete copy.shutterId;
      delete copy.frozen;
      delete copy.layers;
      return copy;
    });
    const totalArea = baseBlocks.reduce((sum, block) => sum + block.shape.length, 0);
    const playableKeys = new Set(sourceLevel.playable.map(([x, y]) => keyOf(x, y)));
    const baseBlocked = new Set((sourceLevel.blocked ?? []).map(([x, y]) => keyOf(x, y)));
    const usableCount = sourceLevel.playable.filter(([x, y]) => !baseBlocked.has(keyOf(x, y))).length;
    let layoutTrials = 0;

    const selectedRectangles = [];
    const rectangleAreaCounts = new Map();
    for (const rectangle of rectangles) {
      const used = rectangleAreaCounts.get(rectangle.area) ?? 0;
      if (used >= 2) continue;
      rectangleAreaCounts.set(rectangle.area, used + 1);
      selectedRectangles.push(rectangle);
      if (selectedRectangles.length >= maxRectangles) break;
    }
    for (const rectangle of selectedRectangles) {
      const frontPoints = sourceLevel.playable.filter(([x, y]) => (
        !rectangle.cells.some(([rx, ry]) => rx === x && ry === y) && !baseBlocked.has(keyOf(x, y))
      ));
      const rearPoints = rectangle.cells;
      // Maximise front-stage density first. The rear stage may be sparser
      // because its entire board is empty at release; its purpose is a safe
      // deterministic second warehouse, not extra static obstruction.
      const minimumRearArea = Math.max(totalArea - frontPoints.length, Math.ceil(rectangle.area * 0.30));
      if (minimumRearArea >= totalArea || frontPoints.length < 4) continue;

      for (let trial = 0; trial < trialsPerRectangle; trial += 1) {
        layoutTrials += 1;
        const ordered = shuffled(baseBlocks, levelId * 1_000_003 + rectangle.x * 7919 + rectangle.y * 1543 + trial * 313);
        const rear = [];
        let rearArea = 0;
        for (const block of ordered) {
          if (rearArea >= minimumRearArea && rear.length >= 2) break;
          if (rearArea + block.shape.length > rectangle.area) continue;
          rear.push(block);
          rearArea += block.shape.length;
        }
        const rearIds = new Set(rear.map((block) => block.id));
        const front = baseBlocks.filter((block) => !rearIds.has(block.id));
        if (front.length < 2 || rear.length < 2) { diagnostics.partition += 1; continue; }
        const frontArea = totalArea - rearArea;
        if (frontArea > frontPoints.length || frontArea / frontPoints.length < 0.88 || rearArea / rectangle.area < 0.25) { diagnostics.partition += 1; continue; }

        const seed = levelId * 10_000_019 + rectangle.area * 104729 + trial * 8191;
        const packedFront = packBlocks(front, frontPoints, seed, sourceLevel.width, sourceLevel.height);
        const packedRear = packBlocks(rear, rearPoints, seed ^ 0x51f15e, sourceLevel.width, sourceLevel.height);
        if (!packedFront) { diagnostics.pack_front += 1; continue; }
        if (!packedRear) { diagnostics.pack_rear += 1; continue; }
        for (let colorTrial = 0; colorTrial < colorTrialsPerPack; colorTrial += 1) {
        const colorSeed = seed ^ ((colorTrial + 1) * 0x6d2b79f5);
        const coloredResult = colorForFixedGateSlots({
          blocks: [...packedFront, ...packedRear],
          groupLengths: [packedFront.length, packedRear.length],
          gateSlots: sourceLevel.gates,
          palette: target.design_palette,
          width: sourceLevel.width,
          height: sourceLevel.height,
          seed: colorSeed,
        });
        if (!coloredResult) { diagnostics.gate += 1; continue; }
        const colored = coloredResult.blocks;
        const frontBlocks = colored.slice(0, packedFront.length);
        const backBlocks = colored.slice(packedFront.length);
        const gates = coloredResult.gates;
        const levelTemplate = {
          ...structuredClone(sourceLevel),
          gates,
          blocks: colored,
        };
        delete levelTemplate.shutters;
        delete levelTemplate.elevators;
        delete levelTemplate.conveyors;
        const stageOne = withOnlyBlocks(levelTemplate, frontBlocks, [...(sourceLevel.blocked ?? []), ...rectangle.cells]);
        const stageTwo = withOnlyBlocks(levelTemplate, backBlocks, sourceLevel.blocked ?? []);
        const first = solve(stageOne);
        if (!first) { diagnostics.solve_front += 1; continue; }
        const second = solve(stageTwo);
        if (!second) { diagnostics.solve_rear += 1; continue; }
        const totalWitness = first.metrics.repositions + second.metrics.repositions;
        if (totalWitness < floor) { diagnostics.witness_below_floor += 1; continue; }

        const shutterId = `tight-stage-${String(levelId).padStart(3, "0")}-rear`;
        const fullLevel = structuredClone(levelTemplate);
        fullLevel.name = `${sourceLevel.name} · 紧密前后仓`;
        fullLevel.blocks = [
          ...frontBlocks.map((block) => structuredClone(block)),
          ...backBlocks.map((block) => ({ ...structuredClone(block), shutterId })),
        ];
        fullLevel.shutters = [{
          id: shutterId,
          x: rectangle.x,
          y: rectangle.y,
          width: rectangle.width,
          height: rectangle.height,
          count: frontBlocks.length,
          skin: levelId < 35 ? "staging" : "staging",
        }];
        fullLevel.parMoves = first.minimumDrags + second.minimumDrags;
        const route = [...first.drags, ...second.drags];
        try { runtime.validateLevel(fullLevel); } catch { continue; }
        const fullReplay = replay(fullLevel, route);
        if (!fullReplay.ok) { diagnostics.full_replay += 1; continue; }
        const mismatches = contractMismatches(fullLevel, target);
        if (mismatches.length) { diagnostics.contract += 1; continue; }
        const hash = sha256(JSON.stringify(fullLevel));
        candidateByHash.set(hash, {
          level_id: levelLabel,
          target,
          candidate_sha256: hash,
          source_candidate_sha256: sha256(JSON.stringify(sourceLevel)),
          generation_mode: "tight_rectangular_front_rear_repack",
          layout_trial: layoutTrials,
          shutter_footprint: rectangle,
          front_density: Number((frontArea / frontPoints.length).toFixed(4)),
          rear_density: Number((rearArea / rectangle.area).toFixed(4)),
          front_block_count: frontBlocks.length,
          back_block_count: backBlocks.length,
          stage_one: { level: stageOne, route: first.drags, witness: first.metrics },
          stage_two: { level: stageTwo, route: second.drags, witness: second.metrics },
          total_witness_overhead: totalWitness,
          foreign_mouth_score: foreignMouthScore(fullLevel),
          contract_mismatches: mismatches,
          full_replay: fullReplay,
          level: fullLevel,
          route,
        });
        if (candidateByHash.size >= maxGeneratedCandidates) break;
        }
        if (candidateByHash.size >= maxGeneratedCandidates) break;
      }
      console.error(`${levelLabel}: shutter ${rectangle.width}x${rectangle.height}@${rectangle.x},${rectangle.y} scanned=${layoutTrials}, candidates=${candidateByHash.size}`);
      if (candidateByHash.size >= maxGeneratedCandidates) break;
    }
  }

  const candidates = [...candidateByHash.values()].sort((left, right) => (
    right.total_witness_overhead - left.total_witness_overhead
    || right.foreign_mouth_score - left.foreign_mouth_score
    || right.stage_one.witness.repositions - left.stage_one.witness.repositions
    || left.candidate_sha256.localeCompare(right.candidate_sha256)
  ));
  let accepted;
  for (const candidate of candidates.slice(0, maxProofCandidates)) {
    const lower = Math.max(0, floor - candidate.stage_two.witness.repositions);
    const upper = Math.min(floor, candidate.stage_one.witness.repositions);
    const splits = Array.from({ length: Math.max(0, upper - lower + 1) }, (_, index) => lower + index)
      .sort((a, b) => Math.abs(b - candidate.stage_one.witness.repositions) - Math.abs(a - candidate.stage_one.witness.repositions));
    const proofAttempts = [];
    for (const firstFloor of splits) {
      const secondFloor = floor - firstFloor;
      const firstProof = await proveStage({
        levelId, candidateHash: candidate.candidate_sha256, stageNumber: 1,
        level: candidate.stage_one.level, route: candidate.stage_one.route, floor: firstFloor,
      });
      const secondProof = await proveStage({
        levelId, candidateHash: candidate.candidate_sha256, stageNumber: 2,
        level: candidate.stage_two.level, route: candidate.stage_two.route, floor: secondFloor,
      });
      proofAttempts.push({ floors: [firstFloor, secondFloor], accepted: firstProof.accepted && secondProof.accepted, components: [firstProof, secondProof] });
      if (firstProof.accepted && secondProof.accepted) {
        accepted = {
          ...candidate,
          proof: {
            algorithm: "sequential-stage-additive-bounded-dfs",
            target_reposition_overhead: floor,
            certified_additive_lower_bound: floor,
            conditions: {
              single_sequential_shutter: true,
              shutter_release_equals_initial_clear_load: true,
              deterministic_empty_boundary_between_stages: true,
              no_counter_or_dynamic_mechanism_carries_across_boundary: true,
            },
            selected_split: [firstFloor, secondFloor],
            components: [firstProof, secondProof],
            full_puzzle_model_replay: candidate.full_replay,
          },
        };
        break;
      }
    }
    scan.push({ candidate_sha256: candidate.candidate_sha256, total_witness_overhead: candidate.total_witness_overhead, proof_attempts: proofAttempts });
    if (accepted) break;
    await writeFile(resolve(outputDir, `checkpoint-${levelLabel.toLowerCase()}.json`), `${JSON.stringify({
      level_id: levelLabel,
      generated_candidates: candidates.length,
      proof_scanned: scan.length,
      accepted: false,
      scan,
    }, null, 2)}\n`, "utf8");
  }

  if (accepted) acceptedById.set(levelLabel, accepted);
  await Promise.all([
    writeFile(resolve(outputDir, `candidate-scan-${levelLabel.toLowerCase()}.json`), `${JSON.stringify({
      level_id: levelLabel,
      target_reposition_overhead: floor,
      source_candidates: sources.length,
      diagnostics,
      generated_candidates: candidates.length,
      proof_scanned: scan.length,
      accepted: Boolean(accepted),
      accepted_candidate: accepted ?? null,
      scan,
    }, null, 2)}\n`, "utf8"),
    writeFile(resolve(outputDir, `checkpoint-${levelLabel.toLowerCase()}.json`), `${JSON.stringify({
      level_id: levelLabel,
      generated_candidates: candidates.length,
      proof_scanned: scan.length,
      accepted: Boolean(accepted),
      accepted_candidate_sha256: accepted?.candidate_sha256 ?? null,
    }, null, 2)}\n`, "utf8"),
    writeFile(acceptedPath, `${JSON.stringify({
      title: "Strictly certified tight front/rear warehouse candidates",
      generated_on: new Date().toISOString(),
      applied_to_live_campaign: false,
      levels: [...acceptedById.values()].sort((a, b) => a.level.id - b.level.id),
    }, null, 2)}\n`, "utf8"),
  ]);
  console.log(JSON.stringify({ level_id: levelLabel, sources: sources.length, candidates: candidates.length, proof_scanned: scan.length, accepted: Boolean(accepted), hash: accepted?.candidate_sha256 ?? null, diagnostics }, null, 2));
}

import { build } from "esbuild";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(TOOL), "..");
const CONTRACT_RELATIVE = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const BASE_RELATIVE = process.env.VIDEO_PARITY_BASE_CANDIDATES_RELATIVE
  ?? ".codex-temp/video-parity-v6-final-smoke-r7/report/formal-candidates.json";
const BASE_GENERATED_RELATIVE = process.env.VIDEO_PARITY_BASE_GENERATED_RELATIVE
  ?? ".codex-temp/video-parity-v6-final-smoke-r7/videoParityBaseLevels.generated.ts";
const BASE_ROUTES_RELATIVE = process.env.VIDEO_PARITY_BASE_ROUTES_RELATIVE
  ?? ".codex-temp/video-parity-v6-final-smoke-r7/report/validation-routes.json";
const OUTPUT_RELATIVE = process.env.VIDEO_PARITY_AXIS_SEED_OUTPUT_DIR
  ?? ".codex-temp/video-parity-axis-seeds-all";
const CONTRACT_PATH = resolve(ROOT, CONTRACT_RELATIVE);
const BASE_PATH = resolve(ROOT, BASE_RELATIVE);
const OUTPUT_DIR = resolve(ROOT, OUTPUT_RELATIVE);
const ASSEMBLER_PATH = resolve(ROOT, "tools/assemble-video-parity-runtime.mjs");

const SHAPES = Object.freeze({
  SINGLE: [[0, 0]],
  H2: [[0, 0], [1, 0]],
  V2: [[0, 0], [0, 1]],
  H3: [[0, 0], [1, 0], [2, 0]],
  V3: [[0, 0], [0, 1], [0, 2]],
  SQ2: [[0, 0], [1, 0], [0, 1], [1, 1]],
});
const SHAPE_VARIANTS = Object.freeze({
  ...SHAPES,
  L3: [
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const clone = (value) => structuredClone(value);
const levelLabel = (id) => `Lv${String(id).padStart(3, "0")}`;
const keyOf = (x, y) => `${x},${y}`;
const histogram = (values) => Object.fromEntries([...values.reduce((result, value) => {
  result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}, new Map())].sort(([left], [right]) => left.localeCompare(right)));
const canonicalJson = (value) => {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
};
const sameJson = (left, right) => JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
const allCells = (width, height) => Array.from({ length: width * height }, (_, index) => [
  index % width,
  Math.floor(index / width),
]);
const shapeBounds = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});
const blockCells = (block, x = block.x, y = block.y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);
const normalizedShapeSignature = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => `${x - minX},${y - minY}`).sort().join(";");
};
const shapeIdBySignature = new Map(Object.entries(SHAPE_VARIANTS).flatMap(([shapeId, value]) => {
  const variants = Array.isArray(value[0]?.[0]) ? value : [value];
  return variants.map((shape) => [normalizedShapeSignature(shape), shapeId]);
}));
const blockShapeId = (block) => shapeIdBySignature.get(normalizedShapeSignature(block.shape)) ?? "UNKNOWN";

const runtimeBundle = await build({
  stdin: {
    contents: `import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts"; export { PuzzleModel, validateLevel };`,
    resolveDir: ROOT,
    sourcefile: "video-parity-axis-seed-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const contractText = await readFile(CONTRACT_PATH, "utf8");
const baseText = await readFile(BASE_PATH, "utf8");
const contract = JSON.parse(contractText);
const baseArtifact = JSON.parse(baseText);
const contractById = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")),
  entry,
]));
const baseById = new Map((baseArtifact.levels ?? baseArtifact).map((entry) => [entry.level.id, entry]));

const targetFor = (id) => {
  const contractEntry = contractById.get(id);
  const baseEntry = baseById.get(id);
  if (!contractEntry || !baseEntry) throw new Error(`${levelLabel(id)}: missing v6 contract or R7 base candidate`);
  return { contractEntry, target: contractEntry.our_design_target, baseEntry };
};

const replayRoute = (level, route) => {
  const model = new runtime.PuzzleModel(level);
  const trace = [];
  for (let index = 0; index < route.length; index += 1) {
    const drag = route[index];
    const before = model.getBlock(drag.blockId);
    if (!before) return { pass: false, error: `drag ${index + 1}: ${drag.blockId} is not active`, trace };
    model.beginAction();
    for (let step = 0; step < (drag.path ?? []).length; step += 1) {
      const [x, y] = drag.path[step];
      if (!model.moveBlockStep(drag.blockId, x, y)) {
        return { pass: false, error: `drag ${index + 1} step ${step + 1}: cannot move to ${x},${y}`, trace };
      }
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      return { pass: false, error: `drag ${index + 1}: cannot exit ${drag.exitSide}`, trace };
    }
    if (!model.commitAction()) return { pass: false, error: `drag ${index + 1}: action did not mutate`, trace };
    const snapshot = model.snapshot();
    trace.push({
      drag: index + 1,
      block_id: drag.blockId,
      exit_side: drag.exitSide ?? null,
      remaining_blocks: snapshot.blocks.length,
      complete: snapshot.complete,
    });
  }
  const snapshot = model.snapshot();
  return {
    pass: snapshot.complete,
    error: snapshot.complete ? null : `${snapshot.blocks.length} blocks remain`,
    moves: snapshot.moves,
    cleared: snapshot.cleared,
    complete: snapshot.complete,
    trace,
  };
};

const axisRouteAudit = (level, route) => {
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  const cursor = new Map(level.blocks.map((block) => [block.id, [block.x, block.y]]));
  const violations = [];
  const perBlock = new Map(level.blocks.map((block) => [block.id, {
    block_id: block.id,
    shape: blockShapeId(block),
    axis: block.movementAxis ?? null,
    drags: 0,
    path_steps: 0,
    exit_side: null,
    compatible: true,
  }]));
  route.forEach((drag, dragIndex) => {
    const block = blockById.get(drag.blockId);
    const record = perBlock.get(drag.blockId);
    if (!block || !record) {
      violations.push(`drag ${dragIndex + 1}: unknown block ${drag.blockId}`);
      return;
    }
    record.drags += 1;
    let [x, y] = cursor.get(block.id);
    for (const [nextX, nextY] of drag.path ?? []) {
      record.path_steps += 1;
      const horizontalStep = nextY === y && Math.abs(nextX - x) === 1;
      const verticalStep = nextX === x && Math.abs(nextY - y) === 1;
      const compatible = block.movementAxis === undefined ? true
        : block.movementAxis === "horizontal" ? horizontalStep : verticalStep;
      if (!compatible) {
        record.compatible = false;
        violations.push(`drag ${dragIndex + 1}: ${block.id} ${block.movementAxis} path uses ${x},${y}->${nextX},${nextY}`);
      }
      x = nextX;
      y = nextY;
    }
    cursor.set(block.id, [x, y]);
    if (drag.exitSide) {
      record.exit_side = drag.exitSide;
      const exitCompatible = block.movementAxis === undefined ? true
        : block.movementAxis === "horizontal"
        ? drag.exitSide === "left" || drag.exitSide === "right"
        : drag.exitSide === "top" || drag.exitSide === "bottom";
      if (!exitCompatible) {
        record.compatible = false;
        violations.push(`drag ${dragIndex + 1}: ${block.id} ${block.movementAxis} exits ${drag.exitSide}`);
      }
    }
  });
  for (const record of perBlock.values()) {
    if (!record.axis) continue;
    if (record.drags < 1 || !record.exit_side) {
      record.compatible = false;
      violations.push(`${record.block_id}: missing complete exit route`);
    }
  }
  return { pass: violations.length === 0, violations, blocks: [...perBlock.values()].filter((record) => record.axis) };
};

const makeLv60 = () => {
  const id = 60;
  const { target, baseEntry } = targetFor(id);
  const width = target.board.cols;
  const height = target.board.rows;
  if (width !== 5 || height !== 7 || target.full_level_block_count !== 35
    || !sameJson(target.full_level_shape_histogram, { SINGLE: 35 })) {
    throw new Error("Lv060: deterministic full-board constructor requires the audited 5x7 / SINGLE x35 contract");
  }
  const palette = [...target.design_palette];
  const blocks = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      blocks.push({
        id: `axis-seed-060-${String(y * width + x + 1).padStart(2, "0")}`,
        x,
        y,
        shape: clone(SHAPES.SINGLE),
        color: palette[x % palette.length],
        movementAxis: "vertical",
      });
    }
  }
  const gates = [];
  const addUnitGate = (side, offset, color) => gates.push({
    id: `axis-seed-060-g${String(gates.length + 1).padStart(2, "0")}`,
    side,
    offset,
    size: 1,
    color,
  });
  for (let x = 0; x < width; x += 1) addUnitGate("top", x, palette[x % palette.length]);
  for (let x = 0; x < width; x += 1) addUnitGate("bottom", x, palette[(x + 1) % palette.length]);
  for (let y = 0; y < height; y += 1) addUnitGate("left", y, palette[(y + 2) % palette.length]);
  for (let y = 0; y < height; y += 1) addUnitGate("right", y, palette[(y + 3) % palette.length]);
  const route = [];
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const block = blocks[y * width + x];
      route.push({
        blockId: block.id,
        path: Array.from({ length: y }, (_, index) => [x, y - index - 1]),
        exitSide: "top",
      });
    }
  }
  const level = {
    id,
    name: `${baseEntry.level.name} · 轴向可解种子`,
    difficulty: baseEntry.level.difficulty,
    timeSeconds: target.time_seconds,
    reward: baseEntry.level.reward,
    parMoves: route.length,
    width,
    height,
    playable: allCells(width, height),
    gates,
    blocks,
  };
  return {
    level,
    route,
    construction: {
      method: "deterministic_full_board_column_peel",
      note: "All 35 SINGLE blocks move vertically; each column peels through its matching top gate.",
      search_nodes: 0,
      attempts: 1,
    },
  };
};

const seededNoise = (seed, value) => {
  let state = (seed ^ value) >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 0x1_0000_0000;
};

const routeToFixedEdge = ({ axis, x, y }) => axis === "horizontal"
  ? {
    exitSide: "left",
    path: Array.from({ length: x }, (_, index) => [x - index - 1, y]),
  }
  : {
    exitSide: "top",
    path: Array.from({ length: y }, (_, index) => [x, y - index - 1]),
  };

const enumerateReverseCandidates = (requirement, width, height) => {
  const shape = SHAPES[requirement.shapeId];
  const bounds = shapeBounds(shape);
  const candidates = [];
  for (let y = 0; y <= height - bounds.height; y += 1) {
    for (let x = 0; x <= width - bounds.width; x += 1) {
      const route = routeToFixedEdge({ axis: requirement.axis, x, y });
      const origins = [[x, y], ...route.path];
      const initialKeys = shape.map(([dx, dy]) => keyOf(x + dx, y + dy));
      const sweepKeys = new Set(origins.flatMap(([originX, originY]) => (
        shape.map(([dx, dy]) => keyOf(originX + dx, originY + dy))
      )));
      candidates.push({
        x,
        y,
        shape,
        initialKeys,
        sweepKeys: [...sweepKeys],
        route,
        edgeDistance: route.path.length,
        signature: `${requirement.shapeId}@${x},${y}`,
      });
    }
  }
  return candidates;
};

const reversePeelSearch = ({ width, height, requirements, maxAttempts = 40, maxNodesPerAttempt = 400_000 }) => {
  const typeKeys = [...new Set(requirements.map((requirement) => `${requirement.shapeId}:${requirement.axis}`))];
  const typeInfo = new Map(typeKeys.map((typeKey) => {
    const [shapeId, axis] = typeKey.split(":");
    const requirement = { shapeId, axis };
    return [typeKey, {
      ...requirement,
      area: SHAPES[shapeId].length,
      candidates: enumerateReverseCandidates(requirement, width, height),
    }];
  }));
  const initialCounts = new Map(typeKeys.map((typeKey) => [
    typeKey,
    requirements.filter((requirement) => `${requirement.shapeId}:${requirement.axis}` === typeKey).length,
  ]));
  let totalNodes = 0;
  let lastFailure = "not_started";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const counts = new Map(initialCounts);
    const occupied = new Set();
    const horizontalRows = new Map();
    const additions = [];
    const memo = new Set();
    let nodes = 0;
    const seed = 0x50A11CE ^ Math.imul(attempt + 1, 0x9E3779B1);

    const stateSignature = () => `${[...counts].map(([key, count]) => `${key}=${count}`).join(";")}`
      + `|${[...occupied].sort().join(";")}|rows=${[...horizontalRows.keys()].sort((a, b) => a - b).join(",")}`;

    const recurse = (remainingArea) => {
      nodes += 1;
      totalNodes += 1;
      if (nodes > maxNodesPerAttempt) {
        lastFailure = "node_cap";
        return false;
      }
      const remainingPieces = [...counts.values()].reduce((sum, count) => sum + count, 0);
      if (remainingPieces === 0) {
        const sq2 = additions.find((entry) => entry.requirement.shapeId === "SQ2");
        if (!sq2) return false;
        const topGroup = (x) => (x === sq2.candidate.x || x === sq2.candidate.x + 1)
          ? `top:${sq2.candidate.x}-2`
          : `top:${x}-1`;
        const usedGroups = new Set(additions.map((entry) => (
          entry.requirement.axis === "horizontal" ? `left:${entry.candidate.y}-1` : topGroup(entry.candidate.x)
        )));
        if (usedGroups.size < 5) {
          lastFailure = "fewer_than_five_effective_gate_groups";
          return false;
        }
        return true;
      }
      if (width * height - occupied.size < remainingArea) return false;
      const state = stateSignature();
      if (memo.has(state)) return false;
      if (memo.size < 300_000) memo.add(state);

      let selected = null;
      for (const [typeKey, count] of counts) {
        if (count <= 0) continue;
        const info = typeInfo.get(typeKey);
        const available = info.candidates.filter((candidate) => (
          candidate.sweepKeys.every((key) => !occupied.has(key))
          && (info.axis !== "horizontal" || horizontalRows.has(candidate.y) || horizontalRows.size < 5)
        ));
        if (available.length < count) return false;
        const pressure = available.length / count;
        if (!selected || pressure < selected.pressure
          || (pressure === selected.pressure && info.area > selected.info.area)) {
          selected = { typeKey, count, info, available, pressure };
        }
      }
      if (!selected) return false;

      const ordered = selected.available.map((candidate, index) => {
        const adjacency = candidate.initialKeys.reduce((sum, key) => {
          const [x, y] = key.split(",").map(Number);
          return sum + [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
            .filter(([nx, ny]) => occupied.has(keyOf(nx, ny))).length;
        }, 0);
        return {
          candidate,
          score: candidate.edgeDistance * 100 - adjacency * 6
            + seededNoise(seed, index * 131 + candidate.x * 17 + candidate.y * 31) * 25,
        };
      }).sort((left, right) => left.score - right.score);

      counts.set(selected.typeKey, selected.count - 1);
      for (const { candidate } of ordered) {
        candidate.initialKeys.forEach((key) => occupied.add(key));
        if (selected.info.axis === "horizontal") {
          horizontalRows.set(candidate.y, (horizontalRows.get(candidate.y) ?? 0) + 1);
        }
        additions.push({
          requirement: { shapeId: selected.info.shapeId, axis: selected.info.axis },
          candidate,
        });
        if (recurse(remainingArea - selected.info.area)) {
          return {
            additions: clone(additions),
            attempt,
            nodes,
            totalNodes,
            memoStates: memo.size,
          };
        }
        additions.pop();
        if (selected.info.axis === "horizontal") {
          const next = horizontalRows.get(candidate.y) - 1;
          if (next > 0) horizontalRows.set(candidate.y, next);
          else horizontalRows.delete(candidate.y);
        }
        candidate.initialKeys.forEach((key) => occupied.delete(key));
      }
      counts.set(selected.typeKey, selected.count);
      return false;
    };

    const remainingArea = requirements.reduce((sum, requirement) => sum + SHAPES[requirement.shapeId].length, 0);
    const result = recurse(remainingArea);
    if (result && typeof result === "object") return result;
  }
  throw new Error(`Lv050: reverse peel search failed after ${maxAttempts} attempts / ${totalNodes} nodes (${lastFailure})`);
};

const makeLv50 = () => {
  const id = 50;
  const { target, baseEntry } = targetFor(id);
  const width = target.board.cols;
  const height = target.board.rows;
  const axisContract = target.mechanism_contract.axis_blocks;
  const requirements = [];
  for (const axis of ["horizontal", "vertical"]) {
    for (const [shapeId, count] of Object.entries(axisContract.by_axis_shape?.[axis] ?? {})) {
      for (let index = 0; index < count; index += 1) requirements.push({ shapeId, axis });
    }
  }
  if (requirements.length !== target.full_level_block_count) {
    throw new Error(`Lv050: axis requirement count ${requirements.length} != block count ${target.full_level_block_count}`);
  }
  const result = reversePeelSearch({ width, height, requirements });
  const forward = [...result.additions].reverse();
  const sq2 = forward.find((entry) => entry.requirement.shapeId === "SQ2");
  if (!sq2) throw new Error("Lv050: reverse peel result omitted SQ2");
  const sqX = sq2.candidate.x;
  const topSegments = [];
  for (let x = 0; x < width;) {
    const size = x === sqX ? 2 : 1;
    topSegments.push({ side: "top", offset: x, size, key: `top:${x}-${size}` });
    x += size;
  }
  if (topSegments.length !== 4) throw new Error(`Lv050: expected four top segments around SQ2 span, found ${topSegments.length}`);
  const horizontalRows = [...new Set(forward
    .filter((entry) => entry.requirement.axis === "horizontal")
    .map((entry) => entry.candidate.y))].sort((left, right) => left - right);
  if (horizontalRows.length > 5) throw new Error(`Lv050: ${horizontalRows.length} horizontal exit rows exceed five left gates`);
  const unusedRows = Array.from({ length: height }, (_, row) => row).filter((row) => !horizontalRows.includes(row));
  const leftRows = [...horizontalRows, ...unusedRows.slice(0, 5 - horizontalRows.length)].sort((left, right) => left - right);
  const leftSegments = leftRows.map((row) => ({ side: "left", offset: row, size: 1, key: `left:${row}-1` }));
  const gateSegments = [...topSegments, ...leftSegments];
  if (gateSegments.length !== target.mechanism_contract.directional_exits.ordinary_count) {
    throw new Error(`Lv050: constructed ${gateSegments.length} gates, expected ${target.mechanism_contract.directional_exits.ordinary_count}`);
  }
  const segmentFor = (entry) => {
    if (entry.requirement.axis === "horizontal") {
      return leftSegments.find((segment) => segment.offset === entry.candidate.y);
    }
    return topSegments.find((segment) => (
      entry.candidate.x >= segment.offset && entry.candidate.x < segment.offset + segment.size
      && (entry.requirement.shapeId !== "SQ2"
        || entry.candidate.x + 1 < segment.offset + segment.size)
    ));
  };
  const usedSegmentKeys = [...new Set(forward.map((entry) => segmentFor(entry)?.key))];
  if (usedSegmentKeys.includes(undefined) || usedSegmentKeys.length < target.full_level_color_count) {
    throw new Error(`Lv050: only ${usedSegmentKeys.length} usable gate groups for ${target.full_level_color_count} colors`);
  }
  const palette = [...target.design_palette];
  const colorBySegment = new Map();
  usedSegmentKeys.forEach((key, index) => colorBySegment.set(key, palette[index % palette.length]));
  gateSegments.forEach((segment) => {
    if (!colorBySegment.has(segment.key)) colorBySegment.set(segment.key, palette[0]);
  });
  const blocks = forward.map((entry, index) => {
    const segment = segmentFor(entry);
    return {
      id: `axis-seed-050-${String(index + 1).padStart(2, "0")}`,
      x: entry.candidate.x,
      y: entry.candidate.y,
      shape: clone(entry.candidate.shape),
      color: colorBySegment.get(segment.key),
      movementAxis: entry.requirement.axis,
    };
  });
  const route = forward.map((entry, index) => ({
    blockId: blocks[index].id,
    path: clone(entry.candidate.route.path),
    exitSide: entry.candidate.route.exitSide,
  }));
  const gates = gateSegments.map((segment, index) => ({
    id: `axis-seed-050-g${String(index + 1).padStart(2, "0")}`,
    side: segment.side,
    offset: segment.offset,
    size: segment.size,
    color: colorBySegment.get(segment.key),
  }));
  const level = {
    id,
    name: `${baseEntry.level.name} · 轴向可解种子`,
    difficulty: baseEntry.level.difficulty,
    timeSeconds: target.time_seconds,
    reward: baseEntry.level.reward,
    parMoves: route.length,
    width,
    height,
    playable: allCells(width, height),
    gates,
    blocks,
  };
  return {
    level,
    route,
    construction: {
      method: "generic_reverse_peel_search",
      invariant: "When a block is inserted in reverse clear order, its complete straight axis corridor is disjoint from every later-cleared block already placed.",
      fixed_exit_policy: { horizontal: "left", vertical: "top" },
      search_nodes: result.totalNodes,
      winning_attempt_nodes: result.nodes,
      attempts: result.attempt + 1,
      memo_states: result.memoStates,
      horizontal_exit_rows: horizontalRows,
      sq2_top_span: [sqX, sqX + 1],
      used_gate_groups: usedSegmentKeys.length,
    },
  };
};

const normalizeContractShapeId = (shapeId) => {
  const normalized = String(shapeId ?? "").toUpperCase();
  return ["SQ3", "RECT3X3", "RECT3X2", "RECT2X3"].includes(normalized) ? "RECT2X3" : normalized;
};

const stageSlices = (target, baseLevel) => {
  const partitions = target.stage_partitions?.length
    ? target.stage_partitions
    : [{ id: "opening", kind: "opening", count: baseLevel.blocks.length, shape_histogram: target.full_level_shape_histogram }];
  let cursor = 0;
  const slices = partitions.map((partition, index) => {
    const blocks = baseLevel.blocks.slice(cursor, cursor + Number(partition.count));
    cursor += Number(partition.count);
    if (blocks.length !== Number(partition.count)) {
      throw new Error(`${levelLabel(baseLevel.id)} ${partition.id}: R7 stage slice is incomplete`);
    }
    return { index, partition, blocks };
  });
  if (cursor !== baseLevel.blocks.length) {
    throw new Error(`${levelLabel(baseLevel.id)}: stage slices consume ${cursor}/${baseLevel.blocks.length} R7 blocks`);
  }
  return slices;
};

const axisRequirementsFor = (target, slices) => {
  const spec = target.mechanism_contract.axis_blocks;
  const stageIndexById = new Map(slices.map((slice) => [slice.partition.id, slice.index]));
  const hiddenStages = slices.slice(1).map((slice) => slice.index);
  const allowedStagesFor = (item = {}) => {
    if (item.stage_id) {
      const exact = stageIndexById.get(item.stage_id);
      if (exact === undefined) throw new Error(`axis item references unknown stage ${item.stage_id}`);
      return [exact];
    }
    if (item.hiddenAtOpening === true || spec.hidden_at_opening === true) return hiddenStages;
    return [0];
  };
  const requirements = [];
  const add = ({ shapeId = null, axis = null, item = {}, source }) => requirements.push({
    id: `axis-requirement-${String(requirements.length + 1).padStart(2, "0")}`,
    shapeId: shapeId ? normalizeContractShapeId(shapeId) : null,
    axis,
    allowedStages: allowedStagesFor(item),
    contractedStageId: item.stage_id ?? null,
    hiddenAtOpening: item.hiddenAtOpening === true || spec.hidden_at_opening === true,
    source,
  });
  if (Array.isArray(spec.items) && spec.items.length) {
    spec.items.forEach((item) => add({
      shapeId: item.shape ?? null,
      axis: item.axis ?? null,
      item,
      source: "items",
    }));
  } else if (spec.by_axis_shape && typeof spec.by_axis_shape === "object") {
    for (const axis of ["horizontal", "vertical"]) {
      for (const [shapeId, count] of Object.entries(spec.by_axis_shape[axis] ?? {})) {
        for (let index = 0; index < Number(count); index += 1) add({ shapeId, axis, source: "by_axis_shape" });
      }
    }
  } else {
    const shapes = Object.entries(spec.shape_histogram ?? {}).flatMap(([shapeId, count]) => (
      Array.from({ length: Number(count) }, () => normalizeContractShapeId(shapeId))
    ));
    const axes = Array.isArray(spec.axes) ? spec.axes : [];
    for (let index = 0; index < Number(spec.count); index += 1) {
      add({ shapeId: shapes[index] ?? null, axis: axes[index] ?? null, source: "aggregate" });
    }
  }
  if (requirements.length !== Number(spec.count)) {
    throw new Error(`axis requirement ledger ${requirements.length} != contract count ${spec.count}`);
  }
  for (const requirement of requirements) {
    if (!requirement.allowedStages.length) throw new Error(`${requirement.id}: no eligible hidden stage`);
    const candidates = slices.flatMap((slice) => requirement.allowedStages.includes(slice.index)
      ? slice.blocks.filter((block) => !requirement.shapeId || blockShapeId(block) === requirement.shapeId)
      : []);
    if (!candidates.length) {
      throw new Error(`${requirement.id}: no ${requirement.shapeId ?? "any"} carrier in eligible stages`);
    }
  }
  return requirements;
};

const boundaryPlayable = (level, side, coordinate) => {
  const playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  if (side === "top") return playable.has(keyOf(coordinate, 0));
  if (side === "bottom") return playable.has(keyOf(coordinate, level.height - 1));
  if (side === "left") return playable.has(keyOf(0, coordinate));
  return playable.has(keyOf(level.width - 1, coordinate));
};

const gateCells = (gate) => Array.from({ length: gate.size }, (_, delta) => `${gate.side}:${gate.offset + delta}`);

const carrierAwareBaseGates = ({ baseLevel, slices, axisRequirements }) => {
  const playable = new Set(baseLevel.playable.map(([x, y]) => keyOf(x, y)));
  const original = baseLevel.gates.map((gate) => ({ side: gate.side, offset: gate.offset, size: gate.size }));
  const protectedSlots = [];
  const corridorIsPlayable = (block, side) => {
    const bounds = shapeBounds(block.shape);
    const limit = side === "top" ? block.y
      : side === "bottom" ? baseLevel.height - bounds.height - block.y
        : side === "left" ? block.x
          : baseLevel.width - bounds.width - block.x;
    for (let step = 0; step <= limit; step += 1) {
      const x = side === "left" ? block.x - step : side === "right" ? block.x + step : block.x;
      const y = side === "top" ? block.y - step : side === "bottom" ? block.y + step : block.y;
      if (!block.shape.every(([dx, dy]) => playable.has(keyOf(x + dx, y + dy)))) return false;
    }
    return true;
  };
  const slotFor = (block, side) => {
    const bounds = shapeBounds(block.shape);
    return side === "top" || side === "bottom"
      ? { side, offset: block.x, size: bounds.width }
      : { side, offset: block.y, size: bounds.height };
  };
  const contains = (outer, inner) => outer.side === inner.side
    && inner.offset >= outer.offset && inner.offset + inner.size <= outer.offset + outer.size;
  for (const requirement of axisRequirements) {
    const sideCandidates = requirement.axis === "horizontal" ? ["left", "right"]
      : requirement.axis === "vertical" ? ["top", "bottom"]
        : ["top", "right", "bottom", "left"];
    const blockCandidates = slices.flatMap((slice) => requirement.allowedStages.includes(slice.index)
      ? slice.blocks.filter((block) => !requirement.shapeId || blockShapeId(block) === requirement.shapeId)
      : []);
    const candidates = blockCandidates.flatMap((block) => sideCandidates
      .filter((side) => corridorIsPlayable(block, side))
      .map((side) => ({ block, slot: slotFor(block, side) })));
    if (!candidates.length) continue;
    candidates.sort((left, right) => {
      const leftCovered = original.some((gate) => contains(gate, left.slot));
      const rightCovered = original.some((gate) => contains(gate, right.slot));
      return Number(rightCovered) - Number(leftCovered)
        || left.slot.size - right.slot.size
        || left.slot.side.localeCompare(right.slot.side)
        || left.slot.offset - right.slot.offset;
    });
    const selected = candidates[0].slot;
    const containingProtected = protectedSlots.find((slot) => contains(slot, selected));
    if (containingProtected) continue;
    const containingOriginal = original.find((gate) => contains(gate, selected));
    let protectedSlot = { ...(containingOriginal ?? selected), _protected: true };
    const generatorStage = slices.some((slice) => requirement.allowedStages.includes(slice.index)
      && ["side_generator", "timed_feeder"].includes(slice.partition.kind));
    if (generatorStage) {
      // Runtime generators materialize their queue at a common spawn chosen
      // near the staging anchor.  Preserve the authored carrier lane and the
      // deterministic origin-side spawn lane in the same mouth so installing
      // the generator cannot invalidate an otherwise same-axis witness.
      const expanded = {
        ...protectedSlot,
        offset: 0,
        size: protectedSlot.offset + protectedSlot.size,
      };
      const boundarySpanPlayable = Array.from({ length: expanded.size }, (_, delta) => (
        boundaryPlayable(baseLevel, expanded.side, expanded.offset + delta)
      )).every(Boolean);
      if (boundarySpanPlayable) protectedSlot = expanded;
    }
    protectedSlots.push(protectedSlot);
  }
  const slots = [];
  for (const side of ["top", "right", "bottom", "left"]) {
    const sideProtected = protectedSlots.filter((slot) => slot.side === side);
    const covered = new Set(original.filter((gate) => gate.side === side).flatMap((gate) => (
      Array.from({ length: gate.size }, (_, delta) => gate.offset + delta)
    )));
    sideProtected.forEach((slot) => {
      for (let delta = 0; delta < slot.size; delta += 1) covered.add(slot.offset + delta);
    });
    const protectedCells = new Set(sideProtected.flatMap((slot) => (
      Array.from({ length: slot.size }, (_, delta) => slot.offset + delta)
    )));
    slots.push(...sideProtected);
    const remaining = [...covered].filter((coordinate) => !protectedCells.has(coordinate)).sort((a, b) => a - b);
    for (let index = 0; index < remaining.length;) {
      const start = remaining[index];
      let end = start;
      while (index + 1 < remaining.length && remaining[index + 1] === end + 1) {
        index += 1;
        end = remaining[index];
      }
      slots.push({ side, offset: start, size: end - start + 1 });
      index += 1;
    }
  }
  return slots;
};

const balancedBoundaryGateSlots = ({ baseLevel, baseGates, count, variant, minimumSize = 2 }) => {
  const protectedSlots = baseGates.filter((gate) => gate._protected).map((gate) => ({ ...gate }));
  if (protectedSlots.length > count) return null;
  const occupied = new Set(protectedSlots.flatMap(gateCells));
  const runs = [];
  for (const side of ["top", "right", "bottom", "left"]) {
    const limit = side === "top" || side === "bottom" ? baseLevel.width : baseLevel.height;
    const available = Array.from({ length: limit }, (_, offset) => offset).filter((offset) => (
      boundaryPlayable(baseLevel, side, offset) && !occupied.has(`${side}:${offset}`)
    ));
    for (let index = 0; index < available.length;) {
      const start = available[index];
      let end = start;
      while (index + 1 < available.length && available[index + 1] === end + 1) {
        index += 1;
        end = available[index];
      }
      runs.push({ side, offset: start, size: end - start + 1, segments: 0 });
      index += 1;
    }
  }
  let remaining = count - protectedSlots.length;
  const totalCapacity = runs.reduce((sum, run) => sum + Math.floor(run.size / minimumSize), 0);
  if (totalCapacity < remaining) return null;
  while (remaining > 0) {
    const candidates = runs.filter((run) => run.segments < Math.floor(run.size / minimumSize));
    if (!candidates.length) return null;
    candidates.sort((left, right) => (
      right.size / (right.segments + 1) - left.size / (left.segments + 1)
      || seededNoise(0xBA1A6CED ^ variant, left.offset * 31 + left.side.length * 101 + left.segments)
        - seededNoise(0xBA1A6CED ^ variant, right.offset * 31 + right.side.length * 101 + right.segments)
    ));
    candidates[0].segments += 1;
    remaining -= 1;
  }
  const slots = [...protectedSlots];
  for (const run of runs.filter((entry) => entry.segments > 0)) {
    const baseSize = Math.floor(run.size / run.segments);
    let cursor = run.offset;
    for (let index = 0; index < run.segments; index += 1) {
      const size = baseSize + (index < run.size % run.segments ? 1 : 0);
      slots.push({ side: run.side, offset: cursor, size });
      cursor += size;
    }
  }
  if (slots.length !== count) return null;
  return slots.map(({ side, offset, size }) => ({ side, offset, size }));
};

const expandedGateSlots = ({ baseLevel, baseGates = baseLevel.gates, count, variant }) => {
  const balanced = [51, 53, 56, 63, 89].includes(baseLevel.id)
    ? balancedBoundaryGateSlots({ baseLevel, baseGates, count, variant })
    : null;
  if (balanced) return balanced;
  const slots = baseGates.map((gate) => ({
    side: gate.side,
    offset: gate.offset,
    size: gate.size,
    ...(gate._protected ? { _protected: true } : {}),
  }));
  const legalUnitSlots = ["top", "right", "bottom", "left"].flatMap((side) => {
    const limit = side === "top" || side === "bottom" ? baseLevel.width : baseLevel.height;
    return Array.from({ length: limit }, (_, offset) => ({ side, offset, size: 1 }))
      .filter((slot) => boundaryPlayable(baseLevel, side, slot.offset));
  });
  const initiallyOccupied = new Set(slots.flatMap(gateCells));
  const initialFree = legalUnitSlots.filter((slot) => !initiallyOccupied.has(gateCells(slot)[0]));
  for (let index = 0; slots.length < count && index < initialFree.length; index += 1) {
    slots.push(initialFree[(index + variant) % initialFree.length]);
  }
  let splitIndex = 0;
  while (slots.length < count) {
    const splittable = slots.map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.size > 1 && !slot._protected)
      .sort((left, right) => (
        right.slot.size - left.slot.size
        || seededNoise(variant * 0x9E37 + splitIndex, left.index * 97 + left.slot.offset * 13)
          - seededNoise(variant * 0x9E37 + splitIndex, right.index * 97 + right.slot.offset * 13)
      ));
    if (splittable.length) {
      const selected = splittable[(variant + splitIndex) % splittable.length];
      const source = slots[selected.index];
      const splitFromStart = ((variant + splitIndex) & 1) === 1;
      const unit = splitFromStart
        ? { side: source.side, offset: source.offset, size: 1 }
        : { side: source.side, offset: source.offset + source.size - 1, size: 1 };
      if (splitFromStart) source.offset += 1;
      source.size -= 1;
      slots.push(unit);
      splitIndex += 1;
      continue;
    }
    const occupied = new Set(slots.flatMap(gateCells));
    const free = legalUnitSlots.filter((slot) => !occupied.has(gateCells(slot)[0]));
    if (!free.length) break;
    slots.push(free[(variant + slots.length) % free.length]);
  }
  if (slots.length !== count) return null;
  const occupied = new Set();
  for (const slot of slots) {
    for (const key of gateCells(slot)) {
      if (occupied.has(key)) return null;
      occupied.add(key);
    }
  }
  return slots.map(({ side, offset, size }) => ({ side, offset, size }));
};

const originIsLegal = ({ block, x, y, playable, occupied, width, height }) => block.shape.every(([dx, dy]) => {
  const cellX = x + dx;
  const cellY = y + dy;
  return cellX >= 0 && cellY >= 0 && cellX < width && cellY < height
    && playable.has(keyOf(cellX, cellY)) && !occupied.has(keyOf(cellX, cellY));
});

const pathToSpecificGate = ({ block, remaining, gate, axis, playable, width, height }) => {
  if (axis === "horizontal" && gate.side !== "left" && gate.side !== "right") return null;
  if (axis === "vertical" && gate.side !== "top" && gate.side !== "bottom") return null;
  const occupied = new Set(remaining.filter((other) => other.id !== block.id).flatMap((other) => (
    blockCells(other).map(([x, y]) => keyOf(x, y))
  )));
  const startKey = keyOf(block.x, block.y);
  const validOrigins = new Set();
  const bounds = shapeBounds(block.shape);
  for (let y = 0; y <= height - bounds.height; y += 1) {
    for (let x = 0; x <= width - bounds.width; x += 1) {
      if (originIsLegal({ block, x, y, playable, occupied, width, height })) validOrigins.add(keyOf(x, y));
    }
  }
  if (!validOrigins.has(startKey)) return null;
  const exitAt = (x, y) => {
    const cells = blockCells(block, x, y);
    const xs = cells.map(([cellX]) => cellX);
    const ys = cells.map(([, cellY]) => cellY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const atEdge = gate.side === "top" ? minY === 0
      : gate.side === "bottom" ? maxY === height - 1
        : gate.side === "left" ? minX === 0
          : maxX === width - 1;
    if (!atEdge) return false;
    return gate.side === "top" || gate.side === "bottom"
      ? minX >= gate.offset && maxX < gate.offset + gate.size
      : minY >= gate.offset && maxY < gate.offset + gate.size;
  };
  const directions = axis === "horizontal" ? [[-1, 0], [1, 0]]
    : axis === "vertical" ? [[0, -1], [0, 1]]
      : [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const queue = [[block.x, block.y]];
  const parent = new Map([[startKey, null]]);
  for (let cursorIndex = 0; cursorIndex < queue.length; cursorIndex += 1) {
    const [x, y] = queue[cursorIndex];
    if (exitAt(x, y)) {
      const path = [];
      let cursor = keyOf(x, y);
      while (cursor !== startKey) {
        path.push(cursor.split(",").map(Number));
        cursor = parent.get(cursor);
      }
      path.reverse();
      return path;
    }
    for (const [dx, dy] of directions) {
      const next = keyOf(x + dx, y + dy);
      if (!validOrigins.has(next) || parent.has(next)) continue;
      parent.set(next, keyOf(x, y));
      queue.push([x + dx, y + dy]);
    }
  }
  return null;
};

const pathsToGates = ({ block, remaining, gates, axis, playable, width, height }) => {
  const compatibleGateIndices = gates.flatMap((gate, gateIndex) => {
    if (axis === "horizontal" && gate.side !== "left" && gate.side !== "right") return [];
    if (axis === "vertical" && gate.side !== "top" && gate.side !== "bottom") return [];
    return [gateIndex];
  });
  if (!compatibleGateIndices.length) return new Map();
  const occupied = new Set(remaining.filter((other) => other.id !== block.id).flatMap((other) => (
    blockCells(other).map(([x, y]) => keyOf(x, y))
  )));
  const startKey = keyOf(block.x, block.y);
  const validOrigins = new Set();
  const bounds = shapeBounds(block.shape);
  for (let y = 0; y <= height - bounds.height; y += 1) {
    for (let x = 0; x <= width - bounds.width; x += 1) {
      if (originIsLegal({ block, x, y, playable, occupied, width, height })) validOrigins.add(keyOf(x, y));
    }
  }
  if (!validOrigins.has(startKey)) return new Map();
  const gateAccepts = (gate, x, y) => {
    const cells = blockCells(block, x, y);
    const xs = cells.map(([cellX]) => cellX);
    const ys = cells.map(([, cellY]) => cellY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const atEdge = gate.side === "top" ? minY === 0
      : gate.side === "bottom" ? maxY === height - 1
        : gate.side === "left" ? minX === 0
          : maxX === width - 1;
    if (!atEdge) return false;
    return gate.side === "top" || gate.side === "bottom"
      ? minX >= gate.offset && maxX < gate.offset + gate.size
      : minY >= gate.offset && maxY < gate.offset + gate.size;
  };
  const reconstruct = (originKey, parent) => {
    const path = [];
    let cursor = originKey;
    while (cursor !== startKey) {
      path.push(cursor.split(",").map(Number));
      cursor = parent.get(cursor);
    }
    path.reverse();
    return path;
  };
  const directions = axis === "horizontal" ? [[-1, 0], [1, 0]]
    : axis === "vertical" ? [[0, -1], [0, 1]]
      : [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const queue = [[block.x, block.y]];
  const parent = new Map([[startKey, null]]);
  const unresolved = new Set(compatibleGateIndices);
  const result = new Map();
  for (let cursorIndex = 0; cursorIndex < queue.length && unresolved.size; cursorIndex += 1) {
    const [x, y] = queue[cursorIndex];
    const originKey = keyOf(x, y);
    for (const gateIndex of [...unresolved]) {
      if (!gateAccepts(gates[gateIndex], x, y)) continue;
      result.set(gateIndex, reconstruct(originKey, parent));
      unresolved.delete(gateIndex);
    }
    for (const [dx, dy] of directions) {
      const next = keyOf(x + dx, y + dy);
      if (!validOrigins.has(next) || parent.has(next)) continue;
      parent.set(next, originKey);
      queue.push([x + dx, y + dy]);
    }
  }
  return result;
};

const descriptorValues = (target) => {
  const exits = target.mechanism_contract.directional_exits;
  if ((exits.star_count ?? 0) > 0 || (exits.star_frozen_count ?? 0) > 0) {
    throw new Error("axis seed planner does not accept star gates");
  }
  return [
    ...Array.from({ length: Number(exits.ordinary_count ?? 0) }, () => 0),
    ...(exits.frozen_values ?? []).map(Number),
  ].sort((left, right) => left - right);
};

const prefixGateThawFeasible = (gateFirstRank, statusValues) => {
  const capacities = [...gateFirstRank.values()].sort((left, right) => left - right);
  return capacities.every((capacity, index) => statusValues[index] <= capacity);
};

const runtimeOpeningColorCount = (target, slices) => {
  const openingBlockCount = slices[0]?.blocks.length ?? 0;
  const usableGateCount = descriptorValues(target).filter((value) => value <= openingBlockCount - 1).length;
  return Math.min(Number(target.opening_color_count), usableGateCount, Number(target.full_level_color_count));
};

const planGreedySpatialPeel = ({
  levelId,
  baseLevel,
  baseRoute,
  target,
  slices,
  gates,
  axisRequirements,
  strategyVariant = 0,
}) => {
  const statusValues = descriptorValues(target);
  if (statusValues.length !== gates.length) throw new Error(`${levelLabel(levelId)}: descriptor/gate count mismatch`);
  const playable = new Set(baseLevel.playable.map(([x, y]) => keyOf(x, y)));
  const stageBlockIds = slices.map((slice) => slice.blocks.map((block) => block.id));
  const blockById = new Map(baseLevel.blocks.map((block) => [block.id, block]));
  const remainingByStage = stageBlockIds.map((ids) => [...ids]);
  const remainingRequirements = [...axisRequirements];
  const carrierAssignments = [];
  const route = [];
  const routeGateIndices = [];
  const gateFirstRank = new Map();
  const openingGateIndices = new Set();
  const routeRank = new Map((baseRoute ?? []).map((drag, index) => [drag.blockId, index]));
  const openingColorCount = runtimeOpeningColorCount(target, slices);
  const fullColorCount = Number(target.full_level_color_count);
  let evaluatedOptions = 0;

  const availableCarrierCount = (requirement) => requirement.allowedStages.reduce((sum, stageIndex) => (
    sum + remainingByStage[stageIndex].filter((blockId) => {
      const block = blockById.get(blockId);
      return block && (!requirement.shapeId || blockShapeId(block) === requirement.shapeId);
    }).length
  ), 0);
  const gateAllowed = (gateIndex, stageIndex) => {
    if (gateFirstRank.has(gateIndex)) return true;
    if (gateFirstRank.size >= fullColorCount) return false;
    if (stageIndex === 0 && openingGateIndices.size >= openingColorCount) return false;
    const projected = new Map(gateFirstRank);
    projected.set(gateIndex, route.length);
    return prefixGateThawFeasible(projected, statusValues);
  };
  const gatePreference = (gateIndex, path, stageIndex) => {
    const isNew = !gateFirstRank.has(gateIndex);
    const needsNew = stageIndex === 0
      ? openingGateIndices.size < openingColorCount
      : gateFirstRank.size < fullColorCount;
    return Number(needsNew !== isNew) * 1_000_000
      + path.length * 1_000
      + seededNoise(0xA715 ^ strategyVariant, gateIndex * 131 + route.length * 17);
  };
  const pathsFor = (block, remaining, axis, stageIndex) => [...pathsToGates({
    block,
    remaining,
    gates,
    axis,
    playable,
    width: baseLevel.width,
    height: baseLevel.height,
  })]
    .filter(([gateIndex]) => gateAllowed(gateIndex, stageIndex))
    .sort((left, right) => gatePreference(left[0], left[1], stageIndex) - gatePreference(right[0], right[1], stageIndex));

  for (let stageIndex = 0; stageIndex < slices.length; stageIndex += 1) {
    while (remainingByStage[stageIndex].length) {
      for (const requirement of remainingRequirements) {
        if (availableCarrierCount(requirement) <= 0) {
          return { error: `lost_axis_carrier_${requirement.id}`, nodes: evaluatedOptions, memoStates: 0 };
        }
      }
      const remaining = remainingByStage[stageIndex].map((blockId) => blockById.get(blockId));
      const axisOptions = [];
      for (const requirement of remainingRequirements.filter((item) => item.allowedStages.includes(stageIndex))) {
        for (const block of remaining) {
          if (requirement.shapeId && blockShapeId(block) !== requirement.shapeId) continue;
          for (const axis of requirement.axis ? [requirement.axis] : ["horizontal", "vertical"]) {
            for (const [gateIndex, path] of pathsFor(block, remaining, axis, stageIndex)) {
              evaluatedOptions += 1;
              axisOptions.push({ block, gateIndex, path, axis, requirement });
            }
          }
        }
      }
      axisOptions.sort((left, right) => (
        availableCarrierCount(left.requirement) - availableCarrierCount(right.requirement)
        || gatePreference(left.gateIndex, left.path, stageIndex) - gatePreference(right.gateIndex, right.path, stageIndex)
        || (routeRank.get(left.block.id) ?? Number.MAX_SAFE_INTEGER) - (routeRank.get(right.block.id) ?? Number.MAX_SAFE_INTEGER)
        || seededNoise(strategyVariant, left.block.id.length * 97 + left.gateIndex)
          - seededNoise(strategyVariant, right.block.id.length * 97 + right.gateIndex)
      ));

      let selected = axisOptions[0] ?? null;
      if (!selected) {
        const ordinaryOptions = [];
        for (const block of remaining) {
          const matching = remainingRequirements.filter((requirement) => (
            requirement.allowedStages.includes(stageIndex)
            && (!requirement.shapeId || blockShapeId(block) === requirement.shapeId)
          ));
          if (matching.some((requirement) => availableCarrierCount(requirement) <= 1)) continue;
          for (const [gateIndex, path] of pathsFor(block, remaining, null, stageIndex)) {
            evaluatedOptions += 1;
            ordinaryOptions.push({ block, gateIndex, path, axis: null, requirement: null, matching });
          }
        }
        ordinaryOptions.sort((left, right) => (
          Number(left.matching.length > 0) - Number(right.matching.length > 0)
          || (routeRank.get(left.block.id) ?? Number.MAX_SAFE_INTEGER) - (routeRank.get(right.block.id) ?? Number.MAX_SAFE_INTEGER)
          || gatePreference(left.gateIndex, left.path, stageIndex) - gatePreference(right.gateIndex, right.path, stageIndex)
          || seededNoise(0x61EED ^ strategyVariant, left.gateIndex * 53 + left.path.length)
            - seededNoise(0x61EED ^ strategyVariant, right.gateIndex * 53 + right.path.length)
        ));
        selected = ordinaryOptions[0] ?? null;
      }
      if (!selected) return {
        error: `greedy_stuck_stage_${stageIndex + 1}`,
        nodes: evaluatedOptions,
        memoStates: 0,
        remainingBlockIds: [...remainingByStage[stageIndex]],
        remainingRequirementIds: remainingRequirements.map((requirement) => requirement.id),
      };

      const rank = route.length;
      if (!gateFirstRank.has(selected.gateIndex)) gateFirstRank.set(selected.gateIndex, rank);
      if (stageIndex === 0) openingGateIndices.add(selected.gateIndex);
      const blockIndex = remainingByStage[stageIndex].indexOf(selected.block.id);
      remainingByStage[stageIndex].splice(blockIndex, 1);
      if (selected.requirement) {
        const requirementIndex = remainingRequirements.findIndex((requirement) => requirement.id === selected.requirement.id);
        const [requirement] = remainingRequirements.splice(requirementIndex, 1);
        carrierAssignments.push({
          blockId: selected.block.id,
          shapeId: blockShapeId(selected.block),
          axis: selected.axis,
          stageId: slices[stageIndex].partition.id,
          stageIndex,
          requirement,
        });
      }
      route.push({ blockId: selected.block.id, path: selected.path, exitSide: gates[selected.gateIndex].side });
      routeGateIndices.push(selected.gateIndex);
    }
    if (stageIndex === 0 && openingGateIndices.size !== openingColorCount) {
      return { error: "opening_color_gate_shortfall", nodes: evaluatedOptions, memoStates: 0 };
    }
  }
  if (remainingRequirements.length || gateFirstRank.size !== fullColorCount) {
    return { error: "full_color_or_axis_shortfall", nodes: evaluatedOptions, memoStates: 0 };
  }
  return {
    route: clone(route),
    routeGateIndices: [...routeGateIndices],
    gateFirstRank: new Map(gateFirstRank),
    openingGateIndices: new Set(openingGateIndices),
    carrierAssignments: clone(carrierAssignments),
    nodes: evaluatedOptions,
    memoStates: 0,
    strategyVariant,
  };
};

const planSpatialPeel = ({ levelId, baseLevel, target, slices, gates, axisRequirements, nodeCap = 750_000 }) => {
  const statusValues = descriptorValues(target);
  if (statusValues.length !== gates.length) throw new Error(`${levelLabel(levelId)}: descriptor/gate count mismatch`);
  const playable = new Set(baseLevel.playable.map(([x, y]) => keyOf(x, y)));
  const stageBlockIds = slices.map((slice) => slice.blocks.map((block) => block.id));
  const blockById = new Map(baseLevel.blocks.map((block) => [block.id, block]));
  const remainingByStage = stageBlockIds.map((ids) => [...ids]);
  const remainingRequirements = [...axisRequirements];
  const carrierAssignments = [];
  const route = [];
  const routeGateIndices = [];
  const gateFirstRank = new Map();
  const openingGateIndices = new Set();
  const memo = new Set();
  let nodes = 0;
  const openingColorCount = runtimeOpeningColorCount(target, slices);

  const availableCarrierCount = (requirement) => requirement.allowedStages.reduce((sum, stageIndex) => (
    sum + remainingByStage[stageIndex].filter((blockId) => {
      const block = blockById.get(blockId);
      return block && (!requirement.shapeId || blockShapeId(block) === requirement.shapeId);
    }).length
  ), 0);

  const recurse = (stageIndex) => {
    nodes += 1;
    if (nodes > nodeCap) return false;
    while (stageIndex < slices.length && remainingByStage[stageIndex].length === 0) {
      if (remainingRequirements.some((requirement) => Math.max(...requirement.allowedStages) <= stageIndex)) return false;
      if (stageIndex === 0 && openingGateIndices.size < openingColorCount) return false;
      stageIndex += 1;
    }
    if (stageIndex >= slices.length) {
      if (remainingRequirements.length) return false;
      const used = gateFirstRank.size;
      const laterOnly = [...gateFirstRank.keys()].filter((gateIndex) => !openingGateIndices.has(gateIndex)).length;
      return used >= Number(target.full_level_color_count)
        && laterOnly >= Number(target.full_level_color_count) - openingColorCount;
    }
    for (const requirement of remainingRequirements) {
      if (availableCarrierCount(requirement) <= 0) return false;
    }
    const totalRemaining = remainingByStage.slice(stageIndex).reduce((sum, ids) => sum + ids.length, 0);
    if (gateFirstRank.size + totalRemaining < Number(target.full_level_color_count)) return false;
    if (stageIndex === 0 && openingGateIndices.size + remainingByStage[0].length < openingColorCount) return false;

    const memoKey = `${stageIndex}|${remainingByStage[stageIndex].slice().sort().join(",")}`
      + `|req=${remainingRequirements.map((requirement) => requirement.id).sort().join(",")}`
      + `|g=${[...gateFirstRank].sort(([left], [right]) => left - right).map(([index, rank]) => `${index}:${rank}`).join(",")}`;
    if (memo.has(memoKey)) return false;
    if (memo.size < 500_000) memo.add(memoKey);

    const remaining = remainingByStage[stageIndex].map((blockId) => blockById.get(blockId));
    const options = [];
    for (const block of remaining) {
      const matchingRequirements = remainingRequirements.filter((requirement) => (
        requirement.allowedStages.includes(stageIndex)
        && (!requirement.shapeId || blockShapeId(block) === requirement.shapeId)
      ));
      const uniqueRequirements = matchingRequirements.filter((requirement, index, values) => (
        values.findIndex((candidate) => candidate.shapeId === requirement.shapeId
          && candidate.axis === requirement.axis
          && sameJson(candidate.allowedStages, requirement.allowedStages)) === index
      ));
      for (const requirement of uniqueRequirements) {
        for (const axis of requirement.axis ? [requirement.axis] : ["horizontal", "vertical"]) {
          for (const [gateIndex, path] of pathsToGates({
            block,
            remaining,
            gates,
            axis,
            playable,
            width: baseLevel.width,
            height: baseLevel.height,
          })) options.push({ block, gateIndex, path, axisRequirement: requirement, axis });
        }
      }
      const forced = matchingRequirements.some((requirement) => availableCarrierCount(requirement) === 1);
      if (!forced) {
        for (const [gateIndex, path] of pathsToGates({
          block,
          remaining,
          gates,
          axis: null,
          playable,
          width: baseLevel.width,
          height: baseLevel.height,
        })) options.push({ block, gateIndex, path, axisRequirement: null, axis: null });
      }
    }
    const needOpeningGates = stageIndex === 0
      && openingGateIndices.size < openingColorCount;
    const needFullGates = gateFirstRank.size < Number(target.full_level_color_count);
    options.sort((left, right) => {
      const leftNew = !gateFirstRank.has(left.gateIndex);
      const rightNew = !gateFirstRank.has(right.gateIndex);
      const leftTightness = left.axisRequirement ? availableCarrierCount(left.axisRequirement) : Number.MAX_SAFE_INTEGER;
      const rightTightness = right.axisRequirement ? availableCarrierCount(right.axisRequirement) : Number.MAX_SAFE_INTEGER;
      return leftTightness - rightTightness
        || Number(!left.axisRequirement) - Number(!right.axisRequirement)
        || (needOpeningGates || needFullGates ? Number(rightNew) - Number(leftNew) : Number(leftNew) - Number(rightNew))
        || left.path.length - right.path.length
        || left.block.id.localeCompare(right.block.id)
        || left.gateIndex - right.gateIndex;
    });

    for (const option of options) {
      const rank = route.length;
      const wasUsed = gateFirstRank.has(option.gateIndex);
      if (!wasUsed) gateFirstRank.set(option.gateIndex, rank);
      if (!prefixGateThawFeasible(gateFirstRank, statusValues)) {
        if (!wasUsed) gateFirstRank.delete(option.gateIndex);
        continue;
      }
      const wasOpening = openingGateIndices.has(option.gateIndex);
      if (stageIndex === 0) openingGateIndices.add(option.gateIndex);
      const blockIndex = remainingByStage[stageIndex].indexOf(option.block.id);
      remainingByStage[stageIndex].splice(blockIndex, 1);
      let requirementIndex = -1;
      if (option.axisRequirement) {
        requirementIndex = remainingRequirements.findIndex((requirement) => requirement.id === option.axisRequirement.id);
        const [requirement] = remainingRequirements.splice(requirementIndex, 1);
        carrierAssignments.push({
          blockId: option.block.id,
          shapeId: blockShapeId(option.block),
          axis: option.axis,
          stageId: slices[stageIndex].partition.id,
          stageIndex,
          requirement,
        });
      }
      route.push({ blockId: option.block.id, path: option.path, exitSide: gates[option.gateIndex].side });
      routeGateIndices.push(option.gateIndex);
      if (recurse(stageIndex)) return true;
      routeGateIndices.pop();
      route.pop();
      if (option.axisRequirement) {
        const assignment = carrierAssignments.pop();
        remainingRequirements.splice(requirementIndex, 0, assignment.requirement);
      }
      remainingByStage[stageIndex].splice(blockIndex, 0, option.block.id);
      if (stageIndex === 0 && !wasOpening) openingGateIndices.delete(option.gateIndex);
      if (!wasUsed) gateFirstRank.delete(option.gateIndex);
    }
    return false;
  };

  const solved = recurse(0);
  return solved ? {
    route: clone(route),
    routeGateIndices: [...routeGateIndices],
    gateFirstRank: new Map(gateFirstRank),
    openingGateIndices: new Set(openingGateIndices),
    carrierAssignments: clone(carrierAssignments),
    nodes,
    memoStates: memo.size,
  } : { error: nodes > nodeCap ? "node_cap" : "search_exhausted", nodes, memoStates: memo.size };
};

const shellCarriersFor = ({ target, blocks, slices, route }) => {
  const spec = target.mechanism_contract.shells;
  if (!spec?.count) return [];
  const lastRank = new Map();
  route.forEach((drag, index) => lastRank.set(drag.blockId, index));
  const stageById = new Map(slices.map((slice) => [slice.partition.id, new Set(slice.blocks.map((block) => block.id))]));
  const sortLatest = (candidates) => [...candidates].sort((left, right) => (
    (lastRank.get(right.id) ?? -1) - (lastRank.get(left.id) ?? -1) || left.id.localeCompare(right.id)
  ));
  if (Array.isArray(spec.items) && spec.items.length) {
    const used = new Set();
    const orderedItems = spec.items.map((item, index) => {
      const shapeId = normalizeContractShapeId(item.shape);
      const stageIds = item.stage_id ? stageById.get(item.stage_id) ?? new Set() : null;
      const candidates = blocks.filter((block) => blockShapeId(block) === shapeId
        && (stageIds === null || stageIds.has(block.id)));
      return { item, index, shapeId, stageIds, candidateCount: candidates.length };
    }).sort((left, right) => left.candidateCount - right.candidateCount || left.index - right.index);
    return orderedItems.flatMap((entry) => {
      const block = sortLatest(blocks.filter((candidate) => !used.has(candidate.id)
        && blockShapeId(candidate) === entry.shapeId
        && (entry.stageIds === null || entry.stageIds.has(candidate.id))))[0];
      if (!block) return [];
      used.add(block.id);
      return [{ block, shellIndex: used.size - 1 }];
    });
  }
  const openingIds = new Set(slices[0].blocks.map((block) => block.id));
  const eligible = Number(spec.opening_visible_count) === Number(spec.count)
    ? blocks.filter((block) => openingIds.has(block.id))
    : Number(spec.opening_visible_count) === 0
      ? blocks.filter((block) => !openingIds.has(block.id))
      : blocks;
  const used = new Set();
  const selected = [];
  const choose = (shapeId, amount) => {
    for (const block of sortLatest(eligible.filter((candidate) => !used.has(candidate.id)
      && (!shapeId || blockShapeId(candidate) === shapeId))).slice(0, amount)) {
      used.add(block.id);
      selected.push(block);
    }
  };
  if (spec.shape_histogram) {
    for (const shapeId of ["SINGLE", "H2", "V2", "H3", "V3", "SQ2", "L3", "T4", "L4", "RECT2X3"]) {
      choose(shapeId, Number(spec.shape_histogram[shapeId] ?? 0));
    }
  }
  choose(null, Math.max(0, Number(spec.count) - selected.length));
  return selected.map((block, shellIndex) => ({ block, shellIndex }));
};

const compatibleAxesFromRoute = (block, route) => {
  const drags = route.filter((drag) => drag.blockId === block.id);
  if (!drags.length) return [];
  let horizontal = true;
  let vertical = true;
  let x = block.x;
  let y = block.y;
  for (const drag of drags) {
    for (const [nextX, nextY] of drag.path ?? []) {
      if (nextY !== y) horizontal = false;
      if (nextX !== x) vertical = false;
      x = nextX;
      y = nextY;
    }
    if (drag.exitSide === "top" || drag.exitSide === "bottom") horizontal = false;
    if (drag.exitSide === "left" || drag.exitSide === "right") vertical = false;
  }
  return [horizontal ? "horizontal" : null, vertical ? "vertical" : null].filter(Boolean);
};

const runtimeAwareGateColorAssignment = ({ target, gates, plan, blocks, slices }) => {
  const palette = [...target.design_palette];
  const usedGateIndices = [...plan.gateFirstRank].sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map(([gateIndex]) => gateIndex);
  if (usedGateIndices.length !== Number(target.full_level_color_count) || palette.length !== usedGateIndices.length) {
    return null;
  }
  const routeGateByBlock = new Map(plan.route.map((drag, index) => [drag.blockId, plan.routeGateIndices[index]]));
  const shells = shellCarriersFor({ target, blocks, slices, route: plan.route });
  if (!shells.length) return null;
  const playable = new Set(blocks.length ? target.board.playable_mask.flatMap((row, y) => (
    [...row].flatMap((cell, x) => cell === "#" ? [keyOf(x, y)] : [])
  )) : []);
  const inferredAxisByBlock = new Map(shells.map(({ block }) => {
    const compatibleAxes = compatibleAxesFromRoute(block, plan.route);
    return [block.id, block.movementAxis ?? (compatibleAxes.length === 1 ? compatibleAxes[0] : null)];
  }));
  const compatibleGateIndices = new Map(shells.map(({ block }) => [block.id, new Set(gates.flatMap((gate, gateIndex) => (
    pathToSpecificGate({
      block,
      remaining: [block],
      gate,
      axis: inferredAxisByBlock.get(block.id),
      playable,
      width: target.board.cols,
      height: target.board.rows,
    }) === null ? [] : [gateIndex]
  )))]));
  const outerColorFor = (coreColor, shellIndex) => {
    const coreIndex = Math.max(0, palette.indexOf(coreColor));
    const threshold = (coreIndex + 1 + shellIndex) % Math.max(1, palette.length);
    return palette.find((color, index) => color !== coreColor && index >= threshold)
      ?? palette.find((color) => color !== coreColor);
  };
  const unusedGateIndices = gates.map((_, index) => index).filter((index) => !usedGateIndices.includes(index));
  const assignments = new Map();
  const assignUnusedRequirements = (requirements, requirementIndex = 0) => {
    if (requirementIndex >= requirements.length) return true;
    const requirement = requirements[requirementIndex];
    if ([...requirement.compatible].some((gateIndex) => assignments.get(gateIndex) === requirement.color)) {
      return assignUnusedRequirements(requirements, requirementIndex + 1);
    }
    for (const gateIndex of unusedGateIndices.filter((index) => (
      !assignments.has(index) && requirement.compatible.has(index)
    ))) {
      assignments.set(gateIndex, requirement.color);
      if (assignUnusedRequirements(requirements, requirementIndex + 1)) return true;
      assignments.delete(gateIndex);
    }
    return false;
  };
  const visitPermutation = (depth, remainingColors) => {
    if (depth === usedGateIndices.length) {
      const requirements = shells.map(({ block, shellIndex }) => {
        const coreGateIndex = routeGateByBlock.get(block.id);
        const coreColor = assignments.get(coreGateIndex);
        return {
          blockId: block.id,
          color: outerColorFor(coreColor, shellIndex),
          compatible: compatibleGateIndices.get(block.id),
        };
      });
      if (!requirements.every((requirement) => requirement.color && requirement.compatible.size)) return false;
      return assignUnusedRequirements(requirements);
    }
    const gateIndex = usedGateIndices[depth];
    for (let index = 0; index < remainingColors.length; index += 1) {
      const color = remainingColors[index];
      assignments.set(gateIndex, color);
      const next = [...remainingColors.slice(0, index), ...remainingColors.slice(index + 1)];
      if (visitPermutation(depth + 1, next)) return true;
      assignments.delete(gateIndex);
    }
    return false;
  };
  if (!visitPermutation(0, palette)) return null;
  gates.forEach((_, gateIndex) => {
    if (!assignments.has(gateIndex)) assignments.set(gateIndex, palette[gateIndex % palette.length]);
  });
  return assignments;
};

const applyGateStatusesAndColors = ({ target, gates, plan, blocks, slices }) => {
  const palette = [...target.design_palette];
  const fullColors = Number(target.full_level_color_count);
  const firstUseOrder = [...plan.gateFirstRank].sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map(([gateIndex]) => gateIndex);
  const openingOrder = firstUseOrder.filter((gateIndex) => plan.openingGateIndices.has(gateIndex));
  const laterOrder = firstUseOrder.filter((gateIndex) => !plan.openingGateIndices.has(gateIndex));
  const openingColors = openingOrder.length;
  const colorByGate = runtimeAwareGateColorAssignment({ target, gates, plan, blocks, slices }) ?? new Map();
  openingOrder.forEach((gateIndex, index) => {
    if (!colorByGate.has(gateIndex)) colorByGate.set(gateIndex, palette[index % openingColors]);
  });
  laterOrder.forEach((gateIndex, index) => {
    if (!colorByGate.has(gateIndex)) colorByGate.set(
      gateIndex,
      index < fullColors - openingColors ? palette[openingColors + index] : palette[index % fullColors],
    );
  });
  gates.forEach((_, gateIndex) => {
    if (!colorByGate.has(gateIndex)) colorByGate.set(gateIndex, palette[gateIndex % fullColors]);
  });
  const values = descriptorValues(target);
  const assignmentOrder = Array.from({ length: gates.length }, (_, gateIndex) => ({
    gateIndex,
    capacity: plan.gateFirstRank.get(gateIndex) ?? Number.POSITIVE_INFINITY,
  })).sort((left, right) => left.capacity - right.capacity || left.gateIndex - right.gateIndex);
  const finalGates = gates.map((gate, gateIndex) => ({
    id: `axis-seed-${String(blocks[0]?.id.match(/\d+/)?.[0] ?? "000").padStart(3, "0")}-g${String(gateIndex + 1).padStart(2, "0")}`,
    side: gate.side,
    offset: gate.offset,
    size: gate.size,
    color: colorByGate.get(gateIndex),
  }));
  assignmentOrder.forEach(({ gateIndex, capacity }, descriptorIndex) => {
    const value = values[descriptorIndex];
    if (value > capacity) throw new Error(`gate ${gateIndex} thaw ${value} exceeds first-use rank ${capacity}`);
    if (value > 0) finalGates[gateIndex].frozen = value;
  });
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  plan.route.forEach((drag, index) => {
    blockById.get(drag.blockId).color = colorByGate.get(plan.routeGateIndices[index]);
  });
  const openingIds = new Set(slices[0].blocks.map((block) => block.id));
  const actualOpeningColors = new Set(blocks.filter((block) => openingIds.has(block.id)).map((block) => block.color));
  const actualFullColors = new Set(blocks.map((block) => block.color));
  if (actualOpeningColors.size !== openingColors || actualFullColors.size !== fullColors) {
    throw new Error(`color assignment produced opening/full ${actualOpeningColors.size}/${actualFullColors.size}, expected ${openingColors}/${fullColors}`);
  }
  return finalGates;
};

const makeGenericAxisLevel = (id) => {
  const { target, baseEntry } = targetFor(id);
  const baseLevel = clone(baseEntry.level);
  const slices = stageSlices(target, baseLevel);
  const axisRequirements = axisRequirementsFor(target, slices);
  const totalGateCount = descriptorValues(target).length;
  const baseGates = carrierAwareBaseGates({ baseLevel, slices, axisRequirements });
  let winner = null;
  const failures = [];
  for (let variant = 0; variant < 48 && !winner; variant += 1) {
    const gates = expandedGateSlots({ baseLevel, baseGates, count: totalGateCount, variant });
    if (!gates) {
      failures.push({ variant, error: "gate_slot_allocation" });
      continue;
    }
    let plan = null;
    for (let strategyVariant = 0; strategyVariant < 8 && !plan; strategyVariant += 1) {
      const candidate = planGreedySpatialPeel({
        levelId: id,
        baseLevel,
        baseRoute: baseEntry.route,
        target,
        slices,
        gates,
        axisRequirements,
        strategyVariant,
      });
      if (!candidate.error) plan = candidate;
      else failures.push({ variant, strategyVariant, ...candidate });
    }
    if (!plan && Number(process.env.VIDEO_PARITY_AXIS_SEED_SKIP_DFS ?? 0) !== 1) {
      plan = planSpatialPeel({ levelId: id, baseLevel, target, slices, gates, axisRequirements });
    }
    if (!plan || plan.error) {
      if (plan?.error) failures.push({ variant, error: plan.error, nodes: plan.nodes });
      continue;
    }
    winner = { variant, gates, plan };
  }
  if (!winner) throw new Error(`${levelLabel(id)}: no exact gate/axis peel seed; ${JSON.stringify(failures.slice(-8))}`);
  const blocks = baseLevel.blocks.map((block) => {
    const next = clone(block);
    delete next.shutterId;
    delete next.movementAxis;
    return next;
  });
  const carrierById = new Map(winner.plan.carrierAssignments.map((assignment) => [assignment.blockId, assignment]));
  blocks.forEach((block) => {
    const assignment = carrierById.get(block.id);
    if (assignment) block.movementAxis = assignment.axis;
  });
  const runtimeSlices = [];
  let cursor = 0;
  for (const slice of slices) {
    runtimeSlices.push({ ...slice, blocks: blocks.slice(cursor, cursor + slice.blocks.length) });
    cursor += slice.blocks.length;
  }
  const shutters = [];
  let priorCount = 0;
  const control = baseLevel.playable[0];
  runtimeSlices.forEach((slice, stageIndex) => {
    if (stageIndex === 0) {
      priorCount += slice.blocks.length;
      return;
    }
    const shutterId = `axis-seed-${String(id).padStart(3, "0")}-stage-${stageIndex + 1}`;
    shutters.push({
      id: shutterId,
      x: control[0],
      y: control[1],
      width: 1,
      height: 1,
      count: priorCount,
      skin: "staging",
    });
    slice.blocks.forEach((block) => { block.shutterId = shutterId; });
    priorCount += slice.blocks.length;
  });
  const finalGates = applyGateStatusesAndColors({
    target,
    gates: winner.gates,
    plan: winner.plan,
    blocks,
    slices: runtimeSlices,
  });
  const route = clone(winner.plan.route);
  const level = {
    id,
    name: `${baseEntry.level.name} · 轴向可解种子`,
    difficulty: baseEntry.level.difficulty,
    timeSeconds: target.time_seconds,
    reward: baseEntry.level.reward,
    parMoves: route.length,
    width: baseLevel.width,
    height: baseLevel.height,
    playable: clone(baseLevel.playable),
    ...(baseLevel.blocked?.length ? { blocked: clone(baseLevel.blocked) } : {}),
    gates: finalGates,
    blocks,
    ...(shutters.length ? { shutters } : {}),
  };
  return {
    level,
    route,
    carrierAssignments: winner.plan.carrierAssignments,
    stageBlockIds: runtimeSlices.map((slice) => ({
      id: slice.partition.id,
      kind: slice.partition.kind,
      blockIds: slice.blocks.map((block) => block.id),
    })),
    construction: {
      method: winner.plan.strategyVariant === undefined
        ? "r7_geometry_mechanism_aware_axis_peel_search"
        : "r7_geometry_mechanism_aware_axis_greedy_peel",
      gate_layout_variant: winner.variant,
      strategy_variant: winner.plan.strategyVariant ?? null,
      search_nodes: winner.plan.nodes,
      memo_states: winner.plan.memoStates,
      used_gate_count: winner.plan.gateFirstRank.size,
      opening_used_gate_count: winner.plan.openingGateIndices.size,
      axis_carrier_count: winner.plan.carrierAssignments.length,
      gate_first_use_ranks: Object.fromEntries([...winner.plan.gateFirstRank].sort(([left], [right]) => left - right)),
    },
  };
};

const playableMaskFor = (level) => {
  const playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (_, x) => (playable.has(keyOf(x, y)) ? "#" : ".")).join("")
  ));
};

const stageAuditFor = (entry, target) => {
  const declared = entry.stageBlockIds?.length
    ? entry.stageBlockIds
    : [{ id: target.stage_partitions?.[0]?.id ?? "opening", kind: "opening", blockIds: entry.level.blocks.map((block) => block.id) }];
  const blockById = new Map(entry.level.blocks.map((block) => [block.id, block]));
  const actual = declared.map((stage) => {
    const blocks = stage.blockIds.map((blockId) => blockById.get(blockId)).filter(Boolean);
    return {
      id: stage.id,
      kind: stage.kind,
      count: blocks.length,
      shape_histogram: histogram(blocks.map(blockShapeId)),
    };
  });
  const expected = (target.stage_partitions?.length
    ? target.stage_partitions
    : [{ id: "opening", kind: "opening", count: target.full_level_block_count, shape_histogram: target.full_level_shape_histogram }])
    .map((stage) => ({
      id: stage.id,
      kind: stage.kind,
      count: Number(stage.count),
      shape_histogram: stage.shape_histogram,
    }));
  return { expected, actual, declared };
};

const axisStageAuditFor = (entry, target, declaredStages) => {
  const spec = target.mechanism_contract.axis_blocks;
  const stageByBlockId = new Map(declaredStages.flatMap((stage, stageIndex) => (
    stage.blockIds.map((blockId) => [blockId, { stageId: stage.id, stageIndex }])
  )));
  const carriers = entry.level.blocks.filter((block) => block.movementAxis).map((block) => ({
    block_id: block.id,
    shape: blockShapeId(block),
    axis: block.movementAxis,
    ...(stageByBlockId.get(block.id) ?? { stageId: null, stageIndex: null }),
  }));
  const unused = new Set(carriers.map((_, index) => index));
  const itemMatches = (spec.items ?? []).map((item, itemIndex) => {
    const hidden = item.hiddenAtOpening === true || spec.hidden_at_opening === true;
    const carrierIndex = [...unused].find((index) => {
      const carrier = carriers[index];
      return (!item.shape || carrier.shape === normalizeContractShapeId(item.shape))
        && (!item.axis || carrier.axis === item.axis)
        && (!item.stage_id || carrier.stageId === item.stage_id)
        && (!hidden || carrier.stageIndex > 0);
    });
    if (carrierIndex === undefined) return { item_index: itemIndex, item, matched_block_id: null, pass: false };
    unused.delete(carrierIndex);
    return { item_index: itemIndex, item, matched_block_id: carriers[carrierIndex].block_id, pass: true };
  });
  const visibilityPass = spec.hidden_at_opening === true
    ? carriers.every((carrier) => carrier.stageIndex > 0)
    : spec.hidden_at_opening === false
      ? carriers.every((carrier) => carrier.stageIndex === 0)
      : true;
  return {
    pass: itemMatches.every((match) => match.pass) && visibilityPass,
    hidden_at_opening_expected: spec.hidden_at_opening ?? null,
    visibility_pass: visibilityPass,
    item_matches: itemMatches,
    carriers,
  };
};

const exactAudit = (entry) => {
  const id = entry.level.id;
  const { target, contractEntry, baseEntry } = targetFor(id);
  const level = entry.level;
  const actualShapeHistogram = histogram(level.blocks.map(blockShapeId));
  const actualAxisByShape = {};
  for (const axis of ["horizontal", "vertical"]) {
    const axisHistogram = histogram(level.blocks
      .filter((block) => block.movementAxis === axis)
      .map(blockShapeId));
    if (Object.keys(axisHistogram).length > 0) actualAxisByShape[axis] = axisHistogram;
  }
  const expectedAxisByShape = target.mechanism_contract.axis_blocks.by_axis_shape ?? null;
  const exitContract = target.mechanism_contract.directional_exits;
  const stageAudit = stageAuditFor(entry, target);
  const axisStageAudit = axisStageAuditFor(entry, target, stageAudit.declared);
  const actualFrozenValues = level.gates.filter((gate) => !gate.star && (gate.frozen ?? 0) > 0)
    .map((gate) => gate.frozen).sort((left, right) => left - right);
  const expectedFrozenValues = [...(exitContract.frozen_values ?? [])].map(Number).sort((left, right) => left - right);
  const expectedTotalExits = Number(exitContract.ordinary_count ?? 0)
    + expectedFrozenValues.length
    + Number(exitContract.star_count ?? 0)
    + Number(exitContract.star_frozen_count ?? 0);
  const checks = {
    board_rows: { expected: target.board.rows, actual: level.height },
    board_cols: { expected: target.board.cols, actual: level.width },
    playable_cell_count: { expected: target.board.playable_cell_count, actual: level.playable.length },
    playable_mask: { expected: target.board.playable_mask, actual: playableMaskFor(level) },
    block_count: { expected: target.full_level_block_count, actual: level.blocks.length },
    shape_histogram: { expected: target.full_level_shape_histogram, actual: actualShapeHistogram },
    occupied_cell_count: {
      expected: target.full_level_occupied_cell_count,
      actual: level.blocks.reduce((sum, block) => sum + block.shape.length, 0),
    },
    full_color_count: { expected: target.full_level_color_count, actual: new Set(level.blocks.map((block) => block.color)).size },
    total_exit_count: { expected: expectedTotalExits, actual: level.gates.length },
    ordinary_exit_count: {
      expected: exitContract.ordinary_count,
      actual: level.gates.filter((gate) => !gate.frozen && !gate.star).length,
    },
    frozen_exit_values: { expected: expectedFrozenValues, actual: actualFrozenValues },
    star_exit_count: {
      expected: Number(exitContract.star_count ?? 0),
      actual: level.gates.filter((gate) => gate.star && !(gate.frozen ?? 0)).length,
    },
    star_frozen_exit_count: {
      expected: Number(exitContract.star_frozen_count ?? 0),
      actual: level.gates.filter((gate) => gate.star && (gate.frozen ?? 0) > 0).length,
    },
    stage_partitions: { expected: stageAudit.expected, actual: stageAudit.actual },
    axis_block_count: {
      expected: target.mechanism_contract.axis_blocks.count,
      actual: level.blocks.filter((block) => block.movementAxis).length,
    },
    axis_by_shape: expectedAxisByShape
      ? { expected: expectedAxisByShape, actual: actualAxisByShape }
      : { expected: null, actual: actualAxisByShape },
    axis_stage_visibility_and_items: { expected: true, actual: axisStageAudit.pass },
    time_seconds: { expected: target.time_seconds, actual: level.timeSeconds },
  };
  const mismatches = Object.entries(checks).flatMap(([field, check]) => (
    check.expected === null || sameJson(check.expected, check.actual) ? [] : [{ field, ...check }]
  ));
  let validateError = null;
  try {
    runtime.validateLevel(level);
  } catch (error) {
    validateError = error instanceof Error ? error.message : String(error);
  }
  const routeAxis = axisRouteAudit(level, entry.route);
  const replay = validateError ? { pass: false, error: "validateLevel failed" } : replayRoute(level, entry.route);
  return {
    level_id: levelLabel(id),
    source: {
      contract_level_id: contractEntry.level_id,
      r7_base_level_name: baseEntry.level.name,
    },
    checks,
    mismatches,
    validate_level: { pass: validateError === null, error: validateError },
    all_axis_carrier_routes_same_axis: routeAxis,
    axis_contract_semantics: axisStageAudit,
    puzzle_model_replay: replay,
    construction: entry.construction,
    acceptance: mismatches.length === 0 && validateError === null && routeAxis.pass && replay.pass
      ? "completion_witness_only_pass"
      : "fail",
    reposition_claim: "none; this artifact proves feasibility/completion only and does not measure or certify a necessary-reposition lower bound",
  };
};

const allAxisLevelIds = contract.levels
  .filter((entry) => Number(entry.our_design_target?.mechanism_contract?.axis_blocks?.count ?? 0) > 0)
  .map((entry) => Number(String(entry.level_id).replace(/^Lv/i, "")));
const requestedIds = (process.env.VIDEO_PARITY_AXIS_SEED_IDS ?? "").split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter(Number.isSafeInteger);
const generationIds = requestedIds.length ? allAxisLevelIds.filter((id) => requestedIds.includes(id)) : allAxisLevelIds;
const generated = generationIds.map((id) => id === 50 ? makeLv50() : id === 60 ? makeLv60() : makeGenericAxisLevel(id));
const audits = generated.map(exactAudit);
if (audits.some((audit) => audit.acceptance !== "completion_witness_only_pass")) {
  throw new Error(`Axis seed validation failed:\n${JSON.stringify(audits, null, 2)}`);
}

const generatedOn = new Date().toISOString();
const source = {
  contract: { path: CONTRACT_RELATIVE, sha256: sha256(contractText) },
  r7_base: { path: BASE_RELATIVE, sha256: sha256(baseText) },
};
const artifact = {
  title: "Block Out! video-parity axis-compatible base seeds",
  generated_on: generatedOn,
  prototype_only: true,
  applied_to_live_campaign: false,
  scope: generationIds.map(levelLabel),
  proof_scope: "validateLevel plus authored PuzzleModel completion replay; no necessary-reposition lower-bound claim",
  source,
  levels: generated.map((entry) => ({
    level_id: levelLabel(entry.level.id),
    target: targetFor(entry.level.id).target,
    level: entry.level,
    route: entry.route,
    carrier_assignments: entry.carrierAssignments ?? null,
    stage_block_ids: entry.stageBlockIds ?? null,
    construction: entry.construction,
  })),
};
const routes = generated.map((entry) => ({ level_id: levelLabel(entry.level.id), drags: entry.route }));
const auditArtifact = {
  title: "Block Out! video-parity axis seed structural and replay audit",
  generated_on: generatedOn,
  source,
  summary: {
    levels: audits.length,
    exact_structure_pass: audits.filter((audit) => audit.mismatches.length === 0).length,
    validate_level_pass: audits.filter((audit) => audit.validate_level.pass).length,
    axis_route_pass: audits.filter((audit) => audit.all_axis_carrier_routes_same_axis.pass).length,
    puzzle_model_replay_pass: audits.filter((audit) => audit.puzzle_model_replay.pass).length,
    accepted_completion_witnesses: audits.filter((audit) => audit.acceptance === "completion_witness_only_pass").length,
    necessary_reposition_lower_bound_claimed: false,
  },
  levels: audits,
};
const tsSource = `import type { LevelSpec } from "../../src/core/types";\n\n`
  + `export const VIDEO_PARITY_AXIS_SEED_LEVELS = ${JSON.stringify(generated.map((entry) => entry.level), null, 2)} as const satisfies readonly LevelSpec[];\n`;
const readme = `# Video-parity axis-compatible seeds\n\n`
  + `Generated by \`tools/generate-video-parity-axis-seeds.mjs\`. This temporary artifact contains every v6-contract level with axis blocks.\n\n`
  + `Every level matches the v6 board dimensions and playable mask/count, complete block shape histogram/count/occupied area, full-level color count, timer, stage partitions, complete ordinary/frozen exit descriptor count, and axis-carrier count/shape/axis/stage visibility semantics. Every authored carrier movement and exit is parallel to its movementAxis. \`validateLevel\` and a fresh full \`PuzzleModel\` replay pass.\n\n`
  + `The generator also invokes the current runtime assembler in isolation. \`runtime-audit.json\` must report exact contract, validateLevel, and fresh assembled PuzzleModel replay for every generated level before the command succeeds.\n\n`
  + `This is a completion-witness artifact only. It does not claim, estimate, or certify a necessary-reposition lower bound and is not wired into the live campaign.\n`;

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(resolve(OUTPUT_DIR, "axis-seed-levels.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8"),
  writeFile(resolve(OUTPUT_DIR, "validation-routes.json"), `${JSON.stringify(routes, null, 2)}\n`, "utf8"),
  writeFile(resolve(OUTPUT_DIR, "structural-audit.json"), `${JSON.stringify(auditArtifact, null, 2)}\n`, "utf8"),
  writeFile(resolve(OUTPUT_DIR, "videoParityAxisSeeds.generated.ts"), tsSource, "utf8"),
  writeFile(resolve(OUTPUT_DIR, "README.md"), readme, "utf8"),
]);

let runtimeAcceptance = { skipped: true };
if (process.env.VIDEO_PARITY_AXIS_SEED_SKIP_ASSEMBLER !== "1") {
  const outputPath = (name) => relative(ROOT, resolve(OUTPUT_DIR, name)).replaceAll("\\", "/");
  const executeAssembler = () => new Promise((resolvePromise, rejectPromise) => {
    execFile(process.execPath, ["--expose-gc", ASSEMBLER_PATH], {
      cwd: ROOT,
      env: {
        ...process.env,
        VIDEO_PARITY_CONTRACT_RELATIVE: CONTRACT_RELATIVE,
        VIDEO_PARITY_BASE_GENERATED_RELATIVE: BASE_GENERATED_RELATIVE,
        VIDEO_PARITY_BASE_CANDIDATES_RELATIVE: BASE_RELATIVE,
        VIDEO_PARITY_BASE_ROUTES_RELATIVE: BASE_ROUTES_RELATIVE,
        VIDEO_PARITY_BASE_OVERRIDES_RELATIVE: outputPath("axis-seed-levels.json"),
        VIDEO_PARITY_COMPLETION_WITNESSES_RELATIVE: "",
        VIDEO_PARITY_COMPLETION_WITNESS_LEVELS_SHA256: "",
        VIDEO_PARITY_LEVEL_IDS: generationIds.join(","),
        VIDEO_PARITY_PRESERVE_EXISTING_IDS: "",
        VIDEO_PARITY_OUTPUT_RELATIVE: outputPath("runtime.generated.ts"),
        VIDEO_PARITY_AUDIT_RELATIVE: outputPath("runtime-audit.json"),
        VIDEO_PARITY_ROUTE_OUTPUT_RELATIVE: outputPath("runtime-routes.json"),
        VIDEO_PARITY_SOLVER_MAX_STATES: "500",
        VIDEO_PARITY_ROUTE_PERMUTATION_MAX_STATES: "500",
        VIDEO_PARITY_DYNAMIC_WITNESS_MAX_STATES: "5000",
        VIDEO_PARITY_GATE_THAW_PERMUTATION: "1",
        VIDEO_PARITY_PROVE_FLOORS: "0",
      },
      maxBuffer: 64 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        error.message += `\nassembler stdout:\n${stdout}\nassembler stderr:\n${stderr}`;
        rejectPromise(error);
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
  await executeAssembler();
  const runtimeAuditText = await readFile(resolve(OUTPUT_DIR, "runtime-audit.json"), "utf8");
  const runtimeAudit = JSON.parse(runtimeAuditText);
  const expected = generationIds.length;
  const runtimeSummary = runtimeAudit.summary ?? {};
  const axisAssignment = runtimeSummary.carrier_assignment?.axis_blocks ?? {};
  const runtimePass = runtimeSummary.requested === expected
    && runtimeSummary.exact_contract === expected
    && runtimeSummary.validate_level_passed === expected
    && runtimeSummary.completion_witness_replayed === expected
    && runtimeSummary.incomplete === 0
    && runtimeSummary.fatal_errors === 0
    && axisAssignment.base_route_replan_required === 0
    && axisAssignment.base_route_compatible === axisAssignment.total;
  if (!runtimePass) {
    throw new Error(`Runtime assembler acceptance failed:\n${JSON.stringify(runtimeSummary, null, 2)}`);
  }
  runtimeAcceptance = {
    skipped: false,
    pass: true,
    assembler: relative(ROOT, ASSEMBLER_PATH).replaceAll("\\", "/"),
    audit: outputPath("runtime-audit.json"),
    summary: runtimeSummary,
    assembled_levels_sha256: runtimeAudit.outputs?.levels_sha256 ?? null,
    canonical_level_specs_sha256: runtimeAudit.outputs?.canonical_level_specs_sha256 ?? null,
    runtime_routes_sha256: runtimeAudit.outputs?.validation_routes_sha256 ?? null,
  };
  await writeFile(
    resolve(OUTPUT_DIR, "runtime-acceptance.json"),
    `${JSON.stringify(runtimeAcceptance, null, 2)}\n`,
    "utf8",
  );
}

console.log(JSON.stringify({
  output_dir: relative(ROOT, OUTPUT_DIR).replaceAll("\\", "/"),
  source,
  summary: auditArtifact.summary,
  runtime_assembler: runtimeAcceptance,
  levels: audits.map((audit) => ({
    level_id: audit.level_id,
    construction: audit.construction.method,
    search_nodes: audit.construction.search_nodes,
    blocks: audit.checks.block_count.actual,
    gates: audit.checks.total_exit_count.actual,
    colors: audit.checks.full_color_count.actual,
    replay_moves: audit.puzzle_model_replay.moves,
    replay_cleared: audit.puzzle_model_replay.cleared,
  })),
}, null, 2));

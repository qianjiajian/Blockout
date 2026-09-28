import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(TOOL), "..");
const CONTRACT_PATH = resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json");
const ASSEMBLED_PATH = resolve(ROOT, "playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json");
const OUTPUT_DIR = resolve(ROOT, "playtest-results/experiments/competitor-composition-r141/certified-staged-gadgets");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "formal-candidates.json");

const SHAPES = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
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
  SQ3: [[
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ]],
};
const SHAPE_IDS = Object.keys(SHAPES);
const SIDES = ["top", "right", "bottom", "left"];

const parseSelection = (value) => {
  if (!value) return null;
  const selected = new Set();
  for (const token of value.split(",").map((part) => part.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid level selection: ${token}`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    for (let id = from; id <= to; id += 1) selected.add(id);
  }
  return selected;
};

const args = process.argv.slice(2);
const selectionIndex = args.indexOf("--levels");
const selectedIds = parseSelection(selectionIndex >= 0 ? args[selectionIndex + 1] : process.env.FORMAL_GENERATE_IDS);
const maxPairStates = Number(process.env.FORMAL_PAIR_MAX_STATES ?? 30_000);
const maxAllocationNodes = Number(process.env.FORMAL_PAIR_ALLOCATION_NODES ?? 1_500_000);

const CUSTOM_GATE_LAYOUTS = {
  30: [
    ["top", 7, 1], ["bottom", 7, 1], ["right", 0, 2], ["right", 3, 2],
  ],
  86: [
    ["top", 0, 1], ["top", 2, 1], ["bottom", 0, 1], ["bottom", 2, 1],
    ["left", 4, 1], ["right", 4, 1],
  ],
  87: [
    ["left", 4, 1], ["right", 4, 1], ["left", 6, 1], ["right", 6, 1],
    ["top", 3, 2],
  ],
  92: [
    ["left", 1, 1], ["right", 4, 1], ["left", 3, 1], ["right", 6, 1],
    ["left", 5, 1], ["bottom", 0, 3],
  ],
  97: [
    ["left", 0, 1], ["right", 0, 1], ["top", 0, 1], ["bottom", 4, 1],
    ["top", 3, 3],
  ],
};

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "certified-staged-density-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const clone = (value) => structuredClone(value);
const pointKey = ([x, y]) => `${x},${y}`;
const shapeSize = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});
const cellsAt = (shape, [x, y]) => shape.map(([dx, dy]) => [x + dx, y + dy]);
const overlaps = (left, right) => {
  const occupied = new Set(left.map(pointKey));
  return right.some((point) => occupied.has(pointKey(point)));
};
const replay = (level, route) => {
  const model = new runtime.PuzzleModel(level);
  for (let index = 0; index < route.length; index += 1) {
    const drag = route[index];
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) return { pass: false, reason: `move_${index}` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return { pass: false, reason: `exit_${index}` };
    if (!model.commitAction()) return { pass: false, reason: `commit_${index}` };
  }
  return { pass: model.snapshot().complete, reason: model.snapshot().complete ? null : "incomplete" };
};

const playableSetFor = (level) => new Set((level.playable ?? Array.from(
  { length: level.width * level.height },
  (_, index) => [index % level.width, Math.floor(index / level.width)],
)).map(pointKey));

const originsAtGate = (level, shape, gate, control = null) => {
  const { width, height } = shapeSize(shape);
  const span = gate.side === "top" || gate.side === "bottom" ? width : height;
  if (span > gate.size) return [];
  const playable = playableSetFor(level);
  const blocked = new Set((level.blocked ?? []).map(pointKey));
  if (control) blocked.add(pointKey(control));
  const results = [];
  for (let along = gate.offset; along <= gate.offset + gate.size - span; along += 1) {
    const origin = gate.side === "top" ? [along, 0]
      : gate.side === "bottom" ? [along, level.height - height]
        : gate.side === "left" ? [0, along]
          : [level.width - width, along];
    const cells = cellsAt(shape, origin);
    if (cells.every((cell) => playable.has(pointKey(cell)) && !blocked.has(pointKey(cell)))) results.push(origin);
  }
  return results;
};

const stageLevel = (base, blocks, control) => {
  const level = clone(base);
  level.blocks = blocks;
  delete level.shutters;
  delete level.elevators;
  delete level.conveyors;
  delete level.designTargets;
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  if (control) level.blocked = [...(base.blocked ?? []), control];
  else if (!(base.blocked?.length)) delete level.blocked;
  return level;
};

const pairTemplateCache = new Map();
const findPairTemplate = (base, shapeIdA, shapeIdB, gateIndexA, gateIndexB, control) => {
  const controlKey = control ? pointKey(control) : "none";
  const cacheKey = [base.id, shapeIdA, shapeIdB, gateIndexA, gateIndexB, controlKey].join("|");
  if (pairTemplateCache.has(cacheKey)) return pairTemplateCache.get(cacheKey);
  const gateA = base.gates[gateIndexA];
  const gateB = base.gates[gateIndexB];
  let winner = null;
  for (const shapeA of SHAPES[shapeIdA]) {
    const startsA = originsAtGate(base, shapeA, gateA, control);
    const targetsA = originsAtGate(base, shapeA, gateB, control);
    if (!startsA.length || !targetsA.length) continue;
    for (const shapeB of SHAPES[shapeIdB]) {
      const startsB = originsAtGate(base, shapeB, gateB, control);
      const targetsB = originsAtGate(base, shapeB, gateA, control);
      if (!startsB.length || !targetsB.length) continue;
      for (const originA of startsA) {
        const residentA = cellsAt(shapeA, originA);
        if (!targetsB.every((origin) => overlaps(residentA, cellsAt(shapeB, origin)))) continue;
        for (const originB of startsB) {
          const residentB = cellsAt(shapeB, originB);
          if (overlaps(residentA, residentB)) continue;
          if (!targetsA.every((origin) => overlaps(residentB, cellsAt(shapeA, origin)))) continue;
          const blocks = [
            { id: "pair-a", x: originA[0], y: originA[1], shape: clone(shapeA), color: gateB.color },
            { id: "pair-b", x: originB[0], y: originB[1], shape: clone(shapeB), color: gateA.color },
          ];
          const level = stageLevel(base, blocks, control);
          try { runtime.validateLevel(level); } catch { continue; }
          const solution = runtime.solveLevelOptimally(level, maxPairStates);
          if (!solution.solved || solution.repositionOverhead !== 1) continue;
          if (!replay(level, solution.drags).pass) continue;
          winner = {
            shapeIds: [shapeIdA, shapeIdB],
            gateIndices: [gateIndexA, gateIndexB],
            blocks,
            route: solution.drags,
            exploredStates: solution.exploredStates,
          };
          break;
        }
        if (winner) break;
      }
      if (winner) break;
    }
    if (winner) break;
  }
  pairTemplateCache.set(cacheKey, winner);
  return winner;
};

const soloTemplateCache = new Map();
const findSoloTemplate = (base, shapeId, gateIndex, control) => {
  const controlKey = control ? pointKey(control) : "none";
  const cacheKey = [base.id, shapeId, gateIndex, controlKey].join("|");
  if (soloTemplateCache.has(cacheKey)) return soloTemplateCache.get(cacheKey);
  const gate = base.gates[gateIndex];
  let winner = null;
  for (const shape of SHAPES[shapeId]) {
    for (const origin of originsAtGate(base, shape, gate, control)) {
      const block = { id: "solo", x: origin[0], y: origin[1], shape: clone(shape), color: gate.color };
      const level = stageLevel(base, [block], control);
      try { runtime.validateLevel(level); } catch { continue; }
      const route = [{ blockId: block.id, path: [], exitSide: gate.side }];
      if (!replay(level, route).pass) continue;
      winner = { shapeId, gateIndex, block, route };
      break;
    }
    if (winner) break;
  }
  soloTemplateCache.set(cacheKey, winner);
  return winner;
};

const controlCandidates = (level) => {
  const playable = [...playableSetFor(level)].map((key) => key.split(",").map(Number));
  const gateCells = new Set();
  for (const gate of level.gates) {
    for (let coordinate = gate.offset; coordinate < gate.offset + gate.size; coordinate += 1) {
      const cell = gate.side === "top" ? [coordinate, 0]
        : gate.side === "bottom" ? [coordinate, level.height - 1]
          : gate.side === "left" ? [0, coordinate]
            : [level.width - 1, coordinate];
      gateCells.add(pointKey(cell));
    }
  }
  const centerX = (level.width - 1) / 2;
  const centerY = (level.height - 1) / 2;
  return playable
    .filter((cell) => !gateCells.has(pointKey(cell)))
    .sort((left, right) => {
      const leftEdge = Math.min(left[0], left[1], level.width - 1 - left[0], level.height - 1 - left[1]);
      const rightEdge = Math.min(right[0], right[1], level.width - 1 - right[0], level.height - 1 - right[1]);
      return rightEdge - leftEdge
        || (Math.abs(left[0] - centerX) + Math.abs(left[1] - centerY)) - (Math.abs(right[0] - centerX) + Math.abs(right[1] - centerY))
        || left[1] - right[1] || left[0] - right[0];
    });
};

const allocatePairs = ({ histogram, target, gateCount, options, soloAvailable }) => {
  const initial = SHAPE_IDS.map((shapeId) => histogram[shapeId] ?? 0);
  const allGateMask = (1 << gateCount) - 1;
  const ordered = [...options].sort((left, right) => {
    const leftDistinct = Number(left.shapeA !== left.shapeB);
    const rightDistinct = Number(right.shapeA !== right.shapeB);
    return leftDistinct - rightDistinct
      || left.gateA - right.gateA || left.gateB - right.gateB
      || SHAPE_IDS.indexOf(left.shapeA) - SHAPE_IDS.indexOf(right.shapeA)
      || SHAPE_IDS.indexOf(left.shapeB) - SHAPE_IDS.indexOf(right.shapeB);
  });
  const optionShapeIndices = ordered.map((option) => [SHAPE_IDS.indexOf(option.shapeA), SHAPE_IDS.indexOf(option.shapeB)]);
  const memo = new Set();
  let nodes = 0;
  const reserveMissingColors = (counts, usedMask) => {
    const missing = Array.from({ length: gateCount }, (_, gateIndex) => gateIndex)
      .filter((gateIndex) => (usedMask & (1 << gateIndex)) === 0)
      .sort((left, right) => {
        const leftOptions = soloAvailable.filter((row, shapeIndex) => row[left] && counts[shapeIndex] > 0).length;
        const rightOptions = soloAvailable.filter((row, shapeIndex) => row[right] && counts[shapeIndex] > 0).length;
        return leftOptions - rightOptions || left - right;
      });
    const reserved = [];
    const assign = (index) => {
      if (index === missing.length) return true;
      const gateIndex = missing[index];
      for (let shapeIndex = 0; shapeIndex < counts.length; shapeIndex += 1) {
        if (counts[shapeIndex] <= 0 || !soloAvailable[shapeIndex][gateIndex]) continue;
        counts[shapeIndex] -= 1;
        reserved.push({ shapeId: SHAPE_IDS[shapeIndex], gateIndex });
        if (assign(index + 1)) return true;
        reserved.pop();
        counts[shapeIndex] += 1;
      }
      return false;
    };
    const working = [...counts];
    return assign.call(null, 0) ? { reserved, remainingAfterReservation: working } : null;
  };
  const visit = (counts, remaining, usedMask, startIndex) => {
    nodes += 1;
    if (nodes > maxAllocationNodes) return null;
    if (remaining === 0) {
      const reservation = reserveMissingColors([...counts], usedMask);
      return reservation ? { allocation: [], reservedSolos: reservation.reserved } : null;
    }
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (Math.floor(total / 2) < remaining) return null;
    const missingCount = gateCount - usedMask.toString(2).replaceAll("0", "").length;
    if (missingCount > total) return null;
    const key = `${remaining}|${usedMask}|${startIndex}|${counts.join(",")}`;
    if (memo.has(key)) return null;
    memo.add(key);
    const rankedIndices = ordered.map((option, index) => {
      if (index < startIndex) return null;
      const [shapeA, shapeB] = optionShapeIndices[index];
      if (counts[shapeA] <= 0 || counts[shapeB] <= 0 || (shapeA === shapeB && counts[shapeA] < 2)) return null;
      const optionMask = (1 << option.gateA) | (1 << option.gateB);
      const newCoverage = (optionMask & ~usedMask).toString(2).replaceAll("0", "").length;
      return { index, newCoverage, scarcity: counts[shapeA] + counts[shapeB] };
    }).filter(Boolean).sort((left, right) => right.newCoverage - left.newCoverage || left.scarcity - right.scarcity || left.index - right.index);
    for (const ranked of rankedIndices) {
      const option = ordered[ranked.index];
      const [shapeA, shapeB] = optionShapeIndices[ranked.index];
      const next = [...counts];
      next[shapeA] -= 1;
      next[shapeB] -= 1;
      const optionMask = (1 << option.gateA) | (1 << option.gateB);
      const suffix = visit(next, remaining - 1, usedMask | optionMask, ranked.index);
      if (suffix) return { allocation: [option, ...suffix.allocation], reservedSolos: suffix.reservedSolos };
    }
    return null;
  };
  const solved = visit(initial, target, 0, 0);
  if (!solved) return { allocation: null, nodes };
  const allocation = solved.allocation;
  const remainingCounts = [...initial];
  for (const option of allocation) {
    remainingCounts[SHAPE_IDS.indexOf(option.shapeA)] -= 1;
    remainingCounts[SHAPE_IDS.indexOf(option.shapeB)] -= 1;
  }
  return { allocation, remainingCounts, reservedSolos: solved.reservedSolos, nodes };
};

const buildCandidateForControl = (source, contractEntry, control) => {
  const base = clone(source.level);
  const target = contractEntry.our_design_target;
  const customGateLayout = CUSTOM_GATE_LAYOUTS[base.id];
  if (customGateLayout) {
    base.gates = customGateLayout.map(([side, offset, size], index) => ({
      id: `v5-${String(base.id).padStart(3, "0")}-gate-${String(index + 1).padStart(2, "0")}`,
      side,
      offset,
      size,
      color: target.design_palette[index],
    }));
  }
  const pairOptions = [];
  for (let gateA = 0; gateA < base.gates.length; gateA += 1) {
    for (let gateB = gateA + 1; gateB < base.gates.length; gateB += 1) {
      for (let shapeIndexA = 0; shapeIndexA < SHAPE_IDS.length; shapeIndexA += 1) {
        const shapeA = SHAPE_IDS[shapeIndexA];
        if (!(target.full_level_shape_histogram[shapeA] > 0)) continue;
        for (let shapeIndexB = shapeIndexA; shapeIndexB < SHAPE_IDS.length; shapeIndexB += 1) {
          const shapeB = SHAPE_IDS[shapeIndexB];
          if (!(target.full_level_shape_histogram[shapeB] > 0)) continue;
          const template = findPairTemplate(base, shapeA, shapeB, gateA, gateB, control);
          if (template) pairOptions.push({ shapeA, shapeB, gateA, gateB, template });
        }
      }
    }
  }
  const allocated = allocatePairs({
    histogram: target.full_level_shape_histogram,
    target: target.recommended_minimum_reposition_overhead,
    gateCount: base.gates.length,
    options: pairOptions,
    soloAvailable: SHAPE_IDS.map((shapeId) => base.gates.map((_gate, gateIndex) => Boolean(findSoloTemplate(base, shapeId, gateIndex, control)))),
  });
  if (!allocated.allocation) return { pass: false, reason: "pair_allocation", control, pairOptionCount: pairOptions.length, nodes: allocated.nodes };

  const stages = allocated.allocation.map((option, index) => {
    const idA = `v5-${String(base.id).padStart(3, "0")}-pair-${String(index + 1).padStart(2, "0")}-a`;
    const idB = `v5-${String(base.id).padStart(3, "0")}-pair-${String(index + 1).padStart(2, "0")}-b`;
    const blocks = option.template.blocks.map((block, blockIndex) => ({ ...clone(block), id: blockIndex === 0 ? idA : idB }));
    const route = option.template.route.map((drag) => ({ ...clone(drag), blockId: drag.blockId === "pair-a" ? idA : idB }));
    return { kind: "pair", blocks, route, option };
  });

  const reservedByShape = new Map();
  for (const reservation of allocated.reservedSolos ?? []) {
    const queue = reservedByShape.get(reservation.shapeId) ?? [];
    queue.push(reservation.gateIndex);
    reservedByShape.set(reservation.shapeId, queue);
  }
  for (let shapeIndex = 0; shapeIndex < allocated.remainingCounts.length; shapeIndex += 1) {
    const shapeId = SHAPE_IDS[shapeIndex];
    for (let copyIndex = 0; copyIndex < allocated.remainingCounts[shapeIndex]; copyIndex += 1) {
      let template = null;
      const reservedGate = reservedByShape.get(shapeId)?.shift();
      if (reservedGate !== undefined) template = findSoloTemplate(base, shapeId, reservedGate, control);
      for (let gateIndex = 0; gateIndex < base.gates.length && !template; gateIndex += 1) {
        template = findSoloTemplate(base, shapeId, gateIndex, control);
      }
      if (!template) return { pass: false, reason: `solo_${shapeId}`, control, pairOptionCount: pairOptions.length, nodes: allocated.nodes };
      const id = `v5-${String(base.id).padStart(3, "0")}-solo-${String(stages.length + 1).padStart(2, "0")}`;
      const block = { ...clone(template.block), id };
      const route = template.route.map((drag) => ({ ...clone(drag), blockId: id }));
      stages.push({ kind: "solo", blocks: [block], route, template });
    }
  }

  if (stages.at(-1)?.kind === "pair") {
    const last = stages.at(-1);
    const option = last.option;
    const unblockedTemplate = findPairTemplate(base, option.shapeA, option.shapeB, option.gateA, option.gateB, null);
    if (!unblockedTemplate) return { pass: false, reason: "last_pair_without_control", control, pairOptionCount: pairOptions.length, nodes: allocated.nodes };
    const [idA, idB] = last.blocks.map((block) => block.id);
    last.blocks = unblockedTemplate.blocks.map((block, blockIndex) => ({ ...clone(block), id: blockIndex === 0 ? idA : idB }));
    last.route = unblockedTemplate.route.map((drag) => ({ ...clone(drag), blockId: drag.blockId === "pair-a" ? idA : idB }));
  }

  const blocks = [];
  const route = [];
  const shutters = [];
  let cumulative = 0;
  stages.forEach((stage, stageIndex) => {
    const shutterId = stageIndex === 0 ? null : `v5-${String(base.id).padStart(3, "0")}-stage-${String(stageIndex + 1).padStart(2, "0")}`;
    if (shutterId) {
      shutters.push({ id: shutterId, x: control[0], y: control[1], width: 1, height: 1, count: cumulative, skin: "staging" });
    }
    for (const block of stage.blocks) blocks.push(shutterId ? { ...block, shutterId } : block);
    route.push(...stage.route);
    cumulative += stage.blocks.length;
  });

  const level = clone(base);
  level.blocks = blocks;
  level.shutters = shutters;
  delete level.elevators;
  delete level.conveyors;
  delete level.blocked;
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  level.parMoves = route.length;
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
    minimumRepositionOverhead: target.recommended_minimum_reposition_overhead,
  };
  try { runtime.validateLevel(level); } catch (error) {
    return { pass: false, reason: `full_validate:${error.message}`, control, pairOptionCount: pairOptions.length, nodes: allocated.nodes };
  }
  const fullReplay = replay(level, route);
  if (!fullReplay.pass) return { pass: false, reason: `full_replay:${fullReplay.reason}`, control, pairOptionCount: pairOptions.length, nodes: allocated.nodes };
  return {
    pass: true,
    candidate: {
      level_id: contractEntry.level_id,
      target,
      audit: {
        generator: "certified_staged_pair_gadgets_v5",
        target_reposition_overhead: target.recommended_minimum_reposition_overhead,
        strict_stage_floor_allocation: stages.map((stage) => stage.kind === "pair" ? 1 : 0),
        pair_stage_count: stages.filter((stage) => stage.kind === "pair").length,
        solo_stage_count: stages.filter((stage) => stage.kind === "solo").length,
        shared_internal_control_cell: control,
        pair_option_count: pairOptions.length,
        allocation_search_nodes: allocated.nodes,
        proof_invariant: "Each two-block stage has exact minimum reposition overhead 1 under solveLevelOptimally; every remaining one-block stage exits at zero overhead.",
      },
      level,
      route,
    },
    stageCount: stages.length,
    pairOptionCount: pairOptions.length,
    nodes: allocated.nodes,
  };
};

const contract = JSON.parse(await readFile(CONTRACT_PATH, "utf8"));
const assembled = JSON.parse(await readFile(ASSEMBLED_PATH, "utf8"));
const sourceById = new Map(assembled.levels.map((entry) => [entry.level_id, entry]));
const results = [];
const failures = [];

for (const contractEntry of contract.levels) {
  const id = Number(contractEntry.level_id.slice(2));
  const target = contractEntry.our_design_target;
  if (!target.requires_staged_reveal || (selectedIds && !selectedIds.has(id))) continue;
  const source = sourceById.get(contractEntry.level_id);
  if (!source) {
    failures.push({ level_id: contractEntry.level_id, reason: "missing_source" });
    continue;
  }
  let built = null;
  const attempts = [];
  for (const control of controlCandidates(source.level).slice(0, 18)) {
    const attempt = buildCandidateForControl(source, contractEntry, control);
    attempts.push({ control, pass: attempt.pass, reason: attempt.reason ?? null, pair_option_count: attempt.pairOptionCount, allocation_nodes: attempt.nodes });
    if (attempt.pass) { built = attempt; break; }
  }
  if (built) {
    results.push(built.candidate);
    console.log(`${contractEntry.level_id}: built ${built.candidate.audit.pair_stage_count} certified pair stages + ${built.candidate.audit.solo_stage_count} solos`);
  } else {
    failures.push({ level_id: contractEntry.level_id, reason: "no_control_or_pair_allocation", attempts });
    console.log(`${contractEntry.level_id}: FAILED`);
  }
}

await mkdir(OUTPUT_DIR, { recursive: true });
let mergedResults = results;
let mergedFailures = failures;
if (selectedIds) {
  try {
    const previous = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
    mergedResults = [
      ...(previous.levels ?? []).filter((entry) => !selectedIds.has(Number(entry.level_id.slice(2)))),
      ...results,
    ].sort((left, right) => left.level_id.localeCompare(right.level_id));
    mergedFailures = [
      ...(previous.failures ?? []).filter((entry) => !selectedIds.has(Number(entry.level_id.slice(2)))),
      ...failures,
    ].sort((left, right) => left.level_id.localeCompare(right.level_id));
  } catch {
    // The first selected run has no prior catalog to merge.
  }
}
const report = {
  title: "Block Out! v5 staged candidates built from exact one-reposition pair gadgets",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  source_contract: relative(ROOT, CONTRACT_PATH).replaceAll("\\", "/"),
  source_candidates: relative(ROOT, ASSEMBLED_PATH).replaceAll("\\", "/"),
  counts: { requested: mergedResults.length + mergedFailures.length, generated: mergedResults.length, failed: mergedFailures.length },
  failures: mergedFailures,
  levels: mergedResults,
};
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: relative(ROOT, OUTPUT_PATH).replaceAll("\\", "/"), counts: report.counts, failed: mergedFailures.map((entry) => entry.level_id) }, null, 2));
if (failures.length) process.exitCode = 1;

// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { LEVELS, VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER } from "../src/core/levels";
import type { BlockSpec, LevelSpec, Point, ShutterSpec } from "../src/core/types";
import {
  VIDEO_PARITY_GENERATOR_RIM_GEOMETRY,
  getVideoParityGeneratorRimGeometry,
  videoParityGeneratorRimGeometryKey,
} from "../src/core/videoParityGeneratorRimGeometry";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

/**
 * Structural publication gate for the direct-data Lv1-100 campaign.
 *
 * Deliberately do not import levelSolver (or any wrapper around it) here. The
 * user requested direct formal-data publication, so this suite proves exact
 * v8 composition/mechanism parity and LevelSpec validity only; it makes no
 * gameplay-solvability or difficulty claim.
 */

type JsonRecord = Record<string, any>;
type Histogram = Record<string, number>;

const CONTRACT_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v8.json",
  import.meta.url,
);
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as JsonRecord;
const CONTRACT_LEVELS = CONTRACT.levels as JsonRecord[];
const CLUSTER_SWAP_BATCH_REPORTS = [
  JSON.parse(readFileSync(new URL(
    "../playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-h.json",
    import.meta.url,
  ), "utf8")) as JsonRecord,
  JSON.parse(readFileSync(new URL(
    "../playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-i.json",
    import.meta.url,
  ), "utf8")) as JsonRecord,
];
const CLUSTER_SWAP_RECORDS = CLUSTER_SWAP_BATCH_REPORTS.flatMap((report) => report.records as JsonRecord[]);

// The source contract remains an exact record of the competitor video. Formal
// runtime values may differ only where a separately replay-verified repair is
// explicitly listed here.
const SOLVER_VERIFIED_FROZEN_GATE_VALUES = new Map<number, number[]>([
  [14, [2]],
  // Lv71 removes frozen 12/13; Lv73 removes frozen 6/19/20/22/24 plus one
  // ordinary exit; Lv75 removes frozen 3 and merges two adjacent frozen-11
  // bottom segments. These are the minimum record-count reductions needed to
  // fit the runtime's eight unique exit colours.
  [71, [1, 2, 3, 8, 15, 17, 21]],
  [73, [1, 3, 5, 6, 8, 23, 25]],
  [75, [1, 2, 11, 11, 11, 11, 11]],
]);
const SOLVER_VERIFIED_ORDINARY_GATE_COUNTS = new Map<number, number>([
  [50, 8],
  [71, 1],
  [73, 1],
  [75, 1],
]);
const SOLVER_VERIFIED_STAR_FROZEN_GATE_VALUES = new Map<number, number[]>([
  // Lv100's fully packed 3x4 of SQ2 blocks has only the bottom-middle ordinary
  // opening. frozen=3 needs three same-colour clears, which either creates a
  // forbidden three-block opening cluster or makes the third carrier
  // unreachable. The replay-certified frozen=2 value is the minimum one-step
  // counter relaxation.
  [100, [2, 8]],
]);
const SOLVER_VERIFIED_STAR_MAPPINGS = new Map<number, JsonRecord[]>([
  [100, [
    { color: "blue", star: false, side: "bottom", frozen: null },
    { color: "green", star: false, side: "top", frozen: 6 },
    { color: "cyan", star: true, side: "left", frozen: 2 },
    { color: "pink", star: true, side: "right", frozen: 8 },
  ]],
]);
const SOLVER_VERIFIED_COLOR_COUNTS = new Map<number, { full: number; opening: number }>([
  // Lv12's ordinary blue gate receives three compatible opening carriers;
  // the source three-colour palette therefore expands to the four unique
  // exit colours required by the runtime rule.
  [12, { full: 4, opening: 4 }],
  // Lv14 keeps all four source exit records, so the runtime-only unique-exit
  // rule requires one additional colour and two replay-verified carriers.
  [14, { full: 4, opening: 4 }],
  [33, { full: 7, opening: 7 }],
  // Joint exit/block recolouring makes all six runtime colours reachable while
  // preserving the locked board, blocks, stages, mechanisms, and timer.
  [40, { full: 6, opening: 6 }],
  [41, { full: 6, opening: 5 }],
  // Lv44's replay-verified colour exchange crosses the source stage labels,
  // while preserving the exact gameplay-opening per-colour counts used by the
  // runtime cluster rule. The full palette remains source-exact.
  [44, { full: 7, opening: 6 }],
  // Lv46's complete non-generator opening candidate set covers all eight
  // unique exits. The competitor stage partition itself contains five visible
  // colours before the three shutter cohorts are released.
  [46, { full: 8, opening: 5 }],
  // Lv53 introduces yellow only as the replay-certified replacement for the
  // duplicate orange exit and its matching opening carrier.
  [53, { full: 8, opening: 8 }],
  [57, { full: 8, opening: 5 }],
  // Lv50 expands its five-colour competitor palette to all eight runtime
  // colours so the reduced eight-exit set remains unique and fully used.
  [50, { full: 8, opening: 8 }],
  [85, { full: 7, opening: 7 }],
  // Lv91 intentionally redistributes nine visible colours so all seven unique
  // exits have a compatible opening carrier. Geometry/mechanism contracts are
  // unchanged, but the whole-level palette expands from the source count.
  [91, { full: 7, opening: 5 }],
  [98, { full: 7, opening: 7 }],
  // Lv100 adds the blue/green ordinary-gate carriers while preserving all
  // geometry, SQ2 positions, star flags, stages, and time.
  [100, { full: 4, opening: 4 }],
]);
const SOLVER_VERIFIED_UNUSED_EXIT_COLOR_LEVELS = new Set([
  13, 18, 37, 44, 56, 58, 71, 73, 75, 82, 99,
]);
// The locked Lv73/Lv75 high-exit candidates use the canonical body-colour field
// representation for authored shells: layers[0] remains the visible outer
// colour while block.color records the final inner body colour. PuzzleModel
// consumes layers[0] and sets color again when the shell is peeled.
const SOLVER_VERIFIED_BODY_COLOR_SHELL_LEVELS = new Set([73, 75]);
const SOLVER_VERIFIED_NUMERIC_ICE = new Map<number, { shapeHistogram: Histogram; items: JsonRecord[] }>([
  [76, {
    shapeHistogram: { SINGLE: 1, V2: 2, SQ2: 2, SQ3: 1, L3: 1, L4: 1, T4: 1 },
    items: [
      { value: 5, shape: "SINGLE", stage_id: "opening" },
      { value: 5, shape: "V2", stage_id: "opening" },
      { value: 5, shape: "V2", stage_id: "opening" },
      { value: 5, shape: "SQ2", stage_id: "opening" },
      { value: 5, shape: "SQ2", stage_id: "opening" },
      { value: 8, shape: "SQ3", stage_id: "opening" },
      { value: 5, shape: "L3", stage_id: "opening" },
      { value: 14, shape: "L4", stage_id: "opening" },
      { value: 14, shape: "T4", stage_id: "opening" },
    ],
  }],
]);

const SHAPE_VARIANTS: Record<string, readonly (readonly Point[])[]> = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  H4: [[[0, 0], [1, 0], [2, 0], [3, 0]]],
  V4: [[[0, 0], [0, 1], [0, 2], [0, 3]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
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
  S4: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T5: [
    [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]],
    [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  ],
  L5: [
    [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]],
    [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
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
const SHAPE_ORDER = Object.keys(SHAPE_VARIANTS);

const shapeSignature = (shape: readonly Point[]): string => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape
    .map(([x, y]) => [x - minX, y - minY] as const)
    .sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map(([x, y]) => `${x},${y}`)
    .join("|");
};

const SHAPE_BY_SIGNATURE = new Map(SHAPE_ORDER.flatMap((shapeId) => (
  SHAPE_VARIANTS[shapeId].map((shape) => [shapeSignature(shape), shapeId] as const)
)));
SHAPE_BY_SIGNATURE.set(shapeSignature([[0, 0], [0, 1], [1, 1], [2, 1]]), "L4");

const shapeIdOf = (block: Pick<BlockSpec, "shape">): string => (
  SHAPE_BY_SIGNATURE.get(shapeSignature(block.shape)) ?? "UNKNOWN"
);

const canonicalShapeId = (value: unknown): string => {
  const raw = String(value ?? "").toUpperCase();
  const aliases: Record<string, string> = {
    RECT3X2: "RECT2X3",
    V2_NUMERICICE: "V2",
    V3_NUMERICICE: "V3",
  };
  return aliases[raw] ?? raw.split("_")[0];
};

const orderedHistogram = (value: Histogram | null | undefined): Histogram => Object.fromEntries(
  SHAPE_ORDER
    .filter((shapeId) => Number(value?.[shapeId] ?? 0) > 0)
    .map((shapeId) => [shapeId, Number(value?.[shapeId])]),
);

const histogramOf = (blocks: readonly BlockSpec[]): Histogram => orderedHistogram(blocks.reduce<Histogram>(
  (result, block) => {
    const shapeId = shapeIdOf(block);
    result[shapeId] = (result[shapeId] ?? 0) + 1;
    return result;
  },
  {},
));

const sortedNumbers = (values: readonly unknown[]): number[] => values.map(Number).sort((a, b) => a - b);
const sortedStrings = (values: Iterable<unknown>): string[] => [...values].map(String).sort();
const blockColors = (block: BlockSpec): string[] => block.layers?.length ? [...block.layers] : [block.color];
const canonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonRecord)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, canonicalValue(entry)]));
};
const setEqual = (left: Iterable<string>, right: Iterable<string>): boolean => {
  const leftValues = [...new Set(left)].sort();
  const rightValues = [...new Set(right)].sort();
  return JSON.stringify(leftValues) === JSON.stringify(rightValues);
};

const openingSameColorComponentMaximum = (level: LevelSpec): number => {
  const closedShutterIds = new Set((level.shutters ?? [])
    .filter((shutter) => shutter.count > 0)
    .map((shutter) => shutter.id));
  const hiddenIds = new Set([
    ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
    ...level.blocks
      .filter((block) => block.shutterId && closedShutterIds.has(block.shutterId))
      .map((block) => block.id),
  ]);
  const opening = level.blocks.filter((block) => !hiddenIds.has(block.id));
  const cellsById = new Map(opening.map((block) => [block.id, block.shape.map(
    ([dx, dy]) => [block.x + dx, block.y + dy] as const,
  )]));
  const contacts = new Map(opening.map(({ id }) => [id, new Set<string>()]));
  for (let leftIndex = 0; leftIndex < opening.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < opening.length; rightIndex += 1) {
      const left = opening[leftIndex];
      const right = opening[rightIndex];
      if ((left.layers?.[0] ?? left.color) !== (right.layers?.[0] ?? right.color)) continue;
      const touches = cellsById.get(left.id)!.some(([leftX, leftY]) => cellsById.get(right.id)!.some(
        ([rightX, rightY]) => Math.abs(leftX - rightX) + Math.abs(leftY - rightY) === 1,
      ));
      if (!touches) continue;
      contacts.get(left.id)!.add(right.id);
      contacts.get(right.id)!.add(left.id);
    }
  }
  const unseen = new Set(opening.map(({ id }) => id));
  let maximum = 0;
  while (unseen.size) {
    const first = unseen.values().next().value!;
    unseen.delete(first);
    const queue = [first];
    let size = 0;
    while (queue.length) {
      const current = queue.shift()!;
      size += 1;
      for (const next of contacts.get(current)!) if (unseen.delete(next)) queue.push(next);
    }
    maximum = Math.max(maximum, size);
  }
  return maximum;
};

const playableRows = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => Array.from(
    { length: level.width },
    (_, x) => playable.has(`${x},${y}`) ? "#" : ".",
  ).join(""));
};

const blockCellKeys = (block: BlockSpec): string[] => block.shape.map(
  ([dx, dy]) => `${block.x + dx},${block.y + dy}`,
);

interface StageView {
  contract: JsonRecord;
  blocks: BlockSpec[];
}

const stageViews = (level: LevelSpec, target: JsonRecord): StageView[] => {
  let cursor = 0;
  const stages = (target.stage_partitions as JsonRecord[]).map((partition) => {
    const blocks = level.blocks.slice(cursor, cursor + Number(partition.count));
    cursor += Number(partition.count);
    return { contract: partition, blocks };
  });
  expect(cursor, `Lv${level.id} stage partitions must consume all blocks`).toBe(level.blocks.length);
  return stages;
};

const canMatchEvery = <T, U>(
  expected: readonly T[],
  actual: readonly U[],
  compatible: (expectedItem: T, actualItem: U) => boolean,
): boolean => {
  if (expected.length !== actual.length) return false;
  const used = new Set<number>();
  const visit = (index: number): boolean => {
    if (index === expected.length) return true;
    for (let candidate = 0; candidate < actual.length; candidate += 1) {
      if (used.has(candidate) || !compatible(expected[index], actual[candidate])) continue;
      used.add(candidate);
      if (visit(index + 1)) return true;
      used.delete(candidate);
    }
    return false;
  };
  return visit(0);
};

const reachableOpeningColorCounts = (opening: readonly BlockSpec[]): Set<number> => {
  const alwaysVisible = new Set(opening.filter((block) => !block.frozen).flatMap(blockColors));
  let masks = new Set([0]);
  const colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
  const colorBit = (color: string): number => 1 << colors.indexOf(color);
  const requiredMask = [...alwaysVisible].reduce((mask, color) => mask | colorBit(color), 0);
  for (const block of opening.filter((candidate) => Boolean(candidate.frozen))) {
    const blockMask = blockColors(block).reduce((mask, color) => mask | colorBit(color), 0);
    masks = new Set([...masks].flatMap((mask) => [mask, mask | blockMask]));
  }
  return new Set([...masks].map((mask) => {
    let bits = requiredMask | mask;
    let count = 0;
    while (bits) {
      count += bits & 1;
      bits >>>= 1;
    }
    return count;
  }));
};

const STAGED_FRAME_FRONT_FACTS = new Map<number, JsonRecord[]>([
  [73, [{ count: 9, histogram: { SINGLE: 2, H2: 2, SQ2: 3, L3: 1, L4: 1 } }]],
  [75, [{ count: 5, histogram: { SINGLE: 1, H2: 1, H3: 3 } }]],
  [78, [{ count: 5, histogram: { H2: 3, L3: 2 } }]],
]);

const auditLevel = (level: LevelSpec, contractLevel: JsonRecord): string[] => {
  const failures: string[] = [];
  const target = contractLevel.our_design_target as JsonRecord;
  const mechanism = target.mechanism_contract as JsonRecord;
  const stages = stageViews(level, target);
  const stageByBlockId = new Map(stages.flatMap((stage) => (
    stage.blocks.map((block) => [block.id, String(stage.contract.id)] as const)
  )));
  const opening = stages.find((stage) => stage.contract.kind === "opening")?.blocks ?? [];
  const openingIds = new Set(opening.map((block) => block.id));
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  const shutters = level.shutters ?? [];
  const shutterById = new Map(shutters.map((shutter) => [shutter.id, shutter]));
  const generators = level.generators ?? [];
  const queuedIds = new Set(generators.flatMap((generator) => generator.queueBlockIds));
  const runtimeOpeningIds = level.blocks
    .filter((block) => !block.shutterId && !queuedIds.has(block.id))
    .map((block) => block.id);

  const check = (path: string, actual: unknown, expected: unknown): void => {
    if (JSON.stringify(canonicalValue(actual)) !== JSON.stringify(canonicalValue(expected))) {
      failures.push(`${path}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    }
  };
  const checkTrue = (path: string, value: boolean): void => {
    if (!value) failures.push(`${path}: expected true`);
  };

  // Board, time, whole-level composition and color cardinality.
  check("board.rows", level.height, target.board.rows);
  check("board.cols", level.width, target.board.cols);
  check("board.playable_cell_count", level.playable?.length ?? level.width * level.height, target.board.playable_cell_count);
  check("board.playable_mask", playableRows(level), target.board.playable_mask);
  check("time_seconds", level.timeSeconds, target.time_seconds);
  check("blocks.count", level.blocks.length, target.full_level_block_count);
  check("blocks.shape_histogram", histogramOf(level.blocks), orderedHistogram(target.full_level_shape_histogram));
  check("blocks.occupied_cells", level.blocks.reduce((sum, block) => sum + block.shape.length, 0), target.full_level_occupied_cell_count);
  const repairedColorCounts = SOLVER_VERIFIED_COLOR_COUNTS.get(level.id);
  check(
    "colors.full_count",
    new Set(level.blocks.flatMap(blockColors)).size,
    repairedColorCounts?.full ?? target.full_level_color_count,
  );
  checkTrue(
    "colors.opening_count_reachable_with_frozen-carrier_concealment",
    reachableOpeningColorCounts(opening).has(repairedColorCounts?.opening ?? Number(target.opening_color_count)),
  );

  // Every explicit opening/hidden partition remains exact after publication.
  check("stages.opening_runtime_membership", sortedStrings(runtimeOpeningIds), sortedStrings(openingIds));
  stages.forEach((stage) => {
    const prefix = `stages.${stage.contract.id}`;
    check(`${prefix}.count`, stage.blocks.length, stage.contract.count);
    check(`${prefix}.shape_histogram`, histogramOf(stage.blocks), orderedHistogram(stage.contract.shape_histogram));
    if (stage.contract.kind === "countdown_cover") {
      checkTrue(`${prefix}.bound_to_cover`, stage.blocks.every((block) => (
        Boolean(block.shutterId) && shutterById.get(block.shutterId!)?.skin === "shutter"
      )));
    }
    if (stage.contract.kind === "lift") {
      checkTrue(`${prefix}.bound_to_lift`, stage.blocks.every((block) => (
        Boolean(block.shutterId) && shutterById.get(block.shutterId!)?.skin === "lift"
      )));
    }
    if (stage.contract.kind === "staged_frame") {
      checkTrue(`${prefix}.bound_to_staged_frame`, stage.blocks.every((block) => (
        Boolean(block.shutterId) && shutterById.get(block.shutterId!)?.skin === "staged-frame"
      )));
    }
  });

  const liftShutters = shutters.filter((shutter) => shutter.skin === "lift");
  const stageCandidates = (block: BlockSpec): Set<string> => {
    const result = new Set([stageByBlockId.get(block.id) ?? ""]);
    const firstLift = liftShutters.find((shutter) => shutter.id.endsWith("-release-2"));
    if (firstLift?.triggerBlockIds?.includes(block.id)) result.add("lift-layer-1");
    return result;
  };

  // Directional exits, including all frozen/star numbers and the Lv100 map.
  const exitContract = mechanism.directional_exits as JsonRecord;
  const hasFrozen = (gate: LevelSpec["gates"][number]): boolean => Object.prototype.hasOwnProperty.call(gate, "frozen");
  const ordinaryGates = level.gates.filter((gate) => !gate.star && !hasFrozen(gate));
  const frozenGates = level.gates.filter((gate) => !gate.star && hasFrozen(gate));
  const starGates = level.gates.filter((gate) => gate.star);
  const frozenStarGates = starGates.filter(hasFrozen);
  check(
    "exits.ordinary_count",
    ordinaryGates.length,
    SOLVER_VERIFIED_ORDINARY_GATE_COUNTS.get(level.id) ?? exitContract.ordinary_count ?? 0,
  );
  check(
    "exits.frozen_values",
    sortedNumbers(frozenGates.map((gate) => gate.frozen)),
    sortedNumbers(SOLVER_VERIFIED_FROZEN_GATE_VALUES.get(level.id) ?? exitContract.frozen_values ?? []),
  );
  check("exits.star_count", starGates.length, exitContract.star_count ?? 0);
  check("exits.star_frozen_count", frozenStarGates.length, exitContract.star_frozen_count ?? 0);
  check(
    "exits.star_frozen_values",
    sortedNumbers(frozenStarGates.map((gate) => gate.frozen)),
    sortedNumbers(SOLVER_VERIFIED_STAR_FROZEN_GATE_VALUES.get(level.id) ?? exitContract.star_frozen_values ?? []),
  );
  const clearLayerColors = new Set<string>(level.blocks.flatMap(blockColors));
  const gateColors = new Set<string>(level.gates.map((gate) => gate.color));
  checkTrue("exits.cover_every_clear_layer_color", SOLVER_VERIFIED_UNUSED_EXIT_COLOR_LEVELS.has(level.id)
    ? [...clearLayerColors].every((color) => gateColors.has(color))
    : setEqual(clearLayerColors, gateColors));
  if (exitContract.star_mapping) {
    const parsed = Object.entries(exitContract.star_mapping as JsonRecord).map(([key, rawValue]) => {
      const keyMatch = /^(red|blue|green|yellow|purple|orange|pink|cyan)(Ordinary|Star)$/i.exec(key);
      const valueMatch = /^(top|right|bottom|left),\s*(unfrozen|frozen\s+(\d+))$/i.exec(String(rawValue));
      return {
        sourceColor: keyMatch?.[1].toLowerCase(),
        star: keyMatch?.[2].toLowerCase() === "star",
        side: valueMatch?.[1].toLowerCase(),
        frozen: valueMatch?.[3] ? Number(valueMatch[3]) : null,
      };
    });
    const sourceColors = [...new Set(parsed.map((entry) => entry.sourceColor))];
    const colorMap = new Map(sourceColors.map((color, index) => [color, target.design_palette[index]]));
    const expected = parsed.map(({ sourceColor, ...entry }) => ({
      ...entry,
      color: colorMap.get(sourceColor),
    }));
    const actual = level.gates.map((gate) => ({
      color: gate.color,
      star: Boolean(gate.star),
      side: gate.side,
      frozen: gate.frozen ?? null,
    }));
    const canonical = (entries: JsonRecord[]): JsonRecord[] => entries.sort((left, right) => (
      JSON.stringify(canonicalValue(left)).localeCompare(JSON.stringify(canonicalValue(right)))
    ));
    check(
      "exits.star_mapping",
      canonical(actual),
      canonical(SOLVER_VERIFIED_STAR_MAPPINGS.get(level.id) ?? expected),
    );
  }

  // Numeric ice countdowns: exact count, value, shape, opening/hidden stage and
  // post-thaw shell relationship.
  const numericBlocks = level.blocks.filter((block) => Number(block.frozen ?? 0) > 0);
  const numeric = mechanism.numeric_ice as JsonRecord | undefined;
  const repairedNumeric = SOLVER_VERIFIED_NUMERIC_ICE.get(level.id);
  if (!numeric) check("numeric_ice.unexpected", numericBlocks.length, 0);
  else {
    check("numeric_ice.count", numericBlocks.length, numeric.count);
    check("numeric_ice.values", sortedNumbers(numericBlocks.map((block) => block.frozen)), sortedNumbers(numeric.values ?? []));
    if (numeric.shape_histogram) check(
      "numeric_ice.shape_histogram",
      histogramOf(numericBlocks),
      orderedHistogram(repairedNumeric?.shapeHistogram ?? numeric.shape_histogram),
    );
    if (Number.isInteger(numeric.opening_visible_count)) {
      check("numeric_ice.opening_visible_count", numericBlocks.filter((block) => openingIds.has(block.id)).length, numeric.opening_visible_count);
    }
    if (numeric.stage_scope === "hidden_only") check("numeric_ice.hidden_only", numericBlocks.filter((block) => openingIds.has(block.id)).length, 0);
    if (numeric.stage_scope === "opening_and_hidden") {
      checkTrue("numeric_ice.opening_and_hidden", numericBlocks.some((block) => openingIds.has(block.id))
        && numericBlocks.some((block) => !openingIds.has(block.id)));
    }
    if (numeric.post_melt_shell !== null
      && numeric.post_melt_shell !== undefined
      && numeric.post_melt_shell !== "unclear"
      && Number.isFinite(Number(numeric.post_melt_shell))) {
      check(
        "numeric_ice.post_melt_shell",
        numericBlocks.filter((block) => (block.layers?.length ?? 1) > 1).length,
        Number(numeric.post_melt_shell),
      );
    }
    const numericItems = repairedNumeric?.items ?? numeric.items;
    if (Array.isArray(numericItems)) {
      checkTrue("numeric_ice.items", canMatchEvery(
        numericItems,
        numericBlocks,
        (item: JsonRecord, block) => Number(block.frozen) === Number(item.value)
          && shapeIdOf(block) === canonicalShapeId(item.shape)
          && (!item.stage_id || stageCandidates(block).has(String(item.stage_id))),
      ));
    }
  }

  // Two-layer blocks: exact quantities/stages/shapes, exactly one extra layer,
  // and never the same color inside and outside.
  const shellBlocks = level.blocks.filter((block) => (block.layers?.length ?? 1) > 1);
  const shells = mechanism.shells as JsonRecord | undefined;
  checkTrue("shells.distinct_outer_inner_colors", shellBlocks.every((block) => (
    block.layers?.length === 2
      && block.layers[0] !== block.layers[1]
      && block.color === (SOLVER_VERIFIED_BODY_COLOR_SHELL_LEVELS.has(level.id) ? block.layers[1] : block.layers[0])
  )));
  if (!shells) check("shells.unexpected", shellBlocks.length, 0);
  else {
    check("shells.count", shellBlocks.length, shells.count);
    check("shells.extra_layers", sortedNumbers(shellBlocks.map((block) => block.layers!.length - 1)), sortedNumbers(shells.extra_layers ?? []));
    if (Number.isInteger(shells.opening_visible_count)) {
      check("shells.opening_visible_count", shellBlocks.filter((block) => openingIds.has(block.id)).length, shells.opening_visible_count);
    }
    if (shells.shape_histogram) check("shells.shape_histogram", histogramOf(shellBlocks), orderedHistogram(shells.shape_histogram));
    if (Array.isArray(shells.items)) {
      checkTrue("shells.items", canMatchEvery(
        shells.items,
        shellBlocks,
        (item: JsonRecord, block) => shapeIdOf(block) === canonicalShapeId(item.shape)
          && Number(block.layers!.length - 1) === Number(item.extra_layers ?? 1)
          && (!item.stage_id || stageCandidates(block).has(String(item.stage_id)))
          && (!item.requires_numeric_ice || Number(block.frozen ?? 0) > 0),
      ));
    }
  }

  // Countdown covers: physical device count/countdown values and exact hidden
  // partition aggregate. Partition membership was checked above.
  const coverShutters = shutters.filter((shutter) => shutter.skin === "shutter");
  const covers = mechanism.covers as JsonRecord | undefined;
  if (!covers) check("covers.unexpected", coverShutters.length, 0);
  else {
    check("covers.count", coverShutters.length, covers.count);
    check("covers.values", coverShutters.map((shutter) => shutter.count), covers.values);
    const coverStages = stages.filter((stage) => stage.contract.kind === "countdown_cover");
    check("covers.hidden_batch_counts", coverStages.map((stage) => stage.blocks.length), covers.hidden_batch_counts);
    check(
      "covers.hidden_batch_histograms",
      coverStages.map((stage) => histogramOf(stage.blocks)),
      (covers.hidden_batch_histograms as Histogram[]).map(orderedHistogram),
    );
    coverStages.forEach((stage, index) => {
      const position = stage.contract.position as JsonRecord | null | undefined;
      if (!position || typeof position !== "object" || Array.isArray(position)) return;
      const shutterIds = [...new Set(stage.blocks.map((block) => block.shutterId).filter(Boolean))];
      check(`covers.${index}.single_runtime_binding`, shutterIds.length, 1);
      const runtime = shutterById.get(String(shutterIds[0]));
      check(`covers.${index}.position`, runtime ? {
        x: runtime.x,
        y: runtime.y,
        width: runtime.width,
        height: runtime.height,
      } : null, position);
    });
  }

  // Side/timed generators: exact trigger, per-machine queue, shape order,
  // preview and authored side. Timed feeder cadence is one second in runtime.
  const generatorContract = mechanism.generators as JsonRecord | undefined;
  if (!generatorContract) check("generators.unexpected", generators.length, 0);
  else {
    check("generators.count", generators.length, generatorContract.count);
    check("generators.triggers", sortedStrings(generators.map((generator) => generator.trigger ?? "move")), (
      Array.from({ length: Number(generatorContract.count) }, () => String(generatorContract.trigger)).sort()
    ));
    check("generators.queue_lengths", generators.map((generator) => generator.queueBlockIds.length), generatorContract.queue_lengths);
    check(
      "generators.queue_histograms",
      generators.map((generator) => histogramOf(generator.queueBlockIds.map((id) => blockById.get(id)!).filter(Boolean))),
      (generatorContract.queue_histograms as Histogram[]).map(orderedHistogram),
    );
    if (Array.isArray(generatorContract.queue_shape_sequences)) {
      check(
        "generators.queue_shape_sequences",
        generators.map((generator) => generator.queueBlockIds.map((id) => shapeIdOf(blockById.get(id)!))),
        generatorContract.queue_shape_sequences.map((sequence: unknown[]) => sequence.map(canonicalShapeId)),
      );
    }
    if (Array.isArray(generatorContract.preview_shapes)) {
      check(
        "generators.preview_shapes",
        generators.map((generator) => shapeIdOf(blockById.get(generator.queueBlockIds[0])!)),
        generatorContract.preview_shapes.map(canonicalShapeId),
      );
    }
    if (Array.isArray(generatorContract.queue_sides)) {
      generatorContract.queue_sides.forEach((side: unknown, index: number) => {
        if (side !== null && side !== undefined) check(`generators.queue_sides.${index}`, generators[index]?.side, String(side).toLowerCase());
      });
    }
    generators.forEach((generator, index) => {
      const visualContract = getVideoParityGeneratorRimGeometry(level.id, generator.id);
      checkTrue(`generators.visual_contract.${index}.present`, Boolean(visualContract));
      if (!visualContract) return;
      check(`generators.visual_contract.${index}.level_id`, visualContract.levelId, level.id);
      check(`generators.visual_contract.${index}.generator_id`, visualContract.generatorId, generator.id);
      check(`generators.visual_contract.${index}.rim_span`, visualContract.rimSpan, 3);
      check(`generators.${index}.rim_span`, generator.rimSpan, visualContract.rimSpan);
      check(`generators.${index}.rim_mount`, generator.rimMount, visualContract.rimMount);
      check(`generators.${index}.side`, generator.side, visualContract.side);
      check(`generators.${index}.offset`, generator.offset, visualContract.offset);
      check(
        `generators.${index}.rim_anchor`,
        generator.rimAnchor ?? null,
        visualContract.anchor ?? null,
      );
    });
    if (generatorContract.trigger === "time") {
      checkTrue("generators.timed_interval", generators.every((generator) => (
        generator.trigger === "time" && generator.intervalSeconds === 1 && generator.initialDelaySeconds === 1
      )));
    }
    const generatorStages = stages.filter((stage) => (
      stage.contract.kind === "side_generator" || stage.contract.kind === "timed_feeder"
    ));
    checkTrue("generators.stage_queue_membership", canMatchEvery(
      generatorStages,
      generators,
      (stage, generator) => setEqual(stage.blocks.map((block) => block.id), generator.queueBlockIds),
    ));
  }

  // Axis-restricted blocks and their exact hidden/opening cohort.
  const axisBlocks = level.blocks.filter((block) => Boolean(block.movementAxis));
  const axes = mechanism.axis_blocks as JsonRecord | undefined;
  if (!axes) check("axis_blocks.unexpected", axisBlocks.length, 0);
  else {
    check("axis_blocks.count", axisBlocks.length, axes.count);
    if (axes.shape_histogram) check("axis_blocks.shape_histogram", histogramOf(axisBlocks), orderedHistogram(axes.shape_histogram));
    if (axes.by_axis_shape) {
      const actual: JsonRecord = {};
      axisBlocks.forEach((block) => {
        actual[block.movementAxis!] ??= {};
        const shape = shapeIdOf(block);
        actual[block.movementAxis!][shape] = (actual[block.movementAxis!][shape] ?? 0) + 1;
      });
      Object.keys(actual).forEach((axis) => { actual[axis] = orderedHistogram(actual[axis]); });
      check("axis_blocks.by_axis_shape", actual, axes.by_axis_shape);
    }
    if (Array.isArray(axes.axes)) check("axis_blocks.axes", sortedStrings(axisBlocks.map((block) => block.movementAxis)), sortedStrings(axes.axes));
    if (Array.isArray(axes.items)) {
      checkTrue("axis_blocks.items", canMatchEvery(
        axes.items,
        axisBlocks,
        (item: JsonRecord, block) => shapeIdOf(block) === canonicalShapeId(item.shape)
          && block.movementAxis === item.axis
          && (!item.stage_id || stageCandidates(block).has(String(item.stage_id))),
      ));
    }
    if (typeof axes.hidden_at_opening === "boolean") {
      check(
        "axis_blocks.opening_count",
        axisBlocks.filter((block) => openingIds.has(block.id)).length,
        axes.hidden_at_opening ? 0 : Number(axes.count),
      );
    }
  }

  // Keys and locks: exact carriers, requirements, opening visibility and real
  // group wiring (every lock has exactly the authored number of matching keys).
  const keyBlocks = level.blocks.filter((block) => Boolean(block.keyId));
  const lockBlocks = level.blocks.filter((block) => Boolean(block.lockedBy));
  const keyLocks = mechanism.key_locks as JsonRecord | undefined;
  if (!keyLocks) {
    check("key_locks.unexpected_keys", keyBlocks.length, 0);
    check("key_locks.unexpected_locks", lockBlocks.length, 0);
  } else {
    check("key_locks.key_count", keyBlocks.length, keyLocks.key_count);
    check("key_locks.lock_count", lockBlocks.length, keyLocks.lock_count);
    check("key_locks.requirements", sortedNumbers(lockBlocks.map((block) => block.lockCount ?? 1)), sortedNumbers(keyLocks.lock_requirements ?? []));
    check("key_locks.opening_visible_keys", keyBlocks.filter((block) => openingIds.has(block.id)).length, keyLocks.opening_visible_key_count);
    const lockHidden = keyLocks.lock_hidden_at_opening ?? keyLocks.hidden_at_opening;
    if (typeof lockHidden === "boolean") {
      check("key_locks.opening_visible_locks", lockBlocks.filter((block) => openingIds.has(block.id)).length, lockHidden ? 0 : keyLocks.lock_count);
    }
    if (keyLocks.key_shapes) check("key_locks.key_shapes", histogramOf(keyBlocks), orderedHistogram(keyLocks.key_shapes));
    if (keyLocks.lock_shapes) check("key_locks.lock_shapes", histogramOf(lockBlocks), orderedHistogram(keyLocks.lock_shapes));
    checkTrue("key_locks.group_wiring", lockBlocks.every((lock) => (
      keyBlocks.filter((key) => key.keyId === lock.lockedBy).length === Number(lock.lockCount ?? 1)
    )));
  }

  // Lift chains: each release waits for exactly the current layer and exposes
  // exactly the next layer. This distinguishes the mechanic from translation.
  const lifts = mechanism.lifts as JsonRecord | undefined;
  const liftGroups = new Map<string, ShutterSpec[]>();
  liftShutters.forEach((shutter) => {
    const groupId = shutter.id.replace(/-release-\d+$/, "");
    liftGroups.set(groupId, [...(liftGroups.get(groupId) ?? []), shutter]);
  });
  if (!lifts) check("lifts.unexpected", liftGroups.size, 0);
  else {
    check("lifts.count", liftGroups.size, lifts.count);
    const actualLayers = [...liftGroups.values()].flatMap((group) => {
      const ordered = group.sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
      const first = ordered[0];
      const layersForLift = [first?.triggerBlockIds ?? []];
      ordered.forEach((release, index) => {
        const hidden = level.blocks.filter((block) => block.shutterId === release.id).map((block) => block.id);
        layersForLift.push(hidden);
        if (index > 0) checkTrue(
          `lifts.release_${index + 2}_waits_for_prior_layer`,
          setEqual(release.triggerBlockIds ?? [], layersForLift[index]),
        );
        check(`lifts.${release.id}.count`, release.count, release.triggerBlockIds?.length ?? 0);
      });
      return layersForLift.map((ids) => ({
        count: ids.length,
        histogram: histogramOf(ids.map((id) => blockById.get(id)!).filter(Boolean)),
      }));
    });
    check(
      "lifts.layers",
      actualLayers,
      (lifts.layers as JsonRecord[]).map((layer) => ({ count: layer.count, histogram: orderedHistogram(layer.histogram) })),
    );
  }

  // Fixed staged frames: exact source-observed front cohort, exact hidden
  // cohort, and release linkage. These are not treated as Lift devices.
  const frameShutters = shutters.filter((shutter) => shutter.skin === "staged-frame");
  const frames = mechanism.staged_frames as JsonRecord | undefined;
  if (!frames) check("staged_frames.unexpected", frameShutters.length, 0);
  else {
    check("staged_frames.count", frameShutters.length, frames.count);
    const frontFacts = STAGED_FRAME_FRONT_FACTS.get(level.id) ?? [];
    frameShutters.forEach((frame, index) => {
      const front = (frame.triggerBlockIds ?? []).map((id) => blockById.get(id)!).filter(Boolean);
      const hidden = level.blocks.filter((block) => block.shutterId === frame.id);
      check(`staged_frames.${index}.front_count`, front.length, frontFacts[index]?.count);
      check(`staged_frames.${index}.front_histogram`, histogramOf(front), orderedHistogram(frontFacts[index]?.histogram));
      checkTrue(`staged_frames.${index}.front_is_opening`, front.every((block) => openingIds.has(block.id)));
      check(`staged_frames.${index}.counter`, frame.count, front.length);
      check(`staged_frames.${index}.hidden_count`, hidden.length, frames.layers[index + 1]?.count);
      check(`staged_frames.${index}.hidden_histogram`, histogramOf(hidden), orderedHistogram(frames.layers[index + 1]?.histogram));
    });
  }

  // Star cargo and exits share colors and preserve plain same-shape pieces.
  const starBlocks = level.blocks.filter((block) => block.star);
  const stars = mechanism.stars as JsonRecord | undefined;
  if (!stars) check("stars.unexpected", starBlocks.length, 0);
  else {
    check("stars.count", starBlocks.length, stars.count);
    check("stars.shape_histogram", histogramOf(starBlocks), orderedHistogram(stars.shape_histogram));
    const starShapes = new Set(Object.keys(stars.shape_histogram as Histogram));
    check(
      "stars.plain_same_shape_count",
      level.blocks.filter((block) => !block.star && starShapes.has(shapeIdOf(block))).length,
      stars.plain_same_shape_count,
    );
    checkTrue("stars.star_gate_color_coverage", setEqual(
      starBlocks.flatMap(blockColors),
      starGates.map((gate) => gate.color),
    ));
  }

  if (mechanism.irregular_blocks) {
    const rectangles = new Set(["SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "RECT2X3", "SQ3"]);
    check(
      "irregular_blocks.count",
      level.blocks.filter((block) => !rectangles.has(shapeIdOf(block))).length,
      mechanism.irregular_blocks.count,
    );
  }

  check("unexpected.elevators", level.elevators?.length ?? 0, 0);
  check("unexpected.conveyors", level.conveyors?.length ?? 0, 0);
  return failures;
};

describe("published Lv1-100 exact v8 competitor structure", () => {
  it("contains one ordered runtime level for every v8 contract record", () => {
    expect(VIDEO_PARITY_LEVELS_1_TO_100).toHaveLength(100);
    expect(CONTRACT_LEVELS).toHaveLength(100);
    expect(VIDEO_PARITY_LEVELS_1_TO_100.map((level) => level.id)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER.slice(0, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("honors the requested final Lv2/Lv5 swap without rewriting competitor designs", () => {
    expect(LEVELS[4]).toMatchObject({
      id: 5,
      name: "错层九宫",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 30,
      parMoves: 21,
      width: 5,
      height: 7,
      designTargets: { calibratedDifficulty: 57.1, minimumRepositionOverhead: 2 },
    });
    expect(LEVELS[4].blocks).toHaveLength(8);
    expect(LEVELS[4].gates).toHaveLength(5);
    expect(LEVELS[1]).toMatchObject({
      id: 2,
      name: "三色错肩",
      difficulty: "hard",
      timeSeconds: 120,
      reward: 40,
      parMoves: 29,
      width: 4,
      height: 6,
      designTargets: { calibratedDifficulty: 76, minimumRepositionOverhead: 5 },
    });
    expect(LEVELS[1].blocks).toHaveLength(20);
    expect(LEVELS[1].gates).toHaveLength(3);
  });

  it("publishes one authoritative three-rail visual contract for every generator", () => {
    const runtimeKeys = VIDEO_PARITY_LEVELS_1_TO_100.flatMap((level) => (level.generators ?? []).map((generator) => (
      videoParityGeneratorRimGeometryKey(level.id, generator.id)
    )));
    const contractKeys = VIDEO_PARITY_GENERATOR_RIM_GEOMETRY.map((geometry) => (
      videoParityGeneratorRimGeometryKey(geometry.levelId, geometry.generatorId)
    ));

    expect(runtimeKeys).toHaveLength(37);
    expect(contractKeys).toHaveLength(37);
    expect(new Set(contractKeys).size).toBe(contractKeys.length);
    expect(contractKeys.toSorted()).toEqual(runtimeKeys.toSorted());
    expect(VIDEO_PARITY_GENERATOR_RIM_GEOMETRY.every((geometry) => geometry.rimSpan === 3)).toBe(true);
  });

  it("publishes Lv22's source-observed 6x7 shutter and exact two-stage footprint", () => {
    const level = VIDEO_PARITY_LEVELS_1_TO_100.find((candidate) => candidate.id === 22)!;
    const shutter = level.shutters?.find((candidate) => candidate.skin === "shutter");
    expect(shutter).toMatchObject({
      id: "vp-022-cover-1",
      x: 0,
      y: 3,
      width: 6,
      height: 7,
      count: 17,
      skin: "shutter",
    });

    const opening = level.blocks.filter((block) => !block.shutterId);
    const hidden = level.blocks.filter((block) => block.shutterId === shutter!.id);
    const openingCells = new Set(opening.flatMap(blockCellKeys));
    const hiddenCells = new Set(hidden.flatMap(blockCellKeys));
    const expectedOpening = new Set(Array.from({ length: 3 }, (_, y) => (
      Array.from({ length: 6 }, (_, x) => `${x},${y}`)
    )).flat());
    const expectedHidden = new Set(Array.from({ length: 7 }, (_, dy) => (
      Array.from({ length: 6 }, (_, x) => `${x},${dy + 3}`)
    )).flat());

    expect(opening).toHaveLength(17);
    expect(hidden).toHaveLength(12);
    expect(openingCells).toEqual(expectedOpening);
    expect(hiddenCells).toEqual(expectedHidden);
    expect([...openingCells].some((cell) => hiddenCells.has(cell))).toBe(false);
    expect(new Set([...openingCells, ...hiddenCells]).size).toBe(60);
    expect(hidden.every((block) => block.shutterId === shutter!.id)).toBe(true);
    expect(hidden.filter((block) => block.frozen === 5).map((block) => ({
      x: block.x,
      y: block.y,
      shape: shapeIdOf(block),
    })).toSorted((left, right) => left.y - right.y || left.x - right.x)).toEqual([
      { x: 2, y: 4, shape: "V3" },
      { x: 5, y: 4, shape: "V3" },
      { x: 2, y: 7, shape: "V3" },
      { x: 5, y: 7, shape: "V3" },
    ]);

    const model = new PuzzleModel(level);
    expect(model.canPlace(model.getBlock("cc-piece-s1-01")!, 0, 3)).toBe(false);
    expect(model.snapshot().shutters.find((candidate) => candidate.id === shutter!.id)).toMatchObject({
      x: 0, y: 3, width: 6, height: 7, count: 17,
    });
  });

  it("publishes the replay-certified batch H/I outer-colour swaps exactly", () => {
    expect(CLUSTER_SWAP_BATCH_REPORTS.map(({ summary }) => summary.level_ids)).toEqual([
      [22, 54, 59, 69, 74, 77, 84, 89],
      [72, 94],
    ]);
    expect(CLUSTER_SWAP_RECORDS.map(({ level_id }) => level_id)).toEqual([22, 54, 59, 69, 74, 77, 84, 89, 72, 94]);
    for (const record of CLUSTER_SWAP_RECORDS) {
      const level = VIDEO_PARITY_LEVELS_1_TO_100.find(({ id }) => id === record.level_id)!;
      expect(level, `missing batch H/I Lv${record.level_id}`).toBeDefined();
      expect(level).toEqual(record.target_level);
      expect(() => validateLevel(level)).not.toThrow();
      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      expect(new Set(exits.map(({ color }) => color)).size).toBe(exits.length);
      expect(openingSameColorComponentMaximum(level)).toBeLessThanOrEqual(2);
      expect(record.opening_visible_color_counts_after).toEqual(record.opening_visible_color_counts_before);
      expect(record.opening_visible_color_counts_preserved).toBe(true);
      expect(record.declared_only_mutation_check_passed).toBe(true);
      expect(record.solver_and_replay).toMatchObject({
        termination: "solved",
        max_states: 20_000,
        puzzle_model_replay: { ok: true, complete: true, remaining_blocks: 0, remaining_queued_blocks: 0 },
      });
      for (const patch of record.block_color_patches as JsonRecord[]) {
        const block = level.blocks.find(({ id }) => id === patch.id)!;
        expect(block.layers?.[0] ?? block.color, `Lv${record.level_id}/${patch.id}`).toBe(patch.to);
      }
    }
  });

  for (const [index, sourceId] of VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER.entries()) {
    const id = index + 1;
    const contractLevel = CONTRACT_LEVELS[sourceId - 1];
    it(`Lv${String(id).padStart(3, "0")} matches source Lv${String(sourceId).padStart(3, "0")} in every v8 scalar, stage, and mechanism field`, () => {
      expect(contractLevel, `missing source contract Lv${sourceId}`).toBeDefined();
      const level = VIDEO_PARITY_LEVELS_1_TO_100.find((candidate) => candidate.id === id);
      expect(level, `missing published Lv${id}`).toBeDefined();
      expect(auditLevel(level!, contractLevel)).toEqual([]);
      expect(() => validateLevel(level!)).not.toThrow();
    });
  }

  it("publishes exactly the competitor's eleven full 3x3 blocks", () => {
    const sq3 = VIDEO_PARITY_LEVELS_1_TO_100.flatMap((level) => level.blocks
      .filter((block) => shapeIdOf(block) === "SQ3")
      .map((block) => ({ level: level.id, block: block.id })));
    expect(sq3).toHaveLength(11);
    expect([...new Set(sq3.map((entry) => entry.level))]).toEqual([8, 14, 18, 59, 64, 72, 76, 89]);
  });
});

import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Materialize the competitor-video parity v8 data set without running a
 * gameplay solver. The v7 structural assembly is already exact for every
 * mechanism; this pass restores the eleven source SQ3 pieces, repacks only the
 * affected reveal cohort, and applies explicitly documented solver-verified
 * runtime repairs so the authored LevelSpec remains playable and valid.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputRelative = process.env.VIDEO_PARITY_V8_INPUT_RELATIVE
  ?? ".codex-temp/video-parity-v7-r126-full-runtime/runtime.generated.ts";
const contractRelative = process.env.VIDEO_PARITY_V8_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v8.json";
const outputRelative = process.env.VIDEO_PARITY_V8_OUTPUT_RELATIVE
  ?? "src/core/videoParityLevels.generated.ts";
const auditRelative = process.env.VIDEO_PARITY_V8_AUDIT_RELATIVE
  ?? "playtest-results/experiments/video-parity-v8/direct-data-build-audit.json";
const generatorRimGeometryRelative = "src/core/videoParityGeneratorRimGeometry.ts";
const highExitReductionEvidence = [
  {
    path: "playtest-results/experiments/high-exit-reduction/report.json",
    sha256: "A834EF394595C61C29D54F29310E65FE80562BB8077E651D8199199C1F436F13",
  },
  {
    path: "playtest-results/experiments/high-exit-reduction/selected-candidates.json",
    sha256: "AB17DD0A9F522231153B214E744E8EE69487C159CD99BDCF9E8EE5DF22ED6D14",
  },
  {
    path: "playtest-results/experiments/high-exit-reduction/attempts.jsonl",
    sha256: "9B4E448CC58583728A8F37E255679E31077515299D57AFE1FF48B144C5650A9C",
  },
];
const highExitReductionBatch02Evidence = [
  {
    path: "playtest-results/experiments/high-exit-reduction-batch-02/report.json",
    sha256: "838B18B7C8D819924F6E81B8CB53D859CD30013E455983086BE8B174A91B98B7",
  },
  {
    path: "playtest-results/experiments/high-exit-reduction-batch-02/selected-candidates.json",
    sha256: "F2C30D81E1EB2CE9A25C0AEB7B129AECE337322A964BC404689161811D60A034",
  },
  {
    path: "playtest-results/experiments/high-exit-reduction-batch-02/lv073-c813-certificate.json",
    sha256: "EFC3D5639339E0F3C9ABD40612198F46BACEA993CA81D212C4E23068DCFC5CEB",
  },
];
const acceptedHighExitReductionLevelIds = [50, 71, 73, 75];

const inputPath = resolve(root, inputRelative);
const contractPath = resolve(root, contractRelative);
const outputPath = resolve(root, outputRelative);
const auditPath = resolve(root, auditRelative);
const generatorRimGeometryPath = resolve(root, generatorRimGeometryRelative);
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const keyOf = (x, y) => `${x},${y}`;
const clone = (value) => structuredClone(value);

const SHAPE_VARIANTS = {
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
const SQ3 = clone(SHAPE_VARIANTS.SQ3[0]);
const normalizeShape = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY])
    .sort((left, right) => left[1] - right[1] || left[0] - right[0]);
};
const signature = (shape) => normalizeShape(shape).map(([x, y]) => `${x},${y}`).join("|");
const shapeIdBySignature = new Map(SHAPE_ORDER.flatMap((shapeId) => (
  SHAPE_VARIANTS[shapeId].map((shape) => [signature(shape), shapeId])
)));
// Lv23's source footage uses the reflected lower-left L tetromino. Keep it in
// the same L4 family without changing the legacy packer's placement order.
shapeIdBySignature.set(signature([[0, 0], [0, 1], [1, 1], [2, 1]]), "L4");
const shapeIdOf = (shape) => shapeIdBySignature.get(signature(shape)) ?? "UNKNOWN";
const histogramOf = (blocks) => Object.fromEntries(SHAPE_ORDER.flatMap((shapeId) => {
  const count = blocks.filter((block) => shapeIdOf(block.shape) === shapeId).length;
  return count ? [[shapeId, count]] : [];
}));
const cellCountOf = (histogram) => Object.entries(histogram).reduce((sum, [shapeId, count]) => (
  sum + SHAPE_VARIANTS[shapeId][0].length * Number(count)
), 0);
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
};
const sameJson = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

// These identities are the normalized v7 carriers that correspond to the
// source-video SQ3 pieces. Numeric-ice assignments make Lv14/18/76 unique;
// reveal-cohort membership makes the remaining mappings unique.
const SQ3_BLOCK_IDS = new Map([
  [8, ["strategy-guard-23"]],
  [14, ["strategy-guard-12"]],
  [18, ["strategy-guard-13"]],
  [59, ["cc-059-b2-04"]],
  [64, ["cc-064-b3-02"]],
  [72, ["cc-072-b1-10"]],
  [76, ["cc-076-b1-07", "cc-076-b1-10", "cc-076-b1-11"]],
  [89, ["cc-089-b4-01", "cc-089-b4-03"]],
]);

// Tutorials are metadata layered over the competitor-authored structure. Keep
// them here, beside the authoritative v8 materializer, so regenerating the
// formal LevelSpec cannot silently drop or move a first-appearance lesson.
// These entries do not change board geometry, pieces, counters, queues or any
// other gameplay rule.
const FEATURE_INTROS = new Map([
  [6, { kind: "ice-door", title: "冰封出口！", description: "每次有效清除（含剥层）都会让冰封出口数字减一；归零后出口开放。" }],
  [10, { kind: "ice-block", title: "数字冰块！", description: "每次有效清除（含剥层）都会让数字冰块减一；归零后才可拖动。" }],
  [15, { kind: "layer", title: "单层外壳！", description: "先把外层送进同色出口，再按显露出的本体颜色继续送出。" }],
  [20, { kind: "shutter", title: "倒计时覆盖区！", description: "每次有效清除（含剥层）使数字减一；归零后开放覆盖区和隐藏方块。" }],
  [35, { kind: "generator", title: "方块生成器！", description: "输出位腾空后按预览队列逐块投放；出口被占时会暂停等待。" }],
  [50, { kind: "arrow-block", title: "轴向限制块！", description: "带箭头的方块只能沿指定横轴或纵轴拖动，不能转向。" }],
  [59, { kind: "key-lock", title: "钥匙与锁！", description: "钥匙块完全移出后只解锁同组锁链；锁值归零后方块才能拖动。" }],
  [65, { kind: "lift", title: "分层框！", description: "清空当前框层内的全部指定方块，下一层色块才会整体显现。" }],
  [70, { kind: "timed-generator", title: "定时生成器！", description: "首次操作后按固定秒数投放队列；出生位受阻时保持队首并暂停等待。" }],
  [73, { kind: "staged-frame", title: "阶段框！", description: "清空框内指定方块才解除封层；框外清除不会推进这个计数。" }],
  [100, { kind: "star", title: "星标方块！", description: "星标方块只能从同色星门离开；普通同色方块也能使用星门。" }],
]);

// Lv22 is the one source-observed cover whose physical footprint is fully
// recoverable from the supplied video. The untouched opening frame fills the
// top 3x6 band; after countdown 17 the shutter reveals a tiling that exactly
// fills the lower 6x7 band. Keep this spatial fact beside the direct-data
// materializer so a future rebuild cannot collapse the cover back to the
// non-spatial 1x1 staging marker used by the legacy assembler.
const LV22_VIDEO_LAYOUT = {
  shutter: { x: 0, y: 3, width: 6, height: 7, count: 17, skin: "shutter" },
  opening: new Map([
    ["cc-piece-s1-01", [0, 0]],
    ["cc-piece-s1-08", [1, 0]],
    ["cc-piece-s1-09", [2, 0]],
    ["cc-piece-s1-03", [3, 0]],
    ["cc-piece-s1-04", [4, 0]],
    ["cc-piece-s1-05", [5, 0]],
    ["cc-piece-s1-02", [0, 1]],
    ["cc-piece-s1-10", [1, 1]],
    ["cc-piece-s1-12", [2, 1]],
    ["cc-piece-s1-13", [3, 1]],
    ["cc-piece-s1-15", [4, 1]],
    ["cc-piece-s1-06", [5, 1]],
    ["cc-piece-s1-07", [0, 2]],
    ["cc-piece-s1-11", [1, 2]],
    ["cc-piece-s1-17", [2, 2]],
    ["cc-piece-s1-14", [3, 2]],
    ["cc-piece-s1-16", [4, 2]],
  ]),
  hidden: new Map([
    ["strategy-guard-s2-08", [0, 3]],
    ["strategy-guard-s2-12", [3, 3]],
    ["cc-piece-s2-01", [0, 4]],
    ["strategy-guard-s2-04", [2, 4]],
    ["cc-piece-s2-02", [3, 4]],
    ["cc-piece-s2-06", [5, 4]],
    ["cc-piece-s2-03", [0, 6]],
    ["cc-piece-s2-07", [2, 7]],
    ["strategy-guard-s2-05", [3, 6]],
    ["cc-piece-s2-10", [5, 7]],
    ["strategy-guard-s2-09", [0, 8]],
    ["cc-piece-s2-11", [3, 8]],
  ]),
};

const applyLv22VideoLayout = (level) => {
  if (level.id !== 22) return null;
  const shutter = (level.shutters ?? []).find((candidate) => candidate.skin === "shutter");
  if (!shutter) throw new Error("Lv22: missing source countdown shutter");
  Object.assign(shutter, LV22_VIDEO_LAYOUT.shutter);
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  for (const [id, [x, y]] of [...LV22_VIDEO_LAYOUT.opening, ...LV22_VIDEO_LAYOUT.hidden]) {
    const block = blockById.get(id);
    if (!block) throw new Error(`Lv22: missing video-layout block ${id}`);
    block.x = x;
    block.y = y;
  }
  return {
    level_id: 22,
    source_fact: "top 3x6 opening band plus lower 6x7 countdown cover",
    shutter: { id: shutter.id, ...LV22_VIDEO_LAYOUT.shutter },
    opening_block_count: LV22_VIDEO_LAYOUT.opening.size,
    hidden_block_count: LV22_VIDEO_LAYOUT.hidden.size,
  };
};

// Lv23 has two independently revealed 3x3 countdown covers. The old v7
// carrier only retained non-spatial 1x1 staging markers, which made the visual
// cover disagree with collision/reveal space. These coordinates and the V2
// correction for cover 9 were recovered frame-by-frame from 21-30.mp4.
const LV23_VIDEO_LAYOUT = {
  shutters: new Map([
    [9, { x: 3, y: 5, width: 3, height: 3, count: 9, skin: "shutter" }],
    [12, { x: 0, y: 5, width: 3, height: 3, count: 12, skin: "shutter" }],
  ]),
  gates: new Map([
    ["vp-023-gate-01", { side: "left", offset: 5, size: 3, color: "red" }],
    ["vp-023-gate-02", { side: "top", offset: 3, size: 3, color: "blue" }],
    ["vp-023-gate-03", { side: "left", offset: 2, size: 3, color: "green", frozen: 5 }],
    ["vp-023-gate-04", { side: "right", offset: 5, size: 3, color: "yellow" }],
    ["vp-023-gate-05", { side: "left", offset: 0, size: 2, color: "purple", frozen: 3 }],
  ]),
  blocks: new Map([
    ["cc-piece-s1-01", { x: 0, y: 0, shape: "H2", color: "blue" }],
    // Same-shape slot swap versus the source frame: this preserves the source
    // palette/counts while removing its sole same-colour opening contact.
    ["cc-piece-s1-02", { x: 0, y: 2, shape: "H2", color: "red" }],
    ["cc-piece-s1-03", { x: 4, y: 0, shape: "H2", color: "blue" }],
    ["strategy-guard-s1-05", { x: 0, y: 1, shape: "H2", color: "green" }],
    ["strategy-guard-s1-04", { x: 2, y: 1, shape: "H2", color: "yellow" }],
    ["strategy-guard-s1-08", { x: 4, y: 1, shape: "H2", color: "purple" }],
    ["strategy-guard-s1-10", { x: 2, y: 0, shape: "H2", color: "purple" }],
    ["cc-piece-s1-06", { x: 4, y: 2, shape: "H2", color: "red" }],
    ["cc-piece-s1-12", { x: 0, y: 3, shape: "L3A", color: "blue", layers: ["blue", "red"] }],
    ["cc-piece-s1-13", { x: 1, y: 3, shape: "L3B", color: "purple", layers: ["purple", "yellow"] }],
    ["cc-piece-s1-07", { x: 3, y: 3, shape: "V2", color: "blue" }],
    ["cc-piece-s1-09", { x: 4, y: 3, shape: "V2", color: "yellow" }],
    ["strategy-guard-s1-11", { x: 5, y: 3, shape: "V2", color: "blue" }],
    ["strategy-guard-s2-04", { x: 3, y: 5, shape: "H3", color: "green", cover: 9 }],
    ["strategy-guard-s2-01", { x: 3, y: 6, shape: "V2", color: "blue", layers: ["blue", "yellow"], cover: 9 }],
    ["cc-piece-s2-02", { x: 4, y: 6, shape: "V2", color: "red", layers: ["red", "yellow"], cover: 9 }],
    ["cc-piece-s2-03", { x: 5, y: 6, shape: "V2", color: "blue", cover: 9 }],
    ["strategy-guard-s3-01", { x: 0, y: 5, shape: "H2", color: "blue", cover: 12 }],
    ["cc-piece-s3-03", { x: 1, y: 5, shape: "L3C", color: "green", cover: 12 }],
    ["cc-piece-s3-02", { x: 0, y: 6, shape: "L4M", color: "yellow", cover: 12 }],
  ]),
};

const LV23_SHAPES = {
  H2: [[0, 0], [1, 0]],
  V2: [[0, 0], [0, 1]],
  H3: [[0, 0], [1, 0], [2, 0]],
  L3A: [[0, 0], [0, 1], [1, 1]],
  L3B: [[0, 0], [1, 0], [1, 1]],
  L3C: [[1, 0], [0, 1], [1, 1]],
  L4M: [[0, 0], [0, 1], [1, 1], [2, 1]],
};

const applyLv23VideoLayout = (level) => {
  if (level.id !== 23) return null;
  const shutterIdByCount = new Map();
  for (const shutter of level.shutters ?? []) {
    const target = LV23_VIDEO_LAYOUT.shutters.get(shutter.count);
    if (!target) continue;
    Object.assign(shutter, target);
    shutterIdByCount.set(shutter.count, shutter.id);
  }
  if (shutterIdByCount.size !== LV23_VIDEO_LAYOUT.shutters.size) {
    throw new Error("Lv23: missing source countdown shutters 9/12");
  }
  for (const [id, target] of LV23_VIDEO_LAYOUT.gates) {
    const gate = level.gates.find((candidate) => candidate.id === id);
    if (!gate) throw new Error(`Lv23: missing source gate ${id}`);
    delete gate.frozen;
    Object.assign(gate, target);
  }
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  for (const [id, target] of LV23_VIDEO_LAYOUT.blocks) {
    const block = blockById.get(id);
    if (!block) throw new Error(`Lv23: missing video-layout block ${id}`);
    block.x = target.x;
    block.y = target.y;
    block.shape = clone(LV23_SHAPES[target.shape]);
    block.color = target.color;
    if (target.layers) block.layers = clone(target.layers);
    else delete block.layers;
    if (target.cover) block.shutterId = shutterIdByCount.get(target.cover);
    else delete block.shutterId;
  }
  if (blockById.size !== LV23_VIDEO_LAYOUT.blocks.size) {
    throw new Error(`Lv23: expected ${LV23_VIDEO_LAYOUT.blocks.size} source blocks, got ${blockById.size}`);
  }
  return {
    level_id: 23,
    source_fact: "two lower 3x3 countdown covers; cover 9 is H3 + V2x3; cover 12 is H2 + L3 + L4",
    shutters: [...LV23_VIDEO_LAYOUT.shutters.values()].map(clone),
    opening_block_count: 13,
    hidden_block_count: 7,
    adjacency_safe_same_shape_slot_swap: ["cc-piece-s1-02", "strategy-guard-s1-10"],
  };
};

const SOLVER_VERIFIED_RUNTIME_REPAIRS = [{
  levelId: 14,
  gateId: "vp-014-gate-04",
  sourceFrozen: 17,
  targetFrozen: 2,
  uniqueExitColorRepair: {
    gateId: "vp-014-gate-01",
    blockIds: ["strategy-guard-06", "strategy-guard-12"],
    sourceColor: "green",
    targetColor: "red",
  },
  openingClusterColorRepairs: [
    { blockId: "cc-piece-09", sourceColor: "green", targetColor: "orange" },
    { blockId: "cc-piece-08", sourceColor: "orange", targetColor: "purple" },
    { blockId: "strategy-guard-13", sourceColor: "purple", targetColor: "green" },
  ],
  evidence: [
    "playtest-results/lv001-100-solver-r162/lv14-gate-threshold-sweep.json",
    "playtest-results/experiments/solvability-repair-batch-01/lv14-unique-exit-audit.json",
  ],
  verification: "unique gate+flipDoor colours; no opening same-colour component exceeds two blocks; per-colour block counts preserved; 32-drag solve; 169 explored states; PuzzleModel replay complete; frozen values 3-16 exhausted",
}];

// These three exact-deadlock repairs are intentionally applied after the SQ3
// restoration/repack below. Their source contracts therefore describe the
// already-published v8 LevelSpec, not the pre-v8 carrier file. Every changed
// field is asserted before mutation; { __absent__: true } means the property
// must not exist. Solver/PuzzleModel metrics and evidence hashes are copied
// from the read-only certificates captured in solvability-repair-batch-01.
const EXACT_DEADLOCK_RUNTIME_REPAIRS = [
  {
    levelId: 8,
    sourceLevelSpecSha256: "4992254D377566B71EFF60DB1B45C2B8907CDED4BF24CF2FAA3F64182BDF2AEF",
    targetLevelSpecSha256: "1B4585D03CF7D91DB5D289AAF087F1293C385E5BB284672C5466B8801B19860C",
    patches: [
      { entityType: "gate", entityId: "vp-008-gate-03", source: { offset: 3, side: "bottom", size: 1 }, target: { offset: 5, side: "right", size: 3 } },
      { entityType: "gate", entityId: "vp-008-gate-04", source: { offset: 2, side: "right" }, target: { offset: 1, side: "bottom" } },
      { entityType: "block", entityId: "cc-piece-14", source: { color: "purple" }, target: { color: "green" } },
      { entityType: "block", entityId: "cc-piece-16", source: { color: "green" }, target: { color: "blue" } },
    ],
    evidence: [
      { path: "playtest-results/experiments/solvability-repair-batch-01/lv8-local-search-child-final.json", sha256: "48F430BDEA38524D1F5822AD0E2F8262C43946F25458FB596F0DB46A2B347F80" },
      { path: "playtest-results/experiments/joint-color-constraints/lv001-100.json", sha256: "59E8262F120D7E7417A9C8F2994C6FCE4C2FF30CF672D01BAC7CA7D5371C9C1E" },
      { path: "playtest-results/experiments/solvability-repair-batch-01/lv8-local-search-child-target-paired-two-gates.json", sha256: "F56FBE3458C1D9D1D1148227C070FD8A5685F14728EDD71404425B765FEAF9F7" },
    ],
    solverAndReplay: {
      max_states: 20_000,
      termination: "solved",
      explored_states: 15_880,
      minimum_drags: 39,
      clear_load: 25,
      reposition_overhead: 14,
      grid_steps: 159,
      turns: 19,
      puzzle_model_replay: { passed: true, complete: true, remaining_blocks: 0, queued_blocks: 0 },
    },
  },
  {
    levelId: 18,
    sourceLevelSpecSha256: "97EAFCAE151D93CE782E184E24BF4831ADBB09BC11A638862BD142AD40606417",
    targetLevelSpecSha256: "66D6E1E6927A03E1779B6B38F73BEDE916055B1196B35871D3DCA2998E6F12F1",
    patches: [
      { entityType: "gate", entityId: "vp-018-gate-01", source: { side: "top" }, target: { side: "bottom" } },
      { entityType: "gate", entityId: "vp-018-gate-02", source: { color: "blue" }, target: { color: "cyan" } },
      { entityType: "gate", entityId: "vp-018-gate-03", source: { color: "blue" }, target: { color: "green" } },
      { entityType: "gate", entityId: "vp-018-gate-05", source: { offset: 0 }, target: { offset: 4 } },
      { entityType: "block", entityId: "strategy-guard-06", source: { color: "red" }, target: { color: "blue" } },
      { entityType: "block", entityId: "cc-piece-10", source: { color: "red" }, target: { color: "blue" } },
      { entityType: "block", entityId: "cc-piece-11", source: { color: "red" }, target: { color: "blue" } },
      { entityType: "block", entityId: "cc-piece-12", source: { color: "red" }, target: { color: "blue" } },
      { entityType: "block", entityId: "strategy-guard-15", source: { color: "blue" }, target: { color: "yellow" } },
    ],
    evidence: [
      { path: "playtest-results/experiments/solvability-repair-batch-01/lv18-local-search-final.json", sha256: "6561566C8EBEB915148A713092CF79FE197DB64E24100E68FA451BB0BF6B828A" },
      { path: "playtest-results/experiments/joint-color-constraints/lv001-100.json", sha256: "59E8262F120D7E7417A9C8F2994C6FCE4C2FF30CF672D01BAC7CA7D5371C9C1E" },
      { path: "playtest-results/experiments/solvability-repair-batch-01/lv18-two-exit-repair-solved.json", sha256: "8FA550AF39B5B66E0C72CA8360FD28B31341789615C106B7A12D0B106E9C4CDB" },
    ],
    solverAndReplay: {
      max_states: 20_000,
      termination: "solved",
      explored_states: 55,
      minimum_drags: 19,
      clear_load: 16,
      reposition_overhead: 3,
      grid_steps: 68,
      turns: 12,
      puzzle_model_replay: { passed: true, complete: true, remaining_blocks: 0, queued_blocks: 0 },
    },
  },
  {
    levelId: 76,
    sourceLevelSpecSha256: "24878433D01171E1C123279305365430DEFCB88D79C6142C824B4B1FC1E7CC05",
    targetLevelSpecSha256: "BFC0C02EA8F8EE48FF2D441B5A068B35A9082DEF248DF2FB376A56128ABCD78C",
    patches: [
      { entityType: "gate", entityId: "vp-076-gate-02", source: { offset: 0, side: "right" }, target: { offset: 2, side: "top" } },
      { entityType: "gate", entityId: "vp-076-gate-03", source: { offset: 2, side: "top" }, target: { offset: 6, side: "right" } },
      { entityType: "gate", entityId: "vp-076-gate-04", source: { offset: 6 }, target: { offset: 0 } },
      { entityType: "block", entityId: "cc-076-b1-02", source: { color: "yellow" }, target: { color: "orange" } },
      { entityType: "block", entityId: "cc-076-b1-03", source: { frozen: { __absent__: true } }, target: { frozen: 5 } },
      { entityType: "block", entityId: "cc-076-b1-05", source: { color: "yellow", frozen: { __absent__: true } }, target: { color: "orange", frozen: 5 } },
      { entityType: "block", entityId: "cc-076-b1-07", source: { frozen: 5 }, target: { frozen: { __absent__: true } } },
      { entityType: "block", entityId: "cc-076-b1-08", source: { color: "yellow" }, target: { color: "red" } },
      { entityType: "block", entityId: "cc-076-b1-10", source: { color: "yellow" }, target: { color: "red" } },
      { entityType: "block", entityId: "cc-076-b1-11", source: { color: "yellow", frozen: 14 }, target: { color: "orange", frozen: { __absent__: true } } },
      { entityType: "block", entityId: "cc-076-b1-13", source: { color: "yellow" }, target: { color: "red" } },
      { entityType: "block", entityId: "cc-076-b1-14", source: { frozen: 5 }, target: { frozen: 14 } },
    ],
    evidence: [
      { path: "playtest-results/experiments/solvability-repair-batch-01/lv76-local-search-final.json", sha256: "38A9D0E7D3D5AF8EB0AFC67CB0881E58578B8A49D1FEE6250473C64813935E28" },
      { path: "playtest-results/experiments/joint-color-constraints/lv001-100.json", sha256: "59E8262F120D7E7417A9C8F2994C6FCE4C2FF30CF672D01BAC7CA7D5371C9C1E" },
      { path: "playtest-results/experiments/solvability-repair-batch-01/lv76-direct-edge-relocate-frozen-same-colors-20k.json", sha256: "A7427C90235B90F670F5D269FF36174F489736E546C52613A67FF09852374D63" },
    ],
    solverAndReplay: {
      max_states: 20_000,
      termination: "solved",
      explored_states: 19,
      minimum_drags: 18,
      clear_load: 18,
      reposition_overhead: 0,
      grid_steps: 83,
      turns: 9,
      puzzle_model_replay: { passed: true, complete: true, remaining_blocks: 0, queued_blocks: 0 },
    },
  },
];

// Exit-colour uniqueness and opening-colour dispersion repairs derived from
// the read-only auto-recolour solver batches. These are deliberately applied
// after every pre-existing v8 repair so each sourceLevelSpecSha256 is a strict
// preflight for the exact formal LevelSpec that is being patched. Exit colours
// are changed first, then opening block colours are exchanged/cycled or
// replay-verified freely redistributed. Every record declares whether its
// per-colour counts are preserved; non-active shell layers never change.
const clusterSwapBatchHEvidence = [
  {
    path: "playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-h.json",
    sha256: "C9BEDD3374FE30B8E8A44A638894BA3E415AAC42B51931CB727ACC5D954855AA",
  },
  {
    path: "playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-h.md",
    sha256: "D24A76E017CF0CD808A1267036FB3D4197FE15E8B37A9381AE2689159F5E10E5",
  },
];
const clusterSwapBatchHRaw = await readFile(resolve(root, clusterSwapBatchHEvidence[0].path));
if (sha256(clusterSwapBatchHRaw) !== clusterSwapBatchHEvidence[0].sha256) {
  throw new Error("Cluster-swap batch H JSON evidence SHA drifted");
}
const clusterSwapBatchHMdRaw = await readFile(resolve(root, clusterSwapBatchHEvidence[1].path));
if (sha256(clusterSwapBatchHMdRaw) !== clusterSwapBatchHEvidence[1].sha256) {
  throw new Error("Cluster-swap batch H Markdown evidence SHA drifted");
}
const clusterSwapBatchH = JSON.parse(clusterSwapBatchHRaw.toString("utf8"));
const clusterSwapBatchHLevelIds = [22, 54, 59, 69, 74, 77, 84, 89];
const clusterSwapBatchHAuthoredProjectionSha256 = new Map([
  [77, {
    source: "9E1BFF4197BFB545F2A3BB0D5727C027382A48CFC7B350213B0C1CEE11BF7FDE",
    target: "F8BB23238867FCADF9502EE62455A255A02D5038A2A0C8EC80EE1787B65225EF",
  }],
  [89, {
    source: "B1CDACF0ED8B916CC2185DA381C460A077CBA5FE5407310A29C10611026F7ABF",
    target: "EB91F0DC377876F716DBDF659F7FE3CDC282F0C0DBD033609C2874C043C2169E",
  }],
]);
if (clusterSwapBatchH.schema !== "blockout-opening-cluster-swap-solved-batch-h-v1"
  || clusterSwapBatchH.mode
    !== "formal integration evidence; source geometry/composition/mechanisms fixed, only opening-visible outer colours are permuted"
  || !sameJson(clusterSwapBatchH.summary?.level_ids, clusterSwapBatchHLevelIds)
  || clusterSwapBatchH.summary?.level_count !== clusterSwapBatchHLevelIds.length
  || clusterSwapBatchH.summary?.validate_passed !== clusterSwapBatchHLevelIds.length
  || clusterSwapBatchH.summary?.fresh_solver_passed !== clusterSwapBatchHLevelIds.length
  || clusterSwapBatchH.summary?.puzzle_model_replay_passed !== clusterSwapBatchHLevelIds.length
  || clusterSwapBatchH.summary?.exact_opening_histogram_preserved !== clusterSwapBatchHLevelIds.length) {
  throw new Error("Cluster-swap batch H evidence contract drifted");
}

const clusterSwapBatchHRuntimeRepairs = clusterSwapBatchH.records.map((record) => {
  const replay = record.solver_and_replay?.puzzle_model_replay;
  const targetSha256 = sha256(JSON.stringify(canonical(record.target_level)));
  const exits = [...(record.target_level?.gates ?? []), ...(record.target_level?.flipDoors ?? [])];
  if (!clusterSwapBatchHLevelIds.includes(record.level_id)
    || targetSha256 !== record.target_level_spec_sha256
    || record.changed_block_count !== record.block_color_patches?.length
    || record.atomic_application_order?.length !== 1
    || record.atomic_application_order[0] !== "opening_visible_outer_colour_swaps_or_cycles"
    || record.opening_visible_color_counts_preserved !== true
    || !sameJson(record.opening_visible_color_counts_before, record.opening_visible_color_counts_after)
    || record.opening_same_color_component_maximum > 2
    || record.exit_colors_jointly_unique !== true
    || new Set(exits.map((exit) => exit.color)).size !== exits.length
    || record.multilayer_outer_inner_colors_differ !== true
    || record.declared_only_mutation_check_passed !== true
    || record.solver_and_replay?.max_states !== 20_000
    || record.solver_and_replay?.termination !== "solved"
    || record.solver_and_replay?.unsupported_reasons?.length
    || record.solver_and_replay?.static_unsat_reasons?.length
    || replay?.ok !== true || replay?.complete !== true
    || replay?.moves !== record.solver_and_replay.minimum_drags
    || replay?.remaining_blocks !== 0 || replay?.remaining_queued_blocks !== 0
    || !Array.isArray(record.route) || record.route.length !== record.solver_and_replay.minimum_drags) {
    throw new Error(`Lv${record.level_id}: cluster-swap batch H record drifted`);
  }
  const blockColorPatches = record.block_color_patches.map((patch) => {
    const targetBlock = record.target_level.blocks.find((block) => block.id === patch.id);
    if (!targetBlock || targetBlock.color !== patch.to
      || (targetBlock.layers?.[0] ?? targetBlock.color) !== patch.to) {
      throw new Error(`Lv${record.level_id}/${patch.id}: batch H target block drifted`);
    }
    return {
      blockId: patch.id,
      sourceColor: patch.from,
      targetColor: patch.to,
      ...(targetBlock.layers?.length ? {
        sourceLayers: [patch.from, ...targetBlock.layers.slice(1)],
        targetLayers: clone(targetBlock.layers),
      } : {}),
    };
  });
  const authoredProjectionSha256 = clusterSwapBatchHAuthoredProjectionSha256.get(record.level_id);
  return {
    levelId: record.level_id,
    sourceLevelSpecSha256: authoredProjectionSha256?.source ?? record.source_level_spec_sha256,
    targetLevelSpecSha256: authoredProjectionSha256?.target ?? record.target_level_spec_sha256,
    campaignSourceLevelSpecSha256: record.source_level_spec_sha256,
    campaignTargetLevelSpecSha256: record.target_level_spec_sha256,
    evidenceTargetSemanticSha256: record.target_level_spec_sha256,
    canonicalLevelSpecSha256: true,
    exitPatches: [],
    blockColorPatches,
    preserveOpeningColorCounts: true,
    requireEveryExitColorInOpening: false,
    solverAndReplay: {
      ...clone(record.solver_and_replay),
      route: clone(record.route),
    },
    evidence: clone(clusterSwapBatchHEvidence),
    evidenceRecord: {
      schema: clusterSwapBatchH.schema,
      source_level_spec_sha256: record.source_level_spec_sha256,
      target_level_spec_sha256: record.target_level_spec_sha256,
      opening_visible_color_counts_before: clone(record.opening_visible_color_counts_before),
      opening_visible_color_counts_after: clone(record.opening_visible_color_counts_after),
    },
  };
});

const clusterSwapBatchIEvidence = [
  {
    path: "playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-i.json",
    sha256: "AC84C2255D248C777D784069EE1FF0D745C77E759DA3CA189CB23DC2A1C62B83",
  },
  {
    path: "playtest-results/experiments/unique-exit-repair/cluster-swap-solved-batch-i.md",
    sha256: "DEED4ABBB465F7193F786AE6D672861B896B43DCD72641B065009B83A32C0B2D",
  },
];
const clusterSwapBatchIRaw = await readFile(resolve(root, clusterSwapBatchIEvidence[0].path));
if (sha256(clusterSwapBatchIRaw) !== clusterSwapBatchIEvidence[0].sha256) {
  throw new Error("Cluster-swap batch I JSON evidence SHA drifted");
}
const clusterSwapBatchIMdRaw = await readFile(resolve(root, clusterSwapBatchIEvidence[1].path));
if (sha256(clusterSwapBatchIMdRaw) !== clusterSwapBatchIEvidence[1].sha256) {
  throw new Error("Cluster-swap batch I Markdown evidence SHA drifted");
}
const clusterSwapBatchI = JSON.parse(clusterSwapBatchIRaw.toString("utf8"));
const clusterSwapBatchILevelIds = [72, 94];
if (clusterSwapBatchI.schema !== "blockout-opening-cluster-swap-solved-cluster-swap-solved-batch-i-v1"
  || clusterSwapBatchI.mode
    !== "formal integration evidence; source geometry/composition/mechanisms fixed, only opening-visible outer colours are permuted"
  || !sameJson(clusterSwapBatchI.summary?.level_ids, clusterSwapBatchILevelIds)
  || clusterSwapBatchI.summary?.level_count !== clusterSwapBatchILevelIds.length
  || clusterSwapBatchI.summary?.validate_passed !== clusterSwapBatchILevelIds.length
  || clusterSwapBatchI.summary?.fresh_solver_passed !== clusterSwapBatchILevelIds.length
  || clusterSwapBatchI.summary?.puzzle_model_replay_passed !== clusterSwapBatchILevelIds.length
  || clusterSwapBatchI.summary?.exact_opening_histogram_preserved !== clusterSwapBatchILevelIds.length) {
  throw new Error("Cluster-swap batch I evidence contract drifted");
}

const clusterSwapBatchIRuntimeRepairs = clusterSwapBatchI.records.map((record) => {
  const replay = record.solver_and_replay?.puzzle_model_replay;
  const targetSha256 = sha256(JSON.stringify(canonical(record.target_level)));
  const exits = [...(record.target_level?.gates ?? []), ...(record.target_level?.flipDoors ?? [])];
  if (!clusterSwapBatchILevelIds.includes(record.level_id)
    || targetSha256 !== record.target_level_spec_sha256
    || record.changed_block_count !== record.block_color_patches?.length
    || record.atomic_application_order?.length !== 1
    || record.atomic_application_order[0] !== "opening_visible_outer_colour_swaps_or_cycles"
    || record.opening_visible_color_counts_preserved !== true
    || !sameJson(record.opening_visible_color_counts_before, record.opening_visible_color_counts_after)
    || record.opening_same_color_component_maximum > 2
    || record.exit_colors_jointly_unique !== true
    || new Set(exits.map((exit) => exit.color)).size !== exits.length
    || record.multilayer_outer_inner_colors_differ !== true
    || record.declared_only_mutation_check_passed !== true
    || record.solver_and_replay?.max_states !== 20_000
    || record.solver_and_replay?.termination !== "solved"
    || record.solver_and_replay?.unsupported_reasons?.length
    || record.solver_and_replay?.static_unsat_reasons?.length
    || replay?.ok !== true || replay?.complete !== true
    || replay?.moves !== record.solver_and_replay.minimum_drags
    || replay?.remaining_blocks !== 0 || replay?.remaining_queued_blocks !== 0
    || !Array.isArray(record.route) || record.route.length !== record.solver_and_replay.minimum_drags) {
    throw new Error(`Lv${record.level_id}: cluster-swap batch I record drifted`);
  }
  const blockColorPatches = record.block_color_patches.map((patch) => {
    const targetBlock = record.target_level.blocks.find((block) => block.id === patch.id);
    if (!targetBlock || targetBlock.color !== patch.to
      || (targetBlock.layers?.[0] ?? targetBlock.color) !== patch.to) {
      throw new Error(`Lv${record.level_id}/${patch.id}: batch I target block drifted`);
    }
    return { blockId: patch.id, sourceColor: patch.from, targetColor: patch.to };
  });
  return {
    levelId: record.level_id,
    sourceLevelSpecSha256: record.source_level_spec_sha256,
    targetLevelSpecSha256: record.target_level_spec_sha256,
    campaignSourceLevelSpecSha256: record.source_level_spec_sha256,
    campaignTargetLevelSpecSha256: record.target_level_spec_sha256,
    evidenceTargetSemanticSha256: record.target_level_spec_sha256,
    canonicalLevelSpecSha256: true,
    exitPatches: [],
    blockColorPatches,
    preserveOpeningColorCounts: true,
    requireEveryExitColorInOpening: false,
    solverAndReplay: {
      ...clone(record.solver_and_replay),
      route: clone(record.route),
    },
    evidence: clone(clusterSwapBatchIEvidence),
    evidenceRecord: {
      schema: clusterSwapBatchI.schema,
      source_level_spec_sha256: record.source_level_spec_sha256,
      target_level_spec_sha256: record.target_level_spec_sha256,
      opening_visible_color_counts_before: clone(record.opening_visible_color_counts_before),
      opening_visible_color_counts_after: clone(record.opening_visible_color_counts_after),
    },
  };
});

const AUTO_RECOLOR_RUNTIME_REPAIRS = [
  {
    levelId: 2,
    sourceLevelId: 5,
    sourceLevelSpecSha256: "F8F396EBD7AF71F3C2361492337E06D3B860995F28535A7E230E46EAFEA6A074",
    targetLevelSpecSha256: "AADFC288FBF5586A44667E1F88E9779AAAB6BEBABE8A4CE56826FBC1E19D3DF3",
    campaignSourceLevelSpecSha256: "B1784568D094DCC62967B02254A8748C10220970A15925464068869312809944",
    campaignTargetLevelSpecSha256: "C8189C227817D85BAB718C6530529D262D35A7DCC113B0A17CDDF7DCD1E4BD5E",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-piece-05", sourceColor: "orange", targetColor: "red" },
      { blockId: "cc-piece-15", sourceColor: "green", targetColor: "orange" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 521, minimum_drags: 27, clear_load: 20, reposition_overhead: 7, grid_steps: 84, turns: 12 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-early-a.json", sha256: "0744D2F817B416581FF2782E4CF8D0361F1DAA6537E28693FF838548BF668935" }],
  },
  {
    levelId: 3,
    sourceLevelSpecSha256: "287783A76978F8847631D5EDD71EC5D572C36FCBB2A566B173A7DF5FB9943864",
    targetLevelSpecSha256: "85C1335DDC0C7C825415D0EEB2CD96CCE18B7AF4F4191B3745A2E7475E50526A",
    exitPatches: [],
    blockColorPatches: [{ blockId: "piece-07", sourceColor: "cyan", targetColor: "green" }],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 125, minimum_drags: 17, clear_load: 9, reposition_overhead: 8, grid_steps: 53, turns: 6 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-early-a.json", sha256: "0744D2F817B416581FF2782E4CF8D0361F1DAA6537E28693FF838548BF668935" }],
  },
  {
    levelId: 4,
    sourceLevelSpecSha256: "C447744BED0FA6B1230393A30C74838104D7FC653D4484ECF05368B9D4236C77",
    targetLevelSpecSha256: "428DC15F9CED75D6E50B50259CEA89912F4D1407CC09B9677DD31C48F6DB6620",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "strategy-guard-03", sourceColor: "green", targetColor: "pink" },
      { blockId: "cc-piece-05", sourceColor: "orange", targetColor: "pink" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 258, minimum_drags: 31, clear_load: 18, reposition_overhead: 13, grid_steps: 92, turns: 21 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-early-a.json", sha256: "0744D2F817B416581FF2782E4CF8D0361F1DAA6537E28693FF838548BF668935" }],
  },
  {
    levelId: 6,
    sourceLevelSpecSha256: "D36E2C3D016063D25294B11F89B727A8BC6E4D658C3D8FD550A5B852C6F62852",
    targetLevelSpecSha256: "E6519AFA26843B9795E28444B12506C1DFAC66AE4D75FEDB664EFBA9BCF025F0",
    exitPatches: [],
    blockColorPatches: [{ blockId: "cc-piece-15", sourceColor: "blue", targetColor: "pink" }],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 816, minimum_drags: 33, clear_load: 21, reposition_overhead: 12, grid_steps: 109, turns: 21 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-early-a.json", sha256: "0744D2F817B416581FF2782E4CF8D0361F1DAA6537E28693FF838548BF668935" }],
  },
  {
    levelId: 7,
    sourceLevelSpecSha256: "AC6CD20A3F694D9641EC2D33396B3E274483A415C695E0B9C1D676CB20F2476B",
    targetLevelSpecSha256: "BB5CB270EBBA523CC7BBE5E82672F3A88849233D7C35C512E594D7F388643726",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-piece-02", sourceColor: "pink", targetColor: "yellow" },
      { blockId: "cc-piece-07", sourceColor: "yellow", targetColor: "pink" },
      { blockId: "strategy-guard-12", sourceColor: "yellow", targetColor: "red" },
      { blockId: "cc-piece-13", sourceColor: "yellow", targetColor: "pink" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 3_842, minimum_drags: 33, clear_load: 16, reposition_overhead: 17, grid_steps: 125, turns: 25 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-early-a.json", sha256: "0744D2F817B416581FF2782E4CF8D0361F1DAA6537E28693FF838548BF668935" }],
  },
  {
    levelId: 9,
    sourceLevelSpecSha256: "CD9624A74D83A1134CFCC72585B43E53B362714B812515901BABAEEC7FBD316E",
    targetLevelSpecSha256: "C73DC4E01CB74D965DA36B8AB9C94B56B5BF462816CC40621156F25098DF060C",
    exitPatches: [],
    blockColorPatches: [{ blockId: "strategy-guard-09", sourceColor: "blue", targetColor: "purple" }],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 2_902, minimum_drags: 24, clear_load: 10, reposition_overhead: 14, grid_steps: 81, turns: 13 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-early-a.json", sha256: "0744D2F817B416581FF2782E4CF8D0361F1DAA6537E28693FF838548BF668935" }],
  },
  {
    levelId: 12,
    sourceLevelSpecSha256: "8DECDCB96ABE9D4A6664CE05602168796ED75F3D2F5A24CC9E3EADF254820835",
    targetLevelSpecSha256: "81A431D5759BBED71CFE8D440F30E31B1E2C094A948AC857C502CD777C21CCD6",
    exitPatches: [{ entityType: "gate", entityId: "vp-012-gate-01", sourceColor: "orange", targetColor: "blue" }],
    blockColorPatches: [
      { blockId: "cc-piece-01", sourceColor: "orange", targetColor: "blue" },
      { blockId: "strategy-guard-02", sourceColor: "pink", targetColor: "blue" },
      { blockId: "cc-piece-03", sourceColor: "cyan", targetColor: "blue" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 1_352, minimum_drags: 22, clear_load: 12, reposition_overhead: 10, grid_steps: 84, turns: 11 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/free-recolor-batch-r3a.json", sha256: "DC17301487636016FE2B0C229032DFAB071EFCB438752B7356100796BF8FA776" }],
  },
  {
    levelId: 13,
    sourceLevelSpecSha256: "E233D2085C66B95819315375DFA6E846F4F84F09DD3CCB9552BF3D7D3EA1182F",
    exitPatches: [{ entityType: "gate", entityId: "vp-013-gate-06", sourceColor: "red", targetColor: "cyan" }],
    blockColorPatches: [
      { blockId: "cc-piece-05", sourceColor: "yellow", targetColor: "green" },
      { blockId: "cc-piece-08", sourceColor: "green", targetColor: "yellow" },
    ],
    preserveOpeningColorCounts: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 3_254, minimum_drags: 26, clear_load: 16, reposition_overhead: 10, grid_steps: 107, turns: 10 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-r2-cluster-swaps.json", sha256: "31C0D659F583B8990A61FEB15E79EDC7A01FF7F02EFA7061380335CEA293A518" }],
  },
  {
    levelId: 16,
    sourceLevelSpecSha256: "61D923F0328B95D5114D1EE0D6A1C48CD0D9720C6AA7C85FD6DDA9B5BC0DFD54",
    targetLevelSpecSha256: "CE35685262EBB5231FF4A9E4F67C9A21D5D338F91BAE5EED9443CF6CD5870AB4",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-016-b1-02", sourceColor: "green", targetColor: "orange" },
      { blockId: "cc-016-b1-04", sourceColor: "purple", targetColor: "green" },
      { blockId: "cc-016-b1-11", sourceColor: "blue", targetColor: "green" },
      { blockId: "cc-016-b1-13", sourceColor: "orange", targetColor: "purple" },
      { blockId: "cc-016-b1-15", sourceColor: "green", targetColor: "orange" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 1_352, minimum_drags: 35, clear_load: 21, reposition_overhead: 14, grid_steps: 131, turns: 31 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-early-b.json.checkpoint.json", sha256: "9CE10607FD8F638F178AFAA23B6D4B9D8CA7EB77418A42FFED63AE5285AEE876" }],
  },
  {
    levelId: 21,
    sourceLevelSpecSha256: "4CB0358585F21940BBE19A1A8DED133AE8F28318CAB0A3158DDB8A8177B0BF3E",
    targetLevelSpecSha256: "2733B56A06DD1A2B5C785FA2B6A6B65EF35F07E5715D2E3AD92EF5FE653A4B07",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-021-b1-03", sourceColor: "purple", targetColor: "green" },
      { blockId: "cc-021-b1-06", sourceColor: "red", targetColor: "green" },
      { blockId: "cc-021-b1-07", sourceColor: "red", targetColor: "cyan" },
      { blockId: "cc-021-b1-14", sourceColor: "cyan", targetColor: "orange" },
      { blockId: "cc-021-b2-03", sourceColor: "cyan", targetColor: "green", sourceLayers: ["cyan", "red"], targetLayers: ["green", "red"] },
      { blockId: "cc-021-b3-02", sourceColor: "cyan", targetColor: "orange", sourceLayers: ["cyan", "green"], targetLayers: ["orange", "green"] },
      { blockId: "cc-021-b4-01", sourceColor: "cyan", targetColor: "orange" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 28, minimum_drags: 27, clear_load: 27, reposition_overhead: 0, grid_steps: 96, turns: 9 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-c.json", sha256: "9E84AE6BD58ABDC7079AC4DFA124F700BEC4EA8F81301EAE3FEF197BE284E160" }],
  },
  {
    levelId: 33,
    sourceLevelSpecSha256: "939D1DBA7C60B7E8FEDE00A572BC5CCC0C6BD890896B7C3D0A3A8AA6DAE843A9",
    targetLevelSpecSha256: "6D65A78D7643105EAF0D6B04985E22F2C02D70B4523992951EF1506E5971D94B",
    exitPatches: [{ entityType: "gate", entityId: "vp-033-gate-03", sourceColor: "orange", targetColor: "cyan" }],
    blockColorPatches: [
      { blockId: "cc-piece-08", sourceColor: "yellow", targetColor: "cyan" },
      { blockId: "cc-piece-18", sourceColor: "blue", targetColor: "orange" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 15_142, minimum_drags: 37, clear_load: 23, reposition_overhead: 14, grid_steps: 256, turns: 55 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/free-recolor-batch-r3b.json", sha256: "8A127BFC233F338A434D850F6499C4FC96D0A8ECE07E4A4E1AF4368CB97C8498" }],
  },
  {
    levelId: 37,
    sourceLevelSpecSha256: "102BE17FF858C7640AE52C44EC0D3153A301545085FCC11052E4AF27738A15C4",
    exitPatches: [{ entityType: "gate", entityId: "vp-037-gate-07", sourceColor: "orange", targetColor: "pink" }],
    blockColorPatches: [],
    preserveOpeningColorCounts: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 1_086, minimum_drags: 43, clear_load: 19, reposition_overhead: 24, grid_steps: 105, turns: 12 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-r1.json", sha256: "AD6B7E91054756E0F6681832D2F8B61D1BBD8BB57495911228FF5EC0D7DF71CE" }],
  },
  {
    levelId: 44,
    sourceLevelSpecSha256: "8C65BFF1645CAA94568A3B852B68075BF7E58DF39D886E543D24E801F0F0AF39",
    exitPatches: [{ entityType: "gate", entityId: "vp-044-gate-08", sourceColor: "orange", targetColor: "green" }],
    blockColorPatches: [
      { blockId: "cc-044-b1-05", sourceColor: "yellow", targetColor: "pink" },
      { blockId: "cc-044-b5-01", sourceColor: "pink", targetColor: "yellow" },
    ],
    preserveOpeningColorCounts: false,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 68, minimum_drags: 21, clear_load: 18, reposition_overhead: 3, grid_steps: 68, turns: 10 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-r2-cluster-swaps.json", sha256: "31C0D659F583B8990A61FEB15E79EDC7A01FF7F02EFA7061380335CEA293A518" }],
  },
  {
    levelId: 46,
    sourceLevelSpecSha256: "8C2B9F2D26B3A74BAFD2AEB1443F6799648AF868469BF9B9880E9ABC090895A5",
    targetLevelSpecSha256: "4D6BC6F3556911F2083986EFDF8B0823B8D0BB07A5855BCCF72A6A41C1F6E6CC",
    exitPatches: [{ entityType: "gate", entityId: "vp-046-gate-08", sourceColor: "yellow", targetColor: "red" }],
    blockColorPatches: [
      { blockId: "cc-046-b1-06", sourceColor: "purple", targetColor: "red" },
      { blockId: "cc-046-b5-03", sourceColor: "blue", targetColor: "cyan" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 56, minimum_drags: 34, clear_load: 27, reposition_overhead: 7, grid_steps: 124, turns: 35 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/free-recolor-batch-r3b.json", sha256: "8A127BFC233F338A434D850F6499C4FC96D0A8ECE07E4A4E1AF4368CB97C8498" }],
  },
  {
    levelId: 53,
    sourceLevelSpecSha256: "A465E1DCFEF74D6A53A58130D0ABC85A98572CD3CA4D1FC155C0B7A73EA0E94A",
    targetLevelSpecSha256: "64F9D39374C30089C307AF398CBFA833038640118726ADF88FFCCBDF2A5475DE",
    exitPatches: [{ entityType: "gate", entityId: "vp-053-gate-05", sourceColor: "orange", targetColor: "yellow" }],
    blockColorPatches: [
      { blockId: "cc-053-b1-05", sourceColor: "pink", targetColor: "blue", sourceLayers: ["pink", "purple"], targetLayers: ["blue", "purple"] },
      { blockId: "cc-053-b1-09", sourceColor: "orange", targetColor: "yellow" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 454, minimum_drags: 32, clear_load: 16, reposition_overhead: 16, grid_steps: 86, turns: 9 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/free-recolor-batch-r3a.json", sha256: "DC17301487636016FE2B0C229032DFAB071EFCB438752B7356100796BF8FA776" }],
  },
  {
    levelId: 56,
    sourceLevelSpecSha256: "571F6D8FD3D6B5823456C2D90391AC36905DCC02C2F0151293AD37D69CB643DE",
    exitPatches: [{ entityType: "gate", entityId: "vp-056-gate-08", sourceColor: "cyan", targetColor: "pink" }],
    blockColorPatches: [
      { blockId: "strategy-guard-s1-04", sourceColor: "green", targetColor: "purple" },
      { blockId: "cc-piece-s1-15", sourceColor: "purple", targetColor: "green" },
    ],
    preserveOpeningColorCounts: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 66, minimum_drags: 24, clear_load: 21, reposition_overhead: 3, grid_steps: 70, turns: 9 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-r2-cluster-swaps.json", sha256: "31C0D659F583B8990A61FEB15E79EDC7A01FF7F02EFA7061380335CEA293A518" }],
  },
  {
    levelId: 58,
    sourceLevelSpecSha256: "0D11191311698497A6560A5721461C73541C51F196987EE72D8BCA827E1D42ED",
    exitPatches: [
      { entityType: "gate", entityId: "vp-058-gate-07", sourceColor: "cyan", targetColor: "blue" },
      { entityType: "gate", entityId: "vp-058-gate-08", sourceColor: "green", targetColor: "purple" },
    ],
    blockColorPatches: [
      { blockId: "cc-058-b1-02", sourceColor: "pink", targetColor: "orange" },
      { blockId: "cc-058-b1-04", sourceColor: "cyan", targetColor: "yellow" },
      { blockId: "cc-058-b1-10", sourceColor: "yellow", targetColor: "pink" },
      { blockId: "cc-058-b1-11", sourceColor: "orange", targetColor: "cyan" },
    ],
    preserveOpeningColorCounts: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 713, minimum_drags: 31, clear_load: 23, reposition_overhead: 8, grid_steps: 106, turns: 19 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-r2-cluster-swaps.json", sha256: "31C0D659F583B8990A61FEB15E79EDC7A01FF7F02EFA7061380335CEA293A518" }],
  },
  {
    levelId: 82,
    sourceLevelSpecSha256: "F24F1E2D022D87EACFB44E2E2B63FDCAF321A0FD9A8E20A514F3EB4FEDDB1B2D",
    exitPatches: [{ entityType: "gate", entityId: "vp-082-gate-08", sourceColor: "cyan", targetColor: "purple" }],
    blockColorPatches: [
      { blockId: "cc-piece-04", sourceColor: "red", targetColor: "cyan" },
      { blockId: "cc-piece-05", sourceColor: "cyan", targetColor: "red" },
    ],
    preserveOpeningColorCounts: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 100, minimum_drags: 25, clear_load: 19, reposition_overhead: 6, grid_steps: 121, turns: 20 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-r2-cluster-swaps.json", sha256: "31C0D659F583B8990A61FEB15E79EDC7A01FF7F02EFA7061380335CEA293A518" }],
  },
  {
    levelId: 85,
    sourceLevelSpecSha256: "02560325AFE994D1BCB5588E60FCB550773C824FD189B045A460B0C01CEEDF7E",
    targetLevelSpecSha256: "AE3D85B2AC4A641E478700DCCF16F2495BFB0BDB15CA7BAE4BA30771856DFB0F",
    exitPatches: [{ entityType: "gate", entityId: "vp-085-gate-06", sourceColor: "purple", targetColor: "pink" }],
    blockColorPatches: [
      { blockId: "cc-085-b1-04", sourceColor: "red", targetColor: "blue" },
      { blockId: "cc-085-b1-06", sourceColor: "red", targetColor: "blue" },
      { blockId: "cc-085-b1-13", sourceColor: "blue", targetColor: "pink" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 5_209, minimum_drags: 25, clear_load: 18, reposition_overhead: 7, grid_steps: 129, turns: 19 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/free-recolor-batch-r3b.json", sha256: "8A127BFC233F338A434D850F6499C4FC96D0A8ECE07E4A4E1AF4368CB97C8498" }],
  },
  {
    levelId: 91,
    sourceLevelSpecSha256: "C941038DB17EB976B4821A3215851BF515C4D1F1F18277EFA127B1306DEFA734",
    exitPatches: [
      { entityType: "gate", entityId: "vp-091-gate-04", sourceColor: "cyan", targetColor: "orange" },
      { entityType: "gate", entityId: "vp-091-gate-06", sourceColor: "green", targetColor: "red" },
    ],
    blockColorPatches: [
      { blockId: "cc-091-b1-04", sourceColor: "green", targetColor: "blue" },
      { blockId: "cc-091-b1-06", sourceColor: "green", targetColor: "purple" },
      { blockId: "cc-091-b1-07", sourceColor: "green", targetColor: "blue" },
      { blockId: "cc-091-b1-10", sourceColor: "green", targetColor: "cyan" },
      { blockId: "cc-091-b1-13", sourceColor: "green", targetColor: "blue" },
      { blockId: "cc-091-b2-03", sourceColor: "green", targetColor: "red" },
      { blockId: "cc-091-b3-01", sourceColor: "green", targetColor: "orange" },
      { blockId: "cc-091-b3-03", sourceColor: "green", targetColor: "orange" },
      { blockId: "cc-091-b3-05", sourceColor: "green", targetColor: "cyan" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 28, minimum_drags: 27, clear_load: 27, reposition_overhead: 0, grid_steps: 132, turns: 17 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/lv91-lv100-free-recolor-search.json", sha256: "3984292E9BEB32A6A891F616DF3B27FB635A55640AA951C1A3154344C8FD3A95" }],
  },
  {
    levelId: 99,
    sourceLevelSpecSha256: "A6D2A4748D7DC221ECFFB19E32EE3FA0C10225BE70FCF84679E9D55D127BB74E",
    exitPatches: [{ entityType: "gate", entityId: "vp-099-gate-06", sourceColor: "red", targetColor: "orange" }],
    blockColorPatches: [
      { blockId: "cc-099-b1-03", sourceColor: "green", targetColor: "blue" },
      { blockId: "cc-099-b1-05", sourceColor: "purple", targetColor: "blue" },
      { blockId: "cc-099-b1-10", sourceColor: "blue", targetColor: "purple" },
      { blockId: "cc-099-b1-12", sourceColor: "blue", targetColor: "purple" },
      { blockId: "cc-099-b2-01", sourceColor: "blue", targetColor: "purple" },
      { blockId: "cc-099-b4-02", sourceColor: "purple", targetColor: "blue" },
      { blockId: "cc-099-b4-04", sourceColor: "purple", targetColor: "green" },
    ],
    preserveOpeningColorCounts: false,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 30, minimum_drags: 27, clear_load: 26, reposition_overhead: 1, grid_steps: 101, turns: 22 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-r2-cluster-swaps.json", sha256: "31C0D659F583B8990A61FEB15E79EDC7A01FF7F02EFA7061380335CEA293A518" }],
  },
  {
    levelId: 100,
    sourceLevelSpecSha256: "BA935BCD87545AEDE39C5D4CA177987D34DD4238102A6E5F900EA335E995789D",
    targetLevelSpecSha256: "6F84816877AA2B924E70D3BD8EDC4F8B4BF4CB53F325D66ACA3A65EA3BEFF646",
    exitPatches: [
      { entityType: "gate", entityId: "vp-100-gate-01", sourceColor: "cyan", targetColor: "blue" },
      { entityType: "gate", entityId: "vp-100-gate-02", sourceColor: "pink", targetColor: "green" },
    ],
    blockColorPatches: [
      { blockId: "cc-100-b1-01", sourceColor: "cyan", targetColor: "blue" },
      { blockId: "cc-100-b1-02", sourceColor: "cyan", targetColor: "blue" },
      { blockId: "cc-100-b1-05", sourceColor: "cyan", targetColor: "pink" },
      { blockId: "cc-100-b1-06", sourceColor: "cyan", targetColor: "pink" },
      { blockId: "cc-100-b1-09", sourceColor: "pink", targetColor: "cyan" },
      { blockId: "cc-100-b1-10", sourceColor: "pink", targetColor: "green" },
    ],
    counterPatches: [
      { entityType: "gate", entityId: "vp-100-gate-03", field: "frozen", sourceValue: 3, targetValue: 2 },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    minimalCounterRelaxation: {
      kind: "single_frozen_counter_decrement",
      entity_id: "vp-100-gate-03",
      field: "frozen",
      source_value: 3,
      target_value: 2,
      changed_counter_count: 1,
      absolute_delta: 1,
      necessity: [
        "The opening is a fully packed 3x4 array of 2x2 blocks.",
        "The only initially usable exit is the ordinary bottom-middle gate.",
        "At frozen=3, unlocking the cyan star gate requires three consecutive same-colour clears.",
        "Those three opening blocks either form a forbidden connected same-colour component of size three or leave the third block unreachable.",
      ],
      minimality: "frozen=2 is the first one-step relaxation and changes exactly one mechanism counter by one.",
    },
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 73, minimum_drags: 15, clear_load: 12, reposition_overhead: 3, grid_steps: 54, turns: 12 },
    evidence: [
      { path: "playtest-results/experiments/unique-exit-repair/lv100-minimal-counter-repair.json", sha256: "5DD024D35286961E7043E62EAB0ED989829BD6834DC8B9EAD2669C1499F3D080" },
      { path: "playtest-results/experiments/unique-exit-repair/lv91-lv100-free-recolor-search.json", sha256: "3984292E9BEB32A6A891F616DF3B27FB635A55640AA951C1A3154344C8FD3A95" },
    ],
  },
  // Subsequent cluster-only batches: exits and every non-colour field stay fixed.
  {
    levelId: 36,
    sourceLevelSpecSha256: "28C17FE3F4262BE7F1162228349B7B8D70A03FD11A0F474F25072F7714B0D78D",
    targetLevelSpecSha256: "2CAB37E69BB39F34CF350E488571A3DB0BE5483762EF2134C6942584BD1BDE20",
    evidenceTargetSemanticSha256: "D83EF3D76405FC599C673478440B56B46F43C5F6B95CD0FD3E777E2D6615CDC3",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-036-b1-02", sourceColor: "yellow", targetColor: "pink" },
      { blockId: "cc-036-b1-06", sourceColor: "pink", targetColor: "red" },
      { blockId: "cc-036-b1-08", sourceColor: "pink", targetColor: "red" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 15, minimum_drags: 14, clear_load: 14, reposition_overhead: 0, grid_steps: 45, turns: 4 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-smoke-e.json", sha256: "81FE6BBE4AEE637FB4EC1981255D7DBFFBFB985A7BA1F5DF343B6FF75A01C6B4" }],
  },
  {
    levelId: 41,
    sourceLevelSpecSha256: "7762969902EFBD1A85D4885F7949023AF8A985F6AED4D397D9B8FE95797CE39C",
    targetLevelSpecSha256: "8A2F4F3F41E5026C49D69571DE1A1C65D5D5ACD9A32A6BB66399000D0BC8D57F",
    evidenceTargetSemanticSha256: "5666F4BA1A7BE6C407D02DF2A4A3B54BAB65EC3AE705395A4DAAB6E13A19C19A",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-041-b1-01", sourceColor: "yellow", targetColor: "orange" },
      { blockId: "cc-041-b1-02", sourceColor: "yellow", targetColor: "blue" },
      { blockId: "cc-041-b1-06", sourceColor: "yellow", targetColor: "pink" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 56, minimum_drags: 31, clear_load: 26, reposition_overhead: 5, grid_steps: 147, turns: 30 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-lv41-smoke.json", sha256: "720483B14EBCAA75CE0B22A522870B6E4DD15B942A2B6B9530873C9F249E2C27" }],
  },
  {
    levelId: 43,
    sourceLevelSpecSha256: "CA8E7689C5B9F352D48638642ACDCC0030FA67A63A381DDF0A8DB224924122B2",
    targetLevelSpecSha256: "BB2FBA8E1E661F6BFEB2697F11F34A53FC9770454651E7A9C4DC62976228127B",
    evidenceTargetSemanticSha256: "DE919E8676807C251CC26DA80FBC90CCE74C0AE7842944B08380E7B67AAA60BB",
    exitPatches: [],
    blockColorPatches: [{ blockId: "cc-043-b1-04", sourceColor: "blue", targetColor: "cyan" }],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 39, minimum_drags: 15, clear_load: 12, reposition_overhead: 3, grid_steps: 64, turns: 8 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-d.json", sha256: "844E3E39014795382D2660FEEC84D51DCD3BD11F7521D5C9E303B0E53A30567D" }],
  },
  {
    levelId: 49,
    sourceLevelSpecSha256: "8FA84ECE9F173CCC8394BF744EA791075677698B2353A13AFC3D5908EE14EC5D",
    targetLevelSpecSha256: "4842B659C248C77C25C45135F2274D3A37838128E361CD93189438C054243E25",
    evidenceTargetSemanticSha256: "943EE11A357E6F1E6B3E8559A5ED3800A40D69F7B0968342FA76E48F2C0F90EC",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-049-b1-04", sourceColor: "yellow", targetColor: "blue" },
      { blockId: "cc-049-b1-05", sourceColor: "purple", targetColor: "orange" },
      { blockId: "cc-049-b4-01", sourceColor: "red", targetColor: "orange" },
      { blockId: "cc-049-b4-04", sourceColor: "red", targetColor: "green" },
      { blockId: "cc-049-b4-05", sourceColor: "green", targetColor: "purple" },
      { blockId: "cc-049-b4-08", sourceColor: "orange", targetColor: "purple" },
      { blockId: "cc-049-b4-11", sourceColor: "green", targetColor: "blue" },
      { blockId: "cc-049-b4-15", sourceColor: "orange", targetColor: "blue" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 96, minimum_drags: 48, clear_load: 42, reposition_overhead: 6, grid_steps: 216, turns: 40 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-lv49-smoke.json", sha256: "546CD36CBCEF332398EDBA18583EA6C92394B0C83398B445E1682AB96B46D40F" }],
  },
  {
    levelId: 55,
    sourceLevelSpecSha256: "860D582DAD930B9AB326028873E2BCDDC49BB8B9B2A40106FC19DA7224ED9CC9",
    targetLevelSpecSha256: "053E1CA49BB0C3D393F9C7643B6F825D3DFE3A641C0492ECFF1ADB9601048FC3",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "strategy-guard-s1-01", sourceColor: "orange", targetColor: "cyan" },
      { blockId: "cc-piece-s1-06", sourceColor: "yellow", targetColor: "green" },
      { blockId: "cc-piece-s1-15", sourceColor: "yellow", targetColor: "red" },
      { blockId: "cc-piece-s2-01", sourceColor: "yellow", targetColor: "pink" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 289, minimum_drags: 25, clear_load: 19, reposition_overhead: 6, grid_steps: 94, turns: 13 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-lv55-r2.json", sha256: "4D8C834B1F1F062BD38A417457D0CAE2731B082525C28D82C3DB5D9D973AE16C" }],
  },
  {
    levelId: 57,
    sourceLevelSpecSha256: "0C9033190D5078CB3351DA086F13A3562AA1EB277EEE219D22AC6B22938AB4A2",
    targetLevelSpecSha256: "89C9A86C7312C123F811E1E75EE10B84F045D5620F6955FAAB7FC8D0C9926E30",
    evidenceTargetSemanticSha256: "0FE6AB557882112B313123786E98FB002374FB42AE801F67152C7857AF6F95FC",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-057-b1-04", sourceColor: "green", targetColor: "blue" },
      { blockId: "cc-057-b1-07", sourceColor: "red", targetColor: "cyan" },
      { blockId: "cc-057-b4-01", sourceColor: "pink", targetColor: "green" },
      { blockId: "cc-057-b4-04", sourceColor: "pink", targetColor: "yellow" },
      { blockId: "cc-057-b4-06", sourceColor: "pink", targetColor: "green" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 29, minimum_drags: 26, clear_load: 24, reposition_overhead: 2, grid_steps: 133, turns: 22 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-d.json", sha256: "844E3E39014795382D2660FEEC84D51DCD3BD11F7521D5C9E303B0E53A30567D" }],
  },
  {
    levelId: 62,
    sourceLevelSpecSha256: "06BB327B92B4864225C762588A0982BD11551DC5AB826B2F20A13F05360BB6AB",
    targetLevelSpecSha256: "0CB4A84A330FD7EF19EBE70030A92E3233385A0F41EECAF180301927070D56EF",
    evidenceTargetSemanticSha256: "9C152323B9849AA04F4B41305F73BBE66A47DFC66A7AE88DE274C4F04BBA79D3",
    exitPatches: [],
    blockColorPatches: [{ blockId: "cc-piece-s1-02", sourceColor: "pink", targetColor: "blue", sourceLayers: ["pink", "yellow"], targetLayers: ["blue", "yellow"] }],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 25, minimum_drags: 24, clear_load: 24, reposition_overhead: 0, grid_steps: 112, turns: 20 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-smoke-e.json", sha256: "81FE6BBE4AEE637FB4EC1981255D7DBFFBFB985A7BA1F5DF343B6FF75A01C6B4" }],
  },
  {
    levelId: 63,
    sourceLevelSpecSha256: "4036BED6ED6DFA0569D9863957FA6163BE4105B21FA20188821500DD6A19F763",
    targetLevelSpecSha256: "468891F026884B5B75711D57C8BFEDB8A9CF7EE23183F15B2B12383D3708F6C6",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-piece-08", sourceColor: "red", targetColor: "blue" },
      { blockId: "strategy-guard-13", sourceColor: "red", targetColor: "green" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 20, minimum_drags: 19, clear_load: 19, reposition_overhead: 0, grid_steps: 51, turns: 8 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-lv63-smoke.json", sha256: "FCABA05B714453FEE08802C535C990BA8EEE12C210AB1D90714CD0F0FE495596" }],
  },
  {
    levelId: 66,
    sourceLevelSpecSha256: "D2AFF1B3A9833D85E9AE32C6348B0D92B8796F10987CA3F72B11A64E13494163",
    targetLevelSpecSha256: "A6A18D8862E0D859EB50694C1E1B1C9068E0EBB5D81701ECAC9F3F3FD4819B48",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-066-b1-01", sourceColor: "red", targetColor: "cyan" },
      { blockId: "cc-066-b1-03", sourceColor: "red", targetColor: "cyan" },
      { blockId: "cc-066-b1-06", sourceColor: "orange", targetColor: "green" },
      { blockId: "cc-066-b1-07", sourceColor: "cyan", targetColor: "orange" },
      { blockId: "cc-066-b1-12", sourceColor: "green", targetColor: "cyan" },
      { blockId: "cc-066-b1-13", sourceColor: "cyan", targetColor: "green" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 28, minimum_drags: 27, clear_load: 27, reposition_overhead: 0, grid_steps: 72, turns: 10 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-visibility-correction-lv66-67-78.json", sha256: "7B96458D839329D9BB9EB29D545535B7FDC4EC41DC8D043580ABF1FA5A0DB730" }],
  },
  {
    levelId: 67,
    sourceLevelSpecSha256: "D02CE7BACCA0B2FAE47C2CE8FC562A3B3FEC59D01A98892F25B16268684E2225",
    targetLevelSpecSha256: "9AC560F9E1950C3EF04F761050EB4E8DE79B7D5949ED055A6148FB1F8F67CD95",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-067-b1-03", sourceColor: "pink", targetColor: "blue" },
      { blockId: "cc-067-b1-06", sourceColor: "green", targetColor: "pink" },
      { blockId: "cc-067-b4-01", sourceColor: "green", targetColor: "blue" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 28, minimum_drags: 22, clear_load: 21, reposition_overhead: 1, grid_steps: 69, turns: 8 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-visibility-correction-lv66-67-78.json", sha256: "7B96458D839329D9BB9EB29D545535B7FDC4EC41DC8D043580ABF1FA5A0DB730" }],
  },
  {
    levelId: 78,
    sourceLevelSpecSha256: "418B6D996D98F09F671A0240A43B17C0E49BE027DBCBBFF5F4E3DC7922167A9D",
    targetLevelSpecSha256: "E552DD30795D94C9D5A92AC16AAAA585E633748411EE07047FE2EB35090B2CBC",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-078-b1-03", sourceColor: "yellow", targetColor: "blue" },
      { blockId: "cc-078-b1-04", sourceColor: "purple", targetColor: "cyan" },
      { blockId: "cc-078-b1-05", sourceColor: "yellow", targetColor: "green" },
      { blockId: "cc-078-b2-05", sourceColor: "purple", targetColor: "blue" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 20, minimum_drags: 19, clear_load: 19, reposition_overhead: 0, grid_steps: 50, turns: 3 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-visibility-correction-lv66-67-78.json", sha256: "7B96458D839329D9BB9EB29D545535B7FDC4EC41DC8D043580ABF1FA5A0DB730" }],
  },
  {
    levelId: 80,
    sourceLevelSpecSha256: "13A6C084F93D0EEF9806C6B02E1DC9AF61C62CBEAAAB131B02014FDB0E724230",
    targetLevelSpecSha256: "B031E50D293730764DF9C7C33795962893A6840811E0BEC8F2A628A80859D780",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-piece-06", sourceColor: "green", targetColor: "blue" },
      { blockId: "cc-piece-15", sourceColor: "purple", targetColor: "blue" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 52, minimum_drags: 21, clear_load: 16, reposition_overhead: 5, grid_steps: 80, turns: 14 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-smoke-e.json", sha256: "81FE6BBE4AEE637FB4EC1981255D7DBFFBFB985A7BA1F5DF343B6FF75A01C6B4" }],
  },
  {
    levelId: 88,
    sourceLevelSpecSha256: "EF71FC56476141ED0329D933AC7402040B6EF2C3799C8C858E18CB53BA6D0CAF",
    targetLevelSpecSha256: "F185D72F69B510C6F1AA8EACC98ED12DC796A971BA247DBD9CA00C2EEC195110",
    evidenceTargetSemanticSha256: "BA8B9AC748293D9846F011FDB917C86939CB0A37E088B19990DCC3864550D840",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "strategy-guard-s1-02", sourceColor: "purple", targetColor: "blue" },
      { blockId: "cc-piece-s1-03", sourceColor: "blue", targetColor: "cyan" },
      { blockId: "strategy-guard-s1-13", sourceColor: "cyan", targetColor: "orange" },
      { blockId: "strategy-guard-s1-25", sourceColor: "orange", targetColor: "purple" },
    ],
    preserveOpeningColorCounts: true,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 547, minimum_drags: 48, clear_load: 34, reposition_overhead: 14, grid_steps: 185, turns: 31 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-lv88-smoke.json", sha256: "89716F5859BB8DE47C7FFBD850DE2B0ECED79246DF247C1DB74C537C6D774307" }],
  },
  {
    levelId: 96,
    sourceLevelSpecSha256: "CE30E1907834891ED87377D91FF8A920C0597B4DB27A0332BE1275EB2A457CA9",
    targetLevelSpecSha256: "DEB7BC5930FD6F8E5F8E1D05214C7353D8329F993D22C84ED02611B20274303C",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-piece-03", sourceColor: "blue", targetColor: "cyan" },
      { blockId: "strategy-guard-04", sourceColor: "blue", targetColor: "red" },
      { blockId: "cc-piece-05", sourceColor: "blue", targetColor: "pink" },
      { blockId: "cc-piece-09", sourceColor: "blue", targetColor: "yellow" },
      { blockId: "cc-piece-12", sourceColor: "blue", targetColor: "orange" },
      { blockId: "strategy-guard-13", sourceColor: "blue", targetColor: "yellow" },
      { blockId: "cc-piece-16", sourceColor: "blue", targetColor: "red" },
      { blockId: "cc-piece-27", sourceColor: "red", targetColor: "purple" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 319, minimum_drags: 36, clear_load: 32, reposition_overhead: 4, grid_steps: 119, turns: 9 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-lv96-smoke.json", sha256: "F05337DCA047768545C16D15A8C364B52B8065451D23620861B45F4F66FD9771" }],
  },
  {
    levelId: 98,
    sourceLevelSpecSha256: "9481FA42AA645CB75471B4CCD43BD87355A0A6138C13F36C14562C47EC9D8909",
    targetLevelSpecSha256: "FA3BA929663C1D93AF590DAD1530EC72E196B97B9163C49D26B6C99A31F05F95",
    exitPatches: [],
    blockColorPatches: [{ blockId: "cc-098-b1-03", sourceColor: "pink", targetColor: "blue", sourceLayers: ["pink", "yellow"], targetLayers: ["blue", "yellow"] }],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 23, minimum_drags: 22, clear_load: 22, reposition_overhead: 0, grid_steps: 129, turns: 18 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-only-batch-d.json", sha256: "844E3E39014795382D2660FEEC84D51DCD3BD11F7521D5C9E303B0E53A30567D" }],
  },
  {
    levelId: 40,
    sourceLevelSpecSha256: "74701BA2F3F851FDFBBCD3D89A84B85B22D428DAA1C9C267FDA3087C7BC0C264",
    targetLevelSpecSha256: "B334545EB829D7D4001DF709FE3753CFEB232A436622443091CA01AD6A37541D",
    exitPatches: [{ entityType: "gate", entityId: "vp-040-gate-03", sourceColor: "blue", targetColor: "pink" }],
    blockColorPatches: [
      { blockId: "cc-040-b1-06", sourceColor: "orange", targetColor: "pink" },
      { blockId: "cc-040-b2-02", sourceColor: "green", targetColor: "cyan" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: true,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 6_605, minimum_drags: 33, clear_load: 19, reposition_overhead: 14, grid_steps: 98, turns: 14 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/joint-color-lv40-r2.json", sha256: "9E37CF3B56BE9DA09E9975B07D81B4B17CF154FC09841C0E60A6BA0DA7658B4F" }],
  },
  {
    levelId: 27,
    sourceLevelSpecSha256: "1CB7047F57BB0B3D00204851456E4F2768AD329BEC31064D706E727704482BEB",
    targetLevelSpecSha256: "B14D06AF124CE37244F6725448FB7448DBC0C3B3146ACD7B9ADFD3152430ECC3",
    evidenceTargetSemanticSha256: "B14D06AF124CE37244F6725448FB7448DBC0C3B3146ACD7B9ADFD3152430ECC3",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-027-b1-03", sourceColor: "blue", targetColor: "cyan" },
      { blockId: "cc-027-b1-07", sourceColor: "cyan", targetColor: "blue" },
    ],
    preserveOpeningColorCounts: true,
    requireEveryExitColorInOpening: false,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 5_174, minimum_drags: 30, clear_load: 18, reposition_overhead: 12, grid_steps: 178, turns: 39 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-hard-lv27-correct-visible.json", sha256: "E80916C4221ADE07F4B103C24FAF23ADAC6A3585B564409CD99C89F17E0210FC" }],
  },
  {
    levelId: 31,
    sourceLevelSpecSha256: "08164B7A35F55F57D7F0D30F7BFACC207203D497789F9F4BD3628DF6E158CC3C",
    targetLevelSpecSha256: "C2C8DD0E74AC2E12ED650A562DC8D7A44C216E07087BBE067B5A4110DFCF0DEE",
    evidenceTargetSemanticSha256: "C2C8DD0E74AC2E12ED650A562DC8D7A44C216E07087BBE067B5A4110DFCF0DEE",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-031-b1-13", sourceColor: "orange", targetColor: "red" },
      { blockId: "cc-031-b1-17", sourceColor: "orange", targetColor: "pink" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: false,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 5_258, minimum_drags: 28, clear_load: 18, reposition_overhead: 10, grid_steps: 92, turns: 19 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-hard-lv31-correct-visible.json", sha256: "407EEB18DB3BF8D9C818895B8D53B10274529E95E695B029066EDF56FABBEBF7" }],
  },
  {
    levelId: 52,
    sourceLevelSpecSha256: "0CDD6D2FF2EDE46818746897F68BA4FEB8604ECC68D8BBAFDC474D16D0B5877D",
    targetLevelSpecSha256: "CB12C8A6EC508ED23FA70ADA371EE2CF201804E918D78C5D7762A538394D4D0F",
    evidenceTargetSemanticSha256: "CB12C8A6EC508ED23FA70ADA371EE2CF201804E918D78C5D7762A538394D4D0F",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-052-b1-01", sourceColor: "red", targetColor: "blue" },
      { blockId: "cc-052-b1-03", sourceColor: "red", targetColor: "blue" },
      { blockId: "cc-052-b1-04", sourceColor: "yellow", targetColor: "red" },
      { blockId: "cc-052-b1-16", sourceColor: "pink", targetColor: "blue" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: false,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 4_045, minimum_drags: 35, clear_load: 19, reposition_overhead: 16, grid_steps: 106, turns: 13 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-hard-lv52-color-only.json", sha256: "4CCDB05A4B44B8F295A8CD975FE545A52D179B586F07E3B335D526EDA3FFA183" }],
  },
  {
    levelId: 61,
    sourceLevelSpecSha256: "3FC353417DE363ED486F0488341D5B2D57357B27C4AF1715D105FE80DED8F0E8",
    targetLevelSpecSha256: "6579EE6A03B4A90B9855C015A226668E3E4B890617904FA3C364ADE4188BADE6",
    evidenceTargetSemanticSha256: "6579EE6A03B4A90B9855C015A226668E3E4B890617904FA3C364ADE4188BADE6",
    exitPatches: [],
    blockColorPatches: [
      { blockId: "cc-piece-s1-09", sourceColor: "green", targetColor: "blue" },
      { blockId: "cc-piece-s1-11", sourceColor: "green", targetColor: "cyan" },
    ],
    preserveOpeningColorCounts: false,
    requireEveryExitColorInOpening: false,
    solverAndReplay: { max_states: 20_000, termination: "solved", explored_states: 51, minimum_drags: 21, clear_load: 19, reposition_overhead: 2, grid_steps: 43, turns: 5 },
    evidence: [{ path: "playtest-results/experiments/unique-exit-repair/cluster-hard-lv61-correct-visible.json", sha256: "C3EF298685C33E3B5B2D18E2DDBC29B6D5BC53DB45CB2D4447CA4BF97AE64F52" }],
  },
  ...clusterSwapBatchHRuntimeRepairs,
  ...clusterSwapBatchIRuntimeRepairs,
];

const openingSameColorClusterViolations = (level) => {
  const closedShutterIds = new Set((level.shutters ?? [])
    .filter((shutter) => shutter.count > 0)
    .map((shutter) => shutter.id));
  const hiddenBlockIds = new Set([
    ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
    ...level.blocks
      .filter((block) => block.shutterId && closedShutterIds.has(block.shutterId))
      .map((block) => block.id),
  ]);
  const blocks = level.blocks.filter((block) => !hiddenBlockIds.has(block.id));
  const cellsById = new Map(blocks.map((block) => [
    block.id,
    new Set(block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)),
  ]));
  const visibleColor = (block) => block.layers?.[0] ?? block.color;
  const contacts = new Map(blocks.map((block) => [block.id, new Set()]));
  for (let index = 0; index < blocks.length; index += 1) {
    const left = blocks[index];
    for (let otherIndex = index + 1; otherIndex < blocks.length; otherIndex += 1) {
      const right = blocks[otherIndex];
      if (visibleColor(left) !== visibleColor(right)) continue;
      const rightCells = cellsById.get(right.id);
      const touches = [...cellsById.get(left.id)].some((key) => {
        const [x, y] = key.split(",").map(Number);
        return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
          .some(([nextX, nextY]) => rightCells.has(`${nextX},${nextY}`));
      });
      if (!touches) continue;
      contacts.get(left.id).add(right.id);
      contacts.get(right.id).add(left.id);
    }
  }
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const unseen = new Set(blocks.map((block) => block.id));
  const violations = [];
  while (unseen.size) {
    const first = unseen.values().next().value;
    unseen.delete(first);
    const queue = [first];
    const blockIds = [];
    while (queue.length) {
      const id = queue.shift();
      blockIds.push(id);
      for (const next of contacts.get(id)) if (unseen.delete(next)) queue.push(next);
    }
    if (blockIds.length >= 3) violations.push({
      color: visibleColor(byId.get(first)),
      blockIds: blockIds.sort(),
    });
  }
  return violations;
};

const applySolverVerifiedRuntimeRepair = (level, repair) => {
  if (!level) throw new Error(`Missing repaired source Lv${repair.levelId}`);
  if (level.id !== repair.levelId) return null;
  const gate = level.gates.find((candidate) => candidate.id === repair.gateId);
  if (!gate) throw new Error(`Lv${level.id}: missing repaired gate ${repair.gateId}`);
  if (gate.frozen !== repair.sourceFrozen) {
    throw new Error(
      `Lv${level.id}/${gate.id}: expected source frozen=${repair.sourceFrozen}, got ${String(gate.frozen)}`,
    );
  }
  gate.frozen = repair.targetFrozen;
  const recolorWholeBlock = ({ blockId, sourceColor, targetColor }) => {
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    if (!block) throw new Error(`Lv${level.id}: missing recoloured block ${blockId}`);
    const authoredColors = block.layers?.length ? block.layers : [block.color];
    if (block.color !== sourceColor || authoredColors.some((color) => color !== sourceColor)) {
      throw new Error(
        `Lv${level.id}/${block.id}: expected an all-${sourceColor} source colour contract`,
      );
    }
    block.color = targetColor;
    if (block.layers?.length) block.layers = block.layers.map(() => targetColor);
  };
  if (repair.uniqueExitColorRepair) {
    const colorRepair = repair.uniqueExitColorRepair;
    const colorGate = level.gates.find((candidate) => candidate.id === colorRepair.gateId)
      ?? (level.flipDoors ?? []).find((candidate) => candidate.id === colorRepair.gateId);
    if (!colorGate) throw new Error(`Lv${level.id}: missing recoloured exit ${colorRepair.gateId}`);
    if (colorGate.color !== colorRepair.sourceColor) {
      throw new Error(
        `Lv${level.id}/${colorGate.id}: expected source color=${colorRepair.sourceColor}, got ${colorGate.color}`,
      );
    }
    colorGate.color = colorRepair.targetColor;
    for (const blockId of colorRepair.blockIds) {
      recolorWholeBlock({
        blockId,
        sourceColor: colorRepair.sourceColor,
        targetColor: colorRepair.targetColor,
      });
    }
    const exitColors = [...level.gates, ...(level.flipDoors ?? [])].map((candidate) => candidate.color);
    if (new Set(exitColors).size !== exitColors.length) {
      throw new Error(`Lv${level.id}: repaired gate+flipDoor colours are not unique`);
    }
  }
  for (const colorRepair of repair.openingClusterColorRepairs ?? []) recolorWholeBlock(colorRepair);
  return { ...repair };
};

const isAbsentFieldContract = (value) => (
  Boolean(value)
  && typeof value === "object"
  && value.__absent__ === true
  && Object.keys(value).length === 1
);

const exactRepairEntity = (level, patch) => {
  const collection = patch.entityType === "gate"
    ? level.gates
    : patch.entityType === "flipDoor"
      ? (level.flipDoors ?? [])
      : patch.entityType === "block"
        ? level.blocks
        : null;
  if (!collection) throw new Error(`Lv${level.id}: unsupported repair entity ${patch.entityType}`);
  const entity = collection.find((candidate) => candidate.id === patch.entityId);
  if (!entity) throw new Error(`Lv${level.id}: missing ${patch.entityType} ${patch.entityId}`);
  return entity;
};

const assertExactRepairSourceFields = (level, patch, entity) => {
  for (const [field, expected] of Object.entries(patch.source)) {
    if (isAbsentFieldContract(expected)) {
      if (Object.hasOwn(entity, field)) {
        throw new Error(`Lv${level.id}/${patch.entityId}.${field}: expected source field to be absent`);
      }
      continue;
    }
    if (!Object.hasOwn(entity, field) || !sameJson(entity[field], expected)) {
      throw new Error(
        `Lv${level.id}/${patch.entityId}.${field}: expected source=${JSON.stringify(expected)}, got ${JSON.stringify(entity[field])}`,
      );
    }
  }
};

const applyExactDeadlockRuntimeRepair = (level, repair) => {
  if (!level) throw new Error(`Missing exact-deadlock source Lv${repair.levelId}`);
  for (const patch of repair.patches) {
    const entity = exactRepairEntity(level, patch);
    assertExactRepairSourceFields(level, patch, entity);
    for (const [field, target] of Object.entries(patch.target)) {
      if (isAbsentFieldContract(target)) delete entity[field];
      else entity[field] = clone(target);
    }
  }
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  const exitColorsUnique = new Set(exits.map((exit) => exit.color)).size === exits.length;
  if (!exitColorsUnique) throw new Error(`Lv${level.id}: exact-deadlock repair left duplicate exit colours`);
  const clusterViolations = openingSameColorClusterViolations(level);
  if (clusterViolations.length) {
    throw new Error(`Lv${level.id}: exact-deadlock repair left opening clusters ${JSON.stringify(clusterViolations)}`);
  }
  return {
    level_id: level.id,
    source_level_spec_sha256: repair.sourceLevelSpecSha256,
    target_level_spec_sha256: repair.targetLevelSpecSha256,
    source_field_assertions_passed: true,
    patches: clone(repair.patches),
    evidence: clone(repair.evidence),
    evidence_record: clone(repair.evidenceRecord ?? null),
    solver_and_replay: clone(repair.solverAndReplay),
    exit_colors_unique: true,
    opening_same_color_component_maximum: 2,
  };
};

const openingVisibleBlocks = (level) => {
  const closedShutterIds = new Set((level.shutters ?? [])
    .filter((shutter) => shutter.count > 0)
    .map((shutter) => shutter.id));
  const hiddenBlockIds = new Set([
    ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
    ...level.blocks
      .filter((block) => block.shutterId && closedShutterIds.has(block.shutterId))
      .map((block) => block.id),
  ]);
  return level.blocks.filter((block) => !hiddenBlockIds.has(block.id));
};

const openingVisibleColorCounts = (level) => {
  const counts = {};
  for (const block of openingVisibleBlocks(level)) {
    const color = block.layers?.[0] ?? block.color;
    counts[color] = (counts[color] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
};

const normalizeDeclaredAutoRecolorFields = (level, repair) => {
  const normalized = clone(level);
  for (const patch of repair.exitPatches) {
    const collection = patch.entityType === "flipDoor" ? (normalized.flipDoors ?? []) : normalized.gates;
    const exit = collection.find((candidate) => candidate.id === patch.entityId);
    if (!exit) throw new Error(`Lv${level.id}: missing normalized ${patch.entityType} ${patch.entityId}`);
    exit.color = "__declared_auto_recolor_exit__";
  }
  for (const patch of repair.blockColorPatches) {
    const block = normalized.blocks.find((candidate) => candidate.id === patch.blockId);
    if (!block) throw new Error(`Lv${level.id}: missing normalized block ${patch.blockId}`);
    block.color = "__declared_auto_recolor_block__";
    if (block.layers?.length) block.layers[0] = "__declared_auto_recolor_block__";
  }
  for (const patch of repair.counterPatches ?? []) {
    const collection = patch.entityType === "flipDoor" ? (normalized.flipDoors ?? []) : normalized.gates;
    const entity = collection.find((candidate) => candidate.id === patch.entityId);
    if (!entity) throw new Error(`Lv${level.id}: missing normalized ${patch.entityType} ${patch.entityId}`);
    entity[patch.field] = "__declared_auto_recolor_counter__";
  }
  return normalized;
};

const applyAutoRecolorRuntimeRepair = (level, repair) => {
  if (!level) throw new Error(`Missing auto-recolour source Lv${repair.levelId}`);
  const semanticSha256 = (value) => sha256(JSON.stringify(
    repair.canonicalLevelSpecSha256 ? canonical(value) : value,
  ));
  const sourceLevelSpecSha256 = semanticSha256(level);
  if (sourceLevelSpecSha256 !== repair.sourceLevelSpecSha256) {
    throw new Error(
      `Lv${level.id}: auto-recolour source-record drift; expected ${repair.sourceLevelSpecSha256}, got ${sourceLevelSpecSha256}`,
    );
  }
  const sourceSnapshot = clone(level);
  const sourceOpeningColorCounts = openingVisibleColorCounts(level);

  // Atomic phase 1: exit colours.
  for (const patch of repair.exitPatches) {
    const collection = patch.entityType === "flipDoor" ? (level.flipDoors ?? []) : level.gates;
    const exit = collection.find((candidate) => candidate.id === patch.entityId);
    if (!exit) throw new Error(`Lv${level.id}: missing ${patch.entityType} ${patch.entityId}`);
    if (exit.color !== patch.sourceColor) {
      throw new Error(`Lv${level.id}/${exit.id}: expected source color=${patch.sourceColor}, got ${exit.color}`);
    }
    exit.color = patch.targetColor;
  }

  // Atomic phase 2: opening block colour exchanges/cycles.
  for (const patch of repair.blockColorPatches) {
    const block = level.blocks.find((candidate) => candidate.id === patch.blockId);
    if (!block) throw new Error(`Lv${level.id}: missing block ${patch.blockId}`);
    const authoredColors = block.layers?.length ? block.layers : [block.color];
    const expectedSourceLayers = patch.sourceLayers ?? [patch.sourceColor];
    if (block.color !== patch.sourceColor || !sameJson(authoredColors, expectedSourceLayers)) {
      throw new Error(
        `Lv${level.id}/${block.id}: expected source colour contract ${JSON.stringify(expectedSourceLayers)}, got ${JSON.stringify(authoredColors)}`,
      );
    }
    block.color = patch.targetColor;
    if (block.layers?.length) block.layers[0] = patch.targetColor;
    const expectedTargetLayers = patch.targetLayers ?? [patch.targetColor];
    if (!sameJson(block.layers?.length ? block.layers : [block.color], expectedTargetLayers)) {
      throw new Error(
        `Lv${level.id}/${block.id}: target colour contract ${JSON.stringify(expectedTargetLayers)} was not produced`,
      );
    }
  }

  // Atomic phase 3: an explicitly evidenced mechanism-counter relaxation.
  // Lv100 is the sole current user: its frozen 3 -> 2 change is the minimum
  // one-counter adjustment compatible with both solvability and cluster <= 2.
  for (const patch of repair.counterPatches ?? []) {
    const collection = patch.entityType === "flipDoor" ? (level.flipDoors ?? []) : level.gates;
    const entity = collection.find((candidate) => candidate.id === patch.entityId);
    if (!entity) throw new Error(`Lv${level.id}: missing ${patch.entityType} ${patch.entityId}`);
    if (entity[patch.field] !== patch.sourceValue) {
      throw new Error(
        `Lv${level.id}/${entity.id}.${patch.field}: expected source=${patch.sourceValue}, got ${String(entity[patch.field])}`,
      );
    }
    entity[patch.field] = patch.targetValue;
  }

  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  if (new Set(exits.map((exit) => exit.color)).size !== exits.length) {
    throw new Error(`Lv${level.id}: auto-recolour repair left duplicate exit colours`);
  }
  const clusterViolations = openingSameColorClusterViolations(level);
  if (clusterViolations.length) {
    throw new Error(`Lv${level.id}: auto-recolour repair left opening clusters ${JSON.stringify(clusterViolations)}`);
  }
  const targetOpeningColorCounts = openingVisibleColorCounts(level);
  const openingColorCountsPreserved = sameJson(sourceOpeningColorCounts, targetOpeningColorCounts);
  if (repair.preserveOpeningColorCounts === true && !openingColorCountsPreserved) {
    throw new Error(
      `Lv${level.id}: block colour-count preservation failed; before=${JSON.stringify(sourceOpeningColorCounts)} after=${JSON.stringify(targetOpeningColorCounts)}`,
    );
  }
  for (const block of level.blocks.filter((candidate) => (candidate.layers?.length ?? 0) > 1)) {
    if (block.layers[0] === block.layers[1]) {
      throw new Error(`Lv${level.id}/${block.id}: repaired outer and inner shell colours must differ`);
    }
  }
  if (!sameJson(
    normalizeDeclaredAutoRecolorFields(sourceSnapshot, repair),
    normalizeDeclaredAutoRecolorFields(level, repair),
  )) {
    throw new Error(`Lv${level.id}: undeclared field changed during auto-recolour repair`);
  }
  const targetLevelSpecSha256 = semanticSha256(level);
  if (repair.targetLevelSpecSha256 && targetLevelSpecSha256 !== repair.targetLevelSpecSha256) {
    throw new Error(
      `Lv${level.id}: auto-recolour target-record drift; expected ${repair.targetLevelSpecSha256}, got ${targetLevelSpecSha256}`,
    );
  }

  return {
    level_id: repair.levelId,
    authored_source_level_id: level.id,
    source_level_spec_sha256: sourceLevelSpecSha256,
    target_level_spec_sha256: targetLevelSpecSha256,
    campaign_source_level_spec_sha256: repair.campaignSourceLevelSpecSha256 ?? null,
    campaign_target_level_spec_sha256: repair.campaignTargetLevelSpecSha256 ?? null,
    source_record_preflight_passed: true,
    level_spec_sha256_normalization: repair.canonicalLevelSpecSha256 ? "canonical-json" : "insertion-order-json",
    target_record_sha256_verified: Boolean(repair.targetLevelSpecSha256),
    evidence_target_semantic_sha256: repair.evidenceTargetSemanticSha256 ?? null,
    evidence_target_semantic_sha256_verified: repair.evidenceTargetSemanticSha256
      ? repair.evidenceTargetSemanticVerified === true
      : null,
    atomic_application_order: [
      "exit_colours",
      "opening_block_colour_swaps_or_cycles",
      ...((repair.counterPatches?.length ?? 0) ? ["minimum_mechanism_counter_relaxation"] : []),
    ],
    exit_patches: clone(repair.exitPatches),
    block_color_patches: clone(repair.blockColorPatches),
    counter_patches: clone(repair.counterPatches ?? []),
    minimal_counter_relaxation: clone(repair.minimalCounterRelaxation ?? null),
    evidence: clone(repair.evidence),
    evidence_record: clone(repair.evidenceRecord ?? null),
    solver_and_replay: clone(repair.solverAndReplay),
    exit_colors_unique: true,
    opening_same_color_component_maximum: 2,
    opening_visible_color_counts_before: sourceOpeningColorCounts,
    opening_visible_color_counts_after: targetOpeningColorCounts,
    opening_visible_color_counts_preserved: openingColorCountsPreserved,
    every_exit_color_represented_in_opening: null,
    multilayer_outer_inner_colors_differ: true,
    declared_only_mutation_check_passed: true,
    preserved_fields: [
      "board dimensions and playable mask",
      "block count, ids, shapes, positions, star flags, non-active inner layers, and non-colour mechanism values",
      "gate/flipDoor count, geometry, star flags, and all mechanism values except declared counter patches",
      "timer and all non-colour level metadata",
    ],
  };
};

const exitMechanismCounts = (level) => {
  const gates = level.gates ?? [];
  const flipDoors = level.flipDoors ?? [];
  const exits = [...gates, ...flipDoors];
  return {
    exits: exits.length,
    gates: gates.length,
    flip_doors: flipDoors.length,
    frozen_exits: exits.filter((exit) => Object.hasOwn(exit, "frozen")).length,
    star_exits: exits.filter((exit) => Boolean(exit.star)).length,
    initially_open_flip_doors: flipDoors.filter((door) => Boolean(door.initiallyOpen)).length,
    aperture_cells: exits.reduce((sum, exit) => sum + Number(exit.size), 0),
  };
};

const mechanismCountDelta = (before, after) => Object.fromEntries(
  Object.keys(before).map((key) => [key, after[key] - before[key]]),
);

const assertEvidenceFields = (levelId, entity, expected, label) => {
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (field === "kind") continue;
    if (!sameJson(entity?.[field], expectedValue)) {
      throw new Error(
        `Lv${levelId}/${label}.${field}: evidence expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(entity?.[field])}`,
      );
    }
  }
};

const applyHighExitReductionRepair = (level, candidate, campaignSemanticProjection) => {
  if (!level) throw new Error(`Missing high-exit source Lv${candidate.level_id}`);
  if (candidate.status !== "solved_replay_verified") {
    throw new Error(`Lv${level.id}: selected high-exit candidate is not solver/replay verified`);
  }

  const rawSourceLevelSpecSha256 = sha256(JSON.stringify(level));
  const campaignSourceLevelSpecSha256 = sha256(JSON.stringify(campaignSemanticProjection(level)));
  if (campaignSourceLevelSpecSha256 !== candidate.formal_source_sha256) {
    throw new Error(
      `Lv${level.id}: high-exit source-record drift; expected ${candidate.formal_source_sha256}, got ${campaignSourceLevelSpecSha256}`,
    );
  }
  const beforeCounts = exitMechanismCounts(level);
  const collectionFor = (kind) => {
    if (kind === "gate") return level.gates;
    if (kind === "flipDoor") return level.flipDoors ?? (level.flipDoors = []);
    throw new Error(`Lv${level.id}: unsupported high-exit entity kind ${kind}`);
  };
  const replaceCollection = (kind, collection) => {
    if (kind === "gate") level.gates = collection;
    else if (kind === "flipDoor") level.flipDoors = collection;
    else throw new Error(`Lv${level.id}: unsupported high-exit entity kind ${kind}`);
  };

  // Phase 1: evidence-declared contiguous merges. Every source segment is
  // checked before the retained record is resized and redundant records are
  // removed. No inferred geometry is accepted here.
  for (const merge of candidate.operation.merges ?? []) {
    const collection = collectionFor(merge.kind);
    if (!sameJson(merge.member_ids, merge.original_segments.map((segment) => segment.id))) {
      throw new Error(`Lv${level.id}: merge member/source ordering drift for ${merge.kept_id}`);
    }
    const expectedRemoved = merge.member_ids.filter((id) => id !== merge.kept_id);
    if (!sameJson(merge.removed_ids, expectedRemoved)) {
      throw new Error(`Lv${level.id}: merge removal set drift for ${merge.kept_id}`);
    }
    for (const segment of merge.original_segments) {
      const entity = collection.find((exit) => exit.id === segment.id);
      if (!entity) throw new Error(`Lv${level.id}: missing merge source ${segment.id}`);
      assertEvidenceFields(level.id, entity, segment, segment.id);
      if (entity.side !== merge.side) {
        throw new Error(`Lv${level.id}/${entity.id}: expected merge side ${merge.side}, got ${entity.side}`);
      }
    }
    const kept = collection.find((exit) => exit.id === merge.kept_id);
    if (!kept) throw new Error(`Lv${level.id}: missing retained merge exit ${merge.kept_id}`);
    if (merge.target.id !== merge.kept_id) {
      throw new Error(`Lv${level.id}: merge target id drift for ${merge.kept_id}`);
    }
    for (const [field, value] of Object.entries(merge.target)) {
      if (field !== "id") kept[field] = clone(value);
    }
    replaceCollection(merge.kind, collection.filter((exit) => !merge.removed_ids.includes(exit.id)));
  }

  // Phase 2: evidence-declared removals not consumed by a merge.
  for (const removal of candidate.operation.removals ?? []) {
    const collection = collectionFor(removal.kind);
    const entity = collection.find((exit) => exit.id === removal.id);
    if (!entity) throw new Error(`Lv${level.id}: missing removal source ${removal.id}`);
    assertEvidenceFields(level.id, entity, removal.source, removal.id);
    replaceCollection(removal.kind, collection.filter((exit) => exit.id !== removal.id));
  }

  // Phase 3: apply the complete machine-readable exit/block colour record.
  // Unchanged rows are also asserted so additions, reordering or stale source
  // values cannot silently pass through the formal materializer.
  const combinedExits = [
    ...level.gates.map((exit) => ({ kind: "gate", exit })),
    ...(level.flipDoors ?? []).map((exit) => ({ kind: "flipDoor", exit })),
  ];
  for (const edit of candidate.recolor.machine_edits.exits) {
    const indexed = combinedExits[edit.index];
    if (!indexed || indexed.kind !== edit.kind || indexed.exit.id !== edit.id) {
      throw new Error(`Lv${level.id}: exit machine-edit index drift at ${edit.index}/${edit.id}`);
    }
    if (indexed.exit.color !== edit.original_color) {
      throw new Error(
        `Lv${level.id}/${edit.id}: expected source color=${edit.original_color}, got ${indexed.exit.color}`,
      );
    }
    indexed.exit.color = edit.target_color;
  }
  if (candidate.recolor.machine_edits.blocks.length !== level.blocks.length) {
    throw new Error(`Lv${level.id}: block machine-edit coverage is incomplete`);
  }
  for (const edit of candidate.recolor.machine_edits.blocks) {
    const block = level.blocks.find((entry) => entry.id === edit.id);
    if (!block) throw new Error(`Lv${level.id}: missing block machine edit ${edit.id}`);
    const sourceLayers = block.layers?.length ? [...block.layers] : [block.color];
    if (block.color !== edit.original.color_field || !sameJson(sourceLayers, edit.original.layers)) {
      throw new Error(
        `Lv${level.id}/${block.id}: block source colour contract drift; expected ${JSON.stringify(edit.original)}, got ${JSON.stringify({ color_field: block.color, layers: sourceLayers })}`,
      );
    }
    const sourceOuter = sourceLayers[0];
    const sourceBody = sourceLayers[sourceLayers.length - 1];
    if (sourceOuter !== edit.original.outer_color || sourceBody !== edit.original.body_color) {
      throw new Error(`Lv${level.id}/${block.id}: block source outer/body colour drift`);
    }
    block.color = edit.target.color_field;
    if (edit.target.layers_field === null) delete block.layers;
    else block.layers = clone(edit.target.layers_field);
    const targetLayers = block.layers?.length ? [...block.layers] : [block.color];
    if (!sameJson(targetLayers, edit.target.layers)
      || targetLayers[0] !== edit.target.outer_color
      || targetLayers[targetLayers.length - 1] !== edit.target.body_color
      || block.color !== edit.target.color_field) {
      throw new Error(`Lv${level.id}/${block.id}: block target colour contract was not produced`);
    }
  }

  const afterCounts = exitMechanismCounts(level);
  const actualDelta = mechanismCountDelta(beforeCounts, afterCounts);
  if (!sameJson(actualDelta, candidate.mechanism_count_delta)) {
    throw new Error(
      `Lv${level.id}: mechanism-count delta drift; expected ${JSON.stringify(candidate.mechanism_count_delta)}, got ${JSON.stringify(actualDelta)}`,
    );
  }
  const minimumRequiredReduction = beforeCounts.exits - 8;
  if (beforeCounts.exits <= 8 || afterCounts.exits !== 8 || actualDelta.exits !== -minimumRequiredReduction) {
    throw new Error(`Lv${level.id}: candidate is not the minimum exit-count reduction required by the eight-colour unique limit`);
  }
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  if (new Set(exits.map((exit) => exit.color)).size !== 8) {
    throw new Error(`Lv${level.id}: high-exit repair did not produce eight unique exit colours`);
  }
  const clusterViolations = openingSameColorClusterViolations(level);
  if (clusterViolations.length) {
    throw new Error(`Lv${level.id}: high-exit repair left opening clusters ${JSON.stringify(clusterViolations)}`);
  }
  const campaignTargetLevelSpecSha256 = sha256(JSON.stringify(campaignSemanticProjection(level)));
  if (campaignTargetLevelSpecSha256 !== candidate.final_candidate_sha256) {
    throw new Error(
      `Lv${level.id}: high-exit target-record drift; expected ${candidate.final_candidate_sha256}, got ${campaignTargetLevelSpecSha256}`,
    );
  }
  const rawTargetLevelSpecSha256 = sha256(JSON.stringify(level));

  return {
    level_id: level.id,
    repair_type: "minimum_exit_count_reduction_exception_for_eight_unique_colors",
    rationale: "The runtime supports eight colours and requires every gate+flipDoor colour to be unique; a source level with more than eight exit records therefore needs the mathematically minimum reduction to exactly eight exits.",
    source_level_spec_sha256: candidate.formal_source_sha256,
    target_level_spec_sha256: candidate.final_candidate_sha256,
    evidence: clone(level.id === 73 ? highExitReductionBatch02Evidence : highExitReductionEvidence),
    raw_generated_source_level_spec_sha256: rawSourceLevelSpecSha256,
    raw_generated_target_level_spec_sha256: rawTargetLevelSpecSha256,
    campaign_projection_applied: rawSourceLevelSpecSha256 !== campaignSourceLevelSpecSha256,
    source_field_assertions_passed: true,
    target_record_sha256_verified: true,
    operation: clone(candidate.operation),
    recolor: {
      total: candidate.recolor.total,
      block_layers: candidate.recolor.block_layers,
      exits: candidate.recolor.exits,
      palette: clone(candidate.recolor.palette),
      layer_changes: clone(candidate.recolor.layer_changes),
      exit_changes: clone(candidate.recolor.exit_changes),
      machine_edits_verified: true,
    },
    mechanism_counts_before: beforeCounts,
    mechanism_counts_after: afterCounts,
    mechanism_count_delta: actualDelta,
    minimum_exit_record_reduction: minimumRequiredReduction,
    minimum_exit_record_reduction_verified: true,
    exit_count: exits.length,
    unique_exit_color_count: new Set(exits.map((exit) => exit.color)).size,
    opening_same_color_component_maximum: 2,
    opening_visibility_semantics: "exclude generator queues and blocks assigned to a positive-count shutter; triggerBlockIds remain opening-visible",
    constraint_evidence: clone(candidate.constraint_evidence),
    solver_and_replay: {
      solver_kind: candidate.solution.solver_kind,
      stage: candidate.solution.stage,
      order_variant: candidate.solution.order_variant,
      explored_states: candidate.solution.explored_states,
      minimum_drags: candidate.solution.drags,
      clear_load: candidate.solution.clear_load,
      reposition_overhead: candidate.solution.reposition_overhead,
      grid_steps: candidate.solution.grid_steps,
      turns: candidate.solution.turns,
      puzzle_model_replay: clone(candidate.solution.PuzzleModel_replay),
      replay_target: candidate.solution.replay_target,
    },
    preserved_competitor_structure: [
      "board dimensions and playable mask",
      "block count, ids, shapes, positions, stages, and non-colour mechanism values",
      "timer and non-exit level metadata",
      "all surviving frozen/star/flipDoor values; only evidence-declared redundant exit records are merged or removed",
    ],
    declared_only_mutation_check_passed: true,
  };
};

const bundle = await build({
  entryPoints: [inputPath],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const sourceModule = await import(moduleUrl);
const levels = clone(sourceModule.VIDEO_PARITY_LEVELS);
const generatorRimGeometryText = await readFile(generatorRimGeometryPath, "utf8");
const generatorRimGeometryBundle = await build({
  entryPoints: [generatorRimGeometryPath],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const generatorRimGeometryUrl = `data:text/javascript;base64,${Buffer.from(generatorRimGeometryBundle.outputFiles[0].text).toString("base64")}`;
const { getVideoParityGeneratorRimGeometry } = await import(generatorRimGeometryUrl);
const campaignSemanticProjection = (sourceLevel) => {
  const level = clone(sourceLevel);
  if (!level.generators?.length) return level;
  level.generators = level.generators.map((generator) => {
    const geometry = getVideoParityGeneratorRimGeometry(level.id, generator.id);
    if (!geometry) return generator;
    return {
      ...generator,
      side: geometry.side,
      offset: geometry.offset,
      rimSpan: geometry.rimSpan,
      rimMount: geometry.rimMount,
      ...(geometry.anchor ? { rimAnchor: { ...geometry.anchor } } : {}),
    };
  });
  return level;
};
const solverVerifiedRuntimeRepairs = SOLVER_VERIFIED_RUNTIME_REPAIRS
  .map((repair) => applySolverVerifiedRuntimeRepair(
    levels.find((candidate) => candidate.id === repair.levelId),
    repair,
  ))
  .filter(Boolean);
const inputText = await readFile(inputPath, "utf8");
const contractText = await readFile(contractPath, "utf8");
const contract = JSON.parse(contractText);
const contractById = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")),
  entry.our_design_target,
]));

const playableOf = (level) => level.playable?.length
  ? level.playable
  : Array.from({ length: level.height }, (_, y) => Array.from(
    { length: level.width },
    (_, x) => [x, y],
  )).flat().filter(([x, y]) => !(level.blocked ?? []).some(([bx, by]) => bx === x && by === y));

const physicalShutterCells = (level) => new Set((level.shutters ?? []).flatMap((shutter) => {
  if (shutter.count <= 0 || shutter.skin === "staging" || shutter.skin === "lift" || shutter.skin === "staged-frame") return [];
  return Array.from({ length: shutter.height }, (_, dy) => Array.from(
    { length: shutter.width },
    (_, dx) => keyOf(shutter.x + dx, shutter.y + dy),
  )).flat();
}));

const placementsFor = (level, allowedKeys, shapeId) => {
  const placements = [];
  const seen = new Set();
  for (const shape of SHAPE_VARIANTS[shapeId]) {
    const normalized = normalizeShape(shape);
    const shapeKey = signature(normalized);
    if (seen.has(shapeKey)) continue;
    seen.add(shapeKey);
    const width = Math.max(...normalized.map(([x]) => x)) + 1;
    const height = Math.max(...normalized.map(([, y]) => y)) + 1;
    for (let y = 0; y <= level.height - height; y += 1) {
      for (let x = 0; x <= level.width - width; x += 1) {
        const cells = normalized.map(([dx, dy]) => [x + dx, y + dy]);
        if (!cells.every(([cx, cy]) => allowedKeys.has(keyOf(cx, cy)))) continue;
        placements.push({ x, y, shape: normalized, cells });
      }
    }
  }
  return placements;
};

const prepareBoard = (level) => {
  const forbidden = physicalShutterCells(level);
  const allowed = playableOf(level).filter(([x, y]) => !forbidden.has(keyOf(x, y)));
  const allowedKeys = new Set(allowed.map(([x, y]) => keyOf(x, y)));
  const indexByKey = new Map(allowed.map(([x, y], index) => [keyOf(x, y), index]));
  return { allowed, allowedKeys, indexByKey };
};

const withMask = (placements, indexByKey) => placements.map((placement) => ({
  ...placement,
  mask: placement.cells.reduce((mask, [x, y]) => mask | (1n << BigInt(indexByKey.get(keyOf(x, y)))), 0n),
}));

const distanceToBlock = (placement, block) => (
  Math.abs(placement.x - block.x) + Math.abs(placement.y - block.y)
  + (signature(placement.shape) === signature(block.shape) ? 0 : 2)
);

const assignTypePlacements = (blocks, placements) => {
  const remaining = [...placements];
  for (const block of [...blocks].sort((left, right) => left.id.localeCompare(right.id))) {
    remaining.sort((left, right) => distanceToBlock(left, block) - distanceToBlock(right, block)
      || left.y - right.y || left.x - right.x);
    const selected = remaining.shift();
    block.x = selected.x;
    block.y = selected.y;
    block.shape = clone(selected.shape);
  }
};

const packExactCohort = (level, blocks, board) => {
  const counts = new Map();
  for (const block of blocks) {
    const shapeId = shapeIdOf(block.shape);
    counts.set(shapeId, (counts.get(shapeId) ?? 0) + 1);
  }
  const types = [...counts.keys()].sort((left, right) => (
    SHAPE_VARIANTS[right][0].length - SHAPE_VARIANTS[left][0].length
      || left.localeCompare(right)
  ));
  const placementsByType = new Map(types.map((shapeId) => [
    shapeId,
    withMask(placementsFor(level, board.allowedKeys, shapeId), board.indexByKey),
  ]));
  const placementsByCell = Array.from({ length: board.allowed.length }, () => []);
  for (const shapeId of types) {
    for (const placement of placementsByType.get(shapeId)) {
      for (const [x, y] of placement.cells) {
        placementsByCell[board.indexByKey.get(keyOf(x, y))].push({ shapeId, placement });
      }
    }
  }
  const fullMask = (1n << BigInt(board.allowed.length)) - 1n;
  const memo = new Set();
  let explored = 0;
  const selected = [];
  const remainingCount = () => types.reduce((sum, shapeId) => sum + counts.get(shapeId), 0);
  const recurse = (occupied) => {
    explored += 1;
    if (remainingCount() === 0) return occupied === fullMask;
    const stateKey = `${occupied.toString(36)}|${types.map((shapeId) => counts.get(shapeId)).join(",")}`;
    if (memo.has(stateKey)) return false;
    let bestCell = -1;
    let bestOptions = null;
    for (let index = 0; index < board.allowed.length; index += 1) {
      if ((occupied & (1n << BigInt(index))) !== 0n) continue;
      const options = placementsByCell[index].filter(({ shapeId, placement }) => (
        counts.get(shapeId) > 0 && (occupied & placement.mask) === 0n
      ));
      if (options.length === 0) {
        memo.add(stateKey);
        return false;
      }
      if (!bestOptions || options.length < bestOptions.length) {
        bestCell = index;
        bestOptions = options;
        if (options.length === 1) break;
      }
    }
    if (bestCell < 0) return false;
    bestOptions.sort((left, right) => (
      SHAPE_VARIANTS[right.shapeId][0].length - SHAPE_VARIANTS[left.shapeId][0].length
        || left.placement.y - right.placement.y
        || left.placement.x - right.placement.x
    ));
    for (const option of bestOptions) {
      counts.set(option.shapeId, counts.get(option.shapeId) - 1);
      selected.push(option);
      if (recurse(occupied | option.placement.mask)) return true;
      selected.pop();
      counts.set(option.shapeId, counts.get(option.shapeId) + 1);
    }
    memo.add(stateKey);
    return false;
  };
  if (!recurse(0n)) throw new Error(`Lv${level.id}: exact cohort packing failed after ${explored} states`);
  for (const shapeId of types) {
    assignTypePlacements(
      blocks.filter((block) => shapeIdOf(block.shape) === shapeId),
      selected.filter((entry) => entry.shapeId === shapeId).map((entry) => entry.placement),
    );
  }
  return explored;
};

const packSparseCohort = (level, blocks, board) => {
  const singles = blocks.filter((block) => shapeIdOf(block.shape) === "SINGLE");
  const pieces = blocks.filter((block) => shapeIdOf(block.shape) !== "SINGLE")
    .map((block) => ({
      block,
      placements: withMask(
        placementsFor(level, board.allowedKeys, shapeIdOf(block.shape)),
        board.indexByKey,
      ).sort((left, right) => distanceToBlock(left, block) - distanceToBlock(right, block)
        || left.y - right.y || left.x - right.x),
    }))
    .sort((left, right) => left.placements.length - right.placements.length
      || right.block.shape.length - left.block.shape.length
      || left.block.id.localeCompare(right.block.id));
  const chosen = new Map();
  const memo = new Set();
  let explored = 0;
  const recurse = (index, occupied) => {
    explored += 1;
    if (index === pieces.length) {
      const free = board.allowed.length - occupied.toString(2).replaceAll("0", "").length;
      return free >= singles.length;
    }
    const stateKey = `${index}|${occupied.toString(36)}`;
    if (memo.has(stateKey)) return false;
    const piece = pieces[index];
    for (const placement of piece.placements) {
      if ((occupied & placement.mask) !== 0n) continue;
      chosen.set(piece.block.id, placement);
      if (recurse(index + 1, occupied | placement.mask)) return true;
      chosen.delete(piece.block.id);
    }
    memo.add(stateKey);
    return false;
  };
  if (!recurse(0, 0n)) throw new Error(`Lv${level.id}: sparse cohort packing failed after ${explored} states`);
  let occupied = 0n;
  for (const { block } of pieces) {
    const placement = chosen.get(block.id);
    block.x = placement.x;
    block.y = placement.y;
    block.shape = clone(placement.shape);
    occupied |= placement.mask;
  }
  const freeCells = board.allowed.filter((_, index) => (occupied & (1n << BigInt(index))) === 0n);
  for (const block of [...singles].sort((left, right) => left.id.localeCompare(right.id))) {
    freeCells.sort((left, right) => (
      Math.abs(left[0] - block.x) + Math.abs(left[1] - block.y)
      - Math.abs(right[0] - block.x) - Math.abs(right[1] - block.y)
    ) || left[1] - right[1] || left[0] - right[0]);
    const [x, y] = freeCells.shift();
    block.x = x;
    block.y = y;
    block.shape = [[0, 0]];
  }
  return explored;
};

const auditLevels = [];
for (const [levelId, blockIds] of SQ3_BLOCK_IDS) {
  const level = levels.find((candidate) => candidate.id === levelId);
  if (!level) throw new Error(`Lv${levelId}: missing source level`);
  const selected = blockIds.map((blockId) => {
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    if (!block) throw new Error(`Lv${levelId}: missing SQ3 carrier ${blockId}`);
    if (shapeIdOf(block.shape) !== "RECT2X3") {
      throw new Error(`Lv${levelId}/${blockId}: expected normalized RECT2X3, got ${shapeIdOf(block.shape)}`);
    }
    block.shape = clone(SQ3);
    return block;
  });
  const cohortKey = (block) => block.shutterId ? `shutter:${block.shutterId}` : "opening";
  const cohortKeys = [...new Set(selected.map(cohortKey))];
  const board = prepareBoard(level);
  const cohorts = [];
  for (const key of cohortKeys) {
    const cohort = level.blocks.filter((block) => cohortKey(block) === key);
    const occupiedCells = cohort.reduce((sum, block) => sum + block.shape.length, 0);
    const exact = occupiedCells === board.allowed.length;
    const explored = exact
      ? packExactCohort(level, cohort, board)
      : packSparseCohort(level, cohort, board);
    cohorts.push({ key, block_count: cohort.length, occupied_cells: occupiedCells, exact_fill: exact, explored_layout_states: explored });
  }
  auditLevels.push({ level_id: levelId, restored_block_ids: blockIds, cohorts });
}

const spatialRepairs = [
  ...levels.map(applyLv22VideoLayout),
  ...levels.map(applyLv23VideoLayout),
].filter(Boolean);

for (const level of levels) {
  const intro = FEATURE_INTROS.get(level.id);
  if (intro) level.featureIntro = clone(intro);
  else delete level.featureIntro;
}

for (const repair of EXACT_DEADLOCK_RUNTIME_REPAIRS) {
  for (const artifact of repair.evidence) {
    const actualSha256 = sha256(await readFile(resolve(root, artifact.path)));
    if (actualSha256 !== artifact.sha256) {
      throw new Error(
        `Lv${repair.levelId}: evidence SHA drift for ${artifact.path}; expected ${artifact.sha256}, got ${actualSha256}`,
      );
    }
  }
}
const exactDeadlockRuntimeRepairs = EXACT_DEADLOCK_RUNTIME_REPAIRS.map((repair) => (
  applyExactDeadlockRuntimeRepair(
    levels.find((candidate) => candidate.id === repair.levelId),
    repair,
  )
));

for (const repair of AUTO_RECOLOR_RUNTIME_REPAIRS) {
  let evidenceTargetSemanticVerified = false;
  for (const artifact of repair.evidence) {
    const rawEvidence = await readFile(resolve(root, artifact.path));
    const actualSha256 = sha256(rawEvidence);
    if (actualSha256 !== artifact.sha256) {
      throw new Error(
        `Lv${repair.levelId}: auto-recolour evidence SHA drift for ${artifact.path}; expected ${artifact.sha256}, got ${actualSha256}`,
      );
    }
    if (repair.evidenceTargetSemanticSha256 && artifact.path.endsWith(".json")) {
      const report = JSON.parse(rawEvidence.toString("utf8"));
      const selected = report.results?.find((entry) => entry.levelId === repair.levelId)?.selected;
      const batchRecord = report.records?.find((entry) => entry.level_id === repair.levelId);
      const targetSemantic = selected?.targetSemantic ?? batchRecord?.target_level;
      if (targetSemantic) {
        const actualTargetSha256 = sha256(JSON.stringify(
          repair.canonicalLevelSpecSha256 ? canonical(targetSemantic) : targetSemantic,
        ));
        if (actualTargetSha256 !== repair.evidenceTargetSemanticSha256) {
          throw new Error(
            `Lv${repair.levelId}: evidence target semantic SHA drift; expected ${repair.evidenceTargetSemanticSha256}, got ${actualTargetSha256}`,
          );
        }
        evidenceTargetSemanticVerified = true;
      }
    }
  }
  if (repair.evidenceTargetSemanticSha256 && !evidenceTargetSemanticVerified) {
    throw new Error(`Lv${repair.levelId}: evidence target semantic record missing`);
  }
  repair.evidenceTargetSemanticVerified = evidenceTargetSemanticVerified;
}
const autoRecolorRuntimeRepairs = AUTO_RECOLOR_RUNTIME_REPAIRS.map((repair) => (
  applyAutoRecolorRuntimeRepair(
    levels.find((candidate) => candidate.id === (repair.sourceLevelId ?? repair.levelId)),
    repair,
  )
));

const highExitEvidenceRawByPath = new Map();
for (const artifact of highExitReductionEvidence) {
  const rawEvidence = await readFile(resolve(root, artifact.path));
  const actualSha256 = sha256(rawEvidence);
  if (actualSha256 !== artifact.sha256) {
    throw new Error(
      `High-exit evidence SHA drift for ${artifact.path}; expected ${artifact.sha256}, got ${actualSha256}`,
    );
  }
  highExitEvidenceRawByPath.set(artifact.path, rawEvidence);
}
const highExitReport = JSON.parse(highExitEvidenceRawByPath.get(highExitReductionEvidence[0].path).toString("utf8"));
const highExitSelections = JSON.parse(highExitEvidenceRawByPath.get(highExitReductionEvidence[1].path).toString("utf8"));
const highExitBatch02EvidenceRawByPath = new Map();
for (const artifact of highExitReductionBatch02Evidence) {
  const rawEvidence = await readFile(resolve(root, artifact.path));
  const actualSha256 = sha256(rawEvidence);
  if (actualSha256 !== artifact.sha256) {
    throw new Error(
      `High-exit batch-02 evidence SHA drift for ${artifact.path}; expected ${artifact.sha256}, got ${actualSha256}`,
    );
  }
  highExitBatch02EvidenceRawByPath.set(artifact.path, rawEvidence);
}
const highExitBatch02Report = JSON.parse(
  highExitBatch02EvidenceRawByPath.get(highExitReductionBatch02Evidence[0].path).toString("utf8"),
);
const highExitBatch02Selections = JSON.parse(
  highExitBatch02EvidenceRawByPath.get(highExitReductionBatch02Evidence[1].path).toString("utf8"),
);
const selectedHighExitCandidates = [
  ...highExitSelections.candidates,
  ...highExitBatch02Selections.candidates,
].filter((candidate) => (
  acceptedHighExitReductionLevelIds.includes(candidate.level_id)
)).sort((left, right) => left.level_id - right.level_id);
if (!sameJson(selectedHighExitCandidates.map((candidate) => candidate.level_id), acceptedHighExitReductionLevelIds)) {
  throw new Error("High-exit selected candidate set must be exactly Lv50/Lv71/Lv73/Lv75 in ascending order");
}
for (const excludedLevelId of [48, 68]) {
  const excluded = highExitSelections.candidates.find((candidate) => candidate.level_id === excludedLevelId);
  if (!excluded || excluded.status === "solved_replay_verified") {
    throw new Error(`Lv${excludedLevelId}: inconclusive high-exit candidate must not be formally integrated`);
  }
}
const expectedHighExitSolverMetrics = new Map([
  [50, { explored_states: 50, drags: 19, clear_load: 13, reposition_overhead: 6 }],
  [71, { explored_states: 116, drags: 33, clear_load: 26, reposition_overhead: 7 }],
  [73, { explored_states: 91_073, drags: 81, clear_load: 30, reposition_overhead: 51 }],
  [75, { explored_states: 9_662, drags: 45, clear_load: 26, reposition_overhead: 19 }],
]);
for (const candidate of selectedHighExitCandidates) {
  const reportRecord = candidate.level_id === 73
    ? highExitBatch02Report.candidate
    : highExitReport.levels.find((entry) => entry.level_id === candidate.level_id);
  if (!reportRecord) throw new Error(`Lv${candidate.level_id}: missing locked high-exit report record`);
  for (const key of Object.keys(candidate)) {
    if (key === "evidence_certificate") continue;
    if (!sameJson(candidate[key], reportRecord[key])) {
      throw new Error(`Lv${candidate.level_id}: selected/report evidence drift at ${key}`);
    }
  }
  const expectedMetrics = expectedHighExitSolverMetrics.get(candidate.level_id);
  if (!sameJson({
    explored_states: candidate.solution?.explored_states,
    drags: candidate.solution?.drags,
    clear_load: candidate.solution?.clear_load,
    reposition_overhead: candidate.solution?.reposition_overhead,
  }, expectedMetrics) || candidate.solution?.PuzzleModel_replay?.ok !== true) {
    throw new Error(`Lv${candidate.level_id}: accepted solver/replay metrics drift`);
  }
}
const highExitReductionRuntimeRepairs = selectedHighExitCandidates.map((candidate) => (
  applyHighExitReductionRepair(
    levels.find((level) => level.id === candidate.level_id),
    candidate,
    campaignSemanticProjection,
  )
));

for (const repair of SOLVER_VERIFIED_RUNTIME_REPAIRS) {
  const level = levels.find((candidate) => candidate.id === repair.levelId);
  const clusterViolations = openingSameColorClusterViolations(level);
  if (clusterViolations.length) {
    throw new Error(`Lv${level.id}: repaired final opening still has same-colour clusters ${JSON.stringify(clusterViolations)}`);
  }
}

const runtimeBundle = await build({
  stdin: {
    contents: `import { validateLevel } from "./src/core/PuzzleModel.ts"; export { validateLevel };`,
    resolveDir: root,
    sourcefile: "video-parity-v8-structural-validator.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const runtimeUrl = `data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].text).toString("base64")}`;
const { validateLevel } = await import(runtimeUrl);

const validationErrors = [];
const parityErrors = [];
for (const level of levels) {
  try {
    validateLevel(level);
  } catch (error) {
    validationErrors.push(`Lv${level.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const target = contractById.get(level.id);
  const actualHistogram = histogramOf(level.blocks);
  if (level.width !== target.board.cols || level.height !== target.board.rows) parityErrors.push(`Lv${level.id}: board size`);
  if (playableOf(level).length !== target.board.playable_cell_count) parityErrors.push(`Lv${level.id}: playable cells`);
  if (level.timeSeconds !== target.time_seconds) parityErrors.push(`Lv${level.id}: timer`);
  if (level.blocks.length !== target.full_level_block_count) parityErrors.push(`Lv${level.id}: block count`);
  if (!sameJson(actualHistogram, target.full_level_shape_histogram)) parityErrors.push(
    `Lv${level.id}: shape histogram actual=${JSON.stringify(actualHistogram)} target=${JSON.stringify(target.full_level_shape_histogram)}`,
  );
  if (cellCountOf(actualHistogram) !== target.full_level_occupied_cell_count) parityErrors.push(`Lv${level.id}: occupied cells`);
  for (const block of level.blocks.filter((candidate) => candidate.layers?.length > 1)) {
    if (new Set(block.layers).size !== block.layers.length) parityErrors.push(`Lv${level.id}/${block.id}: repeated shell color`);
  }
}
const sq3Blocks = levels.flatMap((level) => level.blocks
  .filter((block) => shapeIdOf(block.shape) === "SQ3")
  .map((block) => ({ level_id: level.id, block_id: block.id, color: block.color, frozen: block.frozen ?? null })));
if (sq3Blocks.length !== 11) parityErrors.push(`season: expected 11 SQ3, got ${sq3Blocks.length}`);
if (validationErrors.length || parityErrors.length) {
  throw new Error([...validationErrors, ...parityErrors].join("\n"));
}

const generatedSource = `/* eslint-disable */
// AUTO-GENERATED by tools/build-video-parity-formal-levels-v8.mjs.
// Source data: ${inputRelative}
// Contract: ${contractRelative}
// Contract SHA-256: ${sha256(contractText)}
// Direct-data build with documented solver-verified runtime repairs; this build step itself does not run a solver.
import type { LevelSpec } from "./types";

export const VIDEO_PARITY_LEVELS: LevelSpec[] = ${JSON.stringify(levels, null, 2)};

export const VIDEO_PARITY_LEVEL_BY_ID = new Map(VIDEO_PARITY_LEVELS.map((level) => [level.id, level]));
`;
const audit = {
  schema_version: "blockout-video-parity-v8-direct-data-build-v1",
  generated_on: new Date().toISOString(),
  claim_scope: "structural_and_competitor_data_parity_with_solver_verified_runtime_repairs_and_minimum_eight_color_exit_reductions",
  gameplay_solver_run: false,
  completion_or_difficulty_claim: false,
  inputs: {
    normalized_v7_levels: { path: inputRelative, sha256: sha256(inputText) },
    v8_contract: { path: contractRelative, sha256: sha256(contractText) },
    generator_rim_geometry: { path: generatorRimGeometryRelative, sha256: sha256(generatorRimGeometryText) },
    high_exit_reduction_evidence: clone(highExitReductionEvidence),
    high_exit_reduction_batch_02_evidence: clone(highExitReductionBatch02Evidence),
  },
  output: { path: outputRelative, sha256: sha256(generatedSource) },
  summary: {
    level_count: levels.length,
    validate_level_passed: levels.length,
    exact_board_composition_passed: levels.length,
    sq3_level_count: new Set(sq3Blocks.map((entry) => entry.level_id)).size,
    sq3_block_count: sq3Blocks.length,
    shell_count: levels.reduce((sum, level) => sum + level.blocks.filter((block) => block.layers?.length > 1).length, 0),
    same_color_shell_count: 0,
    exact_deadlock_runtime_repair_level_ids: exactDeadlockRuntimeRepairs.map((repair) => repair.level_id),
    auto_recolor_runtime_repair_level_ids: autoRecolorRuntimeRepairs.map((repair) => repair.level_id),
    high_exit_reduction_runtime_repair_level_ids: highExitReductionRuntimeRepairs.map((repair) => repair.level_id),
    minimum_high_exit_reduction_exception_count: highExitReductionRuntimeRepairs.length,
  },
  sq3_blocks: sq3Blocks,
  rebuilt_cohorts: auditLevels,
  video_verified_spatial_repairs: spatialRepairs,
  solver_verified_runtime_repairs: [
    ...solverVerifiedRuntimeRepairs,
    ...exactDeadlockRuntimeRepairs,
    ...autoRecolorRuntimeRepairs,
    ...highExitReductionRuntimeRepairs,
  ],
  exact_deadlock_runtime_repairs: exactDeadlockRuntimeRepairs,
  auto_recolor_runtime_repairs: autoRecolorRuntimeRepairs,
  high_exit_reduction_runtime_repairs: highExitReductionRuntimeRepairs,
};
await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(auditPath), { recursive: true });
await writeFile(outputPath, generatedSource, "utf8");
await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify(audit.summary));
